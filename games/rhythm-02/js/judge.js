// rhythm-02 판정·궤적 모듈 (20-balance.md 3~6절 규칙의 기준 구현)
//
// 빌드(브라우저)와 시뮬레이터·검증기(node)가 **같은 파일**을 import 한다. DOM·오디오·node 모듈에 의존하지 않는 순수 함수만 둔다.
// 시간 단위는 ms, 기준은 "레벨 시간 0 = 첫 받침 쉼의 첫 박(공이 북 위에 앉아 첫 '콩')". 판정 시계는 **화면 시계**다(20-balance 4-2).
//
//   compileLevel(level, bal)        → 접촉 목록(시각·판정 구역), 쉼 소리('콩')·토스·착지 시각, 공별 비행 목록, 공 2 들어옴/나감, 클리어 연출, 길이
//   judgeAttempt(L, taps)           → 한 시도 결과 (클리어 / 실패 접촉·이유·시각 / 판정 목록)
//   gradeRating(L, result, rule)    → 클리어 등급 1~3
//   tapToLevelMs(evTs, startTs, bal)→ pointerdown event.timeStamp → 레벨 시간(visual_comp_ms 한 번만 뺌)
//   hitsFromResult(L, result)       → judgeAttempt 결과 → 접촉별 친 시각 배열(ballsAt 입력)
//   ballsAt(L, t, hits)             → 그 순간 화면에 있는 공들의 높이(놀이 높이 Hp 대비, 공 아랫점)·x 자리(d 단위)·상태 (빌드 그리기용)
//                                     **탭이 공을 올린다**(결정 D3): 공은 접촉 시각에 가죽에 닿고, 통과 창 동안 가죽 위에서 기다리다
//                                     친 순간 튐(이르게 친 통과는 접촉 시각에 튐). 다음 비행 = 떠난 시각 → 다음 접촉(시각 고정), 꼭짓점 = c × 남은 길이.
//   flightApex(durMs, bal)          → 비행 꼭짓점 높이(Hp 대비) = c × 길이(s)
//   fingerSchedule(L, bal, hits)    → 레벨 1 손가락 그림 등장·누름 시작·사라짐 시각(사라짐 = 친 순간, 늦어도 통과 창 끝. 원본은 이것 하나, 결정 D4)
//   restartPhases(L, fail, bal)     → 실패 → 1.1 s 재시작 배분(일찍/늦음 두 판, 결정 D9)

export const BOUNCE_BY_BEATS = { 0.5: 'half', 1: 'tong', 1.5: 'dot', 2: 'big', 3: 'three', 4: 'cloud' };

export function judgeFor(level, bal) {
  return { ...bal.judge_defaults, ...(level.judge || {}) };
}

