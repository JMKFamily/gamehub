// 효과 Canvas 한 장(30-art 5-8): 입자·공격 궤적·대상 화살표·피해 숫자·어둡게 하기·고리 빛. 게임 시계로 돈다.
import { D } from './data.js';
import { G } from './anim.js';

export const FX = { cv: null, ctx: null, W: 0, H: 0, k: 1, parts: [], nums: [], arrows: [], rings: [], dark: { a: 0, to: 0, t: 0, dur: 0, from: 0 }, aim: null, seed: 7, budget: 120 };
let rs = 1;
export function rnd() { if (G.test) { rs = (rs * 16807) % 2147483647; return rs / 2147483647; } return Math.random(); }

export function fxInit(cv, W, H, k) {
  FX.cv = cv; FX.W = W; FX.H = H; FX.k = k;
  cv.width = Math.round(W * k); cv.height = Math.round(H * k); cv.style.width = W + 'px'; cv.style.height = H + 'px';
  FX.ctx = cv.getContext('2d');
  FX.budget = W * H > 600000 ? D.art.tempo.particle_budget.desktop_max : D.art.tempo.particle_budget.mobile_max;
  FX.parts = []; FX.nums = []; FX.arrows = []; FX.rings = []; FX.aim = null; FX.guide = null; FX.demo = null; FX.dark = { a: 0, to: 0, t: 0, dur: 0, from: 0 }; rs = 1;
}
export function burst(x, y, n, color, spd = 1) {
  const ratio = G.reduceMotion ? D.art.tempo.reduce_motion.particles_ratio : 1;
  n = Math.round(n * ratio);
  for (let i = 0; i < n && FX.parts.length < FX.budget; i++) {
    const a = rnd() * Math.PI * 2, v = (0.03 + rnd() * 0.08) * spd;
    FX.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.04, life: 0, max: 350 + rnd() * 300, c: color, r: 1.5 + rnd() * 2.5 });
  }
}
// 피해·회복 숫자: 26 px 떠오름, 글자 20 + 2×피해(최대 36), 1.35배 튐 (30-art 5-2)
export function number(x, y, text, color, n, dur) {
  FX.nums.push({ x, y, text, c: color, size: Math.min(36, 20 + 2 * (n || 1)), t: 0, dur: Math.max(1, dur) });
}
export function arrow(x0, y0, x1, y1, dur) { FX.arrows.push({ x0, y0, x1, y1, t: 0, dur }); }
export function setAim(a) { FX.aim = a; }
export function ring(x, y, r, color, dur) { FX.rings.push({ x, y, r, c: color, t: 0, dur: Math.max(1, dur) }); }
export function darken(to, dur) { FX.dark.from = FX.dark.a; FX.dark.to = to; FX.dark.t = 0; FX.dark.dur = dur; if (!(dur > 0)) FX.dark.a = to; }
export function trail(x0, y0, x1, y1, dur, color) { FX.arrows.push({ x0, y0, x1, y1, t: 0, dur, trail: true, c: color }); }

