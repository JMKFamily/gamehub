# 교차 리뷰: lore-writer · round-2 1-2

- 관점: 텍스트 키·이름·용어, 글 없이 이해되는지, 5~6세 말. 화면에 보이는데 키·대체 글이 없는 것, 문서들의 화면 용어가 10-lore 3절 모양 이름과 같은지, 카드 문구와 실제 기믹 동작(balance 레벨 데이터)이 맞는지.
- 1-2는 교차 리뷰와 1회 수정을 같이 합니다(오케스트레이터 결정). lore 쪽 문제는 이 리뷰와 같은 때에 `10-lore.md`·`strings.json`에서 고쳤고, 처리 결과를 "처리" 칸에 적었습니다. 점수 없음(1-2), 형식은 `harness/templates/review.md`에서 점수 절만 뺐습니다.

## 확인한 것
- 오케스트레이터: `Docs/orchestrator/2026-11-17-r2-planning-supervision.md`("1-2로 넘기는 안건" 1~8, 결정 R2-D1~D8)
- balance: `20-balance.md`(0·1·2·2-1·3·4-3·5-2·5-3·6-2·6-4·6-5·8-1~8-4·12·16절), `balance.json`(`gimmicks`·`combo`), `levels/01~10`(카드 `card.id`·`new_gimmick`, `objects` 중 지붕·가지·구름·언덕, 가지 구간과 표시 박), `tools/verify-levels.mjs` 전체 실행(읽기만)
- art: `30-art.md`(0~17절), `assets/layout.json`(`world`·`combo`), `assets/cards/` 16장 목록 + `card_double.svg`·`card_roof.svg` 그림(브라우저로 보기만), `assets/icons/` 21개 목록, `mockup-level-select.svg` 주석
- 빌드(읽기만): `games/rhythm-02/js/main.js` `buildGrid`(레벨 카드 대체 글 구조)
- 다른 게임 문구(읽기만): `projects/rhythm-01/10-lore.md`(콤보 대체 글), `projects/runner-01/10-lore.md`(콤보 대체 글), `games/rhythm-01/data/strings.json`, `games/reverbound/data/strings.json`
- 기준: `harness/insights.md`(5~6세·텍스트 절 콤보 대체 글 줄, 반대 행동, 튜토리얼 그림 = 실제 첫 물체), `harness/criteria.md`(세계관·텍스트, 콤보 줄)

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 | 처리(lore) |
|---|---|---|---|---|---|---|
| 1 | major | art-director·balance-designer | **가지 밑에 보이는 촘촘한 표시 수가 카드 문구 횟수와 다르게 읽힘.** 모든 가지 물체가 [앞 hit 접촉 박, 마지막 반박 접촉 박]으로 그려져(좌우 여유 0), 가지로 들어가는 표시(앞 비행 착지)와 마지막 표시가 **가지 양 끝에 반쯤 걸림**. 가지 밑 판정은 2개(W5)·4개(W7)인데 화면에는 가지에 닿은 촘촘한 표시가 3개·5개로 보이고, 실제 리듬도 반박 간격 탭이 3번·5번 이어짐. 카드 "가지 밑에선 톡톡"(누름 표시 2)·"긴 가지 밑엔 톡톡톡톡"(4)을 따라 두 번만 빨리 치고 멈추는 아이가 생길 수 있음. `card_double.svg` 칸 1·2도 가지 주변에 촘촘한 표시 3개 | `levels/06` 가지 [27, 28] contacts 27.5·28, 표시 27(끝)·27.5(안)·28(끝). L7 [22,23], L9 [48,49], L10 [16,17]도 같음. L8 [26, 28] 안 26.5·27·27.5 + 끝 26·28, L10 [49,51] 같음. `layout.json world.branch` "그린 가로 = [beat_in, beat_out] 그대로", `side_margin_of_d` 0. 30-art 8절 `card_double` "가지 밑 촘촘한 표시 둘" | **규칙: "가지 밑에 들어간 표시 수 = 카드 횟수(2·4)", 들어가는 표시는 가지 밖으로 보이게.** 예: 가지 그림을 오른쪽으로 0.25박 옮기거나 왼쪽 끝을 앞 표시와 첫 반박 표시의 가운데에서 시작(앞 2박 비행이 가지 왼쪽 끝을 스치는 A-7 여유도 함께 늘어남). 오른쪽 끝을 0.25박 늘이면 640x360에서 다음 1박 비행 윗점과 여유가 1 px 안팎까지 줄어들 수 있어(lore 손계산 추정: L6 Hp 237·d 24, 0.25박 뒤 공 윗점 ≈ 0.197 Hp + d) V22를 다시 봐야 함. 카드 그림도 같은 규칙으로(칸 2: 북 위 표시는 가지 밖, 가지 밑에 표시 2개). balance는 `objects.branch` 구간 정의(판정)와 그림 구간이 다르면 문서에 적고 V22·V23·S10에 그림 구간을 넣음 | 문구 유지(아이 말로 "들어가는 표시 = 보통 톡, 가지 밑 = 빨리 톡톡"이 맞음). 10-lore 3절 W5·W7 줄, 7-3 머리말에 규칙 기록, 11절 L10 위험(major) 추가 |
| 2 | major | game-developer (art-director 문서 확인) | **레벨 카드의 최고 기록 progressbar와 최고 콤보 meter가 카드 버튼 안이면 낭독되지 않음.** 버튼에 `aria-label`(이름 + 상태 키)이 붙어 있어 버튼 안 자식은 이름에 묻힘(insights 콤보 대체 글 줄). round-1 빌드가 이미 `aria_best` progressbar를 버튼 안에 넣었고, art 6-2·11-1·목업 주석은 최고 콤보 표지를 "카드 안 오른쪽 위"로만 적어 DOM 자리가 정해지지 않음 | `games/rhythm-02/js/main.js` 96~99줄(`b.appendChild(pb)`), 30-art 6-2 "레벨 선택" 줄·11-1, `mockup-level-select.svg` 주석, 10-lore 6절 11(round-2 1-1판은 자리 없음) | 화면 자리는 art 그대로(카드 위에 겹쳐 그려도 됨), **DOM은 같은 칸(`listitem`) 안 버튼의 형제 요소**. `aria-describedby`는 값이 안 읽혀 쓰지 않음. art는 6-2 "레벨 선택" 줄에 "대체 글 요소는 버튼 밖(10-lore 6절 11)" 한 줄 | **처리**: 10-lore 6절 11·7-2·7-4에 "버튼 밖 형제" 규칙과 round-1 빌드 위치 기록. 빌드는 dev |
| 3 | minor | lore-writer | **10-lore 콤보 대체 글 규칙이 insights와 어긋남.** 6절 4가 "`aria-valuetext`도 만들지 않음"이라 낭독기가 콤보 meter를 퍼센트로 읽을 수 있음. 문구 `aria_combo` EN "Streak"은 5~6세에게 어려운 말이고, `aria_best_combo` EN "Best streak"은 rhythm-01 `aria_streak_best` EN과 글자까지 같음(rhythm-01은 그 키를 빌드에서 안 써 7-9 ⑦에는 안 걸렸음) | insights 5~6세 절 콤보 대체 글 줄, 10-lore(1-1판) 6절 4·7-4, `projects/rhythm-01/10-lore.md` 582줄 | 개수 meter는 `aria-valuetext` = 숫자만, 판정마다·단계·끊김 때 읽지 않음, "콤보" 대신 쉬운 말 | **처리(R2-D7)**: 6절 4를 비율(valuetext 없음)/개수(valuetext 숫자만)로 나눔, 6절 5에 "판정마다·단계·끊김 때 읽지 않음·meter는 플레이 내내 트리에", `aria_combo` "이어서 잘한 수 / Good taps in a row", `aria_best_combo` "이어서 잘한 최고 기록 / Most good taps in a row", 7-9 ⑤ 금지어에 콤보·combo·streak |
| 4 | minor | art-director·balance-designer (lore 반영함) | **세 문서의 rhythm-01 구분·runner-01 관계 표(R2-D8): 서로 틀린 내용은 없고 빠진 행만 있음.** ① runner-01 허용 겹침에 balance 2-1은 "1.1 s 재시작"을 넣었고 art 10-2에는 없음 ② 같은 끝 장면 물체를 balance는 "클리어 구름"(5-3·6-4·V17), art는 "끝 구름"(3-2·7-3)으로 부름 ③ lore 8-1(1-1판)에 판정 표식 모양·실패 모습·콤보 셈(지붕 +1) 행이 없었음 | 20-balance 2·2-1·5-3·6-4, 30-art 10-1·10-2·3-2·7-3, 10-lore 8-1·8-2 | ① art 10-2에 "약 1.1 s 자동 재시작 — 겹침(허브 공통 숙달 리듬)" 한 줄 ② 이름 하나로("끝 구름" 권장 — 아이 말에 가깝고 art·lore가 씀) 또는 balance 5-3에 "(art 끝 구름)" 별칭 | **처리**: 8-1에 판정 표식(파란 돔)·화면 구도·실패 모습·콤보 행, 8-2에 허용 겹침 4개(흐름·앞쪽 박·지붕·1.1 s)와 모양·판정·끝 차이, 2절·3절에 "끝 구름 = balance 클리어 구름" |
| 5 | minor | art-director | **지붕 그림이 "줄무늬 차양"이라 아이가 "지붕" 말고 "천막·우산"으로 부를 수 있음.** 이름 `card_roof` "지붕 밑에선 쉬어요"와 그림의 연결은 카드 그림이 같아 규칙 이해에 지장은 없음 | `card_roof.svg`(보라·흰 줄무늬, 둥근 윗변, 물결 처마), 30-art 3-2·X-L2 | 그대로 둠. round-2 리뷰 스크린샷에서 L5 첫 지붕이 "지붕"으로 읽히는지 한 번 더 봄(윗변 솟음이 작으면 납작한 판으로 보일 수 있음) | 이름 "지붕" 유지, 3절 표에 근거 기록 |
| 6 | minor | balance-designer·art-director | **기획 문서·데이터 주석이 지붕을 "치지 마"·"위험"으로 부름.** 화면 글은 아니지만 dev가 SVG `<title>`·aria·DEV_NOTES로 옮기면 lore 2절 "지붕을 위험·조심·치지 마로 부르지 않음(겁주지 않게)"과 어긋남 | 20-balance 8-1 "W4 지붕(치지 마)", `balance.json gimmicks.W4.what`, 30-art 2-3 "지붕(위험, 치지 마)", `layout.json world.roof._rule`, `card_roof.svg` 주석 | 기획 문서 안에서는 그대로 써도 됨. 빌드로 넘기는 SVG에는 `<title>`·`aria-label`을 넣지 않음(지금도 없음, 주석만) — dev 참고로만 | 바꿀 것 없음 |
| 7 | info | − | **화면에 새로 보이는 것의 키·대체 글 점검**: 북 다리·조약돌·끝 구름·지붕 콩 연출·콤보 단계 연출·튐 선은 캔버스 안 그림이라 키 불필요(`aria_play_area` 하나). 콤보 칸 줄 = meter `aria_combo` 하나. 레벨 카드 최고 콤보 금빛 네모 = `aria_best_combo`(이슈 2 자리). `icon-unlock_sound` = `audio_unlock` 글 옆 장식(`aria-hidden`, 이름은 글). 아이콘 21개 중 키 없는 버튼 0(round-1 20개 + unlock_sound) | 30-art 0·3·6-2·11-2, `assets/icons/` | − | 3절 표에 끝 구름·최고 콤보 표지·소리 켜기 그림 줄, 7-1 `audio_unlock` 그림 이름, 7-8 끝 "키를 두지 않은 것"에 새 모양 |
| 8 | info | − | **카드 8장 문구 ↔ art 카드 그림 ↔ balance 첫 등장 대조**(이슈 1 말고는 맞음): `card_bounce` L1 W0 첫 접촉 + 손가락 / `card_big` L2 첫 2박 비행(contact 2) "표시가 멀면 높이" / `card_cloud` L3 첫 구름은 토스로 들어가 숨었다 내려옴 / `card_dot` L4 1.5·1.5·1 / `card_roof` L5 X2: 1박으로 들어와 앉고 지붕 밑엔 표시 없음, 손 떨어짐(S8) / `card_three` L7 첫 언덕은 자동 토스 3박 → 착지 때 한 번 톡 = "셋 세고 톡" / `card_double`·`card_roll` 판정 수 2·4는 맞으나 보이는 표시 수가 이슈 1 | `levels/*.json` `new_gimmick`·`objects`, 30-art 8절, 20-balance 8-1 | − | 7-3 `card_three` 그림 힌트를 art 칸 그림으로 맞춤 |
| 9 | info | balance-designer | **검증기 실행 상태(읽기만, 2026-11-17 내 실행)**: V7b PASS(카드 키 = strings = 그림 16장, 남는 키·파일 없음) — R2-D1 lore·art 쪽 완료. 같은 실행에서 `04 B2 novice_sd50 평균 진행도 03 81.2 % > 04 81.3 %` FAIL 1(409개 중 PASS 408). 레벨 파일이 실행 직전 다시 생성돼 balance가 R2-D3 작업 중인 것으로 보임 | `node projects/rhythm-02/tools/verify-levels.mjs` 출력 끝 | balance 수정 마감 때 다시 확인 | − |

