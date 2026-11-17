#!/usr/bin/env node
// 기획 데이터 → 웹 빌드 데이터 복사·변환 (runner-01 → games/reverbound/data)
//
//   node projects/runner-01/tools/sync-data.mjs            # 전부 (검증기 입력열 내보내기 포함, 약 10초)
//   node projects/runner-01/tools/sync-data.mjs --no-inputs # 입력열 내보내기 생략
//
// 만드는 파일
//   data/balance.json, data/levels/*.json  : 그대로 복사 (빌드는 balance.json levels 순서대로 읽음)
//   data/strings.json                      : 10-lore.md 5절 문자열 테이블 (키 → {ko, en}), 사망·클리어 부제 목록
//   data/art.json                          : 30-art.md 2절 팔레트(표에 있는 levelN 전부 + 공통), 2-2-1 카드 색, 6절 클리어 색.
//                                            5-5 카드 대표 오브젝트, 2-1 배경 모양 키 + data/art-gimmicks.json(부록 B 기믹 모양 확정값).
//                                            임시값 없음: 30-art에 빠진 값이 있으면 멈춤. 대비 검사
//   icon.svg                               : assets/app-icon.svg (파비콘)
//   data/test-inputs.json                  : verify-levels 가 찾은 완벽 입력열(탭 틱). ?test=1 자동 재생·QA 용
// data/music.json(30-art 7절)·data/art-gimmicks.json(부록 B)은 손 작성 파일이라 이 스크립트가 건드리지 않는다.
// 레벨 JSON은 judge_taps(20-balance 15-2)까지 그대로 복사하고, 모든 레벨에 judge_taps가 있는지 확인한다.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..');
const ROOT = resolve(PROJECT, '../..');
const OUT = join(ROOT, 'games/reverbound/data');
const args = process.argv.slice(2);

const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
mkdirSync(join(OUT, 'levels'), { recursive: true });

// 1) balance + levels
// 빌드용 사본은 '_'로 시작하는 설명 키를 뺌 (설명 안의 레퍼런스 문서 경로가 게임 파일에 남지 않게, 원본 보호). 값은 그대로
const noNotes = (v) => (Array.isArray(v) ? v.map(noNotes) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith('_')).map(([k, x]) => [k, noNotes(x)])) : v);
writeFileSync(join(OUT, 'balance.json'), JSON.stringify(noNotes(bal), null, 1) + '\n');
for (const f of bal.levels) {
  mkdirSync(dirname(join(OUT, f)), { recursive: true });
  copyFileSync(join(PROJECT, f), join(OUT, f));
}
copyFileSync(join(PROJECT, 'assets/app-icon.svg'), join(OUT, '../icon.svg'));
for (const f of bal.levels) { const l = JSON.parse(readFileSync(join(OUT, f), 'utf8')); if (!Array.isArray(l.judge_taps) || !l.judge_taps.length) throw new Error(`${f}: judge_taps 없음 (tools/build-judge-taps.mjs)`); }
if (!bal.combo?.judge_pct || !bal.practice) throw new Error('balance.json: combo.judge_pct / practice 절 없음');
console.log(`balance.json + ${bal.levels.length} levels(judge_taps 포함) + icon.svg 복사`);

// 표 한 줄 → 셀 배열
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const unwrap = (s) => s.replace(/^`|`$/g, '').replace(/\*\*/g, '');

