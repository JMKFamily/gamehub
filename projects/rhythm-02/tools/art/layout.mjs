#!/usr/bin/env node
// rhythm-02 화면 배치 원본(assets/layout.json) 생성 + 4해상도 × 10레벨 검사. 30-art 4·5·6·7절. (round-2 "흘러오는 길" + 콤보)
//   node tools/art/layout.mjs            layout.json 쓰기 + 표 출력 + 목업 SVG(assets/mockup-play-*.svg) 쓰기
//   node tools/art/layout.mjs --check    layout.json 을 읽어 계산·검사만 (실패 시 종료 코드 1, 다른 역할 파일이 아직 v1 이면 "대기")
// 빌드는 assets/layout.json 의 식(계수)만 읽어 같은 식으로 계산합니다(문서 표 파싱 금지). 같은 식은 compute() 로 export.
// 박·시각·세상 위치의 원본은 balance(levels/*.json, balance.json, tools/sim/judge.mjs worldX·pxPerBeat·objectsAt) — 여기에는 그림 비율·연출 배분만.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ballSvg, cloudSvg, cloudGeom, fingerSvg, fingerBox, drumSvg, markSvg, roofSvg, roofGeom, branchSvg, branchGeom, marksUnder, hillSvg, SHAPE } from './cards.mjs';

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
    _rule: 'HUD 띠 = 화면 위 [safeTop, safeTop + band_h]. 글·숫자 없음(콤보 숫자는 HUD 띠 밖 뒤 층 — combo 절, 2026-11-17 요청자 지시로 콤보 숫자만 풀림). 플레이 중 버튼은 멈춤 하나. 흘러오는 모든 물체(구름·지붕·가지·언덕·배경 실루엣)와 보이는 공의 윗선 ≥ HUD 띠 아래 + gap(4해상도 검사, M2 일반화 — round-1 "구름 윗부분이 진행도 막대 뒤로 가도 됨" 문장 삭제). 콤보는 이 띠에 그리지 않음(combo 절: HUD 띠 아래 뒤 층 큰 숫자·라벨·파티클).',
    band_h: { portrait: 56, landscape: 48 }, gap_below_band: 2,
    pause: { x: 12, y: 4, size: 44, touch: { x: 10, y: 2, size: 48 } },
    bar: { x0: 68, x1_from_right: 20, y: 10, h: 10, best_r: 6 },
    attempts: { cy: 31, x0: 72, dot_r: 4, pitch: 12, big_r: 6, big_pitch: 16, per_big: 10, max_big_shown: 4,
      _dots: '시도마다 작은 점 1개(drumBody). 10개가 차면 큰 점 1개로 묶음. 숫자 없음.' },
    practice: { flag_x: 70, flag_h: 14, bar_shift_px: 22, text: 'text_slots.practice_on(레벨 시작 2 s, 게임 시간)', _rule: '연습 모드일 때만 막대 왼쪽 끝에 작은 깃발(막대는 22 px 오른쪽에서 시작). HUD 안에 글 없음.' },
    aria: { bar: 'aria_progress', best: 'aria_best', dots: 'aria_attempts', flag: 'aria_checkpoint', pause: 'btn_pause', combo: 'aria_combo' },
    combo_a11y: { role: 'meter', name: 'aria_combo', valuenow: '지금 콤보', valuetext: '숫자만(예 "7", 퍼센트로 읽히지 않게)', live: 'none(판정마다·끊김 때 읽지 않음)', where: 'combo.number 자리(HUD 띠 밖 큰 숫자, 2026-11-17)', _src: 'R2-D7 · insights runner-01 콤보 대체 글' },
  },
  combo: {
    _src: '요청자 지시(2026-11-17, 리듬·러너 전 프로젝트) "콤보는 더 파격적인 연출 — 중앙에 몇 콤보인지 크게, 매칭 비율은 타격 지점 가까이, 콤보가 지속될수록 화면 전체 파티클 강화" · harness/criteria.md 게임 감각 "파격적인 콤보 연출"(131aa6a) · 30-art 6-2. 배치·크기·강화 구조만 참고(DJMAX 글자 디자인·글꼴·이펙트 모양 재현 금지).',
    source: 'balance.json combo + tools/sim/judge.mjs comboEvents(L, result) — 값·시각 원본은 balance(별도 상태 없이 grades 길이). 단계 값 balance combo.stages, 화음 chord_stages·chord_timing 그대로',
    replaces: 'round-2 의 HUD 띠 안 점 10칸 + 10마다 큰 표지(숫자 없음)는 폐기. HUD 띠 "글·숫자 없음" 규칙은 콤보 숫자에 한해 풀림 — 숫자는 HUD 띠 밖, 세계 물체 뒤 층에 그림(30-art 4-2·6-2)',
    show_from: 2,
    layer: {
      order: ['bg', 'silhouette', 'combo_particles', 'combo_number', 'combo_label', 'hill', 'floor_lane_pebbles', 'drum_leg_shadow', 'marks', 'ball', 'cloud_roof_branch', 'bounce_lines', 'judgement', 'hud'],
      behind: ['hill', 'floor_lane_pebbles', 'drum_leg_shadow', 'marks', 'ball', 'cloud_roof_branch', 'bounce_lines', 'judgement', 'hud'],
      _rule: '콤보 층(파티클 → 숫자 → 라벨)은 바탕·배경 실루엣 바로 위, 모든 세계 물체·북·박 표시·공·튐 선·판정 표시·HUD 아래. 바닥 띠가 불투명해 파티클은 하늘(HUD 띠 아래 ~ 바닥 윗선)에만 보임. 공·위험·표시 위에 콤보 층을 그리지 않음',
    },
    region: { gap_below_band_px: 6, gap_above_objects_px: 4,
      _rule: '세로 = HUD 띠 아래 + 6 ~ min(지붕 윗선, 가지 윗선) − 4 (지붕·가지 아랫면 비율 중 가장 높은 값 기준 — 레벨 개별 값도 검사). 그 사이에 걸치는 세계 물체는 구름(흰 면 + ink 외곽선, 앞 층)뿐. 다가오는 길 영역(S10)은 "앞 층 UI 금지"로 고침 — 뒤 층 콤보는 허용(물체가 늘 위에 그려지고 대비 검사)' },
    number: {
      digit_h_of_H: { target: 0.15, min: 0.12, max: 0.18 }, digit_h_of_font: 0.71, digit_adv_of_font: 0.58, ink_fill_ratio: 0.5,
      weight: 800, family: 'body 와 같은 system-ui 계열 굵게(외부 글꼴 없음)', letter_spacing: 0, align: 'center', format: '<n>(숫자만, 쉼표·x·콤마 없음)',
      x: { rule: 'cx = max(W/2, 공 세로 줄 오른쪽 + gap_ball_px + 2자리 폭 × stage 튐 / 2). 세로 화면은 공(0.30 W)을 비키려 가운데에서 조금 오른쪽, 가로 화면은 정가운데. 자리 수가 바뀌어도 cx 고정', gap_ball_px: 8, side_margin_px: 8 },
      size_rule: 'font_px = round(target·H / digit_h_of_font). 실제 레벨 최대 콤보(지금 56 = 2자리)가 이 크기로 자리 안. 3자리(100, 예비)는 자리 폭을 넘으면 그 값만 줄임(정보로 셈)',
      color: 'palette.json combo_fx.number (그 레벨 accent, 불투명도 0.34)',
      pop: { scale: [1, 1.12, 1], ms: 120, up_ms: 40, stage_scale: [1, 1.2, 1], stage_ms: 160, origin: '숫자 잉크 상자 가운데', min_interval_ms: 334, alpha: 'const(튐 동안 불투명도·색 그대로 — 밝기 깜빡임 없음)',
        _rule: '판정 프레임(hit = 친 순간, hold = roof_out)마다 값 바꿔 그리고 튐. 단계(balance combo.stages 5·10·20·30 + 파티클 단계 50)에 닿은 판정은 stage_scale. 앞 튐 시작에서 334 ms 안의 판정은 값만 바꾸고 튐은 새로 시작하지 않음(튐 ≤ 3회/s, L6~L10 반박 쌍 246~263 ms)' },
      appear: { ms: 120, rule: 'combo = show_from(2) 판정 프레임에 불투명도 0 → 0.34 + 튐' },
      break: { ms: 250, alpha_to: 0, sink_of_digit_h: 0.06, scale: 'const', rule: '실패 판정 순간부터 0.25 s 동안 불투명도 → 0 + 0.06·숫자 높이만큼 아래로 가라앉음. ✕·경고음·흔들림·"0"·잃은 개수·빨강·크기 튐 없음, 콤보 크기와 무관하게 같은 연출' },
      clear: '마지막 접촉 판정 확정 때 HUD 와 같이 0.2 s 페이드(게임 시간)',
      a11y: 'role="meter" 요소를 숫자 자리에(시각은 캔버스): 이름 aria_combo, aria-valuenow = 콤보, aria-valuetext = 숫자만, aria-live 없음(판정마다·끊길 때 읽지 않음). 라벨 글은 aria-hidden(이름이 이미 읽힘)',
    },
    label: { text_key: 'combo_label', check_candidates: ['콤보', 'COMBO'], px_of_H: 0.024, px_min: 12, px_max: 20, weight: 800, gap_to_number_px: 6, est_em: { hangul: 1.0, upper: 0.75 },
      mark: { size_of_px: 0.8, gap_of_px: 0.35, fill: 'glow', stroke: 'ink', stroke_px: 1.5, rx_of_size: 0.22, _rule: '글 왼쪽 작은 금빛 둥근 네모(결과 화면 최고 콤보 표지·레벨 선택 최고 콤보 네모와 같은 "이어서 잘함" 표지, 별 아님)' },
      tiers: { n: 4, size_of_px: 0.5, gap_of_px: 0.25, lead_of_px: 0.45, on: 'ink 채움', off: 'ink 외곽선 1 px', _rule: '글 오른쪽 단계 칸 4개 = 파티클 단계 1~4. 닿은 단계만 채움(움직임 없음) — 움직임 줄이기에서 파티클 대신 단계를 알림' },
      color: 'palette.json combo_fx.label (ink 불투명도 0.66, 표지 glow)',
      _rule: '숫자 바로 위 가운데(cx 같음) 작은 한 줄: [금빛 표지] 라벨 글 [단계 칸 4]. 글은 lore strings.json combo_label(12세 기준 "콤보"·"COMBO" 같은 짧은 말 — 원작 COMBO 글자 모양·기울기·글꼴 아님, body system-ui 굵게)' },
    particles: {
      tiers: [
        { at: 10, count_ref: 8, size_of_d: 0.2, rise_of_H_per_s: 0.05, colors: ['accent'] },
        { at: 20, count_ref: 14, size_of_d: 0.24, rise_of_H_per_s: 0.07, colors: ['accent', 'glow'] },
        { at: 30, count_ref: 20, size_of_d: 0.26, rise_of_H_per_s: 0.09, colors: ['accent', 'glow', 'white'] },
        { at: 50, count_ref: 28, size_of_d: 0.3, rise_of_H_per_s: 0.11, colors: ['accent', 'glow', 'white', 'mint'] },
      ],
      tiers_rule: '단계 1~3 = balance combo.stages 10·20·30(화음 chord_1·chord_2·chord_2 와 같은 판정, 화음 시각 규칙 그대로) · 단계 4 = 50(그림만, 소리 없음 — L9·L10 접촉 50·53개에서만 나옴). 콤보 2~9 = 파티클 없음(숫자만), 5 = 숫자 stage 튐만. 100 단계는 두지 않음(레벨 최대 56)',
      count_scale: { ref_sky_px2: 360 * 456, min: 1, max: 2, rule: 'count = round(count_ref × clamp(하늘 면적 / ref_sky_px2, 1, 2)), 하늘 = W × (바닥 윗선 − HUD 띠 아래)' },
      count_cap: 56,
      shape: { kinds: ['rsquare', 'diamond'], rx_of_size: 0.25, rotate: 'none', _rule: '번갈아 둥근 네모·마름모(색종이 조각). 원(공)·별(rhythm-01)·빛줄기·불꽃·광선·후광·꼬리(원작 이펙트)·한 점에서 터지는 폭발 없음. 크기 ≤ 0.3d(공·박 표시와 크기로도 구분)' },
      motion: { rise: 'rise_of_H_per_s × H (아래 → 위, 떨어지지 않음 — 다가오는 물체와 방향이 다름)', drift_x_of_scroll: -0.3, sway_of_d: 0.15, sway_hz: 0.4, _rule: '가로는 세계 흐름 속도의 0.3배로 왼쪽(먼 층처럼) + 좌우 살랑(진폭 0.15d, 0.4 Hz, 위상 무작위). 회전·잔상·속도선 없음' },
      spawn: { y: '바닥 윗선 + 크기(바닥 띠 뒤에서 나와 보이기 시작)', x: '0 ~ W 고른 무작위(결정적 LCG, 시드 = 레벨 번호·시도 번호 — QA 재현)', rate_max_of_count_per_s: 1.0, _rule: '목표 개수까지 초당 count 개를 넘지 않게 고르게 내보냄(한꺼번에 터뜨리지 않음)' },
      fade: { in_s: 0.4, out_band_of_H: 0.08, _rule: '나온 뒤 0.4 s 동안 0 → 그 색 불투명도, HUD 띠 아래 0.08·H 구간에서 0 으로(띠 안에 그리지 않음)' },
      tier_ramp_s: 0.5,
      break: { ms: 250, rule: '실패 판정 순간 새로 내보내지 않음, 모든 조각 불투명도 0.25 s 동안 → 0, 오름 속도도 0.25 s 동안 0 으로(제자리에서 가라앉듯 멈추며 사라짐). 크기·색 그대로, 소리 없음' },
      clear: '마지막 접촉 판정 확정 때 새로 내보내지 않음, 0.6 s 동안 흐려짐(끝 구름·등급 칸과 시간이 겹치지 않음)',
      pause: '게임 시계로 멈춤(멈춤 메뉴·백그라운드)',
      forbidden: ['원 모양', '별 모양', '빛줄기·불꽃·광선·후광', '잔상·꼬리·속도선', '번쩍임·깜빡임', '공 색 ball·북 몸통 색 drumBody·지붕 색 roof·빨강', '화면 흔들림', '한 점에서 퍼지는 폭발', '공·위험·박 표시 앞에 그리기'],
    },
    reduced_motion: { media: '(prefers-reduced-motion: reduce)', setting: '게임 안 설정이 생기면 같은 동작(지금은 OS 설정만)',
      number_pop: false, number_break: 'alpha 0.25 s 만(가라앉음 없음)', appear: 'alpha 만', particles: 0, tier_signal: 'label.tiers 단계 칸 채움(움직임 없음)',
      _rule: '움직임 줄이기: 숫자는 그대로 보이되 튐·가라앉음 없이 값만 바뀜, 파티클은 그리지 않음(0개), 단계는 라벨 옆 단계 칸으로만 알림' },
    flash: { max_per_s: 3, area_limit_px2: 0.25 * 341 * 256, _rule: 'WCAG 2.3.1 일반 번쩍임 한도: 초당 3회 넘게 바뀌는 밝기 변화는 면적 < 0.25 × 341 × 256 CSS px²(10° 시야 25 %). 숫자 값 바뀜(판정 최소 간격 246 ms = 4.1회/s)은 바뀌는 숫자 한 자리 잉크 면적으로 검사, 튐은 334 ms 간격 제한으로 ≤ 3회/s, 파티클은 한 조각 수명 동안 나타남·사라짐 한 번(≥ 0.33 s 주기), 단계 오름 0.5 s, 끊김 한 번' },
    perf: { cap: 56, draw_groups_max: 4,
      rule: '색마다 경로 하나 + fill 한 번(≤ 4 그룹), 미리 잡은 Float32Array 풀(프레임마다 객체·배열을 새로 만들지 않음 — GC 긴 프레임 방지), 숫자는 값이 바뀔 때만 오프스크린 캔버스에 한 번 그리고 프레임마다 drawImage + globalAlpha, 라벨·표지·단계 칸은 레벨 불러올 때 한 번(12절 미리 그리기). 단계 0 이면 갱신·그리기 없음',
      forbidden: ['shadowBlur', 'filter', 'createLinearGradient/RadialGradient', 'globalCompositeOperation 바꾸기', 'getImageData', '프레임마다 fillText(큰 숫자)'],
      measure: '6배 스로틀 평균 ≥ 55 fps · 1% low ≥ 45(criteria). 테스트 훅으로 콤보 50(단계 4, 최대 개수)을 켠 채 DPR 3 × 412x915·1280x720 에서 시작·재시작 구간 포함 측정(QA)' },
    chords: '기존 규칙 그대로: balance combo.chord_stages 10·20·30 → chord_1·chord_2·chord_2, 그 판정 접촉 박 다음 빈 정박(chord_timing), 아이 탭보다 1 dB 이상 작게(sound-check). 그림(숫자 stage 튐·파티클 단계 오름)은 판정 프레임, 소리만 빈 정박',
    _rule: '중앙 큰 숫자 + 라벨 + 화면 전체 파티클(뒤 층·낮은 불투명도). 콤보 2부터 숫자. 공 색 ball·북 몸통 색·지붕 색 안 씀. 바탕 단계(받침 쉼에서 바탕 전체 색)와 구분: 콤보는 숫자·떠오르는 조각(판정마다), 바탕 단계는 면 색(받침 쉼). 지붕 밑 착지 ±1박에는 값 갱신·단계 시작 없음(hold 는 roof_out, S9).',
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
    approach_rect: 'x ≥ 북 왼쪽 끝, y = HUD 띠 아래 ~ 길 아랫선(laneBottom). 앞 층 UI(HUD·글 자리·손가락·판정 표시)가 이 안에 그려지지 않음(S10). 뒤 층 콤보 숫자·파티클(combo 절)은 허용 — 모든 물체가 그 위에 그려지고 대비 검사(tools/art/combo-fx.mjs)',
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
    world: '실패 순간 세상(길·표시·물체·배경)은 그 자리에 멈춤. 콤보 숫자·파티클은 0.25 s 안에 조용히 가라앉아 사라짐(combo.number.break·particles.break)',
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
    hud_fade: '마지막 접촉 판정 확정(clearTimeMs) 때 0.2 s 게임 시간(콤보 숫자·라벨도 같이, 파티클은 0.6 s 흐려짐)',
    result_at: 'length_beats',
    _rule: '큰 튐(판정 없음): 공이 스스로 1.0·Hp 까지 떠 끝 구름(role clear 물체, 길 멈춤 자리) 속에 머묾. 끝 구름 cloud → clearCloud 1 s(연한 테마색, 등급 칸 진한 accent 와 구분), 바탕 → bg1 1 s, 등급 칸 3개 점선 → 받은 칸 accent 채움.' },
  text_slots: {
    tut_tap: { font_px: 16, line_px: 22, max_lines: { portrait: 2, landscape: 4 },
      portrait: '바닥 띠 안, 길·손가락 아래: x 16 ~ W−16 가운데 맞춤, y = max(길 아랫선, 손가락 아랫선) + 8 ~ H − safeBottom − 8',
      landscape: '북 왼쪽 세로 칸: x 12 ~ 북 왼쪽 끝 − 8 왼쪽 맞춤, y = HUD 띠 아래 + 8 ~ min(손가락 윗선, 판정 표시 상자 윗선(튐 1.15배)) − 8 (판정 표시 6-3 과 겹치지 않게, 2026-11-17)',
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
  judgement: {
    _src: '요청자 지시(2026-11-17, 전 프로젝트) "판정 이름과 퍼센트까지 해주세요." · harness/benchmarks/djmax-judgement.md 7절 · criteria 게임 감각 "판정 이름과 퍼센트 표시" · balance.json judgement_display(값·시간 원본) · 30-art 6-3. 여기에는 자리·크기·색·모양만.',
    source: 'balance.json judgement_display: 이름 키 names(strings.json grade_perfect_name·grade_good_name·grade_pass_name), % = judge.mjs pctOf(L, g.i, g.e), 시간 timing(튐 80 / 유지 400 / 흐려짐 150 ms, 새 판정은 그 프레임에 바꿔 그림, 쌓지 않음)',
    shown_for: 'hit 성공(딱·좋아·통과)만. 지붕 참기(hold)·실패·받침 쉼 탭(북만 톡)·지붕 밑 헛탭에는 그리지 않음. 두 공 구절 없음(예비 D-R2-1)',
    font: { name_px_min: 28, name_px_of_d: 0.9, pct_of_name: 0.55, pct_px_min: 14, weight: 800, family: 'body 와 같은 system-ui 계열(외부 글꼴 없음)', letter_spacing: 0, line_height: 1.0,
      _rule: '이름 글자 크기 name_px = max(28, round(0.9·d)) CSS px(글꼴 크기 = 글자 칸 높이), % 크기 pct_px = max(14, round(0.55·name_px)) — 0.5~0.6배. 360x640 28 / 15 px. 등급마다 크기는 같음(360 세로 칸이 3글자 딱이야에 꼭 맞아 더 키울 수 없음) → 등급은 크기 대신 튐 선 수·글자색·말로 구분' },
    style: {
      name_fill: { perfect: 'judgePerfect', good: 'judgeGood', pass: 'judgePass' },
      name_stroke: 'ink', name_stroke_px: 3, paint_order: 'stroke(외곽선을 먼저 그리고 글자 면을 위에 — 보이는 외곽선 1.5 px)',
      pct_fill: 'ink', pct_stroke: null, pct_format: '<n>% (숫자 + % 만, 소수점 없음, 이름과 붙여 쓰지 않음 — 줄을 나눔)',
      ticks: { pairs_by_grade: { perfect: 2, good: 1, pass: 0 }, h_of_name: 0.3, w_px: 3, color: 'ink', x_of_name: [0.36, 0.62], splay_px: 3,
        _rule: '이름 위 짧은 튐 선(위로 살짝 벌어진 세로 선): 딱 2쌍·좋아 1쌍·통과 없음 = 공 옆 튐 선(bounce_lines.pairs_by_grade)과 같은 수. 쌍 i 는 이름 가운데에서 ±x_of_name[i]·name_px, 아래 끝 → 위 끝이 바깥으로 splay_px 벌어짐' },
      forbidden: ['공 색 ball', '빨강·회색(통과도 칭찬)', '원작 판정 글자 모양·글꼴·색 배합, MAX·BREAK 등 이름, "이름 + %" 붙임 표기', '번쩍임·발광·그라데이션·투명도(흐려짐 150 ms 만 불투명도 1 → 0)', '실패 이름·0 %·빨간 표시', '별 모양(rhythm-01)'],
    },
    box: { stack: ['ticks', 'name', 'pct'], gap_px: 4, align: 'right', _rule: '위에서부터 튐 선 줄(높이 round(0.3·name_px)) · 이름 줄(name_px) · % 줄(pct_px), 사이 4 px. 이름·% 는 오른쪽 맞춤(text-anchor end, 오른쪽 끝 = 자리 x1 = 북·공 쪽), 튐 선은 그 이름 글자 폭의 가운데 위' },
    zone: {
      portrait: { x0: 2, x1: 'cx − (d/2 + outline_of_d·d) − gap_ball_px (공 세로 줄 왼쪽)', gap_ball_px: 2,
        y0: 'skinY − min_under·Hp + 4 (min_under = 지붕·가지 아랫면 비율 중 작은 값 = 지붕·가지 그림은 모두 이 선 위)', y1: 'skinY − d/2 − grade_fx.max_r_of_d·d − 2 (공이 가죽에 닿을 때 튐 선·등급 반응 범위 위)' },
      landscape: { x0: 12, x1: 'drumLeft − gap_drum_px (북 왼쪽, 튐 선 범위 1.07d < 북 반폭 1.6d 라 그 바깥)', gap_drum_px: 4,
        y0: '세로와 같음', y1: 'min(손가락 상자 윗선, floorTop) − 4' },
      _rule: '북 옆, 공이 떨어지는 세로 줄을 비킨 왼쪽(지나간 쪽). 오른쪽은 다가오는 길(표시·지붕·가지·언덕·구름이 들어오는 쪽)이라 쓰지 않음. HUD 띠 밖(HUD "글·숫자 없음" 유지). 다가오는 길 영역(S10)은 이 표시에 한해 "공 세로 줄 오른쪽"으로 봄 — 북 왼쪽 절반 위는 물체가 공을 지난 뒤에만 오는 곳',
    },
    overflow: '빌드 글꼴로 잰 실제 이름 폭 + 외곽선(3 px) 이 자리 폭보다 넓으면 그 이름만 자리 폭에 맞게 글자 크기를 줄임(28 px 아래가 되면 콘솔 경고 — QA 가 360x640 에서 확인, 30-art 14절 A-10). art 검사는 한글 1.0em 으로 추정(Windows 맑은 고딕 실측 딱이야 28 px = 84.0 px)',
    place: '튐(1.15배)까지 커진 상자의 아랫변 = 자리 y1, 오른쪽 끝 = 자리 x1. 튐 기준점 = 상자 오른쪽 가운데',
    pop: { scale_from: 'balance judgement_display.timing.pop_scale [1, 1.15, 1] · pop_ms 80', scale_x_max: 'min(1.15, (x1 − x0) / 실제 이름 폭) — 360x640 세로 한국어 딱이야는 칸이 꼭 맞아 가로 튐이 1.0 근처로 줄고 세로만 1.15(통통 늘었다 돌아옴). 실제 폭은 빌드가 measureText 로 잼', origin: 'right center' },
    a11y: '낭독 없음(aria-hidden, aria-live 없음 — 판정마다 읽지 않음). 결과 화면 정확도·최고 콤보만 읽음(lore result_accuracy·result_combo)',
    notext: '글을 지운 화면에서도 기존 3단 구분(공 옆 튐 선 2·1·0쌍, 납작 0.75·0.85·0.92, 딱 가죽 glow, 소리) + 이름 위 튐 선 수가 남음',
    layer: '튐 선·등급 반응 위, HUD 아래(층 순서 … 구름·지붕·가지 → 튐 선 → 판정 표시 → HUD)',
  },
  result_screen: {
    _src: 'djmax-judgement.md 7-5 · balance judgement_display.accuracy·records · lore result_accuracy·result_combo·result_new_best(aria)',
    order: ['grade_clouds', 'accuracy', 'best_combo'], _order_rule: '크기 순서 구름 등급 > 정확도 % > 최고 콤보(높이 비교: 등급 구름 높이 > 정확도 글자 크기 > 최고 콤보 글자 크기). 정확도가 등급을 대신하지 않음',
    grade_cloud_w_px: 48, grade_cloud_h_of_w: 0.62,
    accuracy: { font_px: 26, weight: 800, fill: 'ink', format: '<n>%', sign: 'icon-accuracy(작은 북 + 다리 밑 박 표시 = "표시에 맞춘 정도", 과녁·원형 고리·RATE 글 아님)', sign_px: 28, aria: 'result_accuracy', _rule: '구름 등급 줄 바로 아래 한 줄, 가운데 맞춤. 일반 모드 클리어에만(연습 클리어·실패에는 없음 — levelAccuracy null)' },
    best_combo: { font_px: 18, weight: 700, fill: 'ink', format: '<n>(숫자만)', sign: 'icon-best-combo(콤보 큰 표지 1 + 찬 칸 3 = HUD 콤보와 같은 모양)', sign_px: 20, aria: 'result_combo', _rule: '정확도 줄 아래 한 줄. 이번 판 최고 콤보(클리어 = 그 레벨 판정 수)' },
    new_best: { sign: 'glow 둥근 네모 14 px + ink 위 꺾쇠(별 아님)', where: '정확도 숫자 오른쪽 6 px', aria: 'result_new_best', _rule: '정확도 신기록일 때만. 비교 숫자·경고 글 없음' },
    _flow: '클리어 화면이 뜨는 시간·버튼 흐름은 바꾸지 않음(clear_timeline 결과 length_beats 그대로, 값만 더함)',
  },
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
  const r = d / 2 + L.ball.outline_of_d * d, ballRight = cx + r;
  const combo = comboGeom(L, { W, H, portrait, d, bandBottom, skinY, Hp, ballRight, floorTop });
  const comboBox = combo.popBox; // 2자리·stage 튐 상자(숫자 + 라벨)
  const A = L.hud.attempts, attW = A.max_big_shown * A.big_pitch + 9 * A.pitch;
  const attBox = { x0: A.x0 - A.big_r, x1: A.x0 - A.big_r + attW, y0: safeTop + A.cy - A.big_r, y1: safeTop + A.cy + A.big_r };
  const judge = L.judgement ? judgeGeom(L, { portrait, d, cx, drumLeft, skinY, floorTop, Hp, fingerBox: fb }) : null;
  return { W, H, safeTop, safeBottom, portrait, S, d, dw, dh, skinY, floorTop, bandBottom, objTop, topLimit, Hp, cloudEdgeY, cloudBottom, cloudH, cx, drumLeft, laneY, laneBottom, c, fingerX, fingerTip, fingerH, fingerBox: fb, comboBox, combo, attBox, judge };
}

// ---------- 콤보 큰 숫자·라벨 자리 (30-art 6-2, layout.json combo) ----------
// 지붕·가지 윗선 중 가장 높은 곳(화면 y 가 가장 작은 곳): 아랫면 비율(under)이 클수록 높음. 레벨 개별 값은 combo-fx 검사에서 대조
export function objTopY(g, bal = BAL0, roofUnder = null, branchUnder = null) {
  const ru = roofUnder ?? bal.objects?.roof?.under_of_Hp ?? 0.45, bu = branchUnder ?? bal.objects?.branch?.under_of_Hp ?? 0.34;
  const rg = roofGeom(0, 100, g.skinY - ru * g.Hp, g.d), roofTop = rg.domeTop - (rg.bodyTop - rg.domeTop);
  const branchTop = branchGeom(0, 100, g.skinY - bu * g.Hp, g.d).top;
  return { roofTop, branchTop, top: Math.min(roofTop, branchTop) };
}
export const labelEstW = (s, px) => [...s].reduce((a, ch) => a + (/[ㄱ-힣]/.test(ch) ? 1.0 : /[A-Z0-9]/.test(ch) ? 0.75 : ch === ' ' ? 0.3 : 0.62), 0) * px;
// g: { W, H, portrait, d, bandBottom, skinY, Hp, ballRight, floorTop }, opt: { digits, label(가장 긴 라벨 글), topY(물체 윗선, 없으면 balance 기본) }
export function comboGeom(L, g, opt = {}) {
  const C = L.combo, N = C.number, B = C.label;
  const digits = opt.digits ?? 2;
  const topY = opt.topY ?? objTopY(g).top;
  const labelPx = Math.round(Math.max(B.px_min, Math.min(B.px_max, B.px_of_H * g.H)));
  let fontPx = Math.round((N.digit_h_of_H.target * g.H) / N.digit_h_of_font);
  const stage = N.pop.stage_scale[1];
  const w2 = 2 * N.digit_adv_of_font * fontPx;
  const cxNum = Math.max(g.W / 2, g.ballRight + N.x.gap_ball_px + (w2 * stage) / 2);
  // 자리 수가 많아 자리 폭을 넘으면 그 값만 줄임(cx 고정)
  const halfAvail = Math.min(cxNum - (g.ballRight + N.x.gap_ball_px), g.W - N.x.side_margin_px - cxNum);
  const needHalf = (digits * N.digit_adv_of_font * fontPx * stage) / 2;
  let shrunk = false;
  if (needHalf > halfAvail + 0.5) { fontPx = Math.floor((2 * halfAvail) / (digits * N.digit_adv_of_font * stage)); shrunk = true; }
  const digitH = N.digit_h_of_font * fontPx, numW = digits * N.digit_adv_of_font * fontPx;
  const labelY0 = g.bandBottom + C.region.gap_below_band_px, labelY1 = labelY0 + labelPx;
  const cy = labelY1 + B.gap_to_number_px + (digitH * stage) / 2;
  const digitBox = { x0: cxNum - numW / 2, x1: cxNum + numW / 2, y0: cy - digitH / 2, y1: cy + digitH / 2 };
  const numPop = { x0: cxNum - (numW * stage) / 2, x1: cxNum + (numW * stage) / 2, y0: cy - (digitH * stage) / 2, y1: cy + (digitH * stage) / 2 };
  const lbl = opt.label ?? B.check_candidates.reduce((a, s) => (labelEstW(s, labelPx) > labelEstW(a, labelPx) ? s : a), B.check_candidates[0]);
  const markW = B.mark.size_of_px * labelPx, tiersW = B.tiers.n * B.tiers.size_of_px * labelPx + (B.tiers.n - 1) * B.tiers.gap_of_px * labelPx;
  const labelW = markW + B.mark.gap_of_px * labelPx + labelEstW(lbl, labelPx) + B.tiers.lead_of_px * labelPx + tiersW;
  const labelBox = { x0: cxNum - labelW / 2, x1: cxNum + labelW / 2, y0: labelY0, y1: labelY1 };
  const popBox = { x0: Math.min(numPop.x0, labelBox.x0), x1: Math.max(numPop.x1, labelBox.x1), y0: labelY0, y1: numPop.y1 };
  const region = { x0: g.ballRight + N.x.gap_ball_px, x1: g.W - N.x.side_margin_px, y0: labelY0, y1: topY - C.region.gap_above_objects_px };
  return { digits, fontPx, digitH, numW, labelPx, label: lbl, labelW, markW, tiersW, cx: cxNum, cy, baseline: digitBox.y1, digitBox, numPop, labelBox, popBox, region, topY, shrunk, stage };
}

// ---------- 판정 이름·% 표시 (30-art 6-3, layout.json judgement) ----------
// 지붕·가지 아랫면 비율 중 가장 낮은 것(그림은 모두 그 선 위). 기본 = balance objects, 레벨 개별 값은 검사에서 대조
export const minUnderOfHp = (bal = BAL0) => Math.min(bal.objects?.roof?.under_of_Hp ?? 0.45, bal.objects?.branch?.under_of_Hp ?? 0.34);
// 글자 폭 추정(굵은 system-ui, 보수적으로 넓게): 한글 1.0em, 대문자 0.75(W·M 0.95), 소문자 0.62(i·l 0.3, w·m 0.85), 숫자 0.62, ! 0.35, % 0.92, 빈칸 0.3
export function estTextW(s, px) {
  let em = 0;
  for (const ch of s) em += /[ㄱ-힣]/.test(ch) ? 1.0 : /[WM]/.test(ch) ? 0.95 : /[A-Z]/.test(ch) ? 0.75 : /[il]/.test(ch) ? 0.3 : /[wm]/.test(ch) ? 0.85 : /[a-z0-9]/.test(ch) ? 0.62 : ch === '!' ? 0.35 : ch === '%' ? 0.92 : ch === ' ' ? 0.3 : 1.0;
  return em * px;
}
export function judgeGeom(L, g, bal = BAL0) {
  const J = L.judgement, F = J.font, d = g.d;
  const nameP = Math.max(F.name_px_min, Math.round(F.name_px_of_d * d)), pctP = Math.max(F.pct_px_min, Math.round(F.pct_of_name * nameP));
  const tickH = Math.round(J.style.ticks.h_of_name * nameP), gap = J.box.gap_px;
  const boxH = tickH + gap + nameP + gap + pctP;
  const pop = bal.judgement_display?.timing?.pop_scale?.[1] ?? 1.15;
  const y0 = g.skinY - minUnderOfHp(bal) * g.Hp + 4;
  let zone;
  if (g.portrait) { const Z = J.zone.portrait; zone = { x0: Z.x0, x1: g.cx - (d / 2 + L.ball.outline_of_d * d) - Z.gap_ball_px, y0, y1: g.skinY - d / 2 - L.grade_fx.max_r_of_d * d - 2 }; }
  else { const Z = J.zone.landscape; zone = { x0: Z.x0, x1: g.drumLeft - Z.gap_drum_px, y0, y1: Math.min(g.fingerBox.y0, g.floorTop) - 4 }; }
  const popH = boxH * pop, cy = zone.y1 - popH / 2;
  const box = { x1: zone.x1, y0: cy - boxH / 2, y1: cy + boxH / 2, cy }; // 튐 없는 상자(x0 은 이름 폭에 따라)
  return { nameP, pctP, tickH, gap, boxH, pop, popH, zone, box, nameY: box.y0 + tickH + gap, pctY: box.y0 + tickH + gap + nameP + gap };
}
// 판정 표시 SVG(목업·기준 그림): 오른쪽 끝 x1, 위 y0, 등급·이름·% (튐 없음)
export function judgementSvg(L, x1, y0, nameP, pctP, grade, name, pct, PALc = PAL.common) {
  const J = L.judgement, S = J.style, tickH = Math.round(S.ticks.h_of_name * nameP), gap = J.box.gap_px;
  const w = estTextW(name, nameP) + S.name_stroke_px, mid = x1 - w / 2;
  const fill = PALc[S.name_fill[grade]];
  let s = '';
  for (let i = 0; i < S.ticks.pairs_by_grade[grade]; i++) for (const sd of [-1, 1]) {
    const bx = mid + sd * S.ticks.x_of_name[i] * nameP;
    s += `<line x1="${bx.toFixed(1)}" y1="${(y0 + tickH).toFixed(1)}" x2="${(bx + sd * S.ticks.splay_px).toFixed(1)}" y2="${(y0 + 1.5).toFixed(1)}" stroke="${PALc.ink}" stroke-width="${S.ticks.w_px}" stroke-linecap="round"/>`;
  }
  const fam = `system-ui, -apple-system, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif`;
  const ny = y0 + tickH + gap + nameP * 0.86, py = y0 + tickH + gap + nameP + gap + pctP * 0.86;
  s += `<text x="${x1.toFixed(1)}" y="${ny.toFixed(1)}" text-anchor="end" font-family="${fam}" font-weight="${J.font.weight}" font-size="${nameP}" fill="${fill}" stroke="${PALc.ink}" stroke-width="${S.name_stroke_px}" stroke-linejoin="round" paint-order="stroke">${name}</text>`;
  if (pct != null) s += `<text x="${x1.toFixed(1)}" y="${py.toFixed(1)}" text-anchor="end" font-family="${fam}" font-weight="${J.font.weight}" font-size="${pctP}" fill="${PALc[S.pct_fill]}">${pct}%</text>`;
  return s;
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

// 화면 고정 검사(레벨 무관): HUD 띠·콤보(띠 밖)·글 자리·손가락·구름 덮음·배경 실루엣 윗선
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
    else slot = { x0: 12, x1: g.drumLeft - 8, y0: g.bandBottom + 8, y1: Math.min(g.fingerBox.y0, g.judge ? g.judge.zone.y1 - g.judge.popH : Infinity) - 8 };
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
      comboBelowBand: g.comboBox.y0 >= g.bandBottom && g.comboBox.x1 <= W - 8, // 콤보 숫자·라벨은 HUD 띠 밖(자세한 검사 = combo-fx.mjs)
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

// 판정 이름 후보(KR·EN): 공통 권장안(djmax-judgement 7-3) + strings.json(lore) — 폭은 둘 중 긴 쪽으로 검사
export const JUDGE_NAME_REC = { perfect: { ko: '딱이야', en: 'Wow!' }, good: { ko: '좋아', en: 'Nice' }, pass: { ko: '됐어', en: 'OK' } };
export function judgeNames(strings) {
  const keys = { perfect: 'grade_perfect_name', good: 'grade_good_name', pass: 'grade_pass_name' };
  const out = {}; let fromStrings = true;
  for (const [gr, k] of Object.entries(keys)) {
    const s = strings?.[k]; if (!s) fromStrings = false;
    out[gr] = {};
    for (const lang of ['ko', 'en']) { const cand = [JUDGE_NAME_REC[gr][lang], s?.[lang]].filter(Boolean); out[gr][lang] = cand.sort((a, b) => estTextW(b, 28) - estTextW(a, 28))[0]; }
  }
  return { names: out, fromStrings };
}
const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const fmtBox = (b) => `x ${b.x0.toFixed(1)}~${b.x1.toFixed(1)} y ${b.y0.toFixed(1)}~${b.y1.toFixed(1)}`;
// 화면 고정 검사: 크기(이름 ≥ 28, % ≥ 14, 0.5~0.6배) · 가장 긴 이름이 자리 안(튐 포함) · HUD 띠 밖 · 공 세로 줄·튐 선·북·손가락·글 자리·콤보와 안 겹침
export function judgementStatic(L, D) {
  let strings = null; try { strings = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8')); } catch {}
  const { names, fromStrings } = judgeNames(strings);
  const bal = D?.bal ?? BAL0;
  const rows = []; let fail = 0;
  const S = L.judgement.style;
  for (const [W, H, st, sb] of RES) {
    const g = compute(L, W, H, st, sb, bal.scroll?.drum_x_ratio ?? 0.3), J = g.judge, Z = J.zone;
    const zoneW = Z.x1 - Z.x0;
    let widest = { w: 0 }; const widths = [];
    for (const [gr, by] of Object.entries(names)) for (const [lang, s] of Object.entries(by)) { const w = estTextW(s, J.nameP) + S.name_stroke_px; widths.push(`${s} ${w.toFixed(0)}`); if (w > widest.w) widest = { w, s, gr, lang }; }
    const pctW = estTextW('100%', J.pctP);
    const tickW = 2 * (S.ticks.x_of_name[1] * J.nameP + S.ticks.splay_px) + S.ticks.w_px;
    const scaleX = Math.min(J.pop, zoneW / widest.w);
    const popBox = { x0: Z.x1 - widest.w * scaleX, x1: Z.x1, y0: Z.y1 - J.popH, y1: Z.y1 };
    const r = g.d / 2 + L.ball.outline_of_d * g.d;
    const ballCol = { x0: g.cx - r, x1: g.cx + r, y0: g.bandBottom, y1: g.skinY };
    const bounce = { x0: g.cx - L.grade_fx.max_r_of_d * g.d, x1: g.cx + L.grade_fx.max_r_of_d * g.d, y0: g.skinY - g.d / 2 - L.grade_fx.max_r_of_d * g.d, y1: g.skinY };
    const drumUp = { x0: g.drumLeft, x1: g.drumLeft + g.dw, y0: g.skinY - L.drum.tap_lift_of_d * g.d, y1: g.floorTop };
    const approach = { x0: ballCol.x0, x1: W, y0: g.bandBottom, y1: g.laneBottom }; // S10(판정 표시용): 공 세로 줄 오른쪽 = 다가오는 길
    const st0 = staticChecks(L, D).rows.find((x) => x.g.W === W && x.g.H === H);
    const slot = st0.slot;
    const checks = {
      name28: J.nameP >= 28,
      pct14: J.pctP >= 14 && J.pctP / J.nameP >= 0.5 - 1e-9 && J.pctP / J.nameP <= 0.6 + 1e-9,
      fitsStatic: widest.w <= zoneW + 1e-6 && pctW <= zoneW && tickW <= zoneW,
      popInside: popBox.x0 >= Z.x0 - 1e-6 && popBox.y0 >= Z.y0 - 1e-6 && popBox.y1 <= Z.y1 + 1e-6 && Z.y1 - Z.y0 >= J.popH,
      belowHud: popBox.y0 >= g.objTop,
      offBallColumn: !hit(popBox, ballCol),
      offBounceFx: !hit(popBox, bounce),
      offDrum: !hit(popBox, drumUp),
      offApproach: !hit(popBox, approach),
      offFinger: !hit(popBox, g.fingerBox),
      offTextSlot: !hit(popBox, slot),
      offHud: !hit(popBox, g.comboBox) && !hit(popBox, g.attBox) && popBox.y0 >= g.bandBottom,
    };
    for (const v of Object.values(checks)) if (!v) fail++;
    rows.push({ g, J, Z, widest, widths, pctW, scaleX, popBox, checks, slot });
  }
  return { rows, fail, names, fromStrings };
}
// 시간축 검사(레벨 v2 × 4해상도): 앞 hit 의 표시(이른 통과 탭 − pass_early ~ 접촉 + 550 ms, 튐 1.15배 상자)가 그동안의 지붕·가지·구름(끝 구름 포함)·박 표시와 겹치지 않음.
//   언덕(뒤 층)은 표시가 공 왼쪽(지나간 쪽)에 있으므로 지나간 언덕 위에만 올 수 있음 → 정보로 셈. 마지막 판정 표시는 HUD 페이드(0.2 s) 안에 사라져 등급 칸보다 먼저 끝남.
export function judgementWorld(L, D) {
  const out = []; let fail = 0;
  const ok = (n, p, m) => { out.push(`${p ? 'OK  ' : 'FAIL'} ${n}: ${m}`); if (!p) fail++; };
  const { bal, J } = D;
  const T = bal.judgement_display?.timing || {}, total = T.total_ms ?? 550;
  // 레벨 개별 아랫면이 기본보다 낮으면 자리 y0 이 틀림
  const lowUnder = [];
  for (const { lv } of D.comp) for (const o of lv.objects || []) if ((o.type === 'roof' || o.type === 'branch') && o.under_of_Hp != null && o.under_of_Hp < minUnderOfHp(bal) - 1e-9) lowUnder.push(`L${lv.id} ${o.type} ${o.under_of_Hp}`);
  ok('판정 표시 자리 아랫면 기준', !lowUnder.length, lowUnder.length ? `기본 ${minUnderOfHp(bal)}·Hp 보다 낮은 물체 ${lowUnder.join(', ')}` : `지붕·가지 아랫면 최소 ${minUnderOfHp(bal)}·Hp(레벨 개별 값 포함) — 자리 윗선 = 그 선 + 4 px`);
  for (const [W, H, st, sb] of RES) {
    const g = compute(L, W, H, st, sb, bal.scroll?.drum_x_ratio ?? 0.3), JG = g.judge;
    const sj = judgementStatic(L, D).rows.find((x) => x.g.W === W && x.g.H === H);
    const box = sj.popBox;
    let windows = 0, samples = 0, hillInfo = 0; const bad = [];
    for (const { lv, C } of D.comp) {
      const hits = C.contacts.filter((c) => c.kind !== 'nogo');
      const marks = hits.map((c) => c.beat);
      for (const c of hits) {
        windows++;
        for (let t = c.t - C.judge.pass_early_ms; t <= c.t + total; t += 10) {
          samples++;
          for (const o of C.objects || []) {
            if (o.type === 'mark') continue;
            const x0 = J.worldX(C, o.beat_in, t, W), x1 = J.worldX(C, o.beat_out, t, W);
            if (x1 < box.x0 - 3 * g.d || x0 > box.x1 + 3 * g.d) continue;
            let ob;
            if (o.type === 'roof') { const uY = g.skinY - (o.under_of_Hp ?? bal.objects?.roof?.under_of_Hp ?? 0.45) * g.Hp, rg = roofGeom(x0, x1, uY, g.d); ob = { x0, x1, y0: rg.domeTop - (rg.bodyTop - rg.domeTop), y1: uY + SHAPE.roof.outline_px }; }
            else if (o.type === 'branch') { const uY = g.skinY - (o.under_of_Hp ?? bal.objects?.branch?.under_of_Hp ?? 0.34) * g.Hp; ob = { x0: x0 - g.d * 0.3, x1: x1 + g.d * 0.3, y0: branchGeom(x0, x1, uY, g.d).top, y1: uY + 2 }; }
            else if (o.type === 'cloud') ob = { x0: x0 - L.cloud.side_margin_of_d * g.d, x1: x1 + L.cloud.side_margin_of_d * g.d, y0: g.objTop, y1: g.cloudBottom + 2 };
            else if (o.type === 'hill') { const hb = { x0, x1, y0: g.skinY - (o.top_of_Hp ?? bal.objects?.hill?.top_of_Hp ?? 0.3) * g.Hp, y1: g.floorTop }; if (hit(box, hb)) hillInfo++; continue; }
            else continue;
            if (hit(box, ob)) bad.push(`L${lv.id} 접촉 ${c.i}(${c.beat}박) +${Math.round(t - c.t)} ms ${o.type} [${o.beat_in},${o.beat_out}]`);
          }
          for (const b of marks) { const mx = J.worldX(C, b, t, W), mb = { x0: mx - SHAPE.mark.w_of_d * g.d / 2 - 1, x1: mx + SHAPE.mark.w_of_d * g.d / 2 + 1, y0: g.laneY - SHAPE.mark.h_of_d * g.d - 1, y1: g.laneBottom }; if (hit(box, mb)) { bad.push(`L${lv.id} 접촉 ${c.i} 박 표시 ${b}`); break; } }
        }
      }
      // 마지막 판정 표시는 HUD 페이드(0.2 s) 안에 사라짐 → 등급 칸(큰 튐) 보다 먼저
      const cs = lv.clear_sequence, last = hits[hits.length - 1];
      if (cs && last) { const endMs = last.t + C.judge.pass_late_ms + 200, gradeMs = cs.big_toss_beat * C.beatMs; if (endMs > gradeMs) bad.push(`L${lv.id} 마지막 표시 끝 ${endMs.toFixed(0)} ms > 등급 칸 ${gradeMs.toFixed(0)} ms`); }
    }
    ok(`판정 표시 시간축 ${W}x${H}`, !bad.length, bad.length ? `${bad.length}건: ${[...new Set(bad)].slice(0, 6).join(' / ')}` : `hit 표시 ${windows}개 × [−이른 창, +${total} ms] 10 ms 간격 ${samples}점: 지붕·가지·구름(끝 구름 포함)·박 표시와 겹침 0, 마지막 표시 페이드 < 등급 칸 · 지나간 언덕 위(뒤 층, 허용) ${hillInfo}점`);
  }
  return { out, fail };
}

// 콤보 층 SVG(목업·기준 그림): 파티클(그 콤보 단계) → 큰 숫자 → 라벨(표지·글·단계 칸). 색·불투명도 = palette combo_fx
export const comboTier = (L, n) => { let k = 0; L.combo.particles.tiers.forEach((t, i) => { if (n >= t.at) k = i + 1; }); return k; };
export function comboFxSvg(L, g, theme, n, { seed = 1, particles = true, label = null, PALx = PAL } = {}) {
  const T = PALx.themes[theme], C = PALx.common, F = PALx.combo_fx || {};
  const col = (key) => (key === 'accent' ? T.accent : C[key] ?? key);
  const tierN = comboTier(L, n), P = L.combo.particles, s = [];
  if (particles && tierN) {
    const t = P.tiers[tierN - 1], sky = g.W * (g.floorTop - g.bandBottom);
    const cnt = Math.min(P.count_cap, Math.round(t.count_ref * Math.max(P.count_scale.min, Math.min(P.count_scale.max, sky / P.count_scale.ref_sky_px2))));
    let r = seed >>> 0; const rnd = () => ((r = (Math.imul(r, 1664525) + 1013904223) >>> 0) / 4294967296);
    const sz = t.size_of_d * g.d, fadeY = g.bandBottom + P.fade.out_band_of_H * g.H;
    for (let i = 0; i < cnt; i++) {
      const x = rnd() * g.W, y = g.bandBottom + rnd() * (g.floorTop - g.bandBottom);
      const ck = t.colors[i % t.colors.length], pc = F.particles?.[ck] || { color: ck, alpha: 0.5 };
      const a = pc.alpha * Math.max(0, Math.min(1, (y - g.bandBottom) / (fadeY - g.bandBottom)));
      if (a <= 0.01) continue;
      if (i % 2 === 0) s.push(`<rect x="${(x - sz / 2).toFixed(1)}" y="${(y - sz / 2).toFixed(1)}" width="${sz.toFixed(1)}" height="${sz.toFixed(1)}" rx="${(sz * P.shape.rx_of_size).toFixed(1)}" fill="${col(pc.color)}" fill-opacity="${a.toFixed(2)}"/>`);
      else s.push(`<path d="M${x.toFixed(1)} ${(y - sz * 0.62).toFixed(1)}L${(x + sz * 0.62).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y + sz * 0.62).toFixed(1)}L${(x - sz * 0.62).toFixed(1)} ${y.toFixed(1)}Z" fill="${col(pc.color)}" fill-opacity="${a.toFixed(2)}"/>`);
    }
  }
  const G = g.combo, B = L.combo.label, fam = "system-ui, -apple-system, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif";
  const nf = F.number || { color: 'accent', alpha: 0.34 }, lf = F.label || { color: 'ink', alpha: 0.66 };
  s.push(`<text x="${G.cx.toFixed(1)}" y="${G.baseline.toFixed(1)}" text-anchor="middle" font-family="${fam}" font-weight="${L.combo.number.weight}" font-size="${G.fontPx}" fill="${col(nf.color)}" fill-opacity="${nf.alpha}">${n}</text>`);
  const lp = G.labelPx, lx0 = G.labelBox.x0, ly = G.labelBox.y0, ms = B.mark.size_of_px * lp;
  let lab = `<g opacity="${lf.alpha}"><rect x="${lx0.toFixed(1)}" y="${(ly + (lp - ms) / 2).toFixed(1)}" width="${ms.toFixed(1)}" height="${ms.toFixed(1)}" rx="${(ms * B.mark.rx_of_size).toFixed(1)}" fill="${C[B.mark.fill]}" stroke="${C[B.mark.stroke]}" stroke-width="${B.mark.stroke_px}"/>`;
  const tx = lx0 + ms + B.mark.gap_of_px * lp, txt = label ?? G.label;
  lab += `<text x="${tx.toFixed(1)}" y="${(ly + lp * 0.86).toFixed(1)}" font-family="${fam}" font-weight="${B.weight}" font-size="${lp}" fill="${col(lf.color)}">${txt}</text>`;
  const ts = B.tiers.size_of_px * lp; let x = tx + labelEstW(txt, lp) + B.tiers.lead_of_px * lp;
  for (let i = 0; i < B.tiers.n; i++) { lab += `<rect x="${x.toFixed(1)}" y="${(ly + (lp - ts) / 2).toFixed(1)}" width="${ts.toFixed(1)}" height="${ts.toFixed(1)}" rx="1.5" fill="${i < tierN ? C.ink : 'none'}" stroke="${C.ink}" stroke-width="1"/>`; x += ts + B.tiers.gap_of_px * lp; }
  s.push(lab + '</g>');
  return s.join('\n');
}

function mockup(L, W, H, scene) {
  const g = compute(L, W, H), C = PAL.common, T = PAL.themes[scene.theme];
  const o = Math.max(2, L.ball.outline_of_d * g.d), ppb = ((1 - 0.3) * W) / scene.ahead, X = (b) => g.cx + b * ppb;
  const s = [];
  s.push(`<rect width="${W}" height="${H}" fill="${T.bg1}"/>`);
  for (const e of T.silhouette || []) { if (e.t === 'rect') { const top = e.anchor === 'floor' ? g.floorTop - e.dy * g.S - e.h * g.S : g.bandBottom + e.dy * g.S; s.push(`<rect x="${(e.x * W).toFixed(1)}" y="${top.toFixed(1)}" width="${(e.w === 'full' ? W : e.w * g.S).toFixed(1)}" height="${(e.h * g.S).toFixed(1)}" fill="${T.sil}"/>`); } }
  if (scene.combo >= (L.combo.show_from ?? 2)) s.push(comboFxSvg(L, g, scene.theme, scene.combo, { seed: W + H }));
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
  if (scene.judge && g.judge) s.push(judgementSvg(L, g.judge.box.x1, g.judge.box.y0, g.judge.nameP, g.judge.pctP, scene.judge.grade, scene.judge.name, scene.judge.pct));
  // HUD
  const st = 0, Hd = L.hud, bx1 = W - Hd.bar.x1_from_right;
  s.push(`<rect x="${Hd.bar.x0}" y="${st + Hd.bar.y}" width="${bx1 - Hd.bar.x0}" height="${Hd.bar.h}" rx="5" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>`);
  s.push(`<rect x="${Hd.bar.x0 + 2}" y="${st + Hd.bar.y + 2}" width="${((bx1 - Hd.bar.x0 - 4) * scene.progress).toFixed(1)}" height="${Hd.bar.h - 4}" rx="3" fill="${C.drumBody}"/>`);
  s.push(`<circle cx="${(Hd.bar.x0 + (bx1 - Hd.bar.x0) * 0.62).toFixed(1)}" cy="${st + Hd.bar.y + Hd.bar.h / 2}" r="${Hd.bar.best_r}" fill="${C.ball}" stroke="${C.ink}" stroke-width="2"/>`);
  for (let i = 0; i < scene.attempts; i++) s.push(`<circle cx="${Hd.attempts.x0 + i * Hd.attempts.pitch}" cy="${st + Hd.attempts.cy}" r="${Hd.attempts.dot_r}" fill="${C.drumBody}"/>`);
  const pz = Hd.pause;
  s.push(`<rect x="${pz.x}" y="${pz.y}" width="${pz.size}" height="${pz.size}" rx="13" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/><rect x="${pz.x + 14}" y="${pz.y + 12}" width="6" height="20" rx="3" fill="${C.ink}"/><rect x="${pz.x + 24}" y="${pz.y + 12}" width="6" height="20" rx="3" fill="${C.ink}"/>`);
  // 치수 표시(빌드에 그리지 않음)
  const yHp = g.skinY - g.Hp;
  s.push(`<g stroke="#D11" stroke-width="1" fill="none" stroke-dasharray="4 3"><line x1="0" y1="${g.bandBottom}" x2="${W}" y2="${g.bandBottom}"/><line x1="8" y1="${g.skinY}" x2="${W - 8}" y2="${g.skinY}"/><line x1="8" y1="${yHp.toFixed(1)}" x2="${W - 8}" y2="${yHp.toFixed(1)}"/><line x1="8" y1="${g.cloudEdgeY.toFixed(1)}" x2="${W - 8}" y2="${g.cloudEdgeY.toFixed(1)}"/><line x1="${g.cx}" y1="${g.bandBottom}" x2="${g.cx}" y2="${H}"/>`);
  if (scene.slot) { const r = staticChecks(L).rows.find((x) => x.g.W === W && x.g.H === H).slot; s.push(`<rect x="${r.x0}" y="${r.y0.toFixed(1)}" width="${(r.x1 - r.x0).toFixed(1)}" height="${(r.y1 - r.y0).toFixed(1)}"/>`); }
  s.push(`<rect x="${g.drumLeft.toFixed(1)}" y="${g.bandBottom}" width="${(W - g.drumLeft).toFixed(1)}" height="${(g.laneBottom - g.bandBottom).toFixed(1)}" stroke="#1A8" stroke-dasharray="2 4"/>`);
  { const R = g.combo.region; s.push(`<rect x="${R.x0.toFixed(1)}" y="${R.y0.toFixed(1)}" width="${(R.x1 - R.x0).toFixed(1)}" height="${(R.y1 - R.y0).toFixed(1)}" stroke="#E80" stroke-dasharray="6 3"/>`); }
  if (g.judge) { const Z = g.judge.zone; s.push(`<rect x="${Z.x0}" y="${Z.y0.toFixed(1)}" width="${(Z.x1 - Z.x0).toFixed(1)}" height="${(Z.y1 - Z.y0).toFixed(1)}" stroke="#C0C" stroke-dasharray="1 3"/>`); }
  s.push('</g>');
  s.push(`<g font-family="sans-serif" font-size="10" fill="#D11"><text x="${W - 150}" y="${g.bandBottom + 11}">HUD 띠 아래 y ${g.bandBottom}</text><text x="10" y="${g.skinY - 3}">북 가죽 h=0</text><text x="10" y="${(yHp - 3).toFixed(1)}">h = Hp ${g.Hp.toFixed(0)}px</text><text x="10" y="${(g.cloudEdgeY + 11).toFixed(1)}">구름선 0.9 Hp</text><text x="${g.cx + 4}" y="${H - 6}">북 0.30 W</text>${scene.slot ? `<text x="${scene.slotLabelX ?? 20}" y="${H - 6}">tut_tap 글 자리</text>` : ''}</g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<!-- rhythm-02 round-2 플레이 화면 목업 ${W}x${H} (tools/art/layout.mjs 생성, 손으로 고치지 않음). ${scene.note} 빨간 점선 = HUD 띠 아래·북 가죽·Hp·구름선·북 0.30 W, 초록 점선 = 다가오는 길 영역(S10: UI 금지), 빨간 상자 = 글 자리(빌드에 없음), 보라 점선 = 판정 이름·% 자리(layout.json judgement, 빌드에 없음), 주황 점선 = 콤보 큰 숫자·라벨 자리(layout.json combo.region, 빌드에 없음). 콤보 숫자·라벨·파티클은 바탕·실루엣 바로 위 뒤 층(물체·북·공이 그 위). 30-art 4절·6-2·6-3 -->\n${s.join('\n')}\n</svg>\n`;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/art/layout.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const L = args.includes('--check') ? JSON.parse(readFileSync(OUT, 'utf8')) : LAYOUT;
  if (!args.includes('--check')) {
    writeFileSync(OUT, JSON.stringify(L, null, 1) + '\n');
    writeFileSync(join(PROJ, 'assets/mockup-play-360x640.svg'), mockup(L, 360, 640, { theme: 'level05', ahead: 3.5, marks: [0.45, 4.45], ballH: 0.15, objs: [{ type: 'roof', b0: 0.85, b1: 3.85 }], progress: 0.35, attempts: 3, combo: 23, judge: { grade: 'perfect', name: '딱이야', pct: 100 }, note: '레벨 5 색, 공 = 1박 비행 내려오는 중, 지붕(치지 마)이 다가옴(앞 3.5박), 콤보 23(파티클 단계 2: accent + 금빛 조각, 뒤 층), 앞 hit 판정 표시 "딱이야 100%"(가장 긴 이름, 북 옆·공 세로 줄 왼쪽, 유지 400 ms 안의 모습).' }));
    // 판정 표시 기준 그림: 360x640 크기(이름 28 / % 15 px), 위 = 한국어, 아래 = 영어, 왼→오 딱 / 좋아 / 통과. 두 바탕(L1 bg1, L9 bg3 = 가장 어두운 바탕)
    {
      let strings = {}; try { strings = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8')); } catch {}
      const { names } = judgeNames(strings), g = compute(L, 360, 640).judge, PALc = PAL.common;
      const cell = 120, rowH = 70; let b = '';
      [['level01', 'bg1'], ['level09', 'bg3']].forEach(([th, bk], k) => { b += `<rect x="0" y="${k * 2 * rowH}" width="${cell * 3}" height="${2 * rowH}" fill="${PAL.themes[th][bk]}"/>`; });
      [0, 1].forEach((k) => ['ko', 'en'].forEach((lang, li) => ['perfect', 'good', 'pass'].forEach((gr, i) => { b += judgementSvg(L, i * cell + cell - 14, (k * 2 + li) * rowH + 6, g.nameP, g.pctP, gr, names[gr][lang], { perfect: 100, good: 70, pass: 30 }[gr], PALc); })));
      writeFileSync(join(PROJ, 'assets/obj-judgement.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cell * 3} ${rowH * 4}" width="${cell * 3}" height="${rowH * 4}">\n<!-- 판정 이름·% 표시 기준(30-art 6-3, layout.json judgement, tools/art/layout.mjs 생성 — 손으로 고치지 않음). 360x640 크기: 이름 ${g.nameP} px(굵게, 면 = judgePerfect/judgeGood/judgePass + ink 외곽선 3 px paint-order stroke), % ${g.pctP} px(ink), 이름 위 튐 선 2·1·0쌍 = 공 옆 튐 선과 같은 수. 왼→오 딱(${names.perfect.ko}/${names.perfect.en}) · 좋아 · 통과, 줄 = 한국어 / 영어, 위 두 줄 L1 bg1 · 아래 두 줄 L9 bg3. 오른쪽 맞춤(자리 오른쪽 끝 = 북·공 쪽). 글꼴은 system-ui(외부 글꼴 없음) — 실제 폭은 빌드 글꼴에서 measureText. 원작 판정 글자·이름 아님 -->\n${b}\n</svg>\n`);
    }
    writeFileSync(join(PROJ, 'assets/mockup-play-640x360.svg'), mockup(L, 640, 360, { theme: 'level01', ahead: 4, marks: [0, 1, 2, 3, 4], ballH: 0, finger: true, slot: true, progress: 0.08, attempts: 1, combo: 12, note: '레벨 1 색, 첫 접촉: 표시가 북 다리 밑에 옴 + 손가락(북 왼쪽 바닥) + tut_tap 글 자리, 콤보 12(파티클 단계 1 — 장면 설명용, 실제 첫 접촉은 콤보 0).' }));
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
  {
    const JS = judgementStatic(L, D);
    console.log(`\n판정 이름·% 표시(30-art 6-3) — 폭 검사 이름: ${Object.entries(JS.names).map(([gr, v]) => `${gr} ${v.ko}/${v.en}`).join(' · ')} (${JS.fromStrings ? '권장안과 strings.json 중 긴 쪽' : '대기: strings.json grade_*_name 없음 → 권장안'})`);
    console.log('| 해상도 | 이름 / % px | 자리 x · y | 가장 긴 이름 폭(외곽선 포함) / 자리 폭 | 가로 튐 최대 | 튐 상자 | 검사 |');
    console.log('|---|---|---|---|---|---|---|');
    for (const r of JS.rows) { const bad = Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k); console.log(`| ${r.g.W}x${r.g.H} | ${r.J.nameP} / ${r.J.pctP} (${(r.J.pctP / r.J.nameP).toFixed(2)}배) | ${r.Z.x0}~${r.Z.x1.toFixed(1)} · ${r.Z.y0.toFixed(1)}~${r.Z.y1.toFixed(1)} | ${r.widest.s} ${r.widest.w.toFixed(1)} / ${(r.Z.x1 - r.Z.x0).toFixed(1)} | ${r.scaleX.toFixed(3)} | ${fmtBox(r.popBox)} | ${bad.length ? 'FAIL ' + bad.join(',') : 'OK'} |`); }
    total += JS.fail;
    if (!JS.fromStrings) wait++;
  }
  if (D) {
    const JW = judgementWorld(L, D);
    for (const x of JW.out) console.log(x);
    total += JW.fail;
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
  console.log(total ? `layout FAIL ${total}${wait ? ` (대기 ${wait})` : ''}` : `layout OK (HUD 띠·콤보 띠 밖·구름 덮음·보이는 공·실루엣 윗선 ≥ HUD 띠, 글 자리·손가락 길 영역 밖, 판정 이름·% 크기·자리·겹침(4해상도 × 가장 긴 이름, 시간축), 표시 간격 ≥ 32 px 4해상도, 높이 round-1 항목${wait ? ` — 대기 ${wait}: balance v2 레벨` : ''})`);
  process.exit(total ? 1 : 0);
}
