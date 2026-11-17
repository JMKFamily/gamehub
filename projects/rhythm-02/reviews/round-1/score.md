# 점수 집계: round 1 (rhythm-02 / 높이통통: Tossaloft)

- 날짜: 2026-11-17 · 집계: qa-engineer (1-6)
- 입력: `qa.md`, `benchmark-analyst.md`, `balance-designer.md`, `art-director.md`, `lore-writer.md` (모두 이 폴더). 점수·심각도·VERDICT는 각 리뷰 파일의 "점수"·"이슈" 절에서 직접 옮겼습니다(집계에서 바꾸지 않음).
- 가중치: `harness/criteria.md` "점수 산정"(감각 25 · 밸런스 20 · 시각 20 · 세계관 10 · 기술 25).

## 영역별 점수

| 영역 | 채점 역할 | 점수 | 가중치 | 가중 점수 | 체크 항목 근거 (각 리뷰 "점수" 절) | VERDICT |
|---|---|---|---|---|---|---|
| 게임 감각·핵심 루프 | benchmark-analyst | 8.4 | 25 % | 2.100 | 6/7 + 부분 1 (실패 연출 2프레임 → 부분, 허용 판정), 대상 연령 5/5, 원본 보호 1/1 | PASS |
| 밸런스·레벨 | balance-designer | 7.5 | 20 % | 1.500 | 13/14 + 부분 1 (보정 Δ 시나리오: 무시 구간 잔차 −30~−40에서 w=1 L9·L10 > 30) | REVISE |
| 시각·사운드 | art-director | 7.5 | 20 % | 1.500 | 8/10 + 부분 1 (HUD·글 ↔ 구름 겹침) + 미확인 1 (전환 프레임) | REVISE |
| 세계관·텍스트 | lore-writer | 8.0 | 10 % | 0.800 | 5/6 + 부분 1 (부트 lang·title, 대체 글 누락, 10-lore 구분 칸) | PASS |
| 기술 품질·안정성 | qa-engineer | 8.5 | 25 % | 2.125 | 14/16 + 부분 2 (360x640 구름 가림, 무시 구간 경계 뒤집힘) | PASS |
| **가중 총점** | | **8.025** | 100 % | 8.025 | | |

계산: 8.4×0.25 + 7.5×0.20 + 7.5×0.20 + 8.0×0.10 + 8.5×0.25 = 2.100 + 1.500 + 1.500 + 0.800 + 2.125 = **8.025** (node 계산 확인).

## 게이트 판정

| 조건 | 기준 | round-1 | 결과 |
|---|---|---|---|
| 가중 총점 | 8.0 이상 | 8.025 | **통과** (+0.025, 여유 아주 작음) |
| 모든 영역 | 6.0 이상 | 최저 7.5 (밸런스·시각) | **통과** |
| blocker | 0개 | 0개 (5개 리뷰 모두 blocker 없음, 원본 보호·rhythm-01 겹침 위반 없음) | **통과** |

**숫자상 판정: 게이트 3조건 모두 통과** (round 1/5).

단, 오케스트레이터 결정 필요(아래 E1): major 2건(M1·M2)이 열려 있고 VERDICT REVISE 2건(밸런스·시각)이 있습니다. criteria 게이트는 major를 막는 조건이 없지만, 총점 여유가 0.025뿐이라 M1·M2 수정 없이 검수를 알릴지, round-2에서 고친 뒤 알릴지는 오케스트레이터가 정해야 합니다. 집계자는 판정을 바꾸지 않고 사실만 적습니다.

## 이슈 전체 목록 (중복 병합)

- 심각도 합계: blocker 0 · major 2 (M1~M2) · minor 21 (N1~N21) · 합계 23건 (원래 리뷰 이슈 28건 = QA 5 + BA 4 + BD 4 + AD 7 + LW 8, 중복 5쌍 병합)
- 출처 표기: QA = `qa.md`, BA = `benchmark-analyst.md`, BD = `balance-designer.md`, AD = `art-director.md`, LW = `lore-writer.md`, 숫자는 각 리뷰의 이슈 번호. 출처마다 심각도가 다르면 높은 쪽을 따름. "엇갈림" 칸이 E로 시작하면 아래 "오케스트레이터 결정이 필요한 엇갈림" 절 참고.

