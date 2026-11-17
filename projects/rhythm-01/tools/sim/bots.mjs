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
import { median as calibMedian, iqr as calibIqr, simulate as calibSimulate, autoStableAt, calibTapDiffR11 } from './calib.mjs';

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
    median_first_clear_continuous: pc ? +(Math.log(0.5) / Math.log(1 - pc)).toFixed(3) : null, // round-2 R3: 연속 중앙값 ln0.5/ln(1-p) (B6·B7 판정)
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
//   device: 자동 보정 뒤 기기에 남은 오차 범위 [lo, hi] ms (균등). 보정 화면은 이 값 + 탭 오차를 함께 잰다.
//   1-2 흐름(1회, 기록용): 탭 taps 번 중 use_from 번째부터의 (탭 - 박) 중앙값 m. IQR 이 reject_iqr_ms 를 넘으면 버림(오프셋 0 유지).
//   |m| ≤ apply_only_if_abs_over_ms 이면 적용하지 않음(자동 보정만). skip = true 면 보정 없이 device 오차가 그대로 남는다.
//   round-2 R4: 사분위·중앙값은 빌드 calib.js 정의(./calib.mjs: 선형 보간 사분위, 짝수 중앙값 = 가운데 둘 평균)를 그대로 쓴다.
export function calibrationBias(cal, { device = [-20, 40], sd = 70, skip = false } = {}) {
  return (rng) => {
    const d = device[0] + rng.rnd() * (device[1] - device[0]);
    if (skip) return d;
    const errs = [];
    for (let k = 0; k < cal.taps; k++) errs.push(d + rng.gauss() * sd);
    const used = errs.slice(cal.use_from_tap - 1);
    if (calibIqr(used) > cal.reject_iqr_ms) return d;
    const m = calibMedian(used);
    if (Math.abs(m) <= (cal.apply_only_if_abs_over_ms ?? 0)) return d; // 작은 값은 적용하지 않음(측정 잡음이 더 큼)
    const off = Math.max(cal.offset_clamp_ms[0], Math.min(cal.offset_clamp_ms[1], m));
    return d - off;
  };
}

// 보호자 보정 흐름(20-balance.md 8-4, balance.json audio_latency.guardian_calibration) 모델.
//   round-2 R4: 빌드 calib.js 의 simulate() 를 그대로 쓴다(./calib.mjs). 즉
//   회마다 taps_per_round 번 톡, use_from_tap 번째부터 사용. 한 회의 IQR(선형 보간) > reject_iqr_ms → **그 회만 다시**.
//   두 회 중앙값 차이 > round_disagree_max_ms → 전체(두 회) 다시. 다시 하기는 흐름 전체에서 max_retries 번까지,
//   그래도 안 되면 이전 오프셋(여기서는 0) 유지. 최종 m = 두 회 사용 탭 12개 중앙값(짝수 → 가운데 둘 평균),
//   |m| ≤ apply_only_if_abs_over_ms 이면 0, 그 밖은 offset_clamp_ms 로 자름.
//   sd = 실제로 친 사람의 탭 오차(어른 40, 아이가 대신 치면 70).
//   (round-1 까지의 모델은 반올림 위치 사분위 + IQR 실패 시 두 회 전체 다시였음: QA minor 5, balance 리뷰 이슈 4)
export function guardianCalibrationBias(cal, g, { device = [-20, 40], sd = 40 } = {}) {
  const maxRounds = (g.rounds + 1) * (g.max_retries + 1);
  return (rng) => {
    const d = device[0] + rng.rnd() * (device[1] - device[0]);
    const rounds = [];
    for (let r = 0; r < maxRounds; r++) {
      const row = [];
      for (let k = 0; k < g.taps_per_round; k++) row.push(d + rng.gauss() * sd);
      rounds.push(row);
    }
    const res = calibSimulate(rounds, g);
    if (!res.ok) return d; // 이전 오프셋(0) 유지
    return d - res.offset;
  };
}

