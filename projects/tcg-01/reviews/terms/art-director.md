# art-director: UX·용어 개정 전달 목록 (2026-11-18)

정본은 `30-art.md` 11절과 `art.json ux`입니다. 아래는 game-developer가 할 일입니다. 시작하기 전에 `projects/tcg-01/art.json`과 `assets/`를 빌드 `games/tcg-01/data/`에 다시 복사하세요.

## 1. 카드 유형 한눈 구분 (major — UX 게이트 대상)
1. 카드마다 `familyOf(card)`로 유형을 정합니다. 함수는 `tools/art/spec.mjs`에 있고, 규칙은 `art.json ux.family_rule`입니다. 결과는 draw·buff·debuff·strike·atkdraw 중 하나입니다.
2. 카드 그림을 `tools/art/assets.mjs`의 `cardSVG`·`tokenSVG`로 다시 생성합니다.
   - 이름 띠가 유형 색 + 무늬로 바뀝니다.
   - 그림 창 오른쪽 위에 유형 표지 34 px가 생깁니다(손패에서는 1.6배).
   - 필드 토큰에 위 6 px 유형 띠와 표지 24 px가 생깁니다.
   - 무기 카드에 가로 날밑이 생깁니다.
   - 빌드가 이 함수를 쓰지 않는다면 `art.json ux.families`(color·ink·badge·pattern)와 `ux.branch_glyph`로 같은 결과를 그립니다.
3. 수집·덱 빌더·팩 공개·확대 보기에도 같은 카드 그림을 씁니다.
4. 종류 줄 글: "소환수/주문/무기 · 부류 또는 세력"(새 용어).
5. 키워드 굵게 표시와 아이콘 매칭은 새 키워드 이름(`art.json palette.keywords[].ko`: 등장·방벽·튕겨내기…)으로 합니다.

## 2. 정보 위계·손패 비교
1. 손패 카드에서 이름은 숨기고 비용·스탯·유형 표지를 크게 둡니다(30-art 3-2·11-3).
2. 손패 탭 → 펼침. 세로는 2줄 × 5, 가로는 1줄 × 10입니다.
   - 펼침에서는 이름 한 줄을 다시 보입니다.
   - 정렬 버튼 48 px로 비용순 ↔ 유형순을 바꿉니다(`ux.hand_compare`).
3. 낼 수 있는 카드는 4 px 들림 + 주황 2 px 테두리, 낼 수 없는 카드는 명도 60 %.

## 3. "왜 안 되는지" 피드백 (`ux.deny_feedback`)
1. 공통 동작
   - 시도하면 ≤ 100 ms 안에 카드가 5 px·120 ms 흔들립니다.
   - `ui_deny` 소리를 냅니다.
   - 180 ms에 카드를 제자리로 되돌립니다.
2. 이유 10가지마다 정해진 요소를 빛나게 하고, 그 옆에 이유 칩을 1.2 s 띄웁니다.
   - 칩 모양: 바탕 #2A1712, 테두리 #FF6F5E, 글 13 px.
   - 이유별 빛나는 요소는 30-art 11-4 표를 따릅니다.
3. 시도 전에도 "미리" 표시를 상시로 둡니다(같은 표).
4. 키 `toast_no_target`은 10-lore에 없습니다. lore-writer에게 새 키를 요청했고, 그 전까지는 칩 없이 ⊘만 표시합니다.

## 4. 튜토리얼·메뉴 안내·용어 사전
1. 패널 자리: `art.json ux.tutorial_layout["WxH"].slots_px`를 씁니다.
   - 기본 자리는 `main` + `next`입니다.
   - 보조 자리는 `alt` + `alt_next`입니다.
   - 단계마다 어느 자리를 쓰는지는 `plan[단계 키]`에 있습니다.
   - 4해상도 모두 필드 칸·대상과 겹침 0으로 검사했습니다.
   - 640x360은 두 필드 사이 38 px 띠에 12 px 2줄로 넣고, 「다음」·「건너뛰기」는 오른쪽 기둥에 둡니다. round-2 qa 이슈 3(판을 가림)을 해결하는 배치입니다.
2. 가리킴(`ux.tutorial_ui`)
   - 대상만 밝게 남기는 스포트라이트(나머지 50 % 어둡게, 여백 8 px)
   - #7FE3FF 고리, 1.2 s 주기
   - 패널에서 대상까지 점선 화살표
   - 끌기 단계는 손가락 원(지름 28 px)이 출발 → 도착을 반복
3. 패널이 떠 있어도 입력 잠금 0입니다.
4. 용어 사전 화면
   - 위에서부터 검색(48 px) → 유형 범례 띠(`assets/type-*.svg` 5개 + `kind-*.svg` 3개) → 묶음별 목록 순서입니다.
   - 한 줄 = 아이콘 32 + 용어 16 + 설명 13 + 흔히 부르는 말 12, 줄 높이 ≥ 56 px.
   - 가로 화면은 2열입니다.
5. 새 아이콘: `icon-ability`·`icon-board`·`icon-kin`·`icon-breakthrough`·`icon-rank`.
6. 팩 개봉: `salt-chunk-*.svg`가 소금 껍질에 덮인 카드 뒷면(100×140)으로 바뀌었습니다.
   - 세로 5:7 비율로 배치를 다시 맞춥니다.
   - 글은 `crate_tap_salt`("카드를 눌러 뒤집으세요")와 `crate_reveal_all`("모두 뒤집기")를 씁니다.

