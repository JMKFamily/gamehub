# balance-designer round-2 기획 수정 처리표

- 날짜: 2026-11-18 · 입력: `Docs/orchestrator/2026-11-18-1-7-round1-gate.md`(H1~H4), `score.md`
- 검사: `node tools/verify-levels.mjs --quick` ALL PASS(R1~R14 포함, B·K 는 quick 이라 정보). 봇은 처음부터를 쓰지 않아 m̃·레벨 표 변화 없음 → 전체 실행 생략.

| 이슈 | 처리 | 내용 | 위치 |
|---|---|---|---|
| H2 / S12 (E2) | 수정 | 처음부터 = 새 시도(이동 수·색별 이동 수·판정 기록·되돌리기 목록 0, 별 다시 가능). 처음부터 **바로 다음** 되돌리기 = 처음부터 취소(이동 수까지 직전 값으로). 처음부터 뒤 판이 바뀌면 취소 기회 없음. 빈 판·이동 0 이면 무시. 별 지름길 없음 확인(R14f: 처음부터·되돌리기 섞은 64순서, 완료 29회·별 24회, 이동 < 쌍 수 완료·가짜 별 0). 판정 모듈 1.2.0 | `tools/core/board.mjs` `undo`·`resetBoard`·`resetUndo`, `tools/verify-levels.mjs` R14~R14f, `balance.json` `core`·`moves`, 20-balance 3-1 R9·4절·11절 |
| H1 / S11 (E1) | 수정 | 판 완료 → 결과 자동 0.8~1.2 s(1.0), 결과 버튼 ≤ 1.3 s(1.28)부터·그 전 누름 무시, ▶ 뒤 다음 판 첫 누름 즉시, 카드 판은 카드 닫힘 즉시. 값 변화 없음, 문구 확정 | 20-balance 9절 |
| S16 | 수정 | L8~L10 이동 수 도움 신호: 이 시도 이동 수 ≥ L8 21·L9 24·L10 25(아이 봇 m̃ × 1.5 올림, p90 40·33·32 앞)면 도움 버튼 숨 쉼(손가락은 누를 때만). 시도마다 한 번, 처음부터 = 다시 셈 | `balance.json` `help.moves_trigger_*`, 20-balance 10-2 |
| S29 (balance 몫) | 수정 | 규칙 카드 자동 닫힘 3 s → 6 s, 누르면 닫힘, 뜬 뒤 400 ms 누름 무시, 닫히면 즉시 조작. 그림 표시·화살표는 art | `balance.json` `rule_card`, 20-balance 10-3 |
| H4 (규칙 문구) | 수정 | R6·9절 막힘 "소리 없음" → 튕겨 나옴 + 낮은 "툭"(≥ 6 dB 작게), 진동 없음. 길이 250 ms 유지, 모양·소리는 art | 20-balance 3-1 R6·9절 |
| S5 (지표) | 유지 | 결과 % = 한 번에 이은 쌍 / 쌍 수, 판 채움 % = 연결된 칸 — 정의 그대로(H3 은 모양 구분, art·dev 몫) | 20-balance 4절 |
| S17 | 보류 | L8 판 유지, 이동 수 도움 신호로 꼬리 받음. 아동 테스트에서 막히면 `candidates-08.json` 에서 교체 | 20-balance 14절 K10 |
| S18 | 보류 | 큰 표본 금지 지시로 두 번째 시드 전체 실행은 다음 전체 실행 때(L5·L10) | 20-balance 14절 K9 |

## 개발 전달 (game-developer)

1. `tools/core/board.mjs`(1.2.0)를 `games/flow-01/js/board.js` 로 다시 복사. `resetBoard` 는 이제 `moves`·`colorMoves`·`connectLog`·`undoStack` 을 0 으로 하고 `g.resetUndo` 를 둠, `undo` 는 `resetUndo` 가 있으면 처음부터 취소. 표시층(이동 수·쌍 점 줄·등급·채움 %)은 `undo`/`resetBoard` 뒤 `g` 에서 다시 그릴 것. 확인 창·길게 누르기 넣지 않음.
2. `balance.json` `moves.reset_changes_moves` 키 삭제 → `reset_starts_new_attempt`·`reset_zeroes`·`undo_right_after_reset_cancels_reset` 로 바뀜(빌드가 옛 키를 읽으면 고칠 것).
3. 도움: `help.moves_trigger_by_level`(키 "08"·"09"·"10") — 이 시도 `g.moves` ≥ 값이면 도움 버튼 숨 쉬기(30 s 신호와 같은 모양), 시도마다 한 번(도움 누르면 끔, 처음부터 = 다시 셈, 처음부터 취소면 그 전 상태).
4. `rule_card`: 자동 닫힘 6000 ms(게임 시계), 누르면 닫힘, 뜬 뒤 400 ms 안 누름 무시, 닫히면 판 즉시 조작.
5. H1 값은 그대로(`complete.input_lock_s` 1, `result_buttons_after_ms` 1280) — 결과 버튼 전 누름 무시·▶ 뒤 첫 누름 즉시만 지킬 것.

