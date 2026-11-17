# 점수 집계: round 1 (rhythm-01 / 똑딱북: Tickadrum)

- 날짜: 2026-11-17 · 집계: qa-engineer (1-6)
- 입력: `qa.md`, `benchmark-analyst.md`, `balance-designer.md`, `art-director.md`, `lore-writer.md` (모두 이 폴더), 오케스트레이터 결정 `Docs/orchestrator/2026-11-17-1-7-round1-gate-and-round2-decisions.md`(R1~R10)
- 가중치: `harness/criteria.md` "점수 산정". 점수는 각 리뷰 "점수" 절의 값을 그대로 옮겼습니다(집계에서 바꾸지 않음).

## 영역별 점수

| 영역 | 채점 역할 | 점수 | 가중치 | 가중 점수 | 체크 항목 근거 (각 리뷰 "점수" 절) | VERDICT |
|---|---|---|---|---|---|---|
| 게임 감각·핵심 루프 | benchmark-analyst | 7.0 | 25 % | 1.750 | 10/11 (게임 감각 5/5 리듬 등가 해석, 대상 연령 4/5 — 글 없이 조작 학습 실패, 원본 보호 1/1) | REVISE |
| 밸런스·레벨 | balance-designer | 7.0 | 20 % | 1.400 | 9/9, 단 B6이 정수 중앙값 반올림 경계에서만 통과(연속 추정 +32 %), 북채 신호 겹침 major | REVISE |
| 시각·사운드 | art-director | **6.0** | 20 % | 1.200 | 3/5 (640x360 타이틀 겹침, 세로 카드 공 16 px 미만) | REVISE |
| 세계관·텍스트 | lore-writer | 7.0 | 10 % | 0.700 | 4/5 (등급 북이 레벨 이름을 덮음) | REVISE |
| 기술 품질·안정성 | qa-engineer | 7.5 | 25 % | 1.875 | 11/12 (6배 스로틀 1% low ≥ 45 실패, 4/12 창만 통과) | REVISE |
| **가중 총점** | | **6.925** | 100 % | 6.925 | | |

계산: 7.0×0.25 + 7.0×0.20 + 6.0×0.20 + 7.0×0.10 + 7.5×0.25 = 1.750 + 1.400 + 1.200 + 0.700 + 1.875 = **6.925**. 오케스트레이터 1-7 문서의 예비값 6.925와 같음.

## 게이트 판정

| 조건 | 기준 | round-1 | 결과 |
|---|---|---|---|
| 가중 총점 | 8.0 이상 | 6.925 | **실패** (−1.075) |
| 모든 영역 | 6.0 이상 | 최저 6.0 (시각·사운드) | 통과 (경계값, 여유 0) |
| blocker | 0개 | 0개 (5개 리뷰 모두 blocker 없음, 원본 보호 위반 없음) | 통과 |

**판정: 게이트 실패 → round-2 진행** (round 1/5). 검수 알림·Pages 배포 대상 아님.

총점에 가장 크게 걸리는 것: 다섯 리뷰가 모두 짚은 L1 북채·손가락 신호 겹침(M1), 1% low(M2), B6 측정 정의(M3), 세로 카드 크기(M4)·멜로디 자리 표시(M5). 시각·사운드 6.0은 경계값이라 round-2에서 떨어지면 영역 조건도 실패합니다.

## 이슈 전체 목록 (중복 병합)

- 심각도 합계: blocker 0 · major 5 (M1~M5) · minor 17 (N1~N17) · 합계 22건
- 출처 표기: QA = `qa.md`, BA = `benchmark-analyst.md`, BD = `balance-designer.md`, AD = `art-director.md`, LW = `lore-writer.md`, 숫자는 각 리뷰의 이슈 번호
- "R"은 오케스트레이터 1-7 문서 "round-2 결정"의 번호. 출처마다 심각도가 다르면 높은 쪽을 따름.

