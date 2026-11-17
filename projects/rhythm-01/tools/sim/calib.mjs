// 보호자 보정 계산의 기준 정의 (round-2 R4). 빌드 games/rhythm-01/js/calib.js 와 같은 정의를 옮겨 둔 것.
//   사분위 = 선형 보간(정렬 s, 위치 (n-1)·q, type 7), IQR = Q3 - Q1
//   중앙값 = 홀수면 가운데, 짝수면 가운데 둘 평균
//   한 회 = taps_per_round 개 중 use_from_tap 번째부터 사용. IQR > reject_iqr_ms 면 그 회만 다시
//   두 회 중앙값 차이 > round_disagree_max_ms 면 전체(두 회) 다시. 다시 하기는 흐름 전체에서 max_retries 번
//   최종 m = 두 회 사용 탭 전체(12개) 중앙값, |m| ≤ apply_only_if_abs_over_ms 면 0, 그 밖은 offset_clamp_ms 로 자름
// 검증기(C1)가 빌드 calib.js 가 있으면 무작위 입력으로 두 구현의 결과가 같은지 확인한다.
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
