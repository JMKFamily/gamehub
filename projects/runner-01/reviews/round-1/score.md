# 점수 집계: round 1 (runner-01 / Reverbound)

- 날짜: 2026-11-17 · 집계: qa-engineer (1-6)
- 입력: `qa.md`, `benchmark-analyst.md`, `balance-designer.md`, `art-director.md`, `lore-writer.md` (모두 이 폴더), 오케스트레이터 결정 `Docs/orchestrator/2026-11-17-1-7-round1-gate-and-round2-decisions.md`
- 가중치: `harness/criteria.md` "점수 산정"

## 영역별 점수

| 영역 | 채점 역할 | 점수 | 가중치 | 가중 점수 | 체크 항목 근거 (각 리뷰 "점수" 절) | VERDICT |
|---|---|---|---|---|---|---|
| 게임 감각·핵심 루프 | benchmark-analyst | 7.0 | 25 % | 1.750 | criteria 3/3, 레퍼런스 실측 기준 2/3, 대상 연령 첫 레벨 클리어 실패 | REVISE |
| 밸런스·레벨 | balance-designer | **5.5** | 20 % | 1.100 | 4/5 (첫 레벨 5~6세 클리어 실패), 20-balance 자체 규칙 2개 실패 | REVISE |
| 시각·사운드 | art-director | 7.8 | 20 % | 1.560 | 5/5, 소리는 귀로 미검증 | REVISE |
| 세계관·텍스트 | lore-writer | 6.5 | 10 % | 0.650 | 3/4 (낱말 중간 줄바꿈, 영어 미확인) | REVISE |
| 기술 품질·안정성 | qa-engineer | 7.5 | 25 % | 1.875 | 8/12 (기존 7/7, round-1 추가 5개 중 1개 통과) | REVISE |
| **가중 총점** | | **6.935 (≈ 6.94)** | 100 % | 6.935 | | |

계산: 7.0×0.25 + 5.5×0.20 + 7.8×0.20 + 6.5×0.10 + 7.5×0.25 = 1.750 + 1.100 + 1.560 + 0.650 + 1.875 = **6.935**. 오케스트레이터 결정 문서의 "약 6.94"와 일치.

## 게이트 판정

| 조건 | 기준 | round-1 | 결과 |
|---|---|---|---|
| 가중 총점 | 8.0 이상 | 6.935 | **실패** (−1.065) |
| 모든 영역 | 6.0 이상 | 최저 5.5 (밸런스·레벨) | **실패** |
| blocker | 0개 | 0개 (5개 리뷰 모두 "blocker 없음", 원본 보호 위반 없음) | 통과 |

**판정: 게이트 실패 → round-2 진행** (round 1/5). 검수 알림·Pages 배포 대상 아님.

총점 8.0에 가장 크게 걸리는 것: 밸런스 5.5(레벨 1 아동 난이도·사망 몰림·기믹 과다), 게임 감각 7.0(체공·거리 −7 %), 세계관 6.5(문구 길이).

## 이슈 전체 목록 (중복 병합)

- 심각도 합계: blocker 0 · major 6 (S1~S6) · minor 26 · 합계 32건
- "출처" 칸의 표기: QA = `qa.md`, BA = `benchmark-analyst.md`, BD = `balance-designer.md`, AD = `art-director.md`, LW = `lore-writer.md`, 숫자는 각 리뷰의 이슈 번호
- "round-2 처리 담당"은 오케스트레이터 결정의 round-2 작업 배분 기준입니다. 결정 번호는 결정 문서 "리뷰 간 충돌에 대한 오케스트레이터 결정"의 번호입니다.

