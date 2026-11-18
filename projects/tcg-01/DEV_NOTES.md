# tcg-01 「썰물 영장」 개발 노트 (game-developer)

## 1-3 첫 빌드 (2026-11-18)

### 구조
| 파일 | 역할 |
|---|---|
| `games/tcg-01/index.html`, `style.css` | 한 페이지. 색은 모두 `art.json palette`에서 부팅 때 CSS 변수로 넣음(style.css에 색 값 없음) |
| `games/tcg-01/js/engine/` | **규칙 엔진·AI 원본 복사본**(engine.mjs·ai.mjs·value.mjs·sim.mjs, 수정 0). `ENGINE_HASH.txt`에 SHA-256 |
| `js/main.js` | 부팅, 화면 전환, 게임 시계(rAF), 테스트 훅 `window.__game` |
| `js/battle.js` | 대전: 엔진 적용 → 이벤트 로그 → 연출 타임라인, 입력(끌기·탭-탭·길게 누르기), AI 턴 박자, 턴 타이머, 대사·명줄 위기·역전 |
| `js/anim.js` | 게임 시계·트윈(transform/opacity만)·타임라인(잠금·예약·2배속·건너뛰기) |
| `js/fx.js` | Canvas 한 장: 입자·궤적·대상 화살표·피해 숫자·어둡게·고리 |
| `js/audio.js` | Web Audio 합성(효과음 29종 `art.json sound.sfx`, 바탕음·영웅 모티프, 명줄 위기 저역 통과·쿵) |
| `js/cards.js` | 카드·응답자·호명자 DOM(30-art 3절 형태) |
| `js/meta.js` | 저장(localStorage `tcg01.save.v1`), 공명·새김 돌파, 인양 상자(확률·등대 보장·심해 중복 보호), 지정 새김, 부두 시장, 의뢰, 조수 달력, 결투 보상, 모드별 돌파 규칙 |
| `js/screens.js` | 타이틀·부두·호명자 선택·수집·카드 상세·영장첩·덱 빌더·상자 목록·개봉 연출·시장·의뢰·달력·설정·결과 |
| `js/ads.js` | 광고 어댑터 더미(호출하는 곳 없음, `init`만) |
| `data/*.json` | `sync-engine.mjs`가 기획 원본에서 만든 묶음(아래) |
| `projects/tcg-01/tools/sync-engine.mjs` | 엔진 복사·해시 + 데이터 묶음 생성. `--check`는 해시만 확인 |

데이터 흐름: `node projects/tcg-01/tools/sync-engine.mjs` → `games/tcg-01/js/engine/*`(복사), `data/cards.json`(cards.json 수치 + cards-lore 이름·글 + `ENGINE_KW` 대응표로 만든 화면 키워드 `kw_ui`), `data/strings.json`(10-lore 8절 키 표 221개 + 4절 대사 42줄 + 5-3 혈통 + 키워드 이름), `data/portraits.json`(portrait-gen 200장 + 토큰), `data/balance.json`·`art.json`·`decks.json` 복사, `assets/*.svg` 복사(목업 제외). **기획 파일을 고치면 이 스크립트를 다시 돌려야 빌드에 반영됩니다.**

### 원칙 대응
- 빌드 엔진 = 시뮬레이터 엔진: 같은 파일 복사 + 해시 기록. 엔진 동작 변경 요청 0건.
- 로직 먼저: 입력 순간 `applyAction`으로 결과 확정, 연출은 로그 이벤트(`play/attack/dmg/heal/die/shield/secret_open/burn/fatigue/turn…`)로 만든 타임라인이 확정 결과를 보여 주기만 함. 중간 화면은 "사망 중 응답자를 남긴 결과 상태" → 사망 연출 → 최종 상태 순.
- 엔진 키워드 id(guard·rush…)는 화면에 쓰지 않음: `ENGINE_KW`(tools/art/assets.mjs) 대응표로 바꾼 `kw_ui`와 `kwname_*` 글만 표시(1-2 art 리뷰 이슈 6).
- 시간 값은 `art.json tempo`만 읽음: 행동별 `normal_ms/fast_ms/lock_ms/tier`, `ai_turn`, `tiers`, `shake`, `immersion`, `crate_open`.

