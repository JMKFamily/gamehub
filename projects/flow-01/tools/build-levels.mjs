#!/usr/bin/env node
// levels/*.json 만들기: levels-config.mjs 자리 설정 + tools/levels-picks.json 의 고른 후보 번호 → 생성기 재실행(결정적).
// 사용법: node tools/build-levels.mjs   (레벨 1~50: 1~10 = levels-picks.json, 11~50 = levels-ext.json)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOTS, SEED_BASE } from './levels-config.mjs';
import { generate, structureMetrics, GEN_VERSION, shortestTrap } from './gen/generate.mjs';
import { countSolutions } from './gen/solve.mjs';
import { makePuzzle, CORE_VERSION } from './core/board.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(HERE, '..');
const picks = JSON.parse(readFileSync(join(HERE, 'levels-picks.json'), 'utf8'));
const LV = join(PROJECT, 'levels');
mkdirSync(LV, { recursive: true });
for (const f of readdirSync(LV)) if (/^\d\d-.*\.json$/.test(f)) unlinkSync(join(LV, f));

for (const slot of SLOTS) {
  const pick = slot.seed != null ? { index: null } : picks.slots[slot.id];
  const seed = slot.seed != null ? slot.seed : SEED_BASE(slot.id) + pick.index; // 11~50: levels-ext.json 시드(판 가족 후보 풀)
  const n = Number(slot.id), chapter = slot.chapter || Math.ceil(n / 10), chapter_pos = slot.chapter_pos || ((n - 1) % 10) + 1;
  const g = generate(slot, seed);
  if (!g) throw new Error(`slot ${slot.id}: 생성 실패`);
  const L = g.level;
  const pz = makePuzzle(L);
  const sol = countSolutions(pz, { limit: 2 });
  if (sol.count !== 1) throw new Error(`slot ${slot.id}: 유일하지 않음`);
  let tutorial = null;
  if (slot.id === '01') {
    // 손가락 시연: 답 길이가 가장 짧은 쌍(같으면 꺾임 적은 쌍)을 점 a → 짝 점 b 로 답 길을 따라감
    const bends = (p) => { let b = 0; for (let i = 1; i < p.length - 1; i++) { const d1 = [p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]], d2 = [p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]]; if (d1[0] !== d2[0] || d1[1] !== d2[1]) b++; } return b; };
    const s = L.solution.slice().sort((x, y) => x.path.length - y.path.length || bends(x.path) - bends(y.path))[0];
    tutorial = { kind: 'finger_demo', text_key: 'tut_drag', demo_pair: s.id, demo_drag: s.path, repeat_until: 'first_press', note: '손가락이 점 위에서 눌렀다가 답 길을 따라 짝 점까지 끌고 뗌. 유령 선(옅은 그림)만 그리고 판 상태는 바꾸지 않음. 시간 값은 balance.json tutorial(30-art 6절과 같은 값)' };
  }
  let fill_card = null;
  if (slot.new_element === 'fill_all_cells') {
    const t = shortestTrap(L);
    fill_card = { text_key: 'card_fill', svg: 'tutorial/card-fill.svg', empty_cells: t.firstEmptyCells, note: '곧은 길로 모두 이으면 남는 빈칸(아이 봇 함정 순간의 빈칸과 같음). card_fill 그림의 빈칸 자리' };
  }
  // G1(1-2 2차): 카드 구멍 = 판 안쪽(둘레 줄·열에 닿지 않는) 구멍 중 첫째. 안쪽 구멍이 없으면 holes[0](art 둘레 구멍 규칙)
  const inner = ([x, y]) => x > 0 && y > 0 && x < L.width - 1 && y < L.height - 1;
  const hole_card = slot.new_element === 'holes' ? { text_key: 'card_hole', svg: 'tutorial/card-hole.svg', first_hole: L.holes.find(inner) || L.holes[0], note: 'card_hole 그림의 구멍 = 이 판의 실제 구멍(판 안쪽). 다른 구멍이 둘레에 닿으면 art 외곽선 파내기 규칙으로 그림' } : null;
  const level = {
    schema_version: 1,
    id: slot.id,
    order: n,
    chapter, chapter_pos, chapter_key: `chapter${chapter}_name`,
    name_key: `level${n}_name`,
    width: L.width, height: L.height, holes: L.holes,
    pairs: L.pairs, solution: L.solution,
    new_element: slot.new_element, new_element_ko: slot.new_element_ko,
    tutorial,
    fill_card,
    hole_card,
    structure: { ...structureMetrics(L), shortest_trap_combos: shortestTrap(L).trapCombos, solver_nodes: sol.nodes },
    generator: { version: GEN_VERSION, core_version: CORE_VERSION, seed, candidate_index: pick.index, family: slot.family || slot.id, attempts: g.attempts, params: { width: slot.width, height: slot.height, pairs: slot.pairs, holes: slot.holes, minLen: 3, allowSelfAdjacent: !!slot.allowSelfAdjacent }, independent_note: '원작 판을 보지 않고 시드 생성. 같은 시드·생성기 버전이면 같은 판' },
  };
  const file = `${slot.id}-level${Number(slot.id)}.json`;
  writeFileSync(join(LV, file), JSON.stringify(level, null, 1) + '\n');
  console.log(`${file}: ${L.width}x${L.height} 쌍 ${L.pairs.length} 구멍 ${L.holes.length} 시드 ${seed}`);
}

// ---------------------------------------------------------------- round-3 어려운 5단계(levels-hard/H<단계>-<번호>.json)
{
  const { HARD_STAGES, HARD_SLOTS_PENDING } = await import('./levels-config.mjs');
  const { generateBig, GEN_BIG_VERSION } = await import('./gen/generate-big.mjs');
  const { countSolutionsEdge } = await import('./gen/solve-edge.mjs');
  const HD = join(PROJECT, 'levels-hard');
  mkdirSync(HD, { recursive: true });
  for (const f of readdirSync(HD)) if (/^H\d-\d\d\.json$/.test(f)) unlinkSync(join(HD, f));
  for (const s of HARD_SLOTS_PENDING()) {
    const cfg = HARD_STAGES[s.stage - 1];
    const g = generateBig(cfg, s.seed);
    if (!g) throw new Error(`${s.id}: 생성 실패`);
    const L = g.level;
    if (countSolutionsEdge(L, { limit: 2 }).count !== 1) throw new Error(`${s.id}: 유일하지 않음`);
    const level = {
      schema_version: 1, id: s.id, stage: s.stage, stage_pos: s.stage_pos, stage_key: `hard${s.stage}_name`,
      width: L.width, height: L.height, holes: L.holes, pairs: L.pairs, solution: L.solution,
      new_element: 'none',
      structure: structureMetrics(L),
      generator: { version: GEN_BIG_VERSION, core_version: CORE_VERSION, seed: s.seed, attempts: g.attempts, params: cfg, independent_note: '원작 판을 보지 않고 시드 생성(gen-2). 같은 시드·생성기 버전이면 같은 판' },
    };
    writeFileSync(join(HD, `${s.id}.json`), JSON.stringify(level, null, 1) + '\n');
    console.log(`${s.id}.json: ${L.width}x${L.height} 쌍 ${L.pairs.length} 시드 ${s.seed}`);
  }
}
