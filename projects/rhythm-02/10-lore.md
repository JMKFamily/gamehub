# 10. 세계관: Tossaloft (높이통통) — 가안

- 작성: 2026-11-17, lore-writer, 단계 1-1 / 1-2 2차 수정(D1~D16) / **round-2 수정: 2026-11-17** (요청자 피드백 "몰입감" 재설계 R2-A "흘러오는 길" + 전 프로젝트 콤보 지시 + round-1 lore 이슈. 처리표는 `Docs/lore-writer/2026-11-17-r2-lore-redesign.md`) / **round-2 1-2 교차 리뷰 + 1회 수정: 2026-11-17** (오케스트레이터 R2-D1·D6·D7·D8 + 교차 리뷰 `reviews/cross-r2/lore-writer.md`. 보고서 `Docs/lore-writer/2026-11-17-r2-1-2-cross-review.md`) / **1-2 후속: 2026-11-17** (balance 교차 리뷰 X1·X2·X6 + 오케스트레이터 "rhythm-01 새 코어와의 수렴": 8-1을 rhythm-01 북길 기준 사실로 갱신, `card_three` 문구 변경(X2), 3절 W5 0.34. 요청자 결정 "게임 간 겹침 다 허용, 동사도 같아도 됨"에 따라 겹침 때문에 바꾼 문구는 없음. 보고서 `Docs/lore-writer/2026-11-17-r2-1-2-followup.md`)
- 입력: `00-benchmark.md` 14절(R2-A, 기믹 어휘 W0~W7, 14-5 S6~S10, 14-8 콤보, 14-9 lore 몫), `Docs/orchestrator/2026-11-17-r2-immersion-kickoff.md`(D-R2-1~6), `reviews/round-1/score.md`(N15~N21)·`reviews/round-1/lore-writer.md`(이슈 1~8), `harness/benchmarks/djmax-judgement.md`(4절·5-3절), `harness/criteria.md`(세계관·텍스트·대상 연령·원본 보호), `harness/insights.md`
- 참고(읽기만): `games/rhythm-01/data/strings.json`·`games/reverbound/data/strings.json`(문구·용어 겹침 검사), `30-art.md`·`20-balance.md`·`DEV_NOTES.md`(1-2 맞출 것 확인용)
- 원본 보호: 상용 게임(레퍼런스 러너 게임, DJMAX 계열)의 이름·캐릭터·설정·판정 문구를 쓰지 않았습니다. runner-01(Reverbound)·rhythm-01(Tickadrum) 이름·레벨 이름·게임 정체성 문구도 가져오지 않았습니다(8절). 아래 이름·문구는 모두 새로 만든 것이고, 시스템 UI 문구 일부만 허브 공통 UX로 일부러 같게 둡니다(8-3).
- 소유권: **수치(BPM·판정 창·시간·접촉 수·앞쪽 보이는 박·콤보 단계 값)는 `20-balance.md`·`balance.json`·`levels/*.json`**, 색·모양·실루엣·연출·소리·아이콘은 `30-art.md`가 기준입니다. 이 문서는 숫자를 정하지 않습니다.
- **텍스트 원본은 `strings.json`입니다.** 빌드는 이 문서를 파싱하지 않고 `strings.json`만 읽습니다. 7절 표와 JSON이 같은지는 7-9 node 검사로 확인합니다.
- **카드 키 원본은 `balance.json gimmicks.<id>.card`입니다**(결정 D1). balance가 W0~W7에 lore 제안 8개를 그대로 붙였고, 이 문서 7-3·`strings.json`·`assets/cards/<키>.svg` 8장이 같습니다(7-9 ⑥ 엄격 대조 PASS). 예비 카드 키는 `strings.json`에 두지 않습니다(R2-D1, 예비는 3절 표에만).

## 확정값 표 (round-2)

| 항목 | 값 | 쓰는 곳 | 비고 |
|---|---|---|---|
| 게임 이름 (영문 / 한국어) | **Tossaloft / 높이통통** (가안) | 타이틀, 스토어 | **요청자 확정 필요**(1절). round-2 "여행" 세계관과도 맞음(1-2) |
| **승패 한 문장 (짧은 판)** | **"표시가 북에 오면 톡! 지붕 밑에선 쉬기. 놓치면 다시."** | 세 기획 문서·00-benchmark 공통 | round-1 "공이 북에 닿을 때 톡! 놓치면 다시."를 바꿈. 화면 글 키 아님 |
| 승패 한 문장 (설명판) | "길의 표시가 북에 올 때 톡 치면 공이 다시 올라가요. 지붕 밑에서는 치지 않고 공과 같이 쉬어요. 공이 떨어지거나 지붕에 부딪히면 다시 해요." | 보호자 글(`guardian_intro`)·스토어 긴 설명 | 2절 |
| 핵심 규칙 | **탭이 공을 올린다**(결정 D3 그대로) + **지붕 밑에서는 치지 않는다**(반대 행동 하나) | 2절·8절·스토어 | 14-3 |
| 세계관 | 아주 얇음. **공과 북이 함께 길을 따라 여행한다**(길·물체가 오른쪽에서 흘러옴 = 앞으로 감) | 전체 | 2절. 캐릭터 이름·얼굴 없음 |
| 화면에 쓰는 모양 이름 | **공·북·그림자·길·표시·구름·지붕·가지·긴 가지·큰 언덕** | 튜토리얼·카드·대체 글 | 3절. art 실루엣과 대조 끝(round-2 1-2): 표시 = 파란 반원 돔, 지붕 = 줄무늬 차양 — **이름 유지**(R2-D6) |
| 레벨 수 / `theme_id` | 10 / `level01` ~ `level10` | 레벨 JSON, 팔레트 키 | 4절. L5·L6 이름을 바꿈 |
| 카드 키 (확정) | 8개: `card_bounce`(W0) `card_big`(W1) `card_cloud`(W2) `card_dot`(W3) **`card_roof`(W4, 새)** `card_double`(W5) `card_three`(W6) `card_roll`(W7) = `balance.json gimmicks` | strings·카드 파일·레벨 `card.id` | 원본은 balance(D1). **`card_twoballs` 키 삭제**(R2-D1), G5 예비는 3절 표에만 |
| 플레이 중 문구 | 한 문장, **한국어 12자 이내(공백 포함) / 영어 6단어 이내** | 어른·스토어를 뺀 **모든 키** | criteria, 7-9 자동 검사 |
| 대체 글 | 숫자·값을 이름에 이어 붙이지 않음. 값은 `aria-valuenow`, **개수(콤보·최고 콤보·시도·보정 횟수)는 `aria-valuetext` = 숫자만**(퍼센트로 안 읽히게). **확인은 접근성 트리**(6절 4·11) | 빌드 전체 | round-1 이슈 3·6, criteria, insights(콤보 대체 글) |
| 콤보 | **글·숫자 없음**(점 10칸 + 큰 표지, art). "콤보"라는 말 대신 **"이어서 잘한 수"**. 대체 글 `aria_combo`(meter), 최고 콤보 `aria_best_combo`(레벨 카드, **버튼 밖**). 판정마다·끊길 때 읽지 않음 | HUD·레벨 카드 | 5절·6절 4·5·11·7-4. `aria-live` 없음(R2-D7) |
| 텍스트 키 수 | **83개** (`_meta` 제외, round-2 1-1 84 − `card_twoballs`) | `strings.json` | 7-9 검사 PASS |
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
- "구름"은 문서에서 **길 구름**(흘러오는 물체 W2, 공이 숨음), **끝 구름**(클리어 때 길이 멈추는 자리에서 공이 들어가는 구름, W2와 같은 모양 — art "끝 구름" = balance "클리어 구름"), **등급 구름**(결과·레벨 카드의 작은 구름 3칸)으로 나눠 부릅니다. 화면 글에서는 셋 다 그냥 "구름"이고, 끝 구름·등급 구름에는 화면 글 키가 없습니다(등급은 `grade_N`). round-1의 화면 위 고정 "플레이 구름"은 없어짐(14-6).

