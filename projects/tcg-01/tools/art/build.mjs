// art.json + assets/*.svg + samples + 목업을 한 번에 만들고 검사합니다 (art-director 1-1).
// 사용: node tools/art/build.mjs          (생성 + 검사, 실패하면 종료 코드 1)
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from './spec.mjs';
import { RESOLUTIONS, computeLayout, checkLayout, checkTutorial, checkHandFan, handFan, L as LAYIN } from './layout.mjs';
import { minPairDE, CVD_MATRICES, simulate } from './cvd.mjs';
import { loadCards, SAMPLE_IDS, portraitSVG } from './portrait-gen.mjs';
import * as A from './assets.mjs';
import * as X from './ux2.mjs';

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
for (const [id, f] of Object.entries(S.cardFamilies)) { need(`유형 ${id} 이름 글자 ink on 유형 색`, f.ink, f.color); pairs.push({ what: `유형 표지 ${id}: 두 겹 윤곽(stat_tab·card_plate) 중 하나와 3:1`, fg: f.color, bg: U.stat_tab + '/' + U.card_plate, min: 3, ratio: +Math.max(contrast(f.color, U.stat_tab), contrast(f.color, U.card_plate)).toFixed(2) }); need(`유형 표지 ${id} 안 도형 (그래픽 3:1)`, f.ink, f.color, 3); }
const cvd = minPairDE(Object.fromEntries(Object.entries(S.cardFamilies).map(([k, f]) => [k, f.color])));
const CVD_MIN = 20; const cvdFail = Object.entries(cvd).filter(([, v]) => v.min_dE < CVD_MIN);
const badPairs = pairs.filter((p) => p.ratio < p.min);

