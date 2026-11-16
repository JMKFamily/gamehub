#!/usr/bin/env node
// 레벨 클리어 가능성 검증기 (runner-01)
//
// 사용법:
//   node tools/verify-levels.mjs                 # balance.json 의 levels 전부
//   node tools/verify-levels.mjs levels/02-level2.json
//   node tools/verify-levels.mjs --json          # 결과를 JSON 으로 출력 (빌드·리뷰 자동화용)
//   node tools/verify-levels.mjs --inputs        # 찾은 입력열(탭 시각)도 출력
//
// 하는 일
//   1) 20-balance.md 4장의 물리 규칙을 그대로 240 Hz 고정 스텝으로 시뮬레이션한다.
//   2) 틱마다 "지금 탭한다 / 안 한다" 두 갈래를 너비 우선으로 펼쳐(같은 상태는 합침)
//      끝까지 살아남는 입력열이 하나라도 있는지 찾는다 → 없으면 FAIL.
//   3) 찾은 입력열의 탭마다 앞뒤로 몇 ms 어긋나도 클리어되는지(타이밍 창)를 재고,
//      창 가운데로 탭을 옮겨 "사람이 노릴 입력열"을 만든다.
//      최소 창이 balance.json verify_min_window_ms 보다 작으면 FAIL.
//   4) 무입력 / 계속 누르기(홀드)만으로 클리어되면 FAIL (레벨이 의미 없음).
//
// 빌드 쪽에서 import 해서 같은 물리를 재사용할 수 있게 함수도 export 한다.

import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..');
const EPS = 1e-9;

export function loadBalance(path = join(PROJECT, 'balance.json')) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// ---------------------------------------------------------------- compile
export function compileLevel(level, bal) {
  const dt = 1 / bal.physics_hz;
  const speeds = bal.speeds_t_s;
  const solids = [];   // {x0,x1,y0,y1,platform}
  const hazards = [];  // {x0,x1,y0,y1,type,x,y}
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
  // 수평 위치는 입력과 무관하므로 틱별 x를 미리 계산한다.
  const portals = [...(level.speed_changes ?? [])].sort((a, b) => a.x - b.x);
  for (const p of portals) if (!(p.speed in speeds)) throw new Error(`알 수 없는 speed: ${p.speed}`);
  const X = [0];
  const V = [];
  let x = level.player_start?.x ?? 0;
  X[0] = x;
  let v = speeds[level.start_speed];
  let pi = 0;
  const maxTicks = Math.ceil((level.length_tiles / speeds.slow + 5) * bal.physics_hz);
  let k = 0;
  while (x < level.length_tiles && k < maxTicks) {
    // 속도 변경 지점: 플레이어 중심(x+0.5)이 지점 x를 넘은 틱부터 적용
    while (pi < portals.length && x + 0.5 >= portals[pi].x) { v = speeds[portals[pi].speed]; pi++; }
    V.push(v);
    x += v * dt;
    X.push(x);
    k++;
  }
  // 버킷 (1타일 단위)
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
  return { level, bal, dt, X, V, nTicks: X.length - 1, solids, hazards, pads, orbs, buckets };
}

function near(L, x) {
  const out = new Set();
  for (let b = Math.floor(x) - 1; b <= Math.floor(x) + 2; b++) {
    const arr = L.buckets.get(b);
    if (arr) for (const it of arr) out.add(it);
  }
  return out;
}

const ov = (a0, a1, b0, b1) => a0 < b1 - EPS && b0 < a1 - EPS;

