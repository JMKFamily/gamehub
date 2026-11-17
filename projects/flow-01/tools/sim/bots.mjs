// 대리 풀이 봇 (답을 모름). 판정은 모두 core/board.mjs 를 거침(빌드와 같은 모듈).
//
// 봇 한 이동 = 드래그 하나 = 칸 열 [누른 칸, 다음 칸, ...] 을 playDrag 로 넣음. 모델은 20-balance 7절.
//   1 색 고르기: 아직 안 이은 색 중 눈에 띄는 것(두 점이 가까움·가장자리)을 가중 무작위로. 끊긴 선이 있으면
//     p_continue 확률로 그 끝에서 이어 그림, 아니면 점에서 새로.
//   2 길 긋기: 지금 판에서 짝 점까지 가장 짧은 길(다른 색 선은 cut_cost 만큼 비싸게)을 따라가되 칸마다
//     eps 확률로 다른 이웃을 고름. 다른 색 선을 만나면 p_cut 확률로 잘라 지나가고, 아니면 손을 뗌.
//   3 다 이었는데 빈칸: 빈칸 하나를 골라 그 옆을 지나는 색 하나를 그 빈칸을 거쳐 다시 그음.
//   4 상한: max_moves 이동 또는 max_drags 드래그를 넘으면 "못 풂".
// 숙련 봇(lookahead > 0): 긋기 전에 머릿속으로 그어 보고 국소 모순(막다른 빈칸·끊긴 색)이 생기면 다른 길을 다시 그어 봄.

import { makePuzzle, newGame, playDrag, isConnected, ownerGrid, xyOf, displayLayer } from '../core/board.mjs';
import { makeRng } from '../core/rng.mjs';

export const BOT_VERSION = 'bots-1.0.0';

export const CHILD = { name: 'child', eps: 0.25, p_cut: 0.5, cut_cost: 3, p_continue: 0.6, edge_bonus: 0.5, lookahead: 0, max_moves: 200, max_drags: 600 };
// 중간 봇: 숙련 봇 헛 이동이 너무 적어(< 20) 몰림을 볼 수 없을 때 대신 씀(criteria σ25 → σ50 대체 규칙과 같은 태도)
export const MID = { name: 'mid', eps: 0.15, p_cut: 0.7, cut_cost: 3, p_continue: 0.7, edge_bonus: 0.5, lookahead: 3, max_moves: 200, max_drags: 600 };
export const SKILLED = { name: 'skilled', eps: 0.05, p_cut: 0.9, cut_cost: 3, p_continue: 0.8, edge_bonus: 0.5, lookahead: 8, max_moves: 200, max_drags: 600 };

// 목표 칸까지 거리(다익스트라, 칸 ≤ 36). 막힌 칸: 구멍, 다른 색 점, 끌고 있는 선(머리 제외).
function distTo(pz, target, own, c, pathMark, cutCost) {
  const n = pz.n, INF = 1e9;
  const dist = new Float64Array(n).fill(INF), done = new Uint8Array(n);
  dist[target] = 0;
  for (;;) {
    let v = -1, best = INF;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; v = i; }
    if (v < 0) break;
    done[v] = 1;
    for (const w of pz.nbrs[v]) {
      if (done[w]) continue;
      if (pathMark[w]) continue;
      const ep = pz.epColor[w];
      if (ep >= 0 && ep !== c) continue;
      const o = own[w];
      const cost = o >= 0 && o !== c ? 1 + cutCost : 1;
      if (dist[v] + cost < dist[w]) dist[w] = dist[v] + cost;
    }
  }
  return dist;
}

