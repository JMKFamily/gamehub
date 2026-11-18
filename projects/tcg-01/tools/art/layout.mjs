// 대전 화면 배치 계산기 (art-director 1-1). 해상도마다 사각형(x,y,w,h px)을 계산하고 겹침·터치 크기를 검사.
// 사용: node tools/art/layout.mjs --check   (build.mjs가 art.json layout.screens에 결과를 넣음)
import { layoutInput as L0 } from './spec.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// 1-2: 필드 칸·손패 상한은 balance.json rules가 원본(board_limit 5, hand_limit 10 확정)
const BAL = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'balance.json');
const rules = existsSync(BAL) ? JSON.parse(readFileSync(BAL, 'utf8')).rules : {};
export const L = { ...L0, board_slots: rules.board_limit ?? L0.board_slots, hand_limit: rules.hand_limit ?? L0.hand_limit, source: existsSync(BAL) ? 'balance.json rules' : 'spec 가정' };

export const RESOLUTIONS = [[360, 640], [412, 915], [640, 360], [1280, 720]];
const r = (x, y, w, h, extra = {}) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), ...extra });

function boardSlots(x0, y0, W, slotW, slotH, gap, n) {
  const total = n * slotW + (n - 1) * gap, sx = x0 + (W - total) / 2;
  return Array.from({ length: n }, (_, i) => r(sx + i * (slotW + gap), y0, slotW, slotH));
}

function portrait(w, h, n) {
  const g = L.gutter_px, s = Math.min(w / 360, h / 640, 1.35), W = w - 2 * g, gap = L.slot_gap_px;
  const slotW = Math.floor((W - (n - 1) * gap) / n), slotH = Math.round(slotW * L.slot_aspect_h_w_ratio);
  const R = Math.round(72 * s), mid = Math.max(52, Math.round(52 * s));
  const handCardW = Math.round(Math.min(W / 4.2, 0.13 * h)), handCardH = Math.round(handCardW * 1.4);
  const base = L.safe_top_px + R + slotH + mid + slotH + R + handCardH * 1.1 + L.safe_bottom_px;
  const extra = Math.max(0, h - base), pad = extra / 6; // 남는 높이는 줄 사이에 고르게
  let y = L.safe_top_px + pad;
  const E = {};
  // 상대 줄: [심지][호명자][호명술 표시][손패 수][남은 영장]
  const heroW = Math.round(R * 0.9), btn = Math.max(L.touch_min_px, Math.round(56 * s));
  E.enemy_row = r(g, y, W, R, { kind: 'container' });
  E.enemy_wicks = r(g, y + R * 0.3, Math.round(W * 0.28), R * 0.4, { kind: 'display' });
  E.enemy_hero = r(g + W * 0.3, y, heroW, R, { kind: 'target' });
  E.enemy_calling = r(g + W * 0.3 + heroW + 8, y + (R - btn) / 2, btn, btn, { kind: 'display_tap_info' });
  E.enemy_hand = r(g + W * 0.3 + heroW + 16 + btn, y + R * 0.15, W - (W * 0.3 + heroW + 16 + btn) - 60, R * 0.7, { kind: 'display' });
  E.enemy_deck = r(g + W - 56, y + R * 0.2, 56, R * 0.6, { kind: 'display' });
  y += R + pad;
  E.enemy_board = r(g, y, W, slotH, { kind: 'container' });
  E.enemy_slots = boardSlots(g, y, W, slotW, slotH, gap, n);
  y += slotH + pad / 2;
  E.mid_band = r(g, y, W, mid, { kind: 'container' });
  E.log_button = r(g, y + (mid - 48) / 2, 48, 48, { kind: 'button' });
  E.turn_timer = r(g + 56, y + mid / 2 - 3, W - 56 - 64, 6, { kind: 'display' });
  E.my_deck = r(g + W - 56, y + (mid - 48) / 2, 56, 48, { kind: 'display' });
  y += mid + pad / 2;
  E.my_board = r(g, y, W, slotH, { kind: 'container' });
  E.my_slots = boardSlots(g, y, W, slotW, slotH, gap, n);
  y += slotH + pad;
  // 내 줄: [심지][호명자][호명술 버튼][숨 고르기 버튼] — 숨 고르기는 엄지가 닿는 오른쪽 아래 절반
  const endW = Math.max(96, Math.round(W * 0.28)), endH = Math.max(L.touch_min_px, Math.round(R * 0.72));
  E.my_row = r(g, y, W, R, { kind: 'container' });
  E.my_wicks = r(g, y + R * 0.3, Math.round(W * 0.28), R * 0.4, { kind: 'display' });
  E.my_hero = r(g + W * 0.3, y, heroW, R, { kind: 'target' });
  E.my_calling = r(g + W * 0.3 + heroW + 8, y + (R - btn) / 2, btn, btn, { kind: 'button' });
  E.end_breath = r(g + W - endW, y + (R - endH) / 2, endW, endH, { kind: 'button' });
  y += R + pad;
  const handTop = y;
  E.hand = r(g, handTop, W, h - L.safe_bottom_px - handTop, { kind: 'container', card_w: handCardW, card_h: handCardH, fan_max_rot_deg: 14, spread_rows: 2 });
  E.zoom_card = r((w - Math.min(W * 0.78, 300)) / 2, Math.max(L.safe_top_px, E.enemy_board.y - 10), Math.min(W * 0.78, 300), Math.min(W * 0.78, 300) * 1.4, { kind: 'overlay' });
  return { orientation: 'portrait', scale: +s.toFixed(3), slot_w: slotW, slot_h: slotH, E };
}

