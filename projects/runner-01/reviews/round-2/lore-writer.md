# 리뷰: lore-writer · round 2

## 확인한 것
- 규칙: `harness/criteria.md` 세계관·텍스트 절(9줄), 대상 연령 절(결정 14: runner-01은 12세, 12세 어휘 허용), 게임 감각 절의 "판정 이름과 퍼센트 표시"·"파격적인 콤보 연출" 줄, 원본 보호 절. `harness/insights.md`(텍스트·콤보 대체 글·원본 보호 번역어 줄), `harness/templates/review.md`, `projects/runner-01/STATUS.md`
- 빌드: `games/reverbound/`(커밋 2987470). `data/strings.json` 102키 + 사망 4 + 클리어 부제 4, `index.html`, `js/main.js`(`t()`, `fillStaticText`, `renderCards`, `renderSettings`, `showClearScreen`, `cueIcon`, 로드 실패 경로), `data/levels/*.json`의 `name`·`name_en`·`name_key`·`cues`
- 대조 원본: `projects/runner-01/10-lore.md` 확정값 표, 4절, 5-1~5-9절. `DEV_NOTES.md` D21(화면에 안 쓰는 키 4개)
- QA: `reviews/round-2/qa.md`(접근성 트리 요약, 원본 보호 grep 목록, 이슈 6·7), `parts/a11y.json`·`grep-origin.json`은 qa.md 요약으로 확인
- 스크린샷 직접 확인: `en-360x640-02-levels`, `ko-640x360-03-play-level07`, `en-360x640-03-play-level07`, `ko-360x640-03-play-level02`(판정 이름 "딱이야 / 100%"), `en-360x640-06-clear-screen`, `ko-640x360-06b-clear-screen-last-level`, `en-640x360-07-pause`, `en-360x640-08-settings`, `640x360-rt-level1-1.2s-cue`, `ko-360x640-title-normal-first`, `en-412x915-title-normal-first`
- 자기 round-1 리뷰(`reviews/round-1/lore-writer.md`) 이슈 8건 회귀 확인
- 직접 검사: strings 키 ↔ 빌드 사용(정적 문자열 + 동적 키 `levelN_name`·`levelN_tag`·`clear_title_lN`·`judge_name_N`), 레벨 JSON 이름·cue ↔ 10-lore 표, 원본 보호 낱말 grep(Geometry/RobTop/지오메트리, DJMAX/디제이맥스/디맥/네오위즈/펜타비전, MAX COMBO, COMBO/콤보, BREAK, PERFECT/퍼펙트, FEVER/피버) → 화면 문구·데이터 0곳(코드 식별자·주석의 `combo`만)

## round-1 이슈 회귀
| round-1 | 내용 | 이번 |
|---|---|---|
| 1 major | 튜토리얼·사망 문구가 길고 세계관 용어 | 해결: 플레이 중 문구 전부 한 문장 12자 / 6단어 이내, 화면 모양 이름(가시·상자·발판·얇은 판·분홍 문·고리·위 가시·하늘색 문). 사망 토스트 없음 |
| 2 minor | 한국어 낱말 중간 줄바꿈 | 해결: `style.css` 12줄 `word-break: keep-all`. "옆으로 돌리면 / 더 넓어요", "노래가 돌아왔어요!" 등 낱말 단위 |
| 3 minor | `tut_tempo` 그림 ≠ 첫 문 | 해결: L5 첫 문 = 분홍 문(꺾쇠 3), L8 `tut_tempo_slow` = 하늘색 문(꺾쇠 1). `cueIcon`이 `gateFast`/`gateSlow`로 그림 |
| 4 minor | 10-lore에 안 쓰는 키·박 위치 | 해결: 표시 박은 `levels/*.json cues`를 그대로 따름(L1 0·4, L2 20, L3 21, L4 22, L5 21, L6 24, L7 23, L8 30 = 10-lore 5-6 표) |
| 5 minor | 10-lore 시각 힌트 낡음 | 해결: 4절 공통 시각 힌트가 30-art와 같음 |
| 6 minor | 연습 토글 "켜기/끄기 · 끄기" | 해결: "Practice [Off]" 깃발 + 토글 모양(`en-640x360-07-pause`) |
| 7 minor | 영어 스크린샷 없음 | 해결: en 80장(4해상도 × 20화면). 다만 튜토리얼 카드가 뜬 en 화면은 없음 → 이슈 6 |
| 8 minor | 언어 전환 `?lang=`뿐 | 해결: `navigator.language` 자동(qa `basic.lang_auto` ko-KR → ko, en-US → en) |

