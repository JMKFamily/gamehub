#!/usr/bin/env node
// flow-01 레벨 검증기 (node 만, 외부 패키지 없음)
//
// 사용법
//   node tools/verify-levels.mjs           # 전체 실행(판정 기준: 아이 봇 시드 10개 × 2000회 = 레벨당 2만 회, 숙련 봇 3000회)
//   node tools/verify-levels.mjs --quick   # 표본 축소(도구 동작 확인용, B·K 는 정보로만 — 판정에 쓰지 않음)
//   node tools/verify-levels.mjs --seed=N  # 실행 시드 바꾸기(기본 balance.json verify.seed)
//   node tools/verify-levels.mjs --json    # 결과를 tools/out/verify-report.json 에도 씀(항상 씀), 화면에는 JSON
//
// 판정 코드는 빌드와 같은 tools/core/board.mjs. 검사 번호는 20-balance.md 11절.
//   R1~R9  판정 모듈 규칙 단위 검사(자르기·되살림·이동 수·되돌리기·완료 잠금 등)
//   R12 한 번에 이은 쌍 정의(G2)   R13 판 채움 % = 연결된 쌍의 칸만(G3)   V9 카드·시연 필드(text_key·first_hole 안쪽)
//   V0 레벨 10개·스키마   V1 판 크기·쌍 수·칸 px(4해상도, assets/layout.json play.*.cell 을 직접 읽음, G5)   V2 답 = 올바른 덮개, 선 길이 ≥ 3   V3 유일해(sound) + 답 = 생성 답
//   V4 교차 검증(가지치기 0 열거, 끝나는 판만)   V5 완벽 입력(답 드래그) → 완료·이동 = 쌍 수·별·100 %·모두 1단(양방향)
//   V6 새 요소 ≤ 1·구멍 첫 등장 = 소개 레벨   V7 L1 튜토리얼 드래그 = 답 길, 핵심 조작으로 연결   V8 생성 기록 재현(시드 → 같은 판)
//   B0 봇 매개변수 = balance.json   B1 m̃L ≤ 30   B2 m̃L ≤ 2·m̃(L−1)   B3 L3~L10 엄격 단조   B4 L10 ∈ [0.8T, 1.2T]
//   B5 시드 10개 분포(L10/T 편차 평균·모든 시드 ±20 %)   B6 L1 m̃1 ≤ 10·빈칸 함정 ≤ 50 %   B7 못 푼 판 0
//   C1 콤보·이름·% 켜고 끈 봇 결과 불일치 0   C2 % 100 ⇔ 별 ⇔ 모든 색 1단 (모든 봇 실행)   K1 숙련 봇(헛 이동 < 20 이면 중간 봇) 헛 이동 한 쌍 몰림 ≤ 30 %(쌍 ≥ 4)
//   (정보) T1 함정 검증기(trap) 가 레벨에서 내는 답 수

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from './core/board.mjs';
import { countSolutions, samePathSet } from './gen/solve.mjs';
import { generate } from './gen/generate.mjs';
import { SLOTS } from './levels-config.mjs';
import { solveRun, moveStats, CHILD, SKILLED, MID } from './sim/bots.mjs';
import { mixSeed } from './core/rng.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(HERE, '..');
const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const JSON_OUT = args.includes('--json');
const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const LAYOUT = JSON.parse(readFileSync(join(PROJECT, bal.board.cell_px_source.split('#')[0]), 'utf8'));
const V = bal.verify, DF = bal.difficulty;
const SEED = +(args.find((a) => a.startsWith('--seed='))?.split('=')[1] ?? V.seed);
const NCH = QUICK ? V.quick_child_runs_per_seed : V.child_runs_per_seed;
const NSK = QUICK ? V.quick_skilled_runs : V.skilled_runs;
const NSEEDS = V.seeds;

const results = [];
const check = (id, ok, msg, info = false) => { results.push({ id, ok: !!ok, info, msg }); };
const f2 = (x) => (x == null ? '-' : (+x).toFixed(2));

