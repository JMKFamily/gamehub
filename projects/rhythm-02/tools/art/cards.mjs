#!/usr/bin/env node
// rhythm-02 그림 카드·오브젝트 SVG 생성 + 카드 키·파일·문구 일치 검사 + 카드 속 공 렌더 px 검사. 30-art 7·8·11절.
//   node tools/art/cards.mjs           assets/cards/<키>.svg(가로판)·<키>_portrait.svg(세로판), assets/obj-*.svg 쓰기 + 검사 (레벨 선택 목업은 icons.mjs)
//   node tools/art/cards.mjs --check   검사만 — 실패 시 종료 코드 1
// 카드 키의 원본 = balance.json gimmicks.<id>.card (1-2 D1, 읽기만). 색은 assets/palette.json 만 읽음. 외부 이미지·폰트 없음. 글자 없음.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
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
  pad: 12, gap: 22, border: 4, rx: 28, screenMargin: 16, textLine: 28,
  d: 30, drumW: 96, drumH: 28, skinH: 8.4, skinY: 196, floorY: 224, cx: 105,
  Hp: 160, beatPx: 48, // 카드 속 놀이 높이 160, 1박 = 48 px(100 BPM, c = 0.5·Hp/s)
  minBallPx: 16,
};
const PW = CARD.panelW + CARD.pad * 2;
const PH = CARD.pad * 2 + CARD.panelH * 3 + CARD.gap * 2;

// 표시 배율: 화면 둘레 16 px 여백 + 위쪽 보조 글 한 줄(textLine, 30-art 8절·layout.json text_slots.card_text) 을 비우고, 최대 1.4배
export function landscapeScale(W, H, st = 0, sb = 0) { return Math.min((W - 2 * CARD.screenMargin) / CARD.W, (H - 2 * CARD.screenMargin - CARD.textLine - st - sb) / CARD.H, 1.4); }
export function portraitScale(W, H, st = 0, sb = 0) { return Math.min((W - 2 * CARD.screenMargin) / PW, (H - 2 * CARD.screenMargin - CARD.textLine - st - sb) / PH, 1.4); }