// 2) strings (10-lore.md 5절)
{
  const md = readFileSync(join(PROJECT, '10-lore.md'), 'utf8');
  const start = md.indexOf('\n## 5.');
  const end = md.indexOf('\n## 6.', start);
  if (start < 0 || end < 0) throw new Error('10-lore.md 5절을 찾지 못함');
  const lines = md.slice(start, end).split('\n');
  const strings = {};
  const lists = { death_messages: [], clear_subtitles: [] };
  let sub = '';
  let numberedTable = 0; // 5-5 안에서 두 번째 표(번호표) 구분용
  for (const line of lines) {
    if (line.startsWith('### ')) { sub = line.slice(4, 7); numberedTable = 0; continue; }
    if (!line.trim().startsWith('|')) continue;
    const c = cells(line);
    if (c.length < 3 || /^-+$/.test(c[0]) || c[0] === '키' || c[0] === '#') continue;
    const key = unwrap(c[0]);
    const ko = c[c.length - 2], en = c[c.length - 1];
    if (/^\d+$/.test(key)) {
      if (sub === '5-4') lists.death_messages.push({ ko, en });
      else if (sub === '5-5') lists.clear_subtitles.push({ ko, en });
      numberedTable++;
      continue;
    }
    if (/^[a-z][a-z0-9_]*$/.test(key)) strings[key] = { ko, en };
  }
  const need = ['title', 'subtitle', 'tap_to_start', 'attempt', 'pause_title', 'clear_title_l1', 'tut_tap', 'loading', 'rotate_hint'];
  for (const k of need) if (!strings[k]) throw new Error(`strings: ${k} 없음`);
  if (!lists.death_messages.length || !lists.clear_subtitles.length) throw new Error('strings: 사망/클리어 부제 목록 비어 있음');
  writeFileSync(join(OUT, 'strings.json'), JSON.stringify({ _source: 'projects/runner-01/10-lore.md 5절 (sync-data.mjs 생성, 직접 고치지 말 것)', strings, ...lists }, null, 1) + '\n');
  console.log(`strings.json: 키 ${Object.keys(strings).length}개, 사망 문구 ${lists.death_messages.length}, 클리어 부제 ${lists.clear_subtitles.length}`);
}

