# 개발 응답: round 1 → round 2 (rhythm-01 / 똑딱북: Tickadrum)

- 날짜: 2026-11-17 · 역할: game-developer
- 기준: `score.md` 병합 이슈 22건(M1~M5, N1~N17), 오케스트레이터 결정 R1~R10, round-2 기획 변경 보고서 3개(balance·art·lore)의 "game-developer 전달 사항"
- 빌드: `games/rhythm-01/` (데이터는 `node projects/rhythm-01/tools/build-web-data.mjs`로 다시 만듦, `js/judge.js` = `tools/sim/judge.mjs`)

## 이슈별 처리

| # | 담당 | 처리 | 내용 |
|---|---|---|---|
| M1 (R1·R2) | dev 구현 | **수정** | `engine.prepareLevel`이 `judge.js malletSchedule`(from·shrinkStart·gone)을 그대로 씀. 북채는 [from, gone) 동안만, [shrinkStart, gone)에서 1 → 0 ease-in 축소(투명도 없음). 점선 궤도·점선 북은 같은 창에서 빈칸 길이 × 같은 배율로 줄어 실선으로(`teacher.mallet_hides_with`). 손가락은 `cue.from = max(첫 별 − 1박, 그 앞 북채 gone)`부터, 북채가 보이는 프레임에는 그리지 않음(이중 안전). 누름은 레벨 파일 `press_from_beats_before`(0.25박, −136 ms) |
| M2 (R5) | dev | **수정** | 원인을 Edge long-animation-frame·프레임 기록으로 찾음: 처음 보이는 플레이 화면의 첫 그림·배치, 손가락 SVG 매 프레임 래스터, 튜토리얼 글 첫 배치, 마디 첫 박 소리 묶음 예약, 차가운(최적화 전) 플레이 코드, 프레임마다의 작은 할당. 고친 것: 타이틀 뒤 화면 미리 그리기, SVG 스프라이트, 정적 바탕 층 캐시(캔버스 2장 재사용), 소리 예약 나눔(0.6 s 앞·한 번에 1개), 곡 이벤트 캐시, 로딩 중 플레이·소리 코드 화면 밖 미리 돌리기, 판정 프레임의 저장·알림 글 지연, 할당 줄이기. QA `--part perf` 마지막 두 실행: 12창 중 11창 / 10창 ≥ 45(10창 실행의 다른 하나는 1280x720 L10 44.7). 매 실행 실패하는 한 창은 새로 띄운 브라우저의 첫 창에서만 생기는 프레임 1개(메인 스레드는 비어 있음) |
| M3 (R3) | balance·qa | 해당 없음(빌드 데이터만 갱신) | 바뀐 `balance.json`·`levels/04~10`을 빌드에 복사. 빌드 판정 = 시뮬 판정(`selfcheck-sim` 8000+ 대조 OK) |
| M4 (R6) | dev 세로 배치 | **수정** | 세로 화면(W < H)은 `card_<id>_portrait.svg`, 배율 `min((W−32)/234, (H−32−safe)/896, 1.4)`. 가로판은 720×336 비율로 폭 80 % 이하. 화면이 돌면 다시 고름 |
| M5 (R7) | art → dev | **수정** | `audio.js buildSong`: `degree_walk` 삭제, `music.melody` 규칙으로 동기 배치(`placeMelody`, 기준 `assets/sound-check.mjs`와 같은 규칙, 레벨마다 한 번 계산). 168음, 별 시각 시작 0 |
| N1 | dev | **수정** | 레벨 카드 시작 버튼 = 위→아래 "작은 궤도 → 점 → 등급 줄 → 이름" 4 px 간격, 높이가 모자라면 궤도 축소(28→16) → 이름 숨김 → 궤도 숨김. 이름이 폭을 넘으면 숨김(aria-label 유지) |
| N2 | dev | **수정** | 가로 타이틀 힌트 = 궤도 오른쪽 영역(cx+R+24 ~ W−16) 세로 가운데, 손가락 칸 min(64, 폭−16) + 글 8 px 아래. 세로 = 엄지 받침 자리 가운데 |
| N3 | balance | 해당 없음 | 빌드 `calib.js` 정의가 기준(빌드 수정 없음, 결정 R4) |
| N4 | balance | 해당 없음 | 빌드 D15 정의가 기준(빌드 수정 없음) |
| N5 | dev | **수정** | 확인 창: 위 `icon-reset` 48 + `confirm_reset`, 왼쪽 취소 = 크림 면 + outline 테두리 + 왼쪽 화살표(outline 색) + `confirm_no`, 오른쪽 지우기 = 면 없음 + trackEdge 테두리 + `icon-reset` + `confirm_yes`. 높이 64, 사이 16, 창 폭 min(W−32, 328). `role="dialog"` + `aria-labelledby`, 열 때 첫 초점 = 취소 |
| N6 | dev | **수정** | 일반 클리어 전 레벨 카드 등급 줄 = 가는 진행도 막대(높이 4) + 끝에 공 색 점(최고 기록, `sv.best`), 연습만 깼으면 왼쪽 깃발 12 px. 글·숫자 없음 |
| N7 (R9) | dev | **수정** | 자동 지연(outputLatency + baseLatency)은 `updateComp()`에서만 읽어 `clock.auto`에 고정. 판정 `comp`·보정 탭 계산·`latency().auto`가 모두 이 값을 씀. 갱신 시점 = 오디오 잠금 해제, 레벨 플레이 시작, 보정 시작·끝, 오프셋 설정(DEV_NOTES R2-7). `latency().autoNow`에 지금 값도 따로 보여 줌 |
| N8 (R2) | balance | 반영 | 레벨 파일 cue 값 0.25박을 그대로 읽음(M1 참고) |
| N9 | dev | **수정** | `build-web-data.mjs`가 `assets/sound.json`을 읽음(12-5 표 파싱·`SOUND` 상수 삭제). `calib_check_hz`가 숫자가 아니면 빌드 중단, 빌드 전 `sound-check.mjs` 실행. 보정 체크 방울 1046.5 Hz |
| N10 | dev | **수정** | 게인은 `assets/sound.json` 그대로(둥둥이 −14, 클리어 −10, 베이스 −20, 멜로디 −18, 화음 −24). 베이스 숙임을 `parts.bass_duck_on`(play·show)대로 보여 주기 별에도 넣음. `AudioOut.play` 구조는 그대로라 art `sound-check.mjs --render` 측정과 같은 소리 |
| N11 | dev | **수정** | 다시 보기 버튼 그림 = `icon-card.svg`(D6 폐기) |
| N12 | dev | **수정** | 손가락 칸 `max(64, 0.45R)`(세로는 받침 높이 − 16 이하), 가로 중심 (cx+1.45R, cy+0.65R) 가장자리 16 px 안, 누름 4 px도 칸 크기에 비례. 640x360 = 64 px (492, 275), 1280x720 = 107 px (985, 551) |
| N13 (R8-1) | dev | **수정** | 시도 점 줄 `role="meter"`, 이름 `aria_attempts`만, 값은 `aria-valuenow`(max = 현재 시도 수 이상). 숫자를 글에 잇지 않음 |
| N14 (R8-2·3·4) | dev | **수정** | 결과 등급 줄 `role="img"` = `grade_1~3` / `practice_clear`. 설정 버튼 이름 `btn_settings` + 설명 `guardian_hold`. 연습 플레이 진행도 위 깃발마다 `role="img"` `aria_checkpoint`(알림 없음) |
| N15 (R8-5) | dev | **수정** | 불러오기 화면 = 궤도 위 공 그림(`loading`, 천천히 돎, 움직임 줄이기 설정이면 멈춤) + 보조 글. 실패 ↻ = 이름 `btn_retry` + 설명 `load_error`. 글과 첫 테마 색은 빌드 스크립트가 `index.html`에 넣음(코드에 문구 없음) |
| N16 (R8-6) | dev | **수정** | 레벨 10 결과 버튼 2개(다시 / 레벨 고르기), → 버튼 숨김 |
| N17 (R10) | art | 해당 없음(새 카드 복사) | 바뀐 카드 SVG를 빌드에 복사 |

