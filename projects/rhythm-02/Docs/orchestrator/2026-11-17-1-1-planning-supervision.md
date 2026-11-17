# 1-1 기획 3역할 감시

- 날짜: 2026-11-17
- 역할: orchestrator
- 프로젝트: rhythm-02
- 단계: 1-1

## 요청 받은 일
1-0 코어 "통통 공받기"로 lore-writer·balance-designer·art-director 병렬 기획. 공통 블록(1-0 착수 기록 1~11번) + 진행 중 추가 지시 3건(rhythm-01과의 구분, runner-01 인사이트 93f4d27, 프로세스·포트 규칙)을 전파.

## 감시 결과
| 역할 | 보고서 | 직접 확인 | 판정 |
|---|---|---|---|
| lore-writer | Docs/lore-writer/2026-11-17-1-1-lore-plan.md | 10-lore.md·strings.json 79키 일치(에이전트 검사 PASS), rhythm-01 피한 용어 표 8절, 이름 가안 Tossaloft/높이통통(웹 검색만, 스토어·상표 미확인) | 통과 |
| balance-designer | Docs/balance-designer/2026-11-17-1-1-balance-plan.md | 오케스트레이터가 `node projects/rhythm-02/tools/verify-levels.mjs` 직접 실행: 235/235 PASS, 17 s. L1 1.80, r 1.483, T 12.91(10.33~15.49), L10 11.82, 최대 증가 1.63배, 30회 이하 | 통과 |
| art-director | Docs/art-director/2026-11-17-1-1-art-plan.md | 오케스트레이터가 `node projects/rhythm-02/tools/art/check-all.mjs` 직접 실행: palette·layout·cards·sound-check 4개 OK. rhythm-01 구분 표 30-art 10절(공 hue 7° vs 193°, 밝은 바탕, 납작 북 화면 아래, 궤도·별·북채 없음) | 통과 |

- 쓰기 경로: `git status`로 확인, 세 역할 모두 `projects/rhythm-02/` 안 자기 담당 파일만. 다른 프로젝트·harness 변경 0(남은 변경은 타 세션 것).
- 프로세스: art-director가 헤드리스 Edge로 SVG 렌더(서버·포트 없음, 스스로 종료). 남은 msedgewebview2는 데스크톱 앱 자체.
- 원본 보호·결제·광고·계정·git: 위반 없음. 되돌려 보낼 것 없음.

## 1-2로 넘기는 충돌·안건 (오케스트레이터 정리)
1. 카드 키 불일치: lore `card_bounce…card_fast` / balance `card_three`(L7 R1) / art 파일 `card_B1, card_G1…card_R1`. 한 곳(balance.json `gimmicks.<id>.card`)에서 매핑하고 lore `card_fast` → `card_three` 문구.
2. G6 빠른 곡 미사용 → art `card_G6` 처리, lore 키 정리.
3. 1-0 초안과 바뀐 수치: 놓침 구역 140 → 200 ms, L4 통과 폭 290, 구름선 0.9·Hp(공 아랫점 기준 정의 확인).
4. art X5 반박·점 통 배치 규칙 검증기 편입 여부, X6 바탕 단계 `phrases[].stage` 태그.
5. 640x360 반박 꼭짓점 0.88d (K1).
6. "구름" 낱말 다의(플레이 구름 / 등급 구름 1~3 / 실패 먼지 — art는 먼지 없음으로 받음).
7. 레벨 10 결과 화면 버튼 2개, 보호자 진입 방식(설정 길게 누르기), 소리 밀림 표지 사용 여부.
8. **rhythm-01과의 구분**(메인 세션 요청): 세 문서의 구분 절을 서로 대조해 화면·규칙·용어에서 차이가 분명한지 확인.

## 인사이트 후보 (보류, 빌드·QA 확인 뒤 insights.md에)
- lore: JSON·문서 일치 검사에 글자 수·금지어 검사 묶기, 프로젝트 간 피한 용어 표, 한 낱말 다의 검사.
- balance: 보고서 "인사이트 후보" 4건.
- art: 빨강+가로 막대 = 금지 표지로 읽힘, 곡 음 놓침 구역 자동 검사, 컴프레서 없이 크기 순서 보장, 가로 화면 가장 짧은 튐 높이부터 계산.
