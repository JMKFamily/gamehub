# 리뷰: balance-designer · 1-2 교차 리뷰 1차 (기획 3문서)

- 날짜: 2026-11-17 · 관점: 수치·레벨·판정·타이밍·검증 가능성
- 이번 단계는 **지적만** 합니다. 고치는 일은 다음 단계(1-2 2차)에서 각 담당이 합니다. 점수는 매기지 않습니다.

## 확인한 것
- 읽은 파일: `10-lore.md`·`strings.json`(lore-writer), `30-art.md`·`assets/layout.json`·`assets/sound.json`·`tools/art/cards.mjs`·`tools/art/sound-check.mjs`(art-director), 내 `20-balance.md`·`balance.json`·`levels/*.json`·`tools/sim/judge.mjs`, `00-benchmark.md`, `Docs/orchestrator/2026-11-17-1-1-planning-supervision.md`("1-2로 넘기는 충돌·안건" 1~8)
- 비교로 읽은 것(읽기만): `projects/rhythm-01/10-lore.md`·`30-art.md`·`balance.json`, `games/rhythm-01/data/strings.json`
- 직접 계산: node 스크립트(스크래치 폴더, 프로젝트에 쓰지 않음)로 `judge.mjs`를 import 해 10레벨에 적용
  - 손가락 일정(balance `fingerSchedule` vs art `layout.json finger`)과 다음 접촉 위험 구간
  - art 놀이 높이 식으로 4해상도 Hp·d 재계산(art 표와 같음: 360x640 Hp 370 d 28 / 412x915 521·32 / 640x360 210·28 / 1280x720 451·44) → 실제 레벨 BPM에서 반박·세 박 통·구름 통 값
  - 곡 음 시작 규칙 독립 구현(받침 쉼 = 정수 박 전부, 그 밖 = 짝수 박, 위험 구간 = `judge.mjs` zoneStart ~ passStart)
  - 바탕 단계 가안 규칙, 클리어 연출 박 수, 반박 비행 대비 늦은 쪽 창

