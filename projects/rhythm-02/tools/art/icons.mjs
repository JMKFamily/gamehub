#!/usr/bin/env node
// rhythm-02 아이콘·표지·메뉴 목업 생성 + 검사. 30-art 11-2(아이콘 표, 1-2 D11).
//   node tools/art/icons.mjs           assets/icons/icon-<이름>.svg, assets/mockup-{level-select,level-start,pause-menu,result,guardian,sync}.svg 쓰기 + 검사
//   node tools/art/icons.mjs --check   검사만(파일·터치 크기·문구 키·rhythm-01 모양 피함) — 실패 시 종료 코드 1
// 모든 그림은 기본 도형(사각·원·세모·선)만, 글자 없음. 색은 assets/palette.json. 외부 이미지·폰트 없음.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ballSvg, drumSvg, fingerSvg, miniCloud, levelCard, cloudSvg, markSvg } from './cards.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '../..');
const P = JSON.parse(readFileSync(join(PROJ, 'assets/palette.json'), 'utf8'));
const C = P.common;
const DIR = join(PROJ, 'assets/icons');
const f1 = (v) => (+v.toFixed(1)).toString();

// 그림(48 단위 상자 안). 모두 ink 단색 + 필요한 곳만 공·북 색.
const ST = `stroke="${C.ink}" stroke-linecap="round" stroke-linejoin="round"`;
const GLYPH = {
  pause: `<rect x="16" y="14" width="6" height="20" rx="3" fill="${C.ink}"/><rect x="26" y="14" width="6" height="20" rx="3" fill="${C.ink}"/>`,
  resume: `<polygon points="18,13 36,24 18,35" fill="${C.ink}" ${ST} stroke-width="2"/>`,
  play: `<polygon points="17,11 38,24 17,37" fill="${C.ink}" ${ST} stroke-width="2"/>`,
  retry: `<path d="M33 17 A11 11 0 1 0 35 28" fill="none" ${ST} stroke-width="4.5"/><polygon points="27,12 37,13 34,22" fill="${C.ink}" ${ST} stroke-width="2"/>`,
  levels: [[13, 13], [26, 13], [13, 26], [26, 26]].map(([x, y]) => `<rect x="${x}" y="${y}" width="9" height="9" rx="2.5" fill="${C.ink}"/>`).join(''),
  sound_on: `<rect x="10" y="19" width="7" height="10" rx="1.5" fill="${C.ink}"/><polygon points="16,19 25,12 25,36 16,29" fill="${C.ink}" ${ST} stroke-width="2"/><path d="M30 19 Q34 24 30 29" fill="none" ${ST} stroke-width="3"/><path d="M34 14 Q41 24 34 34" fill="none" ${ST} stroke-width="3"/>`,
  sound_off: `<rect x="10" y="19" width="7" height="10" rx="1.5" fill="${C.ink}"/><polygon points="16,19 25,12 25,36 16,29" fill="${C.ink}" ${ST} stroke-width="2"/><line x1="30" y1="19" x2="39" y2="29" ${ST} stroke-width="3.5"/><line x1="39" y1="19" x2="30" y2="29" ${ST} stroke-width="3.5"/>`,
  next: `<rect x="10" y="21" width="17" height="6" rx="2" fill="${C.ink}"/><polygon points="25,13 38,24 25,35" fill="${C.ink}" ${ST} stroke-width="2"/>`,
  back: `<polygon points="32,12 14,24 32,36" fill="${C.ink}" ${ST} stroke-width="2"/>`,
  close: `<line x1="16" y1="16" x2="32" y2="32" ${ST} stroke-width="4.5"/><line x1="32" y1="16" x2="16" y2="32" ${ST} stroke-width="4.5"/>`,
  skip: `<polygon points="13,13 28,24 13,35" fill="${C.ink}" ${ST} stroke-width="2"/><rect x="31" y="13" width="5" height="22" rx="2" fill="${C.ink}"/>`,
  // 어른 설정: 큰 사람 + 작은 사람(머리 원 + 몸 둥근 사각, 얼굴 없음) = "어른과 같이". 톱니·막대 3 + 손잡이(rhythm-01) 아님
  settings: `<circle cx="18" cy="14" r="5.5" fill="${C.ink}"/><rect x="10.5" y="21.5" width="15" height="16" rx="6" fill="${C.ink}"/><circle cx="32" cy="22" r="4" fill="${C.ink}"/><rect x="26.5" y="27.5" width="11" height="10" rx="4.5" fill="${C.ink}"/>`,
  practice: `<rect x="15" y="10" width="3.5" height="28" rx="1.5" fill="${C.ink}"/><polygon points="18.5,11 36,17 18.5,23" fill="${C.drumBody}" ${ST} stroke-width="2"/>`,
  card_replay: `<rect x="7" y="13" width="34" height="22" rx="4" fill="${C.hudTrack}" ${ST} stroke-width="2.5"/>` + [10.5, 20.5, 30.5].map((x) => `<rect x="${x}" y="17" width="7" height="14" rx="2" fill="${C.skin}" ${ST} stroke-width="1.8"/>`).join(''),
  // 밀림 표지: 눈(아몬드) + 공 하나 = "공을 보고 쳐요". 헤드폰 + 모래시계(rhythm-01) 아님
  look_ball: `<path d="M5 24 Q15 12 25 24 Q15 36 5 24 Z" fill="${C.hudTrack}" ${ST} stroke-width="2.5"/><circle cx="15" cy="24" r="4" fill="${C.ink}"/>` + ballSvg(36, 17, 14),
  // 소리 맞추기: 북 위에 앉은 공 + 소리 선 2개(박에 맞춰 움직이지 않는 정지 그림)
  sync: drumSvg(19, 30, 26, 8, 2.6, { d: 8 }) + ballSvg(19, 20, 10, { sq: 0.92 }) + `<path d="M33 18 Q36 22 33 26" fill="none" ${ST} stroke-width="2.8"/><path d="M37 14 Q42 22 37 30" fill="none" ${ST} stroke-width="2.8"/>`,
  language: `<rect x="6" y="10" width="21" height="15" rx="4" fill="${C.hudTrack}" ${ST} stroke-width="2.5"/><polygon points="11,24 11,30 17,25" fill="${C.hudTrack}" ${ST} stroke-width="2"/><rect x="21" y="21" width="21" height="15" rx="4" fill="${C.drumBody}" ${ST} stroke-width="2.5"/><polygon points="36,35 36,41 31,36" fill="${C.drumBody}" ${ST} stroke-width="2"/>`,
  reset: `<rect x="12" y="14" width="24" height="4" rx="1.5" fill="${C.ink}"/><rect x="20" y="10" width="8" height="5" rx="1.5" fill="${C.ink}"/><rect x="15" y="19" width="18" height="19" rx="3" fill="none" ${ST} stroke-width="3"/><line x1="21" y1="23" x2="21" y2="34" ${ST} stroke-width="2.5"/><line x1="27" y1="23" x2="27" y2="34" ${ST} stroke-width="2.5"/>`,
  lock: `<path d="M17 22 v-6 a7 7 0 0 1 14 0 v6" fill="none" stroke="#6B6F80" stroke-width="4"/><rect x="12" y="21" width="24" height="18" rx="4" fill="#6B6F80"/>`,
  tap: fingerSvg(22, 40, 32, true),
  // 소리 잠금 풀기(N20·lore A5): 스피커 + 누르는 손가락(글자 없음)
  // 결과 화면 정확도 표지(30-art 6-3·11-3): 작은 북 + 다리 밑 박 표시 = "표시에 맞춘 정도". 과녁·원형 고리·RATE 글 아님
  accuracy: drumSvg(24, 17, 38, 11, 3.2, { d: 12, legTo: 38 }) + markSvg(24, 38, 18),
  // 결과 화면 최고 콤보 표지: HUD 콤보와 같은 모양(glow 큰 표지 1 + ink 찬 칸 3)
  best_combo: `<rect x="4" y="17" width="14" height="14" rx="3" fill="${C.glow}" stroke="${C.ink}" stroke-width="2"/>` + [22, 31, 40].map((x) => `<rect x="${x}" y="20" width="8" height="8" rx="2" fill="${C.ink}"/>`).join(''),
  // 정확도 신기록 표지: glow 둥근 네모 + 위 꺾쇠(별 아님)
  new_best: `<rect x="8" y="8" width="32" height="32" rx="8" fill="${C.glow}" stroke="${C.ink}" stroke-width="3"/><polyline points="15,29 24,19 33,29" fill="none" ${ST} stroke-width="5"/>`,
  unlock_sound: `<rect x="6" y="15" width="6" height="9" rx="1.5" fill="${C.ink}"/><polygon points="11,15 19,9 19,30 11,24" fill="${C.ink}" ${ST} stroke-width="2"/><path d="M23 14 Q27 19.5 23 25" fill="none" ${ST} stroke-width="2.6"/>` + fingerSvg(34, 44, 24, true),
};

