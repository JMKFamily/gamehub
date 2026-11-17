#!/usr/bin/env node
// rhythm-02 레벨 검증기 (node 만 사용) — round-2 "흘러오는 길"(스키마 v2)
//
// 사용법
//   node tools/verify-levels.mjs            # 전체 실행. B·K 판정은 이 실행 기준(σ70 4만 회, σ25 10만 회, B6 시드 10개)
//   node tools/verify-levels.mjs --quick    # 봇 표본을 줄여 도구 동작만 확인(B·K 검사는 정보로만)
//   node tools/verify-levels.mjs --json     # 결과 JSON
//   node tools/verify-levels.mjs --seed=N   # 난수 시드 바꾸기(기본 balance.json verify.seed)
//   node tools/verify-levels.mjs --vr=<폴더> # 그 폴더 레벨 파일(스키마 1·2)에 V-R 측정만 돌려 표로 출력(판정 안 함). 예: --vr=tools/fixtures/r1-levels
//
// 판정 코드는 빌드와 같은 tools/sim/judge.mjs, 반복 측정은 tools/sim/repeat.mjs. 상태: PASS / FAIL / 대기(WAIT: 다른 역할 파일이 아직 round-2 에 맞지 않음, FAIL 로 세지 않고 목록에 표시)
// 검사(번호는 20-balance.md 10절)
//   V0  레벨 10개·키          V1 스키마 v2·비행·물체 일관성     V2 박대로 치기 클리어(모두 딱, 지붕은 참음)   V3 무입력 → 첫 접촉 실패
//   V4  연타 → 클리어 0       V5 8분 격자 → 실패               V6 배치 규칙 ①~⑥                            V7 새 기믹 ≤1·카드·안전한 첫 등장(14-5) + (all) 카드 키
//   V8  판정 창               V9 레벨 1                        V10 실패 → 다음 판정 ≤ 6 s                  V11 동시에 내려오는 공 ≤ 1·탭 전 대기
//   V12 구름 통 높이          V13 BPM·길이                     V14 박마다 치기(L1~L3 클리어, L4~ 실패)       V15 곡 음 시작 ∩ 놓침 구역(art music.mjs)
//   V16 화면 높이(layout)      V17 클리어 연출·길 멈춤·클리어 구름
//   V18 보이는 시간(14-5)     V19 한 화면 위험 수(14-5)          V20 가장 짧은 표시 간격 ≥ 32 px(4해상도)     V21 지붕 배치 규칙 ①~⑦
//   V22 물체 ↔ 공 여유(Hp·4해상도 px)   V23 물체 윗선 ≥ HUD 띠 아래(layout, art 대기)
//   V-R0 도구 검증(round-1 레벨 → 14-1 표)   V-R1~R7 반복 방지(14-4)
//   S1~S5 신호(round-1)       S6 카드 닫힘 < 레벨 0   S7 L1 손가락 ∩ 위험 물체 보임 = 0   S8 지붕 레벨 손가락 없음·카드   S9 지붕 착지 ±1박 신호 0   S10 UI 자리(layout, art 대기)
//   N7  이어 하기 되감기 → 다음 접촉 ≥ 450 ms   C1 콤보(결과 파생·화음 자리·켬/끔 봇 동일)
//   P1~P5 판정 이름·퍼센트(칸 경계·단조·등급 범위·비대칭 칸·정확도·켬/끔 동일)   (정보) P6 봇 정확도 분포
//   B1~B8 곡선(q_nogo 0.15 봇)   B6s 시드 10개 분포   K2 손해 모델   K3 화면 판정 + K3b 보정 뒤 잔차 ±15 두 쪽(w = 1)   (정보) Q q_nogo 민감도·criteria 기본 행, K3d, 따라 치기·연습·해석

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileLevel, judgeAttempt, ballsAt, flightApex, fingerSchedule, tapToLevelMs, restartPhases, hitsFromResult, objectsAt, pxPerBeat, firstVisibleMs, comboEvents, resumePoint, scrollBeatAt, bgStage, bgStages, pctOf, pctBands, gradeOfPct, pctEvents, levelAccuracy } from './sim/judge.mjs';
import { runProfile, runPractice, analyticClear, contMedian, makeRng, botTaps } from './sim/bots.mjs';
import { repeatStats, phraseStarts, windows8, chunksOf, tokenize } from './sim/repeat.mjs';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const JSON_OUT = args.includes('--json');
const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const V = bal.verify;
const SEED = +(args.find((a) => a.startsWith('--seed='))?.split('=')[1] ?? V.seed);
const N = QUICK ? V.N_quick : V.N_full;
const NSK = QUICK ? V.N_quick : V.N_skilled_full;
const SESS = QUICK ? V.sessions_quick : V.sessions_full;
const f0 = (x) => (x === Infinity ? '∞' : x === -Infinity ? '-∞' : (+x).toFixed(0));
const f2 = (x) => (x == null ? '-' : (+x).toFixed(2));
const byLv = (obj, id) => obj[id] ?? obj.default;

// ---------- --vr 모드: 폴더 레벨에 V-R 측정만
const vrArg = args.find((a) => a.startsWith('--vr='));
if (vrArg) {
  const dir = resolve(PROJECT, vrArg.split('=')[1]);
  console.log(`V-R 측정 (${dir}, 14-4 정의, 가르치기 덩어리 빼지 않음 = 14-1 표와 같은 방식)`);
  console.log('레벨 | 위험 토큰 비율 | 덩어리 수 / 서로 다른 수 | 같은 덩어리 연속 최대 | 3-gram 중복 | 4-gram 중복 | 덩어리');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const l = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const s = repeatStats(l);
    console.log(`${l.id} | ${s.risk_ratio.toFixed(2)} | ${s.chunks} / ${s.distinct_chunks} | ${s.max_same_run ?? '-'} | ${f2(s.gram3.dup)} | ${f2(s.gram4.dup)} | ${s.chunk_list.join(' ‖ ')}`);
  }
  process.exit(0);
}

const report = { quick: QUICK, seed: SEED, levels: {}, checks: [], fails: [], waits: [] };
const log = (...a) => { if (!JSON_OUT) console.log(...a); };
const check = (lv, code, ok, msg) => {
  report.checks.push({ level: lv, code, ok, msg });
  if (!ok) report.fails.push(`${lv} ${code}: ${msg}`);
  log(`  ${ok ? 'PASS' : 'FAIL'} ${code} ${msg}`);
};
// 대기: 다른 역할(art·lore) 파일이 아직 round-2 를 반영하지 않아 확인할 수 없거나 맞지 않음. FAIL 로 세지 않음.
const wait = (lv, code, msg) => {
  report.checks.push({ level: lv, code, ok: true, wait: true, msg });
  report.waits.push(`${lv} ${code}: ${msg}`);
  log(`  대기 ${code} ${msg}`);
};
const info = (code, msg) => log(`  정보 ${code} ${msg}`);
const bchk = QUICK ? (lv, code, ok, msg) => log(`  정보 ${code}(--quick, 판정 안 함) ${ok ? '통과 범위' : '범위 밖'}: ${msg}`) : check;

const levels = bal.levels.map((f) => JSON.parse(readFileSync(join(PROJECT, f), 'utf8')));
const readJson = (rel) => { try { return JSON.parse(readFileSync(join(PROJECT, rel), 'utf8')); } catch (e) { return { _error: String(e.message || e) }; } };
const LAYOUT = readJson(V.layout_file), SOUND = readJson(V.sound_file), STRINGS = readJson(V.strings_file);
let musicOnsets = null, musicErr = '';
try { ({ musicOnsets } = await import(pathToFileURL(join(PROJECT, 'tools/art/music.mjs')).href)); } catch (e) { musicErr = String(e.message || e); }
const compiled = levels.map((l) => compileLevel(l, bal));
const HAZ = new Set(['roof', 'branch', 'cloud', 'hill']);
const isHaz = (o) => HAZ.has(o.type) && o.role !== 'clear';

// ---------- V7(all) 카드 키 (결정 D1)
{
  const err = [];
  const keys = Object.entries(bal.gimmicks).filter(([g, v]) => !g.startsWith('_') && v.card).map(([, v]) => v.card);
  const lvCards = levels.filter((l) => l.card).map((l) => l.card.id);
  const own = lvCards.filter((k) => !keys.includes(k));
  if (STRINGS._error) err.push('strings.json 읽기 실패');
  else {
    for (const k of keys) if (!STRINGS[k] || !STRINGS[k].ko || !STRINGS[k].en) err.push(`strings.json ${k} 없음`);
    const extra = Object.keys(STRINGS).filter((k) => /^card_/.test(k) && !keys.includes(k));
    if (extra.length) err.push(`strings.json 남는 카드 키 ${extra.join(',')}`);
  }
  const dir = join(PROJECT, V.cards_dir);
  const files = existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith('.svg')) : [];
  const want = keys.flatMap((k) => V.card_files.map((p) => p.replace('<key>', k)));
  const miss = want.filter((x) => !files.includes(x));
  const extraF = files.filter((x) => !want.includes(x));
  if (miss.length) err.push(`카드 그림 없음 ${miss.length}개(${miss.slice(0, 4).join(',')})`);
  if (extraF.length) err.push(`키에 없는 카드 그림 ${extraF.length}개(${extraF.slice(0, 4).join(',')})`);
  log('== 카드 키 (balance.json gimmicks → 레벨 card · strings.json · assets/cards) ==');
  check('all', 'V7', !own.length, own.length ? `레벨 카드 키 ${own} 가 balance.json gimmicks 에 없음` : `레벨 카드 ${lvCards.length}장 = balance.json gimmicks 키 ${keys.length}개(${keys.join(', ')})`);
  if (err.length) wait('all', 'V7b', `${err.join(' / ')} — art(assets/cards 새 키 card_roof, card_twoballs 삭제)·lore(strings.json card_roof, card_twoballs 삭제) round-2 수정 대기`);
  else check('all', 'V7b', true, `카드 키 = strings.json(ko·en) = assets/cards 그림 ${want.length}장, 남는 키·파일 없음`);
}

// ---------- V0
log(`== 레벨 목록 (${levels.length}개) ==`);
{
  const ids = levels.map((l) => l.id);
  const want = Array.from({ length: V.level_count }, (_, k) => String(k + 1).padStart(2, '0'));
  const badKey = levels.filter((l) => l.name_key !== `level${+l.id}_name` || l.theme_id !== `level${l.id}`).map((l) => l.id);
  check('all', 'V0', ids.join() === want.join() && !badKey.length, `레벨 ${ids.join(',')} (기대 01~${want[want.length - 1]}), name_key·theme_id 어긋남 ${badKey.join(',') || '없음'}`);
}

const steady = (from, to, period, phase) => { const t = []; for (let x = from + phase; x < to; x += period) t.push(x); return t; };
const allowedBeats = Object.values(bal.bounces).filter((b) => b && b.beats && b.kind !== 'nogo').map((b) => b.beats);
const bounceName = Object.fromEntries(Object.entries(bal.bounces).filter(([, b]) => b && b.beats && b.kind !== 'nogo').map(([k, b]) => [b.beats, k]));
let prevWidth = null, prevBpm = null;
const introduced = new Set();
const perfectTaps = (L) => L.contacts.filter((c) => c.kind === 'hit').map((c) => c.t);
const OB = bal.objects;

// layout.json 식(art 원본) — tools/art/layout.mjs compute() 와 같은 식을 계수만 읽어 계산
function layoutGeom(LY, W, H, safeTop = 0, safeBottom = 0) {
  const S = Math.min(W, H), portrait = H > W;
  const B = LY.ball;
  const dMin = !portrait && B.d_min_landscape != null ? B.d_min_landscape : B.d_min;
  const dMax = !portrait && B.d_max_landscape != null ? B.d_max_landscape : B.d_max;
  const dOf = !portrait && B.d_of_S_landscape != null ? B.d_of_S_landscape : B.d_of_S;
  const d = Math.round(Math.max(dMin, Math.min(dMax, dOf * S)));
  const dh = LY.drum.h_of_d * d;
  let skinY;
  if (portrait) skinY = Math.round(LY.portrait.skin_y_of_H * H);
  else { const fh = Math.max(LY.landscape.floor_h_min, LY.landscape.floor_h_of_H * H) + safeBottom; skinY = H - fh - dh; }
  const topLimit = safeTop + LY.play_height.top_margin;
  const Hp = (skinY - topLimit - d - LY.play_height.apex_margin) / LY.play_height.apex_budget;
  const band = LY.hud?.band_h ? (portrait ? LY.hud.band_h.portrait : LY.hud.band_h.landscape) : (portrait ? LY.portrait.hud_h : LY.landscape.hud_h);
  const hudBand = safeTop + band, hudBottom = hudBand + (LY.hud?.gap_below_band ?? 0);
  return { d, skinY, Hp, hudBand, hudBottom, portrait };
}
const layoutOk = !LAYOUT._error && LAYOUT.play_height && LAYOUT.ball && LAYOUT.drum;
const layoutDrumX = LAYOUT.drum?.x_of_W ?? LAYOUT.world?.drum_x_of_W ?? LAYOUT.scroll?.drum_x_ratio ?? (/balance.json scroll.drum_x_ratio/.test(LAYOUT.drum?.x_ratio_ref || '') ? bal.scroll.drum_x_ratio : null);

// 세 입력(완벽·가장 늦게·가장 이르게 친 통과) → hits
function inputHits(L) {
  const hitsC = L.contacts.filter((c) => c.kind === 'hit');
  const sets = { perfect: hitsC.map((c) => c.t), late: hitsC.map((c) => c.passEnd), early: hitsC.map((c) => c.passStart) };
  const out = {};
  for (const [k, taps] of Object.entries(sets)) { const r = judgeAttempt(L, taps); out[k] = { res: r, hits: r.clear ? hitsFromResult(L, r) : null }; }
  return out;
}

