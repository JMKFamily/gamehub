# 1-7 round-2 게이트 판단과 round-3 결정

- 날짜: 2026-11-17 · 역할: orchestrator · 프로젝트: rhythm-01 · 단계: 1-6 ~ 1-7 round-2

## 1-6 집계 감시 (qa-engineer)
- diff 확인: `reviews/round-2/`(score.md 신규, qa.md 끝 "1-6 재측정" 절 +58/−0, parts/firstrun.json 신규, metrics.json merge 재실행, pids.log), `tools/qa-round.mjs`(+109/−2, firstrun 파트, `--part all`에서 제외), `harness/criteria.md` **+4/−0 직접 확인**, 보고서, README 한 줄. 빌드·기획·games.json·다른 팀 폴더 미수정, git 미사용. 서버 8384·8386 자기 PID만 종료.
- 재측정: 빈 저장소 → 실제 UI 첫 실행 → 자동 보정 16탭 → L1, 들리는 박 = 예약 + 탭 순간 autoNow. 보정 오차 +62.6~+69.0 ms (기준 ±10 ms) 7/7 재현, 보정 건너뛴 대조 −2.5 ms. σ70 L1 2 → 17회, L2 3 → 60회, L4~ 200회 상한 초과. → 기존 체크 실패, 기술 7.5 → 6.5. 심각도 blocker(기본 첫 실행 경로·저장돼 지속·아이가 피할 수 없음·L1 목표와 30회 한도 붕괴) — 근거 타당, 채택.

## 게이트 판정 (round-2)
| 조건 | 기준 | round-2 | 결과 |
|---|---|---|---|
| 가중 총점 | 8.0 이상 | 7.95 (8.5·7.5·9.0·9.0·6.5) | 실패 |
| 모든 영역 | 6.0 이상 | 최저 6.5 | 통과 |
| blocker | 0 | 1 (B1 첫 실행 보정 이중 보정) | 실패 |
→ **게이트 미통과 → round-3.** (1-5 직후 예비 8.20은 이 blocker를 놓친 측정 위의 값이라 쓰지 않음.)

## round-3 결정 (R11~R17)
1. **R11 지연 보정 (B1, blocker)**: 보정 탭마다 "들리는 박 = 예약 시각 + 그 순간 자동 지연(autoNow)" 기준으로 차이를 재고, 수동 오프셋에는 자동 지연을 뺀 **남는 차이만** 저장. 판정에 쓰는 자동 지연은 **매 시도 시작(재시작 포함)마다 다시 읽음**(시도 중간에는 바꾸지 않음 — R9 표시값=판정값 유지). 첫 보정 시작 전에 자동 지연 안정 대기(예: 250 ms 동안 변화 2 ms 이하, 최대 1.5 s). 이미 저장된 잘못된 오프셋 이관은 만들지 않음(개발 중 빌드, 저장소 버전 키를 올려 첫 실행 보정을 다시 하게 함). 확인: QA `firstrun` 파트 ±10 ms, σ70 L1 목표 복귀.
2. **R12 성능 (M1, major)**: 6배 스로틀 1% low ≥ 45를 새 브라우저 3회 반복 모두 통과(criteria round-2 추가). 412x915 L1 첫 판정 직후 86 ms 프레임(게임 rAF 47.9 ms), L10 시작·재시작 23~39 ms 몰림 제거. 기준 완화 없음.
3. **R13 테스트 훅 화면 (N1)**: `warmScreens()`가 `#tut` 등 표시 상태를 같은 프레임 안에 되돌림(3프레임 지연 제거).
4. **R14 북채 퇴장 고리 (N2)**: 작아지는 0.25박 동안 점선 굵기·불투명도도 같은 비율로 0까지 — art가 30-art 5-4에 규칙 보완, dev 구현. criteria round-2 시각 추가 줄로 확인.
5. **R15 세로 카드 여유 (N3)**: 360x640 세로판 공·별을 화면에 보이는 면 기준 16 px 이상 + 여유 2 px 이상이 되게 — art가 30-art 9-1 규칙(칸 높이 또는 세로판 1.15배) 정함, dev 구현.
6. **R16 긴 레벨 이름 (N4)**: 숨기기 전에 글자 크기를 줄이고(최소 크기는 art가 정함), 그래도 넘치면 두 줄, 그래도 넘칠 때만 숨김. 문구 변경 없음(lore 작업 없음).
7. **R17 검증기 Δ 시나리오 (N5)**: balance가 20-balance 8-1·8-3에 "보정 때와 플레이 때 자동 지연 차이 Δ" 가정 줄을 넣고 verify-levels에 정보 행 추가(Δ = 0·64 ms, R11 적용 뒤 남는 영향 0 확인). 레벨 데이터·곡선은 바꾸지 않음.

