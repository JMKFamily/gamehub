// 시도 하나의 판정 진행(DOM·오디오 없음, node 에서도 import). 판정은 judge.js(= tools/sim/judge.mjs) judgeAttempt 를 그대로 부름.
import { judgeAttempt, hitsFromResult, gradeRating, restartPhases } from './judge.js';

// 연습 체크포인트: 받침 쉼(구절 시작)마다. 앞 구절 접촉은 접촉 시각에 친 것으로 넣어 같은 judgeAttempt 로 이어 판정.
export function checkpoints(L) {
  return L.level.phrases.filter((p) => p.checkpoint !== false).map((p) => {
    const t = p.start_beat * L.beatMs;
    const first = L.contacts.findIndex((c) => c.t >= t);
    return { phrase: p.index, t, firstContact: first < 0 ? L.contacts.length : first };
  });
}

// 실패한 접촉 i 를 다시 할 체크포인트(그 접촉 앞의 마지막 받침 쉼)
export function checkpointFor(L, i) {
  const cps = checkpoints(L);
  let best = cps[0];
  for (const c of cps) if (c.firstContact <= i) best = c;
  return best;
}

export class Attempt {
  // fromMs = 이 시도의 레벨 시작 시각(일반 0, 연습 체크포인트), carried = 앞 구절 접촉 수(접촉 시각에 친 것으로 넣음)
  constructor(L, { fromMs = 0, carried = 0, practice = false } = {}) {
    this.L = L; this.fromMs = fromMs; this.practice = practice;
    this.carried = L.contacts.slice(0, carried).map((c) => c.t);
    this.taps = []; // 이 시도에서 실제로 친 탭(판정 시계 레벨 ms)
    this.status = 'run';
    this.res = judgeAttempt(L, this.carried);
    this.fail = null;
  }
  get allTaps() { return this.carried.concat(this.taps); }
  get grades() { return this.res.grades; }
  get progress() { return this.res.progress ?? (this.res.clear ? 1 : 0); }
  // 진행 중일 때 다음 실패 예정 시각(늦음: 통과 창 끝)
  get pendingFailMs() { return this.status === 'run' && !this.res.clear ? this.res.failTimeMs : null; }

  // 탭 하나(판정 시계 레벨 ms). 반환 {kind: 'grade'|'stray'|'fail'|'ignored', grade, i}
  tap(tau) {
    if (this.status !== 'run') return { kind: 'ignored' };
    const before = this.res.grades.length;
    this.taps.push(tau);
    const r = judgeAttempt(this.L, this.allTaps);
    // 이미 늦음 실패 시각이 지난 탭이면 그 실패로 확정(늦음 판정은 tick 이 먼저 했어야 함)
    if (!r.clear && r.reason === 'late' && r.failTimeMs <= tau) { this.res = r; this._fail(); return { kind: 'fail', reason: 'late' }; }
    this.res = r;
    if (!r.clear && r.reason === 'early') { this._fail(); return { kind: 'fail', reason: 'early', i: r.failIndex }; }
    if (r.grades.length > before) {
      const g = r.grades[r.grades.length - 1];
      if (r.clear) this.status = 'clear';
      return { kind: 'grade', grade: g.grade, i: g.i, e: g.e, clear: !!r.clear };
    }
    return { kind: 'stray' };
  }
  // 고정 스텝 틱: 판정 시계 J(레벨 ms)가 통과 창 끝을 지나면 늦음 실패
  tick(J) {
    if (this.status !== 'run') return null;
    const f = this.pendingFailMs;
    if (f != null && J >= f) { this._fail(); return { kind: 'fail', reason: 'late', i: this.res.failIndex }; }
    return null;
  }
  _fail() {
    this.status = 'fail';
    this.fail = { index: this.res.failIndex, timeMs: this.res.failTimeMs, reason: this.res.reason, phases: restartPhases(this.L, this.res, this.L.bal) };
  }
  hits() { return hitsFromResult(this.L, this.res); }
  rating(rule) { return this.res.clear ? gradeRating(this.L, this.res, rule) : 0; }
  // 시뮬레이터 대조용 기록
  log() { return { fromMs: this.fromMs, carried: this.carried.length, practice: this.practice, taps: this.taps.slice(), clear: !!this.res.clear, failIndex: this.res.clear ? null : this.res.failIndex, reason: this.res.clear ? null : this.res.reason, failTimeMs: this.res.clear ? null : this.res.failTimeMs, grades: this.res.grades.map((g) => g.grade), progress: this.progress }; }
}

// 바탕 단계: n번째 받침 쉼(1부터) → min(n, 3), 그 쉼 첫 마디 동안 앞 단계 → 새 단계 섞기 (layout bg_stage, 1-2 D6)
export function stageAt(L, t, fromMs = 0) {
  const ph = L.level.phrases;
  let k = -1;
  for (let i = 0; i < ph.length; i++) if (t >= ph[i].start_beat * L.beatMs) k = i;
  if (k < 0) return { a: 1, b: 1, u: 1 };
  const st = (i) => Math.min(i + 1, 3);
  const t0 = ph[k].start_beat * L.beatMs;
  if (k === 0 || Math.abs(t0 - fromMs) < 1) return { a: st(k), b: st(k), u: 1 }; // 시작·체크포인트는 그 단계 색으로 바로
  return { a: st(k - 1), b: st(k), u: Math.min(1, (t - t0) / L.barMs) };
}