## 3. 화면에 보이는 모양 이름

화면 이름은 아이가 그림을 보고 바로 부를 수 있는 낱말만 씁니다. 모양·색은 `30-art.md`가 기준이고, **튜토리얼 그림은 바로 뒤에 처음 만나는 실제 물체와 같은 색·모양**이어야 합니다(criteria). **이름 = 모양**이 되도록 art 실루엣 이름과 1-2에서 맞춥니다(표 마지막 칸).

| 요소 | 화면 이름 (KR / EN) | 보이는 모양 (art 확정) | 아이가 그림으로 알아야 하는 것 | art와 맞출 것 |
|---|---|---|---|---|
| 판정 대상 | **공 / ball** | 원 1개(북 위에서 위아래로만 튐) | 표시가 북에 올 때 톡 쳐야 다시 올라감 | 그대로 |
| 받침 | **북 / drum** | 화면 왼쪽(0.30 W) 아래 납작한 둥근 사각형 + **가운데 다리 하나**(길 줄까지 내려옴). 탭하면 톡 올라감 | 누르면 북이 공을 쳐 올림. 표시가 **다리 밑**에 오면 칠 때 | **대조 끝**: 다리는 북의 일부라 이름 따로 없음("표시가 북에 오면" = 다리 밑에 옴) |
| 공의 보조 신호 | **그림자 / shadow** | 북 위 타원. 공이 높을수록 작음 | 공이 구름에 숨어도 곧 내려옴 | 그대로 |
| 바닥 | **길 / path** | 오른쪽에서 흘러오는 바닥 띠 + 길 줄. 그 아래 **조약돌**(짧은 막대, 엇간격, 표시보다 흐림 — 속도감 장식) | 길이 다가온다 = 앞으로 간다 | 이름 "길". 조약돌은 장식이라 **화면 글·키 없음**, 표시 이름 후보에서 뺌(아래 W0) |
| W0 박 표시 | **표시 / mark** | **파란 낮은 반원 돔**(북 몸통 색 + 잉크 외곽선, 크기·색 하나), 길 줄 위에 hit 접촉마다 하나, 친 순간 다리 밑에서 작아져 사라짐. 지붕 밑 착지에는 없음. 음표·노트 막대·공 같은 원 아님(art 3-2) | 표시가 북(다리 밑)에 오면 톡. 멀면 오래, 촘촘하면 빨리. **표시가 없으면 안 침**(받침 쉼·지붕 밑) | **대조 끝 — "표시" 유지(R2-D6)**. 돔은 아이가 부를 구체 이름(꽃·조약돌 등)이 없는 모양이고, "조약돌"은 art가 길 장식에 이미 써서 바꾸면 헷갈림. 쓰는 곳 4곳(`tut_tap`·`card_big`·`store_short`·`guardian_intro`) 그대로 |
| W2 | **구름 / cloud** (길 구름) | 흘러와 공을 잠깐 가리는 **긴 구름**(아래 띠 + 촘촘한 혹, 흰색) | 공이 숨었다 내려옴, 다음 표시는 멀리 | 대조 끝. 등급 구름과 크기·자리 다름. 끝 구름도 같은 모양(2절) |
| W4 | **지붕 / roof** | **줄무늬 차양**(가게 앞 차양 모양): 윗변이 둥글게 솟은 보라·흰 세로 줄무늬 몸통 + 아래 물결 가장자리. 가시·뾰족·빨강·경고 표지 없음 | 지붕 밑에선 공이 앉아 쉼 = 치지 않음 | **대조 끝 — "지붕" 유지**. 5~6세는 "차양"을 모르고, 둥글게 솟은 윗변 + 물결 처마는 "지붕"으로 부를 수 있음(카드 `card_roof` 그림 확인). "천막·우산"으로 부르는 아이가 있어도 카드 그림이 같아 규칙 이해에는 지장 없음 |
| W5 | **가지 / branch** | 가로 갈색 줄기 + 위로 초록 렌즈 잎(원 아님), 지붕보다 낮게(아랫면 0.34 Hp — 값은 `balance.json objects.branch.under_of_Hp`, 1-2 R2-D9에서 0.30 → 0.34) | 가지 밑에선 톡톡(빠르게 두 번) | 대조 끝. 긴 가지와 길이·잎 수로 구분. **가지 밑 표시 수 = 문구 횟수**가 되게 그릴 것(교차 리뷰 이슈 1, art·balance) |
| W6 | **큰 언덕 / big hill** | 바닥에서 솟은 반타원(테마 언덕 색), 북·공 뒤 층 | 아주 높이 떠서 셋에 톡 | 대조 끝. L7 배경은 언덕 대신 낮은 들 띠라 헷갈림 없음 |
| W7 | **긴 가지 / long branch** | 가지와 같은 모양, 더 길고 잎이 많음 | 긴 가지 밑에선 톡톡톡톡 | 대조 끝. 가지와 결과가 같은 종류(빨리 치기)라 길이로만 구분. 표시 수 규칙은 W5와 같음 |
| 진행도 막대 | (글 없음, `aria_progress`) | 화면 위 HUD 띠 | 찰수록 끝에 가까움 | 그대로 |
| 최고 기록 점 | (글 없음, `aria_best`) | 막대 위 공 색 점 | 지난번 여기까지 | 그대로 |
| 시도 횟수 | (점, `aria_attempts`) | art | | 그대로 |
| **콤보** | (글·숫자 없음, `aria_combo` "이어서 잘한 수") | HUD 띠 안 **네모 칸 10개**(빈 칸 흰색, 찬 칸 잉크) + 10마다 왼쪽에 **금빛 둥근 네모 큰 표지**(별 아님) | 이어서 잘할수록 칸이 참(지붕 밑에서 쉬어도 한 칸) | 대조 끝. 공 색·바탕 단계와 모양·자리·때가 다름 |
| 최고 콤보 표지 | (글 없음, `aria_best_combo` "이어서 잘한 최고 기록") | 레벨 선택 카드 오른쪽 위 작은 금빛 네모 0~2개(10마다 1개), 일반 모드만 | 지난번 가장 길게 이은 만큼 | 대조 끝. 대체 글은 카드 버튼 **밖**(6절 11) |
| 연습 체크포인트 | **깃발 / flag** | art | 연습에서 여기부터 다시 | 그대로 |
| 끝 구름 | (글 없음) | W2 구름과 같은 모양, 클리어 때 길이 멈춘 자리에서 북 위 | 공이 크게 튀어 구름 속으로 = 끝 | 키 없음(캔버스 안 연출) |
| 클리어 등급 | **등급 구름, 늘 3칸** | 받은 만큼 채움, 빈 칸 점선(D12) | 채운 칸이 많을수록 잘함 | 그대로 |
| 소리 켜기 안내 그림 | (글 `audio_unlock` 옆) | **`icon-unlock_sound`**: 스피커 + 누르는 손가락(art 11-2, round-2 새 아이콘) | 톡 하면 소리가 남 | 대조 끝. 그림은 글 옆 장식이라 따로 키 없음(`aria-hidden`), 이름은 `audio_unlock` 글이 줌 |

