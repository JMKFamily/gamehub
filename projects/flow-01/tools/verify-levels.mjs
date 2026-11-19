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
//   R14 처음부터 = 새 시도·바로 다음 되돌리기 = 처음부터 취소(H2)   R12 한 번에 이은 쌍 정의(G2)   R13 판 채움 % = 연결된 쌍의 칸만(G3)   V9 카드·시연 필드(text_key·first_hole 안쪽)
//   V0 레벨 10개·스키마   V1 판 크기·쌍 수·칸 px(4해상도, assets/layout.json play.*.cell 을 직접 읽음, G5)   V2 답 = 올바른 덮개, 선 길이 ≥ 3   V3 유일해(sound) + 답 = 생성 답
//   V4 교차 검증(가지치기 0 열거, 끝나는 판만)   V5 완벽 입력(답 드래그) → 완료·이동 = 쌍 수·별·100 %·모두 1단(양방향)
//   V6 새 요소 ≤ 1·구멍 첫 등장 = 소개 레벨   V10 L11~50 새 요소 없음·챕터 구조·판 중복 없음
//   B3c/B4c/B4s 챕터 2~5 안 단조·끝 목표 ±20 %·시작 숨 고르기   B8 (정보) 시드별 단조   H1 도움 이동 수 신호 = balance.json   V7 L1 튜토리얼 드래그 = 답 길, 핵심 조작으로 연결   V8 생성 기록 재현(시드 → 같은 판)
//   B0 봇 매개변수 = balance.json   B1 m̃L ≤ 30   B2 m̃L ≤ 2·m̃(L−1)   B3 L3~L10 엄격 단조   B4 L10 ∈ [0.8T, 1.2T]
//   B5 시드 10개 분포(L10/T 편차 평균·모든 시드 ±20 %)   B6 L1 m̃1 ≤ 10·빈칸 함정 ≤ 50 %   B7 못 푼 판 0
//   C1 콤보·이름·% 켜고 끈 봇 결과 불일치 0   C2 % 100 ⇔ 별 ⇔ 모든 색 1단 (모든 봇 실행)   K1 숙련 봇(헛 이동 < 20 이면 중간 봇) 헛 이동 한 쌍 몰림 ≤ 30 %(쌍 ≥ 4)
//   (정보) T1 함정 검증기(trap) 가 레벨에서 내는 답 수

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from './core/board.mjs';
import { countSolutions, samePathSet } from './gen/solve.mjs';
import { generate } from './gen/generate.mjs';
import { SLOTS, HARD_STAGES } from './levels-config.mjs';
import { generateBig } from './gen/generate-big.mjs';
import { countSolutionsEdge } from './gen/solve-edge.mjs';
import { solveRun, moveStats, CHILD, SKILLED, MID } from './sim/bots.mjs';
import { mixSeed } from './core/rng.mjs';
import { runJobs } from './sim/jobs.mjs';

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
  // R14 처음부터 = 새 시도, 바로 다음 되돌리기 = 처음부터 취소(round-2 H2). pz2: A 윗줄, C 가운데·아랫줄 ㄷ자
  const C2 = [I(0, 1), I(1, 1), I(2, 1), I(2, 2), I(1, 2), I(0, 2)];
  g = B.newGame(pz2);
  B.playDrag(g, [I(0, 1), I(1, 1)]); B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]); B.undo(g); // 이동 2, 판엔 C 두 칸
  const rs = B.resetBoard(g);
  const zeroed = rs && g.moves === 0 && g.colorMoves.join() === '0,0' && g.paths.every((p) => !p.length) && g.undoStack.length === 0 && g.connectLog.length === 0;
  check('R14', zeroed, `처음부터 → 이동 수·색별 이동 수·판정 기록·되돌리기 목록 0 (이동 ${g.moves})`);
  const un = B.undo(g);
  const back = un && g.moves === 2 && g.colorMoves.join() === '1,1' && g.paths[1].length === 2 && !g.paths[0].length && g.undoStack.length === 1;
  check('R14b', back, `처음부터 바로 다음 되돌리기 → 처음부터 취소, 이동 수도 돌아옴(이동 ${g.moves}, 별 지름길 없음)`);
  B.resetBoard(g); B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]); B.playDrag(g, C2);
  check('R14c', g.completed && g.moves === 2 && B.isStar(g) && B.accuracyPct(g) === 100, '처음부터 뒤 새 시도로 완벽 풀이 → 별·100 % 다시 가능');
  g = B.newGame(pz2);
  B.playDrag(g, [I(0, 1), I(1, 1)]); B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]); B.resetBoard(g); B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]);
  const u1 = B.undo(g), m1 = g.moves, u2 = B.undo(g);
  check('R14d', u1 && !u2 && m1 === 1 && g.moves === 1 && g.paths.every((p) => !p.length), `처음부터 뒤 드래그가 있으면 되돌리기는 그 드래그만(처음부터 직전으로 못 감, 이동 ${g.moves})`);
  g = B.newGame(pz2);
  B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]); B.undo(g);
  const e1 = B.resetBoard(g), e1m = g.moves, e2 = B.resetBoard(g);
  check('R14e', e1 && e1m === 0 && !e2, '빈 판이어도 이동 수가 있으면 처음부터 = 새 시도, 빈 판·이동 0 이면 무시');
  let star0 = false; // 별 지름길 탐색: 처음부터·되돌리기 순서를 섞어도 이동 수 < 쌍 수로 완료되는 일 없음
  for (let t = 0; t < 64; t++) {
    g = B.newGame(pz2);
    const ops = [() => B.playDrag(g, [I(0, 1), I(1, 1)]), () => B.playDrag(g, [I(0, 0), I(1, 0), I(2, 0)]), () => B.undo(g), () => B.resetBoard(g), () => B.playDrag(g, C2)];
    for (let k = 0, x = t * 7 + 3; k < 8 && !g.completed; k++, x = (x * 13 + 5) % 97) ops[x % 5]();
    if (g.completed && (g.moves < pz2.k || (B.isStar(g) && g.colorMoves.some((m) => m !== 1)))) star0 = true;
  }
  check('R14f', !star0, '처음부터·되돌리기 섞은 64가지 순서: 이동 수 < 쌍 수 완료·가짜 별 0');
  check('R11', B.trackCell(pz, lay, 115, 50, I(0, 0), 0.2) === I(0, 0) && B.trackCell(pz, lay, 125, 50, I(0, 0), 0.2) === I(1, 0), '칸 판정 히스테리시스 20 %');
}

