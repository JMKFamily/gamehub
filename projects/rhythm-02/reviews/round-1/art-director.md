# 리뷰: art-director · round 1

- 대상: `games/rhythm-02/` (Tossaloft / 높이통통, 1-3 빌드). 채점 영역: 시각·사운드(가중 20 %).
- 이번 리뷰에서 쓴 파일은 이 리뷰, 보고서, `Docs/README.md` 한 줄뿐입니다. 30-art·assets·도구·빌드는 고치지 않았습니다(지시대로). 서버·브라우저는 띄우지 않았고, QA 스크린샷 196장, selfcheck 104장, 빌드 코드, `parts/*.json`, 그리고 node 계산(빌드 `js/layout.js geom()`를 그대로 import)으로 판단했습니다.

## 확인한 것
- 읽은 파일: `.claude/agents/art-director.md`, `harness/criteria.md`(시각·사운드 절 전부, 대상 연령, 원본 보호), `harness/insights.md` 전부, `harness/templates/review.md`·`report.md`, `projects/rhythm-02/30-art.md` 전부, `DEV_NOTES.md`(N1~N19), `Docs/orchestrator/2026-11-17-1-2-cross-review-decisions.md`(D1~D18), `reviews/round-1/qa.md`, `parts/sound.json`·`shots.json`, 빌드 `js/layout.js`·`render.js`(구름)·`audio.js`(합성·잡음)·`main.js`(HUD·튜토리얼 글 자리)·`style.css`, `data/layout.json`(cloud·hud·text_slots), `assets/sound.json`(소리 층), `tools/art/sound-check.mjs`(합성·잡음·음 높이 집합).
- 본 스크린샷(`reviews/round-1/shots/`):
  - 4해상도 플레이·튜토리얼: `{360x640,412x915,640x360,1280x720}-ko-05-play.png`, `*-ko-15-l1-finger.png`, `360x640-en-15-l1-finger.png`, `640x360-en-15-l1-finger.png`, `1280x720-en-15-l1-finger.png`
  - 실패·클리어·결과: `360x640-ko-06-fail-late.png`, `360x640-ko-07-fail-retry.png`, `360x640-ko-09-clear.png`, `640x360-ko-09-clear.png`, `360x640-ko-10-result.png`, `640x360-ko-10-result.png`
  - 메뉴: `360x640-ko-01-title.png`, `360x640-ko-02-levels.png`, `360x640-ko-03-start.png`, `640x360-ko-08-pause.png`, `640x360-ko-12-guardian.png`
  - notext: `360x640-notext-play-L1.png`, `640x360-notext-02-levels.png`, `360x640-notext-card-L3.png`, `360x640-notext-card-L6.png`, `640x360-notext-card-L7.png`, `360x640-ko-14-card-l1-first.png`, `640x360-ko-04-card.png`
  - selfcheck: `parts/selfcheck/360x640-ko-12-twoballs.png`, `parts/selfcheck/640x360-ko-13-fail-early.png`
  - rhythm-01 비교(실제 빌드 화면): `projects/rhythm-01/reviews/round-2/shots/360x640-play-l1-countin.png`, `360x640-levels-new.png`
- 참고한 metrics: `parts/shots.json` px(카드 속 공 렌더 18~38 px), `parts/sound.json`(빌드 OfflineAudioContext 렌더), `parts/signal.json` 요약(qa.md 15), `node tools/art/check-all.mjs` 다시 실행 **5/5 OK**.
- node 계산(빌드 `geom()` 그대로): 구름 윗선 y / 진행도 막대 y — 360x640 **19.9 / 18~30**, 412x915(safe 24) 56.6 / 42~54, 640x360 **6.0 / 18~30**, 1280x720 **6.0 / 18~30**. 구름 통 꼭짓점 공 윗점 y = 10(safe 0 해상도 공통).

