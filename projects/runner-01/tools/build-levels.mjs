#!/usr/bin/env node
// 레벨 설계 원본 (runner-01). 박자 단위로 기믹을 적으면 타일 좌표 JSON(levels/*.json)을 만든다.
//
//   node tools/build-levels.mjs && node tools/verify-levels.mjs
//
// - 장애물은 "몇 번째 박에 탭하면 넘는가"로 적는다. 이 스크립트가 점프 궤적을 계산해
//   탭 타이밍 창의 가운데가 그 박에 오도록 x를 정한다.
// - 이미 있는 JSON의 name / name_en / name_key / theme_id / audio_first_beat_s 는 덮어쓰지 않는다 (교차 리뷰에서 채운 값 보존).
// - cue(key, beat): 튜토리얼 문구(10-lore.md 5-6절 키)를 띄울 박. 플레이어 x가 cue.x 이상이 되면 표시.
// - 콤보 판정 탭(judge_taps)은 이 스크립트가 만들지 않는다. 레벨을 다시 만들면 이어서 node tools/build-judge-taps.mjs 를 돌린다.
// - 생성 후에는 JSON이 빌드의 원본이다. JSON을 직접 고쳤다면 이 스크립트를 다시 돌리기 전에 여기에도 반영한다.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BAL = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const r2 = (v) => Math.round(v * 100) / 100;
// 레벨 4~10 이름: 10-lore.md 4절·5-1절 확정값 (레벨 1~3은 기존 JSON 값을 보존)
const NAMES = {
  '04': ['빗방울 계단', 'Raindrop Steps'],
  '05': ['바람 기찻길', 'Windy Railway'],
  '06': ['비눗방울 언덕', 'Bubble Hill'],
  '07': ['고드름 동굴', 'Icicle Cave'],
  '08': ['달팽이 정원', 'Snail Garden'],
  '09': ['구름 사다리', 'Cloud Ladder'],
  '10': ['해돋이 무대', 'Sunrise Stage'],
};

class LevelBuilder {
  constructor({ id, file, bpm, startSpeed = 'normal', lengthBeats, intent, target }) {
    Object.assign(this, { id, file, bpm, startSpeed, lengthBeats, intent, target });
    this.beatS = 60 / bpm;
    this.portals = []; // {beat, speed}
    this.objects = [];
    this.sections = [];
    this.cues = [];
  }
  // ---- 시간/위치
  speed(beat, name) { this.portals.push({ beat, speed: name }); this.portals.sort((a, b) => a.beat - b.beat); }
  vAt(beat) {
    let v = BAL.speeds_t_s[this.startSpeed];
    for (const p of this.portals) if (p.beat <= beat + 1e-9) v = BAL.speeds_t_s[p.speed];
    return v;
  }
  X(beat) {
    let x = 0, b = 0, v = BAL.speeds_t_s[this.startSpeed];
    for (const p of this.portals) {
      if (p.beat >= beat) break;
      x += (p.beat - b) * this.beatS * v; b = p.beat; v = BAL.speeds_t_s[p.speed];
    }
    return x + (beat - b) * this.beatS * v;
  }
  section(beat, name, intensity) { this.sections.push({ name, start_beat: beat, x: r2(this.X(beat)), intensity }); }
  cue(key, beat) { this.cues.push({ key, beat, x: r2(this.X(beat)) }); }

  // ---- 궤적: kind 'jump'(탭) | 'pad', y0 출발 발 높이, orbs: 공중 재점프 탭 박들
  traj(beat, { y0 = 0, kind = 'jump', orbs = [] } = {}) {
    const dt = 1 / 2400, g = BAL.gravity_t_s2;
    let t = beat * this.beatS, y = y0, x = this.X(beat);
    let vy = kind === 'pad' ? BAL.pad_velocity_t_s : BAL.jump_velocity_t_s;
    const orbT = orbs.map((b) => b * this.beatS).sort((a, b) => a - b);
    const pts = [];
    for (let i = 0; i < 2400 * 2; i++) {
      if (orbT.length && t >= orbT[0] - 1e-9) { orbT.shift(); vy = BAL.orb_velocity_t_s; }
      pts.push({ t, x, y, vy });
      const nvy = Math.max(vy - g * dt, -BAL.max_fall_speed_t_s);
      y += 0.5 * (vy + nvy) * dt; vy = nvy;
      x += this.vAt(t / this.beatS) * dt; t += dt;
      if (y < -3) break;
    }
    return pts;
  }
  span(pts, h) { // 발이 h 보다 높은 첫 구간의 플레이어 왼쪽 x 범위
    let a = null;
    for (const p of pts) {
      if (a === null && p.y > h) a = p.x;
      else if (a !== null && p.y <= h) return [a, p.x];
    }
    throw new Error('span: 궤적이 높이를 넘지 못함');
  }
  landX(pts, top) {
    let above = false;
    for (const p of pts) {
      if (p.y > top) above = true;
      if (above && p.vy <= 0 && p.y <= top) return p.x;
    }
    throw new Error(`landX: 높이 ${top}에 착지 못함`);
  }
  riseX(pts, h) { for (const p of pts) if (p.y >= h) return p.x; return Infinity; }
  posAt(pts, beat) { const t = beat * this.beatS; return pts.find((p) => p.t >= t - 1e-9); }

