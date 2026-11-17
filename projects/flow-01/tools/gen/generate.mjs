// 레벨 생성기: 답(경로 덮개)을 먼저 만들고 끝점만 남겨 문제로 만듦. 시드 하나 → 판 하나(결정적).
//
// generate(cfg, seed) → {level, attempts} | null
//   cfg = {width, height, pairs, holes: 구멍 칸 수(기본 0), minLen: 3, maxAttempts}
// 거르기(생성 답에만 적용, 검증기에는 넣지 않음 — 20-balance 6-2 함정):
//   F1 선 길이 ≥ minLen   F2 같은 선의 이웃하지 않은 두 칸이 맞닿지 않음(지름길 자리·같은 색 2x2 없음)
//   F2 는 cfg.allowSelfAdjacent 로 끌 수 있음(L2: 지름길 자리가 곧 "빈칸 함정").
//   F3 구멍이 판을 둘로 나누지 않음, 구멍이 서로 맞닿지 않음
// 유일해 확인은 build/search 단계에서 solve.mjs(sound)로 따로 함.

import { makeRng } from '../core/rng.mjs';
import { makePuzzle } from '../core/board.mjs';

export const GEN_VERSION = 'gen-1.0.0';

function shapeNbrs(W, H, hole) {
  const n = W * H, nb = [];
  for (let i = 0; i < n; i++) {
    const x = i % W, y = (i / W) | 0, l = [];
    if (!hole[i]) {
      if (y > 0 && !hole[i - W]) l.push(i - W);
      if (x < W - 1 && !hole[i + 1]) l.push(i + 1);
      if (y < H - 1 && !hole[i + W]) l.push(i + W);
      if (x > 0 && !hole[i - 1]) l.push(i - 1);
    }
    nb.push(l);
  }
  return nb;
}

function pickHoles(W, H, count, rng) {
  const n = W * H;
  for (let t = 0; t < 200; t++) {
    const hole = new Uint8Array(n);
    let ok = true;
    for (let h = 0; h < count; h++) {
      const i = rng.int(n);
      if (hole[i]) { ok = false; break; }
      hole[i] = 1;
    }
    if (!ok) continue;
    // 구멍끼리 맞닿지 않음(한 덩어리 큰 구멍은 판 모양을 크게 바꿈)
    for (let i = 0; i < n && ok; i++) if (hole[i]) {
      const x = i % W;
      if ((x < W - 1 && hole[i + 1]) || (i + W < n && hole[i + W])) ok = false;
    }
    if (!ok) continue;
    const nb = shapeNbrs(W, H, hole);
    const start = [...Array(n).keys()].find((i) => !hole[i]);
    const seen = new Uint8Array(n); const st = [start]; seen[start] = 1; let cnt = 1;
    while (st.length) { const v = st.pop(); for (const w of nb[v]) if (!seen[w]) { seen[w] = 1; cnt++; st.push(w); } }
    if (cnt !== n - count) continue;
    if (nb.some((l, i) => !hole[i] && l.length < 2)) continue; // 이웃 1개뿐인 칸 금지(막다른 칸이 점으로 강제됨)
    return hole;
  }
  return null;
}