// 아이콘 표(1-2 D11): 이름 → 문구 키(aria / 보조 글, lore strings.json) · 쓰는 화면 · 모양 · 크기(터치 px) · 피한 것
export const ICONS = [
  { name: 'pause', key: 'btn_pause', where: '플레이 HUD(유일한 버튼)', shape: '세로 막대 2', size: 48 },
  { name: 'resume', key: 'btn_resume', where: '멈춤 메뉴 / 백그라운드 복귀(paused_background)', shape: '오른쪽 세모', size: 88 },
  { name: 'retry', key: 'btn_retry', where: '멈춤 메뉴 · 클리어 결과', shape: '굵은 원호 화살표 ↻(첫 실패 안내 그림과 같은 모양)', size: 88 },
  { name: 'levels', key: 'btn_levels', where: '멈춤 메뉴 · 클리어 결과', shape: '네모 4개(2×2)', size: 88 },
  { name: 'sound_on', key: 'btn_sound_on', where: '멈춤 메뉴(누를 때마다 켜기/끄기, 지금 상태 그림)', shape: '스피커 + 소리 호 2', size: 88 },
  { name: 'sound_off', key: 'btn_sound_off', where: '멈춤 메뉴', shape: '스피커 + ×', size: 88 },
  { name: 'next', key: 'btn_next', where: '클리어 결과(L10 없음)', shape: '굵은 오른쪽 화살표', size: 64 },
  { name: 'back', key: 'btn_back', where: '레벨 선택 · 보호자 화면 · 소리 맞추기', shape: '왼쪽 세모', size: 48 },
  { name: 'close', key: 'btn_close', where: '그림 카드 · 레벨 시작 판', shape: '×', size: 48 },
  { name: 'skip', key: 'btn_skip', where: '소리 맞추기(어른이 건너뜀)', shape: '세모 + 막대', size: 48 },
  { name: 'settings', key: 'btn_settings', where: '레벨 선택 오른쪽 위. 길게 누르기(balance guardian_gate, 1.5 s) = 보호자 화면, 짧게 = 아무 일 없이 guardian_hold 보조 글', shape: '큰 사람 + 작은 사람(어른과 같이), 아래 가로 채움 막대', size: 48, avoid: '톱니, 막대 3 + 손잡이 원(rhythm-01 설정), 원형 고리 진행 표시(rhythm-01 길게 누르기)' },
  { name: 'play', key: 'tap_to_start', where: '레벨 시작 판(카드를 누르면 뜸) 가운데 큰 버튼 · 타이틀', shape: '큰 오른쪽 세모', size: 96 },
  { name: 'practice', key: 'btn_practice', where: '레벨 시작 판 왼쪽', shape: '깃발(HUD 연습 깃발과 같은 모양)', size: 64 },
  { name: 'card_replay', key: 'btn_card_replay', where: '레벨 시작 판 오른쪽(새 기믹이 있는 레벨만)', shape: '칸 3개 카드', size: 64 },
  { name: 'look_ball', key: 'look_ball', where: '레벨 선택 오른쪽 위(밀림 조건일 때만, 아이용, 글 없음·aria 만) · 보호자 화면 소리 맞추기 줄 옆(sound_late 글, 어른용). 플레이 중 없음', shape: '눈 + 공 하나(버튼 아님, 표지)', size: 48, sign: true, avoid: '헤드폰 + 모래시계(rhythm-01 소리 늦음 표지)' },
  { name: 'sync', key: 'settings_sync', where: '보호자 화면 줄 · 소리 맞추기 화면 머리', shape: '북 위 앉은 공 + 소리 선 2(정지)', size: 48, avoid: '헤드폰, 박에 맞춰 움직이는 그림' },
  { name: 'language', key: 'settings_language', where: '보호자 화면 줄(옆에 lang_ko / lang_en 글 버튼)', shape: '말풍선 2개(글자 없음)', size: 48 },
  { name: 'reset', key: 'settings_reset', where: '보호자 화면 맨 아래 줄(확인 confirm_reset)', shape: '휴지통', size: 48 },
  { name: 'lock', key: 'levelcard_locked', where: '잠긴 레벨 카드', shape: '자물쇠(회색)', size: 48, sign: true },
  { name: 'tap', key: 'tap_to_start', where: '타이틀', shape: '튜토리얼 손가락과 같은 손(누름)', size: 64, sign: true },
  { name: 'accuracy', key: 'result_accuracy', where: '클리어 결과 정확도 % 앞(일반 모드 클리어만, 2026-11-17 판정 이름·% 지시)', shape: '작은 북 + 다리 밑 박 표시', size: 28, sign: true, avoid: '과녁·원형 판정 고리(rhythm-01), RATE 등 원작 표기' },
  { name: 'best_combo', key: 'result_combo', where: '클리어 결과 최고 콤보 숫자 앞', shape: 'HUD 콤보와 같은 큰 표지 1 + 찬 칸 3', size: 20, sign: true },
  { name: 'new_best', key: 'result_new_best', where: '클리어 결과 정확도 숫자 오른쪽(정확도 신기록일 때만)', shape: 'glow 둥근 네모 + 위 꺾쇠(별 아님)', size: 14, sign: true },
  { name: 'unlock_sound', key: 'audio_unlock', where: '소리 잠금 풀기 화면(첫 탭) 글 옆 그림(N20)', shape: '스피커 + 누르는 손가락(글자 없음)', size: 64, sign: true },
];