### 맞는 것으로 확인한 수치 (그대로 둠)
| 항목 | balance | art / lore | 결과 |
|---|---|---|---|
| 실패 → 다음 시도 1.1 s 배분 | `restart.phases_s` 0~0.08 / 0~0.45 / 0.45~0.85 / 0.85~1.1, 첫 똑딱 1.1 s | 30-art 7-2, `layout.json restart_timeline_s` | **완전히 같음**. 연습 부활 같음, 확인 버튼 없음, 첫 실패 ↻는 정지 구간 안 |
| 손가락 누름 시작 | 접촉 −0.2박 = −120 ms(2880 ms) | art −0.2박, 규칙 ≥ 접촉 −(150−20) = 2870 | 통과(통과 창 안) |
| 곡 음 시작 ∩ 놓침 구역 | 놓침 구역 200 ms, 레벨별 통과 창 | art 9-1 "위반 0" | **독립 계산도 위반 0**. 곡 음 → 다음 위험 구간 최소 여유 L1 250 · L2 232 · L3 216 · L4 210 · L5 206 · L6 196 · L7 192 · L8 188 · L9 180 · L10 177 ms |
| 구름선 0.9 | `cloud_line_ratio` 0.9 | `layout.json cloud_edge_of_Hp` 0.9, 공 아랫점 기준 | 같음. 숨는 시간 L3 0.97 s · L10 0.57 s(아랫점 기준 계산, balance V12와 같음) |
| 등급 = 구름 1~3 | 등급 규칙만 balance(좋아 75 %·딱 60 %), 일반 모드만 | lore A4·art X8 | 모양 합의됨 |
| L10 결과 버튼 2개 | − | lore 5절·art 7-3 | 합의됨 |
| 실패 먼지 | − | art 7-1 "먼지·퍼짐 없음" | lore A5 받아들임 |

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | major | art-director (검증 보강: balance-designer) | **L1 손가락이 다음 접촉 위험 구간과 50 ms 겹침.** art는 "누름 100 ms → 접촉 + 300 ms 뒤 사라짐", balance는 "접촉 시각에 다 누름 → 공을 치면 또는 통과 창 끝(+170 ms)에 사라짐". art 값이면 사라짐 3300 ms > 다음 접촉(3600 ms)의 위험 구간 시작 3250 ms. rhythm-01 M1(차례 신호 겹침)과 같은 종류이고 criteria 밸런스 R1 항목("신호 ∩ 위험 구간 = 0")을 어김. balance 검증기 S5는 `fingerSchedule`만 보므로 art 값을 잡지 못함 | `assets/layout.json` finger `press_ms` 100·`hide_after_ms` 300, 30-art 5-3, `judge.mjs fingerSchedule`(gone = passEnd), 20-balance 6-3, 계산: art 사라짐 3300 / 위험 시작 3250 | layout.json에서 `press_ms`·`hide_after_ms`를 빼고 balance `tutorial_finger`(press_end 0박, gone = 공을 치는 순간 또는 통과 창 끝)를 그대로 따름. balance는 검증기 S5가 `layout.json` finger 값도 읽어 같은 검사를 하게 함(다음 단계) |
| 2 | major | balance-designer (art-director 협의) | **공 궤적이 탭과 무관하게 정해짐.** `ballsAt(L, t, bal)`은 탭을 받지 않아 안 쳐도 공이 접촉 시각에 예정대로 다시 튐. art 7-1은 "통과 창 동안 공이 가죽 위에 납작하게 기다림, 늦은 탭도 거기서 튀어 오름"이라 빌드가 둘 중 하나를 고를 수 없음. 더 큰 문제는 "치면 올라가고 안 치면 떨어진다"는 이 게임의 인과(=rhythm-01과 가장 다른 규칙, 이슈 13)가 기준 구현에서 빠져 있다는 점 | `tools/sim/judge.mjs ballsAt`, 30-art 7-1 마지막 줄, 20-balance 5절 | balance가 `ballsAt(L, t, bal, hits)`로 바꿈: 떠나는 시각 = max(성공 탭, 접촉 시각), 탭 전까지는 앉아 기다림(최대 pass_late), 다음 비행 = 떠남 → 다음 접촉, 꼭짓점 = c × 남은 비행 시간(그러면 접근 속도 4c와 "높이 = 남은 시간"이 그대로 유지). 판정(접촉 시각)은 바뀌지 않음. 참고: 늦은 탭 뒤 반박의 남은 비행은 최소 111 ms(L10, 꼭짓점 0.055 Hp ≈ 640x360에서 12 px) — 검증기에 정보 행으로 둠 |
| 3 | major | balance-designer · art-director | **클리어 연출 시간축이 레벨 데이터와 다름.** balance: 마지막 접촉 → 1박 뒤 착지(앉음) → outro 4박(L10 8박)이 레벨 끝. art: 마지막 접촉 직후 큰 튐(구름 통, 꼭짓점 +2박) → 다음 마디에 등급 구름 3개(1박 간격). 계산하면 art 연출 끝이 `length_beats`보다 L1~L4·L6·L7 +2박, L5·L8·L9 +1박(L10만 −2박). 공 모습도 "착지" vs "큰 튐"으로 다름 | `levels/*.json` landings·`length_beats`·`outro_beats`, 30-art 7-3, lore 2·4절 끝 장면 | 마지막 접촉 뒤 비행을 `land`(1박) 대신 `clear`(4박 구름 비행, 판정 없음)로 레벨 데이터에 두고 `outro_beats` = 마지막 접촉 뒤 art 연출 길이(꼭짓점 → 다음 마디 → 등급 3개, 최대 8박)로 맞춰 `duration_s`를 다시 계산. 판정 끝(마지막 접촉 통과 창 끝)·클리어 판정 시각은 그대로. art는 7-3을 그 박 수로 적음 |
| 4 | major | lore-writer (주) · art-director · balance-designer | **카드 키 3중 불일치 + L7 문구가 실제와 반대.** lore `card_bounce…card_fast`, balance `card_three`(L7 R1), art 파일 `card_B1…card_G7·card_R1`. 지금 빌드가 lore 키를 그대로 쓰면 L7 카드 문구가 "노래가 빨라져요"인데 L7에는 빠른 곡 구간이 없음(세 박 통) = 잘못된 튜토리얼 | `strings.json card_fast` "노래가 빨라져요", `balance.json gimmicks`, `levels/07-level7.json card.id` card_three, `assets/cards/` 파일 이름, 30-art 13절 X1, lore 9절 A3 | **매핑은 balance.json `gimmicks.<id>.card` 한 곳**(텍스트 키 = 레벨 `card.id`). 파일 이름도 같은 키로(lore A3 "키 = 파일 = 레벨 카드 키"): art는 `cards.mjs` DEFS에 `key` 필드를 두고 `card_<key>.svg`·`card_<key>_portrait.svg`로 생성(B1→card_bounce … R1→card_three, G7→card_roll). lore는 `card_fast` → `card_three`(12자 이내, 예: "셋 세고 기다려 톡"류, 숫자 대신 "셋"), 3절 표·4절 L7·L8 기믹 힌트 갱신(G7은 새 기믹으로 셈 확정). balance는 검증기 V7에 "레벨 card.id = gimmicks 카드 = strings.json 키 = 카드 SVG 2장 존재" 검사를 넣음 |
| 5 | minor | art-director · lore-writer | **G6 미사용 정리.** `card_G6`(가로·세로)이 생성되어 있고 lore 3절 표에 G6·`card_fast`, 4절 L7 분위기 "바람이 불면 노래가 한 번 빨라짐"이 남음 | `assets/cards/card_G6*.svg`, `cards.mjs` DEFS G6, 10-lore 3·4절, `balance.json gimmicks._dropped.G6` | art: DEFS에서 G6을 빼고 파일 삭제(필요하면 `_dropped`처럼 주석만). lore: G6 행에 "쓰지 않음(balance K8)" 표시, L7 분위기 줄을 세 박 통(높이 떠서 셋 기다림)에 맞게. 장소 이름 "바람개비 언덕"은 유지 가능 |
| 6 | major | balance-designer | **놀이 높이 정의가 두 문서에서 다름.** balance 5절·`_units`는 "놀이 높이 = 북 윗면 ~ 화면 위 안전선". 이 정의를 글자 그대로 따르면 L3 구름 통 꼭짓점 111 %라 공이 화면 위로 나감. art `layout.json`은 Hp = (skinY − (safeTop + 8) − d − 6) / 1.2, 높이는 **공 아랫점** 기준이라 화면 안에 들어감. 20-balance 5절 예시 "놀이 높이 400 px, 반박 약 50 px"도 art 값(360x640 Hp 370, L10 반박 45.6 px)과 다름 | `balance.json _units`·`height._note`, 20-balance 5절, `assets/layout.json play_height._def` | balance.json `height`에 `play_height_ref: "assets/layout.json play_height"`, `h_ref: "ball_bottom"`을 적고 20-balance 5절 정의·예시를 layout 값으로 바꿈. 용어는 art "구름 아랫선"과 balance "구름선"을 하나로(같은 0.9·Hp, 공 아랫점) |
| 7 | minor | art-director | **art 표 숫자가 1-0 BPM(최대 128) 기준.** 실제 레벨 최대는 122 BPM. 640x360 반박 꼭짓점은 0.88d가 아니라 L5 1.00d · L7 0.97d · L8 0.95d · L9 0.94d · L10 0.92d. 구름 숨는 시간 128 BPM 0.38 s 대신 L10 0.57 s. 9-4 동기 표의 "참고 BPM"도 1-0 값 | 30-art 4-2 표·10절, `sound.json music.levels.*.bpm_ref`, 계산(이 리뷰) | `layout.mjs --check`가 `levels/*.json` BPM과 실제 쓰인 통만으로 표를 계산하게 함(값을 박아 두지 않기, insights QA 항목). `bpm_ref`는 지우거나 levels에서 읽음 |
| 8 | minor | art-director (balance-designer 검증) | **K1: 640x360 반박이 공 지름 안팎(0.92~1.00d).** 원인 일부는 `apex_budget` 1.2가 "100 BPM 구름 통"을 가정한 값인데 실제 구름 통은 108·122 BPM뿐(최대 꼭짓점 L3 1.111 Hp)이라는 점 | `layout.json play_height.apex_budget` 1.2, `levels/03` BPM 108, 계산 | `apex_budget` = 레벨 전체 비행(토스 포함) 최대 꼭짓점 + 여유(현재 1.12)로 바꾸면 640x360 Hp 210 → 225, L10 반박 0.99d. 가로에서 d 하한 24를 함께 쓰면 1.19d(공 24 px = balance 하한 경계). 어느 쪽이든 balance 검증기에 "apex_budget ≥ 모든 비행 최대 꼭짓점" 검사를 둬서 나중에 100 BPM 구름 통이 생기면 걸리게 함. L5·L8 스크린샷 확인은 유지 |
| 9 | minor | balance-designer · art-director | **세 박 통 공 윗점이 640x360에서 구름 아랫선을 2.0 px 넘음(L7 116 BPM).** V12는 공 아랫점만 보므로 통과. 구름에 살짝 걸려 "구름 통인가?"로 읽힐 수 있음 | 계산: 0.776·Hp + d − 0.9·Hp = +2.0 px(Hp 210, d 28). L9(120 BPM)는 −3.4 px | V12를 "구름 아닌 비행 꼭짓점 ≤ 0.9 − max(d/Hp)"(4해상도 최대 d/Hp = 640x360 0.134)로 강화. 이슈 8 apex_budget 1.12면 +0.1 px로 경계라 d 하한 24 안과 같이 보거나 세 박 통을 L7에서 118 BPM 이상에만 둠(다음 단계 balance 판단) |
| 10 | minor | balance-designer (art-director 사용) | **바탕 단계(X6): art 가안 규칙으로는 7레벨이 bg3에 못 감.** "레벨 길이 1/3·2/3 이후 첫 받침 쉼"을 받침 쉼 시작 박으로 적용하면 받침 쉼 3개인 L2·L4·L5·L6·L7·L8·L9에서 bg3 전환이 없음(받침 쉼 4개인 L1·L3·L10만 3단계) | 계산(이 리뷰), 30-art 2-2, 13절 X6 | X6 찬성: 레벨 생성기가 `phrases[].stage`(1~3)를 넣음. 가안: 받침 쉼 3개 = 1/2/3, 4개 = 1/2/2/3. 연습 체크포인트 재시작은 그 구절 stage 색 |
| 11 | minor | balance-designer · art-director | **X5 곡 음 규칙을 검증기로.** 결과는 위반 0(독립 계산 일치). 다만 ① art 검사는 구조 규칙(반박 앞 짝수 박 접촉) 후보로 적었는데 결과 검사가 더 정확하고 ② `sound.json rest_bar`는 "마디 = 똑 딱 똑 딱"이지만 받침 쉼은 마디 중간에서 시작함(예: L1 10·22·33박). 빌드가 마디 단위로 읽으면 쉼 마디/플레이 마디 판정이 갈림 | `tools/art/sound-check.mjs onsetClash`, `sound.json music.rest_bar`, `levels/01` phrases start_beat | 검증기에 S6 "곡 음 시작 ∩ 모든 접촉 [zoneStart, passStart) = 0"을 넣고 곡 음 목록은 art가 내보내는 함수(`sound.json` 격자에서 생성)를 import 해 같은 정의를 씀. art는 sound.json 규칙을 박 단위로 적음: 앉아 있는 박 b → b%4∈{0,2}면 tick_a, 아니면 tick_b, b%4=0이면 bass, 멜로디 없음 / 그 밖 박 → 짝수 박만 |
| 12 | major | lore-writer | **rhythm-01 구분: 판정 순간 문구가 rhythm-01 틀과 거의 같음.** `tut_tap` "공이 닿으면 톡!" ↔ rhythm-01 "별에 닿으면 톡!", `store_short` "통통 튀는 공이 북에 닿을 때 톡! … 아주 쉬운 박자 놀이." ↔ rhythm-01 "빙글 도는 공이 별에 닿을 때 톡! … 아주 쉬운 리듬 놀이.", `aria_play_area` "화면을 톡 쳐요 / Tap the screen"은 **글자까지 같음**, 3절 G7 아이 말 "네 번 연달아" = rhythm-01 `card_run4` "네 번 연달아 톡". lore 8절 "문구 재사용 없음"과 다름 | `strings.json`, `games/rhythm-01/data/strings.json`, `projects/rhythm-01/10-lore.md` 195·249·253·291·353줄 | 이 게임만의 인과("내려오면 톡 → 다시 올라가", 높이)를 판정 문구에 넣음. 예: `tut_tap` "내려오면 톡!", `card_bounce` "톡 쳐서 올려요", `store_short` "높이 뜬 공이 내려올 때 톡! 다시 높이 올라가요…". `aria_play_area`는 다른 말로. 7-9 검사에 "rhythm-01 strings.json과 같은 문구(KR·EN) 금지"를 더함(`tap_to_start` 같은 공통 UX 문구는 예외 목록) |
| 13 | minor | balance-designer · lore-writer · art-director | **세 문서 구분 표에 "탭의 결과" 행이 없음.** 가장 분명한 규칙 차이는 rhythm-01은 탭이 별을 칠 뿐 공은 계속 돌고, rhythm-02는 **탭이 공을 다시 올려 보내고 안 치면 공이 떨어진다**는 것인데 balance 2절·lore 8절·art 10절 어디에도 없음(art 10절 머리는 "움직이는 공이 목표에 닿을 때 탭"으로 rhythm-01과 같은 문장) | 20-balance 2절 표, 10-lore 8절, 30-art 10절 머리 | 세 문서 표에 같은 행을 넣음: "탭의 결과 — rhythm-01: 별을 침(공 경로 영향 없음) / rhythm-02: 공을 쳐 올림(안 치면 떨어짐, 다음 높이 = 다음 박)". 이슈 2(기준 구현)와 함께 고쳐야 말과 동작이 같아짐 |
| 14 | minor | art-director (lore-writer 협의) | **"구름" 다의: 레벨 선택 L3 카드.** 플레이 중 구름 통·구름선·등급 구름은 나오는 때가 달라 문제 없음. 다만 레벨 선택 L3 카드 대표 실루엣 "작은 구름 2개"가 같은 카드의 등급 구름 1~3(빈 자리 점선) 옆에 놓여 "구름 둘 = 등급 2"로 읽힘 | 30-art 3-1(L3 "레벨 카드에서만 작은 구름 2개")·11절, `assets/mockup-level-select.svg` | L3 대표 그림을 "큰 구름 1개 + 아래 공"처럼 등급 구름과 크기·개수가 다른 모양으로. 클리어 문구 `clear_title_2` "구름까지 갔어요!"는 클리어 연출과 같은 뜻이라 유지 가능 |
| 15 | major | balance-designer (주) · art-director · lore-writer | **소리 밀림 표지·보호자 문·소리 맞추기 수치가 없음.** K3(major) 대응 ③인데 balance.json에 밀림 감지 조건이 없고(rhythm-01은 `drift_check`·`late_hint_ms`), 보호자 진입(설정 길게 누르기) 시간·소리 맞추기 횟수(8×2)·적용 하한도 수치 블록이 없음. art 문서에는 표지 그림(lore "눈 + 공")·설정 버튼 길게 누르기 고리 그림이 없음. lore는 `look_ball`·`sound_late` 두 키의 쓰는 자리를 balance에 맡김 | `balance.json`(해당 블록 없음), 20-balance 4-2·9-4, 10-lore 7-4·7-7·9절 A7·A8, 30-art 15절 에셋 목록, `projects/rhythm-01/balance.json` drift_check·guardian_gate | balance가 다음 단계에 `drift_check`(화면 판정이므로 "판정된 탭 부호 오차 중앙값, 최근 16탭·2시도 이상 ≥ +60 ms" 또는 outputLatency+baseLatency ≥ 100 ms, 오프셋 자동 변경 없음, σ70 정상 아이 오탐률을 검증기로 확인), `guardian_gate`(rhythm-01과 같은 2000 ms 길게 누르기 — 공통 UX라 구분 대상 아님), `calibration`(어른 8번 × 2회, 중앙값) 블록을 씀. 표시 자리: `look_ball` = 레벨 선택(아이, 눈+공 그림), `sound_late` = 설정의 소리 맞추기 줄(어른). art는 두 그림과 고리 그림을 추가 |
| 16 | minor | art-director | **일찍 실패 연출이 0.45 s에 빠듯함.** "계속 내려와 북 가장자리에 닿아 한 번 튕긴 뒤 미끄러짐"은 실패 판정(탭 시각)부터 남은 낙하가 최대 350 ms(L1: 통과 창 150 + 놓침 구역 200)라 튕김·미끄러짐에 100 ms만 남음 | 30-art 7-1, `levels/01 judge`, `restart.phases_s.ball_fall_fx` 0.45 s | 일찍 실패는 탭 순간 그 높이에서 바로 비스듬히 빗나가게 하거나, 남은 낙하를 0.2 s로 압축. 0.45 s 끝에 공이 바닥에 멈춰 있어야 하는 조건은 그대로 |
| 17 | minor | art-director | **카드 그림 = 첫 등장 확인.** ① `card_R1` 칸 1이 "1박 높이"인데 L7·L9의 세 박 통은 **모두 받침 쉼 뒤 자동 토스**로만 나옴(아이가 쳐서 3박을 만드는 접촉 없음) → 칸 1은 "앉은 공(받침 쉼)"이 맞음. ② `card_G5` 칸 2(왼쪽 1.5B 내려옴·오른쪽 0.5B 올라감)는 실제 두 공 화면에 없는 높이 조합(두 공은 같은 2박 비행이 1박 어긋남: 한 공이 꼭짓점의 0.44일 때 다른 공은 0.94) | `cards.mjs` DEFS R1·G5, `levels/07`·`09` 세 박 통 접촉의 앞 사건(토스), 계산 | R1 칸 1 = 앉은 공 → 칸 2 = 높이 뜸(점 3) → 칸 3 = 닿을 때 손가락. G5 칸 2 = 실제 한 순간(예: 0.44·0.94 꼭짓점)으로 |
| 18 | minor | art-director · balance-designer (결정: orchestrator) | **레벨 선택의 연습 진행 표시 미정.** art 11절이 "연습 최고 진행 별도 막대 여부 1-2 확정"으로 남김 | 30-art 11절, insights runner-01 진행도 항목 | 5~6세 단순성 쪽으로 일반 최고 진행 막대 1개 + 연습으로 간 가장 먼 받침 쉼 자리에 깃발 1개 제안. 진행도 단위는 둘 다 "처리한 접촉 수 / 전체"(`judge.mjs progress`) |
| 19 | minor | art-director · balance-designer | **L10 끝 정의가 다름.** art `sound.json` L10 `_outro`: "마지막 받침 쉼 뒤 끝 4마디(판정 없음) L1 동기 되부름". balance: 마지막 구절은 1박 통 4개(**판정 있음**, L1 되부름) + outro 8박. "판정 없음 4마디"면 마지막 접촉 4개와 겹침 | `sound.json music.levels.10._outro`, `levels/10-level10.json`(마지막 받침 쉼 46~52박, 접촉 53~56박, length 65) | 되부름은 마지막 구절(46박~끝) 멜로디로 하고 판정 접촉 4개는 그대로. `_outro` 문장을 "마지막 구절과 클리어 연출 동안"으로 고침(박 수는 이슈 3 결과를 따름) |
| 20 | minor | balance-designer (game-developer 구현) | **카드를 닫는 탭 → 레벨 시간 0 간격이 정해지지 않음.** art "카드는 탭으로 닫음, 받침 쉼 시작 전". 닫는 탭 바로 뒤 첫 똑딱이 오면 아이가 닫은 손 그대로 계속 침(받침 쉼이라 무시되지만 첫 4박 학습이 흐려짐) | 30-art 4-4·8-1, `levels/*.json card.timing` | balance.json `card.close_to_level_start_s`(가안 0.6 s, 오디오 선행 대기 포함)를 두고, 그동안 공은 북 위에 앉아 있음 |

