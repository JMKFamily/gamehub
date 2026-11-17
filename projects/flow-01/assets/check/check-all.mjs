#!/usr/bin/env node
// flow-01 아트 검사 한 번에 (art-director): 팔레트 → 레이아웃 → 소리 → SVG. 하나라도 실패면 종료 코드 1.
//   node assets/check/check-all.mjs
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const H = dirname(fileURLToPath(import.meta.url));
let fail = 0;
for (const s of ['palette.mjs', 'layout.mjs', 'sound-check.mjs', 'svg-check.mjs']) {
  const r = spawnSync(process.execPath, [resolve(H, s)], { encoding: 'utf8' });
  const last = (r.stdout || '').trim().split('\n').pop();
  console.log(`${r.status === 0 ? '통과' : '실패'}  ${s.padEnd(16)} ${last}`);
  if (r.status !== 0) { fail++; console.log(r.stdout.split('\n').filter((l) => l.startsWith('FAIL')).join('\n'), r.stderr); }
}
process.exit(fail ? 1 : 0);
