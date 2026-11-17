#!/usr/bin/env node
// rhythm-02 웹 빌드 자체 확인(node, 브라우저 없음)
//   node projects/rhythm-02/tools/selfcheck-sim.mjs [--n 2000]
// 1) 빌드 판정·곡 모듈 = 기준 구현(byte 동일), 빌드 data = 기획 원본(byte 동일)
// 2) 레벨마다: 완벽 입력열 클리어(등급 3) / 무입력 늦음 실패(첫 접촉 통과 창 끝) / 놓침 구역 탭 일찍 실패 / 재시작 배분 1.1 s
// 3) 빌드 시도 진행(core.js Attempt: 탭 하나씩 + 고정 스텝 틱) = judgeAttempt 한 번에(봇 σ70 탭 N회) 불일치 0
// 4) 연습 체크포인트 이어 하기: 모든 체크포인트에서 완벽 입력으로 끝까지 클리어
// 5) 화면 배치 식(games js/layout.js) = tools/art/layout.mjs compute (4해상도), 소리 맞추기·밀림 감지 계산 예
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = resolve(PROJ, '../../games/rhythm-02');
const imp = (p) => import(pathToFileURL(p).href);
const args = process.argv.slice(2);
const N = +(args.includes('--n') ? args[args.indexOf('--n') + 1] : 2000);

const J = await imp(join(GAME, 'js/judge.js'));
const Core = await imp(join(GAME, 'js/core.js'));
const Calc = await imp(join(GAME, 'js/calc.js'));
const Lay = await imp(join(GAME, 'js/layout.js'));
const Bots = await imp(join(PROJ, 'tools/sim/bots.mjs'));
const ArtLay = await imp(join(PROJ, 'tools/art/layout.mjs'));
const bal = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
const LY = JSON.parse(readFileSync(join(PROJ, 'assets/layout.json'), 'utf8'));
const levels = bal.levels.map((p) => JSON.parse(readFileSync(join(PROJ, p), 'utf8')));
const Ls = levels.map((lv) => J.compileLevel(lv, bal));