## 검증
| 검사 | 결과 |
|---|---|
| `node projects/rhythm-01/tools/build-web-data.mjs` | 성공(sound-check OK, calib_check_hz 1046.5, strings 64), `js/judge.js` = `tools/sim/judge.mjs`(diff 없음) |
| `node projects/rhythm-01/tools/verify-levels.mjs --quick` | **ALL PASS** |
| `node projects/rhythm-01/tools/selfcheck-sim.mjs` | **8127/8127 OK** (엔진 ↔ judge 대조 + R1: 북채 묶음 16개 엔진 = malletSchedule, 1 ms 간격 손가락∩북채 0, 북채∩판정 별 위험 구간 0, L1 북채 사라짐 2591 ms → 손가락 3819 ms, 누름 −136 ms / R7: 멜로디 168음 = sound-check, 별 시각 시작 0, 베이스 숙임 판정 별 256·보여 주기 별 59) |
| `selfcheck-browser.mjs` (전체, Edge) | test 모드 10레벨 완벽·±40 ms·σ25 40/40 클리어, 무입력 10/10 실패 → 1.08 s 재시작, **일반 모드 실시간 10레벨 완벽 입력 클리어(등급 3)**, 실제 마우스 L1·L2 1회 클리어(오차 −2~−7 ms), R1 그린 프레임 900개 동시 표시 0, R4 세로 카드 공 19.0(360x640)·27.6(412x915) px, 가로 19.9·39.8 px, 레벨 카드 겹침 0, 확인 창 첫 초점 취소, L10 결과 2버튼, R8·R9 통과, 콘솔 0·외부 요청 0. 첫 실행에서 검사 스크립트 쪽 실수 2건(타이틀 힌트를 글 상자 전체로 잼, 레벨을 나간 뒤 시도 수를 읽음)을 고쳐 다시 실행 → --quick 재실행 **ALL OK**(같은 r2 검사 전부 통과, 콘솔 0·외부 요청 0) |
| QA `--part perf` | 위 "성능" 표, 콘솔 0·실패 요청 0·외부 요청 0 |
| `node scripts/validate.mjs` | OK: 3 game(s) |

