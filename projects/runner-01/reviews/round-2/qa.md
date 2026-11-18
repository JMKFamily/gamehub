# 리뷰: qa-engineer · round 2

대상: `games/reverbound/` (Reverbound, runner-01, 빌드 2987470) · 2026-11-17~18 · 도구 `projects/runner-01/tools/qa-round.mjs`(기본 파트 + balance), `projects/runner-01/tools/qa-r2-extra.mjs`(이번에 새로 만든 round-2 추가 파트), `tools/combo-check.mjs`(node)
환경: Windows 데스크톱(12코어, 공유 PC), 설치된 Microsoft Edge 157 headless, playwright-core 1.62.1(`channel: msedge`. 개발 보고서의 1.48.2는 이 PC에서 찾지 못해 설치돼 있던 1.62.1을 씀), 서버 `serve.mjs` 포트 8150~8155(도구가 띄우고 자기 PID만 종료). 실제 모바일 기기는 아님.

## 확인한 것
- 읽은 문서: `.claude/agents/qa-engineer.md`, `CLAUDE.md`, `harness/PIPELINE.md`, `harness/criteria.md` 전체(rhythm-01·rhythm-02 기술 품질 줄, 결정 14), `harness/insights.md` 전체, `harness/benchmarks/djmax-judgement.md` 7-2, `STATUS.md`, `DEV_NOTES.md` 12절(D19~D24), 개발 콤보 빌드 보고서, qa-tools 보고서, balance 퍼센트 보고서, round-1 `qa.md`·`score.md`, rhythm-01 `qa-round.mjs`의 perf·perfctl·firstrun(읽기만)
- 소스: `main.js`(훅·startLevel·offsetTest·입력), `audio.js`(autoLatency·pollLatency·startRun·sfx), `game.js`, `combo.js`, `physics.js keyOf`, `index.html`
- 스크린샷: `shots/` 186장(ko·en × 4해상도 × 타이틀·레벨 선택·10레벨 플레이·사망·클리어·마지막 레벨 클리어·일시정지·설정, notext, 실시간 튜토리얼). 눈으로 본 것: `ko-412x915-06-clear-screen.png`(결과 줄·토스트 잔존 없음)
- 지표: `metrics.json`(parts/*.json 합본), `parts/combo-check-node.txt`
- 재현 (PLAYWRIGHT_CORE=<playwright-core 경로>, QA_CHANNEL=msedge)
  - `QA_PORT=8150 node projects/runner-01/tools/qa-round.mjs --round 2 --part basic,shots,replay,bots,realtime,perf,features,age`
  - `node projects/runner-01/tools/qa-round.mjs --round 2 --part balance` (σ70 20000+1000세션, σ50 20000+1000세션, σ25 100000, 34분) → 판정 다시 계산만: `--part balance --bal-reuse`
  - `node projects/runner-01/tools/qa-r2-extra.mjs --round 2 --part perf3 --perf-runs 3` / `firstrun` / `combo --combo-n 200` / `a11y` / `chord` / `menu` / `indep` / `grep`
  - `node projects/runner-01/tools/combo-check.mjs 2000 all child_sd70,novice_sd50,skilled_sd25`
  - `node projects/runner-01/tools/qa-round.mjs --round 2 --merge`

## 검사 결과 표

| # | 검사 | 결과 | 수치·근거 |
|---|---|---|---|
| 1 | 페이지 로드 (`?test=1`, 일반, `?lang=en`), 언어 자동 선택 | 통과 | ko-KR → ko, en-US → en (`basic.lang_auto`) |
| 1 | 콘솔 에러·경고 / pageerror / 실패 요청 / 외부 요청 | 통과 | 모든 파트 합계 0 / 0 / 0 / 0 (기본 파트 요청 1182건 + 추가 파트, 모두 localhost) |
| 2 | 4해상도 × ko·en 스크린샷 | 통과 | `shots/` 186장, 언어 확인 8/8 |
| 2 | HUD·튜토리얼 카드 화면 밖 / 메뉴 글 넘침 (640x360 포함) | 통과 | 8조합 × 5화면 모두 0 (`shots.overflow`, `shots.outside`) |
| 3 | 완벽 입력열 → 빌드 클리어 (훅) | 통과 | 220회 중 기대와 다른 결과 0 (10레벨 × 2입력열 × 누름 1·24틱 × 60/144/30/20/10 Hz + 음성 대조 20) |
| 3 | 실시간 경로 (rAF + 키 이벤트, 오디오 running) | 통과 | 10/10 레벨 끝까지 클리어, 발송 오차 최대 4.3 ms |
| 3 | 빌드 판정 = 시뮬레이터 판정, 두 기준(빌드 기록 탭 / 봇 전체 탭), 가상 시계 1 s 이하 | 통과 | 6,010시도(10레벨 × σ70·σ50·σ25 × 200 + 완벽 10), 판정 86,504개, 불일치 0 / 0, 시도 경계 넘음 0 (`parts/combo.json`) |
| 3 | `combo.enabled` 켬/끔 재판정 | 통과 | 끈 빌드에서도 같은 6,010시도 생사·등급·콤보 불일치 0. node combo-check(2000 × 3프로필 × 10레벨) B2 켠/끈 0, P1~P5 0, ALL OK |
| 3 | 판정 %·정확도 = combo-ref | 통과 | 빌드 grades pct ≠ 기준 0, accuracy ≠ 기준 0, % → 등급 역산 불일치 0 |
| 3 | 검증기 독립성: % 계산식 | 통과 | djmax-judgement 7-2 의사코드를 새로 짠 함수 vs 빌드 `combo.js`: 손 계산 경계표 28줄(25/50/66.67/83.33/100 ms·창 끝) 일치, 모든 탭 0.01 ms 간격 6,383,928점 불일치 0, 틱 Δ 31,898개 0 (`parts/indep.json`). 창 끝 +0.15 ms 허용 구간 6,570점은 빌드 = 10 %, 문서 = 실패(20-balance 15-10-1 의도, 문서 미반영) |
| 4 | 6배 스로틀 평균 FPS (새 브라우저 3회) | 통과 | 빌드 24창 모두 59.9~60.2 |
| 4 | 6배 스로틀 1% low ≥ 45 (시작·재시작 직후, DPR 3, 새 브라우저 3회 모두) | **실패** | 빌드 24창 중 14창 통과. L1 시작 0~10 s는 3회 × 2해상도 **6/6 실패**(37.6~42.7), 재시작 직후 3/6 실패(26.0~37.9). 아래 "성능 판정" |
| 4 | 메뉴 전환·첫 탭 최장 프레임 ≤ 100 ms (6배) | **실패** | 타이틀 → 레벨 선택 182~214 ms, 첫 탭(오디오 잠금 해제) 101.5~104.3 ms, 설정 63~69, 달리기 61~62 (3회 × 2해상도, `parts/menu.json`) |
| 4 | 입력 → 점프 반응 | 통과 | 6배에서 40/40 1프레임 |
| 5 | 재시작 시간 (사망 틱 → 다음 시도 첫 프레임, 0.94~1.20 s, 자동) | 통과 | 6배 1,081~1,084 ms (10회), 다시 움직임 1,211~1,215 ms |
| 5 | 연습 모드 | 통과 | 체크포인트 재시작, 연습 클리어는 cleared false |
| 5 | 진행도·최고 기록 저장 | 통과 | 새로고침 후 `cleared:true, best:100` 유지, 카드 10 = levelCount |
| 5 | 일시정지·백그라운드 | 통과 | visibilitychange → paused, 1 s 동안 틱 0, 오디오 suspended, 복귀 시 자동 재개 안 함, blur도 paused, 일시정지 버튼 탭에 점프 없음. (헤드리스라 강제 이벤트로만 확인) |
| 5 | 음소거 | 통과 | 효과음·음악 게인 0, 새로고침 후 muted 유지 |
| 5 | 첫 실행 지연 이중 보정 (빈 저장소 → 실제 UI → L1) | 통과 | 아래 "지연 보정" 표. 5경우 모두 `runComp − autoNow − 저장 오프셋` = 0 ms |
| 5 | 콤보 화음 크기 (OfflineAudioContext, 빌드 `audio.js`) | 기록 | 10·20 화음 최고 −25.9 / −25.5 dBFS, 음악(L1 4 s) −9.2 → 음악 최고보다 **−16.7 / −16.3 dB** (개발 계산 약 −20 dB). 사망음 −29.4(−20.3 dB), 새 기록 −19.0(−9.8 dB) (`parts/chord.json`) |
| 5 | 접근성 트리 (CDP getFullAXTree + ariaSnapshot) | 부분 | 콤보 줄 meter now = combo(4) ko·en, 레벨 카드 최고 콤보 meter가 버튼 밖에 2개(now 15·24), 결과 화면 정확도 meter now = 훅(100)·최고 콤보 meter, 레벨 이름·"최고 100% 클리어"·잠금 상태가 트리에 나옴. 문제: aria-hidden 요소 aria-label 1곳, 영어 고정 aria-label 4곳 (이슈 6·7) |
| 6 | 회귀 (round-1 이슈) | 통과 5 / 실패 1 | 아래 "회귀" 표 |
| 7 | 터치 버튼 48dp / 버튼 겹침 | 통과 | ko·en × 4해상도 × 6화면 48 px 미만 0, 겹침 1,064쌍 중 0 |
| 7 | 레벨 1 첫 클리어 (브라우저 봇 60세션) | 통과 | σ50 중앙값 1회, σ70 3회, σ90 10회 |
| 7 | 레벨 곡선 (시뮬레이터 한 원천) | 기록 | 아래 "밸런스 표". σ70·σ50 모두 30회·2배 한도 통과, **레벨 10 외삽 ±20 % 실패**(두 봇 모두) |
| - | 원본 보호 grep (영문 + 공식 한국어 번역어) | 통과 | `games/reverbound/` 27파일, 엄격 목록 히트 0, 외부 URL은 SVG 이름공간 1개뿐 (아래 목록) |

## 성능 판정 (criteria rhythm-01 round-2 줄)
방법: 회차마다 변형 5개를 같은 시간대에 번갈아, 변형마다 새 브라우저로 잼(3회). 6배 스로틀, 1280x720@1·640x360@3. 창: L1 시작 0~10 s, L7(오브젝트 최다) 0~20 s, L1 무입력 사망 → 재시작 +4 s, L4 시작 0~6 s. 25 ms 넘는 프레임마다 long-animation-frame, rAF 콜백 시간, PC 전체 CPU(os.cpus 1 s 간격)를 같이 기록(`parts/perf3.json`).

| 창 (1% low, 3회) | 빌드 | combo 끔 | 판정 글 끔 | 대조 페이지 | 대조 + 캔버스 글 |
|---|---|---|---|---|---|
| 1280 L1 시작 | 39.1 / 40.8 / 37.6 | 46.6 / 46.3 / 35.2 | 46.3 / 45.3 / 44.5 | 58.0 / 58.2 / 57.6 | 58.0 / 34.0 / 57.1 |
| 640@3 L1 시작 | 41.7 / 42.7 / 38.5 | 45.0 / 46.9 / 45.1 | 44.9 / 43.8 / 43.3 | 55.1 / 58.3 / 58.0 | 37.4 / 30.7 / 37.1 |
| 1280 재시작 직후 | 48.9 / 48.9 / 26.0 | 32.2 / 32.5 / 49.5 | 49.8 / 48.6 / 48.9 | - | - |
| 640@3 재시작 직후 | 35.8 / 45.2 / 37.9 | 49.8 / 33.9 / 32.5 | 45.6 / 47.8 / 48.9 | - | - |
| 1280 L7 0~20 s | 46.7 / 53.7 / 49.1 | 53.3 / 54.7 / 51.9 | 52.1 / 53.9 / 50.4 | 58.3 / 58.2 / 58.3 (10~30 s) | |
| 640@3 L7 0~20 s | 53.0 / 45.6 / 53.3 | 52.6 / 54.6 / 50.7 | 48.7 / 53.9 / 52.8 | 58.3 / 57.9 / 54.9 (10~30 s) | |

- 측정 중 PC 전체 CPU 평균 16.9 %(창별 11~33 %, 최대 62.9 %). 대조 페이지는 같은 시간대·같은 부하에서 한 번도 54.9 밑으로 내려가지 않았습니다.
- **결론: 원인은 빌드입니다(측정 환경 아님).**
  - L1 시작 창은 3회 × 2해상도 6/6 모두 실패하고 값도 37.6~42.7로 안정적입니다. 회차마다 흔들린다는 개발 측정(18.5~41.7)과 달리, 새 브라우저·같은 창 정의로는 재현됩니다.
  - 25 ms 넘는 프레임은 창마다 1~3개뿐입니다. 위치는 (1) 레벨 시작 첫 프레임(창 시작 +20~34 ms, 28~34 ms 프레임), (2) **첫 판정 글이 처음 그려지는 프레임**(창 +4.07~4.10 s = L1 첫 탭, 33.6~38.8 ms), (3) 재시작 직후(+1.04 s, 25.8~52.9 ms)입니다. (2)는 판정 글을 끈 변형에서 사라집니다. 10 s 창(약 600프레임)의 1% low는 가장 느린 6프레임 평균이라 이런 튐 2개로 45 밑으로 내려갑니다.
  - long-animation-frame은 이 프레임들에서 0건입니다(LoAF 기준 50 ms 미만). rAF 콜백(스크립트) 시간은 6배에서 p95 1.4~2.6 ms, p99 최대 3.6 ms라, 튐은 **스크립트가 아니라 그리기(래스터) 쪽**입니다.
  - 대조 + 캔버스 글(stroke + fill 2줄/프레임)은 640x360@3에서 스크립트 0.9 ms인데도 1% low 30.7~46.1, 평균 55~58로 떨어졌습니다. DPR 3의 캔버스 글 stroke 래스터가 6배 스로틀에서 비싸다는 근거입니다. 빌드 후보 1 = 판정 글 캔버스 텍스트(stroke 3 px + fill, 첫 그리기 글리프 준비).
  - 콤보 DOM: combo 끔 변형이 L1 시작에서 +4~8 fps 나아졌지만 재시작 직후는 오히려 3회 중 2회 실패해 단독 원인으로 보기 어렵습니다. 레벨 시작·재시작 첫 프레임 튐은 끔 변형에서도 그대로라 콤보와 별개(round-1 이슈 5의 남은 부분)입니다.
- **파티클 여유(round-3 지시용 한 줄)**: 6배 스로틀에서 빌드 스크립트는 프레임당 p95 약 2.6 ms라 16.7 ms 중 약 14 ms가 남지만, 병목은 DPR 3 래스터라 화면 전체 파티클은 "스크립트 ≤ 4 ms + 글·stroke·그림자 없는 단순 채움, 첫 프레임 전에 미리 그려 두기"로 묶고 640x360@3 6배 1% low ≥ 45를 새 브라우저 3회로 다시 확인해야 합니다(지금도 시작 창에서 기준 밑이라 여유는 0으로 보는 것이 안전).

## 지연 보정 (criteria rhythm-01 round-2 "지연 보정" 줄의 runner-01 판)
runner-01은 첫 실행 자동 보정 화면이 없고, 설정의 "박자 보정 테스트"(메트로놈 8박, `main.js offsetTest`)와 오프셋 슬라이더가 있습니다. 그래서 (a) 보정 없이 바로 시작, (b) 보정 테스트 후 L1 두 흐름을 실제 마우스(CDP)로 잼. 들리는 박 = 예약 시각(start when) + 탭 순간 autoNow(`outputLatency + baseLatency`)로 잡았고, 게임 값을 쓰지 않음(`parts/firstrun.json`).

| 경우 | 빈 저장소 | 자동 지연 흐름 | 결과 |
|---|---|---|---|
| 바로 시작, 첫 탭 60 ms 뒤 달리기 | 예 | 첫 탭 직후 10 ms → 달리기 누를 때 74 ms(대기 중 P) → 첫 시도 | 첫 시도 runComp 74 = autoNow 74 + 오프셋 0, 2번째 시도도 74(다시 읽음) |
| 바로 시작, 1 s 뒤 | 예 | 10 → 82 | runComp 82 = autoNow 82 |
| 첫 탭 → 설정 → 보정 테스트 (클릭 간격 60 ms, 테스트 시작 203 ms) | 예 | 테스트 시작 때 이미 74 | 사람 = 들리는 박 −1.5 ms → 저장 0 (기대 0), L1 runComp − autoNow = 0 |
| 같은 흐름, 간격 0.7 s | 예 | 82 | 저장 0 (기대 0), 이중 보정 0 |
| 사람이 늘 60 ms 늦게 침 | 예 | 74 | 저장 +60 (기대 +60), L1 runComp 134 − autoNow 74 = 60, 이중 보정 0 |

- 시도마다 다시 읽음: `audio.comp()`가 부를 때마다 `outputLatency`를 읽고 `startRun`이 시도 시작마다 부름(코드 + 2번째 시도 값).
- 이중으로 빼지 않음: 보정 테스트는 예약 시각에서 그 순간 comp를 빼고(`t0 = now + 0.3 − comp`) 탭 비교 기준에 같은 comp를 더하므로, 테스트 동안 자동 지연이 그대로면 저장값 = 사람의 남은 차이만 남습니다(위 3경우 오차 0 ms).
- 남은 위험(minor, 이슈 8): `offsetTest`에는 `startLevel` 같은 안정 대기가 없습니다. 이번 실측에서 10 → 74 ms 변화는 잠금 해제 뒤 약 130 ms 안에 끝나 가장 빠른 실제 UI 흐름(203 ms)에도 걸리지 않았지만, 테스트 도중 값이 바뀌면 그 차이만큼 이중 보정이 저장됩니다.

## 밸런스 표 (시뮬레이터 한 원천, `tools/sim/bots.mjs`, 결정 10 연속 중앙값 ln0.5/ln(1−p))
p는 이번에 `1 − 사망 수/N`으로 바꿨습니다(bots.mjs `clear_rate`는 소수 3자리 반올림이라 σ70 L7·L8이 같은 값 0.057로 묶여 단조 판정이 틀어짐). 표본: σ70·σ50 레벨당 20000회 + 1000세션(상한 300), σ25 100000회.

| 레벨 | σ50 p | σ50 연속 중앙값 | σ70 p | σ70 연속 중앙값 | σ70 세션 중앙값 | σ25 p | 숙련 몰림(6 t) |
|---|---|---|---|---|---|---|---|
| 01 | 0.780 | 0.46 | 0.295 | 1.98 | 2 | 1.000 | 8.1 % (σ50 대체) |
| 02 | 0.683 | 0.60 | 0.182 | 3.44 | 4 | 1.000 | 13.3 % (σ50 대체) |
| 03 | 0.502 | 0.99 | 0.113 | 5.79 | 7 | 0.997 | 24.6 % |
| 04 | 0.494 | 1.02 | 0.098 | 6.72 | 8 | 0.997 | 22.2 % |
| 05 | 0.483 | 1.05 | 0.093 | 7.14 | 7 | 0.997 | 25.3 % |
| 06 | 0.418 | 1.28 | 0.067 | 10.00 | 10 | 0.997 | 22.1 % |
| 07 | 0.415 | 1.29 | 0.057 | 11.81 | 13 | 0.997 | 24.2 % |
| 08 | 0.424 | **1.26** | 0.057 | 11.91 | 13 | 0.997 | 21.8 % |
| 09 | 0.383 | 1.44 | 0.042 | 16.14 | 16 | 0.996 | 23.1 % |
| 10 | 0.376 | 1.47 | 0.039 | 17.47 | 18 | 0.997 | 19.4 % |

| 판정 | σ50 (결정 14 대표 봇) | σ70 (빌드가 맞춘 기준, 참고) | σ25 (참고) |
|---|---|---|---|
| 30회 이하 | 통과 (최대 1.47) | 통과 (최대 17.47) | 통과 |
| 직전 2배 이하 | 통과 (최대 1.65배, L3) | 통과 (최대 1.73배, L2) | - |
| L10 = L1~3 외삽 L6 ±20 % | **실패**: g = 1.473, 목표 3.17 (2.54~3.80), L10 1.47 = 목표의 46 % | **실패**: g = 1.707, 목표 28.79 (23.04~34.55), L10 17.47 = 61 % | 의미 없음(p ≈ 1) |
| L3~L10 엄격 단조 | **실패**: L8 1.26 < L7 1.29 (p 차 0.008, 표준오차 약 0.005) | 통과 | - |
| 숙련 몰림 ≤ 30 % | 통과 (최대 25.3 %, L5) | | |

- 개발·밸런스 문서의 레벨 10 목표 17회는 L1~3 **세션 중앙값 3·4·6**(3000세션)으로 낸 값입니다. 결정 10의 연속 중앙값(L1 1.98, L3 5.79)으로 같은 공식을 쓰면 목표가 28.8이 되어 L10 17.5는 ±20 % 밖입니다. 세션 중앙값도 이번 1000세션에서는 2·4·7(L1 첫 2회 안 클리어 확률 50.3 %로 2/3 경계)이라 목표 45.8이 됩니다. 정수 경계 때문에 목표가 흔들리는 R3 사례와 같습니다. 판정은 balance-designer·오케스트레이터 몫이라 이슈 3으로 넘깁니다(빌드·밸런스 파일은 고치지 않음).
- σ50은 L1이 첫 시도 클리어율 78 %라 연속 중앙값이 1 미만이고, 곡선이 거의 평평합니다(L3~L10 0.99 → 1.47). 결정 14 기준으로 다시 맞추려면 곡선 전체가 바뀌어야 합니다(major 후보 기록만).

## 접근성 트리 요약 (ko 예, en도 같음)
- 레벨 선택: `button "1. 새벽 조율장"` 안에 `text: 새벽 조율장 가시를 넘어요`·`text: 최고 100% 클리어`, 바로 뒤 형제 `meter "1. 이어서 잘 뛴 최고 기록"`(now 15). 깨지 못한 카드는 "최고 0%"(테스트 모드라 잠금 없음. 잠금 문구는 일반 모드에서 카드 aria-label 뒤에 붙음, `main.js renderCards` 코드 확인).
- 플레이: `meter "이어서 잘 뛴 수"` now 4 = combo 4. 0~1일 때는 숨김.
- 결과: `heading "새벽이 밝았어요!"`, `paragraph 2번 만에 성공!`, `meter "박자를 맞힌 정도"` now 100 = 훅 accuracy 100, `meter "가장 많이 이어서 잘 뛴 수"` now 15, 버튼 3개.
- 일시정지: `button "pause"`(영어), `heading "잠깐 멈춤"`, 버튼 4개.

## 원본 보호 grep 목록 (`parts/grep-origin.json`, 영문은 낱말 경계, 대소문자 무시)
- 레퍼런스 이름: Geometry Dash, GeometryDash, Geometry-Dash, geometrydash, RobTop, Rob Top, 지오메트리 대시, 지오메트리대시, 지오메트리 대쉬, 로브탑, 롭탑
- 레퍼런스 곡·레벨 이름(영문·한국어): Stereo Madness, Back On Track, Polargeist, Dry Out, Base After Base, Can't Let Go, Time Machine, xStep, Clutterfunk, Theory of Everything, Electroman, Clubstep, Electrodynamix, Hexagon Force, Blast Processing, Geometrical Dominator, Deadlocked, Fingerdash, 스테레오 매드니스, 폴라가이스트, 클럽스텝, 헥사곤 포스, 데드락드, 일렉트로맨
- 레퍼런스 고유 메뉴·모드·아이템: The Vault, Vault of Secrets, Chamber of Time, Mana orb(s), Secret Coin, User Coin, Map Pack, Treasure Room, The Shop, Scratch's Shop, Potbor, Gatekeeper, Keymaster, Swingcopter, Ball mode, 비밀 코인, 유저 코인, 맵 팩, 작곡가 Waterflame, DJVI, F-777, Dex Arson
- 콤보 벤치마크: DJMAX, DJ MAX, DJMax, 디제이맥스, 디맥, Neowiz, 네오위즈, Pentavision, 펜타비전, MAX COMBO, MAX 100%, MAX 90%, Ladder Match
- 일반어라 히트만 보고 판정은 따로 하는 낱말(전부 0히트): Jumper, Cycles, Dash, Demon, Gauntlet, Monster, Diamond, Orbs, Ship, UFO, Wave, Robot, Spider, Cube, BREAK, FEVER, RESPECT, Scratch, Practice Mode, Normal Mode, Attempt, 데몬, 보관소, 래더, 스크래치
- 결과: 엄격 목록 0곳, 일반어 0곳(영어 시도 문구는 "Try {n}"), 외부 URL은 `icon.svg`의 `http://www.w3.org/2000/svg`(이름공간, 요청 아님)뿐.

## 검증기 독립성 (insights flow-01 8485b81 요청)
- % 계산: `combo-build-check` B1과 이번 combo 파트는 빌드 `combo.js` = `combo-ref.mjs` 본문이라 계산식 자체 오류를 못 잡습니다. 그래서 `harness/benchmarks/djmax-judgement.md` 7-2 의사코드를 새로 짠 함수로 대조했습니다(위 표, 불일치 0). 다른 점은 창 끝 +0.15 ms 허용 오차 1곳뿐이고 20-balance 15-10-1에 근거가 있습니다.
- 레벨 생성기 `build-levels.mjs`는 `physics.js`를 import하지 않고 자체 궤적식으로 x를 놓습니다(생성기 ↔ 검증기 독립). 반면 `verify-levels.mjs`·`bots.mjs`·`combo-check.mjs`·빌드는 모두 **같은 `games/reverbound/js/physics.js`**를 씁니다. 물리·판정 상자에 오류가 있으면 검증기·봇·빌드 재생이 모두 같이 틀려 서로 일치로 보입니다. 이 공유 가정을 깨는 독립 근거는 레퍼런스 실측 대조(benchmark-analyst, criteria 게임 감각 ±3 %·사망 간격 0.745 t)뿐이고 QA 재생(훅·실시간)은 독립이 아닙니다.
- 검증기 가지치기: 너비 우선 탐색에서 같은 상태를 `keyOf`(y 1e−6, vy 1e−5 반올림, 접지, 사용한 발판)로 합치는 것 말고는 가지치기가 없습니다. 상태 필드 {y, vy, g, used}를 모두 담아 합침 자체는 안전하고, 반올림으로 다른 상태가 합쳐질 여지만 이론상 남습니다.
- 판정 창 `judge_taps`는 `build-judge-taps.mjs`가 검증기의 "탭 하나만 옮긴 생존 창"에서 만듭니다. 그래서 앞 탭이 어긋날 때 창 밖에서도 사는 탭(combo-check B1 경고: L6·L8~L10 클리어 시도에서 판정 수 < 탭 수, 최대 σ70 L10 4/70·σ50 L10 9/707)이 남습니다(20-balance 15-10-6, 기존 알려진 문제).

## 회귀 (round-1 이슈)
| round-1 | 내용 | 이번 |
|---|---|---|
| 1 major | L1 아동 봇 첫 클리어 불가 | 해결: σ70 연속 1.98, 브라우저 세션 중앙값 3 |
| 2 major | 숙련 봇 3연속 몰림 60 % | 해결: 최대 25.3 % |
| 3 minor | 세로 레벨 선택 뒤로·모드 버튼 겹침 | 해결: 겹침 0/1,064쌍 |
| 4 minor | 640x360 설정 넘침 | 해결: 넘침 0 |
| 5 minor | 6배 1% low 시작 직후 | **남음**: L1 시작 37.6~42.7 (이슈 1) |
| 6 minor | 테스트 훅 화면 ≠ 일반 모드(토스트 잔존) | 해결: `ko-412x915-06-clear-screen.png` 토스트 없음 |
| 7 minor | 회전 안내가 플레이 중 남음 | 해결(코드: 플레이 중 `inGame`이면 숨김, 8 s 자동 닫힘) |

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | major | game-developer | 6배 스로틀 1% low < 45: L1 시작 0~10 s 3회 × 2해상도 6/6 실패(37.6~42.7), 재시작 직후 3/6 실패(26.0~37.9). 대조 페이지는 같은 시간대 54.9 이상이라 빌드 원인. 튐 위치 = 레벨 시작 첫 프레임 28~34 ms, 첫 판정 글 그리기 33.6~38.8 ms, 재시작 직후 25.8~52.9 ms. 스크립트는 p95 2.6 ms라 그리기 쪽 | `parts/perf3.json` windows·long_frames, 재현 `qa-r2-extra.mjs --part perf3 --perf-runs 3` | 판정 글 글꼴·숫자 글리프를 로딩 때 숨은 캔버스에 한 번 그려 두기, 글을 매 프레임 stroke하지 말고 첫 판정 때 만든 오프스크린 비트맵을 다시 쓰기(DPR 3), 시작·재시작 첫 프레임에 하는 준비(배경·레벨 그림) 미리 그리기 |
| 2 | major | game-developer | 메뉴 전환 6배 최장 프레임 > 100 ms: 타이틀 → 레벨 선택 182~214 ms, 첫 탭(오디오 잠금 해제) 101.5~104.3 ms (criteria rhythm-02 round-1 줄) | `parts/menu.json`, 재현 `qa-r2-extra.mjs --part menu` | 레벨 카드 10장(SVG 장면·대표 오브젝트)을 레벨 선택 진입 때가 아니라 로딩 뒤 미리 만들기, 첫 탭에서 AudioContext 생성과 메뉴 표시를 다른 프레임으로 나누기 |
| 3 | major | balance-designer·orchestrator | 레벨 10 목표 판정이 정의에 따라 뒤집힘: 결정 10 연속 중앙값(L1 1.98, L3 5.79)으로는 σ70 목표 28.8 (23.0~34.6)이고 L10 17.5(61 %)는 ±20 % 밖. 문서의 목표 17은 3000세션 정수 중앙값 3·4·6에서 나온 값이고, 이번 1000세션 정수 중앙값은 2·4·7(목표 45.8) | `parts/balance.json` `B10`·`profiles_curve.child_sd70`, `--part balance --bal-reuse`로 재계산 | 판정 정의를 하나로 정해 다시 판정(R3·결정 10이면 L1~L3 또는 L10 조정 필요). rhythm-02 줄대로 시드 10개 분포도 함께 |
| 4 | major(후보, 결정 14) | balance-designer | σ50(12세 대표 봇) 기준: 30회·2배 한도는 통과하지만 L10 = 외삽 목표 3.17의 46 %(±20 % 실패), L8 < L7(단조 실패). L1 첫 시도 클리어 78 %라 곡선이 거의 평평(0.46 → 1.47) | 위 밸런스 표, `profiles_curve.novice_sd50` | 이번 빌드는 σ70 기준이라 기록만. 결정 14 적용 라운드에서 σ50 기준으로 곡선 재설계 |
| 5 | minor | art-director | 콤보 10·20 화음이 오프라인 렌더로 음악 최고보다 −16.3~−16.7 dB(개발 계산 약 −20 dB, 차 3.3~3.7 dB). criteria "효과음 크기 표 원본 = 빌드 렌더값, 계산값과 차 ≤ 1 dB" 기준으로 표 갱신 필요 | `parts/chord.json` (설정 80/80, 컴프레서 뒤) | 표 값을 렌더값으로 바꾸거나 `combo_mark.db`를 −23~−24로 |
| 6 | minor | game-developer | 콤보 줄 `#combo`가 숨겨질 때 aria-hidden="true"인데 aria-label("이어서 잘 뛴 수")이 붙어 있음(criteria lore 줄 "aria-hidden 요소에 aria-label 0" 문자 그대로 위반 1곳). 숨김 자체는 설계(0~1은 안 읽음) | `parts/a11y.json` `aria_hidden_with_label` | 숨길 때 aria-label도 떼거나 `hidden` 속성만 쓰기 |
| 7 | minor | game-developer·lore-writer | 한국어 화면에서도 aria-label이 영어 고정 4곳: `pauseBtn "pause"`, 뒤로 `"back"`, 허브 `"hub"`, 캔버스 `"game"` | `parts/a11y.json` ko title·pause·play | 10-lore 키로 바꾸기 |
| 8 | minor | game-developer | 박자 보정 테스트(`offsetTest`)는 자동 지연 안정 대기가 없음. 테스트 도중 outputLatency가 바뀌면(잠금 해제 직후, 백그라운드 복귀 뒤 등) 그 차이가 오프셋에 저장되어 이중 보정. 이번 실측에서는 값이 130 ms 안에 안정돼 재현되지 않음 | `main.js offsetTest` (`t0 = now + 0.3 − comp`), `parts/firstrun.json` timeline | 테스트 시작 전에 `latencyStable` 대기, 또는 탭마다 그 순간 autoNow로 비교 |
| 9 | minor | balance-designer | 판정 % 문서(djmax-judgement 7-2)는 d > W면 실패인데 빌드는 W + 0.15 ms까지 10 %. 의도(20-balance 15-10-1)지만 공통 문서에 없음 | `parts/indep.json` tol_zone 6,570점 | 공통 문서 7-2에 허용 오차 한 줄 |

## 잘 된 점
- 빌드 판정 = 시뮬레이터 판정이 두 기준·켬/끔·%·정확도까지 6,010시도 86,504판정에서 0 불일치이고, % 계산식이 문서에서 독립으로 짠 함수와도 637만 점에서 같음.
- 첫 시도 지연 대기가 실제 UI에서 동작: 자동 지연 10 → 74 ms 변화를 기다렸다 시작하고, 시도마다 다시 읽고, 보정 테스트 결과에 이중 보정이 없음.
- 콘솔·네트워크 0, 저장·일시정지·연습·음소거, 4해상도 × 2언어 넘침·겹침 0, round-1 이슈 7개 중 6개 해결.

## 점수
- 영역: 기술 품질·안정성
- 체크 항목 통과: 적용 18개 중 15개 (기존 7개 중 폐기 1 제외 6/6, round-1 추가 6개 중 5개, rhythm-01·02 추가 7개 중 해당 6개에서 4개 — 실패: 6배 1% low, 3회 반복 성능 기준, 메뉴 전환 ≤ 100 ms. "보정 무시 구간" 줄은 runner-01에 무시 구간이 없어 해당 없음)
- 점수: **7.0 / 10** (83 % 통과. 판정 일치·지연 보정·저장 등 핵심은 견고하지만 성능 major 2개가 모두 재현되는 빌드 원인이라 round-1(7.5)보다 낮춤)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목 (1-6에서 반영 여부 결정)
  1. 기술: 판정 글·콤보 표시처럼 처음 그려지는 글·그림이 있는 프레임(첫 판정 순간)도 6배 1% low 창에 포함하고, 첫 판정 프레임 ≤ 33 ms (근거: 이슈 1, 첫 판정 글 33.6~38.8 ms)
  2. 밸런스·QA: 연속 중앙값의 p는 반올림한 클리어율이 아니라 사망 수에서 구함(p = 1 − 사망/N). 소수 3자리 반올림으로 L7·L8 동률이 생겨 단조 판정이 틀어짐 (근거: 밸런스 표 머리말)
  3. QA: 빌드 봇 재판정 하네스는 시도마다 누름 상태를 놓고(release) 시작. 앞 시도에서 누른 채 끝난 입력이 다음 레벨 시작 홀드 점프로 넘어가 가짜 불일치 79건이 났음 (근거: `qa-r2-extra.mjs` combo 파트 `G.release()` 주석)
  4. 기술: 사용자가 여는 보정 화면(설정의 보정 테스트 등)도 시작 전에 자동 지연 안정 대기를 함 (근거: 이슈 8)

VERDICT: REVISE
