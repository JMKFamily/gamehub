# rhythm-02 개발 노트 (game-developer)

웹 빌드 `games/rhythm-02/`의 구조, 기획과 다르게 하거나 기획에 없어서 정한 점, 도구 사용법입니다. 기획 문서가 정답이고, "다르게 한 점"은 해당 역할 리뷰에서 확인받을 항목입니다. **round-2(2026-11-17) "흘러오는 길" + 콤보**로 다시 썼습니다(round-1 판의 N1~N19 중 유지되는 것은 3절에 그대로, 바뀐 것은 R2-로 표시).

## 1. 구조

| 파일 | 내용 |
|---|---|
| `games/rhythm-02/index.html`, `style.css` | 화면 틀. 색은 CSS 변수(부트 블록·`setTheme`가 palette.json 값으로 넣음). 부트 블록(빌드 스크립트 생성)에 두 언어 부트 글·↻ 그림 인라인·언어 결정 스크립트(lang·title) |
| `js/judge.js` | `tools/sim/judge.mjs` **바이트 그대로 복사**(빌드 스크립트). 판정·궤적·세상 위치(`worldX`·`scrollBeatAt`·`pxPerBeat`·`objectsAt`)·콤보(`comboEvents`)·이어 하기(`resumePoint`)·바탕 단계(`bgStages`)·손가락·재시작 배분 전부 이 파일 |
| `js/music.js` | `tools/art/music.mjs` 그대로 복사(곡 음 시작 `musicOnsets`, 음 높이 `noteOf`, 잡음 `lcg32Noise`) |
| `js/core.js` | 시도 구간(`Attempt`): 탭마다 `judgeAttempt(L, 구간 탭, {startIndex, carried})`를 다시 불러 결과를 얻고, 고정 스텝 틱이 늦음 실패 시각을 지나면 실패. 연습 체크포인트, 지금 보이는 콤보 수 `comboNow`(사건 시각으로만 거름), 바탕 단계 `stageAt`(judge `bgStages`). DOM 없음 |
| `js/calc.js` | 소리 맞추기·밀림 감지 계산. **무시 구간 코드 삭제**(round-2 M1) |
| `js/layout.js` | `layout.json` schema 3 화면 식(`tools/art/layout.mjs compute`·`judgeGeom`과 같음, selfcheck G1이 상자·판정 자리까지 대조), 글 자리 `textSlot`(가로 아랫선 = min(손가락, 판정 튐 상자) − 8), 결과 자리 `resultSlots` |
| `js/render.js` | 캔버스 그리기: 바탕 → 실루엣(패럴랙스) → 큰 언덕 → 바닥·조약돌·길 줄 → 북·다리·그림자 → 박 표시 → 공 → 구름·지붕·가지 → 튐 선 → 판정 이름·%(`judgeLabel`) → HUD(막대·시도 점·콤보) |
| `js/audio.js` | `sound.json _synth` 규칙대로 WebAudio 합성, 화면 시계에 맞춘 예약. 음 높이·잡음은 music.js |
| `js/main.js` | 화면 흐름·입력·시계·테스트 훅 |
| `js/store.js`, `js/ads.js` | localStorage(try/catch, `bestCombo` 추가), 광고 더미 어댑터 |
| `data/` | `build-web-data.mjs`가 만듦(손으로 고치지 않음) |

데이터 빌드: `node projects/rhythm-02/tools/build-web-data.mjs` — balance·levels·palette·layout·sound·strings 복사, 아이콘·카드 16장 SVG 복사(주석 제거), `tools/art/cards.mjs levelCard`·`miniCloud`·`flag`로 레벨 카드·등급 칸 생성(겹쳐 그릴 막대·최고 콤보 네모 좌표 `levelcards/geom.json`), judge.mjs·music.mjs 복사, index.html 부트 블록(부트 글 5키 × 2언어, `icon-retry.svg` 인라인, 언어 결정 스크립트).

## 2. 시계·판정·세상 (기획 그대로 + 구현 결정)

