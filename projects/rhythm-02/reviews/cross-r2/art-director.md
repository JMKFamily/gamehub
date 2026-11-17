# 리뷰: art-director · round-2 1-2 교차 리뷰 (흘러오는 길 + 콤보)

관점: 화면·그림·색·연출·소리, 튜토리얼 그림이 실제 첫 등장과 같은지, 렌더 px. 점수는 매기지 않습니다. 이번 1-2는 교차 리뷰와 1회 수정을 함께 하므로 art 몫은 이 리뷰를 쓰면서 고쳤습니다(처리 칸).

## 확인한 것
- 읽은 파일: `10-lore.md`(전부), `strings.json`, `20-balance.md`(전부), `balance.json`(`combo`·`gimmicks`), `levels/01~10`(`objects`·`roof_sits`·`first_of_gimmick`·`phrases`), `tools/sim/judge.mjs`(`compileLevel`·`comboEvents`), 오케스트레이터 `Docs/orchestrator/2026-11-17-r2-planning-supervision.md`(1-2로 넘기는 안건 1~8, 결정 R2-D1~D8), `harness/insights.md`, `harness/criteria.md`, `harness/benchmarks/djmax-judgement.md` 4절.
- R2-D8 대조용으로 읽기만: `projects/rhythm-01/30-art.md` 16절(round-3 새 코어 "북길"), `projects/runner-01/00-benchmark.md`(플레이어 x).
- node로 직접 계산한 것(파일 쓰기 없음): 레벨 첫 물체 폭과 카드 물체 폭, 첫 등장 앞 비행, 지붕 밑 bob 박, 지붕 0.6박 전 덮기가 앞 hit 순간 북·공과 겹치는 px(4해상도), 클리어 감속을 그림에만 넣을 때의 끝 구름 덮기, R2-D2 규칙의 화음 박(19번).
- balance·lore가 같은 시간에 고치는 중이었음. 처음 읽은 판: levels 19:17, balance.json 19:19, 20-balance 19:26, 10-lore 18:51, strings 18:46. **다시 확인한 판(19:42)**: lore 10-lore 19:40·strings 19:36, balance judge.mjs·levels 19:42. 이슈마다 "다시 확인" 칸에 적음. 화음 검사는 끝에서 다시 돌림(보고서).

## 안건별 한 줄 결론
| 안건 | 결론 | 이슈 |
|---|---|---|
| 1 V7b card_twoballs | art 그림 2장 + `obj-second-ball.svg` 지움, `cards.mjs --check` "남은 카드 파일 0". strings 키는 lore | L4 · 처리 A5 |
| 2 X-B2 화음 시각 | `sound-check.mjs`가 R2-D2 규칙을 19번 모두 검사(정보 → FAIL). 읽은 시각의 balance 데이터는 아직 옛 규칙이라 위반 15~17건 | B1 |
| 3 q_nogo 의존 | balance 몫. 그림 영향 없음(지붕 수·자리가 바뀌면 카드·첫 등장 검사가 다시 봄) | − |
| 4 바탕 단계 | art `layout.mjs`는 새 식으로 검사(L07 13). balance 문서 6-1이 옛 식 min(n, 3) | B2 |
| 5 클리어 감속·지붕 0.6박·통과 폭 270 | 감속은 그림만(R2-D5) 반영. 0.6박 전 덮기는 세로 화면에서 앞 hit 순간 지붕 끝이 북 몸통 오른쪽 16~18 px 위에 오지만 공 위는 비어 있음 — 승인. 통과 폭 270은 그림 영향 없음 | B3, B4 |
| 6 W0 이름 "표시" | art 그림 = 길 위 파란 반원 돔(북 몸통 색). 이름 "표시" 유지에 문제 없음. lore 3절 표 칸이 아직 질문 상태 | L1 |
| 7 콤보 대체 글 | art 쪽: 레벨 카드 최고 기록 막대·최고 콤보 표지 = 화면 자리 그대로, DOM은 버튼 옆 형제 요소. HUD meter 규칙을 layout에 적음. lore 6절 4번이 "valuetext 만들지 않음"이라 R2-D7과 다름 | L3 · 처리 A3·A4 |
| 8 구분·관계 표 | 세 문서의 rhythm-01 비교가 **rhythm-01 옛 코어(궤도)** 기준. rhythm-01은 round-3에서 "흘러오는 별이 왼쪽 0.30 W 판정 선에 닿을 때 톡"으로 바뀜 → 세 문서 모두 낡음 | D1, D2 |
| + 모양 이름 = 그림 | 표시·지붕·가지·긴 가지·큰 언덕·구름 모두 같은 것을 가리킴. 지붕은 "낮은"이 아니라 줄무늬 차양(아랫면 0.45·Hp) | L1, L2 |
| + 카드 문구·힌트 = 그림 = 첫 등장 | 문구 8장은 그림과 맞음. **art 카드 4장이 레벨 첫 등장과 달랐음**(물체 폭, 칸 1 공 상태) — 고침 | A1 |
| + 레벨 이름·장소 = 테마·실루엣 | L5 작은 마을 = 벽돌 장미 바탕 + 지붕 없는 네모 집·굴뚝·울타리, L6 물웅덩이 = 청록 + 납작한 웅덩이 둘. 위험 물체를 닮은 배경 0. 충돌 없음 | − |
| + 물체 높이·덮기 시각·콤보 시각 = 그림 | 높이 0.45/0.30/0.30/0.9는 layout이 balance 값을 읽음(V22·V23 통과). 지붕 밑 bob이 art 문서에서 "다음 박부터"로 잘못 적혀 있었음 — 고침 | A2 |

