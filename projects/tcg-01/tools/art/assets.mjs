// SVG 에셋·카드 조립기·목업 (art-director 1-1). 외부 이미지·폰트·CDN 없음(글꼴은 기기 기본 sans-serif).
// build.mjs가 호출합니다. 카드 조립 함수 cardSVG / tokenSVG 는 빌드(game-developer)가 그대로 가져다 써도 됩니다.
import { ui, factions, rarity as RAR, state as ST, keywords as KW, card as C, recut as RECUT } from './spec.mjs';
import { portraitSVG, glyph, guessKind, hash } from './portrait-gen.mjs';

export const FONT = `font-family="'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif"`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svg = (w, h, body, title = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${title ? `<title>${esc(title)}</title>` : ''}${body}</svg>\n`;
const inner = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

// ───────── 키워드 아이콘 (48x48, 어두운 판 위 선 그림) ─────────
const KWI = {
  first_breath: (c) => `<circle cx="16" cy="32" r="5" fill="${c}"/><path d="M22 28Q30 22 26 14M26 32Q36 28 36 18M24 36Q38 38 40 28" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
  ebb: (c) => `<path d="M6 20Q12 14 18 20T30 20T42 20" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/><path d="M38 33H12M18 27L12 33L18 39" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  breakwater: (c) => `<path d="M6 40V14H42V40Z" fill="none" stroke="${c}" stroke-width="3.2"/><path d="M6 23H42M6 32H42M18 14V23M30 14V23M24 23V32M12 32V40M36 32V40" stroke="${c}" stroke-width="2.4"/>`,
  saltskin: (c) => `<path d="M24 5L40 14V34L24 43L8 34V14Z" fill="none" stroke="${c}" stroke-width="3.2" stroke-linejoin="round"/><path d="M24 5V18M40 14L30 20M8 14L18 20" stroke="${c}" stroke-width="2"/><circle cx="24" cy="26" r="5" fill="${c}"/>`,
  seamist: (c) => `<path d="M6 16H20M26 16H42M10 25H30M35 25H40M6 34H16M22 34H42" stroke="${c}" stroke-width="3.6" stroke-linecap="round"/>`,
  spur: (c) => `<circle cx="28" cy="24" r="6" fill="none" stroke="${c}" stroke-width="3"/>${[0, 60, 120, 180, 240, 300].map((a) => { const r = a * Math.PI / 180; return `<path d="M${(28 + Math.cos(r) * 8).toFixed(1)} ${(24 + Math.sin(r) * 8).toFixed(1)}L${(28 + Math.cos(r) * 14).toFixed(1)} ${(24 + Math.sin(r) * 14).toFixed(1)}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`; }).join('')}<path d="M6 24H20" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`,
  rapids: (c) => `<path d="M8 12L20 24L8 36M22 12L34 24L22 36" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 40Q38 36 42 40" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`,
  drown: (c) => `<path d="M24 5V24M17 18L24 25L31 18" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 32Q12 27 18 32T30 32T42 32M10 40Q16 35 22 40T34 40" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
  draught: (c) => `<path d="M10 16H28L25 40H13Z" fill="none" stroke="${c}" stroke-width="3.2" stroke-linejoin="round"/><path d="M30 26Q40 22 38 10M33 12L38 8L42 13" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  unname: (c) => `<rect x="6" y="14" width="36" height="20" rx="3" fill="none" stroke="${c}" stroke-width="3.2"/><path d="M12 10L36 38M36 10L12 38" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
  anchor: (c) => `<circle cx="24" cy="9" r="4" fill="none" stroke="${c}" stroke-width="3"/><path d="M24 13V41M15 20H33M8 30Q10 41 24 41Q38 41 40 30" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`,
  kindle: (c) => `<path d="M24 6Q34 16 32 26A8 8 0 0 1 16 26Q15 20 20 16Q20 22 24 22Q27 14 24 6Z" fill="${c}"/><circle cx="12" cy="40" r="3.4" fill="${c}"/><circle cx="24" cy="41" r="3.4" fill="${c}"/><circle cx="36" cy="40" r="3.4" fill="${c}"/>`,
  sealwrit: (c) => `<path d="M24 6L29 10L35 9L36 15L41 19L38 24L41 29L36 33L35 39L29 38L24 42L19 38L13 39L12 33L7 29L10 24L7 19L12 15L13 9L19 10Z" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/><path d="M17 24H31" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`,
  soot: (c) => `<rect x="17" y="18" width="14" height="24" fill="none" stroke="${c}" stroke-width="3"/><path d="M24 18V12" stroke="${c}" stroke-width="3"/><path d="M14 10Q20 4 26 8Q32 2 36 8" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/><path d="M10 6L38 40" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`,
  wake: (c) => `<circle cx="34" cy="24" r="5" fill="${c}"/><path d="M28 18Q16 18 6 8M28 30Q16 30 6 40M22 24H10" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
  salvage: (c) => `<path d="M24 4V22A8 8 0 1 1 12 19" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/><rect x="28" y="30" width="8" height="8" fill="${c}"/><rect x="38" y="30" width="6" height="8" fill="none" stroke="${c}" stroke-width="2"/><rect x="4" y="38" width="6" height="6" fill="none" stroke="${c}" stroke-width="2"/>`,
  swell: (c) => `<path d="M24 30V8M16 15L24 7L32 15" fill="none" stroke="${c}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 38Q12 32 18 38T30 38T42 38" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`,
  brine: (c) => `<rect x="10" y="8" width="7" height="7" transform="rotate(45 13.5 11.5)" fill="${c}"/><rect x="27" y="6" width="6" height="6" transform="rotate(45 30 9)" fill="${c}"/><rect x="19" y="18" width="6" height="6" transform="rotate(45 22 21)" fill="${c}"/><path d="M24 26Q32 34 30 38A6 6 0 0 1 18 38Q16 34 24 26Z" fill="none" stroke="${c}" stroke-width="3"/>`,
};
export function keywordIcon(k, size = 48, withBg = true) {
  const kw = KW.find((x) => x.id === k);
  const body = KWI[k](kw.color);
  return svg(size, size, `<g transform="scale(${size / 48})">${withBg ? `<circle cx="24" cy="24" r="23" fill="${ui.stat_tab}"/>` : ''}${body}</g>`, `${kw.ko} / ${kw.en}`);
}

