# 리뷰: balance-designer · plan 1-2 교차 리뷰 1차

- 날짜: 2026-11-18 · 프로젝트 flow-01 (Pairpaint / 짝꿍색칠)
- 대상: lore(`10-lore.md`, `strings.json`)·art(`30-art.md`, `assets/`)를 밸런스 데이터(`20-balance.md`, `balance.json`, `levels/*.json`, `tools/core/board.mjs`)와 대조
- 따른 결정: 오케스트레이터 F1~F5(`Docs/orchestrator/2026-11-17-1-1-planning-supervision.md`). 이번 차례에는 내 문서를 고치지 않았습니다. 내 문서에서 찾은 문제는 담당을 balance-designer로 적었고 2차에서 고칩니다.

## 확인한 것
- 읽은 파일: 역할 정의, `harness/PIPELINE.md`·`criteria.md`·`insights.md`(tcg-01 절 포함)·templates, STATUS, 1-0 착수·1-1 감시 기록, `10-lore.md` 전체, `strings.json`, `30-art.md` 전체, `assets/palette.json`·`layout.json`(play 4해상도 × 5판 크기, motion)·`sound.json`, `assets/tutorial/*.svg` 3개(좌표를 뽑아서 확인), `levels/01~10`, `balance.json`, `tools/core/board.mjs`(fillPct·displayLayer).
- 계산한 것(node):
  - **칸 px**: layout.json의 칸 크기를 balance V1 식(여백 16, 예약 200)과 20경우 모두 비교했습니다. 결과는 이슈 16 표에 있습니다.
  - 그림 카드·시연 SVG 좌표를 칸 번호로 바꿔 L1 `demo_drag`, L2 `fill_card`, L6 `first_hole`과 비교했습니다.
  - 연출 시간을 판정·잠금 시간과 맞춰 봤습니다. 판정 이름 80+400+150 = 630 ms, 판 완료 시간표(6쌍), 결과 카드가 올라오는 시간을 계산했습니다.
- 일치를 확인한 것(문제 없음):
  - 레벨 이름 10개는 strings `levelN_name`과 palette `themes.levelNN.lore`가 10/10 같습니다.
  - 판 크기·쌍 수·새 요소가 lore 7절 테마와 맞습니다. L2 빈칸, L4 꺾임, L5·L9 색 추가, L6·L8 구멍, L7 6x6.
  - lore 등급 경계(1 / 2 / 3번 이상)가 balance `grade_max_color_moves` [1,2]와 같습니다.
  - 연결 튐 1.22/1.18/1.14, 조각 8/6/4, 튐 180·띠 300·조각 300 ms, 판정 이름 80/400/150 ms, 쌍 점 줄 120 ms·1.15배가 서로 같습니다.
  - 잘림 200, 막힘 250·1.08, 되돌리기 120, 처음부터 250, 판 완료 1000 ms·1.03배가 서로 같습니다.
  - 진동 12/30 ms와 튜토리얼 시간(250/150/260/400/250/1200, 2회, 3000, 8 s)이 서로 같습니다.
  - 칸 진행 히스테리시스(layout px `step_hysteresis` = 0.2칸)와 점 시작 확장(`start_hit_extra` = 0.25칸)이 balance와 같습니다.
  - 판 완료 시간표가 1.0 s 잠금 안에 끝납니다. 6쌍 띠 마지막이 150 + 5·80 + 300 = 850 ms, 조각 420 + 500 = 920 ms, 판 튐 680 ms.
  - 연결음 사다리 6음 = 최대 쌍 수 6.
  - `color_slot`은 10레벨 모두 쌍 순서 그대로입니다. L1~2는 0~2, L3~4는 0~3, L5~8은 0~4, L9~10은 0~5. art B1(쌍 i → pairs[i])·palette `_rules`(p1..pk)와 같습니다.
  - 원본 보호 grep(flow free·플로우·flow 낱말)은 lore·art·strings·assets·levels에서 금지어 목록 정의 말고 0건입니다.

## 이슈

| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | major | art-director | **L2 빈칸 카드 그림이 실제 L2 판과 다릅니다.** 카드는 3x3 판에 빨강(p1) 점 (0,1)–(2,2)과 파랑 쌍이 있고, 빈칸은 가운데 줄 (1,1)·(2,1)입니다. 실제 L2에서는 **맞닿은 두 점**인 c3 `color_slot` 2 = p3 금빛·별 [1,0]–[1,1]을 곧게 이으면 **왼쪽 위 모서리 칸 [0,0]·[0,1]**이 남습니다. 카드가 가르치는 함정 모양(떨어진 두 점)이 L2의 함정 모양(맞닿은 두 점, 지름길 자리)과 다릅니다. | `assets/tutorial/card-fill.svg`(칸 간격 72, 원점 13.9로 칸 번호 계산), `levels/02-level2.json` `fill_card.empty_cells` [[0,0],[0,1]]·pairs c3, 20-balance 8-3, lore 8절 7 "card_fill 빈칸 = L2 실제 빈칸 자리" | 카드를 L2 왼쪽 위 2x3 또는 3x3 부분으로 다시 그립니다. 금빛 별 점 두 개를 위 가장자리에 붙여 놓고, 왼쪽은 곧게 이어 모서리 두 칸이 숨 쉬는 그림, 오른쪽은 금빛 선이 [0,0]→[0,1]로 돌아 이어져 다 칠해진 그림입니다. 색과 표지는 p3로 합니다. |
| 2 | major | art-director | **L6 구멍 카드의 구멍 자리가 실제 첫 구멍과 다릅니다.** 카드는 3x3의 가운데 칸 (1,1)이 구멍입니다. 실제 `first_hole`은 [4,0]으로 5x6 판의 **오른쪽 위 모서리**이고, 그 옆에 c4 점 [3,0](p4 초록·세모)과 c5 점 [4,1](p5 보라·초승달)이 맞닿아 있습니다. art 8-3이 "1-2에서 다시 그림"이라고 적은 항목이 아직 남아 있습니다. | `assets/tutorial/card-hole.svg`(구멍 사각형 83.8,123.8 = 칸 (1,1)), `levels/06-level6.json` `hole_card.first_hole` [4,0]·holes [[4,0],[0,3]], 30-art 8-3, lore 8절 7 | 카드를 오른쪽 위 모서리 구멍 + p4·p5 점(실제 색·표지)으로 다시 그립니다. 모서리 구멍은 판 카드의 둥근 모서리를 도려내는 모양이 되므로 even-odd 윤곽 그림 규칙(D2)도 모서리 경우로 적어 주세요. |
| 3 | minor | balance-designer | L6 구멍 2개가 모두 판 둘레에 있습니다([4,0] 모서리, [0,3] 왼쪽 가장자리). L8도 [0,0] 모서리가 구멍입니다. art B3은 둘레에 붙지 않은 구멍을 권했고, lore 테마 "징검다리 연못"(돌 사이 물)과도 덜 맞습니다. | levels/06·08 `holes`, 30-art 10절 B3 | 2차에서 L6 후보 가운데 안쪽 구멍 판으로 m̃ 목표(10.64 ±12 %)·몰림 ≤ 30 %·단조를 지키는 판이 있는지 다시 고릅니다. 없으면 지금 판을 유지하고 art가 모서리 구멍을 그립니다(B3 "둘레에 붙어도 그릴 수는 있음"). 결과는 2차 보고서에 적습니다. |
| 4 | major | art-director | **L1 시연 그림 순서(storyboard)가 L1 판이 아닙니다.** 그림에는 빨강 (0,0)–(1,2), 파랑 (3,0)–(3,3), 금빛 (1,1)–(2,3)이 있고, 손가락은 (0,0)에서 6칸을 그립니다. 실제 L1은 빨강 c1 [2,2]–[1,1], 파랑 [2,3]–[2,1], 금빛 [3,0]–[3,3]이고, 시연은 `demo_drag` [2,2]→[1,2]→[1,1](3칸, 꺾임 1)입니다. art B2(시연 쌍 4~6칸·꺾임 1~2)를 만족하는 쌍은 L1에 없습니다(c1 3칸·꺾임 1, c2 9칸·꺾임 3, c3 4칸·꺾임 0이고 맨 오른쪽 열이라 손을 뒤집어야 함). | `assets/tutorial/tut-l1-demo-storyboard.svg`(칸 간격 52), `levels/01-level1.json` `tutorial.demo_drag`, lore 8절 7·9-3 "L1 실제 첫 쌍", 30-art 8-1 | storyboard를 L1 데이터 그대로 다시 그립니다. balance는 c1을 유지합니다. 근거는 lore가 요구한 "첫 쌍", 답 = 가장 짧은 길, 손이 오른쪽 아래로 뻗어 앞길([1,2]→[1,1], 왼쪽·위)을 가리지 않음입니다. 손은 [3,3]·[2,3] 점을 가리지만 시연에는 영향이 없습니다. B2 권장 범위를 "L1 데이터 우선"으로 바꿔 주세요. |
| 5 | major | art-director, lore-writer | **결과 화면의 "한 번에 이은 쌍" 표시가 art·lore에 없습니다.** balance 5절 수정 1(최고 콤보 대신 쌍 점 줄 위에 반짝 표지)은 오케스트레이터 요청자 보고 요지에도 있고, 판정 모듈도 `displayLayer.oneShotPairs`를 냅니다. 그런데 art 5-1 결과 화면은 미니 판 + 별 + %뿐이고, lore에는 대체 글 키가 없습니다. | 20-balance 0-2·5절, `tools/core/board.mjs` displayLayer, 30-art 5-1·`layout.json result`, lore 9-5, 1-1 감시 기록 "요청자 보고 요지" | art는 결과 화면에 쌍 점 줄(쌍 색·표지)을 놓고 한 번에 이은 쌍에만 반짝 표지를 붙입니다(layout result에 자리 추가). lore는 meter 키를 하나 더합니다. 예: `result_one_go_pairs` "한 번에 이은 색", valuetext 숫자만. 넣지 않기로 하면 오케스트레이터 결정으로 balance 0-2·5절과 보고 요지에서 뺍니다. |
| 6 | major | lore-writer, balance-designer | **보호자 설명의 결과 % 뜻이 계산식과 다릅니다.** EN "how many colors were joined in one go"는 "한 번에 이은 쌍 / 쌍 수"로 읽히지만 실제 식은 ⌊100·쌍 수/이동 수⌋입니다. 예: 5쌍 중 한 색만 6번 만에 이으면 이동 10 → **50 %**인데, 설명대로면 4/5 = **80 %**입니다. | `strings.json` guardian_intro EN, `balance.json percent.accuracy_pct_formula`, 20-balance 4절 | 둘 중 하나로 맞춥니다. (가) balance가 결과 %를 "한 번에 이은 쌍 / 쌍 수"로 바꿉니다. 100 % ⇔ 별 ⇔ 모두 1단은 그대로이고, 이슈 5의 반짝 표지 수와 숫자가 같아 보호자 설명도 쉬워집니다. (나) 식을 두고 lore가 EN·KR 설명을 "다시 그은 횟수가 적을수록 높음"으로 고칩니다. balance 의견은 (가)입니다. 2차에서 C2를 다시 돌리고 결과를 알리겠습니다. 오케스트레이터가 정해 주세요. |
| 7 | major | balance-designer, art-director | **판 채움 %(F4)가 화면의 "칠한 칸"과 다른 것을 셉니다.** `coveredCells`는 이어지지 않은 선과 끄는 중인 선의 칸까지 셉니다. art는 연결된 쌍의 칸만 tint로 칠하고, % 앞에 "칠한 칸" 그림(`icon-filled.svg`)을 붙입니다. 그래서 칠해진 칸은 40 %인데 숫자는 80 %로 보일 수 있습니다. 지도 `aria_best_fill` "칠한 만큼"도 같은 값을 쓰게 됩니다. | `tools/core/board.mjs` coveredCells·fillPct, palette `_rules` 2("연결 전 선 밑 칸은 tile 그대로"), 30-art 4-3, lore 9-2 aria_best_fill | balance가 판 채움 %를 **연결된 쌍이 지나는 칸 / 판 칸**으로 바꿉니다(CORE_VERSION을 올리고 C1·C2를 다시 확인). tint와 숫자가 늘 같게 됩니다. art는 그림을 그대로 두고, lore는 node_partial 뜻을 "연결된 칸 기준"으로 적어 주세요. |
| 8 | major | balance-designer | **등급 이름이 역할마다 달라 서로 이어 주는 표가 없습니다.** balance는 `grade_keys` perfect/good/pass, lore는 `judge_1/2/3_name`, art는 `connect_g1/g2/g3`·`pop_scale.g1..g3`·`judge_font[0..2]`를 씁니다. lore 12-1이 "balance.json에 키 이름으로 연결"을 요청했지만 아직 없습니다. | `balance.json judge`, strings judge_*, `sound.json sounds.connect_g*`, `layout.json motion.connect.pop_scale` | balance.json `judge`에 `grade_name_keys` ["judge_1_name","judge_2_name","judge_3_name"], `grade_sound_keys` ["connect_g1","connect_g2","connect_g3"]를 넣고, 등급 번호 1~3 = 배열 위치 0~2 규칙을 한 줄 적습니다(2차). |
| 9 | minor | balance-designer | 레벨 JSON 카드에 strings 키와 그림 파일 이름이 없습니다(`fill_card`·`hole_card`·`tutorial`). lore 9-3은 "카드 id는 키 이름 그대로 balance·levels에" 쓰자고 했습니다. | levels/01·02·06, lore 9-3·12-2 | `fill_card.card_key` "card_fill"·`svg` "tutorial/card-fill.svg", `hole_card.card_key` "card_hole", `tutorial.text_key` "tut_drag"를 넣습니다(2차). |
| 10 | major | lore-writer | **F4·F5 결정이 lore에 반영되지 않았습니다.** 6-1 자리는 "짝 점 위쪽, 판 가장자리면 안쪽", 9-4 `judge_1_name`은 "짝 점 위 큰 글자", 12 art-1은 "짝 점 위쪽(안쪽)"입니다. F5는 판 밖입니다(세로 판 위 띠·같은 x, 가로 기둥·같은 y). 6-4 플레이 중 %도 "표시하지 않음"인데 F4는 판 채움 %를 표시합니다. | 10-lore 6-1·6-4·9-4·9-8·12, 1-1 감시 F4·F5, `balance.json judge.name_anchor` | lore 해당 줄을 F4·F5대로 고칩니다. 같은 낡은 문장이 balance에도 있습니다(20-balance 0-2 "짝 점 위", 1-2 표 "짝 점 위, 판 안쪽으로", 1-2 표 튐 "1.2/1.15/1.1배"). 이것은 2차에서 balance가 고칩니다. |
| 11 | minor | art-director | 가로 화면 판정 기둥을 고르는 규칙("짝 점이 판 왼쪽 반이면 왼쪽")은 **폭 5 판의 가운데 열 x = 2**에서 정해지지 않습니다. 실제로 짝 점이 x = 2에 있는 경우: L3 c2 a[2,4]·c4 b[2,2], L4 c3 a[2,0], L5 c2 b[2,4], L6 c3 b[2,4]. | 30-art 4-3, layout `judge.rule` landscape_pillar, levels/03~06 pairs | 가운데 열 규칙을 하나 정해 layout.mjs에 넣습니다(예: 가운데 열 → 오른쪽 기둥, 또는 직전 판정 기둥 유지). qa가 L3~L6 가운데 열 연결로 확인합니다. |
| 12 | minor | balance-designer, art-director | 빈칸 숨 쉬기 시작 "마지막 연결 + 600 ms"가 판정 이름 표시 끝(80 + 400 + 150 = **630 ms**)보다 30 ms 이릅니다. layout은 "판정 표시가 끝난 뒤에 나와 같은 자리를 다투지 않음"이라고 적었습니다. | `balance.json fx_ms.empty_breath_start_after_last_connect_ms` 600, layout `motion.gap_hint.start`, `judge.name_*` | 두 파일 모두 630 ms로 하거나, "판정 이름 총 길이 이후"라는 식으로 적습니다(2차에서 balance가 고치고 art가 따름). |
| 13 | minor | balance-designer | 마지막 연결의 이름 흐려짐(완료 t150부터 150 ms)과 "마지막 연결이면 연결 진동 대신 완료 진동 하나(t + 150 ms)"는 layout·sound.json에만 있고 balance.json에는 없습니다. 같은 사건의 시간이 두 곳에 나뉘어 있습니다. | layout `motion.complete.timeline_ms` t150, `sound.json haptics.complete._rule`, `balance.json judge`·`haptics_ms` | balance.json에 `judge.name_fade_on_complete_start_ms` 150, `haptics_ms.complete_delay_ms` 150, `complete_replaces_connect` true를 더합니다. 값은 art와 같게 합니다(2차). |
| 14 | minor | art-director, balance-designer | 입력 잠금 끝을 정하는 말이 다릅니다. balance는 "1.0 s 잠금 뒤 결과", layout은 "결과 화면이 뜰 때까지 판 입력 무시"이고 결과 카드는 1000~1280 ms에 올라옵니다. 아이가 계속 두드리면 1.0~1.28 s 사이에 올라오는 ▶·↻를 누를 수 있습니다. | `balance.json complete`, layout `motion.complete` t1000 (280 ms), `motion.result` | 결과 버튼이 입력을 받는 시점을 하나로 정합니다. 제안: 카드가 다 올라온 1280 ms부터, 그 전 누름은 무시합니다. art가 layout에 적고, balance가 `complete.result_buttons_after_ms`로 같은 값을 둡니다. |
| 15 | minor | balance-designer | 판정 % 글자 크기가 서로 다릅니다. balance는 0.55배·최소 14 px, layout은 `pct_min` 15·`pct_px` 19 고정(1단 34 × 0.55)이고, 3단 28 px 아래에서도 19 px입니다. | `balance.json judge.pct_text_*`, `layout.json param.pct_min`·`play.*.judge.pct_px` | balance를 layout 값(19 px 고정, 최소 15)에 맞춥니다. 크기의 원본은 layout으로 하고, balance는 "% < 이름"이라는 조건만 둡니다(2차). |
| 16 | minor | balance-designer | **V1 예약 200 px 가정은 실제 배치와 다르지만 결론은 같습니다.** 실제 판 밖 공간은 세로 위+아래 238~590 px, 가로 양옆 296~359 px로 모두 200보다 큽니다. 그런데 세로는 폭이, 가로는 높이가 칸 크기를 정하기 때문에 예약 크기가 결과를 바꾸지 않습니다. 칸 px 차이는 art 여백 12 + 판 패딩 0.06칸과 balance 여백 16의 차이에서 오는 ±0.5 px뿐입니다. 아래 표 참고. | `assets/layout.json play.*`, `balance.json board`, 20-balance 2-1·8-2 | V1이 200 가정 대신 layout.json `play.<해상도>.<판>.cell`을 직접 읽게 바꿉니다. 20-balance 8-2·K3의 54.7을 54.9로 고치고, `cell_max` 96을 적습니다(2차). |
| 17 | minor | lore-writer | `tut_drag` 그림 설명의 시간과 끝나는 조건이 데이터와 다릅니다. lore는 "시연 1회 → 1.5 s 쉬고 반복", "연결되면 시연과 글이 사라짐"입니다. 데이터는 1.2 s 쉬고, 2회 뒤 3 s 쉬고, 손가락은 **아이 손이 처음 판에 닿을 때** 사라지며, 글은 첫 연결 때 사라집니다. | lore 9-3, `balance.json tutorial`, layout `motion.tutorial`·`text_slots` | lore 9-3 설명을 데이터 기준으로 고칩니다(숫자는 balance 참조로). |
| 18 | minor | lore-writer | 7절 테마 표의 몇 곳이 확정 데이터와 다릅니다. ① L1 "따뜻한 3색"인데 실제는 p1 빨강·p2 파랑·p3 금빛이고, 파랑은 색약 안전 순서 때문에 바꿀 수 없습니다. ② L6 "5x5 또는 5x6" → 5x6 확정. ③ L9 "6색 작은 점 줄" → art A3 옅은 호 3개. ④ 9-3 카드 힌트의 "체크 표시"는 art가 ✓를 쓰지 않습니다(art L5). | lore 7절·9-3, palette pairs, levels/06, 30-art 2-3·10절 L4·L5 | lore 표를 확정 데이터에 맞춥니다. L1 힌트는 "또렷한 3색"으로 바꿉니다. |
| 19 | minor | art-director | 360x640 5x6(L6)에서는 `board_text`가 판정 띠를 같이 씁니다. 아이가 빈칸 신호를 본 뒤 선을 잘라 다시 이으면, 3번째 숨 쉬기의 `gap_left` 글과 새 판정 이름이 같은 자리에서 겹칠 수 있습니다. 시간으로 나누는 규칙에 우선순위가 없습니다. | 30-art 4-6, layout `text_slots`, lore 9-4 gap_left | "판정 이름이 오면 gap_left 글은 그 프레임에 숨김"을 layout `_rule`에 적고, qa 겹침 검사 경우에 넣습니다. |
| 20 | minor | art-director | 색 순서는 지금 일치합니다(`color_slot` = 쌍 순서). 그런데 art B1은 "쌍 i → pairs[i]", levels는 `color_slot`으로 원본이 두 개이고, 0부터 세는 번호와 p1부터 세는 키 사이에서 하나씩 밀릴 위험이 있습니다. | 30-art 10절 B1, palette `_rules` 1, levels `pairs[].color_slot` | palette `_rules`에 "`color_slot` n → pairs[n](키 p{n+1}), 빌드는 쌍 순서가 아니라 color_slot을 읽음"을 한 줄 적습니다. |

