#!/usr/bin/env node
// rhythm-01 레벨 검증기 (node 만 사용)
//
// 사용법
//   node tools/verify-levels.mjs              # levels/ 01~10 전부 + 봇 지표 (B6·B7 판정은 이 전체 실행 기준)
//   node tools/verify-levels.mjs --quick      # 봇 시도 수를 줄여 빠르게 (구조 검사는 같음, B6·B7 은 정보로만)
//   node tools/verify-levels.mjs --json       # 결과 JSON
//
// 대상: balance.json levels(데이터, 레벨 01~10, 1-3 부터). curve_planned 는 _status 가 deprecated 이면 읽지 않는다
// (1-2 계획 기록. deprecated 가 아니면 예전처럼 tools/sim/plan.mjs 로 컴파일해 [계획] 으로 검사).
//
// 검사 (FAIL 이 하나라도 있으면 종료 코드 1)
//   S0 레벨 파일 수 = verify.level_count(10), id 01~10 이어짐, name_key = level<n>_name
//   S1 스키마: 필수 키, 자리 0~7, allowed_slots, 무늬 존재, 무늬 자리가 pattern_library 와 같음, theme_id = level<두 자리 id>
//   S2 박대로 치기 → 클리어, 전부 "딱"
//   S3 무입력 → 실패 (첫 별에서)
//   S4 연타(간격 40~200 ms, 모든 위상) → 한 번도 클리어 안 됨
//   S5 8분 격자 고르게 치기 → 실패
//   S6 한 무늬(마디) 안 별 간격 ≤ 1 s
//   S7 새 무늬는 바로 앞 보여 주기 마디(두 마디 무늬는 보여 주기 2마디)에서 먼저 나옴
//   S8 새 기믹 ≤ 1, 새 기믹이 있으면 그림 카드 1장(card_<id>, 레벨 시작 전), 없으면 카드 없음. 레벨 1 은 카드 필수
//   S9 놓침 구역이 "8분 하나 이른 탭"을 덮고 "1박 이른 탭"은 무시
//   S10 레벨 간 통과 창 폭 ≥ 직전의 50 %
//   S11 레벨 1: 별 수 16~20, 첫 별 10 % 이후, 재시작 1.08 s 와 단계 배분 합
//   S12 별 미리 보기: 다음 마디 별이 앞 별의 늦은 통과 창 끝 + 판정 이펙트 뒤에 커지며 나타나고, 다 커진 뒤 별까지 1.2 s 이상
//   S13 보여 주기 같이 치기 안전: 보여 주기 별 → 다음 판정 별 ≥ 1박, 다음 별 놓침 구역 시작까지 ≥ 150 ms
//   S14 북채 등장 1박(보여 주기 마디 바로 앞 1박) 안에 판정 별의 통과 창이 없음
//   S15 레벨 1 손가락 그림: 첫 꽉 찬 별 1박 전에 나타남, 누름 시작이 통과 창 안(놓침 구역 밖, R2),
//       손가락 구간 [첫 별 - 1박, 첫 별 + pass_late] ∩ 모든 북채 구간 = 없음 (round-2 R1 강화)
//   S16 북채 구간 [등장, 사라짐) ∩ 모든 판정 별 [놓침 구역 시작, 통과 창 끝] = 없음, 작아짐 시작 ≥ 마지막 보여 주기 별 (round-2 R1, 10레벨 전부)
//   B1 봇 σ70 첫 클리어 중앙값 ≤ 레벨별 한도 (L1 5, L7까지 20, 전 레벨 30)
//   B2 봇 평균 진행도(판정 별 기준)가 레벨 순서대로 단조 감소
//   B3 숙련 봇(σ25) 실패가 한 별에 30 % 넘게 몰리지 않음 (실패 20회 이상일 때만)
//   B4 레벨 1 σ70 실패 위치 중앙값(레벨 시간 기준) ≥ 10 %
//   B5 σ70 첫 클리어 중앙값이 직전 레벨의 2배 이하
//   B6 레벨 10 목표: σ70 연속 중앙값 m~ = ln0.5/ln(1-p) (p = 첫 시도 클리어율) 로 L1~L3 기하 평균 배율 r = (m~03/m~01)^(1/2),
//      L6 외삽 T = m~03·r^3, L10 m~ ∈ [0.8T, 1.2T] (요청자 지시, round-2 R3). 정수 중앙값은 참고로 함께 출력
//   B7 L3 → L10 σ70 연속 중앙값이 엄격히 단조 증가, L3~L9 는 L10 목표 상한 미만 (L3 와 L10 목표 사이를 나눔)
//   C1 보정 계산 정의 일치: tools/sim/calib.mjs(시뮬레이터) = 빌드 games/rhythm-01/js/calib.js (있을 때만, round-2 R4)
// 정보 출력: 박마다 치기, 지연 오차 민감도(1~3), 보정 화면 영향(보호자 보정 포함), 큰 지연 감지, 따라 치기 변형, 연습 모드, 해석 예측

