// tcg-01 「썰물 영장」 아트 사양 원본 (art-director, 1-1)
// 이 파일의 값이 유일한 원본입니다. `node tools/art/build.mjs`가 art.json·assets/*.svg를 다시 만듭니다.
// 단위는 키 이름 끝에 붙입니다: _px(CSS px = dp), _ms, _s, _hz, _db, _deg, _pct(0~100), _ratio(0~1), _bpm.

export const SCHEMA = 1;

// ───────────────────────── 팔레트 ─────────────────────────
// 공통 UI: "흑조 바탕 위 소금판". 밝은 것은 소금·심지 불빛뿐이고 나머지는 젖은 돌의 명도.
export const ui = {
  bg_abyss: '#0B151B',        // 화면 가장 바깥(흑조)
  bg_panel: '#14232B',        // 메뉴 판·대화창
  board_wet_salt: '#22333B',  // 조수원 바닥(젖은 소금)
  board_ring: '#5E7480',      // 소금 고리 선(장식, 글자 아님)
  board_slot: '#2C414B',      // 빈 칸 자리 표시
  line_soft: '#3C5560',       // 구분선
  salt_white: '#F2EEE4',      // 기본 글자·숫자
  salt_dim: '#AEB9BD',        // 보조 글자
  card_plate: '#E6E0D2',      // 카드 소금유리 판(밝음)
  card_plate_shade: '#CFC7B4',
  card_ink: '#1A2227',        // 카드 위 글자
  card_ink_dim: '#4A5257',    // 카드 위 보조 글자(플레이버)
  stat_tab: '#142027',        // 비용·공격·명줄 숫자 판
  wick_flame: '#F4B740',      // 심지 불빛(켜진 심지, 비용 강조)
  wick_lit_bar: '#E9A62E',
  wick_spent: '#4D585D',      // 쓴 심지
  wick_soot: '#6B4A3A',       // 그을음으로 막힌 심지
  wick_ink: '#1B1306',        // 심지 판 위 숫자
  focus: '#7FE3FF',           // 선택·대상 지정 테두리
  button_primary: '#F4B740',  // 숨 고르기(턴 종료) 강조
  button_primary_ink: '#1B1306',
  button_idle: '#2E4650',
  button_idle_ink: '#F2EEE4',
  tide_black: '#071017',      // 흑조 연출(어둡게 하기)
};

// 영웅(세력) 색: lore 10-lore 4절 시각 힌트에서. primary = 실루엣·띠, secondary = 장식·윤곽,
// deep = 초상 바탕, ink = primary 위 글자(자동 대비 검사).
export const factions = {
  h_warden:   { name_ko: '염수 파수단', primary: '#7590A0', secondary: '#EDEBE4', deep: '#1E2E38', ink: '#0E1418', shape: 'shield' },
  h_choir:    { name_ko: '익사자 합창회', primary: '#226A65', secondary: '#E3D9C0', deep: '#050F0E', ink: '#F4EFE2', shape: 'drop_inverted' },
  h_wreck:    { name_ko: '난파 조합', primary: '#C4642E', secondary: '#D4AE52', deep: '#2E1A10', ink: '#140A04', shape: 'hexagon' },
  h_rider:    { name_ko: '염풍 씨족', primary: '#C69043', secondary: '#B8352D', deep: '#2E2010', ink: '#160F05', shape: 'triangle_lean' },
  h_archive:  { name_ko: '등불 서고회', primary: '#F0AC3C', secondary: '#2A2622', deep: '#221B12', ink: '#1A1206', shape: 'tall_rect_flames' },
  h_nameless: { name_ko: '무명단', primary: '#8F969C', secondary: '#76608A', deep: '#1D1B24', ink: '#111316', shape: 'crescent_blank' },
  neutral:    { name_ko: '공용', primary: '#CFC19F', secondary: '#7FB8A4', deep: '#1E2A28', ink: '#1A1A14', shape: 'circle' },
};

// 희귀도 4단계: 소금 덩이 예고색(팩)과 카드 깨진 모서리 면 색이 같음.
export const rarity = {
  sand:  { name_ko: '일반', world_ko: '모래', fill: '#D9C79F', facet: '#9A8152', edge: '#9C8A62', glow: null,      ink: '#1E1A10', glyph: 'grains' },
  pearl: { name_ko: '고급', world_ko: '진주', fill: '#F3F0F8', facet: '#C9DAF0', edge: '#7F93B2', glow: '#DDE9FF', ink: '#1A1D24', glyph: 'pearl', sheen: ['#F3F0F8', '#D2E6F6', '#F6DCEC'] },
  coral: { name_ko: '희귀', world_ko: '산호', fill: '#FF7A52', facet: '#E8603A', edge: '#B8432A', glow: '#FFB199', ink: '#200A04', glyph: 'branch' },
  abyss: { name_ko: '전설', world_ko: '심해', fill: '#163562', facet: '#163562', edge: '#4DE0FF', glow: '#4DE0FF', ink: '#EAF9FF', glyph: 'deep_eye' },
};

// 상태 색: 숫자·떠오르는 글자에 쓰는 색(stat_tab·board 위 4.5:1 검사).
export const state = {
  damage: '#FF6F5E',      // 피해 숫자, 다친 명줄 숫자
  heal: '#6EE7A8',        // 회복 숫자
  buff: '#FFD166',        // 기본보다 높은 수치, 강화 화살표
  debuff: '#C9A3FF',      // 기본보다 낮은 수치, 약화 화살표
  shell: '#E9F2F5',       // 껍질 수치
  splat_damage: '#B3261C', // 피해 숫자 뒤 터짐 바탕(흰 숫자 4.5:1)
  splat_heal: '#1D6B45',
};

