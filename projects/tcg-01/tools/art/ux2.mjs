// UX2 "모바일 게임형 화면 구성" (art-director, 2026-11-19 요청자 지시 "이제 UX를 흥미롭게").
// 로비·전투 선택·덱 첫 화면·수집 카드·이야기·팩 3모드·월드맵의 배치 사각형 계산 + 검사 + 목업 SVG.
// build.mjs가 부릅니다: lobbyLayout(w,h) / checkLobby / mockups(byId) / worldmapSVG(nodes)
import { ui, factions, rarity as RAR, cardFamilies as FAM } from './spec.mjs';
import * as A from './assets.mjs';

const r = (x, y, w, h, extra = {}) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), ...extra });
const inner = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const nest = (s, x, y, w, h) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${s.match(/viewBox="([^"]+)"/)[1]}">${inner(s)}</svg>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = (x, y, s, size = 13, fill = ui.salt_white, anchor = 'start', weight = 400) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" ${A.FONT}>${esc(s)}</text>`;
// 2026-11-19 세계관 재질: 판 = 인양 목재 결(어두운 가는 줄 2개) + 위 가장자리 젖은 소금 껍질(흰 물결 줄). 글자 대비는 바탕색 그대로 유지
const plate = (b, fill = ui.button_idle, stroke = ui.stat_tab, cut = 10) => `<path d="M${b.x} ${b.y}H${b.x + b.w - cut}L${b.x + b.w} ${b.y + cut}V${b.y + b.h}H${b.x}Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M${b.x + 4} ${b.y + b.h * 0.72}Q${b.x + b.w * 0.4} ${b.y + b.h * 0.66} ${b.x + b.w - 6} ${b.y + b.h * 0.74}M${b.x + 4} ${b.y + b.h * 0.86}Q${b.x + b.w * 0.6} ${b.y + b.h * 0.8} ${b.x + b.w - 6} ${b.y + b.h * 0.88}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1.5"/><path d="M${b.x + 2} ${b.y + 3}q${b.w * 0.08} -3 ${b.w * 0.16} 0t${b.w * 0.16} 0t${b.w * 0.16} 0" fill="none" stroke="#F2EEE4" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>`;

// ───────── 규격 (art.json ux2) ─────────
export const UX2 = {
  zones: {
    hud_top_max_ratio: 0.14, back_corner: '왼쪽 아래(왼쪽 30 % × 아래 20 %)', core_center: '가운데 아래(가로 가운데 70 %, 아래 30 %)',
    meta_edges: '왼쪽·오른쪽 가장자리 22 % 안', shop_corner: '오른쪽 위(오른쪽 30 % × 위 20 %)',
  },
  primary_buttons_max: 3, // 한 화면 1차 버튼 수 상한(덱 첫 화면 등). 나머지는 "더보기 ⋯"로 접음
  touch_min_px: 48,
  battle_button: { min_w_px: 160, h_px: 72, fill: ui.button_primary, ink: ui.button_primary_ink, pulse_ms: 1800 },
  difficulty: {
    levels: [
      // 이름·부제 = 10-lore ai_tier_1~4_name/sub (2026-11-19 lore 확정, 4단계)
      { id: 'tier1', name_key: 'ai_tier_1_name', sub_key: 'ai_tier_1_sub', ko: '모래 위 견습', sub: '쉬움 · 처음이라면 여기부터', art: '잔잔한 소금 평원 + 물결 1', ring: '#6EE7A8', default: true },
      { id: 'tier2', name_key: 'ai_tier_2_name', sub_key: 'ai_tier_2_sub', ko: '시장 결투꾼', sub: '보통', art: '시장 천막 + 물결 2', ring: '#FFD166' },
      { id: 'tier3', name_key: 'ai_tier_3_name', sub_key: 'ai_tier_3_sub', ko: '소금 노장', sub: '어려움', art: '바람 사구 + 물결 3', ring: '#FF9A4D' },
      { id: 'tier4', name_key: 'ai_tier_4_name', sub_key: 'ai_tier_4_sub', ko: '흑조의 그림자', sub: '매우 어려움', art: '솟는 흑조 + 물결 4', ring: '#FF6F5E', locked_in_mock: true },
    ],
    note: '2×2 그림 카드 4장, 기본 선택 = 1단계(쉬움). 선택 = 4 px 테두리. 잠긴 단계 = 어둡게 + 자물쇠 + ai_tier_locked 글. AI 강도는 balance',
  },
  deck_tutorial: { cards: 4, center_band: [0.35, 0.65], pages: ['덱 = 카드 30장', '같은 카드는 2장(전설 1장)', '유형 비율 막대', '필터로 찾기'] },
  collection: { default: 'full_card_with_text', story_open: { card_shift: 'left', card_w_ratio_portrait: 0.46, panel_w_ratio_portrait: 0.5, move_ms: 220 } },
  packs: {
    modes: ['open_one', 'open_next', 'open_all'],
    open_all: { reveal_stagger_ms: 60, sort: 'rarity_desc', legend_pause_ms: 600, legend_pause_max: 3, total_cap_ms: 4000, fast_skip: '탭 = 남은 공개 즉시' },
    open_next: { next_button: '가운데 아래 큰 버튼 "다음 팩 (n)"', keep_summary: true },
  },
  worldmap: {
    viewport: '세로 스크롤 지도(지도 높이 = 화면 높이 × 2.6), 현재 노드가 화면 가운데 오게 처음 스크롤',
    node_px: 52, current_ring_px: 64, path_px: 6, cleared: ui.salt_white, locked: '#4D585D', current: '#7FE3FF',
    regions_from: '10-lore 2-3 지리(7곳). 노드 목록은 lore reviews/ux2/lore-writer.md가 정하면 worldmapSVG(nodes)에 넣어 다시 생성',
  },
  tutorial_band: [0.35, 0.65],
};

