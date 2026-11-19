# art-director round-3 처리표 (flow-01, 2026-11-19)

가정: balance 어려운 판이 아직 확정되지 않아 **판 ≤ 12x12, 쌍 ≤ 16** 상한으로 설계했습니다(확정되면 `layout.mjs BOARDS_WIDE`와 `palette.mjs PAIRS_EXT`만 맞추면 됨). 검사 `node assets/check/check-all.mjs`는 5개 모두 통과했습니다.

| 변경 | 위치 |
|---|---|
| ① 넓은 판: 칸 ≥ 48(플레이 56), 전체 보기(그리기 없음) ↔ 플레이 확대, 가장자리 따라가기, 미니맵(쌍 점 줄 대신), 4해상도 검사(보이는 칸 ≥ 5, 미니맵 ≥ 3 px·48 누름, 겹침 0), 목업 | `layout.mjs playWide`·`BOARDS_WIDE`, `layout.json play_wide`, `mockups/play-wide-*.svg`, 30-art 14-1 |
| ② 쌍 16개: 색 10개 추가(16색 정상 ΔE00 ≥ 10, 대비 기준 동일, 색약 3종 얇은 선 대비 ≥ 2.0), 표지 10개 추가(16개 모두 다른 모양 = 주 구분), 넓은 판 선 표지 5칸마다 | `palette.mjs PAIRS_EXT`·검사, `shapes.mjs MARKS_EXT`, `marks/mark-p7~p16-*.svg`·`marks-sheet-16.svg` |
| ③ 어려운 판 입구: 지도 6번째 페이지 문 5개 + 별 칸 10개 링, 해금 연출, 단계 바탕 5개 | `layout.mjs hardPage`, `map.*.hard`, `palette themes.hard1~5`, `mockups/map-hard-*.svg` |
| ④ 규약: 지도 guardian_hold 글·길게 누르기 제거, 설정 = 일반 버튼(검사), 설정 화면 키 = settings_title·settings_intro | `layout.mjs map()`·`guardianScreen` |
| ⑤ 성능: 넓은 판 캐시 상한(≤ 2048² 한 장, 넘으면 512 타일, 합계 ≤ 32 MB), 카메라 = translate, 바뀐 칸만, 연출 viewport 안·조각 ≤ 48 | `layout.json render.wide_r3` |

## 개발 전달 (game-developer)
1. 넓은 판은 `play_wide[해상도][CxR]`를 따릅니다. `camera`가 null이면 지금과 같고, 있으면 overview/play 두 모드, follow, jump, clamp를 그대로 구현합니다. 미니맵은 `minimap`(tap = 전체 보기 토글, drag = 이동)입니다. 4해상도 밖 크기는 같은 식을 옮겨 씁니다.
2. 쌍 7~16은 `palette.json pairs_ext`를 씁니다(color_slot 6~15). 표지 경로는 `layout.json marks.paths`(16개)에 있고, 넓은 판 선 표지는 `wide_line_mark_every_cells` 5칸마다 둡니다.
3. 지도 6번째 페이지는 `map.*.hard`(문 위치·링·상태·unlock_motion)를 따르고, 바탕은 문 페이지 = hard1, 단계 판 = hardN입니다.
4. 지도 톱니는 일반 버튼으로 바꾸고 guardian_hold 글을 없앱니다. 설정 화면 글 키는 settings_*입니다.
5. `render.wide_r3` 규칙을 지킵니다.

## 다른 역할 대기
- balance: 어려운 판 크기·쌍 수·단계별 판 수가 정해지면 BOARDS_WIDE·PAIRS_EXT 수를 맞춥니다(상한 안이면 그대로 둬도 됨).
- lore: hard_title·hard1~5_name·aria_hard_need 글이 문 그림과 맞는지, settings_* 새 키가 맞는지 확인이 필요합니다.
