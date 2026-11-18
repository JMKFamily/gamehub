# 10. 세계관: Reverbound (잔향 질주)

## 확정값 (1-2 교차 리뷰 후, round-2 갱신. 다른 역할은 이 표 그대로 사용)

| 항목 | 확정값 | 쓰는 곳 | 비고 |
|---|---|---|---|
| 게임 이름 (영문) | **Reverbound** | 타이틀, 스토어(영어), `games.json`, 앱 이름 | 확정 |
| 게임 이름 (한국어 부제) | **잔향 질주** | 타이틀 부제, 한국어 스토어 | 스토어 표기 `Reverbound: 잔향 질주` |
| 앱·웹 slug 제안 | `reverbound` | 앱 ID·패키지 이름 등 | 프로젝트 폴더 `runner-01` 이름 변경 여부는 오케스트레이터 결정 |
| 주인공 | 핑 (Ping) | 스토어 문구 | 게임 화면에는 이름 표시 없음 |
| `levels/01-level1.json` `name` | **`"새벽 조율장"`** | 레벨 선택, 레벨 시작 표시 | 영문 `Dawn Tuning Yard`는 문자열 테이블 `level1_name` |
| `levels/02-level2.json` `name` | **`"줄다리 야시장"`** | 〃 | 영문 `Wirebridge Night Market` (`level2_name`) |
| `levels/03-level3.json` `name` | **`"폭풍 종탑"`** | 〃 | 영문 `Storm Belfry` (`level3_name`) |
| `levels/04-level4.json` `name` | **`"빗방울 계단"`** | 〃 | 영문 `Raindrop Steps` (`level4_name`) |
| `levels/05-level5.json` `name` | **`"바람 기찻길"`** | 〃 | 영문 `Windy Railway` (`level5_name`) |
| `levels/06-level6.json` `name` | **`"비눗방울 언덕"`** | 〃 | 영문 `Bubble Hill` (`level6_name`) |
| `levels/07-level7.json` `name` | **`"고드름 동굴"`** | 〃 | 영문 `Icicle Cave` (`level7_name`) |
| `levels/08-level8.json` `name` | **`"달팽이 정원"`** | 〃 | 영문 `Snail Garden` (`level8_name`) |
| `levels/09-level9.json` `name` | **`"구름 사다리"`** | 〃 | 영문 `Cloud Ladder` (`level9_name`) |
| `levels/10-level10.json` `name` | **`"해돋이 무대"`** | 〃 | 영문 `Sunrise Stage` (`level10_name`) |
| 레벨 JSON `name_en` / `name_key` | 위 영문 이름 / `levelN_name` | 레벨 JSON | 레벨 4~10은 지금 `null`. JSON은 balance-designer가 채움(이 문서가 기준) |
| `theme_id` | **`level1` ~ `level10` 유지** | 레벨 JSON, `30-art.md` 팔레트 키 | 표시 이름은 `name`과 문자열 테이블로만 연결 |
| 레벨 파일 이름 | 현재 이름 유지 (`01-level1.json` 등) | `balance.json levels` | 변경 불필요 |
| `name` 필드 언어 | 한국어(기본 언어). 영어 화면은 `levelN_name` 키를 씀 | 빌드 | 빌드는 언어 설정에 따라 문자열 테이블을 우선 사용 |
| 화면 언어 선택 | `?lang=` 쿼리가 있으면 그것, 없으면 `navigator.language`가 `ko`로 시작하면 한국어, 아니면 영어 | 빌드 | 언어 설정 UI와 새 문자열 키는 만들지 않음 (round-2 오케스트레이터 결정, 구현은 game-developer) |
| 플레이 중 문구 길이 | 한 문장, **한국어 12자 이내(공백 포함) / 영어 6단어 이내** | 튜토리얼 카드, 토스트, HUD | 세계관 용어 대신 화면에 보이는 모양 이름(가시, 상자, 발판, 얇은 판, 고리, 위 가시, 분홍 문, 하늘색 문, 깃발)을 씀 |
| 판정 이름 (화면) | **딱이야 / 좋아 / 됐다**, **Wow! / Nice! / OK!** (`judge_name_1/2/3`) | 탭마다 판정 표시, 5-9절 | 기획·데이터 이름 딱/좋아/통과·등급 1/2/3은 그대로. 실패 이름 없음 (2026-11-17) |
| 콤보 라벨 (화면) | **연속 / in a row** (`combo_label`), 대체 글 **연속 성공 / Jump streak** (`combo_aria`) | 위쪽 중앙 큰 숫자 옆·아래 작은 라벨(결정 20·23), 5-2·5-8절 | "COMBO"·"콤보"와 레퍼런스 판정 문구는 화면·대체 글 어디에도 쓰지 않음 (2026-11-18 round-3) |
| 기믹 이름표 | 4절 공통 용어 표 | UI·튜토리얼·스토어 | 스키마 `type` 값(`spike`, `pad` 등)은 바꾸지 않음 |

- 입력: `00-benchmark.md`, 교차 리뷰로 `20-balance.md`·`balance.json`·`levels/*.json`·`30-art.md` 반영 (2026-11-16), round-1 리뷰와 오케스트레이터 round-2 결정 반영 (2026-11-17), 요청자 지시 "레벨 10개"에 따른 `20-balance.md` 14장(레벨 4~10, 레벨 2·3 재설계) 반영 (2026-11-17), round-2 리뷰와 오케스트레이터 결정 20·23 반영 (2026-11-18 round-3)
- 대상 연령: runner-01은 **12세 정도**입니다(`harness/criteria.md` 대상 연령 절, 결정 14). 문구는 12세가 바로 읽는 쉬운 말로 쓰고, 글을 읽지 않아도 진행할 수 있게(그림 카드·그림표·↻ 버튼) 하는 원칙은 그대로 지킵니다.
- 원본 보호: 레퍼런스 게임의 이름, 캐릭터, 설정, 레벨명, 기믹 이름, UI 문구를 쓰지 않았습니다. 아래 이름과 문구는 모두 새로 만든 것입니다.
- 소유권: 수치·기믹 포함 여부·레벨 구성·문구 표시 박 위치는 `20-balance.md`·`levels/*.json`, 색·형태·이펙트·사운드는 `30-art.md`가 기준입니다. 이 문서의 시각 힌트와 기믹 설명은 그 두 문서에 맞춘 **분위기 서술**이며, 다르면 그쪽이 맞습니다.

---

## 1. 게임 이름

| 후보 | 한국어 표기 | 뜻 | 검색 충돌 메모 |
|---|---|---|---|
| **Reverbound** (확정) | 잔향 질주 | reverb(잔향) + bound(튀어 오르다, ~로 향하다). "울림이 튀어 오르며 달린다" | 조어라 기존 앱 이름과 겹칠 가능성이 낮음. "Dash", "Run", "Geometry" 같은 흔한 단어를 피함 |
| Hushline | 정적선 | 정적이 밀려오는 경계선 | (탈락) 메신저·보안 서비스 이름과 겹칠 여지 있음 |
| Kickstep | 킥스텝 | 킥 드럼 한 박 = 한 걸음 | (탈락) 음악 장비·댄스 앱과 겹칠 가능성 있음 |

- **확정: Reverbound (잔향 질주)**
- 스토어 표기: `Reverbound: 잔향 질주` (한국어 스토어), `Reverbound` (영어 스토어)

## 2. 세계관과 톤

세상을 움직이던 노래가 멈추고, 소리가 사라진 자리에 **정적(the Hush)**이 번졌습니다. 남은 것은 마지막 한 소절의 울림, 작은 돌 **핑**뿐입니다. 핑이 박자에 맞춰 뛸 때마다 세상이 잠깐 밝아지고, 끝까지 달리면 노래가 돌아옵니다.

**톤 키워드**: 밝다 / 박자에 맞춰 숨 쉬는 세계 / 설명보다 리듬 / 실패해도 "괜찮아, 다시".
게임 화면의 글은 12세가 바로 읽는 쉬운 말로, 짧게 씁니다(글 없이도 진행 가능). 세계관 이야기는 스토어 문구와 레벨 이름에만 가볍게 둡니다.

화면은 단순 도형과 또렷한 색입니다(`30-art.md` 기준).

## 3. 주인공

| 항목 | 내용 |
|---|---|
| 이름 | **핑 (Ping)** |
| 정체 | 멈춘 노래의 마지막 울림이 굳어 생긴 작은 돌. 몸 안에서 박자가 계속 울림 |
| 왜 멈추지 않는가 | 핑이 멈추면 마지막 소절도 끝납니다. 달리는 동안만 소리가 이어지고, 끝까지 가야 노래를 다시 울릴 수 있습니다 |
| 사망의 의미 | 가시에 닿으면 핑은 조각으로 흩어졌다가 시작점(연습 모드는 깃발)에서 다시 모입니다. 다시 움직이기까지의 시간은 `balance.json` 기준 |
| 점프 | 핑이 땅을 차면 한 박이 울린다는 설정. 실제 점프음은 없고 음악이 그 역할을 함 (`30-art.md` 7절) |
| 생김새 (아트 기준 `30-art.md` 3·4-1절) | 얼굴 없는 노란 **팔각형**. 사망 시 조각으로 흩어짐 |

## 4. 레벨 테마 (10개)

공통 용어. 게임 화면(튜토리얼·토스트)에서는 **화면 이름**을, 스토어·기획 문서에서는 세계관 이름을 씁니다. 화면 이름의 모양·색은 `30-art.md`(2절 토큰, 부록 B)와 `20-balance.md` 14-2절 기믹 서술에 맞췄습니다. 튜토리얼 그림도 이 모양·색 그대로 그립니다.

