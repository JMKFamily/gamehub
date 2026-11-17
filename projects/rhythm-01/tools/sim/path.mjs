#!/usr/bin/env node
// rhythm-01 round-3 "북길" 레벨 스키마 v3 (20-balance.md 17장, 오케스트레이터 R18~R22)
//
// 레벨의 원본은 levels/*.json 의 path.chunks (덩어리 목록, 시도마다 고정 = N10).
//   chunk = { shape: 덩어리 모양 id (balance.json path_v3.chunk_library), empty_before: 앞 덩어리 마지막 별 뒤 빈 박 수 }
//   첫 덩어리의 empty_before = 레벨 박 0(카운트인 다음 첫 박)부터 첫 별까지 박 수.
//   빈 박 수 = 다음 첫 별 박 − floor(앞 마지막 별 박) − 1  (덩어리는 늘 정박에서 시작. 3.5박에 끝나고 빈 1박이면 다음은 5박)
// 이 모듈이 path.chunks 에서 파생 키를 만든다: bars(play/rest 만, judge.mjs compileLevel 그대로 읽음), patterns(마디 내용 id → 자리),
//   length_bars, duration_s, sections(음악 단계), practice.checkpoints(R21 숨 고르기 틈 시작), cues(L1 손가락).
// 그래서 tools/sim/judge.mjs·빌드 js/judge.js 는 바꾸지 않아도 된다(보여 주기 마디가 없을 뿐).
//
// 사용: node tools/sim/path.mjs --write   # levels/*.json 의 파생 키를 path.chunks 에서 다시 씀
//       node tools/sim/path.mjs           # 파생 키가 path.chunks 와 같은지만 확인

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..', '..');
const EPS = 1e-9;

export const contentId = (slots) => 'c' + slots.join('');

// 덩어리 배치: 절대 박(레벨 박 0 = 카운트인 다음 첫 박)
export function layoutChunks(lvl, bal) {
  const lib = bal.path_v3.chunk_library;
  const out = [];
  let prevLast = null;
  lvl.path.chunks.forEach((c, k) => {
    const sh = lib[c.shape];
    if (!sh) throw new Error(`레벨 ${lvl.id} 덩어리 ${k}: 없는 모양 ${c.shape}`);
    const beat = prevLast === null ? c.empty_before : Math.floor(prevLast + EPS) + 1 + c.empty_before;
    const stars = sh.slots.map((s) => beat + s / 2);
    out.push({ k, shape: c.shape, gimmick: sh.gimmick, beat, stars, first: stars[0], last: stars[stars.length - 1], empty_before: c.empty_before, offset: beat % 4 });
    prevLast = stars[stars.length - 1];
  });
  out.forEach((c, k) => { c.empty_after = k + 1 < out.length ? out[k + 1].empty_before : null; });
  return out;
}