import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { compileLevel, judgeAttempt, previewSchedule, malletSchedule } from './sim/judge.mjs';
import * as simCalib from './sim/calib.mjs';
import { runProfile, runPractice, analyticClear, calibrationBias, guardianCalibrationBias, driftDetectAttempt, makeRng } from './sim/bots.mjs';
import { buildPlanLevel } from './sim/plan.mjs';

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
const f0 = (x) => x.toFixed(0);

function steadyTaps(L, periodMs, phaseMs) {
  const taps = [];
  for (let t = phaseMs; t < L.durationMs + periodMs; t += periodMs) taps.push(t);
  return taps;
}

// 대상 목록: 데이터 레벨 + 계획 레벨
const entries = [];
for (const f of bal.levels) entries.push({ src: f, lvl: JSON.parse(readFileSync(join(PROJECT, f), 'utf8')) });
const planDeprecated = String(bal.curve_planned?._status || '').startsWith('deprecated');
for (const [id, c] of Object.entries(planDeprecated ? {} : bal.curve_planned || {})) {
  if (id.startsWith('_')) continue;
  if (entries.some((e) => e.lvl.id === id)) continue;
  entries.push({ src: `balance.json curve_planned.${id}`, lvl: buildPlanLevel(id, c, bal) });
}
entries.sort((a, b) => a.lvl.id.localeCompare(b.lvl.id));
{
  const ids = entries.map((e) => e.lvl.id);
  const want = Array.from({ length: V.level_count }, (_, k) => String(k + 1).padStart(2, '0'));
  const badKey = entries.filter((e) => !e.lvl.planned && e.lvl.name_key !== `level${+e.lvl.id}_name`).map((e) => e.lvl.id);
  const allData = entries.every((e) => !e.lvl.planned);
  report.levels._all = {};
  log(`== 레벨 목록 (${entries.length}개, curve_planned ${planDeprecated ? '폐기 표시 → 읽지 않음' : '계획 포함'}) ==`);
  check('_all', 'S0', ids.join() === want.join() && !badKey.length && allData,
    `레벨 ${ids.join(',')} (기대 ${want[0]}~${want[want.length - 1]}), 모두 levels/ 데이터 ${allData ? '예' : '아님(!)'}, name_key 어긋남 ${badKey.join(',') || '없음'}`);
}

