// rhythm-02 판정·궤적·세상 위치 모듈 (20-balance.md 3~7절 규칙의 기준 구현, round-2 스키마 v2 "흘러오는 길")
//
// 빌드(브라우저)와 시뮬레이터·검증기(node)가 **같은 파일**을 import 한다. DOM·오디오·node 모듈에 의존하지 않는 순수 함수만 둔다.
// 시간 단위는 ms, 기준은 "레벨 시간 0 = 첫 받침 쉼의 첫 박(공이 북 위에 앉아 첫 '콩')". 판정 시계는 **화면 시계**다(20-balance 4-2).
//
//   compileLevel(level, bal)        → 접촉 목록(시각·종류 hit/nogo·판정 구역), 쉼 소리('콩')·토스·착지·지붕 밑 쉼 시각, 공별 비행, 세상 물체, 클리어 연출, 길이
//   judgeAttempt(L, taps, opt)      → 한 시도 결과 (클리어 / 실패 접촉·이유(early·late·bump_roof)·시각 / 판정 목록(hold = 지붕 참기 성공))
//                                     opt.startIndex·opt.carried = 이어 하기·연습 체크포인트(그 구절 첫 접촉부터, 앞 판정은 그대로)
//   gradeRating(L, result, rule)    → 클리어 등급 1~3 (hit 접촉만 셈, hold 제외)
//   tapToLevelMs(evTs, startTs, bal)→ pointerdown event.timeStamp → 레벨 시간(visual_comp_ms 한 번만 뺌)
//   hitsFromResult(L, result)       → judgeAttempt 결과 → 접촉별 친 시각 배열(ballsAt 입력, nogo 는 늘 null)
//   ballsAt(L, t, hits)             → 그 순간 공의 높이(Hp 대비, 공 아랫점)·x 자리(d 단위)·상태 (빌드 그리기용). 상태에 'seated_roof'(지붕 밑에 앉아 쉼) 추가
//   flightApex(durMs, bal)          → 비행 꼭짓점 높이(Hp 대비) = c × 길이(s)
//   fingerSchedule(L, bal, hits)    → 레벨 1 손가락 그림 등장·누름 시작·사라짐 시각
//   restartPhases(L, fail, bal)     → 실패 → 1.1 s 재시작 배분(일찍/늦음/지붕 콩 세 판)
//   --- round-2 세상(흘러오는 길) ---
//   scrollBeatAt(L, t)              → 그 순간 북 가운데에 와 있는 길의 박 위치(= 레벨 박, 일정 속도. t < 0 이면 0, 클리어 뒤 멈춤 박에서 멈춤)
//   pxPerBeat(L, W)                 → 화면 폭 W(px)에서 1박의 길 길이(px) = (1 − drum_x_ratio)·W / ahead_beats
//   worldX(L, beat, t, W)           → 길 위 박 위치 beat 의 화면 x(px) = drum_x_ratio·W + (beat − scrollBeatAt) × pxPerBeat
//   objectsAt(L, t, W, marginPx)    → 그 순간 화면에 보이는 세상 물체 [{...물체, x0, x1}] (x 는 beat_in/beat_out 자리)
//   firstVisibleMs(L, beat)         → 박 위치 beat 가 화면 오른쪽 끝에 처음 들어오는 레벨 시각(ms)
//   comboEvents(L, result)          → 콤보 표시 사건 [{i, kind, t, combo}] + 단계 [{stage, at_i, t, chordBeat, chordMs}] (결과에서 파생, 별도 상태 없음)
//   resumePoint(L, tPause, result)  → 이어 하기 되감기 위치 {fromMs, phrase, startIndex, carried} = 지금 구절의 받침 쉼 처음(세상 위치도 같은 시각으로)

export const BOUNCE_BY_BEATS = { 0.5: 'half', 1: 'tong', 1.5: 'dot', 2: 'big', 3: 'three', 4: 'cloud' };

export function judgeFor(level, bal) {
  return { ...bal.judge_defaults, ...(level.judge || {}) };
}