| # | 심각도 | 담당 역할 | 내용 (한 줄 요약) | 출처 리뷰 | 엇갈림 |
|---|---|---|---|---|---|
| M1 | major | balance-designer (game-developer) | 소리 맞추기 무시 구간 ±30 경계에서 결과가 뒤집힘(X = 0 기대 −36 → 빌드 raw −28~−30 → 0 저장, 아이 e −37~−40) + 무시 구간 안 이른 쪽 잔차 −30이면 w = 1 봇 L9 34.4·L10 40.6로 30회 한도 넘음, 20-balance 9-4 "+30만" 가정 틀림. 빌드 raw +4~8 ms 쏠림 원인 확인 필요(dev) | QA3(minor), BD1(major) | E3 (수정 방향) |
| M2 | major | art-director (game-developer) | HUD 진행도 막대·시도 점이 큰 구름을 가로지름 — 360x640뿐 아니라 640x360·1280x720 포함 3해상도, 구름 이음매 잔선. 원인은 30-art 4-1·`layout.json cloud._shape` 허용 문장 → 구름 윗선 하한을 HUD 띠 아래로 | QA5(minor), AD1(major), BA(이슈 표 밖 메모: 640x360 같음, 감각 점수 제외) | E4 (허용 여부) |
| N1 | minor | game-developer | 첫 타이틀 탭 한 프레임이 김(스로틀 없음 50~84 ms, 6배 200~283 ms): `AudioOut.unlock()` 미리 합성 + 첫 `buildGrid`. "약 1 s 빈 화면"은 헤드리스에서 재현 안 됨 | QA1 | |
| N2 | minor | game-developer (benchmark-analyst 판정) | 늦음 실패 연출 첫 프레임이 판정 뒤 35.8~50.8 ms(2~3프레임), `LATE_GRACE` 34 ms 때문 | QA2, BA2 | **E1** (위반 vs 허용) |
| N3 | minor | art-director (game-developer: `noteOf` 공용화) | sound-check 계산값과 빌드 렌더 소리 크기가 소리별 최대 2.7 dB 다름(규칙은 여유 있게 통과). 원인: 잡음 생성기(mulberry32 vs LCG, 잡음 층 있는 tap 소리만)·음 높이 집합(2개 vs 곡 전체)·짧은 어택 최고값 민감도 | QA4, AD3 | **E2** (원인 진단) |
| N4 | minor | art-director (game-developer) | 이른 통과 탭(e ≤ −120 ms, σ70 약 2.7 %)에서 공이 이미 멈춘 북에서 혼자 튀어 "내가 쳐서 올라간다"가 끊김 | BA1 | |
| N5 | minor | balance-designer · art-director | 640x360 반박 꼭짓점 29~32 px(1.2~1.3d), 늦게 친 뒤 약 14 px — "높이 = 시간"이 가장 약한 자리 | BA3 | E5 (조율) |
| N6 | minor | qa-engineer (orchestrator 조율) | 화면 시계 판정 전제(`visual_comp_ms` 40, 터치 → 이벤트 지연)를 실기기로 확인 안 함 | BA4 | |
| N7 | minor | balance-designer (game-developer) | 멈춤 → 이어 하기에 준비 박이 없어 다음 접촉까지 300 ms 안 22~35 %, 450 ms 안 34~51 % → 억울한 실패. 받침 쉼으로 되감기 제안 | BD2 | |
| N8 | minor | balance-designer | B6 판정 숫자가 단일 시드에 흔들림(정본 −8.4 %, 빌드 +11.3 %, 10시드 평균 −0.5 %·sd 3.1 %) | BD3 | |
| N9 | minor | orchestrator (balance-designer) | K2 높이 읽기 손해 모델에서 L10 27.66(한도 30의 92 %) → 아동 테스트(HUMAN_TASKS) 요청, L10 예비 무늬 준비 | BD4 | |
| N10 | minor | art-director (game-developer) | L1 `tut_tap` 글(DOM, hudH + 4)이 구름 외곽선을 가로지름(360x640 en, 640x360 ko·en). `layout.json text_slots`에 자리 없음 | AD2, LW5 | |
| N11 | minor | art-director (game-developer) | 결과 화면 큰 구름이 accent로 완전히 물들어 등급 구름 3칸과 같은 색 → "구름 4개", 섞기 중 탁한 회녹색 | AD4 | |
| N12 | minor | art-director | 세로판 그림 카드 `card_cloud_portrait` 구름 윗부분이 칸 테두리에 잘림 | AD5 | |
| N13 | minor | art-director | L6 시소 실루엣 판이 받침과 떨어져 떠 있음 | AD6 | |
| N14 | minor | qa-engineer (art-director 확인) | criteria "전환 중 앞뒤 상태에 없는 선·면" 항목을 이번 라운드에 프레임으로 안 봄(구름 섞기·바탕 섞기·HUD 페이드·공 나타남·공 2 들어옴/나감·손가락 사라짐) | AD7 | |
| N15 | minor | game-developer | 불러오기 실패 화면에 ↻ 버튼이 안 보임(아이콘을 JSON 로드 뒤에 불러옴) → 막다른 화면 | LW1 | |
| N16 | minor | game-developer | 부트 단계 `<title>`·`<html lang>` 고정(영어 기기 오류 화면 lang ko, 한국어 기기 제목 영문) | LW2 | |
| N17 | minor | game-developer | 레벨 시작 판 레벨 이름·등급 대체 글이 aria-hidden 요소에 있어 접근성 트리에 없음 | LW3 | |
| N18 | minor | game-developer | 결과 화면 등급 구름에 대체 글(`grade_N`) 없음 | LW4 | |
| N19 | minor | game-developer (lore-writer 문서) | 레벨 카드 대체 글에 `aria_best`를 상태 키로 써서 progressbar 이름과 중복으로 읽힘 | LW6 | |
| N20 | minor | game-developer (art-director) | `btn_settings` `aria-describedby` 없음, `audio_unlock` 글에 그림 힌트 없음 | LW7 | |
| N21 | minor | lore-writer | 10-lore 7절 "구분" 칸이 1-2 뒤 art·빌드 합의와 어긋남(`levelN_name`·`look_ball`·`pause_screen`·카드 문구 자리), N3·N4·`tap_to_start` 재사용 미기록 | LW8 | |

