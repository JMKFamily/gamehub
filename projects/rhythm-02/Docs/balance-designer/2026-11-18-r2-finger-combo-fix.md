# r2 손가락 누름 시작·콤보 S10 고침

- 날짜: 2026-11-18
- 역할: balance-designer
- 프로젝트: rhythm-02
- 단계: round-2

## 요청 받은 일
오케스트레이터 요청. (1) 12세 재조정으로 L1 pass_early가 125 ms가 되었는데 L1 손가락 누름 시작이 −0.2박(−120 ms)으로 고정되어 있어 art 기준(≥ 접촉 − (pass_early − 20) = −105 ms)을 어겼음(art layout FAIL). 누름 시작을 데이터에서 계산하도록 고침. (2) art가 요청자 지시(criteria 131aa6a)로 콤보를 "위쪽 가운데 큰 숫자 + 화면 전체 파티클(뒤 층)"로 바꿨으니 검증기 S10과 20-balance 콤보 절을 새 설계에 맞춤.

## 한 일
1. `tools/sim/judge.mjs fingerSchedule`: 누름 시작 = 접촉 − (레벨 `judge.pass_early_ms` − `balance.json tutorial_finger.press_start_inside_pass_ms`). 여유 값은 25 ms로, art 최소 20 ms보다 5 ms 더 둠. 레벨 파일의 옛 `press_start_beats`는 읽지 않음. 시그니처 `(L, bal, hits)`는 그대로. L1은 −120 ms에서 −100 ms(2900 ms)로 바뀜.
2. `balance.json`: `tutorial_finger.press_start_beats` 대신 `press_start_inside_pass_ms: 25`를 넣고 `_note`도 고침. `combo.display`는 점 10칸 기준에서 새 설계 기준(`digits: true`, `place: top_center_behind_world`, `particle_tiers 10·20·30·50`)으로 바꿨고, 단계 30 note의 옛 문구도 정리함.
3. `tools/verify-levels.mjs`
   - S1을 강화함. 누름 시작이 −(pass_early − 여유)와 같아야 하고, 여유는 art 최소 이상이어야 함.
   - S10을 새로 씀. art 코드는 쓰지 않고 layout.json 값만 읽어 독립적으로 계산함.
     - ① 층 순서: 콤보 3층이 hill·marks·ball·cloud_roof_branch·bounce_lines·judgement·hud보다 뒤에 그려짐.
     - ② 단계 관계: 파티클 단계의 앞 3칸이 화음 단계 10·20·30과 같음.
     - ③ 자리(4해상도): 숫자·라벨 상자를 최대 콤보 자리 수, 튐 1.2배, strings.json `combo_label`을 포함한 가장 긴 라벨로 잼. 이 상자가 HUD 띠 밖·화면 안에 있고, 공 세로 줄·판정 표시 자리·손가락 상자와 겹치지 않으며, 줄인 뒤에도 숫자 높이가 min 이상인지 확인함.
4. `20-balance.md`
   - 12절 콤보 표를 새 설계로 고침: 표시, 갱신 연출, 단계(소리 단계 5·10·20·30 / 파티클 단계 10·20·30·50, 화음 10/20/30 = 파티클 1~3, 50은 그림만), 끊김, 단계 노트.
   - 요약 표 2줄, S6~S10 설명, 6-6절 손가락 문단도 고침.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-02/tools/sim/judge.mjs` | fingerSchedule 누름 시작을 데이터로 계산 |
| `projects/rhythm-02/balance.json` | tutorial_finger.press_start_inside_pass_ms, combo.display 갱신 |
| `projects/rhythm-02/tools/verify-levels.mjs` | S1 강화, S10 새 설계 기준 |
| `projects/rhythm-02/20-balance.md` | 콤보 12절·6-6·S10 설명 갱신 |

## 검증 결과
- `node tools/verify-levels.mjs`: 421개 중 PASS 421, 대기 0, FAIL 0, **ALL PASS**.
  - L1 S1: 누름 시작 −100 ms = −(125 − 25).
  - S5: 손가락을 포함한 신호와 위험 구간의 겹침 없음.
  - S7: 0 ms.
  - S10 PASS: 4해상도에서 상자가 공 줄 오른쪽(360x640 x ≥ 132 > 124)에 있음. 판정 표시와 손가락은 상자보다 아래.
- `node tools/art/check-all.mjs`: 6개 모두 OK, 대기 없음.
  - layout: finger L01 누름 2900 ≥ 2895, 사라짐 3145 ≤ 다음 놓침 구역 3275 ms.
  - combo-fx: lore `combo_label`(콤보/COMBO)이 이미 들어와 대기 0.
- `node tools/selfcheck-sim.mjs`: 표시된 항목 PASS, FAIL 없음.

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 이름·캐릭터·아트·음악·레벨 배치 없음)
- [x] 게임 선정·설계 원칙 (규칙 바뀐 것 없음, 표시·검증만)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정, git 커밋·푸시 안 함

## 문제·남은 일
- minor(game-developer): `games/rhythm-02/js/judge.js`와 `games/rhythm-02/data/balance.json`은 아직 옛 복사본(−0.2박)임. build-web-data로 다시 복사해야 빌드 손가락이 −100 ms가 됨.
- minor(balance 담당 도구, 다음 손질 때): `tools/build-levels.mjs`와 `levels/01-level1.json`에 옛 `press_start_beats: -0.2`가 남아 있음. 지금은 읽히지 않는 값이고, 이번 쓰기 범위 밖이라 그대로 둠.
- minor(art): `layout.json combo.number.size_rule`에는 "2자리가 이 크기로 자리 안"이라고 적혀 있음. 하지만 412x915에서는 튐 1.2배를 넣으면 자리 폭을 넘어 글자가 193 → 171 px(13.3 %·H, min 12 % 이상)로 줄어듦. 줄임 규칙대로라 문제는 아니지만 문구를 고쳐야 함. 콤보 단계 노트의 "L9·L10 접촉 50·53"도 실제 값은 53·56임.

## 다른 팀에 줄 인사이트
- 튜토리얼 손가락처럼 판정 창 안에 있어야 하는 시각은 박 수로 고정하지 말고 "이른 쪽 한계 + 여유 ms" 데이터로 계산해야, 판정 창을 다시 조정해도 깨지지 않습니다. 검증기도 같은 식(등호)으로 확인합니다.