| 코드 | 스키마 `type` | 화면 이름 (KR / EN) | 화면에 보이는 모양 | 세계관 이름 (스토어용) | 처음 나오는 레벨 |
|---|---|---|---|---|---|
| G2 바닥 즉사 | `spike` | 가시 / spike | 산호색 뾰족한 삼각형 | 잡음 결정 / Static Shard | 1번 |
| G3 낮은 바닥 즉사 | `spike_low` | 작은 가시 / small spike | 낮은 산호색 삼각형 | 잔잡음 / Low Hiss | 1번 (가시와 같은 행동이라 따로 가르치지 않음) |
| G1 고체 블록 | `block` | 상자 / box | 바닥색 사각형 + 윗면 밝은 띠 | 공명 상자 / Echo Crate | 2번 |
| G5 발판 자동 점프 | `pad` | 발판 / pad | 민트 반원 돔 | 북 발판 / Drum Pad | 3번 |
| G12 얇은 발판 | `platform` | 얇은 판 / thin ledge | 상자보다 1/4 두께의 떠 있는 바닥색 판 + 윗면 밝은 띠 | 현 발판 / String Ledge | 4번 |
| G8 속도 변경 (빠름) | (`speed_changes` fast) | 분홍 문 / pink gate | 분홍(`gateFast`) 세로 캡슐 테 + 꺾쇠 3개 | 몰아침 문 / Rush Gate | 5번 |
| G8 속도 변경 (보통) | (`speed_changes` normal) | (따로 가르치지 않음) | 상아색(`gateNormal`) 캡슐 테 + 꺾쇠 2개 | 제박 문 / Steady Gate | 5번 (빠른 구간을 끝내는 문. 카드 없음) |
| G6 공중 재점프 | `orb` | 고리 / ring | 민트 속 빈 동그라미 + 점선 둘레 | 울림 고리 / Echo Ring | 6번 |
| G4 천장 즉사 | `spike_ceiling` | 위 가시 / top spike | 아래를 향한 산호색 삼각형, 줄·막대에 매달림 | 매달린 잡음 / Hanging Hiss | 7번 |
| G8 속도 변경 (느림) | (`speed_changes` slow) | 하늘색 문 / blue gate | 하늘색(`gateSlow`) 캡슐 테 + 꺾쇠 1개 | 늘임 문 / Slow Gate | 8번 |
| G13 연출 | (`sections`) | (글 없음) | - | 박동 / Pulse | 1~10번 |

