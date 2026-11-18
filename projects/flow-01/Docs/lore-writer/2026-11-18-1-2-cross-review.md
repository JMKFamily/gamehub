# 1-2 교차 리뷰 1차 (lore-writer)

- 날짜: 2026-11-18
- 역할: lore-writer
- 프로젝트: flow-01
- 단계: 1-2

## 요청 받은 일
오케스트레이터: PIPELINE 1-2 교차 리뷰 1차. balance(20-balance·balance.json·levels)와 art(30-art·assets)가 쓰는 텍스트 키·카드 id·레벨 name_key가 strings.json과 맞는지, F4·F5 결정 뒤 10-lore 6-1·% 대체 글 변경 목록, art text_slots에 가장 긴 문구가 들어가는지, 튜토리얼 그림과 첫 등장 물체의 색·모양, 레벨 테마 ↔ 바탕 색을 확인해 이슈 목록으로 씀. 자기 문서는 이번에 고치지 않음.

## 한 일
1. 공통 지시 문서·역할 정의·F1~F5·insights를 읽고 balance·art 산출물(문서·JSON·SVG)을 strings.json·10-lore와 대조.
2. lore 9-9 검사 재실행, 원본 보호 grep(한국어 표기 포함), layout.mjs `textW`로 결과 제목·레벨 이름·`guardian_hold` 폭 계산(파일 쓰기 없음).
3. 튜토리얼 SVG 3장의 점 좌표·색을 L1·L2·L6 데이터와 칸 단위로 비교.
4. 이슈 24개와 F4·F5 뒤 lore 변경 목록 10줄, 대조표 4개를 리뷰 파일로 씀.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/flow-01/reviews/plan-1-2/lore-writer.md` | 이슈 24개(major 9 · minor 15), F4·F5 변경 목록, 키·글 자리·튜토리얼·테마 대조표 |
| `projects/flow-01/Docs/lore-writer/2026-11-18-1-2-cross-review.md` | 이 보고서 |

## 검증 결과
- lore 9-9: `doc 66 json 66 | max ko 12 en 5 | same-as-other 15 | PASS`.
- 원본 보호 grep(flow free·플로우·플로우 프리·two dots·zip·numberlink): strings·balance.json·levels·assets·20-balance·30-art 0건.
- 레벨 `name_key` 10/10 일치, art `text_slots.used_by` 4키 모두 존재, 결과 제목 5종 모든 해상도 폭 90 % 미만.
- 못 한 것: 실제 글꼴 렌더 폭(빌드 없음, qa 1-4).

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 이름·캐릭터·아트·음악·레벨 배치 없음)
- [x] 게임 선정·설계 원칙 (5~6세 단순 규칙, 약한 아트 컨셉)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정, git 커밋·푸시 안 함

## 문제·남은 일
- major(balance): L6 구멍 2개가 모두 판 가장자리 → "구멍" 낱말·카드와 어긋남. 안쪽 첫 구멍으로 재선정 권장(이슈 1).
- major(art): L2·L6 그림 카드가 실제 판과 다른 판·색(이슈 2·3), 타이틀·보호자·오류 화면 배치·글 자리 없음(6), 지도 `guardian_hold`·결과 `result_new_best` 자리 없음(7·9).
- major(balance↔art): "한 번에 이은 쌍" 결과 표지가 balance에만 있음(5).
- major(lore, 2차): F4·F5 반영 10줄(이슈 4), 결과 화면 레벨 이름 글 정리(8).
- minor 15개: 판정·카드 글 키 연결 필드, name_placeholder, 도움 대상 정의, gap_left 글 시점, 아이콘 통일 등.

## 다른 팀에 줄 인사이트
- 구멍(빈 칸) 기믹을 소개하는 레벨은 첫 구멍이 판 안쪽(둘레 4칸이 모두 칸)이어야 아이에게 "구멍"으로 보인다. 가장자리 구멍은 판 모양이 깨진 것으로 읽힌다. 생성기 필터나 고르기 조건에 넣는다.
- 글 자리 검사는 플레이 화면만이 아니라 타이틀·보호자·오류·결과 제목까지, 보이는 글이 있는 모든 화면에 둔다(art 검사가 strings를 읽어도 화면 목록이 빠지면 검사가 비어 있음).
