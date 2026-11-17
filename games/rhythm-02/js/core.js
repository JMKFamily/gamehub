// 시도(구간) 하나의 판정 진행(DOM·오디오 없음, node 에서도 import). 판정은 judge.js(= tools/sim/judge.mjs) judgeAttempt 를 그대로 부름.
// 구간 = 시도 처음(0) · 연습 체크포인트 · 이어 하기 되감기(resumePoint) 중 하나에서 시작. opt {startIndex, carried} 는 judgeAttempt 에 그대로 넘김.
import { judgeAttempt, hitsFromResult, gradeRating, restartPhases, comboEvents, bgStages } from './judge.js';

// 연습 체크포인트: 받침 쉼(구절 시작)마다. 그 구절 첫 접촉부터 판정(콤보는 0부터 = carried 없음, balance combo.practice)
export function checkpoints(L) {
  return L.level.phrases.filter((p) => p.checkpoint !== false).map((p) => ({ phrase: p.index, t: p.start_beat * L.beatMs, firstContact: p.contact_range ? p.contact_range[0] : Math.max(0, L.contacts.findIndex((c) => c.t >= p.start_beat * L.beatMs)) }));
}
// 실패한 접촉 i 를 다시 할 체크포인트(그 접촉 앞의 마지막 받침 쉼)
export function checkpointFor(L, i) {
  const cps = checkpoints(L);
  let best = cps[0];
  for (const c of cps) if (c.firstContact <= i) best = c;
  return best;
}

export class Attempt {
  // fromMs = 이 구간의 레벨 시작 시각, startIndex = 첫 판정 접촉, carried = 앞 판정(grades 배열, 이어 하기만)
  constructor(L, { fromMs = 0, startIndex = 0, carried = null, practice = false, resumed = false } = {}) {
    this.L = L; this.fromMs = fromMs; this.practice = practice; this.resumed = resumed;
    this.opt = { startIndex, carried: carried ? carried.map((g) => ({ ...g })) : null };
    this.taps = []; // 이 구간에서 실제로 친 탭(판정 시계 레벨 ms)
    this.status = 'run';
    this.res = judgeAttempt(L, [], this.opt);
    this.fail = null;
  }
  get grades() { return this.res.grades; }
  get progress() { return this.res.progress ?? (this.res.clear ? 1 : 0); }
  // 진행 중일 때 다음 늦음 실패 예정 시각(통과 창 끝)
  get pendingFailMs() { return this.status === 'run' && !this.res.clear ? this.res.failTimeMs : null; }

  // 탭 하나(판정 시계 레벨 ms). 반환 {kind: 'grade'|'stray'|'fail'|'ignored', ...}
  tap(tau) {
    if (this.status !== 'run') return { kind: 'ignored' };
    const before = this.res.grades.filter((g) => g.e != null).length;
    this.taps.push(tau);
    const r = judgeAttempt(this.L, this.taps, this.opt);
    if (!r.clear && r.reason === 'late' && r.failTimeMs <= tau) { this.res = r; this._fail(); return { kind: 'fail', reason: 'late', i: r.failIndex }; }
    this.res = r;
    if (!r.clear && (r.reason === 'early' || r.reason === 'bump_roof')) { this._fail(); return { kind: 'fail', reason: r.reason, i: r.failIndex }; }
    const hit = r.grades.filter((g) => g.e != null);
    if (hit.length > before) {
      const g = hit[hit.length - 1];
      if (r.clear && this._allJudged(tau)) this.status = 'clear';
      return { kind: 'grade', grade: g.grade, i: g.i, e: g.e, clear: this.status === 'clear' };
    }
    return { kind: 'stray' };
  }
  // 마지막 접촉까지 판정이 끝났는지(마지막이 지붕이면 그 통과 창 끝이 지나야 함)
  _allJudged(J) { const cs = this.L.contacts, last = cs[cs.length - 1]; return !last || last.kind !== 'nogo' || J > last.passEnd; }
  // 고정 스텝 틱: 판정 시계 J(레벨 ms)가 통과 창 끝을 지나면 늦음 실패
  tick(J) {
    if (this.status !== 'run') return null;
    if (this.res.clear) { if (this._allJudged(J)) { this.status = 'clear'; return { kind: 'clear' }; } return null; }
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
  combo() { return comboEvents(this.L, this.res); }
  // 시뮬레이터 대조용 기록(node judgeAttempt(L, taps, {startIndex, carried}) 로 다시 판정)
  log() {
    const r = this.res;
    return { fromMs: this.fromMs, startIndex: this.opt.startIndex, carried: this.opt.carried ? this.opt.carried.map((g) => ({ ...g })) : null, practice: this.practice, resumed: this.resumed, taps: this.taps.slice(),
      clear: !!r.clear, failIndex: r.clear ? null : r.failIndex, reason: r.clear ? null : r.reason, failTimeMs: r.clear ? null : r.failTimeMs,
      grades: r.grades.map((g) => g.grade), es: r.grades.map((g) => g.e), progress: this.progress, combo: r.grades.length };
  }
}

// 지금 보이는 콤보 수: 판정 사건 중 이미 일어난 것(hit = 친 순간 J, hold = 지붕이 북을 떠나는 순간 lt). grades 에서 파생, 별도 상태 없음.
export function comboNow(ev, J, lt) {
  let n = 0;
  for (const e of ev.events) if (e.kind === 'hit' ? e.t <= J + 1e-9 : e.t <= lt + 1e-9) n = e.combo;
  return n;
}

// 바탕 단계: judge bgStages(L)(n번째 받침 쉼 = 1 + round(2(n−1)/(P−1))). 그 쉼 첫 마디 동안 앞 단계 → 새 단계 섞기, 구간 시작 자리는 그 단계 색으로 바로
export function stageAt(L, t, fromMs = 0) {
  const ph = L.level.phrases, st = bgStages(L);
  let k = -1;
  for (let i = 0; i < ph.length; i++) if (t >= ph[i].start_beat * L.beatMs) k = i;
  if (k < 0) return { a: st[0] ?? 1, b: st[0] ?? 1, u: 1 };
  const t0 = ph[k].start_beat * L.beatMs;
  if (k === 0 || Math.abs(t0 - fromMs) < 1) return { a: st[k], b: st[k], u: 1 };
  return { a: st[k - 1], b: st[k], u: Math.min(1, (t - t0) / L.barMs) };
}