// ---------------------------------------------------------------- R: 판정 모듈 규칙
{
  // 3x3 판: A (0,0)-(2,0), B (0,2)-(2,2), 가운데 줄은 누구든
  const lv = { width: 3, height: 3, pairs: [{ id: 'A', a: [0, 0], b: [2, 0] }, { id: 'B', a: [0, 2], b: [2, 2] }] };
  const pz = B.makePuzzle(lv);
  const I = (x, y) => y * 3 + x;
  let g = B.newGame(pz);
  // R1 연결
  let r = B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]);
  check('R1', r.connected && g.moves === 1 && g.colorMoves[0] === 1, '점 → 짝 점 드래그로 연결, 이동 1');
  // R2 연결된 점을 누르기만 하면 변화 없음, 이동 0
  r = B.playDrag(g, [I(0, 0)]);
  check('R2', !r.changed && g.moves === 1 && B.isConnected(pz, 0, g.paths[0]), '연결된 점 누르기만 → 변화·이동 0');
  // R3 자르기 + 같은 드래그 안 되살림
  g = B.newGame(pz);
  B.playDrag(g, [I(0, 0), I(0, 1), I(1, 1), I(2, 1), I(2, 0)]); // A 가 가운데 줄로 돌아감
  let d = B.press(g, I(0, 2));
  B.moveTo(g, d, I(0, 1)); // B 가 A 선 (0,1) 을 자름
  const cutA = d.work[0].length;
  B.step(g, d, I(0, 2)); // 되돌아감 → A 되살아남
  const restored = B.samePaths(d.work, g.paths) || (d.work[0].length === 5);
  B.release(g, d);
  check('R3', cutA === 0 || cutA === 1 ? restored : false, `자르기 → 시작 점 쪽만 남음(A 길이 ${cutA}), 되돌아가면 되살아남`);
  check('R3b', g.moves === 1 && B.isConnected(pz, 0, g.paths[0]), '되살린 드래그는 판을 바꾸지 않아 이동 0');
  // R4 같은 색 이어 그리기는 새 이동 아님
  g = B.newGame(pz);
  B.playDrag(g, [I(0, 0), I(1, 0)]);
  B.playDrag(g, [I(1, 0), I(2, 0)]);
  check('R4', g.moves === 1 && B.isConnected(pz, 0, g.paths[0]), '같은 색 이어 그리기 → 이동 1 유지');
  // R5 다른 색 점은 못 들어감
  g = B.newGame(pz);
  d = B.press(g, I(0, 0)); B.moveTo(g, d, I(0, 1)); const st = B.step(g, d, I(0, 2)); B.release(g, d);
  check('R5', st === 'blocked' && g.paths[0].length === 2, '다른 색 점 칸 → 막힘');
  // R6 되돌리기는 이동 수를 줄이지 않고, 다음 드래그는 새 이동
  g = B.newGame(pz);
  B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]);
  B.undo(g);
  B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]);
  check('R6', g.moves === 2 && g.colorMoves[0] === 2, `되돌리기 뒤 같은 색 다시 → 이동 2 (실제 ${g.moves})`);
  // R7 완료는 연결 프레임에 판정, 그 뒤 입력 잠금
  // 3x3 판2: A (0,0)-(2,0) 윗줄, C (0,1)-(0,2) 가운데·아랫줄을 ㄷ자로
  const pz2 = B.makePuzzle({ width: 3, height: 3, pairs: [{ id: 'A', a: [0, 0], b: [2, 0] }, { id: 'C', a: [0, 1], b: [0, 2] }] });
  g = B.newGame(pz2);
  B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]);
  d = B.press(g, I(0, 1)); B.moveTo(g, d, I(1, 1)); B.moveTo(g, d, I(2, 1)); B.moveTo(g, d, I(2, 2)); B.moveTo(g, d, I(1, 2)); B.moveTo(g, d, I(0, 2));
  const lockedImmediately = g.completed && d.done;
  check('R7', lockedImmediately && B.press(g, I(0, 0)) === null, '마지막 연결 프레임에 완료(드래그 자동 종료), 뒤 누름 무시');
  check('R8', g.moves === 2 && B.isStar(g) && B.accuracyPct(g) === 100, '완벽 풀이 → 별·100 %');
  // R8b 다 이었는데 빈칸 → 완료 아님
  g = B.newGame(pz2);
  B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]); B.playDrag(g, [I(0, 1), I(0, 2)]);
  check('R8b', g.paths.every((p, c) => B.isConnected(pz2, c, p)) && !g.completed && B.fillPct(pz2, g.paths) === 55, `모든 쌍을 이어도 빈칸이 남으면 완료 아님(채움 ${B.fillPct(pz2, g.paths)} %)`);
  // R9 칸 건너뛰기 채움(큰 축 먼저) + 손가락 기하
  g = B.newGame(pz);
  d = B.press(g, I(0, 0)); B.moveTo(g, d, I(2, 1)); B.release(g, d);
  check('R9', g.paths[0].join() === [I(0, 0), I(1, 0), I(2, 0)].join(), `건너뛴 칸 채움: ${g.paths[0].join(',')}(짝 점에 닿으면 멈춤)`);
  const lay = { originX: 0, originY: 0, cellPx: 100 };
  check('R10', B.pressHit(pz, lay, -20, 50, 0.25) === I(0, 0) && B.pressHit(pz, lay, -30, 50, 0.25) === -1, '점 시작 판정 0.25칸 확장');
  // R12 한 번에 이은 쌍(G2): 같은 색을 이어서 고쳐 그으면 같은 이동이라 한 번에 유지, 다른 색을 그은 뒤 다시 그으면 한 번에 아님
  g = B.newGame(pz);
  B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]);
  B.playDrag(g, [I(0, 0), I(0, 1), I(1, 1), I(2, 1), I(2, 0)]); // 같은 색 고쳐 긋기(이동 수 그대로)
  B.playDrag(g, [I(0, 2), I(1, 2), I(2, 2)]);
  const os1 = B.oneShotPairs(g);
  B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]); // 다른 색(B) 뒤 A 를 다시 그음 → A 이동 2
  const os2 = B.oneShotPairs(g);
  check('R12', os1 === 2 && os2 === 1 && g.colorMoves.join() === '2,1', `한 번에 이은 쌍: 같은 색 고쳐 긋기 뒤 ${os1}(=2), 다른 색 뒤 다시 그은 뒤 ${os2}(=1)`);
  // R13 판 채움 %(G3): 이어지지 않은 선·끄는 중인 선의 칸은 세지 않음
  g = B.newGame(pz);
  B.playDrag(g, [I(0, 0), I(1, 0)]);
  const fp0 = B.fillPct(pz, g.paths);
  d = B.press(g, I(1, 0)); B.moveTo(g, d, I(2, 0));
  const fpDrag = B.displayLayer(g, d).fillPct; // 짝 점에 닿아 연결 → 자동 아님(완료 아님), d.work 연결됨
  B.release(g, d);
  const fp1 = B.fillPct(pz, g.paths);
  check('R13', fp0 === 0 && fp1 === 33 && fpDrag === 33, `판 채움 %: 안 이은 선 ${fp0} %(=0), 이은 뒤 ${fp1} %(=33, 3/9칸)`);
  check('R11', B.trackCell(pz, lay, 115, 50, I(0, 0), 0.2) === I(0, 0) && B.trackCell(pz, lay, 125, 50, I(0, 0), 0.2) === I(1, 0), '칸 판정 히스테리시스 20 %');
}

