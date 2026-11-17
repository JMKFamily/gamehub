# r2 판정 이름·퍼센트 수치

- 날짜: 2026-11-17
- 역할: balance-designer
- 프로젝트: rhythm-02
- 단계: round-2 (빌드 진행 중 추가 지시)

## 요청 받은 일
오케스트레이터가 요청자 추가 지시 "판정 이름과 퍼센트까지 해주세요."를 전달. `harness/benchmarks/djmax-judgement.md` 7절 공통안(% 계단·레벨 정확도·기록)을 rhythm-02 수치로 확정하고, 지붕 쉬기(nogo·hold)에 %를 줄지 정하고, judge.mjs 순수 함수와 검증기 검사를 더하라는 요청.

## 한 일
1. `balance.json`에 `judgement_display` 블록: % 계단 규칙(25 / 딱 / 좋아 3칸 / 통과 5칸, 이른·늦은 쪽 따로), 레벨별 칸 끝 표 `bands_by_level`(검증기가 계산과 대조), 등급 ↔ % 범위, 이름 키 3개(`grade_perfect_name`·`grade_good_name`·`grade_pass_name`), hold 규칙, 표시 시간(튐 80 / 유지 400 / 흐려짐 150 ms, 바꿔 그리기), 정확도 규칙(클리어 일반 모드 hit 평균 내림, 실패·연습 없음), 기록(`bestAccuracy`·`bestCombo`, 일반 모드만).
2. **지붕 쉬기 결정: % 없음·이름 없음·레벨 정확도 평균에서 뺌**(분모 = hit 접촉 수). 콤보 +1은 그대로. 근거: 탭 시각이 없어 "박과 가까움"이 정의되지 않음, 등급(gradeRating)도 hold를 뺌, 고정 100은 지붕 수만큼 정확도를 부풀리고(L9 약 +2.4 %) 지붕 착지 ±1박 신호 0(S9)과 부딪힘, 고정 낮은 값은 벌.
3. `tools/sim/judge.mjs` 끝에 순수 함수 5개 추가: `pctOf`·`pctBands`·`gradeOfPct`·`pctEvents`·`levelAccuracy`. 기존 함수는 한 글자도 안 바꿈(파일 끝에 덧붙임만). `judgement_display`가 없는 balance로도 같은 값(기본값 내장).
4. `tools/verify-levels.mjs`에 P1~P5 검사 + 정보 P6(봇 정확도 분포).
5. `20-balance.md` 18절 새로, 13절 표에 P1~P5 줄, 16절에 넘길 것 한 줄.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-02/balance.json` | `judgement_display` 블록 추가(다른 블록 그대로) |
| `projects/rhythm-02/tools/sim/judge.mjs` | % ·정확도 순수 함수 5개 추가 |
| `projects/rhythm-02/tools/verify-levels.mjs` | P1~P5 검사, P6 정보 |
| `projects/rhythm-02/20-balance.md` | 18절(계단·레벨 표·nogo 결정·이름 키·표시 시간·정확도·함수·검증) |

## 검증 결과
- `node projects/rhythm-02/tools/verify-levels.mjs` 전체 실행(약 152 s, 종료 코드 0): **검사 418개 중 PASS 418 · 대기 0 · FAIL 0 → ALL PASS**(이전 413 + P1~P5)
- P1~P5 모두 PASS: 0.01 ms 훑기 286,820점에서 단조·등급 ↔ % 불일치 0, 경계값 = 안쪽 칸, 비대칭 칸(예 L7~L10 이른 7 ms·늦은 11 ms), 완벽 입력 정확도 100(10레벨)·늦은 창 끝 입력 10, 켬/끔 봇 시도에서 판정·콤보 사건 같음.
- 기존 검사(B6·B7·B7q·C1b·K2·K3b 등) 값 그대로 — judge.mjs 기존 함수 불변.
- 기존 값 확인: B6 L10 12.251(T −0.5 %), B7 L3 3.884 … L10 12.251, B7q L10 7.684, C1b 동일 — 17절과 같은 값.
- P6(정보, 클리어 시도만): σ70 중앙값 L1~L3 80 %·L4~L10 78~79 %(10~90 백분위 71~86), σ25 모든 레벨 96 %. 공통 문서 7-2 참고 계산(σ70 약 80, σ25 96)과 같은 폭.

## 다른 팀에 줄 인사이트
- 판정 %는 "판정 결과 e에서 계산만"으로 두면 켬/끔 재판정 검사가 순수 함수 비교(결과 객체 JSON 동일 + % → 등급 = 판정 등급)로 끝나고 봇을 다시 돌릴 필요가 없다. 탭 시각이 없는 판정(rhythm-02 지붕 참기 같은 "참기" 성공)은 % 없음·정확도 분모에서 빼는 것이 등급 규칙과 같은 원칙이고, 고정 100은 그런 판정 수만큼 정확도를 부풀린다. 칸 경계는 나눗셈 대신 곱셈 비교로 두고 경계값·경계 + 0.001 ms를 검사하면 부동소수 어긋남이 없다. 적용: balance-designer(전 프로젝트), game-developer.

## 규칙 준수 확인
- [x] 원본 보호 (원작 판정 이름·"이름 + %" 표기 안 씀, 이름은 키만, 문구는 lore)
- [x] 게임 선정·설계 원칙 (판정 창·클리어·30회 한도 불변, 실패에 이름·0 % 없음, 참기에는 숫자 없음)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정, git 커밋·푸시 안 함

## 문제·남은 일
- minor / lore: `strings.json`에 `grade_perfect_name`·`grade_good_name`·`grade_pass_name`(ko·en) 확정. 결과 화면 정확도·최고 콤보 대체 글. 검증기는 아직 이 키를 검사하지 않음(lore 반영 뒤 V7b식 검사 추가 가능).
- minor / art: 자리(북 옆, 공 세로 줄 비킴, HUD 띠 밖, 두 공 없음)·크기(360 폭 이름 ≥ 28 px, % 0.5~0.6배 ≥ 14 px)·색(공 색 `ball` 금지, 대비 4.5:1), 30-art "판정 글자 팝업 금지" 줄 고치기, 4해상도 × 가장 긴 언어 겹침(지붕 덮기·가지·구름·text_slots), 결과 화면 배치(구름 > 정확도 > 최고 콤보).
- minor / dev: judge.mjs 마지막에 다시 복사. 판정 순간 `pctOf(L, g.i, g.e)`로 이름·%(hold는 그리지 않음), 새 판정에서 바꿔 그림, 클리어 때 `levelAccuracy(L, result, { practice })` → 결과 화면·`store.levels[id].bestAccuracy`/`bestCombo`(일반 모드만), 테스트 훅에 pct·accuracy 노출.
- minor / 공통 문서: djmax-judgement.md 7-2 표 "rhythm-02 L10 115/135"는 round-1 값(지금 125/145). 분석가·오케스트레이터에 알림.
