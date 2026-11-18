// Web Audio 합성 (data/sound.json 의 _synth 규칙 그대로, 외부 음원 없음)
// 소리 하나 = layers 합: Oscillator(sine|triangle) → (lowpass) → Gain(엔벨로프) → bus → master → destination
const dbToGain = (db) => Math.pow(10, db / 20);

export class Audio {
  constructor(S) {
    this.S = S; this.ctx = null; this.enabled = true; this.lastTick = -1e9; this.ambOn = false; this.ambTimer = 0; this.ambNext = 0; this.ambIdx = 0;
    this.log = []; // 테스트·QA 용 재생 기록 {name, t}
  }
  // 첫 사용자 동작 안에서 부름(자동 재생 정책)
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && this.enabled && !document.hidden) this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { return; }
    const S = this.S, c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = dbToGain(S.master.db); this.master.connect(c.destination);
    this.bus = {};
    for (const [k, b] of Object.entries(S.buses)) { const g = c.createGain(); g.gain.value = dbToGain(b.db); g.connect(this.master); this.bus[k] = g; }
    if (!this.enabled) this.ctx.suspend().catch(() => {}); else if (this.ctx.state !== 'running' && !document.hidden) this.ctx.resume().catch(() => {});
  }
  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    if (on && !document.hidden) this.ctx.resume().catch(() => {}); else this.ctx.suspend().catch(() => {});
  }
  pause() { if (this.ctx) this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.enabled && !document.hidden) this.ctx.resume().catch(() => {}); }
  get live() { return !!(this.ctx && this.enabled && this.ctx.state !== 'closed'); }

  _layer(L, f0, t0, peakDb, busNode) {
    const c = this.ctx;
    const start = t0 + (L.delayMs || 0) / 1000;
    const o = c.createOscillator();
    o.type = L.wave; // sine | triangle 만 (sound.json S6)
    const f = L.note ? f0 * (L.fMul || 1) : L.f;
    o.frequency.setValueAtTime(f, start);
    const fTo = L.fTo ?? (L.fToMul ? f * L.fToMul : null);
    if (fTo) o.frequency.exponentialRampToValueAtTime(fTo, start + (L.glideMs || 0) / 1000);
    const g = c.createGain();
    const peak = dbToGain(peakDb) * (L.mul ?? 1);
    const a = L.env.a / 1000, d = L.env.decay / 1000;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + a);
    g.gain.exponentialRampToValueAtTime(peak * 0.001, start + a + d);
    let node = o;
    if (L.filter) { const bq = c.createBiquadFilter(); bq.type = L.filter.type; bq.frequency.value = L.filter.f; bq.Q.value = L.filter.Q; o.connect(bq); node = bq; }
    node.connect(g); g.connect(busNode);
    o.start(start); o.stop(start + a + d + 0.05);
  }
  // name: sound.json sounds 키. opt.pitch: note 층 기준 음 높이(ladder·tick 은 부르는 쪽이 고름)
  play(name, opt = {}) {
    this.log.push({ name, pitch: opt.pitch ?? null });
    if (this.log.length > 400) this.log.splice(0, 200);
    if (!this.live || this.ctx.state !== 'running') return;
    const s = this.S.sounds[name]; if (!s) return;
    const t0 = this.ctx.currentTime + 0.005 + (opt.delayMs || 0) / 1000;
    const bus = this.bus[s.bus] || this.master;
    if (s.pitch === 'chord') {
      const k = opt.k || 1;
      for (let i = 0; i < k; i++) for (const L of s.layers) this._layer(L, this.S.ladder_hz[i], t0 + (i * s.arp_ms) / 1000, s.db, bus);
      return;
    }
    const f0 = opt.pitch || 440;
    for (const L of s.layers) this._layer(L, f0, t0, s.db + (opt.db || 0), bus);
  }
  connect(grade, connectedCount) {
    const key = ['connect_g1', 'connect_g2', 'connect_g3'][grade - 1];
    const lad = this.S.ladder_hz;
    this.play(key, { pitch: lad[Math.max(0, Math.min(lad.length - 1, connectedCount - 1))] });
  }
  // 칸 틱: 60 ms 안에 또 오면 건너뜀(sound.json tick.when). nowMs = 게임 시계
  tick(cellsThisDrag, nowMs) {
    if (nowMs - this.lastTick < 60) return;
    this.lastTick = nowMs;
    const th = this.S.tick_hz;
    this.play('tick', { pitch: th[Math.min(cellsThisDrag, th.length) - 1] });
  }
  // 배경 화음: chord_s 마다 다음 화음, 세 음 동시 시작
  ambient(on) {
    this.ambOn = on && !!this.S.ambient.default_on;
    if (!this.ambOn) { clearInterval(this.ambTimer); this.ambTimer = 0; return; }
    if (this.ambTimer) return;
    const A = this.S.ambient;
    const tickA = () => {
      if (!this.live || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      if (this.ambNext < now) this.ambNext = now + 0.05;
      while (this.ambNext < now + 0.5) {
        const ch = A.chords_hz[this.ambIdx % A.chords_hz.length];
        for (const f of ch) this._layer({ wave: A.layer.wave, f, env: A.layer.env }, f, this.ambNext, A.db, this.bus[A.bus]);
        this.ambIdx++; this.ambNext += A.chord_s;
      }
    };
    tickA();
    this.ambTimer = setInterval(tickA, 250);
  }
}
