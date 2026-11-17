#!/usr/bin/env node
// rhythm-02 레벨 검증기 (node 만 사용)
//
// 사용법
//   node tools/verify-levels.mjs            # 전체 실행. B6·B7 판정은 이 실행 기준(σ70 4만 회, σ25 10만 회)
//   node tools/verify-levels.mjs --quick    # 봇 표본을 줄여 도구 동작만 확인(B·K 검사는 정보로만, 판정에 쓰지 않음)
//   node tools/verify-levels.mjs --json     # 결과 JSON
//   node tools/verify-levels.mjs --seed=N   # 난수 시드 바꾸기(기본 balance.json verify.seed)
//
// 판정 코드는 빌드와 같은 tools/sim/judge.mjs 를 쓴다. 검사 목록(번호는 20-balance.md 10절과 같음)
//   V0  레벨 10개, id 01~10, name_key level<n>_name, theme_id level<두 자리>
//   V1  스키마·일관성: 접촉 시각 증가·8분 격자, 공마다 (앞 사건 + 비행 길이 = 접촉), 통 이름 = 비행 길이, 토스 = 마디 첫 박,
//       구절 시작 = 앞 구절 마지막 착지, 길이·접촉 수 일치, 쓰인 통이 이미 도입됨
//   V2  박대로 치기 → 클리어, 모두 "딱"
//   V3  무입력 → 첫 접촉에서 실패
//   V4  연타(간격 40~200 ms, 모든 위상) → 클리어 0
//   V5  8분 격자 전부 치기 → 실패
//   V6  6-2 배치 규칙: ①짧아지는 변화 첫 등장 ②통통은 2박 이상 비행 뒤·묶음 길이·레벨당 묶음 예산 ③점 통은 3+3+2 로 마디 첫 박에서
//       ④두 공 접촉 간격 ≥ 1박·번갈아 ⑤받침 쉼 2~4회·쉼 사이 접촉 수 ⑥레벨 끝 접촉 4개는 1박 통
//   V7  새 기믹 ≤ 1 이고 그림 카드로 소개(L1 기본 카드 필수), 첫 등장이 안전(토스 뒤 4박 안, 묶음 뒤 1박 통)
//       + (all) 카드 키 세 곳 일치(결정 D1): balance.json gimmicks.<id>.card = 레벨 card.id = strings.json 키(ko·en) = assets/cards/<키>.svg·<키>_portrait.svg,
//         strings.json 의 card_* 와 assets/cards 파일에 남는 키 없음(G6 흔적 등)
//   V8  판정 창: 딱 < 좋아 ≤ 통과, 통과 폭 단조(직전 94 % 이상, 하한 50 %), L1 ≥ 266.7 ms,
//       놓침 구역이 8분 하나 이른 탭을 덮고 1박 이른 탭은 무시
//   V9  레벨 1: 접촉 16~20, 1박 통만, 받침 쉼 2~4, 재시작 1.1 s 와 단계 배분(늦음·일찍 두 판, 결정 D9)
//   V10 실패 → 다음 판정 접촉 ≤ 6 s (재시작 + 첫 접촉 시각), 일찍 실패 움직임 끝(가장 이른 놓침 탭) ≤ 0.6 s 이고 정지 구간이 남음
//   V11 공이 여러 개 줄지어 내려오는 배치 없음(동시에 내려오는 공 ≤ 1, 5 ms 간격 표본) — 완벽·모두 가장 늦게·모두 가장 이르게 친 통과 세 입력(결정 D3)
//       + 탭이 공을 올림: 늦게 친 탭에서 탭 전에 공이 북을 떠나지 않음(ballsAt 이 친 시각을 따름)
//   V12 높이: 구름 통은 늘 구름선(놀이 높이 90 %, 공 아랫점)을 넘어 숨고(가장 늦게 친 통과에서도) 숨는 시간 ≤ 1.0 s, 구름 아닌 통은 구름선 아래
//   V13 BPM 96~132·레벨 순서로 줄지 않음, 레벨 길이 25~50 s
//   V14 박마다(4분) 고르게 치기: L1~L3 클리어(의도, 박 배우기), L4~ 실패
//   S1  손가락 누름 시작이 통과 창 안(≥ -pass_early), 손가락은 L1 첫 접촉 1회
//   S2  자동 토스 → 다음 접촉 놓침 구역 시작 ≥ 150 ms
//   S3  받침 쉼 '콩'(까딱 소리)은 정박에만, '콩' → 다음 접촉 놓침 구역 시작 ≥ 150 ms
//   S4  서로 다른 공의 이어진 접촉 간격 ≥ 1박
//   S5  모든 신호('콩'·토스·착지·손가락 구간·공 2 들어옴/나감·클리어 큰 튐)가 어떤 접촉의 위험 구간 [놓침 구역 시작, 통과 창 끝]과도 겹치지 않음
//       (손가락은 자기 접촉 제외), 착지 → 다음 접촉 놓침 구역 ≥ 150 ms. 손가락은 judge.mjs fingerSchedule 과 assets/layout.json finger(고정 ms 가 있으면) 둘 다(결정 D4)
//   V15 곡 음 시작(assets/sound.json music 박 규칙: 받침 쉼 = rest_bar, 그 밖 = play_bar + 멜로디 자리)이 어떤 접촉의 놓침 구역 [zoneStart, passStart)에도 들지 않음
//       (접촉과 같은 시각 ±5 ms 는 예외) — art X5, 결정 D16
//   V16 화면 높이(결정 D5): assets/layout.json 식으로 4해상도 × 10레벨 실제 BPM — apex_budget ≥ 모든 비행 최대 꼭짓점, 구름 아닌 비행 공 윗점 ≤ 구름선 0.9·Hp,
//       가장 짧은 튐 꼭짓점 ≥ 1.2·d, 공 지름 ≥ 24 px, layout 구름선·두 공 자리 = balance 값
//   V17 클리어 연출·시작·두 공 데이터(결정 D10·D13): 큰 튐 = 마지막 착지 박, 구름 들어감 < 첫 등급 구름 박, 등급 구름 ≤ 끝 박, 마무리 4박(L10 8박),
//       카드 닫기 → 시작 간격 = balance, 두 공 구절마다 공 2 들어옴(쉼 안, 공 2 토스 전 끝)·나감(다음 토스 1박 전 끝) 박
//   B1  σ70 연속 중앙값 ≤ 30 (L1 ≤ 10, 목표 ≤ 2.5)
//   B2  평균 진행도(접촉 기준) 레벨 순서로 감소 (σ50·σ70)
//   B3  숙련 봇 σ25(10만 회) 실패가 한 접촉에 30 % 넘게 몰리지 않음(실패 20회 미만이면 σ50으로)
//   B4  레벨 1 σ70 실패 위치 중앙값(레벨 시간) ≥ 10 %
//   B5  σ70 연속 중앙값이 직전 레벨의 2배 이하
//   B6  L10 목표: r = (m~3/m~1)^(1/2), T = m~3·r^3 (L6 외삽), L10 m~ ∈ [0.8T, 1.2T]  (연속 중앙값 ln0.5/ln(1-p), 이 실행 한 원천)
//   B7  L3 → L10 σ70 연속 중앙값 엄격 단조 증가, L3~L9 는 L10 목표 상한 미만
//   B8  L1~L3 배율 r ∈ [1.3, 1.65] 이고 m~1·r^5 ≤ 25 (insights)
//   K2  높이 읽기 손해 모델 봇: 모든 레벨 연속 중앙값 ≤ 30, 직전 2배 이하
//   K3  화면 판정: 판정 입력에 오디오 지연이 없음(공을 보고 치는 아이 w=0 은 블루투스 지연과 무관하게 기본과 같음) + 소리 따라 치기 표(정보)
// 정보: 정수 중앙값, 따라 치는 아이, 연습 모드, 해석 예측, 높이 표

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileLevel, judgeAttempt, ballsAt, flightApex, fingerSchedule, tapToLevelMs, restartPhases, hitsFromResult } from './sim/judge.mjs';
import { runProfile, runPractice, analyticClear, contMedian } from './sim/bots.mjs';

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

