# 리뷰: lore-writer · round 2

- 영역: 세계관·텍스트 (가중 10 %)
- 대상: `games/rhythm-01/` (가안 똑딱북: Tickadrum, round-2 빌드). 빌드·기획·10-lore는 읽기만 했고 고치지 않았습니다.

## 확인한 것
- 읽은 파일: `harness/criteria.md`(세계관·텍스트 6항목, 대상 연령, 원본 보호), `harness/insights.md`, `STATUS.md`, `reviews/round-1/lore-writer.md`·`score.md`·`dev-response.md`, 결정 R1·R8(`Docs/orchestrator/2026-11-17-1-7-round1-gate-and-round2-decisions.md`), `10-lore.md`(7절 64키, 7-10 R8 규칙, 4절 R1 문장), `reviews/round-2/qa.md`(10절 R8, 이슈 2), `metrics.json`, `DEV_NOTES.md` R2-4, 빌드 `index.html`·`style.css`·`js/main.js`·`data/strings.json`.
- **키 기계 대조**(node, 10-lore 7-1~7-9 표 파싱 → `strings.json`): 키 **64 / 64**, ko·en **글자 불일치 0**, 여분 키 0. 문자 그대로 참조가 없는 키는 `grade_1~3`뿐이고 `T['grade_' + n]`(main.js 222·546행) 동적 사용. → 안 쓰는 키 0(QA 10절과 같음).
- **불러오기 글**: `index.html` `bootText`의 `loading`·`load_error`·`btn_retry` ko/en이 10-lore와 일치, 공 그림 `aria-label = loading`, ↻ `aria-label = btn_retry` + `aria-describedby = loadErr(load_error)`. 코드에 화면 문구 하드코딩 0(JS의 한글은 주석·개발자 오류 메시지뿐), 캔버스 `fillText` 0.
- **R8 aria 코드 확인**: 시도 점 `role="meter"` 이름 `aria_attempts`·값 `aria-valuenow`(main.js 517~519), 진행도 `progressbar` `aria_progress`, 보정 점 `calib_progress`(valuemax 8), 결과 등급 `#gradeAria` `role="img"` = `grade_N`/`practice_clear`(546행), 설정 버튼 이름 `btn_settings` + 설명 `guardian_hold`(`#bGate`), 연습 깃발 `role="img"` `aria_checkpoint`(586행), 확인 창 `confirm_no`·`confirm_yes`·`confirm_reset`. `aria-valuetext` 0.
- **추가 브라우저 확인**(`serve.mjs` 8331 + playwright-core msedge `?test=1`, 끝나고 내 PID만 종료): ko/en × 4해상도 × (새 저장 / 10레벨 모두 열고 등급·진행도·깃발 섞은 저장) 레벨 선택 화면의 aria 이름 전부 덤프 → **숫자 들어간 aria 0, 콘솔 에러·경고 0**, 이름 줄(`.lname`)이 빠진 카드 = **en 360x640의 레벨 9 "Above the Clouds" 1개**(두 저장 모두).
- 스크린샷(Read로 직접 봄): `shots/` 360x640 levels-progress-badge·levels-new-en·play-l1-show·card-l1·result-l10-en, 412x915 play-l1-hand·levels-new-en·confirm·r2-load-error, 640x360 title·levels-new-en, 내 덤프 `lv-en-360x640`.

