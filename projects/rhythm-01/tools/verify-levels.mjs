#!/usr/bin/env node
// rhythm-01 레벨 검증기 (node 만 사용)
//
// 사용법
//   node tools/verify-levels.mjs              # levels/ 01~10 전부 + 봇 지표 (B6·B7 판정은 이 전체 실행 기준)
//   node tools/verify-levels.mjs --quick      # 봇 시도 수를 줄여 빠르게 (구조 검사는 같음, B6·B7 은 정보로만)
//   node tools/verify-levels.mjs --json       # 결과 JSON
//
// 대상: balance.json levels(데이터, 레벨 01~10). round-3(R18~R22)부터 레벨 스키마 v3 "북길"(tools/sim/path.mjs, 20-balance.md 17장).
// curve_planned 는 _status 가 deprecated 이면 읽지 않는다.
//
// 검사 (FAIL 이 하나라도 있으면 종료 코드 1)
//   S0 레벨 파일 수 = verify.level_count(10), id 01~10 이어짐, name_key = level<n>_name
//   S1 스키마 v3: 필수 키, path.chunks 모양이 chunk_library 에 있음, 덩어리 모양 규칙(별 1~4, 별 사이 ≤ 1박, 반박은 정박 바로 뒤),
//      정박만 레벨에 반박 없음, theme_id = level<두 자리 id>, length_bars = bars 수
//   S2 박대로 치기 → 클리어, 전부 "딱"
//   S3 무입력 → 실패 (첫 별에서)
//   S4 연타(간격 40~200 ms, 모든 위상) → 한 번도 클리어 안 됨
//   S5 8분 격자 고르게 치기 → 실패
//   S6 한 덩어리 안 별 간격 ≤ 1 s (v2: 한 무늬 안)
//   S7 (폐기, round-3 R20) 새 무늬는 보여 주기 마디 뒤 → N7 로 대체
//   S8 새 기믹 ≤ 1, 새 기믹이 있으면 그림 카드 1장(card_<id>, 레벨 시작 전), 없으면 카드 없음. 레벨 1 은 카드 필수
//   S9 놓침 구역이 "8분 하나 이른 탭"을 덮고 "1박 이른 탭"은 무시
//   S10 레벨 간 통과 창 폭 ≥ 직전의 50 %
//   S11 레벨 1: 별 수 16~20, 첫 별 10 % 이후, 재시작 1.08 s 와 단계 배분 합
//   S12 (폐기, round-3 R19) 한 마디 앞 같은 자리에서 커지며 나타남 → P1 로 대체
//   S13·S14·S16 (폐기, round-3 R18) 보여 주기 마디·북채 → 해당 없음(보여 주기 마디·북채가 없음). S15 → T1 로 대체
//   P1 미리 보기(R19): 가로·세로 모두 미리 보기 ≥ 1.2 s, 판단 시간(미리 보기 − 이른 통과 창) ≥ 1.0 s, 레퍼런스(1.16 s / 0.80 s)보다 짧지 않음
//   P2 실패 → 다음 판정 별(첫 별) ≤ 6 s (일반 모드, criteria 게임 감각 rhythm-01 줄)
//   P3 첫 판정 별 ≥ 시도 시작 + 미리 보기 박, 연습 부활 → 다음 별도 같음 (art 30-art 16-10 요구 3)
//   (P1 추가) 레벨 path 미리 보기 박 = balance.json preview.lead_beats 거울, 세로 = min(가로, 3.5) (art 16-2 해결안 A)
//   T1 레벨 1 손가락: 첫 별 1박 전 등장, 누름 시작이 통과 창 안, 손가락 구간 ∩ 다른 판정 별 [놓침 구역 시작, 통과 창 끝] = 없음
//   N1~N11 반복 회피 규칙(00-benchmark 8-3, R20): tools/sim/path.mjs nChecks
//   B1 봇 σ70 첫 클리어 정수 중앙값 ≤ 레벨별 한도 (L1 5, L7까지 20, 전 레벨 30) — 처음 보는 무늬 비용 포함 세션
//   B2 봇 평균 진행도(판정 별 기준, 비용 없는 독립 시도)가 레벨 순서대로 단조 감소
//   B3 숙련 봇(σ25) 실패가 한 별에 30 % 넘게 몰리지 않음 (실패 20회 이상일 때만)
//   B4 레벨 1 σ70 첫 시도 실패 위치 중앙값(레벨 시간 기준) ≥ 10 % — 처음 보는 무늬 비용 포함
//   B5 σ70 첫 클리어 정수 중앙값이 직전 레벨의 2배 이하 — 비용 포함
//   B6 레벨 10 목표: σ70 연속 중앙값 m~(처음 보는 무늬 비용 포함 세션의 생존 곡선, 비용 0 이면 ln0.5/ln(1-p))로 L1~L3 기하 평균 배율
//      r = (m~03/m~01)^(1/2), L6 외삽 T = m~03·r^3, L10 m~ ∈ [0.8T, 1.2T] (요청자 지시, R3). 정수 중앙값은 참고로 함께 출력
//   B6s 시드 10개(L1~L3·L10)로 같은 계산: T 대비 L10 편차 평균과 모든 시드가 ±20 % 안 (criteria rhythm-02 줄)
//   B7 L3 → L10 σ70 연속 중앙값이 엄격히 단조 증가, L3~L9 는 L10 목표 상한 미만
//   C1 보정 계산 정의 일치: tools/sim/calib.mjs(시뮬레이터) = 빌드 games/rhythm-01/js/calib.js (있을 때만, round-2 R4)
//   K0 콤보 키(balance.json combo): 판정·클리어·실패·30회 한도에 영향 없음 표시, 단계 5·10·20, 끊김 0.3 s
//   K1 콤보 = 성공 판정 수(grades.length), 콤보를 세도 judgeAttempt 결과 불변(봇 탭 재판정)
//   A0 판정 %(balance.json accuracy, round-3 요청자 지시 "판정 이름과 퍼센트"): 계단 100~10·경계 안쪽·영향 전부 false·레벨 정확도 규칙·levels 거울 = 식
//   A1 레벨마다 e 전 구간(0.05 ms 격자 + 경계값)에서 % → 등급 = 판정 등급, 창 끝 10, 창 밖 표시 없음, % 단조, 10칸 모두 나옴, 봇 판정 대조
//   A2 % ·레벨 정확도를 센 뒤 judgeAttempt 결과 불변 (+ 정보: B1·B6 원천 L1·L3·L10 다시 계산 같음)
// 정보 A3: σ25/50/70 클리어 시도의 레벨 정확도 분포
// 정보 R17 (round-3): 보정 때와 플레이 때 자동 지연 차이 Δ = 0·64 ms + (round-3 추가) −64·−30·+30 ms 에서 (a) round-2 방식, (b) R11 방식
//   σ70 첫 클리어 중앙값, (b) Δ ≠ 0 이 Δ 0 과 같은지, R11 안정 대기 시각, 재시작 1.08 s 와의 관계, 빌드 calib.js 에 R11 함수가 있으면 C2 비교 (판정 안 함)
// 정보 R17b (round-3): 보정 무시 구간 경계값(R23 뒤 ±10 ms, 옛 ±30)을 남은 오차로 둔 이른·늦은 시나리오 (처음 보는 무늬 비용 포함, 30회·2배 한도 표시)
// 정보 R23 (round-3 1-2): 보호자 보정 측정 잡음(어른 σ40, 12탭 사용)을 넣고 기기 남은 오차 d 를 고정, 무시 구간 30(옛)·10(새)에서 남은 오차와 L7~L10 σ70 첫 클리어 (30회 한도)
//   S17 (round-3 R25) 레벨 길이(카운트인 포함) ∈ verify.level_length_s (00-benchmark 8-5 "30~45 s")
// 정보 K2: σ70 클리어 시도의 통과 판정 수(R22 예비안이었다면 콤보 끊김 수), 콤보 단계 도달 비율
// 정보 출력: 박마다 치기, 지연 오차 민감도(1~3), 보정 화면 영향(보호자 보정 포함), 큰 지연 감지, 연습 모드(R21), 해석 예측

import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { compileLevel, judgeAttempt } from './sim/judge.mjs';
import * as simCalib from './sim/calib.mjs';
import { runProfile, analyticClear, calibrationBias, guardianCalibrationBias, driftDetectAttempt, makeRng, autoShiftCalibBias, stableWaitMs, botTaps, runNoveltySessions, starHazards, runPracticeV3, accuracyPct, gradeFromPct, levelAccuracy } from './sim/bots.mjs';
import { buildPlanLevel } from './sim/plan.mjs';
import { layoutChunks, nChecks, previewInfo, beatToMs, comboTrace } from './sim/path.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..');
const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const JSON_OUT = args.includes('--json');
const N = QUICK ? 4000 : 20000;
const SESS = QUICK ? 400 : 2000;

