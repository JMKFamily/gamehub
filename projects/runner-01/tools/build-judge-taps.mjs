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
//   고리 탭(kind orb)만 "고리에 닿은 구간" 기준 창 (round-3, 오케스트레이터 결정 21 = 20-balance 15-10-6 ②안, balance.combo.orb_window "contact"):
//     바로 앞 지면 탭을 ±judge_max_ms 안에서 옮겨 보고, 그때마다 고리를 누를 수 있는(ev & 2) 틱 중 그 뒤 기준 궤적에 다시 합쳐지는
//     (= 살아남는) 틱을 모두 모아, 가장 이른·늦은 틱을 판정 창 끝으로 쓴다. 앞 탭이 어긋나 고리에 닿는 시각이 옮겨져도
//     살아남은 고리 점프는 언제나 판정 창 안에 든다(창 밖 생존 고리 탭 0). 등급·%의 Δ는 그대로 박 기준.
//     고리 탭 창은 judge_max_ms 상한을 쓰지 않는다(같은 종류 이웃과 겹치면 가운데에서 자르는 규칙은 그대로).
//     고리 바로 앞 지면 탭도, 고리를 함께 다시 맞추면 살아남는 범위까지 창을 넓힌다(basis orb_pair, 상한 judge_max_ms).
//   레벨 JSON 의 다른 내용은 한 글자도 바꾸지 않는다(마지막 "objects" 배열 뒤에 judge_taps 배열만 붙이거나 바꿈).
//   build-levels.mjs 로 레벨을 다시 만들면 judge_taps 가 사라지므로 이 스크립트를 다시 돌린다.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyLevel, loadBalance, compileLevel, step, simulate } from './verify-levels.mjs';
import { keyOf } from '../../../games/reverbound/js/physics.js';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 고리 탭 i의 "고리에 닿은 구간" 창: 살아남는 고리 점프 틱 [kmin, kmax]와, 그 고리 점프로 살아남을 수 있는 앞 지면 탭 틱 범위 [gmin, gmax]
export function orbContactWindow(L, presses, i, bal) {
  const hz = bal.physics_hz, maxD = Math.round((bal.combo.judge_max_ms / 1000) * hz);
  const base = simulate(L, presses, { trace: true });
  const g0 = presses[i - 1], o0 = presses[i];
  const prevT = i >= 2 ? presses[i - 2] : -1;
  const after = presses.slice(i + 1);
  // 상태 s로 틱 k부터 뒤 탭(after)만 눌러 진행: 기준 궤적과 다시 합쳐지거나(o0 뒤) 클리어하면 생존
  const survives = (s, k) => {
    const set = new Set(after);
    for (; k < L.nTicks; k++) {
      if (k > o0 && base.states[k] && keyOf(s) === keyOf(base.states[k])) return true;
      const p = set.has(k);
      const r = step(L, s, k, p, p);
      if (r.dead) return false;
      if (r.clear) return true;
      s = r.s;
    }
    return false;
  };
  let kmin = Infinity, kmax = -Infinity, gmin = Infinity, gmax = -Infinity;
  for (let g = g0 - maxD; g <= g0 + maxD; g++) {
    if (g <= prevT) continue;
    let k = Math.min(g, g0), s = base.states[k];
    for (; k < g; k++) { const r = step(L, s, k, false, false); if (r.dead) { s = null; break; } s = r.s; }
    if (!s) continue;
    const j = step(L, s, g, true, true);
    if (j.dead || !(j.ev & 1)) continue;
    s = j.s;
    let ok = false;
    for (k = g + 1; k < g + hz; k++) {
      const t = step(L, s, k, true, true);
      if (!t.dead && (t.ev & 2) && survives(t.s, k + 1)) { ok = true; if (k < kmin) kmin = k; if (k > kmax) kmax = k; }
      const r = step(L, s, k, false, false);
      if (r.dead || r.s.g) break;
      s = r.s;
    }
    if (ok) { if (g < gmin) gmin = g; if (g > gmax) gmax = g; }
  }
  return { kmin, kmax, gmin, gmax };
}

export function judgeTapsFor(levelPath, bal, v = verifyLevel(levelPath, bal)) {
  if (!v.clearable) throw new Error(`${levelPath}: 클리어 불가 — 판정 탭을 만들 수 없음`);
  const c = bal.combo;
  const beatS = 60 / v.bpm;
  const hz = bal.physics_hz;
  const contact = c.orb_window === 'contact';
  const L = contact ? compileLevel(JSON.parse(readFileSync(levelPath, 'utf8')), bal) : null;
  const presses = v.inputs.map((r) => r.tick);
  const rows = v.inputs.map((r, i) => {
    const beat = Math.round(r.beat * 2) / 2;
    const t_s = beat * beatS;
    const off = (r.tick / hz - t_s) * 1000; // 탭 틱 − 박 (ms)
    const safe_early = r.early_ms - off, safe_late = r.late_ms + off;
    const row = { i, kind: r.kind, beat, t_s, safe_early, safe_late,
      early: Math.min(c.judge_max_ms, safe_early + c.judge_pad_ms), late: Math.min(c.judge_max_ms, safe_late + c.judge_pad_ms) };
    if (contact && r.kind === 'orb') {
      if (i === 0 || v.inputs[i - 1].kind !== 'ground') throw new Error(`${levelPath}: 고리 탭 ${i} 앞이 지면 탭이 아님`);
      const w = orbContactWindow(L, presses, i, bal);
      if (!Number.isFinite(w.kmin)) throw new Error(`${levelPath}: 고리 탭 ${i} 살아남는 고리 점프 없음`);
      row.basis = 'contact';
      row.early = Math.max(row.early, (t_s - w.kmin / hz) * 1000);
      row.late = Math.max(row.late, (w.kmax / hz - t_s) * 1000);
      row.contact = w;
    }
    return row;
  });
  // 고리 바로 앞 지면 탭: 고리 탭을 함께 다시 맞추면 살아남는 범위(gmin~gmax)가 "그 탭 하나만 옮긴" 살아남는 창보다 넓다.
  // 그 범위까지 판정 창을 넓혀(상한 judge_max_ms) 창 밖에서 살아남는 지면 탭도 0으로 만든다 (basis orb_pair)
  for (const r of rows) {
    if (!r.contact) continue;
    const g = rows[r.i - 1], tg = g.t_s;
    const e = Math.min(c.judge_max_ms, Math.max(g.early, (tg - r.contact.gmin / hz) * 1000));
    const l = Math.min(c.judge_max_ms, Math.max(g.late, (r.contact.gmax / hz - tg) * 1000));
    if (e > g.early + 1e-9 || l > g.late + 1e-9) { g.early = e; g.late = l; g.basis = 'orb_pair'; }
  }
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
  // 0.1 ms 반올림이 창을 줄이지 않게 올림 (창 끝 틱이 반올림으로 빠지지 않음, 나머지는 edge_tol_ms)
  const c1 = (x) => Math.ceil(x * 10 - 1e-6) / 10;
  return rows.map((r) => ({ i: r.i, kind: r.kind, beat: r.beat, t_s: +r.t_s.toFixed(4),
    early_ms: r.basis ? c1(r.early) : f1(r.early), late_ms: r.basis ? c1(r.late) : f1(r.late), safe_early_ms: f1(r.safe_early), safe_late_ms: f1(r.safe_late),
    ...(r.basis ? { basis: r.basis } : {}) }));
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