## 진행 순서
- 병렬: art(R14·R15·R16 규칙) / balance(R17).
- 그다음 game-developer round-3 구현(R11~R16) → 1-4 QA(firstrun 포함) → 1-5 리뷰 → 1-6 → 1-7.

## 인사이트 공유
- `harness/insights.md`에 2줄 덧붙임(구현·성능: outputLatency 잠금 해제 직후 변화와 이중 보정 / QA: 자기 일관 지연 측정의 함정). `git diff --numstat` 2/0. 메인 세션에 알림.

## round-3 기획 수정 감시
- balance (R17·R11 판정 쪽): `20-balance.md`, `balance.json`(새 키 `audio_latency.auto_latency_read`·`verify.calibration_auto_shift`, 기존 키 삭제 0), `verify-levels.mjs`(INFO R17·C2), `tools/sim/calib.mjs`·`bots.mjs`, 보고서, README 한 줄. 빌드·levels·harness 미수정, git·서버 미사용. **전체 실행 직접: 종료 0, FAIL 0, ALL PASS.** R17 INFO: round-2 방식 Δ64 → L1 14·L2 48·L10 200회 / R11 방식 Δ64 = Δ0(3/4/16). 안정 대기에 "잠금 해제 뒤 400 ms 이상" 추가, `restart_keeps_delay`(시도 사이 보정값 변화만큼 재시작 시각 이동) 추가 — 근거 타당, 채택.
- art (R14·R15·R16): `30-art.md`(5-4·5-6·6·9-1·14·15-5, 바꾼 기존 문장은 보고서에 기록), `assets/cards-portrait.mjs`(보이는 면 검사), 세로판 카드 5장 재생성(외부 href 0 직접 확인), 보고서, README 한 줄. 빌드·balance·harness 미수정, git·서버 미사용. 직접: `palette.mjs --check` 0, `cards-portrait.mjs --check` 4화면 OK. 규칙: R14 k = 1 − q²로 점선 굵기·불투명도 동시 축소, R15 세로판 226×880 + 공·별 1.2배(360x640 보이는 면 18 px 이상), R16 12→11→10 px → 두 줄 → 숨김 — 채택.
- 다음: game-developer round-3 구현(R11~R16).

## 인사이트 수신 (메인 세션 전달, rhythm-02 round-1 통과 c613154)
- insights.md +4줄, criteria.md +13줄(기존 줄 변경 0). rhythm-01 적용 판단:
  1. 보정 무시 구간 경계값·이른/늦은 잔차 봇 시나리오 → R17은 Δ 0·64(늦은 쪽)만 봄. round-3 QA·balance 리뷰 지시에 경계값과 음(−)의 Δ 확인을 넣음.
  2. 대체 글은 접근성 트리로 확인, 오류 화면 다시 버튼은 부트 코드 인라인 → R8 aria는 코드·QA r2로만 확인했으므로 round-3 QA에서 접근성 트리로 확인. 불러오기 실패 ↻ 버튼 위치 확인 지시.
  3. 화면 고정 글·정지 요소 자리를 데이터로 두고 언어×4해상도 겹침 검사 → QA 겹침 검사(128화면)가 이미 있음, en 360x640 L9 이름(N4·R16)과 함께 round-3 QA에서 확인.
  4. 재판정 하네스 1 s 단위, 소리 표 원본 = 빌드 렌더 → 재판정은 시도 단위라 해당 판단은 QA에 맡김, 소리는 이미 오프라인 렌더 기준(sound-check --render).
