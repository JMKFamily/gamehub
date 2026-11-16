# 리뷰: lore-writer · round 1

## 확인한 것
- 규칙: `CLAUDE.md`, `harness/PIPELINE.md`(게임 선정·설계 원칙, 원본 보호 규칙, 작업 보고서 규칙), `harness/criteria.md`, `harness/templates/review.md`
- 요청자 최신 지시: 5~6세도 할 수 있는 아주 간단한 규칙, 글을 읽지 못해도 진행 가능, **문구는 짧고 쉽게**, 아트 컨셉은 약하게, 가중 8.0 이상까지 피드백 루프
- 텍스트 대조: `projects/runner-01/10-lore.md` 5절 ↔ `games/reverbound/data/strings.json`(키 70 + 사망 문구 8 + 클리어 부제 4) → **문구는 전부 글자 그대로 일치**(오탈자 없음). `main.js`의 화면 문자열 사용(`t()`, `fillStaticText`, `renderCards`, `onDeath`, `showClearScreen`, `updateCue`, `cueIcon`), 레벨 `cues`(`data/levels/0{1,2,3}-*.json`), `data/art.json`, `30-art.md` 1·2·4-9절
- 스크린샷 직접 확인: `shots/640x360-title-normal-first.png`, `360x640-02-levels.png`, `1280x720-02-levels.png`, `640x360-rt-level1-1.2s-cue.png`, `360x640-notext-rt-level1-4.0s-finger-press.png`, `640x360-03-play-level2.png`, `640x360-03-play-level3.png`, `360x640-03-play-level3.png`, `360x640-04-death.png`, `640x360-04-death.png`, `640x360-07-pause.png`, `640x360-08-settings.png`, `412x915-06-clear-screen.png`
- **`?lang=en` 스크린샷: 없음.** 74장 파일 이름·`qa-round.mjs` 확인 결과 영어는 `basic` 검사에서 로드(콘솔 0)만 했고 화면을 찍지 않음 → 영어 문구 잘림은 이번 라운드에 확인 불가
- `reviews/round-1/qa.md`, `DEV_NOTES.md` D5(`tut_low`·`tut_hold` 미표시)·D6(언어 전환 UI 없음), 1-2 교차 리뷰 메모(`reviews/cross/*.md`의 `tut_tempo`·`tut_hold`·색 힌트 항목)

