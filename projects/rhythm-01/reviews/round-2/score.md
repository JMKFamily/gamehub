# 점수 집계: round 2 (rhythm-01 / 똑딱북: Tickadrum, 가안)

- 날짜: 2026-11-17 · 집계: qa-engineer (1-6)
- 입력: `qa.md`(1-6 재측정 절 포함), `benchmark-analyst.md`, `balance-designer.md`, `art-director.md`, `lore-writer.md`, `metrics.json`(`parts/firstrun.json` 포함), 오케스트레이터 기록 `Docs/orchestrator/2026-11-17-1-7-round1-gate-and-round2-decisions.md` "round-2 1-5 리뷰 감시"
- 가중치: `harness/criteria.md` "점수 산정". 점수는 각 리뷰 "점수" 절의 값을 그대로 옮겼습니다. 기술 품질만 오케스트레이터 지시에 따른 1-6 재측정 반영값입니다(`qa.md` "1-6 재측정").
- 게이트 최종 판단은 오케스트레이터(1-7)가 합니다. 이 문서는 판정표 결과까지입니다.

## 영역별 점수

| 영역 | 채점 역할 | 점수 | 가중치 | 가중 점수 | 체크 항목 근거 (각 리뷰 "점수" 절) | VERDICT |
|---|---|---|---|---|---|---|
| 게임 감각·핵심 루프 | benchmark-analyst | 8.5 | 25 % | 2.125 | 13/13 (게임 감각 7/7 리듬 등가, 대상 연령 5/5, 원본 보호 1/1) | PASS |
| 밸런스·레벨 | balance-designer | 7.5 | 20 % | 1.500 | 13/13, 단 첫 실행 보정 이중 보정 major로 감점 | REVISE |
| 시각·사운드 | art-director | 9.0 | 20 % | 1.800 | 8/8 (블록 외곽선 항목 해당 없음) | PASS |
| 세계관·텍스트 | lore-writer | 9.0 | 10 % | 0.900 | 6/6 | PASS |
| 기술 품질·안정성 | qa-engineer | **6.5** (1-4 값 7.5) | 25 % | 1.625 | 11/14 (1-4 12/14에서 "보정 결과 들리는 박 ±10 ms"가 autoNow 기준 재측정으로 실패 +62.6~+69.0 ms) | REVISE |
| **가중 총점** | | **7.95** | 100 % | 7.950 | | |

계산: 8.5×0.25 + 7.5×0.20 + 9.0×0.20 + 9.0×0.10 + 6.5×0.25 = 2.125 + 1.500 + 1.800 + 0.900 + 1.625 = **7.950**.
참고: 재측정 전 기술 7.5로 계산하면 2.125 + 1.500 + 1.800 + 0.900 + 1.875 = 8.200 (오케스트레이터 예비값 8.20과 같음).

## 게이트 판정표

| 조건 | 기준 | round-2 | 결과 |
|---|---|---|---|
| 가중 총점 | 8.0 이상 | 7.95 | **미충족** (−0.05). 재측정 전 값 8.20이었다면 충족 |
| 모든 영역 | 6.0 이상 | 최저 6.5 (기술 품질) | 충족 |
| blocker | 0개 | **1개** (B1 첫 실행 보정 이중 보정, QA 1-6 재측정에서 blocker로 확정 제안) | **미충족** |

**판정표 결과: 3조건 중 2개 미충족** (총점·blocker). B1을 major로 둘 경우에도 총점 7.95로 미충족 — 기술 점수 6.5는 B1 심각도와 별개로 체크 실패(11/14)를 반영한 값이라, 심각도를 major로 내려도 7.0 이상으로 볼 근거는 없습니다(최대로 봐도 체크 통과율 79 %).

### B1 심각도 근거 요약 (자세한 것은 `qa.md` "1-6 재측정")
- 기본 경로: 빈 저장소 → 실제 타이틀 클릭 → 자동 첫 실행 보정 → L1. 보정을 바르게 할수록 생김. 재현 4/4(1차 포함 7/7), 보정 건너뛴 대조는 정상(L1 오차 −2.5 ms).
- 수치: 보정 중 게임 auto 10 고정, 실제 autoNow 66/74 → 오프셋 오차 +62.6~+69.0 ms → L1 판정 65~72 ms 이르게. 측정 치우침 −66 ms로 σ70 봇 L1 2 → **17회**, L2 **60회**, L3 147회, L4~L10 200회 상한 넘음 (기기 오차 U(−20, +40)를 더해도 L1 10·L2 28·L3 49·L4 77회).
- 판단: 아이의 기본 첫 실행에서 핵심 플레이(L1 목표·30회 한도)가 깨지고, 저장돼 계속 남으며, 아이가 스스로 피할 수 없음 → blocker. major로 남길 조건(실기기에서 Δ < 10 ms 확인, 또는 첫 실행 보정이 기본 흐름이 아님)은 이번 빌드·환경에서 성립하지 않음. 한계: Edge 헤드리스·PC 출력 장치 값.