### 반드시 볼 것 점검표
| 항목 | 결과 | 근거 |
|---|---|---|
| 대비 4.5:1 | 통과. 공/바탕 최소 4.93, 북/바탕 5.69(palette 230쌍). 화면에서도 공·북이 가장 먼저 읽힘 | `palette.mjs` OK, `*-05-play.png` |
| 실루엣 구분(공·북·위험) | 통과. 원(공)·가로 납작 둥근 사각(북)·평평한 아랫변 구름. 위험 요소 대신 "놓치면 북 옆으로 굴러 떨어짐"이 모양으로 보임. 장소 실루엣은 아주 옅어 판독을 방해하지 않음 | `360x640-ko-06-fail-late.png`, `640x360-ko-13-fail-early.png` |
| 비트와 화면 | 통과. 곡 음 ∩ 놓침 구역 위반 0(sound-check, balance 검증기), 손가락·`tut_tap` ∩ 다음 위험 구간 0 ms(간격 82~122 ms) | qa.md 15, check-all |
| 화면 고정 UI ↔ 게임 그림 겹침(4해상도) | **부분.** 손가락·튐 선·↻은 카드·멈춤 판과 겹치지 않음. 그러나 ① HUD 진행도 막대가 구름을 가로지름(3해상도, 이슈 1) ② `tut_tap` 글(DOM)이 구름 외곽선을 가로지름(360x640 en, 640x360 ko·en, 이슈 2) | 이슈 1·2 |
| notext 공 ≥ 16/24 px, 레벨 카드 글 없이 구분 | 통과. 카드 속 공 18(360x640)~38 px, 플레이 공 d 24~44, 판정 대상(북) 76.8~140.8 px. 레벨 카드는 바탕·테두리·실루엣(L2 모래더미·세모, L3 큰 구름, L4 그네)으로 구분 | `parts/shots.json` px, `640x360-notext-02-levels.png` |
| 튜토리얼 그림 = 첫 등장 실제 모양 | 통과. `card_bounce` 손가락 = 북 오른쪽 바닥(실제 손가락 자리와 같음), 북·공·튐 선 같은 함수. `card_three` = 앉은 공 → 3박 → 손가락(실제 첫 등장과 같음). 세로판 구름 윗부분 잘림은 이슈 5 | `360x640-ko-14-card-l1-first.png`, `640x360-notext-card-L7.png` |
| 소리 크기 순서(빌드 렌더) | 통과. 탭 − 가장 큰 효과음(clear) **7.72 dB** ≥ 1, 탭 RMS − 곡 박 RMS **8.77 dB** ≥ 6, 탭 − 곡 박 최고값 7.48 dB | `parts/sound.json` |
| 실패 연출(30-art 7-1·D9) | 통과. 늦음 = 북 오른쪽으로 굴러 떨어짐, 일찍 = 북 왼쪽 옆으로 비껴 떨어짐(가죽에 안 닿음), 첫 실패만 ↻(북 위), 글 없음, 먼지 없음 | `360x640-ko-06/07`, `parts/selfcheck/640x360-ko-13-fail-early.png` |
| 클리어 연출(7-3·D10) | 통과(색 1건 minor). 공이 스스로 크게 떠 구름 속에 머묾, 구름 cloud → accent, 등급 칸 늘 3칸 점선 → 채움, 결과 글·버튼은 등급 줄 아래(N5) | `360x640-ko-09/10`, `640x360-ko-09/10`, 이슈 4 |
| 번쩍임·흔들림 | 없음. 화면 흔들림 0, 전체 밝기 변화는 1 s 섞기뿐, 딱 glow는 북 가죽 0.15 s | 코드 `render.js`, 스크린샷 |
| rhythm-01과 헷갈림 | **헷갈리지 않음**(아래 별도 절) | rhythm-01 round-2 shots |
| 약한 아트 컨셉 | 유지. 단색 면 + ink 외곽선, 얼굴·캐릭터·질감·그라데이션 없음, 장식은 옅은 기본 도형 3개 이하 | 전 스크린샷 |