// round-3 R17: "보정 때와 플레이 때 자동 지연 차이 Δ" 모델 (20-balance.md 8-1·8-3, balance.json verify.calibration_auto_shift).
//   시간축: 오디오 잠금 해제 = 0 ms. 자동 지연 보고값 autoAt(t) = t < jumpAtMs 이면 stableMs − Δ, 그 뒤 stableMs.
//   들리는 박 = 예약 시각 + 그 순간 autoAt (QA round-2 1-6 재측정 정의, 보고값 = 실제 출력 지연으로 봄).
//   보호자 흐름(2회 × 8탭, ./calib.mjs simulate)을 sd 인 사람이 친다: 탭 = 들리는 박 + d + N(0, sd), d = 기기 남은 오차(세션마다 1회).
//   method 'r2'  : round-2 빌드. 보정 시작(잠금 해제 13 ms 뒤, 첫 실행 타이틀 탭 직후)에 읽은 auto 를 보정 내내 고정해 탭 오차를 잼.
//   method 'r11' : round-3 R11. 안정 대기(autoStableAt, 매 프레임 읽기) 뒤 시작, 탭마다 그 순간 autoNow 로 잼(calibTapDiffR11).
//   플레이: 두 방식 모두 시도 시작 때 autoNow(= stableMs)를 읽어 comp = autoNow + 오프셋 → 남는 판정 치우침 = d − 오프셋.
//   (round-2 빌드도 레벨 시작 beginRun 에서 다시 읽으므로 보정 뒤 첫 L1 은 stableMs. 바뀌는 것은 보정이 잰 오프셋뿐)
//   RNG 소비 순서(d 1번 → 탭 오차 gauss)는 guardianCalibrationBias 와 같아서, Δ = 0 이면 그 행과 같은 값이 나온다.
//   calibStartMs: r2 의 보정 시작 시각. jumpAtMs: 보고값이 바뀌는 시각(r11 에서 보정 중 바뀌는 경우를 보려면 크게 줌).
export function autoShiftCalibBias(cal, g, { device = [-20, 40], sd = 40, deltaMs = 0, method = 'r11', jumpAtMs = 200, stableMs = 66, calibStartMs = 13, frameMs = 1000 / 60, stable } = {}) {
  const maxRounds = (g.rounds + 1) * (g.max_retries + 1);
  const beat = 60000 / g.bpm;
  const autoAt = (t) => (t < jumpAtMs ? stableMs - deltaMs : stableMs);
  let start;
  if (method === 'r11') {
    const rd = [];
    for (let t = 0; t <= stable.max_wait_ms + frameMs; t += frameMs) rd.push({ t, v: autoAt(t) });
    start = autoStableAt(rd, stable).t;
  } else start = calibStartMs;
  const fixedAuto = autoAt(start);
  const base = start + beat;
  return (rng) => {
    const d = device[0] + rng.rnd() * (device[1] - device[0]);
    const rounds = [];
    for (let r = 0; r < maxRounds; r++) {
      const row = [];
      for (let k = 0; k < g.taps_per_round; k++) {
        const sched = base + (r * g.taps_per_round + k) * beat;
        const tap = sched + autoAt(sched) + d + rng.gauss() * sd;
        const ref = method === 'r11' ? autoAt(tap) : fixedAuto;
        const e = calibTapDiffR11(tap, ref, base, beat);
        row.push(e === null ? tap - ref - base : e);
      }
      rounds.push(row);
    }
    const res = calibSimulate(rounds, g);
    return d - (res.ok ? res.offset : 0);
  };
}
// R11 안정 대기 시각(잠금 해제부터 ms): 보고값이 jumpAtMs 에 Δ 만큼 바뀌는 경우. 매 프레임 읽기
export function stableWaitMs(stable, { deltaMs = 64, jumpAtMs = 200, stableMs = 66, frameMs = 1000 / 60 } = {}) {
  const rd = [];
  for (let t = 0; t <= stable.max_wait_ms + frameMs; t += frameMs) rd.push({ t, v: t < jumpAtMs ? stableMs - deltaMs : stableMs });
  return autoStableAt(rd, stable);
}