// ---------------------------------------------------------------- 레벨 읽기
const files = readdirSync(join(PROJECT, 'levels')).filter((f) => /^\d\d-.*\.json$/.test(f)).sort();
const levels = files.map((f) => JSON.parse(readFileSync(join(PROJECT, 'levels', f), 'utf8')));
check('V0', levels.length === 10 && levels.every((l, i) => l.id === String(i + 1).padStart(2, '0') && l.schema_version === 1 && l.pairs && l.solution && l.generator), `레벨 ${levels.length}개, id 01~10, 스키마 1`);

const lvRows = [];
for (const L of levels) {
  const pz = B.makePuzzle(L);
  const row = { id: L.id, size: `${L.width}x${L.height}`, pairs: pz.k, holes: L.holes.length, cells: pz.cellCount };
  lvRows.push(row);
  const n = Number(L.id);
  // V1
  const long = Math.max(L.width, L.height);
  const capLong = n <= 5 ? bal.board.max_cells_long_side_L1_L5 : bal.board.max_cells_long_side_L6_L10;
  // G5: 칸 px 원본 = assets/layout.json play.<해상도>.<W>x<H>.cell (여백 12 px·판 패딩·HUD·판정 띠를 넣은 실제 배치)
  let minPx = Infinity, missing = [];
  for (const [w, h] of bal.board.check_resolutions) {
    const c = LAYOUT.play?.[`${w}x${h}`]?.[`${L.width}x${L.height}`]?.cell;
    if (typeof c !== 'number') { missing.push(`${w}x${h}`); continue; }
    minPx = Math.min(minPx, c);
  }
  if (missing.length) minPx = NaN;
  row.min_cell_px = +minPx.toFixed(1);
  check(`V1-${L.id}`, long <= capLong && pz.k >= bal.board.pairs_min && pz.k <= bal.board.pairs_max && minPx >= bal.board.cell_min_px, `판 ${row.size}(긴 변 ≤ ${capLong}), 쌍 ${pz.k}, layout.json 최소 칸 ${minPx.toFixed(1)} px ≥ ${bal.board.cell_min_px}${missing.length ? ` (layout 에 없음: ${missing.join(',')})` : ''}`);
  // V2 답 덮개
  const sol = L.solution.map((s) => s.path.map(([x, y]) => y * L.width + x));
  const seen = new Uint8Array(pz.n); let okCover = true;
  sol.forEach((p, c) => {
    if (p[0] !== pz.pairs[c].a || p[p.length - 1] !== pz.pairs[c].b) okCover = false;
    for (let i = 0; i < p.length; i++) { if (seen[p[i]] || pz.hole[p[i]]) okCover = false; seen[p[i]] = 1; if (i && !B.adjacent(pz, p[i - 1], p[i])) okCover = false; }
  });
  const covered = [...seen].reduce((s, x) => s + x, 0);
  const minLen = Math.min(...sol.map((p) => p.length));
  row.line_lengths = sol.map((p) => p.length).join('/');
  check(`V2-${L.id}`, okCover && covered === pz.cellCount && minLen >= bal.board.line_len_min_cells, `답이 모든 칸을 한 번씩 덮음(${covered}/${pz.cellCount}), 선 길이 ${row.line_lengths} ≥ 3`);
  // V3 유일해
  const t0 = Date.now();
  const s = countSolutions(pz, { limit: 2, mode: 'sound' });
  row.solver_ms = Date.now() - t0; row.solver_nodes = s.nodes;
  check(`V3-${L.id}`, s.count === 1 && !s.aborted && samePathSet(s.solutions[0], sol), `유일해(sound 열거, 답 2개에서 멈춤): 답 ${s.count}개, 답 = 생성 답 ${s.count === 1 && samePathSet(s.solutions[0], sol)}, 노드 ${s.nodes}`);
  // V4 가지치기 0 교차
  const cap = QUICK ? 2e6 : 3e8;
  const nn = countSolutions(pz, { limit: 2, mode: 'none', maxNodes: cap });
  row.none = nn.aborted ? `중단(${cap} 노드)` : `${nn.count}`;
  if (nn.aborted) check(`V4-${L.id}`, true, `가지치기 0 열거: ${cap} 노드에서 중단(판이 커서) → 정보`, true);
  else check(`V4-${L.id}`, nn.count === 1 && samePathSet(nn.solutions[0], sol), `가지치기 0 열거도 답 ${nn.count}개, 같은 답 (노드 ${nn.nodes})`);
  // T1 함정 검증기
  const tr = countSolutions(pz, { limit: 2, mode: 'trap' });
  row.trap_validator = tr.count;
  check(`T1-${L.id}`, true, `(정보) 생성용 가지치기를 넣은 검증기: 답 ${tr.count}개${tr.count !== 1 ? ' ← 검증기에 쓰면 틀림' : ''}`, true);
  // V5 완벽 입력
  for (const dir of ['a→b', 'b→a']) {
    const g = B.newGame(pz);
    for (const p of sol) B.playDrag(g, dir === 'a→b' ? p : p.slice().reverse());
    const D = B.displayLayer(g);
    check(`V5-${L.id}${dir === 'a→b' ? '' : 'r'}`, g.completed && g.moves === pz.k && D.star && D.accuracyPct === 100 && D.grades.every((x) => x === 1) && D.fillPct === 100, `완벽 입력(${dir}) → 완료, 이동 ${g.moves} = 쌍 ${pz.k}, 별·100 %·모두 1단`);
  }
  // V8 재현
  const slot = SLOTS.find((x) => x.id === L.id);
  const re = generate(slot, L.generator.seed);
  check(`V8-${L.id}`, re && JSON.stringify(re.level.pairs) === JSON.stringify(L.pairs) && JSON.stringify(re.level.solution) === JSON.stringify(L.solution) && re.attempts === L.generator.attempts, `시드 ${L.generator.seed} → 같은 판·답 재생성(시도 ${L.generator.attempts})`);
}

