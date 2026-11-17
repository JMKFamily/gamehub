# round-2 아트·사운드 수정: 북채 퇴장, 세로 카드, sound.json·멜로디 동기·소리 크기, 카드 손가락

- 날짜: 2026-11-17
- 역할: art-director
- 프로젝트: rhythm-01
- 단계: round-2 기획 수정 (round-1 게이트 미통과, 시각·사운드 6.0)

## 요청 받은 일
오케스트레이터가 요청했습니다(`Docs/orchestrator/2026-11-17-1-7-round1-gate-and-round2-decisions.md` R1·R6·R7·R10). R1 북채 퇴장 연출 규칙, R6 화면 규칙(세로 카드 크기, 레벨 카드 줄 흐름·최고 진행도, 640x360 타이틀 힌트, 기록 지우기 확인 창, 다시 보기 전용 아이콘, 큰 화면 손가락 비례), R7 `assets/sound.json` 원본·레벨별 2마디 멜로디 동기 10개·`calib_check_hz` 1046.5·소리 크기 규칙, R10 `card_star_tap` 손가락 위치. 요청자 지시: 약한 아트 컨셉, 노랑은 치는 별 전용, 글 없이 이해, 원본 보호(멜로디 자체 작곡), 외부 리소스 금지, git 금지, 스토어 그래픽 금지, 수정 범위는 30-art·assets·본인 보고서·README 한 줄.

## 한 일
1. **R1**: 30-art 5-4 표를 고쳐 북채(+ 점선 궤도·점선 북)가 그 보여 주기 묶음의 마지막 보여 주기 별 + 0.5박부터 0.25박 동안 작아지며 사라지게 했습니다. 같은 0.25박 동안 점선 빈칸이 줄어 실선으로 돌아갑니다. 상한에 걸리면 balance 공식대로 당겨지고, 두 마디 무늬는 묶음 기준입니다. 4-4·5-5·6절에 "손가락은 북채가 다 사라진 뒤에만"과 R2 누름 0.25박 전을 넣었습니다. 1-2 `show_bar_end`는 폐기로 표시했습니다. 수치 키는 balance가 이미 넣은 `teacher` 키를 참조합니다.
2. **R10 + R6 세로 카드**: 카드 5장 모두 칸 아래에 엄지 받침(점선 둥근 네모)을 그리고, 손가락·기다리는 손을 북 위에서 받침 가운데로 옮겼습니다. 카드는 720×300에서 720×336이 됐습니다. 세로 화면용으로 3칸을 세로로 쌓은 `card_<id>_portrait.svg` 5장을 만들었습니다. 이 판은 가로판을 `<use>`로 다시 써서 두 판이 어긋나지 않습니다. 생성·크기 검사 스크립트는 `cards-portrait.mjs`입니다(30-art 9절, 9-1).
3. **R6 화면 규칙**: 레벨 카드를 위→아래 흐름으로 정했습니다(작은 궤도 → 점 → 등급 줄 → 이름, 4 px, 겹침 0). 넘칠 때 줄이는 순서를 정했고, 클리어 전에는 최고 진행도(가는 막대 + 공 색 점)를 보이게 했습니다(5-6). 640x360 타이틀 힌트는 궤도 오른쪽에 둡니다(4-6 신설). 기록 지우기 확인 창은 취소 = 왼쪽·크림 면·왼쪽 화살표·기본 초점, 지우기 = 테두리만 + icon-reset입니다(10-1). 다시 보기 전용 `icon-card.svg`를 만들었습니다. 손가락 칸은 `max(64, 0.45R)`이고 가로 중심은 `(cx + 1.45R, cy + 0.65R)`입니다(4-4). L10 결과 버튼은 2개로 정했습니다(8-2). 목업 8 `mockup-r2-screens.svg`에 다섯 장면을 그렸습니다.
4. **R7 소리**: 1-3 빌드 `data/sound.json`·`music.json` 값을 그대로 옮겨 `assets/sound.json` 원본을 만들었습니다(합성 22종·마스터·파트·레벨 음악·`calib_check_hz: 1046.5` 숫자). 여기에 멜로디 배치 규칙(`music.melody`), 레벨별 2마디 동기 10개(`music.levels.NN.motif`, 자체 작곡), 크기 규칙(`verify.loudness_rule`)과 측정값을 더했습니다. 30-art 12절에 "JSON이 기준"을 적고, 12-7 동기 표를 새로 넣었습니다.
5. **소리 크기**: 빌드 `AudioOut.play`를 Edge 헤드리스 OfflineAudioContext로 렌더해 층 합산 최고값과 첫 100 ms RMS를 쟀습니다. 이 결과로 게인을 고쳤습니다: 둥둥이 −12 → −14, 클리어 −8 → −10, 베이스 −14 → −20(+ 보여 주기 별에도 숙임), 멜로디 −16 → −18, 화음 −22 → −24. 12-4 게인 정의도 "기준 게인 + 렌더 측정으로 순서 판단"으로 바꿨습니다. 검사 도구는 `sound-check.mjs`입니다.

