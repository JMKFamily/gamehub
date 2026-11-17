#!/usr/bin/env node
// rhythm-02 화면 배치 원본(assets/layout.json) 생성 + 4해상도 × 10레벨(실제 BPM) 계산 검사. 30-art 4·5·7절.
//   node tools/art/layout.mjs            layout.json 쓰기 + 표 출력 + 목업 SVG(assets/mockup-play-*.svg) 쓰기
//   node tools/art/layout.mjs --check    layout.json 을 읽어 계산·검사만 (실패 시 종료 코드 1)
// 빌드는 assets/layout.json 의 식(계수)만 읽어 같은 식으로 계산합니다(문서 표 파싱 금지). 같은 식은 compute() 로 export.
// BPM·비행·판정 값은 박아 두지 않고 levels/*.json + balance.json 을 tools/sim/judge.mjs 로 읽습니다(읽기만, balance 원본).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '../..');
const OUT = join(PROJ, 'assets/layout.json');
const PAL = JSON.parse(readFileSync(join(PROJ, 'assets/palette.json'), 'utf8'));
import { ballSvg, cloudSvg, fingerSvg } from './cards.mjs';

export const LAYOUT = {
  schema_version: 2,
  _source: 'tools/art/layout.mjs 가 생성(art-director 원본). 30-art 4·5·7절 표는 이 식으로 계산한 요약. 단위 px(CSS px), W·H = 화면, S = min(W,H), d = 공 지름. 시각·박 값의 원본은 balance(levels/*.json, balance.json, tools/sim/judge.mjs)이고 여기에는 그림 비율·연출 배분만 둠.',
  ball: { d_of_S: 0.078, d_of_S_landscape: 0.066, d_min: 24, d_max: 44, outline_of_d: 0.08, shine: { r_of_radius: 0.62, from_deg: 200, to_deg: 255, w_of_d: 0.12 },
    _d: 'd = round(clamp(k·S, d_min, d_max)), k = 세로 화면 d_of_S, 가로 화면 d_of_S_landscape(1-2 D5: 가로 화면 공 하한 24 px — 640x360 에서 24 px, 놀이 높이를 키워 반박 꼭짓점 ≥ 1.2d)' },
  drum: { w_of_d: 3.2, h_of_d: 0.95, skin_h_of_d: 0.28, rx_of_d: 0.3, outline_of_d: 0.08, tap_lift_of_d: 0.22, tap_ms: [50, 70],
    twoball_x_of_d: 0.78, _tap: '탭마다 북 전체가 tap_lift 만큼 올라갔다(50 ms, ease-out) 내려옴(70 ms, ease-in). 합 120 ms = balance drum_pop_ms' },
  portrait: { skin_y_of_H: 0.76, hud_h: 60 },
  landscape: { floor_h_of_H: 0.11, floor_h_min: 40, hud_h: 52 },
  play_height: {
    top_margin: 6, apex_margin: 4, apex_budget: 1.111,
    cloud_edge_of_Hp: 0.9,
    _def: '놀이 높이 Hp = (skinY − (safeTop + top_margin) − d − apex_margin) / apex_budget (1-2 D5: 이 식이 balance·art 공통 정의). 공 높이 h = 공 아랫점과 북 가죽 윗면 사이 거리(h = 0 이 접촉). 높이 식(balance): h_apex = c × 비행 길이(s), c = 0.5·Hp/s. apex_budget 1.111 = 10레벨 모든 비행(토스 포함)의 최대 꼭짓점(L3 구름 통 108 BPM 4박 = 1.111·Hp)과 같게 잡아, 그 공 윗점이 화면 위 여백 안에 들어감. 클리어 튐(clear_timeline)은 1.0·Hp 에서 멈춤. 검사가 levels 에서 최대 꼭짓점을 다시 계산해 apex_budget 이상이면 실패. 구름 아랫선 = h = cloud_edge·Hp(공 아랫점이 그 위면 공 전체가 구름 뒤). 구름 통이 아닌 비행은 공 윗점(h + d)이 구름 아랫선 아래.',
  },
  cloud: { w_of_h: 2.6, w_max_of_W: 0.62, base_h_of_h: 0.5, bumps: [[-0.26, 0.36], [0.02, 0.5], [0.28, 0.32]], bump_r_max_of_w: 0.2, outline_of_d: 0.08,
    _shape: '아랫변이 평평한 둥근 사각형(높이의 50 %) + 원 3개(중심 x = 너비 비율, 중심 y = 아랫변 − 0.5·높이, 반지름 = min(높이 비율, 0.5·높이, 0.2·너비) — 원이 아랫변 밑으로 나오지 않음). 구름은 북 가운데 위. HUD 는 구름 위에 그림(구름 윗부분이 진행도 막대 뒤로 가도 됨).' },
  hud: { bar_x0: 72, bar_x1_from_right: 24, bar_y: 18, bar_h: 12, best_r: 7, dots_dy: 22, dot_r: 4, dot_gap: 12, dots_max: 10,
    pause: { x: 12, y: 6, size: 48 }, aria: { bar: 'aria_progress', best: 'aria_best', dots: 'aria_attempts', flag: 'aria_checkpoint', pause: 'btn_pause' },
    _dots: '시도 점: 시도마다 작은 점 1개(drumBody). 10개가 차면 큰 점 1개(반지름 7)로 묶고 다시 작은 점부터. 숫자 없음. 플레이 HUD 버튼은 멈춤 하나(1-2 D11).' },
  shadow: { w_of_d_contact: 1.0, w_of_d_far: 0.45, h_of_w: 0.28, _rule: '그림자 너비 = d·lerp(1.0, 0.45, min(1, h / Hp)). 구름 뒤에 있는 동안도 그림자는 보임(G2: 내려올수록 커짐). 불투명 shadow 색, 북 가죽 위에만.' },
  bg_stage: { rule: 'n번째 받침 쉼(레벨 처음 = 1) 이 시작할 때 min(n, 3) 단계 색(bg1·bg2·bg3)', blend: '그 받침 쉼 첫 마디 동안 앞 단계 → 새 단계 선형 섞기(번쩍임 없음)', restart: '처음부터 = bg1, 연습 체크포인트 = 그 받침 쉼 단계 색으로 바로', clear: '그때 단계 → bg1, 1 s', _src: '1-2 D6. levels phrases[] 순서만으로 정해짐(stage 태그 없음)' },
  finger: { anchor: 'drum_right', dx_of_d: 0.7, h_of_d: 1.5, schedule: 'tools/sim/judge.mjs fingerSchedule(L, bal)', appear_grow_s: 0.15, hide: 'instant',
    _rule: '시각의 원본은 balance fingerSchedule() 하나(1-2 D4): from(토스 순간)에 0.15 s 커지며 나타남 → pressStart~pressEnd 누름 자세(양옆 짧은 선 2개) → 공을 친 순간 또는 gone(통과 창 끝) 중 이른 때 **바로 사라짐**(줄어드는 꼬리 없음, 다음 접촉 위험 구간과 겹침 0). 위치는 화면 고정이 아니라 북 기준(북 오른쪽 바닥 위, 손끝 = 바닥 윗선). 레벨 1 첫 접촉 1회만. 검사: 누름 시작 ≥ 접촉 − (pass_early − 20 ms), gone ≤ 다음 접촉 zoneStart, 숫자 hide_after_ms·press_ms 없음.', press_start_min_ms_inside_pass: 20 },
  tap_motion: {
    depart: 'balance ballsAt(L, t, …, hits): 떠나는 시각 = max(성공 탭, 접촉 시각)',
    wait_on_skin_sq: 0.9,
    depart_sq_by_grade: { perfect: 0.75, good: 0.85, pass: 0.92 }, depart_sq_ms: 60,
    _rule: '1-2 D3 "탭이 공을 올린다". 공은 접촉 시각에 가죽에 닿고, 통과 창 동안 가죽 위에서 납작(0.9)하게 기다리다 **탭 순간** 튀어 오름(그 순간 등급 납작 60 ms + 튐 선 + 탭 소리). 이른 통과(접촉 전 탭)는 북 톡·탭 소리는 탭 때, 공의 납작·튐 선·튀어 오름은 접촉 시각. 탭 없이 통과 창이 끝나면 떨어짐(fail_fx.late). 북 톡은 판정과 무관하게 매 탭.',
  },
  bounce_lines: { pairs_by_grade: { perfect: 2, good: 1, pass: 0 }, x_of_d: [0.74, 1.07], len_of_d: [0.45, 0.6], w_px: 3, rise_of_d: 0.35, dur_s: 0.18, max_extent_of_d: 1.6, area_max_of_screen: 0.05,
    _rule: '판정 반응 "튐 선"(1-1 의 물결 호를 바꿈 — rhythm-01 탭 물결 고리와 모양·이름이 겹치지 않게, 세로 감각 강조). 친 공의 x 중심 양옆 x_of_d 자리에서 가죽 윗면부터 위로 뻗는 짧은 세로 선 쌍, 0.18 s 동안 rise_of_d 만큼 올라가며 짧아져 사라짐. ink 3 px, 원호 없음.' },
  fail_fx: {
    late: { motion_s: 0.45, path: '가죽 위 납작하게 앉음(통과 창 동안) → 튕기지 않고 북 바깥쪽 끝으로 굴러 바닥에 떨어짐 → 굴러 멈춤', side: 'right' },
    early: { motion_max_s: 0.6, roll_s: 0.2, swing_lines_s: 0.12, path: '탭 순간 북 위 양옆 짧은 바람선 2개(헛스윙) → 공은 같은 포물선으로 그대로 내려오며 북 바깥쪽 옆으로 비껴(x: 0 → 북 끝 + 0.5d) 가죽에 닿지 않음 → 북 옆 바닥까지 떨어져 굴러 멈춤', side: 'left',
      motion_rule: '움직임 길이 m = min(motion_max_s, max(late.motion_s, r + roll_s)), r = 접촉 시각 − 탭 시각(남은 낙하) = balance restart.early_fall_rule 과 같은 식. r + roll_s > motion_max_s 이면 낙하를 빠르게 압축. 정지 구간이 m 만큼 줄어 총 1.1 s 유지. 바람선 0.12 s = balance phases_s.early.swing_fx' },
    two_balls: '실패한 공은 자기 쪽 바깥으로(왼 공 = 왼쪽, 오른 공 = 오른쪽, 일찍/늦음과 무관). 다른 공은 실패 순간 그 자리·모양에서 멈췄다가 reappear 시작(0.85 s)에 실패한 공과 같이 작아지며 사라짐. 튐 선·납작은 늘 친 공의 x 중심',
    no_dust: true,
    _src: '1-2 D9. 먼지·구름 퍼짐 없음(lore A5). 소리는 둘 다 fail 한 번' },
  restart_timeline_s: {
    _owner: 'balance.json restart(phases_s 일찍/늦음 두 판)가 기준(1-2 D9). 아래는 art 연출 배분. 실패 순간 = 0, 확인 버튼 없음, 자동. 총 1.1 s 고정.',
    fail_motion: { late: [0, 0.45], early: [0, 'm (0.45~0.6)'] },
    hold: ['m', 0.85], reappear: [0.85, 1.1], music_fade_out_s: 0.08, best_slide_s: 0.2, retry_hint: '첫 실패 시도에만 ↻ 그림, 정지 구간 전체(0.25~0.40 s)', reappear_grow: [0.6, 1.0],
  },
  second_ball: { source: 'levels/*.json phrases[].second_ball(enter_beats·hop_beats·hop_of_d·seat_x_of_d·ball1_to_left_beats·exit_beats·ball1_to_center_beats) — 시각·높이 원본은 balance',
    enter: { from: 'right_offscreen_floor', roll: 'enter_beats 시작 ~ (끝 − hop_beats): 바닥을 따라 일정 속도로 굴러 북 오른쪽 옆까지(회전 표시 없음)', hop: '마지막 hop_beats: 북 오른쪽 옆에서 포물선으로 hop_of_d(≤ 0.5d) 깡충 → 가죽 seat_x_of_d 자리에 앉으며 납작 0.92', ball1: 'ball1_to_left_beats 동안 가운데 → −twoball_x 로 미끄러짐(ease-in-out)', sound: null },
    exit: { path: 'exit_beats: 앉은 자리에서 북 오른쪽 끝까지 굴러 떨어져(0.95d) 바닥을 따라 화면 오른쪽 밖으로', ball1: 'ball1_to_center_beats 동안 −twoball_x → 가운데로', sound: null },
    _src: '1-2 D13. 북 높이 0.95d 라 굴러서는 못 올라가므로 끝에 낮게 깡충(≤ 0.5d). 들어옴·나감 시각은 balance 레벨 데이터(받침 쉼 안). 토스 전까지 두 공 모두 박마다 까딱 + 콩. 연습 체크포인트가 두 공 구절이면 다시 시작할 때 같은 들어옴.' },
  clear_timeline: {
    source: 'balance.json clear_sequence + levels/*.json clear_sequence(big_toss_beat = 마지막 착지, big_toss_flight_s, big_toss_apex_play_heights, grade_cloud_beats, result_beat, result_buttons_after_ms) — 시간축 원본은 balance(1-2 D10). art 는 그 안의 그림만',
    rise_to_of_Hp: 1.0, cloud_blend_s: 1.0, bg_blend_s: 1.0, clear_sound_at: 'big_toss', slots_appear_at: 'big_toss', grade_grow_s: 0.25, grade_grow: [0.6, 1.0],
    hud_fade: '마지막 접촉 판정 확정(통과 창 끝 clearTimeMs) 때 0.2 s 게임 시간',
    result_at: 'length_beats',
    _rule: '큰 튐(big_toss_beat, 판정 없음): 착지해 가죽에 닿자마자 공이 스스로 크게 떠 balance 포물선(비행 big_toss_flight_s, 꼭짓점 1.0·Hp)의 꼭짓점까지 오른 뒤 구름 속에 머묾(그림자는 작게 남음). 같은 순간 clear 소리, 구름 cloud → accent 1 s, 바탕 그때 단계 → bg1 1 s, 큰 구름 아래 줄에 등급 칸 3개가 점선으로 나타남(늘 3칸, 1-2 D12). grade_cloud_beats[i](i < 받은 수)에 i번째 칸이 accent 채움 구름으로 0.6 → 1.0배 0.25 s(grade_cloud 소리). result_beat(= length_beats)에 결과 화면 글(레벨 이름·클리어 제목), result_buttons_after_ms 뒤 버튼. 검사: 첫 등급 칸 전에 공이 구름에 들어감, 마지막 칸 채움 끝 ≤ 버튼 시각, 섞기 1 s ≤ 마무리 시간.' },
  text_slots: {
    clear_title: '등급 칸 줄 바로 위 한 줄(clear_title_1~3, L10 clear_last), 결과 화면에서만',
    level_name: '레벨 선택 카드에는 글 없음(aria-label = levelN_name). 이름은 클리어 화면 맨 위 작은 줄',
    card_text: '그림 카드 대화 상자 위쪽 한 줄 보조 글(card_*), 카드 그림 배율 계산에서 text_line_px 만큼 비워 둠(cards.mjs). 그림만으로도 이해되게 그림',
    practice_on: 'HUD 진행도 막대 오른쪽 끝 아래 작은 깃발 + 글(연습 모드일 때만)',
    look_ball: '레벨 선택 오른쪽 위 밀림 표지(눈 + 공), 화면 글 없음(aria-label = look_ball), 밀림 조건일 때만(balance drift_check.signal text_on_child_screen false)',
    sound_late: '보호자 화면 소리 맞추기 줄 옆 같은 표지 + sound_late 글(어른용)',
    text_line_px: 28 },
  grade_fx: { max_r_of_d: 1.6, area_max_of_screen: 0.05 },
};

