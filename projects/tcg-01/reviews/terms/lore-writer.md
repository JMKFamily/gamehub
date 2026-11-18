# 용어 쉽게 + 튜토리얼식 안내 · lore-writer (2026-11-18)

요청자 지시: "응답자나 영장 등의 이름이 익숙하지 않아서 이해가 안 된다" → "용어 쉽게 바꾸세요". 추가 지시: "그 쉽게 바꾼 용어도 튜토리얼식으로 알려주도록 개선하세요."
정본은 `10-lore.md` 2-7(대응표), 2-8(경계), 6(키워드), 8-7(튜토리얼), 8-12(메뉴 안내), 8-13(용어 사전)입니다. 이 문서는 요약, 셀프 리뷰, 전달 목록입니다.

## 1. 이전 → 이후 용어표

### 1-1. 기본 용어
| 기능 | 이전 (ko / en) | 이후 (ko / en) |
|---|---|---|
| 영웅 | 호명자 / Caller | **영웅 / Hero** |
| 영웅 기술 | 호명술 / Calling | **고유 능력 / Ability** |
| 영웅 체력 | 명줄 / Lifeline | **체력 / Health** |
| 추가 보호 | 껍질 / Shell | **방어 / Defense** |
| 자원 | 심지 / Wick | **마나 / Mana** |
| 하수인 역할 카드 | 응답자 / Answerer | **소환수 / Creature** |
| 한 번 쓰는 카드 | 의식 / Rite | **주문 / Spell** |
| 무기 | 인장 / Brand | **무기 / Weapon** (내구도 / Durability) |
| 카드·덱 | 영장·영장첩 / Writ·Writbook | **카드·덱 / Card·Deck** |
| 필드 | 조수원 / Tide Circle | **필드 / Board** |
| 무덤 | 가라앉은 자리 / The Sunk | **무덤 / Graveyard** |
| 덱이 빈 뒤 피해 | 공허 호명 / Hollow Call | **덱 고갈 / Deck-out** |
| 후공 보상 | 여분 심지 / Spare Wick | **보너스 마나 / Bonus Mana** |
| 시작 손패 교체 | 첫 물때 고르기 / First Tide | **손패 바꾸기 / Mulligan** |
| 턴 넘기기 | 숨 고르기 / End Breath | **턴 종료 / End Turn** |
| 태그 | 혈통 / Lineage | **부류 / Kin** |
| 손패 강화·부품 | 덧새김 / Etch · 부품 / Fit | **손패 강화 / Prime · 부품 / Part** |
| 희귀도 | 모래·진주·산호·심해 | **일반·고급·희귀·전설 / Common·Uncommon·Rare·Legendary** (테두리 색은 그대로) |
| 팩 | 인양 상자 / Crate | **카드 팩 / Card Pack** (기본 팩, 세력 팩 6종: 파수단·합창회·조합·씨족·서고·무명단 팩) |
| 재화 | 소금화 · 각인 먹 · 심해 진주 | **골드 · 제작 조각 · 진주 / Gold · Craft Shards · Pearls** |
| 천장 | 등대 보장 | **확정 보장 / Guarantee** |
| 중복 성장 | 공명 · 새김 돌파(갓·깊은·소금·심해 새김) | **카드 경험치 · 돌파(기본 → 돌파 1·2·3) / Card EXP · Breakthrough** |
| 지정 제작 | 새기기 / Inscribe | **제작 / Craft** |
| 보상·퀘스트 | 조수 달력 · 물때 눈금 · 오늘의 의뢰 · 주간 맹약 | **보상 트랙 · 트랙 경험치 · 일일 퀘스트 · 주간 퀘스트** |
| 상점·메인 | 부두 시장 · 부두 | **상점 / Shop · 메인 / Home** |
| 모드 | 맹약 결투 · 조수원 친선 · 모래 위 연습 · 썰물 연대기 | **랭크전 · 일반전 · AI 연습 · 스토리**(제목 「썰물 연대기」 유지) |
| 랭크 등급 | 모래띠 … 심해띠 | **모래·조개·진주·산호·심해 등급 / Sand·Conch·Pearl·Coral·Abyss Tier** |

### 1-2. 키워드 18개
| 엔진 id (dev·balance) | 이전 | 이후 (ko / en) |
|---|---|---|
| trigger `play` | 첫 숨 / First Breath | **등장 / On Play** |
| trigger `death` | 썰물 / Ebb | **사망 시 / On Death** |
| `guard` | 방파제 / Breakwater | **방벽 / Wall** |
| `shield` | 소금막 / Saltskin | **튕겨내기 / Deflect** |
| `stealth` | 물안개 / Seamist | **위장 / Camouflage** |
| `rush` | 박차 / Spur | **기습 / Skirmish** |
| `charge` | 급류 / Rapids | **즉시 공격 / Instant Attack** |
| `deadly` | 익사 / Drown | **즉사 / Deadly** |
| `lifesteal` | 들이켬 / Draught | **흡혈 / Drain** |
| do `silence` | 이름 지우기 / Unname | **효과 지우기 / Erase** |
| do `freeze` | 닻 / Anchor | **속박 / Bind** |
| spell power | 잉걸 / Kindle | **주문 위력 +N / Empower +N** |
| `secret` | 봉인문 / Sealwrit | **덫 / Snare** |
| do `overload` | 그을음 / Soot | **마나 빚 N / Mana Debt N** |
| cond `combo` | 뒷물결 / Wake | **후속 / Follow-up** |
| do `discover` | 인양 / Salvage | **골라잡기 / Pick** |
| trigger `turn_start` | 차오름 / Swell | **성장 / Grow** |
| do `curse` | 소금독 / Brine | **중독 N / Toxin N** |

