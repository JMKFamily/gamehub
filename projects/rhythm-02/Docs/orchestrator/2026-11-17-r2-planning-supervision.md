# round-2 기획 3역할 감시 (몰입감 재설계 + 콤보)

- 날짜: 2026-11-17 · 역할: orchestrator · 프로젝트: rhythm-02 · 단계: round-2 1-1

## 감시 결과
| 역할 | 보고서 | 오케스트레이터 직접 확인 | 판정 |
|---|---|---|---|
| balance-designer | Docs/balance-designer/2026-11-17-r2-balance-redesign.md | `verify-levels.mjs` 전체: ALL PASS(대기 1 = V7b card_twoballs 잔재), L1 1.80·r 1.478·T 12.71(10.17~15.25)·L10 11.72, 시드 10개 모두 ±20 % 안, round-1 레벨은 V-R 실패·round-2는 V-R1~R7 통과 | 통과 |
| art-director | Docs/art-director/2026-11-17-r2-art-redesign.md | `check-all.mjs` 5/5 OK(물체 윗선 ≥ HUD 띠 4해상도, 표시 간격 ≥ 32 px, 콤보 화음 ≥ 1 dB 작게, 지붕 밑 쉼) | 통과 |
| lore-writer | Docs/lore-writer/2026-11-17-r2-lore-redesign.md | 84키, 7-9 PASS(카드 키 대조는 당시 balance 대기) | 통과 |
- 쓰기 경로: 각자 담당 파일만(git status). art 로컬 서버 8734·8735 자기 PID만 종료(보고). 다른 프로젝트·harness 변경 없음. 원본 보호(가시·블록·발판·고리·포털·음표 없음) 확인.

## 1-2로 넘기는 안건
1. V7b: card_twoballs 키·그림 잔재 삭제(lore·art) — 예비는 문서에만.
2. X-B2 콤보 화음 "다음 정박"이 19번 중 13번 다음 접촉과 겹침 → 오케스트레이터 결정 방향: "접촉 시각·놓침 구역~통과 창을 피하는 첫 정박"(공통 문서 4-4 "같은 순간 겹치지 않게" 준수).
3. 곡선이 q_nogo > 0 가정에 기댐(q 0이면 L4→L5, L8→L9 단조 깨짐) — 위험. 1-2에서 q 0에서도 단조가 유지되게 할지(지붕 참기를 난이도에서 빼고 hit만으로 곡선 확보) 검토. 지붕은 아이에게 "참기"라 쉬운지 어려운지 근거가 약함(K10).
4. 바탕 단계 규칙 art 변경(1 + round(2(n−1)/(P−1)))과 검증기 계산 일치.
5. 클리어 길 멈춤 감속(그림만 vs 함수), 지붕 덮기 시작 0.6박 전, 통과 폭 L8~L10 270 변경 확인.
6. 표시(W0) 모양 = 파란 반원 돔 → lore "표시" 이름 유지 여부.
7. 콤보 대체 글(마스터 인사이트 dbda131): meter·valuetext 숫자만·끊김 무음·최고 콤보 표지 위치.
8. rhythm-01 구분·runner-01 관계 절 세 문서 대조.