let pass = 0, fail = 0;
const check = (name, ok, msg) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${name}: ${msg}`); ok ? pass++ : fail++; };
const same = (a, b) => readFileSync(a).equals(readFileSync(b));

console.log('== 1) 모듈·데이터 동일 ==');
check('M1', same(join(GAME, 'js/judge.js'), join(PROJ, 'tools/sim/judge.mjs')), 'games/rhythm-02/js/judge.js = tools/sim/judge.mjs (byte)');
check('M2', same(join(GAME, 'js/music.js'), join(PROJ, 'tools/art/music.mjs')), 'games/rhythm-02/js/music.js = tools/art/music.mjs (byte)');
{
  const pairs = [['balance.json', 'balance.json'], ['strings.json', 'strings.json'], ['assets/palette.json', 'palette.json'], ['assets/layout.json', 'layout.json'], ['assets/sound.json', 'sound.json'], ...bal.levels.map((p) => [p, 'levels/' + p.split('/').pop()])];
  const bad = pairs.filter(([a, b]) => !same(join(PROJ, a), join(GAME, 'data', b)));
  check('M3', !bad.length, `data/ ${pairs.length}개 = 기획 원본${bad.length ? ' 다름: ' + bad.map((x) => x[0]).join(',') : ''}`);
  const cards = readdirSync(join(PROJ, 'assets/cards')).filter((f) => f.endsWith('.svg'));
  const miss = cards.filter((f) => !readdirSync(join(GAME, 'data/cards')).includes(f));
  check('M4', !miss.length, `카드 그림 ${cards.length}장 복사`);
}

// 빌드 경로 흉내: 탭을 시간 순으로 하나씩 넣고 사이사이 고정 스텝 틱(4 ms, 늦음 선언 유예 34 ms)
function runBuild(L, taps, { fromMs = 0, carried = 0 } = {}) {
  const a = new Core.Attempt(L, { fromMs, carried });
  const ts = [...taps].sort((x, y) => x - y);
  let k = 0;
  const end = L.durationMs + 2000;
  for (let J0 = fromMs - 800; J0 <= end && a.status === 'run'; J0 += 4) {
    while (k < ts.length && ts[k] <= J0 && a.status === 'run') a.tap(ts[k++]);
    if (a.status === 'run') a.tick(J0 - 34);
  }
  return a;
}
const resKey = (r) => (r.clear ? 'clear' : `${r.reason}@${r.failIndex}@${Math.round(r.failTimeMs * 1000)}`);

console.log('\n== 2) 레벨별 기본 ==');
Ls.forEach((L, li) => {
  const id = L.level.id, cs = L.contacts, judge = L.judge;
  const perfect = cs.map((c) => c.t);
  const r = J.judgeAttempt(L, perfect), rate = J.gradeRating(L, r, bal.grade_rule);
  const b = runBuild(L, perfect);
  const none = J.judgeAttempt(L, []);
  const early = J.judgeAttempt(L, [cs[0].zoneStart + 1]);
  const ph = J.restartPhases(L, none, bal), phE = J.restartPhases(L, early, bal);
  const endOk = ph.ball_reappear_on_drum[1] === bal.restart.restart_delay_s && phE.ball_reappear_on_drum[1] === bal.restart.restart_delay_s;
  const lastTap = J.judgeAttempt(L, perfect.slice(0, -1).concat(cs[cs.length - 1].passEnd - 0.5));
  check(`L${id}`, r.clear && rate === 3 && b.status === 'clear' && b.rating(bal.grade_rule) === 3 && !none.clear && none.reason === 'late' && none.failIndex === 0 && none.failTimeMs === cs[0].passEnd
    && early.reason === 'early' && endOk && lastTap.clear,
    `완벽 입력 클리어 등급 ${rate}(빌드 ${b.status}) · 무입력 늦음 @접촉0 ${none.failTimeMs.toFixed(0)} ms · 놓침 구역 탭 ${early.reason} · 재시작 배분 끝 ${ph.ball_reappear_on_drum[1]}/${phE.ball_reappear_on_drum[1]} s · 마지막 접촉 통과 창 끝 -0.5 ms 클리어 ${lastTap.clear} · 통과 -${judge.pass_early_ms}/+${judge.pass_late_ms}`);
  // 무입력 실패 → 다음 판정 접촉까지(재시작 1.1 s + 첫 접촉)
  const toNext = bal.restart.restart_delay_s + cs[0].t / 1000;
  check(`L${id} V10`, toNext <= bal.verify.fail_to_next_contact_max_s, `실패 → 다음 판정 접촉 ${toNext.toFixed(2)} s ≤ ${bal.verify.fail_to_next_contact_max_s}`);
  // ballsAt: 탭 전 공이 북을 떠나지 않음(늦게 친 탭, 접촉 시각과 탭 사이)
  const lateHits = cs.map((c) => c.t + judge.pass_late_ms - 5);
  let leaves = 0;
  for (const c of cs) {
    const t = c.t + (judge.pass_late_ms - 5) / 2;
    const bs = J.ballsAt(L, t, lateHits).filter((x) => x.ball === c.ball);
    if (!bs.length || bs[0].state !== 'waiting') leaves++;
  }
  check(`L${id} D3`, leaves === 0, `늦게 친 탭 ${cs.length}개: 탭 전까지 공이 가죽 위에서 기다림(떠난 공 ${leaves})`);
  if (li === 0) {
    const fs = J.fingerSchedule(L, bal, null);
    check('L01 손가락', !!fs && fs.pressStart >= cs[0].t - judge.pass_early_ms && fs.gone <= cs[1].zoneStart, `fingerSchedule 등장 ${fs.from.toFixed(0)} · 누름 ${fs.pressStart.toFixed(0)} · 사라짐 늦어도 ${fs.gone.toFixed(0)} < 다음 놓침 구역 ${cs[1].zoneStart.toFixed(0)}`);
  }
});

console.log(`\n== 3) 빌드 시도 진행 = judgeAttempt (σ70 봇 탭 ${N}회/레벨 + 연타) ==`);
{
  let total = 0, mism = 0, clears = 0;
  const prof = bal.bots.profiles.child_sd70;
  Ls.forEach((L, li) => {
    const rng = Bots.makeRng(bal.verify.seed + li);
    for (let n = 0; n < N; n++) {
      const taps = Bots.botTaps(L, n % 3 === 0 ? bal.bots.profiles.novice_sd50 : prof, rng, { extraAfter: bal.bots.extra_tap_after_s, along: n % 5 === 0 ? bal.bots.along : null });
      const ref = J.judgeAttempt(L, taps), got = runBuild(L, taps).res;
      total++; if (resKey(ref) !== resKey(got)) mism++; if (ref.clear) clears++;
    }
    for (let per = 40; per <= 200; per += 20) { // 연타(일정 간격 마구 치기)
      const taps = []; for (let t = -500; t < L.durationMs; t += per) taps.push(t);
      const ref = J.judgeAttempt(L, taps), got = runBuild(L, taps).res;
      total++; if (resKey(ref) !== resKey(got)) mism++;
    }
  });
  check('C1', mism === 0, `${total}회 재판정 불일치 ${mism} (클리어 ${clears})`);
}

console.log('\n== 4) 연습 체크포인트 ==');
Ls.forEach((L) => {
  const cps = Core.checkpoints(L);
  let ok = 0;
  for (const cp of cps) {
    const taps = L.contacts.slice(cp.firstContact).map((c) => c.t);
    const a = runBuild(L, taps, { fromMs: cp.t, carried: cp.firstContact });
    if (a.status === 'clear') ok++;
  }
  const fi = L.contacts.length - 1, cp = Core.checkpointFor(L, fi);
  check(`L${L.level.id} P`, ok === cps.length && cp.firstContact <= fi, `체크포인트 ${cps.length}곳(받침 쉼) 모두 이어서 클리어 · 마지막 접촉 실패 → ${(cp.t / 1000).toFixed(2)} s 받침 쉼에서 다시`);
});

console.log('\n== 5) 화면 배치·보조 계산 ==');
{
  const RES = bal.verify.layout_resolutions;
  let diff = 0; const rows = [];
  for (const [W, H, st, sb] of RES) {
    const a = Lay.geom(LY, W, H, st, sb), b = ArtLay.compute(LY, W, H, st, sb);
    for (const k of Object.keys(b)) if (typeof b[k] === 'number' && Math.abs(a[k] - b[k]) > 1e-9) diff++;
    rows.push(`${W}x${H} d ${a.d} Hp ${a.Hp.toFixed(0)} 가죽 y ${a.skinY.toFixed(0)}`);
  }
  check('G1', diff === 0, `js/layout.js geom = tools/art/layout.mjs compute (${rows.join(' · ')})`);
  const C = bal.sound_sync, vc = bal.judge_clock.visual_comp_ms;
  const mk = (base) => Array.from({ length: C.taps_per_round }, (_, k) => base + (k % 3) * 4 - 4);
  const r1 = Calc.syncResult([mk(160), mk(170)], C, vc), r2 = Calc.syncResult([mk(50), mk(52)], C, vc), r3 = Calc.syncResult([mk(160), mk(260)], C, vc);
  const wild = [100, 100, -200, 300, -150, 250, 100, 100]; // 3번째 탭부터 6개가 크게 흩어짐
  const r4 = Calc.syncRound(wild, C), r5 = Calc.syncResult([mk(700), mk(700)], C, vc);
  check('S1', r1.ok && r1.apply && Math.abs(r1.offset - (165 - vc)) <= 5 && r2.ok && !r2.apply && r2.offset === 0 && !r3.ok && r3.why === 'disagree' && !r4.ok && r5.offset === C.offset_clamp_ms[1],
    `소리 맞추기: +165 ms → 오프셋 ${r1.offset}(= 중앙값 − visual_comp ${vc}) · +51 → ${r2.raw.toFixed(0)} ≤ ${C.apply_only_if_abs_over_ms} 적용 안 함 · 두 회 차이 100 → 다시 · IQR ${r4.iqr.toFixed(0)} > ${C.reject_iqr_ms} 그 회 다시 · 큰 값 → ${r5.offset}(자름)`);
  const D2 = bal.drift_check;
  const st = Calc.driftNew();
  let fired = false;
  for (let k = 0; k < 16; k++) fired = Calc.driftFeed(st, 90, 3, D2);
  const st2 = Calc.driftNew(); let f2 = false;
  for (let k = 0; k < 16; k++) f2 = Calc.driftFeed(st2, 90, 2, D2);
  const st3 = Calc.driftNew(); let f3 = false;
  for (let k = 0; k < 16; k++) f3 = Calc.driftFeed(st3, k < 8 ? 90 : 10, 5, D2);
  check('S2', fired && !f2 && !f3, `밀림 감지: +90 ms 16탭·시도 3 → 켬 ${fired} · 시도 2 → ${f2} · 둘째 창 +10 → ${f3} (창 ${D2.window_taps}탭 ≥ +${D2.trigger_median_late_ms} × ${D2.consecutive_windows})`);
  check('S3', Calc.median([1, 2, 3, 4]) === 2.5 && Calc.quantile([1, 2, 3, 4, 5], 0.25) === 2, '중앙값(짝수 = 가운데 둘 평균)·분위수 type 7');
}

console.log(`\n검사 ${pass + fail}개 중 PASS ${pass}, FAIL ${fail}`);
console.log(fail ? 'FAIL' : 'ALL PASS');
process.exit(fail ? 1 : 0);
