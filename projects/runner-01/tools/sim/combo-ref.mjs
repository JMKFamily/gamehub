// 콤보 판정 기준 구현 (runner-01, balance-designer round-2 콤보 + 퍼센트 판정). 빌드 코드가 아니라 "정의"다.
// game-developer는 games/reverbound/js 쪽에 같은 규칙을 옮기고, tools/combo-check.mjs로 결과가 같은지 확인한다.
// 규칙 원문: 20-balance.md 15장(15-10 퍼센트). 데이터: balance.json combo(combo.judge_pct), levels/*.json judge_taps
//
// 핵심
//  - 생사는 physics.js step()만 정한다. 이 모듈은 step 결과(ev 비트)를 보기만 하고 아무것도 바꾸지 않는다.
//  - 판정 사건 = 입력으로 시작된 점프: ev & 1 (지면 점프, 홀드로 착지 틱에 뛴 것 포함), ev & 2 (울림 고리).
//    ev & 8 (북 발판)은 자동 사건이라 판정하지 않는다.
//  - 누름 1번은 판정 1번까지만 쓴다(홀드 재점프로 같은 누름이 또 뛰면 판정 없음).
//  - 짝: 종류가 같고(ground↔ev1, orb↔ev2) 아직 안 쓴 판정 탭 중, 사건 틱이 그 탭의 판정 창 안에 있고
//    박 시각에 가장 가까운 것 1개. 없으면 무시(헛점프, 벌 없음).
//    판정 창 = [t_s − early_ms, t_s + late_ms]. t_s·창 값이 반올림돼 있으므로(합 최대 0.1 ms) judge_pct.edge_tol_ms(0.15)만큼 너그럽게 본다
//    (반올림 때문에 살아남는 마지막 틱이 창 밖으로 빠지지 않게. 틱 간격 4.17 ms보다 훨씬 작아 다른 틱은 들어오지 않음).
//  - 등급: e = 사건 틱 시각 − 박 시각. |e| ≤ grade_ms[0] → 1, ≤ grade_ms[1] → 2, 그 밖(판정 창 안) → 3.
//  - 퍼센트: 같은 e(틱 기준)로 pctOf(). 10 % 계단, 등급과 어긋나지 않음(≥90 ⇔ 1, 60~80 ⇔ 2, 10~50 ⇔ 3).
//  - 콤보: 판정 1개 = +1 (3단도 +1). 사망하면 0. 연습 모드 부활도 0에서 시작.
//    짝이 안 된 채 지나간 탭은 콤보를 끊지 않는다(끊김은 사망뿐).
//  - 정확도: 클리어한 시도의 판정 % 단순 평균을 내림. 실패한 시도·연습 모드는 null(표시·기록 없음).

// 틱 기준 Δ(ms). 부동소수 오차로 경계(예: 정확히 100 ms)가 갈리지 않게 0.001 ms(judge_pct.delta_round_ms)로 반올림한다
export function deltaMs(k, hz, tS) { return Math.round((k / hz - tS) * 1e6) / 1e3; }

export function gradeOf(eMs, gradeMs) {
  const a = Math.abs(eMs);
  return a <= gradeMs[0] ? 1 : a <= gradeMs[1] ? 2 : 3;
}

// e_ms: 사건 틱 시각 − 박 시각(ms), tap: judge_taps 한 줄, combo: balance.combo
// 판정 창 밖이면 0(실패, 표시 없음). 그 밖은 10~100.
export function pctOf(eMs, tap, combo) {
  const P = combo.judge_pct;
  const d = Math.abs(eMs);
  const W = eMs < 0 ? tap.early_ms : tap.late_ms; // Δ 쪽 창 끝
  if (d > W + P.edge_tol_ms) return 0;
  const [b100, b90] = P.grade1_ms;            // [25, 50]
  const g = combo.grade_ms[1];                 // 좋아 경계 100
  if (d <= b100) return P.grade1_pcts[0];      // 100
  if (d <= b90) return P.grade1_pcts[1];       // 90
  if (d <= g) {
    const n = P.grade2_pcts.length, s = (g - b90) / n;
    for (let j = 0; j < n - 1; j++) if (d <= b90 + (j + 1) * s) return P.grade2_pcts[j];
    return P.grade2_pcts[n - 1];               // 80 / 70 / 60
  }
  const n = P.grade3_pcts.length, s = (W - g) / n;
  const k = Math.max(0, Math.min(n - 1, Math.ceil((d - g) / s) - 1));
  return P.grade3_pcts[k];                     // 50 / 40 / 30 / 20 / 10, 창 끝 = 10
}

