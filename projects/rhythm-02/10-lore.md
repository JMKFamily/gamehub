# 10. 세계관: Tossaloft (높이통통) — 가안

- 작성: 2026-11-17, lore-writer, 단계 1-1 / 1-2 2차 수정(D1~D16) / **round-2 수정: 2026-11-17** (요청자 피드백 "몰입감" 재설계 R2-A "흘러오는 길" + 전 프로젝트 콤보 지시 + round-1 lore 이슈. 처리표는 `Docs/lore-writer/2026-11-17-r2-lore-redesign.md`)
- 입력: `00-benchmark.md` 14절(R2-A, 기믹 어휘 W0~W7, 14-5 S6~S10, 14-8 콤보, 14-9 lore 몫), `Docs/orchestrator/2026-11-17-r2-immersion-kickoff.md`(D-R2-1~6), `reviews/round-1/score.md`(N15~N21)·`reviews/round-1/lore-writer.md`(이슈 1~8), `harness/benchmarks/djmax-judgement.md`(4절·5-3절), `harness/criteria.md`(세계관·텍스트·대상 연령·원본 보호), `harness/insights.md`
- 참고(읽기만): `games/rhythm-01/data/strings.json`·`games/reverbound/data/strings.json`(문구·용어 겹침 검사), `30-art.md`·`20-balance.md`·`DEV_NOTES.md`(1-2 맞출 것 확인용)
- 원본 보호: 상용 게임(레퍼런스 러너 게임, DJMAX 계열)의 이름·캐릭터·설정·판정 문구를 쓰지 않았습니다. runner-01(Reverbound)·rhythm-01(Tickadrum) 이름·레벨 이름·게임 정체성 문구도 가져오지 않았습니다(8절). 아래 이름·문구는 모두 새로 만든 것이고, 시스템 UI 문구 일부만 허브 공통 UX로 일부러 같게 둡니다(8-3).
- 소유권: **수치(BPM·판정 창·시간·접촉 수·앞쪽 보이는 박·콤보 단계 값)는 `20-balance.md`·`balance.json`·`levels/*.json`**, 색·모양·실루엣·연출·소리·아이콘은 `30-art.md`가 기준입니다. 이 문서는 숫자를 정하지 않습니다.
- **텍스트 원본은 `strings.json`입니다.** 빌드는 이 문서를 파싱하지 않고 `strings.json`만 읽습니다. 7절 표와 JSON이 같은지는 7-9 node 검사로 확인합니다.
- **카드 키 원본은 `balance.json gimmicks.<id>.card`입니다**(결정 D1). round-2에서 lore가 제안한 8개(7-3)를 balance가 W0~W7에 붙이면 이 문서·`strings.json`·`assets/cards/<키>.svg`가 같아집니다(1-2 확인 항목).

## 확정값 표 (round-2)

| 항목 | 값 | 쓰는 곳 | 비고 |
|---|---|---|---|
| 게임 이름 (영문 / 한국어) | **Tossaloft / 높이통통** (가안) | 타이틀, 스토어 | **요청자 확정 필요**(1절). round-2 "여행" 세계관과도 맞음(1-2) |
| **승패 한 문장 (짧은 판)** | **"표시가 북에 오면 톡! 지붕 밑에선 쉬기. 놓치면 다시."** | 세 기획 문서·00-benchmark 공통 | round-1 "공이 북에 닿을 때 톡! 놓치면 다시."를 바꿈. 화면 글 키 아님 |
| 승패 한 문장 (설명판) | "길의 표시가 북에 올 때 톡 치면 공이 다시 올라가요. 지붕 밑에서는 치지 않고 공과 같이 쉬어요. 공이 떨어지거나 지붕에 부딪히면 다시 해요." | 보호자 글(`guardian_intro`)·스토어 긴 설명 | 2절 |
| 핵심 규칙 | **탭이 공을 올린다**(결정 D3 그대로) + **지붕 밑에서는 치지 않는다**(반대 행동 하나) | 2절·8절·스토어 | 14-3 |
| 세계관 | 아주 얇음. **공과 북이 함께 길을 따라 여행한다**(길·물체가 오른쪽에서 흘러옴 = 앞으로 감) | 전체 | 2절. 캐릭터 이름·얼굴 없음 |
| 화면에 쓰는 모양 이름 | **공·북·그림자·길·표시·구름·지붕·가지·긴 가지·큰 언덕** | 튜토리얼·카드·대체 글 | 3절. art 실루엣 이름과 1-2에서 맞춤 |
| 레벨 수 / `theme_id` | 10 / `level01` ~ `level10` | 레벨 JSON, 팔레트 키 | 4절. L5·L6 이름을 바꿈 |
| 카드 키 (제안) | 8개: `card_bounce`(W0) `card_big`(W1) `card_cloud`(W2) `card_dot`(W3) **`card_roof`(W4, 새)** `card_double`(W5) `card_three`(W6) `card_roll`(W7). `card_twoballs`는 **예비**(G5 내림, D-R2-1) | strings·카드 파일·레벨 `card.id` | 원본은 balance(D1). 1-2에서 balance 확정 |
| 플레이 중 문구 | 한 문장, **한국어 12자 이내(공백 포함) / 영어 6단어 이내** | 어른·스토어를 뺀 **모든 키**(예비 포함) | criteria, 7-9 자동 검사 |
| 대체 글 | 숫자·값을 이어 붙이지 않음. 값은 `aria-valuenow`. **확인은 접근성 트리**(6절 4·11) | 빌드 전체 | round-1 이슈 3·6, criteria |
| 콤보 | **글·숫자 없음**(점 10칸 + 큰 표지, art). 대체 글 `aria_combo`(meter 이름, 값은 `aria-valuenow`), 최고 콤보 `aria_best_combo`(선택) | HUD·레벨 카드 | 5절·7-4. `aria-live` 없음 |
| 텍스트 키 수 | **84개** (`_meta` 제외, 81 + `card_roof`·`aria_combo`·`aria_best_combo`) | `strings.json` | 7-9 검사 PASS |
| 실패·재시작 문구 | **없음** (자동 재시작 1.1 s, 첫 실패만 ↻ 그림) | 플레이 | 지붕 부딪힘도 글 없음 |

---

## 1. 게임 이름 (요청자 확정 필요)

이름에 **세로로 튀어 오르는 감각**("높이 뜬다", "통통")을 담고, rhythm-01 이름 계열(tick·drum·북)과 runner-01(reverb·bound)을 피했습니다.

| 후보 | 한국어 | 뜻 | 충돌 확인 (1-1, 2026-11-17 웹 검색, 이름 비교 용도만) | 판정 |
|---|---|---|---|---|
| **Tossaloft** | **높이통통** | toss(톡 던져 올림) + aloft(높이, 공중에) | 정확 일치하는 게임·앱 없음. 한국어 정확 일치 없음 | **추천** |
| Bouncloud | 통통구름 | bounce + cloud | 정확 일치 없음, 다만 "Bouncy Cloud"·"Bouncify"와 헷갈림 | 탈락 |
| Skybop | 하늘통 | sky + bop | 같은 이름 브라우저 게임 있음(장르도 가까움) | 탈락(충돌) |

- 한계: 웹 검색 기준. 앱스토어·상표 검색은 출시 단계 전 오케스트레이터.
- **이름 짜임 메모(결정 D15)**: Tossaloft = toss + a + loft, Tickadrum = tick + a + drum — 둘 다 T로 시작하는 "동사 + a + 낱말" 조어라 허브에서 시리즈처럼 보일 수 있음. 요청자에게 ① 그대로 ② a가 끼지 않는 대체 후보 중 고르게 함(가안 유지).
- **round-2 메모(14-9 lore 3)**: "흘러오는 길"로 바뀌어도 이름은 그대로 맞습니다. 탭 = 공을 높이 통통 올림은 바뀌지 않았고, 길을 여행하는 것은 세계관 바탕일 뿐 이름에 넣을 핵심 감각(높이 = 기다림)이 아닙니다. 이름에 "길·달리기·대시" 계열을 넣으면 runner-01과 가까워지므로 넣지 않습니다. 바뀌면 `title`·`store_short`·10절만 고칩니다.

## 2. 세계관과 톤 (아주 얇게) — round-2 "함께 가는 여행"

**북 하나와 공 하나가 함께 길을 따라 여행합니다.** 북은 길 위를 미끄러지듯 앞으로 가고(화면에서는 북이 제자리이고 길이 오른쪽에서 다가옴), 공은 북 위에서 통통 튑니다. 길 위에는 작은 **표시**가 점점이 놓여 있어서, 표시가 북에 오는 순간 아이가 톡 치면 공이 "통!" 하고 다시 올라갑니다. 표시가 멀리 떨어져 있으면 공을 높이 띄워 오래 기다리고, 촘촘하면 낮게 톡톡. 가다 보면 **구름**이 내려와 공이 잠깐 숨기도 하고, 낮은 **가지** 밑을 지나면 톡톡 빠르게, **큰 언덕**을 넘을 때는 아주 높이 떠서 셋을 세고, 마을의 **지붕** 밑을 지날 때는 공이 북 위에 앉아 **같이 쉽니다**. 노래 끝까지 공을 떨어뜨리지 않으면 공이 한 번 크게 튀고 다음 길로 갑니다. 잔디밭에서 출발해 하늘 꼭대기까지 열 곳입니다.