## 남은 문제
- (minor, game-developer·qa-engineer) 6배 스로틀 1% low: 12창 중 11창 ≥ 45, 남은 1창은 새 브라우저 첫 컨텍스트에서 AudioContext 생성 직후 레벨을 시작할 때만 나오는 메인 스레드가 비어 있는 긴 프레임 1개. QA 측정에서 첫 창 전에 0.5 s를 두거나 창을 여러 번 재면 사라짐을 확인해 주세요. 실기기에서도 같은지 확인 필요.
- (minor, art-director) 북채 작아짐 마지막 몇 프레임에 점선 빈칸이 0이 되어 띠 가운데 선이 이어진 선처럼 보였다가 gone에서 사라짐(5-4 문장 그대로). 다른 표현을 원하면 지정 요청.
- (minor, art-director) 소리 예약 lookahead 0.1 s → 0.6 s(30-art 12-6과 다름, DEV_NOTES R2-6). 소리 시각은 같음.
- (minor, art-director) 레벨 카드 진행도 막대 폭 64 px는 목업 8 비율로 정함(5-6에 값 없음).
- (확인, qa-engineer) 소리 크기는 art `sound-check.mjs --render`가 빌드 `AudioOut.play`를 그대로 렌더하므로 다시 재 주세요(post 필터를 소리별로 같이 쓰게 바꿨지만 선형 필터라 소리 하나 렌더 결과는 같음).
- 실제 휴대폰·블루투스 확인은 이번에도 못 함(헤드리스 Edge).
