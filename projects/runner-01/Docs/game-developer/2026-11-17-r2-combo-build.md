# round-2 콤보 빌드 (콤보·판정 이름·%, art 확정 반영, 소리 지연 대기)

- 날짜: 2026-11-17
- 역할: game-developer
- 프로젝트: runner-01 (slug `reverbound`)
- 단계: round-2 (빌드 마무리)

## 요청 받은 일
오케스트레이터가 round-2 빌드 마무리를 맡겼습니다. 요청자 지시는 세 가지입니다.
- 레벨 10개, 레벨 10 = 기존 곡선 레벨 6 수준, 레벨당 σ70 첫 클리어 30회 이하(밸런스 확정, 바꾸지 않음).
- "디제이맥스의 노트 터치 검사를 벤치마크해서 콤보 시스템", "판정 이름과 퍼센트까지".
- 5~6세 원칙, 원본 보호.

할 일은 다섯 가지입니다.
1. art 확정값 반영(`2026-11-17-r2-art-fixes.md` 체크리스트, `30-art.md`)
2. balance 반영(천장 판정, `practice`, `combo`·`judge_pct`, `judge_taps`)
3. 콤보·판정 구현(20-balance 15-9·15-10-7, `combo-ref.mjs` 그대로, 표시는 30-art 5-8, 문구는 10-lore 5-8·5-9)
4. 소리 지연: 첫 시도 전에 자동 지연이 안정되기를 기다리기
5. 자체 검사

읽은 문서: `harness/insights.md` 전체, `criteria.md`, STATUS, DEV_NOTES. 적용한 insights 항목은 아래와 같습니다.
- DJMAX 4줄
- 콤보 대체 글: 카드 표지를 버튼 밖에 둠
- 판정 기준 구현 검사 조심할 점 3가지: NaN 창, 0.001 ms 반올림, 짝 없는 탭
- UI 시계 = 게임 시간
- outputLatency 안정 대기(rhythm-01)
- 맞닿은 블록 묶음
- 포트·PID 규칙

## 한 일
1. **art 확정값 반영 (임시값 0)**
   - `sync-data.mjs`는 이제 30-art에서 모든 표 값을 읽습니다: 2-1·2-2-1·6절 색, 5-5 카드 대표 오브젝트 표, 2-1 "배경 모양 키" 행. 하나라도 빠지면 멈춥니다. `art.json provisional`은 `{}`입니다.
   - `provisional-art.json`은 지웠습니다. 표가 아닌 부록 B 값(문 3칸·받침 위, 얇은 판 0.20, 막대·4칸마다 줄)은 `data/art-gimmicks.json`에 옮겨 적었습니다. 얇은 판 두께가 balance와 다르면 sync가 멈춥니다.
   - 손으로 고칠 값으로 받은 세 항목은 아래 위치에 들어갔습니다.
     - level7 motifs `arch, drops, arch`: 30-art 표에서 읽습니다.
     - `platform_visual_t` 0.20: `art-gimmicks.json`에 있습니다.
     - `slow_default`: `music.json gates.slow`로 옮겼습니다.
   - `music.json`(7-4 표 전부)
     - level4~10은 `{base, transpose}`이고, level7은 `bass_octave: 1`입니다. `audio.js expandThemes`가 로드 때 펼칩니다.
     - 문 편곡 `gates`: 빠름 = 햇 16분, 느림 = 킥 4분·햇 끔·패드 800 Hz. 하프타임은 폐기했습니다.
     - `sfx.combo_mark`를 추가했습니다.
     - 사망음, `kick_fill`/`bell_bar` 규칙, intensity 0 위치 구분은 이전 빌드에서 이미 반영되어 있었고, 그대로인지 확인했습니다.
   - 그림(`render.js`·`main.js`)
     - 얇은 판: 두께 0.20, 받침 없음, 띠 0.04
     - 낮은 장애물: 심지 0.73(꼭대기 0.52는 balance 값)
     - 위 가시 매달기(B-1): 1칸 = 줄, 2칸 이상 = 칸 윗변 위 막대 + 양 끝·4칸마다 줄
     - 문: 분홍 문만 속도선 4줄 0.3 s(`bgPulse`), 하늘색·상아색 문은 깜빡임만
     - 배경: 물방울 끝 둥글게, 고드름 제거, level10 해는 `bgAccent`
     - 레벨 카드 장면 칸: 아래 1/3, 하늘 60 %·지면 40 %, 오브젝트 clamp(0.2h, 18, 48)·좁은 카드 왼쪽 10 %
     - 레벨 카드 해: `cardTint` 면, 노랑 없음
     - 튜토리얼 그림 5장(`tut_string`·`tut_tempo`·`tut_ring`·`tut_hanging`·`tut_tempo_slow`)을 5-3 좌표로 다시 그렸습니다.
   - 이전 빌드에서 이미 맞던 항목(손가락 시연 5-2, 카드 72 px, 블록 묶음 경로, 클리어 HUD 0.2 s 페이드, 톱니·발판 아이콘, 타이틀 손가락)은 변경 없이 화면으로 다시 확인했습니다.
