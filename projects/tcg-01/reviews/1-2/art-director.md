# 리뷰: art-director · 1-2 교차 리뷰 (lore·balance ↔ art)

## 확인한 것
- 읽은 파일: `10-lore.md`(2-7 용어, 4절 영웅, 5-3 혈통, 6절 키워드, 8절 UI 키), `lore/cards-lore.json`, `20-balance.md`(3절 규칙, 9-4 템포), `balance.json`(rules·tempo), `cards.json`(200장 수치·kind·keywords·lineage), 내 `30-art.md`·`art.json`
- 실행: `node tools/art/build.mjs` (종료 0) — 필드 5칸·손패 10을 `balance.json`에서 읽어 4해상도 배치 재계산, 200장 글·이름 맞춤 검사, 대비 66쌍
- 본 스크린샷(Edge 헤드리스): `assets/samples/sheet.html`(실제 수치 카드 10장 × 확대·손패·보드), `assets/samples/mockups.html`(4해상도 대전 + 팩 개봉)

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | major | balance-designer | 큰 카드 연출 시간 불일치: balance 2000 ms, art 1800 ms | `balance.json tempo.big_card_anim_ms`, `art.json tempo.actions.big_entry.normal_ms` | art가 원천(balance 노트도 "연출 시간 원천은 art.json")이므로 1800으로. 판 시간 식에는 `art.json tempo.summary_for_balance`를 쓰기 |
| 2 | major | balance-designer | `lethal_slowmo_ms 800`이 art의 어느 값인지 불명: art는 마지막 일격 전체 1500 ms(그중 느린 동작 400) | `balance.json tempo`, 30-art 5-2 | 키를 `lethal_blow_ms: 1500`으로 바꾸거나 summary 값 참조 |
| 3 | minor | balance-designer | `action_anim_ms 600`은 art 가중 평균 550보다 9 % 큼(보수적이라 판 시간 상한 쪽으로 안전) | 30-art 5-8a | 유지 가능. 정밀 계산 때 550 |
| 4 | minor | balance-designer | `animation_budget_per_action_ms 900`에 tier 3 예외(큰 카드 1800·마지막 일격 1500·승패 1800)가 적혀 있지 않음 → qa가 위반으로 셀 수 있음 | `balance.json rules`, 30-art 5-3 | rules 노트에 "tier 3 예외는 art.json tempo.tiers" 한 줄 |
| 5 | minor | balance-designer | 노트 "칸당 약 68 px"는 간격을 안 뺀 값. 실제 360 폭 칸 64 px(여백 8×2·간격 6×4), 보드 숫자 17 px | `balance.json rules.board_slots_note`, `art.json layout.screens.360x640` | 노트를 64 px로 |
| 6 | minor | game-developer | 엔진 키워드 id(guard·rush·charge·stealth·shield·lifesteal·deadly)와 lore/art 키워드 id(breakwater·spur·rapids·seamist·saltskin·draught·drown)가 다름 | `cards.json keywords`, `art.json palette.keywords` | 대응표 `tools/art/assets.mjs ENGINE_KW`를 그대로 사용. 엔진 id는 화면에 절대 쓰지 않기(레퍼런스 영문 키워드와 같은 낱말) |
| 7 | minor | lore-writer | UI 키 이름 `coin_first`·`coin_second`의 "coin"은 화면에 안 나오지만 동전형 후공 보상(blocker 목록)과 같은 낱말 | `10-lore.md` 8-5 | 키를 `call_order_first`·`call_order_second`로 바꾸면 grep 검사에서 오탐 0 |
| 8 | minor | lore-writer | 개명 중인 "즉시 공격 응답자" 갈래 이름은 art 문서·에셋 파일명에 쓰지 않음(확인 완료). 키워드 「급류」 자체를 바꾸면 `assets/kw-rapids.svg`와 `art.json palette.keywords` id를 함께 바꿔야 함 | `assets/kw-rapids.svg` | 키워드 이름이 바뀌면 알려 주면 art가 재생성 |
| 9 | fixed | art-director | 내 연출 표의 공격 연출 이름이 레퍼런스 키워드 공식 한국어 번역어와 같은 낱말이었음 | 30-art 5-2(1-1판) | "달려들기"로 바꿈 |
| 10 | fixed | art-director | 원작 닮음 재점검 3곳: 호명자 명줄이 초상 오른쪽 아래(레퍼런스 체력 자리), 카드 키워드 아이콘이 그림 아래 가운데(레퍼런스 희귀도 보석 자리), 가로 화면 숨 고르기가 오른쪽 가운데(레퍼런스 턴 종료 자리) | 30-art 9절 | 명줄 = 아래 가운데 [껍질\|명줄] 판, 키워드 = 왼쪽 정렬, 가로 숨 고르기 = 오른쪽 아래 |
| 11 | fixed | art-director | 카드 샘플이 자리 채움 수치였음, 보드 토큰을 의식 카드로도 만들어 "null" 표시 | `assets/samples/card-*-token.svg`(1-1판) | `cards.json` 수치·kind·혈통으로 재생성, 토큰은 응답자만 |

## 잘 된 점
- balance 판 시간 식이 art `tempo.ai_turn` 값을 그대로 씀: AI 행동당 830 ≈ art 825, AI 턴 고정 1400 = art 1400, 턴 넘김 900 = 배너 900 — 두 문서가 한 원천을 공유함.
- balance 확정값(5칸·손패 10·턴 50 s·경고 15 s)이 art 가정과 같아 배치를 바꿀 필요가 없었음. 4해상도 겹침 0, 터치 48 px 이상, 손패 10장 펼침 카드 65/76/58/122 px.
- lore 글 규칙(70자 이내) 덕분에 200장 모두 확대 보기 13 px·4줄(의식 5줄) 안에 들어감(축소 0장). 가장 긴 이름 10자도 17 px.
- 혈통(`lineage`)이 balance에 들어와 카드 종류 줄을 "응답자 · 파수병"처럼 표시하게 함.

## 점수
- 영역: 시각·사운드 (기획 단계 교차 리뷰라 채점 대상 화면은 목업)
- 체크 항목 통과: 해당 항목 4 / 4 (대비 4.5:1, 4해상도 겹침 0, 48 dp, 연출 시간 표 존재·balance와 대조). 빌드 실측 항목(±15 %, 오프라인 렌더)은 빌드 전이라 제외
- 점수: 8 / 10 (art 쪽 문제는 고쳤고, balance 템포 값 2개만 맞추면 됨)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목: (tcg-01) 연출 시간을 쓰는 다른 문서(balance 판 시간 식 등)는 `art.json tempo` 키를 직접 참조하고, 같은 뜻의 값이 두 파일에 다르게 있으면 major

VERDICT: REVISE (balance 이슈 1·2 반영 후 PASS)
