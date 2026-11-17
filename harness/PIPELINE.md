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
1-0 벤치마크      benchmark-analyst → 00-benchmark.md (먼저 "게임 선정·설계 원칙" 적합성 판정)
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
  Docs/                 # 에이전트별 작업 보고서 (아래 "작업 보고서 규칙")
    README.md           # 보고서 목록 (최신이 위). 보고서를 쓴 에이전트가 한 줄 추가
    orchestrator/  benchmark-analyst/  lore-writer/  balance-designer/
    art-director/  game-developer/  qa-engineer/
games/<slug>/           # 웹 빌드 (Pages 배포)
mobile/<slug>/          # 모바일 프로젝트
harness/                # PIPELINE.md, criteria.md, templates/, qa/, guides/
```

- 게임(프로젝트)마다 `projects/<slug>/` 폴더 하나로 따로 관리합니다. 한 프로젝트의 문서·데이터·도구·보고서는 다른 프로젝트 폴더에 섞지 않습니다. 여러 게임이 같이 쓰는 것만 `harness/`에 둡니다.

## 작업 보고서 규칙 (모든 역할 공통)

- 모든 에이전트(오케스트레이터 포함)는 작업 하나를 끝낼 때마다 `projects/<slug>/Docs/<역할>/<YYYY-MM-DD>-<단계>-<짧은 제목>.md`에 보고서를 씁니다. 예: `Docs/qa-engineer/2026-11-17-1-4-round1-qa.md`
- 형식은 `harness/templates/report.md`를 따릅니다 (요청 받은 일, 한 일, 산출물, 검증 결과, 규칙 준수 확인, 문제·남은 일).
- 보고서를 쓴 에이전트가 `Docs/README.md` 목록 맨 위에 한 줄(날짜, 역할, 단계, 제목, 링크)을 추가합니다.
- 산출물(기획 문서, 리뷰, metrics 등)은 원래 위치에 두고, 보고서에는 링크와 요약만 씁니다.
- 오케스트레이터는 `Docs/orchestrator/`에 요청자 지시 전파 내역과 에이전트 감시 결과(확인한 항목, 위반과 되돌려 보낸 피드백)를 남깁니다.
- 오케스트레이터는 에이전트 결과를 받을 때 보고서가 있는지 확인하고, 없으면 작업 미완료로 보고 되돌려 보냅니다.

## 리뷰 형식 (모든 역할 공통)

`harness/templates/review.md`를 따릅니다. 이슈마다 심각도(blocker / major / minor)와 담당 역할을 적고, 영역 점수(0~10)와 VERDICT를 씁니다.

## 게임 선정·설계 원칙 (모든 게임 공통)

1. **5~6세도 할 수 있는 아주 간단한 규칙**
   - 조작은 1~2가지(탭, 홀드, 좌우 드래그 정도)이고, 화면을 보면 바로 알 수 있어야 합니다.
   - 승패 조건은 한 문장으로 설명됩니다 (예: "가시에 닿지 않고 끝까지 가기").
   - 글을 읽지 못해도 플레이할 수 있어야 합니다. 튜토리얼은 그림·손가락 아이콘·시연으로 보여주고, 글은 보조로만 씁니다.
   - 규칙을 단순하게 유지하되 난이도 곡선(숙련 요소)은 있어도 됩니다. 단, 첫 레벨은 5~6세가 몇 번 시도해서 깰 수 있어야 합니다.
2. **아트 컨셉이 강하지 않은 게임만 벤치마크**
   - 레퍼런스는 기본 도형·단색·평면 그래픽처럼 특정 화풍·캐릭터 IP에 기대지 않는 게임에서 고릅니다. 재미가 아트가 아니라 규칙·조작감에서 나오는 게임입니다.
   - 우리 아트도 단순 도형과 또렷한 색 위주로 하고, 강한 세계관 화풍·복잡한 캐릭터 디자인을 넣지 않습니다.
3. 벤치마크 담당자는 1-0에서 위 두 조건을 먼저 판정해 `00-benchmark.md` 첫머리에 적고, 맞지 않으면 오케스트레이터에게 알려 레퍼런스를 바꿉니다.
4. 모든 역할은 리뷰 때 이 원칙 위반(설명 없이는 이해 못 하는 규칙, 글을 읽어야 하는 진행, 과한 아트 컨셉)을 major 이상으로 지적합니다.

## 원본 보호 규칙 (벤치마크 게임 공통)

- 가져오는 것: 장르, 조작 방식, 핵심 루프, 수치 감각(속도·점프 높이·판정 여유), 진행 구조, UX 패턴
- 가져오지 않는 것: 게임 이름, 캐릭터, 아트·아이콘 디자인, 음악·효과음, 레벨 배치, UI 고유 디자인, 텍스트
- 리소스는 전부 자체 제작합니다. 모든 역할은 리뷰 때 이 규칙 위반을 blocker로 지적합니다.
- **"게임 선정·설계 원칙" 예외 (2026-11-17 요청자 지시, tcg-01)**: tcg-01(Hearthstone 시스템 벤치마크 TCG)은 요청자 지시로 1번(5~6세 아주 간단한 규칙)과 2번(아트 컨셉이 약한 게임만 벤치마크)을 적용하지 않습니다. 세계관이 핵심이고 대상 연령은 1-1에서 정해 요청자에게 보고합니다. 원본 보호 규칙은 그대로이며(Hearthstone의 이름·영웅·카드 이름·카드 텍스트·아트·사운드·세계관 재현 금지, 시스템 감각만 벤치마크), criteria 게임 감각 절의 콤보·판정 퍼센트 지시(리듬용)도 적용하지 않습니다. 근거: `projects/tcg-01/STATUS.md`.
- **대상 연령 변경 (2026-11-17 요청자 지시)**: runner-01·rhythm-01·rhythm-02는 12세 정도, tcg-01은 18세로 합니다. flow-01과 새 프로젝트는 따로 정하지 않으면 5~6세 원칙을 따릅니다. 측정 기준은 criteria "대상 연령·단순성" 절의 결정 14를 따릅니다.
