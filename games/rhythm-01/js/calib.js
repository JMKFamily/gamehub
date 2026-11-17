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