function landscape(w, h, n) {
  const g = L.gutter_px, s = Math.min(w / 640, h / 360), gap = L.slot_gap_px;
  const Lc = Math.round(136 * s), Rc = Math.round(112 * s);
  const cx = g + Lc + g, cw = w - 2 * g - Lc - Rc - 2 * g;
  const handCardW = Math.round(70 * s), handCardH = Math.round(handCardW * 1.4), peek = Math.round(handCardH * 0.5);
  const mid = Math.round(28 * s);
  const availH = h - L.safe_top_px - L.safe_bottom_px - peek - mid - 2 * 6 * s;
  let slotH = Math.floor(availH / 2), slotW = Math.floor(slotH / L.slot_aspect_h_w_ratio);
  if (n * slotW + (n - 1) * gap > cw) { slotW = Math.floor((cw - (n - 1) * gap) / n); slotH = Math.round(slotW * L.slot_aspect_h_w_ratio); }
  const E = {};
  let y = L.safe_top_px + 4 * s;
  E.enemy_board = r(cx, y, cw, slotH, { kind: 'container' });
  E.enemy_slots = boardSlots(cx, y, cw, slotW, slotH, gap, n);
  y += slotH + 6 * s;
  E.mid_band = r(cx, y, cw, mid, { kind: 'container' });
  E.turn_timer = r(cx, y + mid / 2 - 3, cw, 6, { kind: 'display' });
  y += mid + 6 * s;
  E.my_board = r(cx, y, cw, slotH, { kind: 'container' });
  E.my_slots = boardSlots(cx, y, cw, slotW, slotH, gap, n);
  const handTop = h - L.safe_bottom_px - peek;
  E.hand = r(cx, handTop, cw, peek + L.safe_bottom_px, { kind: 'container', card_w: handCardW, card_h: handCardH, peek_px: peek, raise_on_touch: true, fan_max_rot_deg: 10 });
  // 왼쪽 기둥: 상대 호명자 위, 내 호명자 아래
  const heroH = Math.round(Math.min(84 * s, (h - 16) * 0.3)), heroW = Math.round(heroH * 0.85), btn = Math.max(48, Math.round(52 * s));
  E.enemy_hero = r(g, L.safe_top_px, heroW, heroH, { kind: 'target' });
  E.enemy_calling = r(g + heroW + 6, L.safe_top_px + (heroH - btn) / 2, btn, btn, { kind: 'display_tap_info' });
  E.enemy_wicks = r(g, L.safe_top_px + heroH + 4, Lc, 18 * s, { kind: 'display' });
  E.my_hero = r(g, h - L.safe_bottom_px - heroH, heroW, heroH, { kind: 'target' });
  E.my_calling = r(g + heroW + 6, h - L.safe_bottom_px - heroH + (heroH - btn) / 2, btn, btn, { kind: 'button' });
  E.my_wicks = r(g, h - L.safe_bottom_px - heroH - 4 - 18 * s, Lc, 18 * s, { kind: 'display' });
  E.log_button = r(g, h / 2 - 24, 48, 48, { kind: 'button' });
  // 오른쪽 기둥
  const rx = w - g - Rc;
  E.enemy_hand = r(rx, L.safe_top_px, Rc, 40 * s, { kind: 'display' });
  E.enemy_deck = r(rx, L.safe_top_px + 44 * s, Rc, 30 * s, { kind: 'display' });
  // 1-2: 숨 고르기를 오른쪽 가운데(레퍼런스 자리)에서 오른쪽 아래 엄지 자리로 옮김
  const endH = Math.max(48, Math.round(52 * s));
  E.end_breath = r(rx, h - L.safe_bottom_px - endH, Rc, endH, { kind: 'button' });
  E.my_deck = r(rx, h - L.safe_bottom_px - endH - 8 * s - 30 * s, Rc, 30 * s, { kind: 'display' });
  const zh = Math.min(h * 0.86, 420);
  E.zoom_card = r((w - zh / 1.4) / 2, (h - zh) / 2, zh / 1.4, zh, { kind: 'overlay' });
  return { orientation: 'landscape', scale: +s.toFixed(3), slot_w: slotW, slot_h: slotH, E };
}

