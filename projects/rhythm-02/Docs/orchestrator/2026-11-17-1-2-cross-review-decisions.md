# 1-2 교차 리뷰 결정

- 날짜: 2026-11-17
- 역할: orchestrator
- 프로젝트: rhythm-02
- 단계: 1-2

## 요청 받은 일
기획 3역할 교차 리뷰 1차(지적) 결과를 모아 충돌을 결정하고, 각 역할이 1회 수정하게 함. 메인 세션 요청 "rhythm-01과의 구분" 확인 포함.

## 리뷰 결과
| 리뷰 | 이슈 | blocker | major | minor |
|---|---|---|---|---|
| reviews/cross/lore-writer.md | 16 | 0 | 6 | 10 |
| reviews/cross/art-director.md | 23 | 0 | 12 | 11 |
| reviews/cross/balance-designer.md | 20 | 0 | 7 | 13 |
보고서 3건 확인(Docs/<역할>/2026-11-17-1-2-cross-review.md). 쓴 파일은 리뷰·보고서·README 한 줄뿐(git status 확인). 위반 없음.

## rhythm-01과의 구분 (메인 세션 요청 확인 결과)
- 화면: 세 역할 모두 "분명히 다름" — 궤도·별·북채·보여 주기 마디 없음, 밝은 바탕/어두운 바탕, 공 hue 7°/193°, 아래 납작 북/가운데 원, 판정 자리 한 곳 고정.
- 남은 닮음 3가지 → 결정 D3·D7·D8로 처리:
  1. 핵심 차이 "탭이 공을 올려 보내고, 안 치면 떨어진다"가 문서에 없고 기준 구현 `ballsAt`이 탭을 받지 않음(안 쳐도 예정대로 튐).
  2. 받침 쉼 "똑 딱" 4번이 rhythm-01 카운트인과 이름·합성 구조가 같음.
  3. 판정 순간 문구 `tut_tap`·`store_short`·`aria_play_area`가 rhythm-01과 한 낱말 차이 또는 동일.
- 수정 후 재확인: 1-2 수정 결과 감시에서 위 3가지를 직접 확인하고 이 파일 끝에 기록.

## 결정
| # | 결정 | 주 담당 | 따름 |
|---|---|---|---|
| D1 | 카드 키 원본 = `balance.json gimmicks.<id>.card`. 키: `card_bounce`(L1) `card_big`(L2) `card_cloud`(L3) `card_dot`(L4) `card_double`(L5) `card_twoballs`(L6) `card_three`(L7) `card_roll`(L8). art 카드 파일 이름을 이 키로 바꿈(`<키>.svg`, `<키>_portrait.svg`). 검증기가 balance·strings.json·assets/cards 세 곳 일치를 검사(V7). | balance | art·lore |
| D2 | G6(빠른 곡) 쓰지 않음: `card_G6*` 파일, `card_fast` 키 삭제, 문서의 G6 흔적은 "미사용(예비)"로만 남김. | art·lore | — |
| D3 | **탭이 공을 올린다**: 공은 접촉 시각에 북 가죽에 닿고, 통과 창 동안 가죽 위에서 기다리다 **탭 순간** 튀어 오름(다음 높이 = 다음 접촉까지 남은 시간). 탭 없이 통과 창이 끝나면 떨어짐. 기준 구현 `ballsAt(level, t, hits)`이 친 시각을 받음. 세 문서의 rhythm-01 구분 표에 "탭의 결과" 행 추가. | balance | art·lore |
| D4 | L1 손가락 사라짐 시각의 원본 = balance `fingerSchedule().gone`. `layout.json`의 `hide_after_ms`는 지우거나 이 값에서 파생. 검증기 S5가 layout.json도 읽어 신호 창 ∩ 다음 위험 구간 = 0 ms 검사. | art | balance |
| D5 | 놀이 높이 Hp = art 식(공 아랫점 기준, 30-art)으로 통일, balance 문서·코드 정의 교체. `apex_budget`은 art 제안 1.111(가로 화면 공 하한 24 px)로 하고, 검증기가 **4해상도 × 10레벨 실제 BPM**에서 모든 꼭짓점 공 윗점 ≤ 구름선 0.9·Hp, 가장 짧은 튐 꼭짓점 ≥ 1.2·공 지름을 검사. 표는 128 BPM 대신 실제 레벨 BPM 기준. | balance·art | — |
| D6 | 바탕 단계 = "n번째 받침 쉼 → min(n,3)단계" 규칙(art 수정안). `phrases[].stage` 태그 쓰지 않음. | art | balance |
| D7 | 받침 쉼 소리: "똑딱" 이름·`tick_a/tick_b` 폐기 → 공이 까딱일 때 나는 "콩" 소리(`rest_a`/`rest_b`), rhythm-01 카운트인과 다른 합성(음색·음높이 구성)으로. 문서의 "똑딱" 표현 전부 교체. 받침 쉼 구조(판정 없음 + 자동 토스) 자체는 유지. | art | balance·lore |
| D8 | 문구: 승패 한 문장 세 문서 통일 "공이 북에 닿을 때 톡! 놓치면 다시." / `tut_tap` "공이 북에 닿으면 톡!"(lore 안), `store_short`·`aria_play_area` 새로 씀(rhythm-01과 다른 문장), L7 `card_three` "셋 세고 톡"류(lore 확정), 카드 힌트에서 "포물선" 삭제, `clear_title_1` "높이 올랐어요!", 최고 기록 점 대체 글 `aria_best` 하나를 HUD·레벨 카드에 같이 씀. 공통 UI 문구 재사용은 의도라고 10-lore 8절에 바로잡음. | lore | — |
| D9 | 실패 연출: 실패 틱 → 다음 시도 첫 프레임 **1.1 s 고정**(0.94~1.20). 그 안에서 일찍 실패(공이 아직 높이 있음)는 헛스윙 + 공이 그대로 내려와 북 옆으로 굴러 떨어짐, 움직임 구간 최대 0.6 s, 정지 구간이 줄어 총합 유지. balance `phases_s`에 일찍/늦음 두 판으로 적음. | art | balance |
| D10 | 클리어 연출 시간축의 원본 = balance(마지막 착지 + 마무리 4박). art 큰 튐 + 등급 구름은 그 안에 넣음. L10 끝 정의도 balance 기준으로 통일. | balance | art |
| D11 | 메뉴·보호자 구조: 플레이 HUD는 멈춤 버튼 하나. 멈춤 메뉴(아이용) = 이어 하기·다시·레벨 고르기·소리 켜기/끄기. 레벨 선택의 설정(톱니 아닌 새 그림) **길게 누르기(1.5 s, 채워지는 표시)** = 보호자 화면(소리 맞추기, 언어). 소리 밀림 표지는 레벨 선택·설정에만, 플레이 중 없음(insights). art가 아이콘 표(모든 버튼·표지·소리 맞추기 화면 그림)를 새로 그림 — rhythm-01 모양(고리, 헤드폰+모래시계) 피함. balance가 밀림 감지 수치 블록(표본·기준·표시 조건)과 소리 맞추기 수치를 balance.json에 둠. lore가 필요한 키 추가. | art·balance | lore |
| D12 | L3 레벨 카드 = 큰 구름 1개 + 공이 반쯤 숨은 모습. 등급 표시는 늘 3칸(빈 칸 점선). | art | lore |
| D13 | 카드 닫는 탭 → 레벨 시작 간격, 공 2 들어옴·나감 시각과 상태(깡충 뛰어 오름)를 레벨 데이터·balance.json에 둠. `card_twoballs`·`card_three` 그림을 실제 첫 등장과 같게. | balance | art |
| D14 | 레벨 선택 최고 진행도는 일반 모드 기록만 보임(연습 기록 표시 없음, 표시 하나로 단순). | art | balance |
| D15 | 이름 짜임(Tossaloft ↔ Tickadrum 모두 "T + a + 낱말")은 가안 유지, 요청자 확정 때 함께 알림. | 오케스트레이터 | lore |
| D16 | 곡 음 놓침 구역 규칙(art X5)을 검증기 항목으로 편입(sound.json 박 단위 규칙 읽기). | balance | art |
그 밖 minor는 각 역할이 자기 문서 해당분을 처리하고 처리표를 보고서에 남김.