// ───────── 희귀도 아이콘 (보석 모양 금지: 모래알·진주알·산호 가지·심해 눈) ─────────
const RARI = {
  sand: () => `<circle cx="15" cy="30" r="6" fill="${RAR.sand.fill}" stroke="${RAR.sand.edge}" stroke-width="2"/><circle cx="31" cy="32" r="5" fill="${RAR.sand.fill}" stroke="${RAR.sand.edge}" stroke-width="2"/><circle cx="24" cy="18" r="5.5" fill="${RAR.sand.fill}" stroke="${RAR.sand.edge}" stroke-width="2"/>`,
  pearl: () => `<defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${RAR.pearl.sheen[0]}"/><stop offset=".5" stop-color="${RAR.pearl.sheen[1]}"/><stop offset="1" stop-color="${RAR.pearl.sheen[2]}"/></linearGradient></defs><circle cx="24" cy="25" r="14" fill="url(#pg)" stroke="${RAR.pearl.edge}" stroke-width="2"/><ellipse cx="19" cy="20" rx="4" ry="3" fill="#fff"/>`,
  coral: () => `<path d="M24 44V28M24 28L14 18V8M24 28L32 20L32 10M14 18L8 14M32 20L40 16" fill="none" stroke="${RAR.coral.fill}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  abyss: () => `<circle cx="24" cy="24" r="17" fill="${RAR.abyss.fill}" stroke="${RAR.abyss.edge}" stroke-width="2.5"/><path d="M10 24Q24 14 38 24Q24 34 10 24Z" fill="#05090D" stroke="${RAR.abyss.glow}" stroke-width="1.6"/><circle cx="24" cy="24" r="4" fill="${RAR.abyss.glow}"/>`,
};
export function rarityIcon(r, size = 48) { return svg(size, size, `<g transform="scale(${size / 48})">${RARI[r]()}</g>`, RAR[r].name_ko); }

// ───────── 기본 수치 아이콘 ─────────
export const statIcons = {
  'icon-wick': () => svg(48, 48, `<rect x="17" y="16" width="14" height="28" rx="3" fill="${ui.wick_lit_bar}" stroke="${ui.wick_ink}" stroke-width="2"/><path d="M24 16V11" stroke="${ui.wick_ink}" stroke-width="2"/><path d="M24 2Q31 9 28 13A4 4 0 0 1 20 13Q18 8 24 2Z" fill="${ui.wick_flame}"/>`, '심지'),
  'icon-wick-spent': () => svg(48, 48, `<rect x="17" y="16" width="14" height="28" rx="3" fill="${ui.wick_spent}"/><path d="M24 16V11" stroke="${ui.wick_spent}" stroke-width="2"/><path d="M22 8Q26 5 24 2" fill="none" stroke="${ui.salt_dim}" stroke-width="1.5" opacity=".6"/>`, '쓴 심지'),
  'icon-wick-soot': () => svg(48, 48, `<rect x="17" y="16" width="14" height="28" rx="3" fill="${ui.wick_soot}"/><path d="M14 18L34 42M34 18L14 42" stroke="#1A0F0A" stroke-width="3"/>`, '그을린 심지'),
  'icon-lifeline': () => svg(48, 48, `<rect x="14" y="4" width="20" height="6" rx="2" fill="${ui.salt_white}"/><rect x="14" y="38" width="20" height="6" rx="2" fill="${ui.salt_white}"/><path d="M20 10V38M24 10V38M28 10V38" stroke="${ST.damage}" stroke-width="2.6"/>`, '명줄(체력)'),
  'icon-attack': () => svg(48, 48, `<path d="M24 3L33 20L27 20L27 42H21L21 20L15 20Z" fill="${ui.salt_white}" stroke="${ui.stat_tab}" stroke-width="2" stroke-linejoin="round"/><path d="M16 34H32" stroke="${ui.salt_white}" stroke-width="3"/>`, '공격(작살 끝)'),
  'icon-shell': () => svg(48, 48, `<path d="M10 30L16 12L30 8L40 20L36 38L18 40Z" fill="${ST.shell}" stroke="#7C8E96" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 12L22 24L30 8M22 24L40 20M22 24L18 40" stroke="#7C8E96" stroke-width="1.6"/>`, '껍질'),
  'icon-spare-wick': () => svg(48, 48, `<rect x="16" y="26" width="16" height="16" rx="3" fill="${ui.wick_lit_bar}" stroke="${ui.wick_ink}" stroke-width="2"/><path d="M16 30Q24 26 32 30" fill="none" stroke="${ui.wick_ink}" stroke-width="1.6"/><path d="M24 26V21" stroke="${ui.wick_ink}" stroke-width="2"/><path d="M24 10Q30 16 28 20A4 4 0 0 1 20 20Q19 15 24 10Z" fill="${ui.wick_flame}"/>`, '여분 심지(초 토막)'),
  'icon-deck': () => svg(48, 48, `<rect x="12" y="12" width="24" height="32" rx="2" fill="${ui.bg_panel}" stroke="${ui.salt_dim}" stroke-width="2"/><rect x="9" y="8" width="24" height="32" rx="2" fill="${ui.board_slot}" stroke="${ui.salt_white}" stroke-width="2"/><circle cx="21" cy="24" r="6" fill="none" stroke="${ui.salt_white}" stroke-width="2"/>`, '영장첩'),
  'icon-sunk': () => svg(48, 48, `<path d="M6 22Q15 16 24 22T42 22V44H6Z" fill="${ui.tide_black}" stroke="${ui.board_ring}" stroke-width="2"/><rect x="17" y="26" width="14" height="12" fill="none" stroke="${ui.salt_dim}" stroke-width="2" transform="rotate(-12 24 32)"/>`, '가라앉은 자리'),
  'icon-log': () => svg(48, 48, `<rect x="8" y="8" width="32" height="32" rx="4" fill="${ui.button_idle}"/><path d="M15 17H33M15 24H33M15 31H26" stroke="${ui.salt_white}" stroke-width="3" stroke-linecap="round"/>`, '기록'),
  'icon-asleep': () => svg(48, 48, `<rect x="18" y="20" width="12" height="22" rx="2" fill="${ui.wick_spent}"/><path d="M24 20V14" stroke="${ui.wick_spent}" stroke-width="2"/><path d="M20 10Q24 6 22 2M27 10Q31 6 29 2" fill="none" stroke="${ui.salt_dim}" stroke-width="1.6" stroke-linecap="round"/>`, '아직 공격 못 함(꺼진 심지)'),
  'icon-ready': () => svg(48, 48, `<rect x="18" y="20" width="12" height="22" rx="2" fill="${ui.wick_lit_bar}"/><path d="M24 20V14" stroke="${ui.wick_ink}" stroke-width="2"/><path d="M24 2Q32 9 29 14A5 5 0 0 1 19 14Q17 8 24 2Z" fill="${ui.wick_flame}"/>`, '공격 가능(켜진 심지)'),
};

