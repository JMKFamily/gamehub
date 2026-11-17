#!/usr/bin/env node
// rhythm-02 웹 빌드 자체 확인(node, 브라우저 없음) — round-2 "흘러오는 길" + 콤보
//   node projects/rhythm-02/tools/selfcheck-sim.mjs [--n 2000]
// 1) 빌드 판정·곡 모듈 = 기준 구현(byte 동일), 빌드 data = 기획 원본(byte 동일), 카드 16장
// 2) 레벨마다: 완벽 입력열(hit 접촉만, 지붕은 안 침) 클리어 등급 3 / 무입력 늦음 / 놓침 구역 일찍 / 지붕 밑 착지 탭 bump_roof / 재시작 세 판 1.1 s
// 3) 빌드 시도 진행(core.js Attempt: 탭 하나씩 + 고정 스텝 틱) = judgeAttempt 한 번에(봇 σ70·σ50 + q_nogo + 연타) 불일치 0
// 4) 콤보: comboEvents 값 = grades 길이(hold 포함), 화음 정박이 어느 접촉 위험 구간에도 없음, 콤보 켬/끔(빌드 경로에서 comboNow 를 부르든 안 부르든) 판정 불일치 0
// 5) 연습 체크포인트·이어 하기(resumePoint): 모든 체크포인트·멈춤 시각(50 ms 간격)에서 이어서 완벽 입력 클리어, 이어 한 직후 다음 접촉까지 ≥ 450 ms
// 6) 화면 배치 식(games js/layout.js geom) = tools/art/layout.mjs compute (4해상도, 상자 포함), 세상 x = worldX, 소리 맞추기 무시 구간 없음·밀림 감지
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
const hitTaps = (L, from = 0, off = 0) => L.contacts.filter((c) => c.kind !== 'nogo' && c.i >= from).map((c) => c.t + off);

console.log('== 1) 모듈·데이터 동일 ==');
check('M1', same(join(GAME, 'js/judge.js'), join(PROJ, 'tools/sim/judge.mjs')), 'games/rhythm-02/js/judge.js = tools/sim/judge.mjs (byte)');
check('M2', same(join(GAME, 'js/music.js'), join(PROJ, 'tools/art/music.mjs')), 'games/rhythm-02/js/music.js = tools/art/music.mjs (byte)');
{
  const pairs = [['balance.json', 'balance.json'], ['strings.json', 'strings.json'], ['assets/palette.json', 'palette.json'], ['assets/layout.json', 'layout.json'], ['assets/sound.json', 'sound.json'], ...bal.levels.map((p) => [p, 'levels/' + p.split('/').pop()])];
  const bad = pairs.filter(([a, b]) => !same(join(PROJ, a), join(GAME, 'data', b)));
  check('M3', !bad.length, `data/ ${pairs.length}개 = 기획 원본${bad.length ? ' 다름: ' + bad.map((x) => x[0]).join(',') : ''}`);
  const cards = readdirSync(join(PROJ, 'assets/cards')).filter((f) => f.endsWith('.svg'));
  const have = readdirSync(join(GAME, 'data/cards'));
  const keys = Object.values(bal.gimmicks).filter((g) => g && g.card).map((g) => g.card);
  const need = keys.flatMap((k) => [`${k}.svg`, `${k}_portrait.svg`]);
  check('M4', cards.every((f) => have.includes(f)) && need.every((f) => have.includes(f)), `카드 그림 ${cards.length}장 복사, balance gimmicks 카드 ${keys.length}개 × 가로·세로판 모두 있음`);
}