- **승패 한 문장**: 짧은 판 **"표시가 북에 오면 톡! 지붕 밑에선 쉬기. 놓치면 다시."** / 설명판은 확정값 표.
- **탭의 결과(결정 D3 유지)**: 탭이 공을 올립니다. 높이 = 다음 접촉까지 시간 = 다음 표시까지 거리. 모든 문구는 "내가 쳐야 공이 올라간다"로 씁니다.
- **지붕 = 쉬는 곳(반대 행동을 겁주지 않게)**: 지붕을 "위험·조심·치지 마"로 부르지 않습니다. 지붕 밑은 공이 앉아 **쉬는 곳**이고, 받침 쉼(B0, 공이 앉아 까딱 "콩")과 같은 "쉼"의 말로 묶습니다. 지붕이 지나가면 게임이 공을 다시 올려 줍니다(자동 토스). 부딪힘 실패도 다른 실패처럼 글·경고 없이 짧고 부드럽게(art).
- **톤 키워드**: 통통 / 둥실 / 함께 가기 / 높이·낮게 / 쉬어 가기 / 떨어져도 "괜찮아, 다시".
- **캐릭터·이름·얼굴 없음.** 공은 그냥 공, 북은 그냥 북(약한 아트 컨셉). **달리는 캐릭터가 아닙니다**: 다리·발·바퀴·발자국을 그리지 않고, 화면 글에 "달려·뛰어·점프"를 쓰지 않습니다(8-2). 앞으로 가는 느낌은 길이 흘러오는 것만으로.
- 핵심 감각 한 줄: **"멀리 있는 표시 = 높이 = 기다림"**.
- "구름"은 문서에서 **길 구름**(흘러오는 물체 W2, 공이 숨음)과 **등급 구름**(결과·레벨 카드의 작은 구름 3칸)으로 나눠 부릅니다. round-1의 화면 위 고정 "플레이 구름"은 없어짐(14-6).

## 3. 화면에 보이는 모양 이름

화면 이름은 아이가 그림을 보고 바로 부를 수 있는 낱말만 씁니다. 모양·색은 `30-art.md`가 기준이고, **튜토리얼 그림은 바로 뒤에 처음 만나는 실제 물체와 같은 색·모양**이어야 합니다(criteria). **이름 = 모양**이 되도록 art 실루엣 이름과 1-2에서 맞춥니다(표 마지막 칸).

| 요소 | 화면 이름 (KR / EN) | 보이는 모양 (art 확정) | 아이가 그림으로 알아야 하는 것 | art와 맞출 것 |
|---|---|---|---|---|
| 판정 대상 | **공 / ball** | 원 1개(북 위에서 위아래로만 튐) | 표시가 북에 올 때 톡 쳐야 다시 올라감 | 그대로 |
| 받침 | **북 / drum** | 화면 왼쪽(0.30 W) 아래 납작한 둥근 사각형. 탭하면 톡 올라감 | 누르면 북이 공을 쳐 올림 | x 위치만 바뀜 |
| 공의 보조 신호 | **그림자 / shadow** | 북 위 타원. 공이 높을수록 작음 | 공이 구름에 숨어도 곧 내려옴 | 그대로 |
| 바닥 | **길 / path** | 오른쪽에서 흘러오는 바닥 띠 | 길이 다가온다 = 앞으로 간다 | 이름 "길" |
| W0 박 표시 | **표시 / mark** | 길 위 작은 표시(접촉마다 하나). **음표·노트 막대·공과 같은 원 금지**(K11) | 표시가 북에 오면 톡. 멀면 오래, 촘촘하면 빨리 | **모양 이름이 "표시"로 불릴 수 있는지**(예: 작은 꽃·조약돌·깃 같은 구체 모양이면 그 이름으로 바꿀지) |
| W2 | **구름 / cloud** (길 구름) | 흘러와 공을 잠깐 가리는 둥근 구름 | 공이 숨었다 내려옴, 다음 표시는 멀리 | 등급 구름과 크기·자리 다름 |
| W4 | **지붕 / roof** | 북 위를 덮는 낮은 지붕(부드러운 모양, 가시·네모 블록 금지) | 지붕 밑에선 공이 앉아 쉼 = 치지 않음 | 실루엣이 "지붕"으로 읽히는지(다리·처마로 그리면 이름도 바꿈) |
| W5 | **가지 / branch** | 위에서 낮게 걸린 짧은 나뭇가지 | 가지 밑에선 톡톡 두 번 | 긴 가지와 길이가 눈에 띄게 다름 |
| W6 | **큰 언덕 / big hill** | 길이 크게 솟은 둥근 언덕 | 아주 높이 떠서 셋 세고 톡 | 배경 언덕 실루엣(L7)과 헷갈리지 않게 |
| W7 | **긴 가지 / long branch** | 가지보다 훨씬 긴 가지 | 긴 가지 밑에선 톡톡톡톡 | 가지와 결과가 같은 종류(빨리 치기)라 길이로만 구분 |
| 진행도 막대 | (글 없음, `aria_progress`) | 화면 위 HUD 띠 | 찰수록 끝에 가까움 | 그대로 |
| 최고 기록 점 | (글 없음, `aria_best`) | 막대 위 공 색 점 | 지난번 여기까지 | 그대로 |
| 시도 횟수 | (점, `aria_attempts`) | art | | 그대로 |
| **콤보** | (글·숫자 없음, `aria_combo`) | HUD 띠 안 점 10칸 + 10마다 큰 표지(14-8) | 이어서 잘할수록 점이 참 | 공 색·바탕 단계 색과 다른 모양 |
| 연습 체크포인트 | **깃발 / flag** | art | 연습에서 여기부터 다시 | 그대로 |
| 클리어 등급 | **등급 구름, 늘 3칸** | 받은 만큼 채움, 빈 칸 점선(D12) | 채운 칸이 많을수록 잘함 | 그대로 |

기믹 이름은 **기획 문서·카드 쪽에서만** 쓰고 플레이 중 화면 글로 띄우지 않습니다. 기획 문서에서는 늘 id와 같이 씁니다("지붕(W4)").

| id (14-3) | 기획 이름 | 아이 말(카드 문구 쪽) | 카드 키 (제안, 7-3) | 레벨 | round-1 대응 |
|---|---|---|---|---|---|
| W0 | 흐르는 길 + 박 표시 + 받침 쉼 | 표시가 북에 오면 톡 | `card_bounce` | L1 | B0·B1 |
| W1 | 넓은 간격(큰 통 2박) | 표시가 멀면 높이 떠요 | `card_big` | L2 | G1 |
| W2 | 구름(구름 통 4박) | 구름에 숨었다 내려와 | `card_cloud` | L3 | G2 |
| W3 | 엇간격(점 통 1.5·1.5·1) | 길게 길게 짧게 | `card_dot` | L4 | G3 |
| W4 | **지붕(쉬는 곳, nogo)** | 지붕 밑에선 쉬어요 | **`card_roof`** (새) | L5 | 새 기믹 |
| W5 | 가지(통통 0.5 짝) | 가지 밑에선 톡톡 | `card_double` | L6 | G4 |
| W6 | 큰 언덕(세 박 통 3박) | 큰 언덕은 셋 세고 톡 | `card_three` | L7 | R1 |
| W7 | 긴 가지(드르륵 0.5 × 4) | 긴 가지 밑엔 톡톡톡톡 | `card_roll` | L8 | G7 |
| G5 | 두 공 | (예비) 공 두 개가 번갈아 | `card_twoballs` **예비** | 없음 | D-R2-1 내림. balance가 되살리면 L9 이후 지붕 없는 구절 |
| G6 | 빠른 곡 구간 | — | 미사용(D2), 키 없음 | — | |

- 카드 키는 기능이 같은 round-1 키를 그대로 두고(파일·레벨 JSON 바꿈 최소) 지붕만 새 키를 더했습니다. 키 이름이 기믹 이름과 조금 어긋나는 곳(`card_double` = 가지, `card_three` = 큰 언덕)은 키가 내부 이름이라 화면에 영향이 없습니다. balance가 키를 새로 짓겠다면(`card_branch` 등) 1-2에서 따르고 strings 키만 바꿉니다.

## 4. 레벨 테마 (10개) — 여행 길 순서