// ───────── 재화 ─────────
export const currencyIcons = {
  'currency-salt': () => svg(48, 48, `<rect x="7" y="11" width="34" height="26" rx="3" fill="#EDE6D3" stroke="#8C7F62" stroke-width="2.4"/><rect x="12" y="16" width="24" height="16" rx="2" fill="none" stroke="#8C7F62" stroke-width="1.8"/><path d="M17 26Q21 21 24 26T31 26" fill="none" stroke="#8C7F62" stroke-width="2.2" stroke-linecap="round"/>`, '소금화'),
  'currency-ink': () => svg(48, 48, `<path d="M16 16H32V22L37 28V43H11V28L16 22Z" fill="#1E2124" stroke="#9AA6AD" stroke-width="2.2" stroke-linejoin="round"/><rect x="18" y="9" width="12" height="7" fill="#6C4B2E"/><path d="M33 4L41 12L28 25" stroke="#C9CED1" stroke-width="3" stroke-linecap="round"/><path d="M11 34H37" stroke="#4DE0FF" stroke-width="2"/>`, '각인 먹'),
  'currency-pearl': () => svg(48, 48, `<circle cx="24" cy="25" r="15" fill="#0E1E33" stroke="${RAR.abyss.glow}" stroke-width="2.6"/><ellipse cx="19" cy="19" rx="5" ry="3.4" fill="#BFF4FF" opacity=".85"/><circle cx="24" cy="25" r="19" fill="none" stroke="${RAR.abyss.glow}" stroke-opacity=".35" stroke-width="2"/>`, '심해 진주'),
};

// ───────── 인양 상자(팩) ─────────
export function crateSVG(variant = 'bare_sea') {
  const fac = variant === 'bare_sea' ? null : factions[variant];
  const band = fac ? fac.primary : '#7FB8A4';
  return svg(200, 200, `
<ellipse cx="100" cy="182" rx="80" ry="10" fill="#000" opacity=".35"/>
<path d="M28 70L100 46L172 70V160L100 184L28 160Z" fill="#5A4430" stroke="#2A1D12" stroke-width="4" stroke-linejoin="round"/>
<path d="M28 70L100 94L172 70M100 94V184" fill="none" stroke="#2A1D12" stroke-width="4"/>
<path d="M28 98L100 122L172 98M28 128L100 152L172 128" fill="none" stroke="#3E2D1E" stroke-width="3"/>
<path d="M40 74L100 54L160 74L100 92Z" fill="#6E5539"/>
<path d="M58 66L100 52M70 80L136 58" stroke="#3E2D1E" stroke-width="3"/>
<path d="M28 70Q36 62 46 68Q56 58 66 64M134 60Q146 54 156 62Q166 58 172 70M30 160Q40 152 50 160M150 162Q160 154 170 160" fill="none" stroke="#EDE6D3" stroke-width="5" stroke-linecap="round" opacity=".9"/>
<path d="M64 110L100 122L136 110" fill="none" stroke="${band}" stroke-width="10"/>
<path d="M118 132Q126 124 134 132T150 132" fill="none" stroke="#EDE6D3" stroke-width="4" stroke-linecap="round"/>
<path d="M44 116Q40 140 48 160M156 116Q160 140 152 160" fill="none" stroke="#C9A24A" stroke-width="3" stroke-dasharray="6 5"/>
${fac ? `<g opacity=".95">${glyph(fac.shape, 100, 70, 11, fac.primary, '#EDE6D3', '#2A1D12')}</g>` : `<circle cx="100" cy="72" r="9" fill="none" stroke="#EDE6D3" stroke-width="3"/>`}`, variant === 'bare_sea' ? '노해 인양 상자' : `세력 상자 ${variant}`);
}
// 소금 덩이(팩 개봉 단계에서 희귀도 예고)
export function saltChunkSVG(r) {
  const R = RAR[r];
  const glow = R.glow ? `<ellipse cx="50" cy="56" rx="46" ry="38" fill="${R.glow}" opacity="${r === 'abyss' ? .55 : r === 'coral' ? .45 : .3}"/>` : '';
  const fill = r === 'pearl' ? 'url(#cg)' : R.fill;
  return svg(100, 100, `<defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${RAR.pearl.sheen[0]}"/><stop offset=".5" stop-color="${RAR.pearl.sheen[1]}"/><stop offset="1" stop-color="${RAR.pearl.sheen[2]}"/></linearGradient></defs>${glow}
<path d="M18 62L26 30L48 18L74 24L86 50L78 78L50 88L24 80Z" fill="${fill}" stroke="${R.edge}" stroke-width="3" stroke-linejoin="round"/>
<path d="M26 30L44 44L48 18M44 44L74 24M44 44L50 88M44 44L18 62" fill="none" stroke="${R.edge}" stroke-width="1.6" opacity=".7"/>
<path d="M30 70L38 72M60 76L66 70M70 40L76 44" stroke="#FFFFFF" stroke-width="2" opacity=".6" stroke-linecap="round"/>`, `소금 덩이(${R.name_ko})`);
}