const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const V = bal.verify;
const NSESS = QUICK ? 2000 : (V.novelty_sessions || 20000);
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
const PV = bal.path_v3;
const lib = PV.chunk_library;
for (const { src, lvl } of entries) {
  const id = lvl.id;
  const tag = lvl.planned ? ' [계획]' : '';
  report.levels[id] = { planned: !!lvl.planned };
  log(`\n== 레벨 ${id} ${lvl.name}${tag} (${src}) ==`);

  // S1 (v3)
  const req = ['id', 'theme_id', 'bpm', 'beats_per_bar', 'count_in_bars', 'judge', 'patterns', 'bars', 'sections', 'new_gimmicks', 'allowed_slots', 'path', 'practice'];
  const missing = req.filter((k) => lvl[k] === undefined);
  const slotErr = [];
  if (lvl.schema_version !== 3) slotErr.push(`schema_version ${lvl.schema_version} ≠ 3`);
  for (const c of lvl.path?.chunks || []) {
    const sh = lib[c.shape];
    if (!sh) { slotErr.push(`없는 모양 ${c.shape}`); continue; }
    if (!Number.isInteger(c.empty_before) || c.empty_before < 0) slotErr.push(`${c.shape} empty_before ${c.empty_before}`);
  }
  for (const [sid, sh] of Object.entries(lib)) {
    if (sid.startsWith('_')) continue;
    const s = sh.slots;
    if (s.length < 1 || s.length > 4 || s[0] !== 0) slotErr.push(`모양 ${sid} 별 수·시작`);
    for (let k = 1; k < s.length; k++) if (s[k] - s[k - 1] > 2 || s[k] <= s[k - 1]) slotErr.push(`모양 ${sid} 별 사이 > 1박`);
    for (const x of s) if (x % 2 && !s.includes(x - 1)) slotErr.push(`모양 ${sid}:${x} 반박이 정박 바로 뒤가 아님`);
  }
  for (const [pid, p] of Object.entries(lvl.patterns)) for (const s of p.slots) {
    if (!Number.isInteger(s) || s < 0 || s > 7) slotErr.push(`${pid}:${s} 범위 밖`);
    if (lvl.allowed_slots === 'even' && s % 2) slotErr.push(`${pid}:${s} 반박 금지 레벨`);
  }
  const badBars = lvl.bars.filter((b) => !['play', 'rest'].includes(b.mode) || (b.mode !== 'rest' && !lvl.patterns[b.pattern]));
  const themeOk = new RegExp(V.theme_id_pattern).test(lvl.theme_id || '') && lvl.theme_id === `level${id}`;
  check(id, 'S1', !missing.length && !slotErr.length && !badBars.length && lvl.length_bars === lvl.bars.length && themeOk,
    missing.length || slotErr.length || badBars.length || !themeOk ? `누락 ${missing} / ${slotErr} / 잘못된 마디 ${badBars.length} / theme_id ${lvl.theme_id}` : `스키마 v3 정상 (덩어리 ${lvl.path.chunks.length}, 마디 ${lvl.bars.length} + 카운트인 ${lvl.count_in_bars}, 보여 주기 마디 0, theme_id ${lvl.theme_id})`);

  const L = compileLevel(lvl, bal);
  compiled.push(L);
  const j = L.judge;
  const durS = L.durationMs / 1000;
  const chunks = layoutChunks(lvl, bal);
  check(id, 'S17', durS >= V.level_length_s[0] - 1e-9 && durS <= V.level_length_s[1] + 1e-9, `레벨 길이 ${durS.toFixed(3)} s (카운트인 포함, ${lvl.count_in_bars + lvl.length_bars}마디) ∈ ${V.level_length_s[0]}~${V.level_length_s[1]} s (R25)`);
  report.levels[id].summary = { bpm: lvl.bpm, beat_ms: +L.beatMs.toFixed(1), duration_s: +durS.toFixed(2), stars: L.stars.length, chunks: chunks.length, pass_window_ms: j.pass_early_ms + j.pass_late_ms };
  log(`  정보 BPM ${lvl.bpm} · 1박 ${L.beatMs.toFixed(1)} ms · 길이 ${durS.toFixed(2)} s · 판정 별 ${L.stars.length} · 덩어리 ${chunks.length} (${chunks.map((c) => c.shape + (c.k ? c.empty_before : '')).join(' ')}) · 통과 창 -${j.pass_early_ms}/+${j.pass_late_ms} ms`);

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

  // S6 (v3: 한 덩어리 안)
  let maxGap = 0, minGap = Infinity, where = '';
  for (const c of chunks) for (let k = 1; k < c.stars.length; k++) {
    const g = (c.stars[k] - c.stars[k - 1]) * L.beatMs;
    if (g > maxGap) { maxGap = g; where = `덩어리 ${c.k} ${c.shape}`; }
  }
  for (let k = 1; k < L.stars.length; k++) minGap = Math.min(minGap, L.stars[k].t - L.stars[k - 1].t);
  check(id, 'S6', maxGap <= V.max_gap_in_pattern_ms + 1e-6, `덩어리 안 최대 간격 ${f0(maxGap)} ms (${where}) ≤ ${V.max_gap_in_pattern_ms} · 정보: 별 최소 간격 ${f0(minGap)} ms`);
  report.levels[id].summary.min_gap_ms = +minGap.toFixed(1);

  log('  정보 S7 폐기(round-3 R20: 보여 주기 마디 없음) → N7(새 기믹 도입 3단계·안 배운 기믹 금지)로 대체');

  // S8 그림 카드 (결정 7)
  const g = lvl.new_gimmicks;
  const cardId = lvl.card ? (typeof lvl.card === 'string' ? lvl.card : lvl.card.id) : null;
  const cardTiming = lvl.card && typeof lvl.card === 'object' ? lvl.card.timing : (lvl.planned && cardId ? bal.cards.timing : null);
  const needCard = g.length > 0;
  const cardOk = needCard
    ? !!cardId && new RegExp(V.card_id_pattern).test(cardId) && cardTiming === bal.cards.timing && bal.cards.keys[id] === cardId && PV.gimmicks[g[0].id]?.card === cardId
    : !cardId;
  check(id, 'S8', g.length <= V.max_new_gimmicks_per_level && cardOk && (id !== '01' || !!cardId),
    `새 기믹 ${g.length}개 (${g.map((x) => x.id).join(', ') || '없음'}) · 카드 ${cardId || '없음'}${cardId ? ` (${cardTiming})` : ''}`);

  // S9
  const outer = j.pass_early_ms + j.miss_zone_ms;
  const okEighth = outer >= L.eighthMs + V.miss_zone_must_cover_eighth_early_margin_ms;
  const okQuarter = outer <= L.beatMs - V.quarter_early_tap_ignored_margin_ms;
  const okGrades = j.perfect_ms < j.good_ms && j.good_ms <= Math.min(j.pass_early_ms, j.pass_late_ms);
  check(id, 'S9', okEighth && okQuarter && okGrades, `놓침 구역 바깥 끝 -${outer} ms: 8분 이른 탭(-${f0(L.eighthMs)}) ${okEighth ? '덮음' : '못 덮음'}, 1박 이른 탭(-${f0(L.beatMs)}) ${okQuarter ? '무시' : '구역 안(!)'} · 딱 ±${j.perfect_ms} < 좋아 ±${j.good_ms} ≤ 통과`);

  log('  정보 S12 폐기(round-3 R19: 커지며 나타남 → 오른쪽에서 흘러 들어옴) → P1 로 대체 · S13·S14·S16 폐기(R18: 보여 주기 마디·북채 없음, 해당 없음) · S15 → T1');

  // P1 미리 보기·판단 시간 (R19)
  {
    const pv = PV.preview;
    const info = previewInfo(lvl, L, bal);
    const rows = Object.entries(info).map(([o, x]) => {
      const ok = x.preview_ms >= pv.min_preview_ms - 1e-6 && x.decide_ms >= pv.min_decide_ms - 1e-6 && x.preview_ms >= pv.reference_preview_ms && x.decide_ms >= pv.reference_decide_ms;
      return { o, ...x, ok };
    });
    report.levels[id].preview = info;
    const early = +id <= pv.early_levels_through;
    const rec = early ? ` · L1~L3 권장 ${pv.early_levels_recommended_preview_ms} ms 이상: 가로 ${info.landscape.preview_ms >= pv.early_levels_recommended_preview_ms ? '예' : '아니오'}, 세로 ${info.portrait.preview_ms >= pv.early_levels_recommended_preview_ms ? '예' : `아니오(${f0(info.portrait.preview_ms)}, 반박 간격 때문에 3박, 정보)`}` : '';
    const mir = bal.preview?.lead_beats;
    const mirOk = !mir || (mir.landscape?.[id] === info.landscape.lead_beats && mir.portrait?.[id] === info.portrait.lead_beats);
    const portRule = info.portrait.lead_beats === (lvl.allowed_slots === 'even' ? info.landscape.lead_beats : Math.min(info.landscape.lead_beats, 3.5));
    check(id, 'P1', rows.every((r) => r.ok) && mirOk && portRule, `거울 balance.preview.lead_beats ${mirOk ? '같음' : '다름(!)'} · 세로 = min(가로, 3.5) ${portRule ? '예' : '아님(!)'} · ` + rows.map((r) => `${r.o === 'landscape' ? '가로' : '세로'} ${r.lead_beats}박 = 미리 보기 ${f0(r.preview_ms)} ms (≥ ${pv.min_preview_ms}, 레퍼런스 ${pv.reference_preview_ms}) · 판단 ${f0(r.decide_ms)} ms (≥ ${pv.min_decide_ms}, 레퍼런스 ${pv.reference_decide_ms})`).join(' / ') + rec);
  }

  // P2 실패 → 다음 판정 별 (일반 모드, 첫 별)
  {
    const t = bal.restart.restart_delay_s * 1000 + L.stars[0].t;
    report.levels[id].fail_to_next_star_ms = +t.toFixed(0);
    check(id, 'P2', t <= 6000, `실패 → 다음 판정 별 = 재시작 ${bal.restart.restart_delay_s * 1000} + 카운트인·첫 별 ${f0(L.stars[0].t)} = ${f0(t)} ms ≤ 6000`);
  }
  // P3 첫 판정 별 시각 ≥ 시도 시작(카운트인 첫 박) + 미리 보기 박 (첫 별도 오른쪽 끝에서 들어옴, art 16-10 요구 3). 연습 부활(카운트인 + 빈 박)도 같음
  {
    const lead = Math.max(lvl.path.preview_lead_beats, lvl.path.preview_lead_beats_portrait);
    const firstBeats = L.stars[0].t / L.beatMs;
    const reviveMin = Math.min(Infinity, ...lvl.practice.checkpoints.map((c) => bal.path_v3.practice.revive_count_in_bars * lvl.beats_per_bar + (c.next_star_beat - c.beat)));
    check(id, 'P3', firstBeats >= lead - 1e-9 && reviveMin >= lead - 1e-9, `첫 별 = 시도 시작 + ${firstBeats.toFixed(1)}박 ≥ 미리 보기 ${lead}박 · 연습 부활 → 다음 별 최소 ${reviveMin === Infinity ? '-' : reviveMin.toFixed(1)}박 ≥ ${lead}박`);
  }

  // T1 레벨 1 손가락 (S15 대체)
  for (const c of lvl.cues || []) {
    if (c.key !== bal.tutorial_cue.key) continue;
    const tStar = slotMs(L, c.bar, c.slot);
    const appear = tStar - c.show_from_beats_before * L.beatMs;
    const handEnd = tStar + j.pass_late_ms;
    const press = tStar - c.press_from_beats_before * L.beatMs;
    const isFirst = L.stars[0] && Math.abs(L.stars[0].t - tStar) < 1e-6;
    const pressOk = isFirst && press >= L.stars[0].passStart - 1e-6 && press > L.stars[0].zoneStart && c.press_from_beats_before === bal.tutorial_cue.press_from_beats_before;
    const hits = L.stars.slice(1).filter((st) => st.zoneStart < handEnd && appear < st.passEnd);
    const nx = L.stars[1];
    check(id, 'T1', isFirst && c.show_from_beats_before === bal.tutorial_cue.show_from_beats_before && pressOk && !hits.length,
      `${c.key}: 첫 판정 별 ${(tStar / 1000).toFixed(3)} s, 손가락 ${(appear / 1000).toFixed(3)} ~ ${(handEnd / 1000).toFixed(3)} s · 누름 시작 ${f0(press - tStar)} ms (통과 창 -${j.pass_early_ms} 안 ${pressOk ? '예' : '아님(!)'}) · 다른 판정 별 위험 구간과 겹침 ${hits.length ? hits.map((s) => '별 ' + s.i).join(',') + '(!)' : '없음'} (둘째 별 놓침 구역까지 ${nx ? f0(nx.zoneStart - handEnd) : '-'} ms) · 북채 없음`);
  }
  if (id === '01' && !(lvl.cues || []).some((c) => c.key === bal.tutorial_cue.key)) check(id, 'T1', false, `${bal.tutorial_cue.key} 손가락 없음(!)`);

  // N1~N11 (R20)
  const hz = starHazards(L, bal.bots.profiles.child_sd70, bal, { N });
  report.levels[id].n = {};
  for (const c of nChecks(lvl, L, bal, { hazards: hz })) { check(id, c.code, c.ok, c.msg); report.levels[id].n[c.code] = c.ok; }
  report.levels[id].practice_checkpoints = lvl.practice.checkpoints.map((c) => c.beat);
}

