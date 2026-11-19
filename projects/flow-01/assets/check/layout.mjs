#!/usr/bin/env node
// flow-01 화면 배치 원본 + 검사 + 목업 (art-director). 30-art 3·4절.
//   node assets/check/layout.mjs            검사만 (layout.json 을 다시 계산해 비교 + 규칙 검사)
//   node assets/check/layout.mjs --write    layout.json + assets/mockups/*.svg 쓰고 검사
// 단위: CSS px. W·H = 화면, k = 크기 배율 clamp(min(W,H)/360, 1, 1.5). 판 크기 [cols, rows].
// 글 폭은 추정(한글 0.96 em, 라틴 0.58 em, 공백 0.30 em)으로 검사하고 실제 글꼴 폭은 qa 가 빌드 스크린샷으로 확인.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKS as MARKS6, MARKS_EXT, MARK_STROKE_UNIT, STAR, FINGER } from './shapes.mjs';
const MARKS = { ...MARKS6, ...MARKS_EXT }; // r3: 쌍 16개 표지(앞 6개 + 어려운 판 10개)
import { loadLevels, CARD_CELL } from './tutorial.mjs';
import { mix } from './color.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT = resolve(HERE, '../layout.json');
const PAL = JSON.parse(readFileSync(resolve(HERE, '../palette.json'), 'utf8'));
const BAL = JSON.parse(readFileSync(join(ROOT, 'balance.json'), 'utf8'));
const BAL_CARD_CLOSE = (function find(o) { if (o && typeof o === 'object') { if (typeof o.auto_close_ms === 'number') return o.auto_close_ms; for (const v of Object.values(o)) { const r = find(v); if (r != null) return r; } } return null; })(BAL);
const STR = existsSync(join(ROOT, 'strings.json')) ? JSON.parse(readFileSync(join(ROOT, 'strings.json'), 'utf8')) : {};

export const RES = [[360, 640], [412, 915], [640, 360], [1280, 720]];
export const BOARDS = [[4, 4], [5, 5], [5, 6], [6, 5], [6, 6]];

const PARAM = {
  side_margin: 12,      // 판 바깥 화면 여백(가장자리 뒤로 가기 제스처 영역을 피함)
  board_pad_of_cell: 0.06, // 판 카드가 칸 바깥으로 나온 폭
  cell_max: 96,
  cell_min: 48,
  cell_target: 56,
  tile_inset_of_cell: 0.05, tile_r_of_cell: 0.22, board_r_of_cell: 0.30,
  tile_dot_of_cell: 0.07,
  line_w_of_cell: 0.48, dot_d_of_cell: 0.74, mark_of_dot: 0.46, ring_of_cell: 0.86, ring_w_of_cell: 0.05, // r2 요청자 지시(2026-11-18) "선을 조금 얇게": 0.60 → 0.48(20 % 얇게). 점 0.74·표지 0.46 은 그대로라 점 > 선 차가 커져 끝점이 더 또렷함
  head_lead_of_cell: 0.5,   // 드래그 중 선 머리가 점유 칸 가운데에서 손가락 쪽으로 더 늘어나 보이는 최대 길이
  btn: 48, btn_gap: 12, edge: 12,
  hud_h: 64,             // 세로: 위 HUD 띠(홈·쌍 점 줄)
  bottom_h: 80,          // 세로: 아래 버튼 줄(되돌리기·도움·처음부터)
  pair_d: 36, pair_pitch: 44,
  judge_font: [38, 33, 28], // 판정 이름 1단·2단·3단 글자 크기(× k). 1-2: 34/31/28 → 38/33/28(단계 차를 벌림, 주 단서는 튐·조각·음 개수)
  pct_of_name: 0.55, pct_min: 15,
  text_font: 20, text_font_landscape: 18, text_line: 1.3,
  card_aspect: 1.5, card_w_max: 480, card_pad: 10, card_over_board: 6, // r2 S3: 카드 = 그림(3:2) + 아래 글 띠, 판 사각형(가로는 좌우 6 px까지) 안
  fill_bar_h: 6, fill_pct_font: 13, // r2 H3: 플레이 중 채움 = 판 바로 위 가는 막대 + 오른쪽 끝 작은 %
  judge_star_of_name: 0.6, // r2 S15: 1단 판정 이름 위 작은 별(이름 글자 크기의 0.6배)
  result_dot: 28, result_dot_pitch: 36, // r2 H3: 결과 쌍 점 줄
  pager_dot: 12, pager_pitch: 22, chapters: 5, pages: 6, // r2 50스테이지: 챕터 페이지 점. r3: 6번째 페이지 = 어려운 판 문 5개
  wide_cell: 56, wide_min_visible: 5, minimap_cell_min: 3, // r3 넓은 판: 플레이 칸(× min(k,1.2)), 보이는 칸 ≥ 5, 미니맵 칸 ≥ 3 px
  gate_d: 76, gate_star: 10, // r3 어려운 판 문 지름·별 칸 크기(× k)
  map_node: 64, result_board_of_S: 0.46,
  small_font: 14, level_name_font: 16, // 보호자 안내·guardian_hold / 결과 레벨 이름 띠
};
const kOf = (W, H) => Math.min(1.5, Math.max(1, Math.min(W, H) / 360));
const R = (x, y, w, h, extra = {}) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), ...extra });

