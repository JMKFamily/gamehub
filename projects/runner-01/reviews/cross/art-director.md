# 리뷰: art-director · 1-2 교차 리뷰

## 확인한 것
- 읽은 파일: `00-benchmark.md`, `10-lore.md`, `20-balance.md`, `balance.json`, `levels/01~03-*.json`, `30-art.md`, `assets/*.svg`, `STATUS.md`
- 렌더 확인: `reviews/cross/art-sheet.png` (Playwright, 세 레벨 배경 위 전 에셋 + balance.json 판정 박스 청록 점선 + 앱 아이콘 256/96/48 px + player.svg)
- 대비: `30-art.md` 부록 A 스크립트 재실행, 78쌍 실패 0

소유권 기준: 이름·텍스트·테마 = 10-lore.md / 수치·판정·기믹 포함·레벨 구성 = 밸런스 문서 / 색·형태·이펙트·사운드 = 30-art.md

## 충돌·누락 (총 16건)

| # | 심각도 | 담당 역할 | 내용 | 근거 | 처리 |
|---|---|---|---|---|---|
| 1 | major | art-director | 앱 아이콘 플레이어(노랑 `#FFE07A`)와 `player.svg`(파랑 `#3563D8`) 불일치. 레벨마다 플레이어 색이 달라 아이콘·스토어와 맞출 기준이 없었음 | STATUS.md, 구 30-art.md 2절 | **수정함.** 플레이어·위험·트리거·게이트 색을 세 레벨 공통 토큰으로 바꿈. `player` `#FFD66B`(세계관 "돌아오는 새벽 금빛"), `player.svg`·`app-icon.svg` 같은 색·구성 |
| 2 | major | art-director | 팔레트가 세계관 테마와 다름: level1 "밝은 종이"(세계관: 회청·잿빛 새벽), level2 "해질녘"(세계관: 밤), level3 "밤 도시 청록"(세계관: 먹색 폭풍) | 10-lore.md 4절, 구 30-art.md 2절 | **수정함.** 2-1절에 레벨 이름·분위기·배경 모티프를 넣고 환경 색 재설계, `bgAccent` 토큰 추가(새벽 주황 기운 / 등불 자홍 / 종 금빛). 키는 `theme_id`와 같은 `level1~3` 유지 |
| 3 | major | art-director | level1 `hazard` vs `bgFar` 4.53:1로 여유 없음 | 구 30-art.md 2-1 | **수정함.** 세 레벨 모두 어두운 배경 + 밝은 위험으로 통일. 위험 vs 배경 4층 최소 level1 5.45 / level2 5.63 / level3 5.38:1 |
| 4 | major | lore-writer | 세계관 level1 "잡음 결정은 차가운 청백색" ↔ 아트 규칙 "위험 = 세 레벨 공통 따뜻한 산호색". 청백색은 `groundEdge` 띠(올라설 수 있는 면)와 겹침 | 10-lore.md 4절 레벨 1 시각 힌트 | 색은 아트 소유 → `hazard` `#FF8C6E` 유지. 세계관 힌트 문구를 "산호빛 결정" 등으로 고쳐 달라고 요청 |
| 5 | major | lore-writer | 템포 문 "빠름 = 붉은색"은 `hazard` 전용 색 규칙 위반, "보통 = 금색"은 플레이어 금색과 겹침 | 10-lore.md 4절 레벨 3 | 아트 확정: 늘임 `#8FB8FF` 하늘 / 제박 `#ECE6D8` 상아 / 몰아침 `#F28AD0` 자홍 + 꺾쇠 1·2·3개. 세계관 힌트·교차 리뷰 메모(푸름·금·붉음) 수정 요청 |
| 6 | minor | lore-writer | 울림 고리 "금빛 링"은 플레이어 금색과 겹침 | 10-lore.md 4절 레벨 3 | 아트 확정: `trigger` 민트 `#5FE0C0`(북 발판과 같은 "도와주는 것" 색). 힌트 수정 요청 |
| 7 | minor | lore-writer | "자홍·청록 네온", "빛나는 가는 줄", "번개가 화면을 하얗게"는 아트 방향(발광 없음)·위험 대비 4.5:1·광과민 기준과 충돌 | 10-lore.md 4절 레벨 2·3 | 아트 확정: 등불은 어두운 채도 색 면 점멸, 번개는 먼 배경이 `bgPulse`까지만 밝아짐(드롭 마디 첫 박, ≤ 0.6회/s). 세계관 문구를 "색종이 등불", "먼 하늘이 번쩍"처럼 표현 조정 요청 |
| 8 | minor | lore-writer | 핑 "중심에서 맥동하는 빛 코어" ↔ 아트의 회전 표식 원은 중심에서 벗어나 있음 | 10-lore.md 3절 | **수정함.** 안쪽 팔각 면을 `playerCore` 코어로 바꾸고 박자마다 맥동, 벗어난 원은 회전 표식 "울림 구멍"으로 명명. 세계관 변경 불필요 |
| 9 | minor | art-director | 세계관의 착지 "동심원 파문", 사망 "원형 파문 조각" 연출이 아트 이펙트 표에 없음 | 10-lore.md 3절, 30-art.md 6절 | **수정함.** 착지 파문, 사망 파문 고리 2개, 레벨별 클리어 "색이 돌아옴" 연출 추가 |
| 10 | minor | lore-writer | `tut_tempo` "템포 문을 지나면 빨라져요"인데 level3 첫 템포 문은 **느림**(박 40) | 10-lore.md 5-6, levels/03 `speed_changes` | 문구를 "템포 문을 지나면 속도가 바뀌어요" 류로 |
| 11 | minor | lore-writer | `rotate_device` "가로로 돌려 주세요"는 막는 문구로 읽힘. 아트 5절은 웹 세로 플레이 허용 + 1회 안내 | 10-lore.md 5-7, 30-art.md 5절 | 화면 동작은 아트 기준 유지, 문구를 "가로로 돌리면 더 넓게 보여요" 뉘앙스로 요청 |
| 12 | minor | lore-writer / balance-designer | G7 중력 반전 MVP 제외인데 세계관에 `tut_bell`, "G7 선택" 항목이 남음 | 20-balance.md 10장 변경 1, 10-lore.md 4·5-6절 | 아트는 30-art.md 9절에 "2차"로 표시 완료. 세계관은 `tut_bell`·뒤집힌 종을 2차로 표시 또는 삭제 |
| 13 | major | art-director (balance-designer 확인) | 판정 ↔ 그림 크기: 낮은 장애물 그림 0.48 < `spike_low_visual_h_t` 0.5, 얇은 발판 그림 0.20 < `platform_thickness_t` 0.25, 북 발판 돔 0.22 < 트리거 높이 0.25, 울림 고리 궤도 r 0.45 < 트리거 1.2 | balance.json, 구 assets | **수정함.** 낮은 장애물 꼭대기 0.50, 발판 판 0.25, 돔 높이 0.25, 고리 viewBox 1.2×1.2·궤도 r 0.58. 즉사 3종은 판정이 그림 안(반폭 여유 spike/ceiling 0.079, low 0.019 t). 고리·북 발판 트리거 모서리가 그림 밖인 것은 무해 요소라 허용(4-0 표) |
| 14 | major | game-developer (참고: balance-designer) | 천장 장애물(y 2~4)은 위에 블록이 없어 공중에 떠 보임. 아트 4-5는 "천장 블록 아랫면에 붙음"을 전제했음 | levels/02·03 오브젝트 y값, 20-balance.md 6장 | **아트 수정함.** 판정 없는 "매다는 줄"(등불 줄/종 줄) 그리기 규칙 추가(4-5). 빌드가 구현 |
| 15 | minor | balance-designer | 20-balance.md 7장 표와 levels `sections` 불일치: L2 드롭 80~111이라 했으나 JSON은 95부터 `breath`(intensity 1, 110박 3연속 포함), L3 빠름 드롭 80~127이나 JSON은 108부터 `breath` | 20-balance.md 7장, levels/02·03 `sections` | 아트·사운드는 JSON `intensity` 기준으로 맞춤(7-2 표). 의도대로인지 확인, 아니면 JSON 또는 문서 정정 |
| 16 | minor | art-director | 사운드: BPM 120/128/140은 일치. 그러나 x↔스텝 공식이 속도 고정 가정, 느림 구간 "킥만"은 4마디라 박 단서 부족, 구간 이름이 레벨 데이터와 다름 | 구 30-art.md 7-2, levels `speed_changes`·`sections` | **수정함.** 템포 문 4곳(박 40/56/80/128, 모두 마디 첫 박) 편곡 표, 느림 = 하프타임, intensity별 파트 표, 구간별 x(t) 공식(`speed_changes.x` = 플레이어 중심이라 `sections.x`와 0.5 차이 정상) |

