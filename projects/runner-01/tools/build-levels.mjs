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

// ============================================================ 레벨 1 (120 BPM, 보통 속도)
function level1() {
  const L = new LevelBuilder({
    id: '01', file: 'levels/01-level1.json', bpm: 120, lengthBeats: 96,
    intent: '탭 점프, 낮은 장애물, 블록 올라타기·내려오기. 첫 30초 안에 전부 한 번씩 안전하게 경험.',
    target: { stars: 1, expected_attempts: [3, 15], first_try_reach_pct: 25, clear_rate_10_tries: 0.6 },
  });
  L.section(0, 'intro', 0);
  L.cue('tut_tap', 0); L.cue('tut_shard', 5); L.cue('tut_beat', 13); L.cue('tut_crate', 37);
  L.section(8, 'learn_tap', 1);
  for (const b of [8, 12, 16]) L.hazard(b, 1);            // 4박 간격 단일 (첫 10초)
  L.hazard(18, 1); L.hazard(20, 1); L.hazard(22, 2);
  L.section(24, 'learn_low', 1);
  L.hazard(24, 1, { type: 'spike_low' }); L.hazard(26, 1, { type: 'spike_low' });
  L.hazard(28, 2); L.hazard(30, 2, { type: 'spike_low' }); L.hazard(32, 2);
  L.hazard(34, 1); L.hazard(35, 1);
  L.section(36, 'breath', 0);
  L.section(40, 'learn_block', 2);
  L.blockUp(40, 44, 1); L.hazard(42, 1, { y: 1 });
  L.hazard(46, 1);
  const b1 = L.blockUp(48, null, 1);                          // 계단 1 → 2
  const b2 = L.blockUp(50, 54, 2, { y0: 1 });
  b1.w = r2(b2.x - b1.x);
  L.hazard(56, 2);
  L.section(58, 'breath', 0);
  L.section(62, 'build', 1);                                  // 드롭 앞 2박 픽업 (30-art 숨 고르기 2~4박)
  L.section(64, 'drop', 3);
  L.hazard(64, 1); L.hazard(65, 1); L.hazard(66, 2); L.hazard(68, 1, { type: 'spike_low' }); L.hazard(69, 1); L.hazard(70, 2);
  L.blockUp(72, 76, 1); L.hazard(74, 1, { y: 1 });
  L.hazard(77, 1); L.hazard(78, 2);
  const a = L.blockUp(80, null, 1);                           // 블록 → 틈(바닥 장애물) → 블록
  a.w = r2(L.X(81) + 0.8 - a.x);
  const bb = L.blockUp(81, 84, 1, { y0: 1 });
  L.fill('spike', a.x + a.w, bb.x, 0);
  L.hazard(82, 1, { y: 1 });
  L.hazard(85, 2); L.hazard(86, 2, { type: 'spike_low' }); L.hazard(87, 1);
  L.section(88, 'outro', 0);
  return L;
}

