#!/usr/bin/env node
// rhythm-02 레벨 데이터 생성기: 아래 DESIGNS(구절 설계)를 접촉 목록으로 펼쳐 levels/NN-levelN.json 에 쓴다.
// 레벨 파일이 빌드·검증기가 읽는 원본이고, 이 파일은 그것을 만드는 설계 기록이다(스키마는 20-balance.md 7절).
//
// 구절(phrase) = 받침 쉼(공이 북 위에 앉아 박마다 까딱 + '콩') → 자동 토스 → 접촉들 → 착지(다음 받침 쉼 시작)
//   { rest: 최소 쉼 박 수, seq: '비행 길이(박) 나열', land: 마지막 접촉 → 착지 박 }
//     seq 첫 값 = 토스 → 첫 접촉, 그다음 값 = 접촉에서 쳐 올린 공이 다음 접촉까지 가는 길이(= 그 접촉의 다음 높이)
//   { rest, two: n, land: 2 }  두 공 구절: 공2가 쉼 첫 박에 굴러 들어와 깡충 앉음 → 공1 토스(2박) → 1박 뒤 공2 토스(2박) → 두 공이 번갈아 2박씩,
//                               접촉 n개(짝수), 공2는 착지 뒤 굴러 나감(second_ball 박, balance.json rest.second_ball)
//   쉼은 토스가 마디 첫 박에 오도록 최소값에서 늘린다(곡과 맞춤). 마지막 착지 뒤 outro 박(클리어 연출, clear_sequence) 뒤 끝.
//
// 사용: node tools/build-levels.mjs   (levels/ 10개를 다시 씀)

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BAL = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const BOUNCE = { 0.5: 'half', 1: 'tong', 1.5: 'dot', 2: 'big', 3: 'three', 4: 'cloud' };
const GIM = { half: 'G4', tong: 'B1', dot: 'G3', big: 'G1', three: 'R1', cloud: 'G2' };

// 판정 창(20-balance 4-2). 통과 폭은 직전의 94 % 이상, 늦은 쪽 +20 ms.
const J = (early, late, good) => ({ perfect_ms: 50, good_ms: good, pass_early_ms: early, pass_late_ms: late, miss_zone_ms: 200 });

