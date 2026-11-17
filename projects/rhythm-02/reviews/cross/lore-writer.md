# 교차 리뷰: lore-writer · 1-2 (1차, 지적만)

- 관점: 텍스트 키·문구·이름·용어, 글 없이 이해되는지, 5~6세 말로 설명되는지. 수정은 다음 단계에서 합니다.
- 점수 없음(1-2 교차 리뷰). 형식은 `harness/templates/review.md`에서 점수 절만 뺐습니다.

## 확인한 것
- 읽은 파일: `20-balance.md`, `balance.json`(`gimmicks`·`tutorial_finger`), `levels/01-level1.json`·`07-level7.json`, `30-art.md`, `assets/layout.json`(`finger`), `assets/mockup-*.svg`(글 자리), `assets/cards/` 파일 목록, 내 문서 `10-lore.md`·`strings.json`
- 안건 출처: `Docs/orchestrator/2026-11-17-1-1-planning-supervision.md` "1-2로 넘기는 충돌·안건" 1·2·3·6·7·8
- rhythm-01 대조(읽기만): `projects/rhythm-01/10-lore.md`(`tut_tap`·문구), `assets/` 목록. 세 문서의 rhythm-01 구분 절: 10-lore 8절, 20-balance 2절, 30-art 10절
- 기준: `harness/criteria.md` 세계관·텍스트, 대상 연령. `harness/insights.md` 5~6세·텍스트 항목

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | major | lore-writer·art-director (balance 확인) | **카드 키가 세 군데에서 다름.** balance는 lore 키를 쓰고 L7만 `card_three`. 그런데 `strings.json`에는 `card_three`가 없고(`card_fast`만 있음), art 파일은 `card_B1…card_R1`이라 `card_three.svg`도 없음. 이대로면 빌드가 L7 카드 문구와 그림을 모두 못 찾음. 10-lore 7-3 규칙 "키 = `card_<id>.svg` = 레벨 JSON 카드 키"와도 맞지 않음 | `balance.json` 60~67줄 `gimmicks.R1.card = card_three`, `levels/07-level7.json` `card.id`, `strings.json` 37줄, `assets/cards/` 18개 파일, 30-art 8절·X1 | 이름 원본은 **`balance.json gimmicks.<id>.card` 하나**로 둠(지금 값 유지). art는 생성기에서 파일 이름을 그 키로 바꿈(`card_bounce.svg`, `card_bounce_portrait.svg` …, 30-art X1 "생성기 한 줄"). lore는 `card_fast`를 지우고 `card_three`를 넣음. 문구 가안: **"하나 둘 셋, 톡!"(10자) / "One, two, three, tap!"(4단어)**. 그림 `card_R1`(1박 → 3배 높이 점 3 → 손가락)과 맞고, 큰 통 카드("높이 뜨면 오래 걸려")와도 구분됨. 7-9 검사에 "`balance.json` 카드 키 ⊂ `strings.json` 키, 파일 존재" 확인을 덧붙임 |
| 2 | minor | art-director·lore-writer | **G6을 안 쓰는데 그 흔적이 남음.** `card_G6.svg`·`_portrait`(바람선 그림)와 lore `card_fast` "노래가 빨라져요". 남아 있으면 개발이 잘못 붙이거나 criteria "키는 빌드에서 쓰이거나 이유가 DEV_NOTES" 항목에 걸림 | 20-balance 8-1 "G6 쓰지 않음", 30-art 8절 표·X3, 10-lore 3절 G6 줄 | art: 생성기에서 G6 카드를 빼고 파일 삭제. lore: `card_fast` 키 삭제(1번과 같이, 키 수 79 그대로), 3절 G6 줄은 "미사용(balance K8)"으로, R1 줄 추가 |
| 3 | major | art-director (balance 검증기) | **L1 손가락이 다음 접촉의 위험 구간까지 남음.** art는 "접촉 + 300 ms 뒤 사라짐"(= 3300 ms). 2번째 접촉(3600 ms)의 놓침 구역 시작은 3600 − 150 − 200 = 3250 ms라 **50 ms 겹침**. balance는 "공을 치면 또는 통과 창 끝(3170 ms)"이라 검증기 S5는 balance 값으로 통과함. 손가락과 같이 뜨는 `tut_tap` 글도 같이 늦게 사라짐(rhythm-01 M1과 같은 종류) | `assets/layout.json` `finger.hide_after_ms: 300`, 30-art 5-3, `balance.json tutorial_finger.gone: contact_pass_end_or_on_hit`, 20-balance 6-3 | art `layout.json`을 balance 값(치면 바로, 늦어도 통과 창 끝)으로 맞춤. balance S5가 `layout.json` 손가락 값을 직접 읽게 함. 누름 길이도 맞춤(art 100 ms vs balance 접촉 시각까지 120 ms) |
| 4 | minor | lore-writer | **바뀐 수치가 문구에 주는 영향.** 놓침 구역 200 ms, L4 290, 구름선 0.9는 문구에 숫자가 없어 바뀔 것이 없음(카드 8장 하나하나 확인: `card_cloud` "숨었다"는 L3 0.97 s·L10 0.57 s 둘 다 숨음이라 맞음, `card_double` "두 번" = 반박 짝, `card_roll` "네 번" = L8 첫 묶음 4개). 바꿔야 하는 것은 L7뿐: 4절 L7 분위기 "바람이 불면 노래가 한 번 빨라짐"과 기믹 힌트가 G6 기준이고, 104줄 "card_three(가칭)" 메모가 남음. 카드 그림 힌트 칸이 art 실제 칸과 다름(`card_bounce` ①을 "앉아 쉼"으로 적었으나 art는 "공 내려옴"부터) | 10-lore 4절 L7 줄·104줄·7-3 표, 30-art 8절 표, 20-balance 5절 표 | L7 이름 "바람개비 언덕"은 유지(art 실루엣도 유지), 분위기를 **"바람 타고 높이, 하나 둘 셋"**으로, 기믹 힌트를 R1(3박)으로. 7-3 그림 힌트 칸은 art 8절 칸 설명을 그대로 옮김 |
| 5 | major | art-director (lore 확인) | **"구름" 뜻이 아직 넷.** 실패 먼지는 art가 없앰(해결). 남은 것: ① 플레이 구름(G2·클리어 때 공이 들어가는 곳) ② 등급 구름 1~3(accent 색, 작음) ③ **L3 레벨 카드 장식 "작은 구름 2개"(accent 색)** ④ L3 이름 "솜구름". ②와 ③이 **같은 레벨 선택 화면에 같은 색·비슷한 크기**로 나와, 글을 못 읽는 아이에게 안 깬 L3 카드가 "구름 2개 받음"으로, 깬 L3 카드는 구름이 4~5개로 보임 | 30-art 3-1 L3 "레벨 카드에서만 작은 구름 2개", 11절 "대표 실루엣 accent 색", 7-3 등급 구름 accent | L3 카드 대표 그림을 **플레이 구름 모양 큰 것 1개 + 공이 반쯤 숨은 모습**(구름 통 장면)으로 바꿈. 등급은 늘 3칸(받지 못한 자리 점선)을 카드 바깥 같은 줄에 두어 "개수"로 읽히게 함. 등급을 구름으로 두는 것은 유지 제안(클리어 "구름까지 갔어요!"와 이어짐) |
| 6 | minor | balance-designer·art-director (1-0 출처) | **"똑딱"·"tick"은 rhythm-01 이름 계열.** rhythm-01 한국어 제목이 "똑딱북"(Tickadrum)인데, 받침 쉼 소리를 20-balance 11회·30-art 4회·`balance.json` 4회·`sound.json` 1회 "똑딱"으로 부르고 소리 키가 `tick_a`/`tick_b`. 또 `tick_b`를 "딱"(받침 쉼 2·4박)이라 불러 판정 등급 "딱"(가장 좋음)과 같은 말이 됨. 화면 글은 아니지만 DEV_NOTES·aria·리뷰 대화로 새어 나가기 쉽고, 메인 세션 요청 "용어 구분"에 걸림 | `grep -c 똑딱`: 00-benchmark 5, 20-balance 11, 30-art 4, balance.json 4, sound.json 1. 30-art 9-2 `tick_a`/`tick_b`, 6절 등급 "딱" | 문서 말을 **"쉼 박 소리"**(또는 "까딱 소리", 공이 까딱이는 모습과 같은 이름)로 통일. 소리 키는 `rest_a`/`rest_b`로 바꾸는 것을 권함(빌드 전이라 지금 바꾸면 비용 거의 없음). 판정 등급 "딱"은 그대로, 소리에는 "딱"을 쓰지 않음 |
| 7 | major | art-director | **글 없이 쓰라는 버튼·표지 중 그림이 정해지지 않은 것이 많음.** art에 모양이 있는 것은 멈춤·↻·깃발·자물쇠·뒤로(목업 삼각형)뿐. 없는 것: 설정(+길게 누르기 표시), 소리 켜기/끄기, 연습 들어가기(`btn_practice`), 그림 다시 보기(`btn_card_replay`), 결과 "다음"·"레벨 고르기", 타이틀 손가락 톡, 오디오 잠금 스피커(`audio_unlock`), `look_ball` 눈+공 표지, `sound_late` 표지, 백그라운드 복귀(`paused_background`), 소리 맞추기 화면(30-art 9-5 "1-2 이후"), 불러오기 튀는 공. criteria 대상 연령 "글을 읽지 않아도 시작·학습"이 이 그림들에 달림 | 30-art 4-4·7-3·9-5·11절, `mockup-level-select.svg`(설정·소리 버튼 없음), 10-lore 7-1·7-4·7-6 그림 힌트 칸 | art가 **아이콘 표(키 ↔ 그림 ↔ 화면 ↔ 자리)**를 30-art에 추가. lore는 그 표의 키 칸이 `strings.json`과 같은지 7-9 검사에 넣음 |
| 8 | minor | lore-writer (dev 참고) | **화면에 보이는데 대체 글 키가 없는 것.** ① 플레이 HUD의 최고 기록 점(공 색 점): 키 없음. `aria_progress`는 막대 하나의 값만 줌 ② 레벨 선택 "연습 최고 진행" 막대를 따로 두면(30-art 11절 "1-2에서 확정") 키 없음. 나머지(시도 점 `aria_attempts`, 깃발 `aria_checkpoint`, 등급 `grade_1~3`, 연습 클리어 `practice_clear`, 자물쇠 `levelcard_locked`)는 있음. 첫 실패 ↻ 그림은 장식(aria-hidden)이라 키 불필요 | 30-art 4-4 HUD 표·11절, 20-balance 6-2 "진행도 막대에 최고 기록 점", 10-lore 7-2·7-4 | `levelcard_best`를 **`aria_best`("가 본 만큼")**로 이름을 바꿔 레벨 카드·플레이 HUD 둘 다에 씀(값은 `aria-valuenow`). 연습 막대를 두기로 하면 `aria_practice_best` "연습으로 가 본 만큼"(11자) 추가 |
| 9 | major | balance-designer·art-director (lore 따라감) | **보호자 진입이 반쯤만 정해짐.** "설정 길게 누르기 → 어른 보정"은 balance 4-2·lore 7-7이 같음(확정 가능). 정해지지 않은 것: (a) 설정 전체가 보호자용이면 음악·효과음·기록 지우기도 길게 눌러야 열리고, 그러면 아이가 쓰는 소리 켜기/끄기(`btn_sound_on/off`)는 다른 자리에 따로 있어야 함 → art에 자리 없음 (b) 길게 누르는 시간과 "누르는 중" 표시(채워지는 원 등) 값·그림 없음 (c) 짧게 누르면 무엇을 하는지 | 20-balance 4-2, 10-lore 7-7·9절 A8·A9, 30-art 4-4·11절 | 제안: 설정 버튼 길게 누르기(시간은 balance/dev, 표시는 art) → `guardian_title` 화면 안에 음악·효과음·소리 맞추기·기록 지우기. 짧게 누르면 아무 일 없이 `guardian_hold` 보조 글만 잠깐. 아이용 소리 켜기/끄기 1개는 레벨 선택 오른쪽 위(art 자리). 확정되면 lore는 `settings_*` 구분만 고침 |
| 10 | minor | balance-designer·art-director·lore-writer | **소리 밀림 표지: 쓰기로는 같으나 어느 것을 어디에 띄울지 없음.** balance 9-4가 `look_ball`·`sound_late` 사용에 찬성. 감지 정의·그림·위치가 없음. 또 lore가 두 키를 ★(플레이 중)로 적었지만 둘 다 플레이 중에는 안 뜸 | 20-balance 9-4·12절 K3, 10-lore 7-4, 30-art 14절 K3(그림 없음) | 아이용 = 레벨 선택에 눈+공 그림 + `look_ball` 보조 글. 어른용 = 보호자 설정의 소리 맞추기 옆에 `sound_late` 표지. 감지 정의는 balance/dev가 rhythm-01 8-5 방식으로(빌드 기준). lore는 두 키 구분을 "화면"으로 고침. art는 그림 2개 |
| 11 | major | lore-writer | **rhythm-01과 튜토리얼 문장이 같은 틀.** rhythm-01 `tut_tap` "별에 닿으면 톡!" ↔ 우리 `tut_tap` "공이 닿으면 톡!". 키 이름도 같고, 우리 문장에는 닿는 곳(북)이 빠져 "무언가에 닿으면 톡"이라는 rhythm-01 판정 순간과 말로는 구분이 안 됨 | `projects/rhythm-01/10-lore.md` 195줄, `strings.json` 30줄 | **"공이 북에 닿으면 톡!"(12자) / "Ball lands on the drum: tap!"(6단어)**. rhythm-01에서는 공이 북에 닿지 않으므로 "북에 닿는다"가 우리 판정 순간을 말로 갈라 줌. `card_bounce`("북에 닿을 때 톡")와도 이어짐 |
| 12 | minor | lore-writer | **10-lore 8절 "문구 재사용 없음"이 사실과 다름.** 한국어 문구 12개가 rhythm-01과 글자까지 같음: 잘했어요!, 멈췄어요, 레벨 고르기, 눌러서 시작, 연습 중, 그림 다시 보기, 불러오는 중…, 기록을 지울까요?, 어른과 같이 해요, 그대로 둘게요, 해 본 횟수, 가는 길 | `grep`으로 rhythm-01 10-lore와 대조 | 시스템 UI 문구(멈춤·불러오기·기록 지우기·보정 흐름)는 허브 공통 UX로 **일부러 같게 둔다**고 8절에 적음(두 게임을 오가는 아이에게 같은 뜻). 게임 정체성 문구인 `clear_title_1` "잘했어요!"는 **"높이 올랐어요!"(8자) / "Way up high!"**로 바꿔 튐 감각을 넣음 |
| 13 | minor | balance-designer (lore 문구 제공) | **승패 한 문장이 문서마다 다름.** balance 3절 "공이 북에 **떨어질 때** 톡 쳐서 다시 올려 보내기. 떨어뜨리면 다시." "떨어질 때"는 "내려오는 동안"으로 들려 일찍 치는 아이를 부를 수 있음. lore는 "닿을 때" | 20-balance 3절, 10-lore 2절·7-3 | 세 문서와 00-benchmark에 같은 한 문장을 씀: **"공이 북에 닿을 때 톡! 놓치면 다시."** |
| 14 | minor | art-director (lore 따라감) | **글을 띄울 자리가 art에 없음.** 클리어 제목 `clear_title_*`, 레벨 카드 이름 `levelN_name`(lore 구분 "화면"), 그림 카드 보조 글(lore "art 결정"), `practice_on`. 목업에는 치수 표시 글뿐이고 30-art 8절은 카드 "글 없음"이라 카드 보조 글을 띄우는지 안 띄우는지 정해지지 않음 | `assets/mockup-*.svg` `<text>` 6개 모두 치수 표시, 30-art 7-3·8절·11절, 10-lore 7-3 머리말 | art가 정함: 클리어 제목 = 등급 구름 위 한 줄, 레벨 카드 이름 = 카드 아래 작은 보조 글(없어도 구분됨), 그림 카드 = 글 없음(카드 키는 대화 상자 이름 aria). 정해지면 lore가 `card_*`·`practice_on` 구분을 고치고 글자 크기·`keep-all` 잘림을 리뷰 대상에 넣음 |
| 15 | minor | lore-writer | **`new_best` 그림 힌트가 art와 다름.** lore "막대 끝 반짝임", art "공 색 점이 새 자리로 0.2 s 미끄러짐 + `best` 소리" | 10-lore 7-4, 30-art 7-2 | lore 힌트를 art 연출로 고치고, `new_best`는 화면 글 없이 `aria-live`만(insights "매 실패 문구 없음"과 맞춤) |
| 16 | minor | art-director·balance-designer | **기획 문서의 "점"·"통"이 여러 뜻.** "점 통"(G3, 1.5박) / 카드 "길이 점" / HUD "시도 점"·"최고 기록 점". "통"은 한 번 튐 / 기믹 "통통"(G4 반박 짝) / 게임 이름 "높이통통" / `clear_title_3` "통통 최고!". 화면 글에는 기획 이름이 안 나와 아이 문제는 아니고, 개발·리뷰에서 헷갈림 | 20-balance 5·8절, 30-art 3·4-4·8절 | 기획 문서는 기믹을 늘 id와 같이 씀("점 통(G3)", "통통(G4)"). 화면 글은 지금처럼 기획 이름을 쓰지 않음(lore 6절 2번 유지) |

