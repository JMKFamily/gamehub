# 10. 세계관: Tossaloft (높이통통) — 가안

- 작성: 2026-11-17, lore-writer, 단계 1-1 (balance-designer·art-director와 병렬) / **1-2 2차 수정: 2026-11-17** (교차 리뷰 3건 + 오케스트레이터 결정 D1~D16 반영, 처리표는 `Docs/lore-writer/2026-11-17-1-2-revision.md`)
- 입력: `00-benchmark.md`(코어 A "통통 공받기", 특히 3·6·7-1·13-4절), `harness/criteria.md`(세계관·텍스트, 대상 연령), `harness/insights.md`, 오케스트레이터 추가 지시(rhythm-01 용어 피하기, 세로 튐 감각, "rhythm-01과의 구분" 절), `Docs/orchestrator/2026-11-17-1-2-cross-review-decisions.md`(D1~D16)
- 참고(읽기만): `projects/rhythm-01/10-lore.md`(키 표·aria 규칙 구조), `games/rhythm-01/data/strings.json`(문구 겹침 검사), `projects/runner-01/10-lore.md`
- 원본 보호: 상용 게임의 이름·캐릭터·설정·문구를 쓰지 않았습니다. runner-01(Reverbound)·rhythm-01(Tickadrum) 이름·캐릭터·레벨 이름·게임 정체성 문구도 가져오지 않았습니다(8절). 아래 이름·문구는 모두 새로 만든 것입니다. 시스템 UI 문구 일부는 허브 공통 UX로 일부러 같게 둡니다(8-2).
- 소유권: **수치(BPM·판정 창·시간·접촉 수·표시 시점·길게 누르기 시간)는 `20-balance.md`·`balance.json`·`levels/*.json`**, 색·모양·연출·소리·아이콘은 `30-art.md`가 기준입니다. 이 문서는 숫자를 정하지 않고 그 문서를 참조합니다. 결정문에 적힌 값(예: D11 길게 누르기 1.5 s)은 "결정 D11"로 인용만 합니다.
- **텍스트 원본은 `strings.json`입니다.** 빌드는 이 문서의 표를 파싱하지 않고 `strings.json`만 읽습니다(insights 시각·사운드 2번째 줄). 7절 표와 JSON이 같은지는 7-9의 node 검사로 확인합니다.
- **카드 키 원본은 `balance.json gimmicks.<id>.card`입니다**(결정 D1). 이 문서·`strings.json`·`assets/cards/<키>.svg`는 그 8개를 따릅니다.

## 확정값 표 (1-2 2차 반영)

| 항목 | 값 | 쓰는 곳 | 비고 |
|---|---|---|---|
| 게임 이름 (영문) | **Tossaloft** (가안) | 타이틀, 영어 스토어 | **요청자 확정 필요**(1절). 이름 짜임 메모(1-1, 결정 D15) |
| 게임 이름 (한국어) | **높이통통** (가안) | 타이틀, 한국어 스토어 | 스토어 표기 제안 `높이통통: Tossaloft` |
| 승패 한 문장 | **"공이 북에 닿을 때 톡! 놓치면 다시."** | 세 기획 문서·00-benchmark 공통 | 결정 D8. 화면 글 키 아님 |
| 핵심 규칙 | **탭이 공을 올린다.** 공은 북 가죽에 닿아 잠깐 기다리고, 톡 치는 순간 다시 튀어 오름. 안 치면 떨어짐 | 2절·8절·스토어 | 결정 D3 |
| 세계관 | 아주 얇음. 보이는 모양 그대로(공·북·구름·그림자) | 전체 | 2절. 캐릭터 이름·얼굴 없음 |
| 화면에 쓰는 모양 이름 | **공 / 북 / 구름 / 그림자** (ball / drum / cloud / shadow) | 튜토리얼·대체 글 | 3절 |
| 레벨 수 | 10 | 레벨 선택 | 4절 |
| `theme_id` | `level01` ~ `level10` | 레벨 JSON, 팔레트 키 | 세 문서 같음 |
| 카드 키 | 8개: `card_bounce` `card_big` `card_cloud` `card_dot` `card_double` `card_twoballs` `card_three` `card_roll` | strings·카드 파일·레벨 `card.id` | 결정 D1. `card_fast` 삭제(D2) |
| 받침 쉼 소리 이름 | **"콩"(쉼 박 소리)**, 소리 키 `rest_a`/`rest_b`(art) | 기획 문서 | 결정 D7. 화면 글 없음 |
| 플레이 중 문구 | 한 문장, **한국어 12자 이내(공백 포함) / 영어 6단어 이내** | 튜토리얼·토스트·메뉴 보조 글 | criteria. 어른용·스토어 문구를 뺀 **모든 키**에 적용(7-9 자동 검사) |
| 한국어 줄바꿈 | `word-break: keep-all` | 빌드 전체 | criteria |
| 대체 글 | 숫자·값을 이어 붙이지 않음. 값은 `aria-valuenow` 같은 속성 | 빌드 전체 | 6절 |
| 텍스트 키 수 | **81개** (`_meta` 제외) | `strings.json` | 7절, 7-9 검사 PASS |
| 실패·재시작 문구 | **없음** (자동 재시작, 첫 실패만 ↻ 그림) | 플레이 | insights runner-01 |
| 연습 체크포인트 버튼 문구 | **없음** (자동 체크포인트) | 연습 모드 | insights runner-01 |

---

## 1. 게임 이름 (요청자 확정 필요)

이름에 **세로로 튀어 오르는 감각**("높이 뜬다", "통통")을 담고, rhythm-01 이름 계열(tick·drum·북)과 runner-01(reverb·bound)을 피했습니다. "Rhythm·Beat·Tap·Dash·Ball" 같은 흔한 낱말 단독도 피했습니다.

| 후보 | 한국어 | 뜻 | 충돌 확인 (2026-11-17 웹 검색, 이름 비교 용도만) | 판정 |
|---|---|---|---|---|
| **Tossaloft** | **높이통통** | toss(톡 던져 올림) + aloft(높이, 공중에). "높이 띄워 올린다" = 규칙 그대로 | `"Tossaloft"`·`"Toss Aloft"` 정확 일치하는 게임·앱 없음(보드게임 "Toss Across", "Toss & Tumble" 등 이름이 다른 toss 게임만 보임). 한국어 `"높이통통"` 정확 일치 없음 | **추천** |
| Bouncloud | 통통구름 | bounce + cloud. 공이 구름까지 튐 | 정확 일치 없음. 다만 Steam의 작은 게임 "Bouncy Cloud", iOS "Bouncify"(구름 위를 튀는 게임)와 발음·뜻이 가까워 검색에서 헷갈림. 한국어 "통통구름" 일치 없음 | 탈락(헷갈림) |
| Skybop | 하늘통 | sky + bop(톡) | **브라우저 게임 "Skybop"이 있음**(패들로 공을 튕겨 안에 가두는 하이퍼캐주얼). 장르까지 가까움 | 탈락(충돌) |

- **추천: Tossaloft / 높이통통.** 5~6세가 "높이 통통"으로 소리 내어 말하기 쉽고, 이름만으로 "공을 높이 통통 올린다"가 떠오릅니다(결정 D3 "탭이 공을 올린다"와 같은 뜻). 영어는 조어라 검색 충돌이 적습니다.
- 한국어 "통통"은 놀이 일반 의성어라 단독으로는 흔합니다. 그래서 "높이"를 붙여 한 낱말로 씁니다.
- 한계: 웹 검색 기준입니다. 앱스토어·구글 플레이 직접 검색과 상표 검색은 하지 않았습니다(출시 단계 전 오케스트레이터).
- 검색에서 본 다른 게임은 이름 비교에만 썼고 내용은 참고하지 않았습니다.