### 템포 구현 (30-art 5절)
- 첫 반응: `pointerdown` 처리 안에서 카드 들기(transform)·소리 시작 → 다음 프레임에 보임. `tempoLog.inputs[].response_ms`(입력 → 다음 rAF).
- 입력 잠금·예약: 타임라인 `lock_ms` 동안 행동은 `A.queue`(최대 3)에 예약, 예약이 있으면 남은 연출 2배속(`catch_up_speed_ratio`). 잠금이 끝난 뒤 새 입력이 오면 진행 중 연출을 끝 상태로 넘기고 바로 실행(피해 숫자·입자는 Canvas에서 계속 보임 → 정보 손실 없음).
- 강약 4단계: 기본 tier는 `tempo.actions[].tier`. 공격력 5+·한 번에 3명 이상 사망 → tier 2(흔들림 중), 큰 카드(비용 7+ 또는 심해)·치명타(한 번 8 이상 또는 상대 명줄 절반 이상)·마지막 일격 → tier 3(정지 160 ms, 흔들림 강, 1.08배 확대, 음악 낮춤).
- 큰 카드 등장 1800 ms(어둡게 220 → 솟음 480 → 이름 → 착지 400), 400 ms 뒤 탭으로 건너뛰기.
- 마지막 일격: 달려들기 0.35배 느리게 → 정지 → 호명자 부서짐 700 → 승리 1800/패배 1600 → 결과 화면.
- AI 턴: 첫 수 앞 700~1100, 행동 사이 420~650, 카드 들림 예고 260(상대 손패 판이 들림), 공격 전 조준 화살표 320, 비용 7+ 앞 +400, 끝 500, 한 턴 12 s 넘으면 빠르게 값, 상대 턴 중 화면 탭 → 남은 상대 턴 2배속.
- 빠르게 보기(설정 + 대전 중 기록 버튼): 모든 시간을 `fast_ms`로. 피해 숫자·사망·발동 표시는 그대로.
- 턴 타이머 50 s: 앞 35 s 흐린 선, 15 s부터 타는 선 + 1 s마다 소리, 5 s부터 붉게 0.5 s마다, 0 s 자동 숨 고르기, 아무 행동 없이 넘기면 다음 턴 15 s. 연출 잠금 동안은 멈춤. 첫 물때 30 s.
- 몰입: 대사 말풍선(판 시작 상대→600 ms→나, 각자 첫 큰 카드, 명줄 ≤10, 역전, 승패, 심지 부족), 명줄 ≤10/≤5 붉은 가장자리 숨쉬기 + 음악 저역 통과·지속음 올림·쿵, 치명 가능 표시(상대 명줄 판 떨림), 역전 고리 빛(한 판 2회), 턴 8부터 바닥 젖음.

### 기획과 다르게 한 점 (확인 요청)
| # | 내용 | 이유 | 확인 역할 |
|---|---|---|---|
| D1 | 레이아웃: 화면 크기마다 `layout.mjs`를 다시 계산하지 않고, `art.json layout.screens`의 4해상도 중 가장 가까운 것(세로 2종 비율, 가로는 폭 960 기준)을 고른 뒤 균일 배율로 맞춤(남는 띠는 바탕색) | layout.mjs가 node:fs를 import해 브라우저에서 못 씀. 4해상도 사각형을 그대로 쓰므로 겹침 검사 결과가 유지됨 | art |
| D2 | 카드 초상: 브라우저에서 생성하지 않고 sync 때 `portraitSVG`로 200장을 미리 만들어 `data/portraits.json`(약 300 KB)에 담고, 실행 중 blob URL로 캐시 | portrait-gen.mjs도 node:fs import. 결과 SVG는 같음 | art |
| D3 | **글 키 부족**: 빠르게 보기·움직임 줄이기·결투 포기·표준 영장첩·AI 난이도 이름(서툰/노련한 호명자)·필터 "전체"·돌파 수치 이름·확률 표 줄 등 29개를 `games/tcg-01/data/strings-extra.json`(개발 임시)에 둠. 10-lore 키 표에 같은 키가 생기면 그 값이 우선. **카드 영어 규칙 글이 cards-lore에 없음**(concept_ko만): 영어 모드에서는 키워드 이름 + 풍미글(flavor_en)로 대신 | 하드코딩 금지 규칙 | **lore**: 키 29개 확정, `concept_en` 200장 |
| D4 | 카드 글 숫자와 엔진 수치가 다른 카드 5장(sync 출력): B003(3) B094(99) A011(5) A029(2) A034(2). 화면 글은 lore 원문(concept_ko), 실제 효과는 엔진 | 글 생성기를 따로 만들지 않음 | lore·balance |
| D5 | 첫 실행 수집: "입문 영장첩(모래)" 대신 **표준 영장첩 6개의 카드를 가진 상태**로 시작 + 환영 상자 10·각인 먹 400·소금화 200. 첫 주 매일 상자 1·주간 맹약은 아직 없음 | 요청 지시 "영웅 선택(6명, 표준 덱)"으로 바로 대전 가능하게. 입문 덱 목록(decks/starter)이 아직 없음 | balance |
| D6 | 모드(D1 반영): 모래 위 연습 = 내 돌파 전부, 조수원 친선 = 내 덱에서 돌파 이득이 가장 큰 1종(자동 고름, 고르는 화면 없음), 맹약 결투 = 0단계. 셋 다 상대는 AI(온라인 없음), AI 덱은 표준·0단계. 보상: 연습 승 5(하루 30), 친선·맹약 승 10(하루 50)+첫 승 30, 물때 눈금 승 30·패 15 | 온라인 대전 없음 | balance |
| D7 | 의뢰 3종만: "{name}(으)로 n번 이기기", "방파제 응답자로 공격 n번 막기"(상대가 내 방파제를 친 횟수), "소금독 피해 n 주기"(상대 턴 시작 소금독 틱 피해 합). 목표 수 n은 임시(1~2, 3~5, 4~8) | lore 예시 3종 | balance |
| D8 | "내 명줄 ≤ 10" 대사: 30-art는 `me`의 `low` 대사지만 대사표에 low 줄이 없어 **상대가 위협 대사**를 함. 역전 때는 뒤집힌 쪽이 경의 대사 | 10-lore 4절 대사 7종 | lore·art |
| D9 | 손패 넘침·공허 호명·봉인문 열림은 토스트 + 소리 + 입자. 봉인문은 카드 확대를 잠깐 띄움 | | art |
| D10 | python이 이 PC에 없어(WindowsApps 바로가기만) 정적 서버는 node 15줄 서버로 대신(레포 루트, 포트 8800~8804) | 지시는 python http.server | orchestrator |