공통 규칙:
- **이름 체계**: 5~6세가 그림으로 그릴 수 있는 장소 하나. **잔디밭에서 출발해 길을 따라 마을·웅덩이·언덕·나무를 지나 하늘 꼭대기까지 가는 여행 순서**(round-1 "땅에서 하늘로"를 길 여행으로 이음).
- 이름의 낱말은 그 레벨의 새 물체를 떠올리게 합니다(마을 = 지붕(W4), 웅덩이 = 낮은 가지 밑 찰방찰방(W5), 바람개비 언덕 = 큰 언덕(W6), 딱따구리 나무 = 긴 가지 톡톡톡톡(W7)).
- **round-1에서 바뀐 이름 2개**: L5 물웅덩이 → **작은 마을**(지붕이 처음 나오는 곳), L6 시소 → **물웅덩이**(두 공이 예비로 내려가 시소 "번갈아"의 이유가 사라짐. "낮게 찰방찰방 두 번"이 W5 통통과 맞아 round-1 L5 이름을 옮김). 나머지 8개는 그대로라 카드·팔레트 변경이 적습니다.
- **배경 실루엣은 기본 도형 몇 개**(art). round-2에서 배경도 흘러간다면 **그 레벨의 위험 물체(지붕·가지·언덕)와 닮은 모양을 배경에 쓰지 않습니다**(배경 지붕을 보고 참는 오해 방지, 신호 수). 공 크기 원, 줄지어 떨어지는 도형도 계속 금지.
- 공·북·그림자·표시·물체 모양은 10레벨 내내 같습니다. 수치는 적지 않습니다.

| 레벨 | 이름 (KR / EN) | 새 물체 (14-3) | 분위기 한 줄 | 분위기 키워드 | 시각 힌트 (art) | 기믹 힌트 (balance) |
|---|---|---|---|---|---|---|
| 1 | **잔디밭 / Grassy Lawn** | 길·표시·받침 쉼(W0) | 풀밭 길로 출발, 표시가 올 때마다 톡, 통! | 출발, 느긋, 따뜻함 | 낮은 풀밭 띠, 위험 물체 없음 | 고른 간격. 손가락 L1 첫 접촉 1회. 구절마다 접촉 수·쉼 길이 다르게(14-3) |
| 2 | **모래놀이터 / Sandbox** | 넓은 간격(W1) | 모래 위 표시가 멀리 떨어져 있으면 높이 쿵 | 길게·짧게, 장난 | 모래 더미(반원)·작은 세모 | 표시가 멀면 높이(2박) |
| 3 | **솜구름 하늘 / Puffy Sky** | 구름(W2) | 길 위로 내려온 구름 속에 공이 숨었다 내려옴 | 둥실, 기다림 | 배경은 비우고 길 구름이 주인공. 레벨 카드 = 큰 구름 1개 + 반쯤 숨은 공(D12) | 숨는 시간 ≤ 1 s(K9) |
| 4 | **그네 터 / Swing Park** | 엇간격(W3) | 그네가 흔들리듯 길게, 길게, 짧게 | 흔들흔들, 엇박 | 그네 틀 | 1.5·1.5·1 묶음 |
| 5 | **작은 마을 / Little Village** (새) | **지붕(W4)** | 마을 지붕 밑을 지날 때는 공과 같이 쉬어 가요 | 포근함, 쉬어 가기, 조용 | 배경 집은 **지붕 물체와 다른 모양**(예: 창문 네모만, 또는 굴뚝)·멀리 작게. 지붕 물체만 북 위를 덮음 | 첫 지붕 2개는 안전한 첫 등장(14-5), 손가락 없음(S8) |
| 6 | **물웅덩이 / Puddle Splash** (L5에서 옮김) | 가지(W5) | 웅덩이 위 낮은 가지 밑에서 찰방찰방 톡톡 | 찰방, 빠른 짝 | 납작한 타원 웅덩이(비 없음). 가지 물체와 다른 배경 | 넓은 간격 뒤 짝으로 |
| 7 | **바람개비 언덕 / Pinwheel Rise** | 큰 언덕(W6) | 바람 타고 큰 언덕을 넘으며 하나, 둘, 셋 | 바람, 높이, 셋 세기 | 바람개비(정지). 배경 언덕은 큰 언덕 물체보다 낮고 멀리(헷갈림 방지) | 3박 |
| 8 | **딱따구리 나무 / Woodpecker Tree** | 긴 가지(W7) | 긴 가지 밑에서 나무를 두드리듯 톡톡톡톡 | 두드림, 빠른 손 | 나무 기둥 + 잎. 새 얼굴 없음 | 반박 4연속 |
| 9 | **연 날리는 날 / Kite Day** | 없음(조합) | 바람 부는 들길, 지금까지 만난 것이 섞여 와요 | 높이, 자신감, 복습 | 마름모 연 + 줄(원 안 씀) | 조합, 지붕 길이 변형 |
| 10 | **하늘 꼭대기 / Top of the Sky** | 없음(조합) | 길 끝 꼭대기, 마지막은 잔디밭 첫 톡으로 돌아옴 | 꼭대기, 마무리, 반가움 | 햇살 금빛 바탕, 구석 큰 해(공과 다른 크기·자리) | 조합, 끝 4접촉 1박(L1 되부름) |

- 끝 장면(공통): 클리어 때 공이 한 번 크게 튀고 바탕이 밝아진 뒤 등급 구름 3칸(art 7-3, 시간축 balance D10). 번쩍임·흔들림 없음. round-1 "구름 속으로"는 고정 구름이 없어져 art 결정에 따름 → `clear_title_2`를 구름과 무관한 "멀리 왔어요!"로 바꿈(7-5).

## 5. 글 없이 보여 줄 반응 (문구 없음)

- **실패**: 글·토스트 없음. 늦음 = 공이 북 옆으로 떨어짐, 일찍 = 헛스윙 뒤 떨어짐(D9), **지붕 부딪힘 = 공이 지붕에 살짝 닿고 내려와 떨어짐**(art, 아이 탭보다 작은 부드러운 소리). 무섭거나 아픈 느낌(울음·폭발·빨간 번쩍임·흔들림·✕) 없음.
- **지붕 밑 참기 성공**: 글 없음. 공이 앉아 쉬는 모습 자체가 반응(S9: 그 박 ±1박 안 판정 이펙트·콤보 연출 시작 없음). 콤보는 +1(14-8) — 점이 차는 것은 S9 창이 끝난 뒤(balance·art).
- **판정 등급**: 화면 글 없음. 튐 선 2/1/0쌍 + 북 가죽 납작 정도(art 6절). 판정 이름 "딱/좋아/통과"는 기획 문서 안에서만.
- **콤보**: **화면 글·숫자 없음**(djmax 4-3). 점 10칸 + 10마다 큰 표지, 5·10·20 단계 연출·화음(art). 끊김은 소리 없이 조용히 작아짐(4-5). **콤보에 화면 문구 키를 두지 않습니다**: "콤보", "○ 연속", "잘했어!" 같은 글은 신호를 늘리고 글을 읽는 아이에게만 보상이 됩니다. 대체 글만 `aria_combo`(7-4).
- **새 기록**: 화면 글 없음. 최고 기록 점이 미끄러짐 + `best` 소리. `new_best`는 `aria-live` 알림만.
- **클리어**: `clear_title_n`(등급 n, N4 승인), 연습 클리어 `clear_title_1`, 레벨 10 `clear_last`. 등급 구름 늘 3칸. 버튼 다음/다시/레벨 고르기(L10은 2개).
- **받침 쉼**: 글 없음. 공이 앉아 까딱이며 "콩"(D7). 지붕 밑 쉼과 같은 "앉은 공" 모양이라 "쉼"이 한 가지 그림으로 읽힘.

## 6. 텍스트 규칙 (빌드·리뷰 공통)