const compiled = [];
for (const { src, lvl } of entries) {
  const id = lvl.id;
  const tag = lvl.planned ? ' [계획]' : '';
  report.levels[id] = { planned: !!lvl.planned };
  log(`\n== 레벨 ${id} ${lvl.name}${tag} (${src}) ==`);

  // S1
  const req = ['id', 'theme_id', 'bpm', 'beats_per_bar', 'count_in_bars', 'judge', 'patterns', 'bars', 'sections', 'new_gimmicks', 'allowed_slots', 'known_patterns'];
  const missing = req.filter((k) => lvl[k] === undefined);
  const slotErr = [];
  for (const [pid, p] of Object.entries(lvl.patterns)) {
    for (const s of p.slots) {
      if (!Number.isInteger(s) || s < 0 || s > 7) slotErr.push(`${pid}:${s} 범위 밖`);
      if (lvl.allowed_slots === 'even' && s % 2) slotErr.push(`${pid}:${s} 반박 금지 레벨`);
      if (s % 2 && !p.slots.includes(s - 1)) slotErr.push(`${pid}:${s} 반박이 정박 바로 뒤가 아님`);
    }
    if ([...p.slots].sort((a, b) => a - b).join() !== p.slots.join()) slotErr.push(`${pid} 자리 정렬 안 됨`);
    const lib = bal.pattern_library[pid];
    if (!lib || lib.slots.join() !== p.slots.join()) slotErr.push(`${pid} pattern_library 와 다름`);
  }
  const badBars = lvl.bars.filter((b) => !['show', 'play', 'rest'].includes(b.mode) || (b.mode !== 'rest' && !lvl.patterns[b.pattern]));
  const themeOk = new RegExp(V.theme_id_pattern).test(lvl.theme_id || '') && lvl.theme_id === `level${id}`;
  check(id, 'S1', !missing.length && !slotErr.length && !badBars.length && lvl.length_bars === lvl.bars.length && themeOk,
    missing.length || slotErr.length || badBars.length || !themeOk ? `누락 ${missing} / ${slotErr} / 잘못된 마디 ${badBars.length} / theme_id ${lvl.theme_id}` : `스키마 정상 (마디 ${lvl.bars.length} + 카운트인 ${lvl.count_in_bars}, theme_id ${lvl.theme_id})`);

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
  check(id, 'S6', maxGap <= V.max_gap_in_pattern_ms + 1e-6, `무늬 안 최대 간격 ${f0(maxGap)} ms (${where}) ≤ ${V.max_gap_in_pattern_ms} · 정보: 별 최소 간격 ${f0(minGap)} ms`);
  report.levels[id].summary.min_gap_ms = +minGap.toFixed(1);

  // S7 (보여 주기 런 → 같은 순서의 따라 치기 런. 두 마디 무늬는 보여 주기 2마디)
  const seen = new Set(lvl.known_patterns);
  const noShow = [];
  lvl.bars.forEach((b, i) => {
    if (b.mode !== 'play' || seen.has(b.pattern)) return;
    let a = i; while (a > 0 && lvl.bars[a - 1].mode === 'play') a--;
    let s = a; while (s > 0 && lvl.bars[s - 1].mode === 'show') s--;
    const k = i - a, showLen = a - s;
    if (!(k < showLen && lvl.bars[s + k].pattern === b.pattern)) noShow.push(`마디 ${i} ${b.pattern}`);
    seen.add(b.pattern);
  });
  const usedPatterns = [...new Set(lvl.bars.filter((b) => b.mode !== 'rest').map((b) => b.pattern))];
  const newPatterns = usedPatterns.filter((p) => !lvl.known_patterns.includes(p));
  check(id, 'S7', !noShow.length, noShow.length ? `보여 주기 없이 처음 나온 무늬: ${noShow}` : `새 무늬 ${newPatterns.join('·') || '없음'} 모두 보여 주기 마디 뒤에 등장`);

  // S8 그림 카드 (결정 7)
  const g = lvl.new_gimmicks;
  const cardId = lvl.card ? (typeof lvl.card === 'string' ? lvl.card : lvl.card.id) : null;
  const cardTiming = lvl.card && typeof lvl.card === 'object' ? lvl.card.timing : (lvl.planned && cardId ? bal.cards.timing : null);
  const needCard = g.length > 0;
  const cardOk = needCard
    ? !!cardId && new RegExp(V.card_id_pattern).test(cardId) && cardTiming === bal.cards.timing && bal.cards.keys[id] === cardId
    : !cardId;
  check(id, 'S8', g.length <= V.max_new_gimmicks_per_level && cardOk && (id !== '01' || !!cardId),
    `새 기믹 ${g.length}개 (${g.map((x) => x.id).join(', ') || '없음'}) · 카드 ${cardId || '없음'}${cardId ? ` (${cardTiming})` : ''}`);

  // S9
  const outer = j.pass_early_ms + j.miss_zone_ms;
  const okEighth = outer >= L.eighthMs + V.miss_zone_must_cover_eighth_early_margin_ms;
  const okQuarter = outer <= L.beatMs - V.quarter_early_tap_ignored_margin_ms;
  const okGrades = j.perfect_ms < j.good_ms && j.good_ms <= Math.min(j.pass_early_ms, j.pass_late_ms);
  check(id, 'S9', okEighth && okQuarter && okGrades, `놓침 구역 바깥 끝 -${outer} ms: 8분 이른 탭(-${f0(L.eighthMs)}) ${okEighth ? '덮음' : '못 덮음'}, 1박 이른 탭(-${f0(L.beatMs)}) ${okQuarter ? '무시' : '구역 안(!)'} · 딱 ±${j.perfect_ms} < 좋아 ±${j.good_ms} ≤ 통과`);

  // S12 미리 보기 (결정 6)
  const pv = previewSchedule(L, bal);
  const fxMax = bal.preview.judge_fx_max_ms;
  let minRead = Infinity, overlap = 0;
  for (const s of pv) {
    minRead = Math.min(minRead, s.readMs);
    const prevSame = s.t - L.barMs; // 한 마디 앞 같은 자리
    if (s.growStart < prevSame + j.pass_late_ms + fxMax - 1e-6) overlap++;
  }
  check(id, 'S12', overlap === 0 && minRead >= bal.preview.min_read_ms,
    `다음 마디 별 커짐 시작 = 앞 별 +${j.pass_late_ms + fxMax} ms (늦은 창 ${j.pass_late_ms} + 이펙트 ${fxMax}), 겹침 ${overlap} · 다 커진 뒤 최소 판독 ${f0(minRead)} ms ≥ ${bal.preview.min_read_ms}`);
  report.levels[id].summary.min_read_ms = +minRead.toFixed(0);

  // S13 보여 주기 같이 치기 (결정 10)
  const sb = bal.show_bar_taps;
  let worstGap = Infinity, worstMargin = Infinity, worstAt = '';
  for (const s of L.shows) {
    const n = L.stars.find((x) => x.t > s.t);
    if (!n) continue;
    const gap = n.t - s.t, margin = n.zoneStart - s.t;
    if (margin < worstMargin) { worstMargin = margin; worstGap = gap; worstAt = `마디 ${s.bar} 자리 ${s.slot} → 마디 ${n.bar} 자리 ${n.slot}`; }
    worstGap = Math.min(worstGap, gap);
  }
  const s13ok = !L.shows.length || (worstGap >= sb.min_gap_last_show_to_next_star_beats * L.beatMs - 1e-6 && worstMargin >= sb.min_margin_show_star_to_next_miss_zone_ms);
  check(id, 'S13', s13ok, L.shows.length ? `보여 주기 별 → 다음 판정 별 최소 ${f0(worstGap)} ms (≥ 1박 ${f0(L.beatMs)}), 놓침 구역까지 최소 ${f0(worstMargin)} ms (≥ ${sb.min_margin_show_star_to_next_miss_zone_ms}, ${worstAt})` : '보여 주기 마디 없음');

  // S14 북채 등장 1박 안에 판정 별 통과 창 없음 (결정 1)
  const mb = bal.teacher.mallet_appear_beats_before_show_bar;
  const bad14 = [];
  lvl.bars.forEach((b, i) => {
    if (b.mode !== 'show' || (i > 0 && lvl.bars[i - 1].mode === 'show')) return;
    const start = (L.countInBars + i) * L.barMs, appear = start - mb * L.beatMs;
    if (L.stars.some((x) => x.passEnd > appear && x.t < start)) bad14.push(`마디 ${i}`);
  });
  check(id, 'S14', !bad14.length, bad14.length ? `북채가 나타나는 1박에 판정 별: ${bad14}` : `보여 주기 마디 ${lvl.bars.filter((b, i) => b.mode === 'show' && !(i > 0 && lvl.bars[i - 1].mode === 'show')).length}곳, 북채 등장 ${mb}박 안에 판정 별 없음`);

  // 북채 구간 (round-2 R1, judge.mjs malletSchedule)
  const mw = malletSchedule(L, bal);
  report.levels[id].mallet = mw.map((w) => ({ bars: [w.firstBar, w.lastBar], from: +w.from.toFixed(1), last_show: +w.lastShow.toFixed(1), shrink_start: +w.shrinkStart.toFixed(1), gone: +w.gone.toFixed(1), capped: w.capped }));

  // S15 손가락 그림 (레벨 1): 1박 전 등장, 누름 시작은 통과 창 안, 북채가 다 사라진 뒤에만 보임
  for (const c of lvl.cues || []) {
    if (c.key !== bal.tutorial_cue.key) continue;
    const tStar = (L.countInBars * 4 + c.bar * 4 + c.slot / 2) * L.beatMs;
    const appear = tStar - c.show_from_beats_before * L.beatMs;
    const handEnd = tStar + j.pass_late_ms; // hide_after first_star_judged: 늦어도 통과 창 끝
    const press = tStar - c.press_from_beats_before * L.beatMs;
    const isFirst = L.stars[0] && Math.abs(L.stars[0].t - tStar) < 1e-6;
    const firstStar = L.stars.find((x) => Math.abs(x.t - tStar) < 1e-6);
    const pressOk = !!firstStar && press >= firstStar.passStart - 1e-6 && c.press_from_beats_before === bal.tutorial_cue.press_from_beats_before;
    const hits = mw.filter((w) => w.from < handEnd && appear < w.gone);
    const gap = Math.min(...mw.map((w) => (w.gone <= appear ? appear - w.gone : w.from >= handEnd ? w.from - handEnd : -1)));
    check(id, 'S15', isFirst && c.show_from_beats_before === bal.tutorial_cue.show_from_beats_before && pressOk && !hits.length,
      `tut_tap: 첫 꽉 찬 별 ${(tStar / 1000).toFixed(3)} s, 손가락 ${(appear / 1000).toFixed(3)} ~ ${(handEnd / 1000).toFixed(3)} s · 누름 시작 ${(press / 1000).toFixed(3)} s (별 ${f0(press - tStar)} ms, 통과 창 -${j.pass_early_ms} 안 ${pressOk ? '예' : '아님(!)'}) · 북채 구간과 겹침 ${hits.length ? hits.map((w) => '마디 ' + w.firstBar).join(',') + '(!)' : '없음'} (가장 가까운 북채와 ${f0(gap)} ms)`);
  }

  // S16 북채 구간 ∩ 판정 별 [놓침 구역 시작, 통과 창 끝] = 없음 (round-2 R1)
  {
    const bad = [];
    let minMargin = Infinity, minVisible = Infinity, capped = 0;
    for (const w of mw) {
      for (const st of L.stars) if (w.from < st.passEnd && st.zoneStart < w.gone) bad.push(`마디 ${w.firstBar}~${w.lastBar} ↔ 별 ${st.i}(마디 ${st.bar} 자리 ${st.slot})`);
      if (w.shrinkStart < w.lastShow - 1e-6) bad.push(`마디 ${w.firstBar} 작아짐 시작이 마지막 보여 주기 별보다 이름`);
      const nx = L.stars[w.nextStar];
      if (nx) minMargin = Math.min(minMargin, nx.zoneStart - w.gone);
      minVisible = Math.min(minVisible, w.shrinkStart - w.lastShow);
      if (w.capped) capped++;
    }
    check(id, 'S16', !bad.length, mw.length
      ? (bad.length ? `겹침: ${bad.join(' / ')}` : `북채 묶음 ${mw.length}개 모두 판정 별 위험 구간과 겹침 없음 · 사라짐 → 다음 별 놓침 구역 최소 ${f0(minMargin)} ms · 마지막 타격 → 작아짐 시작 최소 ${f0(minVisible)} ms · 상한 적용 ${capped}/${mw.length}`)
      : '보여 주기 마디 없음(북채 없음)');
  }
}

