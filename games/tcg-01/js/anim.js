// 게임 시계 + 트윈(transform/opacity만) + 연출 타임라인. 모든 연출 시계는 게임 시간(배속 반영)으로 돈다.
import { D } from './data.js';

export const G = { now: 0, rate: 1, fast: false, scale: 1, test: false, reduceMotion: false };

// 연출 시간: art.json tempo.actions[id] (빠르게 보기 = fast_ms, 테스트 배율 G.scale)
export function T(id, part) {
  const a = D.art.tempo.actions[id];
  if (!a) return 0;
  let ms;
  if (part) { const ph = (G.fast && a.phases_fast_ms) || a.phases_normal_ms || {}; ms = (ph[part] || 0) * (G.fast && !a.phases_fast_ms ? a.fast_ms / a.normal_ms : 1); }
  else ms = G.fast ? a.fast_ms : a.normal_ms;
  if (id === 'big_entry' && G.reduceMotion) ms = D.art.tempo.reduce_motion.big_entry_normal_ms * (G.fast ? 0.5 : 1);
  return ms * G.scale;
}
export const lockOf = (id) => ((D.art.tempo.actions[id] || {}).lock_ms || 0) * G.scale;
export const tierOf = (id) => (D.art.tempo.actions[id] || {}).tier || 0;

// ---------- 트윈 ----------
const tweens = [];
export function tf(el) { return el._tf || (el._tf = { x: 0, y: 0, s: 1, r: 0, o: 1 }); }
export function setTf(el, v) {
  const s = Object.assign(tf(el), v);
  el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) rotate(${s.r.toFixed(2)}deg) scale(${s.s.toFixed(3)})`;
  el.style.opacity = s.o;
}
const ease = { out: (k) => 1 - (1 - k) * (1 - k), inout: (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)), lin: (k) => k, back: (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };
export function tween(el, to, dur, opt = {}) {
  for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].el === el && !opt.keep) tweens.splice(i, 1);
  const from = { ...tf(el) };
  if (!(dur > 0)) { setTf(el, to); opt.done && opt.done(); return; }
  tweens.push({ el, from, to, t: 0, dur, e: ease[opt.ease || 'out'], done: opt.done, tag: opt.tag });
}
export function finishTweens(tag) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i];
    if (tag && w.tag !== tag) continue;
    tweens.splice(i, 1); setTf(w.el, w.to); w.done && w.done();
  }
}
function stepTweens(dt) {
  for (let i = 0; i < tweens.length; i++) {
    const w = tweens[i];
    w.t += dt;
    const k = Math.min(1, w.t / w.dur), e = w.e(k), v = {};
    for (const key in w.to) v[key] = w.from[key] + (w.to[key] - w.from[key]) * e;
    setTf(w.el, v);
    if (k >= 1) { tweens.splice(i--, 1); w.done && w.done(); }
  }
}

// ---------- 타임라인 ----------
// 하나의 행동 연출: items(at, fn)를 시간 순서로 실행. lock 동안 입력은 예약, 예약이 있으면 남은 연출 2배속.
export class Timeline {
  constructor(name, opt = {}) { this.name = name; this.items = []; this.t = 0; this.dur = 0; this.lock = opt.lock || 0; this.tier = opt.tier || 0; this.meta = opt.meta || {}; }
  at(ms, fn) { this.items.push({ at: Math.max(0, ms), fn }); if (ms > this.dur) this.dur = ms; return this; }
  end(ms) { if (ms > this.dur) this.dur = ms; return this; }
}

export const A = {
  cur: null, list: [], queue: [], onIdle: null, log: [], boost: 1,
  get busy() { return !!this.cur || this.list.length > 0; },
  get locked() { return !!this.cur && this.cur.t < this.cur.lock; },
  play(tl) {
    tl.items.sort((a, b) => a.at - b.at);
    tl._i = 0; tl.startG = G.now; tl.startR = performance.now();
    this.log.push(tl.rec = { kind: tl.name, tier: tl.tier, planned_ms: Math.round(tl.dur), lock_ms: Math.round(tl.lock), start_game_ms: Math.round(G.now), start_real_ms: Math.round(tl.startR), end_game_ms: null, end_real_ms: null, ...tl.meta });
    if (this.cur) this.list.push(tl); else this._start(tl);
  },
  _start(tl) { this.cur = tl; this._run(tl); },
  _run(tl) {
    while (tl._i < tl.items.length && tl.items[tl._i].at <= tl.t) tl.items[tl._i++].fn();
    if (tl.t >= tl.dur && tl._i >= tl.items.length) this._done(tl);
  },
  _done(tl) {
    tl.rec.end_game_ms = Math.round(G.now); tl.rec.end_real_ms = Math.round(performance.now());
    tl.rec.game_dur_ms = tl.rec.end_game_ms - tl.rec.start_game_ms;
    if (this.cur === tl) this.cur = null;
    finishTweens(tl);
    const nx = this.list.shift();
    if (nx) this._start(nx);
  },
  // 끝 상태로 바로(탭으로 건너뛰기, 다음 입력이 올 때). 정보(피해·사망)는 모두 화면에 남는다.
  finishAll() {
    let guard = 0;
    while (this.cur && guard++ < 50) { const tl = this.cur; tl.t = tl.dur; tl.rec.skipped = true; this._run(tl); if (this.cur === tl) this._done(tl); }
  },
  update(dt) {
    let left = dt;
    let guard = 0;
    while (this.cur && guard++ < 20) {
      const tl = this.cur;
      const rate = this.queue.length ? D.art.tempo.input.catch_up_speed_ratio : 1;
      const need = (tl.dur - tl.t) / rate;
      const use = Math.min(left, need);
      tl.t += use * rate; left -= use;
      this._run(tl);
      if (this.cur === tl) break;
      if (left <= 0) break;
    }
  },
};

// 게임 시계 예약(메뉴 연출용 setTimeout 대신, round-2 D16)
const timers = [];
export function after(ms, fn) { const tm = { at: G.now + Math.max(0, ms), fn }; timers.push(tm); return tm; }
export function clearAfter() { timers.length = 0; }
export function stepAll(dt) {
  if (G.paused) return 0;
  const d = dt * G.rate * A.boost;
  G.now += dt;
  for (let i = 0; i < timers.length; i++) if (timers[i].at <= G.now) { const tm = timers.splice(i--, 1)[0]; tm.fn(); }
  A.update(d);
  stepTweens(d);
  return d;
}
// 하위 구간 기록(tempoLog, round-2 D11): 타임라인 안 at 시각에 시작, dur 뒤 끝
export function phase(tl, name, at, dur, extra) {
  const rec = { kind: name, phase_of: tl.name, tier: tl.tier, planned_ms: Math.round(dur), start_game_ms: null, end_game_ms: null, ...(extra || {}) };
  tl.at(at, () => { rec.start_game_ms = Math.round(G.now); rec.start_real_ms = Math.round(performance.now()); A.log.push(rec); });
  tl.at(at + dur, () => { rec.end_game_ms = Math.round(G.now); rec.end_real_ms = Math.round(performance.now()); rec.game_dur_ms = rec.end_game_ms - (rec.start_game_ms ?? rec.end_game_ms); });
  tl.end(at + dur);
}