### 1-1. 이름 짜임 메모 (결정 D15: 가안 유지, 요청자 확정 때 함께 알림)

- **닮은 점**: 영문 이름 짜임이 rhythm-01과 같습니다. Tossaloft = toss + **a** + loft, Tickadrum = tick + **a** + drum. 둘 다 **T로 시작하는 3음절 "동사 + a + 낱말" 조어**라 허브에 나란히 뜨면 시리즈처럼 보일 수 있습니다(art 교차 리뷰 이슈 22).
- **다른 점**: 한국어 이름(높이통통 / 똑딱북)은 소리·뜻이 다르고, 앱 아이콘은 글 없이 그려(공 + 납작 북 / 궤도 + 별) art 쪽에서 이미 구분됩니다.
- **요청자에게 알릴 선택지**(이 문서는 가안 유지): ① 그대로 Tossaloft(시리즈처럼 보여도 괜찮다면) ② a가 끼지 않는 대체 후보. 대체 후보를 내야 하면 lore가 1절 표와 같은 방식(웹 검색 충돌 확인)으로 1~2개를 다시 냅니다. 바뀌면 `title`·`store_short`·10절만 고칩니다.

## 2. 세계관과 톤 (아주 얇게)

하늘 아래 작은 놀이터에 **북 하나**와 **공 하나**가 있습니다. 공은 내려와 북에 닿으면 가죽 위에서 잠깐 멈칫합니다. **그때 아이가 톡 치면 공이 "통!" 하고 다시 튀어 오르고, 치지 않으면 공은 북 옆으로 떨어집니다.** 높이 뜬 공은 오래 걸려 내려오고, 낮게 뜬 공은 금방 내려옵니다. 아이가 친 북소리가 노래의 빈 자리를 채웁니다. 한 곳에서 노래 끝까지 공을 떨어뜨리지 않으면 공은 한 번 크게 튀어 **구름 속으로** 들어가고, 다음 놀이터로 갑니다. 잔디밭에서 시작해 하늘 꼭대기까지 열 곳입니다.

- **승패 한 문장(세 문서 공통, 결정 D8)**: **"공이 북에 닿을 때 톡! 놓치면 다시."**
- **탭의 결과(결정 D3)**: 탭이 공을 올립니다. 공은 접촉 시각에 북 가죽에 닿아 통과 창 동안 기다리고, 탭 순간 튀어 오릅니다. 다음 높이 = 다음 접촉까지 남은 시간(수치·궤적은 balance `ballsAt(level, t, hits)`). 탭 없이 통과 창이 끝나면 떨어집니다. 이 문서의 모든 문구는 "공이 알아서 튀고 탭은 표식만 친다"가 아니라 **"내가 쳐야 공이 올라간다"**로 씁니다.
- **톤 키워드**: 통통 / 둥실 / 높이·낮게 / 공놀이 / 쳐 올리기 / 떨어져도 "괜찮아, 다시".
- **캐릭터·이름·얼굴 없음.** 공은 그냥 공, 북은 그냥 북입니다(약한 아트 컨셉, 신호 최소화). 이야기는 스토어 긴 설명에만 두고, 화면은 그림·소리·움직임으로만 말합니다.
- 핵심 감각을 말로 하면 한 줄: **"높이 = 기다림"**. 튜토리얼 카드·레벨 이름·스토어 문구가 모두 이 감각을 가리킵니다.
- "구름"은 문서에서 늘 **플레이 구름**(화면 위, 구름 통 G2·클리어 때 공이 들어가는 곳)과 **등급 구름**(결과·레벨 카드의 작은 구름 1~3칸)으로 나눠 부릅니다(art 이슈 16).

## 3. 화면에 보이는 모양 이름

화면 이름은 아이가 그림을 보고 바로 부를 수 있는 낱말만 씁니다. 모양·색은 `30-art.md`가 기준이고, **튜토리얼 그림은 바로 뒤에 처음 만나는 실제 오브젝트와 같은 색·모양**이어야 합니다(criteria).

| 요소 | 화면 이름 (KR / EN) | 보이는 모양 (art 확정) | 아이가 그림으로 알아야 하는 것 |
|---|---|---|---|
| 판정 대상 | **공 / ball** | 원 1개(x 고정, 위아래로만 튐) | "공이 북에 닿을 때 톡 쳐야 다시 올라간다" |
| 받침 | **북 / drum** | 화면 아래 가운데 납작한 둥근 사각형. 탭하면 톡 올라감 | "누르면 북이 톡 올라가고 공을 쳐 올린다" |
| 공의 보조 신호 | **그림자 / shadow** | 북 위 타원. 공이 높을수록 작고, 내려올수록 커짐 | 공이 구름에 숨어도 "곧 내려온다" |
| 높은 곳 | **구름 / cloud** (플레이 구름) | 화면 위 둥근 도형. 구름 통(G2)에서 공이 잠깐 숨음 | "구름까지 가면 오래 기다린다" |
| 진행도 막대 | (글 없음) | 화면 위 막대 | 찰수록 끝에 가까움 |
| 최고 기록 점 | (글 없음, 대체 글 `aria_best`) | 막대 위 공 색 점 | 지난번에 여기까지 갔다 |
| 시도 횟수 | (숫자 대신 점) | art | |
| 연습 체크포인트 | **깃발 / flag** | art | 연습 모드에서 여기부터 다시 |
| 클리어 등급 | **등급 구름, 늘 3칸** | 받은 만큼 채운 작은 구름, 빈 칸은 점선(결정 D12) | 채운 칸이 많을수록 잘함. 기준은 balance |

통(튐) 종류의 이름은 **기획 문서·카드 대체 글 쪽에서만** 쓰고 화면 글로 띄우지 않습니다. 기획 문서에서는 늘 id와 같이 씁니다("점 통(G3)").

| id (1-0) | 기획 이름 | 아이 말 (카드 대체 글 쪽) | 카드 키 (결정 D1, 7-3) | 레벨 |
|---|---|---|---|---|
| B0 | 받침 쉼 | 공이 북 위에 앉아 까딱, "콩" | (카드 없음, L1 카드 앞) | 전체 |
| B1 | 통 | 톡 쳐서 다시 올려 | `card_bounce` | L1 |
| G1 | 큰 통 | 높이 뜨면 오래 | `card_big` | L2 |
| G2 | 구름 통 | 구름에 숨었다 내려옴 | `card_cloud` | L3 |
| G3 | 점 통 | 길게 길게 짧게 | `card_dot` | L4 |
| G4 | 통통 | 낮게 두 번 | `card_double` | L5 |
| G5 | 두 공 | 공 두 개가 번갈아 | `card_twoballs` | L6 |
| R1 | 세 박 통 | 높이 떠서 셋 세고 | `card_three` | L7 |
| G7 | 드르륵 | 톡톡톡톡 빠르게 | `card_roll` | L8 |
| G6 | 빠른 곡 구간 | — | **미사용(예비)**, 카드 키 없음(결정 D2) | — |

## 4. 레벨 테마 (10개)

공통 규칙:
- **이름 체계**: 5~6세가 바로 그림으로 그릴 수 있는 놀이 장소 하나. 아래(땅)에서 위(하늘)로 올라가는 순서라 "점점 높이"가 진행감이 됩니다.
- 이름의 낱말은 그 레벨의 새 기믹을 떠올리게 합니다(모래 = 큰 통(G1) 쿵, 구름 = 구름 통(G2), 그네 = 점 통(G3) 엇박 흔들, 웅덩이 = 통통(G4) 낮게 찰방찰방, 시소 = 두 공(G5) 번갈아, **바람개비 = 바람 타고 높이 떠서 셋(R1)**, 딱따구리 = 드르륵(G7)).
- **배경 실루엣은 기본 도형 몇 개, 멈춰 있음**(개수·색은 art). **공과 비슷한 크기의 원, 위에서 떨어지는 줄지은 도형(빗방울 줄 등)은 쓰지 않습니다**(신호 수 1 유지). 배경 구름은 플레이 구름(G2)과 헷갈리지 않게 art가 판단합니다.
- 공·북·그림자·플레이 구름의 모양·색은 10레벨 내내 같습니다.
- 수치(BPM·접촉 수·통과 폭)는 적지 않습니다. 기믹 순서는 `balance.json gimmicks`가 기준입니다.

