# UX 흥미 · lore-writer 목록 (2026-11-19)

요청자 지시: "스토리는 이미지가 중요합니다. 이야기를 노출하되 월드맵을 탐험하며 나아가는 느낌을 주세요." 정본 데이터: `lore/worldmap.json` (지역 8, 노드 30). 문구 키: 10-lore 7-6·8-14.

## 1. 월드맵 지역 (art 지도 그림용, 좌표 0~100 제안)

| 지역 id | 이름 (ko / en) | 세력 | x, y | 그림 힌트 |
|---|---|---|---|---|
| `bare` | 노해 맹약 시장 / Accord Market of the Bare | neutral | 50, 52 | 지도 한가운데. 마른 바다 바닥의 흰 소금 평원 위에 천막과 경매대가 둥글게 모인 장터. 고래뼈 아치가 입구. 사방으로 마른 강바닥 길이 뻗음 |
| `warden` | 염관 고원 · 제7수조 / Saltcrown Heights · Seventh Cistern | h_warden | 50, 12 | 북쪽 끝. 옛 해안 절벽 위 고원, 사각 성벽에 둘러싸인 둥근 저수지. 청회색 돌, 수문 하나, 성벽 위 깃발 |
| `rider` | 붉은 사구 / Red Dunes | h_rider | 84, 28 | 북동쪽. 붉은 모래 언덕이 물결처럼 겹침, 그 사이를 지나는 마른 강바닥 한 줄, 모래게 발자국, 모닥불 연기 |
| `wreck` | 녹슨 갈비뼈 / The Rustribs | h_wreck | 80, 74 | 남동쪽. 거대한 난파선 선체가 갈비뼈처럼 줄지어 쓰러진 계곡, 주황 녹, 작업장 굴뚝의 연기, 해일 기관의 커다란 톱니 셋 |
| `choir` | 잠긴 성가대 / The Drowned Loft | h_choir | 50, 90 | 남쪽 가장 깊은 해구 바닥. 반쯤 무너진 대성당과 기운 종탑, 바닥에 유일하게 남은 청록 물웅덩이 |
| `archive` | 등불 서고 / The Lamplit Archive | h_archive | 14, 62 | 서쪽 옛 해안선. 등대 일곱 개가 다리로 이어진 도서관 도시, 창마다 호박색 불빛 |
| `nameless` | 안개 띠 / The Fogbelt | h_nameless | 16, 24 | 북서쪽 해안선 자리. 늘 회색 해무가 덮인 띠, 지도에 없는 작은 지붕들, 안개 사이로 보이는 빈 문패 하나 |
| `rift` | 흑조의 균열 / The Blacktide Rift | neutral | 58, 62 | 시장 남쪽 바로 아래 갈라진 소금 바닥. 균열 안에서 검은 물이 스며 나와 반짝임. 처음엔 안개로 가려 있다가 마지막에 드러남 |

## 2. 이야기 노드 30개

여는 조건 값은 제안이며 balance가 확정합니다. 시작은 `wm_bare_1`이고, 그걸 읽으면 6개 세력 지역의 첫 노드가 모두 열립니다(어느 방향으로든 탐험). 각 지역은 4노드로 이뤄지며, 6개 세력의 마지막 노드를 모두 읽으면 흑조의 균열이 드러납니다.

