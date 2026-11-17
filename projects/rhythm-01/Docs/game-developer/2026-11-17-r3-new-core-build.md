# round-3 새 코어 "북길" 웹 빌드 (R18~R25 + 콤보 + 판정 이름·%)

- 날짜: 2026-11-17
- 역할: game-developer
- 프로젝트: rhythm-01 (똑딱북: Tickadrum — 작업 중 요청자가 이름 확정, slug·폴더 그대로)
- 단계: 1-3 round-3 (결정 R18~R25)

## 요청 받은 일
오케스트레이터: 요청자 지시 "지오메트리대시처럼 몰입감… 오른쪽에서 다가오는 여러 패턴으로 짧은 순간 판단… 리스크가 반복적이지 않게" + 전 프로젝트 "콤보 시스템(DJMAX 판정 구조 벤치마크)"에 따라 플레이 화면을 "북길"로 바꾸고(R18~R25), 콤보(balance `combo`), 레벨 v3, 문자열 새 키, 성능(6배 스로틀 1% low ≥ 45, 새 브라우저 3회), 자체 검사 갱신, 바뀐 훅 표. 작업 중 전달: ① 요청자 추가 지시 "판정 이름과 퍼센트까지" — 처음엔 구조만, 규격 확정(9f9cc5c) 뒤 범위에 넣음 ② insights QA·측정 새 줄(창 값 유한성, 경계 반올림, 앞 탭 어긋남 + 창 밖 탭) ③ 사용 한도로 멈췄다가 22:51 재개 ④ 이름 확정·대상 12세(balance 데이터 재조정 중, 스키마 그대로 → 끝나면 `build-web-data.mjs`만 다시). 규칙: 5~6세(12세) 단순 규칙, 약한 아트, 원본 보호, 외부 리소스·결제·광고·계정 금지, git 실행 자체 금지, 기획·assets·levels·verify-levels·tools/sim·qa-round·harness·games.json 수정 금지, 포트 8340~8379·자기 PID만 종료.