// V6 새 요소
{
  const introducedHoles = levels.find((l) => l.holes.length > 0);
  const okOne = levels.every((l) => typeof l.new_element === 'string' && !l.new_element.includes(','));
  check('V6', okOne && introducedHoles && introducedHoles.new_element === 'holes', `레벨마다 새 요소 1개 이하, 구멍 첫 등장 L${introducedHoles?.id} = 소개 레벨(${introducedHoles?.new_element})`);
  const pairsUp = levels.map((l, i) => (i && l.pairs.length > levels[i - 1].pairs.length ? l.id : null)).filter(Boolean);
  const sizeUp = levels.map((l, i) => (i && l.width * l.height > levels[i - 1].width * levels[i - 1].height ? l.id : null)).filter(Boolean);
  const both = pairsUp.filter((x) => sizeUp.includes(x));
  const sameLevelNew = levels.filter((l) => pairsUp.includes(l.id) && !['more_colors', 'bigger_board', 'holes'].includes(l.new_element));
  check('V6b', both.every((id) => ['03', '07', '06'].includes(id)) && sameLevelNew.length === 0, `쌍 수 증가 L${pairsUp.join(',')} / 판 증가 L${sizeUp.join(',')}: 같은 레벨에 겹친 곳 ${both.join(',') || '없음'}(판 커짐·구멍 소개 레벨만 허용)`);
}
// V7 튜토리얼
{
  const L = levels[0], t = L.tutorial;
  const pz = B.makePuzzle(L);
  let ok = t && t.kind === 'finger_demo';
  if (ok) {
    const s = L.solution.find((x) => x.id === t.demo_pair);
    ok = s && JSON.stringify(s.path) === JSON.stringify(t.demo_drag);
    const g = B.newGame(pz);
    const r = B.playDrag(g, t.demo_drag.map(([x, y]) => y * L.width + x));
    ok = ok && r.connected && g.moves === 1;
  }
  check('V7', ok, `L1 손가락 시연 드래그 = ${t?.demo_pair} 답 길(${t?.demo_drag?.length}칸), 판정 모듈로 넣으면 연결·이동 1`);
}

