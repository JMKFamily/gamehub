#!/usr/bin/env node
// flow-01 화면 배치 원본 + 검사 + 목업 (art-director). 30-art 3·4절.
//   node assets/check/layout.mjs            검사만 (layout.json 을 다시 계산해 비교 + 규칙 검사)
//   node assets/check/layout.mjs --write    layout.json + assets/mockups/*.svg 쓰고 검사
// 단위: CSS px. W·H = 화면, k = 크기 배율 clamp(min(W,H)/360, 1, 1.5). 판 크기 [cols, rows].
// 글 폭은 추정(한글 0.96 em, 라틴 0.58 em, 공백 0.30 em)으로 검사하고 실제 글꼴 폭은 qa 가 빌드 스크린샷으로 확인.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKS, MARK_STROKE_UNIT, STAR, FINGER } from './shapes.mjs';
import { loadLevels } from './tutorial.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT = resolve(HERE, '../layout.json');
const PAL = JSON.parse(readFileSync(resolve(HERE, '../palette.json'), 'utf8'));
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
  line_w_of_cell: 0.60, dot_d_of_cell: 0.74, mark_of_dot: 0.46, ring_of_cell: 0.86, ring_w_of_cell: 0.05,
  head_lead_of_cell: 0.5,   // 드래그 중 선 머리가 점유 칸 가운데에서 손가락 쪽으로 더 늘어나 보이는 최대 길이
  btn: 48, btn_gap: 12, edge: 12,
  hud_h: 64,             // 세로: 위 HUD 띠(홈·쌍 점 줄)
  bottom_h: 80,          // 세로: 아래 버튼 줄(되돌리기·도움·처음부터)
  pair_d: 36, pair_pitch: 44,
  judge_font: [38, 33, 28], // 판정 이름 1단·2단·3단 글자 크기(× k). 1-2: 34/31/28 → 38/33/28(단계 차를 벌림, 주 단서는 튐·조각·음 개수)
  pct_of_name: 0.55, pct_min: 15,
  text_font: 20, text_font_landscape: 18, text_line: 1.3,
  card_aspect: 1.5, card_w_max: 480,
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
  const slotH = Math.round(nameMax * 1.15 + pct * 1.25);
  const nameWidest = Math.max(...[1, 2, 3].flatMap((g) => strs(`judge_${g}_name`).map(([, v]) => textW(v, Math.round(P.judge_font[g - 1] * k)))), textW('100%', pct));
  const slotW = Math.ceil(nameWidest + 16);
  const padN = 2 * P.board_pad_of_cell;
  const o = { W, H, k, portrait, board_size: [cols, rows] };
  if (portrait) {
    const hudH = Math.round(P.hud_h * k), botH = Math.round(P.bottom_h * k);
    const availW = W - 2 * P.side_margin;
    const topMin = hudH + slotH + 12; // 판 위 판정 띠
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
    o.judge = { pct_lifetime: 'with_judge_name', pct_counts: 'connected_pairs_cells_only', rule: 'portrait_band', y: Math.round(by - 6 - slotH), h: slotH, w: slotW, x_min: 8, x_max: W - 8, name_px: P.judge_font.map((v) => Math.round(v * k)), pct_px: pct,
      _rule: '판정 띠 = 판 바로 위(판 윗변 − 6 − h). 가로 가운데 = 연결된 짝 점의 x 를 [x_min + w/2, x_max − w/2]로 자름. 판 안·선·점·손가락 위에 그리지 않음(손은 아래에서 옴).' };
    const txtTop = by + bh + 8, txtBot = H - botH - 4;
    const tf = Math.round(P.text_font * k);
    o.text_slots = {
      board_text: { ...R(16, txtTop, W - 32, txtBot - txtTop), font_px: tf, max_lines: 2, align: 'center', used_by: ['tut_drag', 'card_fill', 'card_hole', 'gap_left'],
        _rule: '판 아래 ~ 버튼 줄 위. 튜토리얼 글(첫 연결 프레임에 사라짐)·빈칸 글(3번째 숨 쉬기에만, motion.gap_hint.text_on_breath)이 시간으로 나뉨. 판정 이름이 오면 gap_left 글은 그 프레임에 숨김.' },
    };
    if (o.text_slots.board_text.h < tf * P.text_line * 1) { // 공간이 모자라면 판정 띠를 같이 씀(시간으로 나뉨)
      o.text_slots.board_text = { ...R(16, o.judge.y, W - 32, slotH), font_px: tf, max_lines: 2, align: 'center', used_by: ['tut_drag', 'card_fill', 'card_hole', 'gap_left'], shared_with: 'judge',
        _rule: '판 아래 공간이 한 줄보다 좁아 판정 띠를 같이 씀. 튜토리얼 글은 첫 연결 전, 빈칸 글은 3번째 숨 쉬기에만. 우선순위: 판정 이름 > gap_left — 판정 이름이 오면 그 프레임에 gap_left 글을 숨기고 다시 띄우지 않음(그 숨 쉬기 동안).' };
    }
    o.thumb = { zone: R(0, H * 0.62, W, H * 0.38), _rule: '세로: 손가락·손바닥이 누른 점의 아래쪽을 가림. 판정 이름·쌍 점 줄·튜토리얼 글은 위쪽에, 빈칸 신호는 손을 뗀 뒤.' };
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
    o.pair_row = { kind: 'grid3', x0: Rx + 8, x1: W - 8, y0: edge + Math.round(pd / 2), d: pd, pitch: pp, cols: 3, _rule: '오른쪽 기둥 위: 한 줄 3개, 넘치면 다음 줄(최대 2줄). 기둥 가운데 정렬.' };
    const tf = Math.round(P.text_font_landscape * k);
    const Ltop = o.buttons.map.y + btn + 8, Lbot = o.buttons.restart.y - 8;
    const Rtop = o.pair_row.y0 + pp + Math.round(pd / 2) + 8, Rbot = o.buttons.help.y - 8;
    o.judge = { pct_lifetime: 'with_judge_name', pct_counts: 'connected_pairs_cells_only', rule: 'landscape_pillar', h: slotH, w: slotW, name_px: P.judge_font.map((v) => Math.round(v * k)), pct_px: pct,
      left: { cx: Math.round(Lw / 2), y_min: Ltop, y_max: Lbot - slotH },
      right: { cx: Math.round(Rx + (W - Rx) / 2), y_min: Rtop, y_max: Rbot - slotH },
      side_rule: '2x + 1 < cols → left, 아니면 right', _rule: '판정 자리 = 방금 연결된 짝 점(손을 뗀 쪽 점)의 열 x 로 기둥을 고름: 2x + 1 < cols 면 왼쪽 기둥, 아니면 오른쪽 기둥. 폭이 홀수인 판(폭 5)의 가운데 열 x = 2 는 오른쪽 기둥(L3~L6 가운데 열 점, 검사 J1). 세로 가운데 = 그 점의 y 를 [y_min + h/2, y_max + h/2]로 자름. 판 위에 그리지 않음.' };
    o.text_slots = {
      board_text: { ...R(8, Ltop, Lw - 16, Lbot - Ltop), font_px: tf, max_lines: 4, align: 'center', used_by: ['tut_drag', 'card_fill', 'card_hole', 'gap_left'], shared_with: 'judge.left',
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
  o.card = (() => { const w = Math.min(PARAM.card_w_max * k, W - 32, (H - 24) * PARAM.card_aspect); const h = w / PARAM.card_aspect; const cy = Math.min(Math.max(o.board.y + o.board.h / 2, h / 2 + 12), H - h / 2 - 12); return R((W - w) / 2, cy - h / 2, w, h, { _rule: '그림 카드(새 요소 소개)는 판 가운데 위에 뜨는 창. 화면 가운데 가로, 세로는 판 가운데. 뜨는 동안 판 입력 없음, 누르거나 3 s 뒤 사라짐.' }); })();
  return o;
}

// ---------- 진행 지도 ----------
function map(W, H) {
  const k = kOf(W, H), portrait = H >= W, node = Math.round(PARAM.map_node * k), btn = Math.round(PARAM.btn * k), edge = Math.round(PARAM.edge * k);
  const titleH = Math.round(56 * k), starsH = Math.round(24 * k), barH = btn + 2 * edge; // 아래 띠: 톱니(보호자) + guardian_hold 글
  const nodes = [];
  if (portrait) {
    const y0 = titleH + starsH + node / 2 + 12, y1 = H - barH - node / 2 - 8;
    for (let i = 0; i < 10; i++) nodes.push([Math.round(W * (i % 2 ? 0.70 : 0.30)), Math.round(y0 + ((y1 - y0) * i) / 9)]);
  } else {
    const x0 = node / 2 + 40 * k, x1 = W - node / 2 - 40 * k;
    const top = titleH + starsH, avail = H - barH - 8 - top; for (let i = 0; i < 10; i++) nodes.push([Math.round(x0 + ((x1 - x0) * i) / 9), Math.round(top + avail * (i % 2 ? 0.72 : 0.28))]);
  }
  const fs = Math.round(PARAM.small_font * k);
  const settings = R(W - edge - btn, H - edge - btn, btn, btn, { icon: 'settings', key: 'btn_settings', hold_ms: 1500, _rule: '보호자: 1.5 s 길게 누르기. 아래 오른쪽(바로 왼쪽에 guardian_hold 글)' });
  return { W, H, k, node_d: node, nodes, title: R(edge + btn + 8, 8, W - 2 * (edge + btn + 8), titleH - 8, { font_px: Math.round(20 * k), key: 'map_screen' }),
    stars: R(W / 2 - 95 * k, titleH - 2, 190 * k, starsH, { star_px: Math.round(16 * k), pitch: Math.round(19 * k), _rule: '모은 별 10칸 줄(글·숫자 없음): 받은 별 = star 면, 아직 = star_empty 점선. 대체 글 aria_map_stars.' }),
    node_states: { locked: 'node-locked.svg: nodeLocked 원 + 가운데 작은 점(자물쇠 그림 없음, 겁주지 않음). 누르면 아무 일 없음(소리도 없음)', next: 'node-open.svg: 흰 원 + nodeOpenEdge 테두리 + ▶, 1.6 s 주기 1.0 ↔ 1.06 숨 쉼', partial: 'node-partial.svg: next 와 같고 테두리 바깥에 칠한 칸 비율만큼 pathDone 호(12시부터 시계 방향, 숫자 없음) — 풀다 나간 판의 최고 판 채움(연결된 쌍이 칠한 칸 기준, G3)', done: '그 판 정답의 미니 그림(둥근 네모 판 + tint 칸 + 선, 점 생략). 미니 그림 둘레 4k px 띠 = 그 레벨 바탕 top 색 + boardEdge(결과 화면 레벨 이름 띠와 같은 색, G7)', star: 'done + 오른쪽 위 작은 별(노드 지름 0.32)' },
    buttons: { settings, sound: R(edge, edge, btn, btn, { icon: 'sound_on', key: 'settings_sound', _rule: '켬/끔, aria-pressed' }) },
    text_slots: { guardian_hold: { ...R(edge, settings.y, settings.x - 8 - edge, btn), font_px: fs, max_lines: 2, align: 'right', used_by: ['guardian_hold'], color: 'inkSoft', _rule: '톱니 바로 왼쪽, 오른쪽 정렬·세로 가운데. 늘 보임(작게).' } },
    path: { w: Math.round(10 * k), _rule: '노드 가운데를 잇는 Catmull-Rom 곡선(장력 0.5). 지나온 구간 pathDone, 앞 구간 pathTodo, 끝 둥글게.' } };
}

// ---------- 결과 화면 ----------
// 세로: 레벨 이름 띠 → 클리어 제목 → 미니 판 → 별 → %(+ new_best 표지) → 버튼 / 가로: 왼쪽 미니 판, 오른쪽 기둥에 같은 순서
function result(W, H) {
  const k = kOf(W, H), portrait = H >= W, S = Math.min(W, H), btn = Math.round(PARAM.btn * k), big = Math.round(72 * k);
  const bs = Math.round(S * PARAM.result_board_of_S), lnH = Math.round(28 * k), lnF = Math.round(PARAM.level_name_font * k), nb = Math.round(28 * k);
  const band = (x, y, w) => R(x, y, w, lnH, { font_px: lnF, max_lines: 1, used_by: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `level${i}_name`), color: 'ink', bg: 'themes.levelNN.top', _rule: '그 레벨 이름(지도와 같은 이름). 띠 = 글 폭 + 24k 만큼만, 가운데 정렬, 둥근 끝, 바탕 = 그 레벨 바탕 top 색 + boardEdge 1.5 px = 지도 완료 노드 미니 그림 둘레 띠와 같은 색(글을 못 읽어도 색으로 이어짐, G7).' });
  const pctRow = (x, y, w, f) => R(x, y, w, 40 * k, { font_px: f, icon: 'one_go', key: 'result_accuracy', _rule: '% = 한 번에 이은 쌍 수 / 쌍 수 × 100(내림, G2). 앞에 icon-one_go. 별도 "한 번에 이은 쌍" 표지·쌍 점 줄은 두지 않음(G2).' });
  const nbOf = (p) => R(p.x + p.w + 4, p.y + (p.h - nb) / 2, nb, nb, { icon: 'new_best', key: 'result_new_best', _rule: '지난 최고 %보다 높을 때만, % 세기가 끝난 뒤 0 → 1.0 (200 ms, 동작 줄이기면 바로). img, alt = result_new_best. 글 없음.' });
  const buttons = (cx, by) => ({ map: R(cx - big / 2 - 24 - btn, by + big / 2 - btn / 2, btn, btn, { icon: 'map', key: 'btn_map' }), next: R(cx - big / 2, by, big, big, { icon: 'next', key: 'btn_next' }), again: R(cx + big / 2 + 24, by + big / 2 - btn / 2, btn, btn, { icon: 'restart', key: 'btn_again' }) });
  const titleKeys = ['clear_title_1', 'clear_title_2', 'clear_title_3', 'clear_star', 'clear_last'];
  if (portrait) {
    const by = Math.round(H * 0.20), titleY = by - Math.round(56 * k);
    const pct = pctRow(W / 2 - 90 * k, by + bs + 16 + 88 * k, 180 * k, Math.round(26 * k));
    return { W, H, k, level_name: band(16, titleY - lnH - 4, W - 32), mini_board: R((W - bs) / 2, by, bs, bs), title: R(16, titleY, W - 32, Math.round(44 * k), { font_px: Math.round(24 * k), max_lines: 1, used_by: titleKeys }),
      star: R(W / 2 - 40 * k, by + bs + 16, 80 * k, 80 * k), pct, new_best: nbOf(pct), buttons: buttons(W / 2, H - 40 - big) };
  }
  const bx = Math.round(W * 0.30 - bs / 2), by = Math.round((H - bs) / 2), rx = Math.round(W * 0.66), lnY = Math.round(H * 0.05), tY = lnY + lnH + 6, sY = Math.round(H * 0.28);
  const pct = pctRow(rx - 90 * k, sY + 88 * k, 180 * k, Math.round(24 * k));
  return { W, H, k, level_name: band(W * 0.48, lnY, W * 0.48), mini_board: R(bx, by, bs, bs), title: R(W * 0.48, tY, W * 0.48, 40 * k, { font_px: Math.round(22 * k), max_lines: 1, used_by: titleKeys }),
    star: R(rx - 40 * k, sY, 80 * k, 80 * k), pct, new_best: nbOf(pct), buttons: buttons(rx, H - 24 - big) };
}

// ---------- 글이 보이는 다른 화면 (G7: 타이틀·보호자·불러오기/오류) ----------
function column(W, H, k) { const cw = Math.min(W - 32, Math.round(560 * k)); return { x: Math.round((W - cw) / 2), w: cw }; }
function textBlock(x, y, w, key, font, maxLines, extra = {}) {
  const lh = font * PARAM.text_line, lines = Math.max(1, ...strs(key).map(([, v]) => wrap(v, font, w).length));
  return R(x, y, w, Math.ceil(Math.min(lines, maxLines) * lh), { font_px: font, max_lines: maxLines, used_by: [key], ...extra });
}
function titleScreen(W, H) {
  const k = kOf(W, H), col = column(W, H, k), btn = Math.round(PARAM.btn * k), edge = Math.round(PARAM.edge * k);
  const logo = R(W / 2 - 80 * k, H * 0.22, 160 * k, 64 * k, { svg: 'logo-mark.svg' });
  const name = textBlock(col.x, logo.y + logo.h + 12, col.w, 'title', Math.round(40 * k), 1, { align: 'center', weight: 800 });
  const tag = textBlock(col.x, name.y + name.h + 8, col.w, 'tagline', Math.round(20 * k), 2, { align: 'center', color: 'inkSoft' });
  const tap = textBlock(col.x, H - Math.round(64 * k), col.w, 'tap_to_start', Math.round(20 * k), 1, { align: 'center', _rule: '1.6 s 주기로 옅게 숨 쉼(동작 줄이기면 고정). 화면 어디를 눌러도 시작.' });
  return { W, H, k, bg: 'menu', logo, buttons: { sound: R(edge, edge, btn, btn, { icon: 'sound_on', key: 'settings_sound' }) }, text_slots: { title: name, tagline: tag, tap_to_start: tap } };
}
function guardianScreen(W, H) {
  const k = kOf(W, H), col = column(W, H, k), btn = Math.round(PARAM.btn * k), edge = Math.round(PARAM.edge * k), gap = Math.round(12 * k);
  const fB = Math.round(16 * k), fL = Math.round(18 * k), fS = Math.round(PARAM.small_font * k), tw = Math.round(64 * k);
  const ts = {}, ctl = {};
  ts.guardian_title = { ...textBlock(col.x, edge, col.w - btn - 8, 'guardian_title', Math.round(22 * k), 1, { align: 'left', weight: 800, valign: 'middle' }), h: btn };
  const close = R(col.x + col.w - btn, edge, btn, btn, { icon: 'close', key: 'btn_close' });
  let y = edge + btn + gap;
  ts.guardian_intro = textBlock(col.x, y, col.w, 'guardian_intro', fB, 14, { align: 'left' }); y += ts.guardian_intro.h + gap;
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
  return { W, H, k, bg: 'menu', column: col, content_h: y, scroll: y > H, _rule: '어른 화면: 글이 화면보다 길면 세로 스크롤(아이 화면 아님). 닫기 ✕ 는 머리 줄에 고정.', buttons: { close }, controls: ctl, text_slots: ts, confirm };
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
  const play_ = {}, map_ = {}, res_ = {}, title_ = {}, guard_ = {}, err_ = {};
  for (const [W, H] of RES) {
    const key = `${W}x${H}`;
    play_[key] = {}; for (const [c, r] of BOARDS) play_[key][`${c}x${r}`] = play(W, H, c, r);
    map_[key] = map(W, H); res_[key] = result(W, H); title_[key] = titleScreen(W, H); guard_[key] = guardianScreen(W, H); err_[key] = errorScreen(W, H);
  }
  return {
    schema_version: 1,
    _source: 'assets/check/layout.mjs --write 가 생성(art-director 원본). 30-art 3~5절 표는 요약. 빌드는 이 파일만 읽음. 화면 크기가 4해상도와 다르면 같은 식(layout.mjs play/map/result)을 빌드가 그대로 옮겨 계산.',
    param: PARAM,
    marks: { stroke_unit: MARK_STROKE_UNIT, paths: MARKS, _rule: '표지 반지름 = px.mark/2. fill + 같은 색 stroke(lineWidth = stroke_unit, 단위 좌표), lineJoin round. 색 = common.white.' },
    star_path: STAR,
    finger: { ...FINGER, size_of_cell: 1.0, _rule: '손가락 끝(tip) = 시연 위치. 크기 1칸. 세로 화면에서 손은 오른쪽 아래, 점이 판 오른쪽 끝 열이면 x 를 뒤집음.' },
    play: play_, map: map_, result: res_, title: title_, guardian: guard_, error: err_,
    hole_rule: HOLE_RULE,
    motion: MOTION,
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
  },
  cut: { ms: 200, _rule: '잘린 부분이 옅어지며(불투명 1 → 0) 굵기 1 → 0.5 로 줄어듦. 같은 드래그 안에서 되돌리면 120 ms 에 되살아남. 그 쌍의 쌍 점 줄 점은 120 ms 에 조용히 비워짐.', sound: 'cut' },
  blocked: { ms: 250, dot_scale: [1, 1.08, 1], ease: 'inout', sound: null, _rule: '막힌 다른 색 점이 한 번 작게 숨 쉼. 소리·진동 없음.' },
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
      { t: 380, what: '판 카드 1.0 → 1.03 → 1.0 (300 ms, spring)' },
      { t: 420, what: '판 안쪽에서만 색 조각 12개(쌍 색) 위로 떠올랐다 사라짐(500 ms)' },
      { t: 1000, what: '결과 카드가 아래에서 올라옴(280 ms, out). 판은 그대로 보이다 미니 그림 자리로 줄어듦' },
      { t: 1280, what: '결과 버튼(▶·지도·↻)이 누름을 받기 시작' },
    ],
    total_ms: 1000,
  },
  result: { star_ms: 360, star_scale: [0, 1.15, 1], star_delay_ms: 200, pct_count_ms: 400, sound_star: 'star' },
  map: { node_morph_ms: 300, path_fill_ms: 500, next_breathe_period_ms: 1600, next_breathe_scale: [1, 1.06], sound_open: 'node_open' },
  screen: { ms: 220, kind: '겹쳐 흐려짐(crossfade) + 6 px 위로', _rule: '화면 전환에 흰 번쩍임·밀어내기 없음' },
  tutorial: { finger_in_ms: 250, press_ms: 150, cell_ms: 260, hold_end_ms: 400, fade_ms: 250, loop_gap_ms: 1200, loops_before_wait: 2, wait_ms: 3000,
    ghost: '손가락이 지나간 칸에 그 쌍의 선을 굵기 0.6배, tint 색으로 그렸다 함께 사라짐',
    _rule: '레벨 1 시작 0.5 s 뒤 시연 쌍의 실제 정답 길을 따라감(그 점 기준 위치). 아이 손이 판에 닿으면 그 프레임에 250 ms 로 사라지고 다시 안 나옴(그 판을 완료하기 전까지 8 s 동안 판이 안 바뀌면 한 번 더).' },
  help: { idle_ms: 30000, breathe_period_ms: 1600, _rule: '30 s 동안 판이 안 바뀌면 도움 버튼이 숨 쉼. 누르면 아직 답과 다른 쌍 하나(안 이었거나 다른 길로 이은 쌍, balance 10-2)의 정답 길을 튜토리얼 손가락으로 보여 줌(그려 주지 않음).' },
  reduced_motion: {
    query: '(prefers-reduced-motion: reduce) 또는 보호자 설정 settings_motion',
    off: ['pop 크기 변화', '색 조각', '밝은 띠', '판 카드 크기 변화', '숨 쉬기(빈칸·노드·도움 버튼)', '% 세기 애니메이션', '화면 전환 이동'],
    keep: ['tint 페이드 150 ms', '고리 생김(즉시)', '판정 이름(튐 없이 나타남·사라짐)', '빈칸 신호 = gapGlow 테두리 1.2 s 고정 표시(깜빡임 없음)', '소리·진동'],
  },
  forbidden: ['화면 전체 밝기 변화·흰 번쩍임', '화면·카메라 흔들림', '초당 3회 이상 밝기 변화', '빨간 ✕·경고음·틀림 표시', '판 위 글자 팝업'],
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
    // 카드: 카드 속 칸(카드 폭 480 기준 72) 렌더 px, 표지 ≥ 16
    const cardCell = (o.card.w / 480) * 72; if (cardCell * PARAM.dot_d_of_cell * PARAM.mark_of_dot < 16) bad(`${id} 그림 카드 속 표지 ${(cardCell * PARAM.dot_d_of_cell * PARAM.mark_of_dot).toFixed(1)} px < 16`);
    table.push({ id, cell: o.cell, mark: o.px.mark, line: o.px.line_w, card_mark: +(cardCell * PARAM.dot_d_of_cell * PARAM.mark_of_dot).toFixed(1) });
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
    const gh = m.text_slots.guardian_hold; fits(`지도 ${rk} guardian_hold`, gh);
    for (let i = 0; i < 10; i++) { const [x, y] = m.nodes[i]; if (overlap(R(x - m.node_d / 2, y - m.node_d / 2, m.node_d, m.node_d), gh, 4)) bad(`지도 ${rk} 노드 ${i + 1} 이 guardian_hold 글과 겹침`); }
    for (const [n, b] of Object.entries(m.buttons)) { if (overlap(gh, b, 4)) bad(`지도 ${rk} guardian_hold 글이 ${n} 버튼과 겹침`); if (!inside(b, m.W, m.H)) bad(`지도 ${rk} ${n} 버튼 화면 밖`); }
  }
  for (const [rk, r] of Object.entries(L.result)) {
    const items = [['mini', r.mini_board], ['star', r.star], ['pct', r.pct], ['new_best', r.new_best], ['title', r.title], ['level_name', r.level_name], ...Object.entries(r.buttons)];
    fits(`결과 ${rk} 제목`, r.title); fits(`결과 ${rk} 레벨 이름`, { ...r.level_name, w: r.level_name.w - Math.round(24 * r.k) });
    for (const [n, b] of items) if (!inside(b, r.W, r.H)) bad(`결과 ${rk} ${n} 화면 밖`);
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (overlap(items[i][1], items[j][1], 4)) bad(`결과 ${rk} ${items[i][0]}·${items[j][0]} 겹침`);
    for (const [n, b] of Object.entries(r.buttons)) if (b.w < 48) bad(`결과 ${rk} 버튼 ${n} < 48`);
  }
  for (const [rk, t] of Object.entries(L.title)) { for (const [n, sl] of Object.entries(t.text_slots)) { fits(`타이틀 ${rk} ${n}`, sl); if (!inside(sl, t.W, t.H)) bad(`타이틀 ${rk} ${n} 화면 밖`); } noOverlap(`타이틀 ${rk}`, [['logo', t.logo], ...Object.entries(t.text_slots), ...Object.entries(t.buttons)]); }
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
  s += `<text x="${jx}" y="${jy + J.h / 2 - 4}" text-anchor="middle" font-size="${J.pct_px}" font-weight="700" fill="${C.inkSoft}">61%</text>`;
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
      s += `<circle cx="${x}" cy="${y}" r="${d / 2}" fill="${C.nodeLocked}"/><circle cx="${x}" cy="${y}" r="${d * 0.09}" fill="${C.nodeLockedMark}"/>`;
    }
  });
  s += buttonSVG(m.buttons.settings) + buttonSVG(m.buttons.sound);
  { const g = m.text_slots.guardian_hold; s += `<text x="${g.x + g.w}" y="${g.y + g.h / 2 + g.font_px * 0.35}" text-anchor="end" font-size="${g.font_px}" fill="${C.inkSoft}">${STR.guardian_hold?.ko || ''}</text>`; }
  for (let i = 0; i < 10; i++) { const x = m.stars.x + m.stars.w / 2 - 4.5 * m.stars.pitch + i * m.stars.pitch, y = m.stars.y + m.stars.h / 2; s += i < 2 ? `<path d="${STAR}" transform="translate(${x} ${y}) scale(${m.stars.star_px / 2})" fill="${C.star}" stroke="${C.starEdge}" stroke-width="0.12" stroke-linejoin="round"/>` : `<path d="${STAR}" transform="translate(${x} ${y}) scale(${m.stars.star_px / 2})" fill="none" stroke="${C.inkSoft}" stroke-width="0.12" stroke-dasharray="0.2 0.18"/>`; }
  s += `<text x="${W / 2}" y="${m.title.y + m.title.h * 0.7}" text-anchor="middle" font-size="${m.title.font_px}" font-weight="700" fill="${C.ink}">${STR.map_screen?.ko || ''}</text>`;
  s += `<text x="6" y="${H - 4}" font-size="10" fill="${C.inkSoft}">지도 ${W}x${H} · 노드 ${m.node_d}px · 1~4 완료(미니 그림, 별 = 1·3), 5 풀다 나감(호 = 칠한 비율 40 %), 6~10 잠김</text></svg>`;
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
  s += `<text x="${r.pct.x + r.pct.w / 2 + 14}" y="${r.pct.y + r.pct.h * 0.75}" text-anchor="middle" font-size="${r.pct.font_px}" font-weight="700" fill="${C.inkSoft}">100%</text>`;
  s += `<g transform="translate(${r.pct.x + r.pct.w / 2 - 62} ${r.pct.y + r.pct.h / 2 - 14}) scale(${(28 / 48).toFixed(3)})">${ICON('one_go')}</g>`;
  for (const bt of Object.values(r.buttons)) s += buttonSVG(bt);
  { const ln = r.level_name, nm = STR.level9_name?.ko || '', bw = textW(nm, ln.font_px) + 24 * r.k; s += `<rect x="${ln.x + ln.w / 2 - bw / 2}" y="${ln.y}" width="${bw}" height="${ln.h}" rx="${ln.h / 2}" fill="${PAL.themes.level09.top}" stroke="${C.boardEdge}" stroke-width="1.5"/><text x="${ln.x + ln.w / 2}" y="${ln.y + ln.h / 2 + ln.font_px * 0.35}" text-anchor="middle" font-size="${ln.font_px}" font-weight="700" fill="${C.ink}">${nm}</text>`; }
  s += `<g transform="translate(${r.new_best.x} ${r.new_best.y}) scale(${(r.new_best.w / 48).toFixed(3)})">${ICON('new_best')}</g>`;
  s += `<text x="6" y="${H - 4}" font-size="10" fill="${C.inkSoft}">결과 ${W}x${H} · 레벨 이름 띠(L9 바탕색) · 별(100 %) + 한 번에 이은 쌍 % + 지난번보다 표지</text></svg>`;
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
