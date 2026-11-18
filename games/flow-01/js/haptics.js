// 진동 어댑터 (sound.json haptics): navigator.vibrate 가 없거나 실패해도 조용히 무시. 다른 피드백은 그대로.
// 포인터 이벤트 처리 안에서만 부르고, 80 ms 안에 또 오면 건너뜀. 2단계(Capacitor)에서는 이 어댑터만 바꿈.
export class Haptics {
  constructor(H, test) { this.H = H; this.enabled = true; this.test = test; this.last = -1e9; this.log = []; }
  _buzz(ms, nowMs) {
    if (!this.enabled) return;
    if (nowMs - this.last < 80) return;
    this.last = nowMs;
    this.log.push(ms);
    if (this.test) return;
    try { if (typeof navigator.vibrate === 'function') navigator.vibrate(ms); } catch {}
  }
  connect(nowMs) { this._buzz(this.H.connect.web_ms, nowMs); }
  // r2: 판 완료는 web_pattern([18, 40, 26]) 이 있으면 그것, 결과 별은 star.web_ms
  complete(nowMs) { this._buzz(this.H.complete.web_pattern || this.H.complete.web_ms, nowMs); }
  star(nowMs) { if (this.H.star) this._buzz(this.H.star.web_ms, nowMs); }
}