## 이슈

### lore
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| L1 | minor | lore-writer | **모양 이름 표가 아직 "맞출 것" 질문 상태**: 3절 W0 행 "모양 이름이 '표시'로 불릴 수 있는지(작은 꽃·조약돌·깃…)", 11절 L6 "art가 구체 모양으로 그리면 그 이름으로 바꿈". 그림은 이미 정해졌음: **길 위 낮은 파란 반원 돔**(0.8d × 0.4d, 북 몸통 색 `#234C88` + 잉크 외곽선, 북 가운데 다리 밑에 오면 톡). 북 행에는 **가운데 다리**가 빠져 있음(표시가 닿는 자리) | `10-lore.md` 3절 표·11절 L6, `30-art.md` 3-2 W0·3-1 북, `assets/obj-mark.svg`·`obj-drum.svg` | R2-D6대로 이름 "표시" 유지. "보이는 모양" 칸 = "길 위 파란 반원 돔(북 색)", 북 = "넓은 둥근 사각 + 가운데 다리", "art와 맞출 것" 칸 = "확정(R2-D6)". L6 행은 닫음. **다시 확인(19:40)**: 3절 W0 = "파란 낮은 반원 돔", 확정값 표 "대조 끝" — 반영됨 |
| L2 | minor | lore-writer | **지붕 모양 설명이 그림과 조금 다름**: 3절 W4 "북 위를 덮는 낮은 지붕 … 다리·처마로 그리면 이름도 바꿈". art 그림은 **가게 앞 줄무늬 차양**(둥글게 솟은 윗변 + 보라·연보라 넓은 세로 줄무늬 + 아래 반원 물결), 아랫면 0.45·Hp = 1박 꼭짓점(0.27·Hp)보다 한참 위라 "낮은"과 다름. art 판단: 5~6세에게 위를 덮는 줄무늬 덩어리는 "지붕"으로 불러도 됨(처마·다리처럼 보이는 요소 없음) | `30-art.md` 3-2 W4·"지붕이 글 없이 '치지 마'로 읽히는 이유", `assets/obj-roof.svg` | 이름 "지붕" 유지. 칸 = "북 위를 덮는 줄무늬 지붕(둥근 윗변, 물결 아랫단)", "다리·처마로 그리면…" 문장 삭제. 카드 문구 "지붕 밑에선 쉬어요" = 그림(앉은 공 + 북에서 떨어진 손) 일치. **다시 확인(19:40)**: W4 = "줄무늬 차양(가게 앞 차양 모양)" — 반영됨 |
| L3 | major | lore-writer | **콤보 대체 글이 R2-D7과 다름**: 6절 4번 "콤보·최고 콤보 … `aria-valuetext`도 만들지 않습니다". R2-D7·insights(runner-01)는 `role="meter"`에 **valuetext 숫자만**(퍼센트로 읽히지 않게). 또 6절 11번 레벨 선택 목록이 최고 콤보 meter를 카드 버튼 안에 있는 것처럼 적음 — 버튼 aria-label이 있으면 안쪽 meter는 낭독되지 않음 | `10-lore.md` 6절 4·11, 7-4 `aria_combo`·`aria_best_combo`, R2-D7, `harness/insights.md` 5~6세 절 runner-01 콤보 줄 | 6절 4번에 "콤보·최고 콤보 meter는 예외: valuetext = 숫자만(예 '7')" 추가. 11번 레벨 선택: "최고 콤보 meter `aria_best_combo` = **카드 버튼 밖 형제 요소**(art: 등급 줄 오른쪽 끝), 안에 두면 버튼 `aria-describedby`". art는 그림 자리를 이미 옮김(A3). **다시 확인(19:40)**: 6절 개수 = meter·valuetext 숫자만, 11번 "버튼 안에 넣지 않음" — 반영됨(남은 것은 L6) |
| L4 | minor | lore-writer | `strings.json` `card_twoballs` 키가 남음(R2-D1). 7-9 ⑧ 결과 줄 "card files 14/16"은 지금 16/16(`card_roof` 2장 있음) | `strings.json`(18:46), `10-lore.md` 7-9 결과 | 키 삭제, 7-9 다시 돌림. art 쪽 카드 파일 = 8장 × 2판, 남는 파일 0. **다시 확인(19:36 strings)**: `card_twoballs` 키 없음 — 반영됨 |
| L6 | − | lore-writer | (닫음) 최고 콤보 표지 자리 "카드 오른쪽 위"는 오케스트레이터 추가 지시(화면 자리 그대로, DOM은 버튼 옆 형제)와 같음 — lore 3절·7-2·6절 11번 그대로 맞음 | `10-lore.md` 19:40 판 | 할 일 없음 |
| L5 | minor | lore-writer | 7-3 카드 그림 힌트와 art 그림이 4장 어긋났음(`card_big` 가까운 표시 → 먼 표시, `card_double`·`card_roll` "넓은 간격 →", `card_three` "앉은 공 →"). **lore 힌트가 맞았고 art가 레벨 첫 등장과 달랐음** → art가 고침(A1). lore 쪽 할 일은 없음, 힌트 칸의 "art 8절에 넘김"을 "반영됨"으로만 | `10-lore.md` 7-3, `tools/art/cards.mjs DEFS` | 확인만 |