function curve(c, x0, y0, x1, y1, dash) {
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - Math.abs(x1 - x0) * 0.25 - 20;
  c.setLineDash(dash || []); c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke(); c.setLineDash([]);
}
export function fxStep(dt) {
  const c = FX.ctx;
  if (!c) return;
  const P = D.art.palette;
  c.setTransform(FX.k, 0, 0, FX.k, 0, 0);
  c.clearRect(0, 0, FX.W, FX.H);
  const dk = FX.dark;
  if (dk.dur > 0 && dk.t < dk.dur) { dk.t += dt; dk.a = dk.from + (dk.to - dk.from) * Math.min(1, dk.t / dk.dur); }
  if (dk.a > 0.001) { c.fillStyle = P.ui.tide_black; c.globalAlpha = dk.a; c.fillRect(0, 0, FX.W, FX.H); c.globalAlpha = 1; }
  for (let i = 0; i < FX.rings.length; i++) {
    const r = FX.rings[i]; r.t += dt; const k = r.t / r.dur;
    if (k >= 1) { FX.rings.splice(i--, 1); continue; }
    c.strokeStyle = r.c; c.globalAlpha = 1 - k; c.lineWidth = 6 * (1 - k) + 1; c.beginPath(); c.arc(r.x, r.y, r.r * (0.6 + 0.6 * k), 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
  }
  for (let i = 0; i < FX.parts.length; i++) {
    const p = FX.parts[i]; p.life += dt;
    if (p.life >= p.max) { FX.parts.splice(i--, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.00025 * dt;
    c.globalAlpha = 1 - p.life / p.max; c.fillStyle = p.c; c.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  }
  c.globalAlpha = 1;
  for (let i = 0; i < FX.arrows.length; i++) {
    const a = FX.arrows[i]; a.t += dt;
    if (a.t >= a.dur) { FX.arrows.splice(i--, 1); continue; }
    const k = a.t / a.dur;
    if (a.trail) { c.strokeStyle = a.c || P.ui.salt_white; c.globalAlpha = 1 - k; c.lineWidth = 4; curve(c, a.x0, a.y0, a.x1, a.y1); c.globalAlpha = 1; }
    else { c.strokeStyle = P.ui.focus; c.lineWidth = 3; c.globalAlpha = Math.min(1, k * 4); curve(c, a.x0, a.y0, a.x1, a.y1, [8, 6]); c.beginPath(); c.arc(a.x1, a.y1, 9, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  }
  // 튜토리얼 가리킴: 패널 → 대상 점선 화살표(2 px), 끌기 손가락 원(지름 28)이 출발 → 도착 1.2 s 반복
  if (FX.guide) { const g = FX.guide; c.strokeStyle = P.ui.focus; c.lineWidth = 2; c.setLineDash([6, 5]); c.beginPath(); c.moveTo(g.x0, g.y0); c.lineTo(g.x1, g.y1); c.stroke(); c.setLineDash([]); const an = Math.atan2(g.y1 - g.y0, g.x1 - g.x0); c.beginPath(); c.moveTo(g.x1, g.y1); c.lineTo(g.x1 - 9 * Math.cos(an - 0.45), g.y1 - 9 * Math.sin(an - 0.45)); c.moveTo(g.x1, g.y1); c.lineTo(g.x1 - 9 * Math.cos(an + 0.45), g.y1 - 9 * Math.sin(an + 0.45)); c.stroke(); }
  if (FX.demo) { const m = FX.demo; m.t = ((m.t || 0) + dt) % m.ms; const k = Math.min(1, m.t / (m.ms * 0.8)), e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k); const x = m.x0 + (m.x1 - m.x0) * e, y = m.y0 + (m.y1 - m.y0) * e; c.globalAlpha = 0.85; c.fillStyle = P.ui.salt_white; c.beginPath(); c.arc(x, y, m.d / 2, 0, Math.PI * 2); c.fill(); c.strokeStyle = P.ui.focus; c.lineWidth = 3; c.beginPath(); c.arc(x, y, m.d / 2 + 4, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  if (FX.aim) { const a = FX.aim; c.strokeStyle = P.ui.focus; c.lineWidth = 3; curve(c, a.x0, a.y0, a.x1, a.y1, [8, 6]); c.beginPath(); c.arc(a.x1, a.y1, 10, 0, Math.PI * 2); c.stroke(); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let i = 0; i < FX.nums.length; i++) {
    const n = FX.nums[i]; n.t += dt; const k = n.t / n.dur;
    if (k >= 1) { FX.nums.splice(i--, 1); continue; }
    const pop = k < 0.15 ? 1 + 0.35 * (k / 0.15) : k < 0.3 ? 1.35 - 0.35 * ((k - 0.15) / 0.15) : 1;
    c.font = `800 ${Math.round(n.size * pop)}px 'Noto Sans KR','Malgun Gothic',system-ui,sans-serif`;
    c.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    const y = n.y - 26 * Math.min(1, k * 1.6);
    c.lineWidth = 4; c.strokeStyle = P.ui.tide_black; c.strokeText(n.text, n.x, y); c.fillStyle = n.c; c.fillText(n.text, n.x, y);
  }
  c.globalAlpha = 1;
}
