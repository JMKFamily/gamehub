# DEV_NOTES: runner-01 (Reverbound) 웹 빌드

작성: game-developer, 2026-11-17 (1-3 웹 빌드) · 갱신: 2026-11-17 round-2 빌드 (레벨 10개, round-1 이슈 처리, 9~10절)

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
  data/           sync-data.mjs가 만든 파일 + music.json(손 작성) + provisional-art.json(개발 임시값 표, 9절)
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
| 수치 | `balance.json` | `data/balance.json` | 그대로 복사 |
| 레벨 | `levels/*.json` | `data/levels/*.json` | `balance.json levels` 순서 |
| 문자열 | `10-lore.md` 5절 표 | `data/strings.json` | round-2: 키 90개 + 사망 문구 4(표시 안 함) + 클리어 부제 4. 언어는 `?lang=` → 없으면 `navigator.language`(ko로 시작하면 한국어, 아니면 영어) |
| 색 | `30-art.md` 2-1 표(머리줄의 levelN 열 전부), 2-2 공통, 2-2-1 `cardTint`, 6절 클리어 행 + **`data/provisional-art.json`(레벨 4~10 임시값)** | `data/art.json` | 30-art에 없는 레벨만 임시값으로 채움. 대비 27쌍(부록 A + 카드 테두리 3:1)을 sync-data가 검사, 실패하면 멈춤. `art.json provisional`에 레벨별 임시 항목 목록 |
| 음악·효과음 | `30-art.md` 7절 | `data/music.json` | **손으로 옮겨 적은 파일**. round-2: 7-4 반영 목록 적용. 레벨 4~10 곡은 `provisional-art.json music`에서 게임이 로드 때 파생(`audio.js deriveTheme`) |
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
| D3 | 느림 템포 문 하프타임을 느림 속도 구간 전체에 적용. round-2: 레벨 1~3에는 속도 문이 없어 `level3.slow` 삭제(7-4), 레벨 8~10 임시 곡에 부록 B-6 하프타임(`slow_default`) 적용. 빠른 문의 "햇 16분 + 리드"(B-6)는 아직 안 함(intensity 규칙만) | 부록 B-6 | art-director |
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

## 9. 레벨 4~10 임시값 (art-director 확정 전, round-2)

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