## rhythm-01과의 구분 판정 (안건 8)
| 축 | 판정 | 근거 |
|---|---|---|
| 화면 | **분명함** | 30-art 10절: 밝은 바탕 + 어두운 대상(rhythm-01 반대), 공 색상각 7° vs 193°, 납작한 옆모습 북이 화면 아래(rhythm-01 원 북 가운데), 궤도·별·북채·보여 주기 없음, 등급 구름 vs 작은 북. 흑백 구도도 다름 |
| 규칙 | **분명함** | 20-balance 2절: 콜앤리스폰스 없음, 화면 시계(rhythm-01 오디오 시계), 높이 = 다음 박까지 시간, L4부터 박마다 고르게 치면 실패(V14 = 높이를 읽어야 함) |
| 화면 글 | **대체로 분명함** | 금지어 0(10-lore 7-9 ⑤). 다만 `tut_tap` 문장 틀이 같음(이슈 11), 공통 UI 문구 12개가 같음(이슈 12, 의도로 정리) |
| 기획 용어 | **한 곳 겹침** | "똑딱"·`tick`이 rhythm-01 제목 계열(이슈 6) |
| 판정 순간 | **헷갈리지 않음, 글만 보강** | rhythm-01은 "도는 공이 고정된 별에 닿는 순간", 우리는 "떨어지는 공이 아래 고정된 북에 닿는 순간". 화면에서는 움직임 방향·닿는 곳이 달라 바로 갈림. 말로는 둘 다 "닿으면 톡"이라 `tut_tap`에 "북"을 넣으면 해결(이슈 11). 두 게임 모두 화면 이름에 "공·북"이 있지만 rhythm-01에서 공은 북에 닿지 않으므로 "북에 닿는다"가 우리만의 말이 됨 |

