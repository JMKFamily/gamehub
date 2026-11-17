# 리뷰: lore-writer · round 1

- 대상: `games/rhythm-02/` (Tossaloft / 높이통통, 1-3 빌드). 빌드·기획 파일은 읽기만 했고, 10-lore·strings.json도 이번에는 고치지 않았습니다.
- 영역: 세계관·텍스트(가중 10 %)

## 확인한 것
- 읽은 파일: `.claude/agents/lore-writer.md`, `harness/criteria.md`(세계관·텍스트 6항목, 대상 연령, 원본 보호), `harness/insights.md` 전부, `harness/templates/review.md`, `projects/rhythm-02/10-lore.md`(7절 키 표, 6절 규칙, 8절 rhythm-01 구분), `strings.json`, `DEV_NOTES.md`(N1~N19, 4절 안 쓰는 키), `Docs/orchestrator/2026-11-17-1-2-cross-review-decisions.md`(D1~D18), `30-art.md` 8절·11절, `assets/layout.json text_slots`, `assets/mockup-*.svg`의 글 자리, `reviews/round-1/qa.md`.
- 빌드 코드: `index.html`, `style.css`, `js/main.js`(전체 문자열 경로: `T()`·`setTxt`·`setAria`·`icon()`·`boot()`·`applyTexts()`), `js/render.js`(캔버스 글 그리기 없음 확인), `tools/build-web-data.mjs` 5) 부트 블록.
- 본 스크린샷(`reviews/round-1/shots/`): 360x640·640x360 ko/en의 01 타이틀·02 레벨 선택·03 시작 판·04 카드·08 멈춤·10 결과·11 길게 누르기·12 보호자·13 소리 맞추기·14 L1 첫 카드·15 L1 손가락, notext 카드 L6·L7, 1280x720·412x915는 QA 자동 검사(넘침 0) 결과로 대신.
- rhythm-01 비교: `games/rhythm-01/data/strings.json`, `projects/rhythm-01/reviews/round-2/shots/360x640-card-l1.png`·`360x640-calib.png`·`360x640-gate-holding.png`.

### 직접 실행한 검사 (node만)
| # | 검사 | 결과 |
|---|---|---|
| A | 10-lore 7-9 검사(문서 표 = strings.json, 12자/6단어, 금지어, 카드 키 = balance, rhythm-01 겹침) | `doc 81 json 81 cards 8 =balance 8 \| card files 16/16 (참고) PASS` (1-2 때 0/16이던 카드 파일 16/16) |
| B | `games/rhythm-02/data/strings.json` = `projects/rhythm-02/strings.json` | 같음(JSON 비교) |
| C | 키 사용: 81키 중 코드·레벨 데이터(동적 `levelN_name`·`card_*`·`grade_N`·`clear_title_N`)에서 안 쓰이는 키 | `settings_reset` `confirm_reset` `confirm_yes` `confirm_no` `store_short` 5개 = DEV_NOTES 4절 이유와 일치(`levels_screen`은 격자 aria로 쓰임) |
| D | 하드코딩 문구: `js/*.js` 코드(주석 제외)의 한글·`fillText`·문자열 직접 대입, `index.html` 글 노드 | JS 0건. index.html은 `<title>Tossaloft</title>`(이슈 2)·`▼`(보호자 스크롤 표시, aria-hidden)뿐 |
| E | 브라우저(설치된 Edge 헤드리스, PC의 playwright-core를 `PLAYWRIGHT_CORE`로, `serve.mjs 8736`, 내 PID 38964만 시작·종료) | 아래 |

E 결과:
- `navigator.language` 자동 선택: ko-KR → ko(제목 "높이통통", html lang ko), en-US·ja-JP → en("Tossaloft"). `?lang=en`(ko-KR 기기)·`?lang=ko`(en-US 기기) 모두 바뀜. 캔버스 대체 글 `aria_play_area` 언어별로 맞음.
- 레벨 선택 접근성 트리: 격자 list 이름 "어디로 갈까요?", 카드 "잔디밭, 구름 둘" / "모래놀이터, 가 본 만큼" + progressbar "가 본 만큼"(값은 `aria-valuenow` 48) / "그네 터, 아직 안 해 봤어요" / "솜구름 하늘, 잠겨 있어요"[disabled], 밀림 표지 img "공을 보고 쳐요", 설정 "어른 설정", 막대 "길게 누르는 중". **글에 숫자 이어 붙임 0.**
- 레벨 시작 판 접근성 트리: 닫기·연습·눌러서 시작·그림 다시 보기 4개만. **레벨 이름·등급이 트리에 없음**(이슈 3).
- 불러오기 실패(balance.json 막음): 글 = `load_error`·`load_error_detail`(원본 그대로, ko/en), **↻ 버튼 내용 길이 0 → 화면에 버튼이 안 보임**, 탭 제목 "Tossaloft", en 기기에서도 html lang ko(이슈 1·2).
- 산출(스크린샷·접근성 출력)은 세션 임시 폴더에만 두었습니다(이 리뷰 외 레포 쓰기 금지). 재현: 위 조건으로 `?test=1` 저장소에 L1 등급 2·L2 최고 0.48을 넣고 `#levels`·`#start`의 `ariaSnapshot()`, `page.route('**/data/balance.json', abort)`.

