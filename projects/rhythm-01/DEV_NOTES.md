# DEV_NOTES: rhythm-01 (똑딱북: Tickadrum) 웹 빌드

- 작성: game-developer, 2026-11-17 (1-3 round-1 빌드)
- 빌드: `games/rhythm-01/` (정적 파일만, 외부 요청 0). 실행은 정적 서버가 필요합니다(`fetch`로 data를 읽어서 `file://`로는 열리지 않음): `node projects/rhythm-01/tools/serve.mjs` → `http://localhost:8340/games/rhythm-01/`


> **2026-11-17 round-3 새 코어 "북길" (R18~R25) — 이 절이 아래 절보다 우선입니다.** 아래 1-3~round-3(R11~R16) 절은 옛 코어(원 궤도) 기록으로 남깁니다. 북채·보여 주기·궤도 관련 내용(D17 정지 궤도, R2-1 북채, R2-2 손가락 늦춤, R3-5 점선)은 새 코어에서 쓰지 않습니다. 서버 기본 포트는 8340(game-developer 대역 8340~8379)으로 바꿈.

## round-3 새 코어 "북길" (결정 R18~R25, 보고서 `Docs/game-developer/2026-11-17-r3-new-core-build.md`)

### 구조 (바뀐 것)
| 파일 | 내용 |
|---|---|
| `js/road.js` (새) | 길 화면 규격 `roadLayout()` = `assets/road-layout.mjs layout()`과 같은 식, 값은 `data/art.json road`(= `assets/layout.json rule` 복사). `speedOf`(px/ms = 미리 보기 거리 ÷ (lead 박 × 1박)), `xAt`(별 x = 판정 선 x + 속도 × (별 시각 − 지금)) |
| `js/engine.js` | v3 레벨(파생 `bars`·`patterns`)을 `compileLevel`로 읽음(보여 주기 별 0). 북채·커지며 나타남 제거. 연습 체크포인트 = `practice.checkpoints[].beat`(R21), 부활 시도의 시작점 `t0` = 체크포인트 박 한 마디 앞(카운트인 1마디). 콤보 = `grades.length`(getter, 실패 중 0), 판정 이벤트에 `combo` |
| `js/render.js` | 북길 그리기 전부 새로: 바탕 층(바탕·실루엣 `silhouette_frame_r3`·엄지 받침) → 길 띠(단계 색) → 정박 눈금·마디 표(흐름) → 판정 북(카운트인 점 4개·탭 물결) → 판정 선 6 px(+ 양옆 outline 1 px) → 별(오른쪽 끝 W + r에서 들어옴) → 판정 이펙트(길과 함께 흐름) → 공(박마다 착지) → 손가락(판정 북 바로 아래 칸) → HUD(진행도·시도 점·콤보 줄). 보정 화면은 10절 그대로(가운데 북 + 점 8개, 크기 기준 = 옛 궤도 반지름 공식) |
| `js/audio.js` | `placeMelodyV3`(= `assets/sound-check.mjs placeMelodyV3` 규칙 + 단계 3 화음), `buildSong` v3(숨 고르기 마디 = `melody_r3.during_breath` = play 파트, outro 마디 동기 없음·마무리 음 1개, 연습 부활 카운트인이 마디 중간에서 시작해도 이벤트마다 그 시각 상태로 파트를 고름), `comboChordTime`(= `sound-check comboChordSlots` 규칙) |
| `js/readout.js` (새) | 판정 이름·정확도 % 자리(요청자 추가 지시 "판정 이름과 퍼센트까지", 구조만). `balance.json judge_readout`·strings 키가 생기면 보임, 지금은 없어서 아무것도 안 그림 |
| `js/store.js` | 저장 키 v3: 레벨 배치·카드가 바뀌어 레벨 기록은 새로, v2의 보정 결과(R11 방식)·소리 설정만 옮김 |
| `data/` | `build-web-data.mjs`: levels v3 확인(아니면 중단), strings = 10-lore 7절 64 + R3-7 6 = 70 중 사용 65, art.json = layout.json rule + 16절 연출 값, music.json에 `melody_r3`·`combo_r3`, 그림 카드 = `assets/cards-r3/`(키 이름, 외부 참조 검사, 옛 카드 파일 지움) |