## 이슈 통합 목록 (중복 병합)

- 심각도 합계: **blocker 1 · major 1 · minor 6 · 합계 8건**
- 출처 표기: QA = `qa.md`, BA = `benchmark-analyst.md`, BD = `balance-designer.md`, AD = `art-director.md`, LW = `lore-writer.md`, 숫자는 각 리뷰 이슈 번호. 출처마다 심각도가 다르면 높은 쪽(+ 1-6 재측정)을 따름.

| # | 심각도 | 담당 역할 | 내용 (요약) | 출처 | 재현·근거 |
|---|---|---|---|---|---|
| B1 | **blocker** | game-developer (balance-designer 확인, qa-engineer 재측정) | **첫 실행 보정 이중 보정**: 타이틀 탭 한 번에 오디오 잠금 해제와 보정 시작이 겹쳐 보정 내내 자동 지연 10 ms 고정 → 수동 오프셋 +63~69 ms 저장 → 보정 끝에 auto 66/74로 바뀌어 comp = 실제 + 오프셋. 모든 레벨 판정 65~72 ms 이름, σ70 L1 17·L2 60회. 같은 원인의 레벨 판정 경로(잠금 해제 0.2 s 안 레벨 시작 시 auto 고정, 재시작 때 다시 안 읽음)도 포함 | BD1, QA3(1-4 minor → 1-6 blocker), BA2, QA 1-6 재측정 | `tools/qa-round.mjs --round 2 --part firstrun` → `parts/firstrun.json`. 빌드 `js/main.js` `afterTitle`→`startCalib(true)`, `calibTap`의 `clock.auto`, `calibEnd`의 `updateComp()`, `beginRun`만 갱신 |
| M1 | major | game-developer | 6배 스로틀 1% low ≥ 45 실패(round-1 M2 남음): 표준 3회 모두 10/12(30/36), 대기 변형 22/24. 빌드 원인 6창(412x915 L1 4.7 s 86.3 ms 프레임 = 게임 rAF 스크립트 47.9 ms, L10 시작·재시작 23~39 ms 몰림). 감각 쪽은 첫 "딱" 직후 끊김으로 minor 영향 | QA1, BA1 | `--part perf --perf-runs 3`, `perfctl`, `perf-delay500` |
| N1 | minor | game-developer | 테스트 훅에서 준비 직후 3프레임 안 레벨 시작 시 `warmScreens()`가 `#tut` 숨김을 못 되돌려 "별에 닿으면 톡!"이 북채(볼 차례)와 함께 보임. 일반 UI에서는 사실상 안 생김 | QA2, AD3, LW2 | `shots/360x640-m1-lt150.png` vs `360x640-play-l1-countin.png`, `js/main.js` 83~88행 |
| N2 | minor | art-director (30-art 5-4 문장), game-developer | 북채 사라지는 0.25박 끝에 굵은 크림 고리가 번쩍임(점선 빈칸만 줄여 세 번째 실선 고리) | AD1 | `shots/1280x720-m1-mallet-last.png`, `360x640-m1-mallet-last.png` |
| N3 | minor | art-director (30-art 9-1) | 360x640 세로 카드 크기 여유 0: 도형 기준 통과지만 면 기준 공 16~17·별 15~17 px, 안전 영역·짧은 화면에서 기준 끝 | AD2 | `art-shots/360x640-card-l1-notext-full.png`, `parts/cards.json` |
| N4 | minor | game-developer (art-director 숨김 순서 결정, lore-writer 영어 이름) | 영어 360x640 레벨 선택에서 L9 "Above the Clouds" 이름만 숨겨짐(규칙대로지만 다른 카드와 모양 다름) | LW1 | `shots/360x640-levels-new-en.png`, `js/main.js` 271행 |
| N5 | minor | balance-designer | 검증기·20-balance 8-3 보정 시나리오가 "보정 때 auto = 레벨 때 auto"를 가정해 B1을 못 잡음 | BD2 | `tools/verify-levels.mjs` `calibrationBias`·`guardianCalibrationBias` |
| N6 | minor (1-6에서 처리) | qa-engineer | QA 보정 실측의 들리는 박이 게임 고정값 기준이라 자기 일관 → B1을 놓침 | BD3 | 1-6 재측정으로 처리: `--part firstrun`(autoNow 기준), criteria 기술 절에 측정 정의 줄 추가 |

