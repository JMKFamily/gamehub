# round-2 1-2 교차 리뷰 + 1회 수정

- 날짜: 2026-11-17
- 역할: lore-writer
- 프로젝트: rhythm-02
- 단계: round-2 1-2

## 요청 받은 일
오케스트레이터: round-2 기획(흘러오는 길 + 콤보) 세 역할 산출물을 lore 관점(텍스트 키·이름·용어·글 없이 이해·5~6세 말)으로 교차 리뷰하고, 결정 R2-D1(card_twoballs 키 삭제)·R2-D6(표시 이름 유지 + art 그림 대조)·R2-D7(콤보 대체 글 = insights 줄)·R2-D8(세 문서 구분 표 대조)과 리뷰에서 찾은 lore 쪽 문제를 한 번에 고친 뒤 7-9 검사(카드 키 엄격 대조 포함)를 다시 돌림.

## 한 일
1. 읽음: 오케스트레이터 감시 문서(안건 1~8, R2-D1~D8), `harness/insights.md`(5~6세 절 콤보 대체 글 줄 포함), `harness/criteria.md`, `20-balance.md`·`balance.json`·`levels/*.json`, `30-art.md`·`assets/layout.json`·카드·아이콘·목업, 빌드 `games/rhythm-02/js/main.js`(레벨 카드 대체 글 구조, 읽기만), rhythm-01·runner-01 콤보 대체 글.
2. 교차 리뷰 `reviews/cross-r2/lore-writer.md`: 이슈 9개(major 2·minor 4·info 3).
   - major 1(art·balance): 가지 그림이 [앞 접촉 박, 마지막 반박 박] 그대로라 들어가는 표시·마지막 표시가 가지 양 끝에 반쯤 걸려, 가지 밑 판정 2·4개가 화면에서 촘촘한 표시 3·5개로 보임 → 카드 "톡톡"·"톡톡톡톡"과 어긋나게 읽힘. 모든 가지(L6·L7·L8·L9·L10)에서 같음. 규칙 "가지 밑 표시 수 = 카드 횟수, 들어가는 표시는 가지 밖" 제안.
   - major 2(dev, art 문서): 레벨 카드 최고 기록 progressbar·최고 콤보 meter가 `aria-label` 버튼 안이면 낭독 안 됨(round-1 빌드가 이미 그럼). 버튼 밖 형제 요소로.
   - minor: lore 콤보 대체 글이 insights와 어긋남(valuetext 금지, "Streak", rhythm-01 "Best streak" 글자 겹침) → 고침 / 세 문서 구분 표 빠진 행·"클리어 구름 ↔ 끝 구름" 이름 둘 / 지붕 = 줄무늬 차양 이름 읽힘 / 기획 문서의 "치지 마" 말.
   - info: 새 모양 키 점검(빠진 키 0), 카드 8장 문구 ↔ 그림 ↔ 첫 등장 대조(가지 2장 말고 맞음), 검증기 상태.
