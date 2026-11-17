#!/usr/bin/env node
// rhythm-01 웹 빌드 데이터 생성기: projects/rhythm-01 기획 데이터 → games/rhythm-01/data/
//
//   node projects/rhythm-01/tools/build-web-data.mjs
//
// 만드는 것
//   data/balance.json, data/levels/*.json, data/palette.json  (복사, 수정 없음)
//   data/strings.json   10-lore.md 7절 표(KR/EN)에서 키 64개 추출
//   data/sound.json, data/music.json  assets/sound.json(art 원본, round-2 R7)을 나눠 복사.
//                       먼저 assets/sound-check.mjs 실행, music.calib_check_hz 가 숫자가 아니면 빌드 중단
//   data/art.json       30-art.md 4~10절의 크기·위치 비율을 옮긴 것 (아래 ART)
//   data/svg/*.svg      assets/ SVG 복사 + 목업 6·7에서 메뉴 아이콘 추출(배경 네모 제거, 버튼 배경은 CSS)
//   index.html          불러오기 화면 글(10-lore loading·load_error·btn_retry ko/en)과 첫 테마 색을 표시 사이에 넣음 (R8-5)
//   js/judge.js         tools/sim/judge.mjs 복사 (판정 기준 구현을 그대로 씀)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJ, '../..');
const GAME = join(ROOT, 'games/rhythm-01');
const DATA = join(GAME, 'data');
const rd = (p) => readFileSync(join(PROJ, p), 'utf8');
const wjson = (p, o) => writeFileSync(join(DATA, p), JSON.stringify(o, null, 1) + '\n');
for (const d of [DATA, join(DATA, 'levels'), join(DATA, 'svg'), join(DATA, 'svg/cards'), join(GAME, 'js')]) mkdirSync(d, { recursive: true });

// 1) 복사
const bal = JSON.parse(rd('balance.json'));
copyFileSync(join(PROJ, 'balance.json'), join(DATA, 'balance.json'));
const levelFiles = bal.levels.map((p) => p.split('/').pop());
for (const f of levelFiles) copyFileSync(join(PROJ, 'levels', f), join(DATA, 'levels', f));
copyFileSync(join(PROJ, 'assets/palette.json'), join(DATA, 'palette.json'));
copyFileSync(join(PROJ, 'tools/sim/judge.mjs'), join(GAME, 'js/judge.js'));

// 2) 텍스트 키 (10-lore.md 7절)
const STR = {};
{
  const md = rd('10-lore.md');
  const sec = md.slice(md.indexOf('## 7. 텍스트 키 표'), md.indexOf('## 8.'));
  const ko = {}, en = {};
  let kr = -1, ec = -1;
  for (const line of sec.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells[0] === '키') { kr = cells.indexOf('KR'); ec = cells.indexOf('EN'); continue; }
    if (/^-+$/.test(cells[0]) || kr < 0) continue;
    const key = cells[0].replace(/\s*★\s*$/, '');
    if (!/^[a-z0-9_]+$/.test(key)) continue;
    const clean = (s) => s.replace(/\s*\(\d+(자|단어)\)\s*$/, '').trim();
    ko[key] = clean(cells[kr]);
    en[key] = clean(cells[ec]);
  }
  const n = Object.keys(ko).length;
  if (n !== 64) throw new Error(`텍스트 키 ${n}개 (64개여야 함)`);
  wjson('strings.json', { _source: '10-lore.md 7절 (build-web-data.mjs 생성)', ko, en });
  STR.ko = ko; STR.en = en;
  console.log(`strings.json: 키 ${n}개`);
}

