// Reverbound 물리 (20-balance.md 4장). 브라우저 게임과 projects/runner-01/tools/verify-levels.mjs 가 함께 쓴다.
// DOM·node 의존 없음. 수치는 전부 balance.json(bal)에서 읽는다.

export const EPS = 1e-9;

// 레벨 JSON → 판정 박스 + 틱별 x 표
export function compileLevel(level, bal) {
  const dt = 1 / bal.physics_hz;
  const speeds = bal.speeds_t_s;
  const solids = [];   // {x0,x1,y0,y1,platform}
  const hazards = [];  // {x0,x1,y0,y1}
  const pads = [];     // {id,x0,x1,y0,y1}
  const orbs = [];     // {id,x0,x1,y0,y1}
  let nextId = 0;
  for (const o of level.objects) {
    switch (o.type) {
      case 'block': {
        const w = o.w ?? 1, h = o.h ?? 1;
        solids.push({ x0: o.x, x1: o.x + w, y0: o.y, y1: o.y + h, platform: false, src: o });
        break;
      }
      case 'platform': {
        const w = o.w ?? 1, t = bal.platform_thickness_t;
        solids.push({ x0: o.x, x1: o.x + w, y0: o.y + 1 - t, y1: o.y + 1, platform: true, src: o });
        break;
      }
      case 'spike': {
        const w = bal.spike_hitbox_w_t, h = bal.spike_hitbox_h_t;
        hazards.push({ x0: o.x + 0.5 - w / 2, x1: o.x + 0.5 + w / 2, y0: o.y, y1: o.y + h, src: o });
        break;
      }
      case 'spike_low': {
        const w = bal.spike_low_hitbox_w_t, h = bal.spike_low_hitbox_h_t;
        hazards.push({ x0: o.x + 0.5 - w / 2, x1: o.x + 0.5 + w / 2, y0: o.y, y1: o.y + h, src: o });
        break;
      }
      case 'spike_ceiling': {
        const w = bal.spike_ceiling_hitbox_w_t, h = bal.spike_ceiling_hitbox_h_t;
        hazards.push({ x0: o.x + 0.5 - w / 2, x1: o.x + 0.5 + w / 2, y0: o.y + 1 - h, y1: o.y + 1, src: o });
        break;
      }
      case 'pad': {
        const ix = bal.pad_trigger_inset_x_t;
        pads.push({ id: nextId++, x0: o.x + ix, x1: o.x + 1 - ix, y0: o.y, y1: o.y + bal.pad_trigger_h_t, src: o });
        break;
      }
      case 'orb': {
        const s = bal.orb_trigger_size_t;
        orbs.push({ id: nextId++, x0: o.x + 0.5 - s / 2, x1: o.x + 0.5 + s / 2, y0: o.y + 0.5 - s / 2, y1: o.y + 0.5 + s / 2, src: o });
        break;
      }
      default:
        throw new Error(`알 수 없는 오브젝트 type: ${o.type}`);
    }
  }
  // 수평 위치는 입력과 무관 → 틱별 x, 속도를 미리 계산
  const portals = [...(level.speed_changes ?? [])].sort((a, b) => a.x - b.x);
  for (const p of portals) if (!(p.speed in speeds)) throw new Error(`알 수 없는 speed: ${p.speed}`);
  const X = [];
  const V = [];
  const P = []; // 틱 k에서 통과한 속도 변경 지점 index (없으면 -1). 연출용
  let x = level.player_start?.x ?? 0;
  X[0] = x;
  let v = speeds[level.start_speed];
  let pi = 0;
  const maxTicks = Math.ceil((level.length_tiles / speeds.slow + 5) * bal.physics_hz);
  let k = 0;
  while (x < level.length_tiles && k < maxTicks) {
    let passed = -1;
    // 속도 변경 지점: 플레이어 중심(x+0.5)이 지점 x를 넘은 틱부터 적용
    while (pi < portals.length && x + 0.5 >= portals[pi].x) { v = speeds[portals[pi].speed]; passed = pi; pi++; }
    V.push(v);
    P.push(passed);
    x += v * dt;
    X.push(x);
    k++;
  }
  // 1타일 버킷
  const all = [
    ...solids.map((s) => ({ kind: 'solid', o: s })),
    ...hazards.map((s) => ({ kind: 'hazard', o: s })),
    ...pads.map((s) => ({ kind: 'pad', o: s })),
    ...orbs.map((s) => ({ kind: 'orb', o: s })),
  ];
  const buckets = new Map();
  for (const it of all) {
    for (let b = Math.floor(it.o.x0); b <= Math.floor(it.o.x1); b++) {
      if (!buckets.has(b)) buckets.set(b, []);
      buckets.get(b).push(it);
    }
  }
  const byId = new Map();
  for (const o of pads) byId.set(o.id, o);
  for (const o of orbs) byId.set(o.id, o);
  return { level, bal, dt, X, V, P, portals, nTicks: X.length - 1, solids, hazards, pads, orbs, buckets, byId, _stamp: 0, _near: [] };
}

// x 근처(왼쪽 1칸 ~ 오른쪽 2칸) 항목. 버킷 순서 + 첫 등장 순서를 유지하며 중복 제거 (Set과 같은 순서).
// 반환 배열은 다음 호출에서 재사용되므로 바로 소비할 것.
export function near(L, x, out = []) {
  out.length = 0;
  const stamp = ++L._stamp;
  for (let b = Math.floor(x) - 1; b <= Math.floor(x) + 2; b++) {
    const arr = L.buckets.get(b);
    if (!arr) continue;
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      if (it._s === stamp) continue;
      it._s = stamp;
      out.push(it);
    }
  }
  return out;
}