- 판정 = 화면 시계: `tapToLevelMs(event.timeStamp, 레벨 시간 0이 그려진 performance 시각, bal)` = 탭 − 시작 − `visual_comp_ms`. 오디오 지연은 판정에 안 들어감.
- **세상 = 같은 시계**: 프레임 시각 t의 레벨 시각 lt = t − 시작으로 공(`ballsAt(L, lt, hits)`)과 세상(`worldX(L, beat, lt, W)`, `objectsAt`)을 함께 그림. 프레임 수와 무관(테스트 훅 가상 시계에서도 같은 화면). 레벨 시간 0 전(카드 닫힘 0.8 s·재시작 대기)은 `scrollBeatAt`이 0박.
- 박 표시: hit 접촉마다 하나, 공이 떠나는 순간(`max(친 시각, 접촉 시각)`)부터 120 ms 동안 작아져 흡수. 이 구간 시작 접촉(`startIndex`)보다 앞 표시는 그리지 않음(북을 지난 표시 없음). nogo 에는 표시 없음.
- **실패**: 세상은 실패 순간(그린 시각 = 실패 판정 + visual_comp)에 멈추고, 0.85 s(공 다시 나타남) 프레임에 다음 시도 자리(0박 / 연습 = 그 구절)로 한 번에 되감음. 다음 시도 첫 프레임 = 실패 + `restart_delay_s` 1.1 s. 세 판(늦음·일찍·bump_roof) 모두 `restartPhases` 배분.
- **이어 하기**: 멈춘 판정 시각 → `resumePoint(L, t, 지금 결과)` → 되감기면 새 구간 `Attempt({fromMs, startIndex, carried})`, 시작 = 지금 − fromMs(세상도 같은 시각). 시도 수 그대로, 앞 판정·콤보는 carried 그대로. 레벨 시간 0 전·실패 연출 중·클리어 뒤는 되감지 않고 멈춘 만큼 미룸.
- 콤보 = `comboEvents(L, 결과)` 파생(별도 상태 없음). 화면 수 = 이미 일어난 사건만(hit = 친 판정 시각, hold = 지붕이 북을 떠나는 roof_out 그린 시각) — `judgeAttempt`는 다음 hit 를 아직 안 친 상태에서 앞 지붕을 hold 로 미리 넣기 때문에 시각으로 거름. 화음 = `stages[].chordMs`(null 이면 없음)를 그 단계가 화면에 보이는 순간 예약.
- 고정 스텝 4 ms 틱(늦음 실패 선언, 클리어 연출 시각, 재시작 전환, 콤보 화음 예약), 그리기는 rAF 시각 그대로.
- **늦음 실패 선언 유예 = 한 프레임**(R2-N2): 측정한 프레임 간격(EMA, 12~34 ms로 자름). 60 Hz에서 약 17 ms(round-1 34 ms 고정). 실패 시각 자체는 판정 값.

## 3. 기획과 다르게 하거나 기획에 없어 정한 점 (리뷰 확인 필요)