function slotMs(L, bar, slot) { return ((L.countInBars + bar) * L.beatsPerBar + slot / 2) * L.beatMs; }

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
log('\n== 봇 (1) 처음 보는 무늬 비용 없음: 독립 시도 ' + N + '회, 세션 ' + SESS + '개 (B2·B3, 참고) ==');
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
const nv = bal.bots.novelty;
log(`\n== 봇 (2) 처음 보는 무늬 비용 포함 (R20): 마디 내용 노출 e 마다 별 놓침 +${100 * nv.extra_miss_first_exposure} × (1 − e/${nv.exposures_to_zero}) %p, 세션(첫 클리어까지, 상한 200) σ70 ${NSESS}개·그 밖 ${Math.round(NSESS / 4)}개 (B1·B4·B5·B6·B7 판정) ==`);
log('레벨 | 프로필 | 첫 클리어 연속 중앙값 m~ | 정수 중앙값 | 90 % | 1번째 시도 클리어율 | 시도 1~5 클리어율 | 상한 200 도달 세션');
const nov = {};
for (const L of compiled) {
  const id = L.level.id;
  nov[id] = {};
  for (const [pn, p] of Object.entries(bal.bots.profiles)) {
    const r = runNoveltySessions(L, p, bal, { sessions: pn === 'child_sd70' ? NSESS : Math.round(NSESS / 4) });
    nov[id][pn] = r;
    log(`${id} | ${pn} | ${r.median_first_clear_continuous ?? '-'} | ${r.median_first_clear_sessions} | ${r.p90_first_clear_sessions} | ${r.attempt1_clear_rate} | ${r.attempt_clear_rate_1_to_5.join('/')} | ${r.capped_sessions}`);
  }
  report.levels[id].bots_novelty = nov[id];
}
log('');
for (const L of compiled) {
  const id = L.level.id, b = nov[id];
  const lim = V.child_sd70_median_max_by_level[id] ?? V.child_sd70_median_max_all;
  const lim2 = Math.min(lim, V.child_sd70_median_max_all, +id <= +V.child_sd70_median_max_through_level.level ? V.child_sd70_median_max_through_level.max : Infinity, id === '01' ? V.l1_child_sd70_median_max : Infinity);
  check(id, 'B1', b.child_sd70.median_first_clear_sessions <= lim2, `σ70 첫 클리어 정수 중앙값(비용 포함) ${b.child_sd70.median_first_clear_sessions}회 ≤ ${lim2} (연속 ${b.child_sd70.median_first_clear_continuous}, 비용 없음 ${prog[id].child_sd70.median_first_clear_sessions})`);
  const sk = prog[id].skilled_sd25;
  const skDeaths = Math.round((1 - sk.clear_rate) * N);
  if (skDeaths >= 20) check(id, 'B3', sk.top_fail_star_share <= 0.3, `σ25 최다 실패 별 몰림 ${sk.top_fail_star_share} ≤ 0.3 (실패 ${skDeaths}회)`);
  else { const s5 = prog[id].novice_sd50; check(id, 'B3', s5.top_fail_star_share <= 0.3, `σ25 실패 ${skDeaths}회(20회 미만) → σ50 최다 실패 별 몰림 ${s5.top_fail_star_share} ≤ 0.3 (criteria rhythm-01 줄)`); }
}
for (let k = 1; k < compiled.length; k++) {
  const a = compiled[k - 1].level.id, c = compiled[k].level.id;
  for (const pn of ['novice_sd50', 'child_sd70']) {
    check(c, 'B2', prog[c][pn].mean_progress < prog[a][pn].mean_progress, `${pn} 평균 진행도(별) ${a} ${prog[a][pn].mean_progress} % > ${c} ${prog[c][pn].mean_progress} %`);
  }
  const ma = nov[a].child_sd70.median_first_clear_sessions, mc = nov[c].child_sd70.median_first_clear_sessions;
  const ca = nov[a].child_sd70.median_first_clear_continuous, cc = nov[c].child_sd70.median_first_clear_continuous;
  check(c, 'B5', mc <= V.child_sd70_median_max_growth_vs_prev * ma && cc <= V.child_sd70_median_max_growth_vs_prev * ca, `σ70 중앙값(비용 포함) ${a} ${ma}회 → ${c} ${mc}회 (${(mc / ma).toFixed(2)}배, 연속 ${(cc / ca).toFixed(3)}배 ≤ ${V.child_sd70_median_max_growth_vs_prev})`);
}
// B6·B7 레벨 10 목표 (요청자 지시: 레벨 10 = 기존 3레벨 곡선을 이어 간 레벨 6). R3 연속 중앙값, round-3 처음 보는 무늬 비용 포함
const R = V.l10_target_rule;
const targetOf = (m1, m3, steps, ahead) => { const r = Math.pow(m3 / m1, 1 / steps); return { r, T: m3 * Math.pow(r, ahead) }; };
{
  const med = (id) => nov[id]?.child_sd70.median_first_clear_continuous;
  const imed = (id) => nov[id]?.child_sd70.median_first_clear_sessions;
  const b1 = R.base_levels[0], b2 = R.base_levels[1], b3 = R.base_levels[R.base_levels.length - 1];
  const m1 = med(b1), m2 = med(b2), m3 = med(b3);
  const steps = +b3 - +b1;
  const ahead = +R.extrapolate_to_level - +b3;
  const { r, T } = targetOf(m1, m3, steps, ahead);
  const lo = (1 - R.tolerance_ratio) * T, hi = (1 + R.tolerance_ratio) * T;
  const m10 = med(R.apply_to_level);
  const i1 = imed(b1), i3 = imed(b3), ir = Math.pow(i3 / i1, 1 / steps), iT = i3 * Math.pow(ir, ahead);
  const c1 = prog[b1].child_sd70.median_first_clear_continuous, c3 = prog[b3].child_sd70.median_first_clear_continuous, cT = targetOf(c1, c3, steps, ahead).T;
  report.l10_target = { estimator: R.estimator, m01: m1, m02: m2, m03: m3, ratio: +r.toFixed(4), target_L6_extrapolated: +T.toFixed(2), range: [+lo.toFixed(2), +hi.toFixed(2)], L10: m10,
    integer_reference: { m01: i1, m02: imed(b2), m03: i3, ratio: +ir.toFixed(4), target: +iT.toFixed(2), L10: imed(R.apply_to_level) },
    no_novelty_reference: { m01: c1, m03: c3, target: +cT.toFixed(2), L10: prog[R.apply_to_level].child_sd70.median_first_clear_continuous }, quick: QUICK };
  log(`\n== 레벨 10 목표 (B6, σ70 연속 중앙값, 처음 보는 무늬 비용 포함 세션 ${NSESS}개) ==\n  r = (${m2}/${m1} × ${m3}/${m2})^(1/${steps}) = (${m3}/${m1})^(1/${steps}) = ${r.toFixed(4)} · T = ${m3} × r^${ahead} = ${T.toFixed(2)} · 범위 ±${100 * R.tolerance_ratio} % = ${lo.toFixed(2)} ~ ${hi.toFixed(2)}${QUICK ? ' (--quick: 참고용, 판정은 전체 실행)' : ''}`);
  log(`  참고(판정 안 함) 정수 중앙값: L1~L3 ${i1}/${imed(b2)}/${i3} → r ${ir.toFixed(4)} · T ${iT.toFixed(2)} · L10 ${imed(R.apply_to_level)}`);
  log(`  참고(판정 안 함) 비용 없는 ln0.5/ln(1-p): L1 ${c1} · L3 ${c3} → T ${cT.toFixed(2)} · L10 ${prog[R.apply_to_level].child_sd70.median_first_clear_continuous} (T 대비 ${(100 * (prog[R.apply_to_level].child_sd70.median_first_clear_continuous / cT - 1)).toFixed(1)} %)`);
  const chk = QUICK ? (lv, code, ok, msg) => log(`  정보 ${code}(--quick, 판정 안 함) ${ok ? '범위 안' : '범위 밖'}: ${msg}`) : check;
  chk(R.apply_to_level, 'B6', m10 != null && m10 >= lo && m10 <= hi, `L10 σ70 연속 중앙값 ${m10}회 ∈ [${lo.toFixed(2)}, ${hi.toFixed(2)}] (T 대비 ${(100 * (m10 / T - 1)).toFixed(1)} %, L1~L3 ${m1}/${m2}/${m3}, 기하 평균 배율 ${r.toFixed(4)}, L6 외삽 ${T.toFixed(2)}; 정수 중앙값 ${imed(R.apply_to_level)})`);
  const seq = R.monotone_levels.map((id) => [id, med(id)]);
  const bad = [];
  for (let k = 1; k < seq.length; k++) if (!(seq[k][1] > seq[k - 1][1])) bad.push(`${seq[k - 1][0]}→${seq[k][0]}`);
  const insideHi = seq.slice(0, -1).every(([, m]) => m < hi);
  chk(R.apply_to_level, 'B7', !bad.length && insideHi, `σ70 연속 중앙값 ${seq.map(([id, m]) => `L${+id} ${m}`).join(' < ')} → ${bad.length ? `단조 아님: ${bad}` : '엄격 단조 증가'} · L3~L9 가 L10 목표 상한 ${hi.toFixed(2)} 미만 ${insideHi ? '예' : '아님(!)'} (정수 중앙값 참고 ${R.monotone_levels.map(imed).join('/')})`);
  // B6s 시드 분포
  const sp = R.seed_spread;
  if (sp) {
    const byId = Object.fromEntries(compiled.map((L) => [L.level.id, L]));
    const S = QUICK ? Math.round(sp.sessions / 10) : sp.sessions;
    const devs = [];
    for (let k = 0; k < sp.seeds; k++) {
      const seed = 1000 + 7919 * k;
      const m = Object.fromEntries(sp.levels.map((id) => [id, runNoveltySessions(byId[id], bal.bots.profiles.child_sd70, bal, { sessions: S, seed }).median_first_clear_continuous]));
      const t = targetOf(m[b1], m[b3], steps, ahead).T;
      devs.push({ seed, m, T: t, dev: m[R.apply_to_level] / t - 1 });
    }
    const mean = devs.reduce((a, d) => a + d.dev, 0) / devs.length;
    const sd = Math.sqrt(devs.reduce((a, d) => a + (d.dev - mean) ** 2, 0) / (devs.length - 1));
    const allIn = devs.every((d) => Math.abs(d.dev) <= R.tolerance_ratio);
    report.l10_target.seed_spread = { sessions: S, mean_dev: +mean.toFixed(4), sd_dev: +sd.toFixed(4), all_within: allIn, rows: devs.map((d) => ({ seed: d.seed, ...d.m, T: +d.T.toFixed(2), dev: +d.dev.toFixed(4) })) };
    log('  시드 | ' + sp.levels.map((x) => 'L' + x).join(' | ') + ' | T | L10/T−1');
    for (const d of devs) log(`  ${d.seed} | ${sp.levels.map((x) => d.m[x]).join(' | ')} | ${d.T.toFixed(2)} | ${(100 * d.dev).toFixed(1)} %`);
    chk(R.apply_to_level, 'B6s', Math.abs(mean) <= R.tolerance_ratio && allIn, `시드 ${sp.seeds}개(세션 ${S}) L10 T 대비 편차 평균 ${(100 * mean).toFixed(1)} %·표준편차 ${(100 * sd).toFixed(1)} %, 범위 ${(100 * Math.min(...devs.map((d) => d.dev))).toFixed(1)} ~ ${(100 * Math.max(...devs.map((d) => d.dev))).toFixed(1)} % → 모두 ±${100 * R.tolerance_ratio} % 안 ${allIn ? '예' : '아님(!)'}`);
  }
}
{
  const L = compiled[0];
  const r = nov[L.level.id].child_sd70, c = prog[L.level.id].child_sd70;
  check(L.level.id, 'B4', r.first_fail_progress_time_median >= 10, `σ70 첫 시도(비용 포함) 실패 위치 중앙값(레벨 시간) ${r.first_fail_progress_time_median} % ≥ 10 % (비용 없음 ${c.median_fail_progress_time} %, 별 기준 ${c.median_fail_progress} %)`);
}