export function compileLevel(level, bal) {
  const beatMs = 60000 / level.bpm;
  const judge = judgeFor(level, bal);
  const L = { level, bal, judge, beatMs, eighthMs: beatMs / 2, barMs: beatMs * level.beats_per_bar, contacts: [], bobs: [], tosses: [], landings: [], flights: {}, secondBall: [] };
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
    // 받침 쉼 소리 '콩'(공이 가죽 위에서 까딱할 때, 정박마다. 소리 키는 assets/sound.json rest_a/rest_b, art)
    for (let k = 0; k < ph.rest_beats; k++) L.bobs.push({ t: ms(ph.start_beat + k), phrase: ph.index });
    for (const ts of ph.tosses) L.tosses.push({ t: ms(ts.beat), ball: ts.ball, toContact: ts.to_contact, phrase: ph.index });
    for (const ld of ph.landings) L.landings.push({ t: ms(ld.beat), ball: ld.ball, fromContact: ld.from_contact, exit: !!ld.exit, phrase: ph.index });
    if (ph.second_ball) {
      const sb = ph.second_ball;
      L.secondBall.push({
        phrase: ph.index,
        enter: [ms(sb.enter_beats[0]), ms(sb.enter_beats[1])], hopFrom: ms(sb.enter_beats[1] - sb.hop_beats),
        ball1Left: [ms(sb.ball1_to_left_beats[0]), ms(sb.ball1_to_left_beats[1])],
        exit: [ms(sb.exit_beats[0]), ms(sb.exit_beats[1])],
        ball1Center: [ms(sb.ball1_to_center_beats[0]), ms(sb.ball1_to_center_beats[1])],
        seatX: sb.seat_x_of_d, hopOfD: sb.hop_of_d,
      });
    }
  }
  // 공별 비행(예정): 토스 → 접촉 → … → 착지. 실제로 떠나는 시각은 ballsAt 이 친 시각으로 정함(D3).
  for (const ph of level.phrases) {
    for (const ts of ph.tosses) {
      const b = ts.ball;
      const arr = (L.flights[b] ||= []);
      let from = ms(ts.beat), kind = 'toss', fromContact = null;
      const own = L.contacts.filter((c) => c.ball === b && c.phrase === ph.index);
      for (const c of own) { arr.push({ from, to: c.t, kind, fromContact, toContact: c.i, phrase: ph.index }); from = c.t; kind = 'bounce'; fromContact = c.i; }
      const ld = ph.landings.find((x) => x.ball === b);
      if (ld) arr.push({ from, to: ms(ld.beat), kind: 'land', fromContact, toContact: null, exit: !!ld.exit, phrase: ph.index });
    }
  }
  for (const arr of Object.values(L.flights)) arr.sort((a, b) => a.from - b.from);
  L.durationMs = ms(level.length_beats);
  L.clearTimeMs = L.contacts.length ? L.contacts[L.contacts.length - 1].passEnd : 0;
  // 클리어 연출(결정 D10, 원본 = 레벨 clear_sequence): 마지막 착지 박에 큰 튐(판정 없음) → 구름 속에 머묾 → 등급 구름 → 결과 화면
  const cs = level.clear_sequence;
  if (cs) {
    const launch = ms(cs.big_toss_beat);
    const flightMs = 1000 * cs.big_toss_flight_s;
    const H = cs.big_toss_apex_play_heights;
    const cl = bal.height.cloud_line_ratio;
    const sEnter = (1 - Math.sqrt(1 - cl / H)) / 2; // 4H·s(1-s) = cl 의 작은 근
    L.clear = { launch, flightMs, apex: H, cloudEnterMs: launch + sEnter * flightMs, apexMs: launch + flightMs / 2, gradeCloudMs: cs.grade_cloud_beats.map(ms), resultMs: ms(cs.result_beat), resultButtonsMs: ms(cs.result_beat) + (cs.result_buttons_after_ms ?? 0) };
  }
  return L;
}

// taps: 레벨 시간(ms) 배열(화면 시계, visual_comp_ms 뺀 뒤). 정렬하지 않아도 됨.
// 규칙 (20-balance.md 4-1)
//  - 아직 안 친 가장 이른 접촉 하나만 본다(공이 둘이어도 같음).
//  - 탭이 그 접촉의 통과 창 [t-early, t+late] 안 → 성공(공이 그 탭에 튀어 오름, ballsAt), 등급 기록, 다음 접촉으로.
//  - 탭이 놓침 구역 [zoneStart, t-early) 안 → 실패 "early"(헛스윙: 공은 그대로 내려와 북 옆으로 굴러 떨어짐).
//  - 그보다 이른 탭 → 무시(북만 톡, 헛탭 수만 셈).
//  - 통과 창 끝까지 탭이 없으면 → 실패 "late"(가죽 위에서 기다리던 공이 북 옆으로 굴러 떨어짐, 창 끝 시각).
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

// 높이 = 시간: 꼭짓점 H = c × 비행 길이(s) (놀이 높이 Hp 대비, 공 아랫점과 북 가죽 윗면 사이). 궤적 y = 4H·s(1-s), s = 경과/길이.
// 북에 닿는 속도 4c 로 모든 통이 같다(늦게 쳐서 비행이 짧아져도 같음).
export function flightApex(durMs, bal) {
  return bal.height.c_play_height_per_s * (durMs / 1000);
}

// judgeAttempt 결과 → hits[i] = 접촉 i 를 통과시킨 탭 시각(레벨 ms), 아직 못 친 접촉은 null
export function hitsFromResult(L, result) {
  const h = new Array(L.contacts.length).fill(null);
  for (const g of result.grades) h[g.i] = L.contacts[g.i].t + g.e;
  return h;
}

const lerp = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u));

