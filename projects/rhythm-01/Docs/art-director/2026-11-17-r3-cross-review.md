# round-3 1-2 북길 교차 리뷰 (art, 1회 수정)

- 날짜: 2026-11-17
- 역할: art-director
- 프로젝트: rhythm-01 (가안 똑딱북: Tickadrum)
- 단계: round-3 1-2 교차 리뷰 (balance·lore와 병렬)

## 요청 받은 일
오케스트레이터가 R23~R25 결정 뒤 교차 리뷰 1회 수정을 요청: (1) R24 `cards-r3/` 파일 이름 = 키(L1 `card_drum_tap`, L6 `card_run3` 새 그림 "반박 3연속, 붙은 별 셋"), (2) balance 확정 값으로 `layout.json`·`road-layout.mjs --check`·`sound-check.mjs`(starSlotsV3 어댑터를 실제 v3 레벨로)·`sound.json` melody_r3·combo_r3 다시 확인, (3) lore 글 자리와 새 키 문구 길이 대조, (4) 충돌은 자기 문서를 고치고 상대 몫은 보고. 요청자 규칙: 5~6세 단순 규칙, 약한 아트 컨셉, 원본 보호, 외부 리소스 금지, 결제·광고·계정 금지, git 실행 금지(`--version` 포함), 산출물 외 수정 금지, 선작업 금지.