const RES = [[360, 640, 0, 0], [412, 915, 24, 34], [640, 360, 0, 0], [1280, 720, 0, 0]];

export function compute(L, W, H, safeTop = 0, safeBottom = 0) {
  const S = Math.min(W, H), portrait = H > W;
  const k = portrait ? L.ball.d_of_S : (L.ball.d_of_S_landscape ?? L.ball.d_of_S);
  const d = Math.round(Math.max(L.ball.d_min, Math.min(L.ball.d_max, k * S)));
  const dw = L.drum.w_of_d * d, dh = L.drum.h_of_d * d;
  let skinY, floorTop;
  if (portrait) { skinY = Math.round(L.portrait.skin_y_of_H * H); floorTop = skinY + dh; }
  else { const fh = Math.max(L.landscape.floor_h_min, L.landscape.floor_h_of_H * H) + safeBottom; floorTop = H - fh; skinY = floorTop - dh; }
  const hudH = (portrait ? L.portrait.hud_h : L.landscape.hud_h) + safeTop;
  const topLimit = safeTop + L.play_height.top_margin;
  const Hp = (skinY - topLimit - d - L.play_height.apex_margin) / L.play_height.apex_budget;
  const cloudEdgeY = skinY - L.play_height.cloud_edge_of_Hp * Hp; // 공 아랫점이 이 선 위면 공 전체가 구름 뒤
  const cloudH = cloudEdgeY - topLimit;
  const cloudW = Math.min(L.cloud.w_of_h * cloudH, L.cloud.w_max_of_W * W);
  const cx = W / 2;
  const c = 0.5 * Hp; // px/s, balance height.c_play_height_per_s = 0.5
  const fingerX = cx + dw / 2 + L.finger.dx_of_d * d, fingerH = L.finger.h_of_d * d;
  return { W, H, safeTop, safeBottom, portrait, S, d, dw, dh, skinY, floorTop, hudH, topLimit, Hp, cloudEdgeY, cloudH, cloudW, cx, c, fingerX, fingerH };
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
    const flights = Object.values(C.flights).flat().map((f) => ({ ...f, dur: f.to - f.from, apex: J.flightApex(f.to - f.from, bal) }));
    return { lv, C, flights };
  });
  return { bal, J, comp };
}

