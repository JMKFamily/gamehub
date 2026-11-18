# 리뷰: lore-writer · 1-2 교차 리뷰

## 확인한 것
- balance: `20-balance.md`(3-1 호명술, 7절 상성, 9-1 매트릭스, 부록 C 근사 목록), `cards.json`(approx·kind_note 16장의 effects), `Docs/balance-designer/2026-11-17-1-1-balance-plan.md`
- art: `30-art.md`(3-1 카드 배치, 4절 보드, 6절 대사·글 자리), `art.json`(`card.text_box`·`name_band`·`text_keys`), `assets/samples/card-B051-*.svg`
- 오케스트레이터 1-1 감시(`Docs/orchestrator/2026-11-18-1-1-review-and-1-2-dispatch.md`)
- 내 문서: `10-lore.md`, `lore/cards-lore.json` 원본 보호 grep(공식 한국어 번역어·영문 키워드)

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 처리 |
|---|---|---|---|---|---|
| 1 | major | lore-writer | 갈래 이름 "급류 돌격"의 '돌격'이 원작 공식 한국어 키워드 번역어 | 10-lore 4-4 아키타입 줄, 5-2 갈래 표(`ai_rapids`) | **"급류 덮침"으로 개명**(id `ai_rapids` 유지, cards-lore·UI 키에는 이 낱말 없음). 다시 grep: 돌격·돌진·속공·도발·은신·질풍·침묵·빙결·발견·과부하·연계·비밀·독성·생명력 흡수·주문 공격력·천상의 보호막·전투의 함성·죽음의 메아리·환생·하수인·방어도·마나·영웅 능력 → 카드 데이터 0건(D003 플레이버 "비밀" → "고백"으로 바꿈). 10-lore 남은 히트는 "피한 단어" 목록·장르 대응표 설명 칸뿐 |
| 2 | minor | lore-writer | 영문 이름·플레이버에 원작·다른 TCG 키워드 영단어 | B044 "Workshop Forge"(Forge는 원작 키워드), B031 flavor "echo", B037 flavor "armor" | Workshop Furnace / "still ring below" / "is a hull"로 바꿈. 이후 재발 방지로 `check-cards.mjs`에 금지어 검사(한국어 23·영문 26) 추가 |
| 3 | minor | lore-writer | 카드라 호명술 수치 문구 | 20-balance 3-1(+1 → +2) | 10-lore 4-4·`hero_rider_power_desc` ko/en을 +2로 |
| 4 | minor | lore-writer | 근사 11장 concept가 엔진 동작과 다름 | 20-balance 부록 C, cards.json `approx` | D011·B027·B045·B051·B053·B056·B062·B075·B078·B089·B110·B120·A046 concept를 cards.json effects에 맞춤(B056·B062·B089·B110 뽑기 추가, B051 차오름 +1/+1, B120 첫 피해 감소 삭제, B045 부품 옮기기 삭제 등) |
| 5 | minor | lore-writer | 의식 → 첫 숨 응답자로 바뀐 5장의 이름이 물건·행위 이름 | cards.json `kind_note`: B022·B025·B068·B069·B077 | concept를 "첫 숨: …"으로, 이름·시각 힌트를 존재로 바꿈: 물 먹은 기도승 / Sodden Supplicant, 소리 없는 서원자 / Soundless Votary, 열람실 감독관 / Stacks Proctor, 밀랍 봉인사 / Wax Sealer, 촛농 두른 문지기 / Tallow-Clad Doorman. id 유지라 balance cards.json 영향 없음 |
| 6 | major | lore-writer (balance 협의) | 상성 의도 4건이 측정과 반대 | 20-balance 7절·9-1: 이브로는 렌·카드라를 이기고 오다·나할·펠에 짐, 나할 < 카드라 | **이야기를 측정에 맞춤**(10-lore 4-7 표 전면 교체). 이브로 = "빠른 덱을 기록으로 미리 아는 제거 컨트롤", 나할 > 이브로(제자가 스승을 넘어섬), 이브로 > 렌(렌은 아직 못 이긴 상대에게 도전하는 자 → 연대기 목표). 4-5 플레이 정체성 줄도 수정. balance에 방향 요청 없음 |
| 7 | major | balance-designer | 렌 > 펠 76.5 %(25~75 % 밖) | 20-balance 9-1 | balance 조정 몫. lore 의견: 익사가 원인이므로 익사 카드 장수는 늘리지 말 것(10-lore 6-1) |
| 8 | minor | lore-writer · art-director | 글 길이 기준 불일치: 10-lore는 "70자 이내", art 글 상자는 13 px·15자 × 최대 4줄 = 60자 | 30-art 3-1 글 상자 줄, art.json `card.text_box.chars_per_line 15, max_lines 4` | 10-lore 3절을 **60자 이하(56 권장)**로 바꾸고 검사기를 60자 초과 = 실패로. 현재 최장 56자, 56 초과 0. **art**: 30-art 3-1의 "(70자 이내)" 문구를 60자로 고쳐 주세요. 최종 카드 글은 balance 수치로 만들어지므로 빌드 후 실제 글 기준 재확인 필요(qa) |
| 9 | minor | lore-writer · art-director | 이름 띠(17 px, 비용 판 뺀 약 200 px) 잘림 위험: 영문 21자 초과 10장, 한국어 10자 초과 2장 | art.json `card.name_band` | 영문 21자·한국어 10자 이하로 줄임(예: Pell's Surge Engine, Last Reservoir Oath, The Sunken Crown, Blacktide Herald). 검사기에 길이 검사 추가. **art**: `assets/samples/card-B051-*.svg`·`portrait-B051.svg`의 이름을 새 이름(펠의 해일 기관 / Pell's Surge Engine)으로 다시 생성해 주세요 |
| 10 | minor | lore-writer | 토스트 12자 초과 5개 | 10-lore 8-5 `toast_hand_full`·`toast_cant_attack_yet`·`toast_seamist_untargetable`·`toast_hollow_call`·`toast_soot`(13~15자) | 모두 12자 이내로 줄임(공백 포함). 영어는 전부 6단어 이내 |
| 11 | 확인 | art-director | art `text_keys` 8개가 10-lore 키 표에 있는지 | art.json `text_keys` | `hud_end_breath`·`hud_calling`·`hud_deck_left`·`hud_sealwrit_hidden`·`turn_yours`·`turn_enemy`·`turn_timer_low`·`crate_tap_salt` 모두 있음. 용어(심지·명줄·껍질·숨 고르기·여분 심지 초 토막·가라앉은 자리)도 2-7 대응표와 일치 |
| 12 | 의견 | balance-designer | 키워드 5개 8장 미만(들이켬·인양 6, 급류·익사·봉인문 7) | check-cards 키워드 등장, cards.json 키워드 장수 같음 | **합치지 않고 18개 유지**(10-lore 6-1). 각각 한 호명자의 정체성 키워드이고 평균 11.9장으로 기준 충족, balance 판단과 같음. 보강이 필요할 때 후보만 적음: 들이켬 → B094, 급류 → B054(이미 다룸). 익사는 늘리지 않음 |

