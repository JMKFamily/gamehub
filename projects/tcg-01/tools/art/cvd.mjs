// 색약 시뮬레이션(Machado 2009, 심도 1.0, 선형 RGB) + CIELAB ΔE76. art-director UX 규격 검사용
const M = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
export const CVD_MATRICES = M;
const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const toSrgb = (v) => { v = Math.min(1, Math.max(0, v)); return Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) * 255); };
const hex2 = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export function simulate(hex, kind) {
  if (kind === 'normal') return hex;
  const l = hex2(hex).map(toLin), m = M[kind];
  const o = m.map((r) => r[0] * l[0] + r[1] * l[1] + r[2] * l[2]).map(toSrgb);
  return '#' + o.map((v) => v.toString(16).padStart(2, '0')).join('');
}
export function lab(hex) {
  const [r, g, b] = hex2(hex).map(toLin);
  let x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
export const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
export const KINDS = ['normal', 'protan', 'deutan', 'tritan'];
export function minPairDE(colors) {
  const out = {};
  for (const k of KINDS) { let min = 1e9, pair = ''; const s = Object.fromEntries(Object.entries(colors).map(([n, c]) => [n, simulate(c, k)])); const ks = Object.keys(s);
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const d = dE(s[ks[i]], s[ks[j]]); if (d < min) { min = d; pair = ks[i] + '~' + ks[j]; } }
    out[k] = { min_dE: +min.toFixed(1), pair }; }
  return out;
}
if (process.argv[1]?.endsWith('cvd.mjs')) {
  const c = JSON.parse(process.argv[2]);
  console.log(minPairDE(c));
}