compiled.forEach((L, li) => {
  const lvl = L.level, id = lvl.id, j = L.judge, C = L.contacts;
  const beat = L.beatMs;
  const H = C.filter((c) => c.kind === 'hit'), NG = C.filter((c) => c.kind === 'nogo');
  report.levels[id] = { bpm: lvl.bpm, contacts: C.length, hits: H.length, nogo: NG.length, duration_s: +(L.durationMs / 1000).toFixed(2), pass: [j.pass_early_ms, j.pass_late_ms], ahead_beats: L.scroll.ahead };
  log(`\n== 레벨 ${id} (BPM ${lvl.bpm}, 1박 ${beat.toFixed(1)} ms, 접촉 ${C.length} = hit ${H.length} + 지붕 ${NG.length}, 길이 ${(L.durationMs / 1000).toFixed(2)} s, 통과 -${j.pass_early_ms}/+${j.pass_late_ms}, 앞쪽 ${L.scroll.ahead}박, 새 기믹 ${lvl.new_gimmick?.id || '없음'}) ==`);
  const IN = inputHits(L);

  // ---------- V1 스키마 v2
  {
    const err = [];
    const req = ['schema_version', 'id', 'theme_id', 'name_key', 'bpm', 'beats_per_bar', 'judge', 'scroll', 'phrases', 'contacts', 'objects', 'length_beats', 'contact_count', 'duration_s'];
    for (const k of req) if (lvl[k] === undefined) err.push(`키 ${k} 없음`);
    if (lvl.schema_version !== 2) err.push('schema_version ≠ 2');
    const wantAhead = byLv(bal.scroll.ahead_beats_by_level, id);
    if (lvl.scroll?.ahead_beats !== wantAhead || lvl.scroll?.drum_x_ratio !== bal.scroll.drum_x_ratio) err.push(`scroll ${JSON.stringify(lvl.scroll)} ≠ balance(앞쪽 ${wantAhead}, 북 ${bal.scroll.drum_x_ratio})`);
    const tagOf = (c, k) => {
      if (c.kind === 'nogo') return 'W4';
      if (c.bounce !== 'half') return bal.bounces[c.bounce]?.gimmick;
      let a = k, b = k; while (a > 0 && lvl.contacts[a - 1].kind === 'hit' && lvl.contacts[a - 1].bounce === 'half' && lvl.contacts[a - 1].phrase === c.phrase) a--; while (b + 1 < lvl.contacts.length && lvl.contacts[b + 1].kind === 'hit' && lvl.contacts[b + 1].bounce === 'half' && lvl.contacts[b + 1].phrase === c.phrase) b++;
      return b - a + 1 >= 4 ? 'W7' : 'W5';
    };
    lvl.contacts.forEach((c, i) => {
      if (c.i !== i) err.push(`접촉 ${i} 번호`);
      if (i && !(c.beat > lvl.contacts[i - 1].beat)) err.push(`접촉 ${i} 시각 증가 아님`);
      if (!Number.isInteger(c.beat * 2)) err.push(`접촉 ${i} 8분 격자 밖`);
      if (!['hit', 'nogo'].includes(c.kind)) err.push(`접촉 ${i} kind ${c.kind}`);
      if (c.kind === 'hit' && (!allowedBeats.includes(c.gap_beats) || bounceName[c.gap_beats] !== c.bounce)) err.push(`접촉 ${i} 통 ${c.bounce}/${c.gap_beats}`);
      if (c.kind === 'nogo' && (c.gap_beats !== 1 || c.bounce !== 'roof' || !Number.isInteger(c.beat))) err.push(`지붕 접촉 ${i} 비행·박`);
      if (c.gimmick !== tagOf(c, i)) err.push(`접촉 ${i} 기믹 태그 ${c.gimmick}≠${tagOf(c, i)}`);
    });
    let prevEnd = 0;
    lvl.phrases.forEach((ph, pi) => {
      if (ph.index !== pi) err.push(`구절 ${pi} 번호`);
      if (ph.start_beat !== prevEnd) err.push(`구절 ${pi} 시작 ${ph.start_beat} ≠ 앞 착지 ${prevEnd}`);
      if (ph.rest_beats < bal.rest.min_rest_beats) err.push(`구절 ${pi} 쉼 ${ph.rest_beats}박`);
      const t1 = ph.tosses[0];
      if (!t1 || t1.after_roof || t1.beat !== ph.start_beat + ph.rest_beats || t1.beat % lvl.beats_per_bar) err.push(`구절 ${pi} 토스가 쉼 끝·마디 첫 박 아님`);
      const own = lvl.contacts.filter((c) => c.phrase === pi);
      let at = null;
      for (const c of own) {
        const ts = ph.tosses.find((x) => x.to_contact === c.i);
        if (ts) at = ts.beat;
        if (at == null) { err.push(`접촉 ${c.i} 앞 사건 없음(지붕 뒤 토스 빠짐)`); continue; }
        if (Math.abs(at + c.gap_beats - c.beat) > 1e-9) err.push(`접촉 ${c.i} 비행 불일치(앞 ${at} + ${c.gap_beats} ≠ ${c.beat})`);
        if (ts && c.gap_beats < bal.rest.min_first_toss_beats) err.push(`접촉 ${c.i} 토스 비행 짧음`);
        if (c.kind === 'nogo') {
          const rs = (ph.roof_sits || []).find((r) => r.contact === c.i);
          if (!rs) { err.push(`지붕 ${c.i} roof_sits 없음`); at = null; continue; }
          const bobs = []; for (let b = c.beat + 2; b < rs.toss_beat; b++) bobs.push(b);
          if (rs.beat !== c.beat || rs.toss_beat !== c.beat + rs.sit_beats || Math.abs(rs.roof_in_beat - (c.beat - OB.roof.cover_pre_beats)) > 1e-9 || rs.roof_out_beat !== rs.toss_beat - 1 || (rs.bob_beats || []).join() !== bobs.join()) err.push(`지붕 ${c.i} 쉼 박 불일치`);
          const nt = ph.tosses.find((x) => x.after_roof && x.beat === rs.toss_beat);
          if (!nt || nt.to_contact !== c.i + 1) err.push(`지붕 ${c.i} 뒤 토스 없음`);
          at = null;
        } else at = c.beat;
      }
      const ld = ph.landings[0];
      const last = own[own.length - 1];
      if (!ld || !last || last.kind !== 'hit' || ld.from_contact !== last.i || ld.beat !== last.beat + 1) err.push(`구절 ${pi} 착지 오류`);
      prevEnd = ld ? ld.beat : prevEnd;
    });
    if (lvl.length_beats !== prevEnd + lvl.outro_beats) err.push('length_beats 불일치');
    if (lvl.contact_count !== lvl.contacts.length) err.push('contact_count 불일치');
    if (Math.abs(lvl.duration_s - lvl.length_beats * 60 / lvl.bpm) > 0.01) err.push('duration_s 불일치');
    // 물체: hit 마다 표시 1, 구름 통 = 구름, 세 박 통 = 언덕, 반박 묶음 = 가지, 지붕 접촉 = 지붕, 클리어 구름 1
    const obs = lvl.objects;
    for (const c of lvl.contacts) {
      const has = (type) => obs.filter((o) => o.type === type && o.contacts.includes(c.i));
      if (c.kind === 'hit' && has('mark').length !== 1) err.push(`접촉 ${c.i} 표시 ${has('mark').length}개`);
      if (c.kind === 'nogo' && (has('mark').length || has('roof').length !== 1)) err.push(`지붕 접촉 ${c.i} 물체 오류(표시 없음·지붕 1)`);
      if (c.kind === 'hit' && c.bounce === 'cloud' && has('cloud').length !== 1) err.push(`구름 통 ${c.i} 구름 물체 없음`);
      if (c.kind === 'hit' && c.bounce === 'three' && has('hill').length !== 1) err.push(`세 박 통 ${c.i} 언덕 물체 없음`);
      if (c.kind === 'hit' && c.bounce === 'half' && has('branch').length !== 1) err.push(`반박 ${c.i} 가지 물체 없음`);
    }
    for (const o of obs) {
      if (!['mark', 'roof', 'branch', 'cloud', 'hill'].includes(o.type)) err.push(`물체 종류 ${o.type}`);
      if (!(o.beat_out >= o.beat_in)) err.push(`물체 ${o.id} 구간`);
      if (o.type === 'mark' && (o.beat_in !== o.beat_out || o.beat_in !== lvl.contacts[o.contacts[0]].beat)) err.push(`표시 ${o.id} 박`);
      if (o.type === 'cloud' && o.role !== 'clear') { const c = lvl.contacts[o.contacts[0]]; if (o.beat_in !== c.beat - 3 || o.beat_out !== c.beat - 1) err.push(`구름 ${o.id} 구간`); }
      if (o.type === 'hill') { const c = lvl.contacts[o.contacts[0]]; if (Math.abs(o.beat_in - (c.beat - 2.25)) > 1e-9 || Math.abs(o.beat_out - (c.beat - 0.75)) > 1e-9) err.push(`언덕 ${o.id} 구간`); }
    }
    if (obs.filter((o) => o.role === 'clear').length !== 1) err.push('클리어 구름 물체 ≠ 1');
    const usedNew = [...new Set(lvl.contacts.map((c) => c.gimmick))].filter((g) => !introduced.has(g));
    const lateIntro = usedNew.filter((g) => (bal.gimmicks[g]?.level ?? '99') !== id);
    if (lateIntro.length) err.push(`이 레벨에서 소개하지 않은 새 기믹 ${lateIntro}`);
    check(id, 'V1', !err.length, err.length ? err.slice(0, 6).join(' / ') : `스키마 v2·비행·지붕 쉼·물체 일관성 정상 (구절 ${lvl.phrases.length}, 물체 ${obs.length}: 표시 ${obs.filter((o) => o.type === 'mark').length}·지붕 ${obs.filter((o) => o.type === 'roof').length}·가지 ${obs.filter((o) => o.type === 'branch').length}·구름 ${obs.filter((o) => o.type === 'cloud' && o.role !== 'clear').length}+클리어 1·언덕 ${obs.filter((o) => o.type === 'hill').length})`);
  }

  // ---------- V2, V3
  const perfect = IN.perfect.res;
  check(id, 'V2', perfect.clear && perfect.grades.filter((g) => g.grade !== 'hold').every((g) => g.grade === 'perfect') && perfect.grades.length === C.length, `박대로 치기(지붕은 참음) → ${perfect.clear ? '클리어' : '실패'}, 딱 ${perfect.grades.filter((g) => g.grade === 'perfect').length}/${H.length}, 참기 ${perfect.grades.filter((g) => g.grade === 'hold').length}/${NG.length}`);
  const none = judgeAttempt(L, []);
  check(id, 'V3', !none.clear && none.failIndex === 0, `무입력 → ${none.clear ? '클리어(!)' : `실패 (접촉 0, ${(none.failTimeMs / 1000).toFixed(2)} s, ${none.reason})`}`);
  {
    const r = judgeAttempt(L, C.map((c) => c.t));
    if (NG.length) check(id, 'V2b', !r.clear && r.reason === 'bump_roof' && C[r.failIndex].kind === 'nogo', `모든 접촉(지붕 착지 포함)을 박대로 치기 → ${r.clear ? '클리어(!)' : `실패 (접촉 ${r.failIndex}, ${r.reason})`} = 지붕 밑에서 치면 실패`);
  }

  // ---------- V4 연타
  {
    const [p0, p1, ps] = V.mash_periods_ms;
    let clears = 0, trials = 0, best = 0;
    for (let p = p0; p <= p1; p += ps) for (let ph = 0; ph < p; ph += V.mash_phase_step_ms) {
      const r = judgeAttempt(L, steady(-1000, L.durationMs + 1000, p, ph));
      trials++; if (r.clear) clears++; else best = Math.max(best, r.failIndex);
    }
    check(id, 'V4', clears === 0, `연타 ${p0}~${p1} ms × 모든 위상 ${trials}회 → 클리어 ${clears} (가장 멀리 접촉 ${best}/${C.length})`);
  }
  {
    const r = judgeAttempt(L, steady(0, L.durationMs, L.eighthMs, 0));
    check(id, 'V5', !r.clear, `8분 격자 전부 치기 → ${r.clear ? '클리어(!)' : `실패 (접촉 ${r.failIndex}, ${r.reason})`}`);
  }
  {
    const r = judgeAttempt(L, steady(0, L.durationMs, beat, 0));
    const want = +id <= 3;
    check(id, 'V14', r.clear === want, `박마다 고르게 치기 → ${r.clear ? '클리어' : `실패 (접촉 ${r.failIndex}, ${r.reason})`} (의도: ${want ? 'L1~L3 박 배우기 = 클리어' : 'L4~ 간격·지붕을 읽어야 함 = 실패'})`);
  }

  // ---------- V6 배치 규칙
  {
    const err = [];
    const newG = lvl.new_gimmick?.id;
    const newBeats = Object.values(bal.bounces).find((b) => b && b.gimmick === newG && b.kind !== 'nogo')?.beats;
    // ① (round-2 정보로 내림) 짧아지는 변화 첫 등장 앞이 토스·같은 통 반복인지. round-1 은 높이만 보고 다음 길이를 알아야 해서 검사였지만,
    //    round-2 는 길 위 표시 간격·가지 물체로 1.7 s 이상 앞에서 보이므로(V18) 정보로만 출력. 높이 읽기 부담은 K2 봇이 계속 잼.
    const seen = new Set();
    const shortInfo = [];
    for (const ph of lvl.phrases) {
      const cs = lvl.contacts.filter((c) => c.phrase === ph.index);
      for (let k = 1; k < cs.length; k++) {
        if (cs[k].kind !== 'hit' || cs[k - 1].kind !== 'hit' || ph.tosses.some((x) => x.to_contact === cs[k].i)) continue;
        const a = cs[k - 1].gap_beats, b = cs[k].gap_beats;
        if (!(b < a) || !(b === 0.5 || a === newBeats || b === newBeats)) continue;
        const key = `${a}>${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const prevToss = ph.tosses.some((x) => x.to_contact === cs[k - 1].i);
        const okRep = k >= 2 && cs[k - 2].kind === 'hit' && cs[k - 2].gap_beats === a;
        if (!prevToss && !okRep) shortInfo.push(`${key}@${cs[k].i}`);
      }
    }
    // ② 반박(가지): 앞은 1박 이상 비행(토스 포함), 묶음 2(W5)·4(W7), 뒤는 1박 비행(1-2 R2-D9·art B6: 늘린 가지 끝을 나가는 공이 스치지 않게) 또는 착지, 레벨당 묶음 예산
    const runMax = byLv(V.half_run_max, id);
    let groups = 0;
    for (let i = 0; i < C.length; i++) {
      if (!(C[i].kind === 'hit' && C[i].gapBeats === 0.5)) continue;
      let k = i; while (k < C.length && C[k].kind === 'hit' && C[k].gapBeats === 0.5 && C[k].phrase === C[i].phrase) k++;
      const len = k - i; groups++;
      const prevIsHalf = i > 0 && C[i - 1].phrase === C[i].phrase && C[i - 1].gapBeats === 0.5;
      if (prevIsHalf) err.push(`②반박 묶음(접촉 ${i}) 앞이 반박`);
      if (len > runMax || (len !== 2 && len !== 4)) err.push(`②반박 ${len}연속(접촉 ${i}, 한도 ${runMax})`);
      if (k < C.length && C[k].phrase === C[i].phrase && C[k].gapBeats !== (bal.objects.branch.exit_flight_beats ?? 1)) err.push(`②반박 묶음 뒤 비행 ${C[k].gapBeats}박 ≠ ${bal.objects.branch.exit_flight_beats ?? 1}박(가지 끝을 나가는 공, R2-D9·art B6)`);
      if (C[i].gimmick !== (len >= 4 ? 'W7' : 'W5')) err.push(`②반박 묶음 ${i} 태그`);
      i = k - 1;
    }
    const budget = byLv(V.half_groups_budget, id);
    if (groups > budget) err.push(`②반박 묶음 ${groups} > 예산 ${budget}`);
    // ③ 점 통: 1.5·1.5·1 묶음, 짝수 박에서 시작
    for (let i = 0; i < C.length; i++) {
      if (!(C[i].kind === 'hit' && C[i].gapBeats === 1.5)) continue;
      const ok = C[i + 1]?.gapBeats === 1.5 && C[i + 1]?.kind === 'hit' && C[i + 2]?.gapBeats === 1 && C[i + 2]?.kind === 'hit' && C[i + 2].phrase === C[i].phrase;
      const startBeat = C[i].beat - 1.5;
      if (!ok || startBeat % 2) err.push(`③점 통(접촉 ${i})이 1.5·1.5·1 짝수 박 시작 묶음 아님(시작 ${startBeat})`);
      i += 1;
    }
    // ⑤ 받침 쉼
    const nRest = lvl.phrases.length;
    const maxBetween = byLv(V.max_contacts_between_rests, id);
    const most = Math.max(...lvl.phrases.map((p) => p.contact_range[1] - p.contact_range[0] + 1));
    if (nRest < V.rest_count_range[0] || nRest > V.rest_count_range[1]) err.push(`⑤받침 쉼 ${nRest}회`);
    if (most > maxBetween) err.push(`⑤쉼 사이 접촉 ${most} > ${maxBetween}`);
    // ⑥ 끝 4접촉 1박 hit
    const tail = C.slice(-V.tail_tong_contacts);
    if (!tail.every((c) => c.kind === 'hit' && c.gapBeats === 1 && c.ball === 1)) err.push(`⑥마지막 접촉 ${V.tail_tong_contacts}개가 1박 통 아님`);
    check(id, 'V6', !err.length, err.length ? err.slice(0, 6).join(' / ') : `배치 규칙 ② 반박 묶음 ${groups} ≤ ${budget} ③ 점 통 짝수 박 ⑤ 받침 쉼 ${nRest}회·쉼 사이 최대 ${most} ≤ ${maxBetween} ⑥ 끝 1박 통 4 · (정보 ①) 토스·반복 없이 처음 짧아짐 ${shortInfo.join(', ') || '없음'}`);
  }

  // ---------- V7 새 기믹·카드·안전한 첫 등장(14-5: 처음 보일 때 공은 받침 쉼에 앉아 있고 화면에 다른 위험 물체 없음)
  {
    const err = [];
    const firsts = [...new Set(C.map((c) => c.gimmick))].filter((g) => !introduced.has(g));
    const ng = lvl.new_gimmick?.id || null;
    if (firsts.length > 1) err.push(`새 기믹 ${firsts.length}개(${firsts})`);
    if ((firsts[0] || null) !== ng && !(id === '01' && ng === 'W0')) err.push(`new_gimmick ${ng} ≠ 처음 쓰인 ${firsts}`);
    const wantCard = ng ? bal.gimmicks[ng]?.card : null;
    if ((lvl.card?.id || null) !== wantCard) err.push(`카드 ${lvl.card?.id} ≠ ${wantCard}`);
    if (id === '01' && !lvl.card) err.push('레벨 1 기본 카드 없음');
    let safe = '-';
    if (ng && ng !== 'W0') {
      const fc = C.find((c) => c.gimmick === ng);
      const ph = lvl.phrases[fc.phrase];
      const tossBeat = ph.tosses[0].beat;
      const obj = fc.object != null ? L.objects.find((o) => o.id === fc.object) : null;
      const appearBeat = obj ? obj.beat_in - L.scroll.ahead : fc.beat - L.scroll.ahead; // 물체(있으면) 또는 표시가 오른쪽 끝에 들어오는 박
      const tAppear = appearBeat * beat;
      const seated = tAppear >= ph.start_beat * beat - 1e-6 && tAppear <= tossBeat * beat + 1e-6;
      const others = objectsAt(L, Math.max(0, tAppear), 1000).filter((o) => isHaz(o) && o.id !== obj?.id);
      safe = `${obj ? obj.type : '표시'} 처음 보임 ${f2(appearBeat)}박(받침 쉼 ${ph.start_beat}~${tossBeat}박 ${seated ? '안' : '밖'}), 그때 다른 위험 물체 ${others.length}`;
      if (!seated) err.push(`첫 등장이 받침 쉼 동안 보이지 않음(${safe})`);
      if (others.length) err.push(`첫 등장 때 다른 위험 물체 ${others.map((o) => o.type)}`);
      if (ph.rest_beats < 4) err.push('첫 등장 구절 앞 쉼 < 4박');
    }
    check(id, 'V7', !err.length, err.length ? err.join(' / ') : `새 기믹 ${ng || '없음'}${wantCard ? `, 카드 ${wantCard}(레벨 첫 플레이 전)` : ''} · 안전한 첫 등장: ${safe}`);
    for (const g of C.map((c) => c.gimmick)) introduced.add(g);
    if (ng) introduced.add(ng);
  }

  // ---------- V8 판정 창
  {
    const err = [];
    if (!(j.perfect_ms < j.good_ms && j.good_ms <= j.pass_early_ms && j.good_ms <= j.pass_late_ms)) err.push('딱 < 좋아 ≤ 통과 아님');
    const w = j.pass_early_ms + j.pass_late_ms;
    if (prevWidth && (w > prevWidth || w < V.min_window_ratio_vs_prev * prevWidth)) err.push(`통과 폭 ${w} vs 직전 ${prevWidth}`);
    if (id === '01' && w < V.l1_min_pass_window_ms) err.push(`L1 통과 폭 ${w}`);
    const outer = j.pass_early_ms + j.miss_zone_ms;
    if (!(outer > L.eighthMs)) err.push(`놓침 구역 바깥 -${outer} 이 8분 이른 탭 못 덮음`);
    if (!(outer < beat)) err.push('1박 이른 탭이 놓침 구역 안');
    check(id, 'V8', !err.length, err.length ? err.join(' / ') : `통과 ${w} ms${prevWidth ? ` = 직전 ${prevWidth} 의 ${(100 * w / prevWidth).toFixed(1)} %` : ''} · 놓침 구역 바깥 -${outer} ms: 8분 이른 탭 -${f0(L.eighthMs)} 덮음, 1박 이른 탭 -${f0(beat)} 무시 · 지붕 창 -${j.pass_early_ms}/+${j.pass_late_ms}`);
    prevWidth = w;
  }

  // ---------- V9 레벨 1
  if (id === '01') {
    const err = [];
    const rs = bal.restart;
    if (C.length < V.l1_contact_range[0] || C.length > V.l1_contact_range[1]) err.push(`접촉 ${C.length}`);
    if (!C.every((c) => c.kind === 'hit' && c.gapBeats === 1)) err.push('1박 통 아닌 접촉');
    if (lvl.phrases.length < V.l1_rest_count_range[0] || lvl.phrases.length > V.l1_rest_count_range[1]) err.push(`받침 쉼 ${lvl.phrases.length}`);
    const counts = lvl.phrases.map((p) => p.contact_range[1] - p.contact_range[0] + 1);
    if (counts.every((x) => x === counts[0])) err.push('구절 접촉 수가 모두 같음(14-3: 구절마다 다르게)');
    const ends = {};
    for (const kind of ['late', 'early', 'bump_roof']) {
      const ph = Object.values(rs.phases_s[kind] || {}).filter(Array.isArray);
      ends[kind] = ph.length ? Math.max(...ph.map((x) => x[1])) : NaN;
      if (!(Math.abs(ends[kind] - rs.restart_delay_s) < 1e-9)) err.push(`${kind} 배분 끝 ${ends[kind]}`);
    }
    if (rs.restart_delay_s < rs.allowed_range_s[0] || rs.restart_delay_s > rs.allowed_range_s[1] || rs.confirm_button) err.push(`재시작 ${rs.restart_delay_s} s`);
    check(id, 'V9', !err.length, err.length ? err.join(' / ') : `접촉 ${C.length}(16~20), 1박 통만, 받침 쉼 ${lvl.phrases.length}회(구절 접촉 ${counts.join('·')}), 재시작 ${rs.restart_delay_s} s 자동(늦음·일찍·지붕 콩 세 판 배분 끝 ${ends.late} s)`);
  }

  // ---------- V10 실패 → 다음 판정 접촉
  {
    const s = bal.restart.restart_delay_s + C[0].t / 1000;
    let worstEnd = 0, worstStill = Infinity;
    for (const c of H) {
      const ph = restartPhases(L, { reason: 'early', failIndex: c.i, failTimeMs: c.zoneStart }, bal);
      worstEnd = Math.max(worstEnd, ph.ball_fall_fx[1]);
      worstStill = Math.min(worstStill, ph.still_best_dot[1] - ph.still_best_dot[0]);
    }
    const okE = worstEnd <= bal.restart.early_fall_rule.max_s + 1e-9 && worstStill > 0;
    const bump = NG.length ? restartPhases(L, { reason: 'bump_roof', failIndex: NG[0].i, failTimeMs: NG[0].t }, bal) : null;
    const okB = !bump || (bump.bump_fx && bump.ball_reappear_on_drum[1] === bal.restart.restart_delay_s);
    check(id, 'V10', s <= V.fail_to_next_contact_max_s && okE && okB, `실패 → 다음 판정 접촉 ${s.toFixed(2)} s ≤ ${V.fail_to_next_contact_max_s} · 일찍 실패 움직임 끝 최대 ${worstEnd.toFixed(2)} s, 정지 최소 ${worstStill.toFixed(2)} s${bump ? ` · 지붕 콩 배분 ${JSON.stringify(bump.bump_fx)} → 재시작 ${bump.ball_reappear_on_drum[1]} s` : ''}`);
    report.levels[id].fail_to_next_contact_s = +s.toFixed(2);
  }

  // ---------- V11 줄지어 내려오는 공 없음 + 탭 전 대기
  {
    let worst = 0, bad = 0;
    for (const [nm, x] of Object.entries(IN)) {
      if (!x.res.clear) { bad++; continue; }
      for (let t = 0; t < L.durationMs; t += 5) worst = Math.max(worst, ballsAt(L, t, x.hits).filter((b) => b.state === 'down').length);
    }
    let leftEarly = 0, roofSeat = 0;
    const lateHits = IN.late.hits;
    for (const c of H) for (const t of [c.t + 1, (c.t + c.passEnd) / 2, c.passEnd - 1]) {
      const b = ballsAt(L, t, lateHits).find((x) => x.ball === c.ball);
      if (!(b && b.state === 'waiting' && b.y === 0)) leftEarly++;
    }
    for (const rs of L.roofSits) for (const t of [rs.landMs + 1, (rs.landMs + rs.tossMs) / 2, rs.tossMs - 1]) {
      const b = ballsAt(L, t, IN.perfect.hits).find((x) => x.ball === 1);
      if (!(b && b.state === 'seated_roof' && b.y === 0)) roofSeat++;
    }
    check(id, 'V11', worst <= 1 && !bad && !leftEarly && !roofSeat, `동시에 내려오는 공 최대 ${worst}개(세 입력${bad ? `, 클리어 못 한 입력 ${bad}(!)` : ''}) · 늦게 친 탭 ${H.length}개 모두 탭 전까지 가죽 위 대기${leftEarly ? `(어긋남 ${leftEarly})` : ''} · 지붕 밑 쉼 ${L.roofSits.length}곳 상태 seated_roof${roofSeat ? `(어긋남 ${roofSeat})` : ''}`);
  }

  // ---------- V12 높이
  {
    const cl = bal.height.cloud_line_ratio;
    let maxHide = 0; const badVis = [], noHide = []; const apex = {};
    for (const fl of Object.values(L.flights).flat()) {
      const d = fl.to - fl.from, Hh = flightApex(d, bal);
      const name = bounceName[Math.round(d / beat * 2) / 2] || fl.kind;
      apex[name] = Hh;
      if (name === 'cloud' && !(Hh > cl)) noHide.push(f0(fl.from));
      if (Hh > cl) { maxHide = Math.max(maxHide, Math.sqrt(1 - cl / Hh) * d / 1000); if (name !== 'cloud') badVis.push(name); }
    }
    let lateMin = Infinity;
    for (const fl of Object.values(L.flights).flat()) {
      if (fl.kind !== 'bounce' || bounceName[Math.round((fl.to - fl.from) / beat * 2) / 2] !== 'cloud') continue;
      const Hh = flightApex(fl.to - fl.from - j.pass_late_ms, bal); lateMin = Math.min(lateMin, Hh);
      if (!(Hh > cl)) noHide.push(`늦은 탭 ${f0(fl.from)}`);
    }
    check(id, 'V12', maxHide <= bal.height.max_hidden_s && !badVis.length && !noHide.length, `구름 뒤 숨는 시간 최대 ${maxHide.toFixed(2)} s ≤ ${bal.height.max_hidden_s} · 구름 아닌 통이 구름선 넘음 ${badVis.join(',') || '없음'} · 구름 통이 못 넘음 ${noHide.join(',') || '없음'}${lateMin < Infinity ? ` · 가장 늦게 친 뒤 구름 통 꼭짓점 ${(100 * lateMin).toFixed(0)} %` : ''} · 꼭짓점 ${Object.entries(apex).map(([k, v]) => `${k} ${(100 * v).toFixed(0)} %`).join(', ')}`);
    report.levels[id].apex = Object.fromEntries(Object.entries(apex).map(([k, v]) => [k, +v.toFixed(3)]));
  }

  // ---------- V13
  {
    const dur = L.durationMs / 1000;
    const ok = lvl.bpm >= V.bpm_range[0] && lvl.bpm <= V.bpm_range[1] && (prevBpm == null || lvl.bpm >= prevBpm) && dur >= V.level_length_s[0] && dur <= V.level_length_s[1];
    check(id, 'V13', ok, `BPM ${lvl.bpm} (${V.bpm_range.join('~')}, 직전 ${prevBpm ?? '-'}) · 길이 ${dur.toFixed(1)} s (${V.level_length_s.join('~')})`);
    prevBpm = lvl.bpm;
  }

  // ---------- S1~S5 신호
  const M = V.signal_margin_ms;
  const risk = C.map((c) => [c.zoneStart, c.passEnd]);
  const inRisk = (t, except = -1) => risk.findIndex(([a, b], k) => k !== except && t >= a && t <= b);
  const nextZone = (t) => { const c = C.find((x) => x.zoneStart > t || x.t > t); return c ? c.zoneStart - t : Infinity; };
  const fs = fingerSchedule(L, bal);
  {
    if (id === '01') {
      const c = C[fs.contact];
      const pressRel = fs.pressStart - c.t;
      check(id, 'S1', fs.contact === 0 && pressRel >= -j.pass_early_ms && pressRel <= 0, `손가락: 토스 ${f0(fs.from)} ms 에 나타남 → 누름 시작 ${f0(pressRel)} ms(통과 창 -${j.pass_early_ms} 안) → 친 순간·늦어도 +${j.pass_late_ms} ms 사라짐, 첫 접촉 1회`);
    } else check(id, 'S1', !lvl.tutorial_finger, `손가락 그림 ${lvl.tutorial_finger ? '있음(!)' : '없음(레벨 1만)'}`);
  }
  {
    let worst = Infinity; const bad = [];
    for (const ts of L.tosses) { const m = nextZone(ts.t); worst = Math.min(worst, m); if (m < M || inRisk(ts.t) >= 0) bad.push(f0(ts.t)); }
    check(id, 'S2', !bad.length, `자동 토스 ${L.tosses.length}회(지붕 뒤 ${L.tosses.filter((x) => x.afterRoof).length}) → 다음 접촉 위험 구간까지 최소 ${f0(worst)} ms ≥ ${M}${bad.length ? ` 어긋남 ${bad}` : ''}`);
  }
  {
    let worst = Infinity; const bad = [];
    for (const tk of L.bobs) { const b = tk.t / beat; if (Math.abs(b - Math.round(b)) > 1e-6) bad.push(`정박 아님 ${b}`); const m = nextZone(tk.t); worst = Math.min(worst, m); if (m < M || inRisk(tk.t) >= 0) bad.push(f0(tk.t)); }
    check(id, 'S3', !bad.length, `'콩' ${L.bobs.length}회(지붕 밑 ${L.bobs.filter((x) => x.roof).length}) 모두 정박, 다음 위험 구간까지 최소 ${f0(worst)} ms ≥ ${M}${bad.length ? ` 어긋남 ${bad.slice(0, 4)}` : ''}`);
  }
  {
    const bad = [];
    let worstLand = Infinity;
    for (const ld of L.landings) { const k = inRisk(ld.t); if (k >= 0) bad.push(`착지 ${f0(ld.t)}∈접촉${k}`); const m = nextZone(ld.t); worstLand = Math.min(worstLand, m); if (m < M) bad.push(`착지 ${f0(ld.t)} 여유 ${f0(m)}`); }
    const overlapMs = (x0, x1, except = -1) => Math.max(0, ...risk.filter((_, k) => k !== except).map(([a, b]) => Math.min(x1, b) - Math.max(x0, a)));
    if (fs) { const o = overlapMs(fs.from, fs.goneLatest, fs.contact); if (o > 0) bad.push(`손가락 구간이 다른 접촉 위험 구간과 ${f0(o)} ms 겹침`); }
    if (L.clear && overlapMs(L.clear.launch, L.clear.resultMs) > 0) bad.push('클리어 큰 튐이 위험 구간과 겹침');
    check(id, 'S5', !bad.length, `신호('콩' ${L.bobs.length}·토스 ${L.tosses.length}·착지 ${L.landings.length}${fs ? '·손가락 1' : ''}·클리어 큰 튐 1) ∩ 위험 구간(hit 놓침 구역~통과 창 끝, 지붕 창) = ${bad.length ? bad.slice(0, 4).join(', ') : '없음'} · 착지 → 다음 위험 최소 ${f0(worstLand)} ms`);
  }
  // ---------- S6 카드 닫힘 < 레벨 시간 0
  {
    const ok = !lvl.card || (lvl.card.close_to_level_start_ms > 0 && lvl.card.timing === 'pre_level_first_play');
    check(id, 'S6', ok, lvl.card ? `카드 ${lvl.card.id}: 닫는 탭 → 레벨 시간 0 까지 ${lvl.card.close_to_level_start_ms} ms(카드는 레벨 시작 전 닫힘, 플레이 중 카드 없음)` : '카드 없음');
  }
  // ---------- S7 L1 손가락 ∩ 위험 물체가 보이는 창 = 0
  if (id === '01') {
    let o = 0;
    for (let t = fs.from; t <= fs.goneLatest; t += 5) o += objectsAt(L, t, 1000).filter(isHaz).length ? 5 : 0;
    check(id, 'S7', o === 0, `L1 손가락 ${f0(fs.from)}~${f0(fs.goneLatest)} ms ∩ 위험 물체(지붕·가지·구름·언덕)가 화면에 보이는 시간 = ${o} ms (L1 위험 물체 ${L.objects.filter(isHaz).length}개)`);
  }
  // ---------- S8 지붕 레벨: 손가락 없음, 지붕 카드
  if (NG.length || lvl.new_gimmick?.id === 'W4') {
    const ok = !lvl.tutorial_finger && (lvl.new_gimmick?.id !== 'W4' || lvl.card?.id === bal.gimmicks.W4.card);
    check(id, 'S8', ok, `지붕 ${NG.length}개 레벨: 손가락 그림 ${lvl.tutorial_finger ? '있음(!)' : '없음'}${lvl.new_gimmick?.id === 'W4' ? ` · 지붕 카드 ${lvl.card?.id}(그림 = 공이 지붕 밑에 앉아 있고 손이 떨어져 있음, art 30-art)` : ''}`);
  }
  // ---------- S9 지붕 밑 착지 ±1박(열린 구간) 안 신호 0 — '콩'·토스·착지·hit 판정 순간·콤보 화음·hold 칸 채움·곡 음(art)
  if (NG.length) {
    const bad = [], badMusic = [];
    const ce = comboEvents(L, IN.perfect.res, bal);
    let on = null;
    if (musicOnsets && !SOUND._error) { try { on = musicOnsets(lvl, SOUND); } catch { on = null; } }
    for (const rs of L.roofSits) {
      const a = rs.landMs - beat + 1e-6, b = rs.landMs + beat - 1e-6;
      const inW = (t) => t > a && t < b;
      L.bobs.filter((x) => inW(x.t)).forEach((x) => bad.push(`'콩' ${f0(x.t)}`));
      L.tosses.filter((x) => inW(x.t)).forEach((x) => bad.push(`토스 ${f0(x.t)}`));
      L.landings.filter((x) => inW(x.t)).forEach((x) => bad.push(`착지 ${f0(x.t)}`));
      H.filter((c) => inW(c.t)).forEach((c) => bad.push(`hit 접촉 ${c.i}`));
      ce.stages.filter((s) => s.chordMs != null && inW(s.chordMs)).forEach((s) => bad.push(`콤보 ${s.stage} 화음`));
      ce.events.filter((e) => inW(e.t) && e.kind === 'hold').forEach((e) => bad.push(`hold 칸 ${e.i}`));
      if (on) on.filter((o) => inW(o.beat * beat) && Math.abs(o.beat * beat - rs.landMs) < beat).forEach((o) => badMusic.push(`${o.beat}박 ${o.sound}`));
    }
    check(id, 'S9', !bad.length, `지붕 ${L.roofSits.length}곳 착지 ±1박 안 '콩'·토스·착지·hit 판정·콤보 화음·hold 칸 채움 = ${bad.length ? bad.slice(0, 5).join(', ') : '없음'} (hold 칸 = 지붕이 떠나는 순간 착지 +${f2((L.roofSits[0].roofOut - L.roofSits[0].landMs) / beat)}박~)`);
    if (!on) wait(id, 'S9m', `곡 음(art tools/art/music.mjs) 읽기 실패 ${musicErr} — art 대기`);
    else if (badMusic.length) wait(id, 'S9m', `곡 음 시작이 지붕 착지 ±1박 안 ${badMusic.length}개(${badMusic.slice(0, 4).join(', ')}) — art: sound.json onset_rule 에 지붕 밑 쉼(roof_sits) 규칙(착지 박 ±1박 곡 북·베이스 없음) 추가 대기`);
    else check(id, 'S9m', true, '곡 음 시작 ∩ 지붕 착지 ±1박 = 없음(art music.mjs)');
  }

  // ---------- V15 곡 음 시작 ∩ 놓침 구역
  {
    if (SOUND._error || !SOUND.music || !musicOnsets) wait(id, 'V15', `곡 음 규칙 읽기 실패(${SOUND._error || musicErr || 'music 없음'}) — art 대기`);
    else {
      let on;
      try { on = musicOnsets(lvl, SOUND); } catch (e) { on = null; wait(id, 'V15', `musicOnsets 실행 실패 ${e.message} — art 대기`); }
      if (on) {
        const beatsOn = [...new Set(on.map((o) => o.beat))];
        const clash = [];
        for (const ob of beatsOn) {
          const tm = ob * beat;
          if (C.some((c) => Math.abs(c.t - tm) < 5)) continue;
          const k = C.findIndex((c) => c.kind === 'hit' && tm >= c.zoneStart && tm < c.passStart);
          if (k >= 0) clash.push(`${ob}박→접촉 ${k}(${C[k].beat}박)`);
        }
        const nRest = on.filter((o) => o.part === 'rest' && o.sound !== 'bass').length;
        const restBobs = L.bobs.filter((x) => !x.roof).length;
        const msg = `곡 음 시작 ${beatsOn.length}박 ∩ hit 놓침 구역 = ${clash.length ? clash.slice(0, 4).join(', ') : '없음'} · 받침 쉼 '콩' ${nRest} / 받침 쉼 박 ${restBobs}`;
        if (clash.length || nRest !== restBobs) wait(id, 'V15', msg + ' — art: round-2 곡 규칙(지붕 밑 쉼 박·새 레벨 박) 대기');
        else check(id, 'V15', true, msg);
      }
    }
  }

  // ---------- V16 화면 높이 (layout.json 식 × 4해상도 × 실제 BPM)
  {
    const err = [];
    if (!layoutOk) wait(id, 'V16', 'assets/layout.json play_height 읽기 실패 — art 대기');
    else {
      const PH = LAYOUT.play_height;
      const flights = Object.values(L.flights).flat().map((fl) => ({ dur: fl.to - fl.from, name: bounceName[Math.round((fl.to - fl.from) / beat * 2) / 2] || fl.kind }));
      const maxApex = Math.max(...flights.map((x) => flightApex(x.dur, bal)), L.clear ? L.clear.apex : 0);
      if (!(PH.apex_budget >= maxApex - 1e-3)) err.push(`apex_budget ${PH.apex_budget} < 최대 꼭짓점 ${maxApex.toFixed(4)}`);
      if (Math.abs(PH.cloud_edge_of_Hp - bal.height.cloud_line_ratio) > 1e-9) err.push(`구름선 ${PH.cloud_edge_of_Hp} ≠ ${bal.height.cloud_line_ratio}`);
      const topMax = Math.max(...flights.filter((x) => x.name !== 'cloud').map((x) => flightApex(x.dur, bal)));
      const shortest = Math.min(...flights.map((x) => x.dur));
      const rows = [];
      for (const [W, Hh, st, sb] of V.layout_resolutions) {
        const g = layoutGeom(LAYOUT, W, Hh, st, sb);
        const top = topMax + g.d / g.Hp;
        const shortPx = flightApex(shortest, bal) * g.Hp;
        if (g.d < bal.height.ball_min_render_px) err.push(`${W}x${Hh} 공 ${g.d} px`);
        if (top > bal.height.noncloud_ball_top_max_ratio + 1e-9) err.push(`${W}x${Hh} 구름 아닌 공 윗점 ${top.toFixed(3)} Hp`);
        if (shortPx < bal.height.min_apex_of_d * g.d - 1e-9) err.push(`${W}x${Hh} 가장 짧은 튐 ${(shortPx / g.d).toFixed(2)}d < ${bal.height.min_apex_of_d}d`);
        rows.push(`${W}x${Hh} Hp ${g.Hp.toFixed(0)}·d ${g.d}: 윗점 ${top.toFixed(3)}·짧은 튐 ${shortPx.toFixed(0)} px`);
      }
      const msg = `최대 꼭짓점 ${maxApex.toFixed(3)} Hp, 구름 아닌 최대 ${topMax.toFixed(3)}, 가장 짧은 비행 ${f0(shortest)} ms · ${rows.join(' | ')}`;
      if (err.length) wait(id, 'V16', `${err.slice(0, 4).join(' / ')} — art layout.json(round-2 Hp 재배분, E5) 대기 · ${msg}`);
      else check(id, 'V16', true, `apex_budget·구름선·윗점·짧은 튐 ≥ ${bal.height.min_apex_of_d}d 통과 · ${msg} (세로 짧은 튐 px 는 정보: round-2 의 "가장 짧은 길이 표시 ≥ 32 px"는 길 위 표시 간격이 맡음 — V20)`);
    }
  }

  // ---------- V17 클리어 연출·길 멈춤·클리어 구름
  {
    const err = [];
    const cs = lvl.clear_sequence, CS = bal.clear_sequence;
    const lastLand = lvl.phrases[lvl.phrases.length - 1].landings[0].beat;
    if (!cs || !L.clear) err.push('clear_sequence 없음');
    else {
      if (cs.big_toss_beat !== lastLand) err.push('큰 튐 ≠ 마지막 착지');
      if (lvl.outro_beats !== byLv(CS.outro_beats_by_level, id)) err.push('마무리 박');
      if (cs.result_beat !== lvl.length_beats) err.push('결과 박 ≠ 끝 박');
      if (cs.grade_cloud_beats.join() !== CS.grade_clouds_beats_before_end.map((x) => lvl.length_beats - x).join()) err.push('등급 구름 박');
      if (!(L.clear.cloudEnterMs < L.clear.gradeCloudMs[0])) err.push('구름 들어감 ≥ 첫 등급 구름');
      if (cs.scroll_stop_beat !== cs.big_toss_beat + CS.scroll_stop_beats_after_big_toss) err.push('길 멈춤 박');
      const cc = L.objects.find((o) => o.role === 'clear');
      if (!cc || cc.beat_in !== cs.big_toss_beat + CS.clear_cloud_beats_after_big_toss[0] || cc.beat_out !== cs.big_toss_beat + CS.clear_cloud_beats_after_big_toss[1]) err.push('클리어 구름 구간');
      else if (!(cc.tIn <= L.clear.cloudEnterMs && cc.tOut >= cs.scroll_stop_beat * beat)) err.push(`클리어 구름이 공 들어갈 때(${f0(L.clear.cloudEnterMs)}) 북 위에 없음`);
      if (scrollBeatAt(L, L.durationMs) !== cs.scroll_stop_beat) err.push('scrollBeatAt 멈춤');
    }
    if (lvl.card && lvl.card.close_to_level_start_ms !== bal.level_start.card_close_to_level_start_ms) err.push('카드 닫기 간격');
    check(id, 'V17', !err.length, err.length ? err.join(' / ') : `큰 튐 ${cs.big_toss_beat}박 → 구름 들어감 +${((L.clear.cloudEnterMs - L.clear.launch) / 1000).toFixed(2)} s < 첫 등급 구름 +${((L.clear.gradeCloudMs[0] - L.clear.launch) / 1000).toFixed(2)} s · 클리어 구름 ${cs.big_toss_beat + 1}~${cs.big_toss_beat + 3}박, 길 멈춤 ${cs.scroll_stop_beat}박 · 결과 ${lvl.length_beats}박(마무리 ${lvl.outro_beats}박)`);
  }

  // ---------- V18 보이는 시간 (14-5)
  {
    const S = V.see;
    const hitMin = +id <= 4 ? S.hit_min_s_l1_l4 : S.hit_min_s;
    let mh = Infinity, md = Infinity, mn = Infinity;
    for (const c of H) { const fv = Math.max(0, firstVisibleMs(L, c.beat)); mh = Math.min(mh, (c.t - fv) / 1000); md = Math.min(md, (c.passStart - fv) / 1000); }
    for (const c of NG) { const ro = L.objects.find((o) => o.id === c.object); const fv = Math.max(0, firstVisibleMs(L, ro.beat_in)); mn = Math.min(mn, (c.t - fv) / 1000); }
    const ok = mh >= hitMin - 1e-9 && md >= S.decide_min_s - 1e-9 && (mn === Infinity || mn >= S.nogo_min_s - 1e-9);
    check(id, 'V18', ok, `처음 보임 → 판정: hit 최소 ${mh.toFixed(2)} s ≥ ${hitMin} · 판단 시간(보임 → 통과 창 열림) 최소 ${md.toFixed(2)} s ≥ ${S.decide_min_s}${mn < Infinity ? ` · 지붕(보임 → 착지) 최소 ${mn.toFixed(2)} s ≥ ${S.nogo_min_s}` : ''} (앞쪽 ${L.scroll.ahead}박 = ${(L.scroll.ahead * beat / 1000).toFixed(2)} s)`);
    report.levels[id].see = { hit_min_s: +mh.toFixed(3), decide_min_s: +md.toFixed(3), nogo_min_s: mn === Infinity ? null : +mn.toFixed(3) };
  }

  // ---------- V19 한 화면 위험 수 (14-5): 길 보이는 구간 [지금 − 뒤쪽 박, 지금 + 앞쪽 박]
  {
    const S = V.see;
    const behind = (L.scroll.drumX / (1 - L.scroll.drumX)) * L.scroll.ahead;
    let mk = 0, ty = 0, rf = 0, cd = 0, at = {};
    const lim = byLv(S.hazard_types_max, id);
    for (let t = 0; t <= L.clearTimeMs; t += S.sample_ms) {
      const now = scrollBeatAt(L, t);
      const vis = L.objects.filter((o) => o.beat_out >= now - behind && o.beat_in <= now + L.scroll.ahead);
      const marks = vis.filter((o) => o.type === 'mark' && o.beat_in > now + 1e-9).length;
      const haz = vis.filter(isHaz);
      const types = new Set(haz.map((o) => o.type)).size;
      const roofs = haz.filter((o) => o.type === 'roof').length, clouds = haz.filter((o) => o.type === 'cloud').length;
      if (marks > mk) { mk = marks; at.mk = f0(t); }
      if (types > ty) { ty = types; at.ty = f0(t); }
      rf = Math.max(rf, roofs); cd = Math.max(cd, clouds);
    }
    const ok = mk <= S.marks_on_screen_max && ty <= lim && rf <= S.roof_on_screen_max && cd <= S.cloud_on_screen_max;
    check(id, 'V19', ok, `한 화면(뒤 ${behind.toFixed(1)}박 + 앞 ${L.scroll.ahead}박) 최대: 앞쪽 표시 ${mk} ≤ ${S.marks_on_screen_max} · 위험 물체 종류 ${ty} ≤ ${lim} · 지붕 ${rf} ≤ 1 · 구름 ${cd} ≤ 1`);
  }

  // ---------- V20 가장 짧은 표시 간격 px (4해상도)
  {
    const mb = H.map((c) => c.beat);
    let minGap = Infinity; for (let k = 1; k < mb.length; k++) minGap = Math.min(minGap, mb[k] - mb[k - 1]);
    const rows = V.layout_resolutions.map(([W, Hh]) => [W, Hh, minGap * pxPerBeat(L, W)]);
    const worst = Math.min(...rows.map((r) => r[2]));
    check(id, 'V20', worst >= bal.scroll.min_mark_gap_px - 1e-9, `가장 짧은 표시 간격 ${minGap}박 → ${rows.map(([W, Hh, px]) => `${W}x${Hh} ${px.toFixed(1)} px`).join(' · ')} (최소 ${worst.toFixed(1)} ≥ ${bal.scroll.min_mark_gap_px}, 1박 = (1 − ${L.scroll.drumX})·W / ${L.scroll.ahead})`);
    report.levels[id].min_mark_gap_px = +worst.toFixed(1);
  }

  // ---------- V21 지붕 배치 규칙 ①~⑦
  {
    const err = [];
    const [rmin, rmax] = byLv(V.roof_count, id);
    if (NG.length < rmin || NG.length > rmax) err.push(`⑥지붕 ${NG.length}개 ∉ [${rmin}, ${rmax}]`);
    for (const c of NG) {
      const rs = L.roofSits.find((r) => r.contact === c.i);
      const prev = C[c.i - 1], prev2 = C[c.i - 2], next = C[c.i + 1], next2 = C[c.i + 2];
      if (!(prev && prev.kind === 'hit' && prev.phrase === c.phrase && c.beat - prev.beat === 1)) err.push(`①지붕 ${c.i} 들어오는 비행 ≠ 1박`);
      const ro = L.objects.find((o) => o.id === c.object);
      if (!ro || ro.under_of_Hp !== OB.roof.under_of_Hp) err.push(`②지붕 ${c.i} 높이`);
      if (!(rs.roofIn > prev.passEnd + 30 - 1e-6)) err.push(`④지붕 ${c.i} 덮기 시작 ${f0(rs.roofIn)} ≤ 앞 접촉 통과 창 끝 ${f0(prev.passEnd)} + 30`);
      if (!(rs.roofIn <= c.passStart && rs.roofOut >= c.passEnd)) err.push(`④지붕 ${c.i} 창이 지붕 밑에 다 들지 않음`);
      if (!(rs.roofOut >= c.t + beat - 1e-6)) err.push(`④지붕 ${c.i} 착지 뒤 1박 전에 떠남`);
      if (!(rs.tossMs >= rs.roofOut + beat - 1e-6)) err.push(`④지붕 ${c.i} 떠난 뒤 1박 전에 토스`);
      if (!(next && next.t - rs.tossMs >= beat - 1e-6)) err.push(`④지붕 ${c.i} 토스 → 다음 접촉 < 1박`);
      const okFront = prev2 && prev2.kind === 'hit' && prev2.gapBeats === 1 && prev.gapBeats === 1 && prev2.phrase === c.phrase;
      const okBack = next && next2 && next.kind === 'hit' && next2.kind === 'hit' && next.gapBeats === 1 && next2.gapBeats === 1 && next2.phrase === c.phrase;
      if (!okFront || !okBack) err.push(`⑤지붕 ${c.i} 앞뒤 1박 통 2개씩 아님`);
      if (!V.roof_sit_beats.includes(rs.tossMs / beat - c.beat)) err.push(`지붕 ${c.i} 쉼 ${rs.tossMs / beat - c.beat}박`);
      const under = H.filter((h) => h.t >= rs.roofIn - 1e-6 && h.t <= rs.roofOut + 1e-6);
      if (under.length) err.push(`지붕 ${c.i} 밑에 hit 접촉 ${under.map((h) => h.i)}`);
    }
    if (NG.length && lvl.tutorial_finger) err.push('⑦지붕 레벨에 손가락');
    if (NG.length || rmin) check(id, 'V21', !err.length, err.length ? err.slice(0, 5).join(' / ') : `지붕 ${NG.length}개(쉼 ${L.roofSits.map((r) => r.tossMs / beat - r.landMs / beat).join('·')}박): ① 1박으로 들어옴 ② 아랫면 ${OB.roof.under_of_Hp}·Hp ③ 착지 박 소리 없음(S9) ④ 덮기 시작 = 착지 −${OB.roof.cover_pre_beats}박(앞 통과 창 끝 +${f0(Math.min(...NG.map((c) => L.roofSits.find((r) => r.contact === c.i).roofIn - C[c.i - 1].passEnd)))} ms 뒤), 착지 +1박 이상 덮음, 떠난 뒤 1박 토스 ⑤ 앞뒤 1박 통 2개 ⑥ 개수 [${rmin}, ${rmax}] ⑦ 손가락 없음 · 지붕 밑 hit 0`);
  }

  // ---------- V22 물체 ↔ 공 여유 (Hp: 세 입력 × 5 ms, px: 4해상도 d/Hp)
  {
    const err = [];
    const res = layoutOk ? V.layout_resolutions.map(([W, Hh, st, sb]) => ({ W, Hh, ...layoutGeom(LAYOUT, W, Hh, st, sb) })) : [];
    const marginD = V.object_clear_margin_of_d;
    const rows = [];
    for (const o of L.objects.filter((x) => isHaz(x))) {
      let ballTopMax = 0, ballBotMin = Infinity, notFlight = 0;
      for (const x of Object.values(IN)) {
        if (!x.res.clear) continue;
        for (let t = o.tIn; t <= o.tOut; t += 5) {
          const b = ballsAt(L, t, x.hits).find((q) => q.ball === 1);
          ballTopMax = Math.max(ballTopMax, b.y);
          if (o.type === 'hill' || o.type === 'cloud') { if (!b.flight || b.flight.toContact !== o.contacts[0]) notFlight++; else ballBotMin = Math.min(ballBotMin, b.y); }
        }
      }
      if (o.type === 'roof' || o.type === 'branch') {
        // (1-2 art B6) 공을 원 모양 그대로: 물체 끝이 공 가운데에서 dx 떨어져 있으면 그 자리 공 윗선 = 아랫점 + d/2 + √((d/2)² − dx²). 물체가 공 너비(±d/2)에 걸친 동안 전부
        for (const g of res) {
          const ppb = pxPerBeat(L, g.W), r = g.d / 2;
          let worst = Infinity;
          for (const x of Object.values(IN)) {
            if (!x.res.clear) continue;
            for (let t = (o.beat_in - r / ppb) * L.beatMs; t <= (o.beat_out + r / ppb) * L.beatMs; t += 5) {
              const nowB = t / L.beatMs, xin = (o.beat_in - nowB) * ppb, xout = (o.beat_out - nowB) * ppb; // 공 가운데 = 0
              const dx = xin > 0 ? xin : xout < 0 ? -xout : 0;
              if (dx >= r) continue;
              const yb = ballsAt(L, t, x.hits).find((q) => q.ball === 1).y * g.Hp;
              worst = Math.min(worst, o.under_of_Hp * g.Hp - (yb + r + Math.sqrt(r * r - dx * dx)));
            }
          }
          if (worst < marginD * g.d) err.push(`${o.type} ${o.id} ${g.W}x${g.Hh} 공(원 모양) 윗선 여유 ${worst.toFixed(1)} px < ${(marginD * g.d).toFixed(1)}`);
        }
        if (!res.length && ballTopMax >= o.under_of_Hp) err.push(`${o.type} ${o.id} 공 아랫점 ${ballTopMax.toFixed(3)} ≥ 아랫면`);
        rows.push(`${o.type}@${o.beat_in}: 공 최고 ${ballTopMax.toFixed(3)} < 아랫면 ${o.under_of_Hp}`);
      } else if (o.type === 'hill') {
        if (notFlight) err.push(`언덕 ${o.id} 구간에 세 박 통 비행이 아닌 때 ${notFlight}`);
        for (const g of res) { const gapPx = (ballBotMin - o.top_of_Hp) * g.Hp; if (gapPx < marginD * g.d) err.push(`언덕 ${o.id} ${g.W}x${g.Hh} 여유 ${gapPx.toFixed(1)} px`); }
        rows.push(`hill@${o.beat_in}: 공 아랫점 최저 ${ballBotMin.toFixed(3)} > 꼭대기 ${o.top_of_Hp}`);
      } else if (o.type === 'cloud') {
        if (notFlight) err.push(`구름 ${o.id} 구간에 구름 통 비행이 아닌 때 ${notFlight}`);
        rows.push(`cloud@${o.beat_in}: 구간 안 공은 늘 그 구름 통 비행(최저 ${ballBotMin.toFixed(2)} Hp)`);
      }
    }
    if (!L.objects.some(isHaz)) check(id, 'V22', true, '위험 물체 없음');
    else check(id, 'V22', !err.length, (err.length ? err.slice(0, 4).join(' / ') : `세 입력 × 5 ms 표본에서 모든 물체 여유 통과${res.length ? `(4해상도 px, 여유 ≥ ${marginD}d, 지붕·가지는 공을 원 모양으로, 공 너비 ±d/2 동안)` : ''}`) + ` · ${rows.slice(0, 4).join(' · ')}${rows.length > 4 ? ` 외 ${rows.length - 4}` : ''}`);
  }

  // ---------- V23 물체 윗선 ≥ HUD 띠 아래 + gap (art layout.json world·cloud·hud 를 읽음) · 보이는 공 윗점 ≥ HUD 띠 아래
  {
    const WO = LAYOUT.world;
    const types = [...new Set(L.objects.filter((o) => o.type !== 'mark').map((o) => o.type))];
    if (!layoutOk || !WO || !LAYOUT.hud?.band_h) wait(id, 'V23', 'layout.json world·hud.band_h 없음 — art 대기');
    else {
      const err = [], rows = [];
      const flights = Object.values(L.flights).flat().map((fl) => fl.to - fl.from);
      const visTop = Math.max(...flights.map((d0) => flightApex(d0, bal)).filter((x) => x <= bal.height.cloud_line_ratio)); // 숨지 않는 비행 최대 꼭짓점
      for (const [W, Hh, st, sb] of V.layout_resolutions) {
        const g = layoutGeom(LAYOUT, W, Hh, st, sb);
        const tops = {};
        for (const ty of types) {
          let y = null;
          if (ty === 'roof' && WO.roof) y = g.skinY - OB.roof.under_of_Hp * g.Hp - ((WO.roof.body_h_of_d ?? 0) + (WO.roof.dome_of_d ?? 0)) * g.d;
          else if (ty === 'branch' && WO.branch) y = g.skinY - OB.branch.under_of_Hp * g.Hp - ((WO.branch.twig_h_of_d ?? 0) + (WO.branch.leaf_len_of_d ?? 0)) * g.d;
          else if (ty === 'hill' && WO.hill) y = g.skinY - OB.hill.top_of_Hp * g.Hp;
          else if (ty === 'cloud' && LAYOUT.cloud) {
            y = g.hudBottom; // art: 구름 윗선 = HUD 띠 아래 + gap(정의)
            const bottom = g.skinY - bal.height.cloud_line_ratio * g.Hp + (LAYOUT.cloud.below_edge_of_d ?? 0) * g.d;
            if (!(bottom - y >= g.d)) err.push(`${W}x${Hh} 구름 높이 ${(bottom - y).toFixed(0)} px < 공 지름 ${g.d}`);
          }
          if (y == null) { err.push(`${ty} 그림 높이 키 없음`); continue; }
          tops[ty] = y;
          if (y < g.hudBottom - 1e-6) err.push(`${W}x${Hh} ${ty} 윗선 y ${y.toFixed(0)} < HUD 띠 아래 ${g.hudBottom}`);
        }
        const ballTop = g.skinY - visTop * g.Hp - g.d;
        if (ballTop < g.hudBottom - 1e-6) err.push(`${W}x${Hh} 보이는 공 윗점 y ${ballTop.toFixed(0)} < HUD 띠 아래 ${g.hudBottom}`);
        rows.push(`${W}x${Hh} 띠 ${g.hudBottom}: ${Object.entries(tops).map(([k, v]) => `${k} ${v.toFixed(0)}`).join('·')}·공 ${ballTop.toFixed(0)}`);
      }
      if (err.length) wait(id, 'V23', `${err.slice(0, 4).join(' / ')} — art layout.json 대기 · ${rows.join(' | ')}`);
      else check(id, 'V23', true, `세계 물체(${types.join('·') || '없음'})·보이는 공 윗선 ≥ HUD 띠 아래 + gap(4해상도, y 가 클수록 아래) · ${rows.join(' | ')}`);
    }
  }
});

// ---------- V20b / S10: layout 북 자리·콤보 자리 (art)
{
  log('\n== 화면 자리 (art layout.json, 읽기만) ==');
  if (layoutDrumX == null) wait('all', 'V20b', `layout.json 에 북 가로 자리(drum.x_of_W 등) 없음 — art 대기(balance 값 ${bal.scroll.drum_x_ratio})`);
  else if (Math.abs(layoutDrumX - bal.scroll.drum_x_ratio) > 1e-9) wait('all', 'V20b', `layout 북 자리 ${layoutDrumX} ≠ balance ${bal.scroll.drum_x_ratio} — art 대기`);
  else check('all', 'V20b', true, `layout 북 자리 ${layoutDrumX} = balance`);
  const CB = LAYOUT.combo || null;
  if (!CB || !CB.place || !CB.shape) wait('all', 'S10', 'layout.json 에 콤보 자리(combo.place·shape) 없음 — art 대기(조건: HUD 띠 안 진행도 막대 아래, 다가오는 길 영역(x ≥ 북 왼쪽 끝, y = HUD 띠 아래 ~ 길 아랫선)에 그리지 않음)');
  else {
    const err = [], rows = [];
    const pop = Math.max(...(CB.update?.scale || [1])); // 갱신 튐(1.15), 5단계는 점 칸만 1.3(art combo.stage.5)
    for (const [W, Hh, st, sb] of V.layout_resolutions) {
      const g = layoutGeom(LAYOUT, W, Hh, st, sb);
      const pl = g.portrait ? CB.place.portrait : CB.place.landscape;
      const half = Math.max(CB.shape.slot_px * 1.3, CB.shape.ten_px * pop) / 2;
      const y0 = st + pl.cy - half, y1 = st + pl.cy + half;
      if (y0 < st - 1e-6 || y1 > g.hudBand + 1e-6) err.push(`${W}x${Hh} 콤보 ${y0.toFixed(0)}~${y1.toFixed(0)} 가 HUD 띠 [${st}, ${g.hudBand}] 밖`);
      rows.push(`${W}x${Hh} ${y0.toFixed(0)}~${y1.toFixed(0)} ⊂ [${st}, ${g.hudBand}]`);
    }
    if (err.length) wait('all', 'S10', err.join(' / ') + ' — art 대기');
    else check('all', 'S10', true, `콤보 점 줄·큰 표지(점 1.3배·표지 ${pop}배 튐 포함)가 4해상도 모두 HUD 띠 안 = 다가오는 길 영역 밖: ${rows.join(' · ')}`);
  }
}

// ---------- V-R0 도구 검증 + V-R1~R7
log('\n== 반복 방지 V-R (00-benchmark 14-4) ==');
{
  const R = V.vr;
  const dir = join(PROJECT, R.r1_fixture_dir);
  const err = [];
  const rows = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const l = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const want = R.r1_expected[l.id];
    if (!want) continue;
    const s = repeatStats(l);
    const got = [+s.risk_ratio.toFixed(2), s.chunks, s.distinct_chunks, s.max_same_run, +(s.gram3.dup ?? 0).toFixed(2), +(s.gram4.dup ?? 0).toFixed(2)];
    if (got.some((x, k) => Math.abs(x - want[k]) > 0.005 + 1e-9)) err.push(`L${l.id} ${got} ≠ ${want}`);
    rows.push(`L${+l.id} ${got[0]}/${got[1]}·${got[2]}/${got[3]}/${got[4]}/${got[5]}`);
  }
  check('all', 'V-R0', !err.length && rows.length === 9, `round-1 레벨(tools/fixtures/r1-levels)을 같은 정의로 재면 14-1 [r1 실측] 표와 같음: ${err.length ? err.join(' / ') : rows.join(' · ')} (비율/덩어리·서로 다른/연속/3-gram/4-gram)`);
  // round-1 을 이 검사 기준으로 보면 실패함(정보)
  const r1Fail = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const l = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (+l.id < 2) continue;
    const s = repeatStats(l);
    const bad = [];
    if (s.gram3.dup > byLv(R.gram3_max, l.id) + 1e-9) bad.push('R1');
    if (s.gram4.dup > byLv(R.gram4_max, l.id) + 1e-9) bad.push('R1');
    if (s.max_same_run > 1) bad.push('R2');
    if (s.distinct_chunks < R.min_distinct_chunks[l.id]) bad.push('R3');
    if (bad.length) r1Fail.push(`L${+l.id} ${[...new Set(bad)].join('·')}`);
  }
  info('V-R0', `round-1 레벨에 round-2 기준을 대면: ${r1Fail.join(', ')} 실패(= 요청자 지적 "반복적인 리스크"), 레벨 사이 구절 시작 "1 1 1 1 1.5 1.5 1" L4·5·7·8·9 같음(R4)`);
}
{
  const R = V.vr;
  const all = levels.map((l) => ({ l, s: repeatStats(l, { excludeTeaching: true }), raw: repeatStats(l) }));
  log('레벨 | 위험 토큰 비율(앞/뒤 절반) | 덩어리 / 서로 다른 | 연속 최대 | 최다 횟수 | 3-gram | 4-gram | 덩어리 사이 간격(박) | 덩어리');
  for (const { l, s } of all) log(`${l.id} | ${s.risk_ratio} (${s.risk_ratio_halves.join('/')}) | ${s.chunks} / ${s.distinct_chunks} | ${s.max_same_run ?? '-'} | ${s.max_occurrence} | ${f2(s.gram3.dup)} | ${f2(s.gram4.dup)} | ${s.gaps.join(',')} | ${s.chunk_list.join(' ‖ ')}`);
  for (const { l, s } of all) {
    const id = l.id;
    if (+id < 2) continue;
    const g3 = byLv(R.gram3_max, id), g4 = byLv(R.gram4_max, id);
    check(id, 'V-R1', (s.gram3.dup ?? 0) <= g3 + 1e-9 && (s.gram4.dup ?? 0) <= g4 + 1e-9, `n-gram 중복(가르치기 덩어리 뺌): 3-gram ${f2(s.gram3.dup)} ≤ ${g3} · 4-gram ${f2(s.gram4.dup)} ≤ ${g4} (2-gram ${f2(s.gram2.dup)} 정보)`);
    check(id, 'V-R2', (s.max_same_run ?? 0) <= 1, `같은 위험 덩어리 연속 최대 ${s.max_same_run}회(0회 연속 = 1)`);
    check(id, 'V-R3', s.distinct_chunks >= R.min_distinct_chunks[id] && s.max_occurrence <= R.max_chunk_occurrence, `서로 다른 덩어리 ${s.distinct_chunks} ≥ ${R.min_distinct_chunks[id]} · 한 덩어리 최다 ${s.max_occurrence}회 ≤ ${R.max_chunk_occurrence}(가르치기 뺌)`);
    if (+id >= +R.gap_check_from_level) {
      let run3 = false; for (let q = 2; q < s.gaps.length; q++) if (s.gaps[q] === s.gaps[q - 1] && s.gaps[q] === s.gaps[q - 2]) run3 = true;
      check(id, 'V-R5', new Set(s.gaps).size >= R.gap_distinct_min && !run3, `덩어리 사이 간격 ${s.gaps.join('·')}박: 서로 다른 값 ${new Set(s.gaps).size} ≥ ${R.gap_distinct_min}, 같은 간격 3번 연속 ${run3 ? '있음(!)' : '없음'}`);
    }
    // V-R6 톱니: 위험 3개 이상 덩어리 뒤 1박 통 2개 이상 또는 받침 쉼(그 구절 끝까지 1박 통만), 앞 절반 비율 ≤ 뒤 절반 + 0.15 (끝 고정 1박 통 4개 뺌)
    const tz = tokenize(l);
    const bad = [];
    for (const c of s.chunks_detail) if (c.riskCount >= R.sawtooth_big_chunk) {
      const toks = tz[c.phrase].tokens; const k = toks.findIndex((x) => x.i === c.contacts[c.contacts.length - 1]);
      const rest = toks.slice(k + 1);
      if (!(rest.slice(0, R.sawtooth_after_tongs).length >= R.sawtooth_after_tongs && rest.slice(0, R.sawtooth_after_tongs).every((x) => !x.risk)) && !rest.every((x) => !x.risk)) bad.push(c.key);
    }
    const [h1, h2] = s.risk_ratio_halves;
    check(id, 'V-R6', !bad.length && h1 <= h2 + R.half_ratio_slack + 1e-9, `큰 덩어리(위험 ≥ ${R.sawtooth_big_chunk}) 뒤 숨 고르기 ${bad.length ? `없음 ${bad}` : '모두 있음'} · 위험 비율 앞 ${h1} ≤ 뒤 ${h2} + ${R.half_ratio_slack}`);
    // V-R7 결정론
    const L1 = compileLevel(l, bal), L2 = compileLevel(JSON.parse(JSON.stringify(l)), bal);
    const same = JSON.stringify(L1.objects) === JSON.stringify(L2.objects) && JSON.stringify(L1.contacts) === JSON.stringify(L2.contacts);
    const rnd = /random|seed|shuffle/i.test(JSON.stringify(l));
    check(id, 'V-R7', same && !rnd, `배치는 데이터 고정(무작위·시드 키 ${rnd ? '있음(!)' : '없음'}), 두 번 컴파일한 물체·접촉 목록 ${same ? '같음' : '다름(!)'}`);
  }
  // V-R4 레벨 사이 복사
  {
    const err = [];
    const starts = all.flatMap(({ l }) => phraseStarts(l).filter((x) => x.risky).map((x) => ({ id: l.id, ...x })));
    for (let a = 0; a < starts.length; a++) for (let b = a + 1; b < starts.length; b++) if (starts[a].id !== starts[b].id && starts[a].key === starts[b].key) err.push(`① 구절 시작 L${starts[a].id}·L${starts[b].id} "${starts[a].key}"`);
    const big = all.map(({ l }) => [l.id, [...new Set(chunksOf(l).filter((c) => c.riskCount >= R.big_chunk_risk_tokens).map((c) => c.key))]]);
    const sharedPer = {};
    for (const [id, ks] of big) { const sh = ks.filter((k) => big.some(([j2, o]) => j2 !== id && o.includes(k))); sharedPer[id] = sh; if (sh.length > R.shared_big_chunk_max) err.push(`② L${id} 다른 레벨과 같은 큰 덩어리 ${sh.length}개(${sh.join(' / ')})`); }
    const W = all.map(({ l }) => [l.id, windows8(l)]);
    let nW = 0;
    for (let a = 0; a < W.length; a++) { nW += W[a][1].length; for (let b = a + 1; b < W.length; b++) { const kb = new Set(W[b][1].map((w) => w.key)); const same = W[a][1].filter((w) => kb.has(w.key)); if (same.length) err.push(`③ 8박 창 L${W[a][0]}·L${W[b][0]} ${same.length}개("${same[0].key}")`); } }
    const shared = Object.entries(sharedPer).filter(([, v]) => v.length).map(([k, v]) => `L${+k} ${v.join('/')}`);
    check('all', 'V-R4', !err.length, err.length ? err.slice(0, 5).join(' / ') : `① 위험이 든 구절 시작 ${starts.length}개 모두 레벨마다 다름 · ② 큰 덩어리 공유 레벨당 ≤ ${R.shared_big_chunk_max}(${shared.join(', ') || '없음'}) · ③ 위험이 든 2마디 창(마디 첫 박 시작, 받침 쉼 없는 창) ${nW}개 중 레벨 사이 같은 창 0`);
  }
}

// ---------- N7 이어 하기 되감기
log('\n== N7 이어 하기 (지금 구절 받침 쉼 처음으로 되감기, balance.json menus.resume) ==');
{
  const rows = [];
  let worstAll = Infinity, bad = 0;
  for (const L of compiled) {
    let worst = Infinity, worstAt = null;
    for (let t = 0; t <= L.clearTimeMs; t += 5) {
      const rp = resumePoint(L, t);
      if (!rp.rewound) continue;
      if (rp.fromMs > t + 1e-6) bad++;
      if (Math.abs(scrollBeatAt(L, rp.fromMs) - rp.fromMs / L.beatMs) > 1e-9) bad++;
      const nxt = L.contacts[rp.startIndex].t - rp.fromMs;
      if (nxt < worst) { worst = nxt; worstAt = t; }
    }
    // 그 자리 이어 가기(round-1)였다면 450 ms 미만 비율
    let near = 0, tot = 0;
    const first = L.tosses[0].t;
    for (let t = first; t <= L.clearTimeMs; t += 1) { tot++; const c = L.contacts.find((x) => x.t > t); if (c && c.t - t < V.resume_min_ms) near++; }
    rows.push(`L${+L.level.id} ${f0(worst)} ms(그 자리면 450 ms 미만 ${(100 * near / tot).toFixed(0)} %)`);
    worstAll = Math.min(worstAll, worst);
  }
  check('all', 'N7', worstAll >= V.resume_min_ms && !bad, `모든 멈춤 시각(5 ms 간격)에서 이어 한 직후 다음 접촉까지 최소 ${f0(worstAll)} ms ≥ ${V.resume_min_ms} (450 ms 미만 0 %) · 되감은 시각 ≤ 멈춘 시각·세상 위치 = 같은 시각 ${bad ? `어긋남 ${bad}` : '정상'} · ${rows.join(' · ')}`);
}

// ---------- C1 콤보
log('\n== C1 콤보 (balance.json combo, judge.mjs comboEvents) ==');
{
  const CB = bal.combo;
  const err = [];
  const rows = [];
  compiled.forEach((L) => {
    const id = L.level.id;
    const perf = judgeAttempt(L, perfectTaps(L));
    const ce = comboEvents(L, perf, bal);
    if (ce.final !== L.contacts.length) err.push(`L${id} 끝 콤보 ${ce.final} ≠ 접촉 ${L.contacts.length}`);
    for (let k = 1; k < ce.events.length; k++) if (!(ce.events[k].t > ce.events[k - 1].t)) err.push(`L${id} 콤보 표시 시각 역전 ${k}`);
    for (const e of ce.events.filter((x) => x.kind === 'hold')) { const rs = L.roofSits.find((r) => r.contact === e.i); if (!(e.t >= rs.landMs + L.beatMs - 1e-6)) err.push(`L${id} hold ${e.i} 칸 채움이 착지 +1박 전`); }
    for (const s of ce.stages) if (s.chordMs != null && !(s.chordMs > s.t)) err.push(`L${id} 콤보 ${s.stage} 화음이 판정 전`);
    const minGap = Math.min(...L.contacts.slice(1).map((c, k) => c.t - L.contacts[k].t));
    if (CB.update_pop.ms >= minGap) err.push(`L${id} 갱신 연출 ${CB.update_pop.ms} ms ≥ 가장 짧은 접촉 간격 ${f0(minGap)}`);
    rows.push(`L${+id} 끝 ${ce.final}·단계 ${ce.stages.map((s) => `${s.stage}@${f2(s.chordBeat ?? s.t / L.beatMs)}박`).join('/')}`);
  });
  check('all', 'C1', !err.length, err.length ? err.slice(0, 5).join(' / ') : `콤보 = 성공 판정 수(hit 3등급 + 지붕 참기 hold) = 완벽 입력에서 접촉 수, 표시 시각 단조, hold 칸 채움 = 지붕이 떠날 때(착지 +1박 이상), 화음 시각은 C2, 갱신 ${CB.update_pop.ms} ms < 가장 짧은 접촉 간격 · ${rows.join(' · ')}`);
  // 켬/끔 봇 재판정 동일(시뮬 수준): 같은 시드로 콤보 계산을 켜고 끈 두 실행의 결과가 같음
  const diff = [];
  let mism = 0;
  compiled.forEach((L, k) => {
    const n = Math.max(2000, N / 8);
    const a = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: n, sessions: 50, seed: SEED + 9000 + k });
    const b = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: n, sessions: 50, seed: SEED + 9000 + k, combo: true });
    const { combo_mismatch, combo_mean_final, ...bb } = b;
    mism += combo_mismatch;
    if (JSON.stringify(a) !== JSON.stringify(bb)) diff.push(`L${L.level.id}`);
  });
  check('all', 'C1b', !diff.length && !mism, `콤보 켬/끔 σ70 봇(q_nogo 포함, 레벨당 ${Math.max(2000, N / 8)}회 같은 시드): 클리어율·실패 위치·이유·진행도·세션 결과 ${diff.length ? `다름 ${diff}` : '모두 같음'} · 콤보 ≠ 판정 수인 시도 ${mism}`);
}

// ---------- C2 콤보 화음 시각 (1-2 R2-D2): 판정 접촉 다음 정박 중 어떤 접촉의 [놓침 구역 시작, 통과 창 끝]에도 들지 않고
//            지붕 착지 ±1박(닫힌)도 아닌 첫 정박. 마지막 접촉 통과 창 끝(클리어 판정) 전에 없으면 화음 없음(큰 튐 클리어 소리와 겹침 방지)
log('\n== C2 콤보 화음 시각 · V24 바탕 단계 ==');
{
  const err = [], rows = [];
  let n = 0, skipped = 0, maxDelay = 0;
  const avoid = bal.combo.chord_timing?.avoid_roof_beats ?? 1;
  compiled.forEach((L) => {
    const id = L.level.id;
    const ce = comboEvents(L, judgeAttempt(L, perfectTaps(L)), bal);
    const roofB = L.roofSits.map((r) => r.landMs / L.beatMs);
    // 검증기 쪽 독립 계산(같은 정의, judge.mjs 코드를 쓰지 않음)
    const zoneOf = (c) => (c.kind === 'nogo' ? c.passStart : c.zoneStart);
    const busy = (b) => roofB.some((rb) => Math.abs(b - rb) <= avoid + 1e-9) || L.contacts.some((c) => b * L.beatMs >= zoneOf(c) - 1e-6 && b * L.beatMs <= c.passEnd + 1e-6);
    for (const st of ce.stages.filter((x) => bal.combo.chord_stages.includes(x.stage))) {
      const e = ce.events.find((x) => x.combo === st.stage);
      let b = Math.floor(e.beat + 1e-9) + 1;
      while (busy(b) && b < 1e4) b++;
      const want = b * L.beatMs < L.clearTimeMs ? b : null;
      if (want !== st.chordBeat) err.push(`L${+id} ${st.stage}: judge ${st.chordBeat} ≠ 검증 ${want}`);
      if (st.chordBeat == null) { skipped++; rows.push(`L${+id} ${st.stage} 없음(클리어 전 빈 정박 없음)`); continue; }
      n++;
      const ms = st.chordMs;
      const clash = L.contacts.filter((c) => ms >= zoneOf(c) - 1e-6 && ms <= c.passEnd + 1e-6);
      if (clash.length) err.push(`L${+id} ${st.stage} 화음이 접촉 ${clash.map((c) => c.i)} 위험 구간 안`);
      if (roofB.some((rb) => Math.abs(st.chordBeat - rb) <= avoid + 1e-9)) err.push(`L${+id} ${st.stage} 화음이 지붕 착지 ±${avoid}박 안`);
      if (!(ms > e.t)) err.push(`L${+id} ${st.stage} 화음이 판정 전`);
      if (!(ms < L.clearTimeMs)) err.push(`L${+id} ${st.stage} 화음이 클리어 판정 뒤`);
      maxDelay = Math.max(maxDelay, st.chordBeat - e.beat);
      rows.push(`L${+id} ${st.stage} ${f2(e.beat)}→${st.chordBeat}박(+${f2(st.chordBeat - e.beat)})`);
    }
  });
  report.chords = rows;
  check('all', 'C2', !err.length, err.length ? err.slice(0, 5).join(' / ') : `콤보 화음 ${n}개 모두 접촉 위험 구간([놓침 구역 시작, 통과 창 끝]·지붕 창) 밖·지붕 착지 ±1박 밖·판정 뒤·클리어 판정 전 = 아이 탭과 같은 순간 0(공통 문서 4-4), judge.mjs = 검증기 독립 계산 · 클리어 전 빈 정박이 없어 화음을 뺀 단계 ${skipped}개(그림 단계 연출은 그대로) · 최대 늦음 ${f2(maxDelay)}박 · ${rows.join(' · ')}`);
}

// ---------- P1~P6 판정 이름·퍼센트 (요청자 추가 지시, djmax-judgement.md 7절, 20-balance 18절, balance.json judgement_display)
log('\n== P 판정 이름·퍼센트 (balance.json judgement_display, judge.mjs pctOf·levelAccuracy) ==');
{
  const JD = bal.judgement_display;
  if (!JD) check('all', 'P1', false, 'balance.json judgement_display 없음');
  else {
    const PCTS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
    const gradeByRule = (L, e) => { const a = Math.abs(e); return a <= L.judge.perfect_ms ? 'perfect' : a <= L.judge.good_ms ? 'good' : 'pass'; };
    // 검증기 쪽 독립 경계(judge.mjs 코드를 쓰지 않음): djmax 7-2 식 그대로
    const indepBands = (L, W) => {
      const j = L.judge, R = JD.pct;
      const b = [R.perfect_100_max_ms, j.perfect_ms];
      for (let k = 1; k <= R.good_steps.length; k++) b.push(j.perfect_ms + (k * (j.good_ms - j.perfect_ms)) / R.good_steps.length);
      for (let k = 1; k <= R.pass_steps.length; k++) b.push(j.good_ms + (k * (W - j.good_ms)) / R.pass_steps.length);
      return b;
    };
    const indepPct = (bands, d) => { for (let k = 0; k < bands.length; k++) if (d <= bands[k] + 1e-9) return PCTS[k]; return null; };
    const e1 = [], e2 = [], e3 = [], e4 = [], rows1 = [], rows3 = [];
    let swept = 0;
    compiled.forEach((L) => {
      const id = +L.level.id, j = L.judge;
      const hitI = L.contacts.find((c) => c.kind === 'hit').i;
      const pb = pctBands(L, hitI, bal);
      const tab = JD.bands_by_level?.[String(id)];
      // P1: 칸 순서·표(balance.json)·독립 계산 일치
      for (const [side, W] of [['early', j.pass_early_ms], ['late', j.pass_late_ms]]) {
        const ib = indepBands(L, W);
        const got = pb[side];
        if (got.map((x) => x.pct).join() !== PCTS.join()) e1.push(`L${id} ${side} % 순서 ${got.map((x) => x.pct)}`);
        got.forEach((x, k) => { if (Math.abs(x.maxMs - ib[k]) > 1e-6) e1.push(`L${id} ${side} ${x.pct}% 끝 ${x.maxMs} ≠ 독립 ${ib[k]}`); });
        const t = tab?.[`${side}_max_ms`];
        if (!t || t.length !== ib.length || t.some((v, k) => Math.abs(v - ib[k]) > 0.006)) e1.push(`L${id} balance.json bands_by_level ${side} ≠ 계산(다시 계산해 넣기)`);
        if (tab && (tab.g !== j.good_ms || tab[side === 'early' ? 'W_early' : 'W_late'] !== W)) e1.push(`L${id} bands_by_level g·W ≠ 레벨 judge`);
        if (Math.abs(ib[ib.length - 1] - W) > 1e-9) e1.push(`L${id} ${side} 창 끝 ≠ W`);
      }
      rows1.push(`L${id} g ${j.good_ms} 이른 ${pb.early.slice(4).map((x) => f2(x.maxMs)).join('/')} · 늦은 ${pb.late.slice(4).map((x) => f2(x.maxMs)).join('/')}`);
      // P2·P3: 0.01 ms 간격 훑기(이른 쪽·늦은 쪽 따로) — 단조, 등급 ↔ % 범위, 독립 계산 일치, 창 끝 10, 창 밖 null
      for (const sgn of [-1, 1]) {
        const W = sgn < 0 ? j.pass_early_ms : j.pass_late_ms;
        const ib = indepBands(L, W);
        let prev = 101;
        for (let s = 0; s <= Math.round(W * 100) + 50; s++) {
          const d = s / 100, e = sgn * d;
          const p = pctOf(L, hitI, e, bal);
          swept++;
          if (d > W + 1e-9) { if (p !== null) e2.push(`L${id} e=${e} 창 밖인데 ${p}`); continue; }
          if (p == null) { e2.push(`L${id} e=${e} 창 안인데 null`); continue; }
          if (p > prev) e2.push(`L${id} e=${e} % 증가 ${prev}→${p}`);
          prev = p;
          if (p !== indepPct(ib, d)) e3.push(`L${id} e=${e} ${p} ≠ 독립 ${indepPct(ib, d)}`);
          const g = gradeByRule(L, e);
          if (gradeOfPct(p, bal) !== g) e2.push(`L${id} e=${e} ${p}% → ${gradeOfPct(p, bal)} ≠ 등급 ${g}`);
          const [lo, hi] = JD.grade_from_pct[g];
          if (p < lo || p > hi) e2.push(`L${id} e=${e} ${g} 인데 ${p}%`);
        }
        if (pctOf(L, hitI, sgn * W, bal) !== JD.pct.window_end_pct) e2.push(`L${id} 창 끝 ${sgn * W} ≠ 10`);
        // 경계값 정확히 = 안쪽 칸, 경계 + 0.001 = 다음 칸
        ib.forEach((m, k) => {
          if (pctOf(L, hitI, sgn * m, bal) !== PCTS[k]) e3.push(`L${id} 경계 ${sgn * m} ≠ ${PCTS[k]}`);
          const nx = pctOf(L, hitI, sgn * (m + 0.001), bal);
          if (nx !== (k + 1 < PCTS.length ? PCTS[k + 1] : null)) e3.push(`L${id} 경계 뒤 ${sgn * (m + 0.001)} = ${nx}`);
        });
      }
      const we = (j.pass_early_ms - j.good_ms) / JD.pct.pass_steps.length, wl = (j.pass_late_ms - j.good_ms) / JD.pct.pass_steps.length;
      // 비대칭: 같은 |e| 라도 이른 쪽이 더 빨리 낮아짐(통과 칸 폭이 좁음)
      const probe = j.good_ms + 4.5 * we;
      const asym = pctOf(L, hitI, -probe, bal) === 10 && pctOf(L, hitI, probe, bal) > 10;
      if (!(we < wl) || !asym) e3.push(`L${id} 비대칭 칸 확인 실패(이른 ${we}·늦은 ${wl}, ±${f2(probe)} → ${pctOf(L, hitI, -probe, bal)}/${pctOf(L, hitI, probe, bal)})`);
      rows3.push(`L${id} 통과 칸 이른 ${f2(we)}·늦은 ${f2(wl)} ms (±${f2(probe)} → ${pctOf(L, hitI, -probe, bal)}/${pctOf(L, hitI, probe, bal)}%)`);
      // P4: 완벽 입력 = 정확도 100, hold % 없음, 창 끝 입력 = 10, 실패·연습 = null
      const perf = judgeAttempt(L, perfectTaps(L));
      const pe = pctEvents(L, perf, bal);
      if (levelAccuracy(L, perf, {}, bal) !== 100) e4.push(`L${id} 완벽 입력 정확도 ${levelAccuracy(L, perf, {}, bal)}`);
      if (pe.some((x) => x.grade === 'hold' && (x.pct !== null || x.name_key !== null))) e4.push(`L${id} hold 에 % 또는 이름`);
      if (pe.some((x) => x.grade !== 'hold' && x.name_key !== JD.names[x.grade])) e4.push(`L${id} 이름 키 어긋남`);
      if (levelAccuracy(L, perf, { practice: true }, bal) !== null) e4.push(`L${id} 연습 모드 정확도가 나옴`);
      const edge = judgeAttempt(L, L.contacts.filter((c) => c.kind === 'hit').map((c) => c.t + j.pass_late_ms));
      if (!edge.clear || levelAccuracy(L, edge, {}, bal) !== 10) e4.push(`L${id} 늦은 창 끝 입력 정확도 ${levelAccuracy(L, edge, {}, bal)}(클리어 ${edge.clear})`);
      const fl = judgeAttempt(L, []);
      if (levelAccuracy(L, fl, {}, bal) !== null) e4.push(`L${id} 실패 시도 정확도가 나옴`);
      // 섞인 입력: 딱 100 하나 + 나머지 90 → 내림 확인
      const hits = L.contacts.filter((c) => c.kind === 'hit');
      const mix = judgeAttempt(L, hits.map((c, k) => c.t + (k === 0 ? 0 : 40)));
      const wantMix = Math.floor((100 + 90 * (hits.length - 1)) / hits.length);
      if (levelAccuracy(L, mix, {}, bal) !== wantMix) e4.push(`L${id} 섞인 입력 정확도 ${levelAccuracy(L, mix, {}, bal)} ≠ ${wantMix}`);
    });
    check('all', 'P1', !e1.length, e1.length ? e1.slice(0, 5).join(' / ') : `% 칸 경계 = 7-2 식(25 / 딱 / 좋아 3칸 / 통과 5칸, 이른·늦은 쪽 따로) = balance.json bands_by_level = 검증기 독립 계산, 순서 100→10, 마지막 칸 끝 = 창 끝 W · ${rows1.join(' · ')}`);
    check('all', 'P2', !e2.length, e2.length ? e2.slice(0, 5).join(' / ') : `0.01 ms 간격 ${swept}점(10레벨 × 이른·늦은 쪽): d 가 커지면 % 는 줄거나 같음, 딱 = 100/90 · 좋아 = 80~60 · 통과 = 50~10(% → 등급 = judgeAttempt 등급 불일치 0), 창 끝 = 10 %, 창 밖 = 표시 없음`);
    check('all', 'P3', !e3.length, e3.length ? e3.slice(0, 5).join(' / ') : `비대칭 창(늦은 쪽 +20 ms)에서도 통과 5칸이 각 쪽 (W−g)/5 로 똑같이 나뉨, 경계값 = 안쪽 칸·경계 +0.001 ms = 다음 칸, judge.mjs = 독립 계산 · ${rows3.join(' · ')}`);
    check('all', 'P4', !e4.length, e4.length ? e4.slice(0, 5).join(' / ') : `레벨 정확도: 완벽 입력 = 100(10레벨), 늦은 창 끝 입력 = 10, 100 + 90… 섞임 = 내림 평균, 지붕 참기(hold) % ·이름 없음·평균 제외, 실패·연습 = 표시 없음, 이름 키 = ${JD.names.perfect}/${JD.names.good}/${JD.names.pass}`);
    // P5: 켜고 끔 — 같은 시드 σ70·σ25 봇 시도에서 % 계산 전후 판정 결과·콤보가 같고, 결과 객체를 바꾸지 않음
    const e5 = [], acc = [];
    let tried = 0, hitN = 0;
    compiled.forEach((L, k) => {
      const id = +L.level.id;
      const accs = { child_sd70: [], skilled_sd25: [] };
      for (const prof of ['child_sd70', 'skilled_sd25']) {
        const p = bal.bots.profiles[prof];
        const n = QUICK ? 1500 : 6000;
        const rngA = makeRng(SEED + 7700 + k), rngB = makeRng(SEED + 7700 + k);
        for (let t = 0; t < n; t++) {
          const taps = botTaps(L, p, rngA, { extraAfter: bal.bots.extra_tap_after_s });
          const tapsB = botTaps(L, p, rngB, { extraAfter: bal.bots.extra_tap_after_s });
          const off = judgeAttempt(L, tapsB);
          const offCombo = JSON.stringify(comboEvents(L, off, bal));
          const on = judgeAttempt(L, taps);
          const before = JSON.stringify(on);
          const pe = pctEvents(L, on, bal);
          const a = levelAccuracy(L, on, {}, bal);
          tried++;
          if (JSON.stringify(on) !== before) e5.push(`L${id} % 계산이 결과를 바꿈`);
          if (before !== JSON.stringify(off) || JSON.stringify(comboEvents(L, on, bal)) !== offCombo) e5.push(`L${id} 켬/끔 판정·콤보 다름`);
          for (const x of pe) if (x.grade !== 'hold') { hitN++; if (gradeOfPct(x.pct, bal) !== x.grade) e5.push(`L${id} ${x.pct}% ↔ ${x.grade}`); }
          if (on.clear !== (a != null)) e5.push(`L${id} 클리어 ${on.clear} 인데 정확도 ${a}`);
          if (a != null) accs[prof].push(a);
          if (e5.length > 5) break;
        }
      }
      const q = (arr, u) => { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(u * (s.length - 1)))] : '-'; };
      acc.push(`L${id} σ70 ${q(accs.child_sd70, 0.5)}(${q(accs.child_sd70, 0.1)}~${q(accs.child_sd70, 0.9)}, 클리어 ${accs.child_sd70.length})·σ25 ${q(accs.skilled_sd25, 0.5)}`);
    });
    const minGapAll = Math.min(...compiled.map((L) => Math.min(...L.contacts.slice(1).map((c, k) => c.t - L.contacts[k].t))));
    if (!(JD.timing.pop_ms < minGapAll)) e5.push(`튐 ${JD.timing.pop_ms} ms ≥ 가장 짧은 접촉 간격 ${f0(minGapAll)}`);
    if (JD.timing.hold_until_ms + JD.timing.fade_ms !== JD.timing.total_ms) e5.push('표시 시간 합 ≠ total_ms');
    check('all', 'P5', !e5.length, e5.length ? e5.slice(0, 5).join(' / ') : `% ·이름 켬/끔: 같은 시드 봇 시도 ${tried}회(σ70·σ25, 헛탭 포함)에서 판정 결과·콤보 사건 완전히 같음, % 계산이 결과 객체를 바꾸지 않음, hit 판정 ${hitN}개 모두 % → 등급 = 판정 등급, 정확도는 클리어 시도에만 · 튐 ${JD.timing.pop_ms} ms < 가장 짧은 접촉 간격 ${f0(minGapAll)} ms, 표시 ${JD.timing.hold_until_ms}+${JD.timing.fade_ms} = ${JD.timing.total_ms} ms`);
    report.accuracy = acc;
    info('P6', `레벨 정확도(클리어한 시도만, 중앙값(10~90 백분위)) · ${acc.join(' · ')}`);
  }
}

// ---------- J1~J3 판정 기준 구현 단단히 (harness/insights.md QA·측정 57bf276: NaN 창 · 경계 부동소수 · 앞 탭 어긋난 뒤 창 밖 탭)
log('\n== J 판정 기준 구현 (창 값 유한 확인 · Δ 0.001 ms 반올림 "경계는 이하" · 앞 탭 어긋난 뒤 창 밖 탭) ==');
{
  const KEYS = ['perfect_ms', 'good_ms', 'pass_early_ms', 'pass_late_ms', 'miss_zone_ms'];
  // 검증기 쪽 독립 기준(judge.mjs 코드를 쓰지 않음): 정수 µs(0 기준 대칭 반올림)로 비교
  const us = (x) => (x < 0 ? -Math.round(-x * 1000) : Math.round(x * 1000));
  const refJudge = (L, taps) => {
    const j = L.judge, C = L.contacts, E = us(j.pass_early_ms), Lt = us(j.pass_late_ms), P = us(j.perfect_ms), G = us(j.good_ms);
    const ts = [...taps].sort((a, b) => a - b), grades = [];
    let i = 0;
    const holds = (tau) => { while (i < C.length && C[i].kind === 'nogo' && us(tau - C[i].t) > Lt) { grades.push({ i, grade: 'hold' }); i++; } };
    for (const tau of ts) {
      holds(tau);
      if (i >= C.length) break;
      const c = C[i], D = us(tau - c.t);
      if (c.kind === 'nogo') { if (D >= -E) return { clear: false, failIndex: i, reason: 'bump_roof', grades }; continue; }
      if (D > Lt) return { clear: false, failIndex: i, reason: 'late', grades };
      if (D >= -E) { const a = Math.abs(D); grades.push({ i, grade: a <= P ? 'perfect' : a <= G ? 'good' : 'pass' }); i++; continue; }
      let lo = c.t - j.pass_early_ms - j.miss_zone_ms;
      if (i > 0) lo = Math.max(lo, C[i - 1].t + j.pass_late_ms);
      lo = Math.min(lo, c.t - j.pass_early_ms);
      if (D >= us(lo - c.t)) return { clear: false, failIndex: i, reason: 'early', grades };
    }
    holds(Infinity);
    if (i < C.length) return { clear: false, failIndex: i, reason: 'late', grades };
    return { clear: true, grades };
  };
  const same = (a, b) => a.clear === b.clear && a.failIndex === b.failIndex && a.reason === b.reason && a.grades.length === b.grades.length && a.grades.every((g, k) => g.i === b.grades[k].i && g.grade === b.grades[k].grade);
  const desc = (r) => (r.clear ? 'clear' : `${r.reason}@${r.failIndex}`);
  // J1: 창·등급 키를 지운(또는 NaN·문자열) 가짜 레벨 → judgeAttempt·pctOf 가 예외(데이터 오류). 조용히 통과·실패하지 않음
  {
    const err = [];
    let n = 0;
    const L0 = compiled[0];
    const hitI = L0.contacts.find((c) => c.kind === 'hit').i;
    for (const k of KEYS) {
      for (const bad of ['delete', 'NaN', 'string']) {
        const lv = structuredClone(L0.level), b2 = structuredClone(bal);
        if (bad === 'delete') { if (lv.judge) delete lv.judge[k]; delete b2.judge_defaults[k]; }
        else lv.judge = { ...(lv.judge || {}), [k]: bad === 'NaN' ? NaN : String(L0.judge[k]) };
        const F = compileLevel(lv, b2);
        n++;
        let t1 = false, t2 = false;
        try { judgeAttempt(F, perfectTaps(F)); } catch { t1 = true; }
        try { pctOf(F, hitI, 10, b2); } catch { t2 = true; }
        if (!t1) err.push(`${k} ${bad}: judgeAttempt 예외 없음`);
        if (!t2) err.push(`${k} ${bad}: pctOf 예외 없음`);
      }
    }
    const b3 = structuredClone(bal); b3.judgement_display.pct.perfect_100_max_ms = NaN;
    let t3 = false; try { pctOf(L0, hitI, 10, b3); } catch { t3 = true; }
    if (!t3) err.push('perfect_100_max_ms NaN: pctOf 예외 없음');
    let okReal = true;
    try { compiled.forEach((L) => { judgeAttempt(L, perfectTaps(L)); pctOf(L, L.contacts.find((c) => c.kind === 'hit').i, 0, bal); }); } catch (e) { okReal = false; err.push(`실제 레벨에서 예외: ${e.message}`); }
    check('all', 'J1', !err.length, err.length ? err.slice(0, 5).join(' / ') : `판정 키 ${KEYS.length}개 × (지움·NaN·문자열) = 가짜 레벨 ${n}개 + 25 ms 경계 NaN: judgeAttempt·pctOf 모두 예외(데이터 오류. NaN 창으로 "창 밖이면 실패"가 늘 통과하는 일 없음) · 실제 10레벨은 예외 없음 ${okReal ? '예' : '아님'}`);
  }
  // J2: 정확히 25 / p / g / W 경계와 경계 ±0.0004·±0.0006 ms (모든 hit 접촉, 이른·늦은 쪽) — 판정 등급·% 가 기대값과 같음
  {
    const err = [];
    let n = 0;
    const R = bal.judgement_display.pct;
    compiled.forEach((L) => {
      const id = +L.level.id, j = L.judge;
      for (const c of L.contacts.filter((x) => x.kind === 'hit')) {
        for (const sgn of [-1, 1]) {
          const W = sgn < 0 ? j.pass_early_ms : j.pass_late_ms;
          const B = [[R.perfect_100_max_ms, 'perfect', 100, 'perfect', 90], [j.perfect_ms, 'perfect', 90, 'good', 80], [j.good_ms, 'good', 60, 'pass', 50], [W, 'pass', 10, null, null]];
          for (const [m, gIn, pIn, gOut, pOut] of B) {
            for (const off of [0, 0.0004, -0.0004, 0.0006, -0.0006]) {
              const e = sgn * (m + off);
              const outer = off > 0.0005;
              const tap = c.t + e; // 실제 접촉 시각에 더함(부동소수 오차가 생기는 실제 경로)
              const r = judgeAttempt(L, [tap], { startIndex: c.i });
              const g = r.grades.find((x) => x.i === c.i);
              const ref = refJudge(L, [tap]);
              n++;
              const wantG = outer ? gOut : gIn, wantP = outer ? pOut : pIn;
              if (wantG == null) {
                if (g || r.failIndex !== c.i) err.push(`L${id} #${c.i} e=${e} 창 밖인데 ${g ? g.grade : desc(r)}`);
                if (pctOf(L, c.i, tap - c.t, bal) !== null) err.push(`L${id} #${c.i} e=${e} 창 밖인데 % ${pctOf(L, c.i, tap - c.t, bal)}`);
              } else {
                if (!g || g.grade !== wantG) err.push(`L${id} #${c.i} e=${e} 등급 ${g ? g.grade : desc(r)} ≠ ${wantG}`);
                const p = g ? pctOf(L, c.i, g.e, bal) : null;
                if (p !== wantP) err.push(`L${id} #${c.i} e=${e} % ${p} ≠ ${wantP}`);
              }
              if (c.i === 0 && !same(r, ref)) err.push(`L${id} #0 e=${e} ${desc(r)} ≠ 독립 ${desc(ref)}`);
            }
          }
        }
      }
    });
    check('all', 'J2', !err.length, err.length ? err.slice(0, 5).join(' / ') : `모든 hit 접촉(실제 접촉 시각 + Δ, 부동소수 오차 포함) × 이른·늦은 쪽 × 경계 4개(25 / 딱 p / 좋아 g / 창 끝 W) × (정확히 · ±0.0004 · ±0.0006 ms) = ${n}점: 경계·+0.0004 = 안쪽 등급·%, +0.0006 = 바깥(W 밖 = 그 접촉 실패·% 없음), −0.0004·−0.0006 = 안쪽`);
  }
  // J3: 앞 탭을 창 끝까지 어긋나게 한 뒤 다음 탭을 창 밖(0.6 ms)에 치면 그 접촉에서 실패 + 봇 무작위 시도 독립 기준 대조
  {
    const err = [];
    let n = 0, nb = 0, nbClear = 0;
    compiled.forEach((L, li) => {
      const id = +L.level.id, j = L.judge, C = L.contacts;
      const base = C.filter((c) => c.kind === 'hit').map((c) => [c.i, c.t]);
      for (let k = 1; k < C.length; k++) {
        if (C[k].kind !== 'hit' || C[k - 1].kind !== 'hit') continue;
        for (const [pe, ne] of [[j.pass_late_ms, j.pass_late_ms + 0.6], [-j.pass_early_ms, -(j.pass_early_ms + 0.6)], [j.pass_late_ms, -(j.pass_early_ms + 0.6)], [-j.pass_early_ms, j.pass_late_ms + 0.6]]) {
          const taps = base.map(([i, t]) => (i === k - 1 ? t + pe : i === k ? t + ne : t));
          const r = judgeAttempt(L, taps), ref = refJudge(L, taps);
          n++;
          if (!same(r, ref)) err.push(`L${id} #${k} 앞 ${pe}·다음 ${f2(ne)}: ${desc(r)} ≠ 독립 ${desc(ref)}`);
          if (Math.sign(pe) === Math.sign(ne) && (r.clear || r.failIndex !== k)) err.push(`L${id} #${k} 앞 ${pe}·다음 ${f2(ne)}: 창 밖 탭이 살아남음(${desc(r)})`);
        }
      }
      // 봇 무작위 대조(σ70·σ25, 헛탭 포함): judgeAttempt = 독립 기준, 클리어 시도의 모든 hit 판정 Δ 가 그 쪽 창 안(0.001 ms 반올림)
      for (const prof of ['child_sd70', 'skilled_sd25']) {
        const rng = makeRng(SEED + 9100 + li);
        for (let t = 0; t < (QUICK ? 500 : 3000); t++) {
          const taps = botTaps(L, bal.bots.profiles[prof], rng, { extraAfter: bal.bots.extra_tap_after_s });
          const r = judgeAttempt(L, taps), ref = refJudge(L, taps);
          nb++;
          if (!same(r, ref)) { err.push(`L${id} ${prof} 봇 시도 ${t}: ${desc(r)} ≠ 독립 ${desc(ref)}`); break; }
          if (r.clear) {
            nbClear++;
            for (const g of r.grades) if (g.grade !== 'hold' && (us(g.e) < -us(j.pass_early_ms) || us(g.e) > us(j.pass_late_ms))) { err.push(`L${id} ${prof} 클리어인데 창 밖 Δ ${g.e} (#${g.i})`); break; }
          }
        }
      }
    });
    check('all', 'J3', !err.length, err.length ? err.slice(0, 5).join(' / ') : `앞 hit 탭을 창 끝(+늦은 W / −이른 W)에 두고 다음 hit 탭을 창 밖 0.6 ms 에 친 ${n}경우: 같은 쪽 어긋남은 모두 그 접촉에서 실패(창 밖 탭이 살아남지 않음), 엇갈린 쪽 포함 모두 독립 기준(정수 µs)과 같음 · 봇 무작위 ${nb}회(σ70·σ25, 헛탭 포함) 결과(클리어·실패 접촉·이유·등급) = 독립 기준, 클리어 ${nbClear}회의 hit 판정 모두 창 안`);
  }
}

