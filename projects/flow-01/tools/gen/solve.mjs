// 유일해 검증기 (답 개수 세기, limit 개에서 멈춤)
//
// mode
//   'sound' (기본, 검증용): 정확한 열거. 가지치기는 "답을 하나도 버리지 않는다"가 증명된 것만 씀(20-balance 6-2).
//            ① 빈칸마다 열린 이웃(빈칸·지금 머리·아직 안 이은 색의 점) ≥ 2
//            ② 아직 안 이은 색의 점마다 열린 이웃 ≥ 1, 두 끝이 같은 빈칸 덩어리로 이어짐
//            ③ 빈칸 덩어리마다 그 덩어리에 두 끝이 모두 닿은 안 이은 색이 하나 이상
//               (안 이은 색의 남은 길은 모두 지금 빈칸이라 한 덩어리 안에만 있음 → 덮지 못하는 덩어리는 답이 없음)
//   'none'  : 가지치기 0. 끝에서 빈칸 0 만 확인(작은 판 교차 검증용, 느림)
//   'trap'  : sound + "자기 선과 이웃한 칸 금지"(생성용 거르기 조건). 검증에 쓰면 안 되는 함정 재현용(tools/trap-check.mjs)
//
// 색 하나를 끝점 a 에서 짝 점 b 까지 늘린 뒤 다음 색으로 넘어감 → 점에 안 이어진 고리는 생기지 않음.

export function countSolutions(pz, { limit = 2, mode = 'sound', maxNodes = 2e8, order = null } = {}) {
  const { n, k, pairs, nbrs, hole } = pz;
  const EMPTY = -1, HOLE = -2;
  const own = new Int16Array(n);
  for (let i = 0; i < n; i++) own[i] = hole[i] ? HOLE : EMPTY;
  pairs.forEach((p, c) => { own[p.a] = c; own[p.b] = c; });
  const ord = order || defaultOrder(pz);
  const rank = new Int16Array(k);
  ord.forEach((c, r) => { rank[c] = r; });
  const isEp = new Uint8Array(n);
  for (const p of pairs) { isEp[p.a] = 1; isEp[p.b] = 1; }
  const paths = pairs.map(() => []);
  const sols = [];
  let nodes = 0, aborted = false;
  const comp = new Int16Array(n);
  const queue = new Int16Array(n);

  const SOUND = mode !== 'none', TRAP = mode === 'trap';

  function check(oi, head) {
    // 빈칸 덩어리 라벨
    comp.fill(-1);
    let nc = 0;
    for (let s = 0; s < n; s++) {
      if (own[s] !== EMPTY || comp[s] >= 0) continue;
      let qh = 0, qt = 0; queue[qt++] = s; comp[s] = nc;
      while (qh < qt) { const v = queue[qh++]; for (const w of nbrs[v]) if (own[w] === EMPTY && comp[w] < 0) { comp[w] = nc; queue[qt++] = w; } }
      nc++;
    }
    const cur = ord[oi], tgt = pairs[cur].b;
    // ① 빈칸 열린 이웃
    for (let v = 0; v < n; v++) {
      if (own[v] !== EMPTY) continue;
      let open = 0;
      for (const w of nbrs[v]) {
        const o = own[w];
        if (o === EMPTY || w === head || (isEp[w] && o >= 0 && (rank[o] > oi || (o === cur && w === tgt)))) open++;
      }
      if (open < 2) return false;
    }
    // ②③ 안 이은 색마다 포트 두 개
    const coverable = new Uint8Array(nc);
    const ports = [[head, tgt]];
    for (let r = oi + 1; r < k; r++) { const p = pairs[ord[r]]; ports.push([p.a, p.b]); }
    for (const [u, v] of ports) {
      let adjUV = false;
      const cu = new Set(), cv = new Set();
      for (const w of nbrs[u]) { if (w === v) adjUV = true; if (own[w] === EMPTY) cu.add(comp[w]); }
      for (const w of nbrs[v]) { if (own[w] === EMPTY) cv.add(comp[w]); }
      let any = adjUV;
      for (const c of cu) if (cv.has(c)) { coverable[c] = 1; any = true; }
      if (!any) return false;
    }
    for (let c = 0; c < nc; c++) if (!coverable[c]) return false;
    return true;
  }

  function finishColor(oi) {
    if (oi === k - 1) {
      for (let v = 0; v < n; v++) if (own[v] === EMPTY) return;
      sols.push(paths.map((p) => p.slice()));
      return;
    }
    const nxt = ord[oi + 1];
    paths[nxt] = [pairs[nxt].a];
    if (!SOUND || check(oi + 1, pairs[nxt].a)) extend(oi + 1, pairs[nxt].a);
    paths[nxt] = [];
  }

  function extend(oi, head) {
    if (sols.length >= limit || aborted) return;
    if (++nodes > maxNodes) { aborted = true; return; }
    const c = ord[oi], tgt = pairs[c].b, path = paths[c];
    for (const w of nbrs[head]) {
      if (sols.length >= limit || aborted) return;
      if (w === tgt) { path.push(w); finishColor(oi); path.pop(); continue; }
      if (own[w] !== EMPTY) continue;
      if (TRAP) {
        let self = false;
        for (const z of nbrs[w]) if (z !== head && z !== tgt && own[z] === c) { self = true; break; }
        if (self) continue;
      }
      own[w] = c; path.push(w);
      if (!SOUND || check(oi, w)) extend(oi, w);
      own[w] = EMPTY; path.pop();
    }
  }

  const c0 = ord[0];
  paths[c0] = [pairs[c0].a];
  if (!SOUND || check(0, pairs[c0].a)) extend(0, pairs[c0].a);
  return { count: sols.length, solutions: sols, nodes, aborted };
}

// 끝점 사이 거리가 짧은 색부터(제약이 센 색 먼저)
export function defaultOrder(pz) {
  const W = pz.W;
  const d = (p) => Math.abs((p.a % W) - (p.b % W)) + Math.abs(((p.a / W) | 0) - ((p.b / W) | 0));
  return pz.pairs.map((p, i) => i).sort((i, j) => d(pz.pairs[i]) - d(pz.pairs[j]) || i - j);
}

export const samePathSet = (P, Q) => P.length === Q.length && P.every((p, i) => p.length === Q[i].length && p.every((v, j) => v === Q[i][j]));
