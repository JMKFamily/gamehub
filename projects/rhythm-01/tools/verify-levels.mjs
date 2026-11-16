#!/usr/bin/env node
// rhythm-01 레벨 검증기 (node 만 사용)
//
// 사용법
//   node tools/verify-levels.mjs              # balance.json levels 전부 + 봇 지표
//   node tools/verify-levels.mjs --quick      # 봇 시도 수를 줄여 빠르게 (구조 검사는 같음)
//   node tools/verify-levels.mjs --json       # 결과 JSON
//
// 검사 (FAIL 이 하나라도 있으면 종료 코드 1)
//   S1 스키마: 필수 키, 자리 0~7, allowed_slots(even = 정박만), 무늬 존재
//   S2 박대로 치기(모든 별 시각에 정확히 탭) → 클리어, 전부 "딱"
//   S3 무입력 → 실패 (첫 별에서)
//   S4 연타(간격 40~200 ms, 모든 위상) → 한 번도 클리어 안 됨
//   S5 8분 격자 고르게 치기(정렬된 위상) → 실패 (무늬를 안 읽고 다 치기 방지)
//   S6 한 무늬(마디) 안 별 간격 ≤ max_gap_in_pattern_ms (1 s)
//   S7 새 무늬는 바로 앞 마디에 같은 무늬 보여 주기 마디가 있음 (known_patterns 제외)
//   S8 새 기믹 ≤ 1, 그림 카드 키 있음
//   S9 판정 구역 가정: 놓침 구역이 "8분 하나 이른 탭"을 덮고, "1박 이른 탭"은 무시됨
//   S10 레벨 간 통과 창 폭 ≥ 직전 레벨의 50 %
//   S11 레벨 1: 별 수 16~20, 첫 별이 레벨 10 % 이후, 재시작 1.08 s 가 0.94~1.20 s 안
//   B1 봇 σ70 첫 클리어 중앙값 ≤ 레벨별 한도 (레벨 1 = 5)
//   B2 봇 평균 진행도가 레벨 순서대로 단조 감소 (난이도 단조 증가)
//   B3 숙련 봇(σ25) 실패가 한 별에 30 % 넘게 몰리지 않음 (실패 20회 이상일 때만 판정)
// 정보 출력: 박마다(4분) 고르게 치기 결과, 지연 오차(bias) 민감도, 따라 치기 변형, 레벨 4~10 해석 예측

import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileLevel, judgeAttempt } from './sim/judge.mjs';
import { runProfile, runPractice, analyticClear } from './sim/bots.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..');
const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const JSON_OUT = args.includes('--json');
const N = QUICK ? 4000 : 20000;
const SESS = QUICK ? 400 : 2000;

const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const V = bal.verify;
const report = { levels: {}, fails: [] };
const log = (...a) => { if (!JSON_OUT) console.log(...a); };
const check = (lv, code, ok, msg) => {
  (report.levels[lv].checks ||= []).push({ code, ok, msg });
  if (!ok) report.fails.push(`${lv} ${code}: ${msg}`);
  log(`  ${ok ? 'PASS' : 'FAIL'} ${code} ${msg}`);
};

function steadyTaps(L, periodMs, phaseMs) {
  const taps = [];
  for (let t = phaseMs; t < L.durationMs + periodMs; t += periodMs) taps.push(t);
  return taps;
}

