#!/usr/bin/env node
// rhythm-02 그림 카드·오브젝트 SVG 생성 + 카드 속 공 렌더 px 검사. 30-art 7·8절.
//   node tools/art/cards.mjs           assets/cards/*.svg(가로판·세로판), assets/obj-*.svg, assets/mockup-level-select.svg 쓰기 + 검사
//   node tools/art/cards.mjs --check   검사만(카드 속 공 렌더 px, 4해상도) — 실패 시 종료 코드 1
// 색은 assets/palette.json 만 읽음. 외부 이미지·폰트 없음. 글자 없음.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '../..');
const P = JSON.parse(readFileSync(join(PROJ, 'assets/palette.json'), 'utf8'));
const C = P.common;
const CARDS = join(PROJ, 'assets/cards');

// 카드 규격(가로판). 칸 i 왼쪽 x = 20 + 235·i, 위 y = 30, 칸 210 × 276.
export const CARD = {
  W: 720, H: 336, panelW: 210, panelH: 276, panelX: [20, 255, 490], panelY: 30,
  pad: 12, gap: 22, border: 4, rx: 28, screenMargin: 16,
  d: 30, drumW: 96, drumH: 28, skinH: 8.4, skinY: 196, floorY: 224, cx: 105,
  Hp: 160, beatPx: 48, // 카드 속 놀이 높이 160, 1박 = 48 px(100 BPM, c = 0.5·Hp/s)
  minBallPx: 16,
};
const PW = CARD.panelW + CARD.pad * 2;
const PH = CARD.pad * 2 + CARD.panelH * 3 + CARD.gap * 2;

export function landscapeScale(W, H, st = 0, sb = 0) { return Math.min((W - 2 * CARD.screenMargin) / CARD.W, (H - 2 * CARD.screenMargin - st - sb) / CARD.H, 1.4); }
export function portraitScale(W, H, st = 0, sb = 0) { return Math.min((W - 2 * CARD.screenMargin) / PW, (H - 2 * CARD.screenMargin - st - sb) / PH, 1.4); }

