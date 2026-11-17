# 공통 인사이트 (모든 개발팀 공유)

벤치마크·개발·QA·리뷰에서 얻은 배움 중 **다른 프로젝트에도 쓸 수 있는 것**을 모읍니다. 요청자 지시(2026-11-17): Geometry Dash 벤치마킹은 계속 진행하고, 얻은 인사이트는 모든 개발팀에 전달합니다.

## 규칙
- 모든 팀의 모든 에이전트는 작업을 시작할 때 이 문서를 읽고, 자기 작업에 해당하는 항목을 지킵니다. 적용하지 않으면 보고서에 이유를 적습니다.
- 새 인사이트는 각 팀 오케스트레이터가 근거(보고서·커밋)와 함께 해당 절 맨 아래에 덧붙입니다. 기존 줄은 지우지 않고, 틀린 것으로 밝혀지면 `(폐기: 이유)`를 붙입니다.
- 형식: `- [출처 프로젝트·날짜] 인사이트 한 줄. 근거: 경로. 적용: 어떤 역할이 무엇을 할지`
- 덧붙인 팀은 다른 팀 세션에 새 항목을 알립니다(메인 세션이 중계·감시).

## 레퍼런스 감각 (Geometry Dash 벤치마크)
(benchmark-analyst가 정리 중)

## 난이도·레벨 설계
- [rhythm-01·2026-11-17] "첫 클리어 시도 수 중앙값"을 정수로 판정하면 작은 값(2↔3)에서 경계에 걸려 외삽 목표가 19.8↔10.8로 뒤집힌다. 연속 중앙값 ln0.5/ln(1−p)(p = 첫 시도 클리어율)로, 시뮬레이터 전체 실행 한 원천에서만 판정하고 정수 중앙값은 참고로 적는다(빌드 봇 값은 일치 확인용). 근거: projects/rhythm-01/reviews/round-1/balance-designer.md, Docs/orchestrator/2026-11-17-1-7-round1-gate-and-round2-decisions.md(R3), harness/criteria.md 밸런스 절. 적용: balance-designer가 레벨 10 목표·곡선 검사에, qa-engineer가 집계에.
- [rhythm-01·2026-11-17] 난이도를 낮출 때 새 기믹·BPM·판정 창을 건드리지 않고 마디 무늬만 별이 적은 기존 무늬로 바꾸면 카드·튜토리얼·곡 길이를 그대로 둔 채 곡선을 맞출 수 있다. 근거: projects/rhythm-01/Docs/balance-designer/2026-11-17-r2-balance-revision.md. 적용: balance-designer.
- [rhythm-02·2026-11-17] 요청자의 레벨 10 제약(L6 외삽 ±20 %, 모든 레벨 30회 이하)은 L1~L3 배율 r에 상한을 건다: 목표 T = m̃1·r⁵, T·1.2 ≤ 30 → m̃1·r⁵ ≤ 25 (m̃1 1.9면 r ≤ 1.67). 아래로는 r ≥ 약 1.25여야 L3~L10 엄격 단조가 빠듯하지 않다. L1~L3를 설계할 때 r부터 정한다. 근거: projects/rhythm-02/00-benchmark.md 7-2. 적용: balance-designer(전 프로젝트).

## 5~6세 이해·튜토리얼·텍스트
- [rhythm-01·2026-11-17] "볼 차례/칠 차례" 같은 차례 신호는 기획 단계에서 시간축으로 겹침을 검사해야 한다. 북채가 마디 끝까지 남아 첫 별 1박 전 손가락과 동시에 보인 문제를 다섯 리뷰가 모두 major로 잡았다. 신호는 마지막 시범 동작 직후 사라지게 하고, 다음 판정 위험 구간(놓침 구역~통과 창 끝)과 겹치지 않음을 검증기(S15·S16)로 자동 확인한다. 근거: projects/rhythm-01/reviews/round-1/score.md(M1), tools/verify-levels.mjs S15·S16. 적용: balance-designer(검증기), art-director(퇴장 연출), lore-writer(문장에 숫자 대신 규칙).
- [rhythm-01·2026-11-17] 튜토리얼 손가락의 "누르기 시작" 동작이 판정의 놓침 구역 안에 있으면 그림을 따라 친 아이가 "너무 일찍"으로 실패한다. 손가락 누름 시작은 통과 창 안(이른 쪽 한계 이후)에 둔다. 근거: projects/rhythm-01/reviews/round-1/balance-designer.md 이슈 3. 적용: balance-designer, art-director.
- [rhythm-01·2026-11-17] 그림 카드·튜토리얼 그림 크기는 원본 SVG가 아니라 실제 화면에 그려진 px로 잰다(세로 360x640에서 공 12.6 px로 기준 16 px 미달이 렌더 측정에서만 드러남). 세로 화면용 카드 판을 따로 둔다. 근거: projects/rhythm-01/reviews/round-1/art-director.md 이슈 2, assets/cards-portrait.mjs. 적용: art-director, qa-engineer.
- [rhythm-02·2026-11-17] 새 코어 후보를 비교할 때 "신호 수"(한 순간 읽어야 하는 서로 다른 시각 단서 수) 열을 둔다. 신호가 하나뿐인 코어는 차례 신호 겹침(rhythm-01 M1)과 빌드/시뮬레이터 재판정 위험이 구조적으로 작고, 5~6세가 읽을 것도 적다. 근거: projects/rhythm-02/00-benchmark.md 2-3. 적용: benchmark-analyst(코어 선정), 모든 기획 역할(새 기믹이 신호를 늘리는지 확인).

