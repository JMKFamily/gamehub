# 10. 세계관: Pairpaint (짝꿍색칠) — 가안

- 작성: 2026-11-17, lore-writer, 단계 1-1 (balance-designer·art-director와 병렬)
- 수정: 2026-11-18, 단계 1-2 2차 — 오케스트레이터 F4·F5(1-1)·G1~G7(1-2) 반영, 처리표 `reviews/plan-1-2/lore-writer-response.md`.
- 입력: `00-benchmark.md`(0·10·12·13·16-2절 중심), `Docs/orchestrator/2026-11-17-1-0-kickoff.md`(공통 지시 1~10), `harness/criteria.md`(세계관·텍스트, 대상 연령, 게임 감각 마지막 두 줄), `harness/insights.md`, `harness/benchmarks/djmax-judgement.md` 7-3절. 구조 참고(읽기만): `projects/rhythm-02/10-lore.md`.
- 원본 보호: 원작(선 잇기 판 채우기 퍼즐 앱)과 참고 모던 게임 4개(00-benchmark 10-1 R1~R4)의 이름·캐릭터·설정·문구를 쓰지 않았습니다. 이 문서의 이름·문구는 모두 새로 만든 것이고, 시스템 UI 문구 몇 개(`tap_to_start`·`loading` 등)만 허브 공통 UX로 일부러 다른 GameHub 게임과 같게 둡니다(10절).
- 소유권: 판 크기·쌍 수·이동 수 정의·연출 시간 같은 **수치는 `20-balance.md`·`balance.json`·`levels/`**, 색·모양·연출·소리·아이콘은 **`30-art.md`**가 기준입니다. 이 문서는 숫자를 정하지 않습니다.
- **텍스트 원본은 `strings.json`입니다.** 빌드는 이 문서를 파싱하지 않고 `strings.json`만 읽습니다. 9절 표와 JSON이 같은지는 9-9 node 검사로 확인합니다.

---

## 1. 게임 이름 (요청자 확정 필요)

| # | 이름 (EN / KR) | 뜻 | 원작·참고 게임과 구분 | 허브 안 구분 | 스토어 검색 충돌 메모 [추정, 검색 안 함] |
|---|---|---|---|---|---|
| **A (추천)** | **Pairpaint / 짝꿍색칠** | 짝(pair)을 이어 판을 칠(paint)한다 = 규칙 한 문장 그대로 | 원작 이름의 "흐름" 계열 낱말, 참고 게임의 점(Dots)·지퍼(Zip)·고리(Loop)·에너지·링크·Kids 계열 낱말을 하나도 쓰지 않음. "선"·"잇기" 대신 "칠하기"가 중심이라 장르 일반 이름(Numberlink·점 잇기)과도 다름 | 허브의 Reverbound·Tickadrum·Tossaloft가 모두 **T·R로 시작하는 리듬 동작 합성어**라 P 시작·"칠하기" 뜻으로 겉모양이 확실히 다름. Orbit Dodge(우주 회피)와도 겹침 없음. 한국어 4음절은 높이통통과 같은 리듬이지만 낱말이 다름 | 중간. "Pair"·"Paint"는 흔한 낱말이라 띄어 쓴 "Pair Paint"는 색칠·짝 맞추기 앱이 있을 수 있음 → **붙여 쓴 한 낱말 Pairpaint**로 등록. 한국어 "짝꿍"은 아동 상품 이름에 흔함(검색 상위에 다른 상품이 섞일 수 있음), "짝꿍색칠" 조합은 드물 것으로 봄 |
| B | Tintrail / 색깔길 | 색(tint)이 지나간 길(trail) | 원작·참고 게임 낱말 없음 | **T로 시작하는 7~9글자 합성어**라 Tickadrum·Tossaloft와 이름 꼴이 비슷해 허브에서 헷갈림 | 낮음(만든 낱말). 다만 한국어 "색깔길"은 일반 구절이라 검색 구분이 약함 |
| C | Fillmates / 칸칸짝꿍 | 칸을 채우는(fill) 짝꿍들(mates) | 원작·참고 게임 낱말 없음 | 겹침 없음 | 낮음(만든 낱말). 영어 "mates"가 한국 보호자에게 덜 익숙하고, 한국어 이름과 영어 이름 뜻이 덜 맞음 |

- **추천 A**: 아이에게 하는 말("같은 색 짝꿍을 이어서 색칠해요")과 이름이 같아 이름이 곧 규칙 설명이 됩니다. 허브 안 다른 네 게임과 첫 글자·뜻이 모두 다릅니다.
- 확인 필요: 이 역할은 웹 검색 도구가 없어 실제 스토어 검색을 하지 못했습니다. 1-3 전에 오케스트레이터(또는 benchmark-analyst)가 앱스토어·플레이스토어에서 "Pairpaint", "Pair Paint", "짝꿍색칠"을 한 번 검색해 같은 이름의 퍼즐 앱이 없는지 확인해 주세요. 있으면 B가 아니라 C를 대안으로 권합니다(B는 허브 안 구분이 약함).

## 2. 세계관과 톤 (아주 얇게)

하루가 시작되는 마당에서 하루가 끝나는 노을 하늘까지, 같은 색 짝꿍 점 두 개가 판 여기저기 떨어져 있습니다. 손가락으로 길을 이어 주면 짝꿍이 만나고, 지나간 칸이 그 색으로 물듭니다. 빈칸이 하나도 없이 알록달록해지면 그 장소가 완성되고, 지도 위 다음 장소가 밝아집니다.

- 톤: 조용하고 다정함. 서두르지 않음(시간 제한·실패 없음). "틀렸다" 대신 "아직 빈칸이 있네".
- 설명보다 분위기: 이야기 글·대사·캐릭터 없음. 하루의 흐름(아침 → 노을)은 **바탕 그라디언트 색만으로** 보여 줍니다(4절 시각 힌트). 아트 컨셉을 약하게 두라는 원칙에 따라 장소는 이름과 바탕 색 정도로만 드러납니다.

## 3. 주인공(플레이어 오브젝트)

- 정체: 따로 캐릭터를 두지 않습니다. 주인공은 **아이 손가락이 끄는 색 선(길)** 이고, 화면의 색 점 한 쌍이 "만나고 싶은 짝꿍"입니다. 점은 기본 도형(원 + 안쪽 모양 표지, 30-art)이며 눈·입을 그리지 않습니다(약한 아트 컨셉).
- 왜 멈추지 않는가(러너 질문의 퍼즐판 답): 달리지 않습니다. 대신 **짝꿍은 만나야 가만히 있고, 판은 다 칠해져야 끝납니다.** 한 판을 칠할 때마다 지도 길이 한 칸 더 칠해지고, 하루가 노을까지 흘러갑니다. 아이에게 "다음 장소도 칠해 볼까?"가 다음 판으로 가는 이유입니다.

## 4. 화면에 보이는 모양 이름 (화면 글에 이것만 씀)

| 화면 모양 | KR | EN | 쓰는 키 |
|---|---|---|---|
| 색 원(끝점) | 점 | dot | `aria_board`, `tut_drag` |
| 손가락이 그린 굵은 선 | (글로 부르지 않음, "이어요"로) | (join) | `aria_board`, `tagline` |
| 격자 한 칸 | 칸 / 빈칸 | square | `card_fill`, `gap_left` |
| 격자 전체 | 판 | board | `clear_title_2`, `btn_next` |
| 칸이 없는 자리(구멍 칸 기믹) | 구멍 | hole | `card_hole` |
| 결과 별 | 별 | star | `result_star`, `aria_map_stars` |
| 레벨 선택 화면 | 지도 | map | `btn_map` |

