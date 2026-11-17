// WebAudio 절차적 합성 + 오디오 시계 예약 (30-art 12-4~12-6, 값은 data/sound.json·music.json)
const dbLin = (db) => Math.pow(10, db / 20);

export class AudioOut {
  constructor(sound, music) {
    this.S = sound; this.M = music;
    this.ctx = null;
    this.live = []; // 예약된 소스 {src, t}
    this.song = null;
    this.prefs = { music: true, sfx: true, master: true };
    this.lookahead = 0.1;
  }

  get ok() { return !!this.ctx; }
  // 사용자 제스처 안에서 호출
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { return false; }
      this._graph();
      this._timer = setInterval(() => this.pump(), 25);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }

  _graph() {
    const c = this.ctx, m = this.S.master;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = m.comp.threshold; this.comp.knee.value = m.comp.knee; this.comp.ratio.value = m.comp.ratio;
    this.comp.attack.value = m.comp.attack; this.comp.release.value = m.comp.release;
    this.masterG = c.createGain();
    this.comp.connect(this.masterG).connect(c.destination);
    this.musicFade = c.createGain();
    this.musicTog = c.createGain();
    this.sfxTog = c.createGain();
    this.musicFade.connect(this.musicTog).connect(this.comp);
    this.sfxTog.connect(this.comp);
    this.duck = c.createGain();
    this.duck.connect(this.musicFade);
    const n = Math.floor(c.sampleRate * this.S.noise_buffer_s);
    this.noise = c.createBuffer(1, n, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.applyPrefs();
  }

  applyPrefs() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, r = this.S.master.bus_ramp_ms / 1000;
    const set = (g, on) => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(on ? 1 : 0, t + r); };
    set(this.musicTog, this.prefs.music);
    set(this.sfxTog, this.prefs.sfx);
    set(this.masterG, this.prefs.master);
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }
  // 자동 보정값 (ms): outputLatency + baseLatency
  autoLatencyMs() {
    if (!this.ctx) return 0;
    return ((this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0)) * 1000;
  }

  // 소리 하나. t = 오디오 시각(s), f = 음 주파수(note 소리), dur = ADSR 음 길이(s)
  play(name, t = null, { f = null, dur = 0.3, gainDb = null, bus = null } = {}) {
    if (!this.ctx) return;
    const c = this.ctx;
    const def = this.S.sounds[name];
    if (!def) return;
    t = Math.max(t ?? c.currentTime, c.currentTime);
    t += (def.delayMs || 0) / 1000;
    const peak = dbLin(gainDb ?? def.db);
    const dest = bus || (def.bus === 'music' ? (name === 'bass' ? this.duck : this.musicFade) : this.sfxTog);
    let out = dest;
    if (def.post) { const pf = c.createBiquadFilter(); pf.type = def.post.type; pf.frequency.value = def.post.f; pf.Q.value = def.post.Q; pf.connect(dest); out = pf; }
    const noteF = f ?? (def.note ? this.levelMusic?.[def.note] : null);
    const notes = def.arpeggio ? this._arp(def, noteF) : [{ t, f: noteF, last: true }];
    for (const nt of notes) {
      for (const ly of def.layers) {
        const g = c.createGain();
        const p = peak * (ly.mul ?? 1);
        let src;
        if (ly.wave === 'noise') { src = c.createBufferSource(); src.buffer = this.noise; src.loop = true; }
        else {
          src = c.createOscillator(); src.type = ly.wave;
          const f0 = ly.f ?? (ly.fMul ?? 1) * (nt.f || 440);
          src.frequency.setValueAtTime(f0, nt.t);
          if (ly.fTo) src.frequency.exponentialRampToValueAtTime(ly.fTo, nt.t + ly.glideMs / 1000);
          if (ly.detune) src.detune.value = ly.detune;
          if (ly.vibrato) {
            const lfo = c.createOscillator(), lg = c.createGain();
            lfo.frequency.value = ly.vibrato.hz; lg.gain.value = 0;
            lg.gain.setValueAtTime(0, nt.t + ly.vibrato.afterMs / 1000);
            lg.gain.linearRampToValueAtTime(ly.vibrato.cents, nt.t + ly.vibrato.afterMs / 1000 + 0.05);
            lfo.connect(lg).connect(src.detune);
            lfo.start(nt.t); lfo.stop(nt.t + dur + 1);
            this.live.push({ src: lfo, t: nt.t });
          }
        }
        let chain = src;
        if (ly.filter) { const bf = c.createBiquadFilter(); bf.type = ly.filter.type; bf.frequency.value = ly.filter.f; bf.Q.value = ly.filter.Q; chain.connect(bf); chain = bf; }
        chain.connect(g).connect(out);
        const e = ly.env, a = e.a / 1000;
        g.gain.setValueAtTime(0, nt.t);
        g.gain.linearRampToValueAtTime(p, nt.t + a);
        let end;
        if (e.linEnd) { g.gain.linearRampToValueAtTime(0, nt.t + e.linEnd / 1000); end = nt.t + e.linEnd / 1000; }
        else if (e.decay != null) {
          const dc = (nt.last && def.arpeggio ? def.arpeggio.lastDecay : e.decay) / 1000;
          g.gain.exponentialRampToValueAtTime(p * 0.001, nt.t + a + dc); end = nt.t + a + dc;
        } else {
          const sus = Math.max(p * e.s, p * 0.001);
          if (e.d > 0) g.gain.exponentialRampToValueAtTime(sus, nt.t + a + e.d / 1000);
          const off = Math.max(nt.t + a + e.d / 1000, nt.t + dur);
          g.gain.setValueAtTime(sus, off);
          g.gain.exponentialRampToValueAtTime(p * 0.001, off + e.r / 1000); end = off + e.r / 1000;
        }
        src.start(nt.t); src.stop(end + 0.02);
        this.live.push({ src, t: nt.t });
      }
    }
    if (this.live.length > 400) { const now = c.currentTime; this.live = this.live.filter((x) => x.t > now - 2); }
  }

  _arp(def, rootF) {
    const ar = def.arpeggio, lm = this.levelMusic;
    const steps = lm?.minor ? ar.minor : ar.major;
    const base = (lm?.root3 ?? 261.63) * ar.octaveMul;
    const t0 = this.ctx.currentTime;
    return steps.map((s, i) => ({ t: t0 + (i * ar.stepMs) / 1000, f: base * Math.pow(2, s / 12), last: i === steps.length - 1 }));
  }

  duckAt(t) {
    const d = this.S.sounds.bass.duck, g = this.duck.gain;
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(d.mul, t + d.downMs / 1000);
    g.setValueAtTime(d.mul, t + d.holdMs / 1000);
    g.linearRampToValueAtTime(1, t + (d.holdMs + d.downMs) / 1000);
  }

  // 곡 예약: baseMs = 레벨 시간 0 의 오디오 시각(ms), events = [{x, name, f, dur, gainDb, duck}]
  setSong(baseMs, events) {
    this.song = { base: baseMs, ev: events, i: 0 };
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, st = baseMs / 1000 + (events[0]?.x ?? 0) / 1000;
    const g = this.musicFade.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    if (st - 0.03 > t) { g.setValueAtTime(g.value, Math.max(t, st - 0.03)); }
    g.linearRampToValueAtTime(1, Math.max(t + 0.01, st));
    this.duck.gain.cancelScheduledValues(t);
    this.duck.gain.setValueAtTime(1, t);
    this.pump();
  }

  // 실패: 음악 페이드 + 앞으로 예약된 소리 정지
  stopSong(fadeS = 0.08) {
    this.song = null;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.musicFade.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + fadeS);
    for (const x of this.live) if (x.t > t + 0.002) { try { x.src.stop(); } catch {} }
    this.live = this.live.filter((x) => x.t <= t + 0.002);
  }

  pump() {
    const s = this.song;
    if (!s || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime, horizon = now + this.lookahead;
    while (s.i < s.ev.length) {
      const e = s.ev[s.i], at = (s.base + e.x) / 1000;
      if (at > horizon) break;
      s.i++;
      if (at < now - 0.02) continue;
      if (e.duck) this.duckAt(at);
      else this.play(e.name, at, e);
    }
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') return this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') return this.ctx.resume(); }
}