2. **balance 반영**
   - 천장 판정 0.49×0.24는 `physics.js`가 키를 읽으므로 코드 변경이 없습니다.
   - `practice`는 `balance.json`에서 읽고, `data/practice.json`은 지웠습니다(`practice-check.mjs`도 같이 바꿈).
   - `combo`·`judge_pct`·레벨 `judge_taps`는 sync가 복사하고, 없으면 멈춥니다.
   - 빌드용 `balance.json`은 `_` 설명 키를 뺀 사본입니다. 설명에 레퍼런스 벤치마크 문서 경로가 들어 있어 게임 파일에 레퍼런스 이름이 남았기 때문입니다.
3. **콤보·판정**
   - `js/combo.js` = `combo-ref.mjs` 본문 그대로입니다(바이트 비교 검사).
   - `game.js`에는 누름 번호와 `onTick` 훅만 더했습니다. 생사 흐름은 그대로입니다.
   - 콤보 줄(점 10칸 + 도넛, 튐·모임·종이 조각, 2부터), 판정 이름 + %(뒤쪽 위 고정, 크기·색·점, 0.45 s, 바로 교체, % 숨김 → 왼쪽 → 생략), 사망 0.3 s 소리 없이 사라짐, 10·20 화음 −20 dB(박 + 0.5박), 결과 화면 한 줄(정확도·최고 콤보, 새 기록 밑줄), 진행도 % 숨김, `combo.enabled`/`judge_pct.enabled` false, 움직임 줄이기를 구현했습니다.
   - 문구는 10-lore 5-8·5-9 키를 씁니다. 결과적으로 `practice_*` 4개가 빠지고 `level_locked` 영어가 바뀌었습니다(문자열 102키).
   - 레벨 카드 최고 콤보 표지는 버튼 밖 형제 요소(`role=meter`)로 두었습니다.
   - 테스트 훅에 `combo`·`bestCombo`·`grades`(pct 포함)·`lastPct`·`accuracy`·`bestAccuracy`를 넣었고, 디버그용 `judgeShown`·`latency`도 추가했습니다.
4. **소리 지연**
   - `A.comp()`는 부를 때마다 `outputLatency`를 다시 읽고, 시도 시작마다 호출됩니다.
   - 첫 시도는 오디오 running 뒤 0.25 s 이상 지나고 값이 0.25 s 동안 그대로일 때 시작합니다(최대 1 s).
5. **자체 검사**: 새 도구 `tools/combo-build-check.mjs`를 만들었습니다. DEV_NOTES 12절(D19~D24)을 갱신했습니다.

