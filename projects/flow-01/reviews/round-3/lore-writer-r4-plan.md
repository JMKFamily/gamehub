# lore-writer round-4 기획 처리표

- 날짜: 2026-11-19 · 입력: `Docs/orchestrator/2026-11-19-1-7-round3-gate.md` M1~M4, `score.md` T5·T13, round-3 `lore-writer.md` LW1~LW5
- 바꾼 파일: `10-lore.md`, `strings.json` (키 126 → 127)

| 이슈 | 처리 | 내용 | 위치 |
|---|---|---|---|
| M2 도움과 별 | 수정 | `settings_intro`에 한 줄: "다섯 번째 판부터(큰 그림 포함)는 도와줘(손가락 그림 버튼)로 길을 본 색도 한 번에 이은 것으로 세지 않아요." 속 빈 점 뜻에 "도움을 받은 색" 추가(en 같음). L1~L4는 그대로라 "다섯 번째 판부터"로 한정. 화면 새 글 없음 | strings, 10-lore 9-4 `btn_help`·9-6 |
| M3 / T13 (LW2) 큰 그림 이름 | 수정(원본 확정) | 이름 원본 = 10-lore 7-4·strings. art palette `themes.hardN.lore`를 아래 표대로 바꿈 | 10-lore 7-4 |
| T5 (LW1) 장 2~5 바탕 | 확인만(art) | 7-2 장 이름·도형(물방울·잎·육각형·초승달) 그대로. art가 장 색 비중·장식 모양을 맞춤 | 10-lore 7-4 M3 줄 |
| M1 / LW4 넓은 판 첫 안내 | 수정(새 키) | `card_wide` "누른 채 이어 그어요 / Hold to zoom, keep drawing". H1-01 첫 진입, 확대가 필요한 화면에서만 1번. 그림 = 점 꾹 누름 → 그 자리 확대 → 떼지 않고 짝 점까지 이음. 확대 버튼 키는 두지 않음(새 몸짓 아님) | strings, 10-lore 7-5·9-3 |
| LW3 잠긴 문 누름 반응 | 수정(규칙) | 별 고리 숨 쉼 + 채워진 칸 반짝임(주), `hard_locked`를 문 페이지 제목 아래에 약 2초 보이는 글(보조), 낭독 없음. 해금 = 결과 화면 문 열림 연출 + `hard_unlocked` | 10-lore 7-4 |
| LW5 문 페이지 값 없는 meter | 수정(규칙) | 문 페이지에서 `aria_page_stars` 숨김. `aria_map_stars`(max 100)·`aria_hard_need`만 남김 | 10-lore 7-4·9-2 |
| 큰 그림 판 이름 | 수정(규칙) | 단계당 10판(H1-01~H5-10)은 모두 `hardN_name`을 씀 | 10-lore 7-4 |

## M3 맞춤 표 (art `palette.json themes.hardN`)
| 단계 | 지금 palette `lore` (버림) | 이름 = `lore`에 넣을 글 (KR / EN) | 바탕·장식 힌트 (10-lore 7-4) |
|---|---|---|---|
| hard1 | 구름 위 산책 | 모자이크 타일 / Mosaic Tiles | 크림 바탕 + 판 둘레 작은 네모 격자 테두리 |
| hard2 | 숲속 오두막 | 조각보 이불 / Patchwork Quilt | 연분홍 → 크림, 짧은 줄무늬 띠(점선 금지) |
| hard3 | 바닷속 정원 | 무늬 양탄자 / Patterned Rug | 살구 → 연노랑, 두 겹 테두리 띠 |
| hard4 | 별빛 놀이공원 | 스테인드글라스 / Stained Glass | 연남색 → 연보라(판은 밝게), 세모 여러 개 |
| hard5 | 달나라 여행 | 커다란 벽화 / Giant Mural | 크림 → 벽돌빛 연살구, 넓은 네모 1개 |

## 개발 전달 (game-developer)
1. `strings.json` 다시 읽기: `settings_intro` 바뀜, 새 키 `card_wide`(카드 id = 키, H1-01, 확대가 필요한 화면에서만 첫 진입 1번).
2. 잠긴 문 누름: 고리 숨 쉼 + 반짝임, `hard_locked`를 문 페이지 제목 아래 약 2초 보이는 글로(지금은 aria-label에만). live 없음.
3. 문 페이지(`toMap(5)`)에서 `#mStars` hidden. `mAll` max 100 유지.
4. 큰 그림 10판의 결과 이름 띠·`.sr` 제목 = 그 단계 `hardN_name`.

## 다른 역할 대기
- balance: M2 별 계산(board.mjs·verify), `card_wide` 카드 id를 `levels-hard` H1-01에 연결.
- art: palette `themes.hard1~5.lore`·바탕을 위 표대로, 장 2~5 바탕(T5), `card_wide` 그림·잠긴 문 글 자리.

## 검사
9-9 node: `doc 127 json 127 | max ko 12 en 5 | same-as-other 15 (common만 허용) | PASS`