// ---------------------------------------------------------------- step
// state: {y, vy, g (grounded), used: number[] (이미 쓴 pad/orb id)}
// down: 이번 틱에 버튼이 눌려 있음, edge: 이번 틱에 새로 눌림
// 반환: {s, dead, clear, cause}
export function step(L, s, k, down, edge) {
  const b = L.bal, dt = L.dt;
  const x = L.X[k], nx = L.X[k + 1];
  let { y, vy, g } = s;
  let used = s.used;
  const inner = b.player_inner_hitbox_t, ilo = 0.5 - inner / 2, ihi = 0.5 + inner / 2;

  // 1) 입력: 공중 재점프 트리거(새로 누름 + 겹침) 우선, 아니면 지면 점프(눌려 있음 + 접지)
  let acted = false;
  if (edge || (!b.input_orb_requires_new_press && down)) {
    for (const it of near(L, x)) {
      if (it.kind !== 'orb' || used.includes(it.o.id)) continue;
      if (ov(x, x + 1, it.o.x0, it.o.x1) && ov(y, y + 1, it.o.y0, it.o.y1)) {
        vy = b.orb_velocity_t_s; g = false; used = [...used, it.o.id]; acted = true; break;
      }
    }
  }
  if (!acted && g && (b.input_hold_rejump ? down : edge)) { vy = b.jump_velocity_t_s; g = false; }

  // 2) 적분 (등가속 정확해, 낙하 속도 상한)
  let nvy = vy - b.gravity_t_s2 * dt;
  if (nvy < -b.max_fall_speed_t_s) nvy = -b.max_fall_speed_t_s;
  let ny = y + 0.5 * (vy + nvy) * dt;
  g = false;

  const items = near(L, nx);
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

  // 4) 발판형 자동 점프
  for (const it of items) {
    if (it.kind !== 'pad' || used.includes(it.o.id)) continue;
    const o = it.o;
    if (ov(nx, nx + 1, o.x0, o.x1) && ov(ny, ny + 1, o.y0, o.y1)) {
      nvy = b.pad_velocity_t_s; g = false; used = [...used, o.id];
    }
  }

  // 5) 사망 판정: 즉사 장애물은 몸체 박스, 블록은 안쪽 작은 박스
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
  // 지나간 pad/orb 기록은 정리 (상태 합치기용)
  if (used.length) {
    const keep = used.filter((id) => {
      const o = [...L.pads, ...L.orbs].find((q) => q.id === id);
      return o.x1 > nx - 0.01;
    });
    if (keep.length !== used.length) used = keep;
  }
  const clear = nx >= L.level.length_tiles;
  return { s: { y: ny, vy: nvy, g, used }, clear };
}

const keyOf = (s) => `${s.y.toFixed(6)}|${s.vy.toFixed(5)}|${s.g ? 1 : 0}|${s.used.join(',')}`;
const startState = (L) => ({ y: L.level.player_start?.y ?? 0, vy: 0, g: true, used: [] });