엔진 id는 그대로라 엔진·밸런스 수치는 바뀌지 않습니다(엔진 해시 유지).

## 2. 경계 판단 (요약, 정본 10-lore 2-8)
- **허용(장르 공통어)**: 사전에 있는 한 낱말이고 여러 게임이 같은 뜻으로 쓰는 말. 카드·덱·손패·턴·마나·주문·체력·공격력·영웅·무기·내구도·필드·무덤·방어, en Mana·Spell·Hero·Health·Deck·Board·Graveyard·Mulligan.
- **금지(레퍼런스 공식어)**: 하수인·영웅 능력·방어도·마나 수정·동전·탈진·종족·전장(모드 이름)과 키워드 번역어 전부, en Minion·Hero Power·Armor·Mana Crystal·The Coin·Fatigue·Tribe·Battlecry·Deathrattle·Taunt·Charge·Rush·Stealth 등.
- **금지(다른 상용 TCG 공식어)**: 유닛·팔로워·보호막·수호·잠복·유언·회피·선제공격·신속·죽음의 손길·생명연결, en Unit·Follower·Barrier·Ward·Ambush·Elusive·Haste·Deathtouch·Lifelink·Trap.
- 마스터 제안과 다르게 정한 것 두 가지:
  - "전장" 대신 **필드**: 레퍼런스 한국어판 모드 이름이라 피함.
  - 소환수 영문은 "Unit" 대신 **Creature**: Unit은 다른 TCG 공식어라 피함.
- "유닛·히어로 스킬" 같은 통칭은 용어 사전의 "흔히 부르는 말" 칸에 **설명용으로만** 씁니다. 검사기는 이 칸에서 레퍼런스 공식어만 막습니다.

## 3. 튜토리얼식 안내 (요약)
- **8-7 첫 AI 연습 판 튜토리얼 18단계**: 영웅 고르기 → 덱 → 손패 바꾸기 → 마나 → (낼 카드 없음) → 소환수 → 주문 → 무기 → 필드 → 공격 → 고유 능력 → 방어 → 턴 종료 → 방벽 → 키워드 → 체력 → 덱 고갈 → 끝.
  - 단계마다 키·등장 조건·가리킬 화면 요소를 적었습니다.
  - 한 번에 하나만 보이고, 놓친 단계는 다시 보입니다.
  - tut_end는 카드 내기 안내(또는 낼 카드 없음 안내) 뒤에만, tut_done은 결과 화면 뒤에 보입니다.
- **8-12 첫 진입 메뉴 안내**: 카드 팩·제작·카드 경험치/돌파·랭크전 각 2단계, 한 번만.
- **8-13 용어 사전**: 기본 용어 27개 + 키워드 18개. 항목마다 한 줄 설명(ko/en), 아이콘 후보, 다른 게임에서 흔히 부르는 말.
- **글 한도**(검사기 실패 처리): 튜토리얼·안내는 한 단계 60자, 한 문장 35자, 영어 110자. 용어 사전 설명은 40자, 영어 80자.

## 4. 검사
`node projects/tcg-01/lore/check-cards.mjs` → **통과**
- 10-lore 키 표 321행, 튜토리얼·안내 29단계, 용어 사전 45행
- 카드 200장의 글(ko/en)과 화면 키 표에 옛 기능 용어 0, 금지어 0
- 키워드 평균 11.9장, concept 56자 초과 0

`node projects/tcg-01/tools/sim/check-cards.mjs`(balance 검증기, 읽기 실행만) → 통과

검사기에 추가한 것:
- 옛 용어 목록(ko 40, en 46). 이야기용 키(제목·영웅 이름·칭호·대사·승패 부제)와 카드 이름·풍미글은 검사에서 뺍니다.
- 금지어 목록 갱신: 마나·영웅은 허용, 마나 수정·탈진·종족·전장과 다른 TCG 공식어는 추가.
- 10-lore 키 표·튜토리얼·안내·용어 사전 검사.