| # | 심각도 | 담당 역할 | 내용 (요약) | 출처 리뷰 | round-2 처리 담당 |
|---|---|---|---|---|---|
| S1 | major | balance-designer | 레벨 1을 5~6세가 몇 번 시도로 못 깸. σ70 봇 시도당 0.5 %, 60세션 중 32세션 200회 안에 미클리어. 원인: 필수 탭 35회, 1박 2연속(146 ms) 8개 | QA1, BA4, BD1 | balance-designer (`levels/`, 결정 5: 필수 탭 12~16, 모든 창 ≥ 200 ms, 2연속 없음, σ70 중앙 ≤ 5회) → game-developer `sync-data` → qa-engineer 봇 재측정 |
| S2 | major | balance-designer | 숙련 봇 사망이 3연속 장애물 한 곳에 60 % 넘게 몰림 (L2 93.5박·110박, L3 60박, 창 45.8 ms) | QA2, BD2 | balance-designer (`levels/`, `verify_min_window_ms` 상향) |
| S3 | major | balance-designer | 레벨당 새 기믹 수 초과(최대 1개 규칙). 천장 장애물은 "뛰지 마세요" 반대 행동 규칙이라 글에 기댐 | BD3 | balance-designer (결정 4: L1 바닥 가시·낮은 장애물, L2 블록, L3 점프 발판, 나머지는 `20-balance.md` 확장 후보) |
| S4 | major | balance-designer | 레벨 2·3 난이도가 20-balance 목표보다 가파름 (σ50 L2 기대 시도 66.7, L3 0/200, σ70 L2 사망 90/200이 첫 10 %) | BD4 | balance-designer (`levels/` L2 ≤ 30탭, L3 ≤ 45탭) |
| S5 | major | balance-designer (+ benchmark-analyst) | 점프 체공 0.400 s vs 레퍼런스 0.43 s(−7 %), 거리 4.16 t vs 4.5 t(−7.6 %), 중력 약 18 % 강함 | BA1, BD6 | balance-designer (결정 1: `gravity` ≈ 91.5, `jump_velocity` ≈ 19.8, 발판 속도 재계산, 검증기 ALL PASS). benchmark-analyst는 실측 확정 시 `00-benchmark` 4-1 갱신 |
| S6 | major | lore-writer | 화면 문구가 5~6세에게 길고 어려움 (세계관 용어·"탭"·두 문장 카드). 사망 문구 추상적 | LW1 | lore-writer (결정 6: 플레이 중 12자 이내, 화면 모양 이름 사용, `10-lore.md` 5절) |
| S7 | minor | balance-designer (+ qa-engineer: criteria 문구) | 사망 → 다시 움직임 0.72 s로 레퍼런스 1.05 s보다 31 % 빠름. BD6의 "0.6 s 유지" 안과 충돌 | BA2, BD6(재시작 부분), QA "재시작 시간 메모" | balance-designer (결정 2: 0.90~1.20 s, `restart_delay_s` 상향, BD "0.6 s 유지" 기각). qa-engineer는 criteria 문구 교체 완료(이번 1-6) |
| S8 | minor | balance-designer (+ benchmark-analyst) | 바닥 가시 가로 판정이 레퍼런스보다 관대 (무입력 사망 중심 간격 0.625 t vs 0.745 t) | BA3 | balance-designer (결정 3: 0.745 t ± 0.05, `spike_hitbox_w_t` 조정 후 창 재계산). benchmark-analyst는 점프 중 사망 높이 실측 보강 |
| S9 | minor | balance-designer | 레벨 목표 지표(`difficulty.*`)가 어떤 플레이어 기준인지 정의 없음 | BD5 | balance-designer (봇 프로필별 목표, `verify-levels.mjs` 해석값 출력) |
| S10 | minor | balance-designer | 숙련 봇 클리어율 L2 44 % < L3 51 % 역전 (평균 진행도 단조 증가는 통과) | BD7 | balance-designer (S2 수정으로 해소 여부) → qa-engineer round-2 재확인 |
| S11 | minor | game-developer (+ lore-writer) | 매 사망 글 토스트(사망 문구)가 뜸. 글 의존 원칙과 레퍼런스 감각에 어긋남 | BA5, LW1(사망 문구 부분) | game-developer (결정 6: 사망 토스트 제거, 첫 사망 ↻ 아이콘·최고 기록 표시만 유지) |
| S12 | minor | art-director (규칙) · game-developer (구현) | 640x360에서 레벨 1 손가락 시연이 튜토리얼 카드 아래 끝과 겹침, 플레이어와 멀어 연결 약함 | QA8, AD1 | art-director (`30-art.md` 손가락 시연 위치 규칙: 플레이어 기준) → game-developer |
| S13 | minor | game-developer | 세로 레벨 선택에서 뒤로 버튼이 "일반 모드" 버튼을 29 px 덮음 | QA3 | game-developer |
| S14 | minor | game-developer | 640x360 설정 패널 세로 넘침(453 > 262 px), 스크롤 표시 없음 | QA4 | game-developer |
| S15 | minor | game-developer | 6배 스로틀 1% low 640x360@3x 레벨 1 37.8 fps (최대 117 ms), 1280x720 46 fps. 레벨 시작·재시작 직후 스파이크 추정 | QA5 | game-developer → qa-engineer round-2 재측정 |
| S16 | minor | game-developer | `?test=1` 훅 화면이 일반 모드와 다름: 첫 튜토리얼 카드 숨김, 토스트 만료가 `performance.now()` 기준이라 클리어 화면 뒤에 남음 | QA6 | game-developer (표시 시간을 게임 시간 기준으로) |
| S17 | minor | game-developer | 세로 모드 회전 안내가 플레이 중에도 계속 남음 | QA7 | game-developer |
| S18 | minor | game-developer (+ art-director) | 맞닿은 계단 블록이 블록마다 외곽선을 따로 그려 이음매가 생김 (30-art 3절 규칙 6 미적용) | AD2 | art-director (`30-art.md` 이음매 규칙 명시) → game-developer |
| S19 | minor | game-developer | 클리어 연출 색 판 위에서 HUD 흰 글자가 안 보임, 세로 모드는 게임 영역만 칠해짐 | AD3 | game-developer |
| S20 | minor | game-developer | 튜토리얼 카드 그림 속 플레이어·위험이 8~12 px로 작음 | AD4 | game-developer |
| S21 | minor | game-developer | 설정 아이콘이 과녁처럼 보임, 첫 화면 "탭해서 시작" 손가락 아이콘이 작고 흐림 | AD5 | game-developer |
| S22 | minor | game-developer (+ art-director) | 레벨 선택 카드끼리 색 차이가 작아 글 없이 구분 안 됨 | AD6 | art-director (`30-art.md` 레벨 카드 구분) → game-developer |
| S23 | minor | art-director | 사망 효과음(−6 dB, 노이즈 + 사각파)이 5~6세에게 거침 (귀로 미확인) | AD7 | art-director (`30-art.md` 7-3: −10 dB, 삼각파) → game-developer `music.json` |
| S24 | minor | art-director (+ benchmark-analyst) | 세로 모드 플레이어 약 25~29 px로 작음 (기준 ≥ 24 px는 통과) | AD8 | art-director·benchmark-analyst 협의 (합의 전 현행 유지) |
| S25 | minor | benchmark-analyst / art-director | 세로 가시 범위 빌드 10타일 vs 레퍼런스 약 10.7블록(추정) | BA6 | benchmark-analyst (실측 확정 후, 5 % 넘으면 `view_height_tiles` 조정 요청) |
| S26 | minor | game-developer | 한국어 카드·토스트가 낱말 중간에서 줄바꿈 (`word-break` 미지정) | LW2 | game-developer (`word-break: keep-all`) |
| S27 | minor | game-developer | `tut_tempo` 그림이 몰아침 문인데 바로 뒤 처음 만나는 문은 늘임 문 | LW3 | game-developer (S3 기믹 정리로 템포 문이 MVP에서 빠지면 해당 없음) |
| S28 | minor | lore-writer | 10-lore 5-6절에 안 쓰는 `tut_low`·`tut_hold`가 남고 표시 박 위치가 레벨 데이터와 다름 | LW4 | lore-writer (결정 6: 두 키 튜토리얼에서 제외, 표시 시점을 `levels/*.json cues` 기준으로) |
| S29 | minor | lore-writer | 10-lore 2·4절 시각 힌트가 30-art·빌드와 다름, 질감 서술이 "약한 아트 컨셉"과 안 맞음 | LW5 | lore-writer (`10-lore.md` 시각 힌트 정리) |
| S30 | minor | lore-writer (+ game-developer) | 일시정지 연습 토글이 "연습 모드 켜기/끄기 · 끄기"로 겹침 | LW6 | lore-writer (`pause_practice_toggle` 문구) → game-developer (토글 모양) |
| S31 | minor | qa-engineer | `?lang=en` 스크린샷 없음 → 영어 잘림 미확인 | LW7 | qa-engineer round-2 QA (360x640·640x360 영어 화면) |
| S32 | minor | game-developer | 언어 전환이 URL `?lang=en`뿐 | LW8 | game-developer (결정 6: `navigator.language` 자동 선택) |

