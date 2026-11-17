# rhythm-02 개발 노트 (game-developer)

웹 빌드 `games/rhythm-02/`의 구조, 기획과 다르게 하거나 기획에 없어서 정한 점, 도구 사용법입니다. 기획 문서가 정답이고, 아래 "다르게 한 점"은 해당 역할 리뷰에서 확인받을 항목입니다.

## 1. 구조

| 파일 | 내용 |
|---|---|
| `games/rhythm-02/index.html`, `style.css` | 화면 틀. 색은 CSS 변수(부트 블록·`setTheme`가 palette.json 값으로 넣음) |
| `js/judge.js` | `tools/sim/judge.mjs` **그대로 복사**(빌드 스크립트). 판정·궤적·손가락·재시작 배분 전부 이 파일 |
| `js/music.js` | `tools/art/music.mjs` 그대로 복사(곡 음 시작 규칙) |
| `js/core.js` | 시도 하나의 진행(`Attempt`): 탭이 올 때마다 `judgeAttempt(L, 지금까지 탭)`을 다시 불러 결과를 얻고, 고정 스텝 틱이 늦음 실패 시각을 지나면 실패. 연습 체크포인트(`checkpoints`·`checkpointFor`), 바탕 단계(`stageAt`). DOM 없음(node에서 import) |
| `js/calc.js` | 소리 맞추기(`syncRound`·`syncResult`)·밀림 감지(`driftFeed`) 계산. DOM 없음 |
| `js/layout.js` | `layout.json` 화면 식(`tools/art/layout.mjs compute`와 같음, selfcheck G1로 대조) |
| `js/render.js` | 캔버스 그리기(공·북·그림자·구름·바닥·실루엣·튐 선·바람선·손가락·↻·등급 칸·HUD) |
| `js/audio.js` | `sound.json _synth` 규칙대로 WebAudio 합성, 화면 시계에 맞춘 예약 |
| `js/main.js` | 화면 흐름·입력·시계·테스트 훅 |
| `js/store.js`, `js/ads.js` | localStorage(try/catch), 광고 더미 어댑터 |
| `data/` | `build-web-data.mjs`가 만듦(손으로 고치지 않음) |

데이터 빌드: `node projects/rhythm-02/tools/build-web-data.mjs` — balance·levels·palette·layout·sound·strings 복사, 아이콘·카드 SVG 복사(주석 제거), `tools/art/cards.mjs`의 `levelCard`·`miniCloud`·`flag`로 레벨 카드 그림·등급 칸 생성, judge.mjs·music.mjs 복사, index.html 부트 글(loading·load_error·load_error_detail·btn_retry·title) 삽입.

## 2. 시계·판정 (기획 그대로 + 구현 결정)

