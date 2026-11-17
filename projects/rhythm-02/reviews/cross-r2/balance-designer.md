# 리뷰: balance-designer · round-2 1-2 교차 리뷰 (흘러오는 길 + 콤보)

관점: 수치·레벨·판정·타이밍·검증. art(`30-art.md`·`assets/`)·lore(`10-lore.md`·`strings.json`)가 balance.json·levels와 같은 값을 쓰는지, 문구가 실제 기믹 동작과 맞는지 봅니다. 1-2는 교차 리뷰와 1회 수정을 함께 하므로 balance 몫은 리뷰를 쓰면서 고쳤고 "처리" 칸에 적었습니다. 점수 없음(형식은 `harness/templates/review.md`에서 점수 절만 뺌).

## 확인한 것
- 오케스트레이터 `Docs/orchestrator/2026-11-17-r2-planning-supervision.md`(1-2 안건 1~8, R2-D1~D8) + 작업 중 추가 지시 R2-D9(가지 밑 표시 수), art 교차 리뷰 major(가지 끝 스침)·문서 잔여·R2-D8 rhythm-01 북길
- art: `30-art.md` 전부, `assets/layout.json`(world·hud·combo·bg_stage·fail_fx·clear_timeline), `assets/sound.json`(onset_rule.roof), `assets/cards/` 목록, `tools/art/layout.mjs`·`sound-check.mjs`(읽기·실행만), `reviews/cross-r2/art-director.md`
- lore: `10-lore.md` 전부, `strings.json`(84키), `reviews/cross-r2/lore-writer.md`
- 기준: `harness/insights.md`(콤보 대체 글 줄 포함), `harness/criteria.md`, `harness/benchmarks/djmax-judgement.md` 4절
- **스크립트 대조**(scratchpad `xcheck.mjs`, node, 파일 쓰기 없음): 북 x 0.30, 앞쪽 4/3.5박 → 1박 px 4해상도(art 4-3 표 63/72·112/128·224/256 = balance 식), HUD 띠 56/48 + gap 2, 물체 높이(지붕 0.45·가지·언덕 0.30·구름선 0.9), 지붕 덮기 0.6박(지붕 14개 모두), 콤보 갱신 1.0→1.15→1.0 120 ms·단계 5 120 ms/10 0.4 s/20 0.6 s·소리 이름·끊김 ≤ 0.3 s·콤보 2부터, 지붕 콩 0.45 s, 끝 구름 [B+1, B+3]·멈춤 B+2, 지붕 밑 bob(착지 +2박부터), 카드 키 8 = strings = 그림 16장, 큰 언덕 접촉 4곳의 비행 3박
- 검증기 전체 실행(마지막 데이터): 413개 PASS 413 · 대기 0 · FAIL 0 / art `check-all.mjs` 5개 OK·대기 0

## 스크립트 대조 결과 요약
| 항목 | balance | art | lore | 판정 |
|---|---|---|---|---|
| 북·공 가로 자리 | `scroll.drum_x_ratio` 0.30 | `drum.x_ratio_ref` = balance | "화면 왼쪽(0.30 W)" | 같음 |
| 앞쪽 박 | L1~L4 4 · L5~L10 3.5 | 4-3 표 1박 px = (1−0.30)·W/앞쪽 박 | − | 같음(4해상도) |
| HUD 띠 | V23이 `hud.band_h` 읽음 | 세로 56·가로 48, gap 2 | − | 같음. 20-balance 11절 "58 px" = 56 + gap 2라고 적음(처리) |
| 물체 높이 | 지붕 0.45 · 가지 **0.34(1-2)** · 언덕 0.30 · 구름선 0.9 | layout이 balance 값을 읽음(`under_ref` 문구만 "(0.30)") | 3절 W5 "아랫면 0.30 Hp" | 값은 같음, 문구 2곳 낡음(X3·X6) |
| 지붕 덮기 | 착지 − 0.6박 | `roof.x` = [beat_in, beat_out] 그대로 | − | 같음 |
| 콤보 연출 시간 | `combo.update_pop`·`stage_fx` | `layout.json combo` | − | 같음 |
| 콤보 화음 시각 | **1-2 R2-D2 규칙**(C2) | `combo.stage.*.sound` 문구·sound-check 규칙 검사 = R2-D2 | − | 같음(sound-check OK) |
| 바탕 단계 | **1 + round(2(n−1)/(P−1))**(1-2, V24) | `bg_stage.rule` 같은 식 | − | 같음 |
| 클리어 감속 | `scrollBeatAt` B+2 그대로 | `world.scroll_stop` draw_only, ease 1박 | − | 같음(R2-D5) |
| 카드 키 | `gimmicks.*.card` 8개 | 그림 8장 × 2판, twoballs 삭제 | strings 8키, twoballs 삭제 | 같음(V7b PASS) |