### rhythm-01(Tickadrum)과의 구분 — 실제 빌드 화면으로 재확인 (메인 세션 요청)
- 화면: rhythm-01 = **어두운 바탕 + 화면 가운데 큰 원 궤도 + 노란 별 + 하늘색 공(꼬리)** + 아래 점선 엄지 받침(`rhythm-01/reviews/round-2/shots/360x640-play-l1-countin.png`). rhythm-02 = **밝은 파스텔 바탕 + 화면 아래 납작한 파란 북 + 붉은 공 하나가 세로로만** + 위 흰 구름(`360x640-ko-05-play.png`). 흑백 썸네일 구도(가운데 원 vs 아래 가로 받침 + 위 구름)부터 다름.
- 레벨 선택: rhythm-01 = 어두운 카드 + 글 이름 + 자물쇠 + 점(`360x640-levels-new.png`), rhythm-02 = 밝은 카드 + 장면 그림 + 등급 구름 3칸, 글 없음(`360x640-ko-02-levels.png`).
- 소리: rhythm-01 카운트인 "똑딱"(사인 1200/1600 Hz + 잡음 딸깍) ↔ rhythm-02 받침 쉼 "콩"(잡음 없는 삼각, 콩-쿵 번갈아, 공 까딱과 같은 순간). sound.json에 tick 이름 0, 받침 쉼 잡음 층 0(sound-check 검사).
- 남은 공통점: 위쪽 진행도 막대 + 멈춤 버튼(허브 공통 UX, 멈춤 위치도 rhythm-01 오른쪽 / rhythm-02 왼쪽으로 다름), 북이라는 낱말. 헷갈릴 수준 아님.

