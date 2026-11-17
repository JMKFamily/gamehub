# round-2 1-2 교차 리뷰 + 1회 수정: 화음 빈 정박·q 0 단조·바탕 단계 식·가지 밑 표시

- 날짜: 2026-11-17
- 역할: balance-designer
- 프로젝트: rhythm-02
- 단계: round-2 1-2 (교차 리뷰 + 1회 수정, art·lore와 병렬)

## 요청 받은 일
오케스트레이터: round-2 기획(흘러오는 길 + 콤보) 세 역할 산출물을 balance 관점(수치·레벨·판정·타이밍·검증)으로 교차 리뷰하고, 1-2 결정 R2-D2(콤보 화음 시각 규칙 + 검사)·R2-D3(q 0과 0.15 둘 다 단조·30회·2배, 패턴 교체 우선, B6는 q 0.15)·R2-D4(바탕 단계 식 검증기 일치)·R2-D5 문서 반영·R2-D8 구분 표 대조를 고침. 작업 중 추가 지시: R2-D9(가지 밑 표시 수 = 카드 횟수, 들어가는 표시는 가지 밖), art 교차 리뷰 major(가지 끝 스침 → 아랫면 0.34 + 가지 뒤 1박 검토), 20-balance 잔여 문서, rhythm-01 round-3 "북길" 기준 2절, 용어 "끝 구름" 통일, 마지막에 전체 검증 ALL PASS·art check-all 대기 0 확인.