// 화면에 있는 공들: [{ball, x (북 가운데 기준, 공 지름 d 단위), y (Hp 대비, 공 아랫점), state, flight}]
//   hits: 접촉별 친 시각 배열(hitsFromResult) 또는 judgeAttempt 결과. 생략하면 "모든 접촉을 접촉 시각에 침"(완벽 입력).
//   state:
//     'seated'   북 위에 앉음(받침 쉼, 박마다 까딱 + '콩'). bob = 이 박에 까딱 중인지
//     'up'/'down' 비행 중(토스·튐·착지 비행). y > cloud_line_ratio 면 구름 뒤(그림자는 계속)
//     'waiting'  접촉 시각에 가죽에 닿아 납작하게 기다림(탭 전, 최대 pass_late). 탭 순간 'up'
//     'fallen'   통과 창이 끝날 때까지 탭 없음 = 늦음 실패(빌드는 restartPhases 로 넘어감)
//     'entering'/'leaving' 공 2 가 화면 오른쪽 밖 바닥에서 굴러 들어와 북 옆에서 낮게 깡충(hop = d 단위 높이) 오른쪽 자리에 앉음 / 착지 뒤 북 오른쪽 끝에서 굴러 떨어져 나감.
//                u = 0~1 진행, x = null(빌드가 화면 가장자리 ↔ seatX 보간)
//     'clear_up'/'in_cloud' 클리어 큰 튐(판정 없음) → 구름 속에 머묾
//     'gone'     화면 밖(공 2, 두 공 구절 밖)
export function ballsAt(L, t, hits, bal = L.bal) {
  const hitOf = normHits(L, hits);
  const out = [];
  const lastContact = L.contacts[L.contacts.length - 1];
  for (const [b, fl] of Object.entries(L.flights)) {
    const ball = +b;
    let st = null;
    let launchPrev = null;
    for (const f of fl) {
      let launch;
      if (f.kind === 'toss') launch = f.from;
      else {
        const c = L.contacts[f.fromContact];
        if (t < c.t) break;
        const h = hitOf(c.i);
        if (h == null) { st = t <= c.passEnd ? { y: 0, state: 'waiting', contact: c.i } : { y: 0, state: 'fallen', contact: c.i }; break; }
        launch = Math.max(h, c.t);
        if (t < launch) { st = { y: 0, state: 'waiting', contact: c.i }; break; }
      }
      if (t < launch) break;
      launchPrev = launch;
      if (t < f.to) {
        const d = f.to - launch, s = (t - launch) / d, H = flightApex(d, bal);
        st = { y: 4 * H * s * (1 - s), state: s < 0.5 ? 'up' : 'down', flight: { ...f, launch, apex: H } };
        break;
      }
    }
    if (!st) {
      // 비행 밖: 앉음 / 공 2 들어옴·나감 / 클리어
      if (ball === 1 && L.clear && t >= L.clear.launch && lastContact && hitOf(lastContact.i) != null) {
        const s = (t - L.clear.launch) / L.clear.flightMs;
        st = s < 0.5 ? { y: 4 * L.clear.apex * s * (1 - s), state: 'clear_up' } : { y: L.clear.apex, state: 'in_cloud' };
      } else if (ball === 1) st = { y: 0, state: 'seated' };
      else st = secondBallState(L, t);
    }
    st.x = xOf(L, ball, t);
    if (st.state === 'seated') st.bob = L.bobs.some((x) => t >= x.t && t < x.t + Math.min(150, L.beatMs / 2));
    out.push({ ball, ...st, flight: st.flight ?? null });
  }
  return out;
}

function normHits(L, hits) {
  if (hits == null) return (i) => L.contacts[i].t;
  if (Array.isArray(hits)) return (i) => hits[i] ?? null;
  if (hits.grades) { const h = hitsFromResult(L, hits); return (i) => h[i]; }
  return (i) => hits[i] ?? null;
}

function secondBallState(L, t) {
  for (const sb of L.secondBall) {
    if (t >= sb.enter[0] && t < sb.enter[1]) {
      const hop = t >= sb.hopFrom ? sb.hopOfD * 4 * ((t - sb.hopFrom) / (sb.enter[1] - sb.hopFrom)) * (1 - (t - sb.hopFrom) / (sb.enter[1] - sb.hopFrom)) : 0;
      return { y: 0, hop, state: 'entering', u: (t - sb.enter[0]) / (sb.enter[1] - sb.enter[0]), seatX: sb.seatX };
    }
    const toss2 = L.tosses.find((x) => x.ball === 2 && x.phrase === sb.phrase);
    if (toss2 && t >= sb.enter[1] && t < toss2.t) return { y: 0, state: 'seated' };
    if (t >= sb.exit[0] && t < sb.exit[1]) return { y: 0, state: 'leaving', u: (t - sb.exit[0]) / (sb.exit[1] - sb.exit[0]), seatX: sb.seatX };
  }
  return { y: 0, state: 'gone' };
}

