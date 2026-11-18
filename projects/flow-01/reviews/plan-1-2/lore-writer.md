# 리뷰: lore-writer · plan 1-2 (교차 리뷰 1차)

- 날짜: 2026-11-18 · 대상: `20-balance.md`·`balance.json`·`levels/*.json`(balance), `30-art.md`·`assets/`(art) ↔ `10-lore.md`·`strings.json`(lore)
- 따른 결정: 오케스트레이터 F1~F5(`Docs/orchestrator/2026-11-17-1-1-planning-supervision.md`). 특히 F4(플레이 중 판 채움 %를 판정 이름 아래 작게), F5(판정 이름은 판 밖).
- 이번 차수는 지적만 합니다. lore 문서·strings는 2차에서 아래 "lore 담당" 항목과 다른 역할 답을 받아 한 번에 고칩니다.

## 확인한 것

- 읽은 파일: `.claude/agents/lore-writer.md`, `harness/PIPELINE.md`, `criteria.md`, `insights.md`(5~6세·튜토리얼·텍스트 절, tcg-01 절), `templates/review.md`·`report.md`, `STATUS.md`, 1-0 킥오프, 1-1 감시(F1~F5), `10-lore.md`, `strings.json`, `20-balance.md`(0·1-2·4·5·8-3·9·10·12·13절), `balance.json` 전체, `levels/01~10`(name_key·크기·쌍·구멍·카드 필드), `30-art.md` 전체, `assets/layout.json`(play·map·result·motion), `assets/check/layout.mjs`(글 자리 검사 범위), `assets/tutorial/*.svg` 3개(점 좌표·색).
- 실행: lore 9-9 검사 → `doc 66 json 66 | max ko 12 en 5 | same-as-other 15 | PASS`. 원본 보호 grep(flow free·플로우·플로우 프리·two dots·zip·numberlink) — strings·balance.json·levels·assets JSON/SVG·20-balance·30-art **0건**. layout.mjs의 `textW`로 결과 제목 5종·레벨 이름·`guardian_hold` 폭 계산(파일 쓰기 없음).
- 좌표 읽기: 레벨 JSON 좌표는 [x, y](20-balance 12절, L6 `[4,5]`가 5x6 안에 드는 것으로 확인).

## 이슈

| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | major | balance (art·lore 같이) | **L6 구멍 2개가 모두 판 가장자리**라 글 "구멍"과 그림이 어긋남. `first_hole` [4,0]은 오른쪽 위 모서리, [0,3]은 왼쪽 가장자리. 판 카드를 even-odd로 도려내면(art D2) 모서리가 "깨진 판·홈"으로 보이고, 둘레가 다 막힌 "구멍"이 L6에 하나도 없음. art B3도 "판 둘레와 이어지지 않는 곳 권장" | `levels/06-level6.json` holes, `30-art.md` 10절 B3·D2, `strings.json` `card_hole` | ① balance: 첫 구멍이 안쪽(둘레 4칸이 모두 칸)인 후보로 L6 재선정(m̃ 단조·r 유지 확인) — 권장. ② 재선정이 곡선을 깨면 art: 구멍이 가장자리여도 판 바깥 테두리(`boardEdge`)는 사각형 그대로 두고 구멍 칸만 안쪽에 바탕 색으로 그려 "판 안의 구멍"으로 보이게. 둘 다 안 되면 lore가 낱말을 바꿈(2차) |
| 2 | major | art | **L2 카드 그림이 L2 실제 판과 다름.** `card-fill.svg`는 3x3·빨강(p1) 선이 빈칸을 지남. 실제 L2는 4x4이고 빈칸을 만드는 쌍은 c3(`color_slot` 2 = 금빛 노랑·별 표지, 점 (1,0)·(1,1) 맞닿음), 남는 빈칸은 왼쪽 위 모서리 (0,0)·(0,1) | `assets/tutorial/card-fill.svg` 점 색 `#E04D61`, `levels/02-level2.json` pairs·`fill_card.empty_cells`, 10-lore 8절 7·9-3, insights runner-01 "튜토리얼 그림 = 첫 물체" | 카드를 L2 4x4 판 그대로(세 쌍 색·표지·자리 같게), 왼쪽 = 세 쌍 곧게 이은 뒤 (0,0)·(0,1)이 `gapGlow`로 숨 쉼, 오른쪽 = 노랑 선이 (1,0)→(0,0)→(0,1)→(1,1)로 돌아 판이 꽉 참 |
| 3 | major | art | **L6 카드 그림이 L6 실제 첫 구멍과 다름.** `card-hole.svg`는 3x3 가운데 구멍, 실제 L6은 5x6·첫 구멍 오른쪽 위 모서리(이슈 1 결과에 따라 바뀜). 30-art 8-3이 "1-2에서 다시 그림"이라 적어 둠 | `card-hole.svg`, `levels/06-level6.json` `hole_card.first_hole`, 30-art 8-3 | 이슈 1이 정해진 뒤 실제 첫 구멍과 그 둘레 쌍(현재면 c4 초록·세모가 (3,0)에서 왼쪽으로, c5 보라·초승달이 (4,1)을 지남)의 색·표지·자리로 다시 그림. 카드 속 표지 ≥ 16 px 재검사 |
| 4 | major | lore (balance·art 확인) | **F4·F5 뒤 lore 6-1·6-4·8·9 문장이 결정과 어긋남**: 판정 이름 자리 "짝 점 위쪽, 판 가장자리면 안쪽"(6-1, 9-4 `judge_1_name` "짝 점 위"), 플레이 중 % "표시하지 않음"(6-4), 8절 10 "선택 시 채움 %", 9-8 미결 목록, `guardian_intro`가 결과 %만 설명 | `10-lore.md` 6-1·6-4·8-10·9-4·9-8·13 L3, F4·F5 | 아래 "F4·F5 뒤 lore 변경 목록"대로 2차에서 고침. 다른 역할은 목록의 ⑤·⑥(대체 글 방침)에 이견이 있으면 2차 전에 알려 주세요 |
| 5 | major | balance ↔ art (lore 키) | **"한 번에 이은 쌍" 표지가 balance에만 있음.** balance 0-2 수정 1·5절은 결과 화면에 "한 번에 이은 쌍 반짝 표지(점 줄 위)"를 둔다고 했으나 30-art 5-1 결과 화면·`layout.json result`에 쌍 점 줄·반짝 표지 자리가 없고, strings에도 대체 글 키가 없음 | `20-balance.md` 0-2·5절 표 "결과 %(Q2)", `layout.json result.*`, `strings.json` | 둘 중 하나로 맞춤. (가) 둠: art가 결과 화면에 쌍 점 줄 + 한 번에 이은 쌍 반짝 자리를 넣고(겹침 검사), lore가 meter 키 `result_one_go` "한 번에 이은 색" / "Colors in one go"(valuetext 숫자만)를 추가. (나) 뺌: 결과에는 이미 별 + %가 있어 5~6세에 신호 3개는 많음 → balance 0-2·5절에서 삭제. lore 의견은 (나), 다르면 오케스트레이터 결정 |
| 6 | major | art | **글이 보이는 화면 3곳의 배치·글 자리가 없음**: 타이틀(`title` 로고·`tagline`·`tap_to_start`), 보호자 화면(`guardian_title`·`guardian_intro`·`settings_*`·`vibrate_note`·`lang_*`·`settings_reset`·`confirm_*`), 불러오기·오류(`loading`·`load_error`·`load_error_detail`·`btn_reload` ↻). `layout.json`은 play·map·result만 있고 layout.mjs 글 검사도 play `board_text`·지도 제목만 봄 | `layout.json` 최상위 키, `layout.mjs` 286~311줄, insights rhythm-02 "화면 고정 글도 자리를 데이터로" | 세 화면의 4해상도 배치와 text_slots를 추가하고 가장 긴 문구로 검사: EN `load_error_detail`(61자)·`vibrate_note`·`guardian_intro`(어른 글, 여러 줄), `confirm_reset` "Clear all progress?", `tap_to_start` "Tap to start", KO `guardian_hold`. ↻는 부트 블록 인라인(lore 8절 9) |
| 7 | major | art (또는 lore) | **지도 `guardian_hold` 보이는 글에 자리가 없음.** lore는 "설정 버튼 옆 작은 글"(화면)인데 360x640 지도에서 톱니(300,12,48x48) 옆은 화면 끝이고, 아래는 별 줄·노드 2(252,175)까지 폭 약 70 px. EN "Grown-ups: press and hold"는 14 px에서 약 186 px | `layout.json map.360x640.buttons.settings`, lore 9-6, textW 계산 | art: 지도에 `guardian_hold` 자리(예: 톱니 아래 오른쪽 정렬 두 줄, 노드·별 줄과 겹침 검사) 추가. 자리가 정말 없으면 lore가 EN을 "Grown-ups: hold"로 줄이고 KO는 그대로(2차) |
| 8 | major | lore ↔ art | **결과 화면 레벨 이름 글 자리가 없음.** lore 9-2는 `levelN_name`을 "결과 화면 맨 위 작은 글"(화면)로 두었으나 `layout.json result`의 title은 클리어 제목 하나뿐 | `10-lore.md` 9-2 `level1_name` 줄, `layout.json result.*` | lore 의견: 결과 화면에서는 보이는 글을 빼고(제목·미니 그림이 이미 있음) `levelN_name`을 결과 미니 그림 img 이름·지도 노드 이름에만 씀 → 구분 "화면"→"aria"(2차 lore). art가 자리를 넣는 쪽을 원하면 EN 가장 긴 "Stepping Stone Pond"로 검사 |
| 9 | major | art (또는 lore) | **`result_new_best` 그림이 없음.** lore는 "이전 최고 %보다 높을 때 작은 표지 img"인데 30-art 5-1·`layout.json result`·`icons/`에 표지 그림·자리 없음. lore 8절 12 "66키 모두 쓰는 키" 규칙에 걸림 | lore 9-5, 30-art 5-1·11절 아이콘 목록 | art: % 옆 작은 위쪽 화살표·반짝 표지(빨강·경고 꼴 아님)와 자리 추가. 안 그리면 lore가 키를 지우고 DEV_NOTES 대신 10-lore에 이유 기록(2차) |
| 10 | minor | balance | 판정 등급 데이터 키(`perfect/good/pass`)와 글 키 연결이 순서에만 기댐. lore 12절 1은 "키 이름으로 연결" 요청 | `balance.json judge.grade_keys` | `judge.name_keys: ["judge_1_name","judge_2_name","judge_3_name"]` 추가(빌드가 글 키를 코드에 쓰지 않게) |
| 11 | minor | balance (lore 같이) | 카드 글 키가 레벨 데이터에 없음. 레벨 JSON은 `tutorial.kind`/`fill_card`/`hole_card` 필드만 있고 글 키(`tut_drag`·`card_fill`·`card_hole`)는 빌드가 추측해야 함. lore 9-3 "카드 id는 키 이름 그대로 쓴다"와 다름 | `levels/01·02·06` | 각 객체에 `text_key` 필드(`"tut_drag"`·`"card_fill"`·`"card_hole"`) 추가. 받지 않으면 lore 9-3 문장을 "필드 → 키 고정 짝"으로 고침 |
| 12 | minor | balance | 레벨 JSON `name_placeholder` "레벨 N"은 한국어 화면 글이 데이터에 있는 것(빌드는 strings.json만 읽음, lore 8절 12). 대체 글·화면에 새면 EN에서 한국어가 보임 | `levels/*.json name_placeholder` | 필드 삭제, 또는 20-balance 12절에 "빌드 표시 금지, 도구용"이라고 적음 |
| 13 | minor | balance | 20-balance 안 문장 두 곳이 결정 전 내용: 1-2 표 "연결마다 이름(짝 점 위, **판 안쪽으로**)"(같은 표 아래 줄은 판 밖), 0-1·13절 ④ 한 문장 규칙이 1-0 후보 "판을 색으로 가득 칠하기"(lore 확정 "같은 색 점을 이어서, 빈칸 없이 다 칠해요") | `20-balance.md` 1-2 표 "탭마다 이름 + 정확도 %" 줄, 0-1, 13절 ④ | 판 밖(F5)으로, 한 문장은 lore 5절 확정 문장으로 |
| 14 | minor | balance ↔ lore | balance 13절 ③은 플레이 중 판 채움 %에 대체 글 "칠한 칸"을 요청. lore 방침은 판정 표시(이름·%)는 550 ms 뒤 사라지는 순간 표시라 읽지 않음(`aria-hidden`, insights 콤보 대체 글) | 20-balance 13절 ③, 10-lore 6-3 마지막 줄·6-4 | 키를 두지 않음으로 맞춤(진행 정도는 판 그림이 늘 보여 주고, 완료 뒤 결과가 읽힘). balance 13절 ③에서 "칠한 칸" 삭제 |
| 15 | minor | art ↔ balance | 도움 손가락 대상이 문서마다 다름: balance 10-2 "아직 **답과 다른** 쌍 하나", art 8-1·`motion.help` "아직 **안 이은** 쌍 하나". 아이가 틀린 길로 이은 쌍이 있으면 결과가 다름 | 20-balance 10-2, 30-art 8-1, `layout.json motion.help` | balance 정의(답과 다른 쌍, 잘못 이은 쌍 포함)로 맞춤. lore `btn_help` "도와줘"는 그대로 |
| 16 | minor | art ↔ balance | art B2는 시연 쌍 "길이 4~6칸, 꺾임 1~2" 권장, balance는 가장 짧은 c1(3칸, 꺾임 1). 문구 `tut_drag`와는 둘 다 맞음 | 30-art 10절 B2, `levels/01 tutorial` | art가 balance 안(c1)을 받는다고 적음(손이 앞길을 가리는지만 목업으로 확인) |
| 17 | minor | art | L1 시연 그림 순서표가 L1 실제 판과 다름: 빨강 (0,0)·(1,2), 파랑 (3,0)·(3,3), 노랑 (1,1)·(2,3). 실제 L1은 c1 빨강 (2,2)→(1,2)→(1,1), c2 파랑 (2,3)·(2,1), c3 노랑 (3,0)·(3,3). 빌드는 데이터로 그리지만 개발·QA가 이 그림을 기준으로 봄 | `tutorial/tut-l1-demo-storyboard.svg` 점 좌표, `levels/01-level1.json` | 순서표를 L1 데이터로 다시 생성(시연 = 빨강·하트 (2,2)→(1,2)→(1,1)) |
| 18 | minor | art ↔ lore | 빈칸 보조 글 `gap_left` 나오는 때가 다름: lore "**3번째 숨 쉬기 때만**", art 4-6·`motion.gap_hint` "마지막 판정 표시가 끝난 뒤"(=첫 숨 쉬기부터로 읽힘) | 10-lore 9-4 `gap_left`, 30-art 4-6, `layout.json motion.gap_hint` | lore 안(그림이 먼저, 글은 마지막)으로: `motion.gap_hint`에 `text_on_breath: 3` 추가. `aria-live`는 사건마다 1번(첫 숨 쉬기) 그대로 |
| 19 | minor | art | 같은 일(지도로 가기)에 아이콘 두 개: 플레이 HUD는 `home`(⌂), 결과는 `map`. 글 키는 둘 다 `btn_map` "지도로" | `layout.json play.*.buttons.home`, `result.*.buttons.map` | 한 그림(`icon-map` 권장)으로 통일, 또는 home을 지우고 map만 |
| 20 | minor | art | 아이콘 빈 곳·남는 곳: 보호자 화면 ✕(`btn_close`) 그림 없음, `icon-lock.svg`는 "자물쇠 그림 없음"(5-2) 방침과 달리 남아 있음 | `assets/icons/`, 30-art 5-2·11절 | `icon-close` 추가, `icon-lock` 삭제 또는 쓰는 곳 명시 |
| 21 | minor | lore | 지도 소리 켬/끔 버튼(`map.buttons.sound`)의 대체 글 키가 없음 | `layout.json map.*.buttons.sound`, strings | 2차: 새 키 없이 `settings_sound` "소리"를 버튼 이름으로 쓰고 `aria-pressed`로 상태(9-6 "쓰는 곳"에 적음) |
| 22 | minor | lore | 지도 제목: lore는 `map_screen`을 aria 전용("화면 제목 글은 두지 않음"), art는 보이는 제목(20 px, 자리·넘침 검사 있음) | 10-lore 9-2, `layout.json map.*.title`, 30-art 10절 L3 | 2차: art 안을 받아 구분 "화면"으로 바꾸고 목록 이름에도 같이 씀(9자, 넘침 없음 확인됨) |
| 23 | minor | lore | 7절 레벨 표가 balance·art 결정과 어긋남: L1 "따뜻한 3색"(실제 p1 빨강·p2 파랑·p3 금빛), L6 "5x5 또는 5x6"(실제 5x6·구멍 2), L9 "6색 작은 점 줄"(art가 옅은 호 3개로 바꿈, A3 — 받음), L10 별 3 "판 위로"(art: 판 모서리 뒤, 완료 때만), 7절 끝 "지도 길이 하루 흐름을 보여 줌"(art 5-2: 지도 바탕은 menu 하나, 노드는 미니 그림) | 10-lore 7절, 30-art 2-1·2-3·5-2, levels | 2차에 실제 값으로 고치고, 하루 흐름은 "레벨 바탕에서만"으로 고침 |
| 24 | minor | lore | 9-3·9-5 그림 힌트가 balance·art 값과 다름: `tut_drag` "1.5 s 쉬고 반복"(실제 1.2 s, 2회 뒤 3 s, 손가락은 첫 누름에 사라지고 글은 첫 연결에 사라짐), `card_fill`·`card_hole` "체크 표시"(art L5: ✓ 안 씀, "다 칠한 표시"), `card_hole` "구멍 둘레를 선이 돌아가고"(이슈 1 결과에 따름), `result_accuracy` "큰 숫자"(art: 26 px 작게, 별이 주) | 10-lore 9-3·9-5, `balance.json tutorial`, 30-art 5-1·10절 L5 | 2차에 숫자를 쓰지 않고 "balance.json tutorial 값"으로 참조, 표지 낱말을 "다 칠한 표시"로 |

