# round-2 세계관·텍스트 수정: 흘러오는 길 + 콤보 대체 글 + round-1 lore 이슈

- 날짜: 2026-11-17
- 역할: lore-writer
- 프로젝트: rhythm-02
- 단계: round-2 (1-1 수정, balance·art와 병렬)

## 요청 받은 일
오케스트레이터가 요청자 검수 피드백("지오메트리대시처럼 몰입감… 오른쪽에서부터 다가오는 여러가지 패턴으로 짧은순간 판단… 리스크가 반복적이지않게")과 전 프로젝트 콤보 지시("디제이맥스의 노트 터치 검사를 벤치마크해서 콤보시스템")를 전달. 00-benchmark 14절 R2-A "흘러오는 길"에 맞춰 10-lore·strings를 고치고, round-1 lore 이슈(N15~N21)를 처리하고, rhythm-01 구분·runner-01 관계 절을 갱신하고, 7-9 검사를 다시 돌리라는 지시.

## 한 일
1. **한 문장 규칙 갱신**: 짧은 판 "표시가 북에 오면 톡! 지붕 밑에선 쉬기. 놓치면 다시." + 설명판(보호자·스토어용). 화면 글 `tut_tap` = "표시가 북에 오면 톡!" / "Mark reaches the drum: tap!" (12자·5단어).
2. **세계관을 "북과 공이 함께 길을 여행한다"로 얇게 바꿈**(2절). 지붕은 "위험"이 아니라 "공이 앉아 쉬는 곳"으로 받침 쉼과 같은 말로 묶음. 달리는 캐릭터·다리·발자국 없음. 이름 Tossaloft/높이통통은 그대로 맞음(1절 round-2 메모).
3. **화면 모양 이름**(3절): 공·북·그림자·길·표시·구름(길 구름)·지붕·가지·긴 가지·큰 언덕 + 콤보(글 없음). 기믹 W0~W7 ↔ 카드 키 표.
4. **카드 문구 W0~W7**(7-3): 새 `card_roof` "지붕 밑에선 쉬어요 / Under the roof, rest", `card_big`·`card_double`·`card_three`·`card_roll` 문구를 물체 이름으로 바꿈, `card_twoballs`는 예비(D-R2-1).
5. **레벨 이름 여행 순서**(4절): 8개 유지, L5 물웅덩이 → **작은 마을**(지붕), L6 시소 → **물웅덩이**(가지 통통, round-1 L5 이름을 옮김). 배경 실루엣이 위험 물체를 닮지 않게 하는 규칙 추가.
6. **콤보 대체 글**: `aria_combo` "이어서 잘한 만큼 / Streak"(HUD meter), `aria_best_combo` "제일 길게 이어서 / Best streak"(선택). 값은 `aria-valuenow`, live 아님, 화면 문구 키 없음(5절·7-4).
7. **round-1 이슈 처리**(아래 표), 6절 9(부트 키 5개·lang·title·↻ 인라인)·6절 11(화면별 접근성 트리 목록) 추가.
8. **8절 갱신**: 8-1 rhythm-01 구분(round-2 축 추가), **8-2 runner-01 관계**(허용 겹침, 금지 용어 목록, 문장 틀 회피), 8-3 공통 UI 목록(33개, `new_best` 추가).
9. **7-9 검사 확장·재실행**: runner-01 금지어·문구 겹침, 예비 키, balance 동시 작업 대기 처리 추가.
10. `clear_title_2`("구름까지 갔어요!" → "멀리 왔어요!"), `guardian_intro`·`store_short`·스토어 긴 설명 round-2 규칙 반영.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-02/10-lore.md` | round-2 전체 수정(확정값 표, 1~11절) |
| `projects/rhythm-02/strings.json` | 84키(81 + `card_roof`·`aria_combo`·`aria_best_combo`), 문구 변경 10키 |
| `projects/rhythm-02/Docs/lore-writer/2026-11-17-r2-lore-redesign.md` | 이 보고서 |
| `projects/rhythm-02/Docs/README.md` | 맨 위 한 줄 |

## round-1 이슈 처리표

| 이슈 | 내용 | 처리 | 남은 담당 |
|---|---|---|---|
| N21 / LW8 ① | `levelN_name` 구분 "화면 - 레벨 카드 보조 글" | 화면 글은 결과 맨 위만, 레벨 선택·시작 판은 aria로 정정(7-2) | — |
| N21 / LW8 ② | `look_ball` "화면" | **aria**로 정정(글 없는 아이 화면, img 이름) | — |
| N21 / LW8 ③ | `pause_screen` "aria" | **화면**으로 정정(멈춤 메뉴 제목 한 줄 + dialog 이름) | — |
| N21 / LW8 ④ | 카드 문구 "카드 아래 한 줄" | "대화 상자 **위쪽** 한 줄"(30-art 8절)로 정정 | — |
| N21 / LW8 ⑤ | N3·N4·`tap_to_start` 재사용 미기록 | 승인으로 기록: `practice_clear` 상태(7-2), 등급 n → `clear_title_n`·연습 → 1·L10 → `clear_last`(7-5), ▶ 대체 글 = `tap_to_start`(7-1) | — |
| N19 / LW6 | `aria_best`를 상태 키로 잇음 | 상태 키 4개(`levelcard_locked`·`levelcard_new`·`grade_N`·`practice_clear`)로 정의, 못 깬 레벨은 이름만 + progressbar | game-developer |
| N15 / LW1 | 오류 화면 ↻ 안 보임 | 6절 9: `icon-retry.svg` 부트 블록 인라인, 버튼 이름 `btn_retry`·설명 `load_error` | game-developer |
| N16 / LW2 | 부트 lang·title 고정 | 6절 9: 부트 키 5개(`title`·`loading`·`load_error`·`load_error_detail`·`btn_retry`), 언어 결정 직후 `lang`·`document.title` 설정. 새 키 불필요(`title` 재사용) | game-developer |
| N17 / LW3 | 시작 판 레벨 이름·등급 aria-hidden | 6절 11: 시작 판 img `levelN_name` + `grade_N` | game-developer |
| N18 / LW4 | 결과 등급 대체 글 없음 | `grade_N` = 카드·시작 판·결과 공통, 연습 클리어는 `practice_clear`(7-2) | game-developer |
| N20 / LW7 | `btn_settings` describedby, `audio_unlock` 그림 | 7-6·7-1에 명시(`guardian_hold` 연결, 스피커 + 손가락) | game-developer (art 아이콘) |
| N10 / LW5 | `tut_tap` 글 ↔ 구름 | 고정 구름 없어짐. 새 문구도 12자·5단어, 자리는 `text_slots`·길 영역 밖(S10) | art-director·game-developer |
| aria 규칙 | 접근성 트리 기준 | 6절 11에 화면별 트리 목록(레벨 선택·시작 판·플레이·결과·오류), 6절 4·5에 콤보 포함 | qa·lore 리뷰 |

## 검증 결과
- 7-9 node 검사(`projects/rhythm-02/`에서): `doc 84 json 84 | cards 8 balance 대기(round-1 id) reserve card_twoballs | same-as r01 32 runner 12 (common만 허용) | card files 14/16 (참고) | PASS`
  - ① 키 집합 같음 ② KR·EN 글자 같음 ③ 한도: 최장 12자(`tut_tap`·`card_bounce`·`card_big`·`card_three`·`card_roll`), 영어 최대 6단어 ④ `store_short` KR 51 / EN 72자 ⑤ rhythm-01·runner-01 금지어 0 ⑦ 글자 같은 문구 rhythm-01 32키·runner-01 12키 모두 공통 UI 목록 안 → **게임 정체성 문구 겹침 0**.
  - ⑥ **balance 대기**: `balance.json gimmicks`가 실행 시점(14:03 수정판) 아직 round-1 id라 엄격 비교 보류. strings 카드 8개는 7-3 제안과 같음.
  - ⑧ 카드 그림 14/16: `card_roof` 2장 없음(art 작업 중).
- 못 한 검사: 빌드 화면·접근성 트리 확인(round-2 빌드 전), art 실루엣 이름 대조(art 30-art가 실행 시점 아직 round-1 판).

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스·DJMAX 이름·문구 없음, rhythm-01·runner-01 정체성 문구 글자 겹침 0)
- [x] 게임 선정·설계 원칙 (5~6세: 12자/6단어, 글 없이 플레이, 콤보 글·숫자 없음, 지붕을 겁주지 않는 말)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정(10-lore.md, strings.json, Docs/lore-writer/, README 한 줄), git 안 함, 서버·브라우저 안 띄움

## balance·art와 1-2에서 맞출 것
| # | 상대 | 안건 |
|---|---|---|
| B1 | balance | 카드 키 제안: W0 `card_bounce`·W1 `card_big`·W2 `card_cloud`·W3 `card_dot`·**W4 `card_roof`**·W5 `card_double`·W6 `card_three`·W7 `card_roll`, G5 `card_twoballs` 예비. 다른 키를 쓰면 strings 키만 바꿈 |
| B2 | balance | 콤보 max(`aria_combo` meter max = 판정 대상 수, 지붕 참기 포함?)·최고 콤보 저장 여부(`aria_best_combo` 쓸지) |
| B3 | balance | `clear_title_n` 선택 규칙(N4)·`practice_clear`(N3) 유지 확인 |
| A1 | art | 표시(W0) 실제 모양 → 이름 "표시" 유지 또는 구체 이름(꽃·조약돌 등)으로 바꿈(4키 영향) |
| A2 | art | 지붕 실루엣이 "지붕"으로 읽히는지(다리·처마면 이름 변경), 가지 vs 긴 가지 길이 차, 큰 언덕 vs L7 배경 언덕 구분 |
| A3 | art | L5 작은 마을·L6 물웅덩이 테마·실루엣 교체(시소 제거), 배경 실루엣이 그 레벨 위험 물체를 닮지 않게 |
| A4 | art | `card_roof` 그림(손 떨어짐·앉은 공, S8), 나머지 카드에 길·표시 그리기, 문구 자리 "대화 상자 위쪽"(확인) |
| A5 | art | `audio_unlock` 옆 스피커 + 손가락, `tut_tap` `text_slots` 자리(길 영역 밖), 클리어 연출이 "구름 속으로"를 유지하는지(→ `clear_title_2` 바꾼 이유) |
| A6 | art | 최고 콤보 표지를 레벨 카드에 그릴지(`aria_best_combo`) |

## 문제·남은 일
- minor (art): 카드 그림 `card_roof` 2장 없음, 기존 7장 round-2 그림 필요 — 7-9 ⑧ 다시 돌려 16/16.
- minor (balance): `gimmicks` W id 반영 뒤 7-9 ⑥ 엄격 비교 재실행.
- minor (lore): art가 표시 모양 이름을 정하면 4키(`tut_tap`·`card_big`·`store_short`·`guardian_intro`) 갱신 가능성.
- major (orchestrator, K10): 지붕 쉬기 아동 이해 — D-R2-4대로 요청자 선택 목록.

## 인사이트 후보 (다른 팀에 줄 인사이트)
- [rhythm-02·2026-11-17] "반대 행동"(누르지 않기) 규칙의 카드 문구는 금지어("조심·안 돼·치지 마")보다 **이미 있는 쉼 상태의 말("쉬어요")**로 묶으면 겁주지 않고, 그림(손이 떨어져 있음)과 문구가 같은 것을 가리킨다. 근거: projects/rhythm-02/10-lore.md 2절·7-3 `card_roof`. 적용: lore-writer·art-director(반대 행동 카드).
- [rhythm-02·2026-11-17] 콤보는 화면 문구 키를 두지 않고(글을 읽는 아이에게만 보상이 되고 신호가 늘어남) meter 대체 글 하나 + `aria-valuenow`로만 두며, `aria-live`로 알리지 않는다(낭독이 박자를 방해). 근거: projects/rhythm-02/10-lore.md 5절·6절 5·7-4. 적용: lore-writer·game-developer(세 게임 콤보).
- [rhythm-02·2026-11-17] 문구 겹침 검사는 같은 허브의 **모든 형제 게임**(rhythm-01·runner-01)과 함께 돌리고 금지 용어도 합친다. runner-01을 넣자 공통 UI 문구(`New best!` 등)가 새로 걸려 예외 목록을 정리할 수 있었다. 근거: projects/rhythm-02/10-lore.md 7-9 ⑤⑦. 적용: lore-writer.
- [rhythm-02·2026-11-17] 레벨 테마를 기믹 물체 이름과 묶을 때, 배경 실루엣이 흘러가는 코어에서는 **배경이 그 레벨 위험 물체를 닮으면 안 된다**(배경 지붕을 보고 참는 오해). 근거: projects/rhythm-02/10-lore.md 4절 공통 규칙. 적용: art-director·lore-writer.