const f1 = (v) => (+v.toFixed(1)).toString();
let clipN = 0;
export function ballSvg(x, y, d, { sq = 1 } = {}) {
  // 공: 붉은 원 + 외곽선(0.08d) + 왼쪽 위 짧은 빛 호(ballShine, 반지름 0.62r, 200°~255°, 두께 0.12d). sq < 1 이면 납작, 아랫점 고정.
  // 가로 줄무늬는 쓰지 않음(빨간 원 + 흰 가로 막대 = '진입 금지' 표지로 읽힘, 1-1 렌더 확인).
  const rx = d / 2 / sq, ry = d / 2 * sq, cy = y + d - ry; // y = 공 윗점(납작해도 아랫점 y + d 고정)
  const o = Math.max(2, 0.08 * d), rr = 0.62, p = (a) => [x + rr * rx * Math.cos(a * Math.PI / 180), cy + rr * ry * Math.sin(a * Math.PI / 180)];
  const [x0, y0] = p(200), [x1, y1] = p(255);
  return `<ellipse cx="${f1(x)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${C.ball}" stroke="${C.ink}" stroke-width="${f1(o)}"/>` +
    `<path d="M${f1(x0)} ${f1(y0)} A${f1(rr * rx)} ${f1(rr * ry)} 0 0 1 ${f1(x1)} ${f1(y1)}" fill="none" stroke="${C.ballShine}" stroke-width="${f1(Math.max(2, 0.12 * d))}" stroke-linecap="round"/>`;
}
export function drumSvg(cx, skinY, w, h, skinH, { glow = false } = {}) {
  const o = Math.max(2, 0.08 * CARD.d);
  return `<rect x="${f1(cx - w / 2)}" y="${f1(skinY)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(0.3 * CARD.d)}" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="${f1(o)}"/>` +
    `<rect x="${f1(cx - w / 2)}" y="${f1(skinY)}" width="${f1(w)}" height="${f1(skinH)}" rx="${f1(skinH / 2)}" fill="${glow ? C.glow : C.skin}" stroke="${C.ink}" stroke-width="${f1(o)}"/>`;
}
export function cloudSvg(cx, bottomY, w, h, fill = C.cloud) {
  // 구름: 아랫변이 평평한 둥근 사각형(높이 0.5h) + 원 3개(중심 y = 아랫변 − 0.5h, 반지름 ≤ 0.5h 라 아랫변 밑으로 안 나옴, 가운데 원 꼭대기 = 구름 꼭대기)
  const r = (k) => Math.min(k * h, 0.5 * h, 0.2 * w);
  const base = `<rect x="${f1(cx - w / 2)}" y="${f1(bottomY - h * 0.5)}" width="${f1(w)}" height="${f1(h * 0.5)}" rx="${f1(Math.min(h * 0.25, w * 0.12))}"/>`;
  const bumps = [[-0.26, 0.36], [0.02, 0.5], [0.28, 0.32]].map(([bx, br]) => `<circle cx="${f1(cx + bx * w)}" cy="${f1(bottomY - h * 0.5)}" r="${f1(r(br))}"/>`).join('');
  return `<g fill="${fill}" stroke="${C.ink}" stroke-width="2.4">${base}${bumps}</g><g fill="${fill}">${base}${bumps}</g>`;
}
export function fingerSvg(x, yTip, h, press = false) {
  // 손: 손바닥(둥근 사각형) + 아래로 뻗은 검지 + 접힌 손가락 2개(작은 둥근 사각형). 실제 손 그림 아님. 손끝 = (x, yTip)
  const w = h * 0.26, fh = h * 0.5, pw = h * 0.66, ph = h * 0.44, py = yTip - fh - ph * 0.7, sw = f1(Math.max(2, h * 0.05)), dy = press ? 0 : -h * 0.18;
  let s = `<g stroke="${C.ink}" stroke-width="${sw}" fill="${C.finger}" stroke-linejoin="round" transform="translate(0 ${f1(dy)})">` +
    `<rect x="${f1(x - w / 2 - 1)}" y="${f1(py)}" width="${f1(pw)}" height="${f1(ph)}" rx="${f1(ph * 0.38)}"/>` +
    `<rect x="${f1(x + w / 2)}" y="${f1(py + ph * 0.6)}" width="${f1(w * 0.95)}" height="${f1(ph * 0.6)}" rx="${f1(w * 0.45)}"/>` +
    `<rect x="${f1(x + w * 1.45)}" y="${f1(py + ph * 0.55)}" width="${f1(w * 0.9)}" height="${f1(ph * 0.55)}" rx="${f1(w * 0.45)}"/>` +
    `<rect x="${f1(x - w / 2)}" y="${f1(py + ph * 0.45)}" width="${f1(w)}" height="${f1(yTip - py - ph * 0.45)}" rx="${f1(w / 2)}"/></g>`;
  if (press) s += `<g stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round"><line x1="${f1(x - w)}" y1="${f1(yTip + h * 0.06)}" x2="${f1(x - w * 1.5)}" y2="${f1(yTip + h * 0.14)}"/><line x1="${f1(x + w)}" y1="${f1(yTip + h * 0.06)}" x2="${f1(x + w * 1.5)}" y2="${f1(yTip + h * 0.14)}"/></g>`;
  return s;
}
const shadowSvg = (cx, skinY, h, d = CARD.d, Hp = CARD.Hp) => { const w = d * (1 - 0.55 * Math.min(1, h / Hp)); return `<ellipse cx="${f1(cx)}" cy="${f1(skinY + CARD.skinH / 2)}" rx="${f1(w / 2)}" ry="${f1(Math.max(1.5, w * 0.13))}" fill="${C.shadow}"/>`; };
// 위/아래 방향 꺾쇠(공 위 = 올라감, 공 아래 = 내려옴)
const chevron = (x, y, up) => `<polyline points="${f1(x - 7)},${f1(y + (up ? 5 : -5))} ${f1(x)},${f1(y)} ${f1(x + 7)},${f1(y + (up ? 5 : -5))}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
// 길이 점: 큰 점 = 1박, 작은 점 = 반 박. 북 아래 바닥 위 가운데
const lenDots = (cx, y, beats, gap = 16) => {
  const items = []; let b = beats;
  while (b >= 1 - 1e-9) { items.push(5); b -= 1; }
  if (b > 0.25) items.push(3);
  const w = (items.length - 1) * gap;
  return items.map((r, i) => `<circle cx="${f1(cx - w / 2 + i * gap)}" cy="${f1(y)}" r="${r}" fill="${C.ink}"/>`).join('');
};
// 등급 물결(카드에서는 '좋아' 1쌍). 공 접촉점 양옆 호
export const waves = (x, skinY, d, n) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const r = d * (0.95 + 0.32 * i);
    for (const side of [-1, 1]) {
      const a0 = side < 0 ? 200 : 300, a1 = side < 0 ? 240 : 340;
      const p = (a) => [x + r * Math.cos(a * Math.PI / 180), skinY - d * 0.2 + r * Math.sin(a * Math.PI / 180)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      s += `<path d="M${f1(x0)} ${f1(y0)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(x1)} ${f1(y1)}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
    }
  }
  return s;
};

