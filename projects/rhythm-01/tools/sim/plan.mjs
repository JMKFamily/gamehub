// rhythm-01 곡선 계획(레벨 4~10) → 검증용 레벨 객체 (20-balance.md 11장)
//
// balance.json curve_planned.<id>.plan 은 마디 토큰 배열이다.
//   "sX" = 보여 주기 마디(무늬 X), "pX" = 따라 치기 마디(무늬 X), "r" = 쉬는 마디
// 무늬 자리는 balance.json pattern_library 에서 가져온다. 이 객체는 levels/*.json 과 같은 스키마라
// compileLevel·judgeAttempt·봇·검증기를 그대로 쓴다. 레벨 데이터 확정본이 아니라 "곡선 계획의 검증용 초안"이다.

export function parsePlan(plan) {
  return plan.map((t) => (t === 'r' ? { mode: 'rest' } : { mode: t[0] === 's' ? 'show' : 'play', pattern: t.slice(1) }));
}

export function buildPlanLevel(id, c, bal) {
  const bars = parsePlan(c.plan);
  const used = [...new Set(bars.filter((b) => b.mode !== 'rest').map((b) => b.pattern))];
  const patterns = {};
  for (const p of used) {
    const lib = bal.pattern_library[p];
    if (!lib) throw new Error(`계획 ${id}: pattern_library 에 없는 무늬 ${p}`);
    patterns[p] = { ...lib };
  }
  // 연습 모드 체크포인트 = 쉬는 마디 시작 (단, 마지막 판정 별 뒤의 outro 쉬는 마디는 제외)
  let lastPlay = -1;
  bars.forEach((b, i) => { if (b.mode === 'play') lastPlay = i; });
  const sections = [];
  bars.forEach((b, i) => {
    if (b.mode === 'rest' && i < lastPlay && (i === 0 || bars[i - 1].mode !== 'rest')) sections.push({ name: 'breath', start_bar: i, checkpoint: true });
  });
  return {
    schema_version: 2,
    id,
    planned: true,
    theme_id: `level${id}`,
    name: c.name,
    bpm: c.bpm,
    beats_per_bar: 4,
    slot_unit: 'eighth',
    count_in_bars: 1,
    length_bars: bars.length,
    judge: { ...bal.judge_defaults, perfect_ms: 50, good_ms: c.good_ms, pass_early_ms: c.pass_early_ms, pass_late_ms: c.pass_late_ms },
    allowed_slots: 'all',
    known_patterns: c.known_patterns,
    new_gimmicks: c.new_gimmick ? [{ id: c.new_gimmick, first_bar: bars.findIndex((b) => b.mode === 'show') }] : [],
    card: c.card,
    patterns,
    sections,
    bars,
  };
}
