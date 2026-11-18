// Web Audio 합성 효과음·음악 (art.json sound). 테스트 모드(?test=1)에서는 아무 소리도 만들지 않는다.
import { D } from './data.js';
import { UI } from './ui.js';
import { createMusic } from './music-synth.mjs';

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
  setTimeout(() => (window.requestIdleCallback || ((f) => setTimeout(f, 0)))(startBed, { timeout: 2000 }), 1500); // 합성기 준비(잔향·잡음 버퍼)가 긴 작업이라 첫 탭·로비 그리기 뒤 쉬는 시간에(UX2 r3)
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
  if ((id === 'victory' || id === 'defeat') && S.onSting) S.onSting(id); // 승패 맺음 동기(음악 쪽)
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

// ---------- 음악: art 합성기(music-synth.mjs, 30-art 6-2 "아주 비어 있고 느리고 음산한" BGM) ----------
// 곡 전환은 지금 화면에서 정함(0.5 s마다 확인, 교차 3 s): 대전 = battle(내 영웅 동기), 내 명줄 ≤ 10 = battle_tension, 팩 개봉 = crate, 나머지 = menu.
// 승패는 곡을 멈추고 맺음 동기(sting). 음악 끔 = musBus 이득 0, 백그라운드 = ctx.suspend()(스케줄러가 이어서 돎).
function startBed() {
  if (!S.ctx || S.mus) return;
  S.mus = createMusic(S.ctx, S.musBus, D.art.sound.music, { seed: Date.now() });
  S.musTimer = setInterval(pickSong, 500); S.onSting = stingFor;
  pickSong();
}
function pickSong() {
  if (!S.mus || !S.ctx) return;
  if (S.stingUntil && performance.now() < S.stingUntil) return;
  const scr = UI.screen;
  const song = scr === 'battle' ? (S.tension > 0 ? 'battle_tension' : 'battle') : scr === 'open' ? 'crate' : 'menu';
  const hero = scr === 'battle' ? S.battleHero || S.hero : null;
  if (song === S.song && hero === S.songHero) return;
  S.song = song; S.songHero = hero;
  S.mus.play(song, { hero });
}
// 대전이 부르는 자리(호환): 영웅 동기 기본값만 기억하고 곡은 pickSong이 정함
export function motif(heroId) { S.hero = S.hero || heroId; }
// 대전 시작 때 실제 내(사람 자리, AI 대 AI면 아래쪽) 영웅 — 영웅 동기 음 높이(테스트 훅 판 포함)
export function battleHero(heroId) { S.battleHero = heroId; S.song = null; pickSong(); }
export function stopMotif() {}
export function tension(level) { S.tension = level || 0; if (!level) S.hero = null; pickSong(); }
function stingFor(id) { if (!S.mus) return; S.mus.stop(); S.mus.sting(id); S.song = null; S.stingUntil = performance.now() + 8000; }
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