const f1 = (v) => (+v.toFixed(1)).toString();
export function ballSvg(x, y, d, { sq = 1 } = {}) {
  // 공: 붉은 원 + 외곽선(0.08d) + 왼쪽 위 짧은 빛 호(ballShine, 반지름 0.62r, 200°~255°, 두께 0.12d). sq < 1 이면 납작, 아랫점 고정.
  // 가로 줄무늬는 쓰지 않음(빨간 원 + 흰 가로 막대 = '진입 금지' 표지로 읽힘, 1-1 렌더 확인).
  const rx = d / 2 / sq, ry = d / 2 * sq, cy = y + d - ry; // y = 공 윗점(납작해도 아랫점 y + d 고정)
  const o = Math.max(2, 0.08 * d), rr = 0.62, p = (a) => [x + rr * rx * Math.cos(a * Math.PI / 180), cy + rr * ry * Math.sin(a * Math.PI / 180)];
  const [x0, y0] = p(200), [x1, y1] = p(255);
  return `<ellipse cx="${f1(x)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${C.ball}" stroke="${C.ink}" stroke-width="${f1(o)}"/>` +
    `<path d="M${f1(x0)} ${f1(y0)} A${f1(rr * rx)} ${f1(rr * ry)} 0 0 1 ${f1(x1)} ${f1(y1)}" fill="none" stroke="${C.ballShine}" stroke-width="${f1(Math.max(2, 0.12 * d))}" stroke-linecap="round"/>`;
}
export function drumSvg(cx, skinY, w, h, skinH, { glow = false, d = CARD.d } = {}) {
  const o = Math.max(2, 0.08 * d);
  return `<rect x="${f1(cx - w / 2)}" y="${f1(skinY)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(0.3 * d)}" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="${f1(o)}"/>` +
    `<rect x="${f1(cx - w / 2)}" y="${f1(skinY)}" width="${f1(w)}" height="${f1(skinH)}" rx="${f1(skinH / 2)}" fill="${glow ? C.glow : C.skin}" stroke="${C.ink}" stroke-width="${f1(o)}"/>`;
}
export function cloudSvg(cx, bottomY, w, h, fill = C.cloud) {
  // 구름: 아랫변이 평평한 둥근 사각형(높이 0.5h) + 원 3개(중심 y = 아랫변 − 0.5h, 반지름 ≤ 0.5h 라 아랫변 밑으로 안 나옴, 가운데 원 꼭대기 = 구름 꼭대기)
  const r = (k) => Math.min(k * h, 0.5 * h, 0.2 * w);
  const base = `<rect x="${f1(cx - w / 2)}" y="${f1(bottomY - h * 0.5)}" width="${f1(w)}" height="${f1(h * 0.5)}" rx="${f1(Math.min(h * 0.25, w * 0.12))}"/>`;
  const bumps = [[-0.26, 0.36], [0.02, 0.5], [0.28, 0.32]].map(([bx, br]) => `<circle cx="${f1(cx + bx * w)}" cy="${f1(bottomY - h * 0.5)}" r="${f1(r(br))}"/>`).join('');
  return `<g fill="${fill}" stroke="${C.ink}" stroke-width="2.4">${base}${bumps}</g><g fill="${fill}">${base}${bumps}</g>`;
}
export function fingerSvg(x, yTip, h, press = false, taps = 1) {
  // 손: 손바닥(둥근 사각형) + 아래로 뻗은 검지 + 접힌 손가락 2개(작은 둥근 사각형). 실제 손 그림 아님. 손끝 = (x, yTip)
  // 누름: 손끝 양옆 짧은 선 1쌍. taps > 1 이면 오른쪽에 짧은 누름 표시를 taps 개(카드 "톡톡"·"네 번", 30-art 8절)
  const w = h * 0.26, fh = h * 0.5, pw = h * 0.66, ph = h * 0.44, py = yTip - fh - ph * 0.7, sw = f1(Math.max(2, h * 0.05)), dy = press ? 0 : -h * 0.18;
  let s = `<g stroke="${C.ink}" stroke-width="${sw}" fill="${C.finger}" stroke-linejoin="round" transform="translate(0 ${f1(dy)})">` +
    `<rect x="${f1(x - w / 2 - 1)}" y="${f1(py)}" width="${f1(pw)}" height="${f1(ph)}" rx="${f1(ph * 0.38)}"/>` +
    `<rect x="${f1(x + w / 2)}" y="${f1(py + ph * 0.6)}" width="${f1(w * 0.95)}" height="${f1(ph * 0.6)}" rx="${f1(w * 0.45)}"/>` +
    `<rect x="${f1(x + w * 1.45)}" y="${f1(py + ph * 0.55)}" width="${f1(w * 0.9)}" height="${f1(ph * 0.55)}" rx="${f1(w * 0.45)}"/>` +
    `<rect x="${f1(x - w / 2)}" y="${f1(py + ph * 0.45)}" width="${f1(w)}" height="${f1(yTip - py - ph * 0.45)}" rx="${f1(w / 2)}"/></g>`;
  if (press) s += `<g stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round"><line x1="${f1(x - w)}" y1="${f1(yTip + h * 0.06)}" x2="${f1(x - w * 1.5)}" y2="${f1(yTip + h * 0.14)}"/><line x1="${f1(x + w)}" y1="${f1(yTip + h * 0.06)}" x2="${f1(x + w * 1.5)}" y2="${f1(yTip + h * 0.14)}"/></g>`;
  if (press && taps > 1) {
    // 누름 표시 taps 개: 손바닥 바로 위에 짧은 세로 막대를 가로로 나란히(숫자 없이 횟수)
    const x0 = x - w / 2 + 1, y0 = py - h * 0.26;
    s += `<g stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round">` + Array.from({ length: taps }, (_, i) => `<line x1="${f1(x0 + i * h * 0.16)}" y1="${f1(y0)}" x2="${f1(x0 + i * h * 0.16)}" y2="${f1(y0 + h * 0.16)}"/>`).join('') + '</g>';
  }
  return s;
}
const shadowSvg = (cx, skinY, h, d = CARD.d, Hp = CARD.Hp) => { const w = d * (1 - 0.55 * Math.min(1, h / Hp)); return `<ellipse cx="${f1(cx)}" cy="${f1(skinY + CARD.skinH / 2)}" rx="${f1(w / 2)}" ry="${f1(Math.max(1.5, w * 0.13))}" fill="${C.shadow}"/>`; };
// 위/아래 방향 꺾쇠(공 위 = 올라감, 공 아래 = 내려옴)
const chevron = (x, y, up) => `<polyline points="${f1(x - 7)},${f1(y + (up ? 5 : -5))} ${f1(x)},${f1(y)} ${f1(x + 7)},${f1(y + (up ? 5 : -5))}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
// 길이 점: 큰 점 = 1박, 작은 점 = 반 박. 북 아래 바닥 위 가운데. halves = 작은 점 개수를 직접(반박 연속)
const lenDots = (cx, y, beats, gap = 16, halves = 0) => {
  const items = []; let b = beats;
  if (halves) for (let i = 0; i < halves; i++) items.push(3);
  else { while (b >= 1 - 1e-9) { items.push(5); b -= 1; } if (b > 0.25) items.push(3); }
  const w = (items.length - 1) * gap;
  return items.map((r, i) => `<circle cx="${f1(cx - w / 2 + i * gap)}" cy="${f1(y)}" r="${r}" fill="${C.ink}"/>`).join('');
};
// 판정 반응 "튐 선"(1-2: 물결 호 → 세로 튐 선). 친 공 x 중심 양옆, 가죽 윗면에서 위로 뻗는 짧은 세로 선 n쌍(딱 2 / 좋아 1 / 통과 0). layout.json bounce_lines
export const bounceLines = (x, skinY, d, n) => {
  let s = '';
  const X = [0.74, 1.07], Lh = [0.45, 0.6]; // layout.json bounce_lines.x_of_d·len_of_d
  for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
    const lx = x + side * X[i] * d, y1 = skinY - 0.08 * d, y0 = y1 - Lh[i] * d;
    s += `<line x1="${f1(lx)}" y1="${f1(y0)}" x2="${f1(lx)}" y2="${f1(y1)}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
  }
  return s;
};
// 헛스윙 바람선(일찍 실패): 북 위 양옆 짧은 비스듬한 선 1쌍
const swingLines = (x, skinY, w) => `<g stroke="${C.ink}" stroke-width="3" stroke-linecap="round"><line x1="${f1(x - w / 2 - 4)}" y1="${f1(skinY - 6)}" x2="${f1(x - w / 2 - 16)}" y2="${f1(skinY - 16)}"/><line x1="${f1(x + w / 2 + 4)}" y1="${f1(skinY - 6)}" x2="${f1(x + w / 2 + 16)}" y2="${f1(skinY - 16)}"/></g>`;