// 빌드 경로 흉내: 탭을 시간 순으로 하나씩 넣고 사이사이 고정 스텝 틱(4 ms, 늦음 선언 유예 17 ms). combo = true 면 틱마다 콤보 수도 계산(그리기와 같은 경로)
function runBuild(L, taps, { fromMs = 0, startIndex = 0, carried = null, combo = false } = {}) {
  const a = new Core.Attempt(L, { fromMs, startIndex, carried });
  const ts = [...taps].sort((x, y) => x - y);
  let k = 0, maxShown = 0;
  const end = L.durationMs + 2000;
  for (let J0 = fromMs - 800; J0 <= end && a.status === 'run'; J0 += 4) {
    while (k < ts.length && ts[k] <= J0 && a.status === 'run') a.tap(ts[k++]);
    if (a.status === 'run') a.tick(J0 - 17);
    if (combo) maxShown = Math.max(maxShown, Core.comboNow(a.combo(), J0, J0 + 40));
  }
  return { a, res: a.res, maxShown };
}
const resKey = (r) => (r.clear ? 'clear' : `${r.reason}@${r.failIndex}@${Math.round(r.failTimeMs * 1000)}`) + '|' + r.grades.map((g) => g.grade[0]).join('');

console.log('\n== 2) 레벨별 기본 ==');
Ls.forEach((L, li) => {
  const id = L.level.id, cs = L.contacts, judge = L.judge;
  const perfect = hitTaps(L);
  const r = J.judgeAttempt(L, perfect), rate = J.gradeRating(L, r, bal.grade_rule);
  const b = runBuild(L, perfect);
  const none = J.judgeAttempt(L, []);
  const early = J.judgeAttempt(L, [cs[0].zoneStart + 1]);
  const ph = J.restartPhases(L, none, bal), phE = J.restartPhases(L, early, bal);
  const nogos = cs.filter((c) => c.kind === 'nogo');
  let bumpOk = true, bumpMsg = '지붕 없음';
  if (nogos.length) {
    const ng = nogos[0];
    const bt = J.judgeAttempt(L, hitTaps(L).filter((t) => t < ng.t).concat(ng.t + 5));
    const bb = runBuild(L, hitTaps(L).filter((t) => t < ng.t).concat(ng.t + 5)).a;
    const phB = J.restartPhases(L, bt, bal);
    const holds = r.grades.filter((g) => g.grade === 'hold').length;
    const strayUnder = J.judgeAttempt(L, perfect.concat(ng.passEnd + 30, ng.passStart - 40)); // 창 밖 지붕 밑 탭은 무시
    bumpOk = !bt.clear && bt.reason === 'bump_roof' && bt.failIndex === ng.i && bb.fail?.reason === 'bump_roof' && phB.ball_reappear_on_drum[1] === bal.restart.restart_delay_s && holds === nogos.length && strayUnder.clear;
    bumpMsg = `지붕 ${nogos.length}개: 착지 +5 ms 탭 → ${bt.reason}@${bt.failIndex}(빌드 ${bb.fail?.reason}), 완벽 입력 hold ${holds}, 창 밖 지붕 밑 탭 무시 → 클리어 ${strayUnder.clear}`;
  }
  const endOk = [ph, phE].every((p) => p.ball_reappear_on_drum[1] === bal.restart.restart_delay_s);
  check(`L${id}`, r.clear && rate === 3 && b.a.status === 'clear' && b.a.rating(bal.grade_rule) === 3 && !none.clear && none.reason === 'late' && none.failIndex === 0 && none.failTimeMs === cs[0].passEnd && early.reason === 'early' && endOk && bumpOk,
    `완벽 입력(hit ${perfect.length}개) 클리어 등급 ${rate}(빌드 ${b.a.status}) · 무입력 늦음 @0 ${none.failTimeMs.toFixed(0)} ms · 놓침 구역 ${early.reason} · 재시작 끝 ${ph.ball_reappear_on_drum[1]}/${phE.ball_reappear_on_drum[1]} s · ${bumpMsg}`);
  const toNext = bal.restart.restart_delay_s + cs[0].t / 1000;
  check(`L${id} V10`, toNext <= bal.verify.fail_to_next_contact_max_s, `실패 → 다음 판정 접촉 ${toNext.toFixed(2)} s ≤ ${bal.verify.fail_to_next_contact_max_s}`);
  // 세상: 박 표시가 북 가운데(0.30 W)에 오는 순간 = 접촉 시각, 레벨 시간 0 전 0박, 4해상도
  let wx = 0;
  for (const [W] of bal.verify.layout_resolutions) for (const c of cs) if (Math.abs(J.worldX(L, c.beat, c.t, W) - L.scroll.drumX * W) > 1e-6) wx++;
  const pre = J.scrollBeatAt(L, -500) === 0;
  const ahead = (bal.scroll.ahead_beats_by_level[id] ?? bal.scroll.ahead_beats_by_level.default);
  check(`L${id} 세상`, wx === 0 && pre && L.scroll.ahead === ahead, `worldX(접촉 박, 접촉 시각) = drum_x·W 모든 접촉 × 4해상도(어긋남 ${wx}), 시작 전 0박 ${pre}, 앞쪽 ${L.scroll.ahead}박(balance ${ahead})`);
  if (li === 0) {
    const fs = J.fingerSchedule(L, bal, null);
    check('L01 손가락', !!fs && fs.pressStart >= cs[0].t - judge.pass_early_ms && fs.gone <= cs[1].zoneStart, `fingerSchedule 등장 ${fs.from.toFixed(0)} · 누름 ${fs.pressStart.toFixed(0)} · 사라짐 늦어도 ${fs.gone.toFixed(0)} < 다음 놓침 구역 ${cs[1].zoneStart.toFixed(0)}`);
  }
});