기믹 이름은 **기획 문서·카드 쪽에서만** 쓰고 플레이 중 화면 글로 띄우지 않습니다. 기획 문서에서는 늘 id와 같이 씁니다("지붕(W4)").

| id (14-3) | 기획 이름 | 아이 말(카드 문구 쪽) | 카드 키 (제안, 7-3) | 레벨 | round-1 대응 |
|---|---|---|---|---|---|
| W0 | 흐르는 길 + 박 표시 + 받침 쉼 | 표시가 북에 오면 톡 | `card_bounce` | L1 | B0·B1 |
| W1 | 넓은 간격(큰 통 2박) | 표시가 멀면 높이 떠요 | `card_big` | L2 | G1 |
| W2 | 구름(구름 통 4박) | 구름에 숨었다 내려와 | `card_cloud` | L3 | G2 |
| W3 | 엇간격(점 통 1.5·1.5·1) | 길게 길게 짧게 | `card_dot` | L4 | G3 |
| W4 | **지붕(쉬는 곳, nogo)** | 지붕 밑에선 쉬어요 | **`card_roof`** (새) | L5 | 새 기믹 |
| W5 | 가지(통통 0.5 짝) | 가지 밑에선 톡톡 | `card_double` | L6 | G4 |
| W6 | 큰 언덕(세 박 통 3박) | 큰 언덕은 셋에 톡 | `card_three` | L7 | R1 |
| W7 | 긴 가지(드르륵 0.5 × 4) | 긴 가지 밑엔 톡톡톡톡 | `card_roll` | L8 | G7 |
| G5 | 두 공 | (예비 문구 후보) 공 두 개가 번갈아 / Two balls take turns | (예비) `card_twoballs` — **`strings.json` 키 없음**(R2-D1 삭제) | 없음 | D-R2-1 내림. balance가 되살리면 그때 키를 다시 만들고 7-3·`strings.json`에 넣음(문구는 이 칸 후보, 12자·6단어 안) |
| G6 | 빠른 곡 구간 | — | 미사용(D2), 키 없음 | — | |

- 카드 키는 기능이 같은 round-1 키를 그대로 두고(파일·레벨 JSON 바꿈 최소) 지붕만 새 키를 더했습니다. 키 이름이 기믹 이름과 조금 어긋나는 곳(`card_double` = 가지, `card_three` = 큰 언덕)은 키가 내부 이름이라 화면에 영향이 없습니다. balance가 이 8개를 `gimmicks`에 그대로 확정했습니다(round-2 1-2).

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
- **콤보**: **화면 글·숫자 없음**(djmax 4-3). 점 10칸 + 10마다 큰 표지, 5·10·20 단계 연출·화음(art). 끊김은 소리 없이 조용히 작아짐(4-5). **콤보에 화면 문구 키를 두지 않습니다**: "콤보", "○ 연속", "잘했어!" 같은 글은 신호를 늘리고 글을 읽는 아이에게만 보상이 됩니다. 대체 글만 `aria_combo`(7-4). "콤보"는 5~6세에게 낯선 말이라 대체 글도 **"이어서 잘한 수"**로 풀어 씁니다(insights 콤보 대체 글). 판정마다·단계(5·10·20)·끊길 때 **아무것도 읽지 않습니다**(6절 5).
- **새 기록**: 화면 글 없음. 최고 기록 점이 미끄러짐 + `best` 소리. `new_best`는 `aria-live` 알림만.
- **클리어**: `clear_title_n`(등급 n, N4 승인), 연습 클리어 `clear_title_1`, 레벨 10 `clear_last`. 등급 구름 늘 3칸. 버튼 다음/다시/레벨 고르기(L10은 2개).
- **받침 쉼**: 글 없음. 공이 앉아 까딱이며 "콩"(D7). 지붕 밑 쉼과 같은 "앉은 공" 모양이라 "쉼"이 한 가지 그림으로 읽힘.

## 6. 텍스트 규칙 (빌드·리뷰 공통)

1. **플레이 중 문구는 한 문장, 한국어 12자 이내(공백 포함) / 영어 6단어 이내.** 어른·스토어를 뺀 모든 키에 같은 한도(3절 표의 예비 문구 후보도 같은 한도로 씀), 7-9 자동 검사.
2. **세계관 용어 대신 화면에 보이는 모양 이름**(3절 표: 공·북·길·표시·구름·지붕·가지·긴 가지·큰 언덕·깃발)만 씁니다. 기획 이름(점 통·통통·드르륵·nogo 등)은 화면 글에 쓰지 않습니다.
3. 한국어는 `word-break: keep-all`. 지원 언어마다 주요 화면 스크린샷으로 잘림 확인(QA).
4. **대체 글(aria) 이름에 숫자·값을 이어 붙이지 않습니다.** 값은 `aria-valuenow`(·min·max)로만 줍니다. 두 종류로 나눕니다(round-2 1-2, R2-D7):
   - **비율**(진행도 `aria_progress`, 최고 기록 `aria_best`, 길게 누르기 `hold_progress`): `role="progressbar"`, min 0·max 100, `aria-valuetext` 없음(퍼센트로 읽혀도 뜻이 맞음).
   - **개수**(콤보 `aria_combo`, 최고 콤보 `aria_best_combo`, 시도 `aria_attempts`, 보정 횟수 `sync_progress`): `role="meter"`(시도·보정은 progressbar여도 됨), `aria-valuenow` = 그 수, **`aria-valuetext` = 그 수 숫자만**(예 "7"). 낭독기가 "47 %"처럼 퍼센트로 읽지 않게 하는 용도이고, 숫자 뒤에 낱말("번·개·연속")을 붙이지 않습니다. 읽히는 말은 "이어서 잘한 수, 7" 정도.
   - 키 두 개를 잇는 곳은 레벨 카드 한 곳뿐(`levelN_name` + 쉼표 + 상태 키, 7-2).