// 키워드 18개 상태 표시(보드 위 아이콘·외곽 효과 색). 아이콘은 그래픽이라 3:1 이상 검사.
export const keywords = [
  { id: 'first_breath', ko: '등장',   en: 'On Play', color: '#BFE9FF', board_mark: 'none_after_play', icon: 'breath' },
  { id: 'ebb',          ko: '사망 시',     en: 'On Death',          color: '#8FB7D6', board_mark: 'corner_icon', icon: 'ebb' },
  { id: 'breakwater',   ko: '방벽',   en: 'Wall',   color: '#D8D0BC', board_mark: 'wall_frame', icon: 'breakwater' },
  { id: 'saltskin',     ko: '튕겨내기',   en: 'Deflect',     color: '#FFFFFF', board_mark: 'crystal_outline', icon: 'saltskin' },
  { id: 'seamist',      ko: '위장',   en: 'Camouflage',      color: '#A9BCC6', board_mark: 'fog_overlay', icon: 'seamist' },
  { id: 'spur',         ko: '기습',     en: 'Skirmish',         color: '#FFB547', board_mark: 'ready_answerers', icon: 'spur' },
  { id: 'rapids',       ko: '즉시 공격',     en: 'Instant Attack',       color: '#5FD0FF', board_mark: 'ready_all', icon: 'rapids' },
  { id: 'drown',        ko: '즉사',     en: 'Deadly',        color: '#6E8BFF', board_mark: 'corner_icon', icon: 'drown' },
  { id: 'draught',      ko: '흡혈',   en: 'Drain',      color: '#7EE8B5', board_mark: 'corner_icon', icon: 'draught' },
  { id: 'unname',       ko: '효과 지우기', en: 'Erase',    color: '#C4C9CC', board_mark: 'scratched_text', icon: 'unname' },
  { id: 'anchor',       ko: '속박',       en: 'Bind',       color: '#9DB2BF', board_mark: 'chain_overlay', icon: 'anchor' },
  { id: 'kindle',       ko: '주문 위력',     en: 'Empower',       color: '#FF9A4D', board_mark: 'corner_value', icon: 'kindle' },
  { id: 'sealwrit',     ko: '덫',   en: 'Snare',     color: '#D9875A', board_mark: 'hero_seal_slot', icon: 'sealwrit' },
  { id: 'soot',         ko: '마나 빚',   en: 'Mana Debt',         color: '#B9A99A', board_mark: 'wick_bar_soot', icon: 'soot' },
  { id: 'wake',         ko: '후속',   en: 'Follow-up',         color: '#9EE6E0', board_mark: 'glow_when_active', icon: 'wake' },
  { id: 'salvage',      ko: '골라잡기',     en: 'Pick',      color: '#E0B866', board_mark: 'none_after_play', icon: 'salvage' },
  { id: 'swell',        ko: '성장',   en: 'Grow',        color: '#4FC9EC', board_mark: 'corner_icon', icon: 'swell' },
  { id: 'brine',        ko: '중독',   en: 'Toxin',        color: '#E8F7F2', board_mark: 'counter_pips', icon: 'brine' },
];

// ───────────────────────── 카드 규칙 ─────────────────────────
// 카드 판 기준 크기(확대 보기). 모든 축소는 이 좌표계를 scale로 줄임.
export const card = {
  aspect_w_h_ratio: 0.714,      // 5:7
  base_w_px: 250, base_h_px: 350, // 확대 보기 기준(실제 확대 크기는 layout.zoom)
  chip_corner_px: 34,           // 오른쪽 위 깨진 모서리(소금유리) 대각선 길이
  border_px: 6,
  spine_w_px: 10,               // 왼쪽 세력 띠
  cost: { x_px: 10, y_px: 10, w_px: 40, h_px: 58, font_px: 34 },      // 왼쪽 위 세로 심지 판
  art: { x_px: 18, y_px: 22, w_px: 214, h_px: 150 },                    // 직사각 그림 창(4:3에 가깝게)
  name_band: { y_px: 176, h_px: 30, font_px: 17 },
  type_line: { y_px: 210, h_px: 16, font_px: 11 },
  text_box: { x_px: 22, y_px: 228, w_px: 206, h_px: 76, font_px: 13, max_lines: 4, chars_per_line: 15 },
  stat_tab: { w_px: 120, h_px: 44, overhang_px: 14, font_px: 30 },      // 아래 가운데에 매달린 판 하나(왼쪽 공격·오른쪽 명줄)
  keyword_icons: { max: 3, size_px: 22, y_px: 150 },                    // 그림 창 아래 가장자리에 걸친 아이콘 줄
  rite_text_box_h_px: 100,      // 의식은 스탯 판이 없고 글 상자가 큼
};

// 돌파(새김) 단계별 외형
export const recut = [
  { level: 0, id: 'fresh_cut', ko: '기본', frame_groove_lines: 1, salt_flecks: 0, shimmer: false, tab_notches: 0, entry_fx: 'normal' },
  { level: 1, id: 'deep_cut',  ko: '돌파 1', frame_groove_lines: 2, salt_flecks: 0, shimmer: false, tab_notches: 1, entry_fx: 'normal' },
  { level: 2, id: 'salt_set',  ko: '돌파 2', frame_groove_lines: 2, salt_flecks: 6, shimmer: false, tab_notches: 2, entry_fx: 'salt_burst' },
  { level: 3, id: 'abyss_set', ko: '돌파 3', frame_groove_lines: 2, salt_flecks: 6, shimmer: true,  tab_notches: 3, entry_fx: 'abyss_rise', shimmer_period_ms: 4200 },
];

// ───────────────────────── 화면 구성 입력 ─────────────────────────
// 실제 좌표는 layout.mjs가 해상도마다 계산해 art.json layout.screens에 넣음.
export const layoutInput = {
  board_slots: 5,              // 기본값. 실제는 layout.mjs가 balance.json rules.board_limit(1-2 확정 5)를 읽음
  hand_limit: 10,
  touch_min_px: 48,
  gutter_px: 8,
  safe_top_px: 8, safe_bottom_px: 8,
  slot_gap_px: 6,
  slot_aspect_h_w_ratio: 1.3,
  min_stat_font_px: 12,        // 축소 상태 숫자 최소 글자 크기
  min_name_font_px: 10,
};