// ───────── 영웅 초상 6명 (도형 실루엣, 10-lore 4절 시각 힌트) ─────────
const HERO_BODY = {
  h_warden: (f) => `<path d="M30 44H170" stroke="${f.secondary}" stroke-width="4" opacity=".9"/><circle cx="100" cy="88" r="24" fill="${f.primary}" stroke="${f.secondary}" stroke-width="3"/><path d="M90 78L98 86" stroke="${f.deep}" stroke-width="3"/><path d="M44 120H156V196Q156 226 100 238Q44 226 44 196Z" fill="${f.primary}" stroke="${f.secondary}" stroke-width="4"/><path d="M44 146H156M100 120V238" stroke="${f.secondary}" stroke-width="3" opacity=".6"/><path d="M58 128L66 136M136 200L142 206M70 212L76 206" stroke="${f.secondary}" stroke-width="3" stroke-linecap="round"/>`,
  h_choir: (f) => `<circle cx="100" cy="40" r="14" fill="none" stroke="${f.secondary}" stroke-width="4"/><path d="M100 64Q132 64 138 120Q150 190 168 236H32Q50 190 62 120Q68 64 100 64Z" fill="${f.primary}" stroke="${f.secondary}" stroke-width="4"/><ellipse cx="100" cy="100" rx="16" ry="20" fill="${f.deep}"/><path d="M76 140L40 150M124 140L160 150" stroke="${f.secondary}" stroke-width="7" stroke-linecap="round"/><path d="M70 236Q100 220 130 236" fill="none" stroke="${f.secondary}" stroke-width="3" opacity=".6"/>`,
  h_wreck: (f) => `<rect x="120" y="40" width="16" height="44" fill="${f.secondary}" stroke="${f.deep}" stroke-width="3"/><path d="M126 34Q120 24 128 16Q136 24 130 34" fill="none" stroke="${f.secondary}" stroke-width="3" opacity=".6"/><circle cx="90" cy="76" r="20" fill="${f.primary}" stroke="${f.secondary}" stroke-width="3"/><rect x="78" y="70" width="24" height="9" fill="${f.secondary}"/><path d="M60 110H120L140 160L120 210H60L40 160Z" fill="${f.primary}" stroke="${f.secondary}" stroke-width="4"/><path d="M128 132L170 118L186 150L172 186L150 178L162 152L140 152" fill="${f.secondary}" stroke="${f.deep}" stroke-width="3" stroke-linejoin="round"/><path d="M60 210L52 238M120 210L128 238" stroke="${f.primary}" stroke-width="10"/><circle cx="90" cy="160" r="9" fill="none" stroke="${f.secondary}" stroke-width="3"/>`,
  h_rider: (f) => `<path d="M30 200A70 34 0 0 1 170 200Z" fill="${f.primary}" stroke="${f.secondary}" stroke-width="4" opacity=".95"/><path d="M40 206L24 232M70 210L62 236M130 210L138 236M160 206L176 232" stroke="${f.primary}" stroke-width="7" stroke-linecap="round"/><path d="M124 30L150 170H54Z" fill="${f.primary}" stroke="${f.deep}" stroke-width="4" stroke-linejoin="round"/><circle cx="118" cy="76" r="17" fill="${f.primary}" stroke="${f.deep}" stroke-width="3"/><path d="M104 96Q80 110 60 100L40 112" fill="none" stroke="${f.secondary}" stroke-width="10" stroke-linecap="round"/><path d="M150 40L176 20" stroke="${f.secondary}" stroke-width="5"/><path d="M168 12L184 16L176 28Z" fill="${f.secondary}"/>`,
  h_archive: (f) => `${[-60, -40, -20, 0, 20, 40, 60].map((a) => { const r = a * Math.PI / 180; const x = 100 + Math.sin(r) * 50, y = 66 - Math.cos(r) * 34; return `<path d="M${x.toFixed(0)} ${(y - 12).toFixed(0)}Q${(x + 6).toFixed(0)} ${(y - 2).toFixed(0)} ${x.toFixed(0)} ${(y + 4).toFixed(0)}Q${(x - 6).toFixed(0)} ${(y - 2).toFixed(0)} ${x.toFixed(0)} ${(y - 12).toFixed(0)}Z" fill="${f.primary}"/>`; }).join('')}<circle cx="100" cy="92" r="18" fill="${f.secondary}" stroke="${f.primary}" stroke-width="3"/><rect x="66" y="114" width="68" height="122" fill="${f.secondary}" stroke="${f.primary}" stroke-width="4"/><path d="M80 140H120M80 156H120M80 172H112" stroke="${f.primary}" stroke-width="3" opacity=".8"/><rect x="128" y="150" width="26" height="34" rx="4" fill="${f.primary}"/><path d="M141 150V140" stroke="${f.primary}" stroke-width="3"/>`,
  h_nameless: (f) => `<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="${f.primary}" stop-opacity="1"/><stop offset="1" stop-color="${f.primary}" stop-opacity="0"/></linearGradient></defs><path d="M130 40A90 100 0 1 0 140 236L120 236A70 92 0 1 1 130 40Z" fill="url(#fade)" stroke="${f.secondary}" stroke-width="3"/><path d="M84 54Q128 50 132 110Q128 150 96 160Q72 150 70 110Q70 66 84 54Z" fill="${f.secondary}" opacity=".85"/><rect x="88" y="90" width="30" height="34" fill="${f.deep}" stroke="${f.primary}" stroke-width="3"/><path d="M120 176L150 196" stroke="${f.primary}" stroke-width="2" opacity=".8"/><path d="M146 186L158 204" stroke="#C9CED1" stroke-width="2"/>`,
};
export function heroSVG(id) {
  const f = factions[id];
  return svg(200, 240, `<rect width="200" height="240" fill="${f.deep}"/><path d="M0 196H200V240H0Z" fill="${f.primary}" opacity=".12"/><path d="M0 196H200" stroke="${f.secondary}" stroke-opacity=".3"/>${HERO_BODY[id](f)}`, `${id} 임시 초상`);
}

