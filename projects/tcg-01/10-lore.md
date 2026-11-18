# tcg-01 세계관: 썰물 영장 (Ebbwrit)

- 작성: lore-writer · 2026-11-17 · 단계 1-1
- 입력: `00-benchmark.md`(시스템 감각·5절 기능명·10절 가져올 것/바꿀 것·12절 금지 목록), `STATUS.md`(요청자 원문, 18세 확정, 이름 팀 결정)
- 대상: 18세(성인 TCG 기준). 5~6세 원칙은 예외 적용(요청자 지시)
- 카드 데이터: `lore/cards-lore.json`(200장), 검사 `lore/check-cards.mjs`
- 이 문서의 이름·키워드·문구는 모두 자체 제작입니다. 레퍼런스(Hearthstone·Warcraft)와 다른 상용 TCG의 이름·키워드·설정은 쓰지 않았습니다(11절 점검표).

---

## 1. 게임 이름

### 1-1. 후보와 검색 확인 (2026-11-17, WebSearch)

| 후보 | 한국어 표기 | 뜻 | 검색어 | 결과 요지 | 판정 |
|---|---|---|---|---|---|
| **Ebbwrit** | 썰물 영장 | 썰물(Ebb) + 영장(Writ, 이름을 새긴 패) | `"Ebbwrit" game`, `Ebbwrit steam OR "app store" OR "google play"`, `"썰물 영장" 게임` | 정확히 일치하는 게임·앱 없음. 가까운 결과는 다른 철자의 보드게임(ebbes, Ebbe & Flut)과 itch.io RPG(Ebbed Well)뿐이고 카드 대전 장르 충돌 없음. 한국어 "썰물 영장"도 일치 없음 | **확정** |
| Saltwrit | 소금 영장 | 소금 + 영장 | `"Saltwrit" card game` | 일치 없음. 대신 "Sea Salt & Paper"(2022 카드 게임)가 검색 상단을 차지해 스토어 검색에서 묻히고 혼동될 위험 | 보류 |
| Bare Sea Callers | 노해의 호명자 | 드러난 바다의 호명자들 | `"Bare Sea" card game callers` | 일치 없음. 다만 "Bare Sea"는 일반어라 검색 상위가 빙고·바다 학습 자료로 채워져 찾기 어려움. 길어서 아이콘 아래 잘림 | 보류 |

참고 검색: `"Tidecaller" OR "Tide Callers" card game TCG` → **MTG 카드 이름(Tidecaller Mentor 등)과 겹침**. 그래서 영웅·세력 이름에 "Tidecaller"를 쓰지 않고 "호명자(Caller)"만 씁니다. `TCG keyword "Breakwater" OR "Saltskin" OR "Seamist" OR "Unname"` → 키워드로 쓰는 상용 TCG 없음(Breakwater는 Flesh and Blood의 카드 이름 일부로만 나옴, 키워드 아님).

### 1-2. 확정: **썰물 영장 (Ebbwrit)**

- 근거: (1) 검색 충돌 없음, 조어라 스토어 검색에서 바로 찾힘 (2) 세계관 핵심 두 개(바다가 빠진 세계 + 이름을 새긴 패로 싸움)를 한 단어에 담음 (3) 영문 7자, 한글 5자로 아이콘 아래 잘리지 않음.
- 부제(스토어·타이틀): 「노해의 호명자들 / Callers of the Bare Sea」
- 영문 읽기: "에브릿". 한국 스토어 표기는 「썰물 영장」을 앞에 둡니다.

---

## 2. 세계관

### 2-1. 한 문단

312년 전 어느 밤, 바다가 수평선 너머로 빠져나간 뒤 돌아오지 않았다. 드러난 바닥 「노해(露海)」에는 소금 평원과 난파선, 그리고 옛 바다 도시의 폐허가 남았다. 그 도시 사람들은 존재의 **참이름을 소금유리 패에 새기면 그 존재가 부름에 응답한다**는 기술을 남겼다. 이 패가 **영장(writ)**이다. 물이 사라진 땅에서 사람들은 저수지와 인양물과 신앙을 두고 싸웠고, 한꺼번에 너무 많은 이름을 부르면 땅 밑의 검은 바닷물 「흑조」가 솟아 군대를 통째로 삼켰다. 그래서 지금 모든 분쟁은 **소금 맹약**에 따라 단 두 사람의 **호명자**가 각자 30장의 영장을 들고 소금 고리 안에서 겨루는 **영장 결투**로 정한다. 진 쪽은 걸었던 것을 잃고, 큰 결투에서는 이름까지 잃는다. 그런데 요즘 결투장의 소금이 젖기 시작했다. 바다가 돌아오고 있다는 소문이 돈다.

### 2-2. 역사 (연표, 대썰물 기준)

| 시기 | 이름 | 일 |
|---|---|---|
| 대썰물 이전 약 천 년 | 물마루 시대 (Age of Crests) | 바다 도시 「물마루 사람들(Crestfolk)」이 번성. 소금유리에 참이름을 새기는 **영장술**을 만들고, 고래 기름 심지로 영장에 숨을 불어넣는 법을 정함. 바다·짐승·망자와 "부르면 답한다"는 **응답 서약**을 맺음 |
| 0년 | **대썰물 (the Great Ebb)** | 하룻밤에 바다가 빠짐. 물마루 도시는 바닥에 드러나 말라 죽음. 원인은 지금도 모름(2-6 세력별 해석) |
| 1~60년 | 갈증 전쟁 (Thirst Wars) | 남은 저수지·우물을 두고 군대끼리 수천 장의 영장을 동시에 부름. 그때마다 땅에서 검은 바닷물 **흑조(Blacktide)**가 솟아 양쪽 군대를 삼킴. 인구 절반이 사라짐 |
| 61년 | **소금 맹약 (the Brine Accord)** | 살아남은 세력들이 맹약: 한 분쟁에 호명자 둘, 영장 30장, 심지 10개까지. 결투는 흑조가 가장 얕게 잠든 **조수원(Tide Circle)** 소금 고리 안에서만 |
| 61~300년 | 결투 시대 | 영장 결투가 법정·전쟁·상거래를 대신함. 큰 결투에서 진 자의 이름을 지우는 **이름 박탈**이 형벌로 굳음 → 이름 잃은 자들의 무리 「무명단」이 생김 |
| 300~312년 (현재) | 젖은 소금 | 조수원의 소금이 젖고, 땅 밑에서 물소리가 들림. 흑조가 깨어나는지, 바다가 돌아오는지 아무도 모름. 여섯 호명자가 각자의 이유로 결투장에 나섬 |

### 2-3. 지리

| 지역 | 설명 | 주인 |
|---|---|---|
| 염관 고원 (Saltcrown Heights) | 옛 해안 절벽 위 고원. 마지막 대형 저수지 「제7수조」가 있음 | 염수 파수단 |
| 노해 (the Bare) | 옛 바다 바닥 전체. 하얀 소금 평원, 마른 해구, 난파선 숲 | 누구의 것도 아님(맹약상 공유지) |
| 잠긴 성가대 (the Drowned Loft) | 가장 깊은 해구 바닥의 물마루 대성당. 유일하게 바닷물 웅덩이가 남음 | 익사자 합창회 |
| 녹슨 갈비뼈 (the Rustribs) | 거대 난파선 수백 척이 쓰러진 계곡. 해체장·작업장 | 난파 조합 |
| 붉은 사구 (Red Dunes) | 소금과 산화철 모래가 섞인 사구 지대. 마른 강바닥이 길 | 염풍 씨족 |
| 등불 서고 (the Lamplit Archive) | 옛 등대 일곱 개를 이어 만든 도서관 도시. 영장 원판과 심지 제조 독점 | 등불 서고회 |
| 안개 띠 (the Fogbelt) | 해안선이었던 자리. 늘 해무가 낌. 지도에 없는 마을들 | 무명단 |

### 2-4. 영장술 (마법·기술 체계)

- **참이름**: 모든 존재에는 하나의 참이름이 있다. 소금유리에 정확히 새기면 그 존재는 부름에 **응답할 의무**가 생긴다(물마루 시대의 응답 서약). 응답한 존재는 결투 동안 조수원 안에 실제로 나타난다.
- **영장(Writ)** = 카드. 종류 셋:
  - 이름 영장 → 필드에 나오는 **응답자(Answerer)**(장르상 하수인).
  - 의식 영장 → 이름 대신 **물마루 공식**을 새긴 패. 한 번 타오르고 사라지는 **의식(Rite)**(장르상 주문).
  - 인장(Brand) → 영장을 손잡이에 박은 무기. 호명자가 직접 휘두름(장르상 무기).
- **심지(Wick)** = 마나. 호명자는 등에 진 **등대(燈臺) 걸이**에 고래 기름 심지를 꽂아 영장에 숨을 불어넣는다. 결투가 길어질수록 숨이 트여 한 턴에 하나씩 더 켜고, 맹약은 **심지 10개**를 넘지 못하게 정했다. 켠 심지는 턴이 끝나면 꺼진다(남지 않음).
- **명줄(Lifeline)** = 영웅 체력 30. 호명자 자신의 이름이 몸에 묶인 정도. 0이 되면 이름이 느슨해져 결투에서 진다.
- **껍질(Shell)** = 체력 위에 쌓이는 추가 보호. 소금 결정이 몸에 굳은 갑옷.
- **영장첩(Writbook)** = 덱 30장. 같은 이름 영장은 2장까지(심해 희귀도는 1장). 같은 참이름을 세 번 이상 들고 가면 이름이 서로 엉켜 응답하지 않는다는 것이 맹약의 이유.
- **조수 섞기** = 셔플. 영장첩은 조수원에 들어서면 물소리에 맞춰 스스로 섞인다. 어떤 영장이 먼저 손에 오는지는 바다만 안다.
- **공허 호명(Hollow Call)** = 피로 피해. 빈 영장첩에서 이름을 부르면 대신 흑조가 대답한다. 부를 때마다 더 깊이 물린다(1, 2, 3…).
- **여분 심지(Spare Wick)** = 후공 보상. 맹약은 늦게 부르는 쪽에게 짧은 토막 심지 하나를 준다(0비용, 이번 턴 심지 +1, 1회용). 모양은 **짧은 초 토막**(동전 모양 금지).

### 2-5. 왜 카드로 싸우는가

1. **흑조 때문에**: 이름을 동시에 많이 부르면 흑조가 솟는다. 30장·심지 10개·호명자 둘이 "흑조가 깨지 않는 한도"로 계산된 값이다.
2. **법이기 때문에**: 소금 맹약 이후 영장 결투의 결과는 모든 세력이 지키는 판결이다. 물 배급, 인양권, 이단 재판, 빚, 상속이 모두 결투로 정해진다.
3. **이름이 걸려 있기 때문에**: 영장은 종이가 아니라 **누군가의 참이름**이다. 영장을 모은다는 것은 응답할 존재를 모은다는 뜻이고, 결투에서 진다는 것은 그들을 부를 권리(때로는 자기 이름)를 잃는다는 뜻이다. 그래서 이 세계의 카드 수집은 곧 권력이다.

### 2-6. 세력과 갈등