### rhythm-01과 헷갈리지 않는지 (메인 세션 요청, 실제 빌드 화면으로 재확인)
- **게임 정체성 문구 겹침 0**: 타이틀·레벨 이름 10개·카드 8개·`tut_tap`·`aria_play_area`·클리어 4개·등급·`look_ball`·`aria_best`가 rhythm-01 strings와 KR·EN 모두 글자 하나도 같지 않음(검사 A ⑦). 같은 문구는 8-2 공통 UI 키(메뉴·확인·보정 흐름·불러오기)뿐이고, `sound_late` EN "Sound is late"(= rhythm-01 `latency_warn`)와 보정 흐름 4개(`sync_with_grownup`·`sync_progress` EN·`sync_kept`·`sync_redo`)도 그 목록 안.
- **rhythm-01 용어 0**: 별·궤도·북채·둥둥이·똑딱·박자/star·orbit·drumstick·tick이 빌드 문구에 없음("star"는 "Tap to **star**t" 부분 일치뿐). 보정 이름은 "소리 맞추기 / Sound timing"(rhythm-01 "박자 맞추기")으로 화면에서 확인(`360x640-ko-12-guardian.png`).
- **화면**: 밝은 풀밭 바탕 + 아래 납작한 파란 북 + 빨간 공(세로 튐) vs rhythm-01 어두운 바탕 + 궤도 원 + 별 + 북채. 레벨 카드도 글 없이 실루엣(풀·모래 더미·구름·그네) vs rhythm-01 이름 글이 있는 점 무늬 카드. 아이가 두 게임을 헷갈릴 만한 화면 글·그림은 찾지 못함.
- 참고(이슈 아님, art 판단 몫): 보호자 설정 그림(큰 사람 + 작은 사람)은 rhythm-01 보정 화면의 어른 표지와, 카드 다시 보기 그림(세 칸 필름)은 rhythm-01 레벨 카드의 같은 기능 그림과 모양이 가깝습니다. 둘 다 같은 뜻의 공통 UX이고 D11이 피하라고 한 모양(고리, 헤드폰+모래시계)은 아닙니다.

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | minor (우선) | game-developer | **불러오기 실패 화면에 ↻ 버튼이 보이지 않음.** 글은 "다시 해 주세요 / …다시 눌러 주세요"인데 누를 그림이 없어 글을 읽는 어른도, 못 읽는 아이도 막다른 화면이 됨. 아이콘 SVG를 JSON을 다 받은 **뒤에** 불러오므로(`loadAll` 39행) JSON 하나만 실패해도 `ICON.retry`가 빈 값 | `js/main.js:37-39`, `:901` `$('bootRetry').innerHTML = ICON.retry \|\| ''`; 직접 확인 balance.json 막음 → `bootRetry.innerHTML.length 0`, 화면에 버튼 없음(ko·en) | `build-web-data.mjs`가 `icon-retry.svg`를 부트 블록에 함께 넣고(부트 글과 같은 방식) 부트에서 그것을 씀. 10-lore 6절 9 "불러오기 화면은 strings 원본에서" 원칙과 같은 자리 |
| 2 | minor | game-developer | 부트 단계 언어 표시가 원본을 안 씀: `index.html`에 `<title>Tossaloft</title>`·`<html lang="ko">`가 고정이고, `boot()`는 `bootText`의 `title`을 넣어 두고도 쓰지 않음. 불러오기·오류 화면 동안 한국어 기기 탭 제목은 영문, 영어 기기 html lang은 ko(스크린 리더가 영어 오류 글을 한국어로 읽음). 정상 로드 뒤에는 `applyTexts()`가 바로잡음 | `index.html:2,7`, `js/main.js:888-904`(lang·title 설정은 908행, 로드 성공 뒤에만); 직접 확인 en-US 오류 화면 `htmlLang "ko"`, `title "Tossaloft"` | `boot()`에서 `bl`을 정한 직후 `document.documentElement.lang = bl; document.title = bootTxt[bl].title`. `<title>`은 빌드 스크립트가 부트 블록과 함께 써도 됨 |
| 3 | minor | game-developer | 레벨 시작 판의 레벨 이름 대체 글이 **실제로는 어디에도 안 읽힘**: `stCard`에 `aria-label = levelN_name`을 주지만 그 요소가 `aria-hidden="true"`. 등급(`stGrades`)도 aria-hidden이라 받은 등급도 없음. DEV_NOTES N2 "레벨 이름은 aria만"이 결과적으로 "없음" | `index.html` `#stCard aria-hidden="true"`, `#stGrades aria-hidden="true"`, `js/main.js:162`; 직접 확인 `#start` 접근성 트리 = 닫기·연습·눌러서 시작·그림 다시 보기 4개뿐 | `stCard`의 aria-hidden을 빼고 `role="img"` + `aria-label = levelN_name`, 등급은 깬 레벨이면 `grade_N` 이름의 img 하나(글에 값 잇지 않음) |
| 4 | minor | game-developer | 결과 화면 등급 구름(캔버스)에 대체 글 없음. 10-lore 7-2 "등급 대체 글은 받은 수의 `grade_N` 하나(카드·결과 공통)" 중 결과 쪽이 빠짐. `grade_N`은 레벨 선택 카드 상태로만 쓰임 | `js/main.js:323-334`(showResult에 grade 키 없음), `:82`(statusKey에서만 사용); `shots/360x640-en-10-result.png` | 결과 화면에 숨은 `role="img"` 요소(aria-label `grade_N`, 연습 클리어는 생략)를 두거나 `rText`에 붙임 |
| 5 | minor | game-developer (art-director 자리 결정) | `tut_tap` 글 자리가 HUD 바로 아래(`hudH + 4`)로 고정이라 플레이 구름과 겹침. KR은 구름 안에 들어가 읽히지만, **EN "Ball lands on the drum: tap!"은 360x640·640x360에서 구름 윤곽선을 가로지름**(글자 위로 선이 지나감). `layout.json text_slots`에 tut 자리 정의가 없음 | `js/main.js:490`; `shots/360x640-en-15-l1-finger.png`(글 x≈45~315, 구름 x≈67~293), `shots/640x360-en-15-l1-finger.png`("Ball" 위로 구름 왼쪽 선), 비교 `360x640-ko-15-l1-finger.png` | art가 `layout.json text_slots`에 `tut_tap` 자리(구름 아래 빈 띠 또는 글 뒤 바탕 상자)를 정하고 dev가 그 값을 씀. 4해상도 × ko/en 스크린샷으로 윤곽선 겹침 0 확인 |
| 6 | minor | game-developer (lore-writer 문서 함께) | 레벨 카드 대체 글에 `aria_best`를 **상태 키로** 써서 "모래놀이터, 가 본 만큼" 다음에 같은 이름의 progressbar "가 본 만큼"이 한 번 더 읽힘(값 없는 글 + 중복). 10-lore 7-2의 상태 키는 `levelcard_new`·`levelcard_locked`·`grade_N`·`practice_clear`이고 `aria_best`는 progressbar 이름 | `js/main.js:84`, `:94-99`; 직접 확인 접근성 트리 | 해 봤지만 못 깬 레벨은 버튼 이름 = `levelN_name`만 두고 progressbar(`aria_best` + `aria-valuenow`)가 값을 말하게 함. 상태 키 정의는 lore가 10-lore 7-2에 적음(이슈 8) |
| 7 | minor | game-developer (art-director) | 작은 대체·보조 연결 누락 2건: ① `btn_settings`에 `aria-describedby` = `guardian_hold`가 없음(짧게 눌렀을 때만 `lHint`가 잠깐 보임) ② `audio_unlock`("톡 하면 소리가 나요")이 10-lore 7-1 그림 힌트(스피커 + 손가락) 없이 글만(N10대로 드물게 보임) | `index.html` `#lGate`, `#stUnlock class="txt small"`; `js/main.js:695`, `:697` | ① `lGate`에 `aria-describedby="lHint"` ② `stUnlock` 옆에 `sound_on` 아이콘(art 아이콘 재사용) |
| 8 | minor | lore-writer | **10-lore 7절 "구분" 칸이 1-2 뒤 art·빌드 합의와 어긋남**(빌드는 30-art·layout.json·목업을 따랐고 문구 글자는 모두 같음): `levelN_name` "화면 - 레벨 카드 보조 글" → 실제 레벨 선택은 aria만, 화면 글은 결과 맨 위(30-art 11-1, layout.json `level_name`); `look_ball` "화면" → 레벨 선택 아이 화면은 글 없이 aria만(30-art 11-1·icons 표); `pause_screen` "aria" → 멈춤 메뉴 제목으로 화면에 보임(`mockup-pause-menu.svg`); 카드 문구 "카드 **아래** 한 줄" → art 8절 "대화 상자 **위쪽** 한 줄". 그 밖 문서에 없는 빌드 규칙: 시작 판 ▶ 대체 글 = `tap_to_start` 재사용, 클리어 제목 = 등급 n → `clear_title_n`(N4), 연습으로만 깬 레벨 상태 = `practice_clear`(N3) | `10-lore.md` 7-1·7-2·7-3·7-4 표, `30-art.md:262`·`:422-423`, `assets/layout.json text_slots`, DEV_NOTES N2·N3·N4 | 다음 lore 수정 차례(round-2)에 10-lore 7절 구분 칸·쓰는 곳을 빌드·art와 맞추고, N4(등급별 제목)·`tap_to_start` 재사용을 승인으로 적음. strings.json 글자는 바꿀 필요 없음 |