### 결정·해석 (기획과 다르거나 기획에 없던 것)
| # | 내용 | 확인할 역할 |
|---|---|---|
| N-1 시계 | 별 x·눈금·공 뜀은 판정과 같은 보정 시계(레벨 시간 = V − songStartV)로 그림. 실패하면 길 흐름이 그 순간(`fail.x`)에 멈춤(16-6) | - |
| N-2 판정 이펙트 | 16-3 그대로: 딱 1.2배 + 빛살 5개(노랑) 방위 225·247.5·270·292.5·315°(12시 = 0°, 시계 방향 → 왼쪽 부채꼴), 좋아 1.1배 + 빛살 3개(크림) 240·270·300°, 통과 0.35배 회백 별 + 고리 0.9 r. **좋아 빛살 길이·간격은 문서에 없어 딱과 같게(0.6 r, 3 px)**. 판정된 별은 길과 함께 흐름 | art |
| N-3 눈금 | 정박 네모 max(5, 0.16 d)·trackEdge 80 %, 아랫변 3 px 안쪽. 마디 표 = 아랫변에서 띠 높이 30 % 막대, **폭 max(2, d/16)은 dev가 정함**(문서에 없음). 반박 자리 표시 없음 | art |
| N-4 공 | 박 위상 f(0~1)에서 y = 앉는 자리 − 뜀 높이 × 4f(1−f)(박 시각 = 가장 낮음). 시도 시작 전(0.4 s 여유)·클리어 뒤 그 마디 끝부터는 앉아 있음 | art |
| N-5 콤보 줄 | 16-4·`layout.json hud.combo`: 큰 표지 자리 3(cardTint r 6) + 점 10칸(빈 칸 trackEdge 50 % 고리 r 3.4 / 찬 칸 hud r 4). 콤보 2부터, 튐 120 ms(1.15배, **5만 1.3배** — balance `steps`에서 5단계만), 10·20·30 = 점 10개가 0.4 s 동안 표지 자리로 모이며 작아지고 표지 0.6 → 1.0배, 20·30 = 색 조각 6개 0.6 s(줄 위 12 px 낙하, HUD 띠 안). 끊김 = 실패 0~0.3 s `1 − q²`(ease-in)로 작아지며 사라짐, 소리 없음. 시각 값은 balance `combo`(show_from·update_pop_ms·steps fx_ms)에서 읽음. 색 조각은 시도 점 줄과 같은 높이 띠를 지나감(겹쳐 보일 수 있음, 0.6 s) | art |
| N-6 콤보 화음 | 판정 프레임에 `comboChordTime`(별 + 0.5박 뒤 첫 빈 정박 → 빈 반박 → 넘김)으로 시각을 정해 `AudioOut.play`로 예약. 실패·멈춤 때 `stopSong`이 아직 시작 안 한 소리를 멈춤(= 취소). 테스트 훅 `combo().chords`에 기록 | - |
| N-7 콤보 대체 글 | `#comboAria` `role="meter"`, 이름 `aria_streak`, `aria-valuenow` = 콤보, `aria-valuetext` = 숫자만(오케스트레이터 지시·insights, 10-lore R3-a는 "valuetext 없음"이라 적었으나 퍼센트로 읽히지 않게 숫자만 넣음), `aria-valuemax` = 판정 별 수, aria-live 없음, 판정마다·끊길 때 낭독 없음. 값이 바뀔 때만 DOM 씀 | lore |
| N-8 콤보 켬/끔 | `?combo=0`이면 콤보 줄·대체 글·단계 화음을 끔(봇 재판정 대조용, 판정 코드 경로는 같음) | qa |
| N-9 연습 부활 | 부활 시도 = 체크포인트 박 한 마디 앞에서 카운트인(박마다 똑딱, 첫 박 `tick_one`) → 체크포인트 박부터. 체크포인트 갱신은 그 박을 지나고 앞 덩어리 별이 모두 처리됐을 때. 진행도 깃발 = 체크포인트 다음 첫 별 번호 / 별 수 | balance |
| N-10 결과 화면 | 등급 북 = 판정 북과 같은 y·화면 가운데·간격 2.4 × 북 반지름·반지름 0.6 ×(16-6). 결과 버튼: 세로 = 엄지 받침 가운데, 가로 = 판정 북 아래 12 px(모자라면 오른쪽 세로 줄). 클리어 글 = 공 뜀 꼭대기 위·HUD 띠 아래 가운데 | art |
| N-11 타이틀 | 플레이 화면 구성(길·판정 북·판정 선·공, 별 없음), 공은 100 BPM 착지(게임 시계). 시작 힌트 = 손가락 칸(판정 북 아래)·글 자리 | art |
| N-12 레벨 카드 줄 1 | "작은 길 조각": 높이 28(최소 16) 안 가로 둥근 막대(track1 면 + trackEdge 3 px 테두리), **폭 = min(카드 안쪽 − 4, 2.6 × 높이)·막대 높이 0.36 ×·공 반지름 0.16 ×는 dev가 정함**, 왼쪽 30 % 자리 hud 세로 선 + 위 공 점 | art |
| N-13 불러오기 그림 | 궤도 위 도는 공 → 길 조각 위 통통 뛰는 공(문구 그대로, lore R3-7 "그림이 바뀌어도 문구 그대로") | art |
| N-14 부트 언어 | 불러오기 단계에서 html `lang`·문서 제목도 고른 언어의 10-lore 문구(`title`)로(criteria rhythm-02 줄) | - |
| N-15 판정 이름·% | 요청자 지시 "판정 이름과 퍼센트까지"(작업 중 전달, 규격 9f9cc5c 확정 뒤 범위에 넣음). `js/readout.js` `accuracyPct(e, judge, acc)`·`gradeFromPct`·`levelAccuracy(L, result, acc)` = `tools/sim/bots.mjs` 기준 함수와 같은 식·인자(식으로 계산, 경계표 안 씀, 경계값 = 안쪽 칸). 시작 때 `checkAccuracyData`가 accuracy·레벨 창 값이 유한한 숫자인지 확인(아니면 불러오기 실패 화면). 플레이: 판정 프레임에 `S.ro`를 바꿔 그림 — 자리 = `layout judge_label.anchor`(길 띠 아래, 판정 북 물결·손가락 칸 오른쪽 + 8), [표지][이름 위 / % 아래], 이름 크기 등급별(46/42/40, 짧은 변 500 넘으면 비례)·% 0.55배, 색 `palette judge_label_r3`, outline 테 2 × outline_px(바깥만), 튐 1.15배 80 ms → 400 ms 유지 → 150 ms 흐려짐(값은 layout 과 balance `display_timing_ms`가 같은지 빌드 도구가 확인), 실패 0.3 s 안 콤보 줄과 함께 작아짐, 클리어 0.2 s 흐려짐, **손가락·tut 글이 보이는 프레임에는 그리지 않음**. 캔버스에 그려 낭독 없음. 표지 빛살 시작 거리 0.08 × 이름·부채 중심 아래 0.22 × 이름은 dev 가 정함. 결과: `#resAcc`(meter `result_accuracy`, valuetext "87%")·`#resNew`(img `result_new_best`, 이전 최고보다 클 때만)·`#resCombo`(meter `aria_streak_best`, valuetext 숫자만), 자리·글 크기 = `layout result`(세로 = 등급 북 아래 한 줄, 가로 = 등급 북 양옆), 과녁·점 3개 표지는 인라인 SVG, 일반 모드 클리어만, 저장 `bestAcc`·`bestCombo`. **결과 숫자의 0.6 → 1.0배 등장(16-13-4 "마지막 등급 북 뒤 1박")은 넣지 않음** — 결과 화면이 그 시각과 거의 같은 곡 끝에 바로 보이고 DOM 애니메이션은 게임 시계와 묶이지 않아서(insights 테스트 훅 = 일반 모드) | art |

