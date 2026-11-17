# rhythm-01 작업 보고서 목록

에이전트별 작업 보고서입니다. 최신이 위에 옵니다. 규칙은 `harness/PIPELINE.md` "작업 보고서 규칙", 형식은 `harness/templates/report.md`.

| 날짜 | 역할 | 단계 | 제목 |
|---|---|---|---|
| 2026-11-17 | art-director | round-3 1-2 교차 리뷰 | [북길 교차 리뷰: `cards-r3/` 파일 이름 = 키(L1 `card_drum_tap`, L6 `card_run3` 새 그림 "붙은 별 셋", 세로판 포함, 외부 href 0), road-layout이 v3 레벨 미리 보기 박·별 목록 직접 읽고 거울 값·chunks=bars·첫 별 +6박 검사, 1박 px = balance 17-8 일치, sound-check 어댑터 확정 형식 + outro 제외(별 시각 0), `tut_drum_tap` en 208.6 px 1줄, balance 키 이름·카드 경로 반영 요청](art-director/2026-11-17-r3-cross-review.md) |
| 2026-11-17 | lore-writer | round-3 1-2 교차 리뷰 | [북길 교차 리뷰: L6 새 키 `card_run3` "붙은 별 셋, 톡톡톡 / Three stars, tap tap tap", `card_long_row`·`aria_streak_best` 쓰지 않음(삭제 0), L1 `tut_drum_tap`·`card_drum_tap` 확정, 콤보 문장 = balance 확정안(딱·좋아·통과 +1, 실패에서만 끊김, 무음 0.3 s), 글 자리 220 px 대조 통과, A1~A8 닫음, node 파싱 표 70 = 사용 65 + 폐기 3 + 쓰지 않음 2, balance·art 키·파일 이름 R24 반영 요청](lore-writer/2026-11-17-r3-cross-review.md) |
| 2026-11-17 | game-developer | 1-3 round-3 | [R11 지연 보정(탭마다 autoNow·시도마다 comp·안정 대기·재시작 1.08 s 유지, C2 다름 0)·R12 성능(탭 아이콘 PNG·카드 미리 그리기·GC·층 구조, 6배 스로틀 35/36)·R13 훅 화면, R14~R16 구현됨, 빌드 데이터 v2 유지](game-developer/2026-11-17-r3-build.md) |
| 2026-11-17 | balance-designer | round-3 1-1 새 코어 | [북길 밸런스·레벨: 스키마 v3(path.chunks 덩어리 + 파생 bars, v2 `_r2_deprecated`)·L1~L10 재설계(N1~N11 전부 PASS, L6 새 기믹 반박 3연속 `card_run3`)·미리 보기 세로 min(가로, 3.5)·처음 보는 무늬 비용 봇 σ70 m̃ 2.83 → 21.02, B6 T 22.75 (−7.6 %)·시드 10개 −9.0 %·콤보 = 공통 문서안(성공마다 +1)·R17b 이른 −30 ms L7~L10 30회 초과 보고, 전체 실행 ALL PASS](balance-designer/2026-11-17-r3-new-core.md) |
| 2026-11-17 | art-director | round-3 1-1 새 코어 | [북길 시각·사운드: 판정 선 x 30/20 %·미리 보기 288~896 px·별 33~72 px(layout.json)·세로 미리 보기 min(가로, 3.5)로 반박 41.1 ≥ 41 해결·겹침 298 ≤ 320 ms·왼쪽 부채꼴 판정 5/3/0·콤보 HUD 점 10칸 + 큰 표지(무음 끊김)·카드 5장 cards-r3·금지 목록 11·콤보 화음 −13.5 dB, palette 460쌍·sound-check·road-layout OK](art-director/2026-11-17-r3-new-core.md) |
| 2026-11-17 | lore-writer | round-3 1-1 새 코어 | [북길 세계관·텍스트: 북시계·북채 폐기 → 북길·판정 북·통통 공·흘러오는 별, 화면 이름 공/별/북/길, 키 64 → 69(사용 66, 새 5 `tut_drum_tap`·`card_drum_tap`·`card_long_row`·`aria_streak`·`aria_streak_best`, 폐기 3), 레벨 이름 10개 유지(N4는 R16), 콤보 대체 글은 공통 문서 기준·끊김 소리 없음](lore-writer/2026-11-17-r3-new-core.md) |
| 2026-11-17 | benchmark-analyst | round-3 코어 개선안 (1-0 보완) | [몰입감 분해(GD 미리 보기 1.16 s·판단 0.80 s 실측 파생)·추천 코어 "북길"(오른쪽에서 별이 흘러와 왼쪽 북에서 톡, 신호 1개)·반복 회피 N1~N11·판단 시간 L1 2.03 → L10 1.17 s·보여 주기/북채/궤도 폐기·콤보 = 좋아 이상 연속](benchmark-analyst/2026-11-17-r3-core-redesign.md) |
| 2026-11-17 | art-director | round-3 기획 수정 | [R14·R15·R16 art 규칙: 북채 퇴장 점선 굵기·불투명도 × k(1 − q²)·빈칸 그대로·실선 테두리 1 − k / 세로 카드 226×880 + 공·별 1.2배, 360x640 보이는 면 공 20~21·별 19~20 px(기준 18) / 긴 이름 12 → 10 px(최소) → 두 줄 → 숨김, palette·sound-check 통과](art-director/2026-11-17-r3-art-rules.md) |
| 2026-11-17 | balance-designer | round-3 기획 수정 | [R17 자동 지연 차이 Δ: 정보 R17 (a) round-2 방식 Δ64 L1 14·L2 48회 / (b) R11 Δ64 = Δ0(L1 3·L10 16), R11 정의(calib.mjs)·안정 대기 키(+잠금 해제 뒤 400 ms)·재시작 1.08 s 유지 조건, 검증 ALL PASS 193·B6 13.363·B7 그대로](balance-designer/2026-11-17-r3-latency-delta.md) |
| 2026-11-17 | qa-engineer | 1-6 round-2 | [round-2 점수 집계 + 첫 실행 보정 재측정: autoNow 기준 오프셋 오차 +63~69 ms(4/4)·σ70 L1 17·L2 60회 → blocker 확정 제안, 기술 7.5 → 6.5, 가중 7.95, 판정표 총점·blocker 미충족, criteria 4줄](qa-engineer/2026-11-17-r2-1-6-score.md) |
| 2026-11-17 | balance-designer | 1-5 round-2 | [round-2 밸런스 리뷰: 검증 ALL PASS 193·B6 L10 13.36(−2.4 %)·M1·M3 해결, 13/13, 첫 실행 보정 auto 10→74 이중 보정(L1 σ70 14회) major — 7.5점, REVISE](balance-designer/2026-11-17-r2-1-5-review.md) |
| 2026-11-17 | art-director | 1-5 round-2 | [round-2 시각·사운드 리뷰: round-1 지적 11건 해결 확인, 8/8 · 9.0점 PASS, minor 3(사라짐 끝 번쩍 고리·360x640 카드 여유 0·훅 글)](art-director/2026-11-17-r2-1-5-review.md) |
| 2026-11-17 | benchmark-analyst | 1-5 round-2 | [round-2 감각 리뷰: 신호 겹침·최고 진행도 해결, 실패 → 다음 별 2.8~5.4 s, 입력 1프레임 16/16, 13/13(8.5점, PASS), minor 2](benchmark-analyst/2026-11-17-r2-1-5-review.md) |
| 2026-11-17 | lore-writer | 1-5 round-2 | [round-2 세계관·텍스트 리뷰: 64키 불일치 0·R1/R8·round-1 지적 9건 해결, 6/6 9.0점 PASS, minor 2(영어 360 L9 이름 숨김·훅 튜토리얼 글)](lore-writer/2026-11-17-r2-1-5-review.md) |
| 2026-11-17 | qa-engineer | 1-4 round-2 | [round-2 QA: M1 픽셀 확인 동시 표시 0·회귀 20/22 해결·1% low 3회 반복 30/36 실패(7.5점, REVISE)](qa-engineer/2026-11-17-r2-1-4-qa.md) |
| 2026-11-17 | game-developer | round-2 구현 | [북채 퇴장·손가락(R1·R2)·6배 스로틀 1% low 10~11/12창 ≥ 45(round-1 4/12)·세로 카드·레벨 카드·확인 창(R6)·sound.json·멜로디 동기(R7)·aria(R8)·지연 값 일치(R9), selfcheck ALL OK](game-developer/2026-11-17-r2-fixes.md) |
| 2026-11-17 | balance-designer | round-2 기획 | [북채 퇴장(마지막 별 +0.5박, S15·S16)·손가락 0.25박·B6 연속 중앙값(T 13.70, L10 13.36)·L4~L10 별 1~3개 줄임·보정 정의 통일(C1), 검증 ALL PASS 193](balance-designer/2026-11-17-r2-balance-revision.md) |
| 2026-11-17 | art-director | round-2 기획 | [아트·사운드 수정: 북채 퇴장(R1)·세로 카드·레벨 카드·확인 창(R6)·sound.json·멜로디 동기 10개·소리 크기 1.9/6.4 dB(R7)·카드 손가락(R10)](art-director/2026-11-17-r2-art-revision.md) |
| 2026-11-17 | lore-writer | round-2 기획 | [10-lore 수정: 북채 마지막 타격 직후 퇴장·손가락은 그 뒤(R1), 7-10 aria 사용 규칙(R8), 키 64 그대로](lore-writer/2026-11-17-r2-lore-revision.md) |
| 2026-11-17 | qa-engineer | 1-6 | [round-1 점수 집계: 가중 6.925·게이트 실패·이슈 22건 병합·criteria 12줄 추가](qa-engineer/2026-11-17-1-6-round1-score.md) |
| 2026-11-17 | art-director | 1-5 | [round-1 시각·사운드 리뷰: 팔레트·소리값 일치, 북채-손가락 충돌·세로 카드 크기(6.0점, REVISE)](art-director/2026-11-17-1-5-round1-review.md) |
| 2026-11-17 | benchmark-analyst | 1-5 | [round-1 감각 리뷰: 1프레임 반응·재시작 1.09 s 통과·L1 북채/손가락 신호 엇갈림(7.0점, REVISE)](benchmark-analyst/2026-11-17-1-5-round1-review.md) |
| 2026-11-17 | balance-designer | 1-5 | [round-1 밸런스 리뷰: 곡선 한도 통과·B6 반올림 경계·북채 신호 겹침(7.0점, REVISE)](balance-designer/2026-11-17-1-5-round1-review.md) |
| 2026-11-17 | lore-writer | 1-5 | [round-1 세계관·텍스트 리뷰: 문구 64키 일치·L1 손가락/북채 겹침 major(7.0점, REVISE)](lore-writer/2026-11-17-1-5-round1-review.md) |
| 2026-11-17 | qa-engineer | 1-4 | [round-1 QA: 판정 일치 12만 시도·결정 9 통과·6배 스로틀 1% low 미달(7.5점, REVISE)](qa-engineer/2026-11-17-1-4-round1-qa.md) |
| 2026-11-17 | game-developer | 1-3 | [웹 빌드 round-1: 박자 시계·보호자 보정·10레벨 실시간 클리어](game-developer/2026-11-17-1-3-web-build.md) |
| 2026-11-17 | balance-designer | 1-3 | [레벨 4~10 데이터·L10 목표(σ70 20회, T 19.76)·보호자 보정 흐름](balance-designer/2026-11-17-1-3-levels-04-10.md) |
| 2026-11-17 | art-director | 1-3 | [빌드 준비: palette.json·대비 320쌍 통과·보호자 문·소리 합성 표](art-director/2026-11-17-1-3-build-prep.md) |
| 2026-11-17 | lore-writer | 1-3 | [구현 직전 텍스트 키 보강(38 → 64개)](lore-writer/2026-11-17-1-3-text-keys.md) |
| 2026-11-17 | balance-designer | 1-2 | [교차 리뷰 2차: 결정 반영·곡선 재설계(σ70 L10 24회)](balance-designer/2026-11-17-1-2-revision.md) |
| 2026-11-17 | art-director | 1-2 | [교차 리뷰 2차: 30-art 결정 반영, 대비 230쌍 통과, 카드 5장](art-director/2026-11-17-1-2-revision.md) |
| 2026-11-17 | lore-writer | 1-2 | [교차 리뷰 2차: 10-lore 수정(키 38개)](lore-writer/2026-11-17-1-2-revision.md) |
| 2026-11-17 | orchestrator | 1-2 | [교차 리뷰 결정](orchestrator/2026-11-17-1-2-cross-review-decisions.md) |
| 2026-11-17 | balance-designer | 1-2 | [교차 리뷰 1차: lore·art 대조 지적](balance-designer/2026-11-17-1-2-cross-review.md) |
| 2026-11-17 | art-director | 1-2 | [교차 리뷰 1차: 지적 18개(major 6)](art-director/2026-11-17-1-2-cross-review.md) |
| 2026-11-17 | lore-writer | 1-2 | [교차 리뷰(1차): 세계관 기준 충돌 15건](lore-writer/2026-11-17-1-2-cross-review.md) |
| 2026-11-17 | balance-designer | 1-1 | [밸런스 기획: 판정 창·10레벨 곡선·레벨 1~3 데이터](balance-designer/2026-11-17-1-1-balance.md) |
| 2026-11-17 | art-director | 1-1 | [아트·사운드 디렉션: 박자 시계 10레벨](art-director/2026-11-17-1-1-art.md) |
| 2026-11-17 | lore-writer | 1-1 | [세계관·텍스트 기획: 똑딱북](lore-writer/2026-11-17-1-1-lore.md) |
| 2026-11-17 | benchmark-analyst | 1-0 | [코어 설계: 박자 시계 추천](benchmark-analyst/2026-11-17-1-0-core-design.md) |
| 2026-11-17 | orchestrator | 1-0 | [배리에이션 착수와 지시 전파](orchestrator/2026-11-17-1-0-variation-kickoff.md) |