// K0·K1 콤보 (공통 문서 harness/benchmarks/djmax-judgement.md 4-2, round-3 확정)
{
  report.levels._combo = {};
  log('\n== 콤보 (K0·K1·K2) ==');
  const cb = bal.combo || {};
  const steps = (cb.steps || []).map((s) => s.at);
  const k0 = cb.rule === 'success_count' && cb.affects && Object.values(cb.affects).every((v) => v === false) && [5, 10, 20].every((x) => steps.includes(x)) && cb.break_fx?.fade_s === 0.3 && (cb.breaks_on || []).join() === 'fail' && cb.grade_reflection === 'none';
  check('_combo', 'K0', k0, `규칙 ${cb.rule} (성공 판정마다 +1, 실패에서만 끊김) · 영향 ${cb.affects ? Object.entries(cb.affects).map(([k, v]) => `${k} ${v}`).join(', ') : '없음(!)'} · 단계 ${steps.join('·')} · 끊김 ${cb.break_fx?.fade_s} s · 등급 반영 ${cb.grade_reflection}`);
  const rng = makeRng(808);
  let diff = 0, n = 0;
  for (const L of compiled) for (let k = 0; k < 500; k++) {
    const taps = botTaps(L, bal.bots.profiles.child_sd70, rng, { extraAfter: bal.bots.extra_tap_after_s });
    const a = judgeAttempt(L, taps);
    const t = comboTrace(a);
    const b = judgeAttempt(L, taps);
    n++;
    if (t.final !== a.grades.length || JSON.stringify(a) !== JSON.stringify(b) || t.trace.some((x, i) => x !== i + 1)) diff++;
  }
  check('_combo', 'K1', diff === 0, `σ70 봇 탭 ${n}시도: 콤보 끝 값 = 성공 판정 수, 콤보를 센 뒤 judgeAttempt 다시 판정 결과(클리어·실패 위치·이유·등급) 다름 ${diff}건`);
  // K2 정보
  log('  정보 K2 (σ70, 비용 없는 독립 시도 ' + N / 4 + '회): 레벨 | 판정 별 | 클리어 시도 통과 판정 평균(= R22 예비안이었다면 콤보 끊김 수) | 끊김 0번 클리어 비율 | R22 였다면 최고 콤보 평균 | 콤보 5·10·20 도달(전체 시도)');
  report.combo_info = {};
  for (const L of compiled) {
    const rng2 = makeRng(4242);
    let clears = 0, passSum = 0, zero = 0, maxR22 = 0;
    const reach = { 5: 0, 10: 0, 20: 0 };
    for (let k = 0; k < N / 4; k++) {
      const a = judgeAttempt(L, botTaps(L, bal.bots.profiles.child_sd70, rng2, { extraAfter: bal.bots.extra_tap_after_s }));
      for (const x of [5, 10, 20]) if (a.grades.length >= x) reach[x]++;
      if (!a.clear) continue;
      clears++;
      const t = comboTrace(a, 'good_or_better');
      passSum += a.grades.filter((g) => g.grade === 'pass').length;
      if (!t.breaks) zero++;
      maxR22 += t.max;
    }
    const row = { stars: L.stars.length, pass_per_clear: clears ? +(passSum / clears).toFixed(2) : null, no_break_share: clears ? +(zero / clears).toFixed(3) : null, r22_max_combo_mean: clears ? +(maxR22 / clears).toFixed(1) : null, reach: Object.fromEntries(Object.entries(reach).map(([x, v]) => [x, +(v / (N / 4)).toFixed(3)])) };
    report.combo_info[L.level.id] = row;
    log(`  L${L.level.id} | ${row.stars} | ${row.pass_per_clear} | ${row.no_break_share} | ${row.r22_max_combo_mean} | ${row.reach[5]}/${row.reach[10]}/${row.reach[20]}`);
  }
}

