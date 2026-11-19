// 독립 유일해 검증기 2 (round-3): 칸 사이 "선 조각(변)"을 켬/끔으로 정하는 제약 풀이. solve.mjs(색을 하나씩 끝점에서 늘리는
// 길 찾기)와 알고리즘·자료구조를 공유하지 않음 → 넓은 판에서 가지치기 0 열거(none)를 대신하는 교차 검증용.
//   변수: 이웃한 두 칸 사이 변 e ∈ {켬, 끔}
//   제약(모두 규칙에서 바로 나옴, 추측 없음):
//     C1 칸 차수: 점 칸 = 켠 변 1개, 다른 칸 = 2개 (모든 칸을 덮음 + 선은 갈라지지 않음)
//     C2 색: 켠 변으로 이어진 덩어리에 서로 다른 색 점이 둘 이상 들어가면 모순
//     C3 고리: 켠 변이 이미 이어진 두 칸을 다시 이으면 모순(점 칸은 차수 1 이라 고리에 들 수 없음 → 고리는 점 없는 선 = 규칙 위반)
//   전파: C1 (남은 변 수 = 필요 수면 모두 켬, 다 찼으면 나머지 끔), C2·C3 로 변 끔. 갈림: 미정 변이 가장 적은 칸의 변 하나.
//   끝: 모든 변이 정해지고 C1 이 맞으면 답(덩어리는 모두 점 → 점 길, 색 충돌 없음).
// countSolutionsEdge(level, {limit, maxNodes}) → {count, solutions(색별 칸 열), nodes, aborted}

export function countSolutionsEdge(level, { limit = 2, maxNodes = 5e7 } = {}) {
  const W = level.width, H = level.height, n = W * H;
  const hole = new Uint8Array(n);
  for (const [x, y] of level.holes || []) hole[y * W + x] = 1;
  const epColor = new Int16Array(n).fill(-1);
  level.pairs.forEach((p, c) => { epColor[p.a[1] * W + p.a[0]] = c; epColor[p.b[1] * W + p.b[0]] = c; });
  // 변 목록
  const eu = [], ev = [], inc = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    if (hole[i]) continue;
    const x = i % W;
    if (x < W - 1 && !hole[i + 1]) { inc[i].push(eu.length); inc[i + 1].push(eu.length); eu.push(i); ev.push(i + 1); }
    if (i + W < n && !hole[i + W]) { inc[i].push(eu.length); inc[i + W].push(eu.length); eu.push(i); ev.push(i + W); }
  }
  const m = eu.length;
  const need = new Int8Array(n);
  for (let i = 0; i < n; i++) need[i] = hole[i] ? 0 : epColor[i] >= 0 ? 1 : 2;
  const st = new Int8Array(m); // 0 미정, 1 켬, -1 끔
  const onCnt = new Int8Array(n), unkCnt = new Int8Array(n);
  for (let i = 0; i < n; i++) unkCnt[i] = inc[i].length;
  // 되돌릴 수 있는 합집합(경로 압축 없음, 크기 합치기)
  const par = new Int32Array(n), sz = new Int32Array(n), col = new Int16Array(n);
  for (let i = 0; i < n; i++) { par[i] = i; sz[i] = 1; col[i] = epColor[i]; }
  const find = (x) => { while (par[x] !== x) x = par[x]; return x; };
  // 되돌림 기록: 종류 0 = 변 상태(a = 변), 1 = 합집합(a = 붙은 뿌리, b = 붙인 쪽 뿌리의 원래 색)
  const tK = [], tA = [], tB = [];
  let nodes = 0, aborted = false;
  const sols = [];

  function setEdge(e, val) {
    st[e] = val; tK.push(0); tA.push(e); tB.push(0);
    const u = eu[e], v = ev[e];
    unkCnt[u]--; unkCnt[v]--;
    if (val === 1) {
      onCnt[u]++; onCnt[v]++;
      if (onCnt[u] > need[u] || onCnt[v] > need[v]) return false;
      let a = find(u), b = find(v);
      if (a === b) return false; // C3
      if (col[a] >= 0 && col[b] >= 0 && col[a] !== col[b]) return false; // C2
      if (sz[a] < sz[b]) { const t = a; a = b; b = t; }
      tK.push(1); tA.push(b); tB.push(col[a]);
      par[b] = a; sz[a] += sz[b]; if (col[a] < 0) col[a] = col[b];
    } else if (onCnt[u] + unkCnt[u] < need[u] || onCnt[v] + unkCnt[v] < need[v]) return false;
    return true;
  }
  function undoTo(len) {
    while (tK.length > len) {
      const k = tK.pop(), x = tA.pop(), y = tB.pop();
      if (k === 1) { const a = par[x]; sz[a] -= sz[x]; par[x] = x; col[a] = y; }
      else { const u = eu[x], v = ev[x]; if (st[x] === 1) { onCnt[u]--; onCnt[v]--; } st[x] = 0; unkCnt[u]++; unkCnt[v]++; }
    }
  }

  const q = [];
  function propagate(seed) {
    for (const s of seed) q.push(s);
    while (q.length) {
      const v = q.pop();
      if (need[v] === 0) continue;
      const on = onCnt[v], un = unkCnt[v];
      if (on > need[v] || on + un < need[v]) { q.length = 0; return false; }
      if (un === 0) continue;
      const rv = find(v);
      for (const e of inc[v]) {
        if (st[e] !== 0) continue;
        const w = eu[e] === v ? ev[e] : eu[e];
        let val = 0;
        if (on === need[v]) val = -1;
        else if (on + un === need[v]) val = 1;
        else { const rw = find(w); if (rw === rv || (col[rv] >= 0 && col[rw] >= 0 && col[rv] !== col[rw])) val = -1; }
        if (val) { if (!setEdge(e, val)) { q.length = 0; return false; } q.push(v, w); }
      }
    }
    return true;
  }

  function solve() {
    if (sols.length >= limit || aborted) return;
    if (++nodes > maxNodes) { aborted = true; return; }
    let best = -1, bu = 99;
    for (let v = 0; v < n; v++) if (need[v] && unkCnt[v] && onCnt[v] < need[v] && unkCnt[v] < bu) { bu = unkCnt[v]; best = v; if (bu === 1) break; }
    if (best < 0) {
      for (let v = 0; v < n; v++) if (onCnt[v] !== need[v]) return;
      sols.push(extract());
      return;
    }
    const e = inc[best].find((x) => st[x] === 0);
    for (const val of [1, -1]) {
      const mark = tK.length;
      if (setEdge(e, val) && propagate([eu[e], ev[e]])) solve();
      undoTo(mark);
      if (sols.length >= limit || aborted) return;
    }
  }

  function extract() {
    const adj = Array.from({ length: n }, () => []);
    for (let e = 0; e < m; e++) if (st[e] === 1) { adj[eu[e]].push(ev[e]); adj[ev[e]].push(eu[e]); }
    return level.pairs.map((p) => {
      const a = p.a[1] * W + p.a[0], path = [a]; let prev = -1, cur = a;
      while (true) { const nx = adj[cur].find((w) => w !== prev); if (nx === undefined) break; prev = cur; cur = nx; path.push(cur); }
      return path;
    });
  }

  const all = [];
  for (let v = 0; v < n; v++) all.push(v);
  if (propagate(all)) solve();
  return { count: sols.length, solutions: sols, nodes, aborted };
}
