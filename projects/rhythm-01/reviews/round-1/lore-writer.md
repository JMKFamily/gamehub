# 리뷰: lore-writer · round 1

- 영역: 세계관·텍스트 (가중 10 %)
- 대상: `games/rhythm-01/` (똑딱북: Tickadrum, 1-3 빌드). 빌드·기획 문서는 읽기만 했고 10-lore도 이번에는 고치지 않았습니다.

## 확인한 것
- 읽은 파일: `harness/criteria.md`(세계관·텍스트, 대상 연령·단순성, 원본 보호), `harness/templates/review.md`, `projects/rhythm-01/10-lore.md`(7절 키 64개, 4절 차례 신호, 5절 레벨 테마, 6절 글 없는 반응), `DEV_NOTES.md`(D12 불러오기 화면 글 없음, D13 손가락 범위, D18 `calib_with_grownup`), `reviews/round-1/qa.md`, 빌드 `data/strings.json`·`index.html`·`style.css`·`js/main.js`·`js/render.js`.
- **기계 대조**: 10-lore 7절 표를 파싱하는 node 스크립트로 `strings.json`과 비교 → 키 **64 / 64**, ko·en 모두 **글자 단위 불일치 0**, 여분 키 0. ★ 문구(플레이 중·보조 글) 전부 12자 / 6단어 이내.
- **키 사용처**: 코드·HTML 전체에서 키 참조를 찾음. 동적 키(`name_key`, `'grade_'+n`, `card id`, balance `done_signal`·`on_fail_aria_key`)를 빼면 실제로 안 쓰이는 키는 `btn_settings`·`aria_checkpoint` 2개, 쓰일 수 없는 키는 `loading`·`load_error` 2개(D12). 캔버스에 글을 그리는 코드(`fillText`)는 0.
- 스크린샷(Read로 직접 봄): `shots/` 412x915 title·levels-new-en·card-l1·card-l2·play-l1-show·play-l1-hand·play-l7·practice-l3·confirm-notext, 360x640 levels-progress-badge·play-l1-hand-en·result-l10-en, 640x360 title·play-l1-hand-en, 1280x720 play-l1-show·card-l1.
- **추가 확인** (`serve.mjs` 8241 + 로컬 Edge 헤드리스, 끝나고 서버 종료): ko/en × 360x640·640x360에서 타이틀·레벨 선택·보호자 문 힌트·설정·확인 창·보정·카드·플레이·멈춤·결과의 보이는 글과 `aria-label` 전부 덤프, 글 넘침(scrollWidth/Height) 검사 → **넘침 0, 콘솔 에러 0**. L1 보여 주기 마디(카운트인 직후) 캡처, `strings.json` 차단 시 불러오기 실패 화면, 느린 로딩 중 화면.

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | major | balance-designer, art-director, lore-writer (오케스트레이터 판단) | **QA 이슈 2 공동 확인.** 레벨 1에서 `tut_tap`("별에 닿으면 톡!")과 손가락이 북채·점선 궤도(=볼 차례)와 함께 보임. 그림 카드 `card_star_tap`은 "① 북채가 속 빈 별을 침 → ③ 북채 없을 때 손가락 톡" 순서를 가르치는데, 첫 따라 치기 직전 화면은 ①과 ③이 섞여 있음(꽉 찬 별 + 북채 + 점선 + 손가락). 원인은 기획 자체에 있음: 10-lore 4절은 "북채는 그 마디가 끝나면 사라짐"과 "손가락은 첫 꽉 찬 별 1박 전, 북채가 사라지는 때와 겹치지 않게"를 같이 적었는데, 첫 따라 치기 별이 마디 첫 박(자리 0)이라 1박 전 손가락은 반드시 북채와 겹침(lore 문서 모순) | `shots/412x915-play-l1-hand.png`, `360x640-play-l1-hand-en.png`, `640x360-play-l1-hand-en.png`; 북채 [1636, 4364] ms vs 손가락 [3818, …] ms(qa.md 이슈 2); `10-lore.md` 4절 마지막 두 줄, 7-1 `tut_tap` | 차례 신호 규칙(결정 1)을 지키는 쪽으로: L1 첫 보여 주기 마디에서 **북채를 마지막 1박 앞에서 걷고** 그 1박 동안만 손가락·`tut_tap`을 보이기(카드 ③과 같은 장면: 실선 궤도·꽉 찬 별·손가락). 수치는 balance `cues`, 그림은 art. lore는 2단계에서 4절 문장을 "북채가 걷힌 뒤 손가락"으로 고쳐 모순을 없앰 |
| 2 | minor | game-developer (art-director 확인) | 레벨 선택 카드의 등급 작은 북이 레벨 이름 글자를 덮음(QA 3). 글자 읽기를 방해하므로 "텍스트 잘림 없음" 항목 실패로 봄 | `shots/360x640-levels-progress-badge.png`("아침 마당"·"꽃밭"·"비 오는 창가"·"달" 위에 북 3개가 닿음) | 미니 SVG 등급 줄과 `.lname`을 겹치지 않게 분리(이름을 카드 아래 고정 줄로) |
| 3 | minor | game-developer (art-director 확인) | 640x360 타이틀에서 "눌러서 시작"과 손가락이 궤도 고리에 닿음(QA 4) | `shots/640x360-title.png` | 가로 타이틀 궤도 반지름 축소 또는 글을 궤도 오른쪽 아래로 |
| 4 | minor | art-director (game-developer, lore-writer) | **QA 이슈 6 공동 확인.** 기록 지우기 확인 창 버튼이 글뿐이라 글 없이는 취소·지우기 구분 불가. 게다가 되돌릴 수 없는 "지우기"가 밝게 채운 쪽(눈에 띄는 쪽)이라, 글을 못 읽는 아이가 들어오면 지우기를 누르기 쉬움. 보호자 문 안쪽이라 major는 아님. 문구 자체(`confirm_reset`·`confirm_yes`·`confirm_no`)는 10-lore와 일치 | `shots/412x915-confirm-notext.png`, `index.html` `.tbtn.warn` | 취소 = ×(또는 되돌아가는 화살표) 아이콘 + 채운 강조, 지우기 = 휴지통 아이콘 + 테두리만. 글은 아이콘 옆 보조 글로 유지(키 추가 없음) |
| 5 | minor | game-developer | 시도 점 줄의 대체 글이 "해 본 횟수 1" / "Tries 1"처럼 **숫자를 글에 이어 붙임**. 10-lore 7-8은 "값은 `aria-valuenow` 같은 속성으로 넘기고 글로 만들지 않음", 7절 "치환 자리 없음"과 다름. 레벨 카드 대체 글(이름 + 쉼표 + 상태)은 규칙대로임 | `js/main.js` 398행 `` `${T.aria_attempts} ${run.attempts}` `` | `#attAria`를 `role="meter"`(또는 progressbar) + `aria-valuenow`로 바꾸고 라벨은 `aria_attempts`만 |
| 6 | minor | game-developer | 10-lore 키 중 빌드가 쓰지 않는 자리: ① 결과 화면 등급 북에 `grade_1~3`·`practice_clear` 대체 글 없음(7-7 "결과 화면에도 같이 씀"), ② 연습 체크포인트 깃발에 `aria_checkpoint` 없음, ③ 설정 버튼 대체 글이 `guardian_hold`("어른이 길게 눌러요")뿐이고 `btn_settings`가 없어 낭독기가 무슨 버튼인지 말하지 않음 | `js/main.js` `showResult`(419행 근처), `index.html` `#bGate` `data-a="guardian_hold"`; 키 참조 검색 결과 `btn_settings`·`aria_checkpoint` 0회 | ① 결과 화면 등급 줄에 `role="img"` + 등급 키, ② 진행도 막대 깃발 표시에 `aria_checkpoint`, ③ 설정 버튼 라벨을 `btn_settings` + 쉼표 + `guardian_hold`로(레벨 카드와 같은 이어 붙이기 규칙) |
| 7 | minor | game-developer (art-director) | 불러오는 중 화면이 **완전히 검은 화면**(글도 그림도 없음). 10-lore 7-4 `loading`은 "도는 공 그림 함께"가 주이고 D12처럼 글을 못 쓰는 것은 받아들이지만 그림까지 없으면 아이는 멈춘 것으로 봄. 실패 때 ↻ 버튼은 대체 글이 비어 있음 | 헤드리스 확인: levels 응답 3 s 지연 중 360x640 전부 검정, `strings.json` 차단 시 ↻ 버튼만(aria-label 없음) | `index.html`에 공 SVG(`data/svg/ball.svg`) 회전 그림을 정적으로 넣기. ↻ 버튼 대체 글은 빌드 스크립트가 `loading`·`load_error` ko/en을 `index.html`에 박아 넣는 방식(코드에 문구를 직접 쓰지 않음) 검토 |
| 8 | minor | art-director (game-developer) | 레벨 10 결과 화면에서 "다음" 자리 버튼이 → 그림인데 대체 글·동작은 "레벨 고르기"(옆 네모 4개 버튼과 같은 곳). 그림·글·동작이 어긋남 | `shots/360x640-result-l10-en.png`, `js/main.js` 419행 | 마지막 레벨은 버튼 2개(다시·레벨) 또는 → 자리에 네모 4개 그림. 6-3 "버튼 3개"는 다음 레벨이 있을 때로 읽음(lore 2단계에서 문장 보강 가능) |
| 9 | minor | art-director | 그림 카드 `card_star_tap` ②·③칸은 손가락을 **가운데 북 위**에 그리는데, 실제 레벨 1 손가락은 화면 아래 엄지 받침(가로는 오른쪽)에 나옴. 오브젝트 색·모양은 같지만 "어디를 누르나"가 카드와 실제가 다름. 412x915에서 카드 칸이 약 110 px라 그림이 작음 | `shots/412x915-card-l1.png` vs `412x915-play-l1-hand.png` | 카드의 손가락을 궤도 아래(엄지 받침 자리)로 옮기거나, 실제 손가락을 카드와 같은 위치에. 세로 화면 카드 칸 확대(세로 3단 배치 등) |