병합 계산: 원본 이슈 13건(QA 3, BA 2, BD 3, AD 3, LW 2). 같은 사안 묶음 B1(BD1·QA3·BA2), M1(QA1·BA1), N1(QA2·AD3·LW2)를 하나로 합쳐 13 − 5 = 8건.

### 담당별 요약
| 담당 | 이슈 |
|---|---|
| game-developer | B1(지연 값 읽는 시점), M1(1% low 빌드 원인 프로파일), N1, N2(구현), N4 |
| balance-designer | B1 확인(수정 뒤 봇 표), N5(8-1·8-3 가정, `calibration_auto_shift_ms` 검토) |
| art-director | N2(30-art 5-4), N3(세로판 규격), N4(숨김 순서에 글자 축소 넣을지) |
| lore-writer | N4(영어 이름 줄이기는 오케스트레이터 결정이 있을 때) |
| qa-engineer | B1 수정 확인(`--part firstrun` 오프셋 ±10 ms·comp − autoNow·L1 오차 ≈ 0), M1 재측정(3회 반복), N1 회귀 |

## round-1 대비 변화

| 항목 | round-1 | round-2 | 변화 |
|---|---|---|---|
| 게임 감각 | 7.0 | 8.5 | +1.5 (M1 신호 겹침·N6 진행도 해결) |
| 밸런스 | 7.0 | 7.5 | +0.5 (M1·M3 해결, B1로 감점) |
| 시각·사운드 | 6.0 | 9.0 | +3.0 (M4·M5·N1·N2 등 11건 해결) |
| 세계관·텍스트 | 7.0 | 9.0 | +2.0 (9건 해결) |
| 기술 품질 | 7.5 | 6.5 | −1.0 (1% low 4/12 → 회당 10/12로 개선했지만 아직 실패, 보정 ±10 ms 재측정 실패·blocker) |
| 가중 총점 | 6.925 | **7.95** | +1.025 (재측정 전 8.20) |
| 최저 영역 | 6.0 (시각) | 6.5 (기술) | +0.5 |
| blocker / major / minor | 0 / 5 / 17 (22건) | **1 / 1 / 6 (8건)** | 이슈 −14건, blocker +1 |
| round-1 이슈 처리 | — | 22건 중 해결 20 · 부분 1(N7 → B1로 이어짐) · 미해결 1(M2 → M1) | 다시 생긴 이슈 0 |

## 이번 집계에서 criteria.md에 반영한 것 (덧붙이기만, 기존 줄 변경·삭제 0)
- 4줄 추가, 머리 `(rhythm-01 round-2 추가, <제안 역할>)`:
  - 기술 품질 2: 성능 3회 이상 반복 측정·원인 기록(qa-engineer 제안·benchmark-analyst 지지) / 보정 때와 플레이 때 자동 지연이 달라도 이중 보정 없음, autoNow 기준 들리는 박 ±10 ms·자기 일관 측정 금지(balance-designer·qa-engineer 제안)
  - 밸런스 1: 보정 영향 봇 표에 자동 지연 차이 Δ 시나리오(balance-designer 제안)
  - 시각·사운드 1: 신호 전환 중 앞뒤 상태에 없는 선·면 없음(art-director 제안)
- 채택하지 않은 후보: QA "워밍업 코드가 보임 상태를 어긋나게 남기지 않음"(기존 줄 "테스트 훅 화면 = 일반 모드"로 이미 실패 판정이 되므로 줄을 늘리지 않음), QA "자동 지연을 안정될 때까지 다시 읽기"(구현 방법이라 체크가 아님 → 위 기술 2번째 줄의 결과 조건으로 합침), BD "기술·밸런스 공통 이중 보정 줄"(위 기술 줄로 합침). benchmark-analyst·lore-writer는 추가 제안 없음.