## round-1 지적 반영 확인
| round-1 | 내용 | round-2 빌드 |
|---|---|---|
| LW1 / M1 (R1) | 손가락·`tut_tap`과 북채·점선이 함께 보임, 10-lore 4절 모순 | **해결**. 412x915 `play-l1-hand`: 실선 궤도·꽉 찬 별·손가락·"별에 닿으면 톡!"만, 북채 없음. `play-l1-show`: 북채·점선·속 빈 별, 글 없음. QA 픽셀 확인 동시 표시 0. 단 테스트 훅에서만 생기는 예외 1건(이슈 2) |
| LW2 / N1 | 등급 북이 레벨 이름을 덮음 | **해결**. 360x640 `levels-progress-badge`·내 덤프에서 궤도 → 점 → 등급 → 이름 겹침 0. 대신 넘치는 이름은 숨김(이슈 1) |
| LW3 | 640x360 타이틀 글이 궤도에 닿음 | **해결**. 손가락·"눌러서 시작"이 궤도 오른쪽으로 떨어짐 |
| LW4 / N5 | 확인 창 버튼 글뿐, 지우기가 강조 | **해결**. 취소 = 왼쪽 화살표·크림 면·첫 초점, 지우기 = 네모 안 ×·테두리만. 7-10 R8-7과 같음 |
| LW5 / N13 | 시도 aria에 숫자 이어 붙임 | **해결**. meter + `aria-valuenow` |
| LW6 / N14 | `grade_*`·`practice_clear`·`aria_checkpoint`·`btn_settings` 미사용 | **해결** |
| LW7 / N15 | 불러오는 중 검은 화면, ↻ aria 없음 | **해결**. 도는 공 그림 + 보조 글, ↻ 이름·설명 |
| LW8 / N16 | L10 결과 → 그림과 동작 불일치 | **해결**. 버튼 2개(↻·네모 4개), → 숨김 |
| LW9 / N17 (R10) | 카드 손가락 위치 ≠ 실제 | **해결**. 360x640 `card-l1` ②칸 손가락이 아래 받침 자리, 실제 플레이와 같음. 세로 카드 칸 커짐 |

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | minor | game-developer (art-director 규칙 확인) | 영어 360x640 레벨 선택에서 레벨 9 이름 "Above the Clouds"만 사라짐(10장 중 1장 이름 없음). R6/DEV_NOTES R2-4 규칙(`nowrap`, 넘치면 `.lname` 제거, aria 유지)대로라 글이 잘리지는 않지만, round-1에서는 두 줄로 접혀 보였고 다른 9장과 모양이 달라짐. 한국어·다른 해상도는 모두 보임 | `games/rhythm-01/js/main.js` 271행(`scrollWidth > clientWidth` → `remove()`), `style.css` 62행 `.lname { white-space: nowrap }`, `shots/360x640-levels-new-en.png`, 덤프 en 360x640 두 저장 모두 | 숨기기 전에 글자 크기 12 → 10~11 px 줄이기 또는 이름 줄 2줄 허용(높이가 남는 잠김·새 카드). art가 숨김 순서에 "글자 축소"를 넣을지 결정. 영어 이름을 짧게 바꾸는 쪽은 lore가 다음 기획 수정 때 맡을 수 있음(키 문구 변경이라 오케스트레이터 결정 필요) |
| 2 | minor | game-developer | **QA 이슈 2 공동 확인.** 테스트 훅에서 준비 직후 3프레임 안에 레벨을 시작하면 `warmScreens()`가 `#tut`를 다시 숨기지 못해 "별에 닿으면 톡!"(칠 차례 글)이 카운트인부터 북채(볼 차례)와 함께 보임. 일반 UI는 타이틀 탭이 있어 아이에게는 사실상 안 생기지만, 이 글은 R1 차례 신호의 한 부분이라 훅 화면이 틀린 신호를 보여 줌 | `js/main.js` 83~88행(`tut` hidden 제거 → rAF 3프레임 뒤 `tutOn` 보고 복구), 669행, `reviews/round-2/qa.md` 이슈 2 | 미리 그리기를 `#tut` 대신 화면 밖 복제본에서 하거나, 레벨 시작 때 `tutOn`과 실제 `hidden`을 강제로 맞추기(main.js 669행 비교를 DOM 상태 기준으로) |

## 잘 된 점
- 문구 원본이 깨끗함: 10-lore 64키 = `strings.json` 64키, ko/en 글자 하나 다르지 않음. 불러오기 글도 빌드 스크립트가 같은 원본에서 넣음. 하드코딩 문구 0.
- R8 규칙 그대로: 값은 모두 `aria-valuenow`, 이어 붙인 키는 레벨 카드(이름 + 쉼표 + 상태) 한 곳뿐, `aria-valuetext`·새 `aria-live` 0.
- 차례 신호와 글이 맞음: 볼 차례 화면엔 글이 없고, 북채가 걷힌 뒤에만 손가락과 `tut_tap`. 그림 카드 ①~③ 순서와 실제 화면 순서가 같아짐.
- 세계관 고유 이름(콩이·소리별·북시계·둥둥이)이 화면·aria 어디에도 없음. 플레이 중 문구 ★ 14개 모두 12자 / 6단어 이내.
- 원본 보호: 빌드에 레퍼런스·다른 게임 이름 없음, 이름은 가안 `똑딱북/Tickadrum` 그대로.

## 점수
- 영역: 세계관·텍스트
- 체크 항목 통과: **6 / 6** (harness/criteria.md "세계관·텍스트")
  - 화면 텍스트 = 10-lore: 통과(64/64, 불일치 0, 불러오기 글 포함)
  - 텍스트 잘림·오탈자 없음: 통과(겹침 0, 오탈자 0. 이슈 1은 잘림 대신 숨김 — R6 결정 규칙대로라 실패로 세지 않음)
  - 플레이 중 문구 12자/6단어·모양 이름: 통과
  - `keep-all` + 언어별 주요 화면 잘림 확인: 통과(QA 128화면 + 내 덤프 16화면)
  - 튜토리얼 그림 = 실제 오브젝트 색·모양: 통과(속 빈 별·꽉 찬 별·공·북채, 손가락 위치까지 일치)
  - (R8) 키 모두 사용·aria에 숫자 이어 붙이지 않음: 통과
  - 공통 참고: 대상 연령 "글 없이 첫 레벨 학습"은 일반 모드에서 신호 겹침 0으로 회복, 원본 보호 통과
- 점수: **9.0 / 10** (6/6 통과에서 시작. round-1 지적 9건 모두 해결. 남은 minor 2건 — 영어 360x640 레벨 이름 1장 숨김, 테스트 훅에서 튜토리얼 글이 볼 차례에 보임 — 으로 1점 뺌)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목: 없음 (이슈 1은 기존 "잘림 없음"·"언어별 스크린샷 확인" 항목의 읽는 법 — "넘쳐서 숨긴 글도 언어·해상도별로 0인지 확인" — 으로 다룰 수 있어 새 줄을 늘리지 않음)

VERDICT: PASS
