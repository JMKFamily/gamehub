# UX2 개발 처리표 (game-developer, 2026-11-19)

근거: 요청자 지시 2026-11-19 「이제 UX를 흥미롭게 만들 차례」·「심지는 촛불로」, `art-director.md`·`lore-writer.md`·`balance-designer.md`, 30-art 12절, art.json `ux2`/`candle`, lore `worldmap.json`, balance.json 1.5.0. 마지막 sync로 모든 기획 데이터를 복사했습니다(엔진 해시 일치, engine 2.0.0).

| # | 항목 | 처리 | 위치 |
|---|---|---|---|
| 1 | 메인 로비 배치 | 반영. 위 HUD(재화·레벨·시즌 진행), 오른쪽 위 상점, 왼쪽 아래 설정, 가운데 아래 큰 「결투」와 좌우 「돌파」·「제작」, 가장자리 팩·수집·덱·스토리, 퀘스트·시즌 위젯 상시 표시, 뒤에 영웅 실루엣. 배치는 art `ux2.lobby_rects_px` 그대로 | `js/ux2.js` lobbyScreen |
| 2 | 결투 → 상대 실력 4단계 | 반영. 2×2 카드, 기본은 쉬움, 1·2·3승으로 다음 단계 열림(`stats.tierWins`), 잠김 문구는 `ai_tier_locked_n`. 고른 단계의 preset(easy/normal/hard/expert)으로 대전. ai.mjs 동기화 | `ux2.js` difficultyScreen, `meta.js`, `main.js` |
| 3 | 덱 첫 화면 | 반영. 주 버튼 3개(+새 덱·이름 바꾸기·⋯)와 그림 튜토리얼 5장(guide_deck_1~5, 첫 진입 한 번) | `ux2.js` decksFirstScreen |
| 4 | 튜토리얼 패널을 가운데 띠(35~65%)에, 가로 전장 세로 가운데 | 반영. 대상과 겹치면 겹치지 않는 쪽을 우선함. 덱 튜토리얼 대상을 「덱 전체」에서 「첫 덱 칸」으로 좁혀 띠 안에 들어오게 함(가운데 높이 0.56·0.59·0.58, 640×360만 대상이 커서 0.78). 대전 튜토리얼 배치 검사 이상 0 | `ui.js` coach |
| 5 | 수집: 기본은 글을 포함한 카드 한 장, 이야기를 열 때만 카드가 왼쪽으로 | 반영. 세로 화면은 카드가 46% 폭으로 줄며 왼쪽으로 가고, 이야기 패널(50%)은 카드 배율의 영향을 받지 않게 바깥에 고정(글자 14 px). 닫기는 한 줄을 다 씀 | `screens.js` storyToggle |
| 6 | 팩: 1개·연속·모두(최대 10) | 반영. 「모두 열기(n)」는 확인 후 희귀도 높은 순으로 보여 주고, 전설은 멈춤, 4초 상한, 건너뛰기 있음. 한 팩을 열면 요약 한 줄과 「다음 팩 열기(n)」. 희귀도 강조는 그대로 | `screens.js` crates·open, `ux2.js` openAllScreen |
| 7 | 스토리 = 월드맵 | 반영. 8지역 30노드, art 지도 그림(900×1100, 원본 배율)에 DOM 노드(48 px)를 겹치고 상태는 읽음·열림·잠김. 해구는 조건을 채우기 전까지 안개로 가림. 노드를 열면 이야기·연결된 카드 이야기·보상(`balance.worldmap.node_reward`)을 보여 줌. 해제 조건은 lore 조건과 balance `unlock_overrides`를 따름 | `ux2.js` worldmapScreen·nodePanel·unlockState |
| 8 | 심지 = 촛불 10자루 HUD | 반영. 그을음·켜짐·씀(연기)·여분·빈 자리. 꺼질 때는 오른쪽부터 차례로 꺼지고 전체 ≤500 ms, 켤 때도 차례로. 입력은 잠그지 않음(잠금 0). 정적 그림 두 장 위에 transform/opacity만 씀. 카드 비용도 촛불 모양으로 표시. 버튼·패널에 나무·소금 질감 | `battle.js` renderCandles, `style.css` |
| 유지 | 원래 대전 조작·심지 용어·유형 구분·튜토리얼 흐름·성능 수정·엔진 해시 | 유지(엔진 4파일 해시 일치) | — |

## 검증 (4해상도 360×640·412×915·640×360·1280×720)
- 화면을 차례로 확인: 로비 → 상대 실력 → 덱(튜토리얼) → 월드맵 → 노드 읽기 → 팩 모두 열기(6팩, 30장) → 수집 이야기 → 대전 촛불(20개).
  - 콘솔·페이지 오류 0, 48 px 미만 버튼 0, 로비 겹침 0, 월드맵 노드 겹침 0(28개).
  - 상대 실력 기본값은 1단계(쉬움). 덱 주 버튼 3개. 대전 튜토리얼 배치 검사 이상 0.
- 빌드 = 시뮬: easy·normal·hard·expert 각 1판(41·42·43·45 시드) 모두 OK.
- check-cards 통과(2회). engine-test는 통과 46, 실패 0. sync --check는 해시 일치. `tools/art/build.mjs`는 exit 0(UX2 로비 4해상도 OK).
- 스크린샷: `reviews/ux2/dev-shots/`.

## 넘기는 문제 (내 파일 아님 → balance-designer)
- **ai.mjs `minionVal`이 NaN을 냄**: 오라 효과가 `do:'aura'`일 때 `e.n`을 쓰는데, 예를 들어 B054는 `atk:1`만 있고 `n`이 없습니다. 그래서 `undefined*1.5`가 NaN이 됩니다.
  - 영향: hard·expert의 `cands.sort`가 NaN 값을 정렬하게 되어 JS 엔진마다 결과가 달라집니다. expert 시드 44는 Node와 Edge에서 45번째 행동이 갈립니다(Node는 카드를 냄, Edge는 영웅 능력을 씀). 게임 상태는 완전히 같았습니다.
  - 제안: `(e.n ?? e.atk ?? 0)`. 엔진은 무수정 복사 규칙이라 고치지 않았습니다.
