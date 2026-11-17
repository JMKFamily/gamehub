// 판정 이름·정확도 % (요청자 지시 2026-11-17 "판정 이름과 퍼센트까지 해주세요")
// 이름 = strings judge_perfect·judge_good·judge_pass (10-lore R3-12), % 식 = balance.json accuracy (rule step_10, 20-balance 17-14),
// 자리·크기·시간 = layout.json judge_label·result (30-art 16-13), 색 = palette.json judge_label_r3.
// 아래 세 함수는 기준 구현 tools/sim/bots.mjs accuracyPct·gradeFromPct·levelAccuracy 와 같은 식(인자 순서까지 같게 옮김, QA 대조).
// 판정·클리어·실패·콤보·30회 한도에는 쓰이지 않음 (이미 나온 판정의 e 로 계산만 하는 표시 층).

// 판정 별 하나의 % (d = |e|, 경계값은 안쪽 칸). 창 밖 = null
export function accuracyPct(e, judge, acc) {
  const d = Math.abs(e);
  const W = e < 0 ? judge.pass_early_ms : judge.pass_late_ms;
  if (d > W) return null;
  if (d <= acc.perfect_inner_ms) return acc.perfect_inner_pct;
  const P = judge.perfect_ms, G = judge.good_ms;
  if (d <= P) return acc.perfect_outer_pct;
  if (d <= G) {
    const k = Math.min(acc.good_bins, Math.max(1, Math.ceil((acc.good_bins * (d - P)) / (G - P))));
    return acc.good_pcts[k - 1];
  }
  const k = Math.min(acc.pass_bins, Math.max(1, Math.ceil((acc.pass_bins * (d - G)) / (W - G))));
  return acc.pass_pcts[k - 1];
}
// % → 등급 (≥ 90 딱, 60~80 좋아, 10~50 통과)
export function gradeFromPct(pct, acc) {
  if (pct == null) return null;
  for (const [g, [lo, hi]] of Object.entries(acc.grade_from_pct)) if (pct >= lo && pct <= hi) return g;
  return null;
}
// 레벨 정확도: 클리어한 시도만 floor(평균 %). 실패 = null (연습 모드는 부르는 쪽에서 내지 않음)
export function levelAccuracy(L, result, acc) {
  if (!result.clear || !result.grades.length) return null;
  let s = 0;
  for (const g of result.grades) s += accuracyPct(g.e, L.judge, acc);
  return Math.floor(s / result.grades.length);
}

// 데이터 확인 (insights QA·측정: 창 값이 숫자가 아니면 "창 밖" 비교가 늘 false 가 되어 검사가 그냥 통과함 → 시작 때 멈춤)
export function checkAccuracyData(bal, Ls) {
  const a = bal.accuracy;
  const num = (v, what) => { if (!Number.isFinite(v)) throw new Error(`accuracy 데이터 ${what} = ${v} (숫자가 아님)`); };
  if (!a || a.rule !== 'step_10') throw new Error(`balance.json accuracy.rule ${a && a.rule} (step_10 이어야 함)`);
  for (const k of ['perfect_inner_ms', 'perfect_inner_pct', 'perfect_outer_pct', 'good_bins', 'pass_bins']) num(a[k], k);
  if (a.good_pcts.length !== a.good_bins || a.pass_pcts.length !== a.pass_bins) throw new Error('accuracy good_pcts/pass_pcts 칸 수');
  [...a.good_pcts, ...a.pass_pcts].forEach((v, i) => num(v, `pcts[${i}]`));
  for (const L of Ls) for (const k of ['perfect_ms', 'good_ms', 'pass_early_ms', 'pass_late_ms']) num(L.judge[k], `레벨 ${L.level.id} judge.${k}`);
}
