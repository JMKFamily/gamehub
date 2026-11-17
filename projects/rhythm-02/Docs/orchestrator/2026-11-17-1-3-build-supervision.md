# 1-3 웹 빌드 round-1 감시와 허브 게시

- 날짜: 2026-11-17
- 역할: orchestrator
- 프로젝트: rhythm-02
- 단계: 1-3

## 요청 받은 일
game-developer에게 1-3 웹 빌드 지시(공통 블록 1~11 + D1~D18 + runner-01 인사이트 "테스트 훅 화면 = 일반 모드, 첫 프레임 미리 그리기"). 첫 빌드가 동작하면 허브에 "(개발 중)" 게시(요청자 지시).

## 감시 결과
- 보고서: Docs/game-developer/2026-11-17-1-3-web-build.md 있음. DEV_NOTES.md N1~N19.
- 쓰기 경로: `games/rhythm-02/`, `projects/rhythm-02/tools/`(build-web-data, selfcheck-*, serve), DEV_NOTES, Docs만(git status). 기존 tools/sim·verify·tools/art 수정 없음. games.json·harness·타 프로젝트 변경 없음.
- 오케스트레이터 직접 실행: `selfcheck-sim.mjs` 50/50 PASS(판정 모듈 바이트 동일, 빌드↔judge 20,090회 불일치 0), `verify-levels.mjs` 266/266(에이전트 보고, 판정 모듈 미변경). 외부 URL grep 0건. 크기 497 KB.
- 브라우저 직접 확인(포트 8739, 오케스트레이터가 띄운 PID만 종료): 타이틀 → 레벨 선택(L1만 열림, 글 없음, 등급 3칸 점선) → 레벨 시작 판(깃발·▶·카드) → 그림 카드(3컷: 내려옴·탭·올라감) → 플레이(받침 쉼, 손가락 + "공이 북에 닿으면 톡!"). 콘솔 0.
- 관찰(1-4 QA에 넘김, minor): 타이틀 → 레벨 선택 전환 때 약 1 s 동안 빈 화면(버튼만)으로 보임.
- 에이전트 보고 브라우저 selfcheck: 일반 모드 rAF+PointerEvent 10/10 클리어, 재시작 1105~1116 ms, 6배 스로틀 1% low 59.5 fps, 4해상도 104장 겹침 0. playwright는 PC에 있던 playwright-core를 환경 변수로 가리켜 실행(설치·다운로드 없음) — 규칙 위반 아님.
- 원본 보호·결제·광고·계정·git: 위반 없음.

## 허브 게시
- `games.json`에 rhythm-02 항목 추가(자기 항목만): 제목 "Tossaloft 높이통통 (개발 중)", 태그 rhythm·one-button·wip. `node scripts/validate.mjs` OK(4 games).
