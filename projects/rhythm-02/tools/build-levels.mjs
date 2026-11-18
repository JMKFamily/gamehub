#!/usr/bin/env node
// rhythm-02 레벨 데이터 생성기 (round-2 스키마 v2 "흘러오는 길"): 아래 DESIGNS(구절 설계)를 접촉·세상 물체 목록으로 펼쳐 levels/NN-levelN.json 에 쓴다.
// 레벨 파일이 빌드·검증기가 읽는 원본이고, 이 파일은 그것을 만드는 설계 기록이다(스키마는 20-balance.md 7절).
//
// 구절(phrase) = 받침 쉼(공이 북 위에 앉아 박마다 까딱 + '콩') → 자동 토스(마디 첫 박) → 토큰들 → 착지(다음 받침 쉼 시작)
//   seq 토큰
//     숫자 g     hit 접촉: 앞 사건(토스·hit 접촉)에서 g 박 뒤. 4 → 구름 물체, 3 → 큰 언덕 물체, 0.5 두 개 → 낮은 가지(W5), 0.5 네 개 → 긴 가지(W7)
//     Xs         nogo 접촉(지붕 밑 착지): 앞 hit 접촉에서 1박 뒤 착지 → s 박 앉아 쉼(지붕이 [착지 − 0.6, 착지 + s − 1] 박 동안 북을 덮음) → 착지 + s 박에 자동 토스.
//                그다음 숫자는 그 토스에서 잼. 지붕 밑 쉼 박의 '콩'은 착지 + 2 박부터(착지 ±1박 안 소리 없음, S9)
//   쉼은 토스가 마디 첫 박에 오도록 최소값에서 늘린다. 마지막 착지 뒤 outro 박(클리어 연출) 뒤 끝.
//   무늬 되풀이 전략(round-1 1절 3)은 폐기: 레벨 안에서 같은 위험 덩어리를 되풀이하지 않고(V-R1~R6), 시도 사이에는 데이터 고정(V-R7).
//
// 사용: node tools/build-levels.mjs   (levels/ 10개를 다시 씀)

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BAL = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const BOUNCE = { 0.5: 'half', 1: 'tong', 1.5: 'dot', 2: 'big', 3: 'three', 4: 'cloud' };
const GIM = { half: 'W5', tong: 'W0', dot: 'W3', big: 'W1', three: 'W6', cloud: 'W2' };
const OB = BAL.objects;

// 판정 창(20-balance 4-1·19절). 2026-11-17 12세 재조정(결정 14, 대표 봇 σ50): 통과 창 L1 −125/+145 → L7~L10 −110/+130 으로 좁히고, 접촉 수를 27~53 hit 로 늘림(L1~L3 곡선 r ≈ 1.37 을 σ50 으로 다시 맞춤).
// 통과 폭은 직전의 94 % 이상, 늦은 쪽 +20 ms, 이른 쪽 끝 ≥ 좋아 경계 + 20 ms(통과 5칸 유지). 딱 ±50·좋아 ±100/±90 은 공통 문서 그대로.
const J = (early, late, good) => ({ perfect_ms: 50, good_ms: good, pass_early_ms: early, pass_late_ms: late, miss_zone_ms: 200 });