// 칸 하나 = 장면 목록. 좌표는 칸 안(0..210, 0..276)
function panel(theme, sc) {
  const T = P.themes[theme], K = CARD;
  const lift = sc.press ? -6.6 : 0; // 탭한 칸: 북 톡(0.22d)
  let s = `<rect x="0" y="0" width="${K.panelW}" height="${K.panelH}" rx="20" fill="${T.bg1}"/>`;
  s += `<rect x="0" y="${K.floorY}" width="${K.panelW}" height="${K.panelH - K.floorY}" fill="${T.floor}"/><rect x="0" y="${K.floorY}" width="${K.panelW}" height="2" fill="${T.floorEdge}"/>`;
  const sk = K.skinY + lift;
  const balls = sc.balls || [];
  s += drumSvg(K.cx, sk, K.drumW, K.drumH, K.skinH, { glow: false });
  for (const b of balls) if (!b.floor) s += shadowSvg(K.cx + (b.dx || 0), sk, b.h);
  if (sc.hop) s += `<path d="M${f1(K.panelW - 4)} ${f1(K.floorY - 15)} L${f1(K.cx + 62)} ${f1(K.floorY - 15)} Q${f1(K.cx + 50)} ${f1(sk - 30)} ${f1(K.cx + 23 + 15)} ${f1(sk - 18)}" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6" stroke-linecap="round"/>`;
  for (const b of balls) {
    if (b.hidden) continue;
    const x = K.cx + (b.dx || 0), top = sk - b.h - K.d;
    if (b.trail) s += `<line x1="${f1(x)}" y1="${f1(sk - 2)}" x2="${f1(x)}" y2="${f1(top + K.d + 4)}" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6" stroke-linecap="round"/>`;
    s += ballSvg(x, top, K.d, { sq: b.seat ? 0.92 : b.h === 0 ? 0.82 : 1 });
    if (b.dir === 'up') s += chevron(x, top - 10, true);
    if (b.dir === 'down') s += chevron(x, top + K.d + 13, false);
  }
  if (sc.cloud) s += cloudSvg(K.cx, K.skinY - 0.9 * K.Hp, 128, 0.3 * K.Hp + 30); // 구름은 공 위에 다시 그려 공이 구름 뒤로 숨음
  if (sc.cloudDown) s += chevron(K.cx, K.skinY - 0.9 * K.Hp + 14, false); // 숨은 채 내려옴(구름 아랫변 밑 꺾쇠)
  if (sc.lines) s += bounceLines(K.cx + (sc.lineDx || 0), sk, K.d, sc.lines);
  if (sc.dots != null || sc.halves) s += lenDots(K.cx, 252, sc.dots || 0, sc.dotGap || 16, sc.halves || 0);
  if (sc.finger) s += fingerSvg(K.cx + K.drumW / 2 + 0.7 * K.d, K.floorY + 22, 1.5 * K.d, sc.press, sc.taps || 1);
  return s;
}