// ───────── 로비 배치 ─────────
export function lobbyLayout(w, h) {
  const g = 8, s = w < h ? Math.min(w / 360, h / 640, 2) : Math.min(w / 640, h / 360, 2), E = {};
  if (w < h) {
    const hudH = Math.max(48, Math.round(52 * s));
    E.level = r(g, g, 48 * s, hudH, { kind: 'button', label: '레벨' });
    E.currency = r(g + 48 * s + 6, g + 6, w - 2 * g - 48 * s - 60 * s - 12, hudH - 12, { kind: 'display', label: '재화' });
    E.shop = r(w - g - 56 * s, g, 56 * s, hudH, { kind: 'button', label: '상점' });
    E.season = r(g, g + hudH + 6, w - 2 * g, 60 * s, { kind: 'widget', label: '시즌 보상 트랙' });
    const midTop = E.season.y + E.season.h + 10, sideW = Math.round(Math.min(112 * s, w * 0.31));
    E.quests = r(g, midTop, sideW, 168 * s, { kind: 'widget', label: '퀘스트' });
    E.story = r(g, E.quests.y + E.quests.h + 8, 64 * s, 64 * s, { kind: 'button', label: '이야기 지도' });
    const mw = 68 * s;
    E.packs = r(w - g - mw, midTop, mw, mw, { kind: 'button', label: '카드 팩' });
    E.collection = r(w - g - mw, midTop + mw + 10, mw, mw, { kind: 'button', label: '수집' });
    E.decks = r(w - g - mw, midTop + 2 * (mw + 10), mw, mw, { kind: 'button', label: '덱' });
    const coreY = h - g - 48 * s - 12 - 72 * s;
    const bw = Math.max(160, 168 * s), sw = 76 * s;
    E.battle = r((w - bw) / 2, coreY, bw, 72 * s, { kind: 'button', label: '전투', primary: true });
    E.breakthrough = r(E.battle.x - 8 - sw, coreY + 8 * s, sw, 64 * s, { kind: 'button', label: '돌파' });
    E.craft = r(E.battle.x + bw + 8, coreY + 8 * s, sw, 64 * s, { kind: 'button', label: '제작' });
    E.settings = r(g, h - g - 48 * s, 48 * s, 48 * s, { kind: 'button', label: '설정(로비의 왼쪽 아래 = 뒤로 자리)' });
    E.hero = r(w * 0.22, midTop + 10, w * 0.56, coreY - midTop - 20, { kind: 'art', label: '내 영웅 실루엣' });
  } else {
    const hudH = Math.max(48, Math.round(44 * s));
    E.level = r(g, g, 48 * s, hudH, { kind: 'button', label: '레벨' });
    E.season = r(g + 56 * s, g, w * 0.42, hudH, { kind: 'widget', label: '시즌 보상 트랙' });
    E.currency = r(E.season.x + E.season.w + 10, g + 4, w - (E.season.x + E.season.w + 10) - g - 60 * s, hudH - 8, { kind: 'display', label: '재화' });
    E.shop = r(w - g - 52 * s, g, 52 * s, hudH, { kind: 'button', label: '상점' });
    const midTop = g + hudH + 10, sideW = Math.round(150 * s);
    E.quests = r(g, midTop, sideW, 132 * s, { kind: 'widget', label: '퀘스트' });
    E.story = r(g, E.quests.y + E.quests.h + 8, 56 * s, 56 * s, { kind: 'button', label: '이야기 지도' });
    const mw = 56 * s;
    E.packs = r(w - g - mw, midTop, mw, mw, { kind: 'button', label: '카드 팩' });
    E.collection = r(w - g - mw, midTop + mw + 8, mw, mw, { kind: 'button', label: '수집' });
    E.decks = r(w - g - mw, midTop + 2 * (mw + 8), mw, mw, { kind: 'button', label: '덱' });
    const coreY = h - g - 64 * s, bw = Math.max(160, 176 * s), sw = 76 * s;
    E.battle = r((w - bw) / 2, coreY, bw, 64 * s, { kind: 'button', label: '전투', primary: true });
    E.breakthrough = r(E.battle.x - 8 - sw, coreY + 6 * s, sw, 52 * s, { kind: 'button', label: '돌파' });
    E.craft = r(E.battle.x + bw + 8, coreY + 6 * s, sw, 52 * s, { kind: 'button', label: '제작' });
    E.settings = r(g, h - g - 48 * s, 48 * s, 48 * s, { kind: 'button', label: '설정' });
    E.hero = r(w * 0.3, midTop, w * 0.4, coreY - midTop - 8, { kind: 'art', label: '내 영웅 실루엣' });
  }
  return E;
}
const ov = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export function checkLobby(w, h) {
  const E = lobbyLayout(w, h), errs = [], cx = (b) => (b.x + b.w / 2) / w, cy = (b) => (b.y + b.h / 2) / h;
  const list = Object.entries(E).filter(([, v]) => v.kind !== 'art');
  for (const [k, v] of list) { if (v.x < 0 || v.y < 0 || v.x + v.w > w || v.y + v.h > h) errs.push(`${k} 화면 밖`); if (v.kind === 'button' && (v.w < 48 || v.h < 48)) errs.push(`${k} 48 px 미만`); }
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (ov(list[i][1], list[j][1])) errs.push(`겹침 ${list[i][0]}∩${list[j][0]}`);
  if (!(cx(E.settings) < 0.3 && cy(E.settings) > 0.8)) errs.push('설정/뒤로가 왼쪽 아래가 아님');
  for (const k of ['battle', 'breakthrough', 'craft']) if (!(cx(E[k]) > 0.1 && cx(E[k]) < 0.9 && cy(E[k]) > 0.7)) errs.push(`${k}가 가운데 아래가 아님`);
  if (!(cx(E.battle) > 0.4 && cx(E.battle) < 0.6)) errs.push('전투가 가운데가 아님');
  for (const k of ['packs', 'collection', 'decks', 'story']) if (!(cx(E[k]) < 0.22 || cx(E[k]) > 0.78)) errs.push(`${k}가 가장자리가 아님`);
  if (!(cx(E.shop) > 0.7 && cy(E.shop) < 0.2)) errs.push('상점이 오른쪽 위가 아님');
  for (const k of ['level', 'currency', 'season']) if (E[k].y + E[k].h > h * (w < h ? 0.2 : 0.2)) errs.push(`${k} HUD가 위쪽이 아님`);
  if (E.quests.y + E.quests.h > E.battle.y) errs.push('퀘스트 위젯이 전투 버튼과 겹침');
  return { errs, rects: E };
}