// ───────────────────────── 연출 (템포·몰입이 최우선, 요청자 지시 2026-11-17) ─────────────────────────
// 원칙
// 1) 로직 먼저, 그림은 뒤따름: 입력 순간 규칙 엔진이 결과를 확정하고 연출은 그 결과를 "보여 주기"만 한다.
// 2) 첫 반응 ≤ 100 ms: 손가락이 닿은 프레임(≤ 16 ms)에 카드 들림·테두리, ≤ 30 ms에 소리 시작.
// 3) 빈 대기 0: 각 연출에는 input_lock_ms(다음 입력을 못 받는 시간)가 따로 있고 대부분 0~150 ms.
//    잠금 중 들어온 입력은 버리지 않고 예약(queue)하며, 예약이 있으면 남은 연출을 catch_up 배속으로 감는다.
// 4) 강약: 잔 행동(tier 0)은 짧고 조용하게, 큰 순간(tier 3)만 길고 강하게. 한 판에 tier 3은 드물어야 효과가 있다.
// 5) 빠르게 보기(fast): 시간만 줄이고 정보(피해 숫자·사망·발동 표시)는 하나도 빼지 않는다.
export const tempo = {
  input: {
    first_response_max_ms: 100, touch_feedback_frame_max_ms: 16, sfx_start_max_ms: 30,
    queue_max_actions: 3, catch_up_speed_ratio: 2.0, catch_up_mode: 'finish_to_end_state', // round-1: 예약이 있으면 진행 중 연출을 끝 상태로 바로 넘김(빌드 방식 채택, 정보 손실 0 실측). 2배속은 쓰지 않음
    tap_to_skip_after_ms: 0,                           // 아무 연출이나 탭하면 그 연출의 끝 상태로 즉시
  },
  speed_modes: { normal: 1.0, fast: 0.5 }, // 설정 "빠르게 보기". 아래 표는 두 값을 직접 적음(단순 곱이 아님)
  // 행동별 연출 시간 표 (ms). total = 그림이 끝나는 시간, lock = 다음 입력 잠금(그 뒤 입력은 바로 처리)
  actions: {
    card_hover:        { normal_ms: 90,   fast_ms: 60,   lock_ms: 0,   tier: 0, note: '손패 카드 들림·확대 1.15배' },
    card_draw:         { normal_ms: 360,  fast_ms: 200,  lock_ms: 0,   tier: 0, stagger_normal_ms: 90, stagger_fast_ms: 50 },
    play_answerer:     { normal_ms: 440,  fast_ms: 220,  lock_ms: 120, tier: 1, phases_normal_ms: { lift: 80, travel: 220, land: 140 }, land_squash_ratio: 0.92, dust_particles: 10 },
    play_rite:         { normal_ms: 520,  fast_ms: 260,  lock_ms: 150, tier: 1, phases_normal_ms: { gather: 200, release: 250, per_target_stagger: 60 }, wave_ring_count: 2 },
    play_brand:        { normal_ms: 480,  fast_ms: 240,  lock_ms: 120, tier: 1 },
    first_breath:      { normal_ms: 300,  fast_ms: 160,  lock_ms: 0,   tier: 1, note: '응답자 착지 직후 이어짐(따로 기다리지 않음)' },
    calling:           { normal_ms: 360,  fast_ms: 180,  lock_ms: 100, tier: 1, note: '호명술 판이 눌려 들어갔다 빛남' },
    attack:            { normal_ms: 530,  fast_ms: 300,  lock_ms: 150, tier: 1, phases_normal_ms: { windup: 120, dash: 160, hitstop: 50, return: 200 }, phases_fast_ms: { windup: 60, dash: 90, hitstop: 40, return: 110 }, note_r1: 'round-1: 빠르게 실측 334(+19 %). 정지 프레임도 빠르게 값(40)으로, tier 정지(TI.hitstop_ms)는 빠르게에서 절반', arc_height_ratio: 0.18, overshoot_px: 6 },
    damage_number:     { normal_ms: 800,  fast_ms: 500,  lock_ms: 0,   tier: 0, rise_px: 26, font_px_min: 20, font_px_max: 36, font_px_per_damage: 2, pop_scale_ratio: 1.35 },
    heal_number:       { normal_ms: 700,  fast_ms: 450,  lock_ms: 0,   tier: 0 },
    buff_debuff:       { normal_ms: 260,  fast_ms: 150,  lock_ms: 0,   tier: 0, note: '수치 칸이 한 번 튀고 색이 바뀜' },
    death:             { normal_ms: 500,  fast_ms: 250,  lock_ms: 0,   tier: 1, phases_normal_ms: { crack: 150, crumble: 350 }, salt_particles: 18 },
    ebb_trigger:       { normal_ms: 300,  fast_ms: 160,  lock_ms: 0,   tier: 1, note: '부서진 자리에서 물이 빠지는 띠 → 효과' },
    brine_tick:        { normal_ms: 300,  fast_ms: 160,  lock_ms: 0,   tier: 0, stagger_normal_ms: 80 },
    sealwrit_open:     { normal_ms: 900,  fast_ms: 450,  lock_ms: 300, tier: 2, note: '상대 차례에 열림. 밀랍이 깨지며 카드 확대 0.6 s' },
    turn_start_banner: { normal_ms: 900,  fast_ms: 450,  lock_ms: 0,   tier: 1, phases_normal_ms: { in: 180, hold: 520, out: 200 }, note: '배너가 떠 있는 동안에도 손패 조작 가능(드로우 연출과 겹쳐 진행)' },
    wick_light:        { normal_ms: 360,  fast_ms: 200,  lock_ms: 0,   tier: 0, stagger_normal_ms: 30 },
    end_breath_press:  { normal_ms: 250,  fast_ms: 150,  lock_ms: 250, tier: 0, note: '버튼 눌림 → 상대 차례 배너' },
    big_entry:         { normal_ms: 1800, fast_ms: 900,  lock_ms: 600, tier: 3, trigger: 'rarity==abyss || cost>=7', skippable_after_ms: 400, phases_normal_ms: { dim_in: 220, card_rise: 480, name_title: 700, land: 400 }, dim_ratio: 0.6, zoom_ratio: 1.08 },
    lethal_blow:       { normal_ms: 1500, fast_ms: 800,  lock_ms: 1500, tier: 3, chain_note_r1: '마지막 일격(1500) → 호명자 부서짐(700) → 결과 오버레이(승 1800/패 1600)를 따로 기록. 일격+부서짐 = 2200(빠르게 1200), 결과 화면 등장까지 tempoLog phase로 나눠 적기', note: '마지막 일격: 공격 궤적 0.35배 느리게 400 ms → 정지 160 ms → 명줄 실 끊김', slowmo_ratio: 0.35, slowmo_ms: 400 },
    hero_crack:        { normal_ms: 700,  fast_ms: 400,  lock_ms: 700, tier: 3 },
    victory:           { normal_ms: 1800, fast_ms: 900,  lock_ms: 600, tier: 3 },
    defeat:            { normal_ms: 1600, fast_ms: 800,  lock_ms: 600, tier: 3 },
    mulligan_swap:     { normal_ms: 500,  fast_ms: 300,  lock_ms: 0,   tier: 0 },
    hand_burn:         { normal_ms: 700,  fast_ms: 400,  lock_ms: 0,   tier: 1, note: '손패 넘침: 카드가 양쪽에 보이고 소금으로 바스러짐' },
    hollow_call:       { normal_ms: 700,  fast_ms: 400,  lock_ms: 0,   tier: 2, note: '빈 영장첩에서 검은 물 손이 올라옴 + 피해 숫자' },
  },
  // 상대 AI 턴 박자: "생각하는 척"은 짧게, 행동은 또렷이. 첫 수 전에만 길게 멈추고 이후는 리듬 있게.
  ai_turn: {
    think_first_normal_ms: [700, 1100], think_first_fast_ms: [300, 450],   // 턴 시작 배너 끝난 뒤 첫 행동까지(범위 안 무작위)
    between_actions_normal_ms: [420, 650], between_actions_fast_ms: [180, 300],
    hover_card_before_play_normal_ms: 260, hover_card_before_play_fast_ms: 120, // 손패 카드가 들리는 예고
    aim_arrow_before_attack_normal_ms: 320, aim_arrow_before_attack_fast_ms: 150, // 대상 화살표를 먼저 보여 줌
    hard_decision_extra_normal_ms: 400, hard_decision_fast_ms: 150, // 치명·전멸 같은 큰 수 앞에서만 한 번 더 멈춤(긴장)
    end_turn_after_last_normal_ms: 500, end_turn_after_last_fast_ms: 250,
    turn_total_cap_normal_ms: 12000, turn_total_cap_fast_ms: 6000, // 넘으면 남은 행동을 fast 값으로
    player_tap_speeds_up_ratio: 2.0, // 상대 턴 중 화면을 누르면 남은 상대 턴을 2배속
  },
  // 강약 4단계
  tiers: [
    { tier: 0, name: '잔 행동', examples: '뽑기·심지·작은 강화·피해 1~2·소금독 틱', max_ms: 400, hitstop_ms: 0,   shake: 'none',   zoom_ratio: 1.0,  sfx_gain_db: -22, music_duck_db: 0 },
    { tier: 1, name: '보통',    examples: '카드 내기·공격(공격력 3~4)·사망·의식',   max_ms: 600, hitstop_ms: 50,  shake: 'light',  zoom_ratio: 1.0,  sfx_gain_db: -14, music_duck_db: 0 },
    { tier: 2, name: '큰 수',   examples: '공격력 5~7·휩쓸기·한 번에 3명 이상 사망·봉인문 열림', max_ms: 900, hitstop_ms: 90, shake: 'medium', zoom_ratio: 1.03, sfx_gain_db: -10, music_duck_db: -4 },
    { tier: 3, name: '절정', max_note_r2: 'max_ms는 등장 연출 자체 길이. 이어지는 첫 숨 효과·피해·사망 연출(각자 표 값)은 따로 세며, 잠금은 등장 lock 600만',     examples: '심해 등장·비용 7+ 등장·치명타(한 번에 8 이상 또는 호명자 명줄 절반 이상)·역전·마지막 일격·승패', max_ms: 2200, hitstop_ms: 160, shake: 'heavy', zoom_ratio: 1.08, sfx_gain_db: -6, music_duck_db: -8, music_duck_ms: 600 },
  ],
  // 역전: 형세 점수(00-benchmark 11절)가 −10 이하였던 쪽이 부호를 뒤집는 순간 → 조수원 고리가 한 바퀴 빛나며 tier 3 처리(한 판 최대 2회)
  comeback: { swing_from_score: -10, ring_flash_ms: 700, max_per_game: 2 },
  // 화면 흔들림 강도(진폭 = 짧은 변 × amp_ratio, 상한 shake_max_amp_px). 방향은 공격 방향 성분 70 %
  shake: [
    { level: 'none',   amp_ratio: 0,     dur_ms: 0,   when: '공격력 1~2, 작은 의식 피해' },
    { level: 'light',  amp_ratio: 0.006, dur_ms: 120, when: '공격력 3~4, 응답자 사망' },
    { level: 'medium', amp_ratio: 0.012, dur_ms: 200, when: '공격력 5~7, 휩쓸기, 산호 덩이' },
    { level: 'heavy',  amp_ratio: 0.02,  dur_ms: 320, when: '공격력 8 이상, 큰 카드 착지, 심해 덩이, 마지막 일격' },
  ],
  shake_max_amp_px: 14,
  reduce_motion: { shake: 'off', zoom: 'off', particles_ratio: 0.3, big_entry_normal_ms: 700 },
  particle_budget: { mobile_max: 120, desktop_max: 300 },
  // 몰입 장치
  immersion: {
    hero_lines: {
      bubble_normal_ms: 1800, bubble_fast_ms: 1000, blocks_input: false, min_gap_s: 20,
      triggers: [
        { when: 'game_start', who: 'enemy_then_me', gap_ms: 600 },
        { when: 'first_big_entry_of_each_side', who: 'owner' },
        { when: 'enemy_lifeline<=10 (한 판 1회)', who: 'me', line: 'threat' },
        { when: 'my_lifeline<=10 (한 판 1회)', who: 'me', line: 'low' },
        { when: 'comeback', who: 'comeback_side', line: 'respect_or_threat' },
        { when: 'victory/defeat', who: 'both', line: 'win/lose' },
      ],
    },
    low_lifeline: [
      { at_or_below: 10, vignette_ratio: 0.18, pulse_period_ms: 1800, music_lowpass_hz: 900, drone_up_semitones: 1, thump_every_ms: 0 },
      { at_or_below: 5,  vignette_ratio: 0.3,  pulse_period_ms: 1200, music_lowpass_hz: 600, drone_up_semitones: 2, thump_every_ms: 1200 },
    ],
    lethal_on_board: { enemy_glow_ms: 600, note: '내 공격만으로 상대를 쓰러뜨릴 수 있으면 상대 명줄 실이 가늘게 떨림(정보 노출 범위는 내 화면만)' },
    // 턴 시간(balance.json rules 확정: 50 s, 경고 15 s, 아무것도 안 하면 다음 턴 15 s, 첫 물때 30 s)
    turn_timer: { turn_s: 50, warn_from_s: 15, critical_from_s: 5, idle_penalty_turn_s: 15, mulligan_s: 30, burn_line_px: 3, dim_line_opacity_ratio: 0.35, tick_sfx_every_ms: 1000, critical_tick_every_ms: 500, critical_color: '#FF6F5E', note: '50 s 중 앞 35 s는 가운데 띠에 흐린 선만(시간 압박 없음). 15 s부터 심지 선이 켜져 타들어 가고 매초 타는 소리, 5 s부터 끝 불꽃이 붉어지고 0.5 s마다. 벌칙 턴(15 s)은 처음부터 타는 상태 + 짧은 초 아이콘' },
    tide_wetness: { note: '판이 길어질수록(턴 8부터) 조수원 바닥이 조금씩 젖어 어두워짐 — 세계관 "젖은 소금"', per_turn_darken_ratio: 0.015, max_darken_ratio: 0.15 },
  },
  crate_open: {
    lid:        { normal_ms: 500, fast_ms: 250 },
    chunks_in:  { stagger_normal_ms: 120, stagger_fast_ms: 60 },
    tease:      { normal_ms: 300, fast_ms: 150, note: '덩이 5개가 희귀도 빛을 미리 띰(산호·심해는 떨림)' },
    break_ms:   { sand: { normal: 250, fast: 150 }, pearl: { normal: 450, fast: 250 }, coral: { normal: 700, fast: 400 }, abyss: { normal: 1400, fast: 900 } },
    pre_glow_ratio: { sand: 0, pearl: 0.35, coral: 0.6, abyss: 1.0 },
    shake_level: { sand: 'none', pearl: 'none', coral: 'medium', abyss: 'heavy' },
    reveal_flip: { normal_ms: 300, fast_ms: 180 },
    break_all_stagger: { normal_ms: 160, fast_ms: 80, note: '「모두 부수기」도 희귀도 낮은 것부터, 심해는 마지막에 따로 멈춤' },
    new_or_dup_tag: { normal_ms: 400, fast_ms: 250 },
  },
};
// 이전 이름 호환(빌드가 fx를 찾을 때)
export const fx = tempo;
// balance 판 시간 식(20-balance 9-4)이 쓰는 요약값. 위 actions 표에서 계산(build.mjs가 다시 확인)
// 한 행동 평균 = 내기 50 %(응답자 440·의식 520 평균 480) + 공격 40 %(530) + 호명술 10 %(360) = 488, 사망·첫 숨이 겹쳐 늘어나는 몫 +60 → 550
tempo.summary_for_balance = {
  action_avg_normal_ms: 550, action_avg_fast_ms: 280,
  big_entry_normal_ms: 1800, big_entry_fast_ms: 900,
  lethal_blow_normal_ms: 1500, lethal_blow_fast_ms: 800,
  turn_transition_normal_ms: 900, turn_transition_fast_ms: 450,
  ai_ms_per_action_normal: 825, ai_first_and_end_ms_normal: 1400,
  max_ms_per_action_except_tier3: 900,
  note: 'balance.json tempo의 action_anim_ms 600(보수적, 허용)·big_card_anim_ms 2000(→1800)·lethal_slowmo_ms 800(→ 마지막 일격 전체 1500, 그중 느린 동작 400)을 이 값으로 맞춤 요청',
};