// A0·A1·A2 판정 %·레벨 정확도 (round-3, 요청자 지시 "판정 이름과 퍼센트까지 해주세요", 공통 문서 djmax-judgement.md 7-2, balance.json accuracy)
{
  report.levels._accuracy = {};
  log('\n== 판정 %·레벨 정확도 (A0·A1·A2·정보 A3) ==');
  const acc = bal.accuracy || {};
  const near = (a, b) => Math.abs(a - b) <= 0.006;
  // A0 키·영향 없음·레벨 거울 = 식
  const mirrorBad = [];
  for (const L of compiled) {
    const j = L.judge, m = acc.levels?.[L.level.id];
    const side = (W) => [acc.perfect_inner_ms, j.perfect_ms, j.perfect_ms + (j.good_ms - j.perfect_ms) / 3, j.perfect_ms + (2 * (j.good_ms - j.perfect_ms)) / 3, j.good_ms, ...[1, 2, 3, 4, 5].map((k) => j.good_ms + ((W - j.good_ms) * k) / 5)];
    const ok = m && m.good_ms === j.good_ms && m.pass_early_ms === j.pass_early_ms && m.pass_late_ms === j.pass_late_ms
      && side(j.pass_early_ms).every((x, i) => near(x, m.early_d_max_ms[i])) && side(j.pass_late_ms).every((x, i) => near(x, m.late_d_max_ms[i]));
    if (!ok) mirrorBad.push(L.level.id);
  }
  const pcts = [acc.perfect_inner_pct, acc.perfect_outer_pct, ...(acc.good_pcts || []), ...(acc.pass_pcts || [])];
  const a0 = acc.rule === 'step_10' && acc.boundary === 'inclusive_inner' && acc.affects && Object.values(acc.affects).every((v) => v === false)
    && pcts.join() === '100,90,80,70,60,50,40,30,20,10' && acc.level_accuracy?.rule === 'mean_floor' && acc.level_accuracy?.counts === 'clear_attempt_only'
    && acc.level_accuracy?.failed_attempt === 'none' && acc.level_accuracy?.practice_mode === 'none' && acc.record?.mode === 'normal_only' && acc.record?.new_record_mark?.first_clear === false && acc.record?.new_record_mark?.tie === false && acc.fail?.pct === null && mirrorBad.length === 0;
  const notFalse = acc.affects ? Object.entries(acc.affects).filter(([, v]) => v !== false).map(([k]) => k) : null;
  check('_accuracy', 'A0', a0, `계단 ${pcts.join('/')} (≤${acc.perfect_inner_ms} ms 100, ≤딱 90, 좋아 3칸, 통과 5칸, 경계 = 안쪽) · 영향 ${notFalse ? (notFalse.length ? notFalse.join(',') + ' (!)' : `${Object.keys(acc.affects).length}개 전부 false`) : '없음(!)'} · 레벨 정확도 ${acc.level_accuracy?.rule}/${acc.level_accuracy?.counts}/실패 ${acc.level_accuracy?.failed_attempt}/연습 ${acc.level_accuracy?.practice_mode} · 기록 ${acc.record?.mode}, 신기록 표지 ${acc.record?.new_record_mark?.show_if}(첫 클리어 ${acc.record?.new_record_mark?.first_clear}) · levels 거울 = 식 ${mirrorBad.length ? '다름 ' + mirrorBad.join(',') : `${compiled.length}/${compiled.length}`}`);
  // A1 레벨마다 e 전 구간에서 % → 등급 = 판정 등급
  const gradeOf = (j, e) => { const a = Math.abs(e); return a <= j.perfect_ms ? 'perfect' : a <= j.good_ms ? 'good' : 'pass'; };
  report.accuracy = { levels: {} };
  log('  레벨 | 좋아 g | 이른 창 W | 늦은 창 W | 통과 한 칸(이른/늦은) | 이른 쪽 칸 끝 d (100→10) | 늦은 쪽 칸 끝 d (100→10)');
  for (const L of compiled) {
    const j = L.judge, id = L.level.id;
    let bad = 0, n = 0, mono = 0;
    const seen = { early: new Set(), late: new Set() };
    for (const [side, W, sgn] of [['early', j.pass_early_ms, -1], ['late', j.pass_late_ms, 1]]) {
      const m = acc.levels[id][side + '_d_max_ms'];
      const ds = [];
      for (let k = 0; k * 0.05 <= W + 1; k++) ds.push(+(k * 0.05).toFixed(2));
      ds.push(...m, ...m.map((x) => x + 0.001), j.perfect_ms + (j.good_ms - j.perfect_ms) / 3, j.perfect_ms + (2 * (j.good_ms - j.perfect_ms)) / 3, W);
      ds.sort((a, b) => a - b);
      let prev = 101;
      for (const d of ds) {
        n++;
        const p = accuracyPct(sgn * d, j, acc);
        if (d > W) { if (p !== null) bad++; continue; }
        if (p == null || gradeFromPct(p, acc) !== gradeOf(j, sgn * d)) bad++;
        if (p != null) { if (p > prev) mono++; prev = p; seen[side].add(p); }
      }
      if (accuracyPct(sgn * W, j, acc) !== 10 || accuracyPct(sgn * (W + 0.01), j, acc) !== null) bad++;
    }
    if (accuracyPct(0, j, acc) !== 100) bad++;
    // 봇 탭: judgeAttempt 등급과 대조 (네 프로필 × 500시도)
    const rng = makeRng(5150 + +id);
    let gb = 0, gn = 0;
    for (const p of Object.values(bal.bots.profiles)) for (let k = 0; k < 500; k++) {
      const a = judgeAttempt(L, botTaps(L, p, rng, { extraAfter: bal.bots.extra_tap_after_s }));
      for (const g of a.grades) { gn++; if (gradeFromPct(accuracyPct(g.e, j, acc), acc) !== g.grade) gb++; }
    }
    const all10 = seen.early.size === 10 && seen.late.size === 10;
    report.accuracy.levels[id] = { grid_points: n, grid_mismatch: bad, monotonic_violations: mono, bot_grades: gn, bot_mismatch: gb };
    check(id, 'A1', bad === 0 && mono === 0 && gb === 0 && all10, `% → 등급 = 판정 등급: 격자·경계 ${n}점 다름 ${bad} · |e| 늘 때 % 오름 ${mono} · 창 끝 = 10 · 창 밖 = 표시 없음 · 칸 10개 모두 나옴(이른 ${seen.early.size}/늦은 ${seen.late.size}) · 봇 판정 ${gn}개 다름 ${gb}`);
    const m = acc.levels[id];
    log(`  L${id} | ${j.good_ms} | ${j.pass_early_ms} | ${j.pass_late_ms} | ${m.pass_bin_early_ms}/${m.pass_bin_late_ms} | ${m.early_d_max_ms.join(' ')} | ${m.late_d_max_ms.join(' ')}`);
  }
  // A2 % 를 세도 판정 결과·B1·B6 불변
  {
    const rng = makeRng(909);
    let diff = 0, n = 0;
    for (const L of compiled) for (let k = 0; k < 500; k++) {
      const taps = botTaps(L, bal.bots.profiles.child_sd70, rng, { extraAfter: bal.bots.extra_tap_after_s });
      const a = judgeAttempt(L, taps), s0 = JSON.stringify(a);
      levelAccuracy(L, a, acc);
      for (const g of a.grades) accuracyPct(g.e, L.judge, acc);
      n++;
      if (JSON.stringify(a) !== s0 || JSON.stringify(judgeAttempt(L, taps)) !== s0) diff++;
    }
    check('_accuracy', 'A2', diff === 0, `σ70 봇 탭 ${n}시도: % ·레벨 정확도를 센 뒤 판정 결과(클리어·실패 위치·이유·등급·헛탭) 다름 ${diff}건 · % 는 judgeAttempt 입력에 없음(판정 창·놓침 구역·재시작 시각 그대로)`);
    const ids = [R.base_levels?.[0] ?? '01', '03', R.apply_to_level].filter((x, i, a) => a.indexOf(x) === i);
    const again = ids.map((id) => { const L = compiled.find((x) => x.level.id === id); return [id, runNoveltySessions(L, bal.bots.profiles.child_sd70, bal, { sessions: NSESS })]; });
    const same = again.every(([id, r]) => r.median_first_clear_continuous === nov[id].child_sd70.median_first_clear_continuous && r.median_first_clear_sessions === nov[id].child_sd70.median_first_clear_sessions);
    log(`  정보 A2 (B1·B6 원천 다시 계산, % 를 센 뒤 같은 시드 세션 ${NSESS}개): ${again.map(([id, r]) => `L${id} ${r.median_first_clear_sessions}회 (연속 ${r.median_first_clear_continuous}) = 앞 ${nov[id].child_sd70.median_first_clear_sessions} (${nov[id].child_sd70.median_first_clear_continuous})`).join(' · ')} → ${same ? '같음: 클리어·30회 한도(B1)·L10 목표(B6) 영향 0' : '다름(!)'}`);
    if (!same) report.fails.push('_accuracy A2 정보: B1·B6 원천 다시 계산 값이 다름');
    report.accuracy.invariance = { rejudge_diff: diff, attempts: n, b6_sources_same: same };
  }
  // 정보 A3 클리어 시도 레벨 정확도 분포
  const NA = N / 4;
  log(`  정보 A3 (비용 없는 독립 시도 ${NA}회, 클리어한 시도만 레벨 정확도 = floor(평균 %), 실패 시도는 정확도 없음): 레벨 | σ25 클리어 수 · 평균 · 10/50/90 백분위 · 최소~최대 · 100 비율 | σ50 같음 | σ70 같음 (처음 보는 무늬 비용은 놓침만 늘려 클리어 시도의 오차 분포는 같음)`);
  const q = (s, f) => s[Math.min(s.length - 1, Math.floor(f * (s.length - 1)))];
  report.accuracy.distribution = {};
  for (const L of compiled) {
    const row = {}, parts = [];
    for (const pn of ['skilled_sd25', 'novice_sd50', 'child_sd70']) {
      const rng = makeRng(6060 + +L.level.id);
      const xs = [];
      let leak = 0;
      for (let k = 0; k < NA; k++) {
        const a = judgeAttempt(L, botTaps(L, bal.bots.profiles[pn], rng, { extraAfter: bal.bots.extra_tap_after_s }));
        const v = levelAccuracy(L, a, acc);
        if (a.clear !== (v !== null)) leak++;
        if (v !== null) xs.push(v);
      }
      if (leak) report.fails.push(`${L.level.id} A3 ${pn}: 실패 시도 정확도 또는 클리어 정확도 없음 ${leak}건`);
      xs.sort((a, b) => a - b);
      const r = xs.length ? { clears: xs.length, mean: +(xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(1), p10: q(xs, 0.1), p50: q(xs, 0.5), p90: q(xs, 0.9), min: xs[0], max: xs[xs.length - 1], share100: +(xs.filter((x) => x === 100).length / xs.length).toFixed(3) } : { clears: 0 };
      row[pn] = r;
      parts.push(r.clears ? `${r.clears} · ${r.mean} · ${r.p10}/${r.p50}/${r.p90} · ${r.min}~${r.max} · ${r.share100}` : '0');
    }
    report.accuracy.distribution[L.level.id] = row;
    log(`  L${L.level.id} | ${parts.join(' | ')}`);
  }
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
log('\n== 곡선 요약 (σ70 첫 클리어, 처음 보는 무늬 비용 포함 세션 = 판정 원천 / 비용 없음 = 참고) ==');
log('레벨 | BPM | 길이 s | 판정 별 | 덩어리 | 통과 창 | 미리 보기 박(가로/세로) | 새 기믹 | σ25 | σ50 | σ70 정수 | σ70 연속 m~ | σ90 | 직전 대비(연속) | 비용 없음 σ70 연속');
report.curve_summary = {};
compiled.forEach((L, k) => {
  const id = L.level.id, b = nov[id];
  const mc = b.child_sd70.median_first_clear_continuous;
  const prevC = k ? nov[compiled[k - 1].level.id].child_sd70.median_first_clear_continuous : null;
  report.curve_summary[id] = { sd70_continuous: mc, sd70: b.child_sd70.median_first_clear_sessions, sd25: b.skilled_sd25.median_first_clear_sessions, sd50: b.novice_sd50.median_first_clear_sessions, sd90: b.child_sd90.median_first_clear_sessions, sd70_continuous_no_novelty: prog[id].child_sd70.median_first_clear_continuous };
  log(`${id} | ${L.level.bpm} | ${(L.durationMs / 1000).toFixed(1)} | ${L.stars.length} | ${L.level.path.chunks.length} | -${L.judge.pass_early_ms}/+${L.judge.pass_late_ms} | ${L.level.path.preview_lead_beats}/${L.level.path.preview_lead_beats_portrait} | ${L.level.new_gimmicks.map((x) => x.id).join(',') || '-'} | ${b.skilled_sd25.median_first_clear_sessions} | ${b.novice_sd50.median_first_clear_sessions} | ${b.child_sd70.median_first_clear_sessions} | ${mc} | ${b.child_sd90.median_first_clear_sessions} | ${prevC ? (mc / prevC).toFixed(3) + '배' : '-'} | ${prog[id].child_sd70.median_first_clear_continuous}`);
});

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

// 정보 R17 (round-3): 보정 때와 플레이 때 자동 지연 차이 Δ. 판정에 섞지 않음(INFO). 20-balance.md 8-1·8-3
{
  const A = V.calibration_auto_shift, rd = bal.audio_latency.auto_latency_read, st = rd.stable_wait;
  log(`\n== 정보 R17: 보정 때와 플레이 때 자동 지연 차이 Δ — σ70 아이가 플레이, 첫 클리어 중앙값 (보호자 흐름, 기기 남은 오차 ${V.calibration_device_residual_ms.join('~')}, 세션 ${SESS / 2}, 시드 555) ==`);
  log(`  모델: 자동 지연 보고값이 잠금 해제 ${A.jump_at_ms} ms 뒤 ${A.stable_auto_ms - 64}→${A.stable_auto_ms} ms 처럼 Δ 만큼 바뀜. (a) round-2 = 보정 시작(${A.r2_calib_start_ms} ms)에 읽은 값으로 보정 내내 잼, (b) R11 = 안정 대기 뒤 탭마다 그 순간 autoNow 로 잼. 두 방식 모두 시도 시작마다 autoNow 다시 읽음`);
  report.auto_shift = {};
  const rows = [];
  for (const sd of A.tappers_sd_ms) for (const method of ['r2', 'r11']) for (const delta of A.delta_ms) rows.push({ sd, method, delta, jump: A.jump_at_ms });
  rows.push({ sd: A.tappers_sd_ms[0], method: 'r11', delta: Math.max(...A.delta_ms), jump: A.mid_calib_jump_at_ms });
  // round-3 추가(rhythm-02 인사이트): 음(−)의 Δ 와 무시 구간 경계 크기 Δ (보정한 사람 σ40, 두 방식)
  for (const delta of (A.delta_ms_info_r3 || []).filter((d) => !A.delta_ms.includes(d))) for (const method of ['r2', 'r11']) rows.push({ sd: A.tappers_sd_ms[0], method, delta, jump: A.jump_at_ms, r3: true });
  rows.push({ sd: A.tappers_sd_ms[0], method: 'r11', delta: Math.min(...(A.delta_ms_info_r3 || [0])), jump: A.mid_calib_jump_at_ms, r3: true });
  log('경우 | ' + compiled.map((L) => 'L' + L.level.id).join(' | '));
  for (const c of rows) {
    const fn = autoShiftCalibBias(cal, gcal, { device: V.calibration_device_residual_ms, sd: c.sd, deltaMs: c.delta, method: c.method, jumpAtMs: c.jump, stableMs: A.stable_auto_ms, calibStartMs: A.r2_calib_start_ms, stable: st });
    const name = `${c.method === 'r2' ? '(a) round-2 고정 auto' : '(b) R11 탭마다 autoNow'} · 보정한 사람 σ${c.sd} · Δ ${c.delta}${c.jump !== A.jump_at_ms ? ` · 보정 중 ${c.jump} ms 에 바뀜` : ''}`;
    const res = {};
    const row = [];
    for (const L of compiled) {
      const r = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: 200, sessions: SESS / 2, seed: 555, sessionBias: fn });
      res[L.level.id] = r.median_first_clear_sessions;
      row.push(r.median_first_clear_sessions);
    }
    report.auto_shift[name] = res;
    c.res = res;
    log(`${name} | ${row.join(' | ')}`);
  }
  const key = (c) => compiled.map((L) => c.res[L.level.id]).join(',');
  for (const sd of A.tappers_sd_ms) {
    const z = rows.find((c) => c.sd === sd && c.method === 'r11' && c.delta === 0);
    for (const c of rows.filter((x) => x.sd === sd && x.method === 'r11' && x.delta !== 0)) {
      const same = key(c) === key(z);
      log(`  정보 R17 σ${sd} (b) Δ ${c.delta}${c.jump !== A.jump_at_ms ? `(보정 중 ${c.jump} ms)` : ''} = Δ 0: ${same ? '같음' : '다름(!)'} (L1 ${c.res['01']} / ${z.res['01']}, L10 ${c.res['10']} / ${z.res['10']})`);
      (report.auto_shift_same ||= {})[`sd${sd}_d${c.delta}_j${c.jump}`] = same;
    }
    const a64 = rows.find((c) => c.sd === sd && c.method === 'r2' && c.delta !== 0);
    const over = compiled.filter((L) => a64.res[L.level.id] > V.child_sd70_median_max_all).map((L) => 'L' + L.level.id);
    log(`  정보 R17 σ${sd} (a) Δ ${a64.delta}: L1 ${a64.res['01']}회(한도 ${V.l1_child_sd70_median_max}) · 30회 넘는 레벨 ${over.join(',') || '없음'}`);
    for (const c of rows.filter((x) => x.sd === sd && x.method === 'r2' && x.r3)) {
      const ov = compiled.filter((L) => c.res[L.level.id] > V.child_sd70_median_max_all).map((L) => 'L' + L.level.id);
      log(`  정보 R17 σ${sd} (a) Δ ${c.delta} (round-3 추가${c.delta < 0 ? ', 음의 Δ: 보정 뒤 자동 지연이 줄어듦 → 이른 쪽 남은 오차' : ''}): L1 ${c.res['01']}회 · 30회 넘는 레벨 ${ov.join(',') || '없음'}`);
    }
  }
  const gRow = report.calibration['[1-3] 보호자 보정(어른 σ40, 2회 12탭)'];
  const z40 = rows.find((c) => c.sd === 40 && c.method === 'r11' && c.delta === 0);
  log(`  정보 R17 (b) σ40 Δ 0 = 위 "[1-3] 보호자 보정(어른 σ40)" 행: ${key(z40) === compiled.map((L) => gRow[L.level.id]).join(',') ? '같음' : '다름(모델 차이 확인)'}`);
  // 안정 대기 시각과 재시작 흐름
  const waits = [100, 200, 300, 450].map((j) => [j, stableWaitMs(st, { deltaMs: 64, jumpAtMs: j, stableMs: A.stable_auto_ms }), stableWaitMs({ ...st, min_since_unlock_ms: 0 }, { deltaMs: 64, jumpAtMs: j, stableMs: A.stable_auto_ms })]);
  log(`  정보 R17 안정 대기(창 ${st.window_ms} ms·변화 ≤ ${st.max_change_ms} ms·잠금 해제 뒤 ≥ ${st.min_since_unlock_ms} ms·최대 ${st.max_wait_ms} ms, 매 프레임): ` + waits.map(([j, w, w0]) => `바뀜 ${j} ms → 시작 ${w.t.toFixed(0)} ms(값 ${w.v}${w.stable ? '' : ', 시간 초과'}${w.v !== A.stable_auto_ms ? ', 바뀌기 전 값 → 탭마다 다시 읽기로 막음' : ''}) [최소 시간 없으면 ${w0.t.toFixed(0)} ms·값 ${w0.v}${w0.v !== A.stable_auto_ms ? ' 바뀌기 전 값(!)' : ''}]`).join(' · '));
  const firstFail = Math.min(...compiled.map((L) => L.stars[0].t - L.judge.pass_early_ms - L.judge.miss_zone_ms));
  const rs = bal.restart.restart_delay_s * 1000, [lo, hi] = bal.restart.allowed_range_s.map((x) => x * 1000);
  log(`  정보 R17 재시작: 가장 이른 실패(첫 별 놓침 구역 시작) 시도 시작 뒤 ${firstFail.toFixed(0)} ms → 가장 이른 재시작 ${(firstFail + rs).toFixed(0)} ms > 최대 대기 ${st.max_wait_ms} ms ${firstFail + rs > st.max_wait_ms ? '(재시작은 안정 대기 안 함)' : '(!)'} · 시도 사이 다시 읽기로 comp 가 dc 바뀔 때 재시작 시각을 같이 옮기면 ${rs} ms, 안 옮기면 ${rs} + dc: ` + [0, 64, 150].map((dc) => `dc ${dc} → ${rs + dc} ms ${rs + dc >= lo && rs + dc <= hi ? '허용 안' : '허용 밖(!)'}`).join(' · '));
  // 빌드 calib.js 에 R11 정의가 있으면 비교 (정보, 다음 dev 빌드부터)
  const buildCalib = resolve(PROJECT, '..', '..', 'games', 'rhythm-01', 'js', 'calib.js');
  if (existsSync(buildCalib)) {
    const bc = await import(pathToFileURL(buildCalib).href);
    if (typeof bc.autoStableAt !== 'function' || typeof bc.calibTapDiffR11 !== 'function') log('  정보 C2 빌드 calib.js 에 R11 함수(autoStableAt·calibTapDiffR11) 없음 → round-2 빌드, 비교 생략');
    else {
      const rng = makeRng(77);
      let diff = 0;
      for (let k = 0; k < 2000; k++) {
        const tap = 1000 + rng.rnd() * 20000, an = rng.rnd() * 250, base = 600 + rng.rnd() * 900, beat = 600;
        if (JSON.stringify(bc.calibTapDiffR11(tap, an, base, beat)) !== JSON.stringify(simCalib.calibTapDiffR11(tap, an, base, beat))) diff++;
        const j = rng.rnd() * 1600, dl = rng.rnd() * 120, rd2 = [];
        for (let t = 0; t <= 1520; t += 1000 / 60) rd2.push({ t, v: t < j ? 66 - dl : 66 });
        if (JSON.stringify(bc.autoStableAt(rd2, st)) !== JSON.stringify(simCalib.autoStableAt(rd2, st))) diff++;
      }
      log(`  정보 C2 R11 정의 빌드 = 시뮬레이터: 무작위 2000묶음 다름 ${diff}건`);
    }
  }
}