### 이슈 16 계산표 (6x6 = L7~L10, 5x6 = L6, 칸 px)

| 해상도 | 판 | layout 칸 | balance V1 칸 | 판 밖 공간(긴 축) | 칸을 정한 축 |
|---|---|---|---|---|---|
| 360x640 | 4x4 / 5x5 | 81.55 / 65.63 | 82.0 / 65.6 | 위 178 + 아래 126 = 304 | 폭 |
| 360x640 | 5x6 | 65.63 | 65.6 | 145 + 93 = 238 | 폭 |
| 360x640 | 6x6 | **54.9** | **54.67** | 304 | 폭 |
| 412x915 | 6x6 / 5x6 | 63.4 / 75.78 | 63.33 / 76.0 | 527 / 451 | 폭 |
| 640x360 | 4x4 / 5x5 | 81.55 / 65.63 | 82.0 / 65.6 | 양옆 152 + 152 = 304 | 높이 |
| 640x360 | 5x6 / 6x6 | **54.9 / 54.9** | **54.67 / 54.67** | 359 / 304 | 높이 |
| 1280x720 | 모두 | 96(상한) | 114.7~172 | 692~884 | 상한 96 |

- 결론: 두 계산 모두 최소 칸은 6행·6열 판의 54.7~54.9 px입니다. 하한 48은 통과하고 목표 56에는 약 2 % 모자랍니다. 예약 200 가정으로 계산해도 판 밖 공간을 실제 배치로 넣어도 같은 결과가 나오므로, 판정(V1 통과)은 바뀌지 않습니다.

## 잘 된 점
- palette 테마 이름, 레벨 이름, 판 크기·쌍 수, 기믹이 lore 테마와 10/10 맞습니다. 연출 시간 숫자도 balance.json과 layout motion에서 대부분 같습니다.
- layout.json이 판 크기 5종 × 4해상도의 칸 px와 판정 띠 자리를 데이터로 냅니다. 그래서 V1을 가정이 아니라 실제 배치로 잴 수 있게 됐습니다(이슈 16).
- lore의 등급 경계와 칭찬 3단, F5를 따른 art 판정 자리가 "실패 없음·겁주지 않음"을 지킵니다.

## 점수
- 영역: 기획 교차 리뷰(채점 라운드 아님)
- 체크 항목 통과: 해당 없음(1-2는 이슈 목록 단계)
- 점수: 해당 없음
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목: "그림 카드·시연 그림의 칸 좌표를 레벨 데이터(`fill_card`·`hole_card`·`demo_drag`)와 자동으로 비교한다(SVG 좌표 → 칸 번호)." 이번에 그림 3장이 모두 어긋났지만 사람 눈 검사로는 놓쳤습니다.

VERDICT: REVISE