// 파생 키 (빌드·judge.mjs 가 읽는 v2 호환 부분 + v3 연습·단계)
export function deriveLevel(lvl, bal) {
  const P = bal.path_v3;
  const chunks = layoutChunks(lvl, bal);
  const bpb = lvl.beats_per_bar;
  const allStars = chunks.flatMap((c) => c.stars.map((b) => ({ b, k: c.k })));
  const lastBar = Math.floor(allStars[allStars.length - 1].b / bpb + EPS);
  const lengthBars = lastBar + 1 + P.outro_bars;
  const bars = [], patterns = {};
  for (let i = 0; i < lengthBars; i++) {
    const slots = allStars.filter((s) => Math.floor(s.b / bpb + EPS) === i).map((s) => Math.round((s.b - i * bpb) * 2));
    if (!slots.length) { bars.push({ mode: 'rest' }); continue; }
    const id = contentId(slots);
    patterns[id] = { slots };
    bars.push({ mode: 'play', pattern: id });
  }
  const beatMs = 60000 / lvl.bpm;
  const durationS = +(((lvl.count_in_bars + lengthBars) * bpb * beatMs) / 1000).toFixed(3);
  // 음악 단계(art): 판정 별을 셋으로 나눈 첫 별의 마디, 그리고 outro
  const n = allStars.length;
  const stageBar = (q) => Math.floor(allStars[Math.min(n - 1, Math.floor(q * n))].b / bpb + EPS);
  const sections = [
    { name: 'part1', start_bar: 0, stage: 1 },
    { name: 'part2', start_bar: stageBar(1 / 3), stage: 2 },
    { name: 'part3', start_bar: stageBar(2 / 3), stage: 3 },
    { name: 'outro', start_bar: lastBar + 1, stage: 3 },
  ];
  // R21 연습 체크포인트 = 숨 고르기 틈(빈 박 ≥ breath_min_beats) 시작 = 앞 덩어리 마지막 별 다음 정박
  const checkpoints = [];
  chunks.forEach((c, k) => {
    if (k === 0 || c.empty_before < P.breath_beats[0]) return;
    const beat = Math.floor(chunks[k - 1].last + EPS) + 1;
    const bar = Math.floor(beat / bpb + EPS);
    checkpoints.push({ beat, bar, slot: Math.round((beat - bar * bpb) * 2), empty_beats: c.empty_before, next_chunk: k, next_star_beat: c.first });
  });
  const out = { length_bars: lengthBars, duration_s: durationS, patterns, bars, sections, practice: { checkpoint_rule: P.practice.checkpoint_rule, checkpoints } };
  if (lvl.id === '01') {
    const f = allStars[0].b, bar = Math.floor(f / bpb + EPS);
    const tc = bal.tutorial_cue;
    out.cues = [{ key: tc.key, bar, slot: Math.round((f - bar * bpb) * 2), show_from_beats_before: tc.show_from_beats_before, press_from_beats_before: tc.press_from_beats_before, hide_after: tc.hide_after, _note: '첫 판정 별 1박 전에 나타나 0.25박 전부터 누름(통과 창 안). 북채가 없어 다른 신호와 겹칠 것이 없음(검증 T1: 손가락 구간 ∩ 다음 별 위험 구간 = 0)' }];
  }
  return { chunks, derived: out };
}

const DERIVED_KEYS = ['length_bars', 'duration_s', 'patterns', 'bars', 'sections', 'practice'];
export function derivedMismatch(lvl, bal) {
  const { derived } = deriveLevel(lvl, bal);
  const bad = [];
  for (const k of [...DERIVED_KEYS, ...(derived.cues ? ['cues'] : [])]) {
    const a = JSON.stringify(stripNotes(lvl[k])), b = JSON.stringify(stripNotes(derived[k]));
    if (a !== b) bad.push(k);
  }
  return bad;
}
function stripNotes(v) {
  if (Array.isArray(v)) return v.map(stripNotes);
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) if (!k.startsWith('_')) o[k] = stripNotes(x); return o; }
  return v;
}

// 박 → 레벨 시간 ms (레벨 시간 0 = 카운트인 첫 박, judge.mjs 와 같음)
export const beatToMs = (L, beat) => (L.countInBars * L.beatsPerBar + beat) * L.beatMs;

// 미리 보기 (R19): 별이 오른쪽 끝에 나타나 판정 북 중심에 닿을 때까지 = lead 박
export function previewInfo(lvl, L, bal) {
  const pv = lvl.path;
  const res = {};
  for (const [o, key] of [['landscape', 'preview_lead_beats'], ['portrait', 'preview_lead_beats_portrait']]) {
    const lead = pv[key];
    const previewMs = lead * L.beatMs;
    res[o] = { lead_beats: lead, preview_ms: previewMs, decide_ms: previewMs - L.judge.pass_early_ms };
  }
  return res;
}

// 한 화면에 보이는 덩어리 수 (N9): 시각 t 에 읽는 영역(북 오른쪽) = 별 시각 ∈ (t, t + lead]
export function maxScreenChunks(chunks, leadBeats) {
  const stars = chunks.flatMap((c) => c.stars.map((b) => ({ b, k: c.k })));
  let best = 0, at = null;
  for (const s of stars) {
    const t = s.b - leadBeats; // s 가 막 들어오는 순간
    const vis = new Set(stars.filter((x) => x.b > t + EPS && x.b <= s.b + EPS).map((x) => x.k));
    if (vis.size > best) { best = vis.size; at = s.b; }
  }
  return { max: best, at_beat: at };
}

// 마디 내용 열 (N1~N4·N6): 별이 있는 마디만
export function judgedBars(lvl) {
  return lvl.bars.map((b, i) => ({ i, id: b.mode === 'play' ? b.pattern : null })).filter((x) => x.id);
}

// 덩어리 하나 비용 = 그 덩어리 별들의 σ70 위험률(hazard) 합
export function chunkCosts(chunks, L, hazards) {
  return chunks.map((c) => {
    const idx = c.stars.map((b) => L.stars.findIndex((s) => Math.abs(s.t - beatToMs(L, b)) < 1e-6));
    return idx.reduce((a, i) => a + (hazards[i] || 0), 0);
  });
}

