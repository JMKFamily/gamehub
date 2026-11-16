#!/usr/bin/env node
// 기획 데이터 → 웹 빌드 데이터 복사·변환 (runner-01 → games/reverbound/data)
//
//   node projects/runner-01/tools/sync-data.mjs            # 전부 (검증기 입력열 내보내기 포함, 약 10초)
//   node projects/runner-01/tools/sync-data.mjs --no-inputs # 입력열 내보내기 생략
//
// 만드는 파일
//   data/balance.json, data/levels/*.json  : 그대로 복사 (빌드는 balance.json levels 순서대로 읽음)
//   data/strings.json                      : 10-lore.md 5절 문자열 테이블 (키 → {ko, en}), 사망·클리어 부제 목록
//   data/art.json                          : 30-art.md 2절 팔레트(level1~3 + 공통), 6절 클리어 색
//   icon.svg                               : assets/app-icon.svg (파비콘)
//   data/test-inputs.json                  : verify-levels 가 찾은 완벽 입력열(탭 틱). ?test=1 자동 재생·QA 용
// data/music.json 은 30-art.md 7절을 옮겨 적은 손 작성 파일이라 이 스크립트가 건드리지 않는다.

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
copyFileSync(join(PROJECT, 'balance.json'), join(OUT, 'balance.json'));
for (const f of bal.levels) {
  mkdirSync(dirname(join(OUT, f)), { recursive: true });
  copyFileSync(join(PROJECT, f), join(OUT, f));
}
copyFileSync(join(PROJECT, 'assets/app-icon.svg'), join(OUT, '../icon.svg'));
console.log(`balance.json + ${bal.levels.length} levels + icon.svg 복사`);

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

// 3) art (30-art.md 2절 팔레트, 6절 클리어 색)
{
  const md = readFileSync(join(PROJECT, '30-art.md'), 'utf8');
  const s21 = md.slice(md.indexOf('### 2-1.'), md.indexOf('### 2-2.'));
  const s22 = md.slice(md.indexOf('### 2-2.'), md.indexOf('### 2-3.'));
  const hexes = (s) => [...s.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase());
  const palette = { level1: {}, level2: {}, level3: {} };
  for (const line of s21.split('\n')) {
    const c = cells(line);
    const m = /^`(\w+)`$/.exec(c[0] ?? '');
    if (!m) continue;
    const h = hexes(c.slice(2).join('|'));
    if (h.length !== 3) continue;
    palette.level1[m[1]] = h[0]; palette.level2[m[1]] = h[1]; palette.level3[m[1]] = h[2];
  }
  const common = {};
  for (const line of s22.split('\n')) {
    const c = cells(line);
    if (!c[0]?.startsWith('`')) continue;
    const keys = [...c[0].matchAll(/`(\w+)`/g)].map((m) => m[1]);
    const h = hexes(c[c.length - 1]);
    if (keys.length && keys.length === h.length) keys.forEach((k, i) => (common[k] = h[i]));
  }
  // 클리어 색: 6절 표의 "클리어" 행에서 levelN 뒤의 색들
  const clearLine = md.split('\n').find((l) => l.startsWith('| 클리어')) ?? '';
  const clear = {};
  for (const n of [1, 2, 3]) {
    const seg = clearLine.split(`level${n}`)[1]?.split(/level\d/)[0] ?? '';
    clear[`level${n}`] = hexes(seg);
  }
  const needEnv = ['bg', 'bgFar', 'bgPulse', 'bgAccent', 'ground'];
  const needCommon = ['outline', 'groundEdge', 'hazard', 'player', 'playerCore', 'playerAccent', 'trigger', 'gateSlow', 'gateNormal', 'gateFast', 'hud'];
  for (const lv of Object.values(palette)) for (const k of needEnv) if (!lv[k]) throw new Error(`palette: ${k} 없음`);
  for (const k of needCommon) if (!common[k]) throw new Error(`palette common: ${k} 없음`);
  for (const [k, v] of Object.entries(clear)) if (!v.length) throw new Error(`clear 색 없음: ${k}`);
  writeFileSync(join(OUT, 'art.json'), JSON.stringify({ _source: 'projects/runner-01/30-art.md 2절·6절 (sync-data.mjs 생성, 직접 고치지 말 것)', palette, common, clear }, null, 1) + '\n');
  console.log(`art.json: 레벨 팔레트 ${Object.keys(palette.level1).length}색 x3, 공통 ${Object.keys(common).length}색`);
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