export function levelChecks(L, D) {
  const { bal, J, comp } = D;
  const out = []; let fail = 0;
  const ok = (name, pass, msg) => { out.push(`${pass ? 'OK  ' : 'FAIL'} ${name}: ${msg}`); if (!pass) fail++; };
  const cloudLine = L.play_height.cloud_edge_of_Hp;
  // D5 apex_budget = 모든 비행 최대 꼭짓점
  let maxApex = 0, maxAt = '';
  for (const { lv, flights } of comp) for (const f of flights) if (f.apex > maxApex) { maxApex = f.apex; maxAt = `L${lv.id} ${f.kind} ${(f.dur / (60000 / lv.bpm)).toFixed(2)}박 @${lv.bpm}`; }
  const rise = L.clear_timeline.rise_to_of_Hp;
  ok('apex_budget', L.play_height.apex_budget >= Math.max(maxApex, rise) - 0.001, `apex_budget ${L.play_height.apex_budget} ≥ 최대 꼭짓점 ${maxApex.toFixed(4)}(${maxAt})·클리어 튐 ${rise} (허용 오차 0.001·Hp)`);
  // D4 손가락
  for (const { lv, C } of comp) {
    const fs = J.fingerSchedule(C, bal);
    if (!fs) continue;
    const c = C.contacts[fs.contact], nx = C.contacts[fs.contact + 1];
    ok(`finger L${lv.id} 누름 시작`, fs.pressStart >= c.t - (C.judge.pass_early_ms - L.finger.press_start_min_ms_inside_pass) - 1e-6, `${fs.pressStart.toFixed(0)} ms ≥ 접촉 ${c.t.toFixed(0)} − (${C.judge.pass_early_ms} − ${L.finger.press_start_min_ms_inside_pass})`);
    if (nx) ok(`finger L${lv.id} 사라짐`, fs.gone <= nx.zoneStart, `gone ${fs.gone.toFixed(0)} ms ≤ 다음 접촉 놓침 구역 시작 ${nx.zoneStart.toFixed(0)} ms (여유 ${(nx.zoneStart - fs.gone).toFixed(0)} ms, 사라짐 = 즉시)`);
  }
  ok('finger 숫자 없음', !('hide_after_ms' in L.finger) && !('press_ms' in L.finger), 'layout.json finger 에 hide_after_ms·press_ms 없음(시각 원본 = fingerSchedule)');
  // D9 일찍 실패 움직임 ≤ 0.6 s
  let rMax = 0, rAt = '';
  for (const { lv, C } of comp) { const r = (C.judge.pass_early_ms + C.judge.miss_zone_ms) / 1000; if (r > rMax) { rMax = r; rAt = `L${lv.id}`; } }
  const E = L.fail_fx.early, m = Math.min(E.motion_max_s, Math.max(L.fail_fx.late.motion_s, rMax + E.roll_s));
  ok('fail early', rMax + E.roll_s <= E.motion_max_s && 0.85 - m >= 0.25, `남은 낙하 최대 ${rMax.toFixed(2)} s(${rAt}) + 굴러 멈춤 ${E.roll_s} = ${(rMax + E.roll_s).toFixed(2)} ≤ ${E.motion_max_s}, 정지 구간 최소 ${(0.85 - m).toFixed(2)} s ≥ 0.25(↻·점 미끄러짐 0.2 s 들어감)`);
  // D10 클리어 연출 ⊂ balance 시간축(levels clear_sequence)
  for (const { lv, C } of comp) {
    const cs = lv.clear_sequence;
    const beat = 60 / lv.bpm;
    if (!cs) { ok(`clear L${lv.id}`, false, 'levels clear_sequence 없음(대기: balance)'); continue; }
    const t0 = cs.big_toss_beat * beat, T = cs.big_toss_flight_s, apex = cs.big_toss_apex_play_heights;
    const cl = L.play_height.cloud_edge_of_Hp;
    const enter = apex > cl ? t0 + (T / 2) * (1 - Math.sqrt(1 - cl / apex)) : Infinity; // 공 아랫점이 구름선을 넘는 시각
    const g = (cs.grade_cloud_beats || []).map((b) => b * beat);
    const buttons = cs.result_beat * beat + (cs.result_buttons_after_ms || 0) / 1000;
    const lastFill = g.length ? Math.max(...g) + L.clear_timeline.grade_grow_s : t0;
    const blendEnd = t0 + Math.max(L.clear_timeline.cloud_blend_s, L.clear_timeline.bg_blend_s);
    const pass = apex >= L.clear_timeline.rise_to_of_Hp - 1e-6 && apex <= L.play_height.apex_budget + 1e-3 && enter < (g[0] ?? Infinity) && lastFill <= buttons + 1e-6 && blendEnd <= cs.result_beat * beat + 1e-6 && g.length === 3;
    ok(`clear L${lv.id}`, pass, `큰 튐 ${cs.big_toss_beat}박 꼭짓점 ${apex}·Hp, 구름 들어감 +${(enter - t0).toFixed(2)} s < 첫 등급 칸 +${((g[0] ?? NaN) - t0).toFixed(2)} s, 마지막 칸 채움 끝 +${(lastFill - t0).toFixed(2)} s ≤ 버튼 +${(buttons - t0).toFixed(2)} s, 섞기 끝 +${(blendEnd - t0).toFixed(2)} s ≤ 결과 +${(cs.result_beat * beat - t0).toFixed(2)} s, 등급 칸 3`);
  }
  // D6 바탕 단계
  const st = comp.map(({ lv }) => `L${lv.id} ${lv.phrases.map((_, n) => Math.min(n + 1, 3)).join('')}`);
  const bad6 = comp.filter(({ lv }) => lv.phrases.length >= 3 && Math.min(lv.phrases.length, 3) !== 3);
  ok('bg_stage', !bad6.length && comp.every(({ lv }) => lv.phrases.length >= 3), `min(n,3): ${st.join(' / ')}`);
  return { out, fail, maxApex };
}