- 기획 이름(쌍·이동 수·판정·콤보·직선 착각 등)은 화면 글에 쓰지 않습니다. "짝꿍"은 게임 이름(`title`)에만 쓰고 플레이 중 문구에는 쓰지 않습니다(화면 모양 이름 원칙).

## 5. 아이용 한 문장 규칙

- 1-0 후보: "같은 색 점을 이어서 판을 색으로 가득 칠하기." → 검토
  - 좋은 점: "잇기 + 칠하기" 두 조건을 한 문장에 묶음.
  - 고칠 점: ① "가득"은 추상적이라 "빈칸이 남으면 안 끝난다"(위험 K1)를 바로 떠올리게 하지 못함 ② "판"은 아이가 잘 쓰지 않는 말 ③ 하라는 말(명령형) 대신 권하는 말이 5~6세 톤에 맞음.
- **확정 문장(가안)**: **"같은 색 점을 이어서, 빈칸 없이 다 칠해요."** / **"Join same-color dots and fill every square."**
  - "빈칸"을 문장에 넣어 빈칸 숨 쉬기 신호(`gap_left`, 00-benchmark 10-3)와 낱말을 맞췄습니다. 구멍 칸은 칸이 아니므로(그림상 칸이 없음) 문장과 어긋나지 않습니다(L6 카드 `card_hole`이 따로 알림).
  - 이 문장은 스토어·보호자 화면용 설명이고, 플레이 화면에는 12자 한도에 맞춘 조각(`tut_drag`, `card_fill`)으로 나눠 그림과 함께 씁니다.

## 6. 판정 이름·콤보·퍼센트: 퍼즐에 쓰는 법 (lore 의견)

1-0 권장 "부분 적용"(판정 = 한 쌍 연결, 이름 3단 모두 칭찬, 결과 화면 % + 별)에 **동의**합니다. 결과 %는 1-2 G2로 "한 번에 이은 쌍 / 쌍 수"가 됐습니다(6-4). 아래는 글·대체 글 쪽 결정입니다. 등급 경계(그 색 이동 수 1 / 2 / 3 이상)와 계산은 balance-designer가 확정합니다.

### 6-1. 판정 이름 3개

| 등급 (데이터) | 뜻 (1-0 G1) | 키 | KR | EN | 이유 |
|---|---|---|---|---|---|
| 1단 | 그 색을 한 번에 이음 | `judge_1_name` | **최고야** | **Wow!** | 가장 큰 칭찬. 별(100 %)로 가는 연결 |
| 2단 | 두 번째에 이음 | `judge_2_name` | **멋져** | **Nice** | 고쳐 그린 것도 멋진 일 |
| 3단 | 세 번 이상 만에 이음 | `judge_3_name` | **해냈어** | **Yay!** | 퍼즐에서 3단은 "끈기"의 결과라, 끝까지 해낸 것을 칭찬하는 말. 시험 말투("통과")·아쉬움 말투 없음 |

- 길이: 한국어 2~3자, 영어 2~4자 + 느낌표(djmax 7-3). 리듬 세 게임의 "딱이야/좋아/됐어"와 한국어가 겹치지 않아 이 게임 소리가 따로 납니다(영어 Wow!/Nice는 허브 공통 칭찬으로 같아도 됨, 요청자 "겹침 허용").
- 글을 못 읽어도 구분: 글자 크기(1단 가장 큼)·튐 세기·연결음 층으로 등급이 보이고 들려야 합니다(art). 2단·3단도 회색·빨강 금지.
- 자리(F5 확정): **판 밖**. 세로 화면 = 판 바로 위 띠, 가로 위치는 방금 이은 짝 점과 같은 x / 가로 화면 = 짝 점 쪽 기둥, 세로 위치는 그 점과 같은 y(`balance.json judge.name_anchor` `outside_board_same_axis`, 자리 값은 30-art 4-3·`layout.json`). 판 안의 반응은 점 튐·고리·조각만이라 다음에 이을 점·선을 가리지 않습니다(00-benchmark 13-2). 이름 바로 아래 작은 판 채움 %(6-4).

### 6-2. 퍼즐에서 이름을 **쓰는** 이유

1. 연결 순간이 아이가 "해냈다"를 느끼는 실제 순간입니다. 리듬의 탭 판정처럼 짧고 분명한 성공에 말 한마디를 붙이면 손맛(00-benchmark 10-3)이 커집니다.
2. 실패 이름이 없고 세 이름이 모두 칭찬이라, 이리저리 그어 보는 탐색이 벌로 느껴지지 않습니다.
3. 이름은 이미 있는 값(그 색 이동 수)에서 계산만 하는 표시 층이라 규칙·난이도·정답 누설에 영향이 없습니다(정답 길인지 여부는 알려 주지 않음).

### 6-3. 이름을 **안 쓰는** 경우

| 상황 | 표시 | 이유 |
|---|---|---|
| 잘림(다른 색 선이 끊김)·막힘(다른 색 점)·연결 풀림(되돌아가기·되돌리기·처음부터) | 이름 없음, 글 없음 | 실패처럼 보이는 순간에 말을 붙이지 않음(콤보 끊김 무음 원칙) |
| 다 이었는데 빈칸 남음 | 판정 이름 없음. 빈칸 숨 쉬기 그림이 먼저·주 신호, `gap_left`는 대체 글(live, 사건마다 1번) + **3번째 숨 쉬기에서만** 판 밖 글 자리(`board_text`)의 작은 보조 글(G6). 판정 이름이 오면 그 프레임에 보조 글을 숨김 | 이건 판정이 아니라 "아직"이라는 안내. 그림을 두 번 본 뒤에만 글 |
| 판을 완성한 **마지막** 연결 | 이름은 뜨되 판 완료 연출 시작 뒤 30-art 4-3·`layout.json motion.complete` 시간(완료 +150 ms부터 150 ms)에 흐려짐(겹쳐 쌓지 않음) | 완료 축하가 주인공. 이름이 완료 연출 위에 남으면 화면이 복잡 |
| 도움 버튼의 손가락 시연(정답 선 하나 보여 주기) | 이름 없음 | 아이가 한 연결이 아님 |
| 레벨 1 첫 손가락 시연 | 이름 없음(시연 뒤 아이가 직접 이었을 때 처음 뜸) | 같음 |
| 낭독(스크린 리더) | 판정마다 읽지 않음(캔버스 또는 `aria-hidden`) | insights 콤보 대체 글 규칙 |

- 대안 의견: 아동 테스트에서 이름이 어지럽다는 반응이 나오면 "1단만 이름, 2·3단은 튐과 소리만"으로 줄이는 것을 권합니다(글 수 줄이기).

### 6-4. 콤보(쌍 점 줄)와 퍼센트