## 안건별 결론
| 안건 | 결론 | 이슈 |
|---|---|---|
| 1 V7b | art·lore가 `card_twoballs` 키·그림을 지움 → V7b PASS(대기 0) | − |
| 2 X-B2 화음 시각 | balance `comboEvents`가 R2-D2 규칙으로 바뀜, 검증기 C2 + art sound-check 둘 다 통과 | B1 |
| 3 q_nogo 의존 | q 0·0.15 둘 다 L3~L10 엄격 단조(B7q 새 검사) | B2 |
| 4 바탕 단계 | `judge.mjs bgStage` = art 식, V24 | B3 |
| 5 감속·0.6박·270 | 문서 반영(6-4·8-4·4-1) | B4 |
| 6 W0 이름 "표시" | 그림(반원 돔)과 이름 맞음, balance 영향 없음 | − |
| 7 콤보 대체 글 | lore·art가 meter·valuetext 숫자만으로 고침(10-lore 6절 4·30-art 6-2) | − |
| 8 구분·관계 표 | rhythm-01 round-3 북길 기준으로 balance 2절 다시 씀, art 10-1b와 같음, **lore 8-1은 아직 옛 궤도 기준** | X1 |
| R2-D9 가지 밑 표시 | 데이터·검증기(V25) 반영, art 검사도 통과 | B5 |

## 이슈

### art
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| X3 | minor | art-director | `layout.json world.branch.under_ref` 문구가 "(0.30)"으로 남음. balance 값은 1-2에서 0.34(가지 끝 스침 해결, art 권장안 채택) | `balance.json objects.branch.under_of_Hp` 0.34, layout `world.branch.under_ref` | 문구만 0.34로. 값은 balance를 읽으므로 검사·그림 영향 없음 |
| X4 | minor | art-director | 30-art 9-3 마지막 문단 "콤보 화음 … 19번 중 13번이 다음 hit 접촉과 같은 순간"이 1-1 규칙 기록으로 남음. 지금은 0번(C2·sound-check 둘 다) | `30-art.md` 9-3, 검증기 C2 | "1-1 규칙에서는 …, R2-D2 뒤 0번"으로 |
| X5 | minor | art-director | 가지 그림 좌우 여유 `side_margin_of_d`를 다시 늘리면 앞 표시가 가지에 걸림: 360x640에서 앞 표시 ↔ 가지 끝 6.8 px = **0.24d가 상한**. 뒤쪽은 + 0.2박이라 밑 표시 가장자리 여유 3.2 px | 검증기 V25(layout 값을 읽음) | 여유를 바꾸면 V25로 확인(지금 0, 통과) |
| X7 | minor | art-director | lore 교차 리뷰 4①: runner-01 허용 겹침 표(30-art 10-2)에 "1.1 s 재시작" 행이 없음(balance 2-1·lore 8-2에는 있음) | `30-art.md` 10-2, `20-balance.md` 2-1 | 행 하나 추가(값 다름 없음) |