// S10, S11
log('\n== 레벨 사이 / 레벨 1 ==');
for (let k = 1; k < compiled.length; k++) {
  const L = compiled[k], id = L.level.id;
  const w = L.judge.pass_early_ms + L.judge.pass_late_ms;
  const pw = compiled[k - 1].judge.pass_early_ms + compiled[k - 1].judge.pass_late_ms;
  check(id, 'S10', w >= V.min_window_ratio_vs_prev * pw, `통과 창 ${w} ms = 직전 ${pw} ms 의 ${f0(100 * w / pw)} %`);
}
{
  const L = compiled[0], id = L.level.id;
  const n = L.stars.length, first = L.stars[0].t / L.durationMs;
  const rs = bal.restart, rd = rs.restart_delay_s;
  const ph = rs.phases_s;
  const phaseOk = Math.abs(ph.ball_regrow_at_top[1] - rd) < 1e-9 && ph.still[0] === ph.star_break_and_ball_hollow[1] && ph.ball_regrow_at_top[0] === ph.still[1];
  check(id, 'S11', n >= V.l1_star_count_range[0] && n <= V.l1_star_count_range[1] && first >= V.l1_first_star_min_progress && rd >= rs.allowed_range_s[0] && rd <= rs.allowed_range_s[1] && phaseOk,
    `별 ${n}개 (한도 ${V.l1_star_count_range.join('~')}), 첫 별 ${(100 * first).toFixed(1)} % 지점 (${(L.stars[0].t / 1000).toFixed(2)} s), 재시작 ${rd} s, 단계 배분 ${phaseOk ? '이어짐' : '어긋남(!)'} (0~${ph.star_break_and_ball_hollow[1]} 깨짐 / ~${ph.still[1]} 정지 / ~${ph.ball_regrow_at_top[1]} 다시 나타남)`);
}