- 쌍 점 줄(1-0 C1): 화면 글 없음. 대체 글 `aria_pairs` "이은 색 수 / Colors joined", `role="meter"`, `aria-valuenow` = 지금 이어진 쌍 수, max = 그 판 쌍 수, `aria-valuetext` = 숫자만("3"). "콤보·연속" 말은 쓰지 않습니다. 풀릴 때 읽지 않음.
- **플레이 중 판 채움 %(F4·G3 확정)**: 판정 이름 바로 아래 작은 숫자(예 "62%"), 앞에 칠한 칸 그림표(`icon-filled`). 값 = **연결된 쌍이 칠한 칸만** 센 ⌊100·칸 수/판 칸 수⌋(이어지지 않은 선·끄는 중인 선 밑 칸은 세지 않음 → 화면에 tint로 칠해진 칸과 숫자가 늘 같음). 판정 이름과 같은 시간축으로 나타나고 사라짐(시간은 balance 정함). **대체 글 키 없음, `aria-hidden`**(판정 이름과 같은 순간 표시라 판정마다 읽지 않는 규칙). 이름과 한 줄로 붙이지 않음(8절 10). — 1-1 lore 의견("표시 안 함")은 기록으로만 두고, 1-5 리뷰에서 결과 %와 헷갈리는지 확인합니다(13절 L6).
- **결과 화면(G2 확정)**: 완성 미니 판(`result_check`, 늘) + 별(`result_star`, 100 %일 때) + 작은 숫자 "80%"와 한 번에 이은 그림표(`icon-one_go`, `result_accuracy` 대체 글). 결과 % = **한 번에 이은 쌍 수 / 쌍 수 × 100(내림)**, 예: 5쌍 중 4쌍을 한 번에 이으면 80 %. 한 번 이었다가 풀린 뒤 다시 이은 색은 한 번에 이은 것이 아님(정의는 20-balance). 100 % ⇔ 별 ⇔ 모든 연결 1단. 별이 주 신호, %는 작게. `percent.result_hide_pct_below` = null이라 `result_accuracy` meter는 늘 있음. **따로 "한 번에 이은 쌍" 표지·키(`result_one_go` 등)는 두지 않습니다** — %가 바로 그 값입니다(G2). 최고 콤보는 늘 쌍 수와 같아 두지 않습니다(키 없음).

## 7. 레벨 테마 (10개) — 하루 여행 (아침 → 노을)

판 크기·쌍 수·새 요소는 00-benchmark 6-2 초안을 따른 것이고 balance가 확정합니다. 시각 힌트는 **색·도형 수준**만입니다(바탕 그라디언트 두 색 + 판 둘레의 아주 작은 기본 도형 장식 하나 이하, 그림·캐릭터 없음).

| L | 이름 (KR / EN) | 장소 | 분위기 키워드 | 아티스트 시각 힌트 | 밸런스 기믹 힌트 |
|---|---|---|---|---|---|
| 1 | 햇살 마당 / Sunny Yard | 아침 마당 | 처음, 따뜻함, 천천히 | 연노랑 → 크림 바탕. 둥근 모서리 판, 또렷한 3색 빨강·파랑·노랑(palette p1~p3, 10레벨 같은 순서 — 색약 안전 순서라 바꾸지 않음). 따뜻함은 바탕 그라디언트가 맡음 | 4x4·3쌍, 손가락 시연(`tut_drag`). 시연 길 = 실제 첫 쌍의 답 길 |
| 2 | 튤립 화분 / Tulip Pots | 창가 화분 | 꼼꼼히, 다 채우기 | 연분홍 → 크림. 판 둘레 작은 원 3개 | 4x4·3쌍, **빈칸 채우기 소개**(`card_fill`): 다 이어도 빈칸이 남을 수 있는 판 |
| 3 | 물놀이 해변 / Splash Beach | 해변 | 넓어짐, 시원함 | 하늘색 → 모래색. 물결 대신 가는 곡선 하나 | 5x5·4쌍, 판 커짐(카드 없음). L3는 r을 지키는 쉬운 구조로(insights) |
| 4 | 구불구불 숲 / Winding Woods | 숲길 | 돌아가기, 꺾임 | 연두 → 연초록. 판 둘레 세모 2개 | 5x5·4쌍, 꺾임 많은 긴 선(카드 없음) |
| 5 | 과일 가게 / Fruit Stand | 시장 | 알록달록, 색 하나 더 | 살구 → 연노랑. 원 여러 개(과일 느낌은 색만) | 5x5·5쌍, 색 추가(카드 없음) |
| 6 | 징검다리 연못 / Stepping Stone Pond | 연못 | 건너뛰기, 조심조심 | 물빛 청록 → 연하늘. **구멍 칸은 칸이 없고 바탕 물빛이 보임** — 첫 구멍은 둘레가 모두 칸인 **판 안쪽 구멍**(돌 사이 물, G1) | 5x6·5쌍, **구멍 칸 소개**(`card_hole`). 카드 그림 구멍 = 이 판의 실제 첫 구멍(`levels/06 hole_card.first_hole`, 판 안쪽). balance가 안쪽 구멍 판을 못 고르면 둘레 구멍은 art 외곽선 파내기 규칙으로 그리고 낱말 "구멍"은 유지 |
| 7 | 큰 꽃정원 / Big Blossom Park | 공원 | 크다, 여유 | 연보라 → 연분홍. 판 둘레 작은 네모 2개 | 6x6·5쌍, 판 커짐(카드 없음) |
| 8 | 돌담 길 / Stone Wall Lane | 골목 돌담 | 먼 길 돌아가기 | 따뜻한 회베이지 → 크림(회색 단색 금지, 판과 대비). 구멍 칸 여럿 | 6x6·5쌍, 구멍 칸 + 긴 우회(새 규칙 아님) |
| 9 | 무지개 들판 / Rainbow Meadow | 들판 | 가장 많은 색 | 연하늘 → 연노랑. 판 둘레 옅은 호 3개(쌍 점 줄과 헷갈리지 않게 점 모양은 쓰지 않음, art A3) | 6x6·6쌍, 색 추가(카드 없음) |
| 10 | 노을 하늘 / Sunset Sky | 저녁 하늘 | 마무리, 다 모음 | 아주 옅은 살구빛 주황 → 연보라. 완료 때만 판 모서리 뒤로 작은 별 3개(번쩍임 없이, 30-art) | 6x6·6쌍, 새 요소 없음(종합). 클리어 문구 `clear_last` |

- 레벨 이름은 rhythm-01(꽃밭·바닷가·노을 언덕 등)·runner-01(달팽이 정원 등)·rhythm-02 레벨 이름과 글자까지 같은 것이 없습니다(9-9 ⑦).
- 진행 지도 노드는 완성 판 미니 그림이 주 구분이고(00-benchmark 10-4), 레벨 이름은 대체 글·결과 화면 보조 글입니다. 지도 바탕은 메뉴 바탕 하나(30-art 5-2)이고, 하루 흐름(아침 → 노을)은 **레벨 바탕 색에서만** 보입니다(노드 미니 그림·결과 화면 이름 띠가 그 판 바탕색을 씀).

## 8. 텍스트 규칙 (빌드·리뷰 공통)