5. 플레이 중 `aria-live` 알림은 `new_best`·`sync_kept` 두 개만. **콤보는 어떤 때도 알리지 않습니다**: 판정마다 값이 바뀌어도, 단계 5·10·20 연출 때도, **끊길 때(값이 0이 될 때)도 아무것도 읽지 않음**(live 아님, 낭독이 박자를 방해, 끊김에 벌칙 말이 붙지 않게). 등급(딱·좋아·통과)도 판정마다 읽지 않습니다. 콤보 meter는 플레이 내내 접근성 트리에 그대로 두고(값 0·1도 그대로, 화면에 점이 보이기 시작하는 콤보 2를 기다리지 않음) `aria-hidden`을 켰다 껐다 하지 않습니다.
6. **튜토리얼 그림은 바로 뒤에 처음 만나는 물체의 실제 색·모양과 같아야 합니다.** 지붕 카드 지붕 = L5 첫 지붕, 가지 카드 가지 = L6 첫 가지. 카드 속 공 렌더 ≥ 16 px.
7. **글을 못 읽어도 플레이 가능**: 시작(▶·손가락), 레벨 선택(카드 그림), 튜토리얼(그림 카드·L1 손가락), 실패(그림), 클리어(등급 구름·그림 버튼), 멈춤 메뉴(그림 버튼), **불러오기 오류(↻ 그림, 아래 9)**. `notext` 화면에서 L1을 시작·클리어할 수 있어야 함(QA).
8. 치환 자리 없음. 화면 문구에 rhythm-01 용어(8-1)·runner-01 용어(8-2)를 쓰지 않음. 게임 정체성 문구는 두 게임과 글자까지 같으면 안 됨(7-9 ⑦).
9. **부트 단계(불러오기·오류 화면)는 JSON을 읽기 전이므로 빌드 스크립트가 `strings.json`에서 부트 키 5개(`title`·`loading`·`load_error`·`load_error_detail`·`btn_retry`)를 두 언어로 꺼내 `index.html` 부트 블록에 넣습니다.** 부트 코드는 언어를 정한 **직후** `document.documentElement.lang`과 `document.title`(= 그 언어 `title`)을 바꿉니다(`<html lang>`·`<title>` 고정값에 기대지 않음). **↻ 그림(`icon-retry.svg`)도 부트 블록에 인라인**으로 넣어 데이터 로드 실패와 무관하게 보이게 하고, 버튼 대체 글 = `btn_retry`, 설명 = `load_error`(round-1 N15·N16, criteria 세계관 rhythm-02 줄).
10. 언어는 `navigator.language`로 자동(ko면 ko, 그 밖 en). 보호자 화면에서만 바꿈. `lang_ko`·`lang_en`은 어느 화면에서도 자기 이름.
11. **대체 글은 접근성 트리로 확인합니다**(Playwright `ariaSnapshot()` 등). `aria-hidden` 요소에 붙인 `aria-label`은 없는 것과 같습니다. 화면별로 트리에 나와야 하는 것(QA·lore 리뷰 확인 목록):
    - 레벨 선택: 격자 이름 `levels_screen`, 카드 버튼 이름 = `levelN_name`(+ 상태 키), 최고 진행도 progressbar `aria_best`, 최고 콤보 meter `aria_best_combo`, 밀림 표지 img `look_ball`, 설정 버튼 `btn_settings` + `aria-describedby` → `guardian_hold`(N20).
      **progressbar `aria_best`와 meter `aria_best_combo`는 카드 버튼 안에 넣지 않습니다.** 버튼에 `aria-label`이 붙어 있으면 버튼 안 자식은 이름에 묻혀 트리에 나오지 않습니다(insights 콤보 대체 글). 같은 칸(`listitem`) 안에서 **버튼의 형제 요소**로 둡니다(화면 자리는 art 그대로 카드 위에 겹쳐 그려도 됨). `aria-describedby`로 잇는 방법은 값이 읽히지 않아 쓰지 않습니다. round-1 빌드는 `aria_best` progressbar를 버튼 안에 넣었으므로(`games/rhythm-02/js/main.js` `buildGrid`) round-2 빌드에서 고칩니다(dev).
      `aria_best_combo`는 일반 모드로 해 본 레벨에 최고 콤보 기록이 있을 때 하나(금빛 네모가 0개여도 값은 그 수), 연습 기록은 쓰지 않음.
    - 레벨 시작 판: 레벨 이름 img(`role="img"`, 이름 `levelN_name`) + 깬 레벨이면 등급 img `grade_N` 하나, ▶ 버튼 = `tap_to_start`, 연습 `btn_practice`, 그림 다시 보기 `btn_card_replay`, 닫기 `btn_close`(N17).
    - 플레이: 캔버스 `aria_play_area`, progressbar `aria_progress`·`aria_best`, 시도 `aria_attempts`(valuetext 숫자), **콤보 meter `aria_combo`(valuetext 숫자, 플레이 내내)**, 멈춤 `btn_pause`.
    - 결과: 레벨 이름(화면 글), 클리어 제목(화면 글), **등급 img `grade_N` 하나**(연습 클리어는 `practice_clear`), 버튼 3개(N18).
    - 불러오기 오류: 오류 글 2개, ↻ 버튼 `btn_retry`, html lang = 선택 언어(N15·N16).
12. 빌드는 `strings.json`만 읽고 코드에 문구를 쓰지 않습니다. round-2 1-2 기준 83개 키는 모두 쓰는 키입니다(예비 키 없음, art가 최고 콤보 표지를 그리므로 `aria_best_combo`도 씀). 안 쓰는 키가 생기면 DEV_NOTES에 이유(criteria).

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
| `audio_unlock` | ★ | 톡 하면 소리가 나요 | Tap to hear sound | 오디오가 잠긴 채 들어왔을 때. **글 옆에 `icon-unlock_sound.svg`(스피커 + 누르는 손가락, art 11-2 round-2 새 아이콘)**, 그림은 `aria-hidden`이고 이름은 이 글(N20) |

### 7-2. 레벨 선택 (20개)

- **레벨 카드 버튼 대체 글 = `levelN_name` + 쉼표 + 상태 키 하나.** 상태 키는 **`levelcard_locked`(잠김) · `levelcard_new`(열렸고 안 해 봄) · `grade_N`(깸, 받은 수) · `practice_clear`(연습으로만 깸, DEV_NOTES N3 승인)** 넷뿐입니다.
- **해 봤지만 못 깬 레벨은 버튼 이름 = `levelN_name`만**이고, 값은 버튼 옆 progressbar(이름 `aria_best`, 값 `aria-valuenow`)가 말합니다. `aria_best`를 상태 키로 잇지 않습니다(round-1 이슈 6 / N19: "모래놀이터, 가 본 만큼" + "가 본 만큼" 중복).
- 최고 진행도는 일반 모드만(D14). 최고 콤보는 meter `aria_best_combo`(7-4, art가 카드 오른쪽 위 금빛 네모로 그림).
- **progressbar `aria_best`·meter `aria_best_combo`는 카드 버튼 밖, 같은 칸 안 형제 요소**(6절 11). 버튼 안에 넣으면 낭독되지 않습니다.

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

### 7-3. 튜토리얼·그림 카드 (9개) — 그림이 주, 글은 보조

- 그림 카드는 그 레벨을 **처음 할 때 시작 전 1회**, 레벨당 1장. **카드 키 = `balance.json gimmicks.<id>.card` = 레벨 JSON `card.id` = `assets/cards/<키>.svg`·`<키>_portrait.svg`**(D1, V7).
- 카드 문구는 대체 글 겸 **카드 대화 상자 위쪽 한 줄 보조 글**(30-art 8절, 배율 계산에서 28 px 비움. round-1 이슈 8 정정: "아래" → "위쪽"). 그림만으로 이해되게 그립니다.
- 카드 그림 언어(art): ^ 올라감, v 내려옴, **길 위 표시 간격**(멀면 높이), 앉은 공 = 쉼, 손 위 막대 n개 = n번 톡. round-2에서는 카드 칸 안에도 **길과 표시**가 보이고, 표시가 북에 오는 칸에 손가락이 있어야 "표시 = 칠 때"가 연결됩니다.
- **손가락(`tut_tap`)은 L1 첫 접촉 1회**(D4). 지붕이 있는 레벨에는 손가락 없음(S8).
- 문구와 그림의 횟수가 맞아야 함: "톡톡" = 누름 표시 2, "톡톡톡톡" = 4, "셋에" = 표시 간격 3박 위 박 점 3개(공이 떠난 **다음 박부터** 하나·둘·셋, 셋째 점에 손가락), "쉬어요" = **손이 북에서 떨어져 있고 공이 앉은 그림**(S8).
- **"가지 밑" 횟수 = 가지 밑에 들어간 표시 수**(balance `objects.branch.contacts` = L6 2개·L8 4개). 가지로 들어가는 표시(앞 비행의 착지, 가지 왼쪽 끝 박)는 보통 표시 하나로 치고 "톡톡"에 세지 않습니다. 지금 그림은 그 표시가 가지 왼쪽 끝에 반쯤 걸려 촘촘한 표시가 3개·5개로 보일 수 있어 art·balance에 넘김(교차 리뷰 이슈 1). 문구는 그대로 둡니다.
- 예비 카드(두 공 G5)는 키를 두지 않습니다(R2-D1). 문구 후보는 3절 표에만.