| 레벨 | 이름 (KR / EN) | 새 기믹 (balance) | 분위기 한 줄 | 분위기 키워드 | 시각 힌트 (art) | 기믹 힌트 (balance) |
|---|---|---|---|---|---|---|
| 1 | **잔디밭 / Grassy Lawn** | 기본 통(B1)·받침 쉼(B0) | 햇살 아래 풀밭에서 톡, 통! 처음 쳐 올리기 | 느긋, 첫 박, 따뜻함 | 낮은 풀밭 띠 | 고른 1박만. 손가락 L1 첫 접촉 1회 |
| 2 | **모래놀이터 / Sandbox** | 큰 통(G1) | 모래 위에서 높이 쿵, 낮게 통 | 길게·짧게, 장난 | 모래 더미(반원)·작은 세모(모래성) | 큰 통 = 2박. "높이 뜨면 오래" |
| 3 | **솜구름 하늘 / Puffy Sky** | 구름 통(G2) | 공이 플레이 구름 속에 숨었다가 그림자 따라 내려옴 | 둥실, 기다림, 세기 | 플레이 배경은 비우고 플레이 구름이 주인공. **레벨 선택 카드 = 큰 구름 1개 + 공이 반쯤 숨은 모습**(결정 D12, 등급 구름과 크기·개수가 다름) | 4박, 숨는 동안 그림자 커짐 |
| 4 | **그네 터 / Swing Park** | 점 통(G3) | 그네가 흔들리듯 길게, 길게, 짧게 | 흔들흔들, 엇박 | 그네 틀(가로 막대 + 세로 줄 2) | 3+3+2 묶음만. 박마다 치기가 처음 실패 |
| 5 | **물웅덩이 / Puddle Splash** | 통통(G4) | 웅덩이에서 낮게 찰방찰방 두 번 | 찰방, 빠른 짝 | 납작한 타원 웅덩이(비는 내리지 않음) | 큰 통 뒤 짝으로만 |
| 6 | **시소 / Seesaw** | 두 공(G5) | 시소처럼 두 공이 번갈아 올라갔다 내려옴 | 주고받기, 번갈아 | 시소 판(기울지 않은 정지 막대) + 세모 받침 | 접촉 간격 ≥ 1박, 줄지어 내려오지 않게 |
| 7 | **바람개비 언덕 / Pinwheel Rise** | 세 박 통(R1) | 바람 타고 높이 떠서 하나, 둘, 셋 기다렸다 톡 | 바람, 높이, 셋 세기 | 언덕(반원) + 바람개비(정지) | 세 박 통 = 3박. 받침 쉼 뒤 자동 토스로만 나옴(balance) |
| 8 | **딱따구리 나무 / Woodpecker Tree** | 드르륵(G7) | 나무를 두드리듯 톡톡톡톡 | 두드림, 빠른 손 | 나무 기둥(직사각형) + 잎(세모). 새 얼굴 없음, 작은 실루엣 | 반박 4연속. 새 기믹으로 셈(balance 확정) |
| 9 | **연 날리는 날 / Kite Day** | 없음(조합) | 높이 뜬 연처럼 높고 낮은 통이 섞임 | 높이, 자신감, 복습 | 마름모 연 + 줄(원 안 씀) | 1~8 조합 |
| 10 | **하늘 꼭대기 / Top of the Sky** | 없음(조합) | 햇살 가득한 꼭대기, 끝은 잔디밭의 첫 통으로 돌아옴 | 꼭대기, 마무리, 반가움 | **햇살 금빛 바탕, 구석의 큰 해**(공과 다른 크기·자리, art) | 조합, 끝은 L1 동기 되부름 |

- 끝 장면(공통): 클리어 때 공이 한 번 크게 튀어 **플레이 구름 속으로** 들어가고 바탕이 한 단계 밝아진 뒤 등급 구름 3칸이 놓임(art 7-3). 시간축은 balance가 기준(결정 D10). 번쩍임·흔들림 없음.

## 5. 글 없이 보여 줄 반응 (문구 없음)

- **실패**: 글·토스트 없음. 늦음(안 침) = 공이 북 옆으로 떨어져 굴러감, 일찍 = 헛스윙 뒤 공이 그대로 내려와 북 옆으로 굴러 떨어짐(결정 D9, 연출·시간은 art·balance). 그 뒤 공이 북 위에 다시 나타남. 무섭거나 아픈 느낌(울음·폭발·빨간 번쩍임·화면 흔들림) 없음.
- **판정 등급**: 화면 글 없음. **북 위 물결 개수(2/1/0쌍)와 공 납작 정도**로 구분, 빛은 보조(art 6절). 판정 이름은 기획 문서 안에서만 1-0 3-2의 "딱/좋아/통과"를 씁니다.
- **새 기록**: 화면 글 없음. 막대 위 공 색 최고 기록 점이 새 자리로 미끄러짐 + `best` 소리(art 7-2). `new_best`는 `aria-live` 알림으로만.
- **클리어**: `clear_title_1~3` 중 하나를 돌려 쓰고(레벨 10은 `clear_last`), **등급 구름 늘 3칸**(받은 만큼 채움, 빈 칸 점선, 결정 D12), 버튼 다음/다시/레벨 고르기. 레벨 10은 "다음" 없이 2개.
- **받침 쉼**: 글 없음. 공이 앉아 까딱이며 "콩" 하는 모습·소리 자체가 "쉬는 중"(결정 D7).

## 6. 텍스트 규칙 (빌드·리뷰 공통)

1. **플레이 중 문구는 한 문장, 한국어 12자 이내(공백 포함) / 영어 6단어 이내.** 이 문서는 범위를 넓혀 어른용(`어른`)·스토어 문구를 뺀 모든 키에 같은 한도를 걸고 7-9에서 자동 검사합니다.
2. **세계관 용어 대신 화면에 보이는 모양 이름**(공·북·구름·그림자·깃발)만 씁니다. 기획 이름(점 통·통통·드르륵 등)은 화면 글에 쓰지 않습니다.
3. 한국어는 `word-break: keep-all`. 지원 언어마다 주요 화면 스크린샷으로 잘림을 확인합니다(QA).
4. **대체 글(aria)에 숫자·값을 이어 붙이지 않습니다.** 진행도·최고 기록·시도·보정 횟수·길게 누르기 진행은 `role="progressbar"`/`meter` + `aria-valuenow`(·min·max)로만 넘기고 `aria-valuetext`도 만들지 않습니다. 키 두 개를 잇는 곳은 레벨 카드 한 곳뿐(`levelN_name` + 쉼표 + 상태 키).
5. 플레이 중 `aria-live` 알림은 `new_best`·`sync_kept` 두 개만(낭독이 박자를 방해함).
6. **튜토리얼 그림은 바로 뒤에 처음 만나는 오브젝트의 실제 색·모양과 같아야 합니다.** 카드 속 공·북·구름은 플레이 오브젝트와 같은 팔레트 값(art `palette.json`), 카드 속 공은 렌더 px ≥ 16(insights).
7. **글을 못 읽어도 플레이 가능**: 시작(손가락 톡 그림), 레벨 선택(카드 색·그림·잠금 자물쇠), 튜토리얼(그림 카드·손가락), 실패(그림), 클리어(등급 구름·버튼 그림), 멈춤 메뉴(그림 버튼) 모두 그림이 주이고 글은 보조입니다. 글을 모두 지운 화면(`notext`)에서도 L1을 시작·클리어할 수 있어야 합니다(QA 확인).
8. 치환 자리 없음(문구 안에 숫자를 끼워 넣지 않음). 화면에 쓰는 이름에 rhythm-01 용어를 쓰지 않음(8절). 게임 정체성 문구는 rhythm-01과 글자까지 같으면 안 됨(7-9 ⑦).
9. 빌드는 `strings.json`만 읽고 코드에 문구를 직접 쓰지 않습니다. 불러오기 화면(`loading`·`load_error`·`load_error_detail`·`btn_retry`)은 JSON을 읽기 전이므로 **빌드 스크립트가 `strings.json`에서 꺼내 `index.html`에 넣습니다**. 키가 빌드에서 안 쓰이면 이유를 DEV_NOTES에 적습니다(criteria).
10. 언어는 `navigator.language`로 자동 선택(한국어면 ko, 그 밖은 en). 보호자 화면에서만 바꿀 수 있고(`settings_language`), 언어 이름(`lang_ko`·`lang_en`)은 **어느 언어 화면에서도 그 언어 자기 이름**으로 씁니다.

