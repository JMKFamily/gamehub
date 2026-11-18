// Web Audio 합성 효과음·음악 (art.json sound). 테스트 모드(?test=1)에서는 아무 소리도 만들지 않는다.
import { D } from './data.js';

const S = { ctx: null, master: null, sfxBus: null, musBus: null, musFilter: null, enabled: true, music: true, off: false, drone: null, motifTimer: null, tension: 0, thumbAt: 0, hero: null };
const db = (x) => Math.pow(10, x / 20);
export const audio = S;

export function initAudio(opts) {
  S.off = !!opts.off; S.enabled = opts.sound !== false; S.music = opts.music !== false;
}
export function unlock() {
  if (S.off || S.ctx) { if (S.ctx && S.ctx.state === 'suspended') S.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  S.ctx = new AC();
  S.master = S.ctx.createGain(); S.master.gain.value = db(D.art.sound.master_db); S.master.connect(S.ctx.destination);
  S.sfxBus = S.ctx.createGain(); S.sfxBus.connect(S.master);
  S.musFilter = S.ctx.createBiquadFilter(); S.musFilter.type = 'lowpass'; S.musFilter.frequency.value = 20000;
  S.musBus = S.ctx.createGain(); S.musBus.gain.value = S.music ? 1 : 0;
  S.musBus.connect(S.musFilter); S.musFilter.connect(S.master);
  setTimeout(startBed, 120); // 첫 탭 프레임을 막지 않게 바탕음은 조금 뒤(round-2 D1)
}
export function suspendAudio() { if (S.ctx && S.ctx.state === 'running') S.ctx.suspend(); }
export function resumeAudio() { if (S.ctx && S.ctx.state === 'suspended') S.ctx.resume(); }
export function setSound(on) { S.enabled = on; }
export function setMusic(on) { S.music = on; if (S.musBus) S.musBus.gain.value = on ? 1 : 0; }

let noiseBuf = null;
function noise() {
  if (!noiseBuf) { noiseBuf = S.ctx.createBuffer(1, S.ctx.sampleRate, S.ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const n = S.ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true; return n;
}
function env(g, t0, dur, peak) {
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.01, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

// 효과음 하나: osc "a+b xN", f_hz, dur_ms, gain_db, filter (30-art 6절 표)
export function sfx(id, extraDb = 0) {
  if (S.off || !S.enabled || !S.ctx) return;
  const def = D.art.sound.sfx.find((s) => s.id === id);
  if (!def) return;
  const c = S.ctx, t0 = c.currentTime + 0.005, dur = def.dur_ms / 1000, f = def.f_hz;
  const out = c.createGain(); out.gain.value = db(def.gain_db + extraDb);
  let dest = out;
  if (def.filter) {
    const fl = c.createBiquadFilter();
    const ty = def.filter.type;
    fl.type = ty.startsWith('lowpass') ? 'lowpass' : ty.startsWith('highpass') ? 'highpass' : 'bandpass';
    fl.frequency.value = def.filter.f_hz;
    if (ty.endsWith('sweep_up')) { fl.frequency.setValueAtTime(def.filter.f_hz / 8, t0); fl.frequency.exponentialRampToValueAtTime(def.filter.f_hz, t0 + dur); }
    if (ty.endsWith('sweep_down')) { fl.frequency.setValueAtTime(def.filter.f_hz, t0); fl.frequency.exponentialRampToValueAtTime(def.filter.f_hz / 6, t0 + dur); }
    out.connect(fl); fl.connect(S.sfxBus);
  } else out.connect(S.sfxBus);
  const parts = def.osc.split('+').map((p) => { const m = p.trim().match(/^(\w+)(?:\s*x(\d+))?$/); return { type: m[1], n: m[2] ? +m[2] : 0 }; });
  const tonal = parts.filter((p) => p.type !== 'noise' && !p.n).length;
  let fi = 0;
  for (const p of parts) {
    if (p.type === 'noise') {
      const n = noise(), g = c.createGain(), bp = c.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.setValueAtTime(f[0], t0); if (f[1]) bp.frequency.exponentialRampToValueAtTime(f[1], t0 + dur); bp.Q.value = 0.8;
      env(g, t0, dur, 1); n.connect(bp); bp.connect(g); g.connect(dest); n.start(t0); n.stop(t0 + dur + 0.02);
    } else if (p.n) {
      const fr = f.slice(Math.min(tonal, f.length - 1));
      fr.forEach((hz, i) => {
        const o = c.createOscillator(), g = c.createGain(), st = t0 + (i * dur) / (fr.length + 2);
        o.type = p.type; o.frequency.value = hz; env(g, st, dur - (st - t0), 0.6 / Math.sqrt(fr.length));
        o.connect(g); g.connect(dest); o.start(st); o.stop(t0 + dur + 0.02);
      });
    } else {
      const o = c.createOscillator(), g = c.createGain();
      o.type = p.type;
      const seq = parts.some((q) => q.n) ? [f[fi]] : f;
      o.frequency.setValueAtTime(seq[0], t0);
      for (let i = 1; i < seq.length; i++) o.frequency.exponentialRampToValueAtTime(seq[i], t0 + (dur * i) / (seq.length - 1));
      env(g, t0, dur, 0.7); o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.02);
      fi++;
    }
  }
}

// ---------- 음악: 공통 바탕(마른 바다) + 호명자 모티프 ----------
function startBed() {
  const b = D.art.sound.music.bed, c = S.ctx;
  const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
  o.type = b.drone_osc; o.frequency.value = b.drone_hz; lp.type = 'lowpass'; lp.frequency.value = b.drone_lowpass_hz; g.gain.value = db(b.gain_db);
  o.connect(lp); lp.connect(g); g.connect(S.musBus); o.start();
  for (const hz of b.glass_partials_hz) { const q = c.createOscillator(), qg = c.createGain(); q.frequency.value = hz; qg.gain.value = db(b.gain_db - 16); q.connect(qg); qg.connect(S.musBus); q.start(); }
  S.drone = o;
  const drip = () => { if (!S.ctx) return; if (S.music) dripOnce(); const [a, z] = b.drip_every_s; setTimeout(drip, (a + Math.random() * (z - a)) * 1000); };
  setTimeout(drip, 2000);
}
function dripOnce() {
  const c = S.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(1800, t0); o.frequency.exponentialRampToValueAtTime(700, t0 + 0.12);
  env(g, t0, 0.18, 0.05); o.connect(g); g.connect(S.musBus); o.start(t0); o.stop(t0 + 0.2);
}
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function noteHz(name, oct) { return 440 * Math.pow(2, (NOTE[name] + (oct + 1) * 12 - 69) / 12); }
// 판 음악: 내 차례에 내 호명자 모티프
export function motif(heroId) {
  if (!S.ctx || S.off) return;
  S.hero = heroId;
  clearInterval(S.motifTimer);
  const m = D.art.sound.music.heroes[heroId];
  if (!m) return;
  const oct = +m.root.slice(-1);
  const notes = m.motif.split('—')[0].trim().split(/\s+/).map((n) => noteHz(n.replace('♭', 'b'), oct));
  const beat = 60 / m.bpm;
  let i = 0;
  S.motifTimer = setInterval(() => {
    if (!S.music || !S.ctx) return;
    const c = S.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = m.timbre.startsWith('square') ? 'square' : m.timbre.startsWith('sawtooth') ? 'sawtooth' : m.timbre.startsWith('triangle') || m.timbre.startsWith('noise') ? 'triangle' : 'sine';
    o.frequency.value = notes[i % notes.length] * Math.pow(2, S.tension / 12);
    env(g, t0, beat * 0.9, 0.035); o.connect(g); g.connect(S.musBus); o.start(t0); o.stop(t0 + beat);
    i++;
    if (i % (notes.length + 3) === 0) i = 0;
  }, beat * 1000 * 2);
}
export function stopMotif() { clearInterval(S.motifTimer); }
// 명줄 위기(30-art 5-6): 저역 통과·지속음 올림·쿵
export function tension(level) {
  if (!S.ctx) return;
  const L = D.art.tempo.immersion.low_lifeline;
  const lv = level ? L[level - 1] : null;
  S.tension = lv ? lv.drone_up_semitones : 0;
  S.musFilter.frequency.setTargetAtTime(lv ? lv.music_lowpass_hz : 20000, S.ctx.currentTime, 0.2);
  if (S.drone) S.drone.detune.setTargetAtTime(S.tension * 100, S.ctx.currentTime, 0.3);
}
export function thump() {
  if (!S.ctx || !S.enabled) return;
  const c = S.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.2); env(g, t0, 0.25, 0.3); o.connect(g); g.connect(S.sfxBus); o.start(t0); o.stop(t0 + 0.3);
}
export function duck(dbv, ms) {
  if (!S.ctx || !S.music) return;
  const g = S.musBus.gain, t0 = S.ctx.currentTime;
  g.cancelScheduledValues(t0); g.setValueAtTime(db(dbv), t0); g.setTargetAtTime(1, t0 + ms / 1000, 0.15);
}