// ---------- V24 바탕 단계 (1-2 R2-D4): art 식 1 + round(2(n−1)/(P−1)) 와 같은 계산
{
  const err = [], rows = [];
  const want = { 2: [1, 3], 3: [1, 2, 3], 4: [1, 2, 2, 3] };
  for (const [P, arr] of Object.entries(want)) { const got = Array.from({ length: +P }, (_, k) => bgStage(k + 1, +P)); if (got.join() !== arr.join()) err.push(`P=${P} ${got} ≠ ${arr}`); }
  compiled.forEach((L) => {
    const st = bgStages(L);
    if (st[0] !== 1) err.push(`L${+L.level.id} 첫 쉼 ${st[0]}`);
    if (st.length >= 2 && st[st.length - 1] !== 3) err.push(`L${+L.level.id} 마지막 쉼 ${st[st.length - 1]} ≠ 3`);
    for (let k = 1; k < st.length; k++) if (st[k] < st[k - 1]) err.push(`L${+L.level.id} 단계 내려감`);
    rows.push(`L${+L.level.id} ${st.join('·')}`);
  });
  const rule = (LAYOUT && LAYOUT.bg_stage && LAYOUT.bg_stage.rule) || '';
  const norm = rule.replace(/\s+/g, '').replace(/·/g, '').replace(/−/g, '-');
  const artSame = norm.includes('1+round(2(n-1)/(P-1))');
  const balSame = bal.rest.bg_stage_rule === V.bg_stage_rule_id;
  if (err.length || !balSame) check('all', 'V24', false, `${err.join(' / ')}${balSame ? '' : ` · balance.json rest.bg_stage_rule ${bal.rest.bg_stage_rule} ≠ ${V.bg_stage_rule_id}`}`);
  else if (!artSame) wait('all', 'V24', `layout.json bg_stage.rule 에 식 1 + round(2·(n − 1) / (P − 1)) 없음 — art 대기 · balance ${rows.join(' · ')}`);
  else check('all', 'V24', true, `바탕 단계 = 1 + round(2(n−1)/(P−1)) — judge.mjs bgStage = art layout.json bg_stage.rule = balance rest.bg_stage_rule · P=2 1·3 / P=3 1·2·3 / P=4 1·2·2·3 · 마지막 받침 쉼 = bg3 · ${rows.join(' · ')}`);
}

