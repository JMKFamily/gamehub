# lore-writer round-3 기획 처리표

- 날짜: 2026-11-19 · 입력: STATUS.md 일시중단·예약 콘텐츠·재개 절, criteria 152행 규약
- 바꾼 파일: `10-lore.md`, `strings.json` (키 117 → 126)
- 가정: balance의 어려운 난이도 구조·키 규칙이 아직 없어 **`hardN_name`(1~5), 누적 별 10·20·30·40·50에 하나씩 해금**으로 씀. balance가 다른 키를 정하면 이름만 옮김.

| 변경 | 내용 | 위치 |
|---|---|---|
| ① 보호자 고지 지움 | `guardian_hold`("어른은 길게 누르세요") 삭제. 설정 = 톱니 버튼 `btn_settings` "설정"을 한 번 누름(길게 누르기·describedby 없음) | strings, 10-lore 8절 8·9-6 |
| ① 설정 화면 글 | `guardian_title` "보호자 설정 / For grown-ups" → `settings_title` "설정 / Settings". `guardian_intro` → `settings_intro`(누구나 읽는 "~해요" 톤, 보호자·어른 낱말 없음, 큰 그림 해금 한 줄 추가, round-2 내용 유지) | strings, 10-lore 9-6 |
| ① 톤 규약 | 18세 난이도까지 넓어져도 어린이 친화 톤·선정성 없음·12자/6단어 한도 유지. 구분 "어른" → "설명"(긴 글 한도 없음) | 10-lore 5절·8절 1·9절 |
| ② 큰 그림 5단계 | 이름 `hard_title` 큰 그림 / Big Pictures, `hard1~5_name` 모자이크 타일·조각보 이불·무늬 양탄자·스테인드글라스·커다란 벽화(색칠책 맨 뒤 "만들기 장"). 시각 힌트는 색·도형만, 판 크기는 제안 | 10-lore 7-4·9-2 |
| ② 해금 안내 | 그림이 주: 자물쇠 + 별 10칸 고리. 글은 보조: `hard_locked` "별을 더 모아요", `hard_unlocked` "큰 그림이 열렸어요!"(결과 화면 진입 live에 이어 1번) | 10-lore 7-4·9-2 |
| ② 별 대체 글 | `aria_hard_need` meter(max = 해금 별 수, now = 누적 별, valuetext 숫자만, 버튼 밖 형제). `aria_map_stars` max = 50 + 큰 그림 별(balance 확정) | 10-lore 9-2 |
| ② 결과 제목 | `clear_hard` "큰 그림 완성! / Big picture done!" | 10-lore 8절 11·9-5 |
| ③ 넓은 판 조작 | 키 없음(예비 키 금지). art가 자동 따라가기면 문구 없음, 확대 몸짓·버튼을 넣으면 `btn_zoom_in`·`btn_zoom_out`·`card_wide` 안을 그때 추가 | 10-lore 7-5 |
| 스토어 긴 설명 | "보호자 화면" → "설정 화면", 큰 그림 한 줄, "Nice!" | 10-lore 11절 |
| 9-9 검사 | 키 이름 바꿈 반영, `settings_title`을 공통 UI로 허용 | 10-lore 9-9 |

## 개발 전달 (game-developer)
1. 키 바꿈: `guardian_hold` 삭제(지도 톱니 옆 글·길게 누르기 진행 그림·`aria-describedby` 제거, 한 번 누르면 설정). `guardian_title` → `settings_title`, `guardian_intro` → `settings_intro`.
2. 큰 그림: 장 탭 맨 끝 6번째 탭 = `hard_title`. 노드 5개 이름 = `hardN_name` + ", " + 상태(잠김 `hard_locked`, 열린 뒤 `node_*`). 잠긴 노드 옆(버튼 밖) `aria_hard_need` meter.
3. 해금된 결과 화면: 열리는 그림 + `hard_unlocked`를 결과 진입 live 뒤에 이어 1번. 큰 그림 판 결과 제목 `clear_hard`, 플레이 `.sr` 제목 = `hardN_name`.
4. 화면에 숫자 글 없음(별 수는 고리 그림·meter 속성만).

## 다른 역할 대기
- balance: 큰 그림 키 규칙·해금 조건·별 계산(큰 그림 별을 누적에 세는지) → `hardN_name`·`aria_map_stars` max 맞춤.
- art: 넓은 판 조작 방식(자동 따라가기 / 확대) → 7-5 키 추가 여부, 자물쇠·별 고리 그림, 해금 표지 자리.

## 검사
9-9 node: `doc 126 json 126 | max ko 12 en 5 | same-as-other 15 (common만 허용) | PASS`
