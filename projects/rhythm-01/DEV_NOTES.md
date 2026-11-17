# DEV_NOTES: rhythm-01 (똑딱북: Tickadrum) 웹 빌드

- 작성: game-developer, 2026-11-17 (1-3 round-1 빌드)
- 빌드: `games/rhythm-01/` (정적 파일만, 외부 요청 0). 실행은 정적 서버가 필요합니다(`fetch`로 data를 읽어서 `file://`로는 열리지 않음): `node projects/rhythm-01/tools/serve.mjs` → `http://localhost:8133/games/rhythm-01/`

## 구조

| 파일 | 내용 |
|---|---|
| `js/judge.js` | `tools/sim/judge.mjs` **복사본**(빌드 스크립트가 복사). 판정 창·놓침 구역·미리 보기 시각·등급을 기준 구현 그대로 씀 |
| `js/engine.js` | 한 레벨 플레이(`Run`): 탭 하나씩 판정, 놓침, 실패 → 1.08 s 뒤 자동 재시작, 연습 체크포인트, 클리어·끝, 밀림 감지(drift_check). DOM·오디오 없음 (node에서 그대로 돌아감) |
| `js/audio.js` | WebAudio 합성(30-art 12-4 표 → `data/sound.json`), 오디오 시계 예약(lookahead 0.1 s, 25 ms 타이머), 곡 이벤트 생성(12-1 마디별 파트) |
| `js/render.js` | 캔버스 그리기(궤도·별·공·북·북채·판정 이펙트·실패 연출·클리어 물듦·HUD·보정 화면) |
| `js/calib.js` | 보호자 보정 계산(회 IQR·두 회 차이·12탭 중앙값·30 ms 문턱·자름) |
| `js/main.js` | 화면 흐름, 입력, 시계, 저장, 보호자 문, 소리 늦음 표지, 테스트 훅 |
| `js/store.js`, `js/ads.js` | localStorage, 광고 어댑터(웹 더미) |
| `data/` | `projects/rhythm-01/tools/build-web-data.mjs`가 생성. balance·levels·palette는 복사, strings는 10-lore 7절 표, music은 30-art 12-5 표를 파싱, sound·art는 30-art 12-4·4~10절 값을 스크립트에 옮겨 적은 것 |

데이터를 바꾸면 `node projects/rhythm-01/tools/build-web-data.mjs`를 다시 돌립니다. 코드에는 수치·문구·색이 없고 data만 읽습니다(아래 "코드에 남은 상수" 참고).

## 시계와 지연 보정 (결정 9, 20-balance 8-1)

- 게임 시계 V(ms) = 오디오 시계(ms) − 보정값. 보정값 = `outputLatency + baseLatency`(자동) + 수동 오프셋(보호자 보정).
- 레벨 시간 = V − (그 시도 곡 시작). 소리는 레벨 시간 x를 오디오 시각 (곡 시작 + x)에 예약하고, 화면은 V로 그리므로 **공은 들리는 시각에 맞춰 돕니다**(수동 오프셋까지 포함).
- 탭: `pointerdown`의 `event.timeStamp`를 오디오 시간으로 바꿔 같은 식으로 빼서 판정합니다. 변환은 프레임마다 잰 `currentTime − performance.now()` 차이(오디오 블록 단위로 늦게 올라가는 값이라 최근 최댓값을 씀)로 합니다.
- **다르게 한 점 D1**: balance 8-1은 `getOutputTimestamp()` 대응을 적었지만 쓰지 않았습니다. 그 값은 이미 "지금 스피커에서 나오는 시각"이라 outputLatency를 한 번 더 빼면 이중 보정이 됩니다. `currentTime` 매핑 + 지연 빼기가 balance 판정 식과 같은 결과를 냅니다.
- 검증: Playwright 실제 마우스(CDP 입력)로 별 시각 8 ms 전에 누른 탭의 판정 오차가 −2 ~ −7 ms(레벨 1·2, 44개). 프레임 시각과 무관하게 timeStamp로 판정합니다.
- **D2 실시간 놓침 여유 20 ms**: rAF 루프는 통과 창 끝 + 20 ms가 지나야 놓침을 선언합니다(입력 이벤트가 프레임 뒤에 처리되는 경우 대비). 실패 시각과 1.08 s 재시작 시각은 통과 창 끝 기준 그대로이고, 실패 연출 첫 20 ms만 늦게 보일 수 있습니다. 테스트 모드는 여유 0.

