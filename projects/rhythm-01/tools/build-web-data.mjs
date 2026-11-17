#!/usr/bin/env node
// rhythm-01 웹 빌드 데이터 생성기: projects/rhythm-01 기획 데이터 → games/rhythm-01/data/
//
//   node projects/rhythm-01/tools/build-web-data.mjs
//
// 만드는 것
//   data/balance.json, data/levels/*.json, data/palette.json  (복사, 수정 없음)
//   data/strings.json   10-lore.md 7절 표(64) + R3-7 새 키(6) + R3-12 새 키(5) = 75에서 폐기 3·쓰지 않음 1을 뺀 사용 키 71 (round-3)
//   data/sound.json, data/music.json  assets/sound.json(art 원본, round-2 R7)을 나눠 복사.
//                       먼저 assets/sound-check.mjs 실행, music.calib_check_hz 가 숫자가 아니면 빌드 중단
//   data/art.json       북길 화면 규격 = assets/layout.json rule(복사, 함수 문자열 2개는 숫자 인자로) + 30-art 16절 연출 값(아래 ART)
//   data/svg/*.svg      assets/ SVG 복사 + 목업 6·7에서 메뉴 아이콘 추출(배경 네모 제거, 버튼 배경은 CSS)
//   data/svg/cards/     assets/cards-r3/ 그림 카드(키 이름 그대로, round-3). 옛 카드 파일은 지움
//   index.html          불러오기 화면 글(10-lore loading·load_error·btn_retry ko/en)과 첫 테마 색을 표시 사이에 넣음 (R8-5)
//   js/judge.js         tools/sim/judge.mjs 복사 (판정 기준 구현을 그대로 씀)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
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
for (const f of levelFiles) {
  const lv = JSON.parse(readFileSync(join(PROJ, 'levels', f), 'utf8'));
  if (lv.schema_version !== 3 || !lv.path || !lv.practice || !lv.bars) throw new Error(`levels/${f}: 스키마 v3 아님 (round-3 북길 빌드)`);
  copyFileSync(join(PROJ, 'levels', f), join(DATA, 'levels', f));
}
copyFileSync(join(PROJ, 'assets/palette.json'), join(DATA, 'palette.json'));
copyFileSync(join(PROJ, 'tools/sim/judge.mjs'), join(GAME, 'js/judge.js'));