### balance
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| B1 | major | balance-designer | **콤보 화음 시각이 아직 R2-D2 전 규칙**: `judge.mjs comboEvents`의 `chordBeatAfter`는 "다음 정박, 지붕 착지 ±1박만 피함"이라, 모두 딱 시도에서 19번 중 15~17번이 어떤 접촉의 [놓침 구역 시작, 통과 창 끝] 안(예 L1 10단계 30박 → 규칙상 34박, L9 10단계 28 → 35박). 20-balance 12절 "받침 쉼 첫 박으로 미루지 않음"·`chord_timing.defer_to_rest_first_beat: false`도 R2-D2와 부딪힘(1박 통이 이어지면 받침 쉼까지 밀리는 것이 새 규칙의 결과) | `tools/sim/judge.mjs` 337~345행, `balance.json combo.chord_timing`, `20-balance.md` 12절 화음 행, `sound-check.mjs` 5절 출력 | `chordBeatAfter`가 "contacts 전부의 [zoneStart, passEnd]"와 지붕 착지 ±1박(닫힌 구간, 지금 코드와 같음)을 건너뛰게. 12절 "미루지 않음" 문장·키 삭제. art `sound-check`가 같은 정의로 FAIL 검사(hold 단계는 착지 박·roof_out 박 기준 둘 다 허용). 그림 연출(큰 표지 0.4 s)은 판정 프레임 그대로라 늦어지는 것은 소리뿐. **다시 확인(19:42 judge.mjs·levels)**: sound-check 화음 15번 위반 0 — 코드 반영됨. 20-balance 12절 화음 행·451행 ③ 문구와 `balance.json combo.chord_timing`(`at: next_downbeat_after_contact_beat`, `defer_to_rest_first_beat: false`)·`_note`는 19:43 기준 아직 옛 규칙 글 |
| B2 | minor | balance-designer | **바탕 단계 식이 옛 것**: 6-1 "바탕 단계 = n번째 받침 쉼 min(n, 3)(art)". art 식은 1 + round(2(n−1)/(P−1)) — L7(받침 쉼 2개)이 min 식은 1·2, art 식은 1·3 | `20-balance.md` 6-1, `30-art.md` 2-2, `layout.mjs --check bg_stage`(L07 13) | R2-D4: 문서·검증기 둘 다 art 식으로. 다시 확인(19:43): 20-balance 6-1 아직 옛 식 |
| B3 | minor | balance-designer | **클리어 감속(R2-D5) 시각 메모**: 그림만 감속하면 그린 길은 판정 멈춤 박(B + 2)보다 1박 늦게(B + 3 박 시각) 멈춤. 끝 구름 [B + 1, B + 3]이 그 사이 공 자리를 늘 덮음(art 검사 10레벨 통과). 6-4 표 "B + 2 박 길 멈춤"에 "그림은 1박 감속 뒤 멈춤(art)"을 덧붙이면 dev·QA 스크린샷 시각이 헷갈리지 않음 | `20-balance.md` 6-4, `layout.json world.scroll_stop`(draw_only, 그린 박 = stop − 1 + u − u²/4) | 문서 한 줄 |
| B4 | minor | balance-designer | **지붕 0.6박 전 덮기(R2-D5) 그림 확인**: 앞 hit 순간(착지 − 1박) 지붕 왼쪽 끝은 북 가운데에서 0.4박 오른쪽 = 360x640 28.8 px · 412x915 33.0 px · 640x360 51.2 px · 1280x720 102.4 px. 북 반폭 1.6d(44.8 / 51.2 / 38.4 / 70.4 px)보다 작은 세로 두 화면에서는 지붕 끝이 **북 몸통 오른쪽 16~18 px 위**에 이미 와 있지만, 공(반폭 0.54d) 위는 14~17 px 비어 있음. "지붕 밑에서 칠 일"은 생기지 않음 | `balance.json objects`·levels `roof_in_beat`, `layout.json world.roof`(x = [beat_in, beat_out] 그대로, 여유 0) | 승인. 그림에 여유를 더하지 않음(art 3-2 그대로). 바꿀 것 없음 |
| B5 | minor | balance-designer | 지붕 밑 bob = 착지 +2박부터(쉼 2박이면 콩 없음)인 데이터와 balance 6-2 표는 맞음. 5-1 "까딱은 착지 +2박부터"도 같음. **art 문서가 "다음 박부터"로 잘못 적었음** → art가 고침(A2). balance 할 일 없음 | levels `roof_sits.bob_beats`(예 L5 [30] @ 착지 28) | 확인만 |

