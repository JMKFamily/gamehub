# flow-01 작업 보고서 목록

에이전트별 작업 보고서입니다. 최신이 위에 옵니다. 규칙은 `harness/PIPELINE.md` "작업 보고서 규칙", 형식은 `harness/templates/report.md`.

| 날짜 | 역할 | 단계 | 제목 |
|---|---|---|---|
| 2026-11-19 | game-developer | round-2 성능 3차 | [큰 영역 페인트 정리·지도/결과 상시 레이어: 메뉴 전환 ≤ 67 ms, 전체 1% low 18.4 미달 — 남은 긴 프레임 표는 DEV_NOTES](game-developer/2026-11-19-r2-perf3.md) |
| 2026-11-19 | game-developer | round-2 성능 2차 | [판 캐시·비트맵 전역 캐시·다음 판 미리, 오디오 조용할 때: 시작 창 최장 66.7 ms, 전체 1% low 15~20 미달(판정은 QA --blank-pair)](game-developer/2026-11-19-r2-perf2.md) |
| 2026-11-19 | game-developer | round-2 성능 | [유휴 그리기 requestIdleCallback·지도 노드 캔버스화·카드 불러오기 때 비트맵: 메뉴 전환 ≤ 100 ms(DPR2)·끄는 중 59.5, 전체 1% low 16 미달](game-developer/2026-11-19-r2-perf.md) |
| 2026-11-18 | game-developer | round-2 핫픽스 | [결과 ▶·↻ 멈춤 blocker 수정(rAF 보호), 테스트도 같은 경로·selfcheck 일반 모드 50판 흐름, 카드·지도 그림 유휴 비트맵, minor 3건 — 성능 기준은 부하로 미확인](game-developer/2026-11-18-r2-hotfix.md) |
| 2026-11-18 | qa-engineer | 1-4 | [QA round-2: 기술 품질 6.0·REVISE(blocker 1·major 1·minor 4), 결과 ▶·↻ 일반 모드 멈춤 blocker, 빌드 판정 = 시뮬 4만 판 불일치 0, 끄는 중 59.5 fps·카드 판 열기 133~267 ms](qa-engineer/2026-11-18-1-4-round2-qa.md) |
| 2026-11-18 | game-developer | round-2 | [빌드 수정: 성능 render 규칙(6배 스로틀 1% low 59.5·메뉴 전환 ≤ 67 ms), H1~H4, 50스테이지 장 페이지·색 돌려쓰기, 주스 연출, selfcheck 50판 ALL PASS](game-developer/2026-11-18-r2-build.md) |
| 2026-11-18 | art-director | round-2 기획 | [카드 = 판 안 + 카드 안 글(S3, 겹침 검사), 채움 막대·결과 쌍 점 줄(H3), 막힘 튕김 + 툭 −13 dB(H4), 그리기 규칙(S1·S2), 선 0.48·50바탕·챕터 페이지·주스 표](art-director/2026-11-18-r2-plan.md) |
| 2026-11-18 | balance-designer | round-2 기획 | [판정 모듈 1.2.0(H2), 스테이지 50개(5챕터, 전체 실행 ALL PASS, 끝 m̃ 25.33), 도움 이동 신호 43레벨, 규칙 카드 6 s, H1 문구 확정](balance-designer/2026-11-18-r2-plan.md) |
| 2026-11-18 | lore-writer | round-2 기획 | [guardian_intro 고쳐 씀(E4), Nice!, 플레이 .sr 제목, 결과 점 줄 result_dots(H3), 막힘 낭독 없음(H4), 50판·5장 이름·레벨 선택 문구, 키 117·9-9 PASS](lore-writer/2026-11-18-r2-plan.md) |
| 2026-11-18 | benchmark-analyst | round-2 기획 | [00-benchmark 정정: H1 완료 → 결과·버튼 타이밍(15절), H2 처음부터 = 새 시도(13-2), H4 막힘 "툭"+튕김(9절 바꿀 것)](benchmark-analyst/2026-11-18-r2-plan.md) |
| 2026-11-18 | orchestrator | 1-7 | [round-1 게이트 미통과(7.765), 결정 H1~H4(완료 시간, 처음부터 = 새 시도, 두 % 모양 구분, 막힘 소리)](orchestrator/2026-11-18-1-7-round1-gate.md) |
| 2026-11-18 | qa-engineer | 1-6 | [round-1 점수 집계: 가중 7.765·게이트 실패(총점 −0.235, 영역·UX·blocker 통과), 병합 이슈 33건(major 5·minor 28), criteria 13줄 추가, round-2 최우선 성능·가로 카드 가림·UX 막힘/결과 %](qa-engineer/2026-11-18-1-6-round1-score.md) |
| 2026-11-18 | ux-reviewer | 1-5 | [round-1 UX 리뷰: 5/6·7.0·REVISE(major 2·minor 8), 쌍 점 모양 표지 흑백·색약 구분 통과, 막힘 = 시작 안내와 같은 숨 쉬기·결과 %(한 번에 이은) ≠ 플레이 %(칠한 칸)·별 없는 이유 없음](ux-reviewer/2026-11-18-1-5-round1-review.md) |
| 2026-11-18 | art-director | 1-5 | [round-1 시각·사운드 리뷰: 9/13·7.2·REVISE(major 1·minor 6), 가로 그림 카드가 자기 글·쌍 점 줄을 덮음, 지도 별 SVG 48 px 렌더 겹침, 성능은 전체 화면 바탕 매 프레임 그리기 등 그림 단순화 제안](art-director/2026-11-18-1-5-round1-review.md) |
| 2026-11-18 | benchmark-analyst | 1-5 | [round-1 게임 감각 리뷰: 8/8·8.5·PASS(minor 4), 원작 규칙 12개·모던 패턴·콤보/이름/% 재현, 원본 보호 grep 0, 플레이 ↻ 별 자격·연결 연타 막기 제안](benchmark-analyst/2026-11-18-1-5-round1-review.md) |
| 2026-11-18 | lore-writer | 1-5 | [round-1 세계관·텍스트 리뷰: 7.5·REVISE(major 1·minor 4), 가로 화면 그림 카드 글이 카드에 가려짐·플레이 화면 레벨 이름 대체 글 없음(QA #6 동의)](lore-writer/2026-11-18-1-5-round1-review.md) |
| 2026-11-18 | balance-designer | 1-5 | [round-1 밸런스 리뷰: 12/12·8.5·PASS(minor 4), 빌드 m̃ 3.67→16.43 시드 10/10 단조·L10 −11.3 %, 완료 → 다음 기준 확정안(결과 1.0 s·버튼 1.28 s 유지)](balance-designer/2026-11-18-1-5-round1-review.md) |
| 2026-11-18 | qa-engineer | 1-4 | [QA round-1: 기술 품질 7.0·REVISE(major 2·minor 7), 빌드 판정 = 시뮬 300,000판 불일치 0·빌드 m̃ = 시뮬 m̃, 6배 스로틀 1% low 6~13 fps·메뉴 전환 100~450 ms 미달](qa-engineer/2026-11-18-1-4-round1-qa.md) |
| 2026-11-18 | orchestrator | 1-3 | [구현 감시·허브 "(개발 중)" 게시](orchestrator/2026-11-18-1-3-build-supervision.md) |
| 2026-11-18 | game-developer | 1-3 | [웹 빌드 round-1: 10레벨·지도·결과·보호자·오류, board.mjs 1.1.0 바이트 복사(sync-build), UX ①②③ 반영, selfcheck ALL PASS(10레벨 생성 답 별·100 %, 실제 마우스, 4해상도), verify --quick ALL PASS](game-developer/2026-11-18-1-3-web-build.md) |
| 2026-11-18 | balance-designer | 1-2 | [교차 리뷰 2차: 30건 처리(수정 28·해당 없음 2), L6 재선정(카드 구멍 [1,3] 판 안쪽), 결과 % = 한 번에 이은 쌍/쌍 수, 채움 % = 연결 칸, V1 = layout.json, core 1.1.0](balance-designer/2026-11-18-1-2-revision.md) |
| 2026-11-18 | art-director | 1-2 | [교차 리뷰 2차: 36건(수정 35·보류 1), 튜토리얼 그림 3장 레벨 JSON 생성 + 카드 = 첫 등장 검사, 둘레 구멍 외곽선 파내기, 등급 소리 음 개수 3/2/1(S7), 타이틀·보호자·오류 화면 글 자리](art-director/2026-11-18-1-2-revision.md) |
| 2026-11-18 | lore-writer | 1-2 | [교차 리뷰 2차: 28건 처리(수정 26/보류 2), F4·F5·G1~G7 반영, guardian_intro 결과 % 뜻 고침, 9-9 PASS](lore-writer/2026-11-18-1-2-revision.md) |
| 2026-11-18 | lore-writer | 1-2 | [교차 리뷰 1차: 이슈 24개(major 9), L6 구멍 모두 가장자리, 카드 그림 2장 ≠ 실제 판, 타이틀·보호자·오류 화면 글 자리 없음, F4·F5 lore 변경 10줄](lore-writer/2026-11-18-1-2-cross-review.md) |
| 2026-11-18 | art-director | 1-2 | [교차 리뷰 1차: 이슈 24개(major 7), 튜토리얼 그림 3장 ≠ 실제 판, 둘레 구멍 외곽선 규칙, 여백 16↔12 px, 연결음 등급 = 음 개수안](art-director/2026-11-18-1-2-cross-review.md) |
| 2026-11-18 | balance-designer | 1-2 | [교차 리뷰 1차: lore·art ↔ 밸런스 데이터 이슈 20개(major 8), 카드 그림 3장 좌표 불일치, 칸 px 결론 일치, 채움 % 정의 차](balance-designer/2026-11-18-1-2-cross-review.md) |
| 2026-11-18 | orchestrator | 1-2 | [교차 리뷰 1차 감시·결정 G1~G7(L6 안쪽 구멍, 결과 % = 한 번에 이은 쌍/쌍 수, 채움 % = 연결 칸, 등급 소리 ≥ 1.5 dB)](orchestrator/2026-11-18-1-2-cross-review-decisions.md) |
| 2026-11-17 | balance-designer | 1-1 | [밸런스 기획: 공용 판정 모듈·생성기·유일해 검증기(함정 실측)·아이/숙련 봇, 10레벨(이동 수 곡선), 콤보·이름·% 부분 적용](balance-designer/2026-11-17-1-1-balance-plan.md) |
| 2026-11-17 | art-director | 1-1 | [아트·사운드 기획: 모던 미니멀(소프트 그라디언트·둥근 띠), 6색 + 모양 표지, 판 옆 기둥 배치, 연결 손맛 연출, 5음 사다리 소리](art-director/2026-11-17-1-1-art-plan.md) |
| 2026-11-17 | orchestrator | 1-1 | [기획 감시·결정 F1~F5(몰림 한도, L10 −11.3 %, 플레이 중 판 채움 %, 판정 이름 판 밖)](orchestrator/2026-11-17-1-1-planning-supervision.md) |
| 2026-11-17 | benchmark-analyst | 1-1 | [게임 이름 후보 충돌 확인(웹 검색)](benchmark-analyst/2026-11-17-1-1-name-check.md) |
| 2026-11-17 | lore-writer | 1-1 | [세계관·텍스트 기획: 이름 가안 Pairpaint(짝꿍색칠), 한 문장 규칙, 판정 이름 3단, 키 66개](lore-writer/2026-11-17-1-1-lore-plan.md) |
| 2026-11-17 | benchmark-analyst | 1-0 | [벤치마크: 선 잇기 판 채우기 퍼즐(모던 재해석), 적합성·콤보/% 해석·난이도 해석·생성기](benchmark-analyst/2026-11-17-1-0-benchmark.md) |
| 2026-11-17 | orchestrator | 1-0 | [착수: Flow Free 벤치마크(모던 재해석), 공통 지시 블록](orchestrator/2026-11-17-1-0-kickoff.md) |