// ============================================================ 레벨 2 (128 BPM, 보통 속도)
function level2() {
  const L = new LevelBuilder({
    id: '02', file: 'levels/02-level2.json', bpm: 128, lengthBeats: 128,
    intent: '발판 자동 점프, 천장 장애물(뛰지 말 것), 얇은 발판 위 달리기. 끝부분에 첫 3연속 장애물.',
    target: { stars: 2, expected_attempts: [10, 30], first_try_reach_pct: 15, clear_rate_10_tries: 0.3 },
  });
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 1); L.hazard(10, 2);
  L.blockUp(12, 15, 1); L.hazard(13, 1, { y: 1 });
  L.hazard(16, 2, { type: 'spike_low' }); L.hazard(18, 2); L.hazard(20, 1); L.hazard(21, 1); L.hazard(22, 2);
  L.cue('tut_drum', 22.5);
  L.section(24, 'learn_pad', 2);
  L.pad(24);                                                   // 안전한 첫 등장
  { const t = L.pad(26); L.blockUp(26, 30, 3, { traj: t }); L.hazard(28, 1, { y: 3 }); }
  { const t = L.pad(32); L.hazard(32, 3, { traj: t }); }       // 발판 믿고 넘기
  { const t = L.pad(34); L.blockUp(34, 36, 3, { traj: t }); }
  L.hazard(37, 2); L.hazard(38, 1);
  L.section(40, 'breath', 0);
  L.cue('tut_hanging', 41);
  L.section(44, 'learn_ceiling', 2);
  L.fill('spike_ceiling', L.X(44), L.X(47), 2);                // 그냥 지나가면 안전
  L.hazard(48, 1); L.fill('spike_ceiling', L.X(49), L.X(51), 2);
  L.hazard(51, 2);
  L.blockUp(52, 56, 1); L.fill('spike_ceiling', L.X(53), L.X(55.5), 3);   // 블록 위, 뛰면 죽음
  L.hazard(57, 1); L.hazard(58, 2);
  L.section(60, 'breath', 0);
  L.cue('tut_string', 61);
  L.section(64, 'learn_platform', 2);
  { const p1 = L.platformUp(64, 67, 1);
    const p2 = L.platformUp(67, 70, 1, { y0: 2 });
    L.hazard(69, 1, { y: 2 });
    L.fill('spike', p1.x + 2, p2.x + p2.w - 2, 0); }
  { const t = L.pad(72); const p3 = L.platformUp(72, 75, 2, { traj: t }); L.hazard(74, 1, { y: 3 });
    L.fill('spike', p3.x + 1.5, p3.x + p3.w - 2.5, 0); }
  L.hazard(77, 2); L.hazard(78, 2, { type: 'spike_low' });
  L.section(80, 'drop', 3);
  L.hazard(80, 1); L.hazard(81, 1); L.hazard(82, 2); L.hazard(83, 1);
  L.blockUp(84, 88, 1); L.fill('spike_ceiling', L.X(85), L.X(87.5), 3);
  { const t = L.pad(89); L.blockUp(89, 92, 3, { traj: t }); L.hazard(91, 1, { y: 3 }); }
  L.hazard(93.5, 3);                                           // 첫 3연속
  L.section(95, 'build', 1);                                   // 장애물 있는 저강도 구간 (숨 고르기 아님)
  { const p = L.platformUp(96, 98, 1);
    L.blockUp(98, 101, 3, { y0: 2 }); L.hazard(100, 1, { y: 3 });
    L.fill('spike', p.x + 2, p.x + p.w + 1.5, 0); }
  L.hazard(102, 2); L.hazard(103, 1); L.hazard(104, 1, { type: 'spike_low' }); L.hazard(105, 2);
  { const t = L.pad(106); L.hazard(106, 3, { traj: t }); }
  L.hazard(108, 2); L.hazard(109, 1); L.hazard(110, 3);
  L.section(112, 'outro', 0);
  return L;
}