// 칸 하나 = 장면 목록. 좌표는 칸 안(0..210, 0..276)
function panel(theme, sc) {
  const T = P.themes[theme], K = CARD;
  const lift = sc.press ? -6.6 : 0; // 탭한 칸: 북 톡(0.22d)
  let s = `<rect x="0" y="0" width="${K.panelW}" height="${K.panelH}" rx="20" fill="${T.bg1}"/>`;
  s += `<rect x="0" y="${K.floorY}" width="${K.panelW}" height="${K.panelH - K.floorY}" fill="${T.floor}"/><rect x="0" y="${K.floorY}" width="${K.panelW}" height="2" fill="${T.floorEdge}"/>`;
  if (sc.cloud) s += cloudSvg(K.cx, K.skinY - 0.9 * K.Hp, 128, 0.9 * K.Hp - 16 + 22 > 150 ? 150 : 0.3 * K.Hp + 30);
  const sk = K.skinY + lift;
  const balls = sc.balls || [];
  s += drumSvg(K.cx, sk, K.drumW, K.drumH, K.skinH, { glow: false });
  for (const b of balls) s += shadowSvg(K.cx + (b.dx || 0), sk, b.h);
  for (const b of balls) {
    if (b.hidden) continue;
    const x = K.cx + (b.dx || 0), top = sk - b.h - K.d;
    if (b.trail) s += `<line x1="${f1(x)}" y1="${f1(sk - 2)}" x2="${f1(x)}" y2="${f1(top + K.d + 4)}" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6" stroke-linecap="round"/>`;
    s += ballSvg(x, top, K.d, { sq: b.h === 0 ? 0.82 : 1 });
    if (b.dir === 'up') s += chevron(x, top - 10, true);
    if (b.dir === 'down') s += chevron(x, top + K.d + 13, false);
  }
  if (sc.cloud) s += cloudSvg(K.cx, K.skinY - 0.9 * K.Hp, 128, 0.3 * K.Hp + 30); // 구름은 공 위에 다시 그려 공이 구름 뒤로 숨음
  if (sc.waves) s += waves(K.cx + (sc.waveDx || 0), sk, K.d, sc.waves);
  if (sc.dots != null) s += lenDots(K.cx, 252, sc.dots, sc.dotGap || 16);
  if (sc.speed) s += `<g stroke="${C.ink}" stroke-width="3" stroke-linecap="round"><line x1="${K.cx - 36}" y1="${f1(sk - sc.speed - 8)}" x2="${K.cx - 52}" y2="${f1(sk - sc.speed - 8)}"/><line x1="${K.cx - 34}" y1="${f1(sk - sc.speed - 20)}" x2="${K.cx - 46}" y2="${f1(sk - sc.speed - 20)}"/></g>`;
  if (sc.finger) s += fingerSvg(K.cx + K.drumW / 2 + 0.7 * K.d, K.floorY + 22, 1.5 * K.d, sc.press);
  return s;
}