export function compileLevel(level, bal) {
  const beatMs = 60000 / level.bpm;
  const judge = judgeFor(level, bal);
  const sc = bal.scroll || {};
  const L = {
    level, bal, judge, beatMs, eighthMs: beatMs / 2, barMs: beatMs * level.beats_per_bar,
    contacts: [], bobs: [], tosses: [], landings: [], roofSits: [], objects: [], flights: {}, secondBall: [],
    scroll: { drumX: level.scroll?.drum_x_ratio ?? sc.drum_x_ratio ?? 0.3, ahead: level.scroll?.ahead_beats ?? 4 },
  };
  const ms = (beat) => beat * beatMs;
  level.contacts.forEach((c, i) => {
    L.contacts.push({ i, beat: c.beat, t: ms(c.beat), kind: c.kind || 'hit', ball: c.ball ?? 1, gapBeats: c.gap_beats, bounce: c.bounce, gimmick: c.gimmick, phrase: c.phrase, first: !!c.first_of_gimmick, object: c.object ?? null });
  });
  L.contacts.forEach((st, i) => {
    st.passStart = st.t - judge.pass_early_ms;
    st.passEnd = st.t + judge.pass_late_ms;
    if (st.kind === 'nogo') { st.zoneStart = st.passStart; return; } // 지붕 밑 착지: 놓침 구역 없음(창 밖 탭은 무시)
    // 놓침 구역: 통과 창 바로 앞 miss_zone_ms. 앞 접촉의 통과 창 끝보다 앞으로는 넓히지 않는다.
    let zs = st.passStart - judge.miss_zone_ms;
    if (i > 0) zs = Math.max(zs, L.contacts[i - 1].passEnd);
    st.zoneStart = Math.min(zs, st.passStart);
  });
  for (const ph of level.phrases) {
    for (let k = 0; k < ph.rest_beats; k++) L.bobs.push({ t: ms(ph.start_beat + k), phrase: ph.index, roof: false });
    for (const ts of ph.tosses) L.tosses.push({ t: ms(ts.beat), ball: ts.ball, toContact: ts.to_contact, phrase: ph.index, afterRoof: !!ts.after_roof });
    for (const ld of ph.landings) L.landings.push({ t: ms(ld.beat), ball: ld.ball, fromContact: ld.from_contact, exit: !!ld.exit, phrase: ph.index });
    for (const rs of ph.roof_sits || []) {
      L.roofSits.push({ contact: rs.contact, landMs: ms(rs.beat), tossMs: ms(rs.toss_beat), roofIn: ms(rs.roof_in_beat), roofOut: ms(rs.roof_out_beat), phrase: ph.index });
      for (const b of rs.bob_beats || []) L.bobs.push({ t: ms(b), phrase: ph.index, roof: true });
    }
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
  L.bobs.sort((a, b) => a.t - b.t);
  L.tosses.sort((a, b) => a.t - b.t);
  // 공별 비행(예정): 토스 → 접촉 → … (nogo = 착지, 그 뒤 지붕 뒤 토스) → 착지. 실제로 떠나는 시각은 ballsAt 이 친 시각으로 정함(D3).
  for (const ph of level.phrases) {
    const balls = [...new Set(ph.tosses.map((x) => x.ball))];
    for (const b of balls) {
      const arr = (L.flights[b] ||= []);
      const own = L.contacts.filter((c) => c.ball === b && c.phrase === ph.index);
      let from = null, kind = 'toss', fromContact = null;
      for (const c of own) {
        const ts = ph.tosses.find((x) => x.ball === b && x.to_contact === c.i);
        if (ts) { from = ms(ts.beat); kind = 'toss'; fromContact = null; }
        if (from == null) continue;
        arr.push({ from, to: c.t, kind, fromContact, toContact: c.i, phrase: ph.index, toKind: c.kind });
        if (c.kind === 'nogo') { from = null; continue; } // 지붕 밑에 앉음 → 다음은 지붕 뒤 토스
        from = c.t; kind = 'bounce'; fromContact = c.i;
      }
      const ld = ph.landings.find((x) => x.ball === b);
      if (ld && from != null) arr.push({ from, to: ms(ld.beat), kind: 'land', fromContact, toContact: null, exit: !!ld.exit, phrase: ph.index });
    }
  }
  for (const arr of Object.values(L.flights)) arr.sort((a, b) => a.from - b.from);
  // 세상 물체(길 위 표시·지붕·가지·구름·언덕): 박 위치 → ms
  for (const o of level.objects || []) L.objects.push({ ...o, tIn: ms(o.beat_in), tOut: ms(o.beat_out) });
  L.durationMs = ms(level.length_beats);
  L.clearTimeMs = L.contacts.length ? L.contacts[L.contacts.length - 1].passEnd : 0;
  const cs = level.clear_sequence;
  if (cs) {
    const launch = ms(cs.big_toss_beat);
    const flightMs = 1000 * cs.big_toss_flight_s;
    const H = cs.big_toss_apex_play_heights;
    const cl = bal.height.cloud_line_ratio;
    const sEnter = (1 - Math.sqrt(1 - cl / H)) / 2; // 4H·s(1-s) = cl 의 작은 근
    L.clear = { launch, flightMs, apex: H, cloudEnterMs: launch + sEnter * flightMs, apexMs: launch + flightMs / 2, gradeCloudMs: cs.grade_cloud_beats.map(ms), resultMs: ms(cs.result_beat), resultButtonsMs: ms(cs.result_beat) + (cs.result_buttons_after_ms ?? 0), scrollStopBeat: cs.scroll_stop_beat ?? null };
  }
  return L;
}

// taps: 레벨 시간(ms) 배열(화면 시계). 정렬하지 않아도 됨.
// 규칙 (20-balance.md 4-1, round-2 4-3)
//  - 아직 안 친 가장 이른 접촉 하나만 본다.
//  - hit 접촉: 통과 창 [t-early, t+late] 안 → 성공(등급), 놓침 구역 [zoneStart, t-early) → 실패 "early", 그보다 이른 탭 무시, 창 끝까지 없으면 "late".
//  - nogo 접촉(지붕 밑 착지): [t-early, t+late] 안 탭 → 실패 "bump_roof"(공이 지붕에 콩). 그보다 이른 탭은 무시(북만 톡).
//    창 끝까지 탭이 없으면 성공 → 판정 목록에 { grade: 'hold', e: null } 한 칸(콤보 +1, 등급 계산에서는 뺌).
export function judgeAttempt(L, taps, { startIndex = 0, carried = null } = {}) {
  const ts = [...taps].sort((a, b) => a - b);
  const cs = L.contacts;
  const j = L.judge;
  const grades = carried ? [...carried] : [];
  let i = startIndex;
  let stray = 0;
  const passHolds = (tau) => { while (i < cs.length && cs[i].kind === 'nogo' && tau > cs[i].passEnd) { grades.push({ i, e: null, grade: 'hold' }); i++; } };
  for (const tau of ts) {
    passHolds(tau);
    if (i >= cs.length) break;
    const st = cs[i];
    if (st.kind === 'nogo') {
      if (tau >= st.passStart) return fail(L, i, tau, 'bump_roof', grades, stray);
      stray++;
      continue;
    }
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
  passHolds(Infinity);
  if (i < cs.length) return fail(L, i, cs[i].passEnd, 'late', grades, stray);
  return { clear: true, grades, stray, progress: 1, progressTime: 1 };
}

function fail(L, i, timeMs, reason, grades, stray) {
  return { clear: false, failIndex: i, failTimeMs: timeMs, reason, grades, stray, progress: i / L.contacts.length, progressTime: Math.min(1, timeMs / L.durationMs) };
}

export function gradeRating(L, result, rule) {
  if (!result.clear) return 0;
  const g = result.grades.filter((x) => x.grade !== 'hold');
  const n = g.length || 1;
  const good = g.filter((x) => x.grade !== 'pass').length / n;
  const perf = g.filter((x) => x.grade === 'perfect').length / n;
  if (perf >= rule.three_perfect_ratio && good >= rule.two_good_ratio) return 3;
  if (good >= rule.two_good_ratio) return 2;
  return 1;
}

export function tapToLevelMs(eventTs, levelStartTs, bal) {
  return eventTs - levelStartTs - (bal.judge_clock?.visual_comp_ms ?? 0);
}

export function flightApex(durMs, bal) {
  return bal.height.c_play_height_per_s * (durMs / 1000);
}

export function hitsFromResult(L, result) {
  const h = new Array(L.contacts.length).fill(null);
  for (const g of result.grades) if (g.e != null) h[g.i] = L.contacts[g.i].t + g.e;
  return h;
}

const lerp = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u));