export const DESIGNS = [
  {
    id: '01', bpm: 100, judge: J(150, 170, 100), gimmick: { id: 'B1', card: 'card_bounce' }, outro: 4,
    intent: '1박 통만. 공이 북에 닿는 순간 톡. 5·5·4·4번 묶음 사이에 받침 쉼(1마디 남짓, 숨 고르기). 박마다 치면 깨지는 "박 배우기" 레벨.',
    phrases: [
      { rest: 4, seq: '1 1 1 1 1', land: 1 },
      { rest: 4, seq: '1 1 1 1 1', land: 1 },
      { rest: 4, seq: '1 1 1 1', land: 1 },
      { rest: 4, seq: '1 1 1 1', land: 1 },
    ],
    finger: { contact_index: 0, press_start_beats: -0.2, press_end_beats: 0 },
  },
  {
    id: '02', bpm: 104, judge: J(145, 165, 100), gimmick: { id: 'G1', card: 'card_big' }, outro: 4,
    intent: '큰 통(2박) 도입. 무늬 "통 통 큰통—"과 "큰통— 큰통— 통 통"을 되풀이해 높이(길게/짧게)로 외움. 큰 통 중간 박 탭은 무시.',
    phrases: [
      { rest: 4, seq: '1 1 1 2 2 1 1', land: 1 },
      { rest: 4, seq: '1 1 2 2 1 1 1 1', land: 1 },
      { rest: 4, seq: '2 2 1 1 1 1', land: 1 },
    ],
  },
  {
    id: '03', bpm: 108, judge: J(140, 160, 100), gimmick: { id: 'G2', card: 'card_cloud' }, outro: 4,
    intent: '구름 통(4박) 도입. 첫 구름은 받침 쉼 바로 뒤 토스로(게임이 구름까지 던짐). 무늬 "통 통 큰통— 구름————".',
    phrases: [
      { rest: 4, seq: '1 1 1 2 1 1 2', land: 1 },
      { rest: 4, seq: '4 1 1 2 1 1', land: 1 },
      { rest: 4, seq: '1 1 2 4 1 1', land: 1 },
      { rest: 4, seq: '2 2 1 1 1 1', land: 1 },
    ],
  },
  {
    id: '04', bpm: 110, judge: J(135, 155, 90), gimmick: { id: 'G3', card: 'card_dot' }, outro: 4,
    intent: '점 통(1.5박) 도입: 늘 "점 통·점 통·통"(3+3+2) 묶음으로 마디 첫 박에서 시작해 다음 마디 첫 박으로 돌아옴. 박마다 치기가 처음으로 실패.',
    phrases: [
      { rest: 4, seq: '1 1 1 1 1.5 1.5 1', land: 1 },
      { rest: 4, seq: '1 1 1 1 1.5 1.5 1 2 2', land: 1 },
      { rest: 4, seq: '2 2 1.5 1.5 1 1 1 1 1', land: 1 },
    ],
  },
  {
    id: '05', bpm: 112, judge: J(130, 150, 90), gimmick: { id: 'G4', card: 'card_double' }, outro: 4,
    intent: '통통(반박 두 번) 도입: 늘 큰 통 뒤에 짝으로만. 첫 통통은 받침 쉼 뒤 큰 통 토스 바로 다음. 무늬 "큰통— 통통 통".',
    phrases: [
      { rest: 4, seq: '1 1 1 1 1.5 1.5 1', land: 1 },
      { rest: 4, seq: '2 0.5 0.5 1 1 1 2 1 1', land: 1 },
      { rest: 4, seq: '1 1 2 0.5 0.5 1 1 1 1', land: 1 },
    ],
  },
  {
    id: '06', bpm: 114, judge: J(130, 150, 90), gimmick: { id: 'G5', card: 'card_twoballs' }, outro: 4,
    intent: '두 공 도입: 공 하나가 더 들어와 두 공이 1박씩 엇갈려 각자 2박으로 튐(하나 올라갈 때 하나 내려옴, 줄지어 내려오지 않음). 두 공 구절은 한 곳만.',
    phrases: [
      { rest: 4, seq: '1 1 2 1.5 1.5 1 1 1 1', land: 1 },
      { rest: 4, two: 6, land: 2 },
      { rest: 4, seq: '1 1 1 1 1.5 1.5 1 1 1 1 1', land: 1 },
    ],
  },
  {
    id: '07', bpm: 116, judge: J(125, 145, 90), gimmick: { id: 'R1', card: 'card_three' }, outro: 4,
    intent: '세 박 통(3박) 도입(빠른 곡 구간 G6 대신, 위험 K8). 첫 세 박 통은 받침 쉼 뒤 토스. 무늬 "세박——— 통 큰통—".',
    phrases: [
      { rest: 4, seq: '1 1 1 1 1.5 1.5 1 2', land: 1 },
      { rest: 4, seq: '3 1 2 2 0.5 0.5 1 1 1', land: 1 },
      { rest: 4, seq: '3 1 1.5 1.5 1 1 1 1 1', land: 1 },
    ],
  },
  {
    id: '08', bpm: 118, judge: J(120, 140, 90), gimmick: { id: 'G7', card: 'card_roll' }, outro: 4,
    intent: '드르륵(반박 4번) 도입: 큰 통 토스 뒤 단독으로 처음. 통통 짝도 계속.',
    phrases: [
      { rest: 4, seq: '1 1 1 1 1.5 1.5 1 1', land: 1 },
      { rest: 4, seq: '2 0.5 0.5 0.5 0.5 1 1 2', land: 1 },
      { rest: 4, seq: '1 1 2 0.5 0.5 1 1 1 1', land: 1 },
    ],
  },
  {
    id: '09', bpm: 120, judge: J(120, 140, 90), gimmick: null, outro: 4,
    intent: '새 기믹 없음: 배운 통을 섞은 조합. 어려운 자리(통통·점 통)를 여러 구절에 나눔.',
    phrases: [
      { rest: 4, seq: '1 1 1 1 1.5 1.5 1 2 2 0.5 0.5 1', land: 1 },
      { rest: 4, two: 4, land: 2 },
      { rest: 4, seq: '3 1 1.5 1.5 1 1 1 1 1 1', land: 1 },
    ],
  },
  {
    id: '10', bpm: 122, judge: J(115, 135, 90), gimmick: null, outro: 8,
    intent: '새 기믹 없음: 마지막 조합. 끝은 1박 통 4번으로 레벨 1 무늬를 되부름(클리어 직전 억울한 실패 없음).',
    phrases: [
      { rest: 4, seq: '1 1 2 2 0.5 0.5 1', land: 1 },
      { rest: 4, two: 4, land: 2 },
      { rest: 4, seq: '4 1.5 1.5 1 2 0.5 0.5 0.5 0.5 1', land: 1 },
      { rest: 4, seq: '1 1 1 1', land: 1 },
    ],
  },
];

// 클리어 연출 박(결정 D10, balance.json clear_sequence): 마지막 착지 박 = 큰 튐, 등급 구름 = 끝 2·1·0박 전, 결과 = 끝 박
function clearSeq(lastLanding, end) {
  const C = BAL.clear_sequence;
  return { big_toss_beat: lastLanding, big_toss_flight_s: C.big_toss_flight_s, big_toss_apex_play_heights: C.big_toss_apex_play_heights,
    after_apex: C.after_apex, grade_cloud_beats: C.grade_clouds_beats_before_end.map((x) => end - x), result_beat: end, result_buttons_after_ms: C.result_buttons_after_ms };
}