// ---------- V25 가지 밑 표시 수 (1-2 R2-D9, lore 교차 리뷰 major): 가지 밑에 완전히 든 hit 표시 = 2(W5)/4(W7) = 카드 '톡톡'·'톡톡톡톡',
//            들어가는 표시(앞 접촉)·나가는 표시는 가지 밖에 완전히. art layout.json world.mark 너비·world.branch 좌우 여유를 반영, 4해상도 px
{
  const WO = LAYOUT.world || {};
  const want = bal.objects.branch.marks_under || { W5: 2, W7: 4 };
  if (!layoutOk || !WO.mark?.w_of_d || !WO.branch) wait('all', 'V25', 'layout.json world.mark.w_of_d·world.branch 없음 — art 대기');
  else {
    const err = [], rows = [];
    let nBr = 0, worstOut = Infinity, worstIn = Infinity;
    const sideOf = (g) => (WO.branch.side_margin_of_d ?? 0) * g.d + (WO.branch.side_margin_px ?? 0);
    compiled.forEach((L) => {
      const marks = L.objects.filter((o) => o.type === 'mark');
      for (const o of L.objects.filter((x) => x.type === 'branch')) {
        nBr++;
        const gm = o.long ? 'W7' : 'W5';
        const cnt = [];
        for (const [W, Hh, st, sb] of V.layout_resolutions) {
          const g = layoutGeom(LAYOUT, W, Hh, st, sb), ppb = pxPerBeat(L, W), half = (WO.mark.w_of_d * g.d) / 2, sm = sideOf(g);
          const x0 = o.beat_in * ppb - sm, x1 = o.beat_out * ppb + sm;
          let full = 0, part = 0;
          for (const mk of marks) {
            const a = mk.beat_in * ppb - half, b = mk.beat_in * ppb + half;
            if (a >= x0 - 1e-6 && b <= x1 + 1e-6) { full++; worstIn = Math.min(worstIn, Math.min(a - x0, x1 - b)); }
            else if (b > x0 && a < x1) part++;
            else worstOut = Math.min(worstOut, a >= x1 ? a - x1 : x0 - b);
          }
          if (full !== want[gm] || part) err.push(`L${+L.level.id} 가지 ${o.id}(${gm}) ${W}x${Hh}: 안 ${full}개·걸침 ${part}개 (기대 안 ${want[gm]}·걸침 0)`);
          cnt.push(full);
        }
        rows.push(`L${+L.level.id} ${gm} [${o.beat_in}, ${o.beat_out}]박 안 ${[...new Set(cnt)].join('/')}`);
      }
    });
    check('all', 'V25', !err.length, err.length ? err.slice(0, 5).join(' / ') : `가지 ${nBr}개 4해상도 모두 가지 밑 표시 = 가지 2·긴 가지 4(카드 톡톡·톡톡톡톡), 앞·뒤 표시는 가지 밖(걸침 0) · 가장 빠듯한 여유: 밑 표시 가장자리 ↔ 가지 끝 ${f2(worstIn)} px·밖 표시 ↔ 가지 끝 ${f2(worstOut)} px (art 좌우 여유 ${WO.branch.side_margin_of_d ?? 0}d 반영) · ${rows.join(' · ')}`);
  }
}