// 3) art (30-art.md 2절 팔레트, 2-2-1 카드 색, 5-5 카드 오브젝트, 6절 클리어 색, 2-1 배경 모양 키) + 부록 B 기믹 모양
{
  const md = readFileSync(join(PROJECT, '30-art.md'), 'utf8');
  const sec = (a, b) => { const i = md.indexOf(a); if (i < 0) throw new Error(`30-art.md ${a} 없음`); const j = md.indexOf(b, i + a.length); return md.slice(i, j < 0 ? undefined : j); };
  const s21 = sec('### 2-1.', '\n### ');
  const s22 = sec('### 2-2.', '\n### 2-3.'); // 2-2와 2-2-1(메뉴 전용 색)
  const hexes = (s) => [...s.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase());
  // 표 머리줄의 levelN 열을 찾아 열마다 색을 읽는다 (레벨 수가 늘어도 그대로 동작)
  function levelTable(text, rowFilter) {
    const out = {};
    let cols = null;
    for (const line of text.split('\n')) {
      if (!line.trim().startsWith('|')) { cols = null; continue; }
      const c = cells(line);
      if (c.some((x) => /^level\d+/.test(x))) { cols = c.map((x) => /^(level\d+)/.exec(x)?.[1] ?? null); continue; }
      if (!cols) continue;
      const m = /^`(\w+)`$/.exec(c[0] ?? '');
      if (!m || (rowFilter && !rowFilter(m[1]))) continue;
      c.forEach((x, j) => { const lv = cols[j]; const h = hexes(x); if (lv && h.length === 1) (out[lv] ??= {})[m[1]] = h[0]; });
    }
    return out;
  }
  const palette = levelTable(s21);
  const fromArt = Object.keys(palette);
  const tint = levelTable(s22, (k) => k === 'cardTint');
  const common = {};
  for (const line of s22.split('\n')) {
    const c = cells(line);
    if (!c[0]?.startsWith('`') || c.length !== 3) continue;
    const keys = [...c[0].matchAll(/`(\w+)`/g)].map((m) => m[1]);
    const h = hexes(c[c.length - 1]);
    if (keys.length && keys.length === h.length) keys.forEach((k, i) => (common[k] = h[i]));
  }
  // 클리어 색: 6절 표의 "클리어" 행에서 levelN 뒤의 색들
  const clearLine = md.split('\n').find((l) => l.startsWith('| 클리어')) ?? '';
  const clear = {};
  const marks = [...clearLine.matchAll(/level(\d+)/g)];
  marks.forEach((m, i) => { const h = hexes(clearLine.slice(m.index + m[0].length, marks[i + 1]?.index)); if (h.length) clear[`level${m[1]}`] ??= h; });
  const cardTint = {};
  for (const [lv, v] of Object.entries(tint)) cardTint[lv] = v.cardTint;

  // 배경 모양 키: 2-1 두 번째 표의 "배경 모양 키" 행 (레벨 4~10). 레벨 1~3은 render.js 고유 모티프(30-art 1절)
  const motifs = {};
  {
    let cols = null;
    for (const line of s21.split('\n')) {
      if (!line.trim().startsWith('|')) { cols = null; continue; }
      const c = cells(line);
      if (c.some((x) => /^level\d+/.test(x))) { cols = c.map((x) => /^(level\d+)/.exec(x)?.[1] ?? null); continue; }
      if (cols && c[0].startsWith('배경 모양 키')) c.forEach((x, j) => { if (cols[j]) motifs[cols[j]] = x.split(',').map((w) => w.trim()).filter(Boolean); });
    }
  }
  // 레벨 카드 대표 오브젝트: 5-5 표 (| 레벨 번호 | `키` | 그림 |)
  const card_object = {};
  for (const line of sec('### 5-5.', '\n### ').split('\n')) {
    const c = cells(line);
    const m = /^`(\w+)`$/.exec(c[1] ?? '');
    if (/^\d+$/.test(c[0] ?? '') && m) card_object[`level${c[0]}`] = m[1];
  }
  // 새 기믹 모양: 30-art 부록 B 본문(표가 아님)을 data/art-gimmicks.json에 옮겨 적은 확정값. 판정과 같아야 하는 값은 여기서 확인
  const gimmicks = JSON.parse(readFileSync(join(OUT, 'art-gimmicks.json'), 'utf8'));
  if (Math.abs(gimmicks.platform_visual_t - bal.platform_thickness_t) > 1e-9) throw new Error(`얇은 판 그림 두께 ${gimmicks.platform_visual_t} ≠ 판정 ${bal.platform_thickness_t} (30-art 부록 B-3)`);
  // 임시값 없음 (round-2 art 확정): 30-art에서 빠진 값이 있으면 멈춤
  const themes = bal.levels.map((f) => JSON.parse(readFileSync(join(PROJECT, f), 'utf8')).theme_id);
  const missing = [];
  for (const th of themes) {
    if (!palette[th]) missing.push(`${th} palette`);
    if (!cardTint[th]) missing.push(`${th} cardTint`);
    if (!clear[th]) missing.push(`${th} clear`);
    if (!card_object[th]) missing.push(`${th} card_object`);
    if (!['level1', 'level2', 'level3'].includes(th) && !motifs[th]?.length) missing.push(`${th} motifs`);
  }
  if (missing.length) throw new Error(`30-art.md에 없는 값: ${missing.join(', ')}`);
  for (const [th, ks] of Object.entries(motifs)) if (ks.includes('stalactite')) throw new Error(`motifs ${th}: stalactite 금지 (30-art 2-1 뾰족한 배경)`);
  const needEnv = ['bg', 'bgFar', 'bgPulse', 'bgAccent', 'ground'];
  const needCommon = ['outline', 'groundEdge', 'hazard', 'player', 'playerCore', 'playerAccent', 'trigger', 'gateSlow', 'gateNormal', 'gateFast', 'hud'];
  for (const [lv, p] of Object.entries(palette)) for (const k of needEnv) if (!p[k]) throw new Error(`palette ${lv}: ${k} 없음`);
  for (const k of needCommon) if (!common[k]) throw new Error(`palette common: ${k} 없음`);
  for (const th of themes) if (!clear[th]?.length) throw new Error(`clear 색 없음: ${th}`);

  // 대비 검사 (30-art 부록 A와 같은 쌍 + 카드 테두리 3:1). 실패하면 멈춤
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const BG = ['bg', 'bgFar', 'bgPulse', 'bgAccent'];
  const checks = [...BG.map((b) => ['hazard', b, 4.5]), ['outline', 'hazard', 3], ['outline', 'ground', 3], ['ground', 'bg', 3], ['ground', 'bgFar', 3], ['groundEdge', 'ground', 3],
    ...BG.map((b) => ['player', b, 3]), ['outline', 'player', 3], ['playerAccent', 'player', 3],
    ...['trigger', 'gateSlow', 'gateNormal', 'gateFast'].flatMap((k) => [[k, 'bg', 3], [k, 'bgFar', 3]]), ['hud', 'bg', 4.5], ['hud', 'bgFar', 4.5], ['hud', 'bgPulse', 4.5], ['cardTint', 'bg', 3]];
  const contrast = {};
  for (const th of themes) {
    const p = { ...common, ...palette[th], cardTint: cardTint[th] };
    let min = 99;
    const fails = [];
    for (const [a, b, t] of checks) { const r = cr(p[a], p[b]); if (a === 'hazard') min = Math.min(min, r); if (r < t) fails.push(`${a}/${b} ${r.toFixed(2)} < ${t}`); }
    if (fails.length) throw new Error(`대비 실패 ${th}: ${fails.join(', ')}`);
    contrast[th] = { pairs: checks.length, hazard_min: +min.toFixed(2) };
  }
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')));
  writeFileSync(join(OUT, 'art.json'), JSON.stringify({ _source: 'projects/runner-01/30-art.md 2-1·2-2·2-2-1·5-5·6절 + data/art-gimmicks.json(부록 B) (sync-data.mjs 생성, 직접 고치지 말 것)',
    palette, common, cardTint, clear, card_object, motifs, gimmicks: clean(gimmicks), provisional: {}, contrast }, null, 1) + '\n');
  console.log(`art.json: 팔레트 ${themes.length}레벨 (30-art ${fromArt.length}, 임시값 0), 카드색 ${Object.keys(cardTint).length}, 클리어색 ${Object.keys(clear).length}, 카드 오브젝트 ${Object.keys(card_object).length}, 배경 모양 ${Object.keys(motifs).length}레벨, 공통 ${Object.keys(common).length}색, 대비 ${themes.length}레벨 × ${checks.length}쌍 통과 (위험 vs 배경 최소 ${Math.min(...Object.values(contrast).map((c) => c.hazard_min))}:1)`);
  console.log(`  배경 모양 level7: ${motifs.level7?.join(', ')}`);
}