// ───────── 카드 조립 ─────────
const KW_NAMES = KW.map((k) => k.ko).sort((a, b) => b.length - a.length);
function wrapKo(text, maxChars) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur); return lines;
}
function boldKeywords(line) {
  let out = esc(line);
  for (const k of KW_NAMES) out = out.split(k).join(`\u0001${k}\u0002`);
  return out.replace(/\u0001/g, '<tspan font-weight="800">').replace(/\u0002/g, '</tspan>');
}
// cards.json(엔진) 키워드 id → 우리 키워드 id
export const ENGINE_KW = { guard: 'breakwater', lifesteal: 'draught', rush: 'spur', stealth: 'seamist', shield: 'saltskin', charge: 'rapids', deadly: 'drown' };
export const LINEAGE_KO = { warden: '파수병', drowned: '익사자', contraption: '태엽물', rider: '기수', scribe: '필경사', nameless: '무명', shoreling: '갯것' }; // 10-lore 5-3
export const ENGINE_KIND = { minion: 'answerer', spell: 'rite', weapon: 'brand' };
export function cardKeywords(cardData) {
  const fromEngine = (cardData.keywords || []).map((k) => ENGINE_KW[k]).filter(Boolean);
  const t = cardData.concept_ko || '';
  const fromText = KW.filter((k) => t.includes(k.ko)).map((k) => k.id);
  return [...new Set([...fromEngine, ...fromText])].slice(0, C.keyword_icons.max);
}
// 글 상자 맞춤: 13 px·15자·4줄 → 안 되면 12 px·16자·5줄(줄 간격 15). 의식은 상자가 커서 6줄까지
export function fitText(text, kind) {
  const tries = kind === 'rite' ? [[13, 15, 5, 18], [12, 16, 6, 16]] : [[13, 15, 4, 18], [12, 16, 5, 15]];
  for (const [font, chars, maxL, lh] of tries) { const lines = wrapKo(text, chars); if (lines.length <= maxL && lines.every((l) => l.length <= chars + 2)) return { font, lines, lh, ok: true }; }
  const [font, chars, maxL, lh] = tries[tries.length - 1]; return { font, lines: wrapKo(text, chars).slice(0, maxL), lh, ok: false };
}

// 임시 수치: balance 미정이라 cost_band로 자리만 채움(샘플·목업 전용)
export function placeholderStats(c) {
  const h = hash(c.id); const base = { low: 1 + (h % 3), mid: 4 + (h % 3), high: 7 + (h % 3) }[c.cost_band] ?? 3;
  const cost = c.rarity_hint === 'abyss' ? Math.max(base, 7) : base;
  const atk = Math.max(1, cost + ((h >> 3) % 3) - 1), hp = Math.max(1, 2 * cost + 1 - atk);
  return { cost, atk, hp };
}

/** 카드 SVG. mode: 'full'(확대 보기 250x350) | 'hand'(손패: 숫자 크게, 글 상자 대신 그림 크게)
 *  opts: { stats:{cost,atk,hp,base_atk,base_hp,damaged}, recut:0..3, kind } */