// ───────────────────────── 사운드 ─────────────────────────
// Web Audio 합성 사양. gain_db는 마스터 앞 기준 목표값(오프라인 렌더로 1-2에서 확인).
export const sound = {
  master_db: -6,
  sfx: [
    { id: 'card_hover',   desc: '손패 카드 들어 올림', osc: 'sine',     f_hz: [880, 1320], dur_ms: 60,  gain_db: -24, filter: null },
    { id: 'card_play',    desc: '소금유리 판이 판에 닿음', osc: 'noise+triangle', f_hz: [180, 90], dur_ms: 220, gain_db: -12, filter: { type: 'lowpass', f_hz: 1800 } },
    { id: 'card_draw',    desc: '판 스침', osc: 'noise', f_hz: [2000, 4000], dur_ms: 140, gain_db: -22, filter: { type: 'bandpass', f_hz: 3000 } },
    { id: 'wick_light',   desc: '심지 켜짐(턴 시작)', osc: 'noise+sine', f_hz: [520, 780], dur_ms: 180, gain_db: -18, filter: { type: 'highpass', f_hz: 400 } },
    { id: 'attack_light', desc: '공격력 1~3 타격', osc: 'square', f_hz: [220, 110], dur_ms: 120, gain_db: -14, filter: { type: 'lowpass', f_hz: 1200 } },
    { id: 'attack_heavy', desc: '공격력 4 이상 타격(공격력마다 -0.5 dB, 최대 -8)', osc: 'noise+sawtooth', f_hz: [110, 45], dur_ms: 260, gain_db: -10, filter: { type: 'lowpass', f_hz: 900 } },
    { id: 'saltskin_break', desc: '소금막 깨짐', osc: 'noise', f_hz: [5000, 9000], dur_ms: 160, gain_db: -16, filter: { type: 'highpass', f_hz: 3500 } },
    { id: 'death_crumble', desc: '응답자 부서짐', osc: 'noise', f_hz: [800, 200], dur_ms: 420, gain_db: -14, filter: { type: 'lowpass', f_hz: 1400 } },
    { id: 'ebb_trigger',  desc: '썰물 발동(물러가는 물)', osc: 'noise', f_hz: [1200, 300], dur_ms: 500, gain_db: -18, filter: { type: 'bandpass_sweep_down', f_hz: 1200 } },
    { id: 'rite_cast',    desc: '의식(물마루 공식) 발동', osc: 'sine x3', f_hz: [392, 587, 784], dur_ms: 500, gain_db: -11, filter: null },
    { id: 'heal',         desc: '회복', osc: 'sine', f_hz: [660, 990], dur_ms: 300, gain_db: -18, filter: null },
    { id: 'buff',         desc: '강화', osc: 'triangle', f_hz: [440, 660], dur_ms: 200, gain_db: -18, filter: null },
    { id: 'debuff',       desc: '약화·소금독', osc: 'triangle', f_hz: [330, 233], dur_ms: 260, gain_db: -18, filter: { type: 'lowpass', f_hz: 1500 } },
    { id: 'brine_tick',   desc: '소금독 피해(턴 시작)', osc: 'noise', f_hz: [3000, 6000], dur_ms: 120, gain_db: -20, filter: { type: 'highpass', f_hz: 2500 } },
    { id: 'breakwater_block', desc: '방파제가 막음(돌 둔탁)', osc: 'sine', f_hz: [90, 60], dur_ms: 200, gain_db: -13, filter: null },
    { id: 'sealwrit_open', desc: '봉인문 열림(밀랍 깨짐+종)', osc: 'noise+sine', f_hz: [1046, 1568], dur_ms: 600, gain_db: -14, filter: null },
    { id: 'big_entry',    desc: '큰 카드 등장: 저음 일렁임 + 유리 화음', osc: 'sawtooth+sine x4', f_hz: [55, 220, 330, 440, 660], dur_ms: 2000, gain_db: -9, filter: { type: 'lowpass_sweep_up', f_hz: 2400 } },
    { id: 'turn_yours',   desc: '내 차례(심지 둘 켜지는 소리)', osc: 'sine', f_hz: [523, 784], dur_ms: 420, gain_db: -14, filter: null },
    { id: 'turn_timer',   desc: '심지 타들어 감(남은 15 s, 1초마다)', osc: 'noise', f_hz: [1500, 2500], dur_ms: 80, gain_db: -26, filter: { type: 'bandpass', f_hz: 2000 } },
    { id: 'hollow_call',  desc: '공허 호명(흑조 응답)', osc: 'sawtooth', f_hz: [70, 50], dur_ms: 600, gain_db: -12, filter: { type: 'lowpass', f_hz: 500 } },
    { id: 'crate_lid',    desc: '상자 뚜껑', osc: 'noise+square', f_hz: [140, 80], dur_ms: 300, gain_db: -18, filter: { type: 'lowpass', f_hz: 1200 } },
    { id: 'chunk_break_sand',  desc: '모래 덩이 부서짐', osc: 'noise', f_hz: [1500, 600], dur_ms: 250, gain_db: -16, filter: { type: 'lowpass', f_hz: 2500 } },
    { id: 'chunk_break_pearl', desc: '진주 덩이: 유리 울림 1음', osc: 'noise+sine', f_hz: [1318], dur_ms: 600, gain_db: -18, filter: null },
    { id: 'chunk_break_coral', desc: '산호 덩이: 유리 화음 2음 + 저음', osc: 'noise+sine x3', f_hz: [98, 1318, 1976], dur_ms: 900, gain_db: -6, filter: null },
    { id: 'chunk_break_abyss', desc: '심해 덩이: 흑조 솟음 + 유리 화음 4음', osc: 'sawtooth+sine x4', f_hz: [41, 659, 988, 1318, 1976], dur_ms: 1600, gain_db: -9, filter: { type: 'lowpass_sweep_up', f_hz: 3000 } },
    { id: 'victory',      desc: '승리: 소금 마름(밝은 장3도 상행)', osc: 'triangle x3', f_hz: [392, 494, 587, 784], dur_ms: 1600, gain_db: -5, filter: null },
    { id: 'defeat',       desc: '패배: 명줄 끊김(하행 단2도)', osc: 'sine', f_hz: [294, 277, 220], dur_ms: 1500, gain_db: -14, filter: { type: 'lowpass', f_hz: 1200 } },
    { id: 'ui_tap',       desc: '메뉴 버튼', osc: 'sine', f_hz: [700], dur_ms: 50, gain_db: -22, filter: null },
    { id: 'ui_deny',      desc: '할 수 없음(심지 부족 등)', osc: 'square', f_hz: [160, 140], dur_ms: 120, gain_db: -20, filter: { type: 'lowpass', f_hz: 800 } },
  ],
  // 음악: 모두 "마른 바다" 공통 바탕(낮은 지속음 + 유리 배음 + 물방울) 위에 영웅 모티프 4~6음.
  music: {
    bed: { drone_hz: 55, drone_osc: 'sawtooth', drone_lowpass_hz: 320, glass_partials_hz: [440, 660, 990], drip_every_s: [3, 7], gain_db: -20 },
    menu: { bpm: 64, mode: 'aeolian', root: 'A2', motif: 'A C E D C (긴 음, 소금 바람)' },
    heroes: {
      h_warden:   { bpm: 84,  mode: 'dorian',     root: 'D3', timbre: 'square→lowpass 900 Hz(무딘 나팔)', motif: 'D A A G A — 계단처럼 고르게(행진)' },
      h_choir:    { bpm: 60,  mode: 'phrygian',   root: 'E3', timbre: 'sine 3겹 ±6 cent(합창 패드)',      motif: 'E F E D E — 반음 내려앉는 기도' },
      h_wreck:    { bpm: 100, mode: 'mixolydian', root: 'G2', timbre: 'noise 짧은 금속 + triangle',        motif: 'G G Bb C D — 망치 박자 위 상행' },
      h_rider:    { bpm: 132, mode: 'harmonic_minor', root: 'A2', timbre: 'sawtooth 짧은 + 북(6/8)',      motif: 'A B C# E — 달리는 6/8' },
      h_archive:  { bpm: 72,  mode: 'major_pentatonic', root: 'C4', timbre: 'sine 종(빠른 감쇠, 유리)',    motif: 'C E G A G — 등불 일곱 점(7박 순환)' },
      h_nameless: { bpm: 92,  mode: 'whole_tone', root: 'F#3', timbre: 'triangle 뜯기 + 잡음 숨',          motif: 'F# G# A# C — 끝이 해결 안 됨' },
    },
    tension: { low_lifeline_drone_up_semitones: 1, low_lifeline_lowpass_hz: 600 },
  },
};