## 한 일
1. **교차 리뷰** `reviews/cross-r2/balance-designer.md`: art·lore 값을 스크립트로 대조(북 x·앞쪽 박·HUD 띠·물체 높이·지붕 덮기·콤보 연출 시간·화음·바탕 단계·감속·카드 키·큰 언덕 3박). 이슈 art 4(X3·X4·X5·X7 minor)·lore 3(X1 major R2-D8 8-1 옛 코어, X6·X2 minor)·balance 6(B1~B6, 모두 처리)·공통 1(D1 rhythm-01 북길 겹침 → 오케스트레이터).
2. **R2-D2 콤보 화음** `tools/sim/judge.mjs comboEvents`: 판정 접촉 다음 정박부터 어떤 접촉의 [놓침 구역 시작, 통과 창 끝](nogo는 통과 창)·지붕 착지 ±1박(닫힌)도 아닌 첫 정박. 클리어 판정 전에 없으면 화음 없음(`chordBeat` null, `chordSkip: 'clear'`). 검증기 **C2**(judge 값 = 검증기 독립 계산). `balance.json combo.chord_timing` 다시 씀.
3. **R2-D3 q 의존 줄이기**(패턴 교체 우선, 지붕 수·L8~L10 폭 270 그대로): L4 "1.5 1.5 1 1 1"(−1) + 폭 290 → 288, L5 끝 +2, L6 +2(가지 뒤 1박), L7 첫 구절을 둘로(+1, 쉼 사이 ≤ 12), L9 "3h 2 1 1 1 1"(+1), L10 "3h 1 1"(반박 짝 → 1박 통, 같은 수). 검증기 **B7q**(q 0 엄격 단조·30·2배). 표본 4만 → 10만(이웃 간격 4~8 %가 4만 회 오차로 한 번 뒤집혀서).
4. **R2-D4 바탕 단계**: `judge.mjs bgStage(n, P)`·`bgStages(L)` = 1 + round(2(n−1)/(P−1)), `balance.json rest.bg_stage_rule`, 검증기 **V24**(art `layout.json bg_stage.rule`과 대조, 없으면 대기).
5. **R2-D9 + art B6 가지**: 가지 구간 [첫 반박 − 0.25, 마지막 반박 + 0.2]박, 아랫면 0.30 → **0.34·Hp**, 가지 뒤 비행 1박만(`objects.branch.exit_flight_beats`, V6 ②). 검증기 **V25**(가지 밑에 완전히 든 표시 2/4, 앞·뒤 표시 걸침 0, art 표시 너비·가지 여유 반영, 4해상도), **V22를 원 모양 공·공 너비 ±d/2 동안으로**.
6. **20-balance.md**: 머리·0·2(북길 기준 다시 씀)·4-1·5-3·6-1·6-4(그림 감속·끝 구름)·8-2·8-3·9-1~9-7·10-2·11·12(화음 행)·13(C2·V24·V25·B7q·V22)·14(7·8)·15(K15·K17~K19)·16·17절.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-02/reviews/cross-r2/balance-designer.md` | 교차 리뷰(스크립트 대조 표·이슈·처리) |
| `projects/rhythm-02/tools/sim/judge.mjs` | 화음 첫 빈 정박·클리어 전 없으면 null, `bgStage`/`bgStages` |
| `projects/rhythm-02/tools/build-levels.mjs` | L4~L7·L9·L10 패턴 교체, L4 폭 288, 가지 구간 새 정의 |
| `projects/rhythm-02/levels/01~10` | 다시 생성(L1~L3 내용 같음, 가지 물체 구간 바뀜) |
| `projects/rhythm-02/balance.json` | `combo.chord_timing`, `rest.bg_stage_rule`, `objects.branch`(0.34·pre 0.25·post 0.2·exit 1·marks_under), `verify.N_full` 10만·`bg_stage_rule_id` |
| `projects/rhythm-02/tools/verify-levels.mjs` | C2·V24·V25·B7q 새로, V22 원 모양 공, V6 ② 가지 뒤 1박 |
| `projects/rhythm-02/20-balance.md` | 위 절 갱신 |

## 검증 결과
- `node projects/rhythm-02/tools/verify-levels.mjs`(전체, 72 s, 종료 0): **413개 PASS 413 · 대기 0 · FAIL 0 → ALL PASS.** V7b PASS(art·lore가 `card_twoballs` 키·그림 삭제 완료, 마지막 실행에서 다시 확인). 같은 데이터로 `--seed=1`·`--seed=777`·`--seed=4242`도 모두 413/413.
- `node projects/rhythm-02/tools/art/check-all.mjs`: palette·layout·cards·icons·sound-check **5개 OK, 대기 0**(layout의 가지 밑 표시·가지 밑 공간 원 모양 검사, sound-check R2-D2 화음 검사 포함).
- 곡선(σ70 연속 중앙값, 10만 회):

| 레벨 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|
| **q 0.15 (판정 B7)** | 3.88 | 4.35 | 6.60 | 7.67 | 8.12 | 8.70 | 11.73 | 12.25 |
| **q 0 (B7q)** | 3.88 | 4.35 | 4.74 | 5.60 | 5.88 | 6.42 | 7.13 | 7.68 |

  L1 1.80 · L2 2.41, r 1.469, T 12.31(범위 9.85~14.77), **B6 L10 12.25(−0.5 %, q 0.15 기준)**, 시드 10개 평균 +3.1 %·범위 +1.1~+7.0 %. 모든 레벨 ≤ 30, 직전 최대 1.61배. 가장 좁은 간격 q 0 L6→L7 +4.9 %, q 0.15 L9→L10 +4.4 %(시드 4개 모두 통과, 최저 +3.6 %). K2 최대 L10 19.5, K3b −15 ms L10 17.7.
- 화음(C2): 14개 모두 위험 구간·지붕 ±1박 밖, 판정 뒤 최대 6박, L2~L6의 20단계는 클리어 전 빈 정박이 없어 화음 없음(그림 연출만).
- 바탕 단계(V24): L1 1·2·2·3, L2~L10 1·2·3 = art 식.
- 가지(V25): 6개 × 4해상도 가지 밑 표시 = 2/4, 걸침 0, 가장 빠듯한 여유 3.2 px(밑)·6.8 px(밖). V22 원 모양 공 통과.

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 이름·캐릭터·아트·음악·레벨 배치 없음 — 토큰으로 새로, V-R4 레벨 사이 복사 0)
- [x] 게임 선정·설계 원칙 (탭 1가지, 새 기믹 레벨당 1, 지붕 L5부터·배치 규칙 7, 가지 밑 표시 = 카드 횟수)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정(reviews/cross-r2/balance-designer.md, 20-balance.md, balance.json, levels/, tools/(tools/art 제외), Docs/balance-designer/, Docs/README.md 한 줄). art·lore 파일·games/는 읽기만, git 안 함, 서버·브라우저 띄우지 않음

## 문제·남은 일
- major · lore-writer: X1 — 10-lore 8-1 rhythm-01 구분이 옛 궤도 코어 기준(R2-D8 어긋남 1).
- major · orchestrator: D1 — rhythm-01 북길과 흐름 방향·왼쪽 0.30 W 판정 자리 겹침 판단.
- minor · art-director: X3 `world.branch.under_ref` 문구 0.34로, X4 9-3 화음 문구, X5 가지 여유 상한 0.24d, X7 10-2 재시작 행.
- minor · lore-writer: X6 3절 W5 숫자 삭제, X2 "셋 세고"의 셈 시작점(카드 박 점·QA 관찰).
- minor · balance/QA: K17 곡선 이웃 간격 4~5 %(레벨 고칠 때 시드 2개 이상), K18 화음이 최대 6박 늦음·일부 20단계 화음 없음(아동 관찰).
- dev 넘길 것: `bgStage`, `chordMs` null 처리, 가지 구간 새 값(데이터에 있음), 클리어 감속은 그리기만.

## 다른 팀에 줄 인사이트
- [rhythm-02·2026-11-17] 칠지·말지(nogo) 기믹이 있는 곡선은 q(참기 실패율) 0과 판정 q 둘 다에서 단조여야 q 추정이 틀려도 무너지지 않는다. q 0 곡선은 "hit 수 × 판정 폭"만의 곡선이라, 지붕이 늘어나는 레벨에서 hit를 줄이면 바로 깨진다. hit 1개 ≈ 연속 중앙값 10 %, 판정 폭 양쪽 1 ms ≈ 4 %, 같은 수에서 무늬만 바꾸면 1~2 %라 hit 수로 계단을 먼저 만들고 폭으로 미세 조정한다. 근거: projects/rhythm-02/20-balance.md 9-2·14절 7. 적용: balance-designer(nogo가 있는 모든 프로젝트), qa-engineer.
- [rhythm-02·2026-11-17] 곡선 검사(엄격 단조) 이웃 간격이 5 % 안팎이면 4만 회 표본(연속 중앙값 ±2 %)으로는 한 번씩 뒤집힌다. 10만 회로 올리고 시드 2개 이상으로 확인한 뒤 고친다(같은 데이터가 4만 회에서 L9 12.25 > L10 12.13, 두 시드 평균 11.6 < 12.6). 근거: projects/rhythm-02/20-balance.md 14절 8. 적용: balance-designer·qa-engineer.
- [rhythm-02·2026-11-17] "단계 소리는 탭과 같은 순간에 겹치지 않게"를 "다음 정박"으로 옮기면 1박 통이 이어지는 곳에서 대부분 다음 탭과 겹친다(19번 중 13번). "어떤 접촉의 놓침 구역~통과 창에도 들지 않는 첫 정박 + 클리어 판정 전, 없으면 생략"으로 정의하고, 그림 연출은 판정 순간에 두어 칭찬과 판정을 떼지 않는다. 근거: tools/sim/judge.mjs comboEvents, 검증기 C2. 적용: 세 리듬 게임 balance·art.
- [rhythm-02·2026-11-17] 물체 구간을 그림 요구(표시가 가지 밑에 완전히 들게)로 늘리면 물체 끝을 지나는 공이 원 모양 기준으로 끝을 스칠 수 있다. 여유 검사는 공 가운데 한 점이 아니라 물체 끝이 공 너비(±d/2)에 걸친 동안 원 윗선으로 재고, 물체 바로 뒤 비행 길이를 규칙으로 묶는다(가지 뒤 1박). 근거: verify-levels V22·V25, reviews/cross-r2/art-director.md B6. 적용: balance-designer·art-director(runner-01 매달린 위험 포함).
