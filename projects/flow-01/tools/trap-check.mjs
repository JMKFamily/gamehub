#!/usr/bin/env node
// 유일해 검증기 함정 확인(1-0 보고서 인사이트 후보의 실측 근거).
// 같은 후보 판을 세 검증기로 세어 비교:
//   none  = 가지치기 0(정답 기준, 작은 판만)   sound = 우리 검증기   trap = sound + 생성용 "자기 선 이웃 금지" 가지치기
// 사용법: node tools/trap-check.mjs [--per=300] [--json]
import { generate } from './gen/generate.mjs';
import { countSolutions } from './gen/solve.mjs';
import { makePuzzle } from './core/board.mjs';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const PER = +arg('per', 300);
const CFGS = [
  { name: '4x4·3쌍 (F2 켬, 실제 생성)', width: 4, height: 4, pairs: 3, none: true },
  { name: '5x5·4쌍 (F2 켬)', width: 5, height: 5, pairs: 4, none: true },
  { name: '5x5·5쌍 (F2 켬)', width: 5, height: 5, pairs: 5, none: true },
  { name: '6x6·6쌍 (F2 켬)', width: 6, height: 6, pairs: 6, none: false },
  { name: '4x4·3쌍 (F2 끔, L2 방식)', width: 4, height: 4, pairs: 3, allowSelfAdjacent: true, none: true },
];
const rows = [];
for (const cfg of CFGS) {
  const r = { name: cfg.name, boards: 0, sound_unique: 0, trap_says_unique_but_two: 0, trap_finds_zero_but_sound_has: 0, none_vs_sound_mismatch: 0, none_checked: 0, example: null };
  for (let i = 0; i < PER; i++) {
    const g = generate(cfg, 9000000 + i);
    if (!g) continue;
    r.boards++;
    const pz = makePuzzle(g.level);
    const s = countSolutions(pz, { limit: 2, mode: 'sound' });
    const t = countSolutions(pz, { limit: 2, mode: 'trap' });
    if (s.count === 1) r.sound_unique++;
    if (t.count === 1 && s.count === 2) { r.trap_says_unique_but_two++; if (!r.example) r.example = { seed: 9000000 + i, pairs: g.level.pairs.map((p) => [p.a, p.b]) }; }
    if (t.count === 0 && s.count > 0) r.trap_finds_zero_but_sound_has++;
    if (cfg.none) {
      const nn = countSolutions(pz, { limit: 2, mode: 'none', maxNodes: 5e7 });
      if (!nn.aborted) { r.none_checked++; if (nn.count !== s.count) r.none_vs_sound_mismatch++; }
    }
  }
  rows.push(r);
}
if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
else {
  console.log('판 종류 | 판 수 | sound 유일 | trap "유일"인데 실제 답 2개 | trap 답 0개인데 실제 답 있음 | none 교차(확인 판 수 / 불일치)');
  for (const r of rows) console.log(`${r.name} | ${r.boards} | ${r.sound_unique} | ${r.trap_says_unique_but_two} | ${r.trap_finds_zero_but_sound_has} | ${r.none_checked} / ${r.none_vs_sound_mismatch}`);
  const ex = rows.find((r) => r.example);
  if (ex) console.log('예(시드):', JSON.stringify(ex.example));
}
