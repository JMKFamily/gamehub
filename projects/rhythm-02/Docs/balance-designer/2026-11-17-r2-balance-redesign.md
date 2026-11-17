# round-2 밸런스 재설계: 흘러오는 길·지붕(nogo)·반복 방지·콤보·M1·N7

- 날짜: 2026-11-17
- 역할: balance-designer
- 프로젝트: rhythm-02
- 단계: round-2 (1-1 기획 수정, lore-writer·art-director와 병렬)

## 요청 받은 일
오케스트레이터(요청자 검수 피드백 전달): "지오메트리대시처럼 몰입감… 오른쪽에서부터 다가오는 여러가지 패턴으로 짧은순간 판단… 리스크가 반복적이지않게"와 전 프로젝트 지시 "디제이맥스 노트 터치 검사를 벤치마크해서 콤보시스템". 00-benchmark 14절(R2-A "흘러오는 길") 14-9 balance 요구, 오케스트레이터 D-R2-1~6, round-1 이슈(M1 = E3 결정, N7, N8, N9, N5/E5)를 반영해 스키마 v2·judge.mjs(nogo·ballsAt·세상 위치)·봇(q_nogo)·생성기·10레벨·검증기(V-R·S6~S10·px·HUD·콤보)·콤보 수치·M1·N7·20-balance.md를 고치고 전체 실행 ALL PASS.

## 한 일
1. **판정·세상 모듈** `tools/sim/judge.mjs`(순수 ES 모듈 유지, 빌드와 같은 파일): 접촉 `kind` hit/nogo, nogo 판정(창 안 탭 = `bump_roof`, 창 끝까지 없으면 `hold` 한 칸), `judgeAttempt(L, taps, { startIndex, carried })`, `ballsAt` 상태 `seated_roof`, `restartPhases` 세 판(bump_roof), 세상 위치 `scrollBeatAt`·`pxPerBeat`·`worldX`·`objectsAt`·`firstVisibleMs`, 콤보 `comboEvents`, 이어 하기 `resumePoint`. 등급 비율은 hit만.
2. **반복 측정** `tools/sim/repeat.mjs`(새로): 14-4 정의(토큰·위험 덩어리·n-gram·구절 시작·2마디 창). **round-1 레벨에 먼저 돌려 14-1 [r1 실측] 표 9레벨 × 6값이 소수 둘째 자리까지 같음을 확인**(V-R0, 사본 `tools/fixtures/r1-levels/`).
3. **봇** `tools/sim/bots.mjs`: 프로필별 `q_nogo`(σ70 0.15·σ50 0.05·σ25 0, D-R2-2), K2 첫 지붕 2개 q +0.10, `runProfile`에 `qNogo`·`combo`(콤보 켬 검증)·지붕 콩 실패 비율.
4. **스키마 v2·생성기** `tools/build-levels.mjs`: 토큰 DSL(숫자 = hit, `Xs` = 지붕 밑 쉼 s박), `scroll`·`objects[]`(표시·지붕·가지·구름·언덕·클리어 구름)·`roof_sits`·`after_roof` 토스·`scroll_stop_beat`. 무늬 되풀이 전략 폐기.
5. **10레벨 다시 짬**: W0 L1 → W1 L2 → W2 L3 → W3 L4 → W4 지붕 L5 → W5 낮은 가지 L6 → W6 큰 언덕 L7 → W7 긴 가지 L8 → L9·L10 조합. 두 공 G5 예비(D-R2-1). 레벨당 새 기믹 1, 카드 1(새 키 `card_roof`, `card_twoballs` 뺌). 모든 위험 덩어리 레벨 안 1회.
6. **balance.json**: `scroll`, `gimmicks` W0~W7, `bounces.roof`, `objects`(지붕 0.45·가지 0.30·구름선 0.9·언덕 0.30), `bots.q_nogo*`, `restart.phases_s.bump_roof`, **`combo`**, `menus.resume`, `sound_sync.apply_only_if_abs_over_ms` **0**, `clear_sequence` 길 멈춤·클리어 구름, `verify` 새 기준(vr·see·roof_count·b6_seeds 등), `judge_by_level` L8~L10 270.
7. **검증기** `tools/verify-levels.mjs` 다시 씀: V-R0~R7, V18~V23(보이는 시간·한 화면·표시 간격 px·지붕 규칙 7·물체 여유·HUD 띠), S6~S10, N7, C1/C1b, B6s, K3b, 정보 Q, 상태 **대기**(다른 역할 원인은 FAIL이 아니라 목록 표시), `--vr=<폴더>` 모드. art가 같이 고친 `layout.json`(world·hud.band_h·combo·drum.x_ratio_ref)의 실제 키를 읽음.
8. **20-balance.md** round-2 기준으로 다시 씀(절마다 【r2 바뀜/새로】), "rhythm-01과의 구분" 유지·갱신, "runner-01과의 관계(요청자 허용 겹침)" 2-1절.