병합 계산: 원본 이슈 37건(QA 8, BA 6, BD 7, AD 8, LW 8). 두 사안이 섞인 BD6(물리 / 재시작)과 LW1(튜토리얼 문구 / 사망 문구)은 사안별로 나눠 39항목으로 보고, 같은 사안 묶음 S1(3항목), S2(2), S5(2), S7(2, + QA 재시작 메모), S11(2), S12(2)을 하나로 합쳐 32건이 됐습니다. 출처마다 심각도가 다르면 높은 쪽을 따랐습니다.

## round-2 처리 담당별 요약

| 담당 | 이슈 |
|---|---|
| balance-designer | S1, S2, S3, S4, S5, S7, S8, S9, S10 |
| lore-writer | S6, S28, S29, S30(문구) |
| art-director | S12(규칙), S18(규칙), S22(규칙), S23, S24 |
| benchmark-analyst | S5·S8 실측 보강, S24 협의, S25 |
| game-developer (위 기획 갱신 후 `sync-data`) | S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21, S22, S26, S27, S30(토글), S32 |
| qa-engineer | S7 criteria 문구(완료), S10·S15 재측정, S31, round-2 회귀 |

## 이번 집계에서 criteria.md에 반영한 것
- 4역할 리뷰의 "criteria 추가 제안" 12개(게임 감각 2, 밸런스 4, 시각·사운드 3, 세계관·텍스트 3)를 해당 영역에 추가 (`(round-1 추가, <역할> 제안)` 표기, 게임 전용 수치는 `(runner-01: ...)`)
- 기술 품질 "사망 후 0.8초 이내 재시작"에 `(폐기: round-1 결정, 레퍼런스 감각 재현 우선)`을 붙이고 새 재시작 항목 추가 (오케스트레이터 결정 2)
- 자세한 목록은 `Docs/qa-engineer/2026-11-17-1-6-round1-score.md`