// 3) 소리·음악 (원본 assets/sound.json, round-2 R7. 30-art 12절 표는 사람용 요약이라 파싱하지 않음)
{
  const chk = spawnSync(process.execPath, [join(PROJ, 'assets/sound-check.mjs')], { encoding: 'utf8' });
  if (chk.status !== 0) throw new Error('assets/sound-check.mjs 실패:\n' + chk.stdout + chk.stderr);
  const S = JSON.parse(rd('assets/sound.json'));
  const M = S.music;
  if (typeof M.calib_check_hz !== 'number' || !Number.isFinite(M.calib_check_hz) || M.calib_check_hz <= 0) throw new Error(`sound.json music.calib_check_hz 가 숫자가 아님: ${M.calib_check_hz}`);
  for (const k of ['master', 'noise_buffer_s', 'sounds', 'parts']) if (S[k] == null) throw new Error(`sound.json ${k} 없음`);
  if (!M.melody || !M.levels) throw new Error('sound.json music.melody / music.levels 없음');
  for (const p of bal.levels) {
    const id = JSON.parse(rd(p)).id, lm = M.levels[id];
    if (!lm || !Array.isArray(lm.motif) || !lm.motif.length) throw new Error(`sound.json music.levels.${id}.motif 없음`);
  }
  wjson('sound.json', { _source: 'assets/sound.json (build-web-data.mjs 복사)', master: S.master, noise_buffer_s: S.noise_buffer_s, sounds: S.sounds, parts: S.parts });
  wjson('music.json', { _source: 'assets/sound.json music (build-web-data.mjs 복사). BPM 은 levels 파일이 기준', levels: M.levels, calib_check_hz: M.calib_check_hz, melody: M.melody });
  console.log(`sound.json·music.json: assets/sound.json 복사 (sound-check OK, calib_check_hz ${M.calib_check_hz})`);
}

// 5) 화면·오브젝트 규격 (30-art.md 4-1·4-3·4-4·5·7·8·10절, 단위 R 배수 또는 px)
const ART = {
  _source: '30-art.md 4~10절 (build-web-data.mjs 에 옮김). R = 궤도 반지름',
  orbit: { portrait: { rW: 0.4, rH: 0.26, cy: 0.45 }, landscape: { rH: 0.33, rW: 0.3, cy: 0.55 } },
  band: { min: 10, k: 0.1, edge: 1.5 },
  ball: { min: 14, k: 0.11, outline: [2.5, 0.16], hi: 0.28, tailDeg: [9, 18, 27], tailR: [0.7, 0.5, 0.35], hollowW: 0.22 },
  star: { min: 18, k: 0.15, inner: 0.5, outline: [2.5, 0.14], showW: 0.16, grow: [0.4, 1] },
  drum: { k: 0.42, innerK: 0.32, outline: 3, countDots: 0.12 },
  topMark: { w: [8, 0.07], h: [14, 0.13], at: 0.76 },
  ticks: { at: 0.78, beat: [6, 0.055], half: [2.5, 0.02] },
  // 5-4 (round 2): 작아짐 구간·시각은 balance teacher(malletSchedule), 모양은 ease-in 축소(투명도 없음), 점선 빈칸 × 같은 배율
  mallet: { head: [0.2, 0.11], stick: [0.06, 0.27], tiltDeg: 30, off: [0.05, 0.07], grow: [0.6, 1], growBeats: 0.25, hitDeg: 6, hitMs: 80, shrinkEase: 'in' },
  showDash: { width: 0.35, segs: 32, on: 0.45 },
  hud: { barLeft: 16, barTopP: 24, barTopL: 20, barH: 10, gapToPause: 12, bestR: 6.5, dotsGap: 14, dotR: 4.5, dotStep: 14, dotsMax: 10, squareEvery: 5, flag: 14, pause: 48, margin: 12 },
  thumb: { pad: 12, minTop: 0.7, bottom: 16, side: 16, fxK: 2.05 },
  // 4-4 (round 2): 칸 = max(min, k·R), 세로 = 받침 가운데(받침 높이 − portraitPad 이하), 가로 = (cx + at[0]·R, cy + at[1]·R) 화면 가장자리 edge 안
  hand: { min: 64, k: 0.45, portraitPad: 16, landscapeAt: [1.45, 0.65], edge: 16, pressPx: 4, pressRef: 64, growBeats: 0.25, tutGap: 8 },
  // 4-6: 가로 타이틀 힌트 = 궤도 오른쪽 영역 [cx + R + gap, W − right], 세로 가운데 cy, 손가락 칸 min(handMax, 영역 폭 − handPad), 글은 아래 textGap
  titleHint: { gap: 24, right: 16, handMax: 64, handPad: 16, textGap: 8 },
  fx: {
    perfect: { scale: 1.45, rays: 8, rayGap: 4, rayLen: 0.6, rayW: [3, 0.2], ms: 220, ripple: 1.18 },
    good: { scale: 1.25, rays: 4, rayRot: 45, rayGap: 4, rayLen: 0.4, rayW: [3, 0.2], ms: 180, ripple: 1.12 },
    pass: { scale: 0.35, ring: 0.9, ms: 150, ripple: 1.06 },
    miss: { rotDeg: 20, dropR: 0.15, ms: 300 },
    stray: { ripple: 1.03, ms: 100 },
    showRing: { ring: 0.9, ms: 150 },
  },
  fail: { pieceShrinkS: 0.1, hollowShrinkS: 0.08 },
  clear: { drumY: 0.64, drumGap: 0.25, drumR: 0.1, drumGrow: [0.6, 1], btn: 64, btnGap: 16 },
  // 5-6 레벨 카드(round 2 줄 흐름), 9절 그림 카드 가로판 720×336, 9-1 세로판 234×896 배율 min((W−32)/234, (H−32−safe)/896, 1.4)
  card: {
    w: 120, h: 132, gap: 12, border: 3, practiceBtn: 48, minW: 100, minH: 104,
    rows: { orbit: 28, orbitMin: 16, dots1: 6, dots2: 15, grade: 12, name: 14, gap: 4, reserve: 12 },
    orbitStroke: 3, dotR: 3, dotStep: 9, dotsPerRow: 5, gradeR: 6, gradeStep: 14,
    progress: { h: 4, w: 64, dotR: 4, dotOutline: 1.2, flag: 12, flagGap: 4 },
    landscapeMaxW: 0.8, img: { w: 720, h: 336 }, portrait: { w: 234, h: 896, margin: 32, maxScale: 1.4 },
  },
  // 10-1 기록 지우기 확인 창 (round 2)
  confirm: { maxW: 328, side: 16, radius: 20, border: 1.5, icon: 48, btnH: 64, btnGap: 16 },
  calib: { refR: 170, drumR: 71, dotsR: 112, dotR: 11, dots: 8, checkGrowS: 0.25, doneHoldS: 1 },
  guardian: { ringR: 31, ringW: 5, badgeD: 22 },
  menuBtn: 48,
  row: { h: 72 },
};
wjson('art.json', ART);

