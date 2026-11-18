# DEV_NOTES: runner-01 (Reverbound) 웹 빌드

작성: game-developer, 2026-11-17 (1-3 웹 빌드) · 갱신: 2026-11-17 round-2 빌드 (레벨 10개, round-1 이슈 처리, 9~10절) · round-2 콤보 빌드 (콤보·판정 %, art 확정 반영, 12절)

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
  js/combo.js     콤보·판정 % (tools/sim/combo-ref.mjs 본문 그대로, 12절)
  data/           sync-data.mjs가 만든 파일 + music.json(손 작성, 30-art 7절) + art-gimmicks.json(손 작성, 30-art 부록 B). 임시값 파일 없음(12절)
projects/runner-01/tools/
  sync-data.mjs          기획 데이터 → games/reverbound/data 복사·변환
  verify-levels.mjs      (수정) 물리를 games/reverbound/js/physics.js 에서 import
  selfcheck-sim.mjs      게임 코어에 검증기 입력열 재생 (node, 프레임 5종 × 홀드 2종)
  selfcheck-browser.mjs  (round-2부터 QA 담당 소관, 개발은 고치지 않음)
  dev-selfcheck.mjs      (round-2 새로) 개발 브라우저 자체 확인: 10레벨 재생, 레벨 선택·설정 레이아웃, 기믹 스크린샷, 6배 스로틀 성능
  serve.mjs              레포 루트 정적 서버 (http://localhost:8123/games/reverbound/)
```

데이터 갱신 순서: 기획 파일 수정 → `node projects/runner-01/tools/verify-levels.mjs` → `node projects/runner-01/tools/sync-data.mjs` → `node projects/runner-01/tools/selfcheck-sim.mjs`.
`balance.json`이 실측으로 바뀌어도 코드 수정은 필요 없습니다(모든 물리·판정·재시작 수치는 data/balance.json에서 읽음).

## 2. 데이터 주도

| 데이터 | 원본 | 빌드 파일 | 비고 |
|---|---|---|---|
| 수치 | `balance.json` | `data/balance.json` | 값은 그대로, `_`로 시작하는 설명 키만 뺀 사본(12절). `practice`·`combo`·`combo.judge_pct` 포함 |
| 레벨 | `levels/*.json` | `data/levels/*.json` | `balance.json levels` 순서, `judge_taps` 포함(없으면 sync-data가 멈춤) |
| 문자열 | `10-lore.md` 5절 표 | `data/strings.json` | round-2: 키 90개 + 사망 문구 4(표시 안 함) + 클리어 부제 4. 언어는 `?lang=` → 없으면 `navigator.language`(ko로 시작하면 한국어, 아니면 영어) |
| 색·카드·배경 모양 | `30-art.md` 2-1 표(levelN 열 + "배경 모양 키" 행), 2-2 공통, 2-2-1 `cardTint`, 5-5 대표 오브젝트 표, 6절 클리어 행 + `data/art-gimmicks.json`(부록 B 본문 옮김) | `data/art.json` | (round-2 콤보 빌드) 임시값 없음: 10레벨 값이 30-art에 하나라도 없으면 sync-data가 멈춤. 대비 27쌍 검사. `art.json provisional`은 빈 객체 |
| 음악·효과음 | `30-art.md` 7절·5-8-3·부록 B-6 | `data/music.json` | **손으로 옮겨 적은 파일**. 7-4 반영 목록 전부. 레벨 4~10은 `levels.levelN = {base, transpose}`(level7 `bass_octave: 1`)를 `audio.js expandThemes`가 로드 때 펼침. 문 편곡은 `gates`(fast·slow), 콤보 화음 `sfx.combo_mark` |
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
| HUD | 진행도 바(최고 기록 눈금, %), 시도 횟수(시작 1.5 s 크게), 일시정지 48 px. (11절: 연습 모드 지점 찍기/지우기 버튼은 없앰, 자동 체크포인트) |
| 자동 재시작 | `restart_delay_s`(0.6 s) 후 자동. 사망 연출 길이 `death_fx_s` |
| 클리어 | 플레이어가 화면 밖으로 달려 나감, 결승선부터 클리어 색 판, 종이 조각 24개, level3 큰 종 흔들림, 1.2 s 후 클리어 화면(별 아이콘, 제목, 부제, N번 만에, 다음/다시/레벨 선택, 마지막 레벨은 `clear_all`) |
| 연습 모드 | (11절: round-2 후속부터 자동 체크포인트) 체크포인트 스택(상태 전체 저장), 사망 시 마지막 지점에서 재시작, 음악도 그 시각부터. 클리어로 인정 안 함, 연습 최고 % 따로 저장 |
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
| D3 | 느림 템포 문 하프타임을 느림 속도 구간 전체에 적용. round-2: 레벨 1~3에는 속도 문이 없어 `level3.slow` 삭제(7-4), 레벨 8~10 임시 곡에 부록 B-6 하프타임(`slow_default`) 적용. 빠른 문의 "햇 16분 + 리드"(B-6)는 아직 안 함(intensity 규칙만). **(콤보 빌드) 하프타임 폐기, B-6 확정대로 `music.json gates`: 느림 = 킥 4분·햇 끔·패드 800 Hz, 빠름 = 햇 16분** | 부록 B-6 | art-director |
| D4 | 레벨 선택 카드·버튼·HUD 모양, 아이콘(재생·격자·톱니·깃발 등)은 30-art에 없어 단순 도형으로 새로 그림 | UI 그림 미정 | art-director |
| D5 | `tut_low`, `tut_hold`는 레벨 `cues`에 없어 표시하지 않음 | 밸런스 12-4 | lore-writer, balance-designer |
| D6 | (round-2 해소) 언어: `?lang=` → `navigator.language` 자동 선택. 언어 설정 UI는 만들지 않음 | 10-lore 확정값 | lore-writer |
| D7 | 결승선 위치에 얇은 반투명 세로 띠(판정 없음) | 클리어 지점 가독성 | art-director |
| D8 | 세로 모드: 1타일 = 너비 ÷ 14, 게임 영역(10타일)을 가운데 두고 위아래 bg. 진행도 바는 폭 560 px 이하에서 둘째 줄로 | 360 px 폭에 HUD가 한 줄에 안 들어감 | art-director |
| D9 | 손가락 시연은 검증기의 박자대로 친 입력열(`on_beat_taps`)에서 레벨 1 첫 24박 탭만 사용 | 5~6세 원칙(시연 튜토리얼) | balance-designer |
| D10 | 시도 횟수는 레벨별 누적(일반 모드, 저장됨), 연습 모드는 그 판 안에서만 셈. `clear_attempts`는 클리어한 판의 누적 시도 | 문서에 정의 없음 | balance-designer |
| D11 | 일시정지 메뉴의 연습 모드 토글은 그 레벨을 처음부터 다른 모드로 다시 시작 | 단순화 | benchmark-analyst |
| D12 | (round-2) 레벨 선택 카드 10장: 가로 5×2 / 세로 2×5 격자로 스크롤 없이 배치(카드 높이 96 px 미만이 되는 화면에서만 세로 스크롤 + ▼ 표시). 좁은 카드에서는 태그(`levelN_tag`)를 숨기고(카드 높이 170 px 이상에서 표시), 최고 %는 지금 고른 모드 것 하나만 지면 띠 안에 `outline` 색 글자로, 잠긴 레벨의 `level_locked` 문구는 누를 때 토스트(자물쇠 그림 + 글)로 보여 줌. 클리어 배지는 좁은 카드에서 ✓만 | 360x640에서 10장이 잘리지 않게 | art-director, lore-writer |
| D13 | (round-2) 대표 오브젝트 높이 = max(24 px, 카드 높이 × 0.2~0.25). 30-art 5-5 "지면 띠 × 0.9"를 그대로 쓰면 좁은 카드에서 이름 글자와 겹침 | 겹침 방지 | art-director |
| D14 | (round-2) 레벨 이름이 비면 `levelN_name` 문자열 → 레벨 JSON `name` → 레벨 번호 순으로 대체 (지금은 10레벨 모두 이름 있음) | 20-balance 14-6 dev 3 | lore-writer |
| D15 | (round-2) 울림 고리는 효과음 없음(`sfx.trigger`는 30-art 7-3대로 발판 전용). 설정 문구 `settings_trigger_sfx`도 "발판 소리" 그대로 | 30-art 7-3·10-lore 5-3 | art-director |
| D16 | (round-2) 템포 문 받침: 문 x를 덮는 상자가 있으면 그 윗면부터 3칸 높이로 그림(부록 B-4 "높은 곳이면 늘림"의 단순화). 지금 레벨들은 모든 문이 바닥 위 | 부록 B-4 | art-director |
| D17 | (round-2) 타이틀 손가락: 그림 48×58 px, 1 s 주기 4 px 누름 + 손끝 링. `prefers-reduced-motion`이면 누름만 끄고 링은 유지 | 30-art 5-4 | art-director |

## 6. 테스트 훅 (`window.__game`)

- `?test=1`: 오디오 끔, 랜덤 연출 끔(입자는 고정 시드, 사망 문구 순서대로), 흔들림 끔, 게임은 `step()`으로만 진행(렌더는 계속), 레벨 잠금 무시.
- 필수: `state`(`title|levels|settings|playing|dead|clear|paused|loading`), `levelIndex`, `progress`(**0~100 %**), `attempts`, `loadLevel(i, {practice})`, `step(dt)`(dt를 1/240 s 틱으로 반올림해 진행), `press()`, `release()`(다음 틱에 반영).
- 추가: `tick`, `player`({x, y, vy, grounded}), `practice`, `ready`, `audio`(AudioContext 상태), `placeCheckpoint()`, `removeCheckpoint()`, `pause()`, `resume()`, `show(screen)`, `replay(i, taps?, {holdTicks, frameDt})`(입력열을 틱 지정으로 넣고 frameDt 프레임으로 끝까지 진행), `testInputs`, `save`.
- round-2 추가: `levelCount`(10), `levelData(i)`(레벨 JSON), `lang`, `seek(i, x)`(검증기 입력열로 x 지점까지 `step()` 진행, 스크린샷용), `play(i, {taps, holdTicks})`(`?test=1`에서도 rAF 실시간으로 진행, 성능 측정용).
- 클리어 화면은 `step()`으로 클리어 후 1.2 s를 진행하면 뜹니다(일반 모드도 같은 게임 시간 조건, `setTimeout` 없음).
- round-2: 튜토리얼 카드·토스트·시도 수 크게 표시·클리어 HUD 페이드는 화면 문구 시계 `uiT`(게임이 진행될 때만 흐름)를 써서 `step()` 화면과 일반 모드 화면이 같습니다. `step()`이 HUD·카드를 바로 갱신합니다.

## 7. 자체 확인 결과 (2026-11-17, 1-3 빌드. round-2 결과는 10절)

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

- (round-2 해소) 레벨 1 아동 난이도: balance-designer 재설계로 탭 15회, 최소 창 266.7 ms.
- (round-2 해소) 계단 블록 이음매: 묶음 바깥 둘레 하나로 그림(30-art 3절 규칙 6).
- 배경 모티프는 단순 도형으로 근사(소리굽쇠·천막·톱니·종). art-director 리뷰 필요.
- 사망 시 음악은 즉시 끊고 재시작마다 처음(또는 체크포인트)부터 다시 예약. 매우 느린 기기에서는 프레임당 24틱 상한 때문에 잠깐 화면이 오디오보다 늦을 수 있음(다음 프레임에서 따라잡음).
- 화면 흔들림 끄기가 번개 연출도 끔(30-art 6절대로).

## 9. 레벨 4~10 임시값 (art-director 확정 전, round-2) — (round-2 콤보 빌드) 모두 30-art 확정값으로 대체, 파일 삭제. 아래는 기록

**모든 임시값은 `games/reverbound/data/provisional-art.json` 한 파일에 있습니다.** 30-art.md 기존 규칙에서 파생했습니다.
- 2-1: 어두운 `bg` 계열 5색
- 2-2: 공통 전경색은 그대로
- 2-3: 대비 기준
- 5-5: 카드 테두리 = 클리어 색
- 7-1·7-2: 악기·패턴
- 부록 B: 새 기믹 도형

| 항목 | 임시값 위치 (`provisional-art.json`) | art 확정값이 생기면 |
|---|---|---|
| 팔레트 `bg/bgFar/bgPulse/bgAccent/ground` (level4~10) | `palette` | 30-art 2-1 표 머리줄에 `level4`… 열이 생기면 `sync-data.mjs`가 자동으로 그 값을 씀(임시값 무시) |
| 카드 테두리 `cardTint` | `cardTint` | 30-art 2-2-1 표에 levelN 열이 생기면 자동 |
| 클리어 색 판 | `clear` | 30-art 6절 "클리어" 행에 `levelN` 색이 적히면 자동 |
| 배경 모티프 3종 | `motifs` (`drop`, `cloud`, `wheels`, `rail`, `hill`, `bubble`, `arch`, `stalactite`, `flower`, `shell`, `sun`, `stage`) | 이름만 바꾸면 됨. 새 모양이 필요하면 `render.js shape()`에 추가 |
| 레벨 카드 대표 오브젝트 | `card_object` (4 얇은 판 + 아래 가시, 5 분홍 문, 6 고리, 7 위 가시, 8 하늘색 문, 9 얇은 판 계단, 10 반원 해) | 값만 바꿈. 그림은 `main.js cardObject()` |
| 새 기믹 모양 파라미터 | `gimmicks` (문 높이 3칸·받침 위에 세움, 얇은 판 두께, 천장 매달기) | 값만 바꿈. 도형 자체는 부록 B-1~B-4 좌표 그대로(`render.js`) |
| 곡 (level4~10) | `music` (base 곡 + 반음 이동: 4 = level1 +2, 5 = level2 +2, 6 = level1 +5, 7 = level3 −2, 8 = level2 −2, 9 = level3 +1, 10 = level1 +7 + 종), `slow_default` (하늘색 문 하프타임, 부록 B-6) | `music.json levels.levelN`에 확정 패턴을 적으면 그쪽이 우선(게임이 `music.json`에 없는 테마만 파생) |
| 튜토리얼 카드 그림 5장 (`tut_string`·`tut_tempo`·`tut_ring`·`tut_hanging`·`tut_tempo_slow`) | `main.js cueIcon()` (10-lore 5-6 그림 힌트 + 부록 B 도형, 72 단위 = 5-3 규칙) | 30-art 5-3 표에 좌표가 생기면 그 좌표로 교체 |

대비: `sync-data.mjs`가 매번 30-art 부록 A의 26쌍과 카드 테두리 3:1을 계산합니다. 기준 미달이면 오류로 멈춥니다. 위험 vs 배경 4개 층 최소값은 아래와 같습니다. 모두 4.5:1 이상입니다.

| level4 | level5 | level6 | level7 | level8 | level9 | level10 |
|---|---|---|---|---|---|---|
| 5.21:1 | 5.55:1 | 5.66:1 | 6.14:1 | 5.53:1 | 5.51:1 | 5.78:1 |

결과는 `data/art.json contrast`에 남습니다.

## 10. round-2 빌드 (2026-11-17)

보고서 `Docs/game-developer/2026-11-17-r2-build.md`. 개발 이슈별 처리는 `reviews/round-1/dev-response.md`에 있습니다.

### 바뀐 점
- 데이터: `sync-data.mjs`로 10레벨, 문자열 90키를 반영했습니다. 30-art 팔레트는 표 머리줄에서 levelN 열을 찾아 읽고, 30-art에 없는 레벨은 9절 임시값으로 채운 뒤 대비를 검사합니다.
- 새 기믹 4종(얇은 판·템포 문 빠름/느림·울림 고리·위 가시): 물리는 `physics.js` 그대로입니다. 검증기와 같은 모듈이고 수정한 것이 없습니다. 렌더는 바꿨습니다.
  - 템포 문: 받침 높이부터 3칸 높이로 그립니다.
  - 블록 묶음: 바깥 둘레 하나로 그립니다.
  - 울림 고리: 효과음을 없앴습니다.
- 음악
  - 30-art 7-4를 반영했습니다. 사망음은 삼각파 −10 dB이고, 구간 규칙은 이름 대신 위치로 판단합니다.
  - 레벨 4~10 곡은 임시로 파생합니다.
- 화면: round-1 개발 이슈(S11~S32)를 모두 처리했습니다. 레벨 선택 카드 10장이 4해상도 × 한/영에서 스크롤·잘림·겹침 없이 들어갑니다.
- 성능: 로드 화면 뒤에서 기믹이 많은 레벨을 미리 한 번 그립니다(첫 컴파일 스파이크 제거). HUD DOM 쓰기는 값이 바뀔 때만 합니다.

### 자체 확인

| 검사 | 결과 |
|---|---|
| `node projects/runner-01/tools/verify-levels.mjs` | ALL PASS (10/10) |
| `node projects/runner-01/tools/selfcheck-sim.mjs` | ALL OK 211/211 (10레벨 × 입력열 2 × 홀드 2 × 프레임 5, 무입력 재시작 1.08 s, 체크포인트) |
| `node scripts/validate.mjs` | OK: 2 game(s) |
| `tools/dev-selfcheck.mjs` (playwright-core 1.62 + Edge) | 아래 표 |

`dev-selfcheck.mjs` 결과:
- 콘솔 에러·경고 0, 외부 요청 0.
- `?test=1` 재생 30/30 클리어: 10레벨 × (검증기 60 Hz 1틱, 박자 144 Hz 80 ms, 검증기 30 Hz 100 ms).
- 레벨 선택·설정·일시정지·타이틀 화면 (4해상도 × 한/영)
  - 48 px 미만 버튼 0, 화면 밖 0, 겹침 0.
  - 카드 잘림·넘침·낱말 중간 줄바꿈·그림 겹침 0.
  - 640x360 설정 패널 262/262로 넘침 없음.
- 6배 CPU 스로틀링, rAF 실시간 재생

| 해상도 | 레벨 7 (오브젝트 235개) | 레벨 4 (가시 142) | 레벨 1 재시작 반복 20 s |
|---|---|---|---|
| 640x360 DPR 3 | 평균 59.9 / 1% low 51.4 fps, 최대 50 ms | 60.0 / 58.1 | 59.9 / 55.0 |
| 1280x720 DPR 1 | 60.0 / 57.0 fps, 최대 33 ms | 60.0 / 58.1 | 59.9 / 51.0 |

- 언어 자동 선택: en-US 브라우저는 en, ko-KR 브라우저는 ko입니다.
- 일반 모드: 첫 탭 뒤 오디오 running, 레벨 1 진행을 확인했습니다.

스크린샷은 `reviews/dev-selfcheck/r2-*.png` 140장이고, 결과 데이터는 `round2.json`입니다.

### 남은 일
- art-director 확정이 필요합니다. 9절 임시값 전부와 D12~D17이 대상입니다. 확정되면 30-art 표에 levelN 열을 추가하면 sync-data가 자동으로 반영합니다. 곡은 `music.json`에 적습니다.
- 부록 B-6의 빠른 문 음악 변화(햇 16분 + 리드)는 아직 넣지 않았습니다.
- 귀로 듣는 음악 확인과 실기기 fps는 측정하지 못했습니다(헤드리스 환경).

## 11. 후속: 연습 모드 자동 체크포인트 (2026-11-17, 오케스트레이터 결정 11)

근거:
- `00-benchmark.md` 7-2·10절 "자동 체크포인트(안전한 지점만)"
- 12-1 실측: 레퍼런스의 수동 체크포인트를 피할 수 없는 자리에 찍으면 155회 연속 사망 고리가 생김
- `harness/insights.md` 레퍼런스 감각 절 연습 모드 항목

| 항목 | 구현 |
|---|---|
| 버튼 | 깃발 꽂기·빼기 버튼(`cpPlace`·`cpRemove`)과 Z/X 키를 없앴습니다. 연습 모드 조작은 탭 하나입니다. 문자열 `practice_place_btn`·`practice_remove_btn`·`practice_checkpoint_*`는 화면에 쓰지 않습니다. |
| 안전 지점 판정 (`js/practice.js safePoints`) | 검증기 물리(`physics.js simulate`)로 클리어 입력열 2개(`test-inputs.json`의 `taps`·`on_beat_taps`)를 돌린 궤적 위에서 고릅니다. 조건: ① 착지 상태(g, vy 0) ② 정박 틱 ③ 그 틱부터 다음 탭까지 `checkpoint_min_lead_s`(0.8 s) 이상. |
| 저장 (`game.js tickOnce`) | 연습 모드에서 플레이어 실제 상태가 그 틱의 궤적 상태와 같을 때(착지·같은 높이)만 자동 저장합니다. 따라서 부활하면 입력 없이 0.8 s 이상 살아 있고, 같은 입력열로 끝까지 깰 수 있습니다. |
| 부활 | 마지막 자동 체크포인트에서 `restart_delay_s`(1.08 s, 일반과 같음) 뒤 부활합니다. 누른 채 부활해도 자동 점프하지 않고 새로 눌러야 뜁니다(레벨 처음 시작은 기존대로 홀드 점프). |
| 표식 | 마지막 체크포인트 자리에 흰 깃대 + 민트(`trigger`) 깃발을 그립니다(판정 없음). |
| 설정값 | `games/reverbound/data/practice.json`: `checkpoint_min_lead_s` 0.8, `checkpoint_every_beats` 1, `traces`. 개발 임시값이고 balance-designer 확정 대상입니다(D18). |
| 테스트 훅 | `checkpoints`(목록), `safePoints(i)`(안전 틱 목록), `seek(i, x, {taps, practice})`. `placeCheckpoint()`·`removeCheckpoint()`는 QA 호환용으로 남겼고, 화면에는 버튼이 없습니다. |

| # | 내용 | 이유 | 확인 역할 |
|---|---|---|---|
| D18 | 안전 지점 = 클리어 궤적 위 착지·정박·다음 탭까지 0.8 s 이상. 궤적과 다른 길(예: 상자를 피해 바닥으로 간 경우)에서는 저장하지 않음 | 검증기와 같은 규칙으로 "부활 후 무입력 0.8 s 생존 + 클리어 가능"을 보장하는 가장 단순한 방법. 0.8 s는 레퍼런스 부활 리듬(약 1.05 s)과 아이 반응(σ70)을 보고 정한 임시값 | balance-designer, benchmark-analyst |

### 자체 확인

`node projects/runner-01/tools/practice-check.mjs 40` (새 도구): ALL OK.

| 레벨 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 안전 지점 | 64 | 78 | 107 | 103 | 119 | 128 | 112 | 107 | 116 | 118 |
| 연습 클리어까지 평균 시도 | 2.5 | 2.7 | 2.8 | 3.6 | 4.3 | 5.4 | 4.9 | 5.1 | 5.0 | 5.7 |
| 같은 지점 연속 사망 최대 | 2 | 2 | 3 | 3 | 6 | 4 | 5 | 9 | 4 | 6 |

정적 검사는 모든 안전 지점이 대상입니다. 레벨마다 궤적 2개 × 지점이고, 10레벨 합계 2,104곳입니다.
- 입력 없이 0.8 s 안에 죽는 지점 0
- 같은 입력열로 못 깨는 지점 0

봇 반복은 σ70 아동 대리 봇 40세션 × 10레벨을 game.js 연습 모드로 돌렸습니다.
- 갇힘(부활 뒤 아무것도 누르지 않았는데 0.8 s 안에 사망) 0
- 미클리어 0

음성 대조로 검사가 의미 있는지 확인했습니다. 여유 규칙 없이 "착지·정박"만 쓰면 후보 1,562곳 중 405곳이 입력 없이 0.8 s 안에 죽는 자리입니다. 여유 규칙이 이 자리를 걸러 냅니다.

`dev-selfcheck.mjs --part practice` (브라우저 `?test=1`): 30/30 OK, 콘솔 에러 0.
- 대상: 10레벨 × 레벨 30·60·85 % 지점에서 입력을 끊어 죽게 함.
- 확인한 것: 마지막 자동 체크포인트 x에서 부활하고, 부활 뒤 0.8 s 동안 무입력으로 살아 있음.
- 스크린샷: `r2-practice-L5-respawn.png`, `r2-practice-L7-respawn.png`.

## 12. round-2 콤보 빌드 (2026-11-17, 콤보·판정 이름·%, art 확정 반영)

보고서 `Docs/game-developer/2026-11-17-r2-combo-build.md`.

### 데이터
- `provisional-art.json` 삭제: 팔레트·카드색·클리어색은 30-art 2-1·2-2-1·6절, 카드 대표 오브젝트는 5-5 표, 배경 모양은 2-1 "배경 모양 키" 행을 sync-data가 읽음(level7 = arch, drops, arch). 부록 B 본문 값(문 높이 3·받침 위, 얇은 판 0.20, 막대·4칸마다 줄)은 `data/art-gimmicks.json`에 옮겨 적고, 얇은 판 두께가 `balance.json platform_thickness_t`와 다르면 sync-data가 멈춤. 곡 4~10과 `slow`(킥 4분·햇 끔·패드 800 Hz)·`fast`(햇 16분)는 `music.json`으로.
- `data/practice.json` 삭제 → `balance.json practice`(값 같음). `practice-check.mjs`도 `bal.practice`를 읽음.
- `data/balance.json`은 `_` 설명 키를 뺀 사본: 설명에 레퍼런스 벤치마크 문서 경로가 있어 게임 파일에 레퍼런스 이름이 남았기 때문(원본 보호). 값은 같음.
- 문자열 102키(10-lore 5-8·5-9 추가, `practice_*` 4개 삭제, `level_locked` 영어 변경).

### 콤보·판정 (20-balance 15장)
- `js/combo.js` = `tools/sim/combo-ref.mjs` 본문 그대로(머리 주석만 다름, `combo-build-check.mjs` S1이 바이트 비교). 짝짓기·등급·%·Δ 0.001 ms 반올림·`edge_tol_ms` 0.15·정확도 모두 기준과 같음.
- `game.js`: 누름 번호(새로 누른 틱마다 +1, 떼면 없음)와 `onTick(k, ev, pressId)` 훅만 추가. 생사 흐름은 그대로(콤보는 아무것도 넘기지 않음). 사망 틱에는 호출하지 않고, 클리어 판정 전에 부름(combo-check 실행기와 같은 순서).
- `main.js`: 시도 시작 `J.reset(G.k, practice)`(연습 부활 = 체크포인트 틱), 사망 `onDeath`, 클리어 `onClear`. 기록 `bestCombo`(일반 모드 시도 중 최대)·`bestAccuracy`(일반 모드 클리어 중 최대, `updateBest`).

### 표시 (30-art 5-8)
| 항목 | 구현 |
|---|---|
| 콤보 줄 | `#combo`(DOM, HUD 안): 진행도 바 아래 6 px 가운데, 점 d = clamp(0.16타일, 7, 12), 간격 0.6d, 도넛 1.8d(구멍 0.8d)는 왼쪽에 1.2d 간격. 2부터 보임. 튐 120 ms(5·15·25는 1.35배), 10 = 0.4 s 모임 + 표지, 20 = + 종이 조각 6개(0.4~0.6 s). 시계는 `uiT`(게임 시간)라 테스트 훅 화면과 같음 |
| 튜토리얼 카드 | 위 끝 = max(CSS 기본값, 콤보 줄 아래 끝 + 8 px) (`layoutCombo`, 화면 크기 바뀔 때·레벨 시작 때) |
| 판정 이름 + % | 캔버스. 판정 순간 플레이어 뒤쪽 위 화면 좌표에 고정. 이름 clamp(0.5타일, 16, 36) px(2등급 0.9·3등급 0.8배), % clamp(0.32타일, 12, 22) px. 색 금/민트/흰, 이름 위 점 3/1/0개, `outline` 3 px 테. 0.7 → 1.0배 60 ms → 0.30 s → 0.15 s 뜨며 사라짐(전체 0.45 s). 새 판정이 오면 바로 교체. 겹침: 위험 판정 상자·고리·매다는 막대/줄·HUD 띠(+4 px)와 0.45 s 동안 글 밑을 지나갈 범위까지 검사 → % 숨김 → 왼쪽 0.5·1타일 → 생략 |
| 사망 | 콤보 줄·표지·판정 글이 0.3 s 동안 작아지며 사라짐, 소리 없음 |
| 소리 | 등급별 없음. 10·20 화음만 `sfx.combo_mark`(판정 박 t_s + 0.5박, −20 dB, triangle, 근음 옥타브 4·3음·5음(+옥타브)) |
| 결과 화면 | 일반 모드 클리어만 한 줄(정확도 `result_accuracy_value` 28 px + 점 아이콘, 최고 콤보 도넛·점 + 숫자 16 px). 새 기록이면 `cardTint` 4 px 밑줄 + 0.3 s 튐 + 기존 `new_best` 소리. 640×360은 클리어 버튼을 한 줄로 |
| 끄기 | `combo.enabled` false: 콤보 줄·판정 글·화음·결과 줄·카드 표지 없음(판정은 그대로 계산). `judge_pct.enabled` false: 이름·%·정확도만 없음 |
| 움직임 줄이기 | `prefers-reduced-motion`: 튐·모임·커짐·뜨기 없음, 표지 0.2 s 페이드인, 판정 글은 나타났다 0.15 s 페이드아웃 |
| 접근성 | 콤보 줄 `role=meter`·`combo_aria`·`aria-valuenow`·`aria-valuetext`(숫자만), 0~1이면 숨김. 10·20에서 `combo_mark_aria`를 `aria-live=polite`에 한 번. 레벨 카드 최고 콤보 표지는 **버튼 밖 형제 요소**(`.cell > .bcMark`, `role=meter`, `combo_best_aria`) |

### 소리 지연 (insights rhythm-01)
- `A.comp()`는 부를 때마다 `outputLatency + baseLatency`를 다시 읽음. 시도 시작마다 `prerollS()`·`startRun()`에서 부름(시도마다 새 값).
- 첫 시도 대기: `audio.pollLatency`가 매 프레임 자동 지연을 기록하고, `startLevel`은 오디오가 running이 된 뒤 0.25 s 이상 지났고 값이 0.25 s 동안 그대로일 때만 시작(최대 1 s 기다리면 그대로 시작). Edge headless 실측: 잠금 해제 직후 10 ms → 74 ms로 바뀌었고, 대기 뒤 첫 시도 `runComp` = 74 ms.

### 기획과 다르게(또는 기획에 없어서 정해서) 구현한 점
| # | 내용 | 이유 | 확인 역할 |
|---|---|---|---|
| D19 | 판정 글 표시 시간은 30-art 5-8-2 값(0.45 s: 60 ms 커짐, 0.30 s까지 유지, 0.15 s 사라짐). `balance.json combo.judge_pct.hud`(80 + 400 + 150 = 0.63 s)와 다름 | 요청자 지시대로 30-art 5-8 표시를 따름. balance hud 값은 쓰지 않음 | balance-designer·art-director (한 값으로 맞춰 주세요) |
| D20 | 연습 모드 클리어 화면에는 정확도·최고 콤보 줄을 띄우지 않음 | 30-art 5-8-4 "연습: 이번 시도 값만 보임"과 20-balance `accuracy.practice_mode` null·10-lore 5-9 "연습 모드 클리어 화면은 지금처럼"이 다름 → 데이터·문구 쪽을 따름 | art-director |
| D21 | (round-3 정리) round-2에 화면에 쓰지 않던 키 `result_accuracy`·`result_best_combo`·`result_new_best`·`best_accuracy_aria`와 `tut_final`은 10-lore 5-9 "뺀 키" 목록으로 옮겨져 `strings.json`에 없음(빌드 사용 0곳). `tut_final`을 쓰지 않는 이유(카드 1장 규칙의 예외, `level10_tag`·`clear_title_l10`·`clear_all`로 충분)도 10-lore에 있음. 이제 strings.json의 모든 키를 빌드가 씀 | 10-lore round-3 처리 결과 절 | lore-writer (처리 끝) |
| D22 | 레벨 카드 최고 콤보 표지 = 도넛(10마다 1개) + 작은 숫자, 장면 칸 하늘 오른쪽 | 30-art에 카드 표지 모양이 없음 | art-director |
| D23 | 640×360에서 콤보 줄 아래 끝(52 px)이 HUD 띠 1.2타일(43 px)보다 약 9 px 아래 | 진행도 바 아래 6 px + 도넛 1.8d(12.6 px) 규칙을 지키면 넘침. 튜토리얼 카드·버튼과는 겹치지 않음 | art-director |
| D24 | 판정 글 겹침 검사 범위: 글 상자 화면 x를 판정 순간 카메라로 월드에 옮기고 오른쪽을 0.45 s × 속도만큼 넓힘(그동안 글 밑을 지나갈 물체) | 30-art 5-8-2는 "겹치면"만 정함 | art-director |

### 자체 확인 도구
- `tools/combo-build-check.mjs`(새): S1 본문 같음, B1 봇 입력열(σ70·σ25, 시드 고정)을 node 기준(combo-ref)과 빌드 훅에 같이 넣어 시도마다 클리어·grades(i, k, e_ms, grade, pct)·combo·accuracy 비교, B2 완벽 입력, U1 화면(콤보 줄 aria, 판정 글, 결과 줄, 카드 표지 접근성 트리), U2 `combo.enabled`·`judge_pct.enabled` false(요청 가로채기). 서버를 8137에 스스로 띄우고 자기 PID만 종료.

## 13. round-3 빌드: 콤보 연출 강화 (2026-11-18)

보고서 `Docs/game-developer/2026-11-18-r3-build.md`. 근거: 오케스트레이터 결정 15~24(`Docs/orchestrator/2026-11-18-1-7-round2-gate-and-round3-decisions.md`), 30-art 5-8(체크리스트 5-8-9), 10-lore "round-3 텍스트 수정 처리 결과", 20-balance 16장.

### 데이터 (`tools/sync-data.mjs`)
- balance·levels(L2~L10 새 배치, `judge_taps` 고리 접촉 창)·strings(106키: 새 9 / 뺀 5 / 값 바뀜 4)·art(새 토큰 `comboFx1~4` 10레벨, `comboNum`, `judgePlate`)를 다시 옮김.
- 6절 "클리어" 행을 6절 안에서만 찾게 고침(5-8 표에도 `| 클리어 |` 행이 생겨 잘못 읽었음).
- 새 토큰이 빠지면 멈춤. 30-art 부록 A-2(콤보 층 대비·색약) 검사를 그대로 옮겨 sync 때마다 돌림: 13,204검사 실패 0(`art.json combo_contrast`).
- 부트 문구(`loading`·`load_error`·`aria_retry_load` 두 언어)를 `index.html` 인라인 `/*BOOT*/…/*/BOOT*/` 사이에 넣음.
- `music.json sfx.combo_mark`는 30-art 7-4 값(−23.5 dB, 단계 5·10·15·20 = 2·3·4·5음, `voice_norm`)으로 손으로 옮김.
- 폐기 키 `combo.dots_per_mark`·`small_pop_every`: 빌드에서 읽는 곳 0(데이터에는 balance 소유라 남아 있음).

### 표시 (30-art 5-8, 새 모듈 `js/combofx.js`)
| 5-8-9 # | 구현 |
|---|---|
| 1 | HUD 점 줄·도넛 DOM 삭제. `#combo`는 낭독용 meter 하나(`class="sr"`, 숨김은 `hidden` 속성만, aria-hidden 없음, `combo_aria`, valuetext 숫자만) |
| 2 | `R.draw` 훅: bg → 먼 배경 → 큰 숫자(`view.back`) → 콤보 파티클 → 바닥 → 기존 입자 → 오브젝트(문 먼저) → 플레이어 → 판정 글(`view.front`) → 종이 조각. D26 |
| 3~6 | `Hn` 가로 = H×0.14, 세로 = clamp(H×0.12, 28, 빈 띠) (D28). 숫자 칸 폭 고정(0~9 최대 폭), 라벨 `combo_label` max(14, 0.26Hn) 굵기 600, 단계 막대 4개(숫자 오른쪽, 0.14Hn 폭, 0.6Hn × 0.25~1), 블록 왼쪽 ≥ 플레이어 오른쪽 + 0.5타일(두 자리·1.30배 기준), 튐 1.15배 120 ms(`combo.hud`) · 단계 1.30배 220 ms, 기준점 블록 위 끝 가운데 |
| 7·8 | α 0.30 / 가까울 때 0.04, 흐림 상자(좌·상·하 +0.3, 우 +2.0타일) vs 위험·위 가시 + 매다는 막대·줄(게임 영역 위 끝까지)·블록 묶음·얇은 판·고리 1.2·문 캡슐·발판·플레이어(`R.objectsIn`), 0.10 s 내림 · 0.25 s 기다림 · 0.25 s 올림 |
| 9 | 튜토리얼 카드 상자와 겹치면 0.15 s에 α 0 |
| 10 | 끊김 0.3 s(0.85배 + α 0, 소리 없음), 클리어 0.2 s(숫자·파티클·판정 글) |
| 11·12·15 | 판정 글 테·그림자 없음, `judgePlate` α0.5 받침, 등급 색 3개, % `hud`. 아틀라스 하나(숫자 0~9·라벨·막대 5장·판정 6장·% 글리프 11개·파티클 점 10레벨 × 4색 × 3크기)를 로드 때 만들고 한 번 그림. 다시 만드는 때 = 화면 크기·dpr·HUD 높이가 바뀔 때만(테마가 바뀌어도 안 만듦). 프레임 안 `fillText`·`strokeText`·`measureText` 0. 시간 = `judge_pct.hud` 60/240/150 ms |
| 13·14 | 고리 탭 = 고리 중심 왼쪽 아래(min(플레이어 왼쪽 − 0.15, 고리 x − 0.75), 위 끝 = 고리 y − 0.1타일). 겹침 검사 = HUD 띠 + 판정 순간 앞쪽 물체(왼쪽 끝 > 플레이어 오른쪽)만, ① % 숨김 ② 왼쪽 0.5·1타일, 아래 0.25·0.5타일 ③ 등급 점만 |
| 16~18 | 파티클 풀 32(6절 48과 별도), 정사각형 `fillRect` 반 + 점 스프라이트 반, 단계 8/16/24/32개·`vy` 0.5/0.8/1.1/1.4타일/s·색 `comboFx1~4`, 새 8개 = 지면 위 0~1타일에서 vy×2.5(0.6 s), 기존 vy×1.5(0.4 s), vx = −0.2×속도, 수명 1.6~2.4 s(0.25 s 들어옴·0.4 s 나감). 영역 = HUD 띠 아래 + 0.1타일 ~ 지면(가로), HUD 아래 ~ 화면 끝(세로). 색별로 묶어 `fillStyle` ≤ 4번. 움직임 줄이기면 0개 |
| 19 | 단계 화음 5·10·15·20, −23.5 dB, 음 gain (1/3)·√(3/음 수) (D25) |
| 20 | 결과 줄 최고 콤보 = 막대 16 px + 숫자 22 px + 라벨 14 px α0.8, 연습 모드는 결과 줄 없음(기존 D20) |
| 21 | 레벨 카드 칩: 18 px 둥근 사각, 바탕 레벨 bg α0.8, 테 hud 1.5 px, 막대 10 px + 숫자 14 px, 장면 칸 하늘 오른쪽(버튼 밖 형제, `combo_best_aria`) |
| 22 | L10 카드 해 = `card-sun.svg` 그대로(오브젝트 높이 < 28 px면 빛살 3개·굵기 9) |
| 23 | 문 캡슐 안 그 프레임 배경색(펄스 값) 불투명 깔기 + 문을 오브젝트 중 맨 먼저 |
| 24 | sync-data 새 토큰 확인 + 부록 A-2 통과 |
| 25·26 | `tools/dev-perf-r3.mjs`, `tools/dev-r3-check.mjs` (아래) |

### 텍스트·접근성 (10-lore round-3 처리 결과)
- `index.html` 영어 고정 aria 6곳(캔버스·일시정지·뒤로 2·허브·회전 닫기)을 지우고 `aria_*` 키로 설정. ↻ 다시 불러오기 = `aria_retry_load`. 음악 버튼 = `aria_music` + `aria-pressed`(켜짐 true).
- 부트 인라인 스크립트가 `?lang=` → `navigator.language` 규칙으로 `<html lang>`과 불러오기 문구·↻ 이름을 정함(영어 고정 "Load error" 없음).
- `titleAlt`에 다른 언어 `lang`. 시도 1회 클리어는 `clear_attempts_one`.
- 박자 보정 테스트: 시작 전에 자동 지연 안정 대기(`latencyStable`, 최대 1 s) + 탭마다 그 순간 `autoLatency()`로 들리는 박 계산(테스트 도중 지연이 바뀌어도 이중 보정 없음). 저장 규칙(새 보정 = 들리는 박 대비 사람 차이)은 round-2와 같음.

### 성능 (결정 22)
- 판정 글: stroke 없는 아틀라스 `drawImage`(이름 1장 + % 글리프 2~4장).
- 레벨 시작: HUD 아래 끝·튜토리얼 카드 상자를 로드 때 미리 잼(레벨 시작 프레임의 강제 레이아웃 제거). 6배 프로파일에서 `loadLevel` 91 → 19 ms.
- 첫 탭: AudioContext를 로드 때 멈춘 상태로 만들고 첫 탭은 `resume()`만(D27). 잡음 버퍼는 첫 탭 밖에서.
- 메뉴: 레벨 카드를 로드 때 만들고 내용·크기가 같으면 다시 만들거나 재지 않음, 카드 배치는 읽기 → 쓰기 순서(강제 레이아웃 1번), 레벨 선택·설정 화면은 숨길 때 `content-visibility: hidden`(그리기 상태 유지), 별 SVG를 카드당 1장으로, 자물쇠 `drop-shadow` 필터·설정 패널 흐림 그림자 제거.

### 기획과 다르게(또는 기획에 없어서 정해서) 구현한 점
| # | 내용 | 이유 | 확인 역할 |
|---|---|---|---|
| D25 | 화음 음 하나 gain = (1/3)·√(3/음 수) × 10^(db/20). 30-art 5-8-6 식 "10^(db/20) × √(3/음 수)"에 1/3을 곱함 | round-2 빌드는 음 하나 = 1/음 수였고 −23.5 dB 보정(렌더 차 3.5 dB)은 그 기준. 30-art 식 그대로면 3음 화음이 round-2보다 9.5 dB 커져 −20 dB 목표를 크게 넘음. 3음 = round-2와 같은 크기, 음 수가 늘어도 크기 같음 | art-director (QA 렌더로 −20 ±1 확인) |
| D26 | 바닥을 오브젝트 전에 그림(기존 그대로), 판정 글은 클리어 판 뒤가 아니라 플레이어 바로 위·종이 조각 아래 | 5-8-0 순서의 "오브젝트 → 바닥"은 바닥 외곽선이 가시 밑을 덮어 모양이 바뀜. 클리어 판은 플레이어보다 아래(달려 나가는 플레이어가 보여야 함)라 그 뒤에 판정 글을 둘 자리가 없음. 판정 글은 클리어 0.2 s에 사라져 결과는 같음 | art-director |
| D27 | AudioContext를 로드 화면 뒤에서 만들어 둠(멈춘 상태). 첫 탭은 resume만 | 6배 스로틀에서 첫 탭 안 생성자만 160~200 ms(메뉴 전환 ≤ 100 ms 실패 원인). 멈춘 상태라 소리·콘솔 경고 없음(Edge headless 확인), 첫 탭 전에는 소리를 내지 않음(자동 재생 규칙 그대로) | qa-engineer |
| D28 | 세로 모드 `Hn`의 "빈 띠" = HUD 띠 아래 끝 ~ `gameTop`(30-art는 `gameTop`까지 전체로 계산) | 360x640에서 H×0.12 = 77 px를 쓰면 숫자가 둘째 줄 진행도 바 뒤로 올라감. HUD 글과 겹치지 않게 빈 띠를 줄임(360x640 `Hn` 약 61 px, 412x915는 110 px 그대로) | art-director, ux-reviewer |
| D29 | 판정 글 받침 폭 = max(이름, "100%") 고정, 겹칠 때 ② 다음에 아래로 0.25·0.5타일 시도. ③ 등급 점은 이름 그림의 점 줄을 잘라 씀 | % 숫자 길이에 따라 받침 폭이 흔들리지 않게. 30-art "왼쪽 최대 1타일, 그래도 안 되면 아래로 최대 0.5타일" | art-director |
| D30 | 큰 숫자 블록 상자의 위 끝 = 숫자 칸 위 끝(글자 위 여백 약 0.06×글꼴 크기 포함) | 아틀라스 칸 기준. 화면상 글자 위 끝은 표 값보다 수 px 아래 | art-director |
| D31 | 판정 글 생략률 측정: 훅 `judgeStats`(입력 종류별 판정 수·③ 수·% 숨김 수), `resetJudgeStats()` | 결정 19 자체 측정·QA용 | qa-engineer |
| D32 | 레벨 카드 지면 띠 윗면에 최고 진행도 막대(`outline` 색 3 px, 폭 = 최고 %, 글 없음). score S13 | 30-art에 모양이 없어 개발이 정함(글 없는 진행도, insights 레퍼런스 감각 절) | art-director, ux-reviewer |
| D33 | 타이틀 "누르면 소리가 나요"에 어두운 받침(α0.6, score S28) | 밝은 바닥 띠 위 흰 글 대비. 30-art에 값 없음 | art-director |
| D34 | 세로 360x640 게임 띠 크기(score S31·UX4)는 바꾸지 않음(1타일 = 너비 ÷ 14) | 30-art 5절 확정(앞을 보는 시간 우선). 바꾸면 기획 변경이라 art 결정 필요 | art-director, ux-reviewer |

### 해소된 이전 항목
- D19: `balance.json judge_pct.hud`가 60/240/150 ms(0.45 s)로 맞춰짐 → 빌드는 이제 balance 값을 읽음.
- D22: 카드 표지 = 30-art 5-8-8 칩. D23: 점 줄이 HUD에서 빠져 해소. D24: 오른쪽 확장 검사 폐기(5-8-2).