| 세력 (id) | 무엇을 원하나 | 대썰물 해석 | 적대 |
|---|---|---|---|
| 염수 파수단 Brinewardens (`h_warden`) | 마지막 저수지를 지키고 공평하게 나눔 | "바다는 벌을 내렸다. 남은 물을 지키는 게 속죄다" | 염풍 씨족(물 약탈), 무명단(수조 도둑) |
| 익사자 합창회 Drowned Choir (`h_choir`) | 바다를 다시 부르기. 땅 위 모두를 바다에 바쳐서라도 | "물마루가 바다의 참이름을 함부로 불러 바다가 떠났다. 사과하면 돌아온다" | 난파 조합(망자 모독), 등불 서고(바다를 기록으로만 봄) |
| 난파 조합 Wreckwrights (`h_wreck`) | 바닥의 모든 것을 인양해 기계로 되살림 | "원인 따위 상관없다. 바닥에 보물이 있다" | 익사자 합창회, 염풍 씨족(인양장 습격) |
| 염풍 씨족 Saltwind Clans (`h_rider`) | 노해 위의 자유로운 이동, 정착민의 물을 나눠 갖는 권리 | "바다가 길을 열어 주었다. 사구가 우리 바다다" | 염수 파수단, 난파 조합 |
| 등불 서고회 Lamplit Archive (`h_archive`) | 모든 참이름을 기록하고 심지를 독점, 맹약의 심판 노릇 | "물마루가 **바다의 참이름**을 새기다 실수했다. 원판을 찾으면 고칠 수 있다" | 무명단(이름 박탈 집행자가 서고), 합창회 |
| 무명단 the Nameless (`h_nameless`) | 이름 박탈 제도를 끝내고, 지워진 이름을 되찾거나 아예 이름 없는 세상을 만듦 | "누가 이름을 붙였든, 이름이 사슬이다" | 등불 서고회, 염수 파수단 |

**공통 위협 흑조(Blacktide)**: 세력이 아니라 현상. 땅 밑에 고인 검은 바닷물이며, 너무 많은 이름이 불릴 때 솟는다. 합창회는 이것을 "돌아오는 바다의 앞물결"이라 믿고, 서고회는 "잘못 새긴 바다의 이름이 썩은 것"이라 본다. 공용 카드 중 흑조 관련 카드(B029, A060)는 결말에서 이 수수께끼로 이어지는 실마리다(이야기 모드 「썰물 연대기」 소재).

### 2-7. 게임 용어 대응표 (화면에 쓰는 이름)

레퍼런스·다른 TCG의 고유 용어(공식 한국어 번역 포함)를 피하고 이 세계의 말로 바꿉니다.

| 장르 기능 | 우리 용어 (ko / en) | 화면 표시 메모 |
|---|---|---|
| 영웅 | 호명자 / Caller | |
| 영웅 체력 | 명줄 / Lifeline | 숫자 + 세로 실 모양 |
| 방어도 | 껍질 / Shell | 흰 결정 덩이 아이콘 |
| 영웅 능력 | 호명술 / Calling | 영웅마다 이름 다름 |
| 마나 | 심지 / Wick | 세로 막대 10개(보석 모양 금지) |
| 하수인 | 응답자 / Answerer | |
| 주문 | 의식 / Rite | |
| 무기 | 인장 / Brand | 공격력·내구(새김 수) |
| 덱 | 영장첩 / Writbook | 30장 |
| 카드 | 영장 / Writ | |
| 손패 | 손패 / Hand | 일반어 유지 |
| 필드 | 조수원 / Tide Circle | 한쪽 5칸 |
| 묘지(죽은 응답자 기록) | 가라앉은 자리 / The Sunk | |
| 피로 피해 | 공허 호명 / Hollow Call | |
| 후공 보상 카드 | 여분 심지 / Spare Wick | 초 토막 모양 |
| 멀리건 | 첫 물때 고르기 / First Tide | |
| 턴 종료 | 숨 고르기 / End Breath | 버튼 |
| 태그(종족류) | 혈통 / Lineage | 5-3절 |

---

## 3. 톤 가이드

- **분위기**: 마른 바다의 쓸쓸함 + 법정 같은 긴장. 웅장한 영웅담보다 **살아남은 자들의 냉정한 거래**. 유머는 건조하고 짧게(노동자·도둑 대사).
- **성인 톤(18세)**: 죽음·희생·익사·이름 박탈을 직접 다루지만 잔혹 묘사(신체 훼손·고어)는 하지 않습니다. 피는 "소금이 굳힌다" 수준. 종교 세력은 광신이지만 조롱하지 않고 나름의 논리를 줍니다.
- **세력 말투**: 파수단 = 군대식 짧은 명령, 합창회 = 기도문·2인칭 유혹, 조합 = 현장 은어·숫자, 씨족 = 짧은 함성·자연 비유, 서고회 = 학자 말투·인용·각주, 무명단 = 냉소·반문.
- **문장 규칙**: 카드 글(concept)은 키워드 + 조건 + 효과 2문장까지, 30-art 글 상자(13 px, 한 줄 15자 × 최대 4줄 = 60자) 안에 들어가게 **60자 이하**(줄바꿈 여유로 56자 권장). 카드 이름은 이름 띠(17 px, 약 200 px)에 맞게 **한국어 10자·영문 21자 이하**(`check-cards.mjs`가 넘으면 실패, 56자 초과는 경고). 영어 카드 글 `concept_en`은 120자 이하(글 상자 영어 약 30자 × 4줄). 카드 글 안의 용어는 화면 용어로만: **호명자·조수원**(영웅·필드 금지, 검사기가 실패 처리). 숫자는 엔진(cards.json) 값과 같게. 플레이버는 한 문장 위주(25자 안팎). 대전 중 토스트는 한 문장 12자 이내(영어 6단어)로 짧게(insights 텍스트 항목을 성인 화면에도 그대로 적용: 글 읽는 시간보다 수 읽는 시간을 남김).
- **금지**: 레퍼런스의 대사 패턴(인사·감사·위협 이모트 문구), "빛·성기사·악마·마법사" 같은 레퍼런스 직업 연상어를 세력 이름에 쓰지 않음. 엘프·드워프·오크·드래곤 같은 종족을 쓰지 않음. 이 세계의 생물은 **마른 바다의 갯것**(게·거북·물개·해파리·갈매기·갈기 도마뱀)과 기계, 사람, 망자뿐.

---

## 4. 영웅 (호명자 6명)

6명인 근거: (1) 00-benchmark 6절 아키타입 5종(어그로·미드레인지·컨트롤·콤보·템포)을 모두 덮고 컨트롤을 "디버프형"과 "주문형" 둘로 나누면 6 (2) 200장에서 공용 50장을 빼면 영웅당 25장으로 아키타입 2~3개가 섬(00-benchmark 10절 추정 20~30장) (3) 레퍼런스의 영웅 9인 구조를 피함(12절 blocker 목록).

모든 호명자의 명줄은 30. 호명술은 기본 2심지·턴당 1회 기준으로 제안하며 최종 비용·수치는 balance-designer가 정합니다.

### 4-1. 오다 벨 (Oda Vell) — 제7수조의 수문장

| 항목 | 내용 |
|---|---|
| id / 세력 | `h_warden` / 염수 파수단 |
| 나이·모습 | 50대 여성. 소금 결정이 굳은 낡은 판금, 왼쪽 눈 위 흉터, 큰 사각 방패 |
| 성격 | 말수가 적고 원칙적. 공평함에 집착해 자기 몫의 물도 남과 똑같이 나눔. 융통성이 없다는 평 |
| 동기 | 제7수조가 마르기 전에 바다가 돌아오는지 확인하는 것. 수조를 지키는 마지막 세대가 되고 싶지 않다 |
| 라이벌 | **카드라 순**(수조 약탈을 막다가 서로 동생·부하를 잃음). 무명단 렌이 수조 장부를 훔쳐간 일로 렌을 쫓음 |
| 호명술 | **자리 지켜 / Hold the Line**: 내 응답자 하나 +0/+1, 내 다음 턴까지 방파제 |
| 플레이 정체성 | **미드레인지·방어**. 앞을 막고 넓게 깐 뒤 전체 강화로 교환에서 이김 |
| 아키타입 | ① 방파제 성벽(방파제 + 껍질로 버티다 B003·B013으로 굳힘) ② 대열 군단(넓게 깔고 B005·B008·B018 전체 강화) ③ 배급 버팀(B007·B014·B017 회복·들이켬) |
| 시각 힌트 | 청회색 + 소금 흰색. 실루엣 = 아래가 넓은 **사각형**(방패), 머리 위 수평선 한 줄. 정면으로 꼿꼿이 선 자세 |

대사:
| 용도 | ko | en |
|---|---|---|
| 등장 | 줄 서라. 물은 공평하게 나눈다. | Form a line. Water is shared fairly. |
| 승리 | 수조는 오늘도 찼다. | The cistern holds another day. |
| 패배 | ...문을 닫아라. 내가 마지막이 아니길. | ...Seal the gate. Let me not be the last. |
| 위협 | 한 걸음만 더 오면 물 대신 소금을 먹이겠다. | One more step and you'll drink salt. |
| 위기 | 벽이 갈라진다. 그래도 물러서지 않는다. | The wall cracks. I still won't step back. |
| 감사 | 고맙다. 장부에 적어 두지. | Thank you. I'll note it in the ledger. |
| 경의 | 좋은 수였다. 다음엔 막는다. | Good move. Next time, I'll stop it. |
| 심지 부족 | 심지가 모자란다. | Not enough wicks. |

### 4-2. 수녀 나할 (Sister Nhal) — 잠긴 성가대의 선창자

| 항목 | 내용 |
|---|---|
| id / 세력 | `h_choir` / 익사자 합창회 |
| 나이·모습 | 30대 여성. 늘 젖어 있는 긴 청록 베일, 뼈 염주, 맨발. 숨을 아주 오래 참는다 |
| 성격 | 온화하고 상냥하며 확신에 차 있음. 상대를 미워하지 않고 "함께 바다로 가자"고 권함. 그래서 더 무서움 |
| 동기 | 바다의 참이름에 바칠 사과문(진혼곡)을 완성하는 것. 결투에서 얻은 이름들을 잠긴 성가대에 "돌려보내" 바다를 부르려 함 |
| 라이벌 | **펠 하스크**(망자의 배를 뜯어 파는 자). 등불 서고회 **이브로 탈**과는 바다의 원인을 두고 오래 논쟁한 옛 스승·제자 사이 |
| 호명술 | **짠 숨 / Salt Breath**: 적 응답자 또는 적 호명자에게 소금독 1 |
| 플레이 정체성 | **컨트롤(디버프·저주)**. 상대 필드를 천천히 녹이고, 약화·닻으로 시간을 번 뒤 소금독 폭발로 끝냄 |
| 아키타입 | ① 소금독 누적(B019·B029·B031·B036으로 쌓고 터뜨림) ② 봉헌(내 응답자를 희생해 B023·B027·D003으로 이득) ③ 닻 봉쇄(B020·B026으로 공격 차단, A002 전체 정리) |
| 시각 힌트 | 짙은 청록 + 뼈색. 실루엣 = **거꾸로 선 물방울**(베일이 땅에 끌림), 머리 위 작은 원 고리. 손을 앞으로 내민 자세 |

