# 점수 집계: round 1 (flow-01 / 짝꿍색칠: Pairpaint)

- 날짜: 2026-11-18 · 집계: qa-engineer (1-6) · 새 측정 없음(요청자 토큰 절약 지시, 리뷰 파일 값만 옮김)
- 입력: `qa.md`, `benchmark-analyst.md`, `balance-designer.md`, `art-director.md`, `lore-writer.md`, `ux-reviewer.md` (모두 이 폴더). 점수·심각도·VERDICT는 각 리뷰 "점수"·"이슈" 절에서 그대로 옮김(집계에서 바꾸지 않음, 병합 때만 높은 심각도를 따름).
- 가중치: `harness/criteria.md` "점수 산정"(감각 25 · 밸런스 20 · 시각 20 · 세계관 10 · 기술 25). UX는 가중 총점 제외, 게이트 6.0(2026-11-18 추가 줄).

## 영역별 점수

| 영역 | 채점 역할 | 점수 | 가중치 | 가중 점수 | 체크 항목 근거 | VERDICT |
|---|---|---|---|---|---|---|
| 게임 감각·핵심 루프 | benchmark-analyst | 8.5 | 25 % | 2.125 | 8/8 (퍼즐 읽기, minor 4) | PASS |
| 밸런스·레벨 | balance-designer | 8.5 | 20 % | 1.700 | 12/12 (아이 봇 미보정·꼬리 p90 > 30 감점, minor 4) | PASS |
| 시각·사운드 | art-director | 7.2 | 20 % | 1.440 | 9/13 (가로 카드 폭·지도 별 SVG 두 원인, major 1·minor 6) | REVISE |
| 세계관·텍스트 | lore-writer | 7.5 | 10 % | 0.750 | 7/9 (카드 글 가림·플레이 화면 레벨 이름, major 1·minor 4) | REVISE |
| 기술 품질·안정성 | qa-engineer | 7.0 | 25 % | 1.750 | 14/18 (1% low 6~13 fps·메뉴 전환 100~450 ms, major 2·minor 7) | REVISE |
| **가중 총점** | | **7.765** | 100 % | 7.765 | | |
| (UX·한눈 구분, 총점 제외) | ux-reviewer | 7.0 | - | - | 5/6 (막힘 뜻 겹침·결과 % 뜻 다름, major 2·minor 8) | REVISE |

계산: 8.5×0.25 + 8.5×0.20 + 7.2×0.20 + 7.5×0.10 + 7.0×0.25 = 2.125 + 1.700 + 1.440 + 0.750 + 1.750 = **7.765**

## 게이트 판정

| 조건 | 기준 | round-1 | 결과 |
|---|---|---|---|
| 가중 총점 | 8.0 이상 | 7.765 | **실패** (−0.235) |
| 모든 영역 | 6.0 이상 | 최저 7.0 (기술) | 통과 |
| UX 점수 | 6.0 이상 | 7.0 | 통과 |
| blocker | 0개 (UX 포함) | 0개 (6개 리뷰 모두, 원본 보호 grep 0건) | 통과 |

**판정: 게이트 실패 → round-2 진행** (round 1/5). 모자란 0.235는 기술 7.0 → 8.0(+0.25) 하나로 메울 수 있고, 시각 7.2 → 8.0(+0.16)이 다음 지렛대.

## 이슈 전체 목록 (중복 병합)

- 합계: blocker 0 · major 5 (S1~S5) · minor 28 (S6~S33) · **33건** (원래 39건 = QA 9 + BA 4 + BD 4 + AD 7 + LW 5 + UX 10, 중복 6건 병합: QA8+AD1+LW1, QA9+BD1, QA6+LW3, QA7+AD7, AD2+UX7)
- 출처: QA·BA(benchmark-analyst)·BD(balance-designer)·AD(art-director)·LW(lore-writer)·UX(ux-reviewer) + 리뷰 이슈 번호. 심각도가 다르면 높은 쪽. E 표시는 아래 엇갈림 목록.