### 텍스트 키 (10-lore R3-7, criteria R8)
- (R3-12 반영) 표에 적힌 키 **75** = 빌드에서 쓰는 키 **71** + **폐기 3 + 쓰지 않음 1**(빌드 `data/strings.json`에 넣지 않고 `_not_used`에 기록). 새 키 R3-12 5개(`judge_perfect·judge_good·judge_pass·result_accuracy·result_new_best`), `aria_streak_best`는 R3-12에서 다시 씀(결과 최고 콤보 meter).
- **10-lore R3-7 폐기**: `tut_tap`(→ `tut_drum_tap`), `card_star_tap`(→ `card_drum_tap`), `card_two_bar`(→ `card_run3`) — 북채·보여 주기·원 궤도 폐기로 뜻이 맞지 않음.
- **10-lore R3-7 쓰지 않음**: `card_long_row`(L6 기믹이 반박 3연속으로 확정, `card_run3` 사용). (`aria_streak_best`는 처음엔 쓰지 않음이었다가 R3-12로 다시 씀.)
- 새로 쓰는 키: `tut_drum_tap`(L1 손가락 보조 글, 글 자리 = layout `text_slot`, 14 px 굵게), `card_drum_tap`·`card_run3`(그림 카드 aria), `aria_streak`(콤보 meter 이름). `title`은 부트 블록에도 넣음.

### 성능 (6배 스로틀 1% low ≥ 45, R12 원인 대응을 새 화면에도)
- 옛 코어에서 찾은 원인과 새 화면 적용: ① 첫 래스터화 — 타이틀 뒤 미리 그리기(`warmScreens`)·레벨 1 그림 카드 해독 뒤 ready·손가락/깃발 스프라이트 resize 때 래스터화 그대로, `warmCode`가 레벨 1·2 완벽 입력(콤보 갱신·10·20 단계 연출 포함)·별 3개 뒤 실패(콤보 끊김)·재시작 장면을 작은 캔버스에 미리 그림. ② GC — 바탕 층 캔버스 2장 resize 때 버퍼 미리 잡기, 프레임마다 객체를 만들지 않음(콤보 상태 객체 재사용, 색 섞기 캐시), aria 값은 바뀔 때만. ③ 테마 전환 — 바탕 층은 (bg, bgFar)마다 하나, 길 띠·눈금은 매 프레임 그림(단계 색 바뀜에도 새 층 없음), 새 테마 층은 시작 한 프레임 전에.
- 새로 바꾼 것: 정적 바탕을 메인 캔버스 뒤 별도 캔버스(`#bgcv`, 테마가 바뀔 때만 그림)로 옮기고 메인 캔버스는 매 프레임 `clearRect` 뒤 움직이는 것만 그림(옛 코어의 화면 크기 `drawImage` 1번/프레임 제거, DPR 3에서 프로파일 상위 1위였음). 콤보 줄 점·고리는 한 경로로 묶어 그림(그리기 호출 약 30 → 4).
- 측정 결과·PC 부하는 보고서 "검증 결과".

### 테스트 훅 (round-3에서 바뀐 것)
| 훅 | round-3 |
|---|---|
| `layout()` | 북길 규격(`layout.json layouts[]`와 같은 이름): `judge_x, preview_px, star_d, star_r, road{y0,y1,yc}, ball{d,x,yRest,bounce,top}, drum{r,x,y}, line{x,w,y0,y1}, hud{bar, pause, attempt_y, combo, band_bottom}, finger, text_slot, thumb, silhouette_frame` + `hand{x,y,size}`(손가락 칸 가운데·크기), `calib{cx,cy,R,hand}`(보정 화면). 옛 `R, cx, cy, starR, ballR, band, bar, dotsY, titleHint`는 없음 |
| `layoutFor(W, H, safe)` | 위와 같은 형식 |
| `road()` (새) | 지금 레벨 흐름 값 `{judgeX, previewPx, starD, lineW, leadBeats, beatMs, speedPxS, beatPx, previewS, judgeS, overlapMs}` |
| `starX(i)` (새) | 지금 별 i 의 화면 x(같은 보정 시계, 실패 중엔 멈춘 자리) |
| `combo()` (새) | `{on, value, shown, best, chords[{attempt, combo, star, sound, at(레벨 ms|null), cancelled}], aria{role,label,now,text,max,live}}` |
| `frameInfo()` | `{handOn, malletOn: false, dashK: 0, levelTime, combo, comboShown}` (북채 없음, 두 값은 늘 false·0) |
| `stars()` | 그대로(보여 주기 별 없음) |
| `?combo=0` (새) | 콤보 표시·화음 끔 |
| 그 밖 | `state·phase·loadLevel·step·press·pressAt·autoplay·judgeLog·history·summary·latency·calibInfo·show·calibTap·skipCalibration·setOffset·lateHint·save·drawNow·ads` 그대로. 저장 키 `rhythm01.save.v3` |
| DOM·캔버스 | `#tut` 키 `tut_drum_tap`(자리 = layout text_slot, 가로는 `.side` 왼쪽 정렬), `#comboAria`(meter), `#resultInfo`·`#resAcc`·`#resNew`·`#resCombo`(판정 % 지시, accuracy 블록이 생기기 전엔 숨김), `#tapStart`(손가락 img = 손가락 칸, span = 글 자리). **정적 바탕은 `#bgcv`(메인 `#cv` 뒤)** — `#cv` 픽셀만 읽으면 바탕이 투명(0)으로 나옴 |