대사:
| 용도 | ko | en |
|---|---|---|
| 등장 | 숨을 크게 쉬어 두세요. 곧 물이 옵니다. | Take a deep breath. The water is coming. |
| 승리 | 이 이름도 바다에 돌려보낼게요. | I'll return this name to the sea. |
| 패배 | 괜찮아요... 물은 결국 모두를 데려가요. | It's alright... water takes everyone in the end. |
| 위협 | 당신 폐에도 소금이 차오르는 게 느껴지나요? | Do you feel the salt filling your lungs? |
| 위기 | 아, 물이 저를 먼저 부르네요. | Ah, the water calls me first. |
| 감사 | 바다가 당신을 기억할 거예요. | The sea will remember you. |
| 경의 | 아름다운 수였어요. 슬플 만큼. | A beautiful move. Almost sad. |
| 심지 부족 | 아직 숨이 모자라요. | Not enough breath yet. |

### 4-3. 펠 하스크 (Pell Hask) — 녹슨 갈비뼈의 수석 해체공

| 항목 | 내용 |
|---|---|
| id / 세력 | `h_wreck` / 난파 조합 |
| 나이·모습 | 40대 남성. 한쪽 팔이 황동 의수(집게), 용접 고글, 공구 벨트, 기름때 |
| 성격 | 수다스럽고 실용적. 모든 걸 값과 부품 수로 셈. 신앙을 비웃지만 기계에는 이름을 붙여 줌 |
| 동기 | 침몰한 물마루 기관 「해일 기관」을 다시 돌려, 바다 없이도 물을 끌어올리는 것. 조합장 자리도 노림 |
| 라이벌 | **나할**(인양을 모독이라 부름), **카드라**(인양장을 습격하는 씨족) |
| 호명술 | **작은 인양 / Small Haul**: 인양(부품 카드 3장 중 1장을 손패로) |
| 플레이 정체성 | **콤보·성장**. 한 응답자에 부품을 겹겹이 붙여 키우거나, 썰물 연쇄로 자원을 굴린 뒤 한 턴에 터뜨림 |
| 아키타입 | ① 부품 거상(B037~B039 부품 + B042·B051, 한 대상을 키움) ② 썰물 연쇄(B045·B048 + D007 해체로 죽음을 자원으로) ③ 인양 가치(D005·A027·호명술로 손패 우위) |
| 시각 힌트 | 녹 주황 + 황동. 실루엣 = **육각형** 몸통에 한쪽만 큰 집게팔(비대칭), 등에 굴뚝 하나 |

대사:
| 용도 | ko | en |
|---|---|---|
| 등장 | 자, 오늘은 뭘 뜯어 볼까. | Right. What are we taking apart today? |
| 승리 | 쓸 만한 부품이 꽤 나오겠는데. | Plenty of good parts in this one. |
| 패배 | 나사 하나가... 모자랐어. | One bolt... short. |
| 위협 | 네 응답자, 분해하면 몇 개 나올까? | How many parts in your Answerer, I wonder? |
| 위기 | 어디 보자, 예비 부품을 어디 뒀더라... | Let's see, where'd I put the spare parts... |
| 감사 | 좋아, 외상으로 달아 두지. | Fine. I'll put it on your tab. |
| 경의 | 이야, 그거 설계 좀 빌려 줘. | Huh. Lend me that blueprint. |
| 심지 부족 | 압력이 안 올라와. | Pressure's too low. |

### 4-4. 카드라 순 (Kadra Sund) — 붉은 사구의 선봉 기수

| 항목 | 내용 |
|---|---|
| id / 세력 | `h_rider` / 염풍 씨족 |
| 나이·모습 | 20대 여성. 거대한 모래게 「붉은 집게」를 탐. 붉은 천을 두르고 얼굴 아래를 가림, 긴 창 |
| 성격 | 성급하고 대담하며 의리가 깊음. 기다리는 것을 가장 싫어함. 지면 바로 인정하고 다시 덤빔 |
| 동기 | 씨족이 정착민의 저수지에서 정당한 몫을 받는 것. 맹약이 정착민 편이라고 믿고, 결투로 그 판결을 뒤집으려 함 |
| 라이벌 | **오다 벨**(오랜 원수이자 유일하게 인정하는 적), **펠 하스크**(사구 아래 난파선 소유권) |
| 호명술 | **채찍질 / Lash On**: 내 응답자 하나 이번 턴 +2 공격력과 박차(balance 1-1 수치) |
| 플레이 정체성 | **어그로**. 싼 응답자로 빠르게 깔고 급류·직접 피해로 5~7턴 안에 끝냄. 그을음으로 미래 심지를 당겨 씀 |
| 아키타입 | ① 급류 덮침(A006·A010·B064, 바로 명줄을 침) ② 그을음 버스트(A008·A011·B060, 심지를 당겨 마무리) ③ 박차 템포(B052·B057·B061·B063, 필드 교환하며 밀어붙임) |
| 시각 힌트 | 황토 + 붉은 천. 실루엣 = 앞으로 기운 **삼각형**(창끝), 아래에 넓적한 게 등딱지 반원 |

대사:
| 용도 | ko | en |
|---|---|---|
| 등장 | 먼지 먹기 싫으면 비켜! | Move, unless you like eating dust! |
| 승리 | 바람이 내 편이었지. | The wind was on my side. |
| 패배 | 칫... 다음 바람엔 안 진다. | Tch... Next wind, I win. |
| 위협 | 네 명줄, 몇 번이면 끊어질까? | How many hits till your Lifeline snaps? |
| 위기 | 피 좀 났다고 멈출 줄 알아? | Think a little blood will stop me? |
| 감사 | 빚졌다. 씨족은 갚는다. | I owe you. Clans repay. |
| 경의 | 빠르네. 마음에 들어. | Fast. I like it. |
| 심지 부족 | 심지가 안 남았어! | Out of wicks! |

### 4-5. 이브로 탈 (Ivro Tal) — 등불 서고의 사서장

| 항목 | 내용 |
|---|---|
| id / 세력 | `h_archive` / 등불 서고회 |
| 나이·모습 | 70대 남성. 키가 크고 마름. 등에 등잔 일곱 개를 단 높은 걸이, 먹물 든 손끝, 긴 외투 |
| 성격 | 냉정한 학자. 모든 것을 기록하고 각주를 단다. 상대를 존중하지만 감정이 없어 보임. 사실은 자신이 과거에 내린 이름 박탈 판결들을 후회함 |
| 동기 | 물마루가 새기다 틀린 **바다의 참이름 원판**을 찾아 바로 새기는 것. 그러려면 다른 세력의 영장을 모두 열람해야 함 |
| 라이벌 | **렌**(이브로가 직접 이름을 지운 사람), **나할**(옛 제자, 기록 대신 신앙을 택함) |
| 호명술 | **주석 달기 / Annotate**: 손패의 무작위 의식 하나에 덧새김(비용 1 감소). 의식이 없으면 내 호명자 껍질 +2 |
| 플레이 정체성 | **제거 컨트롤(빠른 덱 사냥꾼)**. 잉걸 의식·봉인문·닻으로 빠른 덱의 필드를 매 턴 지우고, 손패 우위로 굳혀 이김. 대신 벽(오다)·저주(나할)처럼 느리게 쌓는 덱에는 제거가 모자람(1-1 측정 반영) |
| 아키타입 | ① 잉걸 버스트(B070·B071·A039 잉걸 + D012로 의식 연쇄) ② 봉인문 컨트롤(B065~B067·B076·B078) ③ 덧새김 장기전(D011·호명술로 손패 의식을 키움, A038·A013 정리) |
| 시각 힌트 | 호박색 등불 + 먹색. 실루엣 = 위로 긴 **세로 직사각형**, 꼭대기에 작은 불꽃 일곱 점이 부채꼴로 |

대사:
| 용도 | ko | en |
|---|---|---|
| 등장 | 기록을 시작하지. 당신의 이름부터. | Let the record begin. Your name first. |
| 승리 | 결론: 예상대로. | Conclusion: as expected. |
| 패배 | 흥미롭군. 각주로 남겨 두겠소. | Interesting. I'll leave a footnote. |
| 위협 | 당신 이름의 철자를 이미 알고 있소. | I already know how your name is spelled. |
| 위기 | 기록상 이런 위기는... 처음이군. | On record, a crisis like this is... a first. |
| 감사 | 기록해 두겠소. | Noted. |
| 경의 | 훌륭한 반론이오. | An excellent rebuttal. |
| 심지 부족 | 등잔이 아직 어둡소. | My lamps are still dim. |

### 4-6. 렌 (Wren) — 이름 없는 칼

| 항목 | 내용 |
|---|---|
| id / 세력 | `h_nameless` / 무명단 |
| 나이·모습 | 나이 불명(20대 후반으로 보임). 회색 후드, 얼굴 반을 가린 빈 문패 모양 가면, 소매에 바늘. "렌"은 남이 붙인 별명(굴뚝새) |
| 성격 | 냉소적이고 장난스러움. 질문에 질문으로 답함. 무명단 아이들에게만 다정함 |
| 동기 | 자기 이름이 지워진 판결 기록을 등불 서고에서 훔쳐 내는 것. 진짜 목적은 이름 박탈 제도 자체를 없애는 것 |
| 라이벌 | **이브로 탈**(자기 이름을 지운 판관), **오다 벨**(수조 장부 사건으로 현상금이 걸림) |
| 호명술 | **표식 / Mark**: 적 응답자 하나에 표식. 이번 턴에 그 응답자가 죽으면 카드 1장 |
| 플레이 정체성 | **템포**. 물안개로 숨은 응답자와 싼 의식으로 필드를 치우며 매 턴 카드를 벌어들임. 뒷물결(먼저 다른 카드를 낸 턴) 연쇄 |
| 아키타입 | ① 물안개 암살(B079·B084·B085·B089, 숨었다가 치고 빠짐) ② 뒷물결 연쇄(D014·A042·A046·A048, 싼 카드 여러 장으로 드로우) ③ 이름 지우기·익사 교환(B081·B082·B086·B090·A044) |
| 시각 힌트 | 안개 회색 + 탁한 보라. 실루엣 = **초승달**(굽은 등과 후드), 얼굴 자리는 빈 사각. 몸 윤곽이 아래로 흐려짐 |

대사:
| 용도 | ko | en |
|---|---|---|
| 등장 | 날 아나? 아무도 몰라. 그게 좋아. | Know me? Nobody does. I like that. |
| 승리 | 네 이름, 잠깐 빌려 갈게. | I'll borrow your name for a while. |
| 패배 | 괜찮아. 잃을 이름도 없거든. | It's fine. No name to lose. |
| 위협 | 뒤에 누가 있는지 안 궁금해? | Not curious who's behind you? |
| 위기 | 이름도 없는데 목숨까지 잃긴 아깝지. | No name already. Shame to lose my life too. |
| 감사 | 오, 공짜는 좋지. | Oh, free is nice. |
| 경의 | 제법인데? 누구더라, 너. | Not bad. Who were you again? |
| 심지 부족 | 심지가 없네. 훔칠까? | No wicks. Should I steal some? |

### 4-7. 상성과 라이벌 고리 (balance 1-2 최종 측정 반영, round-1 갱신)

balance 1-2 최종 매트릭스(교환 평가형 AI, 쌍당 2000판, 52 % 이상 = 이김, 48~52 % = 호각, `20-balance.md` 9-1)에 맞춰 이야기를 고쳤습니다. 1-1 초안과 방향이 바뀐 곳은 ★.