const compiled = [];
for (const f of bal.levels) {
  const lvl = JSON.parse(readFileSync(join(PROJECT, f), 'utf8'));
  const id = lvl.id;
  report.levels[id] = {};
  log(`\n== 레벨 ${id} ${lvl.name} (${f}) ==`);

  // S1
  const req = ['id', 'bpm', 'beats_per_bar', 'count_in_bars', 'judge', 'patterns', 'bars', 'sections', 'new_gimmicks', 'allowed_slots', 'known_patterns'];
  const missing = req.filter((k) => lvl[k] === undefined);
  let slotErr = [];
  for (const [pid, p] of Object.entries(lvl.patterns)) {
    for (const s of p.slots) {
      if (!Number.isInteger(s) || s < 0 || s > 7) slotErr.push(`${pid}:${s} 범위 밖`);
      if (lvl.allowed_slots === 'even' && s % 2) slotErr.push(`${pid}:${s} 반박 금지 레벨`);
    }
    if ([...p.slots].sort((a, b) => a - b).join() !== p.slots.join()) slotErr.push(`${pid} 자리 정렬 안 됨`);
  }
  const badBars = lvl.bars.filter((b) => !['show', 'play', 'rest'].includes(b.mode) || (b.mode !== 'rest' && !lvl.patterns[b.pattern]));
  check(id, 'S1', !missing.length && !slotErr.length && !badBars.length && lvl.length_bars === lvl.bars.length,
    missing.length || slotErr.length || badBars.length ? `누락 ${missing} / ${slotErr} / 잘못된 마디 ${badBars.length}` : `스키마 정상 (마디 ${lvl.bars.length} + 카운트인 ${lvl.count_in_bars})`);

  const L = compileLevel(lvl, bal);
  compiled.push(L);
  const j = L.judge;
  const durS = L.durationMs / 1000;
  report.levels[id].summary = { bpm: lvl.bpm, beat_ms: +L.beatMs.toFixed(1), duration_s: +durS.toFixed(2), stars: L.stars.length, show_stars: L.shows.length, pass_window_ms: j.pass_early_ms + j.pass_late_ms };
  log(`  정보 BPM ${lvl.bpm} · 1박 ${L.beatMs.toFixed(1)} ms · 길이 ${durS.toFixed(2)} s · 판정 별 ${L.stars.length} · 보여 주기 별 ${L.shows.length} · 통과 창 -${j.pass_early_ms}/+${j.pass_late_ms} ms`);

  // S2
  const perfect = judgeAttempt(L, L.stars.map((s) => s.t));
  check(id, 'S2', perfect.clear && perfect.grades.every((g) => g.grade === 'perfect'), `박대로 치기 → ${perfect.clear ? '클리어' : '실패'}, 딱 ${perfect.grades.filter((g) => g.grade === 'perfect').length}/${L.stars.length}`);

  // S3
  const none = judgeAttempt(L, []);
  check(id, 'S3', !none.clear && none.failIndex === 0, `무입력 → ${none.clear ? '클리어(!)' : `실패 (별 ${none.failIndex}, ${(none.failTimeMs / 1000).toFixed(2)} s)`}`);

  // S4
  const [p0, p1, pst] = V.mash_periods_ms;
  let mashClears = 0, mashTrials = 0, bestStars = 0, bestP = null;
  for (let p = p0; p <= p1; p += pst) {
    for (let ph = 0; ph < p; ph += V.mash_phase_step_ms) {
      const r = judgeAttempt(L, steadyTaps(L, p, ph));
      mashTrials++;
      if (r.clear) mashClears++;
      const got = r.clear ? L.stars.length : r.failIndex;
      if (got > bestStars) { bestStars = got; bestP = p; }
    }
  }
  check(id, 'S4', mashClears === 0, `연타 ${p0}~${p1} ms × 모든 위상 ${mashTrials}회 → 클리어 ${mashClears}회 (가장 멀리 간 경우 별 ${bestStars}/${L.stars.length}, 간격 ${bestP} ms)`);

  // S5 / 정보: 4분 고르게
  const eighth = judgeAttempt(L, steadyTaps(L, L.eighthMs, 0));
  check(id, 'S5', !V.eighth_spam_must_fail || !eighth.clear, `8분 격자 전부 치기(정렬) → ${eighth.clear ? '클리어(!)' : `실패 (별 ${eighth.failIndex}, ${eighth.reason})`}`);
  const quarter = judgeAttempt(L, steadyTaps(L, L.beatMs, 0));
  report.levels[id].steady_quarter_clear = quarter.clear;
  log(`  정보 박마다(4분) 고르게 치기(정렬) → ${quarter.clear ? '클리어' : `실패 (별 ${quarter.failIndex}, ${quarter.reason})`}`);

  // S6
  let maxGap = 0, minGap = Infinity, where = '';
  for (let b = 0; b < lvl.bars.length; b++) {
    const ss = L.stars.filter((s) => s.bar === b);
    for (let k = 1; k < ss.length; k++) {
      const g = ss[k].t - ss[k - 1].t;
      if (g > maxGap) { maxGap = g; where = `마디 ${b} 무늬 ${ss[k].pattern}`; }
    }
  }
  for (let k = 1; k < L.stars.length; k++) minGap = Math.min(minGap, L.stars[k].t - L.stars[k - 1].t);
  let maxAcross = 0;
  for (let k = 1; k < L.stars.length; k++) if (L.stars[k].bar === L.stars[k - 1].bar + 1) maxAcross = Math.max(maxAcross, L.stars[k].t - L.stars[k - 1].t);
  check(id, 'S6', maxGap <= V.max_gap_in_pattern_ms + 1e-6, `무늬 안 최대 간격 ${maxGap.toFixed(0)} ms (${where}) ≤ ${V.max_gap_in_pattern_ms} · 정보: 별 최소 간격 ${minGap.toFixed(0)} ms, 이어진 마디 사이 최대 ${maxAcross.toFixed(0)} ms`);
  report.levels[id].summary.min_gap_ms = +minGap.toFixed(1);

  // S7
  const seen = new Set(lvl.known_patterns);
  const noShow = [];
  lvl.bars.forEach((b, i) => {
    if (b.mode !== 'play' || seen.has(b.pattern)) return;
    const prev = lvl.bars[i - 1];
    if (!prev || prev.mode !== 'show' || prev.pattern !== b.pattern) noShow.push(`마디 ${i} ${b.pattern}`);
    seen.add(b.pattern);
  });
  const usedPatterns = [...new Set(lvl.bars.filter((b) => b.mode !== 'rest').map((b) => b.pattern))];
  const newPatterns = usedPatterns.filter((p) => !lvl.known_patterns.includes(p));
  check(id, 'S7', !noShow.length, noShow.length ? `보여 주기 없이 처음 나온 무늬: ${noShow}` : `새 무늬 ${newPatterns.join('·') || '없음'} 모두 보여 주기 마디 뒤에 등장 (복습 ${lvl.known_patterns.join('·') || '없음'})`);

  // S8
  check(id, 'S8', lvl.new_gimmicks.length <= V.max_new_gimmicks_per_level && lvl.new_gimmicks.every((g) => g.card_key), `새 기믹 ${lvl.new_gimmicks.length}개 (${lvl.new_gimmicks.map((g) => `${g.id}/${g.card_key}`).join(', ')})`);

  // S9
  const outer = j.pass_early_ms + j.miss_zone_ms;
  const okEighth = outer >= L.eighthMs + V.miss_zone_must_cover_eighth_early_margin_ms;
  const okQuarter = outer <= L.beatMs - V.quarter_early_tap_ignored_margin_ms;
  const okGrades = j.perfect_ms < j.good_ms && j.good_ms <= Math.min(j.pass_early_ms, j.pass_late_ms);
  check(id, 'S9', okEighth && okQuarter && okGrades, `놓침 구역 바깥 끝 -${outer} ms: 8분 이른 탭(-${L.eighthMs.toFixed(0)}) ${okEighth ? '덮음' : '못 덮음'}, 1박 이른 탭(-${L.beatMs.toFixed(0)}) ${okQuarter ? '무시' : '구역 안(!)'} · 딱 ±${j.perfect_ms} < 좋아 ±${j.good_ms} ≤ 통과`);
}

