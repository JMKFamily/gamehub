# 처리표: art-director · plan-1-2 2차 (1회 수정)

- 날짜: 2026-11-18 · 따른 결정: F1~F5, **G1~G7** · 수정 파일: `30-art.md`, `assets/`(layout·sound·palette JSON, check/*.mjs, icons, tutorial, mockups)
- 합계: **36건 = 수정 35 · 보류 1** (art 리뷰 12, balance 리뷰 10, lore 리뷰 14 — 담당에 art가 들어간 이슈 전부)
- 검사: `node assets/check/check-all.mjs` → 5종 통과(팔레트 · 레이아웃 J1 포함 · 소리 S1~S7 · **튜토리얼(카드 = 레벨 첫 등장)** · SVG 63개). 권장 미달 4건(6열/6행 칸 54.9 < 56)은 1-1과 같음.

## art-director 리뷰 (내 1차)

| # | 처리 | 위치 |
|---|---|---|
| 1 L1 시연 그림 ≠ L1 | 수정 — L1 JSON(`tutorial.demo_drag`·pairs)으로 생성 | `assets/check/tutorial.mjs`, `tutorial/tut-l1-demo-storyboard.svg`, 30-art 8-1 |
| 2 L2 카드 ≠ L2 | 수정 — L2 왼쪽 위 3x3 창, 금빛 c3 곧게 → (0,0)·(0,1) 숨 쉼 / 돌아 이음. 남는 칸을 BFS로 다시 계산해 `fill_card.empty_cells`와 대조 | `tutorial.mjs`, `card-fill.svg`, 30-art 8-2 |
| 3 L6 카드 ≠ L6 | 수정(art 몫) — `first_hole` 둘레 3x3 창, 생성식. 문구는 lore 대기 | `tutorial.mjs`, `card-hole.svg`, 30-art 8-3 |
| 4 둘레 구멍 규칙 | 수정 — 외곽선 파내기 규칙 + 목업 L6·L8 | `layout.json hole_rule`, 30-art 3절·D2, `mockups/board-l06.svg`·`board-l08.svg` |
| 5 결과 "한 번에 이은 쌍" 자리 | 수정(G2) — 별도 표지·쌍 점 줄 두지 않음, % = 한 번에 이은 쌍 % | `layout.json result.*.pct._rule`, 30-art 5-1 |
| 12 지도 제목 | **보류** — lore가 같은 이슈(lore #22)에서 art 안(보이는 제목)을 받기로 해 그대로 둠(둘 다 뒤집지 않게) | 30-art 5-2 |
| 13 결과 레벨 이름·new_best·제목 검사 | 수정 — 레벨 이름 띠(G7), `icon-new_best.svg`, `clear_*`·`level*_name` 폭 검사 | `layout.json result.*`, `layout.mjs` check, 30-art 5-1 |
| 16 gap_left 시점 | 수정 — `text_on_breath: 3`(G6), 자리는 board_text 유지 | `layout.json motion.gap_hint`, 30-art 4-6·5절 |
| 21 등급 소리 구분 | 수정(G4) — 음 개수 3/2/1, RMS 계단 최소 2.04 dB, S7 검사, S1 여유 1.63 dB | `sound.json`, `sound-check.mjs`, 30-art 7절 |
| 22 판정 이름 크기 | 수정 — 38/33/28, 주 단서 순서 명시 | `layout.mjs PARAM.judge_font`, 30-art 4-3 |
| 23 판 채움 % 표시 시간 | 수정(art 몫, G3) — `judge.pct_lifetime: with_judge_name`, `pct_counts: connected_pairs_cells_only`, 1-1 표 고침 | `layout.json play.*.judge`, 30-art 1-1·4-3 |
| 24 icon-lock | 수정 — 삭제 | `assets/icons/`, `svg.mjs`, 30-art 11절 |

## balance-designer 리뷰

| # | 처리 | 위치 |
|---|---|---|
| 1 L2 카드 | 수정(위 art #2) | `card-fill.svg` |
| 2 L6 카드 | 수정(위 art #3·#4), 모서리 구멍 = 외곽선 파내기 | `card-hole.svg`, `hole_rule` |
| 4 L1 storyboard | 수정(위 art #1), B2 "L1 데이터 우선"으로 고침 | 30-art 8-1·10절 B2 |
| 5 결과 한 번에 이은 쌍 | 수정(G2로 정리, 표지 없음) | 30-art 5-1 |
| 7 % 정의 | 수정(art 몫) — 그림은 그대로(연결 칸만 tint), `pct_counts`·node_partial 설명을 연결 칸 기준으로 | `layout.json judge`·`map.*.node_states` |
| 11 폭 5 판 가운데 열 기둥 | 수정 — `side_rule: 2x + 1 < cols → left`, 가운데 열 = 오른쪽, 검사 J1(레벨 점 5개) | `layout.mjs`, 30-art 4-3 |
| 12 빈칸 숨 쉬기 시작 | 수정 — 마지막 연결 + 630 ms(판정 이름 총 길이) | `layout.json motion.gap_hint.start` |
| 14 결과 버튼 입력 시점 | 수정 — 1280 ms부터(`result_buttons_accept_after_ms`) | `layout.json motion.complete`, 30-art 5절·5-1 |
| 19 gap_left·판정 이름 겹침 | 수정 — 판정 이름이 오면 gap_left 숨김(`text_hide_on_judge`) | `layout.json text_slots._rule`·`gap_hint`, 30-art 4-6 |
| 20 color_slot 원본 | 수정 — palette `_rules` 1: color_slot n → pairs[n](p{n+1}) | `palette.mjs`·`palette.json` |

## lore-writer 리뷰

| # | 처리 | 위치 |
|---|---|---|
| 1 L6 가장자리 구멍 | 수정(art 몫) — 둘레 구멍 외곽선 파내기, 카드는 L6 데이터로 생성(balance 재선정 시 --write) | `hole_rule`, `tutorial.mjs` |
| 2 L2 카드 | 수정(위) — 판 전체 대신 3x3 창(4x4 전체면 360x640에서 표지 12.5 px < 16) | `card-fill.svg` |
| 3 L6 카드 | 수정(위) | `card-hole.svg` |
| 5 한 번에 이은 쌍 | 수정(G2: 표지 없음, lore (나) 안과 같음) | 30-art 5-1 |
| 6 타이틀·보호자·오류 화면 | 수정 — 4해상도 배치·text_slots·목업·넘침 검사 | `layout.json title·guardian·error`, 30-art 5-3 |
| 7 guardian_hold 자리 | 수정 — 톱니를 지도 오른쪽 아래로, 바로 왼쪽 글 자리(EN 그대로 들어감) | `layout.json map.*.text_slots.guardian_hold`, 30-art 5-2 |
| 8 결과 레벨 이름 | 수정(G7 기본안) — 보이는 글 + 레벨 바탕색 띠(지도 완료 노드 둘레와 같은 색) | `layout.json result.*.level_name` |
| 9 result_new_best 그림 | 수정 — `icon-new_best.svg` + % 오른쪽 자리 | `icons/`, `layout.json result.*.new_best` |
| 15 도움 손가락 대상 | 수정 — balance 정의("답과 다른 쌍") | `layout.json motion.help`, 30-art 8-1 |
| 16 B2 받음 | 수정 — L1 c1 받음 | 30-art 10절 B2 |
| 17 storyboard | 수정(위) | `tut-l1-demo-storyboard.svg` |
| 18 gap_left 시점 | 수정 — `text_on_breath: 3` | `motion.gap_hint` |
| 19 home/map 아이콘 | 수정 — `icon-map` 하나로 통일, home 삭제(플레이 버튼 키도 `map`) | `layout.json play.*.buttons.map`, `icons/` |
| 20 ✕·lock | 수정 — `icon-close.svg` 추가, lock 삭제 | `icons/`, `layout.json guardian.*.buttons.close` |

## 다른 역할 대기

- **orchestrator**: balance가 L6을 다시 고른 뒤 `node assets/check/tutorial.mjs --write` → `node assets/check/check-all.mjs`. — **이미 한 번 실행함**: 작업 중 balance가 L6을 첫 구멍 (1,3) 판 안쪽으로 다시 골라 검사가 "그림 ≠ 지금 레벨 데이터"로 실패했고, --write로 다시 만들어 통과. 또 바뀌면 같은 두 명령. lore가 strings를 바꾸면 `node assets/check/layout.mjs --write`도 한 번(판정 이름 폭·글 자리 재계산).
- **balance-designer** (`balance.json`): `board_side_margin_px` 12(G5) · `pct_text_min_px` 15 · `fx_ms.empty_breath_start_after_last_connect_ms` 630 · `complete.result_buttons_after_ms` 1280 · `percent.in_play_lifetime` "with_judge_name" · 판정 이름 글자 = CSS font-size 38/33/28(하한 28 그대로) · `grade_sound_keys` connect_g1~g3 · 크기 한도 키(크기 ≤ 8 %, 밝기 ≤ 20 %).
- **lore-writer** (`10-lore.md`·`strings.json`): `card_fill` 힌트 = 금빛·별 쌍이 왼쪽 위 모서리 두 칸을 돌아 이음 · `card_hole` 힌트 = "구멍 옆으로 선이 지나가고, 구멍만 빈 채 다 칠해짐"(L6이 안쪽 구멍으로 바뀌면 "구멍 둘레를 선이 돌아감"도 맞음) · ✓ → "작은 반짝임" · `gap_left` 자리 = "판 아래 글 자리"(3번째 숨 쉬기) · `node_partial` = "노드 둘레 호가 칠한 만큼" · `result_new_best` = img alt(그림 있음, 키 유지) · `levelN_name` 결과 화면 = 보이는 글(레벨 바탕색 띠, G7 기본안 — lore #8 aria 대안은 쓰지 않음) · 지도 소리 버튼 이름 = `settings_sound` · 판정 이름 크기를 적는다면 38/33/28.