| 키 | 구분 | KR | EN | 레벨 | 카드 그림 힌트 (art 8절에 넘김) |
|---|---|---|---|---|---|
| `tut_tap` | ★ | 표시가 북에 오면 톡! | Mark reaches the drum: tap! | 1 | L1 첫 접촉 손가락 옆 한 줄. **round-2 변경**(round-1 "공이 북에 닿으면 톡!"): 앞에서 보이는 단서(표시)와 치는 순간을 한 문장으로. 글 자리는 `layout.json text_slots`(N10, 길 영역 밖 S10) |
| `card_bounce` | ★ | 톡 치면 공이 올라가요 | Tap, and the ball goes up | 1 | 표시가 다가옴 → 표시가 북에 옴 + 손가락 + 튐 선 → 공 올라감(^). 원인(톡) → 결과(올라감) |
| `card_big` | ★ | 표시가 멀면 높이 떠요 | Far mark, high bounce | 2 | **round-2 변경**. 가까운 표시(1박) 낮은 공 → 먼 표시(2박) 높은 공 → 먼 표시가 북에 올 때 손가락. "거리 = 높이" |
| `card_cloud` | ★ | 구름에 숨었다 내려와 | Up in the cloud, then down | 3 | 길 구름이 흘러옴 → 공이 구름 뒤, 그림자 작게 → 다음 표시가 북에 올 때 그림자 크게 + 손가락 |
| `card_dot` | ★ | 길게 길게 짧게 | Long, long, short | 4 | 표시 간격 1.5·1.5·1(큰 간격·같음·짧음) |
| `card_roof` | ★ | 지붕 밑에선 쉬어요 | Under the roof, rest | 5 | **새 카드(W4)**. 지붕이 다가옴 → 지붕 밑에서 공이 북 위에 앉음, **손은 북에서 떨어져 위로**(누름 표시 없음) → 지붕이 지나가고 공이 다시 뜸(^). 겁주는 말("조심·안 돼·치지 마") 대신 받침 쉼과 같은 "쉬어요"(2절). runner-01 L7 문구 틀("위 ○○는 기다려요")을 쓰지 않음 |
| `card_double` | ★ | 가지 밑에선 톡톡 | Under the branch: tap tap | 6 | **round-2 변경**. 넓은 간격 → 가지 밑 촘촘한 표시 2개 → 손가락 + 누름 표시 2 |
| `card_three` | ★ | 큰 언덕은 셋에 톡 | Big hill: tap on three | 7 | **1-2 후속 변경(X2)**(이전 "큰 언덕은 셋 세고 톡 / Big hill: count three, tap"): "셋 세고 톡"은 두 가지로 틀릴 수 있음 — ① 공이 떠나는 순간(탭)을 "하나"로 세고 셋에 치면 **1박 일찍 = 무시 탭**(실패 아님, 표시가 북에 올 때 다시 치면 됨) ② 떠난 다음 박부터 세고 "셋 **다음**"에 치면 **1박 늦음 = 놓침(실패)**. "셋에 톡"은 셋과 탭을 한순간으로 묶어 ②를 없애고, 남는 착각은 ①(이른 무시 탭)뿐이라 안전한 쪽. 그림 힌트(art 8절에 넘김): 표시 간격 3박 위에 박 점 3개를 **떠난 다음 박부터** 찍고 셋째 점 = 표시가 북에 오는 칸 = 손가락. 실제 신호는 여전히 표시(셈은 보조). round-2 그림: 큰 언덕이 오고 표시 간격 3박 → 공이 언덕 위로 아주 높이 → 언덕이 지나가고 표시가 북에 올 때 손가락(art 8절 그림과 대조 끝, round-2 1-2). L7 첫 언덕은 받침 쉼 끝 자동 토스로 넘어가므로 아이는 토스 다음 박부터 세어 셋째 박 착지 때 한 번 톡 = 문구와 맞음. L7 둘째 언덕·L9·L10은 앞 hit(공이 떠나는 탭) 다음 박부터 같은 셈 |
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
| `aria_combo` | aria | 이어서 잘한 수 | Good taps in a row | **콤보(round-2 1-2 문구 변경, R2-D7)**. HUD 콤보 칸 줄(큰 표지 포함 전체 하나)의 `role="meter"` 이름. `aria-valuenow` = 이번 시도 콤보(balance `comboEvents` = grades 길이, 지붕 참기 포함), min 0, max = 그 레벨 판정 대상 수(hit + nogo), **`aria-valuetext` = 숫자만**. 이름에 숫자·"○ 연속"을 잇지 않음. **판정마다·단계 때·끊길 때 읽지 않음**(`aria-live` 아님, 6절 5). 플레이 내내 트리에 있음(값 0·1 포함). "콤보"는 아이에게 낯선 말이라 쓰지 않음. 지붕 참기도 +1이라 "친"이 아니라 "잘한". EN은 쉬운 낱말로(round-2 1-1 "Streak"은 어렵고 rhythm-01 `aria_streak_best` "Best streak"과 글자가 같아 바꿈) |
| `aria_best_combo` | aria | 이어서 잘한 최고 기록 | Most good taps in a row | **최고 콤보(round-2 1-2 문구 변경)**. 레벨 선택 카드의 최고 콤보 표지(art 금빛 네모 0~2개)의 `role="meter"` 이름. `aria-valuenow`·**`aria-valuetext`(숫자만)** = 일반 모드 최고 콤보 수. **카드 버튼 밖 형제 요소**(6절 11), 상태 키로 잇지 않음 |

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

**합계: 3 + 20 + 9 + 11 + 4 + 11 + 21 + 4 = 83개** (`_meta` 제외, 7-9 검사로 확인).

**round-2 1-1(84) → round-2 1-2(83) 키 변화**: 삭제 1(`card_twoballs`, R2-D1 — 예비 문구 후보는 3절 표에만), 문구 변경 2(`aria_combo` "이어서 잘한 만큼 / Streak" → "이어서 잘한 수 / Good taps in a row", `aria_best_combo` "제일 길게 이어서 / Best streak" → "이어서 잘한 최고 기록 / Most good taps in a row", R2-D7), 쓰는 곳 변경 3(`aria_best`·`aria_best_combo` 버튼 밖, `audio_unlock` 그림 = `icon-unlock_sound`), 추가 0.

**round-1(81) → round-2 1-1(84) 키 변화**: 추가 3(`card_roof`·`aria_combo`·`aria_best_combo`), 삭제 0, 구분 변경 4(`look_ball` 화면→aria, `pause_screen` aria→화면, `card_twoballs` ★→예비, `levelN_name` 쓰는 곳 정정), 문구 변경 14(`level5_name`·`level6_name`·`tut_tap`·`card_big`·`card_double`·`card_three`·`card_roll`·`clear_title_2`·`guardian_intro`·`store_short` + 새 키 3 + 예비 1의 구분).