## 시각·사운드
- [rhythm-01·2026-11-17] 효과음 크기 순서는 표의 dB 값이 아니라 오프라인 렌더(OfflineAudioContext, 마스터 뒤) 최고값·RMS로 확인한다. 층이 여러 개인 소리는 표보다 1~2 dB 커서 "아이 탭이 가장 큰 소리" 순서가 깨졌다. 근거: projects/rhythm-01/reviews/round-1/art-director.md, assets/sound-check.mjs --render. 적용: art-director, qa-engineer.
- [rhythm-01·2026-11-17] 소리·색처럼 빌드가 읽는 값은 문서 표를 파싱하지 말고 JSON 원본(assets/sound.json, palette.json)으로 둔다. 표 파싱 실패로 보정 화면 방울 주파수가 null이 된 사례. 근거: projects/rhythm-01/reviews/round-1/art-director.md 이슈 6. 적용: art-director, game-developer.

## 구현·성능
- [rhythm-01·2026-11-17] 6배 CPU 스로틀링에서 평균 60 fps여도 레벨 시작·재시작 직후 1% low가 32~44 fps로 떨어졌다(처음 그리는 그림 비용). 평균 fps만 보지 말고 시작·재시작 구간 1% low를 재고, 첫 그림을 로딩 때 미리 그려 둔다(round-2 수정 결과는 rhythm-01 round-2 qa.md에서 확인 예정). 근거: projects/rhythm-01/reviews/round-1/qa.md major 1. 적용: game-developer, qa-engineer.
- [rhythm-01·2026-11-17] WebAudio 판정 시계: `getOutputTimestamp()`는 이미 스피커 출력 시각이라 outputLatency를 다시 빼면 이중 보정이 된다. currentTime↔performance.now() 차이로 바꾸고 자동 지연·수동 오프셋을 한 번만 뺀다. 화면도 같은 보정 시계로 그린다. 근거: projects/rhythm-01/DEV_NOTES.md D1. 적용: game-developer(리듬 입력 게임 전반).
- [rhythm-01·2026-11-17] 블루투스처럼 큰 출력 지연은 아이가 보정 화면을 치면 잘 안 잡힌다(L10 시도 중앙값 44회). 어른(보호자)이 설정 길게 누르기로 들어가 8번×2회 쳐서 보정하면 22회로 줄었다. 오프셋은 자동으로 바꾸지 않고, 탭 밀림이 이어지면 레벨 선택·설정에만 그림 표지를 띄운다. 보정 화면 그림은 박에 맞춰 움직이면 안 된다(그림에 맞춰 쳐서 지연을 못 잼). 근거: projects/rhythm-01/20-balance.md 8-3~8-5, reviews/round-1/qa.md 결정 9. 적용: balance-designer, game-developer, art-director.

## QA·측정 방법
- [rhythm-01·2026-11-17] 빌드 판정과 시뮬레이터 판정의 일치는 같은 봇 탭을 양쪽에 다시 넣어 불일치 0으로 확인한다(123,308회 재판정). 보정·밀림 계산도 빌드 코드를 기준 정의로 삼아 시뮬레이터를 맞추고 무작위 대조(C1)한다. 근거: projects/rhythm-01/reviews/round-1/qa.md, tools/verify-levels.mjs C1. 적용: qa-engineer, balance-designer.
- [rhythm-01·2026-11-17] 헤드리스 브라우저에서는 실제 탭 전환이 visibilitychange를 내지 않아, 백그라운드 일시정지는 강제 이벤트로만 확인됐다(실기기 확인 필요로 표기). 일반 모드 autoplay가 게임 시계로 입력을 만들면 판정 오차가 0으로 나오므로, 실제 마우스(CDP) 입력 경로를 따로 잰다. 근거: projects/rhythm-01/reviews/round-1/qa.md. 적용: qa-engineer.

## 실측 작업 안전
