# round-1 → round-2 개발 처리 결과 (game-developer, 2026-11-18)

대상: `score.md` "game-developer — 28건 (major 9 · minor 19)". 결과: **수정 27 · 사양 맞춤(코드 변경 없음) 1 · 보류 0**.
수치는 `Docs/game-developer/2026-11-18-r2-fixes.md` 검증 결과 절. 스크린샷 `reviews/round-2/dev-shots/`.

| # | 심각도 | 처리 | 내용 |
|---|---|---|---|
| D1 | major | 수정 | 수집·덱 빌더 격자를 가벼운 칸(초상 `loading=lazy` + 비용 + 이름 한 줄 + 스탯, 글 덩어리 없음)으로 바꾸고 첫 12칸만 즉시, 나머지는 프레임마다 24칸씩. 초상 blob은 부팅 뒤 쉬는 시간에 조금씩 미리 생성(`warmAllIdle`). 바탕음 시작을 120 ms 뒤로 미뤄 첫 탭 프레임을 비움. 모든 버튼은 누르는 순간 눌림 표시(transform), 무거운 화면(수집·빌더·대전)은 그 표시가 그려진 다음 프레임에 만듦. 6배 스로틀: 타이틀 첫 탭 첫 프레임 40 ms, 부두 → 수집 첫 프레임 11 ms(화면 완성 27 ms, 이전 2,050 ms), 대전 시작 첫 프레임 2 ms(완성 163 ms) |
| D2 | major | 수정 | `ui.js show()`: 새 화면 말고 모든 자식 제거 + 떠 있던 메뉴 오버레이 제거. 설정 토글 5번 뒤 `#app > section` 1개 |
| D3 | major | 수정 | `visibilitychange`: 숨으면 게임 시계·턴 타이머·AI 박자 정지 + `AudioContext.suspend()`. 돌아오면 대전 중이면 "이어하기" ▶ 화면(탭하면 재개·소리 resume), 아니면 바로 재개. 강제 hidden 1.5 s 동안 반턴 변화 0. 실기기 확인 필요(QA). ▶ 버튼 aria는 `title_tap_to_start`(전용 키 없음 → lore에 `pause_resume` 키 요청) |
| D4 | major | 수정 | 30-art 4-4 가로 규칙: 상자 왼쪽 30 % 폭 가운데, 덩이·공개 카드 오른쪽 70 % 안 3+2 두 줄(카드 높이 ≤ (높이−16)/2), 버튼 오른쪽 아래 세로 기둥, 안내 글 상자 아래. 세로도 화면 비율 배치(고정 y 제거) |
| D5 | major | 수정 | 수집·빌더 필터 버튼 48 px, 빌더 덱 줄 48 px(글 크기는 그대로) |
| D6 | major | 수정 | sync로 art.json·SVG(아이콘 clipPath 포함)·앱 아이콘 다시 복사. `node projects/tcg-01/tools/art/sfx-render.mjs --build` 4개 모두 OK(덩이 모래<진주<산호<심해, 큰 카드 최대, 타격 강>카드 내기>잔 행동, 승리>패배) |
| D7 | major | 수정 | sync가 `concept_en` → `text_en`(200/200), 영어 모드 카드 글 = text_en |
| D8 | major | 수정 | 튜토리얼 10단계(10-lore 8-7 키 tut_1~10·tut_done·tut_skip): 첫 모래 위 연습 판에서 조건이 맞을 때 한 단계씩 가운데 띠 위 패널 + 대상 강조(심지·손패·응답자·방파제·호명술·숨 고르기·상대 명줄). 판을 막지 않음(잠금 0), ▶로 닫기·해당 행동을 하면 자동 닫힘, 건너뛰기, 끝나면 `tut_done`. 설정 `settings_reset_tutorial`로 다시 보기. 두 해상도 판에서 10단계 모두 표시 |
| D9 | major | 수정 | balance 확정 데이터 반영: 첫 수집 = `decks/starter-*.json` 6개 카드만(economy.new_player.first_collection). 입문 영장첩이 호명자 선택 첫 칸(이름 `deck_name_default`). 표준 영장첩은 계속 "빌려 쓰는" 선택지로 남김(요청 "영웅 선택 → 표준 덱") |
| D10 | minor | 수정 | 빠르게 보기 공격: art `phases_fast_ms`(60·90·40·110) 사용, tier 정지는 빠르게에서 절반 → 계획 300 |
| D11 | minor | 수정 | tempoLog 하위 구간 기록(`phase_of`): `lethal_blow`(art 1500) → `hero_crack`(700) → `victory`/`defeat`(1800/1600), `end_breath_press`(250)와 `turn_start_banner`(900) 분리 |
| D12 | minor | 사양 맞춤 | art가 30-art 5-1 3항을 빌드 방식("예약이 있으면 진행 중 연출을 끝 상태로 바로 넘기고 예약 실행")으로 고침. 잠금 동안은 2배속, 잠금이 끝나면 끝 상태로 넘김 — 코드 변경 없음 |
| D13 | minor | 수정 | 공개 라벨: 새 이름 `crate_new` / 2장째 `crate_second_copy` / 3장째부터 `crate_resonance_gain` / 넘친 먹. 모두 열면 안내 글 숨김 |
| D14 | minor | 수정 | 결과가 뜨면 판 위 승패 배너·손패·확대 보기 숨김, 결과 오버레이 z-index 300 |
| D15 | minor | 수정 | 넘치는 스크롤 영역(메뉴 `.scroll`, 덱 줄)에 아래 그림자 + ▼ 표시(스크롤 끝에서 사라짐) |
| D16 | minor | 수정 | 상자 개봉 연출의 `setTimeout` 5곳 → 게임 시계 `after()`(빠르게 보기·`step()`·일시정지 반영). 봉인문 확대 제거도 게임 시계로 |
| D17 | minor | 수정 | 첫 물때 동안 손패 부채꼴 숨김(카드가 두 번 보이던 것) |
| D18 | minor | 수정 | 턴 타이머 앞 35 s 흐린 선을 salt_dim 3 px × 35 %로 보이게 |
| D19 | minor | 수정 | 손패 간격 = (hand.w − card_w × 1.35)/(n−1): 10장에서도 양 끝 비용 판이 화면 안 |
| D20 | minor | 수정 | 메뉴 화면 토스트는 화면 아래 12 %(카드 상세 글을 가리지 않음), 대전은 가운데 띠 그대로 |
| D21 | minor | 수정 | `strings-extra.json` 삭제(sync가 지움). 10-lore 8-11 확정 키 사용(`ai_level` en "Opponent skill", `recut_rule_note` 새 문장). 빠진 키 0 |
| D22 | minor | 수정 | 친선 새김 슬롯 고르기(`recut_slot_title/desc/empty`): 호명자 선택에서 친선이면 슬롯 버튼 → 덱에서 새김 1단계 이상인 카드 한 종 선택, 덱별 저장. 친선 돌파 = 고른 1종만(없으면 0) |
| D23 | minor | 수정 | 표준 영장첩 이름 = `deck_standard` · `deck_arch_<덱>` |
| D24 | minor | 수정 | 호명자 선택에 `hero_<id>_bio`, 내 명줄 ≤ 10이면 **내** `위기` 대사(sync가 `line_<id>_crisis`로 읽음), 맞대결 짝이면 판 시작 대사를 `line_<a>_vs_<b>`로(4-8, 8개) |
| D25 | minor | 수정 | 카드 글 숫자 앞 공백을 줄바꿈 없는 공백으로(keep-all 유지). sync 글 검사기: 엔진 n ≥ 99와 글 "모두/전부"는 같은 값으로 봄 → 숫자 불일치 0장 |
| D26 | minor | 수정 | 말풍선: 실제 크기를 재서 화면 안으로(좌우·위아래 고정), 최대 폭 220, 위에 그림자. 시장 줄: 상자 이름 칸을 넓히고 가격 버튼은 두 줄 |
| D27 | minor | 수정 | `market_no_real_money`는 시장 화면에만(부두에서 뺌) |
| D28 | minor | 수정 | 주간 맹약(economy.income.weekly_accord 소금화 150 + 상자 1): 이번 주 의뢰 보상 7번 받으면 받기(목표 7은 개발 임시 → balance에 키 요청). 첫 주 매일 상자 1(가입 뒤 7일, `first_week_daily_bonus_crates`). 의뢰 목표 수는 `daily_commission_goals`에서 읽음 |

## 다른 역할에 요청
- lore: 백그라운드 복귀 "이어하기" 키(`pause_resume`), 입문 영장첩 이름 키(지금 `deck_name_default`).
- balance: 주간 맹약 목표(지금 의뢰 보상 7번), `brine_ticks` 이름과 글("소금독 피해 n")의 단위 확인(빌드는 피해 합으로 셈).