// N1~N11 검사. 결과 [{code, ok, msg}]
export function nChecks(lvl, L, bal, { hazards } = {}) {
  const P = bal.path_v3, R = P.rules;
  const early = +lvl.id <= R.early_levels_through;
  const out = [];
  const push = (code, ok, msg) => out.push({ code, ok: !!ok, msg });
  const chunks = layoutChunks(lvl, bal);
  const jb = judgedBars(lvl);
  const ids = jb.map((x) => x.id);

  // N1 바로 이어서 같은 마디 내용 금지
  const n1 = [];
  for (let k = 1; k < jb.length; k++) if (jb[k].id === jb[k - 1].id) n1.push(`마디 ${jb[k - 1].i}→${jb[k].i} ${jb[k].id}`);
  push('N1', !n1.length, n1.length ? `바로 이어진 같은 마디 내용: ${n1}` : `판정 마디 ${jb.length}개, 바로 이어진 같은 내용 없음`);

  // N2 재등장 간격
  const minDist = early ? R.n2_min_bar_distance_early : R.n2_min_bar_distance_late;
  let worst = Infinity, wAt = '';
  const lastAt = {};
  for (const x of jb) { if (x.id in lastAt) { const d = x.i - lastAt[x.id]; if (d < worst) { worst = d; wAt = `${x.id} 마디 ${lastAt[x.id]}→${x.i}`; } } lastAt[x.id] = x.i; }
  push('N2', worst >= minDist, worst === Infinity ? `재등장 없음 (한도 ${minDist}마디)` : `같은 내용 재등장 최소 ${worst}마디 (${wAt}) ≥ ${minDist}`);

  // N3 같은 두 마디 연쇄 재등장 금지 (마디 i, i+1 이 둘 다 판정 마디일 때)
  const pairs = new Map(); const n3 = [];
  for (let k = 1; k < jb.length; k++) {
    if (jb[k].i !== jb[k - 1].i + 1) continue;
    const key = jb[k - 1].id + '>' + jb[k].id;
    if (pairs.has(key)) n3.push(`${key} (마디 ${pairs.get(key)}, ${jb[k - 1].i})`); else pairs.set(key, jb[k - 1].i);
  }
  push('N3', !n3.length, n3.length ? `반복된 두 마디 연쇄: ${n3}` : `두 마디 연쇄 ${pairs.size}가지 모두 한 번씩`);

  // N4 최대 횟수 / 서로 다른 내용 비율
  const cnt = {}; ids.forEach((id) => { cnt[id] = (cnt[id] || 0) + 1; });
  const maxCnt = Math.max(...Object.values(cnt));
  const ratio = Object.keys(cnt).length / ids.length;
  const minRatio = early ? R.n4_min_distinct_ratio_early : R.n4_min_distinct_ratio_late;
  push('N4', maxCnt <= R.n4_max_same_content && ratio >= minRatio - EPS, `마디 내용 ${Object.keys(cnt).length}가지 / 판정 마디 ${ids.length} = ${(100 * ratio).toFixed(0)} % ≥ ${100 * minRatio} %, 한 내용 최대 ${maxCnt}회 ≤ ${R.n4_max_same_content}`);

  // N5 아는 덩어리 재등장은 시작 박·앞뒤 이웃·쉼 길이 중 하나 이상 다름 = 서명 (모양, 마디 안 시작 박, 앞 모양, 뒤 모양, 앞 쉼, 뒤 쉼) 이 겹치지 않음
  const sig = new Map(); const n5 = [];
  chunks.forEach((c, k) => {
    const s = [c.shape, c.offset, chunks[k - 1]?.shape ?? '^', chunks[k + 1]?.shape ?? '$', c.empty_before, c.empty_after ?? '$'].join('|');
    if (sig.has(s)) n5.push(`덩어리 ${sig.get(s)}·${k} (${c.shape})`); else sig.set(s, k);
  });
  const shapeRepeats = chunks.length - new Set(chunks.map((c) => c.shape)).size;
  push('N5', !n5.length, n5.length ? `같은 서명으로 다시 나온 덩어리: ${n5}` : `덩어리 ${chunks.length}개(모양 재등장 ${shapeRepeats}번) 모두 시작 박·이웃·쉼 중 하나 이상 다름`);

  // N6 앞 2/3 동안 새 마디 내용 등장 간격 ≤ 16박(4마디)
  {
    const span0 = jb[0].i, span1 = jb[jb.length - 1].i;
    const cut = span0 + (2 / 3) * (span1 - span0);
    const seen = new Set(); const firsts = [];
    for (const x of jb) if (!seen.has(x.id)) { seen.add(x.id); firsts.push(x.i); }
    const inCut = firsts.filter((i) => i <= cut + EPS);
    let maxGapBars = 0;
    for (let k = 1; k < inCut.length; k++) maxGapBars = Math.max(maxGapBars, inCut[k] - inCut[k - 1]);
    // 앞 2/3 끝까지 새 내용 없이 지나간 구간도 봄
    maxGapBars = Math.max(maxGapBars, Math.floor(cut) - inCut[inCut.length - 1]);
    const lim = R.n6_max_beats_between_new / lvl.beats_per_bar;
    push('N6', maxGapBars <= lim, `앞 2/3(마디 ${span0}~${cut.toFixed(1)}) 새 마디 내용 ${inCut.length}개, 최대 간격 ${maxGapBars}마디 = ${maxGapBars * lvl.beats_per_bar}박 ≤ ${R.n6_max_beats_between_new}박`);
  }

  // N7 새 기믹 ≤ 1, 도입 3단계, 아직 안 배운 기믹을 쓰지 않음
  {
    const intro = P.gimmick_intro;
    const lvNum = +lvl.id;
    const bad = [];
    chunks.forEach((c, k) => {
      if (+intro[c.gimmick] > lvNum) bad.push(`덩어리 ${k} ${c.shape}(${c.gimmick}, L${+intro[c.gimmick]})`);
      if (k > 0 && c.empty_before === 1 && +intro.rest_beat > lvNum) bad.push(`덩어리 ${k} 앞 빈 1박(rest_beat, L${+intro.rest_beat})`);
    });
    const introducedHere = Object.entries(intro).filter(([, v]) => +v === lvNum).map(([g]) => g);
    const g = lvl.new_gimmicks || [];
    const declOk = g.length <= 1 && introducedHere.join() === g.map((x) => x.id).join();
    let stage = '새 기믹 없음';
    let stOk = true;
    if (g.length === 1) {
      const gm = g[0], spec = P.gimmicks[gm.id];
      // 기믹 한 번 = 모양 기믹이면 그 모양 덩어리, 쉼 기믹이면 빈 1박으로 이어진 덩어리 둘(앞·뒤)
      let inst;
      if (spec.kind === 'gap') inst = chunks.map((c, k) => (k > 0 && c.empty_before === spec.empty_beats ? { a: k - 1, b: k } : null)).filter(Boolean);
      else inst = chunks.map((c, k) => (spec.shapes.includes(c.shape) ? { a: k, b: k } : null)).filter(Boolean);
      const startOf = (x) => chunks[x.a].beat, endOf = (x) => chunks[x.b].last;
      const s1 = inst[0];
      const before = s1 ? (s1.a === 0 ? lvl.count_in_bars * lvl.beats_per_bar + chunks[0].empty_before : chunks[s1.a].empty_before) : 0;
      const after = s1 ? (chunks[s1.b].empty_after ?? Infinity) : 0;
      const ok1 = !!s1 && before >= R.n7_safe_empty_beats && after >= R.n7_safe_empty_beats;
      const s2 = inst[1];
      const ok2 = !!s2 && startOf(s2) - endOf(s1) <= R.n7_second_within_beats + EPS && chunks[s2.a].offset !== chunks[s1.a].offset;
      let ok3 = true, s3txt = '핵심 규칙이라 조합 단계 없음';
      if (spec.kind !== 'core') {
        const mid = (chunks[0].first + chunks[chunks.length - 1].last) / 2;
        // 조합 = 레벨 후반의 기믹 한 번이 빈 ≤ n7_combo_max_empty_beats 박으로 아는(기믹 아닌) 덩어리와 붙음 (쉼 기믹은 덩어리 셋 이상 이어진 구절)
        const isGimChunk = (k) => spec.kind === 'shape' && spec.shapes.includes(chunks[k].shape);
        const maxE = R.n7_combo_max_empty_beats;
        const combo = inst.find((x) => startOf(x) >= mid - EPS && (
          (x.a > 0 && chunks[x.a].empty_before <= maxE && !isGimChunk(x.a - 1)) ||
          (x.b + 1 < chunks.length && chunks[x.b].empty_after <= maxE && !isGimChunk(x.b + 1))));
        ok3 = !!combo;
        s3txt = combo ? `후반 조합 덩어리 ${combo.a}${combo.b !== combo.a ? '~' + combo.b : ''} (${startOf(combo)}박, 이웃과 빈 ≤ ${R.n7_combo_max_empty_beats}박)` : '후반 조합 없음(!)';
      }
      stOk = ok1 && ok2 && ok3;
      stage = `${gm.id}: ①안전한 첫 등장 덩어리 ${s1 ? s1.a + (s1.b !== s1.a ? '~' + s1.b : '') : '-'} 앞 ${before}·뒤 ${after}박 비움(≥ ${R.n7_safe_empty_beats}) ${ok1 ? '예' : '아님(!)'} · ②${s2 ? `${startOf(s2) - endOf(s1)}박 뒤 다른 시작 박(${chunks[s1.a].offset}→${chunks[s2.a].offset})` : '없음'} ${ok2 ? '예' : '아님(!)'} · ③${s3txt}`;
    }
    push('N7', !bad.length && declOk && stOk, `${bad.length ? `안 배운 기믹: ${bad} · ` : ''}이 레벨 처음 기믹 ${introducedHere.join(',') || '없음'} = 선언 ${g.map((x) => x.id).join(',') || '없음'} ${declOk ? '' : '(!)'} · ${stage}`);
  }

  // N8 숨 고르기: 빈 박 1~4, 비싼 덩어리 뒤 ≥ 2박, 가장 어려운 덩어리는 3곳 이상에 나눔
  {
    const gaps = chunks.slice(1).map((c) => c.empty_before);
    const rangeOk = gaps.every((g) => g >= 1 && g <= P.breath_beats[1]);
    let costTxt = '비용 없음(봇 미실행)', costOk = true;
    if (hazards) {
      const cost = chunkCosts(chunks, L, hazards);
      const order = cost.map((c, k) => [c, k]).filter(([, k]) => k < chunks.length - 1).sort((a, b) => b[0] - a[0]);
      const top = order.slice(0, Math.max(1, Math.ceil(order.length * R.n8_top_cost_share)));
      const noBreath = top.filter(([, k]) => chunks[k].empty_after < P.breath_beats[0]).map(([, k]) => k);
      const mx = Math.max(...cost);
      const hard = cost.map((c, k) => [c, k]).filter(([c]) => c >= R.n8_hardest_ratio * mx).map(([, k]) => k);
      let spread = 0, lastK = -9;
      for (const k of hard) if (k - lastK >= 2) { spread++; lastK = k; }
      costOk = !noBreath.length && spread >= R.n8_hardest_min_places;
      costTxt = `비용 상위 ${top.length}개 뒤 숨 고르기(≥ ${P.breath_beats[0]}박) ${noBreath.length ? `없음: 덩어리 ${noBreath}(!)` : '모두 있음'} · 가장 비싼 덩어리(${mx.toFixed(3)})의 ${100 * R.n8_hardest_ratio} % 이상 ${hard.length}개, 떨어진 곳 ${spread}곳 ≥ ${R.n8_hardest_min_places}`;
    }
    const four = gaps.filter((g) => g === 4).length;
    push('N8', rangeOk && costOk, `덩어리 사이 빈 박 ${Math.min(...gaps)}~${Math.max(...gaps)} (허용 1~${P.breath_beats[1]}) · 숨 고르기(≥ ${P.breath_beats[0]}박) ${gaps.filter((g) => g >= P.breath_beats[0]).length}/${gaps.length}곳, 4박 ${four}곳 · ${costTxt}`);
  }

  // N9 한 화면 덩어리 수 (가로·세로 미리 보기 둘 다)
  {
    const lim = lvl.path.screen_chunks_max;
    const limRule = early ? R.n9_max_screen_chunks_early : R.n9_max_screen_chunks_late;
    const a = maxScreenChunks(chunks, lvl.path.preview_lead_beats), b = maxScreenChunks(chunks, lvl.path.preview_lead_beats_portrait);
    push('N9', a.max <= lim && b.max <= lim && lim <= limRule, `한 화면 덩어리 최대: 가로(${lvl.path.preview_lead_beats}박) ${a.max} (${a.at_beat}박) · 세로(${lvl.path.preview_lead_beats_portrait}박) ${b.max} ≤ 레벨 값 ${lim} ≤ 규칙 ${limRule}`);
  }

  // N10 배치 고정: 무작위 키 없음, 파생 키 = path.chunks
  {
    const txt = JSON.stringify(lvl);
    const rnd = /"(random|seed|shuffle)[a-z_]*"\s*:/i.test(txt);
    const mis = derivedMismatch(lvl, bal);
    push('N10', !rnd && !mis.length, `무작위 키 ${rnd ? '있음(!)' : '없음'} · 파생 키(bars·patterns·sections·practice·길이) = path.chunks ${mis.length ? `다름: ${mis}(!) → node tools/sim/path.mjs --write` : '같음'}`);
  }

  // N11 붙은 별 예산
  {
    const B = P.continuous_budget[lvl.id] || {};
    const has = (c, g) => P.chunk_library[c.shape].tags.includes(g);
    const n = { pair: chunks.filter((c) => has(c, 'pair')).length, run3: chunks.filter((c) => has(c, 'run3')).length, run4: chunks.filter((c) => has(c, 'run4')).length };
    const over = Object.entries(n).filter(([g, v]) => v > (B[g] ?? 0)).map(([g, v]) => `${g} ${v} > ${B[g] ?? 0}`);
    const after4 = chunks.filter((c, k) => has(c, 'run4') && k < chunks.length - 1 && c.empty_after < R.n11_after_run4_min_empty_beats).map((c) => c.k);
    push('N11', !over.length && !after4.length, `붙은 별 덩어리: 반박 쌍 포함 ${n.pair}/${B.pair ?? 0} · 3연속 ${n.run3}/${B.run3 ?? 0} · 4연속 ${n.run4}/${B.run4 ?? 0}${over.length ? ` 초과 ${over}(!)` : ''} · 4연속 뒤 빈 ≥ ${R.n11_after_run4_min_empty_beats}박 ${after4.length ? `아님: ${after4}(!)` : '예'}`);
  }
  return out;
}