## 잘 된 점
- 빌드가 `strings.json`을 그대로 복사해(바이트 같음) `T(키)`로만 쓰고, JS·캔버스에 하드코딩 문구 0. 부트 글 4개(+title)는 빌드 스크립트가 원본에서 꺼내 `index.html`에 넣음(키가 없으면 빌드 실패).
- 대체 글에 숫자·값을 잇지 않음: 진행도·최고 기록·시도·길게 누르기·소리 맞추기 점이 모두 `progressbar`/`meter` + `aria-valuenow`. 키를 잇는 곳은 레벨 카드 한 곳뿐(10-lore 6절 4 그대로).
- 안 쓰는 키 5개가 모두 DEV_NOTES 4절에 이유와 함께 있음. 언어 이름은 어느 화면에서도 자기 이름(한국어 / English).
- `word-break: keep-all`(body와 `:lang(ko)`), 보호자 긴 글도 낱말 중간 줄바꿈 0. QA 4해상도 × ko/en 88화면 넘침 0.
- 글 없는 흐름: 타이틀 손가락 → 그림 카드 레벨 선택 → ▶ → 그림 카드 → 손가락 시연 → 자동 재시작 → 등급 구름·그림 버튼. 플레이 중 글은 `tut_tap`(첫 접촉 1회)·`practice_on`뿐이고 둘 다 12자/6단어 안.
- 튜토리얼 그림 카드 8장이 실제 플레이 공·북·구름과 같은 색·모양(notext 카드 L1·L3·L6·L7 확인, 카드 키 = balance = 레벨 `card.id` = 파일 16/16, QA 카드 속 공 ≥ 18 px).
- rhythm-01과 정체성 문구·용어·화면이 분명히 다름(위 절).