// ───────── 그림 조각 ─────────
const icon = (name) => A.statIcons[name] ? A.statIcons[name]() : A.currencyIcons[name]();
function hudSVG(E, w) {
  const p = [];
  p.push(`<rect x="0" y="0" width="${w}" height="${E.season.y + E.season.h + 6}" fill="#0E1C23"/>`);
  // 레벨: 판 + 경험치 고리
  const L = E.level; p.push(plate(L, ui.bg_panel, ui.line_soft), `<circle cx="${L.x + L.w / 2}" cy="${L.y + L.h / 2}" r="${Math.min(L.w, L.h) * 0.36}" fill="none" stroke="${ui.wick_spent}" stroke-width="4"/><path d="M${L.x + L.w / 2} ${L.y + L.h / 2 - Math.min(L.w, L.h) * 0.36}A${Math.min(L.w, L.h) * 0.36} ${Math.min(L.w, L.h) * 0.36} 0 1 1 ${L.x + L.w / 2 - Math.min(L.w, L.h) * 0.34} ${L.y + L.h / 2 + 6}" fill="none" stroke="${ui.focus}" stroke-width="4"/>`, T(L.x + L.w / 2, L.y + L.h / 2 + 5, '12', 15, ui.salt_white, 'middle', 800));
  // 재화 3
  const C = E.currency, cw = C.w / 3;
  [['currency-salt', '1,240'], ['currency-ink', '380'], ['currency-pearl', '6']].forEach(([n, v], i) => { const x = C.x + i * cw; p.push(`<rect x="${x + 2}" y="${C.y}" width="${cw - 4}" height="${C.h}" rx="${C.h / 2}" fill="${ui.bg_abyss}" stroke="${ui.line_soft}"/>`, nest(icon(n), x + 4, C.y + 2, C.h - 4, C.h - 4), T(x + C.h + 2, C.y + C.h / 2 + 5, v, 13, ui.salt_white, 'start', 700)); });
  // 상점(오른쪽 위 고정)
  const S = E.shop; p.push(plate(S, ui.button_primary, ui.wick_ink), `<path d="M${S.x + S.w * 0.25} ${S.y + S.h * 0.38}H${S.x + S.w * 0.75}L${S.x + S.w * 0.7} ${S.y + S.h * 0.72}H${S.x + S.w * 0.3}Z" fill="${ui.wick_ink}"/><path d="M${S.x + S.w * 0.36} ${S.y + S.h * 0.38}Q${S.x + S.w * 0.5} ${S.y + S.h * 0.12} ${S.x + S.w * 0.64} ${S.y + S.h * 0.38}" fill="none" stroke="${ui.wick_ink}" stroke-width="3"/>`, T(S.x + S.w / 2, S.y + S.h - 4, '상점', 10, ui.wick_ink, 'middle', 700));
  // 시즌 보상 트랙 위젯: 물때 눈금 막대 + 단계 + 다음 보상 그림
  const W = E.season, n = 8, cur = 3, pr = 0.6, bx = W.x + 44, bw = W.w - 44 - 64;
  p.push(`<rect x="${W.x}" y="${W.y}" width="${W.w}" height="${W.h}" rx="8" fill="${ui.bg_panel}" stroke="${ui.line_soft}"/>`);
  p.push(`<path d="M${W.x + 8} ${W.y + W.h - 10}Q${W.x + 20} ${W.y + 8} ${W.x + 34} ${W.y + W.h - 10}Z" fill="#4DE0FF" opacity=".8"/>`, T(W.x + 21, W.y + W.h - 14, String(cur + 1), 14, ui.bg_abyss, 'middle', 800));
  const ty = W.y + W.h / 2 + 4;
  p.push(`<path d="M${bx} ${ty}H${bx + bw}" stroke="${ui.wick_spent}" stroke-width="8" stroke-linecap="round"/><path d="M${bx} ${ty}H${bx + bw * ((cur + pr) / n)}" stroke="#4DE0FF" stroke-width="8" stroke-linecap="round"/>`);
  for (let i = 0; i <= n; i++) { const x = bx + (bw * i) / n; p.push(`<circle cx="${x}" cy="${ty}" r="${i === cur + 1 ? 7 : 4}" fill="${i <= cur ? '#4DE0FF' : ui.wick_spent}" stroke="${ui.bg_abyss}" stroke-width="2"/>`); }
  p.push(T(bx, W.y + 16, '시즌 · 물때 4단계', 11, ui.salt_dim));
  p.push(nest(A.crateSVG('bare_sea'), W.x + W.w - 60, W.y + 2, W.h - 4, W.h - 4), T(W.x + W.w - 30, W.y + W.h - 3, '다음 보상', 9, ui.salt_white, 'middle', 700));
  return p.join('');
}
function questSVG(Q) {
  const p = [`<rect x="${Q.x}" y="${Q.y}" width="${Q.w}" height="${Q.h}" rx="8" fill="${ui.bg_panel}" stroke="${ui.line_soft}" opacity=".95"/>`, T(Q.x + 8, Q.y + 18, '오늘의 퀘스트', 12, ui.salt_white, 'start', 700)];
  const qs = [['나할로 2번 이기기', 0.5, 'currency-salt'], ['방벽으로 5번 막기', 0.8, 'currency-ink'], ['카드 20장 내기', 1, 'currency-salt']];
  const rowH = (Q.h - 28) / 3;
  qs.forEach(([t, v, ic], i) => { const y = Q.y + 26 + i * rowH; p.push(T(Q.x + 8, y + 14, t, 10, v >= 1 ? '#6EE7A8' : ui.salt_dim), `<rect x="${Q.x + 8}" y="${y + 22}" width="${Q.w - 44}" height="7" rx="3.5" fill="${ui.wick_spent}"/><rect x="${Q.x + 8}" y="${y + 22}" width="${(Q.w - 44) * v}" height="7" rx="3.5" fill="${v >= 1 ? '#6EE7A8' : ui.wick_flame}"/>`, nest(icon(ic), Q.x + Q.w - 32, y + 10, 26, 26)); if (v >= 1) p.push(`<circle cx="${Q.x + Q.w - 10}" cy="${y + 12}" r="5" fill="${ui.state?.damage || '#FF6F5E'}"/>`); });
  return p.join('');
}
function metaBtn(B, label, body) { return `${plate(B, ui.bg_panel, ui.line_soft, 12)}${body}${T(B.x + B.w / 2, B.y + B.h - 6, label, 11, ui.salt_white, 'middle', 700)}`; }
function coreBtn(B, label, primary) { return `${plate(B, primary ? ui.button_primary : ui.button_idle, primary ? ui.wick_ink : ui.stat_tab, 14)}${T(B.x + B.w / 2, B.y + B.h / 2 + (primary ? 9 : 6), label, primary ? 24 : 15, primary ? ui.button_primary_ink : ui.salt_white, 'middle', 800)}`; }

