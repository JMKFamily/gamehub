// rhythm-02 판정·궤적 모듈 (20-balance.md 3~6절 규칙의 기준 구현)
//
// 빌드(브라우저)와 시뮬레이터·검증기(node)가 **같은 파일**을 import 한다. DOM·오디오·node 모듈에 의존하지 않는 순수 함수만 둔다.
// 시간 단위는 ms, 기준은 "레벨 시간 0 = 첫 받침 쉼의 첫 박(공이 북 위에 앉아 첫 똑딱)". 판정 시계는 **화면 시계**다(20-balance 4-4).
//
//   compileLevel(level, bal)        → 접촉 목록(시각·판정 구역), 똑딱·토스·착지 시각, 공별 비행 목록, 길이
//   judgeAttempt(L, taps)           → 한 시도 결과 (클리어 / 실패 접촉·이유·시각 / 판정 목록)
//   gradeRating(L, result, rule)    → 클리어 등급 1~3
//   tapToLevelMs(evTs, startTs, bal)→ pointerdown event.timeStamp → 레벨 시간(visual_comp_ms 한 번만 뺌)
//   ballsAt(L, t, bal)              → 그 순간 화면에 있는 공들의 높이(놀이 높이 대비 0~)·상태 (빌드 그리기용)
//   flightApex(durMs, bal)          → 비행 꼭짓점 높이(놀이 높이 대비) = c × 길이(s)
//   fingerSchedule(L, bal)          → 레벨 1 손가락 그림 등장·누름 시작·사라짐 시각

export const BOUNCE_BY_BEATS = { 0.5: 'half', 1: 'tong', 1.5: 'dot', 2: 'big', 3: 'three', 4: 'cloud' };

export function judgeFor(level, bal) {
  return { ...bal.judge_defaults, ...(level.judge || {}) };
}

export function compileLevel(level, bal) {
  const beatMs = 60000 / level.bpm;
  const judge = judgeFor(level, bal);
  const L = { level, judge, beatMs, eighthMs: beatMs / 2, barMs: beatMs * level.beats_per_bar, contacts: [], ticks: [], tosses: [], landings: [], flights: {} };
  const ms = (beat) => beat * beatMs;
  level.contacts.forEach((c, i) => {
    L.contacts.push({ i, beat: c.beat, t: ms(c.beat), ball: c.ball, gapBeats: c.gap_beats, bounce: c.bounce, gimmick: c.gimmick, phrase: c.phrase, first: !!c.first_of_gimmick });
  });
  L.contacts.forEach((st, i) => {
    st.passStart = st.t - judge.pass_early_ms;
    st.passEnd = st.t + judge.pass_late_ms;
    // 놓침 구역: 통과 창 바로 앞 miss_zone_ms. 앞 접촉의 통과 창 끝보다 앞으로는 넓히지 않는다(앞 접촉을 친 뒤 한 번 더 친 탭이 다음 접촉을 깨지 않게).
    let zs = st.passStart - judge.miss_zone_ms;
    if (i > 0) zs = Math.max(zs, L.contacts[i - 1].passEnd);
    st.zoneStart = Math.min(zs, st.passStart);
  });
  for (const ph of level.phrases) {
    for (let k = 0; k < ph.rest_beats; k++) L.ticks.push({ t: ms(ph.start_beat + k), phrase: ph.index });
    for (const ts of ph.tosses) L.tosses.push({ t: ms(ts.beat), ball: ts.ball, toContact: ts.to_contact, phrase: ph.index });
    for (const ld of ph.landings) L.landings.push({ t: ms(ld.beat), ball: ld.ball, fromContact: ld.from_contact, exit: !!ld.exit, phrase: ph.index });
  }
  // 공별 비행: 토스 → 접촉 → … → 착지
  for (const ph of level.phrases) {
    for (const ts of ph.tosses) {
      const b = ts.ball;
      const arr = (L.flights[b] ||= []);
      let from = ms(ts.beat), kind = 'toss';
      const own = L.contacts.filter((c) => c.ball === b && c.phrase === ph.index);
      for (const c of own) { arr.push({ from, to: c.t, kind, toContact: c.i, phrase: ph.index }); from = c.t; kind = 'bounce'; }
      const ld = ph.landings.find((x) => x.ball === b);
      if (ld) arr.push({ from, to: ms(ld.beat), kind: 'land', toContact: null, exit: !!ld.exit, phrase: ph.index });
    }
  }
  L.durationMs = ms(level.length_beats);
  L.clearTimeMs = L.contacts.length ? L.contacts[L.contacts.length - 1].passEnd : 0;
  return L;
}