| 호명자 | 이기는 상대 (측정 %) | 지는 상대 | 세계관 해석 |
|---|---|---|---|
| 카드라 (어그로) | 펠 56.9, ★나할 60.1 (렌 51.2 호각) | ★이브로 41.4, 오다 35.5 | 사구 기병은 소금독이 스밀 시간을 주지 않고 인양장(펠)을 털어 감. 수조의 벽(오다)과 서고의 기록(이브로)에 막힘 |
| 오다 (미드·방어) | 카드라 64.5, ★이브로 59.0 | 나할 44.5, 렌 38.3, 펠 30.7 | 수조의 벽은 서고의 불로도 다 타지 않음. 하지만 물에 잠기고(나할), 장부를 도둑맞고(렌), 기계에 뚫림(펠) |
| 나할 (저주 컨트롤) | 오다 55.5, ★이브로 55.9, 렌 57.1 | ★카드라 40.0, 펠 29.2 | 옛 제자가 스승의 기록을 신앙으로 넘어섬. 가만히 있는 자는 모두 잠기지만 달리는 자와 기계는 잠기지 않음 |
| 펠 (부품 성장) | 나할 70.8, 이브로 68.0, 오다 69.3 | 렌 26.4, 카드라 43.1 | 해체공은 망자의 노래도, 서고의 법도, 수조의 벽도 뜯어 냄. 도둑과 약탈자에게는 부품을 빼앗김 |
| 이브로 (제거 컨트롤) | ★렌 65.7, ★카드라 58.6 | ★나할 44.1, ★오다 41.0, 펠 31.9 | 4-8절 |
| 렌 (템포) | 펠 73.6, 오다 61.7 | ★이브로 34.3, 나할 42.9 (카드라 48.8 호각) | 수조 장부를 훔친 도둑. 자기 이름을 쥔 판관 이브로가 천적 |

- 라이벌 서사 세 쌍은 측정과 같은 방향: 오다 > 카드라(물), 나할 > 이브로(옛 스승과 제자), 이브로 > 렌(이름을 지운 판관과 지워진 자).
- 상성 고리 예: 이브로 > 렌 > 오다 > 이브로, 이브로 > 카드라 > 나할 > 이브로, 펠 > 나할 > 렌 > 펠.
- balance에 방향을 바꿔 달라는 요청은 없음(이야기를 측정에 맞춤).

### 4-8. 이브로의 상성 4칸 이야기 (연대기·맞대결 대사 소재)

이브로는 "모든 이름을 기록한 자"라서, **기록할 시간을 주지 않고 덮치는 자(빠른 덱)는 이미 기록에 있어 대비**하지만, **기록보다 오래 버티는 것(벽·신앙)은 지울 방법이 없다**. 이 원리 하나로 4칸을 설명합니다. 맞대결 첫 대사는 상대가 정해진 짝일 때 일반 등장 대사 대신 쓰는 선택 키입니다.

| 칸 | 측정 | 장면 | 맞대결 첫 대사 키 | ko | en |
|---|---|---|---|---|---|
| 이브로 > 렌 | 65.7 % | 렌이 훔치려는 판결 기록은 이브로가 직접 썼다. 렌의 수법(물안개·뒷물결)은 이미 각주에 다 적혀 있다. 렌은 이길 때까지 다시 온다 | `line_archive_vs_nameless` | 당신 수법은 3권 41쪽에 있소. | Your tricks are in volume three, page forty-one. |
| | | | `line_nameless_vs_archive` | 오늘은 그 책을 태우러 왔어. | Today I came to burn that book. |
| 이브로 > 카드라 | 58.6 % | 씨족의 길은 마른 강바닥뿐이고, 서고는 모든 강의 지도를 가졌다. 카드라는 지도에 없는 길을 찾는 중 | `line_archive_vs_rider` | 당신이 지나갈 강바닥에 이미 봉인을 묻어 두었소. | I have already buried seals in the riverbed you will ride. |
| | | | `line_rider_vs_archive` | 지도에 없는 길로 가면 그만이지! | Then I'll ride a road that isn't on your map! |
| 나할 > 이브로 | 55.9 % | 스승은 바다를 "고칠 기록"으로 봤고, 제자는 "사과할 신"으로 봤다. 기록은 지울 수 있지만 믿음은 지울 데가 없다 | `line_choir_vs_archive` | 스승님, 바다는 각주를 읽지 않아요. | Teacher, the sea doesn't read footnotes. |
| | | | `line_archive_vs_choir` | 너를 가르친 걸 기록에서 지울 수는 없구나. | I can't strike from the record that I taught you. |
| 오다 > 이브로 | 59.0 % | 서고의 심지는 수조의 기름으로 켠다. 이브로의 의식은 오다의 벽을 태우기 전에 기름이 먼저 떨어진다 | `line_warden_vs_archive` | 당신 등잔 기름, 어느 수조에서 나오는지 알지? | You know which cistern fuels your lamps, don't you? |
| | | | `line_archive_vs_warden` | 알고 있소. 그래서 늘 빚진 기분이오. | I do. That's why I always feel in your debt. |

(펠 > 이브로 68.0 %: 해체공은 기록 대신 실물을 뜯는다. 맞대결 대사는 round-2 후보.)

---

## 5. 세력 구성과 카드 배분

### 5-1. 배분표 (200장 = 영웅 전용 25 × 6 + 공용 50)

| 소유 | 드로우버프 | 버프(디버프 포함) | 공격·즉시타격 | 공격·드로우 | 합 | 성격 |
|---|---|---|---|---|---|---|
| 오다 `h_warden` | 2 | 18 | 1 | 4 | 25 | 버프 많음(방어·오라) |
| 나할 `h_choir` | 2 | 18 | 2 | 3 | 25 | 디버프 많음 |
| 펠 `h_wreck` | 4 | 15 | 2 | 4 | 25 | 드로우버프(인양) 많음 |
| 카드라 `h_rider` | 1 | 13 | 6 | 5 | 25 | 즉시타격 최다 |
| 이브로 `h_archive` | 4 | 14 | 2 | 5 | 25 | 드로우버프·주문 |
| 렌 `h_nameless` | 2 | 12 | 2 | 9 | 25 | 공격 드로우형 최다 |
| 공용 `neutral` | 5 | 30 | 3 | 12 | 50 | 모든 갈래 |
| **합** | **20** | **120** | **18** | **42** | **200** | 요청자 비율 1:6:3, 공격 3:7 |

- 덱 30장 = 영웅 전용 25장 중 고르기 + 공용. 영웅 전용만으로 25장이라 공용 없이도 덱이 짜이지 않으므로 공용이 반드시 섞이고, 공용 50장이 "어느 영웅에 넣느냐"로 덱 축을 바꾸게 했습니다(공용 방파제·소금독·박차·썰물 카드).
- 2장 제한이라 영웅 전용 25종 × 2 = 50장 후보가 있어 아키타입 2~3개가 섭니다.

### 5-2. 갈래 표 (`branch` id)

| 유형 | 갈래 id | 이름 | 설명 | 주로 쓰는 호명자 |
|---|---|---|---|---|
| 드로우버프 | `d_draw` | 뽑기 | 카드를 뽑음(조건부 추가) | 전체 |
| | `d_seek` | 찾아오기 | 영장첩에서 조건에 맞는 카드를 찾음 | 오다·나할·렌·공용 |
| | `d_discount` | 비용 감소 | 다음 카드·손패 카드 비용 감소 | 펠·이브로·공용 |
| | `d_etch` | 덧새김 | 손패 카드를 미리 강화 | 펠·이브로·공용 |
| | `d_salvage` | 인양 | 후보 3장 중 1장을 손패로 | 펠·이브로·공용 |
| 버프 | `b_single` | 단일 강화 | 응답자 하나 강화, 키워드 부여 | 전체 |
| | `b_aura` | 전체·오라 | 전체 강화, 필드에 있는 동안 주변 강화 | 오다·카드라·공용 |
| | `b_swell` | 지속 성장 | 차오름 등 시간이 갈수록 강해짐 | 펠·카드라·공용 |
| | `b_guard` | 보호 | 방파제·소금막·물안개 | 오다·공용 |
| | `b_mend` | 회복·껍질 | 명줄 회복, 껍질, 들이켬 | 오다·이브로·공용 |
| | `b_weaken` | 약화 | 적 공격력·체력 감소 | 나할·렌·카드라 |
| | `b_unname` | 이름 지우기 | 효과 제거 | 나할·렌·이브로 |
| | `b_anchor` | 닻(행동 봉쇄) | 다음 공격 기회를 빼앗음 | 나할·이브로 |
| | `b_brine` | 소금독 누적 | 저주 수치를 쌓아 매 턴 피해 | 나할·공용 |
| | `b_offering` | 봉헌 | 내 응답자를 희생해 이득 | 나할 전용 |
| | `b_fit` | 부품 | 응답자에 붙는 강화 카드(부품) | 펠 전용 |
| | `b_sealwrit` | 봉인문 | 숨겨 둔 함정 | 이브로·공용 |
| | `b_ebb` | 썰물 강화 | 썰물(죽을 때) 효과를 주거나 키움 | 펠·공용 |
| 즉시타격 | `ai_bolt` | 직격 | 단일 직접 피해 | 카드라·이브로·나할 |
| | `ai_rapids` | 급류 덮침 | 내자마자 공격하는 응답자 | 카드라·공용 |
| | `ai_sweep` | 휩쓸기 | 범위 즉시 피해 | 나할·이브로·오다 |
| 공격·드로우 | `ad_onkill` | 처치 드로우 | 처치하면 뽑기 | 전체 |
| | `ad_onhit` | 적중 드로우 | 피해를 주면 뽑기 | 렌·카드라·공용 |
| | `ad_wake` | 뒷물결 드로우 | 먼저 카드를 낸 턴에 피해 + 뽑기 | 렌·이브로·공용 |
| | `ad_brand` | 인장 | 무기 공격으로 뽑기 | 렌·오다·카드라 |
| | `ad_ebb` | 썰물 드로우 | 죽을 때 뽑는 공격 응답자 | 나할·공용 |
| | `ad_raid` | 약탈 | 상대 카드의 사본을 가져옴 | 렌·카드라·공용 |

### 5-3. 혈통(태그) 제안 (덱 빌딩 두 번째 축)

00-benchmark 1절 "태그 시너지 + 키워드 시너지 두 축"에 맞춘 제안입니다. 어떤 카드가 응답자인지는 balance-designer가 정하므로, 응답자로 정해진 카드에 아래 혈통을 붙입니다.

| 혈통 (ko/en) | 붙는 카드 | 세계관 |
|---|---|---|
| 파수병 / Warden | 오다 전용 응답자 | 수조를 지키는 군인 |
| 익사자 / Drowned | 나할 전용 응답자, 공용 B118·A054·A060 | 물에 바친 망자·사제 |
| 태엽물 / Contraption | 펠 전용 응답자 | 인양한 기계 |
| 기수 / Rider | 카드라 전용 응답자 | 사구 기병과 탈것 |
| 필경사 / Scribe | 이브로 전용 응답자 | 서고 학자·수리공 |
| 무명 / Nameless | 렌 전용 응답자 | 이름 잃은 자 |
| 갯것 / Shoreling | 공용 짐승(B096 거북, B097 갈매기, A016 물개, A051 뻘게, B108 해파리, B110 갈매기 떼 등) | 바다가 빠진 뒤 남은 생물 |

### 5-4. 희귀도 4단계