## 5. 확인 방법
- `node tools/art/build.mjs`: 종료 코드 0이어야 합니다.
  - 대비 81쌍
  - 유형 색 색약 ΔE ≥ 20
  - 튜토리얼 자리 4해상도
  - 글 맞춤 200장
- 겉모습 비교: 정상·색약 3종 그림은 `assets/samples/ux-types-cvd.png`, 갈래 27개는 `ux-types-full.png`.
- ux-reviewer 검수 방식: 글을 가린 손패 스크린샷으로 유형 5개와 종류 3개를 맞힙니다.

## 6. UX r2 추가 (ux-reviewer major 2건 대응, 2026-11-18) — 30-art 11-7b
1. **카드 그림 다시 생성**(`cardSVG`·`tokenSVG`)
   - 왼쪽 14 px 기둥 = 유형 색 + 무늬.
   - 세력은 오른쪽 6 px 띠.
   - 유형 표지를 **왼쪽 열, 마나 판 바로 아래**로 옮김(손패 54 px).
   - 키워드 아이콘은 표지 오른쪽부터.
   - 토큰 표지는 왼쪽 위(4, 26)에 24 px.
2. **부채꼴 손패 간격 식**: `step = min(cw × 0.62, (hand.w − cw × 1.35) / (n − 1))`, 회전 ±14° 이하. 빌드 `handPos`를 이 식으로 바꾸면 겹친 카드의 보이는 왼쪽 띠가 ≥ 32 %(10장 기준)가 되어 표지·기둥이 모두 보임. 값은 `art.json ux_fan`.
3. **수집·덱 빌더 격자 `miniCell`**: 손패형 카드(`cardSVG(c,'hand')`, 칸 폭 ≥ 96 px) + 아래 이름 12 px.
4. **덱 빌더 유형 필터**
   - 첫 줄: 유형 버튼 5개(48×48, `assets/type-*.svg` 32 px).
   - 둘째 줄: 종류 버튼 3개(`kind-*.svg`) + 마나 필터. 가로 화면에서는 한 줄.
   - 여러 개를 함께 고를 수 있음. 누른 상태는 바탕 #2E4650 + 테두리 #7FE3FF 2 px. 키는 `deck_filter_type`.
5. **덱 목록 줄과 비율 막대**
   - 덱 목록 줄: [유형 색 8 px][표지 22][마나 22][종류 실루엣 22][이름][×2].
   - 위에 유형 비율 막대(색·무늬·표지·장 수).
6. 샘플: `assets/samples/ux-hand-fan-cvd.png`, `ux-collection-grid.png`, `ux-deck-list.png`.
7. 확인: `build.mjs`가 손패 5~10장 × 4해상도 보이는 띠 ≥ 29 %를 검사함(실패 시 종료 코드 1).

## BGM (2026-11-18 요청자 지시 "아주 비어 있고 느리고 음산한 멜로디") — 30-art 6절
1. `projects/tcg-01/tools/art/music-synth.mjs`를 `games/tcg-01/js/`로 그대로 복사합니다. 이 파일은 의존성 없는 ES 모듈입니다.
   - `audio.js`의 `startBed()`·`motif()`·`stopMotif()`를 새 합성기로 바꿉니다.
   - 생성: `const music = createMusic(S.ctx, S.musBus, D.art.sound.music, { seed: Date.now() })`
2. 곡 전환은 `music.play(곡, { hero })`이고, 교차는 3 s입니다(`crossfade_s`).
   - 타이틀·메뉴·수집·덱 빌더·상점: `menu`
   - 대전: `battle`. 내 영웅 id를 `hero`로 넘기면 동기가 그 영웅 음 높이로 나옵니다.
   - 내 체력 ≤ 10: `battle_tension`. 체력이 다시 > 10이 되면 `battle`로 돌아갑니다. 예전 `tension()`의 필터·디튠 처리는 이것으로 대체합니다.
   - 팩 개봉 화면: `crate`
   - 승패: 곡을 멈추고 `music.sting('victory'|'defeat')`. 효과음 `victory`/`defeat`와 함께 냅니다.
3. 음악 끔(설정) = `musBus` 이득 0(지금처럼). 백그라운드 = `ctx.suspend()`(지금처럼). 다시 들어오면 실시간 스케줄러가 이어서 돕니다.
4. 성능
   - 동시 목소리 상한 `max_voices` 24. 넘으면 그 사건을 건너뜁니다.
   - 드론 2~3개, 바람 잡음 1개, 잔향(ConvolverNode, 합성 IR 5.5 s) 1개, 딜레이 1개가 상시 돕니다.
   - 사건은 0.5 s마다 앞 1.5 s만 예약합니다.
5. 확인
   - `node tools/art/music-render.mjs`: 곡별 LUFS·피크와 효과음 대비 검사 4개가 OK여야 합니다.
   - 6배 CPU 스로틀 fps가 기존과 같은지 qa가 잽니다.
6. 효과음 `victory`의 음을 [294, 440, 587](빈 5도)로 바꿨습니다(장3도 제거). `data/art.json`을 다시 복사합니다.