## 7. 텍스트 키 표 (KR / EN)

- 구분: **★** = 플레이 중(튜토리얼·토스트·플레이 화면) / **화면** = 메뉴·결과의 보조 글 / **aria** = 대체 글 전용(화면에 안 띄움) / **어른** = 보호자 화면 안 긴 글(한도 없음) / **스토어** = 스토어 문구.
- 버튼은 그림 버튼이고 `btn_*`는 대체 글·보조 글입니다. 그림은 art 아이콘 표(결정 D11, rhythm-01 모양 피함).
- 표의 KR·EN 칸은 `strings.json`과 글자 하나까지 같아야 합니다(7-9).

### 7-1. 타이틀 (3개)

| 키 | 구분 | KR | EN | 쓰는 곳·그림 힌트 |
|---|---|---|---|---|
| `title` | 화면 | 높이통통 | Tossaloft | 타이틀 로고(가안, 요청자 확정 전) |
| `tap_to_start` | 화면 | 눌러서 시작 | Tap to start | 손가락 톡 그림. 오디오 잠금 해제도 이 탭으로 |
| `audio_unlock` | ★ | 톡 하면 소리가 나요 | Tap to hear sound | 오디오가 잠긴 채 들어왔을 때(스피커 그림 + 손가락) |

### 7-2. 레벨 선택 (20개)

레벨 카드 대체 글 = `levelN_name` + 쉼표 + 상태 키 하나(예: "그네 터, 잠겨 있어요"). 깨지 못한 레벨의 최고 진행도는 `aria_best`(7-4, HUD와 같은 키) 이름의 `progressbar`에 `aria-valuenow`로. 레벨 선택 최고 진행도는 일반 모드 기록만(결정 D14). 등급은 늘 3칸(결정 D12)이고 대체 글은 받은 수의 `grade_N` 하나.

| 키 | 구분 | KR | EN | 쓰는 곳·그림 힌트 |
|---|---|---|---|---|
| `levels_screen` | aria | 어디로 갈까요? | Where to bounce? | 레벨 선택 화면 전체 이름 |
| `level1_name` | 화면 | 잔디밭 | Grassy Lawn | 레벨 카드 보조 글 |
| `level2_name` | 화면 | 모래놀이터 | Sandbox | |
| `level3_name` | 화면 | 솜구름 하늘 | Puffy Sky | 카드 그림 = 큰 구름 1개 + 반쯤 숨은 공 |
| `level4_name` | 화면 | 그네 터 | Swing Park | |
| `level5_name` | 화면 | 물웅덩이 | Puddle Splash | |
| `level6_name` | 화면 | 시소 | Seesaw | |
| `level7_name` | 화면 | 바람개비 언덕 | Pinwheel Rise | |
| `level8_name` | 화면 | 딱따구리 나무 | Woodpecker Tree | |
| `level9_name` | 화면 | 연 날리는 날 | Kite Day | |
| `level10_name` | 화면 | 하늘 꼭대기 | Top of the Sky | |
| `levelcard_new` | aria | 아직 안 해 봤어요 | Not played yet | 열렸지만 안 깬 레벨 |
| `levelcard_locked` | aria | 잠겨 있어요 | Locked | 자물쇠 카드 |
| `grade_1` | aria | 구름 하나 | One cloud | 등급 구름 3칸 중 1칸 채움(카드·결과 공통) |
| `grade_2` | aria | 구름 둘 | Two clouds | 3칸 중 2칸 |
| `grade_3` | aria | 구름 셋 | Three clouds | 3칸 모두 |
| `practice_clear` | aria | 연습으로 깼어요 | Cleared in practice | 연습 모드로만 깬 레벨(깃발) |
| `btn_card_replay` | aria | 그림 다시 보기 | See the picture again | 레벨 카드에서 그림 카드 다시 보기 |
| `btn_levels` | 화면 | 레벨 고르기 | Levels | 결과·멈춤 메뉴 버튼(그림 art) |
| `look_ball` | 화면 | 공을 보고 쳐요 | Watch the ball, then tap | **소리 밀림 표지(아이용)**: 레벨 선택에만, 플레이 중 없음(결정 D11). 눈 + 공 그림이 주. 감지 조건은 balance `drift_check` |

### 7-3. 튜토리얼 (9개) — 그림이 주, 글은 보조

- 그림 카드는 그 레벨을 **처음 할 때 시작 전 1회**, 레벨당 1장. **카드 키 = `balance.json gimmicks.<id>.card` = 레벨 JSON `card.id` = 그림 `assets/cards/<키>.svg`·`<키>_portrait.svg`**(결정 D1, 검증기 V7).
- 카드 문구는 **대체 글 우선**이고, 화면에 띄운다면 카드 아래 한 줄 보조 글로만(art 결정). 모든 카드 그림은 **바로 뒤 레벨에서 만나는 실제 공·북·구름과 같은 색·모양**.
- 그림 힌트는 art 카드 그림 언어를 따릅니다: 공 위 꺾쇠 ^ = 올라감, 공 아래 꺾쇠 v = 내려옴, **바닥의 길이 점**(큰 점 = 1박, 작은 점 = 반 박) = 다음 박까지 얼마나 걸리나. 공은 x 고정, 위아래로만 튑니다(옆으로 던진 궤적 아님).
- 손가락 그림(`tut_tap`)은 L1 첫 접촉 1회. 누름 시작은 통과 창 안, 사라지는 시각은 balance `fingerSchedule().gone`(결정 D4).