## F4·F5 뒤 lore 변경 목록 (2차에서 할 일, 이슈 4)

| # | 위치 | 지금 | 바꿀 내용 |
|---|---|---|---|
| ① | 6-1 "자리" 줄 | 짝 점 위쪽, 판 가장자리면 안쪽 | **판 밖**: 세로 = 판 바로 위 띠, 가로 가운데 = 방금 이은 짝 점의 x / 가로 화면 = 짝 점 쪽 기둥, 세로 가운데 = 그 점의 y. 판 안 국소 반응은 점 튐·고리·조각(30-art 4-3, `judge.name_anchor` `outside_board_same_axis`) |
| ② | 9-4 `judge_1_name`~`3` "쓰는 곳" | 짝 점 위 큰 글자 | "판 위 띠(가로 화면은 기둥), 짝 점과 같은 x/y. 1단 34·2단 31·3단 28 px(× k)" — 숫자는 30-art 4-3 참조로 |
| ③ | 6-4 플레이 중 % | lore 의견 "표시하지 않음" | **F4 채택**: 판정 이름 아래 작은 판 채움 %(⌊100·칠한 칸/판 칸⌋, 정수), 앞에 칠한 칸 그림표(`icon-filled`), 이름과 같이 나타나고 사라짐. 결과 % 앞 그림표는 `icon-one_go`로 다름. lore 의견은 기록으로만 남기고 1-5 리뷰 혼동 확인 항목으로 |
| ④ | 8절 10 | "선택 시 플레이 중 채움 %" | "플레이 중 채움 %"(확정). 이름과 한 줄로 붙이지 않음(아래 줄) 그대로 |
| ⑤ | 6-4·8절 6 대체 글 | Q1이면 대체 글 없음 | 플레이 중 %는 키를 두지 않고 `aria-hidden`(판정 이름과 같은 순간 표시). balance 13절 ③ "칠한 칸" 요청은 받지 않음(이슈 14) |
| ⑥ | 6-4 결과 화면·9-8 | K4 선택안 미결 | `percent.result_hide_pct_below` = null → `result_accuracy` meter는 늘 있음. "한 번에 이은 쌍" 표지는 이슈 5 결정에 따라 키 추가 또는 없음 |
| ⑦ | 9-6 `guardian_intro` (strings 함께) | 결과 %만 설명 | 문장 하나 추가 — KO "놀이 중 이름 아래 작은 %는 판을 칠한 만큼입니다." / EN "The small % under each cheer shows how much of the board is filled." (어른 글, 길이 한도 없음. 9-9 재검사) |
| ⑧ | 6-3 마지막 연결 | 완료 연출 시작 프레임부터 흐려짐 | art 4-3 값(완료 연출 +150 ms부터 150 ms에 흐려짐)으로, 숫자는 30-art 참조 |
| ⑨ | 13절 L3 위험 | 판정 이름이 판 위에서 선을 가림 | F5로 해소. 대신 30-art R3(이름이 짝 점에서 멀어짐) 를 lore 위험으로 옮김(대안: 1단만 이름) |
| ⑩ | 12절 요구 목록 | 1-1 요구 | 1-2 결과(이슈 10·11·18)로 갱신 |

