#!/usr/bin/env node
// 콤보 판정 탭 목록 생성기 (runner-01, balance-designer round-2 콤보)
//
//   node projects/runner-01/tools/build-judge-taps.mjs            # 10레벨 전부, levels/*.json 의 judge_taps 를 다시 씀
//   node projects/runner-01/tools/build-judge-taps.mjs 06 07      # 일부 레벨만
//   node projects/runner-01/tools/build-judge-taps.mjs --check    # 쓰지 않고, 지금 JSON 의 judge_taps 가 다시 만든 값과 같은지만 확인
//
// 하는 일
//   verify-levels.mjs 가 찾은 "사람이 노릴 입력열"(박자에 맞춘 필수 탭)을 판정 탭으로 삼는다.
//   탭마다 설계 박 시각(가장 가까운 반박)과, 그 박 기준 판정 창을 적는다.
//     safe_early_ms / safe_late_ms : 그 탭 하나만 옮겼을 때 살아남는 범위 (검증기 창을 박 기준으로 옮긴 것, 물리값)
//     early_ms / late_ms           : 콤보 판정 창 = safe + balance.combo.judge_pad_ms, 같은 종류 이웃 탭과 겹치면 두 박의 가운데에서 자름,
//                                    balance.combo.judge_max_ms 를 넘지 않음
//   레벨 JSON 의 다른 내용은 한 글자도 바꾸지 않는다(마지막 "objects" 배열 뒤에 judge_taps 배열만 붙이거나 바꿈).
//   build-levels.mjs 로 레벨을 다시 만들면 judge_taps 가 사라지므로 이 스크립트를 다시 돌린다.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyLevel, loadBalance } from './verify-levels.mjs';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function judgeTapsFor(levelPath, bal, v = verifyLevel(levelPath, bal)) {
  if (!v.clearable) throw new Error(`${levelPath}: 클리어 불가 — 판정 탭을 만들 수 없음`);
  const c = bal.combo;
  const beatS = 60 / v.bpm;
  const rows = v.inputs.map((r, i) => {
    const beat = Math.round(r.beat * 2) / 2;
    const t_s = beat * beatS;
    const off = (r.tick / bal.physics_hz - t_s) * 1000; // 탭 틱 − 박 (ms)
    const safe_early = r.early_ms - off, safe_late = r.late_ms + off;
    return { i, kind: r.kind, beat, t_s, safe_early, safe_late,
      early: Math.min(c.judge_max_ms, safe_early + c.judge_pad_ms), late: Math.min(c.judge_max_ms, safe_late + c.judge_pad_ms) };
  });
  // 같은 종류 이웃과 겹치면 두 박 가운데에서 자름
  for (const kind of ['ground', 'orb']) {
    const g = rows.filter((r) => r.kind === kind);
    for (let j = 1; j < g.length; j++) {
      const a = g[j - 1], b = g[j];
      const gap = (b.t_s - a.t_s) * 1000;
      if (a.late + b.early >= gap) { const half = gap / 2 - 0.5; a.late = Math.min(a.late, half); b.early = Math.min(b.early, half); }
    }
  }
  const f1 = (x) => +x.toFixed(1);
  return rows.map((r) => ({ i: r.i, kind: r.kind, beat: r.beat, t_s: +r.t_s.toFixed(4),
    early_ms: f1(r.early), late_ms: f1(r.late), safe_early_ms: f1(r.safe_early), safe_late_ms: f1(r.safe_late) }));
}

// "objects" 배열 뒤에 judge_taps 를 붙인 JSON 텍스트 (기존 judge_taps 는 지우고 다시)
export function withJudgeTaps(text, taps) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  let t = text.replace(/,\s*"judge_taps":\s*\[[\s\S]*?\n\s*\]/, '');
  const end = t.lastIndexOf('}');
  const body = t.slice(0, end).replace(/\s+$/, '');
  const arr = `  "judge_taps": [${eol}${taps.map((x) => '    ' + JSON.stringify(x)).join(',' + eol)}${eol}  ]`;
  return `${body},${eol}${arr}${eol}}${eol}`;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const only = args.filter((a) => !a.startsWith('--'));
  const bal = loadBalance();
  if (!bal.combo) throw new Error('balance.json 에 combo 절이 없음');
  let bad = 0;
  for (const f of bal.levels) {
    const path = join(PROJECT, f);
    const text = readFileSync(path, 'utf8');
    const level = JSON.parse(text);
    if (only.length && !only.includes(level.id)) continue;
    const taps = judgeTapsFor(path, bal);
    const out = withJudgeTaps(text, taps);
    // 안전 확인: judge_taps 말고는 같은 JSON 이어야 함
    const a = JSON.parse(out); delete a.judge_taps; const b = JSON.parse(text); delete b.judge_taps;
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${f}: judge_taps 외의 내용이 바뀜`);
    const minGap = Math.min(...taps.slice(1).map((t, j) => (t.t_s - taps[j].t_s) * 1000));
    const narrow = taps.filter((t) => Math.min(t.safe_early_ms, t.safe_late_ms) < 100).length;
    const msg = `${level.id}: 판정 탭 ${taps.length} (고리 ${taps.filter((t) => t.kind === 'orb').length}), 가장 가까운 두 탭 ${minGap.toFixed(0)} ms, 살아남는 창이 ±100 ms보다 좁은 탭 ${narrow}`;
    if (check) {
      const same = JSON.stringify(level.judge_taps ?? null) === JSON.stringify(taps);
      if (!same) bad++;
      console.log(`${same ? 'SAME' : 'DIFF'} ${msg}`);
    } else {
      writeFileSync(path, out);
      console.log(`쓰기 ${msg}`);
    }
  }
  if (check) { console.log(bad ? `\n결과: DIFF ${bad}` : '\n결과: ALL SAME'); process.exitCode = bad ? 1 : 0; }
}
