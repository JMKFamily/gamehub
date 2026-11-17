#!/usr/bin/env node
// 연습 모드 자동 체크포인트 갇힘 검사 (개발 자체 확인, 오케스트레이터 결정 11)
//   node projects/runner-01/tools/practice-check.mjs [세션 수=40]
// 1) 정적 검사: 레벨마다 모든 안전 지점에서 (a) 입력 없이 checkpoint_min_lead_s 이상 살아 있고 (b) 같은 입력열로 끝까지 깰 수 있음
// 2) 봇 반복: 5~6세 대리 봇(σ70, 놓침 3 %, 헛탭 2 %, 누름 100 ms)이 game.js 연습 모드로 클리어할 때까지 반복.
//    "갇힘" = 부활 뒤 아무것도 누르지 않았는데 죽음. 0이어야 함. 한 체크포인트에서 연속 사망 최대값도 기록
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileLevel, step, simulate } from '../../../games/reverbound/js/physics.js';
import { createGame } from '../../../games/reverbound/js/game.js';
import { safePoints } from '../../../games/reverbound/js/practice.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'games/reverbound/data');
const read = (p) => JSON.parse(readFileSync(join(DATA, p), 'utf8'));
const bal = read('balance.json'), inputs = read('test-inputs.json'), cfg = read('practice.json');
const SESS = +(process.argv[2] || 40), CAP = 5000;
const hz = bal.physics_hz, lead = Math.round(cfg.checkpoint_min_lead_s * hz);
let seed = 4242;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const P = { sd: 70, miss: 0.03, extra: 0.02, hold: 24 };

let fail = 0;
const rows = [];
for (const f of bal.levels) {
  const level = read(f), L = compileLevel(level, bal), rec = inputs.levels[level.id];
  const traces = cfg.traces.map((k) => rec[k]);
  const safe = safePoints(L, traces, cfg);
  // 1) 정적 검사
  let nPts = 0, badNoInput = 0, badClear = 0;
  for (const taps of traces) {
    const tr = simulate(L, taps, { trace: true });
    for (const [k, arr] of safe) for (const e of arr) {
      const s = tr.states[k];
      if (!s || Math.abs(s.y - e.y) > 1e-9 || !s.g) continue;
      nPts++;
      const ni = simulate(L, [], { from: { k, s } });
      if (!ni.ok && ni.k - k < lead) badNoInput++;
      const cont = simulate(L, taps.filter((t) => t >= k), { from: { k, s } });
      if (!cont.ok) badClear++;
    }
  }
  // 2) 봇 반복 (연습 모드, game.js)
  let traps = 0, maxStreak = 0, attemptsSum = 0, cpSum = 0, unclear = 0;
  const base = rec.taps;
  for (let n = 0; n < SESS; n++) {
    let k0 = 0, pressed = false, streak = 0, lastCp = -1;
    const g = createGame(bal, {
      onAttempt() {
        k0 = g.k; pressed = false;
        for (const t of base) {
          if (t < k0 || rnd() < P.miss) continue;
          const tt = Math.max(k0, Math.round(t + (gauss() * P.sd / 1000) * hz));
          g.press(tt); g.release(tt + P.hold);
          if (rnd() < P.extra) { const x = Math.round(t + (0.15 + rnd() * 0.3) * hz); g.press(x); g.release(x + P.hold); }
        }
      },
      onDeath(d) {
        // 이번 시도에서 실제로 눌린 입력이 있었는지: 큐에서 이미 소비된 press 가 있었으면 pressed
        if (!pressed && d.k - k0 < lead) traps++;
        const cp = g.checkpoints.length ? g.checkpoints[g.checkpoints.length - 1].k : 0;
        if (cp === lastCp) streak++; else { streak = 1; lastCp = cp; }
        if (streak > maxStreak) maxStreak = streak;
      },
    });
    const origStep = g.advance;
    g.start(L, 0, { practice: true, safe });
    let guard = 0;
    while (g.state !== 'clear' && g.attempts < CAP && guard++ < 5e7) {
      const before = g.queue.filter((e) => e.down).length;
      origStep(1 / 60);
      if (g.state === 'playing' || g.state === 'dead') { const after = g.queue.filter((e) => e.down).length; if (after < before) pressed = true; }
    }
    if (g.state !== 'clear') unclear++;
    attemptsSum += g.attempts; cpSum += g.checkpoints.length;
  }
  const ok = badNoInput === 0 && badClear === 0 && traps === 0 && unclear === 0 && safe.size > 0;
  if (!ok) fail++;
  rows.push({ id: level.id, safe_points: safe.size, checked: nPts, no_input_death_within_lead: badNoInput, not_clearable: badClear, bot_trap_deaths: traps, bot_unclear: unclear, bot_avg_attempts: +(attemptsSum / SESS).toFixed(1), bot_max_deaths_same_cp: maxStreak, avg_checkpoints: +(cpSum / SESS).toFixed(1) });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${level.id} 안전 지점 ${safe.size}곳 (검사 ${nPts}) | 입력 없이 ${cfg.checkpoint_min_lead_s}s 안 사망 ${badNoInput}, 못 깸 ${badClear} | σ70 봇 ${SESS}세션: 갇힘 ${traps}, 미클리어 ${unclear}, 평균 시도 ${(attemptsSum / SESS).toFixed(1)}, 평균 체크포인트 ${(cpSum / SESS).toFixed(1)}, 같은 지점 연속 사망 최대 ${maxStreak}`);
}
// 음성 대조: 여유 규칙(min_lead)을 빼면 갇힘 지점이 실제로 생기는지 (검사가 의미 있는지 확인)
{
  let n = 0, bad = 0;
  for (const f of bal.levels) {
    const level = read(f), L = compileLevel(level, bal), taps = inputs.levels[level.id].taps;
    const tr = simulate(L, taps, { trace: true });
    for (const [k] of safePoints(L, [taps], { ...cfg, checkpoint_min_lead_s: 0 })) { n++; const r = simulate(L, [], { from: { k, s: tr.states[k] } }); if (!r.ok && r.k - k < lead) bad++; }
  }
  console.log(`음성 대조 (여유 규칙 없이 착지·정박만): 후보 ${n}곳 중 입력 없이 ${cfg.checkpoint_min_lead_s}s 안에 죽는 곳 ${bad}곳 → 여유 규칙이 이것을 걸러 냄`);
}
console.log(fail ? `\n결과: FAIL ${fail}` : '\n결과: ALL OK');
process.exitCode = fail ? 1 : 0;
void step;