## 잘 된 점
- 세 문서 모두 화면 글·숫자 없는 콤보, 끊김 무음, 지붕을 "쉼"으로 보이는 그림(앉은 공·표시 없음·차양)으로 같은 방향.
- 카드 키 원본 하나(balance `gimmicks`)가 strings·레벨·그림 16장과 엄격하게 같음(7-9 ⑥·V7b).
- art가 표시를 "반원 돔"(음표·별·공과 다른 모양)으로 정해 "표시"라는 일반 이름이 그대로 맞고, 조약돌을 길 장식으로만 써 이름 충돌이 없음.

## 1-2 수정 결과 (lore 몫)
- R2-D1: `strings.json` `card_twoballs` 삭제(84 → **83키**), 7-3 행 삭제, 예비는 3절 G5 줄에만.
- R2-D6: "표시" 유지, 3절 표를 art 실제 모양과 대조(전부 이름 유지), 카드 대조(이슈 8).
- R2-D7: 이슈 3 처리. 레벨 카드 대체 글 자리(이슈 2) 문서화.
- R2-D8: 이슈 4 처리.
- 7-9 검사(카드 키 엄격 대조 포함): `doc 83 json 83 | cards strings=balance=levels 8 OK | same-as r01 32 runner 12 (common만 허용) | card files 16/16 |  PASS`

VERDICT: REVISE (이슈 1·2는 art·balance·dev 쪽 수정 필요, lore 쪽은 끝)