## 텍스트 키 ↔ 다른 역할 데이터 대조

| 대상 | 쓰는 키 | strings에 있음 | 비고 |
|---|---|---|---|
| levels `name_key` | level1_name ~ level10_name | 10/10 | 판 모양·테마 짝 맞음(아래 표) |
| balance `judge.grade_keys` | perfect/good/pass (글 키 아님) | — | 이슈 10 |
| levels 카드 필드 | tutorial / fill_card / hole_card | 글 키 연결 없음 | 이슈 11 |
| layout `text_slots.used_by` | tut_drag·card_fill·card_hole·gap_left | 4/4 | 4해상도 × 5판 크기 통과(art 검사) |
| layout `map.title.key` | map_screen | 있음 | 이슈 22 |
| layout `motion.gap_hint.text_key` | gap_left | 있음 | 이슈 18 |
| 화면 버튼 아이콘 | home·undo·help·restart·map·next·settings·sound | `btn_*` 8개 | home↔btn_map(이슈 19), sound 키 없음(이슈 21), close 그림 없음(이슈 20) |
| strings에 있는데 그림·자리 없는 키 | tagline·tap_to_start·guardian_*·settings_*·lang_*·confirm_*·loading·load_error*·btn_reload(이슈 6), guardian_hold(7), levelN_name 결과 글(8), result_new_best(9) | — | 안 쓰는 키는 없음(모두 빌드가 쓸 예정). 쓰이지 않게 되면 이유 기록 |
| balance가 요청했는데 strings에 없는 것 | "칠한 칸"(이슈 14, 두지 않음), "한 번에 이은 쌍"(이슈 5) | — | |

