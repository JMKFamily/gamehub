// 보조 계산(소리 맞추기·밀림 감지) — DOM 없음, node 에서도 import. 정의는 balance.json sound_sync·drift_check.
// 분위수 = 선형 보간 type 7, 중앙값 = 짝수 개면 가운데 둘 평균 (balance sound_sync._note, rhythm-01 guardian_calibration 과 같음)
export function quantile(a, q) {
  const s = [...a].sort((x, y) => x - y), n = s.length;
  if (!n) return null;
  const h = (n - 1) * q, lo = Math.floor(h), hi = Math.ceil(h);
  return s[lo] + (h - lo) * (s[hi] - s[lo]);
}
export const median = (a) => quantile(a, 0.5);
export const iqr = (a) => quantile(a, 0.75) - quantile(a, 0.25);

// 소리 맞추기 한 회 검사. diffs = 그 회 탭 8개의 (탭 − 들린 소리) ms
export function syncRound(diffs, C) {
  const used = diffs.slice(C.use_from_tap - 1, C.taps_per_round);
  return { used, med: median(used), iqr: iqr(used), ok: used.length === C.taps_per_round - C.use_from_tap + 1 && iqr(used) <= C.reject_iqr_ms };
}

// 두 회 끝난 뒤 결과. rounds = [diffs8, diffs8], visualComp = balance judge_clock.visual_comp_ms
//   {ok, offset, raw}. round-2(M1·E3): 무시 구간 없음 — raw 를 그대로 [offset_clamp] 로 자름(값이 작아도 적용, 경계 뒤집힘 없음)
export function syncResult(rounds, C, visualComp) {
  const r = rounds.map((d) => syncRound(d, C));
  if (r.some((x) => !x.ok)) return { ok: false, why: 'iqr' };
  if (Math.abs(r[0].med - r[1].med) > C.round_disagree_max_ms) return { ok: false, why: 'disagree' };
  const all = r.flatMap((x) => x.used);
  const raw = median(all) - (C.subtract_visual_comp ? visualComp : 0);
  const off = Math.min(C.offset_clamp_ms[1], Math.max(C.offset_clamp_ms[0], raw));
  return { ok: true, raw, offset: Math.round(off) };
}

// 밀림 감지: 판정된 탭 부호 오차를 차례로 넣음. 8개 겹치지 않는 창의 중앙값 ≥ +70 이 2창 연속이고 이번 레벨 플레이 시도 ≥ 3 이면 켬
export function driftNew() { return { buf: [], run: 0, windows: [], fired: false }; }
export function driftFeed(st, e, attempts, D) {
  st.buf.push(e);
  if (st.buf.length >= D.window_taps) {
    const m = median(st.buf.splice(0, D.window_taps));
    st.windows.push(m);
    st.run = m >= D.trigger_median_late_ms ? st.run + 1 : 0;
  }
  if (!st.fired && st.run >= D.consecutive_windows && attempts >= D.min_attempts_this_play) st.fired = true;
  return st.fired;
}
