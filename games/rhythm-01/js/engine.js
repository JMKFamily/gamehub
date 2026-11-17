// 게임 진행 엔진 (DOM·오디오 없음). 시간 단위 ms.
// V = 게임 시계(오디오 시계 - 지연 보정, 테스트 모드는 가상 시계). 레벨 시간 = V - songStartV.
// 판정 규칙은 judge.js(tools/sim/judge.mjs 복사)의 judgeAttempt 와 같게 한 탭씩 처리한다.
import { compileLevel, previewSchedule, gradeRating, slotTimeMs } from './judge.js';

export function prepareLevel(level, bal) {
  const L = compileLevel(level, bal);
  L.preview = previewSchedule(L, bal);
  // 보여 주기 마디 묶음(북채): [시작 마디, 끝 마디]
  L.showRuns = [];
  level.bars.forEach((b, i) => {
    if (b.mode !== 'show') return;
    const last = L.showRuns[L.showRuns.length - 1];
    if (last && last[1] === i - 1) last[1] = i; else L.showRuns.push([i, i]);
  });
  L.malletWins = L.showRuns.map(([a, b]) => ({
    from: slotTimeMs(L, a, 0) - bal.teacher.mallet_appear_beats_before_show_bar * L.beatMs,
    to: slotTimeMs(L, b + 1, 0),
  }));
  L.checkpoints = level.sections.filter((s) => s.checkpoint).map((s) => {
    const t = slotTimeMs(L, s.start_bar, 0);
    const first = L.stars.findIndex((st) => st.t >= t);
    return { bar: s.start_bar, t, firstStar: first < 0 ? L.stars.length : first };
  });
  L.lastPlayBar = level.bars.reduce((m, b, i) => (b.mode === 'play' ? i : m), -1);
  L.preview.forEach((p) => { p.si = p.kind === 'play' ? L.stars.findIndex((s) => Math.abs(s.t - p.t) < 0.5) : -1; });
  L.cue = (level.cues || []).map((c) => {
    const t = slotTimeMs(L, c.bar, c.slot);
    return { ...c, t, star: L.stars.findIndex((s) => Math.abs(s.t - t) < 0.5) };
  })[0] || null;
  return L;
}

// 레벨 시간 → 마디 정보
export function barAt(L, x) {
  const k = Math.floor(x / L.barMs);
  const b = k - L.countInBars;
  return { k, b, bar: b >= 0 ? L.level.bars[b] : null };
}

export function stageAt(L, b) {
  let st = 1;
  for (const s of L.level.sections) if (s.start_bar <= b && s.stage) st = s.stage;
  return st;
}

export class Run {
  constructor(L, bal, { practice = false, startV = 0, leadMs = 0 } = {}) {
    this.L = L; this.bal = bal; this.practice = practice;
    this.attempts = 0;
    this.cp = null; // 연습 체크포인트
    this.best = 0; // 이번 플레이 중 최고(일반 모드)
    this.cueDone = false;
    this.drift = { samples: [], windows: 0, triggered: false };
    this.events = []; // 렌더·오디오가 읽는 이벤트 (호출자가 비움)
    this.log = []; // 지난 시도 결과
    this._begin(startV + leadMs, true);
  }

  get n() { return this.L.stars.length; }
  get t0() { return this.cp ? this.cp.t : 0; }
  lt(V) { return V - this.songStartV; }
  get progress() { return this.n ? this.i / this.n : 1; }

  _begin(atV, count) {
    const t0 = this.t0;
    this.songStartV = atV - t0;
    this.i = this.cp ? this.cp.firstStar : 0;
    this.i0 = this.i;
    this.grades = [];
    this.stray = 0;
    this.taps = [];
    this.judged = []; // {i, e, grade, V}
    this.phase = 'run';
    this.fail = null;
    this.clearV = null;
    this.endV = null;
    if (count) this.attempts++;
    this.events.push({ type: 'attempt', songStartV: this.songStartV, t0, startV: atV });
  }

  // 탭 하나 (V = 게임 시계). 반환: 반응 종류
  tap(V) {
    const x = this.lt(V);
    if (this.phase === 'fail' && this.fail) this.taps.push(x);
    if (this.phase !== 'run' || x < this.t0) return this._stray(V, x);
    this.taps.push(x);
    const st = this.L.stars[this.i];
    if (!st) return this._stray(V, x);
    if (x > st.passEnd) { this._fail(st.passEnd, 'miss'); return { kind: 'late' }; }
    if (x >= st.passStart) {
      const e = x - st.t;
      const a = Math.abs(e);
      const j = this.L.judge;
      const grade = a <= j.perfect_ms ? 'perfect' : a <= j.good_ms ? 'good' : 'pass';
      const rec = { i: this.i, e, grade, V, slot: st.slot };
      this.grades.push({ i: this.i, e, grade });
      this.judged.push(rec);
      this._driftSample(e);
      if (this.L.cue && this.i === this.L.cue.star) this.cueDone = true;
      this.i++;
      this.events.push({ type: 'judge', ...rec });
      if (this.i >= this.n) this.phase = 'clearing';
      return { kind: grade, slot: st.slot, star: rec.i };
    }
    if (x >= st.zoneStart) { this._fail(x, 'early'); return { kind: 'early' }; }
    return this._stray(V, x);
  }

