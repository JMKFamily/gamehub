# 리뷰: qa-engineer · round 1

- 대상: `games/rhythm-02/` (Tossaloft / 높이통통, 1-3 빌드). 빌드·기획 파일은 읽기만 함.
- 환경: Windows 데스크톱, 설치된 Microsoft Edge 헤드리스(playwright-core 1.62.1 `channel: msedge`, 설치·다운로드 없음), 정적 서버 `projects/rhythm-02/tools/serve.mjs`(포트 8735~8739, 파트마다 띄우고 자기 PID만 종료, `parts/pids.log`). 실제 휴대폰·블루투스 기기는 아님.
- 재현 (레포 루트):
  ```
  PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/rhythm-02/tools/qa-round.mjs --round 1 --part <static|bots|realtime|restart|perf|shots|blank|testeq|sound|signal|features|firstrun|all>
      bots 옵션: --n70 20000 --n 2000 (이번 값) · perf 옵션: --perf-runs 3 (이번 값) · --port 8730~8739
  node projects/rhythm-02/tools/qa-round.mjs --round 1 --merge          # parts/*.json → metrics.json
  node projects/rhythm-02/tools/verify-levels.mjs [--json]              # 시뮬레이터 원천(전체 실행)
  node projects/rhythm-02/tools/selfcheck-sim.mjs · node projects/rhythm-02/tools/art/check-all.mjs
  PLAYWRIGHT_CORE=… node projects/rhythm-02/tools/selfcheck-browser.mjs --out <폴더>
  ```
  (이번 실행 PLAYWRIGHT_CORE = `C:\Users\MINKI-MINKI\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright-core`. `realtime`·`restart`·`perf`·`firstrun`은 다른 파트와 동시에 돌리지 않음.)
- 산출물: `metrics.json`(파트별 원자료 `parts` + 시뮬레이터 요약), `parts/*.json`·`parts/*.txt`(실행 출력), `shots/` 196장(+ `parts/selfcheck/` 개발 자체 확인 104장).

## 확인한 것
- 읽은 파일: `harness/criteria.md` 전 절(f951c3d 갱신 4줄 포함), `harness/insights.md` 전부(f951c3d 갱신 2줄 포함), `harness/templates/review.md`, `projects/rhythm-02/00-benchmark.md`(13-1 이월 수치), `balance.json`(restart·judge_clock·bots·sound_sync), `levels/01`, `DEV_NOTES.md`(N1~N19), `Docs/orchestrator/2026-11-17-1-2-cross-review-decisions.md`(D1~D18), `Docs/game-developer/2026-11-17-1-3-web-build.md`, `Docs/orchestrator/2026-11-17-1-3-build-supervision.md`, 빌드 `js/main.js`·`core.js`·`judge.js`·`audio.js`·`calc.js`·`layout.js`·`render.js`·`index.html`·`style.css`, `tools/art/sound-check.mjs`, rhythm-01 `qa-round.mjs`·round-1 `qa.md`(읽기만).
- 기존 도구 다시 실행: `verify-levels.mjs` 전체 **266/266 PASS**(`parts/verify-levels.txt`), `selfcheck-sim.mjs` **50/50 PASS**, `tools/art/check-all.mjs` **5/5 OK**, `selfcheck-browser.mjs` **ALL PASS**(`parts/selfcheck-browser.txt`).
- 새 도구: `projects/rhythm-02/tools/qa-round.mjs`(파트 13개, `--part` 단위 재실행).