1. **플레이 중 문구는 한 문장, 한국어 12자 이내(공백 포함) / 영어 6단어 이내.** 어른·스토어를 뺀 모든 키(예비 포함)에 같은 한도, 7-9 자동 검사.
2. **세계관 용어 대신 화면에 보이는 모양 이름**(3절 표: 공·북·길·표시·구름·지붕·가지·긴 가지·큰 언덕·깃발)만 씁니다. 기획 이름(점 통·통통·드르륵·nogo 등)은 화면 글에 쓰지 않습니다.
3. 한국어는 `word-break: keep-all`. 지원 언어마다 주요 화면 스크린샷으로 잘림 확인(QA).
4. **대체 글(aria)에 숫자·값을 이어 붙이지 않습니다.** 진행도·최고 기록·시도·**콤보·최고 콤보**·보정 횟수·길게 누르기는 `role="progressbar"`/`meter` + `aria-valuenow`(·min·max)로만, `aria-valuetext`도 만들지 않습니다. 키 두 개를 잇는 곳은 레벨 카드 한 곳뿐(`levelN_name` + 쉼표 + 상태 키, 7-2).
5. 플레이 중 `aria-live` 알림은 `new_best`·`sync_kept` 두 개만. **콤보 meter 값 바뀜은 알리지 않습니다**(live 아님, 낭독이 박자를 방해).
6. **튜토리얼 그림은 바로 뒤에 처음 만나는 물체의 실제 색·모양과 같아야 합니다.** 지붕 카드 지붕 = L5 첫 지붕, 가지 카드 가지 = L6 첫 가지. 카드 속 공 렌더 ≥ 16 px.
7. **글을 못 읽어도 플레이 가능**: 시작(▶·손가락), 레벨 선택(카드 그림), 튜토리얼(그림 카드·L1 손가락), 실패(그림), 클리어(등급 구름·그림 버튼), 멈춤 메뉴(그림 버튼), **불러오기 오류(↻ 그림, 아래 9)**. `notext` 화면에서 L1을 시작·클리어할 수 있어야 함(QA).
8. 치환 자리 없음. 화면 문구에 rhythm-01 용어(8-1)·runner-01 용어(8-2)를 쓰지 않음. 게임 정체성 문구는 두 게임과 글자까지 같으면 안 됨(7-9 ⑦).
9. **부트 단계(불러오기·오류 화면)는 JSON을 읽기 전이므로 빌드 스크립트가 `strings.json`에서 부트 키 5개(`title`·`loading`·`load_error`·`load_error_detail`·`btn_retry`)를 두 언어로 꺼내 `index.html` 부트 블록에 넣습니다.** 부트 코드는 언어를 정한 **직후** `document.documentElement.lang`과 `document.title`(= 그 언어 `title`)을 바꿉니다(`<html lang>`·`<title>` 고정값에 기대지 않음). **↻ 그림(`icon-retry.svg`)도 부트 블록에 인라인**으로 넣어 데이터 로드 실패와 무관하게 보이게 하고, 버튼 대체 글 = `btn_retry`, 설명 = `load_error`(round-1 N15·N16, criteria 세계관 rhythm-02 줄).
10. 언어는 `navigator.language`로 자동(ko면 ko, 그 밖 en). 보호자 화면에서만 바꿈. `lang_ko`·`lang_en`은 어느 화면에서도 자기 이름.
11. **대체 글은 접근성 트리로 확인합니다**(Playwright `ariaSnapshot()` 등). `aria-hidden` 요소에 붙인 `aria-label`은 없는 것과 같습니다. 화면별로 트리에 나와야 하는 것(QA·lore 리뷰 확인 목록):
    - 레벨 선택: 격자 이름 `levels_screen`, 카드 버튼 이름 = `levelN_name`(+ 상태 키), 최고 진행도 progressbar `aria_best`, 최고 콤보 meter `aria_best_combo`(그릴 때만), 밀림 표지 img `look_ball`, 설정 버튼 `btn_settings` + `aria-describedby` → `guardian_hold`(N20).
    - 레벨 시작 판: 레벨 이름 img(`role="img"`, 이름 `levelN_name`) + 깬 레벨이면 등급 img `grade_N` 하나, ▶ 버튼 = `tap_to_start`, 연습 `btn_practice`, 그림 다시 보기 `btn_card_replay`, 닫기 `btn_close`(N17).
    - 플레이: 캔버스 `aria_play_area`, progressbar `aria_progress`·`aria_best`, 시도 `aria_attempts`, **콤보 meter `aria_combo`**, 멈춤 `btn_pause`.
    - 결과: 레벨 이름(화면 글), 클리어 제목(화면 글), **등급 img `grade_N` 하나**(연습 클리어는 `practice_clear`), 버튼 3개(N18).
    - 불러오기 오류: 오류 글 2개, ↻ 버튼 `btn_retry`, html lang = 선택 언어(N15·N16).
12. 빌드는 `strings.json`만 읽고 코드에 문구를 쓰지 않습니다. 안 쓰는 키(예비 `card_twoballs`, 선택 `aria_best_combo`를 그리지 않을 때 등)는 DEV_NOTES에 이유(criteria).

## 7. 텍스트 키 표 (KR / EN)

- 구분: **★** = 플레이 중(튜토리얼·카드·토스트) / **화면** = 메뉴·결과의 보이는 보조 글 / **aria** = 대체 글 전용(화면에 안 띄움) / **예비** = 지금 안 씀(DEV_NOTES 이유) / **어른** = 보호자 화면 긴 글(한도 없음) / **스토어**.
- round-2에서 "구분"·"쓰는 곳"을 1-2 뒤 art·빌드 합의에 맞춰 고쳤습니다(round-1 이슈 8 / N21, 4곳: `levelN_name`·`look_ball`·`pause_screen`·카드 문구 자리).
- 버튼은 그림 버튼이고 `btn_*`는 대체 글·보조 글입니다(그림 art 11-2).
- 표의 KR·EN 칸은 `strings.json`과 글자 하나까지 같아야 합니다(7-9).

### 7-1. 타이틀 (3개)

| 키 | 구분 | KR | EN | 쓰는 곳·그림 힌트 |
|---|---|---|---|---|
| `title` | 화면 | 높이통통 | Tossaloft | 타이틀 로고(가안). **부트 키**: 불러오기·오류 화면의 문서 제목도 이 값(6절 9) |
| `tap_to_start` | 화면 | 눌러서 시작 | Tap to start | 타이틀 손가락 그림 옆 글 + **레벨 시작 판 ▶ 버튼 대체 글 재사용**(DEV_NOTES N2 빌드 규칙을 승인, round-1 이슈 8). 오디오 잠금 해제도 첫 탭 |
| `audio_unlock` | ★ | 톡 하면 소리가 나요 | Tap to hear sound | 오디오가 잠긴 채 들어왔을 때. **글 옆에 스피커(`sound_on`) + 손가락 그림**(N20, art 아이콘 재사용) |

### 7-2. 레벨 선택 (20개)

- **레벨 카드 버튼 대체 글 = `levelN_name` + 쉼표 + 상태 키 하나.** 상태 키는 **`levelcard_locked`(잠김) · `levelcard_new`(열렸고 안 해 봄) · `grade_N`(깸, 받은 수) · `practice_clear`(연습으로만 깸, DEV_NOTES N3 승인)** 넷뿐입니다.
- **해 봤지만 못 깬 레벨은 버튼 이름 = `levelN_name`만**이고, 값은 카드 안 progressbar(이름 `aria_best`, 값 `aria-valuenow`)가 말합니다. `aria_best`를 상태 키로 잇지 않습니다(round-1 이슈 6 / N19: "모래놀이터, 가 본 만큼" + "가 본 만큼" 중복).
- 최고 진행도는 일반 모드만(D14). 최고 콤보 표지를 그리면 meter `aria_best_combo`(7-4).

| 키 | 구분 | KR | EN | 쓰는 곳·그림 힌트 |
|---|---|---|---|---|
| `levels_screen` | aria | 어디로 갈까요? | Where to bounce? | 레벨 선택 격자 이름 |
| `level1_name` | 화면 | 잔디밭 | Grassy Lawn | **화면 글은 클리어 결과 맨 위 작은 줄에만**(30-art 11-1, `layout.json level_name`). 레벨 선택 카드·레벨 시작 판에서는 aria(카드 버튼 이름, 시작 판 img 이름)만(round-1 이슈 8 정정) |
| `level2_name` | 화면 | 모래놀이터 | Sandbox | 〃 |
| `level3_name` | 화면 | 솜구름 하늘 | Puffy Sky | 〃 카드 그림 = 큰 구름 1개 + 반쯤 숨은 공 |
| `level4_name` | 화면 | 그네 터 | Swing Park | 〃 |
| `level5_name` | 화면 | 작은 마을 | Little Village | 〃 **round-2 새 이름**(지붕 W4) |
| `level6_name` | 화면 | 물웅덩이 | Puddle Splash | 〃 **round-1 L5 이름을 옮김**(가지 W5) |
| `level7_name` | 화면 | 바람개비 언덕 | Pinwheel Rise | 〃 |
| `level8_name` | 화면 | 딱따구리 나무 | Woodpecker Tree | 〃 |
| `level9_name` | 화면 | 연 날리는 날 | Kite Day | 〃 |
| `level10_name` | 화면 | 하늘 꼭대기 | Top of the Sky | 〃 |
| `levelcard_new` | aria | 아직 안 해 봤어요 | Not played yet | 상태 키: 열렸지만 안 해 본 레벨 |
| `levelcard_locked` | aria | 잠겨 있어요 | Locked | 상태 키: 자물쇠 카드 |
| `grade_1` | aria | 구름 하나 | One cloud | 상태 키·등급 img: **레벨 카드, 레벨 시작 판, 결과 화면 공통**(결과 쪽 round-1 이슈 4 / N18) |
| `grade_2` | aria | 구름 둘 | Two clouds | 〃 |
| `grade_3` | aria | 구름 셋 | Three clouds | 〃 |
| `practice_clear` | aria | 연습으로 깼어요 | Cleared in practice | 상태 키: 연습으로만 깬 레벨(다음 레벨은 열림, DEV_NOTES N3 승인). 결과 화면 연습 클리어의 등급 자리 대체 글 |
| `btn_card_replay` | aria | 그림 다시 보기 | See the picture again | 레벨 시작 판 그림 카드 다시 보기(새 기믹 레벨만) |
| `btn_levels` | 화면 | 레벨 고르기 | Levels | 결과·멈춤 메뉴 버튼 |
| `look_ball` | aria | 공을 보고 쳐요 | Watch the ball, then tap | **소리 밀림 표지(아이용) img 이름**. 레벨 선택 오른쪽 위, 글 없이 눈 + 공 그림만(30-art 11-1·11-2, round-1 이슈 8 정정: 화면 → aria). 플레이 중 없음(D11) |