console.log(`\n== 3) 빌드 시도 진행 = judgeAttempt (봇 탭 ${N}회/레벨 + 연타, 콤보 켬/끔) ==`);
{
  let total = 0, mism = 0, comboMism = 0, clears = 0, bumps = 0;
  const prof = bal.bots.profiles.child_sd70;
  Ls.forEach((L, li) => {
    const rng = Bots.makeRng(bal.verify.seed + li);
    const run = (taps) => {
      const ref = J.judgeAttempt(L, taps), on = runBuild(L, taps, { combo: true }), off = runBuild(L, taps, { combo: false });
      total++;
      if (resKey(ref) !== resKey(on.res) || resKey(on.res) !== resKey(off.res)) mism++;
      if (on.maxShown > ref.grades.length) comboMism++;
      if (ref.clear) clears++; if (ref.reason === 'bump_roof') bumps++;
    };
    for (let n = 0; n < N; n++) run(Bots.botTaps(L, n % 3 === 0 ? bal.bots.profiles.novice_sd50 : prof, rng, { extraAfter: bal.bots.extra_tap_after_s, along: n % 5 === 0 ? bal.bots.along : null }));
    for (let per = 40; per <= 200; per += 20) { const taps = []; for (let t = -500; t < L.durationMs; t += per) taps.push(t); run(taps); }
  });
  check('C1', mism === 0, `${total}회 재판정 불일치 ${mism} (콤보 켬/끔 빌드 결과 같음, 클리어 ${clears}, 지붕 콩 ${bumps})`);
  check('C1b', comboMism === 0, `보이는 콤보 ≤ grades 길이(파생, 별도 상태 없음) 어긋남 ${comboMism}`);
}

console.log('\n== 4) 콤보 ==');
Ls.forEach((L) => {
  const r = J.judgeAttempt(L, hitTaps(L));
  const ev = J.comboEvents(L, r);
  const holdOk = ev.events.filter((e) => e.kind === 'hold').every((e) => { const rs = L.roofSits.find((x) => x.contact === e.i); return rs && e.t === rs.roofOut; });
  const roofLand = L.roofSits.map((x) => x.landMs / L.beatMs);
  const chordBad = ev.stages.filter((s) => s.chordMs != null && (L.contacts.some((c) => s.chordMs >= (c.kind === 'nogo' ? c.passStart : c.zoneStart) - 1e-6 && s.chordMs <= c.passEnd + 1e-6) || roofLand.some((b) => Math.abs(s.chordBeat - b) <= 1 + 1e-9)));
  // 끝 판정 뒤 보이는 콤보 = 판정 대상 수(hit + hold)
  const shown = Core.comboNow(ev, L.durationMs, L.durationMs);
  check(`L${L.level.id} 콤보`, ev.final === L.contacts.length && shown === L.contacts.length && holdOk && !chordBad.length,
    `완벽 입력 콤보 ${ev.final} = 접촉 ${L.contacts.length}(hold ${ev.events.filter((e) => e.kind === 'hold').length}, roof_out 에 표시) · 단계 ${ev.stages.map((s) => `${s.stage}${s.chordBeat != null ? '♪' + s.chordBeat : ''}`).join(' ')} · 화음 위험 구간 겹침 ${chordBad.length}`);
});