## 검사 결과 (요약)
| # | 검사 | 결과 | 근거 |
|---|---|---|---|
| 1 | 콘솔 에러·경고 0 (게임 코드) | **통과** (게임 0. QA 하네스가 `getImageData`를 반복 호출해 생긴 Canvas2D 성능 경고 3건은 제외) | `metrics.json` console_errors_warnings |
| 2 | 외부 요청 0 · 실패 요청 0 · 빌드 파일 외부 URL 0 | **통과** | `parts/static.json`, 전 파트 log |
| 3 | 빌드 판정 = 시뮬레이터 판정 | **통과**: 봇 시도 **240,000회**(σ25·σ50 각 2,000, σ70 20,000 × 10레벨, 놓침·헛탭 포함) 불일치 0 (빌드 기록 탭 기준·봇 전체 탭 기준 둘 다) + 실시간·마우스·재시작·연습 시도 전부 0 | `parts/bots.json` rejudge |
| 4 | 5~6세 봇 σ70 연속 중앙값 빌드 vs 시뮬레이터 | **일치**(아래 표, 차이 z ≤ 2.0) | `parts/bots.json` compare |
| 5 | 일반 모드 실시간(rAF + PointerEvent, 오디오 running) 완벽 입력 L1~L10 | **10/10 클리어, 전부 등급 3**, 최대 \|e\| 7.1 ms | `parts/realtime.json` autoplay |
| 6 | 실제 마우스(CDP) 완벽 입력 L1~L10 (누름 100 ms) | **10/10 첫 시도 클리어, 등급 3**, 판정 오차 −3.7 ~ +0.2 ms | `parts/realtime.json` mouse |
| 7 | 입력 → 북 반응 프레임(캔버스 픽셀) | **12/12 다음 프레임**(이벤트 → 그 프레임 1.6~14.8 ms) | `parts/realtime.json` react |
| 8 | 재시작 시간(실패 틱 → 다음 시도 첫 프레임) | **1102.6~1119.1 ms**(늦음 L1~L10 10회, 일찍 L1·L5·L10 6회), 0.94~1.20 s 안, 자동. 빌드 기록과 독립 rAF 측정 차 ≤ 0.4 ms | `parts/restart.json` |
| 9 | 실패 → 다음 판정 접촉(일반 모드, 첫 접촉 실패) | **3.60~4.14 s** ≤ 6 s (L1 4.14, L10 3.60) | `parts/restart.json` nextContact |
| 10 | 연습 모드 | L1·L6·L10: 깃발 버튼 실제 클릭 → 60 % 지점 실패 → 그 앞 받침 쉼(접촉 10·15·11)에서 부활 **1114~1119 ms** → 이어서 클리어 **통과** | `parts/restart.json` practice |
| 11 | 성능 6배 CPU 스로틀링(새 브라우저 3회 × DPR 1·3, 412x915) | 레벨 시작(L10·L1 실제 클릭 직후 3 s)·재시작 직후 3 s·두 공 플레이 8 s: **6/6 회 모두 평균 60 / 1% low 59.2~59.5**. 단 타이틀 탭 → 레벨 선택 전환: 평균 48~53, 200~283 ms 한 프레임(이슈 1) | `parts/perf.json` |
| 12 | 화면 4해상도 × ko/en × 15화면 + notext | 88화면 버튼 최소 **48 px**, 겹침 0, 화면 밖 0, 글 넘침 0, 가로 넘침 0. 640x360 보호자 화면만 넘침 → ▼ 표시 있음 | `parts/shots.json` ui, `shots/` |
| 13 | `?test=1` 화면 = 일반 모드 | L1 1.5/2.7/2.95/3.1/5.2 s, L6 3/9 s: 캔버스 픽셀 평균 차 ≤ 0.008(0~255), DOM(손가락 글·HUD·멈춤) 7/7 같음 | `parts/testeq.json` |
| 14 | notext 크기 | 카드 속 공 렌더 px 최소 18(360x640)·26(412x915)·23(640x360)·38(1280x720) ≥ 16, 플레이 공 d 28·32·24·44 ≥ 24, 판정 대상 북 너비 89.6·102.4·76.8·140.8 px | `parts/shots.json` px, `shots/*-notext-*` |
| 15 | 신호 겹침: L1 손가락 ∩ 다음 위험 구간 | **0 ms**. 손가락·`tut_tap` 보임 [2400, 3168] ms(테스트 4해상도) / [2400.9, 3167.5](일반 모드 rAF), 다음 접촉 위험 [3250, 3770](판정)·[3290, 3810](화면) — 간격 82~122 ms | `parts/signal.json` |
| 16 | 소리 크기(빌드 `audio.js` 합성, OfflineAudioContext) | 탭 최고 −6.52 − 가장 큰 효과음(clear) −14.23 = **7.72 dB** ≥ 1 · 탭 RMS −16.43 − 곡 박 RMS(실제 곡 전체 렌더, 박마다) −25.20 = **8.77 dB** ≥ 6 · 탭 − 곡 박 최고값 7.48 dB. art 측정값과 소리별 차 최대 2.7 dB(음 높이 집합 차, 이슈 4) | `parts/sound.json` |
| 17 | 지연 보정 첫 실행(빈 저장소 → 실제 UI → 보호자 소리 맞추기 → L1) | **이중 보정 없음**: 자동 지연 10 → 74~82 ms(잠금 해제 뒤 0.1 s 안에 바뀜)여도 빌드 raw = QA 들린 박 기준 raw + 4.3~8.2 ms(±10 안). X = −40 → 귀로 친 아이 e −2.1 ms, X = 120 → −5.9 ms. 단 X = 0에서 무시 구간(±30) 경계를 넘어 결과가 뒤집힘(이슈 3) | `parts/firstrun.json` |
| 18 | 저장 유지(새로고침) | L1 클리어·등급·카드 본 기록, L2 최고 48 % 막대, L3 잠김 그대로 **통과** | `parts/features.json` persist, `shots/features-412x915-levels-after-reload.png` |
| 19 | 백그라운드 멈춤 | 강제 `visibilitychange` → 멈춤("누르면 이어서 해요")·AudioContext suspended·보여도 탭 전까지 멈춤·이어 하기 뒤 레벨 시간 이어짐 **통과**. 헤드리스 실제 탭 전환은 visibility가 바뀌지 않음 → **실기기 확인 필요** | `parts/features.json` background |
| 20 | 음소거 | 멈춤 메뉴 소리 버튼 → 저장값 false·aria "소리 켜기"·새로고침 뒤 유지 **통과**(출력 신호 크기는 이번에 재지 않음, 코드상 mute 게인 30 ms 램프) | `parts/features.json` mute |
| 21 | 보호자 길게 누르기 | 0.3 s = 보조 글 "어른이 길게 눌러요", 1.0 s 놓기 = 안 열림, 0.8 s 뒤 손가락 밖으로 = 안 열림, 1.65 s = 보호자 화면 **통과** | `parts/features.json` gate, `shots/*-11-gate-hold.png` |
| 22 | 멈춤 메뉴·Esc | 다시 = 레벨 처음(리드 −0.6 s), 레벨 고르기, Esc = 멈춤 **통과** | `parts/features.json` pauseMenu |
| 23 | 타이틀 → 레벨 선택 약 1 s 빈 화면(오케스트레이터 관찰) | **1 s는 재현 안 됨**. 카드 그림은 탭 다음 첫 프레임에 이미 다 그려짐(이미지 다시 요청 0). 대신 첫 탭 한 프레임이 길다: 스로틀 없음 50~84 ms, 6배 200~283 ms, 같은 화면 두 번째 진입은 17~50 ms. 원인 분리는 이슈 1 | `parts/blank.json`, `shots/blank-*`, `shots/*-02a-levels-*ms.png` |
| 24 | 원본 보호 | 빌드 88개 파일에서 레퍼런스·타 팀 이름 0, 외부 URL 0, data 사본 = 기획 원본(바이트), judge.js = tools/sim/judge.mjs | `parts/static.json` |