### 7-3. 튜토리얼·그림 카드 (10개) — 그림이 주, 글은 보조

- 그림 카드는 그 레벨을 **처음 할 때 시작 전 1회**, 레벨당 1장. **카드 키 = `balance.json gimmicks.<id>.card` = 레벨 JSON `card.id` = `assets/cards/<키>.svg`·`<키>_portrait.svg`**(D1, V7).
- 카드 문구는 대체 글 겸 **카드 대화 상자 위쪽 한 줄 보조 글**(30-art 8절, 배율 계산에서 28 px 비움. round-1 이슈 8 정정: "아래" → "위쪽"). 그림만으로 이해되게 그립니다.
- 카드 그림 언어(art): ^ 올라감, v 내려옴, **길 위 표시 간격**(멀면 높이), 앉은 공 = 쉼, 손 위 막대 n개 = n번 톡. round-2에서는 카드 칸 안에도 **길과 표시**가 보이고, 표시가 북에 오는 칸에 손가락이 있어야 "표시 = 칠 때"가 연결됩니다.
- **손가락(`tut_tap`)은 L1 첫 접촉 1회**(D4). 지붕이 있는 레벨에는 손가락 없음(S8).
- 문구와 그림의 횟수가 맞아야 함: "톡톡" = 누름 표시 2, "톡톡톡톡" = 4, "셋" = 길이 3박, "쉬어요" = **손이 북에서 떨어져 있고 공이 앉은 그림**(S8).

| 키 | 구분 | KR | EN | 레벨 | 카드 그림 힌트 (art 8절에 넘김) |
|---|---|---|---|---|---|
| `tut_tap` | ★ | 표시가 북에 오면 톡! | Mark reaches the drum: tap! | 1 | L1 첫 접촉 손가락 옆 한 줄. **round-2 변경**(round-1 "공이 북에 닿으면 톡!"): 앞에서 보이는 단서(표시)와 치는 순간을 한 문장으로. 글 자리는 `layout.json text_slots`(N10, 길 영역 밖 S10) |
| `card_bounce` | ★ | 톡 치면 공이 올라가요 | Tap, and the ball goes up | 1 | 표시가 다가옴 → 표시가 북에 옴 + 손가락 + 튐 선 → 공 올라감(^). 원인(톡) → 결과(올라감) |
| `card_big` | ★ | 표시가 멀면 높이 떠요 | Far mark, high bounce | 2 | **round-2 변경**. 가까운 표시(1박) 낮은 공 → 먼 표시(2박) 높은 공 → 먼 표시가 북에 올 때 손가락. "거리 = 높이" |
| `card_cloud` | ★ | 구름에 숨었다 내려와 | Up in the cloud, then down | 3 | 길 구름이 흘러옴 → 공이 구름 뒤, 그림자 작게 → 다음 표시가 북에 올 때 그림자 크게 + 손가락 |
| `card_dot` | ★ | 길게 길게 짧게 | Long, long, short | 4 | 표시 간격 1.5·1.5·1(큰 간격·같음·짧음) |
| `card_roof` | ★ | 지붕 밑에선 쉬어요 | Under the roof, rest | 5 | **새 카드(W4)**. 지붕이 다가옴 → 지붕 밑에서 공이 북 위에 앉음, **손은 북에서 떨어져 위로**(누름 표시 없음) → 지붕이 지나가고 공이 다시 뜸(^). 겁주는 말("조심·안 돼·치지 마") 대신 받침 쉼과 같은 "쉬어요"(2절). runner-01 L7 문구 틀("위 ○○는 기다려요")을 쓰지 않음 |
| `card_double` | ★ | 가지 밑에선 톡톡 | Under the branch: tap tap | 6 | **round-2 변경**. 넓은 간격 → 가지 밑 촘촘한 표시 2개 → 손가락 + 누름 표시 2 |
| `card_twoballs` | 예비 | 공 두 개가 번갈아 | Two balls take turns | − | **예비(G5 내림, D-R2-1)**. 문구는 남겨 두고 빌드에서 안 씀(DEV_NOTES). balance가 되살리면 레벨·그림 다시 정함 |
| `card_three` | ★ | 큰 언덕은 셋 세고 톡 | Big hill: count three, tap | 7 | **round-2 변경**. 앉은 공(받침 쉼) → 큰 언덕 위로 아주 높이(3박) → 언덕 너머 표시가 북에 올 때 손가락 |
| `card_roll` | ★ | 긴 가지 밑엔 톡톡톡톡 | Long branch: four quick taps | 8 | **round-2 변경**. 넓은 간격 → 긴 가지 밑 촘촘한 표시 4개 → 손가락 + 누름 표시 4 |

### 7-4. 플레이 화면·토스트 (11개)

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `aria_play_area` | aria | 공을 톡 쳐 올려요 | Tap to send the ball up | 플레이 캔버스 이름("탭이 공을 올린다", D3) |
| `practice_on` | ★ | 연습 중 | Practice mode | 연습 모드 표시(깃발과 함께) |
| `new_best` | aria | 새 기록이에요 | New best! | 새 기록 `aria-live` 알림만 |
| `paused_background` | ★ | 누르면 이어서 해요 | Tap to keep going | 백그라운드 복귀(▶ 그림과 함께) |
| `pause_screen` | 화면 | 멈췄어요 | Paused | **멈춤 메뉴 제목 한 줄(보이는 글) + 메뉴 dialog 이름**(`mockup-pause-menu.svg`, round-1 이슈 8 정정: aria → 화면) |
| `aria_progress` | aria | 가는 길 | Progress | 진행도 막대(`aria-valuenow`). "길"을 따라가는 세계관과 맞음 |
| `aria_best` | aria | 가 본 만큼 | How far you got | 최고 기록 점: HUD와 레벨 카드 progressbar 공용 이름(D8). **상태 키로 잇지 않음**(7-2) |
| `aria_attempts` | aria | 해 본 횟수 | Tries | 시도 점 줄(`aria-valuenow`) |
| `aria_checkpoint` | aria | 깃발 | Flag | 연습 체크포인트 깃발 |
| `aria_combo` | aria | 이어서 잘한 만큼 | Streak | **새(콤보)**. HUD 콤보 점 줄의 `role="meter"` 이름, 값 = 지금 콤보(`aria-valuenow`, min 0, max는 그 레벨 판정 대상 수). 숫자·"○ 연속"을 글로 잇지 않음, `aria-live` 아님. 지붕 참기 성공도 +1(14-8)이라 "친 만큼"이 아니라 "잘한 만큼" |
| `aria_best_combo` | aria | 제일 길게 이어서 | Best streak | **새(선택)**. 레벨 선택 카드에 최고 콤보 표지를 그릴 때만(djmax 4-4 선택, art 결정) 그 meter 이름, 값 `aria-valuenow`. 그리지 않으면 DEV_NOTES에 미사용 이유 |

### 7-5. 클리어 (4개)

- **선택 규칙(DEV_NOTES N4 승인)**: 등급 n → `clear_title_n`, 연습 클리어 → `clear_title_1`, 레벨 10 → `clear_last`.

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `clear_title_1` | 화면 | 높이 올랐어요! | Way up high! | 등급 1·연습 클리어. 결과 맨 위 레벨 이름 아래 한 줄 |
| `clear_title_2` | 화면 | 멀리 왔어요! | Look how far you went! | 등급 2. **round-2 변경**(round-1 "구름까지 갔어요!": 고정 구름이 없어져 클리어 연출과 안 맞을 수 있음 → 여행 세계관 말로) |
| `clear_title_3` | 화면 | 통통 최고! | Super bouncing! | 등급 3 |
| `clear_last` | 화면 | 하늘 꼭대기다! | Top of the sky! | 레벨 10 클리어(레벨 이름 되부름, 의도) |

### 7-6. 버튼 (11개)

- 플레이 HUD 버튼은 멈춤 하나(D11). 멈춤 메뉴 = 이어 하기 · 다시 · 레벨 고르기 · 소리 켜기/끄기, 메뉴 제목 `pause_screen`.