// 열린 구간 겹침 (경계 접촉 제외)
export const ov = (a0, a1, b0, b1) => a0 < b1 - EPS && b0 < a1 - EPS;

export const startState = (L) => ({ y: L.level.player_start?.y ?? 0, vy: 0, g: true, used: [] });

const NEAR_A = [], NEAR_B = [];

// 1틱 진행. state: {y, vy, g(접지), used(이미 쓴 pad/orb id)}
// down: 이번 틱에 버튼이 눌려 있음, edge: 이번 틱에 새로 눌림
// 반환: {s, clear, ev} 또는 {dead, cause, x, y}
//   ev(연출용 이벤트 비트): 1 지면 점프, 2 공중 재점프, 4 착지, 8 발판 발동
export function step(L, s, k, down, edge) {
  const b = L.bal, dt = L.dt;
  const x = L.X[k], nx = L.X[k + 1];
  let { y, vy, g } = s;
  const wasGrounded = g;
  let used = s.used;
  let ev = 0;
  const inner = b.player_inner_hitbox_t, ilo = 0.5 - inner / 2, ihi = 0.5 + inner / 2;

  // 1) 입력: 공중 재점프 트리거(새로 누름 + 겹침) 우선, 아니면 지면 점프(눌려 있음 + 접지)
  let acted = false;
  if (edge || (!b.input_orb_requires_new_press && down)) {
    const items = near(L, x, NEAR_A);
    for (const it of items) {
      if (it.kind !== 'orb' || used.includes(it.o.id)) continue;
      if (ov(x, x + 1, it.o.x0, it.o.x1) && ov(y, y + 1, it.o.y0, it.o.y1)) {
        vy = b.orb_velocity_t_s; g = false; used = [...used, it.o.id]; acted = true; ev |= 2; break;
      }
    }
  }
  if (!acted && g && (b.input_hold_rejump ? down : edge)) { vy = b.jump_velocity_t_s; g = false; ev |= 1; }

  // 2) 적분 (등가속 정확해, 낙하 속도 상한)
  let nvy = vy - b.gravity_t_s2 * dt;
  if (nvy < -b.max_fall_speed_t_s) nvy = -b.max_fall_speed_t_s;
  let ny = y + 0.5 * (vy + nvy) * dt;
  g = false;

  const items = near(L, nx, NEAR_B);
  // 3) 착지: 내려오는 중(vy<=0)이고 발이 윗면 - snap 이상이면 윗면으로 올림
  let top = -Infinity;
  if (nvy <= 0) {
    for (const it of items) {
      if (it.kind !== 'solid') continue;
      const o = it.o;
      if (ov(nx, nx + 1, o.x0, o.x1) && ny < o.y1 && ny + 1 > o.y0 && ny >= o.y1 - b.landing_snap_t - EPS) {
        if (o.y1 > top) top = o.y1;
      }
    }
  }
  if (top > -Infinity) { ny = top; nvy = 0; g = true; }
  if (ny <= 0) { ny = 0; if (nvy < 0) nvy = 0; g = true; }
  if (g && !wasGrounded) ev |= 4;

  // 4) 발판형 자동 점프
  for (const it of items) {
    if (it.kind !== 'pad' || used.includes(it.o.id)) continue;
    const o = it.o;
    if (ov(nx, nx + 1, o.x0, o.x1) && ov(ny, ny + 1, o.y0, o.y1)) {
      nvy = b.pad_velocity_t_s; g = false; used = [...used, o.id]; ev |= 8;
    }
  }

  // 5) 사망: 즉사 장애물은 몸체 박스, 블록은 안쪽 작은 박스
  for (const it of items) {
    const o = it.o;
    if (it.kind === 'hazard') {
      if (ov(nx, nx + 1, o.x0, o.x1) && ov(ny, ny + 1, o.y0, o.y1))
        return { dead: true, cause: `${o.src.type}@(${o.src.x},${o.src.y})`, x: nx, y: ny };
    } else if (it.kind === 'solid' && !o.platform) {
      if (ov(nx + ilo, nx + ihi, o.x0, o.x1) && ov(ny + ilo, ny + ihi, o.y0, o.y1))
        return { dead: true, cause: `block-side@(${o.src.x},${o.src.y})`, x: nx, y: ny };
    }
  }
  // 지나간 pad/orb 기록 정리 (상태 합치기용)
  if (used.length) {
    const keep = used.filter((id) => L.byId.get(id).x1 > nx - 0.01);
    if (keep.length !== used.length) used = keep;
  }
  const clear = nx >= L.level.length_tiles;
  return { s: { y: ny, vy: nvy, g, used }, clear, ev };
}

export const keyOf = (s) => `${s.y.toFixed(6)}|${s.vy.toFixed(5)}|${s.g ? 1 : 0}|${s.used.join(',')}`;

// 탭 목록(틱)으로 재생. 검증기와 빌드 자체 확인이 같이 쓴다.
export function simulate(L, presses, { trace = false, hold = false, from = null } = {}) {
  const set = new Set(presses);
  let s = from ? from.s : startState(L);
  const k0 = from ? from.k : 0;
  const states = trace ? [] : null;
  for (let k = k0; k < L.nTicks; k++) {
    if (trace) states[k] = s;
    const down = hold ? true : set.has(k);
    const edge = hold ? k === 0 : set.has(k);
    const r = step(L, s, k, down, edge);
    if (r.dead) return { ok: false, k, x: r.x, cause: r.cause, states };
    if (r.clear) { if (trace) states[k + 1] = r.s; return { ok: true, k, states }; }
    s = r.s;
  }
  return { ok: false, k: L.nTicks, cause: 'timeout', states };
}