## 산출물
| 파일 | 내용 |
|---|---|
| `games/reverbound/js/combo.js` (새) | 콤보·판정 % (combo-ref 본문 그대로) |
| `games/reverbound/js/main.js` | 콤보 줄·판정 글·결과 줄·카드 표지·훅·지연 대기, 카드 그림 5장, 해 카드 |
| `games/reverbound/js/game.js` | 누름 번호, `onTick` 훅 |
| `games/reverbound/js/audio.js` | `expandThemes`(base+transpose, bass_octave), 문 편곡 `gates`, `combo_mark` 화음, 지연 안정 대기 |
| `games/reverbound/js/render.js` | 얇은 판, 매달기, 분홍 문 속도선, 물방울·해, 낮은 장애물 심지 |
| `games/reverbound/index.html`, `style.css` | 콤보 줄·결과 줄·카드 칸·장면 칸 CSS, 640×360 클리어 버튼 한 줄 |
| `games/reverbound/data/music.json` | 7-4 반영(레벨 4~10, gates, combo_mark) |
| `games/reverbound/data/art-gimmicks.json` (새) | 30-art 부록 B 본문 확정값 |
| `games/reverbound/data/provisional-art.json`, `practice.json` | 삭제 |
| `games/reverbound/data/*` (생성) | `art.json`(임시값 0), `strings.json`(102키), `balance.json`(설명 키 뺀 사본), `levels/*`(judge_taps), `test-inputs.json` |
| `projects/runner-01/tools/sync-data.mjs` | 30-art 5-5·배경 모양 키 읽기, 빠지면 멈춤, judge_taps 확인, 설명 키 제거 |
| `projects/runner-01/tools/practice-check.mjs` | `bal.practice` 읽기 |
| `projects/runner-01/tools/combo-build-check.mjs` (새) | 빌드 콤보 = combo-ref 확인(S1·B1·B2·U1·U2) |
| `projects/runner-01/reviews/dev-selfcheck/combo-build.json`, `r2c-*.png` | 결과·스크린샷 |
| `projects/runner-01/DEV_NOTES.md` | 1·2절 표, D3, 9절 머리, 12절(D19~D24) |

## 검증 결과
- `node scripts/validate.mjs`: **OK** (4 games, 다른 세션 등록 포함)
- `node projects/runner-01/tools/verify-levels.mjs`: **ALL PASS (10/10)**
- `node projects/runner-01/tools/selfcheck-sim.mjs`: **ALL OK**
- `node projects/runner-01/tools/practice-check.mjs 20`: **ALL OK** (`bal.practice`, 안전 지점·갇힘 0, 음성 대조 405/1562)
- `node projects/runner-01/tools/combo-check.mjs 300 all`: **ALL OK** (P1~P5·B2 0. B1 경고는 기존과 같은 "짝 없이 살아남는 탭", 20-balance 15-10-6)
- `tools/dev-selfcheck.mjs --part replay,practice,layout` (Edge, 8139)
  - 재생 30/30 클리어, 연습 30/30
  - 레이아웃: 4해상도 × 한/영에서 48 px 미만·화면 밖·겹침 0, 카드 잘림 0, 640×360 설정 262/262
  - 일반 모드 오디오 running
  - 콘솔 0, 외부 요청 0
- `tools/dev-selfcheck.mjs --part perf` (6배 스로틀, 2회): 평균 fps 58.6~60.0으로 모두 기준 55를 넘었습니다. 1% low는 실행마다 크게 흔들렸습니다.
  - 1회차: L7 640x360@3 41.7, 1280 31.4 / L4 49.9, 34.5 / L1 재시작 55, 59.5
  - 2회차(콤보 DOM 쓰기를 값이 바뀔 때만 하도록 고친 뒤): L7 18.5, 26.2 / L4 55.1, 59.4 / L1 재시작 22.7, 30
  - 같은 레벨에서도 회차마다 2배 넘게 달라집니다. 공유 PC에 다른 세션 부하가 있었을 수 있지만, 원인은 가리지 못했습니다. 이전 빌드 값(1% low 51~58)보다 낮습니다.
