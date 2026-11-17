// WebAudio 합성(data/sound.json _synth 규칙) + 화면 시계에 맞춘 예약.
// 판정은 화면 시계라 오디오는 결과일 뿐: 곡 음은 "그 레벨 시각이 화면에 그려지는 performance 시각"에 들리도록
// 오디오 시각 = (performance → AudioContext 시각 변환) − 자동 지연(outputLatency+baseLatency) − 보호자 오프셋 으로 한 번만 앞당김.
// getOutputTimestamp 는 쓰지 않음(이미 출력 시각이라 지연을 또 빼면 이중 보정, insights 구현·성능).
import { lcg32Noise } from './music.js';
export { noteOf } from './music.js'; // 음 높이 원본 = tools/art/music.mjs noteOf (sound.json _synth, N3)
const dbLin = (db) => Math.pow(10, db / 20);

export class AudioOut {
  constructor(S) {
    this.S = S; this.ctx = null; this.off = null; this.enabled = true;
    this.queue = []; this.qi = 0; this.live = [];
    this.lookahead = 0.3; this.offsetMs = 0;
  }
  get running() { return !!this.ctx && this.ctx.state === 'running'; }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { return false; }
      this._graph();
      this._timer = setInterval(() => this.pump(), 25);
      // 미리 합성(30-art 12절): 모든 소리를 소리 0 버스로 한 번씩. round-1 N1: 탭 처리 안에서 하면 첫 탭 프레임이 길어져 다음 프레임 뒤로 나눠서 함
      const names = Object.keys(this.S.sounds);
      const warm = this.ctx.createGain(); warm.gain.value = 0; warm.connect(this.ctx.destination);
      const step = () => { for (let k = 0; k < 3 && names.length; k++) this.play(names.shift(), null, 220, warm); if (names.length) setTimeout(step, 30); };
      setTimeout(step, 60);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }
  _graph() {
    const c = this.ctx, S = this.S;
    this.master = c.createGain(); this.master.gain.value = dbLin(S.master.db);
    this.mute = c.createGain(); this.mute.gain.value = this.enabled ? 1 : 0;
    this.master.connect(this.mute).connect(c.destination);
    this.bus = {};
    for (const [k, b] of Object.entries(S.buses)) { const g = c.createGain(); g.gain.value = dbLin(b.db); g.connect(this.master); this.bus[k] = g; }
    this.musicFade = c.createGain(); this.musicFade.connect(this.bus.music);
    // 흰 잡음 버퍼(시드 고정, noise_seed)
    const n = Math.floor(c.sampleRate * S.noise_buffer_s);
    // 잡음 버퍼는 첫 탭 프레임 밖에서 만듦(N1). 그 전에 잡음 소리가 필요하면 그 자리에서 만듦
    this._mkNoise = () => { if (!this.noise) { this.noise = c.createBuffer(1, n, c.sampleRate); this.noise.getChannelData(0).set(lcg32Noise(S.noise_seed, n)); } return this.noise; }; // sound.json noise_gen (music.mjs 와 같은 식)
    this.noise = null;
    setTimeout(this._mkNoise, 30);
    this.posts = {};
  }
  setEnabled(on) {
    this.enabled = on;
    if (this.ctx) { const t = this.ctx.currentTime; this.mute.gain.cancelScheduledValues(t); this.mute.gain.setValueAtTime(this.mute.gain.value, t); this.mute.gain.linearRampToValueAtTime(on ? 1 : 0, t + 0.03); }
  }
  // performance 시계 ↔ 오디오 시계 차이. currentTime 은 오디오 콜백마다 한 칸(Windows Chrome·Edge 약 10 ms)씩 계단으로 올라
  // dd = currentTime − now 는 톱니 모양. round-1 은 톱니 꼭대기(최댓값)를 따라가 오프셋이 반 칸(+4~8 ms)만큼 늦게 들렸음(M1 후반, QA raw +4.3~8.2 ms).
  // round-2: 꼭대기(hi)와 바닥(lo)을 천천히 따라가 가운데를 씀 — 계단 시계의 평균 위치(DEV_NOTES R2-M1).
  sample() {
    if (!this.running) return;
    const dd = this.ctx.currentTime - performance.now() / 1000;
    if (this.hi == null || Math.abs(dd - this.hi) > 0.05) { this.hi = dd; this.lo = dd; }
    else { this.hi = Math.max(dd, this.hi - 0.00002); this.lo = Math.min(dd, this.lo + 0.00002); if (this.lo > this.hi) this.lo = this.hi; }
    this.off = (this.hi + this.lo) / 2;
    this.step = this.hi - this.lo;
  }
  autoLatencyMs() { return this.ctx ? ((this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0)) * 1000 : 0; }
  // perfMs 에 귀에 들리게 하려면 시작할 오디오 시각(s)
  audioAt(perfMs, withOffset = true) { return perfMs / 1000 + (this.off ?? 0) - (this.autoLatencyMs() + (withOffset ? this.offsetMs : 0)) / 1000; }

  // 소리 하나. at = 오디오 시각(s), 없으면 지금. note = 연주 음 높이(Hz). 반환: 만든 소스 목록
  play(name, at = null, note = null, bus = null) {
    if (!this.ctx) return [];
    const c = this.ctx, def = this.S.sounds[name];
    if (!def) return [];
    const t0 = Math.max(at ?? c.currentTime, c.currentTime);
    let dest = bus || (def.bus === 'music' ? this.musicFade : this.bus[def.bus]);
    if (def.post) {
      const key = name + '|' + def.bus;
      const mk = () => { const f = c.createBiquadFilter(); f.type = def.post.type; f.frequency.value = def.post.f; f.Q.value = def.post.Q; f.connect(dest); return f; };
      if (bus) dest = mk(); // 미리 합성용 버스는 공용 필터에 붙이지 않음
      else { if (!this.posts[key]) this.posts[key] = mk(); dest = this.posts[key]; }
    }
    const out = [];
    for (const ly of def.layers) {
      const t = t0 + (ly.delayMs || 0) / 1000;
      const peak = dbLin(def.db) * (ly.mul ?? 1);
      let src;
      if (ly.wave === 'noise') { src = c.createBufferSource(); src.buffer = this._mkNoise(); src.loop = true; }
      else {
        src = c.createOscillator(); src.type = ly.wave;
        const f0 = ly.note ? (note || 440) * (ly.fMul ?? 1) : ly.f;
        src.frequency.setValueAtTime(f0, t);
        const fTo = ly.note ? (ly.fToMul ? f0 * ly.fToMul : null) : ly.fTo;
        if (fTo) src.frequency.exponentialRampToValueAtTime(fTo, t + (ly.glideMs || 0) / 1000);
      }
      let chain = src;
      if (ly.filter) { const bf = c.createBiquadFilter(); bf.type = ly.filter.type; bf.frequency.value = ly.filter.f; bf.Q.value = ly.filter.Q; chain.connect(bf); chain = bf; }
      const g = c.createGain();
      chain.connect(g).connect(dest);
      const a = ly.env.a / 1000, dc = ly.env.decay / 1000;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(peak * 0.001, t + a + dc);
      src.start(t); src.stop(t + a + dc + 0.02);
      out.push({ src, t });
    }
    return out;
  }
  // 예약 목록: [{perf, name, note, music}] (perf = 들려야 하는 performance ms)
  // 곡 목록 바꿈. 곡 페이드는 첫 음 바로 앞에서 다시 1로(실패 페이드아웃 0.08 s 뒤)
  setQueue(list) {
    this.queue = list.slice().sort((a, b) => a.perf - b.perf); this.qi = 0;
    if (this.ctx) {
      const t = this.ctx.currentTime, g = this.musicFade.gain;
      this.sample();
      const first = this.queue.find((e) => e.music !== false);
      const at = first ? Math.max(t + 0.09, this.audioAt(first.perf) - 0.02) : t + 0.09;
      g.cancelScheduledValues(at - 0.005); g.setValueAtTime(1, at);
    }
    this.pump();
  }
  // 목록에 더함(클리어·등급 구름·신기록 소리)
  add(list) { const rest = this.queue.slice(this.qi).concat(list).sort((a, b) => a.perf - b.perf); this.queue = rest; this.qi = 0; this.pump(); }
  pump() {
    if (!this.running) return;
    this.sample();
    const now = this.ctx.currentTime;
    while (this.qi < this.queue.length) {
      const e = this.queue[this.qi], at = this.audioAt(e.perf, e.offset !== false);
      if (at > now + this.lookahead) break;
      this.qi++;
      if (at < now - 0.03) continue; // 이미 지남(멈춤 복귀 등)
      e.autoUsed = this.autoLatencyMs(); // 소리 맞추기: 들린 박 = 예약 perf − 예약 때 자동 지연 + 탭 순간 자동 지연(insights rhythm-01)
      for (const x of this.play(e.name, at, e.note)) this.live.push(x);
    }
    if (this.live.length > 300) this.live = this.live.filter((x) => x.t > now - 1);
  }
  // 실패·멈춤: 곡 0.08 s 페이드 + 앞으로 예약된 소리 정지
  stop(fadeS = 0.08) {
    this.queue = []; this.qi = 0;
    if (!this.ctx) return;
    const t = this.ctx.currentTime, g = this.musicFade.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + fadeS);
    for (const x of this.live) if (x.t > t + 0.002) { try { x.src.stop(); } catch {} }
    this.live = this.live.filter((x) => x.t <= t + 0.002);
  }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }
}