| 노드 | 지역 | 제목 (ko / en) | 여는 조건 | 연결 카드 스토리 | x, y | 그림 힌트 |
|---|---|---|---|---|---|---|
| `wm_bare_1` | bare | 마른 바다의 아침 / Morning on the Dry Sea | 처음부터 | D016·B091·B093 | 50, 50 | 시장 입구 고래뼈 아치 |
| `wm_bare_2` | bare | 소금 맹약 / The Brine Accord | 결투 1승 | D017·D018·A052 | 46, 56 | 경매대와 석판 |
| `wm_bare_3` | bare | 갯것들의 길 / Road of the Shorelings | neutral 카드 15종 보유 | B096·B097·A051 | 56, 46 | 갯벌 거북이 지나는 소금길 |
| `wm_bare_4` | bare | 멈춘 조수 시계 / The Stopped Tide Clock | 결투 5승 | B116·A054·B118 | 52, 58 | 광장 한가운데 멈춘 시계탑 |
| `wm_warden_1` | warden | 제7수조의 점호 / Roll Call at the Seventh | 앞 노드 wm_bare_1 읽음 | D001·D002·B001 | 50, 18 | 성벽 정문과 수문 |
| `wm_warden_2` | warden | 소금을 두른 벽 / A Wall Wrapped in Salt | h_warden로 1승 | B004·B013·B012 | 44, 14 | 방패를 세운 성벽 위 |
| `wm_warden_3` | warden | 약탈자의 먼지 / Dust of the Raiders | h_warden 카드 12종 보유 | A021·A019·A022 | 58, 16 | 동쪽 성벽에 닿은 붉은 먼지 |
| `wm_warden_4` | warden | 마지막 수조의 서약 / Oath of the Last Reservoir | h_warden로 3승 | B003·A001·B018 | 50, 8 | 열린 수문에서 쏟아지는 물 |
| `wm_rider_1` | rider | 모래게 위의 아이들 / Children on Sand Crabs | 앞 노드 wm_bare_1 읽음 | B052·D009·B054 | 78, 32 | 사구 사이 야영지와 깃발 |
| `wm_rider_2` | rider | 마른 강을 따라 / Along the Dry River | h_rider로 1승 | B063·B053·B059 | 86, 22 | 구불구불한 마른 강바닥 |
| `wm_rider_3` | rider | 모래 위 잔치 / Feast on the Sand | h_rider 카드 12종 보유 | A030·A031·A033 | 90, 34 | 모닥불과 전리품 자루 |
| `wm_rider_4` | rider | 붉은 깃발이 오른 날 / The Day the Red Pennant Rose | h_rider로 3승 | B060·A010·B064 | 80, 24 | 언덕 꼭대기의 붉은 깃발 |
| `wm_wreck_1` | wreck | 움직이지 않는 것은 부품 / If It Doesn't Move, It's Parts | 앞 노드 wm_bare_1 읽음 | D007·D005·B040 | 76, 70 | 갈비뼈 같은 선체 사이 입구 |
| `wm_wreck_2` | wreck | 작업장의 불 / Fire of the Workshop | h_wreck로 1승 | B037·B039·B044 | 84, 78 | 굴뚝 연기와 붉은 화로 |
| `wm_wreck_3` | wreck | 싸우면서 장 보기 / Shopping Mid-Fight | h_wreck 카드 12종 보유 | A026·A027·A028 | 74, 80 | 고철 더미와 수확기 |
| `wm_wreck_4` | wreck | 해일 기관 / The Surge Engine | h_wreck로 3승 | D008·B042·B051 | 86, 70 | 맞물린 큰 톱니 셋 |
| `wm_choir_1` | choir | 물에 털어놓는 고해 / Confession to the Water | 앞 노드 wm_bare_1 읽음 | D003·B021·B019 | 46, 84 | 대성당 입구 계단 |
| `wm_choir_2` | choir | 짠 숨의 노래 / Songs on a Salt Breath | h_choir로 1승 | B028·B020·B034 | 54, 86 | 사슬이 늘어진 회랑 |
| `wm_choir_3` | choir | 이사 가는 사람들 / Those Who Move House | h_choir 카드 12종 보유 | B027·B023·A023 | 44, 92 | 물웅덩이 옆 뼈 제단 |
| `wm_choir_4` | choir | 종이 다시 울린 밤 / The Night the Bell Rang Again | h_choir로 3승 | B029·B026·B036 | 50, 96 | 기운 종탑의 종 |
| `wm_archive_1` | archive | 열람 허가 / Reading Permit | 앞 노드 wm_bare_1 읽음 | D010·D011·B071 | 18, 58 | 첫 번째 등대 정문 |
| `wm_archive_2` | archive | 봉인과 먹물 올가미 / Seals and Ink Snares | h_archive로 1승 | B065·B067·B068 | 10, 66 | 봉인이 걸린 책장 통로 |
| `wm_archive_3` | archive | 번개 증명 / Proof by Lightning | h_archive 카드 12종 보유 | A035·A037·A039 | 20, 70 | 등대 사이 다리 위 결투장 |
| `wm_archive_4` | archive | 봉쇄령과 대주해서 / Lockdown and the Grand Commentary | h_archive로 3승 | B074·A013·B078 | 12, 56 | 불빛이 모두 켜진 일곱 등대 |
| `wm_nameless_1` | nameless | 이름을 버린 날 / The Day the Name Was Dropped | 앞 노드 wm_bare_1 읽음 | B079·B084·D014 | 20, 28 | 안개 속 지붕들 |
| `wm_nameless_2` | nameless | 가면 공방 / The Mask Workshop | h_nameless로 1승 | B080·B085·B089 | 12, 20 | 가면이 걸린 공방 창문 |
| `wm_nameless_3` | nameless | 소매 속 바늘 / The Needle in the Sleeve | h_nameless 카드 12종 보유 | A042·A043·A044 | 22, 18 | 골목에 붙은 실종 공고 |
| `wm_nameless_4` | nameless | 빈 문패의 주인 / Whose Nameplate Is Empty | h_nameless로 3승 | A041·B090·A048 | 14, 30 | 빈 문패가 걸린 문 |
| `wm_rift_1` | rift | 젖은 소금 / Wet Salt | 세력 6지역 완료 | B115·A059·B120 | 56, 64 | 갈라진 소금 바닥과 검은 물기 |
| `wm_rift_2` | rift | 흑조의 전령 / Herald of the Blacktide | AI 실력 3단계 이상 1승 | A060·B119·A057 | 60, 68 | 균열 위에 선 검은 물의 형상 |