### DEV_NOTES 확인 결과 (art 담당 N 항목)
| # | 판단 |
|---|---|
| N1 메뉴 바탕 = 테마 bg1 | **승인.** 목업 `#F4F1EA`는 palette에 없는 값이라 bg1이 맞음. 레벨 선택(level01 bg1)도 밝은 연두로 플레이와 같은 집. 30-art 11절에 반영 예정(다음 수정 때) |
| N2 레벨 시작 판 이름 aria만 | 승인(목업이 최신). 30-art 11-1 문장은 다음 수정 때 바로잡음 |
| N5 결과 글·버튼 = 등급 줄 아래 | **승인.** 360x640·640x360 모두 큰 구름·등급 칸·글·버튼이 겹치지 않음. 목업보다 나음 |
| N6 등급 칸 1.4배(0.9d × 1.4), 간격 1.35 | **승인.** 640x360에서 약 30 px로 레벨 선택 칸(18 px)보다 크고 또렷함. 30-art 7-3 "0.9d"를 1.26d로 고침 예정 |
| N7 카드 화면 여백 16 px 코드 상수 | 승인. 다음 수정 때 `layout.json`에 `card.screen_margin_px`로 올림(art 담당) |
| N8 결과 "다음" 바로 시작 | 승인 |
| N13 첫 실패 ↻ = 레벨 들어와 처음 실패 1회 | 승인 |
| N14 실패 경로 세부 | 승인. 늦음 오른쪽·일찍 왼쪽 끝 모습이 30-art 7-1과 같음 |
| N15 공 2 들어옴·나감 배분 | 정지 화면으로는 확인 못 함(들어옴 순간 프레임 없음). 다음 라운드 프레임 필요(이슈 7) |
| N17 레벨 카드 80×83(360x640) | 승인(≥ 48, 그림 판독 됨) |
| N19 HUD 페이드 globalAlpha | 승인(전환 중에만, 정지 화면 투명도 없음) |

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | **major** | art-director (game-developer) | **HUD 진행도 막대가 큰 구름을 가로지름 — QA 이슈 5는 360x640만이 아니라 4해상도 중 3곳.** 구름 윗선 y 19.9(360x640)·6.0(640x360)·6.0(1280x720)이 막대 y 18~30보다 위라, 막대가 구름 윗부분을 자르고 360x640에서는 혹 사이 오목한 이음매 두 개가 막대 바로 밑에 "^" 모양 잔선으로 남음(구름이 깨진 물체로 보임). 시도 점(y 42~50, x 72~)도 360x640 구름 왼쪽 외곽선 위에 걸침. 원인은 **30-art 4-1·`layout.json cloud._shape`의 "HUD는 구름 위에 그림(구름 윗부분이 진행도 막대 뒤로 가도 됨)"** — 내 기획이 허용한 것이고, 빌드는 그대로 구현함. 구름은 L3 기믹(구름 통)의 주인공 물체라 장식보다 무게가 큼. criteria 기술 "360x640에서 HUD와 게임 화면이 잘리지 않음", 시각 "화면 고정 UI와 게임 좌표 그림 겹침 없음"에 걸림 | `shots/360x640-ko-05-play.png`(막대 밑 잔선 x≈150·218), `640x360-ko-05-play.png`, `1280x720-ko-05-play.png`, 비교 `412x915-ko-15-l1-finger.png`(간격 있음). node: 빌드 `geom()` 구름 윗선 19.9/56.6/6.0/6.0 vs 막대 아래 30/54/30/30 | **구름 윗선 하한을 HUD 띠 아래로**(30-art 4-1 문장 삭제, `layout.json cloud.top_min` 추가, art가 30-art·layout.json·`layout.mjs` 검사 수정 → 빌드는 `geom()`만 따라감): 세로 = `hudH`(막대 + 시도 점 줄 아래, safeTop 포함), 가로 = 막대 아래 + 6 px(가로에서 시도 점은 구름보다 왼쪽). 구름 높이 = 구름 아랫선(0.9·Hp, 그대로) − 윗선, 너비 = min(2.6·h, 0.62·W). 계산값: 360x640 h 63 (2.25d, 너비 164), 412x915 h 101.5, 640x360 h 48 (2.0d, 너비 125), 1280x720 h 121.5. Hp·apex_budget·구름 아랫선·balance 수치는 **바꾸지 않음**. 구름 통 꼭짓점 공 윗점(y 10)이 새 구름 윗선보다 위로 나오므로 **구름 통 비행 중 공은 구름 윗선 위를 그리지 않음**(clip, 그림자는 그대로) — 숨는 규칙(공 아랫점이 구름선 위면 숨음)은 그대로. 검사 추가: 4해상도 구름 윗선 ≥ HUD 띠 아래, 구름 높이 ≥ 1.8d |
| 2 | minor | art-director (game-developer) | **L1 튜토리얼 글 `tut_tap`(화면 고정 DOM, top = hudH + 4, 전체 너비)이 구름 외곽선을 가로지름.** 360x640 en "Ball lands on the drum: tap!"이 구름 좌우 외곽선 밖으로 나감, 640x360 en은 구름 아래 외곽선이 글자 가운데를 지나감, 640x360 ko "톡!"이 아래 외곽선에 닿음. 412x915·1280x720은 구름 안에 들어감. 30-art `text_slots`에 `tut_tap` 자리가 없어 빌드가 정한 자리(기획 빈칸, art 책임) | `shots/640x360-en-15-l1-finger.png`, `360x640-en-15-l1-finger.png`, `640x360-ko-15-l1-finger.png`, 비교 `412x915-ko-15-l1-finger.png` | `layout.json text_slots.tut_tap` 추가: **구름 아랫선 아래 0.3d, 가운데, 최대 너비 W − 32, 한 줄 넘치면 두 줄(keep-all)**. L1 첫 접촉 공 꼭짓점은 약 0.3·Hp라 0.85·Hp 높이의 글과 겹치지 않음(layout.mjs가 L1 손가락 구간 공 윗점 < 글 아랫선 검사). 이슈 1을 고치면 구름이 작아져 지금 자리(구름 안)는 더 좁아지므로 함께 옮김 |
| 3 | minor | art-director (game-developer: `noteOf` 공용화) | **QA 이슈 4(sound-check ↔ 빌드 렌더 소리별 최대 2.7 dB 차) 원인 정정과 수정안.** QA 진단 중 "tap_empty는 잡음 생성기 차이"는 틀림 — `sound.json` tap_empty는 사인 1층(잡음 없음). 원인은 3가지: ① **잡음**: sound-check mulberry32 vs 빌드 LCG(`s·1664525 + 1013904223`) → 잡음 딸깍 층이 있는 tap_perfect/good/pass만(tap_good −1.0 dB) ② **음 높이 집합**: sound-check는 동기 최저·최고 도수 2개, 빌드 측정은 실제 곡 모든 음 → mel_bell +2.56, bass +1.17 ③ **짧은 어택 + 빠른 감쇠의 표본 최고값 민감도**: tap_empty(어택 1 ms, 감쇠 60 ms ≈ 1 dB/ms, 220 Hz)·rest_b(어택 1 ms, 감쇠 80 ms, 저음)는 최고값이 어택 끝 순간의 파형 위상·자동화 처리(브라우저 a-rate 램프, 시작 시각의 표본 이하 오차)에 따라 1~3 dB 흔들림. 크기 규칙은 빌드 값으로 여유 있게 통과(7.72·8.77 dB)라 소리 자체 문제는 아님 — 문서 측정값이 빌드와 다른 것이 문제 | `reviews/round-1/parts/sound.json` per_sound, `games/rhythm-02/js/audio.js` 36~41줄(LCG), `projects/rhythm-02/tools/art/sound-check.mjs` 28~29줄(mulberry32)·205~215줄(음 높이 2개), `assets/sound.json` tap_empty·rest_b 층 | ① `sound.json`에 `noise_gen: "lcg32"`(식 명시)를 두고 빌드·sound-check가 같은 식을 씀 ② `noteOf`를 `music.mjs`로 옮겨(빌드 `audio.js`에서 import) sound-check가 `musicOnsets` 전체 음(L10 되부름 포함)으로 소리별 최댓값을 잼 ③ 최고값 정의를 "표본 최고값" 대신 **5 ms 창 RMS 최댓값 + 3 dB**(위상에 덜 민감)로 바꾸거나, 그대로 두되 sound-check에 빌드 렌더값 대조 허용 오차 ±1 dB를 둠 ④ 30-art 9-3 표·`sound.json verify.measured`의 원본을 **QA 빌드 OfflineAudioContext 렌더값**으로 하고 node 값은 "도구 계산(참고)"로 표기 |
| 4 | minor | art-director (game-developer) | **결과 화면에서 큰 구름이 accent로 완전히 물들어 등급 구름 3칸과 같은 색** → 같은 색 구름 4개가 한 덩어리로 보여 "구름 4개"로 셀 수 있음. 30-art 7-3이 "등급 구름은 플레이 구름과 색(accent 채움)이 다름"이라 했지만 큰 구름도 accent가 되어 그 구분이 사라짐(크기·자리 차이만 남음). 또 섞기 도중(1 s) RGB 직선 섞기라 흰색 → 짙은 녹색 사이에 탁한 회녹색 단계가 보임 | `shots/360x640-ko-10-result.png`, `640x360-ko-10-result.png`, `360x640-ko-09-clear.png`(섞기 중 회색) | 큰 구름 섞기 끝값을 **mix(cloud, accent, 0.35)**(연한 테마색)로 바꾸고 등급 칸만 진한 accent로 둠. 30-art 7-3·`layout.json clear_timeline`에 끝값 비율 추가, palette 검사에 "연한 큰 구름 / 등급 칸 accent 대비 ≥ 2"를 넣음 |
| 5 | minor | art-director | **세로판 그림 카드의 구름 윗부분이 칸 위 테두리에 잘림**(`card_cloud_portrait`: 세 칸 모두 구름 혹이 칸 밖으로 나가 평평하게 잘림). 가로판은 정상. 카드 그림은 첫 등장 실제 모양과 같아야 하는데 플레이 구름과 실루엣이 다름 | `shots/360x640-notext-card-L3.png`, 비교 `640x360-ko-04-card.png` | `cards.mjs` 세로판 칸에서 구름 높이를 칸 높이의 0.22 이하로 줄이거나 아래로 내려 혹 위 여백 ≥ 4 px. cards.mjs 검사에 "모든 그림 요소 bbox ⊂ 칸" 추가 |
| 6 | minor | art-director | L6 시소 실루엣의 판이 세모 받침과 떨어져 공중에 떠 있음(판 y≈462~468, 받침 꼭짓점 y≈485). 장식이지만 "떠 있는 막대"가 플랫폼처럼 읽힐 여지 | `parts/selfcheck/360x640-ko-12-twoballs.png` | `palette.json themes.level06.silhouette` 판 y를 받침 꼭짓점에 맞춤(palette.mjs 생성 식 수정) |
| 7 | minor | qa-engineer (art-director 확인) | criteria 시각 rhythm-01 round-2 항목 "전환 중 앞뒤 상태에 없는 선·면이 생기지 않음"을 이번 라운드에서 아무도 프레임으로 보지 않음. rhythm-02 전환: 구름 cloud → accent, 바탕 단계 섞기, HUD 0.2 s 페이드(globalAlpha), 재시작 때 공 0.6 → 1.0 나타남, 공 2 들어옴·나감(N15), 손가락 사라짐 | qa.md 검사 표에 해당 항목 없음 | round-2 QA에서 위 6개 전환을 프레임 스캔(rhythm-01 북채 퇴장 방식). N15 들어옴·나감 프레임 3장(굴러옴·깡충·나감)도 shots에 추가 |

