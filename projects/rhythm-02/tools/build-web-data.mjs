#!/usr/bin/env node
// rhythm-02 웹 빌드 데이터 생성기: projects/rhythm-02 기획 데이터 → games/rhythm-02/data/ (+ js/judge.js, js/music.js, index.html 부트 글)
//
//   node projects/rhythm-02/tools/build-web-data.mjs
//
// 만드는 것 (모두 원본 JSON·SVG에서 복사·변환, 수치·문구·색은 손으로 넣지 않음)
//   data/balance.json, data/levels/*.json, data/palette.json, data/layout.json, data/sound.json, data/strings.json  복사
//   data/icons/*.svg, data/cards/*.svg   assets 복사(주석 제거)
//   data/levelcards/*.svg               tools/art/cards.mjs levelCard·miniCloud·flag 로 레벨 카드 그림·등급 칸·깃발 생성(art 함수 그대로)
//   js/judge.js                         tools/sim/judge.mjs 그대로 복사(빌드 판정 = 시뮬레이터 판정)
//   js/music.js                         tools/art/music.mjs 그대로 복사(곡 음 시작 규칙)
//   index.html                          불러오기 화면 글(strings.json loading·load_error·load_error_detail·btn_retry)과 첫 테마 색
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJ, '../..');
const GAME = join(ROOT, 'games/rhythm-02');
const DATA = join(GAME, 'data');
const rd = (p) => readFileSync(join(PROJ, p), 'utf8');
const rj = (p) => JSON.parse(rd(p));
const wjson = (p, o) => writeFileSync(join(DATA, p), JSON.stringify(o, null, 1) + '\n');
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->\n?/g, '');

if (existsSync(DATA)) rmSync(DATA, { recursive: true, force: true });
for (const d of [DATA, join(DATA, 'levels'), join(DATA, 'icons'), join(DATA, 'cards'), join(DATA, 'levelcards'), join(GAME, 'js')]) mkdirSync(d, { recursive: true });

// 1) JSON 복사
const bal = rj('balance.json');
copyFileSync(join(PROJ, 'balance.json'), join(DATA, 'balance.json'));
const levelFiles = bal.levels.map((p) => p.split('/').pop());
const levels = bal.levels.map((p) => rj(p));
for (const f of levelFiles) copyFileSync(join(PROJ, 'levels', f), join(DATA, 'levels', f));
for (const f of ['palette.json', 'layout.json', 'sound.json']) copyFileSync(join(PROJ, 'assets', f), join(DATA, f));
copyFileSync(join(PROJ, 'strings.json'), join(DATA, 'strings.json'));
const STR = rj('strings.json');
const pal = rj('assets/palette.json');
const snd = rj('assets/sound.json');

// 검사: 레벨마다 테마·문구·곡·카드가 있는지
for (const lv of levels) {
  if (!pal.themes[lv.theme_id]) throw new Error(`palette 테마 ${lv.theme_id} 없음`);
  if (!STR[lv.name_key]) throw new Error(`strings ${lv.name_key} 없음`);
  if (!snd.music.levels[lv.id]) throw new Error(`sound.json music.levels.${lv.id} 없음`);
  if (lv.card && !existsSync(join(PROJ, 'assets/cards', `${lv.card.id}.svg`))) throw new Error(`카드 ${lv.card.id} 없음`);
  if (lv.card && !STR[lv.card.id]) throw new Error(`strings ${lv.card.id} 없음`);
}

// 2) 판정·곡 모듈 그대로 복사 (빌드 판정 = 시뮬레이터 판정)
copyFileSync(join(PROJ, 'tools/sim/judge.mjs'), join(GAME, 'js/judge.js'));
copyFileSync(join(PROJ, 'tools/art/music.mjs'), join(GAME, 'js/music.js'));