### 세 역할 공통 (R2-D8)
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| D1 | major | orchestrator, lore-writer, balance-designer, art-director | **rhythm-01 구분 표가 rhythm-01 옛 코어 기준**: 세 문서(10-lore 8-1, 20-balance 2절, 30-art 10-1)가 rhythm-01을 "궤도·별·보여 주기 마디·북채·카운트인"으로 비교함. rhythm-01은 round-3에서 **"북길"**: 오른쪽에서 흘러오는 별이 왼쪽 판정 선(가로 0.30 W)에 닿을 때 톡, 공은 판정 선 위에서 박마다 착지(rhythm-01 `30-art.md` 16절, 19:22 저장). 이제 "오른쪽에서 흘러와 왼쪽 0.30 W 자리에 닿을 때 톡"은 runner-01·rhythm-01·rhythm-02 세 게임 공통 구조. 남는 차이는 탭의 결과(공을 쳐 올림 vs 메트로놈 공), 판정 자리(북 다리 밑 vs 세로 판정 선), 표식(파란 돔 vs 노랑 별), 박 눈금 유무, 화면 높이 쓰임(세로 튐 vs 가운데 가로 띠), 지붕·가지·구름·언덕 물체 | `projects/rhythm-01/30-art.md` 16-1, `projects/rhythm-01/STATUS.md`(round-3 북길), 세 문서 구분 표 | art는 `30-art.md` 10-1b(북길 대조 표)를 새로 씀. lore 8-1·balance 2절에 같은 행(탭의 결과·판정 자리·표식·박 눈금·화면 구도·물체 어휘) 추가. **겹침 자체(두 팀이 같은 흐름 구조)는 오케스트레이터가 판단**(두 프로젝트 오케스트레이터 사이 확인 필요) |
| D2 | minor | art-director, lore-writer, balance-designer | 그 밖 세 문서 대조: 탭의 결과·칠지 말지·시작 소리(카운트인 ↔ 콩)·판정 반응·등급(작은 북 ↔ 구름 3칸)·실패(별 두 조각 ↔ 공 떨어짐)·runner-01 허용 겹침(흐름·왼쪽 고정·지붕 = L7 매달린 위험)·금지 모양(가시·블록·발판·고리·포털)은 어긋남 0. **art 표에만 틀린 칸 2개**: ① runner-01 "카메라 x ≈ 0.37" — runner-01 값은 플레이어 x ≈ 0.30 W(0.37은 레퍼런스 실측) ② runner-01 앞쪽 "약 2.7박"은 근거를 찾지 못함 ③ rhythm-01 콤보 "궤도 바깥 HUD"는 지금 "HUD 띠 안 원 점 + 원 큰 표지". balance 2-1의 "1.1 s 재시작" 겹침 행이 art·lore 표에 없음 | `30-art.md` 10-1·10-2, `projects/runner-01/00-benchmark.md`(x ≈ 30 %, 실측 37 %), `projects/rhythm-01/30-art.md` 16-4 | art가 고침(A8). lore 8-2에 "1.1 s 자동 재시작 = 허브 공통"을 한 줄 넣을지 lore 판단 |

