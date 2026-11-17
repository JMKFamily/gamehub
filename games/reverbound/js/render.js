// Canvas 2D 렌더 (30-art.md 3~6절). 색은 data/art.json, 판정·크기는 balance.json에서 읽는다.
// 좌표: 게임 월드는 타일 단위 y 위로 +, 바닥 윗면 y=0. 오브젝트 그림은 칸 왼쪽 위 원점, y 아래로 (아트 문서 좌표 그대로).

// 화면 배치 (30-art 5절 표). 가로 = 세로 10타일, 세로(웹) = 가로 14타일
const LAYOUT = { landscapeRows: 10, portraitCols: 14, portraitPlayerX: 0.25, groundRows: 2 };
const GATE_N = { slow: 1, normal: 2, fast: 3, very_fast: 3 };
const GATE_KEY = { slow: 'gateSlow', normal: 'gateNormal', fast: 'gateFast', very_fast: 'gateFast' };
const MAX_PARTICLES = 48;

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createRenderer(canvas, art, bal, { rand = Math.random } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const C = art.common;
  const GIM = art.gimmicks ?? {};
  const R = { W: 0, H: 0, dpr: 1, T: 36, gameTop: 0, gameH: 0, groundPx: 0, playerRatio: bal.player_screen_x_ratio, portrait: false, shakeOn: true, rand };
  // 연출 상태
  const parts = Array.from({ length: MAX_PARTICLES }, () => ({ on: false }));
  const rings = Array.from({ length: 16 }, () => ({ on: false }));
  const fx = { jumpT: 9, landT: 9, deathT: -1, shakeA: 0, shakeT: 0, shakeDur: 0.12, gateT: 9, gateIdx: -1, padHit: new Map(), orbHit: new Map(), clearT: -1, now: 0, orbTrail: [] };
  R.fx = fx;
  let prep = null; // 레벨별 미리 계산

  R.resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth, H = window.innerHeight;
    R.W = W; R.H = H; R.dpr = dpr;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    R.portrait = H > W;
    if (R.portrait) {
      R.T = W / LAYOUT.portraitCols;
      R.gameH = R.T * LAYOUT.landscapeRows;
      R.gameTop = Math.max(0, (H - R.gameH) / 2);
      R.playerRatio = LAYOUT.portraitPlayerX;
    } else {
      R.T = H / LAYOUT.landscapeRows;
      R.gameH = H; R.gameTop = 0;
      R.playerRatio = bal.player_screen_x_ratio;
    }
    R.groundPx = R.gameTop + R.gameH - LAYOUT.groundRows * R.T;
  };

  // ---------------------------------------------------------------- 레벨 준비
  R.prepare = (L) => {
    const objs = L.level.objects;
    // 천장 장애물 묶음 (같은 행, 1칸 간격으로 이어진 것) → 가로 막대 + 줄
    const ceil = objs.filter((o) => o.type === 'spike_ceiling').sort((a, b) => a.y - b.y || a.x - b.x);
    const groups = [];
    for (const o of ceil) {
      const g = groups[groups.length - 1];
      if (g && g.y === o.y && Math.abs(o.x - g.x1) < 0.02) { g.x1 = o.x + 1; g.n++; }
      else groups.push({ x0: o.x, x1: o.x + 1, y: o.y, n: 1 });
    }
    // 맞닿은 블록 묶음 (30-art 3절 규칙 6): 레벨 로드 때 한 번. 모든 블록이 y 0 기둥이라 스카이라인 다각형
    const blocks = objs.filter((o) => o.type === "block").sort((a, b) => a.x - b.x);
    const bgroups = [];
    for (const o of blocks) {
      const g = bgroups[bgroups.length - 1], x1 = o.x + (o.w ?? 1);
      if (g && o.x <= g.x1 + 0.01) { g.items.push(o); g.x1 = Math.max(g.x1, x1); } else bgroups.push({ x0: o.x, x1, items: [o] });
    }
    for (const g of bgroups) {
      const xs = [...new Set(g.items.flatMap((o) => [o.x, o.x + (o.w ?? 1)]))].sort((a, b) => a - b);
      const runs = [];
      for (let i = 0; i + 1 < xs.length; i++) {
        const a = xs[i], b = xs[i + 1], m = (a + b) / 2;
        let h = 0; for (const o of g.items) if (o.x <= m && m <= o.x + (o.w ?? 1)) h = Math.max(h, o.h ?? 1);
        const last = runs[runs.length - 1];
        if (last && Math.abs(last.h - h) < 1e-6) last.b = b; else runs.push({ a, b, h });
      }
      g.runs = runs;
      g.inner = xs.slice(1, -1).map((x) => ({ x, h: Math.min(...runs.filter((r) => r.a <= x + 1e-6 && r.b >= x - 1e-6).map((r) => r.h)) }));
      g.hmax = Math.max(...runs.map((r) => r.h));
      g.wide = runs.reduce((p, r) => (r.b - r.a > p.b - p.a ? r : p), runs[0]);
    }
    // 템포 문 받침 높이: 문 x를 덮는 블록 윗면 (문은 언제나 땅·상자 위, 20-balance 14-3)
    const gateBase = (L.portals || []).map((p) => { let y = 0; for (const o of blocks) if (o.x <= p.x && p.x <= o.x + (o.w ?? 1)) y = Math.max(y, o.h ?? 1); return y; });
    // 배경 도형 (결정적 배치)
    let s = 99 + L.level.id.charCodeAt(1);
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const far = [], mid = [];
    for (let i = 0; i < 60; i++) far.push({ x: i * 9 + r() * 4, h: 3 + r() * 3, w: 2 + r() * 3, k: Math.floor(r() * 3) });
    for (let i = 0; i < 80; i++) mid.push({ x: i * 7 + r() * 3, h: 1.5 + r() * 2.5, w: 1.2 + r() * 2, k: Math.floor(r() * 3), a: r() < 0.35 });
    prep = { L, groups, bgroups, gateBase, far, mid, theme: L.level.theme_id, env: art.palette[L.level.theme_id] ?? art.palette.level1 };
    fx.padHit.clear(); fx.orbHit.clear();
  };

  // ---------------------------------------------------------------- 입자
  function spawn(p) {
    for (const q of parts) if (!q.on) { Object.assign(q, { on: true, rot: 0, vr: 0, g: 0, shape: 'sq' }, p); return q; }
    return null;
  }
  function ring(p) {
    for (const q of rings) if (!q.on) { Object.assign(q, { on: true }, p); return q; }
    return null;
  }
  R.clearFx = () => {
    for (const q of parts) q.on = false;
    for (const q of rings) q.on = false;
    fx.deathT = -1; fx.clearT = -1; fx.shakeA = 0; fx.gateT = 9; fx.jumpT = 9; fx.landT = 9;
    fx.padHit.clear(); fx.orbHit.clear(); fx.orbTrail.length = 0;
  };
  R.onJump = (x, y) => {
    fx.jumpT = 0;
    for (let i = 0; i < 3; i++) spawn({ x: x + 0.2 + i * 0.25, y: y + 0.05, vx: -2 - R.rand() * 3, vy: 1 + R.rand() * 2, life: 0.3, max: 0.3, size: 0.08, color: C.groundEdge, g: 12 });
  };
  R.onLand = (x, y) => {
    fx.landT = 0;
    ring({ kind: 'ripple', x: x + 0.5, y, t: 0, dur: 0.15, delay: 0 });
    ring({ kind: 'ripple', x: x + 0.5, y, t: 0, dur: 0.15, delay: 0.04 });
  };
  R.onPad = (o) => fx.padHit.set(o, 0);
  R.onOrb = (o, px, py) => { fx.orbHit.set(o, 0); fx.orbTrail.push({ x: px, y: py, t: 0 }); };
  R.onGate = (i) => { fx.gateT = 0; fx.gateIdx = i; const sp = prep?.L.portals[i]?.speed; fx.gateFast = sp === 'fast' || sp === 'very_fast'; };
  R.onDeath = (x, y, deathFx, restartS = deathFx) => {
    fx.deathT = 0; fx.deathX = x; fx.deathY = y; fx.deathFx = deathFx; fx.restartS = restartS;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + R.rand() * 0.4;
      const sp = 4 + R.rand() * 5;
      // 조각은 날아가 바닥에 떨어져 멈추고, 재시작 페이드까지 남음 (30-art 6절)
      spawn({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 3, life: restartS, max: restartS, size: 0.26, color: i < 6 ? C.player : C.hazard, shape: 'oct', vr: (R.rand() - 0.5) * 12, g: 18, floor: true });
    }
    ring({ kind: 'burst', x: x + 0.5, y: y + 0.5, t: 0, dur: deathFx * 0.7, delay: 0 });
    ring({ kind: 'burst', x: x + 0.5, y: y + 0.5, t: 0, dur: deathFx * 0.7, delay: 0.06 });
    R.shake(0.12, 0.12);
  };
  R.onClear = (camX) => {
    fx.clearT = 0; fx.clearCam = camX;
    const cols = [C.player, C.trigger, C.gateSlow, C.gateFast, C.groundEdge, ...(art.clear[prep?.theme] ?? [])];
    const topY = (R.groundPx - (R.portrait ? 0 : R.gameTop)) / R.T;
    for (let i = 0; i < 24; i++) spawn({ x: camX + R.rand() * (R.W / R.T), y: topY - 1 + R.rand() * 3, vx: (R.rand() - 0.5) * 2, vy: -R.rand() * 2, life: 1.6, max: 1.6, size: 0.14 + R.rand() * 0.08, color: cols[i % cols.length], vr: (R.rand() - 0.5) * 8, g: 4, shape: i % 2 ? 'sq' : 'circ', world: true });
    R.shake(0.05, 0.2);
  };
  R.shake = (amp, dur) => { if (!R.shakeOn) return; fx.shakeA = amp; fx.shakeT = 0; fx.shakeDur = dur; };

  R.update = (dt) => {
    fx.jumpT += dt; fx.landT += dt; fx.gateT += dt; fx.shakeT += dt;
    if (fx.deathT >= 0) fx.deathT += dt;
    if (fx.clearT >= 0) fx.clearT += dt;
    for (const [k, v] of fx.padHit) fx.padHit.set(k, v + dt);
    for (const [k, v] of fx.orbHit) fx.orbHit.set(k, v + dt);
    for (const tr of fx.orbTrail) tr.t += dt;
    while (fx.orbTrail.length && fx.orbTrail[0].t > 0.15) fx.orbTrail.shift();
    for (const p of parts) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.floor && p.y < 0.13) { p.y = 0.13; p.vy = 0; p.vx *= 0.8; p.vr *= 0.8; }
    }
    for (const q of rings) {
      if (!q.on) continue;
      q.t += dt;
      if (q.t > q.dur + q.delay) q.on = false;
    }
  };

  // ---------------------------------------------------------------- 그리기 도우미
  let T = 36, camX = 0, lw = 0.06;
  const sx = (x) => (x - camX) * T;
  const sy = (y) => R.groundPx - y * T;
  // 칸 왼쪽 위(월드 x, 월드 윗변 y)로 이동하고 타일 단위로 스케일
  function cell(x, yTop) { ctx.save(); ctx.translate(sx(x), sy(yTop)); ctx.scale(T, T); }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
  function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
  const OCT = [0.21, 0.03, 0.79, 0.03, 0.97, 0.21, 0.97, 0.79, 0.79, 0.97, 0.21, 0.97, 0.03, 0.79, 0.03, 0.21];
  const CORE = [0.28, 0.16, 0.72, 0.16, 0.84, 0.28, 0.84, 0.72, 0.72, 0.84, 0.28, 0.84, 0.16, 0.72, 0.16, 0.28];

  function drawBlock(o, env) {
    const w = o.w ?? 1, h = o.h ?? 1;
    cell(o.x, o.y + h);
    rrect(0.03, 0.03, w - 0.06, h - 0.06, 0.04);
    ctx.fillStyle = env.ground; ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = C.outline; ctx.stroke();
    // 안쪽 칸 경계
    ctx.globalAlpha = 0.25; ctx.lineWidth = 0.03; ctx.beginPath();
    for (let i = 1; i < w - 0.05; i++) { ctx.moveTo(i, 0.06); ctx.lineTo(i, h - 0.06); }
    for (let j = 1; j < h; j++) { ctx.moveTo(0.06, j); ctx.lineTo(w - 0.06, j); }
    ctx.stroke();
    // 결 선 (칸마다), 울림 구멍 (가운데 칸 1개)
    ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i + 1 <= w + 0.01; i++) for (let j = 0; j < h; j++) {
      ctx.moveTo(i + 0.14, j + 0.4); ctx.lineTo(i + 0.4, j + 0.4); ctx.moveTo(i + 0.56, j + 0.76); ctx.lineTo(i + 0.86, j + 0.76);
    }
    ctx.stroke();
    ctx.fillStyle = C.outline; ctx.beginPath();
    ctx.arc(Math.floor(w / 2) + 0.62, Math.floor(h / 2) + 0.48, 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.groundEdge; ctx.fillRect(0.06, 0.06, w - 0.12, 0.08);
    ctx.restore();
  }
  // 블록 묶음: 바깥 둘레 경로 하나 (볼록 모서리만 r 0.04), 안쪽 경계 옅은 선, 윗면 띠는 높이 구간마다 한 줄, 장식 1세트
  function drawBlockGroup(g, env) {
    const I = 0.03, rad = 0.04;
    const pts = [[g.x0 + I, I]];
    g.runs.forEach((r, i) => {
      const prevH = i ? g.runs[i - 1].h : 0;
      const xl = i === 0 ? g.x0 + I : r.h > prevH ? r.a + I : r.a - I;
      if (i) pts.push([xl, prevH - I]);
      pts.push([xl, r.h - I]);
      if (i === g.runs.length - 1) pts.push([g.x1 - I, r.h - I], [g.x1 - I, I]);
    });
    // 월드(y 위) → 화면 좌표
    const P = pts.map(([x, y]) => [sx(x), sy(y)]);
    const n = P.length;
    ctx.beginPath();
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(P[n - 1], P[0]);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const a = P[(i + n - 1) % n], b = P[i], c = P[(i + 1) % n];
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      const m = mid(b, c);
      // 화면 좌표(y 아래)에서 시계 방향 경로: cross > 0 = 볼록
      ctx.arcTo(b[0], b[1], m[0], m[1], cross > 0 ? rad * T : 0);
    }
    ctx.closePath();
    ctx.fillStyle = env.ground; ctx.fill();
    ctx.lineWidth = lw * T; ctx.lineJoin = 'miter'; ctx.strokeStyle = C.outline; ctx.stroke();
    // 안쪽 칸 경계 (0.03, 25 %)
    ctx.save(); ctx.translate(sx(0), sy(0)); ctx.scale(T, -T);
    ctx.globalAlpha = 0.25; ctx.lineWidth = 0.03; ctx.beginPath();
    for (const r of g.runs) {
      for (let x = Math.ceil(r.a + 1e-6); x < r.b - 1e-6; x++) { ctx.moveTo(x, 0.06); ctx.lineTo(x, r.h - 0.06); }
      for (let y = 1; y < r.h - 1e-6; y++) { ctx.moveTo(r.a + (r === g.runs[0] ? 0.06 : 0), y); ctx.lineTo(r.b - (r === g.runs[g.runs.length - 1] ? 0.06 : 0), y); }
    }
    for (const e of g.inner) { ctx.moveTo(e.x, 0.06); ctx.lineTo(e.x, e.h - 0.06); }
    ctx.stroke();
    // 장식 1세트: 가장 넓은 면의 가운데 칸
    const w = g.wide, cx = Math.floor((w.a + w.b) / 2 - 0.5 + 1e-6), cy = Math.max(0, Math.floor(w.h / 2 - 0.5 + 1e-6));
    const top = cy + 1; // 칸 윗변 (y 위)
    ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(cx + 0.14, top - 0.4); ctx.lineTo(cx + 0.4, top - 0.4); ctx.moveTo(cx + 0.56, top - 0.76); ctx.lineTo(cx + 0.86, top - 0.76); ctx.stroke();
    ctx.fillStyle = C.outline; ctx.beginPath(); ctx.arc(cx + 0.62, top - 0.48, 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // 윗면 띠: 높이 구간마다 끊김 없는 한 줄, 계단 턱에서만 끊김
    ctx.fillStyle = C.groundEdge;
    g.runs.forEach((r, i) => {
      const lh = i ? g.runs[i - 1].h : 0, rh = i < g.runs.length - 1 ? g.runs[i + 1].h : 0;
      const a = i === 0 || lh < r.h ? r.a + 0.06 : r.a, b = i === g.runs.length - 1 || rh < r.h ? r.b - 0.06 : r.b - 0.03;
      ctx.fillRect(a, r.h - 0.14, b - a, 0.08);
    });
    ctx.restore();
  }
  // 얇은 판 (30-art 부록 B-3): 두께 = platform_visual_t(판정 platform_thickness_t와 같음, 외곽선 포함), 받침 없음, 윗면 띠 0.04
  const PLAT_T = GIM.platform_visual_t ?? bal.platform_thickness_t;
  function drawPlatform(o, env) {
    const w = o.w ?? 1;
    cell(o.x, o.y + 1);
    rrect(0.03, 0.03, w - 0.06, PLAT_T - 0.06, 0.04);
    ctx.fillStyle = env.ground; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.fillStyle = C.groundEdge; ctx.fillRect(0.06, 0.06, w - 0.12, 0.04);
    ctx.restore();
  }
  function drawSpike(o, kind) {
    cell(o.x, o.y + 1);
    ctx.lineJoin = 'miter'; ctx.lineWidth = lw; ctx.strokeStyle = C.outline; ctx.fillStyle = C.hazard;
    if (kind === 'spike') { poly([0.1, 1, 0.5, 0.08, 0.9, 1]); ctx.fill(); ctx.stroke(); poly([0.5, 0.44, 0.38, 0.97, 0.62, 0.97]); }
    else if (kind === 'spike_low') {
      const top = 1 - bal.spike_low_visual_h_t;
      poly([0.26, 1, 0.5, top, 0.74, 1]); ctx.fill(); ctx.stroke(); poly([0.5, top + 0.21, 0.43, 0.97, 0.57, 0.97]);
    } else { poly([0.1, 0, 0.5, 0.92, 0.9, 0]); ctx.fill(); ctx.stroke(); poly([0.5, 0.56, 0.38, 0.03, 0.62, 0.03]); }
    ctx.globalAlpha = 0.35; ctx.fillStyle = C.outline; ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
  }
  const STRING_EVERY = GIM.ceiling_string_every ?? 4;
  R.hangerStrings = (g) => {
    if (g.n === 1) return [g.x0 + 0.5];
    const xs = [g.x0 + 0.15];
    for (let c = STRING_EVERY; c < g.n; c += STRING_EVERY) xs.push(g.x0 + c);
    xs.push(g.x1 - 0.15);
    return xs;
  };
  function drawHangers(env) {
    const top = R.gameTop;
    for (const g of prep.groups) {
      if (g.x1 < camX - 1 || g.x0 > camX + R.W / T + 1) continue;
      const yTop = sy(g.y + 1); // 칸 윗변 (가시 밑변)
      const barH = g.n === 1 ? 0 : 0.08 * T;
      ctx.strokeStyle = env.ground; ctx.lineWidth = Math.max(0.05 * T, 1); ctx.lineCap = 'butt';
      ctx.beginPath();
      for (const x of R.hangerStrings(g)) { ctx.moveTo(sx(x), top); ctx.lineTo(sx(x), yTop - barH); }
      ctx.stroke();
      if (g.n > 1) {
        ctx.beginPath(); ctx.rect(sx(g.x0), yTop - barH, (g.x1 - g.x0) * T, barH);
        ctx.fillStyle = env.ground; ctx.fill(); ctx.lineWidth = lw * T; ctx.strokeStyle = C.outline; ctx.stroke();
      }
    }
  }
  function drawPad(o) {
    const t = fx.padHit.get(o);
    const k = t != null && t < 0.12 ? t / 0.12 : 1;
    cell(o.x, o.y + 1);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.trigger; ctx.lineWidth = 0.05;
    const up = t != null && t < 0.12 ? 0.3 * k : 0;
    const fade = t != null && t < 0.12 ? 1 - k : 1;
    if (t == null || t < 0.12 || t > 0.6) {
      const a = t != null && t > 0.6 ? Math.min(1, (t - 0.6) * 4) : fade;
      ctx.globalAlpha = 0.45 * a; ctx.beginPath(); ctx.moveTo(0.3, 0.58 - up); ctx.quadraticCurveTo(0.5, 0.46 - up, 0.7, 0.58 - up); ctx.stroke();
      ctx.globalAlpha = 0.7 * a; ctx.beginPath(); ctx.moveTo(0.2, 0.68 - up); ctx.quadraticCurveTo(0.5, 0.52 - up, 0.8, 0.68 - up); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const sq = t != null && t < 0.12 ? 0.7 + 0.3 * k : 1;
    ctx.beginPath(); ctx.ellipse(0.5, 1, 0.42, 0.25 * sq, 0, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = C.trigger; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.fillStyle = C.groundEdge; ctx.beginPath(); ctx.arc(0.5, 1 - 0.1 * sq, 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawOrb(o, beatPulse) {
    const t = fx.orbHit.get(o);
    cell(o.x, o.y + 1);
    ctx.strokeStyle = C.trigger; ctx.lineWidth = 0.03; ctx.globalAlpha = 0.5; ctx.setLineDash([0.07, 0.07]);
    ctx.beginPath(); ctx.arc(0.5, 0.5, 0.58 + 0.02 * beatPulse, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (t != null && t < 0.15) {
      const k = t / 0.15;
      ctx.globalAlpha = 1 - k; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.arc(0.5, 0.5, 0.33 + 0.27 * k, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    const used = t != null;
    ctx.globalAlpha = used ? 0.35 : 1;
    ctx.beginPath(); ctx.arc(0.5, 0.5, 0.33, 0, Math.PI * 2);
    ctx.lineWidth = 0.16; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.lineWidth = 0.1; ctx.strokeStyle = C.trigger; ctx.stroke();
    ctx.beginPath(); ctx.arc(0.5, 0.5, 0.08, 0, Math.PI * 2); ctx.fillStyle = C.trigger; ctx.fill(); ctx.lineWidth = 0.03; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function drawGate(p, i) {
    const col = C[GATE_KEY[p.speed]], n = GATE_N[p.speed] ?? 2;
    const base = GIM.gate_rest_on_support === false ? 0 : prep.gateBase[i] ?? 0;
    cell(p.x - 0.5, base + 3);
    const flash = fx.gateIdx === i && fx.gateT < 0.1;
    rrect(0.18, 0.06, 0.64, 2.88, 0.32);
    ctx.globalAlpha = flash ? 1 : 0.12; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 0.08; ctx.strokeStyle = col; ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0.5, 0.4, 0.07, 0, Math.PI * 2); ctx.arc(0.5, 2.6, 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.09; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (flash) ctx.strokeStyle = C.outline;
    for (let j = 0; j < n; j++) {
      const x = 0.4 + 0.18 * (j - (n - 1) / 2);
      ctx.beginPath(); ctx.moveTo(x, 1.26); ctx.lineTo(x + 0.2, 1.5); ctx.lineTo(x, 1.74); ctx.stroke();
    }
    ctx.restore();
  }
  function drawPlayer(x, y, rot, corePulse) {
    let sxk = 1, syk = 1;
    if (fx.jumpT < 0.06) { const k = 1 - fx.jumpT / 0.06; sxk = 1 + 0.12 * k; syk = 1 - 0.12 * k; }
    else if (fx.landT < 0.05) { syk = 0.9 + 0.1 * (fx.landT / 0.05); }
    ctx.save();
    ctx.translate(sx(x + 0.5), sy(y) - (0.5 * syk) * T);
    ctx.scale(T * sxk, T * syk);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.translate(-0.5, -0.5);
    ctx.lineJoin = 'round';
    poly(OCT); ctx.fillStyle = C.player; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.save(); ctx.translate(0.5, 0.5); ctx.scale(corePulse, corePulse); ctx.translate(-0.5, -0.5);
    poly(CORE); ctx.globalAlpha = 0.3; ctx.fillStyle = C.playerCore; ctx.fill(); ctx.lineWidth = 0.03; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.restore();
    ctx.beginPath(); ctx.arc(0.66, 0.34, 0.13, 0, Math.PI * 2); ctx.fillStyle = C.playerAccent; ctx.fill(); ctx.lineWidth = 0.04; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.restore();
  }

  // 배경 모티프 (30-art 1절): 둥근 도형만, 외곽선 없음
  // 레벨 4~10 모티프 (30-art 2-1 "배경 모양 키" → art.json motifs). 둥근 도형만, 고드름(stalactite)은 30-art에서 거부되어 없음
  function shape(kind, x, base, w, h, color, accent) {
    const circ = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill(); };
    ctx.fillStyle = color; ctx.strokeStyle = color;
    switch (kind) {
      case 'drop': { // 물방울: 원 + 둥근 꼭지 원(반경 0.34r ≈ 도형 폭의 17 %) + 사이 면. 뾰족한 꼭짓점 없음 (30-art 2-1)
        const r = w * 0.4, cx = x + w / 2, cy = base - h * 0.5, tr = r * 0.34, ty = cy - r * 1.3;
        circ(cx, cy, r); circ(cx, ty, tr);
        ctx.beginPath(); ctx.moveTo(cx - r * 0.82, cy - r * 0.58); ctx.lineTo(cx - tr, ty); ctx.lineTo(cx + tr, ty); ctx.lineTo(cx + r * 0.82, cy - r * 0.58); ctx.closePath(); ctx.fill();
        break;
      }
      case 'drops': for (let i = 0; i < 3; i++) circ(x + w * (0.2 + i * 0.3), base - h * (0.4 + (i % 2) * 0.3), w * 0.12); break;
      case 'cloud': circ(x + w * 0.3, base - h * 0.5, w * 0.25); circ(x + w * 0.55, base - h * 0.62, w * 0.3); circ(x + w * 0.8, base - h * 0.5, w * 0.22); rrect(x + w * 0.1, base - h * 0.5, w * 0.85, w * 0.22, w * 0.11); ctx.fill(); break;
      case 'wheels': circ(x + w * 0.25, base - w * 0.25, w * 0.22); circ(x + w * 0.75, base - w * 0.25, w * 0.22); rrect(x, base - h * 0.75, w, h * 0.35, w * 0.08); ctx.fill(); break;
      case 'rail': ctx.lineWidth = Math.max(2, h * 0.1); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - w, base - h * 0.5); ctx.lineTo(x + w * 2, base - h * 0.5); ctx.stroke(); for (let i = 0; i < 4; i++) { rrect(x - w + i * w * 0.8, base - h * 0.5, w * 0.12, h * 0.5, w * 0.05); ctx.fill(); } break;
      case 'hill': ctx.beginPath(); ctx.ellipse(x + w / 2, base, w * 0.9, h * 0.55, 0, Math.PI, 0); ctx.fill(); break;
      case 'bubble': circ(x + w / 2, base - h * 0.6, w * 0.45); break;
      case 'bubbles': circ(x + w * 0.3, base - h * 0.7, w * 0.18); circ(x + w * 0.7, base - h * 0.45, w * 0.26); break;
      case 'arch': ctx.lineWidth = w * 0.2; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - h + w / 2); ctx.arc(x + w / 2, base - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, base); ctx.stroke(); break;
      case 'flower': { const cx = x + w / 2, cy = base - h * 0.7; ctx.lineWidth = Math.max(2, w * 0.08); ctx.beginPath(); ctx.moveTo(cx, base); ctx.lineTo(cx, cy); ctx.stroke(); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; circ(cx + Math.cos(a) * w * 0.2, cy + Math.sin(a) * w * 0.2, w * 0.14); } if (accent) { ctx.fillStyle = accent; circ(cx, cy, w * 0.1); } break; }
      case 'shell': circ(x + w * 0.45, base - w * 0.35, w * 0.35); if (accent) { ctx.fillStyle = accent; circ(x + w * 0.45, base - w * 0.35, w * 0.16); ctx.fillStyle = color; } rrect(x, base - w * 0.12, w, w * 0.12, w * 0.06); ctx.fill(); break;
      case 'sun': ctx.fillStyle = prep?.env.bgAccent ?? color; ctx.beginPath(); ctx.arc(x + w / 2, base, w * 0.6, Math.PI, 0); ctx.fill(); break; // 30-art 2-1: 해는 bgAccent 면만
      case 'stage': ctx.lineWidth = Math.max(2, w * 0.1); ctx.beginPath(); ctx.arc(x + w / 2, base, w * 0.8, Math.PI, 0); ctx.stroke(); break;
      default: circ(x + w / 2, base - h / 2, w * 0.4);
    }
  }
  function motif(theme, k, x, base, w, h, color, accent, lit) {
    ctx.fillStyle = color;
    const gen = art.motifs?.[theme];
    if (gen && !['level1', 'level2', 'level3'].includes(theme)) { shape(gen[k % gen.length], x, base, w, h, color, accent); return; }
    if (theme === 'level1') {
      if (k === 0) { // 소리굽쇠 U 기둥
        const bw = w * 0.22;
        rrect(x, base - h, bw, h, bw / 2); ctx.fill(); rrect(x + w - bw, base - h, bw, h, bw / 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w / 2, base - h * 0.35, w / 2, 0, Math.PI); ctx.lineWidth = bw; ctx.strokeStyle = color; ctx.stroke();
        rrect(x + w / 2 - bw / 2, base - h * 0.35 + w / 2, bw, h * 0.35, bw / 2); ctx.fill();
      } else if (k === 1) { // 공명 상자 더미
        rrect(x, base - h * 0.5, w, h * 0.5, w * 0.08); ctx.fill(); rrect(x + w * 0.15, base - h * 0.9, w * 0.6, h * 0.42, w * 0.08); ctx.fill();
      } else { // 먼 작은 종탑
        rrect(x + w * 0.3, base - h, w * 0.4, h, w * 0.06); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w / 2, base - h, w * 0.28, Math.PI, 0); ctx.fill();
        if (accent) { ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x + w / 2, base - h * 0.75, w * 0.1, 0, Math.PI * 2); ctx.fill(); }
      }
    } else if (theme === 'level2') {
      if (k === 0) { // 노점 천막
        rrect(x, base - h * 0.55, w, h * 0.55, w * 0.05); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + w / 2, base - h * 0.55, w * 0.6, h * 0.3, 0, Math.PI, 0); ctx.fill();
      } else if (k === 1) { // 늘어진 현 다리
        ctx.lineWidth = Math.max(2, h * 0.12); ctx.strokeStyle = color; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - w, base - h); ctx.quadraticCurveTo(x + w / 2, base - h * 0.4, x + w * 2, base - h); ctx.stroke();
      } else { // 둥근 등불
        ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(x + w / 2, base - h * 1.6); ctx.lineTo(x + w / 2, base - h); ctx.stroke();
        ctx.fillStyle = lit && accent ? accent : color;
        ctx.beginPath(); ctx.arc(x + w / 2, base - h + w * 0.3, w * 0.3, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      if (k === 0) { // 종탑 벽 아치
        ctx.lineWidth = w * 0.2; ctx.strokeStyle = color;
        ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - h + w / 2); ctx.arc(x + w / 2, base - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, base); ctx.stroke();
      } else if (k === 1) { // 둥근 톱니바퀴
        const r = Math.min(w, h) * 0.45, cx = x + w / 2, cy = base - h * 0.6;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.2, 0, Math.PI * 2); ctx.fill(); }
        if (accent) { ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2); ctx.fill(); }
      } else { // 매달린 종
        ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(x + w / 2, R.gameTop); ctx.lineTo(x + w / 2, base - h * 1.2); ctx.stroke();
        ctx.fillStyle = lit && accent ? accent : color;
        ctx.beginPath(); ctx.moveTo(x + w * 0.15, base - h * 0.6); ctx.quadraticCurveTo(x + w * 0.2, base - h * 1.3, x + w / 2, base - h * 1.3);
        ctx.quadraticCurveTo(x + w * 0.8, base - h * 1.3, x + w * 0.85, base - h * 0.6); ctx.arc(x + w / 2, base - h * 0.6, w * 0.35, 0, Math.PI); ctx.closePath(); ctx.fill();
      }
    }
  }

  // ---------------------------------------------------------------- 메인 그리기
  // view: {G, x, y, rot, beat, beatS, intensity, sectionName, dead, cleared, menuScroll}
  R.draw = (view) => {
    const env = prep ? prep.env : art.palette.level1;
    const theme = prep ? prep.theme : 'level1';
    T = R.T;
    lw = Math.max(0.06 * T, 1.5) / T;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    // 박자 펄스 (킥마다 bg→bgPulse→bg 0.12 s)
    const beatFrac = view.beat - Math.floor(view.beat);
    const since = beatFrac * view.beatS;
    let pulse = view.beat >= 0 ? clamp01(1 - since / 0.12) : 0;
    const inten = view.intensity ?? 0;
    pulse *= inten === 0 ? 0.5 : 1;
    // 번개 (level3 fast_drop, 마디 첫 박, 흔들림 설정으로 끔)
    let light = 0;
    if (theme === 'level3' && inten >= 4 && R.shakeOn && view.beat >= 0) {
      const bar = view.beat / 4, bf = (bar - Math.floor(bar)) * 4 * view.beatS;
      light = bf < 0.05 ? bf / 0.05 : clamp01(1 - (bf - 0.05) / 0.25);
    }
    const bgCol = mix(env.bg, env.bgPulse, Math.max(pulse, light));
    // 흔들림
    let ox = 0, oy = 0;
    if (fx.shakeA > 0 && fx.shakeT < fx.shakeDur && R.shakeOn) {
      const k = 1 - fx.shakeT / fx.shakeDur;
      ox = Math.sin(fx.shakeT * 90) * fx.shakeA * T * k; oy = Math.cos(fx.shakeT * 70) * fx.shakeA * T * k;
    }
    ctx.fillStyle = env.bg; ctx.fillRect(0, 0, R.W, R.H);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = bgCol; ctx.fillRect(-20, R.gameTop - 20, R.W + 40, R.gameH + 40);

    camX = view.camX;
    // 먼 배경 2겹 (0.2배, 0.5배)
    const base = R.groundPx;
    const scale = inten >= 2 ? 1 + 0.03 * pulse : 1;
    const farCol = light > 0 ? mix(env.bgFar, env.bgPulse, light) : env.bgFar;
    const accentOn = inten >= 3 && pulse > 0.3;
    if (prep) {
      for (const [layer, par, sz] of [[prep.far, 0.2, 1.6], [prep.mid, 0.5, 1]]) {
        const off = camX * par;
        for (const m of layer) {
          const x0 = (m.x - off) * T;
          const w = m.w * T * sz, h = m.h * T * sz;
          if (x0 + w * 2 < -50 || x0 - w > R.W + 50) continue;
          ctx.save();
          if (scale !== 1) { ctx.translate(x0 + w / 2, base); ctx.scale(scale, scale); ctx.translate(-(x0 + w / 2), -base); }
          const lit = theme === 'level2' && (inten >= 4 || (accentOn && m.a)) ? true : theme === 'level2' && inten >= 3 ? m.a && Math.floor(view.beat) % 2 === 0 : false;
          motif(theme, m.k, x0, base - (par === 0.2 ? T * 0.6 : 0), w, h, farCol, par === 0.5 && (m.a || accentOn) ? env.bgAccent : null, lit);
          ctx.restore();
        }
      }
    }
    // 바닥
    // 세로 모드는 게임 영역 아래를 bg로 남김 (30-art 5절)
    const gBottom = R.portrait ? R.gameTop + R.gameH : R.H + 20;
    ctx.fillStyle = env.ground; ctx.fillRect(-20, base, R.W + 40, gBottom - base);
    ctx.globalAlpha = 0.25; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(1, 0.03 * T); ctx.beginPath();
    for (let gx = Math.floor(camX); gx < camX + R.W / T + 1; gx++) { ctx.moveTo(sx(gx), base + 0.14 * T); ctx.lineTo(sx(gx), gBottom); }
    ctx.moveTo(0, base + T); ctx.lineTo(R.W, base + T); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.groundEdge; ctx.fillRect(-20, base + 0.03 * T, R.W + 40, 0.08 * T);
    ctx.fillStyle = C.outline; ctx.fillRect(-20, base - lw * T / 2, R.W + 40, lw * T);
    // 분홍 문 속도선 (부록 B-5): 화면 위아래 가장자리 가로선 4줄, bgPulse 색, 왼쪽으로 흐름, 0.3 s. 위 2줄 = HUD 띠 바로 아래, 아래 2줄 = 바닥 띠 안
    if (fx.gateFast && fx.gateT < 0.3) {
      const k = fx.gateT / 0.3;
      ctx.fillStyle = env.bgPulse;
      const ys = [R.gameTop + 1.35 * T, R.gameTop + 1.65 * T, base + 0.75 * T, base + 1.25 * T];
      ys.forEach((yy, i) => { const len = R.W * (0.35 + 0.1 * (i % 2)); ctx.fillRect(R.W * (1 - 1.6 * k) + (i * 53) % 140, yy, len, Math.max(2, 0.06 * T)); });
    }

    // 입자 (오브젝트 아래)
    for (const p of parts) {
      if (!p.on || p.shape === 'oct' || p.world) continue;
      ctx.globalAlpha = clamp01(p.life / p.max); ctx.fillStyle = p.color;
      ctx.fillRect(sx(p.x), sy(p.y), p.size * T, p.size * T);
    }
    ctx.globalAlpha = 1;
    // 착지 파문·사망 고리
    for (const q of rings) {
      if (!q.on || q.t < q.delay) continue;
      const k = clamp01((q.t - q.delay) / q.dur);
      ctx.globalAlpha = (q.kind === 'ripple' ? 0.6 : 0.8) * (1 - k);
      ctx.beginPath();
      if (q.kind === 'ripple') { ctx.ellipse(sx(q.x), sy(q.y), (0.3 + 0.6 * k) * T, (0.08 + 0.1 * k) * T, 0, 0, Math.PI * 2); ctx.strokeStyle = C.groundEdge; }
      else { ctx.arc(sx(q.x), sy(q.y), 1.5 * k * T, 0, Math.PI * 2); ctx.strokeStyle = C.playerCore; }
      ctx.lineWidth = Math.max(1.5, 0.06 * T); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 오브젝트
    if (prep) {
      const L = prep.L, objs = L.level.objects;
      const xl = camX - 1, xr = camX + R.W / T + 1;
      drawHangers(env);
      for (const g of prep.bgroups) if (g.x1 >= xl && g.x0 <= xr) drawBlockGroup(g, env);
      let lo = 0, hi = objs.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (objs[m].x < xl - 25) lo = m + 1; else hi = m; }
      for (let i = lo; i < objs.length; i++) {
        const o = objs[i];
        if (o.x > xr) break;
        if (o.x + (o.w ?? 1) < xl) continue;
        switch (o.type) {
          case 'block': break; // 묶음으로 그림 (drawBlockGroup)
          case 'platform': drawPlatform(o, env); break;
          case 'pad': drawPad(o); break;
          case 'orb': drawOrb(o, pulse); break;
          default: drawSpike(o, o.type);
        }
      }
      L.portals.forEach((p, i) => { if (p.x > xl - 1 && p.x < xr + 1) drawGate(p, i); });
      // 연습 모드 자동 체크포인트 표식: 깃대 + 민트 깃발 (판정 없음)
      if (view.cp && view.cp.x > xl - 1 && view.cp.x < xr + 1) {
        const fx0 = sx(view.cp.x + 0.5), fy0 = sy(view.cp.s.y);
        ctx.fillStyle = C.hud; ctx.fillRect(fx0 - 0.03 * T, fy0 - 1.4 * T, 0.06 * T, 1.4 * T);
        poly([fx0 + 0.03 * T, fy0 - 1.4 * T, fx0 + 0.6 * T, fy0 - 1.2 * T, fx0 + 0.03 * T, fy0 - 1.0 * T]);
        ctx.fillStyle = C.trigger; ctx.fill(); ctx.lineWidth = Math.max(1, 0.04 * T); ctx.strokeStyle = C.outline; ctx.stroke();
      }
      // 결승선 (판정 없음): 바닥 위 얇은 세로 띠
      const fxp = sx(L.level.length_tiles);
      if (fxp > -10 && fxp < R.W + 10) { ctx.globalAlpha = 0.5; ctx.fillStyle = C.groundEdge; ctx.fillRect(fxp, R.gameTop + 1.2 * T, Math.max(2, 0.06 * T), base - R.gameTop - 1.2 * T); ctx.globalAlpha = 1; }
    }
    // 클리어: 색이 돌아온 판 (결승선부터 오른쪽→왼쪽)
    if (fx.clearT >= 0 && prep) {
      const cols = art.clear[theme] ?? [C.player];
      const k = clamp01(fx.clearT / 1.2);
      const fxp = Math.min(R.W, sx(prep.L.level.length_tiles));
      const left = fxp - k * (fxp + 40);
      // 세로 모드는 화면 전체 높이 (30-art 5-7), 가로는 바닥 위
      const y0 = R.portrait ? -20 : R.gameTop, y1 = R.portrait ? R.H + 20 : base;
      const bandH = (y1 - y0) / cols.length;
      ctx.globalAlpha = 0.9;
      cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(left, y0 + i * bandH, R.W - left + 20, bandH + 1); });
      ctx.globalAlpha = 1;
      if (theme === 'level3') { // 큰 종 실루엣이 한 번 흔들림
        const sw = Math.sin(fx.clearT * 8) * Math.exp(-fx.clearT * 2) * 0.3;
        ctx.save(); ctx.translate(R.W * 0.7, R.gameTop + 1.4 * T); ctx.rotate(sw); ctx.fillStyle = C.outline; ctx.globalAlpha = 0.85 * k;
        const w = 2.4 * T, h = 2.6 * T;
        ctx.beginPath(); ctx.moveTo(-w * 0.35, h * 0.7); ctx.quadraticCurveTo(-w * 0.3, 0, 0, 0); ctx.quadraticCurveTo(w * 0.3, 0, w * 0.35, h * 0.7);
        ctx.lineTo(w * 0.5, h * 0.85); ctx.lineTo(-w * 0.5, h * 0.85); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(0, h * 0.95, w * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); ctx.globalAlpha = 1;
      }
    }
    // 오브 잔상
    for (const tr of fx.orbTrail) {
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = (1 - tr.t / 0.15) * (0.5 - i * 0.12); ctx.fillStyle = C.trigger;
        ctx.beginPath(); ctx.arc(sx(tr.x + 0.5 - i * 0.35 - tr.t * 3), sy(tr.y + 0.5), 0.3 * T, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // 플레이어
    if (view.showPlayer) drawPlayer(view.x, view.y, view.rot, 1 + 0.12 * clamp01(1 - since / 0.12) * (view.beat >= 0 ? 1 : 0));
    // 사망 조각, 종이 조각
    for (const p of parts) {
      if (!p.on || !(p.shape === 'oct' || p.world)) continue;
      ctx.save(); ctx.globalAlpha = p.floor ? 1 : clamp01(p.life / p.max * 2);
      ctx.translate(sx(p.x), sy(p.y)); ctx.rotate(p.rot); ctx.scale(p.size * T, p.size * T);
      ctx.fillStyle = p.color;
      if (p.shape === 'oct') { ctx.translate(-0.5, -0.5); poly(OCT); ctx.fill(); }
      else if (p.shape === 'circ') { ctx.beginPath(); ctx.arc(0, 0, 0.5, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-0.5, -0.5, 1, 1);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // 사망 후 페이드 (bg 0→100%)
    if (fx.deathT >= 0) {
      const end = fx.restartS ?? fx.deathFx, fs = end - 0.15;
      const a = clamp01((fx.deathT - fs) / 0.15);
      if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = env.bg; ctx.fillRect(0, 0, R.W, R.H); ctx.globalAlpha = 1; }
    }
  };
  R.ctx = ctx;
  R.prepData = () => prep;
  return R;
}