## 잘 된 점
- `strings.json`이 10-lore 7절과 64키·ko/en 모두 글자 하나 다르지 않음. 코드에 하드코딩 문구 0, 캔버스 글 0 — 문구 소유권이 깨끗함.
- 화면에 항상 보이는 글이 타이틀·`tap_to_start`·`tut_tap`·`clear_title`·레벨 이름·설정뿐이고, 판정·실패·등급·시도·잠김이 모두 그림으로만 나옴(10-lore 6절 그대로). 실패 화면에 글·토스트 없음.
- 세계관 이름(콩이·소리별·북시계·둥둥이)이 화면·aria 어디에도 없고, 플레이 중 문구는 "별"처럼 보이는 모양 이름만 씀. `body`에 `word-break: keep-all`, ko/en 4화면 크기에서 글 넘침 0("Above the Clouds"는 360에서 두 줄로 깔끔히 접힘).
- 레벨 테마가 화면에 맞게 들어감: L1 겨자 바탕 + 반원 해·담장, L3 회청 + 창틀·빗방울 2, L7 산딸기 + 등불 원 3, L10 남색 + 큰 달. 배경에 별 모양 없음, 실루엣 정지.
- 보여 주기 마디의 속 빈 별(노란 외곽선)·점선 궤도·흰 북채가 그림 카드 ①칸과 같은 색·모양. 등급은 노랗지 않은 작은 북 모양.
- 원본 보호: 빌드 전체에서 레퍼런스·유명 리듬 게임·runner-01 이름 검색 0건, 이름 `Tickadrum/똑딱북` 그대로.