// 버튼 하나: 흰 둥근 사각 + ink 2 px 외곽선 + 그림. opts.plain = 바탕 없음(표지), opts.hold = 길게 누르기 채움 비율(0~1, 아래 가로 막대)
export function iconSvg(name, x, y, size = 48, opts = {}) {
  const k = size / 48;
  let s = opts.plain ? '' : `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(size)}" height="${f1(size)}" rx="${f1(14 * k)}" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>`;
  s += `<g transform="translate(${f1(x)} ${f1(y)}) scale(${(+k.toFixed(4))})">${GLYPH[name]}</g>`;
  if (opts.hold != null) s += holdBar(x, y + size + 6, size, opts.hold);
  return s;
}
// 길게 누르기 진행 표시: 버튼 바로 아래 가로 막대(높이 8), 왼쪽부터 drumBody 로 참. 원형 고리 아님(rhythm-01 과 다름)
export function holdBar(x, y, w, p) {
  return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="8" rx="4" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>` + (p > 0 ? `<rect x="${f1(x + 2)}" y="${f1(y + 2)}" width="${f1((w - 4) * p)}" height="4" rx="2" fill="${C.drumBody}"/>` : '');
}

const slot = (x, y, w, h, key) => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="none" stroke="#D11" stroke-width="1" stroke-dasharray="4 3"/><text x="${f1(x + 4)}" y="${f1(y + h / 2 + 4)}" font-family="sans-serif" font-size="10" fill="#D11">${key}</text>`;
const wrap = (W, H, body, note) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<!-- ${note} tools/art/icons.mjs 생성, 손으로 고치지 않음. 빨간 점선 상자·글자 = 글 자리 표시(빌드에는 그 키의 문구, 치수 표시 아님) -->\n${body}\n</svg>\n`;

// 레벨 선택 목업(640x360 가로, 카드 5×2). 위 줄: 뒤로 · (가운데 빈 자리) · 밀림 표지 예시 · 어른 설정(길게 누르기 막대). 아이콘 그림은 icons.mjs 와 같은 함수.
function levelSelect() {
  const W = 640, H = 360, cw = 108, ch = 112, gx = 12, gy = 30, x0 = (W - (5 * cw + 4 * gx)) / 2, y0 = 78;
  const states = [{ best: 1, grade: 3, bestCombo: 18 }, { best: 1, grade: 2, bestCombo: 21 }, { best: 1, grade: 1, bestCombo: 12 }, { best: 1, grade: 2, bestCombo: 9 }, { best: 0.64, bestCombo: 13 }, { best: 0.22, bestCombo: 6 }, { best: 1, grade: 1, bestCombo: 24 }, { best: 1, grade: 1, bestCombo: 25 }, { best: 0.4 }, { locked: true }];
  let s = `<rect width="${W}" height="${H}" fill="#F4F1EA"/>`;
  s += iconSvg('back', 12, 8, 48);
  s += iconSvg('look_ball', W - 12 - 48 - 12 - 64, 8, 48, { plain: true });
  s += iconSvg('settings', W - 12 - 48, 8, 48, { hold: 0.4 });
  states.forEach((st, i) => { const r = Math.floor(i / 5), c = i % 5; s += levelCard(x0 + c * (cw + gx), y0 + r * (ch + gy), cw, ch, String(i + 1).padStart(2, '0'), st); });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<!-- 레벨 선택 목업 640x360 (tools/art/icons.mjs 생성, 레벨 카드 그림은 cards.mjs levelCard). 글·숫자 없이 구분(round-2): 바탕색·테두리색 + 길·박 표시·북(다리)·공 + 그 레벨 대표 물체 1개(L1 표시만·풀, L2 모래 더미 + 넓은 표시 간격 + 높은 공, L3 구름 + 숨은 공, L4 그네 틀 + 1.5박 표시 간격, L5 지붕 + 앉은 공, L6 가지, L7 큰 언덕 + 높은 공, L8 긴 가지, L9 연 + 지붕, L10 해 + 가지)·잠김 자물쇠. 막대 = 일반 모드 최고 진행도(공 색 점), 카드 아래 등급 3칸(받은 칸 채움, 빈 칸 점선, 늘 3칸), 카드 안 오른쪽 위 작은 금빛 네모 = 최고 콤보 10마다 1개(0~2, aria_best_combo, 숫자 없음). 연습 기록 표시 없음(1-2 D14). 위 오른쪽: 밀림 표지(눈 + 공, 밀림 조건일 때만) · 어른 설정(길게 누르기 1.5 s 막대, 예시 40 % 참). 30-art 11절 -->\n${s}\n</svg>\n`;
}


