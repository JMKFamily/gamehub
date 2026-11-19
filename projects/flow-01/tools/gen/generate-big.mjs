// 넓은 판 생성기(round-3, 어려운 난이도·큰 일반 판용). gen-1(generate.mjs)은 무작위 덮개를 만든 뒤 F2(같은 선 맞닿음 없음)로
// 거르는데, 8x8 를 넘으면 거의 모든 시도가 F2 에서 버려짐(10x10·12쌍 50,000회 0판, 12x12 0판 실측).
// gen-2 는 덮개를 만드는 동안부터 F2 를 지킴: 선 머리는 "자기 선의 다른 칸과 맞닿지 않는 빈칸"으로만 나아감(Warnsdorff 우선).
// 쌍 수는 범위 [pairsMin, pairsMax] 안에서 시드로 고른 목표: 짧은 선은 맞닿은 끝 합치기(F2 를 깨는 합치기는 안 함), 모자라면 긴 선 자르기.
// 거르기: F1 선 길이 ≥ minLen, F2 같은 선 맞닿음 없음(만들 때 보장, 끝에서 다시 확인), F3 구멍 규칙은 gen-1 과 같음.
// 유일해 확인은 따로(solve.mjs sound + solve-edge.mjs 독립 검증기).
import { makeRng } from '../core/rng.mjs';

export const GEN_BIG_VERSION = 'gen-2.0.0';

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
    for (let h = 0; h < count && ok; h++) { const i = rng.int(n); if (hole[i]) ok = false; else hole[i] = 1; }
    if (!ok) continue;
    for (let i = 0; i < n && ok; i++) if (hole[i]) { const x = i % W; if ((x < W - 1 && hole[i + 1]) || (i + W < n && hole[i + W])) ok = false; }
    if (!ok) continue;
    const nb = shapeNbrs(W, H, hole);
    const start = [...Array(n).keys()].find((i) => !hole[i]);
    const seen = new Uint8Array(n); const st = [start]; seen[start] = 1; let cnt = 1;
    while (st.length) { const v = st.pop(); for (const w of nb[v]) if (!seen[w]) { seen[w] = 1; cnt++; st.push(w); } }
    if (cnt !== n - count) continue;
    if (nb.some((l, i) => !hole[i] && l.length < 2)) continue;
    return hole;
  }
  return null;
}

const selfAdjacent = (p, nb) => {
  const pos = new Map(p.map((v, i) => [v, i]));
  for (let i = 0; i < p.length; i++) for (const w of nb[p[i]]) { const j = pos.get(w); if (j !== undefined && Math.abs(j - i) > 1) return true; }
  return false;
};

function cover(W, H, hole, nb, rng) {
  const n = W * H, owner = new Int16Array(n).fill(-1);
  for (let i = 0; i < n; i++) if (hole[i]) owner[i] = -2;
  const paths = [];
  const freeDeg = (v) => nb[v].filter((w) => owner[w] === -1).length;
  // 머리 h 에서 w 로 갈 수 있나: 빈칸이고, w 의 이웃 중 자기 선 칸은 h 하나뿐
  const okStep = (c, h, w) => owner[w] === -1 && nb[w].every((u) => u === h || owner[u] !== c);
  for (;;) {
    let best = 9, cands = [];
    for (let i = 0; i < n; i++) if (owner[i] === -1) { const f = freeDeg(i); if (f < best) { best = f; cands = [i]; } else if (f === best) cands.push(i); }
    if (!cands.length) break;
    const c = paths.length, s = rng.pick(cands);
    owner[s] = c;
    const p = [s];
    for (let end = 0; end < 2; end++) {
      for (;;) {
        const h = p[p.length - 1];
        const opts = nb[h].filter((w) => okStep(c, h, w));
        if (!opts.length) break;
        let nx;
        if (rng() < 0.8) { let m = 9, mc = []; for (const w of opts) { const f = freeDeg(w); if (f < m) { m = f; mc = [w]; } else if (f === m) mc.push(w); } nx = rng.pick(mc); }
        else nx = rng.pick(opts);
        owner[nx] = c; p.push(nx);
      }
      p.reverse();
    }
    paths.push(p);
  }
  return paths;
}

export function generateBig(cfg, seed) {
  const { width: W, height: H, pairsMin, pairsMax, holes = 0, minLen = 3, maxAttempts = 20000 } = cfg;
  const rng = makeRng(seed);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const hole = holes ? pickHoles(W, H, holes, rng) : new Uint8Array(W * H);
    if (!hole) continue;
    const nb = shapeNbrs(W, H, hole);
    let paths = cover(W, H, hole, nb, rng);
    // 짧은 선·많은 선 줄이기: 끝이 맞닿은 두 선을 합침(합친 선이 F2 를 지키는 것만). 짧은 선을 먼저 합침
    const adj = (a, b) => nb[a].includes(b);
    let guard = 4 * paths.length;
    while (guard-- > 0) {
      const short = paths.some((p) => p.length < minLen);
      if (!short && paths.length <= pairsMax) break;
      const opts = [];
      for (let i = 0; i < paths.length; i++) for (let j = 0; j < paths.length; j++) {
        if (i === j) continue;
        const P = paths[i], Q = paths[j];
        if (short && P.length >= minLen && Q.length >= minLen) continue;
        if (adj(P[P.length - 1], Q[0])) { const R = P.concat(Q); if (!selfAdjacent(R, nb)) opts.push([i, j, R]); }
      }
      if (!opts.length) break;
      const [i, j, R] = rng.pick(opts);
      paths = paths.filter((_, k) => k !== i && k !== j); paths.push(R);
    }
    // 선이 너무 적으면(긴 뱀 선) 가장 긴 선을 무작위 자리에서 자름(조각도 F2 를 지킴, 두 조각 모두 ≥ minLen)
    const target = pairsMin + rng.int(pairsMax - pairsMin + 1);
    let g2 = 4 * target;
    while (paths.length < target && g2-- > 0) {
      paths.sort((p, q) => q.length - p.length);
      const P = paths[0];
      if (P.length < 2 * minLen) break;
      const cut = minLen + rng.int(P.length - 2 * minLen + 1);
      paths[0] = P.slice(0, cut); paths.push(P.slice(cut));
    }
    if (paths.length < pairsMin || paths.length > pairsMax) continue;
    if (paths.some((p) => p.length < minLen)) continue;
    if (paths.some((p) => selfAdjacent(p, nb))) continue;
    rng.shuffle(paths);
    const xy = (i) => [i % W, (i / W) | 0];
    const level = {
      width: W, height: H,
      holes: [...hole].map((h, i) => (h ? xy(i) : null)).filter(Boolean),
      pairs: paths.map((p, c) => ({ id: `c${c + 1}`, color_slot: c, a: xy(p[0]), b: xy(p[p.length - 1]) })),
      solution: paths.map((p, c) => ({ id: `c${c + 1}`, path: p.map(xy) })),
    };
    return { level, attempts: attempt };
  }
  return null;
}