## 한 일
1. 읽음: 결정 R18~R25·감시 절, 00-benchmark 8절, 20-balance 17장(17-8·17-13·17-14), 30-art 16절(16-1~16-13), 10-lore R3 절(R3-7·R3-12), `balance.json`(path_v3·preview·combo·accuracy·guardian_calibration·audio_latency), `assets/layout.json`·`road-layout.mjs`·`sound.json`(melody_r3·combo_r3)·`palette.json`(road_r3·judge_label_r3)·`cards-r3/`, `harness/benchmarks/djmax-judgement.md`, `insights.md`, `criteria.md`, 옛 빌드·DEV_NOTES.
2. **플레이 화면 "북길"**(`js/road.js` 새, `render.js` 다시 씀): 화면 규격 = `layout.json` 식(빌드 도구가 rule 을 art.json 으로 복사, 함수 문자열 2개는 숫자 인자로 바꾸고 d 1~400 대조), 가로 길 + 왼쪽 판정 선(6 px + outline)·판정 북(카운트인 점 4개·물결) + 박마다 착지하는 공, 별은 W + r 에서 들어와 `x = 판정 선 + 속도 × (별 시각 − 지금)`(판정과 같은 보정 시계), 정박 눈금·마디 표가 함께 흐름, 판정 3등급 이펙트(16-3)는 길과 함께 흐름, 실패 = 길 멈춤·두 조각·속 빈 공·0.88 s 부터 공 다시 커짐, 클리어 = 길 물듦·등급 북(판정 북 높이). 원 궤도·12시 공·보여 주기 마디·북채 신호 제거. 타이틀·레벨 카드 줄 1·불러오기 그림도 길 모양으로.
3. **판정·지연 보정·재시작 유지**: `js/judge.js` = `tools/sim/judge.mjs` 바이트 동일(빌드 도구 복사), `calib.js` R11 함수 그대로, 재시작 1.08 s·카운트인·보호자 보정 하한 10 ms(balance.json 에서 읽음). 판정 로직 변경 필요 없음.
4. **레벨 v3**: `build-web-data.mjs`가 v3 아니면 중단, 엔진은 파생 bars/patterns, 미리 보기 박 가로·세로, 연습 체크포인트 = `practice.checkpoints[].beat`(부활 = 그 박 한 마디 앞 카운트인), 손가락 `cues`(`tut_drum_tap`, 판정 북 아래 칸), 그림 카드 `cards-r3/` 키 이름. 곡 = `melody_r3`(outro 마디 동기 없음, 숨 고르기 마디는 play 파트).
5. **콤보**: 값 = `grades.length`(실패 중 0), HUD 띠 점 10칸 + 표지, 2부터, 튐 120 ms(5 = 1.3배), 10·20 = 0.4 s 모임 + 표지, 20 = 색 조각 0.6 s, 끊김 = 실패 0.3 s 무음 ease-in 사라짐, 노랑·공 색 없음, 단계 화음 `combo_r3` 예약(실패·멈춤 취소). 대체 글 `role="meter"`·`aria-valuenow`·`aria-valuetext` 숫자만·aria-live 없음. `?combo=0` 끔.
6. **판정 이름·%**(작업 중 지시): `js/readout.js` = `tools/sim/bots.mjs` `accuracyPct`·`gradeFromPct`·`levelAccuracy` 같은 식, 시작 때 창 값 유한성 검사. 판정 글 = layout `judge_label` 자리·크기, 등급 색, 표지, 튐 80/유지 400/흐려짐 150 ms, 새 판정 바꿔 그림, 실패·클리어 사라짐, 손가락·tut 글 프레임에는 그리지 않음, (등급, %)마다 스프라이트로 미리 그림. 결과 화면 정확도·신기록 표지·최고 콤보(layout `result`, meter 대체 글), 기록 `bestAcc`·`bestCombo`.
7. **문자열**: 10-lore 7절 64 + R3-7 6 + R3-12 5 = 75 → 사용 71, 폐기 3·쓰지 않음 1은 빌드에서 빼고 DEV_NOTES "10-lore R3-7"에 사유. 부트 단계 `lang`·제목도 언어별.
8. **성능**: 옛 원인 대응을 새 화면에(미리 그리기·카드 해독 뒤 ready·버퍼 미리 할당·테마 층 한 프레임 먼저) + 새로: 정적 바탕을 뒤 캔버스 `#bgcv`로(매 프레임 화면 크기 drawImage 제거), 콤보 점 한 경로, 판정 글 스프라이트(큰 글자 strokeText 매 프레임 제거), `warmCode`에 콤보·판정 글·실패 장면.
9. **자체 검사**: `selfcheck-sim`·`selfcheck-browser` 새 코어로(아래), `serve.mjs` 기본 포트 8340. 저장 키 v3(레벨 기록 새로, 보정·소리 설정만 옮김).
10. DEV_NOTES "round-3 새 코어" 절(구조·결정 N-1~N-15·키·성능·훅 표), README 한 줄.

## 산출물
| 파일 | 내용 |
|---|---|
| `games/rhythm-01/js/road.js` (새) | 길 규격·판정 글·결과 자리(layout.json 식), 흐름 속도·별 x |
| `games/rhythm-01/js/readout.js` (새) | 판정 %·등급·레벨 정확도(bots.mjs 기준 식), 데이터 유한성 검사 |
| `games/rhythm-01/js/render.js` | 북길 그리기 전부, 콤보 줄, 판정 글 스프라이트, 뒤 캔버스 |
| `games/rhythm-01/js/engine.js` | v3 레벨, 연습 체크포인트(R21), 콤보 파생 |
| `games/rhythm-01/js/audio.js` | 멜로디 v3, 곡 v3, 콤보 화음 시각 |
| `games/rhythm-01/js/main.js`, `store.js`, `index.html`, `style.css` | 화면 흐름·배치(layout 값), 콤보·판정 글·결과 DOM·aria, 훅, 저장 v3, 부트 언어 |
| `games/rhythm-01/data/` | build-web-data 출력(levels v3, strings 71, art.json, music r3, cards-r3 10장) |
| `projects/rhythm-01/tools/build-web-data.mjs`, `selfcheck-sim.mjs`, `selfcheck-browser.mjs`, `serve.mjs` | 위 3·4·6·7·9 |
| `projects/rhythm-01/DEV_NOTES.md`, 이 보고서, `Docs/README.md` 한 줄 | |