## 오케스트레이터 결정이 필요한 엇갈림

| # | 항목 | 엇갈림 | 결정할 것 |
|---|---|---|---|
| E1 | N2 늦음 실패 연출 2~3프레임 | QA: criteria 게임 감각 리듬 읽기 "실패 연출이 판정 뒤 2프레임 안"(≤ 33.3 ms) 위반, 유예를 17 ms로 줄이거나 criteria를 고치자고 제안. BA: `LATE_GRACE`는 판정 값을 바꾸지 않고 유예 중 화면 튐·되감김이 없으며 건너뛴 40 ms는 경로의 약 3 %라 **허용**, criteria 읽기를 "유예(≤ 34 ms) + 1프레임(≈ 51 ms)"으로 바꾸자고 제안. 이번 집계 점수는 각 리뷰 그대로(QA 부분·감점 포함, BA 부분 0.5) | BA 허용을 채택해 criteria 리듬 읽기 줄을 고칠지(아래 보류 제안 H1), 유예를 1프레임으로 줄이라고 dev에 지시할지 |
| E2 | N3 소리 크기 차 원인 | QA 진단 "tap_empty는 잡음 생성기 차이" ↔ AD 정정: `sound.json` tap_empty는 사인 1층(잡음 없음), tap_empty·rest_b 차는 짧은 어택 + 빠른 감쇠의 표본 최고값 민감도. 잡음 차는 tap_perfect/good/pass만. QA는 정정을 반박할 근거 없음(AD 근거: `sound.json` 층 정의) | AD 정정을 이 이슈의 원인으로 채택할지. 수정 방법(최고값 정의를 5 ms 창 RMS로 바꿀지, ±1 dB 허용 오차로 둘지) 선택 |
| E3 | M1 무시 구간 수정 방향·심각도 | QA: minor, 무시 구간을 (raw + visual_comp) 기준으로 보거나 ±20으로 줄이기 검토. BD: major, `apply_only_if_abs_over_ms` 30 → **0**(무시 구간 없앰), 두려면 연속 함수 + 이른 쪽 ≤ 15. 집계는 높은 쪽(major) | 수정안 선택(BD 0 / 연속 함수 / QA ±20·기준 변경) |
| E4 | M2 HUD ↔ 구름 | QA: minor(360x640만 확인). AD: major(3해상도, 원인이 30-art 허용 문장). BA: 640x360도 같음을 확인했지만 "art 규칙상 허용 범위"로 보고 감각 점수에서 제외. 규칙 주인(AD)이 그 허용 문장을 스스로 삭제하겠다고 함 | AD 안(구름 윗선 하한 = HUD 띠 아래, 30-art 4-1 문장 삭제)을 승인할지. 집계는 major로 둠 |
| E5 | N5와 M2 수정의 조율 | BA3: 가로 화면 반박 높이를 위해 Hp를 키우거나 V16을 px로 검사하자고 함. AD1 수정안: "Hp·apex_budget·구름 아랫선은 바꾸지 않음". 직접 충돌은 아니지만 가로 화면 세로 공간을 두 수정이 함께 씀 | 640x360 세로 공간 배분(구름 축소 vs Hp 확대)을 art·balance 중 누가 정할지 |
| E6 | 게이트 통과 후 처리 | 숫자로는 3조건 통과(8.025)지만 major 2·REVISE 2 | 검수 알림을 바로 할지, round-2에서 M1·M2를 고친 뒤 할지 |