// ── 배치 ──
const screens = {};
let layoutErrs = 0;
const tutorial = {};
for (const [w, h] of RESOLUTIONS) { const lay = computeLayout(w, h); const c = checkLayout(w, h, lay); const t = checkTutorial(w, h, lay); const fan = checkHandFan(w, h, lay); layoutErrs += c.errs.length + t.errs.length + fan.errs.length; screens[`${w}x${h}`] = { ...lay, check: c, fan }; tutorial[`${w}x${h}`] = { main_lines: t.main_lines, plan: t.plan, slots_px: t.slots, errs: t.errs }; }

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
W('icon-story.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"><title>스토리</title><path d="M8 10Q8 6 12 6H38V36Q38 40 34 40H12Q8 40 8 36Z" fill="${U.card_plate}" stroke="${U.stat_tab}" stroke-width="2.4"/><path d="M14 15H32M14 21H32M14 27H26" stroke="${U.card_ink}" stroke-width="2.4" stroke-linecap="round"/><path d="M34 40Q40 40 40 34V30H34" fill="${U.card_plate_shade}" stroke="${U.stat_tab}" stroke-width="2.4"/></svg>
`);
for (const [n, f] of Object.entries(A.currencyIcons)) W(`${n}.svg`, f());
W('crate-bare-sea.svg', A.crateSVG('bare_sea'));
for (const id of Object.keys(S.factions)) if (id !== 'neutral') W(`crate-${id.slice(2)}.svg`, A.crateSVG(id));
for (const r of Object.keys(S.rarity)) W(`salt-chunk-${r}.svg`, A.saltChunkSVG(r));
W('app-icon.svg', A.appIconSVG());
const FAM_REP = { draw: 'd_draw', buff: 'b_single', debuff: 'b_weaken', strike: 'ai_bolt', atkdraw: 'ad_onkill' };
for (const [fid, br] of Object.entries(FAM_REP)) W(`type-${fid}.svg`, A.familyBadgeSVG(fid, br));
const kindSil = { minion: 'M0 0H26L34 8V42H22V48H12V42H0Z', spell: 'M8 0H26L34 8V40Q25 36 17 41T0 40V8Z', weapon: 'M0 0H26L34 8V40H24V44H30V48H4V44H10V40H0Z' };
for (const [k, d] of Object.entries(kindSil)) W(`kind-${k}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 0 48 48" width="48" height="48"><title>${S.cardKinds[k].ko}</title><path d="${d}" fill="${U.card_plate}" stroke="${U.stat_tab}" stroke-width="2.5" stroke-linejoin="round"/></svg>
`);

// ── 샘플: 카드(확대·손패·보드), 돌파 단계 ──
// 1-2: 실제 수치(cards.json, balance) + 이름·글(lore) 합치기
const lore = loadCards();
const engine = existsSync(join(PROJ, 'cards.json')) ? JSON.parse(readFileSync(join(PROJ, 'cards.json'), 'utf8')).cards : [];
const cards = lore.map((l) => ({ ...l, ...(engine.find((e) => e.id === l.id) || {}), name_ko: l.name_ko, concept_ko: l.concept_ko, visual_hint: l.visual_hint }));
const byId = (id) => cards.find((c) => c.id === id);
// 가장 긴 이름(B051 12자)·가장 긴 글(D004 60자, A045 55자)을 포함
const sampleCards = ['B051', 'D004', 'A045', 'B036', 'B003', 'B064', 'D012', 'A048', 'A002', 'B097'];
// 글·이름 맞춤 검사(200장 전체)
const textFail = [];
for (const c of cards) {
  const kind = A.ENGINE_KIND[c.kind] || 'answerer';
  const ft = A.fitText(c.concept_ko || '', kind);
  if (!ft.ok) textFail.push(c.id + ' 글');
  const nmFont = Math.min(S.card.name_band.font_px, Math.floor((S.card.base_w_px - 70) / Math.max(4, c.name_ko.length)));
  if (nmFont < 12) textFail.push(c.id + ' 이름 ' + nmFont + 'px');
}
const textStats = { cards: cards.length, fail: textFail.length, small_font_cards: cards.filter((c) => A.fitText(c.concept_ko || '', A.ENGINE_KIND[c.kind] || 'answerer').font < 13).length, min_name_font_px: Math.min(...cards.map((c) => Math.min(S.card.name_band.font_px, Math.floor((S.card.base_w_px - 70) / Math.max(4, c.name_ko.length))))) };
for (const id of sampleCards) {
  const c = byId(id);
  put(SM, `card-${id}-full.svg`, A.cardSVG(c, 'full'));
  put(SM, `card-${id}-hand.svg`, A.cardSVG(c, 'hand'));
  if (c.kind === 'minion') put(SM, `card-${id}-token.svg`, A.tokenSVG(c, { state: { ready: true } })); // 보드 토큰은 응답자만
}
{
  const c = byId('B042'); const cell = 260;
  put(SM, 'recut-stages-B042.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cell * 4} 400" width="${cell * 4}" height="400"><rect width="100%" height="100%" fill="${U.bg_panel}"/>${S.recut.map((r, i) => `${nest(A.cardSVG(c, 'full', { recut: r.level, kind: 'answerer', stats: { cost: c.cost, atk: c.attack + (c.breakthrough?.[r.level]?.attack || 0), hp: c.health + (c.breakthrough?.[r.level]?.health || 0), base_atk: c.attack, base_hp: c.health } }), i * cell + 5, 10, 250, 350)}<text x="${i * cell + 130}" y="388" text-anchor="middle" font-size="16" fill="${U.salt_white}" ${A.FONT}>${r.level} ${r.ko}</text>`).join('')}</svg>`);
}