// ---------- 봇
log(`\n== 봇 (σ70·σ50 ${N}회, σ25 ${NSK}회, 세션 ${SESS}, 시드 ${SEED}, q_nogo σ70 ${bal.bots.profiles.child_sd70.q_nogo}·σ50 ${bal.bots.profiles.novice_sd50.q_nogo}·σ25 ${bal.bots.profiles.skilled_sd25.q_nogo}${QUICK ? ', --quick: 판정 안 함' : ''}) ==`);
log('레벨 | 프로필 | 첫 시도 클리어율 p | 연속 중앙값 | 정수 중앙값 | 90 % | 평균 진행도 | 실패 위치 중앙값(시간) | 이른 실패 | 지붕 콩 실패 | 최다 실패 접촉 몰림');
const B = {};
compiled.forEach((L, k) => {
  const id = L.level.id; B[id] = {};
  for (const [pn, p] of Object.entries(bal.bots.profiles)) {
    const r = runProfile(L, p, bal, { N: pn === 'skilled_sd25' ? NSK : N, sessions: SESS, seed: SEED + 101 * k + pn.length });
    B[id][pn] = r;
    log(`${id} | ${pn} | ${r.clear_rate} | ${r.median_continuous ?? '-'} | ${r.median_sessions} | ${r.p90_sessions} | ${r.mean_progress} % | ${r.median_fail_progress_time ?? '-'} % | ${r.early_fail_share} | ${r.roof_fail_share} | ${r.top_fail_contact_share} (접촉 ${r.top_fail_contact}, 실패 ${r.deaths})`);
  }
  B[id].k2 = runProfile(L, bal.bots.profiles.child_sd70, bal, { N, sessions: SESS, seed: SEED + 7001 + k, k2: true });
});
report.bots = B;
const m = (id) => B[id].child_sd70.median_continuous;
log('');
compiled.forEach((L, k) => {
  const id = L.level.id;
  const lim = id === '01' ? V.l1_sd70_continuous_max : V.sd70_continuous_max;
  const extra = id === '01' ? ` · 목표 ≤ ${V.l1_sd70_continuous_target} ${m(id) <= V.l1_sd70_continuous_target ? '달성' : '미달(!)'}` : '';
  bchk(id, 'B1', m(id) != null && m(id) <= lim && (id !== '01' || m(id) <= V.l1_sd70_continuous_target), `σ70(q_nogo ${bal.bots.profiles.child_sd70.q_nogo}) 연속 중앙값 ${m(id)} ≤ ${lim}${extra} (정수 ${B[id].child_sd70.median_sessions})`);
  const sk = B[id].skilled_sd25, nv = B[id].novice_sd50;
  if (sk.deaths >= 20) bchk(id, 'B3', sk.top_fail_contact_share <= 0.3, `σ25 실패 ${sk.deaths}회, 최다 접촉 ${sk.top_fail_contact} 몰림 ${sk.top_fail_contact_share} ≤ 0.3`);
  else bchk(id, 'B3', nv.top_fail_contact_share <= 0.3, `σ25 실패 ${sk.deaths}회(20 미만) → σ50 실패 ${nv.deaths}회, 최다 접촉 ${nv.top_fail_contact} 몰림 ${nv.top_fail_contact_share} ≤ 0.3`);
  if (k) {
    const a = compiled[k - 1].level.id;
    for (const pn of ['novice_sd50', 'child_sd70']) bchk(id, 'B2', B[id][pn].mean_progress < B[a][pn].mean_progress, `${pn} 평균 진행도 ${a} ${B[a][pn].mean_progress} % > ${id} ${B[id][pn].mean_progress} %`);
    bchk(id, 'B5', m(id) <= V.max_growth_vs_prev * m(a), `σ70 연속 중앙값 ${a} ${m(a)} → ${id} ${m(id)} (${(m(id) / m(a)).toFixed(2)}배 ≤ ${V.max_growth_vs_prev})`);
  }
});
bchk('01', 'B4', B['01'].child_sd70.median_fail_progress_time >= 10, `L1 σ70 실패 위치 중앙값(레벨 시간) ${B['01'].child_sd70.median_fail_progress_time} % ≥ 10 %`);

