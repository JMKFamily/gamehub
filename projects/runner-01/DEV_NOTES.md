# DEV_NOTES: runner-01 (Reverbound) 웹 빌드

작성: game-developer, 2026-11-17 (1-3 웹 빌드)

## 1. 구조

```
games/reverbound/
  index.html, style.css, icon.svg(= assets/app-icon.svg 복사)
  js/physics.js   물리 (compileLevel/step/simulate). 검증기와 공유하는 단일 구현
  js/game.js      게임 코어: 시도·사망·자동 재시작·클리어·연습 체크포인트·입력 큐 (DOM 없음, node에서도 실행)
  js/render.js    Canvas 2D 그리기·이펙트 (30-art 3~6절)
  js/audio.js     Web Audio 합성 음악·효과음 (30-art 7절)
  js/ads.js       광고 어댑터 (웹 더미)
  js/main.js      데이터 로드, UI, 입력, 저장, 오디오 시계 동기화, window.__game
  data/           sync-data.mjs가 만든 파일 + music.json(손 작성)
projects/runner-01/tools/
  sync-data.mjs          기획 데이터 → games/reverbound/data 복사·변환
  verify-levels.mjs      (수정) 물리를 games/reverbound/js/physics.js 에서 import
  selfcheck-sim.mjs      게임 코어에 검증기 입력열 재생 (node, 프레임 5종 × 홀드 2종)
  selfcheck-browser.mjs  Playwright 자체 확인 (콘솔·외부 요청·HUD·스크린샷·세 레벨 클리어)
  serve.mjs              레포 루트 정적 서버 (http://localhost:8123/games/reverbound/)
```

데이터 갱신 순서: 기획 파일 수정 → `node projects/runner-01/tools/verify-levels.mjs` → `node projects/runner-01/tools/sync-data.mjs` → `node projects/runner-01/tools/selfcheck-sim.mjs`.
`balance.json`이 실측으로 바뀌어도 코드 수정은 필요 없습니다(모든 물리·판정·재시작 수치는 data/balance.json에서 읽음).

## 2. 데이터 주도

| 데이터 | 원본 | 빌드 파일 | 비고 |
|---|---|---|---|
| 수치 | `balance.json` | `data/balance.json` | 그대로 복사 |
| 레벨 | `levels/*.json` | `data/levels/*.json` | `balance.json levels` 순서 |
| 문자열 | `10-lore.md` 5절 표 | `data/strings.json` | 키 70개 + 사망 문구 8 + 클리어 부제 4. 기본 한국어, `?lang=en`이면 영어 |
| 색 | `30-art.md` 2절 표, 6절 클리어 행 | `data/art.json` | 팔레트 표를 파싱. 표 형식이 바뀌면 sync-data가 오류로 멈춤 |
| 음악·효과음 | `30-art.md` 7절 | `data/music.json` | **손으로 옮겨 적은 파일**. 7절이 바뀌면 같이 고쳐야 함 |
| 완벽 입력열 | `verify-levels.mjs` 결과 | `data/test-inputs.json` | `taps`(검증기 입력열), `on_beat_taps`(박자대로 친 입력열). QA 재생, 레벨 1 손가락 시연에 사용 |

## 3. 물리·입력·시계

- 물리: 240 Hz 고정 스텝, `physics.js step()` = 20-balance 4장 순서 그대로. 검증기 코드를 옮긴 것이고, 검증기가 이 모듈을 import하도록 바꿨습니다. 옮기기 전후 `verify-levels.mjs --json` 출력(시간 제외)이 바이트 단위로 같음을 확인했습니다. 성능을 위해 근처 항목 조회(`near`)를 Set 대신 순서가 같은 재사용 배열로, 지나간 pad/orb 찾기를 Map으로 바꿨습니다(결과 동일).
- 프레임당 최대 `max_physics_steps_per_frame`(24) 틱. 밀린 틱은 다음 프레임에서 따라잡습니다.
- 렌더 보간: 직전 틱 → 현재 틱 선형 보간(최대 1틱 = 4.2 ms 지연).
- 입력: `pointerdown/up`, `keydown/up`(Space, ↑, W, Enter)의 `event.timeStamp`를 게임 시간 틱으로 바꿔 큐에 넣고, 해당 틱에서 반영합니다. 한 틱 안에 눌렀다 뗀 탭도 1틱 `down`으로 반영. 누른 채 재시작하면 바로 홀드 점프.
- 시계: 오디오가 켜져 있으면 화면의 게임 시간 = `audioCtx.currentTime - ctxStart`로 맞춥니다(50 ms 넘게 어긋나면 즉시, 아니면 10%씩 수렴). 음은 `ctxStart + t − (outputLatency + baseLatency + 사용자 보정)`에 예약해 화면과 들리는 박이 맞게 합니다. 시도 시작마다 0.05 s + 지연만큼 대기 후 출발.
- 일시정지: `AudioContext.suspend()`로 오디오 시계도 함께 멈춤. `visibilitychange`(숨김)·창 blur 시 자동 일시정지 + `paused_background` 문구, 계속 누르면 3·2·1 카운트다운.

