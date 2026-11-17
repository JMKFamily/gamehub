# round-3 1-2 북길 교차 리뷰 (balance)

- 날짜: 2026-11-17
- 역할: balance-designer
- 프로젝트: rhythm-01 (가안 똑딱북: Tickadrum)
- 단계: round-3 1-2 교차 리뷰 (balance·art·lore 병렬, 1회 수정)

## 요청 받은 일
오케스트레이터 결정 R23~R25에 따라 (1) 보호자 보정 무시 구간 30 → 10 ms와 측정 잡음 봇 INFO, (2) L1 `tut_drum_tap`·`card_drum_tap`, L6 `card_run3` 키 통일, (3) 레벨 길이 30~45 s를 숨 고르기로 맞추기(N1~N11·B6·B7 유지), (4) art·lore와 값 충돌 정리, (5) 전체 검증 실행. 요청자 규칙: 5~6세 단순 규칙, 원본 보호, 결제·광고·계정 금지, git 실행 금지(`--version` 포함), 산출물 외 수정 금지, judge·calib 변경 금지.

## 한 일
1. **R23**: `guardian_calibration.apply_only_if_abs_over_ms` 10(옛 30은 `_r2_deprecated`), 경계값 시나리오 ±10(옛 ±30 보존). 새 정보 **R23** 출력: 어른 σ40, 2회 × 8탭(12탭 사용) 잡음을 넣고 기기 남은 오차 d를 −30~+30으로 고정했을 때, 무시 구간 30 / 10별 남은 오차와 L7~L10 σ70 첫 클리어를 냄.
   - 10 ms는 |d| ≤ 10일 때 오차를 키움(d 0: 평균 |r| 1.0 → 8.2 ms, L10 22 → 23회). 하지만 d가 어디 있든 **L7~L10 최대 25회 ≤ 30**. 30 ms는 d −20~−30에서 **L10 37~38회**로 한도를 넘음 → R23 (a)를 그대로 받아들임.