// 2) 텍스트 키 (10-lore.md 7절 64 + R3-7 새 키 6 + R3-12 새 키 5 = 75). 폐기 3·쓰지 않음 1은 빌드에 넣지 않음(DEV_NOTES "10-lore R3-7")
const STR = {};
{
  const md = rd('10-lore.md');
  const rows = (sec) => sec.split(/\r?\n/).filter((l) => l.startsWith('|')).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  const clean = (s) => s.replace(/\*\*/g, '').replace(/\s*\(\d+(자|단어)\)\s*$/, '').trim();
  const keyOf = (c) => (c.match(/^~*([a-z0-9_]+)/) || [])[1];
  const ko = {}, en = {};
  const readTable = (sec, firstOnly) => {
    let kr = -1, ec = -1, n = 0;
    for (const cells of rows(sec)) {
      if (cells[0] === '키') { if (kr >= 0 && firstOnly) break; kr = cells.indexOf('KR'); ec = cells.indexOf('EN'); continue; }
      if (/^-+$/.test(cells[0]) || kr < 0) continue;
      const key = keyOf(cells[0]);
      if (!key) continue;
      ko[key] = clean(cells[kr]); en[key] = clean(cells[ec]); n++;
    }
    return n;
  };
  const n7 = readTable(md.slice(md.indexOf('## 7. 텍스트 키 표'), md.indexOf('## 8.')), false);
  if (n7 !== 64) throw new Error(`10-lore 7절 텍스트 키 ${n7}개 (64개여야 함)`);
  const r37 = md.slice(md.indexOf('### R3-7.'), md.indexOf('### R3-8.'));
  const nNew = readTable(r37, true);
  if (nNew !== 6) throw new Error(`10-lore R3-7 새 키 ${nNew}개 (6개여야 함)`);
  // R3-12 (판정 이름과 퍼센트): KR·EN 열이 있는 표 모두 (판정 이름 3 + 결과 화면 새 키 2, aria_streak_best 는 R3-7 키를 다시 씀)
  const r312 = md.slice(md.indexOf('### R3-12.'), md.indexOf('#### R3-12-4'));
  const before = Object.keys(ko).length; readTable(r312, false);
  const n312 = Object.keys(ko).length - before;
  if (n312 !== 5) throw new Error(`10-lore R3-12 새 키 ${n312}개 (5개여야 함)`);
  // 폐기 표(머리 "round-2 문구")·쓰지 않음 표(머리 "쓰지 않는 이유")의 첫 칸 = 키
  const listOf = (head) => { const out = []; let on = false; for (const c of rows(r37)) { if (c[0] === '키') { on = c.some((x) => x.includes(head)); continue; } if (on && !/^-+$/.test(c[0]) && keyOf(c[0]) && !c[0].includes('다시 씀')) out.push(keyOf(c[0])); } return out; }; // R3-12 '다시 씀' 줄은 뺌
  const deprecated = listOf('round-2 문구'), unused = listOf('쓰지 않는 이유');
  const all = Object.keys(ko).length;
  if (all !== 75 || deprecated.length !== 3 || unused.length !== 1) throw new Error(`키 ${all} (75), 폐기 ${deprecated.length} (3), 쓰지 않음 ${unused.length} (1)`);
  for (const k of [...deprecated, ...unused]) { if (!(k in ko)) throw new Error(`없는 키 ${k}`); delete ko[k]; delete en[k]; }
  const used = Object.keys(ko).length;
  if (used !== 71) throw new Error(`사용 키 ${used}개 (71개여야 함)`);
  wjson('strings.json', { _source: '10-lore.md 7절 + R3-7 (build-web-data.mjs 생성). 폐기·쓰지 않음 키는 빼고 _not_used 에 기록(DEV_NOTES "10-lore R3-7")', _not_used: { deprecated_r3_7: deprecated, unused_r3_7: unused }, ko, en });
  STR.ko = ko; STR.en = en;
  console.log(`strings.json: 표 키 ${all}개 = 사용 ${used} + 폐기 ${deprecated.length}(${deprecated.join(',')}) + 쓰지 않음 ${unused.length}(${unused.join(',')})`);
}

// 3) 소리·음악 (원본 assets/sound.json, round-2 R7. 30-art 12절 표는 사람용 요약이라 파싱하지 않음)
{
  const chk = spawnSync(process.execPath, [join(PROJ, 'assets/sound-check.mjs')], { encoding: 'utf8' });
  if (chk.status !== 0) throw new Error('assets/sound-check.mjs 실패:\n' + chk.stdout + chk.stderr);
  const S = JSON.parse(rd('assets/sound.json'));
  const M = S.music;
  if (typeof M.calib_check_hz !== 'number' || !Number.isFinite(M.calib_check_hz) || M.calib_check_hz <= 0) throw new Error(`sound.json music.calib_check_hz 가 숫자가 아님: ${M.calib_check_hz}`);
  for (const k of ['master', 'noise_buffer_s', 'sounds', 'parts']) if (S[k] == null) throw new Error(`sound.json ${k} 없음`);
  if (!M.melody || !M.levels || !M.melody_r3 || !M.combo_r3) throw new Error('sound.json music.melody / melody_r3 / combo_r3 / levels 없음');
  for (const n of Object.values(M.combo_r3.steps)) if (!S.sounds[n]) throw new Error(`sound.json sounds.${n} 없음 (music.combo_r3)`);
  for (const p of bal.levels) {
    const id = JSON.parse(rd(p)).id, lm = M.levels[id];
    if (!lm || !Array.isArray(lm.motif) || !lm.motif.length) throw new Error(`sound.json music.levels.${id}.motif 없음`);
  }
  wjson('sound.json', { _source: 'assets/sound.json (build-web-data.mjs 복사)', master: S.master, noise_buffer_s: S.noise_buffer_s, sounds: S.sounds, parts: S.parts });
  wjson('music.json', { _source: 'assets/sound.json music (build-web-data.mjs 복사). BPM 은 levels 파일이 기준', levels: M.levels, calib_check_hz: M.calib_check_hz, melody: M.melody, melody_r3: M.melody_r3, combo_r3: M.combo_r3 });
  console.log(`sound.json·music.json: assets/sound.json 복사 (sound-check OK, calib_check_hz ${M.calib_check_hz})`);
}