export const DESIGNS = [
  {
    id: '01', bpm: 100, judge: J(125, 145, 100), gimmick: 'W0', outro: 4,
    intent: '1박 통만. 길 위 표시가 북에 오면 톡. 구절마다 접촉 수를 7·6·7·7로 바꿔 쉼 길이가 달라짐(4~5박, 12세 재조정: 18 → 27 접촉). 박마다 치면 깨지는 "박 배우기" 레벨.',
    phrases: [
      { rest: 4, seq: '1 1 1 1 1 1 1' },
      { rest: 4, seq: '1 1 1 1 1 1' },
      { rest: 4, seq: '1 1 1 1 1 1 1' },
      { rest: 4, seq: '1 1 1 1 1 1 1' },
    ],
    finger: { contact_index: 0, press_start_beats: -0.2, press_end_beats: 0 },
  },
  {
    id: '02', bpm: 104, judge: J(122, 142, 100), gimmick: 'W1', outro: 4,
    intent: '넓은 간격(큰 통 2박) 도입. 첫 넓은 간격은 받침 쉼 바로 뒤(표시가 쉼 동안 보임). 덩어리 셋(한 칸 / 두 칸 연속 / 세 칸 연속)이 이어서 같은 것이 오지 않음.',
    phrases: [
      { rest: 4, seq: '1 1 2 1 1 1 1 1 1 1 1' },
      { rest: 4, seq: '1 2 2 1 1 1 2 1 2 1 1 1' },
      { rest: 4, seq: '1 1 2 2 2 1 1 1 1 1 1 1' },
    ],
  },
  {
    id: '03', bpm: 108, judge: J(120, 140, 100), gimmick: 'W2', outro: 4,
    intent: '구름 물체(구름 통 4박) 도입. 첫 구름은 토스로(받침 쉼 동안 구름이 다가옴). 구름 앞뒤 모양을 구절마다 바꿈.',
    phrases: [
      { rest: 4, seq: '4 1 1 1 2 1 1 1 1 1 1 1 1' },
      { rest: 4, seq: '1 2 1 4 1 1 2 2 1 1 1 1 1 1' },
      { rest: 4, seq: '1 1 1 4 2 1 1 2 4 1 1 1 1 1 1 1' },
    ],
  },
  {
    id: '04', bpm: 110, judge: J(116, 136, 90), gimmick: 'W3', outro: 4,
    intent: '엇간격(점 통 1.5·1.5·1) 도입. 짝수 박에서 시작하는 3+3+2. 점 통 앞뒤에 오는 모양(통·구름·넓은 간격)을 덩어리마다 바꿈.',
    phrases: [
      { rest: 4, seq: '1.5 1.5 1 1 1 1 1 1 1 1 1' },
      { rest: 4, seq: '4 1.5 1.5 1 2 1 1 1 1 1 1 1 1 1' },
      { rest: 4, seq: '2 1 1 2 1.5 1.5 1 2 1 1 1.5 1.5 1 4 1 1 1 1' },
    ],
  },
  {
    id: '05', bpm: 112, judge: J(114, 134, 90), gimmick: 'W4', outro: 4,
    intent: '지붕(치지 마) 도입: 첫 지붕은 받침 쉼 바로 뒤(지붕이 다가오는 동안 공은 앉아 있음). 지붕 앞뒤는 1박 통 2개씩. 지붕 2개의 쉼 길이를 다르게(X2·X3).',
    phrases: [
      { rest: 4, seq: '1 1 X2 1 1 1 1 1 1 1 1 1 1' },
      { rest: 4, seq: '2 1.5 1.5 1 1 X3 1 1 2 2 1 1 1 1.5 1.5 1 1' },
      { rest: 4, seq: '4 1 1 2 1 2 1 1 1 1 4 1 1 1 1' },
    ],
  },
  {
    id: '06', bpm: 114, judge: J(112, 132, 90), gimmick: 'W5', outro: 4,
    intent: '낮은 가지(통통 반박 짝) 도입: 첫 가지는 받침 쉼 뒤(가지가 다가오는 동안 공은 앉아 있음), 큰 통 바로 다음. 지붕(참기)과 가지(빨리 두 번)는 다른 레벨에서 처음 나옴.',
    phrases: [
      { rest: 4, seq: '1 1 X3 1 1 1.5 1.5 1 1 1 1 1 1 1' },
      { rest: 4, seq: '1 2 .5 .5 1 1 1 1 1 1 1 1 1 1 1' },
      { rest: 4, seq: '1 1 X2 1 1 .5 .5 1 1 4 1 1 1 2 1 1 1 1' },
    ],
  },
  {
    id: '07', bpm: 116, judge: J(110, 130, 90), gimmick: 'W6', outro: 4,
    intent: '큰 언덕(세 박 통 3박) 도입: 첫 언덕은 토스로. "셋까지 세기"를 짧은 모양과 섞음.',
    phrases: [
      { rest: 4, seq: '3 1 1 X2 1 1 1 1 1 1 1 1' },
      { rest: 4, seq: '2 .5 .5 1 1 1 1 2 2 1 3 1 1 1 1' },
      { rest: 4, seq: '2 1.5 1.5 1 3 1 1 X3 1 1 1 4 1 1 1 1 1 1 1 1' },
    ],
  },
  {
    id: '08', bpm: 118, judge: J(110, 130, 90), gimmick: 'W7', outro: 4,
    intent: '긴 가지(드르륵 반박 4) 도입: 첫 긴 가지는 둘째 구절 받침 쉼 뒤 큰 통 토스 바로 다음(가지가 다가오는 동안 공은 앉아 있음), 뒤는 1박 통. 첫 구절은 구름·지붕으로 몸 풀기.',
    phrases: [
      { rest: 4, seq: '4 1 1 X2 1 1 1 1 1 1 1 1 1' },
      { rest: 4, seq: '2 .5 .5 .5 .5 1 1 1 1 1 1 1 1 1 1 1' },
      { rest: 4, seq: '1.5 1.5 1 2 1 1 X3 1 1 3 1 1 2 1 .5 .5 1 1 1 1' },
    ],
  },
  {
    id: '09', bpm: 120, judge: J(110, 130, 90), gimmick: null, outro: 4,
    intent: '새 기믹 없음: 배운 모양을 섞은 조합. 덩어리 여섯 이상이 모두 다르고, 지붕 쉼 길이 셋(X2·X3·X4).',
    phrases: [
      { rest: 4, seq: '2 1 1 X3 1 1 1 1 1 1 1.5 1.5 1 1' },
      { rest: 4, seq: '3 2 1 1 1 1 X2 1 1 4 1 1 1 1 .5 .5 1 1 1' },
      { rest: 4, seq: '4 .5 .5 1 1 X4 1 1 1.5 1.5 1 .5 .5 .5 .5 1 1 1 1 1' },
    ],
  },
  {
    id: '10', bpm: 122, judge: J(110, 130, 90), gimmick: null, outro: 8,
    intent: '새 기믹 없음: 마지막 조합. 끝은 받침 쉼 뒤 1박 통 4번으로 레벨 1 동기를 되부름(클리어 직전 억울한 실패 없음).',
    phrases: [
      { rest: 4, seq: '1 1 X4 1 1 3 1 1 1.5 1.5 1 1 1 1 1 1' },
      { rest: 4, seq: '1.5 1.5 1 4 1 1 X3 1 1 2 2 1 1 1.5 1.5 1 1 1 1 1' },
      { rest: 4, seq: '1 .5 .5 .5 .5 1 1 1 X2 1 1 3 2 1 .5 .5 1 1 1 1' },
    ],
  },
];