2. **R24**: `cards.keys.01`·`levels/01 card.id`·`gimmicks.quarter_star.card` = `card_drum_tap`, `tutorial_cue.key`·`levels/01 cues[0].key` = `tut_drum_tap`(옛 값 `*_r3a_deprecated`), L6 `card_run3` 그대로. `cards.asset_path` → `assets/cards-r3/`. 검증기 T1 출력의 키 이름은 데이터에서 읽게 함.
3. **R25**: 빈 2~3박 숨 고르기만 늘리는 조합을 모두 찾아 N1~N11을 통과하고 m̃가 1-1 값에 가장 가까운 것을 고름. L1·L2·L4·L8·L9·L10은 숨 고르기만 늘림. **L7은 숨 고르기만으로는 최대 29.5 s라 끝에 별 하나짜리 덩어리 A를 빈 4박 뒤에 더함(25 → 26별)**. 이제 길이 30.0~34.0 s. 새 검사 **S17**(30~45 s). 옛 덩어리 열은 `path.chunks_r3a_deprecated`에 둠.
4. **값 대조**: combo `display.where`를 art 16-4 HUD 띠로, 5단계 소리를 none으로, 30단계 fx를 색 조각 포함으로, 단계 소리 예약을 art `sound.json music.combo_r3`로 맞춤(옛 값 보존). 그 밖에 1박 px·미리 보기 박·통과 창·콤보 정의·끊김·재시작은 art·lore와 같음.
5. `20-balance.md` 17-13 추가. 17-0·17-4·17-8 표의 값을 새로 바꾸고 17-12 위험 1·2·5를 닫음.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-01/20-balance.md` | 17-13(R23 표·R24 키·R25 길이 표·대조·남은 위험 6·7), 17-0/17-4/17-8 갱신 |
| `projects/rhythm-01/balance.json` | R23 10 ms·경계 ±10·`verify.r23_calibration_noise`, R24 키·asset_path, combo 4곳, `verify.level_length_s` (옛 값 모두 `*_deprecated`) |
| `projects/rhythm-01/levels/01,02,04,07,08,09,10-*.json` | 숨 고르기 늘림(L7 A 하나 더함), 파생 키 다시 씀, L1 카드·손가락 키 |
| `projects/rhythm-01/tools/verify-levels.mjs` | 정보 R23, 검사 S17, T1 키 이름은 데이터에서 읽음 |
| `projects/rhythm-01/Docs/README.md` | 맨 위 한 줄 |

`tools/sim/bots.mjs`·`path.mjs`·`judge.mjs`·`calib.mjs`는 고치지 않음.

## 검증 결과
- `node projects/rhythm-01/tools/verify-levels.mjs`(전체, `--quick` 아님): **종료 0, FAIL 0, ALL PASS**(PASS 297줄).
- B6: r 1.5271, T 23.19, 범위 18.55~27.83 → L10 20.99(−9.5 %). B6s 시드 10개 −13.8 ~ −7.6 %. B7 6.513 < 7.269 < 9.143 < 10.038 < 11.427 < 13.083 < 15.268 < 20.99. B1: L1 3회 ≤ 5, L7 12회 ≤ 20, 모든 레벨 ≤ 30. N1~N11 10레벨 모두 PASS. S17 30.0~34.0 s.
- `node tools/sim/path.mjs`: 10레벨 파생 키 = path.chunks.

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 레벨 배치를 쓰지 않음, 배치는 N1~N11 탐색으로 새로 만듦)
- [x] 게임 선정·설계 원칙 (새 기믹·조작 추가 없음, 숨 고르기만 늘림)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정. **git은 한 번도 실행하지 않음**(`--version` 포함). 서버를 띄우지 않음. 빌드 `games/`·build-web-data·selfcheck·30-art·assets·10-lore·harness·다른 프로젝트는 읽기만 함. 탐색 스크립트는 스크래치 폴더에만 둠.

## 문제·남은 일
- **minor (art)**: R25로 L1·L2·L4·L7~L10 별 자리가 바뀜 → `assets/road-layout.mjs --check`·`sound-check.mjs`(멜로디 v3·콤보 화음 자리)를 다시 돌려 기록해야 함. 파일 이름·`layout.json` 출처·`tut_drum_tap` 글 자리는 art 1-2에서 이미 고쳐서 확인함.
- **minor (lore)**: `10-lore.md` R3-4 L10 "1~9의 묶음이 **모두** 찾아오고 끝은 쉽게 닫음"이 데이터와 다름. L10은 11모양 중 8개(C·W·Y 없음)를 쓰고 마지막 덩어리가 3연속 Z임. R3-1 "북 옆에 칭찬 표시" ↔ art 콤보 자리 HUD 띠, R3-5 "별이 북에서 터짐" ↔ art 16-3 "길과 함께 흐름", R3-6 손가락 "북 위에" ↔ art "북 바로 아래"(art가 이미 요청함). 모두 낱말 수준.
- **minor (qa)**: `tools/qa-round.mjs` N17이 `card_star_tap.svg`를 읽음 → 새 코어에서는 `card_drum_tap`.
- **minor (dev)**: 새 코어 작업 때 build-web-data를 다시 돌리면 키 2개, `asset_path`, 보정 10 ms가 함께 들어감. `js/calib.js`는 키를 읽으므로 코드 변경은 없음.
- **minor (balance, 위험 6)**: 숨 고르기가 길어져 L7·L10은 빈 박이 거의 다 4박임 → "짧은 순간 판단" 몰입이 약해질 수 있음. 리뷰에서 지적이 나오면 길이 기준이나 별 수를 다시 봄.
- **minor (balance, 위험 7)**: 10 ms 하한은 오차가 거의 없는 기기에서 평균 8 ms 오차를 만듦(L10 +1회).

## 다른 팀에 줄 인사이트
- 보정 "작으면 무시" 구간은 경계값만 볼 것이 아니라, 측정 잡음을 넣고 실제 남은 오차 d를 여러 값으로 고정해 "무시 구간이 오차를 키우는 비율"과 "한도 초과"를 함께 표로 봅니다. 잡음 σ(여기서는 12탭 중앙값 ±14.5 ms)보다 작은 하한은 오차를 조금 키우지만 최악을 잡음 크기로 묶어 줍니다. 근거: 20-balance 17-13-1, 검증기 정보 R23. 적용: balance-designer, qa-engineer(보정이 있는 리듬 입력 게임).
- 레벨 길이를 맞추려고 쉼을 늘리면 마디 경계가 밀려 "마디 내용"이 바뀌고, 처음 보는 무늬 비용 같은 봇 곡선 값도 바뀝니다(L1 쉼 +1박만으로 m̃ 2.82 → 2.59). 쉼 조합을 모두 탐색해 반복 규칙과 m̃ 차이로 고르면 곡선을 유지할 수 있습니다. 근거: 20-balance 17-13-3. 적용: balance-designer.