// S10, S11
log('\n== 레벨 사이 / 레벨 1 ==');
for (let k = 0; k < compiled.length; k++) {
  const L = compiled[k], id = L.level.id;
  const w = L.judge.pass_early_ms + L.judge.pass_late_ms;
  if (k > 0) {
    const pw = compiled[k - 1].judge.pass_early_ms + compiled[k - 1].judge.pass_late_ms;
    check(id, 'S10', w >= V.min_window_ratio_vs_prev * pw, `통과 창 ${w} ms = 직전 ${pw} ms 의 ${(100 * w / pw).toFixed(0)} %`);
  }
}
{
  const L = compiled[0], id = L.level.id;
  const n = L.stars.length, first = L.stars[0].t / L.durationMs;
  const rd = bal.restart.restart_delay_s;
  check(id, 'S11', n >= V.l1_star_count_range[0] && n <= V.l1_star_count_range[1] && first >= V.l1_first_star_min_progress && rd >= bal.restart.allowed_range_s[0] && rd <= bal.restart.allowed_range_s[1],
    `별 ${n}개 (한도 ${V.l1_star_count_range.join('~')}), 첫 별 ${(100 * first).toFixed(1)} % 지점 (${(L.stars[0].t / 1000).toFixed(2)} s), 재시작 ${rd} s`);
}

