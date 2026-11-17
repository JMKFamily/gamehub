// 게임 코어: 시도·사망·재시작·클리어·체크포인트 상태 기계. DOM 없음 (node 자체 확인에서도 그대로 돌림).
// 시간은 advance(dt)로만 흐른다. 물리는 physics.js step()을 1/physics_hz 고정 스텝으로 호출.
import { step, startState } from './physics.js';
import { isSafe } from './practice.js';

export function createGame(bal, hooks = {}) {
  const hz = bal.physics_hz;
  const maxSteps = bal.max_physics_steps_per_frame;
  const airtime = (2 * bal.jump_velocity_t_s) / bal.gravity_t_s2;
  const rotRate = bal.rotation_deg_per_jump / airtime; // deg/s
  const emit = (name, ...a) => hooks[name]?.(...a);

  const G = {
    state: 'idle',          // idle | playing | dead | clear
    paused: false,
    L: null, levelIndex: -1, practice: false,
    k: 0, s: null, prev: null,   // prev: 직전 틱 {x,y,rot}
    time: 0,                // 시도 시작 기준 게임 시간(s). 음수 = 시작 전 대기(오디오 선행)
    preroll: 0,
    rot: 0, prevRot: 0,
    attempts: 0,
    deadT: 0, clearT: 0, death: null,
    checkpoints: [],
    queue: [], held: false,
    lastPerf: 0,
    safe: null,             // 연습 모드 안전 지점 표 (practice.js safePoints). 없으면 자동 체크포인트 없음
    ev: 0,                  // 마지막 틱 이벤트 비트 (physics.step ev)
    maxX: 0,
  };

  function resetAttempt(fromCp) {
    const cp = fromCp ? G.checkpoints[G.checkpoints.length - 1] : null;
    G.k = cp ? cp.k : 0;
    G.s = cp ? { ...cp.s, used: cp.s.used.slice() } : startState(G.L);
    G.rot = cp ? cp.rot : 0;
    G.prevRot = G.rot;
    G.prev = { x: G.L.X[G.k], y: G.s.y };
    G.time = G.k / hz - G.preroll;
    G.queue.length = 0;
    G.held = false;
    G.deadT = 0; G.clearT = 0; G.death = null;
    G.state = 'playing';
    G.attempts++;
    emit('onAttempt', G.attempts, G.k / hz);
  }

  G.start = (L, levelIndex, { practice = false, attempts = 0, preroll = 0, safe = null } = {}) => {
    G.L = L; G.levelIndex = levelIndex; G.practice = practice; G.safe = safe;
    G.attempts = attempts; G.checkpoints = []; G.preroll = preroll; G.paused = false;
    G.maxX = 0;
    resetAttempt(false);
  };
  G.restart = () => { if (G.L) resetAttempt(G.practice && G.checkpoints.length > 0); };
  G.stop = () => { G.state = 'idle'; G.L = null; };

  // 입력. tick 생략 시 다음 처리 틱에 반영
  G.timeToTick = (t) => Math.floor(t * hz + 1e-9);
  G.tickAtPerf = (perfMs) => G.timeToTick(G.time + (perfMs - G.lastPerf) / 1000);
  function enqueue(tick, down) {
    const t = tick ?? G.k;
    let i = G.queue.length;
    while (i > 0 && G.queue[i - 1].tick > t) i--;
    G.queue.splice(i, 0, { tick: t, down });
  }
  G.press = (tick) => enqueue(tick, true);
  G.release = (tick) => enqueue(tick, false);

  function tickOnce() {
    // 이번 틱까지의 입력 반영 (탭이 한 틱 안에 눌렀다 떼도 down=true로 1틱 반영)
    let edge = false, latch = false;
    while (G.queue.length && G.queue[0].tick <= G.k) {
      const e = G.queue.shift();
      if (e.down) { if (!G.held) edge = true; G.held = true; latch = true; }
      else G.held = false;
    }
    const down = G.held || latch;
    const L = G.L;
    G.prev.x = L.X[G.k]; G.prev.y = G.s.y; G.prevRot = G.rot;
    const r = step(L, G.s, G.k, down, edge);
    const k = G.k;
    G.k++;
    if (r.dead) {
      G.state = 'dead';
      G.death = { x: r.x, y: r.y, cause: r.cause, k: G.k };
      G.s = { ...G.s, y: r.y };
      emit('onDeath', G.death);
      return false;
    }
    G.s = r.s;
    G.ev = r.ev;
    // 회전 연출: 공중에서 회전, 착지하면 90° 스냅
    if (!r.s.g) G.rot += rotRate / hz;
    else G.rot = Math.round(G.rot / 90) * 90;
    if (r.ev) emit('onEvent', r.ev, G);
    if (L.P[k] >= 0) emit('onGate', L.P[k], G);
    const x = L.X[G.k];
    if (x > G.maxX) G.maxX = x;
    // 연습 모드 자동 체크포인트: 안전 지점(practice.js)에 도착하면 저장. 버튼 없음 (오케스트레이터 결정 11)
    if (G.practice && G.safe && isSafe(G.safe, G.k, G.s) && !(G.checkpoints.length && G.checkpoints[G.checkpoints.length - 1].k >= G.k)) {
      G.checkpoints.push({ k: G.k, s: { ...G.s, used: G.s.used.slice() }, rot: Math.round(G.rot / 90) * 90, x, auto: true });
      emit('onCheckpoint', G.checkpoints[G.checkpoints.length - 1]);
    }
    if (r.clear) {
      G.state = 'clear';
      G.clearT = 0;
      emit('onClear', G);
      return false;
    }
    return true;
  }

  // dt초 진행. 물리는 프레임당 최대 maxSteps 틱 (밀린 틱은 다음 호출에서 따라잡음)
  G.advance = (dt, perfNow) => {
    if (perfNow != null) G.lastPerf = perfNow;
    if (G.paused || !G.L) return;
    if (G.state === 'playing') {
      G.time += dt;
      // 대기 중 들어온 tick 지정 없는 입력·과거 입력은 현재 틱으로
      for (const e of G.queue) if (e.tick < G.k) e.tick = G.k;
      let n = 0;
      while (G.state === 'playing' && G.k < G.timeToTick(G.time) && n < maxSteps) {
        tickOnce();
        n++;
      }
      if (G.state === 'playing' && G.k >= G.L.nTicks) { G.state = 'clear'; emit('onClear', G); }
    } else if (G.state === 'dead') {
      G.deadT += dt;
      if (G.deadT >= bal.restart_delay_s) {
        emit('onBeforeRestart', G);
        resetAttempt(G.practice && G.checkpoints.length > 0);
      }
    } else if (G.state === 'clear') {
      G.time += dt;
      G.clearT += dt;
    }
  };

  // 렌더 보간 계수 (직전 틱 → 현재 틱)
  G.alpha = () => {
    if (G.state !== 'playing') return 1;
    const a = G.time * hz - G.k;
    return a < 0 ? 0 : a > 1 ? 1 : a;
  };
  G.x = () => (G.L ? G.L.X[Math.min(G.k, G.L.nTicks)] : 0);
  G.progress = () => (G.L ? Math.min(100, (G.x() / G.L.level.length_tiles) * 100) : 0);

  // 연습 모드 체크포인트
  G.placeCheckpoint = () => {
    if (!G.practice || G.state !== 'playing') return false;
    G.checkpoints.push({ k: G.k, s: { ...G.s, used: G.s.used.slice() }, rot: G.rot, x: G.x() });
    return true;
  };
  G.removeCheckpoint = () => (G.practice && G.checkpoints.length ? (G.checkpoints.pop(), true) : false);

  return G;
}