| # | 심각도 | 담당 | 내용 (한 줄) | 출처 | 엇갈림 |
|---|---|---|---|---|---|
| S1 | major | game-developer (그림 쪽 art-director) | 6배 스로틀 1% low 7회 모두 6.1~13.0 fps(기준 45), 레벨 시작 최장 200~533 ms, DPR3·1280 끄는 중 17~40 fps. 대조 페이지 59.5 → 빌드 원인, LoAF상 페인트·래스터. AD: `drawPlay` 매 프레임 전체 화면 그라디언트 + decor, 카드 SVG 그라디언트 12개 innerHTML, 판정 글 strokeText | QA1, AD 성능 절, BA(끄는 중 감각 동의) | E8 |
| S2 | major | game-developer | 메뉴 전환 최장 프레임 > 100 ms: 타이틀 → 지도 150~450 ms(첫 탭 오디오 잠금 해제 + 지도 SVG), 지도 → 판 100~233 ms | QA2, AD 성능 절 3 | - |
| S3 | major | art-director(layout), game-developer | 가로(640x360·1280x720) 그림 카드 상자가 판 기둥보다 넓어 자기 설명 글(`board_text`)을 덮어 잘림("Holes st…", "구멍은 / 되…", L2·L6 × ko/en) + 쌍 점 줄·달 표지 덮음. layout.mjs에 카드 ∩ 글 자리·HUD 검사 없음 | AD1(major), LW1(major), QA8(minor) | E5 |
| S4 | major | art-director(동작·소리), game-developer | 막힘 반응(1.08 숨 + 고리, 소리 없음)이 빈 곳 탭 "여기서 시작" 안내와 같은 움직임, 연결도 부풂 → "안 돼"로 안 읽힘 | UX1 | E7 |
| S5 | major | balance-designer(지표), art-director(결과), lore-writer(대체 글) | 플레이 % = 칠한 칸, 결과 % = 한 번에 이은 쌍 비율인데 20 px 아이콘만 달라 글 없이 구분 불가. L3 판 100 % → 결과 75 %·빈 별 자리, 별 없는 이유 안 알려 줌 | UX2 (관련 AD5) | E3 |
| S6 | minor | game-developer (배치 art-director) | 보호자 화면 360x640·640x360·1280x720 스크롤 필요한데 스크롤 표시 없음, 640x360 언어·기록 지우기 버튼 숨음 | QA3 | - |
| S7 | minor | game-developer | 테스트 훅 시계 0에서 `closeCard()` 무효(`closing = 0` 거짓) → 드래그 무시 | QA4 | - |
| S8 | minor | game-developer, ux-reviewer | 카드 닫힘 200 ms 동안 판 누름이 카드에 먹힘 → 첫 누름 무시(L2·L6 첫 진입) | QA5, BD·UX 동의 | E1 |
| S9 | minor | lore-writer, game-developer | 플레이 화면 접근성 트리에 레벨 이름 없음. LW: 캔버스 이름에 키 잇기는 10-lore 8절과 부딪힘 → `.sr` 제목 | QA6, LW3 | - |
| S10 | minor | art-director, ux-reviewer | 타이틀이 글 빼면 시작 단서 없음 + 412x915 로고 아래 약 430 px 빈 공간, 지도 잠긴 노드 7개 밋밋 → 스스로 칠해지는 3x3 판 히어로·잠긴 노드 판 크기 실루엣 | QA7, AD7, UX 동의 | - |
| S11 | minor | balance-designer → qa·orchestrator | "판 완료 → 다음 조작" 기준 문구가 00-benchmark 안에서 둘(다음 화면 0.8~1.2 s / 다음 판 조작 가능). 빌드는 결과 1.0 s·버튼 1.28 s·다음 판 첫 누름 1,417 ms(카드 판 1,715 ms). 값 유지·문구 확정 제안 | QA9, BD1, BA 동의 | E1 |
| S12 | minor | balance-designer(규칙), game-developer | 플레이 ↻(처음부터)는 이동 수 유지 → 별·100 % 불가, 결과 ↻(같은 아이콘)는 새 시도 | BA1 | E2 |
| S13 | minor | game-developer (연출 값 art-director) | 한 드래그 안 짝 점 닿기·물러나기 반복 시 연결음·조각·이름 연타(막힘은 250 ms 막기 있음) | BA2 | - |
| S14 | minor | lore-writer | `guardian_intro`가 "한 번에 아님" 조건을 좁게 설명(나눠 그어도 2번) | BA3 | E4 |
| S15 | minor | art-director | 판정 등급 구분이 글자 크기 18 % 차·튐·조각·음 수뿐, 이름 색 = 쌍 색 → 1단 옆 작은 별 | BA4 | - |
| S16 | minor | balance-designer, game-developer | 도움이 30 s 무변화에만 켜짐 → 헤매는 꼬리 못 받음(아이 봇 p90 L8 40·L9 33·L10 32) | BD2 | - |
| S17 | minor | balance-designer | L8 꼬리 무거움 p90/m̃ 2.9·헛 이동 8,626 → 아동 테스트 때 확인, 후보 판 교체 검토 | BD3 | - |
| S18 | minor | balance-designer | L5 쌍 몰림 28.1 %(한도 30) 다른 시드 재확인 없음 → 다음 전체 실행 때 L5·L10 두 번째 시드 | BD4 | - |
| S19 | minor | game-developer | 지도 별 줄 SVG가 크기 규칙 밖이라 48 px 렌더(설계 16k), 별끼리·첫 노드와 겹쳐 뭉친 띠 | AD2, UX7 | E6 |
| S20 | minor | art-director | 그림 카드 창 구성: 연장부 반쪽 점, 오른쪽 창 잘림, 반짝이 창 밖, 가장자리가 바탕에 묻힘 | AD3 | - |
| S21 | minor | art-director | L1 시연 유령 선 tint 대비 약 1.15:1, 손가락이 머리를 가림 | AD4 | - |
| S22 | minor | art-director, ux-reviewer | "칠한 칸" 아이콘(막대 두 줄)이 메뉴 막대처럼 읽힘 | AD5 | E3 |
| S23 | minor | game-developer | 결과 미니 판(지도 완료 노드 포함)이 둘레 구멍을 파내지 않음 | AD6 | - |
| S24 | minor | qa-engineer | ko/en `*-play-L2-card.png` 8장에 카드 없음(L2 이미 별 → D6 생략) → `card_fill` 화면 확인 0, S3 L2를 놓침 | LW2 | E10 |
| S25 | minor | lore-writer | `guardian_intro` ko "80 %이고" 줄바꿈 갈라짐, 보호자 "80 %"(띄움) vs 화면 "53%"(붙임) | LW4 | E4 |
| S26 | minor | lore-writer | 영어 2단 "Nice"만 느낌표 없음 → "Nice!" | LW5 | - |
| S27 | minor | art-director | 쌍 선에는 모양 없음, 흑백 L* 44~55, protan 하트선·세모선 가까움 | UX3 | - |
| S28 | minor | art-director | 빈칸 경고 노랑 `#FFD36B` ≈ 별(금색) 쌍 tint, tritan ΔE 16.7 | UX4 | - |
| S29 | minor | art-director, balance-designer | 규칙 카드 전/후 그림에 맞고 틀림 표시 없음, 화살표 작음, 3 s 자동 닫힘 짧음 | UX5 | - |
| S30 | minor | game-developer | 지도 잠긴 노드 탭 반응 0 | UX6 | - |
| S31 | minor | art-director(배치) | 되돌리기·처음부터 위치가 세로/가로에서 서로 바뀜 | UX8 | E2 |
| S32 | minor | game-developer | L1 도움 누르면 시연 손가락과 도움 손가락이 잠깐 함께 보임 | UX9 | - |
| S33 | minor | art-director | 판 장식(D16)에 쌍 표지와 같은 세모·네모·별 사용(UX 절 연출 도형 줄) | UX10 | - |

