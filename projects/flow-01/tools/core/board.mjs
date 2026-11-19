// flow-01 판정 모듈 (빌드·봇·검증기 공용, 외부 의존 없음, 브라우저·node 모두 import 가능)
//
// 규칙 정의: projects/flow-01/20-balance.md 3절(조작·판정), 4절(이동 수·등급·%).
// 이 파일은 game-developer 가 games/flow-01/ 로 그대로 복사해 씁니다. 고치면 CORE_VERSION 을 올리고
// tools/verify-levels.mjs 를 다시 돌립니다(빌드 판정 = 시뮬레이터 판정).
//
// 칸 번호: idx = y * W + x (x 오른쪽, y 아래). 레벨 JSON 의 좌표는 [x, y].
// 상태는 모두 일반 배열·숫자라 JSON 으로 저장·복원할 수 있습니다(snapshot/restore).

export const CORE_VERSION = '1.3.0'; // 1.3.0(round-4 M2): rules.helpBreaksOneShot 이면 도움을 본 쌍은 한 번에 이은 쌍에서 빠짐(별·% 반영, 처음부터로 지워지지 않음). 1.2.0(round-2 H2): 처음부터 = 새 시도(이동 수·판정 기록 0), 바로 다음 되돌리기 = 처음부터 취소. 1.1.0(1-2 2차): 판 채움 % = 연결된 쌍의 칸만(G3), 결과 % = 한 번에 이은 쌍 / 쌍 수(G2)

// ---------------------------------------------------------------- 판
export function makePuzzle(level) {
  const W = level.width, H = level.height, n = W * H;
  const hole = new Uint8Array(n);
  for (const [x, y] of level.holes || []) hole[y * W + x] = 1;
  const pairs = level.pairs.map((p) => ({ id: p.id, a: p.a[1] * W + p.a[0], b: p.b[1] * W + p.b[0] }));
  const epColor = new Int16Array(n).fill(-1);
  pairs.forEach((p, i) => { epColor[p.a] = i; epColor[p.b] = i; });
  const nbrs = [];
  for (let i = 0; i < n; i++) {
    const x = i % W, y = (i / W) | 0, l = [];
    if (!hole[i]) {
      if (y > 0 && !hole[i - W]) l.push(i - W);
      if (x < W - 1 && !hole[i + 1]) l.push(i + 1);
      if (y < H - 1 && !hole[i + W]) l.push(i + W);
      if (x > 0 && !hole[i - 1]) l.push(i - 1);
    }
    nbrs.push(l);
  }
  let cellCount = 0;
  for (let i = 0; i < n; i++) if (!hole[i]) cellCount++;
  return { W, H, n, hole, pairs, k: pairs.length, epColor, nbrs, cellCount };
}

export const xyOf = (pz, i) => [i % pz.W, (i / pz.W) | 0];
export const idxOf = (pz, x, y) => y * pz.W + x;
export function adjacent(pz, a, b) {
  const ax = a % pz.W, ay = (a / pz.W) | 0, bx = b % pz.W, by = (b / pz.W) | 0;
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}
const inBoard = (pz, i) => i >= 0 && i < pz.n && !pz.hole[i];

export function isConnected(pz, c, path) {
  if (!path || path.length < 2) return false;
  const { a, b } = pz.pairs[c], s = path[0], e = path[path.length - 1];
  return (s === a && e === b) || (s === b && e === a);
}

export function ownerGrid(pz, paths) {
  const own = new Int16Array(pz.n).fill(-1);
  paths.forEach((p, c) => { for (const x of p) own[x] = c; });
  return own;
}

export function isComplete(pz, paths) {
  let cov = 0;
  for (let c = 0; c < pz.k; c++) { if (!isConnected(pz, c, paths[c])) return false; cov += paths[c].length; }
  return cov === pz.cellCount;
}

// 칠한 칸 수(판 채움 %의 분자, G3): **연결된 쌍**의 선이 지나는 칸만 셈(점 칸 포함).
// 이어지지 않은 선·끄는 중인 선의 칸은 화면에서도 tint 로 칠해지지 않으므로 세지 않음.
export function coveredCells(pz, paths) {
  let cov = 0;
  for (let c = 0; c < paths.length; c++) if (isConnected(pz, c, paths[c])) cov += paths[c].length;
  return cov;
}

