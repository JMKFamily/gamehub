// 보호자 보정 계산 (balance.json audio_latency.guardian_calibration, 20-balance 8-4). 순수 함수.
const sorted = (a) => [...a].sort((x, y) => x - y);
export function median(a) { const s = sorted(a), n = s.length; return n ? (s[(n - 1) >> 1] + s[n >> 1]) / 2 : 0; }
function quantile(s, q) { const p = (s.length - 1) * q, i = Math.floor(p); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i); }
export function iqr(a) { const s = sorted(a); return quantile(s, 0.75) - quantile(s, 0.25); }

// diffs = 한 회의 (탭 - 박) ms, 탭 순서대로 taps_per_round 개
export function evalRound(diffs, gc) {
  const used = diffs.slice(gc.use_from_tap - 1, gc.taps_per_round);
  const q = iqr(used);
  return { used, med: median(used), iqr: q, ok: q <= gc.reject_iqr_ms };
}

// 두 회 결과 → 적용할 수동 오프셋. ok=false 면 이전 값 유지
export function finalOffset(r1, r2, gc) {
  if (Math.abs(r1.med - r2.med) > gc.round_disagree_max_ms) return { ok: false, why: 'disagree' };
  const m = median([...r1.used, ...r2.used]);
  const [lo, hi] = gc.offset_clamp_ms;
  const offset = Math.abs(m) <= gc.apply_only_if_abs_over_ms ? 0 : Math.max(lo, Math.min(hi, m));
  return { ok: true, m, offset };
}

// 전체 흐름(재시도 포함)을 탭 묶음으로 흉내 (테스트 훅용). rounds = [[8개], [8개], ...] 순서대로 소비
export function simulate(rounds, gc) {
  let retries = 0, k = 0;
  const done = [];
  while (k < rounds.length) {
    const r = evalRound(rounds[k++], gc);
    if (!r.ok) { if (retries < gc.max_retries) { retries++; continue; } return { ok: false, why: 'iqr' }; }
    done.push(r);
    if (done.length < gc.rounds) continue;
    const f = finalOffset(done[0], done[1], gc);
    if (f.ok) return f;
    if (retries < gc.max_retries) { retries++; done.length = 0; continue; }
    return f;
  }
  return { ok: false, why: 'incomplete' };
}

// ---------------------------------------------------------------------------
// round-3 R11 자동 지연 읽는 법 (balance.json audio_latency.auto_latency_read, 20-balance 8-1).
// tools/sim/calib.mjs 의 autoStableAt·calibTapDiffR11·attemptComp 와 같은 이름·같은 식 (verify-levels C2 대조).
//   autoNow = (outputLatency + baseLatency) × 1000, 읽는 그 순간 값.
//   ① 보정 탭 오차 = (탭 오디오 시각 − 그 순간 autoNow) 를 가장 가까운 박에 맞춘 차이 → 저장 오프셋 = 남는 차이만
//   ② 시도 comp = 시도 시작 때 autoNow + 수동 오프셋 (시도 중에는 그대로)
//   ③ 잠금 해제 뒤 안정 대기: (지금 − 잠금 해제) ≥ min_since_unlock_ms 이고 최근 window_ms 값 변화 ≤ max_change_ms, 최대 max_wait_ms
export function autoStableAt(readings, st) {
  // readings: [{ t: 잠금 해제부터 ms, v: autoNow ms }] 시간 순. 반환 { t, v, stable }
  if (!readings.length) return { t: 0, v: 0, stable: false };
  const t0 = readings[0].t;
  for (let i = 0; i < readings.length; i++) {
    const { t, v } = readings[i];
    if (t >= st.max_wait_ms) return { t, v, stable: false };
    if (t < (st.min_since_unlock_ms ?? 0) || t - t0 < st.window_ms) continue;
    let lo = Infinity, hi = -Infinity;
    for (let j = i; j >= 0 && readings[j].t >= t - st.window_ms; j--) { lo = Math.min(lo, readings[j].v); hi = Math.max(hi, readings[j].v); }
    if (hi - lo <= st.max_change_ms) return { t, v, stable: true };
  }
  const last = readings[readings.length - 1];
  return { t: last.t, v: last.v, stable: false };
}
export function calibTapDiffR11(tapAudioMs, autoNowMs, baseMs, beatMs) {
  const t = tapAudioMs - autoNowMs;
  if (t < baseMs - beatMs / 2) return null; // 첫 박 전
  const k = Math.round((t - baseMs) / beatMs);
  return t - (baseMs + k * beatMs);
}
export function attemptComp(autoNowAtAttemptStartMs, offsetMs) { return autoNowAtAttemptStartMs + (offsetMs || 0); }