## 처리표 (round-1 이슈·round-2 요구 → 처리)
| 번호 | 내용 | 처리 |
|---|---|---|
| **M1** (E3, D-R2-5) | 소리 맞추기 무시 구간 ±30 경계 뒤집힘·이른 쪽 잔차 | **수정**: `apply_only_if_abs_over_ms` 30 → 0. K3b: 보정 뒤 잔차 **+15·−15 두 쪽**, w = 1 봇 모든 레벨 ≤ 30·직전 2배 이하(−15 → L10 16.85). 옛 −30이면 L10 31.6(정보). dev 몫(raw +4~8 ms 쏠림)은 넘김 |
| **N7** | 이어 하기 준비 박 없음 | **수정**: 지금 구절 받침 쉼 처음으로 되감기(세상 위치도), `resumePoint`·`judgeAttempt startIndex/carried`. N7 검사: 이어 한 직후 다음 접촉 최소 2459 ms, 450 ms 미만 0 %(그 자리 이어 가기였다면 33~47 %) |
| **N8** | B6 단일 시드 민감 | **수정**: B6s 시드 10개 — 편차 평균 −1.1 %·sd 4.4 %·범위 −8.9~+7.7 %, 모두 ±20 % 안. 20-balance 9-3 |
| **N9** | K2 L10 27.7 | **해소**: K2 L10 20.56(한도 69 %) — 지붕은 K2가 키우지 않는 비용, 반박 묶음 축소 |
| **N5** (E5) | 640x360 반박 세로 29~32 px | **부분**: 세로 1.2d 하한 유지(1.21d). "가장 짧은 길이 표시 ≥ 32 px"는 round-2에서 길 위 표시 간격이 맡음(640x360 64 px, 360x640 36 px, V20). V16 세로 32 px는 정보로 내리고 이유를 20-balance 5-2에 적음 |
| M2 (balance 몫) | 물체 윗선 ≥ HUD 띠 | **검사 추가** V23(art layout world·hud.band_h를 읽음): 4해상도 통과 |
| 14-9 ① | 스키마 v2·nogo·세상 계산·지붕 규칙 7·10레벨 | 완료(V1·V21, 8-4) |
| 14-9 ② | V-R1~R7, 14-5 시간·px·한 화면, S6~S10, round-1 먼저 재기 | 완료(V-R0이 14-1 표 재현, round-1은 L2~L10 모두 V-R 실패, round-2 모두 통과) |
| 14-9 ③ | q_nogo 행(곡선 + criteria 기본 행), K2 다시, M1 잔차 두 쪽 | 완료(9-4 민감도·q 0 행, 9-5, 9-6) |
| 14-9 ④ | 콤보 키·단계·nogo +1·봇 불변 | 완료(12절, C1·C1b) |
| 14-9 ⑤ | 두 공 예비 확인 | 확인: V-R3 L9 7·L10 6개로 어휘 충분, 되살리지 않음 |
| D-R2-3 (K12) | 360 폭 px 하한 | 반박 레벨 3.5박 → 36 px(V20), HUD 띠(V23) |
| 지붕 규칙 ④ | "착지 1박 전부터 덮기" | **바꿈: 0.6박 전부터** — 1박 전이면 바로 앞 hit 접촉 순간 지붕이 북 위에 있어 "지붕 밑에선 참기"와 어긋남. 0.6박 전 = 앞 통과 창 끝 +52~64 ms, 지붕 보임 → 착지 ≥ 2.02 s 유지 |
| 기존 검사 V6 ①·②·③·⑤, V7, V16, S4 | 새 코어에 맞지 않음 | 바꾸고 이유 기록(20-balance 13절 끝) |

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-02/20-balance.md` | round-2 기준 전면 수정(0~17절) |
| `projects/rhythm-02/balance.json` | scroll·gimmicks·objects·q_nogo·bump_roof·combo·resume·무시 구간 0·verify |
| `projects/rhythm-02/levels/01-level1.json` ~ `10-level10.json` | 스키마 v2 10레벨 |
| `projects/rhythm-02/tools/sim/judge.mjs` | nogo·세상 위치·콤보·이어 하기 기준 구현 |
| `projects/rhythm-02/tools/sim/repeat.mjs` | V-R 측정(새로) |
| `projects/rhythm-02/tools/sim/bots.mjs` | q_nogo·콤보 검증 |
| `projects/rhythm-02/tools/build-levels.mjs` | 스키마 v2 생성기·설계 기록 |
| `projects/rhythm-02/tools/verify-levels.mjs` | 검증기 round-2 |
| `projects/rhythm-02/tools/fixtures/r1-levels/*.json` | round-1 레벨 사본(V-R0 도구 검증용) |

## 검증 결과
- `node projects/rhythm-02/tools/verify-levels.mjs`(전체, 37 s, 종료 코드 0): **409개 검사 PASS 408 · 대기 1 · FAIL 0 → ALL PASS**. 대기 1 = V7b: `strings.json`에 `card_twoballs` 키가 남고 `assets/cards/card_twoballs*.svg` 2장이 남음(lore·art 삭제 대기). `card_roof`는 lore·art가 이미 만들어 통과.
- 곡선(σ70 + q_nogo 0.15, 연속 중앙값): L1 1.80 · L2 2.39 · L3 3.94 · L4 4.59 · L5 5.48 · L6 6.17 · L7 7.29 · L8 8.69 · L9 10.54 · L10 11.72. r 1.478, **T 12.71(범위 10.17~15.25), L10 −7.8 %**, 시드 10개 평균 −1.1 %·sd 4.4 %. L3~L10 엄격 단조, 모두 ≤ 30, 직전 최대 1.65배, B2 진행도 감소, K2 최대 20.56.
- V-R: round-1 → round-2 서로 다른 위험 덩어리 L2 1→3, L4 3→4, L6 3→5, L9 3→7, L10 3→6. 같은 덩어리 연속 L2 3→1(=0회 연속), 3-gram 중복 L2 0.60→0.00·L6 0.38→0.00, 4-gram L2 0.50→0.00·L6 0.31→0.00. 레벨 사이 구절 시작·2마디 창 같은 것 0.
- 보이는 시간: hit 처음 보임 → 판정 2.40 s(L1)~1.72 s(L10), 지붕 2.20~2.02 s, 판단 시간 ≥ 1.60 s. 가장 짧은 표시 간격 360x640 36 px(반박)·63 px(L1~L4).
- 콤보 켬/끔 같은 시드 봇 결과 동일(C1b), 완벽 입력 콤보 = 접촉 수, 화음이 지붕 ±1박 안 0.
- 도구 확인: `node tools/sim/bots.mjs 2000 child_sd70 05`, `node tools/verify-levels.mjs --vr=tools/fixtures/r1-levels`(14-1 표 그대로) 동작.
- 못 한 것: 빌드(브라우저) 쪽 검사는 dev 구현 전이라 하지 않음. selfcheck·qa 도구는 지시대로 고치지 않음(아래 넘길 것).

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 이름·캐릭터·아트·음악·레벨 배치 없음 — 토큰으로 새로 설계, round-1 자기 레벨과도 V-R4 복사 0)
- [x] 게임 선정·설계 원칙 (조작 탭 1가지, 승패 한 문장 lore 원본, 레벨당 새 기믹 1 + 카드, 지붕은 L5부터·배치 규칙 7)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정(20-balance.md, balance.json, levels/, tools/(tools/art/ 제외), Docs/balance-designer/, Docs/README.md 한 줄), git 커밋·푸시 안 함, 서버·브라우저 띄우지 않음

## 넘길 것
- **lore**: `strings.json`에서 `card_twoballs` 키 삭제(V7b 대기). 카드 키 8개 = `card_bounce`·`card_big`·`card_cloud`·`card_dot`·`card_roof`·`card_double`·`card_three`·`card_roll`.
- **art**: `assets/cards/card_twoballs.svg`·`card_twoballs_portrait.svg` 삭제(V7b). 물체 높이(지붕 아랫면 0.45·가지 0.30·언덕 꼭대기 0.30·구름선 0.9)는 balance 값 — layout 숫자를 바꾸면 V22·V23으로 확인. 클리어 길 멈춤 감속은 그림에만(판정 뒤, `scrollBeatAt`은 B+2박에서 바로 멈춤 — 1-2 교차 리뷰에서 감속을 함수에 넣을지 정함). 지붕 콩 실패음 < 아이 탭.
- **dev**: judge.mjs 그대로 복사, 세상 = `worldX`, 실패 세 판, 콤보 `comboEvents`(hold 칸 = roof_out, 화음 = stages[].chordMs), 이어 하기 `resumePoint` → `judgeAttempt(…, {startIndex, carried})`, 재시작 0.85 s에 세상 0박, 소리 맞추기 무시 구간 코드 제거, raw +4~8 ms 쏠림 원인.
- **selfcheck·qa 도구에서 바뀔 점(balance는 손대지 않음)**: 완벽 입력 = hit 접촉만(모든 접촉을 치면 첫 지붕에서 bump_roof), 실패 이유 `bump_roof`·판정 `hold`(e null), 접촉 `kind`·`objects`·`scroll`·`roof_sits`·상태 `seated_roof`, 두 공 검사 대상 없음, 카드 목록 `card_roof`, 이어 하기 되감기·콤보 켬/끔 재판정 항목.

## 문제·남은 일
- minor · lore·art: `card_twoballs` 키·그림 삭제(대기 1의 원인).
- major · orchestrator: K10 지붕 참기 아동 이해 — q_nogo 0.15는 [추정]이고 곡선이 이 값에 기댐(q 0이면 L4→L5·L8→L9 단조 깨짐, q 0.25면 L10 17.2로 여전히 ≤ 30). 아동 테스트는 요청자 선택 목록(D-R2-4).
- minor · balance(1-2): art가 제안한 클리어 길 멈춤 감속(ease 1박)을 `scrollBeatAt`에 넣을지 교차 리뷰에서 결정.
- minor · qa: N5 640x360 세로 반박 29~31 px 실기기 확인(길 위 간격 64 px가 주 표시).

## 인사이트 후보
- [rhythm-02·2026-11-17] "반복 없는 리스크"는 측정 도구를 먼저 옛 레벨에 돌려 기준표를 재현한 뒤(V-R0) 새 레벨을 짜면 같은 자로 비교된다. 2마디 창 비교는 정박마다 밀면 받침 쉼 + 구절 첫 박처럼 레벨과 무관한 모양이 모든 레벨 쌍에서 겹치므로 "마디 첫 박 시작 + 쉼 없는 창"으로, 구절 시작은 따로 본다. 근거: projects/rhythm-02/tools/sim/repeat.mjs, 20-balance.md 10절. 적용: balance-designer(전 프로젝트), qa-engineer.
- [rhythm-02·2026-11-17] 칠지·말지(nogo) 기믹은 σ 봇에게 공짜라(늘 참음) 곡선이 무너진다: 참기 실패율 q를 봇에 넣고 q 0·0.10·0.25 민감도를 함께 적는다. rhythm-02에서 지붕 하나 ≈ hit 접촉 2개 비용, q 0이면 지붕 레벨 단조가 깨짐. 근거: projects/rhythm-02/20-balance.md 9-4. 적용: balance-designer, qa-engineer.
- [rhythm-02·2026-11-17] "덮기 시작 = 착지 1박 전" 같은 반대 행동 앞 여유 규칙은 바로 앞 판정 순간과 겹칠 수 있다(앞 접촉도 1박 전). 덮기 시작을 앞 통과 창 끝 뒤(0.6박 전)로 두면 "그 밑에서는 칠 것 없음"이 데이터로 보장되고 미리 보임 2 s도 지켜진다. 근거: 20-balance.md 8-4 ④. 적용: balance-designer(runner-01 매달린 위험 포함).
- [rhythm-02·2026-11-17] 다른 역할 파일 때문에 검사가 맞지 않을 때 FAIL 대신 "대기" 상태로 따로 세면, 병렬 수정 중에도 내 데이터 원인 FAIL과 섞이지 않는다(대기 목록을 끝에 표시, ALL PASS 판정에서 제외). 근거: tools/verify-levels.mjs wait(). 적용: 모든 검증기 작성 역할.
- [rhythm-02·2026-11-17] 지붕·반복 방지처럼 위험을 늘리는 재설계에서는 판정 폭을 조금 되돌려(L10 250 → 270) hit 수를 확보해야 곡선(T ±20 %)과 손해 모델(K2 ≤ 30) 둘 다 맞았다. 판정 폭은 "늘지 않음"만 지키면 된다. 근거: 20-balance.md 4-1·14절. 적용: balance-designer.