## 가장 긴 문구 × 글 자리 (layout.mjs `textW` 추정 폭)

| 자리 | 가장 긴 문구 | 결과 |
|---|---|---|
| play `board_text` 360x640(328x35, 한 줄) | EN "Some squares are empty" 약 250 px / KO "같은 색 점까지 끌어요" | 들어감(art 검사 통과). 문구를 늘리면 넘침 — 2차에서도 12자·한 줄 유지 |
| play `board_text` 640x360 기둥(136x224, 4줄) | EN "Drag to the same color" 3줄 | 들어감 |
| 판정 띠(114x63, 360 기준) | KO "최고야" 34 px + "100%" 19 px(+ 그림표 약 11 px) | 들어감. 그림표 폭은 layout.mjs 계산에 없음 → art가 `nameWidest`에 그림표 폭을 더해 두기를 권함(여유는 충분) |
| result title(328x44, 24 px) | KO "알록달록 다 칠했어요!"·"노을까지 다 칠했어요!" 12자, EN "You painted the sunset!" | 모든 해상도에서 폭 90 % 미만. 다만 layout.mjs가 `clear_*` 글을 검사하지 않음 → art 검사에 추가 권장 |
| 지도 title | EN "Where shall we paint?" | 들어감(art 검사) |
| 지도 guardian_hold | EN "Grown-ups: press and hold" 약 186 px @14 px | 자리 없음(이슈 7) |
| 타이틀·보호자·오류 화면 | EN `load_error_detail` 등 | 자리 없음(이슈 6) |