// ============================================================ 레벨 3 (140 BPM, 속도 변화)
function level3() {
  const L = new LevelBuilder({
    id: '03', file: 'levels/03-level3.json', bpm: 140, lengthBeats: 160,
    intent: '공중 재점프 트리거, 속도 변경(느림→보통→빠름→보통). 앞 레벨 기믹 전부 조합.',
    target: { stars: 3, expected_attempts: [20, 60], first_try_reach_pct: 10, clear_rate_10_tries: 0.1 },
  });
  L.speed(40, 'slow'); L.speed(56, 'normal'); L.speed(80, 'fast'); L.speed(128, 'normal');
  L.section(0, 'intro', 0);
  L.section(8, 'review', 1);
  L.hazard(8, 1); L.hazard(10, 2);
  L.blockUp(12, 15, 1); L.hazard(13, 1, { y: 1 });
  { const t = L.pad(16); L.blockUp(16, 19, 3, { traj: t }); }
  L.hazard(20, 2); L.hazard(21, 1);
  L.fill('spike_ceiling', L.X(22), L.X(23.5), 2);
  L.cue('tut_ring', 22);
  L.section(24, 'learn_orb', 2);
  // 안전한 첫 등장: 단일 장애물 위에 트리거. 눌러도 안 눌러도 산다 (verify의 optional 검사)
  { const t = L.traj(24, { orbs: [24.5] }); L.orb(t, 24.5); L.hazard(24, 1); }
  { const t = L.traj(27, { orbs: [27.5] }); L.orb(t, 27.5); L.hazard(27, 4, { traj: t }); }
  { const t = L.traj(29, { orbs: [29.5] }); L.orb(t, 29.5); L.hazard(29, 5, { traj: t }); }
  { const t = L.traj(32, { orbs: [32.5] }); L.orb(t, 32.5); const p = L.platformUp(32, 36, 2, { traj: t }); L.hazard(34, 1, { y: 3 });
    L.fill('spike', p.x + 1, p.x + p.w - 1.5, 0); }
  L.hazard(37, 2); L.hazard(38, 1);
  L.cue('tut_tempo', 38.5);
  L.section(40, 'slow', 2);
  L.hazard(41, 1); L.hazard(42, 1); L.hazard(43, 2);
  { const p = L.platformUp(44, 47, 1);
    L.fill('spike_ceiling', p.x + 1.5, L.X(46.5), 4);
    L.fill('spike', p.x + 1.5, p.x + p.w - 1.5, 0); }
  L.hazard(48, 1, { type: 'spike_low' }); L.hazard(49, 1);
  { const t = L.traj(50, { orbs: [50.5] }); L.orb(t, 50.5); L.hazard(50, 3, { traj: t }); }
  { const t = L.pad(52); L.blockUp(52, 55, 3, { traj: t }); L.hazard(54, 1, { y: 3 }); }
  L.section(56, 'normal', 2);
  L.hazard(57, 2); L.hazard(58, 1); L.hazard(60, 3);           // 3연속 앞은 1박 비움
  L.section(62, 'breath', 0);
  L.section(64, 'combo', 3);
  { const t = L.traj(64, { orbs: [64.5] }); L.orb(t, 64.5); L.hazard(64, 5, { traj: t }); }
  { const t = L.pad(66); const t2 = L.traj(66, { kind: 'pad', orbs: [66.5] }); void t;
    // 높이 4 발판(윗면 4). 위에서 뛰면 머리 7.15로 HUD 띠에 걸리므로 발판 위에는 장애물을 두지 않는다 (20-balance 12장 화면 높이 예산)
    L.orb(t2, 66.5); const p = L.platformUp(66, 70, 3, { traj: t2 });
    L.fill('spike', p.x + 1, p.x + p.w - 1, 0); }
  L.hazard(71.5, 2);
  L.blockUp(72.5, 75.5, 1); L.fill('spike_ceiling', L.X(73.5), L.X(75), 3);
  L.hazard(76.5, 2);
  { const t = L.traj(78, { orbs: [78.5] }); L.orb(t, 78.5); L.hazard(78, 5, { traj: t }); }
  L.section(80, 'fast_drop', 4);
  // 빠름 문(80박) 직후 2박 비움 (속도 감각 재조정, 10-lore 레벨 3 기믹 힌트)
  L.hazard(82, 1); L.hazard(84, 3); L.hazard(86, 2, { type: 'spike_low' });
  { const b1 = L.blockUp(88, null, 1); L.hazard(90, 1, { y: 1 });
    const b2 = L.blockUp(92, 94, 2, { y0: 1 }); b1.w = r2(b2.x - b1.x); }
  { const t = L.pad(96); L.blockUp(96, 99, 3, { traj: t }); L.hazard(98, 2, { y: 3 }); }
  { const t = L.traj(100, { orbs: [100.5] }); L.orb(t, 100.5); L.hazard(100, 6, { traj: t }); }
  L.hazard(102, 1); L.hazard(103, 1); L.hazard(105, 2); L.hazard(107, 3);
  L.section(108, 'build', 1);                                  // 장애물 있는 저강도 구간 (숨 고르기 아님)
  { const p = L.platformUp(112, 115, 1); L.hazard(114, 1, { y: 2 });
    L.blockUp(115, 118, 3, { y0: 2 }); L.hazard(117, 1, { y: 3 });
    L.fill('spike', p.x + 2, p.x + p.w + 1.5, 0); }
  L.hazard(120, 2);
  { const t = L.traj(121, { orbs: [121.5] }); L.orb(t, 121.5); L.hazard(121, 5, { traj: t }); }
  L.hazard(124, 2); L.hazard(126, 3);
  L.section(128, 'finale', 3);
  L.hazard(129, 2); L.hazard(131, 1, { type: 'spike_low' });
  { const t = L.pad(132); L.blockUp(132, 135, 3, { traj: t }); L.hazard(134, 1, { y: 3 }); }
  L.hazard(136, 2);
  { const t = L.traj(137, { orbs: [137.5] }); L.orb(t, 137.5); L.hazard(137, 5, { traj: t }); }
  L.hazard(139, 1); L.hazard(140, 2); L.hazard(141, 1);
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