참고(아트 판단 밖, 기록만): 세계관 레벨 1 기믹 힌트 "첫 10초 상자 계단 → 결정 1개 → 2개"와 밸런스 실제 순서(첫 10초 결정 3개, 블록은 40박=20초부터)가 다릅니다. 순서는 밸런스 소유라 `tut_crate` 표시 시점만 세계관이 맞추면 됩니다.

## 다른 역할에 넘기는 것
- lore-writer: #4·5·6·7 시각 힌트 문구를 아트 확정 색·표현으로, #10 `tut_tempo`, #11 `rotate_device`, #12 G7 항목 2차 처리
- balance-designer: #15 sections ↔ 문서 정정 여부, `theme_id` 바꾸면 아트 팔레트 키도 함께 바꾼다는 점 확인
- game-developer(구현 단계): #14 매다는 줄, 30-art.md 4-0 대응표(고리 SVG는 칸 왼쪽 위에서 −0.1 옮겨 1.2 크기), 6절 intensity 연출, 7-2 템포 문 편곡

## 이번에 고친 아트 파일
- `30-art.md`: 머리말, 1절 배경 모티프, 2절 팔레트 전면 개편(환경/공통 분리, 대비 표 78쌍), 3절 규칙, 4절(4-0 대응표 신설, 4-1~4-10), 5절 회전 안내, 6절 이펙트, 7-1 악기 2개, 7-2 레벨 패턴·템포 문·intensity, 7-3, 8절, 9절(G7 2차), 부록 A
- `assets/`: 11개 SVG 모두 새 팔레트로. 형태 변경은 `hazard-floor-low`(높이 0.5), `thin-platform`(0.25), `jump-pad`(돔 0.25), `air-orb`(1.2 viewBox), `block`(울림 구멍), `player`·`app-icon`(코어 면, 금색 통일), 게이트 3종(속도별 색)

VERDICT: REVISE (아트 쪽은 반영 완료, 세계관 문구 #4~7·10~12와 밸런스 #15 확인 필요)