## 기획과 다르게(또는 기획에 없던 부분을 정해서) 구현한 점

| # | 내용 | 이유 / 확인할 역할 |
|---|---|---|
| D3 | 레벨 시작(처음·다시·일시정지 복귀) 전 0.4 s 동안 공이 12시에 멈춰 있다가 카운트인 시작 | 오디오 예약 여유. 실패 뒤 재시작은 기획대로 1.08 s 정확 (benchmark·balance) |
| D4 | 일시정지 → 계속: 이번 시도의 시작점(일반 = 레벨 처음, 연습 = 현재 깃발)부터 카운트인으로 다시 시작, 시도 수는 늘리지 않음. 실패 연출 중에 멈췄으면 그 재시작은 시도로 셈. 모든 별을 친 뒤(outro)에 멈췄으면 바로 결과 화면 | 리듬 게임 특성상 멈춘 자리에서 이어 치기 어려움 (balance) |
| D5 | 레벨 선택 카드: 120×132 상한에서 화면에 맞춰 줄임(최소 100×104), 열 수 자동(360x640 = 3열, 640x360 = 5열 × 2줄, 스크롤 없음). 카드 = 위쪽 시작 버튼 + 아래 48×48 버튼 줄(왼쪽 그림 카드 다시 보기, 오른쪽 연습 깃발). 터치 영역이 겹치지 않게 나눔 | art 5-6은 "카드 나머지 영역 탭 = 시작"이지만 겹치는 터치 영역을 피함 (art) |
| D6 | 그림 카드 다시 보기 버튼 그림 = 그 카드 그림의 축소판 | art 5-7에 아직 없음 (art) |
| D7 | 레벨 선택 → 타이틀 "뒤로"(`btn_back`) 버튼 = "다음" 화살표 좌우 반전, 오른쪽 위 | 아이콘 미정 (art) |
| D8 | 결과 버튼 3개: 세로 화면 = 엄지 받침 가운데, 가로 화면 = 궤도 아래 공간이 64 px보다 좁으면(640x360) 오른쪽 세로 줄. `clear_title`은 세로 = 받침 위쪽, 가로 = 왼쪽 | 640x360에서 궤도 아래 25 px뿐 (art 8-2) |
| D9 | 보정: 첫 실행 건너뛰기 = 수동 오프셋 0(`on_skip`), 설정에서 연 보정의 건너뛰기 = 이전 값 유지. 첫 박보다 반 박 넘게 이른 탭은 세지 않음. 보정 탭 소리 = 무시 탭 "톡". 끝 체크 표시 1 s 동안 "다시 맞추기" 버튼(`calib_redo`)이 가운데 아래에 보임(그 뒤 자동으로 넘어감, 설정의 박자 맞추기 줄이 주 경로) | 화면 규칙에 없는 부분 (balance·art) |
| D10 | 멜로디 자리 표시: 30-art 12-5 규칙(근음3×2, 5음 음계, 자리 0·4, 별 자리면 반 박 앞) + 음 순서 `degree_walk` [0,2,4,2,1,3,4,0]을 마디마다 돌림(제가 정한 값, `data/music.json`). 레벨 10 "O + X"는 두 악기 번갈아. 베이스 = 근음3÷2 박 1·3, 패드 = 근음3 1·3·5도 마디마다. 카운트인 "마지막 박 패드 부풀기" 생략 | 동기는 art가 1-3 라운드에서 채움 (art) |
| D11 | 소리 켜기/끄기(`btn_sound_on/off`) = 마스터 음소거(타이틀 오른쪽 위·멈춤 화면 오른쪽 위). 그림 = 30-art 5-7 "음악 / 음악 끔" 재사용. 설정의 음악·효과음 토글은 버스별 | lore 7-8 "놓을 곳은 art" (art) |
| D12 | 불러오기 화면은 문자열을 읽기 전이라 글 없음, 실패하면 ↻ 버튼만 | `loading`·`load_error` 키는 로드 뒤에만 쓸 수 있음 (lore) |
| D13 | 손가락 튜토리얼(레벨 1 `cues`)은 그 레벨 플레이(레벨 선택에서 들어온 한 번) 안에서 첫 별을 한 번 맞힐 때까지 시도마다 나옴. `tut_tap` 글은 세로 = 엄지 받침 위쪽, 가로 = 손가락 위 | balance `hide_after: first_star_judged`의 범위 해석 (balance·lore) |
| D14 | 연습 체크포인트는 그 쉬는 마디 시작을 지나고 앞 별이 모두 처리됐을 때 갱신. 연습 모드 진행도 막대는 별 기준으로 채우고 최고 기록 점은 숨김(최고 기록은 일반 모드만) | balance 6-5 해석 |
| D15 | 밀림 감지 표본: 맞힌 별 = 그 탭의 오차, 놓친 별 = ±300 ms 안 가장 가까운 탭(실패 연출 중 늦은 탭 포함). "시도 3번 이상" = 이번 레벨 플레이 안의 시도 수 | balance 8-5 해석 |
| D16 | "소리가 늦어요" 표지의 세션 = 페이지 로드 1회. 조건(A 오프셋 > 100 / B 자동 지연 ≥ 100·보정 때보다 40 넘게 바뀜·출력 기기 바뀜 / C 밀림)이 바뀌면 세션 수를 0으로. 출력 기기 바뀜 = `mediaDevices` `devicechange`(보정한 적 있을 때만). 보호자 보정이 끝나면 C·기기 바뀜 해제 | balance 8-5 해석 |
| D17 | 그림 카드 뒤 바탕은 정지 궤도(공·12시 별), 화면 아무 곳 탭으로 닫힘(메뉴 탭 소리), 바로 카운트인 | art 9절 |
| D18 | 보정 화면 aria 키는 lore 확정 `calib_with_grownup`을 씀(30-art 10-3의 제안 이름 `calib_together` 아님) | lore 우선 |
| D19 | `sound.json`·`art.json`은 30-art 표를 빌드 스크립트에 옮겨 적은 값(표를 직접 파싱하지 않음). 30-art 12-4·4~10절을 바꾸면 `build-web-data.mjs`의 `SOUND`·`ART`도 같이 바꿔야 함 | 표 형식이 사람용(괄호·설명 섞임) |