// 플레이 중 큰 지연 감지(20-balance.md 8-5, audio_latency.drift_check) 모델. round-2 R4: 빌드 engine.js 정의(DEV_NOTES D15)에 맞춤.
//   표본: 맞힌(판정한) 별 = 그 판정한 탭의 (탭 - 별). 실패한 별(놓침·너무 일찍) = 그 별 ±sample_window_ms 안 가장 가까운 탭
//         (실패 연출 중 늦은 탭 포함). 실패 별 표본은 그 시도의 맞힌 별 표본 뒤에 들어감.
//   창: 표본이 window_taps 개 찰 때마다(겹치지 않는 창) 중앙값(짝수 → 가운데 둘 평균)을 봄.
//       |중앙값| ≥ trigger_abs_median_ms 면 연속 수 +1, 아니면 0.
//   켜짐: 창이 끝나는 그 순간에 연속 수 ≥ consecutive_windows 이고 그 시도 번호 ≥ min_attempts.
//   "시도 3번 이상" = 이번 레벨 플레이 안의 시도 수 → 클리어하면 그 플레이가 끝나므로 stopOnClear(기본 true)면 클리어한 시도 뒤 null.
//   반환: 신호가 켜진 시도 번호(1부터), 상한 maxAttempts 안에 안 켜지면 null.
//   (round-1 까지의 모델: 창 중앙값 = 아래쪽 값, 맞힌 별도 ±300 ms 안 아무 탭, 시도 끝에도 켜짐 확인, 클리어 뒤에도 계속)
export function driftDetectAttempt(L, p, bal, dc, rng, { bias = 0, maxAttempts = 30, stopOnClear = true } = {}) {
  const extraAfter = bal.bots.extra_tap_after_s;
  let n = 0, streak = 0;
  let buf = [];
  const push = (e, a) => {
    buf.push(e);
    if (buf.length < dc.window_taps) return false;
    const m = calibMedian(buf);
    buf = [];
    streak = Math.abs(m) >= dc.trigger_abs_median_ms ? streak + 1 : 0;
    return streak >= dc.consecutive_windows && a >= dc.min_attempts;
  };
  for (let a = 1; a <= maxAttempts; a++) {
    const taps = botTaps(L, p, rng, { bias, extraAfter });
    const r = judgeAttempt(L, taps);
    for (const g of r.grades) if (push(g.e, a)) return a;
    if (!r.clear) {
      const t = L.stars[r.failIndex].t;
      let best = null;
      for (const x of taps) { const e = x - t; if (Math.abs(e) <= dc.sample_window_ms && (best === null || Math.abs(e) < Math.abs(best))) best = e; }
      if (best !== null && push(best, a)) return a;
    } else if (stopOnClear) return null;
  }
  return null;
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

// ───────────────────────── round-3 (북길, 20-balance.md 17장) ─────────────────────────
// "처음 보는 무늬 비용" (R20, 00-benchmark 8-4): 보여 주기 마디가 없어져 처음 보는 마디 내용은 잘못 읽을 수 있다.
//   단위 = 마디 내용(그 마디의 별 자리 묶음, judge.mjs 별의 pattern = path.mjs 마디 내용 id).
//   노출 e = 이 세션에서 그 마디 내용에 도달한 횟수(앞 시도들 + 같은 시도 앞쪽). 별마다 놓침 확률에
//   extra_miss_first_exposure × max(0, 1 − e / exposures_to_zero) 를 더한다 (기본 3 %p → 2 → 1 → 0).
//   도달 = 그 마디의 첫 별이 실패한 별 번호 이하(그 마디까지 와서 봤음). 클리어하면 모든 마디 도달.
//   세션 = 첫 클리어까지(상한 maxAttempts). 연속 중앙값 = 생존 곡선 S(k) 가 0.5 를 지나는 시도의 기하 보간
//   x = (k−1) + ln(0.5 / S(k−1)) / ln(S(k) / S(k−1)). 비용 0 이면 ln0.5/ln(1−p) 와 같은 식이 된다.
export function noveltyTaps(L, p, rng, extraMiss, { bias = 0, extraAfter = [0.15, 0.45] } = {}) {
  const taps = [];
  L.stars.forEach((st, i) => {
    if (rng.rnd() < p.miss + extraMiss[i]) return;
    const tau = st.t + bias + rng.gauss() * p.sd_ms;
    taps.push(tau);
    if (rng.rnd() < p.extra) taps.push(tau + 1000 * (extraAfter[0] + rng.rnd() * (extraAfter[1] - extraAfter[0])));
  });
  return taps;
}

export function continuousMedianFromSurvival(S) {
  // S[0] = 1, S[k] = k번째 시도까지 못 깬 비율
  for (let k = 1; k < S.length; k++) {
    if (S[k] <= 0.5) {
      const q = S[k] / S[k - 1];
      return q > 0 ? (k - 1) + Math.log(0.5 / S[k - 1]) / Math.log(q) : k - 1;
    }
  }
  return null;
}

export function runNoveltySessions(L, p, bal, { sessions = 20000, seed = 24680, bias = 0, sessionBias = null, novelty, maxAttempts = 200 } = {}) {
  const nv = novelty ?? bal.bots.novelty;
  const c0 = nv.extra_miss_first_exposure, E = nv.exposures_to_zero;
  const rng = makeRng(seed);
  const extraAfter = bal.bots.extra_tap_after_s;
  // 마디 출현(occurrence): 별이 있는 마디 순서대로, 내용 id 번호
  const ids = [];
  const occOfStar = [], occFirstStar = [], occCid = [];
  let lastBar = null;
  L.stars.forEach((s, i) => {
    if (s.bar !== lastBar) { lastBar = s.bar; let c = ids.indexOf(s.pattern); if (c < 0) { ids.push(s.pattern); c = ids.length - 1; } occCid.push(c); occFirstStar.push(i); }
    occOfStar.push(occCid.length - 1);
  });
  const nOcc = occCid.length;
  // 같은 시도 안 앞쪽 같은 내용 출현 수
  const occPrevSame = occCid.map((c, o) => occCid.slice(0, o).filter((x) => x === c).length);
  const firstClear = new Array(maxAttempts + 2).fill(0);
  let capped = 0;
  const firstFailProgT = [];
  let att1Clear = 0;
  const extra = new Array(L.stars.length).fill(0);
  for (let s = 0; s < sessions; s++) {
    const b = sessionBias ? sessionBias(rng) : bias;
    const exp = new Array(ids.length).fill(0);
    let k = 1, done = false;
    for (; k <= maxAttempts; k++) {
      for (let i = 0; i < L.stars.length; i++) {
        const o = occOfStar[i];
        const e = exp[occCid[o]] + occPrevSame[o];
        extra[i] = c0 * Math.max(0, 1 - e / E);
      }
      const r = judgeAttempt(L, noveltyTaps(L, p, rng, extra, { bias: b, extraAfter }));
      const reached = r.clear ? L.stars.length - 1 : r.failIndex;
      for (let o = 0; o < nOcc; o++) if (occFirstStar[o] <= reached) exp[occCid[o]]++;
      if (k === 1) { if (r.clear) att1Clear++; else firstFailProgT.push(r.progressTime); }
      if (r.clear) { firstClear[k]++; done = true; break; }
    }
    if (!done) capped++;
  }
  const S = [1];
  let alive = sessions;
  for (let k = 1; k <= maxAttempts; k++) { alive -= firstClear[k]; S.push(alive / sessions); }
  const cont = continuousMedianFromSurvival(S);
  const quant = (q) => { let acc = 0; for (let k = 1; k <= maxAttempts; k++) { acc += firstClear[k]; if (acc >= q * sessions) return k; } return maxAttempts; };
  firstFailProgT.sort((a, b2) => a - b2);
  return {
    median_first_clear_continuous: cont === null ? null : +cont.toFixed(3),
    median_first_clear_sessions: quant(0.5),
    p90_first_clear_sessions: quant(0.9),
    attempt1_clear_rate: +(att1Clear / sessions).toFixed(4),
    attempt_clear_rate_1_to_5: [1, 2, 3, 4, 5].map((k) => +(1 - S[k] / S[k - 1]).toFixed(4)),
    capped_sessions: capped,
    first_fail_progress_time_median: firstFailProgT.length ? +(100 * firstFailProgT[Math.floor((firstFailProgT.length - 1) / 2)]).toFixed(1) : null,
  };
}

// 별마다 위험률(hazard) = 그 별에서 실패한 수 / 그 별까지 온 수 (비용 상위 덩어리 찾기, N8)
export function starHazards(L, p, bal, { N = 20000, seed = 13579 } = {}) {
  const rng = makeRng(seed);
  const fails = new Array(L.stars.length).fill(0);
  for (let n = 0; n < N; n++) {
    const r = judgeAttempt(L, botTaps(L, p, rng, { extraAfter: bal.bots.extra_tap_after_s }));
    if (!r.clear) fails[r.failIndex]++;
  }
  let reach = N;
  return fails.map((f) => { const h = reach ? f / reach : 0; reach -= f; return h; });
}

// 연습 모드 v3 (R21): 체크포인트 = 숨 고르기 틈 시작(박). 구간마다 깰 때까지, 부활 때만 카운트인(판정 영향 없음)
export function runPracticeV3(L, p, bal, checkpointMs, { sessions = 2000, seed = 4321 } = {}) {
  const rng = makeRng(seed);
  const bounds = [-Infinity, ...checkpointMs, Infinity];
  const segs = [];
  for (let k = 0; k + 1 < bounds.length; k++) {
    const stars = L.stars.filter((s) => s.t >= bounds[k] && s.t < bounds[k + 1]).map((s, i) => ({ ...s, i }));
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

// ── 판정 % (round-3, 요청자 지시 "판정 이름과 퍼센트까지 해주세요", balance.json accuracy, 20-balance.md 17-14) ──
// 판정 결과 e(탭 − 별 시각 ms)에서 계산만 하는 표시 층. judgeAttempt 와 같은 e·같은 "이하" 경계를 쓴다.
//   d ≤ 25 → 100, d ≤ perfect_ms → 90, d ≤ good_ms → 80/70/60(3칸), d ≤ W(e 쪽 통과 창 끝) → 50~10(5칸), 그 밖 → null(표시 없음)
export function accuracyPct(e, judge, acc) {
  const d = Math.abs(e);
  const W = e < 0 ? judge.pass_early_ms : judge.pass_late_ms;
  if (d > W) return null;
  if (d <= acc.perfect_inner_ms) return acc.perfect_inner_pct;
  const P = judge.perfect_ms, G = judge.good_ms;
  if (d <= P) return acc.perfect_outer_pct;
  if (d <= G) {
    const k = Math.min(acc.good_bins, Math.max(1, Math.ceil((acc.good_bins * (d - P)) / (G - P))));
    return acc.good_pcts[k - 1];
  }
  const k = Math.min(acc.pass_bins, Math.max(1, Math.ceil((acc.pass_bins * (d - G)) / (W - G))));
  return acc.pass_pcts[k - 1];
}

// % → 등급 (공통 7-2: ≥ 90 딱, 60~80 좋아, 10~50 통과)
export function gradeFromPct(pct, acc) {
  if (pct == null) return null;
  for (const [g, [lo, hi]] of Object.entries(acc.grade_from_pct)) if (pct >= lo && pct <= hi) return g;
  return null;
}

// 레벨 정확도: 클리어한 시도만 floor(평균 %). 실패 시도는 null (연습 모드는 호출하는 쪽에서 내지 않음)
export function levelAccuracy(L, result, acc) {
  if (!result.clear || !result.grades.length) return null;
  let s = 0;
  for (const g of result.grades) s += accuracyPct(g.e, L.judge, acc);
  return Math.floor(s / result.grades.length);
}