// 봇
log('\n== 봇 (시도 ' + N + '회, 세션 ' + SESS + '개) ==');
log('레벨 | 프로필 | 클리어율 | 첫 클리어 중앙값(세션, 연속 ln0.5/ln(1-p)) | 90 % | 평균 진행도(별) | 실패 진행도 중앙값(별) | 이른 탭 실패 비율 | 최다 실패 별 몰림 | 등급 1/2/3');
const prog = {};
for (const L of compiled) {
  const id = L.level.id;
  report.levels[id].bots = {};
  for (const [pn, p] of Object.entries(bal.bots.profiles)) {
    const r = runProfile(L, p, bal, { N, sessions: SESS });
    report.levels[id].bots[pn] = r;
    const rs = r.grade_share_of_clears;
    log(`${id} | ${pn} | ${r.clear_rate} | ${r.median_first_clear_sessions} (연속 ${r.median_first_clear_continuous ?? '-'}) | ${r.p90_first_clear_sessions} | ${r.mean_progress} % | ${r.median_fail_progress ?? '-'} % | ${r.early_fail_share} | ${r.top_fail_star_share} (별 ${r.top_fail_star}) | ${rs ? `${rs.one}/${rs.two}/${rs.three}` : '-'}`);
  }
  prog[id] = report.levels[id].bots;
}
log('');
for (const L of compiled) {
  const id = L.level.id, b = prog[id];
  const lim = V.child_sd70_median_max_by_level[id] ?? V.child_sd70_median_max_all;
  check(id, 'B1', b.child_sd70.median_first_clear_sessions <= lim, `σ70 첫 클리어 중앙값 ${b.child_sd70.median_first_clear_sessions}회 ≤ ${lim}`);
  const sk = b.skilled_sd25;
  const skDeaths = Math.round((1 - sk.clear_rate) * N);
  check(id, 'B3', skDeaths < 20 || sk.top_fail_star_share <= 0.3, skDeaths < 20 ? `σ25 실패 ${skDeaths}회(20회 미만, 몰림 판정 생략)` : `σ25 최다 실패 별 몰림 ${sk.top_fail_star_share} ≤ 0.3`);
}
for (let k = 1; k < compiled.length; k++) {
  const a = compiled[k - 1].level.id, c = compiled[k].level.id;
  for (const pn of ['novice_sd50', 'child_sd70']) {
    check(c, 'B2', prog[c][pn].mean_progress < prog[a][pn].mean_progress, `${pn} 평균 진행도(별) ${a} ${prog[a][pn].mean_progress} % > ${c} ${prog[c][pn].mean_progress} %`);
  }
  const ma = prog[a].child_sd70.median_first_clear_sessions, mc = prog[c].child_sd70.median_first_clear_sessions;
  check(c, 'B5', mc <= V.child_sd70_median_max_growth_vs_prev * ma, `σ70 중앙값 ${a} ${ma}회 → ${c} ${mc}회 (${(mc / ma).toFixed(2)}배 ≤ ${V.child_sd70_median_max_growth_vs_prev})`);
}
// B6·B7 레벨 10 목표 (요청자 지시: 레벨 10 = 기존 3레벨 곡선을 이어 간 레벨 6). round-2 R3: 연속 중앙값으로 판정
{
  const R = V.l10_target_rule;
  const med = (id) => prog[id]?.child_sd70.median_first_clear_continuous;
  const imed = (id) => prog[id]?.child_sd70.median_first_clear_sessions;
  const b1 = R.base_levels[0], b2 = R.base_levels[1], b3 = R.base_levels[R.base_levels.length - 1];
  const m1 = med(b1), m2 = med(b2), m3 = med(b3);
  const steps = +b3 - +b1; // L1→L3 = 2 단계 (기하 평균 배율 = 단계 배율들의 기하 평균)
  const r = Math.pow(m3 / m1, 1 / steps);
  const ahead = +R.extrapolate_to_level - +b3; // L3 → L6 = 3 단계
  const T = m3 * Math.pow(r, ahead);
  const lo = (1 - R.tolerance_ratio) * T, hi = (1 + R.tolerance_ratio) * T;
  const m10 = med(R.apply_to_level);
  // 참고: 정수 중앙값으로 같은 식
  const i1 = imed(b1), i3 = imed(b3), ir = Math.pow(i3 / i1, 1 / steps), iT = i3 * Math.pow(ir, ahead);
  report.l10_target = { estimator: 'continuous_median', m01: m1, m02: m2, m03: m3, ratio: +r.toFixed(4), target_L6_extrapolated: +T.toFixed(2), range: [+lo.toFixed(2), +hi.toFixed(2)], L10: m10,
    integer_reference: { m01: i1, m02: imed(b2), m03: i3, ratio: +ir.toFixed(4), target: +iT.toFixed(2), L10: imed(R.apply_to_level) }, quick: QUICK };
  log(`\n== 레벨 10 목표 (B6, 연속 중앙값 m~ = ln0.5/ln(1-p)) ==\n  r = (${m2}/${m1} × ${m3}/${m2})^(1/${steps}) = (${m3}/${m1})^(1/${steps}) = ${r.toFixed(4)} · T = ${m3} × r^${ahead} = ${T.toFixed(2)} · 범위 ±${100 * R.tolerance_ratio} % = ${lo.toFixed(2)} ~ ${hi.toFixed(2)}${QUICK ? ' (--quick: 참고용, 판정은 전체 실행)' : ''}`);
  log(`  참고(판정 안 함) 정수 중앙값: L1~L3 ${i1}/${imed(b2)}/${i3} → r ${ir.toFixed(4)} · T ${iT.toFixed(2)} · L10 ${imed(R.apply_to_level)}`);
  const chk = QUICK ? (lv, code, ok, msg) => log(`  정보 ${code}(--quick, 판정 안 함) ${ok ? '범위 안' : '범위 밖'}: ${msg}`) : check;
  chk(R.apply_to_level, 'B6', m10 != null && m10 >= lo && m10 <= hi, `L10 σ70 연속 중앙값 ${m10}회 ∈ [${lo.toFixed(2)}, ${hi.toFixed(2)}] (T 대비 ${(100 * (m10 / T - 1)).toFixed(1)} %, L1~L3 ${m1}/${m2}/${m3}, 기하 평균 배율 ${r.toFixed(4)}, L6 외삽 ${T.toFixed(2)}; 정수 중앙값 ${imed(R.apply_to_level)})`);
  const seq = R.monotone_levels.map((id) => [id, med(id)]);
  const bad = [];
  for (let k = 1; k < seq.length; k++) if (!(seq[k][1] > seq[k - 1][1])) bad.push(`${seq[k - 1][0]}→${seq[k][0]}`);
  const insideHi = seq.slice(0, -1).every(([, m]) => m < hi);
  chk(R.apply_to_level, 'B7', !bad.length && insideHi, `σ70 연속 중앙값 ${seq.map(([id, m]) => `L${+id} ${m}`).join(' < ')} → ${bad.length ? `단조 아님: ${bad}` : '엄격 단조 증가'} · L3~L9 가 L10 목표 상한 ${hi.toFixed(2)} 미만 ${insideHi ? '예' : '아님(!)'} (정수 중앙값 참고 ${R.monotone_levels.map(imed).join('/')})`);
}
{
  const L = compiled[0];
  const r = prog[L.level.id].child_sd70;
  check(L.level.id, 'B4', r.median_fail_progress_time >= 10, `σ70 실패 위치 중앙값(레벨 시간) ${r.median_fail_progress_time} % ≥ 10 % (별 기준 ${r.median_fail_progress} %)`);
}

