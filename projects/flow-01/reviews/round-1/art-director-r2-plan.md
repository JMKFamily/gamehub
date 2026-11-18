# art-director round-2 처리표 (flow-01)

- 2026-11-18, 입력: `Docs/orchestrator/2026-11-18-1-7-round1-gate.md`(H1~H4), `score.md`(art 담당 S·E), 내 round-1 리뷰, 요청자 추가 지시(선 얇게·50스테이지·주스감).
- 값 원본: `assets/layout.json`·`palette.json`·`sound.json`(생성: `assets/check/*.mjs`). 요약: `30-art.md` 13절.
- 검사: `node assets/check/check-all.mjs` → 5개 모두 통과(팔레트·레이아웃·소리 S1~S8·튜토리얼·SVG 71개).

## 이슈 처리

| 이슈 | 처리 | 위치 |
|---|---|---|
| S3 major 가로 카드 가림 | 수정: 카드 = 그림 + 카드 안 글 띠, 판 사각형 안(가로는 오른쪽 HUD 쪽 판 + 6 px까지). 검사 추가: 카드 ∩ {쌍 점 줄·버튼·채움 막대} = 0, 카드 ∩ 글·판정 자리 = 0(같은 때 못 보이는 자리만 `coexists_with_card: false`, 데이터 검사로 증명), 카드 글 들어감, 카드 속 표지 ≥ 16(최소 17.6) | `layout.mjs play().card`·`check()`, 30-art 13-1 |
| S4·H4 major 막힘 | 수정: 튕겨 나옴(머리 0.18칸 밀림 → 스프링 복귀, 점 0.06칸 밀림, 크기 변화 없음), 소리 `bump` "툭"(연결음보다 13.1 dB 작음), sound-check S8(≥ 6 dB 최고값·RMS, ≤ 220 Hz, ≤ 120 ms) | `motion.blocked`, `sound.json sounds.bump`, `sound-check.mjs` |
| S5·H3 major 두 % | 수정: 플레이 = 판 위 가는 막대 + 작은 %(판정 자리에서 % 뺌), 결과 = 쌍 점 줄(꽉 찬/속 빈) + 아래 %, 별은 모두 꽉 찼을 때. 속 빈 점 SVG 6개 | `play.*.fill_bar`, `result.*.pair_dots`, `marks/*-hollow.svg` |
| S1·S2 major 성능(그림 쪽) | 개발 전달: 그리기 규칙 `render`(바탕 1회·판 캐시·비트맵 이름·SVG 래스터 캐시·idle 무그림·DPR 2). 카드 SVG 그라디언트 0(검사) | `layout.json render`, 30-art 13-5 |
| S6 보호자 스크롤 | 수정: `scroll_hint`(아래 옅은 띠 + 꺾쇠, 스크롤 막대 숨기지 않음). guardian_intro 길어짐(lore) → 최대 24줄 | `guardian.*` |
| S10 타이틀·잠긴 노드 | 수정: 스스로 칠해지는 3x3 히어로(세로 글 아래/가로 오른쪽, ≥ 96 검사), 잠긴 노드 = 판 크기 격자 실루엣 | `title.*.hero`, `icons/node-locked.svg` |
| S13 연결 연타 | 수정: 같은 쌍 400 ms 안 다시 닿음 = tint·고리만 | `motion.connect.repeat_guard` |
| S15 등급 구분 | 수정: 1단 이름 위 작은 별(폭 늘리지 않음) | `judge.g1_star_px`, `motion.connect.g1_star` |
| E6·S19 지도 별 | 수정: CSS 크기 규칙 명시, 별 줄 폭 = 10 × pitch(검사), 빈 별 실선 면. 구조 변경은 UX 재판단 뒤 | `map.*.stars.css`, `icon-star_empty.svg` |
| S20 카드 창 | 수정: 좌우 대칭 여백(≥ 8 검사), 반쪽 점 없음, 단색 흐림, 반짝임 창 안 칠한 칸 위, 카드 둘레는 빌드 상자 boardEdge | `tutorial.mjs composeCard` |
| S21 시연 유령 선 | 수정: 쌍 색 × 0.55, 손가락 0.2칸 뒤 | `tutorial.mjs`, `motion.tutorial.ghost_r2` |
| S22 칠한 칸 아이콘 | 수정: 2x2 칠한 칸. 플레이에서는 막대로 대체 | `icon-filled.svg` |
| S27 선 모양 | 수정: 연결된 선 가운데 칸에 흰 표지 0.26칸 | `motion.connect.line_mark` |
| S28 빈칸 노랑 | 수정: `gapGlow` `#6F7891`, 대비·ΔE 검사 추가 | `palette.mjs` |
| S29 규칙 카드 | 수정(art 몫): 후 판 테두리 pathDone + 별 표지, 꺾쇠 28, 자동 닫힘 6 s(원본 balance.json `auto_close_ms`, layout 이 그 값을 읽음) | `tutorial.mjs`, `card.auto_close_ms` |
| S31 버튼 위치 | 수정: 가로도 되돌리기 왼쪽·처음부터 오른쪽 | `play()` 가로 buttons |
| S33 장식 도형 | 수정: arc·wave·ring만(검사) | `palette.mjs THEMES` |