### 빌드 봇 vs 시뮬레이터 (σ70 = 5~6세 대리: σ70·놓침 3 %·헛탭 2 %, 누름 100 ms)
빌드 `?test=1`에서 레벨마다 σ70 20,000 시도. 시뮬레이터 값은 `verify-levels.mjs` 전체 실행(B6 판정 원천). z = 두 클리어율 차 / 두 표본 합친 표준오차.

| 레벨 | 클리어율 p 빌드 / 시뮬 | 연속 중앙값 빌드 / 시뮬 | 정수 중앙값 빌드 / 시뮬 | z | 평균 진행도 % (빌드) | σ50 p | σ25 p |
|---|---|---|---|---|---|---|---|
| 01 | 0.3171 / 0.3199 | **1.817** / 1.798 | 2 / 2 | −0.6 | 57.9 | 0.734 | 1 |
| 02 | 0.2497 / 0.2478 | 2.413 / 2.434 | 3 / 3 | 0.4 | 52.8 | 0.715 | 1 |
| 03 | 0.1681 / 0.1607 | 3.766 / 3.956 | 4 / 4 | 2.0 | 45.0 | 0.643 | 1 |
| 04 | 0.1417 / 0.1401 | 4.536 / 4.594 | 5 / 5 | 0.5 | 42.4 | 0.635 | 1 |
| 05 | 0.1172 / 0.1166 | 5.560 / 5.591 | 6 / 6 | 0.2 | 39.3 | 0.629 | 1 |
| 06 | 0.0993 / 0.1013 | 6.628 / 6.488 | 7 / 8 | −0.7 | 37.9 | 0.584 | 1 |
| 07 | 0.0861 / 0.0838 | 7.703 / 7.920 | 8 / 8 | 0.8 | 35.7 | 0.566 | 1 |
| 08 | 0.0731 / 0.0751 | 9.138 / 8.879 | 10 / 9 | −0.8 | 33.9 | 0.551 | 1 |
| 09 | 0.0635 / 0.0653 | 10.574 / 10.272 | 11 / 11 | −0.7 | 32.6 | 0.532 | 1 |
| 10 | 0.0539 / 0.0570 | 12.522 / 11.821 | 13 / 13 | −1.3 | 31.0 | 0.500 | 1 |