// C1 보정 계산 정의 일치 (round-2 R4): 시뮬레이터 tools/sim/calib.mjs vs 빌드 games/rhythm-01/js/calib.js
{
  const buildCalib = resolve(PROJECT, '..', '..', 'games', 'rhythm-01', 'js', 'calib.js');
  report.levels._calib = {};
  log('\n== 보정 계산 정의 (C1) ==');
  if (!existsSync(buildCalib)) log('  정보 C1 빌드 calib.js 없음 → 비교 생략');
  else {
    const bc = await import(pathToFileURL(buildCalib).href);
    const g = bal.audio_latency.guardian_calibration;
    const rng = makeRng(2024);
    let diff = 0, n = 0;
    for (let k = 0; k < 3000; k++) {
      const d = -60 + rng.rnd() * 320, sd = [20, 40, 70, 120][k % 4];
      const rounds = Array.from({ length: 4 }, () => Array.from({ length: g.taps_per_round }, () => d + rng.gauss() * sd));
      const a = JSON.stringify(simCalib.simulate(rounds, g)), b2 = JSON.stringify(bc.simulate(rounds, g));
      const xs = rounds[0].slice(0, 6 + (k % 3));
      n++;
      if (a !== b2 || simCalib.iqr(xs) !== bc.iqr(xs) || simCalib.median(xs) !== bc.median(xs)) diff++;
    }
    check('_calib', 'C1', diff === 0, `무작위 보정 입력 ${n}묶음(오차 σ20~120, 4회분): simulate·iqr·median 결과 다름 ${diff}건 (선형 보간 사분위, 짝수 중앙값 = 가운데 둘 평균, IQR 실패 = 그 회만 다시)`);
  }
}

