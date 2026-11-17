// WebAudio 절차적 합성 + 오디오 시계 예약 (30-art 12-4~12-6, 값은 data/sound.json·music.json)
import { autoStableAt } from './calib.js';
const dbLin = (db) => Math.pow(10, db / 20);

export class AudioOut {
  constructor(sound, music) {
    this.S = sound; this.M = music;
    this.ctx = null;
    this.live = []; // 예약된 소스 {src, t}
    this.song = null;
    this.prefs = { music: true, sfx: true, master: true };
    // 예약: 0.6 s 앞까지, 한 번에 최대 maxPer 개(급한 것 = urgent 안은 모두). 마디 시작 소리 묶음이 한 프레임에 몰리지 않게 나눔 (round-2 성능)
    this.lookahead = 0.6; this.urgent = 0.08; this.maxPer = 1;
    this.posts = new Map(); // 소리별 공용 post 필터 (선형이라 소리마다 하나를 같이 써도 결과 같음)
  }

  get ok() { return !!this.ctx; }
  // 사용자 제스처 안에서 호출
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { return false; }
      this.unlockedAt = performance.now();
      this.lat = { readings: [], settled: false, result: null }; // R11 안정 대기 기록
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
  // R11 ③ 잠금 해제 뒤 자동 지연 안정 대기 (매 프레임 호출, st = auto_latency_read.stable_wait). 반환 = 안정(또는 시간 초과)
  pollStable(st) {
    const s = this.lat;
    if (!s) return !this.ctx;
    if (s.settled) return true;
    s.readings.push({ t: performance.now() - this.unlockedAt, v: this.autoLatencyMs() });
    const r = autoStableAt(s.readings, st);
    if (r.stable || r.t >= st.max_wait_ms) { s.settled = true; s.result = r; s.readings = s.readings.slice(-4); }
    return s.settled;
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
    if (def.post) {
      const key = name + (dest === this.duck ? '|d' : dest === this.musicFade ? '|m' : dest === this.sfxTog ? '|s' : '');
      let pf = key.includes('|') ? this.posts.get(key) : null;
      if (!pf) { pf = c.createBiquadFilter(); pf.type = def.post.type; pf.frequency.value = def.post.f; pf.Q.value = def.post.Q; pf.connect(dest); if (key.includes('|')) this.posts.set(key, pf); }
      out = pf;
    }
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
    if (this.live.length > 48) this._prune(c.currentTime);
  }

  // 이미 시작한 소스는 목록에서 뺌 (제자리 정리, 새 배열 없음). stopSong 은 아직 시작 안 한 것만 멈추면 됨 (R12)
  _prune(now) { const L = this.live; let j = 0; for (let i = 0; i < L.length; i++) if (L[i].t > now) L[j++] = L[i]; L.length = j; }

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
    this.live.length = 0; // 이미 시작한 소리는 stopSong 이 멈출 일이 없어 들고 있지 않음 (R12: 끝난 노드를 오래 붙잡아 GC 추적 비용이 커지지 않게)
  }

  pump() {
    const s = this.song;
    if (!s || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime, horizon = now + this.lookahead;
    let n = 0;
    while (s.i < s.ev.length) {
      const e = s.ev[s.i], at = (s.base + e.x) / 1000;
      if (at > horizon) break;
      if (n >= this.maxPer && at > now + this.urgent) break; // 나머지는 다음 pump
      s.i++; n++;
      if (at < now - 0.02) continue;
      if (e.duck) this.duckAt(at);
      else this.play(e.name, at, e);
    }
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') return this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') return this.ctx.resume(); }
}

// 멜로디 동기 배치 v3 (30-art 16-7, sound.json music.melody_r3). 기준 구현 assets/sound-check.mjs placeMelodyV3 와 같은 규칙:
//   울리는 마디 = 카운트인·outro 를 뺀 모든 마디 중 단계 ≥ from_stage(숨 고르기 마디 포함), 피할 자리 = 레벨의 모든 판정 별(8분 절대 자리),
//   별 자리면 같은 마디 안 0 → −1 → +1, 안 되면 뺌. 화음(단계 ≥ melody.harmony.from_stage)·악기 순서는 music.melody 그대로.
// 반환: 마디 번호 → [{slot, d, len, inst, harmony}]
export function placeMelodyV3(L, lm, rule, rule3) {
  const level = L.level;
  const stageOf = (b) => { let s = 1; for (const x of level.sections || []) if ((x.start_bar ?? 0) <= b && x.stage) s = x.stage; return s; };
  const starSet = new Set(L.stars.map((s) => s.bar * 8 + s.slot));
  const byBar = new Map();
  for (let b = 0; b < Math.min(level.bars.length, L.outroBar); b++) {
    if (stageOf(b) < rule3.from_stage) continue;
    const half = b % rule.frame_bars, used = new Set(), out = [];
    lm.motif.forEach((n, idx) => {
      if (Math.floor(n.s / 8) !== half) return;
      const want = n.s % 8;
      const slot = rule3.avoid_star.try.map((o) => want + o).find((s) => s >= 0 && s < 8 && !starSet.has(b * 8 + s) && !used.has(s));
      if (slot == null) return; // 옮길 자리 없음 → 뺌
      used.add(slot);
      const inst = lm.melody[idx % lm.melody.length];
      out.push({ slot, d: n.d, len: n.len, inst });
      if (stageOf(b) >= rule.harmony.from_stage) out.push({ slot, d: n.d + rule.harmony.deg_plus, len: n.len, inst, harmony: true });
    });
    byBar.set(b, out);
  }
  return byBar;
}