### lore
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| X1 | major | lore-writer | **R2-D8: 10-lore 8-1이 rhythm-01 옛 코어(궤도·별·보여 주기 마디·카운트인 "똑딱") 기준.** rhythm-01은 round-3 "북길"(오른쪽에서 흘러오는 별이 왼쪽 0.30 W 판정 선에 닿을 때 톡, 공은 박마다 착지). balance 2절·art 10-1b는 새 코어로 고쳤고 축이 같음(탭의 결과·판정 자리·표식·박 눈금·화면 구도·물체·지붕 쉬기·실패·재시작). lore 8-1 "앞을 보는 단서: 궤도 위 별, 보여 주기 마디"·"움직임: 궤도, 빙글"은 지금 사실과 다름 | `10-lore.md` 8-1, `20-balance.md` 2절, `30-art.md` 10-1b, rhythm-01 `20-balance.md` 17장 | 8-1을 새 코어 기준으로(용어 구분 "별·궤도 안 씀"은 그대로 유효). "흘러옴·왼쪽 고정 자리"는 두 게임 공통이 된 겹침이라 오케스트레이터 안건으로 적기 |
| X6 | minor | lore-writer | 3절 W5 "지붕보다 낮게(아랫면 0.30 Hp)" — 1-2에서 0.34로 바뀜. 소유권 원칙(수치는 balance)상 lore 문서에서는 숫자를 빼는 편이 안전 | `10-lore.md` 3절 W5, `balance.json objects.branch` | "지붕보다 낮게"만 남기고 숫자 삭제 |
| X2 | minor | lore-writer | **"큰 언덕은 셋 세고 톡"의 셈 시작점.** 큰 언덕 비행은 3박이고 판정은 셋째 박. 공이 떠나는 순간을 "하나"로 세면 "셋"이 1박 일찍(−0.5 s, 바깥 끝 −0.33 s 밖이라 무시 탭) — 실패는 아니지만 그 뒤 다시 쳐야 함. 첫 큰 언덕(L7)은 받침 쉼 토스로 들어가 "토스 다음 박 = 하나"로 세기 쉽고, L7 둘째·L9·L10은 앞 hit 뒤라 같은 규칙. 카드 그림(표시 간격 3박)과는 맞음 | levels 07·09·10 접촉 `bounce three`(gap 3), 20-balance 4-1 "1박 이른 탭 = 무시" | 문구는 그대로 두고(12자 한도), 카드 그림 칸 2에 박 점 3개(하나·둘·셋)를 표시 간격 위에 두는지 art와 확인. QA 아동 관찰 항목에 "셋을 언제부터 세는지" |
| X8 | info | − | **"긴 가지 밑엔 톡톡톡톡"·"가지 밑에선 톡톡"**: R2-D9 전에는 가지 구간에 들어가는 표시·마지막 표시가 반쯤 걸려 3·5개로 보였음(lore 이슈 1). 지금은 4해상도 모두 가지 밑에 완전히 든 표시 = 2·4, 앞·뒤 표시 걸침 0(V25), 실제 반박 탭도 2·4번 | V25 출력 | 해결 |
| X9 | info | − | **"지붕 밑에선 쉬어요"**: 지붕 밑 착지에 표시 없음, 착지 ±1박 소리·연출 0(S9·S9m), bob은 착지 +2박부터, hold 칸은 roof_out — 문구 "쉬기"와 동작이 같음 | S9, levels roof_sits | 해결 |

