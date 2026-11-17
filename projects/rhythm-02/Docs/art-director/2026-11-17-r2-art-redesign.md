# r2 1-1 아트 재설계: 흘러오는 길 · 콤보 · round-1 이슈

- 날짜: 2026-11-17
- 역할: art-director
- 프로젝트: rhythm-02
- 단계: round-2 1-1 수정(기획 3역할 병렬)

## 요청 받은 일
오케스트레이터가 요청자 검수 피드백("지오메트리대시처럼 몰입감… 오른쪽에서 다가오는 여러 패턴으로 짧은 순간 판단… 리스크가 반복적이지 않게")과 전 프로젝트 지시("디제이맥스 노트 터치 검사를 벤치마크해 콤보 시스템")에 맞춰 30-art round-2, assets(팔레트·배치·소리·카드·물체·아이콘), tools/art 검사 갱신, rhythm-01 구분·runner-01 관계 표, round-1 art 이슈(M2·N3·N4·N5·N10~N13 등) 처리를 요청.

## 한 일
1. **화면 구성**: 북·공 0.30 W 고정, 바닥 띠 안 길 줄(floorTop + 0.6d) 위로 박 표시가 흐르고 북 가운데 **다리**가 그 줄까지 내려옴(표시가 다리 밑 = 접촉). 4해상도 앞쪽 4박/3.5박, 1박 63~256 px, 가장 짧은 표시 간격 36 px(360x640) ≥ 32. HUD 띠(세로 56, 가로 48 px)를 정하고 **흘러오는 모든 물체·보이는 공·배경 실루엣 윗선 ≥ HUD 띠 아래**로 M2를 일반화(30-art 4-1 허용 문장 삭제).
2. **물체 실루엣(기능별)**: W0 박 표시 = 반원 돔(북 몸통 색), W1 큰 통·W3 점 통 = 물체 없이 표시 간격, W2 구름 = 긴 구름(촘촘한 혹, 윗선 HUD 띠 아래·아랫선 구름선 + 0.3d), W4 지붕 = 줄무늬 차양(둥근 윗변·물결 아랫변, 보라 `#6B3E8E` 바탕 대비 ≥ 5.18), W5 낮은 가지 / W7 긴 가지 = 가로 줄기 + 렌즈 잎(같은 모양, 길이만 다름), W6 큰 언덕 = 반타원 뒤 층, 끝 구름 = 클리어. 가시·네모 블록·발판·고리·포털·음표 없음, rhythm-01 궤도·별·북채 없음.
3. **지붕 "치지 마"를 글 없이·겁주지 않게**: 지붕 밑 접촉엔 표시 없음 + 공이 앉아 까딱·콩(받침 쉼과 같은 쉼 상태) + 차양 모양 + 착지 박 소리 0(곡 규칙 `onset_rule.roof`) + 쳐도 부드러운 "퐁"(`roof_bump`) + 카드는 손이 바닥에서 떨어진 그림.
4. **콤보 표시**: HUD 띠 안 점 10칸(ink/흰 네모) + 10마다 큰 표지(glow 둥근 네모), 콤보 2부터, 세로 3줄째 왼쪽·가로 2줄째 오른쪽. 단계 5(칸 1.3배)·10(빨려 들어감 0.4 s + `chord_1`)·20(+ HUD 띠 안 색 조각 0.6 s + `chord_2`), 끊김 = 0.25 s 소리 없이 작아짐. 공 색·바탕 단계 모양과 겹치지 않음. 레벨 카드에 최고 콤보 금빛 네모 0~2.
5. **소리(N3·E2)**: `noise_gen` lcg32(빌드와 같은 식), `music.mjs`에 `noteOf`·`allNotes`·`lcg32Noise`·`peakDb` 공용화, 곡 전체 음 높이로 측정, 짧은 어택 3개 1 → 4 ms. **빌드 audio.js를 Chromium OfflineAudioContext로 직접 렌더**해 크기 원본(`verify.build_render`)을 채웠고, 그 과정에서 Chromium 오실레이터가 1/4 주기 위상에서 시작함을 찾아 도구에 반영 → 도구 ↔ 빌드 차 17개 소리 최대 0.55 dB(round-1 2.7 dB). 새 소리 `roof_bump`·`chord_1`·`chord_2`, 지붕 밑 쉼 곡 규칙.
6. **카드 8장 × 2판**(키 = balance v2 gimmicks = lore strings, 일치 확인) 새 테마로 다시 그림, 칸 안 bbox 검사 추가(N12). 레벨 카드 10장 대표 모양 갱신, 아이콘 `unlock_sound` 추가(N20), 결과 목업 끝 구름 clearCloud(N11).
7. **팔레트**: L5 마을·L6 웅덩이 테마 교체, 물체 공통 색·`clearCloud`·`hill`, 실루엣 v2(anchor floor/sky, parallax, 위험 물체 닮은 모양 제거 — L5 집에 지붕 없음, L7 배경 언덕 제거), 375쌍 대비 통과.
8. **tools/art 검사 갱신**: palette(물체 색·실루엣 형식), layout(HUD 띠·콤보 자리·구름 덮음·보이는 공·실루엣 윗선·글 자리·손가락 4해상도, v2 물체 윗선·밑 공간·구름 덮음·한 화면 상한, 표시 간격 ≥ 32 px, 끝 구름, 바탕 단계), cards(칸 안·키·공 ≥ 16 px), sound-check(빌드 대조·화음 ≤ 탭 −1 dB·지붕 밑 쉼·S9), check-all.
9. 30-art 전면 갱신(0~17절), rhythm-01 구분 표 갱신(10-1) + runner-01 관계 표(10-2).
10. 바탕 단계 규칙을 1 + round(2(n−1)/(P−1))로 바꿈(balance v2 L7이 받침 쉼 2개라 bg3에 못 가던 것을 검사가 잡음).

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-02/30-art.md` | round-2 아트·사운드 디렉션 전면 갱신 |
| `projects/rhythm-02/assets/palette.json` | schema 2: 물체 색, clearCloud, hill, 실루엣 v2 |
| `projects/rhythm-02/assets/layout.json` | schema 3: HUD 띠·콤보·세계(길·표시·지붕·가지·언덕·구름)·손가락 왼쪽·text_slots.tut_tap·early_hold·bump_roof·바탕 단계 |
| `projects/rhythm-02/assets/sound.json` | schema 2: noise_gen, 어택 4 ms, roof_bump·chord_1/2, onset_rule.roof, verify.build_render(빌드 렌더 원본) |
| `projects/rhythm-02/assets/cards/*.svg` | 카드 8장 × 가로·세로(card_twoballs 예비 유지) |
| `projects/rhythm-02/assets/obj-{mark,roof,branch,branch-long,hill,combo}.svg` 등 | 새 물체·콤보·실패 3종 기준 그림 |
| `projects/rhythm-02/assets/icons/icon-unlock_sound.svg` | 소리 잠금 풀기 그림 |
| `projects/rhythm-02/assets/mockup-*.svg` | 플레이 목업 2(L5 지붕·L1 손가락), 레벨 선택·결과 등 |
| `projects/rhythm-02/tools/art/*.mjs` | palette·layout·cards·icons·music·sound-check·check-all 갱신 |

## 검증 결과
- `node tools/art/check-all.mjs` → **palette OK · layout OK · cards OK · icons OK · sound-check OK (대기 0)** — balance v2 레벨 10개(objects 272개)·balance.json v2·lore strings.json으로 실행.
- 대비 375쌍 통과(지붕 / 바탕 최소 5.18, 공 / 바탕 4.93).
- 4해상도: 가장 짧은 표시 간격 36.0 / 41.2 / 64.0 / 128.0 px, 구름 덮음(640x360 공 윗점 58.1 ≥ 덮는 선 52.5), 보이는 공 윗점 ≥ HUD 띠, 실루엣 최고 윗선 ≥ HUD 띠, 지붕 밑 공간 최소 0.80d·가지 밑 0.26d(≥ 0.25d), 콤보 HUD 띠 안·시도 점과 떨어짐, `tut_tap` ko·en 줄 수·길 영역 밖, 손가락 북 왼쪽.
- 카드 속 공 16.7~42.0 px(≥ 16), 칸 안 bbox 8장 × 3칸 통과.
- 소리: 빌드 렌더(Chromium, 포트 8735 로컬 정적 서버 + 브라우저 창) 원본 기준 탭 − 다른 효과음 +7.91 dB, 탭 − 콤보 화음 +10.46 dB, 도구 ↔ 빌드 최대 0.55 dB, 탭 RMS − 곡 박 +8.70 dB, 합 최고 −3.71 dBFS, 곡 음 ∩ 놓침 구역 0, 지붕 착지 ±1박 곡 음 0.
- 시각 확인: 목업·카드·레벨 선택·물체 SVG를 브라우저(포트 8734)로 띄워 확인 → 지붕 카드 손 위치, 가지 길이, 카드 길 간격(4 → 2.5박)을 고침.
- 서버 2개(PID 13712·12176, 내가 띄운 것만) 종료 확인, 포트 비어 있음.
- 못 한 검사: 실제 빌드 화면 스크린샷(round-2 빌드 전), 실기기 엄지 가림.

## 규칙 준수 확인
- [x] 원본 보호 (GD·runner-01 물체 모양 없음, 음표·노트 막대 없음, rhythm-01 궤도·별·북채 없음, 소리 자체 합성)
- [x] 게임 선정·설계 원칙 (탭 1가지, 기본 도형·평면, 글 없이 구분)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정(30-art.md, assets/, tools/art/, Docs/art-director/, Docs/README.md 한 줄), git 커밋·푸시 안 함. 20-balance·balance.json·levels·tools/sim·verify-levels·10-lore·strings.json·games/는 읽기만

## round-1 이슈 처리표
| # | 내용 | 처리 | 남은 것 |
|---|---|---|---|
| M2 (E4) | HUD 막대가 구름을 가로지름 | 허용 문장 삭제, 고정 구름 제거, 모든 물체·실루엣·보이는 공 윗선 ≥ HUD 띠 아래 + 4해상도 × v2 물체 검사 | 빌드 스크린샷 확인(1-5) |
| N3 (E2) | 소리 표 원본 ≠ 빌드 렌더(최대 2.7 dB) | lcg32·noteOf 공용·곡 전체 음·어택 4 ms·오실레이터 위상(Chromium 실측)·`verify.build_render` = 빌드 렌더, 차 최대 0.55 dB | dev가 빌드 audio.js noteOf를 music.mjs import로 바꿈, QA round-2 재렌더 |
| N4 | 이른 통과 탭에서 공이 멈춘 북에서 혼자 튐 | 북 올라간 자세를 접촉 시각까지 유지(`tap_motion.early_hold`) | dev 구현 |
| N5 (E5) | 640x360 반박 꼭짓점 29~32 px | 세로 공간 여지 없음 확인(바닥 40·HUD 48 최소), 가지 물체·표시 간격 64 px가 정보 보강. Hp 결론은 balance | balance |
| N10 | `tut_tap` 글이 구름 외곽선을 가로지름 | `text_slots.tut_tap`(세로 바닥 띠·가로 북 왼쪽 칸), 가장 긴 언어 × 4해상도 검사 | − |
| N11 | 결과 화면 구름이 등급 칸과 같은 색 | `clearCloud` = cloud·accent 35 %, 대비 ≥ 2(2.89) 검사 | − |
| N12 | 세로판 카드 구름 잘림 | 카드 다시 그림 + 칸 안 bbox 검사 | − |
| N13 | L6 시소 판이 떠 있음 | 실루엣 v2 anchor(바닥 dy 0), L6 테마가 웅덩이로 바뀌어 시소 제거 | − |
| N14 | 전환 프레임 미확인 | 30-art 14절 X-T에 round-2 전환 목록 추가 | QA 1-4 |
| N20 | `audio_unlock` 그림 힌트 없음 | `icon-unlock_sound`(스피커 + 손가락) | dev 배치 |
| (art 리뷰 1~7) | 위와 같음 | | |

## 다른 팀에 줄 인사이트 (인사이트 후보)
- [rhythm-02·2026-11-17] **Chromium OscillatorNode(sine·triangle)는 시작 표본이 1/4 주기(꼭대기 쪽) 위상에서 나온다**(830.6 Hz 첫 표본이 cos와 맞음). node 합성 검사를 0 위상으로 짜면 배음이 있는 소리에서 빌드 렌더와 최대 2.6 dB 어긋난다 — 잡음 생성기·음 높이 집합보다 큰 원인이었다. 도구 위상을 0.25로 두자 17개 소리 차 ≤ 0.55 dB. 근거: projects/rhythm-02/tools/art/sound-check.mjs `OSC_PHASE0`, assets/sound.json verify.build_render. 적용: art-director(소리 검사 도구), qa-engineer(렌더 대조)
- [rhythm-02·2026-11-17] 소리 크기 원본을 빌드 렌더로 하려면 QA를 기다리지 않아도 된다: 빌드 audio 모듈을 그대로 import 하는 빈 페이지를 로컬 정적 서버로 띄우고 브라우저 창에서 OfflineAudioContext로 렌더하면 art 단계에서 원본 값을 채울 수 있다. 근거: 이 보고서 검증 결과. 적용: art-director, qa-engineer
- [rhythm-02·2026-11-17] 흘러오는 코어에서 "반대 행동"(치지 마) 물체는 **표시를 지우고 이미 아는 쉼 상태(앉아서 까딱 + 콩)를 그 밑에 두면** 글 없이 읽히고 겁주지 않는다. 경고색·뾰족함 대신 차양처럼 "그늘·쉼터" 사물을 쓴다. 근거: projects/rhythm-02/30-art.md 3-2. 적용: art-director, lore-writer
- [rhythm-02·2026-11-17] 흘러오는 물체의 겹침 검사는 "물체 x 범위 ± 공 반지름" 안의 모든 비행 공 윗점으로 한다. 물체 그림에 장식 여유(좌우 +0.4d)를 더하자 앞 긴 비행이 가지 끝을 스쳐 밑 공간이 음수가 됐다 — 이유 물체는 데이터 박 범위 그대로 그린다. 근거: projects/rhythm-02/tools/art/layout.mjs worldChecks. 적용: art-director, balance-designer
- [rhythm-02·2026-11-17] 바탕 진행 단계를 "n번째 쉼 = min(n, 3)"처럼 쉼 개수에 묶으면 레벨 재설계로 쉼이 2개가 된 레벨이 마지막 단계에 못 간다. 쉼 개수로 나눈 비율(1 + round(2(n−1)/(P−1)))로 정의한다. 근거: 이 보고서 한 일 10. 적용: art-director

## 문제·남은 일
- minor (balance): 17절 X-B1 클리어 멈춤 감속, **X-B2 콤보 화음이 19번 중 13번 다음 접촉과 같은 순간**(공통 문서 4-4와 다름), X-B3 바탕 단계 식, X-B4 가지 아랫면 빠듯(360x640 0.26d), X-B5 W1·W3 물체 없음 확인, X-B6 layout.json 키 이동(`hud.band_h`).
- minor (lore): X-L1 `tut_tap` 자리 줄 수, X-L2 표시·지붕 이름 유지 가능.
- minor (game-developer): music.mjs noteOf·lcg32Noise import, layout schema 3·palette schema 2 반영, 세계 되감기 컷, 이른 통과 북 유지, 물체·콤보 미리 그리기.
- minor (qa-engineer): round-2 빌드로 소리 재렌더, 전환 프레임 스캔(X-T), 엄지 가림 실기기 확인(A-1).