| 키 | 구분 | KR | EN | 그림 (art) |
|---|---|---|---|---|
| `btn_next` | 화면 | 다음 | Next | 굵은 오른쪽 화살표 |
| `btn_retry` | 화면 | 다시 | Again | ↻. 결과·멈춤 메뉴·**불러오기 오류**(부트 키, 그림 인라인, 6절 9) |
| `btn_pause` | aria | 멈춤 | Pause | 플레이 HUD 유일 버튼 |
| `btn_resume` | aria | 이어 하기 | Keep playing | 멈춤 메뉴 첫 버튼 |
| `btn_practice` | aria | 연습 | Practice | 깃발 |
| `btn_settings` | aria | 어른 설정 | Grown-up settings | 큰 사람 + 작은 사람. 길게 누르기로 보호자 화면. **`aria-describedby` → `guardian_hold` 보조 글 요소**(N20) |
| `btn_close` | aria | 닫기 | Close | × |
| `btn_back` | aria | 뒤로 | Back | 왼쪽 세모 |
| `btn_sound_on` | aria | 소리 켜기 | Sound on | 멈춤 메뉴(지금 꺼져 있을 때) |
| `btn_sound_off` | aria | 소리 끄기 | Sound off | 멈춤 메뉴(지금 켜져 있을 때) |
| `btn_skip` | aria | 건너뛰기 | Skip | 소리 맞추기 건너뛰기 |

### 7-7. 보호자 화면·소리 맞추기 (21개)

- 진입(D11): `btn_settings` 길게 누르기(채워지는 막대 + `hold_progress`). 짧게 누르면 `guardian_hold` 보조 글만. 시간·횟수는 balance.json(`guardian_gate`·`drift_check`·`calibration`), 문구에 숫자 없음.
- 소리 맞추기는 클리어 조건이 아닙니다(판정은 화면 기준). rhythm-01 "박자 맞추기"·runner-01 "박자 맞추기" 대신 **"소리 맞추기"**.
- `guardian_intro`는 round-2 규칙(표시·지붕 쉼)을 어른에게 한 번 설명합니다.

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `guardian_hold` | 화면 | 어른이 길게 눌러요 | Grown-ups: press and hold | 설정 버튼 보조 글·`aria-describedby` 대상 |
| `hold_progress` | aria | 길게 누르는 중 | Keep holding | 길게 누르기 progressbar |
| `guardian_title` | 화면 | 보호자 설정 | For grown-ups | 보호자 화면 제목 |
| `guardian_intro` | 어른 | 이 게임은 화면에서 공이 북에 닿는 순간을 보고 치도록 만들었어요. 길의 표시가 북에 올 때 아이가 톡 쳐야 공이 다시 올라가고, 치지 않으면 공이 떨어져요. 지붕 밑에서는 치지 않고 공과 같이 쉬어요. 블루투스 이어폰처럼 소리가 늦게 들려도, 공과 표시를 보고 치면 레벨을 깰 수 있어요. | This game is timed to what children see: they tap when a mark on the path reaches the drum and the ball lands. Each tap sends the ball back up; without a tap, the ball drops. Under a roof, they rest and do not tap. Even if the sound comes late, for example with Bluetooth headphones, they can clear every level by watching the ball and the marks. | 보호자 화면 첫 문단(**round-2 변경**) |
| `settings_sync` | 화면 | 소리 맞추기 | Sound timing | 소리 맞추기 열기 |
| `sound_late` | 화면 | 소리가 늦게 나요 | Sound is late | 소리 밀림 표지(어른용, 눈 + 공 그림 옆 글) |
| `settings_language` | 화면 | 언어 | Language | 언어 줄 |
| `lang_ko` | 화면 | 한국어 | 한국어 | 자기 이름 표기 |
| `lang_en` | 화면 | English | English | 자기 이름 표기 |
| `settings_reset` | 화면 | 기록 지우기 | Reset progress | (D17로 이번 범위 밖, DEV_NOTES) |
| `confirm_reset` | 화면 | 기록을 지울까요? | Erase all progress? | 확인 창(`alertdialog`), 처음 초점 취소 |
| `confirm_yes` | 화면 | 지우기 | Erase | |
| `confirm_no` | 화면 | 취소 | Cancel | |
| `sync_intro` | 어른 | 노래가 화면보다 늦게 들리면 '소리 맞추기'를 해 주세요. 어른이 소리에 맞춰 톡 치면 노래가 화면에 맞춰져요. 아이 기록과 레벨을 깰 수 있는지는 바뀌지 않아요. 아이가 치면 잘 맞지 않을 수 있어요. | If the music sounds later than the screen, use Sound timing. A grown-up taps along with the sound, and the music is lined up with the screen. This does not change your child's progress or whether a level can be cleared. It works best when a grown-up does the tapping. | 소리 맞추기 줄 아래 설명 |
| `sync_screen` | ★ | 소리에 맞춰 톡 쳐요 | Tap along with the sound | 소리 맞추기 화면 이름·보조 글 |
| `sync_with_grownup` | ★ | 어른과 같이 해요 | Do this with a grown-up | 시작 때 |
| `sync_again` | ★ | 한 번 더 해요 | One more time | 두 번째 묶음 |
| `sync_progress` | aria | 누른 횟수 | Taps so far | 점 줄(`aria-valuenow`) |
| `sync_done` | ★ | 소리를 맞췄어요 | Sound is set | 끝 |
| `sync_kept` | ★ | 그대로 둘게요 | Kept as before | 측정 버림 `aria-live` |
| `sync_redo` | aria | 다시 맞추기 | Redo timing | 다시 하기 버튼 |

### 7-8. 불러오기·오류·스토어 (4개)

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `loading` | ★ | 불러오는 중… | Loading… | **부트 키**. 북 위 공이 천천히 튀는 인라인 그림과 함께 |
| `load_error` | ★ | 다시 해 주세요 | Please try again | **부트 키**. ↻ 버튼(`btn_retry`, 그림 인라인) 설명 |
| `load_error_detail` | 어른 | 게임을 불러오지 못했어요. 인터넷 연결을 확인한 뒤 다시 눌러 주세요. | The game couldn't load. Check your internet connection, then tap to try again. | **부트 키**. 오류 화면 작은 글 |
| `store_short` | 스토어 | 다가오는 표시가 북에 오면 톡! 공이 높이 통통. 지붕 밑에선 쉬어요. 손가락 하나 공놀이. | Tap when a mark reaches the drum! Rest under roofs. One-finger ball fun. | 스토어 짧은 설명(80자 이내). **round-2 변경** |

**합계: 3 + 20 + 10 + 11 + 4 + 11 + 21 + 4 = 84개** (`_meta` 제외, 7-9 검사로 확인).

**round-1(81) → round-2(84) 키 변화**: 추가 3(`card_roof`·`aria_combo`·`aria_best_combo`), 삭제 0, 구분 변경 4(`look_ball` 화면→aria, `pause_screen` aria→화면, `card_twoballs` ★→예비, `levelN_name` 쓰는 곳 정정), 문구 변경 14(`level5_name`·`level6_name`·`tut_tap`·`card_big`·`card_double`·`card_three`·`card_roll`·`clear_title_2`·`guardian_intro`·`store_short` + 새 키 3 + 예비 1의 구분).

**키를 두지 않은 것(그림으로 대신)**
- 실패·재시작 문구 없음(지붕 부딪힘 포함). 첫 실패에만 ↻ 그림(글·키 없음).
- **콤보 화면 문구 없음**: "콤보·연속·○번" 글·숫자, 단계(5·10·20) 칭찬 글, 끊김 글 모두 없음(5절). 대체 글만.
- **지붕 경고 문구 없음**: 플레이 중 "조심·참아·치지 마" 토스트 없음(카드 1장과 그림으로만, S8·S9).
- 흘러오는 물체(표시·지붕·가지·언덕·구름)마다의 대체 글 없음: 플레이 중 낭독은 박자를 방해함(6절 5). 캔버스 이름 하나(`aria_play_area`).
- 연습 체크포인트 버튼 문구 없음(자동), 연습 최고 진행 막대 문구 없음(D14).
- 두 공 관련 플레이 문구는 만들지 않음(`card_twoballs`만 예비).

### 7-9. 문서 표 = `strings.json` 확인 (node)

검사: ① 7절 표 키 행과 `strings.json` 키(`_meta` 제외)가 같은 집합, 중복 없음 ② KR·EN 글자 하나까지 같음 ③ 구분이 `어른`·`스토어`가 아닌 키(예비 포함)는 한국어 12자 이내(공백 포함)·영어 6단어 이내 ④ `store_short` 80자 이내 ⑤ **금지어**: rhythm-01 용어(별·궤도·북채·둥둥이·똑딱·박자·Tickadrum·star·orbit·drumstick·tick) + **runner-01 용어(가시·점프·뛰어·달려·블록·상자·발판·고리·포털·Reverbound·spike·jump·run·block·pad·ring·portal)** 0 ⑥ **카드 키**: `card_*`(예비 제외) = 7-3 제안 8개, 그리고 `balance.json gimmicks.*.card`가 W id로 바뀌었으면 그 집합과 같아야 함(아직 round-1 id면 "balance 대기"로 출력, 실패로 세지 않음 — 동시 작업) ⑦ **문구 겹침**: KR·EN 어느 쪽이든 `games/rhythm-01/data/strings.json` 또는 `games/reverbound/data/strings.json` 문구와 글자까지 같으면 실패, 8-3 공통 UI 키만 예외 ⑧ (참고) 카드 그림 파일 `assets/cards/<키>.svg`·`_portrait.svg` 있는 수.

명령(`projects/rhythm-02/`에서, node만):