## 4. 기능 대응 (HANDOFF 빌드 지시)

| 지시 | 구현 |
|---|---|
| 타이틀 | `title`/`subtitle`(+ 다른 언어 이름), 첫 탭으로 오디오 켜기(`tap_to_start`, `audio_unlock`), 메뉴 달리기/레벨 선택/설정. 달리기 = 아직 못 깬 첫 레벨 |
| 레벨 선택 | 카드 3장(레벨 팔레트 색, 번호, 별 = `difficulty.stars`, 이름·태그, 최고 %·연습 최고 %, 클리어 배지). 이전 레벨 클리어 시 잠금 해제(자물쇠 아이콘 + `level_locked`). 일반/연습 모드 토글 |
| HUD | 진행도 바(최고 기록 눈금, %), 시도 횟수(시작 1.5 s 크게), 일시정지 48 px. 연습 모드에 지점 찍기/지우기 버튼(Z/X 키) |
| 자동 재시작 | `restart_delay_s`(0.6 s) 후 자동. 사망 연출 길이 `death_fx_s` |
| 클리어 | 플레이어가 화면 밖으로 달려 나감, 결승선부터 클리어 색 판, 종이 조각 24개, level3 큰 종 흔들림, 1.2 s 후 클리어 화면(별 아이콘, 제목, 부제, N번 만에, 다음/다시/레벨 선택, 마지막 레벨은 `clear_all`) |
| 연습 모드 | 체크포인트 스택(상태 전체 저장), 사망 시 마지막 지점에서 재시작, 음악도 그 시각부터. 클리어로 인정 안 함, 연습 최고 % 따로 저장 |
| 저장 | `localStorage['reverbound.save.v1']`, 모든 접근 try/catch. 레벨별 best/bestPractice/cleared/attempts, 설정, 1회성 안내 플래그 |
| 설정 | 음악·효과음 볼륨, 음소거 토글, 박자 보정(−200~+200 ms, 메트로놈 8박 탭 테스트로 자동 맞춤), 화면 흔들림(번개 포함), 발판·고리 효과음(기본 끔), 기록 초기화(확인 창) |
| 튜토리얼 | 레벨 `cues` 지점에서 그림 카드(오브젝트와 같은 색·모양 아이콘 + 문구) 3 s. 레벨 클리어 전에만(연습 모드는 항상). 첫 사망 1회 `tut_restart`. 레벨 1 첫 구간(24박 전)은 클리어 전까지 **손가락 시연**(탭 시점에 손가락이 누르는 그림) |
| 아트 | 30-art 4절 도형 좌표 그대로 Canvas 2D. 천장 장애물 매다는 줄/가로 막대, 패럴랙스 2겹(0.2·0.5배, 둥근 도형만), 박자 펄스, intensity별 연출, level3 번개(마디 첫 박, 흔들림 끄면 끔), 점프·착지·발판·고리·게이트·사망·클리어 이펙트, 입자 풀 48개 |
| 사운드 | 30-art 7-1 악기 9종 합성, 7-2 레벨 패턴, 구간 intensity → 파트, 템포 문(느림 = 하프타임), 사이드체인, 25 ms 스케줄러 / 0.1 s lookahead. 효과음 7-3 전부 |
| 테스트 훅 | 아래 6절 |
| 광고 | `js/ads.js` 더미. 메뉴 화면에서만 showBanner, 플레이 시작 시 hideBanner. 전면·보상형은 배치 설계 전이라 호출 안 함 |
| 허브 | `games.json`에 reverbound 등록, `node scripts/validate.mjs` OK |

## 5. 기획과 다르게(또는 기획에 없어서 정해서) 구현한 점 — 해당 역할 확인 요청

| # | 내용 | 이유 | 확인 역할 |
|---|---|---|---|
| D1 | `music.json`의 리드 선율(level1·level2)과 패드 화음(level1·level3), level2 리드는 7-2에 음이 없어 개발이 정함. level3 `bass_drop`의 "2마디마다 C2→D2"는 E1·E1·C2·D2 4마디 순환으로 해석 | 7-2 미정 | art-director |
| D2 | intensity 1 파트 = 킥·햇·베이스, 2 = + 스네어/클랩·패드, 3 = + 리드, 4 = + 햇 16분. 7-2 표의 "레벨 본편 패턴 전체(리드 제외)"를 2로 읽음 | 표 해석 | art-director |
| D3 | 느림 템포 문 하프타임을 느림 구간 전체(40~55박)에 적용 | 20-balance 12-3 미결 사항 | art-director |
| D4 | 레벨 선택 카드·버튼·HUD 모양, 아이콘(재생·격자·톱니·깃발 등)은 30-art에 없어 단순 도형으로 새로 그림 | UI 그림 미정 | art-director |
| D5 | `tut_low`, `tut_hold`는 레벨 `cues`에 없어 표시하지 않음 | 밸런스 12-4 | lore-writer, balance-designer |
| D6 | 언어: 기본 한국어, `?lang=en`으로 영어. 언어 설정 UI는 문자열 키가 없어 넣지 않음 | 키 없음 | lore-writer |
| D7 | 결승선 위치에 얇은 반투명 세로 띠(판정 없음) | 클리어 지점 가독성 | art-director |
| D8 | 세로 모드: 1타일 = 너비 ÷ 14, 게임 영역(10타일)을 가운데 두고 위아래 bg. 진행도 바는 폭 560 px 이하에서 둘째 줄로 | 360 px 폭에 HUD가 한 줄에 안 들어감 | art-director |
| D9 | 손가락 시연은 검증기의 박자대로 친 입력열(`on_beat_taps`)에서 레벨 1 첫 24박 탭만 사용 | 5~6세 원칙(시연 튜토리얼) | balance-designer |
| D10 | 시도 횟수는 레벨별 누적(일반 모드, 저장됨), 연습 모드는 그 판 안에서만 셈. `clear_attempts`는 클리어한 판의 누적 시도 | 문서에 정의 없음 | balance-designer |
| D11 | 일시정지 메뉴의 연습 모드 토글은 그 레벨을 처음부터 다른 모드로 다시 시작 | 단순화 | benchmark-analyst |

