# 게임 제작 하네스 파이프라인

에이전트들이 문서를 주고받고 서로 리뷰하는 피드백 루프로 게임을 **웹 버전 → 모바일 포팅 → 수익화 → 모바일 출시**까지 진행합니다.
오케스트레이터(메인 세션)는 단계를 진행하고, 커밋·푸시하고, 요청자에게 보고합니다. 각 역할 에이전트는 자기 산출물만 작성합니다.

## 역할

| 역할 | 에이전트 | 작성 | 리뷰·채점 영역 |
|---|---|---|---|
| 벤치마크 담당자 | `benchmark-analyst` | `00-benchmark.md` | 게임 감각·핵심 루프 |
| 세계관 작가 | `lore-writer` | `10-lore.md`, 스토어 문구 | 세계관·텍스트 |
| 밸런스 기획자 | `balance-designer` | `20-balance.md`, `balance.json`, `levels/*.json`, 수익화 배치 설계 | 밸런스·레벨·광고 피로도 |
| 종합 아티스트 | `art-director` | `30-art.md`, `assets/`, 스토어 그래픽 | 시각·사운드 |
| 개발 담당 | `game-developer` | `games/<slug>/`, `mobile/<slug>/`, 워크플로 | (리뷰 대상, 이슈 처리 담당) |
| QA 담당 | `qa-engineer` | `metrics.json`, `qa.md`, `score.md`, `harness/criteria.md` | 기술 품질·안정성, 점수 집계 |
| 오케스트레이터 | 메인 세션 | `STATUS.md`, 커밋·푸시, 보고 | 게이트 판단 |

## 1단계: 웹 버전 제작 (피드백 루프)

```
1-0 벤치마크      benchmark-analyst → 00-benchmark.md
1-1 기획(병렬)    lore-writer, balance-designer, art-director
1-2 교차 리뷰     기획 3역할이 서로의 문서 충돌을 지적 → 각자 1회 수정
1-3 구현          game-developer → games/<slug>/
1-4 QA            qa-engineer → reviews/round-N/ (스크린샷, metrics.json, qa.md)
1-5 리뷰(병렬)    benchmark·balance·art·lore 4역할이 빌드 결과를 리뷰하고 0~10점 채점
1-6 집계          qa-engineer → score.md, criteria.md에 새 체크 항목 추가
1-7 게이트        harness/criteria.md 기준 충족? 
                    예 → 웹 배포(Pages) + 아티팩트로 검수 페이지 게시 → 요청자에게 검수 알림
                    아니오 → game-developer(와 해당 기획 역할)가 이슈 처리 → round N+1 (최대 5)
```

- 기준은 고정이 아닙니다. 라운드마다 발견된 문제 유형이 `harness/criteria.md`의 체크 항목으로 쌓이고, 다음 게임에도 그대로 적용됩니다.
- 검수 알림에는 Pages 링크, 아티팩트 링크(점수표·스크린샷·변경 이력 요약), 남은 minor 이슈 목록을 넣습니다.
- 요청자의 검수 피드백은 다음 라운드의 이슈로 들어가고, 요청자가 승인해야 2단계로 넘어갑니다.

## 2단계: 모바일 포팅

판단 기준 (game-developer가 `DEV_NOTES.md`에 근거와 함께 기록)

| 조건 | 결정 |
|---|---|
| 웹 빌드가 모바일 웹뷰에서 QA 성능 기준 통과, 필요한 네이티브 기능이 광고·결제·저장 수준 | **엔진 이식 없음** → Capacitor로 래핑해 바로 AAB/APK 생성 |
| 성능 기준 미달(물리·파티클 과다), 3D, 복잡한 네이티브 기능 필요 | 엔진 이식 (2D는 Godot, 3D·대형 프로젝트는 Unity 우선 검토) |

- Capacitor 경로: `mobile/<slug>/`에 Capacitor 프로젝트, `webDir`은 웹 빌드 복사본. Android 전용으로 시작합니다.
- 산출물: 디버그 APK(내부 확인용), 릴리스 AAB(스토어용).
- QA: 에뮬레이터 또는 실제 기기에서 기동, 터치 입력, 일시정지·복귀, 뒤로 가기 버튼, 화면 회전, 노치 안전 영역을 확인합니다.