// ---------------------------------------------------------------- 레벨 읽기
const files = readdirSync(join(PROJECT, 'levels')).filter((f) => /^\d\d-.*\.json$/.test(f)).sort();
const levels = files.map((f) => JSON.parse(readFileSync(join(PROJECT, 'levels', f), 'utf8')));
const NLV = DF.chapters.count * DF.chapters.size;
check('V0', levels.length === NLV && levels.every((l, i) => l.id === String(i + 1).padStart(2, '0') && l.schema_version === 1 && l.pairs && l.solution && l.generator), `레벨 ${levels.length}개(= 챕터 ${DF.chapters.count} × ${DF.chapters.size}), id 01~${String(NLV).padStart(2, '0')}, 스키마 1`);

const lvRows = [];
for (const L of levels) {
  const pz = B.makePuzzle(L);
  const row = { id: L.id, size: `${L.width}x${L.height}`, pairs: pz.k, holes: L.holes.length, cells: pz.cellCount };
  lvRows.push(row);
  const n = Number(L.id);
  // V1
  const long = Math.max(L.width, L.height);
  const capLong = n <= bal.curve_r3.child_zone.levels.length ? bal.board.max_cells_long_side_L1_L5 : bal.board.max_cells_long_side_any; // round-3: 5x5 이하는 구간 K(L1~L4)
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
  const lv10 = levels.slice(0, 10);
  const pairsUp = lv10.map((l, i) => (i && l.pairs.length > levels[i - 1].pairs.length ? l.id : null)).filter(Boolean);
  const sizeUp = lv10.map((l, i) => (i && l.width * l.height > lv10[i - 1].width * lv10[i - 1].height ? l.id : null)).filter(Boolean);
  const both = pairsUp.filter((x) => sizeUp.includes(x));
  const sameLevelNew = lv10.slice(0, bal.curve_r3.child_zone.levels.length).filter((l) => pairsUp.includes(l.id) && !['more_colors', 'bigger_board', 'holes'].includes(l.new_element));
  check('V6b', both.every((id) => ['bigger_board', 'holes'].includes(lv10.find((l) => l.id === id).new_element)) && sameLevelNew.length === 0, `쌍 수 증가 L${pairsUp.join(',')} / 판 증가 L${sizeUp.join(',')}: 같은 레벨에 겹친 곳 ${both.join(',') || '없음'}(판 커짐·구멍 소개 레벨만 허용)`);
}
// V10 레벨 11~50(round-2): 새 기믹 없음(구멍만, 이미 L6 소개), 판 ≤ 6x6·쌍 ≤ 6, 챕터 구조 = balance.json chapters, 판 중복 없음
{
  const ext = levels.slice(10);
  const okNone = ext.every((l) => l.new_element === 'none' && !l.tutorial && !l.fill_card && !l.hole_card);
  const chOk = levels.every((l, i) => l.chapter === Math.floor(i / DF.chapters.size) + 1 && l.chapter_pos === (i % DF.chapters.size) + 1 && l.chapter_key === `chapter${l.chapter}_name` && l.name_key === `level${i + 1}_name`);
  const CHL = bal.chapters?.list || [];
  const mapOk = CHL.length === DF.chapters.count && CHL.every((c, k) => c.chapter === k + 1 && c.name_key === `chapter${k + 1}_name` && JSON.stringify(c.levels) === JSON.stringify(levels.filter((l) => l.chapter === k + 1).map((l) => l.id)));
  const sigs = new Set(levels.map((l) => JSON.stringify([l.width, l.height, l.holes, l.pairs.map((p) => [p.a, p.b])])));
  check('V10', okNone && chOk && mapOk && sigs.size === levels.length, `L11~L${levels.length} 새 요소 없음 ${okNone}, 챕터·이름 키(chapterN_name·levelN_name) ${chOk}, balance.json chapters.list 일치 ${mapOk}, 서로 다른 판 ${sigs.size}/${levels.length}`);
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

// ---------------------------------------------------------------- round-3 어려운 5단계 판(levels-hard/)
// 검증: HV1 판 크기 ≤ 기본 판(6x6) 넓이 4배·쌍 10~16, HV2 답 덮개·선 길이 ≥ 3, HV3 독립 검증기 2(solve-edge: 변 켬/끔 제약) 유일해 + 답 = 생성 답,
//       HV4 길 찾기 검증기(solve.mjs sound) 도 유일해(노드 상한에 걸리면 정보), HV5 완벽 입력 → 별, HV8 시드 재현(gen-2)
//       E0 독립 검증기 2 자체 확인: 가지치기 0 열거(none)와 답 수가 같음(5x5 무작위 판 300개, 답 여러 개인 판 포함) + 일반 50판 답 일치
const hardLevels = existsSync(join(PROJECT, 'levels-hard')) ? readdirSync(join(PROJECT, 'levels-hard')).filter((f) => /^H\d-\d\d\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(join(PROJECT, 'levels-hard', f), 'utf8'))) : [];
const hardRows = [];
{
  let agree = 0, multi = 0, tot = 0;
  for (let i = 0; i < 300; i++) {
    const g = generate({ width: 5, height: 5, pairs: 4, allowSelfAdjacent: true }, 777000 + i); if (!g) continue; tot++;
    const a = countSolutions(B.makePuzzle(g.level), { limit: 3, mode: 'none' }).count, b = countSolutionsEdge(g.level, { limit: 3 }).count;
    if (a === b) agree++; if (a > 1) multi++;
  }
  const lvOk = levels.every((L) => { const r = countSolutionsEdge(L); return r.count === 1 && JSON.stringify(r.solutions[0]) === JSON.stringify(L.solution.map((s) => s.path.map(([x, y]) => y * L.width + x))); });
  check('E0', agree === tot && multi > 0 && lvOk, `독립 검증기 2 = 가지치기 0 열거: ${agree}/${tot}판 답 수 일치(답 2개 이상 판 ${multi}개 포함), 일반 ${levels.length}판 답 일치 ${lvOk}`);
}
const BASE_AREA = 36;
const ids = hardLevels.map((l) => l.id);
check('HV0', hardLevels.length === bal.curve_r3.hard_zone.boards_per_stage * 5 && hardLevels.every((l) => l.stage >= 1 && l.stage <= 5 && l.stage_key === `hard${l.stage}_name`), `어려운 판 ${hardLevels.length}개(5단계 × ${bal.curve_r3.hard_zone.boards_per_stage}), id ${ids[0]}~${ids[ids.length - 1]}, 단계 이름 키 hardN_name`);
const hardSigs = new Set();
const soundOut = await runJobs(hardLevels.map((L) => ({ name: 'soundCheck', arg: { L, maxNodes: QUICK ? 3e5 : 3e6 } })));
for (const [hi, L] of hardLevels.entries()) {
  const pz = B.makePuzzle(L), area = L.width * L.height;
  hardSigs.add(JSON.stringify([L.width, L.height, L.pairs.map((p) => [p.a, p.b])]));
  check(`HV1-${L.id}`, area <= 4 * BASE_AREA && pz.k >= 10 && pz.k <= 16, `${L.width}x${L.height}(넓이 ${area} = 기본 판 ${(area / BASE_AREA).toFixed(2)}배 ≤ 4), 쌍 ${pz.k} ∈ [10, 16]`);
  const sol = L.solution.map((s) => s.path.map(([x, y]) => y * L.width + x));
  const seen = new Uint8Array(pz.n); let okCover = true;
  sol.forEach((p, c) => { if (p[0] !== pz.pairs[c].a || p[p.length - 1] !== pz.pairs[c].b) okCover = false; for (let i = 0; i < p.length; i++) { if (seen[p[i]] || pz.hole[p[i]]) okCover = false; seen[p[i]] = 1; if (i && !B.adjacent(pz, p[i - 1], p[i])) okCover = false; } });
  check(`HV2-${L.id}`, okCover && seen.reduce((a, b) => a + b, 0) === pz.cellCount && Math.min(...sol.map((p) => p.length)) >= 3, `답 덮개 ${pz.cellCount}칸, 선 길이 ≥ 3`);
  let t0 = Date.now();
  const e = countSolutionsEdge(L, { limit: 2, maxNodes: 5e7 });
  const eMs = Date.now() - t0;
  check(`HV3-${L.id}`, e.count === 1 && !e.aborted && JSON.stringify(e.solutions[0]) === JSON.stringify(sol), `독립 검증기 2(변 제약): 답 ${e.count}개, 답 = 생성 답, 노드 ${e.nodes}, ${eMs} ms`);
  const s = { ...soundOut[hi], solutions: [soundOut[hi].sol] }, sMs = soundOut[hi].ms;
  if (s.aborted) check(`HV4-${L.id}`, true, `(정보) 길 찾기 검증기(sound): ${s.nodes} 노드에서 중단(${sMs} ms) → HV3 단독`, true);
  else check(`HV4-${L.id}`, s.count === 1 && samePathSet(s.solutions[0], sol), `길 찾기 검증기(sound)도 답 ${s.count}개, 같은 답(노드 ${s.nodes}, ${sMs} ms)`);
  const g = B.newGame(pz); for (const p of sol) B.playDrag(g, p);
  check(`HV5-${L.id}`, g.completed && g.moves === pz.k && B.isStar(g), `완벽 입력 → 완료·이동 ${g.moves} = 쌍 ${pz.k}·별`);
  const re = generateBig(HARD_STAGES[L.stage - 1], L.generator.seed);
  check(`HV8-${L.id}`, re && JSON.stringify(re.level.pairs) === JSON.stringify(L.pairs) && JSON.stringify(re.level.solution) === JSON.stringify(L.solution), `시드 ${L.generator.seed} → 같은 판(gen-2)`);
}
check('HV9', hardSigs.size === hardLevels.length, `어려운 판 서로 다름 ${hardSigs.size}/${hardLevels.length}`);

