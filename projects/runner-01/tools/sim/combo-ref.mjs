// 콤보 판정 기준 구현 (runner-01, balance-designer round-2 콤보). 빌드 코드가 아니라 "정의"다.
// game-developer는 games/reverbound/js 쪽에 같은 규칙을 옮기고, tools/combo-check.mjs로 결과가 같은지 확인한다.
// 규칙 원문: 20-balance.md 15장. 데이터: balance.json combo, levels/*.json judge_taps (tools/build-judge-taps.mjs 생성)
//
// 핵심
//  - 생사는 physics.js step()만 정한다. 이 모듈은 step 결과(ev 비트)를 보기만 하고 아무것도 바꾸지 않는다.
//  - 판정 사건 = 입력으로 시작된 점프: ev & 1 (지면 점프, 홀드로 착지 틱에 뛴 것 포함), ev & 2 (울림 고리).
//    ev & 8 (북 발판)은 자동 사건이라 판정하지 않는다.
//  - 누름 1번은 판정 1번까지만 쓴다(홀드 재점프로 같은 누름이 또 뛰면 판정 없음).
//  - 짝: 종류가 같고(ground↔ev1, orb↔ev2) 아직 안 쓴 판정 탭 중, 사건 틱이 그 탭의 판정 창 안에 있고
//    박 시각에 가장 가까운 것 1개. 없으면 무시(헛점프, 벌 없음).
//  - 등급: e = 사건 시각 − 박 시각. |e| ≤ grade_ms[0] → 1, ≤ grade_ms[1] → 2, 그 밖(판정 창 안) → 3.
//  - 콤보: 판정 1개 = +1 (3단도 +1). 사망하면 0. 연습 모드 부활도 0에서 시작.
//    짝이 안 된 채 지나간 탭은 콤보를 끊지 않는다(끊김은 사망뿐).

export function gradeOf(eMs, gradeMs) {
  const a = Math.abs(eMs);
  return a <= gradeMs[0] ? 1 : a <= gradeMs[1] ? 2 : 3;
}

// taps: level.judge_taps, combo: balance.combo, hz: balance.physics_hz
export function createComboJudge(taps, combo, hz) {
  const lo = taps.map((t) => (t.t_s - t.judge_early_ms / 1000) * hz); // 판정 창 시작 (틱, 실수)
  const hi = taps.map((t) => (t.t_s + t.judge_late_ms / 1000) * hz);  // 판정 창 끝
  const J = {
    used: new Array(taps.length).fill(false),
    judgedPress: new Set(),
    combo: 0,
    best: 0,
    grades: [], // {i, k, e_ms, grade}
    // 시도 시작(fromTick 0) 또는 연습 부활(fromTick = 체크포인트 틱)
    reset(fromTick = 0) {
      J.combo = 0; J.grades = []; J.judgedPress = new Set();
      for (let i = 0; i < taps.length; i++) J.used[i] = hi[i] < fromTick; // 이미 지난 탭은 쓴 것으로
    },
    // 틱 k를 step으로 진행한 직후 호출. ev: step 결과 ev, pressId: 이번 틱에 눌려 있던 누름의 번호(없으면 null)
    onStep(k, ev, pressId) {
      if (!(ev & 3) || pressId == null || J.judgedPress.has(pressId)) return null;
      const kind = ev & 2 ? 'orb' : 'ground';
      let best = -1, bestD = Infinity;
      for (let i = 0; i < taps.length; i++) {
        if (J.used[i] || taps[i].kind !== kind || k < lo[i] || k > hi[i]) continue;
        const d = Math.abs(k / hz - taps[i].t_s);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best < 0) return null;
      J.used[best] = true; J.judgedPress.add(pressId);
      const e_ms = (k / hz - taps[best].t_s) * 1000;
      const r = { i: best, k, e_ms: +e_ms.toFixed(1), grade: gradeOf(e_ms, combo.grade_ms) };
      J.grades.push(r);
      J.combo++; if (J.combo > J.best) J.best = J.combo;
      return r;
    },
    onDeath() { J.combo = 0; },
  };
  J.reset(0);
  return J;
}