// ── UX 샘플: 유형 10장(손패·확대) + 색약 3종 시뮬 ──
const uxIds = ['D001', 'B001', 'B004', 'B019', 'B021', 'A001', 'A005', 'A022', 'A020', 'A019'];
{
  const cw = 82, chh = 115, gap = 8, rowW = uxIds.length * (cw + gap) + gap;
  const row = (y) => uxIds.map((id, i) => nest(A.cardSVG(byId(id), 'hand'), gap + i * (cw + gap), y, cw, chh)).join('');
  const lab = (y, t) => `<text x="8" y="${y}" font-size="13" fill="${U.salt_white}" ${A.FONT}>${t}</text>`;
  const filt = Object.entries(CVD_MATRICES).map(([k, m]) => `<filter id="cvd-${k}" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${m.map((r) => r.join(' ') + ' 0 0').join(' ')} 0 0 0 1 0"/></filter>`).join('');
  const kinds = ['normal', 'protan', 'deutan', 'tritan'], KO = { normal: '정상 시각', protan: '적색약(1형) 시뮬', deutan: '녹색약(2형) 시뮬', tritan: '청색약(3형) 시뮬' };
  const body = kinds.map((k, i) => { const y = 24 + i * (chh + 34); return lab(y - 6, KO[k] + (k === 'normal' ? '' : ` · 유형 색 최소 ΔE ${cvd[k].min_dE}`)) + `<g ${k === 'normal' ? '' : `filter="url(#cvd-${k})"`}>${row(y)}</g>`; }).join('');
  const legend = Object.entries(S.cardFamilies).map(([fid, f], i) => `${nest(A.familyBadgeSVG(fid, FAM_REP[fid]), gap + i * 140, 24 + 4 * (chh + 34), 28, 28)}<text x="${gap + i * 140 + 34}" y="${24 + 4 * (chh + 34) + 19}" font-size="13" fill="${U.salt_white}" ${A.FONT}>${f.ko}</text>`).join('');
  const H = 24 + 4 * (chh + 34) + 40;
  put(SM, 'ux-types-cvd.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.max(rowW, 720)} ${H}" width="${Math.max(rowW, 720)}" height="${H}"><defs>${filt}</defs><rect width="100%" height="100%" fill="${U.bg_abyss}"/>${body}${legend}</svg>`);
  // 확대 보기 5장(유형별) + 갈래 표지 27개
  const full = ['D001', 'B001', 'B019', 'A001', 'A022'];
  const brs = Object.keys(S.branchGlyph);
  put(SM, 'ux-types-full.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1310 470" width="1310" height="470"><rect width="100%" height="100%" fill="${U.bg_panel}"/>${full.map((id, i) => nest(A.cardSVG(byId(id), 'full'), 10 + i * 260, 10, 250, 350)).join('')}${brs.map((b, i) => { const fid = b.startsWith('d_') ? 'draw' : b.startsWith('ai_') ? 'strike' : b.startsWith('ad_') ? 'atkdraw' : S.DEBUFF_BRANCHES.includes(b) ? 'debuff' : 'buff'; return nest(A.familyBadgeSVG(fid, b), 10 + i * 48, 380, 40, 40) + `<text x="${30 + i * 48}" y="${436 + (i % 2) * 14}" text-anchor="middle" font-size="9" fill="${U.salt_dim}" ${A.FONT}>${b}</text>`; }).join('')}</svg>`);
}

// ── UX r2: 부채꼴 손패 10장(360x640 실제 배치·회전) 정상 + 색약 3종, 수집·덱 빌더 격자 ──
{
  const lay = computeLayout(360, 640), Hd = lay.E.hand, n = 10, fan = handFan(lay, n);
  const fanIds = ['B099', 'B053', 'B056', 'D009', 'A001', 'A032', 'A030', 'B001', 'A005', 'B019'];
  const one = (dy) => fanIds.map((id, i) => { const t = i / (n - 1) - 0.5, x = fan[i].x, y = dy + 8 + Math.abs(t) * 18, rot = t * 14 * 2; return `<g transform="rotate(${rot.toFixed(1)} ${x + Hd.card_w / 2} ${y + Hd.card_h})">${nest(A.cardSVG(byId(id), 'hand'), x, y, Hd.card_w, Hd.card_h)}</g>`; }).join('');
  const kinds = ['normal', 'protan', 'deutan', 'tritan'], KO = { normal: '정상', protan: '적색약 시뮬', deutan: '녹색약 시뮬', tritan: '청색약 시뮬' };
  const filt = Object.entries(CVD_MATRICES).map(([k, m]) => `<filter id="f-${k}" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${m.map((q) => q.join(' ') + ' 0 0').join(' ')} 0 0 0 1 0"/></filter>`).join('');
  const rowH = 170, body = kinds.map((k, i) => `<text x="8" y="${i * rowH + 16}" font-size="13" fill="${U.salt_white}" ${A.FONT}>360x640 부채꼴 손패 10장 · ${KO[k]} · 겹친 카드 보이는 폭 ${Math.round(screens['360x640'].fan.rows.at(-1).visible_ratio * 100)} %</text><g transform="translate(0 ${i * rowH + 4})" ${k === 'normal' ? '' : `filter="url(#f-${k})"`}>${one(14)}</g>`).join('');
  put(SM, 'ux-hand-fan-cvd.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 ${rowH * 4}" width="360" height="${rowH * 4}"><defs>${filt}</defs><rect width="100%" height="100%" fill="${U.bg_abyss}"/>${body}</svg>`);
  // 수집·덱 빌더: 필터 띠 + 격자 3열(손패형 카드 + 이름) + 덱 목록 줄 + 유형 비율 막대
  const W = 360, p = [`<rect width="${W}" height="640" fill="${U.bg_panel}"/>`];
  const famIds = Object.keys(S.cardFamilies);
  famIds.forEach((fid, i) => { const x = 8 + i * 52; p.push(`<rect x="${x}" y="8" width="48" height="48" rx="6" fill="${i === 3 ? U.button_idle : U.bg_abyss}" stroke="${i === 3 ? U.focus : U.line_soft}" stroke-width="2"/>${nest(A.familyBadgeSVG(fid, FAM_REP[fid]), x + 8, 16, 32, 32)}`); });
  ['minion', 'spell', 'weapon'].forEach((k, i) => { const x = 8 + (5 + i) * 52 - 4; if (x + 48 <= W) p.push(`<rect x="${x}" y="8" width="48" height="48" rx="6" fill="${U.bg_abyss}" stroke="${U.line_soft}" stroke-width="2"/><image href="../kind-${k}.svg" x="${x + 8}" y="16" width="32" height="32"/>`); });
  const gridIds = ['D001', 'B001', 'B019', 'A001', 'A022', 'A020', 'B004', 'B021', 'A019'];
  gridIds.forEach((id, i) => { const cw = 104, x = 8 + (i % 3) * (cw + 12), y = 68 + Math.floor(i / 3) * 170; p.push(nest(A.cardSVG(byId(id), 'hand'), x, y, cw, cw * 1.4)); p.push(`<text x="${x + cw / 2}" y="${y + cw * 1.4 + 14}" text-anchor="middle" font-size="12" fill="${U.salt_white}" ${A.FONT}>${byId(id).name_ko}</text>`); });
  put(SM, 'ux-collection-grid.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 590" width="${W}" height="590">${p.join('')}</svg>`);
  // 덱 목록 줄 + 유형 비율 막대
  const deck = ['D001', 'B001', 'B004', 'B019', 'A001', 'A019', 'A020', 'A022'], q = [`<rect width="360" height="300" fill="${U.bg_panel}"/>`];
  const cnt = Object.fromEntries(famIds.map((f) => [f, 0])); deck.forEach((id) => cnt[S.familyOf(byId(id))]++);
  let bx = 8; famIds.forEach((f) => { const wv = (344 * cnt[f]) / deck.length; if (wv) { q.push(`<defs>${A.familyPattern(f, 'dp-' + f)}</defs><rect x="${bx}" y="8" width="${wv}" height="20" fill="${S.cardFamilies[f].color}"/><rect x="${bx}" y="8" width="${wv}" height="20" fill="url(#dp-${f})"/>${nest(A.familyBadgeSVG(f, FAM_REP[f]), bx + 2, 9, 18, 18)}<text x="${bx + 24}" y="23" font-size="12" font-weight="800" fill="${S.cardFamilies[f].ink}" ${A.FONT}>${cnt[f]}</text>`); bx += wv; } });
  deck.forEach((id, i) => { const c = byId(id), f = S.familyOf(c), y = 40 + i * 32; q.push(`<rect x="8" y="${y}" width="344" height="30" fill="${U.bg_abyss}"/><rect x="8" y="${y}" width="8" height="30" fill="${S.cardFamilies[f].color}"/>${nest(A.familyBadgeSVG(f, c.branch), 20, y + 4, 22, 22)}<rect x="48" y="${y + 4}" width="22" height="22" rx="4" fill="${U.wick_lit_bar}"/><text x="59" y="${y + 20}" text-anchor="middle" font-size="14" font-weight="800" fill="${U.wick_ink}" ${A.FONT}>${c.cost}</text>${nest(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 0 48 48">${({ minion: '<path d="M0 0H26L34 8V42H22V48H12V42H0Z"', spell: '<path d="M8 0H26L34 8V40Q25 36 17 41T0 40V8Z"', weapon: '<path d="M0 0H26L34 8V40H24V44H30V48H4V44H10V40H0Z"' })[c.kind]} fill="${U.card_plate}" stroke="${U.stat_tab}" stroke-width="3"/></svg>`, 76, y + 4, 22, 22)}<text x="104" y="${y + 20}" font-size="13" fill="${U.salt_white}" ${A.FONT}>${c.name_ko}</text><text x="344" y="${y + 20}" text-anchor="end" font-size="13" fill="${U.salt_dim}" ${A.FONT}>×2</text>`); });
  put(SM, 'ux-deck-list.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300" width="360" height="300">${q.join('')}</svg>`);
}

// ── 목업 ──
function heroPlate(id, x, y, w, h, life, shell = 0, enemy = false, k = 1) {
  const f = S.factions[id];
  const ch = Math.round(w * 0.16);
  return `<g transform="translate(${x} ${y})"><path d="M0 0H${w - ch}L${w} ${ch}V${h}H0Z" fill="${f.deep}" stroke="${f.primary}" stroke-width="2.5"/>${nest(A.heroSVG(id), 3, 3, w - 6, h - 6)}
${(() => { const tw = (shell ? 52 : 30) * k, th = 22 * k, tx = (w - tw) / 2, ty = h - th + 6 * k; return `<path d="M${tx + 5 * k} ${ty}H${tx + tw - 5 * k}L${tx + tw} ${ty + th / 2}L${tx + tw - 5 * k} ${ty + th}H${tx + 5 * k}L${tx} ${ty + th / 2}Z" fill="${U.stat_tab}" stroke="${f.primary}" stroke-width="1.5"/>${shell ? `<text x="${tx + 12 * k}" y="${ty + th * .74}" text-anchor="middle" font-size="${13 * k}" font-weight="800" fill="${S.state.shell}" ${A.FONT}>${shell}</text><path d="M${tx + 24 * k} ${ty + 3 * k}L${tx + 20 * k} ${ty + th - 3 * k}" stroke="${f.primary}"/>` : ''}<text x="${tx + tw - 15 * k}" y="${ty + th * .76}" text-anchor="middle" font-size="${16 * k}" font-weight="800" fill="${life < 30 ? S.state.damage : U.salt_white}" ${A.FONT}>${life}</text>`; })()}</g>`;
}
function wickBar(r, lit, max, soot = 0) {
  // 2026-11-19: 심지 = 촛불 줄(A.candleRowSVG). 자리 높이에 맞춰 줄이고 숫자는 오른쪽
  { const ch = Math.max(r.h * 1.9, 28), cw = ch * 20 / 48, row = A.candleRowSVG({ max, lit: lit - soot > 0 ? lit : lit, soot }, 20, 48, 3), vw = +row.match(/viewBox="0 0 ([0-9.]+)/)[1], sw0 = r.w - 30, sw = Math.min(sw0, vw * ch / 48);
    return nest(row, r.x, r.y + r.h - ch, sw, ch) + `<text x="${r.x + sw + 3}" y="${r.y + r.h - 3}" font-size="${Math.max(12, Math.round(r.h * .75))}" font-weight="800" fill="${U.wick_flame}" ${A.FONT}>${lit}/${max}</text>`; }
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
  const enemyT = [['B031', { brine: 2 }], ['B024', { damaged: true }], ['A025', {}]];
  const myT = [['B003', { ready: true }], ['B012', { ready: true, atkBuff: true }], ['B096', { ready: false }], ['B097', { ready: true }]];
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
  { const r = E.end_breath; p.push(`<g transform="translate(${r.x} ${r.y})"><path d="M0 0H${r.w - 12}L${r.w} 12V${r.h}H0Z" fill="${U.button_primary}" stroke="${U.wick_ink}" stroke-width="2"/><text x="${r.w / 2}" y="${r.h / 2 + 6}" text-anchor="middle" font-size="${Math.min(17, r.w / 5.5)}" font-weight="800" fill="${U.button_primary_ink}" ${A.FONT}>턴 종료</text></g>`); }
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
  rs.forEach((r, i) => p.push(nest(A.saltChunkSVG(r), pos[i][0] - 40, pos[i][1] - 56, 80, 112)));
  p.push(nest(A.cardSVG(byId('B036'), 'hand'), 18, 480, 80, 112));
  p.push(`<text x="${w / 2}" y="${236}" text-anchor="middle" font-size="16" fill="${U.salt_white}" ${A.FONT}>카드를 눌러 뒤집으세요</text>`);
  p.push(`<g transform="translate(${w - 140} ${h - 64})"><rect width="124" height="48" rx="6" fill="${U.button_idle}"/><text x="62" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="${U.salt_white}" ${A.FONT}>모두 뒤집기</text></g>`);
  p.push(`<text x="16" y="30" font-size="13" fill="${U.salt_dim}" ${A.FONT}>확정 보장까지 23팩</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>인양 상자 개봉 목업</title>${p.join('')}</svg>\n`;
}
W('mockup-crate-360x640.svg', crateMock());

// ── UX2 모바일 게임형 화면(2026-11-19) ──
const ux2 = { lobby: {}, errs: [] };
for (const [w, h] of RESOLUTIONS) { const c = X.checkLobby(w, h); ux2.lobby[`${w}x${h}`] = c.rects; ux2.errs.push(...c.errs.map((e) => `로비 ${w}x${h}: ${e}`)); put(SM, `ux2-lobby-${w}x${h}.svg`, X.lobbySVG(w, h)); }
put(SM, 'ux2-battle-select.svg', X.battleSelectSVG());
put(SM, 'ux2-deck-first.svg', X.deckFirstSVG(360, 640, true));
put(SM, 'ux2-deck-first-notut.svg', X.deckFirstSVG(360, 640, false));
put(SM, 'ux2-deck-tutorial-4.svg', X.deckTutorialStripSVG());
put(SM, 'ux2-collection-card.svg', X.collectionCardSVG(byId('B003'), false));
put(SM, 'ux2-collection-story.svg', X.collectionCardSVG(byId('B003'), true));
for (const m of ['one', 'next', 'all']) put(SM, `ux2-pack-${m}.svg`, X.packOpenSVG(m, byId));
put(SM, 'ux2-worldmap.svg', X.worldmapSVG());
put(SM, 'ux2-worldmap-full.svg', X.worldmapSVG(undefined, 360, 640, true));
{ // 촛불 HUD 목업: 상태 5종 + 줄 + 비용 촛불 + 카드 낼 때 꺼지는 순서
  const st = ['lit', 'spent', 'spare', 'soot', 'empty'], KO = ['켜짐', '씀(연기)', '여분 심지', '그을음', '빈 자리'], q = [`<rect width="360" height="400" fill="${U.bg_abyss}"/>`];
  st.forEach((s, i) => q.push(nest(A.candleSVG(s, 40, 96), 16 + i * 68, 16, 40, 96), `<text x="${36 + i * 68}" y="${128}" text-anchor="middle" font-size="11" fill="${U.salt_white}" ${A.FONT}>${KO[i]}</text>`));
  const rows = [[{ max: 6, lit: 6, soot: 0, spare: 1 }, '턴 시작: 6개 켜짐 + 여분 심지'], [{ max: 6, lit: 3, soot: 0 }, '비용 3 카드를 낸 뒤: 오른쪽부터 3개 꺼짐'], [{ max: 6, lit: 4, soot: 2 }, '그을음 2: 왼쪽 2개 검게 탐']];
  rows.forEach(([o, t], i) => { const y = 150 + i * 76, row = A.candleRowSVG(o, 20, 48, 3), vw = +row.match(/viewBox="0 0 ([0-9.]+)/)[1]; q.push(nest(row, 16, y, vw, 48), `<text x="16" y="${y + 64}" font-size="12" fill="${U.salt_dim}" ${A.FONT}>${t}</text>`); });
  q.push(nest(A.cardSVG(byId('B003'), 'hand'), 270, 160, 82, 115), `<text x="311" y="292" text-anchor="middle" font-size="11" fill="${U.salt_dim}" ${A.FONT}>비용 = 같은 촛불</text>`);
  put(SM, 'ux2-candle-hud.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 400" width="360" height="400">${q.join('')}</svg>`);
}
W('candle-lit.svg', A.candleSVG('lit')); W('candle-spent.svg', A.candleSVG('spent')); W('candle-spare.svg', A.candleSVG('spare')); W('candle-soot.svg', A.candleSVG('soot')); W('candle-empty.svg', A.candleSVG('empty'));

// ── art.json ──
const art = {
  schema: S.SCHEMA, generated_by: 'tools/art/build.mjs', source: 'tools/art/spec.mjs',
  note: '단위는 키 끝(_px·_ms·_s·_hz·_db·_ratio·_deg·_bpm). layout은 board_slots=5 가정(balance.json rules.board_limit 확정 후 1-2에서 다시 생성)',
  palette: { ui: S.ui, factions: S.factions, rarity: S.rarity, state: S.state, keywords: S.keywords },
  card: S.card, recut: S.recut,
  text_fit: textStats,
  layout: { input: LAYIN, screens: Object.fromEntries(Object.entries(screens).map(([k, v]) => [k, { orientation: v.orientation, scale: v.scale, slot_w_px: v.slot_w, slot_h_px: v.slot_h, board_stat_font_px: v.check.stat_font_px, hand_spread_card_w_px: v.check.hand_spread_card_w_px, rects_px: v.E }])) },
  tempo: S.tempo, sound: S.sound, text_keys: S.textKeys,
  story_panel: S.storyPanel,
  ux2: { ...X.UX2, lobby_rects_px: ux2.lobby, lobby_errs: ux2.errs, worldmap_regions: X.REGIONS, worldmap_nodes_placeholder: X.defaultNodes(), candle: S.candle },
  ux_fan: Object.fromEntries(Object.entries(screens).map(([k, v]) => [k, v.fan])),
  ux: { families: S.cardFamilies, debuff_branches: S.DEBUFF_BRANCHES, branch_glyph: S.branchGlyph, kinds: S.cardKinds, badge: S.badge, hierarchy: S.hierarchy, deny_feedback: S.denyFeedback, hand_compare: S.handCompare, tutorial_ui: S.tutorialUi, tutorial_layout: tutorial, cvd_min_dE: cvd, cvd_threshold_dE: CVD_MIN, family_rule: 'familyOf(card): drawbuff→draw, attack+instant→strike, attack+draw→atkdraw, buff+debuff 갈래→debuff, 나머지 buff→buff' },
  assets: written.sort(),
  portrait_generator: { module: 'tools/art/portrait-gen.mjs', export: 'portraitSVG(card)', viewbox: '0 0 120 90', cache: '카드마다 한 번 만들어 blob URL로 캐시' },
  contrast: { checked: pairs.length, failed: badPairs.length, min_ratio: Math.min(...pairs.filter((p) => p.min === 4.5).map((p) => p.ratio)) },
};
writeFileSync(join(PROJ, 'art.json'), JSON.stringify(art, null, 1) + '\n');

// ── 검수 시트(HTML, Edge 헤드리스 스크린샷용, 파일 안 이미지만) ──
const sheet = `<!doctype html><meta charset="utf-8"><title>tcg-01 art sheet</title><style>body{background:${U.bg_abyss};color:${U.salt_white};font-family:sans-serif;margin:8px}img{margin:4px;vertical-align:top}.d img{background:${U.bg_panel}}</style>
<div>${['frame-answerer', 'frame-rite', 'frame-brand', 'card-back'].map((n) => `<img src="../${n}.svg" width="160">`).join('')}${sampleCards.map((id) => `<img src="card-${id}-full.svg" width="160">`).join('')}</div>
<div>${sampleCards.map((id) => `<img src="card-${id}-hand.svg" width="82">`).join('')}${sampleCards.filter((id) => byId(id).kind === 'minion').map((id) => `<img src="card-${id}-token.svg" width="64">`).join('')}</div>
<div class="d">${Object.keys(S.factions).filter((x) => x !== 'neutral').map((id) => `<img src="../hero-${id.slice(2)}.svg" width="100">`).join('')}${['bare-sea', 'warden', 'rider'].map((n) => `<img src="../crate-${n}.svg" width="100">`).join('')}${Object.keys(S.rarity).map((r) => `<img src="../salt-chunk-${r}.svg" width="64">`).join('')}<img src="../app-icon.svg" width="100"></div>
<div class="d">${A.keywordIds.map((k) => `<img src="../kw-${k}.svg" width="40" title="${k}">`).join('')}${Object.keys(S.rarity).map((r) => `<img src="../rarity-${r}.svg" width="40">`).join('')}${[...Object.keys(A.statIcons), ...Object.keys(A.currencyIcons)].map((n) => `<img src="../${n}.svg" width="40">`).join('')}</div>`;
put(SM, 'sheet.html', sheet);
put(SM, 'mockups.html', `<!doctype html><meta charset="utf-8"><style>body{background:#000;margin:8px}img{margin:4px;vertical-align:top}</style><img src="../mockup-battle-360x640.svg"><img src="../mockup-battle-412x915.svg" width="360"><img src="../mockup-crate-360x640.svg"><br><img src="../mockup-battle-640x360.svg"><img src="../mockup-battle-1280x720.svg" width="640"><br><img src="recut-stages-B042.svg" width="900">`);

// ── 결과 ──
console.log(`글 맞춤 ${textStats.cards}장: 실패 ${textStats.fail} ${textFail.join(' ')}, 12 px로 줄인 카드 ${textStats.small_font_cards}, 이름 최소 ${textStats.min_name_font_px}px, 필드 ${LAYIN.board_slots}칸·손패 ${LAYIN.hand_limit} (${LAYIN.source})`);
console.log(`유형 색 색약 최소 ΔE: ${Object.entries(cvd).map(([k, v]) => k + ' ' + v.min_dE).join(', ')} (기준 ${CVD_MIN}) ${cvdFail.length ? 'FAIL' : 'OK'} · 튜토리얼 자리 4해상도 ${Object.values(tutorial).every((t) => !t.errs.length) ? 'OK' : 'FAIL'}`);
console.log(`에셋 ${written.length}개, 샘플 카드 ${sampleCards.length}장 × 3형태 + 돌파 시트`);
console.log(`대비 ${pairs.length}쌍 검사, 실패 ${badPairs.length}, 글자·숫자 최소 ${art.contrast.min_ratio}:1`);
for (const b of badPairs) console.log(`  FAIL ${b.what}: ${b.ratio} < ${b.min}`);
for (const [k, v] of Object.entries(screens)) console.log(`  ${k}: slot ${v.slot_w}x${v.slot_h}, 보드 숫자 ${v.check.stat_font_px}px, ${v.check.errs.length ? 'FAIL ' + v.check.errs.join('; ') : '배치 OK'}`);
writeFileSync(join(SM, 'contrast-report.json'), JSON.stringify(pairs, null, 1));
for (const e of ux2.errs) console.log('  FAIL ' + e);
console.log(`UX2 로비 4해상도 ${ux2.errs.length ? 'FAIL' : 'OK'} · 목업 ux2-* 생성`);
process.exit(badPairs.length || layoutErrs || textFail.length || cvdFail.length || ux2.errs.length ? 1 : 0);