## 구조 (옛 코어 기록, 새 코어는 위 절)

| 파일 | 내용 |
|---|---|
| `js/judge.js` | `tools/sim/judge.mjs` **복사본**(빌드 스크립트가 복사). 판정 창·놓침 구역·미리 보기 시각·등급을 기준 구현 그대로 씀 |
| `js/engine.js` | 한 레벨 플레이(`Run`): 탭 하나씩 판정, 놓침, 실패 → 1.08 s 뒤 자동 재시작, 연습 체크포인트, 클리어·끝, 밀림 감지(drift_check). DOM·오디오 없음 (node에서 그대로 돌아감) |
| `js/audio.js` | WebAudio 합성(30-art 12-4 표 → `data/sound.json`), 오디오 시계 예약(lookahead 0.1 s, 25 ms 타이머), 곡 이벤트 생성(12-1 마디별 파트) |
| `js/render.js` | 캔버스 그리기(궤도·별·공·북·북채·판정 이펙트·실패 연출·클리어 물듦·HUD·보정 화면) |
| `js/calib.js` | 보호자 보정 계산(회 IQR·두 회 차이·12탭 중앙값·30 ms 문턱·자름) + round-3 R11 `autoStableAt`·`calibTapDiffR11`·`attemptComp`(tools/sim/calib.mjs 와 같은 정의) |
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
| D6 | ~~그림 카드 다시 보기 버튼 그림 = 그 카드 그림의 축소판~~ → **round-2 폐기**: art 전용 `icon-card.svg` 사용(N11) | art 반려 |
| D7 | 레벨 선택 → 타이틀 "뒤로"(`btn_back`) 버튼 = "다음" 화살표 좌우 반전, 오른쪽 위 | 아이콘 미정 (art) |
| D8 | 결과 버튼 3개(**레벨 10은 2개: 다시·레벨 고르기**, round-2 N16): 세로 화면 = 엄지 받침 가운데, 가로 화면 = 궤도 아래 공간이 64 px보다 좁으면(640x360) 오른쪽 세로 줄. `clear_title`은 세로 = 받침 위쪽, 가로 = 왼쪽 | 640x360에서 궤도 아래 25 px뿐 (art 8-2) |
| D9 | 보정: 첫 실행 건너뛰기 = 수동 오프셋 0(`on_skip`), 설정에서 연 보정의 건너뛰기 = 이전 값 유지. 첫 박보다 반 박 넘게 이른 탭은 세지 않음. 보정 탭 소리 = 무시 탭 "톡". 끝 체크 표시 1 s 동안 "다시 맞추기" 버튼(`calib_redo`)이 가운데 아래에 보임(그 뒤 자동으로 넘어감, 설정의 박자 맞추기 줄이 주 경로) | 화면 규칙에 없는 부분 (balance·art) |
| D10 | ~~멜로디 자리 표시~~ → **round-2 폐기**: `music.melody` 규칙 + 레벨별 동기(R7, 아래 R2-5). 이전 내용: 30-art 12-5 규칙(근음3×2, 5음 음계, 자리 0·4, 별 자리면 반 박 앞) + 음 순서 `degree_walk` [0,2,4,2,1,3,4,0]을 마디마다 돌림(제가 정한 값, `data/music.json`). 레벨 10 "O + X"는 두 악기 번갈아. 베이스 = 근음3÷2 박 1·3, 패드 = 근음3 1·3·5도 마디마다. 카운트인 "마지막 박 패드 부풀기" 생략 | 동기는 art가 1-3 라운드에서 채움 (art) |
| D11 | 소리 켜기/끄기(`btn_sound_on/off`) = 마스터 음소거(타이틀 오른쪽 위·멈춤 화면 오른쪽 위). 그림 = 30-art 5-7 "음악 / 음악 끔" 재사용. 설정의 음악·효과음 토글은 버스별 | lore 7-8 "놓을 곳은 art" (art) |
| D12 | ~~불러오기 화면은 글 없음~~ → **round-2**: 빌드 스크립트가 10-lore `loading`·`load_error`·`btn_retry` ko/en과 첫 테마 색을 `index.html`에 넣고, 궤도 위 공 그림(`loading`) + 실패 ↻(`btn_retry` + 설명 `load_error`) | `loading`·`load_error` 키는 로드 뒤에만 쓸 수 있음 (lore) |
| D13 | 손가락 튜토리얼(레벨 1 `cues`)은 그 레벨 플레이(레벨 선택에서 들어온 한 번) 안에서 첫 별을 한 번 맞힐 때까지 시도마다 나옴. `tut_tap` 글은 세로 = 엄지 받침 위쪽, 가로 = 손가락 칸 위(칸 위끝 − 8, 단 궤도·별 오른쪽 + 8 px 밖으로만, 화면 위가 모자라면 칸 아래) | balance `hide_after: first_star_judged`의 범위 해석 (balance·lore) |
| D14 | 연습 체크포인트는 그 쉬는 마디 시작을 지나고 앞 별이 모두 처리됐을 때 갱신. 연습 모드 진행도 막대는 별 기준으로 채우고 최고 기록 점은 숨김(최고 기록은 일반 모드만) | balance 6-5 해석 |
| D15 | 밀림 감지 표본: 맞힌 별 = 그 탭의 오차, 놓친 별 = ±300 ms 안 가장 가까운 탭(실패 연출 중 늦은 탭 포함). "시도 3번 이상" = 이번 레벨 플레이 안의 시도 수 | balance 8-5 해석 |
| D16 | "소리가 늦어요" 표지의 세션 = 페이지 로드 1회. 조건(A 오프셋 > 100 / B 자동 지연 ≥ 100·보정 때보다 40 넘게 바뀜·출력 기기 바뀜 / C 밀림)이 바뀌면 세션 수를 0으로. 출력 기기 바뀜 = `mediaDevices` `devicechange`(보정한 적 있을 때만). 보호자 보정이 끝나면 C·기기 바뀜 해제 | balance 8-5 해석 |
| D17 | 그림 카드 뒤 바탕은 정지 궤도(공·12시 별), 화면 아무 곳 탭으로 닫힘(메뉴 탭 소리), 바로 카운트인 | art 9절 |
| D18 | 보정 화면 aria 키는 lore 확정 `calib_with_grownup`을 씀(30-art 10-3의 제안 이름 `calib_together` 아님) | lore 우선 |
| D19 | **round-2**: `sound.json`·`music.json`은 art 원본 `assets/sound.json`을 복사(표 파싱·`SOUND` 상수 삭제, `calib_check_hz`가 숫자가 아니면 빌드 중단, 빌드 전 `assets/sound-check.mjs` 실행). `art.json`은 그대로 30-art 4~10절 값을 `build-web-data.mjs` `ART`에 옮겨 적음(30-art를 바꾸면 `ART`도 같이) | 표 형식이 사람용(괄호·설명 섞임) |