## 교차 리뷰에서 남긴 문구 불일치 판단
| 항목 | 현재 상태 | 판단 |
|---|---|---|
| `tut_tempo` 문구 (첫 템포 문은 느려짐) | 10-lore·strings 모두 "템포 문을 지나면 빠르기가 바뀌어요"로 고쳐짐 | **글은 해결.** 다만 카드 그림이 몰아침 문(자홍 `gateFast`, 꺾쇠 3개)이라 실제로 처음 만나는 늘임 문(하늘색, 꺾쇠 1개)과 다름 → 이슈 3 |
| `tut_hold` 미사용 | 레벨 `cues`에 없고 MVP에 홀드 구간 없음(balance 교차 리뷰 #4 "유지") | **튜토리얼에서 뺌이 맞음.** 5~6세 규칙은 "누르면 뛴다" 하나로 충분. 홀드는 스토어 문구에만 남김 → 이슈 4 |
| `tut_low` 미사용 | 레벨 `cues`에 없음. 24박 전은 손가락 시연이 대신함 | "조금 늦게 뛰어도 넘어요"는 아이가 행동으로 옮길 수 없는 설명이라 **빼는 쪽으로 정리** → 이슈 4 |
| 위험·템포 문·고리 색 힌트 | 10-lore 4절은 아직 레벨별 위험 색(붉은/주황/산호), 레벨 1 "크림색 밝은 종이 하늘", 레벨 3 고리 "연두", 템포 문 "하늘색 캡슐 문 1색"으로 적혀 있음. 빌드·30-art는 어두운 배경 3레벨 공통, 위험 `#FF8C6E` 공통, 고리·발판 민트 `#5FE0C0` 공통, 템포 문 3색(하늘/상아/자홍)+꺾쇠 수 | **10-lore가 낡음.** 10-lore 머리말 소유권 규칙상 30-art·빌드가 맞으므로 화면 문제는 아님. round-2에 lore 시각 힌트를 고침 → 이슈 5 |

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | major | lore-writer | 화면 문구가 5~6세에게 어렵고 김 (요청자 지시 "문구는 짧고 쉽게" 위반). 튜토리얼에 세계관 용어(잡음 결정, 템포 문, 울림 고리, 현 발판, 잡음)와 외래어 "탭", 두 문장 문구(`tut_crate` 22자, `tut_hanging` 20자, `tut_tempo` 18자)가 쓰임. 사망 문구도 "다시, 한 소절", "정적은 잠깐뿐", "흩어졌다 모인다"처럼 추상적 | `strings.json` `tut_*`, `death_messages`. `shots/640x360-03-play-level2.png`(두 줄 카드), `640x360-03-play-level3.png` | round-2에 10-lore 5-2·5-4·5-6절을 10자 안팎 한 문장, 아이가 아는 말로 다시 씀. 화면에 보이는 모양 이름(뾰족이, 상자, 북, 고리, 문)을 쓰고, 세계관 이름은 스토어 문구에만 둠. 예: `tut_tap` "누르면 뛰어요", `tut_shard` "뾰족한 건 뛰어넘어요", `tut_beat` "음악에 맞춰 톡!", `tut_crate` "상자 위로 올라가요", `tut_drum` "북을 밟으면 높이 뛰어요", `tut_hanging` "위가 뾰족하면 뛰지 마요", `tut_string` "얇은 판 위에 서요", `tut_ring` "고리 안에서 한 번 더 톡!", `tut_tempo` "문을 지나면 빠르기가 달라져요", 사망 문구 "다시 해 보자!"·"조금만 더!" 류. 영어도 같은 수준으로 |
| 2 | minor | game-developer | 한국어 카드·토스트가 낱말 중간에서 줄바꿈됨 ("빠르기가 바 / 뀌어요", "그땐 뛰 / 지 마세요", "다시 시 / 작해요") | `shots/640x360-03-play-level3.png`, `640x360-03-play-level2.png`, `412x915-06-clear-screen.png`. `style.css`에 `word-break` 지정 없음 | `.cue`, `.toast`, 메뉴 글에 `word-break: keep-all; overflow-wrap: anywhere;`. 이슈 1로 문구가 짧아지면 대부분 한 줄이 됨 |
| 3 | minor | game-developer | `tut_tempo` 그림이 몰아침 문(자홍, 꺾쇠 3개)인데 이 카드 뒤 처음 만나는 문은 늘임 문(하늘색, 꺾쇠 1개). 글을 못 읽는 아이에게는 그림이 본문이라 "빨라진다"로 읽힘 | `main.js` `cueIcon` `tut_tempo`(`C.gateFast`, 꺾쇠 3개), `levels/03` `speed_changes[0]` = slow 40박, `shots/360x640-03-play-level3.png` | 그림을 늘임 문(`gateSlow`, 꺾쇠 1개)으로, 또는 늘임·몰아침 문 두 개를 나란히. 80박 몰아침 문 앞에 그림만 있는 두 번째 카드 추가도 검토(balance-designer 판단) |
| 4 | minor | lore-writer | 10-lore 5-6절에 화면에 안 나오는 `tut_low`·`tut_hold`가 남아 있고, 표시 박 위치가 레벨 데이터와 다름(`tut_shard` 4박→실제 5, `tut_beat` 18→13, `tut_drum` 22→22.5, `tut_tempo` 37→38.5). 스토어 긴 설명은 "누르고 있으면 계속 뜁니다"라 홀드를 계속 홍보 | `10-lore.md` 5-6절 표, `DEV_NOTES.md` D5, `levels/*.json` `cues` | round-2에 `tut_low`·`tut_hold`를 "쓰지 않음(MVP)"으로 옮기고, 표시 시점 열을 `levels/*.json cues`를 기준으로 맞춤. 스토어 문구의 홀드 줄은 유지하되 튜토리얼은 탭 하나만 가르침 |
| 5 | minor | lore-writer | 10-lore 2·4절 시각 힌트가 30-art·빌드와 다름: 레벨 1 "크림색 종이 하늘·밝은 종이"(화면은 어두운 회청 `#222B37`), 위험 레벨별 붉은/주황/산호(실제 공통 `#FF8C6E`), 레벨 3 고리·발판 "연두"(실제 민트 공통), 템포 문 "하늘색 캡슐 문"(실제 3색). 2절의 "판화 포스터·무광 색종이" 질감 서술도 "아트 컨셉 약하게" 지시와 맞지 않음 | `10-lore.md` 43·84·97·111줄, `data/art.json`, `30-art.md` 2절, `shots/640x360-rt-level1-1.2s-cue.png` | round-2에 4절 시각 힌트를 "어두운 하늘 + 레벨별 바탕색, 뾰족이 산호 주황·고리/북 민트·문 3색+꺾쇠 1·2·3 (세 레벨 공통)"으로 고치고, 2절 질감 문단은 "단순 도형, 또렷한 색" 한 줄로 줄임 |
| 6 | minor | lore-writer | 일시정지의 연습 토글이 "연습 모드 켜기/끄기 · 끄기"로 보여 같은 말이 겹치고 아이가 상태를 알기 어려움 | `shots/640x360-07-pause.png`, `main.js` 373줄(`pause_practice_toggle` + 상태) | `pause_practice_toggle`을 "연습 모드" / "Practice"로 바꾸고 빌드는 깃발 아이콘 + 켜짐/꺼짐 토글 모양으로 표시(game-developer) |
| 7 | minor | qa-engineer | `?lang=en` 화면 스크린샷이 없어 영어 문구 잘림(예: 카드의 "Wirebridge Night Market", "Tap inside an Echo Ring to jump again")을 확인할 수 없음 | `shots/` 74장 중 영어 0장, `qa-round.mjs` 55줄은 로드만 | round-2 QA에 `?lang=en`으로 레벨 선택·튜토리얼 카드 3장·일시정지·설정·클리어를 360x640·640x360에서 찍기 |
| 8 | minor | game-developer | 언어 전환 수단이 URL `?lang=en`뿐(D6). 영어 스토어 사용자는 한국어 화면을 보게 됨 | `main.js` 10줄, `DEV_NOTES.md` D6 | 설정 UI·새 문자열 키 없이 `navigator.language`가 `ko`가 아니면 영어로(쿼리 우선). 설정 UI는 만들지 않음(아이 화면 단순 유지) |

blocker 없음. 원본 보호 위반 없음(게임 이름·레벨명·기믹 이름·문구 모두 자체 제작, 레퍼런스 이름 없음).

## 잘 된 점
- `strings.json`이 10-lore 5절에서 생성되어 문구가 글자 그대로 일치하고 오탈자·치환 오류(`{n}`, `{pct}`, `{ms}`)가 없음. 이 생성 방식 유지.
- 튜토리얼 카드마다 게임 오브젝트와 같은 색·모양 그림이 있고, 레벨 1 손가락 시연과 첫 사망 ↻ 아이콘 덕에 글 없이도 진행됨(`*-notext-*`).
- 레벨 이름·태그·클리어 제목("첫 박이 울렸다" → "시장에 불이 켜졌다" → "노래가 돌아왔다")이 세 레벨 화면 색과 함께 하나의 흐름으로 읽힘.

## 점수
- 영역: 세계관·텍스트
- 체크 항목 통과: 세계관·텍스트 2개 중 1개(10-lore 일치 통과, 잘림·오탈자는 한국어 낱말 중간 줄바꿈과 영어 미확인으로 부분 실패) + 텍스트 관련 공통 항목 2개 통과(글 없이 진행, 원본 보호) → 3 / 4
- 점수: **6.5 / 10** (문구 일치·오탈자 없음·그림 튜토리얼은 탄탄하지만, 요청자 지시인 "5~6세용 짧고 쉬운 문구"를 튜토리얼·사망 문구가 못 지켜 major 1건, 낱말 중간 줄바꿈·템포 문 그림 불일치·영어 미검증 등 minor가 남음)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목:
  - (세계관·텍스트) 플레이 중 문구(튜토리얼·사망·토스트)는 한 문장 12자 이내(영어 6단어 이내), 세계관 고유 용어 대신 화면에 보이는 모양 이름을 씀
  - (세계관·텍스트) 한국어 문구가 낱말 중간에서 줄바꿈되지 않음(`word-break: keep-all`), 지원 언어마다 주요 화면 스크린샷으로 잘림 확인
  - (세계관·텍스트) 튜토리얼 그림이 바로 뒤에 처음 만나는 오브젝트의 실제 색·모양과 같음

VERDICT: REVISE