export function report(L, D) {
  let fail = 0;
  const rows = [];
  const cl = L.play_height.cloud_edge_of_Hp;
  for (const [W, H, st, sb] of RES) {
    const g = compute(L, W, H, st, sb);
    const vContact = 4 * g.c;
    const fx = Math.PI * (L.bounce_lines.max_extent_of_d * g.d) ** 2 / (W * H);
    // 레벨 실제 BPM 의 비행들
    let shortest = { px: 1e9 }, topMax = { r: -1 }, hideMax = { s: 0 }, lateMin = { px: 1e9 };
    for (const { lv, C, flights } of D.comp) {
      for (const f of flights) {
        const px = f.apex * g.Hp, beats = +(f.dur / C.beatMs).toFixed(2);
        if (f.kind !== 'land' && px < shortest.px) shortest = { px, at: `L${lv.id} ${beats}박@${lv.bpm}` };
        if (f.apex <= cl) { const r = (px + g.d) / g.Hp; if (r > topMax.r) topMax = { r, at: `L${lv.id} ${beats}박@${lv.bpm}` }; }
        else { const T = f.dur / 1000, hs = T * Math.sqrt(1 - cl / f.apex); if (hs > hideMax.s) hideMax = { s: hs, at: `L${lv.id}@${lv.bpm}` }; }
        if (f.kind === 'bounce') { const rem = f.dur - C.judge.pass_late_ms; const p = D.bal.height.c_play_height_per_s * rem / 1000 * g.Hp; if (p < lateMin.px) lateMin = { px: p, at: `L${lv.id} ${beats}박` }; }
      }
    }
    const apexTop = g.skinY - L.play_height.apex_budget * g.Hp - g.d;
    const checks = {
      ball24: g.d >= 24,
      apexInside: apexTop >= g.topLimit - 0.01,
      cloudBelowHud: g.cloudEdgeY >= g.hudH + 4,
      fingerInside: g.fingerX + 0.95 * g.d <= W - 4,
      fx5: fx <= L.bounce_lines.area_max_of_screen,
      floorThumb: H - g.floorTop >= (g.portrait ? 0.15 * H : 40),
      shortBounce: shortest.px >= 1.2 * g.d,
      topBelowCloud: topMax.r <= cl,
      hidden: hideMax.s <= D.bal.height.max_hidden_s,
    };
    for (const v of Object.values(checks)) if (!v) fail++;
    rows.push({ g, vContact, fx, apexTop, shortest, topMax, hideMax, lateMin, checks });
  }
  return { rows, fail };
}