- `tools/combo-build-check.mjs 40` (Edge, 8137): **ALL OK**
  - S1: `combo.js` 본문 = `combo-ref.mjs` 본문
  - B1: 810시도(10레벨 × σ70·σ25 × 40 + 완벽 입력 10), 판정 11,771개. 빌드 ≠ 기준 **0** (클리어 여부·grades의 i·k·e_ms·grade·pct·combo·accuracy)
  - B2: 완벽 입력 10레벨 모두 판정 수 = `judge_taps` 길이, 1등급, 정확도 100
  - U1 (1280×720·640×360·360×640)
    - 콤보 줄 `aria-valuenow` = combo
    - 판정 글이 그려짐
    - 튜토리얼 카드 위 끝 ≥ 줄 아래 끝 + 8 px(71/64/101 px)
    - 결과 화면 정확도 = 훅, 버튼 화면 안
    - 카드 표지가 버튼 밖에 있고 접근성 트리에 meter로 나옴
  - U2: `combo.enabled` false면 표시·결과 줄 없음, 생사·등급·콤보 불일치 0. `judge_pct.enabled` false면 %·정확도 null·판정 글 없음, 불일치 0
  - 콘솔 0, 외부 요청 0
- 판정 글 겹침 처리(레벨 6~10 박자 입력열 전체, 3해상도): 대부분 그려집니다. 고리 레벨에서 생략이 나왔습니다(레벨 6: 18 중 4, 레벨 9: 27 중 3). 고리 탭 판정 순간 플레이어 바로 앞에 다음 고리가 있어 30-art 5-8-2 ③ 규칙대로 생략된 것입니다.
- 사망: 0.15 s 뒤 콤보 줄 opacity 0.49, 0.3 s에 사라짐. combo 0.
- 소리 지연 (일반 모드, Edge headless)
  - 첫 탭 40 ms 뒤 달리기를 눌렀을 때 자동 지연이 10 ms → 74 ms로 바뀌었습니다.
  - 시작을 약 0.3 s 미뤘고, 첫 시도 `runComp` = 74 ms였습니다. 옛 값 10 ms로 시작하지 않았습니다.
- 레퍼런스 이름(DJMAX·디제이맥스·Geometry Dash 등) `games/reverbound/` 안 **0곳**, 외부 URL **0개**(SVG 이름공간 `www.w3.org/2000/svg`만 있고 요청이 아님)
- 못 한 것
  - 귀로 듣기: 화음 크기는 계산만 했습니다. 각 음 1/3 × −20 dB = 피크 ≤ 0.1 × 효과음 볼륨, 킥 피크 1.0 × 음악 볼륨이라 약 −20 dB입니다. OfflineAudioContext 렌더는 하지 않았습니다.
  - 실기기·화면 낭독기 실제 낭독: Chromium 접근성 트리로만 확인했습니다.

## 규칙 준수 확인
- [x] 원본 보호: 레퍼런스 판정 이름·글자 디자인·콤보 숫자 디자인 없음. 판정 이름은 10-lore 자체 문구. 빌드 데이터에서 레퍼런스 문서 경로가 든 설명 키를 뺐습니다(0곳).
- [x] 게임 선정·설계 원칙: 콤보는 보상 층(생사·창·난이도 불변, U2·B1). 판정은 색·크기·점 개수로 글 없이 구분. 끊김은 소리 없이 사라짐. 조작 탭 하나 그대로.
- [x] 결제·광고 클릭·계정 변경 없음. 외부 요청 0.
- [x] 수정 범위: `games/reverbound/`, `projects/runner-01/tools/`(sync-data·practice-check·새 combo-build-check), DEV_NOTES, 이 보고서, Docs/README 한 줄. `balance.json`·`levels/`·`20-balance.md`·`30-art.md`·`10-lore.md`·`00-benchmark.md`·다른 팀 폴더·`games.json`은 고치지 않았습니다. git 안 씀. 서버는 8137·8139만 쓰고 자기 PID만 종료했습니다.

