#!/usr/bin/env node
// rhythm-02 입력 봇 (criteria.md "초보 입력 봇" 정의를 공받기 판정에 옮김)
//
//   탭 = 접촉 시각 + bias + N(0, σ)   (공이 북에 닿는 순간을 노림)
//   접촉마다 miss 확률로 탭을 빼먹고, extra 확률로 그 탭 0.15~0.45 s 뒤에 헛탭을 한 번 더 친다.
//   along: 받침 쉼 "콩"(까딱 소리)·자동 토스·착지 때도 따라 치는 아이(판정 없음, 헛탭 영향만 봄, 20-balance 9-4)
//   k2:    "높이 읽기" 손해 모델(위험 K2, 20-balance 9-3) — 짧아지는 통·반박·두 공·새 기믹 첫 등장 접촉에 σ를 키우고 놓침률을 올림
//   bias:  고정 밀림(+ = 늦게). 소리 따라 치는 아이(K3)는 bias = w × 남은 오디오 지연.
//
//   대표 봇(곡선 판정 원천) = balance.json bots.representative (2026-11-17 결정 14, 12세 프로젝트: novice_sd50 σ50). representativeProfile(bal) 로 얻음.
//
// 사용: node tools/sim/bots.mjs [시도 수=20000] [프로필|all, 기본 = 대표 봇] [레벨 id 쉼표]

import { compileLevel, judgeAttempt, gradeRating, comboEvents } from './judge.mjs';

// 대표 봇 프로필 이름·값 (없으면 옛 정의 child_sd70)
export function representativeProfile(bal) {
  const name = bal.bots.representative ?? 'child_sd70';
  return { name, profile: bal.bots.profiles[name] };
}

export function makeRng(seed = 12345) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = rnd();
    while (!v) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { rnd, gauss };
}

// 접촉마다 σ 배수·추가 놓침률 (K2 모델). 모델 값은 balance.json bots.k2_model.
export function k2Factors(L, m) {
  const cs = L.contacts;
  return cs.map((c, i) => {
    let sdMult = 1, missAdd = 0, qAdd = 0;
    if (c.kind === 'nogo') { if (c.first) qAdd += m.first_nogo_q_add ?? 0; return { sdMult, missAdd, qAdd }; }
    const prevGap = i > 0 ? cs[i - 1].gapBeats : null; // 바로 앞에 본 비행 길이(시간 순)
    if (prevGap != null && c.gapBeats < prevGap) sdMult *= m.shorter_than_prev_sd_mult;
    if (c.gapBeats <= 0.5) sdMult *= m.half_sd_mult;
    if (c.ball === 2 || L.level.phrases[c.phrase].balls === 2) sdMult *= m.two_ball_sd_mult;
    if (c.first) missAdd += m.first_gimmick_miss_add;
    return { sdMult, missAdd, qAdd };
  });
}

export function botTaps(L, p, rng, { bias = 0, along = null, extraAfter = [0.15, 0.45], k2 = null, qNogo = null } = {}) {
  const taps = [];
  const cs = L.contacts;
  const q0 = qNogo ?? p.q_nogo ?? 0;
  for (let i = 0; i < cs.length; i++) {
    const f = k2 ? k2[i] : null;
    if (cs[i].kind === 'nogo') {
      // 지붕 밑 착지: 박마다 치는 습관으로 참지 못하고 칠 확률 q_nogo(그 순간 노림 + 같은 흔들림). 참으면 탭 없음.
      if (rng.rnd() < q0 + (f ? f.qAdd : 0)) taps.push(cs[i].t + bias + rng.gauss() * p.sd_ms);
      continue;
    }
    if (rng.rnd() < p.miss + (f ? f.missAdd : 0)) continue;
    const tau = cs[i].t + bias + rng.gauss() * p.sd_ms * (f ? f.sdMult : 1);
    taps.push(tau);
    if (rng.rnd() < p.extra) taps.push(tau + 1000 * (extraAfter[0] + rng.rnd() * (extraAfter[1] - extraAfter[0])));
  }
  if (along) {
    const ev = [
      ...L.bobs.map((x) => [x.t, along.rest]),
      ...L.tosses.map((x) => [x.t, along.toss]),
      ...L.landings.map((x) => [x.t, along.land]),
    ];
    for (const [t, pr] of ev) if (rng.rnd() < pr) taps.push(t + bias + rng.gauss() * p.sd_ms);
  }
  return taps;
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};

export const contMedian = (pc) => (pc > 0 && pc < 1 ? Math.log(0.5) / Math.log(1 - pc) : pc >= 1 ? 0 : null); // p = 1 이면 0 (ln(1-p) → -∞)