// 3) SVG: 아이콘·카드 복사
const icons = [];
for (const f of readdirSync(join(PROJ, 'assets/icons'))) {
  if (!f.endsWith('.svg')) continue;
  writeFileSync(join(DATA, 'icons', f), stripComments(readFileSync(join(PROJ, 'assets/icons', f), 'utf8')));
  icons.push(f.replace(/^icon-|\.svg$/g, ''));
}
for (const f of readdirSync(join(PROJ, 'assets/cards'))) if (f.endsWith('.svg')) writeFileSync(join(DATA, 'cards', f), stripComments(readFileSync(join(PROJ, 'assets/cards', f), 'utf8')));

// 4) 레벨 카드 그림(art 함수 그대로: cards.mjs levelCard / miniCloud / flag). 진행도 채움·점·등급 채움은 빌드가 같은 좌표로 겹쳐 그림.
{
  const A = await import(pathToFileURL(join(PROJ, 'tools/art/cards.mjs')).href);
  const W = 108, H = 112; // 30-art 11-1 카드 108×112
  const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>\n`;
  for (const lv of levels) {
    writeFileSync(join(DATA, 'levelcards', `level${lv.id}.svg`), svg(`0 0 ${W} ${H}`, A.levelCard(0, 0, W, H, lv.id, { best: 0, grade: 0 })));
    writeFileSync(join(DATA, 'levelcards', `grade-fill-${lv.id}.svg`), svg('0 0 24 18', A.miniCloud(12, 9, 18, pal.themes[lv.theme_id].accent)));
  }
  writeFileSync(join(DATA, 'levelcards', 'locked.svg'), svg(`0 0 ${W} ${H}`, A.levelCard(0, 0, W, H, '01', { locked: true })));
  writeFileSync(join(DATA, 'levelcards', 'grade-empty.svg'), svg('0 0 24 18', A.miniCloud(12, 9, 18, 'none', true)));
  writeFileSync(join(DATA, 'levelcards', 'flag.svg'), svg('0 0 16 20', A.flag(2, 19, 18)));
  // 카드 안 진행도 막대 자리(levelCard 와 같은 식: bx = x+10, bw = w-20, by = y+h-18, 높이 10)
  wjson('levelcards/geom.json', { w: W, h: H, bar: { x: 10, y: H - 18, w: W - 20, h: 10 }, dotR: 6 });
}

// 5) index.html 부트 글·색 (strings.json 을 읽기 전 화면)
{
  const lv1 = levels[0];
  const t = pal.themes[lv1.theme_id], C = pal.common;
  const keys = ['loading', 'load_error', 'load_error_detail', 'btn_retry', 'title'];
  const txt = { ko: {}, en: {} };
  for (const l of ['ko', 'en']) for (const k of keys) { if (!STR[k]) throw new Error(`strings 키 ${k} 없음`); txt[l][k] = STR[k][l]; }
  const css = `:root{--bg:${t.bg1};--floor:${t.floor};--ink:${C.ink};--ball:${C.ball};--drum:${C.drumBody};--skin:${C.skin};--track:${C.hudTrack};--card:${t.cardBg};--accent:${t.accent}}`;
  const block = `<!--boot:start (build-web-data.mjs 생성)-->\n<style id="bootStyle">${css}</style>\n<script id="bootText" type="application/json">${JSON.stringify(txt).replace(/</g, '\\u003c')}</script>\n<!--boot:end-->`;
  const ip = join(GAME, 'index.html');
  const html = readFileSync(ip, 'utf8');
  const re = /<!--boot:start[\s\S]*?<!--boot:end-->/;
  if (!re.test(html)) throw new Error('index.html 에 <!--boot:start--> 표시가 없음');
  writeFileSync(ip, html.replace(re, () => block));
}

wjson('manifest.json', { levels: levelFiles.map((f) => 'levels/' + f), icons, built: 'projects/rhythm-02/tools/build-web-data.mjs' });
console.log(`완료 → ${DATA} (레벨 ${levels.length}, 아이콘 ${icons.length}, 카드 ${readdirSync(join(DATA, 'cards')).length})`);