function mockup(L, W, H) {
  const g = compute(L, W, H), C = PAL.common, T = PAL.themes.level01;
  const o = Math.max(2, L.ball.outline_of_d * g.d);
  const s = [];
  s.push(`<rect width="${W}" height="${H}" fill="${T.bg1}"/>`);
  s.push(`<rect x="0" y="${g.floorTop}" width="${W}" height="${H - g.floorTop}" fill="${T.floor}"/><rect x="0" y="${g.floorTop}" width="${W}" height="2" fill="${T.floorEdge}"/>`);
  const h = g.c * 0.6; // L1 100 BPM 1박 꼭짓점
  const top = g.skinY - h - g.d;
  const dx = g.cx - g.dw / 2;
  s.push(`<rect x="${dx.toFixed(1)}" y="${g.skinY}" width="${g.dw.toFixed(1)}" height="${g.dh.toFixed(1)}" rx="${(L.drum.rx_of_d * g.d).toFixed(1)}" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="${o.toFixed(1)}"/>`);
  s.push(`<rect x="${dx.toFixed(1)}" y="${g.skinY}" width="${g.dw.toFixed(1)}" height="${(L.drum.skin_h_of_d * g.d).toFixed(1)}" rx="${(L.drum.skin_h_of_d * g.d / 2).toFixed(1)}" fill="${C.skin}" stroke="${C.ink}" stroke-width="${o.toFixed(1)}"/>`);
  const sw = g.d * (1 - 0.55 * Math.min(1, h / g.Hp));
  s.push(`<ellipse cx="${g.cx}" cy="${(g.skinY + L.drum.skin_h_of_d * g.d / 2).toFixed(1)}" rx="${(sw / 2).toFixed(1)}" ry="${(sw * 0.14).toFixed(1)}" fill="${C.shadow}"/>`);
  s.push(ballSvg(g.cx, top, g.d));
  s.push(cloudSvg(g.cx, g.cloudEdgeY, g.cloudW, g.cloudH));
  const bx1 = W - L.hud.bar_x1_from_right;
  s.push(`<rect x="${L.hud.bar_x0}" y="${L.hud.bar_y}" width="${bx1 - L.hud.bar_x0}" height="${L.hud.bar_h}" rx="6" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>`);
  const p = 0.35, best = 0.62;
  s.push(`<rect x="${L.hud.bar_x0 + 2}" y="${L.hud.bar_y + 2}" width="${((bx1 - L.hud.bar_x0 - 4) * p).toFixed(1)}" height="${L.hud.bar_h - 4}" rx="4" fill="${C.drumBody}"/>`);
  s.push(`<circle cx="${(L.hud.bar_x0 + (bx1 - L.hud.bar_x0) * best).toFixed(1)}" cy="${L.hud.bar_y + L.hud.bar_h / 2}" r="${L.hud.best_r}" fill="${C.ball}" stroke="${C.ink}" stroke-width="2"/>`);
  for (let i = 0; i < 4; i++) s.push(`<circle cx="${L.hud.bar_x0 + 4 + i * L.hud.dot_gap}" cy="${L.hud.bar_y + L.hud.dots_dy + 6}" r="${L.hud.dot_r}" fill="${C.drumBody}"/>`);
  const pz = L.hud.pause;
  s.push(`<rect x="${pz.x}" y="${pz.y}" width="${pz.size}" height="${pz.size}" rx="14" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/><rect x="${pz.x + 16}" y="${pz.y + 14}" width="6" height="20" rx="3" fill="${C.ink}"/><rect x="${pz.x + 26}" y="${pz.y + 14}" width="6" height="20" rx="3" fill="${C.ink}"/>`);
  s.push(fingerSvg(g.fingerX, g.skinY + g.dh, g.fingerH, true));
  const yHp = g.skinY - g.Hp;
  s.push(`<g stroke="#D11" stroke-width="1" fill="none" stroke-dasharray="4 3"><line x1="8" y1="${g.skinY}" x2="${W - 8}" y2="${g.skinY}"/><line x1="8" y1="${yHp.toFixed(1)}" x2="${W - 8}" y2="${yHp.toFixed(1)}"/><line x1="8" y1="${g.cloudEdgeY.toFixed(1)}" x2="${W - 8}" y2="${g.cloudEdgeY.toFixed(1)}"/></g>`);
  s.push(`<g font-family="sans-serif" font-size="10" fill="#D11"><text x="10" y="${g.skinY - 3}">북 가죽 h=0</text><text x="10" y="${(yHp - 3).toFixed(1)}">h = Hp ${g.Hp.toFixed(0)}px</text><text x="10" y="${(g.cloudEdgeY + 11).toFixed(1)}">구름 아랫선 h = 0.9 Hp</text></g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<!-- rhythm-02 플레이 화면 목업 ${W}x${H} (tools/art/layout.mjs 생성, 손으로 고치지 않음). 레벨 1 색, 공 d ${g.d} px = 1박 꼭짓점(100 BPM), 손가락 = 레벨 1 첫 접촉 누름. 빨간 점선·글자는 치수 표시(빌드에 없음). 30-art 4절 -->\n${s.join('\n')}\n</svg>\n`;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/art/layout.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const L = args.includes('--check') ? JSON.parse(readFileSync(OUT, 'utf8')) : LAYOUT;
  if (!args.includes('--check')) {
    writeFileSync(OUT, JSON.stringify(L, null, 1) + '\n');
    writeFileSync(join(PROJ, 'assets/mockup-play-360x640.svg'), mockup(L, 360, 640));
    writeFileSync(join(PROJ, 'assets/mockup-play-640x360.svg'), mockup(L, 640, 360));
  }
  let D;
  try { D = await loadLevels(); } catch (e) { console.log(`대기: levels/·balance.json·tools/sim/judge.mjs 읽기 실패(balance 수정 중일 수 있음): ${e.message}`); console.log('layout FAIL (대기: balance 파일)'); process.exit(1); }
  const { rows, fail } = report(L, D);
  console.log(`레벨 ${D.comp.length}개 실제 BPM(${D.comp.map((x) => x.lv.bpm).join('·')})으로 계산`);
  console.log('| 해상도(safe 위/아래) | 공 d | 북 w×h | 북 가죽 y | 놀이 높이 Hp | 구름 아랫선 y | 접촉 속도 4c | 가장 짧은 튐 꼭짓점 | 구름 아닌 비행 공 윗점 최대 | 구름 숨는 시간 최대 | (정보) 늦은 탭 뒤 가장 낮은 꼭짓점 | 튐 선 면적 | 검사 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const g = r.g;
    const bad = Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k);
    console.log(`| ${g.W}x${g.H} (${g.safeTop}/${g.safeBottom}) | ${g.d} | ${g.dw.toFixed(0)}×${g.dh.toFixed(0)} | ${g.skinY.toFixed(0)} | ${g.Hp.toFixed(0)} | ${g.cloudEdgeY.toFixed(0)} | ${r.vContact.toFixed(0)} px/s (${(r.vContact / 60).toFixed(1)} px/프레임) | ${r.shortest.px.toFixed(1)} px = ${(r.shortest.px / g.d).toFixed(2)} d (${r.shortest.at}) | ${r.topMax.r.toFixed(3)}·Hp (${r.topMax.at}) | ${r.hideMax.s.toFixed(2)} s (${r.hideMax.at}) | ${r.lateMin.px.toFixed(1)} px (${r.lateMin.at}) | ${(r.fx * 100).toFixed(2)} % | ${bad.length ? 'FAIL ' + bad.join(',') : 'OK'} |`);
  }
  const lc = levelChecks(L, D);
  for (const x of lc.out) console.log(x);
  const total = fail + lc.fail;
  console.log(total ? `layout FAIL ${total}` : 'layout OK (공 ≥ 24 px, 꼭짓점 화면 안, 가장 짧은 튐 ≥ 1.2d, 구름 아닌 비행 공 윗점 ≤ 0.9·Hp, 숨는 시간 ≤ 1 s, 손가락 = fingerSchedule·겹침 0, 일찍 실패 ≤ 0.6 s, 클리어 연출 ⊂ 마무리 박, 바탕 min(n,3))');
  process.exit(total ? 1 : 0);
}