// ---------- 글 폭 추정 ----------
const charW = (ch) => (/[ㄱ-힝]/.test(ch) ? 0.96 : ch === ' ' ? 0.30 : /[A-Z]/.test(ch) ? 0.66 : /[!.,'?]/.test(ch) ? 0.32 : 0.56);
export const textW = (s, px) => [...s].reduce((a, c) => a + charW(c), 0) * px;
function wrap(s, px, maxW) { // 낱말 단위(keep-all) 줄 나눔
  const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (textW(t, px) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur);
  return lines;
}
const strs = (key) => (STR[key] ? Object.entries(STR[key]).map(([lang, v]) => [lang, v]) : [['ko', key]]);

// ---------- 플레이 화면 ----------
function play(W, H, cols, rows) {
  const P = PARAM, k = kOf(W, H), portrait = H >= W;
  const btn = Math.round(P.btn * k), edge = Math.round(P.edge * k);
  const nameMax = Math.round(P.judge_font[0] * k), pct = Math.max(P.pct_min, Math.round(nameMax * P.pct_of_name));
  // r2 H3: % 는 판정 자리에서 빠지고 판 위 채움 막대 끝으로 감 → 판정 자리 = 이름 한 줄(+ 1단 별)
  const starPx = Math.round(nameMax * P.judge_star_of_name);
  const slotH = Math.round(nameMax * 1.3 + starPx * 0.9); // 1단 별은 이름 위 가운데(폭을 늘리지 않음 → 가로 기둥이 넓어지지 않음)
  const nameWidest = Math.max(...[1, 2, 3].flatMap((g) => strs(`judge_${g}_name`).map(([, v]) => textW(v, Math.round(P.judge_font[g - 1] * k)))));
  const slotW = Math.ceil(nameWidest + 16);
  const barH = Math.round(P.fill_bar_h * k), fpx = Math.round(P.fill_pct_font * k), barRowH = Math.max(barH, Math.round(fpx * 1.25)), pctW = Math.ceil(textW('100%', fpx) + 4);
  const fillBar = (bx, by, bw) => { const y = by - 4 - barRowH, cy = y + barRowH / 2, r = Math.round(bw * 0.04);
    return { row: R(bx + r, y, bw - 2 * r, barRowH), bar: R(bx + r, cy - barH / 2, bw - 2 * r - pctW - 6, barH, { radius: barH / 2, track: 'common.tile', fill: 'mix(지금 판 바탕 top, common.ink, 0.55) — 쌍 색 아님' }),
      pct: R(bx + bw - r - pctW, y, pctW, barRowH, { font_px: fpx, color: 'inkSoft', align: 'right' }),
      counts: 'connected_pairs_cells_only', anim_ms: 200, ease: 'out',
      _rule: '판 채움 = 연결된 쌍이 칠한 칸 / 판 칸(G3 그대로). 막대 길이가 주 신호, % 는 작게. 늘 보임, 연결·끊김 때 200 ms 로 늘고 줆. 판 완료 때 100 % 에서 150 ms 밝아졌다 그대로(번쩍임 없음, 밝기 변화 ≤ 20 %). % 글자는 값이 바뀔 때만 다시 그림. aria-hidden.' }; };
  const padN = 2 * P.board_pad_of_cell;
  const o = { W, H, k, portrait, board_size: [cols, rows] };
  if (portrait) {
    const hudH = Math.round(P.hud_h * k), botH = Math.round(P.bottom_h * k);
    const availW = W - 2 * P.side_margin;
    const topMin = hudH + slotH + 12 + barRowH + 4; // 판 위 판정 띠 + 채움 막대 줄
    const availH = H - botH - 8 - topMin;
    const cell = Math.min(P.cell_max, availW / (cols + padN), availH / (rows + padN));
    const bw = cell * (cols + padN), bh = cell * (rows + padN);
    const freeTop = topMin, freeBot = H - botH - 8;
    const by = Math.max(topMin, (freeTop + freeBot) / 2 - bh / 2); // 남는 높이를 위·아래 반씩
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
    const rowX0 = edge + btn + 12, rowX1 = W - edge;
    o.pair_row = { kind: 'row', x0: rowX0, x1: rowX1, cy: Math.round(hudH / 2), d: pd, pitch: pp, align: 'center', _rule: '쌍 수 n 개를 [x0,x1] 가운데 정렬, 간격 pitch' };
    o.fill_bar = fillBar(bx, by, bw);
    o.judge = { pct: 'fill_bar 로 옮김(r2 H3)', g1_star_px: starPx, rule: 'portrait_band', y: Math.round(by - 4 - barRowH - 6 - slotH), h: slotH, w: slotW, x_min: 8, x_max: W - 8, name_px: P.judge_font.map((v) => Math.round(v * k)),
      _rule: '판정 띠 = 채움 막대 줄 바로 위. 가로 가운데 = 연결된 짝 점의 x 를 [x_min + w/2, x_max − w/2]로 자름. 판 안·선·점·손가락 위에 그리지 않음(손은 아래에서 옴).' };
    const txtTop = by + bh + 8, txtBot = H - botH - 4;
    const tf = Math.round(P.text_font * k);
    o.text_slots = {
      board_text: { ...R(16, txtTop, W - 32, txtBot - txtTop), font_px: tf, max_lines: 2, align: 'center', used_by: ['tut_drag', 'gap_left'], coexists_with_card: false,
        _rule: '판 아래 ~ 버튼 줄 위. 튜토리얼 글(첫 연결 프레임에 사라짐)·빈칸 글(3번째 숨 쉬기에만, motion.gap_hint.text_on_breath)이 시간으로 나뉨. 판정 이름이 오면 gap_left 글은 그 프레임에 숨김.' },
    };
    if (o.text_slots.board_text.h < tf * P.text_line * 1) { // 공간이 모자라면 판정 띠를 같이 씀(시간으로 나뉨)
      o.text_slots.board_text = { ...R(16, o.judge.y, W - 32, slotH), font_px: tf, max_lines: 2, align: 'center', used_by: ['tut_drag', 'gap_left'], shared_with: 'judge', coexists_with_card: false,
        _rule: '판 아래 공간이 한 줄보다 좁아 판정 띠를 같이 씀. 튜토리얼 글은 첫 연결 전, 빈칸 글은 3번째 숨 쉬기에만. 우선순위: 판정 이름 > gap_left — 판정 이름이 오면 그 프레임에 gap_left 글을 숨기고 다시 띄우지 않음(그 숨 쉬기 동안).' };
    }
    o.thumb = { zone: R(0, H * 0.62, W, H * 0.38), _rule: '세로: 손가락·손바닥이 누른 점의 아래쪽을 가림. 판정 이름·쌍 점 줄·튜토리얼 글은 위쪽에, 빈칸 신호는 손을 뗀 뒤.' };
  } else {
    const availH = H - 2 * P.side_margin - (barRowH + 4);
    const pillarMin = Math.max(btn + 2 * edge, slotW + 16, 3 * Math.round(P.pair_pitch * Math.min(k, 1.2)) + 16);
    const availW = W - 2 * pillarMin;
    const cell = Math.min(P.cell_max, availH / (rows + padN), availW / (cols + padN));
    const bw = cell * (cols + padN), bh = cell * (rows + padN);
    const bx = (W - bw) / 2, by = (H - bh) / 2 + (barRowH + 4) / 2;
    o.cell = +cell.toFixed(2);
    o.board = R(bx, by, bw, bh);
    o.grid = { x: +(bx + cell * P.board_pad_of_cell).toFixed(2), y: +(by + cell * P.board_pad_of_cell).toFixed(2), cell: o.cell };
    const Lw = bx, Rx = bx + bw;
    o.fill_bar = fillBar(bx, by, bw);
    o.pillars = { left: R(0, 0, Lw, H), right: R(Rx, 0, W - Rx, H) };
    o.buttons = { // r2 S31: 세로와 같은 쪽 — 되돌리기 왼쪽 아래, 처음부터 오른쪽 아래(도움은 그 위)
      map: R(edge, edge, btn, btn, { icon: 'map', key: 'btn_map' }),
      undo: R(edge, H - edge - btn, btn, btn, { icon: 'undo' }),
      help: R(W - edge - btn, H - edge - btn - btn - Math.round(24 * k), btn, btn, { icon: 'help' }),
      restart: R(W - edge - btn, H - edge - btn, btn, btn, { icon: 'restart' }),
    };
    const pd = Math.round(P.pair_d * Math.min(k, 1.2)), pp = Math.round(P.pair_pitch * Math.min(k, 1.2));
    o.pair_row = { kind: 'grid3', x0: Rx + 8, x1: W - 8, y0: edge + Math.round(pd / 2), d: pd, pitch: pp, cols: 3, _rule: '오른쪽 기둥 위: 한 줄 3개, 넘치면 다음 줄(최대 2줄). 기둥 가운데 정렬.' };
    const tf = Math.round(P.text_font_landscape * k);
    const Ltop = o.buttons.map.y + btn + 8, Lbot = o.buttons.undo.y - 8;
    const Rtop = o.pair_row.y0 + pp + Math.round(pd / 2) + 8, Rbot = o.buttons.help.y - 8;
    o.judge = { pct: 'fill_bar 로 옮김(r2 H3)', g1_star_px: starPx, rule: 'landscape_pillar', h: slotH, w: slotW, name_px: P.judge_font.map((v) => Math.round(v * k)),
      left: { cx: Math.round(Lw / 2), y_min: Ltop, y_max: Lbot - slotH },
      right: { cx: Math.round(Rx + (W - Rx) / 2), y_min: Rtop, y_max: Rbot - slotH },
      side_rule: '2x + 1 < cols → left, 아니면 right', _rule: '판정 자리 = 방금 연결된 짝 점(손을 뗀 쪽 점)의 열 x 로 기둥을 고름: 2x + 1 < cols 면 왼쪽 기둥, 아니면 오른쪽 기둥. 폭이 홀수인 판(폭 5)의 가운데 열 x = 2 는 오른쪽 기둥(L3~L6 가운데 열 점, 검사 J1). 세로 가운데 = 그 점의 y 를 [y_min + h/2, y_max + h/2]로 자름. 판 위에 그리지 않음.' };
    o.text_slots = {
      board_text: { ...R(8, Ltop, Lw - 16, Lbot - Ltop), font_px: tf, max_lines: 4, align: 'center', used_by: ['tut_drag', 'gap_left'], shared_with: 'judge.left', coexists_with_card: false,
        _rule: '왼쪽 기둥 가운데. 판정 왼쪽 자리와 시간으로 나뉨(튜토리얼 글 = 첫 연결 전, 빈칸 글 = 3번째 숨 쉬기에만). 판정 이름이 오면 gap_left 글은 그 프레임에 숨김.' },
    };
    o.thumb = { zones: [R(0, H * 0.55, W * 0.22, H * 0.45), R(W * 0.78, H * 0.55, W * 0.22, H * 0.45)], _rule: '가로: 두 엄지가 아래 양 모서리에서 들어옴. 버튼은 기둥 아래(엄지 닿는 곳), 판정 자리는 기둥 가운데 위쪽.' };
  }
  const c = o.cell;
  o.px = {
    line_w: +(c * PARAM.line_w_of_cell).toFixed(1), dot_d: +(c * PARAM.dot_d_of_cell).toFixed(1), mark: +(c * PARAM.dot_d_of_cell * PARAM.mark_of_dot).toFixed(1),
    ring_d: +(c * PARAM.ring_of_cell).toFixed(1), ring_w: +(c * PARAM.ring_w_of_cell).toFixed(1), tile_inset: +(c * PARAM.tile_inset_of_cell).toFixed(1), tile_r: +(c * PARAM.tile_r_of_cell).toFixed(1),
    start_hit_extra: +(c * 0.25).toFixed(1), step_hysteresis: +(c * 0.20).toFixed(1),
  };
  o.card = (() => { // r2 S3: 카드 = 판 사각형 안(세로 화면: 폭은 화면 − 24 까지, 가로 화면: 판 폭 + 좌우 6 px 까지) — 판 밖 글 자리·판정 자리·쌍 점 줄·버튼·채움 막대를 덮지 않음
    const P = PARAM, tfc = Math.round((portrait ? P.text_font : P.text_font_landscape) * k), pad = Math.round(P.card_pad * k), b = o.board;
    // 가로: 오른쪽 기둥(쌍 점 격자·도움·처음부터)은 늘 보이는 HUD 라 판 오른쪽 + 6 px 까지만, 왼쪽은 왼쪽 버튼 열(지도·되돌리기) 안쪽까지 — 왼쪽 기둥의 글 자리·판정 자리는 카드와 같은 때 보일 수 없어서(아래 coexists_with_card) 덮어도 됨
    const xL = portrait ? 12 : Math.round(PARAM.edge * k) + Math.round(PARAM.btn * k) + 8, xR = portrait ? W - 12 : b.x + b.w + P.card_over_board;
    const maxW = Math.min(P.card_w_max * k, xR - xL);
    const lines = (w) => Math.max(1, ...['card_fill', 'card_hole'].flatMap((key) => strs(key).map(([, v]) => wrap(v, tfc, w - 2 * pad).length)));
    let w = maxW, band = 0;
    for (let i = 0; i < 4; i++) { band = Math.ceil(Math.min(2, lines(w)) * tfc * P.text_line + 2 * pad); w = Math.min(maxW, (b.h - band) * P.card_aspect); }
    const artH = w / P.card_aspect, h = artH + band, x = Math.min(Math.max(xL, b.x + b.w / 2 - w / 2), xR - w), y = b.y + (b.h - h) / 2;
    return { ...R(x, y, w, h), art: R(x, y, w, artH, { svg: 'tutorial/card-fill.svg | card-hole.svg (480x320, 비율 그대로 꽉 채움)' }), text: { ...R(x + pad, y + artH, w - 2 * pad, band - pad), font_px: tfc, max_lines: 2, align: 'center', used_by: ['card_fill', 'card_hole'] },
      radius: Math.round(20 * k), bg: '그 레벨 바탕 top(= 그림 바탕, 이음매 없음)', edge: 'common.boardEdge 1.5 px + 그림자 투명도 ≤ 0.10 흐림 1개(미리 그린 상자, 매 프레임 그림자 다시 계산 금지)',
      auto_close_ms: BAL_CARD_CLOSE ?? 6000, auto_close_source: 'balance.json auto_close_ms(원본)', close_ms: 200, input_through_on_close: true,
      _rule: '그림 카드(새 요소 소개): 판 가운데 위에 뜸. 설명 글은 카드 안 아래 띠(r2 S3 — 판 밖 board_text 를 쓰지 않음). 누르거나 balance.json auto_close_ms(6 s) 뒤 닫힘(r2 S29). 닫히기 시작한 프레임부터 판 누름은 판으로 감(S8). 카드 그림은 부팅 때 <img>(Blob URL) + decode() 로 미리 래스터(r2 성능).' };
  })();
  return o;
}

// ---------- 진행 지도 ----------
function map(W, H) {
  const k = kOf(W, H), portrait = H >= W, node = Math.round(PARAM.map_node * k), btn = Math.round(PARAM.btn * k), edge = Math.round(PARAM.edge * k);
  const titleH = Math.round(56 * k), starsH = Math.round(24 * k), barH = btn + 2 * edge; // 아래 띠: 톱니(보호자) + guardian_hold 글
  const pagerH = btn + 8; // r2 50스테이지: 아래 띠 바로 위 챕터 넘김 줄(◀ 점 5개 ▶)
  const nodes = [];
  if (portrait) {
    const y0 = titleH + starsH + node / 2 + 12, y1 = H - barH - pagerH - node / 2 - 8;
    for (let i = 0; i < 10; i++) nodes.push([Math.round(W * (i % 2 ? 0.70 : 0.30)), Math.round(y0 + ((y1 - y0) * i) / 9)]);
  } else {
    const x0 = node / 2 + 40 * k, x1 = W - node / 2 - 40 * k;
    const top = titleH + starsH, avail = H - barH - pagerH - 8 - top; for (let i = 0; i < 10; i++) nodes.push([Math.round(x0 + ((x1 - x0) * i) / 9), Math.round(top + avail * (i % 2 ? 0.72 : 0.28))]);
  }
  const fs = Math.round(PARAM.small_font * k);
  const settings = R(W - edge - btn, H - edge - btn, btn, btn, { icon: 'settings', key: 'btn_settings', _rule: 'r3 규약: 설정 = 일반 버튼(한 번 누르면 설정 화면). 길게 누르기·"어른은 …" 안내 글 없음.' });
  const pcy = H - barH - pagerH / 2, pd = Math.round(PARAM.pager_dot * k), pp = Math.round(PARAM.pager_pitch * k), dotsW = (PARAM.pages - 1) * pp + pd;
  const pager = { cy: Math.round(pcy), dots: R(W / 2 - dotsW / 2, pcy - pd / 2, dotsW, pd, { n: PARAM.pages, d: pd, pitch: pp, hit: R(W / 2 - dotsW / 2 - 6, pcy - btn / 2, dotsW + 12, btn), last_is_hard: true, hard_dot: 'r3: 6번째 점 = 작은 별 모양(star 면, 첫 문이 열리기 전에는 nodeLocked 면)' }),
    prev: R(W / 2 - dotsW / 2 - 14 - btn, pcy - btn / 2, btn, btn, { icon: 'page_prev', key: 'btn_page_prev' }), next: R(W / 2 + dotsW / 2 + 14, pcy - btn / 2, btn, btn, { icon: 'page_next', key: 'btn_page_next' }),
    swipe: { min_px: Math.round(48 * k), max_ms: 600 }, turn_ms: 260, ease: 'out',
    _rule: '한 페이지 = 한 챕터(10노드, 지금 지도 배치 그대로). 처음 열면 "다음" 노드가 있는 챕터. ◀▶ 또는 좌우 밀기(≥ 48k px, ≤ 600 ms)로 넘김, 260 ms 옆으로 밀려남(동작 줄이기면 겹쳐 흐려짐 150 ms). 점 5개: 지금 = pathDone 면 지름 1.0, 다른 열린 챕터 = pathTodo 면, 다 깬 챕터 = star 면, 잠긴 챕터 = nodeLocked 면 + 지름 0.75. 점을 누르면 그 챕터로. 첫 챕터에서 ◀, 마지막에서 ▶ 는 숨김(자리는 비움). 잠긴 챕터도 넘겨 볼 수 있음(노드 전부 잠김 실루엣, 누르면 아무 일 없음). 글·숫자 없음, 대체 글 aria_chapters·btn_page_prev·btn_page_next(lore). 페이지마다 바탕 = 그 챕터 1번째 레벨 바탕(menu 대신, 챕터 색 가족이 보임).' };
  return { W, H, k, node_d: node, nodes, pager, title: R(edge + btn + 8, 8, W - 2 * (edge + btn + 8), titleH - 8, { font_px: Math.round(20 * k), key: 'map_screen', chapter_keys: [1, 2, 3, 4, 5].map((c) => `chapter${c}_name`), _rule: '제목 = 지금 페이지 챕터 이름(lore chapterN_name, 없으면 map_screen). 자리만 art, 글은 lore.' }),
    stars: R(W / 2 - 5 * Math.round(19 * k), titleH - 2, 10 * Math.round(19 * k), starsH, { star_px: Math.round(16 * k), pitch: Math.round(19 * k), css: '#mStars svg { width: star_px; height: star_px }(인라인 SVG 원본 48 px 그대로 그리지 않음, r2 E6/S19). 별 사이 = pitch − star_px', _rule: '지금 챕터에서 모은 별 10칸 줄(글·숫자 없음): 받은 별 = star 면, 아직 = star_empty(옅은 실선 면, r2 — 점선 아님). 대체 글 aria_map_stars.' }),
    node_states: { locked: 'node-locked.svg: nodeLocked 원 + 그 레벨 판 크기(width x height) 옅은 타일 격자 실루엣(nodeLockedMark 투명도 0.35, 격자 폭 = 노드 지름의 0.53, r2 S10). 자물쇠 그림 없음. 누르면 120 ms 옆으로 2k px 살짝 흔들림(소리 없음, r2 S30 — 아래 motion.map.locked_tap)', next: 'node-open.svg: 흰 원 + nodeOpenEdge 테두리 + ▶, 1.6 s 주기 1.0 ↔ 1.06 숨 쉼', partial: 'node-partial.svg: next 와 같고 테두리 바깥에 칠한 칸 비율만큼 pathDone 호(12시부터 시계 방향, 숫자 없음) — 풀다 나간 판의 최고 판 채움(연결된 쌍이 칠한 칸 기준, G3)', done: '그 판 정답의 미니 그림(둥근 네모 판 + tint 칸 + 선, 점 생략). 미니 그림 둘레 4k px 띠 = 그 레벨 바탕 top 색 + boardEdge(결과 화면 레벨 이름 띠와 같은 색, G7)', star: 'done + 오른쪽 위 작은 별(노드 지름 0.32)' },
    buttons: { settings, sound: R(edge, edge, btn, btn, { icon: 'sound_on', key: 'settings_sound', _rule: '켬/끔, aria-pressed' }) },
    text_slots: {}, _r3: '보호자 안내 글 자리(guardian_hold) 제거 — 규약(옵션에 어른 도움 고지 없음)',
    hard: hardPage(W, H, k, portrait, titleH, starsH, barH, pagerH, btn, edge),
    path: { w: Math.round(10 * k), _rule: '노드 가운데를 잇는 Catmull-Rom 곡선(장력 0.5). 지나온 구간 pathDone, 앞 구간 pathTodo, 끝 둥글게.' } };
}

// ---------- r3 어려운 판 문 페이지 (지도 6번째 페이지) ----------
function hardPage(W, H, k, portrait, titleH, starsH, barH, pagerH, btn, edge) {
  const gd = Math.round(PARAM.gate_d * k), gs = Math.round(PARAM.gate_star * k), ringR = Math.round(gd / 2 + gs * 0.9 + 4), gates = [];
  if (portrait) { const y0 = titleH + starsH + ringR + 12, y1 = H - barH - pagerH - ringR - 8; for (let i = 0; i < 5; i++) gates.push([Math.round(W * (i % 2 ? 0.68 : 0.32)), Math.round(y0 + ((y1 - y0) * i) / 4)]); }
  else { const x0 = ringR + 16 * k, x1 = W - ringR - 16 * k, top = titleH + starsH, avail = H - barH - pagerH - 8 - top; for (let i = 0; i < 5; i++) gates.push([Math.round(x0 + ((x1 - x0) * i) / 4), Math.round(top + avail / 2 + (avail / 2 - ringR - 6) * (i % 2 ? 0.5 : -0.5))]); } // 가로: 한 줄(높이가 낮아 지그재그 폭을 줄임)
  return { gates, gate_d: gd, ring: { r: ringR, star_px: gs, n: 10, start_deg: -90 }, title_key: 'hard_title', unlock_every_stars: 10,
    states: { locked: '옅은 원(nodeLocked) + 그 단계 판 크기 실루엣(넓은 격자) + 둘레 별 칸 10개(star_empty 옅은 면). 모은 별이 그 문 구간(10·(i−1) ~ 10·i)에 든 만큼 둘레 별 칸이 star 면으로 참(12시부터 시계 방향). 자물쇠·숫자 없음',
      open: '흰 원 + 그 단계 테마 top 색 테두리 5k + ▶ + 둘레 별 칸 10개 모두 star. 숨 쉼 1.0 ↔ 1.05(1.6 s)', cleared: '열린 문 + 가운데 ▶ 대신 그 단계에서 모은 별 비율만큼 호(pathDone)' },
    unlock_motion: { star_fill_ms: 60, star_pop: [0, 1.25, 1], gate_morph_ms: 320, sound: 'node_open', haptic: 'star', when: '누적 별이 10의 배수를 넘긴 뒤 지도로 돌아올 때. 6번째 점이 별 색으로 120 ms 튀고, 그 페이지에 오면 남은 별 칸이 60 ms 간격으로 차고 → 문이 열림(320 ms). 자동으로 페이지를 넘기지 않음', reduced: '별 칸·문 바로 바뀜' },
    _rule: '지도 6번째 페이지: 어려운 판 5단계 문(글 없이). 별 10·20·30·40·50개마다 문 하나씩 열림(요청자 2026-11-19). 문을 누르면 그 단계 레벨 페이지(지도 노드 배치 그대로, 바탕 = hard 테마). 제목 자리는 lore hard_title(없으면 비움).' };
}

// ---------- r3 넓은 판(어려운 판, 기본의 최대 4배 = 12x12, 쌍 ≤ 16 가정) ----------
export const BOARDS_WIDE = [[8, 8], [9, 9], [10, 10], [12, 8], [8, 12], [12, 12]];
function playWide(W, H, cols, rows) {
  const fit0 = play(W, H, cols, rows), k = fit0.k, P = PARAM;
  if (fit0.cell >= P.cell_min) return { ...fit0, wide: true, fit_cell: fit0.cell, camera: null };
  const fit = play(W, H, 12, 12); // 화면 틀(viewport·채움 막대·판정·버튼)은 모든 넓은 판에서 같게 = 12x12 기준 틀
  const o = { ...fit, board_size: [cols, rows], wide: true, fit_cell: fit0.cell };
  const pc = Math.round(P.wide_cell * Math.min(k, 1.2));
  const vp = fit.portrait ? R(P.side_margin, fit.board.y, W - 2 * P.side_margin, fit.buttons.undo.y - 8 - fit.board.y) : R(fit.board.x, fit.board.y, fit.board.w, fit.board.h);
  o.viewport_rule = '판 크기와 관계없이 같은 틀. 판이 viewport 보다 작은 쪽 축은 가운데 정렬(카메라는 큰 쪽 축만 움직임)';
  o.cell = pc; o.board_full = { w: Math.round(pc * (cols + 2 * P.board_pad_of_cell)), h: Math.round(pc * (rows + 2 * P.board_pad_of_cell)) };
  o.viewport = vp; o.board = vp;
  o.visible_cells = [+Math.min(cols, vp.w / pc).toFixed(1), +Math.min(rows, vp.h / pc).toFixed(1)];
  // 미니맵: 세로 = 위 HUD 쌍 점 줄 자리, 가로 = 오른쪽 기둥 위 쌍 점 격자 자리(쌍 점 줄은 넓은 판에서 미니맵으로 바뀜)
  const box = fit.portrait ? R(fit.pair_row.x0, 4, fit.pair_row.x1 - fit.pair_row.x0, Math.round(P.hud_h * k) - 8) : R(fit.pillars.right.x + 8, Math.round(P.edge * k), fit.pillars.right.w - 16, Math.round(120 * k));
  const mc = Math.floor(Math.min(box.w / cols, box.h / rows));
  const mm = R(box.x + (box.w - mc * cols) / 2, box.y + (box.h - mc * rows) / 2, mc * cols, mc * rows, { cell: mc });
  o.minimap = { ...mm, hit: R(mm.x - Math.max(0, (48 - mm.w) / 2), mm.y - Math.max(0, (48 - mm.h) / 2), Math.max(48, mm.w), Math.max(48, mm.h)),
    draws: '칸 = 연결된 쌍 tint, 끝점 = 쌍 색 1칸, 나머지 tile. 지금 보이는 곳 = ink 2 px 둥근 테두리', cache: '미니맵 캔버스 1장, 바뀐 칸만 다시 칠함',
    tap: '전체 보기 켜기/끄기', drag: '보이는 곳 옮기기(손가락 = 테두리 가운데)', _rule: '쌍 점 줄 대신. 끝까지 이은 쌍 수는 채움 막대·미니맵 tint 로 보임.' };
  o.pair_row = { ...fit.pair_row, replaced_by: 'minimap' };
  // 세로: 판 아래 글 자리가 viewport 에 들어가므로 판정 띠를 같이 씀
  if (fit.portrait) o.text_slots = { board_text: { ...R(16, fit.judge.y, W - 32, fit.judge.h), font_px: fit.text_slots.board_text.font_px, max_lines: 2, align: 'center', used_by: ['tut_drag', 'gap_left'], shared_with: 'judge', coexists_with_card: false } };
  o.camera = {
    modes: { overview: { cell: fit.cell, draw: false, _rule: '판 전체가 viewport 에 들어감(칸 < 48 이라 그리기 없음). 판을 누르면 그 점을 가운데로 play 로 확대(300 ms)' }, play: { cell: pc, draw: true } },
    start: 'overview 를 보여 주고 첫 누름 = 확대(그리지 않음). 이후 play',
    follow: { edge_zone_of_cell: 1.2, dwell_ms: 200, max_cells_per_s: 8, ease: 'out', _rule: '드래그 중 손가락이 viewport 가장자리 1.2칸 안에 200 ms 머물면 그쪽으로 따라감(가장자리에 가까울수록 빨리, 최대 8칸/s). 선은 손가락 아래 칸을 따름 → 화면이 밀리며 선이 이어짐. 손을 떼면 멈춤' },
    jump: { ms: 300, when: ['되돌리기·처음부터·도움 손가락', '미니맵 누름', 'overview 에서 누름'], _rule: '바뀐 선·도움 쌍이 보이도록 카메라가 옮겨 감' },
    clamp: '판 바깥으로 0.5칸 넘게 나가지 않음', gesture: '두 손가락 확대·이동 없음(조작 = 드래그 1가지). 빈칸에서 시작한 드래그는 지금처럼 "여기서 시작" 안내(이동 아님)',
    render: '판 캐시를 transform(translate)으로만 옮김 — 카메라 이동 중 판 다시 그리기 없음' };
  return o;
}

// ---------- 결과 화면 ----------
// 세로: 레벨 이름 띠 → 클리어 제목 → 미니 판 → 별 → %(+ new_best 표지) → 버튼 / 가로: 왼쪽 미니 판, 오른쪽 기둥에 같은 순서
function result(W, H) {
  const k = kOf(W, H), portrait = H >= W, S = Math.min(W, H), btn = Math.round(PARAM.btn * k), big = Math.round(72 * k);
  const bs = Math.round(S * PARAM.result_board_of_S), lnH = Math.round(28 * k), lnF = Math.round(PARAM.level_name_font * k), nb = Math.round(28 * k);
  const band = (x, y, w) => R(x, y, w, lnH, { font_px: lnF, max_lines: 1, used_by: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `level${i}_name`), color: 'ink', bg: 'themes.levelNN.top', _rule: '그 레벨 이름(지도와 같은 이름). 띠 = 글 폭 + 24k 만큼만, 가운데 정렬, 둥근 끝, 바탕 = 그 레벨 바탕 top 색 + boardEdge 1.5 px = 지도 완료 노드 미니 그림 둘레 띠와 같은 색(글을 못 읽어도 색으로 이어짐, G7).' });
  const pctRow = (x, y, w, f) => R(x, y, w, 32 * k, { font_px: f, key: 'result_accuracy', _rule: '% = 한 번에 이은 쌍 수 / 쌍 수 × 100(내림, G2). 쌍 점 줄 바로 아래 작게(r2 H3 — 점 줄이 주 신호, % 는 보조). 앞 아이콘 없음.' });
  const rd = Math.round(PARAM.result_dot * k), rp = Math.round(PARAM.result_dot_pitch * k);
  const dotsRow = (cx, y) => R(cx - (5 * rp + rd) / 2, y, 5 * rp + rd, rd, { d: rd, pitch: rp, max: 6, align: 'center',
    full: 'marks/mark-pN-*-connected.svg(꽉 찬 점 + 고리) + 위 오른쪽 작은 반짝임(지름 0.35, 별 색)', hollow: 'marks/mark-pN-*-hollow.svg(흰 면 + 쌍 색 테두리·표지 = 속 빈 점)',
    order: '플레이 쌍 점 줄과 같은 순서(color_slot)', anim: '왼쪽부터 80 ms 간격으로 0 → 1.15 → 1.0(180 ms, spring). 꽉 찬 점마다 연결음 사다리 음 하나(작게, connect_g3 −6 dB), 속 빈 점은 소리 없음',
    _rule: '한 번에 이은 쌍 = 꽉 찬 점, 아닌 쌍(다시 그은 색) = 속 빈 점(r2 H3). "판은 100 % 칠했는데 별이 없는" 이유가 글 없이 보임. 대체 글 result_dots(lore).' });
  const nbOf = (p) => R(p.x + p.w + 4, p.y + (p.h - nb) / 2, nb, nb, { icon: 'new_best', key: 'result_new_best', _rule: '지난 최고 %보다 높을 때만, % 세기가 끝난 뒤 0 → 1.0 (200 ms, 동작 줄이기면 바로). img, alt = result_new_best. 글 없음.' });
  const buttons = (cx, by) => ({ map: R(cx - big / 2 - 24 - btn, by + big / 2 - btn / 2, btn, btn, { icon: 'map', key: 'btn_map' }), next: R(cx - big / 2, by, big, big, { icon: 'next', key: 'btn_next' }), again: R(cx + big / 2 + 24, by + big / 2 - btn / 2, btn, btn, { icon: 'restart', key: 'btn_again' }) });
  const titleKeys = ['clear_title_1', 'clear_title_2', 'clear_title_3', 'clear_star', 'clear_last'];
  if (portrait) {
    const by = Math.round(H * 0.20), titleY = by - Math.round(56 * k);
    const dots = dotsRow(W / 2, by + bs + 16 + 80 * k + 8), pct = pctRow(W / 2 - 60 * k, dots.y + dots.h + 6, 120 * k, Math.round(20 * k));
    return { W, H, k, level_name: band(16, titleY - lnH - 4, W - 32), mini_board: R((W - bs) / 2, by, bs, bs), title: R(16, titleY, W - 32, Math.round(44 * k), { font_px: Math.round(24 * k), max_lines: 1, used_by: titleKeys }),
      star: R(W / 2 - 40 * k, by + bs + 16, 80 * k, 80 * k, { _rule: '별 칸: 쌍 점이 모두 꽉 찼을 때만 별(점 줄 애니메이션이 끝난 뒤 튐). 아니면 star_empty 옅은 면' }), pair_dots: dots, pct, new_best: nbOf(pct), buttons: buttons(W / 2, H - 40 - big) };
  }
  const bx = Math.round(W * 0.30 - bs / 2), by = Math.round((H - bs) / 2), rx = Math.round(W * 0.66), lnY = Math.round(H * 0.05), tY = lnY + lnH + 6, sY = Math.round(H * 0.28);
  const sz = Math.round(64 * k), sY2 = tY + Math.round(40 * k) + 4, dots = dotsRow(rx, sY2 + sz + 6), pct = pctRow(rx - 60 * k, dots.y + dots.h + 4, 120 * k, Math.round(18 * k));
  return { W, H, k, level_name: band(W * 0.48, lnY, W * 0.48), mini_board: R(bx, by, bs, bs), title: R(W * 0.48, tY, W * 0.48, 40 * k, { font_px: Math.round(22 * k), max_lines: 1, used_by: titleKeys }),
    star: R(rx - sz / 2, sY2, sz, sz, { _rule: '별 칸: 쌍 점이 모두 꽉 찼을 때만 별' }), pair_dots: dots, pct, new_best: nbOf(pct), buttons: buttons(rx, H - 24 - big) };
}

// ---------- 글이 보이는 다른 화면 (G7: 타이틀·보호자·불러오기/오류) ----------
function column(W, H, k) { const cw = Math.min(W - 32, Math.round(560 * k)); return { x: Math.round((W - cw) / 2), w: cw }; }
function textBlock(x, y, w, key, font, maxLines, extra = {}) {
  const lh = font * PARAM.text_line, lines = Math.max(1, ...strs(key).map(([, v]) => wrap(v, font, w).length));
  return R(x, y, w, Math.ceil(Math.min(lines, maxLines) * lh), { font_px: font, max_lines: maxLines, used_by: [key], ...extra });
}
function titleScreen(W, H) {
  const k = kOf(W, H), portrait = H >= W, btn = Math.round(PARAM.btn * k), edge = Math.round(PARAM.edge * k);
  const col = portrait ? column(W, H, k) : { x: Math.round(W * 0.04), w: Math.round(W * 0.52) }; // r2 S10: 가로는 글을 왼쪽 반에, 히어로 판을 오른쪽에
  const cx = col.x + col.w / 2;
  const logo = R(cx - 80 * k, H * (portrait ? 0.14 : 0.18), 160 * k, 64 * k, { svg: 'logo-mark.svg' });
  const name = textBlock(col.x, logo.y + logo.h + 12, col.w, 'title', Math.round(40 * k), 1, { align: 'center', weight: 800 });
  const tag = textBlock(col.x, name.y + name.h + 8, col.w, 'tagline', Math.round(20 * k), 2, { align: 'center', color: 'inkSoft' });
  const tap = textBlock(col.x, H - Math.round(64 * k), col.w, 'tap_to_start', Math.round(20 * k), 1, { align: 'center', _rule: '1.6 s 주기로 옅게 숨 쉼(동작 줄이기면 고정). 화면 어디를 눌러도 시작.' });
  const heroS = portrait ? Math.round(Math.min(col.w * 0.62, tap.y - (tag.y + tag.h) - 48)) : Math.round(Math.min(W * 0.34, H - 2 * (edge + btn) - 16));
  const hero = portrait ? R(W / 2 - heroS / 2, (tag.y + tag.h + tap.y) / 2 - heroS / 2, heroS, heroS) : R(W * 0.78 - heroS / 2, H / 2 - heroS / 2, heroS, heroS);
  Object.assign(hero, { kind: 'self_painting_3x3', loop_ms: 4200, _rule: 'r2 S10: 글 없이도 "이렇게 노는 것"이 보이는 히어로 — 3x3 작은 판(app-icon 과 같은 2쌍 배치)에서 손가락이 한 쌍씩 그어 칠하고(쌍당 1.2 s, 연결 튐·고리) 다 칠하면 0.6 s 쉰 뒤 400 ms 에 비워져 되풀이. 소리 없음. 판 그림은 미리 그린 비트맵, 선만 매 프레임. 동작 줄이기면 다 칠한 그림 고정. 누르면 시작(화면 어디나와 같음).' });
  return { W, H, k, bg: 'menu', logo, hero, buttons: { sound: R(edge, edge, btn, btn, { icon: 'sound_on', key: 'settings_sound' }) }, text_slots: { title: name, tagline: tag, tap_to_start: tap } };
}
function guardianScreen(W, H) {
  const k = kOf(W, H), col = column(W, H, k), btn = Math.round(PARAM.btn * k), edge = Math.round(PARAM.edge * k), gap = Math.round(12 * k);
  const fB = Math.round(16 * k), fL = Math.round(18 * k), fS = Math.round(PARAM.small_font * k), tw = Math.round(64 * k);
  const ts = {}, ctl = {};
  ts.guardian_title = { ...textBlock(col.x, edge, col.w - btn - 8, 'settings_title', Math.round(22 * k), 1, { align: 'left', weight: 800, valign: 'middle' }), h: btn };
  const close = R(col.x + col.w - btn, edge, btn, btn, { icon: 'close', key: 'btn_close' });
  let y = edge + btn + gap;
  ts.guardian_intro = textBlock(col.x, y, col.w, 'settings_intro', fB, 24, { align: 'left', _rule: 'r2: lore 고쳐 쓰기(E4)로 길어짐 → 최대 24줄, 넘치면 화면 세로 스크롤' }); y += ts.guardian_intro.h + gap;
  const row = (key, note) => {
    ts[key] = { ...textBlock(col.x, y, col.w - tw - 12, key, fL, 1, { align: 'left', valign: 'middle' }), h: btn }; ctl[key] = R(col.x + col.w - tw, y, tw, btn, { kind: 'toggle', key }); y += btn + 4;
    if (note) { ts[note] = textBlock(col.x, y, col.w, note, fS, 4, { align: 'left', color: 'inkSoft' }); y += ts[note].h + 4; }
    y += gap - 4;
  };
  row('settings_sound'); row('settings_vibrate', 'vibrate_note'); row('settings_motion');
  ts.settings_lang = textBlock(col.x, y, col.w, 'settings_lang', fL, 1, { align: 'left' }); y += ts.settings_lang.h + 6;
  const lw = Math.max(btn, Math.ceil(Math.max(...['lang_ko', 'lang_en'].flatMap((kk) => strs(kk).map(([, v]) => textW(v, fL)))) + 32));
  ctl.lang_ko = R(col.x, y, lw, btn, { kind: 'text_button', key: 'lang_ko', font_px: fL }); ctl.lang_en = R(col.x + lw + 12, y, lw, btn, { kind: 'text_button', key: 'lang_en', font_px: fL }); y += btn + gap * 2;
  const rw = Math.max(btn, Math.ceil(Math.max(...strs('settings_reset').map(([, v]) => textW(v, fL))) + 32));
  ctl.settings_reset = R(col.x, y, Math.min(col.w, rw), btn, { kind: 'text_button', key: 'settings_reset', font_px: fL, _rule: '누르면 confirm 창. 빨간색·경고 그림 없음' }); y += btn + edge;
  const cwid = Math.min(col.w, Math.round(320 * k)), cx = Math.round((W - cwid) / 2);
  const cText = textBlock(cx + 16, 0, cwid - 32, 'confirm_reset', Math.round(20 * k), 3, { align: 'center' });
  const bw2 = Math.max(btn, Math.ceil(Math.max(...['confirm_yes', 'confirm_no'].flatMap((kk) => strs(kk).map(([, v]) => textW(v, fL)))) + 32));
  const ch = 20 + cText.h + 16 + btn + 20, cy = Math.round((H - ch) / 2); cText.y = cy + 20;
  const confirm = { card: R(cx, cy, cwid, ch), text: cText, no: R(cx + cwid / 2 - 6 - bw2, cy + ch - 20 - btn, bw2, btn, { key: 'confirm_no', font_px: fL, _rule: '먼저 포커스' }), yes: R(cx + cwid / 2 + 6, cy + ch - 20 - btn, bw2, btn, { key: 'confirm_yes', font_px: fL }) };
  return { W, H, k, bg: 'menu', column: col, content_h: y, scroll: y > H, _rule: 'r3: 설정 화면(이름은 호환 위해 guardian 그대로). 지도 톱니 한 번 누름으로 열림, 길게 누르기·보호자 도움 고지 없음. 글이 화면보다 길면 세로 스크롤. 닫기 ✕ 는 머리 줄에 고정.', scroll_hint: { fade_px: Math.round(24 * k), chevron_px: Math.round(20 * k), _rule: 'r2 S6: 내용이 화면보다 길면 아래 가장자리 24k px 을 바탕색으로 옅게 덮고(미리 그린 띠, 그라디언트 1장) 가운데 아래꺾쇠(inkSoft 20k)를 둠. 끝까지 내리면 둘 다 숨김. 스크롤 막대는 브라우저 기본 그대로 보이게(overflow-y: auto, 숨기지 않음).' }, buttons: { close }, controls: ctl, text_slots: ts, confirm };
}
function errorScreen(W, H) {
  const k = kOf(W, H), col = column(W, H, k), big = Math.round(72 * k);
  const head = textBlock(col.x, 0, col.w, 'load_error', Math.round(24 * k), 2, { align: 'center', weight: 800 });
  head.used_by = ['load_error', 'loading'];
  const detail = textBlock(col.x, 0, col.w, 'load_error_detail', Math.round(16 * k), 3, { align: 'center', color: 'inkSoft' });
  const total = head.h + 12 + detail.h + 24 + big; let y = Math.round((H - total) / 2);
  head.y = y; y += head.h + 12; detail.y = y; y += detail.h + 24;
  return { W, H, k, bg: 'menu', _rule: '불러오는 중 = head 자리에 loading 글만. 실패 = load_error + load_error_detail + ↻ 버튼(btn_reload, 부트 블록 인라인 그림 = icon-restart 경로).', text_slots: { head, detail }, buttons: { reload: R(W / 2 - big / 2, y, big, big, { icon: 'restart', key: 'btn_reload' }) } };
}

// ---------- 구멍 칸 그리기 규칙(1-2 2차, 리뷰 art #4 · G1) ----------
export const HOLE_RULE = {
  interior: '판 안 구멍(상하좌우 칸이 모두 판 안): 판 카드 경로에서 even-odd 로 도려냄(둥근 네모, 반경 tile_r, 칸 가장자리에서 0.02칸 안쪽) + boardEdge 1.5 px 둘레. 구멍으로 레벨 바탕이 보임, 가운데 점 없음.',
  perimeter: '판 둘레 줄·열에 닿는 구멍: 그 칸을 판 카드 외곽선에서 오목하게 파냄 — 닿은 쪽은 판 여백(board_pad_of_cell)까지 함께 빼서 구멍 바탕이 판 밖 바탕과 이어짐. 파낸 안쪽 모서리 반경 = tile_r(0.22칸), boardEdge 둘레 선은 파낸 선을 따라감(판 바깥에 끊긴 여백 띠를 남기지 않음). 모서리 칸이면 두 변을 함께 파냄.',
  draw: '빌드: 판 경로 = 둥근 판 사각형 − Σ(구멍 칸 사각형, 둘레 쪽으로 board_pad + tile_r 만큼 늘림). 같은 경로에 fill board + stroke boardEdge. 목업: mockups/board-l06.svg·board-l08.svg(tutorial.mjs 가 레벨 JSON 으로 생성).',
};

function buildLayout() {
  const play_ = {}, wide_ = {}, map_ = {}, res_ = {}, title_ = {}, guard_ = {}, err_ = {};
  for (const [W, H] of RES) {
    const key = `${W}x${H}`;
    play_[key] = {}; for (const [c, r] of BOARDS) play_[key][`${c}x${r}`] = play(W, H, c, r);
    wide_[key] = {}; for (const [c, r] of BOARDS_WIDE) wide_[key][`${c}x${r}`] = playWide(W, H, c, r);
    map_[key] = map(W, H); res_[key] = result(W, H); title_[key] = titleScreen(W, H); guard_[key] = guardianScreen(W, H); err_[key] = errorScreen(W, H);
  }
  return {
    schema_version: 1,
    _source: 'assets/check/layout.mjs --write 가 생성(art-director 원본). 30-art 3~5절 표는 요약. 빌드는 이 파일만 읽음. 화면 크기가 4해상도와 다르면 같은 식(layout.mjs play/map/result)을 빌드가 그대로 옮겨 계산.',
    param: PARAM,
    marks: { stroke_unit: MARK_STROKE_UNIT, paths: MARKS, _rule: '표지 반지름 = px.mark/2. fill + 같은 색 stroke(lineWidth = stroke_unit, 단위 좌표), lineJoin round. 색 = common.white.' },
    star_path: STAR,
    finger: { ...FINGER, size_of_cell: 1.0, _rule: '손가락 끝(tip) = 시연 위치. 크기 1칸. 세로 화면에서 손은 오른쪽 아래, 점이 판 오른쪽 끝 열이면 x 를 뒤집음.' },
    play: play_, play_wide: wide_, map: map_, result: res_, title: title_, guardian: guard_, error: err_,
    hole_rule: HOLE_RULE,
    motion: MOTION,
    render: RENDER,
  };
}

// ---------- 연출 시간(원본; 30-art 5절 표는 요약) ----------
export const MOTION = {
  _clock: '모든 연출 시계 = 게임 시간(테스트 훅 화면 = 일반 화면, insights). ease: out = cubic-bezier(.2,.8,.2,1), spring = 끝이 살짝 넘치는 감속 cubic-bezier(.34,1.56,.64,1), inout = cubic-bezier(.65,0,.35,1).',
  grab: { ms: 100, dot_scale: [1, 1.10, 1], ease: 'spring', sound: 'grab', haptic: null },
  step: { ms: 0, _rule: '칸 진행은 입력 다음 프레임에 그림. 머리는 점유 칸 가운데에서 손가락 쪽으로 최대 0.5칸 늘어남(축 방향만).', sound: 'tick' },
  connect: {
    pop_ms: 180, pop_scale: { g1: 1.22, g2: 1.18, g3: 1.14 }, pop_ease: 'spring',
    band_ms: 300, band_color: 'mix(쌍 색, 흰색, 0.45)', band_len_of_line: 0.35, _band: '짝 점 쪽 끝에서 시작 점 쪽으로 흐르는 밝은 띠 한 번',
    tint_ms: 300, _tint: '띠가 지나간 칸부터 tint 로 칠해짐(칸마다 120 ms 페이드)',
    particles: { g1: 8, g2: 6, g3: 4, ms: 300, radius_of_cell: 1.0, size_of_cell: [0.08, 0.14], shape: '원', color: '쌍 색', _rule: '두 끝점에서 바깥으로 퍼졌다 작아지며 사라짐, 칸 1개 반경 안' },
    ring_ms: 160, _ring: '두 점에 바깥 고리(ring_d) 생김',
    pair_row_ms: 120, pair_row_scale: [1, 1.15, 1],
    judge: { show_ms: 80, show_scale: [1, 1.15, 1], hold_ms: 400, fade_ms: 150, rise_px: 6, _rule: '새 판정이 오면 이전 표시는 그 프레임에 지우고 새로(표시 하나만). 낭독 안 함.' },
    sound: 'connect_g1|g2|g3', haptic: 'connect',
    line_mark: { size_of_cell: 0.26, at: '연결된 선의 가운데 칸(칸 수 짝수면 시작 점 쪽 가운데)', color: 'common.white', alpha: 0.9, _rule: 'r2 S27: 흑백·protan 에서 선끼리 가까운 색(하트선·세모선)을 모양으로도 구분 — 연결된 선 가운데 칸에 그 쌍의 흰 표지 하나(점 표지와 같은 모양, 0.26칸). 끄는 중인 선에는 없음. 선 캐시에 함께 그림.' },
    repeat_guard: { same_pair_same_drag_ms: 400, _rule: 'r2 S13: 한 드래그 안에서 같은 쌍이 닿았다 물러났다 다시 닿으면 400 ms 안의 다시 닿음은 tint·고리만(소리·조각·판정 이름·진동 없음). 판정 기록은 손을 뗄 때 확정(balance 규칙 그대로).' },
    g1_star: { size: 'judge.g1_star_px', ms: 200, scale: [0, 1.2, 1], color: 'common.star + starEdge', _rule: 'r2 S15: 1단 이름 바로 위 가운데에만 작은 별(미리 그린 비트맵, 이름과 함께 튀고 함께 흐려짐). 2·3단 없음.' },
    juice: {
      glow: { ms: 260, max_alpha: 0.35, radius_of_cell: 0.9, color: '쌍 색', sprite: '레벨 시작 때 쌍마다 방사형 원 1장 미리 그림(오프스크린), 매 프레임 drawImage + globalAlpha 만', _rule: '연결 순간 두 끝점에서 부드러운 빛 번짐(크기 0.6 → 1.0, 투명도 0.35 → 0). 화면 밝기 급변 없음(판 면적의 3 % 이하, 흰색 아님).' },
      rise: '연결음은 그 판에서 이은 순서대로 사다리 음이 올라감(sound.json ladder_hz, 이미 있음) — "소리 상승음"',
    },
  },
  head: { spring: { stiffness: 0.35, damping: 0.72, max_lag_of_cell: 0.35 }, step_pop: { ms: 90, scale_of_line: [1, 1.12, 1], _rule: '새 칸에 들어간 프레임에 선 머리 둥근 끝만 굵기 1.12배 → 1.0(90 ms)' },
    _rule: 'r2 주스감: 선 머리(둥근 끝)가 손가락을 스프링으로 따라옴(매 프레임 head += (target − head) × 0.35, 감쇠 0.72, 최대 뒤처짐 0.35칸 — 넘으면 바로 붙음). 칸 점유 판정은 손가락 위치 그대로(머리 그림만 늦음, 입력 지연 0). 동작 줄이기: 스프링·튐 끔(머리 = 손가락).' },
  cut: { ms: 200, _rule: '잘린 부분이 옅어지며(불투명 1 → 0) 굵기 1 → 0.5 로 줄어듦. 같은 드래그 안에서 되돌리면 120 ms 에 되살아남. 그 쌍의 쌍 점 줄 점은 120 ms 에 조용히 비워짐.', sound: 'cut' },
  blocked: { ms: 220, kind: 'bounce_back', head_push_of_cell: 0.18, head_back_ms: 160, dot_nudge_of_cell: 0.06, dot_nudge_ms: 120, ease: 'spring', dot_scale: null, sound: 'bump', haptic: null, repeat_guard_ms: 250,
    _rule: 'r2 H4·S4: 막힘 = "튕겨 나옴". 선 머리가 막힌 점 쪽으로 0.18칸 밀려 들어갔다 160 ms 에 스프링으로 되돌아오고, 막힌 다른 색 점은 미는 방향으로 0.06칸 밀렸다 120 ms 에 제자리(크기 변화 없음 — 시작 안내 숨 쉬기(크기)·연결 부풂과 다른 움직임). 짧고 낮은 "툭"(sound bump, 연결음보다 ≥ 6 dB 작게). 진동 없음. 250 ms 안 반복은 움직임·소리 건너뜀. 동작 줄이기: 움직임 없이 막힌 점 고리 120 ms 옅게 + 소리.' },
  disconnect: { ms: 120, _rule: '되돌아가거나 잘려 연결이 풀리면 tint 가 120 ms 에 빠지고 고리가 사라짐. 벌칙 연출 없음.' },
  gap_hint: { start: 'max(pointerup + 150 ms, 마지막 연결 + 630 ms(= 판정 이름 80 + 400 + 150, 이름이 다 사라진 뒤))', text_on_breath: 3, text_hide_on_judge: true, ms: 600, scale: [1, 1.08, 1], glow_w_of_cell: 0.08, color: 'common.gapGlow', repeat_after_ms: 2000, max_times: 3, sound: 'gap_hint', text_key: 'gap_left',
    _rule: '모든 쌍이 이어졌는데 빈칸이 있을 때만. 빈칸 타일만 숨 쉼(크기 ≤ 8 %, 밝기 변화 ≤ 20 %). 판정 표시가 끝난 뒤에 나옴. 글(gap_left)은 그림 신호가 먼저 — 3번째 숨 쉬기 때만 board_text 에 보임(G6), aria-live 는 첫 숨 쉬기에 1번. 그 사이 판정 이름이 오면 글은 그 프레임에 숨김.' },
  undo: { ms: 120, ease: 'out', sound: 'undo' },
  restart: { ms: 250, ease: 'inout', _rule: '모든 선이 각자 시작 점 쪽으로 빨려 들어가며 tint 빠짐', sound: 'restart' },
  complete: {
    lock: '마지막 연결 프레임부터 판 입력 무시. 결과 카드가 다 올라온 뒤(result_buttons_accept_after_ms)부터 결과 버튼이 누름을 받음 — 그 전 누름은 버림(계속 두드리던 손이 ▶·↻ 를 누르지 않게)',
    result_buttons_accept_after_ms: 1280,
    timeline_ms: [
      { t: 0, what: '마지막 연결 연출(connect) 그대로' },
      { t: 150, what: '완료 화음(complete), 진동 complete. 마지막 연결의 판정 이름은 이 프레임부터 150 ms 에 흐려짐(lore 6-3)' },
      { t: 150, what: '쌍 연결 순서대로 선마다 밝은 띠 한 번(띠 300 ms, 쌍 사이 80 ms 겹쳐 흐름)' },
      { t: 180, what: 'r2 주스: 색 물결 — 마지막 연결 점에서 판 전체로 칸마다 퍼짐(칸 사이 맨해튼 거리 × 45 ms 지연, 칸마다 타일 1.0 → 1.06 → 1.0 120 ms + tint 가 쌍 색 쪽으로 15 % 짙어졌다 돌아옴). 6x6 끝까지 ≤ 450 ms. 밝기 변화 ≤ 15 %, 흰 번쩍임 없음. 판 캐시 위 칸 사각형 transform 만(칸 글자·테두리 다시 그리기 없음)' },
      { t: 380, what: '판 카드 1.0 → 1.03 → 1.0 (300 ms, spring)' },
      { t: 420, what: '판 안쪽에서만 색 조각 12개(쌍 색) 위로 떠올랐다 사라짐(500 ms, 미리 그린 원 비트맵)' },
      { t: 1000, what: '결과 카드가 아래에서 올라옴(280 ms, out). 판은 그대로 보이다 미니 그림 자리로 줄어듦' },
      { t: 1280, what: '결과 버튼(▶·지도·↻)이 누름을 받기 시작' },
    ],
    total_ms: 1000,
  },
  result: { star_ms: 360, star_scale: [0, 1.15, 1], star_delay_ms: 200, pct_count_ms: 400, sound_star: 'star',
    sequence_ms: [
      { t: 0, what: '결과 카드가 올라오기 시작(complete t 1000 = 여기 0)' },
      { t: 280, what: '카드 다 올라옴 = 결과 버튼 누름 받기 시작(H1, 1.28 s)' },
      { t: 300, what: '쌍 점 줄: 왼쪽부터 80 ms 간격으로 점이 튐(6쌍 = 300~700)' },
      { t: 'dots_end + 120', what: '% 숫자 세기 400 ms(동작 줄이기면 바로)' },
      { t: 'dots_end + 200', what: '모두 꽉 찬 점이면 별 0 → 1.15 → 1 (360 ms) + star 소리 + 진동 star' },
      { t: 'pct_end', what: 'new_best 표지 200 ms' },
    ], _rule: 'r2 주스: 보상은 점 줄 → % → 별 순서, 박자 80 ms. 버튼은 280 ms(H1)부터 받으므로 순서 연출이 조작을 막지 않음(▶ 누르면 남은 연출은 건너뜀).' },
  map: { node_morph_ms: 300, path_fill_ms: 500, next_breathe_period_ms: 1600, next_breathe_scale: [1, 1.06], sound_open: 'node_open',
    locked_tap: { ms: 120, shift_px: 2, sound: null }, page_turn_ms: 260, chapter_unlock: '챕터 마지막 레벨 완료 → 지도로 돌아오면 길 채움 끝에서 다음 페이지 점이 pathTodo 면으로 120 ms 튐, ▶ 가 한 번 숨 쉼(1.6 s). 자동으로 넘기지 않음' },
  level_transition: { ms: 300, kind: '판 카드가 지도 노드 자리에서 커지며(scale 0.2 → 1, transform 만) 바탕은 겹쳐 흐려짐', reverse: '지도로 갈 때 판이 그 노드로 줄어듦', next_level: '결과 ▶: 결과 카드 아래로 200 ms + 새 판 0.96 → 1.0(200 ms, 겹침 100 ms) — 첫 누름은 새 판이 보인 첫 프레임부터 받음', reduced: '겹쳐 흐려짐 150 ms 만', _rule: 'r2 주스: 미리 그린 판 캐시(오프스크린 1장)를 transform 으로만 움직임. 전환 중 매 프레임 판 다시 그리기 금지.' },
  screen: { ms: 220, kind: '겹쳐 흐려짐(crossfade) + 6 px 위로', _rule: '화면 전환에 흰 번쩍임·밀어내기 없음' },
  tutorial: { finger_in_ms: 250, press_ms: 150, cell_ms: 260, hold_end_ms: 400, fade_ms: 250, loop_gap_ms: 1200, loops_before_wait: 2, wait_ms: 3000,
    ghost_r2: { color: '쌍 색(hex)', alpha: 0.55, width_of_line: 0.6, finger_lag_of_cell: 0.2, _rule: 'r2 S21: tint 색(대비 1.15:1) → 쌍 색 × 0.55. 손가락 끝은 선 머리보다 0.2칸 뒤(머리가 보이게)' },
    ghost: '(r1, ghost_r2 로 바뀜) 손가락이 지나간 칸에 그 쌍의 선을 굵기 0.6배, tint 색으로 그렸다 함께 사라짐',
    _rule: '레벨 1 시작 0.5 s 뒤 시연 쌍의 실제 정답 길을 따라감(그 점 기준 위치). 아이 손이 판에 닿으면 그 프레임에 250 ms 로 사라지고 다시 안 나옴(그 판을 완료하기 전까지 8 s 동안 판이 안 바뀌면 한 번 더).' },
  help: { idle_ms: 30000, breathe_period_ms: 1600, _rule: '30 s 동안 판이 안 바뀌면 도움 버튼이 숨 쉼. 누르면 아직 답과 다른 쌍 하나(안 이었거나 다른 길로 이은 쌍, balance 10-2)의 정답 길을 튜토리얼 손가락으로 보여 줌(그려 주지 않음).' },
  reduced_motion: {
    query: '(prefers-reduced-motion: reduce) 또는 보호자 설정 settings_motion',
    off: ['pop 크기 변화', '색 조각', '밝은 띠', '판 카드 크기 변화', '숨 쉬기(빈칸·노드·도움 버튼)', '% 세기 애니메이션', '화면 전환 이동', 'r2: 선 머리 스프링·칸 진입 튐', 'r2: 빛 번짐', 'r2: 판 완료 색 물결(→ 판 전체 tint 150 ms 페이드 한 번)', 'r2: 막힘 튕김(→ 막힌 점 고리 120 ms 옅게)', 'r2: 결과 점 줄 튐(→ 바로 표시)', 'r2: 페이지·레벨 전환 이동(→ 겹쳐 흐려짐 150 ms)'],
    keep: ['tint 페이드 150 ms', '고리 생김(즉시)', '판정 이름(튐 없이 나타남·사라짐)', '빈칸 신호 = gapGlow 테두리 1.2 s 고정 표시(깜빡임 없음)', '소리·진동'],
  },
  forbidden: ['화면 전체 밝기 변화·흰 번쩍임', '화면·카메라 흔들림', '초당 3회 이상 밝기 변화', '빨간 ✕·경고음·틀림 표시', '판 위 글자 팝업', 'r2: 연출이 끝나기를 기다리게 하는 빈 대기(입력 막기는 complete.lock·H1 결과 버튼 1.28 s 만)'],
};

// ---------- 그리기 규칙(r2 성능 S1·S2, 개발 전달 — 30-art 5-5절) ----------
export const RENDER = {
  _why: 'round-1 6배 스로틀 1% low 6~13 fps, LoAF 가 페인트·래스터. 목표: 6배 스로틀 평균 ≥ 55·1% low ≥ 45(3회 모두), 메뉴 전환 최장 프레임 ≤ 100 ms.',
  layers: [
    { name: 'bg', what: '레벨 바탕 2색 그라디언트 + decor', how: '레벨 시작 때 한 번: #play 의 CSS background(linear-gradient) 또는 오프스크린 캔버스 1장. 판 캔버스는 투명 바탕. 매 프레임 전체 화면 fillRect·drawDecor 금지' },
    { name: 'board', what: '판 카드·타일·빈칸 점·구멍 외곽선', how: '레벨 시작·크기 바뀜 때만 오프스크린 1장(판 크기 × DPR). tint 칸 변화는 그 칸만 다시 그림(dirty 칸)' },
    { name: 'lines', what: '선·점·고리·표지', how: '바뀐 쌍만 다시 그림. 점·표지는 쌍마다 미리 그린 비트맵(지름 × DPR) drawImage' },
    { name: 'fx', what: '조각·빛 번짐·띠·튐·물결', how: '미리 그린 원·방사형 비트맵 + globalAlpha·transform. 연출이 없으면 이 층을 그리지 않음' },
    { name: 'dom', what: '판정 이름·채움 %·버튼·카드', how: '판정 이름 3등급 × 쌍 색 글자는 레벨 시작 때 비트맵(흰 테두리 포함)으로 미리 그림 → 매 프레임 strokeText/fillText 금지. % 는 값이 바뀔 때만' },
  ],
  idle: '바뀐 것이 없으면 rAF 에서 아무것도 그리지 않음(드래그·연출 중에만 그림)',
  forbid_per_frame: ['전체 화면 그라디언트 fillRect', 'strokeText·shadowBlur·filter: blur', 'SVG innerHTML 넣기(카드·지도·별)', 'box-shadow 애니메이션', '글자 테두리(stroke) 효과'],
  svg_raster: '카드 그림(tutorial/*.svg)·지도 완료 노드 미니 그림·잠긴 노드 실루엣·별·아이콘: 부팅(또는 지도 첫 진입 전 유휴 시간)에 <img src=Blob URL> + await img.decode() 로 래스터, 이후 같은 <img> 재사용. 카드는 will-change: opacity, 닫힘은 opacity·transform 만',
  map_first: '타이틀 첫 탭의 오디오 잠금 해제는 지도 그리기와 다른 프레임(requestAnimationFrame 다음)으로 나눔. 지도 노드 10개 미니 그림은 부팅 유휴 시간에 미리 래스터(챕터 페이지는 지금·양옆 페이지만)',
  dpr_cap: '캔버스 DPR 최대 2(DPR 3 화면도 2로 그림, CSS 크기는 그대로)',
  wide_r3: {
    board_cache: '넓은 판(카메라 있음) 판 캐시 = 판 전체 1장(12x12 × 56 px × DPR 2 ≈ 1360² px ≈ 7.4 MB). 한 장이 2048x2048(16 MB) 를 넘으면 512 px 타일로 나눠 보이는 타일 ± 1 줄만 만듦. 캐시 층(판·선·미니맵) 합계 ≤ 32 MB',
    camera: '카메라 이동 = 판·선 캐시를 translate 로만 옮김(다시 그리기 없음). 전체 보기 ↔ 플레이 확대 300 ms 는 scale transform 1번 + 끝난 프레임에 그 배율로 캐시 다시 만들기 1회',
    dirty: '선·tint 는 바뀐 칸 사각형만 지우고 다시 그림(쌍 전체 다시 그리기 금지). 선 위 표지(5칸마다)·끝점 비트맵은 쌍마다 미리 그림',
    fx_limit: '색 물결·조각·빛 번짐은 viewport 안 칸만, 동시에 조각 ≤ 48개, 물결 칸 ≤ 화면 안 칸 수. 전체 보기에서는 물결 대신 판 전체 tint 150 ms',
    minimap: '미니맵 캔버스 1장(칸 × 미니맵 칸 px), 연결·끊김 때 그 쌍 칸만 칠함. 보이는 곳 테두리는 DOM 상자(transform)로 — 캔버스 다시 그리기 없음',
    text: '판정 이름·% 규칙 그대로(비트맵·값 바뀔 때만). 매 프레임 글자·테두리(stroke) 금지',
  },
  svg_assets: '에셋 SVG 는 그라디언트·필터·mask 없음(tutorial.mjs 검사: 그라디언트 0). app-icon 만 예외(빌드에서 안 씀)',
};

// ---------- 검사 ----------
const overlap = (a, b, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const inside = (a, W, H) => a.x >= 0 && a.y >= 0 && a.x + a.w <= W && a.y + a.h <= H;
function check(L) {
  let fail = 0, warn = 0; const out = [], table = [];
  const bad = (m) => { fail++; out.push('FAIL ' + m); };
  const fits = (id, s) => { for (const key of s.used_by) { if (!STR[key]) { bad(`${id} 글 키 ${key} 가 strings.json 에 없음`); continue; } for (const [lang, v] of strs(key)) {
    const lines = wrap(v, s.font_px, s.w), lh = s.font_px * PARAM.text_line;
    if (lines.some((l) => textW(l, s.font_px) > s.w)) bad(`${id} ${key}.${lang} 낱말이 글 자리(${s.w})보다 넓음`);
    if (lines.length > s.max_lines || lines.length * lh > s.h + 0.5) bad(`${id} ${key}.${lang} ${lines.length}줄이 글 자리(${s.w}x${s.h}, 최대 ${s.max_lines}줄)에 안 들어감`);
  } } };
  const noOverlap = (id, items, pad = 4) => { for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (overlap(items[i][1], items[j][1], pad)) bad(`${id} ${items[i][0]}·${items[j][0]} 겹침`); for (const [n, b] of items) if (!inside(b, b._W ?? 1e9, 1e9)) bad(`${id} ${n} 화면 밖`); };
  // J1: 가로 판정 기둥 = 2x + 1 < cols → 왼쪽, 아니면 오른쪽. 레벨 점마다 고른 기둥이 판 반쪽과 맞는지(가운데 열은 오른쪽)
  const sideOf = (x, cols) => (2 * x + 1 < cols ? 'left' : 'right');
  let center = 0; for (const lv of loadLevels()) for (const p of lv.pairs) for (const [x] of [p.a, p.b]) { const sd = sideOf(x, lv.width); if (2 * x + 1 === lv.width) { center++; if (sd !== 'right') bad(`J1 L${lv.order} 가운데 열 점 ${p.id} 기둥 ${sd}`); } else if ((x < lv.width / 2) !== (sd === 'left')) bad(`J1 L${lv.order} ${p.id} x=${x} 기둥 ${sd}`); }
  out.push(`J1 가로 판정 기둥 규칙: 가운데 열 점 ${center}개 → 오른쪽 기둥`);
  for (const lv of loadLevels()) if (lv.tutorial?.kind === 'finger_demo' && (lv.fill_card || lv.hole_card)) bad(`L${lv.order} 손가락 시연 레벨에 그림 카드 — board_text(tut_drag)가 카드와 같이 보임(coexists_with_card 전제 깨짐)`);
  const soft = (m) => { warn++; out.push('권장 미달 ' + m); };
  for (const [rk, boards] of Object.entries(L.play)) for (const [bk, o] of Object.entries(boards)) {
    const id = `${rk} ${bk}`;
    if (o.cell < PARAM.cell_min) bad(`${id} 칸 ${o.cell} < 48`);
    else if (o.cell < PARAM.cell_target) soft(`${id} 칸 ${o.cell} < 목표 56`);
    if (o.px.mark < 16) bad(`${id} 점 모양 표지 ${o.px.mark} px < 16`);
    if (!inside(o.board, o.W, o.H)) bad(`${id} 판이 화면 밖`);
    if (o.board.x < PARAM.side_margin - 1 || o.W - (o.board.x + o.board.w) < PARAM.side_margin - 1) bad(`${id} 판 옆 여백 < ${PARAM.side_margin}`);
    const btns = Object.entries(o.buttons);
    for (const [n, b] of btns) {
      if (b.w < 48 || b.h < 48) bad(`${id} 버튼 ${n} < 48`);
      if (!inside(b, o.W, o.H)) bad(`${id} 버튼 ${n} 화면 밖`);
      if (overlap(b, o.board, 4)) bad(`${id} 버튼 ${n} 가 판과 4 px 안`);
    }
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) if (overlap(btns[i][1], btns[j][1], 8)) bad(`${id} 버튼 ${btns[i][0]}·${btns[j][0]} 간격 < 8`);
    // 되돌리기·처음부터는 서로 떨어짐(가운데 사이 ≥ 2 버튼)
    const u = o.buttons.undo, r = o.buttons.restart; if (Math.hypot(u.x - r.x, u.y - r.y) < 2 * u.w) bad(`${id} 되돌리기·처음부터가 가까움`);
    // 쌍 점 줄 (6쌍 기준)
    const pr = o.pair_row; const pairRects = [];
    if (pr.kind === 'row') { const total = 5 * pr.pitch + pr.d; if (total > pr.x1 - pr.x0) bad(`${id} 쌍 점 줄 6개가 넘침`); const sx = (pr.x0 + pr.x1) / 2 - total / 2; for (let i = 0; i < 6; i++) pairRects.push(R(sx + i * pr.pitch, pr.cy - pr.d / 2, pr.d, pr.d)); }
    else { const total = 2 * pr.pitch + pr.d; if (total > pr.x1 - pr.x0) bad(`${id} 쌍 점 격자 3개가 넘침`); const sx = (pr.x0 + pr.x1) / 2 - total / 2; for (let i = 0; i < 6; i++) pairRects.push(R(sx + (i % 3) * pr.pitch, pr.y0 - pr.d / 2 + Math.floor(i / 3) * pr.pitch, pr.d, pr.d)); }
    if (pr.d * PARAM.mark_of_dot < 16) bad(`${id} 쌍 점 줄 표지 ${(pr.d * PARAM.mark_of_dot).toFixed(1)} px < 16`);
    for (const pc of pairRects) { if (overlap(pc, o.board, 2)) bad(`${id} 쌍 점 줄이 판과 겹침`); for (const [n, b] of btns) if (overlap(pc, b, 2)) bad(`${id} 쌍 점 줄이 버튼 ${n}와 겹침`); if (!inside(pc, o.W, o.H)) bad(`${id} 쌍 점 줄 화면 밖`); }
    // 판정 자리
    const J = o.judge; const slots = [];
    if (J.rule === 'portrait_band') {
      slots.push(R((J.x_min), J.y, J.x_max - J.x_min, J.h));
      if (J.w > J.x_max - J.x_min) bad(`${id} 판정 자리 폭 부족`);
    } else {
      for (const side of ['left', 'right']) { const s = J[side]; if (s.y_max < s.y_min) bad(`${id} 판정 ${side} 자리 높이 부족 (${s.y_min}..${s.y_max})`); slots.push(R(s.cx - J.w / 2, s.y_min, J.w, Math.max(0, s.y_max - s.y_min) + J.h)); const pil = o.pillars[side]; if (s.cx - J.w / 2 < pil.x + 4 || s.cx + J.w / 2 > pil.x + pil.w - 4) bad(`${id} 판정 ${side} 자리가 기둥(${pil.w}) 보다 넓음 (${J.w})`); }
    }
    for (const s of slots) { if (overlap(s, o.board, 0)) bad(`${id} 판정 자리가 판과 겹침`); for (const [n, b] of btns) if (overlap(s, b, 2)) bad(`${id} 판정 자리가 버튼 ${n}와 겹침`); for (const pc of pairRects) if (overlap(s, pc, 2)) bad(`${id} 판정 자리가 쌍 점 줄과 겹침`); if (!inside(s, o.W, o.H)) bad(`${id} 판정 자리 화면 밖`); }
    // 글 자리: 가장 긴 언어로 줄 수
    for (const [sn, s] of Object.entries(o.text_slots)) {
      if (overlap(s, o.board, 0)) bad(`${id} 글 자리 ${sn}가 판과 겹침`);
      for (const [n, b] of btns) if (overlap(s, b, 2)) bad(`${id} 글 자리 ${sn}가 버튼 ${n}와 겹침`);
      for (const pc of pairRects) if (overlap(s, pc, 2)) bad(`${id} 글 자리 ${sn}가 쌍 점 줄과 겹침`);
      for (const key of s.used_by) for (const [lang, v] of strs(key)) {
        const lines = wrap(v, s.font_px, s.w);
        const lh = s.font_px * PARAM.text_line;
        if (lines.some((l) => textW(l, s.font_px) > s.w)) bad(`${id} ${key}.${lang} 낱말이 글 자리보다 넓음`);
        if (lines.length > s.max_lines || lines.length * lh > s.h + 0.5) bad(`${id} ${key}.${lang} ${lines.length}줄이 글 자리(${s.w}x${s.h})에 안 들어감`);
      }
    }
    // r2 채움 막대 줄: 화면 안, 판·판정 자리·버튼·쌍 점 줄·글 자리와 겹침 0
    { const fb = o.fill_bar.row; if (!inside(fb, o.W, o.H)) bad(`${id} 채움 막대 화면 밖`); if (overlap(fb, o.board, 0)) bad(`${id} 채움 막대가 판과 겹침`);
      for (const s of slots) if (overlap(fb, s, 2)) bad(`${id} 채움 막대가 판정 자리와 겹침`); for (const [n, b] of btns) if (overlap(fb, b, 2)) bad(`${id} 채움 막대가 버튼 ${n}와 겹침`);
      for (const pc of pairRects) if (overlap(fb, pc, 2)) bad(`${id} 채움 막대가 쌍 점 줄과 겹침`); for (const [sn, s] of Object.entries(o.text_slots)) if (overlap(fb, s, 2)) bad(`${id} 채움 막대가 글 자리 ${sn}와 겹침`);
      if (o.fill_bar.bar.w < 3 * o.fill_bar.pct.w) bad(`${id} 채움 막대 ${o.fill_bar.bar.w} 가 % 의 3배보다 짧음(막대가 주 신호)`); }
    // r2 얇은 선: 선 굵기 ≥ 22 px(가장 작은 칸에서도), 점 지름 − 선 굵기 ≥ 0.2칸(끝점이 선보다 또렷), 손가락이 덮어도 선 머리가 앞으로 보이는 길이(head_lead) ≥ 선 굵기
    if (o.px.line_w < 22) bad(`${id} 선 굵기 ${o.px.line_w} px < 22`);
    if ((o.px.dot_d - o.px.line_w) / o.cell < 0.2 - 1e-9) bad(`${id} 점 − 선 ${(o.px.dot_d - o.px.line_w).toFixed(1)} px < 0.2칸`);
    if (o.cell * PARAM.head_lead_of_cell < o.px.line_w) bad(`${id} 선 머리 앞 보임 ${(o.cell * PARAM.head_lead_of_cell).toFixed(1)} < 선 굵기`);
    // r2 S3: 카드 상자 ∩ {글 자리, 판정 자리, 쌍 점 줄, 버튼, 채움 막대} = 0, 화면 안, 카드 글 = 카드 안 글 띠에 들어감, 카드 속 표지 ≥ 16
    const cd = o.card;
    if (!inside(cd, o.W, o.H)) bad(`${id} 그림 카드 화면 밖`);
    // 글 자리·판정 자리는 카드와 같은 때 보일 수 있으면 겹침 0. coexists_with_card: false 는 데이터로 증명: tut_drag = 손가락 시연 레벨(카드 없음), gap_left = 모든 쌍 연결 뒤(카드가 떠 있는 동안 입력 없음), 판정 = 연결 뒤
    for (const [sn, s] of Object.entries(o.text_slots)) if (overlap(cd, s, 0) && s.coexists_with_card !== false) bad(`${id} 그림 카드가 글 자리 ${sn}를 덮음`);
    if (o.portrait) for (const s of slots) if (overlap(cd, s, 0)) bad(`${id} 그림 카드가 판정 자리를 덮음`);
    for (const pc of pairRects) if (overlap(cd, pc, 0)) bad(`${id} 그림 카드가 쌍 점 줄을 덮음`);
    for (const [n, b] of btns) if (overlap(cd, b, 0)) bad(`${id} 그림 카드가 버튼 ${n}를 덮음`);
    if (overlap(cd, o.fill_bar.row, 0)) bad(`${id} 그림 카드가 채움 막대를 덮음`);
    if (cd.text.y + cd.text.h > cd.y + cd.h + 1.5 || cd.text.y < cd.art.y + cd.art.h - 1.5) bad(`${id} 카드 글 띠가 카드 밖·그림 위`);
    fits(`${id} 카드 글`, cd.text);
    const cardCell = (cd.art.w / 480) * CARD_CELL; if (cardCell * PARAM.dot_d_of_cell * PARAM.mark_of_dot < 16) bad(`${id} 그림 카드 속 표지 ${(cardCell * PARAM.dot_d_of_cell * PARAM.mark_of_dot).toFixed(1)} px < 16`);
    table.push({ id, cell: o.cell, mark: o.px.mark, line: o.px.line_w, card_mark: +(cardCell * PARAM.dot_d_of_cell * PARAM.mark_of_dot).toFixed(1) });
  }
  // r3 넓은 판: 플레이 칸 ≥ 48(목표 56), 보이는 칸 ≥ 5 x 5, 미니맵 칸 ≥ 3 px·누름 자리 ≥ 48·화면 안·버튼·판정·채움 막대·viewport 와 겹침 0, 전체 보기 칸은 그리기 없음
  for (const [rk, boards] of Object.entries(L.play_wide)) for (const [bk, o] of Object.entries(boards)) {
    const id = `넓은 판 ${rk} ${bk}`;
    if (!o.camera) { if (o.cell < PARAM.cell_min) bad(`${id} 칸 ${o.cell} < 48 인데 카메라 없음`); continue; }
    if (o.cell < PARAM.cell_min) bad(`${id} 플레이 칸 ${o.cell} < 48`);
    if (o.visible_cells[0] < PARAM.wide_min_visible || o.visible_cells[1] < PARAM.wide_min_visible) bad(`${id} 보이는 칸 ${o.visible_cells} < ${PARAM.wide_min_visible}`);
    if (o.camera.modes.overview.draw !== false) bad(`${id} 전체 보기(칸 ${o.fit_cell})에서 그리기 허용`);
    const mm = o.minimap; if (mm.cell < PARAM.minimap_cell_min) bad(`${id} 미니맵 칸 ${mm.cell} < ${PARAM.minimap_cell_min}`);
    if (mm.hit.w < 48 || mm.hit.h < 48) bad(`${id} 미니맵 누름 자리 < 48`);
    if (!inside(o.viewport, o.W, o.H)) bad(`${id} viewport 화면 밖`); if (!inside(mm, o.W, o.H)) bad(`${id} 미니맵 화면 밖`);
    const others = [...Object.entries(o.buttons), ['fill_bar', o.fill_bar.row], ['viewport', o.viewport], ...Object.entries(o.text_slots).filter(([, s]) => s.shared_with !== 'judge')];
    for (const [n, b] of others) if (overlap(mm.hit, b, 2)) bad(`${id} 미니맵이 ${n} 와 겹침`);
    for (const [n, b] of Object.entries(o.buttons)) if (overlap(o.viewport, b, 4)) bad(`${id} viewport 가 버튼 ${n} 와 4 px 안`);
    if (overlap(o.viewport, o.fill_bar.row, 0)) bad(`${id} viewport 가 채움 막대와 겹침`);
    for (const [sn, s] of Object.entries(o.text_slots)) if (overlap(o.viewport, s, 0)) bad(`${id} viewport 가 글 자리 ${sn} 와 겹침`);
    if (o.portrait && overlap(o.viewport, R(o.judge.x_min, o.judge.y, o.judge.x_max - o.judge.x_min, o.judge.h), 0)) bad(`${id} viewport 가 판정 띠와 겹침`);
    if (o.cell * PARAM.dot_d_of_cell * PARAM.mark_of_dot < 16) bad(`${id} 표지 < 16`);
    table.push({ id: `wide ${rk} ${bk}`, cell: o.cell, mark: +(o.cell * PARAM.dot_d_of_cell * PARAM.mark_of_dot).toFixed(1), line: +(o.cell * PARAM.line_w_of_cell).toFixed(1), card_mark: `전체 ${o.fit_cell} · 보임 ${o.visible_cells.join('x')} · 미니맵 ${mm.cell}` });
  }
  for (const [rk, m] of Object.entries(L.map)) {
    if (m.node_d < 48) bad(`지도 ${rk} 노드 < 48`);
    for (let i = 0; i < 10; i++) {
      const [x, y] = m.nodes[i]; const r = R(x - m.node_d / 2, y - m.node_d / 2, m.node_d, m.node_d);
      if (!inside(r, m.W, m.H)) bad(`지도 ${rk} 노드 ${i + 1} 화면 밖`);
      if (overlap(r, m.title, 4)) bad(`지도 ${rk} 노드 ${i + 1} 이 제목과 겹침`);
      if (overlap(r, m.stars, 4)) bad(`지도 ${rk} 노드 ${i + 1} 이 별 줄과 겹침`);
      for (const [n, b] of Object.entries(m.buttons)) if (overlap(r, b, 4)) bad(`지도 ${rk} 노드 ${i + 1} 이 ${n} 버튼과 겹침`);
      for (let j = i + 1; j < 10; j++) { const d = Math.hypot(m.nodes[j][0] - x, m.nodes[j][1] - y); if (d < m.node_d + 8) bad(`지도 ${rk} 노드 ${i + 1}·${j + 1} 간격 ${d.toFixed(0)} < ${m.node_d + 8}`); }
    }
    for (const lang of ['ko', 'en']) { const v = STR.map_screen?.[lang]; if (v && textW(v, m.title.font_px) > m.title.w) bad(`지도 ${rk} 제목 ${lang} 넘침`); }
    // r3 규약: 지도에 보호자 안내 글 자리·길게 누르기 없음
    if (Object.keys(m.text_slots).length) bad(`지도 ${rk} 글 자리 ${Object.keys(m.text_slots)} (보호자 안내 글 제거 규약)`);
    for (const [n, b] of Object.entries(m.buttons)) { if (b.hold_ms) bad(`지도 ${rk} ${n} 길게 누르기 (일반 버튼이어야 함)`); if (!inside(b, m.W, m.H)) bad(`지도 ${rk} ${n} 버튼 화면 밖`); }
    const gh = R(-99, -99, 1, 1);
    // r3 어려운 판 문 페이지: 문 + 둘레 별 칸이 서로·제목·별 줄·넘김·버튼과 겹침 0, 화면 안, 문 ≥ 48, 별 칸 ≥ 8 px
    { const hp = m.hard, rr = hp.ring.r + hp.ring.star_px / 2, boxes = hp.gates.map(([x, y]) => R(x - rr, y - rr, 2 * rr, 2 * rr));
      if (hp.gate_d < 48) bad(`지도 ${rk} 어려운 판 문 ${hp.gate_d} < 48`); if (hp.ring.star_px < 8) bad(`지도 ${rk} 문 별 칸 < 8`);
      if (2 * Math.PI * hp.ring.r / hp.ring.n < hp.ring.star_px + 2) bad(`지도 ${rk} 문 별 칸끼리 겹침`);
      boxes.forEach((b, i) => { if (!inside(b, m.W, m.H)) bad(`지도 ${rk} 문 ${i + 1} 화면 밖`); for (const [n, o2] of [['title', m.title], ['stars', m.stars], ['prev', m.pager.prev], ['next', m.pager.next], ['dots', m.pager.dots.hit], ...Object.entries(m.buttons)]) if (overlap(b, o2, 4)) bad(`지도 ${rk} 문 ${i + 1} 이 ${n} 와 겹침`); for (let j = i + 1; j < boxes.length; j++) if (overlap(b, boxes[j], 4)) bad(`지도 ${rk} 문 ${i + 1}·${j + 1} 겹침`); }); }
    // r2 챕터 넘김 줄: ◀ 점 ▶ 가 48 이상·화면 안·노드·버튼·글과 겹침 0, 점 지름 ≥ 10, 점 누름 자리 높이 ≥ 48
    { const pg = m.pager, items = [['prev', pg.prev], ['next', pg.next], ['dots', pg.dots]];
      for (const [n, b] of items) { if (!inside(b, m.W, m.H)) bad(`지도 ${rk} 넘김 ${n} 화면 밖`); if (n !== 'dots' && (b.w < 48 || b.h < 48)) bad(`지도 ${rk} 넘김 ${n} < 48`); if (overlap(b, gh, 4)) bad(`지도 ${rk} 넘김 ${n} 이 guardian_hold 와 겹침`);
        for (const [bn, bb] of Object.entries(m.buttons)) if (overlap(b, bb, 8)) bad(`지도 ${rk} 넘김 ${n} 이 ${bn} 버튼과 8 px 안`);
        for (let i = 0; i < 10; i++) { const [x, y] = m.nodes[i]; if (overlap(R(x - m.node_d / 2, y - m.node_d / 2, m.node_d, m.node_d), b, 4)) bad(`지도 ${rk} 노드 ${i + 1} 이 넘김 ${n} 과 겹침`); } }
      if (overlap(pg.prev, pg.dots.hit, 0) || overlap(pg.next, pg.dots.hit, 0)) bad(`지도 ${rk} 넘김 화살표가 점 누름 자리와 겹침`);
      if (pg.dots.d < 10) bad(`지도 ${rk} 챕터 점 ${pg.dots.d} < 10`); if (pg.dots.hit.h < 48) bad(`지도 ${rk} 챕터 점 누름 자리 < 48`);
      if (10 * m.stars.pitch > m.stars.w + 0.5) bad(`지도 ${rk} 별 10칸(${10 * m.stars.pitch}) 이 별 줄(${m.stars.w}) 보다 넓음`);
      for (const key of m.title.chapter_keys) if (STR[key]) for (const [lang, v] of strs(key)) if (textW(v, m.title.font_px) > m.title.w) bad(`지도 ${rk} ${key}.${lang} 제목 넘침`); }
  }
  for (const [rk, r] of Object.entries(L.result)) {
    const items = [['mini', r.mini_board], ['star', r.star], ['pair_dots', r.pair_dots], ['pct', r.pct], ['new_best', r.new_best], ['title', r.title], ['level_name', r.level_name], ...Object.entries(r.buttons)];
    if (r.pair_dots.d * PARAM.mark_of_dot < 12) bad(`결과 ${rk} 쌍 점 표지 ${(r.pair_dots.d * PARAM.mark_of_dot).toFixed(1)} px < 12`);
    if (r.pair_dots.pitch - r.pair_dots.d < 6) bad(`결과 ${rk} 쌍 점 간격 < 6`);
    fits(`결과 ${rk} 제목`, r.title); fits(`결과 ${rk} 레벨 이름`, { ...r.level_name, w: r.level_name.w - Math.round(24 * r.k) });
    for (const [n, b] of items) if (!inside(b, r.W, r.H)) bad(`결과 ${rk} ${n} 화면 밖`);
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (overlap(items[i][1], items[j][1], 4)) bad(`결과 ${rk} ${items[i][0]}·${items[j][0]} 겹침`);
    for (const [n, b] of Object.entries(r.buttons)) if (b.w < 48) bad(`결과 ${rk} 버튼 ${n} < 48`);
  }
  for (const [rk, t] of Object.entries(L.title)) { for (const [n, sl] of Object.entries(t.text_slots)) { fits(`타이틀 ${rk} ${n}`, sl); if (!inside(sl, t.W, t.H)) bad(`타이틀 ${rk} ${n} 화면 밖`); } noOverlap(`타이틀 ${rk}`, [['logo', t.logo], ['hero', t.hero], ...Object.entries(t.text_slots), ...Object.entries(t.buttons)]); if (t.hero.w < 96) bad(`타이틀 ${rk} 히어로 판 ${t.hero.w} < 96`); if (!inside(t.hero, t.W, t.H)) bad(`타이틀 ${rk} 히어로 화면 밖`); }
  for (const [rk, g] of Object.entries(L.guardian)) {
    for (const [n, sl] of Object.entries(g.text_slots)) fits(`보호자 ${rk} ${n}`, sl);
    fits(`보호자 ${rk} 확인 창`, g.confirm.text);
    for (const [n, c] of Object.entries(g.controls)) { if (c.h < 48 || c.w < 48) bad(`보호자 ${rk} ${n} < 48`); if (c.x < 0 || c.x + c.w > g.W) bad(`보호자 ${rk} ${n} 화면 폭 밖`); if (c.kind === 'text_button') for (const [lang, v] of strs(c.key)) if (textW(v, c.font_px) + 16 > c.w) bad(`보호자 ${rk} ${c.key}.${lang} 버튼 글 넘침`); }
    for (const b of [g.confirm.yes, g.confirm.no]) for (const [lang, v] of strs(b.key)) if (textW(v, b.font_px) + 16 > b.w) bad(`보호자 ${rk} ${b.key}.${lang} 넘침`);
    if (!inside(g.confirm.card, g.W, g.H)) bad(`보호자 ${rk} 확인 창 화면 밖`);
    noOverlap(`보호자 ${rk}`, [...Object.entries(g.text_slots), ...Object.entries(g.controls), ['close', g.buttons.close]], 0);
    noOverlap(`보호자 ${rk} 확인 창`, [['text', g.confirm.text], ['yes', g.confirm.yes], ['no', g.confirm.no]], 4);
  }
  for (const [rk, e] of Object.entries(L.error)) { for (const [n, sl] of Object.entries(e.text_slots)) { fits(`오류 ${rk} ${n}`, sl); if (!inside(sl, e.W, e.H)) bad(`오류 ${rk} ${n} 화면 밖`); } if (!inside(e.buttons.reload, e.W, e.H)) bad(`오류 ${rk} ↻ 화면 밖`); noOverlap(`오류 ${rk}`, [...Object.entries(e.text_slots), ['reload', e.buttons.reload]]); }
  return { fail, warn, out, table };
}

// ---------- 목업 SVG ----------
// 설명용 예시 판(이 문서에서 직접 만든 6x6 답 덮개, 레벨로 쓰지 않음). 칸 = 쌍 번호(0..5), -1 = 구멍
const SAMPLE6 = ['000111', '022221', '023321', '044351', '043351', '445551'].map((r) => [...r].map(Number));
const SAMPLE6_ENDS = [[[0, 2], [4, 0]], [[0, 3], [5, 5]], [[2, 1], [2, 4]], [[2, 2], [4, 2]], [[3, 2], [5, 0]], [[3, 4], [5, 2]]];
function pathOf(grid, p, start) { // 끝점에서 같은 색 칸을 따라 경로 순서
  const seq = [start]; const seen = new Set([start.join()]);
  for (;;) { const [r, c] = seq[seq.length - 1]; const nx = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].find(([a, b]) => grid[a]?.[b] === p && !seen.has(a + ',' + b)); if (!nx) break; seq.push(nx); seen.add(nx.join()); }
  return seq;
}
function boardSVG(o, state) { // state: {connected:Set, partial:{p, upto}}
  const C = PAL.common, pairs = PAL.pairs, g = o.grid, c = g.cell, P = PARAM;
  const cx = (col) => g.x + (col + 0.5) * c, cy = (row) => g.y + (row + 0.5) * c;
  const [cols, rows] = o.board_size;
  const grid = SAMPLE6.slice(0, rows).map((r) => r.slice(0, cols));
  let s = `<rect x="${o.board.x}" y="${o.board.y}" width="${o.board.w}" height="${o.board.h}" rx="${(c * P.board_r_of_cell).toFixed(1)}" fill="${C.board}" stroke="${C.boardEdge}" stroke-width="1.5"/>`;
  const filled = new Map();
  if (cols === 6 && rows === 6) {
    for (const p of state.connected) for (const [r, cc] of pathOf(grid, p, SAMPLE6_ENDS[p][0])) filled.set(r + ',' + cc, p);
  }
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    const p = filled.get(r + ',' + col); const ti = o.px.tile_inset;
    s += `<rect x="${(g.x + col * c + ti).toFixed(1)}" y="${(g.y + r * c + ti).toFixed(1)}" width="${(c - 2 * ti).toFixed(1)}" height="${(c - 2 * ti).toFixed(1)}" rx="${o.px.tile_r}" fill="${p === undefined ? C.tile : pairs[p].tint}"/>`;
    if (p === undefined) s += `<circle cx="${cx(col).toFixed(1)}" cy="${cy(r).toFixed(1)}" r="${(c * P.tile_dot_of_cell / 2).toFixed(1)}" fill="${C.tileDot}"/>`;
  }
  if (cols === 6 && rows === 6) {
    const lines = [...state.connected].map((p) => [p, pathOf(grid, p, SAMPLE6_ENDS[p][0])]);
    if (state.partial) { const q = pathOf(grid, state.partial.p, SAMPLE6_ENDS[state.partial.p][0]).slice(0, state.partial.upto); lines.push([state.partial.p, q]); }
    for (const [p, seq] of lines) s += `<polyline points="${seq.map(([r, cc]) => `${cx(cc).toFixed(1)},${cy(r).toFixed(1)}`).join(' ')}" fill="none" stroke="${pairs[p].hex}" stroke-width="${o.px.line_w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    SAMPLE6_ENDS.forEach((ends, p) => ends.forEach(([r, cc]) => { s += dotSVG(cx(cc), cy(r), o.px.dot_d, p, state.connected.has(p) ? o.px.ring_d : 0, o.px.ring_w); }));
  }
  return s;
}
export function markSVG(x, y, size, mark, fill = '#FFFFFF') {
  const sc = size / 2;
  return `<path d="${MARKS[mark]}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(2)})" fill="${fill}" stroke="${fill}" stroke-width="${MARK_STROKE_UNIT}" stroke-linejoin="round"/>`;
}
export function dotSVG(x, y, d, p, ringD = 0, ringW = 0, filled = true) {
  const pr = PAL.pairs[p]; let s = '';
  if (ringD) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(ringD / 2).toFixed(1)}" fill="none" stroke="${pr.hex}" stroke-width="${ringW}"/>`;
  if (filled) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(d / 2).toFixed(1)}" fill="${pr.hex}"/>` + markSVG(x, y, d * PARAM.mark_of_dot, pr.mark);
  else s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(d / 2 - 1.5).toFixed(1)}" fill="${PAL.common.white}" stroke="${pr.hex}" stroke-width="3"/>` + markSVG(x, y, d * PARAM.mark_of_dot, pr.mark, pr.hex);
  return s;
}
const ICON = (name) => { try { return readFileSync(resolve(HERE, `../icons/icon-${name}.svg`), 'utf8').replace(/<\?xml[^>]*>/, '').replace(/<svg[^>]*>/, '').replace('</svg>', ''); } catch { return ''; } };
function buttonSVG(b) {
  const C = PAL.common, r = b.w / 2;
  return `<circle cx="${b.x + r}" cy="${b.y + r}" r="${r - 1}" fill="${C.button}" stroke="${C.buttonEdge}" stroke-width="1.5"/><g transform="translate(${b.x + r * 0.25} ${b.y + r * 0.25}) scale(${(b.w * 0.75 / 48).toFixed(3)})">${ICON(b.icon)}</g>`;
}
function bg(W, H, theme) {
  const t = PAL.themes[theme];
  return `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bottom}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#bg)"/>`;
}
function playMockup(o) {
  const { W, H } = o; const C = PAL.common;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">` + bg(W, H, 'level09');
  const state = { connected: new Set([0, 1, 2]), partial: { p: 3, upto: 3 } };
  s += boardSVG(o, state);
  for (const b of Object.values(o.buttons)) s += buttonSVG(b);
  // 쌍 점 줄
  const pr = o.pair_row; const n = 6;
  const pos = (i) => pr.kind === 'row' ? [(pr.x0 + pr.x1) / 2 - (5 * pr.pitch) / 2 + i * pr.pitch, pr.cy] : [(pr.x0 + pr.x1) / 2 - pr.pitch + (i % 3) * pr.pitch, pr.y0 + Math.floor(i / 3) * pr.pitch];
  for (let i = 0; i < n; i++) { const [x, y] = pos(i); s += dotSVG(x, y, pr.d, i, 0, 0, state.connected.has(i)); }
  // 판정 표시 예: 쌍 2(노랑, 끝점 2,4) 가 방금 연결됨
  const J = o.judge, g = o.grid, c = g.cell; const dot = [2, 4];
  const dx = g.x + (dot[1] + 0.5) * c, dy = g.y + (dot[0] + 0.5) * c;
  let jx, jy;
  if (J.rule === 'portrait_band') { jx = Math.min(J.x_max - J.w / 2, Math.max(J.x_min + J.w / 2, dx)); jy = J.y + J.h / 2; }
  else { const side = 2 * dot[1] + 1 < o.board_size[0] ? J.left : J.right; jx = side.cx; jy = Math.min(side.y_max + J.h / 2, Math.max(side.y_min + J.h / 2, dy)); }
  const sh = PAL.pairs[2].shade, nm = STR.judge_1_name?.ko || '최고야';
  s += `<rect x="${jx - J.w / 2}" y="${jy - J.h / 2}" width="${J.w}" height="${J.h}" fill="none" stroke="#9AA" stroke-dasharray="4 4"/>`;
  s += `<text x="${jx}" y="${jy - J.h / 2 + J.name_px[0]}" text-anchor="middle" font-size="${J.name_px[0]}" font-weight="800" fill="${sh}" stroke="#FFFFFF" stroke-width="3" paint-order="stroke">${nm}</text>`;
  s += `<path d="${STAR}" transform="translate(${jx} ${jy - J.h / 2 + J.g1_star_px * 0.5}) scale(${J.g1_star_px / 2})" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.12" stroke-linejoin="round"/>`;
  { const fb = o.fill_bar; s += `<rect x="${fb.bar.x}" y="${fb.bar.y}" width="${fb.bar.w}" height="${fb.bar.h}" rx="${fb.bar.h / 2}" fill="${C.tile}"/><rect x="${fb.bar.x}" y="${fb.bar.y}" width="${Math.round(fb.bar.w * 0.61)}" height="${fb.bar.h}" rx="${fb.bar.h / 2}" fill="${mix(PAL.themes.level09.top, C.ink, 0.55)}"/><text x="${fb.pct.x + fb.pct.w}" y="${fb.pct.y + fb.pct.h * 0.8}" text-anchor="end" font-size="${fb.pct.font_px}" font-weight="700" fill="${C.inkSoft}">61%</text>`; }
  { const cd = o.card; s += `<rect x="${cd.x}" y="${cd.y}" width="${cd.w}" height="${cd.h}" rx="${cd.radius}" fill="none" stroke="#3A8" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${cd.x + 6}" y="${cd.y + 14}" font-size="11" fill="#3A8">그림 카드 자리(L2·L6 첫 진입 때만)</text><rect x="${cd.text.x}" y="${cd.text.y}" width="${cd.text.w}" height="${cd.text.h}" fill="none" stroke="#3A8" stroke-dasharray="2 3"/><text x="${cd.text.x + cd.text.w / 2}" y="${cd.text.y + cd.text.font_px + 2}" text-anchor="middle" font-size="${cd.text.font_px}" fill="#3A8">${STR.card_hole?.ko || ''}</text>`; }
  for (const t of Object.values(o.text_slots)) s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="none" stroke="#C8A" stroke-dasharray="3 5"/><text x="${t.x + t.w / 2}" y="${t.y + t.font_px + 4}" text-anchor="middle" font-size="${t.font_px}" fill="${C.ink}" opacity="0.35">${STR.tut_drag?.ko || ''}</text>`;
  const zones = o.thumb.zone ? [o.thumb.zone] : o.thumb.zones; for (const z of zones) s += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="#F29" opacity="0.06"/>`;
  s += `<text x="6" y="${H - 4}" font-size="10" fill="${C.inkSoft}">${W}x${H} · 칸 ${o.cell}px · 점선 = 판정 자리 / 글 자리, 분홍 = 엄지 가림</text></svg>`;
  return s;
}
function catmull(pts) { let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0]} ${p2[1]}`; } return d; }
export { catmull };
function mapMockup(m) {
  const C = PAL.common, { W, H } = m;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">` + bg(W, H, 'menu');
  const done = 4;
  s += `<path d="${catmull(m.nodes)}" fill="none" stroke="${C.pathTodo}" stroke-width="${m.path.w}" stroke-linecap="round"/>`;
  s += `<path d="${catmull(m.nodes.slice(0, done + 1))}" fill="none" stroke="${C.pathDone}" stroke-width="${m.path.w}" stroke-linecap="round"/>`;
  m.nodes.forEach(([x, y], i) => {
    const d = m.node_d;
    if (i < done) { // 완료: 미니 판 그림(예시 4x4 줄무늬)
      s += `<rect x="${x - d / 2}" y="${y - d / 2}" width="${d}" height="${d}" rx="${d * 0.22}" fill="${C.board}" stroke="${C.boardEdge}" stroke-width="1.5"/>`;
      const cc = d * 0.8 / 4; for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) { const p = (r * (i + 1) + q * (i % 2 ? 1 : 2) + i) % 3; s += `<rect x="${(x - d * 0.4 + q * cc + 1).toFixed(1)}" y="${(y - d * 0.4 + r * cc + 1).toFixed(1)}" width="${(cc - 2).toFixed(1)}" height="${(cc - 2).toFixed(1)}" rx="2" fill="${PAL.pairs[p].tint}"/>`; }
      s += `<polyline points="${x - d * 0.3},${y - d * 0.3} ${x + d * 0.3},${y - d * 0.3} ${x + d * 0.3},${y + d * 0.1}" fill="none" stroke="${PAL.pairs[i % 6].hex}" stroke-width="${(cc * 0.5).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (i % 2 === 0) s += `<path d="${STAR}" transform="translate(${x + d * 0.42} ${y - d * 0.42}) scale(${d * 0.16})" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.12" stroke-linejoin="round"/>`;
    } else if (i === done) {
      const rr = d / 2 + 6, fr = 0.4, ang = -Math.PI / 2 + fr * 2 * Math.PI; s += `<path d="M${x} ${y - rr} A${rr} ${rr} 0 ${fr > 0.5 ? 1 : 0} 1 ${(x + rr * Math.cos(ang)).toFixed(1)} ${(y + rr * Math.sin(ang)).toFixed(1)}" fill="none" stroke="${C.pathDone}" stroke-width="5" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${d / 2}" fill="${C.nodeOpen}" stroke="${C.nodeOpenEdge}" stroke-width="4"/>` + markSVG(x, y, d * 0.42, 'circle', C.nodeOpenEdge).replace(MARKS.circle, 'M-0.5 -0.8 L0.85 0 L-0.5 0.8 Z');
    } else {
      { const n = i < 7 ? 5 : 6, gw = d * 0.53, g = gw / n; s += `<circle cx="${x}" cy="${y}" r="${d / 2}" fill="${C.nodeLocked}"/>`; for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) s += `<rect x="${(x - gw / 2 + q * g + 0.6).toFixed(1)}" y="${(y - gw / 2 + r * g + 0.6).toFixed(1)}" width="${(g - 1.2).toFixed(1)}" height="${(g - 1.2).toFixed(1)}" rx="${(g * 0.22).toFixed(1)}" fill="${C.nodeLockedMark}" opacity="0.35"/>`; }
    }
  });
  s += buttonSVG(m.buttons.settings) + buttonSVG(m.buttons.sound);
  { const pg = m.pager; s += buttonSVG(pg.prev) + buttonSVG(pg.next); const st = ['pathTodo', 'pathDone', 'nodeLocked', 'nodeLocked', 'nodeLocked', 'nodeLocked']; for (let i = 0; i < pg.dots.n; i++) { const r = pg.dots.d / 2 * (i < 2 ? 1 : 0.75); s += `<circle cx="${pg.dots.x + pg.dots.d / 2 + i * pg.dots.pitch}" cy="${pg.cy}" r="${r}" fill="${i === 0 ? C.star : C[st[i]]}"/>`; } }
  for (let i = 0; i < 10; i++) { const x = m.stars.x + m.stars.w / 2 - 4.5 * m.stars.pitch + i * m.stars.pitch, y = m.stars.y + m.stars.h / 2; s += i < 2 ? `<path d="${STAR}" transform="translate(${x} ${y}) scale(${m.stars.star_px / 2})" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.12" stroke-linejoin="round"/>` : `<path d="${STAR}" transform="translate(${x} ${y}) scale(${m.stars.star_px / 2})" fill="${C.nodeLocked}" stroke="${C.pathTodo}" stroke-width="0.12"/>`; }
  s += `<text x="${W / 2}" y="${m.title.y + m.title.h * 0.7}" text-anchor="middle" font-size="${m.title.font_px}" font-weight="700" fill="${C.ink}">${STR.map_screen?.ko || ''}</text>`;
  s += `<text x="6" y="${H - 4}" font-size="10" fill="${C.inkSoft}">지도 ${W}x${H} · 챕터 2 페이지(점: 1 = 다 깸 별색, 2 = 지금) · 노드 ${m.node_d}px · 1~4 완료, 5 풀다 나감, 6~10 잠김(판 크기 실루엣)</text></svg>`;
  return s;
}
function hardMockup(m) {
  const C = PAL.common, { W, H } = m, hp = m.hard; const T = ['hard1', 'hard2', 'hard3', 'hard4', 'hard5'];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">` + bg(W, H, 'hard1');
  s += `<path d="${catmull(hp.gates)}" fill="none" stroke="${C.pathTodo}" stroke-width="${m.path.w}" stroke-linecap="round"/>`;
  const total = 23; // 예: 별 23개 → 문 1·2 열림, 문 3 별 칸 3개
  hp.gates.forEach(([x, y], i) => { const got = Math.max(0, Math.min(10, total - 10 * i)), open = total >= 10 * (i + 1), th = PAL.themes[T[i]];
    s += open ? `<circle cx="${x}" cy="${y}" r="${hp.gate_d / 2}" fill="${C.white}" stroke="${th.top}" stroke-width="${5 * m.k}"/><circle cx="${x}" cy="${y}" r="${hp.gate_d / 2 - 2.5 * m.k}" fill="none" stroke="${C.nodeOpenEdge}" stroke-width="2"/><path d="M${x - hp.gate_d * 0.12} ${y - hp.gate_d * 0.18} L${x + hp.gate_d * 0.2} ${y} L${x - hp.gate_d * 0.12} ${y + hp.gate_d * 0.18} Z" fill="${C.nodeOpenEdge}"/>`
      : `<circle cx="${x}" cy="${y}" r="${hp.gate_d / 2}" fill="${C.nodeLocked}"/>` + (() => { let t = ''; const n = 8 + i, gw = hp.gate_d * 0.55, g = gw / n; for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) t += `<rect x="${(x - gw / 2 + q * g + 0.4).toFixed(1)}" y="${(y - gw / 2 + r * g + 0.4).toFixed(1)}" width="${(g - 0.8).toFixed(1)}" height="${(g - 0.8).toFixed(1)}" rx="1" fill="${C.nodeLockedMark}" opacity="0.35"/>`; return t; })();
    for (let j = 0; j < 10; j++) { const a = (-90 + j * 36) * Math.PI / 180, sx = x + hp.ring.r * Math.cos(a), sy = y + hp.ring.r * Math.sin(a); s += `<path d="${STAR}" transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(${hp.ring.star_px / 2})" fill="${j < got ? C.star : C.nodeLocked}" stroke="${j < got ? C.starEdge : C.pathTodo}" stroke-width="0.12" stroke-linejoin="round"/>`; } });
  { const pg = m.pager; s += buttonSVG(pg.prev); for (let i = 0; i < pg.dots.n; i++) { const cx = pg.dots.x + pg.dots.d / 2 + i * pg.dots.pitch; s += i === 5 ? `<path d="${STAR}" transform="translate(${cx} ${pg.cy}) scale(${pg.dots.d * 0.7})" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.12"/>` : `<circle cx="${cx}" cy="${pg.cy}" r="${pg.dots.d / 2}" fill="${C.star}"/>`; } }
  s += buttonSVG(m.buttons.settings) + buttonSVG(m.buttons.sound);
  s += `<text x="6" y="${H - 4}" font-size="10" fill="${C.inkSoft}">어려운 판 문 ${W}x${H} · 예: 별 23개 → 문 1·2 열림, 문 3 별 칸 3/10 · 문 ${hp.gate_d}px · 글·숫자 없음</text></svg>`;
  return s;
}
function wideMockup(o) {
  const C = PAL.common, { W, H } = o, vp = o.viewport || o.board, c = o.cell;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">` + bg(W, H, 'hard3');
  s += `<clipPath id="vp"><rect x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" rx="${c * 0.3}"/></clipPath><g clip-path="url(#vp)"><rect x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" fill="${C.board}"/>`;
  const ox = vp.x - c * 2.3, oy = vp.y - c * 1.6; // 카메라 예: 판 (2.3, 1.6) 칸부터 보임
  for (let r = 0; r < 12; r++) for (let q = 0; q < 12; q++) { const x = ox + q * c, y = oy + r * c, p = (r < 4 && q < 7) ? (q < 4 ? 6 : 9) : -1; s += `<rect x="${(x + c * 0.05).toFixed(1)}" y="${(y + c * 0.05).toFixed(1)}" width="${(c * 0.9).toFixed(1)}" height="${(c * 0.9).toFixed(1)}" rx="${(c * 0.22).toFixed(1)}" fill="${p < 0 ? C.tile : PAL.pairs_ext[p - 6].tint}"/>`; }
  s += `<polyline points="${ox + 0.5 * c},${oy + 1.5 * c} ${ox + 3.5 * c},${oy + 1.5 * c} ${ox + 3.5 * c},${oy + 3.5 * c}" fill="none" stroke="${PAL.pairs_ext[0].hex}" stroke-width="${c * 0.48}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  s += `<rect x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" rx="${c * 0.3}" fill="none" stroke="${C.boardEdge}" stroke-width="1.5"/>`;
  const fz = c * 1.2; s += `<rect x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" fill="none" stroke="#F29" stroke-dasharray="4 4" opacity="0.5"/><rect x="${vp.x + fz}" y="${vp.y + fz}" width="${vp.w - 2 * fz}" height="${vp.h - 2 * fz}" fill="none" stroke="#F29" stroke-dasharray="2 6" opacity="0.5"/>`;
  const mm = o.minimap || { x: -999, y: -999, w: 0, h: 0, cell: 0 }; if (o.minimap) s += `<rect x="${mm.x - 2}" y="${mm.y - 2}" width="${mm.w + 4}" height="${mm.h + 4}" rx="4" fill="${C.board}" stroke="${C.boardEdge}"/><rect x="${mm.x}" y="${mm.y}" width="${mm.w}" height="${mm.h}" fill="${C.tile}"/><rect x="${mm.x}" y="${mm.y}" width="${mm.cell * 7}" height="${mm.cell * 4}" fill="${PAL.pairs_ext[0].tint}"/><rect x="${(mm.x + 2.3 * mm.cell).toFixed(1)}" y="${(mm.y + 1.6 * mm.cell).toFixed(1)}" width="${(mm.cell * o.visible_cells[0]).toFixed(1)}" height="${(mm.cell * o.visible_cells[1]).toFixed(1)}" rx="2" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
  for (const b of Object.values(o.buttons)) s += buttonSVG(b);
  const fb = o.fill_bar; s += `<rect x="${fb.bar.x}" y="${fb.bar.y}" width="${fb.bar.w}" height="${fb.bar.h}" rx="${fb.bar.h / 2}" fill="${C.tile}"/><rect x="${fb.bar.x}" y="${fb.bar.y}" width="${Math.round(fb.bar.w * 0.18)}" height="${fb.bar.h}" rx="${fb.bar.h / 2}" fill="${mix(PAL.themes.hard3.top, C.ink, 0.55)}"/>`;
  s += `<text x="6" y="${H - 4}" font-size="10" fill="${C.inkSoft}">넓은 판 12x12 ${W}x${H} · 칸 ${c}px(전체 보기 ${o.fit_cell}px) · ${o.camera ? '보이는 칸 ' + o.visible_cells.join('x') : '카메라 없음(판 전체가 칸 ≥ 48로 들어감)'} · 분홍 점선 = 따라가기 가장자리 1.2칸 · 위 = 미니맵(검은 테두리 = 보이는 곳)</text></svg>`;
  return s;
}
function slotsMockup(o, label) { // 타이틀·보호자·오류: 자리 + 한국어 글
  const C = PAL.common, { W, H } = o; const hgt = Math.max(H, o.content_h || 0);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${hgt}" viewBox="0 0 ${W} ${hgt}" font-family="system-ui, sans-serif">` + bg(W, hgt, 'menu');
  if (o.logo) s += `<g transform="translate(${o.logo.x} ${o.logo.y}) scale(${(o.logo.w / 160).toFixed(3)})">${readFileSync(resolve(HERE, '../logo-mark.svg'), 'utf8').replace(/<svg[^>]*>/, '').replace('</svg>', '')}</g>`;
  for (const [n, t] of Object.entries(o.text_slots)) { const v = STR[t.used_by[0]]?.ko || n; const lines = wrap(v, t.font_px, t.w); const ax = t.align === 'left' ? t.x : t.x + t.w / 2;
    s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="none" stroke="#C8A" stroke-dasharray="3 5"/>`;
    lines.slice(0, t.max_lines).forEach((l, i) => { s += `<text x="${ax}" y="${t.y + (t.valign === 'middle' ? t.h / 2 + t.font_px * 0.35 : t.font_px * (1 + i * PARAM.text_line))}" text-anchor="${t.align === 'left' ? 'start' : 'middle'}" font-size="${t.font_px}" font-weight="${t.weight || 400}" fill="${t.color === 'inkSoft' ? C.inkSoft : C.ink}">${l}</text>`; }); }
  for (const c of Object.values(o.controls || {})) s += c.kind === 'toggle' ? `<rect x="${c.x}" y="${c.y + c.h * 0.2}" width="${c.w}" height="${c.h * 0.6}" rx="${c.h * 0.3}" fill="${C.pathDone}"/><circle cx="${c.x + c.w - c.h * 0.3}" cy="${c.y + c.h / 2}" r="${c.h * 0.24}" fill="${C.white}"/>` : `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${c.h / 2}" fill="${C.button}" stroke="${C.buttonEdge}" stroke-width="1.5"/><text x="${c.x + c.w / 2}" y="${c.y + c.h / 2 + c.font_px * 0.35}" text-anchor="middle" font-size="${c.font_px}" fill="${C.ink}">${STR[c.key]?.ko || ''}</text>`;
  for (const b of Object.values(o.buttons || {})) s += buttonSVG(b);
  s += `<text x="6" y="${hgt - 4}" font-size="10" fill="${C.inkSoft}">${label} ${W}x${H}${o.scroll ? ` · 내용 높이 ${o.content_h}px → 세로 스크롤` : ''} · 점선 = 글 자리</text></svg>`;
  return s;
}
function resultMockup(r) {
  const C = PAL.common, { W, H } = r;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">` + bg(W, H, 'menu');
  const b = r.mini_board; const cc = b.w / 6;
  s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${cc * 0.3}" fill="${C.board}" stroke="${C.boardEdge}" stroke-width="1.5"/>`;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) s += `<rect x="${b.x + j * cc + 2}" y="${b.y + i * cc + 2}" width="${cc - 4}" height="${cc - 4}" rx="${cc * 0.2}" fill="${PAL.pairs[SAMPLE6[i][j]].tint}"/>`;
  for (let p = 0; p < 6; p++) { const seq = pathOf(SAMPLE6, p, SAMPLE6_ENDS[p][0]); s += `<polyline points="${seq.map(([i, j]) => `${b.x + (j + 0.5) * cc},${b.y + (i + 0.5) * cc}`).join(' ')}" fill="none" stroke="${PAL.pairs[p].hex}" stroke-width="${cc * 0.6}" stroke-linecap="round" stroke-linejoin="round"/>`; }
  s += `<text x="${r.title.x + r.title.w / 2}" y="${r.title.y + r.title.h * 0.72}" text-anchor="middle" font-size="${r.title.font_px}" font-weight="800" fill="${C.ink}">${STR.clear_title_1?.ko || ''}</text>`;
  s += `<path d="${STAR}" transform="translate(${r.star.x + r.star.w / 2} ${r.star.y + r.star.h / 2}) scale(${r.star.w * 0.48})" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.07" stroke-linejoin="round"/>`;
  s += `<text x="${r.pct.x + r.pct.w / 2 + 14}" y="${r.pct.y + r.pct.h * 0.75}" text-anchor="middle" font-size="${r.pct.font_px}" font-weight="700" fill="${C.inkSoft}">83%</text>`;
  { const pd = r.pair_dots; for (let i = 0; i < 6; i++) { const x = pd.x + pd.d / 2 + i * pd.pitch, y = pd.y + pd.d / 2, full = i !== 3; s += full ? dotSVG(x, y, pd.d, i, 0, 0, true) + `<circle cx="${x + pd.d * 0.42}" cy="${y - pd.d * 0.42}" r="${pd.d * 0.17}" fill="${C.star}"/>` : dotSVG(x, y, pd.d, i, 0, 0, false); } }
  for (const bt of Object.values(r.buttons)) s += buttonSVG(bt);
  { const ln = r.level_name, nm = STR.level9_name?.ko || '', bw = textW(nm, ln.font_px) + 24 * r.k; s += `<rect x="${ln.x + ln.w / 2 - bw / 2}" y="${ln.y}" width="${bw}" height="${ln.h}" rx="${ln.h / 2}" fill="${PAL.themes.level09.top}" stroke="${C.boardEdge}" stroke-width="1.5"/><text x="${ln.x + ln.w / 2}" y="${ln.y + ln.h / 2 + ln.font_px * 0.35}" text-anchor="middle" font-size="${ln.font_px}" font-weight="700" fill="${C.ink}">${nm}</text>`; }
  s += `<g transform="translate(${r.new_best.x} ${r.new_best.y}) scale(${(r.new_best.w / 48).toFixed(3)})">${ICON('new_best')}</g>`;
  s += `<text x="6" y="${H - 4}" font-size="10" fill="${C.inkSoft}">결과 ${W}x${H} · 레벨 이름 띠(L9 바탕색) · 빈 별 칸(쌍 4 속 빈 점) + 쌍 점 줄(꽉 찬 5·속 빈 1) + 83 % + 지난번보다 표지</text></svg>`;
  return s;
}

// ---------- 실행 ----------
const args = process.argv.slice(2);
const L = buildLayout();
if (args.includes('--write') || !existsSync(OUT)) {
  writeFileSync(OUT, JSON.stringify(L, null, 1) + '\n'); console.log('wrote', OUT);
  const md = resolve(HERE, '../mockups'); mkdirSync(md, { recursive: true });
  for (const [W, H] of RES) {
    writeFileSync(join(md, `play-${W}x${H}.svg`), playMockup(L.play[`${W}x${H}`]['6x6']));
    writeFileSync(join(md, `map-${W}x${H}.svg`), mapMockup(L.map[`${W}x${H}`]));
    writeFileSync(join(md, `map-hard-${W}x${H}.svg`), hardMockup(L.map[`${W}x${H}`]));
    writeFileSync(join(md, `play-wide-${W}x${H}.svg`), wideMockup(L.play_wide[`${W}x${H}`]['12x12']));
    writeFileSync(join(md, `result-${W}x${H}.svg`), resultMockup(L.result[`${W}x${H}`]));
    writeFileSync(join(md, `title-${W}x${H}.svg`), slotsMockup(L.title[`${W}x${H}`], '타이틀'));
    writeFileSync(join(md, `guardian-${W}x${H}.svg`), slotsMockup(L.guardian[`${W}x${H}`], '보호자'));
    writeFileSync(join(md, `error-${W}x${H}.svg`), slotsMockup(L.error[`${W}x${H}`], '오류'));
  }
  console.log('wrote mockups');
} else {
  const disk = readFileSync(OUT, 'utf8');
  if (disk !== JSON.stringify(L, null, 1) + '\n') { console.log('FAIL layout.json 이 layout.mjs 계산과 다름 (--write 로 다시 만드세요)'); process.exitCode = 1; }
}
const r = check(L);
console.log('해상도·판          칸(px)  표지(px)  선(px)  카드 속 표지');
for (const t of r.table) console.log(`${t.id.padEnd(18)} ${String(t.cell).padEnd(7)} ${String(t.mark).padEnd(9)} ${String(t.line).padEnd(7)} ${t.card_mark}`);
for (const l of r.out) console.log(l);
console.log(r.fail ? `레이아웃 검사 실패 ${r.fail}건, 권장 미달 ${r.warn}건` : `레이아웃 검사 통과 (권장 미달 ${r.warn}건)`);
if (r.fail) process.exitCode = 1;