// 화면 문구 키(10-lore 8절)와 아트 요소 연결
export const textKeys = {
  end_button: 'hud_end_breath', calling: 'hud_calling', deck_left: 'hud_deck_left', sealwrit_hidden: 'hud_sealwrit_hidden',
  turn_yours: 'turn_yours', turn_enemy: 'turn_enemy', timer_low: 'turn_timer_low', crate_tap: 'crate_tap_salt',
};

// ───────────────────────── UX: 카드 유형 한눈 구분 (2026-11-18 요청자 지시, criteria "UX·한눈 구분") ─────────────────────────
// 신호 3겹: ① 색(이름 띠 + 유형 표지) ② 표지 바깥 모양 ③ 이름 띠 무늬. 여기에 카드 종류(소환수·주문·무기)는 판 실루엣으로 따로.
// 색 5개는 색약 3종(Machado 2009) 시뮬에서 모든 쌍 ΔE76 ≥ 35 (tools/art/cvd.mjs, build.mjs가 검사)
export const cardFamilies = {
  draw:    { ko: '뽑기·운영',     en: 'Draw',        color: '#3B82F6', ink: '#08142A', badge: 'circle',        pattern: 'lines_h',   types: 'type=drawbuff' },
  buff:    { ko: '강화',          en: 'Buff',        color: '#F2C744', ink: '#2A1E02', badge: 'triangle_up',   pattern: 'chevron_up', types: 'type=buff, 아래 debuff 갈래 제외' },
  debuff:  { ko: '약화·방해',     en: 'Debuff',      color: '#4A2A7A', ink: '#F4EEFF', badge: 'triangle_down', pattern: 'chevron_down', types: 'type=buff 중 b_weaken·b_unname·b_anchor·b_brine·b_sealwrit' },
  strike:  { ko: '즉시 타격',     en: 'Strike',      color: '#B8261A', ink: '#FFF2EE', badge: 'diamond',       pattern: 'slash',     types: 'type=attack, attack_sub=instant' },
  atkdraw: { ko: '공격하며 뽑기', en: 'Attack+Draw', color: '#E06AA0', ink: '#2A0716', badge: 'square',        pattern: 'cross',     types: 'type=attack, attack_sub=draw' },
};
export const DEBUFF_BRANCHES = ['b_weaken', 'b_unname', 'b_anchor', 'b_brine', 'b_sealwrit'];
export function familyOf(card) {
  if (card.type === 'drawbuff') return 'draw';
  if (card.type === 'attack') return card.attack_sub === 'instant' ? 'strike' : 'atkdraw';
  return DEBUFF_BRANCHES.includes(card.branch) ? 'debuff' : 'buff';
}
// 갈래 기호(유형 표지 안에 그리는 도형, portrait-gen G 사전 이름). 회전은 deg
export const branchGlyph = {
  d_draw: ['plates'], d_seek: ['scope'], d_discount: ['candle'], d_etch: ['quill'], d_salvage: ['hook'],
  b_single: ['arrow', 180], b_aura: ['ring'], b_swell: ['wave'], b_guard: ['shield'], b_mend: ['drop'], b_fit: ['gear'], b_ebb: ['spiral'], b_offering: ['altar'],
  b_weaken: ['arrow'], b_unname: ['xmark'], b_anchor: ['anchor'], b_brine: ['grains'], b_sealwrit: ['seal'],
  ai_bolt: ['bolt_zig'], ai_rapids: ['spear'], ai_sweep: ['sawblade'],
  ad_onkill: ['target'], ad_onhit: ['blade'], ad_wake: ['wing'], ad_brand: ['sword'], ad_ebb: ['coffin'], ad_raid: ['hand'],
};
// 카드 종류(기능 이름: 필드에 남는 카드 / 한 번 쓰는 카드 / 무기). 판 실루엣 3겹 신호
export const cardKinds = {
  minion: { ko: '소환수', top: '오른쪽 위 한 모서리만 깨짐', bottom: '아래 가운데 매달린 스탯 판(공격 | 체력)', edge: '아래 가장자리 곧음' },
  spell:  { ko: '주문',   top: '위 두 모서리 깨짐',          bottom: '스탯 판 없음',                         edge: '아래 가장자리 물결' },
  weapon: { ko: '무기',   top: '오른쪽 위 한 모서리 깨짐',    bottom: '칼자루 판(가로 날밑 + 공격 | 내구도)',  edge: '아래 가장자리 곧음' },
};
export const badge = { full_size_px: 34, hand_scale_ratio: 1.6, token_size_px: 24, name_band_pattern_opacity_ratio: 0.28,
  place_r2: '왼쪽 열: 마나 판 바로 아래(x 8, y = 마나 판 아래 + 6). 손패 모드 54 px → 카드 폭의 0~25 %', type_spine_w_px: 14, faction_strip_w_px: 6,
  fan_visible_min_ratio: 0.29, fan_rule: '부채꼴 간격 = min(카드 폭 × 0.62, (손패 폭 − 카드 폭 × 1.35) / (n − 1)). 겹친 카드의 보이는 왼쪽 띠 ≥ 카드 폭 × 0.29(표지 오른쪽 끝 0.25 + 여유)' };