const norm = (p) => (p.length < 2 ? [] : p);
const samePath = (p, q) => p.length === q.length && p.every((v, i) => v === q[i]);
export const samePaths = (P, Q) => P.length === Q.length && P.every((p, i) => samePath(p, Q[i]));
const clonePaths = (P) => P.map((p) => p.slice());

// ---------------------------------------------------------------- 게임 상태
// rules.cut: 다른 색 선을 지나가면 자름(기본 켬, 20-balance 3-1 R5)
// rules.helpBreaksOneShot: 도움(손가락 힌트)으로 답 길을 본 쌍은 한 번에 이은 쌍으로 세지 않음(round-4 M2: L5 이후·어려운 판 true, L1~L4 false)
export function newGame(pz, rules = {}) {
  return {
    pz,
    rules: { cut: true, helpBreaksOneShot: false, ...rules },
    paths: pz.pairs.map(() => []),
    moves: 0,                         // 이동 수 (20-balance 4-1)
    colorMoves: pz.pairs.map(() => 0), // 색마다 이동 수 (그 색을 끈 "세는 이동" 수)
    lastMoveColor: -1,
    completed: false,
    undoStack: [],
    connectLog: [],                   // {color, moves, colorMoves, grade} — 표시층용 기록(판정에 쓰지 않음)
    resetUndo: null,                  // 처음부터 직전 전체 상태(H2). 처음부터 바로 다음 되돌리기만 씀, 판이 바뀌면 지움
    helped: pz.pairs.map(() => false), // 이 판(게임)에서 도움으로 답 길을 본 쌍(M2). 처음부터·되돌리기로 지워지지 않음 — 새 게임(결과 ↻·지도에서 다시)에서만 새로
  };
}

export function snapshot(g) {
  return { paths: clonePaths(g.paths), moves: g.moves, colorMoves: g.colorMoves.slice(), lastMoveColor: g.lastMoveColor, completed: g.completed };
}
export function restore(g, s) {
  g.paths = clonePaths(s.paths); g.moves = s.moves; g.colorMoves = s.colorMoves.slice();
  g.lastMoveColor = s.lastMoveColor; g.completed = s.completed;
}

// ---------------------------------------------------------------- 드래그
// press → moveTo(여러 번) → release. 완료되면 moveTo 안에서 자동 release(입력 잠금).
// 반환 drag 가 null 이면 그 누름은 아무 일도 하지 않음(빈칸·구멍·판 밖·완료 뒤).
export function press(g, cell) {
  const pz = g.pz;
  if (g.completed || !inBoard(pz, cell)) return null;
  const ep = pz.epColor[cell];
  if (ep >= 0) return mkDrag(g, ep, 'endpoint', cell, -1);
  const own = ownerGrid(pz, g.paths);
  const c = own[cell];
  if (c < 0) return null;
  return mkDrag(g, c, 'path', cell, g.paths[c].indexOf(cell));
}

function mkDrag(g, c, kind, cell, idx) {
  return { c, kind, pressCell: cell, pressIdx: idx, started: false, P: null, head: cell, done: false, work: g.paths, events: [] };
}

// 첫 칸 이동에서야 선을 지우거나 자름(우연한 터치 보호, 20-balance 3-1 R2)
function begin(g, d) {
  d.started = true;
  d.P = d.kind === 'endpoint' ? [d.pressCell] : g.paths[d.c].slice(0, d.pressIdx + 1);
  recompute(g, d);
}

// 다른 색 선은 "끌고 있는 선 P 가 덮은 첫 칸부터 먼 쪽 끝까지" 잘림. 기준 상태(누르기 전)에서 매번 다시 계산하므로
// 같은 드래그 안에서 손가락을 되돌리면 잘린 선이 되살아남(R5).
function recompute(g, d) {
  const pz = g.pz, mark = new Uint8Array(pz.n);
  for (const x of d.P) mark[x] = 1;
  d.work = g.paths.map((Q, e) => {
    if (e === d.c) return d.P;
    let i = 0;
    for (; i < Q.length; i++) if (mark[Q[i]]) break;
    return i === Q.length ? Q : norm(Q.slice(0, i));
  });
}

