// art.json + assets/*.svg + samples + 목업을 한 번에 만들고 검사합니다 (art-director 1-1).
// 사용: node tools/art/build.mjs          (생성 + 검사, 실패하면 종료 코드 1)
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from './spec.mjs';
import { RESOLUTIONS, computeLayout, checkLayout } from './layout.mjs';
import { loadCards, SAMPLE_IDS, portraitSVG } from './portrait-gen.mjs';
import * as A from './assets.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = join(HERE, '..', '..'), AS = join(PROJ, 'assets'), SM = join(AS, 'samples');
mkdirSync(SM, { recursive: true });
const put = (dir, name, s) => writeFileSync(join(dir, name), s);
const inner = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const nest = (s, x, y, w, h) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${s.match(/viewBox="([^"]+)"/)[1]}">${inner(s)}</svg>`;

// ── 대비 검사 (WCAG 2.x) ──
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const U = S.ui, ST = S.state;
const pairs = [];
const need = (what, fg, bg, min = 4.5) => pairs.push({ what, fg, bg, min, ratio: +contrast(fg, bg).toFixed(2) });
for (const bg of ['bg_abyss', 'bg_panel', 'board_wet_salt']) { need(`salt_white on ${bg}`, U.salt_white, U[bg]); need(`salt_dim on ${bg}`, U.salt_dim, U[bg]); }
need('card_ink on card_plate', U.card_ink, U.card_plate); need('card_ink_dim on card_plate', U.card_ink_dim, U.card_plate);
need('cost 숫자 wick_ink on wick_lit_bar', U.wick_ink, U.wick_lit_bar);
need('숨 고르기 글자', U.button_primary_ink, U.button_primary); need('기본 버튼 글자', U.button_idle_ink, U.button_idle);
for (const k of ['damage', 'heal', 'buff', 'debuff', 'shell']) { need(`${k} 숫자 on stat_tab`, ST[k], U.stat_tab); need(`${k} 숫자 on board`, ST[k], U.board_wet_salt); }
need('salt_white 숫자 on stat_tab', U.salt_white, U.stat_tab);
need('흰 피해 숫자 on splat_damage', '#FFFFFF', ST.splat_damage); need('흰 회복 숫자 on splat_heal', '#FFFFFF', ST.splat_heal);
for (const [id, f] of Object.entries(S.factions)) need(`이름 글자 ${id} ink on primary`, f.ink, f.primary);
for (const [id, r] of Object.entries(S.rarity)) need(`희귀도 글자 ${id} ink on fill`, r.ink, r.fill);
for (const k of S.keywords) need(`키워드 아이콘 ${k.id} on stat_tab (그래픽 3:1)`, k.color, U.stat_tab, 3);
for (const [id, r] of Object.entries(S.rarity)) pairs.push({ what: `희귀도 면 ${id}: 판 또는 윤곽(stat_tab)과 3:1`, fg: r.facet, bg: U.card_plate + "/" + U.stat_tab, min: 3, ratio: +Math.max(contrast(r.facet, U.card_plate), contrast(r.facet, U.stat_tab)).toFixed(2) });
for (const [id, f] of Object.entries(S.factions)) need(`세력 띠 ${id} vs deep 바탕 (그래픽 3:1)`, f.primary, f.deep, 3);
need('focus 테두리 on board (그래픽 3:1)', U.focus, U.board_wet_salt, 3);
need('켜진 심지 vs 쓴 심지 (그래픽 3:1)', U.wick_lit_bar, U.wick_spent, 2.2);
const badPairs = pairs.filter((p) => p.ratio < p.min);

// ── 배치 ──
const screens = {};
let layoutErrs = 0;
for (const [w, h] of RESOLUTIONS) { const lay = computeLayout(w, h); const c = checkLayout(w, h, lay); layoutErrs += c.errs.length; screens[`${w}x${h}`] = { ...lay, check: c }; }

// ── 에셋 쓰기 ──
const written = [];
const W = (name, s) => { put(AS, name, s); written.push(name); };
W('frame-answerer.svg', A.cardSVG({ id: 'TEMPLATE', owner: 'neutral', name_ko: '응답자 이름', concept_ko: '첫 숨: 카드 글은 세 줄 이내. 방파제', rarity_hint: 'sand', cost_band: 'mid', visual_hint: '모래 베이지+바다유리 녹색, 원; 원', branch: 'b_single' }, 'full', { kind: 'answerer', stats: { cost: 3, atk: 2, hp: 4 } }));
W('frame-rite.svg', A.cardSVG({ id: 'TEMPLATE_R', owner: 'neutral', name_ko: '의식 이름', concept_ko: '의식은 스탯 판이 없고 아래가 물마루 모양. 잉걸 +1', rarity_hint: 'pearl', cost_band: 'low', visual_hint: '모래 베이지+바다유리 녹색, 원; 물결', branch: 'ai_bolt' }, 'full', { kind: 'rite', stats: { cost: 2 } }));
W('frame-brand.svg', A.cardSVG({ id: 'TEMPLATE_B', owner: 'neutral', name_ko: '인장 이름', concept_ko: '인장: 왼쪽 공격, 오른쪽 새김 수(내구).', rarity_hint: 'coral', cost_band: 'mid', visual_hint: '모래 베이지+바다유리 녹색, 원; 녹슨 장검', branch: 'ad_brand' }, 'full', { kind: 'brand', stats: { cost: 3, atk: 3, hp: 2 } }));
W('card-back.svg', A.cardBackSVG());
for (const id of Object.keys(S.factions)) if (id !== 'neutral') W(`hero-${id.slice(2)}.svg`, A.heroSVG(id));
for (const r of Object.keys(S.rarity)) W(`rarity-${r}.svg`, A.rarityIcon(r));
for (const k of A.keywordIds) W(`kw-${k}.svg`, A.keywordIcon(k));
for (const [n, f] of Object.entries(A.statIcons)) W(`${n}.svg`, f());
for (const [n, f] of Object.entries(A.currencyIcons)) W(`${n}.svg`, f());
W('crate-bare-sea.svg', A.crateSVG('bare_sea'));
for (const id of Object.keys(S.factions)) if (id !== 'neutral') W(`crate-${id.slice(2)}.svg`, A.crateSVG(id));
for (const r of Object.keys(S.rarity)) W(`salt-chunk-${r}.svg`, A.saltChunkSVG(r));
W('app-icon.svg', A.appIconSVG());

// ── 샘플: 카드(확대·손패·보드), 돌파 단계 ──
const cards = loadCards();
const byId = (id) => cards.find((c) => c.id === id);
const sampleCards = ['B003', 'B036', 'B051', 'B064', 'D012', 'A048', 'A002', 'B097'];
for (const id of sampleCards) {
  const c = byId(id);
  put(SM, `card-${id}-full.svg`, A.cardSVG(c, 'full'));
  put(SM, `card-${id}-hand.svg`, A.cardSVG(c, 'hand'));
  put(SM, `card-${id}-token.svg`, A.tokenSVG(c, { state: { ready: true } }));
}
{
  const c = byId('B042'); const cell = 260;
  put(SM, 'recut-stages-B042.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cell * 4} 400" width="${cell * 4}" height="400"><rect width="100%" height="100%" fill="${U.bg_panel}"/>${S.recut.map((r, i) => `${nest(A.cardSVG(c, 'full', { recut: r.level, kind: 'answerer' }), i * cell + 5, 10, 250, 350)}<text x="${i * cell + 130}" y="388" text-anchor="middle" font-size="16" fill="${U.salt_white}" ${A.FONT}>${r.level} ${r.ko}</text>`).join('')}</svg>`);
}

