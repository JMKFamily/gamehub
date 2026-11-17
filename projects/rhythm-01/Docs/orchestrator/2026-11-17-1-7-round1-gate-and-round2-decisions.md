# 1-7 round-1 게이트 판단과 round-2 결정

- 날짜: 2026-11-17 · 역할: orchestrator · 프로젝트: rhythm-01 · 단계: 1-5 ~ 1-7 round-1

## 1-5 리뷰 감시
- 4역할 모두 자기 리뷰·보고서·README 한 줄만 수정, git·빌드·기획·harness·runner-01 미수정. 측정 서버는 각자 종료 보고.
- 점수: benchmark 7.0 · balance 7.0 · art 6.0 · lore 7.0 · qa 7.5 → 가중 6.925 (예비, 1-6 score.md에서 확정). blocker 0. **게이트 미통과** → round-2.

## round-2 결정 (R1~R10)
1. **R1 북채 퇴장 (결정 1 보완)**: "북채가 보이면 볼 차례, 없으면 내 차례"는 유지. 북채(+점선 궤도·점선 북)는 마디 끝이 아니라 **그 보여 주기 묶음의 마지막 보여 주기 별 + 0.5박**에 0.25박 동안 작아지며 사라지고, 어떤 경우에도 **다음 판정 별 놓침 구역 시작 전**에 다 사라짐(balance 상한). 두 마디 무늬(L6)는 묶음 기준. 손가락(tut_tap)은 북채가 다 사라진 뒤에만 나타남. 키: `teacher.mallet_hide_at: "last_show_star"`, `mallet_hide_after_beats: 0.5`, `mallet_shrink_beats: 0.25` (기존 키는 지우지 않고 폐기 표시). 검증기 S15 강화(손가락 창 ∩ 북채 창 = 0), S16 신설(북채 창 ∩ 모든 판정 별 [놓침 구역 시작, 통과 창 끝] = 0). 대안 "첫 별을 자리 2로"는 S7·12시 규칙을 깨서 기각.
2. **R2 손가락 누름 시작** 0.5박 → 0.25박 전(놓침 구역 밖).
3. **R3 B6 측정 정의**: 정수 중앙값이 L1 2/3 경계(51.9 %)에 걸려 목표가 19.8 ↔ 10.8로 뒤집힘. 요청자 지시 "L1~L3 곡선을 이어 간 L6"을 안정적으로 재기 위해 **연속 중앙값 ln 0.5 / ln(1 − p)**(p = 첫 시도 클리어율, 시뮬레이터 전체 실행 한 원천)으로 판정하고 정수 중앙값은 참고로 함께 적음. 목표는 다시 계산(balance 예비 T ≈ 13.7) → L4~L10을 그 목표에 맞게 재조정(30회·2배·L7 20회 한도 유지, 엄격 단조). 빌드 봇 값은 일치 확인용이며 B6 판정에 섞지 않음.
4. **R4 보정·밀림 계산 정의**: 빌드 `calib.js` 정의(선형 보간 사분위, 짝수 중앙값 평균, IQR 실패 시 그 회만 다시, D15 밀림 표본)를 기준으로 `bots.mjs`를 맞추고 20-balance 8-3~8-5 재측정. 빌드 수정 없음.
5. **R5 성능**: 6배 스로틀 1% low ≥ 45 (레벨 시작·재시작·DPR 3). 첫 그림(손가락·북채·카드) 미리 그리기 등 — dev.
6. **R6 화면**: 세로 카드 속 공 ≥ 16 px, 레벨 카드 "궤도→점→등급 북→이름" 겹침 0, 640x360 타이틀 손가락·글을 궤도 오른쪽, 기록 지우기 확인 창 아이콘(취소 = 왼쪽 화살표·기본 강조 / 지우기 = icon-reset·테두리만), 다시 보기 전용 `icon-card.svg`(D6 반려), 1280x720 손가락 크기 비례, 레벨 선택 카드에 최고 진행도 표시 — art 규칙, dev 구현.
7. **R7 소리**: art가 `assets/sound.json`을 원본으로 제공(D19 조건), 레벨별 2마디 멜로디 동기 10개, `calib_check_hz` 1046.5 Hz, 아이 탭이 모든 효과음보다 1 dB 이상 큼·탭과 둥둥이 RMS 차 6 dB 이상(층 합산 최고값 기준).
8. **R8 텍스트·aria**: 시도 수 `aria-valuenow`, 결과 화면 `grade_*`/`practice_clear` aria, `btn_settings`·`aria_checkpoint` 사용, 불러오기 화면 공 그림·↻ aria, L10 결과 → 버튼 그림과 동작 일치. lore는 10-lore 4절 문장을 R1에 맞게 수정.
9. **R9 지연 값 일치**: 자동 지연 표시값과 판정에 쓰는 값 갱신 시점을 하나로 — dev, DEV_NOTES 기록.
10. **R10 card_star_tap**: 카드 속 손가락 위치를 실제 화면(아래 엄지 받침)과 같게 — art.

## 진행 순서
- 병렬: qa-engineer 1-6 집계(score.md, criteria 추가) / balance·art·lore round-2 기획 수정.
- 그다음 game-developer round-2 구현 → 1-4 QA → 1-5 리뷰.