// taps: 레벨 시간(ms) 배열(화면 시계, visual_comp_ms 뺀 뒤). 정렬하지 않아도 됨.
// 규칙 (20-balance.md 4-3)
//  - 아직 안 친 가장 이른 접촉 하나만 본다(공이 둘이어도 같음).
//  - 탭이 그 접촉의 통과 창 [t-early, t+late] 안 → 성공(공이 정해진 높이로 튐), 등급 기록, 다음 접촉으로.
//  - 탭이 놓침 구역 [zoneStart, t-early) 안 → 실패 "early"(헛스윙: 북이 내려오는 중에 공이 닿아 미끄러짐).
//  - 그보다 이른 탭 → 무시(북만 톡, 헛탭 수만 셈).
//  - 통과 창 끝까지 탭이 없으면 → 실패 "late"(공이 북 옆으로 떨어짐, 창 끝 시각).
export function judgeAttempt(L, taps) {
  const ts = [...taps].sort((a, b) => a - b);
  const cs = L.contacts;
  const j = L.judge;
  const grades = [];
  let i = 0;
  let stray = 0;
  for (const tau of ts) {
    if (i >= cs.length) break;
    const st = cs[i];
    if (tau > st.passEnd) return fail(L, i, st.passEnd, 'late', grades, stray);
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
  if (i < cs.length) return fail(L, i, cs[i].passEnd, 'late', grades, stray);
  return { clear: true, grades, stray, progress: 1, progressTime: 1 };
}

// progress = 진행도 막대 = 처리한 접촉 수 / 전체 접촉 수(받침 쉼에서는 움직이지 않음). progressTime = 레벨 시간 기준 위치.
function fail(L, i, timeMs, reason, grades, stray) {
  return { clear: false, failIndex: i, failTimeMs: timeMs, reason, grades, stray, progress: i / L.contacts.length, progressTime: Math.min(1, timeMs / L.durationMs) };
}

export function gradeRating(L, result, rule) {
  if (!result.clear) return 0;
  const n = result.grades.length;
  const good = result.grades.filter((g) => g.grade !== 'pass').length / n;
  const perf = result.grades.filter((g) => g.grade === 'perfect').length / n;
  if (perf >= rule.three_perfect_ratio && good >= rule.two_good_ratio) return 3;
  if (good >= rule.two_good_ratio) return 2;
  return 1;
}

// 빌드용: pointerdown event.timeStamp(performance 시계) → 레벨 시간. levelStartTs = 레벨 시간 0 이 화면에 그려진 performance 시각.
// visual_comp_ms(터치→이벤트·화면 표시 지연의 늦은 쪽 몫)를 **한 번만** 뺀다. 오디오 지연은 판정에 들어가지 않는다.
export function tapToLevelMs(eventTs, levelStartTs, bal) {
  return eventTs - levelStartTs - (bal.judge_clock?.visual_comp_ms ?? 0);
}

// 높이 = 시간: 꼭짓점 H = c × 비행 길이(s) (놀이 높이 대비). 궤적 y = 4H·s(1-s), s = 경과/길이. 북에 닿는 속도 4c 로 모든 통이 같다.
export function flightApex(durMs, bal) {
  return bal.height.c_play_height_per_s * (durMs / 1000);
}

// 화면에 있는 공들: [{ball, y(놀이 높이 대비), state: 'seated'|'up'|'down'|'gone', flight}]
//   seated: 받침 쉼(앉음). 공 2 는 자기 구절 밖에서는 'gone'. 높이 y > cloud_line_ratio 이면 구름 뒤(그리기는 art, 그림자는 계속)
export function ballsAt(L, t, bal) {
  const out = [];
  for (const [b, fl] of Object.entries(L.flights)) {
    const ball = +b;
    const f = fl.find((x) => t >= x.from && t < x.to);
    if (f) {
      const d = f.to - f.from, s = (t - f.from) / d, H = flightApex(d, bal);
      out.push({ ball, y: 4 * H * s * (1 - s), state: s < 0.5 ? 'up' : 'down', flight: f });
    } else if (ball === 1) {
      out.push({ ball, y: 0, state: 'seated', flight: null });
    }
  }
  return out;
}

// 레벨 1 손가락 그림 (20-balance.md 6-3). 등장 = 그 접촉으로 가는 토스 시각, 누름 시작 = 접촉 + press_start_beats 박,
// 사라짐 = 그 접촉의 통과 창 끝(공을 치면 바로 사라짐).
export function fingerSchedule(L, bal) {
  const tf = L.level.tutorial_finger;
  if (!tf) return null;
  const c = L.contacts[tf.contact_index];
  const toss = L.tosses.find((x) => x.toContact === c.i);
  const from = toss ? toss.t : c.t - L.beatMs;
  return { contact: c.i, from, pressStart: c.t + tf.press_start_beats * L.beatMs, pressEnd: c.t + (tf.press_end_beats ?? 0) * L.beatMs, gone: c.passEnd };
}