| # | 내용 | 이유 | 확인 역할 |
|---|---|---|---|
| N1 | 메뉴 화면 바탕색 = 그 레벨 테마 `bg1`(레벨 선택은 level01) | 색 하드코딩 금지 | art |
| N3 | 연습으로만 깬 레벨도 다음 레벨을 엶. 레벨 선택에는 연습 표시 없이 aria 상태 `practice_clear`만 | D14 | balance·lore |
| N4 | 클리어 제목: 등급 n → `clear_title_n`, 연습 → `clear_title_1`, L10 → `clear_last` | lore 7-5 승인 | lore |
| N7 | 그림 카드 표시 배율의 화면 여백 16 px = cards.mjs `CARD.screenMargin`(layout.json 에 키 없음) | 키 없음 | art |
| N8 | 결과 "다음"은 레벨 시작 판을 거치지 않음 | D18 | art |
| N10 | `audio_unlock` 글은 레벨 시작 판에서 오디오가 멈춰 있을 때만, 이제 `icon-unlock_sound` 그림과 함께(N20) | 쓰는 자리 | lore |
| N11 | 소리 맞추기: 박 소리는 오프셋 없이(자동 지연만) 예약, 오프셋 = 12탭 중앙값(탭 − 들린 박) − visual_comp, [-100, 300] 자름. **round-2: 무시 구간 코드 삭제**, 들린 박 = 예약 perf − 예약 때 자동 지연 + 탭 순간 자동 지연 | balance sound_sync, insights rhythm-01 | balance |
| N12 | 밀림 감지 "세션" = 페이지 불러오기 1번 | 정의 구체화 | balance |
| N13 | 첫 실패 ↻ 그림 = 그 레벨을 들어와 처음 실패한 시도에만 | 해석 | art |
| N16 | `?test=1`에서 `press()`는 "지금 화면 시각에 이벤트"(판정 = 지금 − 40 ms). 접촉 시각에 정확히 치려면 `pressAt(판정 ms)` | 같은 판정 식 | qa |
| N17 | 레벨 선택 카드: 세로 2×5, 가로 5×2, 화면에 맞춰 줄임 | 30-art 11-1은 640x360만 | art |
| N18 | HUD 막대·점·콤보는 캔버스, 대체 글은 숨은 progressbar(진행도·최고)·meter(시도·콤보, valuetext 숫자만), 값이 바뀔 때만 DOM 쓰기, aria-live 없음 | 10-lore 6절 4·5 | lore |
| N19 | 클리어 뒤 HUD·콤보 0.2 s 페이드에 canvas globalAlpha(전환 중에만) | 30-art 7-3 | art |
| R2-N1 | 북 가운데 x = `round(0.30·W)`(layout compute), 세상 x = `worldX` 의 0.30·W(반올림 없음). 차이 ≤ 0.5 px(1박 63~256 px라 시간 ≤ 4 ms 상당) | 두 원본(layout·judge)을 각각 그대로 씀 | art·balance |
| R2-N2 | 늦음 유예 34 → 한 프레임(위 2절) | round-1 N2 줄임 | benchmark·qa |
| R2-N3 | 길 줄: 표시 아랫선(laneY + 0.2d)에 floorEdge 2 px 선 하나를 그음(30-art 3-1 "길 줄", 목업에는 선이 없음). 박마다 눈금 없음 | 3-1 표 | art |
| R2-N4 | 실패 bump_roof 경로: 0~0.15 s 지붕 아랫면까지(마지막 30 % 납작 0.85) → 0.1 s 가죽으로 → 나머지 0.2 s 늦음 판처럼 오른쪽으로 굴러 떨어짐(가죽 위 40 % · 떨어짐 30 % · 바닥 30 %). 공이 북 몸통을 뚫고 지나가지 않게 가죽으로 먼저 내림 | 30-art 7-1은 "닿고 → 오른쪽으로 떨어짐"만 | art |
| R2-N5 | 결과 화면 자리: 끝 구름 아래(구름 아랫선 + 6)부터 레벨 이름(20 px) → 제목(36 px) → 등급 3칸(캔버스, 칸 너비 2d·간격 2.5d) → 버튼. 목업 640x360은 제목이 구름과 겹쳐 그려져 있어 아래로 내림 | 겹침 방지 | art |
| R2-N6 | 연습 표시 `practice_on` 글은 연습 모드 첫 시도 시작 2 s(게임 시간)만, `tut_tap`과 같은 글 자리 | 30-art text_slots.practice_on | lore·art |
| R2-N7 | HUD 막대의 연습 체크포인트 깃발(round-1)은 빼고, layout `hud.practice`대로 막대 왼쪽 끝 깃발 하나 + 막대 22 px 밀기 | layout.json v3 | art |
| R2-N8 | 콤보 단계 10·20 연출 세부: 0~0.25 s 이전 배치의 점 10개가 새 큰 표지 자리로 이동하며 0.3배까지 작아짐, 0.25~0.4 s 큰 표지 0.6 → 1.0. 20 조각 5개는 콤보 상자 너비를 5등분한 자리에서 띠 위 2 px → 띠 아래 6 px 위까지 | layout combo.stage 문장 해석 | art |
| R2-N9 | 최고 콤보 = 일반 모드 시도의 grades 길이 최대(실패 시도 포함). 레벨 선택 최고 콤보 meter 는 기록이 있을 때만(`aria_best_combo`), 화면 금빛 네모는 10마다(0~2) | balance best_combo normal_mode_only | lore·balance |
| R2-N10 | 레벨 카드 대체 글: 해 봤지만 못 깬 레벨은 버튼 이름 = 레벨 이름만, 진행도는 형제 progressbar `aria_best`(깬 레벨도 100으로 둠) | lore N19 처리 | lore |
| R2-N11 | 판정 이름·%(요청자 추가 지시, 기획 확정 뒤 같은 빌드에 넣음): 가장 최근 hit 판정 하나만, 판정 시각은 친 판정 시각 + visual_comp(그린 시각), 튐 80·유지(시작부터 400)·흐려짐 150 ms = 합 550 ms(`timing.total_ms`, `hold_until_ms` 를 "시작부터 400"으로 읽음). 튐 = 오른쪽 가운데 기준 세로 1.15·가로 min(1.15, 자리 폭/실제 폭), 이름 글꼴은 body 와 같은 system-ui 계열을 canvas `measureText` 로 잼, 넘치면 그 이름만 줄이고 28 px 아래면 `judgement.overflow` 콘솔 경고(한 번) | 30-art 6-3 해석 | art·balance |
| R2-N13 | 결과 화면 정확도·최고 콤보 줄은 DOM(meter `result_accuracy`·`result_combo`, 신기록 img `result_new_best`), 등급 구름(캔버스) 아래. 신기록 = 이번 정확도 > 저장된 `bestAccuracy`(처음 클리어도 신기록). 가로 화면 버튼 줄은 북 오른쪽 영역 가운데(정확도·콤보 줄을 넣자 버튼이 북과 겹쳐서) | layout result_screen, 공간 | art·lore |
| R2-N14 | 판정 표시는 캔버스라 접근성 트리에 없음(aria-hidden 와 같음, 낭독 없음). 설정 훅 `setJudgeDisplay(false)` 로 그리기만 끔(판정 무관) | layout judgement.a11y | lore·qa |
| R2-N12 | 두 공(G5, 예비) 그리기 코드는 뺌(데이터 없음). judge 의 secondBall 상태가 오면 공 x 만 `b.x` 로 그림 | D-R2-1 | balance |