**키를 두지 않은 것(그림으로 대신)**
- 실패·재시작 문구 없음(지붕 부딪힘 포함). 첫 실패에만 ↻ 그림(글·키 없음).
- **콤보 화면 문구 없음**: "콤보·연속·○번" 글·숫자, 단계(5·10·20) 칭찬 글, 끊김 글 모두 없음(5절). 대체 글만.
- **지붕 경고 문구 없음**: 플레이 중 "조심·참아·치지 마" 토스트 없음(카드 1장과 그림으로만, S8·S9).
- 흘러오는 물체(표시·지붕·가지·언덕·구름)마다의 대체 글 없음: 플레이 중 낭독은 박자를 방해함(6절 5). 캔버스 이름 하나(`aria_play_area`).
- 연습 체크포인트 버튼 문구 없음(자동), 연습 최고 진행 막대 문구 없음(D14).
- 두 공 관련 문구 키는 두지 않음(예비 카드 문구 후보는 3절 표에만, R2-D1).
- 새 모양(북 다리·조약돌·끝 구름·지붕 콩 연출·콤보 단계 연출)은 캔버스 안 그림이라 키 없음(캔버스 이름 `aria_play_area` 하나). 콤보 칸 줄은 meter `aria_combo` 하나로 묶고 칸·표지마다 이름을 붙이지 않음.

### 7-9. 문서 표 = `strings.json` 확인 (node)

검사: ① 7절 표 키 행과 `strings.json` 키(`_meta` 제외)가 같은 집합, 중복 없음 ② KR·EN 글자 하나까지 같음 ③ 구분이 `어른`·`스토어`가 아닌 키는 한국어 12자 이내(공백 포함)·영어 6단어 이내, **구분 `예비` 키가 있으면 실패**(R2-D1) ④ `store_short` 80자 이내 ⑤ **금지어**: rhythm-01 용어(별·궤도·북채·둥둥이·똑딱·박자·Tickadrum·star·orbit·drumstick·tick) + **runner-01 용어(가시·점프·뛰어·달려·블록·상자·발판·고리·포털·Reverbound·spike·jump·run·block·pad·ring·portal)** + **콤보 낯선 말(콤보·combo·streak, R2-D7)** 0 ⑥ **카드 키 엄격 대조(round-2 1-2)**: `strings.json`의 `card_*` 전부 = 7-3 8개 = `balance.json gimmicks.W0~W7.card` = `levels/*.json card.id` 집합, gimmicks id가 W0~W7이 아니면 실패("대기" 없음) ⑦ **문구 겹침**: KR·EN 어느 쪽이든 `games/rhythm-01/data/strings.json` 또는 `games/reverbound/data/strings.json` 문구와 글자까지 같으면 실패, 8-3 공통 UI 키만 예외 ⑧ 카드 그림 파일 `assets/cards/<키>.svg`·`_portrait.svg`가 키마다 2장(없으면 실패), 키 없는 카드 그림이 남아 있으면 "art 대기"로 출력.

명령(`projects/rhythm-02/`에서, node만):

```
node -e 'const fs=require("fs"),md=fs.readFileSync("10-lore.md","utf8"),js=JSON.parse(fs.readFileSync("strings.json","utf8"));delete js._meta;const bal=JSON.parse(fs.readFileSync("balance.json","utf8"));const flat=(o,a=[])=>{for(const v of Object.values(o)){if(typeof v==="string")a.push(v);else if(v&&typeof v==="object")flat(v,a)}return a};const r1=JSON.parse(fs.readFileSync("../../games/rhythm-01/data/strings.json","utf8")),rn=JSON.parse(fs.readFileSync("../../games/reverbound/data/strings.json","utf8"));const r1v=new Set([...Object.values(r1.ko),...Object.values(r1.en)]),rnv=new Set(flat(rn.strings||rn));const sec=md.slice(md.indexOf("## 7."),md.indexOf("## 8.")),rows={},err=[],wait=[];for(const l of sec.split(/\r?\n/)){const c=l.split("|").map(s=>s.trim()),m=/^`([a-z0-9_]+)`$/.exec(c[1]||"");if(!m)continue;if(rows[m[1]])err.push("dup "+m[1]);rows[m[1]]={kind:c[2],ko:c[3],en:c[4]}}const ban=/별|궤도|북채|둥둥이|똑딱|박자|Tickadrum|\bstar\b|orbit|drumstick|\btick|가시|점프|뛰어|달려|블록|상자|발판|고리|포털|Reverbound|spike|jump|\brun|block|\bpad\b|\brings?\b|portal|콤보|combo|streak/i;const common=new Set("tap_to_start btn_next btn_retry btn_levels btn_pause btn_practice btn_close btn_back btn_sound_on btn_sound_off btn_skip levelcard_new levelcard_locked btn_card_replay practice_on pause_screen paused_background aria_progress aria_attempts aria_checkpoint new_best settings_reset confirm_reset confirm_yes confirm_no guardian_hold sync_with_grownup sync_progress sync_kept sync_redo sound_late loading load_error".split(" "));for(const k of Object.keys(js))if(!rows[k])err.push("doc missing "+k);let same1=0,sameN=0;for(const [k,r] of Object.entries(rows)){const j=js[k];if(!j){err.push("json missing "+k);continue}if(r.kind==="예비")err.push("reserve key "+k);if(r.ko!==j.ko)err.push("ko diff "+k);if(r.en!==j.en)err.push("en diff "+k);const free=["어른","스토어"].includes(r.kind);if(!free&&([...j.ko].length>12||j.en.split(/\s+/).length>6))err.push("len "+k);if(r.kind==="스토어"&&([...j.ko].length>80||j.en.length>80))err.push("store>80 "+k);if(ban.test(j.ko+" "+j.en))err.push("banned "+k);const s1=r1v.has(j.ko)||r1v.has(j.en),sN=rnv.has(j.ko)||rnv.has(j.en);if(s1)same1++;if(sN)sameN++;if(!common.has(k)&&(s1||sN))err.push((s1?"r01":"run01")+" same "+k)}const want="card_bounce card_big card_cloud card_dot card_roof card_double card_three card_roll".split(" ").sort().join();const jc=Object.keys(js).filter(k=>k.startsWith("card_")).sort();const g=Object.entries(bal.gimmicks).filter(([id])=>!id.startsWith("_"));if(!g.every(([id])=>/^W\d$/.test(id)))err.push("balance gimmicks not W ids");const bc=g.map(([,v])=>v.card).sort().join();const lc=[...new Set(fs.readdirSync("levels").filter(f=>f.endsWith(".json")).map(f=>JSON.parse(fs.readFileSync("levels/"+f,"utf8")).card).filter(c=>c&&c.id).map(c=>c.id))].sort().join();if(jc.join()!==want)err.push("strings cards "+jc.join());if(bc!==want)err.push("balance cards "+bc);if(lc!==want)err.push("level card.id "+lc);let f=0;for(const c of jc)for(const s of ["","_portrait"])if(fs.existsSync("assets/cards/"+c+s+".svg"))f++;else err.push("no file "+c+s);const extra=fs.readdirSync("assets/cards").filter(x=>/\.svg$/.test(x)&&!jc.includes(x.replace(/(_portrait)?\.svg$/,"")));if(extra.length)wait.push("art 대기: 키 없는 카드 그림 "+extra.join("+"));console.log("doc",Object.keys(rows).length,"json",Object.keys(js).length,"| cards strings=balance=levels",jc.length,jc.join()===want&&bc===want&&lc===want?"OK":"NG","| same-as r01",same1,"runner",sameN,"(common만 허용) | card files",f+"/"+jc.length*2,"|",wait.length?"WAIT "+wait.join("; ")+" |":"",err.length?"FAIL "+err.join(", "):"PASS")'
```

**검사 결과 (2026-11-17, round-2 1-2 후속 다시 실행 — `card_three` 문구 변경 뒤):**