- 진행 중인 dev에는 범위를 늘리지 않고, round-3 QA·리뷰 지시에 새 criteria 13줄 확인과 함께 넣음.

## 요청자 새 지시 (이 세션 채팅) — 몰입감·반복되지 않는 위험
- 원문: "지오메트리대시처럼 몰입감이 좀 있는게 좋겠습니다. 이 몰입감은 오른쪽에서부터 다가오는 여러가지 패턴으로 짧은순간 판단해야하는 상황에서 생깁니다. 리스크가 반복적이지않게 만드는것을 초점으로 개선하세요."
- 전파: STATUS.md 지시 절 신설. 진행 중 game-developer에 SendMessage(R11~R13만 마무리, R14~R16 미착수분은 보류, 새 코어 선작업 금지). benchmark-analyst에 round-3 코어 개선안(00-benchmark 덧붙임, runner-01 GD 실측 인용, 반복 회피 규칙 수치화) 지시.
- 다음: benchmark 결과 → 오케스트레이터 결정 → balance·art·lore 병렬 → 교차 리뷰 → dev → QA(새 criteria rhythm-02 13줄 포함).

## 요청자 새 지시 (메인 세션 전달, 전 프로젝트) — 콤보 시스템
- 내용·조건: STATUS.md "콤보 시스템" 절. criteria 게임 감각 +1줄(3dd7294, 메인 세션 커밋).
- 전파: STATUS 기록, 진행 중 benchmark-analyst에 SendMessage(새 코어가 콤보를 담을 수 있게 고려만, DJMAX 조사는 하지 않음 — 공통 문서 대기). 문서 도착 후 balance → lore·art → dev, round-3 새 코어 빌드 범위에 포함.

## benchmark-analyst 코어 개선안 감시 — 통과
- diff: `00-benchmark.md` +195/−1(삭제 1줄은 후보 A 제목에 "round-3에서 대체" 표시를 단 변경), 보고서, README 한 줄. 빌드·기획 데이터·harness 미수정, git·서버 미사용.

## round-3 코어 결정 (R18~R22, 요청자 지시 "몰입감·반복되지 않는 위험" + "콤보")
1. **R18 코어 = "북길"(00-benchmark 8절 안 R3-1) 채택**: 가로 길 + 왼쪽 고정 판정 북(가로 x 30 %, 세로 x 20 %) + 박마다 뛰는 공, 별 묶음이 오른쪽 끝에서 박 속도로 흘러와 북에 닿을 때 톡. 원 궤도·12시 공(플레이 화면)·보여 주기 마디·속 빈 별·북채 차례 신호는 폐기. 판정 창·지연 보정(R11)·재시작 1.08 s·카운트인·등급 북·진행도·레벨 10 목표 규칙 유지.
2. **R19 미리 보기·판단 시간**: L1 4박 → L4~6 3.5박 → L7~10 3박, 5~6세 하한 미리 보기 1.2 s·판단 1.0 s, 레퍼런스(1.16 s / 0.80 s)보다 짧게 하지 않음. 세로 360x640 반박 간격 겹침(major)은 art가 규격으로 해결(간격 ≥ 별 지름 + 8 px).
3. **R20 반복 회피 규칙 N1~N11**(8절) 그대로 채택, 배치는 시도마다 고정(무작위 금지). balance가 levels v3와 검증기 검사로 구현, 레벨 10 목표값은 새 레벨로 다시 계산(처음 보는 무늬 비용 포함 봇).
4. **R21 연습 체크포인트**: 숨 고르기 틈 시작, 부활 때만 카운트인.
5. **R22 콤보(예비)**: 등급 3개 유지(딱·좋아·통과), 콤보 = 좋아 이상 연속 수, 통과는 콤보만 끊고 시도 계속, 판정 북 왼쪽 구슬 쌓기(글 없음), 끊김 = 부드럽게 사라짐 + 낮은 "퐁" 1번(실패 연출과 다르게). 판정 창 ms·등급 반영 여부는 공통 문서 `harness/benchmarks/djmax-judgement.md` 도착 후 balance가 확정(그전엔 키 자리만).
- 진행: balance·art·lore 병렬 → 교차 리뷰 1회 → game-developer 새 코어 구현.