// 정보 위계(읽히는 순서 = 크기·대비 순서). 숫자는 확대 보기 250 px 기준 글자/도형 크기
export const hierarchy = [
  { rank: 1, what: '비용', where: '왼쪽 위 세로 마나 판', size_px: 34, note: '손패에서 1.6배' },
  { rank: 2, what: '공격 | 체력', where: '아래 가운데 스탯 판', size_px: 30, note: '손패 1.45배, 필드 칸 폭 × 0.26' },
  { rank: 3, what: '유형(색·모양·무늬)', where: '오른쪽 위 유형 표지 34 px + 이름 띠 색·무늬', size_px: 34, note: '손패 1.6배' },
  { rank: 4, what: '카드 종류', where: '판 실루엣(모서리·아래 판·아래 가장자리)', size_px: null, note: '' },
  { rank: 5, what: '이름', where: '이름 띠', size_px: 17, note: '손패에서는 숨김(확대·펼침에서)' },
  { rank: 6, what: '키워드 아이콘', where: '그림 창 아래 왼쪽', size_px: 22, note: '' },
  { rank: 7, what: '카드 글·소속', where: '글 상자·종류 줄', size_px: 13, note: '확대 보기에서만' },
];

// "왜 안 되는지" 피드백 규격: 시도 즉시(≤ 100 ms) 카드가 120 ms 흔들리고 ui_deny 소리, 원인 요소가 빛나며 이유 칩(12자 이내)이 그 요소 옆에 1.2 s
export const denyFeedback = {
  common: { shake_ms: 120, shake_px: 5, chip_ms: 1200, chip_bg: '#2A1712', chip_border: '#FF6F5E', chip_ink: '#F2EEE4', chip_font_px: 13, sfx: 'ui_deny', return_card_ms: 180 },
  reasons: [
    { id: 'no_mana',        key: 'toast_no_wicks',        flash: 'my_wicks: 모자란 칸 수만큼 빈 막대에 붉은 테두리', pre: '손패에서 미리: 마나 판 어둡게 + 아래 붉은 밑줄' },
    { id: 'board_full',     key: 'toast_circle_full',     flash: 'my_slots 5칸 테두리 동시 깜빡 1회', pre: '필드가 가득하면 손패 소환수 카드의 스탯 판 테두리 점선' },
    { id: 'no_target',      key: 'toast_no_target',       flash: '카드 위 ⊘ 표시 + 가능한 대상 없음 칩', pre: '대상 없는 주문은 손패에서 어둡게' },
    { id: 'summon_sick',    key: 'toast_cant_attack_yet', flash: '그 소환수의 꺼진 마나 심지가 2회 깜빡', pre: '꺼진 심지 아이콘 상시' },
    { id: 'anchored',       key: 'toast_anchored',        flash: '사슬 표시 흔들림', pre: '사슬 상시' },
    { id: 'must_hit_guard', key: 'toast_must_hit_breakwater', flash: '막아야 할 상대 소환수(벽 표시) 테두리 2회 깜빡', pre: '공격 화살표가 그 소환수 쪽으로만 붙음' },
    { id: 'hidden',         key: 'toast_seamist_untargetable', flash: '안개 표시가 일렁임', pre: '대상 고를 때 안개 소환수는 흐리게' },
    { id: 'ability_used',   key: 'hud_calling_used',      flash: '고유 능력 버튼 위 ✓ 표시', pre: '사용 뒤 버튼 회색 + ✓' },
    { id: 'not_your_turn',  key: 'turn_enemy',            flash: '가운데 띠에 상대 턴 표시 깜빡', pre: '상대 턴에는 손패 전체 명도 70 %' },
    { id: 'hand_full',      key: 'toast_hand_full',       flash: '버려진 카드가 양쪽에 보이고 부서짐', pre: '손패 9장부터 손패 수 숫자 주황' },
  ],
  playable: { lift_px: 4, outline: '#F4B740', outline_px: 2, note: '낼 수 있는 카드만 테두리 켜짐. 낼 수 없는 카드는 명도 60 % + 위 pre 표시' },
};