| # | 심각도 | 담당 역할 | 내용 (요약) | 출처 리뷰 | R | round-2 처리 |
|---|---|---|---|---|---|---|
| M1 | major | balance-designer · art-director (규칙), game-developer (구현), lore-writer (문장) | L1 첫 따라 치기 별 1박 전(3.82~4.36 s)에 손가락·`tut_tap`(칠 차례)과 북채·점선 궤도(볼 차례)가 함께 보임(546 ms 겹침, 4해상도, D13으로 재시도마다 반복). 넓게는 보여 주기 런 16개 중 15개에서 북채가 다음 판정 별 위험 구간(놓침 구역 시작~통과 창 끝)과 겹침. 10-lore 4절 문장 모순 | QA2, BA1, BD2, AD1, LW1 | R1 | balance: `teacher.mallet_hide_at: "last_show_star"`·`mallet_hide_after_beats 0.5`·`mallet_shrink_beats 0.25`(기존 키 폐기 표시), 검증기 S15 강화·S16 신설 / art: 30-art 5-4·6절 / lore: 10-lore 4절 / dev 구현 → QA 겹침 0 확인 |
| M2 | major | game-developer | 6배 스로틀 1% low < 45 fps: 레벨 시작 0~10 s 4구성 모두 31.9~37.9, L10 시작 DPR 3 43.5~44.6, 재시작 직후 43.6·44.1. 감각 쪽은 판정·공 위치가 프레임과 분리돼 minor지만 긴 프레임(4.3 s, 38 ms)이 L1 첫 별 직전 | QA1, BA3 | R5 | dev: 오디오 노드 재사용·곡 예약 묶기, 정적 배경 오프스크린 캐시, 손가락·북채·카드 첫 그림 미리 그리기 → QA `--part perf` 재측정 |
| M3 | major | balance-designer (+ qa-engineer) | 요청자 지시 B6(L10 = 3레벨 곡선의 L6)이 정수 중앙값 L1 2/3 경계(51.9 %)에 걸려 목표 19.76 ↔ 10.76으로 뒤집힘. 연속 중앙값으론 T ≈ 13.7인데 L10 18.0(+32 %)으로 목표 밖. QA 표는 빌드 L1~L3와 시뮬 목표를 섞어 판정함 | BD1, BD6 | R3 | balance: 연속 중앙값 ln0.5/ln(1−p)로 목표 재계산, L4~L10 재조정(30회·2배·L7 20회·엄격 단조 유지), 검증기 출력 / qa: B6은 시뮬레이터 전체 실행 한 원천으로만 적고 빌드 봇은 일치 확인용 / criteria 반영(이번 1-6 완료) |
| M4 | major | art-director (규격), game-developer (세로 배치) | 세로 화면 그림 카드 속 공 지름 360x640 약 12.6 px·412x915 약 14.6 px(별 14~18, 손가락 13) → notext 16 px 기준 실패. 412x915 카드 칸 약 110 px로 작음 | AD2, LW9(크기 부분) | R6 | art: 세로용 `card_<id>_portrait.svg` 5장, 30-art 9절에 화면 px 최소값 / dev: 방향별 파일 선택 → QA 4해상도 렌더 px 측정 |
| M5 | major | art-director | 멜로디가 10레벨 모두 같은 `degree_walk` 자리 표시(D10), 30-art 12-5 약속 미이행. 기능 문제 없음 | AD3 | R7 | art: 레벨별 2마디 동기 10개(별 시각 시작 금지, L10은 L1 되부름)를 `music.json` 형식으로 → dev |
| N1 | minor | game-developer (art-director 규칙) | 레벨 선택 카드 등급 북이 레벨 이름 글자에 닿거나 덮음(L1·L3·L10) | QA3, AD4, LW2 | R6 | art 결정: 궤도 → 점 → 등급 북 → 이름 줄 흐름, 줄 간 ≥ 4 px, 넘치면 궤도 축소 → 이름 숨김(aria 유지) / dev |
| N2 | minor | game-developer (art-director 규칙) | 640x360 타이틀 손가락·"눌러서 시작"이 궤도 아래 테두리에 닿음 | QA4, AD5, LW3 | R6 | art: 가로 타이틀 힌트를 궤도 오른쪽 세로 가운데, 30-art 4절 "타이틀 화면" 줄 / dev |
| N3 | minor | balance-designer (game-developer 확인) | 보정 IQR 사분위 정의가 빌드(`calib.js` 선형 보간)와 `bots.mjs`(반올림 순위) 다름 → σ70 받아들임/버림 6.0 % 차이. IQR 실패 시 재시도 구조도 다름 | QA5, BD4 | R4 | balance: 빌드 정의 기준으로 `bots.mjs` 통일, 20-balance 8-3·8-4 정의 명시·재측정. 빌드 수정 없음 |
| N4 | minor | balance-designer | 밀림 감지(8-5) 8탭 중앙값·표본 정의가 빌드(D15)와 `bots.mjs` 다름 | BD5 | R4 | balance: D15 정의 채택, bots 수정, 8-5 표 재측정 |
| N5 | minor | art-director · lore-writer (규칙), game-developer | 기록 지우기 확인 창 두 버튼이 글뿐이라 notext에서 구분 불가, 위험한 "지우기"가 강조색 | QA6, AD10, LW4 | R6 | art 결정: 취소 = 왼쪽 화살표·기본 강조, 지우기 = `icon-reset`·테두리만 / dev |
| N6 | minor | art-director (표시 설계), game-developer | 깨지 못한 레벨의 최고 진행도가 레벨 선택 화면에 안 보임(F3 숙달 동기 약함) | BA2 | R6 | art: 카드 아래 진행도 막대 + 공 색 점(글·숫자 없음) / dev |
| N7 | minor | game-developer (balance-designer 확인) | 자동 지연 표시값 `auto` 74 ms와 판정 `comp` 66 ms가 같은 페이지에서 다름 | BA4 | R9 | dev: 갱신 시점을 하나로, DEV_NOTES 기록 |
| N8 | minor | balance-designer | L1 손가락 누름 시작(0.5박 전, −273 ms)이 첫 별 놓침 구역 [−290, −150] 안 → 손가락 따라 친 아이가 "너무 일찍" 실패 | BD3 | R2 | balance: `press_from_beats_before` 0.5 → 0.25, S15에 "누름 시작 ≥ −pass_early" |
| N9 | minor | game-developer, art-director (표 형식) | `music.json` `calib_check_hz: null`(표 파싱 실패) → 보정 체크 방울이 1046.5 Hz가 아님 | AD6 | R7 | art: `assets/sound.json` 원본 제공 / dev: 숫자 읽기·실패 시 빌드 중단, 1046.5 Hz |
| N10 | minor | art-director (12-4 정의), game-developer | 여러 층 소리 최고값이 표보다 1~2 dB 큼. 클리어 음 −6.5 = 아이 탭 −6.6, 탭−둥둥이 차 4.8 dB(의도 6) | AD7 | R7 | art: 층 합 최고값 기준·정규화 계수, Tt −12.6 dB, 클리어 음 −10 dB / dev → QA 오프라인 렌더 재측정 |
| N11 | minor | art-director | 카드 다시 보기 버튼(D6)이 카드 축소판이라 48 px 안에서 뭉개짐 (D6 반려) | AD8 | R6 | art: 전용 `icon-card.svg` / dev |
| N12 | minor | art-director (30-art 4-4) | 1280x720 손가락 64 px 고정이라 작고 궤도와 멀음 | AD9 | R6 | art: 크기 `max(64, 0.30R)`, 위치 궤도 오른쪽 아래 바깥 / dev |
| N13 | minor | game-developer | 시도 점 줄 대체 글이 "해 본 횟수 1"처럼 숫자를 글에 이어 붙임(10-lore 7-8 위반) | LW5 | R8 | dev: `role="meter"` + `aria-valuenow`, 라벨 `aria_attempts`만 |
| N14 | minor | game-developer | 10-lore 키 미사용: 결과 등급 `grade_*`·`practice_clear` aria 없음, `aria_checkpoint`·`btn_settings` 0회 | LW6 | R8 | dev: 세 곳에 키 연결 |
| N15 | minor | game-developer (art-director) | 불러오는 중 화면이 완전히 검정, 실패 ↻ 버튼 aria 비어 있음 | LW7 | R8 | dev: 정적 공 회전 그림, ↻ aria는 빌드 스크립트가 `loading`·`load_error` 주입 |
| N16 | minor | art-director (game-developer) | L10 결과 "다음" 자리 → 그림인데 동작·대체 글은 "레벨 고르기" | LW8 | R8 | art·dev: 마지막 레벨은 버튼 2개 또는 네모 4개 그림 / lore: 6-3 문장 보강 |
| N17 | minor | art-director | `card_star_tap` 카드 속 손가락은 북 위, 실제 L1 손가락은 엄지 받침(가로는 오른쪽) | LW9(위치 부분) | R10 | art: 카드 손가락 위치를 실제 화면과 같게 |