export function lobbySVG(w, h, heroId = 'h_warden') {
  const E = lobbyLayout(w, h), p = [`<rect width="${w}" height="${h}" fill="${ui.bg_abyss}"/>`];
  // 배경: 소금 평원 + 먼 흑조 + 영웅 큰 실루엣
  p.push(`<path d="M0 ${h * 0.62}Q${w * 0.3} ${h * 0.58} ${w * 0.6} ${h * 0.63}T${w} ${h * 0.6}V${h}H0Z" fill="${ui.board_wet_salt}"/><path d="M0 ${h * 0.86}Q${w * 0.25} ${h * 0.82} ${w * 0.5} ${h * 0.86}T${w} ${h * 0.85}V${h}H0Z" fill="#05090D"/><path d="M0 ${h * 0.86}Q${w * 0.25} ${h * 0.82} ${w * 0.5} ${h * 0.86}T${w} ${h * 0.85}" fill="none" stroke="#4DE0FF" stroke-opacity=".5" stroke-width="2"/>`);
  const H = E.hero; p.push(`<radialGradient id="lamp" cx=".5" cy=".45" r=".55"><stop offset="0" stop-color="#F4B740" stop-opacity=".22"/><stop offset="1" stop-color="#F4B740" stop-opacity="0"/></radialGradient><rect x="${H.x - 30}" y="${H.y}" width="${H.w + 60}" height="${H.h}" fill="url(#lamp)"/><g opacity=".92">${nest(A.heroSVG(heroId).replace(/<rect width="200" height="240"[^>]*>/, '').replace(/<path d="M0 196H200V240H0Z"[^>]*>/, ''), H.x, H.y, H.w, H.h)}</g>`);
  p.push(hudSVG(E, w), questSVG(E.quests));
  p.push(metaBtn(E.story, '이야기', `<path d="M${E.story.x + E.story.w * 0.2} ${E.story.y + E.story.h * 0.62}L${E.story.x + E.story.w * 0.45} ${E.story.y + E.story.h * 0.25}L${E.story.x + E.story.w * 0.8} ${E.story.y + E.story.h * 0.5}" fill="none" stroke="#4DE0FF" stroke-width="3" stroke-dasharray="5 4"/><circle cx="${E.story.x + E.story.w * 0.8}" cy="${E.story.y + E.story.h * 0.5}" r="5" fill="${ui.focus}"/>`));
  p.push(metaBtn(E.packs, '카드 팩', nest(A.crateSVG('bare_sea'), E.packs.x + E.packs.w * 0.15, E.packs.y + 2, E.packs.w * 0.7, E.packs.w * 0.7)) + `<circle cx="${E.packs.x + E.packs.w - 8}" cy="${E.packs.y + 8}" r="9" fill="#FF6F5E"/>${T(E.packs.x + E.packs.w - 8, E.packs.y + 12, '3', 11, '#fff', 'middle', 800)}`);
  p.push(metaBtn(E.collection, '수집', nest(A.cardBackSVG(), E.collection.x + E.collection.w * 0.3, E.collection.y + 6, E.collection.w * 0.4, E.collection.w * 0.56)));
  p.push(metaBtn(E.decks, '덱', nest(icon('icon-deck'), E.decks.x + E.decks.w * 0.2, E.decks.y + 4, E.decks.w * 0.6, E.decks.w * 0.6)));
  p.push(coreBtn(E.battle, '전투', true), coreBtn(E.breakthrough, '돌파'), coreBtn(E.craft, '제작'));
  p.push(nest(icon('icon-breakthrough'), E.breakthrough.x + 4, E.breakthrough.y + 4, 20, 20));
  const S = E.settings; p.push(plate(S, ui.button_idle, ui.stat_tab), `<circle cx="${S.x + S.w / 2}" cy="${S.y + S.h / 2}" r="${S.w * 0.22}" fill="none" stroke="${ui.salt_white}" stroke-width="4" stroke-dasharray="5 3"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>로비 ${w}x${h}</title>${p.join('')}</svg>\n`;
}

// 하위 화면 공통 틀: 위 HUD(재화) · 왼쪽 아래 뒤로 · 가운데 아래 핵심 행동
function frame(w, h, title, body, coreLabel, extra = '', curShift = 0) {
  const back = r(8, h - 56, 64, 48), core = r((w - 180) / 2, h - 80, 180, 64);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>${esc(title)}</title><rect width="${w}" height="${h}" fill="${ui.bg_abyss}"/><rect width="${w}" height="56" fill="#0E1C23"/>${T(16, 34, title, 17, ui.salt_white, 'start', 800)}${nest(icon('currency-salt'), w - 110 - curShift, 16, 24, 24)}${T(w - 82 - curShift, 34, '1,240', 13, ui.salt_white, 'start', 700)}${body}${coreLabel ? coreBtn(core, coreLabel, true) : ''}${plate(back, ui.button_idle, ui.stat_tab)}${T(back.x + back.w / 2, back.y + 30, '뒤로', 14, ui.salt_white, 'middle', 700)}${extra}</svg>\n`;
}
function tutPanel(w, h, b, text, page, pages) {
  return `<rect width="${w}" height="${h}" fill="#000" opacity=".45"/>${plate(b, ui.bg_panel, ui.focus, 12)}${body2(b, text)}${Array.from({ length: pages }, (_, i) => `<circle cx="${b.x + b.w / 2 - (pages - 1) * 8 + i * 16}" cy="${b.y + b.h - 14}" r="4" fill="${i === page ? ui.focus : ui.wick_spent}"/>`).join('')}`;
}
function body2(b, text) { return text.map((t, i) => T(b.x + 16, b.y + 26 + i * 18, t, 13, ui.salt_white)).join(''); }

export function battleSelectSVG(w = 360, h = 640) {
  const p = [], L = UX2.difficulty.levels, cw = (w - 16 - 10) / 2, ch = 168;
  p.push(T(w / 2, 82, '상대 실력을 고르세요', 16, ui.salt_white, 'middle', 700), nest(A.heroSVG('h_warden'), w / 2 - 58, 92, 46, 54), T(w / 2, 124, 'vs', 13, ui.salt_dim, 'middle', 700), nest(A.heroSVG('h_choir'), w / 2 + 12, 92, 46, 54));
  L.forEach((lv, i) => {
    const x = 8 + (i % 2) * (cw + 10), y = 160 + Math.floor(i / 2) * (ch + 14), sel = lv.default, lock = lv.locked_in_mock;
    p.push(`<path d="M${x} ${y}H${x + cw - 12}L${x + cw} ${y + 12}V${y + ch}H${x}Z" fill="${ui.bg_panel}" stroke="${sel ? lv.ring : ui.line_soft}" stroke-width="${sel ? 4 : 2}"/>`);
    const ax = x + 8, ay = y + 8, aw = cw - 16, ah = ch * 0.5;
    p.push(`<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" fill="${i === 3 ? '#070D12' : '#1B2A31'}"/><path d="M${ax} ${ay + ah * 0.55}H${ax + aw}" stroke="${ui.salt_dim}" stroke-opacity=".4"/>`);
    for (let k = 0; k <= i; k++) p.push(`<path d="M${ax + 8} ${ay + ah * (0.88 - k * 0.15)}Q${ax + aw * 0.3} ${ay + ah * (0.88 - k * 0.15) - 6 - i * 4} ${ax + aw * 0.55} ${ay + ah * (0.88 - k * 0.15)}T${ax + aw - 8} ${ay + ah * (0.88 - k * 0.15)}" fill="none" stroke="${i === 3 ? '#4DE0FF' : ui.salt_white}" stroke-width="${2 + i * 0.8}" stroke-linecap="round" opacity="${0.6 + k * 0.1}"/>`);
    if (i === 1) p.push(`<path d="M${ax + aw * 0.3} ${ay + ah * 0.5}L${ax + aw * 0.4} ${ay + ah * 0.25}L${ax + aw * 0.5} ${ay + ah * 0.5}ZM${ax + aw * 0.5} ${ay + ah * 0.5}L${ax + aw * 0.6} ${ay + ah * 0.28}L${ax + aw * 0.7} ${ay + ah * 0.5}Z" fill="#8A5A2E" stroke="#2A1D12"/>`);
    p.push(T(x + cw / 2, y + ch * 0.68, lv.ko, 15, lock ? ui.salt_dim : sel ? lv.ring : ui.salt_white, 'middle', 800), T(x + cw / 2, y + ch * 0.8, lv.sub, 11, ui.salt_dim, 'middle'));
    p.push(...Array.from({ length: 4 }, (_, k) => `<circle cx="${x + cw / 2 - 18 + k * 12}" cy="${y + ch * 0.9}" r="4" fill="${k <= i ? lv.ring : ui.wick_spent}"/>`));
    if (lock) p.push(`<path d="M${x} ${y}H${x + cw - 12}L${x + cw} ${y + 12}V${y + ch}H${x}Z" fill="#000" opacity=".5"/><rect x="${x + cw / 2 - 12}" y="${y + ch * 0.28}" width="24" height="18" rx="3" fill="${ui.salt_dim}"/><path d="M${x + cw / 2 - 7} ${y + ch * 0.28}V${y + ch * 0.22}A7 7 0 0 1 ${x + cw / 2 + 7} ${y + ch * 0.22}V${y + ch * 0.28}" fill="none" stroke="${ui.salt_dim}" stroke-width="3"/>`, T(x + cw / 2, y + ch * 0.58, '앞 단계를 이기면 열립니다', 10, ui.salt_white, 'middle'));
  });
  return frame(w, h, '전투', p.join(''), '시작');
}

