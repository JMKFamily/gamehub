# 1-2 교차 리뷰 1차 (lore 관점: 키·문구·용어·rhythm-01 구분)

- 날짜: 2026-11-17
- 역할: lore-writer
- 프로젝트: rhythm-02
- 단계: 1-2 (balance-designer·art-director와 병렬, 지적만)

## 요청 받은 일
오케스트레이터: balance(20-balance·balance.json·levels)와 art(30-art·assets)를 텍스트 키·문구·이름·용어·글 없이 이해·5~6세 말 관점에서 읽고 충돌·누락을 지적. 꼭 다룰 안건: 카드 키 불일치, G6 미사용, 바뀐 수치의 문구 영향, "구름" 다의, L10 결과 버튼·보호자 진입·소리 밀림 표지, rhythm-01과의 구분(메인 세션 요청), 테마·실루엣 일치, 키 없는 화면 요소, 화면 용어 일치. 이번에는 수정하지 않음.

## 한 일
1. `harness/insights.md`·`criteria.md`·`templates/review.md`, 오케스트레이터 1-1 감시 기록을 읽음.
2. 20-balance·30-art 전체, `balance.json gimmicks`·`tutorial_finger`, `levels/01·07`, `layout.json finger`, 목업 SVG의 글 자리, 카드 파일 목록을 확인.
3. rhythm-01 `10-lore.md`와 우리 문구를 grep으로 대조(같은 한국어 문구 12개, `tut_tap` 문장 틀 같음 발견).
4. "똑딱" 사용 횟수를 문서·JSON별로 셈.
5. 리뷰 파일에 이슈 16개(major 6, minor 10, blocker 0)와 rhythm-01 구분 판정 표를 씀.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-02/reviews/cross/lore-writer.md` | 교차 리뷰 1차: 이슈 16개(번호·심각도·담당·근거·제안), rhythm-01 구분 판정, 잘 된 점, 다음 단계 lore 할 일 |
| `projects/rhythm-02/Docs/lore-writer/2026-11-17-1-2-cross-review.md` | 이 보고서 |

## 검증 결과
- 카드 키: `balance.json` R1 → `card_three`, `strings.json`에는 `card_fast`만, `assets/cards/`에는 `card_B1…card_R1`·`card_G6` → 세 곳 불일치 확인(이슈 1·2).
- 손가락: `layout.json hide_after_ms 300` → 3300 ms, L1 2번째 접촉 놓침 구역 시작 3250 ms → 50 ms 겹침 계산(이슈 3). balance S5는 balance 값(3170 ms)으로 검사해 걸리지 않음.
- `grep -c 똑딱`: 00-benchmark 5, 20-balance 11, 30-art 4, balance.json 4, sound.json 1(이슈 6).
- 목업 SVG `<text>` 6개 모두 치수 표시 → 글 자리 미정(이슈 14).
- 제안 문구 글자 수는 손으로 셈(12자/6단어 안). `strings.json`은 이번에 바꾸지 않아 7-9 검사는 다시 돌리지 않음.

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 이름·캐릭터·아트·음악·레벨 배치 없음)
- [x] 게임 선정·설계 원칙 (5~6세 단순 규칙, 약한 아트 컨셉)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정(리뷰 파일·보고서·README 한 줄), git 커밋·푸시 안 함. 다른 프로젝트는 읽기만. 프로세스·서버 띄우지 않음

insights 적용: 5~6세·텍스트 항목(12자/6단어, 모양 이름, 그림 = 실제 첫 물체, ↻ 첫 실패만, 차례 신호 겹침 검사)을 리뷰 기준으로 씀. 차례 신호 겹침 항목으로 손가락 50 ms 겹침(이슈 3)을 찾음. 구현·QA 측정 항목은 기획 리뷰라 해당 없음.

## 문제·남은 일
- major: 카드 키 3중 불일치(lore·art), L1 손가락 겹침(art), L3 레벨 카드 장식 구름과 등급 구름 혼동(art), 아이콘 표 없음(art), 보호자 설정 구조 미정(balance·art), `tut_tap` 문장이 rhythm-01과 같은 틀(lore).
- minor 10개는 리뷰 파일 참고.
- 다음 단계 lore 할 일: `card_three` "하나 둘 셋, 톡!", `tut_tap` "공이 북에 닿으면 톡!", `clear_title_1` "높이 올랐어요!", `aria_best`, 키 구분, L7 분위기, 8절 설명 정정, 7-9 검사에 카드 키·파일 대조 추가.

## 다른 팀에 줄 인사이트
- 같은 허브의 다른 게임과 문구를 grep으로 대조하면 "재사용 없음" 주장이 틀린 것을 바로 잡을 수 있다. 시스템 UI 문구는 일부러 같게 두고, 튜토리얼·클리어처럼 게임 정체성 문구만 다르게 하는 기준을 문서에 적는다.
- 튜토리얼 문장에는 "닿는 곳"(북·별 등)을 꼭 넣는다. "닿으면 톡"만 쓰면 판정 순간이 다른 게임과 말로 구분되지 않는다.
- 손가락·튜토리얼 글이 사라지는 시각은 art 배치 값과 balance 검증기 값 중 하나만 원본으로 두고, 검증기가 그 원본을 읽게 한다. 두 문서에 따로 있으면 검증기는 통과해도 빌드에서 겹친다.
