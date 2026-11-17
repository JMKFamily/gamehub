// QA 봇(qa-round.mjs --part bots)과 같은 모델을 node에서 physics.js로 재현
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
const P = fileURLToPath(new URL("../../", import.meta.url)).split(String.fromCharCode(92)).join("/");
const { compileLevel, step, startState } = await import(new URL('../../../../games/reverbound/js/physics.js', import.meta.url));
const { verifyLevel } = await import(pathToFileURL(P + 'tools/verify-levels.mjs'));
const bal = JSON.parse(readFileSync(P + 'balance.json', 'utf8'));
const N = +(process.argv[2] || 2000);
let seed = 12345;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const profiles = { skilled_sd25: { sd: 25, miss: 0, extra: 0 }, novice_sd50: { sd: 50, miss: 0.01, extra: 0.01 }, child_sd70: { sd: 70, miss: 0.03, extra: 0.02 }, child_sd90: { sd: 90, miss: 0.05, extra: 0.03 } };
const ncdf = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
const out = {};
// 사용: node tools/sim/bots.mjs [N] [프로필|all] [레벨 id 목록, 쉼표]  예) node tools/sim/bots.mjs 20000 skilled_sd25 04,05
if (process.argv[3] === 'all') process.argv[3] = '';
const onlyIds = process.argv[4] && process.argv[4] !== 'all' ? process.argv[4].split(',') : null;
// 5번째 인자: 세션 수 (0이면 생략). 예) node tools/sim/bots.mjs 2000 child_sd70 all 1000
const SESS = +(process.argv[5] || 0), CAP = 300;
for (const f of bal.levels.filter((f) => !onlyIds || onlyIds.some((id) => f.includes('/' + id + '-')))) {
  const lvl = JSON.parse(readFileSync(P + f, 'utf8'));
  const L = compileLevel(lvl, bal);
  const v = verifyLevel(P + f, bal);
  const base = v.inputs.map((r) => r.tick);
  const run = (taps) => {
    taps.sort((a, b) => a - b);
    const starts = new Set(taps);
    let s = startState(L), j = 0, until = -1;
    for (let k = 0; k < L.nTicks; k++) {
      while (j < taps.length && taps[j] <= k) { until = Math.max(until, taps[j] + 24); j++; }
      const down = k < until, edge = starts.has(k);
      const r = step(L, s, k, down, edge);
      if (r.dead) return { clear: false, x: r.x };
      if (r.clear) return { clear: true };
      s = r.s;
    }
    return { clear: false, x: L.level.length_tiles };
  };
  const attempt = (p) => {
    const taps = [];
    for (const k of base) {
      if (rnd() < p.miss) continue;
      taps.push(Math.max(0, Math.round(k + (gauss() * p.sd / 1000) * 240)));
      if (rnd() < p.extra) taps.push(Math.round(k + (0.15 + rnd() * 0.3) * 240));
    }
    return run(taps);
  };
  const res = { taps: base.length, min_window_ms: v.min_window_ms };
  for (const [pn, p] of Object.entries(profiles).filter(([n]) => !process.argv[3] || n === process.argv[3])) {
    let clears = 0; const deaths = []; let prog = 0;
    for (let n = 0; n < N; n++) { const r = attempt(p); if (r.clear) { clears++; prog += 100; } else { deaths.push(r.x); prog += 100 * r.x / lvl.length_tiles; } }
    // 한 지점(±3 t) 몰림: 사망 x를 6 t 창으로 훑어 최대 비율
    deaths.sort((a, b) => a - b);
    let best = 0, bx = null;
    for (let i = 0, j = 0; i < deaths.length; i++) { while (deaths[i] - deaths[j] > 6) j++; if (i - j + 1 > best) { best = i - j + 1; bx = deaths[j]; } }
    // 해석값: 탭별 창(중심 대칭 가정) 안에 들 확률 × (1-놓침)
    const ana = v.inputs.reduce((a, r) => a * (1 - p.miss) * (ncdf((r.late_ms) / p.sd) - ncdf(-(r.early_ms) / p.sd)), 1);
    const pc = clears / N;
    // 세션 시뮬레이션: 클리어할 때까지 시도를 반복해 "첫 클리어까지 시도 횟수"를 직접 센다 (상한 CAP, 넘으면 CAP+1로 기록)
    let session = null;
    if (SESS > 0) {
      const a = [];
      for (let s = 0; s < SESS; s++) { let n = 1; while (n <= CAP && !attempt(p).clear) n++; a.push(n); }
      a.sort((x, y) => x - y);
      session = { sessions: SESS, cap: CAP, median: a[Math.floor(SESS / 2)], p25: a[Math.floor(SESS / 4)], p75: a[Math.floor(SESS * 3 / 4)], over_cap: a.filter((n) => n > CAP).length };
    }
    res[pn] = { session_first_clear: session, clear_rate: +pc.toFixed(3), expected_attempts: pc ? +(1 / pc).toFixed(1) : null, median_first_clear: pc ? Math.max(1, Math.ceil(Math.log(0.5) / Math.log(1 - pc))) : null, mean_progress: +(prog / N).toFixed(1), top_death_cluster_share: deaths.length ? +(best / deaths.length).toFixed(3) : 0, top_death_x: bx == null ? null : +bx.toFixed(1), deaths: deaths.length, analytic_clear: +ana.toFixed(3) };
  }
  out[lvl.id] = res;
}
// 레벨 1 세션 시뮬레이션 (상한 200, 세션 수 = N/10)
const lvl1 = bal.levels[0];
console.log(JSON.stringify(out, null, 1));
