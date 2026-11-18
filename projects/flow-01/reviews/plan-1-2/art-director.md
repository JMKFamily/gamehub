# 리뷰: art-director · plan-1-2 (1-2 교차 리뷰 1차)

- 날짜: 2026-11-18 · 대상: `10-lore.md`·`strings.json`(lore), `20-balance.md`·`balance.json`·`levels/*.json`(balance) ↔ 내 `30-art.md`·`assets/`(palette·layout·sound.json, SVG)
- 따른 결정: 오케스트레이터 F1~F5(`Docs/orchestrator/2026-11-17-1-1-planning-supervision.md`). 이번에는 내 문서를 고치지 않고, 내 쪽 문제도 이슈로 올립니다(2차에서 1회 수정).
- 좌표: 레벨 JSON 칸은 `[x, y]`(x = 열 0..W−1, y = 행 0..H−1, 위가 0). L6 c1 길에 `[4,5]`가 있어 W 5·H 6 판에서 이 순서만 가능.

## 확인한 것

- 읽은 파일: 역할 정의, `harness/PIPELINE.md`·`criteria.md`·`insights.md`(tcg-01 절 포함)·템플릿, `STATUS.md`, 1-0 kickoff, 1-1 감시(F1~F5), `10-lore.md` 2~9절, `strings.json` 66키, `20-balance.md` 2·5·8-3·9·10·13·14절, `balance.json` 전체, `levels/01~10`, `30-art.md` 전체, `assets/layout.json`(param·play·map·result·motion), `assets/sound.json`(sounds·haptics·measured), `assets/tutorial/*.svg`, `assets/icons/icon-lock.svg`.
- 실행: `node assets/check/check-all.mjs` → 4종 통과(레이아웃 권장 미달 4건 = 6열/6행 칸 54.9 < 56). 레벨별 칸 px·결과 제목·판정 이름 폭을 `layout.json` + `layout.mjs`의 글 폭 추정식으로 따로 계산(scratchpad 스크립트, 레포 쓰기 없음).

### 수치 대조 (balance.json ↔ 30-art ↔ layout.json ↔ sound.json)