## 역할 간 엇갈림 (오케스트레이터 결정 필요 표시 ★)

| E | 주제 | 엇갈림 | 집계자 메모 |
|---|---|---|---|
| E1 ★ | 완료 → 다음 조작 1.28 s 기준 | 00-benchmark 15절 "다음 판 조작 가능 0.8~1.2 s"로 읽으면 빌드 1,417 ms(카드 판 1,715) 실패, 4-2·10-3·16절 "다음 화면"으로 읽으면 1.0 s 통과. QA는 결정 요청, BD는 값 유지·문구 확정(버튼 1.28 s는 축하 중 오조작 막기), BA 동의. QA 기술 점수는 퍼즐 읽기(결과 1.0 s)로 통과 처리 | criteria 게임 감각 절에 BD·BA 확정안을 잠정 줄로 덧붙임. 카드 판 1,715 ms는 S8 고친 뒤 "카드 닫힘 즉시"로 다시 잼. 15절 462행 문구 정정은 benchmark-analyst |
| E2 ★ | 플레이 중 ↻ 이동 수 | BA1: 처음부터 = 새 시도(moves·undoStack 초기화, 00-benchmark 13-2 정정). 현재 20-balance R9·QA 5b는 "이동 수 그대로"를 정상으로 검사. UX는 "처음부터도 되돌리기로 복구되므로 확인 창 불필요"(UX8·잘 된 점) — undoStack을 지우면 이 전제가 깨짐 | 둘 중 택1: (a) BA안 + 처음부터 실수 대비(확인·길게 누르기 등) (b) 현 규칙 유지 + 플레이 ↻ 아이콘을 결과 ↻와 다르게. 별 조건은 어느 쪽이든 지름길 없음(BA) |
| E3 ★ | 결과 %와 채움 % 혼동 | UX2 major "글 없이 구분 불가" vs LW 잘 된 점 "그림표가 달라 섞이지 않음", BA "G2·G3 의도대로 같음". AD5는 그 그림표(칠한 칸 아이콘) 자체가 안 읽힌다고 봄. UX 제안 "결과는 % 숫자 대신 쌍 점 줄"은 criteria 요청자 지시 줄("결과 화면에 레벨 정확도 %")과 부딪힘 | 요청자 지시를 지키려면 결과 %는 남기고 **모양으로 구분**(결과 = 쌍 점 줄 + 작은 %, 플레이 채움 = 판 테두리 막대 등). 글 없는 구분 기준은 criteria UX 절에 덧붙임 |
| E4 | `guardian_intro` 고쳐 쓰기 | BA3(설명 문장 추가)와 LW4(% 붙여 쓰기·조사 분리)가 같은 키 | lore-writer가 한 번에 고침(길이·줄바꿈 재확인) |
| E5 | 카드 가림 심각도 | QA8 minor(카드 떠 있는 동안 입력 막힘), UX ②는 같은 이유로 통과 처리 vs AD1·LW1 major(글이 잘려 읽힘·text_slots 위반) | 높은 쪽 major로 병합(S3). QA 화면 검사는 "글 넘침"만 재고 "가림"은 재지 않았음 → QA 도구 보강 |
| E6 | 지도 별 줄 고치는 방향 | AD2: CSS 한 줄로 크기 규칙만, UX7: "★ 3/10" 한 덩이나 노드 옆 표지로 구조 변경 | 먼저 AD안(크기)으로 고치고 다시 찍은 뒤 UX가 판단 |
| E7 ★ | 막힘 소리 | 00-benchmark 3-2 규칙 6 "막힘: 소리·진동 없음"(BA 재현표 "같음")·D3 vs UX1 짧고 낮은 "툭" 추가 | 움직임 분리(튕김)는 엇갈림 없음. 소리 추가 여부만 결정 |
| E8 | 성능 원인 | QA: 페인트·래스터(지도 SVG·카드 SVG·판 캐시), AD: 매 프레임 전체 화면 바탕 다시 그리기 | 서로 보완. dev가 두 쪽 모두 적용 후 같은 명령 3회 재측정 |
| E10 | QA 스크린샷 신뢰 | LW2: QA 카드 샷 8장에 카드가 없어 S3(L2)를 놓침 | QA 몫. 카드 샷마다 `card === true` 단언(criteria 기술 절에 덧붙임) |