## 검증 결과
- `node projects/rhythm-01/tools/selfcheck-sim.mjs`: **8175/8175 OK** — v3 10레벨 엔진 = `judgeAttempt`(완벽·무입력·박마다·σ25~90 봇 8030묶음), K1 콤보 = grades.length·실패 0 어긋남 0, 재시작 1.08 s·실패 → 다음 별 ≤ 6 s, 연습 부활(체크포인트 박 한 마디 앞 카운트인 4박, 다음 별 ≥ 6박), 손가락 T1, 보정 계산(R23 10 ms 포함), 화면 규격 road.js = layout.json 8화면 값 1280개 다름 0(판정 글·결과 자리 포함), 멜로디 v3 275음 = sound-check(outro 동기 0, 별 시각 시작 0), 콤보 화음 자리 19개 = sound-check, **판정 % 빌드 = bots.mjs 기준 49만 점 다름 0·% → 등급 불일치 0·레벨 정확도 다름 0**, 창 값 없음 → 시작 오류, 앞 탭 어긋남 + 창 밖 탭 실패 = judgeAttempt.
- `selfcheck-browser`(Edge 헤드리스, 포트 8360): 테스트 모드 40/40·무입력 재시작 10/10, 실시간 10/10(|e| ≤ 2 ms), 실제 마우스 L1·L2 한 번에 클리어(−7 ~ +9 ms), 화면 규격 4해상도 = layout.json, 카드 cards-r3(세로 _portrait), 손가락·tut 글 자리(ko/en 4해상도 잘림 0), **K1 콤보 켬/끔 σ70 봇 120시도씩 재판정 불일치 0**, 콤보 1~21 값·2부터 표시·meter "이어서 친 별" valuetext 숫자만·화음 10·20 예약·실패 뒤 0, **판정 글 4해상도 × ko/en: tut 글과 같은 프레임 0·% = 기준 식·550 ms 뒤 사라짐·새 판정 바꿔 그림·aria-live 2개(신기록·보정 알림만)**, 결과 정확도 90 % → 다시 100 % 신기록 표지·최고 콤보 18·연습 숨김, R8·R9·R13·R16 통과, 버튼 겹침 0, **콘솔 에러·경고 0, 외부 요청 0**. 실패 1건: **R11 보정 오프셋 60.2 ms(사람 +45, 기준 ±10)** — `calib.js`·보정 흐름은 바꾸지 않았고 같은 세션 앞 실행은 54.8(통과), round-3 옛 빌드 때도 부하 52 %에서 +15.8 이 나온 페이지 안 합성 탭 흔들림. 공식 확인은 QA `--part firstrun`(CDP 마우스).
- `node scripts/validate.mjs`: **OK: 4 game(s)**. `js/judge.js` = `tools/sim/judge.mjs` **바이트 동일**. 빌드 외부 URL 0(w3.org 네임스페이스만).
- `node projects/rhythm-01/tools/verify-levels.mjs`(전체): **완료 못 함** — 레벨별 N8·B0 FAIL 뒤 `TypeError: Cannot read properties of undefined (reading 'by_level')`(verify-levels.mjs 340줄)로 멈춤. 원인: balance 가 대상 연령 12세 재조정 중으로 `verify-levels.mjs`(23:38 수정)가 아직 `balance.json`(22:53)에 없는 새 키를 읽음. 빌드 코드 문제 아님. C2 는 그래서 이번에 못 돌렸고, `js/calib.js`는 이번에 수정하지 않음(round-3 옛 빌드 C2 "2000묶음 다름 0" 때와 같은 파일). balance 재조정 뒤 `build-web-data.mjs` → verify-levels 전체 다시 필요.
- **성능 6배 스로틀(QA `qa-round.mjs --part perf --perf-runs 3`을 결과 폴더만 스크래치로 바꾼 복사본, 새 브라우저 3회, 시작·재시작 포함, DPR 3 포함)**:

  | 측정 | 코드 | 1% low ≥ 45 (회 1/2/3) | PC 부하(1 s 표본) |
  |---|---|---|---|
  | dev2 | 북길(판정 글 전) + 콤보 묶음 그리기 | 3/12 · 3/12 · **11/12** | 평균 57.6 %(최대 100) |
  | dev5 (최종 코드) | + 뒤 캔버스·판정 글 스프라이트 | 6/12 · 6/12 · 3/12 (15/36) | **평균 66.5 %, 중앙 64.9, p90 100** |
  | 대조 페이지 perfctl(게임 코드 없음, dev5 직후) | - | 4창 중 2창 실패(37.9, 17.1 · 최대 112 ms) | 같은 시간대 |

  - 기준(3회 모두 통과)을 **못 채움. 단 같은 시간대 게임 코드 없는 대조 페이지도 떨어지고 4.8 s 멈춤 같은 PC 전체 멈춤이 섞여 이 측정은 빌드 판정에 쓸 수 없음**(criteria round-2 줄: 떨어진 창은 대조 페이지로 원인 기록). 다른 프로그램(안드로이드 에뮬레이터 HD-Player 누적 CPU 28,700 s, 다른 세션의 verify-levels 등)이 계속 돌았음.
  - 부하가 낮았던 dev2 회 3은 11/12(남은 1창 1280x720 L1 시작 21.2, 131.6 ms 프레임 1개 — 새 브라우저 첫 시작).
  - 개발용 프로파일(같은 흐름, 실제 마우스, LoAF): 1280x720·412x915@3 L1 시작 10 s는 59.5 fps·스크립트 긴 프레임 0. 6배 스로틀 전체 12 s 중 게임 스크립트 약 0.7 s(최대 drawImage 108 ms → 뒤 캔버스로 없앰). L10@DPR3 에 `frame` 스크립트 60 ms 한 번(7.9 s 쯤, 콤보 10 단계·단계 화음 예약과 같은 때로 추정, 부하 57~74 %에서 재현 불안정).
  - 판정 글을 매 프레임 strokeText 로 그린 중간 코드는 412x915@3 L1 21~22 로 크게 떨어져서 스프라이트로 바꿈(그 뒤 개발 프로파일 59.5).