## 1-6 집계 감시 (qa-engineer)
- score.md: 가중 6.925, 게이트 실패(총점), 전 영역 6.0 이상·blocker 0 통과. 이슈 35 → 22건(major 5: M1 북채·손가락, M2 1% low, M3 B6 경계, M4 카드 공 16 px, M5 멜로디).
- `harness/criteria.md`: 12줄 덧붙임, `git diff --numstat` = 12 추가 / 0 삭제 직접 확인. 결정 R3(B6 연속 중앙값) 줄 포함.

## round-2 기획 수정 감시
- lore: `10-lore.md`(4절 R1 문장, 6-3, 7-10 사용 규칙 신설)만. 키 64 유지, 문구 변경 0 — 통과.
- art: `30-art.md`, `assets/`(sound.json 원본, sound-check.mjs, 카드 5장 R10 + 세로판 5장, icon-card, 목업 8). 외부 href 0, `palette.mjs --check` 통과, `sound-check.mjs` OK(멜로디 168음 중 별 시각 시작 0), 탭−둥둥이 RMS 6.40 dB — 통과.
- balance: `balance.json`, `levels/01`(press_from 0.25만)·`04~10`(무늬만 교체, 새 기믹·카드 0), `tools/sim/*`(calib.mjs 신설), `verify-levels.mjs`(S15 강화·S16·C1). 기존 키는 `_r1_deprecated`로 보존. **전체 실행 직접: 종료 0, FAIL 0, ALL PASS.** B6 연속 중앙값 L10 13.363 ∈ [10.96, 16.44](T 13.70, 배율 1.4849), B7 엄격 단조 — 통과.
- 다음: game-developer round-2 구현.

## 요청자 새 지시 전파 (메인 세션 경유, 2026-11-17)
- 개발 중 빌드 허브 게시: games.json rhythm-01 = "Tickadrum (개발 중)"·wip(커밋 722e926). 라운드 빌드 커밋마다 validate 통과 후 푸시, 깨진 중간 상태 푸시 금지, 게이트 통과 시 표시 제거.
- 전파: STATUS.md 기록, 진행 중인 game-developer에 SendMessage로 전달(빌드가 중간 상태일 때 커밋하지 않으므로 완료 전 `games/rhythm-01/`는 커밋 안 함), 이후 모든 에이전트 지시에 포함.

## 요청자 새 지시 전파 — 인사이트 공유 (메인 세션 경유)
- `harness/insights.md`에 rhythm-01 배움 12줄 덧붙임(`git diff --numstat` 12/0). 진행 중 game-developer에 insights.md 읽기 지시 전달, 이후 모든 에이전트 지시에 포함. 메인 세션에 덧붙임 알림.
- runner-01 인사이트 수신(insights.md 커밋 93f4d27, 44줄). rhythm-01 적용 판단: 재시작 1.08 s(이미 ±15 % 안), σ70 첫 레벨 우선(이미 적용), 2연속 장애물 예산(리듬 코어는 별 묶음 — balance 다음 작업 때 확인), 첫 프레임 미리 그리기·테스트 훅 화면=일반 모드(round-2 dev에 전달), 수동 체크포인트 금지(쉬는 마디 자동 체크포인트라 충족). 실측 안전 광고 수칙은 rhythm-01에 레퍼런스 실측이 없어 해당 없음.
- 프로세스 규칙(메인 세션 요청): 자기가 띄운 프로세스만 PID로 종료, rhythm-01 팀 포트 대역 8300~8399. round-2 dev에 전달, 이후 모든 지시에 포함.
- 커밋 방법 변경(CLAUDE.md "공유 체크아웃 커밋 방법", 10e05ff): autostash·stash·rebase·reset·checkout -- 금지. `git add <경로>` → commit → `git push -q || (git pull -q --no-rebase --no-edit && git push -q)`. 13:18 메인 세션 autostash 실패로 rhythm-01 미커밋 변경이 1~2분 HEAD로 돌아갔다가 복구됨 → 진행 중 dev에 파일 최신 여부 재확인 지시. 이 오케스트레이터 기록 파일은 끝 줄까지 남아 있음을 확인.

## round-2 구현 감시 (game-developer)
- diff 확인: `games/rhythm-01/`, DEV_NOTES, tools의 build-web-data·selfcheck-*, `reviews/round-1/dev-response.md`, 보고서, README 한 줄. 기획 데이터·검증기·qa-round·games.json·harness·runner-01 미수정.
- **규칙 위반 시도 1건(경미)**: 읽기 전용 `git diff --stat`을 실행하려다 권한 검사에서 차단됨(실행 안 됨), 본인이 보고서에 자진 기록. 결과물 영향 없음 → 다음 지시부터 "git은 읽기 전용 명령도 금지" 문구를 넣음.
- 직접 확인: `selfcheck-sim` 8127/8127 OK, `scripts/validate.mjs` OK, `js/judge.js` = `tools/sim/judge.mjs`(cmp 동일), 외부 URL 0.
- 남은 것: 1% low 12창 중 10~11창 통과(첫 브라우저 컨텍스트의 긴 프레임 1개) → round-2 QA에서 판정.
