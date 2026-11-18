# 처리표: lore-writer · plan 1-2 2차 (1회 수정)

- 날짜: 2026-11-18 · 따른 결정: F4·F5(1-1), G1~G7(1-2). 수정 파일: `10-lore.md`, `strings.json`만.
- 결과: lore 담당 이슈 28건(세 리뷰, 중복 포함) → 수정 26 / 보류 2. 9-9 검사 PASS(66키).

## balance-designer 리뷰
| # | 처리 | 위치·내용 |
|---|---|---|
| 5 | 수정(G2) | 6-4·9-5 `result_accuracy`: % = 한 번에 이은 쌍/쌍 수, 따로 표지·키(`result_one_go`) 두지 않음 |
| 6 | 수정(G2) | `guardian_intro` KR·EN: "5쌍 중 4쌍 = 80 %", 다시 이은 색은 한 번에 아님, 플레이 중 %는 판을 칠한 만큼 |
| 7 | 수정(G3) | 9-2 `node_partial`·`aria_best_fill`: 연결된 쌍이 칠한 칸 기준 |
| 10 | 수정(F4·F5) | 6-1 자리 = 판 밖, 6-4 판 채움 % 채택, 9-4 `judge_1_name`, 8절 10, 12절 |
| 17 | 수정 | 9-3 `tut_drag`: 데이터 기준(1.2 s 쉼·2회 뒤 3 s·첫 누름에 손가락 사라짐·글은 첫 연결에 사라짐·8 s 다시), 원본 = balance.json tutorial |
| 18 | 수정 | 7절 L1 "또렷한 3색 빨강·파랑·노랑", L6 5x6, L9 옅은 호 3개, 카드 ✓ → 반짝임 |

## art-director 리뷰
| # | 처리 | 위치·내용 |
|---|---|---|
| 3 | 수정(G1) | 9-3 `card_hole`: 판 안쪽 구멍, 선이 구멍 옆으로 지나가고 구멍만 빈 채 다 칠해짐. 7절 L6 |
| 5 | 수정(G2) | 키 추가 없음, `result_accuracy`가 대신(6-4) |
| 14 | 수정 | `card_fill`·`card_hole` 체크 → 작은 반짝임(완료 같은 색 조각), `result_check` = 완성 미니 판 |
| 15 | 수정 | `tut_drag` 1.2 s(위 balance #17) |
| 16 | 수정(G6) | 6-3·9-4 `gap_left`: 3번째 숨 쉬기에만, 자리 = 판 밖 `board_text`, 판정 이름이 오면 숨김 |
| 17 | 수정 | `node_partial` 그림 = 노드 둘레 호가 칠한 만큼 늘어남 |
| 18 | 수정 | 7절 L9 옅은 호 3개 |
| 19 | 수정 | 7절 L1 색 |
| 20 | 수정(F5) | 6-1·9-4 판 밖 |

## lore-writer 리뷰(내 1차)
| # | 처리 | 위치·내용 |
|---|---|---|
| 1 | 수정(G1, lore 몫) | 7절 L6·8절 7·9-3: 문구 "판 안쪽 구멍"에 맞춤, 둘레로 남으면 낱말 유지 + art 파내기. 판 재선정은 balance |
| 4 | 수정 | 변경 목록 ①~⑩ 모두 반영(①6-1 ②9-4 ③6-4 ④8절 10 ⑤aria-hidden ⑥meter 늘 ⑦guardian_intro ⑧6-3 흐려짐 ⑨13절 L3 ⑩12절) |
| 5 | 수정(G2) | 키 없음 |
| 7 | 수정(G7) | `guardian_hold` 문구 유지, 자리는 art map text_slots |
| 8 | 수정(G7) | `level1_name` 결과 화면 제목 위 보이는 글 + 바탕색 띠, 자리 없으면 aria 대안 |
| 9 | 수정(G7) | `result_new_best` 유지, 그림·자리는 art |
| 11 | 보류 | 레벨 JSON 키 필드는 balance #9(card_key·text_key)가 2차에 넣음. lore 9-3 문장 그대로 |
| 14 | 수정(G3) | 판 채움 % 키 없음·aria-hidden(6-4). balance 13절 ③ 삭제는 balance 몫 |
| 18 | 수정(G6) | 위 art #16 |
| 21 | 수정 | 9-6 `settings_sound` = 지도 소리 버튼 이름 + aria-pressed(새 키 없음) |
| 22 | 보류 | `map_screen` aria 전용 유지 — art 1차 #12가 lore 안(보이는 제목 빼기)을 받았으므로 내 1차 제안(화면으로)은 철회 |
| 23 | 수정 | 7절 L1·L6·L9·L10(판 모서리 뒤 별)·7절 끝 "하루 흐름은 레벨 바탕에서만" |
| 24 | 수정 | 9-3 숫자 대신 데이터 참조, 표지 = 반짝임, 9-5 % 작게 |

## 다른 역할 대기
- balance: L6 판 안쪽 첫 구멍 재선정(G1) / 레벨 JSON `card_key`·`text_key`, `grade_name_keys`(balance #8·#9) / 20-balance 13절 ③ "칠한 칸" 대체 글 삭제, 0-2·1-2 "짝 점 위" 문장(F5) / 판 채움 % = 연결된 쌍 칸(G3).
- art: 결과 화면 레벨 이름 자리 + 바탕색 띠, `result_new_best` 그림, 지도 `guardian_hold` 자리(G7) / 지도 보이는 제목 빼기(art #12) / `gap_left` 3번째 숨 쉬기 `text_on_breath`(G6) / 카드 3장 레벨 JSON 생성·✓ 대신 반짝임 / layout 검사에 `levelN_name`·`clear_*` 넣기.