1. **플레이 중 문구와 메뉴 글은 한 문장, 한국어 12자 이내(공백 포함) / 영어 6단어 이내.** 구분 `어른`·`스토어`만 예외. 9-9 자동 검사.
2. **화면에 보이는 모양 이름만**(4절). "짝꿍·콤보·판정·이동·연속" 같은 기획 말은 플레이 중 글에 쓰지 않음.
3. 한국어 `word-break: keep-all`, 언어는 `navigator.language`(ko면 ko, 그 밖 en), 보호자 화면에서만 바꿈. `lang_ko`·`lang_en`은 어느 언어에서도 자기 이름.
4. **대체 글(aria) 이름에 숫자·값을 이어 붙이지 않습니다.** 값은 속성으로만(insights 콤보 대체 글 줄, rhythm-02 접근성 트리 줄).
   - **개수**(`aria_pairs` 이은 쌍 수, `aria_map_stars` 모은 별 수): `role="meter"`, `aria-valuenow` = 그 수, min 0, max = 쌍 수 / 10, **`aria-valuetext` = 숫자만**("3"). 낱말("개·쌍·번")을 붙이지 않음.
   - **비율**(`aria_best_fill` 풀다 나간 판의 칠한 만큼): `role="progressbar"`, min 0·max 100, `aria-valuetext` 없음.
   - **정확도**(`result_accuracy`): `role="meter"`, min 0·max 100, `aria-valuenow` = 정수, `aria-valuetext` = 화면과 같은 "83%".
   - 키 두 개를 잇는 곳은 지도 노드 버튼 한 곳뿐: `levelN_name` + 쉼표 + 상태 키 하나(`node_locked`·`node_next`·`node_partial`·`node_done`·`node_star` 중 하나).
5. **지도 노드의 값 요소는 버튼 밖**: `aria_best_fill` progressbar는 노드 버튼 안에 넣지 않고 같은 목록 칸 안 **버튼의 형제 요소**로 둡니다(버튼 `aria-label`이 자식을 묻음, insights). `aria_map_stars`는 지도 화면에 하나.
6. **`aria-live`는 두 곳만**: `gap_left`(polite, "다 이었는데 빈칸" 사건마다 한 번, 숨 쉬기 반복 때 다시 읽지 않음)와 결과 화면 진입(제목 `clear_*`). 연결·판정 이름·쌍 점 줄 값 변화·잘림·되돌리기는 읽지 않습니다. `aria-hidden` 요소에 `aria-label`을 붙이지 않습니다.
7. **튜토리얼 그림 = 바로 뒤 실제 물체.** L1 손가락 시연은 L1 첫 쌍(실제 색·모양 표지)의 점에서 시작해 실제 답 길을 따라 짝 점까지, 화면 고정 위치가 아니라 그 점 기준 위치. L2 `card_fill` 그림의 빈칸 = L2 `fill_card.empty_cells`(맞닿은 노랑 쌍을 곧게 이으면 남는 왼쪽 위 모서리 2칸), L6 `card_hole` 그림의 구멍 = L6 `hole_card.first_hole`(판 안쪽 구멍, G1). 세 그림 모두 art가 레벨 JSON을 읽어 생성(손으로 그리지 않음, G1 2차 순서). 그림 속 점 렌더 ≥ 16 px(실제 화면 px로 잼).
8. **글을 못 읽어도 진행 가능**: 타이틀(▶·손가락), 지도(미니 그림 노드·숨 쉬는 다음 노드), 플레이(손가락 시연·카드 그림·빈칸 숨 쉬기), 결과(다 칠한 표시·별·그림 버튼), 보호자 화면은 길게 누르기(어른용), **불러오기 오류(↻ 그림 인라인)**. `notext` 화면에서 L1을 시작·완료할 수 있어야 함(QA).
9. **부트 키**(`title`·`loading`·`load_error`·`load_error_detail`·`btn_reload`)는 빌드 스크립트가 두 언어로 `index.html` 부트 블록에 넣고, 언어를 정한 직후 `document.documentElement.lang`·`document.title`(= 그 언어 `title`)을 바꿉니다. ↻ 그림도 부트 블록에 인라인(criteria 세계관 rhythm-02 줄).
10. 치환 자리 없음. 숫자 글(결과 %, 플레이 중 판 채움 % — F4 확정)은 따로 그리고 문장 안에 끼우지 않으며 판정 이름과 한 줄로 붙이지 않습니다("최고야 100%" 금지).
11. **클리어 문구 선택 규칙**: L10 → `clear_last`(별이면 별 표지 함께) / 별(100 %) → `clear_star` / 그 밖 → `clear_title_n`, n = ((레벨 번호 − 1) mod 3) + 1. 무작위가 아니라 레벨로 정해 QA 스크린샷이 재현됩니다.
12. 빌드는 `strings.json`만 읽고 코드에 문구를 쓰지 않습니다. 66개 키는 모두 쓰는 키입니다(예비 키 없음). 쓰지 않게 되면 DEV_NOTES에 이유(criteria).

## 9. 텍스트 키 표 (KR / EN)

- 구분: **★** = 플레이 중(튜토리얼·카드·판정 이름·안내) / **화면** = 메뉴·결과의 보이는 글 / **aria** = 대체 글 전용 / **어른** = 보호자 화면 긴 글(한도 없음) / **스토어**.
- 버튼은 그림 버튼이고 `btn_*`는 대체 글(일부는 보조 글). 아이콘 모양은 30-art.
- 표의 KR·EN 칸은 `strings.json`과 글자 하나까지 같아야 합니다(9-9).

### 9-1. 타이틀 (3개)

| 키 | 구분 | KR | EN | 쓰는 곳·그림 힌트 |
|---|---|---|---|---|
| `title` | 화면 | 짝꿍색칠 | Pairpaint | 타이틀 로고(가안, 요청자 확정 필요). **부트 키**(문서 제목) |
| `tagline` | 화면 | 같은 색끼리 이어요 | Join the matching colors | 로고 아래 작은 글. 옆에 같은 색 점 두 개가 선으로 이어지는 짧은 반복 그림(타이틀 장식, 판 아님) |
| `tap_to_start` | 화면 | 눌러서 시작 | Tap to start | ▶ 버튼 대체 글 + 손가락 그림 옆 글. 오디오 잠금 해제도 첫 탭(공통 UI) |

### 9-2. 진행 지도 (18개)

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `map_screen` | aria | 어디를 칠할까요? | Where shall we paint? | 지도 목록(`role="list"`) 이름. 화면 제목 글은 두지 않음 |
| `level1_name` | 화면 | 햇살 마당 | Sunny Yard | 노드 버튼 이름 앞부분 + **결과 화면 제목 위 작은 글**(G7: art layout `result` 글 자리, 지도와 같은 이름, 글을 못 읽어도 노드 그림과 같은 그 판 바탕색 띠 위에 써서 연결). 자리를 못 두면 결과 미니 판 img 이름(aria)으로만 |
| `level2_name` | 화면 | 튤립 화분 | Tulip Pots | 같음 |
| `level3_name` | 화면 | 물놀이 해변 | Splash Beach | 같음 |
| `level4_name` | 화면 | 구불구불 숲 | Winding Woods | 같음 |
| `level5_name` | 화면 | 과일 가게 | Fruit Stand | 같음 |
| `level6_name` | 화면 | 징검다리 연못 | Stepping Stone Pond | 같음 |
| `level7_name` | 화면 | 큰 꽃정원 | Big Blossom Park | 같음 |
| `level8_name` | 화면 | 돌담 길 | Stone Wall Lane | 같음 |
| `level9_name` | 화면 | 무지개 들판 | Rainbow Meadow | 같음 |
| `level10_name` | 화면 | 노을 하늘 | Sunset Sky | 같음 |
| `node_locked` | aria | 아직 잠겨 있어요 | Not open yet | 노드 상태(흐린 원). 이름 = `levelN_name` + ", " + 이 키 |
| `node_next` | aria | 이번에 할 판 | Up next | 노드 상태(천천히 숨 쉬는 원) |
| `node_partial` | aria | 칠하다 멈췄어요 | Partly filled | 풀다 나간 판. 그림: 노드 테두리 바깥 호가 칠한 칸 비율만큼 12시부터 늘어남(숫자 없음, `node-partial.svg`). 비율 = 연결된 쌍이 칠한 칸 기준 최고값(G3, 판 채움 %와 같은 셈). criteria 게임 감각 "최고 진행도가 지도에 보임" |
| `node_done` | aria | 다 칠했어요 | All filled | 완료(완성 미니 그림) |
| `node_star` | aria | 한 번에 다 칠했어요 | Filled in one go | 완료 + 별(미니 그림 옆 작은 별) |
| `aria_best_fill` | aria | 칠한 만큼 | How much is filled | `node_partial` 노드의 progressbar(0~100 = 연결된 쌍이 칠한 칸 기준 최고 판 채움 %, valuetext 없음). **버튼 밖 형제 요소**(8절 5) |
| `aria_map_stars` | aria | 모은 별 | Stars collected | 지도 화면 별 모음 표지 meter(max 10, valuetext 숫자만). 화면 글 없음 |