// 화면에 있는 공들: [{ball, x (북 가운데 기준, d 단위), y (Hp 대비, 공 아랫점), state, flight}]
//   state: 'seated'(받침 쉼) · 'seated_roof'(지붕 밑에 앉아 쉼, 판정 없음) · 'up'/'down' · 'waiting' · 'fallen' · 'entering'/'leaving' · 'clear_up'/'in_cloud' · 'gone'
export function ballsAt(L, t, hits, bal = L.bal) {
  const hitOf = normHits(L, hits);
  const out = [];
  const lastContact = L.contacts[L.contacts.length - 1];
  for (const [b, fl] of Object.entries(L.flights)) {
    const ball = +b;
    let st = null;
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
      if (t < f.to) {
        const d = f.to - launch, s = (t - launch) / d, H = flightApex(d, bal);
        st = { y: 4 * H * s * (1 - s), state: s < 0.5 ? 'up' : 'down', flight: { ...f, launch, apex: H } };
        break;
      }
    }
    if (!st) {
      if (ball === 1 && L.clear && t >= L.clear.launch && lastContact && hitOf(lastContact.i) != null) {
        const s = (t - L.clear.launch) / L.clear.flightMs;
        st = s < 0.5 ? { y: 4 * L.clear.apex * s * (1 - s), state: 'clear_up' } : { y: L.clear.apex, state: 'in_cloud' };
      } else if (ball === 1) {
        const rs = L.roofSits.find((r) => t >= r.landMs && t < r.tossMs);
        st = rs ? { y: 0, state: 'seated_roof', contact: rs.contact } : { y: 0, state: 'seated' };
      } else st = secondBallState(L, t);
    }
    st.x = xOf(L, ball, t);
    if (st.state === 'seated' || st.state === 'seated_roof') st.bob = L.bobs.some((x) => t >= x.t && t < x.t + Math.min(150, L.beatMs / 2));
    out.push({ ball, ...st, flight: st.flight ?? null });
  }
  return out;
}

