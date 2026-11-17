#!/usr/bin/env node
// 그림 카드 세로 화면판 생성: assets/cards/card_<id>.svg(가로 3칸) → assets/cards/card_<id>_portrait.svg(3칸 세로 쌓기)
//   node assets/cards-portrait.mjs          생성
//   node assets/cards-portrait.mjs --check  세로 화면 4가지에서 카드 속 공·별 크기 계산만 (실패 시 종료 코드 1)
//     ① 도형 바깥 크기(criteria): 공 ≥ 16 px, 별 ≥ 20 px — 모든 화면
//     ② 화면에 보이는 면(외곽선 안쪽 색 면, round 3 R15): 360x640 safe 0 에서 공·별 ≥ 18 px(16 + 여유 2), 나머지 화면 ≥ 16 px
//
// 30-art 9-1. 칸 그림은 가로판 원본을 <use> 로 그대로 다시 쓰므로(중첩 svg viewBox 로 칸만 잘라 보임) 두 판의 그림이 어긋나지 않는다.
// round 3 R15: 세로판에서만 공(+ 하이라이트)·별(꽉 찬·속 빈)·별 딱 빛살·통과 고리를 각자 중심 기준 objScale(1.2)배로 키우고,
//   여백 12 → 8, 칸 사이 22 → 18 로 줄여 카드 높이 896 → 880. 궤도·북·북채·손가락·받침·꼬리는 가로판 크기 그대로.
// 가로판 칸 규격: 칸 i 왼쪽 x = 20 + 235·i, 위 y = 30, 칸 210 × 276. 카드 속 공 지름 28, 별(꽉 찬) 지름 34 (30-art 9절).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'cards');
export const CARD = {
  panelW: 210, panelH: 276, panelX: [20, 255, 490], panelY: 30, // 가로판 칸
  pad: 8, gap: 18, arrow: { w: 24, h: 14 }, border: 4, rx: 22, // 세로판 여백·칸 사이(아래 삼각형) (round 3: 12·22 → 8·18)
  ballD: 28, starD: 34, objScale: 1.2, // 세로판에서만 공·별을 키우는 배율 (round 3 R15)
  // 보이는 면 모델 (카드 단위, objScale 1 기준): 공 면 = 지름 28 − 외곽선 2.5 = 25.5, 별 면 = 외곽선 안쪽 높이(폭보다 작은 쪽) 25.5.
  // 렌더하면 가장자리 안티에일리어싱으로 공 −0.5 px, 별(뾰족한 끝) −2 px 줄어듦 (round-2 360x640 렌더 실측 공 16~17·별 15~17 px 와 맞춘 값)
  ballFaceU: 25.5, starFaceU: 25.5, ballAaPx: 0.5, starAaPx: 2,
  minFacePx: 16, faceMarginPx: 2,
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
    const k = CARD.objScale;
    const ball = s * k * CARD.ballD, star = s * k * CARD.starD;
    const ballFace = s * k * CARD.ballFaceU - CARD.ballAaPx, starFace = s * k * CARD.starFaceU - CARD.starAaPx;
    const needFace = CARD.minFacePx + (W === 360 && H === 640 && st === 0 && sb === 0 ? CARD.faceMarginPx : 0);
    const ok = ball >= CARD.minBallPx && star >= CARD.minStarPx && ballFace >= needFace && starFace >= needFace;
    if (!ok) fail++;
    console.log(`${W}x${H} safe ${st}/${sb}: 배율 ${s.toFixed(3)}, 카드 ${(PW * s).toFixed(0)}×${(PH * s).toFixed(0)} px, 바깥 공 ${ball.toFixed(1)}·별 ${star.toFixed(1)} px, 보이는 면 공 ${ballFace.toFixed(1)}·별 ${starFace.toFixed(1)} px (기준 ${needFace}) ${ok ? 'OK' : 'FAIL'}`);
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
  const k = CARD.objScale;
  const grow = (cx, cy, el) => `<g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})">${el}</g>`;
  let n = 0;
  const scaled = body
    // 공 + 바로 뒤 하이라이트 (공 중심 기준)
    .replace(/<circle cx="([\d.]+)" cy="([\d.]+)" r="14" fill="#7FE3FF" stroke="[^"]*" stroke-width="[^"]*"\/>(<circle [^>]*fill="#F5F1E8"\/>)?/g, (m, cx, cy) => (n++, grow(cx, cy, m)))
    // 별 (꼭짓점 10개, 꽉 찬 별·속 빈 별)
    .replace(/<polygon points="([^"]+)"[^>]*#FFD43B[^>]*\/>/g, (m, pts) => {
      const p = pts.trim().split(/\s+/).map((q) => q.split(',').map(Number));
      if (p.length !== 10) return m;
      const cx = +(p.reduce((a, b) => a + b[0], 0) / 10).toFixed(2), cy = +(p.reduce((a, b) => a + b[1], 0) / 10).toFixed(2);
      n++; return grow(cx, cy, m);
    })
    // 별 딱 빛살 (별 중심 기준 회전 막대)
    .replace(/<rect [^>]*fill="#FFD43B" transform="rotate\([\d.]+ ([\d.]+) ([\d.]+)\)"\/>/g, (m, cx, cy) => (n++, grow(cx, cy, m)))
    // 통과 고리 (별 자리 trackEdge 고리, 0.9·별r = 15.3)
    .replace(/<circle cx="([\d.]+)" cy="([\d.]+)" r="15.3" fill="none"[^>]*\/>/g, (m, cx, cy) => (n++, grow(cx, cy, m)));
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
<!-- ${id} 세로 화면판 (assets/cards-portrait.mjs 가 ${f} 에서 생성, 손으로 고치지 않음). 칸 3개를 위→아래로, 칸 사이는 아래 방향 삼각형. 공·별·딱 빛살·통과 고리만 각자 중심 기준 ${k}배 (round 3 R15). 30-art 9-1 -->
<defs><g id="${id}-all">${scaled}</g></defs>
${parts.join('\n')}
</svg>
`;
  writeFileSync(join(DIR, `${id}_portrait.svg`), out);
  console.log(`${id}_portrait.svg ${PW}×${PH}, ${k}배 키운 도형 ${n}개`);
}