| 단계 (id) | ko / en | 의미 | 현재 장수 | 덱 제한 |
|---|---|---|---|---|
| `sand` | 모래 / Sand | 어디서나 줍는 흔한 이름 | 118 | 2장 |
| `pearl` | 진주 / Pearl | 껍데기 속에 숨은 이름 | 50 | 2장 |
| `coral` | 산호 / Coral | 오래 자란 강한 이름 | 23 | 2장 |
| `abyss` | 심해 / Abyss | 바닥에서 단 하나만 건진 이름(호명자 시그니처 포함) | 9 | 1장 |

희귀도는 제안이며 팩 확률·제작 비용은 balance-designer가 정합니다.

---

## 6. 키워드 사전 (18개)

00-benchmark 1절·10절 기준(14~18개, 키워드당 평균 8장 이상)을 따릅니다. 등장 수는 `check-cards.mjs`가 `concept_ko`에서 센 값(평균 **11.9장**, 1-2 수정 뒤). 호명술로 쓰는 키워드는 실제 판에서 더 자주 나옵니다.

| # | 기능 (00-benchmark 5절) | 우리 키워드 (ko / en) | 세계관 의미 | 카드 글 형식 | 등장 수 |
|---|---|---|---|---|---|
| 1 | 들어올 때 효과 | **첫 숨 / First Breath** | 응답자가 조수원에서 처음 숨을 쉴 때 터지는 힘 | 첫 숨: (효과) | 32 |
| 2 | 죽을 때 효과 | **썰물 / Ebb** | 응답자가 물러가며 남기는 마지막 물결 | 썰물: (효과) | 12 |
| 3 | 공격 대상 강제 | **방파제 / Breakwater** | 앞을 막는 벽. 상대는 이 응답자부터 공격해야 함(의식 대상은 자유) | 방파제 | 22 |
| 4 | 첫 피해 무효 막 | **소금막 / Saltskin** | 몸을 덮은 소금 결정. 첫 피해 한 번을 막고 깨짐 | 소금막 | 9 |
| 5 | 숨기 | **물안개 / Seamist** | 해무에 숨음. 공격하기 전까지 상대가 대상으로 못 고름 | 물안개 | 13 |
| 6 | 즉시 공격(응답자만) | **박차 / Spur** | 낸 턴에 바로 적 응답자를 공격할 수 있음(호명자는 못 침) | 박차 | 14 |
| 7 | 즉시 공격(영웅 포함) | **급류 / Rapids** | 낸 턴에 무엇이든 바로 공격 | 급류 | 7 |
| 8 | 닿으면 처치 | **익사 / Drown** | 이 응답자에게 피해를 받은 응답자는 가라앉아 죽음 | 익사 | 7 |
| 9 | 준 피해만큼 회복 | **들이켬 / Draught** | 상대의 숨을 들이켜 내 명줄로 | 들이켬 | 6 |
| 10 | 효과 지우기 | **이름 지우기 / Unname** | 영장에 새긴 글을 긁어냄. 글 효과·강화가 모두 사라짐(기본 수치만 남음) | 이름 지우기 | 9 |
| 11 | 행동 봉쇄 | **닻 / Anchor** | 닻에 묶임. 다음 공격 기회를 잃음 | 닻 | 9 |
| 12 | 주문 피해 증가 | **잉걸 +N / Kindle +N** | 등잔의 잉걸불. 내 의식 피해 +N | 잉걸 +N / 잉걸 적용 | 9 |
| 13 | 숨겨진 함정 | **봉인문 / Sealwrit** | 밀랍으로 봉해 엎어 둔 영장. 조건이 맞으면 상대 턴에 열림. 상대에게는 "봉인문 있음"만 보임 | 봉인문: (조건이면 효과) | 7 |
| 14 | 다음 턴 마나 빚 | **그을음 N / Soot N** | 심지를 태워 먹음. 다음 턴 심지 N개가 그을려 켜지지 않음 | 그을음 N | 8 |
| 15 | 앞선 카드 조건 | **뒷물결 / Wake** | 앞 카드가 지나간 물결을 타면 더 셈. 이번 턴 다른 카드를 먼저 냈으면 추가 효과 | 뒷물결: (효과) | 10 |
| 16 | 셋 중 하나 고르기 | **인양 / Salvage** | 바닥에서 셋을 끌어올려 하나를 고름 | 인양: (후보) 3장 중 1장 | 6 (+펠 호명술) |
| 17 | 턴마다 쌓임 | **차오름 / Swell** | 밀물처럼 내 턴 시작마다 +1/+1(괄호에 다르게 적으면 그 값) | 차오름 / 차오름(+X/+Y) | 11 |
| 18 | 저주 누적 (자체 기능) | **소금독 N / Brine N** | 몸에 스민 소금. 걸린 쪽의 턴 시작에 소금독 수만큼 피해를 받고 1 줄어듦(제안, 수치는 balance) | 소금독 N | 23 (+나할 호명술) |

### 6-1. 8장 미만 키워드 5개에 대한 의견 (1-2)

| 키워드 | 카드 글 장수 / cards.json 장수 | 덱 축 판단 | 의견 |
|---|---|---|---|
| 들이켬 | 6 / 6 | 오다(회복 버팀)·공용 | **유지**. 오다 아키타입 ③의 정체성. 보강이 필요하면 공용 B094(떠돌이 접골사)에 들이켬을 더하는 것이 세계관상 자연스러움 |
| 인양 | 6 / 6 + 펠 호명술 매 턴 | 펠 | **유지**. 펠 호명술이 매 판 반복 등장하므로 실제 등장 횟수는 가장 많은 축 |
| 급류 | 7 / 7 | 카드라 | **유지**. 박차(14)와 합치면 "응답자만 / 무엇이든" 구분이 사라져 어그로 마무리 계산이 단순해짐. 보강 시 B054(바람 깃발)가 이미 급류를 다룸 |
| 익사 | 7 / 7 | 렌·나할 | **유지**. 렌 > 펠 76.5 %의 원인이라 오히려 늘리지 않는 쪽을 권함 |
| 봉인문 | 7 / 7 + 설치 효과 | 이브로 | **유지**. 숨긴 정보 축은 하나뿐이라 합칠 대상이 없음 |

결론: 합치지 않고 18개 유지. 키워드 평균 11.9장으로 00-benchmark 기준(평균 8 이상)을 채우고, 5개는 각각 한 호명자의 정체성 키워드라 장수가 적어도 그 덱 안에서는 축이 섭니다(balance 1-1 판단과 같음). 카드 수정은 balance가 수치상 필요하다고 할 때만, id·이름 유지 + concept만 바꿈.

키워드가 아닌 규칙 용어(카드 글에 쓰지만 굵은 키워드 아님):
- **덧새김 / Etch**: 손패에 있는 카드를 강화(내기 전 영구 강화).
- **부품 / Fit**: 펠의 부품 카드. 응답자 하나에 붙어 그 응답자가 죽을 때까지 유지되는 강화(의식처럼 쓰고 대상에 붙음).
- **희생**: 내 응답자를 파괴(썰물은 발동).
- **껍질 +N / Shell +N**: 호명자 추가 보호.
- **표식 / Mark**: 렌 호명술 전용 표시.

이름 짓기 원칙: 모두 **물·소금·마른 바다**에서 나온 말로 짓고, 레퍼런스와 다른 상용 TCG 키워드 단어(영문·공식 한국어 번역)와 겹치지 않게 했습니다. 피한 단어 예: 레퍼런스의 들어올 때·죽을 때·대상 강제·보호막·은신·돌진·속공·질풍·독성·생명력 흡수·침묵·빙결·비밀·과부하·연계·발견·주문 공격력 계열 단어와 그 영문, 하수인·방어도·마나 수정 같은 기본 용어, 다른 TCG의 Last Breath·Fanfare·Evolve·Barrier·Elusive·Challenger·Quick Attack·Manifest·Echo·Invoke 등. 직접 검색으로 확인한 결과는 1-1절.

---

## 7. 메타 콘텐츠의 세계관 포장 (실결제 없음)

### 7-1. 팩 = 인양 상자

| 이름 (ko/en) | 설정 | 내용(제안, 확률은 balance) |
|---|---|---|
| **노해 인양 상자 / Bare Sea Crate** | 난파 조합이 바닥에서 건진 영장 묶음을 맹약 시장에 내놓은 것 | 영장 5장, 진주 이상 1장 보장 |
| **세력 상자 / Faction Crate** (6종) | 각 세력이 직접 내놓는 묶음: 「수조 보급함」「젖은 헌금함」「조합 공구함」「씨족 전리품 자루」「서고 사본함」「무명의 꾸러미」 | 그 호명자 전용 + 공용만 나옴(원하는 덱 쪽으로 모으는 길) |
| 천장 이름 | **등대 보장 / Lighthouse Guarantee** — "등대지기는 어떤 배도 잊지 않는다": 일정 상자 안에 심해 1장 보장. 확률·천장은 상자 화면에 공개(00-benchmark 1절) | |

개봉 연출 세계관: 상자 뚜껑을 열면 젖은 소금 덩이 5개가 나오고, 탭하면 소금이 부서지며 영장이 드러남. 부서지기 전 소금 색이 희귀도를 예고(모래=베이지, 진주=흰 무지개, 산호=주홍, 심해=검푸른 빛).

### 7-2. 게임 내 재화

| 재화 (ko/en) | 설정 | 얻는 곳 | 쓰는 곳 |
|---|---|---|---|
| **소금화 / Salt Marks** | 맹약 시장의 공용 화폐(압축 소금 판) | 결투 승리, 의뢰, 조수 달력 | 인양 상자 구매 |
| **각인 먹 / Carving Ink** | 서고회가 파는 참이름 새김용 먹. 넘친 공명이 굳어 생김 | 돌파를 다 채운 영장의 넘친 공명, 일부 보상 | 원하는 영장 1장을 직접 새김(지정 제작) |
| **심해 진주 / Abyss Pearl** | 아주 드문 보상 | 조수 달력 큰 단계 | 세력 상자 구매 또는 외형(카드 테두리) |

실결제 상품은 없습니다. 상점 이름은 **부두 시장 / Dock Market**.

### 7-3. 동일 카드 경험치·돌파 = 공명과 새김

- **세계관**: 같은 참이름을 새긴 영장이 여러 장 모이면 이름끼리 **공명(Resonance)**한다. 공명을 모아 원판의 홈을 더 깊이 파면(돌파) 응답자가 더 또렷하게 나타난다. 너무 깊이 파면 흑조가 알아채므로 맹약 결투에서는 깊이를 맞춘다(→ 랭크 모드 돌파 정규화 제안, 00-benchmark 7-3).
- 이름: 경험치 = **공명 / Resonance**, 돌파 = **새김 돌파 / Recut**.

| 단계 | ko / en | 의미 | 강화 방향(제안, 수치는 balance) |
|---|---|---|---|
| 0 | 갓 새김 / Fresh-cut | 처음 얻은 영장 | 기본 |
| 1 | 깊은 새김 / Deep-cut | 홈이 깊어져 숨이 잘 통함 | 작은 수치 +1 |
| 2 | 소금 새김 / Salt-set | 홈에 소금이 굳어 단단함 | 작은 수치 +1(저비용은 0, 외형만) |
| 3 | 심해 새김 / Abyss-set | 바닥의 빛이 스밈. 최대 | 외형(테두리·첫 등장 연출) 위주 |

### 7-4. 보상 트랙·의뢰·순위