// 봇
log('\n== 봇 (시도 ' + N + '회, 세션 ' + SESS + '개) ==');
log('레벨 | 프로필 | 클리어율 | 첫 클리어 중앙값(세션) | 90 % | 평균 진행도 | 실패 진행도 중앙값 | 이른 탭 실패 비율 | 최다 실패 별 몰림 | 등급 1/2/3');
const prog = {};
for (const L of compiled) {
  const id = L.level.id;
  report.levels[id].bots = {};
  for (const [pn, p] of Object.entries(bal.bots.profiles)) {
    const r = runProfile(L, p, bal, { N, sessions: SESS });
    report.levels[id].bots[pn] = r;
    const rs = r.rating_share_of_clears;
    log(`${id} | ${pn} | ${r.clear_rate} | ${r.median_first_clear_sessions} (기하 ${r.median_first_clear_geom}) | ${r.p90_first_clear_sessions} | ${r.mean_progress} % | ${r.median_fail_progress ?? '-'} % | ${r.early_fail_share} | ${r.top_fail_star_share} (별 ${r.top_fail_star}) | ${rs ? `${rs.one}/${rs.two}/${rs.three}` : '-'}`);
  }
  prog[id] = report.levels[id].bots;
}
log('');
for (const L of compiled) {
  const id = L.level.id, b = prog[id];
  const lim = V.child_sd70_median_max_by_level[id];
  if (lim != null) check(id, 'B1', b.child_sd70.median_first_clear_sessions <= lim, `σ70 첫 클리어 중앙값 ${b.child_sd70.median_first_clear_sessions}회 ≤ ${lim}`);
  const sk = b.skilled_sd25;
  const skDeaths = Math.round((1 - sk.clear_rate) * N);
  check(id, 'B3', skDeaths < 20 || sk.top_fail_star_share <= 0.3, skDeaths < 20 ? `σ25 실패 ${skDeaths}회(20회 미만, 몰림 판정 생략)` : `σ25 최다 실패 별 몰림 ${sk.top_fail_star_share} ≤ 0.3`);
}
for (let k = 1; k < compiled.length; k++) {
  const a = compiled[k - 1].level.id, c = compiled[k].level.id;
  for (const pn of ['novice_sd50', 'child_sd70']) {
    check(c, 'B2', prog[c][pn].mean_progress < prog[a][pn].mean_progress, `${pn} 평균 진행도 ${a} ${prog[a][pn].mean_progress} % > ${c} ${prog[c][pn].mean_progress} %`);
  }
}

// 정보: 레벨 1 첫 실패 위치 (criteria: 중앙값이 레벨 10 % 이후)
{
  const L = compiled[0];
  const r = prog[L.level.id].child_sd70;
  const ok = r.median_fail_progress >= 10;
  check(L.level.id, 'B4', ok, `σ70 실패 위치 중앙값 ${r.median_fail_progress} % ≥ 10 %`);
}