- 포트·PID: 8347~8360 중 개발 스크립트·qa 복사본·selfcheck 가 띄운 serve.mjs 만(스크래치 pids.log 기록), 모두 종료. 내 load 표본 스크립트도 종료. 끝난 뒤 8340~8379 LISTEN 0 확인. git 실행 0회.

## 바뀐 테스트 훅·화면 (QA `qa-round.mjs` 맞춤용 — 도구는 고치지 않음)
| qa-round 가 쓰는 것 | 북길 빌드 | QA가 맞출 것 |
|---|---|---|
| `layout().R·cx·cy·starR·ballR·band·bar·dotsY·titleHint` (shots 겹침 tut/orbit, N2 타이틀, 카드 lay ballD·starD, N12 손가락) | 없음. `layout()` = layout.json 형식 `judge_x, preview_px, star_d, star_r, road, ball{d,x,yRest,bounce,top}, drum, line, hud{bar,pause,attempt_y,combo,band_bottom}, finger, text_slot, thumb, silhouette_frame, judge_label, result` + `hand{x,y,size}`(손가락 칸), `calib{cx,cy,R}` | 겹침 검사 대상을 길 띠·판정 북·손가락 칸·text_slot·judge_label 로, 손가락 기대값 = `finger.s` = max(64, round(1.6 d)) |
| `CL[0].shows[0]` (shots `firstShowL1`), bots `along` shows | v3 는 보여 주기 별 0개 → `shows[0]` undefined | 보여 주기 없음 처리 |
| `frameInfo().malletOn·dashK`, 캔버스 translate 가로채기 북채 프레임 스캔(R14), 20-balance 6-4 북채 표 읽기 | 북채 없음, 두 값 늘 false·0 | 북채 검사 폐기 → 손가락(T1)·판정 글/tut 시간 배타 검사 |
| `data/svg/cards/card_star_tap.svg` (N17) | `card_drum_tap.svg`(+ `_portrait`), 옛 카드 파일 없음 | 키 이름으로 |
| `#tut` `data-t="tut_tap"`, 자리(세로 받침 위·가로 손가락 위) | `tut_drum_tap`, 자리 = `layout().text_slot`(14 px 굵게, 2줄 자리) | |
| `#cv` 픽셀(바탕 포함) | 정적 바탕은 뒤 캔버스 `#bgcv`, `#cv` 바탕 픽셀은 투명 | 픽셀 검사는 화면 스크린샷 또는 두 캔버스 합성으로 |
| 새 훅 | `road()`(속도·1박 px·미리 보기 s·겹침 ms), `starX(i)`, `combo()`(값·표시·화음 예약·aria), `frameInfo().combo·comboShown·label{grade,name,pct}`, `?combo=0` | 콤보 켬/끔 재판정(K1), 판정 글 %→등급 역산 |
| 결과 화면 | `#resultInfo` > `#resAcc`(meter result_accuracy) · `#resNew`(img result_new_best) · `#resCombo`(meter aria_streak_best) — 일반 모드 클리어만 | 접근성 트리 확인 |
| 저장 키 | `rhythm01.save.v3`(레벨 기록 새로, v2 보정·소리 설정 옮김) | 빈 저장소 첫 실행 흐름은 그대로 |
| 그대로 | `state·phase·levelIndex·progress·attempts·loadLevel·step·press·pressAt·autoplay·stars·judgeLog·history·summary·latency·calibInfo·show·calibTap·calibSimulate·skipCalibration·setOffset·lateHint·save·drawNow·nextStarPerfTime·ads`, 재시작 1.08 s·카운트인·R11 흐름 | |