console.log('\n== 4b) 판정 이름·% (표시 층만) ==');
Ls.forEach((L) => {
  const perfect = J.judgeAttempt(L, hitTaps(L)), acc = J.levelAccuracy(L, perfect, { practice: false });
  const rng = Bots.makeRng(77);
  let bad = 0, n = 0, accN = 0;
  for (let k = 0; k < 300; k++) {
    const r = J.judgeAttempt(L, Bots.botTaps(L, bal.bots.profiles.novice_sd50, rng, {}));
    for (const ev of J.pctEvents(L, r)) { if (ev.grade === 'hold') { if (ev.pct != null) bad++; continue; } n++; if (ev.pct == null || J.gradeOfPct(ev.pct, bal) !== ev.grade) bad++; }
    if (r.clear) { const a = J.levelAccuracy(L, r, { practice: false }); if (a == null || a < 10 || a > 100) bad++; accN++; }
  }
  check(`L${L.level.id} %`, acc === 100 && J.levelAccuracy(L, perfect, { practice: true }) === null && bad === 0, `완벽 입력 정확도 ${acc} %(연습 null) · σ50 판정 ${n}개 % ↔ 등급 어긋남 ${bad}, 클리어 ${accN}회 정확도 10~100`);
});

console.log('\n== 5) 연습 체크포인트·이어 하기 ==');
Ls.forEach((L) => {
  const cps = Core.checkpoints(L);
  let ok = 0;
  for (const cp of cps) { const b = runBuild(L, hitTaps(L, cp.firstContact), { fromMs: cp.t, startIndex: cp.firstContact }); if (b.a.status === 'clear' && b.res.grades.length === L.contacts.length - cp.firstContact) ok++; }
  // 이어 하기: 완벽 입력 중 50 ms 마다 멈춤 → resumePoint → 그 자리부터 완벽 입력 → 클리어, 다음 접촉까지 ≥ 450 ms, 시도 결과 = 끝까지 한 번에 친 것
  const full = J.judgeAttempt(L, hitTaps(L));
  let nRes = 0, okRes = 0, minGap = Infinity, rew = 0;
  for (let tp = 0; tp < L.clearTimeMs; tp += 50) {
    const pre = J.judgeAttempt(L, hitTaps(L).filter((t) => t <= tp));
    const rp = J.resumePoint(L, tp, pre);
    nRes++;
    if (!rp.rewound) continue;
    rew++;
    const nx = L.contacts[rp.startIndex];
    if (nx) minGap = Math.min(minGap, (nx.kind === 'nogo' ? nx.passStart : nx.zoneStart) - rp.fromMs);
    const b = runBuild(L, hitTaps(L, rp.startIndex), { fromMs: rp.fromMs, startIndex: rp.startIndex, carried: rp.carried });
    if (b.a.status === 'clear' && resKey(b.res) === resKey(full)) okRes++;
  }
  const fi = L.contacts.length - 1, cp = Core.checkpointFor(L, fi);
  check(`L${L.level.id} P`, ok === cps.length && cp.firstContact <= fi && okRes === rew && minGap >= bal.menus.resume.min_ms_to_next_contact,
    `체크포인트 ${cps.length}곳 이어서 클리어(콤보 0부터) · 멈춤 ${nRes}곳 중 되감기 ${rew}곳 모두 이어서 클리어(결과 = 한 번에 친 것) · 이어 한 직후 다음 접촉 놓침 구역까지 최소 ${minGap.toFixed(0)} ms ≥ ${bal.menus.resume.min_ms_to_next_contact}`);
});