// ---------------------------------------------------------------- B: 봇
check('B0', ['eps', 'p_cut', 'cut_cost', 'p_continue', 'edge_bonus', 'lookahead', 'max_moves', 'max_drags'].every((k) => bal.bots.child[k] === CHILD[k] && bal.bots.skilled[k] === SKILLED[k]), 'balance.json bots = sim/bots.mjs CHILD·SKILLED');

// 봇 실행은 레벨마다 스레드 풀(sim/jobs.mjs)로 나눠 돌림. 시드는 (SEED, 시드 번호, 레벨 번호, 회차)로만 정해져 스레드 수와 무관(결정적)
const tB = Date.now();
// round-3: 구간 T(L5~L50) 아이 봇은 B9(m̃ > 30) 확인용이라 시드당 200회, 몰림은 정보라 숙련 봇 1000회(늘리지 않음)
const inK = (li) => li < bal.curve_r3.child_zone.levels.length;
const jobOut = await runJobs(levels.map((L, li) => ({ name: 'verifyLevel', arg: { L, li, SEED, NSEEDS, NCH: inK(li) || QUICK ? NCH : 200, NSK: inK(li) || QUICK ? NSK : 1000, QUICK: QUICK || !inK(li), c1N: QUICK ? 100 : li < bal.curve_r3.child_zone.levels.length ? 1000 : 200, minRate: DF.skilled_min_waste_rate, minWaste: DF.concentration_min_waste_events } })));
const perSeed = Array.from({ length: NSEEDS }, (_, s) => jobOut.map((o) => o.perSeed[s])); // [seed][level] = cmedian
const stats = jobOut.map((o) => o.stats);
const trapCnt = jobOut.map((o) => o.trap), failCnt = jobOut.map((o) => o.fail), runsOf = jobOut.map((o) => o.runs);
const c2bad = jobOut.reduce((a, o) => a + o.c2bad, 0), c2runs = jobOut.reduce((a, o) => a + o.c2runs, 0);
const m = stats.map((x) => x.cmedian);
const r = Math.sqrt(m[2] / m[0]);
const T = m[0] * r ** 5;
levels.forEach((L, i) => Object.assign(lvRows[i], { chapter: L.chapter, m: +m[i].toFixed(3), median_int: stats[i].median, mean: +stats[i].mean.toFixed(2), p90: stats[i].p90, max: stats[i].max, trap_pct: +((100 * trapCnt[i]) / runsOf[i]).toFixed(1), fail: failCnt[i], runs: runsOf[i] }));
const BI = QUICK; // quick 이면 B 는 정보
// ---- round-3 곡선(20-balance 8-7, balance.json curve_r3): 구간 K = 아이 봇, T = 추론 봇 D1, H = 추론 봇 D2
const CV = bal.curve_r3, NZ = CV.normal_zone, HZ = CV.hard_zone;
const KZ = CV.child_zone.levels.length;
const devs = perSeed.map((row) => { const rr = Math.sqrt(row[2] / row[0]); return row[9] / (row[0] * rr ** 5) - 1; });
// B1 구간 K: 아이 봇 m̃ ≤ 30, 직전 2배 이하, L1 < L2 < … < L4, L1 기준(B6)
const mK = m.slice(0, KZ);
check('B1', mK.every((x) => x <= CV.child_zone.max_child_moves), `구간 K(L1~L${KZ}) 아이 봇 m̃ ≤ ${CV.child_zone.max_child_moves}: ${mK.map(f2).join(' / ')}`, BI);
check('B2', mK.every((x, i) => i === 0 || x <= DF.max_ratio_to_previous * mK[i - 1]), `구간 K 직전 대비 ≤ ${DF.max_ratio_to_previous}배: 최대 ${f2(Math.max(...mK.map((x, i) => (i ? x / mK[i - 1] : 0))))}`, BI);
check('B3', mK.every((x, i) => i === 0 || x > mK[i - 1]), `구간 K 엄격 단조: ${mK.map(f2).join(' < ')}`, BI);
// B9 5~6세 구간 < 5 %: 아이 봇 m̃ ≤ 30 인 판 = L1~L4 뿐, 볼륨(일반 + 어려운) 대비 비율
{
  const playable = m.map((x, i) => (x <= CV.child_zone.max_child_moves ? i + 1 : null)).filter(Boolean);
  const vol = levels.length + hardLevels.length;
  const frac = playable.length / vol;
  const okSet = playable.length === KZ && playable.every((x, i) => x === i + 1);
  check('B9', okSet && frac < CV.child_zone.max_volume_frac && vol === CV.volume_boards, `아이 봇 m̃ ≤ 30 인 판 ${playable.length}개(L${playable.join(',L')}) / 볼륨 ${vol}판 = ${(frac * 100).toFixed(1)} % < ${CV.child_zone.max_volume_frac * 100} %, L${KZ + 1}~L${levels.length} 아이 봇 m̃ 최소 ${f2(Math.min(...m.slice(KZ)))} > 30`, BI);
}
// 추론 봇 값(판 고유 시드, 자리와 무관)
const dOut = await runJobs([...levels, ...hardLevels].map((L) => ({ name: 'deduce', arg: { L, seed: L.generator.seed, runs: QUICK ? 200 : CV.deduce_runs, bots: ['D1', 'D2'], seedBase: mixSeed(SEED, 4243, L.generator.seed) } })));
const d1 = dOut.slice(0, levels.length).map((o) => o.D1.w), d2n = dOut.slice(0, levels.length).map((o) => o.D2.w);
const d2h = dOut.slice(levels.length).map((o) => o.D2.w), d1h = dOut.slice(levels.length).map((o) => o.D1.w);
levels.forEach((L, i) => Object.assign(lvRows[i], { D1: d1[i], D2: d2n[i] }));
// 구간 T(L5~L50): D1 헛 이동. 챕터 1 은 L5~L10, 챕터 c 끝 E_c = E1·(E5/E1)^((c−1)/4) ±20 %, 시작 = 앞 끝의 0.6~0.95배, 챕터 안 엄격 단조, 직전 2배 이하
const chEnd = (c) => NZ.chapter1_end_target * (NZ.last_end_target / NZ.chapter1_end_target) ** ((c - 1) / 4);
const chapterRows = [];
for (let c = 1; c <= 5; c++) {
  const a = c === 1 ? KZ : (c - 1) * 10, b = c * 10, seg = d1.slice(a, b), E = chEnd(c), endM = seg[seg.length - 1];
  const mono = seg.every((x, i) => i === 0 || x > seg[i - 1]);
  const okEnd = endM >= (1 - NZ.end_band_frac) * E && endM <= (1 + NZ.end_band_frac) * E;
  const sf = c === 1 ? null : seg[0] / d1[a - 1];
  const okStart = c === 1 || (sf >= NZ.start_band_vs_prev_end[0] && sf <= NZ.start_band_vs_prev_end[1]);
  chapterRows.push({ chapter: c, start: seg[0], end: endM, E: +E.toFixed(2), end_dev_pct: +((endM / E - 1) * 100).toFixed(1), start_frac: sf == null ? null : +sf.toFixed(3) });
  check(`T-${c}`, mono && okEnd && okStart, `챕터 ${c}(L${a + 1}~L${b}) D1 헛 이동 엄격 단조 ${mono}: ${seg.map(f2).join(' < ')} / 끝 ${f2(endM)} ∈ E${c} ${f2(E)} ±20 % ${okEnd}${c > 1 ? ` / 시작 = 앞 끝의 ${sf.toFixed(2)}배 ${okStart}` : ''}`, BI);
}
check('T-2x', d1.slice(KZ).every((x, i, s) => i === 0 || x <= DF.max_ratio_to_previous * s[i - 1]), `구간 T D1 직전 대비 ≤ 2배: 최대 ${f2(Math.max(...d1.slice(KZ).map((x, i, s) => (i ? x / s[i - 1] : 0))))}`, BI);
check('T-in', d1[KZ] > d1[KZ - 1], `구간 K → T 이음: D1 L${KZ} ${f2(d1[KZ - 1])} < L${KZ + 1} ${f2(d1[KZ])}`, BI);
// 구간 H(어려운 5단계): D2 헛 이동. 단계 s 안 엄격 단조, 끝 ∈ 범위 위끝 ±20 %, 단계 끝끼리 증가, 마지막 ≤ 30, 못 풂 ≤ 5 %
const stageRows = [];
for (let s = 1; s <= 5; s++) {
  const idx = hardLevels.map((L, i) => (L.stage === s ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) { check(`H-${s}`, false, `단계 ${s} 판 없음`); continue; }
  const seg = idx.map((i) => d2h[i]), [lo, hi] = HZ.stage_ranges[s - 1], endM = seg[seg.length - 1];
  const mono = seg.every((x, i) => i === 0 || x > seg[i - 1]);
  const okEnd = endM >= (1 - HZ.band_frac) * hi && endM <= (1 + HZ.band_frac) * hi;
  const fails = idx.map((i) => dOut[levels.length + i].D2.fail / (QUICK ? 200 : CV.deduce_runs));
  stageRows.push({ stage: s, start: seg[0], end: endM, target_end: hi, boards: seg.length, D1_min: Math.min(...idx.map((i) => d1h[i])), max_fail: Math.max(...fails) });
  check(`H-${s}`, seg.length === HZ.boards_per_stage && mono && okEnd && Math.max(...fails) <= 0.05, `단계 ${s}(${seg.length}판) D2 헛 이동 엄격 단조 ${mono}: ${seg.map(f2).join(' < ')} / 끝 ${f2(endM)} ∈ ${hi} ±20 % ${okEnd} / D2 못 풂 최대 ${(Math.max(...fails) * 100).toFixed(1)} %`, BI);
}
check('H-up', stageRows.every((x, i) => i === 0 || (x.end > stageRows[i - 1].end && x.start >= stageRows[i - 1].start)) && Math.max(...d2h) <= HZ.max_wrong_median, `단계 끝 D2 증가 ${stageRows.map((x) => f2(x.end)).join(' < ')}, 최대 ${f2(Math.max(...d2h))} ≤ ${HZ.max_wrong_median}`, BI);
check('H-in', Math.min(...d1h) >= d1[levels.length - 1] * 0.8, `(정보) 구간 T → H 이음: 어려운 판 D1 최소 ${f2(Math.min(...d1h))}, L50 D1 ${f2(d1[levels.length - 1])}`, true);
check('B6', m[0] <= DF.L1_max_moves && trapCnt[0] / runsOf[0] <= DF.L1_max_empty_trap_frac, `L1 m̃1 ${f2(m[0])} ≤ ${DF.L1_max_moves}, 빈칸 함정 거침 ${((trapCnt[0] / runsOf[0]) * 100).toFixed(1)} % ≤ 50 %`, BI);
check('B7', failCnt.slice(0, KZ).every((x) => x === 0), `구간 K 아이 봇 못 푼 실행 ${failCnt.slice(0, KZ).join('/')}(= 0). 구간 T 는 아이 봇이 못 푸는 것이 정상(5~6세 구간 밖, 정보: 레벨당 ${runsOf[KZ]}회 중 최대 ${Math.max(...failCnt.slice(KZ))}회)`, BI);
check('B8', true, `(정보) 시드 ${NSEEDS}개 각각 단조(구간 K): ${perSeed.filter((row) => row.slice(0, KZ).every((x, i, s) => i === 0 || x > s[i - 1])).length}/${NSEEDS}`, true);
check('C2', c2bad === 0, `% 100 ⇔ 별 ⇔ 모든 색 1단: 완료 실행 ${c2runs}회 중 불일치 ${c2bad}`);
{
  const bad = jobOut.reduce((a, o) => a + o.c1bad, 0), n = jobOut.reduce((a, o) => a + o.c1n, 0);
  check('C1', bad === 0, `콤보(쌍 점 줄)·판정 이름·% 계산을 켠 실행과 끈 실행: ${n}쌍 중 불일치 ${bad}(이동 수·완료·드래그 열 모두 비교)`);
}
// K1 숙련 봇 몰림(F1): 구간 K 만 판정(5~6세가 한 곳에서 막히는 불공정 방지). 구간 T·H 는 열쇠 자리가 곧 퍼즐 난이도라 정보로만(20-balance 8-7)
levels.forEach((L, li) => {
  const w = jobOut[li].k1, bot = w.bot;
  Object.assign(lvRows[li], { skilled_m: +w.skilledM.toFixed(2), conc_bot: bot, waste: w.tw, conc_pct: +(w.conc * 100).toFixed(1), waste_by_pair: w.waste.join('/') });
  const applies = li < KZ && L.pairs.length >= DF.skilled_concentration_min_pairs && w.tw >= 20;
  const lim = Math.max(DF.skilled_waste_concentration_max_frac, DF.skilled_concentration_even_share_mult / L.pairs.length);
  check(`K1-${L.id}`, !applies || w.conc <= lim, `${li < KZ ? '' : '(정보, 구간 T) '}${bot === 'skilled' ? '숙련' : '중간'} 봇 ${w.n}회, 헛 이동 ${w.tw}회, 한 쌍 몰림 ${(w.conc * 100).toFixed(1)} %${applies ? ` ≤ ${(lim * 100).toFixed(1)} %` : ''}`, !applies || QUICK);
});
// 도움 이동 수 신호(20-balance 10-2, round-3): 구간 K 없음(시간 신호만, L1~L4 p90 ≤ 20), 구간 T·H = 쌍 수 + max(6, ⌈2·D2⌉)
const helpSuggest = {};
levels.forEach((L, i) => { if (i >= KZ) helpSuggest[L.id] = L.pairs.length + Math.max(6, Math.ceil(2 * d2n[i])); });
hardLevels.forEach((L, i) => { helpSuggest[L.id] = L.pairs.length + Math.max(6, Math.ceil(2 * d2h[i])); });
{
  const cur = bal.help.moves_trigger_by_level || {};
  const key = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
  check('H1', key(helpSuggest) === key(cur), `도움 이동 수 신호(쌍 수 + max(6, ⌈2·D2⌉)) = balance.json help.moves_trigger_by_level(${Object.keys(helpSuggest).length}개)`, QUICK);
}
hardLevels.forEach((L, i) => hardRows.push({ id: L.id, stage: L.stage, size: `${L.width}x${L.height}`, pairs: L.pairs.length, D1: d1h[i], D2: d2h[i], D2_p90: dOut[levels.length + i].D2.p90, D2_fail: dOut[levels.length + i].D2.fail }));
const botSec = ((Date.now() - tB) / 1000).toFixed(1);

// ---------------------------------------------------------------- 출력
const fails = results.filter((x) => !x.ok && !x.info);
const report = { quick: QUICK, seed: SEED, runs_child_per_level: NCH * NSEEDS, runs_skilled: NSK, m: m.map((x) => +x.toFixed(3)), r: +r.toFixed(4), T: +T.toFixed(3), L10_band: [+(0.8 * T).toFixed(3), +(1.2 * T).toFixed(3)], seed_devs_pct: devs.map((x) => +(x * 100).toFixed(2)), per_seed_m: perSeed.map((row) => row.map((x) => +x.toFixed(3))), chapters: chapterRows, stages: stageRows, hard: hardRows, help_suggest: helpSuggest, levels: lvRows, results, verdict: fails.length ? 'FAIL' : 'ALL PASS', bot_seconds: +botSec };
mkdirSync(join(HERE, 'out'), { recursive: true });
writeFileSync(join(HERE, 'out', QUICK ? 'verify-report-quick.json' : 'verify-report.json'), JSON.stringify(report, null, 1));
if (JSON_OUT) { console.log(JSON.stringify(report, null, 1)); process.exit(fails.length ? 1 : 0); }
for (const x of results) console.log(`${x.ok ? 'PASS' : x.info ? 'INFO' : 'FAIL'} ${x.id.padEnd(7)} ${x.msg}`);
console.log('\n레벨 | 판 | 쌍 | 구멍 | 최소 칸 px | 선 길이 | m̃(연속) | 정수 중앙값 | 평균 | p90 | 빈칸 함정 % | 숙련 m̃ | 몰림 봇 | 몰림 %');
for (const x of stageRows) console.log(`단계 ${x.stage}: D2 ${f2(x.start)} → ${f2(x.end)} (끝 목표 ${x.target_end}), D1 최소 ${f2(x.D1_min)}`);
for (const x of chapterRows) console.log(`챕터 ${x.chapter}: 시작 m̃ ${f2(x.start)}(앞 끝의 ${x.start_frac}배), 끝 m̃ ${f2(x.end)}, 끝 목표 E ${f2(x.E)}, 편차 ${x.end_dev_pct} %`);
for (const x of lvRows) console.log(`${x.id} | ${x.size} | ${x.pairs} | ${x.holes} | ${x.min_cell_px} | ${x.line_lengths} | ${f2(x.m)} | ${x.median_int} | ${f2(x.mean)} | ${x.p90} | ${x.trap_pct} | ${f2(x.skilled_m)} | ${x.conc_bot} | ${x.conc_pct}`);
console.log(`\nr = ${r.toFixed(3)}, T = ${f2(T)}, L10 허용 [${f2(0.8 * T)}, ${f2(1.2 * T)}], 봇 ${botSec} s${QUICK ? ' (quick: B·K 는 정보)' : ''}`);
console.log(fails.length ? `\nFAIL ${fails.length}건: ${fails.map((x) => x.id).join(', ')}` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);