- 빌드와 시뮬레이터가 다른 난수열을 쓰므로 차이는 표본 오차(|z| ≤ 2.0, 10개 중 1개가 2 근처는 기대 범위). B6 판정은 criteria대로 시뮬레이터 원천: L1~L3 1.798·2.434·3.956 → r 1.483, 목표 12.91 [10.33, 15.49], L10 **11.821 통과**, L3→L10 엄격 단조 통과(빌드 값으로도 같은 판정: L10 12.52 ∈ 범위, 단조).
- σ25는 전 레벨 2,000/2,000 클리어(실패 0) → 숙련 봇 몰림 검사는 σ50 기준으로 balance 쪽에서 볼 일(빌드 σ70 가장 많이 실패한 접촉 비율 8.8~10.9 %).
- 하네스 주의: 첫 실행에서 "봇 전체 탭" 재판정 불일치 658건이 나왔는데, 하네스가 `pressAt`으로 다음 탭까지 가상 시계를 한 번에 넘기다 실패 → 1.1 s 재시작을 지나 다음 시도에 탭을 넣은 것이었음(빌드 기록 탭 기준은 0). 1 s 단위로 끊어 진행하게 고친 뒤 240,000회 0. 빌드 문제 아님.

### 지연 보정 첫 실행 상세 (`parts/firstrun.json`, f951c3d 지시 반영)
- 측정 정의: 들리는 박 = 소리 노드 `start(when)` 예약 순간의 `currentTime`↔`performance.now()` 표본으로 바꾼 화면 시각 + **탭(들림) 순간의 실제 autoNow**(outputLatency + baseLatency). 게임 내부 값(SY.t0·저장된 지연)은 쓰지 않음. 같은 소리를 `getOutputTimestamp` 매핑으로도 계산해 대조: 차 64~77 ms ≈ 그 순간 autoNow(74~82) → 두 정의가 ±10 ms 안에서 같음.
- 자동 지연 변화: 잠금 해제(타이틀 탭) 직후 10 ms → 42 → 50 → 58 → 74/82 ms, 약 0.1 s 안에 안정. 빌드는 `pump()`마다 autoNow를 다시 읽어 예약하므로(`audio.js audioAt`) 보정·플레이 어느 쪽도 옛 값에 묶이지 않음. 보호자 소리 맞추기는 잠금 해제 뒤 최소 1.7 s(보호자 문 1.5 s)라 안정 뒤에 시작됨.