function normHits(L, hits) {
  if (hits == null) return (i) => (L.contacts[i].kind === 'nogo' ? null : L.contacts[i].t);
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

function xOf(L, ball, t) {
  for (const sb of L.secondBall) {
    if (ball === 1) {
      if (t >= sb.ball1Left[0] && t < sb.ball1Center[1]) {
        if (t < sb.ball1Left[1]) return lerp(0, -sb.seatX, (t - sb.ball1Left[0]) / (sb.ball1Left[1] - sb.ball1Left[0]));
        if (t >= sb.ball1Center[0]) return lerp(-sb.seatX, 0, (t - sb.ball1Center[0]) / (sb.ball1Center[1] - sb.ball1Center[0]));
        return -sb.seatX;
      }
    } else {
      if (t >= sb.enter[0] && t < sb.enter[1]) return null;
      if (t >= sb.enter[1] && t < sb.exit[0]) return sb.seatX;
      if (t >= sb.exit[0] && t < sb.exit[1]) return null;
    }
  }
  return 0;
}

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

// 실패 → 다음 시도 첫 프레임 1.1 s 배분. 늦음 / 일찍 / 지붕 콩(bump_roof) 세 판. 반환 구간은 실패 판정 시각 기준 s.
export function restartPhases(L, failRes, bal) {
  const R = bal.restart;
  const P = failRes.reason === 'early' ? R.phases_s.early : failRes.reason === 'bump_roof' ? (R.phases_s.bump_roof || R.phases_s.late) : R.phases_s.late;
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

// ---------------- 세상(흘러오는 길, round-2) ----------------
// 길은 레벨 안 일정 속도: 1박 = pxPerBeat. 북 가운데에 와 있는 길의 박 = 레벨 박(t / beatMs). 레벨 시간 0 전(카드 닫힘·재시작 대기)에는 0 박에 멈춰 있고,
// 클리어 연출에서는 clear_sequence.scroll_stop_beat 에 멈춤(판정이 끝난 뒤라 "레벨 안 속도 고정"과 충돌 없음).
export function scrollBeatAt(L, t) {
  let b = Math.max(0, t) / L.beatMs;
  if (L.clear && L.clear.scrollStopBeat != null) b = Math.min(b, L.clear.scrollStopBeat);
  return b;
}
export function pxPerBeat(L, W) {
  return ((1 - L.scroll.drumX) * W) / L.scroll.ahead;
}
export function worldX(L, beat, t, W) {
  return L.scroll.drumX * W + (beat - scrollBeatAt(L, t)) * pxPerBeat(L, W);
}
export function objectsAt(L, t, W, marginPx = 0) {
  const out = [];
  for (const o of L.objects) {
    const x0 = worldX(L, o.beat_in, t, W), x1 = worldX(L, o.beat_out, t, W);
    if (x1 >= -marginPx && x0 <= W + marginPx) out.push({ ...o, x0, x1 });
  }
  return out;
}
// 박 위치 beat 가 화면 오른쪽 끝(x = W)에 처음 들어오는 레벨 시각: beat − ahead 박(레벨 시작 전부터 보이면 시작 시각 0 으로 자름은 호출 쪽에서)
export function firstVisibleMs(L, beat) {
  return (beat - L.scroll.ahead) * L.beatMs;
}

// ---------------- 콤보 (round-2, harness/benchmarks/djmax-judgement.md 4절 + 00-benchmark 14-8) ----------------
// 콤보 = 이번 시도에서 지금까지의 성공 판정 수 = result.grades 길이(hit 성공 모든 등급 + nogo 참기 hold). 별도 상태·난수 없음.
//   표시 시각: hit = 판정 순간(친 시각, 이르게 친 통과도 친 시각), hold = 지붕이 북을 떠나는 순간(roof_out, 지붕 밑 착지 ±1박 안 연출 금지 S9).
//   단계(bal.combo.stages): 그 수에 닿은 판정의 표시 시각에 그림 연출 시작. 화음(chord_stages)은 그 판정 접촉 박 다음 정박(floor(박)+1)에,
//   그 정박이 어떤 지붕 밑 착지 박 ±avoid_roof_beats 안이면 그 창이 끝난 뒤 첫 정박으로 미룸.
export function comboEvents(L, result, bal = L.bal) {
  const C = bal.combo || {};
  const stages = C.stages || [];
  const chordStages = C.chord_stages || [];
  const avoid = C.chord_timing?.avoid_roof_beats ?? 1;
  const ev = [];
  result.grades.forEach((g, k) => {
    const c = L.contacts[g.i];
    let t, beat;
    if (g.grade === 'hold') { const rs = L.roofSits.find((r) => r.contact === g.i); t = rs ? rs.roofOut : c.passEnd; beat = t / L.beatMs; }
    else { t = c.t + g.e; beat = c.beat; }
    ev.push({ i: g.i, kind: g.grade === 'hold' ? 'hold' : 'hit', grade: g.grade, t, beat, combo: k + 1 });
  });
  const roofBeats = L.roofSits.map((r) => r.landMs / L.beatMs);
  const chordBeatAfter = (beat) => {
    let b = Math.floor(beat + 1e-9) + 1;
    for (let guard = 0; guard < 64; guard++) {
      const hit = roofBeats.find((rb) => b >= rb - avoid - 1e-9 && b <= rb + avoid + 1e-9);
      if (hit == null) return b;
      b = Math.floor(hit + avoid + 1e-9) + 1;
    }
    return b;
  };
  const st = [];
  for (const s of stages) {
    const e = ev.find((x) => x.combo === s);
    if (!e) continue;
    const chord = chordStages.includes(s);
    const cb = chord ? chordBeatAfter(e.beat) : null;
    st.push({ stage: s, at_i: e.i, t: e.t, chordBeat: cb, chordMs: cb != null ? cb * L.beatMs : null });
  }
  return { events: ev, stages: st, final: result.grades.length };
}

// ---------------- 이어 하기 (round-2, N7) ----------------
// 멈춘 시각 tPause → 지금 구절의 받침 쉼 처음(start_beat)으로 되감음. 세상 위치도 scrollBeatAt(fromMs)로 같이 되감김.
// 그 구절 앞 접촉의 판정은 그대로(carried), 이 구절 첫 접촉부터 다시 판정. 마지막 접촉 판정 뒤(클리어 연출)는 되감지 않음.
export function resumePoint(L, tPause, result = null) {
  const lv = L.level;
  if (L.contacts.length && tPause > L.clearTimeMs) return { fromMs: tPause, phrase: null, startIndex: L.contacts.length, carried: result ? result.grades : null, rewound: false };
  let ph = lv.phrases[0];
  for (const p of lv.phrases) if (p.start_beat * L.beatMs <= tPause + 1e-9) ph = p;
  const startIndex = ph.contact_range[0];
  const carried = result ? result.grades.filter((g) => g.i < startIndex) : null;
  return { fromMs: ph.start_beat * L.beatMs, phrase: ph.index, startIndex, carried, rewound: true };
}