  // ---- 배치
  add(o) { this.objects.push(o); return o; }
  // 탭 한 번(또는 traj)으로 넘는 즉사 장애물 묶음. y: 장애물이 놓인 면 높이
  hazard(beat, n, { y = 0, type = 'spike', traj } = {}) {
    const pts = traj ?? this.traj(beat, { y0: y });
    const h = y + (type === 'spike_low' ? BAL.spike_low_hitbox_h_t : BAL.spike_hitbox_h_t);
    const [a, b] = this.span(pts, h);
    const need = n + BAL.spike_hitbox_w_t;
    if (b - a < need) throw new Error(`${this.id} beat ${beat}: ${type} x${n} 를 넘을 수 없음 (여유 ${(b - a).toFixed(2)} < ${need})`);
    const c0 = (a + b) / 2 - (n - 1) / 2;
    for (let i = 0; i < n; i++) this.add({ type, x: r2(c0 + i), y });
    return c0;
  }
  // 점프해서 올라타는 블록 기둥(바닥부터 높이 h). 끝은 endBeat에 플레이어가 걸어 내려가는 지점
  // ext: 끝 박에 그 위에서 점프해도 되도록 끝을 조금 늘림 (걸어 내려가는 시점도 ext만큼 늦어짐)
  blockUp(beat, endBeat, h, { y0 = 0, traj, ext = 0.8 } = {}) {
    const pts = traj ?? this.traj(beat, { y0 });
    const land = this.landX(pts, h);
    const inner0 = 0.5 - BAL.player_inner_hitbox_t / 2;
    const min = y0 >= h - inner0 ? -Infinity : this.riseX(pts, h - inner0) + (1 - inner0);
    const max = land + 1;
    const bx = Number.isFinite(min) ? (min + max) / 2 : max - 1.5;
    const end = endBeat == null ? null : this.X(endBeat) + ext;
    const o = this.add({ type: 'block', x: r2(bx), y: 0, w: end == null ? 1 : r2(end - bx), h });
    return o;
  }
  platformUp(beat, endBeat, cellY, { y0 = 0, traj, ext = 0.8 } = {}) {
    const pts = traj ?? this.traj(beat, { y0 });
    const land = this.landX(pts, cellY + 1);
    const x0 = land - 1;
    return this.add({ type: 'platform', x: r2(x0), y: cellY, w: r2(this.X(endBeat) + ext - x0) });
  }
  pad(beat, y = 0) {
    this.add({ type: 'pad', x: r2(this.X(beat) + 1 - BAL.pad_trigger_inset_x_t), y });
    return this.traj(beat, { y0: y, kind: 'pad' });
  }
  orb(pts, beat) {
    const p = this.posAt(pts, beat);
    this.add({ type: 'orb', x: r2(p.x), y: Math.round(p.y * 4) / 4 });
  }
  fill(type, x0, x1, y) { for (let x = x0; x + 1 <= x1 + 1e-6; x++) this.add({ type, x: r2(x), y }); }

  // ---- round-2 레벨 4~10 기믹 (physics.js·verify-levels가 이미 지원하는 타입만)
  // 공중 고리: 지면 탭(beat) → 공중 탭(orbBeat)으로 긴 가시 줄 n개 넘기. 고리는 orbBeat 순간 플레이어 위치에 놓는다.
  orbJump(beat, orbBeat, n, { y = 0 } = {}) {
    const pts = this.traj(beat, { y0: y, orbs: [orbBeat] });
    this.orb(pts, orbBeat);
    this.hazard(beat, n, { y, traj: pts });
    return pts;
  }
  // 천장 장애물(매달린 잡음) 줄: "이 아래에서는 누르지 않기". 두 탭 사이(앞 탭 bPrev 궤적이 지나간 뒤 ~ 다음 탭 bNext 이륙 전)에만 놓는다.
  // row: 천장 칸 행 (판정 [row+0.55, row+1]). 기본은 걷는 높이 y0 + 2 → 걸으면 안전, 뛰면 머리가 닿음.
  // marginS: 앞 탭이 늦거나 다음 탭이 이를 때 남겨 둘 여유(초). 이 여유가 이웃 탭 창의 한쪽 상한이 된다.
  // prevOrbs: 앞 탭이 고리 점프였으면 그 고리 박. y0Prev: 앞 탭 이륙 높이(기본 y0).
  tunnel(bPrev, bNext, { y0 = 0, row = y0 + 2, marginS = 0.14, y0Next = y0, y0Prev = y0, prevOrbs = [] } = {}) {
    // 배치 계산은 레벨 7~10을 만들 때의 천장 판정 0.25 × 0.45(칸 [x+0.375, x+0.625] × [row+0.55, row+1])로 고정한다.
    // round-2 콤보 차수에 실제 판정을 바닥 가시와 같은 0.49 × 0.24(위아래 반전)로 바꿨지만 배치는 그대로 둔다(20-balance 15-7).
    // 새 판정은 옛 판정보다 세로로 0.21 t 짧고 가로로 0.12 t 넓다. 이 값으로 놓은 줄이 새 판정에서 이웃 탭 창을 좁히지 않는 것은 verify-levels로 확인했다.
    const lim = row + 0.55 - BAL.player_size_t; // 발이 이보다 높으면 머리가 (옛) 천장 판정에 닿음
    const hw = 0.5 + 0.25 / 2; // 칸 x에서 (옛) 판정 끝까지 + 몸체 보정
    let a = -Infinity;
    if (bPrev != null) {
      let last = null;
      for (const p of this.traj(bPrev, { y0: y0Prev, orbs: prevOrbs })) if (p.y > lim) last = p.x;
      a = (last ?? this.X(bPrev)) + hw + marginS * this.vAt(bPrev);
    }
    const first = this.traj(bNext, { y0: y0Next }).find((p) => p.y > lim).x;
    const b = first - hw - marginS * this.vAt(bNext);
    if (b - a < 0) throw new Error(`${this.id} tunnel ${bPrev}→${bNext}: 자리 없음`);
    const n = Math.floor(b - a) + 1;
    for (let i = 0; i < n; i++) this.add({ type: 'spike_ceiling', x: r2(a + i), y: row });
    return [a, a + n - 1];
  }
  // 떠 있는 얇은 발판 위로 올라가 위에서 걷기. under: 발판 아래 바닥에 가시를 깔아 "발판에서 내려오면 안 됨"을 만든다.
  ledge(beat, endBeat, cellY = 1, { y0 = 0, traj, ext = 0.8, under = false } = {}) {
    const p = this.platformUp(beat, endBeat, cellY, { y0, traj, ext });
    if (under) this.fill('spike', p.x + 1.5, p.x + p.w - 0.5, 0);
    return p;
  }