참고(이슈 아님):
- 두 공 정지 화면에서 두 공이 같은 높이로 보이는 순간(`parts/selfcheck/360x640-ko-12-twoballs.png`)은 2박 비행 두 개가 1박 어긋나 하나는 오르고 하나는 내리는 교차점(0.5박 지점)이라 "두 공 동시 하강" 규칙 위반 아님. 다만 정지 화면 스토어 스크린샷에는 이 순간을 쓰지 않음.
- QA 이슈 2(늦음 실패 연출 첫 프레임 2~3프레임)는 연출 모양에는 영향 없음. 30-art 7-1 쪽 변경 필요 없음.

## 잘 된 점
- 사진 한 장 판독: 4해상도 모두 "아래 파란 북 + 붉은 공 하나 + 위 구름"이 글 없이 읽히고, 탭 전에 공이 가죽 위에서 납작하게 기다리는 모습이 "내가 쳐야 올라간다"를 보여 줌.
- 실패 2종이 글 없이 모양으로 다름(일찍 왼쪽 옆으로 비껴 떨어짐 / 늦음 가죽 위에서 굴러 오른쪽으로), 첫 실패만 ↻, 먼지·번쩍임 없음.
- 레벨 선택이 글 없이 구분되고, 최고 진행도 막대 + 공 색 점, 등급 늘 3칸 점선이 잘 읽힘. L3 카드의 "큰 구름 + 반쯤 숨은 공"이 의도대로 보임.
- 빌드 소리 크기 순서가 오프라인 렌더로 여유 있게 통과(탭 − 효과음 7.72 dB, 탭 RMS − 곡 박 8.77 dB).
- rhythm-01과 화면·소리 모두 분명히 다름. 약한 아트 컨셉 유지.