// 손패 비교: 탭 = 2줄 펼침(세로) / 한 줄(가로). 펼침에서는 이름 한 줄 + 비용·스탯·유형 표지가 모두 보이고, 정렬 버튼(비용순·유형순) 48 px
export const handCompare = { spread_on: 'tap_hand', sort_modes: ['cost', 'family'], sort_button_px: 48, show_name_in_spread: true, dim_unplayable_ratio: 0.6 };

// 튜토리얼 안내 패널·가리킴 규격 (단계 표는 lore reviews/terms/lore-writer.md, 위치는 layout.mjs tutorialSlots)
export const tutorialUi = {
  panel: { bg: '#14232B', border: '#7FE3FF', border_px: 2, ink: '#F2EEE4', font_px: 13, line_h_px: 17, max_lines: 2, pad_px: 8, shape: '오른쪽 위 모서리 깨진 띠' },
  advance: '패널 밖 아무 곳이나 탭(행동이 필요한 단계는 그 행동으로 넘어감)',
  skip_button_px: 48,
  spotlight: { dim_ratio: 0.5, cutout_pad_px: 8, ring_color: '#7FE3FF', ring_px: 3, ring_pulse_ms: 1200 },
  pointer: { arrow: '패널 가장자리 → 대상 가장자리 점선 화살표(2 px)', drag_demo: '손가락 원(지름 28 px) + 고리가 출발 → 도착을 1.2 s 반복' },
  rule: '패널은 대상 사각형·필드 칸·스탯 판과 겹치지 않음. 기본 자리 = 가운데 띠(두 필드 사이). 대상이 가운데 띠면 보조 자리(세로: 상대 줄 위 / 가로: 손패 띠 위)',
};