// 레벨 곡 이벤트 목록 (12-1 마디별 파트). modeOf(x) = 마디 모드, stageOf(b)
export function buildSong(L, t0, music, sound, modeOf, stageOf) {
  const P = sound.parts, lm = music.levels[L.level.id];
  const ev = [];
  const beat = L.beatMs, eighth = L.eighthMs;
  const bars = L.countInBars + L.level.bars.length;
  const shakerOn = L.level.allowed_slots !== P.shaker_when_allowed_slots_not;
  const playByBar = new Map(), showByBar = new Map();
  for (const s of L.stars) (playByBar.get(s.bar) || playByBar.set(s.bar, []).get(s.bar)).push(s);
  for (const s of L.shows) (showByBar.get(s.bar) || showByBar.set(s.bar, []).get(s.bar)).push(s);
  const third = Math.pow(2, (lm.minor ? 3 : 4) / 12), fifth = Math.pow(2, 7 / 12);
  const mp = music.melody_placeholder;
  const scaleF = (deg) => lm.root3 * mp.octave_mul * Math.pow(2, (lm.scale[deg % lm.scale.length] + 12 * Math.floor(deg / lm.scale.length)) / 12);
  const harmDb = sound.sounds.harmony_db;
  let outroNote = false;
  for (let k = Math.floor(t0 / L.barMs); k < bars; k++) {
    const x0 = k * L.barMs;
    const mode = modeOf(x0 + 1);
    const b = k - L.countInBars;
    const parts = P[mode] || [];
    for (let q = 0; q < L.beatsPerBar; q++) {
      const x = x0 + q * beat;
      if (parts.includes('kick')) ev.push({ x, name: q ? 'kick' : 'kick_one' });
      if (parts.includes('tick')) ev.push({ x, name: q ? 'tick' : 'tick_one' });
    }
    if (parts.includes('bass')) for (const q of [0, 2]) ev.push({ x: x0 + q * beat, name: 'bass', f: lm.root3 / 2, dur: (2 * beat) / 1000 });
    if (parts.includes('pad')) for (const m of [1, third, fifth]) ev.push({ x: x0, name: 'pad', f: lm.root3 * m, dur: L.barMs / 1000 });
    if (shakerOn && parts.includes('shaker')) for (let sl = 0; sl < 8; sl += 2) ev.push({ x: x0 + sl * eighth, name: 'shaker' });
    if (parts.includes('teacher')) for (const s of showByBar.get(b) || []) ev.push({ x: s.t, name: 'teacher' });
    if (mode === 'play') for (const s of playByBar.get(b) || []) ev.push({ x: s.t, duck: true });
    if (parts.includes('melody') && stageOf(b) >= P.melody_from_stage) {
      const starSlots = new Set((playByBar.get(b) || []).map((s) => s.slot));
      mp.slots.forEach((sl, n) => {
        let slot = sl;
        if (starSlots.has(slot)) slot += mp.shift_if_star_slots;
        const deg = mp.degree_walk[(b * mp.slots.length + n) % mp.degree_walk.length];
        const inst = 'mel_' + lm.melody[n % lm.melody.length];
        const x = x0 + Math.max(0, slot) * eighth - (slot < 0 ? -slot * eighth : 0);
        ev.push({ x, name: inst, f: scaleF(deg), dur: beat / 1000 });
        if (stageOf(b) >= P.harmony_from_stage) ev.push({ x, name: inst, f: scaleF(deg + 2), dur: beat / 1000, gainDb: harmDb });
      });
    }
    if (mode === 'outro' && !outroNote) {
      outroNote = true;
      ev.push({ x: x0, name: 'mel_' + lm.melody[0], f: scaleF(0), dur: (2 * beat) / 1000 });
    }
  }
  return ev.filter((e) => e.x >= t0 - 0.5).sort((a, b) => a.x - b.x);
}