## 튜토리얼 그림 ↔ 첫 등장 물체 (insights runner-01)

| 그림 | 실제 첫 물체(레벨 데이터) | 그림 지금 | 판정 |
|---|---|---|---|
| L1 손가락 시연 | c1 = p1 빨강·하트, (2,2)→(1,2)→(1,1) | 빌드는 데이터로 그림(맞음), 순서표 SVG는 다른 판 | 이슈 17 (minor) |
| L2 `card_fill` | c3 = p3 금빛·별, 빈칸 (0,0)·(0,1) 왼쪽 위 모서리, 4x4 | 3x3·빨강 | 이슈 2 (major) |
| L6 `card_hole` | 첫 구멍 (4,0) 오른쪽 위 모서리, 5x6, 옆 쌍 c4 초록·세모·c5 보라·초승달 | 3x3 가운데 구멍 | 이슈 1·3 (major) |
| 문구 | `tut_drag`·`card_fill`·`card_hole` 낱말(점·빈칸·구멍) | 그림 모양 이름과 맞음 | 이슈 1 결과에 따라 `card_hole` 낱말 유지 여부 |

## 레벨 테마 ↔ 바탕 색 (아침 → 노을)

| L | lore 힌트 | art 바탕 top → bottom · 장식 | 판 데이터 | 판정 |
|---|---|---|---|---|
| 1 햇살 마당 | 연노랑 → 크림 | #FFF3D2 → #FFF8EA · 큰 호 1 | 4x4·3쌍 | 맞음 |
| 2 튤립 화분 | 연분홍 → 크림, 작은 원 3 | #FDE6EE → #FFF7EC · 고리 3 | 4x4·3쌍·빈칸 | 맞음 |
| 3 물놀이 해변 | 하늘색 → 모래색, 가는 곡선 1 | #DDF1FA → #FBF3E2 · 물결 곡선 1 | 5x5·4쌍 | 맞음 |
| 4 구불구불 숲 | 연두 → 연초록, 세모 2 | #EAF6DD → #DDF1E2 · 세모 2 | 5x5·4쌍·꺾임 많음 | 맞음 |
| 5 과일 가게 | 살구 → 연노랑, 원 여러 개 | #FFE8D6 → #FFF6D8 · 고리 4 | 5x5·5쌍 | 맞음 |
| 6 징검다리 연못 | 물빛 청록 → 연하늘, 구멍에 물빛 | #D6F0EC → #E3F1FB · 물결 2 | 5x6·5쌍·구멍 2 | 색 맞음, 구멍 자리는 이슈 1 |
| 7 큰 꽃정원 | 연보라 → 연분홍, 네모 2 | #EFE4FA → #FCE6F0 · 둥근 네모 2 | 6x6·5쌍 | 맞음 |
| 8 돌담 길 | 회베이지 → 크림(회색 단색 금지) | #EFE8DF → #FBF5EA · 둥근 네모 3 | 6x6·5쌍·구멍 3 | 맞음 |
| 9 무지개 들판 | 연하늘 → 연노랑, 6색 점 줄 | #E0F0FB → #FDF6D9 · 호 3 | 6x6·6쌍 | 색 맞음, 장식 변경 받음(이슈 23) |
| 10 노을 하늘 | 주황 → 연보라, 완료 때 별 3 | #FFE1CC → #ECE3F8 · 별 3(완료 때만 0.4 s) | 6x6·6쌍 | 맞음(주황은 아주 옅은 살구빛 — 소프트 그라디언트 원칙상 받음) |

