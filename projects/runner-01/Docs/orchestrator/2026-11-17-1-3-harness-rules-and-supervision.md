# 1-3 하네스 규칙 전파와 에이전트 감시 기록

- 날짜: 2026-11-17
- 역할: orchestrator
- 프로젝트: runner-01
- 단계: 1-3 웹 빌드, 실측 벤치마크, 1-4 QA 착수

## 요청 받은 일
요청자 지시(시간순 요지):
1. HUMAN_TASKS.md 측정 장면 1~7을 블루스택(adb 127.0.0.1:6610)에서 재현해 측정하고 `benchmark/measurements.md`와 `benchmark/frames/`를 main에 커밋·푸시. 결제·광고 클릭·계정 변경 금지.
2. HANDOFF.md를 읽고 1-3 웹 빌드부터 파이프라인을 이어서 진행, 실측 결과가 나오면 벤치마크·밸런스에 반영.
3. 앞으로 모든 게임은 5~6세도 할 수 있는 아주 간단한 규칙 기반, 아트 컨셉이 강하지 않은 게임만 벤치마크.
4. 벤치마킹도 벤치마크 담당 에이전트가 하고, 메인 세션은 하네스 파이프라인 관리자 역할에 충실.
5. 메인 세션은 에이전트의 철저한 감시자이며, 요청자 지시 전파가 최우선.
6. 별도 승인 없이 피드백 루프로 가중 8점 이상이 나올 때까지 계속 진행.
7. 프로젝트별 폴더 관리, 프로젝트 폴더에 Docs 폴더를 두고 에이전트별 보고서 작성.

## 한 일
1. 레포 클론, adb 연결, ffmpeg 설치(요청자 승인), 약관 창은 요청자가 직접 동의.
2. 실측 초기 측정(장면 3 스크롤 속도, 재시작, 장면 1 점프)과 분석 도구 초안을 만든 뒤, 지시 4에 따라 실측을 benchmark-analyst에게 넘김(도구는 `benchmark/tools/`).
3. 지시 3·5·7을 `CLAUDE.md`, `harness/PIPELINE.md`, `harness/criteria.md`, `harness/templates/report.md`, `.claude/agents/*.md`에 반영.
4. game-developer에게 1-3 빌드 지시, 작업 중 새 규칙 전파. qa-engineer에게 round-1 QA 지시.
5. GitHub 푸시 권한 문제(403)를 요청자에게 알렸고, 요청자가 권한 있는 계정으로 로그인한 뒤 푸시함.

## 산출물
| 파일 | 내용 |
|---|---|
| `harness/PIPELINE.md` | 게임 선정·설계 원칙, 작업 보고서 규칙, 프로젝트별 폴더 관리 |
| `harness/criteria.md` | "대상 연령·단순성" 체크 항목 |
| `harness/templates/report.md` | 에이전트 작업 보고서 템플릿 |
| `CLAUDE.md`, `.claude/agents/*.md` | 위 규칙과 메인 세션 감시자 역할 |

## 검증 결과 (감시)
- game-developer 1-3 결과 직접 확인:
  - 금지 파일(`balance.json`, `00-benchmark.md`, `levels/`)은 diff가 없습니다.
  - `games/reverbound`의 외부 URL은 0개입니다.
  - 레퍼런스 이름 검색은 0건입니다. `dash`로 걸린 곳은 모두 SVG `stroke-dasharray`입니다.
  - `node scripts/validate.mjs`는 OK이고, `verify-levels`는 ALL PASS(3/3)입니다.
  - 판정: 위반 없음. 커밋 `dbc4a2f`.
- 1-3 빌드 시점에는 보고서 규칙이 없어 game-developer 보고서가 빠져 있습니다. 소급 작성을 지시했습니다.

## 규칙 준수 확인
- [x] 원본 보호
- [x] 게임 선정·설계 원칙 (규칙 문서에 반영, 빌드 반영은 QA·리뷰에서 확인 예정)
- [ ] 결제·광고 클릭·계정 변경 없음 — **위반 1건(오케스트레이터 본인)**
  - 경위: 초기 실측에서 가드 없이 화면 중앙을 탭하다가 전면 광고(Temu)를 눌러 광고 내장 브라우저의 로그인 화면이 열렸습니다.
  - 조치: 아무것도 입력하지 않고 브라우저와 광고를 ✕로 닫았습니다. 이후 포커스 가드 탭 스크립트(`benchmark/tools/taps.sh`)를 만들었고, benchmark-analyst 지침 6번에 수칙으로 넣었습니다. 가드가 다음 광고에서 탭 0회로 멈추는 것을 확인했습니다.
- [x] 커밋·푸시는 오케스트레이터만

## 문제·남은 일
- 실측 결과 확인 후 커밋·푸시, 00-benchmark.md·balance.json 반영 지시 (benchmark-analyst → balance-designer)
- round-1 QA 결과 확인 → 1-5 4역할 리뷰 → 1-6 집계 → 1-7 게이트, 8.0 이상까지 반복

## 추가 지시 전파 (2026-11-17)

- 요청자: "계속 진행, 별도로 묻지 않아도 됨"과 runner-01 완성 후 리듬 코어 변형 프로젝트 예약 지시. `STATUS.md` "요청자 지시" 절에 기록했습니다. runner-01 게이트 통과 전에는 착수하지 않습니다.