export function cardSVG(c, mode = 'full', opts = {}) {
  const fac = factions[c.owner] || factions.neutral, rar = RAR[c.rarity || c.rarity_hint || 'sand'];
  const kind = opts.kind || ENGINE_KIND[c.kind] || guessKind(c);
  const st = opts.stats || (c.cost != null ? { cost: c.cost, atk: c.attack, hp: c.health } : placeholderStats(c));
  const rc = RECUT[opts.recut || 0];
  const W = C.base_w_px, H = C.base_h_px, ch = C.chip_corner_px;
  const hand = mode === 'hand';
  const plateBottom = kind === 'answerer' || kind === 'brand' ? 336 : H;
  const p = [];
  // 판 모양: 응답자 = 오른쪽 위 한 모서리 깨짐 / 의식 = 위 두 모서리 깨짐 + 아래 물마루 / 인장 = 한 모서리 + 아래 손잡이 판
  let plate;
  if (kind === 'rite') plate = `M${ch} 0H${W - ch}L${W} ${ch}V${H - 16}Q${W * .75} ${H - 30} ${W / 2} ${H - 14}T0 ${H - 16}V${ch}Z`;
  else plate = `M0 0H${W - ch}L${W} ${ch}V${plateBottom}H0Z`;
  p.push(`<path d="${plate}" fill="${ui.card_plate}" stroke="${ui.stat_tab}" stroke-width="3" stroke-linejoin="round"/>`);
  // 새김 홈(돌파 단계에 따라 1~2줄)
  for (let i = 0; i < rc.frame_groove_lines; i++) {
    const o = 7 + i * 4;
    p.push(`<path d="${kind === 'rite' ? `M${ch + o * .4} ${o}H${W - ch - o * .4}L${W - o} ${ch + o * .4}V${H - 26 - o}M${o} ${H - 26 - o}V${ch + o * .4}L${ch + o * .4} ${o}` : `M${o} ${o}H${W - ch - o * .4}L${W - o} ${ch + o * .4}V${plateBottom - o}H${o}Z`}" fill="none" stroke="${fac.primary}" stroke-opacity="${i ? .55 : .9}" stroke-width="${i ? 1.2 : 1.8}"/>`);
  }
  // 세력 띠(왼쪽)
  p.push(`<rect x="1.5" y="${kind === 'rite' ? ch : 1.5}" width="${C.spine_w_px}" height="${(kind === 'rite' ? H - 20 - ch : plateBottom - 3)}" fill="${fac.primary}"/>`);
  // 희귀도 면(깨진 모서리를 따라 띠)
  p.push(`<path d="M${W - ch - 12} 0H${W - ch}L${W} ${ch}V${ch + 12}Z" fill="${rar.facet}" stroke="${c.rarity_hint === "abyss" || c.rarity === "abyss" ? RAR.abyss.glow : ui.stat_tab}" stroke-width="2"/>`);
  if (rar.glow && rc.shimmer) p.push(`<path d="${plate}" fill="none" stroke="${RAR.abyss.glow}" stroke-width="3" opacity=".7"><animate attributeName="opacity" values=".25;.8;.25" dur="${RECUT[3].shimmer_period_ms / 1000}s" repeatCount="indefinite"/></path>`);
  if (rc.shimmer) p.push(`<path d="M4 ${plateBottom - 8}Q${W * .25} ${plateBottom - 16} ${W / 2} ${plateBottom - 8}T${W - 4} ${plateBottom - 8}" fill="none" stroke="${RAR.abyss.glow}" stroke-width="2.5" opacity=".85"/><path d="${plate}" fill="none" stroke="${RAR.abyss.glow}" stroke-width="2" opacity=".6"/>`);
  // 소금 새김: 결정 알갱이
  if (rc.salt_flecks) for (let i = 0; i < rc.salt_flecks; i++) { const x = [14, 30, 220, 236, 18, 232][i], y = [330, 320, 300, 318, 60, 70][i]; if (y < plateBottom - 6) p.push(`<rect x="${x}" y="${y}" width="8" height="8" transform="rotate(45 ${x + 4} ${y + 4})" fill="#FFFFFF" stroke="#8C9AA0" stroke-width="1.2"/>`); }
  // 그림 창
  const art = { x: C.art.x_px, y: C.art.y_px, w: C.art.w_px, h: C.art.h_px }; if (hand) art.h = 196;
  p.push(`<rect x="${art.x - 2}" y="${art.y - 2}" width="${art.w + 4}" height="${art.h + 4}" fill="${ui.stat_tab}"/>`);
  p.push(`<svg x="${art.x}" y="${art.y}" width="${art.w}" height="${art.h}" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" overflow="hidden">${inner(portraitSVG(c, { title: false }))}</svg>`);
  // 이름 띠
  const nb = hand ? { y: 222, h: 36, font: 24 } : { y: C.name_band.y_px, h: C.name_band.h_px, font: C.name_band.font_px };
  p.push(`<rect x="${C.spine_w_px + 2}" y="${nb.y}" width="${W - C.spine_w_px - 4}" height="${nb.h}" fill="${fac.primary}"/>`);
  const nm = c.name_ko || c.id;
  const nmFont = Math.min(nb.font, Math.floor((W - 70) / Math.max(4, nm.length)));
  if (!hand) p.push(`<text x="${W / 2}" y="${nb.y + nb.h / 2 + nmFont * .36}" text-anchor="middle" font-size="${nmFont}" font-weight="700" fill="${fac.ink}" ${FONT}>${esc(nm)}</text>`);
  p.push(`<g transform="translate(${W - 34} ${nb.y + nb.h / 2 - 11}) scale(.46)">${RARI[c.rarity || c.rarity_hint || 'sand']()}</g>`);
  // 키워드 아이콘 줄(그림 창 아래 가장자리에 걸침)
  const kws = cardKeywords(c); const ks = C.keyword_icons.size_px * (hand ? 1.5 : 1);
  kws.forEach((k, i) => { const x = C.spine_w_px + 10 + i * (ks + 4); /* 1-2: 왼쪽 정렬(레퍼런스 희귀도 보석 자리 회피) */ p.push(`<g transform="translate(${x} ${art.y + art.h - ks * .6}) scale(${ks / 48})"><circle cx="24" cy="24" r="23" fill="${ui.stat_tab}" stroke="${ui.card_plate}" stroke-width="3"/>${KWI[k](KW.find((q) => q.id === k).color)}</g>`); });
  if (!hand) {
    const typeKo = { answerer: '응답자', rite: '의식', brand: '인장' }[kind];
    p.push(`<text x="${W / 2}" y="${C.type_line.y_px + 11}" text-anchor="middle" font-size="${C.type_line.font_px}" fill="${ui.card_ink_dim}" ${FONT}>${typeKo} · ${esc(LINEAGE_KO[c.lineage] || fac.name_ko)}</text>`);
    const ft = fitText(c.concept_ko || '', kind);
    ft.lines.forEach((ln, i) => p.push(`<text x="${W / 2}" y="${C.text_box.y_px + 15 + i * ft.lh}" text-anchor="middle" font-size="${ft.font}" fill="${ui.card_ink}" ${FONT}>${boldKeywords(ln)}</text>`));
  }
  // 비용: 왼쪽 위 세로 심지 판(초 모양, 보석 아님)
  const cs = hand ? 1.6 : 1, cw = C.cost.w_px * cs, chh = C.cost.h_px * cs;
  p.push(`<g transform="translate(${C.cost.x_px} ${C.cost.y_px + 6})"><path d="M${cw / 2} -8Q${cw / 2 + 7} -1 ${cw / 2} 4Q${cw / 2 - 7} -1 ${cw / 2} -8Z" fill="${ui.wick_flame}" stroke="${ui.wick_ink}" stroke-width="1.5"/><rect width="${cw}" height="${chh}" rx="7" fill="${ui.wick_lit_bar}" stroke="${ui.wick_ink}" stroke-width="2.5"/><text x="${cw / 2}" y="${chh / 2 + C.cost.font_px * cs * .36}" text-anchor="middle" font-size="${C.cost.font_px * cs}" font-weight="800" fill="${ui.wick_ink}" ${FONT}>${st.cost}</text></g>`);
  // 스탯 판(응답자·인장): 아래 가운데 하나의 판, 왼쪽 공격·오른쪽 명줄(인장은 새김 수)
  if (kind !== 'rite') {
    const ts = hand ? 1.45 : 1, tw = C.stat_tab.w_px * ts, th = C.stat_tab.h_px * ts, tx = (W - tw) / 2, ty = H - th;
    const atkCol = st.base_atk != null && st.atk > st.base_atk ? ST.buff : st.base_atk != null && st.atk < st.base_atk ? ST.debuff : ui.salt_white;
    const hpCol = st.damaged ? ST.damage : st.base_hp != null && st.hp > st.base_hp ? ST.buff : ui.salt_white;
    p.push(`<g transform="translate(${tx} ${ty})"><path d="M8 0H${tw - 8}L${tw} ${th / 2}L${tw - 8} ${th}H8L0 ${th / 2}Z" fill="${ui.stat_tab}" stroke="${fac.primary}" stroke-width="2.5"/><path d="M${tw / 2 + 6} 4L${tw / 2 - 6} ${th - 4}" stroke="${fac.primary}" stroke-width="2"/>
<path d="M${tw * .1} ${th * .28}L${tw * .16} ${th * .5}L${tw * .1} ${th * .72}" fill="none" stroke="${ui.salt_dim}" stroke-width="2"/>
<path d="M${tw * .9} ${th * .25}V${th * .75}M${tw * .86} ${th * .25}V${th * .75}" stroke="${ST.damage}" stroke-opacity=".8" stroke-width="1.6"/>
<text x="${tw * .3}" y="${th / 2 + C.stat_tab.font_px * ts * .36}" text-anchor="middle" font-size="${C.stat_tab.font_px * ts}" font-weight="800" fill="${atkCol}" ${FONT}>${st.atk}</text>
<text x="${tw * .7}" y="${th / 2 + C.stat_tab.font_px * ts * .36}" text-anchor="middle" font-size="${C.stat_tab.font_px * ts}" font-weight="800" fill="${hpCol}" ${FONT}>${st.hp}</text>
${Array.from({ length: rc.tab_notches }, (_, i) => `<rect x="${tw / 2 - 14 + i * 10}" y="${th - 6}" width="6" height="3" fill="${RAR.abyss.glow}"/>`).join('')}</g>`);
  }
  if (kind === 'rite') p.push(`<path d="M30 ${H - 34}Q${W / 2} ${H - 52} ${W - 30} ${H - 34}" fill="none" stroke="${fac.primary}" stroke-width="2" opacity=".6"/>`);
  return svg(W, H, p.join(''), `${nm} (${kind})`);
}

