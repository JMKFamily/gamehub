# 오늘의 의뢰 종류 확장

- 날짜: 2026-11-19
- 역할: balance-designer
- 프로젝트: tcg-01
- 단계: UX 2차

## 요청 받은 일
오케스트레이터(UX major): 일일 퀘스트 3종이라 하루의 78 %가 중복 → 6~8종으로, 목표 수·보상·가중치, 하루 3개 서로 다른 종류(시드 결정적), 경제 재실행, 바뀐 키 목록.

## 한 일
1. balance.json 1.6.0: `daily_commission_types`(9종, 월드맵 조건부)·`daily_commission_draw_rule`.
2. 중복률 모의와 경제 재실행.
3. `reviews/ux2/balance-quests.md` 작성.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/tcg-01/balance.json` | 1.6.0 |
| `projects/tcg-01/reviews/ux2/balance-quests.md` | 키·종류 표·근거 |

## 검증 결과
- 어제와 겹침 78 → 41.4 %, 하루 수입 불변(소금화 170), 목표 덱 완성 중앙 19일. check-cards 통과.

## 규칙 준수 확인
- [x] 원본 보호
- [x] 게임 선정·설계 원칙: 예외 적용(18세)
- [x] 결제·광고 클릭·계정 변경 없음(보상은 게임 내 재화만)
- [x] 내 담당 파일만 수정, git 명령 안 함

## 문제·남은 일
- minor(game-developer): 판 결과에 새 측정값 기록, 추첨 규칙 구현. minor(lore-writer): 9종 이름.

## 다른 팀에 줄 인사이트
- 일일 과제는 종류 수가 중복률을 정한다(하루 3개를 k종에서 뽑으면 어제와 겹침 ≈ 3/k). 3종이면 사실상 매일 같다.