const report = { quick: QUICK, seed: SEED, levels: {}, checks: [], fails: [] };
const log = (...a) => { if (!JSON_OUT) console.log(...a); };
const check = (lv, code, ok, msg) => {
  report.checks.push({ level: lv, code, ok, msg });
  if (!ok) report.fails.push(`${lv} ${code}: ${msg}`);
  log(`  ${ok ? 'PASS' : 'FAIL'} ${code} ${msg}`);
};
const info = (code, msg) => log(`  정보 ${code} ${msg}`);
const bchk = QUICK ? (lv, code, ok, msg) => log(`  정보 ${code}(--quick, 판정 안 함) ${ok ? '통과 범위' : '범위 밖'}: ${msg}`) : check;
const f0 = (x) => (x === Infinity ? '∞' : x.toFixed(0));
const f2 = (x) => (x == null ? '-' : (+x).toFixed(2));
const byLv = (obj, id) => obj[id] ?? obj.default;

const levels = bal.levels.map((f) => JSON.parse(readFileSync(join(PROJECT, f), 'utf8')));
// 다른 역할 원본(읽기만): art assets/layout.json·assets/sound.json·assets/cards, lore strings.json
const readJson = (rel) => { try { return JSON.parse(readFileSync(join(PROJECT, rel), 'utf8')); } catch (e) { return { _error: String(e.message || e) }; } };
const LAYOUT = readJson(V.layout_file), SOUND = readJson(V.sound_file), STRINGS = readJson(V.strings_file);
let musicOnsets = null, musicErr = '';
try { ({ musicOnsets } = await import(pathToFileURL(join(PROJECT, 'tools/art/music.mjs')).href)); } catch (e) { musicErr = String(e.message || e); }
const compiled = levels.map((l) => compileLevel(l, bal));