export function computeLayout(w, h, n = L.board_slots) { return w < h ? portrait(w, h, n) : landscape(w, h, n); }

const ov = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export function checkLayout(w, h, lay) {
  const errs = [], E = lay.E;
  const flat = [];
  for (const [k, v] of Object.entries(E)) {
    if (Array.isArray(v)) v.forEach((s, i) => flat.push([`${k}[${i}]`, s]));
    else if (v.kind !== 'container' && v.kind !== 'overlay') flat.push([k, v]);
  }
  flat.push(['hand', E.hand]);
  for (const [k, v] of flat) {
    if (v.x < 0 || v.y < 0 || v.x + v.w > w || v.y + v.h > h) errs.push(`${k} 화면 밖`);
    if ((v.kind === 'button' || v.kind === 'display_tap_info' || v.kind === 'target') && (v.w < L.touch_min_px || v.h < L.touch_min_px)) errs.push(`${k} 터치 ${v.w}x${v.h} < 48`);
  }
  for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++) if (ov(flat[i][1], flat[j][1])) errs.push(`겹침 ${flat[i][0]} ∩ ${flat[j][0]}`);
  // 보드 축소 카드 글자 크기(카드 규칙: 숫자 = slot_w × 0.26, 이름 = slot_w × 0.16)
  const statFont = Math.round(lay.slot_w * 0.26), nameFont = Math.round(lay.slot_w * 0.155);
  if (statFont < L.min_stat_font_px) errs.push(`보드 숫자 ${statFont}px < ${L.min_stat_font_px}`);
  if (nameFont < L.min_name_font_px) errs.push(`보드 이름 ${nameFont}px < ${L.min_name_font_px}`);
  // 손패 10장 펼침 상태 카드 폭 ≥ 48
  const perRow = Math.ceil(L.hand_limit / 2);
  const spreadW = lay.orientation === 'portrait' ? Math.floor((E.hand.w - (perRow - 1) * 4) / perRow) : Math.floor((w - 2 * L.gutter_px - (L.hand_limit - 1) * 4) / L.hand_limit); // 가로: 펼치면 화면 전체 폭 한 줄
  if (spreadW < 48) errs.push(`손패 펼침 카드 폭 ${spreadW} < 48`);
  return { errs, stat_font_px: statFont, name_font_px: nameFont, hand_spread_card_w_px: spreadW };
}

if (process.argv[1] && process.argv[1].endsWith('layout.mjs')) {
  let bad = 0;
  for (const [w, h] of RESOLUTIONS) {
    const lay = computeLayout(w, h), c = checkLayout(w, h, lay);
    console.log(`${w}x${h} ${lay.orientation} slot ${lay.slot_w}x${lay.slot_h} 숫자 ${c.stat_font_px}px 이름 ${c.name_font_px}px 펼침 ${c.hand_spread_card_w_px}px 손패카드 ${lay.E.hand.card_w}x${lay.E.hand.card_h}  ${c.errs.length ? 'FAIL ' + c.errs.join('; ') : 'OK'}`);
    bad += c.errs.length;
  }
  process.exit(bad ? 1 : 0);
}