## 점수
- 영역: 시각·사운드
- 체크 항목 통과: **8 / 10** + 부분 1 + 미확인 1 (harness/criteria.md "시각·사운드" 10개)
  - 통과(8): 위험(판정 대상 공·북) 대비 4.5 · 실루엣 구분 · 비트와 배치 · notext 공 ≥ 16 px·레벨 카드 구분 · 맞닿은 묶음 바깥 외곽선만(블록 없음 → 구름 혹 이음매를 바깥 둘레로만 그리는 것으로 적용, 통과) · 차례 신호 겹침 0 ms · 렌더 px 공 ≥ 16·판정 대상 ≥ 20 · 소리 크기 순서(빌드 오프라인 렌더)
  - 부분(1): 화면 고정 UI ↔ 게임 그림 겹침(손가락·이펙트는 통과, HUD 막대 ↔ 구름 3해상도·튜토리얼 글 ↔ 구름 외곽선, 이슈 1·2)
  - 미확인(1): 전환 프레임에 없는 선·면 없음(프레임 스캔 안 함, 이슈 7)
  - 공통: 대상 연령 "아트가 기본 도형·평면 그래픽 위주" 통과, 원본 보호 통과(레퍼런스·타 팀 모양·소리 없음, 자체 합성)
- 점수: **7.5 / 10** (통과율 (8 + 0.5) / 10 = 85 %에서 시작. 핵심 판독·소리·연출은 기획대로라 높게 보지만, 플레이 화면 전체 시간 동안 보이는 HUD ↔ 구름 겹침이 3해상도에서 나고 원인이 기획 문장이라 major 1건으로 −0.5, minor 6건과 전환 미확인을 더해 7.5. blocker 없음)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목:
  1. (art-director 제안) 게임 좌표로 그리는 **정지 장면 요소(구름·장소 실루엣 등)도** HUD 띠(멈춤 버튼·진행도 막대·시도 점)와 4해상도에서 겹치지 않고, 외곽선이 HUD에 잘리지 않음 (rhythm-02: 구름 윗선 ≥ HUD 띠 아래)
  2. (art-director 제안) 화면 고정 글(튜토리얼·토스트)은 **지원 언어 모두(가장 긴 언어 기준)**에서 게임 그림의 외곽선을 가로지르지 않음 — 글 자리는 30-art `text_slots`에 정의돼 있어야 함
  3. (art-director 제안) 효과음 크기 표의 원본은 **빌드 OfflineAudioContext 렌더값**이고, art 도구 계산값과 소리별 차 ≤ 1 dB (잡음 생성기·음 높이 집합(실제 곡 전체)·최고값 정의가 같음)

VERDICT: REVISE
