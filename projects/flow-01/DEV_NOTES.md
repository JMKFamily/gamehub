# flow-01 개발 노트 (game-developer)

기획 문서와 다르게 구현했거나, 문서에 없어 개발이 정한 것, 다른 역할이 확인할 것을 적습니다. 번호는 지우지 않고 바뀌면 `(바뀜: …)`을 붙입니다.

## 1-3 웹 빌드 round-1 (2026-11-18)

### 구조
- `games/flow-01/`: `index.html`(부트 블록은 sync-build 생성) · `style.css` · `js/main.js`(화면·입력·연출·테스트 훅) · `js/render.js`(캔버스 판 그리기·미니 판 SVG) · `js/layout.js`(배치 식) · `js/audio.js`(Web Audio 합성) · `js/haptics.js`(진동 어댑터) · `js/store.js`(저장) · `js/ads.js`(더미) · `js/board.js`·`js/rng.js`(판정 모듈 복사본) · `data/`(기획 원본 복사본).
- `projects/flow-01/tools/sync-build.mjs`: 원본 → 빌드 **바이트 그대로** 복사 + `data/manifest.json`(sha256) + 부트 블록. `--check`는 복사본이 원본과 같은지만 봄. 원본을 고치면 이 스크립트를 다시 돌리면 됨.
- `projects/flow-01/tools/serve.mjs`(포트 8740~8799만), `projects/flow-01/tools/selfcheck.mjs`(Playwright 자체 확인).

### 결정·차이

| # | 내용 | 근거·확인할 역할 |
|---|---|---|
| D1 | 판정은 `tools/core/board.mjs` 1.1.0·`rng.mjs`를 **수정 없이** 복사(확장자만 `.js` — GitHub Pages가 `.mjs`를 JS MIME으로 주는지 보장이 없어서). 입력 경로는 `pressHit → press → trackCell → moveTo → release`, 연출은 `d.events`, 표시층은 `displayLayer`·`accuracyPct`·`isStar`. 빌드 드래그 기록(`__game.dragLog`)을 `playDrag`에 다시 넣으면 10레벨 모두 같은 결과(selfcheck). **원본과 다르게 구현해야 할 판정 문제는 찾지 못함 → balance에 넘길 판정 문제 없음** | balance 20-balance 3절 |
| D2 | 배치는 `assets/check/layout.mjs`의 play·map·result·title·guardian·error 식을 `js/layout.js`로 그대로 옮김(값은 `layout.json param`). 4해상도에서 layout.json과 2364개 값 모두 같음(selfcheck). 식 안의 상수(56k 제목 띠, 0.20 W 등)는 art 식 그대로라 layout.mjs가 바뀌면 layout.js도 같이 고쳐야 함 → **art에 제안**: 식을 브라우저에서도 import 되는 모듈로 분리하면 복사만으로 맞출 수 있음 | art-director |
| D3 | **막힘(다른 색 점) 소리 없음 유지.** UX 지시 ②는 "그림·소리로"였지만 `layout.json motion.blocked.sound: null`·sound.json에 막힘 소리 키가 없고, 코드에 소리를 새로 만들면 데이터 원칙 위반이라 그림으로만 보강: 막은 점이 250 ms 숨 쉼(원래 규칙) + **그 점 색의 옅은 고리가 한 번 퍼짐**(새로 넣음, 0.55 → 0 투명도, 번쩍임 아님). 같은 점은 250 ms 안에 다시 울리지 않음. 1-5 UX 리뷰에서 소리가 필요하다고 보면 art가 sound.json에 부드러운 키를 더하면 빌드는 이름만 부르면 됨 | art-director, ux-reviewer |
| D4 | **빈칸·선 없는 칸을 눌렀을 때**(문서에 없음, UX ③ 첫 사용 학습으로 추가): 아직 안 이은 점들이 막힘과 같은 크기(1.08, 250 ms)로 한 번 숨 쉼 = "점에서 시작해요". 소리·글 없음 | ux-reviewer, art-director |
| D5 | 되돌리기·처음부터는 할 것이 없을 때(되돌릴 기록 없음 / 판이 비었음 / 완료 잠금) 흐리게(불투명 0.4) + `aria-disabled`. 눌러도 소리 없음(UX "불가 상태") | ux-reviewer |
| D6 | 그림 카드(L2 card_fill, L6 card_hole)는 **아직 다 칠하지 않은 판**을 열 때만 띄움(다시 하기·별 따기 때는 생략). 카드가 떠 있는 동안 판 입력 없음, 누르거나 3 s(게임 시계) 뒤 200 ms에 사라짐. 카드 글은 board_text 자리에 카드와 함께 | lore·art |
| D7 | L1 손가락 시연은 L1을 열 때마다 나옴(완료했어도). 첫 누름에 250 ms로 사라지고, 완료 전 8 s 동안 판이 안 바뀌면(마지막 누름 기준 포함) 다시 같은 일정으로 시작 — 반복 가능 | balance 10-1 |
| D8 | 빈칸 숨 쉬기 반복 간격: "2 s 뒤 아직이면 한 번 더"를 **앞 숨 쉬기가 끝난 뒤 2 s**로 읽음(시작 간격 2.6 s). 판이 바뀌면 처음부터 다시 셈(최대 3회). 동작 줄이기면 gapGlow 테두리 1.2 s 고정 | balance 9절 |
| D9 | 연결 tint: "띠가 지나간 칸부터 칸마다 120 ms 페이드"를 칸 순위 비율 × (0.6 × tint_ms 300) 지연 + 120 ms 페이드로 근사. 잘림·되돌아가기로 풀리면 120 ms에 빠짐 | art 5절 |
| D10 | 판정 이름: 캔버스에 시스템 둥근 글꼴 800, 흰 테두리 3 px(선 폭 6), 색 = 쌍 shade. 이름 아래 판 채움 %는 `icon-filled` 그림 + 숫자(inkSoft). 캔버스라 접근성 트리에 없음(= aria-hidden, 판정마다 읽지 않음 규칙) | lore 6-4, art 4-3 |
| D11 | 결과 화면: L10은 다음 판 ▶ 버튼을 숨김(다음 판 없음, 지도·다시 칠하기만). 결과 버튼은 완료 + 1280 ms 전 누름을 버림. 신기록 표지는 **이전 최고 %가 있고** 그보다 높을 때만(첫 완료는 비교 대상이 없어 표지 없음) | balance 9절, art 5-1 |
| D12 | 텍스트 키 66개 중 `store_short`만 빌드에서 쓰지 않음(스토어 등록 문구, 4단계용). 나머지 65개는 모두 화면·대체 글·부트 블록에서 씀 | criteria 세계관 rhythm-01 줄 |
| D13 | 불러오기·오류 화면은 layout.json을 읽기 전이라 같은 크기 규칙(k = clamp(min(W,H)/360, 1, 1.5), 머리 24k·설명 16k·↻ 72k)을 CSS clamp로 씀. ↻ 그림은 `icon-restart.svg`를 부트 블록에 인라인 | art 5-3, criteria rhythm-02 줄 |
| D14 | 완료 진동(30 ms)은 마지막 연결 + 150 ms 에 게임 시계로 부름(포인터 처리 바깥). 크롬은 사용자 활성화 뒤라 허용, 막히면 조용히 무시. 연결 진동(12 ms)은 포인터 처리 안 | sound.json haptics |
| D15 | `js/ads.js`는 에이전트 규칙의 어댑터 자리만 둔 더미이고 게임 코드는 아무 함수도 부르지 않음(1단계 광고·결제 없음) | — |
| D16 | 판 장식(palette decor: arc·ring·wave·triangle·square·star)은 판 카드 모서리 뒤 바탕 층에 0.9~0.6칸, 최대 0.4칸 보이게 단순 도형으로 그림. L10 별은 완료 때 400 ms에 나타남 | art-director(모양 확인) |
| D17 | 결과·지도 미니 판은 점 없이 tint 칸 + 선. 결과 화면은 끝난 판(답이 하나라 정답과 같음), 지도 완료 노드는 레벨 `solution` | art 5-1·5-2 |
| D18 | 진행 지도: 처음 끝낸 판을 지도로 돌아오면 그 판 → 다음 노드 길이 300 ms 뒤 500 ms 동안 칠해지고 `node_open` 소리. 노드 미니 그림 모양 바뀜(morph)은 바로 바꿈(300 ms 형태 전환은 round-2 후보) | art 5-2 |
| D19 | 테스트 모드(`?test=1`): 게임 시계는 `__game.step(dt)`로만 감(화면 전환 220 ms·결과 카드·연출 포함), 오디오 컨텍스트를 만들지 않고 재생 기록(`sfxLog`)만 남김. 조각 방향 등 무작위 연출은 레벨 번호 시드(`mixSeed`)라 일반 모드와 같은 그림. `?notext=1`은 글을 투명하게(QA notext 검사용), `?lang=ko|en`은 언어 강제 | insights 구현·성능, criteria 기술 품질 |