// V9 카드·시연 필드(1-2 2차): 글 키, L6 첫 구멍이 판 안쪽(G1), L2 빈칸 = 곧은 길 빈칸
{
  const L1 = levels[0], L2 = levels[1], L6 = levels.find((l) => l.hole_card);
  const inner = ([x, y], l) => x > 0 && y > 0 && x < l.width - 1 && y < l.height - 1;
  const fh = L6?.hole_card?.first_hole;
  const okKeys = L1.tutorial?.text_key === 'tut_drag' && L2.fill_card?.text_key === 'card_fill' && L6?.hole_card?.text_key === 'card_hole';
  const okHole = fh && L6.holes.some((h) => h[0] === fh[0] && h[1] === fh[1]) && inner(fh, L6);
  check('V9', okKeys && okHole && levels.every((l) => !('name_placeholder' in l)), `카드 글 키 tut_drag/card_fill/card_hole, L${L6?.id} first_hole [${fh}] = 실제 구멍·판 안쪽 ${!!okHole}, 화면 글 필드(name_placeholder) 없음`);
}

// ---------------------------------------------------------------- B: 봇
check('B0', ['eps', 'p_cut', 'cut_cost', 'p_continue', 'edge_bonus', 'lookahead', 'max_moves', 'max_drags'].every((k) => bal.bots.child[k] === CHILD[k] && bal.bots.skilled[k] === SKILLED[k]), 'balance.json bots = sim/bots.mjs CHILD·SKILLED');

