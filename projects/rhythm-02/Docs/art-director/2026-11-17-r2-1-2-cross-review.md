# round-2 1-2 교차 리뷰 + 1회 수정 (art)

- 날짜: 2026-11-17
- 역할: art-director
- 프로젝트: rhythm-02
- 단계: round-2 1-2

## 요청 받은 일
오케스트레이터: round-2 기획(흘러오는 길 + 콤보)의 balance·lore 문서를 art 관점에서 교차 리뷰하고(`reviews/cross-r2/art-director.md`), art 몫을 한 번 고친다. 결정 R2-D1(card_twoballs 그림 삭제), R2-D2(sound-check가 새 화음 시각 규칙을 따름), R2-D5(클리어 감속은 그림만), R2-D7(콤보 대체 글 자리), R2-D8(구분 표 대조)과 교차 리뷰에서 찾은 art 문제. `check-all.mjs` 5/5 OK. 작업 중 추가 지시: **R2-D9**(가지 밑 표시 수 = 카드 횟수, 들어가는 표시는 가지 밖), 레벨 카드 최고 기록 막대·최고 콤보 표지 = 버튼 옆 형제 요소(화면 위치 그대로), 끝 구름 이름 통일, 10-2 "1.1 s 재시작" 행.

## 한 일
1. 교차 리뷰 작성: 이슈 lore 6 · balance 5 · 공통 2 · art 8(art 8개는 이번에 고침). balance·lore가 같은 시간에 고치고 있어 19:42 판을 다시 읽고 "다시 확인" 칸을 붙임.
2. **R2-D1**: `assets/cards/card_twoballs.svg`·`card_twoballs_portrait.svg`, `assets/obj-second-ball.svg` 삭제(`RESERVE_CARD_FILES = []`). `cards.mjs --check` "남은 카드 파일 0", 두 공 그림이 남으면 FAIL.
3. **R2-D2**: `sound-check.mjs` 5절을 정보 출력에서 검사로 바꿈. 화음마다 ① 정박 ② 어떤 접촉의 [놓침 구역 시작, 통과 창 끝] 밖 ③ 지붕 착지 ±1박 밖 ④ 그 조건의 첫 정박 ⑤ chordMs = 박 × 1박. 처음 돌렸을 때 balance 옛 코드로 위반 15~17건(FAIL) → balance가 judge.mjs를 고친 19:42 판에서 15번 위반 0.
4. **R2-D5**: `layout.json world.scroll_stop.draw_only`, 그린 박 = stop − 1 + u − u²/4(마지막 1박 거리를 2박 시간에, 속도 튐 없음). 끝 구름 검사를 그린 박으로 바꿔 10레벨 통과.
5. **R2-D7**: 레벨 카드 최고 기록 막대(progressbar)·최고 콤보 금빛 네모(meter) = **화면 자리 그대로(카드 안), DOM은 같은 칸의 버튼 옆 형제 요소**(30-art 6-2·11-1, `layout.json text_slots.best_combo_mark`), `hud.combo_a11y`(meter, valuetext 숫자만, live 없음). 한때 네모를 카드 밖 아래로 옮겼다가 추가 지시대로 되돌림.
6. **R2-D8**: rhythm-01이 round-3 "북길"(흘러오는 별 → 왼쪽 0.30 W 판정 선)로 바뀐 것을 찾음 → 30-art 10-1b 대조 표 새로. 10-1 콤보 칸(원 ↔ 네모), 10-2 runner-01 플레이어 x(0.30, 레퍼런스 0.37)·근거 없는 "2.7박" 삭제·1.1 s 재시작 행 추가.
7. 교차 리뷰에서 찾은 art 문제: **카드 6장 칸을 레벨 첫 등장에 맞춰 다시 그림**(구름 4 → 2박, 큰 언덕 3 → 1.5박·자리, 지붕 2.5 → 1.6박, `card_three` 칸 1 = 받침 쉼에 앉은 공, `card_double`·`card_roll` 칸 1 = 2박 비행으로 높이 내려오는 공, `card_big` 먼 표시 뒤 1박) + `cards.mjs --check`에 "카드 물체 폭 = 레벨 첫 등장 물체 폭" 검사. 지붕 밑 bob "다음 박부터" → "착지 +2박부터"(문서·sound-check 합성 사례).
8. **R2-D9**: 가지 그림 = balance가 새로 준 [첫 반박 − 0.25, 마지막 반박 + 0.17]박 그대로(좌우 여유 0). `layout.mjs`에 4해상도 × 가지 6개 "가지 밑 완전히 든 표시 2/2·4/4, 반쯤 걸침 0" 검사, `cards.mjs`에 칸마다 같은 검사. 카드 가지 구간은 `balance.json objects.branch`를 읽고, 카드 앞쪽 2.5 → 1.9박(뒤 끝 13.2 px ≥ 표시 반폭 13 px). 물체 밑 공간 검사를 공 원 모양 그대로로 바꿈 → **가지 뒤로 나가는 공이 가지 오른쪽 끝을 스침**(balance 데이터, "대기"로 표시, 리뷰 B6).
9. 끝 구름 이름: art 문서·도구에 "클리어 구름" 없음(모두 "끝 구름"), 10-2에 "1.1 s 자동 재시작" 허용 겹침 행.
10. `30-art.md` 해당 절에 [r2 1-2] 표시로 반영(머리, 5-2, 5-3, 6-2, 8절, 9-1, 9-3, 10-1·10-1b·10-2, 11-1, 15, 17).