## 공통 DJMAX 판정·콤보 문서 수신 (256314b, 메인 세션 전달)
- 요지: 콤보 = 시도 안 성공 판정 수(실패에서만 끊김), 표시·보상만(판정 창·클리어·봇 지표 불변, 켬/끔 재판정 불일치 0), 등급 3개, 점 10칸 + 10마다 표지, 단계 보상 5·10·20, 끊김은 소리 없이 0.3 s, 노랑은 별 전용.
- **R22 수정**: 예비 R22(좋아 이상 연속, 통과는 콤보만 끊음)와 정의가 다름 → 공통 문서 정의를 기본으로, balance가 근거를 들어 확정. 끊김 "낮은 퐁" 예비안은 공통 문서(소리 없음)로 대체.
- 전파: 진행 중 balance·art·lore에 SendMessage. 5-4 확인 항목의 criteria 반영 판단은 round-3 1-6에서 qa-engineer.

## lore 새 코어 기획 감시 — 통과
- diff: `10-lore.md` +232/−13(−13은 "round-3에서 대체" 표시를 단 줄), 보고서, README 한 줄. 키 64 → 69(사용 66 + 폐기 3: tut_tap·card_star_tap·card_two_bar), 기존 키 삭제·문구 변경 0. 북시계 → 북길/Drum Road, 레벨 이름 10개 유지, 콤보 키는 `streak`(DJMAX 용어 금지). 빌드·다른 역할 파일·git·서버 미사용.
- 남은 판단: 콤보 정의(R22 ↔ 공통 문서) — balance 확정 대기, 교차 리뷰 가정 A1~A8.

## art 새 코어 기획 감시 — 통과(규칙 위반 1건 경미)
- diff: `30-art.md` +252/−18(−18은 "round-3에서 대체" 표시 줄), `assets/` 새 파일(layout.json·road-layout.mjs·cards-r3/ 10장·cards-r3.mjs·mockup-r3), 수정(palette.json +32/−0, palette.mjs, sound.json +111/−11 — 지운 줄은 `--render --write`가 다시 쓴 측정 기록값, sound-check.mjs, cards-portrait.mjs `--dir`), 보고서, README 한 줄. 빌드·balance·levels·lore·harness 미수정, 서버 미사용. 직접: palette --check 0, sound-check 0, 새 SVG 외부 href 0.
- **규칙 위반(경미)**: `git --version` 1회 실행(레포 조회·변경 없음), 본인 자진 보고. 결과물 영향 없음. 다음 지시에도 "git은 --version 포함 실행 자체 금지" 명시.
- 콤보 연출은 공통 DJMAX 문서 기준(점 10칸·표지·무음 끊김, 노랑 미사용). 세로 겹침 해결안(세로 미리 보기 = min(가로, 3.5)) → balance에 전달.

## balance 새 코어 기획 감시 — 통과
- diff: `20-balance.md`(17장 덧붙임), `balance.json`(새 키, 옛 값 `*_r2_deprecated`, 삭제 0), `levels/01~10`(v3, v2 보존), `tools/sim/path.mjs` 신규, `bots.mjs`(덧붙임만), `verify-levels.mjs`, 보고서, README 한 줄. judge·calib·plan·빌드·다른 역할 문서 미수정, git·서버 미사용. **전체 실행 직접: 종료 0, FAIL 0, ALL PASS.** B6 L10 21.023 ∈ [18.20, 27.30](T 22.75, 배율 1.5173), 시드 10개 모두 ±20 % 안, N1~N11 PASS, 콤보 = 공통 문서안(R22 예비안 불채택, 근거 3개 타당).
- **위험 감지·조치**: 진행 중인 dev(옛 코어 R11~R13 빌드)가 `build-web-data`를 다시 돌리면 v3 레벨이 옛 엔진에 들어감 → dev에 즉시 SendMessage(재생성 금지, data v2 확인, 섞였으면 보고).