| 키 | 구분 | KR | EN | 레벨 | 카드 그림 힌트 (art 8절 기준) |
|---|---|---|---|---|---|
| `tut_tap` | ★ | 공이 북에 닿으면 톡! | Ball lands on the drum: tap! | 1 | 손가락이 공이 북에 닿는 순간 톡, 공이 다시 올라감. 사라짐은 balance |
| `card_bounce` | ★ | 톡 치면 공이 올라가요 | Tap, and the ball goes up | 1 | 공 내려옴(v, 점 1) → 북에 닿음 + 손가락 누름 + 물결 → 공 올라감(^). 원인(톡) → 결과(올라감) |
| `card_big` | ★ | 높이 뜨면 오래 걸려 | High bounce, long wait | 2 | 1박 높이(점 1) → 2배 높이(점 2) → 북에 닿을 때 손가락 |
| `card_cloud` | ★ | 구름에 숨었다 내려와 | Up in the cloud, then down | 3 | 공이 플레이 구름 쪽으로 올라감(점 4) → 공은 구름 뒤, 그림자 작게 → 그림자 커지며 내려와 닿을 때 손가락 |
| `card_dot` | ★ | 길게 길게 짧게 | Long, long, short | 4 | 1.5박 높이(큰 점 + 작은 점) → 같음 → 1박 높이(점 1) |
| `card_double` | ★ | 낮게 두 번 톡톡 | Low and quick: tap tap | 5 | 큰 통(점 2) → 낮게(작은 점) → 낮게 두 번 닿을 때 손가락 + 누름 표시 2개 |
| `card_twoballs` | ★ | 공 두 개가 번갈아 | Two balls take turns | 6 | 두 공이 북 좌우에서 서로 다른 높이(실제 한 순간의 높이), 하나씩 닿을 때 손가락. 위아래로 줄지어 내려오지 않게 |
| `card_three` | ★ | 셋 세고 톡 | Count three, then tap | 7 | 앉은 공(받침 쉼) → 높이 뜸(점 3) → 닿을 때 손가락. 실제 L7 첫 세 박 통이 받침 쉼 뒤 자동 토스라 칸 1을 앉은 공으로 |
| `card_roll` | ★ | 톡톡톡톡 네 번 | Four quick taps | 8 | 큰 통(점 2) → 낮게(작은 점 4) → 손가락 + 누름 표시 4개 |

### 7-4. 플레이 화면·토스트 (9개)

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `aria_play_area` | aria | 공을 톡 쳐 올려요 | Tap to send the ball up | 플레이 화면(캔버스) 전체 이름. "탭이 공을 올린다"(결정 D3) |
| `practice_on` | ★ | 연습 중 | Practice mode | 연습 모드 표시(깃발 그림과 함께) |
| `new_best` | aria | 새 기록이에요 | New best! | 새 기록 때 `aria-live` 알림만(화면은 최고 기록 점 미끄러짐, art 7-2) |
| `paused_background` | ★ | 누르면 이어서 해요 | Tap to keep going | 앱이 백그라운드에서 돌아왔을 때 |
| `pause_screen` | aria | 멈췄어요 | Paused | 멈춤 메뉴 전체 이름 |
| `aria_progress` | aria | 가는 길 | Progress | 진행도 막대(값은 `aria-valuenow`) |
| `aria_best` | aria | 가 본 만큼 | How far you got | **최고 기록 점: HUD와 레벨 카드 공용 한 키**(결정 D8). 값은 `aria-valuenow`, 글로 잇지 않음 |
| `aria_attempts` | aria | 해 본 횟수 | Tries | 시도 점 줄(값은 `aria-valuenow`) |
| `aria_checkpoint` | aria | 깃발 | Flag | 연습 체크포인트 깃발 |

### 7-5. 클리어 (4개) — 돌려 쓰기

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `clear_title_1` | 화면 | 높이 올랐어요! | Way up high! | 클리어 화면 맨 위(등급 구름 위 한 줄). 1~3을 차례로 돌려 씀 |
| `clear_title_2` | 화면 | 구름까지 갔어요! | Up to the clouds! | 〃 (클리어 연출 "구름 속으로"와 같은 뜻) |
| `clear_title_3` | 화면 | 통통 최고! | Super bouncing! | 〃 |
| `clear_last` | 화면 | 하늘 꼭대기다! | Top of the sky! | 레벨 10 클리어 때만 |

### 7-6. 버튼 (11개)

- **플레이 HUD 버튼은 멈춤 하나**(결정 D11). **멈춤 메뉴(아이용)** = `btn_resume` 이어 하기 · `btn_retry` 다시 · `btn_levels` 레벨 고르기 · `btn_sound_on`/`btn_sound_off` 소리. 메뉴 전체 이름 `pause_screen`.
- `btn_levels`는 7-2에 있습니다. 모든 그림은 art 아이콘 표.

| 키 | 구분 | KR | EN | 그림 (art) |
|---|---|---|---|---|
| `btn_next` | 화면 | 다음 | Next | 시작 버튼과 다른 모양 |
| `btn_retry` | 화면 | 다시 | Again | ↻. 결과·멈춤 메뉴 공통 |
| `btn_pause` | aria | 멈춤 | Pause | 플레이 HUD 유일 버튼 |
| `btn_resume` | aria | 이어 하기 | Keep playing | 멈춤 메뉴 첫 버튼 |
| `btn_practice` | aria | 연습 | Practice | 깃발 |
| `btn_settings` | aria | 어른 설정 | Grown-up settings | 레벨 선택의 설정(톱니 아닌 새 그림). **길게 누르기**(시간은 결정 D11·balance, 채워지는 표시 art)로 보호자 화면. 설명(`aria-describedby`) = `guardian_hold` |
| `btn_close` | aria | 닫기 | Close | |
| `btn_back` | aria | 뒤로 | Back | |
| `btn_sound_on` | aria | 소리 켜기 | Sound on | 멈춤 메뉴. 지금 꺼져 있을 때 |
| `btn_sound_off` | aria | 소리 끄기 | Sound off | 멈춤 메뉴. 지금 켜져 있을 때 |
| `btn_skip` | aria | 건너뛰기 | Skip | 소리 맞추기 건너뛰기 |

### 7-7. 보호자 화면·소리 맞추기 (21개)