## 4. 안 쓰는 문구 키 (criteria 세계관 절)

| 키 | 이유 |
|---|---|
| `settings_reset`, `confirm_reset`, `confirm_yes`, `confirm_no` | 결정 D17: 기록 지우기는 이번 범위 밖 |
| `store_short` | 스토어 문구(출시 단계) |

`levels_screen`은 레벨 격자 aria-label, `pause_screen`은 멈춤 제목 + 멈춤 판 이름. 그 밖 키는 모두 화면 글·aria에 씀.

## 5. insights 적용

| 항목 | 적용 |
|---|---|
| 1프레임 반응·결정론 | pointerdown 즉시 판정·소리·북 톡, 공·세상 위치는 시간의 함수 |
| 재시작 약 1.1 s 자동 | 세 판 모두 1.1 s 고정, 확인 버튼 없음 |
| 실패 글 없음·첫 실패만 ↻ | 그대로(지붕 콩도 글 없음, `roof_bump` 소리만) |
| 연습 자동 체크포인트 | 받침 쉼마다, 부활 1.1 s, 콤보 0부터 |
| WebAudio 이중 보정 금지 | currentTime↔performance 차이 + 자동 지연 한 번. round-2: 계단 시계 가운데 사용(R2-M1) |
| outputLatency 변화(rhythm-01) | 소리 맞추기 들린 박 = 예약 때 자동 지연 대신 탭 순간 자동 지연 기준 |
| 첫 그림 미리 그리기 | 로딩 뒤 오프스크린 캔버스로 10레벨을 1박 간격 전 구간(모든 물체·표시·콤보 단계) + 실패 세 판 + 클리어를 한 번씩 그림 |
| HUD DOM 값이 바뀔 때만 | 그대로(콤보 meter 포함) |
| UI 시계 = 게임 시계 | 손가락·tut_tap·practice_on·콤보 연출·클리어 연출 모두 레벨 시각 |
| keep-all·navigator.language | 그대로, 부트 단계부터 lang·title(N16) |
| 대체 글은 접근성 트리로 확인 | selfcheck-browser 5)에서 ariaSnapshot |
| 콤보 대체 글(runner-01·마스터 dbda131) | meter·valuetext 숫자만·판정마다/끊김 때 읽지 않음·레벨 카드 표지는 버튼 밖 형제 |
| 화면 고정 글 자리 데이터화 | `layout.json text_slots.tut_tap` 식 그대로, 길 영역 밖 검사 |
| 자기 PID만 종료·포트 대역 | selfcheck 서버 8730~8731만, 자기 자식 PID만 종료 |
| 시작·재시작 1% low | 6배 스로틀 L5·L10 시작·재시작 측정 |
| 콤보는 보상 층만 | 판정 경로에 콤보 없음, 켬/끔 재판정 불일치 0 |

## 6. 도구

- `node projects/rhythm-02/tools/build-web-data.mjs` — data 생성
- `node projects/rhythm-02/tools/selfcheck-sim.mjs [--n 2000]` — node 자체 확인(모듈·데이터 동일, 레벨별 기본·지붕 콩, 빌드 경로 = judgeAttempt, 콤보, 연습·이어 하기, 배치 식, 보조 계산)
- `PLAYWRIGHT_CORE=<폴더> node projects/rhythm-02/tools/selfcheck-browser.mjs [--quick] [--out 폴더] [--channel msedge]` — Playwright(설치된 Edge). 이 PC는 레포에 playwright가 없어 기존 playwright-core 폴더를 가리킴(설치·다운로드 안 함). 서버 8730~8731
- `node projects/rhythm-02/tools/serve.mjs [8730~8739]` — 정적 서버, 시작 줄에 PID 출력

## 7. 기존 도구 확인

- `tools/sim/judge.mjs`·`verify-levels.mjs`·`tools/art/*`에서 버그는 찾지 못함(고치지 않음).
- 참고(버그 아님, 빌드에서 처리): `judgeAttempt`는 끝(`passHolds(Infinity)`)에서 아직 시각이 오지 않은 지붕도 hold 로 넣고 그다음 hit 의 늦음으로 결과를 냄. 판정 결과로는 맞지만(그 지붕은 앞으로 칠 일이 없으면 성공) 화면 콤보·진행도는 사건 시각으로 걸러야 함 → `core.js comboNow`.