// 곡선 요약
log('\n== 곡선 요약 (σ70 첫 클리어 중앙값, 세션 시뮬레이션) ==');
log('레벨 | BPM | 길이 s | 판정 별 | 통과 창 | 새 기믹 | σ25 | σ50 | σ70 정수 | σ70 연속 | σ90 | 직전 대비(정수) | 직전 대비(연속)');
report.curve_summary = {};
compiled.forEach((L, k) => {
  const id = L.level.id, b = prog[id];
  const prev = k ? prog[compiled[k - 1].level.id].child_sd70.median_first_clear_sessions : null;
  const m = b.child_sd70.median_first_clear_sessions, mc = b.child_sd70.median_first_clear_continuous;
  const prevC = k ? prog[compiled[k - 1].level.id].child_sd70.median_first_clear_continuous : null;
  report.curve_summary[id] = { sd70_continuous: mc, sd25: b.skilled_sd25.median_first_clear_sessions, sd50: b.novice_sd50.median_first_clear_sessions, sd70: m, sd90: b.child_sd90.median_first_clear_sessions };
  log(`${id}${L.level.planned ? '*' : ''} | ${L.level.bpm} | ${(L.durationMs / 1000).toFixed(1)} | ${L.stars.length} | -${L.judge.pass_early_ms}/+${L.judge.pass_late_ms} | ${L.level.new_gimmicks.map((x) => x.id).join(',') || '-'} | ${b.skilled_sd25.median_first_clear_sessions} | ${b.novice_sd50.median_first_clear_sessions} | ${m} | ${mc} | ${b.child_sd90.median_first_clear_sessions} | ${prev ? (m / prev).toFixed(2) + '배' : '-'} | ${prevC ? (mc / prevC).toFixed(3) + '배' : '-'}`);
});
if (compiled.some((L) => L.level.planned)) log('(* = 곡선 계획, tools/sim/plan.mjs 로 컴파일)');

// 정보: 지연 오차 민감도 (데이터 레벨)
const dataLv = compiled.filter((L) => !L.level.planned && (!V.bias_sweep_levels || V.bias_sweep_levels.includes(L.level.id)));
log('\n== 남은 지연 오차(bias, +면 늦게 침) 민감도: σ70 첫 클리어 중앙값 (σ50) ==');
report.bias = {};
log('bias ms | ' + dataLv.map((L) => 'L' + L.level.id).join(' | '));
for (const bias of V.bias_sweep_ms) {
  const row = [];
  for (const L of dataLv) {
    const c = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: N / 4, sessions: SESS / 2, bias, seed: 777 });
    const nv = runProfile(L, bal.bots.profiles.novice_sd50, bal, { N: N / 4, sessions: SESS / 2, bias, seed: 778 });
    row.push(`${c.median_first_clear_sessions} (${nv.median_first_clear_sessions})`);
    (report.bias[L.level.id] ||= {})[bias] = { child_sd70: c.median_first_clear_sessions, novice_sd50: nv.median_first_clear_sessions };
  }
  log(`${bias} | ${row.join(' | ')}`);
}