### R2-D9 (오케스트레이터 추가 지시, lore 교차 리뷰 major 1: 가지 밑 표시 수)
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안·처리 |
|---|---|---|---|---|---|
| A9 | major | art-director | 가지 그림이 판정 구간 [앞 hit 접촉, 마지막 반박]과 같은 폭이라 들어가는 표시·마지막 표시가 가지 끝에 반쯤 걸려 촘촘한 표시가 3·5개로 보였음. 카드 `card_double`·`card_roll`도 같음 | lore 교차 리뷰 이슈 1, levels 06~10 가지 | balance가 같은 시간에 데이터를 [첫 반박 − 0.25박, 마지막 반박 + 0.2박]로 바꿈(19:46, 19:50에 + 0.17박, `balance.json objects.branch`). art 카드는 그 값을 읽어 그림. art는 **그 구간 그대로(좌우 여유 0)** 그리고 검사 추가: `layout.mjs` 4해상도 × 가지 6개 모두 "가지 밑 완전히 든 표시 2/2·4/4, 반쯤 걸침 0", `cards.mjs` 칸마다 같은 검사(`card_double` 2·2·0, `card_roll` 3(칸 밖 1)·4·0). 카드 칸 2 = 첫 반박 표시에서 손가락, 카드 앞쪽 2.5 → 1.9박(가지 뒤 끝 0.17박 × 77.4 = 13.2 px ≥ 표시 반폭 + 외곽선 13 px) |
| B6 | major | balance-designer | **R2-D9 구간 뒤쪽 +0.2박(19:50 판 +0.17박) 때문에 가지 뒤로 나가는 공이 가지 오른쪽 끝을 스침**. 공을 원 모양 그대로 재면(가장자리는 원 옆면 높이) 4해상도 모두 여유 0.25d 미만, **L6 둘째 가지(43.25~44.17박, 뒤가 2박 비행)는 360x640 −32 px·412x915 −40 px(+0.17박 판)로 공이 가지를 뚫고 지나감**. 1-1 구간(뒤 끝 = 마지막 반박)에서는 생기지 않던 문제 | `layout.mjs --check` 대기 줄, 계산: 1박으로 나가면 아랫면 ≥ 0.33·Hp(post 0.2)·0.32(post 0.17), 2박으로 나가면 ≥ 0.42·Hp | balance 결정: ① 가지 아랫면 0.30 → 0.34·Hp(반박 공 윗점과 여유는 충분) ② 가지 바로 뒤는 1박 비행만(L6 둘째 가지 "→ 2" 바꿈) ③ post 0.17박(360 폭 표시 반너비 + 외곽선 = 0.169박, 빠듯). ①+② 권장. art 그림은 데이터 그대로라 바꿀 것 없음. 지금 `layout.mjs`는 "대기(balance 데이터)"로 표시 |