## 3. 문구 키 (10-lore 8-14, ko/en)
| 묶음 | 키 | 비고 |
|---|---|---|
| 월드맵 | `worldmap_title`·`worldmap_progress`·`worldmap_continue`·`worldmap_region_locked`·`worldmap_node_new/read/open`·`worldmap_related_cards`·`worldmap_reward`·`worldmap_cond_*` 6개·`worldmap_rift_reveal` | 노드 본문·제목은 `lore/worldmap.json` |
| 덱 그림 튜토리얼 | `guide_deck_1`~`guide_deck_5` | 덱 화면에 처음 들어갈 때 한 단계씩, 그림 힌트는 "쓰는 곳" 칸(30칸 띠·카드 2장 겹침·유형 표지 5개·심지 곡선·필터/나머지 채우기) |
| 퀘스트 위젯 | `quest_widget_title/progress/done/all_done/refresh` | 로비에 항상 보임 |
| 시즌 보상 트랙 | `season_name_1`(시즌 1 · 젖은 소금), `season_widget_*` 4개, 구간 `season_band_1~5`(모래톱 → 조개 둔덕 → 진주 여울 → 산호 벼랑 → 심해) | 마른 바다 바닥에서 깊은 곳으로 내려가는 길로 그리기 제안 |
| 상대 실력 | `ai_tier_1~4_name/sub`(모래 위 견습 · 쉬움 / 시장 결투꾼 · 보통 / 소금 노장 · 어려움 / 흑조의 그림자 · 매우 어려움), `ai_tier_locked` | 쉬움부터 고름. 단계 수는 balance가 정하고, 3단계면 4번 키는 쓰지 않음 |
| 팩 열기 | `crate_open_next`·`crate_open_all`·`crate_open_all_confirm`·`crate_skip_anim`·`crate_summary_title/new/dup/best` | 연속 열기와 모두 열기 |
| 수집 이야기 | `collection_story_open`·`collection_story_close` | 평소엔 카드 한 장(효과 포함), 이야기 보기에서만 카드가 왼쪽으로 |

## 4. 전달
- **art**
  - 1절 지역 좌표·그림 힌트와 2절 노드 좌표로 노해 지도를 그려 주세요(자체 SVG).
  - 흑조의 균열은 처음엔 안개로 덮고, `worldmap_rift_reveal` 때 드러나게 합니다.
  - 노드 상태는 세 가지입니다: 잠김(안개), 새 이야기(빛나는 점), 읽음.
  - 지역 사이 길은 마른 강바닥 선으로 그립니다.
  - 시즌 트랙 5구간 그림, 덱 튜토리얼 그림 5장(쓰는 곳 칸)도 필요합니다.
- **dev**
  - `lore/worldmap.json`을 sync해 주세요. `unlock.type` 7종 설명은 파일 안 `unlock_types`에 있습니다.
  - 노드 패널: 제목 → 본문 → 관련 카드 이야기 3장(`card_story` 패널 재사용).
  - 잠긴 노드는 `worldmap_cond_*` 문구로 조건을 보여 주세요.
  - 메뉴 "스토리"(`menu_chronicle`)를 누르면 지도로 갑니다.
- **balance**: 여는 조건 값(1승·12종·3승·AI 3단계)과 노드 보상 유무를 확정해 주세요. 상대 실력 단계 수에 맞춰 `ai_tier_*`를 씁니다.
- **qa**: `josa-check.mjs` 대상에 `lore/worldmap.json`도 넣어 주세요(지금은 10-lore·cards-lore만 봄). lore 검사기는 worldmap 필드·길이·금지어·카드 연결을 검사합니다.

## 5. 검사
- `node projects/tcg-01/lore/check-cards.mjs` → 통과: 월드맵 지역 8, 노드 30, 10-lore 키 401행, 튜토리얼·안내 33단계(덱 그림 5 포함).
- `josa-check.mjs`(10-lore·cards-lore) → 0.
- balance 검사 통과.