- 진입(결정 D11): 레벨 선택의 `btn_settings`를 **길게 누르기**(채워지는 표시 + `hold_progress`). 짧게 누르면 아무 일 없이 `guardian_hold` 보조 글만 잠깐. 길게 누르기 시간·밀림 감지·소리 맞추기 횟수는 balance.json(`guardian_gate`·`drift_check`·`calibration` 블록, balance 작업 중)이 기준이며 문구에 숫자를 쓰지 않습니다.
- 보호자 화면 내용: 첫 문단 `guardian_intro` → 소리 맞추기 줄(`settings_sync` + 밀림이 이어지면 `sound_late` 표지) → 언어(`settings_language`: `lang_ko`/`lang_en`) → 기록 지우기(`settings_reset` → 확인 창). 음악·효과음 따로 조절은 없음(아이는 멈춤 메뉴 소리 켜기/끄기 하나, D11). 그래서 1-1의 `settings_music`·`settings_sfx`는 지웠습니다.
- 어른용 긴 글(`어른`)은 길어도 됩니다(결정 D11).
- **소리 맞추기는 클리어의 조건이 아닙니다**(판정은 화면 기준). 어른용 문구가 이 점을 분명히 말합니다.
- rhythm-01의 "박자 맞추기" 대신 **"소리 맞추기"**를 씁니다(8절).
- 보정 화면 그림은 박에 맞춰 움직이지 않습니다(insights 구현·성능 3번째 줄, art).

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `guardian_hold` | 화면 | 어른이 길게 눌러요 | Grown-ups: press and hold | 설정 버튼 보조 글·설명(짧게 눌렀을 때) |
| `hold_progress` | aria | 길게 누르는 중 | Keep holding | 길게 누르기 채워지는 표시(`progressbar`, 값은 `aria-valuenow`) |
| `guardian_title` | 화면 | 보호자 설정 | For grown-ups | 보호자 화면 제목 |
| `guardian_intro` | 어른 | 이 게임은 화면에서 공이 북에 닿는 순간을 보고 치도록 만들었어요. 아이가 톡 쳐야 공이 다시 올라가고, 치지 않으면 공이 떨어져요. 블루투스 이어폰처럼 소리가 늦게 들려도, 공을 보고 치면 레벨을 깰 수 있어요. | This game is timed to what children see: they tap when the ball lands on the drum. Each tap sends the ball back up; without a tap, the ball drops. Even if the sound comes late, for example with Bluetooth headphones, they can clear every level by watching the ball. | 보호자 화면 첫 문단 |
| `settings_sync` | 화면 | 소리 맞추기 | Sound timing | 소리 맞추기 화면 열기 |
| `sound_late` | 화면 | 소리가 늦게 나요 | Sound is late | **소리 밀림 표지(어른용)**: 보호자 화면 소리 맞추기 줄 옆. 그림은 `look_ball`과 같은 눈 + 공 표지(art) |
| `settings_language` | 화면 | 언어 | Language | 언어 줄 |
| `lang_ko` | 화면 | 한국어 | 한국어 | 언어 고르기(자기 이름 표기) |
| `lang_en` | 화면 | English | English | 언어 고르기(자기 이름 표기) |
| `settings_reset` | 화면 | 기록 지우기 | Reset progress | |
| `confirm_reset` | 화면 | 기록을 지울까요? | Erase all progress? | 확인 창 이름(`alertdialog`), 처음 초점은 취소 |
| `confirm_yes` | 화면 | 지우기 | Erase | |
| `confirm_no` | 화면 | 취소 | Cancel | |
| `sync_intro` | 어른 | 노래가 화면보다 늦게 들리면 '소리 맞추기'를 해 주세요. 어른이 소리에 맞춰 톡 치면 노래가 화면에 맞춰져요. 아이 기록과 레벨을 깰 수 있는지는 바뀌지 않아요. 아이가 치면 잘 맞지 않을 수 있어요. | If the music sounds later than the screen, use Sound timing. A grown-up taps along with the sound, and the music is lined up with the screen. This does not change your child's progress or whether a level can be cleared. It works best when a grown-up does the tapping. | 소리 맞추기 줄 아래 설명 |
| `sync_screen` | ★ | 소리에 맞춰 톡 쳐요 | Tap along with the sound | 소리 맞추기 화면 이름·보조 글 |
| `sync_with_grownup` | ★ | 어른과 같이 해요 | Do this with a grown-up | 소리 맞추기 시작 때 |
| `sync_again` | ★ | 한 번 더 해요 | One more time | 두 번째 묶음 시작 |
| `sync_progress` | aria | 누른 횟수 | Taps so far | 점 줄(값은 `aria-valuenow`) |
| `sync_done` | ★ | 소리를 맞췄어요 | Sound is set | 끝 |
| `sync_kept` | ★ | 그대로 둘게요 | Kept as before | 측정을 버렸을 때 `aria-live`(실패 표시 없음) |
| `sync_redo` | aria | 다시 맞추기 | Redo timing | 다시 하기 버튼(레벨 `btn_retry`와 구분) |

- 소리 맞추기 건너뛰기 버튼은 7-6 `btn_skip`, 닫기·뒤로는 `btn_close`·`btn_back`.

### 7-8. 불러오기·오류·스토어 (4개)

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `loading` | ★ | 불러오는 중… | Loading… | 북 위 공이 천천히 튀는 그림과 함께(art). 빌드 스크립트가 `index.html`에 넣음 |
| `load_error` | ★ | 다시 해 주세요 | Please try again | ↻ 버튼(`btn_retry`)의 설명 |
| `load_error_detail` | 어른 | 게임을 불러오지 못했어요. 인터넷 연결을 확인한 뒤 다시 눌러 주세요. | The game couldn't load. Check your internet connection, then tap to try again. | 오류 화면 작은 글(어른용) |
| `store_short` | 스토어 | 떨어지는 공을 톡 쳐서 다시 높이! 높이 뜨면 오래, 낮게 뜨면 금방 내려와요. 손가락 하나 공놀이. | Tap the falling ball back up high! High bounce, long wait. One-finger ball fun. | 스토어 짧은 설명(80자 이내). rhythm-01 문장 틀("○○ 공이 △에 닿을 때 톡! … 아주 쉬운 ○○ 놀이")을 쓰지 않음 |

**합계: 3 + 20 + 9 + 9 + 4 + 11 + 21 + 4 = 81개** (`strings.json`의 `_meta` 제외, 7-9 검사로 확인).

**1-1 → 1-2 키 변화**: 삭제 4(`card_fast`·`levelcard_best`·`settings_music`·`settings_sfx`), 추가 6(`card_three`·`aria_best`·`hold_progress`·`settings_language`·`lang_ko`·`lang_en`). 79 − 4 + 6 = 81.

**키를 두지 않은 것(그림으로 대신)**
- **실패·재시작 안내 문구 없음.** 실패 → 약 1.1 s 뒤 결과·확인 버튼 없이 자동 재시작. 매 실패 토스트도 없습니다. 첫 실패에만 ↻ 그림 안내를 짧게(글 없음, 키 없음, art).
- **연습 모드 체크포인트 버튼 문구 없음.** 체크포인트는 받침 쉼 자리에 자동으로 찍히고 수동 버튼이 없습니다. 있는 것은 연습 모드 들어가기(`btn_practice`)와 표시(`practice_on`·`aria_checkpoint`)뿐입니다.
- **연습 최고 진행 막대 문구 없음**: 레벨 선택은 일반 모드 기록만 보임(결정 D14).
- 시도 횟수(점), 진행도·최고 기록(막대·점), 판정 등급, 레벨 잠김(자물쇠), 켜짐/꺼짐(토글), 화면 회전 안내, 받침 쉼("콩" 소리·까딱).

### 7-9. 문서 표 = `strings.json` 확인 (node)

검사 내용: ① 이 문서 7절 표의 키 행(첫 칸이 `` `키` ``)과 `strings.json` 키(`_meta` 제외)가 같은 집합 ② 키마다 KR·EN 글자 하나까지 같음 ③ 구분이 `어른`·`스토어`가 아닌 키는 한국어 12자 이내(공백 포함)·영어 6단어 이내 ④ `store_short`는 80자 이내 ⑤ 모든 문구에 rhythm-01 용어(별·궤도·북채·둥둥이·똑딱·Tickadrum·star·orbit·drumstick·tick)가 없음 ⑥ **카드 키(D1)**: `strings.json`의 `card_*` 키 집합 = `balance.json gimmicks.*.card` 집합(8개), `card_fast` 없음 ⑦ **rhythm-01 문구 겹침**: KR·EN 어느 쪽이든 `games/rhythm-01/data/strings.json`의 문구와 글자까지 같으면 실패. 단 8-2의 공통 UI 키 목록은 예외 ⑧ (참고, 실패로 세지 않음) 카드 그림 파일 `assets/cards/<키>.svg`·`<키>_portrait.svg` 있는 수 / 16 — art가 같은 단계에서 파일 이름을 바꾸는 중이라 참고로만 출력.

명령(`projects/rhythm-02/`에서 실행, node만):