(E9 번호는 쓰지 않음)

## round-2 우선순위

1. **S1·S2 성능**(game-developer, art-director 그림 단순화): 1% low ≥ 45(3회 모두)·메뉴 전환 ≤ 100 ms. 기술 7.0 → 8.0이면 게이트 총점 부족분(0.235)을 혼자 메움.
2. **S3 가로 카드 가림 + S20·S8**(art-director layout, game-developer): 카드 글을 카드 안 띠로, 가로 카드 폭 ≤ 판 기둥, layout 검사에 카드 ∩ {글 자리, HUD, 버튼} = 0, 닫힘 중 누름 통과. 시각·세계관 major 동시 해소.
3. **S4·S5 UX major**(art-director·game-developer·balance-designer): 막힘 = 튕김(부풂과 분리), 결과 %와 채움 %를 모양으로 구분 + 별 없는 이유 그림. E3·E7 결정 먼저.
4. 다음: S19(지도 별 크기), S9(sr 레벨 이름), S12(E2 결정 후), S13·S16(꼬리 도움 신호), S24(QA 샷 단언), 나머지 minor.
5. 회귀 확인(QA round-2): 빌드 판정 = 시뮬 0 불일치·빌드 m̃ = 시뮬 m̃ 유지(S12·S16 바꿔도 봇 m̃ 불변 확인), 효과음 렌더 ≤ 1 dB, 버튼 48 px·칸 54.9 px.