- 판정 = 화면 시계: `tapToLevelMs(event.timeStamp, 레벨 시간 0이 그려진 performance 시각, bal)` = 탭 − 시작 − `visual_comp_ms`(40) 한 번. 오디오 지연은 판정에 안 들어감.
- 곡: 레벨 박 b의 음은 performance 시각 `시작 + b·박` 에 들리도록 오디오 시각 = (performance→AudioContext 차이, currentTime 표본) − (outputLatency + baseLatency) − 보호자 오프셋 으로 예약. `getOutputTimestamp`는 쓰지 않음(이중 보정 방지, insights).
- 아이 탭 소리는 `pointerdown` 처리 안에서 판정 직후 `start(지금)`(추가 지연 0), 북 톡도 같은 처리에서 시작(다음 프레임에 보임).
- 고정 스텝 4 ms 틱(로직: 늦음 실패 선언, 클리어 연출 시각, 재시작 전환), 그리기는 rAF 시각 그대로 `ballsAt(L, t, hits)`로 계산(궤적이 시간의 함수라 보간이 정확한 값).
- **늦음 실패 선언 유예 34 ms(2프레임)**: 탭 이벤트는 프레임 정렬로 늦게 배달될 수 있어, 판정 시계가 통과 창 끝 + 34 ms를 지난 틱에 선언. 실패 시각 자체는 판정 값(통과 창 끝)이고, 재시작은 그 값에서 1.1 s라 연출·재시작 시간에는 영향 없음.
- **실패 순간(performance) = 시작 + failTimeMs + visual_comp_ms**: 늦음 = 통과 창 끝, 일찍 = 그 탭이 들어온 순간. 다음 시도 첫 프레임 = 그 + `restart_delay_s` 1.1 s(정확히 그 시각 이후 첫 rAF).
- 시도 진행은 매 탭마다 `judgeAttempt`를 다시 부르는 방식이라 빌드 판정이 시뮬레이터와 구조적으로 같음(selfcheck-sim C1: 봇 탭 2만 회 불일치 0, selfcheck-browser: 빌드 시도 기록 전부 node 재판정 불일치 0).
- 연습 체크포인트: 실패한 접촉 앞의 마지막 받침 쉼(구절 시작). 앞 구절 접촉은 "접촉 시각에 친 탭"으로 넣어 같은 `judgeAttempt`로 이어 판정(`Attempt({fromMs, carried})`). 재시작 시간은 일반과 같은 1.1 s.

## 3. 기획과 다르게 하거나 기획에 없어 정한 점 (리뷰 확인 필요)