```
node -e 'const fs=require("fs"),md=fs.readFileSync("10-lore.md","utf8"),js=JSON.parse(fs.readFileSync("strings.json","utf8"));delete js._meta;const bal=JSON.parse(fs.readFileSync("balance.json","utf8")),r1=JSON.parse(fs.readFileSync("../../games/rhythm-01/data/strings.json","utf8"));const sec=md.slice(md.indexOf("## 7."),md.indexOf("## 8.")),rows={},err=[];for(const l of sec.split(/\r?\n/)){const c=l.split("|").map(s=>s.trim()),m=/^`([a-z0-9_]+)`$/.exec(c[1]||"");if(!m)continue;if(rows[m[1]])err.push("dup "+m[1]);rows[m[1]]={kind:c[2],ko:c[3],en:c[4]}}const ban=/별|궤도|북채|둥둥이|똑딱|Tickadrum|\bstar\b|orbit|drumstick|\btick/i;const common=new Set("tap_to_start btn_next btn_retry btn_levels btn_pause btn_practice btn_close btn_back btn_sound_on btn_sound_off btn_skip levelcard_new levelcard_locked btn_card_replay practice_on pause_screen paused_background aria_progress aria_attempts aria_checkpoint settings_reset confirm_reset confirm_yes confirm_no guardian_hold sync_with_grownup sync_progress sync_kept sync_redo sound_late loading load_error".split(" "));const r1v=new Set([...Object.values(r1.ko),...Object.values(r1.en)]);for(const k of Object.keys(js))if(!rows[k])err.push("doc missing "+k);for(const [k,r] of Object.entries(rows)){const j=js[k];if(!j){err.push("json missing "+k);continue}if(r.ko!==j.ko)err.push("ko diff "+k);if(r.en!==j.en)err.push("en diff "+k);const free=["어른","스토어"].includes(r.kind);if(!free&&([...j.ko].length>12||j.en.split(/\s+/).length>6))err.push("len "+k);if(r.kind==="스토어"&&([...j.ko].length>80||j.en.length>80))err.push("store>80 "+k);if(ban.test(j.ko+" "+j.en))err.push("banned "+k);if(!common.has(k)&&(r1v.has(j.ko)||r1v.has(j.en)))err.push("r01 same "+k)}const bc=Object.entries(bal.gimmicks).filter(([g])=>!g.startsWith("_")).map(([,v])=>v.card).sort(),jc=Object.keys(js).filter(k=>k.startsWith("card_")).sort();if(bc.join()!==jc.join())err.push("card keys "+jc.join()+" vs balance "+bc.join());let f=0;for(const c of bc)for(const s of ["",".portrait"])if(fs.existsSync("assets/cards/"+c+(s?"_portrait":"")+".svg"))f++;console.log("doc",Object.keys(rows).length,"json",Object.keys(js).length,"cards",jc.length,"=balance",bc.length,"| card files",f+"/"+bc.length*2,"(참고)",err.length?"FAIL "+err.join(", "):"PASS")'
```

**검사 결과 (2026-11-17, 1-2 2차):**

```
doc 81 json 81 cards 8 =balance 8 | card files 0/16 (참고) PASS
```

- ①~⑦ PASS. ⑧ 카드 파일 0/16: 실행 시점 `assets/cards/`는 아직 1-1 이름(`card_B1`…`card_R1`, `card_G6` 포함)이라 새 이름 파일이 없음. art 수정(D1·D2) 끝난 뒤 다시 돌려 16/16 확인해야 함(11절 L4).
- 참고 수치: 한도 적용 키의 가장 긴 문구는 `tut_tap`·`card_bounce` 한국어 12자·영어 6단어(한도 딱 맞음). `store_short` KR 56자 / EN 79자.
- ⑦ rhythm-01과 글자까지 같은 문구는 32개 키이고 모두 8-2 공통 UI 예외 목록 안(게임 정체성 키 겹침 0). 1-1 판의 `tut_tap`(틀 같음)·`aria_play_area`(글자 같음)·`clear_title_1`(글자 같음)은 새 문장으로 바꿨습니다.
- ⑤ 금지어: 이 문서 8절·7-9 설명에는 rhythm-01 이름을 비교용으로 적지만, 검사는 `strings.json` 문구만 봅니다.

## 8. rhythm-01과의 구분 (오케스트레이터 지시)

두 게임은 "공이 어떤 자리에 닿을 때 톡"이라는 판정 순간이 닮아 보일 수 있습니다. 그래서 이름·화면 이름·레벨 이름·게임 정체성 문구에서 rhythm-01 용어와 문장 틀을 피하고, 이 게임만의 **"탭이 공을 쳐 올린다"(결정 D3)**와 **세로 튐 감각("높이 뜨면 오래 걸린다")**을 앞에 세웠습니다.

### 8-1. 구분 표

| 축 | rhythm-01(Tickadrum) | 이 게임 | 이유 |
|---|---|---|---|
| **탭의 결과** | 탭은 별을 침. 공의 경로에는 영향 없음(공은 계속 돎) | **탭이 공을 쳐 올림.** 안 치면 공이 떨어지고, 다음 높이 = 다음 박까지 남은 시간(결정 D3) | 규칙의 가장 큰 차이. 판정 문구(`tut_tap`·`card_bounce`·`aria_play_area`·`store_short`)가 모두 이 인과를 말함 |
| 판정 표식 | 별, 속 빈 별/꽉 찬 별, 소리별 (star) | **쓰지 않음.** 치는 자리는 "북에 닿을 때" | 판정 표식이 없고 공 자체가 신호 |
| 움직임 | 궤도, 동그라미, 빙글 (orbit, circle) | **쓰지 않음.** "높이·낮게·통통·둥실·쳐 올려" | 회전 없음, 세로 튐 |
| 시범·차례 | 북채, 둥둥이, 차례, 보고 따라 (drumstick, Dumdum) | **쓰지 않음.** 시범·차례 신호 없음 | 콜앤리스폰스 안 씀 |
| 시작 전 소리 | 카운트인 "똑딱" 4번 (똑딱, 북시계, 똑딱북, tick) | **받침 쉼 "콩"**(쉼 박 소리: 공이 까딱일 때 나는 낮은 소리, `rest_a`/`rest_b`, 합성은 art). 기획 문서에서도 "똑딱"이라 부르지 않음 | 결정 D7. 이름·소리 구조가 겹치지 않게 |
| 보정 | 박자 맞추기 (Beat timing) | **소리 맞추기 (Sound timing)** | 같은 기능이라도 이름을 달리함 |
| 등급 | 작은 북 1~3개 | **등급 구름, 늘 3칸**(빈 칸 점선, 결정 D12) | 등급 모양도 다르게 |
| 레벨 이름 | 아침 마당·꽃밭·비 오는 창가·바닷가·숲속 길·노을 언덕·등불 골목·지붕 위·구름 위·달 | 잔디밭~하늘 꼭대기(4절). "마당·숲·노을·지붕·구름 위·달" 낱말 안 씀 | "하루 흐름" 대신 "땅에서 하늘로" |
| 판정 순간 문구 | "별에 닿으면 톡!", "빙글 도는 공이 별에 닿을 때 톡! … 아주 쉬운 리듬 놀이.", "화면을 톡 쳐요" | "공이 북에 닿으면 톡!", "떨어지는 공을 톡 쳐서 다시 높이! …", "공을 톡 쳐 올려요" | rhythm-01에서 공은 북에 닿지 않으므로 "북에 닿는다·쳐 올린다"가 우리만의 말(결정 D8) |
| 클리어 첫 문구 | 잘했어요! | 높이 올랐어요! | 게임 정체성 문구는 다르게(결정 D8) |
| 대표 그림 카드 문구 | "북채 보고 별에 톡", "네 번 연달아 톡" 등 | "톡 치면 공이 올라가요", "톡톡톡톡 네 번" 등 | 7-9 ⑦이 글자 겹침을 자동 검사 |
| (runner-01) | 구름 사다리·빗방울 계단·비눗방울 언덕 등 | 쓰지 않음 | runner-01 레벨 이름과도 겹치지 않게 |

### 8-2. 공통 UI 문구 재사용은 의도 (결정 D8, 1-1 "문구 재사용 없음"을 바로잡음)