### art (내 쪽 — 이 1-2에서 고침)
| # | 심각도 | 담당 역할 | 내용 | 근거 | 처리 |
|---|---|---|---|---|---|
| A1 | major | art-director | **카드 4장이 레벨 첫 등장과 달랐음**(insights "튜토리얼 그림 = 실제 첫 물체"): 물체 폭 구름 4박(실제 2박), 큰 언덕 3박(실제 1.5박, 위치도 접촉 − 2.25 ~ − 0.75가 아님), 지붕 2.5박(L5 첫 지붕 1.6박). 칸 1 공 상태: `card_three`는 내려오는 공(실제 = 받침 쉼에 앉은 공 → 토스), `card_double`·`card_roll`은 낮은 공(실제 = 2박 비행으로 높이 내려옴), `card_big`은 먼 표시 뒤가 또 먼 표시(실제 "1 1 2 1 1") | levels 02·03·05·06·07·08 `objects`·`first_of_gimmick`, `cards.mjs DEFS` | 6장 칸 다시 그림(`card_bounce`·`card_dot`는 그대로). `cards.mjs --check`에 "카드 물체 폭 = 레벨 첫 등장 물체 폭" 검사 추가(구름 2 · 지붕 1.6 · 가지 1 · 언덕 1.5 · 긴 가지 2박, 통과). 칸 안 검사·카드 속 공 ≥ 16 px 그대로 통과 |
| A2 | minor | art-director | 30-art 5-3·9-1 "지붕 밑 다음 박부터 까딱 + 콩", sound-check 합성 사례(착지 12, bob 13·14)가 balance 데이터(착지 +2박부터)와 다름. 실제 곡 음은 `bob_beats`를 읽어 문제 없었음 | levels `roof_sits.bob_beats`, `20-balance.md` 6-2 | 문서 정정, 합성 사례 = 착지 12·쉼 4박·bob 14·15·토스 16(12·13 무음) |
| A3 | major | art-director | 레벨 선택 최고 콤보 표지·최고 기록 막대 요소가 카드 버튼 안으로 읽힘(R2-D7) | `cards.mjs levelCard`, `30-art.md` 6-2·11-1 | 오케스트레이터 추가 지시대로 **화면 자리는 그대로(네모 = 카드 오른쪽 위, 막대 = 카드 아래쪽 안), DOM은 같은 칸의 버튼 옆 형제 요소**로 30-art 6-2·11-1·`layout.json text_slots.best_combo_mark`에 적음. (한때 그림을 카드 밖 아래로 옮겼다가 지시에 따라 되돌림 — 목업은 원래 자리) |
| A4 | minor | art-director | HUD 콤보 대체 글 규칙이 art 데이터에 없음 | R2-D7 | `layout.json hud.combo_a11y`(meter · valuetext 숫자만 · live 없음), 30-art 6-2 행 |
| A5 | minor | art-director | R2-D1: `card_twoballs*.svg` 2장, `obj-second-ball.svg` 남음 | `cards.mjs RESERVE_CARD_FILES` | 지움. 예비는 30-art 5-3 문장에만 |
| A6 | major | art-director | R2-D2: sound-check 화음 시각이 정보 출력뿐 | `sound-check.mjs` 5절 | 규칙 검사(정박·접촉 창 밖·지붕 ±1박 밖·첫 정박·chordMs = 박 × 1박)로 바꾸고 위반이면 FAIL. balance가 B1을 고치면 통과 |
| A7 | minor | art-director | R2-D5: 클리어 감속을 "balance 함수 또는 그림" 미정으로 둠 | `layout.json world.scroll_stop` | draw_only + 곡선(u − u²/4, 속도 튐 없음), 끝 구름 검사를 그린 박으로 |
| A8 | minor | art-director | R2-D8: 10-1이 rhythm-01 옛 코어 기준, 10-2 runner-01 칸 2개 틀림 | D1·D2 | 10-1b 북길 대조 표 새로, 10-1 콤보 칸·10-2 플레이어 x·앞쪽 박·재시작 행 정정 |

## 잘 된 점 (유지)
- lore 레벨 이름·장소가 그 레벨 새 물체와 짝(작은 마을 = 지붕, 물웅덩이 = 낮은 가지 찰방, 바람개비 언덕 = 큰 언덕, 딱따구리 나무 = 긴 가지)이고, "배경이 위험 물체를 닮지 않게"가 art 실루엣 v2와 같음(L5 지붕 없는 집, L7 배경 언덕 대신 들 띠, L8 세모 잎).
- 카드 문구 횟수 = 그림 횟수(톡톡 2, 톡톡톡톡 4, 셋 = 3박, 쉬어요 = 앉은 공 + 떨어진 손), 지붕을 "조심·치지 마"로 부르지 않음 — art 차양·퐁 연출과 같은 톤.
- balance 물체 높이(0.45/0.30/0.30/0.9)와 덮는 구간을 데이터(`objects`)로 주어 art 검사(V22·V23·layout)가 같은 원본을 씀. 0.6박 전 덮기의 이유(앞 hit 때 지붕 밑에서 칠 일이 없게)가 그림으로도 성립함(B4).
- 콤보 = grades 길이 하나라 그림 연출 시각(hit = 친 순간, hold = roof_out)이 S9와 겹치지 않음.