### 테스트 훅 `window.__game`
`ready`, `state`(title·map·play·result·guardian), `levelIndex`, `levelCount`, `clock`, `loadLevel(i)`, `step(dt)`, `board`(paths·pairDots·fillPct·completed·locked·card·tutorial·gap·text), `drag(cells)`(칸 좌표 열 → 칸 가운데 화면 좌표 → 실제 포인터 처리 함수 onDown/onMove/onUp), `press(cell)`·`move(cell)`·`release()`, `moves`, `colorMoves`, `attempts`(= moves), `progress`(= 판 채움 %), `result`(accuracyPct·star·oneShotPairs·moves·pairs·newBest), `dragLog`, `sfxLog`, `hapticLog`, `judge`, `layout`, `calcLayout(W,H,cols,rows)`, `coreVersion`, `audioState`, `store`, `toTitle()`·`toMap()`·`toGuardian()`·`closeCard()`·`undo()`·`restart()`·`help()`·`resultNext()`·`setLang(l)`.

### 못 한 것 (1-4 QA에 넘김)
- 6배 CPU 스로틀링 fps·1% low, 메뉴 전환 가장 긴 프레임: 재지 않음(첫 프레임 미리 그리기·판 카드 캐시·DOM 값 바뀔 때만 쓰기는 넣음).
- 효과음 빌드 OfflineAudioContext 렌더값 ↔ sound.json measured 대조(criteria rhythm-02 줄).
- 실기기 터치(안드로이드 진동·iOS) 확인, 접근성 트리(ariaSnapshot) 확인.