## 이슈
| # | 심각도 | 담당 역할 | 내용 | 근거 | 제안 |
|---|---|---|---|---|---|
| 1 | minor | lore-writer · game-developer | **클리어 시도 1회일 때 문구가 어색함**: "1번 만에 성공!" / "Done in 1 tries!"(영어는 문법 오류). 12세 대표 봇 σ50은 L1 첫 시도 클리어율 78 %라 이 문장이 가장 자주 보이는 클리어 문구가 됨 | `strings.json clear_attempts`, `main.js` 550줄 `t('clear_attempts', { n: G.attempts })`(단수 분기 없음), `qa.md` σ50 표 | round-3에 10-lore 5-5절에 `clear_attempts_one` 추가: KR **"한 번에 성공!"** / EN **"First try!"**. 빌드는 `attempts === 1`이면 이 키 |
| 2 | minor | game-developer · lore-writer | **10-lore에 없는 하드코딩 대체 글 6곳**: 영어 고정 aria-label `pauseBtn "pause"`, 뒤로 `"back"`(2곳), 허브 `"hub"`, 캔버스 `"game"`(qa 이슈 7의 4곳) + **회전 안내 닫기 `"close"`**(qa 목록에 없음). 그리고 음악 끄기 버튼 `bMute`의 이름이 "켜짐"/"꺼짐"뿐이라 무엇을 켜고 끄는지 안 들림(라벨 `lMusic`은 슬라이더에 붙음) | `index.html` 12·21·32·47·54·104줄, `main.js` 403줄, `qa.md` 이슈 7·접근성 트리 요약 | round-3에 10-lore 5-7절(시스템)에 대체 글 키 추가를 제안: `aria_pause` 잠깐 멈춤 / Pause, `aria_back` 뒤로 / Back, `aria_hub` 게임 목록 / All games, `aria_game` 게임 화면 / Game screen, `aria_close` 닫기 / Close, `aria_music_mute` 음악 소리 / Music sound(값은 `aria-pressed`로, 이름에 켜짐·꺼짐을 붙이지 않음). 빌드는 `fillStaticText`에서 `t()`로 채움 |
| 3 | minor | game-developer | **숨긴 콤보 줄 aria-hidden + aria-label 1곳**(qa 이슈 6). criteria 세계관 절 "aria-hidden 요소에 aria-label을 붙이지 않음" 글자 그대로 위반. 숨김 설계(0~1 콤보는 안 읽음)는 10-lore 5-8대로 맞음 | `index.html` 19줄, `main.js` 268줄, `parts/a11y.json aria_hidden_with_label` | 숨길 때 `hidden` 속성(또는 `display:none`)만 쓰고 aria-label은 보일 때 붙임. round-3 콤보 연출 교체 때 새 중앙 숫자에도 같은 규칙 |
| 4 | minor | game-developer | **부트 단계 언어**: `<html lang="ko">`가 고정이고 `fillStaticText`(235줄)에서야 바뀜. en 기기에서 불러오기·로드 실패 화면은 lang ko. strings.json 자체가 실패하면 한국어 기기에서도 "Load error" 영어가 뜸. ↻ 버튼은 인라인이라 글 없이 다시 할 수 있음(통과) | `index.html` 2·29줄, `main.js` 183줄 | 부트 인라인 스크립트에서 `navigator.language`로 `lang`과 "…"/"Load error" 대체 문구(`못 불러왔어요` / `Couldn't load`)를 먼저 정함(criteria 세계관 절 rhythm-02 줄) |
| 5 | minor | game-developer | **타이틀 보조 이름에 언어 표시 없음**: en 화면에서 "잔향 질주"(`titleAlt`)가 lang 표시 없이 나와 영어 낭독기가 한글을 영어 음성으로 읽음(ko 화면의 "Reverbound"도 반대) | `main.js` 237줄, `en-412x915-title-normal-first.png` | `titleAlt`에 `lang` 속성(en 화면이면 `ko`, ko 화면이면 `en`). 두 이름을 함께 보이는 것 자체는 확정값(한국어 부제)과 맞아 유지 |
| 6 | minor | qa-engineer | **튜토리얼 카드가 뜬 영어 화면이 없음**: en 스크린샷 80장은 모두 진행 35 % 시점이라 카드가 안 보임. 가장 긴 영어 카드 "Top spike? Wait, don't tap"(5단어)·"Hop onto thin ledges"가 360x640에서 한 줄·두 줄 안에 드는지 확인 못 함 | `shots/en-*-03-play-level0{4,7}.png`, 실시간 cue 화면은 ko 레벨 1만 | round-3 QA에 레벨 1·4·7의 cue 박 직후 화면을 ko·en × 360x640·640x360으로 찍기 |
| 7 | minor | lore-writer · game-developer | **선택 키 `tut_final`이 빌드에 안 쓰이는데 DEV_NOTES에 이유 없음**(criteria 세계관 절 R8 줄: 안 쓰는 키는 DEV_NOTES에 이유). D21은 다른 4키만 다룸. 10-lore 5-6은 "기본은 넣지 않음"이라 화면은 맞음 | `strings.json tut_final`, `DEV_NOTES.md` D21, `10-lore.md` 5-6 선택 키 | DEV_NOTES D21에 `tut_final`(10-lore 5-6 "기본 넣지 않음") 한 줄 추가. D21 4키(`result_accuracy`·`result_best_combo`·`result_new_best`·`best_accuracy_aria`)는 근거가 있어 이 리뷰에서 문제 삼지 않음 |
| 8 | minor | lore-writer | **10-lore의 대상 연령 근거가 5~6세 기준으로 남음**: "정확도는 5~6세에게 어려워", "콤보는 아이에게 낯설어", "5~6세가 그림으로 그릴 수 있는 낱말" 등. 화면 문구는 12세에게도 쉬워 위반은 아니지만, 결정 14 뒤 문서 근거가 낡음. 12세 기준에서 벗어난 화면 문구는 없음(어휘가 더 쉬운 쪽이라 허용 범위) | `10-lore.md` 2절, 4절 레벨 이름 체계, 5-8·5-9 비고 | round-3 lore 작성 때 근거 문장을 "12세(결정 14), 글 없는 진행은 유지"로 고치고, 12세에게 유치하게 들릴 수 있는 칭찬 반복("다 깼어요! 최고예요!")만 가볍게 다듬음(필수 아님). 화면 문구 키는 바꾸지 않아도 됨 |
| 9 | minor | art-director · game-developer | 세로 타이틀에서 "눌러서 시작"/"Tap to start" 아래가 바닥선에 걸치고, "누르면 소리가 나요"/"Tap for sound"는 밝은 바닥 띠(황갈색) 위 흰 글이라 대비가 낮음 | `ko-360x640-title-normal-first.png`, `en-412x915-title-normal-first.png` | 시작 문구 묶음을 바닥선 위로 올리거나 `audio_unlock`에 어두운 받침을 둠 |