```
doc 83 json 83 | cards strings=balance=levels 8 OK | same-as r01 32 runner 12 (common만 허용) | card files 16/16 |  PASS
```

- 1-2 후속: 출력은 1-2와 같음(①~⑧ PASS, 대기 0). 덧붙여 rhythm-01 round-3 새 문구(rhythm-01 `10-lore.md` R3-7 표 KR·EN 22개)와 글자까지 같은 문구 0(node로 표를 읽어 대조, 검사 명령 밖).
- ①~⑧ 모두 PASS, 대기 없음. ⑥ `strings.json` 카드 8개 = `balance.json gimmicks` W0~W7 카드 8개 = 레벨 JSON `card.id` 8개(L1~L8). ⑧ 카드 그림 16/16, `card_twoballs` 그림은 art가 이미 지움(키 없는 그림 0).
- 이전 결과(round-2 1-1): `doc 84 json 84 | cards 8 balance 대기(round-1 id) reserve card_twoballs | … | card files 14/16 (참고) | PASS`.
- 한도 적용 키 중 가장 긴 문구(1-2 후속): `tut_tap`·`card_bounce`·`card_big`·`card_roll` 한국어 12자(한도 딱 맞음) + `aria_best_combo` 12자, `card_three`는 12 → 10자(X2). 영어 최대 6단어(`card_bounce`·`card_cloud`·`aria_best_combo`), `card_three` EN 5단어. 새 콤보 문구 `aria_combo`(KR 8자 / EN 5단어)·`aria_best_combo`는 두 게임 문구와 글자 겹침 0(⑦), rhythm-01 프로젝트 문서의 `aria_streak` "이어서 친 별 / Stars in a row"·`aria_streak_best` "가장 길게 이어 침 / Best streak"·runner-01 `combo_aria` "이어서 잘 뛴 수 / Good jumps in a row"와도 다름(손으로 대조). `store_short` KR 51자 / EN 72자.
- ⑦ 글자 같은 문구: rhythm-01 32개 키, runner-01 12개 키 — **모두 8-3 공통 UI 목록 안**(게임 정체성 문구 겹침 0). runner-01과 같은 것은 `tap_to_start`(눌러서 시작/Tap to start)·`btn_levels`(레벨 고르기/Levels)·`pause_screen` EN·`new_best` EN·`btn_next`·`btn_retry`·`btn_practice` EN·`loading`·기록 지우기 흐름 4개.
- ⑤ 이 문서 8절에는 비교용으로 두 게임 용어를 적지만, 검사는 `strings.json`만 봅니다.

## 8. 다른 게임과의 구분

### 8-1. rhythm-01과의 비교 (1-2 후속: rhythm-01 round-3 "북길" 기준으로 다시 씀 — 20-balance 2절·30-art 10-1b와 같은 축, R2-D8·교차 리뷰 X1)

rhythm-01은 round-3에서 새 코어 **"북길"**(오른쪽에서 흘러오는 별이 왼쪽 0.30 W 판정 선에 닿을 때 톡, 공은 탭과 무관하게 박마다 착지, 보여 주기 마디·북채·원 궤도 폐기 — rhythm-01 `10-lore.md` round-3 절·`20-balance.md` 17장·`30-art.md` 16절)로 바뀌었습니다. 1-2 표(궤도·보여 주기 마디 기준)는 사실과 달라져 아래로 바꿉니다.

**요청자 결정(2026-11-17, 오케스트레이터 전달): 게임 간 겹침은 다 허용, 동사도 같아도 됩니다.** 그래서 이 표는 두 게임의 지금 사실을 적는 비교표이고, 차이를 만들려고 낱말·문구를 바꾸지 않습니다(1-2 후속에서 겹침 때문에 바꾼 문구 0).

| 축 | rhythm-01 round-3 북길 | 이 게임 (round-2) |
|---|---|---|
| 탭의 결과 | 별을 침. 공은 탭과 무관하게 박마다 착지 | 탭이 공을 쳐 올림, 안 치면 떨어짐(D3). 공 높이 = 다음 표시까지 시간 |
| 판정 자리 | 가로 길 띠 위 세로 판정 선 + 띠 아래 원형 판정 북 | 바닥 길 위, 북 가운데 다리 밑(세로 선 없음) |
| 판정 표식 | 노랑 별(반박 별 같은 크기) | 파란 반원 돔 "표시" 하나, 지붕 밑 착지에는 없음 |
| 박 눈금 | 정박 눈금 + 마디 첫 박 막대가 길과 함께 흐름 | 없음(조약돌은 엇간격 장식) |
| 화면 구도·높이 | 길 띠가 화면 가운데 가로, 공 뜀 작음 | 길은 바닥, 공이 놀이 높이 Hp 전체를 위아래로 씀 |
| 물체 | 없음(별 묶음 모양·간격만 다름) | 지붕·가지·긴 가지·구름·큰 언덕 |
| 칠지·말지 | 별 없는 곳은 안 침(`card_rest_beat`) | 지붕 밑에선 공이 앉아 쉼, 지나가면 자동 토스, 참기도 콤보 +1 |
| 시작·쉼 | 카운트인 "똑딱" + 공 통통 | 받침 쉼 공 까딱 "콩", 카운트인 없음 |
| 실패 | 놓친 별이 두 조각 | 늦음 = 공이 북 옆으로 굴러 떨어짐 / 일찍 = 헛스윙 / 지붕 = 공이 지붕 아랫면에 "퐁" 닿고 떨어짐. 글 없음 |
| 판정 반응·콤보 | 별 커짐 + 빛살, 원 점 줄, 대체 글 "이어서 친 별" | 세로 튐 선 + 공 납작 + 표시 흡수, 둥근 네모 칸 줄 + 큰 표지, 대체 글 "이어서 잘한 수" |
| 재시작 | 1.08 s + 카운트인 | 1.1 s, 받침 쉼 "콩" |
| 화면 이름 | 공·북·별·길(road) | 공·북·그림자·길(path)·표시·구름·지붕·가지·긴 가지·큰 언덕 |
| 판정 순간 문구 | `tut_drum_tap` "별이 북에 오면 톡!" | `tut_tap` "표시가 북에 오면 톡!" |
| 레벨 이름 | 아침 마당 ~ 달(하루 흐름) | 잔디밭 ~ 하늘 꼭대기(길 여행). 글자 겹침 0 |
| 클리어·등급 | 잘했어요! · 작은 북 1~3개 | 높이 올랐어요! / 멀리 왔어요! · 등급 구름 늘 3칸 |

- 같은 것(요청자 허용): 흐름 방향(오른쪽 → 왼쪽)·왼쪽 고정 판정 자리·가로 0.30 W, 화면 이름 공·북·길, 판정 순간 문구 틀("○이 북에 오면 톡!"), 의성어 톡. 바꾸지 않습니다.
- 7-9 ⑦은 글자까지 같은 문구만 실패로 봅니다(1-2 후속 결과: 게임 정체성 문구 겹침 0). rhythm-01 round-3 새 키(`tut_drum_tap`·`card_drum_tap`·`card_run3`·`aria_streak` 등, rhythm-01 10-lore R3-7)와도 글자까지 같은 문구 0(손으로 대조, 보고서).
- "별" 등 rhythm-01 용어 금지어(7-9 ⑤)는 지난 결정대로 검사에 남겨 둡니다(지금 문구 위반 0). 요청자 결정으로 의무는 아니므로 풀지는 오케스트레이터 판단.