// 정보 R17b (round-3, rhythm-02 인사이트): 보정 무시 구간 경계값을 남은 오차로 (이른 −, 늦은 +), 처음 보는 무늬 비용 포함
{
  const bnd = V.calibration_boundary_residual_ms || [];
  if (bnd.length) {
    const g = bal.audio_latency.guardian_calibration;
    log(`\n== 정보 R17b: 보호자 보정 무시 구간(|m| ≤ ${g.apply_only_if_abs_over_ms} ms 면 적용 안 함) 경계값을 남은 오차로 고정 — σ70 첫 클리어 정수 중앙값 (연속), 처음 보는 무늬 비용 포함 세션 ${Math.round(NSESS / 4)}개 ==`);
    log('남은 오차 ms | ' + compiled.map((L) => 'L' + L.level.id).join(' | ') + ' | 30회 한도 · 직전 2배');
    report.boundary_residual = {};
    for (const bias of [0, ...bnd]) {
      const row = [], ints = [];
      for (const L of compiled) {
        const r = runNoveltySessions(L, bal.bots.profiles.child_sd70, bal, { sessions: Math.round(NSESS / 4), bias, seed: 6060 });
        row.push(`${r.median_first_clear_sessions} (${r.median_first_clear_continuous})`);
        ints.push(r.median_first_clear_sessions);
        (report.boundary_residual[bias] ||= {})[L.level.id] = r.median_first_clear_continuous;
      }
      const over = ints.filter((x) => x > V.child_sd70_median_max_all).length;
      const grow = ints.slice(1).filter((x, k) => x > V.child_sd70_median_max_growth_vs_prev * ints[k]).length;
      log(`${bias > 0 ? '+' : ''}${bias} | ${row.join(' | ')} | 30회 넘음 ${over}레벨 · 2배 넘음 ${grow}곳${bias ? '' : ' (기준)'}`);
    }
  }
}