blocker 없음, major 없음.

### 원본 보호
- 통과. 게임 이름(Reverbound / 잔향 질주), 레벨 10개 이름, 기믹 화면 이름·세계관 이름, 판정 이름(딱이야·좋아·됐다 / Wow!·Nice!·OK!), 결과 화면 문구가 모두 자체 제작. 판정 이름과 %는 두 줄로 따로 쓰고(이름 위, % 아래 작게, `ko-360x640-03-play-level02.png`), "이름 + 숫자%" 한 덩어리 표기·영어 대문자 판정 이름·COMBO 글자가 없음.
- QA grep(영문 + 공식 한국어 번역어: 지오메트리 대시·로브탑·스테레오 매드니스·폴라가이스트·비밀 코인·디제이맥스·디맥·네오위즈 등) 0히트를 확인했고, 내가 추가로 돌린 grep(COMBO/콤보, PERFECT/퍼펙트, FEVER/피버, BREAK)도 화면 문구·데이터 0곳.

### round-3 제안: 콤보 라벨 문구 (파격적인 콤보 연출, criteria 게임 감각 줄)
새 연출은 위쪽 중앙 큰 숫자 + 작은 "COMBO류 라벨"이 필요하지만 지금 10-lore에는 화면용 콤보 라벨이 없습니다(5-2절 "콤보는 화면에 글·숫자를 더하지 않음"은 옛 점 10칸 설계 기준). round-3 lore 작업으로 아래를 제안합니다. DJMAX 화면 문구 "COMBO"(영어 대문자)와 그 한국어 음역 "콤보"는 원작 화면 글자와 같아지므로 라벨로 쓰지 않습니다.