## 문제·남은 일
| 심각도 | 담당 | 내용 |
|---|---|---|
| minor | balance-designer·art-director | 판정 글 표시 시간이 두 문서에서 다릅니다: 30-art 5-8-2는 0.45 s, `balance.json judge_pct.hud`는 80 + 400 + 150 ms. 빌드는 30-art를 따랐습니다(D19). 한 값으로 맞춰 주세요. |
| minor | art-director | 연습 모드 클리어 결과 줄: 30-art 5-8-4는 "이번 시도 값만 보임"이고, 20-balance(`practice_mode` null)와 10-lore 5-9는 "없음"입니다. 빌드는 "없음"을 따랐습니다(D20). |
| minor | art-director | 레벨 카드 최고 콤보 표지 모양(도넛 + 작은 숫자, 장면 칸 오른쪽)은 30-art에 없어 개발이 정했습니다(D22). 640×360에서는 콤보 줄 아래 끝이 HUD 띠 1.2타일보다 약 9 px 아래입니다(D23). |
| minor | art-director | 고리 레벨에서 판정 글 생략이 탭의 15~22 %입니다. 고리 바로 앞에서 판정되기 때문입니다. 자리 규칙(뒤쪽 위)을 고리 탭만 바꿀지 판단해 주세요. |
| major | qa-engineer·game-developer | 6배 스로틀 1% low가 45 fps 기준 아래로 떨어진 회차가 있습니다(L7 18.5~41.7, 회차마다 크게 흔들림). criteria rhythm-01 round-2 줄대로 새 브라우저 3회 이상 + 대조 페이지로 빌드 원인인지 측정 환경인지 가려야 합니다. 빌드 쪽 후보는 판정 글 캔버스 텍스트(stroke + fill)와 콤보 DOM입니다. |
| minor | lore-writer | 화면에 안 쓰는 키: `result_accuracy`·`result_best_combo`·`result_new_best`·`best_accuracy_aria`(D21) |
| minor | qa-engineer | 접근성 트리 확인: Playwright 1.48 `accessibility.snapshot`은 `interestingOnly: true`일 때 meter를 걸러 냅니다. false로 보거나 `ariaSnapshot`(1.49+)을 쓰세요. 화음 오프라인 렌더 크기 확인도 필요합니다. |

## 다른 팀에 줄 인사이트
- 기준 구현(시뮬레이터 정의 파일)을 빌드에 옮길 때, 본문을 그대로 복사하고 "머리 주석 뒤 본문 바이트 같음" 검사를 둡니다. 여기에 같은 봇 입력열을 node 기준과 빌드 훅 양쪽에 넣는 비교(B1)를 함께 두면, 판정·% 불일치를 두 단계에서 잡습니다. 근거: `projects/runner-01/tools/combo-build-check.mjs` S1·B1(810시도 11,771판정 불일치 0). 적용: game-developer·qa-engineer(rhythm-01·02 콤보 포함).
- 빌드 입력은 "누른 채 또 누름"을 새 누름으로 보지 않습니다. 반면 node 실행기는 탭 목록만 보고 매번 새 누름으로 셉니다. 비교 하네스에서는 누름 길이보다 가까운 탭을 빼고 양쪽에 넣어야 가짜 불일치가 없습니다. 근거: 같은 도구 B1. 적용: qa-engineer.
- 기획 JSON의 설명(`_note`)에 레퍼런스 문서 경로가 있으면 빌드 데이터로 그대로 복사되어 게임 파일에 레퍼런스 이름이 남습니다. 빌드 사본은 설명 키를 뺍니다. 근거: `tools/sync-data.mjs` 1) 단계. 적용: game-developer(전 프로젝트 sync 도구).
- outputLatency 안정 대기는 "running 뒤 0.25 s 지남 + 0.25 s 동안 값 그대로, 최대 1 s"로 단순하게 해도 Edge headless의 10 → 74 ms 바뀜을 피했습니다. 근거: DEV_NOTES 12절 "소리 지연". 적용: game-developer(리듬 입력 게임 전반).
