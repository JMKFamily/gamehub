// rhythm-01 판정 모듈 (20-balance.md 4~5장 규칙의 기준 구현)
//
// 빌드가 그대로 import 해서 쓸 수 있도록 DOM·오디오에 의존하지 않는 순수 함수만 둔다.
// 시간 단위는 모두 ms, 기준은 "레벨 시간 0 = 카운트인 마디의 첫 박"(오디오 시계 기준, 지연 보정 뒤 값).
//
//   compileLevel(level, bal) → 별 목록(시각·판정 구역), 보여 주기 별, 길이
//   judgeAttempt(L, taps)    → 한 시도 결과 (클리어/실패 위치/판정 목록)
//   starRating(L, result)    → 클리어 등급 1~3
//   slotTimeMs(L, bar, slot) → 마디·자리(8분 단위)의 시각

export function slotTimeMs(L, bar, slot) {
  return ((L.countInBars + bar) * L.beatsPerBar + slot / 2) * L.beatMs;
}

export function compileLevel(level, bal) {
  const beatMs = 60000 / level.bpm;
  const beatsPerBar = level.beats_per_bar;
  const judge = { ...bal.judge_defaults, ...(level.judge || {}) };
  const L = {
    level,
    judge,
    beatMs,
    eighthMs: beatMs / 2,
    barMs: beatMs * beatsPerBar,
    beatsPerBar,
    countInBars: level.count_in_bars,
    stars: [],
    shows: [],
  };
  level.bars.forEach((bar, b) => {
    if (bar.mode === 'rest') return;
    const pat = level.patterns[bar.pattern];
    if (!pat) throw new Error(`레벨 ${level.id} 마디 ${b}: 없는 무늬 ${bar.pattern}`);
    for (const slot of pat.slots) {
      const st = { t: slotTimeMs(L, b, slot), bar: b, slot, pattern: bar.pattern };
      (bar.mode === 'play' ? L.stars : L.shows).push(st);
    }
  });
  L.stars.sort((a, b) => a.t - b.t);
  L.stars.forEach((st, i) => {
    st.i = i;
    st.passStart = st.t - judge.pass_early_ms;
    st.passEnd = st.t + judge.pass_late_ms;
    // 놓침 구역: 통과 창 바로 앞 miss_zone_ms. 단 앞 별의 통과 창 끝보다 앞으로는 넓히지 않는다
    // (앞 별을 이미 친 뒤 한 번 더 친 탭이 다음 별을 깨지 않게).
    let zs = st.passStart - judge.miss_zone_ms;
    if (i > 0) zs = Math.max(zs, L.stars[i - 1].passEnd);
    st.zoneStart = Math.min(zs, st.passStart);
  });
  L.durationMs = (L.countInBars + level.bars.length) * L.barMs;
  return L;
}

// taps: 레벨 시간(ms) 배열. 정렬하지 않아도 됨.
// 규칙 (20-balance.md 5장)
//  - 아직 안 친 가장 이른 별 하나만 본다.
//  - 탭이 그 별의 통과 창 [t-early, t+late] 안 → 성공, 판정 단계 기록, 다음 별로.
//  - 탭이 놓침 구역 [zoneStart, t-early) 안 → 실패 "early" (별이 깨짐).
//  - 그보다 이른 탭 → 무시(헛탭 수만 셈).
//  - 통과 창 끝까지 탭이 없으면 → 실패 "miss" (창 끝 시각에 깨짐).
export function judgeAttempt(L, taps) {
  const ts = [...taps].sort((a, b) => a - b);
  const { stars } = L;
  const j = L.judge;
  const grades = [];
  let i = 0;
  let stray = 0;
  for (const tau of ts) {
    if (i >= stars.length) break;
    const st = stars[i];
    if (tau > st.passEnd) return fail(L, i, st.passEnd, 'miss', grades, stray);
    if (tau >= st.passStart) {
      const e = tau - st.t;
      const a = Math.abs(e);
      grades.push({ i, e, grade: a <= j.perfect_ms ? 'perfect' : a <= j.good_ms ? 'good' : 'pass' });
      i++;
    } else if (tau >= st.zoneStart) {
      return fail(L, i, tau, 'early', grades, stray);
    } else {
      stray++;
    }
  }
  if (i < stars.length) return fail(L, i, stars[i].passEnd, 'miss', grades, stray);
  return { clear: true, grades, stray, progress: 1 };
}

function fail(L, i, timeMs, reason, grades, stray) {
  return { clear: false, failIndex: i, failTimeMs: timeMs, reason, grades, stray, progress: Math.min(1, timeMs / L.durationMs) };
}

// 등급: 1 = 클리어, 2 = 좋아 이상 비율 ≥ two_good_ratio, 3 = 딱 비율 ≥ three_perfect_ratio 이고 2 조건도 만족
export function starRating(L, result, rule) {
  if (!result.clear) return 0;
  const n = result.grades.length;
  const good = result.grades.filter((g) => g.grade !== 'pass').length / n;
  const perf = result.grades.filter((g) => g.grade === 'perfect').length / n;
  if (perf >= rule.three_perfect_ratio && good >= rule.two_good_ratio) return 3;
  if (good >= rule.two_good_ratio) return 2;
  return 1;
}
