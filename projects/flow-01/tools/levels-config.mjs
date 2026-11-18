// 레벨 자리(slot) 설정: 판 크기·쌍 수·구멍·새 요소. 20-balance 8절 표의 원본.
// build-levels.mjs 가 이 표 + 고른 시드로 levels/*.json 을 다시 만듦(결정적).
export const BASE_SLOTS = [
  { id: '01', width: 4, height: 4, pairs: 3, holes: 0, new_element: 'drag_connect', new_element_ko: '드래그로 같은 색 잇기(손가락 시연)' },
  { id: '02', width: 4, height: 4, pairs: 3, holes: 0, allowSelfAdjacent: true, new_element: 'fill_all_cells', new_element_ko: '빈칸 채우기(다 이어도 빈칸이 남을 수 있는 판)' },
  { id: '03', width: 5, height: 5, pairs: 4, holes: 0, new_element: 'bigger_board', new_element_ko: '판 커짐(5x5)' },
  { id: '04', width: 5, height: 5, pairs: 4, holes: 0, new_element: 'long_winding_line', new_element_ko: '꺾임 많은 긴 선' },
  { id: '05', width: 5, height: 5, pairs: 5, holes: 0, new_element: 'more_colors', new_element_ko: '색 하나 더(5쌍)' },
  { id: '06', width: 5, height: 6, pairs: 5, holes: 2, new_element: 'holes', new_element_ko: '구멍 칸(판 모양 변화, 그림 카드)' },
  { id: '07', width: 6, height: 6, pairs: 5, holes: 0, new_element: 'bigger_board', new_element_ko: '판 커짐(6x6)' },
  { id: '08', width: 6, height: 6, pairs: 5, holes: 3, new_element: 'none', new_element_ko: '없음(구멍 + 긴 우회 조합)' },
  { id: '09', width: 6, height: 6, pairs: 6, holes: 0, new_element: 'more_colors', new_element_ko: '색 하나 더(6쌍)' },
  { id: '10', width: 6, height: 6, pairs: 6, holes: 0, new_element: 'none', new_element_ko: '없음(종합)' },
];
// 레벨 11~50(round-2): tools/levels-ext.json(ext-pick.mjs 가 고름). 판 가족 = 생성 설정을 빌려 온 자리(06~10), 시드는 그 자리 후보 풀 시드.
import { readFileSync, existsSync } from 'node:fs';
const EXT = new URL('./levels-ext.json', import.meta.url);
const ext = existsSync(EXT) ? JSON.parse(readFileSync(EXT, 'utf8')).slots : [];
// 레벨 11~50 판 가족(round-2): 6x6, 쌍 4~6, 구멍 0~2. 시드 = FAMILY_SEED_BASE(가족) + i. 구멍은 L6 에서 이미 소개한 요소라 새 기믹 아님
export const FAMILIES = [
  { id: 'A', width: 6, height: 6, pairs: 6, holes: 0 },
  { id: 'B', width: 6, height: 6, pairs: 6, holes: 1 },
  { id: 'C', width: 6, height: 6, pairs: 5, holes: 0 },
  { id: 'D', width: 6, height: 6, pairs: 5, holes: 1 },
  { id: 'E', width: 6, height: 6, pairs: 4, holes: 0 },
  { id: 'F', width: 6, height: 6, pairs: 4, holes: 1 },
  { id: 'G', width: 6, height: 6, pairs: 6, holes: 2 },
];
export const FAMILY_SEED_BASE = (fid) => 50000000 + 1000000 * (fid.charCodeAt(0) - 64);
export const EXT_SLOTS = ext.map((e) => { const f = FAMILIES.find((s) => s.id === e.family) || BASE_SLOTS.find((s) => s.id === e.family); return { ...f, id: e.id, chapter: e.chapter, chapter_pos: e.chapter_pos, family: e.family, seed: e.seed, new_element: 'none', new_element_ko: e.chapter_pos === 1 ? '없음(챕터 시작 숨 고르기)' : '없음(배치로 난이도)' }; });
export const SLOTS = [...BASE_SLOTS, ...EXT_SLOTS];
// 생성 시드 = slot 기본 + i (i = 0, 1, 2, …). 고른 시드는 levels-picks.json 에 기록.
export const SEED_BASE = (slotId) => 1000000 * Number(slotId);