병합 계산: 원본 이슈 35건(QA 6, BA 4, BD 6, AD 10, LW 9). 두 사안이 섞인 LW9(카드 손가락 위치 / 카드 크기)를 나눠 36항목으로 보고, 같은 사안 묶음 M1(5항목), M2(2), M3(2), M4(2), N1(3), N2(3), N3(2), N5(3)를 하나로 합쳐 22건이 됐습니다(36 − 14 = 22).

## round-2 처리 담당별 요약

| 담당 | 이슈 |
|---|---|
| balance-designer | M1(teacher 키·S15·S16), M3(B6 재계산·L4~L10 재조정), N3, N4, N8 |
| art-director | M1(30-art 5-4·6절), M4(세로 카드), M5(멜로디 동기), N1·N2·N5·N6·N11·N12(규칙), N9·N10(`assets/sound.json`·12-4), N16, N17 |
| lore-writer | M1(10-lore 4절 문장), N5(확인 창 문구 확인), N16(6-3 문장) |
| game-developer (위 기획 갱신 후 `sync-data`) | M1, M2, M4, M5, N1, N2, N5, N6, N7, N9, N10, N11, N12, N13, N14, N15, N16 |
| qa-engineer | M3 B6 판정 원천 정리(criteria 반영 완료, 1-6), round-2 QA에서 M1 겹침 0·M2 1% low·M4 렌더 px·N10 오프라인 렌더 재측정, 회귀 |

## 이번 집계에서 criteria.md에 반영한 것
- 5역할 리뷰의 "criteria 추가 제안"을 중복 병합해 12줄을 해당 절 끝에 덧붙임(기술 품질 2, 게임 감각 3, 밸런스 3, 시각·사운드 3, 세계관·텍스트 1). 머리는 `(rhythm-01 round-1 추가, <제안 역할> 제안)`, 이 게임 전용 수치·읽는 법은 `(rhythm-01: ...)`.
- 오케스트레이터 결정 R3(B6 연속 중앙값, 시뮬레이터 전체 실행 한 원천, 정수 중앙값 참고)를 밸런스 절에 반영.
- 기존 줄은 지우거나 바꾸지 않음(node 검사로 확인). 자세한 목록은 `Docs/qa-engineer/2026-11-17-1-6-round1-score.md`.