## round-2 구현 (2026-11-17, 결정 R1~R10, `reviews/round-1/dev-response.md`)

| # | 내용 | 이유 / 확인할 역할 |
|---|---|---|
| R2-1 북채 | `engine.prepareLevel`이 `judge.js malletSchedule`을 그대로 씀(`L.malletWins` = from·shrinkStart·gone + 점선 시작 `dashFrom` = 묶음 첫 마디 시작). 렌더·검사가 같은 `engine.malletAt`을 씀. 작아짐 = 1 − q²(ease-in), 등장 커짐(0.6 → 1, 0.25박)과 곱함. 점선 궤도·점선 북은 `barMode === 'show'`이고 북채 창 안일 때만, 빈칸 길이 × 작아짐 배율 → gone에서 실선. 빈칸이 0에 가까워지면 띠 가운데 trackEdge 선이 이어진 선처럼 보이다가 gone에서 사라짐(art 5-4 문장 그대로) | art 5-4: 마지막 몇 프레임의 "이어진 선 → 없음" 전환이 보이면 다른 표현(대시 길이도 함께 줄이기) 지정 요청 |
| R2-2 손가락 | `cue.from = max(첫 별 − show_from 박, 그 앞 북채 gone)`(30-art 5-5 "늦춤" 규칙), 그리고 북채가 보이는 프레임에는 그리지 않음(이중 안전). 누름 = 레벨 파일 `press_from_beats_before`(0.25). 칸 = `max(64, 0.45R)`(세로는 받침 높이 − 16 이하), 누름 px = 4 × 칸/64 | L1 실측: 북채 사라짐 2591 ms → 손가락 3819 ms, 누름 −136 ms |
| R2-3 세로 카드 | 세로 화면 = `card_<id>_portrait.svg`, 폭 = 234 × min((W−32)/234, (H−32−safeTop−safeBottom)/896, 1.4). 가로 = 720×336 비율, 폭 min(0.8W, (H−40)·720/336). 회전하면 다시 고름 | art 9-1 |
| R2-4 레벨 카드 | 시작 버튼 영역 높이 A = 카드 높이 − 48 − 12. 줄 = 궤도(28, 최소 16) / 점(6·15) / 등급 줄 12 / 이름 14, 사이 4. 모자라면 궤도 축소 → 이름 숨김 → 궤도 숨김. 잠김 카드에서 궤도가 숨으면 자물쇠를 등급 줄에 그림. 진행도 막대 폭 64(카드 안쪽이 좁으면 줄임) | art 5-6에 막대 폭이 없어 목업 8 비율로 정함 (art) |
| R2-5 멜로디 | `audio.js placeMelody` = `assets/sound-check.mjs placeMelody`와 같은 규칙(같은 마디 안 0 → −1 → +1, 없으면 뺌), 레벨마다 한 번 계산. 음 길이 = len × 8분, 화음 = 단계 3부터 d+2·`harmony_db`, outro 첫 마디 `music.melody.outro`. 168음, 별 시각 시작 0(`selfcheck-sim` R7) | art 12-7 |
| R2-6 소리 예약 | lookahead 0.1 s → **0.6 s**, 한 번 pump 에 1개(시작까지 0.08 s 안인 것은 모두). 소리별 post 필터(lowpass)는 버스마다 하나를 같이 씀(선형 필터라 결과 같음) | 30-art 12-6 "lookahead 0.1 s"와 다름. 마디 첫 박 소리 묶음(킥·베이스·패드 3음·셰이커·둥둥이)이 한 프레임에 몰려 6배 스로틀에서 25~28 ms 프레임이 됨(R5). 예약 시각은 그대로라 소리 시각은 같음. 실패 때 미리 예약된 소리는 `stopSong`이 멈춤 (art) |
| R2-7 지연 값 (R9) | 자동 지연(outputLatency + baseLatency)은 `updateComp()`에서만 읽어 `clock.auto`에 고정. 판정 `comp = auto + 수동 오프셋`, 보정 탭 계산, `store.calibAutoLat`, `__game.latency().auto`가 모두 이 값. 갱신 = 오디오 잠금 해제, 레벨 플레이 시작(`beginRun`), 보정 시작·끝, 오프셋 설정. 시도 중에는 바꾸지 않음(시계가 튀지 않게). `latency().autoNow` = 지금 읽은 값(표지 B 조건 "보정 때보다 40 ms 넘게 바뀜"은 지금 값으로 판단) | balance 확인 |
| R2-8 불러오기 | `build-web-data.mjs`가 `index.html`의 `<!--boot:start-->` 자리에 10-lore `loading`·`load_error`·`btn_retry` ko/en(JSON)과 레벨 1 테마 색(CSS 변수)을 넣음. 인라인 스크립트가 언어를 골라 공 그림 이름·보조 글·↻ 이름을 붙임 | lore 7-10 R8-5 |
| R2-9 성능 (R5) | 아래 "round-2 성능" 절 | qa |
| R2-10 튜토리얼 글 | `#tut.hidden`은 display 대신 visibility로 숨김(배치는 유지). QA가 보는 `hidden` 클래스는 그대로 | 첫 표시 프레임의 글자 배치 비용(38 ms) 제거 |