// 무작위 걸음으로 판을 경로들로 덮고, 끝이 맞닿은 경로를 합치거나 긴 경로를 잘라 쌍 수 k 로 맞춤
function randomCover(W, H, hole, nb, k, rng) {
  const n = W * H;
  const used = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (hole[i]) used[i] = 1;
  const free = (v) => nb[v].filter((w) => !used[w]).length;
  const paths = [];
  for (;;) {
    let cands = [], best = 9;
    for (let i = 0; i < n; i++) if (!used[i]) { const f = free(i); if (f < best) { best = f; cands = [i]; } else if (f === best) cands.push(i); }
    if (!cands.length) break;
    const s = rng.pick(cands);
    used[s] = 1;
    let p = [s];
    for (let end = 0; end < 2; end++) {
      let cur = p[p.length - 1];
      for (;;) {
        const opts = nb[cur].filter((w) => !used[w]);
        if (!opts.length) break;
        let nx;
        if (rng() < 0.75) { // 바른 걸음(Warnsdorff): 다음 칸 자유도가 낮은 곳 먼저
          let m = 9; let mc = [];
          for (const w of opts) { const f = free(w); if (f < m) { m = f; mc = [w]; } else if (f === m) mc.push(w); }
          nx = rng.pick(mc);
        } else nx = rng.pick(opts);
        used[nx] = 1; p.push(nx); cur = nx;
      }
      p.reverse();
    }
    paths.push(p);
  }
  const adj = (a, b) => nb[a].includes(b);
  // 합치기
  let guard = 500;
  while (paths.length > k && guard-- > 0) {
    const opts = [];
    for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++) {
      const P = paths[i], Q = paths[j];
      const ends = [[P[0], Q[0], 'ss'], [P[0], Q[Q.length - 1], 'se'], [P[P.length - 1], Q[0], 'es'], [P[P.length - 1], Q[Q.length - 1], 'ee']];
      for (const [u, v, t] of ends) if (adj(u, v)) opts.push([i, j, t]);
    }
    if (!opts.length) return null;
    // 짧은 경로를 먼저 합치는 쪽으로 기울임
    opts.sort((A, B) => (paths[A[0]].length + paths[A[1]].length) - (paths[B[0]].length + paths[B[1]].length));
    const [i, j, t] = rng() < 0.6 ? opts[0] : rng.pick(opts);
    let P = paths[i], Q = paths[j];
    if (t === 'ss') P = P.slice().reverse();
    if (t === 'ee') Q = Q.slice().reverse();
    if (t === 'se') { const tmp = P; P = Q; Q = tmp; }
    const merged = t === 'es' ? P.concat(Q) : t === 'ss' ? P.concat(Q) : t === 'ee' ? P.concat(Q) : P.concat(Q);
    paths.splice(j, 1); paths.splice(i, 1, merged);
  }
  // 자르기
  guard = 100;
  while (paths.length < k && guard-- > 0) {
    const longs = paths.map((p, i) => [p.length, i]).filter(([l]) => l >= 6);
    if (!longs.length) return null;
    const [, i] = rng.pick(longs);
    const p = paths[i];
    const cut = 3 + rng.int(p.length - 5);
    paths.splice(i, 1, p.slice(0, cut), p.slice(cut));
  }
  if (paths.length !== k) return null;
  return paths;
}

function selfAdjacent(path, nb) {
  const pos = new Map(path.map((v, i) => [v, i]));
  for (let i = 0; i < path.length; i++) for (const w of nb[path[i]]) {
    const j = pos.get(w);
    if (j !== undefined && Math.abs(i - j) > 1) return true;
  }
  return false;
}

export function generate(cfg, seed) {
  const { width: W, height: H, pairs: k, holes = 0, minLen = 3, maxAttempts = 20000, allowSelfAdjacent = false } = cfg;
  const rng = makeRng(seed);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const hole = holes ? pickHoles(W, H, holes, rng) : new Uint8Array(W * H);
    if (!hole) continue;
    const nb = shapeNbrs(W, H, hole);
    const cover = randomCover(W, H, hole, nb, k, rng);
    if (!cover) continue;
    if (cover.some((p) => p.length < minLen)) continue;          // F1
    if (!allowSelfAdjacent && cover.some((p) => selfAdjacent(p, nb))) continue; // F2 (L2 빈칸 채우기 판만 끔: 그 판은 sound 검증기로만 유일 확인)
    // 색 번호는 무작위로(위치와 색 순서가 묶이지 않게)
    rng.shuffle(cover);
    const xy = (i) => [i % W, (i / W) | 0];
    const level = {
      width: W, height: H,
      holes: [...hole].map((h, i) => (h ? xy(i) : null)).filter(Boolean),
      pairs: cover.map((p, c) => ({ id: `c${c + 1}`, color_slot: c, a: xy(p[0]), b: xy(p[p.length - 1]) })),
      solution: cover.map((p, c) => ({ id: `c${c + 1}`, path: p.map(xy) })),
    };
    return { level, attempts: attempt };
  }
  return null;
}