| 키(제안) | 붙는 곳 | KR | EN | 이유 |
|---|---|---|---|---|
| `combo_label` | 큰 숫자 아래(또는 오른쪽) 작은 라벨 | **연속** | **in a row** | 숫자와 이어 읽으면 "18 연속" / "18 in a row"로 문장이 됨. 12세가 아는 말, 원작 표기와 다름. 소문자·일반 글꼴로 두어 원작 글자 디자인과 겹치지 않음 |
| `combo_aria` (고침) | 중앙 콤보 숫자 meter | 연속 성공 | Jump streak | 12세 기준으로 "이어서 잘 뛴 수"보다 짧게. 값은 지금처럼 `aria-valuenow`·`aria-valuetext` 숫자만 |

- 대안(라벨이 한 글자 더 짧아야 할 때): KR "연속!" / EN "Streak". 영어 대문자 단어 한 개("STREAK" 등)로 쓰지는 않습니다(원작 COMBO 배치와 너무 닮음).
- 단계(10·25·50·100) 연출에는 글을 더하지 않고, `combo_mark_aria`는 그대로 씁니다. 끊김에는 글·낭독 없음(5-8 유지).

## 잘 된 점
- `strings.json`이 10-lore 5절과 102키 모두 글자 그대로 일치하고, 레벨 JSON 이름·영문 이름·cue 키·박 위치도 10-lore 표와 같음. 생성(`sync-data`) 방식 유지.
- 플레이 중 문구 전부 12자 / 6단어 한도 안, 화면 모양 이름 사용. 판정 이름은 칭찬 말만, 실패 이름·빨간 글 없음.
- 결과 화면이 그림표(점 아이콘 + 정확도, 도넛 + 최고 콤보) 위주이고 대체 글이 접근성 트리에 "박자를 맞힌 정도"·"가장 많이 이어서 잘 뛴 수" + 값으로 나옴(qa 접근성 트리). 레벨 카드 최고 콤보 meter가 버튼 밖 형제라 실제로 읽힘.
- 레벨 이름 → 클리어 제목 → `clear_all` 흐름("새벽이 밝았어요!" … "노래가 돌아왔어요!")이 10레벨에 이어짐.

## 점수
- 영역: 세계관·텍스트
- 체크 항목 통과: 세계관·텍스트 절 8개 적용(tcg 줄 제외) 중 완전 통과 3(12자 한도, keep-all·언어별 스크린샷, 튜토리얼 그림 일치), 부분 통과 5(10-lore 일치: 하드코딩 aria 6곳 / 오탈자: "1 tries" / 키 사용: `tut_final` 이유 누락 / 부트 단계: lang 고정 / 접근성 트리: 이름·결과는 나오나 aria-hidden 라벨 1곳) + 공통 3(원본 보호, 글 없이 진행, 12세 어휘) 통과 → 6 / 11 완전 통과, 나머지 5개 부분 통과(실패 0)
- 점수: **7.5 / 10** (round-1 major·minor 8건 모두 해결, 문구 일치·길이·원본 보호 탄탄. 남은 것은 단수 문구·하드코딩 대체 글·부트 lang 같은 minor 9건이고, 콤보 라벨 문구는 round-3 범위라 감점하지 않음)
- 이번 라운드에 criteria.md에 추가를 제안하는 체크 항목:
  - (세계관·텍스트) 숫자가 들어가는 문구(`{n}`)는 1일 때 문장을 따로 확인함(영어 단수형, 한국어 "한 번에"). 대표 봇이 가장 자주 내는 값(예: 첫 시도 클리어)의 화면을 언어마다 스크린샷으로 봄
  - (세계관·텍스트) 화면에 보이지 않는 대체 글(aria-label·title)도 모두 텍스트 원본 키에서 오고, 지원 언어마다 바뀜(하드코딩 0곳). 토글 버튼 이름은 대상만, 상태는 `aria-pressed`로

VERDICT: PASS