  toJSON() {
    const length = r2(this.X(this.lengthBeats));
    const old = existsSync(this.path) ? JSON.parse(readFileSync(this.path, 'utf8')) : {};
    this.objects.sort((a, b) => a.x - b.x || a.y - b.y);
    return {
      schema_version: 1,
      id: this.id,
      theme_id: old.theme_id ?? `level${Number(this.id)}`,
      name: NAMES[this.id]?.[0] ?? old.name ?? null,
      name_en: NAMES[this.id]?.[1] ?? old.name_en ?? null,
      name_key: NAMES[this.id] ? `level${Number(this.id)}_name` : old.name_key ?? null,
      bpm: this.bpm,
      beats_per_bar: 4,
      audio_first_beat_s: old.audio_first_beat_s ?? 0,
      start_speed: this.startSpeed,
      player_start: { x: 0, y: 0 },
      length_beats: this.lengthBeats,
      length_tiles: length,
      duration_s: r2(this.lengthBeats * this.beatS),
      difficulty: this.target,
      design_intent: this.intent,
      speed_changes: this.portals.map((p) => ({ x: r2(this.X(p.beat) + 0.5), speed: p.speed, beat: p.beat })),
      sections: this.sections,
      cues: this.cues,
      objects: this.objects,
    };
  }
  get path() { return join(PROJECT, this.file); }
  write() {
    // 배열 안의 작은 객체는 한 줄에 하나씩 (사람이 읽고 diff 보기 쉽게)
    const j = this.toJSON();
    const line = (o) => '    ' + JSON.stringify(o);
    const arr = (k) => `  "${k}": [\n${j[k].map(line).join(',\n')}\n  ]`;
    const head = Object.keys(j).filter((k) => !['speed_changes', 'sections', 'cues', 'objects'].includes(k))
      .map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(j[k])}`);
    const empty = (k) => (j[k].length ? arr(k) : `  "${k}": []`);
    writeFileSync(this.path, `{\n${[...head, empty('speed_changes'), empty('sections'), empty('cues'), empty('objects')].join(',\n')}\n}\n`);
  }
}

// ============================================================ 레벨 1 (120 BPM, 보통 속도) — round-2
// 규칙(오케스트레이터 결정 5): 바닥 장애물·낮은 장애물만, 필수 탭 12~16회, 모든 탭 2박(1 s) 이상 간격, 2연속 없음, 창 200 ms 이상
function level1() {
  const L = new LevelBuilder({
    id: '01', file: 'levels/01-level1.json', bpm: 120, lengthBeats: 96,
    intent: '탭 한 번으로 장애물 하나 넘기. 바닥 장애물과 낮은 장애물만, 탭 15회, 모든 탭 사이 2박 이상. 5~6세가 몇 번 만에 깨는 첫 레벨.',
    target: { stars: 1, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 2, child_sd70: 5 }, expected_attempts_sd50: [1, 2], expected_attempts_sd70: [1, 8] },
  });
  L.section(0, 'intro', 0);
  L.cue('tut_tap', 0); L.cue('tut_shard', 4);
  L.section(8, 'learn_tap', 1);
  for (const b of [8, 12, 16, 20]) L.hazard(b, 1);            // 4박 간격 단일 (첫 10초)
  L.section(22, 'learn_low', 1);
  L.hazard(24, 1, { type: 'spike_low' }); L.hazard(28, 1, { type: 'spike_low' }); L.hazard(32, 1);
  L.section(34, 'breath', 0);
  L.section(40, 'build', 1);
  L.hazard(44, 1); L.hazard(48, 1, { type: 'spike_low' }); L.hazard(52, 1);
  L.section(54, 'breath', 0);
  L.section(60, 'build', 1);                                   // 드롭 앞 픽업
  L.section(64, 'drop', 3);
  L.hazard(64, 1); L.hazard(66, 1); L.hazard(68, 1, { type: 'spike_low' }); L.hazard(72, 1); L.hazard(76, 1);
  L.section(80, 'outro', 0);
  return L;
}

// ============================================================ 레벨 2 (128 BPM, 보통 속도) — round-2 10레벨 확장 때 다시 설계
// 새 기믹 1개: 블록 올라타기(계단·내려오기 포함). criteria "σ70 첫 클리어 중앙값 레벨 간 2배 이하"(결정 8)에 맞춰
// 레벨 1(중앙값 2회) 다음이 4회 이하가 되도록 가시 2연속을 빼고 낮은 장애물 2연속 1곳만 남김.
function level2() {
  const L = new LevelBuilder({
    id: '02', file: 'levels/02-level2.json', bpm: 128, lengthBeats: 128,
    intent: '새 기믹: 공명 상자(블록) 올라타기·계단·내려오기. 가시는 1개씩, 낮은 장애물 2연속 1곳. 모든 탭 2박 이상 간격, 모든 창 200 ms 이상. σ70 첫 클리어 중앙값 4회 이하.',
    target: { stars: 2, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 1, child_sd70: 4 }, expected_attempts_sd50: [1, 3], skilled_clear_rate_min: 0.9 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 1); L.hazard(12, 1); L.hazard(16, 1, { type: 'spike_low' });
  L.section(18, 'breath', 0);
  L.cue('tut_crate', 20);
  L.section(24, 'learn_block', 2);
  L.blockUp(24, 27, 1);                                        // 안전한 첫 등장: 올라타고 걸어 내려오기만
  L.blockUp(30, 34, 1); L.hazard(32, 1, { y: 1 });             // 블록 위 장애물
  L.hazard(37, 1);
  L.hazard(40, 1, { type: 'spike_low' });
  L.section(42, 'breath', 0);
  L.section(44, 'learn_stairs', 2);
  { const b1 = L.blockUp(44, null, 1); const b2 = L.blockUp(46, 50, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); }
  L.hazard(53, 1);
  L.blockUp(56, 60, 1); L.hazard(58, 1, { y: 1 });
  L.section(61, 'breath', 0);
  L.section(64, 'drop', 3);
  L.hazard(64, 1); L.hazard(66, 1, { type: 'spike_low' });
  L.blockUp(70, 74, 1); L.hazard(72, 1, { y: 1 });
  L.hazard(76, 2, { type: 'spike_low' });                      // 유일한 2연속 (낮은 장애물, 창 204 ms)
  L.hazard(80, 1);
  { const b1 = L.blockUp(84, null, 1); const b2 = L.blockUp(86, 90, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); }
  L.section(92, 'build', 1);
  L.hazard(94, 1);
  L.section(96, 'drop', 3);
  L.hazard(98, 1, { type: 'spike_low' }); L.hazard(102, 1);
  L.section(110, 'outro', 0);
  return L;
}

// ============================================================ 레벨 3 (140 BPM, 보통 속도) — round-2 10레벨 확장 때 다시 설계
// 새 기믹 1개: 북 발판(입력 없이 높이 뜀). 발판은 입력이 필요 없어 아이 난이도에 거의 안 더해지므로 자주 쓰고,
// 가시 2연속은 2곳만. σ70 첫 클리어 중앙값을 레벨 2의 2배 이하로.
function level3() {
  const L = new LevelBuilder({
    id: '03', file: 'levels/03-level3.json', bpm: 140, lengthBeats: 160,
    intent: '새 기믹: 북 발판(자동 높이 점프). 발판으로 3연속 장애물 넘기·높이 3 상자 오르기. 가시 2연속 5곳(같은 창 171 ms, 숙련 사망이 한 곳에 몰리지 않게), 나머지는 1개씩. 속도 변경 없음.',
    target: { stars: 3, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 2, child_sd70: 8 }, expected_attempts_sd50: [1, 4], skilled_clear_rate_min: 0.9 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 1);
  L.blockUp(12, 16, 1); L.hazard(14, 1, { y: 1 });
  L.hazard(18, 1, { type: 'spike_low' });
  L.cue('tut_drum', 21);
  L.section(24, 'learn_pad', 2);
  L.pad(24);                                                   // 안전한 첫 등장: 밟고 튀기만
  { const t = L.pad(28); L.blockUp(28, 32, 3, { traj: t }); } // 발판으로 높이 3 상자
  { const t = L.pad(35); L.hazard(35, 3, { traj: t }); }       // 발판 믿고 3연속 넘기 (입력 없음)
  L.hazard(38, 2);
  L.section(40, 'breath', 0);
  L.section(44, 'build', 2);

  { const t = L.pad(46); L.blockUp(46, 50, 3, { traj: t }); }
  L.hazard(52, 1, { type: 'spike_low' });
  { const t = L.pad(56); L.hazard(56, 3, { traj: t }); }
  L.hazard(60, 2);                                             // 첫 가시 2연속 (앞뒤 4박 비움)
  L.section(62, 'breath', 0);
  L.section(64, 'drop', 3);
  L.hazard(66, 1);
  L.blockUp(68, 72, 1); L.hazard(70, 1, { y: 1 });
  { const t = L.pad(74); L.hazard(74, 3, { traj: t }); }
  { const b1 = L.blockUp(78, null, 1); const b2 = L.blockUp(80, 84, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); }
  L.hazard(86, 2, { type: 'spike_low' });
  { const t = L.pad(88); L.blockUp(88, 92, 3, { traj: t }); }

  L.section(100, 'build', 1);
  { const t = L.pad(100); L.hazard(100, 3, { traj: t }); }
  L.hazard(104, 2);
  L.section(112, 'drop', 3);

  { const t = L.pad(116); L.blockUp(116, 120, 3, { traj: t }); }

  L.section(128, 'finale', 3);
  L.hazard(128, 2);
  { const t = L.pad(132); L.hazard(132, 3, { traj: t }); }
  L.hazard(136, 2);
  L.section(144, 'outro', 0);
  return L;
}

// ============================================================ 레벨 4 (144 BPM, 보통 속도) — 레벨 10개 확장
// 새 기믹 1개: 현 발판(얇은 발판, platform). 떠 있고, 아래로 지나갈 수 있고, 옆에 부딪혀도 죽지 않는다. 위에서만 밟힘.
function level4() {
  const L = new LevelBuilder({
    id: '04', file: 'levels/04-level4.json', bpm: 144, lengthBeats: 168,
    intent: '새 기믹: 현 발판(떠 있는 얇은 발판). 발판에 올라 가시밭 위 건너기, 발판 위 가시, 공중 계단(높이 2 → 3). 가시 2연속 5곳, 발판(북) 조합. 속도 변경 없음.',
    target: { stars: 3, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 2, child_sd70: 12 }, expected_attempts_sd50: [1, 5], skilled_clear_rate_min: 0.9 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 2);
  { const t = L.pad(12); L.hazard(12, 3, { traj: t }); }
  L.blockUp(16, 20, 1); L.hazard(18, 1, { y: 1 });
  L.cue('tut_string', 22);
  L.section(24, 'learn_ledge', 2);
  L.ledge(26, 30, 1);                                           // 안전한 첫 등장: 올라가서 걸어 내려오기만 (아래 가시 없음)
  L.hazard(33, 2);
  L.ledge(36, 40, 1, { under: true });                          // 아래 가시밭: 발판 위에 머물기

  L.section(45, 'breath', 0);
  L.section(48, 'learn_ledge', 2);
  { const p1 = L.platformUp(48, 50, 1, { ext: 1.6 }); const p2 = L.platformUp(50, 54, 2, { y0: 2 }); L.fill('spike', p1.x + 1.5, p2.x + p2.w - 0.5, 0); }  // 공중 계단

  L.ledge(60, 64, 1, { under: true }); // 발판 위 가시
  L.section(65, 'breath', 0);
  L.section(68, 'drop', 3);
  L.hazard(68, 2);
  { const t = L.pad(72); L.blockUp(72, 76, 3, { traj: t }); }
  L.hazard(78, 1, { type: 'spike_low' });
  { const p1 = L.platformUp(82, 84, 1, { ext: 1.6 }); const p2 = L.platformUp(84, 88, 2, { y0: 2 }); L.fill('spike', p1.x + 1.5, p2.x + p2.w - 0.5, 0); L.hazard(86, 1, { y: 3 }); }

  L.section(97, 'breath', 0);
  L.section(100, 'build', 2);
  L.blockUp(100, 104, 1); L.hazard(102, 1, { y: 1 });
  L.ledge(106, 110, 1, { under: true });
  L.hazard(113, 2);
  L.section(116, 'drop', 3);
  { const t = L.pad(116); L.hazard(116, 3, { traj: t }); }
  L.ledge(120, 124, 1, { under: true }); L.hazard(122, 1, { y: 2 });
  L.hazard(127, 1, { type: 'spike_low' });
  { const b1 = L.blockUp(130, null, 1); const b2 = L.blockUp(132, 136, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); }
  L.section(138, 'finale', 3);
  { const p1 = L.platformUp(140, 142, 1, { ext: 1.6 }); const p2 = L.platformUp(142, 146, 2, { y0: 2 }); L.fill('spike', p1.x + 1.5, p2.x + p2.w - 0.5, 0); }
  L.hazard(149, 2);
  L.section(153, 'outro', 0);
  return L;
}

// ============================================================ 레벨 5 (148 BPM) — 레벨 10개 확장
// 새 기믹 1개: 템포 문(속도 문). 이 레벨은 "빠름(fast, 12.9 t/s)"과 "보통으로 돌아오기"만 쓴다.
// 빨라지면 점프가 길어져 가시 2연속이 오히려 넓어진다(보통 171 ms → 빠름 215 ms). 지면 3연속은 쓰지 않는다.
function level5() {
  const L = new LevelBuilder({
    id: '05', file: 'levels/05-level5.json', bpm: 148, lengthBeats: 176,
    intent: '새 기믹: 템포 문(빨라짐 → 보통). 빠른 구간에서는 점프가 길어져 가시 2연속을 넓게 넘음. 문은 언제나 땅 위, 문 뒤 첫 4박은 비움. 앞 레벨 어휘(발판·블록·현 발판) 조합.',
    target: { stars: 3, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 3, child_sd70: 16 }, expected_attempts_sd50: [1, 6], skilled_clear_rate_min: 0.9 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 2);
  L.ledge(12, 16, 1, { under: true });
  L.hazard(19, 1, { type: 'spike_low' });
  L.cue('tut_tempo', 21);
  L.section(24, 'learn_gate', 2);
  L.speed(24, 'fast');                                          // 안전한 첫 등장: 문 뒤 4박 비움
  L.hazard(28, 1);
  L.speed(39, 'normal');
  L.hazard(42, 2);
  L.section(44, 'breath', 0);
  L.section(48, 'build', 2);
  { const t = L.pad(48); L.hazard(48, 3, { traj: t }); }
  L.blockUp(51, 55, 1); L.hazard(53, 2, { y: 1 });
  L.speed(57, 'fast');
  L.hazard(60, 1);
  L.blockUp(63, 67, 1);
  L.section(68, 'drop', 3);
  L.hazard(70, 1);
  { const t = L.pad(74); L.blockUp(74, 78, 3, { traj: t }); }

  L.hazard(81, 1);
  L.ledge(84, 88, 1, { under: true });
  L.hazard(91, 1);
  L.speed(94, 'normal');
  L.section(96, 'breath', 0);
  L.section(100, 'build', 2);

  { const t = L.pad(104); L.hazard(104, 3, { traj: t }); }

  L.speed(110, 'fast');
  L.section(112, 'drop', 3);
  L.hazard(114, 2);
  { const p1 = L.platformUp(118, 120, 1, { ext: 1.6 }); const p2 = L.platformUp(120, 124, 2, { y0: 2 }); L.fill('spike', p1.x + 1.5, p2.x + p2.w - 0.5, 0); }
  L.hazard(131, 2);
  L.speed(134, 'normal');
  L.section(136, 'finale', 3);

  L.blockUp(141, 145, 1); L.hazard(143, 2, { y: 1 });
  L.hazard(152, 2);
  L.section(156, 'outro', 0);
  return L;
}

// ============================================================ 레벨 6 (152 BPM) — 레벨 10개 확장
// 새 기믹 1개: 울림 고리(공중 고리, orb). 공중에서 고리에 닿아 있을 때 한 번 더 누르면 다시 뜀.
// 고리 탭은 언제나 지면 탭 반 박 뒤(점프 꼭대기, 고리는 꼭대기에 있음). 고리 없이는 못 넘는 가시 줄에만 쓴다: 보통 4개, 빠름 5개(빠름 4개는 고리 없이도 창 60 ms로 넘어져 고리가 필요 없어짐).
// (1박 뒤 고리는 152 BPM에서 발이 0.69 t까지 내려온 뒤라 늦게 누르면 착지 → 창 121 ms. 꼭대기 고리 4개 줄은 창 200 ms 이상)
function level6() {
  const L = new LevelBuilder({
    id: '06', file: 'levels/06-level6.json', bpm: 152, lengthBeats: 184,
    intent: '새 기믹: 울림 고리(공중에서 한 번 더 톡). 지면 탭 → 반 박 뒤 꼭대기 고리 탭으로 가시 4개 줄 넘기. 첫 고리는 안 눌러도 안전. 템포 문(빠름) 구간과 조합.',
    target: { stars: 4, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 3, child_sd70: 18 }, expected_attempts_sd50: [1, 8], skilled_clear_rate_min: 0.9 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 2);
  L.ledge(12, 16, 1, { under: true });
  L.speed(18, 'fast');

  L.speed(23, 'normal');
  L.cue('tut_ring', 24);
  L.section(26, 'learn_ring', 2);
  { const t = L.traj(26, { orbs: [26.5] }); L.orb(t, 26.5); L.hazard(26, 1); }   // 안전한 첫 등장: 고리를 눌러도 안 눌러도 됨 (뒤 5박 비움)
  L.orbJump(32, 32.5, 4);                                         // 첫 필수 고리: 가시 4개
  L.hazard(37, 2);
  L.section(40, 'breath', 0);
  L.section(44, 'build', 2);
  { const t = L.pad(44); L.hazard(44, 3, { traj: t }); }

  L.blockUp(53, 57, 1); L.hazard(55, 2, { y: 1 });

  L.section(64, 'breath', 0);
  L.section(68, 'drop', 3);

  L.orbJump(72, 72.5, 4);
  L.ledge(77, 81, 1, { under: true });
  { const t = L.pad(84); L.blockUp(84, 88, 3, { traj: t }); }

  L.section(96, 'breath', 0);
  L.section(100, 'build', 2);
  L.speed(100, 'fast');

  L.orbJump(107, 107.5, 5);

  L.speed(114, 'normal');
  L.section(116, 'drop', 3);

  { const b1 = L.blockUp(120, null, 1); const b2 = L.blockUp(122, 126, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); }
  L.orbJump(129, 129.5, 4);


  L.section(138, 'finale', 3);
  { const t = L.pad(138); L.hazard(138, 3, { traj: t }); }

  L.hazard(151, 2);
  L.section(156, 'outro', 0);
  return L;
}

// ============================================================ 레벨 7 (156 BPM) — 레벨 10개 확장
// 새 기믹 1개: 매달린 잡음(천장 장애물, spike_ceiling). "위에 가시가 있으면 누르지 않고 기다리기".
// 천장은 언제나 걷는 높이 + 2칸(걸으면 안전, 뛰면 머리가 닿음)이고, 두 탭 사이 "쉬는 박"에만 놓는다.
// 앞·뒤 탭에 0.14 s 여유를 남겨 천장 때문에 이웃 탭 창이 좁아지지 않게 한다 (tunnel()). 천장은 누를 일이 없어 아이 난이도에 거의 안 더해진다.
function level7() {
  const L = new LevelBuilder({
    id: '07', file: 'levels/07-level7.json', bpm: 156, lengthBeats: 192,
    intent: '새 기믹: 매달린 잡음(천장 가시). 위에 가시가 있으면 누르지 않고 기다리기. 천장은 두 탭 사이 쉬는 박에만, 땅·상자·현 발판 위. 앞 레벨 어휘(고리·템포 문) 조합.',
    target: { stars: 4, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 3, child_sd70: 21 }, expected_attempts_sd50: [1, 8], skilled_clear_rate_min: 0.9 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 2);

  L.orbJump(12, 12.5, 4);
  L.speed(17, 'fast');
  L.hazard(20, 2);

  L.speed(22, 'normal');
  L.cue('tut_hanging', 23);
  L.section(26, 'learn_hanging', 2);
  L.hazard(26, 1); L.tunnel(26, 34);                             // 안전한 첫 등장: 긴 쉬는 구간 위 천장 (누르지만 않으면 됨)
  L.hazard(34, 1); L.tunnel(34, 38);
  L.hazard(38, 1, { type: 'spike_low' });
  L.blockUp(41, 49, 1); L.tunnel(41, 47, { y0: 1, y0Prev: 0 }); L.hazard(47, 1, { y: 1 });   // 상자 위 천장
  L.section(50, 'breath', 0);
  L.section(52, 'build', 2);
  L.hazard(52, 2); L.tunnel(52, 56);
  L.hazard(56, 1);
  L.hazard(60, 1); L.tunnel(60, 66);
  L.ledge(66, 72, 1, { under: true }); L.tunnel(66, 70, { y0: 2, y0Prev: 0 });   // 현 발판 위 천장
  L.section(74, 'drop', 3);

  { const t = L.pad(79); L.hazard(79, 3, { traj: t }); }


  { const t = L.pad(92); L.blockUp(92, 98, 3, { traj: t }); L.tunnel(92, 96, { y0: 3, y0Prev: 0 }); L.hazard(96, 1, { y: 3 }); }
  L.hazard(101, 2); L.tunnel(101, 105);
  L.hazard(105, 1, { type: 'spike_low' });
  L.section(108, 'breath', 0);
  L.section(110, 'build', 2);
  L.speed(110, 'fast');


  L.orbJump(120, 120.5, 5); L.tunnel(120, 125, { prevOrbs: [120.5] });

  L.speed(127, 'normal');
  L.section(128, 'drop', 3);

  { const b1 = L.blockUp(134, null, 1); const b2 = L.blockUp(136, 142, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); L.tunnel(136, 141, { y0: 2, y0Prev: 1 }); }
  L.hazard(145, 2); L.tunnel(145, 149);

  L.section(154, 'finale', 3);

  { const t = L.pad(159); L.hazard(159, 3, { traj: t }); }
  L.hazard(163, 1); L.tunnel(163, 167);

  L.section(172, 'outro', 0);
  return L;
}

// ============================================================ 레벨 8 (160 BPM) — 레벨 10개 확장
// 새 기믹 1개: 느린 템포 문(slow, 8.4 t/s). 레벨 5 템포 문의 반대 방향. 느려지면 점프가 짧아져 가시 2연속(창 112 ms)·
// 낮은 장애물 2연속(약 150 ms)은 넣지 않는다. 느린 구간 가시 1개는 창 233 ms라 자주 쓰지 않고 낮은 장애물·상자·현 발판 위주.
function level8() {
  const L = new LevelBuilder({
    id: '08', file: 'levels/08-level8.json', bpm: 160, lengthBeats: 198,
    intent: '새 기믹: 느린 템포 문(느려짐 → 보통). 느린 구간은 점프가 짧아 장애물을 하나씩만. 빠름 ↔ 느림 대비. 앞 레벨 어휘(고리·천장) 조합.',
    target: { stars: 4, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 3, child_sd70: 24 }, expected_attempts_sd50: [1, 8], skilled_clear_rate_min: 0.9 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 2);

  L.orbJump(12, 12.5, 4);
  L.hazard(17, 2); L.tunnel(17, 21);
  L.hazard(21, 1, { type: 'spike_low' });

  L.speed(24, 'fast');
  L.hazard(27, 1);
  L.speed(30, 'normal');
  L.cue('tut_tempo_slow', 30);
  L.section(32, 'learn_slow', 2);
  L.speed(33, 'slow');                                          // 안전한 첫 등장: 문 뒤 4박 비움
  L.hazard(37, 1, { type: 'spike_low' });
  L.speed(44, 'normal');

  L.blockUp(51, 55, 1); L.hazard(53, 2, { y: 1 });
  L.section(58, 'build', 2);
  L.speed(58, 'slow');
  L.blockUp(62, 66, 1);
  L.hazard(69, 1, { type: 'spike_low' });
  L.ledge(72, 76, 1, { under: true });
  L.speed(80, 'fast');
  L.section(82, 'drop', 3);
  L.hazard(83, 1);
  L.hazard(86, 2);
  L.hazard(90, 1); L.tunnel(90, 94);
  L.hazard(94, 1);
  L.speed(97, 'normal');
  { const p1 = L.platformUp(99, 101, 1, { ext: 1.6 }); const p2 = L.platformUp(101, 105, 2, { y0: 2 }); L.fill('spike', p1.x + 1.5, p2.x + p2.w - 0.5, 0); }
  L.section(108, 'breath', 0);
  L.section(110, 'build', 2);
  L.speed(110, 'slow');

  L.ledge(117, 121, 1, { under: true });
  L.hazard(124, 1, { type: 'spike_low' });
  L.speed(127, 'normal');
  L.section(130, 'drop', 3);

  L.hazard(134, 2);
  L.hazard(139, 2); L.tunnel(139, 143);
  { const t = L.pad(143); L.hazard(143, 3, { traj: t }); }
  L.speed(146, 'fast');
  L.hazard(149, 2); L.hazard(153, 1);
  L.speed(156, 'slow');
  L.hazard(160, 1, { type: 'spike_low' });
  L.speed(167, 'normal');
  L.section(168, 'finale', 3);



  L.section(182, 'outro', 0);
  return L;
}

// ============================================================ 레벨 9 (164 BPM) — 레벨 10개 확장
// 새 기믹 없음. 지금까지의 기믹 조합: 2박 간격 "탭 - 천장 - 탭", 세 속도가 한 레벨에 모두 나옴.
function level9() {
  const L = new LevelBuilder({
    id: '09', file: 'levels/09-level9.json', bpm: 164, lengthBeats: 204,
    intent: '새 기믹 없음(복습·조합). 2박 간격 탭 사이 천장, 빠름·느림 문 연속, 고리 줄과 상자·현 발판 조합. 기믹 바꿈이 잦아져 어려워짐.',
    target: { stars: 5, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 3, child_sd70: 26 }, expected_attempts_sd50: [1, 8], skilled_clear_rate_min: 0.9 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 2);


  L.orbJump(12, 12.5, 4);
  L.speed(20, 'slow');
  L.hazard(24, 1, { type: 'spike_low' });
  L.speed(27, 'fast');
  L.hazard(30, 2);

  L.speed(33, 'normal');
  L.section(34, 'build', 2);
  L.hazard(35, 2);
  L.orbJump(40, 40.5, 4);
  L.blockUp(45, 49, 1);
  L.ledge(51, 55, 1, { under: true });
  L.section(56, 'drop', 3);
  L.speed(57, 'fast');

  L.orbJump(63, 63.5, 5);
  L.hazard(67, 1); L.tunnel(67, 69); L.hazard(69, 1);
  { const t = L.pad(72); L.blockUp(72, 76, 3, { traj: t }); }
  L.speed(79, 'normal');
  L.section(82, 'breath', 0);
  L.section(86, 'build', 2);
  L.speed(86, 'slow');

  L.blockUp(93, 97, 1);
  L.speed(100, 'normal');
  L.section(102, 'drop', 3);
  L.hazard(103, 2); L.tunnel(103, 105); L.hazard(105, 1);

  { const b1 = L.blockUp(113, null, 1); const b2 = L.blockUp(115, 119, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); }
  L.hazard(122, 2); L.tunnel(122, 124); L.hazard(124, 1, { type: 'spike_low' });
  { const t = L.pad(127); L.hazard(127, 3, { traj: t }); }
  L.speed(130, 'fast');
  L.hazard(136, 1);


  L.hazard(140, 1); L.tunnel(140, 142); L.hazard(142, 1);


  L.speed(146, 'normal');
  L.section(154, 'finale', 3);

  L.hazard(158, 1);

  { const p1 = L.platformUp(167, 169, 1, { ext: 1.6 }); const p2 = L.platformUp(169, 173, 2, { y0: 2 }); L.fill('spike', p1.x + 1.5, p2.x + p2.w - 0.5, 0); }

  L.section(180, 'outro', 0);
  return L;
}

// ============================================================ 레벨 10 (168 BPM) — 레벨 10개 확장
// 새 기믹 없음. 마지막 레벨: 레벨 1~9의 모든 기믹이 한 번 이상 나오는 종합. 가장 빠른 곡.
function level10() {
  const L = new LevelBuilder({
    id: '10', file: 'levels/10-level10.json', bpm: 168, lengthBeats: 210,
    intent: '새 기믹 없음(종합). 레벨 1~9의 모든 기믹(가시·낮은 장애물·상자·발판·현 발판·템포 문 빠름/느림·고리·천장)이 나오는 마지막 레벨. 기믹이 가장 자주 바뀜.',
    target: { stars: 5, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 4, child_sd70: 28 }, expected_attempts_sd50: [1, 8], skilled_clear_rate_min: 0.9 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 2);
  L.orbJump(12, 12.5, 4);
  L.hazard(17, 1);
  L.ledge(22, 26, 1, { under: true }); L.hazard(24, 2, { y: 2 });
  L.speed(27, 'fast');
  L.section(28, 'drop', 3);
  L.hazard(30, 2);
  L.hazard(33, 2);

  { const t = L.pad(42); L.blockUp(42, 46, 3, { traj: t }); L.hazard(44, 1, { y: 3 }); }
  L.speed(49, 'slow');

  L.blockUp(56, 60, 1);
  L.hazard(63, 1, { type: 'spike_low' });
  L.speed(66, 'normal');
  L.section(68, 'build', 2);
  L.hazard(68, 2);
  { const b1 = L.blockUp(73, null, 1); const b2 = L.blockUp(75, 79, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); }

  L.orbJump(85, 85.5, 4);
  L.hazard(90, 2);
  { const t = L.pad(95); L.hazard(95, 3, { traj: t }); }
  L.section(97, 'breath', 0);
  L.section(100, 'drop', 3);
  L.speed(100, 'fast');

  L.hazard(106, 1);

  { const p1 = L.platformUp(115, 117, 1, { ext: 1.6 }); const p2 = L.platformUp(117, 121, 2, { y0: 2 }); L.fill('spike', p1.x + 1.5, p2.x + p2.w - 0.5, 0); }
  L.speed(124, 'slow');
  L.hazard(128, 1, { type: 'spike_low' });
  L.ledge(131, 135, 1, { under: true });
  L.speed(138, 'normal');
  L.section(140, 'build', 2);


  L.hazard(148, 1); L.tunnel(148, 150); L.hazard(150, 1);
  L.blockUp(153, 157, 1); L.hazard(155, 2, { y: 1 });
  L.section(159, 'finale', 3);
  { const t = L.pad(160); L.blockUp(160, 164, 3, { traj: t }); }



  L.hazard(171, 1);
  L.section(180, 'outro', 0);
  return L;
}

export { LevelBuilder };
export const LEVELS = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10];

// node tools/build-levels.mjs            → 10개 전부 생성
// node tools/build-levels.mjs 04 05      → 지정한 레벨만 생성
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const only = process.argv.slice(2);
  mkdirSync(join(PROJECT, 'levels'), { recursive: true });
  for (const f of LEVELS) {
    const L = f();
    if (only.length && !only.includes(L.id)) continue;
    L.write();
    const j = L.toJSON();
    console.log(`${L.file}: ${j.objects.length} objects, ${j.length_tiles} t, ${j.duration_s} s`);
  }
}
