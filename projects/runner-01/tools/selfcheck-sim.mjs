#!/usr/bin/env node
// 웹 빌드 게임 코어(games/reverbound/js/game.js)에 검증기 입력열을 넣어 세 레벨이 클리어되는지 확인한다.
// 프레임 길이(60/120/144 Hz, 불규칙 프레임, 30 Hz 끊김)를 바꿔도 결과가 같아야 한다 (결정론·프레임 독립).
//
//   node projects/runner-01/tools/selfcheck-sim.mjs
//   (먼저 node projects/runner-01/tools/sync-data.mjs 로 data/test-inputs.json 을 만들어 둘 것)
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileLevel } from '../../../games/reverbound/js/physics.js';
import { createGame } from '../../../games/reverbound/js/game.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'games/reverbound/data');
const read = (p) => JSON.parse(readFileSync(join(DATA, p), 'utf8'));
const bal = read('balance.json');
const inputs = read('test-inputs.json');

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const frames = {
  '60Hz': () => 1 / 60,
  '120Hz': () => 1 / 120,
  '144Hz': () => 1 / 144,
  'jitter': () => (4 + rnd() * 30) / 1000,
  '30Hz+hitch': () => (rnd() < 0.03 ? 0.15 : 1 / 30),
};

let fail = 0;
for (const [i, f] of bal.levels.entries()) {
  const level = read(f);
  const L = compileLevel(level, bal);
  const rec = inputs.levels[level.id];
  for (const [setName, taps] of [['taps', rec.taps], ['on_beat', rec.on_beat_taps]]) {
    for (const holdTicks of [1, 19]) { // 1틱 탭, 약 80 ms 누름
      for (const [fname, fdt] of Object.entries(frames)) {
        const g = createGame(bal);
        g.start(L, i);
        for (const t of taps) { g.press(t); g.release(t + holdTicks); }
        let guard = 0;
        while (g.state === 'playing' && guard++ < 200000) g.advance(fdt());
        const ok = g.state === 'clear' && g.attempts === 1;
        if (!ok) fail++;
        const where = g.death ? ` 사망 x=${g.death.x.toFixed(2)} ${g.death.cause}` : '';
        console.log(`${ok ? 'OK  ' : 'FAIL'} ${level.id} ${setName.padEnd(7)} hold=${String(holdTicks).padStart(2)}틱 ${fname.padEnd(10)} 진행 ${g.progress().toFixed(1)}%${where}`);
      }
    }
  }
  // 무입력은 반드시 사망, 자동 재시작(restart_delay_s) 후 시도 2
  const g = createGame(bal);
  g.start(L, i);
  let n = 0;
  while (g.state === 'playing' && n++ < 100000) g.advance(1 / 60);
  const deadAt = g.progress();
  let t = 0;
  while (g.state === 'dead') { g.advance(1 / 60); t += 1 / 60; }
  const ok = g.state === 'playing' && g.attempts === 2 && Math.abs(t - bal.restart_delay_s) < 0.02;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${level.id} 무입력 사망 ${deadAt.toFixed(1)}% → ${t.toFixed(3)} s 후 자동 재시작 (시도 ${g.attempts})`);
}
// 연습 모드 체크포인트: 레벨 3 중간에 찍고 죽으면 그 지점에서 재시작
{
  const level = read(bal.levels[2]);
  const L = compileLevel(level, bal);
  const taps = inputs.levels[level.id].taps;
  const g = createGame(bal);
  g.start(L, 2, { practice: true });
  const half = taps[Math.floor(taps.length / 2)] - 30;
  for (const t of taps) if (t < half) { g.press(t); g.release(t + 1); }
  while (g.k < half) g.advance(1 / 240);
  g.placeCheckpoint();
  const cpX = g.x();
  while (g.state === 'playing') g.advance(1 / 60);
  while (g.state === 'dead') g.advance(1 / 60);
  const ok = g.state === 'playing' && Math.abs(g.x() - cpX) < 1e-9;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} 03 연습 체크포인트 x=${cpX.toFixed(2)} 에서 재시작 (현재 x=${g.x().toFixed(2)})`);
}
console.log(fail ? `\n결과: FAIL ${fail}` : '\n결과: ALL OK');
process.exitCode = fail ? 1 : 0;
