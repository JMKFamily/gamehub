#!/usr/bin/env node
// rhythm-01 웹 빌드 데이터 생성기: projects/rhythm-01 기획 데이터 → games/rhythm-01/data/
//
//   node projects/rhythm-01/tools/build-web-data.mjs
//
// 만드는 것
//   data/balance.json, data/levels/*.json, data/palette.json  (복사, 수정 없음)
//   data/strings.json   10-lore.md 7절 표(KR/EN)에서 키 64개 추출
//   data/music.json     30-art.md 12-5 표(근음·방울 Hz·음계·멜로디 악기) 추출
//   data/sound.json     30-art.md 12-4 합성 파라미터 표를 옮긴 것 (아래 SOUND, 표 행마다 주석)
//   data/art.json       30-art.md 4~8·10절의 크기·위치 비율을 옮긴 것 (아래 ART)
//   data/svg/*.svg      assets/ SVG 복사 + 목업 6·7에서 메뉴 아이콘 추출(배경 네모 제거, 버튼 배경은 CSS)
//   js/judge.js         tools/sim/judge.mjs 복사 (판정 기준 구현을 그대로 씀)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJ, '../..');
const GAME = join(ROOT, 'games/rhythm-01');
const DATA = join(GAME, 'data');
const rd = (p) => readFileSync(join(PROJ, p), 'utf8');
const wjson = (p, o) => writeFileSync(join(DATA, p), JSON.stringify(o, null, 1) + '\n');
for (const d of [DATA, join(DATA, 'levels'), join(DATA, 'svg'), join(DATA, 'svg/cards'), join(GAME, 'js')]) mkdirSync(d, { recursive: true });

// 1) 복사
const bal = JSON.parse(rd('balance.json'));
wjson('balance.json', bal);
const levelFiles = bal.levels.map((p) => p.split('/').pop());
for (const f of levelFiles) copyFileSync(join(PROJ, 'levels', f), join(DATA, 'levels', f));
copyFileSync(join(PROJ, 'assets/palette.json'), join(DATA, 'palette.json'));
copyFileSync(join(PROJ, 'tools/sim/judge.mjs'), join(GAME, 'js/judge.js'));

// 2) 텍스트 키 (10-lore.md 7절)
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
  console.log(`strings.json: 키 ${n}개`);
}

// 3) 음악 (30-art.md 12-5)
{
  const md = rd('30-art.md');
  const sec = md.slice(md.indexOf('### 12-5.'), md.indexOf('### 12-6.'));
  // 음계 이름 → 반음 간격 (음악 이론 상수)
  const SCALES = { '장조 5음': { steps: [0, 2, 4, 7, 9], minor: false }, '단조 5음': { steps: [0, 3, 5, 7, 10], minor: true }, '도리안': { steps: [0, 2, 3, 5, 7, 9, 10], minor: true } };
  const levels = {};
  for (const line of sec.split(/\r?\n/)) {
    const c = line.split('|').slice(1, -1).map((s) => s.trim());
    if (!/^\d+$/.test(c[0] || '')) continue;
    const id = c[0].padStart(2, '0');
    const sc = Object.keys(SCALES).find((k) => c[2].includes(k));
    if (!sc) throw new Error(`12-5 레벨 ${id}: 음계 해석 실패 ${c[2]}`);
    levels[id] = { key: c[2], root3: +c[3], fCl: +c[4], fCh: +c[5], melody: c[6].split('+').map((s) => s.trim()), scale: SCALES[sc].steps, minor: SCALES[sc].minor };
  }
  if (Object.keys(levels).length !== 10) throw new Error('12-5 표 레벨 10개가 아님');
  const calibRow = sec.split(/\r?\n/).find((l) => l.includes('보정 화면'));
  const calibCheckHz = +calibRow.split('|')[5].trim();
  wjson('music.json', {
    _source: '30-art.md 12-5 (build-web-data.mjs 생성). BPM 은 levels 파일이 기준(이 표의 BPM 은 쓰지 않음)',
    levels,
    calib_check_hz: calibCheckHz,
    // 12-5 끝: 첫 판 멜로디 = 근음3×2 기준 5음 음계, 마디 첫 박·셋째 박(자리 0·4)에 한 음, 별 시각과 겹치면 반 박 앞당김
    melody_placeholder: { octave_mul: 2, slots: [0, 4], shift_if_star_slots: -1, degree_walk: [0, 2, 4, 2, 1, 3, 4, 0] },
  });
  console.log('music.json: 레벨 10개');
}

