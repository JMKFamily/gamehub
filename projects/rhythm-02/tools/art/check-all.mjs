#!/usr/bin/env node
// rhythm-02 아트 검사 한 번에: node tools/art/check-all.mjs  (생성은 하지 않음, 모두 --check 또는 읽기만)
// 대비(palette, 물체 색·판정 글자 색 포함) · 화면 배치(layout: 4해상도 HUD 띠·콤보 자리·판정 이름·% 자리·크기·겹침(시간축 포함)·구름 덮음·글 자리·손가락, 레벨 v2 세계 물체 윗선·밑 공간·표시 간격 ≥ 32 px·한 화면 상한, 손가락·실패·클리어 시간축) · 카드(키 = balance gimmicks = 파일 = strings, 칸 안 그림, 카드 속 공 ≥ 16 px, card_three 박 점 셋) · 아이콘(결과 화면 크기 순서) · 소리(빌드 렌더 대조 ≤ 1 dB, 콤보 화음 ≤ 탭 − 1 dB, 곡 음·지붕 밑 쉼 규칙)
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
