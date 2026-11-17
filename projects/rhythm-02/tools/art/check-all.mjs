#!/usr/bin/env node
// rhythm-02 아트 검사 한 번에: node tools/art/check-all.mjs  (생성은 하지 않음, 모두 --check 또는 읽기만)
// 대비(palette) · 화면 배치(layout: 4해상도 × 10레벨 실제 BPM, 손가락·실패·클리어 시간축) · 카드(키 = balance gimmicks = 파일 = strings, 카드 속 공 ≥ 16 px) · 아이콘(icons) · 소리 크기 순서·곡 음 시작 규칙(sound-check)
// 다른 역할 파일(balance.json·levels·judge.mjs·strings.json)을 읽기만 함. 그 파일 때문에 실패하면 출력에 "대기" 표시
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
let fail = 0;
for (const [f, a] of [['palette.mjs', ['--check']], ['layout.mjs', ['--check']], ['cards.mjs', ['--check']], ['icons.mjs', ['--check']], ['sound-check.mjs', []]]) {
  const r = spawnSync(process.execPath, [join(HERE, f), ...a], { encoding: 'utf8' });
  const last = r.stdout.trim().split('\n').pop();
  console.log(`${f.padEnd(16)} ${r.status === 0 ? 'OK  ' : 'FAIL'} ${last}`);
  if (r.status !== 0) { fail++; process.stdout.write(r.stdout + r.stderr); }
}
process.exit(fail ? 1 : 0);