export function gradeFromPct(pct, combo) {
  const m = combo.judge_pct.grade_min_pct;     // {"1": 90, "2": 60, "3": 10}
  return pct >= m['1'] ? 1 : pct >= m['2'] ? 2 : pct >= m['3'] ? 3 : 0;
}

// 정확도: 판정 % 배열 → 평균 내림(정수). 빈 배열이면 null
export function accuracyOf(pcts) {
  if (!pcts.length) return null;
  const sum = pcts.reduce((a, b) => a + b, 0);
  return Math.floor(sum / pcts.length);
}

// taps: level.judge_taps, combo: balance.combo, hz: balance.physics_hz
// opts.pct === false 이면 퍼센트 층을 끔(켠/끈 비교용). 생사·등급·콤보는 같아야 한다.
export function createComboJudge(taps, combo, hz, opts = {}) {
  const usePct = opts.pct !== false && combo.judge_pct?.enabled !== false;
  const tol = (combo.judge_pct?.edge_tol_ms ?? 0) / 1000;
  const lo = taps.map((t) => (t.t_s - t.early_ms / 1000 - tol) * hz); // 판정 창 시작 (틱, 실수)
  const hi = taps.map((t) => (t.t_s + t.late_ms / 1000 + tol) * hz);  // 판정 창 끝
  const J = {
    used: new Array(taps.length).fill(false),
    judgedPress: new Set(),
    combo: 0,
    best: 0,
    grades: [], // {i, k, e_ms, grade, pct}
    unmatched: [], // 짝 없는 점프(헛점프) {k, kind, t_s}. 디버그·검사용
    lastPct: null,   // 테스트 훅 lastPct: 가장 최근 판정 % (시도 시작·부활·사망 때 null)
    accuracy: null,  // 테스트 훅 accuracy: 이번 시도 정확도 (클리어한 일반 모드 시도만, 그 밖 null)
    practice: false,
    // 시도 시작(fromTick 0) 또는 연습 부활(fromTick = 체크포인트 틱)
    reset(fromTick = 0, practice = false) {
      J.combo = 0; J.grades = []; J.unmatched = []; J.judgedPress = new Set(); J.lastPct = null; J.accuracy = null;
      J.practice = practice || fromTick > 0;
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
      if (best < 0) { J.unmatched.push({ k, kind, t_s: +(k / hz).toFixed(4) }); return null; }
      J.used[best] = true; J.judgedPress.add(pressId);
      const e_ms = deltaMs(k, hz, taps[best].t_s); // 틱 기준 Δ: 등급과 %가 같은 값을 쓴다
      const r = { i: best, k, e_ms: +e_ms.toFixed(1), grade: gradeOf(e_ms, combo.grade_ms) };
      if (usePct) { r.pct = pctOf(e_ms, taps[best], combo); J.lastPct = r.pct; }
      J.grades.push(r);
      J.combo++; if (J.combo > J.best) J.best = J.combo;
      return r;
    },
    onDeath() { J.combo = 0; J.lastPct = null; J.accuracy = null; },
    // 클리어 틱에 호출. 일반 모드면 정확도를 정하고 돌려줌
    onClear() {
      J.accuracy = usePct && !J.practice ? accuracyOf(J.grades.map((g) => g.pct)) : null;
      return J.accuracy;
    },
  };
  J.reset(0);
  return J;
}

// 최고 정확도 기록 (테스트 훅 bestAccuracy): 레벨별 정수, 일반 모드 클리어 중 최댓값. 연습·실패는 바꾸지 않음
export function updateBest(bestAccuracy, accuracy) {
  if (accuracy == null) return bestAccuracy ?? null;
  return bestAccuracy == null ? accuracy : Math.max(bestAccuracy, accuracy);
}