### 테스트 훅 (`?test=1`)
쿼리: `test=1`(오디오 없음, AI 생각 시간·입자 무작위 고정, 저장소 쓰지 않음 — `store=1`이면 씀), `anim=0`(연출 시간 배율 0, 소수 가능), `manual=1`(rAF가 게임 시계를 돌리지 않음 → `step(ms)`로만 진행), `lang=en`, `screen=dock` 등.

`window.__game`:
| 이름 | 설명 |
|---|---|
| `state` | 저장 데이터(재화·수집·덱·의뢰·달력) |
| `screen` | 현재 화면 id(`title/dock/heroes/battle/collection/...`) |
| `battle` | 엔진 상태 스냅샷(JSON: half, active, over, winner, players[hero,mana,deck,hand,board…], rngState) |
| `newBattle({heroA, heroB, seed, ai, human, bt, mode, deckA, deckB, noTimer})` | heroA = 선공(players[0]). `human: 0`(기본, 첫 물때 화면이 뜸 → `mulligan([idx])`), `human: null` = AI 대 AI. `ai`: `'eval'`·`'greedy'` 또는 `[a,b]`. 덱은 표준, `bt` 기본 `[{},{}]`. 판마다 ai.mjs를 새로 import(안의 SALT 카운터 0부터) |
| `mulligan(idx[])` | 사람 첫 물때 확정(AI 쪽은 ai.mjs mulligan, 순서 0 → 1, sim.mjs와 같음) |
| `act(action)` | 엔진 행동 그대로(`{type:'play',hand,target?,pos?}`·`attack`·`power`·`choose`·`end`). 잠금 중이면 `{ok:true, queued:true}`, 4번째는 `queue_full` |
| `endTurn()`, `legal()` | 숨 고르기 / `legalActions` |
| `runAI()` | 지금 차례 쪽의 AI 행동 하나를 고르고 실행(사람 차례면 입력 경로로) |
| `autoplay(on)` | 사람 자리도 AI가 둠 |
| `step(ms)` | 게임 시계를 ms만큼(16 ms씩) 진행 |
| `finishAnim()`, `setAnimScale(x)`, `setFast(on)` | 연출 끝내기 / 배율 / 빠르게 보기 |
| `log` | `{events, battle: 행동 글 기록}` |
| `tempoLog` | `{actions:[{kind, tier, planned_ms, lock_ms, start_game_ms, end_game_ms, game_dur_ms, start_real_ms, end_real_ms, skipped, action, p, cid, dmg_max, deaths}], inputs:[{kind, input_ms, first_frame_ms, response_ms}]}` |
| `export()` | `{seed, heroes, ai, human, mulligan:[idx0, idx1], actions:[엔진 행동열], winner, reason, half, len, hp, armor, final(명줄+껍질)}` |
| `save()`, `load()`, `reset()`, `lang(l)`, `missingKeys`, `busy`, `queued` | |

QA 대조 방법: `newBattle({heroA, heroB, seed, ai:'eval', human:null})`를 `anim=0&manual=1`에서 `step`으로 끝까지 → `export()`. 시뮬레이터는 **새 node 프로세스**에서 `sim.mjs playGame(data, {deck:A, ai:'eval'}, {deck:B, ai:'eval'}, seed)`(ai.mjs의 SALT가 프로세스 안에서 판마다 누적되므로 판마다 새 프로세스 또는 새 import). 1-3 자체 확인 4판(오다-카드라 11, 나할-이브로 22, 펠-렌 33, 카드라-나할 44) 승자·반턴 수·승자/패자 명줄+껍질 모두 일치. 사람 판은 `export().mulligan`·`actions`를 엔진 `createGame → applyMulligan(0) → applyMulligan(1) → startGame → applyAction…`에 다시 넣으면 같은 결과(위치 `pos`가 들어간 행동 포함).

### 남은 일
- 튜토리얼(10-lore 8-7) 없음, 썰물 연대기 잠김, 주간 맹약·첫 주 상자 없음, 외형(심해 진주 3) 상품 없음.
- 친선 새김 슬롯 고르는 화면, 덱 필터(종류·키워드) 없음(비용·세력만).
- 오프라인 렌더로 효과음 크기 순서 확인 안 함(art 1 dB 대조는 QA·art).
- 카드 글 영어(lore), 키 29개 확정(lore).