const B = CARD.beatPx;
// 카드 정의: id(1-0 기믹 id 기준 파일 이름), 레벨, 테마, 칸 3개
export const DEFS = [
  { id: 'B1', level: '01', what: '기본 통: 공이 내려와 북에 닿을 때 톡 → 다시 올라감', panels: [
    { balls: [{ h: B, dir: 'down' }], dots: 1 },
    { balls: [{ h: 0 }], finger: true, press: true, waves: 1, dots: 1 },
    { balls: [{ h: B, dir: 'up', trail: true }], dots: 1 }] },
  { id: 'G1', level: '02', what: '큰 통: 낮게(1박) / 높이(2박) — 높이 뜨면 오래', panels: [
    { balls: [{ h: B, trail: true }], dots: 1 },
    { balls: [{ h: 2 * B, trail: true }], dots: 2 },
    { balls: [{ h: 0 }], finger: true, press: true, waves: 1 }] },
  { id: 'G2', level: '03', what: '구름 통: 구름 속으로 숨음 → 그림자가 커지며 내려옴 → 톡', panels: [
    { balls: [{ h: 2 * B, dir: 'up', trail: true }], cloud: true, dots: 4, dotGap: 14 },
    { balls: [{ h: 150, hidden: true }], cloud: true, dots: 4, dotGap: 14 },
    { balls: [{ h: 0 }], cloud: true, finger: true, press: true, waves: 1 }] },
  { id: 'G3', level: '04', what: '점 통: 길게 · 길게 · 짧게(1.5 + 1.5 + 1박)', panels: [
    { balls: [{ h: 1.5 * B, trail: true }], dots: 1.5 },
    { balls: [{ h: 1.5 * B, trail: true }], dots: 1.5 },
    { balls: [{ h: B, trail: true }], dots: 1 }] },
  { id: 'G4', level: '05', what: '통통: 큰 통 뒤에 낮게 두 번', panels: [
    { balls: [{ h: 2 * B, trail: true }], dots: 2 },
    { balls: [{ h: 0.5 * B, trail: true }], dots: 0.5 },
    { balls: [{ h: 0 }], finger: true, press: true, waves: 1, dots: 0.5 }] },
  { id: 'G5', level: '06', what: '두 공: 북 왼쪽·오른쪽 두 공이 번갈아(줄지어 내려오지 않음)', panels: [
    { balls: [{ h: 2 * B, dx: -23, trail: true }, { h: 0, dx: 23 }], finger: true, press: true, waves: 1, waveDx: 23 },
    { balls: [{ h: 1.5 * B, dx: -23, dir: 'down' }, { h: 0.5 * B, dx: 23, dir: 'up' }] },
    { balls: [{ h: 0, dx: -23 }, { h: 2 * B, dx: 23, trail: true }], finger: true, press: true, waves: 1, waveDx: -23 }] },
  { id: 'G6', level: '07', what: '빠른 곡 구간(1-0 초안, balance 1-1 은 쓰지 않음): 쉼 뒤 노래가 빨라져 같은 통도 조금 낮게', panels: [
    { balls: [{ h: B, trail: true }], dots: 1 },
    { balls: [{ h: 0 }], dots: 0 },
    { balls: [{ h: 0.8 * B, trail: true }], dots: 1, speed: 0.8 * B }] },
  { id: 'G7', level: '08', what: '드르륵: 큰 통 뒤 낮게 네 번', panels: [
    { balls: [{ h: 2 * B, trail: true }], dots: 2 },
    { balls: [{ h: 0.5 * B, trail: true }], dots: 2, dotGap: 12, halfRow: true },
    { balls: [{ h: 0 }], finger: true, press: true, waves: 2 }] },
  { id: 'R1', level: '07', what: '세 박 통(balance 1-1 의 L7 새 기믹, 1-0 예비 R1): 아주 높이(3박)', panels: [
    { balls: [{ h: B, trail: true }], dots: 1 },
    { balls: [{ h: 3 * B, trail: true }], dots: 3 },
    { balls: [{ h: 0 }], finger: true, press: true, waves: 1 }] },
];
// G7 둘째 칸: 작은 점 4개(반 박 × 4)
const halfRow = (cx, y) => [0, 1, 2, 3].map((i) => `<circle cx="${cx - 18 + i * 12}" cy="${y}" r="3" fill="${C.ink}"/>`).join('');