const B = CARD.beatPx;
// 카드 정의: gid = balance.json gimmicks 의 id(파일 이름은 그 gimmicks.<id>.card 키), 칸 3개. 그림 = 그 레벨에서 바로 뒤에 처음 만나는 실제 장면(insights runner-01, 1-2 D13)
export const DEFS = [
  { gid: 'B1', what: '기본 통: 공이 내려와 북에 닿을 때 톡 → 다시 올라감(원인 → 결과)', first: 'L1 받침 쉼 뒤 토스 → 1박 통', panels: [
    { balls: [{ h: B, dir: 'down' }], dots: 1 },
    { balls: [{ h: 0 }], finger: true, press: true, lines: 1, dots: 1 },
    { balls: [{ h: B, dir: 'up', trail: true }], dots: 1 }] },
  { gid: 'G1', what: '큰 통: 낮게(1박) / 높이(2박) — 높이 뜨면 오래', first: 'L2 1박 통 3번 뒤 첫 2박 통', panels: [
    { balls: [{ h: B, trail: true }], dots: 1 },
    { balls: [{ h: 2 * B, trail: true }], dots: 2 },
    { balls: [{ h: 0 }], finger: true, press: true, lines: 1 }] },
  { gid: 'G2', what: '구름 통: 앉은 공이 구름 속으로 뜸 → 숨은 채 그림자만(작게), 내려옴 → 닿을 때 톡(그림자 큼)', first: 'L3 구절 2 토스 → 4박 구름 통', panels: [
    { balls: [{ h: 0.45 * B, dir: 'up', trail: true }], cloud: true, dots: 4, dotGap: 14 },
    { balls: [{ h: 150, hidden: true }], cloud: true, cloudDown: true, dots: 4, dotGap: 14 },
    { balls: [{ h: 0 }], cloud: true, finger: true, press: true, lines: 1 }] },
  { gid: 'G3', what: '점 통: 길게 · 길게 · 짧게(1.5 + 1.5 + 1박)', first: 'L4 1박 통 4번 뒤 1.5·1.5·1', panels: [
    { balls: [{ h: 1.5 * B, trail: true }], dots: 1.5 },
    { balls: [{ h: 1.5 * B, trail: true }], dots: 1.5 },
    { balls: [{ h: B, trail: true }], dots: 1 }] },
  { gid: 'G4', what: '통통: 큰 통 뒤에 낮게 두 번(누름 표시 2개)', first: 'L5 구절 2 토스 → 2박 → 반박 2번', panels: [
    { balls: [{ h: 2 * B, trail: true }], dots: 2 },
    { balls: [{ h: 0.5 * B, trail: true }], halves: 1 },
    { balls: [{ h: 0 }], finger: true, press: true, taps: 2, lines: 1, halves: 2 }] },
  { gid: 'G5', what: '두 공: 공 2 가 깡충 들어와 앉음 → 왼 공 닿을 때 톡(오른 공은 꼭대기) → 오른 공 닿을 때 톡(왼 공은 꼭대기)', first: 'L6 구절 2 받침 쉼에 공 2 들어옴, 토스 1박 어긋남, 2박 통 번갈아', panels: [
    { balls: [{ h: 0, dx: -23, seat: true }, { h: 0, dx: 23, seat: true }], hop: true },
    { balls: [{ h: 0, dx: -23 }, { h: 2 * B, dx: 23, trail: true }], finger: true, press: true, lines: 1, lineDx: -23, dots: 1 },
    { balls: [{ h: 2 * B, dx: -23, trail: true }, { h: 0, dx: 23 }], finger: true, press: true, lines: 1, lineDx: 23, dots: 1 }] },
  { gid: 'G7', what: '드르륵: 큰 통 뒤 낮게 네 번(작은 점 4개, 누름 표시 4개)', first: 'L8 구절 2 토스 → 2박 → 반박 4번', panels: [
    { balls: [{ h: 2 * B, trail: true }], dots: 2 },
    { balls: [{ h: 0.5 * B, trail: true }], halves: 4, dotGap: 12 },
    { balls: [{ h: 0 }], finger: true, press: true, taps: 4, lines: 1 }] },
  { gid: 'R1', what: '세 박 통: 앉은 공(받침 쉼) → 아주 높이(3박) → 닿을 때 톡', first: 'L7 구절 2 받침 쉼 뒤 토스가 곧 3박 비행', panels: [
    { balls: [{ h: 0, seat: true }], dots: 0 },
    { balls: [{ h: 3 * B, dir: 'down', trail: true }], dots: 3 },
    { balls: [{ h: 0 }], finger: true, press: true, lines: 1 }] },
];

