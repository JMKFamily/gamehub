# 처리표: balance-designer · plan 1-2 교차 리뷰 2차(1회 수정)

- 날짜: 2026-11-18 · 프로젝트 flow-01
- 따른 결정: F1~F5(1-1 감시), **G1~G7**(`Docs/orchestrator/2026-11-18-1-2-cross-review-decisions.md`)
- 고친 파일(내 담당만): `20-balance.md`, `balance.json`, `levels/*.json`(L6 판 교체 + 모든 레벨 필드), `tools/core/board.mjs`(CORE_VERSION 1.0.0 → 1.1.0), `tools/verify-levels.mjs`, `tools/build-levels.mjs`, `tools/levels-picks.json`, 새 탐색 도구 `tools/l6-interior.mjs`·`tools/l6-measure.mjs`
- 검사: `node tools/verify-levels.mjs` 전체 실행 결과는 맨 아래

## 내 리뷰(balance-designer.md)에서 balance 담당

| # | 처리 | 내용 · 위치 |
|---|---|---|
| 3 | **수정(G1)** | L6 을 다시 고름: 시드 6001131(후보 1131). 구멍 [4,2]·[1,3], 카드 구멍 `hole_card.first_hole` = **[1,3](판 안쪽, 둘레 4칸이 모두 칸)**. 다른 구멍 [4,2]는 오른쪽 가장자리라 art 외곽선 파내기 규칙으로 그림. 후보를 500 → 1,500개로 늘려 구멍이 안쪽인 판 106개(목표 ±15 %)를 재고, 몰림 ≤ 30 % 4개 중 단조 여유·몰림이 가장 좋은 판. `tools/levels-picks.json`, 20-balance 8-2·8-3, `tools/out/l6-interior.json` |
| 6 | **수정(G2)** | 결과 % = ⌊100 · 한 번에 이은 쌍 / 쌍 수⌋. "한 번에" = 완료 때 그 색 이동 수 1. `board.mjs accuracyPct`·`oneShotPairs`, `balance.json percent`, 20-balance 0-2·1-2·4·5절, verify R12·C2 |
| 7 | **수정(G3)** | 판 채움 % = 연결된 쌍의 칸만(`coveredCells`). 표시 시간 = 판정 이름과 같은 630 ms, aria-hidden. `board.mjs`, `balance.json percent.fill_pct_*·in_play_lifetime·in_play_aria`, 20-balance 4절, verify R13 |
| 8 | **수정** | `judge.name_keys`·`grade_sound_keys`·`grade_index_rule`, 20-balance 5-1 연결표 |
| 9 | **수정** | `tutorial.text_key` "tut_drag", `fill_card.text_key` "card_fill"·`svg`, `hole_card.text_key` "card_hole"·`svg`. 기존 필드 이름(`empty_cells`·`first_hole`·`demo_drag`)은 그대로. verify V9 |
| 10 | **수정** | 20-balance 0-2 "짝 점 위" → 판 밖(F5), 1-2 표 "판 안쪽으로" → 판 밖, 튐 "1.2/1.15/1.1" → 1.22/1.18/1.14 |
| 12 | **수정** | 빈칸 숨 쉬기 시작 = 마지막 연결 + **630 ms**(`fx_ms.empty_breath_start_after_last_connect_ms`, `empty_breath_start_rule`), 20-balance 9절 |
| 13 | **수정** | `judge.name_fade_on_complete_start_ms` 150, `haptics_ms.complete_delay_ms` 150·`complete_replaces_last_connect` true |
| 14 | **수정** | `complete.result_buttons_after_ms` 1280(카드가 다 올라온 뒤), 20-balance 9절 |
| 15 | **수정** | 크기 원본 = layout.json. `pct_text_*` 지우고 `pct_size_source`·`pct_size_rule`("% < 이름")만 둠 |
| 16 | **수정(G5)** | V1 이 `assets/layout.json play.<해상도>.<W>x<H>.cell` 을 직접 읽음. `board_side_margin_px`·예약 200 px 키 삭제, `cell_px_source`·`cell_max_px` 96. 54.7 → 54.9 px(2-1·8-2·K3) |

## lore 리뷰(lore-writer.md)에서 balance 담당