### round-2 성능 (6배 CPU 스로틀, 1% low ≥ 45)
- 원인(Edge long-animation-frame·프레임 기록): ① 처음 보이는 플레이 화면 요소의 첫 그림·배치(레벨 첫 시작 프레임 41~44 ms), ② 손가락 SVG를 매 프레임 크기를 바꿔 `drawImage`(첫 손가락 프레임 35~38 ms), ③ 튜토리얼 글 첫 표시, ④ 마디 첫 박 소리 묶음 예약, ⑤ 프레임마다 만드는 작은 객체·문자열(GC).
- 고친 것: 타이틀 뒤에서 플레이·결과·멈춤 화면을 거의 투명하게 2프레임 그려 둠(`warmScreens`), SVG 그림을 기기 px로 한 번 래스터화한 스프라이트(`Renderer.sprite`, 레벨 시작 때 `prewarm`), 정적 바탕 층(바탕·실루엣·받침·궤도 띠·눈금) 캐시 캔버스 2장 재사용, 소리 예약 나눔(R2-6), 곡 이벤트를 (레벨, 시작점)마다 한 번만 만들고 처음 곡은 로딩 뒤 idle 때 미리 만듦, 판정 프레임의 localStorage 쓰기·새 기록 알림 글을 뒤로 미룸, aria 값은 바뀔 때만 씀, 색 섞기 문자열 캐시·별 자리 미리 계산·북채 상태 객체 재사용.
- 로딩 중(준비 전) 미리 돌리기 `warmCode`: 레벨 1 완벽 입력·클리어·무입력 실패 장면을 64 px 캔버스에 그려 판정·그리기 코드를 미리 최적화시키고, 렌더하지 않는 OfflineAudioContext에서 소리마다 `AudioOut.play`를 3번씩(시각 0, 지연·아르페지오 소리 제외) 돌림. 처음에는 idle 콜백으로 했다가 측정 창과 겹쳐 215 ms 프레임이 생겨 부팅 동기 실행으로 바꿈.
- 결과(QA `--part perf`, 6배 스로틀): 마지막 두 실행 12창 중 11창·10창이 1% low ≥ 45(나머지 44.7~52.5). 매 실행 한 창은은 새 브라우저 첫 컨텍스트에서 AudioContext 생성 0.5 s 안에 레벨을 시작할 때 생기는 긴 프레임 1개(44~216 ms)로, long-animation-frame 기록상 스크립트·blocking 0이라 게임 코드로 줄이지 못함(round-2 보고서 "성능").

## round-3 구현 (2026-11-17, 결정 R11~R16, `reviews/round-2/dev-response.md`)