## round-3 추가 결정 (R23~R25)
1. **R23 보호자 보정 적용 하한**: 이른 쪽 남은 오차 −30 ms에서 L7~L10이 32~74회(30회 한도 초과), L10 한계 약 12 ms → (a) `guardian_calibration.apply_only_if_abs_over_ms` 30 → 10 채택. 판정 창은 바꾸지 않음(b 기각), 정보로만 두기(c)는 한도 위반을 남겨 기각. balance가 교차 리뷰에서 바꾸고, 보정 측정 잡음(어른 σ40, 16탭)으로 10 ms 미만 보정이 오히려 오차를 키우지 않는지 봇 INFO로 확인.
2. **R24 키 이름 통일**: L1 = lore 새 키 `tut_drum_tap`·`card_drum_tap`(뜻이 바뀌어 옛 `tut_tap`·`card_star_tap`은 폐기 유지), L6 = balance 확정 기믹 "반박 3연속" → 카드 키 `card_run3`(lore가 새 문구, `card_long_row`는 쓰지 않음 표시), art는 `cards-r3/` 파일 이름을 키와 같게(L1 `card_drum_tap`, L6 `card_run3`) 바꾸고 L6 그림을 "붙은 별 셋"으로.
3. **R25 그 밖**: L3 좋아 ±90(공통 문서 권장 ±100)은 판정 창 불변 원칙으로 유지. 레벨 길이 30~45 s 미달 7개(1~3 s)는 balance가 숨 고르기로 맞출 수 있으면 교차 리뷰에서 반영(N 규칙·B6 유지 조건).
- 다음: 1-2 교차 리뷰(balance·art·lore 각 1회 수정, 병렬).

## game-developer R11~R16 (옛 코어) 감시 — 통과, 허브 갱신
- diff: `games/rhythm-01/`(js 5·style·index·data art.json·balance.json·세로 카드 5·favicon.png), `tools/build-web-data.mjs`·`selfcheck-browser.mjs`, DEV_NOTES, `reviews/round-2/dev-response.md`, 보고서, README 한 줄. 기획·levels·harness·games.json 미수정, git 미사용, 포트 8341~8346 자기 PID만.
- 직접: validate OK, judge.js = judge.mjs, 외부 URL 0, 빌드 data schema_version 2(v3 미혼입).
- 결과: R11 구현(C2 2000묶음 다름 0), R13 수정, R14~R16 구현(지시 전 완료분 유지), R12 35/36창(640x360 L7 재시작 1창 34~36.6; PC 부하 41~52 %, 대조 페이지도 1창 하락). 보정 오차 자체 확인 1회 +15.8 ms(부하 흔들림 추정) → 공식 판정은 QA firstrun.
- 판단: 새 코어 빌드가 다음 차례라 옛 코어 QA 전체는 다시 돌리지 않음. 이 빌드는 blocker 수정본으로 허브에 올려 요청자가 중간 플레이할 수 있게 함. R11·R12 공식 확인은 새 코어 빌드 QA(firstrun·perf 3회, 부하 낮은 때)에서.

## 1-2 교차 리뷰 감시 — lore 통과
- diff: `10-lore.md`, 보고서, README 한 줄. git(--version 포함)·서버 미사용. 키 70 = 사용 65 + 폐기 3 + 쓰지 않음 2(`card_long_row`·`aria_streak_best`), 삭제 0. L6 `card_run3` "붙은 별 셋, 톡톡톡". balance·art에 남긴 키 수정(R24)은 두 역할 교차 리뷰 지시에 이미 포함 — 결과에서 확인.

