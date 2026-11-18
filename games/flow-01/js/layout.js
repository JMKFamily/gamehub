// 생성 파일: projects/flow-01/tools/sync-build.mjs 가 assets/check/layout.mjs 의 배치 식을 그대로 떼어 감쌈. 손으로 고치지 않음.
// STR = strings.json, BAL_CARD_CLOSE = balance.json rule_card.auto_close_ms (layout.mjs 와 같은 입력)
export function makeLayout(STR, BAL_CARD_CLOSE) {
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
  pager_dot: 12, pager_pitch: 22, chapters: 5, // r2 50스테이지: 챕터 페이지 점
  map_node: 64, result_board_of_S: 0.46,
  small_font: 14, level_name_font: 16, // 보호자 안내·guardian_hold / 결과 레벨 이름 띠
};
const kOf = (W, H) => Math.min(1.5, Math.max(1, Math.min(W, H) / 360));
const R = (x, y, w, h, extra = {}) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), ...extra });

// ---------- 글 폭 추정 ----------
const charW = (ch) => (/[ㄱ-힝]/.test(ch) ? 0.96 : ch === ' ' ? 0.30 : /[A-Z]/.test(ch) ? 0.66 : /[!.,'?]/.test(ch) ? 0.32 : 0.56);
const textW = (s, px) => [...s].reduce((a, c) => a + charW(c), 0) * px;
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
  const settings = R(W - edge - btn, H - edge - btn, btn, btn, { icon: 'settings', key: 'btn_settings', hold_ms: 1500, _rule: '보호자: 1.5 s 길게 누르기. 아래 오른쪽(바로 왼쪽에 guardian_hold 글)' });
  const pcy = H - barH - pagerH / 2, pd = Math.round(PARAM.pager_dot * k), pp = Math.round(PARAM.pager_pitch * k), dotsW = (PARAM.chapters - 1) * pp + pd;
  const pager = { cy: Math.round(pcy), dots: R(W / 2 - dotsW / 2, pcy - pd / 2, dotsW, pd, { n: PARAM.chapters, d: pd, pitch: pp, hit: R(W / 2 - dotsW / 2 - 6, pcy - btn / 2, dotsW + 12, btn) }),
    prev: R(W / 2 - dotsW / 2 - 14 - btn, pcy - btn / 2, btn, btn, { icon: 'page_prev', key: 'btn_page_prev' }), next: R(W / 2 + dotsW / 2 + 14, pcy - btn / 2, btn, btn, { icon: 'page_next', key: 'btn_page_next' }),
    swipe: { min_px: Math.round(48 * k), max_ms: 600 }, turn_ms: 260, ease: 'out',
    _rule: '한 페이지 = 한 챕터(10노드, 지금 지도 배치 그대로). 처음 열면 "다음" 노드가 있는 챕터. ◀▶ 또는 좌우 밀기(≥ 48k px, ≤ 600 ms)로 넘김, 260 ms 옆으로 밀려남(동작 줄이기면 겹쳐 흐려짐 150 ms). 점 5개: 지금 = pathDone 면 지름 1.0, 다른 열린 챕터 = pathTodo 면, 다 깬 챕터 = star 면, 잠긴 챕터 = nodeLocked 면 + 지름 0.75. 점을 누르면 그 챕터로. 첫 챕터에서 ◀, 마지막에서 ▶ 는 숨김(자리는 비움). 잠긴 챕터도 넘겨 볼 수 있음(노드 전부 잠김 실루엣, 누르면 아무 일 없음). 글·숫자 없음, 대체 글 aria_chapters·btn_page_prev·btn_page_next(lore). 페이지마다 바탕 = 그 챕터 1번째 레벨 바탕(menu 대신, 챕터 색 가족이 보임).' };
  return { W, H, k, node_d: node, nodes, pager, title: R(edge + btn + 8, 8, W - 2 * (edge + btn + 8), titleH - 8, { font_px: Math.round(20 * k), key: 'map_screen', chapter_keys: [1, 2, 3, 4, 5].map((c) => `chapter${c}_name`), _rule: '제목 = 지금 페이지 챕터 이름(lore chapterN_name, 없으면 map_screen). 자리만 art, 글은 lore.' }),
    stars: R(W / 2 - 5 * Math.round(19 * k), titleH - 2, 10 * Math.round(19 * k), starsH, { star_px: Math.round(16 * k), pitch: Math.round(19 * k), css: '#mStars svg { width: star_px; height: star_px }(인라인 SVG 원본 48 px 그대로 그리지 않음, r2 E6/S19). 별 사이 = pitch − star_px', _rule: '지금 챕터에서 모은 별 10칸 줄(글·숫자 없음): 받은 별 = star 면, 아직 = star_empty(옅은 실선 면, r2 — 점선 아님). 대체 글 aria_map_stars.' }),
    node_states: { locked: 'node-locked.svg: nodeLocked 원 + 그 레벨 판 크기(width x height) 옅은 타일 격자 실루엣(nodeLockedMark 투명도 0.35, 격자 폭 = 노드 지름의 0.53, r2 S10). 자물쇠 그림 없음. 누르면 120 ms 옆으로 2k px 살짝 흔들림(소리 없음, r2 S30 — 아래 motion.map.locked_tap)', next: 'node-open.svg: 흰 원 + nodeOpenEdge 테두리 + ▶, 1.6 s 주기 1.0 ↔ 1.06 숨 쉼', partial: 'node-partial.svg: next 와 같고 테두리 바깥에 칠한 칸 비율만큼 pathDone 호(12시부터 시계 방향, 숫자 없음) — 풀다 나간 판의 최고 판 채움(연결된 쌍이 칠한 칸 기준, G3)', done: '그 판 정답의 미니 그림(둥근 네모 판 + tint 칸 + 선, 점 생략). 미니 그림 둘레 4k px 띠 = 그 레벨 바탕 top 색 + boardEdge(결과 화면 레벨 이름 띠와 같은 색, G7)', star: 'done + 오른쪽 위 작은 별(노드 지름 0.32)' },
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
  ts.guardian_title = { ...textBlock(col.x, edge, col.w - btn - 8, 'guardian_title', Math.round(22 * k), 1, { align: 'left', weight: 800, valign: 'middle' }), h: btn };
  const close = R(col.x + col.w - btn, edge, btn, btn, { icon: 'close', key: 'btn_close' });
  let y = edge + btn + gap;
  ts.guardian_intro = textBlock(col.x, y, col.w, 'guardian_intro', fB, 24, { align: 'left', _rule: 'r2: lore 고쳐 쓰기(E4)로 길어짐 → 최대 24줄, 넘치면 화면 세로 스크롤' }); y += ts.guardian_intro.h + gap;
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
  return { W, H, k, bg: 'menu', column: col, content_h: y, scroll: y > H, _rule: '어른 화면: 글이 화면보다 길면 세로 스크롤(아이 화면 아님). 닫기 ✕ 는 머리 줄에 고정.', scroll_hint: { fade_px: Math.round(24 * k), chevron_px: Math.round(20 * k), _rule: 'r2 S6: 내용이 화면보다 길면 아래 가장자리 24k px 을 바탕색으로 옅게 덮고(미리 그린 띠, 그라디언트 1장) 가운데 아래꺾쇠(inkSoft 20k)를 둠. 끝까지 내리면 둘 다 숨김. 스크롤 막대는 브라우저 기본 그대로 보이게(overflow-y: auto, 숨기지 않음).' }, buttons: { close }, controls: ctl, text_slots: ts, confirm };
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

return { PARAM, kOf, textW, play, map, result, titleScreen, guardianScreen, errorScreen };
}