| 항목 | 이름 (ko/en) | 설정 |
|---|---|---|
| 보상 트랙 | **조수 달력 / Tide Calendar** | 시즌 하나 = "한 물때". 결투·의뢰로 **물때 눈금 / Tide Marks**를 채움 |
| 일일 퀘스트 | **오늘의 의뢰 / Daily Commissions** | 각 세력이 맡기는 일(예: "파수단: 방파제 응답자로 적 5명 막기") |
| 주간 퀘스트 | **주간 맹약 / Weekly Accord** | 더 큰 일, 큰 보상 |
| 순위 띠 | 모래띠 → 조개띠 → 진주띠 → 산호띠 → 심해띠 / Sand · Shell · Pearl · Coral · Abyss Band | 맹약 결투 순위 |
| 첫 승 보상 | **첫 물때 보너스 / First Tide Bonus** | 하루 첫 승리 |

### 7-5. 모드

| 모드 (ko/en) | 설정 | 비고 |
|---|---|---|
| **맹약 결투 / Accord Duel** | 공식 순위전. 새김 깊이를 맞춤(돌파 정규화 제안) | 랭크 |
| **조수원 친선 / Circle Sparring** | 순위 없는 결투. 새김은 **고른 영장 한 종(새김 슬롯 1)**만 적용(balance 결정) | 일반 |
| **모래 위 연습 / Sand Practice** | AI 호명자와 연습 | AI 대전·튜토리얼 |
| **썰물 연대기 / Ebb Chronicle** | 호명자 6명의 이야기 결투(각 3~5판). 마지막 장은 흑조의 정체 | 혼자 하기 |

---

## 8. UI 텍스트 전체 키 표 (ko / en)

키는 `snake_case`. `{n}`, `{name}` 같은 자리 표시는 코드가 값을 넣습니다. 대체 글(aria)에는 숫자를 이어 붙이지 않고 `aria-valuenow` 같은 속성을 씁니다(criteria 세계관 절). 대전 중 토스트(`toast_*`, `turn_*`)는 12자(영어 6단어) 안팎.

### 8-1. 타이틀·메뉴

| 키 | ko | en |
|---|---|---|
| `game_title` | 썰물 영장 | Ebbwrit |
| `game_subtitle` | 노해의 호명자들 | Callers of the Bare Sea |
| `title_tap_to_start` | 눌러서 조수원으로 | Tap to enter the Circle |
| `menu_play` | 결투 | Duel |
| `menu_writbook` | 영장첩 | Writbooks |
| `menu_collection` | 수집 | Collection |
| `menu_crates` | 인양 상자 | Crates |
| `menu_market` | 부두 시장 | Dock Market |
| `menu_calendar` | 조수 달력 | Tide Calendar |
| `menu_commissions` | 의뢰 | Commissions |
| `menu_chronicle` | 썰물 연대기 | Ebb Chronicle |
| `menu_settings` | 설정 | Settings |
| `menu_back` | 뒤로 | Back |
| `mode_accord` | 맹약 결투 | Accord Duel |
| `mode_sparring` | 조수원 친선 | Circle Sparring |
| `mode_practice` | 모래 위 연습 | Sand Practice |
| `mode_accord_desc` | 순위가 걸린 결투. 새김 깊이를 맞춥니다. | Ranked. Recut depth is equalized. |
| `mode_sparring_desc` | 순위 없는 결투. 고른 영장 한 종만 새김을 적용합니다. | Unranked. Recut applies to one chosen writ. |
| `mode_practice_desc` | AI 호명자와 연습합니다. | Practice against an AI Caller. |
| `choose_caller` | 호명자를 고르세요 | Choose your Caller |
| `choose_writbook` | 영장첩을 고르세요 | Choose a Writbook |
| `currency_salt` | 소금화 | Salt Marks |
| `currency_ink` | 각인 먹 | Carving Ink |
| `currency_pearl` | 심해 진주 | Abyss Pearls |
| `settings_language` | 언어 | Language |
| `settings_sound` | 소리 | Sound |
| `settings_music` | 음악 | Music |
| `settings_turn_timer` | 턴 시간 표시 | Show turn timer |
| `settings_reset_tutorial` | 튜토리얼 다시 보기 | Replay tutorial |

### 8-2. 영웅 이름·호명술 (화면용)

| 키 | ko | en |
|---|---|---|
| `hero_warden_name` | 오다 벨 | Oda Vell |
| `hero_warden_title` | 제7수조의 수문장 | Gatekeeper of the Seventh Cistern |
| `hero_warden_power` | 자리 지켜 | Hold the Line |
| `hero_warden_power_desc` | 응답자 하나 +0/+1, 다음 턴까지 방파제. | An Answerer gets +0/+1 and Breakwater until your next turn. |
| `hero_choir_name` | 수녀 나할 | Sister Nhal |
| `hero_choir_title` | 잠긴 성가대의 선창자 | Cantor of the Drowned Loft |
| `hero_choir_power` | 짠 숨 | Salt Breath |
| `hero_choir_power_desc` | 적 하나에 소금독 1. | Give an enemy Brine 1. |
| `hero_wreck_name` | 펠 하스크 | Pell Hask |
| `hero_wreck_title` | 녹슨 갈비뼈의 수석 해체공 | Chief Breaker of the Rustribs |
| `hero_wreck_power` | 작은 인양 | Small Haul |
| `hero_wreck_power_desc` | 인양: 부품 3장 중 1장. | Salvage: 1 of 3 Fit cards. |
| `hero_rider_name` | 카드라 순 | Kadra Sund |
| `hero_rider_title` | 붉은 사구의 선봉 기수 | Vanguard of the Red Dunes |
| `hero_rider_power` | 채찍질 | Lash On |
| `hero_rider_power_desc` | 응답자 하나 이번 턴 +2 공격력과 박차. | An Answerer gets +2 Attack and Spur this turn. |
| `hero_archive_name` | 이브로 탈 | Ivro Tal |
| `hero_archive_title` | 등불 서고의 사서장 | Head Archivist of the Lamplit Archive |
| `hero_archive_power` | 주석 달기 | Annotate |
| `hero_archive_power_desc` | 손패의 의식 하나 비용 1 감소. 없으면 껍질 +2. | A Rite in hand costs 1 less. If none, gain 2 Shell. |
| `hero_nameless_name` | 렌 | Wren |
| `hero_nameless_title` | 이름 없는 칼 | The Unsigned Blade |
| `hero_nameless_power` | 표식 | Mark |
| `hero_nameless_power_desc` | 적 응답자 하나에 표식. 이번 턴 죽으면 1장 뽑기. | Mark an enemy Answerer. If it dies this turn, draw 1. |

### 8-3. 영장첩(덱 빌더)·수집

| 키 | ko | en |
|---|---|---|
| `deck_new` | 새 영장첩 | New Writbook |
| `deck_name_default` | {name}의 영장첩 | {name}'s Writbook |
| `deck_rename` | 이름 바꾸기 | Rename |
| `deck_count` | {n}/30 | {n}/30 |
| `deck_save` | 저장 | Save |
| `deck_delete` | 영장첩 버리기 | Discard Writbook |
| `deck_delete_confirm` | 이 영장첩을 버릴까요? 되돌릴 수 없습니다. | Discard this Writbook? This can't be undone. |
| `deck_auto_fill` | 나머지 채우기 | Auto-fill |
| `deck_filter_cost` | 심지 | Wicks |
| `deck_filter_type` | 종류 | Type |
| `deck_filter_keyword` | 키워드 | Keyword |
| `deck_filter_owner` | 전용/공용 | Caller / Common |
| `deck_curve` | 심지 곡선 | Wick curve |
| `deck_incomplete` | 30장이 되어야 결투할 수 있습니다. | A Writbook needs 30 writs to duel. |
| `deck_limit_two` | 같은 영장은 2장까지입니다. | No more than 2 copies. |
| `deck_limit_one` | 심해 영장은 1장만 넣을 수 있습니다. | Only 1 copy of an Abyss writ. |
| `deck_owner_mismatch` | 다른 호명자의 전용 영장입니다. | This writ belongs to another Caller. |
| `card_type_answerer` | 응답자 | Answerer |
| `card_type_rite` | 의식 | Rite |
| `card_type_brand` | 인장 | Brand |
| `card_owner_common` | 공용 | Common |
| `rarity_sand` | 모래 | Sand |
| `rarity_pearl` | 진주 | Pearl |
| `rarity_coral` | 산호 | Coral |
| `rarity_abyss` | 심해 | Abyss |
| `recut_level_0` | 갓 새김 | Fresh-cut |
| `recut_level_1` | 깊은 새김 | Deep-cut |
| `recut_level_2` | 소금 새김 | Salt-set |
| `recut_level_3` | 심해 새김 | Abyss-set |
| `resonance` | 공명 | Resonance |
| `recut_button` | 새김 돌파 | Recut |
| `recut_ready` | 새김 돌파 가능 | Ready to Recut |
| `recut_done` | 이름이 더 깊이 새겨졌습니다. | The name is carved deeper. |
| `recut_max` | 더 새길 수 없습니다. 넘친 공명은 각인 먹이 됩니다. | Fully carved. Overflow Resonance becomes Carving Ink. |
| `inscribe_button` | 새기기 | Inscribe |
| `inscribe_confirm` | 각인 먹 {n}개로 이 영장을 새길까요? | Inscribe this writ for {n} Carving Ink? |
| `collection_owned` | 가진 영장 | Owned |
| `collection_missing` | 없는 영장 | Missing |

### 8-4. 인양 상자(팩 개봉)·시장

| 키 | ko | en |
|---|---|---|
| `crate_bare_sea` | 노해 인양 상자 | Bare Sea Crate |
| `crate_faction` | 세력 상자 | Faction Crate |
| `crate_warden` | 수조 보급함 | Cistern Supply Box |
| `crate_choir` | 젖은 헌금함 | Sodden Offering Box |
| `crate_wreck` | 조합 공구함 | Guild Toolbox |
| `crate_rider` | 씨족 전리품 자루 | Clan Spoils Sack |
| `crate_archive` | 서고 사본함 | Archive Copy Case |
| `crate_nameless` | 무명의 꾸러미 | Nameless Bundle |
| `crate_open` | 상자 열기 | Open Crate |
| `crate_tap_salt` | 소금을 눌러 부수세요 | Tap the salt to break it |
| `crate_reveal_all` | 모두 부수기 | Break all |
| `crate_new` | 새 이름 | New |
| `crate_duplicate` | 공명 +{n} | Resonance +{n} |
| `crate_guarantee` | 등대 보장까지 {n}상자 | {n} crates to Lighthouse Guarantee |
| `crate_odds` | 확률 보기 | View odds |
| `crate_odds_title` | 상자 확률 공개 | Crate odds |
| `market_buy` | 사기 | Buy |
| `market_price` | 소금화 {n} | {n} Salt Marks |
| `market_not_enough` | 소금화가 모자랍니다. | Not enough Salt Marks. |
| `market_no_real_money` | 이 시장은 게임 안 재화만 받습니다. | This market only takes in-game currency. |

### 8-5. 대전 HUD·턴 알림

