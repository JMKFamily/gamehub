import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
const P = fileURLToPath(new URL("../../", import.meta.url)).split(String.fromCharCode(92)).join("/");
const { compileLevel, simulate } = await import(new URL('../../../../games/reverbound/js/physics.js', import.meta.url));
const bal0 = JSON.parse(readFileSync(P + 'balance.json', 'utf8'));
const lvl = JSON.parse(readFileSync(P + 'levels/01-level1.json', 'utf8'));
const sp = lvl.objects[0]; const c = sp.x + 0.5;
const combos = process.argv.slice(2).map((s) => s.split('x').map(Number));
for (const [w, h] of combos.length ? combos : [[bal0.spike_hitbox_w_t, bal0.spike_hitbox_h_t]]) {
  const bal = { ...bal0, spike_hitbox_w_t: w, spike_hitbox_h_t: h };
  const one = { ...lvl, objects: [sp], length_tiles: c + 6 };
  const L = compileLevel(one, bal);
  const none = simulate(L, []);
  const ok = [];
  for (let k = 0; k < L.nTicks; k++) if (simulate(L, [k]).ok) ok.push(k);
  const kL = ok[ok.length - 1], kE = ok[0];
  const dL = c - (L.X[kL] + 0.5), dE = c - (L.X[kE] + 0.5);
  console.log(`w ${w} h ${h}: 무입력 사망 틱 중심 간격 ${(c - (none.x + 0.5)).toFixed(3)} t (직전 틱 ${(c - (L.X[none.k] + 0.5)).toFixed(3)}), 이륙 창 d ${dL.toFixed(2)}~${dE.toFixed(2)} t = ${(((kL - kE + 1) / 240) * 1000).toFixed(1)} ms`);
}
