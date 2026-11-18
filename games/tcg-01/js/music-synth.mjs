// 썰물 영장 BGM 합성기 (art-director, 2026-11-18 요청자 지시 "아주 비어 있고 느리고 음산한 멜로디").
// 외부 소리 파일 없음: 드론·바람(잡음)·물방울·금속 울림·드문 단2/트라이톤 동기 + 합성 잔향(IR)·딜레이. 사양은 art.json sound.music.
// 빌드는 이 파일을 그대로 복사해 씁니다(브라우저 ES 모듈, 의존성 없음).
//   const m = createMusic(ctx, musicBus, D.art.sound.music, { seed });  m.play('menu'|'battle'|'battle_tension'|'crate', { hero })
//   m.sting('victory'|'defeat');  m.stop();
// 오프라인 렌더(tools/art/music-render.mjs)는 scheduleAll()로 같은 사건열을 미리 깔아 잽니다.

export function rng(seed) { let x = (seed >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function noteHz(n) { const m = n.match(/^([A-G][#b]?)(-?\d)$/); return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); }
const dbg = (x) => Math.pow(10, x / 20);

// 합성 잔향 IR: 스테레오 잡음 × 지수 감쇠(+ 초반 어두운 저역 통과 느낌을 위해 고역을 시간에 따라 깎음)
export function makeIR(ctx, seconds, decay, seed = 7) {
  const r = rng(seed), len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let lp = 0;
    for (let i = 0; i < len; i++) { const t = i / len, k = 0.15 + 0.8 * t; lp += (r() * 2 - 1 - lp) * (1 - k); d[i] = lp * Math.pow(1 - t, decay); }
  }
  return buf;
}
function makeNoise(ctx, seed) { const r = rng(seed), len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = r() * 2 - 1; return b; }

export function createMusic(ctx, out, M, opt = {}) {
  const R = rng(opt.seed || 1);
  const between = (a, b) => a + R() * (b - a);
  let nodes = 0; const maxVoices = M.max_voices || 24;
  // 공통 버스: 사건(dry) → 곡 이득(bus) → 바로 out + 잔향·딜레이 송신 → out. 맺음 동기는 따로(sbus) 같은 잔향을 씀
  const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(out);
  const sbus = ctx.createGain(); sbus.gain.value = 1; sbus.connect(out);
  const rev = ctx.createConvolver(); rev.buffer = makeIR(ctx, M.fx.reverb_s, M.fx.reverb_decay, (opt.seed || 1) + 3);
  const revG = ctx.createGain(); revG.gain.value = dbg(M.fx.reverb_wet_db); rev.connect(revG); revG.connect(out);
  const dly = ctx.createDelay(4); dly.delayTime.value = M.fx.delay_s; const fb = ctx.createGain(); fb.gain.value = M.fx.delay_feedback; const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = M.fx.delay_lowpass_hz;
  const dG = ctx.createGain(); dG.gain.value = dbg(M.fx.delay_wet_db); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dG); dG.connect(out);
  const dry = ctx.createGain(); dry.connect(bus); bus.connect(rev); bus.connect(dly); sbus.connect(rev);
  const nb = makeNoise(ctx, (opt.seed || 1) + 11);
  let cur = null, timers = [];

  function voice(fn, t, dur) { if (nodes >= maxVoices) return; nodes++; fn(t); setTimeoutSafe(() => nodes--, (t - ctx.currentTime + dur) * 1000 + 50); }
  function setTimeoutSafe(f, ms) { if (opt.offline) { f(); return; } timers.push(setTimeout(f, Math.max(0, ms))); }

  // ── 소리 재료 ──
  function drone(T, t0) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(dbg(T.drone.gain_db), t0 + 6);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = T.drone.lowpass_hz; lp.Q.value = 0.7;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = T.drone.lfo_hz; lfoG.gain.value = T.drone.lowpass_hz * 0.4; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start(t0);
    const oscs = T.drone.notes.map((n, i) => { const o = ctx.createOscillator(); o.type = T.drone.osc; o.frequency.value = noteHz(n); o.detune.value = (i % 2 ? 1 : -1) * T.drone.detune_cents; const og = ctx.createGain(); og.gain.value = i === 0 ? 1 : dbg(T.drone.upper_db); o.connect(og); og.connect(lp); o.start(t0); return o; });
    lp.connect(g); g.connect(dry);
    return { g, stop: (t) => { g.gain.setTargetAtTime(0.0001, t, 1.2); oscs.concat([lfo]).forEach((o) => o.stop(t + 6)); }, oscs };
  }
  function wind(T, t0, dur) {
    const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.loopStart = between(0, 2);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = T.wind.q; const g = ctx.createGain(); g.gain.value = dbg(T.wind.gain_db);
    let t = t0; while (t < t0 + dur) { bp.frequency.setTargetAtTime(between(T.wind.f_lo_hz, T.wind.f_hi_hz), t, 2.5); g.gain.setTargetAtTime(dbg(T.wind.gain_db + between(-8, 0)), t, 3); t += between(4, 9); }
    s.connect(bp); bp.connect(g); g.connect(dry); s.start(t0); s.stop(t0 + dur);
  }
  function drip(T, t) {
    voice((t) => { const o = ctx.createOscillator(), g = ctx.createGain(), f = between(T.drip.f_lo_hz, T.drip.f_hi_hz);
      o.type = 'sine'; o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(dbg(T.drip.gain_db), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(dry); o.start(t); o.stop(t + 0.3); }, t, 0.3);
  }
  function metal(T, t, dest = dry) {
    const base = between(T.metal.f_lo_hz, T.metal.f_hi_hz), dur = T.metal.decay_s;
    voice((t) => { T.metal.partials.forEach((ratio, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = base * ratio;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(dbg(T.metal.gain_db - i * 5), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (1 + i * 0.6));
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur); }); }, t, dur);
  }
  function note(T, hz, t, len, gainDb, dest = dry) {
    voice((t) => { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = T.motif.osc; o2.type = 'sine'; o.frequency.value = hz; o2.frequency.value = hz * 0.5; o2.detune.value = 4;
      lp.type = 'lowpass'; lp.frequency.value = T.motif.lowpass_hz;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(dbg(gainDb), t + T.motif.attack_s); g.gain.setTargetAtTime(0.0001, t + len * 0.6, len * 0.35);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(dest); o.start(t); o2.start(t); o.stop(t + len * 2); o2.stop(t + len * 2); }, t, len * 2);
  }
  function pulse(T, t) {
    voice((t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(T.pulse.hz * 1.4, t); o.frequency.exponentialRampToValueAtTime(T.pulse.hz, t + 0.12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(dbg(T.pulse.gain_db), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); g.connect(dry); o.start(t); o.stop(t + 0.7); }, t, 0.7);
  }
  function motifAt(T, t, hero) {
    const root = noteHz(hero && M.heroes[hero] ? M.heroes[hero].root : T.motif.root);
    const set = hero && M.heroes[hero] ? M.heroes[hero].cells : T.motif.cells;
    const cell = set[Math.floor(R() * set.length)];
    let tt = t;
    for (const st of cell) { const len = between(T.motif.note_s[0], T.motif.note_s[1]); note(T, root * Math.pow(2, st / 12), tt, len, T.motif.gain_db + between(-3, 0)); tt += len * between(0.9, 1.6); }
    return tt - t;
  }
  // ── 사건 배치(시드 무작위, 반복 주기 없음) ──
  function events(T, t0, dur, hero) {
    const ev = [];
    const add = (rate, f) => { if (!rate) return; let t = t0 + between(rate[0], rate[1]) * 0.5; while (t < t0 + dur) { ev.push([t, f]); t += between(rate[0], rate[1]); } };
    add(T.drip.every_s, (t) => drip(T, t));
    add(T.metal.every_s, (t) => metal(T, t));
    add(T.motif.every_s, (t) => motifAt(T, t, hero));
    if (T.pulse) add([60 / T.pulse.bpm, 60 / T.pulse.bpm], (t) => pulse(T, t));
    return ev.sort((a, b) => a[0] - b[0]);
  }
  function play(track, o = {}) {
    stop(); const T = M.tracks[track]; if (!T) return;
    const t0 = ctx.currentTime + 0.05, horizon = opt.offline ? opt.offline_s : 3600;
    bus.gain.cancelScheduledValues(t0); bus.gain.setValueAtTime(0.0001, t0); bus.gain.exponentialRampToValueAtTime(dbg(T.gain_db), t0 + M.crossfade_s);
    const d = drone(T, t0); wind(T, t0, horizon);
    const ev = events(T, t0, horizon, o.hero);
    if (opt.offline) ev.forEach(([t, f]) => f(t));
    else { let i = 0; const tick = () => { const now = ctx.currentTime; while (i < ev.length && ev[i][0] < now + 1.5) { ev[i][1](ev[i][0]); i++; } }; tick(); const id = setInterval(tick, 500); timers.push({ clear: () => clearInterval(id) }); }
    cur = { d, T };
  }
  function stop() { if (!cur) return; const t = ctx.currentTime; cur.d.stop(t); for (const x of timers) x.clear ? x.clear() : clearTimeout(x); timers = []; cur = null; }
  function sting(name) {
    const S = M.stingers[name], t0 = ctx.currentTime + 0.05, T = { motif: { osc: S.osc, lowpass_hz: S.lowpass_hz, attack_s: 0.08 } };
    let t = t0; S.notes.forEach((n, i) => { note(T, noteHz(n), t, S.note_s[i], S.gain_db, sbus); t += S.note_s[i] * 0.8; });
    if (S.metal) metal({ metal: { ...M.tracks.battle.metal, gain_db: S.gain_db - 6 } }, t0, sbus);
  }
  return { play, stop, sting, bus, voices: () => nodes };
}