- 1-1 판의 "문구 재사용 없음"은 사실과 달랐습니다(lore 교차 리뷰 이슈 12: 한국어 12개가 rhythm-01과 글자까지 같음).
- **시스템 UI 문구는 허브 공통 UX로 일부러 같게 둡니다.** 두 게임을 오가는 아이·보호자에게 같은 버튼·화면은 같은 말이 낫습니다. 예외 목록(7-9 ⑦ `common`): `tap_to_start` `btn_next` `btn_retry` `btn_levels` `btn_pause` `btn_practice` `btn_close` `btn_back` `btn_sound_on` `btn_sound_off` `btn_skip` `levelcard_new` `levelcard_locked` `btn_card_replay` `practice_on` `pause_screen` `paused_background` `aria_progress` `aria_attempts` `aria_checkpoint` `settings_reset` `confirm_reset` `confirm_yes` `confirm_no` `guardian_hold` `sync_with_grownup` `sync_progress` `sync_kept` `sync_redo` `sound_late` `loading` `load_error` (32개, 모두 메뉴·확인·보정 흐름·불러오기).
- **게임 정체성 문구**(타이틀, 레벨 이름, 튜토리얼·카드, 플레이 화면 이름, 클리어, 등급, 최고 기록, 밀림 표지 `look_ball`, 스토어)는 예외 없이 rhythm-01과 글자까지 같으면 안 되고, 7-9 ⑦이 자동으로 막습니다.
- 그대로 남긴 말과 이유: **북(drum)** — 1-0 코어 정의의 받침이고, 아이에게 "치면 소리 나는 것"으로 가장 바로 읽힙니다. 다만 **이름에 drum·북을 넣지 않았고**, 캐릭터(둥둥이)처럼 이름·성격을 주지 않습니다. **통·톡·콩**은 놀이 일반 의성어입니다. **깃발(연습)·↻(다시)·자물쇠**는 공통 UX 패턴이라 유지(그림은 art가 rhythm-01 모양을 피해 새로 그림, 결정 D11). 판정 이름 "딱/좋아/통과"는 화면에 나오지 않는 내부 이름이라 1-0대로 둡니다.
- 7-9 검사 ⑤가 금지어를, ⑦이 문구 겹침을 자동으로 봅니다.

## 9. 1-2 교차 리뷰 안건 처리 결과

| # | 상대 | 안건 | 1-2 결정·처리 |
|---|---|---|---|
| A1 | art·balance | 레벨 테마 키 이름 | `level01`~`level10`, 세 문서 같음(완료) |
| A2 | art | 카드 그림 = 실제 첫 등장 색·모양, 카드 속 공 ≥ 16 px | art 8-1 렌더 검사, 그림 힌트를 art 그림 언어로 바꿈(7-3) |
| A3 | art·balance | 카드 키 | **결정 D1**: 원본 `balance.json gimmicks.<id>.card` 8개. `card_fast` 삭제(D2), `card_three` 추가. 7-9 ⑥ 검사 |
| A4 | art·balance | 클리어 등급 모양 | 등급 구름, **늘 3칸**(D12) |
| A5 | art | "구름" 다의 | 실패 먼지 없음(art). 문서는 "플레이 구름/등급 구름"으로 나눔. L3 레벨 카드 = 큰 구름 1개 + 반쯤 숨은 공(D12) |
| A6 | art | 배경 실루엣 금지 모양 | art 3-1에 반영됨(완료) |
| A7 | balance | 기믹 순서·L1 손가락·밀림 표지 | L7 = R1 세 박 통, G7 새 기믹으로 셈, G6 미사용. 손가락 = balance `fingerSchedule().gone`(D4). 표지 = `look_ball`(레벨 선택)·`sound_late`(보호자 화면)(D11) |
| A8 | balance·art | 보호자 진입 | **결정 D11**: 설정 길게 누르기(채워지는 표시) → 보호자 화면. `guardian_hold`·`hold_progress` 사용 |
| A9 | art | L10 결과 버튼 2개, 소리 켜기/끄기 자리 | 버튼 2개 합의. 소리 켜기/끄기 = 멈춤 메뉴(D11) |
| A10 | 오케스트레이터 | 게임 이름 확정 | 가안 유지, 이름 짜임 메모와 함께 요청자에게(D15, 1-1) |

## 10. 스토어 문구 초안

### 짧은 설명 (80자 이내, `store_short`)
- KR: 떨어지는 공을 톡 쳐서 다시 높이! 높이 뜨면 오래, 낮게 뜨면 금방 내려와요. 손가락 하나 공놀이.
- EN: Tap the falling ball back up high! High bounce, long wait. One-finger ball fun.

### 긴 설명 (초안, 키 아님)

**KR**

작은 놀이터에 북 하나, 공 하나. 공이 북에 닿는 순간 톡 치면 "통!" 하고 다시 튀어 올라요. 치지 않으면 공이 떨어져요. 높이 뜨면 오래 걸려 내려오고, 낮게 뜨면 금방 내려와요.

- 손가락 하나, 탭 하나.
- 내가 쳐야 공이 올라가요. 공을 보고 치면 돼요. 소리가 조금 늦게 들려도 괜찮아요.
- 내가 친 북소리가 노래를 채워요.
- 떨어뜨려도 괜찮아요. 바로 다시 시작해요.
- 잔디밭부터 하늘 꼭대기까지, 열 곳의 놀이터.
- 보호자를 위한 소리 맞추기 기능.

**EN**

One drum, one ball. Tap the moment the ball lands, and it bounces right back up. Miss it, and the ball drops. A high bounce takes longer to come down; a low bounce comes back fast.

- One finger. One tap.
- Your tap sends the ball up. Just watch the ball; a little sound delay is no problem.
- Every tap adds your drum to the song.
- Dropped it? No worries. You're right back in.
- Ten playgrounds, from a grassy lawn to the top of the sky.
- Sound timing for grown-ups.

- 광고·결제 관련 문구는 수익화 단계 전이라 넣지 않았습니다.

## 11. 남은 위험

| # | 위험 | 심각도 | 이 문서의 처리 |
|---|---|---|---|
| K1 | 짧아지는 통 첫 만남 실패 | major | 카드 `card_double`·`card_roll` 그림에 "큰 통 뒤 낮게" + 누름 표시 개수. 수치는 balance |
| K2 | 봇이 높이 읽기 부담 모름 | major | 문구 영향 없음(balance) |
| K3 | 소리 따라 치는 아이는 블루투스에서 늦음 | major | `look_ball`(아이, 레벨 선택)·`sound_late`(어른, 보호자 화면) 표지, `guardian_intro`·`sync_intro`로 "공을 보고 치면 된다"를 보호자에게 알림. 감지 조건은 balance `drift_check` |
| K6 | 공 튀기기 장르 게임과 닮아 보임 | minor | 이름 충돌 확인(1절), 8절 용어 구분, 캐릭터·얼굴 없음 |
| K7 | 진행감 약함 | minor | 레벨 이름 "땅에서 하늘로" 순서, 클리어 "높이 올랐어요!"·"구름까지 갔어요!" |
| K9 | 구름에 숨는 동안 박 놓침 | minor | `card_cloud` 그림에 그림자 작게 → 크게 |
| L1 | 게임 이름 미확정 + 이름 짜임이 rhythm-01과 같음 | minor | 가안 유지, 1-1 메모를 요청자 확정 때 함께(D15). 바뀌면 `title`·`store_short`·10절만 고침 |
| L2 | "구름" 낱말 과다 | minor | 플레이 구름/등급 구름으로 구분, L3 카드 그림 변경(D12, art) |
| L3 | 영어 레벨 이름 "Top of the Sky"와 `clear_last` "Top of the sky!"가 비슷 | minor | 의도(마지막 레벨 이름을 클리어에서 되부름) |
| L4 | 카드 그림 파일 이름이 art 작업 중 | minor | 7-9 ⑧이 파일 수를 참고로 출력. art 수정 끝난 뒤 다시 돌려 16/16 확인 |
| L5 | `drift_check`·`guardian_gate`·`calibration` 블록이 balance 작업 중 | minor | 문구에 숫자 없음. 블록 이름만 참조 |