console.log('\n== 6) 화면 배치·보조 계산 ==');
{
  const RES = bal.verify.layout_resolutions;
  let diff = 0; const rows = [];
  const cmp = (a, b, path) => {
    for (const k of Object.keys(b)) {
      if (typeof b[k] === 'number') { if (!(Math.abs(a[k] - b[k]) <= 1e-9)) { diff++; if (diff < 5) console.log('   diff', path + k, a[k], b[k]); } }
      else if (b[k] && typeof b[k] === 'object') cmp(a[k] || {}, b[k], path + k + '.');
    }
  };
  for (const [W, H, st, sb] of RES) {
    const a = Lay.geom(LY, W, H, st, sb, bal.scroll.drum_x_ratio, bal), b = ArtLay.compute(LY, W, H, st, sb, bal.scroll.drum_x_ratio);
    cmp(a, b, '');
    rows.push(`${W}x${H} d ${a.d} Hp ${a.Hp.toFixed(0)} 북 x ${a.cx} 길 y ${a.laneY.toFixed(0)}`);
  }
  check('G1', diff === 0, `js/layout.js geom = tools/art/layout.mjs compute, 상자(손가락·콤보·시도·판정 표시 자리) 포함 (${rows.join(' · ')})`);
  const C = bal.sound_sync, vc = bal.judge_clock.visual_comp_ms;
  const mk = (base) => Array.from({ length: C.taps_per_round }, (_, k) => base + (k % 3) * 4 - 4);
  const r1 = Calc.syncResult([mk(160), mk(170)], C, vc), r2 = Calc.syncResult([mk(50), mk(52)], C, vc), r3 = Calc.syncResult([mk(160), mk(260)], C, vc);
  const r0 = Calc.syncResult([mk(vc + 6), mk(vc + 4)], C, vc), r0b = Calc.syncResult([mk(vc - 36), mk(vc - 36)], C, vc);
  const wild = [100, 100, -200, 300, -150, 250, 100, 100];
  const r4 = Calc.syncRound(wild, C), r5 = Calc.syncResult([mk(700), mk(700)], C, vc);
  check('S1', r1.ok && Math.abs(r1.offset - (165 - vc)) <= 5 && r2.ok && r2.offset === Math.round(r2.raw) && r0.offset === Math.round(r0.raw) && r0b.offset === -36 && !r3.ok && r3.why === 'disagree' && !r4.ok && r5.offset === C.offset_clamp_ms[1],
    `소리 맞추기(무시 구간 없음, M1): +165 → ${r1.offset} · +51 → ${r2.offset} · raw ${r0.raw.toFixed(1)} → ${r0.offset}(작아도 적용) · X=0 기대 −36 → ${r0b.offset} · 두 회 차이 100 → 다시 · IQR ${r4.iqr.toFixed(0)} → 그 회 다시 · 큰 값 → ${r5.offset}(자름)`);
  const D2 = bal.drift_check;
  const run = (vals, att) => { const st = Calc.driftNew(); let f = false; vals.forEach((v) => (f = Calc.driftFeed(st, v, att, D2))); return f; };
  const f1 = run(Array(16).fill(90), 3), f2 = run(Array(16).fill(90), 2), f3 = run(Array.from({ length: 16 }, (_, k) => (k < 8 ? 90 : 10)), 5);
  check('S2', f1 && !f2 && !f3, `밀림 감지: +90 ms 16탭·시도 3 → ${f1} · 시도 2 → ${f2} · 둘째 창 +10 → ${f3}`);
  check('S3', Calc.median([1, 2, 3, 4]) === 2.5 && Calc.quantile([1, 2, 3, 4, 5], 0.25) === 2, '중앙값(짝수 = 가운데 둘 평균)·분위수 type 7');
}

console.log(`\n검사 ${pass + fail}개 중 PASS ${pass}, FAIL ${fail}`);
console.log(fail ? 'FAIL' : 'ALL PASS');
process.exit(fail ? 1 : 0);
