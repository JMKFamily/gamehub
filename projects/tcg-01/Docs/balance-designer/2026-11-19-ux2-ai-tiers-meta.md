# UX 2차: 상대 실력 4단계·메타 데이터

- 날짜: 2026-11-19
- 역할: balance-designer
- 프로젝트: tcg-01
- 단계: UX 2차(요청자 지시 2026-11-19)

## 요청 받은 일
요청자 원문 "결투는 나쁘지 않습니다. 상대 실력을 쉬움부터 선택되게 해주세요." 등(STATUS.md). balance 몫: AI 난이도 3단계 이상(엔진 불변, ai.mjs 매개변수), 목표 승률·측정, 시즌 보상 트랙·메인 퀘스트 목표·팩 모두 열기 규칙·월드맵 여는 조건(lore 제안 확정). 오케스트레이터 알림: lore 이름에 맞춰 4단계.

## 한 일
1. `ai.mjs`에 난이도 preset 4개(easy·normal·hard·expert): 판단 잡음, 공격 건너뛰기, 경주 판단, 상위 6수 한 턴 계획. 잡음 난수는 게임 난수와 분리된 결정론.
2. `run-matrix.mjs --ai2 <난이도>`: 사람 대리(eval) 대 난이도 AI 모드(덱 6×6).
3. 목표 승률을 정하고 측정·조정(어려움 잡음 4번 시험).
4. balance.json 1.5.0: `ai.difficulty`(단계·열기 조건·측정값), `economy.main_quests`, `crate_open`, `tide_calendar`(단계 340, 25단계 보상), `weekly_accord.goal_commission_claims`, `daily_commission_goals.brine_damage`, `worldmap`(여는 조건 확정·노드 보상).
5. econ 재실행, 20-balance 15절, `reviews/ux2/balance-designer.md`.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/tcg-01/tools/sim/ai.mjs` | **dev sync 대상**: AI_LEVELS, AI_PRESETS, evalAction(state, preset), raceFace(state, p, preset), chooseAction |
| `projects/tcg-01/tools/sim/run-matrix.mjs` | `--ai2` 대리 대 난이도 모드 |
| `projects/tcg-01/balance.json` | 1.5.0 |
| `projects/tcg-01/20-balance.md` | 15절 |
| `projects/tcg-01/reviews/ux2/balance-designer.md` | 난이도 표·근거·메타 확정값·다른 역할 요청 |
| `projects/tcg-01/tools/sim/out/ux2-vs-*.md` | 난이도 측정 |

## 검증 결과
- 대리 승률: 쉬움 75.5 %, 보통 60.6 %, 어려움 42.6 %, 매우 어려움 33.1 %(각 10800판, CI ±0.9 %p) — 모두 목표 띠 안. 판 길이 중앙 모두 10턴, 쉬움 일방 5.0 %.
- 기존 AI 불변: round-2 게이트 실행(eval, 시드 701, 30000판) 재현 결과 매치업 칸 동일(JSON 일치), engine-test 46/46, check-cards 통과. 엔진 파일 변경 없음.
- 경제: 목표 덱 완성 중앙 18일(p90 34일).

## 규칙 준수 확인
- [x] 원본 보호
- [x] 게임 선정·설계 원칙: 예외 적용(18세)
- [x] 결제·광고 클릭·계정 변경 없음(보상은 게임 내 재화만)
- [x] 내 담당 파일만 수정(lore/worldmap.json은 읽기만, 확정값은 balance.json에), git 명령 안 함

## 문제·남은 일
- minor(game-developer): ai.mjs sync, 4단계 선택 화면·열기 조건, worldmap override 우선, 모두 열기 10개, 달력 25단계 세력 상자, 단계 340.
- minor(lore-writer): 월드맵 조건 문구 16·20.
- minor(qa-engineer): 난이도별 빌드 = 시뮬 행동열 일치 검사.
- minor(balance-designer): 사람 플레이 기록이 오면 쉬움 75 %가 실제 신규 유저에게 맞는지 재확인.

## 다른 팀에 줄 인사이트
- AI 난이도는 "잡음만"으로는 기준 AI보다 세게 만들 수 없다(잡음 0이 상한). 어려움 이상은 탐색(한 턴 순서 계획)을 더하고, 그 위에서 잡음으로 내려 맞춘다. 잡음 난수는 게임 난수와 분리해야 빌드 = 시뮬 재현이 유지된다.
- 수집 조건(보유 n종)은 첫 실행 수집량을 먼저 세고 정한다: 입문 덱이 세력 카드 10~14종을 이미 줘서 제안값 12종은 첫날 열렸다.