| # | 내용 | 이유 | 확인 역할 |
|---|---|---|---|
| N1 | 메뉴 화면 바탕색 = 그 레벨 테마 `bg1`(레벨 선택은 level01). 목업의 `#F4F1EA`는 palette.json에 없어 쓰지 않음 | 색 하드코딩 금지 | art |
| N2 | 레벨 시작 판의 레벨 이름은 화면 글 없이 aria만(목업 `mockup-level-start.svg` 표시대로). 30-art 11-1 "화면 글은 레벨 시작 판·클리어 결과"와 다름 → 클리어 결과에만 화면 글 | 목업이 더 최근(1-2 icons.mjs) | art·lore |
| N3 | 연습으로만 깬 레벨도 다음 레벨을 엶. 레벨 선택에는 연습 깃발을 그리지 않고 aria 상태 `practice_clear`만 | D14(연습 기록 표시 없음)와 아이가 막히지 않게 | balance·lore |
| N4 | 클리어 제목: 등급 n → `clear_title_n`, 연습 클리어 → `clear_title_1`, L10 → `clear_last` | lore "돌려 쓰고"의 구체 규칙이 없어 등급과 묶음 | lore |
| N5 | 결과 화면 배치: 등급 칸 줄(큰 구름 바로 아래) 밑에 레벨 이름 → 제목 → 버튼. 목업(결과 글이 맨 위)과 달리 HUD·큰 구름과 겹치지 않게 아래로 | 플레이 화면 위에 그려서 구름과 겹침 | art |
| N6 | 등급 칸(플레이 클리어) 크기 = 0.9d × 1.4, 간격 1.35배. 30-art "0.9d 너비"는 640x360(d 24)에서 22 px라 너무 작아 1.4배 | 레벨 선택 칸(18 px)보다 커야 읽힘 | art |
| N7 | 그림 카드 표시 배율의 화면 여백 16 px는 layout.json에 없어 cards.mjs `CARD.screenMargin` 값과 같게 코드에 둠(글 줄 28 px는 `layout.json text_slots.text_line_px`) | layout.json 에 키 없음 | art |
| N8 | 결과 화면 "다음"은 레벨 시작 판을 거치지 않고 바로(새 기믹이면 카드 먼저) | D18은 레벨 선택에서 들어올 때의 판 | art |
| N9 | 멈춤에서 "이어 하기"는 멈춘 레벨 시간 그대로 이어감(되감기·준비 박 없음) | 기획에 규칙 없음. 아이에게 이른지 리뷰 필요 | balance |
| N10 | `audio_unlock` 글은 레벨 시작 판에서 오디오가 멈춰 있을 때만(첫 탭이 타이틀이라 보통 안 보임) | 쓰는 자리 | lore |
| N11 | 소리 맞추기: 박 소리는 **오프셋 없이**(자동 지연만) 예약해 절대값을 잼 → 오프셋 = 12탭 중앙값(탭 − 들린 박) − visual_comp, \|값\| ≤ 30이면 0, [-100, 300] 자름. 재시도 1번은 "그 회 IQR" 다시와 "두 회 차이" 다시가 같은 예산을 씀 | balance 문장을 이렇게 읽음 | balance |
| N12 | 밀림 감지 "세션" = 페이지 불러오기 1번. 켜진 뒤 불러오기마다 +1, 3을 넘으면 꺼짐. 출력 지연 변화 비교 기준(`latRef`)은 처음 잰 값 → 소리 맞추기 끝날 때 갱신 | 정의 구체화 | balance |
| N13 | 첫 실패 ↻ 그림 = 그 레벨을 들어와 처음 실패한 시도에만(레벨을 다시 고르면 다시 1회) | "처음 실패한 그 시도" 해석 | art |
| N14 | 실패 연출 경로 세부(늦음: 0.45 s 중 45 % 가죽 위 굴러 끝까지 → 30 % 떨어짐 → 나머지 바닥 구름, 일찍: 포물선을 이어 바닥까지 압축 + 0.2 s 구름, 공이 가죽 높이를 지날 때 이미 북 옆) | 30-art는 길이·방향만 정함 | art |
| N15 | 공 2 들어옴: 들어옴 구간 중 `hopFrom` 전까지 바닥을 굴러 북 오른쪽 옆(+0.6d)까지, 그 뒤 깡충. 나감: 30 % 가죽 위 굴러 끝 → 20 % 떨어짐 → 50 % 바닥 굴러 화면 밖 | 배분 세부 | art |
| N16 | `?test=1`에서 `press()`는 "지금 화면 시각에 이벤트가 들어옴"(판정 = 지금 − 40 ms). 접촉 시각에 정확히 치려면 `pressAt(판정 ms)` | 일반 모드와 같은 판정 식을 그대로 씀 | qa |
| N17 | 레벨 선택 카드 크기: 세로 2열×5행, 가로 5열×2행, 화면에 맞춰 줄임(360x640에서 카드 약 80×83, ≥ 48) | 30-art 11-1은 640x360 값만 | art |
| N18 | HUD 진행도 막대·점·깃발은 캔버스에 그리고, 대체 글은 숨은 `progressbar`·`meter`(aria-valuenow만, 값이 바뀔 때만 DOM 쓰기) | 10-lore 6절 4 | lore |
| N19 | 클리어 뒤 HUD 0.2 s 페이드에 캔버스 globalAlpha 사용(전환 중에만, 정지 화면에는 투명도 없음) | 30-art 7-3 | art |

## 4. 안 쓰는 문구 키 (criteria 세계관 절)

| 키 | 이유 |
|---|---|
| `settings_reset`, `confirm_reset`, `confirm_yes`, `confirm_no` | 결정 D17: 기록 지우기는 이번 범위 밖 |
| `store_short` | 스토어 문구(출시 단계) |
| `levels_screen` | 화면 글로 쓰지 않고 레벨 격자의 aria-label로만 씀(글 없는 레벨 선택) |

그 밖 키는 모두 화면 글·aria에 씀(`aria_play_area` = 놀이 캔버스 대체 글). `loading`·`load_error`·`load_error_detail`·`btn_retry`·`title`은 빌드 스크립트가 index.html 부트 블록에 넣음.

## 5. insights 적용