// B6·B7·B8 + B6s 시드 분포
{
  const R = V.l10_target_rule;
  const [b1, b2, b3] = R.base_levels;
  const m1 = m(b1), m2 = m(b2), m3 = m(b3);
  const r = Math.sqrt(m3 / m1);
  const T = m3 * r ** (+R.extrapolate_to_level - +b3);
  const lo = (1 - R.tolerance_ratio) * T, hi = (1 + R.tolerance_ratio) * T;
  const m10 = m(R.apply_to_level);
  const im = (id) => B[id].child_sd70.median_sessions;
  const ir = Math.sqrt(im(b3) / im(b1)), iT = im(b3) * ir ** 3;
  report.l10_target = { m01: m1, m02: m2, m03: m3, r: +r.toFixed(4), T: +T.toFixed(2), range: [+lo.toFixed(2), +hi.toFixed(2)], L10: m10, dev_pct: +(100 * (m10 / T - 1)).toFixed(1), integer_reference: { m01: im(b1), m03: im(b3), T: +iT.toFixed(2), L10: im(R.apply_to_level) } };
  log(`\n== 레벨 10 목표 (연속 중앙값, q_nogo ${bal.bots.profiles.child_sd70.q_nogo}) ==\n  r = (m~3/m~1)^(1/2) = (${m3}/${m1})^(1/2) = ${r.toFixed(4)} (단계 배율 ${(m2 / m1).toFixed(3)}·${(m3 / m2).toFixed(3)}) · T = m~3·r^3 = ${T.toFixed(2)} · 범위 ${lo.toFixed(2)} ~ ${hi.toFixed(2)}`);
  log(`  참고(판정 안 함) 정수 중앙값 L1/L3 ${im(b1)}/${im(b3)} → T ${iT.toFixed(2)} · L10 ${im(R.apply_to_level)}`);
  bchk('10', 'B6', m10 >= lo && m10 <= hi, `L10 σ70 연속 중앙값 ${m10} ∈ [${lo.toFixed(2)}, ${hi.toFixed(2)}] (T ${T.toFixed(2)} 대비 ${(100 * (m10 / T - 1)).toFixed(1)} %)`);
  const seq = R.monotone_levels.map((id) => [id, m(id)]);
  const bad = [];
  for (let k = 1; k < seq.length; k++) if (!(seq[k][1] > seq[k - 1][1])) bad.push(`${seq[k - 1][0]}→${seq[k][0]}`);
  const inside = seq.slice(0, -1).every(([, x]) => x < hi);
  bchk('10', 'B7', !bad.length && inside, `${seq.map(([id, x]) => `L${+id} ${x}`).join(' < ')} → ${bad.length ? `단조 아님 ${bad}` : '엄격 단조'} · L3~L9 < ${hi.toFixed(2)} ${inside ? '예' : '아님(!)'}`);
  const cap = m1 * r ** 5;
  bchk('03', 'B8', r >= V.r_range[0] && r <= V.r_range[1] && cap <= V.r_cap_m1_r5, `L1~L3 배율 r ${r.toFixed(3)} ∈ [${V.r_range.join(', ')}] · m~1·r^5 = ${cap.toFixed(2)} ≤ ${V.r_cap_m1_r5}`);
  const g = (T / m3) ** (1 / 7);
  info('곡선', `L3~L10 등비 기준선(배율 ${g.toFixed(3)}): ${[3, 4, 5, 6, 7, 8, 9, 10].map((k) => `L${k} ${(m3 * g ** (k - 3)).toFixed(2)}`).join(' · ')}`);
  report.baseline = Object.fromEntries([3, 4, 5, 6, 7, 8, 9, 10].map((k) => [String(k).padStart(2, '0'), +(m3 * g ** (k - 3)).toFixed(2)]));
  // B6s: 시드 10개 (criteria 밸런스 rhythm-02 round-1 추가 줄)
  const ns = QUICK ? 3 : V.b6_seeds;
  const devs = [];
  const at = (id) => compiled.find((x) => x.level.id === id);
  const rowsS = [];
  for (let s = 0; s < ns; s++) {
    const sd = SEED + 100003 * (s + 1);
    const q = (id, k) => runProfile(at(id), bal.bots.profiles.child_sd70, bal, { N, sessions: 10, seed: sd + 17 * k }).median_continuous;
    const a1 = q(b1, 1), a3 = q(b3, 3), a10 = q(R.apply_to_level, 10);
    const rr = Math.sqrt(a3 / a1), TT = a3 * rr ** 3;
    const dv = 100 * (a10 / TT - 1);
    devs.push(dv);
    rowsS.push(`${(dv >= 0 ? '+' : '') + dv.toFixed(1)}`);
  }
  const mean = devs.reduce((a, b) => a + b, 0) / devs.length;
  const sdv = Math.sqrt(devs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, devs.length - 1));
  report.b6_seeds = { devs_pct: devs.map((x) => +x.toFixed(2)), mean_pct: +mean.toFixed(2), sd_pct: +sdv.toFixed(2) };
  bchk('10', 'B6s', Math.abs(mean) <= 100 * R.tolerance_ratio && devs.every((x) => Math.abs(x) <= 100 * R.tolerance_ratio), `시드 ${ns}개(L1·L3·L10 각 ${N}회) L10 의 T 대비 편차: ${rowsS.join(' ')} % → 평균 ${mean.toFixed(1)} %·sd ${sdv.toFixed(1)} %·범위 ${Math.min(...devs).toFixed(1)} ~ ${Math.max(...devs).toFixed(1)} % (모두 ±${100 * R.tolerance_ratio} % 안 ${devs.every((x) => Math.abs(x) <= 100 * R.tolerance_ratio) ? '예' : '아님(!)'})`);
}