## 점수
- 영역: 세계관·텍스트
- 체크 항목 통과: **4 / 5** (harness/criteria.md "세계관·텍스트")
  - 통과: 화면 텍스트 = 10-lore(보이는 글 전부 일치, aria 일탈은 이슈 5·6 minor) · 플레이 중 문구 12자/6단어·모양 이름 · `keep-all` + ko/en 주요 화면 잘림 확인(QA 영어 6화면 + 이번 헤드리스 9화면) · 튜토리얼 그림 색·모양 = 실제 오브젝트(속 빈 별·꽉 찬 별·공·북채 일치)
  - 실패: 텍스트 잘림·오탈자 없음 — 오탈자 0이지만 레벨 이름을 등급 북이 덮음(이슈 2)
  - 공통 항목 참고: 대상 연령 "글 없이 첫 레벨 시작·학습"은 이슈 1(신호 겹침)로 조건부, 원본 보호 1/1 통과
- 점수: **7.0 / 10** (통과율 80 %에서 시작. 문구 일치·글 최소화는 흠잡을 데 없지만, 첫 학습 순간 튜토리얼 글·그림 카드가 가르치는 순서와 실제 화면 신호가 어긋나는 major 1건(원인 일부가 lore 문서 모순)과 aria 미사용·숫자 이어 붙이기·불러오기 화면 같은 minor가 남아 가점 없음)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목:
  - 10-lore 7절 키는 빌드에서 모두 쓰이거나(동적 키 포함) 안 쓰는 이유가 DEV_NOTES에 있고, 대체 글에 숫자·값을 이어 붙이지 않음(값은 `aria-valuenow` 등 속성으로)

VERDICT: REVISE