export function cardKeys() {
  const bal = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
  const g = bal.gimmicks || {};
  return Object.fromEntries(Object.entries(g).filter(([k, v]) => !k.startsWith('_') && v && v.card).map(([k, v]) => [k, { key: v.card, level: v.level }]));
}

function cardSvg(def, level) {
  const T = P.themes['level' + level];
  const parts = [`<rect x="4" y="4" width="712" height="328" rx="${CARD.rx}" fill="${T.cardBg}" stroke="${T.accent}" stroke-width="${CARD.border}"/>`];
  def.panels.forEach((sc, i) => {
    parts.push(`<g transform="translate(${CARD.panelX[i]} ${CARD.panelY})">${panel('level' + level, sc)}</g>`);
    if (i < 2) { const ax = CARD.panelX[i] + CARD.panelW + 5, ay = CARD.panelY + CARD.panelH / 2; parts.push(`<polygon points="${ax},${ay - 9} ${ax + 15},${ay} ${ax},${ay + 9}" fill="${C.ink}"/>`); }
  });
  return parts.join('\n');
}

function writeCard(def, key, level) {
  const body = cardSvg(def, level);
  writeFileSync(join(CARDS, `${key}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD.W} ${CARD.H}" width="${CARD.W}" height="${CARD.H}">\n<!-- ${key} (기믹 ${def.gid}, 레벨 ${level}): ${def.what}. 첫 등장: ${def.first}. tools/art/cards.mjs 생성, 손으로 고치지 않음. 글 없음. 30-art 8절 -->\n${body}\n</svg>\n`);
  const T = P.themes['level' + level];
  const parts = [`<rect x="${CARD.border / 2}" y="${CARD.border / 2}" width="${PW - CARD.border}" height="${PH - CARD.border}" rx="24" fill="${T.cardBg}" stroke="${T.accent}" stroke-width="${CARD.border}"/>`];
  CARD.panelX.forEach((px, i) => {
    const y = CARD.pad + i * (CARD.panelH + CARD.gap);
    parts.push(`<svg x="${CARD.pad}" y="${y}" width="${CARD.panelW}" height="${CARD.panelH}" viewBox="${px} ${CARD.panelY} ${CARD.panelW} ${CARD.panelH}"><use href="#${key}-all"/></svg>`);
    if (i < 2) { const ay = y + CARD.panelH + (CARD.gap - 14) / 2, cx = PW / 2; parts.push(`<polygon points="${cx - 12},${ay} ${cx + 12},${ay} ${cx},${ay + 14}" fill="${C.ink}"/>`); }
  });
  writeFileSync(join(CARDS, `${key}_portrait.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW}" height="${PH}">\n<!-- ${key} 세로 화면판 (가로판 그림을 칸별로 다시 씀). tools/art/cards.mjs 생성. 30-art 8절 -->\n<defs><g id="${key}-all">${body.replace(/<polygon points="[^"]+" fill="#[0-9A-F]+"\/>\n?/g, '')}</g></defs>\n${parts.join('\n')}\n</svg>\n`);
}

// 레벨 선택 카드(글·숫자 없음). 상태: 클리어(등급 3칸 중 받은 칸 채움), 미클리어(최고 진행도 막대 + 공 색 점), 안 해 봄(빈 막대·빈 3칸), 잠김.
// 1-2 D12: 등급은 늘 3칸(빈 칸 점선), 카드 테두리 **바깥 아래 줄**에 놓아 카드 그림(L3 구름)과 섞이지 않음. D14: 일반 모드 기록만(연습 표시 없음).
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
  const fy = y + h * 0.66;
  s += `<rect x="${x + 2}" y="${f1(fy)}" width="${w - 4}" height="${f1(h * 0.34 - 2)}" fill="${T.floor}"/>`;
  const dW = w * 0.34, dH = dW * 0.3, dx = x + w / 2, bd = dW * 0.32;
  if (lv === '03') {
    // L3 솜구름 하늘: 큰 플레이 구름 1개(카드 너비 0.62) + 그 아래로 반쯤 숨은 공(구름 통 장면). 등급 구름과 크기·자리가 다름
    const cw = w * 0.62, chh = h * 0.3, cb = y + h * 0.38;
    s += `<ellipse cx="${f1(dx)}" cy="${f1(fy - dH - 0)}" rx="${f1(bd * 0.32)}" ry="${f1(bd * 0.06)}" fill="${C.shadow}"/>`;
    s += ballSvg(dx, cb - bd * 0.5, bd);
    s += cloudSvg(dx, cb, cw, chh);
  } else {
    s += sil(lv, x + 2, y + 2, w - 4, fy - y - 2, T);
    s += ballSvg(dx, fy - dH - bd - h * 0.12, bd);
  }
  s += `<rect x="${f1(dx - dW / 2)}" y="${f1(fy - dH)}" width="${f1(dW)}" height="${f1(dH)}" rx="4" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="2"/><rect x="${f1(dx - dW / 2)}" y="${f1(fy - dH)}" width="${f1(dW)}" height="${f1(dH * 0.3)}" rx="2" fill="${C.skin}" stroke="${C.ink}" stroke-width="2"/>`;
  s += `</g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="none" stroke="${T.accent}" stroke-width="4"/>`;
  // 진행도 막대(카드 안 아래, 일반 모드 최고 진행도만)
  const bx = x + 10, bw = w - 20, by = y + h - 18;
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="10" rx="5" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>`;
  if (st.best > 0) s += `<rect x="${bx + 2}" y="${by + 2}" width="${f1((bw - 4) * st.best)}" height="6" rx="3" fill="${C.drumBody}"/>`;
  if (st.best > 0 && st.best < 1) s += `<circle cx="${f1(bx + bw * st.best)}" cy="${by + 5}" r="6" fill="${C.ball}" stroke="${C.ink}" stroke-width="2"/>`;
  // 등급 3칸: 카드 바깥 아래 줄, 늘 3칸
  for (let i = 0; i < 3; i++) { const gx = x + w / 2 + (i - 1) * 24, gy = y + h + 12; s += i < (st.grade || 0) ? miniCloud(gx, gy, 18, T.accent) : miniCloud(gx, gy, 18, 'none', true); }
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
  for (const e of (T.silhouette || [])) {
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

function objects() {
  const w = (name, vb, body, note) => writeFileSync(join(PROJ, 'assets', name), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">\n<!-- ${note} tools/art/cards.mjs 생성 -->\n${body}\n</svg>\n`);
  w('obj-ball.svg', '0 0 64 64', ballSvg(32, 2, 60), '공: 붉은 원 + 외곽선(0.08d) + 왼쪽 위 짧은 빛 호. 줄무늬·하이라이트 점·꼬리 없음.');
  w('obj-drum.svg', '0 0 200 64', drumSvg(100, 2, 192, 57, 16.8), '북: 가로로 넓은 둥근 사각형(너비 3.2d, 높이 0.95d) + 윗면 가죽 띠(0.28d). 원형 북 아님.');
  w('obj-cloud.svg', '0 0 260 120', cloudSvg(130, 116, 250, 110), '구름: 평평한 아랫변 + 원 3개. 공이 이 뒤로 숨음.');
  w('obj-finger.svg', '0 0 80 110', fingerSvg(40, 92, 86, true), '튜토리얼 손가락(누름). 북 오른쪽 바닥 위, 손끝 아래.');
  w('obj-grade-cloud.svg', '0 0 120 40', miniCloud(20, 20, 32, P.themes.level01.accent) + miniCloud(60, 20, 32, P.themes.level01.accent) + miniCloud(100, 20, 32, 'none', true), '등급 3칸(채움 = 받음, 점선 = 빈 칸, 늘 3칸). lore grade_1~3. 예: 구름 둘.');
  w('obj-flag.svg', '0 0 40 40', flag(12, 36, 30), '연습 깃발(자동 체크포인트 표시, 버튼 아님).');
  const g = [0, 1, 2].map((n, i) => `<g transform="translate(${i * 130} 0)">${drumSvg(65, 90, 96, 28, 8.4, { glow: n === 2 })}${ballSvg(65, 60, 30, { sq: [0.92, 0.85, 0.75][n] })}${bounceLines(65, 90, 30, n)}</g>`).join('');
  w('obj-grade-fx.svg', '0 0 400 130', g, '판정 반응 3단계(왼→오: 통과 / 좋아 / 딱). 세로 튐 선 0·1·2쌍 + 공 납작 0.92·0.85·0.75, 딱만 가죽 glow. 흑백에서도 선 개수로 구분. 원호(물결) 없음.');
  // 실패 2종(1-2 D9): 왼쪽 = 일찍(헛스윙 바람선, 공이 그대로 내려와 북 왼쪽 옆으로 떨어져 굴러 멈춤), 오른쪽 = 늦음(가죽 위 납작히 기다렸다가 북 오른쪽 끝으로 굴러 떨어짐). 점선 = 지나온 길, 흐린 공 = 지나온 자리(같은 붉은 색, 외곽선만 점선)
  const ghost = (x, y, d) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(d / 2)}" fill="none" stroke="${C.ink}" stroke-width="2" stroke-dasharray="3 3"/>`;
  const fl = 110, sk = fl - 28, dd = 30;
  const early = `<rect x="0" y="${fl}" width="200" height="30" fill="${P.themes.level01.floor}"/>${drumSvg(110, sk - 6.6, 96, 28, 8.4)}${swingLines(110, sk - 6.6, 96)}` +
    ghost(110, 20, dd) + `<path d="M110 36 Q 104 70 ${f1(110 - 48 - 19)} ${f1(sk - 4)} L ${f1(110 - 48 - 19)} ${f1(fl - 16)} L 26 ${f1(fl - 16)}" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6"/>` + ballSvg(26, fl - dd, dd);
  const late = `<rect x="0" y="${fl}" width="200" height="30" fill="${P.themes.level01.floor}"/>${drumSvg(90, sk, 96, 28, 8.4)}` + ghost(90, sk - dd / 2, dd) +
    `<path d="M106 ${f1(sk - 14)} L ${f1(90 + 48 + 8)} ${f1(sk - 10)} Q ${f1(90 + 48 + 20)} ${f1(sk)} ${f1(90 + 48 + 20)} ${f1(fl - 16)} L 176 ${f1(fl - 16)}" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6"/>` + ballSvg(176, fl - dd, dd);
  w('obj-fail.svg', '0 0 420 140', `<g>${early}</g><g transform="translate(220 0)">${late}</g>`, '실패 2종(글 없음, 먼지 없음). 왼쪽 일찍 = 헛스윙(북 톡 + 바람선) 뒤 공이 같은 포물선으로 내려오며 북 왼쪽 옆으로 비껴 떨어져 굴러 멈춤(움직임 ≤ 0.6 s). 오른쪽 늦음 = 가죽 위 납작히 기다렸다 북 오른쪽 끝으로 굴러 떨어짐(0.45 s). 점선 원·선 = 지나온 자리(목업 표시, 빌드는 공 하나만).');
  // 공 2 들어옴·나감(1-2 D13)
  const enter = `<rect x="0" y="${fl}" width="200" height="30" fill="${P.themes.level06.floor}"/>${drumSvg(80, sk, 96, 28, 8.4)}` + ballSvg(80 - 23, sk - dd * 0.92, dd, { sq: 0.92 }) +
    `<path d="M198 ${f1(fl - 15)} L ${f1(80 + 48 + 22)} ${f1(fl - 15)} Q ${f1(80 + 48 + 8)} ${f1(sk - 26)} ${f1(80 + 23)} ${f1(sk - 15)}" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6"/>` + ballSvg(80 + 23, sk - dd * 0.92, dd, { sq: 0.92 });
  const exit = `<rect x="0" y="${fl}" width="200" height="30" fill="${P.themes.level06.floor}"/>${drumSvg(80, sk, 96, 28, 8.4)}` + ballSvg(80, sk - dd * 0.92, dd, { sq: 0.92 }) + ghost(80 + 23, sk - dd / 2, dd) +
    `<path d="M${f1(80 + 40)} ${f1(sk - 12)} Q ${f1(80 + 48 + 16)} ${f1(sk - 4)} ${f1(80 + 48 + 16)} ${f1(fl - 16)} L 198 ${f1(fl - 16)}" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 6"/>` + ballSvg(184, fl - dd, dd);
  w('obj-second-ball.svg', '0 0 420 140', `<g>${enter}</g><g transform="translate(220 0)">${exit}</g>`, '두 공 구절(L6·L9 등)의 공 2. 왼쪽 들어옴 = 받침 쉼 동안 화면 오른쪽 밖 바닥에서 굴러와 북 오른쪽 옆에서 낮게 깡충(≤ 0.5d, 소리 없음) 가죽 오른쪽 자리(+0.78d)에 앉음, 공 1 은 왼쪽 자리(−0.78d)로 미끄러짐. 오른쪽 나감 = 착지 뒤 북 오른쪽 끝에서 굴러 떨어져 화면 밖으로, 공 1 은 가운데로. 점선 = 지나온 길(목업 표시).');
}