// 구조 지표(20-balance 7-3). 답 경로 기준.
export function structureMetrics(level) {
  const pz = makePuzzle(level);
  const W = level.width;
  const sol = level.solution.map((s) => s.path.map(([x, y]) => y * W + x));
  const lens = sol.map((p) => p.length);
  let bends = 0;
  for (const p of sol) for (let i = 1; i < p.length - 1; i++) {
    const d1 = p[i] - p[i - 1], d2 = p[i + 1] - p[i];
    if (d1 !== d2) bends++;
  }
  // 직선 착각: 빈 판(다른 점만 막힘, 구멍 막힘)에서 두 점 최단 거리 < 답 길이 - 1 인 쌍
  let illusion = 0;
  const shortest = [];
  pz.pairs.forEach((p, c) => {
    const dist = new Int16Array(pz.n).fill(-1); dist[p.a] = 0; const q = [p.a];
    while (q.length) { const v = q.shift(); for (const w of pz.nbrs[v]) { if (dist[w] >= 0) continue; if (pz.epColor[w] >= 0 && w !== p.b) continue; dist[w] = dist[v] + 1; if (w !== p.b) q.push(w); } }
    shortest.push(dist[p.b]);
    if (dist[p.b] < sol[c].length - 1) illusion++;
  });
  const edge = (i) => { const x = i % W, y = (i / W) | 0; return x === 0 || y === 0 || x === W - 1 || y === level.height - 1; };
  const edgeCells = sol.flat().filter(edge).length;
  return {
    size: `${level.width}x${level.height}`, cells: pz.cellCount, pairs: pz.k, holes: (level.holes || []).length,
    min_len: Math.min(...lens), max_len: Math.max(...lens), mean_len: +(lens.reduce((a, b) => a + b, 0) / lens.length).toFixed(2),
    bends, illusion, detour_cells: sol.reduce((s, p, c) => s + (p.length - 1 - shortest[c]), 0),
    edge_cells: edgeCells,
  };
}

// 빈칸 함정(구조): 모든 쌍을 "빈 판 최단 길"로만 이었을 때 서로 겹치지 않으면서 빈칸이 남는 조합이 있는가.
// 있으면 곧은 길로 긋는 아이가 "다 이었는데 안 끝남"을 만난다(L2 새 요소 판 고르기용).
export function shortestTrap(level) {
  const pz = makePuzzle(level);
  const all = pz.pairs.map((p) => {
    const dist = new Int16Array(pz.n).fill(-1); dist[p.a] = 0; const q = [p.a];
    while (q.length) { const v = q.shift(); for (const w of pz.nbrs[v]) { if (dist[w] >= 0) continue; if (pz.epColor[w] >= 0 && w !== p.b) continue; dist[w] = dist[v] + 1; if (w !== p.b) q.push(w); } }
    const D = dist[p.b], res = [];
    const walk = (v, path) => { if (res.length > 200) return; if (v === p.a) { res.push(path.slice().reverse()); return; } for (const w of pz.nbrs[v]) if (dist[w] === dist[v] - 1 && (w === p.a || pz.epColor[w] < 0)) { path.push(w); walk(w, path); path.pop(); } };
    if (D > 0) walk(p.b, [p.b]);
    return res;
  });
  const used = new Uint8Array(pz.n);
  let found = 0, total = 0, firstEmpty = null;
  const rec = (c, cov) => {
    if (c === pz.k) { total++; if (cov < pz.cellCount) { found++; if (!firstEmpty) { firstEmpty = []; for (let v = 0; v < pz.n; v++) if (!pz.hole[v] && !used[v]) firstEmpty.push([v % pz.W, (v / pz.W) | 0]); } } return; }
    for (const path of all[c]) {
      if (path.some((v) => used[v])) continue;
      for (const v of path) used[v] = 1;
      rec(c + 1, cov + path.length);
      for (const v of path) used[v] = 0;
    }
  };
  rec(0, 0);
  return { combos: total, trapCombos: found, firstEmptyCells: firstEmpty };
}