### 보류 제안 (criteria에 넣지 않음, 오케스트레이터 결정 뒤 반영)
- H1 (benchmark-analyst 제안 1, E1 관련): 게임 감각 리듬 읽기 "무입력 사망 간격" 줄을 "놓침 선언 값이 통과 창 끝이고, 실패 연출 첫 프레임 ≤ 판정 + 입력 유예(≤ 34 ms, DEV_NOTES에 근거) + 1프레임(≈ 51 ms), 연출 위치는 판정 시각 기준 시간 함수(유예 동안 화면이 튀거나 되감기지 않음)"로 바꿈 (rhythm-02: 35.8~50.8 ms). 기존 줄 수정이 필요한 제안이라 이번 1-6 규칙(덧붙이기만)으로도 넣을 수 없음.

## criteria.md에 덧붙인 항목 (13줄, 머리 `(rhythm-02 round-1 추가, <역할> 제안)`)
- 기술 품질 3: 메뉴 전환 최장 프레임 ≤ 100 ms(QA) · 무시 구간 경계 15 ms 이상(QA) · 재판정 두 기준 + 하네스 1 s 분할(QA)
- 게임 감각 2: 통과 창 전 구간에서 대상이 움직이는 프레임에 탭 반응 보임(BA 2) · 가장 짧은 길이 표시 렌더 ≥ 32 px(BA 3)
- 밸런스 3: B6 시드 분포(BD 1) · 보정 잔차 이른 쪽·늦은 쪽 둘 다 + 경계값(BD 2) · 이어 하기 뒤 450 ms 미만 0(BD 3)
- 시각·사운드 3: 정지 장면 요소 ↔ HUD 띠 겹침 없음(AD 1) · 화면 고정 글 자리 `text_slots` + 전 언어 × 4해상도 외곽선 겹침 없음(AD 2 + LW 3 병합) · 소리 표 원본 = 빌드 렌더, 도구 차 ≤ 1 dB(AD 3)
- 세계관·텍스트 2: 오류 화면 글 없이 진행 + 부트 lang·title(LW 1) · 대체 글 접근성 트리 확인(LW 2)
- 넣지 않음: BA 1(H1, 엇갈림 E1)

## rhythm-01과의 구분 (전 리뷰 확인 결과)
- benchmark-analyst: rhythm-01의 궤도·별 표식·보여 주기 마디·북채·차례 신호 없음. 판정 자리 한 곳, 탭 결과가 "공을 올림"(D3) — "안 치면 떨어진다"가 코어 차이. 같은 것은 HUD 틀·레벨 격자·보호자 길게 누르기·소리 맞추기(시리즈 공통, D8 의도). runner-01·orbit-dodge와도 겹침 없음. **blocker 없음.**
- art-director: 실제 빌드 화면으로 재확인 — rhythm-01 어두운 바탕 + 가운데 원 궤도 + 별 vs rhythm-02 밝은 파스텔 + 아래 납작한 북 + 공 하나 + 위 구름. 흑백 썸네일 구도부터 다름. 레벨 선택(글 이름 카드 vs 장면 그림 카드)·소리(똑딱 vs 콩, 잡음 층 0)도 다름. 공통점은 진행도 막대·멈춤 버튼(위치도 반대)뿐. **헷갈리지 않음.**
- lore-writer: 정체성 문구(타이틀·레벨 이름·카드·튜토리얼·클리어·등급 등) KR·EN 글자 겹침 0, 겹치는 문구는 공통 UI 키(메뉴·보정 흐름·불러오기)뿐. rhythm-01 용어(별·궤도·북채·둥둥이·똑딱·박자) 0, 보정 이름도 "소리 맞추기"로 다름. 참고: 보호자·카드 다시 보기 그림이 rhythm-01 공통 UX 그림과 모양이 가까움(이슈 아님).
- qa-engineer: 빌드 88파일에서 레퍼런스·타 팀 이름 0, 외부 URL 0(`parts/static.json`). rhythm-01 화면 비교는 따로 하지 않음.
- balance-designer: 별도 절 없음. 레벨 배치는 자체 설계이고 원본 보호 위반 없음으로만 적음.
- 결론: 다섯 리뷰 중 구분을 직접 본 세 리뷰(BA·AD·LW) 모두 헷갈림 없음, blocker 0.