function canPress(L, s, k) {
  if (s.g) return true;
  const x = L.X[k];
  for (const it of near(L, x)) {
    if (it.kind !== 'orb' || s.used.includes(it.o.id)) continue;
    if (ov(x, x + 1, it.o.x0, it.o.x1) && ov(s.y, s.y + 1, it.o.y0, it.o.y1)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- search
export function search(L) {
  let layer = new Map([[keyOf(startState(L)), { s: startState(L), path: null }]]);
  let maxLayer = 1;
  let furthest = { k: 0, x: 0, cause: '' };
  for (let k = 0; k < L.nTicks; k++) {
    const next = new Map();
    for (const { s, path } of layer.values()) {
      const opts = canPress(L, s, k) ? [false, true] : [false];
      for (const p of opts) {
        const r = step(L, s, k, p, p);
        if (r.dead) {
          if (k >= furthest.k) furthest = { k, x: r.x, cause: r.cause };
          continue;
        }
        const np = p ? { k, prev: path } : path;
        if (r.clear) return { ok: true, presses: unwind(np), maxLayer };
        const key = keyOf(r.s);
        if (!next.has(key)) next.set(key, { s: r.s, path: np });
      }
    }
    if (next.size === 0) return { ok: false, furthest, maxLayer };
    if (next.size > maxLayer) maxLayer = next.size;
    layer = next;
  }
  return { ok: false, furthest, maxLayer };
}

function unwind(node) {
  const out = [];
  for (let n = node; n; n = n.prev) out.push(n.k);
  return out.reverse();
}

// 탭 목록(틱)으로 재생. trace=true면 틱별 상태 저장
export function simulate(L, presses, { trace = false, hold = false, from = null } = {}) {
  const set = new Set(presses);
  let s = from ? from.s : startState(L);
  let k0 = from ? from.k : 0;
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

// 탭 i 하나만 d틱 옮겼을 때도 클리어되는지. 기준 궤적과 다시 같아지면 성공으로 본다.
function shiftedOk(L, presses, base, i, d) {
  const t = presses[i] + d;
  if (i > 0 && t <= presses[i - 1]) return false;
  if (i < presses.length - 1 && t >= presses[i + 1]) return false;
  const lo = Math.min(presses[i], t), hi = Math.max(presses[i], t);
  const mod = presses.slice(); mod[i] = t;
  const set = new Set(mod);
  let s = base.states[lo];
  for (let k = lo; k < L.nTicks; k++) {
    if (k > hi && base.states[k] && keyOf(s) === keyOf(base.states[k])) return true;
    const p = set.has(k);
    const r = step(L, s, k, p, p);
    if (r.dead) return false;
    if (r.clear) return true;
    s = r.s;
  }
  return false;
}

function windowOf(L, presses, base, i, maxD) {
  let lo = 0, hi = 0;
  while (lo > -maxD && shiftedOk(L, presses, base, i, lo - 1)) lo--;
  while (hi < maxD && shiftedOk(L, presses, base, i, hi + 1)) hi++;
  return [lo, hi];
}

export function analyze(L, presses) {
  const hz = L.bal.physics_hz;
  const maxD = Math.round(0.25 * hz);
  let p = presses.slice();
  const beatTicks = (60 / L.level.bpm) * hz;
  // 0차: 박자 맞추기. 탭을 가장 가까운 정박(안 되면 반박)으로 옮겨도 클리어되면 옮긴다.
  //      지면 점프 + 공중 재점프처럼 붙어 있는 두 탭은 함께 옮겨 본다.
  const ints = (t) => { const b = t / beatTicks, r = Math.round(b); return [r, b < r ? r - 1 : r + 1].map((v) => Math.round(v * beatTicks)); };
  const halves = (t) => { const b = t / beatTicks; return [Math.floor(b * 2) / 2, Math.ceil(b * 2) / 2].map((v) => Math.round(v * beatTicks)); };
  const tryQ = (i, q) => (i === 0 || q[i] > q[i - 1]) && simulate(L, q).ok;
  const snapped = new Set();
  for (let i = 0; i < p.length; i++) {
    const trySingle = (cands) => { for (const c of cands) { const q = p.slice(); q[i] = c; if (tryQ(i, q)) { p = q; snapped.add(i); return true; } } return false; };
    if (trySingle(ints(p[i]))) continue;
    let paired = false;
    if (i + 1 < p.length && p[i + 1] - p[i] <= 0.6 * hz) {
      const c1s = [...ints(p[i]), ...halves(p[i])], c2s = [...ints(p[i + 1]), ...halves(p[i + 1])];
      outer: for (const c1 of c1s) for (const c2 of c2s) {
        if (c2 <= c1) continue;
        const q = p.slice(); q[i] = c1; q[i + 1] = c2;
        if (tryQ(i, q)) { p = q; snapped.add(i); snapped.add(i + 1); paired = true; break outer; }
      }
    }
    if (paired) { i++; continue; }
    trySingle(halves(p[i]));
  }
  // 1차: 박자에 못 맞춘 탭만 창 가운데로 이동
  for (let i = 0; i < p.length; i++) {
    if (snapped.has(i)) continue;
    const base = simulate(L, p, { trace: true });
    if (!base.ok) throw new Error('기준 입력열이 클리어되지 않음');
    const [lo, hi] = windowOf(L, p, base, i, maxD);
    const half = beatTicks / 2;
    const c = p[i] + Math.round((lo + hi) / 2);
    const inWin = (t) => t >= p[i] + lo && t <= p[i] + hi;
    const onBeat = Math.round(Math.round(c / beatTicks) * beatTicks);   // 정박 우선
    const onHalf = Math.round(Math.round(c / half) * half);            // 다음은 반박
    p[i] = inWin(onBeat) ? onBeat : inWin(onHalf) ? onHalf : c;
  }
  // 쓸모없는 탭 제거 (빼도 클리어되면 제거)
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p.slice(0, i).concat(p.slice(i + 1));
    if (simulate(L, q).ok) p = q;
  }
  const base = simulate(L, p, { trace: true });
  if (!base.ok) throw new Error('정리된 입력열이 클리어되지 않음');
  const level = L.level;
  const beatS = 60 / level.bpm;
  const rows = p.map((t, i) => {
    const [lo, hi] = windowOf(L, p, base, i, maxD);
    const time = t / hz;
    const beat = time / beatS;
    const nearestHalf = Math.round(beat * 2) / 2;
    return {
      tick: t, time_s: +time.toFixed(4), x: +L.X[t].toFixed(2), beat: +beat.toFixed(3),
      off_beat_ms: +((beat - nearestHalf) * beatS * 1000).toFixed(1),
      window_ms: +(((hi - lo + 1) / hz) * 1000).toFixed(1),
      early_ms: +((-lo / hz) * 1000).toFixed(1), late_ms: +((hi / hz) * 1000).toFixed(1),
      kind: base.states[t].g ? 'ground' : 'orb',
      // 가장 가까운 반박에 정확히 탭해도 창 안에 드는가 (리듬 일치)
      on_beat_ok: (nearestHalf - beat) * beatS * 1000 >= -(-lo / hz) * 1000 - 1e-6 && (nearestHalf - beat) * beatS * 1000 <= (hi / hz) * 1000 + 1e-6,
      capped: lo <= -maxD || hi >= maxD,
    };
  });
  return { presses: p, rows };
}

export function verifyLevel(levelPath, bal) {
  const level = JSON.parse(readFileSync(levelPath, 'utf8'));
  const L = compileLevel(level, bal);
  const beatSec = 60 / level.bpm;
  const t0 = Date.now();
  const res = { file: levelPath, id: level.id, bpm: level.bpm, length_tiles: level.length_tiles,
    duration_s: +(L.nTicks / bal.physics_hz).toFixed(2), objects: level.objects.length, problems: [] };
  const declared = level.duration_s;
  if (declared && Math.abs(declared - res.duration_s) > 0.05)
    res.problems.push(`duration_s 선언값 ${declared} 와 시뮬레이션 ${res.duration_s} 불일치`);
  const none = simulate(L, []);
  res.no_input_clears = none.ok;
  res.no_input_death_x = none.ok ? null : +none.x.toFixed(2);
  if (none.ok) res.problems.push('무입력으로 클리어됨');
  const hold = simulate(L, [], { hold: true });
  res.hold_only_clears = hold.ok;
  if (hold.ok) res.problems.push('계속 누르기만으로 클리어됨');
  const sr = search(L);
  res.search_max_states = sr.maxLayer;
  res.clearable = sr.ok;
  if (!sr.ok) {
    res.problems.push(`클리어 불가: 가장 멀리 간 지점 x=${sr.furthest.x.toFixed(2)} (${sr.furthest.cause})`);
  } else {
    const a = analyze(L, sr.presses);
    res.taps = a.rows.length;
    res.orb_taps = a.rows.filter((r) => r.kind === 'orb').length;
    const ws = a.rows.map((r) => r.window_ms);
    res.min_window_ms = Math.min(...ws);
    res.median_window_ms = ws.slice().sort((x, y) => x - y)[Math.floor(ws.length / 2)];
    res.tightest = a.rows.slice().sort((x, y) => x.window_ms - y.window_ms).slice(0, 5);
    res.mean_abs_off_beat_ms = +(a.rows.reduce((s, r) => s + Math.abs(r.off_beat_ms), 0) / a.rows.length).toFixed(1);
    res.first_tap_s = a.rows[0]?.time_s ?? null;
    // 모든 탭을 가장 가까운 반박으로 옮긴 "박자대로 친 입력열"도 클리어되는가
    const beatTicks = a.rows.map((r) => Math.round((Math.round(r.beat * 2) / 2) * beatSec * bal.physics_hz));
    const onBeat = simulate(L, beatTicks);
    res.on_beat_input_clears = onBeat.ok;
    if (!onBeat.ok) res.on_beat_fail = { x: +onBeat.x.toFixed(2), cause: onBeat.cause };
    res.off_beat_taps = a.rows.filter((r) => !r.on_beat_ok).map((r) => ({ beat: r.beat, x: r.x, off_beat_ms: r.off_beat_ms, window_ms: r.window_ms }));
    res.inputs = a.rows;
    const need = bal.verify_min_window_ms?.[level.id];
    res.required_min_window_ms = need ?? null;
    if (!res.on_beat_input_clears) res.problems.push(`박자대로 친 입력열이 실패 (x=${res.on_beat_fail.x}, ${res.on_beat_fail.cause})`);
    if (need != null && res.min_window_ms < need)
      res.problems.push(`최소 타이밍 창 ${res.min_window_ms}ms < 목표 ${need}ms (x=${res.tightest[0].x})`);
  }
  res.elapsed_ms = Date.now() - t0;
  res.pass = res.problems.length === 0;
  return res;
}

// ---------------------------------------------------------------- main
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const showInputs = args.includes('--inputs');
  const bal = loadBalance();
  const files = args.filter((a) => !a.startsWith('--'));
  const list = (files.length ? files : bal.levels).map((f) => resolve(PROJECT, f));
  const results = list.map((f) => verifyLevel(f, bal));
  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const r of results) {
      console.log(`\n[${r.pass ? 'PASS' : 'FAIL'}] ${r.id}  ${r.file.replace(PROJECT + '/', '')}`);
      console.log(`  BPM ${r.bpm}, 길이 ${r.length_tiles} t / ${r.duration_s} s, 오브젝트 ${r.objects}개`);
      console.log(`  클리어 가능: ${r.clearable ? '예' : '아니오'} | 무입력 클리어: ${r.no_input_clears ? '예' : '아니오'} (사망 x=${r.no_input_death_x}) | 홀드만 클리어: ${r.hold_only_clears ? '예' : '아니오'}`);
      if (r.clearable) {
        console.log(`  탭 ${r.taps}회 (공중 재점프 ${r.orb_taps}회), 첫 탭 ${r.first_tap_s}s, 타이밍 창 최소 ${r.min_window_ms}ms / 중앙값 ${r.median_window_ms}ms (목표 최소 ${r.required_min_window_ms}ms), 박자 어긋남 평균 ${r.mean_abs_off_beat_ms}ms`);
        console.log(`  모든 탭을 박자(반박)에 맞춰 치면: ${r.on_beat_input_clears ? '클리어' : `실패 x=${r.on_beat_fail.x} (${r.on_beat_fail.cause})`}`);
        console.log(`  (개별) 박자에 정확히 탭하면 창 밖인 탭: ${r.off_beat_taps.length}개` + (r.off_beat_taps.length ? ' → ' + r.off_beat_taps.map((t) => `beat ${t.beat}(${t.off_beat_ms}ms)`).join(', ') : ''));
        console.log('  가장 빡빡한 탭:');
        for (const t of r.tightest) console.log(`    x=${t.x} beat=${t.beat} 창 ${t.window_ms}ms (-${t.early_ms}/+${t.late_ms}) ${t.kind}`);
        if (showInputs) for (const t of r.inputs) console.log(`    tap t=${t.time_s}s x=${t.x} beat=${t.beat} 창 ${t.window_ms}ms ${t.kind}`);
      }
      for (const p of r.problems) console.log(`  문제: ${p}`);
      console.log(`  (검사 ${r.elapsed_ms}ms, 최대 동시 상태 ${r.search_max_states})`);
    }
    const allPass = results.every((r) => r.pass);
    console.log(`\n결과: ${allPass ? 'ALL PASS' : 'FAIL'} (${results.filter((r) => r.pass).length}/${results.length})`);
    process.exitCode = allPass ? 0 : 1;
  }
}
