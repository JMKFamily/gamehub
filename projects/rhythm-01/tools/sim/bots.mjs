#!/usr/bin/env node
// rhythm-01 입력 봇 (criteria.md "초보 입력 봇" 정의를 박자 판정에 맞게 옮김)
//
//   탭 = 별 시각 + bias + N(0, σ)  (박을 노림. 통과 창이 비대칭이어도 봇은 박 자체를 노린다)
//   별마다 miss 확률로 탭을 빼먹고, extra 확률로 그 탭 0.15~0.45 s 뒤에 헛탭을 한 번 더 친다.
//   along=true 이면 보여 주기 마디에서도 같은 분포로 따라 친다(판정 없음, 헛탭 영향만 봄).
//
// 사용: node tools/sim/bots.mjs [시도 수=20000] [프로필|all] [레벨 id 쉼표]
//   예) node tools/sim/bots.mjs 50000 child_sd70 01

import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileLevel, judgeAttempt, starRating } from './judge.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..', '..');

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

export function botTaps(L, p, rng, { bias = 0, along = false, extraAfter = [0.15, 0.45] } = {}) {
  const taps = [];
  const targets = along ? [...L.stars, ...L.shows] : L.stars;
  for (const st of targets) {
    if (rng.rnd() < p.miss) continue;
    const tau = st.t + bias + rng.gauss() * p.sd_ms;
    taps.push(tau);
    if (rng.rnd() < p.extra) taps.push(tau + 1000 * (extraAfter[0] + rng.rnd() * (extraAfter[1] - extraAfter[0])));
  }
  return taps;
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};

// 한 프로필로 N회 독립 시도 + 세션(첫 클리어까지 시도 수, 상한 200) 시뮬레이션
export function runProfile(L, p, bal, { N = 20000, sessions = 2000, seed = 12345, bias = 0, along = false } = {}) {
  const rng = makeRng(seed);
  const extraAfter = bal.bots.extra_tap_after_s;
  let clears = 0, prog = 0, early = 0;
  const failIdx = new Array(L.stars.length).fill(0);
  const firstFailProg = [];
  const rating = [0, 0, 0, 0];
  for (let n = 0; n < N; n++) {
    const r = judgeAttempt(L, botTaps(L, p, rng, { bias, along, extraAfter }));
    if (r.clear) { clears++; prog += 1; rating[starRating(L, r, bal.stars_rule)]++; }
    else { prog += r.progress; failIdx[r.failIndex]++; firstFailProg.push(r.progress); if (r.reason === 'early') early++; }
  }
  const sess = [];
  for (let s = 0; s < sessions; s++) {
    let k = 1;
    while (k < 200 && !judgeAttempt(L, botTaps(L, p, rng, { bias, along, extraAfter })).clear) k++;
    sess.push(k);
  }
  const deaths = N - clears;
  const maxShare = deaths ? Math.max(...failIdx) / deaths : 0;
  const pc = clears / N;
  return {
    clear_rate: +pc.toFixed(4),
    median_first_clear_geom: pc ? Math.max(1, Math.ceil(Math.log(0.5) / Math.log(1 - pc))) : null,
    median_first_clear_sessions: median(sess),
    p90_first_clear_sessions: [...sess].sort((a, b) => a - b)[Math.floor(sessions * 0.9)],
    mean_progress: +(100 * prog / N).toFixed(1),
    median_fail_progress: deaths ? +(100 * median(firstFailProg)).toFixed(1) : null,
    early_fail_share: deaths ? +(early / deaths).toFixed(3) : 0,
    top_fail_star_share: +maxShare.toFixed(3),
    top_fail_star: deaths ? failIdx.indexOf(Math.max(...failIdx)) : null,
    rating_share_of_clears: clears ? { one: +(rating[1] / clears).toFixed(3), two: +(rating[2] / clears).toFixed(3), three: +(rating[3] / clears).toFixed(3) } : null,
  };
}

// 연습 모드: sections 의 checkpoint 구간마다 깰 때까지 다시 (그 구간 시작 = 쉬는 마디 = 카운트인).
// 반환: 레벨 끝까지 가는 데 든 총 시도 수(구간 시도 합) 중앙값·90 %
export function runPractice(L, p, bal, { sessions = 2000, seed = 4321 } = {}) {
  const rng = makeRng(seed);
  const cps = L.level.sections.filter((s) => s.checkpoint).map((s) => s.start_bar);
  const bounds = [0, ...cps, Infinity];
  const segs = [];
  for (let k = 0; k + 1 < bounds.length; k++) {
    const stars = L.stars.filter((s) => s.bar >= bounds[k] && s.bar < bounds[k + 1]);
    if (stars.length) segs.push({ ...L, stars, shows: [] });
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

// 해석값: 별마다 독립이라고 보고 (1-miss) × P(통과 창) 의 곱 (헛탭 무시)
const ncdf = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - q : q;
};
export function analyticClear({ stars, early, late, sd, miss, bias = 0 }) {
  const per = (1 - miss) * (ncdf((late - bias) / sd) - ncdf((-early - bias) / sd));
  const pc = Math.pow(per, stars);
  return { per_star: +per.toFixed(4), clear: +pc.toFixed(4), median: pc > 0 ? Math.max(1, Math.ceil(Math.log(0.5) / Math.log(1 - pc))) : null };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
  const N = +(process.argv[2] || 20000);
  const only = process.argv[3] && process.argv[3] !== 'all' ? process.argv[3] : null;
  const ids = process.argv[4] ? process.argv[4].split(',') : null;
  const out = {};
  for (const f of bal.levels) {
    const lvl = JSON.parse(readFileSync(join(PROJECT, f), 'utf8'));
    if (ids && !ids.includes(lvl.id)) continue;
    const L = compileLevel(lvl, bal);
    out[lvl.id] = { stars: L.stars.length };
    for (const [pn, p] of Object.entries(bal.bots.profiles)) {
      if (only && pn !== only) continue;
      out[lvl.id][pn] = runProfile(L, p, bal, { N, sessions: Math.max(200, N / 10) });
    }
  }
  console.log(JSON.stringify(out, null, 1));
}