// B7q (1-2 R2-D3): 곡선이 q_nogo 가정에 기대지 않음 — q 0(criteria 기본, 지붕은 늘 참음)에서도 L3~L10 엄격 단조·30회 이하·직전 2배 이하
{
  const R = V.l10_target_rule;
  const q0 = {};
  compiled.forEach((L, k) => { q0[L.level.id] = runProfile(L, bal.bots.profiles.child_sd70, bal, { N, sessions: SESS, seed: SEED + 101 * k + 'child_sd70'.length, qNogo: 0 }).median_continuous; });
  report.curve_q0 = q0;
  const ids = compiled.map((L) => L.level.id);
  const seq = R.monotone_levels.map((id) => [id, q0[id]]);
  const bad = [];
  for (let k = 1; k < seq.length; k++) if (!(seq[k][1] > seq[k - 1][1])) bad.push(`${seq[k - 1][0]}→${seq[k][0]}`);
  const over = ids.filter((id) => !(q0[id] <= V.sd70_continuous_max));
  const grow = ids.slice(1).filter((id, k) => q0[id] > V.max_growth_vs_prev * q0[ids[k]]);
  const gaps = seq.slice(1).map(([id, x], k) => [id, x / seq[k][1] - 1]);
  const minGap = gaps.reduce((a, b) => (b[1] < a[1] ? b : a));
  const gaps15 = seq.slice(1).map(([id], k) => [id, m(id) / m(seq[k][0]) - 1]);
  const minGap15 = gaps15.reduce((a, b) => (b[1] < a[1] ? b : a));
  log(`\n== B7q 곡선의 q_nogo 의존 (R2-D3): q 0 와 q ${bal.bots.profiles.child_sd70.q_nogo} 두 곡선 ==\n  레벨 | q 0 | q ${bal.bots.profiles.child_sd70.q_nogo}(판정)\n` + ids.map((id) => `  ${id} | ${q0[id]} | ${m(id)}`).join('\n'));
  bchk('10', 'B7q', !bad.length && !over.length && !grow.length, `q_nogo 0: ${seq.map(([id, x]) => `L${+id} ${x}`).join(' < ')} → ${bad.length ? `단조 아님 ${bad}` : '엄격 단조'} (가장 좁은 간격 L${+minGap[0]} +${(100 * minGap[1]).toFixed(1)} %) · 30회 초과 ${over.join(',') || '없음'} · 직전 2배 초과 ${grow.join(',') || '없음'} · q ${bal.bots.profiles.child_sd70.q_nogo} 판정 곡선(B7) 가장 좁은 간격 L${+minGap15[0]} +${(100 * minGap15[1]).toFixed(1)} % · B6 은 q ${bal.bots.profiles.child_sd70.q_nogo} 기준, q 0 의 L10 = ${q0['10']}`);
}

