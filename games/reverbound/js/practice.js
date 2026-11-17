// 연습 모드 자동 체크포인트 (00-benchmark 7-2·10절, 오케스트레이터 결정 11). DOM 없음, node 확인 도구도 같이 씀.
// 안전 지점 = 검증기 물리(physics.js simulate)로 돌린 클리어 입력열의 궤적 위에서
//   1) 착지해 있고(g, vy 0) 2) 박자 위치(정박)이며 3) 그 틱부터 다음 필요한 탭까지 minLead 초 이상 남은 곳.
// 플레이어의 실제 상태가 그 틱의 궤적 상태와 같을 때만 저장한다 → 부활하면 입력 없이 minLead 초 이상 살아 있고,
// 같은 입력열로 끝까지 깰 수 있으므로 "부활 직후 피할 수 없는 사망" 고리가 생기지 않는다.
import { simulate } from './physics.js';

// L: compileLevel 결과, traces: 탭 틱 목록 배열(클리어 입력열 여러 개), cfg: {checkpoint_min_lead_s, checkpoint_every_beats}
export function safePoints(L, traces, cfg) {
  const hz = L.bal.physics_hz;
  const lead = Math.round(cfg.checkpoint_min_lead_s * hz);
  const every = cfg.checkpoint_every_beats ?? 1;
  const beatS = 60 / L.level.bpm;
  const out = new Map(); // tick → [{y, nextTap}]
  for (const taps of traces) {
    if (!taps?.length) continue;
    const r = simulate(L, taps, { trace: true });
    if (!r.ok) continue; // 깨지 못하는 입력열은 쓰지 않음
    const sorted = [...taps].sort((a, b) => a - b);
    let j = 0;
    for (let b = every; b * beatS * hz < L.nTicks; b += every) {
      const k = Math.round(b * beatS * hz);
      const s = r.states[k];
      if (!s || !s.g || s.vy !== 0) continue;
      while (j < sorted.length && sorted[j] < k) j++;
      const next = j < sorted.length ? sorted[j] : L.nTicks;
      if (next - k < lead) continue;
      const arr = out.get(k) ?? [];
      if (!arr.some((e) => Math.abs(e.y - s.y) < 1e-9)) arr.push({ y: s.y, nextTap: next });
      out.set(k, arr);
    }
  }
  return out;
}

// 지금 상태가 안전 지점인지 (틱 k에서 처리하기 전 상태 s)
export function isSafe(points, k, s) {
  const arr = points.get(k);
  return !!arr && s.g && s.vy === 0 && arr.some((e) => Math.abs(e.y - s.y) < 1e-9);
}