### 9-3. 튜토리얼·그림 카드 (3개) — 그림이 주, 글은 보조

| 키 | 구분 | KR | EN | 레벨 | 그림 힌트 (글을 못 읽어도) |
|---|---|---|---|---|---|
| `tut_drag` | ★ | 같은 색 점까지 끌어요 | Drag to the same color | L1 | 레벨 시작 잠깐 뒤 손가락이 L1 **실제 첫 쌍**(빨강·하트, `tutorial.demo_drag`) 점을 누르고 답 길을 칸마다 따라 짝 점까지 끈 뒤 잠깐 머물고 사라짐(지나간 칸에 옅은 선이 함께 그려졌다 사라짐, 판은 바뀌지 않음). 짧게 쉬고 반복하고, 두 번 뒤에는 조금 길게 쉼. **아이 손이 판에 처음 닿으면 손가락은 그 자리에서 사라지고**, 판이 오래 그대로면 한 번 더 나옴. 글은 아이가 처음 한 쌍을 이을 때 사라짐. 손가락은 그 점 기준 위치. 시간 값(시작 0.5 s·칸당 0.26 s·쉼 1.2 s·2회 뒤 3 s·다시 보임 8 s 등)은 `balance.json tutorial`·`layout.json motion.tutorial`이 원본 |
| `card_fill` | ★ | 빈칸도 다 칠해요 | Fill every square | L2 | 카드(L2 왼쪽 위 부분, 실제 색·표지): 맞닿은 노랑·별 점 두 개를 곧게 이었더니 왼쪽 위 모서리 빈칸 2개가 숨 쉼 → 손가락이 노랑 선을 빈칸 쪽으로 돌려 이어 판이 꽉 참 → 작은 반짝임(실제 판 완료와 같은 색 조각, ✓ 아님). 빈칸 자리 = `levels/02 fill_card.empty_cells` |
| `card_hole` | ★ | 구멍은 안 칠해도 돼요 | Holes stay empty | L6 | 카드(L6 첫 구멍 둘레 부분, 실제 색·표지): 판 안쪽, 칸이 없는 구멍(바탕 물빛이 보임) 옆으로 선들이 지나가고, 구멍만 빈 채 판이 다 칠해짐 → 작은 반짝임(✓ 아님). 구멍 자리·둘레 쌍 = `levels/06 hole_card.first_hole`(G1 재선정 결과를 art가 읽어 그림) |

- 레벨당 새 요소 1개 이하. L3·L5·L7·L9(판 커짐·색 추가)는 새 규칙이 아니라 카드를 두지 않습니다(balance가 카드가 필요하다고 정하면 키를 더함). 카드 id는 이 키 이름 그대로 `balance.json`·`levels/*.json`에 씁니다.

### 9-4. 플레이 화면 (10개)

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `aria_board` | aria | 같은 색 점을 이어요 | Join the matching dots | 판 캔버스 이름. 칸·점마다 대체 글 없음 |
| `aria_pairs` | aria | 이은 색 수 | Colors joined | 쌍 점 줄(1-0 C1) meter. valuenow = 이어진 쌍 수, max = 쌍 수, valuetext 숫자만. 읽지 않음(live 아님) |
| `gap_left` | ★ | 빈칸이 남았어요 | Some squares are empty | "다 이었는데 빈칸" 신호. 주 신호는 빈칸 숨 쉬기 그림. 이 글은 `aria-live` polite 1회(사건마다, 숨 쉬기 반복 때 다시 읽지 않음) + **3번째 숨 쉬기 때만** 판 밖 글 자리(`layout.json text_slots` `board_text`: 세로 판 아래, 가로 기둥)의 작은 보조 글(G6). 판정 이름이 오면 그 프레임에 숨김. 칭찬 쪽 색, 경고 아이콘 없음 |
| `judge_1_name` | ★ | 최고야 | Wow! | 판정 이름 1단(그 색 한 번에 이음). 판 밖 띠(세로 = 판 위, 짝 점과 같은 x / 가로 = 짝 점 쪽 기둥, 같은 y, F5), 가장 큰 글자(크기는 30-art 4-3). 아래에 작은 판 채움 %(aria-hidden). 읽지 않음 |
| `judge_2_name` | ★ | 멋져 | Nice | 판정 이름 2단(두 번째에 이음). 중간 글자 |
| `judge_3_name` | ★ | 해냈어 | Yay! | 판정 이름 3단(세 번 이상). 작은 글자, 회색·빨강 금지 |
| `btn_undo` | aria | 한 번 되돌리기 | Undo | ↶ 그림 버튼 |
| `btn_restart` | aria | 처음부터 | Start over | ↻ 그림 버튼(판이 부드럽게 비워짐) |
| `btn_help` | aria | 도와줘 | Show me | 도움 그림 버튼(30초 변화 없으면 숨 쉼, 누르면 정답 선 하나 시연). 결제·광고 없음 |
| `btn_map` | aria | 지도로 | Map | 플레이·결과 화면의 지도 그림 버튼 |

### 9-5. 판 완료·결과 (11개)

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `clear_title_1` | 화면 | 알록달록 다 칠했어요! | All colored in! | 결과 제목(L1·4·7, 별 아닐 때) |
| `clear_title_2` | 화면 | 판이 꽉 찼어요! | The board is full! | 결과 제목(L2·5·8) |
| `clear_title_3` | 화면 | 예쁘게 칠했어요! | So pretty! | 결과 제목(L3·6·9) |
| `clear_star` | 화면 | 한 번에 다 했어요! | All in one go! | 별(100 %)일 때 제목(L10 제외) |
| `clear_last` | 화면 | 노을까지 다 칠했어요! | You painted the sunset! | L10 완료(레벨 이름 되부름) |
| `result_accuracy` | aria | 한 번에 이은 정도 | Joined in one go | 결과 %(작은 숫자 + 한 번에 이은 그림표 `icon-one_go`, 별이 주)의 meter. valuenow = ⌊100·한 번에 이은 쌍 수/쌍 수⌋(G2, 예 5쌍 중 4쌍 → 80), valuetext "80%". 화면에 "정확도" 글자 없음. 따로 "한 번에 이은 쌍" 표지·키 없음 |
| `result_check` | aria | 다 칠한 표시 | Board filled | 늘 보이는 완성 미니 판 img(✓ 표시 아님, 30-art L5) |
| `result_star` | aria | 별을 받았어요 | You got a star! | 100 %일 때 별 img |
| `result_new_best` | aria | 지난번보다 잘했어요 | Better than last time! | 그 레벨 이전 최고 %보다 높을 때 % 옆 작은 표지 img(글 없는 위쪽 표지, art가 그림·자리 추가 — G7). 첫 완료·100 % 재달성에는 없음 |
| `btn_next` | aria | 다음 판 | Next board | ▶ 그림 버튼 |
| `btn_again` | aria | 다시 칠하기 | Paint again | ↻ 그림 버튼(별을 노릴 때). 판정 실패 뜻 없음 |