- 템포 문 세 가지를 통틀어 부를 때는 "문 / gate", 세계관 이름은 "템포 문 / Tempo Gate"입니다. 색 이름은 보조이고, 플레이어는 꺾쇠 수(많을수록 빠름)와 색을 함께 봅니다(색약 대비, `30-art.md` 2절 규칙 4).
- 영어 화면 이름 `blue gate`는 `gateSlow`(#8FB8FF 하늘색)를 쉬운 말로 부른 것입니다. 한국어는 "하늘색"이 실제 색에 더 가깝습니다.
- 그대로 예약만 하는 것: G7 중력 반전 "뒤집힌 종 / Upturned Bell"(2차). 매우 빠름 속도는 이름을 두지 않습니다. 쓰게 되면 "질주 문(Prestissimo)"을 예약합니다.
- 수집품은 2차입니다(`00-benchmark.md` 11절).

모든 레벨 공통 시각 힌트 (`30-art.md` 2-2절과 같음): 배경은 **모든 레벨이 어두운 색**이고 레벨마다 바탕색만 다릅니다. 가시(바닥·위)는 모든 레벨에서 같은 **산호 주황**(`hazard`), 발판과 고리는 **민트**(`trigger`), 핑은 **노랑**(`player`), 상자와 얇은 판 윗면은 밝은 띠(`groundEdge`). 위험은 "뾰족한 모양 + 산호색", 도움은 "둥근 모양 + 민트"로 레벨과 상관없이 같습니다. 문은 위험도 도움도 아닌 "지나가는 길"이라 산호·민트를 쓰지 않습니다.

레벨 이름 체계: **[날씨·때·작은 것] + [장소]**, 두 낱말. 레벨 1~3(새벽 조율장, 줄다리 야시장, 폭풍 종탑)과 같은 틀이고, 레벨 4부터는 글을 길게 읽지 않아도 바로 그림이 떠오르는 낱말(12세 기준으로는 쉬운 말이고, 레벨 카드 그림과 짝이 됨)(빗방울, 기차, 비눗방울, 고드름, 달팽이, 구름, 해돋이)만 씁니다. 이름의 낱말은 그 레벨의 새 기믹을 떠올리게 합니다(계단 = 공중 얇은 판, 기차 = 빨라짐, 비눗방울 = 고리, 고드름 = 위 가시, 달팽이 = 느려짐).

이야기 흐름 (설정, 화면에는 클리어 제목으로만 나옴): 새벽 마당에서 깨어난 핑이 밤 시장과 폭풍 종탑을 지나 종을 울리면 폭풍이 멎습니다(1~3). 비 그친 하늘 계단, 바람 부는 기찻길, 비눗방울 언덕, 고드름 동굴, 달팽이 정원을 지나며 세상의 소리가 하나씩 돌아오고(4~8), 구름 사다리를 올라 해가 뜨는 무대에서 노래가 다시 울립니다(9~10).

### 레벨 1. 새벽 조율장 (Dawn Tuning Yard)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | BPM·길이·배치는 `levels/01-level1.json` 기준 |
| 새 기믹 | **가시**(와 작은 가시). 조작 "누르면 뛴다"를 배움 |
| 장소 | 정적에 가장 먼저 잠긴 외곽의 악기 조율 마당 |
| 이야기 한 줄 | 핑이 처음 깨어나 달리는 법을 배우는 곳 |
| 분위기 키워드 | 새벽 직전, 고요, 첫 박, 느긋함 |
| 시각 (아트 팔레트 `level1`) | **어두운 회청색 하늘**(`bg`), 잿빛 나무색 바닥·상자(`ground`). 먼 배경에 둥근 기둥·작은 종탑 실루엣 정도만 |
| 소리 (아트 7-2) | 밝고 느긋한 "첫 조율" |
| 설정상 끝 장면 | 마당 문을 나서면 멀리 등불이 켜지는 시장이 보임 |

### 레벨 2. 줄다리 야시장 (Wirebridge Night Market)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | `levels/02-level2.json` 기준 |
| 새 기믹 | **상자**(올라타기·계단·걸어 내려오기). 가시는 하나씩 나와 복습만 함 |
| 장소 | 협곡 위 줄다리에 선 야시장. 노점 천막과 둥근 등불 |
| 이야기 한 줄 | 핑이 지나가면 꺼진 노점이 하나씩 다시 켜짐 |
| 분위기 키워드 | 밤, 장이 서는 시간, 들뜬 그루브, 한 걸음씩 오르기 |
| 시각 (아트 팔레트 `level2`) | **어두운 남보라 밤하늘**(`bg`), 연보라 바닥·상자(`ground`). 먼 배경에 둥근 천막 지붕과 등불(원) |
| 소리 (아트 7-2) | 들뜬 그루브 "장이 서기 직전의 흥" |
| 설정상 끝 장면 | 시장 끝 줄다리를 건너면 폭풍 속 종탑이 나타남 |

### 레벨 3. 폭풍 종탑 (Storm Belfry)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | `levels/03-level3.json` 기준 |
| 새 기믹 | **발판**(밟으면 높이 뜀). 가시가 여러 개 늘어선 줄과 높은 상자는 발판이 대신 넘겨 줌. 가시·상자는 복습 |
| 장소 | 세상을 조율하던 큰 종탑의 외벽과 계단 |
| 이야기 한 줄 | 발판을 타고 꼭대기의 큰 종까지 올라가 종을 울림 |
| 분위기 키워드 | 깊은 밤, 폭풍, 통통 튀어 오르기, 종소리 |
| 시각 (아트 팔레트 `level3`) | **먹색 폭풍 하늘**(`bg`), 회청 석재 바닥·상자(`ground`). 먼 배경에 큰 종(원)과 아치 창. 번개는 먼 배경이 조금 밝아지는 정도 |
| 소리 (아트 7-2) | 밤의 질주감 |
| 설정상 끝 장면 | 핑이 큰 종을 울림 → 배경이 한 번 크게 밝아지고 폭풍이 멎음 → "종이 울렸어요!" 클리어 화면. 종탑 뒤로 비 그친 하늘에 빗방울 계단이 보임 |

### 레벨 4~10 공통

- 레벨 데이터(BPM·길이·배치·cue 박)는 `levels/04~10-*.json`과 `20-balance.md` 14장이 기준입니다. 아래 "새 기믹"은 14-2절을 아이 말로 옮긴 것입니다.
- 시각 칸은 **분위기 힌트**입니다. 팔레트·모티프·클리어 색은 art-director가 `30-art.md`에서 정합니다(바탕은 어두운 색, 위험·도움 색은 공통). 먼 배경 모티프는 원·사각·삼각 같은 단순 도형 실루엣 1~2개로 충분합니다.
- 소리 칸은 BPM만 적습니다. 곡 분위기는 `30-art.md` 7절이 정합니다.

### 레벨 4. 빗방울 계단 (Raindrop Steps)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | `levels/04-level4.json` (144 BPM) |
| 새 기믹 | **얇은 판**(현 발판). 떠 있는 얇은 판 위에 올라서요. 판 아래로 지나가도 괜찮음 |
| 장소 | 폭풍이 그친 뒤 하늘에 걸린, 빗방울처럼 떠 있는 얇은 계단 |
| 이야기 한 줄 | 핑이 디딜 때마다 판이 "통" 하고 빗방울 소리를 냄 |
| 분위기 키워드 | 비 갠 밤, 물방울, 가벼운 발걸음, 공중 계단 |
| 시각 (아트 팔레트 `level4`, 제안) | 비 갠 어두운 청록 하늘. 먼 배경에 물방울 모양(원 + 작은 삼각) 몇 개 |
| 설정상 끝 장면 | 계단 끝에서 기찻길이 바람 속으로 뻗어 있음 |

### 레벨 5. 바람 기찻길 (Windy Railway)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | `levels/05-level5.json` (148 BPM) |
| 새 기믹 | **분홍 문**(템포 문 빠름). 지나면 빨라지고 점프가 길어져요. 상아색 문을 지나면 다시 보통 |
| 장소 | 바람이 부는 들판 위 높은 기찻길 |
| 이야기 한 줄 | 핑이 바람을 타고 기차보다 빨리 달림 |
| 분위기 키워드 | 바람, 기차, 쌩쌩, 신남 |
| 시각 (아트 팔레트 `level5`, 제안) | 어두운 남색 새벽 들판. 먼 배경에 기찻길 선과 둥근 바퀴(원) 실루엣 |
| 설정상 끝 장면 | 기차가 멈춘 언덕에 비눗방울이 떠오름 |

### 레벨 6. 비눗방울 언덕 (Bubble Hill)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | `levels/06-level6.json` (152 BPM) |
| 새 기믹 | **고리**(울림 고리). 뛰어서 고리에 닿으면 한 번 더 톡. 첫 고리는 안 눌러도 안전 |
| 장소 | 둥근 비눗방울이 둥실둥실 떠 있는 언덕 |
| 이야기 한 줄 | 핑이 고리를 톡 치면 방울이 터지며 맑은 소리가 남 |
| 분위기 키워드 | 둥실, 동글동글, 톡톡, 장난 |
| 시각 (아트 팔레트 `level6`, 제안) | 어두운 보랏빛 언덕. 먼 배경에 크고 작은 원(방울) 실루엣. 고리 민트와 헷갈리지 않게 배경 원은 테두리 없이 흐리게 |
| 설정상 끝 장면 | 언덕 아래 동굴 입구에 고드름이 반짝임 |

### 레벨 7. 고드름 동굴 (Icicle Cave)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | `levels/07-level7.json` (156 BPM) |
| 새 기믹 | **위 가시**(매달린 잡음). 위에 가시가 있으면 누르지 말고 걸어가요. 위 가시 아래에서 눌러야 하는 순간은 없음 |
| 장소 | 천장에 고드름이 매달린 서늘한 동굴 |
| 이야기 한 줄 | 핑이 조용히 지나가면 고드름이 녹아 똑똑 소리를 냄 |
| 분위기 키워드 | 서늘함, 쉿, 살금살금, 똑똑 |
| 시각 (아트 팔레트 `level7`, 제안) | 아주 어두운 청회색 동굴. 먼 배경에 둥근 동굴 입구(반원) 실루엣. 위 가시는 고드름 색이 아니라 **산호색 가시 그대로**(위험 색 공통) |
| 설정상 끝 장면 | 동굴을 나서면 이슬 맺힌 정원에 달팽이가 천천히 기어감 |

- 이 레벨의 규칙("뛰지 말고 기다리기")은 지금까지와 반대 행동이라 그림만으로 이해되는지 플레이 테스트가 필요합니다(`20-balance.md` 14-6 요청자 항목). 이름 "고드름"은 "위에 매달린 뾰족한 것"을 떠올리게 하려는 것입니다.

### 레벨 8. 달팽이 정원 (Snail Garden)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | `levels/08-level8.json` (160 BPM) |
| 새 기믹 | **하늘색 문**(템포 문 느림). 지나면 느려지고 점프가 짧아져요. 분홍 문·상아색 문과 함께 세 가지 문이 다 나옴 |
| 장소 | 달팽이가 사는 이슬 맺힌 작은 정원 |
| 이야기 한 줄 | 핑이 달팽이처럼 천천히, 또 바람처럼 빠르게 정원을 지나며 꽃을 깨움 |
| 분위기 키워드 | 느릿느릿, 이슬, 꽃, 빠름과 느림 |
| 시각 (아트 팔레트 `level8`, 제안) | 어두운 초록빛 밤 정원. 먼 배경에 둥근 꽃(원 + 꽃잎 원)과 달팽이 껍데기(소용돌이 대신 원 2개) 실루엣 |
| 설정상 끝 장면 | 꽃밭 끝에서 구름이 사다리처럼 하늘로 이어짐 |

### 레벨 9. 구름 사다리 (Cloud Ladder)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | `levels/09-level9.json` (164 BPM) |
| 새 기믹 | 없음. 지금까지 배운 것(얇은 판, 세 가지 문, 고리, 위 가시)이 섞여 나옴 |
| 장소 | 하늘 높이 층층이 이어진 구름 길 |
| 이야기 한 줄 | 해가 뜨기 전에 꼭대기 무대까지 올라가야 함 |
| 분위기 키워드 | 높이, 구름, 동이 트기 직전, 두근두근 |
| 시각 (아트 팔레트 `level9`, 제안) | 어두운 남보라에서 아래쪽만 조금 밝은 하늘. 먼 배경에 둥근 구름(원 여러 개 겹침) 실루엣 |
| 설정상 끝 장면 | 구름 꼭대기에 둥근 무대가 보이고 하늘 끝이 밝아짐 |

### 레벨 10. 해돋이 무대 (Sunrise Stage)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | `levels/10-level10.json` (168 BPM) |
| 새 기믹 | 없음. 마지막 레벨이라 모든 기믹이 한 번씩 나옴 |
| 장소 | 구름 위, 해가 떠오르는 둥근 무대 |
| 이야기 한 줄 | 핑이 마지막 소절을 끝까지 달리면 해가 뜨고 노래가 돌아옴 |
| 분위기 키워드 | 해돋이, 마지막 무대, 박수, 다 함께 |
| 시각 (아트 팔레트 `level10`, 제안) | 바탕은 어두운 자줏빛 새벽(위험 대비 유지). 먼 배경에 반원 해와 무대 테두리(반원 호) 실루엣 |
| 설정상 끝 장면 | 해가 떠오르며 배경이 크게 밝아짐 → "노래가 돌아왔어요!" 클리어 화면 → 모든 레벨을 깼으면 `clear_all` |

## 5. UI 텍스트 (KR / EN)

- 이 절의 표는 `tools/sync-data.mjs`가 `games/reverbound/data/strings.json`으로 옮깁니다. 표의 첫 칸은 키, 마지막 두 칸은 KR·EN입니다.
- 플레이 중 문구(5-2, 5-4, 5-6)는 한국어 12자 이내(공백 포함), 영어 6단어 이내입니다.

### 5-1. 타이틀과 메뉴

| 키 | KR | EN |
|---|---|---|
| title | 잔향 질주 | Reverbound |
| subtitle | 끝까지 달려요! | Run to the end! |
| tap_to_start | 눌러서 시작 | Tap to start |
| menu_play | 시작 | Play |
| menu_levels | 레벨 | Levels |
| menu_settings | 설정 | Settings |
| level_locked | 앞 레벨을 깨면 열려요 | Finish the level before it |
| mode_normal | 일반 모드 | Normal |
| mode_practice | 연습 모드 | Practice |
| best_normal | 최고 {pct}% | Best {pct}% |
| best_practice | 연습 최고 {pct}% | Practice best {pct}% |
| cleared_badge | 클리어 | Cleared |
| level1_name | 새벽 조율장 | Dawn Tuning Yard |
| level2_name | 줄다리 야시장 | Wirebridge Night Market |
| level3_name | 폭풍 종탑 | Storm Belfry |
| level4_name | 빗방울 계단 | Raindrop Steps |
| level5_name | 바람 기찻길 | Windy Railway |
| level6_name | 비눗방울 언덕 | Bubble Hill |
| level7_name | 고드름 동굴 | Icicle Cave |
| level8_name | 달팽이 정원 | Snail Garden |
| level9_name | 구름 사다리 | Cloud Ladder |
| level10_name | 해돋이 무대 | Sunrise Stage |
| level1_tag | 가시를 넘어요 | Jump the spikes |
| level2_tag | 상자에 올라요 | Climb the boxes |
| level3_tag | 발판으로 높이! | Bounce up high |
| level4_tag | 얇은 판에 올라요 | Hop on thin ledges |
| level5_tag | 분홍 문은 빨라요 | Pink gates go fast |
| level6_tag | 고리에서 또 톡! | Tap again in rings |
| level7_tag | 위 가시는 기다려요 | Wait under top spikes |
| level8_tag | 하늘색 문은 느려요 | Blue gates go slow |
| level9_tag | 다 섞였어요! | All mixed up! |
| level10_tag | 마지막 무대! | The last stage! |

- `level_locked`는 두 곳에 나옵니다(`main.js` 확인, 2026-11-17): ① 잠긴 카드를 누르면 자물쇠 그림 + 작은 글 토스트(1.2 s), ② 잠긴 카드 버튼의 대체 글 "번호. 이름 (`level_locked`)". 토스트에서는 자물쇠 그림이 본문이고 글은 보조라, 문장은 한 문장 12자 이내로 둡니다. 대체 글에서 레벨 이름 뒤 괄호 안에 붙어도 뜻이 통하는 상태 문장이어야 합니다.
- 영어 `level_locked`를 "Beat the last level first"에서 "Finish the level before it"로 바꿨습니다. "last level"이 "마지막 레벨(레벨 10)"로도 읽혀, 레벨 3 카드에서 "레벨 10부터 깨라"로 들릴 수 있었습니다. 한국어 "앞 레벨"은 그대로입니다("깨다"는 `clear_all` "다 깼어요!"와 같은 말).

### 5-2. 플레이 중 HUD

| 키 | KR | EN |
|---|---|---|
| attempt | {n}번째 | Try {n} |
| progress | {pct}% | {pct}% |
| new_best | 최고 기록! | New best! |
| combo_label | 연속 | in a row |

- **콤보 표시 (결정 20·23, round-3)**: 옛 점 10칸 줄은 없애고, 위쪽 중앙에 **큰 숫자 + 작은 라벨 `combo_label`**을 둡니다. 숫자와 라벨을 이어 읽으면 "18 연속" / "18 in a row"로 한 문장이 됩니다. 라벨은 숫자 오른쪽(가로 화면) 또는 아래(세로 화면)에 붙이고, 숫자와 라벨 사이 순서는 두 언어 모두 **숫자 먼저**입니다. 크기·자리·색·움직임은 `30-art.md` 5-8이 정합니다.
  - 라벨은 소문자·일반 글꼴(한국어는 그대로)로 둡니다. 영어 대문자 한 단어("STREAK" 등)로 바꾸지 않습니다(레퍼런스 화면의 대문자 콤보 글자 배치와 닮음).
  - 쓰지 않는 말: "COMBO"·"콤보"(레퍼런스 화면 글자와 그 음역), 레퍼런스 판정·칭호 문구. 키 이름의 `combo`는 데이터용이라 화면에 나오지 않습니다.
  - 길이: 한국어 2자, 영어 3단어(플레이 중 한도 12자·6단어 안). 라벨이 한 글자라도 더 짧아야 하면 대안 "연속!" / "Streak"(첫 글자만 대문자)을 씁니다. 대안을 쓰면 이 표 값을 바꿉니다(빌드에서 고치지 않음).
  - 라벨은 숫자가 보일 때만 함께 보입니다(보이는 시작 값은 `balance.json combo`·30-art 기준). 단계(5·10·15·20, 결정 18) 연출과 끊김에는 글을 더하지 않습니다.
- 화면 낭독용 이름(`combo_aria` 등)은 5-8절에 둡니다.
- 탭마다 뜨는 판정 이름·판정 %와 결과 화면 정확도·최고 콤보 문구는 5-9절입니다(2026-11-17 요청자 추가 지시).
- 연습 모드 깃발 키 4개(`practice_checkpoint_placed`·`practice_checkpoint_removed`·`practice_place_btn`·`practice_remove_btn`)는 뺐습니다(2026-11-17). 연습 모드가 자동 체크포인트로 바뀌어 깃발 꽂기·빼기 버튼과 알림 토스트가 없습니다(`DEV_NOTES.md` "버튼" 줄, `games/reverbound/js/` 사용 0곳). 수동 깃발을 되살리면 예전 문구(깃발을 꽂았어요 / Flag placed, 깃발을 뺐어요 / Flag removed, 깃발 꽂기 / Place flag, 깃발 빼기 / Remove flag)로 이 표에 되돌립니다.

### 5-3. 일시정지와 설정

| 키 | KR | EN |
|---|---|---|
| pause_title | 잠깐 멈춤 | Paused |
| pause_resume | 계속 | Continue |
| pause_restart | 처음부터 | Restart |
| pause_practice_toggle | 연습 모드 | Practice |
| pause_quit | 레벨 고르기 | Levels |
| resume_countdown | 3 · 2 · 1 | 3 · 2 · 1 |
| settings_music | 음악 | Music |
| settings_sfx | 효과음 | Sounds |
| settings_offset | 박자 맞추기 | Beat timing |
| settings_offset_help | 소리가 늦으면 +, 빠르면 − | Sound late? Use +. Early? Use − |
| settings_offset_unit | {ms} ms | {ms} ms |
| settings_offset_test | 눌러서 맞춰 봐요 | Tap to test |
| settings_shake | 화면 흔들림 | Screen shake |
| settings_trigger_sfx | 발판 소리 | Pad sound |
| settings_on | 켜짐 | On |
| settings_off | 꺼짐 | Off |
| settings_reset | 기록 지우기 | Reset progress |
| settings_reset_confirm | 기록이 모두 지워져요. 지울까요? | Erase all progress? |
| confirm_yes | 지우기 | Erase |
| confirm_no | 취소 | Cancel |

- `pause_practice_toggle`은 상태 말을 붙이지 않은 "연습 모드" 하나입니다. 켜짐/꺼짐은 토글 모양(또는 `settings_on`/`settings_off`)으로 보여 줍니다. "연습 모드 · 켜짐"처럼 붙이는 것은 괜찮고, "켜기/끄기 · 끄기"처럼 같은 말이 겹치지 않게 합니다.
- `settings_shake`는 `30-art.md` 6절 "흔들림 끄기" 토글, `settings_trigger_sfx`는 7-3절 "발판 발동음(기본 끔)" 토글용입니다. 레벨 6부터 고리가 나오지만, `30-art.md` 7-3절에서 `sfx.trigger`가 "점프 발판 전용"이므로 문구는 "발판 소리"로 둡니다. 아트에서 고리에도 같은 소리를 쓰기로 바꾸면 "발판·고리 소리 / Pad & ring sound"로 고칩니다.
- `settings_on`/`settings_off`는 버튼 동작("켜기")이 아니라 지금 상태("켜짐")를 나타내는 말로 바꿨습니다.

### 5-4. 사망 메시지 (MVP 빌드는 표시하지 않음)

round-2 결정으로 **사망 토스트를 없앱니다.** 사망은 조각 연출과 효과음으로만 알립니다. 아래 목록은 `sync-data.mjs`가 빈 목록을 오류로 보기 때문에 남겨 두는 예비 문구이며, 빌드는 `death_messages`를 화면에 띄우지 않습니다. 첫 사망 1회 안내는 5-6절 `tut_restart`(↻ 그림 + 짧은 글)가 맡습니다.

| # | KR | EN |
|---|---|---|
| 1 | 다시 해 보자! | Try again! |
| 2 | 조금만 더! | Almost! |
| 3 | 할 수 있어! | You can do it! |
| 4 | 한 번 더! | One more time! |

### 5-5. 클리어 메시지

| 키 | KR | EN |
|---|---|---|
| clear_title_l1 | 새벽이 밝았어요! | Morning is here! |
| clear_title_l2 | 시장에 불이 켜졌어요! | The lights are on! |
| clear_title_l3 | 종이 울렸어요! | The bell rang! |
| clear_title_l4 | 비가 그쳤어요! | The rain stopped! |
| clear_title_l5 | 기차가 출발했어요! | The train is off! |
| clear_title_l6 | 비눗방울이 날아요! | Bubbles everywhere! |
| clear_title_l7 | 고드름이 녹았어요! | The icicles melted! |
| clear_title_l8 | 꽃이 피었어요! | The flowers bloomed! |
| clear_title_l9 | 하늘에 닿았어요! | We reached the sky! |
| clear_title_l10 | 노래가 돌아왔어요! | The song is back! |
| clear_attempts | {n}번 만에 성공! | Done in {n} tries! |
| clear_attempts_one | 한 번에 성공! | First try! |
| clear_next | 다음 레벨 | Next |
| clear_retry | 다시 하기 | Again |
| clear_levels | 레벨 고르기 | Levels |
| clear_all | 모든 레벨을 깼어요! | You beat them all! |

- **시도 수 문구 (round-3)**: 시도가 1회(`attempts === 1`)이면 `clear_attempts_one`, 2회 이상이면 `clear_attempts`를 씁니다. `{n}`=1을 `clear_attempts`에 넣지 않습니다("1번 만에" / "1 tries" 방지). 12세 대표 봇(σ50)은 쉬운 레벨을 첫 시도에 깨는 일이 많아 `clear_attempts_one`이 자주 보이는 문구입니다. qa는 두 언어에서 시도 1회·2회 클리어 화면을 모두 찍습니다.
- `clear_all`: "다 깼어요! 최고예요!"는 칭찬이 두 번 겹쳐 12세에게 어리게 들릴 수 있어 한 문장으로 줄였습니다(11자, 결과 화면 문구라 플레이 중 한도 대상 아님). 영어는 그대로입니다.
- `clear_title_lN`은 빌드가 `clear_title_l` + 레벨 번호로 찾습니다(`games/reverbound/js/main.js`). 레벨 10개 모두 키가 있어야 합니다.
- "노래가 돌아왔어요!"는 이야기의 끝이라 레벨 3에서 레벨 10으로 옮겼습니다. 레벨 3은 "종이 울렸어요!"로 바꿨습니다.
- `clear_all`은 레벨 10 클리어 화면에서 모든 레벨을 깼을 때 덧붙이는 마무리 문구로 그대로 씁니다.

클리어 화면 부제 (무작위로 돌려 씀):

| # | KR | EN |
|---|---|---|
| 1 | 잘했어요! | Great job! |
| 2 | 멋져요! | Awesome! |
| 3 | 끝까지 왔어요! | You made it! |
| 4 | 대단해요! | Amazing! |

### 5-6. 튜토리얼 문구

- 원칙: **레벨당 새 기믹 1개, 카드 1장.** 레벨 1만 조작 카드(`tut_tap`)가 하나 더 있습니다.
- 표시 위치(박): **레벨 데이터 `levels/*.json`의 `cues`를 따릅니다.** 이 문서는 키 목록과 레벨만 확정합니다. 박 위치는 balance-designer가 정합니다(그 기믹이 처음 나오기 전, 숨 고르기 구간 권장).
- 글은 보조입니다. 카드 그림이 본문이므로 그림은 바로 뒤에 처음 만나는 오브젝트의 실제 색·모양과 같아야 합니다.

| 키 | 레벨 | 표시 시점 | 그림 힌트 (글 없이 읽히는 것) | KR | EN |
|---|---|---|---|---|---|
| tut_tap | 1 | `cues` (시작 직후) | 손가락이 화면을 톡 누름 → 핑이 위로 뜀 (손가락 시연과 같은 그림) | 누르면 뛰어요 | Tap to jump |
| tut_shard | 1 | `cues` (첫 가시 앞) | 산호색 가시 위로 핑이 넘어가는 곡선 화살표 | 가시는 뛰어넘어요 | Jump over spikes |
| tut_crate | 2 | `cues` (첫 상자 앞) | 상자 윗면(밝은 띠) 위에 핑이 올라선 모습 + 위로 가는 화살표 | 상자 위로 올라가요 | Jump onto boxes |
| tut_drum | 3 | `cues` (첫 발판 앞) | 민트 발판 위에서 핑이 높이 튀어 오르는 큰 화살표 | 발판이 높이 올려 줘요 | Pads bounce you high |
| tut_string | 4 | `cues` 22박 (첫 얇은 판 앞) | 공중에 뜬 얇은 판(바닥색, 상자의 1/4 두께, 윗면 밝은 띠) 위에 핑이 올라선 모습 + 위로 가는 곡선 화살표. 판 아래는 비어 있음 | 얇은 판에도 올라가요 | Hop onto thin ledges |
| tut_tempo | 5 | `cues` 21박 (첫 분홍 문 앞) | 분홍 세로 캡슐 문(꺾쇠 3개)을 핑이 지나면 뒤에 길게 늘어진 점프 곡선 + 빠름 줄 3개 | 분홍 문은 빨라요! | Pink gate: go fast! |
| tut_ring | 6 | `cues` 24박 (첫 고리 앞) | 핑이 뛰어서 점프 꼭대기의 민트 고리(속 빈 동그라미)에 닿음 + 그 순간 손가락이 톡 누름(탭 물결) → 한 번 더 뜨는 곡선 | 고리에서 또 톡! | Tap again in the ring |
| tut_hanging | 7 | `cues` 23박 (첫 위 가시 앞) | 위에서 줄·막대에 매달린 아래 방향 산호색 가시 + 그 아래를 핑이 땅에 붙어 걸어감(옆 화살표) + 손가락에 금지 표시(`hud` 색, 산호색 아님) | 위 가시? 기다려요 | Top spike? Wait, don't tap |
| tut_tempo_slow | 8 | `cues` 30박 (첫 하늘색 문 앞) | 하늘색 세로 캡슐 문(꺾쇠 1개)을 핑이 지나면 뒤에 짧고 낮은 점프 곡선 | 하늘색 문은 느려요 | Blue gate: go slow |
| tut_restart | 공통 | 첫 사망 후 1회 (이벤트, `cues`에 없음) | ↻ 그림 | 괜찮아, 다시 해 봐! | It's OK! Try again! |

- 작은 가시(`spike_low`)는 가시와 같은 행동(누르면 넘음)이라 카드를 따로 두지 않습니다. `tut_shard` 그림에 작은 가시를 옆에 함께 그리는 것은 선택(game-developer·art-director 판단).
- 표시 박은 지금 `levels/*.json`의 `cues` 값을 옮겨 적은 것입니다. 박을 바꾸는 것은 balance-designer이고, 이 문서는 키·레벨·문구만 확정합니다.
- 상아색 문(보통)은 빠름·느림 구간을 끝내는 문이라 카드를 두지 않습니다. 레벨 5 카드는 분홍 문만, 레벨 8 카드는 하늘색 문만 그립니다(레벨당 새 기믹 1개, 카드 1장).
- 문 카드 그림의 색·꺾쇠 수는 `30-art.md` 부록 B-4와 같아야 합니다(분홍 `gateFast` 3개, 하늘색 `gateSlow` 1개). 지금 빌드의 `tut_tempo` 그림(분홍 캡슐 + 꺾쇠 3개)은 이와 맞습니다.
- `tut_hanging`: 플레이어가 할 일은 "누르지 않기" 하나입니다. 예전 예비 문구 "위에 가시면 기다려요"는 "가시면"이 "가다"의 높임말로도 읽혀 바꿨습니다.
- `tut_ring`: 예전 예비 문구 "고리에서 한 번 더 톡!"은 13자라 12자 한도를 넘어 "고리에서 또 톡!"으로 줄였습니다.
- 레벨 9·10은 새 기믹이 없어 cue가 없습니다(`20-balance.md` 14-6). 레벨 9·10용 튜토리얼 키는 두지 않습니다.
- **`tut_final` 폐기 (round-3)**: 레벨 10 응원 카드 `tut_final`("마지막 무대예요!" / "Last stage!")은 빌드에서 쓰지 않으므로 키 표에서 뺐습니다(아래 "뺀 키" 목록). 이유: 기믹 카드가 아니라 "레벨당 새 기믹 1개, 카드 1장" 규칙의 예외가 되고, 레벨 10의 마무리는 레벨 선택 이름표 `level10_tag`("마지막 무대!"), 클리어 제목 `clear_title_l10`, `clear_all`로 이미 전달됩니다. 키 표에서 빠지므로 `strings.json`에도 생기지 않아 DEV_NOTES에 "안 쓰는 이유"를 따로 둘 필요가 없습니다(criteria 세계관 절 R8 줄).

튜토리얼에서 뺀 키 (문자열 테이블에서도 뺌. 다시 쓰게 되면 아래 문구로 이 표에 되돌립니다):

- `tut_beat` (박자 안내, 기믹 아님. 카드 수를 줄이려고 뺌): 음악에 맞춰 톡! / Tap with the music
- `tut_low` (round-2 결정으로 삭제): 아이가 행동으로 옮길 수 없는 설명이라 쓰지 않음
- `tut_hold` (round-2 결정으로 삭제): 홀드 구간이 MVP에 없음. 조작은 "누르면 뛴다" 하나만 가르침
- `tut_final` (round-3 폐기, 위 이유): 마지막 무대예요! / Last stage! (그림: 반원 해 + 별 하나, `hud` 색)
- `tut_hanging`·`tut_string`·`tut_ring`·`tut_tempo`는 레벨 10개 확장으로 위 표에 되돌렸습니다(문구는 새로 고침).
- 예비 문구 (화면에 쓰지 않음):
  - `tut_bell` (뒤집힌 종, 2차): 종을 지나면 뒤집혀요 / Bells flip you over

### 5-7. 시스템 메시지

| 키 | KR | EN |
|---|---|---|
| loading | 불러오는 중… | Loading… |
| audio_unlock | 누르면 소리가 나요 | Tap for sound |
| rotate_hint | 옆으로 돌리면 더 넓어요 | Turn sideways to see more |
| paused_background | 멈췄어요. 누르면 계속해요 | Paused. Tap to go on |
| load_error | 못 불러왔어요. 다시 해 주세요 | Couldn't load. Try again |

- `rotate_hint`는 웹 세로 모드 첫 진입 때 1회만 띄우는 권유 문구입니다(`30-art.md` 5절). Android는 가로 고정이라 쓰지 않습니다.

**부트 단계 문구와 언어 (round-3)** — `strings.json`을 읽기 전에 보이는 화면(불러오는 중, 불러오기 실패)도 이 표의 `loading`·`load_error` 값을 씁니다.

- 언어: 부트 인라인 스크립트(첫 그림 전에 실행)가 이 문서 맨 위 확정값 표의 "화면 언어 선택" 규칙(`?lang=` → `navigator.language`)으로 언어를 먼저 정하고 `<html lang>`을 그 값(`ko`/`en`)으로 바꿉니다. `index.html`의 `lang="ko"` 고정값에 기대지 않습니다.
- 문구: `strings.json`이 실패해도 영어 고정 "Load error"를 띄우지 않습니다. 부트 블록에는 `loading`·`load_error`의 KR·EN 두 값만 **이 표에서 옮겨 넣고**(손으로 새 문구를 만들지 않음. `sync-data`가 넣거나, 넣은 값이 이 표와 같은지 sync 때 검사), 정한 언어 쪽을 씁니다. 새 키는 만들지 않습니다.
- ↻ 다시 버튼은 지금처럼 부트 블록 인라인 그림으로 둡니다(글 없이 다시 하기, criteria 세계관 절 rhythm-02 줄). 버튼 이름은 아래 `aria_retry_load`.
- 문서 제목 `<title>`은 두 언어 모두 `Reverbound`(게임 이름 영문 확정값)라 언어별로 바꾸지 않아도 됩니다.

**타이틀 보조 이름 언어 (`titleAlt`)**: 타이틀 화면은 큰 이름(`title`, 화면 언어)과 작은 보조 이름(다른 언어의 `title`)을 함께 보입니다(확정값 "한국어 부제"). 보조 이름 요소에는 그 글의 언어를 `lang`으로 붙입니다: 한국어 화면에서 "Reverbound"는 `lang="en"`, 영어 화면에서 "잔향 질주"는 `lang="ko"`. 낭독기가 한글을 영어 음성으로 읽지 않게 하려는 것입니다.

**버튼·화면 대체 글 (round-3, 하드코딩 0곳)** — 글 대신 그림(⏸ ← ⌂ × 스피커)만 보이는 버튼과 게임 캔버스의 이름입니다. 빌드는 `index.html`에 영어 고정 `aria-label`을 두지 않고 `fillStaticText`에서 `t()`로 채웁니다. 이름은 "무엇을 하는 버튼인지"만 말하고, 상태(켜짐·꺼짐)는 이름에 붙이지 않습니다.

| 키 | 붙는 곳 (지금 빌드) | KR | EN |
|---|---|---|---|
| aria_pause | 플레이 중 일시정지 버튼 `#pauseBtn` (지금 `"pause"`) | 잠깐 멈추기 | Pause |
| aria_back | 레벨 선택·설정 화면 왼쪽 위 ← 버튼 `[data-back]` 2곳 (지금 `"back"`) | 뒤로 | Back |
| aria_hub | 타이틀의 ⌂ 링크 `#hubLink` (게임 허브로 나감, 지금 `"hub"`) | 게임 목록 | All games |
| aria_game | 게임 캔버스 `#cv` (지금 `"game"`) | 게임 화면 | Game screen |
| aria_close | 세로 회전 안내의 × 버튼 `#rotateClose` (지금 `"close"`) | 닫기 | Close |
| aria_music | 설정의 음악 스피커 버튼 `#bMute` (지금 `settings_on`/`settings_off`만 읽힘) | 음악 소리 | Music sound |
| aria_retry_load | 불러오기 실패 화면의 ↻ 버튼 (부트 블록, `load_error`와 같은 방식으로 두 언어 값을 옮겨 넣음) | 다시 불러오기 | Load again |

- `aria_music`: 토글 버튼입니다. 이름은 대상("음악 소리")만 두고 상태는 **`aria-pressed`**로 줍니다: 음악이 나오면 `aria-pressed="true"`, 꺼져 있으면 `"false"`. 낭독은 "음악 소리, 토글 버튼, 눌림/안 눌림"처럼 들립니다. 이름에 "켜짐"·"꺼짐"을 붙이지 않습니다(상태가 두 번 읽힘). 슬라이더 라벨 `settings_music`("음악")은 슬라이더 이름으로 그대로 둡니다.
- 같은 규칙: 다른 켜고 끄는 버튼(일시정지의 `pause_practice_toggle`, 설정의 `settings_shake`·`settings_trigger_sfx`)도 이름은 그 키, 상태는 `aria-pressed`(또는 `role="switch"` + `aria-checked`)입니다. 지금 `pause_practice_toggle`은 이미 이렇게 되어 있습니다.
- `aria_game`: 캔버스 안의 오브젝트는 낭독하지 않습니다(그림 게임). 이름만 두고 `role="img"`로 둡니다. 판정 글·콤보 숫자는 캔버스에 그려지므로 캔버스 이름에 이어 붙이지 않습니다(콤보 수는 5-8절 meter로).
- 영어 값은 첫 글자만 대문자, 문장부호 없음(버튼 이름). 길이는 모두 플레이 중 한도(12자·6단어) 안입니다.

### 5-8. 대체 글 (화면 낭독, 콤보)

콤보는 **위쪽 중앙의 큰 숫자 + 작은 라벨 `combo_label`("연속" / "in a row")**로 보이는 보상입니다(결정 20·23, 5-2절. 크기·자리·연출은 `30-art.md` 5-8, 단계 값은 `20-balance.md`·`balance.json combo`). 옛 점 10칸 줄은 없어졌습니다. 이 절은 화면 낭독기용 이름만 둡니다. 12세가 소리로 들어도 바로 알아듣는 말로 쓰고, 화면 라벨과 같은 낱말("연속")을 써서 보이는 것과 들리는 것을 맞춥니다.

| 키 | 붙는 곳 | 읽는 때 | KR | EN |
|---|---|---|---|---|
| combo_aria | 플레이 중 위쪽 중앙 큰 콤보 숫자(숫자 + 라벨 묶음 하나) | 낭독기로 그 자리에 갔을 때만. 값이 바뀔 때 저절로 읽지 않음 | 연속 성공 | Jump streak |
| combo_best_aria | 레벨 선택 카드의 최고 콤보 칩(14 px 숫자 칩, D22·결정 20) | 카드를 읽을 때 | 최고 연속 성공 | Best jump streak |
| combo_mark_aria | (선택) 콤보 단계 5·10·15·20 (결정 18) | 단계 연출 때 한 번, 조용히 알림 | 이어서 잘 뛰어요! | Great jumps, keep going! |

- **숫자는 이름에 넣지 않습니다.** 콤보 수는 값 속성으로만 줍니다(`harness/criteria.md` 세계관 절 "대체 글에 숫자·값을 이어 붙이지 않음"). 권장: 큰 숫자 묶음을 `role="meter"` 요소 하나로 두고 `aria-label` = `combo_aria`, `aria-valuemin` 0, `aria-valuemax` = 그 레벨 `judge_taps` 길이, `aria-valuenow` = 콤보 수, `aria-valuetext` = 콤보 수 숫자만(예 "7"). 낭독기가 meter 값을 "47 %"처럼 퍼센트로 읽지 않게 하려는 것입니다. 읽히는 말은 "연속 성공, 7" 정도가 됩니다. 화면의 숫자 글자와 라벨 "연속"은 그 meter 안의 그림으로 보고 따로 읽지 않습니다(숫자를 캔버스에 그리면 화면 밖 meter 요소 하나를 따로 둠).
- 판정 %와 결과 화면 정확도는 실제 퍼센트이므로 이 규칙과 상관없이 "%"를 붙여 읽습니다(5-9절).
- **숫자 읽기는 필요한 만큼만**: 콤보 수 하나만 읽습니다. 등급(1·2·3단)은 판정마다 읽지 않습니다(가장 가까운 두 탭이 179 ms라 낭독이 따라가지 못하고 곡을 가림).
- `combo_aria` 숨김: 큰 숫자가 안 보일 때(보이는 시작 값 전, 끊겨 사라진 뒤)는 낭독기에서도 숨깁니다. 숨길 때는 **`hidden` 속성(또는 `display:none`)만** 쓰고, `aria-hidden` 요소에 `aria-label`을 남기지 않습니다(round-2 qa 이슈 6, criteria 세계관 절 rhythm-02 줄). `aria-live`를 붙이지 않습니다. 성공마다 읽으면 플레이를 방해합니다.
- `combo_best_aria`: 일반 모드 기록만 있으므로(`best_record_modes` normal) 기록이 표시 기준 미만이거나 연습 모드 카드에서 칩을 안 보이면 숨깁니다. 값은 `aria-valuenow`(·`aria-valuetext`) = 최고 콤보 수. 칩은 지금처럼 레벨 카드 버튼 **밖** 형제 요소로 둡니다(버튼 `aria-label` 안에 묻히지 않게). 접근성 트리(ariaSnapshot)에 "최고 연속 성공"과 값이 실제로 나오는지 qa가 확인합니다.
- `combo_mark_aria`(선택): 단계 5·10·15·20에서만 `aria-live="polite"` 영역에 한 번 넣습니다(한 시도에 많아야 4번, 두 단계 사이는 판정 탭 5개 이상이라 겹치지 않음). 숫자를 넣지 않아 단계마다 같은 문장입니다. 끊길 때(사망)는 아무것도 읽지 않습니다(겁주지 않기). 넣지 않아도 `combo_aria` 값으로 콤보 수를 알 수 있으므로 기본은 dev 판단입니다.
- 쓰지 않는 말: "COMBO"·"콤보"(레퍼런스 화면 글자와 그 음역, 결정 23), 레퍼런스 판정·칭호 이름. 키 이름의 `combo`는 데이터용이라 화면에 나오지 않습니다.
- 글자 수(공백·문장부호 포함): `combo_label` 2자 / 3단어, `combo_aria` 5자 / 2단어, `combo_mark_aria` 10자 / 4단어(플레이 중 읽히므로 12자·6단어 한도 안), `combo_best_aria` 8자 / 3단어(레벨 선택 화면 전용).
- round-3에서 바뀐 값: `combo_aria` "이어서 잘 뛴 수 / Good jumps in a row" → "연속 성공 / Jump streak"(결정 23), `combo_best_aria` "이어서 잘 뛴 최고 기록 / Most jumps in a row" → "최고 연속 성공 / Best jump streak"(화면 라벨·`combo_aria`와 같은 낱말로 맞춤).

### 5-9. 판정 이름과 결과 화면 (2026-11-17 요청자 추가 지시 "판정 이름과 퍼센트까지 해주세요.")

탭마다 판정 이름 + 판정 %를 잠깐 띄우고, 클리어 화면에 레벨 정확도 %와 최고 콤보를 더합니다. **판정 글 자리는 `30-art.md` 5-8-2가 정합니다**(지금 빌드·30-art 표현: "플레이어 뒤쪽 위", 지나온 쪽. round-3에 30-art가 자리를 다시 쓰면 그 문서를 따르고, 이 문서에는 자리를 따로 적지 않습니다). 계산·표시 시간은 `20-balance.md` 15-10, `balance.json combo.judge_pct`가 기준이고, 글꼴·크기·색도 `30-art.md`(art-director)가 정합니다. 기준 문서: `harness/benchmarks/djmax-judgement.md` 7-3·7-5, `harness/criteria.md` 게임 감각 "판정 이름과 퍼센트 표시" 줄.

**판정 이름 (확정)**

| 키 | 등급 (데이터) | % 범위 | KR | EN |
|---|---|---|---|---|
| judge_name_1 | 1단 (`grade` 1, 기획 이름 "딱") | 90~100 | 딱이야 | Wow! |
| judge_name_2 | 2단 (`grade` 2, "좋아") | 60~80 | 좋아 | Nice! |
| judge_name_3 | 3단 (`grade` 3, "통과") | 10~50 | 됐다 | OK! |
| judge_pct | 판정 % (이름 아래 작게) | 10~100 | {pct}% | {pct}% |

- **모두 칭찬 말**입니다. 3단도 콤보가 이어지는 성공이라 시험 말투 "통과"를 화면에 쓰지 않습니다. 기획 문서·데이터의 딱/좋아/통과·등급 1/2/3은 그대로 둡니다.
- 벤치마크 권장안(딱이야/좋아/됐어, Wow!/Nice/OK)에서 두 군데를 runner-01 톤에 맞췄습니다.
  - 3단 "됐어" → **"됐다"**: "됐어"는 입말로 "그만해·필요 없어"(예: "됐어, 안 해")로도 쓰여 혼자 뜨면 퉁명스럽게 들릴 수 있습니다. "됐다!"는 뛰어서 넘었을 때 스스로 외치는 말이라 "괜찮아, 다시"·"끝까지 왔어요!" 같은 밝은 톤과 맞습니다.
  - 영어는 셋 다 느낌표를 붙여 **Wow! / Nice! / OK!**로 맞췄습니다. 한 등급만 느낌표가 없으면 그 등급만 덜 칭찬처럼 보입니다.
- 길이: 한국어 3·2·2자, 영어 4·5·3자(느낌표 포함). 벤치마크 7-3 "한국어 2~3자, 영어 2~4자 + 느낌표"와 플레이 중 한도(12자·6단어) 안입니다. 띄어쓰기 없음이라 한 줄에서 잘리지 않습니다.
- 원본 보호: 레퍼런스 리듬 게임의 판정·칭호 이름(영어 대문자 판정 이름, "이름 + 숫자%"를 붙여 한 덩어리로 쓰는 표기)을 쓰지 않았습니다. 이름과 %는 **두 줄**(이름 위, % 아래 작게)로 따로 씁니다.
- **실패에는 이름을 만들지 않습니다.** 0 %·빨간 글·"놓침" 같은 말 없음(겁주지 않기). 맞출 탭이 없는 점프(헛점프)·북 발판 자동 점프도 이름·%가 뜨지 않습니다.
- 글을 읽지 않아도 크기·반응 모양(등급 점 3·1·0개 등, 30-art)으로 등급을 압니다(글 없이 진행 원칙 유지). 이름은 12세가 한눈에 읽는 덧붙임이고, 0.4 s 안에 읽히도록 2~3자로 둡니다.
- 낭독: 판정 이름·%는 판정마다 읽지 않습니다(5-8절과 같은 이유, 가장 가까운 두 탭 179 ms). 판정 표시 요소는 `aria-hidden`으로 두고, 결과 화면 값만 읽습니다.

**결과 화면 (클리어 화면에 더하는 줄)**

| 키 | 붙는 곳 | KR | EN |
|---|---|---|---|
| result_accuracy_value | 정확도 큰 숫자 | {pct}% | {pct}% |
| result_best_combo_value | 최고 콤보 숫자 | {n} | {n} |
| result_accuracy_aria | 정확도 줄의 대체 글(이름) | 박자를 맞힌 정도 | How well you hit the beat |
| result_best_combo_aria | 최고 콤보 줄의 대체 글(이름) | 최고 연속 성공 | Best jump streak |
| result_new_best_aria | 신기록 표지의 대체 글 | 새 최고 기록이에요 | A new best |

- 결과 화면은 **그림표가 주, 글은 보조**입니다(벤치마크 7-5). `30-art.md`가 그림표만 두기로 정해(점 아이콘 + 정확도, 도넛 + 최고 콤보, 신기록은 밑줄 표시) 화면 글 이름표 키는 쓰지 않고 대체 글 키만 씁니다.
- `result_best_combo_aria`: round-3에서 "가장 많이 이어서 잘 뛴 수 / Most good jumps in a row" → "최고 연속 성공 / Best jump streak"로 바꿨습니다. 플레이 중 라벨 "연속"·`combo_aria` "연속 성공"과 같은 낱말이라 "그 숫자가 이번 판의 최고치"로 바로 이어집니다. 레벨 카드 칩 `combo_best_aria`와 같은 문장이지만 화면이 달라 함께 읽히지 않습니다.
- `result_accuracy_aria` "박자를 맞힌 정도": 12세는 "정확도"를 알지만, 이 게임에서 잰 것이 "박자"라는 점이 바로 들리게 풀어 썼습니다. 레퍼런스 결과 화면 표기(영어 대문자 약어 등)는 쓰지 않습니다.
- **진행도 %와 헷갈리지 않게**: 레벨 카드·HUD의 `best_normal`("최고 {pct}%")·`progress`("{pct}%")는 **진행도**입니다. 정확도 %는 결과 화면에만 그림표(점 아이콘)와 함께 나오고, 레벨 카드에는 정확도를 두지 않습니다(카드에 "%" 숫자가 두 개 생기지 않게). 클리어 화면에서는 진행도 %를 다시 보이지 않습니다(클리어 = 100 %).
- 값 읽기: 정확도·최고 콤보는 대체 글 이름 + 값 속성으로 줍니다(이름에 숫자를 이어 붙이지 않음, 5-8절과 같은 원칙). 정확도는 실제 퍼센트이므로 값을 "%"와 함께 읽어도 됩니다(예: "박자를 맞힌 정도, 87%"). 최고 콤보는 5-8절 콤보 규칙대로 `aria-valuetext` = 숫자만("최고 연속 성공, 18").
- 실패한 시도·연습 모드에는 정확도가 없으므로 이 줄들을 띄우지 않습니다(빈 칸·"0%"·"-" 없음). 연습 모드 클리어 화면은 지금처럼 정확도·최고 콤보 없이 나옵니다.
- 글자 수(공백 포함): `result_accuracy_aria` 9자 / 6단어, `result_best_combo_aria` 8자 / 3단어. 결과 화면 전용이라 플레이 중 한도 대상이 아닙니다.

**뺀 키 (round-3, 빌드에서 쓰지 않아 키 표에서 뺌. `DEV_NOTES.md` D21 4키 정리)** — 키 표에서 빠지면 `sync-data` 뒤 `strings.json`에도 없어져, "원본 키는 빌드에서 모두 쓰이거나 안 쓰는 이유가 DEV_NOTES에 있음"(criteria 세계관 절 R8 줄)을 키 표 자체로 지킵니다. 그림표 대신 글 이름표를 다시 쓰게 되면 아래 문구로 표에 되돌립니다.

- `result_accuracy` (정확도 글 이름표, 30-art가 그림표만 둠): 박자 맞히기 / Timing
- `result_best_combo` (최고 콤보 글 이름표, 〃): 최고 연속 / Best streak (되돌릴 때는 round-3 낱말로. 예전 값 "이어서 잘 뛴 수 / Jumps in a row"는 쓰지 않음)
- `result_new_best` (신기록 글 표지, 빌드는 밑줄 표시 + `result_new_best_aria` 낭독): 신기록! / New record!
- `best_accuracy_aria` (레벨 카드 정확도 표지, 카드에 정확도를 두지 않음): 박자 최고 기록 / Best timing

## 6. 스토어 등록 문구 초안

### 짧은 설명 (80자 이내)

- KR: 누르면 뛰어요. 박자에 맞춰 가시를 넘고 끝까지 달리는 쉬운 리듬 러너. (40자)
- EN: One tap. One beat. Jump the spikes in a simple rhythm runner. (61 characters)

### 긴 설명

**KR**

세상을 움직이던 노래가 멈췄습니다. 남은 건 마지막 한 소절의 울림, 작은 돌 핑뿐입니다.

화면을 눌러 박자에 맞춰 뛰고, 잡음 결정을 넘어 해돋이 무대까지 달려 노래를 다시 울리세요.

- 버튼은 하나. 누르면 뜁니다.
- 음악이 곧 길입니다. 모든 장애물이 박자 위에 놓여 있어요.
- 부딪혀도 바로 다시 시작. 메뉴도, 기다림도 없습니다.
- 진행도 %로 매번 조금씩 더 멀리.
- 연습 모드에서는 깃발이 저절로 꽂혀, 어려운 곳부터 다시 할 수 있어요.
- 박자에 맞춰 이어서 뛸수록 화면 위 "연속" 숫자가 커져요.
- 박자 보정 기능으로 기기마다 다른 소리 지연을 맞출 수 있어요.
- 레벨 10개: 새벽 조율장부터 해돋이 무대까지. 레벨마다 새로운 것이 하나씩 나와요(상자, 북 발판, 얇은 판, 템포 문, 울림 고리, 매달린 잡음).
- 재시작 사이에 광고가 끼어들지 않습니다.

한 번만 더, 한 소절만 더.

**EN**

The song that kept the world moving has stopped. All that remains is the last echo of the final bar: a small ringing stone named Ping.

Tap to jump on the beat, hop over the Static Shards, and run all the way to the Sunrise Stage to bring the song back to life.

- One button. Tap to jump.
- The music is the map. Every obstacle sits on the beat.
- Crash and you're right back in. No menus, no waiting.
- Watch your progress % grow with every run.
- Practice mode drops flags for you, so you replay just the tricky parts.
- Keep jumping on the beat and watch your streak climb.
- Audio offset calibration keeps the beat in sync on any device.
- Ten levels, from Dawn Tuning Yard to Sunrise Stage. Each one adds one new thing: Echo Crates, Drum Pads, String Ledges, Tempo Gates, Echo Rings, Hanging Hiss.
- No ads between retries.

One more run. One more bar.

- 홀드(누르고 있으면 착지할 때마다 다시 뜀)는 빌드에서 동작하더라도 MVP 레벨이 홀드를 요구하지 않으므로 스토어 문구에서 뺐습니다(튜토리얼과 같은 "탭 하나" 메시지).

### 스토어 스크린샷 문구 (위쪽 20% 문구 띠)

장면 목록의 기준은 `30-art.md` 8-2입니다. 아래 장면은 MVP 기믹 범위(가시·상자·발판)에 맞춘 제안이며, 아트 쪽 장면이 다르면 문구 번호를 그 장면에 맞춰 씁니다.

| # | 장면 (제안) | KR | EN |
|---|---|---|---|
| 1 | 새벽 조율장, 가시 위로 점프 | 누르면 뛰어요 | One tap. One beat. |
| 2 | 줄다리 야시장, 상자 위로 올라섬 | 상자 위로, 박자 위로 | Hop up on the beat |
| 3 | 폭풍 종탑, 발판으로 높이 튀어 오름 | 발판 타고 높이! | Bounce up high! |
| 4 | 사망 조각 + 진행도 "최고 87%" | 부딪혀도 바로 다시 | Crash. Go again. |
| 5 | 레벨 선택 (10개 팔레트) | 열 곳, 열 개의 노래 | Ten places. Ten songs. |

---

## 교차 리뷰 처리 결과 (1-2)

상세 표는 `reviews/cross/lore-writer.md`. 다른 역할에 넘기는 것:

- 밸런스 기획자: `levels/*.json`의 `name`을 맨 위 확정값 표대로 채우기. `theme_id`는 현재 값 유지.
- 아티스트: `30-art.md` 머리말의 "`10-lore.md` 미반영" 문구 갱신, 팔레트 열 제목에 레벨 이름 병기(선택). G7 에셋은 2차.
- 빌더: 5절 키를 문자열 테이블 키로 그대로 사용. `{n}`, `{pct}`, `{ms}`는 치환 자리.

## round-2 처리 결과 (2026-11-17)

보고서: `Docs/lore-writer/2026-11-17-r2-text-fixes.md`. 다른 역할에 넘기는 것:

- balance-designer: `cues` 키를 5-6절 표대로 (레벨 1 `tut_tap`·`tut_shard`, 레벨 2 `tut_crate`, 레벨 3 `tut_drum`). 박 위치는 재설계한 레벨에 맞춰 정함.
- game-developer: `sync-data` 후 `strings.json`에서 `tut_beat`·`tut_low`·`tut_hold`·`tut_hanging`·`tut_string`·`tut_ring`·`tut_tempo` 키가 빠짐(`t()`가 빈 키를 어떻게 처리하는지 확인). 사망 토스트 제거(`death_messages` 표시 안 함, 첫 사망 `tut_restart`만 유지). 일시정지 연습 토글은 `pause_practice_toggle` + 상태(`settings_on`/`settings_off`) 또는 토글 모양. 언어는 `navigator.language` 자동 선택. 한국어 글에 `word-break: keep-all`.
- art-director: 4절 시각 힌트는 `30-art.md` 2절에 맞춤. 스토어 스크린샷 장면 2·3은 MVP 기믹 범위에 맞춰 바꾸기를 제안(6절).

## 레벨 10개 확장 처리 결과 (2026-11-17)

보고서: `Docs/lore-writer/2026-11-17-r2-levels-10-text.md`. 근거: `20-balance.md` 14장(14-2, 14-6, 14-7), `balance.json`, `levels/04~10`. 다른 역할에 넘기는 것:

- balance-designer: `levels/04~10`의 `name`/`name_en`/`name_key`를 맨 위 확정값 표대로 채워 주세요(`name_key` = `level4_name` … `level10_name`). `theme_id`는 `level4`~`level10` 그대로. cue 키 5개(`tut_string` 4, `tut_tempo` 5, `tut_ring` 6, `tut_hanging` 7, `tut_tempo_slow` 8)는 지금 JSON과 같아 바꿀 것 없음. `tut_final`(레벨 10, 선택)은 넣을지 판단만.
- game-developer: `sync-data` 후 `strings.json`에 `level4~10_name`, `level4~10_tag`, `clear_title_l4~l10`, `tut_string`·`tut_tempo`·`tut_ring`·`tut_hanging`·`tut_tempo_slow`(·`tut_final`)가 들어오는지 확인. `tut_tempo_slow` 그림 카드는 아직 `main.js`에 없음(하늘색 캡슐 + 꺾쇠 1개 + 짧은 점프 곡선). `clear_title_l3` 문구가 바뀜. 레벨 선택 카드에서 가장 긴 이름 "비눗방울 언덕"(7자)·"Wirebridge Night Market"이 360×640에서 잘리지 않는지 확인.
- art-director: 레벨 4~10 팔레트·모티프는 4절 "시각" 칸을 분위기 힌트로 참고(정하는 것은 `30-art.md`). 위 가시는 고드름 색이 아니라 `hazard` 산호색 유지. 그림 카드 5장은 5-6절 그림 힌트와 부록 B 모양·색이 같아야 함. 스토어 스크린샷 장면 5 문구가 "열 곳, 열 개의 노래"로 바뀜.

## 콤보 대체 글·문구 정리 처리 결과 (2026-11-17)

보고서: `Docs/lore-writer/2026-11-17-r2-combo-text.md`. 근거: `20-balance.md` 15-5·15-9, `harness/benchmarks/djmax-judgement.md` 4·5-1절. 다른 역할에 넘기는 것:

- game-developer: `sync-data` 후 `strings.json`에 새 키 `combo_aria`·`combo_best_aria`·`combo_mark_aria`가 들어오고, `practice_checkpoint_placed`·`practice_checkpoint_removed`·`practice_place_btn`·`practice_remove_btn`이 빠짐(빌드 사용 0곳). `level_locked` 영어 문구가 바뀜. 콤보 대체 글은 5-8절 방식(이름은 키, 값은 `aria-valuenow`·`aria-valuetext`, 레벨 카드 버튼 밖에 표지 두기).
- qa-engineer: 접근성 트리에서 콤보 줄·카드 최고 콤보의 이름과 값이 읽히는지, 콤보 0~1일 때 숨는지 확인.

## 판정 이름·결과 화면 문구 처리 결과 (2026-11-17)

보고서: `Docs/balance-designer/2026-11-17-r2-percent.md`(이번 차수는 balance-designer가 lore 몫을 함께 맡음). 근거: `harness/benchmarks/djmax-judgement.md` 7-3·7-5, `20-balance.md` 15-10. 다른 역할에 넘기는 것:

- game-developer: `sync-data` 후 `strings.json`에 `judge_name_1`·`judge_name_2`·`judge_name_3`·`judge_pct`, `result_accuracy`·`result_accuracy_value`·`result_best_combo`·`result_best_combo_value`·`result_new_best`, 대체 글 `result_accuracy_aria`·`result_best_combo_aria`·`result_new_best_aria`·`best_accuracy_aria`가 들어옴. 판정 표시는 `aria-hidden`, 결과 화면 값은 이름 + 값 속성. 실패·연습 모드에는 정확도 줄을 띄우지 않음.
- art-director: 판정 이름은 이름(위) + %(아래, 0.5~0.6배) 두 줄. 결과 화면 정확도·최고 콤보 이름표 그림(과녁·박자 표지 등 자체 제작). 레벨 카드에 정확도를 둔다면 숫자 없이 표지만(진행도 %와 구분).
- qa-engineer: 영어 `Nice!`·`Jumps in a row`가 4해상도에서 잘리지 않는지, notext 화면에서 등급 구분, 접근성 트리에 결과 화면 이름과 값이 읽히는지.

## round-3 텍스트 수정 처리 결과 (2026-11-18)

보고서: `Docs/lore-writer/2026-11-18-r3-text.md`. 근거: `Docs/orchestrator/2026-11-18-1-7-round2-gate-and-round3-decisions.md` 결정 20·23과 round-3 배분 2번, `reviews/round-2/lore-writer.md` 이슈 1·2·4·5·7·8, `reviews/round-2/ux-reviewer.md` minor 6, `reviews/round-2/score.md` S5·S8·S22·S26·S27·S33. 다른 역할에 넘기는 것:

- game-developer: `sync-data` 후 `strings.json`에 새 키 `combo_label`·`clear_attempts_one`·`aria_pause`·`aria_back`·`aria_hub`·`aria_game`·`aria_close`·`aria_music`·`aria_retry_load`가 들어오고, 값이 바뀐 키는 `combo_aria`·`combo_best_aria`·`result_best_combo_aria`·`clear_all`, 빠진 키는 `tut_final`·`result_accuracy`·`result_best_combo`·`result_new_best`·`best_accuracy_aria`(빌드 사용 0곳 → DEV_NOTES D21 줄 정리). 구현: 큰 콤보 숫자 + `combo_label`(숫자 먼저), meter 하나에 `combo_aria`(숨길 때 `hidden`만), `attempts === 1`이면 `clear_attempts_one`, `index.html` 영어 고정 aria 6곳 → `aria_*` 키, `#bMute`는 `aria_music` + `aria-pressed`, 부트 인라인에서 lang·`loading`·`load_error`·`aria_retry_load` 두 언어 값(이 문서 값 그대로), `titleAlt`에 `lang`.
- art-director: 30-art 5-8 큰 숫자 설계에 라벨 `combo_label`("연속" / "in a row", 소문자·일반 글꼴, 숫자 먼저) 자리를 넣어 주세요. 판정 글 자리는 10-lore가 30-art 5-8-2만 참조합니다.
- qa-engineer: 두 언어 × 시도 1회·2회 클리어 화면, 큰 콤보 숫자 + 라벨 잘림(360x640·640x360), 접근성 트리에서 `aria_*` 이름과 `aria_music` 눌림 상태, en 기기 부트 화면 lang, 원본 보호 grep에 COMBO/콤보 유지.