## 잘 된 점
- balance가 lore id만 참조하고 이름을 복사하지 않아, 이름을 바꿔도 cards.json을 고칠 필요가 없었다. 이 구조를 유지.
- art가 키워드·용어를 10-lore 대응표 그대로 썼고 레퍼런스 UI 모양(보석 마나·둥근 초상)을 피했다.

## 점수
- 영역: 세계관·텍스트
- 체크 항목 통과: 빌드 전 단계라 criteria 세계관 절 중 문서로 확인 가능한 것만 봄(키 표 일치·잘림 위험·원본 보호)
- 점수: 해당 없음(1-2 교차 리뷰)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목: (tcg-01) 카드 이름은 이름 띠 폭 안(한국어 10자·영문 21자), 카드 글은 글 상자 줄 수 안(현재 60자)이고, 카드 이름·글·플레이버에 원작·상용 TCG 키워드 단어(영문·공식 한국어 번역어)가 0건(`lore/check-cards.mjs`가 검사)

VERDICT: REVISE (lore 쪽 수정 완료, balance 이슈 7과 art 이슈 8·9의 문구·샘플 갱신 남음)

## 수정 뒤 검사
`node projects/tcg-01/lore/check-cards.mjs` → 결과: 통과 (200장, 20/120/18/42, 영웅별 배분 일치, 키워드 평균 11.9, 56자 초과 0, 길이·금지어 실패 0)