| 항목 | 적용 |
|---|---|
| 1프레임 반응·결정론(runner-01) | pointerdown 즉시 판정·소리·북 톡, 궤적은 시간의 함수(프레임 수 무관) |
| 재시작 약 1.1 s 자동(runner-01) | 1.1 s 고정, 확인 버튼 없음. 실측 1.10~1.12 s(selfcheck) |
| 실패 글 없음·첫 실패만 ↻(runner-01) | 그대로 |
| 연습 자동 체크포인트(runner-01) | 받침 쉼마다 자동, 버튼 없음, 부활 1.1 s |
| 진행도 막대(runner-01) | HUD·레벨 선택 모두 막대 + 공 색 점 |
| WebAudio 이중 보정 금지(rhythm-01) | getOutputTimestamp 안 씀, currentTime↔performance 차이 + 자동 지연 한 번 |
| 보호자 길게 누르기·밀림 표지(rhythm-01) | 1.5 s 가로 막대, 표지는 레벨 선택·보호자 화면만, 소리 맞추기 화면 그림은 박에 맞춰 움직이지 않음 |
| 첫 그림 미리 그리기(rhythm-01·runner-01) | 로딩 뒤 오프스크린 캔버스에 10레벨 장면(앉음·비행·납작·튐 선·실패·↻·클리어·등급 칸·연습 깃발·손가락·HUD) 한 번씩 그리고 카드·레벨 카드 SVG decode, 오디오 잠금 해제 때 모든 소리를 소리 0 버스로 한 번 합성 |
| HUD DOM은 값이 바뀔 때만(runner-01) | 그대로 |
| UI 시계 = 게임 시계(runner-01) | 손가락·tut_tap·클리어 연출·결과 버튼은 레벨 시간 기준. 테스트 모드 가상 시계에서도 같은 화면 |
| keep-all·navigator.language(runner-01) | 그대로, `?lang=`으로도 바꿈 |
| 레벨 카드 글 없이 구분(runner-01) | art `levelCard`(바탕·테두리·실루엣·L3 구름) 그대로 생성 |
| 640x360 넘침(runner-01) | 보호자 화면은 세로 스크롤 + 아래 ▼ 표시, 그 밖 화면은 넘침 없음(selfcheck) |
| 판정 한 모듈(runner-01·rhythm-01) | judge.mjs 복사본, 재판정 불일치 0 |
| 자기 PID만 종료·포트 대역(runner-01) | serve.mjs 8730~8739만, selfcheck가 띄운 자식 PID만 종료 |
| 맞닿은 블록 외곽선 | 해당 없음(블록 없음) |
| 오프라인 렌더로 소리 크기 순서(rhythm-01) | 이번 범위에서 빌드 OfflineAudioContext 렌더는 안 함 → 1-4 QA(30-art 9-3 한계 줄) |

## 6. 도구

- `node projects/rhythm-02/tools/build-web-data.mjs` — data 생성
- `node projects/rhythm-02/tools/selfcheck-sim.mjs [--n 2000]` — node 자체 확인(모듈·데이터 동일, 레벨별 클리어/실패, 재판정, 연습, 배치 식, 보조 계산)
- `node projects/rhythm-02/tools/selfcheck-browser.mjs [--quick] [--out 폴더] [--channel msedge]` — Playwright(`require('playwright')` → `playwright-core` → `PLAYWRIGHT_CORE=<폴더>` 순서로 찾음, 브라우저는 설치된 Edge). 이 PC에는 레포에 playwright가 없어 `PLAYWRIGHT_CORE`로 기존 playwright-core 폴더를 가리켜 실행함(설치·다운로드 안 함)
- `node projects/rhythm-02/tools/serve.mjs [8730~8739]` — 정적 서버, 시작 줄에 PID 출력

## 7. 기존 도구 확인

- `tools/sim/judge.mjs`·`verify-levels.mjs`·`tools/art/*`에서 버그는 찾지 못함(고치지 않음). verify-levels 전체 266/266 PASS.
