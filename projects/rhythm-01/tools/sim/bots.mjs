#!/usr/bin/env node
// rhythm-01 입력 봇 (criteria.md "초보 입력 봇" 정의를 박자 판정에 맞게 옮김)
//
//   탭 = 별 시각 + bias + N(0, σ)  (박을 노림. 통과 창이 비대칭이어도 봇은 박 자체를 노린다)
//   별마다 miss 확률로 탭을 빼먹고, extra 확률로 그 탭 0.15~0.45 s 뒤에 헛탭을 한 번 더 친다.
//   along=true 이면 보여 주기 마디에서도 같은 분포로 따라 친다(판정 없음, 헛탭 영향만 봄).
//   sessionBias() 를 주면 세션(아이 한 명·기기 하나)마다 남은 지연 오차를 한 번 뽑아 그 세션 내내 쓴다(보정 화면 영향, 8-3절).
//
// 사용: node tools/sim/bots.mjs [시도 수=20000] [프로필|all] [레벨 id 쉼표]
//   예) node tools/sim/bots.mjs 50000 child_sd70 01

import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileLevel, judgeAttempt, gradeRating } from './judge.mjs';

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
export function runProfile(L, p, bal, { N = 20000, sessions = 2000, seed = 12345, bias = 0, along = false, sessionBias = null } = {}) {
  const rng = makeRng(seed);
  const extraAfter = bal.bots.extra_tap_after_s;
  let clears = 0, prog = 0, progT = 0, early = 0;
  const failIdx = new Array(L.stars.length).fill(0);
  const firstFailProg = [], firstFailProgT = [];
  const rating = [0, 0, 0, 0];
  for (let n = 0; n < N; n++) {
    const r = judgeAttempt(L, botTaps(L, p, rng, { bias, along, extraAfter }));
    if (r.clear) { clears++; prog += 1; progT += 1; rating[gradeRating(L, r, bal.grade_rule)]++; }
    else { prog += r.progress; progT += r.progressTime; failIdx[r.failIndex]++; firstFailProg.push(r.progress); firstFailProgT.push(r.progressTime); if (r.reason === 'early') early++; }
  }
  const sess = [];
  for (let s = 0; s < sessions; s++) {
    const b = sessionBias ? sessionBias(rng) : bias;
    let k = 1;
    while (k < 200 && !judgeAttempt(L, botTaps(L, p, rng, { bias: b, along, extraAfter })).clear) k++;
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
    mean_progress_time: +(100 * progT / N).toFixed(1),
    median_fail_progress_time: deaths ? +(100 * median(firstFailProgT)).toFixed(1) : null,
    early_fail_share: deaths ? +(early / deaths).toFixed(3) : 0,
    top_fail_star_share: +maxShare.toFixed(3),
    top_fail_star: deaths ? failIdx.indexOf(Math.max(...failIdx)) : null,
    grade_share_of_clears: clears ? { one: +(rating[1] / clears).toFixed(3), two: +(rating[2] / clears).toFixed(3), three: +(rating[3] / clears).toFixed(3) } : null,
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


// 지연 보정 화면(20-balance.md 8-3) 모델: 세션마다 남은 지연 오차를 뽑는 함수를 만든다.
//   device: 자동 보정 뒤 기기에 남은 오차 범위 [lo, hi] ms (균등). 보정 화면은 이 값 + 아이 탭 오차를 함께 잰다.
//   보정 = 탭 taps 번 중 use_from 번째부터의 (탭 - 박) 중앙값 m. 그 값들의 IQR 이 reject_iqr_ms 를 넘으면 버림(오프셋 0 유지).
//   |m| ≤ apply_only_if_abs_over_ms 이면 적용하지 않음(자동 보정만).
//   skip = true 면 보정 없이 device 오차가 그대로 남는다.
export function calibrationBias(cal, { device = [-20, 40], sd = 70, skip = false } = {}) {
  return (rng) => {
    const d = device[0] + rng.rnd() * (device[1] - device[0]);
    if (skip) return d;
    const errs = [];
    for (let k = 0; k < cal.taps; k++) errs.push(d + rng.gauss() * sd);
    const used = errs.slice(cal.use_from_tap - 1).sort((a, b) => a - b);
    const q = (f) => used[Math.min(used.length - 1, Math.max(0, Math.round(f * (used.length - 1))))];
    if (q(0.75) - q(0.25) > cal.reject_iqr_ms) return d;
    const m = used.length % 2 ? used[(used.length - 1) / 2] : (used[used.length / 2 - 1] + used[used.length / 2]) / 2;
    if (Math.abs(m) <= (cal.apply_only_if_abs_over_ms ?? 0)) return d; // 작은 값은 적용하지 않음(측정 잡음이 더 큼)
    const off = Math.max(cal.offset_clamp_ms[0], Math.min(cal.offset_clamp_ms[1], m));
    return d - off;
  };
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
