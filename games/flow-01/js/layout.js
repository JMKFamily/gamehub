// 화면 배치 계산: projects/flow-01/assets/check/layout.mjs 의 play/map/result/titleScreen/guardianScreen/errorScreen 식을
// 그대로 옮김(layout.json _source "화면 크기가 4해상도와 다르면 같은 식을 빌드가 그대로 옮겨 계산").
// 수치는 layout.json param 을 읽음. 4해상도에서 layout.json 값과 같은지는 tools/selfcheck.mjs 가 확인.
let P = null, STR = {};
export function initLayout(param, strings) { P = param; STR = strings; }

const kOf = (W, H) => Math.min(1.5, Math.max(1, Math.min(W, H) / 360));
const R = (x, y, w, h, extra = {}) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), ...extra });
const charW = (ch) => (/[ㄱ-힝]/.test(ch) ? 0.96 : ch === ' ' ? 0.30 : /[A-Z]/.test(ch) ? 0.66 : /[!.,'?]/.test(ch) ? 0.32 : 0.56);
export const textW = (s, px) => [...s].reduce((a, c) => a + charW(c), 0) * px;
function wrap(s, px, maxW) {
  const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (textW(t, px) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur);
  return lines;
}
const strs = (key) => (STR[key] ? Object.entries(STR[key]).map(([lang, v]) => [lang, v]) : [['ko', key]]);

export function play(W, H, cols, rows) {
  const k = kOf(W, H), portrait = H >= W;
  const btn = Math.round(P.btn * k), edge = Math.round(P.edge * k);
  const nameMax = Math.round(P.judge_font[0] * k), pct = Math.max(P.pct_min, Math.round(nameMax * P.pct_of_name));
  const slotH = Math.round(nameMax * 1.15 + pct * 1.25);
  const nameWidest = Math.max(...[1, 2, 3].flatMap((g) => strs(`judge_${g}_name`).map(([, v]) => textW(v, Math.round(P.judge_font[g - 1] * k)))), textW('100%', pct));
  const slotW = Math.ceil(nameWidest + 16);
  const padN = 2 * P.board_pad_of_cell;
  const o = { W, H, k, portrait, board_size: [cols, rows] };
  if (portrait) {
    const hudH = Math.round(P.hud_h * k), botH = Math.round(P.bottom_h * k);
    const availW = W - 2 * P.side_margin;
    const topMin = hudH + slotH + 12;
    const availH = H - botH - 8 - topMin;
    const cell = Math.min(P.cell_max, availW / (cols + padN), availH / (rows + padN));
    const bw = cell * (cols + padN), bh = cell * (rows + padN);
    const freeTop = topMin, freeBot = H - botH - 8;
    const by = Math.max(topMin, (freeTop + freeBot) / 2 - bh / 2);
    const bx = (W - bw) / 2;
    o.cell = +cell.toFixed(2);
    o.board = R(bx, by, bw, bh);
    o.grid = { x: +(bx + cell * P.board_pad_of_cell).toFixed(2), y: +(by + cell * P.board_pad_of_cell).toFixed(2), cell: o.cell };
    o.buttons = {
      map: R(edge, (hudH - btn) / 2, btn, btn, { icon: 'map', key: 'btn_map' }),
      undo: R(edge + 4, H - botH + (botH - btn) / 2, btn, btn, { icon: 'undo' }),
      help: R((W - btn) / 2, H - botH + (botH - btn) / 2, btn, btn, { icon: 'help' }),
      restart: R(W - edge - 4 - btn, H - botH + (botH - btn) / 2, btn, btn, { icon: 'restart' }),
    };
    const pd = Math.round(P.pair_d * Math.min(k, 1.2)), pp = Math.round(P.pair_pitch * Math.min(k, 1.2));
    o.pair_row = { kind: 'row', x0: edge + btn + 12, x1: W - edge, cy: Math.round(hudH / 2), d: pd, pitch: pp, align: 'center' };
    o.judge = { rule: 'portrait_band', y: Math.round(by - 6 - slotH), h: slotH, w: slotW, x_min: 8, x_max: W - 8, name_px: P.judge_font.map((v) => Math.round(v * k)), pct_px: pct };
    const txtTop = by + bh + 8, txtBot = H - botH - 4;
    const tf = Math.round(P.text_font * k);
    o.text_slots = { board_text: { ...R(16, txtTop, W - 32, txtBot - txtTop), font_px: tf, max_lines: 2, align: 'center' } };
    if (o.text_slots.board_text.h < tf * P.text_line * 1) {
      o.text_slots.board_text = { ...R(16, o.judge.y, W - 32, slotH), font_px: tf, max_lines: 2, align: 'center', shared_with: 'judge' };
    }
  } else {
    const availH = H - 2 * P.side_margin;
    const pillarMin = Math.max(btn + 2 * edge, slotW + 16, 3 * Math.round(P.pair_pitch * Math.min(k, 1.2)) + 16);
    const availW = W - 2 * pillarMin;
    const cell = Math.min(P.cell_max, availH / (rows + padN), availW / (cols + padN));
    const bw = cell * (cols + padN), bh = cell * (rows + padN);
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    o.cell = +cell.toFixed(2);
    o.board = R(bx, by, bw, bh);
    o.grid = { x: +(bx + cell * P.board_pad_of_cell).toFixed(2), y: +(by + cell * P.board_pad_of_cell).toFixed(2), cell: o.cell };
    const Lw = bx, Rx = bx + bw;
    o.pillars = { left: R(0, 0, Lw, H), right: R(Rx, 0, W - Rx, H) };
    o.buttons = {
      map: R(edge, edge, btn, btn, { icon: 'map', key: 'btn_map' }),
      restart: R(edge, H - edge - btn, btn, btn, { icon: 'restart' }),
      help: R(W - edge - btn, H - edge - btn - btn - Math.round(24 * k), btn, btn, { icon: 'help' }),
      undo: R(W - edge - btn, H - edge - btn, btn, btn, { icon: 'undo' }),
    };
    const pd = Math.round(P.pair_d * Math.min(k, 1.2)), pp = Math.round(P.pair_pitch * Math.min(k, 1.2));
    o.pair_row = { kind: 'grid3', x0: Rx + 8, x1: W - 8, y0: edge + Math.round(pd / 2), d: pd, pitch: pp, cols: 3 };
    const tf = Math.round(P.text_font_landscape * k);
    const Ltop = o.buttons.map.y + btn + 8, Lbot = o.buttons.restart.y - 8;
    const Rtop = o.pair_row.y0 + pp + Math.round(pd / 2) + 8, Rbot = o.buttons.help.y - 8;
    o.judge = { rule: 'landscape_pillar', h: slotH, w: slotW, name_px: P.judge_font.map((v) => Math.round(v * k)), pct_px: pct,
      left: { cx: Math.round(Lw / 2), y_min: Ltop, y_max: Lbot - slotH },
      right: { cx: Math.round(Rx + (W - Rx) / 2), y_min: Rtop, y_max: Rbot - slotH } };
    o.text_slots = { board_text: { ...R(8, Ltop, Lw - 16, Lbot - Ltop), font_px: tf, max_lines: 4, align: 'center', shared_with: 'judge.left' } };
  }
  const c = o.cell;
  o.px = {
    line_w: +(c * P.line_w_of_cell).toFixed(1), dot_d: +(c * P.dot_d_of_cell).toFixed(1), mark: +(c * P.dot_d_of_cell * P.mark_of_dot).toFixed(1),
    ring_d: +(c * P.ring_of_cell).toFixed(1), ring_w: +(c * P.ring_w_of_cell).toFixed(1), tile_inset: +(c * P.tile_inset_of_cell).toFixed(1), tile_r: +(c * P.tile_r_of_cell).toFixed(1),
    start_hit_extra: +(c * 0.25).toFixed(1), step_hysteresis: +(c * 0.20).toFixed(1),
  };
  o.card = (() => { const w = Math.min(P.card_w_max * k, W - 32, (H - 24) * P.card_aspect); const h = w / P.card_aspect; const cy = Math.min(Math.max(o.board.y + o.board.h / 2, h / 2 + 12), H - h / 2 - 12); return R((W - w) / 2, cy - h / 2, w, h); })();
  return o;
}

export function map(W, H) {
  const k = kOf(W, H), portrait = H >= W, node = Math.round(P.map_node * k), btn = Math.round(P.btn * k), edge = Math.round(P.edge * k);
  const titleH = Math.round(56 * k), starsH = Math.round(24 * k), barH = btn + 2 * edge;
  const nodes = [];
  if (portrait) {
    const y0 = titleH + starsH + node / 2 + 12, y1 = H - barH - node / 2 - 8;
    for (let i = 0; i < 10; i++) nodes.push([Math.round(W * (i % 2 ? 0.70 : 0.30)), Math.round(y0 + ((y1 - y0) * i) / 9)]);
  } else {
    const x0 = node / 2 + 40 * k, x1 = W - node / 2 - 40 * k;
    const top = titleH + starsH, avail = H - barH - 8 - top; for (let i = 0; i < 10; i++) nodes.push([Math.round(x0 + ((x1 - x0) * i) / 9), Math.round(top + avail * (i % 2 ? 0.72 : 0.28))]);
  }
  const fs = Math.round(P.small_font * k);
  const settings = R(W - edge - btn, H - edge - btn, btn, btn, { icon: 'settings', key: 'btn_settings', hold_ms: 1500 });
  return { W, H, k, node_d: node, nodes, title: R(edge + btn + 8, 8, W - 2 * (edge + btn + 8), titleH - 8, { font_px: Math.round(20 * k), key: 'map_screen' }),
    stars: R(W / 2 - 95 * k, titleH - 2, 190 * k, starsH, { star_px: Math.round(16 * k), pitch: Math.round(19 * k) }),
    buttons: { settings, sound: R(edge, edge, btn, btn, { icon: 'sound_on', key: 'settings_sound' }) },
    text_slots: { guardian_hold: { ...R(edge, settings.y, settings.x - 8 - edge, btn), font_px: fs, max_lines: 2, align: 'right', color: 'inkSoft' } },
    path: { w: Math.round(10 * k) } };
}

export function result(W, H) {
  const k = kOf(W, H), portrait = H >= W, S = Math.min(W, H), btn = Math.round(P.btn * k), big = Math.round(72 * k);
  const bs = Math.round(S * P.result_board_of_S), lnH = Math.round(28 * k), lnF = Math.round(P.level_name_font * k), nb = Math.round(28 * k);
  const band = (x, y, w) => R(x, y, w, lnH, { font_px: lnF, max_lines: 1 });
  const pctRow = (x, y, w, f) => R(x, y, w, 40 * k, { font_px: f });
  const nbOf = (p) => R(p.x + p.w + 4, p.y + (p.h - nb) / 2, nb, nb);
  const buttons = (cx, by) => ({ map: R(cx - big / 2 - 24 - btn, by + big / 2 - btn / 2, btn, btn), next: R(cx - big / 2, by, big, big), again: R(cx + big / 2 + 24, by + big / 2 - btn / 2, btn, btn) });
  if (portrait) {
    const by = Math.round(H * 0.20), titleY = by - Math.round(56 * k);
    const pct = pctRow(W / 2 - 90 * k, by + bs + 16 + 88 * k, 180 * k, Math.round(26 * k));
    return { W, H, k, level_name: band(16, titleY - lnH - 4, W - 32), mini_board: R((W - bs) / 2, by, bs, bs), title: R(16, titleY, W - 32, Math.round(44 * k), { font_px: Math.round(24 * k), max_lines: 1 }),
      star: R(W / 2 - 40 * k, by + bs + 16, 80 * k, 80 * k), pct, new_best: nbOf(pct), buttons: buttons(W / 2, H - 40 - big) };
  }
  const bx = Math.round(W * 0.30 - bs / 2), by = Math.round((H - bs) / 2), rx = Math.round(W * 0.66), lnY = Math.round(H * 0.05), tY = lnY + lnH + 6, sY = Math.round(H * 0.28);
  const pct = pctRow(rx - 90 * k, sY + 88 * k, 180 * k, Math.round(24 * k));
  return { W, H, k, level_name: band(W * 0.48, lnY, W * 0.48), mini_board: R(bx, by, bs, bs), title: R(W * 0.48, tY, W * 0.48, 40 * k, { font_px: Math.round(22 * k), max_lines: 1 }),
    star: R(rx - 40 * k, sY, 80 * k, 80 * k), pct, new_best: nbOf(pct), buttons: buttons(rx, H - 24 - big) };
}

function column(W, H, k) { const cw = Math.min(W - 32, Math.round(560 * k)); return { x: Math.round((W - cw) / 2), w: cw }; }
function textBlock(x, y, w, key, font, maxLines, extra = {}) {
  const lh = font * P.text_line, lines = Math.max(1, ...strs(key).map(([, v]) => wrap(v, font, w).length));
  return R(x, y, w, Math.ceil(Math.min(lines, maxLines) * lh), { font_px: font, max_lines: maxLines, ...extra });
}
export function titleScreen(W, H) {
  const k = kOf(W, H), col = column(W, H, k), btn = Math.round(P.btn * k), edge = Math.round(P.edge * k);
  const logo = R(W / 2 - 80 * k, H * 0.22, 160 * k, 64 * k);
  const name = textBlock(col.x, logo.y + logo.h + 12, col.w, 'title', Math.round(40 * k), 1, { align: 'center', weight: 800 });
  const tag = textBlock(col.x, name.y + name.h + 8, col.w, 'tagline', Math.round(20 * k), 2, { align: 'center', color: 'inkSoft' });
  const tap = textBlock(col.x, H - Math.round(64 * k), col.w, 'tap_to_start', Math.round(20 * k), 1, { align: 'center' });
  return { W, H, k, logo, buttons: { sound: R(edge, edge, btn, btn) }, text_slots: { title: name, tagline: tag, tap_to_start: tap } };
}
export function guardianScreen(W, H) {
  const k = kOf(W, H), col = column(W, H, k), btn = Math.round(P.btn * k), edge = Math.round(P.edge * k), gap = Math.round(12 * k);
  const fB = Math.round(16 * k), fL = Math.round(18 * k), fS = Math.round(P.small_font * k), tw = Math.round(64 * k);
  const ts = {}, ctl = {};
  ts.guardian_title = { ...textBlock(col.x, edge, col.w - btn - 8, 'guardian_title', Math.round(22 * k), 1, { align: 'left', weight: 800 }), h: btn };
  const close = R(col.x + col.w - btn, edge, btn, btn);
  let y = edge + btn + gap;
  ts.guardian_intro = textBlock(col.x, y, col.w, 'guardian_intro', fB, 14, { align: 'left' }); y += ts.guardian_intro.h + gap;
  const row = (key, note) => {
    ts[key] = { ...textBlock(col.x, y, col.w - tw - 12, key, fL, 1, { align: 'left' }), h: btn }; ctl[key] = R(col.x + col.w - tw, y, tw, btn, { kind: 'toggle' }); y += btn + 4;
    if (note) { ts[note] = textBlock(col.x, y, col.w, note, fS, 4, { align: 'left', color: 'inkSoft' }); y += ts[note].h + 4; }
    y += gap - 4;
  };
  row('settings_sound'); row('settings_vibrate', 'vibrate_note'); row('settings_motion');
  ts.settings_lang = textBlock(col.x, y, col.w, 'settings_lang', fL, 1, { align: 'left' }); y += ts.settings_lang.h + 6;
  const lw = Math.max(btn, Math.ceil(Math.max(...['lang_ko', 'lang_en'].flatMap((kk) => strs(kk).map(([, v]) => textW(v, fL)))) + 32));
  ctl.lang_ko = R(col.x, y, lw, btn, { kind: 'text_button', font_px: fL }); ctl.lang_en = R(col.x + lw + 12, y, lw, btn, { kind: 'text_button', font_px: fL }); y += btn + gap * 2;
  const rw = Math.max(btn, Math.ceil(Math.max(...strs('settings_reset').map(([, v]) => textW(v, fL))) + 32));
  ctl.settings_reset = R(col.x, y, Math.min(col.w, rw), btn, { kind: 'text_button', font_px: fL }); y += btn + edge;
  const cwid = Math.min(col.w, Math.round(320 * k)), cx = Math.round((W - cwid) / 2);
  const cText = textBlock(cx + 16, 0, cwid - 32, 'confirm_reset', Math.round(20 * k), 3, { align: 'center' });
  const bw2 = Math.max(btn, Math.ceil(Math.max(...['confirm_yes', 'confirm_no'].flatMap((kk) => strs(kk).map(([, v]) => textW(v, fL)))) + 32));
  const ch = 20 + cText.h + 16 + btn + 20, cy = Math.round((H - ch) / 2); cText.y = cy + 20;
  const confirm = { card: R(cx, cy, cwid, ch), text: cText, no: R(cx + cwid / 2 - 6 - bw2, cy + ch - 20 - btn, bw2, btn, { font_px: fL }), yes: R(cx + cwid / 2 + 6, cy + ch - 20 - btn, bw2, btn, { font_px: fL }) };
  return { W, H, k, column: col, content_h: y, scroll: y > H, buttons: { close }, controls: ctl, text_slots: ts, confirm };
}
export function errorScreen(W, H) {
  const k = kOf(W, H), col = column(W, H, k), big = Math.round(72 * k);
  const head = textBlock(col.x, 0, col.w, 'load_error', Math.round(24 * k), 2, { align: 'center', weight: 800 });
  const detail = textBlock(col.x, 0, col.w, 'load_error_detail', Math.round(16 * k), 3, { align: 'center', color: 'inkSoft' });
  const total = head.h + 12 + detail.h + 24 + big; let y = Math.round((H - total) / 2);
  head.y = y; y += head.h + 12; detail.y = y; y += detail.h + 24;
  return { W, H, k, text_slots: { head, detail }, buttons: { reload: R(W / 2 - big / 2, y, big, big) } };
}