function cardSvg(def) {
  const T = P.themes['level' + def.level];
  const parts = [`<rect x="4" y="4" width="712" height="328" rx="${CARD.rx}" fill="${T.cardBg}" stroke="${T.accent}" stroke-width="${CARD.border}"/>`];
  def.panels.forEach((sc, i) => {
    let inner = panel('level' + def.level, sc);
    if (sc.halfRow) inner = inner.replace(/<circle cx="[\d.]+" cy="252" r="5"[^>]*\/>/g, '') + halfRow(CARD.cx, 252);
    parts.push(`<g transform="translate(${CARD.panelX[i]} ${CARD.panelY})">${inner}</g>`);
    if (i < 2) { const ax = CARD.panelX[i] + CARD.panelW + 5, ay = CARD.panelY + CARD.panelH / 2; parts.push(`<polygon points="${ax},${ay - 9} ${ax + 15},${ay} ${ax},${ay + 9}" fill="${C.ink}"/>`); }
  });
  return parts.join('\n');
}

function writeCard(def) {
  clipN = 0;
  const body = cardSvg(def);
  const name = `card_${def.id}`;
  writeFileSync(join(CARDS, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD.W} ${CARD.H}" width="${CARD.W}" height="${CARD.H}">\n<!-- ${name} (레벨 ${def.level}): ${def.what}. tools/art/cards.mjs 생성, 손으로 고치지 않음. 글 없음. 30-art 8절 -->\n${body}\n</svg>\n`);
  // 세로판: 칸 3개를 위→아래로, 칸 사이 아래 삼각형. 가로판 그림을 <use> 로 다시 씀(두 판의 그림이 어긋나지 않음)
  const T = P.themes['level' + def.level];
  const parts = [`<rect x="${CARD.border / 2}" y="${CARD.border / 2}" width="${PW - CARD.border}" height="${PH - CARD.border}" rx="24" fill="${T.cardBg}" stroke="${T.accent}" stroke-width="${CARD.border}"/>`];
  CARD.panelX.forEach((px, i) => {
    const y = CARD.pad + i * (CARD.panelH + CARD.gap);
    parts.push(`<svg x="${CARD.pad}" y="${y}" width="${CARD.panelW}" height="${CARD.panelH}" viewBox="${px} ${CARD.panelY} ${CARD.panelW} ${CARD.panelH}"><use href="#${name}-all"/></svg>`);
    if (i < 2) { const ay = y + CARD.panelH + (CARD.gap - 14) / 2, cx = PW / 2; parts.push(`<polygon points="${cx - 12},${ay} ${cx + 12},${ay} ${cx},${ay + 14}" fill="${C.ink}"/>`); }
  });
  writeFileSync(join(CARDS, `${name}_portrait.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW}" height="${PH}">\n<!-- ${name} 세로 화면판 (가로판 그림을 칸별로 다시 씀). tools/art/cards.mjs 생성. 30-art 8-2 -->\n<defs><g id="${name}-all">${body.replace(/<polygon points="[^"]+" fill="#[0-9A-F]+"\/>\n?/g, '')}</g></defs>\n${parts.join('\n')}\n</svg>\n`);
}

// 레벨 선택 목업(640x360 가로, 카드 5×2). 상태: 클리어(등급 구름 1~3), 미클리어(최고 진행도 막대), 안 해 봄, 잠김
export function levelCard(x, y, w, h, lv, st) {
  const T = P.themes['level' + lv];
  let s = '';
  if (st.locked) {
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#E6E7EC" stroke="#9A9DAA" stroke-width="3"/>`;
    const lx = x + w / 2, ly = y + h / 2;
    s += `<path d="M${lx - 9} ${ly - 2} v-8 a9 9 0 0 1 18 0 v8" fill="none" stroke="#6B6F80" stroke-width="4"/><rect x="${lx - 14}" y="${ly - 3}" width="28" height="22" rx="5" fill="#6B6F80"/>`;
    return s;
  }
  const cid = `lc${lv}`;
  s += `<clipPath id="${cid}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/></clipPath><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${T.bg1}"/><g clip-path="url(#${cid})">`;
  // 바닥 띠 + 작은 북 + 공(모든 카드 같음) + 레벨 대표 실루엣
  const fy = y + h * 0.62;
  s += `<rect x="${x + 2}" y="${f1(fy)}" width="${w - 4}" height="${f1(h * 0.38 - 2)}" rx="0" fill="${T.floor}"/>`;
  s += sil(lv, x + 2, y + 2, w - 4, fy - y - 2, T);
  const dW = w * 0.34, dH = dW * 0.3, dx = x + w / 2;
  s += `<rect x="${f1(dx - dW / 2)}" y="${f1(fy - dH)}" width="${f1(dW)}" height="${f1(dH)}" rx="4" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="2"/><rect x="${f1(dx - dW / 2)}" y="${f1(fy - dH)}" width="${f1(dW)}" height="${f1(dH * 0.3)}" rx="2" fill="${C.skin}" stroke="${C.ink}" stroke-width="2"/>`;
  const bd = dW * 0.32;
  s += ballSvg(dx, fy - dH - bd - h * 0.12, bd);
  s += `</g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="none" stroke="${T.accent}" stroke-width="4"/>`;
  // 진행도 막대(카드 아래, 글·숫자 없음)
  const bx = x + 10, bw = w - 20, by = y + h - 18;
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="10" rx="5" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>`;
  if (st.best > 0) s += `<rect x="${bx + 2}" y="${by + 2}" width="${f1((bw - 4) * st.best)}" height="6" rx="3" fill="${C.drumBody}"/>`;
  if (st.best > 0 && st.best < 1) s += `<circle cx="${f1(bx + bw * st.best)}" cy="${by + 5}" r="6" fill="${C.ball}" stroke="${C.ink}" stroke-width="2"/>`;
  if (st.grade) for (let i = 0; i < 3; i++) { const gx = x + w / 2 + (i - 1) * 22, gy = y + 16; s += i < st.grade ? miniCloud(gx, gy, 18, T.accent) : miniCloud(gx, gy, 18, 'none', true); }
  if (st.practice) s += flag(x + w - 16, by - 4, 14);
  return s;
}
export function miniCloud(cx, cy, w, fill, dashed = false) {
  const h = w * 0.62, st = dashed ? ` stroke-dasharray="3 3"` : '';
  return `<g fill="${fill}" stroke="${C.ink}" stroke-width="1.8"${st}><path d="M${f1(cx - w / 2)} ${f1(cy + h / 2)} h${f1(w)} a${f1(h * 0.32)} ${f1(h * 0.32)} 0 0 0 ${f1(-h * 0.2)} ${f1(-h * 0.55)} a${f1(h * 0.42)} ${f1(h * 0.42)} 0 0 0 ${f1(-w * 0.5)} ${f1(-h * 0.15)} a${f1(h * 0.3)} ${f1(h * 0.3)} 0 0 0 ${f1(-w * 0.3 + h * 0.2)} ${f1(h * 0.7)} z"/></g>`;
}
export function flag(x, y, h) { return `<rect x="${f1(x)}" y="${f1(y - h)}" width="2.5" height="${f1(h)}" fill="${C.ink}"/><polygon points="${f1(x + 2.5)},${f1(y - h)} ${f1(x + 2.5 + h * 0.7)},${f1(y - h * 0.78)} ${f1(x + 2.5)},${f1(y - h * 0.56)}" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="1.2"/>`; }
function sil(lv, x, y, w, h, T) {
  const S = Math.min(w, h * 1.6);
  let s = '';
  const list = (T.silhouette || []).slice();
  if (lv === '03') return cloudSvg(x + w * 0.2, y + h * 0.78, w * 0.34, h * 0.26) + cloudSvg(x + w * 0.82, y + h * 0.62, w * 0.26, h * 0.2); // 솜구름 하늘: 카드에서는 플레이 구름 그림을 대표로
  for (const e of list) {
    const X = x + e.x * w, Y = y + e.y * h;
    if (e.t === 'rect') s += `<rect x="${f1(X)}" y="${f1(Y)}" width="${f1(e.w === 'full' ? w : e.w * S)}" height="${f1(e.h * S)}" fill="${T.accent}"/>`;
    else if (e.t === 'tri') s += `<polygon points="${f1(X - e.w * S / 2)},${f1(Y)} ${f1(X + e.w * S / 2)},${f1(Y)} ${f1(X)},${f1(Y - e.h * S)}" fill="${T.accent}"/>`;
    else if (e.t === 'ellipse') s += `<ellipse cx="${f1(X)}" cy="${f1(Y)}" rx="${f1(e.rx * S)}" ry="${f1(e.ry * S)}" fill="${T.accent}"/>`;
    else if (e.t === 'diamond') s += `<polygon points="${f1(X)},${f1(Y - e.h * S / 2)} ${f1(X + e.w * S / 2)},${f1(Y)} ${f1(X)},${f1(Y + e.h * S / 2)} ${f1(X - e.w * S / 2)},${f1(Y)}" fill="${T.accent}"/>`;
    else if (e.t === 'pinwheel') { const r = e.r * S; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; s += `<polygon points="${f1(X)},${f1(Y)} ${f1(X + r * Math.cos(a))},${f1(Y + r * Math.sin(a))} ${f1(X + r * Math.cos(a + 0.9))},${f1(Y + r * Math.sin(a + 0.9))}" fill="${T.accent}"/>`; } }
    else if (e.t === 'sun') s += `<circle cx="${f1(X)}" cy="${f1(Y)}" r="${f1(e.r * S)}" fill="${T.accent}"/>`;
  }
  return s;
}
// 카드 안 실루엣은 accent 색(레벨 선택 카드에서 모양 차이를 또렷하게), 플레이 화면 실루엣은 sil 색(흐리게).

function levelSelect() {
  clipN = 0;
  const W = 640, H = 360, cw = 108, ch = 132, gx = 12, gy = 16, x0 = (W - (5 * cw + 4 * gx)) / 2, y0 = 64;
  const states = [{ best: 1, grade: 3 }, { best: 1, grade: 2 }, { best: 1, grade: 1 }, { best: 1, grade: 2, practice: true }, { best: 0.64 }, { best: 0.22, practice: true }, { best: 0 }, { locked: true }, { locked: true }, { locked: true }];
  let s = `<rect width="${W}" height="${H}" fill="#F4F1EA"/>`;
  s += `<rect x="12" y="8" width="48" height="48" rx="14" fill="#FFFFFF" stroke="${C.ink}" stroke-width="2"/><polygon points="44,20 26,32 44,44" fill="${C.ink}"/>`;
  states.forEach((st, i) => { const r = Math.floor(i / 5), c = i % 5; s += levelCard(x0 + c * (cw + gx), y0 + r * (ch + gy), cw, ch, String(i + 1).padStart(2, '0'), st); });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<!-- 레벨 선택 목업 640x360 (tools/art/cards.mjs 생성). 글·숫자 없이 구분: 바탕색·테두리색·대표 실루엣(레벨마다 모양 다름)·잠김 자물쇠. 클리어 = 막대 가득 + 등급 구름 1~3(빈 자리 점선), 미클리어 = 막대 채움 + 공 색 점(최고 진행도), 연습 = 깃발. 30-art 6절 -->\n${s}\n</svg>\n`;
}

function objects() {
  clipN = 0;
  const w = (name, vb, body, note) => writeFileSync(join(PROJ, 'assets', name), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">\n<!-- ${note} tools/art/cards.mjs 생성 -->\n${body}\n</svg>\n`);
  w('obj-ball.svg', '0 0 64 64', ballSvg(32, 2, 60), '공: 붉은 원 + 가로 줄무늬 1줄 + 외곽선(0.08d). 하이라이트 점·꼬리 없음.');
  w('obj-drum.svg', '0 0 200 64', drumSvg(100, 2, 192, 57, 16.8), '북: 가로로 넓은 둥근 사각형(너비 3.2d, 높이 0.95d) + 윗면 가죽 띠(0.28d). 원형 북 아님.');
  w('obj-cloud.svg', '0 0 260 120', cloudSvg(130, 116, 250, 110), '구름: 평평한 아랫변 + 원 3개. 공이 이 뒤로 숨음.');
  w('obj-finger.svg', '0 0 80 110', fingerSvg(40, 92, 86, true), '튜토리얼 손가락(누름). 북 오른쪽 바닥 위, 손끝 아래.');
  w('obj-grade-cloud.svg', '0 0 120 40', miniCloud(20, 20, 32, P.themes.level01.accent) + miniCloud(60, 20, 32, P.themes.level01.accent) + miniCloud(100, 20, 32, 'none', true), '등급 구름(채움 = 받음, 점선 = 빈 자리). lore grade_1~3.');
  w('obj-flag.svg', '0 0 40 40', flag(12, 36, 30), '연습 깃발(자동 체크포인트 표시, 버튼 아님).');
  const g = [0, 1, 2].map((n, i) => `<g transform="translate(${i * 130} 0)">${drumSvg(65, 90, 96, 28, 8.4, { glow: n === 2 })}${ballSvg(65, 60, 30, { sq: [0.92, 0.85, 0.75][n] })}${waves(65, 90, 30, n)}</g>`).join('');
  w('obj-grade-fx.svg', '0 0 400 130', g, '판정 반응 3단계(왼→오: 통과 / 좋아 / 딱). 물결 0·1·2쌍 + 공 납작 0.92·0.85·0.75, 딱만 가죽 glow. 흑백에서도 물결 개수로 구분.');
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/art/cards.mjs');
if (isMain) main();
function main() {
const args = process.argv.slice(2);
let fail = 0;
if (!args.includes('--check')) {
  mkdirSync(CARDS, { recursive: true });
  for (const d of DEFS) writeCard(d);
  writeFileSync(join(PROJ, 'assets/mockup-level-select.svg'), levelSelect());
  objects();
  console.log(`카드 ${DEFS.length}장 × 2판, 오브젝트 SVG 7개, 레벨 선택 목업 1개 씀`);
}
console.log('| 화면 | 판 | 배율 | 카드 px | 카드 속 공 px | 결과 |');
console.log('|---|---|---|---|---|---|');
for (const [W, H, st, sb] of [[360, 640, 0, 0], [360, 640, 24, 24], [412, 915, 24, 34], [360, 560, 0, 0], [640, 360, 0, 0], [1280, 720, 0, 0]]) {
  const portrait = H > W;
  const s = portrait ? portraitScale(W, H, st, sb) : landscapeScale(W, H, st, sb);
  const ball = s * CARD.d, ok = ball >= CARD.minBallPx;
  if (!ok) fail++;
  console.log(`| ${W}x${H} safe ${st}/${sb} | ${portrait ? '세로' : '가로'} | ${s.toFixed(3)} | ${((portrait ? PW : CARD.W) * s).toFixed(0)}×${((portrait ? PH : CARD.H) * s).toFixed(0)} | ${ball.toFixed(1)} | ${ok ? '통과' : '실패'} |`);
}
// 세로 화면에 가로판을 잘못 띄웠을 때(참고)
console.log(`(참고) 360x640 에 가로판을 띄우면 배율 ${landscapeScale(360, 640).toFixed(3)}, 공 ${(landscapeScale(360, 640) * CARD.d).toFixed(1)} px → 세로판 필수`);
console.log(fail ? `cards FAIL ${fail}` : 'cards OK (카드 속 공 ≥ 16 px)');
process.exit(fail ? 1 : 0);
}