## 추가 지시 (2026-11-18 요청자: 스테이지 50개) — balance 몫

| 항목 | 처리 | 위치 |
|---|---|---|
| 판 50개(유일해) | 수정. L1~L10 그대로(판·답 같음, 챕터 필드만 더함), L11~L50 새로 40개: 자체 생성기 6x6 판 가족 A~G(쌍 4~6, 구멍 0~2) 약 1만 판 풀에서 고름, 원작 판 미참조. V3 sound 유일해 + V4 가지치기 0 열거 대조 50/50, 답 = 생성 답, V8 시드 재현, 50판 서로 다름(V10) | `levels/01~50`, `tools/levels-ext.json`, `tools/levels-config.mjs` FAMILIES |
| 판 상한·규칙 | 유지. ≤ 6x6·칸 ≥ 48 px(V1, layout.json)·색 ≤ 6·선 길이 ≥ 3. 새 기믹 0(구멍은 L6 소개 요소), L11~L50 `new_element: none` | 20-balance 8-5 |
| 압축 규칙 50개 해석 | 수정. 10개 × 5챕터, 챕터 1 = 기존(끝 = T), 챕터 c 끝 E_c = T·(25/T)^((c−1)/4)(E5 = 25, +20 % = 30), 챕터 시작 = 0.75·E_(c−1) 톱니 허용(앞 끝의 0.6~0.95배), 챕터 안 엄격 단조, 끝 ±20 % | 20-balance 8-5, `balance.json difficulty.chapters` |
| 챕터 구조 데이터 | 수정. 레벨 파일 `chapter`·`chapter_pos`·`chapter_key`, `balance.json chapters.list`(레벨 → 챕터, unlock = 앞 레벨 완료) | V10 |
| verify 50개 | 수정. V0·V1·V6b·V10, B3c·B4c·B4s·B8·H1 추가, 봇은 스레드 풀(`tools/sim/jobs.mjs`) | `tools/verify-levels.mjs` |
| 전체 실행 | **ALL PASS**(레벨당 2만 회·시드 10개, 50레벨 약 4.8분). 챕터 끝 m̃ 20.06 / 23.06 / 23.63 / 25.33(목표 대비 +0.5·+7.1·+1.9·+1.3 %), 최대 m̃ 25.33 ≤ 30, 최대 배율 1.42, K1 50개 통과 | 20-balance 8-6 표 |
| 도움 이동 신호 | 수정. p90 > 30 레벨 43개(L8~L50)로 넓힘, 값 = ⌈1.5·m̃⌉(H1 계산값 그대로) | `balance.json help.moves_trigger_by_level` |
| B7 기준 | **결정 필요(오케스트레이터)**. 어려운 판에서 아이 봇이 200 이동 상한 안에 못 푼 실행 2만 회 중 최대 16회(0.08 %) → L11~L50 은 ≤ 0.2 % 로 둠(L1~L10 은 0 그대로). 풀 수 있음은 V5 로 확인 | `balance.json difficulty.max_fail_frac_L11_L50`, 14절 K13 |

- 전체 실행 횟수: 3번(1번째 챕터 5 단조 실패·B7, 2번째 생성기 시드 충돌로 같은 판 1쌍(L23 = L41)·L43/L44 뒤집힘 → `ext-fix.mjs` 로 그 자리만 같은 시드 작업을 미리 돌려 바꿈 → 3번째 ALL PASS). 한 명령 10분 이내.
- 찾은 것: 6x6·5~6쌍에서 m̃ ≥ 19 판은 숙련 봇 헛 이동이 한 쌍에 몰려(> 30 %) 거의 못 씀 → 뒤 챕터 높은 쪽은 4쌍 판(몰림 한도 37.5 %). 챕터별 6/5/4쌍 판 수는 20-balance 8-6.

### 개발·다른 역할 전달 (추가)

6. game-developer: `levels/01~50` 복사(sync-build), 레벨 선택을 `balance.json chapters.list` 로 챕터 5묶음 표시(잠금 = 앞 레벨 완료), 도움 이동 신호 키가 "08"~"50" 43개로 늘어남. 판정 모듈·기믹 변화 없음. `selfcheck.mjs`·`qa-round.mjs` 가 레벨 10개를 가정하는지 확인 필요(qa).
7. lore-writer: 키 규칙 = 레벨 `levelN_name`(N 1~50, 앞 0 없음) 40개 더 + 챕터 `chapterN_name`(1~5) ko/en.
8. art-director: 챕터 바탕 5개, 챕터별 레벨 선택 지도(10노드 × 5), 뒤 챕터 4쌍 판의 색 슬롯 돌려 쓰기 안.
