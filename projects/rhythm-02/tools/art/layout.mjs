#!/usr/bin/env node
// rhythm-02 화면 배치 원본(assets/layout.json) 생성 + 4해상도 × 10레벨 검사. 30-art 4·5·6·7절. (round-2 "흘러오는 길" + 콤보)
//   node tools/art/layout.mjs            layout.json 쓰기 + 표 출력 + 목업 SVG(assets/mockup-play-*.svg) 쓰기
//   node tools/art/layout.mjs --check    layout.json 을 읽어 계산·검사만 (실패 시 종료 코드 1, 다른 역할 파일이 아직 v1 이면 "대기")
// 빌드는 assets/layout.json 의 식(계수)만 읽어 같은 식으로 계산합니다(문서 표 파싱 금지). 같은 식은 compute() 로 export.
// 박·시각·세상 위치의 원본은 balance(levels/*.json, balance.json, tools/sim/judge.mjs worldX·pxPerBeat·objectsAt) — 여기에는 그림 비율·연출 배분만.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ballSvg, cloudSvg, cloudGeom, fingerSvg, fingerBox, drumSvg, markSvg, roofSvg, roofGeom, branchSvg, branchGeom, marksUnder, hillSvg, comboSvg, comboWidth, SHAPE } from './cards.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '../..');
const OUT = join(PROJ, 'assets/layout.json');
const PAL = JSON.parse(readFileSync(join(PROJ, 'assets/palette.json'), 'utf8'));
// _ref 문구의 숫자는 balance.json 에서 읽음(문구만, 계산은 loadLevels 가 따로 읽음). 못 읽으면 '?'.
let BAL0 = {}; try { BAL0 = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8')); } catch {}
const bref = (path) => { const v = path.split('.').reduce((o, k) => (o == null ? o : o[k]), BAL0); return `balance.json ${path} (${v == null ? '?' : Number(v).toFixed(2)})`; };

export const LAYOUT = {
  schema_version: 3,
  _source: 'tools/art/layout.mjs 가 생성(art-director 원본). 30-art 4~7절 표는 이 식으로 계산한 요약. 단위 px(CSS px), W·H = 화면, S = min(W,H), d = 공 지름. 박·시각·세상 위치 원본은 balance(levels/*.json, balance.json scroll·objects, tools/sim/judge.mjs worldX·pxPerBeat·objectsAt·comboEvents)이고 여기에는 그림 비율·연출 배분만 둠. round-2: 북·공 0.30 W, 오른쪽에서 흘러오는 바닥 길·박 표시·물체, HUD 띠(모든 세계 물체 윗선 ≥ HUD 띠 아래, M2 일반화), 콤보 자리.',
  ball: { d_of_S: 0.078, d_of_S_landscape: 0.066, d_min: 24, d_max: 44, outline_of_d: 0.08, shine: { r_of_radius: 0.62, from_deg: 200, to_deg: 255, w_of_d: 0.12 },
    _d: 'd = round(clamp(k·S, d_min, d_max)), k = 세로 d_of_S, 가로 d_of_S_landscape. 공 x = 북 가운데(drum_x).' },
  drum: { x_ratio_ref: bref('scroll.drum_x_ratio'), w_of_d: 3.2, h_of_d: 0.95, skin_h_of_d: 0.28, rx_of_d: 0.3, outline_of_d: 0.08, tap_lift_of_d: 0.22, tap_ms: [50, 70],
    leg_w_of_d: SHAPE.leg.w_of_d, twoball_x_of_d: 0.78,
    _tap: '탭마다 북 전체가 tap_lift 만큼 올라갔다(50 ms, ease-out) 내려옴(70 ms, ease-in) = 120 ms(balance drum_pop_ms). 이른 통과 탭(접촉 전)은 올라간 자세를 접촉 시각까지 유지했다가 공이 떠날 때 함께 내려옴(N4: 공이 멈춘 북에서 혼자 튀지 않게, tap_motion.early_hold).',
    _leg: '북 가운데 아래 다리(북 몸통 색, 너비 0.22d)가 북 아랫변에서 길(lane_y)까지. 박 표시가 이 다리 밑에 오는 순간 = 공이 가죽에 닿는 순간 = 탭.' },
  portrait: { skin_y_of_H: 0.76 },
  landscape: { floor_h_of_H: 0.11, floor_h_min: 40 },
  play_height: {
    top_margin: 6, apex_margin: 4, apex_budget: 1.111,
    cloud_edge_of_Hp: 0.9,
    _def: '놀이 높이 Hp = (skinY − (safeTop + top_margin) − d − apex_margin) / apex_budget (1-2 D5 공통 정의, round-2 그대로). 공 높이 h = 공 아랫점과 북 가죽 윗면 사이. 구름선 = h = 0.9·Hp(공 아랫점이 그 위면 숨음 — 숨은 공은 그리지 않음). 구름 통 꼭짓점(1.111·Hp)은 숨은 상태라 HUD 띠와 겹쳐도 그려지지 않음. 보이는 공 윗점 최고 = 구름선 − d ≥ HUD 띠 아래(검사).',
  },
  hud: {
    _rule: 'HUD 띠 = 화면 위 [safeTop, safeTop + band_h]. 글·숫자 없음. 플레이 중 버튼은 멈춤 하나. 흘러오는 모든 물체(구름·지붕·가지·언덕·배경 실루엣)와 보이는 공의 윗선 ≥ HUD 띠 아래 + gap(4해상도 검사, M2 일반화 — round-1 "구름 윗부분이 진행도 막대 뒤로 가도 됨" 문장 삭제). 콤보 표시·단계 연출도 이 띠 안에서만.',
    band_h: { portrait: 56, landscape: 48 }, gap_below_band: 2,
    pause: { x: 12, y: 4, size: 44, touch: { x: 10, y: 2, size: 48 } },
    bar: { x0: 68, x1_from_right: 20, y: 10, h: 10, best_r: 6 },
    attempts: { cy: 31, x0: 72, dot_r: 4, pitch: 12, big_r: 6, big_pitch: 16, per_big: 10, max_big_shown: 4,
      _dots: '시도마다 작은 점 1개(drumBody). 10개가 차면 큰 점 1개로 묶음. 숫자 없음.' },
    practice: { flag_x: 70, flag_h: 14, bar_shift_px: 22, text: 'text_slots.practice_on(레벨 시작 2 s, 게임 시간)', _rule: '연습 모드일 때만 막대 왼쪽 끝에 작은 깃발(막대는 22 px 오른쪽에서 시작). HUD 안에 글 없음.' },
    aria: { bar: 'aria_progress', best: 'aria_best', dots: 'aria_attempts', flag: 'aria_checkpoint', pause: 'btn_pause', combo: 'aria_combo' },
    combo_a11y: { role: 'meter', name: 'aria_combo', valuenow: '지금 콤보', valuetext: '숫자만(예 "7", 퍼센트로 읽히지 않게)', live: 'none(판정마다·끊김 때 읽지 않음)', _src: 'R2-D7 · insights runner-01 콤보 대체 글' },
  },
  combo: {
    source: 'balance.json combo + tools/sim/judge.mjs comboEvents(L, result) — 값·시각 원본은 balance(별도 상태 없이 grades 길이)',
    place: { portrait: { row: 3, align: 'left', x: 68, cy: 47 }, landscape: { row: 2, align: 'right', x_from_right: 20, cy: 31 } },
    shape: { slot_px: SHAPE.combo.slot_px, slot_gap_px: SHAPE.combo.slot_gap_px, ten_px: SHAPE.combo.ten_px, ten_gap_px: SHAPE.combo.ten_gap_px, group_gap_px: SHAPE.combo.group_gap_px, slots: 10, tens_max_layout: 3, rx_px: 2,
      fill: { slot_empty: 'hudTrack + ink 1.4 px', slot_on: 'ink', ten: 'glow + ink 2 px (둥근 네모, 별 아님)' } },
    show_from: 2,
    update: { scale: [1, 1.15, 1], ms: 120, at: '판정 프레임(hit = 친 순간, hold = roof_out)' },
    stage: {
      '5': { fx: '5번째 칸만 1.0 → 1.3 → 1.0, 120 ms', sound: null },
      '10': { fx: '점 10개가 큰 표지 자리로 0.25 s 미끄러지며 작아지고 큰 표지가 0.6 → 1.0 (0.4 s 합), 점 줄 비움', sound: 'chord_1 (balance chord_timing, R2-D2: 그 판정 접촉 박 다음 정박 중 어떤 접촉의 [놓침 구역 시작, 통과 창 끝]에도 들지 않고 지붕 착지 ±1박도 아닌 첫 정박 — sound-check 가 검사)' },
      '20': { fx: '10 과 같음 + 그 레벨 accent 색 네모 조각 5개(4 px)가 HUD 띠 안에서 띠 아래 6 px 위까지 내려옴(0.6 s)', sound: 'chord_2 (한 음 높은 화음)' },
      '30': { fx: '20 과 같음(자리만)', sound: 'chord_2' },
    },
    break: { fx: '실패 판정 순간부터 0.25 s 동안 점 줄·큰 표지가 제자리에서 1.0 → 0 으로 작아지며 사라짐(소리 없음)', within_s: 0.3, forbidden: ['✕', '경고음', '흔들림', '0 표시', '잃은 개수', '빨강'], restart: '1.1 s 뒤 빈 줄(콤보 1 까지는 안 보임)' },
    _rule: '숫자 없이 점 10칸 + 10마다 큰 표지(십의 자리 = 큰 표지 수). 콤보 2부터 보임. 공 색 ball·바탕 단계(바탕 전체 색 바뀜)와 모양·색이 겹치지 않음. 다가오는 길 영역 밖(S10). 지붕 밑 착지 ±1박에는 칸 채움·단계 연출 시작 없음(hold 는 roof_out 에 채움, S9).',
  },
  cloud: { base_of_h: SHAPE.cloud.base_of_h, bump_r_of_h: SHAPE.cloud.bump_r_of_h, bump_gap_of_r: SHAPE.cloud.bump_gap_of_r, below_edge_of_d: 0.3, side_margin_of_d: 0.8, outline_px: SHAPE.cloud.outline_px,
    _shape: '긴 구름(W2 구름 통·클리어 끝 구름 role clear): 윗선 = HUD 띠 아래 + gap, 아랫선 = 구름선(0.9·Hp) + 0.3d(공이 구름 속으로 들어가며 위부터 가려짐), 아래 띠 0.55h + 혹(반지름 0.45h, 간격 = 반지름) → 혹 사이 오목한 곳도 0.94h 덮음. 가로 = 레벨 물체 [beat_in, beat_out] 의 화면 x 에 양쪽 0.8d 를 더함(공이 숨는 동안 공 너비를 늘 덮음). 공은 늘 구름 뒤에 그림.' },
  world: {
    _rule: '세계 층(바닥 길·박 표시·물체·배경 실루엣·조약돌)만 오른쪽에서 흘러옴. 북·공·HUD·카드는 화면 고정. 화면 x 는 judge.mjs worldX(L, beat, t, W) 하나로(판정 시계와 같은 시계, 프레임 수와 무관). 물체는 화면 오른쪽 끝에서 미끄러져 들어옴(갑자기 나타남·사라짐·깜빡임 없음). 번쩍임·흔들림·속도선·잔상 없음.',
    lane: { dy_of_d: 0.6, _rule: '길(lane) = 바닥 띠 위쪽 줄 y = floorTop + 0.6d. 박 표시가 이 줄 위를 흐름. 북 다리가 이 줄까지 내려옴.' },
    mark: { w_of_d: SHAPE.mark.w_of_d, h_of_d: SHAPE.mark.h_of_d, outline_px: SHAPE.mark.outline_px, per: 'hit 접촉마다 하나(balance objects.mark), nogo 없음', absorb_ms: 120,
      _rule: '낮은 반원 돔, 북 몸통 색 + ink. 크기·색 하나(높이 정보 없음 — 간격이 시간). 친 순간 북 다리 밑에서 120 ms 동안 1 → 0 으로 작아짐(흡수). 실패하면 그 자리에 멈춤. 북을 지난 표시는 없음.' },
    roof: { under_ref: bref('objects.roof.under_of_Hp'), body_h_of_d: SHAPE.roof.body_h_of_d, dome_of_d: SHAPE.roof.dome_of_d, scallop_d_of_d: SHAPE.roof.scallop_d_of_d, outline_px: SHAPE.roof.outline_px, x: '[beat_in, beat_out] 그대로(여유를 더하지 않음 — 앞 hit 접촉 때 북 위에 오지 않게)',
      _rule: '지붕(W4 치지 마): 차양. 윗변은 둥글게 솟음(평평한 발판 아님), 넓은 세로 줄무늬 roof/roofStripe, 아래 가장자리 반원 물결 끝 = 아랫면(h = under_of_Hp·Hp). 그 밑에 공이 앉아 까딱 + 콩. 가시·뾰족·빨강·경고 표지 없음.' },
    branch: { under_ref: bref('objects.branch.under_of_Hp'), twig_h_of_d: SHAPE.branch.twig_h_of_d, leaf_len_of_d: SHAPE.branch.leaf_len_of_d, leaf_w_of_d: SHAPE.branch.leaf_w_of_d, leaf_gap_of_d: SHAPE.branch.leaf_gap_of_d, long_if_beats_ge: 1.5, side_margin_of_d: SHAPE.branch.side_margin_of_d, x: `R2-D9: 그린 가로 = balance objects [beat_in, beat_out] 그대로(balance 가 [첫 반박 접촉 − ${BAL0.objects?.branch?.cover_pre_beats ?? '?'}박, 마지막 반박 접촉 + ${BAL0.objects?.branch?.cover_post_beats ?? '?'}박]로 줌), 좌우 여유 0. 그 구간에 완전히 든 표시 = 2(가지)·4(긴 가지), 반쯤 걸친 표시 0 → 들어가는 표시(앞 비행 착지)·나가는 표시는 가지 밖에 완전히 — layout.mjs 4해상도 검사`,
      _rule: '가지(W5 낮은 가지 [beat_in, beat_out] < 1.5박, W7 긴 가지 ≥ 1.5박): 가로 줄기 + 렌즈 잎(원 아님), 그린 가로 = x 규칙(R2-D9, 들어가는 표시는 가지 밖에 완전히, 가지 밑 표시 수 = 톡 횟수). 긴 가지 = 레벨 objects long:true(없으면 1.5박 이상). 같은 모양 = 같은 행동(빠르게 톡톡), 길이·잎 수만 다름.' },
    hill: { top_ref: bref('objects.hill.top_of_Hp'), layer: 'back', outline_px: SHAPE.hill.outline_px, _rule: '큰 언덕(W6): 바닥 윗선에서 솟은 반타원, 꼭대기 h = top_of_Hp·Hp(공 높이 기준), 북·공 뒤에 그림. 공이 언덕 위로 넘어가는 것처럼 보임.' },
    cloud_ref: 'cloud 절',
    deco: { parallax_default: 0.5, tile: 'palette.json themes.<키>.silhouette(v2, 너비 = W 띠가 끝없이 이어짐)', pebbles: { color: 'floorEdge', w_of_d: 0.32, h_px: 3, dy_of_d: 0.45, gaps_of_W: [0.23, 0.17, 0.31, 0.29], parallax: 1.0, _rule: '바닥 띠 길 아래 짧은 조약돌 — 흐름 속도감(박 격자가 아닌 엇간격, 표시보다 약한 대비)' } },
    scroll_stop: { ref: 'clear_sequence.scroll_stop_beat', ease_beats: 1, draw_only: true, curve: 'drawn = stop − 1 + u − u²/4, u = scrollBeatAt − (stop − 1) 을 감속 없이 이어 센 박(0 ~ 2), u ≥ 2 면 stop', _rule: 'R2-D5: 클리어 뒤 길 멈춤 감속은 빌드 그리기만(judge.mjs scrollBeatAt·worldX 판정 쪽은 바꾸지 않음, 판정이 끝난 뒤). 마지막 1박 거리를 2박 시간에 걸쳐 속도 1 → 0 으로(속도 튐 없음). 끝 구름·공 숨김 검사는 이 그린 박으로 함' },
    restart_rewind: '실패 → 0.85 s(공 다시 나타남)와 같은 프레임에 세상 위치를 0박(연습 = 그 구절)으로 한 번에 되감음. 실패 순간~0.85 s 는 세상 멈춤',
    approach_rect: 'x ≥ 북 왼쪽 끝, y = HUD 띠 아래 ~ 길 아랫선(laneBottom). HUD·콤보·글 자리·손가락이 이 안에 그려지지 않음(S10)',
  },
  shadow: { w_of_d_contact: 1.0, w_of_d_far: 0.45, h_of_w: 0.28, _rule: '그림자 너비 = d·lerp(1.0, 0.45, min(1, h / Hp)). 구름 뒤에 있는 동안도 보임.' },
  bg_stage: { rule: 'n번째 받침 쉼(레벨 처음 = 1, 받침 쉼 P개) 이 시작할 때 단계 = 1 + round(2·(n − 1) / (P − 1)) (P = 1 이면 1). round-2: 받침 쉼이 2개인 레벨도 마지막 쉼에서 bg3 에 닿음(P=2: 1·3, P=3: 1·2·3, P=4: 1·2·2·3). 지붕 밑 쉼은 단계를 바꾸지 않음', blend: '그 받침 쉼 첫 마디 동안 선형 섞기(번쩍임 없음)', restart: '처음부터 = bg1, 연습 체크포인트 = 그 받침 쉼 단계 색으로 바로', clear: '그때 단계 → bg1, 1 s' },
  finger: { anchor: 'drum_left_floor', mirror: true, x: '북 왼쪽 끝 − 0.25·h − 2 px(손바닥이 북을 덮지 않게 좌우 뒤집음)', tip_dy_of_d: 0.4, h_of_d: 1.5, schedule: 'tools/sim/judge.mjs fingerSchedule(L, bal)', appear_grow_s: 0.15, hide: 'instant', press_start_min_ms_inside_pass: 20,
    _rule: 'round-2: 손가락은 북 왼쪽(지나간 쪽) 바닥을 누름 — 다가오는 길·표시를 가리지 않음. 시각은 fingerSchedule() 하나(숫자 hide_after_ms·press_ms 없음). 레벨 1 첫 접촉 1회만, 지붕 레벨에는 없음(S8).' },
  tap_motion: {
    depart: 'balance ballsAt(L, t, …, hits): 떠나는 시각 = max(성공 탭, 접촉 시각)',
    wait_on_skin_sq: 0.9, depart_sq_by_grade: { perfect: 0.75, good: 0.85, pass: 0.92 }, depart_sq_ms: 60,
    early_hold: { rule: '이른 통과(접촉 전 탭): 북 톡 올라가기 50 ms 뒤 올라간 자세로 접촉 시각까지 멈춤 → 접촉 시각에 공 납작·튐 선과 함께 70 ms 내려옴. 북 움직임 시작은 여전히 탭 프레임(1프레임 반응)', max_hold_ms: 'pass_early_ms(≤ 150)', _src: 'N4' },
    _rule: '공은 접촉 시각에 가죽에 닿고 통과 창 동안 가죽 위에서 납작(0.9) 기다리다 탭 순간 튀어 오름. 박 표시 흡수(120 ms)는 공이 떠나는 순간. 북 톡은 판정과 무관하게 매 탭.',
  },
  bounce_lines: { pairs_by_grade: { perfect: 2, good: 1, pass: 0 }, x_of_d: [0.74, 1.07], len_of_d: [0.45, 0.6], w_px: 3, rise_of_d: 0.35, dur_s: 0.18, max_extent_of_d: 1.6, area_max_of_screen: 0.05 },
  fail_fx: {
    late: { motion_s: 0.45, path: '가죽 위 납작하게 앉음(통과 창 동안) → 북 오른쪽 끝으로 굴러 바닥에 떨어짐 → 굴러 멈춤', side: 'right' },
    early: { motion_max_s: 0.6, roll_s: 0.2, swing_lines_s: 0.12, path: '헛스윙 바람선 2개 → 공은 같은 포물선으로 내려오며 북 왼쪽 옆으로 비껴 떨어져 굴러 멈춤', side: 'left', motion_rule: 'm = min(0.6, max(0.45, 남은 낙하 + 0.2)) = balance early_fall_rule' },
    bump_roof: { motion_s: 0.45, rise_s: 0.15, touch_sq: 0.85, side: 'right', path: '지붕 밑에 앉은 공을 친 탭: 북 톡과 함께 공이 0.15 s 동안 지붕 아랫면까지 떠 살짝 납작(0.85) 콩 닿음 → 북 오른쪽으로 떨어져 굴러 멈춤. 지붕은 움직이지 않음(흔들림·번쩍임 없음)', sound: 'roof_bump(아이 탭보다 작게, 부드러운 삼각파)' },
    world: '실패 순간 세상(길·표시·물체·배경)은 그 자리에 멈춤. 콤보는 0.25 s 안에 작아져 사라짐',
    two_balls: '예비(두 공 G5 내려감): 쓰면 round-1 규칙 그대로', no_dust: true,
  },
  restart_timeline_s: {
    _owner: 'balance.json restart(phases_s late·early·bump_roof)가 기준. 아래는 art 연출 배분. 실패 = 0, 자동, 총 1.1 s.',
    fail_motion: { late: [0, 0.45], early: [0, 'm (0.45~0.6)'], bump_roof: [0, 0.45] }, combo_break: [0, 0.25],
    hold: ['m', 0.85], reappear: [0.85, 1.1], world_rewind_at: 0.85, music_fade_out_s: 0.08, best_slide_s: 0.2, retry_hint: '첫 실패 시도에만 ↻ 그림, 정지 구간 전체', reappear_grow: [0.6, 1.0],
  },
  second_ball: { status: 'reserve(D-R2-1)', note: 'round-1 규칙 그대로(쓰면 다시 확인)' },
  clear_timeline: {
    source: 'balance clear_sequence + levels clear_sequence + level objects(type cloud, role clear) — 시간축·구름 자리 원본은 balance',
    rise_to_of_Hp: 1.0, cloud_blend_s: 1.0, cloud_blend_to: 'palette themes.<키>.clearCloud (cloud 와 accent 35 % 섞음 — N11)', bg_blend_s: 1.0, clear_sound_at: 'big_toss', slots_appear_at: 'big_toss', grade_grow_s: 0.25, grade_grow: [0.6, 1.0],
    hud_fade: '마지막 접촉 판정 확정(clearTimeMs) 때 0.2 s 게임 시간(콤보 줄도 같이)',
    result_at: 'length_beats',
    _rule: '큰 튐(판정 없음): 공이 스스로 1.0·Hp 까지 떠 끝 구름(role clear 물체, 길 멈춤 자리) 속에 머묾. 끝 구름 cloud → clearCloud 1 s(연한 테마색, 등급 칸 진한 accent 와 구분), 바탕 → bg1 1 s, 등급 칸 3개 점선 → 받은 칸 accent 채움.' },
  text_slots: {
    tut_tap: { font_px: 16, line_px: 22, max_lines: { portrait: 2, landscape: 4 },
      portrait: '바닥 띠 안, 길·손가락 아래: x 16 ~ W−16 가운데 맞춤, y = max(길 아랫선, 손가락 아랫선) + 8 ~ H − safeBottom − 8',
      landscape: '북 왼쪽 세로 칸: x 12 ~ 북 왼쪽 끝 − 8 왼쪽 맞춤, y = HUD 띠 아래 + 8 ~ 손가락 윗선 − 8',
      wrap: 'keep-all(낱말 중간 줄바꿈 없음)', _rule: '다가오는 길 영역 밖(S10), 플레이 물체 외곽선을 가로지르지 않음(N10). 가장 긴 언어로 검사.' },
    practice_on: '연습 모드 시작 2 s 동안 tut_tap 과 같은 자리(게임 시간)',
    clear_title: '등급 칸 줄 바로 위 한 줄(clear_title_1~3, L10 clear_last), 결과 화면에서만',
    level_name: '레벨 선택 카드에는 글 없음(aria-label). 이름은 클리어 화면 맨 위 작은 줄',
    best_combo_mark: '레벨 선택 카드: 최고 기록 막대(progressbar aria_best)와 최고 콤보 금빛 네모(meter aria_best_combo, 10마다 1개·0~2개·일반 모드만, valuetext 숫자만)는 화면에서는 카드 그림 위 그대로(막대 = 카드 아래쪽 안, 네모 = 카드 오른쪽 위), DOM 은 카드 버튼 안이 아니라 같은 칸의 버튼 옆 형제 요소로 겹쳐 둠(R2-D7 — 버튼 aria-label 안의 자식은 낭독되지 않음)',
    card_text: '그림 카드 대화 상자 위쪽 한 줄(card_*), 카드 그림 배율 계산에서 text_line_px 만큼 비워 둠',
    look_ball: '레벨 선택 오른쪽 위 밀림 표지(눈 + 공), 화면 글 없음',
    sound_late: '보호자 화면 소리 맞추기 줄 옆 같은 표지 + sound_late 글',
    text_line_px: 28 },
  grade_fx: { max_r_of_d: 1.6, area_max_of_screen: 0.05 },
};

export const RES = [[360, 640, 0, 0], [412, 915, 24, 34], [640, 360, 0, 0], [1280, 720, 0, 0]];
const LANG = { ko: (s) => [...s].reduce((a, ch) => a + (ch === ' ' ? 4.5 : /[ㄱ-힣]/.test(ch) ? 16 : 9), 0), en: (s) => [...s].reduce((a, ch) => a + (ch === ' ' ? 4.5 : /[A-Z]/.test(ch) ? 11 : 9), 0) };
// 글 줄 수 추정(16 px 굵은 글꼴, keep-all): 낱말 단위로 maxW 안에 채움. 한 낱말이 maxW 보다 길면 Infinity
export function textLines(s, maxW, lang) {
  const wd = LANG[lang], words = s.split(' ');
  let lines = 1, cur = 0;
  for (const w of words) { const ww = wd(w); if (ww > maxW) return Infinity; const add = cur ? wd(' ') + ww : ww; if (cur + add > maxW) { lines++; cur = ww; } else cur += add; }
  return lines;
}

export function compute(L, W, H, safeTop = 0, safeBottom = 0, drumXRatio = 0.3) {
  const S = Math.min(W, H), portrait = H > W;
  const k = portrait ? L.ball.d_of_S : (L.ball.d_of_S_landscape ?? L.ball.d_of_S);
  const d = Math.round(Math.max(L.ball.d_min, Math.min(L.ball.d_max, k * S)));
  const dw = L.drum.w_of_d * d, dh = L.drum.h_of_d * d;
  let skinY, floorTop;
  if (portrait) { skinY = Math.round(L.portrait.skin_y_of_H * H); floorTop = skinY + dh; }
  else { const fh = Math.max(L.landscape.floor_h_min, L.landscape.floor_h_of_H * H) + safeBottom; floorTop = H - fh; skinY = floorTop - dh; }
  const bandBottom = safeTop + (portrait ? L.hud.band_h.portrait : L.hud.band_h.landscape);
  const objTop = bandBottom + L.hud.gap_below_band;
  const topLimit = safeTop + L.play_height.top_margin;
  const Hp = (skinY - topLimit - d - L.play_height.apex_margin) / L.play_height.apex_budget;
  const cloudEdgeY = skinY - L.play_height.cloud_edge_of_Hp * Hp;
  const cloudBottom = cloudEdgeY + L.cloud.below_edge_of_d * d, cloudH = cloudBottom - objTop;
  const cx = Math.round(drumXRatio * W), drumLeft = cx - dw / 2;
  const laneY = floorTop + L.world.lane.dy_of_d * d, laneBottom = laneY + SHAPE.mark.h_of_d * d / 2 + 2;
  const c = 0.5 * Hp;
  const fingerH = L.finger.h_of_d * d, fingerX = drumLeft - 0.25 * fingerH - 2, fingerTip = laneY + L.finger.tip_dy_of_d * d;
  const fb = fingerBox(fingerX, fingerTip, fingerH, { mirror: true });
  const comboP = portrait ? L.combo.place.portrait : L.combo.place.landscape;
  const comboW = comboWidth(L.combo.shape.tens_max_layout);
  const comboX0 = comboP.align === 'left' ? comboP.x : W - comboP.x_from_right - comboW;
  const comboBox = { x0: comboX0, x1: comboX0 + comboW, y0: safeTop + comboP.cy - SHAPE.combo.ten_px / 2, y1: safeTop + comboP.cy + Math.max(SHAPE.combo.ten_px, SHAPE.combo.slot_px * 1.3) / 2 };
  const A = L.hud.attempts, attW = A.max_big_shown * A.big_pitch + 9 * A.pitch;
  const attBox = { x0: A.x0 - A.big_r, x1: A.x0 - A.big_r + attW, y0: safeTop + A.cy - A.big_r, y1: safeTop + A.cy + A.big_r };
  return { W, H, safeTop, safeBottom, portrait, S, d, dw, dh, skinY, floorTop, bandBottom, objTop, topLimit, Hp, cloudEdgeY, cloudBottom, cloudH, cx, drumLeft, laneY, laneBottom, c, fingerX, fingerTip, fingerH, fingerBox: fb, comboBox, attBox, comboP };
}

// ---------- 레벨 데이터(balance 원본, 읽기만) ----------
export async function loadLevels() {
  const bal = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
  const J = await import(pathToFileURL(join(PROJ, 'tools/sim/judge.mjs')).href);
  const dir = join(PROJ, 'levels');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  const levels = files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  const comp = levels.map((lv) => {
    const C = J.compileLevel(lv, bal);
    // 앞쪽 박: 레벨 scroll 이 원본. v1 레벨(scroll 없음)은 balance scroll.ahead_beats_by_level 로 계산하고 "대기" 표시
    const abl = bal.scroll?.ahead_beats_by_level || {};
    const id = String(lv.id).padStart(2, '0');
    const ahead = lv.scroll?.ahead_beats ?? abl[id] ?? abl.default ?? (Number(id) <= 4 ? 4 : 3.5);
    const fromLevel = lv.scroll?.ahead_beats != null;
    C.scroll = { drumX: lv.scroll?.drum_x_ratio ?? bal.scroll?.drum_x_ratio ?? 0.3, ahead };
    const flights = Object.values(C.flights).flat().map((f) => ({ ...f, dur: f.to - f.from, apex: J.flightApex(f.to - f.from, bal) }));
    return { lv, C, flights, fromLevel, v2: (lv.schema_version ?? 1) >= 2 };
  });
  return { bal, J, comp };
}

// 공 아랫점 높이(Hp 비율)가 박 위치 b 에 있을 때(비행 정해진 대로) — 물체 밑·위 검사용
const flightAtBeat = (C, f, beat) => { const t = beat * C.beatMs; if (t < f.from || t > f.to) return null; const s = (t - f.from) / (f.to - f.from); return 4 * f.apex * s * (1 - s); };

export function levelChecks(L, D) {
  const { bal, J, comp } = D;
  const out = []; let fail = 0, wait = 0;
  const ok = (name, pass, msg) => { out.push(`${pass ? 'OK  ' : 'FAIL'} ${name}: ${msg}`); if (!pass) fail++; };
  const pend = (name, msg) => { out.push(`대기 ${name}: ${msg}`); wait++; };
  let maxApex = 0, maxAt = '';
  for (const { lv, flights } of comp) for (const f of flights) if (f.apex > maxApex) { maxApex = f.apex; maxAt = `L${lv.id} ${f.kind} ${(f.dur / (60000 / lv.bpm)).toFixed(2)}박 @${lv.bpm}`; }
  ok('apex_budget', L.play_height.apex_budget >= Math.max(maxApex, L.clear_timeline.rise_to_of_Hp) - 0.001, `apex_budget ${L.play_height.apex_budget} ≥ 최대 꼭짓점 ${maxApex.toFixed(4)}(${maxAt})·클리어 튐 ${L.clear_timeline.rise_to_of_Hp}`);
  ok('drum_x = balance', Math.abs((bal.scroll?.drum_x_ratio ?? 0.3) - 0.3) < 1e-9, `balance.json scroll.drum_x_ratio ${bal.scroll?.drum_x_ratio} = 0.30 (layout·빌드 북 자리)`);
  for (const { lv, C } of comp) {
    const fs = J.fingerSchedule(C, bal);
    if (!fs) continue;
    const c = C.contacts[fs.contact], nx = C.contacts[fs.contact + 1];
    ok(`finger L${lv.id} 누름 시작`, fs.pressStart >= c.t - (C.judge.pass_early_ms - L.finger.press_start_min_ms_inside_pass) - 1e-6, `${fs.pressStart.toFixed(0)} ms ≥ 접촉 ${c.t.toFixed(0)} − (${C.judge.pass_early_ms} − ${L.finger.press_start_min_ms_inside_pass})`);
    if (nx) ok(`finger L${lv.id} 사라짐`, fs.gone <= nx.zoneStart, `gone ${fs.gone.toFixed(0)} ms ≤ 다음 접촉 놓침 구역 시작 ${nx.zoneStart.toFixed(0)} ms`);
    const roofs = (lv.objects || []).filter((o) => o.type === 'roof');
    ok(`finger L${lv.id} 지붕 레벨 아님(S8)`, !roofs.length, roofs.length ? `지붕 ${roofs.length}개 레벨에 손가락` : '지붕 없음');
  }
  ok('finger 숫자 없음', !('hide_after_ms' in L.finger) && !('press_ms' in L.finger), 'layout.json finger 에 hide_after_ms·press_ms 없음');
  let rMax = 0, rAt = '';
  for (const { lv, C } of comp) { const r = (C.judge.pass_early_ms + C.judge.miss_zone_ms) / 1000; if (r > rMax) { rMax = r; rAt = `L${lv.id}`; } }
  const E = L.fail_fx.early, m = Math.min(E.motion_max_s, Math.max(L.fail_fx.late.motion_s, rMax + E.roll_s));
  ok('fail early', rMax + E.roll_s <= E.motion_max_s && 0.85 - m >= 0.25, `남은 낙하 최대 ${rMax.toFixed(2)} s(${rAt}) + 0.2 = ${(rMax + E.roll_s).toFixed(2)} ≤ 0.6, 정지 ≥ ${(0.85 - m).toFixed(2)} s`);
  const bph = bal.restart?.phases_s?.bump_roof;
  if (bph) ok('fail bump_roof = balance', Math.abs(bph.bump_fx[1] - L.fail_fx.bump_roof.motion_s) < 1e-9 && L.fail_fx.bump_roof.rise_s < L.fail_fx.bump_roof.motion_s, `지붕 콩 움직임 ${L.fail_fx.bump_roof.motion_s} s = balance bump_fx ${bph.bump_fx.join('~')} s, 떠오름 ${L.fail_fx.bump_roof.rise_s} s`);
  else pend('fail bump_roof', 'balance restart.phases_s.bump_roof 없음');
  const brk = bal.combo?.break;
  if (brk) ok('콤보 끊김 ≤ 0.3 s, 소리 없음', L.restart_timeline_s.combo_break[1] <= brk.within_s && /silent/.test(brk.fx), `작아짐 ${L.restart_timeline_s.combo_break.join('~')} s ≤ ${brk.within_s} s (balance ${brk.fx}), 재시작 1.1 s 그대로`);
  else pend('콤보 끊김', 'balance combo.break 없음');
  for (const { lv, C, v2 } of comp) {
    const cs = lv.clear_sequence;
    const beat = 60 / lv.bpm;
    if (!cs) { pend(`clear L${lv.id}`, 'levels clear_sequence 없음(balance)'); continue; }
    const t0 = cs.big_toss_beat * beat, T = cs.big_toss_flight_s, apex = cs.big_toss_apex_play_heights;
    const cl = L.play_height.cloud_edge_of_Hp;
    const enter = apex > cl ? t0 + (T / 2) * (1 - Math.sqrt(1 - cl / apex)) : Infinity;
    const g = (cs.grade_cloud_beats || []).map((b) => b * beat);
    const buttons = cs.result_beat * beat + (cs.result_buttons_after_ms || 0) / 1000;
    const lastFill = g.length ? Math.max(...g) + L.clear_timeline.grade_grow_s : t0;
    const blendEnd = t0 + Math.max(L.clear_timeline.cloud_blend_s, L.clear_timeline.bg_blend_s);
    const pass = apex >= L.clear_timeline.rise_to_of_Hp - 1e-6 && apex <= L.play_height.apex_budget + 1e-3 && enter < (g[0] ?? Infinity) && lastFill <= buttons + 1e-6 && blendEnd <= cs.result_beat * beat + 1e-6 && g.length === 3;
    ok(`clear L${lv.id} 시간축`, pass, `큰 튐 ${cs.big_toss_beat}박 꼭짓점 ${apex}·Hp, 구름 들어감 +${(enter - t0).toFixed(2)} s < 첫 등급 칸 +${((g[0] ?? NaN) - t0).toFixed(2)} s, 마지막 칸 끝 ≤ 버튼, 섞기 끝 ≤ 결과, 등급 칸 3`);
    // 끝 구름: 공이 구름선을 넘는 순간(+enter)부터 북 위를 덮음(공 너비 + 여유)
    const goal = (lv.objects || []).find((o) => o.type === 'cloud' && o.role === 'clear');
    if (!v2 || cs.scroll_stop_beat == null || !goal) { pend(`clear L${lv.id} 끝 구름`, `레벨 v2 objects(cloud role clear)·scroll_stop_beat 대기 (v${lv.schema_version ?? 1})`); continue; }
    const stopB = cs.scroll_stop_beat, easeB = (b) => { const u = b - (stopB - 1); return u <= 0 ? b : u >= 2 ? stopB : stopB - 1 + u - (u * u) / 4; }; // R2-D5 그림만 감속
    const bAtEnter = easeB(enter / beat);
    const marginB = (L.cloud.side_margin_of_d - 0.5 - L.ball.outline_of_d) * 0 + 0; // 여유는 화면 px 로 아래 4해상도에서
    ok(`clear L${lv.id} 끝 구름 자리`, goal.beat_in <= bAtEnter + marginB && goal.beat_out >= Math.max(bAtEnter, cs.scroll_stop_beat), `끝 구름 [${goal.beat_in}, ${goal.beat_out}]박 ∋ 공이 숨는 순간 길 박 ${bAtEnter.toFixed(2)}·멈춤 박 ${cs.scroll_stop_beat} (그린 구름은 양쪽 +0.8d)`);
  }
  const stage = (n, P) => (P <= 1 ? 1 : 1 + Math.round((2 * n) / (P - 1)));
  const st = comp.map(({ lv }) => `L${lv.id} ${lv.phrases.map((_, n) => stage(n, lv.phrases.length)).join('')}`);
  ok('bg_stage', comp.every(({ lv }) => lv.phrases.length >= 2 && stage(lv.phrases.length - 1, lv.phrases.length) === 3), `1 + round(2(n−1)/(P−1)), 마지막 쉼 = bg3: ${st.join(' / ')}`);
  return { out, fail, wait, maxApex };
}

// 4해상도 × 레벨: 표시 간격 px, 물체 윗선·밑 공간, 구름 덮음, 한 화면 물체 수
export function worldChecks(L, D) {
  const out = []; let fail = 0, wait = 0;
  const ok = (name, pass, msg) => { out.push(`${pass ? 'OK  ' : 'FAIL'} ${name}: ${msg}`); if (!pass) fail++; };
  const pend = (name, msg) => { out.push(`대기 ${name}: ${msg}`); wait++; };
  const { bal, J } = D;
  const OB = bal.objects || {};
  const rows = [], crossBad = new Set();
  for (const [W, H, st, sb] of RES) {
    const g = compute(L, W, H, st, sb, bal.scroll?.drum_x_ratio ?? 0.3);
    let minGap = { px: 1e9 }, objBad = [], objCount = { checked: 0 }, minClear = { roof: 9, branch: 9 }; const branchRows = [], branchWait = [];
    for (const { lv, C, fromLevel, v2 } of D.comp) {
      const ppb = ((1 - C.scroll.drumX) * W) / C.scroll.ahead;
      const marks = C.contacts.filter((c) => c.kind !== 'nogo').map((c) => c.beat);
      for (let i = 1; i < marks.length; i++) { const px = (marks[i] - marks[i - 1]) * ppb; if (px < minGap.px) minGap = { px, at: `L${lv.id} ${(marks[i] - marks[i - 1])}박 × ${ppb.toFixed(1)} px/박(앞 ${C.scroll.ahead}박${fromLevel ? '' : ', balance 기본값'})` }; }
      if (!v2) continue;
      const flights = Object.values(C.flights).flat().map((f) => ({ ...f, apex: J.flightApex(f.to - f.from, bal) }));
      const halfB = (g.d / 2 + L.ball.outline_of_d * g.d) / ppb;
      for (const o of lv.objects || []) {
        objCount.checked++;
        let spanBeats = [o.beat_in - halfB, o.beat_out + halfB];
        if (o.type === 'branch') {
          const x0 = o.beat_in * ppb, x1 = o.beat_out * ppb;
          const u = marksUnder(marks.map((b) => b * ppb), x0, x1, g.d), want = o.long ? 4 : 2;
          branchRows.push(`L${lv.id}@${o.beat_in} ${u.full}/${want}`);
          if (u.full !== want || u.part || o.contacts.length !== want) objBad.push(`L${lv.id} 가지 [${o.beat_in},${o.beat_out}] 밑 표시 ${u.full}(기대 ${want}, 판정 ${o.contacts.length}) 반쯤 걸침 ${u.part} (R2-D9)`);
        }
        const under = flights.filter((f) => f.from / C.beatMs < spanBeats[1] && f.to / C.beatMs > spanBeats[0]);
        // 공(원, 반지름 r = d/2 + 외곽선)과 물체 아랫면: 그 순간 물체 가로 구간(북 가운데 기준) 안에서 원 윗선이 가장 높은 점(원 모양 그대로 — 가장자리 스침은 원 옆면 높이로)
        const r = g.d / 2 + L.ball.outline_of_d * g.d;
        const topOfFlightsPx = (fl) => Math.max(0, ...fl.map((f) => { let mx = 0; for (let b = Math.max(spanBeats[0], f.from / C.beatMs); b <= Math.min(spanBeats[1], f.to / C.beatMs); b += 0.01) { const h = flightAtBeat(C, f, b); if (h == null) continue; const xa = (o.beat_in - b) * ppb, xb = (o.beat_out - b) * ppb; const xs = xa <= 0 && xb >= 0 ? 0 : Math.min(Math.abs(xa), Math.abs(xb)); if (xs >= r) continue; mx = Math.max(mx, h * g.Hp + r + Math.sqrt(r * r - xs * xs) - g.d); } return mx; })) + g.d;
        if (o.type === 'roof') {
          const uR = o.under_of_Hp ?? OB.roof?.under_of_Hp ?? 0.45, underY = g.skinY - uR * g.Hp, rg = roofGeom(0, 100, underY, g.d);
          const top = rg.domeTop - (rg.bodyTop - rg.domeTop), clear = uR * g.Hp - topOfFlightsPx(under);
          if (top < g.objTop) objBad.push(`L${lv.id} 지붕 윗선 ${top.toFixed(0)} < HUD 띠 ${g.objTop}`);
          minClear.roof = Math.min(minClear.roof, clear / g.d); if (clear < 0.25 * g.d) objBad.push(`L${lv.id} 지붕 밑 공간 ${clear.toFixed(0)} px < 0.25d`);
        } else if (o.type === 'branch') {
          const uR = o.under_of_Hp ?? OB.branch?.under_of_Hp ?? 0.3, underY = g.skinY - uR * g.Hp, top = branchGeom(0, 100, underY, g.d).top, clear = uR * g.Hp - topOfFlightsPx(under);
          if (top < g.objTop) objBad.push(`L${lv.id} 가지 윗선 ${top.toFixed(0)} < HUD 띠`);
          minClear.branch = Math.min(minClear.branch, clear / g.d); if (clear < 0.25 * g.d) branchWait.push(`L${lv.id} 가지 [${o.beat_in},${o.beat_out}] 밑 공간 ${clear.toFixed(0)} px < 0.25d`);
        } else if (o.type === 'hill') {
          const tR = o.top_of_Hp ?? OB.hill?.top_of_Hp ?? 0.3;
          const minBottom = Math.min(...under.map((f) => { let mn = 9; for (let b = Math.max(o.beat_in, f.from / C.beatMs); b <= Math.min(o.beat_out, f.to / C.beatMs); b += 0.02) mn = Math.min(mn, flightAtBeat(C, f, b) ?? 9); return mn; }));
          if (minBottom < tR) objBad.push(`L${lv.id} 언덕 꼭대기 ${tR}·Hp > 그 구간 공 아랫점 ${minBottom.toFixed(2)}·Hp`);
        } else if (o.type === 'cloud') {
          // 공이 구름선 위(숨음)인 동안 그린 구름이 공 너비를 덮음: 그린 구름 = [beat_in, beat_out] + 양쪽 side_margin·d
          const mB = (L.cloud.side_margin_of_d * g.d - g.d / 2 - L.ball.outline_of_d * g.d) / ppb;
          for (const f of under) {
            const cl = L.play_height.cloud_edge_of_Hp; if (f.apex <= cl) continue;
            const s0 = (1 - Math.sqrt(1 - cl / f.apex)) / 2, b0 = (f.from + s0 * (f.to - f.from)) / C.beatMs, b1 = (f.to - s0 * (f.to - f.from)) / C.beatMs;
            if (o.role !== 'clear' && (o.beat_in - mB > b0 + 1e-6 || o.beat_out + mB < b1 - 1e-6)) objBad.push(`L${lv.id} 구름 [${o.beat_in},${o.beat_out}]+여유 가 숨는 구간 [${b0.toFixed(2)},${b1.toFixed(2)}]박을 못 덮음`);
          }
        }
      }
      // 한 화면 물체(앞쪽 보이는 길 안): 0.25박마다
      const lim = Number(lv.id) <= 6 ? 2 : 3;
      for (let b = 0; b < lv.length_beats; b += 0.25) {
        const vis = (lv.objects || []).filter((o) => o.type !== 'mark' && o.role !== 'clear' && o.beat_out >= b && o.beat_in <= b + C.scroll.ahead);
        const types = new Set(vis.map((o) => o.type)), roofs = vis.filter((o) => o.type === 'roof').length, clouds = vis.filter((o) => o.type === 'cloud').length;
        const mk = marks.filter((x) => x >= b && x <= b + C.scroll.ahead).length;
        if (types.size > lim || roofs > 1 || clouds > 1 || mk > 7) { crossBad.add(`L${lv.id} ${b}박: 물체 종류 ${[...types].join('+')}(≤${lim}) 지붕 ${roofs} 구름 ${clouds} 표시 ${mk}(≤7)`); break; }
      }
    }
    const gapOk = minGap.px >= (bal.scroll?.min_mark_gap_px ?? 32);
    if (!gapOk) fail++;
    rows.push({ g, minGap, gapOk });
    if (branchWait.length) pend(`가지 밑 공간 ${W}x${H}`, `balance 데이터(R2-D9 가지 덮는 구간 [첫 반박 − ${bal.objects?.branch?.cover_pre_beats}, 마지막 반박 + ${bal.objects?.branch?.cover_post_beats}]박 · 아랫면 ${bal.objects?.branch?.under_of_Hp}·Hp · 가지 뒤 나가는 비행)에서 나가는 공(원)이 가지 오른쪽 끝을 스침 — art 그림은 [beat_in, beat_out] 그대로: ${branchWait.slice(0, 6).join(' / ')}`);
    if (D.comp.some((x) => x.v2)) ok(`세계 물체 ${W}x${H}`, !objBad.length, objBad.length ? objBad.slice(0, 6).join(' / ') : `v2 물체 ${objCount.checked}개: 윗선 ≥ HUD 띠, 지붕 밑 공간 최소 ${minClear.roof.toFixed(2)}d·가지 밑 ${minClear.branch.toFixed(2)}d${branchWait.length ? '(0.25d 미만 → 위 대기 줄, balance 데이터)' : ''} (기준 ≥ 0.25d, 공은 원 모양 그대로 가장자리 스침 포함), 언덕 < 공, 구름 덮음, 한 화면 물체 상한 · 가지 밑 표시 = 톡 횟수·반쯤 걸침 0(R2-D9) ${branchRows.join(' ')}`);
  }
  if (D.comp.some((x) => x.v2)) out.push(crossBad.size ? `교차 한 화면 물체 상한(14-5, balance 배치 — 1-2 교차 리뷰): ${[...crossBad].join(' / ')}` : 'OK   한 화면 물체 상한(14-5): 물체 종류 ≤ 2(L1~L6)/3, 지붕 ≤ 1, 구름 ≤ 1, 표시 ≤ 7');
  if (!D.comp.some((x) => x.v2)) pend('세계 물체(지붕·가지·언덕·구름)·한 화면 상한', `levels/*.json 이 아직 schema v1(objects 없음) — balance v2 레벨이 오면 4해상도 검사`);
  return { out, fail, wait, rows };
}

// 화면 고정 검사(레벨 무관): HUD 띠·콤보·글 자리·손가락·구름 덮음·배경 실루엣 윗선
export function staticChecks(L, D) {
  let strings = null; try { strings = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8')); } catch {}
  const rows = []; let fail = 0;
  for (const [W, H, st, sb] of RES) {
    const g = compute(L, W, H, st, sb, D?.bal?.scroll?.drum_x_ratio ?? 0.3);
    const fx = Math.PI * (L.bounce_lines.max_extent_of_d * g.d) ** 2 / (W * H);
    const cg = cloudGeom(0, 300, g.cloudBottom, g.cloudH);
    const coverNeed = g.cloudEdgeY - g.d - L.ball.outline_of_d * g.d; // 공 아랫점이 구름선에 닿은 순간 공 윗점(외곽선 포함)
    const pz = L.hud.pause, bandOk = st + pz.y + pz.size <= g.bandBottom && st + pz.touch.y + pz.touch.size <= g.bandBottom + 2;
    // 배경 실루엣 윗선(가장 높은 곳)
    let silTop = { y: 1e9 };
    for (const [k, T] of Object.entries(PAL.themes)) for (const e of T.silhouette || []) {
      const S = g.S, base = e.anchor === 'floor' ? g.floorTop - e.dy * S : null;
      let top;
      if (e.anchor === 'sky') top = g.bandBottom + e.dy * S;
      else if (e.t === 'rect' || e.t === 'tri') top = base - e.h * S;
      else if (e.t === 'ellipse') top = base - e.ry * S;
      else if (e.t === 'diamond') top = base - e.h * S;
      else if (e.t === 'pinwheel') top = base - e.r * S;
      else if (e.t === 'sun') top = base - 2 * e.r * S;
      if (top < silTop.y) silTop = { y: top, at: `${k} ${e.what}` };
    }
    // 글 자리 tut_tap
    const TS = L.text_slots.tut_tap;
    let slot;
    if (g.portrait) { const y0 = Math.max(g.laneBottom, g.fingerBox.y1) + 8; slot = { x0: 16, x1: W - 16, y0, y1: H - sb - 8 }; }
    else slot = { x0: 12, x1: g.drumLeft - 8, y0: g.bandBottom + 8, y1: g.fingerBox.y0 - 8 };
    const maxLines = g.portrait ? TS.max_lines.portrait : TS.max_lines.landscape;
    const txt = strings?.tut_tap || {};
    const lines = Object.fromEntries(Object.entries(txt).map(([lang, s]) => [lang, textLines(s, slot.x1 - slot.x0, lang)]));
    const needH = Math.max(1, ...Object.values(lines)) * TS.line_px;
    const inApproach = (b) => b.x1 > g.drumLeft && b.y1 > g.bandBottom && b.y0 < g.laneBottom;
    const checks = {
      ball24: g.d >= 24,
      apexInside: g.skinY - L.play_height.apex_budget * g.Hp - g.d >= g.topLimit - 0.01,
      hudBand: bandOk && g.bar_ok !== false,
      visibleBallBelowHud: g.cloudEdgeY - g.d - L.ball.outline_of_d * g.d >= g.objTop,
      cloudCovers: cg.coverTop <= coverNeed + 1e-6 && g.cloudH >= 1.4 * g.d,
      comboInBand: g.comboBox.y0 >= st && g.comboBox.y1 <= g.bandBottom && g.comboBox.x1 <= W - 8,
      comboAttemptsApart: g.comboP.row === 3 ? g.comboBox.y0 >= g.attBox.y1 + 1 : g.comboBox.x0 >= g.attBox.x1 + 8,
      laneInside: g.laneBottom <= H - sb - 2,
      fingerOk: g.fingerBox.x0 >= 4 && g.fingerBox.x1 <= g.drumLeft - 1 && g.fingerBox.y1 <= H - sb - 1 && !inApproach(g.fingerBox),
      textSlot: strings ? slot.x1 - slot.x0 >= 100 && Object.values(lines).every((n) => n <= maxLines) && needH <= slot.y1 - slot.y0 && !inApproach(slot) : true,
      silBelowHud: silTop.y >= g.objTop - 0.5,
      fx5: fx <= L.bounce_lines.area_max_of_screen,
      floorThumb: H - g.floorTop >= (g.portrait ? 0.15 * H : 40),
    };
    for (const v of Object.values(checks)) if (!v) fail++;
    rows.push({ g, fx, cg, coverNeed, silTop, slot, lines, needH, checks, strings: !!strings });
  }
  return { rows, fail };
}

function mockup(L, W, H, scene) {
  const g = compute(L, W, H), C = PAL.common, T = PAL.themes[scene.theme];
  const o = Math.max(2, L.ball.outline_of_d * g.d), ppb = ((1 - 0.3) * W) / scene.ahead, X = (b) => g.cx + b * ppb;
  const s = [];
  s.push(`<rect width="${W}" height="${H}" fill="${T.bg1}"/>`);
  for (const e of T.silhouette || []) { if (e.t === 'rect') { const top = e.anchor === 'floor' ? g.floorTop - e.dy * g.S - e.h * g.S : g.bandBottom + e.dy * g.S; s.push(`<rect x="${(e.x * W).toFixed(1)}" y="${top.toFixed(1)}" width="${(e.w === 'full' ? W : e.w * g.S).toFixed(1)}" height="${(e.h * g.S).toFixed(1)}" fill="${T.sil}"/>`); } }
  s.push(`<rect x="0" y="${g.floorTop}" width="${W}" height="${H - g.floorTop}" fill="${T.floor}"/><rect x="0" y="${g.floorTop}" width="${W}" height="2" fill="${T.floorEdge}"/>`);
  for (const [i, gx] of L.world.deco.pebbles.gaps_of_W.entries()) s.push(`<rect x="${(W * (0.05 + L.world.deco.pebbles.gaps_of_W.slice(0, i).reduce((a, b) => a + b, 0))).toFixed(1)}" y="${(g.laneY + L.world.deco.pebbles.dy_of_d * g.d).toFixed(1)}" width="${(0.32 * g.d).toFixed(1)}" height="3" rx="1.5" fill="${T.floorEdge}"/>`);
  for (const ob of scene.objs || []) if (ob.type === 'hill') s.push(hillSvg(X(ob.b0), X(ob.b1), g.floorTop, 0.3 * g.Hp + g.dh, T.hill));
  s.push(drumSvg(g.cx, g.skinY, g.dw, g.dh, L.drum.skin_h_of_d * g.d, { d: g.d, legTo: g.laneY }));
  for (const b of scene.marks) if (X(b) < W + g.d) s.push(markSvg(X(b), g.laneY, g.d));
  const h = scene.ballH * g.Hp, top = g.skinY - h - g.d;
  const sw = g.d * (1 - 0.55 * Math.min(1, h / g.Hp));
  s.push(`<ellipse cx="${g.cx}" cy="${(g.skinY + L.drum.skin_h_of_d * g.d / 2).toFixed(1)}" rx="${(sw / 2).toFixed(1)}" ry="${(sw * 0.14).toFixed(1)}" fill="${C.shadow}"/>`);
  s.push(ballSvg(g.cx, top, g.d));
  for (const ob of scene.objs || []) {
    if (ob.type === 'roof') s.push(roofSvg(X(ob.b0), Math.min(W + 40, X(ob.b1)), g.skinY - 0.45 * g.Hp, g.d));
    if (ob.type === 'branch') s.push(branchSvg(X(ob.b0), X(ob.b1), g.skinY - 0.3 * g.Hp, g.d));
    if (ob.type === 'cloud') s.push(cloudSvg(X(ob.b0) - 0.8 * g.d, X(ob.b1) + 0.8 * g.d, g.cloudBottom, g.cloudH));
  }
  if (scene.finger) s.push(fingerSvg(g.fingerX, g.fingerTip, g.fingerH, true, 1, { mirror: true }));
  // HUD
  const st = 0, Hd = L.hud, bx1 = W - Hd.bar.x1_from_right;
  s.push(`<rect x="${Hd.bar.x0}" y="${st + Hd.bar.y}" width="${bx1 - Hd.bar.x0}" height="${Hd.bar.h}" rx="5" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>`);
  s.push(`<rect x="${Hd.bar.x0 + 2}" y="${st + Hd.bar.y + 2}" width="${((bx1 - Hd.bar.x0 - 4) * scene.progress).toFixed(1)}" height="${Hd.bar.h - 4}" rx="3" fill="${C.drumBody}"/>`);
  s.push(`<circle cx="${(Hd.bar.x0 + (bx1 - Hd.bar.x0) * 0.62).toFixed(1)}" cy="${st + Hd.bar.y + Hd.bar.h / 2}" r="${Hd.bar.best_r}" fill="${C.ball}" stroke="${C.ink}" stroke-width="2"/>`);
  for (let i = 0; i < scene.attempts; i++) s.push(`<circle cx="${Hd.attempts.x0 + i * Hd.attempts.pitch}" cy="${st + Hd.attempts.cy}" r="${Hd.attempts.dot_r}" fill="${C.drumBody}"/>`);
  const cp = g.comboP;
  s.push(comboSvg(cp.align === 'left' ? cp.x : W - cp.x_from_right, st + cp.cy, scene.combo, { align: cp.align }));
  const pz = Hd.pause;
  s.push(`<rect x="${pz.x}" y="${pz.y}" width="${pz.size}" height="${pz.size}" rx="13" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/><rect x="${pz.x + 14}" y="${pz.y + 12}" width="6" height="20" rx="3" fill="${C.ink}"/><rect x="${pz.x + 24}" y="${pz.y + 12}" width="6" height="20" rx="3" fill="${C.ink}"/>`);
  // 치수 표시(빌드에 그리지 않음)
  const yHp = g.skinY - g.Hp;
  s.push(`<g stroke="#D11" stroke-width="1" fill="none" stroke-dasharray="4 3"><line x1="0" y1="${g.bandBottom}" x2="${W}" y2="${g.bandBottom}"/><line x1="8" y1="${g.skinY}" x2="${W - 8}" y2="${g.skinY}"/><line x1="8" y1="${yHp.toFixed(1)}" x2="${W - 8}" y2="${yHp.toFixed(1)}"/><line x1="8" y1="${g.cloudEdgeY.toFixed(1)}" x2="${W - 8}" y2="${g.cloudEdgeY.toFixed(1)}"/><line x1="${g.cx}" y1="${g.bandBottom}" x2="${g.cx}" y2="${H}"/>`);
  if (scene.slot) { const r = staticChecks(L).rows.find((x) => x.g.W === W && x.g.H === H).slot; s.push(`<rect x="${r.x0}" y="${r.y0.toFixed(1)}" width="${(r.x1 - r.x0).toFixed(1)}" height="${(r.y1 - r.y0).toFixed(1)}"/>`); }
  s.push(`<rect x="${g.drumLeft.toFixed(1)}" y="${g.bandBottom}" width="${(W - g.drumLeft).toFixed(1)}" height="${(g.laneBottom - g.bandBottom).toFixed(1)}" stroke="#1A8" stroke-dasharray="2 4"/></g>`);
  s.push(`<g font-family="sans-serif" font-size="10" fill="#D11"><text x="${W - 150}" y="${g.bandBottom + 11}">HUD 띠 아래 y ${g.bandBottom}</text><text x="10" y="${g.skinY - 3}">북 가죽 h=0</text><text x="10" y="${(yHp - 3).toFixed(1)}">h = Hp ${g.Hp.toFixed(0)}px</text><text x="10" y="${(g.cloudEdgeY + 11).toFixed(1)}">구름선 0.9 Hp</text><text x="${g.cx + 4}" y="${H - 6}">북 0.30 W</text>${scene.slot ? `<text x="${scene.slotLabelX ?? 20}" y="${H - 6}">tut_tap 글 자리</text>` : ''}</g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<!-- rhythm-02 round-2 플레이 화면 목업 ${W}x${H} (tools/art/layout.mjs 생성, 손으로 고치지 않음). ${scene.note} 빨간 점선 = HUD 띠 아래·북 가죽·Hp·구름선·북 0.30 W, 초록 점선 = 다가오는 길 영역(S10: UI 금지), 빨간 상자 = 글 자리(빌드에 없음). 30-art 4절 -->\n${s.join('\n')}\n</svg>\n`;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/art/layout.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const L = args.includes('--check') ? JSON.parse(readFileSync(OUT, 'utf8')) : LAYOUT;
  if (!args.includes('--check')) {
    writeFileSync(OUT, JSON.stringify(L, null, 1) + '\n');
    writeFileSync(join(PROJ, 'assets/mockup-play-360x640.svg'), mockup(L, 360, 640, { theme: 'level05', ahead: 3.5, marks: [0.45, 4.45], ballH: 0.15, objs: [{ type: 'roof', b0: 0.85, b1: 3.85 }], progress: 0.35, attempts: 3, combo: 7, note: '레벨 5 색, 공 = 1박 비행 내려오는 중, 지붕(치지 마)이 다가옴(앞 3.5박), 콤보 7.' }));
    writeFileSync(join(PROJ, 'assets/mockup-play-640x360.svg'), mockup(L, 640, 360, { theme: 'level01', ahead: 4, marks: [0, 1, 2, 3, 4], ballH: 0, finger: true, slot: true, progress: 0.08, attempts: 1, combo: 2, note: '레벨 1 색, 첫 접촉: 표시가 북 다리 밑에 옴 + 손가락(북 왼쪽 바닥) + tut_tap 글 자리, 콤보 2.' }));
  }
  let D = null;
  try { D = await loadLevels(); } catch (e) { console.log(`대기: levels/·balance.json·tools/sim/judge.mjs 읽기 실패(balance 수정 중일 수 있음): ${e.message}`); }
  const S = staticChecks(L, D);
  console.log('| 해상도(safe 위/아래) | 공 d | 북 x·가죽 y | Hp | HUD 띠 아래 | 구름선 y / 구름 높이(덮음 필요 y ≥ 덮는 y) | 길 y | 손가락 상자 | tut_tap 자리(ko/en 줄) | 실루엣 최고 윗선 | 검사 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of S.rows) {
    const g = r.g, bad = Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k);
    console.log(`| ${g.W}x${g.H} (${g.safeTop}/${g.safeBottom}) | ${g.d} | ${g.cx}·${g.skinY.toFixed(0)} | ${g.Hp.toFixed(0)} | ${g.bandBottom} | ${g.cloudEdgeY.toFixed(0)} / ${g.cloudH.toFixed(1)} (${(g.cloudH / g.d).toFixed(2)}d, 공 윗점 ${r.coverNeed.toFixed(1)} ≥ 덮는 선 ${r.cg.coverTop.toFixed(1)}) | ${g.laneY.toFixed(0)} | x ${g.fingerBox.x0.toFixed(0)}~${g.fingerBox.x1.toFixed(0)} (북 왼쪽 ${g.drumLeft.toFixed(0)}) | ${r.slot.x0}~${r.slot.x1.toFixed(0)} × ${r.slot.y0.toFixed(0)}~${r.slot.y1.toFixed(0)} (${r.strings ? Object.entries(r.lines).map(([k, v]) => `${k} ${v}`).join('/') : '대기: strings'}) | ${r.silTop.y.toFixed(0)} (${r.silTop.at}) | ${bad.length ? 'FAIL ' + bad.join(',') : 'OK'} |`);
  }
  let total = S.fail, wait = 0;
  if (D) {
    const Wc = worldChecks(L, D);
    console.log(`\n레벨 ${D.comp.length}개(${D.comp.map((x) => `L${x.lv.id} v${x.lv.schema_version ?? 1} ${x.lv.bpm}BPM 앞${x.C.scroll.ahead}`).join(' · ')})`);
    console.log('| 해상도 | 가장 짧은 표시 간격 px (기준 ≥ 32) | 어디 |');
    console.log('|---|---|---|');
    for (const r of Wc.rows) console.log(`| ${r.g.W}x${r.g.H} | ${r.minGap.px.toFixed(1)} ${r.gapOk ? 'OK' : 'FAIL'} | ${r.minGap.at} |`);
    // round-1 항목(높이): 가장 짧은 튐 ≥ 1.2d, 구름 아닌 비행 공 윗점 ≤ 0.9·Hp, 숨는 시간 ≤ 1 s
    const cl = L.play_height.cloud_edge_of_Hp;
    for (const [W, H, st, sb] of RES) {
      const g = compute(L, W, H, st, sb);
      let shortest = { px: 1e9 }, topMax = { r: -1 }, hideMax = { s: 0 };
      for (const { lv, C, flights } of D.comp) for (const f of flights) {
        const px = f.apex * g.Hp, beats = +(f.dur / C.beatMs).toFixed(2);
        if (f.kind !== 'land' && px < shortest.px) shortest = { px, at: `L${lv.id} ${beats}박@${lv.bpm}` };
        if (f.apex <= cl) { const r = (px + g.d) / g.Hp; if (r > topMax.r) topMax = { r, at: `L${lv.id} ${beats}박` }; }
        else { const hs = (f.dur / 1000) * Math.sqrt(1 - cl / f.apex); if (hs > hideMax.s) hideMax = { s: hs, at: `L${lv.id}` }; }
      }
      const okS = shortest.px >= 1.2 * g.d, okT = topMax.r <= cl, okH = hideMax.s <= D.bal.height.max_hidden_s;
      if (!okS || !okT || !okH) total++;
      console.log(`${okS && okT && okH ? 'OK  ' : 'FAIL'} 높이 ${W}x${H}: 가장 짧은 튐 ${shortest.px.toFixed(1)} px = ${(shortest.px / g.d).toFixed(2)}d (${shortest.at}, ≥ 1.2d) · 구름 아닌 공 윗점 ${topMax.r.toFixed(3)}·Hp (${topMax.at}, ≤ 0.9) · 숨는 시간 ${hideMax.s.toFixed(2)} s (${hideMax.at}, ≤ 1)`);
    }
    for (const x of Wc.out) console.log(x);
    const lc = levelChecks(L, D);
    for (const x of lc.out) console.log(x);
    total += Wc.fail + lc.fail; wait += Wc.wait + lc.wait;
  } else { wait++; }
  console.log(total ? `layout FAIL ${total}${wait ? ` (대기 ${wait})` : ''}` : `layout OK (HUD 띠·콤보 자리·구름 덮음·보이는 공·실루엣 윗선 ≥ HUD 띠, 글 자리·손가락 길 영역 밖, 표시 간격 ≥ 32 px 4해상도, 높이 round-1 항목${wait ? ` — 대기 ${wait}: balance v2 레벨` : ''})`);
  process.exit(total ? 1 : 0);
}