export function deckFirstSVG(w = 360, h = 640, withTut = true) {
  const p = [];
  // 1차 버튼 3개: 덱 카드(그림) 격자, 새 덱 +, 편집(선택된 덱)
  const dw = (w - 16 - 10) / 2, dh = 110;
  ['h_warden', 'h_choir', 'h_wreck'].forEach((id, i) => { const x = 8 + (i % 2) * (dw + 10), y = 70 + Math.floor(i / 2) * (dh + 10); p.push(plate(r(x, y, dw, dh), ui.bg_panel, i === 0 ? ui.focus : ui.line_soft, 12), nest(A.heroSVG(id), x + 6, y + 6, 70, 84), T(x + 84, y + 30, ['입문 방벽', '입문 중독', '입문 부품'][i], 13, ui.salt_white, 'start', 700), T(x + 84, y + 50, '30 / 30', 12, '#6EE7A8')); let bx = x + 84; Object.keys(FAM).forEach((f, k) => { const ww = [5, 12, 4, 3, 6][(k + i) % 5] * 2.4; p.push(`<rect x="${bx}" y="${y + 62}" width="${ww}" height="10" fill="${FAM[f].color}"/>`); bx += ww; }); });
  const nb = r(8 + dw + 10, 70 + dh + 10, dw, dh); p.push(`<path d="M${nb.x} ${nb.y}H${nb.x + nb.w}V${nb.y + nb.h}H${nb.x}Z" fill="none" stroke="${ui.line_soft}" stroke-width="2" stroke-dasharray="8 6"/>`, T(nb.x + nb.w / 2, nb.y + nb.h / 2 + 4, '+ 새 덱', 16, ui.salt_white, 'middle', 700));
  p.push(plate(r(w - 56, 8 + 56 - 52, 48, 48), ui.button_idle), T(w - 32, 36, '⋯', 20, ui.salt_white, 'middle', 800), T(w - 32, 52, '더보기', 8, ui.salt_dim, 'middle'));
  let extra = '';
  if (withTut) { const b = r(24, h * 0.35, w - 48, h * 0.3); extra = tutPanel(w, h, b, [], 0, 4) + tutCard(b) ; }
  return frame(w, h, '덱', p.join(''), '이 덱 편집', extra, 60);
}
function tutCard(b) {
  // 그림 중심 1장: "덱 = 카드 30장" — 카드 더미 30장 그림 + 숫자
  const p = []; for (let i = 0; i < 6; i++) p.push(nest(A.cardBackSVG(), b.x + 22 + i * 7, b.y + 22 - i * 3, 64, 90));
  p.push(T(b.x + 150, b.y + 52, '덱 = 카드 30장', 16, ui.salt_white, 'start', 800), T(b.x + 150, b.y + 76, '이 묶음을 들고', 12, ui.salt_dim), T(b.x + 150, b.y + 94, '결투에 나갑니다', 12, ui.salt_dim));
  p.push(plate(r(b.x + b.w - 64, b.y + b.h - 64, 56, 48), ui.button_primary, ui.wick_ink), T(b.x + b.w - 36, b.y + b.h - 34, '▶', 18, ui.wick_ink, 'middle', 800));
  return p.join('');
}
export function deckTutorialStripSVG() {
  // 그림 튜토리얼 4장 한눈 보기(가로 4칸)
  const W = 4 * 250 + 50, H = 220, p = [`<rect width="${W}" height="${H}" fill="${ui.bg_abyss}"/>`];
  const cell = (i) => r(10 + i * 260, 10, 250, 200);
  const c0 = cell(0); p.push(plate(c0, ui.bg_panel, ui.focus)); for (let k = 0; k < 6; k++) p.push(nest(A.cardBackSVG(), c0.x + 20 + k * 6, c0.y + 30 - k * 3, 70, 98)); p.push(T(c0.x + 125, c0.y + 60, '카드 30장', 18, ui.salt_white, 'start', 800), T(c0.x + 125, c0.y + 84, '= 덱 하나', 13, ui.salt_dim), T(c0.x + 125, c0.y + 170, '1 / 4', 11, ui.salt_dim));
  const c1 = cell(1); p.push(plate(c1, ui.bg_panel, ui.focus), nest(A.cardBackSVG(), c1.x + 20, c1.y + 30, 64, 90), nest(A.cardBackSVG(), c1.x + 40, c1.y + 40, 64, 90), T(c1.x + 120, c1.y + 60, '같은 카드 2장까지', 14, ui.salt_white, 'start', 800), `<rect x="${c1.x + 120}" y="${c1.y + 80}" width="22" height="22" fill="${RAR.abyss.fill}" stroke="${RAR.abyss.glow}" stroke-width="2"/>`, T(c1.x + 148, c1.y + 97, '전설은 1장', 12, ui.salt_dim), T(c1.x + 125, c1.y + 170, '2 / 4', 11, ui.salt_dim));
  const c2 = cell(2); p.push(plate(c2, ui.bg_panel, ui.focus)); let bx = c2.x + 20; [['draw', 4], ['buff', 12], ['debuff', 4], ['strike', 4], ['atkdraw', 6]].forEach(([f, n]) => { const ww = n * 7; p.push(`<rect x="${bx}" y="${c2.y + 40}" width="${ww}" height="28" fill="${FAM[f].color}"/>${nest(A.familyBadgeSVG(f, { draw: 'd_draw', buff: 'b_single', debuff: 'b_weaken', strike: 'ai_bolt', atkdraw: 'ad_onkill' }[f]), bx + 2, c2.y + 42, 24, 24)}`); bx += ww; }); p.push(T(c2.x + 20, c2.y + 100, '색 막대 = 덱 속 유형 비율', 13, ui.salt_white, 'start', 800), T(c2.x + 20, c2.y + 122, '뽑기·강화·약화·타격·공격뽑기', 11, ui.salt_dim), T(c2.x + 125, c2.y + 170, '3 / 4', 11, ui.salt_dim));
  const c3 = cell(3); p.push(plate(c3, ui.bg_panel, ui.focus)); Object.keys(FAM).forEach((f, k) => p.push(`<rect x="${c3.x + 14 + k * 44}" y="${c3.y + 30}" width="40" height="40" rx="6" fill="${k === 3 ? ui.button_idle : ui.bg_abyss}" stroke="${k === 3 ? ui.focus : ui.line_soft}" stroke-width="2"/>${nest(A.familyBadgeSVG(f, { draw: 'd_draw', buff: 'b_single', debuff: 'b_weaken', strike: 'ai_bolt', atkdraw: 'ad_onkill' }[f]), c3.x + 20 + k * 44, c3.y + 36, 28, 28)}`)); p.push(T(c3.x + 20, c3.y + 100, '그림 버튼으로 골라 보기', 13, ui.salt_white, 'start', 800), T(c3.x + 20, c3.y + 122, '여러 개를 함께 켤 수 있어요', 11, ui.salt_dim), T(c3.x + 125, c3.y + 170, '4 / 4', 11, ui.salt_dim));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><title>덱 그림 튜토리얼 4장</title>${p.join('')}</svg>\n`;
}

export function collectionCardSVG(card, story, w = 360, h = 640) {
  const p = [];
  if (!story) { const cw = Math.min(w - 48, 300), ch = cw * 1.4; p.push(nest(A.cardSVG(card, 'full'), (w - cw) / 2, 70, cw, ch)); }
  else {
    const cw = w * UX2.collection.story_open.card_w_ratio_portrait, ch = cw * 1.4, pw = w * UX2.collection.story_open.panel_w_ratio_portrait, px = w - pw - 8, fac = factions[card.owner] || factions.neutral;
    p.push(nest(A.cardSVG(card, 'full'), 8, 90, cw, ch));
    p.push(`<rect x="${px}" y="70" width="${pw}" height="${h - 170}" fill="${ui.bg_panel}" stroke="${fac.primary}" stroke-width="3"/><rect x="${px}" y="70" width="6" height="${h - 170}" fill="${fac.primary}"/>`, T(px + 14, 96, card.name_ko, 15, ui.salt_white, 'start', 800), T(px + 14, 114, fac.name_ko, 11, ui.salt_dim));
    const story = card.story_ko || '수조를 지키던 마지막 파수병은 물 대신 이름을 나눠 주었다. 그 이름을 받은 이들은 지금도 방벽 앞에 선다. 물이 돌아올 때까지.';
    const per = Math.floor((pw - 28) / 13.5); const lines = []; let cur = ''; for (const wd of story.split(' ')) { if ((cur + ' ' + wd).trim().length > per) { lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); } if (cur) lines.push(cur);
    lines.forEach((l, i) => p.push(T(px + 14, 144 + i * 22, l, 14, ui.salt_white)));
  }
  const sb = r(w - 8 - 104, h - 140, 104, 48); p.push(plate(sb, story ? ui.button_primary : ui.button_idle, ui.stat_tab), nest(A.statIcons['icon-ability'] ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M8 10Q8 6 12 6H38V36Q38 40 34 40H12Q8 40 8 36Z" fill="${ui.card_plate}" stroke="${ui.stat_tab}" stroke-width="2.4"/><path d="M14 15H32M14 21H32M14 27H26" stroke="${ui.card_ink}" stroke-width="2.4"/></svg>` : '', sb.x + 8, sb.y + 10, 28, 28), T(sb.x + 66, sb.y + 30, story ? '효과' : '이야기', 14, story ? ui.button_primary_ink : ui.salt_white, 'middle', 800));
  return frame(w, h, '수집', p.join(''), '돌파');
}