// 이웃 칸 한 칸 진행. 반환: 'none' | 'extend' | 'retract' | 'connect' | 'blocked' | 'ignored'
export function step(g, d, x) {
  const pz = g.pz;
  if (d.done || g.completed) return 'ignored';
  if (x === d.head) return 'none';
  if (!inBoard(pz, x) || !adjacent(pz, d.head, x)) return 'ignored';
  if (!d.started) begin(g, d);
  const P = d.P, c = d.c;
  const j = P.indexOf(x);
  if (j >= 0) { // 자기 선 위로 되돌아감 → 짧아짐(연결 풀림 포함)
    const wasConn = isConnected(pz, c, P);
    P.length = j + 1; d.head = x; recompute(g, d);
    d.events.push({ type: wasConn ? 'disconnect' : 'retract', cell: x });
    return 'retract';
  }
  if (isConnected(pz, c, P)) return 'ignored'; // 짝 점에 닿은 뒤에는 더 늘지 않음(R7)
  const ep = pz.epColor[x];
  if (ep >= 0 && ep !== c) { d.events.push({ type: 'blocked', cell: x, color: ep }); return 'blocked'; } // 다른 색 점(R6)
  if (ep < 0) {
    let other = -1;
    for (let e = 0; e < pz.k; e++) if (e !== c && d.work[e].includes(x)) { other = e; break; }
    if (other >= 0) {
      if (!g.rules.cut) { d.events.push({ type: 'blocked', cell: x, color: other }); return 'blocked'; }
      d.events.push({ type: 'cut', cell: x, color: other });
    }
  }
  P.push(x); d.head = x; recompute(g, d);
  if (ep === c) {
    d.events.push({ type: 'connect', cell: x, color: c, previewGrade: previewGrade(g, d) });
    if (isComplete(pz, d.work)) { release(g, d); return 'connect'; }
    return 'connect';
  }
  d.events.push({ type: 'extend', cell: x });
  return 'extend';
}

// 손가락이 여러 칸을 건너뛰면 지나간 칸을 상하좌우 단계로 채움(변화가 큰 축 먼저, 같으면 x 먼저). 막히면 그 자리에서 멈춤.
export function moveTo(g, d, target) {
  const pz = g.pz;
  if (!inBoard(pz, target)) return;
  let guard = pz.W + pz.H + 4;
  while (!d.done && d.head !== target && guard-- > 0) {
    const [hx, hy] = xyOf(pz, d.head), [tx, ty] = xyOf(pz, target);
    const dx = tx - hx, dy = ty - hy;
    const nx = Math.abs(dx) >= Math.abs(dy) ? hx + Math.sign(dx) : hx;
    const ny = Math.abs(dx) >= Math.abs(dy) ? hy : hy + Math.sign(dy);
    const before = d.head;
    const r = step(g, d, idxOf(pz, nx, ny));
    if (d.head === before) break;
    if (r === 'connect') break;
  }
}

// 손을 뗌. 반환 {changed, counted, connected, completed}
export function release(g, d) {
  if (d.done) return d.result;
  d.done = true;
  const pz = g.pz;
  const next = d.started ? d.work.map(norm) : g.paths;
  const changed = d.started && !samePaths(next, g.paths);
  let counted = false;
  if (changed) {
    g.resetUndo = null; // 처음부터 뒤 판이 바뀌면 처음부터 취소 기회는 사라짐(H2)
    g.undoStack.push(snapshot(g));
    g.paths = clonePaths(next);
    if (d.c !== g.lastMoveColor) { g.moves++; g.colorMoves[d.c]++; g.lastMoveColor = d.c; counted = true; }
  }
  const connected = isConnected(pz, d.c, g.paths[d.c]);
  if (changed && connected) {
    const cm = g.colorMoves[d.c];
    g.connectLog.push({ color: d.c, moves: g.moves, colorMoves: cm, grade: gradeForColorMoves(cm) });
  }
  if (changed && isComplete(pz, g.paths)) g.completed = true;
  d.result = { changed, counted, connected, completed: g.completed };
  return d.result;
}

