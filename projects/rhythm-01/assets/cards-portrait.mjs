#!/usr/bin/env node
// 그림 카드 세로 화면판 생성: assets/cards/card_<id>.svg(가로 3칸) → assets/cards/card_<id>_portrait.svg(3칸 세로 쌓기)
//   node assets/cards-portrait.mjs          생성
//   node assets/cards-portrait.mjs --check  360x640·412x915 세로에서 카드 속 공 ≥ 16 px·별 ≥ 20 px 인지 계산만 (실패 시 종료 코드 1)
//
// 30-art 9-1. 칸 그림은 가로판 원본을 <use> 로 그대로 다시 쓰므로(중첩 svg viewBox 로 칸만 잘라 보임) 두 판의 그림이 어긋나지 않는다.
// 가로판 칸 규격: 칸 i 왼쪽 x = 20 + 235·i, 위 y = 30, 칸 210 × 276. 카드 속 공 지름 28, 별(꽉 찬) 지름 34 (30-art 9절).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'cards');
export const CARD = {
  panelW: 210, panelH: 276, panelX: [20, 255, 490], panelY: 30, // 가로판 칸
  pad: 12, gap: 22, arrow: { w: 24, h: 14 }, border: 4, rx: 24, // 세로판 여백·칸 사이(아래 삼각형)
  ballD: 28, starD: 34,
  screenMargin: 16, // 세로 화면에서 카드 둘레 여백(+ safe area)
  minBallPx: 16, minStarPx: 20,
};
const PW = CARD.panelW + CARD.pad * 2;
const PH = CARD.pad * 2 + CARD.panelH * 3 + CARD.gap * 2;

// 세로 화면 표시 배율(카드 전체를 화면 폭 − 32, 높이 − 32 − safe 안에 맞춤, 최대 1.4배)
export function portraitScale(W, H, safeTop = 0, safeBottom = 0) {
  return Math.min((W - 2 * CARD.screenMargin) / PW, (H - 2 * CARD.screenMargin - safeTop - safeBottom) / PH, 1.4);
}

if (process.argv.includes('--check')) {
  let fail = 0;
  for (const [W, H, st, sb] of [[360, 640, 0, 0], [360, 640, 24, 24], [412, 915, 24, 34], [360, 560, 0, 0]]) {
    const s = portraitScale(W, H, st, sb);
    const ball = s * CARD.ballD, star = s * CARD.starD;
    const ok = ball >= CARD.minBallPx && star >= CARD.minStarPx;
    if (!ok) fail++;
    console.log(`${W}x${H} safe ${st}/${sb}: 배율 ${s.toFixed(3)}, 카드 ${(PW * s).toFixed(0)}×${(PH * s).toFixed(0)} px, 공 ${ball.toFixed(1)} px, 별 ${star.toFixed(1)} px ${ok ? 'OK' : 'FAIL'}`);
  }
  process.exit(fail ? 1 : 0);
}

for (const f of readdirSync(DIR).filter((f) => /^card_[a-z0-9_]+\.svg$/.test(f) && !f.endsWith('_portrait.svg'))) {
  const src = readFileSync(join(DIR, f), 'utf8');
  const open = src.indexOf('>', src.indexOf('<svg')) + 1, close = src.lastIndexOf('</svg>');
  const body = src.slice(open, close).replace(/<!--[\s\S]*?-->\n?/g, '').trim();
  const frame = /<rect x="4" y="4"[^>]*fill="(#[0-9A-Fa-f]+)" stroke="(#[0-9A-Fa-f]+)"/.exec(body);
  const [bgFar, tint] = [frame[1], frame[2]];
  const id = f.replace('.svg', '');
  const parts = [];
  parts.push(`<rect x="${CARD.border / 2}" y="${CARD.border / 2}" width="${PW - CARD.border}" height="${PH - CARD.border}" rx="${CARD.rx}" fill="${bgFar}" stroke="${tint}" stroke-width="${CARD.border}"/>`);
  CARD.panelX.forEach((px, i) => {
    const y = CARD.pad + i * (CARD.panelH + CARD.gap);
    parts.push(`<svg x="${CARD.pad}" y="${y}" width="${CARD.panelW}" height="${CARD.panelH}" viewBox="${px} ${CARD.panelY} ${CARD.panelW} ${CARD.panelH}"><use href="#${id}-all" xlink:href="#${id}-all"/></svg>`);
    if (i < 2) {
      const ay = y + CARD.panelH + (CARD.gap - CARD.arrow.h) / 2, cx = PW / 2;
      parts.push(`<polygon points="${cx - CARD.arrow.w / 2},${ay} ${cx + CARD.arrow.w / 2},${ay} ${cx},${ay + CARD.arrow.h}" fill="#E6E1D3"/>`);
    }
  });
  const out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${PW} ${PH}" width="${PW}" height="${PH}">
<!-- ${id} 세로 화면판 (assets/cards-portrait.mjs 가 ${f} 에서 생성, 손으로 고치지 않음). 칸 3개를 위→아래로, 칸 사이는 아래 방향 삼각형. 30-art 9-1 -->
<defs><g id="${id}-all">${body}</g></defs>
${parts.join('\n')}
</svg>
`;
  writeFileSync(join(DIR, `${id}_portrait.svg`), out);
  console.log(`${id}_portrait.svg ${PW}×${PH}`);
}
