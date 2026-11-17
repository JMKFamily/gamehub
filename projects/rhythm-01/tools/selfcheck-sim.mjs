#!/usr/bin/env node
// 웹 빌드 엔진(games/rhythm-01/js/engine.js) ↔ 판정 기준 구현(tools/sim/judge.mjs) 대조 (node 만) — round-3 북길
//   node projects/rhythm-01/tools/selfcheck-sim.mjs
// 1) 레벨 10개(v3) × (완벽 입력열, 무입력, 박마다 치기, 오차 봇 σ25/50/70/90 + 헛탭 각 200회)를 한 탭씩 엔진에 넣어
//    첫 시도의 클리어/실패 위치/이유/판정 목록이 judgeAttempt 와 같은지. 콤보 = 판정마다 grades.length(+1), 실패 = 0 인지(K1)
// 2) 재시작 1.08 s, 연습 체크포인트(R21: 숨 고르기 틈 시작, 부활 = 카운트인 1마디 → 그 박), 밀림 감지, 보정 계산
// 3) 화면 규격: js/road.js = assets/layout.json layouts 8화면·per_level (별 x 공식 포함)
// 4) 곡: 멜로디 v3 음 수·별 시각 시작 0 = assets/sound-check.mjs, 콤보 단계 화음 자리 = sound-check comboChordSlots
// 5) 판정 %: js/readout.js = tools/sim/bots.mjs 기준(격자·경계·무작위), % → 등급 = 판정 등급, 레벨 정확도, 창 값 없음 오류, 앞 탭 어긋남 + 창 밖 탭 실패
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = resolve(PROJ, '../../games/rhythm-01');
const imp = (p) => import(pathToFileURL(p).href);
const { compileLevel, judgeAttempt } = await imp(join(PROJ, 'tools/sim/judge.mjs'));
const { prepareLevel, Run, cueVisible } = await imp(join(GAME, 'js/engine.js'));
const { roadLayout, speedOf, xAt } = await imp(join(GAME, 'js/road.js'));
const { buildSong, comboChordTime } = await imp(join(GAME, 'js/audio.js'));
const bal = JSON.parse(readFileSync(join(GAME, 'data/balance.json'), 'utf8'));
const art = JSON.parse(readFileSync(join(GAME, 'data/art.json'), 'utf8'));
const levels = bal.levels.map((p) => JSON.parse(readFileSync(join(GAME, 'data', p), 'utf8')));

let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());

// 엔진에 탭을 하나씩: 판정 이벤트의 combo 가 1, 2, 3 … 이고 실패 이벤트 뒤 run.combo = 0 인지도 같이 봄
function runEngine(L, taps, startV = 1000) {
  const r = new Run(L, bal, { startV });
  let comboBad = 0, n = 0;
  const eat = () => { for (const e of r.events.splice(0)) { if (e.type === 'judge' && e.combo !== ++n) comboBad++; if (e.type === 'fail' && (e.combo !== n || r.combo !== 0)) comboBad++; } };
  for (const tau of [...taps].sort((a, b) => a - b)) {
    if (r.phase !== 'run' && r.phase !== 'clearing') break;
    const V = r.songStartV + tau;
    r.update(V); eat();
    if (r.log.length || (r.phase !== 'run' && r.phase !== 'clearing')) break; // 시도 경계를 넘지 않음(첫 시도만)
    const t = r.tap(V);
    if (t.combo != null && t.combo !== r.grades.length) comboBad++;
    eat();
  }
  let V = r.songStartV;
  while (r.log.length === 0 && V < r.songStartV + L.durationMs + 5000) { V += 7; r.update(V); eat(); }
  return { r, first: r.log[0], comboBad };
}