## 인사이트 수신 — 콤보 대체 글 (dbda131)
- rhythm-01 대조: `aria_streak` "이어서 친 별 / Stars in a row" = 쉬운 말 풀이 충족. 최고 콤보 표지는 그리지 않음(`aria_streak_best` 쓰지 않음)이라 버튼 안 낭독 문제 해당 없음.
- 새 코어 dev 지시에 넣을 것: 점 줄 `role="meter"` + `aria-valuenow`, `aria-valuetext`는 숫자만, 판정마다 등급 낭독 안 함, 끊길 때 낭독 없음(aria-live 없음 — lore R3 규칙과 같음).
- art 교차 리뷰 통과: `30-art.md` 16-12, `assets/`(cards-r3 키 이름 통일 — 옛 이름 4파일 삭제는 이번 라운드 art 자체 산출물의 이름 변경, `road-layout.mjs --check`에 v3 레벨 대조 추가, sound-check outro 멜로디 버그 수정 314 → 252음). 직접: road-layout·sound-check·palette 모두 0, cards-r3 외부 href·url() 0. git·서버 미사용.
- lore에 남은 1단어(R3-6 "판정 북 위에 손가락" → "아래")는 art 16-1·lore R3-7 표가 기준 → dev 지시에 "손가락은 판정 북 아래(art 16-1)"로 명시하고, lore는 다음 리뷰 때 고침.
- balance 교차 리뷰 통과: R23 10 ms(옛 값 보존, 잡음 포함 봇 INFO로 L7~L10 최대 25회 확인), R24 키 통일(`*_r3a_deprecated` 보존), R25 길이 30.0~34.0 s(S17 신설; L7은 숨 고르기만으로 부족해 끝에 별 1개 덩어리 추가 — 오케스트레이터 승인). 직접: verify-levels 전체 종료 0·FAIL 0·ALL PASS, art `road-layout --check`·`sound-check` 새 레벨로 다시 돌려 OK. B6 L10 20.99 ∈ [18.55, 27.83].
- 위험 기록: 길이를 맞추느라 L7·L10 덩어리 사이 빈 박이 4박 위주 → 요청자 지시(짧은 순간 판단 몰입)가 약해질 수 있음. round-3 1-5 benchmark·balance 리뷰에서 반드시 판단하게 하고, 몰입과 길이가 충돌하면 몰입 우선(길이 기준은 권장).
- lore 낱말 차이(R3-1 북 옆, R3-4 L10 설명, R3-5, R3-6 손가락 위치)는 화면 문구가 아닌 설정 문장 → round-3 리뷰 때 lore가 고침. dev는 art 16절이 화면 기준.
- 다음: game-developer 새 코어 "북길" 구현.

## 요청자 새 지시 (메인 세션 전달) — 판정 이름과 퍼센트
- 내용: STATUS "판정 이름과 퍼센트" 절. 진행 중 새 코어 dev에 SendMessage(판정 표시 자리·결과 화면 정확도·최고 콤보 자리를 데이터로 받게 구조만 준비, % 식은 공통 문서 뒤 balance가 확정). 공통 문서 도착 뒤 balance(% 식·평균·키) → lore(이름 문구·aria) · art(자리·크기·16-8 금지 목록 수정) → dev 반영, round-3 빌드 범위.

## 공통 % 판정·판정 이름 안 수신 (djmax-judgement 7절, 3383f7b)
- 요지: % 계단 10 % 단위(≤25 ms 100, ≤50 90, ≤g 80/70/60, ≤W 50~10, 창 밖 없음), 레벨 정확도 = 클리어 시도 판정 % 평균(내림), 기록 = 일반 모드 최고 정확도·최고 콤보, 이름 권장 딱이야/좋아/됐어, 글자 28 px 이상·% 0.5~0.6배, 80/400/150 ms, rhythm-01 자리 "판정 북 바로 위", 노랑 글자 금지.
- 판단: 북길은 공이 판정 북 위에서 뛰므로 "바로 위"가 공 궤적과 겹칠 수 있음 → art가 공·별·판정 선을 가리지 않는 자리로 정함.
- 지시(병렬): balance `accuracy` 블록·검증기 INFO / art 표시 규격·layout 글 자리·겹침 검사·16-8 금지 목록 수정 / lore 판정 이름·% 표기·aria + 교차 리뷰 남은 설정 문장 정리. 끝나면 새 코어 dev에 반영 지시.
- lore 판정 이름·% 통과: `10-lore.md` R3-12(판정 이름 judge_perfect/good/pass = 딱이야·좋아·됐어 / Wow!·Nice·OK, 데이터 등급 키 불변, % "90%" 두 줄, 결과 `result_accuracy`·`result_new_best`, 최고 콤보 `aria_streak_best` 다시 사용), 교차 리뷰 낱말 4곳 정리. 키 70 → 75, 삭제·기존 문구 변경 0. git·서버 미사용.

