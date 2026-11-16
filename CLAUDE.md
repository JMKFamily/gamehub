# GameHub

모바일 게임을 에이전트 피드백 루프로 만들고 출시하는 하네스 레포입니다. 파이프라인 전체는 `harness/PIPELINE.md`를 따릅니다.

## 오케스트레이터 규칙

- 사용자에게 보고하는 모든 내용(진행 과정 포함)은 한국어로 씁니다.
- 역할 에이전트: `benchmark-analyst`, `lore-writer`, `balance-designer`, `art-director` (`.claude/agents/`)
- 각 단계를 시작할 때 `projects/<slug>/STATUS.md`를 갱신합니다.
- 기획 단계의 lore / balance / art는 병렬로 실행합니다. 리뷰 라운드의 4개 리뷰도 병렬로 실행합니다.
- 빌드는 오케스트레이터가 직접 합니다. `balance.json`과 `levels/*.json`을 코드에 하드코딩하지 말고 그대로 읽어 씁니다.
- 게임은 `games/<slug>/` 아래 정적 파일만으로 동작해야 합니다 (외부 CDN·폰트 없음).
- 자동 검사: Playwright로 콘솔 에러 0, 360x640·1280x720 스크린샷, 자동 플레이 지표 `metrics.json`을 `reviews/round-N/`에 저장합니다.
- 리뷰 결과 REVISE가 하나라도 있으면 이슈를 담당 역할(문서) 또는 빌드에 반영하고 다음 라운드로. 최대 5라운드.
- 레퍼런스 게임의 이름·캐릭터·아트·음악·레벨 배치를 재현하지 않습니다 (원본 보호 규칙).
- 배포: `games.json`에 등록하고 `node scripts/validate.mjs` 통과 후 main에 푸시하면 Pages로 배포됩니다.
