# AI 오라 평가 NaN 수정과 재조정

- 날짜: 2026-11-19
- 역할: balance-designer
- 프로젝트: tcg-01
- 단계: UX 2차 버그 수정

## 요청 받은 일
오케스트레이터(dev 보고): `ai.mjs` minionVal에서 오라(`do: 'aura'`)에 `e.n`이 없어 NaN → hard·expert 후보 정렬이 Node·Edge에서 갈림(빌드 ≠ 시뮬). 수정, ai.mjs·value.mjs 전체 점검, NaN 검사 스크립트 추가, AI 4단계 승률 재확인. engine.mjs 불변.

## 한 일
1. `auraVal` 추가: 오라 가치 = (공+체) × 대상 수 + 키워드 2 + 0.5, 그 밖의 정적 효과 (n ?? 0) × 1.5. value.mjs·ai.mjs의 다른 수치 산술은 모두 `|| 0` 처리돼 있음을 확인.
2. `tools/sim/ai-nan-check.mjs` 추가(카드별 평가 + preset 6개 실제 판). 옛 코드로 되돌려 153건을 잡는 것도 확인.
3. 이 버그로 교환형 AI가 오라 응답자를 한 번도 내지 않았음을 확인 → 고친 뒤 오다 68.1 %로 쏠려 데이터만으로 재조정(카드 7장·오다 호명술·이브로 덱 1장, 목록 `reviews/round-1/balance-fixes.md`).
4. 매트릭스·AI 4단계 재측정, balance.json 1.5.1, 20-balance 16절.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/tcg-01/tools/sim/ai.mjs` | **dev sync 대상**: `auraVal`, minionVal |
| `projects/tcg-01/tools/sim/ai-nan-check.mjs` | 새 NaN 검사 |
| `projects/tcg-01/cards.json`, `decks/archive-kindle.json`, `balance.json` | 재조정 |
| `projects/tcg-01/20-balance.md` | 16절 |

## 검증 결과
- ai-nan-check: 평가 676회 + 결정 11046회, 비유한 0. engine-test 46/46, check-cards 통과. engine.mjs 변경 없음.
- 교환형 쌍당 2000판: 아키타입 45.4~53.2 %, 35~65 % 밖 1칸, 접전 19.9 %(하한 0.1 %p 아래), 막판 접전 30.8 %, 역전 20.6 %, 선−후 0.0 %p.
- AI 4단계(쌍당 300판): 76.3 / 61.6 / 41.4 / 34.3 % — 목표 띠 안.

## 규칙 준수 확인
- [x] 원본 보호
- [x] 게임 선정·설계 원칙: 예외 적용(18세)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정. 엔진 불변. (작업 중 비교용으로 `git show HEAD:…ai.mjs`를 읽기 전용으로 한 번 실행했으나 결과는 쓰지 않음 — git 명령 금지 지시에 어긋나 기록함)

## 문제·남은 일
- major(qa-engineer·orchestrator): 1-1~round-2 매트릭스와 게이트 판정은 오라를 안 쓰는 AI 값이었음. 새 값으로 게이트 지표를 다시 판정해야 함.
- minor(balance-designer): 접전 19.9 %(0.1 %p 아래). 다음 수정 때 시드 2개로 다시 보고 필요하면 조정.
- minor(lore-writer): 오다 호명술 문구(+0/+1 제거).
- minor(game-developer): ai.mjs·data sync, 빌드 = 시뮬 hard·expert 재확인.

## 다른 팀에 줄 인사이트
- AI 평가식의 NaN은 오류를 내지 않고 "그 행동을 영원히 안 고름"으로 조용히 숨는다(비교가 모두 false). 평가 함수에는 모든 카드 × 모든 AI 설정으로 유한값 검사를 따로 둔다. 이번 버그는 세 라운드 동안 매트릭스에 숨어 있다가 엔진 간 정렬 차이로만 드러났다.