## 사용 한도 정지·재개 (요청자 지시 CLAUDE.md 0c6f8a4)
- 약 20:30 사용 한도 도달로 진행 중이던 3개 작업이 멈춤: game-developer 새 코어 구현, balance `accuracy`, art 판정 이름·% 표시. 미커밋 산출물은 되돌리지 않음.
- 22:52 예약 확인에서 재개: 세 에이전트에 SendMessage로 같은 범위 이어가기 지시(파일 상태 먼저 확인, 끊긴 실행은 다시, 자기 PID만 정리). lore 확정 키(R3-12)와 lore 요청(`judge_pct` 키·신기록 조건 → balance, 표시 자리 → art)을 함께 전달.
- balance `accuracy` 통과: `balance.json` accuracy 블록(공통 계단, 레벨별 실제 창, 레벨 정확도 = 클리어 시도 평균 내림, 신기록 표지 = 이전 최고보다 클 때만, `judge_pct` 별도 키 없음), 20-balance 17-14, 검증기 A0~A3, `bots.mjs` 함수 덧붙임만. 직접: 전체 실행 종료 0·FAIL 0·ALL PASS, B6 불변(L10 20.99). σ70 클리어 정확도 중앙값 78~80 %.
- art 판정 표시 통과: 자리 = 길 띠 아래, 판정 북·L1 손가락 칸 오른쪽 + 8 px(공통안 "북 바로 위"는 공·별 길이라 불가 — 타당), 640x360 tut 글과는 시간 배타(검사기가 `tutorial_cue.hide_after` 확인), 이름 40~46 px·% 0.55배, 노랑 미사용, 결과 화면 등급 북 > 정확도 > 콤보. 16-8 금지 목록은 자체 이름·%만 허용으로 고침(DJMAX 이름·글자 디자인·한 줄 표기 금지 유지). 직접: palette·road-layout·sound-check 모두 0. git 미사용.
- 다음: 진행 중 dev에 accuracy·layout 판정 글 자리 반영 지시.
- 인사이트 수신(57bf276, 판정 기준 구현 주의점 3개: NaN 창, 경계 부동소수 반올림, 앞 탭 어긋남 + 창 밖 탭) → 진행 중 dev에 전달, round-3 QA 지시에도 넣음(빌드 %와 `bots.mjs` 기준 함수 경계값 대조, NaN 창 검사).

## 요청자 새 지시 (메인 세션 전달) — 이름 확정·대상 연령 12세·팀 자체 결정
- 이름 똑딱북: Tickadrum 확정 → STATUS 이름 줄·미해결 줄 갱신, games.json 미변경(게이트 때 표시 제거). 이후 지시에서 "가안" 표기 삭제.
- 대상 연령 12세(criteria 1b9a881, 결정 14): 대표 봇 `novice_sd50`. balance에 재조정 지시(B1·B5·B6·B7·L7 20회를 σ50 기준으로, 너무 쉬우면 곡선 상향, 몰입 위험 6 — L7·L10 4박 숨 고르기 — 재검토, 스키마·키 불변). 진행 중 dev에 전달(데이터만 나중에 다시 넣음).
- "요청자 결정 필요" 항목은 앞으로 팀이 근거를 남기고 스스로 정함 → 이후 모든 지시에 포함.
- 인사이트 수신(tcg-01, f280bca): 봇 실력 2단계 이상으로 난이도 보기 → 진행 중 balance에 전달. 원본 보호 grep에 공식 한국어 번역어 포함 → round-3 QA·리뷰 지시에 넣음(GD·DJMAX 한국어 판정·용어명).