// K2
log('\n== K2 높이 읽기 손해 모델 (σ70 + 짧아짐·반박 σ 배수, 첫 등장 놓침 +5 %p, 첫 지붕 2개 q +0.10) ==');
{
  const ids = compiled.map((L) => L.level.id);
  log('  ' + ids.map((id) => `L${+id} ${B[id].k2.median_continuous} (${(B[id].k2.median_continuous / m(id)).toFixed(2)}배)`).join(' · '));
  const over = ids.filter((id) => !(B[id].k2.median_continuous <= V.sd70_continuous_max));
  const grow = ids.slice(1).filter((id, k) => B[id].k2.median_continuous > V.max_growth_vs_prev * B[ids[k]].k2.median_continuous);
  bchk('all', 'K2', !over.length && !grow.length, `손해 모델 봇: 30회 초과 ${over.join(',') || '없음'}, 직전 2배 초과 ${grow.join(',') || '없음'} (최대 L${+ids[ids.length - 1]} ${B[ids[ids.length - 1]].k2.median_continuous})`);
}

// K3 + K3b
log('\n== K3 소리 따라 치는 아이 × 남은 오디오 지연 (σ70 연속 중앙값, 화면 판정) ==');
{
  const sf = bal.bots.sound_follow;
  const show = ['01', '05', '10'];
  report.k3 = {};
  const t1 = tapToLevelMs(5000, 1000, bal), t2 = tapToLevelMs(5000, 1000, { ...bal, audio_latency_ms: 220 });
  const L1 = compiled[0];
  const w0 = runProfile(L1, bal.bots.profiles.child_sd70, bal, { N, sessions: 10, seed: SEED + 'child_sd70'.length, bias: 0 });
  const same = w0.clear_rate === B['01'].child_sd70.clear_rate;
  log(`d(ms) \\ w | ${sf.follow_weight.map((w) => `w=${w}`).join(' | ')}   (레벨 ${show.join('/')})`);
  for (const d of sf.bt_residual_delay_ms) {
    const cells = sf.follow_weight.map((w) => show.map((id) => {
      const L = compiled.find((x) => x.level.id === id);
      const r = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: N / 4, sessions: 10, seed: SEED + d + 13 * w, bias: w * d });
      (report.k3[id] ||= {})[`d${d}_w${w}`] = r.median_continuous;
      return r.median_continuous ?? '∞';
    }).join('/'));
    log(`${d} | ${cells.join(' | ')}`);
  }
  check('all', 'K3', bal.judge_clock.audio_used_for_judge === false && t1 === t2 && same, `판정 입력 = 탭 시각(화면 시계, visual_comp ${bal.judge_clock.visual_comp_ms} ms 한 번) · 오디오 지연이 판정에 안 들어감 ${t1 === t2 ? '예' : '아님'} · 공을 보고 치는 아이(w=0) L1 p ${w0.clear_rate} = 기본 ${B['01'].child_sd70.clear_rate}`);
  // K3b (M1·E3): 소리 맞추기 무시 구간 0 → 보정 뒤 남은 오차 ±15 두 쪽, w = 1 봇 모든 레벨 30회·직전 2배
  const ss = bal.sound_sync;
  const res = {};
  for (const b of sf.calibrated_residual_ms) res[b] = compiled.map((L, k) => runProfile(L, bal.bots.profiles.child_sd70, bal, { N, sessions: 10, seed: SEED + 5000 + 31 * k + b, bias: b }).median_continuous);
  const bad = [];
  for (const [b, arr] of Object.entries(res)) arr.forEach((x, k) => { if (!(x <= V.sd70_continuous_max)) bad.push(`${b}:L${k + 1} ${x}`); if (k && x > V.max_growth_vs_prev * arr[k - 1]) bad.push(`${b}:L${k + 1} 2배`); });
  report.k3.calibrated = res;
  bchk('all', 'K3b', ss.apply_only_if_abs_over_ms === 0 && !bad.length, `소리 맞추기 무시 구간 ${ss.apply_only_if_abs_over_ms} ms(없음, 경계 뒤집힘 없음) · 보정 뒤 남은 오차 w = 1: ${Object.entries(res).map(([b, arr]) => `${b > 0 ? '+' : ''}${b} ms → ${arr.map((x, k) => `L${k + 1} ${x}`).join(' ')}`).join(' | ')} · 30회·2배 초과 ${bad.join(', ') || '없음'}`);
  const old = sf.old_deadzone_residual_ms.map((b) => `${b > 0 ? '+' : ''}${b} → L10 ${runProfile(compiled[9], bal.bots.profiles.child_sd70, bal, { N: N / 4, sessions: 10, seed: SEED + 77 + b, bias: b }).median_continuous}`);
  info('K3b', `(round-1 무시 구간 ±30 경계 잔차였다면) ${old.join(' · ')}`);
}

// 정보 Q: q_nogo 민감도 + criteria 기본 행(q 0)
log('\n== 정보 Q: 지붕 참기 실패율 q_nogo 민감도 (σ70 연속 중앙값) ==');
{
  const qs = bal.bots.q_nogo_sensitivity;
  const roofLv = compiled.filter((L) => L.contacts.some((c) => c.kind === 'nogo'));
  report.q_sensitivity = {};
  log(`레벨 | ${qs.map((q) => `q ${q}`).join(' | ')} | 첫 지붕 2개 0.25`);
  for (const L of roofLv) {
    const id = L.level.id;
    const row = qs.map((q) => runProfile(L, bal.bots.profiles.child_sd70, bal, { N: N / 2, sessions: 10, seed: SEED + 600 + +id, qNogo: q }).median_continuous);
    // 첫 지붕 2개만 0.25: k2 모델의 qAdd 만 쓰는 대신 직접 — 레벨 첫 두 지붕에 +0.10
    const L2 = { ...L, contacts: L.contacts.map((c) => ({ ...c })) };
    let n2 = 0; for (const c of L2.contacts) if (c.kind === 'nogo' && n2 < 2) { c.first = true; n2++; } else if (c.kind === 'nogo') c.first = false; else c.first = false;
    const f2r = runProfile(L2, bal.bots.profiles.child_sd70, { ...bal, bots: { ...bal.bots, k2_model: { shorter_than_prev_sd_mult: 1, half_sd_mult: 1, two_ball_sd_mult: 1, first_gimmick_miss_add: 0, first_nogo_q_add: 0.1 } } }, { N: N / 2, sessions: 10, seed: SEED + 600 + +id, k2: true }).median_continuous;
    report.q_sensitivity[id] = { q: Object.fromEntries(qs.map((q, k) => [q, row[k]])), first_two_025: f2r };
    log(`${id} | ${row.join(' | ')} | ${f2r}`);
  }
  const c0 = compiled.map((L, k) => runProfile(L, bal.bots.profiles.child_sd70, bal, { N: N / 2, sessions: 10, seed: SEED + 700 + k, qNogo: 0 }).median_continuous);
  report.criteria_default_q0 = c0;
  info('Q', `criteria 기본 정의(σ70·놓침 3 %·헛탭 2 %, 지붕은 늘 참음 q 0): ${c0.map((x, k) => `L${k + 1} ${x}`).join(' · ')}`);
}

// 정보 K3d
{
  const D = bal.drift_check;
  const rng = (() => { let x = SEED; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
  const g = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const med = (a) => { const q = [...a].sort((x, y) => x - y), n = q.length; return n % 2 ? q[(n - 1) / 2] : (q[n / 2 - 1] + q[n / 2]) / 2; };
  const rate = (bias, n = QUICK ? 4000 : 40000) => { let k = 0; for (let i = 0; i < n; i++) { let ok = true; for (let w = 0; w < D.consecutive_windows; w++) { const a = []; for (let j = 0; j < D.window_taps; j++) a.push(bias + 70 * g()); if (med(a) < D.trigger_median_late_ms) { ok = false; break; } } if (ok) k++; } return k / n; };
  const rows = [[0, '공을 봄(w=0)'], [60, 'w=0.5·d=120'], [85, 'w=0.5·d=170'], [120, 'w=1·d=120'], [170, 'w=1·d=170']].map(([b, nm]) => `${nm} ${(100 * rate(b)).toFixed(2)} %`);
  log(`\n== 정보 K3d 밀림 감지(${D.window_taps}탭 중앙값 ≥ +${D.trigger_median_late_ms} ms 가 ${D.consecutive_windows}창 연속, σ70) 켜질 확률 ==\n  ${rows.join(' · ')}`);
}

// 정보: 따라 치는 아이, 연습 모드, 해석
log('\n== 정보: 따라 치는 아이(\'콩\' 30 %·토스 50 %·착지 50 %) / 연습 모드(받침 쉼 체크포인트) / 해석(헛탭·지붕 무시) ==');
report.info = {};
compiled.forEach((L, k) => {
  const id = L.level.id, j = L.judge;
  const al = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: N / 4, sessions: 10, seed: SEED + 333 + k, along: bal.bots.along });
  const pr = runPractice(L, bal.bots.profiles.child_sd70, bal, { sessions: QUICK ? 100 : 500, seed: SEED + 444 + k });
  const an = analyticClear({ contacts: L.contacts.filter((c) => c.kind === 'hit').length, early: j.pass_early_ms, late: j.pass_late_ms, sd: 70, miss: 0.03 });
  report.info[id] = { along: al.median_continuous, practice_median: pr.median_total_attempts, analytic: an.median_continuous };
  log(`  L${+id}: 따라 치기 ${al.median_continuous} (기본 ${m(id)}) · 연습 모드 구절 ${pr.segments}개 총 ${pr.median_total_attempts}회(90 % ${pr.p90_total_attempts}) · 해석(지붕 없다고 볼 때) ${an.median_continuous}`);
});

// 요약 표
log('\n== 곡선 요약 ==');
log('레벨 | BPM | 길이 s | hit | 지붕 | 통과 창 | 앞쪽 박 | 새 기믹 | σ25 연속 | σ50 연속 | σ70 p | σ70 연속 | σ70 정수 | 직전 대비 | K2 연속 | 기준선');
compiled.forEach((L, k) => {
  const id = L.level.id, b = B[id];
  const prev = k ? m(compiled[k - 1].level.id) : null;
  log(`${id} | ${L.level.bpm} | ${(L.durationMs / 1000).toFixed(1)} | ${L.contacts.filter((c) => c.kind === 'hit').length} | ${L.contacts.filter((c) => c.kind === 'nogo').length} | -${L.judge.pass_early_ms}/+${L.judge.pass_late_ms} | ${L.scroll.ahead} | ${L.level.new_gimmick?.id || '-'} | ${b.skilled_sd25.median_continuous ?? '-'} | ${b.novice_sd50.median_continuous} | ${b.child_sd70.clear_rate} | ${m(id)} | ${b.child_sd70.median_sessions} | ${prev ? (m(id) / prev).toFixed(3) + '배' : '-'} | ${b.k2.median_continuous} | ${report.baseline?.[id] ?? '-'}`);
});

const total = report.checks.length, waitN = report.waits.length, passN = report.checks.filter((c) => c.ok && !c.wait).length;
report.summary = { total, pass: passN, wait: waitN, fail: total - passN - waitN };
if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
else {
  log(`\n검사 ${total}개 중 PASS ${passN}, 대기 ${waitN}, FAIL ${total - passN - waitN}${QUICK ? ' (--quick: B·K 검사는 정보로만, 판정은 전체 실행)' : ''}`);
  if (report.waits.length) { log('대기 목록(다른 역할 파일 round-2 수정 대기, FAIL 아님)'); for (const w of report.waits) log('  ' + w); }
  if (report.fails.length) { log('FAIL 목록'); for (const f of report.fails) log('  ' + f); }
  log(report.fails.length ? 'FAIL' : `ALL PASS${waitN ? ` (대기 ${waitN}개 표시)` : ''}`);
}
process.exit(report.fails.length ? 1 : 0);
