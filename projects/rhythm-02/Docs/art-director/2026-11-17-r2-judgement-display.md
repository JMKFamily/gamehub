# r2 판정 이름·퍼센트 표시 (자리·크기·색·모양, 결과 화면, 카드 박 점)

- 날짜: 2026-11-17
- 역할: art-director
- 프로젝트: rhythm-02
- 단계: round-2 (빌드 진행 중 추가 지시)

## 요청 받은 일
오케스트레이터가 요청자 지시(전 프로젝트) "판정 이름과 퍼센트까지 해주세요."를 전달. `harness/benchmarks/djmax-judgement.md` 7절, criteria 게임 감각 "판정 이름과 퍼센트 표시", balance 보고서 `2026-11-17-r2-judgement-pct.md`·20-balance 18절에 따라 30-art 판정 표시 절(자리·크기·색·모양), layout.json `judgement` 자리(4해상도), palette 판정 색, 결과 화면 목업(정확도 %·최고 콤보), 30-art 8절 `card_three` "셋 세고" → "셋에" + 카드 박 점 3개, tools/art 검사(겹침·크기·대비) 추가. `node projects/rhythm-02/tools/art/check-all.mjs` 통과.

## 한 일
1. **자리**: 북 옆, 공이 떨어지는 세로 줄을 비킨 **왼쪽(지나간 쪽)**. 오른쪽은 다가오는 길이라 쓰지 않음. HUD 띠 밖. 세로 = x 2 ~ 공 세로 줄 왼쪽 − 2, y = 지붕·가지 아랫면(0.34·Hp) + 4 ~ 튐 선·등급 반응 범위 위. 가로 = x 12 ~ 북 왼쪽 끝 − 4, y = 같은 윗선 ~ 손가락 윗선 − 4. 튐 상자 아랫변·오른쪽을 자리 아래·오른쪽에 붙이고 이름·%는 오른쪽 맞춤.
2. **크기**: 이름 max(28, round(0.9·d)) px(360x640·640x360 28, 412x915 29, 1280x720 40), % max(14, round(0.55·이름)) px(15/16/15/22 = 0.54~0.55배). 등급마다 같은 크기: 360 세로 자리 폭 87.8 px에 "딱이야" 28 px(87.0 px, Windows 맑은 고딕 실측 84.0 + 외곽선 3)가 꼭 맞아 더 키울 수 없음. 그래서 가로 튐은 min(1.15, 자리 폭 / 이름 폭)(360 세로 딱이야 1.01, 그 밖 1.13~1.15), 세로 튐은 1.15.
3. **색**: palette 새 토큰 `judgePerfect` #FFC861(= glow), `judgeGood` #B9EDC6(민트), `judgePass` #FFFFFF + ink 외곽선 3 px(paint-order stroke), %는 ink. 공 색·빨강·회색 안 씀.
4. **모양(색만으로 구분하지 않음)**: 이름 위 짧은 튐 선 딱 2쌍·좋아 1쌍·통과 없음 = 공 옆 튐 선과 같은 수. 기준 그림 `assets/obj-judgement.svg`.
5. 시간·바꿔 그리기·실패·클리어 사라짐은 balance `timing` 그대로 layout에 연결. hold·실패·받침 쉼 탭에는 표시 없음, 낭독 없음.
6. 30-art: 0절 표 한 줄, 1절 "판정 글자 팝업" 금지 줄 → "원작 판정 글자 디자인·이름 + % 붙임·실패 이름·0 %·빨강·번쩍이는 판정 글자" 금지로 고침, 2-1·2-3 색·대비, 4-5 가로 `tut_tap` 글 자리 아랫선(판정 상자 위로), 5-2 층 순서, **6-3 새 절**(표·4해상도 표·검사 설명), 7-3 결과 화면, 8절 `card_three` "셋에" + 박 점, 11-2·11-3·12·14(A-10·A-11)·15.
7. **결과 화면**(`mockup-result.svg`, `layout.json result_screen`): 구름 등급 아래 정확도 %(작은 북 + 다리 밑 표시 표지 28 px + 숫자 26 px, 신기록이면 금빛 꺾쇠 표지) → 최고 콤보(콤보 점 줄 표지 20 px + 숫자 18 px). 크기 순서 구름 등급 29.8 > 정확도 26 > 최고 콤보 18. 새 표지 아이콘 3개(`accuracy`·`best_combo`·`new_best`, 과녁·원형 고리·별·RATE 아님).
8. **card_three**: lore 문구는 이미 "큰 언덕은 셋에 톡"이었으나 카드 그림에 박 점이 없었음 → 칸 2에 길 아래 박 점 셋(공이 떠난 다음 박부터, 셋째 점 = 금빛·큼 = 표시 아래), 칸 3에 셋째 점이 북 다리 밑·손가락 자리. 플레이 길에는 박 눈금 없음(카드만).
9. **검사 추가**: `palette.mjs`(판정 글자 면 / ink ≥ 4.5, ink / bg1~3·언덕·실루엣 ≥ 4.5, 공 색·빨강·회색 아님, 세 색 다름), `layout.mjs`(`judgementStatic`: 크기·가장 긴 이름 폭·튐 상자 자리 안·HUD 띠·공 세로 줄·튐 선/등급 반응·북 톡·손가락·글 자리·콤보와 겹침 0, 4해상도 / `judgementWorld`: 레벨 v2 10개 × 4해상도 시간축 — 앞 hit 표시 [−이른 창, +550 ms] × 지붕·가지·구름·끝 구름·박 표시 겹침 0, 마지막 표시 < 등급 칸, 레벨 개별 아랫면 ≥ 기준), `cards.mjs`(card_three 박 점 셋), `icons.mjs`(결과 화면 크기 순서·정확도 표지 모양).

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-02/30-art.md` | 6-3 새 절 + 0·1·2-1·2-3·4-5·5-2·7-3·8·11·12·14·15절 수정, 머리 줄 |
| `projects/rhythm-02/assets/layout.json` | `judgement`(자리 식·크기·색 토큰·튐 선·튐·overflow·층·낭독)·`result_screen`, `text_slots.tut_tap.landscape` 아랫선 |
| `projects/rhythm-02/assets/palette.json` | `common.judgePerfect`·`judgeGood`·`judgePass`, `_rules` 한 줄 (테마 색 그대로) |
| `projects/rhythm-02/assets/obj-judgement.svg` | 판정 표시 기준 그림(3등급 × 한/영 × L1 bg1·L9 bg3) |
| `projects/rhythm-02/assets/mockup-play-360x640.svg` · `mockup-play-640x360.svg` | 판정 표시("딱이야 100%")·자리 보라 점선 |
| `projects/rhythm-02/assets/mockup-result.svg` | 정확도 %·최고 콤보·신기록 표지 |
| `projects/rhythm-02/assets/icons/icon-{accuracy,best_combo,new_best}.svg` | 결과 화면 표지 3개 |
| `projects/rhythm-02/assets/cards/card_three.svg` · `card_three_portrait.svg` | 박 점 셋 |
| `projects/rhythm-02/tools/art/{layout,palette,cards,icons,check-all}.mjs` | 생성·검사 추가 |

## 검증 결과
- `node projects/rhythm-02/tools/art/check-all.mjs` → 종료 코드 0: palette OK(478쌍 전부 통과, 판정 글자 면 / ink 최소 9.62, ink / 언덕 최소 7.14), layout OK, cards OK, icons OK(24개), sound-check OK.
- 판정 표시 4해상도(가장 긴 이름 딱이야/Wow!, strings.json = 권장안):

| 해상도 | 이름 / % px | 자리 x · y | 가장 긴 이름 폭 / 자리 폭 | 가로 튐 최대 |
|---|---|---|---|---|
| 360x640 | 28 / 15 | 2~89.8 · 352.9~425.2 | 87.0 / 87.8 | 1.009 |
| 412x915 | 29 / 16 | 2~103.4 · 506.5~625.8 | 90.0 / 101.4 | 1.127 |
| 640x360 | 28 / 15 | 12~149.6 · 220.7~310.9 | 87.0 / 137.6 | 1.150 |
| 1280x720 | 40 / 22 | 12~309.6 · 436.2~627.5 | 123.0 / 297.6 | 1.150 |

- 시간축: 해상도마다 hit 표시 234개 × 16,130점, 지붕·가지·구름·끝 구름·박 표시 겹침 0. 지나간 언덕 위(뒤 층) 77~210점은 정보. 음성 시험: 이름 크기를 90 px로 키우면 L5 첫 지붕(접촉 1 + 360 ms)에서 겹침 1,898건을 잡음 → 검사가 실제로 동작함.
- 실측: 브라우저(Windows, system-ui → 맑은 고딕)에서 목업 "딱이야" 28 px getBBox 폭 84.0 px = 추정 1.0em과 같음. Android(Noto Sans CJK KR)도 한글 1.0em이라 같다고 봄(실기기 미확인).
- 못 한 검사: 빌드 화면 스크린샷 대조(빌드 반영은 dev 몫), 아동 가독성.

## 다른 팀에 줄 인사이트
- 판정 표시 자리는 "판정 대상 옆"이라도 **세로로 지나가는 물체 줄(공 세로 줄)과 다가오는 쪽을 뺀 칸**으로 정하고, 그 칸 폭을 **가장 긴 이름 × 1.0em(한글) + 외곽선**으로 먼저 계산하면 "글자 ≥ 28 px"와 "튐 1.15배"가 동시에 들어가는지 바로 보인다(rhythm-02 360 세로는 꼭 맞아 가로 튐을 자리 폭으로 줄임). 시간축 겹침은 "표시 550 ms 동안 세계 물체 위치"를 10 ms 간격으로 대조하고, 상자를 일부러 키운 음성 시험으로 검사가 실제로 잡는지 확인한다. 적용: art-director(전 프로젝트), game-developer(measureText로 실제 폭 확인), qa-engineer.

## 규칙 준수 확인
- [x] 원본 보호 (원작 판정 이름·글자 모양·글꼴·색 배합·"이름 + %" 붙임·RATE 표기 안 씀, 과녁·원형 고리 표지 안 씀)
- [x] 게임 선정·설계 원칙 (기본 도형·단색·외곽선, 번쩍임 없음, 판정 창·클리어·30회 한도 불변, 실패 이름·0 %·빨강 없음)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정(30-art·assets·tools/art·이 보고서·Docs/README 한 줄), git 커밋·푸시 안 함, 서버 안 띄움

## 문제·남은 일
- minor / game-developer: 아래 "dev에 넘길 것" 반영(빌드는 `assets/layout.json`·`palette.json`·`strings.json` 다시 복사).
  - 판정 순간 `pctOf(L, g.i, g.e)`가 null이 아니면 `layout.json judgement` 식으로 자리 계산 → 이름(`judgement_display.names` → strings) + `<n>%` 그리기. 오른쪽 맞춤(x1), 상자 아랫변 = 자리 y1 − (튐 높이 − 상자 높이)/2 정렬, 튐 기준점 오른쪽 가운데, 가로 튐 = min(1.15, 자리 폭 / measureText 폭), 세로 1.15. 이름 위 튐 선 2·1·0쌍. 글자 면 `judgePerfect/Good/Pass` + ink 외곽선 3 px(paint-order stroke), % ink.
  - 새 판정이 오면 그 프레임에 바꿔 그림, 80/400/150 ms, 실패 0.3 s 안 콤보와 함께 사라짐, 클리어 HUD 페이드와 함께. hold·실패·받침 쉼 탭·지붕 밑 헛탭은 표시 없음. aria-hidden.
  - 실제 이름 폭이 자리보다 넓으면 그 이름만 줄이고 28 px 미만이면 콘솔 경고(`judgement.overflow`).
  - 가로 화면 `tut_tap` 글 자리 아랫선 = min(손가락 윗선, 판정 튐 상자 윗선) − 8.
  - 결과 화면: 구름 등급 아래 정확도(표지 `icon-accuracy` 28 + 숫자 26 px, 신기록 `icon-new_best` 14) → 최고 콤보(`icon-best_combo` 20 + 숫자 18 px), 일반 모드 클리어만, 시간·버튼 흐름 그대로.
  - 카드 `card_three` 그림 다시 복사(박 점).
- minor / qa-engineer: 360x640 스크린샷에서 "딱이야"가 공 세로 줄에 닿지 않는지, 튐 80 ms 중 잘림 없음, 지붕이 북을 덮는 동안 앞 hit 표시가 지붕을 가리지 않는지(30-art 14절 A-10·A-11).
- minor / 공통 문서: "글자 높이 ≥ 28 px"를 글꼴 크기(CSS px)로 읽었음(한글 잉크 높이 ≈ 0.85em ≈ 24 px). 잉크 높이 기준이면 360 세로 왼쪽 칸에 3글자 이름이 들어가지 않음 — 분석가·오케스트레이터 확인 필요.