## 5. 셀프 리뷰
| # | 심각도 | 내용 | 처리 |
|---|---|---|---|
| 1 | 확인 | 처음 보는 사람이 설명 없이 알아듣는가 | 기본 용어는 모두 일반 카드게임 말입니다. 키워드는 이름이 곧 효과(즉시 공격·즉사·흡혈·마나 빚·효과 지우기)이거나 한 낱말 비유(방벽·위장·덫·성장·중독)입니다. 짐작이 덜 되는 것은 **기습/Skirmish**(소환수만 즉시 공격)와 **튕겨내기**. 튜토리얼 키워드 단계와 용어 사전으로 보완 |
| 2 | 확인 | 세계관 손실 | 제목·영웅 이름·칭호·대사·카드 이름·풍미글·스토리는 그대로입니다. 영웅 대사의 "명줄·심지"처럼 상태를 말하는 낱말만 체력·마나로 바꿨습니다. 대사표 "심지 부족" 줄 이름은 "마나 부족"이 됐습니다 |
| 3 | minor | 고유 능력 이름 "작은 인양"을 "고철 뒤지기 / Scrap Haul"로 바꿈(옛 키워드 "인양"과 겹쳐서) | 반영함 |
| 4 | minor | 카드 이름 9장에 옛 기능 용어가 있었음: D020 Wick, B011 껍질, B019·B028·A002 Brine, B065·B066·B114 봉인문/Sealwrit, B097 Seamist | 개명함(불꽃 다듬기, 소금 다지기, First Salt Chant, Salt Lash, Saltwater Deluge, 경고·반박·떠돌이 봉인, Sea Fog Gull) |
| 5 | minor | 카드 글 숫자 단위 "소환수 3명"에서 "명"이 짐승·기계에는 어색함 | 이번 범위(용어)에서는 그대로 둠. round-3 후보 |
| 6 | 확인 | 팩 개봉 화면 글이 "소금을 눌러 부수세요"에서 "카드를 눌러 뒤집으세요"로 바뀜 | 소금 덩이 연출을 유지하면 art가 글과 그림을 맞출 것 |

## 6. 전달 목록

### game-developer
1. sync를 다시 돌려 `strings.json`과 `cards.json`(text_ko/en·이름 9장)을 갱신하세요. **키 이름은 바뀌지 않았고** 값만 바뀐 키가 177개입니다.
2. 튜토리얼 키를 교체하세요.
   - 지울 키: tut_1_welcome … tut_10_keyword, tut_3_no_play
   - 새 키: tut_hero·tut_deck·tut_mulligan·tut_mana·tut_no_play·tut_play_creature·tut_play_spell·tut_play_weapon·tut_board·tut_attack·tut_ability·tut_defense·tut_end·tut_wall·tut_keyword·tut_health·tut_deckout·tut_done·tut_next·tut_skip
   - 등장 조건과 순서 규칙은 8-7 표를 따릅니다. 영웅 고르기·덱·손패 바꾸기 단계는 대전 밖 화면에서 뜹니다.
3. 새 키를 반영하세요: `guide_*` 8개(8-12, 메뉴별 첫 진입 1회), `menu_glossary`·`glossary_common_names`, 용어 사전 `gloss_<id>`·`gloss_<id>_desc` 45개(8-13 표의 id·용어·설명 칸).
4. 키워드 표시 이름(`kwname_*`)은 10-lore 6절 표의 "키워드 (ko / en)" 칸에서 읽으세요. 6절 표에 열(이전 이름·엔진 id)이 늘었으니 sync 파서를 확인해 주세요. 도움말 `kw_*` 키 이름은 그대로입니다.
5. 대사표 줄 이름 "심지 부족"이 "마나 부족"으로 바뀌었습니다. 대사 파서가 줄 이름으로 찾는다면 맞춰 주세요.
6. 고유 능력 이름이 바뀌었습니다: `hero_wreck_power` 고철 뒤지기 / Scrap Haul.
7. `games.json` 설명(오케스트레이터)에는 10-lore 9절 짧은 설명을 쓰세요: ko "바다가 사라진 땅, 이름을 새긴 카드 30장으로 겨루는 1:1 카드 결투." / en "The sea is gone. Duel with 30 cards carved with true names."

### art-director
1. 30-art 화면 표기를 2-7 새 용어로 바꾸세요(심지 막대 → 마나 막대 등). **모양은 유지**합니다(세로 막대·초 토막, 보석·동전 금지).
2. 희귀도 이름을 일반·고급·희귀·전설로 바꾸세요. 테두리 색 규칙은 그대로입니다.
3. 아이콘 파일 이름: kw-*.svg·icon-*.svg의 옛 이름(kw-seamist 등)은 내부 이름이라 그대로 둬도 되고, 바꾸면 8-13 아이콘 후보 칸도 함께 고칩니다.
4. 새 아이콘이 필요합니다: 고유 능력(별), 필드(칸 5개), 부류, 돌파(위 화살표), 랭크 등급 띠.
5. 튜토리얼 가리킴 대상(8-7 "가리킬 화면 요소")의 위치와 패널 자리를 정해 주세요. 640x360에서 판을 가리지 않게 해야 합니다(qa round-2 이슈 3).
6. 팩 개봉: 글이 "카드를 눌러 뒤집으세요"로 바뀌었으니 소금 덩이 연출과 맞춰 주세요.

### qa-engineer
- 텍스트 파트로 확인할 것:
  - 4해상도 × 한/영 넘침
  - 튜토리얼 완주·건너뛰기·재실행 시 다시 안 뜸·순서 규칙
  - 화면에 옛 용어 0(check-cards와 같은 목록으로 빌드 strings grep)