// 한 프로필로 N회 독립 시도 + 세션(첫 클리어까지 시도 수, 상한 200)
export function runProfile(L, p, bal, { N = 20000, sessions = 2000, seed = 12345, bias = 0, along = null, k2 = false, qNogo = null, combo = false } = {}) {
  const rng = makeRng(seed);
  const extraAfter = bal.bots.extra_tap_after_s;
  const k2f = k2 ? k2Factors(L, bal.bots.k2_model) : null;
  const opt = { bias, along, extraAfter, k2: k2f, qNogo };
  let clears = 0, prog = 0, early = 0, bump = 0, comboBad = 0, comboMaxSum = 0;
  const failIdx = new Array(L.contacts.length).fill(0);
  const failProg = [], failProgT = [];
  const rating = [0, 0, 0, 0];
  for (let n = 0; n < N; n++) {
    const r = judgeAttempt(L, botTaps(L, p, rng, opt));
    if (combo) { const ce = comboEvents(L, r, bal); comboMaxSum += ce.final; if (ce.final !== r.grades.length || (r.clear && ce.final !== L.contacts.length)) comboBad++; }
    if (r.clear) { clears++; prog += 1; rating[gradeRating(L, r, bal.grade_rule)]++; }
    else { prog += r.progress; failIdx[r.failIndex]++; failProg.push(r.progress); failProgT.push(r.progressTime); if (r.reason === 'early') early++; if (r.reason === 'bump_roof') bump++; }
  }
  const sess = [];
  for (let s = 0; s < sessions; s++) {
    let k = 1;
    while (k < 200 && !judgeAttempt(L, botTaps(L, p, rng, opt)).clear) k++;
    sess.push(k);
  }
  const deaths = N - clears;
  const pc = clears / N;
  const top = deaths ? Math.max(...failIdx) : 0;
  return {
    clear_rate: +pc.toFixed(4),
    median_continuous: pc ? +contMedian(pc).toFixed(3) : null, // B6·B7 판정 원천 (insights 난이도 1번째 줄)
    median_sessions: median(sess), // 정수 중앙값(참고)
    p90_sessions: [...sess].sort((a, b) => a - b)[Math.floor(sessions * 0.9)],
    mean_progress: +(100 * prog / N).toFixed(1),
    median_fail_progress: deaths ? +(100 * median(failProg)).toFixed(1) : null,
    median_fail_progress_time: deaths ? +(100 * median(failProgT)).toFixed(1) : null,
    early_fail_share: deaths ? +(early / deaths).toFixed(3) : 0,
    roof_fail_share: deaths ? +(bump / deaths).toFixed(3) : 0,
    ...(combo ? { combo_mismatch: comboBad, combo_mean_final: +(comboMaxSum / N).toFixed(3) } : {}),
    deaths,
    top_fail_contact_share: deaths ? +(top / deaths).toFixed(3) : 0,
    top_fail_contact: deaths ? failIdx.indexOf(top) : null,
    grade_share_of_clears: clears ? { one: +(rating[1] / clears).toFixed(3), two: +(rating[2] / clears).toFixed(3), three: +(rating[3] / clears).toFixed(3) } : null,
  };
}

// 연습 모드: 받침 쉼(구절 시작)마다 체크포인트. 구절마다 깰 때까지 다시. 반환: 레벨 끝까지 총 시도 수 중앙값·90 %
export function runPractice(L, p, bal, { sessions = 2000, seed = 4321 } = {}) {
  const rng = makeRng(seed);
  const segs = [];
  for (const ph of L.level.phrases) {
    const contacts = L.contacts.filter((c) => c.phrase === ph.index);
    if (contacts.length) segs.push({ ...L, contacts, bobs: [], tosses: [], landings: [] });
  }
  const tot = [];
  for (let s = 0; s < sessions; s++) {
    let n = 0;
    for (const seg of segs) {
      let k = 1;
      while (k < 200 && !judgeAttempt(seg, botTaps(seg, p, rng, { extraAfter: bal.bots.extra_tap_after_s })).clear) k++;
      n += k;
    }
    tot.push(n);
  }
  tot.sort((a, b) => a - b);
  return { segments: segs.length, median_total_attempts: tot[Math.floor((sessions - 1) / 2)], p90_total_attempts: tot[Math.floor(sessions * 0.9)] };
}

// 해석값(헛탭 무시): 접촉마다 독립 (1-miss) × P(통과 창)
const ncdf = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - q : q;
};
export function analyticClear({ contacts, early, late, sd, miss, bias = 0 }) {
  const per = (1 - miss) * (ncdf((late - bias) / sd) - ncdf((-early - bias) / sd));
  const pc = Math.pow(per, contacts);
  return { per_contact: +per.toFixed(4), clear: +pc.toFixed(4), median_continuous: +contMedian(pc).toFixed(3) };
}

const isMain = typeof process !== 'undefined' && process.argv?.[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const { readFileSync } = await import('node:fs');
  const { dirname, resolve, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
  const N = +(process.argv[2] || 20000);
  const only = process.argv[3] === 'all' ? null : process.argv[3] || representativeProfile(bal).name;
  const ids = process.argv[4] ? process.argv[4].split(',') : null;
  const out = {};
  for (const f of bal.levels) {
    const lvl = JSON.parse(readFileSync(join(PROJECT, f), 'utf8'));
    if (ids && !ids.includes(lvl.id)) continue;
    const L = compileLevel(lvl, bal);
    out[lvl.id] = { contacts: L.contacts.length };
    for (const [pn, p] of Object.entries(bal.bots.profiles)) {
      if (only && pn !== only) continue;
      out[lvl.id][pn] = runProfile(L, p, bal, { N, sessions: Math.max(200, N / 10) });
    }
  }
  console.log(JSON.stringify(out, null, 1));
}