```
node -e 'const fs=require("fs"),md=fs.readFileSync("10-lore.md","utf8"),js=JSON.parse(fs.readFileSync("strings.json","utf8"));delete js._meta;const bal=JSON.parse(fs.readFileSync("balance.json","utf8"));const flat=(o,a=[])=>{for(const v of Object.values(o)){if(typeof v==="string")a.push(v);else if(v&&typeof v==="object")flat(v,a)}return a};const r1=JSON.parse(fs.readFileSync("../../games/rhythm-01/data/strings.json","utf8")),rn=JSON.parse(fs.readFileSync("../../games/reverbound/data/strings.json","utf8"));const r1v=new Set([...Object.values(r1.ko),...Object.values(r1.en)]),rnv=new Set(flat(rn.strings||rn));const sec=md.slice(md.indexOf("## 7."),md.indexOf("## 8.")),rows={},err=[];for(const l of sec.split(/\r?\n/)){const c=l.split("|").map(s=>s.trim()),m=/^`([a-z0-9_]+)`$/.exec(c[1]||"");if(!m)continue;if(rows[m[1]])err.push("dup "+m[1]);rows[m[1]]={kind:c[2],ko:c[3],en:c[4]}}const ban=/별|궤도|북채|둥둥이|똑딱|박자|Tickadrum|\bstar\b|orbit|drumstick|\btick|가시|점프|뛰어|달려|블록|상자|발판|고리|포털|Reverbound|spike|jump|\brun|block|\bpad\b|\brings?\b|portal/i;const common=new Set("tap_to_start btn_next btn_retry btn_levels btn_pause btn_practice btn_close btn_back btn_sound_on btn_sound_off btn_skip levelcard_new levelcard_locked btn_card_replay practice_on pause_screen paused_background aria_progress aria_attempts aria_checkpoint new_best settings_reset confirm_reset confirm_yes confirm_no guardian_hold sync_with_grownup sync_progress sync_kept sync_redo sound_late loading load_error".split(" "));for(const k of Object.keys(js))if(!rows[k])err.push("doc missing "+k);let same1=0,sameN=0;for(const [k,r] of Object.entries(rows)){const j=js[k];if(!j){err.push("json missing "+k);continue}if(r.ko!==j.ko)err.push("ko diff "+k);if(r.en!==j.en)err.push("en diff "+k);const free=["어른","스토어"].includes(r.kind);if(!free&&([...j.ko].length>12||j.en.split(/\s+/).length>6))err.push("len "+k);if(r.kind==="스토어"&&([...j.ko].length>80||j.en.length>80))err.push("store>80 "+k);if(ban.test(j.ko+" "+j.en))err.push("banned "+k);const s1=r1v.has(j.ko)||r1v.has(j.en),sN=rnv.has(j.ko)||rnv.has(j.en);if(s1)same1++;if(sN)sameN++;if(!common.has(k)&&(s1||sN))err.push((s1?"r01":"run01")+" same "+k)}const reserve=Object.entries(rows).filter(([,r])=>r.kind==="예비").map(([k])=>k);const want="card_bounce card_big card_cloud card_dot card_roof card_double card_three card_roll".split(" ").sort();const jc=Object.keys(js).filter(k=>k.startsWith("card_")&&!reserve.includes(k)).sort();if(jc.join()!==want.join())err.push("card keys "+jc.join());const g=Object.entries(bal.gimmicks).filter(([id])=>!id.startsWith("_"));const isR2=g.some(([id])=>/^W\d/.test(id));const bc=g.map(([,v])=>v.card).sort();let bnote;if(isR2){bnote=bc.join()===jc.join()?"=balance":"≠balance";if(bnote!=="=balance")err.push("balance cards "+bc.join())}else bnote="balance 대기(round-1 id)";let f=0;for(const c of jc)for(const s of ["","_portrait"])if(fs.existsSync("assets/cards/"+c+s+".svg"))f++;console.log("doc",Object.keys(rows).length,"json",Object.keys(js).length,"| cards",jc.length,bnote,"reserve",reserve.join(),"| same-as r01",same1,"runner",sameN,"(common만 허용) | card files",f+"/"+jc.length*2,"(참고) |",err.length?"FAIL "+err.join(", "):"PASS")'
```

**검사 결과 (2026-11-17, round-2):**

```
doc 84 json 84 | cards 8 balance 대기(round-1 id) reserve card_twoballs | same-as r01 32 runner 12 (common만 허용) | card files 14/16 (참고) | PASS
```

- ①~⑤·⑦ PASS. ⑥ strings 카드 8개 = 7-3 제안 PASS, **balance 대기**: 실행 시점 `balance.json gimmicks`가 아직 round-1 id(B1·G1…)라 비교 보류(balance가 W id로 바꾼 뒤 다시 돌리면 엄격 비교). ⑧ 카드 파일 14/16: `card_roof` 2장이 아직 없음(art round-2 작업 중), 다른 7장은 round-1 그림이라 round-2 길·표시 그림으로 다시 그려야 함(art).
- 한도 적용 키 중 가장 긴 문구: `tut_tap`·`card_bounce`·`card_big`·`card_three`·`card_roll` 한국어 12자(한도 딱 맞음), 영어 최대 6단어(`card_bounce`·`card_cloud`). `store_short` KR 51자 / EN 72자.
- ⑦ 글자 같은 문구: rhythm-01 32개 키, runner-01 12개 키 — **모두 8-3 공통 UI 목록 안**(게임 정체성 문구 겹침 0). runner-01과 같은 것은 `tap_to_start`(눌러서 시작/Tap to start)·`btn_levels`(레벨 고르기/Levels)·`pause_screen` EN·`new_best` EN·`btn_next`·`btn_retry`·`btn_practice` EN·`loading`·기록 지우기 흐름 4개.
- ⑤ 이 문서 8절에는 비교용으로 두 게임 용어를 적지만, 검사는 `strings.json`만 봅니다.

## 8. 다른 게임과의 구분

### 8-1. rhythm-01과의 구분 (round-2 갱신)

두 게임은 "공이 어떤 자리에 닿을 때 톡"이 닮아 보일 수 있습니다. round-2에서 우리 쪽은 **끝없이 흘러오는 길**이 생겨 rhythm-01(한 자리에서 도는 궤도, 보여 주기 마디)과 화면 구조가 더 멀어졌습니다.

| 축 | rhythm-01(Tickadrum) | 이 게임 (round-2) | 이유 |
|---|---|---|---|
| **탭의 결과** | 탭은 별을 침, 공 경로 영향 없음 | **탭이 공을 쳐 올림**, 안 치면 떨어짐(D3) | 규칙 핵심 차이. `card_bounce`·`aria_play_area`·`store_short`가 이 인과를 말함 |
| 앞을 보는 단서 | 궤도 위 별, 보여 주기 마디(시범 → 따라 하기) | **길 위 표시가 오른쪽에서 다가옴**, 시범·차례 없음 | 콜앤리스폰스 없음. 표시 = 지금 칠 때 하나 |
| 칠지·말지 | 없음(모든 별을 침) | **지붕 밑에선 쉼**(반대 행동 1) | round-2 새 규칙 |
| 판정 표식 | 별 (star) | **쓰지 않음.** "표시"(음표·별 모양 금지, art) | |
| 움직임 | 궤도, 빙글 (orbit) | **쓰지 않음.** 길이 흘러오고 공은 세로로 튐 | |
| 시작 전 소리 | 카운트인 "똑딱" | 받침 쉼 "콩"(D7) | |
| 보정 | 박자 맞추기 | **소리 맞추기** | |
| 등급 | 작은 북 1~3개 | 등급 구름 늘 3칸 | |
| 콤보 표시 | (rhythm-01 자체 결정, 노랑 금지) | HUD 띠 안 점 10칸 + 큰 표지, 글 없음, 대체 글 "이어서 잘한 만큼" | 7-9 ⑦이 대체 글 겹침도 검사 |
| 레벨 이름 | 아침 마당·꽃밭·비 오는 창가·바닷가·숲속 길·노을 언덕·등불 골목·지붕 위·구름 위·달 | 잔디밭 ~ 하늘 꼭대기(4절), **새 L5 "작은 마을"**도 마당·골목·지붕 위 낱말 안 씀 | "하루 흐름" 대신 "길 여행". 물체 이름 "지붕"은 rhythm-01 레벨 이름 "지붕 위"와 낱말 하나 같음(문구 겹침 아님, 참고) |
| 판정 순간 문구 | "별에 닿으면 톡!" | "표시가 북에 오면 톡!" | 7-9 ⑦ 글자 겹침 0 |
| 클리어 첫 문구 | 잘했어요! | 높이 올랐어요! / 멀리 왔어요! | |

### 8-2. runner-01과의 관계 (요청자 허용 겹침, 용어는 다르게)

