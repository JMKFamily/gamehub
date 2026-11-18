# 리뷰: lore-writer · round 1

## 확인한 것
- 빌드 `games/tcg-01/`(c401626): `data/strings.json`·`data/strings-extra.json`(임시 키 28개 + 메모), `data/cards.json`(text_ko·name·flavor), `data/text-check.json`(숫자 불일치 5장), `js/i18n.js`(언어 전환·카드 글), `projects/tcg-01/DEV_NOTES.md` D3·D4·D8
- QA `reviews/round-1/qa.md`, 스크린샷 `shots/` 360x640 한국어 16장 중 7장, 영어 11장 중 4장(battle·heroes·collection·market) 직접 확인
- 10-lore 키 표 270행과 `strings.json` 자동 대조: 값이 다른 키 1개(`mode_sparring_desc`, balance 친선 슬롯 1 결정 전 문구), 빌드에 없는 키 = 임시·신규 키뿐
- 원본 보호: 빌드 글 전체(strings + 카드 이름·글·플레이버)에서 원작 한국어 번역어 22개·영문 키워드 21개 grep → 0건

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안·처리 |
|---|---|---|---|---|---|
| 1 | major | game-developer (lore 완료) | 영어 모드 카드에 규칙 글이 없음. 키워드 이름 + 풍미글만 나와서 영어 사용자는 카드가 무엇을 하는지 모름 | `js/i18n.js` cardText(en), DEV_NOTES D3, `shots/en-collection-360x640.png` | **lore**: `lore/cards-lore.json`에 `concept_en` 200장 추가(전부 120자 이하, 키워드 영문 이름 사용, 금지어 검사 통과). **dev**: sync에서 `concept_en`을 `text_en`으로 넣고 cardText(en)는 그것을 보여 줌 |
| 2 | major | lore-writer (완료) · game-developer | 카드 글 숫자와 엔진 수치가 다른 카드 5장 | `data/text-check.json`: B003(3) B094(99) A011(5) A029(2) A034(2) | lore 수정: B003 껍질 +3, A011 피해 5·그을음 1, A029 "피해 1을 2번", A034 피해 2. B094는 엔진 99 = "모두 회복"이라 글이 맞음(오탐) → dev 검사기에서 n ≥ 99는 "모두"로 처리 |
| 3 | major | game-developer | 튜토리얼(10-lore 8-7, 키 12개)이 빌드에 없음. 성인 대상이라도 키워드 18개·심지·호명술을 처음 보는 사람이 첫 판에서 배울 길이 길게 누르기뿐 | DEV_NOTES "튜토리얼 없음", qa.md 화면 목록에 없음 | 모래 위 연습 첫 판에 8-7 순서대로 10단계. 키는 이미 있음 |
| 4 | minor | lore-writer (완료) · game-developer | 개발 임시 키 28개가 10-lore에 없음 | `data/strings-extra.json` | 10-lore 8-11에 모두 확정. 바꾼 값은 `ai_level` en(Opponent skill)과 `recut_rule_note`(친선 = 고른 영장 한 종) 2개. dev는 임시 파일을 지우고 strings.json에서 읽음 |
| 5 | minor | lore-writer (완료) | `mode_sparring_desc`가 "새김 그대로"인데 balance 결정은 친선 새김 슬롯 1 | 10-lore 8-1, `shots/03-heroes-360x640.png`, balance.json `breakthrough.fairness_policy` | "고른 영장 한 종만 새김을 적용합니다" / "Recut applies to one chosen writ."로 수정. 슬롯 고르기 화면 키 `recut_slot_title`·`recut_slot_desc`·`recut_slot_empty` 추가(8-11) |
| 6 | minor | game-developer (lore 키 추가) | 영어 모드에서 표준 영장첩 아키타입 이름이 한국어("잉걸 의식 컨트롤") | `shots/en-heroes-360x640.png`, decks.json `archetype` | 키 `deck_arch_<덱 이름>` 6개 추가(8-11). decks.json 한국어 대신 키로 표시 |
| 7 | minor | game-developer (lore 키 추가) | 몰입감: 호명자 고르기 화면에 칭호·호명술만 있고 인물·싸움 방식 소개가 없음. 대사도 판 시작·승패뿐이고 "내 명줄 ≤ 10" 대사가 없어 상대 위협 대사로 대신함 | `shots/03-heroes-360x640.png`, DEV_NOTES D8 | 키 `hero_<id>_bio` 6개(한 줄 소개 + 플레이 방식), 4절 대사표에 `위기` 줄 6개, 4-8 맞대결 첫 대사 8개(이브로 상성 4칸) 추가. dev는 위기 줄을 D8 자리에, 맞대결 대사는 상대가 정해진 짝일 때 등장 대사 대신 사용 |
| 8 | minor | lore-writer (완료) · game-developer | 카드 확대에서 "(최소↵1)."처럼 괄호 안 숫자가 줄 끝에서 갈림 | `shots/06-zoom-360x640.png` D012 | D012 문구를 "…2 감소, 최소 1."로 바꿈. dev: 카드 글에 `word-break: keep-all`을 쓰고, 숫자와 붙은 단위·괄호 앞에는 줄바꿈 없는 공백을 넣음 |
| 9 | minor | game-developer · art-director | 영어 대전 말풍선이 내 호명자 줄 위에 반투명으로 겹쳐 첫 줄이 흐림. 시장 상자 이름이 좁은 칸에서 5줄로 꺾임("Archive Copy Case (Ivro Tal)") | `shots/en-battle-360x640.png`, `shots/en-market-360x640.png` | 말풍선은 불투명 바탕 + 호명자 판 위 빈 줄에. 시장은 이름 칸을 넓히고 소유자는 둘째 줄 작은 글로 |
| 10 | minor | art-director | 굵은 영문에서 "Sister"가 "SIster"처럼 보임(문자열은 정상 S-i-s) | `shots/en-heroes-360x640.png`, `shots/en-collection-360x640.png`, strings.json 바이트 확인 | 굵은 글꼴의 소문자 i 글리프 확인(글꼴 대체 또는 자간) |
| 11 | minor | game-developer | "이 시장은 게임 안 재화만 받습니다"(`market_no_real_money`)가 부두(메인 메뉴) 화면 아래에 나옴 | `shots/02-dock-360x640.png` | 부두 시장 화면으로 옮김 |
| 12 | minor | game-developer (lore 키 추가) | 상자 공개에서 2장째 사본이 "각인 먹 +0"으로 표시 | qa.md 11번 | 키 `crate_second_copy`("2장째 · 이제 영장첩에 2장"), `crate_resonance_gain` 추가(8-11) |
| 13 | 확인 | — | 원본 보호 | 빌드 글 grep 0건, 카드 데이터 금지어 검사 통과 | 유지 |
| 14 | 확인 | lore-writer (완료) | 이브로 상성 4칸(이브로 > 렌·카드라, 나할·오다 > 이브로) 이야기 | balance 1-2 최종 9-1 | 10-lore 4-7 수치를 1-2 최종으로 갱신하고 4-8 "이브로의 상성 4칸 이야기" 추가("빠른 적은 기록으로 미리 알고, 오래 버티는 벽·신앙은 못 지운다") |