// 카드 스토리 패널 (2026-11-18 요청자 지시 "카드 정보 쪽 탭 또는 스토리 버튼 → 짧은 스토리")
export const storyPanel = {
  where: '크게 본 카드(수집·덱 빌더·팩 개봉 결과의 확대 보기). 대전 중에는 열지 않음(길게 누르기 = 효과·키워드 도움말 먼저)',
  open_by: ['확대 카드의 글 상자 탭', '스토리 버튼 탭'],
  button: { size_px: 48, min_w_px: 96, shape: '오른쪽 위 모서리 깨진 판(버튼 공통)', place: '확대 카드 바로 아래 오른쪽(카드 오른쪽 끝에 맞춤), 다른 버튼(돌파·제작·뒤로)과 같은 줄', icon: 'icon-story(펼친 두루마리)', label_key: 'story_button' },
  panel: {
    place_portrait: '확대 카드의 글 상자 자리를 덮는 판(카드 그림·비용·이름·유형 표지는 보이게 둠): 카드와 같은 폭, 위 = 이름 띠 아래, 아래 = 카드 아래 끝 + 버튼 줄 위',
    place_landscape: '확대 카드 오른쪽 옆 판(카드와 같은 높이, 폭 = min(화면 폭 − 카드 오른쪽 − 16, 320))',
    min_w_px: 240, pad_px: 14, font_ko_px: 14, font_en_px: 13, line_h_ratio: 1.55, max_chars_ko: 160, max_lines: 7,
    bg: '#14232B', ink: '#F2EEE4', border: 'faction.primary 3 px(왼쪽 띠 6 px)', title: '카드 이름 16 px + 세력 이름 12 px(salt_dim)', close: '패널 밖 탭 또는 같은 버튼 다시 탭(버튼 글 "효과"로 바뀜)',
    fit_rule: 'ko 160자 = 한 줄 약 17자 × 7줄(240 px·14 px 기준). en은 13 px로 같은 7줄 안. 넘치면 패널 안 스크롤(▼ 표시)',
  },
  tempo: { open_ms: 180, close_ms: 140, fast_open_ms: 120, lock_ms: 0, motion: '아래에서 12 px 올라오며 투명도 0→1, 글 상자 위에 덮임(카드 뒤집기 연출 없음)' },
};
