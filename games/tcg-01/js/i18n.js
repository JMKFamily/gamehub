// 글: 10-lore 8절 키 표(data/strings.json) + 개발 임시 키(data/strings-extra.json). 코드에 화면 글을 쓰지 않는다.
import { D } from './data.js';

export const L = { lang: 'ko', missing: new Set() };
export function setLang(l) { L.lang = l === 'en' ? 'en' : 'ko'; document.documentElement.lang = L.lang; }
export function t(key, vars) {
  const tab = D.strings[L.lang];
  let s = tab[key];
  if (s == null) { s = D.strings.ko[key]; if (s == null) { L.missing.add(key); return key; } }
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v));
  return s;
}
export const has = (key) => key in D.strings.ko;
export const cardName = (c) => (c.spare ? t('spare_wick_name') : (L.lang === 'en' ? c.name_en : c.name_ko) || c.name_ko || c.id);
// 카드 글: lore concept_ko(원문). 영어 글은 lore에 아직 없어 키워드 이름 + 풍미글로 대신(DEV_NOTES D3)
export function cardText(c) {
  if (c.spare) return t('spare_wick_desc');
  if (L.lang === 'en') return [(c.kw_ui || []).map((k) => t('kwname_' + k)).join(', '), c.flavor_en ? '“' + c.flavor_en + '”' : ''].filter(Boolean).join('\n');
  return c.text_ko || '';
}
export const kindKey = (k) => ({ minion: 'card_type_answerer', spell: 'card_type_rite', weapon: 'card_type_brand' }[k] || 'card_type_answerer');