### balance (내 쪽 — 이 1-2에서 고침)
| # | 심각도 | 담당 역할 | 내용 | 근거 | 처리 |
|---|---|---|---|---|---|
| B1 | major | balance-designer | 콤보 화음이 1-1 규칙("다음 정박, 지붕 ±1박만 피함")이라 19번 중 13번이 다음 접촉과 같은 순간(art X-B2·B1) | 1-1 `comboEvents`, 공통 문서 4-4 | **R2-D2 규칙**으로: 판정 접촉 다음 정박부터 어떤 접촉의 [놓침 구역 시작, 통과 창 끝](nogo는 통과 창)·지붕 착지 ±1박(닫힌)에 들지 않는 첫 정박. 마지막 접촉 통과 창 끝 전에 없으면 화음 없음(`chordSkip 'clear'`, 큰 튐 클리어 소리와 겹침 방지). 검증기 **C2**(judge = 독립 계산), `balance.json combo.chord_timing`·20-balance 12절. 결과: 화음 14개 모두 위험 구간 밖, 늦음 최대 6박, L2~L6 20단계 화음 없음(그림만) |
| B2 | major | balance-designer | 곡선이 q_nogo 0.15 가정에 기댐(q 0이면 L4 > L5, L8 ≈ L9) | 1-1 9-4 | **R2-D3, 패턴 교체 우선**: L4 −1 hit("1.5 1.5 1 1 1") + 폭 288, L5 +2, L6 +2(가지 뒤 1박), L7 구절 나눔 +1, L9 +1, L10 반박 짝 → 1박 통(같은 수). 지붕 수·L8~L10 폭 270 그대로. 표본 4만 → 10만. **q 0: 3.88 < 4.35 < 4.74 < 5.60 < 5.88 < 6.42 < 7.13 < 7.68 / q 0.15: 3.88 < 4.35 < 6.60 < 7.67 < 8.12 < 8.70 < 11.73 < 12.25**, B6 L10 12.25(T 12.31, −0.5 %), 시드 4개 모두 B7·B7q 통과. 검증기 **B7q** 새로 |
| B3 | minor | balance-designer | 바탕 단계가 옛 식 min(n, 3)(20-balance 6-1·`rest.bg_stage_rule`), 검증기에 계산 없음 | art B2 | `judge.mjs bgStage`·`bgStages` + **V24**(art layout 식과 대조), balance.json·6-1 갱신. L1 1·2·2·3, L2~L10 1·2·3 |
| B4 | minor | balance-designer | 6-4에 그림 감속(R2-D5) 시각이 없음, 클리어 구름/끝 구름 용어 혼용(lore 4②) | art B3, lore 이슈 4 | 6-4에 "그림은 1박 감속 뒤 멈춤(판정 함수 불변)", 문서 용어 "끝 구름"으로 |
| B5 | major | balance-designer | (R2-D9) 가지 구간 [앞 접촉, 마지막 반박]이라 가지 밑 표시가 3·5개로 보임. 1차 수정(뒤 + 0.17박)에서는 가지 끝을 나가는 공이 원 모양 기준으로 끝을 스침(art B6, L6 둘째 가지 32 px) | lore 이슈 1, art B6 | 구간 **[첫 반박 − 0.25, 마지막 반박 + 0.2]**, 아랫면 **0.30 → 0.34·Hp**(art 권장안), **가지 뒤 비행은 1박만**(V6 ②, L6 ".5 .5 2" → ".5 .5 1 …"). 검증기 **V25**(가지 밑 표시 2/4·걸침 0, layout 값 반영), **V22를 원 모양 공·공 너비 ±d/2로**. art layout 검사 대기 0 |
| B6 | minor | balance-designer | 20-balance 2절 rhythm-01 표가 옛 코어 기준(R2-D8) | art D1 | 북길 기준으로 다시 씀(art 10-1b와 같은 축), 남는 겹침은 오케스트레이터 안건(K19) |

### 세 역할 공통 (R2-D8 대조)
| # | 심각도 | 담당 역할 | 내용 | 제안 |
|---|---|---|---|---|
| D1 | major | orchestrator | rhythm-01 북길과 "오른쪽에서 흘러와 왼쪽 0.30 W 자리에 닿을 때 톡"이 겹침. balance가 지킨 구분: 탭이 공을 올림(높이 = 시간)·지붕 쉬기·물체 어휘. runner-01 관계(2-1)는 세 문서 어긋남 0 | 오케스트레이터가 두 프로젝트 겹침 판단(art D1과 같은 안건) |

## 잘 된 점 (유지)
- art layout이 높이·덮기·콤보 시각 값을 balance에서 읽어(`*_ref`) 숫자가 두 곳에 따로 있지 않음 — 1-2에서 가지 높이를 바꿔도 art 검사가 바로 새 값으로 돌았음.
- art sound-check가 R2-D2 규칙을 같은 정의로 독립 검사해 balance C2와 결과가 같음(두 도구 교차 확인).
- lore 카드 문구 횟수(톡톡 2·톡톡톡톡 4·셋 3박·쉬어요)가 데이터와 맞고, 숫자 없는 콤보 대체 글이 insights와 같아짐.