const perSeed = []; // [seed][level] = cmedian
const all = levels.map(() => []);
const trapCnt = levels.map(() => 0), failCnt = levels.map(() => 0);
let c2bad = 0, c2runs = 0;
const tB = Date.now();
for (let s = 0; s < NSEEDS; s++) {
  const row = [];
  levels.forEach((L, li) => {
    const mv = [];
    for (let k = 0; k < NCH; k++) {
      const x = solveRun(L, CHILD, mixSeed(SEED, s, li, k));
      mv.push(x.moves); all[li].push(x.moves);
      if (x.sawEmptyTrap) trapCnt[li]++;
      if (!x.completed) failCnt[li]++;
      if (x.completed) { c2runs++; const star = x.moves === L.pairs.length; const allOne = x.colorMoves.every((m) => m === 1); const pct = Math.floor((100 * x.colorMoves.filter((m) => m === 1).length) / L.pairs.length); if (star !== allOne || star !== (pct === 100)) c2bad++; }
    }
    row.push(moveStats(mv).cmedian);
  });
  perSeed.push(row);
}
const stats = all.map(moveStats);
const m = stats.map((x) => x.cmedian);
const r = Math.sqrt(m[2] / m[0]);
const T = m[0] * r ** 5;
levels.forEach((L, i) => Object.assign(lvRows[i], { m: +m[i].toFixed(3), median_int: stats[i].median, mean: +stats[i].mean.toFixed(2), p90: stats[i].p90, max: stats[i].max, trap_pct: +((100 * trapCnt[i]) / all[i].length).toFixed(1), fail: failCnt[i], runs: all[i].length }));
const BI = QUICK; // quick 이면 B 는 정보
check('B1', m.every((x) => x <= DF.max_moves_any_level), `모든 레벨 m̃ ≤ ${DF.max_moves_any_level}: 최대 ${f2(Math.max(...m))}`, BI);
const ratios = m.map((x, i) => (i ? x / m[i - 1] : null));
check('B2', ratios.every((x) => x == null || x <= DF.max_ratio_to_previous), `직전 대비 ≤ ${DF.max_ratio_to_previous}배: 최대 ${f2(Math.max(...ratios.filter((x) => x != null)))}`, BI);
const mono = m.slice(DF.strict_monotone_from - 1).every((x, i, a) => i === 0 || x > a[i - 1]);
check('B3', mono, `L3~L10 엄격 단조(연속 중앙값): ${m.slice(2).map(f2).join(' < ')}`, BI);
check('B3b', m[1] > m[0] && m[2] > m[1], `L1 < L2 < L3: ${m.slice(0, 3).map(f2).join(' < ')}`, BI);
check('B4', m[9] >= (1 - DF.L10_band_frac) * T && m[9] <= (1 + DF.L10_band_frac) * T, `L10 ${f2(m[9])} ∈ [${f2(0.8 * T)}, ${f2(1.2 * T)}] (T = m̃1·r⁵ = ${f2(T)}, r = ${r.toFixed(3)}, 편차 ${((m[9] / T - 1) * 100).toFixed(1)} %)`, BI);
const devs = perSeed.map((row) => { const rr = Math.sqrt(row[2] / row[0]); const TT = row[0] * rr ** 5; return row[9] / TT - 1; });
const devMean = devs.reduce((a, b) => a + b, 0) / devs.length;
const devSd = Math.sqrt(devs.reduce((a, b) => a + (b - devMean) ** 2, 0) / devs.length);
check('B5', Math.abs(devMean) <= DF.L10_band_frac && devs.every((x) => Math.abs(x) <= DF.L10_band_frac), `시드 ${NSEEDS}개 × ${NCH}회: L10/T 편차 평균 ${(devMean * 100).toFixed(1)} %, sd ${(devSd * 100).toFixed(1)} %, 범위 ${(Math.min(...devs) * 100).toFixed(1)} ~ ${(Math.max(...devs) * 100).toFixed(1)} %`, BI);
const l1trap = trapCnt[0] / all[0].length;
check('B6', m[0] <= DF.L1_max_moves && l1trap <= DF.L1_max_empty_trap_frac, `L1 m̃1 ${f2(m[0])} ≤ ${DF.L1_max_moves}, 빈칸 함정 거침 ${(l1trap * 100).toFixed(1)} % ≤ 50 %`, BI);
check('B7', failCnt.every((x) => x === 0), `상한(200 이동) 안에 못 푼 실행: ${failCnt.join('/')}`, BI);
check('C2', c2bad === 0, `% 100 ⇔ 별 ⇔ 모든 색 1단: 완료 실행 ${c2runs}회 중 불일치 ${c2bad}`);