let fails = 0, checks = 0;
const bad = (m) => { fails++; if (fails < 25) console.log('FAIL', m); };
const ok = (cond, m) => { checks++; if (!cond) bad(m); };
let comboRuns = 0, comboBadAll = 0;
for (const lv of levels) {
  ok(lv.schema_version === 3, `L${lv.id} 스키마 ${lv.schema_version}`);
  const L0 = compileLevel(lv, bal);
  const L = prepareLevel(lv, bal);
  ok(L0.shows.length === 0, `L${lv.id} 보여 주기 별 ${L0.shows.length}`);
  const perfect = L0.stars.map((s) => s.t);
  const sets = [['perfect', perfect], ['none', []], ['beats', Array.from({ length: Math.ceil(L0.durationMs / L0.beatMs) }, (_, k) => k * L0.beatMs)]];
  for (const sd of [25, 50, 70, 90]) for (let k = 0; k < 200; k++) {
    const taps = [];
    for (const s of L0.stars) {
      if (rnd() < 0.03) continue;
      const t = s.t + gauss() * sd;
      taps.push(t);
      if (rnd() < 0.05) taps.push(t + 150 + rnd() * 300);
    }
    sets.push([`sd${sd}`, taps]);
  }
  for (const [name, taps] of sets) {
    const ref = judgeAttempt(L0, taps);
    const { first, comboBad } = runEngine(L, taps);
    comboRuns++; comboBadAll += comboBad;
    const same = first && ref.clear === first.clear && (ref.clear || (ref.failIndex === first.failIndex && ref.reason === first.reason)) &&
      ref.grades.length === first.grades.length && ref.grades.every((g, i) => g.grade === first.grades[i].grade && Math.abs(g.e - first.grades[i].e) < 1e-6) &&
      first.combo === ref.grades.length;
    ok(same, `L${lv.id} ${name}: ref ${JSON.stringify({ c: ref.clear, i: ref.failIndex, r: ref.reason, n: ref.grades.length })} engine ${JSON.stringify(first && { c: first.clear, i: first.failIndex, r: first.reason, n: first.grades.length, combo: first.combo })}`);
  }
  // 완벽 입력열 클리어 + 끝까지 진행
  {
    const { r } = runEngine(L, perfect);
    let V = r.songStartV; while (r.phase !== 'done' && V < r.songStartV + L.durationMs + 100) { V += 16; r.update(V); }
    ok(r.phase === 'done' && r.grade === 3 && r.combo === L.stars.length, `L${lv.id} perfect: phase ${r.phase} grade ${r.grade} combo ${r.combo}`);
  }
  // 무입력: 실패 → 1.08 s 뒤 재시작, 시도 2. 실패 → 다음 판정 별 ≤ 6 s (criteria, 20-balance 17-6 P2)
  {
    const r = new Run(L, bal, { startV: 0 });
    let V = 0, failV = null, restartAt = null;
    while (V < 20000 && restartAt === null) {
      V += 1; r.update(V);
      for (const e of r.events.splice(0)) { if (e.type === 'fail') failV = e.V; if (e.type === 'attempt' && failV !== null) restartAt = e.startV; }
    }
    const d = restartAt - failV, toStar = (restartAt + L.stars[0].t - failV) / 1000;
    ok(Math.abs(d - bal.restart.restart_delay_s * 1000) <= 0.5 && r.attempts === 2 && r.lt(restartAt) === 0, `L${lv.id} restart ${d} ms attempts ${r.attempts}`);
    ok(toStar <= 6, `L${lv.id} 실패 → 다음 별 ${toStar.toFixed(2)} s`);
  }
  // 연습 체크포인트 (R21): 데이터 = levels practice.checkpoints, 둘째 체크포인트 뒤에서 실패 → 그 박 한 마디 앞에서 카운트인 → 그 박부터
  {
    const cps = lv.practice.checkpoints;
    ok(L.checkpoints.length === cps.length && L.checkpoints.every((c, k) => Math.abs(c.t - (4 * lv.count_in_bars + cps[k].beat) * L.beatMs) < 1e-6 && L.stars[c.firstStar] && Math.abs(L.stars[c.firstStar].t - (4 * lv.count_in_bars + cps[k].next_star_beat) * L.beatMs) < 1e-6), `L${lv.id} 체크포인트 ${JSON.stringify(L.checkpoints.map((c) => c.beat))}`);
    const r = new Run(L, bal, { practice: true, startV: 0 });
    const cp2 = L.checkpoints[1];
    const stop = cp2.firstStar;
    for (const s of L.stars.slice(0, stop)) { r.update(r.songStartV + s.t); r.tap(r.songStartV + s.t); }
    r.update(r.songStartV + cp2.t + 1);
    let V = r.songStartV + L.stars[stop].passEnd + 1;
    r.update(V);
    const failV = r.fail ? r.fail.V : null;
    V = r.restartV; r.update(V);
    const firstRestartLt = r.lt(V);
    ok(r.cp === cp2 && r.t0 === cp2.startT && r.i === cp2.firstStar && Math.abs(firstRestartLt - cp2.startT) < 1e-6 && r.barMode(cp2.startT + 1) === 'countin' && r.barMode(cp2.t + 1) !== 'countin', `L${lv.id} 연습 부활 t0 ${r.t0} vs ${cp2.startT}, i ${r.i}`);
    ok(Math.abs(V - failV - bal.restart.restart_delay_s * 1000) < 1e-6, `L${lv.id} 연습 부활 ${V - failV} ms`);
    const toNext = (L.stars[r.i].t - r.t0) / L.beatMs;
    ok(toNext >= 6 - 1e-9, `L${lv.id} 연습 부활 → 다음 별 ${toNext} 박 (≥ 6, P3)`);
    // 부활 곡: 카운트인 4박(첫 박 tick_one), 그 앞 이벤트 없음
    const ev = buildSong(L, r.t0, JSON.parse(readFileSync(join(GAME, 'data/music.json'), 'utf8')), JSON.parse(readFileSync(join(GAME, 'data/sound.json'), 'utf8')), (x) => r.barMode(x), (b) => { let s = 1; for (const x of lv.sections) if (x.start_bar <= b && x.stage) s = x.stage; return s; });
    const ticks = ev.filter((e) => e.name === 'tick' || e.name === 'tick_one');
    ok(ticks.length === 4 && ticks[0].name === 'tick_one' && Math.abs(ticks[0].x - r.t0) < 1e-6 && ev[0].x >= r.t0 - 0.5, `L${lv.id} 연습 부활 카운트인 ${ticks.map((t) => t.name).join(',')}`);
    for (const s of L.stars.slice(r.i)) { r.update(r.songStartV + s.t); r.tap(r.songStartV + s.t); }
    r.update(r.songStartV + L.durationMs + 1);
    ok(r.phase === 'done', `L${lv.id} practice clear ${r.phase}`);
  }
  // 손가락 (T1): 첫 별 1박 전 나타남, 누름 0.25박 전 = 통과 창 안
  if (L.cue) {
    const st = L.stars[L.cue.star], run = new Run(L, bal, { startV: 0 });
    ok(L.cue.key === bal.tutorial_cue.key && L.cue.star === 0 && L.cue.pressFrom >= st.passStart - 1e-6 && Math.abs(L.cue.from - (st.t - L.beatMs)) < 1e-6, `L${lv.id} 손가락 ${JSON.stringify(L.cue)}`);
    ok(cueVisible(L, run, st.t - L.beatMs + 1) && !cueVisible(L, run, st.t - L.beatMs - 1), `L${lv.id} 손가락 보이는 시각`);
  }
}
console.log(`K1 콤보: 엔진 ${comboRuns}묶음, 판정마다 combo = grades.length·실패 0 어긋남 ${comboBadAll}`);
ok(comboBadAll === 0, `콤보 어긋남 ${comboBadAll}`);
// 밀림 감지(drift_check): 탭이 +100 ms 밀린 채 3번 시도 → 3번째 시도에서 켜짐, 정상 입력은 안 켜짐
for (const [off, want] of [[100, true], [0, false]]) {
  const L = prepareLevel(levels[0], bal);
  const r = new Run(L, bal, { startV: 0 });
  let on = null;
  for (let a = 0; a < 3; a++) {
    for (const st of L.stars.slice(0, 10)) { const V = r.songStartV + st.t + off; r.update(V); r.tap(V); }
    let V = r.songStartV + L.stars[10].passEnd + 1; r.update(V); r.update(r.restartV + 1);
    for (const e of r.events.splice(0)) if (e.type === 'drift' && on === null) on = e.attempt;
  }
  ok((on !== null) === want && (!want || on === 3), `drift off ${off}: 켜진 시도 ${on}`);
}
// 보호자 보정 계산 (R23: 무시 구간 10 ms 는 balance.json 에서 읽음)
{
  const { simulate } = await imp(join(GAME, 'js/calib.js'));
  const gc = bal.audio_latency.guardian_calibration;
  ok(gc.apply_only_if_abs_over_ms === 10, `R23 apply_only_if_abs_over_ms ${gc.apply_only_if_abs_over_ms}`);
  const mk = (m, j) => Array.from({ length: 8 }, (_, k) => m + ((k * 7) % 5 - 2) * j);
  const cases = [
    ['블루투스 +160', [mk(160, 8), mk(165, 8)], (r) => r.ok && Math.abs(r.offset - 162) < 15],
    ['보통 기기 +6 → 0 (≤ 10)', [mk(6, 3), mk(4, 3)], (r) => r.ok && r.offset === 0],
    ['+14 적용 (> 10, R23)', [mk(14, 2), mk(14, 2)], (r) => r.ok && Math.abs(r.offset - 14) < 3],
    ['-45 적용', [mk(-45, 5), mk(-40, 5)], (r) => r.ok && r.offset < -30],
    ['IQR 큼 2회 → 유지', [mk(0, 120), mk(0, 120)], (r) => !r.ok],
    ['두 회 차이 > 60, 다시 해서 맞음', [mk(0, 5), mk(100, 5), mk(150, 5), mk(150, 5)], (r) => r.ok && Math.abs(r.offset - 150) < 12],
    ['자름 300', [mk(400, 5), mk(400, 5)], (r) => r.ok && r.offset === 300],
  ];
  for (const [name, rounds, okf] of cases) { const r = simulate(rounds, gc); ok(okf(r), `calib ${name}: ${JSON.stringify(r)}`); }
}
// ---- 화면 규격: road.js = assets/layout.json (art 원본) 8화면 + per_level ----
{
  const LJ = JSON.parse(readFileSync(join(PROJ, 'assets/layout.json'), 'utf8'));
  const PL = levels.map((lv) => prepareLevel(lv, bal));
  const lead = { landscape: PL.map((L) => L.lead.landscape), portrait: PL.map((L) => L.lead.portrait) };
  ok(JSON.stringify(lead.landscape) === JSON.stringify(LJ.lead_beats.landscape) && JSON.stringify(lead.portrait) === JSON.stringify(LJ.lead_beats.portrait), `미리 보기 박 ${JSON.stringify(lead)} ≠ layout.json`);
  const pv = bal.preview.lead_beats;
  ok(levels.every((lv, i) => pv.landscape[lv.id] === lead.landscape[i] && pv.portrait[lv.id] === lead.portrait[i]), 'balance.json preview.lead_beats 거울 값 ≠ 레벨 path');
  let n = 0, diff = 0, worst = '';
  const cmp = (a, b, path) => {
    if (typeof b === 'number') { n++; if (typeof a !== 'number' || Math.abs(a - b) > 0.051) { diff++; if (!worst) worst = `${path}: build ${a} vs layout.json ${b}`; } return; }
    if (b && typeof b === 'object') for (const k of Object.keys(b)) { if (k === 'per_level' || k === 'safe') continue; cmp(a?.[k], b[k], path + '.' + k); }
  };
  for (const ref of Object.values(LJ.layouts)) {
    const lay = roadLayout(ref.W, ref.H, ref.safe, art.road, lead);
    cmp(lay, ref, `${ref.W}x${ref.H}`);
    for (const pl of ref.per_level) {
      const L = PL.find((x) => x.level.id === pl.id), v = speedOf(L, lay) * 1000;
      n += 3;
      if (Math.abs(v - pl.speed_px_s) > 0.051 || Math.abs((v * L.beatMs) / 1000 - pl.beat_px) > 0.051 || Math.abs(((lay.star_d + lay.line.w) / v) * 1000 - pl.overlap_ms) > 0.51) { diff++; if (!worst) worst = `${ref.W}x${ref.H} L${pl.id} 속도 ${v}`; }
      // 별 x: 별 시각 = 판정 선, 별 시각 − lead 박 = 오른쪽 끝(W − safeR)
      const st = L.stars[0], lb = lay.portrait ? L.lead.portrait : L.lead.landscape;
      n += 2;
      if (Math.abs(xAt(lay, v / 1000, st.t, st.t) - lay.judge_x) > 1e-9 || Math.abs(xAt(lay, v / 1000, st.t, st.t - lb * L.beatMs) - (ref.W - (ref.safe.r || 0))) > 1e-6) diff++;
    }
  }
  console.log(`화면 규격: road.js vs layout.json ${Object.keys(LJ.layouts).length}화면 값 ${n}개, 다름 ${diff}${worst ? ' (' + worst + ')' : ''}`);
  ok(diff === 0, `화면 규격 다름 ${diff}: ${worst}`);
}
// ---- 곡: 멜로디 v3 (audio.js buildSong) — 별 시각 시작 0, 음 수 = assets/sound-check.mjs, outro 마디 동기 0 ----
//      콤보 단계 화음 자리 = sound-check comboChordSlots(모두 이어 친 경우)
{
  const music = JSON.parse(readFileSync(join(GAME, 'data/music.json'), 'utf8'));
  const sound = JSON.parse(readFileSync(join(GAME, 'data/sound.json'), 'utf8'));
  const sc = spawnSync(process.execPath, [join(PROJ, 'assets/sound-check.mjs')], { encoding: 'utf8' });
  const want = +((sc.stdout.match(/멜로디 음 (\d+)개/) || [])[1]);
  const wantChord = new Map([...sc.stdout.matchAll(/(\d\d):(\d+)→(\d+|넘김)/g)].map((m) => [`${m[1]}:${m[2]}`, m[3] === '넘김' ? null : +m[3]]));
  let notes = 0, clash = 0, outroMel = 0, chordN = 0, chordDiff = 0;
  for (const lv of levels) {
    const L = prepareLevel(lv, bal);
    const r = new Run(L, bal, { startV: 0 });
    const ev = buildSong(L, 0, music, sound, (x) => r.barMode(x), (b) => { let s = 1; for (const x of lv.sections) if (x.start_bar <= b && x.stage) s = x.stage; return s; });
    const outroX = (L.countInBars + L.outroBar) * L.barMs;
    const mel = ev.filter((e) => e.name && e.name.startsWith('mel_') && e.gainDb == null && e.x < outroX - 1);
    notes += mel.length;
    for (const e of ev) if (e.name && e.name.startsWith('mel_') && L.stars.some((s) => Math.abs(s.t - e.x) < 0.5)) clash++;
    outroMel += ev.filter((e) => e.name && e.name.startsWith('mel_') && e.x >= outroX - 1).length - 1; // outro 마무리 음 1개만
    const ducks = ev.filter((e) => e.duck).map((e) => e.x);
    ok(ducks.length === L.stars.length && L.stars.every((s) => ducks.some((d) => Math.abs(d - s.t) < 0.5)), `R7 L${lv.id}: 베이스 숙임 ${ducks.length} ≠ 별 ${L.stars.length}`);
    for (const [k, name] of Object.entries(music.combo_r3.steps)) {
      if (L.stars.length < +k) continue;
      chordN++;
      const t = comboChordTime(L, +k - 1, music.combo_r3), at = t == null ? null : Math.round(t / L.eighthMs) - 8 * L.countInBars;
      if (!wantChord.has(`${lv.id}:${k}`) || wantChord.get(`${lv.id}:${k}`) !== at || L.stars.some((s) => t != null && Math.abs(s.t - t) < 0.5)) chordDiff++;
      void name;
    }
  }
  ok(clash === 0 && notes === want, `R7 멜로디: 빌드 ${notes}음(기준 ${want}) 별 시각 시작 ${clash}`);
  ok(outroMel === 0, `R7 outro 마디 동기 ${outroMel}음`);
  ok(chordN === wantChord.size && chordDiff === 0, `콤보 화음 자리 ${chordN}개(기준 ${wantChord.size}) 다름 ${chordDiff}`);
  ok(music.calib_check_hz === 1046.5, `R7 calib_check_hz ${music.calib_check_hz}`);
  console.log(`R7(v3): 멜로디 ${notes}음 = sound-check ${want}음(outro 제외), 별 시각 시작 ${clash}, outro 동기 ${outroMel}, 베이스 숙임 = 판정 별, 콤보 화음 자리 ${chordN}개 = sound-check, 별 자리 겹침 0`);
}
// ---- 판정 이름·% (요청자 지시 "판정 이름과 퍼센트까지"): 빌드 js/readout.js = 기준 tools/sim/bots.mjs accuracyPct·gradeFromPct·levelAccuracy ----
{
  const R = await imp(join(GAME, 'js/readout.js'));
  const B = await imp(join(PROJ, 'tools/sim/bots.mjs'));
  const acc = bal.accuracy;
  let n = 0, diff = 0, gradeBad = 0, levDiff = 0, worst = '';
  for (const lv of levels) {
    const L = prepareLevel(lv, bal), j = L.judge;
    // 0.01 ms 격자 + 경계값 그대로 + 무작위 (창 밖 포함)
    const es = [];
    for (let e = -j.pass_early_ms - 5; e <= j.pass_late_ms + 5; e += 0.01) es.push(Math.round(e * 100) / 100);
    for (const b of [acc.perfect_inner_ms, j.perfect_ms, j.good_ms, j.pass_early_ms, j.pass_late_ms]) es.push(b, -b, b + 1e-9, -b - 1e-9);
    for (let k = 0; k < 20000; k++) es.push((rnd() * 2 - 1) * 200);
    for (const e of es) {
      n++;
      const a = R.accuracyPct(e, j, acc), b = B.accuracyPct(e, j, acc);
      if (a !== b) { diff++; if (!worst) worst = `L${lv.id} e ${e}: build ${a} ref ${b}`; }
      // % → 등급 = 판정 등급 (창 안만, judge.mjs 판정과 같은 경계)
      const d = Math.abs(e), W = e < 0 ? j.pass_early_ms : j.pass_late_ms;
      if (d <= W) { const g = d <= j.perfect_ms ? 'perfect' : d <= j.good_ms ? 'good' : 'pass'; if (R.gradeFromPct(a, acc) !== g) gradeBad++; }
      else if (a !== null) gradeBad++;
    }
    // 레벨 정확도: 봇 시도 결과(judgeAttempt)로 빌드 = 기준
    const L0 = compileLevel(lv, bal);
    for (let k = 0; k < 300; k++) {
      const taps = L0.stars.map((s) => s.t + gauss() * 45);
      const res = judgeAttempt(L0, taps);
      n++;
      if (R.levelAccuracy(L, res, acc) !== B.levelAccuracy(L0, res, acc)) levDiff++;
    }
  }
  ok(diff === 0, `판정 % 빌드 ≠ 기준 ${diff}건: ${worst}`);
  ok(gradeBad === 0, `% → 등급 ≠ 판정 등급 ${gradeBad}건`);
  ok(levDiff === 0, `레벨 정확도 빌드 ≠ 기준 ${levDiff}건`);
  // 데이터 확인: 창 값이 없으면(NaN) 시작 때 오류 (insights QA·측정)
  {
    const L = prepareLevel(levels[0], bal);
    let threw = false;
    try { R.checkAccuracyData(bal, [{ ...L, judge: { ...L.judge, pass_late_ms: undefined } }]); } catch { threw = true; }
    let okNormal = true;
    try { R.checkAccuracyData(bal, levels.map((lv) => prepareLevel(lv, bal))); } catch { okNormal = false; }
    ok(threw && okNormal, `checkAccuracyData: 창 값 없음 → 오류 ${threw}, 정상 데이터 통과 ${okNormal}`);
  }
  // 앞 탭이 어긋난 상태에서 창 밖 탭 → 실패 (엔진 = judgeAttempt): 별 0 을 늦은 통과로, 별 1 을 창 끝 + 1 ms(늦음) / 놓침 구역(이름)
  {
    let bad = 0;
    for (const lv of levels) {
      const L0 = compileLevel(lv, bal), L = prepareLevel(lv, bal), s = L0.stars;
      const cases = [
        [s[0].t + L0.judge.pass_late_ms - 1, s[1].passEnd + 1],             // 늦은 통과 뒤 다음 별 창 밖(늦음) → miss
        [s[0].t - L0.judge.pass_early_ms + 1, s[1].passEnd + 1],            // 이른 통과 뒤 창 밖(늦음) → miss
        [s[0].t + L0.judge.pass_late_ms - 1, s[1].passStart - 1],           // 늦은 통과 뒤 놓침 구역 탭 → early
      ];
      for (const taps of cases) {
        if (taps[1] <= taps[0]) continue; // 반박 쌍에서 놓침 구역 탭이 앞 탭보다 이르면 다른 경우가 됨(건너뜀)
        const ref = judgeAttempt(L0, taps), { first } = runEngine(L, taps);
        n++;
        if (ref.clear || !first || first.clear || first.failIndex !== ref.failIndex || first.reason !== ref.reason || first.failIndex !== 1) { bad++; }
        else if (R.accuracyPct(first.grades[0].e, L.judge, acc) == null || R.accuracyPct(taps[1] - s[1].t, L.judge, acc) != null && first.reason === 'miss') bad++;
      }
    }
    ok(bad === 0, `앞 탭 어긋남 + 창 밖 탭 실패 ${bad}건`);
  }
  console.log(`판정 %: 빌드 readout.js = bots.mjs 기준 ${n}개 다름 ${diff}, % → 등급 불일치 ${gradeBad}, 레벨 정확도 다름 ${levDiff}, 창 값 없음 → 시작 오류 확인, 앞 탭 어긋남 + 창 밖 탭 실패 = judgeAttempt`);
}
console.log(`${checks - fails}/${checks} OK`);
process.exit(fails ? 1 : 0);