| 시나리오(어른이 들리는 박 + X ms에 실제 마우스) | 빌드 raw | QA raw(들린 박 기준) | 저장 오프셋 | L1 곡 들림 − 화면 박 | 귀로 같은 X로 친 아이 판정 e |
|---|---|---|---|---|---|
| X = 0, 빠른 흐름 | −28.2 | −36.0 | **0** (무시 구간) | +2.8 | **−37.2** |
| X = −40 | −71.4 | −76.2 | −71 | +77.9 | −2.1 |
| X = 60 | +27.9 | +23.6 | 0 (무시 구간, 규칙대로) | +9.3 | +29.3 |
| X = 0, 레벨 선택에서 3 s 기다린 뒤 | −29.6 | −36.6 | **0** (무시 구간) | +0.2 | **−39.8** |
| X = 120 | +89.1 | +83.4 | 89 | −85.9 | −5.9 |

- 빠른 아이 흐름(빈 저장소 → 타이틀 탭 → 105 ms 만에 L1 시작): 첫 박 들림 − 화면 −2.3 ms(getOutputTimestamp 기준), latRef 82(안정값), 밀림 표지 오작동 없음, 다음 로드에서도 꺼짐.
- 보정 때·플레이 때 자동 지연 차이 Δ(criteria 밸런스 rhythm-01 round-2 항목용 실측): 한 흐름 안 Δ = 0 ms(둘 다 안정값 74 또는 82). 실행마다 안정값이 74↔82로 8 ms 달랐고, 빌드가 매번 다시 읽으므로 판정에 영향 없음.

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | minor | game-developer | **첫 타이틀 탭 한 프레임이 김**(오케스트레이터 관찰 "약 1 s 빈 화면"의 원인 후보). 탭 → 레벨 선택 사이 가장 긴 프레임: 스로틀 없음 50~84 ms, 6배 스로틀 200~283 ms(새 브라우저 3회 × DPR 1·3 모두, 그 창 평균 48~53 fps·1% low 3.5~5). 오디오 없는 `?test=1`은 117~133 ms, 같은 화면 두 번째 진입(오디오 이미 열림)은 33~50 ms → 대략 절반은 `AudioOut.unlock()`(AudioContext 생성 + 14개 소리 미리 합성, 같은 탭 처리 안), 절반은 첫 `buildGrid`(카드 40개 img·SVG DOM). 카드 그림은 다시 요청 0, 첫 프레임에 이미 완성이라 "그림 늦게 뜸"은 헤드리스에서 재현 안 됨. 1 s는 더 느린 환경(앱 브라우저 창·저사양)일 가능성 | `parts/perf.json` titleToLevels, `parts/blank.json`, `shots/blank-cpu6-412x915-250ms.png`. 재현: `--part blank`, `--part perf --perf-runs 3` | 미리 합성을 탭 처리 밖으로(잠금 해제는 `resume()`만, 소리 노드 미리 만들기는 다음 프레임 뒤 `setTimeout`으로 나눠서), 레벨 격자는 로딩 때 한 번 만들고 `showLevels`에서는 진행 상태만 바꾸기. 실기기(저사양 안드로이드)에서 탭 → 화면 전환 시간 재확인 |
| 2 | minor | game-developer (benchmark-analyst 확인) | 늦음 실패 연출 첫 프레임이 실패 판정 시각 뒤 **35.8~50.8 ms**(2~3프레임). criteria 게임 감각(리듬 읽기) "실패 연출이 판정 뒤 2프레임 안"(≤ 33.3 ms)을 넘음. `LATE_GRACE` 34 ms(늦게 배달되는 탭 기다림, DEV_NOTES 2절) 때문이며, 연출은 failPerf 기준으로 그려 처음 약 40 ms가 건너뛰어짐. 일찍 실패는 2.1~14.7 ms | `parts/restart.json` fail_frame_after_failPerf_ms (L1~L10 늦음 10회) | benchmark-analyst가 34 ms 유예를 허용할지 정하고, 허용하면 criteria 읽기에 "유예 포함 3프레임"으로 적기. 아니면 유예를 1프레임(17 ms)으로 |
| 3 | minor | balance-designer (game-developer) | 소리 맞추기 **무시 구간(±30) 경계에서 결과가 뒤집힘**: 어른이 들리는 박에 정확히 치면(X = 0) 규칙 기대 raw −36 → 오프셋 −36이어야 하는데, 빌드 raw는 −28.2/−29.6이라 0으로 저장됨(빌드 raw가 들린 박 기준보다 늘 +4.3~8.2 ms, 소리 맞추기 박의 예약 매핑 오차로 보임). 결과: 그 기기에서 소리를 따라 치는 아이는 판정 e ≈ **−37~−40 ms**(통과 창 −150 안이라 실패는 아님). 이중 보정(+64 ms)은 없음 | `parts/firstrun.json` X=0 두 시나리오 | 무시 구간 기준이 visual_comp(40)와 같은 크기라 "완벽한 어른"이 늘 경계 근처에 옴 → 무시 구간을 raw가 아니라 (raw + visual_comp) 기준으로 보거나 ±20으로 줄이는 것 검토. 빌드는 `currentTime` 표본(`sample()` 최댓값 따라가기)의 +5 ms 쏠림 확인 |
| 4 | minor | art-director (game-developer) | 빌드 렌더 소리 크기가 `sound.json` 측정값(node 합성)과 소리별로 최대 2.7 dB 다름: rest_b −22.1 vs −19.4, mel_bell −21.6 vs −24.2(빌드 측정은 실제 곡의 모든 음 높이, art는 최고·최저 도수 2개), tap_good −6.5 vs −5.5, tap_empty −31.7 vs −30.1(잡음 생성기: 빌드 LCG `audio.js` vs sound-check mulberry32 — 같은 시드라도 다른 잡음). 크기 규칙(탭 ≥ 효과음 + 1, 탭 RMS ≥ 곡 박 + 6)은 여유 있게 통과 | `parts/sound.json` per_sound | sound-check의 잡음 생성기를 빌드와 같은 식으로 맞추고, 음 높이 집합을 실제 곡 음 전체로(빌드 측정과 같은 정의) |
| 5 | minor | art-director (game-developer) | 360x640(세로 작은 화면)에서 큰 구름 윗부분이 HUD 진행도 막대에 가려 잘림(막대 y 17~30, 구름 윗선 약 y 20). 412x915는 간격 있음. criteria "360x640에서 HUD와 게임 화면이 잘리지 않음"에 걸리는 모양 | `shots/360x640-ko-05-play.png`, `shots/360x640-ko-15-l1-finger.png`, 비교 `shots/412x915-en-05-play.png` | 세로 화면 `top_margin`에 HUD 높이를 넣거나 구름 높이 상한을 막대 아래로 |