// 색 c 를 start 에서(기존 선 prefix 를 이어서일 수도) 짝 점까지 긋는 칸 열을 만듦. 실제 판은 건드리지 않음.
// 판정 규칙을 따라가며 머릿속 상태를 갱신하는 대신, 실제 진행은 playDrag 가 하므로 여기서는 "손가락이 가려는 칸 열"만 만든다.
// 단, 자르기 뒤 owner 가 바뀌는 효과는 근사(잘린 칸은 빈칸처럼 봄)로 반영.
function planStroke(pz, g, c, startCells, goal, waypoint, P, rng) {
  // startCells: 이미 확정된 선(누른 칸까지). 마지막이 손가락 위치.
  const own = ownerGrid(pz, g.paths);
  for (let i = 0; i < pz.n; i++) if (own[i] === c) own[i] = -1;
  const mark = new Uint8Array(pz.n);
  for (const x of startCells) mark[x] = 1;
  const cells = startCells.slice();
  let head = cells[cells.length - 1];
  let wp = waypoint;
  let steps = 0;
  while (steps++ < pz.n + 2) {
    if (head === goal) break;
    const tgt = wp >= 0 ? wp : goal;
    const dist = distTo(pz, tgt, own, c, mark, P.cut_cost);
    const opts = [];
    for (const w of pz.nbrs[head]) {
      if (mark[w]) continue;
      const ep = pz.epColor[w];
      if (ep >= 0 && ep !== c) continue;
      if (ep === c && w !== goal) continue;
      if (w === goal && wp >= 0) continue; // 들를 빈칸을 아직 안 들렀으면 짝 점에 바로 닿지 않음
      opts.push(w);
    }
    if (!opts.length) break;
    let nx;
    const reach = opts.filter((w) => dist[w] < 1e9);
    if (!reach.length) break;
    if (rng() < P.eps) nx = rng.pick(opts);
    else {
      let m = Infinity, mc = [];
      for (const w of reach) { if (dist[w] < m) { m = dist[w]; mc = [w]; } else if (dist[w] === m) mc.push(w); }
      nx = rng.pick(mc);
    }
    const o = own[nx];
    if (o >= 0 && o !== c) {
      if (rng() >= P.p_cut) break; // 다른 선 앞에서 손을 뗌
      // 잘린 선: 그 칸부터 먼 쪽이 사라짐(근사: 그 색 선 전체 중 시작점 반대쪽)
      const Q = g.paths[o], j = Q.indexOf(nx);
      for (let t = j; t < Q.length; t++) own[Q[t]] = -1;
    }
    mark[nx] = 1; cells.push(nx); head = nx;
    if (nx === wp) wp = -1;
  }
  return cells;
}

// 판 국소 모순 검사(숙련 봇 머릿속 검사). 답을 몰라도 보이는 것만: 막다른 빈칸, 이을 수 없는 색.
export function locallyFeasible(pz, paths) {
  const own = ownerGrid(pz, paths);
  const ports = [];
  for (let c = 0; c < pz.k; c++) {
    if (isConnected(pz, c, paths[c])) continue;
    const p = paths[c], { a, b } = pz.pairs[c];
    if (p.length >= 2) ports.push([c, p[p.length - 1], p[0] === a ? b : a]);
    else ports.push([c, a, b]);
  }
  const isPort = new Uint8Array(pz.n);
  for (const [, u, v] of ports) { isPort[u] = 1; isPort[v] = 1; }
  for (let v = 0; v < pz.n; v++) {
    if (pz.hole[v] || own[v] >= 0 || pz.epColor[v] >= 0) continue;
    let open = 0;
    for (const w of pz.nbrs[v]) if ((own[w] < 0 && pz.epColor[w] < 0) || isPort[w]) open++;
    if (open < 2) return false;
  }
  const comp = new Int16Array(pz.n).fill(-1); let nc = 0;
  for (let s = 0; s < pz.n; s++) {
    if (pz.hole[s] || own[s] >= 0 || pz.epColor[s] >= 0 || comp[s] >= 0) continue;
    const st = [s]; comp[s] = nc;
    while (st.length) { const v = st.pop(); for (const w of pz.nbrs[v]) if (own[w] < 0 && pz.epColor[w] < 0 && comp[w] < 0) { comp[w] = nc; st.push(w); } }
    nc++;
  }
  const cov = new Uint8Array(nc);
  for (const [, u, v] of ports) {
    let ok = pz.nbrs[u].includes(v);
    const cu = new Set(pz.nbrs[u].filter((w) => comp[w] >= 0).map((w) => comp[w]));
    for (const w of pz.nbrs[v]) if (comp[w] >= 0 && cu.has(comp[w])) { ok = true; cov[comp[w]] = 1; }
    if (!ok) return false;
  }
  for (let i = 0; i < nc; i++) if (!cov[i]) return false;
  return true;
}

function chooseColor(pz, g, P, rng) {
  const W = pz.W;
  const onEdge = (i) => { const [x, y] = xyOf(pz, i); return x === 0 || y === 0 || x === W - 1 || y === pz.H - 1; };
  const cands = [], w = [];
  for (let c = 0; c < pz.k; c++) {
    if (isConnected(pz, c, g.paths[c])) continue;
    const { a, b } = pz.pairs[c];
    const [ax, ay] = xyOf(pz, a), [bx, by] = xyOf(pz, b);
    const d = Math.abs(ax - bx) + Math.abs(ay - by);
    cands.push(c); w.push((1 / d) * (1 + (onEdge(a) || onEdge(b) ? P.edge_bonus : 0)));
  }
  let r = rng() * w.reduce((s, x) => s + x, 0);
  for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}