// 되돌리기: 이동 수를 줄이지도 늘리지도 않음. 다음 드래그는 같은 색이어도 새 이동으로 셈(R9).
// 단, 처음부터 바로 다음의 되돌리기는 처음부터 자체를 취소(H2): 판·이동 수·색별 이동 수·판정 기록·되돌리기 목록을
// 처음부터 직전 그대로 되살림. 되돌려도 이동 수가 함께 돌아오므로 별 지름길이 없음.
export function undo(g) {
  if (g.completed) return false;
  if (g.resetUndo) {
    const r = g.resetUndo;
    g.resetUndo = null;
    restore(g, r.snap);
    g.undoStack = r.undoStack;
    g.connectLog = r.connectLog;
    return true;
  }
  if (!g.undoStack.length) return false;
  const s = g.undoStack.pop();
  g.paths = clonePaths(s.paths);
  g.lastMoveColor = -1;
  return true;
}
// 처음부터 = 새 시도(H2): 판을 비우고 이동 수·색별 이동 수·판정 기록·되돌리기 목록을 0 으로(별 다시 가능).
// 판이 비어 있고 이동 수도 0 이면 할 일 없음.
export function resetBoard(g) {
  if (g.completed) return false;
  if (g.paths.every((p) => !p.length) && g.moves === 0) return false;
  g.resetUndo = { snap: snapshot(g), undoStack: g.undoStack, connectLog: g.connectLog };
  g.paths = g.pz.pairs.map(() => []);
  g.moves = 0;
  g.colorMoves = g.pz.pairs.map(() => 0);
  g.lastMoveColor = -1;
  g.undoStack = [];
  g.connectLog = [];
  return true;
}

// 드래그 하나를 칸 열로 재생(봇·검증기·빌드 재판정 공용). cells[0] = 누른 칸.
export function playDrag(g, cells) {
  const d = press(g, cells[0]);
  if (!d) return { changed: false, counted: false, connected: false, completed: g.completed, pressed: false };
  for (let i = 1; i < cells.length && !d.done; i++) moveTo(g, d, cells[i]);
  return { ...release(g, d), pressed: true };
}

// ---------------------------------------------------------------- 표시층 (판정을 바꾸지 않는 계산만)
// 등급 경계: 그 색 이동 수 ≤ bounds[0] → 1단, ≤ bounds[1] → 2단, 그 밖 3단 (balance.json judge.grade_max_color_moves)
export function gradeForColorMoves(m, bounds = [1, 2]) {
  return m <= bounds[0] ? 1 : m <= bounds[1] ? 2 : 3;
}
// 드래그 중 짝 점에 닿은 순간 띄울 등급(이 드래그가 세어질 이동이면 +1)
export function previewGrade(g, d, bounds) {
  const cm = g.colorMoves[d.c] + (d.c !== g.lastMoveColor ? 1 : 0);
  return gradeForColorMoves(cm, bounds);
}
export const fillPct = (pz, paths) => Math.floor((100 * coveredCells(pz, paths)) / pz.cellCount);
// 한 번에 이은 쌍(G2): 완료 때 그 색 이동 수 = 1 인 쌍. 연결 뒤 풀렸다가 그 색을 다시 그어(다른 색 이동이나
// 되돌리기 뒤라 새 이동으로 세어짐; 처음부터는 새 시도라 0 부터 다시) 이으면 그 색 이동 수 ≥ 2 → 한 번에 아님. 같은 색을 이어서 고쳐 그은 것은
// 같은 이동(20-balance 4절)이라 한 번에 유지. 이 정의라서 % 100 ⇔ 이동 수 = 쌍 수 ⇔ 별 ⇔ 모두 1단(도움을 안 봤을 때). 도움을 본 쌍(M2, rules.helpBreaksOneShot)은 1단이어도 한 번에서 빠지고 별 없음 — % 100 ⇔ 별 은 그대로.
// 도움 표시(M2): 빌드가 도움 손가락을 띄울 때 그 쌍 번호로 부름. 판 상태·이동 수는 바꾸지 않음
export function markHelped(g, c) { if (c >= 0 && c < g.pz.k) g.helped[c] = true; }
const countsHelp = (g) => g.rules.helpBreaksOneShot;
export const oneShotMask = (g) => g.colorMoves.map((m, c) => m === 1 && !(countsHelp(g) && g.helped[c]));
export const oneShotPairs = (g) => oneShotMask(g).filter(Boolean).length;
// 결과 % = ⌊100 · 한 번에 이은 쌍 / 쌍 수⌋ (G2)
export const accuracyPct = (g) => Math.floor((100 * oneShotPairs(g)) / g.pz.k);
export const isStar = (g) => g.completed && g.moves === g.pz.k && !(countsHelp(g) && g.helped.some(Boolean));

