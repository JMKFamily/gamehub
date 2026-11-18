# 리뷰: lore-writer · round 2

## 확인한 것
- 빌드 `games/tcg-01/`(44f5389): `data/strings.json`, `data/cards.json`(text_en), `data/text-check.json`(mismatch 0), `data/starters.json`, `js/main.js` 이어하기 화면, `js/screens.js` deckLabel, 코드의 `t('…')` 키와 strings 대조
- QA `reviews/round-2/qa.md`(D7·D8·D21, 새 이슈 2~4), 스크린샷: en-heroes·en-battle·en-collection·en-decks, 07-result, tut-03-tut_8_end (360x640)

## round-1 major 처리 확인
| round-1 | 결과 | 근거 |
|---|---|---|
| 1 영어 카드 규칙 글 없음 | **해결** | `data/cards.json` text_en 200/200 (qa D7), 영어 모드에서 키워드+풍미글 대체 제거 |
| 2 글 숫자 ≠ 엔진 5장 | **해결** | `data/text-check.json` mismatch [] (B094 "모두" 오탐 처리됨) |
| 3 튜토리얼 없음 | **해결(순서 minor 남음)** | 첫 연습 판 10단계 표시(qa D8), 아래 이슈 1 |
| 그 밖 | 해결 | 임시 키 파일 삭제·빠진 키 0, 호명자 소개 줄 표시, 덱 아키타입 영문, 위기·맞대결 대사 동작(`tut-03` 화면에 렌 ↔ 이브로 맞대결 대사 확인) |

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안·처리 |
|---|---|---|---|---|---|
| 1 | minor | game-developer (lore 키 추가) | 튜토리얼 순서: 1턴에 낼 카드가 없으면 "숨 고르기" 안내(tut_8)가 "카드 내기"(tut_3)보다 먼저 나옴 | qa.md 이슈 2, `shots/tut-03-tut_8_end-360x640.png` | **lore**: `tut_3_no_play`와 순서 규칙을 10-lore 8-11에 추가. **dev**: tut_8은 tut_3(또는 변형)을 보인 뒤에만 |
| 2 | minor | game-developer | 튜토리얼 끝 토스트 "이제 당신도 호명자입니다."가 승리 부제를 덮음 | `shots/07-result-360x640.png` | 결과 화면이 닫힌 뒤 보임(10-lore 8-11 규칙) |
| 3 | minor | game-developer (lore 키 추가) | 입문 영장첩이 "Ivro Tal · Ivro Tal's Writbook"처럼 이름이 겹쳐 보이고 표준 영장첩과 구분이 안 됨 | `shots/en-decks-360x640.png`, `js/screens.js` deckLabel(`deck_name_default`) | `deck_starter`("입문 영장첩 / Starter Writbook")·`deck_starter_desc` 추가 |
| 4 | minor | game-developer (lore 키 추가) | 이어하기 ▶ 버튼의 aria가 `title_tap_to_start`("눌러서 조수원으로")라 상황과 맞지 않음 | `js/main.js` visibilitychange | `pause_title`·`pause_resume`·`pause_hint` 추가 |
| 5 | minor | game-developer · art-director | 대전 말풍선이 여전히 반투명이라 조수원 줄 위에서 흐리게 읽힘(영어 긴 대사에서 두드러짐). 한국어 화면(`tut-03`)은 불투명이라 또렷함 | `shots/en-battle-360x640.png` | 등장 전환이 끝난 뒤 불투명 100 %, 긴 영어 대사도 2줄 안에 |
| 6 | minor | art-director | 굵은 영문 "Sister"가 여전히 "SIster"처럼 보임. 수집 카드 오른쪽 위 보유 수 "1/2"가 깨진 모서리에 잘림 | `shots/en-heroes-360x640.png`, `shots/en-collection-360x640.png` | 글꼴 i 글리프 확인. 보유 수 표시를 모서리 안쪽으로 |

blocker·major 없음. 원본 보호: 새 글(맞대결·위기 대사, 소개 줄, 튜토리얼)에서 원작 번역어 0건.

## 잘 된 점
- 맞대결 첫 대사(렌 "오늘은 그 책을 태우러 왔어." ↔ 이브로 "당신 수법은 3권 41쪽에 있소.")가 판 시작에 바로 나와, 상성과 라이벌 서사가 한 화면에서 이어집니다. 요청자 지시 "몰입감"에 가장 크게 기여한 변화입니다.
- 호명자 고르기의 한 줄 소개가 인물과 플레이 방식을 함께 알려 줍니다(예: "Reads and erases fast foes").
- 영어 카드 글이 전부 들어갔고, 글 숫자 = 엔진 수치(불일치 0)가 됐습니다.

## 점수
- 영역: 세계관·텍스트
- 체크 항목 통과: 7 / 8 (튜토리얼 그림·순서 1건만 미흡)
- 점수: **8.0 / 10**. round-1 major 3건이 모두 해결됐고, 대사·소개로 몰입이 크게 늘었습니다. 튜토리얼 순서와 토스트 겹침, 말풍선 투명도 같은 minor만 남았습니다
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목: 없음(qa의 튜토리얼 순서 항목 제안에 동의)

VERDICT: PASS