function mockups() {
  writeFileSync(join(PROJ, 'assets/mockup-level-select.svg'), levelSelect());
  const T = P.themes.level01, T6 = P.themes.level06;
  // 1) 레벨 시작 판(360x640): 레벨 카드를 누르면 뜸. 연습 · 시작(큰) · 그림 다시 보기
  {
    const W = 360, H = 640;
    let s = `<rect width="${W}" height="${H}" fill="#F4F1EA"/><rect x="24" y="120" width="312" height="400" rx="24" fill="${T6.cardBg}" stroke="${T6.accent}" stroke-width="4"/>`;
    s += levelCard(126, 150, 108, 116, '06', { best: 0.22 });
    s += iconSvg('close', 276, 132, 48);
    s += iconSvg('practice', 44, 330, 64) + iconSvg('play', 132, 314, 96) + iconSvg('card_replay', 252, 330, 64);
    s += slot(40, 440, 280, 28, 'level6_name (aria 만, 화면 글 없음)');
    writeFileSync(join(PROJ, 'assets/mockup-level-start.svg'), wrap(W, H, s, '레벨 시작 판 360x640: 레벨 카드를 누르면 뜸. 가운데 큰 ▶ = 일반 모드 시작, 왼쪽 깃발 = 연습 모드, 오른쪽 칸 3개 = 그림 카드 다시 보기(새 기믹 레벨만), × = 닫기. 기록 표시는 일반 모드만(1-2 D14).'));
  }
  // 2) 멈춤 메뉴(360x640 세로 2×2 / 가로는 4개 한 줄): 플레이 화면 위에 불투명 판
  {
    const W = 360, H = 640;
    let s = `<rect width="${W}" height="${H}" fill="${T.bg1}"/><rect x="0" y="512" width="${W}" height="128" fill="${T.floor}"/><rect x="20" y="150" width="320" height="300" rx="24" fill="${T.cardBg}" stroke="${C.ink}" stroke-width="3"/>`;
    s += slot(40, 166, 280, 26, 'pause_screen');
    s += iconSvg('resume', 76, 210, 88) + iconSvg('retry', 196, 210, 88) + iconSvg('levels', 76, 330, 88) + iconSvg('sound_on', 196, 330, 88);
    writeFileSync(join(PROJ, 'assets/mockup-pause-menu.svg'), wrap(W, H, s, '멈춤 메뉴 360x640(아이용, 1-2 D11): 이어 하기 · 다시 · 레벨 고르기 · 소리 켜기/끄기 4개만, 88×88, 간격 32. 가로 화면은 4개 한 줄. 판은 불투명(투명도 없음). 보호자 메뉴 없음.'));
  }
  // 3) 클리어 결과(640x360): 제목 한 줄 → 등급 3칸 → 버튼 3개(L10 은 2개)
  {
    const W = 640, H = 360;
    let s = `<rect width="${W}" height="${H}" fill="${T.bg1}"/><rect x="0" y="320" width="${W}" height="40" fill="${T.floor}"/>` + cloudSvg(60, 250, 106, 58, T.clearCloud);
    s += slot(200, 20, 240, 20, 'level1_name(작은 줄)') + slot(170, 50, 300, 34, 'clear_title_1~3 / clear_last');
    for (let i = 0; i < 3; i++) s += i < 2 ? miniCloud(260 + i * 60, 128, 48, T.accent) : miniCloud(260 + i * 60, 128, 48, 'none', true);
    // 정확도 %(큰 숫자 하나) + 최고 콤보(숫자 + 점 줄 표지): 구름 등급 아래, 크기 순서 구름 등급 > 정확도 > 최고 콤보 (layout.json result_screen)
    const R = resultScreen();
    const fam = `font-family="system-ui, -apple-system, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif"`;
    { const A = R.accuracy, nW = 2.16 * A.font_px, rowW = A.sign_px + 8 + nW + 6 + 14, x0 = W / 2 - rowW / 2, cy = 163;
      s += iconSvg('accuracy', x0, cy - A.sign_px / 2, A.sign_px, { plain: true }) + `<text x="${f1(x0 + A.sign_px + 8)}" y="${f1(cy + A.font_px * 0.36)}" ${fam} font-weight="${A.weight}" font-size="${A.font_px}" fill="${C.ink}">92%</text>` + iconSvg('new_best', x0 + A.sign_px + 8 + nW + 6, cy - 7, 14, { plain: true }); }
    { const B = R.best_combo, nW = 1.24 * B.font_px, rowW = B.sign_px + 6 + nW, x0 = W / 2 - rowW / 2, cy = 192;
      s += iconSvg('best_combo', x0, cy - B.sign_px / 2, B.sign_px, { plain: true }) + `<text x="${f1(x0 + B.sign_px + 6)}" y="${f1(cy + B.font_px * 0.36)}" ${fam} font-weight="${B.weight}" font-size="${B.font_px}" fill="${C.ink}">23</text>`; }
    s += iconSvg('next', 400, 210, 64) + iconSvg('retry', 288, 210, 64) + iconSvg('levels', 176, 210, 64);
    writeFileSync(join(PROJ, 'assets/mockup-result.svg'), wrap(W, H, s, '클리어 결과 640x360: 왼쪽 위 = 끝 구름(공이 그 속에 있음, 섞기 끝색 clearCloud = cloud·accent 35 % — 등급 칸 진한 accent 와 다른 연한 색, N11). 레벨 이름(작은 줄) → 클리어 제목 한 줄 → 등급 3칸(예: 구름 둘, 빈 칸 점선, 늘 3칸, 1-2 D12) → **정확도 %(작은 북 + 다리 밑 표시 표지 + 큰 숫자 26 px, 신기록이면 금빛 꺾쇠 표지) → 최고 콤보(콤보 점 줄 표지 + 숫자 18 px)** — 크기 순서 구름 등급 > 정확도 > 최고 콤보(2026-11-17 판정 이름·% 지시, layout.json result_screen) → 레벨 고르기 · 다시 · 다음(64×64, 간격 48). 정확도·최고 콤보는 일반 모드 클리어만(연습 클리어는 등급 3칸 대신 깃발 1개, 정확도 없음). L10 은 다음 없음. 일반 실패에는 이 화면 없음. 숫자 92%·23 은 예시.'));
  }
  // 4) 보호자 화면(640x360, 설정 길게 누르기 1.5 s 뒤)
  {
    const W = 640, H = 360;
    let s = `<rect width="${W}" height="${H}" fill="#F4F1EA"/>` + iconSvg('back', 12, 8, 48) + slot(72, 18, 300, 28, 'guardian_title');
    s += slot(24, 66, 592, 40, 'guardian_intro');
    const row = (y, icon, key, extra = '') => iconSvg(icon, 24, y, 48) + slot(84, y + 10, 220, 28, key) + extra;
    s += row(120, 'sync', 'settings_sync', iconSvg('look_ball', 316, 120, 48, { plain: true }) + slot(370, 130, 150, 28, 'sound_late(밀림일 때만)'));
    s += row(184, 'language', 'settings_language', `<rect x="316" y="186" width="120" height="44" rx="12" fill="${C.drumBody}" stroke="${C.ink}" stroke-width="2"/>` + slot(324, 194, 104, 28, 'lang_ko') + `<rect x="448" y="186" width="120" height="44" rx="12" fill="${C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>` + slot(456, 194, 104, 28, 'lang_en'));
    s += row(248, 'reset', 'settings_reset');
    writeFileSync(join(PROJ, 'assets/mockup-guardian.svg'), wrap(W, H, s, '보호자 화면 640x360(1-2 D11): 레벨 선택의 어른 설정 버튼을 1.5 s 길게 눌러(가로 막대가 참) 들어옴. 줄: 소리 맞추기(밀림이면 눈 + 공 표지 + sound_late) · 언어(글 버튼 2) · 기록 지우기. 글은 어른용이라 길어도 됨. 줄 높이 64, 버튼 48.'));
  }
  // 5) 소리 맞추기 화면(360x640): 정지한 큰 북 + 앉은 공, 탭할 때만 북 톡. 누른 횟수 점 8개 × 2줄
  {
    const W = 360, H = 640, d = 40;
    let s = `<rect width="${W}" height="${H}" fill="#F4F1EA"/>` + iconSvg('back', 12, 8, 48) + iconSvg('skip', W - 60, 8, 48);
    s += slot(30, 80, 300, 30, 'sync_screen') + slot(30, 116, 300, 24, 'sync_with_grownup');
    s += drumSvg(180, 380, 3.2 * d * 1.4, 0.95 * d * 1.4, 0.28 * d * 1.4, { d: d * 1.4 }) + ballSvg(180, 380 - d * 0.92, d, { sq: 0.92 });
    for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) s += `<circle cx="${f1(68 + i * 32)}" cy="${f1(470 + r * 30)}" r="9" fill="${r === 0 && i < 5 ? C.drumBody : C.hudTrack}" stroke="${C.ink}" stroke-width="2"/>`;
    s += slot(30, 540, 300, 24, 'sync_progress (aria) / sync_again');
    writeFileSync(join(PROJ, 'assets/mockup-sync.svg'), wrap(W, H, s, '소리 맞추기 360x640(어른용): 큰 북 위 앉은 공은 정지(박에 맞춰 움직이지 않음, insights rhythm-01). 들리는 소리는 받침 쉼과 같은 콩(rest_a, 한 높이). 탭할 때만 북 톡 + 점 1개 참. 점 8개 × 2줄(balance calibration 횟수, 예: 첫 줄 5번 침). 끝나면 sync_done / sync_kept / sync_redo.'));
  }
}