// ── 목업 ──
function heroPlate(id, x, y, w, h, life, shell = 0, enemy = false, k = 1) {
  const f = S.factions[id];
  const ch = Math.round(w * 0.16);
  return `<g transform="translate(${x} ${y})"><path d="M0 0H${w - ch}L${w} ${ch}V${h}H0Z" fill="${f.deep}" stroke="${f.primary}" stroke-width="2.5"/>${nest(A.heroSVG(id), 3, 3, w - 6, h - 6)}
<rect x="${w - 22 * k}" y="${h - 30 * k}" width="${26 * k}" height="${30 * k}" rx="4" fill="${U.stat_tab}" stroke="${S.state.damage}" stroke-width="1.5"/><text x="${w - 9 * k}" y="${h - 9 * k}" text-anchor="middle" font-size="${16 * k}" font-weight="800" fill="${life < 30 ? S.state.damage : U.salt_white}" ${A.FONT}>${life}</text>
${shell ? `<g transform="translate(${w - 22} ${h - 56}) scale(.55)">${inner(A.statIcons['icon-shell']())}</g><text x="${w - 9}" y="${h - 36}" text-anchor="middle" font-size="12" font-weight="800" fill="${U.stat_tab}" ${A.FONT}>${shell}</text>` : ''}</g>`;
}
function wickBar(r, lit, max, soot = 0) {
  const n = 10, bw = Math.min(8, (r.w - 34) / n - 2), out = [];
  for (let i = 0; i < n; i++) { const col = i < soot ? U.wick_soot : i < lit ? U.wick_lit_bar : i < max ? U.wick_spent : 'none'; out.push(`<rect x="${r.x + i * (bw + 2)}" y="${r.y}" width="${bw}" height="${r.h}" rx="2" fill="${col}" stroke="${i < max ? 'none' : U.line_soft}" stroke-width="1"/>`); }
  out.push(`<text x="${r.x + n * (bw + 2) + 3}" y="${r.y + r.h - 3}" font-size="${Math.max(12, Math.round(r.h * .75))}" font-weight="800" fill="${U.wick_flame}" ${A.FONT}>${lit}/${max}</text>`);
  return out.join('');
}
function battleMock(w, h) {
  const lay = computeLayout(w, h), E = lay.E, p = [];
  p.push(`<rect width="${w}" height="${h}" fill="${U.bg_abyss}"/>`);
  const bTop = E.enemy_board.y - 6, bBot = E.my_board.y + E.my_board.h + 6, cx = E.enemy_board.x + E.enemy_board.w / 2;
  p.push(`<rect x="${E.enemy_board.x - 4}" y="${bTop}" width="${E.enemy_board.w + 8}" height="${bBot - bTop}" rx="14" fill="${U.board_wet_salt}"/>`);
  p.push(`<ellipse cx="${cx}" cy="${(bTop + bBot) / 2}" rx="${E.enemy_board.w * .48}" ry="${(bBot - bTop) * .46}" fill="none" stroke="${U.board_ring}" stroke-width="2" stroke-dasharray="2 6"/>`);
  for (const s of [...E.enemy_slots, ...E.my_slots]) p.push(`<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="6" fill="${U.board_slot}" opacity=".6"/>`);
  const enemyT = [['B036', { keywords: ['brine'], brine: 2 }], ['B024', { damaged: true }], ['B020', { keywords: ['breakwater'] }]];
  const myT = [['B003', { ready: true, keywords: ['breakwater'] }], ['B005', { ready: true, atkBuff: true }], ['B096', { ready: false }], ['B097', { ready: true, keywords: ['seamist'] }]];
  enemyT.forEach(([id, st], i) => { const s = E.enemy_slots[i + 1]; p.push(nest(A.tokenSVG(byId(id), { state: st }), s.x, s.y, s.w, s.h)); });
  myT.forEach(([id, st], i) => { const s = E.my_slots[i]; p.push(nest(A.tokenSVG(byId(id), { state: { ...st, selected: i === 1 } }), s.x, s.y, s.w, s.h)); });
  // 공격 화살표(대상 지정 예)
  { const a = E.my_slots[1], b = E.enemy_slots[2]; p.push(`<path d="M${a.x + a.w / 2} ${a.y + 8}Q${(a.x + b.x) / 2 + 30} ${(a.y + b.y) / 2} ${b.x + b.w / 2} ${b.y + b.h - 6}" fill="none" stroke="${U.focus}" stroke-width="4" stroke-dasharray="10 6" stroke-linecap="round"/><circle cx="${b.x + b.w / 2}" cy="${b.y + b.h - 6}" r="7" fill="none" stroke="${U.focus}" stroke-width="3"/>`); }
  // 피해 숫자 예
  { const b = E.enemy_slots[2]; p.push(`<g transform="translate(${b.x + b.w * .7} ${b.y + 18})"><path d="M0-16L6-6L17-8L10 1L15 12L3 8L-6 16L-7 5L-17 1L-7-4Z" fill="${S.state.splat_damage}"/><text y="7" text-anchor="middle" font-size="20" font-weight="900" fill="#FFFFFF" ${A.FONT}>-3</text></g>`); }
  p.push(heroPlate('h_choir', E.enemy_hero.x, E.enemy_hero.y, E.enemy_hero.w, E.enemy_hero.h, 22, 0, true, lay.scale));
  p.push(heroPlate('h_warden', E.my_hero.x, E.my_hero.y, E.my_hero.w, E.my_hero.h, 27, 3, false, lay.scale));
  p.push(wickBar(E.enemy_wicks, 2, 5)); p.push(wickBar(E.my_wicks, 3, 6, 1));
  const callBtn = (r, id, used) => `<g transform="translate(${r.x} ${r.y})"><path d="M0 0H${r.w - 10}L${r.w} 10V${r.h}H0Z" fill="${used ? U.button_idle : S.factions[id].primary}" stroke="${U.stat_tab}" stroke-width="2"/>${`<g opacity="${used ? .5 : 1}">${A.cardSVG ? '' : ''}${nest(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${A.keywordIds && ''}<circle cx="24" cy="24" r="16" fill="${U.stat_tab}"/><text x="24" y="31" text-anchor="middle" font-size="20" font-weight="800" fill="${U.wick_flame}" ${A.FONT}>2</text></svg>`, r.w * .15, r.h * .15, r.w * .7, r.h * .7)}</g>`}</g>`;
  p.push(callBtn(E.enemy_calling, 'h_choir', true)); p.push(callBtn(E.my_calling, 'h_warden', false));
  // 상대 손패·영장첩
  { const r = E.enemy_hand; for (let i = 0; i < 5; i++) p.push(nest(A.cardBackSVG(), r.x + i * Math.min(12, r.w / 7), r.y, r.h * .714, r.h)); p.push(`<text x="${r.x + r.w - 4}" y="${r.y + r.h * .7}" text-anchor="end" font-size="${Math.round(15 * lay.scale)}" font-weight="800" fill="${U.salt_white}" ${A.FONT}>5</text>`); }
  for (const [r, n] of [[E.enemy_deck, 18], [E.my_deck, 17]]) { const sz = Math.min(r.h, 40); p.push(`<g transform="translate(${r.x} ${r.y + (r.h - sz) / 2}) scale(${sz / 48})">${inner(A.statIcons['icon-deck']())}</g><text x="${r.x + sz + 2}" y="${r.y + r.h / 2 + 6}" font-size="${Math.round(15 * lay.scale)}" font-weight="800" fill="${U.salt_white}" ${A.FONT}>${n}</text>`); }
  // 기록 버튼, 타이머
  p.push(nest(A.statIcons['icon-log'](), E.log_button.x, E.log_button.y, E.log_button.w, E.log_button.h));
  p.push(`<rect x="${E.turn_timer.x}" y="${E.turn_timer.y + 2}" width="${E.turn_timer.w}" height="3" fill="${U.wick_spent}"/><rect x="${E.turn_timer.x}" y="${E.turn_timer.y + 2}" width="${E.turn_timer.w * .62}" height="3" fill="${U.wick_flame}"/><circle cx="${E.turn_timer.x + E.turn_timer.w * .62}" cy="${E.turn_timer.y + 3}" r="4" fill="${U.wick_flame}"/>`);
  // 숨 고르기
  { const r = E.end_breath; p.push(`<g transform="translate(${r.x} ${r.y})"><path d="M0 0H${r.w - 12}L${r.w} 12V${r.h}H0Z" fill="${U.button_primary}" stroke="${U.wick_ink}" stroke-width="2"/><text x="${r.w / 2}" y="${r.h / 2 + 6}" text-anchor="middle" font-size="${Math.min(17, r.w / 5.5)}" font-weight="800" fill="${U.button_primary_ink}" ${A.FONT}>숨 고르기</text></g>`); }
  // 손패
  { const r = E.hand, hand = ['B001', 'B005', 'D002', 'A019', 'B008', 'B018'], n = hand.length, cw = r.card_w, chh = r.card_h;
    const span = Math.min(r.w - cw * 1.35, (cw * 0.62) * (n - 1)), x0 = r.x + (r.w - span - cw) / 2;
    hand.forEach((id, i) => { const t = n > 1 ? i / (n - 1) - .5 : 0; const x = x0 + span * (i / (n - 1)), y = r.y + 8 + Math.abs(t) * 18 + (i === 2 ? -14 : 0); const rot = t * r.fan_max_rot_deg * 2;
      p.push(`<g transform="rotate(${rot.toFixed(1)} ${x + cw / 2} ${y + chh})">${nest(A.cardSVG(byId(id), 'hand'), x, y, cw, chh)}</g>`); }); }
  // 엄지 영역 표시(목업 전용 점선)
  p.push(`<path d="M${w} ${h * .45}A${w * 1.0} ${h * .55} 0 0 0 ${w * .05} ${h}" fill="none" stroke="#FFFFFF" stroke-opacity=".25" stroke-dasharray="4 6"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>대전 목업 ${w}x${h}</title>${p.join('')}</svg>\n`;
}
for (const [w, h] of RESOLUTIONS) W(`mockup-battle-${w}x${h}.svg`, battleMock(w, h));
function crateMock(w = 360, h = 640) {
  const p = [`<rect width="${w}" height="${h}" fill="${U.bg_abyss}"/>`, `<path d="M0 ${h * .7}Q${w * .25} ${h * .66} ${w * .5} ${h * .7}T${w} ${h * .7}V${h}H0Z" fill="${U.board_wet_salt}"/>`];
  p.push(nest(A.crateSVG('bare_sea'), w / 2 - 70, 70, 140, 140));
  const rs = ['sand', 'sand', 'pearl', 'sand', 'abyss'];
  const pos = [[60, 300], [180, 270], [300, 300], [110, 420], [250, 420]];
  rs.forEach((r, i) => p.push(nest(A.saltChunkSVG(r), pos[i][0] - 45, pos[i][1] - 45, 90, 90)));
  p.push(nest(A.cardSVG(byId('B036'), 'hand'), 18, 480, 80, 112));
  p.push(`<text x="${w / 2}" y="${236}" text-anchor="middle" font-size="16" fill="${U.salt_white}" ${A.FONT}>소금을 눌러 부수세요</text>`);
  p.push(`<g transform="translate(${w - 140} ${h - 64})"><rect width="124" height="48" rx="6" fill="${U.button_idle}"/><text x="62" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="${U.salt_white}" ${A.FONT}>모두 부수기</text></g>`);
  p.push(`<text x="16" y="30" font-size="13" fill="${U.salt_dim}" ${A.FONT}>등대 보장까지 23상자</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>인양 상자 개봉 목업</title>${p.join('')}</svg>\n`;
}
W('mockup-crate-360x640.svg', crateMock());

// ── art.json ──
const art = {
  schema: S.SCHEMA, generated_by: 'tools/art/build.mjs', source: 'tools/art/spec.mjs',
  note: '단위는 키 끝(_px·_ms·_s·_hz·_db·_ratio·_deg·_bpm). layout은 board_slots=5 가정(balance.json rules.board_limit 확정 후 1-2에서 다시 생성)',
  palette: { ui: S.ui, factions: S.factions, rarity: S.rarity, state: S.state, keywords: S.keywords },
  card: S.card, recut: S.recut,
  layout: { input: S.layoutInput, screens: Object.fromEntries(Object.entries(screens).map(([k, v]) => [k, { orientation: v.orientation, scale: v.scale, slot_w_px: v.slot_w, slot_h_px: v.slot_h, board_stat_font_px: v.check.stat_font_px, hand_spread_card_w_px: v.check.hand_spread_card_w_px, rects_px: v.E }])) },
  tempo: S.tempo, sound: S.sound, text_keys: S.textKeys,
  assets: written.sort(),
  portrait_generator: { module: 'tools/art/portrait-gen.mjs', export: 'portraitSVG(card)', viewbox: '0 0 120 90', cache: '카드마다 한 번 만들어 blob URL로 캐시' },
  contrast: { checked: pairs.length, failed: badPairs.length, min_ratio: Math.min(...pairs.filter((p) => p.min === 4.5).map((p) => p.ratio)) },
};
writeFileSync(join(PROJ, 'art.json'), JSON.stringify(art, null, 1) + '\n');

// ── 검수 시트(HTML, Edge 헤드리스 스크린샷용, 파일 안 이미지만) ──
const sheet = `<!doctype html><meta charset="utf-8"><title>tcg-01 art sheet</title><style>body{background:${U.bg_abyss};color:${U.salt_white};font-family:sans-serif;margin:8px}img{margin:4px;vertical-align:top}.d img{background:${U.bg_panel}}</style>
<div>${['frame-answerer', 'frame-rite', 'frame-brand', 'card-back'].map((n) => `<img src="../${n}.svg" width="160">`).join('')}${sampleCards.map((id) => `<img src="card-${id}-full.svg" width="160">`).join('')}</div>
<div>${sampleCards.map((id) => `<img src="card-${id}-hand.svg" width="82">`).join('')}${sampleCards.map((id) => `<img src="card-${id}-token.svg" width="64">`).join('')}</div>
<div class="d">${Object.keys(S.factions).filter((x) => x !== 'neutral').map((id) => `<img src="../hero-${id.slice(2)}.svg" width="100">`).join('')}${['bare-sea', 'warden', 'rider'].map((n) => `<img src="../crate-${n}.svg" width="100">`).join('')}${Object.keys(S.rarity).map((r) => `<img src="../salt-chunk-${r}.svg" width="64">`).join('')}<img src="../app-icon.svg" width="100"></div>
<div class="d">${A.keywordIds.map((k) => `<img src="../kw-${k}.svg" width="40" title="${k}">`).join('')}${Object.keys(S.rarity).map((r) => `<img src="../rarity-${r}.svg" width="40">`).join('')}${[...Object.keys(A.statIcons), ...Object.keys(A.currencyIcons)].map((n) => `<img src="../${n}.svg" width="40">`).join('')}</div>`;
put(SM, 'sheet.html', sheet);
put(SM, 'mockups.html', `<!doctype html><meta charset="utf-8"><style>body{background:#000;margin:8px}img{margin:4px;vertical-align:top}</style><img src="../mockup-battle-360x640.svg"><img src="../mockup-battle-412x915.svg" width="360"><img src="../mockup-crate-360x640.svg"><br><img src="../mockup-battle-640x360.svg"><img src="../mockup-battle-1280x720.svg" width="640"><br><img src="recut-stages-B042.svg" width="900">`);

// ── 결과 ──
console.log(`에셋 ${written.length}개, 샘플 카드 ${sampleCards.length}장 × 3형태 + 돌파 시트`);
console.log(`대비 ${pairs.length}쌍 검사, 실패 ${badPairs.length}, 글자·숫자 최소 ${art.contrast.min_ratio}:1`);
for (const b of badPairs) console.log(`  FAIL ${b.what}: ${b.ratio} < ${b.min}`);
for (const [k, v] of Object.entries(screens)) console.log(`  ${k}: slot ${v.slot_w}x${v.slot_h}, 보드 숫자 ${v.check.stat_font_px}px, ${v.check.errs.length ? 'FAIL ' + v.check.errs.join('; ') : '배치 OK'}`);
writeFileSync(join(SM, 'contrast-report.json'), JSON.stringify(pairs, null, 1));
process.exit(badPairs.length || layoutErrs ? 1 : 0);
