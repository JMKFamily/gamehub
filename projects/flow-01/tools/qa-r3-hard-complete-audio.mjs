// flow-01 round-3 재현(qa-engineer 1-4): 일반 모드(오디오 켬)에서 쌍 7개 이상 판을 완료하면 완료 화음이 ladder_hz(6음) 밖 음을 읽어
// AudioParam.setValueAtTime(NaN) TypeError → frame try/catch 의 console.error. 포트 8743, 자기 PID 만 종료.
//   PLAYWRIGHT_CORE=<playwright-core> node projects/flow-01/tools/qa-r3-hard-complete-audio.mjs
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path'; import { fileURLToPath } from 'node:url';
const P = resolve(dirname(fileURLToPath(import.meta.url)), '..') + '/';
const pw = createRequire(process.env.PLAYWRIGHT_CORE + '/index.js')(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [P + 'tools/serve.mjs', '8743'], { stdio: ['ignore', 'pipe', 'pipe'] }); await new Promise((r) => srv.stdout.once('data', r));
const br = await pw.chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const logs = []; p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text().split('\n')[0]); });
await p.goto('http://127.0.0.1:8743/games/flow-01/?lang=ko'); await p.waitForFunction(() => window.__game?.ready);
await p.mouse.click(640, 650); await p.waitForTimeout(2500);
for (const [idx, file] of [[2, 'levels/03-level3.json'], [50, 'levels-hard/H1-01.json']]) {
  const lv = JSON.parse(readFileSync(P + file, 'utf8')); const sol = lv.pairs.map((pp) => lv.solution.find((s) => s.id === pp.id).path);
  const n0 = logs.length;
  await p.evaluate(([i, sol]) => { const g = window.__game; g.loadLevel(i); if (g.board.card) g.closeCard(); for (const s of sol) g.drag(s); }, [idx, sol]);
  await p.waitForTimeout(1500);
  console.log(lv.id, 'pairs', lv.pairs.length, 'audio', await p.evaluate(() => window.__game.audioState), 'new console', JSON.stringify(logs.slice(n0)));
}
await br.close(); srv.kill();
