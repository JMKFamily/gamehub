# runner-01 (Reverbound) 인수인계

이전 세션에서 1-2 교차 리뷰까지 끝냈습니다. 새 세션은 이 문서와 `CLAUDE.md`, `harness/PIPELINE.md`, `STATUS.md`를 읽고 이어갑니다.

## 현재 상태 (2026-11-16)

| 단계 | 상태 | 산출물 |
|---|---|---|
| 1-0 벤치마크 | 완료 (수치 일부 추정치) | `00-benchmark.md` |
| 1-1 기획 | 완료 | `10-lore.md`, `20-balance.md`, `balance.json`, `levels/*.json`, `30-art.md`, `assets/*.svg` |
| 1-2 교차 리뷰 | 완료 | `reviews/cross/*.md`, 레벨 검증 `node projects/runner-01/tools/verify-levels.mjs` ALL PASS 3/3 |
| 1-3 웹 빌드 | **시작 전** (이전 세션에서 착수 직후 중단, 생성된 파일 없음) | `games/reverbound/` 예정 |
| 실측 벤치마크 | **별도 로컬 세션에서 진행 중** | `benchmark/measurements.md`로 푸시될 예정 |

확정값: 게임 이름 Reverbound (잔향 질주), slug `reverbound`, 레벨 이름 새벽 조율장 / 줄다리 야시장 / 폭풍 종탑.
우선순위: 데이터 파일(`balance.json`, `levels/*.json`)과 `10-lore.md` 확정값·문자열 테이블 > 문서 서술.

## 다음 할 일

1. **1-3 웹 빌드**: `game-developer` 에이전트에게 아래 "빌드 지시"를 그대로 맡깁니다.
2. **1-4 QA**: `qa-engineer`가 `reviews/round-1/`에 스크린샷, `metrics.json`, `qa.md` 작성.
3. **1-5 리뷰**: benchmark-analyst, balance-designer, art-director, lore-writer 병렬 리뷰·채점.
4. **1-6/1-7 집계·게이트**: `harness/criteria.md` 기준(가중 8.0 이상, 영역 6.0 이상, blocker 0). 통과 시 Pages 배포 + 아티팩트로 검수 페이지 게시 후 요청자에게 알림. 미통과 시 round-2.
5. **실측 반영**: `benchmark/measurements.md`가 푸시되면 benchmark-analyst가 `00-benchmark.md`를 실측값으로 갱신 → balance-designer가 `balance.json`·레벨 재검증 → 빌드 반영.

## 남은 사소한 문서 불일치 (round-1 리뷰에서 처리)

- lore: `tut_tempo` 문구(첫 템포 문은 느려짐), `tut_hold` 사용 구간 없음, 위험·템포 문·고리 색 힌트 문구
- art: 30-art.md의 x↔스텝 변환식이 속도 변경 레벨(3번)에서 틀림, 느림·보통 복귀 게이트 음악 규칙, 레벨 3 무드 문구
- dev: 공중 천장 장애물의 매다는 줄 구현

## 빌드 지시 (game-developer에게)

`.claude/agents/game-developer.md` 지침을 따르고, 다음을 만든다.

- 위치: `games/reverbound/` 정적 파일. 외부 요청 0, 빌드 도구 없음.
- 데이터: `projects/`는 Pages에 배포되지 않으므로 `games/reverbound/data/`에 `balance.json`, `levels/*.json`, `strings.json`(10-lore.md 문자열 테이블 변환)을 복사해 fetch. 복사 스크립트 `projects/runner-01/tools/sync-data.mjs` 작성.
- 물리: 240Hz 고정 스텝 + 렌더 보간. `tools/verify-levels.mjs`와 같은 규칙. 가능하면 물리 스텝을 공통 모듈로 분리해 검증기와 공유(고치면 검증기 ALL PASS 유지).
- 화면: 가로 기준, 세로 폰은 레터박스 또는 `rotate_hint`. 360x640에서 HUD 잘림 없음.
- 기능: 타이틀, 레벨 선택(잠금 해제), 진행도 % 바, 시도 횟수, 자동 재시작(balance.json 값), 클리어 화면, 연습 모드(체크포인트), localStorage 저장(try/catch), visibilitychange 자동 일시정지, 음소거·화면 흔들림·효과음 설정, 튜토리얼 cues.
- 아트: 30-art.md 도형·팔레트로 Canvas 2D 직접 그리기 + 점프·착지·사망·클리어 이펙트.
- 사운드: 30-art.md 7장대로 Web Audio 합성 음악(BPM, 속도 게이트 연동)과 효과음. 오디오 시계 기준 동기화, 오프셋 보정 설정.
- 테스트 훅: `window.__game`(state, levelIndex, progress, attempts, loadLevel(i), step(dt), press(), release()), `?test=1`이면 오디오·랜덤 연출 끄고 step()으로만 진행.
- 광고: `ads` 어댑터(웹은 더미).
- 허브: `games.json`에 reverbound 등록, `node scripts/validate.mjs` 통과.
- 자체 확인: Playwright로 콘솔 에러 0, 360x640·1280x720 스크린샷 확인, `?test=1`에서 검증기의 완벽 입력열(없으면 내보내기 옵션 추가)을 재생해 세 레벨 클리어. 스크린샷은 `reviews/dev-selfcheck/`.
- 기록: `DEV_NOTES.md`.