## 6. 테스트 훅 (`window.__game`)

- `?test=1`: 오디오 끔, 랜덤 연출 끔(입자는 고정 시드, 사망 문구 순서대로), 흔들림 끔, 게임은 `step()`으로만 진행(렌더는 계속), 레벨 잠금 무시.
- 필수: `state`(`title|levels|settings|playing|dead|clear|paused|loading`), `levelIndex`, `progress`(**0~100 %**), `attempts`, `loadLevel(i, {practice})`, `step(dt)`(dt를 1/240 s 틱으로 반올림해 진행), `press()`, `release()`(다음 틱에 반영).
- 추가: `tick`, `player`({x, y, vy, grounded}), `practice`, `ready`, `audio`(AudioContext 상태), `placeCheckpoint()`, `removeCheckpoint()`, `pause()`, `resume()`, `show(screen)`, `replay(i, taps?, {holdTicks, frameDt})`(입력열을 틱 지정으로 넣고 frameDt 프레임으로 끝까지 진행), `testInputs`, `save`.
- 클리어 화면은 `step()`으로 클리어 후 1.2 s를 진행하면 뜹니다.

## 7. 자체 확인 결과 (2026-11-17)

| 검사 | 결과 |
|---|---|
| `node projects/runner-01/tools/verify-levels.mjs` | ALL PASS (3/3), 공유 모듈 전환 전후 출력 동일 |
| `node projects/runner-01/tools/selfcheck-sim.mjs` | ALL OK 64/64: 세 레벨 × 입력열 2종(검증기·박자대로) × 홀드 2종(1틱·19틱) × 프레임 5종(60/120/144 Hz, 4~34 ms 불규칙, 30 Hz + 150 ms 끊김) 클리어. 무입력 사망 후 0.600 s 자동 재시작. 연습 체크포인트 재시작 위치 일치 |
| `node scripts/validate.mjs` | OK: 2 game(s) |
| Playwright (playwright-core 1.48.2 + 설치된 Edge, `--channel msedge`) | 콘솔 에러·경고 0, 외부 요청 0, `?test=1`에서 세 레벨 클리어(60 Hz 검증기 입력열, 144 Hz 박자 입력열 + 80 ms 누름), HUD 1280x720·640x360·360x640 모두 화면 안·48 px 이상·겹침 0, 일반 모드(오디오 running)에서 실제 클릭 후 0.1 s에 y = 1.47 t |
| 스크린샷 | `reviews/dev-selfcheck/` 31장 + `selfcheck.json` |

못 한 것
- 실제 모바일 기기·저사양 CPU 스로틀링 fps 측정, 오디오-화면 지연 실측(보정 후 ≤ 20 ms 기준), 귀로 듣는 음악 품질 확인(헤드리스라 소리를 들을 수 없음).
- 실제 사람 손 입력 지연(입력→점프 1프레임 이내)은 코드 경로로만 확인.

## 8. 알려진 문제·남은 일

- 레벨 1이 5~6세 기준으로 몇 번 만에 깨지는지는 밸런스 판단이 필요(레벨 데이터는 개발이 바꾸지 않음). 최소 창 146 ms, 탭 35회.
- 블록이 붙어 있는 계단(레벨 1 252~281 t 등)은 블록마다 외곽선을 그려 이음매 선이 보임(30-art 3절 규칙 6 "바깥 둘레만" 미적용).
- 배경 모티프는 단순 도형으로 근사(소리굽쇠·천막·톱니·종). art-director 리뷰 필요.
- 사망 시 음악은 즉시 끊고 재시작마다 처음(또는 체크포인트)부터 다시 예약. 매우 느린 기기에서는 프레임당 24틱 상한 때문에 잠깐 화면이 오디오보다 늦을 수 있음(다음 프레임에서 따라잡음).
- 화면 흔들림 끄기가 번개 연출도 끔(30-art 6절대로).