// 4) 소리 합성 파라미터 (30-art.md 12-4 표를 옮김). f: 숫자 = Hz, "n" = 음 주파수 배율 문자열이 아니라 {mul}
//   층 env: {a, decay} = A ms 뒤 지수 감쇠 decay ms, {a, d, s, r} = ADSR(음 길이 끝에서 r ms), {a, linEnd} = linEnd ms 에 0(선형)
const SOUND = {
  _source: '30-art.md 12-4 합성 파라미터 표 (build-web-data.mjs 에 옮김). 게인 dB = 그 소리 최고 크기',
  master: { comp: { threshold: -3, knee: 0, ratio: 20, attack: 0.003, release: 0.1 }, bus_ramp_ms: 50 },
  noise_buffer_s: 1,
  sounds: {
    tap: { bus: 'sfx', db: -6, layers: [{ wave: 'sine', f: 190, fTo: 120, glideMs: 60, env: { a: 1, decay: 220 } }, { wave: 'noise', mul: 0.5, filter: { type: 'bandpass', f: 3000, Q: 1 }, env: { a: 0.5, decay: 8 } }] },
    tap_top: { bus: 'sfx', db: -6, layers: [{ wave: 'sine', f: 150, fTo: 90, glideMs: 70, env: { a: 1, decay: 300 } }, { wave: 'noise', mul: 0.5, filter: { type: 'bandpass', f: 3000, Q: 1 }, env: { a: 0.5, decay: 8 } }] },
    tap_pass: { bus: 'sfx', db: -6, layers: [{ wave: 'sine', f: 190, fTo: 120, glideMs: 60, filter: { type: 'lowpass', f: 1200, Q: 0.7 }, env: { a: 1, decay: 220 } }, { wave: 'noise', mul: 0.125, filter: { type: 'bandpass', f: 3000, Q: 1 }, env: { a: 0.5, decay: 8 } }] },
    teacher: { bus: 'sfx', db: -12, post: { type: 'lowpass', f: 600, Q: 0.7 }, layers: [{ wave: 'sine', f: 130, fTo: 75, glideMs: 80, env: { a: 3, decay: 280 } }, { wave: 'sine', f: 260, fTo: 150, glideMs: 80, mul: 0.15, env: { a: 3, decay: 280 } }] },
    stray: { bus: 'sfx', db: -24, layers: [{ wave: 'sine', f: 190, fTo: 120, glideMs: 60, filter: { type: 'lowpass', f: 800, Q: 0.7 }, env: { a: 1, decay: 50 } }] },
    bell_high: { bus: 'sfx', db: -14, note: 'fCh', layers: [{ wave: 'sine', fMul: 1, env: { a: 2, decay: 250 } }, { wave: 'sine', fMul: 1.5, mul: 0.3, env: { a: 2, decay: 250 } }] },
    bell_low: { bus: 'sfx', db: -18, note: 'fCl', layers: [{ wave: 'sine', fMul: 1, env: { a: 2, decay: 150 } }] },
    tick: { bus: 'sfx', db: -12, layers: [{ wave: 'sine', f: 1200, env: { a: 1, decay: 30 } }, { wave: 'noise', mul: 0.5, filter: { type: 'bandpass', f: 2000, Q: 2 }, env: { a: 0.5, decay: 15 } }] },
    tick_one: { bus: 'sfx', db: -10, layers: [{ wave: 'sine', f: 1600, env: { a: 1, decay: 30 } }, { wave: 'noise', mul: 0.5, filter: { type: 'bandpass', f: 2000, Q: 2 }, env: { a: 0.5, decay: 15 } }] },
    fail: { bus: 'sfx', db: -10, layers: [{ wave: 'triangle', f: 330, fTo: 196, glideMs: 200, env: { a: 8, linEnd: 280 } }, { wave: 'noise', mul: 0.4, filter: { type: 'lowpass', f: 900, Q: 0.7 }, env: { a: 2, decay: 120 } }] },
    best: { bus: 'sfx', db: -14, delayMs: 100, layers: [{ wave: 'sine', f: 1320, env: { a: 5, decay: 150 } }] },
    clear: { bus: 'sfx', db: -8, arpeggio: { major: [0, 4, 7, 12], minor: [0, 3, 7, 12], stepMs: 90, octaveMul: 2, lastDecay: 600 }, layers: [{ wave: 'triangle', fMul: 1, filter: { type: 'lowpass', f: 3000, Q: 0.7 }, env: { a: 5, decay: 90 } }] },
    menu: { bus: 'sfx', db: -16, layers: [{ wave: 'sine', f: 660, env: { a: 2, decay: 30 } }] },
    kick: { bus: 'music', db: -16, layers: [{ wave: 'sine', f: 110, fTo: 45, glideMs: 40, env: { a: 1, decay: 120 } }] },
    kick_one: { bus: 'music', db: -13, layers: [{ wave: 'sine', f: 110, fTo: 45, glideMs: 40, env: { a: 1, decay: 120 } }] },
    bass: { bus: 'music', db: -14, post: { type: 'lowpass', f: 400, Q: 0.7 }, duck: { mul: 0.5, downMs: 5, holdMs: 80 }, layers: [{ wave: 'triangle', fMul: 1, env: { a: 10, d: 200, s: 0.5, r: 80 } }, { wave: 'sine', fMul: 0.5, mul: 0.4, env: { a: 10, d: 200, s: 0.5, r: 80 } }] },
    pad: { bus: 'music', db: -20, post: { type: 'lowpass', f: 1500, Q: 0.7 }, layers: [{ wave: 'triangle', fMul: 1, detune: -7, env: { a: 300, d: 0, s: 1, r: 600 } }, { wave: 'triangle', fMul: 1, detune: 7, env: { a: 300, d: 0, s: 1, r: 600 } }] },
    shaker: { bus: 'music', db: -24, layers: [{ wave: 'noise', filter: { type: 'highpass', f: 6000, Q: 0.7 }, env: { a: 2, decay: 25 } }] },
    mel_X: { bus: 'music', db: -16, layers: [{ wave: 'sine', fMul: 1, env: { a: 30, decay: 350 } }, { wave: 'sine', fMul: 4, mul: 0.2, env: { a: 30, decay: 350 } }] },
    mel_O: { bus: 'music', db: -16, layers: [{ wave: 'sine', fMul: 1, env: { a: 30, decay: 600 } }, { wave: 'sine', fMul: 3, mul: 0.15, env: { a: 30, decay: 600 } }] },
    mel_F: { bus: 'music', db: -16, layers: [{ wave: 'triangle', fMul: 1, filter: { type: 'lowpass', f: 2500, Q: 0.7 }, vibrato: { hz: 5, cents: 8, afterMs: 150 }, env: { a: 40, d: 100, s: 0.7, r: 120 } }] },
    mel_M: { bus: 'music', db: -16, layers: [{ wave: 'sine', fMul: 1, env: { a: 30, decay: 400 } }, { wave: 'sine', fMul: 4, mul: 0.25, env: { a: 30, decay: 80 } }] },
    harmony_db: -22,
  },
  // 12-1 마디별 파트 (판정 별 자리 타악 없음, 셰이커는 정박만)
  parts: {
    countin: ['kick', 'tick'],
    show: ['kick', 'bass', 'pad', 'shaker', 'teacher'],
    play: ['kick', 'bass', 'pad', 'shaker', 'melody'],
    rest: ['kick', 'pad'],
    outro: ['bass', 'pad'],
    melody_from_stage: 2,
    harmony_from_stage: 3,
    shaker_when_allowed_slots_not: 'even',
  },
};
wjson('sound.json', SOUND);

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
  mallet: { head: [0.2, 0.11], stick: [0.06, 0.27], tiltDeg: 30, off: [0.05, 0.07], grow: [0.6, 1], growBeats: 0.25, hitDeg: 6, hitMs: 80 },
  showDash: { width: 0.35, segs: 32, on: 0.45 },
  hud: { barLeft: 16, barTopP: 24, barTopL: 20, barH: 10, gapToPause: 12, bestR: 6.5, dotsGap: 14, dotR: 4.5, dotStep: 14, dotsMax: 10, squareEvery: 5, flag: 14, pause: 48, margin: 12 },
  thumb: { pad: 12, minTop: 0.7, bottom: 16, side: 16, fxK: 2.05 },
  hand: { size: 64, landscapeFromRight: 72, landscapeFromBottom: 64, pressPx: 4, growBeats: 0.25 },
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
  card: { w: 120, h: 132, gap: 12, border: 3, practiceBtn: 48, landscapeMaxW: 0.8 },
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
  console.log('svg: assets 복사, 아이콘 14개 추출');
}

wjson('manifest.json', { levels: levelFiles.map((f) => 'levels/' + f), built: 'build-web-data.mjs' });
console.log('완료 →', DATA);