export function packOpenSVG(mode, byId, w = 360, h = 640) {
  const p = [];
  const btnRow = (labels, primaryIdx) => { const bw = (w - 16 - 2 * 8) / 3; return labels.map((l, i) => { const b = r(8 + i * (bw + 8), h - 148, bw, 56); return coreBtn(b, l, i === primaryIdx); }).join(''); };
  if (mode === 'one') {
    p.push(nest(A.crateSVG('bare_sea'), w / 2 - 60, 70, 120, 120));
    const rs = ['sand', 'sand', 'pearl', 'sand', 'coral'], pos = [[50, 300], [125, 270], [200, 255], [275, 270], [110, 400]];
    rs.forEach((rr, i) => p.push(nest(A.saltChunkSVG(rr), (i < 4 ? 20 + i * 82 : 140), i < 4 ? 220 : 360, 72, 100)));
    p.push(T(w / 2, 480, '카드를 눌러 뒤집으세요', 13, ui.salt_white, 'middle'));
    p.push(btnRow(['1개 열기', '다음 팩 (4)', '모두 열기 (5)'], 0));
  } else if (mode === 'next') {
    const ids = ['B019', 'A001', 'D001', 'B001', 'A022'];
    ids.forEach((id, i) => p.push(nest(A.cardSVG(byId(id), 'hand'), 10 + (i % 3) * 116, 70 + Math.floor(i / 3) * 160, 104, 146)));
    p.push(T(w / 2, 410, '팩 2 / 5 · 새 카드 3 · 경험치 +20', 12, ui.salt_dim, 'middle'));
    p.push(coreBtn(r((w - 220) / 2, 430, 220, 64), '다음 팩 (3) ▶', true));
    p.push(btnRow(['결과 보기', '', '모두 열기 (3)'], -1).replace(/<path[^>]*\/>(<text[^>]*><\/text>)/, ''));
  } else {
    // 모두 열기: 희귀도 순 정리 + 위 요약
    const all = ['A048', 'B036', 'B042', 'D012', 'A002', 'B003', 'B019', 'A001', 'D001', 'B001', 'A022', 'B097', 'A019', 'B004', 'B021'];
    const rank = { abyss: 0, coral: 1, pearl: 2, sand: 3 };
    const cards = all.map(byId).sort((a, b) => rank[a.rarity || a.rarity_hint] - rank[b.rarity || b.rarity_hint]);
    let sx = 12; ['abyss', 'coral', 'pearl', 'sand'].forEach((rk) => { const n = cards.filter((c) => (c.rarity || c.rarity_hint) === rk).length; p.push(nest(A.rarityIcon(rk), sx, 64, 22, 22), T(sx + 26, 81, `${RAR[rk].name_ko} ${n}`, 12, ui.salt_white, 'start', 700)); sx += 86; });
    cards.forEach((c, i) => { const cw = 64, x = 10 + (i % 5) * (cw + 6), y = 96 + Math.floor(i / 5) * 96, big = (c.rarity || c.rarity_hint) === 'abyss'; if (big) p.push(`<rect x="${x - 3}" y="${y - 3}" width="${cw + 6}" height="${cw * 1.4 + 6}" fill="none" stroke="${RAR.abyss.glow}" stroke-width="3"/>`); p.push(nest(A.cardSVG(c, 'hand'), x, y, cw, cw * 1.4)); });
    p.push(T(w / 2, 400, '팩 3개 · 전설 1 · 희귀 2 · 탭하면 남은 공개를 바로', 11, ui.salt_dim, 'middle'));
    p.push(btnRow(['1개씩 보기', '', '확인'], 2).replace(/<path[^>]*\/>(<text[^>]*><\/text>)/, ''));
  }
  return frame(w, h, '카드 팩', p.join(''), null);
}