## 2차 수정 감시 (2026-11-17)
- 보고서 3건 확인: Docs/{lore-writer,balance-designer,art-director}/2026-11-17-1-2-revision.md. 쓰기 경로 각 담당 파일만(git status), git·서버 사용 없음.
- 오케스트레이터 직접 실행:
  - `node tools/verify-levels.mjs` 전체: **266/266 PASS** (L1 1.80, r 1.483, T 12.91, L10 11.82, 1-1과 같음).
  - `node tools/art/check-all.mjs`: palette·layout·cards·icons·sound-check **5/5 OK**.
  - lore 검사(에이전트 실행): doc 81 = json 81, 카드 8 = balance 8.
- rhythm-01과의 구분 재확인(메인 세션 요청):
  1. 탭의 결과: `judge.mjs ballsAt(L,t,hits)`가 친 시각을 받고, 공은 가죽 위에서 기다리다 탭 순간 떠남(떠남 = max(탭, 접촉)). 검증기 V11 "탭 전에 공이 북을 떠나지 않음" PASS. 세 문서 구분 표 첫 행 "탭의 결과" 있음. → **해결**
  2. 받침 쉼 소리: `sound.json` tick 0건, "콩" `rest_a/rest_b` 삼각파(잡음 층 없음), sound-check가 tick·"똑딱"·잡음 층 금지 검사. "똑딱"은 문서의 rhythm-01 비교 칸에만 남음(grep 확인). → **해결**
  3. 문구: `tut_tap` "공이 북에 닿으면 톡!", `aria_play_area` "공을 톡 쳐 올려요", store_short 새 문장, 게임 정체성 문구 rhythm-01 겹침 0(lore 검사 ⑦). → **해결**
- 추가 결정:
  - D17: 보호자 화면 "기록 지우기"는 이번 범위에서 넣지 않음(D11 = 소리 맞추기·언어). art 목업에서 빼거나 숨김 처리는 1-3 빌드에서 그리지 않는 것으로 충분.
  - D18: art 제안 "레벨 시작 판"(▶ 일반 · 깃발 연습 · 카드 다시 보기) 채택 — 연습 모드 진입 자리가 따로 없어서 필요. 키는 기존 `btn_practice`·`btn_card_replay` 사용. 단 재시작(실패 후)은 이 판을 거치지 않고 자동 1.1 s.
  - lore 확인 요청 `settings_music`·`settings_sfx` 삭제 유지(멈춤 메뉴 소리 켜기/끄기 하나).