// 4) 검증기 완벽 입력열
if (!args.includes('--no-inputs')) {
  const { verifyLevel } = await import('./verify-levels.mjs');
  const out = { _source: 'tools/verify-levels.mjs 가 찾은 입력열 (sync-data.mjs 생성)', physics_hz: bal.physics_hz, levels: {} };
  for (const f of bal.levels) {
    const r = verifyLevel(join(PROJECT, f), bal);
    if (!r.pass) throw new Error(`검증 실패: ${f} ${r.problems.join('; ')}`);
    const beatSec = 60 / r.bpm;
    out.levels[r.id] = {
      file: f,
      taps: r.inputs.map((t) => t.tick),
      // 모든 탭을 가장 가까운 정박·반박으로 옮긴 입력열 (검증기 "박자대로 친 입력열")
      on_beat_taps: r.inputs.map((t) => Math.round((Math.round(t.beat * 2) / 2) * beatSec * bal.physics_hz)),
      min_window_ms: r.min_window_ms,
    };
    console.log(`  ${r.id}: 탭 ${r.taps}, 최소 창 ${r.min_window_ms} ms`);
  }
  writeFileSync(join(OUT, 'test-inputs.json'), JSON.stringify(out) + '\n');
  console.log('test-inputs.json 작성');
}
console.log(`완료 → ${OUT}`);