추가로 lore에서 고친 것: 카드 글 용어를 화면 용어로 통일했습니다(concept_ko의 "영웅"을 "호명자"로, "필드"를 "조수원"으로). 검사기는 concept_en 120자 초과, 영웅·필드 용어를 실패로 처리하고 금지어 검사 대상에 concept_en도 넣었습니다.

## 잘 된 점
- 10-lore 키 표 그대로 sync해 화면 글이 문서와 거의 일치합니다(270행 중 값이 다른 키 1개). 토스트는 모두 12자 이내이고, 한국어·영어 넘침 0(qa).
- 용어 체계(심지·명줄·껍질·숨 고르기·호명술)가 HUD·결과·상자 화면에 일관되게 쓰였고, 원작 용어는 0건입니다.
- 결과 화면 부제("이름은 당신 편에 남았습니다.")와 호명자 실루엣이 세계관 톤을 잘 살립니다.

## 점수
- 영역: 세계관·텍스트
- 체크 항목 통과: 5 / 8. 통과: 10-lore 일치(값 차이 1), 토스트 12자, 키 사용·DEV_NOTES 설명, 오류 화면 글, 원본 보호. 실패: 영어 카드 글, keep-all 갈림 1건, 튜토리얼 그림 카드 없음
- 점수: **6.5 / 10**. 한국어 화면과 톤은 좋습니다. 영어 모드 카드 규칙 글이 없고 튜토리얼이 없어 세계관·규칙 전달이 반쯤 끊깁니다. lore 몫은 이번에 모두 고쳤으므로 dev가 반영하면 8점대를 기대합니다
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목: (tcg-01) 지원 언어마다 카드 규칙 글이 있음(영어 모드에서 카드 효과를 영어로 읽을 수 있음). 카드 글 숫자 = 엔진 수치(sync 불일치 0, "모두" 오탐 제외)

VERDICT: REVISE