### 9-6. 버튼·보호자 화면 (16개)

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `btn_settings` | aria | 설정 | Settings | 지도 구석 톱니 그림 버튼(`aria-describedby` → `guardian_hold`) |
| `btn_close` | aria | 닫기 | Close | 보호자 화면 ✕ |
| `guardian_hold` | 화면 | 어른은 길게 누르세요 | Grown-ups: press and hold | 지도 톱니 버튼 가까이 작은 글(자리는 art layout `map` text_slots, G7) + 길게 누르기 진행 그림 |
| `guardian_title` | 화면 | 보호자 설정 | For grown-ups | 보호자 화면 제목(dialog 이름) |
| `guardian_intro` | 어른 | 같은 색 점을 선으로 잇고, 빈칸 없이 판을 칠하면 끝나는 퍼즐입니다. 시간 제한과 실패가 없어서 천천히 생각해도 됩니다. 결과 화면의 %는 한 번에 이은 색의 비율입니다. 예를 들어 5쌍 중 4쌍을 한 번에 이으면 80 %이고, 모두 한 번에 이으면 100 %로 별을 받습니다. 이었다가 지우고 다시 이은 색은 한 번에 이은 것으로 세지 않습니다. 놀이 중 칭찬 아래 작은 %는 판을 칠한 만큼입니다. | Join each pair of matching dots with a line and fill every square to finish. There is no timer and no way to fail, so take your time. The % on the result screen is the share of color pairs joined in one go: 4 of 5 pairs makes 80%, and all pairs in one go makes 100% and earns a star. A pair that was joined, undone and joined again does not count as one go. The small % under each cheer during play shows how much of the board is filled. | 보호자 화면 설명 |
| `settings_sound` | 화면 | 소리 | Sound | 보호자 화면 스위치 + **지도 소리 켬/끔 그림 버튼 이름**(새 키 없이, 상태는 `aria-pressed`) |
| `settings_vibrate` | 화면 | 진동 | Vibration | 스위치 |
| `vibrate_note` | 어른 | 진동은 지원하는 기기(주로 안드로이드)에서만 나요. 진동이 없어도 소리와 그림으로 모두 알 수 있어요. | Vibration works only on supported devices (mostly Android). Sound and pictures show everything without it. | 진동 스위치 아래 작은 글(00-benchmark 10-5) |
| `settings_motion` | 화면 | 움직임 줄이기 | Less motion | 스위치. 기본값 = 기기 `prefers-reduced-motion` |
| `settings_lang` | 화면 | 언어 | Language | 언어 고르기 제목 |
| `lang_ko` | 화면 | 한국어 | 한국어 | 언어 버튼(자기 이름) |
| `lang_en` | 화면 | English | English | 언어 버튼(자기 이름) |
| `settings_reset` | 화면 | 기록 지우기 | Clear progress | 버튼 |
| `confirm_reset` | 화면 | 기록을 다 지울까요? | Clear all progress? | 확인 창 |
| `confirm_yes` | 화면 | 지우기 | Clear | 확인 창 버튼 |
| `confirm_no` | 화면 | 그대로 두기 | Keep it | 확인 창 버튼(기본 초점) |

### 9-7. 불러오기·오류·스토어 (5개)

| 키 | 구분 | KR | EN | 쓰는 곳 |
|---|---|---|---|---|
| `loading` | ★ | 불러오는 중… | Loading… | **부트 키**. 점 두 개가 선으로 천천히 이어지는 인라인 그림과 함께 |
| `load_error` | ★ | 다시 해 주세요 | Please try again | **부트 키**. ↻ 버튼 설명 |
| `load_error_detail` | 어른 | 게임을 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요. | The game couldn't load. Please tap to try again in a moment. | **부트 키**. 오류 화면 작은 글 |
| `btn_reload` | aria | 다시 불러오기 | Reload | **부트 키**. ↻ 그림 버튼(그림 인라인) |
| `store_short` | 스토어 | 같은 색 점을 이어 판을 칠해요! 빈칸 없이 다 채우면 완성. 시간 제한 없는 손가락 하나 퍼즐. | Join matching dots and fill every square! No timer, one finger, calm puzzles. | 스토어 짧은 설명(80자 이내) |

**합계: 3 + 18 + 3 + 10 + 11 + 16 + 5 = 66개** (`_meta` 제외, 9-9 검사로 확인).

**키를 두지 않은 것(그림으로 대신)**
- 실패·틀림·막힘·잘림 문구 없음(실패가 없는 게임).
- 판정 실패 이름·0 % 없음, 플레이 중 이동 수 숫자 없음, 최고 콤보 키 없음(늘 쌍 수).
- 멈춤 화면 없음(시간이 흐르지 않아 멈출 필요가 없음, 판 상태는 그대로 저장). 백그라운드 복귀 문구 없음.
- 판정 이름·쌍 점 줄 단계 칭찬 글 없음. 새 판 시작 문구("레벨 3!") 없음.
- 점 색·모양 표지마다 대체 글 없음(판 캔버스 이름 하나).

### 9-8. 1-2에서 정한 것과 아직 바뀔 수 있는 것