| # | 내용 | 이유 / 확인할 역할 |
|---|---|---|
| R3-1 지연 보정 R11 (B1) | `js/calib.js`에 `tools/sim/calib.mjs`와 같은 이름·식으로 `autoStableAt`·`calibTapDiffR11`·`attemptComp`를 옮김(verify-levels C2 대조). ① 보정 탭: `calibTapDiffR11(탭 오디오 시각, 그 탭 순간 autoNow, 첫 똑딱 예약 시각, 박)` → 저장 오프셋 = 자동 지연을 뺀 남는 차이. ② 판정 `comp = attemptComp(시도 시작 autoNow, 수동 오프셋)`: `beginRun`·실패 뒤 재시작(`rereadAtRestart`)·일시정지 복귀에서 다시 읽고 시도 중에는 그대로(R9 표시값 = 판정값, 공도 같은 comp). ③ 재시작: 다시 읽은 양 dc만큼 `run.restartV`를 같이 옮겨(`restart_keeps_delay`) 실패 → 다시 움직임 1.08 s 유지. 재시작 판정은 프레임·탭·테스트 step 어디서 일어나도 같은 함수를 거침. ④ 안정 대기: `AudioOut.pollStable`이 잠금 해제 뒤 매 프레임 autoNow를 기록해 `autoStableAt`(창 250·변화 2·최소 400·최대 1500 ms, `balance.json auto_latency_read.stable_wait`)로 판단. 첫 보정은 대기 동안 `cal.phase = 'wait'`(보정 화면 그대로, 똑딱 없음, 탭 무시), 잠금 해제 뒤 첫 시도(보정 건너뛰기·저장된 보정으로 바로 레벨)는 `beginRun`을 미룸(`pendingBegin`, 지금 화면 유지). ⑤ `store.calibAutoLat` = 보정 끝 순간 autoNow. ⑥ 저장소 키 `rhythm01.save.v1` → `v2`(이전 오프셋을 옮기지 않음, 첫 실행 보정 다시) | balance 8-1 R11 정의 그대로. qa `--part firstrun`으로 확인 |
| R3-2 테스트 훅 (R11) | `latency()`에 `settled`(안정 대기 끝)·`stable`(`autoStableAt` 결과)·`pendingBegin`·`calibAutoNows` 추가, `calibInfo()`(보정 단계·첫 똑딱 예약 시각·박 길이·탭마다 autoNow) 추가. 안정 대기로 시작이 미뤄진 동안 `autoplay()`를 부르면 시작된 뒤 실시간 재생(Promise). `loadLevel`은 일반 모드에서 잠금 해제 뒤 약 0.4~1.5 s 안이면 바로 `play`가 되지 않음(그 사이 `state`는 이전 화면) | qa: 훅 사용 순서 확인(`state === 'play'` 기다리기) |
| R3-3 성능 (R12, M1) | 아래 "round-3 성능" 절 | qa |
| R3-4 미리 그리기 화면 (R13, N1) | `warmScreens()`가 `#tut`의 `hidden` 클래스를 건드리지 않음. 미리 그리기 동안만 CSS `.screen.warm:not(.show) #tut.hidden { visibility: visible }`로 그리고, `show()`가 화면을 바꾸는 순간 `endWarm()`으로 warm을 바로 뗌 → 준비 직후 같은 프레임에 레벨을 시작해도 튜토리얼 글이 숨김 상태 | qa N1 회귀 |
| R3-5 북채 퇴장 점선 (R14, N2) | `render.js orbit()`: 띠 가운데 점선 굵기 = 띠 × 0.35 × k, `globalAlpha = k`, 대시 무늬 그대로(빈칸 × k 삭제). `drum()`: 실선 테두리(outline) `globalAlpha = 1 − k`를 먼저, 그 위에 점선 테두리(trackEdge) 굵기 = 외곽선 × k·`globalAlpha = k`·대시 8/6 그대로. k < 0.02면 점선 생략. 값은 `art.json showDash.minK·drumDash`(build-web-data `ART`, 30-art 5-4) | art 프레임 확인 ①~④ |
| R3-6 세로 카드 (R15, N3) | `art.json card.portrait` 226×880, 세로판 SVG 5장은 `build-web-data.mjs`가 `assets/cards/`에서 다시 복사(손으로 고치지 않음). 배율 식은 그대로(`/226`·`/880`) | art·qa `#cardImg` 재측정 |
| R3-7 긴 레벨 이름 (R16, N4) | `fitCardRows`: 12 → 11 → 10 px 한 줄(줄 높이 14) → 10 px 두 줄(줄 높이 12, 이름 줄 24, `.lname.two` = `white-space: normal; word-break: keep-all`, 늘어난 높이는 `cardRowsPlan(nameH: 24)`로 작은 궤도를 줄여 마련, 최소 16) → 그래도 넘치거나(가로 `scrollWidth`·세로 `scrollHeight`) 높이가 모자랄 때만 숨김(그때 궤도는 이름 없는 배치로 다시 계산). 값은 `art.json card.name`. `.lname` 높이 고정 해제(`min-height`) | art 5-6. 영어 360x640 L9 "Above the Clouds" = 10 px 두 줄(아래 자체 검사) |

### round-3 성능 (6배 CPU 스로틀, 1% low ≥ 45, R12)
- 측정: QA 도구 `tools/qa-round.mjs --part perf --perf-runs 3`(수정 없이, 결과 폴더만 스크래치) + 개발용 프레임 기록·CPU 프로파일·Chrome 추적(스크래치 스크립트, 포트 8341~8344).
- 원인과 수정:
  1. **탭 아이콘(favicon) SVG**: 브라우저가 타이틀 탭 직후 `data/svg/ball.svg` 탭 아이콘을 불러와 SVG 문서를 메인 스레드에서 만들었음(추적 `SVGImage::DataChanged` 25 ms, 6배 스로틀에서 35~48 ms 프레임). round-2의 "오디오 생성 직후 레벨 시작 긴 프레임"의 대부분이 이것. → `build-web-data.mjs`가 같은 그림(공·외곽선·하이라이트, palette 색)을 32 px PNG(`data/favicon.png`)로 만들고 `index.html`이 그것을 씀.
  2. **새 브라우저 첫 컨텍스트의 그림 카드 첫 래스터화**(98~248 ms, 스크립트 0): 투명도 0.001 미리 그리기로는 래스터화가 미리 되지 않았음. → 미리 그리기 화면을 캔버스 뒤(z-index −1, 불투명)에 그리고, 레벨 1 그림 카드를 같은 크기로 넣어 해독 + 3프레임 그린 뒤 `__game.ready`(최대 1.5 s 기다림).
  3. **레벨 시작 때 주요 GC 18~22 ms**: 새 테마 바탕 층 캔버스에 처음 `getContext`로 큰 버퍼를 잡으면서 V8 외부 메모리가 늘어 레벨 시작 프레임에 mark-compact GC가 겹쳤음. → `Renderer.resize`에서 층 캔버스 2장의 버퍼를 미리 잡음.
  4. **레벨 10 단계 전환 31~80 ms**: 바탕 층이 (테마, 궤도 색)마다라 단계가 바뀌면 새 층을 그리고 큰 텍스처를 올렸음. → 층 = 바탕·실루엣·받침(테마마다 하나), 궤도 띠·눈금은 매 프레임 그림. 새 테마의 층은 `beginRun`이 한 프레임 먼저 그리고 다음 프레임에 시작(시작 프레임 비용을 둘로 나눔, 시작 시각은 그 프레임의 시계 기준이라 판정 영향 없음).
  5. 그 밖: 같은 테마면 CSS 변수 다시 쓰지 않음(문서 전체 스타일 재계산), 카드 배치에서 `getComputedStyle` 대신 resize 때 읽은 안전 영역, 손가락·깃발 스프라이트를 resize 때 래스터화, 오디오 `live` 목록에서 이미 시작한 소스를 제자리 정리(끝난 노드를 오래 붙잡지 않음).