// 콤보 (R22 → 공통 문서 harness/benchmarks/djmax-judgement.md 4-2 확정): 판정 결과에서만 파생, 판정에 영향 없음
//   rule 'success_count'  : 성공 판정(딱·좋아·통과)마다 +1, 실패에서만 끊김 → 끝 값 = grades.length
//   rule 'good_or_better' : (R22 예비안, 비채택 기록) 좋아 이상 연속, 통과에서 0
export function comboTrace(result, rule = 'success_count') {
  let c = 0, max = 0, breaks = 0;
  const trace = [];
  for (const g of result.grades) {
    if (rule === 'good_or_better' && g.grade === 'pass') { if (c > 0) breaks++; c = 0; } else c++;
    max = Math.max(max, c);
    trace.push(c);
  }
  return { final: c, max, breaks, trace };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
  const write = process.argv.includes('--write');
  for (const f of bal.levels) {
    const file = join(PROJECT, f);
    const lvl = JSON.parse(readFileSync(file, 'utf8'));
    if (lvl.schema_version !== 3) { console.log(`${f}: v${lvl.schema_version} (건너뜀)`); continue; }
    const { derived } = deriveLevel(lvl, bal);
    const mis = derivedMismatch(lvl, bal);
    if (write && mis.length) {
      Object.assign(lvl, derived);
      writeFileSync(file, formatLevel(lvl));
    }
    console.log(`${f}: ${mis.length ? (write ? '다시 씀 ' : '다름 ') + mis.join(',') : '같음'}`);
  }
}

// 레벨 JSON 쓰기 형식: 2칸 들여쓰기, bars·chunks 는 한 줄에 하나
export function formatLevel(lvl) {
  let s = JSON.stringify(lvl, null, 2);
  s = s.replace(/\{\n\s+"mode": "(\w+)"(?:,\n\s+"pattern": "(\w+)")?\n\s+\}/g, (m, mode, p) => (p ? `{"mode":"${mode}","pattern":"${p}"}` : `{"mode":"${mode}"}`));
  s = s.replace(/\{\n\s+"shape": "(\w+)",\n\s+"empty_before": (\d+)\n\s+\}/g, (m, sh, e) => `{"shape":"${sh}","empty_before":${e}}`);
  s = s.replace(/"slots": \[\n([\s\d,]+)\n\s+\]/g, (m, body) => `"slots": [${body.split(',').map((x) => x.trim()).join(',')}]`);
  return s + '\n';
}