| 키 | ko | en |
|---|---|---|
| `hud_lifeline` | 명줄 | Lifeline |
| `hud_shell` | 껍질 | Shell |
| `hud_wicks` | 심지 | Wicks |
| `hud_deck_left` | 남은 영장 | Writs left |
| `hud_hand` | 손패 | Hand |
| `hud_sunk` | 가라앉은 자리 | The Sunk |
| `hud_sealwrit_hidden` | 봉인문 있음 | Sealwrit set |
| `hud_end_breath` | 숨 고르기 | End Breath |
| `hud_enemy_turn` | 상대 차례 | Enemy turn |
| `hud_calling` | 호명술 | Calling |
| `hud_calling_used` | 이미 썼습니다 | Already used |
| `mulligan_title` | 첫 물때 고르기 | First Tide |
| `mulligan_desc` | 바꿀 영장을 누르세요. | Tap writs to replace. |
| `mulligan_confirm` | 확정 | Confirm |
| `coin_first` | 먼저 부릅니다 | You call first |
| `coin_second` | 나중에 부릅니다 | You call second |
| `spare_wick_name` | 여분 심지 | Spare Wick |
| `spare_wick_desc` | 이번 턴 심지 +1. | Gain 1 Wick this turn. |
| `turn_yours` | 당신의 차례 | Your turn |
| `turn_enemy` | 상대의 차례 | Enemy turn |
| `turn_timer_low` | 심지가 타들어 갑니다 | Wick's burning low |
| `turn_auto_end` | 차례가 끝났습니다 | Turn ended |
| `toast_no_wicks` | 심지가 모자랍니다 | Not enough Wicks |
| `toast_circle_full` | 조수원이 가득 찼습니다 | Circle is full |
| `toast_hand_full` | 손패가 넘쳤습니다 | Hand full. Writ lost |
| `toast_cant_attack_yet` | 아직 못 칩니다 | Can't attack yet |
| `toast_anchored` | 닻에 묶였습니다 | Anchored |
| `toast_must_hit_breakwater` | 방파제부터 쳐야 합니다 | Hit the Breakwater first |
| `toast_seamist_untargetable` | 물안개라 못 고릅니다 | Hidden in Seamist |
| `toast_hollow_call` | 공허 호명 피해 {n} | Hollow Call! {n} damage |
| `toast_sealwrit_opened` | 봉인문이 열렸습니다 | A Sealwrit opens |
| `toast_soot` | 심지 {n}개 그을림 | {n} Wicks sooted |
| `toast_brine_burst` | 소금독이 스밉니다 | Brine seeps in |
| `toast_salvage` | 하나를 건지세요 | Haul one up |
| `hud_aria_lifeline` | 명줄 | Lifeline |
| `hud_aria_wicks` | 사용 가능한 심지 | Available Wicks |
| `draw_turn_limit` | 물때가 다했습니다. 무승부 판정 | The tide ran out. Judging the draw |

### 8-6. 승리·패배

| 키 | ko | en |
|---|---|---|
| `result_victory` | 승리 | Victory |
| `result_defeat` | 패배 | Defeat |
| `result_draw` | 무승부 | Draw |
| `result_victory_sub_1` | 이름은 당신 편에 남았습니다. | Your name holds. |
| `result_victory_sub_2` | 맹약이 당신의 손을 들어 주었습니다. | The Accord rules in your favor. |
| `result_victory_sub_3` | 조수원의 소금이 마릅니다. | The Circle's salt dries. |
| `result_defeat_sub_1` | 명줄이 끊겼습니다. 이름은 아직 남았습니다. | Your Lifeline broke. Your name remains. |
| `result_defeat_sub_2` | 이번 물때는 상대의 것이었습니다. | This tide was theirs. |
| `result_defeat_sub_3` | 영장첩을 다시 섞을 때입니다. | Time to reshuffle your Writbook. |
| `result_rewards` | 받은 보상 | Rewards |
| `result_tide_marks` | 물때 눈금 +{n} | Tide Marks +{n} |
| `result_first_tide_bonus` | 첫 물때 보너스 | First Tide Bonus |
| `result_rematch` | 다시 결투 | Rematch |
| `result_to_menu` | 부두로 | To the Dock |
| `rank_sand` | 모래띠 | Sand Band |
| `rank_shell` | 조개띠 | Shell Band |
| `rank_pearl` | 진주띠 | Pearl Band |
| `rank_coral` | 산호띠 | Coral Band |
| `rank_abyss` | 심해띠 | Abyss Band |
| `rank_up` | 띠가 올랐습니다 | Band up |

### 8-7. 튜토리얼 (모래 위 연습 1판, 18세 대상이라 그림 힌트는 보조)

| 키 | ko | en | 함께 보일 표시 |
|---|---|---|---|
| `tut_1_welcome` | 소금 맹약에 따라, 결투는 영장으로 합니다. | By the Brine Accord, we duel with writs. | 조수원 전체 조명 |
| `tut_2_wicks` | 심지는 매 턴 하나씩 늘고, 다 쓰면 꺼집니다. | One more Wick each turn. Unused ones go out. | 심지 막대 강조 |
| `tut_3_play` | 영장을 조수원으로 끌거나, 눌러서 내세요. | Drag a writ into the Circle, or tap it. | 손패 카드 위 화살표 |
| `tut_4_summon_sick` | 막 나온 응답자는 다음 턴부터 공격합니다. | New Answerers attack from next turn. | 잠든 표시 |
| `tut_5_attack` | 내 응답자에서 상대 쪽으로 끌어 공격합니다. | Drag from your Answerer to attack. | 화살표 선 |
| `tut_6_breakwater` | 방파제가 있으면 그것부터 쳐야 합니다. | Breakwater must be hit first. | 벽 아이콘 |
| `tut_7_calling` | 호명술은 턴마다 한 번 쓸 수 있습니다. | Use your Calling once per turn. | 호명술 버튼 강조 |
| `tut_8_end` | 할 일이 끝나면 숨 고르기를 누르세요. | When done, press End Breath. | 버튼 깜빡임 |
| `tut_9_lifeline` | 상대 명줄을 0으로 만들면 이깁니다. | Bring their Lifeline to 0 to win. | 상대 명줄 강조 |
| `tut_10_keyword` | 굵은 말을 길게 누르면 뜻이 나옵니다. | Hold a bold word to see its meaning. | 키워드 밑줄 |
| `tut_done` | 이제 당신도 호명자입니다. | You are a Caller now. | 없음 |
| `tut_skip` | 건너뛰기 | Skip | |

### 8-8. 키워드 도움말 (길게 누르기)

| 키 | ko | en |
|---|---|---|
| `kw_first_breath` | 첫 숨: 손패에서 낼 때 한 번 발동합니다. | First Breath: Triggers once when played from hand. |
| `kw_ebb` | 썰물: 이 응답자가 죽을 때 발동합니다. | Ebb: Triggers when this Answerer dies. |
| `kw_breakwater` | 방파제: 상대는 이 응답자부터 공격해야 합니다. | Breakwater: Enemies must attack this first. |
| `kw_saltskin` | 소금막: 첫 피해 한 번을 막고 깨집니다. | Saltskin: Blocks the first damage, then breaks. |
| `kw_seamist` | 물안개: 공격하기 전까지 대상으로 고를 수 없습니다. | Seamist: Can't be targeted until it attacks. |
| `kw_spur` | 박차: 낸 턴에 적 응답자를 공격할 수 있습니다. | Spur: Can attack Answerers the turn it's played. |
| `kw_rapids` | 급류: 낸 턴에 무엇이든 공격할 수 있습니다. | Rapids: Can attack anything the turn it's played. |
| `kw_drown` | 익사: 이것에게 피해를 받은 응답자는 죽습니다. | Drown: Answerers damaged by this die. |
| `kw_draught` | 들이켬: 준 피해만큼 내 명줄을 회복합니다. | Draught: Damage dealt heals your Lifeline. |
| `kw_unname` | 이름 지우기: 글 효과와 강화를 모두 지웁니다. | Unname: Removes all text and buffs. |
| `kw_anchor` | 닻: 다음 공격 기회를 잃습니다. | Anchor: Loses its next attack. |
| `kw_kindle` | 잉걸 +N: 내 의식 피해가 N 늘어납니다. | Kindle +N: Your Rites deal N more damage. |
| `kw_sealwrit` | 봉인문: 숨겨 두었다가 조건이 맞으면 상대 차례에 열립니다. | Sealwrit: Hidden; opens on the enemy turn when its condition is met. |
| `kw_soot` | 그을음 N: 다음 턴 심지 N개를 쓸 수 없습니다. | Soot N: N Wicks can't be used next turn. |
| `kw_wake` | 뒷물결: 이번 턴 다른 카드를 먼저 냈으면 추가 효과. | Wake: Bonus if you played another card first this turn. |
| `kw_salvage` | 인양: 후보 3장 중 1장을 골라 손패로. | Salvage: Choose 1 of 3 to add to your hand. |
| `kw_swell` | 차오름: 내 턴 시작마다 +1/+1. | Swell: Gains +1/+1 at the start of your turn. |
| `kw_brine` | 소금독 N: 걸린 쪽 턴 시작에 N 피해, 그 뒤 1 줄어듭니다. | Brine N: Takes N damage at the start of its turn, then N drops by 1. |
| `kw_etch` | 덧새김: 손패에 있는 카드를 미리 강화합니다. | Etch: Upgrades a card while it's in your hand. |
| `kw_fit` | 부품: 응답자 하나에 붙어 강화합니다. | Fit: Attaches to an Answerer to upgrade it. |

### 8-9. 의뢰·달력·연대기

| 키 | ko | en |
|---|---|---|
| `commission_daily` | 오늘의 의뢰 | Daily Commissions |
| `commission_weekly` | 주간 맹약 | Weekly Accord |
| `commission_reroll` | 다른 의뢰 받기 | Swap commission |
| `commission_claim` | 보상 받기 | Claim |
| `commission_example_win` | {name}(으)로 결투 {n}번 이기기 | Win {n} duels as {name} |
| `commission_example_breakwater` | 방파제 응답자로 공격 {n}번 막기 | Block {n} attacks with Breakwater |
| `commission_example_brine` | 소금독 피해 {n} 주기 | Deal {n} Brine damage |
| `calendar_title` | 조수 달력 | Tide Calendar |
| `calendar_season` | {n}번째 물때 | Tide {n} |
| `calendar_ends_in` | 물때가 바뀔 때까지 {n}일 | Tide turns in {n} days |
| `chronicle_title` | 썰물 연대기 | Ebb Chronicle |
| `chronicle_locked` | 앞 장을 마쳐야 열립니다 | Finish the previous chapter |

### 8-11. round-1 추가 키 (개발 임시 키 29개 확정 + 새 키)

`games/tcg-01/data/strings-extra.json`의 임시 키 29개(실제 28개 + 메모)를 검토해 확정합니다. 값을 고친 키는 `ai_level`(en: Opponent → Opponent skill)과 `recut_rule_note`(친선 = 고른 영장 한 종, 영어 문장 나눔) 2개입니다. 이 표가 생겼으므로 임시 파일은 지워도 됩니다.

