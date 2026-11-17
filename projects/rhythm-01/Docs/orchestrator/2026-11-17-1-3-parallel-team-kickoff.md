# 1-3 병행 팀 착수와 지시 전파

- 날짜: 2026-11-17 · 역할: orchestrator · 프로젝트: rhythm-01 · 단계: 1-3 직전 ~ 1-7

## 요청 받은 일
요청자 지시: runner-01 팀과 같은 역할 구성의 팀을 하나 더 만들어 rhythm-01을 1-3 → 1-7 게이트까지 승인 없이 피드백 루프로 진행(최대 5라운드). 레벨 10 = 기존 3레벨 곡선을 이어 갔을 때의 레벨 6 수준.

## 착수 시점 상태 (직접 확인)
- `node tools/verify-levels.mjs --quick` → ALL PASS (L1~3 데이터, L4~10은 `curve_planned` 계획). σ70 중앙값(해석 예측) 2/3/4/6/8/10/15/16/20/24.
- 레벨 10 목표 계산(criteria 밸런스 절): L1~L3 σ70 중앙값 2/3/5 → 기하 평균 배율 √(5/2) ≈ 1.58 → L6 외삽 ≈ 5 × 1.58³ ≈ 19.8 → **L10 목표 ≈ 20 (±20 % = 16~24)**. 정식 값은 전체 실행(--quick 아님) 결과로 balance가 다시 계산.
- 블루투스·보정 화면(아이 σ70) 경우 L10 중앙값 60 → 결정 9 major가 실제로 남아 있음.

## 전파한 공통 지시 (모든 에이전트 지시에 포함)
1. 5~6세 단순 규칙(탭 1가지, 글 없이 이해), 약한 아트 컨셉(기본 도형·단색).
2. 원본 보호: 레퍼런스 이름·캐릭터·아트·음악·레벨 배치 금지, 리소스 자체 제작, 외부 CDN·리소스 금지.
3. 결제·광고 클릭·계정 변경 금지.
4. git 명령 금지(커밋·푸시는 오케스트레이터만).
5. `projects/runner-01/`, `games/reverbound/` 수정 금지 (같은 체크아웃을 runner-01 팀이 씀).
6. 작업마다 `Docs/<역할>/` 보고서 + `Docs/README.md` 표 맨 위 한 줄.
7. 게임 이름은 가안(똑딱북: Tickadrum). 웹 빌드 폴더는 이름 확정 전이라 `games/rhythm-01/`.
8. 선작업 금지: 게이트 범위 밖(모바일 포팅·수익화·스토어 문구) 작업 안 함.

## 감시 기록
(아래에 단계별로 덧붙임)

### lore-writer (1-3 직전 텍스트 키) — 통과
- diff 확인: `10-lore.md`, 본인 보고서, README 한 줄만 수정. git·runner-01·games 미수정.
- 키 38 → 64(26개 추가), 기존 키 삭제·문구 변경 0. 7-6 설명 한 줄(`btn_retry` 공용 → `calib_redo` 전용)만 변경, 근거 있음(낭독 혼동) → 채택.
- 넘긴 일: 보호자 설정 진입 방식(major) → art·balance 결과와 대조 후 game-developer에 확정 전달.

### art-director (1-3 직전 빌드 준비) — 통과
- diff 확인: `30-art.md`, `assets/`(palette.json·palette.mjs·아이콘 4·목업 7), 보고서, README 한 줄. git·runner-01·games 미수정. SVG 외부 href 0.
- `node assets/palette.mjs --check` 직접 실행: 통과(10테마 320쌍, 최저 꽉 찬 별 4.98).
- 보호자 설정 진입 = 설정 버튼 길게 누르기(플레이 화면엔 없음). 탭 1가지 원칙의 예외가 아니라 어른용 잠금 → 채택.
- 키 이름 충돌 정리(오케스트레이터 결정): art 제안 `calib_together`/`hint_sound_late` 대신 lore 확정 키 `calib_with_grownup`/`latency_warn` 사용, `btn_settings`는 이미 있음. lore 재작업 불필요.
- balance에 `guardian_gate.hold_ms`, `audio_latency.late_hint_ms`, 8-3 "박에 맞춘 그림 신호" 수정을 추가 전달.

### balance-designer (레벨 04~10) — 통과
- diff 확인: `levels/04~10`(신규), `balance.json`, `20-balance.md`, `tools/verify-levels.mjs`, `tools/sim/bots.mjs`·`plan.mjs`, 보고서, README 한 줄. git·runner-01·rhythm-01 밖 미수정. `curve_planned`는 삭제 없이 `_status: deprecated`.
- `node tools/verify-levels.mjs` 전체 실행 직접: 종료 0, FAIL 0, ALL PASS. σ70 중앙값 2/3/5/6/8/9/11/14/17/20. B6: L10 20 ∈ [15.8, 23.7] (배율 1.581, L6 외삽 19.76). B7 엄격 단조. L7까지 11 ≤ 20, 최대 증가 1.67배 ≤ 2배.
- 결정 9 판정 쪽: 보호자 보정(어른 σ40, 8번×2) 시 블루투스 L10 22회(아이 보정 44회). `guardian_gate.hold_ms` 2000, `late_hint_ms` 100, drift_check 추가.
- 새 기믹·카드 0 (기존 5장).

### 공통 문서 변경 (덧붙이기만)
- `harness/criteria.md` 밸런스 절: "레벨 10 목표" 항목 바로 아래에 측정 도구 줄 1개 추가(B6·B7 전체 실행). 기존 줄 변경·삭제 없음.

### game-developer (1-3 웹 빌드 round-1) — 통과
- diff 확인: `games/rhythm-01/`(신규, 330 KB), `DEV_NOTES.md`, `tools/`의 새 파일 4개(build-web-data, selfcheck-sim, selfcheck-browser, serve), 보고서, README 한 줄. 기존 검증기·레벨·balance 미수정, games.json·harness·scripts·runner-01·reverbound 미수정, git 미사용.
- 빌드 안 외부 URL 0(w3.org 네임스페이스 제외). playwright-core는 로컬 기존 것을 경로로 지정(설치·다운로드 없음, harness/qa/lib.mjs와 같은 방식).
- 직접 실행: `tools/selfcheck-sim.mjs` 8078/8078 OK, `scripts/validate.mjs` OK.
- 결정 9(블루투스·보호자 보정) 구현 보고됨 → QA 1-4에서 확인.

### qa-engineer (1-4 round-1) — 통과
- diff 확인: `reviews/round-1/`(qa.md·metrics.json·parts·shots 226장), `tools/qa-round.mjs`(신규), 보고서, README 한 줄. 빌드·기획·harness·runner-01 미수정, git 미사용. 같은 시각 `games/reverbound/` 변경은 runner-01 팀 작업(이 세션 범위 밖, 커밋하지 않음).
- 결과: blocker 0, major 2(6배 스로틀 1% low 31.9~44.6 < 45 / L1 튜토리얼 손가락·북채 1박 동시 표시), minor 4. 기술 품질 7.5. 빌드 봇 123,308회 judge.mjs 재판정 불일치 0, L10 σ70 19(목표 15.8~23.7). 결정 9 전 항목 통과.
- 다음: 1-5 4역할 리뷰 병렬.