이번 라운드 측정 한계(이슈 아님): 헤드리스라 귀로 듣지 않음(예약 시각·getOutputTimestamp·오프라인 렌더로만), 실제 휴대폰 터치 지연·`visual_comp_ms` 40 실측 없음, 블루투스 없음, 헤드리스 탭 전환은 visibilitychange가 오지 않아 강제 이벤트로만 확인(실기기 확인 필요), 음소거 출력 크기 미측정, 데스크톱 CPU 스로틀링이라 실기기 fps와 다를 수 있음.

회귀: 첫 라운드라 기준선만 기록(`metrics.json`). 다음 라운드는 위 표 1~24와 봇 표를 같은 명령으로 다시 비교.

## 잘 된 점
- 판정이 시뮬레이터와 구조적으로 같음(탭마다 `judgeAttempt` 재호출): 봇 24만 시도·실시간·실제 마우스·재시작·연습 모두 불일치 0, 빌드 σ70 곡선이 시뮬레이터와 표본 오차 안에서 같음.
- 자동 지연을 예약 때마다 다시 읽어 첫 실행 자동 지연 변화(10 → 74~82 ms)에도 이중 보정이 생기지 않음.
- 재시작 1.10~1.12 s(일찍·늦음·연습 모두), 입력 다음 프레임 북 반응, 손가락 신호 겹침 0, 6배 스로틀 플레이 구간 1% low 59 fps 이상, 버튼 48 px·겹침 0.