// 정보 R23 (round-3 1-2): 무시 구간 하한 30 → 10 ms. 측정 잡음이 남은 오차를 키우지 않는지, L7~L10 30회 한도
{
  const R = V.r23_calibration_noise;
  if (R) {
    const g0 = bal.audio_latency.guardian_calibration;
    const S = QUICK ? Math.round(R.sessions / 4) : R.sessions;
    const lv = compiled.filter((L) => R.levels.includes(L.level.id));
    log(`
== 정보 R23: 보호자 보정 측정 잡음(σ${R.tapper_sd_ms}, ${g0.rounds}회 × ${g0.taps_per_round}탭, ${g0.use_from_tap}번째부터 사용) — 기기 남은 오차 d 고정, 무시 구간별 남은 오차와 σ70 첫 클리어 정수 중앙값 (연속), 처음 보는 무늬 비용 포함 세션 ${S}개 (지금 값 ${g0.apply_only_if_abs_over_ms} ms) ==`);
    log('무시 구간 ms | d ms | 남은 오차 평균 |r| | |r| > |d| 비율 | 이른 쪽 r < −12 비율 | ' + lv.map((L) => 'L' + L.level.id).join(' | ') + ' | 30회 넘음');
    report.r23 = {};
    let worstNew = 0;
    for (const thr of R.thresholds_ms) {
      const g = { ...g0, apply_only_if_abs_over_ms: thr };
      for (const d of R.fixed_device_residual_ms) {
        const fn = guardianCalibrationBias(bal.audio_latency.calibration, g, { device: [d, d], sd: R.tapper_sd_ms });
        const rng = makeRng(9090); const rs = [];
        for (let k = 0; k < 20000; k++) rs.push(fn(rng));
        const mabs = rs.reduce((a, x) => a + Math.abs(x), 0) / rs.length;
        const worse = rs.filter((x) => Math.abs(x) > Math.abs(d) + 1e-9).length / rs.length;
        const early12 = rs.filter((x) => x < -12).length / rs.length;
        const row = lv.map((L) => runNoveltySessions(L, bal.bots.profiles.child_sd70, bal, { sessions: S, seed: 6161, sessionBias: guardianCalibrationBias(bal.audio_latency.calibration, g, { device: [d, d], sd: R.tapper_sd_ms }) }));
        const over = row.filter((r) => r.median_first_clear_sessions > V.child_sd70_median_max_all).length;
        if (thr === g0.apply_only_if_abs_over_ms) worstNew = Math.max(worstNew, ...row.map((r) => r.median_first_clear_sessions));
        (report.r23[thr] ||= {})[d] = { mean_abs_residual_ms: +mabs.toFixed(1), worse_share: +worse.toFixed(3), early_below_minus12_share: +early12.toFixed(3), sd70: Object.fromEntries(row.map((r, k) => [lv[k].level.id, r.median_first_clear_continuous])) };
        log(`${thr}${thr === g0.apply_only_if_abs_over_ms ? '(지금)' : '(옛)'} | ${d > 0 ? '+' : ''}${d} | ${mabs.toFixed(1)} | ${worse.toFixed(3)} | ${early12.toFixed(3)} | ${row.map((r) => `${r.median_first_clear_sessions} (${r.median_first_clear_continuous})`).join(' | ')} | ${over}레벨`);
      }
    }
    log(`  정보 R23 지금 값 ${g0.apply_only_if_abs_over_ms} ms: 모든 d 에서 L${R.levels[0]}~L${R.levels[R.levels.length - 1]} 최대 ${worstNew}회 ${worstNew <= V.child_sd70_median_max_all ? '≤' : '>'} ${V.child_sd70_median_max_all}회 한도${worstNew <= V.child_sd70_median_max_all ? '' : '(!)'}`);
  }
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

// 정보: 따라 치기 변형 — round-3 폐기(보여 주기 마디 없음)
log('\n== 정보: 보여 주기 마디에서 같이 치는 아이 (along) — 폐기(round-3 R18, 보여 주기 마디 없음) ==');

// 정보: 연습 모드 (R21: 체크포인트 = 숨 고르기 틈 시작, 부활 때만 카운트인)
log('\n== 정보: 연습 모드(R21 숨 고르기 틈 체크포인트) 끝까지 총 시도 수 중앙값 (90 %), 부활 → 다음 별 최대 ms ==');
report.practice = {};
for (const L of compiled) {
  const row = [];
  const cps = L.level.practice.checkpoints;
  const cpMs = cps.map((c) => beatToMs(L, c.beat));
  for (const pn of ['novice_sd50', 'child_sd70', 'child_sd90']) {
    const r = runPracticeV3(L, bal.bots.profiles[pn], bal, cpMs, { sessions: SESS / 2 });
    (report.practice[L.level.id] ||= {})[pn] = r;
    row.push(`${pn} ${r.median_total_attempts} (${r.p90_total_attempts})`);
  }
  const revive = Math.max(...cps.map((c) => bal.restart.restart_delay_s * 1000 + bal.path_v3.practice.revive_count_in_bars * L.barMs + (c.next_star_beat - c.beat) * L.beatMs));
  report.practice[L.level.id].revive_to_next_star_max_ms = +revive.toFixed(0);
  log(`L${L.level.id} 체크포인트 ${cps.length}곳(박 ${cps.map((c) => c.beat).join(',')}) · 구간 ${report.practice[L.level.id].child_sd70.segments}개 · ${row.join(' · ')} · 부활 → 다음 별 최대 ${f0(revive)} ms`);
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
