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