// ───────── 월드맵 (2026-11-19: lore/worldmap.json 지역 8·노드 30·좌표 0~100) ─────────
// 지도 캔버스 = MAP_W × MAP_H(두 방향 스크롤). 화면은 현재 노드를 가운데로 잘라 보임
export const MAP_W = 900, MAP_H = 1100;
const RART = {
  bare: (x, y) => `<ellipse cx="${x}" cy="${y}" rx="120" ry="70" fill="${ui.card_plate}" opacity=".14"/>${[0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * Math.PI * 2; return `<path d="M${x + Math.cos(a) * 60 - 12} ${y + Math.sin(a) * 34 + 10}L${x + Math.cos(a) * 60} ${y + Math.sin(a) * 34 - 12}L${x + Math.cos(a) * 60 + 12} ${y + Math.sin(a) * 34 + 10}Z" fill="#8C7F62" stroke="#2A1D12"/>`; }).join('')}<path d="M${x - 26} ${y + 70}Q${x} ${y + 20} ${x + 26} ${y + 70}" fill="none" stroke="${ui.card_plate}" stroke-width="7" opacity=".8"/>`,
  warden: (x, y) => `<rect x="${x - 90}" y="${y - 60}" width="180" height="120" fill="none" stroke="#7590A0" stroke-width="10"/><ellipse cx="${x}" cy="${y}" rx="60" ry="34" fill="#2E6F8F" opacity=".85"/><rect x="${x - 10}" y="${y + 52}" width="20" height="16" fill="#1E2E38"/>`,
  rider: (x, y) => [0, 1, 2, 3].map((k) => `<path d="M${x - 110 + k * 50} ${y + 40 - (k % 2) * 20}Q${x - 70 + k * 50} ${y - 30 - (k % 2) * 20} ${x - 30 + k * 50} ${y + 40 - (k % 2) * 20}Z" fill="#B5502E" opacity="${0.65 - k * 0.08}"/>`).join(''),
  wreck: (x, y) => [0, 1, 2, 3, 4].map((k) => `<path d="M${x - 110 + k * 50} ${y + 40}Q${x - 90 + k * 50} ${y - 40} ${x - 70 + k * 50} ${y + 40}" fill="none" stroke="#C4642E" stroke-width="7" opacity=".75"/>`).join('') + `<rect x="${x + 70}" y="${y - 60}" width="12" height="40" fill="#3A2A1E"/>`,
  choir: (x, y) => `<path d="M${x - 200} ${y - 40}Q${x} ${y + 50} ${x + 200} ${y - 40}V${y + 140}H${x - 200}Z" fill="#05090D"/><path d="M${x - 40} ${y + 10}V${y - 50}L${x - 20} ${y - 70}L${x} ${y - 50}V${y + 10}Z" fill="#1F3B39" transform="rotate(-8 ${x - 20} ${y})"/><ellipse cx="${x + 40}" cy="${y + 20}" rx="34" ry="10" fill="#226A65"/>`,
  archive: (x, y) => [0, 1, 2, 3, 4, 5, 6].map((k) => `<rect x="${x - 80 + k * 24}" y="${y - 50 + (k % 2) * 16}" width="12" height="${60 - (k % 2) * 16}" fill="#3A2F22"/><circle cx="${x - 74 + k * 24}" cy="${y - 54 + (k % 2) * 16}" r="5" fill="${ui.wick_flame}"/>`).join('') + `<path d="M${x - 80} ${y + 6}H${x + 90}" stroke="#3A2F22" stroke-width="4"/>`,
  nameless: (x, y) => `<g opacity=".55">${[0, 1, 2, 3].map((k) => `<path d="M${x - 130 + k * 20} ${y - 40 + k * 22}H${x + 110 - k * 14}" stroke="#A9BCC6" stroke-width="14" stroke-linecap="round"/>`).join('')}</g><rect x="${x + 30}" y="${y - 20}" width="24" height="16" fill="none" stroke="${ui.salt_white}" stroke-width="2"/>`,
  rift: (x, y, locked) => `<path d="M${x - 70} ${y - 30}L${x - 30} ${y - 6}L${x - 46} ${y + 20}L${x + 6} ${y + 8}L${x + 30} ${y + 36}L${x + 70} ${y + 16}" fill="none" stroke="#05090D" stroke-width="12" stroke-linejoin="round"/><path d="M${x - 70} ${y - 30}L${x - 30} ${y - 6}L${x - 46} ${y + 20}L${x + 6} ${y + 8}L${x + 30} ${y + 36}L${x + 70} ${y + 16}" fill="none" stroke="#4DE0FF" stroke-width="2" opacity=".8"/>${locked ? `<g opacity=".85"><ellipse cx="${x}" cy="${y + 4}" rx="110" ry="54" fill="#8F969C" opacity=".55"/><ellipse cx="${x + 20}" cy="${y - 10}" rx="80" ry="34" fill="#AEB9BD" opacity=".4"/></g>` : ''}`,
};
// 노드 상태(목업용): 시장 1~4 지남, 파수단 1 지남·2 = 지금, 다른 세력 1장 열림, 나머지 잠김. 빌드는 저장값으로 정함
export function worldmapData(wm) {
  const riftMax = Math.max(...wm.nodes.filter((q) => q.region === 'rift').map((q) => q.order));
  return wm.nodes.map((n) => ({ ...n, state: n.region === 'bare' || n.id === 'wm_warden_1' ? 'cleared' : n.id === 'wm_warden_2' ? 'current' : n.order === 1 && n.region !== 'rift' ? 'open' : 'locked', final: n.region === 'rift' && n.order === riftMax }));
}
export function worldmapSVG(wm, w = 360, h = 640, fullMap = false) {
  const nodes = worldmapData(wm), X = (v) => (v / 100) * MAP_W, Y = (v) => (v / 100) * MAP_H, p = [];
  const riftLocked = !nodes.some((n) => n.region === 'rift' && n.state !== 'locked');
  p.push(`<defs><radialGradient id="seabed" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#2A3A40"/><stop offset=".7" stop-color="#1B2A31"/><stop offset="1" stop-color="#0B151B"/></radialGradient></defs><rect width="${MAP_W}" height="${MAP_H}" fill="url(#seabed)"/>`);
  for (let i = 0; i < 14; i++) p.push(`<ellipse cx="${MAP_W / 2}" cy="${MAP_H * 0.52}" rx="${60 + i * 34}" ry="${50 + i * 40}" fill="none" stroke="${ui.salt_white}" stroke-opacity="${0.04 + (i % 3) * 0.015}"/>`);
  for (const g of wm.regions) if (g.id !== 'bare') p.push(`<path d="M${X(50)} ${Y(52)}Q${(X(50) + X(g.x)) / 2 + 40} ${(Y(52) + Y(g.y)) / 2 - 30} ${X(g.x)} ${Y(g.y)}" fill="none" stroke="#3A4B52" stroke-width="18" stroke-linecap="round" opacity=".6"/>`);
  for (const g of wm.regions) { if (RART[g.id]) p.push(RART[g.id](X(g.x), Y(g.y), g.id === 'rift' && riftLocked)); const ys = wm.nodes.filter((q) => q.region === g.id).map((q) => Y(q.y)), ly = g.id === 'rift' ? Math.max(...ys) + 50 : Math.min(...ys) - 32, lx = Math.min(MAP_W - 160, Math.max(10, X(g.x) - 60)); p.push(T(lx, ly, g.name_ko, 15, g.id === 'rift' && riftLocked ? ui.salt_dim : ui.salt_white, 'start', 800)); }
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const link = (a, b) => { const done = a.state !== 'locked' && b.state !== 'locked'; p.push(`<path d="M${X(a.x)} ${Y(a.y)}L${X(b.x)} ${Y(b.y)}" stroke="${done ? ui.salt_white : UX2.worldmap.locked}" stroke-width="${UX2.worldmap.path_px}" stroke-dasharray="${done ? '0' : '8 8'}" stroke-linecap="round" opacity="${done ? 0.85 : 0.65}"/>`); };
  for (const n of nodes) { const prev = n.order > 1 ? nodes.find((q) => q.region === n.region && q.order === n.order - 1) : n.unlock && n.unlock.prev ? byId[n.unlock.prev] : n.region === 'rift' ? byId[wm.start_node] || nodes[0] : null; if (prev) link(prev, n); }
  const R = 22;
  for (const n of nodes) {
    const x = X(n.x), y = Y(n.y);
    if (n.state === 'current') p.push(`<circle cx="${x}" cy="${y}" r="${R + 9}" fill="none" stroke="${ui.focus}" stroke-width="4"/>`);
    const fill = n.state === 'cleared' ? ui.card_plate : n.state === 'current' ? ui.button_primary : n.state === 'open' ? '#3A5560' : '#24343B';
    p.push(`<path d="M${x - R} ${y - R}H${x + R - 8}L${x + R} ${y - R + 8}V${y + R}H${x - R}Z" fill="${fill}" stroke="${n.final ? '#4DE0FF' : ui.stat_tab}" stroke-width="${n.final ? 3 : 2}"/>`);
    if (n.state === 'cleared') p.push(`<path d="M${x - 9} ${y}L${x - 2} ${y + 7}L${x + 10} ${y - 7}" fill="none" stroke="${ui.card_ink}" stroke-width="4" stroke-linecap="round"/>`);
    else if (n.state === 'locked') p.push(`<rect x="${x - 8}" y="${y - 2}" width="16" height="12" rx="2" fill="${UX2.worldmap.locked}"/><path d="M${x - 5} ${y - 2}V${y - 7}A5 5 0 0 1 ${x + 5} ${y - 7}V${y - 2}" fill="none" stroke="${UX2.worldmap.locked}" stroke-width="3"/>`);
    else if (n.state === 'open') p.push(T(x, y + 6, String(n.order), 16, ui.salt_white, 'middle', 800));
    else p.push(nest(A.heroSVG('h_warden'), x - 15, y - 20, 30, 36));
  }
  if (fullMap) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_W} ${MAP_H}" width="${MAP_W}" height="${MAP_H}"><title>이야기 지도 전체</title>${p.join('')}</svg>\n`;
  const cur = nodes.find((q) => q.state === 'current') || nodes[0];
  const vx = Math.max(0, Math.min(MAP_W - w, X(cur.x) - w / 2)), vy = Math.max(0, Math.min(MAP_H - h, Y(cur.y) - h * 0.45));
  const done = nodes.filter((q) => q.state === 'cleared').length;
  const curCard = `<g>${plate(r(84, h - 140, w - 92, 76), ui.bg_panel, ui.focus, 12)}${T(100, h - 112, cur.title_ko || cur.id, 15, ui.salt_white, 'start', 800)}${T(100, h - 92, '파수단 영웅으로 1번 이기기', 11, ui.salt_dim)}${coreBtn(r(w - 120, h - 128, 104, 52), '들어가기', true)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>이야기 지도</title><g transform="translate(${-vx} ${-vy})">${p.join('')}</g><rect width="${w}" height="56" fill="#0E1C23" opacity=".92"/>${T(16, 34, '이야기 지도', 16, ui.salt_white, 'start', 800)}${T(w - 16, 34, `${done} / ${nodes.length}`, 13, ui.salt_dim, 'end', 700)}${curCard}${plate(r(8, h - 56, 64, 48), ui.button_idle)}${T(40, h - 26, '뒤로', 14, ui.salt_white, 'middle', 700)}</svg>\n`;
}