export function buildLevel(d) {
  const contacts = [], phrases = [];
  let beat = 0; // 구절 시작(공이 앉은 박)
  d.phrases.forEach((p, pi) => {
    let rest = p.rest;
    while ((beat + rest) % 4 !== 0) rest++; // 토스를 마디 첫 박에
    const toss = beat + rest;
    const ph = { index: pi, start_beat: beat, rest_beats: rest, balls: p.two ? 2 : 1, checkpoint: true, tosses: [], landings: [], contact_range: [contacts.length, null] };
    if (!p.two) {
      const seq = p.seq.trim().split(/\s+/).map(Number);
      let t = toss;
      ph.tosses.push({ ball: 1, beat: toss, to_contact: contacts.length });
      seq.forEach((g) => { t += g; contacts.push({ beat: t, ball: 1, gap_beats: g, bounce: BOUNCE[g], phrase: pi }); });
      ph.landings.push({ ball: 1, from_contact: contacts.length - 1, beat: t + p.land, exit: false });
      beat = t + p.land;
    } else {
      const n = p.two;
      ph.tosses.push({ ball: 1, beat: toss, to_contact: contacts.length });
      ph.tosses.push({ ball: 2, beat: toss + 1, to_contact: contacts.length + 1 });
      for (let k = 0; k < n; k++) contacts.push({ beat: toss + 2 + k, ball: (k % 2) + 1, gap_beats: 2, bounce: 'big', phrase: pi, two_ball: true });
      const last1 = contacts.length - (n % 2 ? 1 : 2), last2 = contacts.length - (n % 2 ? 2 : 1);
      ph.landings.push({ ball: 1, from_contact: last1, beat: contacts[last1].beat + p.land, exit: false });
      ph.landings.push({ ball: 2, from_contact: last2, beat: contacts[last2].beat + p.land, exit: true });
      beat = Math.max(...ph.landings.map((x) => x.beat));
      // 공 2 들어옴·나감(결정 D13, balance.json rest.second_ball): 박은 레벨 시간 박
      const SB = BAL.rest.second_ball, l2 = ph.landings.find((x) => x.ball === 2).beat, rs = ph.start_beat;
      ph.second_ball = {
        enter_beats: SB.enter_beats_from_rest_start.map((x) => rs + x), enter: SB.enter, hop_beats: SB.hop_beats, hop_of_d: SB.hop_of_d,
        seat_x_of_d: SB.seat_x_of_d, ball1_to_left_beats: SB.ball1_to_left_beats_from_rest_start.map((x) => rs + x),
        exit_beats: SB.exit_beats_from_ball2_landing.map((x) => l2 + x), exit: SB.exit, ball1_to_center_beats: SB.ball1_to_center_beats_from_ball2_landing.map((x) => l2 + x),
      };
    }
    ph.contact_range[1] = contacts.length - 1;
    phrases.push(ph);
  });
  // 기믹 태그: 두 공 구절 = G5, 반박 4연속 = G7, 그 밖은 비행 길이로
  contacts.forEach((c, i) => {
    c.i = i;
    if (c.two_ball) c.gimmick = 'G5';
    else c.gimmick = GIM[c.bounce];
  });
  for (let i = 0; i < contacts.length; i++) {
    if (contacts[i].bounce !== 'half') continue;
    let k = i; while (k < contacts.length && contacts[k].bounce === 'half' && !contacts[k].two_ball) k++;
    if (k - i >= 4) for (let m = i; m < k; m++) contacts[m].gimmick = 'G7';
    i = k - 1;
  }
  // 새 기믹 첫 등장 접촉 2개 표시(K2 손해 모델·검증 V7)
  if (d.gimmick && d.gimmick.id !== 'B1') {
    contacts.filter((c) => c.gimmick === d.gimmick.id).slice(0, 2).forEach((c) => (c.first_of_gimmick = true));
  }
  for (const c of contacts) delete c.two_ball;
  const length = beat + d.outro;
  const n = +d.id;
  const lvl = {
    schema_version: 1,
    id: d.id,
    theme_id: `level${d.id}`,
    name_key: `level${n}_name`,
    bpm: d.bpm,
    beats_per_bar: 4,
    judge: d.judge,
    design_intent: d.intent,
    new_gimmick: d.gimmick ? { id: d.gimmick.id, first_contact: contacts.findIndex((c) => c.gimmick === d.gimmick.id) } : null,
    card: d.gimmick ? { id: d.gimmick.card, timing: 'pre_level_first_play', close_to_level_start_ms: BAL.level_start.card_close_to_level_start_ms } : null,
    level_select_to_level_start_ms: BAL.level_start.level_select_to_level_start_ms,
    tutorial_finger: d.finger || null,
    length_beats: length,
    outro_beats: d.outro,
    duration_s: +(length * 60 / d.bpm).toFixed(3),
    contact_count: contacts.length,
    clear_sequence: clearSeq(beat, length),
    phrases,
    contacts,
  };
  return lvl;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).replace(/\\/g, '/').toLowerCase() === resolve(process.argv[1]).replace(/\\/g, '/').toLowerCase();
if (isMain) {
  mkdirSync(join(PROJECT, 'levels'), { recursive: true });
  for (const d of DESIGNS) {
    const lvl = buildLevel(d);
    const f = join(PROJECT, 'levels', `${d.id}-level${+d.id}.json`);
    writeFileSync(f, JSON.stringify(lvl, null, 1) + '\n');
    console.log(`${f}  접촉 ${lvl.contact_count} · ${lvl.duration_s} s`);
  }
}