// ---------- 검사 ----------
export function checkCards() {
  const out = []; let fail = 0;
  const ok = (n, p, m) => { out.push(`${p ? 'OK  ' : 'FAIL'} ${n}: ${m}`); if (!p) fail++; };
  let keys = {};
  try { keys = cardKeys(); } catch (e) { ok('balance.json gimmicks', false, `읽기 실패(대기: balance 수정 중?) ${e.message}`); return { out, fail }; }
  let strings = null;
  try { strings = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8')); } catch (e) { ok('strings.json', false, `읽기 실패(대기: lore 수정 중?) ${e.message}`); }
  const defIds = DEFS.map((d) => d.gid).sort(), gIds = Object.keys(keys).sort();
  ok('카드 정의 = balance gimmicks', defIds.join() === gIds.join(), `DEFS ${defIds.join(',')} / gimmicks ${gIds.join(',')}`);
  const want = new Set();
  for (const [gid, { key, level }] of Object.entries(keys)) {
    for (const f of [`${key}.svg`, `${key}_portrait.svg`]) { want.add(f); ok(`파일 ${f}`, existsSync(join(CARDS, f)), `기믹 ${gid} 레벨 ${level}`); }
    if (strings) ok(`문구 ${key}`, !!strings[key], `strings.json 키 ${strings[key] ? '있음' : '없음(대기: lore)'}`);
  }
  const extra = existsSync(CARDS) ? readdirSync(CARDS).filter((f) => f.endsWith('.svg') && !want.has(f)) : [];
  ok('남은 카드 파일 없음', !extra.length, extra.length ? `쓰이지 않는 파일 ${extra.join(', ')}` : `카드 ${want.size / 2}장 × 2판만 있음(G6·1-0 id 이름 없음, 1-2 D1·D2)`);
  return { out, fail };
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/art/cards.mjs');
if (isMain) await main();
async function main() {
  const args = process.argv.slice(2);
  let fail = 0;
  if (!args.includes('--check')) {
    mkdirSync(CARDS, { recursive: true });
    const keys = cardKeys();
    const keep = new Set();
    for (const d of DEFS) { const k = keys[d.gid]; if (!k) { console.log(`대기: balance gimmicks 에 ${d.gid} 없음`); continue; } writeCard(d, k.key, k.level); keep.add(`${k.key}.svg`); keep.add(`${k.key}_portrait.svg`); }
    // 1-2 D1·D2: 1-0 기믹 id 이름(card_B1…)·G6 카드 파일 삭제 — assets/cards 안에서 이번 키 세트 밖 파일만
    for (const f of readdirSync(CARDS)) if (f.endsWith('.svg') && !keep.has(f)) { rmSync(join(CARDS, f)); console.log(`지움 assets/cards/${f}`); }
    objects();
    console.log(`카드 ${keep.size / 2}장 × 2판, 오브젝트 SVG 9개 씀(레벨 선택 목업은 icons.mjs)`);
  }
  const cc = checkCards();
  for (const x of cc.out) console.log(x);
  fail += cc.fail;
  console.log('| 화면 | 판 | 배율(보조 글 한 줄 28 px 비움) | 카드 px | 카드 속 공 px | 결과 |');
  console.log('|---|---|---|---|---|---|');
  for (const [W, H, st, sb] of [[360, 640, 0, 0], [360, 640, 24, 24], [412, 915, 24, 34], [360, 560, 0, 0], [640, 360, 0, 0], [1280, 720, 0, 0]]) {
    const portrait = H > W;
    const s = portrait ? portraitScale(W, H, st, sb) : landscapeScale(W, H, st, sb);
    const ball = s * CARD.d, ok = ball >= CARD.minBallPx;
    if (!ok) fail++;
    console.log(`| ${W}x${H} safe ${st}/${sb} | ${portrait ? '세로' : '가로'} | ${s.toFixed(3)} | ${((portrait ? PW : CARD.W) * s).toFixed(0)}×${((portrait ? PH : CARD.H) * s).toFixed(0)} | ${ball.toFixed(1)} | ${ok ? '통과' : '실패'} |`);
  }
  console.log(`(참고) 360x640 에 가로판을 띄우면 배율 ${landscapeScale(360, 640).toFixed(3)}, 공 ${(landscapeScale(360, 640) * CARD.d).toFixed(1)} px → 세로판 필수`);
  console.log(fail ? `cards FAIL ${fail}` : 'cards OK (카드 키 = balance gimmicks = 파일 = strings, 남은 파일 없음, 카드 속 공 ≥ 16 px)');
  process.exit(fail ? 1 : 0);
}