- 아침(1) → 낮(3~9) → 노을(10) 흐름이 바탕 색으로 읽히고, 판 크기·기믹이 장소 이름과 맞습니다(연못 = 구멍, 돌담 = 구멍 + 우회, 무지개 = 6색, 구불구불 = 꺾임). 지도 화면은 menu 바탕 하나라 "지도 길이 하루 흐름을 보여 줌"은 lore 문장을 고칩니다(이슈 23).

## 잘 된 점

- 레벨 `name_key` 10개가 strings와 정확히 같고, 판 구조가 장소 이름과 잘 맞음. 바탕 색 10개가 lore 7절 방향 그대로.
- art `text_slots`가 strings.json을 직접 읽어 가장 긴 언어로 검사함(rhythm-02 인사이트 적용). 판정 이름 2·3단 회색·빨강 없음, 모든 이름 칭찬, 실패 문구 0.
- L1 시연 쌍이 lore "실제 첫 쌍"(c1 = p1)과 같고, 시연 길이 답 길(V7 확인).
- 원본 보호 grep 0건(한국어 표기 포함), 그림 에셋 안 글자 0.

## 점수

- 영역: 세계관·텍스트(기획 단계 교차 확인)
- 체크 항목 통과: 키 일치 10/10(레벨 이름), 글 자리 검사 4/4 문구 통과, 테마 ↔ 바탕 10/10, 튜토리얼 그림 ↔ 첫 물체 1/3(L1만), 보이는 글 자리 있는 화면 3/6
- 점수: 7 / 10 (텍스트 원본·이름·테마는 단단하나 카드 그림 2장과 화면 3곳 글 자리가 빠짐)
- criteria.md 추가 제안: "보이는 글이 있는 모든 화면(타이틀·보호자·오류 포함)에 text_slots가 있고, 가장 긴 언어로 검사한다" / "구멍 소개 레벨의 첫 구멍은 둘레가 모두 칸인 자리"

VERDICT: REVISE