## game-developer 새 코어 "북길" 빌드 감시 — 통과(검사 2건 미완), 허브 갱신
- diff: `games/rhythm-01/`(js road·readout 신규, render·engine·audio·main·store, index·style, data 전체 재생성 — 옛 카드 4파일 삭제·cards-r3 반영), `tools/build-web-data·selfcheck-sim·selfcheck-browser·serve`, DEV_NOTES, 보고서, README 한 줄. 기획·levels·assets·verify·sim·qa-round·harness·games.json 미수정, git 미사용, 8340~8379 자기 PID만.
- 직접: validate OK, judge.js = judge.mjs, 외부 URL 0. 자체: selfcheck-sim 8175/8175, selfcheck-browser 1건 빼고 통과(R11 보정 +15 ms, 부하 추정), 콤보 켬/끔 불일치 0, 판정 % 빌드 = 기준 49만 점 다름 0, NaN 창 시작 오류.
- 미완: (1) 성능 1% low 3/12~6/12 — PC 부하 평균 66.5 %, 대조 페이지도 실패라 판정 불가 → QA가 부하 낮은 때 재측정. (2) verify-levels 전체·C2 — balance 12세 재조정 진행 중이라 멈춤 → 재조정 뒤 데이터 다시 넣고 재실행.
- 판단: 빌드는 동작 상태(테스트 모드 40/40·실시간 10/10)라 요청자 중간 플레이용으로 허브에 올림. 데이터는 재조정 전 v3 스냅샷.

## 요청자 새 지시 (메인 세션 전달) — 콤보 파격 연출 (criteria 131aa6a)
- 내용: STATUS "콤보 파격 연출" 절. round-3 QA 전이라 이번 빌드 범위에 포함(balance 12세 재조정과 병렬로 art 규격 → 이후 dev가 데이터 재반영과 함께 구현). 30-art 16-4(점 10칸)·16-8(콤보 숫자 금지) 대체.
- 인사이트 수신(flow-01, 8485b81): (1) 판정 대상 4개 이하 레벨 몰림 한도 max(30 %, 1.5/개수) — rhythm-01 레벨은 별 18~28개라 해당 없음. (2) 생성기로 만든 레벨의 검증기에 생성용 가지치기를 넣지 말 것 — `tools/sim/path.mjs`(생성)와 `verify-levels.mjs` N1~N11(검증)이 같은 가지치기·가정을 공유하지 않는지 round-3 balance 리뷰·QA 지시에 넣음.
- 같은 인사이트 메인 세션 재전달: QA 때 verify-levels·판정 기준 함수가 빌드·생성 코드와 가정을 공유하지 않는지 확인. 주의: `js/judge.js`는 `tools/sim/judge.mjs`와 바이트 동일(설계상 공유) → round-3 QA는 판정·%·N 규칙을 criteria 문장만 보고 **독립 구현**해 전수 대조(round-2 보정 3자 대조와 같은 방식).

## balance 12세 재조정 감시 — 통과 (2026-11-18)
- diff: levels/01~10(`chunks_r3b_deprecated` 보존), balance.json(새 키 `bots.representative`·`verify.rep_limits`, 바뀐 값은 `_r3b_deprecated` 보존), verify-levels(판정 봇 → 대표 봇 σ50, σ70은 INFO), bots.mjs 덧붙임만, 20-balance 18장, 보고서, README 한 줄. 빌드·judge·calib·harness 미수정, git·서버 미사용.
- **직접 전체 실행: 종료 0, FAIL 0, ALL PASS.** 대표 봇 연속 중앙값 1.738 → 10.916, B6 T 11.05 [8.84, 13.26] −1.2 %, 시드 10개 −7.7 ~ +2.7 %, L7 7회, 최대 1.52배. 별 29~69개, 길이 39~44 s. L7·L10 4박 숨 고르기 축소(덩어리 간격 L10 2.31 → 1.74 s) — 몰입 위험 6 완화.
- 위험(major 후보, round-3 리뷰에서 판단): 곡선이 "처음 보는 무늬 비용" 가정에 크게 기댐(비용 없으면 L10 3.64). σ70은 L3부터 한도 초과 — 결정 14의 대가로 기록.
- 사용 한도 정지(약 03:00) → 요청자 "한도 해제되었습니다 이어서 진행하세요. 모든 스레드에 내용 전파해주세요" → art 콤보 연출 재개, 연결 세션 5개(마스터·Tossaloft·Pairpaint·Ebbwrit·Reverbound)에 재개 전파.