- 정함(1-2): 플레이 중 판 채움 % 표시·키 없음·aria-hidden(F4·G3), 결과 % = 한 번에 이은 쌍/쌍 수, 별도 표지·키 없음(G2), K4 숨김 없음(`result_hide_pct_below` null → `result_accuracy` meter 늘 있음), `node_partial`·`aria_best_fill` 유지(art가 호 그림을 그림), 결과 화면 레벨 이름 = 보이는 글(G7), `map_screen` aria 전용 유지(art 1차 #12가 lore 안을 받음), 지도 소리 버튼 = `settings_sound` + aria-pressed(키 66개 그대로).
- 아직 바뀔 수 있음: 카드 수(balance가 다른 레벨에도 카드를 두면 키 추가), L6 첫 구멍 자리(G1 재선정 — 문구 `card_hole`은 그대로), art가 결과 레벨 이름 자리를 못 두면 `levelN_name` 결과 쪽 쓰임은 aria로만(G7 대안).

### 9-9. 문서 표 = `strings.json` 확인 (node)

검사: ① 9절 표 키 행과 `strings.json` 키(`_meta` 제외)가 같은 집합, 중복 없음 ② KR·EN 글자 하나까지 같음 ③ 구분이 `어른`·`스토어`가 아닌 키는 한국어 12자 이내(공백 포함)·영어 6단어 이내, 구분 `예비` 없음 ④ `store_short` KR·EN 80자 이내 ⑤ 금지어 0: 원작·참고 게임 낱말(flow·dots·zip·loop·energy·link·khan·흐름·플로우) + 기획 낱말(콤보·combo·streak·판정·이동 수·짝꿍 — `title`만 예외) ⑥ 판정 이름 3개 한국어 2~3자·영어 `^[A-Za-z]{2,4}!?$`·서로 다름 ⑦ **문구 겹침**: KR·EN이 `games/rhythm-01|reverbound|rhythm-02/data/strings.json` 문구와 글자까지 같으면 실패, 공통 UI 키만 예외 ⑧ 부트 키 5개 있음.

명령(`projects/flow-01/`에서, node만):

```
node -e 'const fs=require("fs"),md=fs.readFileSync("10-lore.md","utf8"),js=JSON.parse(fs.readFileSync("strings.json","utf8"));delete js._meta;const flat=(o,a=[])=>{for(const v of Object.values(o)){if(typeof v==="string")a.push(v);else if(v&&typeof v==="object")flat(v,a)}return a};const other=new Set();for(const g of ["rhythm-01","reverbound","rhythm-02"])flat(JSON.parse(fs.readFileSync("../../games/"+g+"/data/strings.json","utf8"))).forEach(s=>other.add(s));const sec=md.slice(md.indexOf("## 9."),md.indexOf("### 9-8")),rows={},err=[];for(const l of sec.split(/\r?\n/)){const c=l.split("|").map(s=>s.trim()),m=/^`([a-z0-9_]+)`$/.exec(c[1]||"");if(!m)continue;if(rows[m[1]])err.push("dup "+m[1]);rows[m[1]]={kind:c[2],ko:c[3],en:c[4]}}for(const k of Object.keys(js))if(!rows[k])err.push("doc missing "+k);const common=new Set("tap_to_start loading load_error btn_close btn_settings settings_sound settings_lang lang_ko lang_en settings_reset confirm_yes confirm_no btn_next btn_undo btn_map btn_restart guardian_hold guardian_title judge_1_name judge_2_name".split(" "));const ban=/flow|dots?\b|\bzip|loop|energy|link|khan|흐름|플로우|콤보|combo|streak|판정|이동 수|짝꿍/i;let same=0,maxko=0,maxen=0;for(const [k,r] of Object.entries(rows)){const j=js[k];if(!j){err.push("json missing "+k);continue}if(r.kind==="예비")err.push("reserve "+k);if(r.ko!==j.ko)err.push("ko diff "+k);if(r.en!==j.en)err.push("en diff "+k);const free=["어른","스토어"].includes(r.kind);const nk=[...j.ko].length,ne=j.en.split(/\s+/).length;if(!free){maxko=Math.max(maxko,nk);maxen=Math.max(maxen,ne);if(nk>12||ne>6)err.push("len "+k)}if(r.kind==="스토어"&&(nk>80||j.en.length>80))err.push("store>80 "+k);const txt=(k==="title"?"":j.ko+" "+j.en);if(k!=="aria_board"&&k!=="store_short"&&k!=="guardian_intro"&&ban.test(txt))err.push("banned "+k);if((k==="aria_board"||k==="store_short"||k==="guardian_intro")&&/flow|zip|loop|energy|link|khan|흐름|콤보|combo|짝꿍/i.test(txt))err.push("banned "+k);const s=other.has(j.ko)||other.has(j.en);if(s)same++;if(s&&!common.has(k))err.push("same as other game "+k)}const jn=["judge_1_name","judge_2_name","judge_3_name"].map(k=>js[k]);jn.forEach((j,i)=>{const n=[...j.ko].length;if(n<2||n>3)err.push("judge ko "+i);if(!/^[A-Za-z]{2,4}!?$/.test(j.en))err.push("judge en "+i)});if(new Set(jn.flatMap(j=>[j.ko,j.en])).size!==6)err.push("judge dup");for(const k of ["title","loading","load_error","load_error_detail","btn_reload"])if(!js[k])err.push("boot "+k);console.log("doc",Object.keys(rows).length,"json",Object.keys(js).length,"| max ko",maxko,"en",maxen,"| same-as-other",same,"(common만 허용) |",err.length?"FAIL "+err.join(", "):"PASS")'
```

- "dot(s)"는 장르 일반 낱말이지만 참고 게임 이름 낱말이라, 화면 모양 이름이 꼭 필요한 대체 글 `aria_board`·스토어·보호자 글에서만 허용합니다(⑤).

**검사 결과 (2026-11-17, 1-1):** `doc 66 json 66 | max ko 12 en 5 | same-as-other 15 (common만 허용) | PASS`. 공통 UI로 허용한 겹침 15개 중 정체성 문구는 판정 이름 영어 `Wow!`·`Nice`(rhythm-02와 같음, 6-1 허브 공통 칭찬 결정) 2개뿐이고 한국어 판정 이름은 겹침 0. 첫 실행에서 `level7_name` "Big Flower Park"가 금지어 flow(Flower)에 걸려 "Big Blossom Park"로 바꿈. 가장 긴 문구: `tut_drag`·`clear_last`·`node_star` 등 한국어 11~12자, 영어 5단어(`tut_drag`). `store_short` KR 54자 / EN 77자.

**검사 결과 (2026-11-18, 1-2 2차):** `doc 66 json 66 | max ko 12 en 5 | same-as-other 15 (common만 허용) | PASS`. 바뀐 문구는 `guardian_intro` KR·EN(어른 글, G2 결과 % 뜻 + F4 판 채움 % 설명)뿐, 키 수 그대로.

## 10. 다른 게임과의 구분

| 게임 | 정체성 | 이 게임과 다른 점 |
|---|---|---|
| Reverbound (runner-01) | 박자 러너, 점프 | 동작(달리기·점프) 말 없음. 레벨 이름 겹침 없음(달팽이 정원 ↔ 큰 꽃정원은 다른 글자) |
| Tickadrum (rhythm-01) | 별·북 리듬 | 별은 결과 보상 이름으로만 씀(리듬 대상 아님). rhythm-01의 꽃밭·바닷가와 글자가 같아 L2·L3 이름을 바꿈(튤립 화분·물놀이 해변) |
| Tossaloft 높이통통 (rhythm-02) | 공 받기 리듬 | 판정 이름 한국어가 다름(딱이야/좋아/됐어 ↔ 최고야/멋져/해냈어) |
| Orbit Dodge | 우주 회피 | 겹침 없음 |

- 공통 UI 문구(`tap_to_start`·`loading`·`load_error`·`btn_next`·설정·확인 창 일부)는 허브 안 같은 UX로 일부러 같게 둡니다(rhythm-02 8-3과 같은 결정). 게임 정체성 문구(제목·태그라인·레벨 이름·카드·판정 이름·결과 제목)는 글자까지 같은 것이 없어야 합니다(9-9 ⑦).

## 11. 스토어 문구 초안

### 짧은 설명 (80자 이내, `store_short`)
- KR: 같은 색 점을 이어 판을 칠해요! 빈칸 없이 다 채우면 완성. 시간 제한 없는 손가락 하나 퍼즐.
- EN: Join matching dots and fill every square! No timer, one finger, calm puzzles.

### 긴 설명 (초안, 키 아님)

**KR**
> 같은 색 점을 이어서, 빈칸 없이 다 칠해요.
>
> 짝꿍색칠은 손가락 하나로 하는 조용한 색칠 퍼즐입니다. 같은 색 점 두 개를 선으로 이으면 지나간 칸이 그 색으로 물들어요. 선끼리는 겹칠 수 없고, 판의 모든 칸을 채우면 완성입니다.
>
> - 햇살 마당에서 노을 하늘까지, 하루를 따라가는 10개의 판
> - 시간 제한도, 실패도 없어요. 천천히 생각해도 돼요
> - 글을 몰라도 손가락 시연과 그림으로 배울 수 있어요
> - 이을 때마다 "최고야!" "멋져!" "해냈어!" 칭찬과 부드러운 소리
> - 한 번에 모두 이으면 별을 받아요
> - 색을 구분하기 어려워도 점 안의 모양으로 짝을 찾을 수 있어요
> - 움직임 줄이기·소리·진동 설정은 보호자 화면에
>
> 모든 판은 직접 만든 생성기로 만들었고, 답이 하나뿐인지 검사했습니다.

**EN**
> Join same-color dots and fill every square.
>
> Pairpaint is a calm, one-finger coloring puzzle. Draw a line between two dots of the same color and every square it passes fills with that color. Lines can't cross, and the board is done when every square is filled.
>
> - 10 boards that follow one day, from a sunny yard to a sunset sky
> - No timer and no way to fail, so take your time
> - Learn by watching a finger demo and pictures, no reading needed
> - Cheerful "Wow!", "Nice", "Yay!" and soft sounds each time you join a pair
> - Join every pair in one go to earn a star
> - Shapes inside the dots help you find pairs even without telling colors apart
> - Motion, sound and vibration settings live in the grown-ups screen
>
> Every board is made by our own generator and checked to have exactly one solution.

- 스토어 문구는 광고·결제 유무를 말하지 않습니다(3단계 수익화 미정). 원작·참고 게임 이름이나 "~같은 게임" 비교 문구를 쓰지 않습니다.

## 12. 다른 역할에 넘길 요구 (1-1 병렬, 1-2에서 맞춤)

**balance-designer**
1. 판정 등급 데이터: 그 색 이동 수 1 → 1단, 2 → 2단, 3 이상 → 3단, 이름 키 `judge_1_name`·`judge_2_name`·`judge_3_name`(`balance.json`에 키 이름으로 연결). 실패 등급 이름 `null`.
2. 카드 id = `tut_drag`(L1 시연), `card_fill`(L2), `card_hole`(L6). 다른 레벨에 카드를 두면 lore에 알려 키 추가.
3. 클리어 문구 선택 규칙(8절 11)을 데이터로 두려면 `clear_title_n`을 레벨 JSON에 넣지 말고 규칙만 적음(텍스트는 strings.json 원본).
4. L1 시연 길 = L1 첫 쌍의 답 길(답 데이터에서 시연 경로를 뽑을 수 있게), L2 판은 "다 이어도 빈칸" 상태가 실제로 생기는 판, L6 첫 구멍 위치를 카드 그림용으로 기록.
5. (1-2 G2·G3 확정) 결과 % 정의와 50 % 미만 숨김(K4) 여부, 플레이 중 채움 % 여부를 확정해 lore에 알림(6-4, 9-8).

**art-director**
1. 판정 이름 3단: 글자 크기(1단 최대, 세로 360 기준 28 px 이상)·튐·연결음 층으로 글 없이 구분, 2·3단 회색·빨강 금지, 위치는 (F5 확정) 판 밖 띠·기둥, 짝 점과 같은 x/y.
2. `gap_left` 보조 글 자리(text_slots): (1-2) 판 밖 `board_text`, 3번째 숨 쉬기에만(G6), 판·점·선을 가리지 않게, 가장 긴 언어(EN 4단어) × 4해상도 검사.
3. 구멍 칸은 "칸이 없는 자리"로 그려 바탕 색이 보이게(L6 물빛), 화면 글 "구멍"과 맞게. 카드 그림 = L6 실제 첫 구멍.
4. 레벨 바탕 그라디언트 아침 → 노을(7절 표), 판 둘레 장식은 기본 도형 1종 이하. L8 회색 단색 금지(판 대비).
5. 지도: 노드 상태 5개(잠김·다음·풀다 나감·완료·별)가 글 없이 구분, 풀다 나간 노드의 최고 진행도 표시(1-2: 둘레 호, criteria 게임 감각 줄), 별 모음 표지. 결과: 다 칠한 표시 + 별 + % 이름표 그림(글자 "정확도" 없음).
6. 아이콘: ↶ 되돌리기, ↻ 처음부터·다시 칠하기·다시 불러오기(부트 인라인), 도움 버튼(전구처럼 "힌트 구매"를 떠올리는 모양은 피하고 손가락 모양 권장), 지도, 톱니, ▶.
7. 타이틀 로고는 글자 + 기본 도형(두 점과 선)만, 원작·참고 게임 로고 꼴과 닮지 않게.

**1-2 결과(2차)**: balance 1번 키 연결은 balance 1차 #8(`grade_name_keys`)로, 2번 카드 키는 balance 1차 #9(`card_key`·`text_key`)로 2차에서 넣기로 함. 5번은 G2·G3로 확정. art 1·2·5번은 F5·G6·G3으로 갱신(판정 이름 판 밖, `gap_left`는 판 밖 `board_text`에 3번째 숨 쉬기에만, 풀다 나간 노드 = 둘레 호). art 3번은 G1(L6 판 안쪽 구멍, 둘레 구멍이면 외곽선 파내기). 새로 art에: 결과 화면 레벨 이름 글 자리(바탕색 띠)·`result_new_best` 표지·`guardian_hold` 자리(G7), 카드 그림의 완료 표시는 ✓ 대신 반짝임.

**game-developer (1-3)**: 8절 규칙 1~12(특히 부트 키 인라인, `aria-live` 두 곳, 노드 값 요소 버튼 밖, 판정 이름 낭독 없음).

## 13. 남은 위험

| # | 위험 | 대응 |
|---|---|---|
| L1 | 이름 Pairpaint 스토어 충돌 미확인 | 1-3 전 검색(1절), 충돌 시 C 대안 |
| L2 | "빈칸"·"구멍"을 아이가 같은 것으로 헷갈림(둘 다 비어 보임) | 그림 구분: 빈칸 = 칸 모양이 있고 숨 쉼 / 구멍 = 칸 모양이 없고 바탕이 보임(art). 카드 문구로 "구멍은 안 칠해도 돼요" |
| L3 | (F5로 해소: 이름은 판 밖) 대신 이름이 짝 점에서 멀어져 어느 연결의 칭찬인지 덜 이어짐(30-art R3) | 같은 x/y 정렬 + 점 튐·조각이 판 안 단서. 아동 테스트에서 헷갈리면 6-3 대안(1단만 이름) |
| L4 | 3단 "해냈어"가 아이에게 1단보다 더 큰 칭찬으로 들림 | 크기·소리 층이 등급을 정함. 아동 테스트에서 혼란이 있으면 6-3 대안(1단만 이름) |
| L5 | 결과 %가 낮을 때 실망 | 별이 주 신호, %는 작게, `result_new_best`로 나아짐을 칭찬. 값이 "한 번에 이은 쌍/쌍 수"라 0 %도 "아직 한 번에 이은 색이 없음"일 뿐 실패 뜻 없음 |
| L6 | 플레이 중 판 채움 %와 결과 %(한 번에 이은 쌍 비율)가 뜻이 달라 보호자가 헷갈림 | 그림표 2종(`icon-filled` / `icon-one_go`)으로 구분, `guardian_intro`가 두 % 뜻을 따로 설명. 1-5 리뷰에서 혼동 확인 |