## 잘 된 점
- 레벨 테마 키 `level01~10`·이름·장소가 세 문서에서 같음. art 실루엣이 lore 시각 힌트를 그대로 따름(L5 비 없음, L9 마름모 연, L10 해는 공 5배·구석, L3 실루엣 없음). L7 장소 그림을 R1로 바뀌어도 유지한 것도 맞음
- L10 결과 버튼 2개(다시·레벨 고르기)가 lore 5절·art 7-3에서 같음
- 실패 먼지를 없애 "구름" 뜻 하나를 줄임(art 7-1). 실패·재시작에 글이 없고 첫 실패만 ↻ 그림(세 문서 같음)
- 카드 문구에 숫자 값이 없어 balance 수치 변경(놓침 구역·L4 폭·구름선)이 문구를 건드리지 않음
- 소리 맞추기를 "클리어 조건이 아님"으로 세 문서가 같게 말함(화면 판정)

## 다음 단계에서 lore가 할 일 (내 담당 이슈 1·2·4·8·10·11·12·15)
- `card_fast` → `card_three`, `tut_tap`·`clear_title_1` 새 문구, `levelcard_best` → `aria_best`, 키 구분 정리, 4절 L7, 3절 G6/R1 줄, 8절 문구 재사용 설명, 7-9 검사에 카드 키·파일 대조 추가

판정: 수정 필요(blocker 0, major 6, minor 10)