## 코드에 남은 상수 (기획 값이 아닌 구현용)
- `START_LEAD_MS` 400 (D3), `REALTIME_GRACE_MS` 20 (D2), 오디오 lookahead 0.1 s·타이머 25 ms(30-art 12-6 값과 같음), 시계 매핑 감쇠, 보정 점 비우기 0.2 s, 테스트 모드 step 4 ms 단위.
- 메뉴 화면 글자 크기·여백(CSS). 색은 모두 palette.json에서 CSS 변수로.

## 데이터 문제 (수정하지 않고 기록)
- 30-art 11절·12-5 표의 BPM 문구는 1-2 기준 표현이 남아 있음(빌드는 levels 파일 BPM만 씀, 요청 지시대로).
- 30-art 10-3은 aria 키를 `calib_together`(제안)로 적음 → lore 확정 `calib_with_grownup` 사용(D18).
- 레벨·balance 데이터 문제는 찾지 못함. `verify-levels.mjs --quick` 빌드 전후 ALL PASS.

## 테스트 훅 (`window.__game`)

| 이름 | 설명 |
|---|---|
| `ready`, `test` | 데이터 로드 끝 / `?test=1` 여부 |
| `state` | `loading` `title` `calib` `levels` `settings` `confirm` `card` `play` `pause` `result` |
| `phase` | 플레이 중 시도 단계: `run` `fail`(실패 연출 1.08 s) `clearing`(마지막 별 친 뒤 통과 창 끝까지) `cleared`(outro 연출) `done` |
| `levelIndex`, `practice`, `progress`(0~1, 판정 별 기준), `attempts`, `best`, `grade` | |
| `loadLevel(i, {practice, card})` | 레벨 바로 시작(기본 카드 안 띄움, `card:true`면 첫 플레이 카드 규칙대로) |
| `step(dt)` | 테스트 모드에서 게임 시간 dt 초 진행(4 ms 단위로 판정·재시작 처리). 일반 모드는 false |
| `press()`, `release()` | 지금 시각에 탭 / 아무 일 없음(탭 1가지) |
| `pressAt(levelMs)` | 테스트 모드: 레벨 시간 levelMs까지 진행한 뒤 탭. 반환 `{kind: perfect/good/pass/stray/early/late}` |
| `autoplay(offsetMs=0, sigma=0, seed=1)` | 완벽 입력열(+오프셋, 정규 오차 σ) 재생. 테스트 모드 = 동기 실행 후 결과, **일반 모드 = rAF 루프에서 실제 `PointerEvent`를 별 시각에 맞춰 캔버스로 보내고 Promise(결과)** |
| `stars()`, `perfectTaps(off)` | 판정 별 목록(레벨 시간 ms, 통과 창·놓침 구역) / 완벽 입력열 |
| `levelTime()`, `gameClock()`, `audioTime()`, `nextStarPerfTime()` | 현재 레벨 시간 / 게임 시계 V / `AudioContext.currentTime` / 다음 별의 `performance.now()` 기준 시각(외부에서 실제 입력을 넣을 때) |
| `judgeLog()`, `history()`, `summary()` | 이번 시도 판정 `{i, e, grade}` / 지난 시도 결과 / 요약 |
| `setOffset(ms)`, `offset`, `latency()` | 수동 오프셋 설정·조회, `{auto, manual, comp}` |
| `show(name)` | `title` `levels` `settings` `calib`(첫 실행) `calibRedo` `pause` `confirm` |
| `calibTap(diffMs)`, `calibSimulate(rounds)`, `skipCalibration()` | 보정 화면에 (탭−박) 값 넣기 / 보정 계산만 / 보정 건너뛰기 |
| `lateHint()`, `save()`, `layout()`, `ads` | 표지 상태 / 저장값 / 화면 배치 / 광고 어댑터 |

`?test=1`: 오디오를 만들지 않고 게임 시간은 `step`으로만 갑니다. 화면 그리기는 일반 모드와 같은 코드입니다(랜덤 연출 없음). `?lang=en`으로 영어.

## 자체 확인 도구
- `node projects/rhythm-01/tools/selfcheck-sim.mjs`: 엔진 ↔ judge.mjs 대조(10레벨 × 완벽·무입력·박마다·σ25~90 봇 800세트), 재시작 1.08 s, 연습 체크포인트, 밀림 감지, 보정 계산.
- `PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/rhythm-01/tools/selfcheck-browser.mjs [--quick] [--out 폴더]`: 설치된 Edge(`--channel msedge`)로 테스트 모드 10레벨, 일반 모드 실시간 10레벨(오디오 켜짐), 실제 마우스 레벨 1·2, 4해상도 화면 스크린샷·버튼 검사, 저장 유지, 보호자 문, 백그라운드 일시정지.