// x 자리(d 단위, 북 가운데 0): 두 공 구절에서 공 1 은 왼쪽(-seat), 공 2 는 오른쪽(+seat). 들어오기·나가기 동안 미끄러짐.
function xOf(L, ball, t) {
  for (const sb of L.secondBall) {
    if (ball === 1) {
      if (t >= sb.ball1Left[0] && t < sb.ball1Center[1]) {
        if (t < sb.ball1Left[1]) return lerp(0, -sb.seatX, (t - sb.ball1Left[0]) / (sb.ball1Left[1] - sb.ball1Left[0]));
        if (t >= sb.ball1Center[0]) return lerp(-sb.seatX, 0, (t - sb.ball1Center[0]) / (sb.ball1Center[1] - sb.ball1Center[0]));
        return -sb.seatX;
      }
    } else {
      if (t >= sb.enter[0] && t < sb.enter[1]) return null; // 화면 오른쪽 밖 → seat (빌드가 화면 가장자리에서 보간, state.u)
      if (t >= sb.enter[1] && t < sb.exit[0]) return sb.seatX;
      if (t >= sb.exit[0] && t < sb.exit[1]) return null; // seat → 화면 오른쪽 밖 (state.u)
    }
  }
  return 0;
}

// 레벨 1 손가락 그림 (20-balance.md 6-3). 등장 = 그 접촉으로 가는 토스 시각, 누름 시작 = 접촉 + press_start_beats 박,
// 다 누름 = 접촉 + press_end_beats 박, 사라짐 = 공을 친 순간(hits), 늦어도 그 접촉의 통과 창 끝. 빌드·art 는 이 값만 씀(결정 D4).
export function fingerSchedule(L, bal, hits) {
  const tf = L.level.tutorial_finger;
  if (!tf) return null;
  const c = L.contacts[tf.contact_index];
  const toss = L.tosses.find((x) => x.toContact === c.i);
  const from = toss ? toss.t : c.t - L.beatMs;
  const h = hits ? normHits(L, hits)(c.i) : null;
  const gone = h != null && h <= c.passEnd ? h : c.passEnd;
  return { contact: c.i, from, pressStart: c.t + tf.press_start_beats * L.beatMs, pressEnd: c.t + (tf.press_end_beats ?? 0) * L.beatMs, gone, goneLatest: c.passEnd };
}

// 실패 → 다음 시도 첫 프레임 1.1 s 배분(결정 D9). fail = judgeAttempt 실패 결과. 반환 구간은 실패 판정 시각 기준 s.
//   늦음: 가죽 위에서 기다리던 공이 북 옆으로 굴러 떨어짐 [0, 0.45] → 정지 → 다시 나타남
//   일찍: 헛스윙(북 톡 + 바람선) → 공은 같은 속도로 계속 내려와 북에 닿지 않고 옆으로 굴러 떨어짐.
//         움직임 끝 = min(max, max(min, 남은 낙하 + after)), 정지 구간이 그만큼 줄고 총합 1.1 s 그대로
export function restartPhases(L, failRes, bal) {
  const R = bal.restart;
  const P = failRes.reason === 'early' ? R.phases_s.early : R.phases_s.late;
  const out = {};
  for (const [k, v] of Object.entries(P)) if (Array.isArray(v)) out[k] = [...v];
  if (failRes.reason === 'early') {
    const rule = R.early_fall_rule;
    const c = L.contacts[failRes.failIndex];
    const fallLeft = Math.max(0, (c.t - failRes.failTimeMs) / 1000);
    const end = Math.min(rule.max_s, Math.max(rule.min_s, fallLeft + rule.after_fall_s));
    out.ball_fall_fx = [0, end];
    out.still_best_dot = [end, out.still_best_dot[1]];
    out._fall_left_s = fallLeft;
  }
  return out;
}