// 한 드래그 계획: 칸 열 반환
function planMove(pz, g, P, rng, state) {
  const allConn = g.paths.every((p, c) => isConnected(pz, c, p));
  if (allConn) {
    state.sawEmptyTrap = true;
    const own = ownerGrid(pz, g.paths);
    const empties = [];
    for (let v = 0; v < pz.n; v++) if (!pz.hole[v] && own[v] < 0) empties.push(v);
    const e = rng.pick(empties);
    const near = [...new Set(pz.nbrs[e].map((w) => own[w]).filter((o) => o >= 0))];
    let c;
    if (near.length) c = rng.pick(near);
    else c = rng.int(pz.k);
    const { a, b } = pz.pairs[c];
    const [s, t] = rng() < 0.5 ? [a, b] : [b, a];
    return planStroke(pz, g, c, [s], t, e, P, rng);
  }
  const c = chooseColor(pz, g, P, rng);
  const { a, b } = pz.pairs[c];
  const p = g.paths[c];
  if (p.length >= 2 && rng() < P.p_continue) {
    const goal = p[0] === a ? b : a;
    const full = planStroke(pz, g, c, p.slice(), goal, -1, P, rng);
    if (full.length > p.length) return [p[p.length - 1], ...full.slice(p.length)];
    // 끝에서 더 갈 곳이 없으면 점에서 새로 그음(아이도 막힌 끝은 버리고 점으로 돌아감)
  }
  const [s, t] = rng() < 0.5 ? [a, b] : [b, a];
  return planStroke(pz, g, c, [s], t, -1, P, rng);
}

// 머릿속 실행: 이 칸 열을 그으면 판이 어떻게 되는지(실제 게임 상태 복사본에 적용)
function simulate(g, cells) {
  const h = { ...g, paths: g.paths.map((p) => p.slice()), colorMoves: g.colorMoves.slice(), undoStack: [], connectLog: [] };
  playDrag(h, cells);
  return h;
}

// 한 판 풀기. opts.display: 표시층을 매 이동 계산(켜고 끈 결과가 같은지 확인용, 난수를 쓰지 않음)
export function solveRun(level, P, seed, opts = {}) {
  const pz = level.__pz || (level.__pz = makePuzzle(level));
  const rng = makeRng(seed);
  const g = newGame(pz, { cut: true });
  const state = { sawEmptyTrap: false };
  let drags = 0;
  const log = opts.log ? [] : null;
  let dispHash = 0;
  while (!g.completed && g.moves < P.max_moves && drags < P.max_drags) {
    let cells = planMove(pz, g, P, rng, state);
    if (P.lookahead > 0) {
      for (let t = 0; t < P.lookahead; t++) {
        const h = simulate(g, cells);
        if (h.completed || locallyFeasible(pz, h.paths)) break;
        cells = planMove(pz, g, P, rng, { sawEmptyTrap: false });
      }
    }
    drags++;
    if (log) log.push(cells);
    playDrag(g, cells);
    if (opts.display) { const D = displayLayer(g); dispHash = (dispHash * 31 + D.fillPct + D.pairDots.filter(Boolean).length) >>> 0; }
  }
  return { completed: g.completed, moves: g.moves, drags, colorMoves: g.colorMoves.slice(), sawEmptyTrap: state.sawEmptyTrap, log, dispHash, star: g.completed && g.moves === pz.k };
}

// 이동 수 분포 → 정수 중앙값·연속(보간) 중앙값·평균
export function moveStats(arr) {
  const s = arr.slice().sort((a, b) => a - b), N = s.length;
  const med = s[Math.floor((N - 1) / 2)];
  // 연속 중앙값(묶음 자료 보간): x − 0.5 + (N/2 − 아래 개수) / x 의 개수
  let below = 0, eq = 0;
  for (const v of s) { if (v < med) below++; else if (v === med) eq++; }
  const cont = med - 0.5 + (N / 2 - below) / eq;
  const mean = s.reduce((a, b) => a + b, 0) / N;
  const q = (p) => s[Math.min(N - 1, Math.floor(p * N))];
  return { n: N, median: med, cmedian: cont, mean, p10: q(0.1), p90: q(0.9), max: s[N - 1] };
}
