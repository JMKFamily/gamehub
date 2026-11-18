# lore-writer round-2 기획 수정 처리표

- 날짜: 2026-11-18 · 입력: `score.md`(lore 담당), `Docs/orchestrator/2026-11-18-1-7-round1-gate.md` H1~H4
- 바꾼 파일: `10-lore.md`, `strings.json` (키 66 → 67)

| 이슈 | 처리 | 내용 | 위치 |
|---|---|---|---|
| S14 (BA3) + S25 (LW4) = E4 `guardian_intro` | 수정 | 한 번에 아님 = "다른 색을 긋고 돌아와 이어 그린 색 + 지우거나 되돌린 뒤 다시 이은 색", "다른 색 전에 같은 색을 고쳐 그리면 한 번"(20-balance 4절과 같음). % 붙여 씀("80%", "(100%)"), % 바로 뒤 조사 없음. H2(처음부터 = 새 시도, 별 다시 가능)·H3(결과 점 줄 꽉 찬/속 빈 뜻, 놀이 중 가는 막대) 설명 추가. en도 같은 뜻 | strings.json `guardian_intro`, 10-lore 9-6 |
| S26 (LW5) | 수정 | `judge_2_name.en` "Nice" → "Nice!" | strings.json, 10-lore 6-1·9-4 |
| S9 (QA6·LW3) 플레이 화면 레벨 이름 | 수정(규칙) | `#play` 첫 요소 `.sr` h2 = `levelN_name`, 새 키 없음, live 아님. 캔버스 이름에 붙이지 않음 | 10-lore 8절 13 |
| S5 / H3 결과 쌍 점 줄 대체 글 | 수정(새 키) | `result_dots` "한 번에 이은 색 수 / Colors joined in one go": 컨테이너 하나 meter, valuenow = 꽉 찬 점 수, max = 쌍 수, valuetext 숫자만. 점마다 대체 글 없음. 읽는 순서 제목 → 점 줄 → % | strings.json, 10-lore 6-4·9-5 |
| H3 플레이 채움 막대 | 유지 | 막대 + 작은 % 모두 `aria-hidden`, 키 없음 | 10-lore 6-4·8절 15 |
| H4 막힘 | 결정: 읽지 않음 | "툭"·튕겨 나옴은 그림·소리만, live·키 없음(잦은 사건이라 낭독 연타, live 두 곳 규칙 유지) | 10-lore 6-3·8절 14 |
| H2 `btn_restart` | 유지 | "처음부터 / Start over"가 새 시도 뜻과 맞음. "새로 시작"은 `tap_to_start`와 헷갈려 안 바꿈 | 10-lore 9-4 |

## 개발 전달 (game-developer)
1. `strings.json` 다시 읽기: `guardian_intro`(ko·en 바뀜, 길어짐 → 보호자 화면 스크롤 S6과 함께 360x640 확인), `judge_2_name.en` = "Nice!", 새 키 `result_dots`.
2. 결과 화면 쌍 점 줄 컨테이너: `role="meter"`, `aria-label` = `result_dots`, `aria-valuemin` 0, `aria-valuemax` = 쌍 수, `aria-valuenow` = 한 번에 이은 쌍 수, `aria-valuetext` = 숫자만. 점 요소는 `aria-hidden`. DOM 순서: 제목 → 점 줄 → `result_accuracy` meter.
3. 플레이 화면 `#play` 첫 자식 `<h2 class="sr">` = 그 판 `levelN_name`(판 들어갈 때 갱신, `aria-live` 없음).
4. 플레이 채움 막대·% `aria-hidden`, 막힘 반응은 `aria-live`·문구 없음.
5. `btn_restart` 문구 그대로(동작만 H2).

## 검사
9-9 node: `doc 67 json 67 | max ko 12 en 5 | same-as-other 15 (common만 허용) | PASS`

## 요청자 추가 지시 (2026-11-18): 스테이지 50개
balance의 50판 구조·키 규칙이 아직 20-balance·balance-designer-r2-plan에 없어(17:51 기준) **가정 키 `levelN_name`(1~50)·`chapterN_name`(1~5), 10판 = 1장**으로 씀. balance가 다른 키·구조를 정하면 이름만 옮김.

| 항목 | 처리 | 위치 |
|---|---|---|
| 장 5개 이름·테마 | 수정: 색칠책 다섯 장 맑은 날 → 비 오는 날 → 가을 나들이 → 눈 오는 날 → 반짝반짝 밤(색·도형 힌트, 기믹은 제안만) | 10-lore 7-2, strings `chapter1~5_name` |
| 레벨 이름 50개 | 수정: L1~10 그대로, L11~50 새로(12자·6단어 이내, 겹침 0, 금지어 0, 레포 전체 대조 0) | 10-lore 7-3·9-2, strings |
| 레벨 선택 화면 | 수정: `aria_chapters`(tablist 이름, 탭 = 장 이름), `btn_page_prev`·`btn_page_next`, `aria_page_stars`(meter max 10). `aria_map_stars` max 50 | 10-lore 9-2 |
| 클리어 문구 | 수정: `clear_chapter`(L10·20·30·40), `clear_last` = L50 "별빛까지 다 칠했어요! / You painted the starlight!" | 10-lore 8절 11·9-5 |
| 새 기믹 카드 | 보류: balance 확정 후 `card_<기믹>` | 10-lore 7-2 |
| 9-9 검사 | `btn_reload`가 reverbound와 같아져 FAIL → 부트 공통 UI라 common에 넣음 | 10-lore 9-9·10절 |

개발 전달(추가):
6. 레벨 선택 = 5장 페이지. 장 탭 `role="tablist"`(이름 `aria_chapters`), 탭 = `chapterN_name`(잠긴 장 = 이름 + ", " + `node_locked`), ◀▶ = `btn_page_prev`/`btn_page_next`(끝 장에서는 숨김), 장 별 meter `aria_page_stars`(max 10, valuetext 숫자만), 전체 `aria_map_stars` max 50. 숫자 글은 화면에 쓰지 않음.
7. 클리어 문구: L50 `clear_last`, L10·20·30·40 `clear_chapter`, 그 밖은 기존 규칙.
8. 장 바탕색·도형은 10-lore 7-2·7-3 힌트(art가 확정).

검사: `doc 117 json 117 | max ko 12 en 5 | same-as-other 16 (common만 허용) | PASS`