// 결과 화면 크기(layout.json result_screen — layout.mjs 원본). 없으면 기본값
function resultScreen() {
  try { const L = JSON.parse(readFileSync(join(PROJ, 'assets/layout.json'), 'utf8')); if (L.result_screen) return L.result_screen; } catch {}
  return { grade_cloud_w_px: 48, grade_cloud_h_of_w: 0.62, accuracy: { font_px: 26, weight: 800, sign_px: 28 }, best_combo: { font_px: 18, weight: 700, sign_px: 20 } };
}
export function checkIcons() {
  const out = []; let fail = 0;
  const ok = (n, p, m) => { out.push(`${p ? 'OK  ' : 'FAIL'} ${n}: ${m}`); if (!p) fail++; };
  let strings = null;
  try { strings = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8')); } catch (e) { ok('strings.json', false, `읽기 실패(대기: lore) ${e.message}`); }
  const miss = [], missKey = [], small = [];
  for (const ic of ICONS) {
    if (!GLYPH[ic.name]) miss.push(ic.name + '(그림)');
    if (!existsSync(join(DIR, `icon-${ic.name}.svg`))) miss.push(`icon-${ic.name}.svg`);
    if (strings && !strings[ic.key]) missKey.push(`${ic.name}→${ic.key}`);
    if (!ic.sign && ic.size < 48) small.push(ic.name);
  }
  ok('아이콘 파일', !miss.length, miss.length ? `없음 ${miss.join(', ')}` : `${ICONS.length}개 모두 있음`);
  ok('문구 키', !missKey.length, missKey.length ? `strings.json 에 없음(대기: lore) ${missKey.join(', ')}` : `아이콘 ${ICONS.length}개의 aria·보조 글 키가 strings.json 에 모두 있음`);
  ok('터치 크기', !small.length, small.length ? `48 px 미만 ${small.join(', ')}` : '버튼 모두 ≥ 48 px(표지 제외)');
  // rhythm-01 모양 피함: 설정 그림에 톱니·막대 3 없음(원은 머리 2개뿐, r ≤ 6), 길게 누르기 표시는 rect, 밀림 표지에 헤드폰·모래시계 없음
  const circ = [...GLYPH.settings.matchAll(/<circle[^>]*r="([\d.]+)"/g)].map((m) => +m[1]);
  ok('설정 그림', circ.length === 2 && circ.every((r) => r <= 6) && !/<line/.test(GLYPH.settings), `머리 원 ${circ.length}개(r ${circ.join(',')}) + 몸 사각, 톱니·막대 3 + 손잡이 없음`);
  ok('길게 누르기 표시', /^<rect/.test(holdBar(0, 0, 48, 0.5)) && !/circle|A\d/.test(holdBar(0, 0, 48, 0.5)), '버튼 아래 가로 막대(원형 고리 아님)');
  ok('밀림 표지', /Q15 12 25 24/.test(GLYPH.look_ball) && !/hourglass|headphone/i.test(JSON.stringify(ICONS.find((x) => x.name === 'look_ball').shape)), '눈 + 공 하나');
  // 결과 화면 크기 순서(djmax-judgement 7-5): 구름 등급 > 정확도 % > 최고 콤보
  const R = resultScreen(), gh = R.grade_cloud_w_px * R.grade_cloud_h_of_w;
  ok('결과 화면 크기 순서', gh > R.accuracy.font_px && R.accuracy.font_px > R.best_combo.font_px && R.accuracy.sign_px > R.best_combo.sign_px, `구름 등급 높이 ${gh.toFixed(1)} > 정확도 글자 ${R.accuracy.font_px} > 최고 콤보 글자 ${R.best_combo.font_px} px (표지 ${R.accuracy.sign_px} > ${R.best_combo.sign_px})`);
  ok('정확도 표지 모양', !/<circle/.test(GLYPH.accuracy) && /<path|<rect/.test(GLYPH.accuracy), '작은 북 + 박 표시(원형 고리·과녁 없음)');
  return { out, fail };
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/art/icons.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  if (!args.includes('--check')) {
    mkdirSync(DIR, { recursive: true });
    for (const ic of ICONS) writeFileSync(join(DIR, `icon-${ic.name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">\n<!-- icon-${ic.name}: ${ic.shape}. 키 ${ic.key}. 쓰는 곳: ${ic.where}.${ic.avoid ? ' 피한 것: ' + ic.avoid + '.' : ''} tools/art/icons.mjs 생성, 글자 없음. 30-art 11-2 -->\n${iconSvg(ic.name, 0, 0, 48, { plain: !!ic.sign })}\n</svg>\n`);
    mockups();
    console.log(`아이콘 ${ICONS.length}개, 레벨 선택·메뉴 목업 6개 씀`);
  }
  const r = checkIcons();
  for (const x of r.out) console.log(x);
  console.log(r.fail ? `icons FAIL ${r.fail}` : `icons OK (아이콘 ${ICONS.length}개·문구 키·터치 ≥ 48 px·rhythm-01 모양 피함)`);
  process.exit(r.fail ? 1 : 0);
}
