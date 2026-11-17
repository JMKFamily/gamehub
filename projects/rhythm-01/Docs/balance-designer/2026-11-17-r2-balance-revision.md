# round-2 기획 수정: 북채 퇴장·손가락 0.25박·B6 연속 중앙값과 L4~L10 재조정·보정 정의 통일

- 날짜: 2026-11-17
- 역할: balance-designer
- 프로젝트: rhythm-01
- 단계: round-2 기획 (round-1 게이트 미통과, 가중 약 6.93)

## 요청 받은 일
오케스트레이터가 `Docs/orchestrator/2026-11-17-1-7-round1-gate-and-round2-decisions.md` R1~R4를 맡김. R1 북채 퇴장 시각과 검증 S15 강화·S16 신설, R2 손가락 누름 0.25박, R3 B6를 연속 중앙값으로 판정하고 L4~L10 재조정, R4 `bots.mjs` 보정·밀림 모델을 빌드 정의에 맞추고 8-3~8-5 재측정. 요청자 지시는 그대로 지킴: 레벨 10 = 기존 3레벨 곡선을 이어 간 레벨 6 수준, 5~6세 단순 규칙, 원본 보호.

## 한 일
1. **R1 북채 퇴장**: `balance.json teacher`에 `mallet_hide_at: "last_show_star"`, `mallet_hide_group: "show_run"`, `mallet_hide_after_beats` 0.5, `mallet_shrink_beats` 0.25, 상한 `mallet_gone_cap: "next_judged_star_miss_zone_start"` + `mallet_gone_before_miss_zone_ms` 20, `mallet_hide_formula`, `mallet_hides_with`를 추가함. round-1 값 `show_bar_end`는 `mallet_hide_at_r1_deprecated`에 폐기 표시로 남김. 같은 키 이름은 새 값으로 다시 씀(빌드는 이 키를 읽지 않았음). 기준 구현 `tools/sim/judge.mjs malletSchedule`을 추가함. 식은 사라짐 = min(마지막 보여 주기 별 + 0.75박, 다음 판정 별 zoneStart − 20 ms), 작아짐 시작 = 사라짐 − 0.25박. 두 마디 무늬는 묶음 기준으로 계산함.
2. **검증기**: S15를 강화함. 손가락 구간 [첫 별 − 1박, 첫 별 + 통과 창 끝] ∩ 북채 구간 = 없음, 누름 시작 ≥ 통과 창 시작. **S16을 새로 넣음**(10레벨 전부): 북채 구간 [등장, 사라짐) ∩ 모든 판정 별 [놓침 구역 시작, 통과 창 끝] = 없음, 작아짐 시작 ≥ 마지막 보여 주기 별.
3. **R2**: `tutorial_cue.press_from_beats_before`를 0.5에서 **0.25**로 바꿈(이전 값은 폐기 표시). 빌드는 레벨 파일의 cue 값을 읽으므로 `levels/01` `cues[0]`도 같이 바꿈. `show_only_after_mallet_gone` 키도 추가함.
4. **R3**: `bots.mjs runProfile`에 `median_first_clear_continuous` = ln 0.5 / ln(1 − p)를 추가하고, B6·B7을 연속 중앙값으로 판정하게 바꿈(정수 중앙값 식은 참고로 출력). T = **13.70**, 범위 10.96~16.44. L4~L10은 마디 무늬를 별이 적은 **아는 무늬**로 바꿔 별을 1~3개씩 줄임. L1~L3는 그대로 둠(T가 바뀌지 않게, 학습 목표는 이미 충족). B1 한도는 `04 7 / 05 8 / 06 10 / 07 12 / 08 13 / 09 14 / 10 16`로 갱신함.
5. **R4**: `tools/sim/calib.mjs`를 새로 만듦(빌드 `calib.js`와 같은 코드: 선형 보간 사분위, 짝수 중앙값 = 가운데 둘 평균, IQR 실패 = 그 회만 다시, 다시 하기는 흐름 전체에서 1번). `calibrationBias`와 `guardianCalibrationBias`가 이 코드를 씀(보호자 흐름은 `simulate()`를 그대로 호출). `driftDetectAttempt`는 D15 표본(판정한 탭 / 실패 별 ±300 ms 안 가장 가까운 탭), 가운데 둘 평균 창 중앙값, 창 끝에서만 켜짐 판정, 클리어하면 그 플레이 끝으로 바꿈. 검증 **C1**을 새로 넣음(빌드 calib.js와 무작위 3000묶음 대조). `balance.json`에 정의 키(`quantile_definition`, `median_definition`, `retry_rule`, `drift_check.sample`·`window_median`·`trigger_checked_at`·`min_attempts_scope`)를 적음. 이전 표본 정의는 `sample_r1_deprecated`로 남김.
6. `20-balance.md`를 갱신함: 0·1·3장, 6-4(새 규칙, 묶음 16개 시각표), 8-3~8-5(정의·재측정), 10-6, 11장(식·표·L4~L10 상세), 12장(검사 목록·출력), 13·14·15장, 16-00(round-2 반영 기록).

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-01/balance.json` | `teacher`(R1 키, 폐기 기록), `tutorial_cue`(0.25박), `audio_latency.*` 정의 키(R4), `verify.child_sd70_median_max_by_level`, `verify.l10_target_rule`(연속 중앙값) |
| `projects/rhythm-01/levels/01-level1.json` | `cues[0].press_from_beats_before` 0.25 (별 배치 그대로) |
| `projects/rhythm-01/levels/04~10-*.json` | 마디 무늬 교체로 별 25/27/26/26/27/29/27, `design_intent`·`known_patterns`·`patterns`·`difficulty` 갱신 |
| `projects/rhythm-01/tools/sim/judge.mjs` | `malletSchedule(L, bal)` 추가 (기존 함수는 그대로) |
| `projects/rhythm-01/tools/sim/calib.mjs` | 새 파일. 보정 계산 기준 정의(빌드 calib.js와 같은 코드) |
| `projects/rhythm-01/tools/sim/bots.mjs` | 연속 중앙값, 보정 모델이 calib.mjs를 씀, 밀림 모델 D15 |
| `projects/rhythm-01/tools/verify-levels.mjs` | S15 강화, S16·C1 신설, B6·B7 연속 중앙값(정수 참고 출력), 곡선 요약에 연속값 열 |
| `projects/rhythm-01/20-balance.md` | 위 6번 |

### 연속 중앙값 L1~L10 (σ70, 시도 20000, 시드 고정)
| 레벨 | 판정 별 (전→후) | 클리어율 p | 연속 중앙값 m̃ | 정수 중앙값 (90 %) | 등비 기준선 |
|---|---|---|---|---|---|
| 1 | 20 | 0.3061 | 1.897 | 2 (7) | - |
| 2 | 24 | 0.2099 | 2.941 | 3 (10) | - |
| 3 | 25 | 0.1527 | 4.183 | 5 (15) | - |
| 4 | 26 → 25 | 0.1296 | 4.992 | 5 (17) | 4.96 |
| 5 | 30 → 27 | 0.1151 | 5.668 | 6 (20) | 5.87 |
| 6 | 28 → 26 | 0.0922 | 7.162 | 8 (25) | 6.95 |
| 7 | 28 → 26 | 0.0787 | 8.456 | 9 (27) | 8.24 |
| 8 | 30 → 27 | 0.0698 | 9.580 | 10 (32) | 9.76 |
| 9 | 32 → 29 | 0.0571 | 11.789 | 11 (37) | 11.56 |
| 10 | 30 → 27 | 0.0505 | **13.363** | 13 (44) | 13.70 |

T 계산: m̃ = ln 0.5 / ln(1 − p) → m̃1/m̃2/m̃3 = 1.897 / 2.941 / 4.183, r = (4.183 / 1.897)^(1/2) = 1.4849, T = 4.183 × r³ = **13.70**, 목표 [10.96, 16.44]. L10 13.363 (−2.4 %). 정수 중앙값 2/3/5로 같은 식을 쓰면 T 19.76이지만 판정에는 쓰지 않음.

### 바꾼 레벨 (마디 무늬만 바꿈. BPM·통과 창·마디 수·곡 길이·쉬는 마디·체크포인트·stage·보여 주기는 그대로)
| 레벨 | 바꾼 마디 |
|---|---|
| 4 | 마디 6 K → E |
| 5 | 마디 0 D → B, 마디 13 B → A |
| 6 | 마디 15 G → B |
| 7 | 마디 0 D → B |
| 8 | 마디 0 D → B, 마디 12 B → A |
| 9 | 마디 1 D → B, 마디 12 B → A |
| 10 | 마디 1 F → E, 마디 6 K → E, 마디 9 O → H |

## 검증 결과
- `node tools/verify-levels.mjs` 전체 실행(시도 20000, 세션 2000, 약 45 s): **ALL PASS, 검사 193건 PASS / FAIL 0**, 종료 코드 0. 두 번 실행해 출력이 같음(시드 고정).

| 검사 | 결과 |
|---|---|
| S0~S14 | 10레벨 전부 PASS (S6 최대 간격 ≤ 1000 ms, S10 ≥ 94 %, S12 판독 ≥ 1252 ms, S13 여유 ≥ 202 ms) |
| **S15** | PASS: 손가락 3.818~4.534 s, 누름 4.227 s(−136 ms, 통과 창 −150 안), 북채와 겹침 없음(가장 가까운 북채와 1227 ms) |
| **S16** | 10레벨 PASS: 북채 묶음 16개 모두 겹침 0. 사라짐 → 다음 놓침 구역 최소 20 ms, 마지막 타격 → 작아짐 시작 최소 66 ms, 상한 적용 5/16 |
| B1 | PASS: 2/3/5/5/6/8/9/10/11/13 ≤ 5/8/12/7/8/10/12/13/14/16 |
| B2 | PASS: σ70 57.5 > … > 30.2 %, σ50 86.8 > … > 71.3 % |
| B3·B4·B5 | PASS (σ25 실패 0, L1 실패 위치 49.1 %, 정수 최대 1.67배) |
| **B6** | PASS: L10 m̃ 13.363 ∈ [10.96, 16.44] |
| **B7** | PASS: 4.183 < 4.992 < 5.668 < 7.162 < 8.456 < 9.580 < 11.789 < 13.363, L3~L9 < 16.44 |
| **C1** | PASS: `tools/sim/calib.mjs`와 빌드 `calib.js`의 결과가 무작위 3000묶음에서 0건 다름 |

- 8-3 재측정(L10): 자동 보정만 16, 보호자 보정(어른) 16, 블루투스 + 보호자(어른) 15, 블루투스 + 보호자 흐름을 아이가 침 22(round-1 35). 모두 30 이하.
- 8-5 재측정: 오경보 L1 0.2 %·L3 1.0 %(round-1 모델 2.2 %·1.4 %), 블루투스 감지 99.8 %·99.4 %.
- (오케스트레이터 추가 전달) `node assets/sound-check.mjs` 실행만 함(assets 수정 없음). L4~L10 r2 데이터로 **멜로디 음 168개, 별 시각에 시작하는 음 0개, sound-check OK**. 옮긴 음: 04 3 / 05 3 / 06 2 / 07 2 / 08 3 / 09 1 / 10 3(뺀 음 2), 01~03은 0.
- (오케스트레이터 추가 전달) `teacher.teacher_drum_db`를 −12에서 **−14**로 바꿈(art round-2 값, 원본 `assets/sound.json`). `teacher_drum_db_source: assets/sound.json`을 추가했고, 이전 값은 `teacher_drum_db_r1_deprecated`(−12)에 남김. 20-balance 6-4도 고침. 고친 뒤 검증기 전체 실행을 다시 돌렸고 ALL PASS 193.
- `node tools/selfcheck-sim.mjs`: 8078/8078 OK. 빌드 엔진과 judge 대조이며, 빌드 데이터는 아직 round-1 복사본.
- 못 한 검사: 빌드에서 새 북채 시각이 화면에 어떻게 보이는지(빌드는 수정 범위 밖이라 game-developer 구현 뒤 QA가 확인).

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 이름·캐릭터·아트·음악·레벨 배치 없음): 새 무늬 없이 자체 무늬 사전 안에서 바꿈
- [x] 게임 선정·설계 원칙 (5~6세 단순 규칙, 약한 아트 컨셉): 탭 1가지, 새 기믹·카드 추가 없음(카드 5장 그대로), 레벨당 새 기믹 ≤ 1(S8)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정, git 커밋·푸시 안 함 (빌드 `games/`·30-art·10-lore·harness·runner-01 수정 없음. 빌드 calib.js·engine.js·render.js는 읽기만 함)

## 문제·남은 일
- **game-developer에게 넘길 것(키 변경)** (major, 빌드 반영 필요):
  1. `tools/build-web-data.mjs`를 다시 돌려 `balance.json`·`levels/01~10`·`judge.mjs`(새 `malletSchedule`)를 빌드에 복사. QA 정적 검사 "judge.mjs = js/judge.js"는 다시 복사하기 전까지 다름.
  2. 북채: `engine.prepareLevel`의 `malletWins.to = 마디 끝`을 `malletSchedule(L, bal)`의 `gone`으로 바꾸고, 렌더 축소를 `[shrinkStart, gone)`(0.25박)으로 바꿈. 점선 궤도·점선 북도 같은 구간(`teacher.mallet_hides_with`). 지금 `barMode(x) === 'show'`로 그리는 점선 궤도도 북채 구간 기준으로 바꿔야 함. 키: `teacher.mallet_hide_at` 값이 `"show_bar_end"`에서 `"last_show_star"`로 바뀜(키 이름은 같음, 이전 값은 `mallet_hide_at_r1_deprecated`). 새 키: `mallet_hide_group`, `mallet_hide_after_beats` 0.5, `mallet_shrink_beats` 0.25, `mallet_gone_cap`, `mallet_gone_before_miss_zone_ms` 20, `mallet_hide_formula`, `mallet_hides_with`.
  3. 손가락: `levels/01` `cues[0].press_from_beats_before` 0.5 → 0.25(render.js가 이 값을 읽음). `tutorial_cue.press_from_beats_before`도 0.25. 새 키 `tutorial_cue.show_only_after_mallet_gone`·`press_start_must_be_in_pass_window`는 정의라 따로 구현할 것 없음(시간표상 이미 성립).
  4. 보정·밀림: 빌드 동작은 그대로(기획이 빌드 정의를 채택). 새 정의 키(`guardian_calibration.quantile_definition`·`median_definition`·`retry_rule`, `drift_check.sample`·`window_median`·`windows`·`trigger_checked_at`·`min_attempts_scope`)는 설명용. `drift_check.sample` 값이 `judged_tap_error_else_nearest_tap_to_failed_star`로 바뀜(이전 값 `sample_r1_deprecated`).
  4-1. `teacher.teacher_drum_db` −12 → −14(참조값, 소리 원본은 `assets/sound.json`). 새 키 `teacher_drum_db_source`, `teacher_drum_db_r1_deprecated`.
  5. 레벨 4~10 별 배치가 바뀜(마디 무늬만, 길이 같음). 레벨 선택 진행도·별 수 표시가 파일에서 읽히는지 확인.
- art-director (minor): 바뀐 마디(20-balance 11-1 표)의 곡 타악·멜로디 동기(R7)를 levels 기준으로 맞춰 주기. 북채 축소 모양은 축소만(투명도 없음). 상한이 걸리는 5개 묶음은 타격 뒤 66~99 ms 만에 작아지기 시작함(20-balance 15장 R8).
- qa-engineer (minor): B6는 시뮬레이터 전체 실행의 연속 중앙값 하나로만 판정. 빌드 봇 값은 클리어율 일치 확인용(R3). 다음 QA에서 북채 사라짐 시각(16개 묶음 표, 20-balance 6-4)과 손가락·북채 동시 표시 0을 화면으로 확인.
- lore-writer: 10-lore 4절 문장은 lore 보고서(R1 "마지막 타격 직후 퇴장·손가락은 그 뒤")와 맞음. 추가 요청 없음.