## 산출물
| 파일 | 내용 |
|---|---|
| `assets/sound.json` | 빌드가 읽는 소리·음악 원본 (새로) |
| `assets/sound-check.mjs` | 형식·멜로디 배치 검사, `--render` 크기 측정·규칙 검사, `--write` 측정값 기록 (새로) |
| `assets/cards/card_star_tap.svg` 외 4장 | 엄지 받침 + 손가락 위치 수정, 720×336 (수정) |
| `assets/cards/card_*_portrait.svg` 5장 | 세로 화면 그림 카드 234×896 (새로, 생성물) |
| `assets/cards-portrait.mjs` | 세로판 생성 + `--check` 화면 px 크기 계산 (새로) |
| `assets/icon-card.svg` | 그림 카드 다시 보기 아이콘 (새로) |
| `assets/mockup-r2-screens.svg` | 목업 8: 레벨 카드·640x360 타이틀·확인 창·icon-card·가로 손가락 (새로) |
| `30-art.md` | 머리말, 4-4, 4-6(신설), 5-4, 5-5, 5-6, 5-7, 6, 8-2, 9, 9-1(신설), 10-1, 12 머리, 12-1, 12-3, 12-4, 12-5, 12-7(신설), 14, 15-4(신설) |

## 검증 결과
- `node assets/palette.mjs --check` → `THEMES 10 SHAPE FAIL 0`, `PAIRS 320 FAIL 0`(색 변경 없음).
- `node assets/sound-check.mjs` → 형식 OK. 지금 레벨 데이터 기준 멜로디 음 168개(화음 별도)이고, **별 시각에 시작하는 음은 0개**입니다. 자리를 옮긴 음 17개, 뺀 음 2개(L10)입니다.
- `PLAYWRIGHT_CORE=… node assets/sound-check.mjs --render --write`(설치된 Edge, 서버 없이 page.route) 결과:
  | 규칙 | 값 | 기준 |
  |---|---|---|
  | ① 아이 탭 최고값(T·T1·통과 중 최소) − 다른 효과음 최고값 | −6.58 − (−8.46, 클리어) = **1.89 dB** | ≥ 1 |
  | ② 아이 탭 RMS(최소) − 둥둥이 RMS | −16.36 − (−22.75) = **6.40 dB** | ≥ 6 |
  - 소리별 측정값은 sound.json `peak_db`·`rms_db`와 30-art 12-3 괄호에 있습니다. round 1 값은 ① −0.1 dB(클리어 −6.46이 탭과 같음), ② 4.4 dB였습니다.
  - 노이즈 층이 있는 소리(실패·똑딱·셰이커)는 렌더마다 ±0.5 dB 흔들립니다. 3회 측정 모두 기준을 넘었습니다.
- `node assets/cards-portrait.mjs --check` → 360x640 공 **19.0 px**·별 **23.1 px**, safe 24/24에서 17.5·21.3, 412x915 25.8·31.3, 360x560 16.5·20.0 → 모두 공 ≥ 16·별 ≥ 20. 가로판 640x360(폭 80 %)은 공 19.9 px입니다.
- 카드 가로판 5장과 세로판 5장, 목업 8을 Edge 헤드리스로 렌더해 눈으로 확인했습니다. 세로판은 `<img>`(data URI)로 띄워 빌드와 같은 이미지 경로에서 `<use>`가 그려지는 것을 봤습니다. 손가락과 궤도·별은 겹치지 않고, 노랑은 별·빛살에만 있습니다.
- 빌드 영향 확인(읽기만): 지금 `build-web-data.mjs`의 12-5 표 파서로 수정한 30-art를 읽으면 레벨 10개를 찾고 `calib_check_hz`는 1046.5로 읽힙니다. dev가 sound.json으로 바꾸기 전에 다시 빌드해도 깨지지 않습니다.
- 측정용 서버 `serve.mjs 8133`은 잠깐 띄웠다 종료했습니다(최종 검사는 서버 없이 실행).