## 한 일
1. `assets/cards-r3.mjs`: L1 카드 id `card_star_tap` → `card_drum_tap`, L6 `card_two_bar`(가정 그림) → **`card_run3`**(① 붙은 별 셋이 다가옴 ② 첫 별 톡 ③ 셋째 별 딱 + 톡, 뒤 길 비움). 키에 없는 이름 파일은 실행 때 지우게 함. 재생성 → `cards-r3/` 가로 5 + 세로 5(`card_drum_tap`·`card_half_star`·`card_rest_beat`·`card_run3`·`card_run4`). Edge 헤드리스로 `card_run3` 가로·세로판 렌더해 눈으로 확인.
2. `assets/road-layout.mjs`: 미리 보기 박을 가정 대신 v3 레벨 `path.preview_lead_beats(_portrait)`에서 읽고 `balance.json preview.lead_beats` 거울 값과 대조. BPM·판정 창도 10레벨 모두 레벨 파일에서. 레벨 데이터 검사 추가(별 목록 `bars`/`patterns` = `path.chunks` 재계산, 최소 간격 L1 1박·L2~ 0.5박, 정박 없이 시작하는 반박 0, 세로 = min(가로, 3.5), 첫 별 = 시도 시작 + 6박 ≥ 미리 보기, 연습 부활 → 다음 별 ≥ 미리 보기). `per_level.beat_px` 추가, `--md`에 1박 px 표. 글 자리 키 `tut_tap` → `tut_drum_tap` + 측정값 기록. `layout.json` 다시 씀(화면 값 변화 0, 출처 표시만 "가정" → "v3 원본").
3. `assets/sound-check.mjs`: `starSlotsV3`를 balance 확정 형식(`bars[{mode, pattern}]` + `patterns`)에 맞춤(rest 건너뜀, 무늬 없으면 FAIL). **outro 마디를 동기 배치에서 뺌** — v3 `sections`의 outro가 stage 3을 가져서 기존 어댑터가 outro 2마디에 동기를 놓고 있었음(규칙 ①과 어긋남). outro 안 판정 별 검사 추가.
4. `sound.json` melody_r3·combo_r3를 balance `combo`와 대조 — 바꿀 것 없음.
5. 글 자리 대조: Edge 캔버스 `measureText`(빌드 글꼴 목록)로 `tut_drum_tap` ko 117.3 px / en 208.6 px(14 px 굵게) → 폭 220 안 1줄. 카드 키는 aria 전용이라 12자/6단어만 확인.
6. `30-art.md` 16절: 머리말(가정 → 확정), 16-1 글 자리 이름·측정, 4해상도 표 출처, 16-4 콤보(대안 줄 "쓰지 않음", 확정 값), 16-5 카드 표·이름 규칙·L6 그림, 16-7 sound-check·콤보 화음 문장, 16-10 상태, 16-11 에셋 표, **16-12 교차 리뷰 반영** 신설.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-01/30-art.md` | 16절 수정 + 16-12 신설 |
| `projects/rhythm-01/assets/cards-r3.mjs` | 키 이름 카드 id, `card_run3` 그림, 옛 이름 파일 지움 |
| `projects/rhythm-01/assets/cards-r3/*.svg` | 10장(옛 `card_star_tap*`·`card_two_bar*` 4장 없앰, `card_drum_tap*`·`card_run3*` 4장 새로) |
| `projects/rhythm-01/assets/road-layout.mjs` · `layout.json` | v3 레벨 직접 읽기, 레벨 데이터 검사, 1박 px, `tut_drum_tap` |
| `projects/rhythm-01/assets/sound-check.mjs` | 확정 형식 어댑터, outro 제외 |
| `projects/rhythm-01/Docs/art-director/2026-11-17-r3-cross-review.md` | 이 보고서 |
| `projects/rhythm-01/Docs/README.md` | 맨 위 한 줄 |

(`mockup-r3-road.svg`는 다시 생성해 봤으나 바이트 단위로 같음. `sound.json`·`palette.json`은 바꾸지 않음.)

## 검증 결과
- `node assets/palette.mjs --check` 종료 0.
- `node assets/sound-check.mjs` 종료 0: 10레벨 v3(별 18/22/25/24/27/27/25/26/28/28), 동기 252음(outro 제외 전 314), **별 시각에 시작 0**, outro 안 판정 별 0, 콤보 화음 19자리 별과 겹침 0(반박으로 밀린 곳 L2 20단계 하나).
- `node assets/cards-portrait.mjs --dir cards-r3 --check` 종료 0(4화면, 360x640 보이는 면 공 20.6·별 19.1 ≥ 18).
- `node assets/road-layout.mjs --check` 종료 0: 8화면 기존 검사 + 10레벨 데이터 검사 PASS(chunks = bars 10/10, L1 최소 1박, 첫 별 = 시도 시작 + 6박, 연습 부활 → 다음 별 최소 6박(L7 7박), 거울 값 일치).
- 1박 px 4해상도 × 10레벨 = balance 17-8 표와 모두 같음(360x640 72.0/82.3/96.0, 412x915 82.4/94.2/109.9, 640x360 112/128/149.3, 1280x720 224/256/298.7).
- `cards-r3/*.svg` 외부 href·url() 0.
- 렌더 확인: Edge 헤드리스 `--screenshot`(file://, 서버 없음)으로 `card_run3` 가로·세로판.

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 이름·캐릭터·아트·음악·레벨 배치 없음) — 카드는 기본 도형·단색, 외부 리소스 0
- [x] 게임 선정·설계 원칙 (5~6세 단순 규칙, 약한 아트 컨셉)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정, git 커밋·푸시 안 함 — **git은 이번 작업에서 한 번도 실행하지 않음**(`--version` 포함). 서버 띄우지 않음. 빌드 `games/`·balance·levels·10-lore·00-benchmark·harness·games.json·다른 프로젝트 미수정(읽기만).

## 문제·남은 일
- **minor (balance)**: R24 키 이름이 아직 옛 값 — `balance.json cards.keys["01"]`·`levels/01 card.id`·`path_v3.gimmicks.quarter_star.card` = `card_star_tap` → `card_drum_tap`, `tutorial_cue.key`·`levels/01 cues[0].key` = `tut_tap` → `tut_drum_tap`. `cards.asset_path` = `assets/cards/card_<id>.svg` → `assets/cards-r3/card_<id>.svg`(세로판 `_portrait`). (L6 `card_run3`은 이미 맞음.)
- **minor (lore)**: `10-lore.md` R3-6 첫 줄 "판정 북 **위에** 손가락" → "판정 북 **아래**"(R3-7 표·art 16-1과 같게).
- **정보 (dev, 새 코어 구현 때)**: 멜로디 v3는 outro 마디(`sections` name `outro`)를 동기 배치에서 뺄 것(sound-check와 같은 규칙). 카드 경로 `cards-r3/<키>.svg`.
- **minor (art)**: 세로판 카드의 붙은 별(반박 42 × 1.2배 별)이 약 1 px 틈으로 거의 맞닿음(`card_half_star`·`card_run3`·`card_run4`, 1-3부터 같은 성질). 리뷰에서 지적되면 세로판 별 배율 1.2 → 1.1(보이는 면 18 px 재확인).
- 정보: balance가 R25로 숨 고르기를 늘려도 `road-layout.mjs --check`·`sound-check.mjs`를 다시 돌리면 됨(레벨 파일을 실행 때 읽음).

## 다른 팀에 줄 인사이트
- 레벨 원본(덩어리 목록)과 빌드가 읽는 파생 키(마디·무늬)가 따로 있으면, art·sound 검사기는 파생 키를 읽되 원본에서 한 번 더 계산해 같은지 확인한다. 이번엔 같았지만 이 대조 없이는 "검사 통과 = 원본 통과"를 말할 수 없다. 근거: `projects/rhythm-01/assets/road-layout.mjs` 레벨 데이터 검사. 적용: art-director·qa-engineer
- 스키마가 바뀌면 "어떤 마디가 곡의 어느 부분인지" 판정 기준도 바뀐다: v3에서 outro가 진행 단계 값을 갖게 되자, 단계만 보던 멜로디 배치가 outro에도 음을 놓았다(형식 검사는 통과, 별 겹침도 0이라 드러나지 않음). 이름(outro)·모드로 구간을 가르는 검사를 둔다. 근거: `projects/rhythm-01/assets/sound-check.mjs placeMelodyV3`. 적용: art-director·game-developer
- 화면 글 폭은 글자 수 추정 대신 빌드 글꼴 목록으로 헤드리스 브라우저 캔버스 `measureText`를 재면 서버 없이 몇 초에 끝난다(영어가 한국어보다 1.8배 넓었음). 적용: art-director·lore-writer