// 정보: 보정 화면 영향 (결정 9)
log('\n== 정보: 지연 보정 화면 영향 — σ70 첫 클리어 중앙값 (세션마다 남은 오차 1회 추첨) ==');
const cal = bal.audio_latency.calibration;
const gcal = bal.audio_latency.guardian_calibration;
const scen = [
  ['보정 완벽(오차 0)', null],
  ['자동 보정만·건너뜀(기기 -20~+40)', calibrationBias(cal, { device: V.calibration_device_residual_ms, skip: true })],
  ['보정 화면(아이 σ70 이 8번 톡)', calibrationBias(cal, { device: V.calibration_device_residual_ms, sd: 70 })],
  ['보정 화면(어른 σ40 이 8번 톡)', calibrationBias(cal, { device: V.calibration_device_residual_ms, sd: 40 })],
  ['블루투스·건너뜀(+120~+220)', calibrationBias(cal, { device: V.calibration_bluetooth_residual_ms, skip: true })],
  ['블루투스·보정 화면(아이 σ70)', calibrationBias(cal, { device: V.calibration_bluetooth_residual_ms, sd: 70 })],
  ['[1-3] 보호자 보정(어른 σ40, 2회 12탭)', guardianCalibrationBias(cal, gcal, { device: V.calibration_device_residual_ms, sd: 40 })],
  ['[1-3] 보호자 흐름을 아이가 침(σ70)', guardianCalibrationBias(cal, gcal, { device: V.calibration_device_residual_ms, sd: 70 })],
  ['[1-3] 블루투스·보호자 보정(어른 σ40)', guardianCalibrationBias(cal, gcal, { device: V.calibration_bluetooth_residual_ms, sd: 40 })],
  ['[1-3] 블루투스·보호자 흐름을 아이가 침(σ70)', guardianCalibrationBias(cal, gcal, { device: V.calibration_bluetooth_residual_ms, sd: 70 })],
];
report.calibration = {};
log('경우 | ' + compiled.map((L) => 'L' + L.level.id).join(' | '));
for (const [name, fn] of scen) {
  const row = [];
  for (const L of compiled) {
    const r = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: 200, sessions: SESS / 2, seed: 555, sessionBias: fn });
    row.push(r.median_first_clear_sessions);
    (report.calibration[name] ||= {})[L.level.id] = r.median_first_clear_sessions;
  }
  log(`${name} | ${row.join(' | ')}`);
}

// 정보: 큰 지연 감지 → 다시 보정 그림 신호 (audio_latency.drift_check)
{
  const dc = bal.audio_latency.drift_check;
  log(`\n== 정보: 큰 지연 감지 그림 신호 (σ70 아이가 침, 창 ${dc.window_taps}탭 |중앙값| ≥ ${dc.trigger_abs_median_ms} ms × ${dc.consecutive_windows}번 연속, 시도 ${dc.min_attempts}번 이상, 20시도 안) ==`);
  report.drift = {};
  const rng = makeRng(31);
  const S = QUICK ? 200 : 500;
  for (const [name, dev] of [['보통 기기·자동 보정만(-20~+40) = 오경보', V.calibration_device_residual_ms], ['블루투스·건너뜀(+120~+220) = 감지', V.calibration_bluetooth_residual_ms]]) {
    for (const L of compiled.filter((x) => ['01', '03'].includes(x.level.id))) {
      const hit = [];
      for (let k = 0; k < S; k++) {
        const d = dev[0] + rng.rnd() * (dev[1] - dev[0]);
        const a = driftDetectAttempt(L, bal.bots.profiles.child_sd70, bal, dc, rng, { bias: d, maxAttempts: 20 });
        if (a !== null) hit.push(a);
      }
      hit.sort((x, y) => x - y);
      const res = { share: +(hit.length / S).toFixed(3), median_attempt: hit.length ? hit[Math.floor((hit.length - 1) / 2)] : null, p90_attempt: hit.length ? hit[Math.floor(hit.length * 0.9)] : null };
      (report.drift[name] ||= {})[L.level.id] = res;
      log(`${name} | L${L.level.id} | 신호 켜진 세션 ${res.share} | 켜진 시도 중앙값 ${res.median_attempt ?? '-'} (90 % ${res.p90_attempt ?? '-'})`);
    }
  }
}

// 정보: 따라 치기 변형
log('\n== 정보: 보여 주기 마디에서도 같이 치는 아이 (σ70, along) ==');
report.along = {};
for (const L of compiled) {
  if (!L.shows.length) continue;
  const r = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: N / 2, sessions: SESS / 2, along: true, seed: 999 });
  report.along[L.level.id] = r;
  log(`L${L.level.id} 클리어율 ${r.clear_rate} · 첫 클리어 중앙값 ${r.median_first_clear_sessions} (따라 치지 않을 때 ${prog[L.level.id].child_sd70.median_first_clear_sessions})`);
}

// 정보: 연습 모드
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

// 정보: 해석 예측 (헛탭 무시)
log('\n== 정보: 해석 예측 (헛탭 무시, 별 독립) — 시뮬레이션보다 낙관적 ==');
log('레벨 | σ25 | σ50 | σ70');
report.analytic = {};
for (const L of compiled) {
  const res = {};
  for (const [pn, p] of Object.entries(bal.bots.profiles)) res[pn] = analyticClear({ stars: L.stars.length, early: L.judge.pass_early_ms, late: L.judge.pass_late_ms, sd: p.sd_ms, miss: p.miss });
  report.analytic[L.level.id] = res;
  log(`${L.level.id} | ${res.skilled_sd25.median} | ${res.novice_sd50.median} | ${res.child_sd70.median}`);
}

log(`\n${report.fails.length ? 'FAIL ' + report.fails.length + '건\n  ' + report.fails.join('\n  ') : 'ALL PASS'}`);
if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
process.exit(report.fails.length ? 1 : 0);