// 콤보 단계 화음 시각 (sound.json music.combo_r3, assets/sound-check.mjs comboChordSlots 와 같은 규칙):
//   그 판정 별 8분 자리 + ceil(min_after_beats × 2) ~ + max_wait_beats × 2 중 첫 빈 정박(짝수 8분, 판정 별 없음),
//   없으면(fallback_any_eighth) 같은 범위 첫 빈 8분, 그것도 없으면 null(소리 없이 넘김). 반환 = 레벨 시간 ms
export function comboChordTime(L, starIndex, C) {
  const set = L._slotSet || (L._slotSet = new Set(L.stars.map((s) => Math.round(s.t / L.eighthMs))));
  const s0 = Math.round(L.stars[starIndex].t / L.eighthMs);
  const lo = s0 + Math.ceil(C.min_after_beats * 2), hi = s0 + C.max_wait_beats * 2;
  for (let s = lo; s <= hi; s++) if (s % 2 === 0 && !set.has(s)) return s * L.eighthMs;
  if (C.fallback_any_eighth) for (let s = lo; s <= hi; s++) if (!set.has(s)) return s * L.eighthMs;
  return null;
}

// 레벨 곡 이벤트 목록 (12-1 파트, round-3 16-7). modeOf(x) = 그 시각의 마디 상태(countin/play/rest/outro/end), stageOf(b).
// 숨 고르기 마디(rest, outro 앞)는 melody_r3.during_breath(= play) 파트로 울림. 이벤트마다 그 시각의 상태로 파트를 고름
// (연습 부활 카운트인은 마디 중간에서 시작할 수 있음: 체크포인트 박 한 마디 앞)
export function buildSong(L, t0, music, sound, modeOf, stageOf) {
  const P = sound.parts, lm = music.levels[L.level.id], rule = music.melody, r3 = music.melody_r3;
  const ev = [];
  const beat = L.beatMs, eighth = L.eighthMs;
  const bars = L.countInBars + L.level.bars.length;
  const shakerOn = L.level.allowed_slots !== P.shaker_when_allowed_slots_not;
  const playByBar = new Map();
  for (const s of L.stars) (playByBar.get(s.bar) || playByBar.set(s.bar, []).get(s.bar)).push(s);
  const third = Math.pow(2, (lm.minor ? 3 : 4) / 12), fifth = Math.pow(2, 7 / 12);
  const scaleF = (deg) => lm.root3 * rule.octave_mul * Math.pow(2, (lm.scale[deg % lm.scale.length] + 12 * Math.floor(deg / lm.scale.length)) / 12);
  const harmDb = sound.sounds.harmony_db;
  const duckOn = P.bass_duck_on || ['play'];
  const mel = L.melody || (L.melody = placeMelodyV3(L, lm, rule, r3)); // 레벨마다 한 번 계산
  const partsAt = (x) => { const m = modeOf(x + 0.5); return { m, parts: P[m === 'rest' ? r3.during_breath : m] || [] }; };
  let outroNote = false;
  for (let k = Math.max(0, Math.floor(t0 / L.barMs)); k < bars; k++) {
    const x0 = k * L.barMs;
    const b = k - L.countInBars;
    for (let q = 0; q < L.beatsPerBar; q++) {
      const x = x0 + q * beat, { m, parts } = partsAt(x);
      if (parts.includes('kick')) ev.push({ x, name: q ? 'kick' : 'kick_one' });
      if (parts.includes('tick')) ev.push({ x, name: m === 'countin' && Math.abs(x - t0) < 1 ? 'tick_one' : 'tick' });
      if (q === 0 && parts.includes('pad')) for (const mm of [1, third, fifth]) ev.push({ x, name: 'pad', f: lm.root3 * mm, dur: L.barMs / 1000 });
      if ((q === 0 || q === 2) && parts.includes('bass')) ev.push({ x, name: 'bass', f: lm.root3 / 2, dur: (2 * beat) / 1000 });
      if (shakerOn && parts.includes('shaker')) ev.push({ x, name: 'shaker' });
    }
    // 베이스 숙임: 판정 별 시각 (parts.bass_duck_on)
    for (const s of playByBar.get(b) || []) { const { m, parts } = partsAt(s.t); if (parts.includes('bass') && duckOn.includes(m)) ev.push({ x: s.t, duck: true }); }
    if (b >= 0 && b < L.outroBar && stageOf(b) >= P.melody_from_stage) {
      for (const n of mel.get(b) || []) {
        const x = x0 + n.slot * eighth;
        if (!partsAt(x).parts.includes('melody')) continue;
        const ev1 = { x, name: 'mel_' + n.inst, f: scaleF(n.d), dur: (n.len * eighth) / 1000 };
        if (n.harmony) ev1.gainDb = harmDb;
        ev.push(ev1);
      }
    }
    if (b === L.outroBar && !outroNote && partsAt(x0).m === 'outro') {
      outroNote = true;
      const o = rule.outro;
      ev.push({ x: x0 + o.slot * eighth, name: 'mel_' + lm.melody[0], f: scaleF(o.d), dur: (o.len * eighth) / 1000 });
    }
  }
  return ev.filter((e) => e.x >= t0 - 0.5).sort((a, b) => a.x - b.x);
}