### 8-2. runner-01과의 관계 (요청자 허용 겹침, 용어는 다르게 — 1-2에서 20-balance 2-1·30-art 10-2와 대조, R2-D8)

- **겹침은 요청자 요구라 허용**(kickoff 3, D-R2-6): 세상이 오른쪽에서 일정 속도로 흘러오고 플레이어 쪽이 왼쪽에 머무는 구조(runner-01 약 0.37 / 우리 0.30 W), 앞쪽 몇 박을 보고 짧게 정하기(우리는 3.5~4박), "위가 막히면 누르지 않는" 반대 행동(지붕 = runner-01 L7 매달린 위험과 기능 같음), 약 1.1 s 자동 재시작(허브 공통 숙달 리듬).
- **다른 점(글·이름·모양에서 지킴)**: 달리는 캐릭터가 없고(북과 공), 탭 대상은 북이며, 높이를 아이가 정하지 않고 표시 간격이 정함. 지붕 밑은 "위험을 피함"이 아니라 **"공이 앉아 쉼"**(받침 쉼과 같은 말). 물체 모양은 줄무늬 차양 지붕·잎 달린 가지·반타원 언덕·긴 구름·반원 돔 표시(가시·네모 블록·발판·고리·포털 0, art 10-2). 판정은 물체에 닿아서가 아니라 탭 시각(지붕 콩만 탭 때문). 끝은 결승선이 아니라 길이 멈추고 끝 구름 속으로 큰 튐.
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
| R2-D1 | round-2 1-2 | `card_twoballs` 잔재 | **처리**: `strings.json` 키 삭제(84 → 83), 7-3 행 삭제, 예비 문구 후보는 3절 G5 줄에만. art 그림 2장도 삭제됨(7-9 ⑧ 키 없는 그림 0) |
| R2-D6 | round-2 1-2 | W0 이름 "표시" 유지 + 그림 대조 | **처리**: 3절 표 "art와 맞출 것" 칸을 art 실제 모양(반원 돔·줄무늬 차양·잎 가지·반타원 언덕·긴 구름·북 다리)으로 고치고 이름 모두 유지. 카드 8장 문구 ↔ art 8절 칸 그림 ↔ balance 레벨 첫 등장 대조(교차 리뷰 표). `card_three` 그림 힌트를 art 칸으로 맞춤 |
| R2-D7 | round-2 1-2 | 콤보 대체 글(insights) | **처리**: "콤보" 대신 "이어서 잘한 수", 개수 meter는 `aria-valuetext` = 숫자만(6절 4), 판정마다·단계·끊김 때 읽지 않음(6절 5), 최고 콤보 meter·최고 기록 progressbar는 카드 버튼 밖(6절 11). `aria_combo`·`aria_best_combo` 문구 변경, 금지어에 콤보·combo·streak |
| R2-D8 | round-2 1-2 | 세 문서 rhythm-01 구분·runner-01 관계 대조 | **처리**: 8-1에 판정 표식(파란 돔)·화면 구도·실패 모습·콤보 셈(지붕 +1) 행, 8-2에 허용 겹침 4개(흐름·앞쪽 박·지붕·1.1 s 재시작)와 모양·판정·끝 차이. 세 문서 사이 어긋남은 교차 리뷰 이슈 4 |
| X1·X2·X6 | balance 교차 리뷰(1-2 후속) | 8-1 옛 코어 기준 · "셋 세고" 셈 시작점 · 가지 아랫면 숫자 | **처리**: 8-1을 rhythm-01 북길 기준 사실로 다시 씀(balance 2절·art 10-1b 축). 요청자 결정(겹침 다 허용, 동사도 같아도 됨)으로 겹침 때문에 바꾼 낱말·문구 없음, `card_three` → "셋에 톡"(이른 무시 탭 쪽만 남김), 3절 W5 0.34. |
| X-L1·X-L2 | art 17절 | `tut_tap` 자리, `unlock_sound`, 표시·지붕 이름 | **확인**: `tut_tap` EN 5단어·KR 12자는 세로 1줄·가로 2줄(art 4-5 검사), 7-1에 `icon-unlock_sound` 기록, 이름 유지 |

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
- 이어서 잘하면 작은 칸이 하나씩 차올라요.
- 떨어뜨려도 괜찮아요. 바로 다시 시작해요.
- 잔디밭부터 하늘 꼭대기까지, 열 곳의 길.
- 보호자를 위한 소리 맞추기 기능.

**EN**

One drum and one ball set off down the path together. Tap the moment a mark on the path reaches the drum, and the ball bounces right back up. Far marks mean high bounces; close marks mean low ones. Under the village roofs, the ball takes a little rest.

- One finger. One tap.
- Your tap sends the ball up. Just watch the marks coming your way; a little sound delay is no problem.
- Clouds, branches, big hills and roofs: every path brings something new.
- Keep it going and little boxes fill up one by one.
- Dropped it? No worries. You're right back in.
- Ten paths, from a grassy lawn to the top of the sky.
- Sound timing for grown-ups.

- 광고·결제 관련 문구는 수익화 단계 전이라 넣지 않았습니다.

## 11. 남은 위험

| # | 위험 | 심각도 | 이 문서의 처리 |
|---|---|---|---|
| K10 | 지붕 쉬기(반대 행동)가 5~6세에 어려움 | major | 카드 "지붕 밑에선 쉬어요"(겁주지 않는 말) + 손 떨어진 그림, 받침 쉼과 같은 "쉼" 말로 묶음. 아동 테스트는 D-R2-4대로 요청자 선택 목록 |
| K11 | 표시 줄이 노트 레인·runner-01과 닮아 보임 | minor | 이름 "표시"(음표·노트 아님), 8-2 용어 구분, 7-9 ⑤ |
| L6 | "표시"가 5~6세에게 추상적인 낱말 | minor | **1-2 닫음(R2-D6)**: art 모양이 파란 반원 돔이라 더 구체적인 이름이 없고 "조약돌"은 길 장식에 이미 씀 → "표시" 유지. 실제 이해는 아동 테스트(선택)·round-2 리뷰 스크린샷 |
| L10 | 가지·긴 가지 밑에 보이는 촘촘한 표시 수(3·5)가 카드 문구 횟수(2·4)와 다르게 읽힘 | major | 문구 유지, art·balance에 "가지 밑 표시 수 = 횟수" 그림 규칙 요청(교차 리뷰 이슈 1). 고쳐지지 않으면 round-2 리뷰에서 다시 봄 |
| L7 | 카드 키 제안(`card_roof` 등)을 balance가 다르게 정할 수 있음 | minor | **1-2 닫음**: balance W0~W7 = strings = 레벨 card.id 8개 엄격 대조 PASS(7-9 ⑥) |
| L8 | "가지"와 "긴 가지"가 같은 종류 행동(빨리 치기)이라 길이로만 구분 | minor | art 실루엣 길이 차이, 카드 누름 표시 2 vs 4 |
| L9 | `aria_best_combo`를 art가 그리지 않을 수 있음 | minor | **1-2 닫음**: art가 카드 오른쪽 위 금빛 네모로 그림(30-art 6-2·11-1). 남은 위험은 빌드가 버튼 안에 넣는 것(6절 11, dev) |
| L1 | 게임 이름 미확정 + 이름 짜임 | minor | 가안 유지(D15) |
| L3 | "Top of the Sky" ↔ `clear_last` 비슷 | minor | 의도 |
| K9 | 구름에 숨는 동안 박 놓침 | minor | `card_cloud` 그림자 작게 → 크게 + 다음 표시 |