| 키 | ko | en |
|---|---|---|
| `settings_fast_view` | 빠르게 보기 | Fast view |
| `settings_reduce_motion` | 움직임 줄이기 | Reduce motion |
| `battle_concede` | 결투 포기 | Concede |
| `deck_standard` | 표준 영장첩 | Standard Writbook |
| `deck_standard_locked` | 표준 영장첩은 고칠 수 없습니다. 새 영장첩을 만드세요. | Standard Writbooks can't be edited. Make a new one. |
| `deck_saved` | 저장했습니다 | Saved |
| `ai_level` | 상대 실력 | Opponent skill |
| `ai_easy` | 서툰 호명자 | Green Caller |
| `ai_hard` | 노련한 호명자 | Seasoned Caller |
| `filter_all` | 전체 | All |
| `stat_attack` | 공격력 | Attack |
| `stat_health` | 명줄 | Lifeline |
| `stat_durability` | 새김 수 | Cuts |
| `stat_effect` | 효과 수치 | Effect value |
| `stat_cosmetic` | 외형만 | Cosmetic only |
| `recut_rule_note` | 맹약 결투는 새김 깊이를 맞추고, 조수원 친선은 고른 영장 한 종만, 모래 위 연습은 모두 적용합니다. | Accord Duels equalize Recut depth. Circle Sparring applies one chosen writ. Sand Practice applies all. |
| `ink_not_enough` | 각인 먹이 모자랍니다. | Not enough Carving Ink. |
| `crate_none` | 열 상자가 없습니다. | No crates to open. |
| `odds_slot` | 일반 칸 | Normal slot |
| `odds_guarantee_slot` | 보장 칸 | Guaranteed slot |
| `odds_pity` | 등대 보장: 심해 {a}상자, 산호 {c}상자, 첫 심해 {f}상자 안 | Lighthouse Guarantee: Abyss within {a}, Coral within {c}, first Abyss within {f} crates |
| `market_bought` | 샀습니다 | Bought |
| `market_featured` | 오늘의 영장 | Writ of the Day |
| `market_sold_out` | 다 팔렸습니다 | Sold out |
| `commission_claimed` | 받았습니다 | Claimed |
| `on` | 켬 | On |
| `off` | 끔 | Off |
| `result_turns` | {n}번째 턴 | Turn {n} |

새 키(리뷰에서 빠진 글):

| 키 | ko | en | 쓰는 곳 |
|---|---|---|---|
| `recut_slot_title` | 새김 슬롯 | Recut Slot | 친선 전 영장첩 화면 |
| `recut_slot_desc` | 친선에서 새김을 살릴 영장 한 종을 고르세요. | Pick one writ to keep its Recut in Sparring. | 같은 화면 |
| `recut_slot_empty` | 고른 영장 없음 | No writ chosen | 같은 화면 |
| `crate_second_copy` | 2장째 · 이제 영장첩에 2장 | 2nd copy · Now 2 for your Writbook | 상자 공개(2장째 사본, qa 11번) |
| `crate_resonance_gain` | 공명 +{n} | Resonance +{n} | 상자 공개(3장째부터) |
| `deck_arch_archive_kindle` | 잉걸 의식 컨트롤 | Kindle Rite Control | 표준 영장첩 이름 뒤(영어 모드에서 한국어가 나오던 곳) |
| `deck_arch_choir_brine` | 소금독 컨트롤 | Brine Control | 〃 |
| `deck_arch_nameless_wake` | 물안개 뒷물결 템포 | Seamist Wake Tempo | 〃 |
| `deck_arch_rider_rush` | 급류 어그로 | Rapids Aggro | 〃 |
| `deck_arch_warden_bulwark` | 방파제 미드레인지 | Breakwater Midrange | 〃 |
| `deck_arch_wreck_fit` | 부품 성장 콤보 | Fit Growth Combo | 〃 |
| `hero_warden_bio` | 마지막 저수지를 지키는 수문장. 벽을 세우고 버틴다. | Keeper of the last reservoir. Builds walls and holds. | 호명자 고르기 |
| `hero_choir_bio` | 바다를 다시 부르려는 선창자. 소금독으로 천천히 잠근다. | A cantor calling the sea back. Drowns foes slowly in Brine. | 〃 |
| `hero_wreck_bio` | 침몰선을 되살리는 해체공. 부품을 붙여 키운다. | A breaker reviving wrecks. Grows Answerers with Fits. | 〃 |
| `hero_rider_bio` | 사구를 달리는 씨족 선봉. 먼저 치고 빨리 끝낸다. | Vanguard of the dune clans. Strikes first, ends fast. | 〃 |
| `hero_archive_bio` | 모든 이름을 기록한 사서장. 빠른 적을 미리 읽고 지운다. | The archivist who recorded every name. Reads and erases fast foes. | 〃 |
| `hero_nameless_bio` | 이름을 잃은 칼. 숨어서 치고 카드를 벌어들인다. | A blade with no name. Strikes from hiding, earns cards. | 〃 |

대사: 4절 대사표에 `위기` 줄(내 명줄 ≤ 10, 한 판 1회) 6개 추가, 4-8에 맞대결 첫 대사 키 8개 추가.

### 8-10. 오류·확인

| 키 | ko | en |
|---|---|---|
| `error_load_failed` | 영장을 불러오지 못했습니다. | Couldn't load the writs. |
| `error_retry` | 다시 시도 | Retry |
| `error_save_failed` | 저장하지 못했습니다. 저장 공간을 확인하세요. | Couldn't save. Check your storage. |
| `error_unknown` | 알 수 없는 문제가 생겼습니다. | Something went wrong. |
| `error_ai_timeout` | 상대 호명자가 응답하지 않습니다. 결투를 다시 시작합니다. | The enemy Caller isn't responding. Restarting the duel. |
| `confirm_leave_duel` | 결투를 포기할까요? 패배로 기록됩니다. | Concede? It counts as a defeat. |
| `confirm_yes` | 예 | Yes |
| `confirm_no` | 아니요 | No |
| `loading` | 조수를 섞는 중… | Shuffling the tide… |

---

## 9. 스토어 문구 초안

**짧은 설명 (80자 이내)**
- ko: 바다가 사라진 땅, 이름을 새긴 영장 30장으로 겨루는 1:1 카드 결투. (36자)
- en: The sea is gone. Duel with 30 writs carved with true names. (60자)

**긴 설명 (ko)**
> 312년 전, 바다는 하룻밤에 사라졌다.
> 드러난 바닥 「노해」에서 사람들은 물과 인양물과 신앙을 두고 싸운다. 다만 군대로는 싸우지 않는다. 한꺼번에 너무 많은 이름을 부르면 땅 밑의 검은 바닷물이 솟기 때문이다. 그래서 모든 분쟁은 소금 맹약에 따라, 참이름을 새긴 영장 30장을 든 두 호명자의 결투로 정한다.
>
> ■ 여섯 호명자, 여섯 가지 싸움 방식 — 수조를 지키는 수문장, 바다를 다시 부르려는 수녀, 침몰선을 되살리는 해체공, 사구를 달리는 기수, 모든 이름을 기록하는 사서장, 이름을 잃은 칼.
> ■ 영장 200장 — 뽑기·강화·약화·즉시 타격·처치 드로우까지 여러 갈래로 뻗는 덱 빌딩.
> ■ 심지를 켜는 턴 운영 — 매 턴 하나씩 늘어나는 심지로 응답자와 의식을 부르고, 영장첩의 흐름을 읽어라.
> ■ 같은 이름이 모이면 공명한다 — 겹친 영장은 공명이 되어 이름을 더 깊이 새긴다. 순위전에서는 새김 깊이를 맞춰 실력으로만 겨룬다.
> ■ 인양 상자 확률 공개, 실결제 없음 — 모든 상자와 영장은 결투와 의뢰로 얻는 게임 안 재화로만 얻는다.

**긴 설명 (en)**
> Three hundred and twelve years ago, the sea vanished in a single night.
> On the exposed seabed, the Bare, people fight over water, salvage, and faith. But never with armies: call too many names at once, and the black water beneath the salt rises to swallow everyone. So by the Brine Accord, every dispute is settled by two Callers, each holding a Writbook of 30 writs carved with true names.
>
> ■ Six Callers, six ways to fight: a cistern gatekeeper, a drowned-choir cantor, a wreck breaker, a dune rider, a head archivist, and a blade with no name.
> ■ 200 writs branching into draw, buffs, curses, instant strikes, and kill-to-draw tactics.
> ■ Light one more Wick each turn, call Answerers and Rites, and read the flow of your Writbook.
> ■ Duplicate writs resonate and carve names deeper. Ranked duels equalize carving depth so skill decides.
> ■ Crate odds shown. No real-money purchases: everything is earned through duels and commissions.

---

## 10. 다른 역할에 넘기는 메모

- **balance-designer**: 카드마다 `concept_ko`는 의도이고, 응답자/의식/인장 구분·비용·수치는 당신이 정합니다. `cost_band`는 low(1~3)·mid(4~6)·high(7~10) 감각입니다. 소금독 규칙(턴 시작 N 피해 후 1 감소)은 제안입니다. 8장 미만 키워드 5개(들이켬·인양 6, 급류·익사·봉인문 7)는 6-1절 의견대로 합치지 않고 유지합니다. 1-2에서 근사 11장·의식→응답자 5장 문구를 cards.json에 맞췄습니다(1-2 리뷰 `reviews/1-2/lore-writer.md`).
- **art-director**: 영웅·세력 색과 실루엣은 4절, 카드마다 `visual_hint`(세력 색 + 모티프). 마나는 세로 막대(심지), 후공 보상은 초 토막, 카드 프레임은 소금유리 판(모서리가 깨진 직사각) 방향을 권합니다(레퍼런스 프레임 모양 금지). 희귀도 색: 모래 베이지·진주 흰 무지개·산호 주홍·심해 검푸름.
- **game-developer**: 화면 문구는 8절 키만 씁니다. 카드 이름·글은 `lore/cards-lore.json`의 `name_*`·`flavor_*`·`concept_ko`·**`concept_en`(round-1부터 200장)**을 씁니다. 영어 모드의 "키워드 이름 + 풍미글" 대체는 지우고 `concept_en`을 보여 주세요. 대사표 `위기` 줄(내 명줄 ≤ 10)과 4-8 맞대결 대사 키, 8-11 키는 round-1에서 추가.

---

## 11. 원본 보호 점검표

| 점검 | 결과 |
|---|---|
| 게임 이름이 레퍼런스·상용 TCG와 겹치지 않음 | 통과(1-1절 검색) |
| 영웅 이름·세력·종족 설정이 Warcraft·Hearthstone과 겹치지 않음 | 통과: 인간 세력·망자·기계·갯것만 사용. 엘프·오크·드워프·드래곤·악마·언데드 군단 같은 설정 없음. 영웅 9인·직업 이름 구조 아님(6인, 세력 이름) |
| 호명술이 레퍼런스 영웅 능력과 같은 "직업 + 능력" 짝이 아님 | 통과: 방파제 부여·소금독·부품 인양·박차 부여·의식 비용 감소·표식 드로우는 레퍼런스 기본 영웅 능력(작은 피해·방어도·회복·무기·소환·드로우+자해 등)과 다름 |
| 키워드 이름(영문·공식 한국어 번역) 재사용 없음 | 통과(6절 피한 단어) |
| 다른 TCG 고유 키워드 재사용 없음 | 통과(Last Breath·Fanfare·Evolve·Barrier·Echo·Invoke·Manifest 등 피함, Tidecaller 피함) |
| 유명 카드의 이름 + 효과 조합 재현 없음 | 통과: "들어올 때 효과 두 번"·"죽을 때 효과 두 번" 같은 레퍼런스 대표 전설 효과는 쓰지 않음(B120을 다른 효과로 바꿈) |
| 기본 용어(하수인·방어도·마나 수정·동전) 미사용 | 통과(2-7절 대응표) |