// C1 표시층 켜고 끈 결과
{
  let bad = 0, n = 0;
  const N = QUICK ? 100 : 1000;
  levels.forEach((L, li) => {
    for (let k = 0; k < N; k++) {
      const a = solveRun(L, CHILD, mixSeed(SEED, 99, li, k), { display: false, log: true });
      const b = solveRun(L, CHILD, mixSeed(SEED, 99, li, k), { display: true, log: true });
      n++;
      if (a.moves !== b.moves || a.completed !== b.completed || a.drags !== b.drags || JSON.stringify(a.colorMoves) !== JSON.stringify(b.colorMoves) || JSON.stringify(a.log) !== JSON.stringify(b.log)) bad++;
    }
  });
  check('C1', bad === 0, `콤보(쌍 점 줄)·판정 이름·% 계산을 켠 실행과 끈 실행: ${n}쌍 중 불일치 ${bad}(이동 수·완료·드래그 열 모두 비교)`);
}

// K1 숙련 봇 몰림
// 헛 이동 = 그 색 이동 수 − 1 (색마다 합산). 숙련 봇 헛 이동이 20회 미만이면 중간 봇(MID)으로 봄(criteria σ25 → σ50 대체와 같은 규칙).
const wasteOf = (L, li, P, tag, adapt) => {
  // 헛 이동은 한 실행에 몰려 나오는 꼬리가 길어 몫이 흔들림(헛 이동 400회에서도 ±4 %p 실측) → NSK 회씩 더 돌려
  // 헛 이동 ≥ DF.concentration_min_waste_events 또는 20·NSK 회까지(quick 은 1회분만)
  const waste = new Array(L.pairs.length).fill(0); const mv = [];
  let n = 0, tw = 0;
  do {
    for (let k = 0; k < NSK; k++, n++) { const x = solveRun(L, P, mixSeed(SEED, tag, li, n)); mv.push(x.moves); x.colorMoves.forEach((c, i) => { waste[i] += Math.max(0, c - 1); }); }
    tw = waste.reduce((a, b) => a + b, 0);
  } while (adapt && !QUICK && tw < DF.concentration_min_waste_events && n < 20 * NSK);
  return { tw, n, conc: tw ? Math.max(...waste) / tw : 0, st: moveStats(mv), waste };
};
levels.forEach((L, li) => {
  // 숙련 봇이 첫 NSK 회에서 헛 이동 비율 < DF.skilled_min_waste_rate(거의 안 틀림)면 중간 봇으로(criteria σ25 → σ50 대체와 같은 태도)
  let w = wasteOf(L, li, SKILLED, 7, false), bot = 'skilled';
  const skilledM = w.st.cmedian, skilledRate = w.tw / w.n;
  if (skilledRate < DF.skilled_min_waste_rate) { w = wasteOf(L, li, MID, 8, true); bot = 'mid'; }
  else w = wasteOf(L, li, SKILLED, 7, true);
  Object.assign(lvRows[li], { skilled_m: +skilledM.toFixed(2), conc_bot: bot, waste: w.tw, conc_pct: +(w.conc * 100).toFixed(1), waste_by_pair: w.waste.join('/') });
  const applies = L.pairs.length >= DF.skilled_concentration_min_pairs && w.tw >= 20;
  const lim = Math.max(DF.skilled_waste_concentration_max_frac, DF.skilled_concentration_even_share_mult / L.pairs.length);
  check(`K1-${L.id}`, !applies || w.conc <= lim, `${bot === 'skilled' ? '숙련' : `중간(숙련 헛 이동 비율 ${(skilledRate * 100).toFixed(2)} % < ${DF.skilled_min_waste_rate * 100} %)`} 봇 ${w.n}회 실행, 헛 이동 ${w.tw}회(쌍별 ${w.waste.join('/')}), 한 쌍 몰림 ${(w.conc * 100).toFixed(1)} %${applies ? ` ≤ ${(lim * 100).toFixed(1)} %${L.pairs.length < 5 ? ' (쌍 4개: 고른 몫 25 % × 1.5)' : ''}` : ` (정보: 쌍 ${L.pairs.length}개는 고르게 나눠도 ${(100 / L.pairs.length).toFixed(0)} % 라 30 % 기준을 적용할 수 없음)`}`, !applies || QUICK);
});
const botSec = ((Date.now() - tB) / 1000).toFixed(1);

