# rhythm-02 작업 보고서 목록

에이전트별 작업 보고서입니다. 최신이 위에 옵니다. 규칙은 `harness/PIPELINE.md` "작업 보고서 규칙", 형식은 `harness/templates/report.md`.

| 날짜 | 역할 | 단계 | 제목 |
|---|---|---|---|
| 2026-11-17 | balance-designer | r2 1-1 | [round-2 밸런스: 스키마 v2(hit/nogo·objects·scroll), judge.mjs 지붕 참기(bump_roof/hold)·세상 위치·콤보·이어 하기 되감기, 10레벨 다시 짬(무늬 되풀이 폐기, 위험 덩어리 레벨 안 1회·L9 7개), σ70+q_nogo 0.15 L1 1.80 → L10 11.72(T 12.71, −7.8 %, 시드 10개 평균 −1.1 %), V-R0 round-1 표 재현·round-1은 V-R 실패/round-2 통과, 콤보 단계 5/10/20, M1 무시 구간 0·잔차 ±15 두 쪽, N7 최소 2.46 s, verify 409개 PASS 408·대기 1·FAIL 0](balance-designer/2026-11-17-r2-balance-redesign.md) |
| 2026-11-17 | art-director | r2 1-1 | [round-2 아트: 북·공 0.30 W + 오른쪽에서 흘러오는 길(박 표시 = 반원 돔, 북 다리 밑에 오면 톡), 물체 실루엣(긴 구름·줄무늬 차양 지붕·가지/긴 가지·큰 언덕, 큰 통·점 통은 표시 간격), 모든 물체 윗선 ≥ HUD 띠(M2), 반박 표시 36 px ≥ 32, 콤보 HUD 띠 안 점 10칸 + 큰 표지·끊김 소리 없이, 카드 8장 새로, 소리 원본 = 빌드 Chromium 렌더(도구 차 ≤ 0.55 dB, N3), check-all 5개 OK](art-director/2026-11-17-r2-art-redesign.md) |
| 2026-11-17 | lore-writer | r2 1-1 | [round-2 세계관·텍스트: 한 문장 "표시가 북에 오면 톡! 지붕 밑에선 쉬기. 놓치면 다시.", 북과 공이 함께 길 여행, 모양 이름(길·표시·구름·지붕·가지·긴 가지·큰 언덕), 새 카드 card_roof "지붕 밑에선 쉬어요", L5 작은 마을·L6 물웅덩이, 콤보 대체 글 aria_combo·aria_best_combo(글·숫자 없음), round-1 이슈 N15~N21 문서 처리, runner-01 관계 절, 84키 7-9 PASS(balance 카드 대기)](lore-writer/2026-11-17-r2-lore-redesign.md) |
| 2026-11-17 | benchmark-analyst | r2 1-0 | [round-2 몰입감 재설계: 00-benchmark 14절, 후보 3(R2-A 흘러오는 길 선정·R2-B 공중 고리·R2-C 받아치기 탈락), 미리 보임 2.40~1.72 s(레퍼런스 1.16 s), 지붕 = 치지 마 신규·두 공 예비, 반복 없음 검증 V-R1~R7(round-1 서로 다른 위험 덩어리 1~4개 실측), 안전 한계·S6~S10, M1 따로 고침·M2 구조 원인 소멸, 콤보는 공통 문서 그대로 + 지붕 참기 +1](benchmark-analyst/2026-11-17-r2-immersion-redesign.md) |
| 2026-11-17 | qa-engineer | 1-6 | [round-1 집계: 감각 8.4·밸런스 7.5·시각 7.5·세계관 8.0·기술 8.5 → 가중 8.025, 게이트 3조건 숫자상 통과(major 2·REVISE 2 열림 → 검수 시점 오케스트레이터 결정), 병합 이슈 23건(blocker 0·major 2·minor 21), 엇갈림 E1~E6, criteria 13줄 덧붙임·보류 1](qa-engineer/2026-11-17-1-6-round1-score.md) |
| 2026-11-17 | balance-designer | 1-5 | [round-1 리뷰: 밸런스·레벨 7.5(13/14 + 부분 1), VERDICT REVISE, major 1(소리 맞추기 무시 구간 ±30: 경계 뒤집힘 + 이른 쪽 잔차 −30에서 w=1 L10 40.6 > 30 → 무시 구간 0 제안)·minor 3(이어 하기 준비 박 없음 → 구절 받침 쉼으로 되감기, B6 단일 시드 민감도, K2 L10 27.7), verify 266/266, 빌드 = 원본 바이트, 빌드 vs 시뮬 χ² 11.8 표본 오차, 10시드 B6 −0.5 %](balance-designer/2026-11-17-1-5-round1-review.md) |
| 2026-11-17 | art-director | 1-5 | [round-1 리뷰: 시각·사운드 7.5(8/10 + 부분 1·미확인 1), VERDICT REVISE, major 1(HUD 막대가 구름을 가로지름 — 360x640·640x360·1280x720, 원인 30-art 4-1 허용 문장)·minor 6(tut_tap 글 ↔ 구름 외곽선, 소리 측정 차 원인 정정, 결과 화면 구름 색, 세로 카드 구름 잘림, L6 시소, 전환 프레임 미확인), rhythm-01과 화면·소리 구분 재확인](art-director/2026-11-17-1-5-round1-review.md) |
| 2026-11-17 | lore-writer | 1-5 | [round-1 리뷰: 세계관·텍스트 8.0(5/6 + 부분 1), VERDICT PASS, blocker·major 0·minor 8(불러오기 실패 ↻ 버튼 안 보임, 시작 판·결과 대체 글 빠짐, tut_tap EN 구름 겹침, 10-lore 구분 칸 낡음), strings 원본 그대로·하드코딩 0, rhythm-01 정체성 문구 겹침 0](lore-writer/2026-11-17-1-5-round1-review.md) |
| 2026-11-17 | benchmark-analyst | 1-5 | [round-1 리뷰: 게임 감각 8.4(6/7 + 부분 1), VERDICT PASS, blocker·major 0·minor 4(이른 통과 탭 북–공 동기, QA 이슈 2 실패 연출 34 ms 유예 허용, 640x360 반박 29~32 px, visual_comp 실기기 미확인), 겹침·원본 보호 blocker 0](benchmark-analyst/2026-11-17-1-5-round1-review.md) |
| 2026-11-17 | qa-engineer | 1-4 | [round-1 QA: 기술 품질 8.5(14/16 + 부분 2), blocker·major 0·minor 5, 빌드 봇 24만 시도 재판정 불일치 0, σ70 L1 1.82/L10 12.52(시뮬 1.80/11.82), 재시작 1.10~1.12 s, 이중 보정 없음](qa-engineer/2026-11-17-1-4-round1-qa.md) |
| 2026-11-17 | game-developer | 1-3 | [웹 빌드 round-1: games/rhythm-02 10레벨·메뉴·보호자·연습, judge.mjs 그대로 복사, selfcheck node 50/50·브라우저 ALL PASS(재판정 불일치 0, 재시작 1.10~1.12 s), verify 266/266](game-developer/2026-11-17-1-3-web-build.md) |
| 2026-11-17 | art-director | 1-2 | [교차 리뷰 2차 수정: D1~D7·D9~D14·D16 반영(카드 키 이름·G6 삭제, 손가락 = fingerSchedule, Hp 1.111·가로 d 24, 받침 쉼 "콩" rest_a/b, 튐 선, 아이콘 20·메뉴 목업 6), check-all 5개 OK, 대기 없음](art-director/2026-11-17-1-2-revision.md) |
| 2026-11-17 | balance-designer | 1-2 | [교차 리뷰 2차 수정: D1·D3·D5·D10·D11·D13·D16 주 담당 + D4·D6~D9·D14 반영, ballsAt(L, t, hits)·V15~V17 신규, 266개 ALL PASS(곡선 1-1과 같음, 대기 없음)](balance-designer/2026-11-17-1-2-revision.md) |
| 2026-11-17 | lore-writer | 1-2 | [교차 리뷰 2차 수정: D1·D2·D3·D7·D8·D11·D12·D15 반영, 키 81개, 7-9 검사 PASS(rhythm-01 정체성 문구 겹침 0), 카드 파일 0/16은 art 대기](lore-writer/2026-11-17-1-2-revision.md) |
| 2026-11-17 | balance-designer | 1-2 | [교차 리뷰 1차: 이슈 20개(major 7), 손가락 50 ms 겹침·ballsAt 탭 무관·클리어 시간축·놓침 구역 곡 음 위반 0 확인, rhythm-01 구분 판정](balance-designer/2026-11-17-1-2-cross-review.md) |
| 2026-11-17 | art-director | 1-2 | [교차 리뷰 1차: 이슈 23개(major 12), 손가락·일찍 실패·늦은 탭 그림, 받침 쉼 "똑딱" = rhythm-01, rhythm-01 구분 판정](art-director/2026-11-17-1-2-cross-review.md) |
| 2026-11-17 | lore-writer | 1-2 | [교차 리뷰 1차: 이슈 16개(major 6), 카드 키 3중 불일치·손가락 50 ms 겹침·구름 혼동, rhythm-01 구분 판정](lore-writer/2026-11-17-1-2-cross-review.md) |
| 2026-11-17 | art-director | 1-1 | [아트·사운드 기획: 밝은 바탕+파란 납작 북+붉은 공, 카드 9장, 대비 230쌍·소리 크기 검사 통과](art-director/2026-11-17-1-1-art-plan.md) |
| 2026-11-17 | balance-designer | 1-1 | [밸런스 기획: 판정·높이·레벨 10개·검증기 235개 ALL PASS](balance-designer/2026-11-17-1-1-balance-plan.md) |
| 2026-11-17 | lore-writer | 1-1 | [세계관·텍스트 기획: 이름 가안 Tossaloft(높이통통), 레벨 10, 텍스트 원본 79키](lore-writer/2026-11-17-1-1-lore-plan.md) |
| 2026-11-17 | benchmark-analyst | 1-0 | [코어 선정: 통통 공받기](benchmark-analyst/2026-11-17-1-0-core-selection.md) |