// ---------- V7(all) 카드 키 세 곳 일치 (결정 D1)
{
  const err = [];
  const keys = Object.entries(bal.gimmicks).filter(([g, v]) => !g.startsWith('_') && v.card).map(([, v]) => v.card);
  if (STRINGS._error) err.push(`strings.json 읽기 실패`);
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
  if (miss.length) err.push(`카드 그림 없음 ${miss.length}개(${miss.slice(0, 3).join(',')}${miss.length > 3 ? '…' : ''})`);
  if (extraF.length) err.push(`키에 없는 카드 그림 ${extraF.length}개(${extraF.slice(0, 3).join(',')}${extraF.length > 3 ? '…' : ''})`);
  log('== 카드 키 (balance.json gimmicks → strings.json · assets/cards) ==');
  check('all', 'V7', !err.length, err.length ? err.join(' / ') + ' — 다른 역할 수정 대기(art 카드 파일 이름·lore 키)' : `카드 키 ${keys.length}개 = strings.json(ko·en) = assets/cards 그림 ${want.length}장, 남는 키·파일 없음`);
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
const allowedBeats = Object.values(bal.bounces).filter((b) => b && b.beats).map((b) => b.beats);
const bounceName = Object.fromEntries(Object.entries(bal.bounces).filter(([, b]) => b && b.beats).map(([k, b]) => [b.beats, k]));
let prevWidth = null, prevBpm = null;
const introduced = new Set();

compiled.forEach((L, li) => {
  const lvl = L.level, id = lvl.id, j = L.judge, C = L.contacts;
  const beat = L.beatMs;
  report.levels[id] = { bpm: lvl.bpm, contacts: C.length, duration_s: +(L.durationMs / 1000).toFixed(2), pass: [j.pass_early_ms, j.pass_late_ms] };
  log(`\n== 레벨 ${id} (BPM ${lvl.bpm}, 1박 ${beat.toFixed(1)} ms, 접촉 ${C.length}, 길이 ${(L.durationMs / 1000).toFixed(2)} s, 통과 -${j.pass_early_ms}/+${j.pass_late_ms}, 새 기믹 ${lvl.new_gimmick?.id || '없음'}) ==`);

  // ---------- V1
  {
    const err = [];
    const req = ['id', 'theme_id', 'name_key', 'bpm', 'beats_per_bar', 'judge', 'phrases', 'contacts', 'length_beats', 'contact_count', 'duration_s'];
    for (const k of req) if (lvl[k] === undefined) err.push(`키 ${k} 없음`);
    lvl.contacts.forEach((c, i) => {
      if (c.i !== i) err.push(`접촉 ${i} 번호`);
      if (i && !(c.beat > lvl.contacts[i - 1].beat)) err.push(`접촉 ${i} 시각 증가 아님`);
      if (!Number.isInteger(c.beat * 2)) err.push(`접촉 ${i} 8분 격자 밖`);
      if (!allowedBeats.includes(c.gap_beats) || bounceName[c.gap_beats] !== c.bounce) err.push(`접촉 ${i} 통 ${c.bounce}/${c.gap_beats}`);
      const want = lvl.phrases[c.phrase]?.balls === 2 ? 'G5' : c.gimmick === 'G7' ? 'G7' : bal.bounces[c.bounce]?.gimmick;
      if (c.gimmick !== want) err.push(`접촉 ${i} 기믹 태그 ${c.gimmick}≠${want}`);
    });
    let prevEnd = 0;
    lvl.phrases.forEach((ph, pi) => {
      if (ph.index !== pi) err.push(`구절 ${pi} 번호`);
      if (ph.start_beat !== prevEnd) err.push(`구절 ${pi} 시작 ${ph.start_beat} ≠ 앞 착지 ${prevEnd}`);
      if (!Number.isInteger(ph.start_beat)) err.push(`구절 ${pi} 시작 정박 아님`);
      if (ph.rest_beats < bal.rest.min_rest_beats) err.push(`구절 ${pi} 쉼 ${ph.rest_beats}박 < ${bal.rest.min_rest_beats}`);
      const t1 = ph.tosses.find((x) => x.ball === 1);
      if (!t1 || t1.beat !== ph.start_beat + ph.rest_beats || t1.beat % lvl.beats_per_bar) err.push(`구절 ${pi} 토스가 쉼 끝·마디 첫 박 아님`);
      for (const ts of ph.tosses) {
        const own = lvl.contacts.filter((c) => c.phrase === pi && c.ball === ts.ball);
        let at = ts.beat;
        for (const c of own) { if (Math.abs(at + c.gap_beats - c.beat) > 1e-9) err.push(`공 ${ts.ball} 접촉 ${c.i} 비행 불일치`); at = c.beat; }
        if (own[0] && own[0].gap_beats < bal.rest.min_first_toss_beats) err.push(`구절 ${pi} 토스 비행 짧음`);
        const ld = ph.landings.find((x) => x.ball === ts.ball);
        if (!ld || ld.beat <= at || ld.from_contact !== own[own.length - 1].i) err.push(`공 ${ts.ball} 착지 오류`);
      }
      prevEnd = Math.max(...ph.landings.map((x) => x.beat));
      if (!Number.isInteger(prevEnd)) err.push(`구절 ${pi} 착지 정박 아님`);
    });
    if (lvl.length_beats !== prevEnd + lvl.outro_beats) err.push('length_beats 불일치');
    if (lvl.contact_count !== lvl.contacts.length) err.push('contact_count 불일치');
    if (Math.abs(lvl.duration_s - lvl.length_beats * 60 / lvl.bpm) > 0.01) err.push('duration_s 불일치');
    const usedNew = [...new Set(lvl.contacts.map((c) => c.gimmick))].filter((g) => !introduced.has(g));
    const lateIntro = usedNew.filter((g) => (bal.gimmicks[g]?.level ?? '99') !== id);
    if (lateIntro.length) err.push(`이 레벨에서 소개하지 않은 새 통 ${lateIntro}`);
    check(id, 'V1', !err.length, err.length ? err.slice(0, 6).join(' / ') : `스키마·비행 일관성 정상 (구절 ${lvl.phrases.length}, 공 ${Math.max(...lvl.contacts.map((c) => c.ball))}개)`);
  }

  // ---------- V2, V3
  const perfect = judgeAttempt(L, C.map((c) => c.t));
  check(id, 'V2', perfect.clear && perfect.grades.every((g) => g.grade === 'perfect'), `박대로 치기 → ${perfect.clear ? '클리어' : '실패'}, 딱 ${perfect.grades.filter((g) => g.grade === 'perfect').length}/${C.length}`);
  const none = judgeAttempt(L, []);
  check(id, 'V3', !none.clear && none.failIndex === 0, `무입력 → ${none.clear ? '클리어(!)' : `실패 (접촉 0, ${(none.failTimeMs / 1000).toFixed(2)} s, ${none.reason})`}`);

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
  // ---------- V5 8분 격자
  {
    const r = judgeAttempt(L, steady(0, L.durationMs, L.eighthMs, 0));
    check(id, 'V5', !r.clear, `8분 격자 전부 치기 → ${r.clear ? '클리어(!)' : `실패 (접촉 ${r.failIndex}, ${r.reason})`}`);
  }
  // ---------- V14 박마다 치기
  {
    const r = judgeAttempt(L, steady(0, L.durationMs, beat, 0));
    const want = +id <= 3;
    check(id, 'V14', r.clear === want, `박마다 고르게 치기 → ${r.clear ? '클리어' : `실패 (접촉 ${r.failIndex}, ${r.reason})`} (의도: ${want ? 'L1~L3 박 배우기 = 클리어' : 'L4~ 높이를 읽어야 함 = 실패'})`);
    report.levels[id].quarter_steady_clear = r.clear;
  }

  // ---------- V6 배치 규칙
  {
    const err = [];
    const newG = lvl.new_gimmick?.id;
    const newBeats = Object.values(bal.bounces).find((b) => b && b.gimmick === newG)?.beats;
    // ① 짧아지는 변화 첫 등장: 짧아진 쪽이 반박이거나 새 기믹 길이가 끼면, 긴 통이 토스였거나 2번 이상 이어진 뒤
    const seen = new Set();
    for (const ph of lvl.phrases) {
      if (ph.balls === 2) continue;
      const cs = lvl.contacts.filter((c) => c.phrase === ph.index);
      for (let k = 1; k < cs.length; k++) {
        const a = cs[k - 1].gap_beats, b = cs[k].gap_beats;
        if (!(b < a)) continue;
        if (!(b === 0.5 || a === newBeats || b === newBeats)) continue;
        const key = `${a}>${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const okToss = k - 1 === 0;
        const okRep = k >= 2 && cs[k - 2].gap_beats === a;
        if (!okToss && !okRep) err.push(`①${key} 첫 등장(접촉 ${cs[k].i}) 앞이 쉼·같은 통 반복 아님`);
      }
    }
    // ② 통통
    const runMax = byLv(V.half_run_max, id);
    let groups = 0;
    for (let i = 0; i < C.length; i++) {
      if (C[i].gapBeats !== 0.5) continue;
      let k = i; while (k < C.length && C[k].gapBeats === 0.5) k++;
      const len = k - i; groups++;
      const before = i > 0 ? C[i - 1].gapBeats : 0;
      if (C[i].phrase !== C[i - 1]?.phrase || before < 2) err.push(`②통통(접촉 ${i})이 2박 이상 비행 뒤가 아님`);
      if (len % 2 || len > runMax || (len !== 2 && len !== 4)) err.push(`②반박 ${len}연속(접촉 ${i}, 한도 ${runMax})`);
      if (k < C.length && C[k].phrase === C[i].phrase && C[k].gapBeats < 1) err.push(`②통통 뒤가 1박 미만`);
      i = k - 1;
    }
    const budget = byLv(V.half_groups_budget, id);
    if (groups > budget) err.push(`②통통 묶음 ${groups} > 예산 ${budget}`);
    // ③ 점 통
    for (let i = 0; i < C.length; i++) {
      if (C[i].gapBeats !== 1.5) continue;
      const ok = C[i + 1]?.gapBeats === 1.5 && C[i + 2]?.gapBeats === 1 && i > 0 && C[i - 1].phrase === C[i].phrase && C[i + 2].phrase === C[i].phrase;
      const startBeat = C[i].beat - 1.5;
      if (!ok || startBeat % lvl.beats_per_bar) err.push(`③점 통(접촉 ${i})이 3+3+2·마디 첫 박 묶음 아님`);
      i += 1;
    }
    // ④ 두 공
    for (let i = 1; i < C.length; i++) {
      if (C[i].ball !== C[i - 1].ball && C[i].t - C[i - 1].t < beat - 1e-6) err.push(`④두 공 접촉 ${i - 1}→${i} 간격 < 1박`);
      if (C[i].ball === C[i - 1].ball && C[i].phrase === C[i - 1].phrase && lvl.phrases[C[i].phrase].balls === 2) err.push(`④두 공 구절에서 같은 공 연속(접촉 ${i})`);
    }
    // ⑤ 받침 쉼
    const nRest = lvl.phrases.length;
    const maxBetween = byLv(V.max_contacts_between_rests, id);
    const most = Math.max(...lvl.phrases.map((p) => p.contact_range[1] - p.contact_range[0] + 1));
    if (nRest < V.rest_count_range[0] || nRest > V.rest_count_range[1]) err.push(`⑤받침 쉼 ${nRest}회`);
    if (most > maxBetween) err.push(`⑤쉼 사이 접촉 ${most} > ${maxBetween}`);
    // ⑥ 끝
    const tail = C.slice(-V.tail_tong_contacts);
    if (!tail.every((c) => c.gapBeats === 1 && c.ball === 1)) err.push(`⑥마지막 접촉 ${V.tail_tong_contacts}개가 1박 통 아님`);
    check(id, 'V6', !err.length, err.length ? err.slice(0, 6).join(' / ') : `배치 규칙 ①~⑥ 통과 (받침 쉼 ${nRest}회, 쉼 사이 최대 ${most} ≤ ${maxBetween}, 통통 묶음 ${groups} ≤ ${budget})`);
  }

  // ---------- V7 새 기믹
  {
    const err = [];
    const firsts = [...new Set(C.map((c) => c.gimmick))].filter((g) => !introduced.has(g));
    const ng = lvl.new_gimmick?.id || null;
    if (firsts.length > 1) err.push(`새 기믹 ${firsts.length}개(${firsts})`);
    if ((firsts[0] || null) !== ng && !(id === '01' && ng === 'B1')) err.push(`new_gimmick ${ng} ≠ 처음 쓰인 ${firsts}`);
    const wantCard = ng ? bal.gimmicks[ng]?.card : null;
    if ((lvl.card?.id || null) !== wantCard) err.push(`카드 ${lvl.card?.id} ≠ ${wantCard}`);
    if (id === '01' && !lvl.card) err.push('레벨 1 기본 카드 없음');
    let safe = '-';
    if (ng && ng !== 'B1') {
      const fc = C.find((c) => c.gimmick === ng);
      const ph = lvl.phrases[fc.phrase];
      const tossBeat = ph.tosses[0].beat;
      if (ng === 'G5') {
        safe = `두 공 첫 구절 ${ph.index}: 받침 쉼 ${ph.rest_beats}박 뒤 시작`;
        if (ph.rest_beats < 4) err.push('두 공 첫 구절 앞 쉼 < 4박');
      } else {
        const flightStart = fc.beat - fc.gapBeats;
        const before = C.filter((c) => c.phrase === ph.index && c.i < fc.i);
        const onlyTong = before.every((c) => c.gapBeats === 1 || (c.i === fc.i - 1 && ['G4', 'G7'].includes(ng) && c.gapBeats >= 2)); // 통통·드르륵은 늘 큰 통 뒤(6-2 ②)
        let k = fc.i; while (k < C.length && C[k].gimmick === ng) k++;
        const after = C[k] && C[k].phrase === ph.index ? C[k].gapBeats : null;
        safe = `첫 비행이 토스 뒤 ${flightStart - tossBeat}박에 시작, 앞은 ${before.length ? '1박 통만' : '토스'}, 묶음 뒤 ${after ?? '착지'}박`;
        if (flightStart - tossBeat > 4 || !onlyTong) err.push(`첫 등장이 받침 쉼 바로 뒤가 아님(${safe})`);
        if (after !== null && after !== 1) err.push(`첫 묶음 뒤가 1박 통 아님(${after})`);
        if (ph.rest_beats < 4) err.push('첫 등장 구절 앞 쉼 < 4박');
      }
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
    if (prevWidth && (w > prevWidth || w < V.min_window_ratio_vs_prev * prevWidth || w < V.min_window_ratio_floor * prevWidth)) err.push(`통과 폭 ${w} vs 직전 ${prevWidth}`);
    if (id === '01' && w < V.l1_min_pass_window_ms) err.push(`L1 통과 폭 ${w} < ${V.l1_min_pass_window_ms}`);
    const outer = j.pass_early_ms + j.miss_zone_ms;
    if (!(outer > L.eighthMs)) err.push(`놓침 구역 바깥 -${outer} 이 8분 이른 탭 -${f0(L.eighthMs)} 못 덮음`);
    if (!(outer < beat)) err.push(`1박 이른 탭 -${f0(beat)} 이 놓침 구역 안`);
    check(id, 'V8', !err.length, err.length ? err.join(' / ') : `통과 ${w} ms${prevWidth ? ` = 직전 ${prevWidth} 의 ${(100 * w / prevWidth).toFixed(1)} %` : ''} · 놓침 구역 바깥 -${outer} ms: 8분 이른 탭 -${f0(L.eighthMs)} 덮음, 1박 이른 탭 -${f0(beat)} 무시`);
    prevWidth = w;
  }

  // ---------- V9 레벨 1
  if (id === '01') {
    const err = [];
    const rs = bal.restart;
    if (C.length < V.l1_contact_range[0] || C.length > V.l1_contact_range[1]) err.push(`접촉 ${C.length}`);
    if (!C.every((c) => c.gapBeats === 1)) err.push('1박 통 아닌 접촉');
    if (lvl.phrases.length < V.l1_rest_count_range[0] || lvl.phrases.length > V.l1_rest_count_range[1]) err.push(`받침 쉼 ${lvl.phrases.length}`);
    const ends = {};
    for (const kind of ['late', 'early']) {
      const ph = Object.values(rs.phases_s[kind] || {}).filter(Array.isArray);
      ends[kind] = ph.length ? Math.max(...ph.map((x) => x[1])) : NaN;
      if (!(Math.abs(ends[kind] - rs.restart_delay_s) < 1e-9)) err.push(`${kind} 배분 끝 ${ends[kind]}`);
    }
    if (rs.restart_delay_s < rs.allowed_range_s[0] || rs.restart_delay_s > rs.allowed_range_s[1] || rs.confirm_button) err.push(`재시작 ${rs.restart_delay_s} s`);
    check(id, 'V9', !err.length, err.length ? err.join(' / ') : `접촉 ${C.length}(16~20), 1박 통만, 받침 쉼 ${lvl.phrases.length}회, 재시작 ${rs.restart_delay_s} s 자동(늦음·일찍 두 판 모두 배분 끝 ${ends.late} s, 확인 버튼 없음)`);
  }

  // ---------- V10 실패 → 다음 판정 접촉
  {
    const s = bal.restart.restart_delay_s + C[0].t / 1000;
    // 일찍 실패 중 남은 낙하가 가장 긴 경우 = 놓침 구역 맨 앞 탭
    let worstEnd = 0, worstStill = Infinity;
    for (const c of C) {
      const ph = restartPhases(L, { reason: 'early', failIndex: c.i, failTimeMs: c.zoneStart }, bal);
      worstEnd = Math.max(worstEnd, ph.ball_fall_fx[1]);
      worstStill = Math.min(worstStill, ph.still_best_dot[1] - ph.still_best_dot[0]);
    }
    const okE = worstEnd <= bal.restart.early_fall_rule.max_s + 1e-9 && worstStill > 0;
    check(id, 'V10', s <= V.fail_to_next_contact_max_s && okE, `실패 → 다음 판정 접촉 ${s.toFixed(2)} s (재시작 ${bal.restart.restart_delay_s} + 첫 접촉 ${(C[0].t / 1000).toFixed(2)}) ≤ ${V.fail_to_next_contact_max_s} · 일찍 실패 움직임 끝 최대 ${worstEnd.toFixed(2)} s ≤ ${bal.restart.early_fall_rule.max_s}, 정지 구간 최소 ${worstStill.toFixed(2)} s`);
    report.levels[id].fail_to_next_contact_s = +s.toFixed(2);
  }

  // ---------- V11 줄지어 내려오는 공 없음
  {
    let worst = 0, at = null, early = 0;
    const inputs = { perfect: C.map((c) => c.t), late: C.map((c) => c.passEnd), early: C.map((c) => c.passStart) };
    const lateHits = hitsFromResult(L, judgeAttempt(L, inputs.late));
    for (const [nm, taps] of Object.entries(inputs)) {
      const res = judgeAttempt(L, taps);
      if (!res.clear) { early++; continue; }
      const hits = hitsFromResult(L, res);
      for (let t = 0; t < L.durationMs; t += 5) {
        const down = ballsAt(L, t, hits).filter((b) => b.state === 'down');
        if (down.length > worst) { worst = down.length; at = `${nm} ${f0(t)}`; }
      }
    }
    // 늦게 친 탭: 접촉 시각 ~ 탭 사이에는 공이 가죽 위에서 기다림(y = 0, waiting)
    let leftEarly = 0;
    for (const c of C) for (const t of [c.t + 1, (c.t + c.passEnd) / 2, c.passEnd - 1]) {
      const b = ballsAt(L, t, lateHits).find((x) => x.ball === c.ball);
      if (!(b && b.state === 'waiting' && b.y === 0)) leftEarly++;
    }
    check(id, 'V11', worst <= 1 && !early && !leftEarly, `동시에 내려오는 공 최대 ${worst}개${worst > 1 ? ` (${at} ms)` : ''} (완벽·가장 늦게·가장 이르게 친 통과 세 입력${early ? `, 클리어 못 한 입력 ${early}(!)` : ''}) · 늦게 친 탭 ${C.length}개 모두 탭 전까지 가죽 위에서 기다림${leftEarly ? `(어긋남 ${leftEarly})` : ''}`);
  }

  // ---------- V12 높이
  {
    const cl = bal.height.cloud_line_ratio, c = bal.height.c_play_height_per_s;
    let maxHide = 0, badVis = [], noHide = [];
    const apex = {};
    for (const fl of Object.values(L.flights).flat()) {
      const d = fl.to - fl.from, H = flightApex(d, bal);
      const name = bounceName[Math.round(d / beat * 2) / 2] || fl.kind;
      apex[name] = H;
      if (name === 'cloud' && !(H > cl)) noHide.push(f0(fl.from));
      if (H > cl) { const disc = 1 - cl / H; const hide = Math.sqrt(disc) * d / 1000; maxHide = Math.max(maxHide, hide); if (name !== 'cloud') badVis.push(name); }
    }
    // 늦게 친 통과(+pass_late)에서도 구름 통이 숨는지: 접촉에서 떠나는 구름 통만 해당(토스는 시각 고정)
    let lateMin = Infinity;
    for (const fl of Object.values(L.flights).flat()) {
      if (fl.kind !== 'bounce') continue;
      const name = bounceName[Math.round((fl.to - fl.from) / beat * 2) / 2];
      if (name !== 'cloud') continue;
      const H = flightApex(fl.to - fl.from - j.pass_late_ms, bal);
      lateMin = Math.min(lateMin, H);
      if (!(H > cl)) noHide.push(`늦은 탭 ${f0(fl.from)}`);
    }
    const ok = maxHide <= bal.height.max_hidden_s && !badVis.length && !noHide.length;
    check(id, 'V12', ok, `구름 뒤 숨는 시간 최대 ${maxHide.toFixed(2)} s ≤ ${bal.height.max_hidden_s} · 구름선 ${100 * cl} %(공 아랫점) · 구름 아닌 통이 구름선 넘음 ${badVis.join(',') || '없음'} · 구름 통이 구름선 못 넘음 ${noHide.join(',') || '없음'}${lateMin < Infinity ? ` · 가장 늦게 친 통과 뒤 구름 통 꼭짓점 ${(100 * lateMin).toFixed(0)} %` : ''} · 꼭짓점(Hp 대비) ${Object.entries(apex).map(([k, v]) => `${k} ${(100 * v).toFixed(0)} %`).join(', ')}`);
    report.levels[id].apex = Object.fromEntries(Object.entries(apex).map(([k, v]) => [k, +v.toFixed(3)]));
    report.levels[id].cloud_hidden_s = +maxHide.toFixed(2);
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
  {
    const fs = fingerSchedule(L, bal);
    if (id === '01') {
      const c = C[fs.contact];
      const pressRel = fs.pressStart - c.t;
      const ok = fs.contact === 0 && pressRel >= -j.pass_early_ms && pressRel <= 0 && fs.pressStart >= c.passStart;
      check(id, 'S1', ok, `손가락: 토스 ${f0(fs.from)} ms 에 나타남 → 누름 시작 ${f0(pressRel)} ms(접촉 기준, 통과 창 -${j.pass_early_ms} 안) → 사라짐 +${j.pass_late_ms} ms, 첫 접촉 1회`);
      report.levels[id].finger = { appear_ms: +fs.from.toFixed(1), press_start_ms: +fs.pressStart.toFixed(1), press_start_rel_ms: +pressRel.toFixed(1), contact_ms: +c.t.toFixed(1), gone_ms: +fs.gone.toFixed(1) };
    } else check(id, 'S1', !lvl.tutorial_finger, `손가락 그림 ${lvl.tutorial_finger ? '있음(!)' : '없음(레벨 1만)'}`);
  }
  {
    let worst = Infinity, bad = [];
    for (const ts of L.tosses) { const m = nextZone(ts.t); worst = Math.min(worst, m); if (m < M || inRisk(ts.t) >= 0) bad.push(f0(ts.t)); }
    check(id, 'S2', !bad.length, `자동 토스 ${L.tosses.length}회 → 다음 접촉 놓침 구역까지 최소 ${f0(worst)} ms ≥ ${M}${bad.length ? ` 어긋남 ${bad}` : ''}`);
  }
  {
    let worst = Infinity, bad = [];
    for (const tk of L.bobs) { const b = tk.t / beat; if (Math.abs(b - Math.round(b)) > 1e-6) bad.push(`정박 아님 ${b}`); const m = nextZone(tk.t); worst = Math.min(worst, m); if (m < M || inRisk(tk.t) >= 0) bad.push(f0(tk.t)); }
    check(id, 'S3', !bad.length, `받침 쉼 '콩' ${L.bobs.length}회 모두 정박, 다음 접촉 놓침 구역까지 최소 ${f0(worst)} ms ≥ ${M}${bad.length ? ` 어긋남 ${bad.slice(0, 4)}` : ''}`);
  }
  {
    let min = Infinity;
    for (let i = 1; i < C.length; i++) if (C[i].ball !== C[i - 1].ball) min = Math.min(min, C[i].t - C[i - 1].t);
    check(id, 'S4', min >= beat - 1e-6, min === Infinity ? '두 공 접촉 없음' : `서로 다른 공 접촉 간격 최소 ${f0(min)} ms ≥ 1박 ${f0(beat)}`);
  }
  {
    const bad = [];
    let worstLand = Infinity;
    for (const ld of L.landings) { const k = inRisk(ld.t); if (k >= 0) bad.push(`착지 ${f0(ld.t)}∈접촉${k}`); const m = nextZone(ld.t); worstLand = Math.min(worstLand, m); if (m < M) bad.push(`착지 ${f0(ld.t)} 여유 ${f0(m)}`); }
    const fs = fingerSchedule(L, bal);
    const overlapMs = (x0, x1, except = -1) => Math.max(0, ...risk.filter((_, k) => k !== except).map(([a, b]) => Math.min(x1, b) - Math.max(x0, a)));
    let fingerTxt = '';
    if (fs) {
      const o = overlapMs(fs.from, fs.goneLatest, fs.contact);
      if (o > 0) bad.push(`손가락(balance) 구간이 다른 접촉 위험 구간과 ${f0(o)} ms 겹침`);
      const nextRisk = Math.min(...risk.filter((_, k) => k !== fs.contact).map(([a]) => a).filter((a) => a > fs.from));
      fingerTxt = ` · 손가락 사라짐(balance fingerSchedule) 늦어도 ${f0(fs.goneLatest)} ms < 다음 위험 ${f0(nextRisk)} ms`;
      // art layout.json finger 에 고정 ms 가 남아 있으면 그 값으로도 검사(결정 D4)
      const lf = LAYOUT.finger;
      if (LAYOUT._error) bad.push('layout.json 읽기 실패');
      else if (lf && typeof lf.hide_after_ms === 'number') {
        const goneArt = C[fs.contact].t + lf.hide_after_ms;
        const oa = overlapMs(fs.from, goneArt, fs.contact);
        fingerTxt += ` · layout.json finger.hide_after_ms ${lf.hide_after_ms} → 사라짐 ${f0(goneArt)} ms${oa > 0 ? `, 다음 위험과 ${f0(oa)} ms 겹침 — 다른 역할 수정 대기(art: 고정 ms 를 빼고 fingerSchedule().gone 을 따름)` : ''}`;
        if (oa > 0) bad.push(`손가락(layout.json) ${f0(oa)} ms 겹침`);
      } else fingerTxt += ' · layout.json 손가락 고정 ms 없음(fingerSchedule 따름)';
      if (lf && lf.press_start_beats != null && lf.press_start_beats !== lvl.tutorial_finger.press_start_beats) bad.push(`layout.json 누름 시작 ${lf.press_start_beats}박 ≠ ${lvl.tutorial_finger.press_start_beats}박`);
    }
    // 공 2 들어옴·나감, 클리어 큰 튐
    let sbN = 0;
    for (const sb of L.secondBall) {
      for (const [x0, x1, nm] of [[...sb.enter, '공 2 들어옴'], [...sb.ball1Left, '공 1 왼쪽으로'], [...sb.exit, '공 2 나감'], [...sb.ball1Center, '공 1 가운데로']]) {
        sbN++;
        const o = overlapMs(x0, x1);
        if (o > 0) bad.push(`${nm} ${f0(x0)}~${f0(x1)} ms 가 위험 구간과 ${f0(o)} ms 겹침`);
        if (nextZone(x1) < M) bad.push(`${nm} 끝 → 다음 놓침 구역 ${f0(nextZone(x1))} ms < ${M}`);
      }
    }
    if (L.clear && overlapMs(L.clear.launch, L.clear.resultMs) > 0) bad.push('클리어 큰 튐이 위험 구간과 겹침');
    check(id, 'S5', !bad.length, `신호('콩' ${L.bobs.length}·토스 ${L.tosses.length}·착지 ${L.landings.length}${fs ? '·손가락 1' : ''}${sbN ? `·두 공 움직임 ${sbN}` : ''}·클리어 큰 튐 1) ∩ 위험 구간 = ${bad.length ? bad.slice(0, 4).join(', ') : '없음'} · 착지 → 다음 놓침 구역 최소 ${f0(worstLand)} ms${fingerTxt}`);
  }

  // ---------- V15 곡 음 시작 ∩ 놓침 구역 (결정 D16, art X5). 곡 음 목록은 art 순수 함수 tools/art/music.mjs musicOnsets(sound.json onset_rule 원본)를 그대로 씀(한 원천)
  {
    if (SOUND._error || !SOUND.music) check(id, 'V15', false, 'assets/sound.json music 읽기 실패 — 다른 역할 수정 대기');
    else if (!musicOnsets) check(id, 'V15', false, `tools/art/music.mjs musicOnsets 를 읽지 못함(${musicErr}) — 다른 역할 수정 대기`);
    else {
      let on;
      try { on = musicOnsets(lvl, SOUND); } catch (e) { on = null; check(id, 'V15', false, `musicOnsets 실행 실패 ${e.message} — 다른 역할 수정 대기`); }
      if (on) {
        const beatsOn = [...new Set(on.map((o) => o.beat))];
        const clash = [];
        for (const ob of beatsOn) {
          const tm = ob * beat;
          if (C.some((c) => Math.abs(c.t - tm) < 5)) continue;
          const k = C.findIndex((c) => tm >= c.zoneStart && tm < c.passStart);
          if (k >= 0) clash.push(`${ob}박→접촉 ${k}(${C[k].beat}박)`);
        }
        const nRest = on.filter((o) => o.part === 'rest' && o.sound !== 'bass').length;
        check(id, 'V15', !clash.length, `곡 음 시작 ${beatsOn.length}박(받침 쉼 '콩' ${nRest}, 플레이 짝수 박 베이스·멜로디) ∩ 놓침 구역 = ${clash.length ? clash.slice(0, 4).join(', ') : '없음'}${nRest !== L.bobs.length ? ` · '콩' 수 ${nRest} ≠ 받침 쉼 박 ${L.bobs.length}(!)` : ''}`);
        if (nRest !== L.bobs.length) report.fails.push(`${id} V15: '콩' 수 불일치`);
      }
    }
  }

  // ---------- V16 화면 높이 (결정 D5): layout.json 식 × 4해상도 × 실제 BPM
  {
    const err = [];
    const PH = LAYOUT.play_height;
    if (LAYOUT._error || !PH) check(id, 'V16', false, 'assets/layout.json play_height 읽기 실패 — 다른 역할 수정 대기');
    else {
      const flights = Object.values(L.flights).flat().map((fl) => ({ dur: fl.to - fl.from, name: bounceName[Math.round((fl.to - fl.from) / beat * 2) / 2] || fl.kind, kind: fl.kind }));
      const maxApex = Math.max(...flights.map((x) => flightApex(x.dur, bal)), L.clear ? L.clear.apex : 0);
      if (!(PH.apex_budget >= maxApex - 1e-3)) err.push(`layout apex_budget ${PH.apex_budget} < 최대 꼭짓점 ${maxApex.toFixed(4)}`);
      if (Math.abs(PH.apex_budget - bal.height.apex_budget_play_heights) > 1e-3) err.push(`layout apex_budget ${PH.apex_budget} ≠ balance ${bal.height.apex_budget_play_heights}`);
      if (Math.abs(PH.cloud_edge_of_Hp - bal.height.cloud_line_ratio) > 1e-9) err.push(`layout 구름선 ${PH.cloud_edge_of_Hp} ≠ ${bal.height.cloud_line_ratio}`);
      if (L.secondBall.length && LAYOUT.drum && Math.abs(LAYOUT.drum.twoball_x_of_d - bal.rest.second_ball.seat_x_of_d) > 1e-9) err.push(`layout 두 공 자리 ${LAYOUT.drum.twoball_x_of_d} ≠ ${bal.rest.second_ball.seat_x_of_d}`);
      const nonCloud = flights.filter((x) => x.name !== 'cloud');
      const topMax = Math.max(...nonCloud.map((x) => flightApex(x.dur, bal)));
      const shortest = Math.min(...flights.map((x) => x.dur));
      const rows = [];
      for (const [W, H, st, sb] of V.layout_resolutions) {
        const g = layoutGeom(LAYOUT, W, H, st, sb);
        const top = topMax + g.d / g.Hp; // 공 윗점(Hp 대비)
        const shortPx = flightApex(shortest, bal) * g.Hp;
        if (g.d < bal.height.ball_min_render_px) err.push(`${W}x${H} 공 ${g.d} px < ${bal.height.ball_min_render_px}`);
        if (top > bal.height.noncloud_ball_top_max_ratio + 1e-9) err.push(`${W}x${H} 구름 아닌 공 윗점 ${top.toFixed(3)} Hp > 0.9 (+${((top - 0.9) * g.Hp).toFixed(1)} px)`);
        if (shortPx < bal.height.min_apex_of_d * g.d - 1e-9) err.push(`${W}x${H} 가장 짧은 튐 꼭짓점 ${shortPx.toFixed(1)} px = ${(shortPx / g.d).toFixed(3)}d < ${bal.height.min_apex_of_d}d`);
        rows.push(`${W}x${H} Hp ${g.Hp.toFixed(0)}·d ${g.d}: 윗점 ${top.toFixed(3)}·짧은 튐 ${(shortPx / g.d).toFixed(2)}d`);
      }
      report.levels[id].layout = rows;
      check(id, 'V16', !err.length, (err.length ? err.slice(0, 4).join(' / ') + ' — 다른 역할 수정 대기(art layout.json)' : 'apex_budget·구름선·윗점·짧은 튐 모두 통과') + ` · 최대 꼭짓점 ${maxApex.toFixed(3)} Hp, 구름 아닌 최대 ${topMax.toFixed(3)} Hp, 가장 짧은 비행 ${f0(shortest)} ms · ${rows.join(' | ')}`);
    }
  }

  // ---------- V17 클리어 연출·시작·두 공 데이터 (결정 D10·D13)
  {
    const err = [];
    const cs = lvl.clear_sequence, CS = bal.clear_sequence;
    const lastLand = Math.max(...lvl.phrases[lvl.phrases.length - 1].landings.map((x) => x.beat));
    const wantOutro = byLv(bal.clear_sequence.outro_beats_by_level, id);
    if (!cs || !L.clear) err.push('clear_sequence 없음');
    else {
      if (cs.big_toss_beat !== lastLand) err.push(`큰 튐 ${cs.big_toss_beat} ≠ 마지막 착지 ${lastLand}`);
      if (lvl.outro_beats !== wantOutro) err.push(`마무리 ${lvl.outro_beats}박 ≠ ${wantOutro}`);
      if (cs.result_beat !== lvl.length_beats) err.push('결과 박 ≠ 끝 박');
      const want = CS.grade_clouds_beats_before_end.map((x) => lvl.length_beats - x);
      if (cs.grade_cloud_beats.join() !== want.join()) err.push(`등급 구름 박 ${cs.grade_cloud_beats} ≠ ${want}`);
      if (!(L.clear.cloudEnterMs < L.clear.gradeCloudMs[0])) err.push(`구름 들어감 ${f0(L.clear.cloudEnterMs)} ≥ 첫 등급 구름 ${f0(L.clear.gradeCloudMs[0])}`);
      if (!(L.clear.apex <= bal.height.apex_budget_play_heights && L.clear.apex > bal.height.cloud_line_ratio)) err.push('큰 튐 꼭짓점이 구름 속이 아님');
      if (cs.big_toss_beat <= C[C.length - 1].beat) err.push('큰 튐이 마지막 접촉보다 이름');
    }
    if (lvl.card && lvl.card.close_to_level_start_ms !== bal.level_start.card_close_to_level_start_ms) err.push('카드 닫기 → 시작 간격 ≠ balance');
    if (lvl.level_select_to_level_start_ms !== bal.level_start.level_select_to_level_start_ms) err.push('레벨 선택 → 시작 간격 ≠ balance');
    const two = lvl.phrases.filter((p) => p.balls === 2);
    for (const p of two) {
      const sb = p.second_ball;
      if (!sb) { err.push(`두 공 구절 ${p.index} second_ball 없음`); continue; }
      const toss2 = p.tosses.find((x) => x.ball === 2).beat, l2 = p.landings.find((x) => x.ball === 2).beat;
      const next = lvl.phrases[p.index + 1];
      if (!(sb.enter_beats[0] >= p.start_beat && sb.enter_beats[1] <= toss2 - 1)) err.push(`공 2 들어옴 ${sb.enter_beats} 이 쉼 밖/토스 1박 전 못 끝남`);
      if (sb.hop_of_d > 0.5 + 1e-9) err.push('깡충 > 0.5d');
      if (sb.exit_beats[0] !== l2) err.push('공 2 나감 ≠ 착지 박');
      const nextToss = next ? next.tosses[0].beat : lvl.length_beats;
      if (!(sb.exit_beats[1] <= nextToss - 1 && sb.ball1_to_center_beats[1] <= nextToss - 1)) err.push(`공 2 나감·공 1 돌아옴이 다음 토스 1박 전에 안 끝남`);
    }
    const txt = L.clear ? `큰 튐 ${lvl.clear_sequence.big_toss_beat}박(마지막 착지) → 구름 들어감 +${((L.clear.cloudEnterMs - L.clear.launch) / 1000).toFixed(2)} s < 첫 등급 구름 +${((L.clear.gradeCloudMs[0] - L.clear.launch) / 1000).toFixed(2)} s · 등급 구름 ${lvl.clear_sequence.grade_cloud_beats.join('·')}박 · 결과 ${lvl.length_beats}박(마무리 ${lvl.outro_beats}박)` : '';
    check(id, 'V17', !err.length, err.length ? err.join(' / ') : `${txt} · 시작 간격 ${bal.level_start.card_close_to_level_start_ms} ms${two.length ? ` · 두 공 구절 ${two.map((p) => `${p.index}: 들어옴 ${p.second_ball.enter_beats.join('~')}박 / 나감 ${p.second_ball.exit_beats.join('~')}박`).join(', ')}` : ''}`);
  }
});

// layout.json 식(art 원본, play_height._def) — tools/art/layout.mjs compute() 와 같은 식을 계수만 읽어 계산
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
  return { d, skinY, Hp };
}

// ---------- 봇
log(`\n== 봇 (σ70·σ50 ${N}회, σ25 ${NSK}회, 세션 ${SESS}, 시드 ${SEED}${QUICK ? ', --quick: 판정 안 함' : ''}) ==`);
log('레벨 | 프로필 | 첫 시도 클리어율 p | 연속 중앙값 | 정수 중앙값(세션) | 90 % | 평균 진행도 | 실패 위치 중앙값(시간) | 이른 실패 비율 | 최다 실패 접촉 몰림');
const B = {};
compiled.forEach((L, k) => {
  const id = L.level.id; B[id] = {};
  for (const [pn, p] of Object.entries(bal.bots.profiles)) {
    const r = runProfile(L, p, bal, { N: pn === 'skilled_sd25' ? NSK : N, sessions: SESS, seed: SEED + 101 * k + pn.length });
    B[id][pn] = r;
    log(`${id} | ${pn} | ${r.clear_rate} | ${r.median_continuous ?? '-'} | ${r.median_sessions} | ${r.p90_sessions} | ${r.mean_progress} % | ${r.median_fail_progress_time ?? '-'} % | ${r.early_fail_share} | ${r.top_fail_contact_share} (접촉 ${r.top_fail_contact}, 실패 ${r.deaths})`);
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
  bchk(id, 'B1', m(id) != null && m(id) <= lim && (id !== '01' || m(id) <= V.l1_sd70_continuous_target), `σ70 연속 중앙값 ${m(id)} ≤ ${lim}${extra} (정수 ${B[id].child_sd70.median_sessions})`);
  const sk = B[id].skilled_sd25, nv = B[id].novice_sd50;
  if (sk.deaths >= 20) bchk(id, 'B3', sk.top_fail_contact_share <= 0.3, `σ25 실패 ${sk.deaths}회, 최다 접촉 ${sk.top_fail_contact} 몰림 ${sk.top_fail_contact_share} ≤ 0.3`);
  else bchk(id, 'B3', nv.top_fail_contact_share <= 0.3, `σ25 실패 ${sk.deaths}회(20 미만) → σ50 실패 ${nv.deaths}회, 최다 접촉 ${nv.top_fail_contact} 몰림 ${nv.top_fail_contact_share} ≤ 0.3`);
  if (k) {
    const a = compiled[k - 1].level.id;
    for (const pn of ['novice_sd50', 'child_sd70']) bchk(id, 'B2', B[id][pn].mean_progress < B[a][pn].mean_progress, `${pn} 평균 진행도 ${a} ${B[a][pn].mean_progress} % > ${id} ${B[id][pn].mean_progress} %`);
    bchk(id, 'B5', m(id) <= V.max_growth_vs_prev * m(a), `σ70 연속 중앙값 ${a} ${m(a)} → ${id} ${m(id)} (${(m(id) / m(a)).toFixed(2)}배 ≤ ${V.max_growth_vs_prev})`);
  }
});
bchk('01', 'B4', B['01'].child_sd70.median_fail_progress_time >= 10, `L1 σ70 실패 위치 중앙값(레벨 시간) ${B['01'].child_sd70.median_fail_progress_time} % ≥ 10 % (접촉 기준 ${B['01'].child_sd70.median_fail_progress} %)`);

// B6·B7·B8
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
  report.l10_target = { m01: m1, m02: m2, m03: m3, r: +r.toFixed(4), T: +T.toFixed(2), range: [+lo.toFixed(2), +hi.toFixed(2)], L10: m10, integer_reference: { m01: im(b1), m02: im(b2), m03: im(b3), r: +ir.toFixed(3), T: +iT.toFixed(2), L10: im(R.apply_to_level) } };
  log(`\n== 레벨 10 목표 (연속 중앙값) ==\n  r = (m~3/m~1)^(1/2) = (${m3}/${m1})^(1/2) = ${r.toFixed(4)} (단계 배율 ${(m2 / m1).toFixed(3)}·${(m3 / m2).toFixed(3)}) · T = m~3·r^3 = ${T.toFixed(2)} · 범위 ${lo.toFixed(2)} ~ ${hi.toFixed(2)}`);
  log(`  참고(판정 안 함) 정수 중앙값 L1~L3 ${im(b1)}/${im(b2)}/${im(b3)} → r ${ir.toFixed(3)} · T ${iT.toFixed(2)} · L10 ${im(R.apply_to_level)}`);
  bchk('10', 'B6', m10 >= lo && m10 <= hi, `L10 σ70 연속 중앙값 ${m10} ∈ [${lo.toFixed(2)}, ${hi.toFixed(2)}] (T ${T.toFixed(2)} 대비 ${(100 * (m10 / T - 1)).toFixed(1)} %)`);
  const seq = R.monotone_levels.map((id) => [id, m(id)]);
  const bad = [];
  for (let k = 1; k < seq.length; k++) if (!(seq[k][1] > seq[k - 1][1])) bad.push(`${seq[k - 1][0]}→${seq[k][0]}`);
  const inside = seq.slice(0, -1).every(([, x]) => x < hi);
  bchk('10', 'B7', !bad.length && inside, `${seq.map(([id, x]) => `L${+id} ${x}`).join(' < ')} → ${bad.length ? `단조 아님 ${bad}` : '엄격 단조'} · L3~L9 < ${hi.toFixed(2)} ${inside ? '예' : '아님(!)'}`);
  const cap = m1 * r ** 5;
  bchk('03', 'B8', r >= V.r_range[0] && r <= V.r_range[1] && cap <= V.r_cap_m1_r5, `L1~L3 배율 r ${r.toFixed(3)} ∈ [${V.r_range.join(', ')}] · m~1·r^5 = ${cap.toFixed(2)} ≤ ${V.r_cap_m1_r5}`);
  // 기준선(정보): L3 와 T 사이 등비
  const g = (T / m3) ** (1 / 7);
  info('곡선', `L3~L10 등비 기준선(배율 ${g.toFixed(3)}): ${[3, 4, 5, 6, 7, 8, 9, 10].map((k) => `L${k} ${(m3 * g ** (k - 3)).toFixed(2)}`).join(' · ')}`);
  report.baseline = Object.fromEntries([3, 4, 5, 6, 7, 8, 9, 10].map((k) => [String(k).padStart(2, '0'), +(m3 * g ** (k - 3)).toFixed(2)]));
}

// K2
log('\n== K2 높이 읽기 손해 모델 (σ70 + 짧아짐·반박·두 공 σ 배수, 첫 등장 놓침 +5 %p) ==');
{
  const ids = compiled.map((L) => L.level.id);
  const row = ids.map((id) => `L${+id} ${B[id].k2.median_continuous} (${(B[id].k2.median_continuous / m(id)).toFixed(2)}배)`);
  log('  ' + row.join(' · '));
  const over = ids.filter((id) => !(B[id].k2.median_continuous <= V.sd70_continuous_max));
  const grow = ids.slice(1).filter((id, k) => B[id].k2.median_continuous > V.max_growth_vs_prev * B[ids[k]].k2.median_continuous);
  bchk('all', 'K2', !over.length && !grow.length, `손해 모델 봇: 30회 초과 ${over.join(',') || '없음'}, 직전 2배 초과 ${grow.join(',') || '없음'} (최대 L${+ids[ids.length - 1]} ${B[ids[ids.length - 1]].k2.median_continuous})`);
}

// K3
log('\n== K3 소리 따라 치는 아이 × 블루투스 남은 지연 (σ70 연속 중앙값, 화면 판정) ==');
{
  const sf = bal.bots.sound_follow;
  const show = ['01', '05', '10'];
  report.k3 = {};
  // 구조 확인: 판정 입력은 탭 시각(화면 시계)뿐. 오디오 지연은 tapToLevelMs 에 들어가지 않음
  const t1 = tapToLevelMs(5000, 1000, bal), t2 = tapToLevelMs(5000, 1000, { ...bal, audio_latency_ms: 220 });
  const L1 = compiled[0];
  const w0 = runProfile(L1, bal.bots.profiles.child_sd70, bal, { N, sessions: 10, seed: SEED + 101 * 0 + 'child_sd70'.length, bias: 0 * 170 });
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
  const g = show.map((id) => {
    const L = compiled.find((x) => x.level.id === id);
    // 보호자 보정 뒤: 곡이 화면에 맞춰져 남은 오차 ±30 ms(균등) → 대표값 +30 으로 봄
    return runProfile(L, bal.bots.profiles.child_sd70, bal, { N: N / 4, sessions: 10, seed: SEED + 91, bias: 30 }).median_continuous;
  });
  log(`보호자 보정 뒤(남은 +30 ms, w=1): ${show.map((id, k) => `L${+id} ${g[k]}`).join(' · ')}`);
  check('all', 'K3', bal.judge_clock.audio_used_for_judge === false && t1 === t2 && same, `판정 입력 = 탭 시각(화면 시계, visual_comp ${bal.judge_clock.visual_comp_ms} ms 한 번) · 오디오 지연이 판정에 안 들어감 ${t1 === t2 ? '예' : '아님'} · 공을 보고 치는 아이(w=0)는 블루투스와 무관하게 L1 p ${w0.clear_rate} = 기본 ${B['01'].child_sd70.clear_rate}`);
}

// 정보 K3d: 밀림 감지(balance.json drift_check) — 8탭 창 중앙값 ≥ +기준이 2창 연속일 확률(σ70 정규 탭, 창 2개 = 탭 16개)
{
  const D = bal.drift_check;
  const rng = (() => { let x = SEED; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
  const g = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const med = (a) => { const q = [...a].sort((x, y) => x - y), n = q.length; return n % 2 ? q[(n - 1) / 2] : (q[n / 2 - 1] + q[n / 2]) / 2; };
  const rate = (bias, n = QUICK ? 4000 : 40000) => { let k = 0; for (let i = 0; i < n; i++) { let ok = true; for (let w = 0; w < D.consecutive_windows; w++) { const a = []; for (let j = 0; j < D.window_taps; j++) a.push(bias + 70 * g()); if (med(a) < D.trigger_median_late_ms) { ok = false; break; } } if (ok) k++; } return k / n; };
  const rows = [[0, '공을 봄(w=0)'], [0.5 * 120, 'w=0.5·d=120'], [0.5 * 170, 'w=0.5·d=170'], [120, 'w=1·d=120'], [170, 'w=1·d=170']].map(([b, nm]) => `${nm} ${(100 * rate(b)).toFixed(2)} %`);
  log(`\n== 정보 K3d 밀림 감지(${D.window_taps}탭 중앙값 ≥ +${D.trigger_median_late_ms} ms 가 ${D.consecutive_windows}창 연속, σ70) 켜질 확률(탭 16개 기준) ==\n  ${rows.join(' · ')}`);
}

// 정보: 따라 치는 아이, 연습 모드, 해석
log('\n== 정보: 따라 치는 아이(받침 쉼 \'콩\' 30 %·토스 50 %·착지 50 % 따라 침) σ70 연속 중앙값 / 연습 모드(받침 쉼 체크포인트) 총 시도 중앙값 / 해석 예측(헛탭 무시) ==');
report.info = {};
compiled.forEach((L, k) => {
  const id = L.level.id, j = L.judge;
  const al = runProfile(L, bal.bots.profiles.child_sd70, bal, { N: N / 4, sessions: 10, seed: SEED + 333 + k, along: bal.bots.along });
  const pr = runPractice(L, bal.bots.profiles.child_sd70, bal, { sessions: QUICK ? 100 : 500, seed: SEED + 444 + k });
  const an = analyticClear({ contacts: L.contacts.length, early: j.pass_early_ms, late: j.pass_late_ms, sd: 70, miss: 0.03 });
  report.info[id] = { along: al.median_continuous, practice_median: pr.median_total_attempts, analytic: an.median_continuous };
  log(`  L${+id}: 따라 치기 ${al.median_continuous} (기본 ${m(id)}) · 연습 모드 구절 ${pr.segments}개 총 ${pr.median_total_attempts}회(90 % ${pr.p90_total_attempts}) · 해석 ${an.median_continuous} (접촉 하나 ${an.per_contact})`);
});

// 요약 표
log('\n== 곡선 요약 ==');
log('레벨 | BPM | 길이 s | 접촉 | 통과 창 | 새 기믹 | σ25 연속 | σ50 연속 | σ70 p | σ70 연속 | σ70 정수 | 직전 대비 | K2 연속 | 기준선');
compiled.forEach((L, k) => {
  const id = L.level.id, b = B[id];
  const prev = k ? m(compiled[k - 1].level.id) : null;
  log(`${id} | ${L.level.bpm} | ${(L.durationMs / 1000).toFixed(1)} | ${L.contacts.length} | -${L.judge.pass_early_ms}/+${L.judge.pass_late_ms} | ${L.level.new_gimmick?.id || '-'} | ${b.skilled_sd25.median_continuous ?? '-'} | ${b.novice_sd50.median_continuous} | ${b.child_sd70.clear_rate} | ${m(id)} | ${b.child_sd70.median_sessions} | ${prev ? (m(id) / prev).toFixed(3) + '배' : '-'} | ${b.k2.median_continuous} | ${report.baseline?.[id] ?? '-'}`);
});

const total = report.checks.length, passN = report.checks.filter((c) => c.ok).length;
report.summary = { total, pass: passN, fail: total - passN };
if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
else {
  log(`\n검사 ${total}개 중 PASS ${passN}, FAIL ${total - passN}${QUICK ? ' (--quick: B·K2 검사는 정보로만 출력, 판정은 전체 실행)' : ''}`);
  if (report.fails.length) { log('FAIL 목록'); for (const f of report.fails) log('  ' + f); }
  log(report.fails.length ? 'FAIL' : 'ALL PASS');
}
process.exit(report.fails.length ? 1 : 0);