/** 보드 위 응답자(축소): 이름·글 없음. 그림 + 공격/명줄 + 키워드 상태. 100x130 좌표, 칸 크기로 그대로 줄임 */
export function tokenSVG(c, opts = {}) {
  const fac = factions[c.owner] || factions.neutral;
  const st = opts.stats || (c.cost != null ? { cost: c.cost, atk: c.attack, hp: c.health } : placeholderStats(c)), rc = RECUT[opts.recut || 0], s = opts.state || {};
  const W = 100, H = 130, ch = 14, p = [];
  const kws = s.keywords || cardKeywords(c);
  const plate = `M0 0H${W - ch}L${W} ${ch}V${H - 10}H0Z`;
  if (kws.includes('breakwater')) p.push(`<path d="M-4 30H${W + 4}V${H - 4}H-4Z" fill="${KW[2].color}" stroke="${ui.stat_tab}" stroke-width="2"/><path d="M-4 60H${W + 4}M-4 90H${W + 4}M20 30V60M60 30V60M40 60V90M80 60V90" stroke="${ui.stat_tab}" stroke-width="1.5"/>`);
  p.push(`<path d="${plate}" fill="${fac.deep}" stroke="${s.selected ? ui.focus : ui.stat_tab}" stroke-width="${s.selected ? 4 : 2.5}"/>`);
  p.push(`<svg x="5" y="5" width="${W - 10}" height="86" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" overflow="hidden">${inner(portraitSVG(c, { title: false }))}</svg>`);
  p.push(`<rect x="0" y="0" width="5" height="${H - 10}" fill="${fac.primary}"/>`);
  p.push(`<path d="M${W - ch - 8} 0H${W - ch}L${W} ${ch}V${ch + 8}Z" fill="${RAR[c.rarity || c.rarity_hint || 'sand'].fill}"/>`);
  if (kws.includes('seamist')) p.push(`<rect x="3" y="3" width="${W - 6}" height="88" fill="${KW[4].color}" opacity=".45"/><path d="M8 30H50M58 30H92M14 52H70M78 52H88M8 74H40M50 74H92" stroke="#E8F0F3" stroke-width="5" stroke-linecap="round" opacity=".8"/>`);
  if (kws.includes('saltskin')) p.push(`<path d="${plate}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="10 4"/>`);
  if (s.anchored) p.push(`<path d="M10 20L90 80M90 20L10 80" stroke="${KW[10].color}" stroke-width="5" opacity=".85"/>`);
  // 공격 가능 여부: 왼쪽 위 작은 심지(켜짐/꺼짐)
  p.push(`<g transform="translate(6 6) scale(.42)">${inner(statIcons[s.ready ? 'icon-ready' : 'icon-asleep']())}</g>`);
  // 키워드 표시(오른쪽 위 세로, 최대 3)
  kws.filter((k) => !['breakwater', 'seamist', 'saltskin', 'first_breath', 'salvage'].includes(k)).slice(0, 3).forEach((k, i) => p.push(`<g transform="translate(${W - 26} ${20 + i * 24}) scale(.46)"><circle cx="24" cy="24" r="23" fill="${ui.stat_tab}"/>${KWI[k](KW.find((q) => q.id === k).color)}</g>`));
  if (s.brine) for (let i = 0; i < s.brine; i++) p.push(`<rect x="${10 + i * 11}" y="80" width="7" height="7" transform="rotate(45 ${13.5 + i * 11} 83.5)" fill="${KW[17].color}" stroke="${ui.stat_tab}"/>`);
  // 스탯 줄: 한 판(왼쪽 공격·오른쪽 명줄)
  const atkCol = s.atkBuff ? ST.buff : s.atkDebuff ? ST.debuff : ui.salt_white, hpCol = s.damaged ? ST.damage : s.hpBuff ? ST.buff : ui.salt_white;
  p.push(`<path d="M6 ${H - 38}H${W - 6}L${W} ${H - 19}L${W - 6} ${H}H6L0 ${H - 19}Z" fill="${ui.stat_tab}" stroke="${fac.primary}" stroke-width="2.5"/><path d="M${W / 2 + 5} ${H - 35}L${W / 2 - 5} ${H - 3}" stroke="${fac.primary}" stroke-width="2"/>`);
  p.push(`<text x="${W * .27}" y="${H - 9}" text-anchor="middle" font-size="27" font-weight="800" fill="${atkCol}" ${FONT}>${st.atk}</text><text x="${W * .73}" y="${H - 9}" text-anchor="middle" font-size="27" font-weight="800" fill="${hpCol}" ${FONT}>${st.hp}</text>`);
  for (let i = 0; i < rc.tab_notches; i++) p.push(`<rect x="${W / 2 - 13 + i * 9}" y="${H - 5}" width="6" height="3" fill="${RAR.abyss.glow}"/>`);
  return svg(W, H, p.join(''), c.name_ko);
}

