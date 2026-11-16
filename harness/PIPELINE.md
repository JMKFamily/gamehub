# 게임 제작 하네스 파이프라인

에이전트들이 문서를 주고받고 서로 리뷰하는 피드백 루프로 게임을 기획 → 제작 → 검증 → 출시합니다.
오케스트레이터(메인 세션)가 단계를 진행하고, 각 역할 에이전트는 자기 산출물만 작성합니다.

## 역할

| 역할 | 에이전트 | 산출물 | 리뷰 관점 |
|---|---|---|---|
| 벤치마크 담당자 | `benchmark-analyst` | `00-benchmark.md` | 레퍼런스 대비 게임 감각·핵심 루프가 재현됐는가 |
| 세계관 작가 | `lore-writer` | `10-lore.md` | 이름·텍스트·테마가 세계관과 일관적인가 |
| 밸런스 기획자 | `balance-designer` | `20-balance.md`, `balance.json`, `levels/*.json` | 난이도 곡선·수치·플레이 지표가 목표대로인가 |
| 종합 아티스트 | `art-director` | `30-art.md`, `assets/` | 화면이 아트 디렉션대로 나오고 가독성이 있는가 |
| 오케스트레이터(빌더) | 메인 세션 | `games/<slug>/` 빌드, `reviews/` 정리 | 통합·빌드·자동 플레이 검사 |

## 단계

```
0. 벤치마크      benchmark-analyst → 00-benchmark.md
1. 기획(병렬)    lore-writer, balance-designer, art-director  (모두 00-benchmark.md를 입력으로)
1.5 기획 교차리뷰 각 역할이 다른 역할 문서를 읽고 충돌만 지적 → 수정 1회
2. 빌드          오케스트레이터가 문서대로 games/<slug>/ 구현
3. 자동 검사     Playwright: 콘솔 에러 0, 스크린샷, 자동 플레이 지표(metrics.json)
4. 리뷰 루프     4개 역할이 빌드 결과(스크린샷·metrics·코드)를 리뷰 → reviews/round-N/<역할>.md
                 REVISE가 하나라도 있으면 수정 후 N+1 (최대 5라운드, 넘으면 사람에게 보고)
5. 웹 출시       games.json 등록 → main 푸시 → GitHub Pages 자동 배포
6. 모바일 출시   Capacitor로 Android 래핑 → AAB 서명 → Play Console 내부 테스트 트랙 (아래 참고)
```

## 프로젝트 폴더 규칙

```
projects/<slug>/
  00-benchmark.md
  10-lore.md
  20-balance.md
  balance.json          # 물리·속도·판정 수치 (빌드가 그대로 읽음)
  levels/*.json         # 레벨 데이터 (빌드가 그대로 읽음)
  30-art.md
  assets/               # SVG 등 원본 에셋
  reviews/round-N/<역할>.md
  STATUS.md             # 현재 단계, 라운드, 미해결 이슈 (오케스트레이터가 갱신)
games/<slug>/index.html # 배포되는 빌드 결과
```

## 리뷰 형식 (모든 역할 공통)

`harness/templates/review.md`를 따릅니다. 마지막 줄은 반드시 `VERDICT: PASS` 또는 `VERDICT: REVISE`.
이슈마다 심각도(blocker / major / minor)와 담당 역할을 적습니다. blocker나 major가 있으면 REVISE.

## 원본 보호 규칙 (벤치마크 게임 공통)

- 가져오는 것: 장르, 조작 방식, 핵심 루프, 수치 감각(속도·점프 높이·판정 여유), 진행 구조, UX 패턴
- 가져오지 않는 것: 게임 이름, 캐릭터, 아트·아이콘 디자인, 음악·효과음, 레벨 배치, UI 고유 디자인, 텍스트
- 모든 역할은 리뷰 때 이 규칙 위반도 blocker로 지적합니다.

## 모바일 출시 (6단계) 준비물

자동화할 수 있는 부분과 사람이 한 번 해야 하는 부분이 나뉩니다.

- 사람이 1회: Google Play 개발자 계정, 앱 서명 키 생성·보관, Play Console에서 앱 생성, 서비스 계정 발급(Play Developer API)
- 자동화: Capacitor 프로젝트 생성 → `./gradlew bundleRelease` → GitHub Actions에서 서명 후 내부 테스트 트랙 업로드
- 키와 서비스 계정 JSON은 GitHub Secrets에만 둡니다. 레포에 커밋하지 않습니다.