## 추가 범위 (요청자 2026-11-18)
| 항목 | 처리 | 위치 |
|---|---|---|
| 선 두께 | 0.60 → 0.48칸(20 % 얇게). 검사: 선 ≥ 22 px, 점 − 선 ≥ 0.2칸, 손가락 앞 머리 ≥ 선 굵기, 선 / tint·타일 대비 ≥ 2.0(정상·protan·deutan·tritan) | `PARAM.line_w_of_cell`, `palette.mjs`, `layout.mjs check` |
| 50스테이지 | 5챕터 바탕 50개(챕터 색 가족 × 하루 흐름, lore 챕터 이름에 맞춤), 레벨 선택 = 챕터 페이지 + ◀ 점 5개 ▶ + 밀기, 4해상도 검사·목업, 챕터 이름 자리 | `palette.json themes.level01~50`, `map.*.pager`·`title.chapter_keys`, `icon-page_*.svg` |
| 주스감 | 선 머리 스프링·칸 진입 튐·빛 번짐·색 물결·결과 순서·진동 패턴·레벨/챕터 전환, 동작 줄이기 대체, 빈 대기 금지 | `motion.head`·`connect.juice`·`complete`·`result.sequence_ms`·`level_transition`, `sound.json haptics`, 30-art 13-8 |

| 슬롯 돌려쓰기(오케스트레이터 후속, 50판 확정) | 11판 이후 3·4쌍 판은 6색 중 색·모양 묶음을 레벨 번호로 돌려 씀(색약 3종 ΔE00 ≥ 10 조합만, 이웃 같은 묶음 피함). 레벨 JSON 은 그대로, 빌드가 `palette.json slot_rotation.by_level[order][쌍 수][color_slot]` 로 매핑. 검사: 실제 레벨 22개 매핑 유효·색약·이웃 | `palette.mjs slotRotation`·검사 |
| 카드 자동 닫힘 | 5 s → 6 s(balance.json 원본), layout.json 은 balance.json 값을 읽어 씀 | `layout.mjs BAL_CARD_CLOSE` |

## 보류
- 없음. 단 가로 640x360 최소 칸이 채움 막대 줄 때문에 54.9 → 51.6 px(≥ 48, 표지 17.6)로 줄었음 — round-2 리뷰에서 손 크기 확인 요청.

## 개발 전달 (game-developer)
1. 카드: `play.*.card`(상자·art·text) 그대로 그리기, 글은 카드 안 띠, 6 s 자동 닫힘(balance.json 값), 닫힘 시작부터 판 입력 통과, 카드 SVG는 `<img>`+decode 래스터.
2. 판 위 `fill_bar`(막대 + %), 판정 자리 % 제거, 1단 별 표시.
3. 결과 `pair_dots`(connected/hollow SVG) + %, 별 조건 = 모두 꽉 참, `result.sequence_ms` 순서.
4. 막힘 `motion.blocked`(튕김) + `bump` 소리, 연결 연타 `repeat_guard`, `line_mark`.
5. `render` 규칙 전부(바탕 1회·판 캐시·이름 비트맵·SVG 래스터·idle 무그림·DPR ≤ 2·첫 탭 오디오 분리).
6. 지도: 챕터 페이지·`pager`·별 CSS 크기·잠긴 노드 실루엣·잠긴 노드 탭 흔들림, 페이지 바탕 = 챕터 1번째 레벨 바탕.
7. 선 굵기 0.48, 가로 버튼 자리(되돌리기 왼쪽), 타이틀 `hero`, 보호자 `scroll_hint`, `gapGlow` 새 색, 장식 도형.
8. 색 슬롯: 레벨 order ≥ 11 이고 3·4쌍이면 `palette.json slot_rotation.by_level[order][쌍 수][color_slot]` 번째 pairs 항목(색·표지·tint·shade)을 씀, 그 밖은 color_slot 그대로.
9. 주스 표(`motion.head`·`connect.juice`·`complete` 색 물결·`level_transition`·haptics 패턴), 모두 비트맵 + transform.