## insights.md 적용
- 적용: 판정과 같은 보정 시계로 화면 그리기, 시작·재시작 1% low·미리 그리기, 테스트 훅 화면 = 일반 모드(콤보·판정 글 시간 = 게임 시계), 콤보 = grades 파생·켬/끔 불일치 0, 콤보 단계 = 실제 판정 수, 콤보 대체 글(meter·valuetext 숫자만·낭독 없음), 손가락 = 플레이어(판정 북) 기준, 화면 고정 글 자리 = layout text_slot·가장 긴 언어 확인, 소리·색은 JSON 원본, 자기 PID·포트 대역, QA 도구 값 하드코딩 금지(selfcheck 가 balance·layout 에서 읽음), 판정 % 창 값 유한성 검사·앞 탭 어긋남 + 창 밖 탭 실패 검사, 재판정 하네스는 시도 경계를 넘지 않게.
- **다름 보고(고치지 않음)**: insights "25/50/좋아 경계는 Δ를 0.001 ms로 반올림한 뒤 경계 이하" — 기준 `tools/sim/bots.mjs accuracyPct`는 반올림 없이 `d ≤ 경계`만 함. 빌드는 기준과 같게 반올림 없이 둠(QA 대조가 기준 함수와 같아야 하므로). 지금 레벨은 별 시각·창이 모두 박 길이 분수라 % → 등급 역산 불일치 0(selfcheck 49만 점, 경계값 ± 1e-9 포함)이지만, balance 가 반올림을 넣기로 하면 빌드도 같이 바꿔야 함(담당 balance).
- 적용 안 함: runner-01 물리·점프·블록 외곽선·광고 실측 항목(코어가 다름), "레벨 끝 13~30박 비우기"(balance 소관, 리듬 코어는 해당 없음 — 00-benchmark 8-5).