// 5) 화면·오브젝트 규격 — round-3 북길. 규격 = assets/layout.json rule(art 원본, 표 파싱 안 함), 연출 = 30-art 16-3~16-6
const LAYOUT = JSON.parse(rd('assets/layout.json'));
const road = JSON.parse(JSON.stringify(LAYOUT.rule));
{
  // 함수 문자열 2개를 숫자 인자로 바꾸고 d 1~400 에서 원래 식과 같은지 확인 (빌드는 식을 실행하지 않음)
  const fn = (src) => new Function(`return (${src})`)();
  const ml = road.line_w.match(/^\(d\) => Math\.max\((\d+(?:\.\d+)?), Math\.round\(d \/ (\d+(?:\.\d+)?)\)\)$/);
  const mf = road.finger_cell.match(/^\(d\) => Math\.max\((\d+(?:\.\d+)?), Math\.round\((\d+(?:\.\d+)?) \* d\)\)$/);
  if (!ml || !mf) throw new Error(`layout.json rule.line_w / finger_cell 형식이 바뀜: ${road.line_w} / ${road.finger_cell}`);
  const lw = { min: +ml[1], div: +ml[2] }, fc = { min: +mf[1], mul: +mf[2] };
  const f1 = fn(road.line_w), f2 = fn(road.finger_cell);
  for (let d = 1; d <= 400; d++) if (f1(d) !== Math.max(lw.min, Math.round(d / lw.div)) || f2(d) !== Math.max(fc.min, Math.round(fc.mul * d))) throw new Error(`line_w/finger_cell 변환 다름 d=${d}`);
  road.line_w = lw; road.finger_cell = fc;
  // 판정 이름·% (30-art 16-13): 시간 값은 layout.json judge_label 과 balance.json accuracy.display_timing_ms 가 같아야 함
  const J = road.judge_label, DT = bal.accuracy && bal.accuracy.display_timing_ms;
  if (!J || !DT || J.pop_ms !== DT.pop || J.hold_ms !== DT.hold_until || J.fade_ms !== DT.fade || J.pop !== DT.pop_scale[1]) throw new Error(`판정 글 시간 layout.json judge_label ≠ balance accuracy.display_timing_ms`);
  if (!/0\.2s/.test(DT.on_clear)) throw new Error(`accuracy.display_timing_ms.on_clear ${DT.on_clear}`);
  J.clear_fade_ms = 200; // on_clear "fade_with_hud_0.2s"
  // 16-13-2 등급 표지: 딱 = 빛살 5개(위로 −60°~+60°), 좋아 = 3개(−40°·0°·+40°), 길이 이름 × 0.4, 굵기 max(3, 이름 × 0.08) / 됐어 = 고리 r 이름 × 0.18, 선 × 0.06.
  // r0(빛살 시작 거리)·base(부채 중심을 이름 가운데보다 아래로)는 dev 가 정함
  J.mark = { five: [-60, -30, 0, 30, 60], three: [-40, 0, 40], len: 0.4, w: [3, 0.08], ring: 0.18, ringW: 0.06, r0: 0.08, base: 0.22 };
}
const step = (n) => bal.combo.steps.find((s) => s.at === n);
const ART = {
  _source: 'round-3 북길: road = assets/layout.json rule (build-web-data.mjs 복사), 나머지 = 30-art 16-1~16-6 연출 값을 옮긴 것(30-art 를 바꾸면 여기도). 콤보 시각 값은 balance.json combo',
  road,
  // 판정 글 스프라이트를 미리 그릴 % 값 (balance accuracy: 딱 100·90, 좋아 80·70·60, 통과 50~10)
  labelPcts: { perfect: [bal.accuracy.perfect_inner_pct, bal.accuracy.perfect_outer_pct], good: bal.accuracy.good_pcts, pass: bal.accuracy.pass_pcts },
  fontFamily: 'system-ui, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif', // 16-13-2 빌드 글꼴 목록(웹 폰트 없음)
  star: { inner: 0.5, outline: [2.5, 0.14] },                         // 3절 꽉 찬 별 모양 그대로
  ball: { outline: [2.5, 0.16], hi: 0.28, hollowW: 0.22 },             // 3절 공 모양(꼬리 없음, 16-1)
  drum: { edge: 2, innerK: 0.76, innerW: 1.5, countOff: 0.3, countDot: [3, 0.12] }, // 16-1 판정 북, 5-3 카운트인 점 4개(2×2)
  line: { outline: 1 },                                                // 16-1 판정 선 양옆 outline 1 px
  // 16-1 눈금: 정박 = 아랫변 안쪽 네모 max(5, 0.16 d)·trackEdge 80 %, 마디 첫 박 = 아랫변에서 띠 높이 30 % 막대(폭 max(2, d/16) — 폭은 dev 가 정함)
  ticks: { edge: 1.5, beat: [5, 0.16], inset: 3, bar: { h: 0.3, w: [2, 1 / 16] } },
  hand: { min: 64, portraitPad: 16, pressPx: 4, pressRef: 64, growBeats: 0.25 }, // 손가락 칸 = layout finger, 누름 4 px × 칸/64
  title: { bpm: 100 },                                                 // 16-9 4-6 대체: 타이틀 공 100 BPM 착지
  fx: {
    // 16-3: 딱 1.2배 + 빛살 5개 왼쪽 부채꼴 225~315°(12시 = 0°, 시계 방향), 별 끝 3 px 띄워 길이 0.6 r, 폭 max(3, 0.2 r)
    perfect: { scale: 1.2, angles: [225, 247.5, 270, 292.5, 315], rayGap: 3, rayLen: 0.6, rayW: [3, 0.2], ms: bal.preview.judge_fx_max_ms, ripple: 1.18 },
    good: { scale: 1.1, angles: [240, 270, 300], rayGap: 3, rayLen: 0.6, rayW: [3, 0.2], ms: 180, ripple: 1.12 },
    pass: { scale: 0.35, ring: 0.9, ms: 150, ripple: 1.06 },
    miss: { rotDeg: 20, drop: 0.15, ms: 300 },
    stray: { ripple: 1.03, ms: 100 },
  },
  fail: { pieceShrinkS: 0.1, hollowShrinkS: 0.08 },                    // 16-6
  clear: { gradeR: 0.6, gradeGap: 2.4, drumGrow: [0.6, 1], btn: 64, btnGap: 16 }, // 16-6 등급 북(판정 북 반지름 배수)·결과 버튼 8-2
  // 16-4 콤보 줄 (자리·크기 = road.combo, 시각 = balance combo)
  combo: {
    showFrom: bal.combo.show_from,
    pop: { ms: bal.combo.display.update_pop_ms, scale: bal.combo.display.update_pop_scale[1], step5: 1.3 },
    gather: { ms: step(10).fx_ms, markFrom: 0.6 },
    confetti: { n: 6, size: 4, fall: 12, ms: step(20).fx_ms },
    off: { r: 3.4, w: 1.2, alpha: 0.5 }, onOutline: 1, markOutline: 1.2,
  },
  hud: { bestR: 6.5, dotStep: 14, dotsMax: 10, squareEvery: 5, flag: 14 },
  // 5-6 레벨 카드(round 2 줄 흐름, round 3 긴 이름 R16) + 16-9 줄 1 "작은 길 조각"(가로 둥근 막대 + 왼쪽 30 % 세로 선 + 위 공 점)
  card: {
    w: 120, h: 132, gap: 12, border: 3, practiceBtn: 48, minW: 100, minH: 104,
    rows: { orbit: 28, orbitMin: 16, dots1: 6, dots2: 15, grade: 12, name: 14, gap: 4, reserve: 12 },
    name: { sizes: [12, 11, 10], lineH: 14, twoSize: 10, twoLineH: 12, twoH: 24 },
    roadPiece: { wMul: 2.6, barH: 0.36, judgeAt: 0.3, ballR: 0.16, stroke: 3, lineW: 2.5 },
    dotR: 3, dotStep: 9, dotsPerRow: 5, gradeR: 6, gradeStep: 14,
    progress: { h: 4, w: 64, dotR: 4, dotOutline: 1.2, flag: 12, flagGap: 4 },
    landscapeMaxW: 0.8, img: { w: 720, h: 336 }, portrait: { w: 226, h: 880, margin: 32, maxScale: 1.4 },
  },
  confirm: { maxW: 328, side: 16, radius: 20, border: 1.5, icon: 48, btnH: 64, btnGap: 16 },
  // 10절 보정 화면(북길로 바뀌지 않음): 크기 기준 R = 옛 궤도 반지름 공식(orbit), 가운데 북 + 점 8개
  calib: { refR: 170, drumR: 71, dotsR: 112, dotR: 11, dots: 8, checkGrowS: 0.25, doneHoldS: 1, drumOutline: 3, innerK: 0.76, orbit: { portrait: { rW: 0.4, rH: 0.26, cy: 0.45 }, landscape: { rH: 0.33, rW: 0.3, cy: 0.55 } } },
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
  // round-3: 그림 카드 = assets/cards-r3/ (파일 이름 = 키). 옛 카드(원 궤도)는 빌드에서 지움
  for (const f of readdirSync(join(DATA, 'svg/cards'))) rmSync(join(DATA, 'svg/cards', f));
  if (!bal.cards.asset_path.includes('cards-r3')) throw new Error(`balance cards.asset_path ${bal.cards.asset_path}`);
  for (const k of Object.values(bal.cards.keys)) for (const f of [`${k}.svg`, `${k}_portrait.svg`]) {
    const src = readFileSync(join(A, 'cards-r3', f), 'utf8');
    if (/(?:href|src)\s*=\s*["'](?!#)/.test(src) || /url\((?!#)/.test(src)) throw new Error(`cards-r3/${f} 외부 참조`);
    writeFileSync(join(DATA, 'svg/cards', f), src);
  }
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
  // round-3 R12: 탭 아이콘(favicon)을 ball.svg 와 같은 그림의 32 px PNG 로. SVG 탭 아이콘은 브라우저가 타이틀 탭 직후에
  // 불러와 SVG 문서를 메인 스레드에서 만들며(6배 스로틀 25 ms) 레벨 시작 창에 긴 프레임을 만들었음
  {
    const S = 32, SS = 4, hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [ball, ink, hud] = [pal.common.ball, pal.common.outline, pal.common.hud].map(hex);
    const raw = Buffer.alloc(S * (S * 4 + 1));
    for (let y = 0; y < S; y++) {
      raw[y * (S * 4 + 1)] = 0;
      for (let x = 0; x < S; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / S) * 120 - 60, v = ((y + (sy + 0.5) / SS) / S) * 120 - 60, d = Math.hypot(u, v);
          let c = null;
          if (Math.hypot(u + 11, v + 11) <= 10) c = hud; else if (d <= 34) c = ball; else if (d <= 40) c = ink; // ball.svg: r 37, 외곽선 6, 하이라이트 (−11,−11) r 10
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
        }
        const n = SS * SS, k = a / 255, o = y * (S * 4 + 1) + 1 + x * 4;
        raw[o] = k ? Math.round(r / k) : 0; raw[o + 1] = k ? Math.round(g / k) : 0; raw[o + 2] = k ? Math.round(b / k) : 0; raw[o + 3] = Math.round(a / n);
      }
    }
    const { deflateSync, crc32 } = await import('node:zlib');
    const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([len, td, c]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
    writeFileSync(join(DATA, 'favicon.png'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
    console.log('favicon.png: ball.svg 그림 32 px');
  }
}

// 7) index.html: 불러오기 화면은 strings.json 을 읽기 전이라 10-lore 글과 첫 테마 색을 미리 넣음 (R8-5, D12 보완)
{
  const pal = JSON.parse(rd('assets/palette.json'));
  const lv1 = JSON.parse(rd(bal.levels[0]));
  const t = pal.themes[lv1.theme_id], C = pal.common;
  if (!t) throw new Error(`palette 테마 ${lv1.theme_id} 없음`);
  const keys = ['loading', 'load_error', 'btn_retry', 'title'];
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