| # | 처리 | 내용 · 위치 |
|---|---|---|
| 1 | **수정(G1)** | 위 내 #3 과 같음 |
| 4 | 해당 없음(balance 확인만) | balance 쪽 같은 낡은 문장은 내 #10 으로 고침 |
| 5 | **수정(G2)** | 별도 "한 번에 이은 쌍" 표지 삭제(0-2·5절·`combo.result_max_combo` = `replaced_by_star_and_pct`). %가 그 값 |
| 10 | **수정** | `judge.name_keys` (내 #8) |
| 11 | **수정** | `text_key` 필드 (내 #9) |
| 12 | **수정** | 레벨 JSON `name_placeholder` 삭제(빌드 표시 글이 데이터에 없도록), 20-balance 머리·12절, verify V9 |
| 13 | **수정** | 1-2 표 판 밖으로, 0-1·1-3·13절 ④ 한 문장 = lore 확정 "같은 색 점을 이어서, 빈칸 없이 다 칠해요" |
| 14 | **수정(G3)** | 13절 ③ "칠한 칸" 대체 글 요청 철회(aria-hidden) |
| 15 | **수정** | 도움 대상 "답과 다른 쌍(안 이은 쌍 + 답과 다른 길로 이은 쌍)"으로 고정, `help.target` `one_pair_not_matching_solution`, 20-balance 10-2. art 쪽 문장은 대기 |
| 16 | 해당 없음(art 처리) | balance 는 c1 시연 유지 |

## art 리뷰(art-director.md)에서 balance 담당

| # | 처리 | 내용 · 위치 |
|---|---|---|
| 4 | **수정(G1 우선)** | art 안("레벨 유지, B3 철회")이 아니라 G1 대로 L6 재선정. 남은 둘레 구멍(L6 [4,2], L8 [0,0])은 art 외곽선 파내기 규칙이 필요 |
| 5 | **수정(G2)** | 결과 화면 별도 쌍 점 줄·반짝 표지 불필요(lore #5 와 같음) |
| 6 | **수정(G5)** | 내 #16 |
| 7 | **수정(G5)** | 내 #16(200 px 두 키 삭제) |
| 8 | **수정** | 내 #15(최소 15 = layout 원본) |
| 9 | **수정** | `name_text_height_min_px` → `name_font_px_min` 28 + `name_font_note`(CSS font-size) |
| 10 | **수정** | `empty_breath_max_scale_frac` → `empty_breath_max_brightness_frac` 0.2, 크기 한도는 `empty_breath_scale` 1.08 |
| 11 | **수정** | 내 #13 |
| 23 | **수정(G3)** | `percent.in_play_lifetime` "with_judge_name" |

## 정의 고정 메모 (G2 "한 번에")
- 오케스트레이터 문구 "연결 뒤 풀렸다가 다시 이으면 한 번에 아님"을 **그 색 이동 수 = 1** 로 고정했습니다. 풀린 쌍을 다시 이으려면 그 색을 다시 그어야 하고, 그 긋기는 다른 색 이동이나 되돌리기·처음부터 뒤라 새 이동으로 세어집니다 → 한 번에 아님. 다만 **다른 색을 건드리지 않고 같은 색을 바로 고쳐 그은 것**은 이동 수 규칙상 같은 이동이라 한 번에 유지합니다. 이렇게 정해야 %·별·1단이 늘 같습니다(같은 색 고쳐 긋기를 "한 번에 아님"으로 하면 별은 있는데 % < 100 인 판이 생김). 검사 R12·C2.

## 다른 역할 대기
- **art**: ① L6 카드·목업을 새 L6(`hole_card.first_hole` [1,3], 이웃 점 c5 b [0,3]·c4 a [2,3])로 레벨 JSON 에서 다시 생성, 둘레 구멍 [4,2](L6)·[0,0](L8) 외곽선 파내기 ② layout `motion.gap_hint.start` 를 "마지막 연결 + 630 ms" 로 ③ layout `motion.help` 문장 "안 이은 쌍" → "답과 다른 쌍" ④ 결과 버튼 입력 시작 1280 ms 를 layout `motion.result` 에 ⑤ 결과 화면 별도 "한 번에 이은 쌍" 자리 만들지 않음(G2) ⑥ 30-art 1-1 표 "플레이 중 숫자 없음" → 판 채움 %가 이름과 630 ms.
- **lore**: ① `guardian_intro` 결과 % 설명 = "한 번에 이은 색 수 / 색 수"(G2, 이제 식과 같음) ② 판 채움 % 키 없음·aria-hidden(G3) ③ `node_partial`·`aria_best_fill` 뜻 "연결된 칸 기준" ④ 9-3 `tut_drag` 설명은 `balance.json tutorial` 참조.
- **game-developer(1-3)**: `board.mjs` 1.1.0 복사, `name_placeholder` 대신 strings `levelN_name`.

## 검사 결과
- `node tools/verify-levels.mjs` **전체 실행 ALL PASS**(아이 봇 레벨당 2만 회 × 10레벨, 봇 106 s, 로그 `tools/out/verify-full.log`). 새 검사 R12·R13·V9 통과, V1 = layout.json 최소 칸 54.9 px, C2 완료 실행 20만 회 불일치 0, C1 1만 쌍 불일치 0.
- 곡선: m̃ 3.67 < 4.95 < 7.02 < 8.22 < 8.91 < **9.34(L6 새 판)** < 12.37 < 13.78 < 15.68 < 16.43, r 1.382, L10 −11.3 %(B4·B5 통과), 최대 직전 대비 1.42배. L6 중간 봇 몰림 23.8 % ≤ 30 %. 나머지 9레벨은 판이 바뀌지 않아 값이 1-1 과 같음.
- 수정 중에는 `--quick`(6.6 s)만 돌렸고, 전체 실행은 마지막 1회.
- art 는 이미 2차를 끝냈으므로 새 L6 로 `assets/check/tutorial.mjs` 생성·check-all 재실행이 필요합니다(art 대기 ①).