// 6) SVG: assets 복사 + 메뉴 아이콘 추출
{
  const A = join(PROJ, 'assets');
  const stripBg = (s) => s.replace(/<rect x="0" y="0" width="48" height="48" rx="12"[^>]*\/>/, '').replace(/<!--[\s\S]*?-->\n?/g, '');
  for (const f of readdirSync(A)) {
    if (!f.endsWith('.svg') || f.startsWith('mockup')) continue;
    writeFileSync(join(DATA, 'svg', f), stripBg(readFileSync(join(A, f), 'utf8')));
  }
  for (const f of readdirSync(join(A, 'cards'))) copyFileSync(join(A, 'cards', f), join(DATA, 'svg/cards', f));
  // 목업 6: 64x64 아이콘 칸(배경 rect 다음 요소들 ~ text 전까지)
  const m6 = readFileSync(join(A, 'mockup-result-and-icons.svg'), 'utf8').replace(/></g, '>\n<').split('\n');
  const grid = { next: [418, 38], retry: [598, 38], levels: [778, 38], pause: [418, 168], play: [598, 168], practice: [778, 168], music: [418, 298], sfx: [598, 298], calib: [778, 298], skip: [418, 428], lock: [598, 428], music_off: [778, 428] };
  for (const [name, [x, y]] of Object.entries(grid)) {
    const i = m6.findIndex((l) => l.startsWith(`<rect x="${x}" y="${y}" width="64" height="64"`));
    if (i < 0) throw new Error(`아이콘 ${name} 못 찾음`);
    const body = [];
    for (let k = i + 1; k < m6.length && !m6[k].startsWith('<text'); k++) body.push(m6[k]);
    writeFileSync(join(DATA, 'svg', `icon-${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} 64 64" width="64" height="64">${body.join('')}</svg>\n`);
  }
  // 목업 7 ③: 기록 지우기(네모 안 ×), 모래시계 표지
  const m7 = readFileSync(join(A, 'mockup-guardian-flow.svg'), 'utf8').replace(/></g, '>\n<').split('\n');
  const ri = m7.findIndex((l) => l.startsWith('<g transform="translate(28,354)'));
  const reset = [];
  for (let k = ri + 1; k < m7.length && m7[k] !== '</g>'; k++) reset.push(m7[k]);
  writeFileSync(join(DATA, 'svg', 'icon-reset.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">${reset.join('')}</svg>\n`);
  const hi = m7.findIndex((l) => l.startsWith('<g transform="translate(49.6,7.6) scale(0.35)">'));
  const hg = [m7[hi - 1].replace(/cx="58" cy="16"/, 'cx="11" cy="11"').replace(/r="11"/, 'r="10"')];
  hg.push('<g transform="translate(2.6,2.6) scale(0.35)">');
  for (let k = hi + 1; k < m7.length && m7[k] !== '</g>'; k++) hg.push(m7[k]);
  hg.push('</g>');
  writeFileSync(join(DATA, 'svg', 'badge-hourglass.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" width="22" height="22">${hg.join('')}</svg>\n`);
  // 10-1 확인 창 취소 = 크림 면 위 왼쪽 화살표(outline 색): 다음 화살표의 hud 색을 outline 으로 바꾼 사본 (좌우 반전은 CSS)
  const pal = JSON.parse(rd('assets/palette.json'));
  const nx = readFileSync(join(DATA, 'svg', 'icon-next.svg'), 'utf8');
  writeFileSync(join(DATA, 'svg', 'icon-next-ink.svg'), nx.split(pal.common.hud).join(pal.common.outline));
  console.log('svg: assets 복사, 아이콘 15개 추출');
}

// 7) index.html: 불러오기 화면은 strings.json 을 읽기 전이라 10-lore 글과 첫 테마 색을 미리 넣음 (R8-5, D12 보완)
{
  const pal = JSON.parse(rd('assets/palette.json'));
  const lv1 = JSON.parse(rd(bal.levels[0]));
  const t = pal.themes[lv1.theme_id], C = pal.common;
  if (!t) throw new Error(`palette 테마 ${lv1.theme_id} 없음`);
  const keys = ['loading', 'load_error', 'btn_retry'];
  const txt = { ko: {}, en: {} };
  for (const l of ['ko', 'en']) for (const k of keys) { if (!STR[l][k]) throw new Error(`10-lore 키 ${k} 없음`); txt[l][k] = STR[l][k]; }
  const css = `:root{--bg:${t.bg};--bgFar:${t.bgFar};--tint:${t.cardTint};--track1:${t.track1};--edge:${C.trackEdge};--hud:${C.hud};--ink:${C.outline};--ball:${C.ball}}`;
  const block = `<!--boot:start (build-web-data.mjs 생성)-->\n<style id="bootStyle">${css}</style>\n<script id="bootText" type="application/json">${JSON.stringify(txt).replace(/</g, '\\u003c')}</script>\n<!--boot:end-->`;
  const ip = join(GAME, 'index.html');
  const html = readFileSync(ip, 'utf8');
  const re = /<!--boot:start[\s\S]*?<!--boot:end-->/;
  if (!re.test(html)) throw new Error('index.html 에 <!--boot:start--> 표시가 없음');
  writeFileSync(ip, html.replace(re, block));
  console.log('index.html: 불러오기 글·첫 테마 색 넣음');
}

wjson('manifest.json',{ levels: levelFiles.map((f) => 'levels/' + f), built: 'build-web-data.mjs' });
console.log('완료 →', DATA);
