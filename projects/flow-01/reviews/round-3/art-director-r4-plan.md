# art-director round-4 처리표 (flow-01, 2026-11-19)

검사: `node assets/check/check-all.mjs` 5개 모두 통과했습니다(팔레트: 16쌍 색약 ΔE<10 쌍 0 / 레이아웃: 넓은 판 4크기 × 4해상도, 큰 그림 결과 / 소리 S9 / 튜토리얼: card-wide / SVG 155개). 요약은 `30-art.md` 15절에 있습니다.

| 이슈 | 처리 | 위치 |
|---|---|---|
| T1·M1 전체 보기 vs 48 px | 수정: 칸 ≥ 48 화면은 바로 긋기(camera null), 그 밖은 누른 채 확대(220 ms) → 이어 긋기, 확대 칸 48 | `layout.mjs playWide`·`play_wide.*.camera` |
| T2·M4 16쌍 구분 | 수정: 전체 보기 끝점 ≥ max(0.9칸, 26)·표지 ≥ 14, 16색 재배치(색약 3종 ΔE<10 쌍 0, 최소 10.06), 비슷한 모양 두 쌍 L* 차 ≥ 15 | `palette.mjs PAIRS_EXT`·검사, `play_wide.*.overview` |
| T5·M3 장 바탕 | 수정: 장 색 45 %, 장마다 장식(streak·blob·dotfield·twinkle), 지도 페이지 바탕 map1~5·map_hard | `palette.mjs CHAPTER_TINT`·`THEMES` |
| T13 단계 테마 이름 | 수정: lore 이름(모자이크 타일 등)으로 | `palette.mjs hard1~5`, 30-art 14-3 |
| T7 7쌍 이상 화음 | 수정: voices_max 6, 사다리 규칙, sound-check S9(k3~16 렌더) | `sound.json`, `sound-check.mjs` |
| T14 넓은 판 첫 안내 | 수정: H1-01 그림 카드(누른 채 확대·이어 긋기·미니맵), 되돌리기·처음부터 jump | `tutorial/card-wide.svg`, `play_wide.*.card`·`camera.jump` |
| T15 해금 연출 | 수정: 잠긴 문 누름 반응, 고리 이어짐·격자 물듦, 결과 문 그림 | `map.*.hard`, `result_wide.*.gate_badge` |
| T16 세로 위 빈 215 px | 수정: 판정·채움 막대를 HUD 아래로, viewport 키움(7x8 ~ 8x12) | `playWide` |
| T17 막대-판 간격·반쪽 칸 | 수정: 전체 보기 판 위쪽 정렬, viewport = 칸 배수, 칸 경계 맞춤, 검사(간격 ≤ 12) | `playWide`·검사 |
| T18 D54 오른쪽 자리 | 수정: 가로 넓은 판 judge.right 제거(left_only) + 미니맵 겹침 검사 | `playWide`·검사 |
| T19 큰 그림 결과 | 수정: 미니 판 크게, 쌍 점 2줄 × 8 | `layout.json result_wide` |

## 개발 전달 (game-developer)
1. `play_wide`: camera null이면 바로 긋기. 아니면 전체 보기 누름 → `zoom_ms` 220 확대 → 같은 포인터로 이어 긋기(움직임 버퍼, 건너뛴 칸 채움). viewport·judge(가로 왼쪽만)·fill_bar는 새 값을 쓰고, 쉴 때 칸 경계로 snap합니다. 전체 보기 끝점·표지 크기는 `overview`에 있습니다.
2. 쌍 7~16 색은 `palette.json pairs_ext`(새 hex)를 씁니다. 장 2~5 바탕·장식(streak·blob·dotfield·twinkle 새 모양, 대비 ≤ 1.3), 지도 페이지 바탕 `themes.map1~5`·`map_hard`도 반영합니다.
3. H1-01 첫 진입 카드는 `tutorial/card-wide.svg`이고, 글 키는 lore의 `card_wide`입니다.
4. 문 잠김 누름 반응·해금 모양 바뀜·결과 `result_wide`(gate_badge, 2줄 점)를 구현합니다.
5. 소리: 화음 min(쌍, 6), 연결 음 ladder[min(n, 6) − 1].

## 다른 역할 대기
- 없음: lore `card_wide` 글이 들어와 있고, layout 검사로 4해상도 카드 글 자리에 들어가는 것을 확인함.
