# 리뷰: lore-writer · round 1

## 확인한 것
- 읽은 파일: `harness/criteria.md`(세계관·텍스트 절, 대상 연령, 원본 보호), `harness/insights.md`(텍스트·aria 줄, flow-01 줄), `projects/flow-01/10-lore.md`(2~9절), `strings.json`, `DEV_NOTES.md`(D4·D6·D10·D12), `reviews/round-1/qa.md`(이슈 1~9, 5g 접근성 트리)
- 빌드 코드: `games/flow-01/index.html`(부트 블록), `js/main.js`(applyLang·지도 노드·판정 이름·결과·보호자), `style.css`(keep-all), `data/strings.json`, `data/palette.json`(레벨 바탕·장식), `data/levels/*.json`
- 스크린샷: `shots/` 360x640·412x915·640x360·1280x720 × ko/en의 타이틀·지도·L1 시연·L2 카드·L2 빈칸·L6 카드·L6 판정·결과·보호자·오류, notext 일부
- 직접 확인(포트 8765, 띄운 PID만 종료): `?test=1&lang=en` 640x360에서 저장소를 비우고 L2 카드 열기 → 카드 상자 x 80~560, 카드 글 자리 `#pText` x 8~144 → "Fill every square"가 카드 밑에 깔림. 플레이 화면 대체 글: 캔버스 "Join the matching dots", 쌍 meter, 버튼 4개 — 레벨 이름 없음(QA #6과 같음)
- 자동 대조: `projects/flow-01/strings.json` = `games/flow-01/data/strings.json`(글자까지 같음). JS의 한국어 리터럴은 주석뿐, 화면 글·aria는 모두 `T(key)`. 원본 보호 grep(Flow Free·플로우·Big Duck·Numberlink·넘버링크·Bridges·브리지) 빌드 0건

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | major | game-developer, art-director | **가로 화면에서 그림 카드 글이 카드에 가려 잘림.** 가로 배치는 카드 글 자리(`board_text`)가 판 왼쪽 기둥인데, 카드 상자가 판보다 넓어 그 기둥을 덮음. L6 "Holes stay emp…" / "구멍은 / 되…", L2 "Fill ev… / squa…". 2해상도(640x360·1280x720) × 2언어 × 카드 2장 모두. 세로 두 해상도는 판 위 띠라 정상. QA는 "글 넘침 0"으로 쟀지만 가림은 재지 않았음 | `shots/640x360-en-play-L6-card.png`, `640x360-ko-play-L6-card.png`, `1280x720-en-play-L6-card.png`, 직접 확인 640x360 en L2(카드 x 80~560, `#pText` x 8~144) | 가로에서는 (a) 카드 폭을 판 기둥 안으로 줄이거나(QA #8 쌍 점 줄 가림과 같이 고침) (b) 카드 글을 카드 아래 띠 안에 넣기. `layout.json` 가로 `card` 상자와 `text_slots.board_text`가 겹치지 않는지 4해상도 자동 검사 추가 |
| 2 | minor | qa-engineer | ko/en 스크린샷 세트의 `*-play-L2-card.png` 8장에 카드가 없음. 앞 단계에서 L2가 이미 별까지 끝난 저장 상태라 D6(다 칠한 판은 카드 생략)에 걸림. 그래서 `card_fill` 글은 어느 언어로도 화면 확인이 안 됐고 이슈 1을 L2에서 놓침 | `shots/360x640-en-play-L2-card.png`·`412x915-ko-play-L2-card.png`(판만 있음), `tools/qa-round.mjs` 394행(`loadLevel(1); step(300)`), `360x640-notext-play-L2-card.png`(새 저장소라 카드 있음) | L2 카드 샷 전에 L2 진행 기록을 지운 저장 상태로 열기(또는 카드 강제 표시 훅). 카드 샷마다 `board.card === true` 단언 |
| 3 | minor | game-developer, lore-writer | QA #6 동의: 플레이 화면 접근성 트리에 레벨 이름 없음. criteria 세계관 rhythm-02 줄("레벨 시작 판"의 레벨 이름) 미충족. 10-lore 8절 4항이 "두 키를 잇는 곳은 지도 노드뿐"이라 캔버스 이름에 붙이는 방법은 lore 규칙과 부딪힘 | `parts/func.json aria.ko.play`, 직접 확인(캔버스 이름 "Join the matching dots"만) | 키를 잇지 말고 `#play` 첫 요소로 화면에 안 보이는 제목(`.sr` h2, 글 = `levelN_name`)을 두기. 10-lore 8절에 "플레이 화면 sr 제목 = 레벨 이름" 한 줄을 lore가 추가(round-2 lore 작업) |
| 4 | minor | lore-writer | 보호자 글 `guardian_intro`(ko)가 "80 %이고"에서 줄이 바뀌어 "%"와 조사 "이고"가 갈라짐(360x640). 또 이 글은 "80 %·100 %"(띄움), 결과·판정 화면은 "100%·53%"(붙임)라 한 언어 안에서 표기가 다름 | `shots/360x640-ko-guardian.png` 6~7줄, `strings.json guardian_intro.ko` | 화면과 같이 "80%"로 붙이고, % 뒤에 조사가 오지 않게 고쳐 쓰기(예: "…4쌍을 한 번에 이으면 80%, 모두 한 번에 이으면 100%예요. 100%면 별을 받아요."). en은 이미 붙여 씀 |
| 5 | minor | lore-writer | 영어 판정 이름 2단 "Nice"만 느낌표가 없어 3단 "Yay!"보다 약하게 읽힘(등급 세기가 거꾸로 들림). 10-lore 6-1 "영어 2~4자 + 느낌표" 규칙과도 다름 | `strings.json judge_2_name.en`, `shots/360x640-en-play-L6-judge.png` | `judge_2_name.en` = "Nice!" (10-lore 6-1 표·strings.json 같이) |

## 잘 된 점
- 화면 글·대체 글·부트 블록이 모두 `strings.json` 키에서 옴(하드코딩 0, 66키 중 안 쓰는 키는 `store_short` 하나·DEV_NOTES D12에 이유). 부트 단계 `lang`·제목이 선택 언어로 바뀌고, 오류 화면 ↻ 그림이 인라인이라 글 없이 다시 할 수 있음(4해상도 × 2언어 오류 샷 정상).
- 플레이 중 글이 모두 12자·6단어 안이고 "점·칸·빈칸·구멍·판·별" 같은 화면 모양 이름만 씀. 한국어 keep-all로 가로 2줄 줄바꿈도 낱말 단위("같은 색 점까지 / 끌어요").
- 판정 이름 3단(최고야·멋져·해냈어 / Wow!·Nice·Yay!)이 판 밖에 쌍 색 + 흰 테두리 큰 글씨로 떠서 칭찬으로 읽히고, 실패·빈칸 순간에는 이름이 없음. 놀이 중 %(칠한 칸 그림표)와 결과 %(한 번에 이은 그림표)는 그림표가 달라 섞이지 않음.
- 레벨 테마 ↔ 화면 분위기가 10-lore 7절과 맞음: L1 연노랑·크림, L2 연분홍 + 작은 고리 3개, L6 물빛 청록 + 구멍 칸에 바탕 물빛, L10 살구 → 연보라 + 완료 때만 별. 지도 노드 미니 그림·결과 이름 띠가 그 판 바탕색을 씀.
- 튜토리얼 그림 = 실제 첫 물체: L1 손가락이 실제 빨강 하트 쌍의 답 길을 끎, L2 카드 빈칸 = 왼쪽 위 두 칸, L6 카드 구멍 = 달·세모 사이 판 안쪽 구멍.
- 결과 화면 클리어 문구가 레벨 규칙(별 → `clear_star`)대로 나오고, 긴 영어 이름 "Stepping Stone Pond"도 360x640 이름 띠 안에 들어감.

## 점수
- 영역: 세계관·텍스트 (가중 10 %)
- 체크 항목 통과: 7 / 9 (criteria 세계관 절 11항목 중 적용 9. 통과: 10-lore 일치, 12자·모양 이름, keep-all·언어별 샷, 튜토리얼 그림 = 실제 물체, 키 사용·aria 값 분리, 불러오기·오류 글 없이, aria 하드코딩 0·토글 aria-pressed. 실패: 잘림 없음(이슈 1), 접근성 트리 레벨 이름(이슈 3). 해당 없음: 카드 규칙 글(TCG), `{n}` 문구(치환 자리 없음))
- 점수: 7.5 / 10 (글 자체·테마 일관성·글 없는 진행은 좋음. 가로 화면 두 장의 카드 글이 가려지는 major 1개와 플레이 화면 이름 누락으로 감점)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목: (flow-01 round-1, lore-writer 제안) 화면 고정 글 자리(`text_slots`)가 같은 순간 뜨는 모달·그림 카드 상자와 겹치지 않음(4해상도 × 지원 언어, 요소 사각형 교차 0으로 자동 확인), 그리고 카드·모달 스크린샷마다 그 요소가 실제로 떠 있음을 단언 (flow-01: 가로 L2·L6 카드 글 가림, ko/en L2 카드 샷 8장에 카드 없음)

VERDICT: REVISE