3. R2-D1: `strings.json`에서 `card_twoballs` 삭제, `_meta` 고침. 10-lore 7-3 행 삭제(10 → 9개), 예비 문구 후보는 3절 G5 줄에만. 키 84 → **83**.
4. R2-D6: 3절 모양 이름 표 "art와 맞출 것" 칸을 art 실제 모양으로 바꾸고 이름 모두 유지(표시 = 파란 반원 돔, 지붕 = 줄무늬 차양, 가지·긴 가지·큰 언덕·긴 구름, 북 다리, 조약돌은 장식이라 이름 없음). 끝 구름·최고 콤보 표지·소리 켜기 그림 줄 추가. `card_three` 그림 힌트를 art 칸으로 맞춤. 11절 L6(표시 추상) 닫음.
5. R2-D7: 6절 4를 비율(progressbar, valuetext 없음)/개수(meter, `aria-valuetext` = 숫자만)로 나눔. 6절 5에 "판정마다·단계·끊김 때 읽지 않음, meter는 플레이 내내 트리에, aria-hidden 켜고 끄지 않음". 6절 11·7-2에 레벨 카드 progressbar·meter "버튼 밖 형제". `aria_combo` "이어서 잘한 만큼 / Streak" → **"이어서 잘한 수 / Good taps in a row"**, `aria_best_combo` "제일 길게 이어서 / Best streak" → **"이어서 잘한 최고 기록 / Most good taps in a row"**. 5절·확정값 표 갱신.
6. R2-D8: 8-1에 판정 표식(파란 돔)·화면 구도·실패 모습·콤보 셈(지붕 +1) 행, 8-2에 허용 겹침 4개(흐름·앞쪽 박·지붕·1.1 s 재시작)와 모양·판정·끝 차이를 넣어 balance 2·2-1, art 10-1·10-2와 어긋남 0. 세 문서 쪽 빠진 행은 리뷰 이슈 4로 넘김.
7. 7-9 검사 강화: ③ 구분 `예비` 키가 있으면 실패 ⑤ 금지어에 콤보·combo·streak ⑥ **카드 키 엄격 대조** = strings `card_*` 전부 = 7-3 8개 = `balance.json gimmicks` W0~W7 = `levels/*.json card.id`("대기" 없앰) ⑧ 카드 그림 키마다 2장 필수 + 키 없는 그림은 "art 대기"로 출력. 문서 안 명령을 그대로 꺼내 실행해 같은 결과 확인.
8. 그 밖: `audio_unlock` 그림을 `icon-unlock_sound.svg`로, 스토어 긴 설명 "작은 점" → "작은 칸"(art 네모 칸), 9절 처리표에 R2-D1·D6·D7·D8·X-L1·X-L2, 11절 L7·L9 닫고 L10(가지 표시 수, major) 추가.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-02/reviews/cross-r2/lore-writer.md` | round-2 1-2 교차 리뷰(이슈 9, VERDICT REVISE — art·balance·dev 몫 남음) |
| `projects/rhythm-02/10-lore.md` | R2-D1·D6·D7·D8 반영, 7-9 검사 강화·결과, 9·11절 갱신 |
| `projects/rhythm-02/strings.json` | 83키(`card_twoballs` 삭제, `aria_combo`·`aria_best_combo` 문구 변경, `_meta`) |
| `projects/rhythm-02/Docs/lore-writer/2026-11-17-r2-1-2-cross-review.md` | 이 보고서 |
| `projects/rhythm-02/Docs/README.md` | 맨 위 한 줄 |

## 검증 결과
- 10-lore 7-9 검사(문서 속 명령을 꺼내 그대로 실행, `projects/rhythm-02/`에서):
  `doc 83 json 83 | cards strings=balance=levels 8 OK | same-as r01 32 runner 12 (common만 허용) | card files 16/16 |  PASS`
  - ①~⑧ 모두 PASS, 대기 없음. 글자 같은 문구는 모두 8-3 공통 UI 목록 안(게임 정체성 문구 겹침 0). 새 콤보 문구는 rhythm-01·runner-01 프로젝트 문서의 콤보 대체 글과도 다름(손 대조).
- balance 검증기 `node projects/rhythm-02/tools/verify-levels.mjs`(읽기만): **V7b PASS**(카드 키 = strings = 그림 16장, 남는 키·파일 없음). 같은 실행에서 409개 중 PASS 408 · FAIL 1(`04 B2 novice_sd50 평균 진행도 03 81.2 % > 04 81.3 %`) — 레벨 파일이 실행 직전 다시 생성돼 balance R2-D3 작업 중으로 보임, lore 파일과 무관.
- 카드 ↔ 레벨 대조(node로 `levels/*.json` objects 읽음): 가지 7개 모두 표시가 가지 양 끝에 하나씩 걸림(리뷰 이슈 1 근거).
- 그림 확인: `card_double.svg`·`card_roof.svg`를 브라우저 미리보기로 봄(file://, 서버·포트 안 씀).
- 못 한 것: 접근성 트리(ariaSnapshot) 확인은 round-2 빌드가 없어 못 함(dev·QA 단계).

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 이름·캐릭터·아트·음악·레벨 배치 없음, DJMAX 계열 판정·콤보 용어 안 씀)
- [x] 게임 선정·설계 원칙 (5~6세 쉬운 말: "콤보" 대신 "이어서 잘한 수", 12자·6단어 한도)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정(`reviews/cross-r2/lore-writer.md`, `10-lore.md`, `strings.json`, `Docs/lore-writer/`, `Docs/README.md` 한 줄), git 커밋·푸시 안 함. 다른 파일·games/는 읽기만. 서버를 띄우지 않았고 종료한 프로세스 없음

## 문제·남은 일
- major · art-director·balance-designer: 가지 밑 표시 수 = 카드 횟수가 되게 그림 구간·카드 그림 조정(리뷰 이슈 1). lore 문구는 그대로.
- major · game-developer: 레벨 카드 `aria_best` progressbar·`aria_best_combo` meter를 버튼 밖 형제로, 개수 meter `aria-valuetext` 숫자만, 콤보는 어떤 때도 낭독 알림 없음(10-lore 6절 4·5·11). art 6-2에 DOM 자리 한 줄(리뷰 이슈 2).
- minor · art-director: 10-2에 "1.1 s 재시작" 허용 겹침 행. minor · balance-designer: "클리어 구름"을 "끝 구름"으로 통일하거나 별칭(리뷰 이슈 4).
- minor · art-director: L5 지붕(차양)이 "지붕"으로 읽히는지 round-2 리뷰 스크린샷에서 확인(리뷰 이슈 5).

## 다른 팀에 줄 인사이트
- 반박 연타 물체(가지처럼 "밑에서 N번 빨리")는 그림 구간을 판정 구간 [앞 접촉, 마지막 접촉] 그대로 그리면 들어가는 표시와 마지막 표시가 물체 양 끝에 반쯤 걸려, 아이에게 보이는 촘촘한 표시 수가 카드 문구 횟수 N보다 1~2개 많아진다. "물체 밑 표시 수 = 문구 횟수, 들어가는 표시는 물체 밖"을 그림 규칙으로 두고 레벨 데이터로 자동 검사한다. 근거: projects/rhythm-02/reviews/cross-r2/lore-writer.md 이슈 1. 적용: art-director(그림 구간·카드), balance-designer(검증기), lore-writer(횟수 문구).
- 대체 글 규칙을 비율(진행도: valuetext 없음, 퍼센트 그대로)과 개수(콤보·시도 등: valuetext = 숫자만)로 나눠 적으면 dev가 어느 막대에 valuetext를 넣을지 헷갈리지 않는다. 근거: projects/rhythm-02/10-lore.md 6절 4. 적용: lore-writer, game-developer.