- 결과(QA `--part perf --perf-runs 3`): 최종 코드 35/36(회 1 12/12, 회 2·3 11/12, 남은 창 = 640x360 L7 재시작 34~37, 스크립트 없는 31~34 ms 프레임 1개). 측정 때 PC 부하 41~52 %(대조 페이지도 1창 실패). 자세한 표는 `Docs/game-developer/2026-11-17-r3-build.md`.
- 시험했다가 되돌린 것: 그림 카드 화면을 숨길 때도 캔버스 뒤에 두기(효과 없음), 실패 연출 중 층 대신 바로 그리기(640x360 재시작이 더 나빠짐).

## 코드에 남은 상수 (기획 값이 아닌 구현용)
- `START_LEAD_MS` 400 (D3), `REALTIME_GRACE_MS` 20 (D2), 오디오 lookahead 0.6 s·한 번에 1개·급함 0.08 s·타이머 25 ms(R2-6), 저장 지연 250 ms, 새 기록 알림 글 300 ms 뒤, 시계 매핑 감쇠, 보정 점 비우기 0.2 s, 테스트 모드 step 4 ms 단위.
- 메뉴 화면 글자 크기·여백(CSS). 색은 모두 palette.json에서 CSS 변수로.

## 데이터 문제 (수정하지 않고 기록)
- (round-3 새 코어) 판정 % 경계: insights "Δ를 0.001 ms로 반올림한 뒤 경계 이하"와 달리 기준 `tools/sim/bots.mjs accuracyPct`는 반올림하지 않음. 빌드는 기준과 같게 둠(지금 데이터에서 % → 등급 불일치 0). balance 가 기준을 바꾸면 `js/readout.js`도 같이.
- (round-3 새 코어) 30-art 16-13-4 가로 화면 결과 정확도 자리(등급 북 왼쪽)가 판정 북(x = 판정 선)과 겹쳐 보임(640x360 정확도 x 110~230, 판정 북 167~217). layout 검사 대상에 판정 북이 없음 → art 확인 필요.
- (round-3 새 코어) 작업 끝 무렵 balance 가 12세 재조정 중이라 `verify-levels.mjs`가 `verify.*` 새 키를 찾다 멈춤(TypeError by_level). 빌드 데이터는 그 전 balance.json(22:53)과 같음. 재조정이 끝나면 `build-web-data.mjs`만 다시 돌리면 됨(스키마 같음).
- 30-art 11절·12-5 표의 BPM 문구는 1-2 기준 표현이 남아 있음(빌드는 levels 파일 BPM만 씀, 요청 지시대로).
- 30-art 10-3은 aria 키를 `calib_together`(제안)로 적음 → lore 확정 `calib_with_grownup` 사용(D18).
- (round-3) 작업 중 balance가 프로젝트 `balance.json`·`levels/*.json`을 스키마 v3(새 코어)로 바꿈. 빌드 데이터(`games/rhythm-01/data/`)는 그 전에 만든 v2 그대로이고 새 코어 빌드 전까지 `build-web-data.mjs`를 다시 돌리지 않음. `selfcheck-sim` R7(멜로디 음 수)만 기준 쪽이 v3 레벨을 읽어 1건 실패.
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
| `setOffset(ms)`, `offset`, `latency()` | 수동 오프셋 설정·조회, `{auto, manual, comp, autoNow, settled, stable, pendingBegin, calibAutoNows}` (round-3 R11: auto = 이번 시도 시작 때 읽은 값, autoNow = 지금 값, settled = 잠금 해제 뒤 안정 대기 끝) |
| `calibInfo()` | (round-3) 보정 화면 `{phase: wait/tap/done/kept, base: 첫 똑딱 예약 오디오 ms, beatMs, filled, rounds, retries, autoNows}` |
| `show(name)` | `title` `levels` `settings` `calib`(첫 실행) `calibRedo` `pause` `confirm` |
| `calibTap(diffMs)`, `calibSimulate(rounds)`, `skipCalibration()` | 보정 화면에 (탭−박) 값 넣기 / 보정 계산만 / 보정 건너뛰기 |
| `lateHint()`, `save()`, `layout()`, `ads` | 표지 상태 / 저장값 / 화면 배치 / 광고 어댑터 |

`?test=1`: 오디오를 만들지 않고 게임 시간은 `step`으로만 갑니다. 화면 그리기는 일반 모드와 같은 코드입니다(랜덤 연출 없음). `?lang=en`으로 영어.

## 자체 확인 도구
- `node projects/rhythm-01/tools/selfcheck-sim.mjs`: 엔진 ↔ judge.mjs 대조(10레벨 × 완벽·무입력·박마다·σ25~90 봇 800세트), 재시작 1.08 s, 연습 체크포인트, 밀림 감지, 보정 계산.
- (round-3 북길) `selfcheck-sim`: v3 레벨 엔진 = judgeAttempt(8030묶음) + 콤보 = grades.length(K1), 연습 부활(R21), 화면 규격 road.js = layout.json 8화면, 멜로디 v3·콤보 화음 자리 = sound-check. `selfcheck-browser` 6절: 화면 규격 = layout.json, T1 손가락, 글 자리 ko/en, cards-r3, 콤보 켬/끔 봇 재판정 불일치 0(K1), 콤보 aria·화음·끊김.
- `PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/rhythm-01/tools/selfcheck-browser.mjs [--quick] [--out 폴더] [--port 8340~8379]`: (round-3) R11 자동 지연 바뀜 흉내 첫 실행 보정·재시작 다시 읽기, R13 준비 직후 튜토리얼 글, R16 영어 긴 이름 검사 추가. 설치된 Edge(`--channel msedge`)로 테스트 모드 10레벨, 일반 모드 실시간 10레벨(오디오 켜짐), 실제 마우스 레벨 1·2, 4해상도 화면 스크린샷·버튼 검사, 저장 유지, 보호자 문, 백그라운드 일시정지.