export function displayLayer(g, d = null, bounds) {
  const paths = d && d.started && !d.done ? d.work : g.paths;
  const pz = g.pz;
  return {
    pairDots: paths.map((p, c) => isConnected(pz, c, p)),      // 쌍 점 줄(콤보 대응)
    fillPct: fillPct(pz, paths),                                 // 판 채움 %(플레이 중, 이름 아래)
    grades: g.colorMoves.map((m) => (m ? gradeForColorMoves(m, bounds) : 0)),
    accuracyPct: g.completed ? accuracyPct(g) : null,            // 결과 화면
    star: isStar(g),
    oneShotPairs: g.completed ? oneShotPairs(g) : null,       // 결과 % 의 분자(별도 표지는 두지 않음, G2)
    oneShotMask: g.completed ? oneShotMask(g) : null,         // 결과 쌍 점 줄: true = 꽉 찬 점, false = 속 빈 점(다시 그었거나 도움을 본 쌍, H3·M2)
    helped: g.helped.slice(),
  };
}

// ---------------------------------------------------------------- 포인터 → 칸 (빌드 입력용 기하)
// layout: {originX, originY, cellPx} (판 왼쪽 위 화면 좌표, 칸 한 변 px)
export function pointToFloat(layout, px, py) {
  return [(px - layout.originX) / layout.cellPx, (py - layout.originY) / layout.cellPx];
}
// 누름 판정: 그 칸이 판 안이면 그 칸. 단, 점 칸은 칸 경계 밖 extend 칸까지 넓혀 잡음(가장 가까운 점).
export function pressHit(pz, layout, px, py, extend = 0.25) {
  const [fx, fy] = pointToFloat(layout, px, py);
  const cx = Math.floor(fx), cy = Math.floor(fy);
  const inside = cx >= 0 && cy >= 0 && cx < pz.W && cy < pz.H;
  const here = inside ? cy * pz.W + cx : -1;
  if (here >= 0 && !pz.hole[here] && pz.epColor[here] >= 0) return here;
  let best = -1, bd = Infinity;
  for (const p of pz.pairs) for (const e of [p.a, p.b]) {
    const [ex, ey] = xyOf(pz, e);
    const ox = fx < ex ? ex - fx : fx > ex + 1 ? fx - ex - 1 : 0;
    const oy = fy < ey ? ey - fy : fy > ey + 1 ? fy - ey - 1 : 0;
    if (ox <= extend && oy <= extend) {
      const dd = (fx - ex - 0.5) ** 2 + (fy - ey - 0.5) ** 2;
      if (dd < bd) { bd = dd; best = e; }
    }
  }
  if (best >= 0) return best;
  return here >= 0 && !pz.hole[here] ? here : -1;
}
// 끄는 중 칸 판정: 지금 칸 상자 밖으로 칸 폭의 hyst 넘게 나가야 새 칸(경계 떨림 방지)
export function trackCell(pz, layout, px, py, cur, hyst = 0.2) {
  const [fx, fy] = pointToFloat(layout, px, py);
  const cx = Math.floor(fx), cy = Math.floor(fy);
  if (cx < 0 || cy < 0 || cx >= pz.W || cy >= pz.H) return cur;
  const cand = cy * pz.W + cx;
  if (cand === cur || cur < 0) return cand;
  const [ux, uy] = xyOf(pz, cur);
  const ox = fx < ux ? ux - fx : fx > ux + 1 ? fx - ux - 1 : 0;
  const oy = fy < uy ? uy - fy : fy > uy + 1 ? fy - uy - 1 : 0;
  return Math.max(ox, oy) > hyst ? cand : cur;
}