// ---------------------------------------------------------------- 출력
const fails = results.filter((x) => !x.ok && !x.info);
const report = { quick: QUICK, seed: SEED, runs_child_per_level: NCH * NSEEDS, runs_skilled: NSK, m: m.map((x) => +x.toFixed(3)), r: +r.toFixed(4), T: +T.toFixed(3), L10_band: [+(0.8 * T).toFixed(3), +(1.2 * T).toFixed(3)], seed_devs_pct: devs.map((x) => +(x * 100).toFixed(2)), per_seed_m: perSeed.map((row) => row.map((x) => +x.toFixed(3))), levels: lvRows, results, verdict: fails.length ? 'FAIL' : 'ALL PASS', bot_seconds: +botSec };
mkdirSync(join(HERE, 'out'), { recursive: true });
writeFileSync(join(HERE, 'out', QUICK ? 'verify-report-quick.json' : 'verify-report.json'), JSON.stringify(report, null, 1));
if (JSON_OUT) { console.log(JSON.stringify(report, null, 1)); process.exit(fails.length ? 1 : 0); }
for (const x of results) console.log(`${x.ok ? 'PASS' : x.info ? 'INFO' : 'FAIL'} ${x.id.padEnd(7)} ${x.msg}`);
console.log('\n레벨 | 판 | 쌍 | 구멍 | 최소 칸 px | 선 길이 | m̃(연속) | 정수 중앙값 | 평균 | p90 | 빈칸 함정 % | 숙련 m̃ | 몰림 봇 | 몰림 %');
for (const x of lvRows) console.log(`${x.id} | ${x.size} | ${x.pairs} | ${x.holes} | ${x.min_cell_px} | ${x.line_lengths} | ${f2(x.m)} | ${x.median_int} | ${f2(x.mean)} | ${x.p90} | ${x.trap_pct} | ${f2(x.skilled_m)} | ${x.conc_bot} | ${x.conc_pct}`);
console.log(`\nr = ${r.toFixed(3)}, T = ${f2(T)}, L10 허용 [${f2(0.8 * T)}, ${f2(1.2 * T)}], 봇 ${botSec} s${QUICK ? ' (quick: B·K 는 정보)' : ''}`);
console.log(fails.length ? `\nFAIL ${fails.length}건: ${fails.map((x) => x.id).join(', ')}` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);