function clearSeq(lastLanding, end) {
  const C = BAL.clear_sequence;
  return {
    big_toss_beat: lastLanding, big_toss_flight_s: C.big_toss_flight_s, big_toss_apex_play_heights: C.big_toss_apex_play_heights,
    after_apex: C.after_apex, grade_cloud_beats: C.grade_clouds_beats_before_end.map((x) => end - x), result_beat: end, result_buttons_after_ms: C.result_buttons_after_ms,
    scroll_stop_beat: lastLanding + C.scroll_stop_beats_after_big_toss,
  };
}

const r3 = (x) => +x.toFixed(3);

export function buildLevel(d) {
  const contacts = [], phrases = [], objects = [];
  let beat = 0;
  d.phrases.forEach((p, pi) => {
    let rest = p.rest;
    while ((beat + rest) % 4 !== 0) rest++;
    const toss = beat + rest;
    const ph = { index: pi, start_beat: beat, rest_beats: rest, balls: 1, checkpoint: true, tosses: [], landings: [], roof_sits: [], contact_range: [contacts.length, null] };
    ph.tosses.push({ ball: 1, beat: toss, to_contact: contacts.length });
    let t = toss;
    let prevHitBeat = null; // 앞 hit 접촉 박(nogo 앞 확인용)
    const toks = p.seq.trim().split(/\s+/);
    for (let k = 0; k < toks.length; k++) {
      const tk = toks[k];
      if (/^X\d$/.test(tk)) {
        const s = +tk.slice(1);
        if (prevHitBeat == null || t !== prevHitBeat) throw new Error(`${d.id} 구절 ${pi}: 지붕 앞이 hit 접촉이 아님`);
        const land = t + 1;
        const ci = contacts.length;
        contacts.push({ beat: land, kind: 'nogo', ball: 1, gap_beats: 1, bounce: 'roof', gimmick: 'W4', phrase: pi });
        const tossB = land + s;
        const roofIn = r3(land - OB.roof.cover_pre_beats), roofOut = tossB - 1;
        const bobs = []; for (let b = land + 2; b < tossB; b++) bobs.push(b);
        ph.roof_sits.push({ contact: ci, beat: land, toss_beat: tossB, roof_in_beat: roofIn, roof_out_beat: roofOut, bob_beats: bobs, sit_beats: s });
        ph.tosses.push({ ball: 1, beat: tossB, to_contact: ci + 1, after_roof: true });
        objects.push({ type: 'roof', beat_in: roofIn, beat_out: roofOut, contacts: [ci], under_of_Hp: OB.roof.under_of_Hp, sit_beats: s });
        t = tossB;
        prevHitBeat = null;
        continue;
      }
      const g = +tk;
      if (!BOUNCE[g]) throw new Error(`${d.id} 토큰 ${tk}`);
      t += g;
      contacts.push({ beat: t, kind: 'hit', ball: 1, gap_beats: g, bounce: BOUNCE[g], phrase: pi });
      prevHitBeat = t;
    }
    if (contacts[contacts.length - 1].kind !== 'hit') throw new Error(`${d.id} 구절 ${pi}: 마지막이 지붕`);
    const landB = t + 1;
    ph.landings.push({ ball: 1, from_contact: contacts.length - 1, beat: landB, exit: false });
    beat = landB;
    ph.contact_range[1] = contacts.length - 1;
    phrases.push(ph);
  });
  // 기믹 태그·물체
  contacts.forEach((c, i) => { c.i = i; if (c.kind === 'hit') c.gimmick = GIM[c.bounce]; });
  const prevEventBeat = (i) => { // (round-2 1-1 가지 시작 자리, R2-D9 뒤로는 쓰지 않음)
    const c = contacts[i];
    const ph = phrases[c.phrase];
    const ts = ph.tosses.find((x) => x.to_contact === i);
    return ts ? ts.beat : contacts[i - 1].beat;
  };
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    if (c.kind !== 'hit' || c.bounce !== 'half') continue;
    let k = i; while (k < contacts.length && contacts[k].kind === 'hit' && contacts[k].bounce === 'half' && contacts[k].phrase === c.phrase) k++;
    const len = k - i;
    const g = len >= 4 ? 'W7' : 'W5';
    for (let m = i; m < k; m++) contacts[m].gimmick = g;
    // R2-D9: 가지 x 구간 = [첫 반박 접촉 − cover_pre, 마지막 반박 접촉 + cover_post] — 가지 밑 표시 수 = 2/4(카드 톡톡·톡톡톡톡), 들어가는 표시(앞 접촉)는 가지 밖
    objects.push({ type: 'branch', beat_in: r3(contacts[i].beat - OB.branch.cover_pre_beats), beat_out: r3(contacts[k - 1].beat + OB.branch.cover_post_beats), contacts: Array.from({ length: len }, (_, m) => i + m), under_of_Hp: OB.branch.under_of_Hp, long: len >= 4 });
    i = k - 1;
  }
  for (const c of contacts) {
    if (c.kind !== 'hit') continue;
    if (c.bounce === 'cloud') objects.push({ type: 'cloud', beat_in: c.beat - 3, beat_out: c.beat - 1, contacts: [c.i], bottom_of_Hp: OB.cloud.bottom_of_Hp });
    if (c.bounce === 'three') objects.push({ type: 'hill', beat_in: r3(c.beat - 2.25), beat_out: r3(c.beat - 0.75), contacts: [c.i], top_of_Hp: OB.hill.top_of_Hp, layer: OB.hill.layer });
  }
  // 박 표시(hit 접촉마다). next_beats = 그 접촉에서 친 공이 다음 사건까지 가는 길이(다음 높이, art 가 표시 크기에 쓸지 결정)
  for (const c of contacts) {
    if (c.kind !== 'hit') continue;
    const n = contacts[c.i + 1];
    const ph = phrases[c.phrase];
    const next = n && n.phrase === c.phrase ? n.beat - c.beat : ph.landings[0].beat - c.beat;
    objects.push({ type: 'mark', beat_in: c.beat, beat_out: c.beat, contacts: [c.i], next_beats: next });
  }
  const length = beat + d.outro;
  const cs = clearSeq(beat, length);
  const [cc0, cc1] = BAL.clear_sequence.clear_cloud_beats_after_big_toss;
  objects.push({ type: 'cloud', role: 'clear', beat_in: beat + cc0, beat_out: beat + cc1, contacts: [], bottom_of_Hp: OB.cloud.bottom_of_Hp });
  objects.sort((a, b) => a.beat_in - b.beat_in || a.type.localeCompare(b.type));
  objects.forEach((o, k) => (o.id = k));
  for (const o of objects) for (const ci of o.contacts) if (o.type !== 'mark') contacts[ci].object = o.id;
  // 새 기믹 첫 등장 접촉 2개 표시(K2 손해 모델·V7)
  if (d.gimmick && d.gimmick !== 'W0') contacts.filter((c) => c.gimmick === d.gimmick).slice(0, 2).forEach((c) => (c.first_of_gimmick = true));
  const n = +d.id;
  const ahead = BAL.scroll.ahead_beats_by_level[d.id] ?? BAL.scroll.ahead_beats_by_level.default;
  const gm = d.gimmick ? BAL.gimmicks[d.gimmick] : null;
  return {
    schema_version: 2,
    id: d.id,
    theme_id: `level${d.id}`,
    name_key: `level${n}_name`,
    bpm: d.bpm,
    beats_per_bar: 4,
    judge: d.judge,
    scroll: { drum_x_ratio: BAL.scroll.drum_x_ratio, ahead_beats: ahead, speed: 'constant_in_level' },
    design_intent: d.intent,
    new_gimmick: d.gimmick ? { id: d.gimmick, first_contact: contacts.findIndex((c) => c.gimmick === d.gimmick) } : null,
    card: gm ? { id: gm.card, timing: 'pre_level_first_play', close_to_level_start_ms: BAL.level_start.card_close_to_level_start_ms } : null,
    level_select_to_level_start_ms: BAL.level_start.level_select_to_level_start_ms,
    tutorial_finger: d.finger || null,
    length_beats: length,
    outro_beats: d.outro,
    duration_s: +(length * 60 / d.bpm).toFixed(3),
    contact_count: contacts.length,
    hit_count: contacts.filter((c) => c.kind === 'hit').length,
    nogo_count: contacts.filter((c) => c.kind === 'nogo').length,
    clear_sequence: cs,
    phrases,
    contacts,
    objects,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).replace(/\\/g, '/').toLowerCase() === resolve(process.argv[1]).replace(/\\/g, '/').toLowerCase();
if (isMain) {
  mkdirSync(join(PROJECT, 'levels'), { recursive: true });
  for (const d of DESIGNS) {
    const lvl = buildLevel(d);
    const f = join(PROJECT, 'levels', `${d.id}-level${+d.id}.json`);
    writeFileSync(f, JSON.stringify(lvl, null, 1) + '\n');
    console.log(`${f}  접촉 ${lvl.contact_count}(hit ${lvl.hit_count}·nogo ${lvl.nogo_count}) · ${lvl.duration_s} s`);
  }
}