## 안건별 판정 (오케스트레이터 정리 1~8)
1. 카드 키 → 이슈 4(매핑 한 곳 = `balance.json gimmicks.<id>.card`, 파일 이름도 같은 키, 검증기 3중 검사).
2. G6 → 이슈 5(art 카드 삭제, lore 표시·L7 분위기 줄).
3. 바뀐 수치 → 놓침 구역 200 ms는 art가 레벨 값으로 검사해 영향 없음(독립 계산 위반 0), L4 290은 다른 문서가 인용하지 않아 충돌 없음, 구름선 0.9는 합의, **Hp 정의는 balance 쪽 문장이 틀림**(이슈 6). art 표의 128 BPM 값은 이슈 7.
4. X5 → 이슈 11(결과 검사 S6로 편입), X6 → 이슈 10(`phrases[].stage` 넣음).
5. K1 0.88d → 실제 레벨에서는 0.92~1.00d. `apex_budget` 1.12 안(이슈 8), 세 박 통 구름 걸림(이슈 9).
6. "구름" → 플레이 중 다의는 문제 없음, 실패 먼지 없음 확인, 레벨 선택 L3 카드만 이슈 14.
7. L10 결과 버튼 2개 합의. 보호자 진입·밀림 표지는 수치 블록이 없음(이슈 15, balance 담당).
8. rhythm-01 구분 → 아래.