  _stray(V, x) {
    this.stray++;
    this.events.push({ type: 'stray', V });
    return { kind: 'stray' };
  }

  _fail(x, reason) {
    const V = this.songStartV + x;
    const st = this.L.stars[this.i];
    this.fail = { index: this.i, reason, x, V, star: st };
    this.phase = 'fail';
    const prog = this.progress;
    const newBest = !this.practice && prog > this.best;
    this.log.push({ clear: false, progress: prog, failIndex: this.i, reason, grades: this.grades, stray: this.stray, practice: this.practice });
    const prevBest = this.best;
    if (newBest) this.best = prog;
    this.restartV = V + this.bal.restart.restart_delay_s * 1000;
    this.events.push({ type: 'fail', V, reason, index: this.i, newBest, prevBest, progress: prog, restartV: this.restartV });
  }

  // 시계 진행. graceMs = 실시간 입력 여유(늦은 놓침 판정만 늦춤, 실패 시각은 그대로)
  update(V, graceMs = 0) {
    const x = this.lt(V);
    if (this.phase === 'run') {
      if (this.practice) {
        for (const c of this.L.checkpoints) if (c.t <= x && (!this.cp || c.t > this.cp.t) && c.firstStar >= this.i) this.cp = c;
      }
      const st = this.L.stars[this.i];
      if (st && x > st.passEnd + graceMs) this._fail(st.passEnd, 'miss');
    }
    if (this.phase === 'fail' && V >= this.restartV) {
      // 놓친 별 주변 탭으로 밀림 표본 (±300 ms)
      const f = this.fail;
      if (f && f.star) {
        const w = this.bal.audio_latency.drift_check.sample_window_ms;
        let best = null;
        for (const t of this.taps) { const d = t - f.star.t; if (Math.abs(d) <= w && (best === null || Math.abs(d) < Math.abs(best))) best = d; }
        if (best !== null) this._driftSample(best);
      }
      this._begin(this.restartV, true);
    }
    if (this.phase === 'clearing' && x >= this.L.clearTimeMs) {
      this.phase = 'cleared';
      this.clearV = this.songStartV + this.L.clearTimeMs;
      const res = { clear: true, grades: this.grades, stray: this.stray, progress: 1 };
      this.grade = this.practice ? 0 : gradeRating(this.L, res, this.bal.grade_rule);
      if (!this.practice) this.best = 1;
      this.log.push({ ...res, grade: this.grade, practice: this.practice });
      this.events.push({ type: 'clear', V: this.clearV, grade: this.grade });
    }
    if (this.phase === 'cleared' && x >= this.L.durationMs) {
      this.phase = 'done';
      this.endV = this.songStartV + this.L.durationMs;
      this.events.push({ type: 'end', V: this.endV });
    }
  }

  // 일시정지 복귀 등: 시도 수를 늘리지 않고 이번 시도 시작점부터 다시
  restartNow(V, leadMs, count = false) {
    this.events.push({ type: 'abort', V });
    this._begin(V + leadMs, count);
  }

  _driftSample(e) {
    const dc = this.bal.audio_latency.drift_check;
    const d = this.drift;
    d.samples.push(e);
    if (d.samples.length % dc.window_taps) return;
    const w = d.samples.slice(-dc.window_taps).sort((a, b) => a - b);
    const med = (w[(w.length - 1) >> 1] + w[w.length >> 1]) / 2;
    d.windows = Math.abs(med) >= dc.trigger_abs_median_ms ? d.windows + 1 : 0;
    if (d.windows >= dc.consecutive_windows && this.attempts >= dc.min_attempts && !d.triggered) {
      d.triggered = true;
      this.events.push({ type: 'drift', median: med, attempt: this.attempts });
    }
  }

  // 화면용 상태
  barMode(x) {
    if (x >= this.t0 && x < this.t0 + this.L.barMs) return 'countin';
    const { b, bar } = barAt(this.L, x);
    if (b < 0) return 'countin';
    if (!bar) return 'end';
    if (bar.mode === 'rest' && b > this.L.lastPlayBar) return 'outro';
    return bar.mode;
  }
}

// 등급 계산 그대로 노출 (테스트용)
export { gradeRating, slotTimeMs };