## 3단계: 수익화

- 기본 구성: **AppLovin MAX**를 미디에이션으로 쓰고 Google AdMob을 네트워크로 붙입니다. 하나만 쓴다면 둘 중 하나를 선택합니다.
- 광고 배치는 balance-designer가 설계합니다 (예: N회 사망마다 전면 광고, 이어하기 보상형 광고, 플레이 중 배너 금지). 광고 피로도도 balance 리뷰 항목입니다.
- 코드는 `ads` 어댑터 하나로 감싸고, 키·광고 단위 ID는 Secrets에서 빌드 시 주입합니다.
- 계정 세팅 방법: `harness/guides/applovin-setup.md` (요청자가 직접 해야 하는 일)
- 개인정보: 동의(UMP/GDPR), Play Console 데이터 보안 양식, 광고 ID 권한, `app-ads.txt`를 함께 처리합니다.

## 4단계: 모바일 출시

목표는 프로덕션 배포까지 자동화입니다. 단, Google 정책상 사람이 최초 1회 해야 하는 게이트가 있습니다.

사람이 1회 (요청자)
- Google Play 개발자 계정 생성·본인 인증
- Play Console에서 앱 생성, 스토어 등록정보·콘텐츠 등급·데이터 보안·타깃 연령 작성
- 첫 AAB 수동 업로드 (API 업로드는 앱에 첫 빌드가 올라간 뒤부터 가능)
- 개인 개발자 계정이면 프로덕션 신청 전 비공개 테스트 요건(테스터 수·기간) 충족
- 업로드 키(keystore) 생성 후 GitHub Secrets 등록, Play Developer API 서비스 계정 발급 후 Secrets 등록

자동화 (GitHub Actions, `release-android.yml`)
```
태그 push (v1.2.3) → 웹 빌드 + QA 스모크 → Capacitor sync → bundleRelease → 서명
 → Play Developer API로 internal 트랙 업로드 → (승인 입력 또는 지표 통과 시) production 단계적 출시
```
- versionCode는 워크플로가 자동 증가, versionName은 태그에서 가져옵니다.
- 출시 노트는 lore-writer가, 스토어 스크린샷은 QA 스크린샷을 art-director가 다듬어 만듭니다.

## 프로젝트 폴더 규칙

```
projects/<slug>/
  STATUS.md             # 현재 단계, 라운드, 점수, 미해결 이슈 (오케스트레이터)
  00-benchmark.md  10-lore.md  20-balance.md  30-art.md
  balance.json  levels/*.json  assets/
  DEV_NOTES.md          # 기획과 다르게 구현한 점, 포팅 판단 근거
  tools/                # verify-levels.mjs 등 게임 전용 도구
  reviews/round-N/      # shots/, metrics.json, qa.md, <역할>.md, dev-response.md, score.md
games/<slug>/           # 웹 빌드 (Pages 배포)
mobile/<slug>/          # 모바일 프로젝트
harness/                # PIPELINE.md, criteria.md, templates/, qa/, guides/
```

## 리뷰 형식 (모든 역할 공통)

`harness/templates/review.md`를 따릅니다. 이슈마다 심각도(blocker / major / minor)와 담당 역할을 적고, 영역 점수(0~10)와 VERDICT를 씁니다.

## 원본 보호 규칙 (벤치마크 게임 공통)

- 가져오는 것: 장르, 조작 방식, 핵심 루프, 수치 감각(속도·점프 높이·판정 여유), 진행 구조, UX 패턴
- 가져오지 않는 것: 게임 이름, 캐릭터, 아트·아이콘 디자인, 음악·효과음, 레벨 배치, UI 고유 디자인, 텍스트
- 리소스는 전부 자체 제작합니다. 모든 역할은 리뷰 때 이 규칙 위반을 blocker로 지적합니다.