- **겹침은 요청자 요구라 허용**(kickoff 3, D-R2-6): 세상이 오른쪽에서 흘러오고 플레이어 쪽이 왼쪽에 머무는 구조, "위가 막히면 누르지 않는" 반대 행동(지붕 = runner-01 L7 매달린 위험과 기능 같음).
- **다른 점(글·이름에서 지킴)**: 달리는 캐릭터가 없고(북과 공), 탭 대상은 북이며, 높이를 아이가 정하지 않고 표시 간격이 정함. 지붕 밑은 "위험을 피함"이 아니라 **"공이 앉아 쉼"**(받침 쉼과 같은 말).
- **용어를 다르게**: 화면 문구에 **가시·점프·뛰어·달려·블록·상자·발판·고리·포털·문(속도 문)·Reverbound / spike·jump·run·block·pad·ring·portal**을 쓰지 않습니다(7-9 ⑤ 자동). 우리 말은 **길·표시·지붕·가지·언덕·구름·쉬어요·톡**.
- **문장 틀을 다르게**: runner-01 레벨 태그 "위 가시는 기다려요"·"가시를 넘어요"·"고리에서 또 톡!" 같은 "○○는/를 + 동작" 틀 중, 같은 기능인 지붕 카드는 "기다려요"를 피하고 "쉬어요"로 씀. 레벨 이름도 runner-01(새벽 조율장·줄다리 야시장·폭풍 종탑·빗방울 계단·바람 기찻길·비눗방울 언덕·고드름 동굴·달팽이 정원·구름 사다리·해돋이 무대)과 글자 겹침 0(7-9 ⑦). "언덕"은 두 게임 다 낱말로 쓰지만 이름 전체는 다름(바람개비 언덕 vs 비눗방울 언덕).
- **원본 보호**: 레퍼런스 러너 게임의 이름·문구·물체 이름(레퍼런스 고유 용어)을 쓰지 않습니다. 콤보도 DJMAX 계열의 판정 이름·문구를 쓰지 않고 화면 글이 없습니다.

### 8-3. 공통 UI 문구 재사용은 의도 (결정 D8)

- **시스템 UI 문구는 허브 공통 UX로 일부러 같게 둡니다.** 예외 목록(7-9 ⑦ `common`, 33개): `tap_to_start` `btn_next` `btn_retry` `btn_levels` `btn_pause` `btn_practice` `btn_close` `btn_back` `btn_sound_on` `btn_sound_off` `btn_skip` `levelcard_new` `levelcard_locked` `btn_card_replay` `practice_on` `pause_screen` `paused_background` `aria_progress` `aria_attempts` `aria_checkpoint` `new_best` `settings_reset` `confirm_reset` `confirm_yes` `confirm_no` `guardian_hold` `sync_with_grownup` `sync_progress` `sync_kept` `sync_redo` `sound_late` `loading` `load_error`.
- round-2에서 runner-01도 비교에 넣으면서 `new_best`(EN "New best!" = runner-01 `new_best`)를 공통 목록에 더했습니다(새 기록 알림은 허브 공통 UX, aria 전용).
- **게임 정체성 문구**(타이틀, 레벨 이름, 튜토리얼·카드, 플레이 화면 이름, **콤보 대체 글**, 클리어, 등급, `look_ball`, 스토어)는 예외 없이 두 게임과 글자까지 같으면 안 됩니다.
- 그대로 남긴 말: **북** — 코어 정의의 받침, 이름에는 넣지 않음. **통·톡·콩** — 놀이 일반 의성어. **깃발·↻·자물쇠** — 공통 UX 패턴(그림은 art가 새로).

## 9. 교차 리뷰·round-1 이슈 처리 (요약, 자세한 표는 보고서)

| # | 출처 | 안건 | round-2 처리 |
|---|---|---|---|
| A1~A10 | 1-2 | 테마 키·카드 키·등급·보호자 진입 등 | 1-2 결정 그대로(이전 판 9절) |
| N21 / LW8 | round-1 | 7절 구분 칸 4곳 + N3·N4·`tap_to_start` 재사용 미기록 | **처리**: `levelN_name`·`look_ball`·`pause_screen`·카드 문구 자리 정정, N3(`practice_clear`)·N4(`clear_title_n`)·`tap_to_start` ▶ 재사용 승인 기록(7-1·7-2·7-5) |
| N19 / LW6 | round-1 | `aria_best`를 상태 키로 씀 | **문서 처리**: 상태 키 4개로 정의, 못 깬 레벨은 이름만 + progressbar(7-2). 빌드는 dev |
| N15·N16 / LW1·2 | round-1 | 오류 화면 ↻ 안 보임, 부트 lang·title 고정 | **문서 처리**: 부트 키 5개, lang·title·↻ 인라인 규칙(6절 9). 빌드는 dev |
| N17·N18 / LW3·4 | round-1 | 시작 판·결과 등급 대체 글 | **문서 처리**: 화면별 접근성 트리 목록(6절 11), `grade_N` 결과 공통(7-2). 빌드는 dev |
| N20 / LW7 | round-1 | `btn_settings` describedby, `audio_unlock` 그림 | **문서 처리**: 7-6·7-1에 명시. 빌드는 dev(art 아이콘 재사용) |
| N10 / LW5 | round-1 | `tut_tap` 글 ↔ 구름 | 고정 구름이 없어짐. 글 자리는 `text_slots`·길 영역 밖(S10) — art·dev. 새 문구도 12자·5단어 |

## 10. 스토어 문구 초안

### 짧은 설명 (80자 이내, `store_short`)
- KR: 다가오는 표시가 북에 오면 톡! 공이 높이 통통. 지붕 밑에선 쉬어요. 손가락 하나 공놀이.
- EN: Tap when a mark reaches the drum! Rest under roofs. One-finger ball fun.

### 긴 설명 (초안, 키 아님)

**KR**

북 하나, 공 하나가 함께 길을 떠나요. 길 위의 표시가 북에 오는 순간 톡 치면 공이 "통!" 하고 다시 올라가요. 표시가 멀면 높이, 가까우면 낮게. 마을 지붕 밑에서는 공과 같이 쉬어 가요.

- 손가락 하나, 탭 하나.
- 내가 쳐야 공이 올라가요. 앞에서 다가오는 표시를 보고 치면 돼요. 소리가 조금 늦게 들려도 괜찮아요.
- 구름, 가지, 큰 언덕, 지붕 — 길마다 다른 것들이 다가와요.
- 이어서 잘하면 작은 점이 하나씩 차올라요.
- 떨어뜨려도 괜찮아요. 바로 다시 시작해요.
- 잔디밭부터 하늘 꼭대기까지, 열 곳의 길.
- 보호자를 위한 소리 맞추기 기능.

**EN**

One drum and one ball set off down the path together. Tap the moment a mark on the path reaches the drum, and the ball bounces right back up. Far marks mean high bounces; close marks mean low ones. Under the village roofs, the ball takes a little rest.

- One finger. One tap.
- Your tap sends the ball up. Just watch the marks coming your way; a little sound delay is no problem.
- Clouds, branches, big hills and roofs: every path brings something new.
- Keep it going and little dots fill up one by one.
- Dropped it? No worries. You're right back in.
- Ten paths, from a grassy lawn to the top of the sky.
- Sound timing for grown-ups.

- 광고·결제 관련 문구는 수익화 단계 전이라 넣지 않았습니다.

## 11. 남은 위험

| # | 위험 | 심각도 | 이 문서의 처리 |
|---|---|---|---|
| K10 | 지붕 쉬기(반대 행동)가 5~6세에 어려움 | major | 카드 "지붕 밑에선 쉬어요"(겁주지 않는 말) + 손 떨어진 그림, 받침 쉼과 같은 "쉼" 말로 묶음. 아동 테스트는 D-R2-4대로 요청자 선택 목록 |
| K11 | 표시 줄이 노트 레인·runner-01과 닮아 보임 | minor | 이름 "표시"(음표·노트 아님), 8-2 용어 구분, 7-9 ⑤ |
| L6 | "표시"가 5~6세에게 추상적인 낱말 | minor | art가 구체 모양(예: 작은 꽃·조약돌)으로 그리면 1-2에서 그 이름으로 바꿈(`tut_tap`·`card_big`·`store_short`·`guardian_intro` 4곳) |
| L7 | 카드 키 제안(`card_roof` 등)을 balance가 다르게 정할 수 있음 | minor | 원본은 balance(D1). 7-9 ⑥이 balance W id를 보면 바로 비교 |
| L8 | "가지"와 "긴 가지"가 같은 종류 행동(빨리 치기)이라 길이로만 구분 | minor | art 실루엣 길이 차이, 카드 누름 표시 2 vs 4 |
| L9 | `aria_best_combo`를 art가 그리지 않을 수 있음 | minor | 선택 키, 안 쓰면 DEV_NOTES |
| L1 | 게임 이름 미확정 + 이름 짜임 | minor | 가안 유지(D15) |
| L3 | "Top of the Sky" ↔ `clear_last` 비슷 | minor | 의도 |
| K9 | 구름에 숨는 동안 박 놓침 | minor | `card_cloud` 그림자 작게 → 크게 + 다음 표시 |
