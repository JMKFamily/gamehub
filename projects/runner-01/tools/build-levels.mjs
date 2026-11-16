#!/usr/bin/env node
// 레벨 설계 원본 (runner-01). 박자 단위로 기믹을 적으면 타일 좌표 JSON(levels/*.json)을 만든다.
//
//   node tools/build-levels.mjs && node tools/verify-levels.mjs
//
// - 장애물은 "몇 번째 박에 탭하면 넘는가"로 적는다. 이 스크립트가 점프 궤적을 계산해
//   탭 타이밍 창의 가운데가 그 박에 오도록 x를 정한다.
// - 이미 있는 JSON의 name / name_en / name_key / theme_id / audio_first_beat_s 는 덮어쓰지 않는다 (교차 리뷰에서 채운 값 보존).
// - cue(key, beat): 튜토리얼 문구(10-lore.md 5-6절 키)를 띄울 박. 플레이어 x가 cue.x 이상이 되면 표시.
// - 생성 후에는 JSON이 빌드의 원본이다. JSON을 직접 고쳤다면 이 스크립트를 다시 돌리기 전에 여기에도 반영한다.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BAL = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const r2 = (v) => Math.round(v * 100) / 100;

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

  toJSON() {
    const length = r2(this.X(this.lengthBeats));
    const old = existsSync(this.path) ? JSON.parse(readFileSync(this.path, 'utf8')) : {};
    this.objects.sort((a, b) => a.x - b.x || a.y - b.y);
    return {
      schema_version: 1,
      id: this.id,
      theme_id: old.theme_id ?? `level${Number(this.id)}`,
      name: old.name ?? null,
      name_en: old.name_en ?? null,
      name_key: old.name_key ?? null,
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

// ============================================================ 레벨 2 (128 BPM, 보통 속도) — round-2
// 새 기믹 1개: 블록 올라타기(계단·내려오기 포함). 배치 변형으로 2연속 등장(16박 낮은 장애물 2연속 → 37박 바닥 장애물 2연속).
function level2() {
  const L = new LevelBuilder({
    id: '02', file: 'levels/02-level2.json', bpm: 128, lengthBeats: 128,
    intent: '새 기믹: 공명 상자(블록) 올라타기·계단·내려오기. 바닥 장애물 2연속을 처음 배움. 3연속 없음, 모든 탭 2박 이상 간격.',
    target: { stars: 2, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 4, child_sd70: 25 }, expected_attempts_sd50: [2, 10], skilled_clear_rate_min: 0.7 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 1); L.hazard(10, 1); L.hazard(12, 1, { type: 'spike_low' }); L.hazard(16, 2, { type: 'spike_low' });   // 단일 → 2박 간격 → 첫 2연속(낮은 장애물, 창 204 ms)
  L.section(18, 'breath', 0);
  L.cue('tut_crate', 20);
  L.section(24, 'learn_block', 2);
  L.blockUp(24, 27, 1);                                        // 안전한 첫 등장: 올라타고 걸어 내려오기만
  L.blockUp(30, 34, 1); L.hazard(32, 1, { y: 1 });             // 블록 위 장애물
  L.hazard(37, 2);                                             // 바닥 장애물 2연속 첫 등장 (뒤에 숨 고르기)
  L.section(40, 'breath', 0);
  L.section(44, 'learn_stairs', 2);
  { const b1 = L.blockUp(44, null, 1); const b2 = L.blockUp(46, 50, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); }
  L.hazard(53, 1);
  L.blockUp(56, 60, 1); L.hazard(58, 1, { y: 1 });
  L.section(61, 'breath', 0);
  L.section(64, 'drop', 3);
  L.hazard(64, 2); L.hazard(68, 2, { type: 'spike_low' });
  L.blockUp(70, 74, 1); L.hazard(72, 1, { y: 1 });
  L.hazard(76, 2);
  { const b1 = L.blockUp(78, null, 1); const b2 = L.blockUp(80, 84, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); L.hazard(82, 1, { y: 2 }); }
  L.hazard(86, 2);
  L.section(88, 'build', 1);
  { const a = L.blockUp(90, null, 1);                          // 블록 → 틈(바닥 장애물) → 블록
    a.w = r2(L.X(92) + 0.8 - a.x);
    const bb = L.blockUp(92, 96, 1, { y0: 1 });
    L.fill('spike', a.x + a.w, bb.x, 0);
    L.hazard(94, 1, { y: 1 }); }
  L.section(96, 'drop', 3);
  L.hazard(98, 2); L.hazard(100, 1, { type: 'spike_low' }); L.hazard(102, 1); L.hazard(106, 2);
  L.section(110, 'outro', 0);
  return L;
}

// ============================================================ 레벨 3 (140 BPM, 보통 속도) — round-2
// 새 기믹 1개: 북 발판(점프 발판, 밟으면 자동으로 높이 뜀). 속도 변경 없음. 지면 3연속 없음(발판으로만 넘김).
function level3() {
  const L = new LevelBuilder({
    id: '03', file: 'levels/03-level3.json', bpm: 140, lengthBeats: 160,
    intent: '새 기믹: 북 발판(자동 높이 점프). 발판으로 3연속 장애물 넘기·높이 3 상자 오르기. 앞 레벨 어휘(블록, 2연속) 조합. 속도 변경 없음.',
    target: { stars: 3, bot_first_clear_median: { skilled_sd25: 1, novice_sd50: 8 }, expected_attempts_sd50: [4, 20], skilled_clear_rate_min: 0.5 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 1); L.hazard(10, 2);
  L.blockUp(12, 16, 1); L.hazard(14, 1, { y: 1 });
  L.hazard(18, 1, { type: 'spike_low' }); L.hazard(20, 2);
  L.cue('tut_drum', 21);
  L.section(24, 'learn_pad', 2);
  L.pad(24);                                                   // 안전한 첫 등장: 밟고 튀기만
  { const t = L.pad(28); L.blockUp(28, 32, 3, { traj: t }); } // 발판으로 높이 3 상자
  { const t = L.pad(35); L.hazard(35, 3, { traj: t }); }       // 발판 믿고 3연속 넘기 (입력 없음)
  L.hazard(38, 1);
  L.section(40, 'breath', 0);
  L.section(44, 'build', 2);
  L.hazard(44, 2);
  { const t = L.pad(46); L.blockUp(46, 50, 3, { traj: t }); L.hazard(48, 1, { y: 3 }); }
  L.hazard(52, 1); L.hazard(54, 1, { type: 'spike_low' });
  { const t = L.pad(56); L.hazard(56, 3, { traj: t }); }
  L.hazard(58, 2); L.hazard(60, 1);
  L.section(62, 'breath', 0);
  L.section(64, 'drop', 3);
  L.hazard(64, 2); L.hazard(66, 1);
  L.blockUp(68, 72, 1); L.hazard(70, 1, { y: 1 });
  { const t = L.pad(74); L.hazard(74, 3, { traj: t }); }
  L.hazard(76, 2);
  { const b1 = L.blockUp(78, null, 1); const b2 = L.blockUp(80, 84, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); L.hazard(82, 1, { y: 2 }); }
  L.hazard(86, 2);
  { const t = L.pad(88); L.blockUp(88, 92, 3, { traj: t }); L.hazard(90, 2, { y: 3 }); }
  L.hazard(94, 1, { type: 'spike_low' }); L.hazard(96, 2); L.hazard(98, 1);
  L.section(100, 'build', 1);
  { const t = L.pad(100); L.hazard(100, 3, { traj: t }); }
  L.hazard(102, 2);
  { const a = L.blockUp(104, null, 1);
    a.w = r2(L.X(106) + 0.8 - a.x);
    const bb = L.blockUp(106, 110, 1, { y0: 1 });
    L.fill('spike', a.x + a.w, bb.x, 0);
    L.hazard(108, 1, { y: 1 }); }
  L.section(112, 'drop', 3);
  L.hazard(112, 2); L.hazard(114, 1);
  { const t = L.pad(116); L.blockUp(116, 120, 3, { traj: t }); L.hazard(118, 1, { y: 3 }); }
  L.hazard(122, 2); L.hazard(124, 1, { type: 'spike_low' }); L.hazard(126, 1);
  L.section(128, 'finale', 3);
  L.hazard(128, 2); L.hazard(130, 1);
  { const t = L.pad(132); L.hazard(132, 3, { traj: t }); }
  L.hazard(134, 2); L.hazard(136, 1); L.hazard(138, 2); L.hazard(140, 1, { type: 'spike_low' });
  L.section(144, 'outro', 0);
  return L;
}

mkdirSync(join(PROJECT, 'levels'), { recursive: true });
for (const f of [level1, level2, level3]) {
  const L = f();
  L.write();
  const j = L.toJSON();
  console.log(`${L.file}: ${j.objects.length} objects, ${j.length_tiles} t, ${j.duration_s} s`);
}
