// 추론 봇(round-3, 어른 구간 지표): 사람이 넓은 판을 푸는 방식 — 확실한 칸부터 채우고(추론), 막히면 한 군데를 찍어 보고,
// 틀리면 지우고 다시 — 을 칸 사이 변 제약(gen/solve-edge.mjs 와 같은 C1~C3)으로 흉내 냄. 판정은 하지 않고 "헛 이동 수"만 셈.
//   D1 보통 어른: C1(칸 차수)·C3(고리) 추론만. 색 충돌(C2)은 선이 실제로 부딪혀야 앎. 찍기 = 미정 변이 가장 적은 칸 중 무작위.
//   D2 숙련 어른: + C2 색 추론 + 한 수 앞 보기(찍기 전에 후보 변마다 켜 보고 바로 모순이면 끔, 최대 probe 개).
//   헛 이동 = 틀린 찍기 수(찍은 선을 지우고 다시 긋는 한 번 = 이동 1). 이동 수 = 쌍 수 + 헛 이동.
//   상한: wrong ≥ maxWrong 이면 "포기"(못 풂). 찍기 순서는 seed 로 정함(결정적).
import { makeRng } from '../core/rng.mjs';

export const DEDUCE_VERSION = 'deduce-1.0.0';
export const D1 = { name: 'D1', color: false, probe: 0, maxWrong: 400 };
export const D2 = { name: 'D2', color: true, probe: 24, maxWrong: 400 };

export function deduceRun(level, P, seed) {
  const rng = makeRng(seed);
  const W = level.width, n = W * level.height;
  const hole = new Uint8Array(n);
  for (const [x, y] of level.holes || []) hole[y * W + x] = 1;
  const epColor = new Int16Array(n).fill(-1);
  level.pairs.forEach((p, c) => { epColor[p.a[1] * W + p.a[0]] = c; epColor[p.b[1] * W + p.b[0]] = c; });
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
  const st = new Int8Array(m), onCnt = new Int8Array(n), unkCnt = new Int8Array(n);
  for (let i = 0; i < n; i++) unkCnt[i] = inc[i].length;
  const par = new Int32Array(n), sz = new Int32Array(n), col = new Int16Array(n);
  for (let i = 0; i < n; i++) { par[i] = i; sz[i] = 1; col[i] = epColor[i]; }
  const find = (x) => { while (par[x] !== x) x = par[x]; return x; };
  const tK = [], tA = [], tB = [];
  const useColor = P.color;
  function setEdge(e, val) {
    st[e] = val; tK.push(0); tA.push(e); tB.push(0);
    const u = eu[e], v = ev[e];
    unkCnt[u]--; unkCnt[v]--;
    if (val === 1) {
      onCnt[u]++; onCnt[v]++;
      if (onCnt[u] > need[u] || onCnt[v] > need[v]) return false;
      let a = find(u), b = find(v);
      if (a === b) return false;
      if (col[a] >= 0 && col[b] >= 0 && col[a] !== col[b]) return false; // 실제로 부딪힘(두 봇 모두 앎)
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
  function propagate(seedCells) {
    for (const s of seedCells) q.push(s);
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
        else { const rw = find(w); if (rw === rv || (useColor && col[rv] >= 0 && col[rw] >= 0 && col[rv] !== col[rw])) val = -1; }
        if (val) { if (!setEdge(e, val)) { q.length = 0; return false; } q.push(v, w); }
      }
    }
    return true;
  }
  const allCells = []; for (let v = 0; v < n; v++) allCells.push(v);
  if (!propagate(allCells)) return { solved: false, wrong: 0, guesses: 0, moves: level.pairs.length };
  // 찍기: 사람처럼 한 번 찍은 것은 모순이 날 때까지 믿고 감(깊이 우선). 틀리면 그 찍기 하나를 반대로(지우고 다시 = 헛 이동 1).
  let wrong = 0, guesses = 0;
  const stack = []; // {mark, e, val}
  for (;;) {
    let bu = 99; const cand = [];
    for (let v = 0; v < n; v++) if (need[v] && unkCnt[v] && onCnt[v] < need[v]) { if (unkCnt[v] < bu) { bu = unkCnt[v]; cand.length = 0; } if (unkCnt[v] === bu) cand.push(v); }
    if (!cand.length) {
      let done = true; for (let v = 0; v < n; v++) if (onCnt[v] !== need[v]) { done = false; break; }
      if (done) return { solved: true, wrong, guesses, moves: level.pairs.length + wrong };
    }
    let ok = cand.length > 0;
    if (ok && P.probe) {
      // 한 수 앞 보기: 미정 변을 켜 보고 바로 모순이면 끔(추론으로 확정). 하나라도 확정되면 다시 처음부터
      let progressed = false, tried = 0;
      for (const v of rng.shuffle(cand.slice())) {
        for (const e of inc[v]) {
          if (st[e] !== 0 || tried >= P.probe) continue;
          tried++;
          const mark = tK.length;
          const bad = !(setEdge(e, 1) && propagate([eu[e], ev[e]]));
          undoTo(mark);
          if (bad) { if (!(setEdge(e, -1) && propagate([eu[e], ev[e]]))) { ok = false; } progressed = true; break; }
        }
        if (progressed || tried >= P.probe) break;
      }
      if (progressed && ok) continue;
    }
    if (ok) {
      const v = rng.pick(cand);
      const es = inc[v].filter((e) => st[e] === 0);
      const e = rng.pick(es), val = rng() < 0.5 ? 1 : -1;
      guesses++;
      const mark = tK.length;
      stack.push({ mark, e, val });
      if (setEdge(e, val) && propagate([eu[e], ev[e]])) continue;
    }
    // 모순: 가장 최근 찍기를 반대로(이미 반대였으면 더 위로)
    for (;;) {
      if (!stack.length) return { solved: false, wrong, guesses, moves: level.pairs.length + wrong };
      const top = stack.pop();
      undoTo(top.mark);
      wrong++;
      if (wrong >= P.maxWrong) return { solved: false, wrong, guesses, moves: level.pairs.length + wrong };
      if (top.flipped) continue;
      const mark = tK.length;
      stack.push({ mark, e: top.e, val: -top.val, flipped: true });
      if (setEdge(top.e, -top.val) && propagate([eu[top.e], ev[top.e]])) break;
    }
  }
}