## 규칙 준수 확인
- [x] 원본 보호 (평면 띠 1줄·6 px 가는 판정 선·띠를 가로지르는 마디선 없음·판정 글은 자체 이름(딱이야/좋아/됐어)·네온/폭발/키 빔 없음, 30-art 16-8 금지 목록대로. 외부 URL 0)
- [x] 게임 선정·설계 원칙 (탭 1가지, 글 없이 시작하는 손가락 튜토리얼 유지, 기본 도형·단색)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정, git 실행 0회(--version 포함), balance·levels·20/30/10/00 문서·assets·verify-levels·tools/sim·qa-round·harness·games.json·scripts·다른 팀 폴더 미수정

## 문제·남은 일
- (major, qa-engineer·game-developer) **성능 기준 미확인**: 최종 코드 15/36(PC 부하 평균 66 %, 대조 페이지도 실패). 부하 낮은 때 QA `--part perf --perf-runs 3` + `perfctl` 재측정 필요. 그래도 떨어지면 다음 후보: L10 콤보 단계(화음 예약·점 모임) 프레임, 새 브라우저 첫 L1 시작 긴 프레임(1280x720).
- (major, balance-designer → 오케스트레이터) **verify-levels 전체 실행이 12세 재조정 중이라 멈춤**(TypeError by_level). 재조정 끝나면 `node projects/rhythm-01/tools/build-web-data.mjs`(데이터만) → verify-levels 전체(C2 포함) → `selfcheck-sim` 다시. 빌드 도구는 levels v3·strings 75/71·accuracy·layout 시간 값 일치를 검사하고 어긋나면 멈춤.
- (minor, qa-engineer) R11 자체 검사 오프셋 +15 ms(부하 때 합성 탭 흔들림, 이전 실행 +9.8 통과). QA firstrun ±10 ms 로 확인.
- (minor, art-director) 640x360 결과 화면: 정확도 자리(등급 북 왼쪽, layout result)가 판정 북 그림과 겹쳐 보임 — layout 검사 대상에 판정 북 없음.
- (minor, art-director) 콤보 20 색 조각(줄 위 12 px)이 시도 점 줄 높이를 지나감(0.6 s). 결과 숫자 0.6 → 1.0배 등장은 넣지 않음(DEV_NOTES N-15 이유).
- (minor, balance-designer) insights "Δ 0.001 ms 반올림 뒤 경계 이하"를 기준 `bots.mjs accuracyPct`가 하지 않음 → 빌드도 기준과 같게(반올림 없음). 지금 데이터 불일치 0. 기준을 바꾸면 빌드도 같이.
- (정보, lore-writer) 10-lore R3-a "aria-valuetext 없음" → R3-12-4·insights 대로 숫자만 넣음(대체). R3-6 "판정 북 위에 손가락" 문장은 art 16-1(아래)대로 구현.
- (정보, qa-engineer) `qa-round.mjs`는 위 "바뀐 테스트 훅·화면" 표대로 맞춰야 shots·bots·N17 파트가 돎(`L1.shows[0]` undefined 로 shots 가 멈출 것).

## 다른 팀에 줄 인사이트
- 캔버스에 큰 글자(40 px+ 굵게 + 바깥 테 strokeText)를 매 프레임 그리면 DPR 3·6배 스로틀에서 판정 직후 프레임이 25~50 ms 로 길어진다. 값이 몇 가지뿐인 글(등급 × %)은 기기 px 스프라이트로 미리 그려 drawImage + 배율만 바꾼다. 적용: game-developer(판정 이름·% 를 넣는 모든 팀).
- 정적 바탕을 매 프레임 화면 크기 drawImage 로 덮어 그리지 말고 뒤 캔버스(테마가 바뀔 때만 그림) + 앞 캔버스 clearRect 로 나누면 DPR 3 의 큰 텍스처 복사가 프레임마다 사라진다. 적용: game-developer.
- 테스트용 미리 돌리기 루프의 끝 조건에 재시작으로 바뀌는 값(songStartV 등)을 쓰면 무한 루프가 된다(부팅 멈춤, 콘솔 에러 0이라 원인이 안 보임 — CDP Debugger.pause 로 찾음). 끝을 먼저 상수로 정한다. 적용: game-developer.