// 정보: 지연 오차 민감도 (레벨별 σ70·σ50)
log('\n== 남은 지연 오차(bias, +면 늦게 들림 → 늦게 침) 민감도: σ70 첫 클리어 중앙값 (σ50) ==');
report.bias = {};
log('bias ms | ' + compiled.map((L) => 'L' + L.level.id).join(' | '));
for (const bias of V.bias_sweep_ms) {
  const row = [];
  for (const L of compiled) {
    const c = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: N / 4, sessions: SESS / 2, bias, seed: 777 });
    const nv = runProfile(L, bal.bots.profiles.novice_sd50, bal, { N: N / 4, sessions: SESS / 2, bias, seed: 778 });
    row.push(`${c.median_first_clear_sessions} (${nv.median_first_clear_sessions})`);
    (report.bias[L.level.id] ||= {})[bias] = { child_sd70: c.median_first_clear_sessions, novice_sd50: nv.median_first_clear_sessions };
  }
  log(`${bias} | ${row.join(' | ')}`);
}

// 정보: 따라 치기 변형 (보여 주기 마디에서도 아이가 같이 침)
log('\n== 정보: 보여 주기 마디에서도 같이 치는 아이 (σ70, along) ==');
report.along = {};
for (const L of compiled) {
  const r = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: N / 2, sessions: SESS / 2, along: true, seed: 999 });
  report.along[L.level.id] = r;
  log(`L${L.level.id} 클리어율 ${r.clear_rate} · 첫 클리어 중앙값 ${r.median_first_clear_sessions} (따라 치지 않을 때 ${prog[L.level.id].child_sd70.median_first_clear_sessions})`);
}

// 정보: 연습 모드(자동 체크포인트) 끝까지 가는 총 시도 수
log('\n== 정보: 연습 모드 끝까지 총 시도 수 중앙값 (90 %) ==');
report.practice = {};
for (const L of compiled) {
  const row = [];
  for (const pn of ['novice_sd50', 'child_sd70', 'child_sd90']) {
    const r = runPractice(L, bal.bots.profiles[pn], bal, { sessions: SESS / 2 });
    (report.practice[L.level.id] ||= {})[pn] = r;
    row.push(`${pn} ${r.median_total_attempts} (${r.p90_total_attempts})`);
  }
  log(`L${L.level.id} 구간 ${report.practice[L.level.id].child_sd70.segments}개 · ${row.join(' · ')}`);
}

// 정보: 레벨 4~10 곡선 해석 예측
log('\n== 정보: 레벨 1~10 곡선 해석 예측 (헛탭 무시, 별 독립 가정) ==');
log('레벨 | BPM | 길이 s | 별 | 통과 창 | σ25 | σ50 | σ70 첫 클리어 중앙값');
report.curve = {};
const curveRows = [
  ...compiled.map((L) => ({ id: L.level.id, bpm: L.level.bpm, len: L.durationMs / 1000, stars: L.stars.length, e: L.judge.pass_early_ms, l: L.judge.pass_late_ms })),
  ...Object.entries(bal.curve_planned).filter(([k]) => !k.startsWith('_')).map(([id, c]) => ({ id, bpm: c.bpm, len: (c.bars + 1) * 4 * 60 / c.bpm, stars: c.stars, e: c.pass_early_ms, l: c.pass_late_ms })).sort((a, b) => a.id.localeCompare(b.id)),
];
for (const r of curveRows) {
  const res = {};
  for (const [pn, p] of Object.entries(bal.bots.profiles)) res[pn] = analyticClear({ stars: r.stars, early: r.e, late: r.l, sd: p.sd_ms, miss: p.miss });
  report.curve[r.id] = { ...r, ...res };
  log(`${r.id} | ${r.bpm} | ${r.len.toFixed(1)} | ${r.stars} | -${r.e}/+${r.l} | ${res.skilled_sd25.median} | ${res.novice_sd50.median} | ${res.child_sd70.median}`);
}

log(`\n${report.fails.length ? 'FAIL ' + report.fails.length + '건\n  ' + report.fails.join('\n  ') : 'ALL PASS'}`);
if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
process.exit(report.fails.length ? 1 : 0);