| 항목 | balance.json | layout/sound.json | 결과 |
|---|---|---|---|
| 연결 튐 ms / 등급별 배율 | 180 / 1.22·1.18·1.14 | `motion.connect.pop_ms` 180 / g1~g3 같음 | 같음 |
| 띠·조각 ms, 조각 수, 반경 | 300·300, 8·6·4, 1칸 | 같음 | 같음 |
| 판정 이름 튐·유지·흐려짐, 튐 배율 | 80·400·150, 1.15 | `connect.judge` 같음 | 같음 |
| 쌍 점 줄 채움 | 120 ms, 1.15 | `pair_row_ms` 120, 1.15 | 같음 |
| 잘림 / 막힘 / 되돌리기 / 처음부터 | 200 / 250·1.08 / 120 / 250 | 같음 | 같음 |
| 빈칸 숨 쉬기 | 600 ms, 2 s, 3회, 1.08, 시작 150·600 | 같음 | 같음(키 이름 하나 모호 → #10) |
| 판 완료 | 1000 ms, 1.03, 잠금 1 s | timeline t1000, 1.03 | 같음 |
| 진동 | 연결 12, 완료 30 | `haptics` 12 / 30 | 같음(완료가 연결을 대신하는 규칙은 balance에 없음 → #11) |
| 튜토리얼 손가락 | 500·250·150·260·400·250·1200·2회·3000·8 s | `motion.tutorial` 같음 | 같음(lore만 1.5 s → #15) |
| 도움 대기 | 30 s | `help.idle_ms` 30000 | 같음 |
| 판 옆 여백 | **16 px** | `param.side_margin` **12 px** | **다름 → #6** |
| % 글자 최소 | **14 px** | `param.pct_min` **15** | 다름 → #8 |
| 판정 이름 최소 | `name_text_height_min_px` 28 | `judge_font` 3단 28(글꼴 크기) | 값은 같으나 뜻 모호 → #9 |
| 쌍 수·색 슬롯 | L1~2 0~2, L3~4 0~3, L5~8 0~4, L9~10 0~5 | `palette.pairs` p1..p6 | 같음(B1 충족) |

### 레벨별 칸 px (`layout.json play.<해상도>.<판>.cell`)

| 해상도 | L1·L2 4x4 | L3~L5 5x5 | L6 5x6 | L7~L10 6x6 |
|---|---|---|---|---|
| 360x640 | 81.5 | 65.6 | 65.6 | **54.9** |
| 412x915 | 94.2 | 75.8 | 75.8 | 63.4 |
| 640x360 | 81.5 | 65.6 | **54.9** | **54.9** |
| 1280x720 | 96 | 96 | 96 | 96 |

- 40경우 모두 ≥ 48 통과. 목표 56 미달은 L6 가로(640x360)와 L7~L10 세로·가로(360x640·640x360) = 레벨-해상도 9경우, 모두 54.9(−2 %). 점 시작 판정 0.25칸 확장(balance `drag_start_extend_cells`)으로 보완하는 기존 결론 유지.

### 글 자리·지도·원본 보호

- `tut_drag`·`card_fill`·`card_hole`·`gap_left` ko·en: 4해상도 × 5판 크기 넘침 0(check-all). 가장 긴 EN "Some squares are empty" 360x640에서 한 줄.
- 결과 제목 `clear_title_1~3`·`clear_star`·`clear_last` ko·en: 4해상도 `result.title` 폭의 90 % 안(가장 긴 EN "You painted the sunset!" 640x360 약 278/307 px). 검사 도구 대상에는 아직 없음(#13에서 추가).
- 판정 이름 폭(추정): 360x640 슬롯 114 px에 가장 넓은 "최고야" 98 px. 1280x720 슬롯 163에 147. 통과.
- 지도 노드 5상태 ↔ lore 키: 잠김 `node_locked` · 다음 `node_next` · 풀다 나감 `node_partial`(+ `aria_best_fill` 형제 progressbar) · 완료 `node_done` · 별 `node_star` — **1:1 일치**. 그림 설명만 한 곳 다름(#17).
- 원본 보호: strings·balance·levels·assets(json·svg·mjs)에서 "Flow Free"·"플로우(프리)" 등 0건. 레벨 바탕 22색 상대 휘도 최소 0.795(검은 바탕 없음), SVG에 `filter`·`feGaussianBlur`·glow 0, 칸 격자선 없음(목업의 `<line>` 1개는 주석용 구분선), 선은 무광 단색. **원작 룩(검은 바탕·발광 선·격자선) 재현 없음 재확인.**

## 이슈

| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | major | art-director | **L1 시연 그림이 실제 L1 판과 다름.** 스토리보드 점: 빨강 (0,0)·(1,2), 파랑 (3,0)·(3,3), 금빛 (1,1)·(2,3), 시연 길 = 가로 3칸. 실제 L1: c1 빨강 (2,2)–(1,1), c2 파랑 (2,3)–(2,1), c3 금빛 (3,0)–(3,3), `demo_drag` (2,2)→(1,2)→(1,1)(왼쪽 1칸 뒤 위로 1칸 꺾임) | `assets/tutorial/tut-l1-demo-storyboard.svg` 점 `cx/cy`, `levels/01-level1.json` pairs·tutorial, lore 8절 7 "튜토리얼 그림 = 바로 뒤 실제 물체" | `svg.mjs`가 `levels/01-level1.json`을 읽어 점·`demo_drag`·손가락 위치를 그리게 바꿈(손 = 오른쪽 아래, 점이 x=2라 뒤집지 않음). 검사에 "스토리보드 점 = L1 pairs" 대조 추가 |
| 2 | major | art-director | **L2 빈칸 카드가 실제 L2 빈칸과 다름.** 카드 = 3x3, 빨강·파랑, 가운데 줄 빈칸 2개. 실제 L2: 맞닿은 금빛 쌍 c3 (1,0)–(1,1)을 곧게 이으면 (0,0)·(0,1)이 남음(`fill_card.empty_cells`) | `assets/tutorial/card-fill.svg`, `levels/02-level2.json` fill_card·pairs, lore 8절 7·9-3 | L2 4x4 전체를 카드에 넣으면 360x640 카드(328x219)에서 표지가 약 12.5 px로 16 px 밑으로 내려감. → **L2 왼쪽 위 3x3 잘라 보기**(x 0~2, y 0~2: 금빛 두 점, 빨강 b (2,0), 빨강 a (1,2), 파랑 b (0,2) 포함). 왼쪽 = 금빛 곧게 이음 + (0,0)·(0,1) `gapGlow`, 오른쪽 = 금빛이 (0,0)·(0,1)을 돌아 이어짐. 잘린 가장자리는 판 둘레 선 없이 흐리게 끝냄 |
| 3 | major | art-director (+ lore 문구) | **L6 구멍 카드가 실제 첫 구멍과 다름.** 카드 = 3x3 가운데 구멍. 실제 L6 `hole_card.first_hole` = (4,0) **오른쪽 위 모서리**, 둘째 구멍 (0,3) 왼쪽 가장자리. 모서리 구멍은 선이 "둘레를 돌아갈" 수 없음 | `assets/tutorial/card-hole.svg`, `levels/06-level6.json` holes, lore 9-3 `card_hole` 그림 힌트 "구멍 둘레를 선이 돌아가고" | 카드 = **L6 오른쪽 위 3x3 잘라 보기**(x 2~4, y 0~2): 구멍 (4,0), 초록 c4 a (3,0), 보라 c5 b (4,1), 파랑 c2 b (3,2), 빨강 c1 a (4,2). 오른쪽 그림 = 초록이 구멍 옆을 지나 왼쪽으로, 보라가 구멍 아래 줄을 따라 옴 → 구멍만 빈 채 칠해짐. lore 9-3 그림 힌트를 "구멍 옆으로 선이 지나가고, 구멍만 남은 채 판이 다 칠해짐"으로 |
| 4 | major | art-director (+ game-developer 1-3 참고) | **판 둘레에 붙은 구멍 그리기 규칙 없음.** L6 (4,0) 모서리·(0,3) 가장자리, L8 (0,0) 모서리. 30-art 3절·D2는 "판 카드에서 even-odd로 도려냄"만 있어, 둘레 구멍이면 판 여백 0.06칸(54.9 px 칸에서 3.3 px) 띠가 구멍 바깥에 남아 끊긴 테두리처럼 보임. 내 B3("둘레에 붙지 않게 권장")는 balance가 받지 않았고, 레벨을 다시 고르는 비용이 더 큼 | `levels/06·08` holes, `30-art.md` 3절 구멍 칸 줄·10절 B3·D2, `layout.json param.board_pad_of_cell` 0.06 | 레벨은 그대로 두고 **art가 그리기 규칙을 고침**: 구멍이 둘레 줄·열에 닿으면 그 칸을 판 카드 외곽선에서 **오목하게 파냄**(판 여백까지 함께 빼서 바탕이 판 밖과 이어지게, 안쪽 모서리 반경 = 타일 반경 0.22칸, `boardEdge`가 파낸 선을 따라감). 판 안 구멍은 지금처럼 도려냄 + 둘레 선. `layout.json`에 `hole_rule` 추가, 목업에 L6 판 1장 추가. balance는 B3 철회로 처리(작업 없음) |
| 5 | major | art-director (+ balance 확인) | **결과 화면에 "한 번에 이은 쌍" 표시 자리가 없음.** balance 5절·`combo.result_max_combo` = `replaced_by_star_and_one_shot_dots`(별 + 점 줄 위 반짝 표지). `layout.json result`에는 mini_board·title·star·pct·buttons뿐 | `balance.json` combo, `20-balance.md` 5절 결과 % 줄, `layout.json result.*` 키 | 별과 % 사이에 **쌍 점 줄 한 줄**(플레이 화면 쌍 점 줄과 같은 그림, 36k px). 모든 점은 채운 상태로 두고, 한 번에 이은 쌍만 바깥에 작은 반짝 고리(이동 수 1 = 1단). 비어 있는 점·점선은 쓰지 않음(실망 방지, 5-1 빈 별 규칙과 같은 이유). 대체 글은 lore와 맞춤(아래 "다른 역할에게") |
| 6 | major | balance-designer | **판 옆 여백 값이 두 곳에서 다름.** balance.json `board_side_margin_px` 16·2-1 식 "폭 − 32", layout `param.side_margin` 12. 그래서 balance는 6열 54.7 px, art는 54.9 px로 적음(K3) | `balance.json` board, `20-balance.md` 2-1·K3, `layout.json param`, `30-art.md` 4-1 | 배치 원본은 `layout.json` 하나로: balance.json은 `board_side_margin_px`를 지우거나 12로 맞추고 `_note`에 "칸 px 원본 = layout.json play.*.cell" 표기. 2-1·K3 수치를 54.9로 |
| 7 | minor | balance-designer | balance 13절 ⑤ 요청(예약 높이·기둥 폭 확정) 회신: 가정 200 px와 실제가 다름. 360x640 6x6 실제 = 판 위 178 px(HUD 64 + 판정 띠 63 + 틈) + 판 아래 126 px = **304 px**, 640x360 = 양옆 기둥 **152 + 152 px**. 그래도 위 표처럼 모든 칸 ≥ 48 | `layout.json play.*.board`, `balance.json board.portrait_reserved_height_px`·`landscape_side_columns_px` | V1을 가정식 대신 `layout.json play.<해상도>.<W>x<H>.cell`을 읽어 재게(위 표 그대로 나와야 함). 200 px 두 키는 지우거나 `_assumption`으로 표시 |
| 8 | minor | balance-designer | 판 채움 % 최소 글자: balance `pct_text_min_px` 14, layout `pct_min` 15 | `balance.json judge`, `layout.json param` | 15로 맞춤(그리는 쪽 원본이 layout). 0.55배 규칙은 같음 |
| 9 | minor | balance-designer | `name_text_height_min_px` 28은 "글자 높이"로 읽힘. art 28은 **글꼴 크기**(한글 글자 높이는 약 0.8배 ≈ 22 px). qa가 렌더 높이로 재면 실패로 나옴 | `balance.json judge`, `layout.json param.judge_font` | 키를 `name_font_px_min`으로 바꾸거나 `_note`에 "CSS font-size" 명시 |
| 10 | minor | balance-designer | `empty_breath_max_scale_frac` 0.2와 `empty_breath_scale` 1.08이 함께 있어 크기 한도가 20 %인지 8 %인지 모호. art 뜻 = 크기 ≤ 8 %, **밝기** 변화 ≤ 20 % | `balance.json fx_ms`, `layout.json motion.gap_hint._rule`, `20-balance.md` 9절 "변화 ≤ 20 %" | 키를 `empty_breath_max_brightness_frac`으로 |
| 11 | minor | balance-designer | 마지막 연결은 연결 진동(12 ms) 대신 완료 진동(30 ms) 하나만 +150 ms에 — sound.json에만 있고 balance.json `haptics_ms`에는 없음 | `sound.json haptics.complete._rule`, `30-art.md` 6절, `balance.json haptics_ms` | `haptics_ms`에 `complete_replaces_last_connect: true`, `complete_delay_ms: 150` 추가(또는 `_note`로 sound.json 참조) |
| 12 | minor | art-director | 지도 제목: lore는 `map_screen`을 **aria 전용**("화면 제목 글은 두지 않음"), art layout은 20 px 보이는 제목 | `10-lore.md` 9-2 `map_screen`, `layout.json map.*.title`, `30-art.md` 5-2 | lore 안 따름(글 줄이기, 5~6세). 보이는 제목을 빼고 별 10칸 줄을 위로. `map_screen`은 목록 `aria-label`로만 |
| 13 | minor | art-director | 결과 화면 글 자리 빈칸: lore는 ① 레벨 이름을 "결과 화면 맨 위 작은 글"로 ② `result_new_best`를 "작은 표지 img"로 쓰는데, layout.result에는 둘 다 자리·그림이 없음. 결과 제목·레벨 이름은 글 폭 검사 대상도 아님 | `10-lore.md` 9-2 level 이름 줄·9-5 `result_new_best`, `layout.json result`, `layout.mjs` 검사 대상 | ① 제목 위 `level_name` 자리(inkSoft, 16k px) ② `icon-new_best.svg`(위로 향한 둥근 꺾쇠 + 작은 칠한 칸, 글 없음)를 % 오른쪽에 ③ `clear_*`·`levelN_name` ko·en을 layout 검사에 넣음(지금 추정으로는 모두 들어감) |
| 14 | minor | lore-writer | 카드 그림 힌트에 "체크 표시"(`card_fill` "→ 체크 표시", `card_hole` "판 완료 체크"). art는 ✓를 쓰지 않음(원작 레벨 목록 표지와 겹침, 30-art L5) | `10-lore.md` 9-3, `30-art.md` 10절 L5·8-2 | "작은 반짝임(실제 완료와 같은 색 조각)"으로 |
| 15 | minor | lore-writer | `tut_drag` 그림 힌트 "1.5 s 쉬고 반복" ↔ balance·layout 1.2 s(`finger_loop_gap_ms` 1200) | `10-lore.md` 9-3, `balance.json tutorial`, `layout.json motion.tutorial` | "1.2 s"로 고치거나 숫자를 빼고 "balance.json tutorial" 참조 |
| 16 | minor | art-director · lore-writer | `gap_left` 보조 글 시점·자리: lore = **3번째 숨 쉬기 때만**, "빈칸 가까이" / art = 마지막 판정 표시가 끝난 뒤 `board_text`(판 아래 고정) | `10-lore.md` 6-3·9-4, `30-art.md` 4-6, `layout.json motion.gap_hint`·`text_slots` | 시점은 lore 안(3번째만, 글 줄이기)으로 art가 고침. 자리는 `board_text` 유지(판 안 빈칸 옆에 쓰면 점·선을 가림, F5와 같은 이유) → lore는 "빈칸 가까이"를 "판 아래 글 자리"로 |
| 17 | minor | lore-writer | `node_partial` 그림 설명 "노드에 옅은 채움" ↔ art "테두리 바깥 호가 칠한 칸 비율만큼" | `10-lore.md` 9-2, `layout.json map.*.node_states.partial`, `icons/node-partial.svg` | lore 설명을 "노드 둘레 호가 칠한 만큼 늘어남"으로 |
| 18 | minor | lore-writer | 안건 A3 미반영: lore 7절 L9 힌트가 아직 "판 둘레 6색 작은 점 줄". art = 쌍 점 줄과 헷갈려 옅은 호 3개 | `10-lore.md` 7절 L9, `30-art.md` 2-3·A3 | "옅은 호 3개(쌍 점 줄과 헷갈리지 않게 점 모양 안 씀)"로 |
| 19 | minor | lore-writer | L1 힌트 "따뜻한 3색"이지만 쌍 색은 순서 고정(p1 빨강·p2 파랑·p3 금빛, 색약 안전 순서) — 파랑은 따뜻한 색이 아님 | `10-lore.md` 7절 L1, `levels/01` color_slot 0~2, `30-art.md` 2-1·B1 | "빨강·파랑·금빛 3색(10레벨 같은 순서)"으로. 따뜻함은 바탕 그라디언트가 맡음 |
| 20 | minor | lore-writer | 안건 A1 마무리: lore 6-1 "자리: 연결된 짝 점 위쪽 … 판 가장자리면 안쪽으로"가 F5(판 밖)와 반대. 9-4 `judge_1_name` "짝 점 위 큰 글자"도 같음 | `10-lore.md` 6-1 마지막 줄·9-4, F5 | "판 밖: 세로 = 판 바로 위 띠, 짝 점과 같은 x / 가로 = 가까운 기둥, 같은 y"로 |
| 21 | major | art-director | **판정 1·2·3단 소리 구분이 약함.** 렌더 측정: 최고값 1단 = 2단(−6.9~−7.0), RMS 1단 −17.74 / 2단 −18.52 / 3단 −18.94 → 1↔2단 0.78 dB, **2↔3단 0.42 dB**. 크기 차가 들을 수 있는 최소 차(약 1 dB) 밑이라, 등급 구분은 위 층(옥타브·35 ms 뒤 5도) 음색 차 하나에만 기댐. 글을 못 읽는 아이에게 소리는 크기·튐과 함께 3대 등급 단서(lore 6-1) | `sound.json sounds.connect_g1~g3`·`measured.values`, `30-art.md` 7절·A4 | **등급 = 음 개수**로 바꿈(크기보다 아이가 더 잘 셈): 1단 = 사다리 음 → +5도(45 ms) → +옥타브(90 ms) 3음 올림, 2단 = 사다리 음 → +옥타브(45 ms) 2음, 3단 = 사다리 음 1개. 크기도 계단: 최고값 목표 −6.5 / −7.5 / −9.0 dBFS, RMS 차 각 ≥ 1.5 dB. S1(3단 −9.0 vs 다음 큰 소리 `star` −12.5 → 3.5 dB ≥ 1)·S4(최악 겹침 약 −5.7 ≤ −1) 다시 확인. `sound-check.mjs`에 **S7: 등급 사이 RMS 차 ≥ 1.5 dB, 첫 소리 개수 3/2/1** 추가. 길이 합은 그대로 ≤ 450 ms라 다음 연결과 안 겹침 |
| 22 | minor | art-director | 판정 이름 글자 크기 34/31/28은 단계마다 약 10 %이고 한 번에 하나만 떠서 비교가 안 됨. 게다가 글 폭은 거꾸로: ko 3단 "해냈어" 81 px > 2단 "멋져" 60 px, en 2단 "Nice" 73 px > 1단 "Wow!" 71 px | `layout.json param.judge_font`, 위 폭 계산, lore 6-1 "글자 크기(1단 가장 큼)" | 크기 단계를 **38/33/28**로 벌림(3단 하한 28 유지, 360x640 슬롯은 가장 넓은 이름 + 16으로 자동 계산 → 약 125 px, 판정 띠 안에 들어감). 30-art 4-3에 "주 단서 = 튐·조각·음 개수, 글자 크기는 보조"로 순서를 바로 적음 |
| 23 | minor | art-director · balance-designer | F4 판 채움 %가 **언제까지 보이는지** 정의 없음(판정 이름과 함께 630 ms 뒤 사라지는지, 계속 남는지). 30-art 1-1 표 "플레이 중 숫자 없음(쌍 점 줄만)"도 F4 이후 맞지 않음 | `balance.json percent`·`judge`, `30-art.md` 1-1 표·4-3 | art 안: **이름과 함께 나타나고 함께 흐려짐**(플레이 화면에 늘 떠 있는 숫자 없음, 겁주지 않음). balance.json `percent.in_play_lifetime: "with_judge_name"` 추가, 30-art 1-1 표 고침 |
| 24 | minor | art-director | `icons/icon-lock.svg`(자물쇠)가 에셋에 있는데 30-art 5-2는 "자물쇠 그림 없음(겁주지 않기)", 쓰는 곳도 없음 | `assets/icons/icon-lock.svg`, `30-art.md` 5-2·11절 | 지우거나 보호자 화면 전용으로 쓸 곳을 적음. art 안: 지움 |

- 확인했지만 이슈로 올리지 않은 것: L1 `demo_pair` c1 길이 3칸·꺾임 1번 — 내 B2 권장 "4~6칸"보다 짧지만 balance 10-1 "가장 짧은 답 길" 규칙이 아이에게 더 쉬움 → **받아들임**(손가락 이동 2칸 × 260 ms = 520 ms). 손은 오른쪽 아래로 뻗고 길은 왼쪽 위로 가서 앞길을 가리지 않음.

## 다른 역할에게 (2차 수정 요청 요약)

- **balance-designer**: #6 여백 12 px로 통일(원본 layout.json), #7 V1을 layout.json `cell`로 재측정, #8~#11 키 이름·값 정리, #23 `percent.in_play_lifetime`. #5 결과 "한 번에 이은 쌍" 그림안(모든 점 채움 + 1단 쌍만 반짝 고리)에 동의 여부. 레벨 데이터는 바꿀 필요 없음(#4는 art가 그리기 규칙으로 해결, B3 철회).
- **lore-writer**: #3 `card_hole` 그림 힌트, #14 체크 → 반짝임, #15 1.2 s, #16 `gap_left` 자리 표현, #17 `node_partial` 그림 설명, #18 L9, #19 L1 색, #20 6-1 판정 자리(F5). #5 결과 쌍 점 줄 대체 글이 필요하면 키 하나(예: `aria_one_go_pairs` "한 번에 이은 색 수", meter·숫자만) — 키를 늘리지 않으려면 `result_accuracy`로 대신한다고 적어 주세요.
- **art-director(나, 2차)**: #1~#5, #12, #13, #16(시점), #21~#24.

## 잘 된 점

- 연출 ms·튐 배율·조각 수·진동·튜토리얼 시간 20여 개 값이 balance.json과 layout/sound.json에서 판 옆 여백 하나 말고 모두 같음. 키 이름 `judge_1~3_name` ↔ `grade_keys` perfect/good/pass ↔ layout `g1~g3`, `card_fill`/`card_hole` ↔ `fill_card`/`hole_card`, `levelN_name` ↔ `name_key`가 서로 맞음.
- 레벨 판 크기 4x4·5x5·5x6·6x6이 art 검사 범위 안이고, 40경우 모두 칸 ≥ 48.
- lore 문구가 모두 글 자리에 들어가고, 지도 노드 5상태 ↔ 상태 키가 1:1.
- 세 문서 모두 원작 이름·룩 흔적 없음.

## 점수

- 영역: 기획 교차 리뷰(채점 라운드 아님)
- 체크 항목 통과: 해당 없음
- 점수: 해당 없음 — blocker 0, major 7(내 담당 5: 튜토리얼 그림 3장·둘레 구멍 규칙·결과 한 번에 이은 쌍 / 소리 등급 1, balance 1)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목: "판정 등급을 소리로 구분하면 등급 사이 렌더 RMS 차 ≥ 1.5 dB 또는 첫 소리 개수가 다름(크기 차 1 dB 미만이면 구분 단서로 치지 않음)"

VERDICT: REVISE