// 카드 뒷면(상대 손패·영장첩)
export function cardBackSVG() {
  return svg(250, 350, `<path d="M0 0H216L250 34V350H0Z" fill="#1A2A33" stroke="${ui.stat_tab}" stroke-width="3"/><path d="M10 10H212L240 38V340H10Z" fill="none" stroke="${ui.board_ring}" stroke-width="2"/><circle cx="125" cy="175" r="70" fill="none" stroke="${ui.card_plate_shade}" stroke-width="5"/><circle cx="125" cy="175" r="52" fill="none" stroke="${ui.board_ring}" stroke-width="2"/>${Array.from({ length: 7 }, (_, i) => `<rect x="${92 + i * 10}" y="150" width="6" height="40" rx="2" fill="${ui.wick_lit_bar}" opacity="${0.4 + i * .08}"/>`).join('')}<path d="M40 290Q70 276 100 290T160 290T220 290" fill="none" stroke="#4DE0FF" stroke-opacity=".5" stroke-width="3"/>`, '영장 뒷면');
}

// 앱 아이콘 512: 흑조 위 기울어진 소금유리 영장 + 켜진 심지
export function appIconSVG() {
  return svg(512, 512, `<rect width="512" height="512" rx="96" fill="${ui.bg_abyss}"/>
<path d="M0 380Q90 340 180 380T360 380T512 370V512H0Z" fill="#05090D"/><path d="M0 380Q90 340 180 380T360 380T512 370" fill="none" stroke="#4DE0FF" stroke-width="8" stroke-opacity=".8"/>
<g transform="rotate(-10 256 240)"><path d="M150 90H330L376 136V400H150Z" fill="${ui.card_plate}" stroke="${ui.stat_tab}" stroke-width="10" stroke-linejoin="round"/><path d="M314 90H330L376 136V152Z" fill="${RAR.coral.fill}"/><rect x="150" y="90" width="22" height="310" fill="${factions.h_choir.primary}"/>
<circle cx="268" cy="250" r="64" fill="none" stroke="${ui.stat_tab}" stroke-width="10"/><path d="M220 250H316" stroke="${ui.stat_tab}" stroke-width="8"/></g>
<rect x="232" y="160" width="40" height="110" rx="8" fill="${ui.wick_lit_bar}" stroke="${ui.wick_ink}" stroke-width="6" transform="rotate(-10 256 240)"/>
<path d="M238 92Q272 128 258 150A20 20 0 0 1 222 146Q214 120 238 92Z" fill="${ui.wick_flame}"/>`, '썰물 영장 앱 아이콘');
}

export const keywordIds = KW.map((k) => k.id);