## 점수
- 영역: 기술 품질·안정성
- 체크 항목 통과: **14 / 16** + 부분 2 (harness/criteria.md "기술 품질" 17개 중 폐기 1개 제외)
  - 통과(14): 콘솔 0 · 외부 요청 0 · 평균 55 fps · 재시작 0.94~1.20 s 자동 · 백그라운드 멈춤(강제 이벤트, 실기기 미확인) · 저장 유지 · 일반 모드 실시간 완벽 입력 클리어 · 터치 영역 겹침 0 · 640x360 스크롤 표시 · 1% low 45 fps(시작·재시작·DPR 3) · 테스트 훅 화면 = 일반 모드 · 빌드 판정 = 시뮬레이터 판정 · 보조 계산 정의 같음·실제 입력 보정이 들린 박 기준 ±10 ms(raw 차 4.3~8.2) · 성능 새 브라우저 3회 모두 통과
  - 부분(2): 360x640 잘림 없음(구름 윗부분이 HUD에 가림, 이슈 5) · 이중 보정 없음 + 오프셋 = 규칙 기대값 ±10(이중 보정 0이지만 X = 0에서 무시 구간 경계로 0 vs −36, 이슈 3)
  - 공통 항목: 대상 연령 5/5(조작 1가지·승패 한 문장 "공이 북에 닿을 때 톡! 놓치면 다시."·notext 카드·손가락으로 학습·σ70 L1 연속 중앙값 1.82(빌드)·버튼 48 px·광고/외부 링크 없음), 원본 보호 1/1
- 점수: **8.5 / 10** (통과율 (14 + 2×0.5)/16 = 94 %에서 시작해, 실기기 미확인 항목(백그라운드·터치 지연)과 첫 탭 긴 프레임·실패 연출 2~3프레임 등 minor 5건을 감점. blocker·major 없음)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목 (1-6에서 반영):
  - 메뉴 전환(특히 첫 탭: 오디오 잠금 해제와 같은 처리)도 6배 스로틀에서 가장 긴 프레임 ≤ 100 ms (rhythm-02: 200~283 ms)
  - 보정 결과에 무시 구간이 있으면, 들린 박에 정확히 친 어른(X = 0)과 ±10 ms 흔들림에서 저장 오프셋이 뒤집히지 않음(경계에서 15 ms 이상 떨어짐)
  - 빌드 봇 재판정은 "빌드 기록 탭"과 "봇이 만든 전체 탭" 두 기준 모두로 하고, 하네스가 탭 사이에 시도 경계를 넘지 않게 1 s 이하로 끊어 진행

VERDICT: PASS