## 점수
- 영역: 세계관·텍스트
- 체크 항목 통과: **5 / 6 + 부분 1** (harness/criteria.md "세계관·텍스트")
  - 통과(5): 잘림·오탈자 없음(QA 넘침 0, 직접 본 ko/en 화면 오탈자 0 — 이슈 5는 겹침이지 잘림 아님) · 플레이 중 문구 12자/6단어·모양 이름(검사 A ③⑤) · keep-all + 지원 언어별 주요 화면 스크린샷 · 튜토리얼 그림 = 바로 뒤 첫 오브젝트 · 키 전부 사용 또는 DEV_NOTES 이유, aria 값 이어 붙임 0
  - 부분(1): "화면의 모든 텍스트가 10-lore와 일치" — 글자는 81키 모두 같지만, 부트 단계 `<title>`·lang 고정(이슈 2), 시작 판·결과 화면 대체 글 빠짐(이슈 3·4), 10-lore 구분 칸이 빌드·art와 어긋남(이슈 8)
  - 공통: 대상 연령 중 "글을 읽지 않아도 첫 레벨을 시작하고 조작을 배울 수 있음" 통과(오류 화면 막다른 길은 이슈 1, 첫 레벨 흐름 밖), 원본 보호 통과(레퍼런스·타 팀 이름·문구 0, QA static 검사와 일치)
- 점수: **8.0 / 10** (통과율 (5 + 0.5)/6 = 92 %에서, 불러오기 실패 화면 막다른 길·대체 글 누락 3건·플레이 글 겹침 등 minor 8건을 감점. blocker·major 0)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목:
  1. 불러오기·오류 화면도 글 없이 진행할 수 있음: 다시 버튼 그림이 데이터 로드 실패와 무관하게 보이고(부트 블록에 인라인), 부트 단계의 html `lang`·문서 제목도 선택 언어의 원본 문구를 씀
  2. 대체 글은 접근성 트리로 확인: 주요 화면(레벨 선택·레벨 시작 판·결과)의 레벨 이름·상태·등급이 `ariaSnapshot()` 같은 접근성 트리에 실제로 나타남(aria-hidden 요소에 aria-label을 붙이지 않음)
  3. 플레이 중 글 자리(튜토리얼·토스트)는 `layout.json`에 자리를 두고, 지원 언어 × 4해상도에서 플레이 오브젝트(구름·공·북) 윤곽선과 겹치지 않음

VERDICT: PASS