## 산출물
| 파일 | 내용 |
|---|---|
| `reviews/cross-r2/art-director.md` | 교차 리뷰(안건 8개 결론, 이슈 21개, 처리·다시 확인) |
| `30-art.md` | [r2 1-2] 반영 |
| `tools/art/cards.mjs` | 카드 6장 칸, 첫 등장 폭 검사, 가지 밑 표시 검사(R2-D9, 가지 구간은 balance 값 읽음), 카드 앞쪽 1.9박, 두 공 그림 삭제, 가지 레벨 카드 썸네일 표시 가지 밖 |
| `tools/art/sound-check.mjs` | R2-D2 화음 검사(FAIL), 지붕 밑 합성 사례 정정 |
| `tools/art/layout.mjs` → `assets/layout.json` | scroll_stop draw_only·곡선·검사, combo_a11y, best_combo_mark(DOM 형제), 화음 글, 가지 x 규칙·가지 밑 표시 검사, 물체 밑 공간 = 공 원 모양 |
| `assets/cards/*.svg`(8장 × 2판), `assets/obj-*.svg`, `assets/mockup-*.svg` | 다시 생성. `card_twoballs*`·`obj-second-ball.svg` 삭제 |

## 검증 결과
- `node projects/rhythm-02/tools/art/check-all.mjs` (마지막 19:5x, balance.json 19:50·levels 19:48·judge.mjs 19:42 판): **palette OK · layout OK · cards OK · icons OK · sound-check OK — 5/5, 종료 코드 0**.
  - cards: 카드 키 = balance gimmicks W0~W7 8장, 남은 카드 파일 0, 카드 물체 폭 = 첫 등장(구름 2 · 지붕 1.6 · 가지 0.92 · 언덕 1.5 · 긴 가지 1.92박), 카드 가지 밑 표시 `card_double` 2·2·0 / `card_roll` 2(칸 밖 2)·4·0 반쯤 걸침 0, 칸 안 8장, 카드 속 공 360x640 세로 19.4 px(최소 360x560 16.7 px ≥ 16).
  - layout 가지(R2-D9): 4해상도 × L6·L6·L7·L8·L9·L10 가지 밑 표시 2/2·2/2·2/2·4/4·2/2·4/4, 반쯤 걸침 0. **대기 4(balance 데이터)**: 가지 뒤 나가는 공(원)과 가지 오른쪽 끝 여유 < 0.25d — 360x640 L6 첫 가지 −2 px, L6 둘째 가지(뒤 2박 비행) −32 px.
  - sound-check: 콤보 화음 15번 R2-D2 위반 0(예 L1 10단계 34박, L9 10단계 35박), 지붕 밑 합성 사례 기대대로, 도구 ↔ 빌드 렌더 최대 0.55 dB, 탭 − 화음 10.93 dB.
  - layout: 끝 구름이 감속한 그린 박에서도 공을 덮음(예 L9 62.33박 ∈ [62, 64]), bg_stage 새 식(L07 13).
- 처음 돌렸을 때(19:3x, balance 옛 judge.mjs): sound-check FAIL(화음 위반 15~17건) — 검사가 옛 규칙을 잡는 것을 확인.
- 그림은 SVG 수치 검사로만 확인(브라우저·서버는 띄우지 않음, 포트·PID 없음).

## 규칙 준수 확인
- [x] 원본 보호 (가시·블록·발판·고리·포털·음표 모양 없음, 레퍼런스 그림 없음)
- [x] 게임 선정·설계 원칙 (기본 도형·단색, 약한 아트, 새 모양 없음)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정(reviews/cross-r2/art-director.md, 30-art.md, assets/, tools/art/, Docs/art-director/, Docs/README.md 한 줄). balance·lore 파일·games/는 읽기만. git 커밋·푸시 안 함

## 문제·남은 일
- **major · balance-designer: R2-D9 가지 뒤 +0.17박 끝을 가지 뒤 나가는 공이 스침**(리뷰 B6). L6 둘째 가지는 뒤가 2박 비행이라 360x640에서 공이 가지를 32 px 뚫음. 계산: 1박으로 나가면 아랫면 ≥ 0.32~0.33·Hp, 2박으로 나가면 ≥ 0.40~0.42·Hp. 권장: 가지 아랫면 0.34·Hp + 가지 바로 뒤는 1박 비행만. art 그림은 데이터 그대로라 바꿀 것 없음, `layout.mjs`가 대기로 계속 보임.
- major · orchestrator(+ lore·balance): **rhythm-01 round-3 "북길"과 구조 겹침**(D1). 세 게임 모두 "오른쪽에서 흘러와 왼쪽 0.30 W에 닿을 때 톡". art는 남은 차이를 10-1b 표로 적었지만 겹침 자체는 두 프로젝트 오케스트레이터 판단. lore 8-1·balance 2절에도 같은 행이 필요.
- minor · balance: 20-balance 6-1 바탕 단계 옛 식(R2-D4), 12절 화음 행·`balance.json combo.chord_timing` 글이 옛 규칙(코드는 반영됨), 6-4 "그림은 1박 감속 뒤 멈춤" 한 줄(19:43 기준).
- minor · dev: 레벨 카드 DOM(최고 기록 막대·최고 콤보 meter = 버튼 옆 형제), 클리어 감속 그리기만, `layout.json second_ball`은 상태 메모 한 줄만 남음.

## 다른 팀에 줄 인사이트
- 튜토리얼 그림을 "같은 모양 함수"로 그려도 **물체 폭(박)과 칸 1의 직전 상태**는 레벨 데이터와 따로 놀 수 있다(구름 4박 vs 실제 2박). 카드 생성 도구가 레벨의 첫 물체 `[beat_in, beat_out]`을 읽어 폭을 대조하는 검사를 둔다.
- 다른 팀 프로젝트와의 "구분 표"는 그 프로젝트의 최신 코어를 기준으로 다시 읽는다: 같은 요청자 피드백(몰입감)으로 두 팀이 같은 날 같은 흐름 구조로 바꿀 수 있다.