## rhythm-01 구분 판정
- **화면: 분명함.** art 10절대로 궤도·별·북채·보여 주기 마디·엄지 받침·카운트인 점이 없고, 공 색(7° 어두움 vs 193° 밝음)·바탕 명암·북 모양(옆에서 본 납작 사각 3.4:1 vs 원)·자리(화면 아래 vs 가운데)가 모두 반대. 흑백 구도도 다름.
- **규칙: 분명하지만 문서와 기준 구현에 한 줄이 빠짐.** 차례 신호·콜앤리스폰스 없음, 받침 쉼 + 자동 토스, 화면 판정 시계, 높이 = 다음 박까지 시간은 rhythm-01에 없는 규칙. 그러나 가장 큰 차이인 "탭이 공을 올려 보낸다(안 치면 떨어진다)"가 세 구분 표에 없고(이슈 13), `ballsAt`은 탭 없이도 공을 다시 튀게 해 rhythm-01의 "공은 알아서 움직이고 탭은 표식만 친다"와 같은 동작이 됨(이슈 2).
- **용어·문구: 화면 이름은 구분됨, 판정 순간 문장은 헷갈림.** 별·궤도·북채·똑딱을 화면 글에서 뺀 것(7-9 금지어 검사)은 좋음. 하지만 판정 문구가 "○○ 공이 △에 닿을 때 톡!" 틀 그대로라 `tut_tap`·`store_short`가 rhythm-01과 한 낱말만 다르고 `aria_play_area`는 같음(이슈 12).
- 결론: **"움직이는 공이 목표에 닿을 때 탭"은 화면만 보면 헷갈리지 않지만, 문구와 기준 궤적 함수 때문에 규칙 설명이 rhythm-01과 같아질 위험이 있음.** 이슈 2·12·13을 고치면 "떨어지는 공을 쳐 올리고, 높이로 기다림을 읽는다"로 구분이 선다.

## 잘 된 점
- 1.1 s 재시작 배분·손가락 누름 시작·곡 음 시작 규칙이 숫자 하나까지 balance와 맞음(art가 레벨 파일 값을 그대로 읽어 검사).
- art가 놀이 높이·구름선을 공 아랫점 기준 식으로 JSON에 둠 → 높이 검사를 해상도별로 다시 계산할 수 있음.
- lore가 수치를 쓰지 않고 balance를 참조, 텍스트 원본을 JSON으로 두고 금지어 자동 검사.

## 점수
- 1-2 교차 리뷰는 채점하지 않음(오케스트레이터 지시).
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목: "튜토리얼·연출 그림의 시각 값(손가락·카드 닫힘·바탕 전환)은 아트 원본(layout.json)에서 읽어 판정 위험 구간과 겹침을 검증기가 확인" (이슈 1 근거: 검증기가 balance 값만 보면 아트 값의 겹침을 놓침)

VERDICT: REVISE