## 규칙 준수 확인
- [x] 원본 보호: 멜로디 동기 10개는 자체 작곡입니다(5음 음계·도리안 안에서 순차 진행, 기존 곡·동요·레퍼런스 게임 음악 없음). 아이콘·카드는 기본 도형이고 외부 리소스·폰트가 없습니다.
- [x] 게임 선정·설계 원칙: 기본 도형·단색·평면입니다. 노랑은 별·빛살에만 쓰고(목업 8 이펙트 범위 표시도 trackEdge), 아이 화면에 글이 필요 없습니다.
- [x] 결제·광고 클릭·계정 변경 없음.
- [x] 내 담당 파일(30-art, assets, 본인 보고서, README 한 줄)만 수정했습니다. 빌드·tools·balance·lore·harness·runner-01은 수정하지 않았고, git도 쓰지 않았습니다. 스토어 그래픽은 만들지 않았습니다.

## 문제·남은 일
- **major, game-developer**: 아래 구현이 필요합니다. 빌드는 아직 1-3 상태입니다.
  1. `build-web-data.mjs`: `SOUND` 상수와 30-art 12-5 표 파싱을 지우고 `assets/sound.json`을 읽게 바꿉니다. `data/sound.json` = `{master, noise_buffer_s, sounds, parts}`(필요하면 통째로 복사)이고, `data/music.json` = `music`(`levels.NN`에 `motif` 포함, `calib_check_hz` 숫자, `melody` 규칙)입니다. `calib_check_hz`가 숫자가 아니면 빌드를 멈춥니다. 빌드 전 `node assets/sound-check.mjs`를 실행합니다.
  2. `audio.js buildSong`: `melody_placeholder`·`degree_walk`를 지우고 `music.melody` 규칙으로 동기를 배치합니다(`b % 2` 반쪽, 별 자리면 같은 마디 안 −1 → +1 → 뺌, 악기 = 음 번호 % 악기 수, 길이 = `len` × 8분, 3단계 화음 도수 + 2, outro 도수 0 길이 4). 베이스 숙임은 `parts.bass_duck_on`(play·show)을 따릅니다. 기준 구현은 `sound-check.mjs`의 `placeMelody`입니다.
  3. 북채 퇴장(balance `teacher.mallet_hide_formula`), 점선 → 실선 0.25박 전환, 손가락은 북채가 사라진 뒤에만 나오고 누름은 0.25박 전에 시작합니다.
  4. 세로 화면이면 `cards/card_<id>_portrait.svg`, 가로면 `card_<id>.svg`를 씁니다. 배율 공식은 9-1, 가로판 크기는 720×336입니다.
  5. 레벨 카드 줄 흐름·최고 진행도(5-6), 다시 보기 버튼 `icon-card.svg`(D6 대체), 640x360 타이틀 힌트(4-6), 확인 창(10-1), 손가락 크기·가로 위치(4-4), L10 결과 버튼 2개(8-2).
- **minor, balance-designer**: `balance.json` `teacher.teacher_drum_db`(−12)는 참조값이라 sound.json의 −14와 다릅니다. "소리 값은 art 소유" 원칙대로 −14로 맞추거나 지우기를 요청합니다. `child_tap_db` −6은 같습니다.
- **minor, qa-engineer**: round-2 QA에서 소리 크기는 `node assets/sound-check.mjs --render`로 다시 재 주세요(빌드 audio.js를 그대로 렌더함). 세로 카드는 notext 스크린샷에서 공 px도 재 주세요.
- 참고: balance가 R3로 L4~L10 무늬를 바꾸면 `sound-check.mjs`만 다시 돌리면 됩니다(동기는 규칙으로 별 자리를 피함).
