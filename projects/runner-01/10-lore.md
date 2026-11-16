# 10. 세계관: Reverbound (잔향 질주)

## 확정값 (1-2 교차 리뷰 후, 다른 역할은 이 표 그대로 사용)

| 항목 | 확정값 | 쓰는 곳 | 비고 |
|---|---|---|---|
| 게임 이름 (영문) | **Reverbound** | 타이틀, 스토어(영어), `games.json`, 앱 이름 | 확정 |
| 게임 이름 (한국어 부제) | **잔향 질주** | 타이틀 부제, 한국어 스토어 | 스토어 표기 `Reverbound: 잔향 질주` |
| 앱·웹 slug 제안 | `reverbound` | 앱 ID·패키지 이름 등 | 프로젝트 폴더 `runner-01` 이름 변경 여부는 오케스트레이터 결정 |
| 주인공 | 핑 (Ping) | 스토어 문구 | 게임 화면에는 이름 표시 없음 |
| `levels/01-level1.json` `name` | **`"새벽 조율장"`** | 레벨 선택, 레벨 시작 표시 | 영문 `Dawn Tuning Yard`는 문자열 테이블 `level1_name` |
| `levels/02-level2.json` `name` | **`"줄다리 야시장"`** | 〃 | 영문 `Wirebridge Night Market` (`level2_name`) |
| `levels/03-level3.json` `name` | **`"폭풍 종탑"`** | 〃 | 영문 `Storm Belfry` (`level3_name`) |
| `theme_id` | **`level1` / `level2` / `level3` 유지** | 레벨 JSON, `30-art.md` 팔레트 키 | 이름을 키로 바꾸면 두 문서가 함께 바뀌어야 해서 바꾸지 않음. 표시 이름은 `name`과 문자열 테이블로만 연결 |
| 레벨 파일 이름 | 현재 이름 유지 (`01-level1.json` 등) | `balance.json levels` | 변경 불필요 |
| `name` 필드 언어 | 한국어(기본 언어). 영어 화면은 `levelN_name` 키를 씀 | 빌드 | 빌드는 언어 설정에 따라 문자열 테이블을 우선 사용 |
| 기믹 이름표 | 4절 공통 용어 표 | UI·튜토리얼·스토어 | 스키마 `type` 값(`spike`, `pad` 등)은 바꾸지 않음 |

- 입력: `00-benchmark.md`, 교차 리뷰로 `20-balance.md`·`balance.json`·`levels/*.json`·`30-art.md` 반영 (2026-11-16)
- 원본 보호: 레퍼런스 게임의 이름, 캐릭터, 설정, 레벨명, 기믹 이름, UI 문구를 쓰지 않았습니다. 아래 이름과 문구는 모두 새로 만든 것입니다.
- 소유권: 수치·기믹 포함 여부·레벨 구성은 `20-balance.md`·`levels/*.json`, 색·형태·이펙트·사운드는 `30-art.md`가 기준입니다. 이 문서의 시각 힌트와 기믹 설명은 그 두 문서에 맞춘 **분위기 서술**이며, 다르면 그쪽이 맞습니다.

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

세상은 원래 하나의 노래로 움직였습니다. 가로등은 박자에 맞춰 깜빡이고, 다리는 화음으로 버티고, 종탑은 정오마다 세상을 다시 조율했습니다. 어느 날 노래가 멈추고, 소리가 사라진 자리에서 **정적(the Hush)**이 번지기 시작했습니다. 정적이 닿은 곳은 움직임이 굳고, 날카로운 붉은 **잡음 결정**만 돋아납니다. 남은 것은 마지막 한 소절의 잔향뿐. 그 잔향이 땅을 박차고 뛸 때마다 세상이 박자에 맞춰 잠깐 밝아집니다.

**톤 키워드**: 절박하지만 밝다 / 비트에 맞춰 숨 쉬는 세계 / 설명보다 리듬 / 실패는 슬픔이 아니라 "다시 한 소절".
글은 짧게, 명령형과 의성어를 섞어 박자감 있게 씁니다. 사망 문구도 놀리지 않고 등을 떠미는 말투로 씁니다.

화면의 질감(`30-art.md` 1절)은 **무광 색종이를 오려 붙인 판화 포스터**입니다. 그래서 세계관 서술에서도 "빛나다·네온·발광" 대신 "밝아지다·색이 오르다·종이가 펄럭이다"처럼 인쇄물·종이 감각의 말을 씁니다.

## 3. 주인공

| 항목 | 내용 |
|---|---|
| 이름 | **핑 (Ping)** |
| 정체 | 멈춘 노래의 마지막 잔향이 굳어 생긴 작은 **울림돌**. 몸 안에서 박자가 계속 울림 |
| 왜 멈추지 않는가 | 핑이 멈추면 마지막 소절도 끝나고, 등 뒤의 정적이 세상을 완전히 덮습니다. 달리는 동안만 소리가 이어지고, 박자를 이어 가야 종탑에 닿아 노래를 다시 울릴 수 있습니다 |
| 사망의 의미 | 잡음 결정에 부딪히면 핑은 조각으로 흩어졌다가, 마지막으로 크게 울린 자리(레벨 시작점 또는 연습 모드 체크포인트)에서 다시 모입니다. 그래서 재시작이 즉시(0.7 s)입니다 |
| 점프 | 핑이 땅을 차면 한 박이 울린다는 설정. 실제 점프음은 없고 음악이 그 역할을 함 (`30-art.md` 7절) |
| 생김새 (아트 기준 `30-art.md` 3·4-1절) | 얼굴 없는 **팔각형** 울림돌. 무광 단색 몸체 + 잉크 외곽선, 안쪽 팔각 선은 돌의 결, 회전 표식 원은 "울림 구멍"이라고 부름. 사망 시 팔각 조각 8개로 흩어지며 고리 하나가 퍼짐 = "소리 조각으로 흩어짐" |

## 4. 레벨 테마 (MVP 3개)

공통 용어 (기믹 이름은 UI·튜토리얼·스토어 문구에서 이 이름으로 씁니다):

| 코드 | 스키마 `type` | 이름 (KR / EN) | 설정 | MVP |
|---|---|---|---|---|
| G1 고체 블록 | `block` | 공명 상자 / Echo Crate | 아직 소리가 남은 상자. 올라탈 수 있지만 정면으로 박으면 핑이 깨짐 | 1~3번 |
| G2 바닥 즉사 | `spike` | 잡음 결정 / Static Shard | 정적이 굳어 생긴 날카로운 붉은 결정 | 1~3번 |
| G3 낮은 바닥 즉사 | `spike_low` | 잔잡음 / Low Hiss | 바닥에 깔린 낮은 결정. 조금 늦게 뛰어도 넘음 | 1~3번 |
| G4 천장 즉사 | `spike_ceiling` | 매달린 잡음 / Hanging Hiss | 위에서 자라 내려온 결정 | 2·3번 |
| G5 발판 자동 점프 | `pad` | 북 발판 / Drum Pad | 밟으면 "둥" 하고 높이 튕겨 냄 | 2·3번 |
| G6 공중 재점프 | `orb` | 울림 고리 / Echo Ring | 공중에 뜬 고리. 겹친 순간 탭하면 한 번 더 뜀 | 3번 |
| G8 속도 변경 | (`speed_changes`) | 템포 문 / Tempo Gate | 느림 = 늘임 문(Lento), 보통 = 제박 문(Tempo), 빠름 = 몰아침 문(Presto). 문 안의 꺾쇠 수(1·2·3)로 빠르기를 읽음 | 3번 |
| G12 얇은 발판 | `platform` | 현 발판 / String Ledge | 팽팽한 현을 받친 얇은 판. 위에서만 밟을 수 있음 | 2·3번 |
| G13 연출 | (`sections`) | 박동 / Pulse | 킥에 맞춰 배경이 한 번씩 밝아지는 연출. "잔향이 세상을 잠깐 되살림" | 1~3번 |
| G7 중력 반전 | - | 뒤집힌 종 / Upturned Bell | **2차 (MVP 제외, `20-balance.md` 10장 #1)**. 이름만 예약 | 2차 |

- 매우 빠름 속도(`very_fast`)는 MVP 레벨에서 쓰지 않으므로 이름을 두지 않습니다. 쓰게 되면 "질주 문(Prestissimo)"을 예약합니다.
- 수집품은 2차입니다(`00-benchmark.md` 11절). 이름은 2차 때 정합니다.

### 레벨 1. 새벽 조율장 (Dawn Tuning Yard)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | 120 BPM, 보통 속도 고정(속도 변경 0회), 96박 = 48.0 s |
| 장소 | 정적에 가장 먼저 잠긴 외곽의 악기 조율 공방 마당. 소리굽쇠 기둥과 쌓인 공명 상자 |
| 이야기 한 줄 | 핑이 처음 깨어나 달리는 법을 배우는 곳 |
| 분위기 키워드 | 새벽, 고요, 첫 박, 밝은 종이, 느긋함 |
| 시각 (아트 팔레트 `level1` "밝은 종이") | 새벽 햇살에 바랜 **크림색 종이 하늘**(`bg`), 그 위의 **회청색 공명 상자**(`ground`). 잡음 결정은 **붉은 결정**(`hazard`)으로 밝은 하늘 위에서 가장 진하게 보임. 먼 배경 도형은 색종이 언덕·아치로, 소리굽쇠 기둥과 멀리 작은 종탑 실루엣을 둥근 도형으로 암시 |
| 소리 (아트 7-2) | A 단조 펜타토닉, 밝고 느긋한 종이 공작 느낌 = "공방의 첫 조율" |
| 구성 (밸런스 7장) | 도입 8박(4초) 비움 → 탭 배우기(결정 1개씩 4박 간격 → 2연속) → 잔잡음 → 숨 고르기 → 공명 상자(올라타기·계단·내려오기) → 숨 고르기 → 드롭(1박 연속, 상자 사이 틈) → 마무리 8박 비움. 연속은 최대 2개 |
| 설정상 끝 장면 | 공방 마당 문을 박차고 나가면 멀리 등불이 하나둘 켜지는 시장이 보임 |

### 레벨 2. 줄다리 야시장 (Wirebridge Night Market)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | 128 BPM, 보통 속도 고정(속도 변경 0회), 128박 = 60.0 s |
| 장소 | 협곡 위로 케이블과 현을 엮어 만든 공중 야시장. 노점 천막, 줄에 매달린 등불, 큰 북. 해가 막 지고 장이 열리려던 순간에 굳어 버림 |
| 이야기 한 줄 | 시장 사람들은 굳었지만 등불은 아직 박자를 기억함. 핑이 지나가면 노점이 하나씩 다시 켜짐 |
| 분위기 키워드 | 해 질 녘, 장이 서는 시간, 흔들리는 줄, 들뜬 그루브 |
| 시각 (아트 팔레트 `level2` "해질녘 보라") | **해 질 녘 보랏빛 하늘**(`bg`), 연보라 공명 상자·현 발판(`ground`). 잡음 결정은 **주황 결정**(`hazard`). 북 발판과 울림 요소는 **민트 청록**(`trigger`). 먼 배경 도형으로 천막 지붕(아치)과 둥근 등불(원)을 암시. 등불은 발광 대신 박동(G13)에 맞춰 배경이 밝아지는 것으로 표현 |
| 소리 (아트 7-2) | D 도리안, 해 질 녘의 들뜬 그루브 = "장이 서기 직전의 흥" |
| 구성 (밸런스 7장) | 도입·복습 → 북 발판(단독 → 높이 3 상자 → "뛰지 말고 믿기") → 숨 고르기 → 매달린 잡음(아래로 걷기 → 상자 위 매달린 잡음) → 숨 고르기 → 현 발판(결정 위 건너기, 북 발판으로 높은 현 발판) → 드롭(조합, 첫 3연속 결정) → 마무리 16박 비움 |
| 이 레벨의 주제 | "뛰지 말아야 할 때"(매달린 잡음 아래)와 "높이 튕겨 위로"(북 발판 → 현 발판) |
| 설정상 끝 장면 | 시장 끝 줄다리를 건너면 폭풍 속 종탑이 바로 앞에 나타남 |

### 레벨 3. 폭풍 종탑 (Storm Belfry)

| 항목 | 내용 |
|---|---|
| 레벨 데이터 | 140 BPM, 160박 = 68.6 s. 보통으로 시작, **템포 문 4번**: 40박 늘임 문(느림) → 56박 제박 문(보통) → 80박 몰아침 문(빠름) → 128박 제박 문(보통) |
| 장소 | 잠든 도시 위로 솟아 세상을 조율하던 거대한 종탑의 외벽과 내부 계단. 비바람, 멈춘 톱니바퀴, 매달린 종들 |
| 이야기 한 줄 | 종탑 꼭대기의 큰 종에 닿으면 노래가 다시 울림. 정적이 가장 짙고, 핑의 박자는 느려졌다 몰아쳤다 함 |
| 분위기 키워드 | 깊은 밤, 폭풍, 상승, 질주, 종소리 |
| 시각 (아트 팔레트 `level3` "깊은 밤 청록") | **깊은 밤 청록빛 폭풍 하늘**(`bg`), 청록 공명 상자(`ground`). 잡음 결정은 **산호 주황 결정**(`hazard`). 울림 고리·북 발판은 **연두**(`trigger`), 템포 문은 **하늘색 캡슐 문**(`gate`)이며 문 안 꺾쇠 1·2·3개로 늘임·제박·몰아침을 구분. 먼 배경 도형으로 큰 종(원)과 아치 창을 암시. 번개나 화면 전체 섬광은 쓰지 않고, 몰아침 문 통과 때 속도선이 그 역할을 함 |
| 소리 (아트 7-2) | E 단조, 밤의 질주감. 늘임 문 마디는 킥만 남고, 몰아침 문부터 햇 16분 + 리드 = "폭풍이 몰아침" |
| 구성 (밸런스 7장) | 도입·복습(상자·북 발판·매달린 잡음) → 울림 고리(단독 안전 → 연속) → 늘임 구간(촘촘해 보이는 박자) → 제박 복귀 → 조합 → 몰아침 드롭(80~127박) → 피날레(보통) → 마무리 16박 비움 |
| 설정상 끝 장면 | 핑이 큰 종을 울림 → 배경이 한 번 크게 밝아지고 종이 조각이 쏟아짐 → "노래가 돌아왔다" 클리어 화면 |

## 5. UI 텍스트 (KR / EN)

### 5-1. 타이틀과 메뉴

| 키 | KR | EN |
|---|---|---|
| title | 잔향 질주 | Reverbound |
| subtitle | 마지막 소절이 끝나기 전에 | Before the last note fades |
| tap_to_start | 탭해서 시작 | Tap to start |
| menu_play | 달리기 | Play |
| menu_levels | 레벨 선택 | Levels |
| menu_settings | 설정 | Settings |
| level_locked | 이전 레벨을 클리어하면 열려요 | Clear the previous level to unlock |
| mode_normal | 일반 모드 | Normal |
| mode_practice | 연습 모드 | Practice |
| best_normal | 최고 {pct}% | Best {pct}% |
| best_practice | 연습 최고 {pct}% | Practice best {pct}% |
| cleared_badge | 클리어 | Cleared |
| level1_name | 새벽 조율장 | Dawn Tuning Yard |
| level2_name | 줄다리 야시장 | Wirebridge Night Market |
| level3_name | 폭풍 종탑 | Storm Belfry |
| level1_tag | 첫 박을 울려라 | Ring the first beat |
| level2_tag | 등불이 꺼지기 전에 | Before the lanterns go dark |
| level3_tag | 종을 다시 울려라 | Ring the bell again |

### 5-2. 플레이 중 HUD

| 키 | KR | EN |
|---|---|---|
| attempt | {n}번째 시도 | Attempt {n} |
| progress | {pct}% | {pct}% |
| new_best | 최고 기록! | New best! |
| practice_checkpoint_placed | 울림 지점 표시 | Checkpoint set |
| practice_checkpoint_removed | 울림 지점 지움 | Checkpoint removed |
| practice_place_btn | 지점 찍기 | Set point |
| practice_remove_btn | 지점 지우기 | Remove point |

### 5-3. 일시정지와 설정

| 키 | KR | EN |
|---|---|---|
| pause_title | 잠깐 숨 고르기 | Taking a breath |
| pause_resume | 계속 | Resume |
| pause_restart | 처음부터 | Restart |
| pause_practice_toggle | 연습 모드 켜기/끄기 | Toggle practice |
| pause_quit | 레벨 선택으로 | Back to levels |
| resume_countdown | 3 · 2 · 1 | 3 · 2 · 1 |
| settings_music | 음악 볼륨 | Music volume |
| settings_sfx | 효과음 볼륨 | SFX volume |
| settings_offset | 박자 보정 | Audio offset |
| settings_offset_help | 박자가 화면보다 늦게 들리면 +, 빠르면 − 로 맞추세요 | If the beat sounds late, slide to +. If early, slide to − |
| settings_offset_unit | {ms} ms | {ms} ms |
| settings_offset_test | 탭해서 맞춰 보기 | Tap along to test |
| settings_shake | 화면 흔들림 | Screen shake |
| settings_trigger_sfx | 발판·고리 효과음 | Pad & ring sounds |
| settings_on | 켜기 | On |
| settings_off | 끄기 | Off |
| settings_reset | 기록 초기화 | Reset progress |
| settings_reset_confirm | 모든 기록이 사라져요. 정말 지울까요? | All progress will be erased. Are you sure? |
| confirm_yes | 지우기 | Erase |
| confirm_no | 취소 | Cancel |

- `settings_shake`는 `30-art.md` 6절 "흔들림 끄기" 토글, `settings_trigger_sfx`는 7-3절 "오브·발판 발동음(기본 끔)" 토글용입니다.

### 5-4. 사망 메시지 (재시작 직전 짧게 표시, 무작위로 돌려 씀)

재시작이 0.7 s(사망 연출 0.4 s 포함)라 문구는 한 줄, 8자 안팎으로 짧게 둡니다. 표시는 선택 사항입니다(화면 흐름을 해치면 빌더가 생략 가능).

| # | KR | EN |
|---|---|---|
| 1 | 다시, 한 소절 | Again, one more bar |
| 2 | 울림은 끝나지 않아 | The echo never ends |
| 3 | 박자를 다시 세자 | Count it in again |
| 4 | 조금 더 멀리 | A little further |
| 5 | 흩어졌다 모인다 | Scatter. Gather. Go |
| 6 | 정적은 잠깐뿐 | Silence won't last |
| 7 | 하나, 둘, 다시 | One, two, again |
| 8 | 아직 노래 중 | Still singing |

### 5-5. 클리어 메시지

| 키 | KR | EN |
|---|---|---|
| clear_title_l1 | 첫 박이 울렸다 | The first beat rings |
| clear_title_l2 | 시장에 불이 켜졌다 | The market lights up |
| clear_title_l3 | 노래가 돌아왔다 | The song is back |
| clear_attempts | {n}번 만에 클리어 | Cleared in {n} attempts |
| clear_next | 다음 레벨 | Next level |
| clear_retry | 다시 달리기 | Run again |
| clear_levels | 레벨 선택 | Levels |
| clear_all | 세 소절을 모두 울렸어요. 다음 노래를 기다려 주세요 | All three bars are ringing. More songs coming soon |

클리어 화면 부제 (무작위로 돌려 씀):

| # | KR | EN |
|---|---|---|
| 1 | 색이 돌아왔어요 | Color returns |
| 2 | 박자가 이어졌어요 | The beat goes on |
| 3 | 정적이 한 걸음 물러났어요 | The Hush steps back |
| 4 | 끝까지 울렸어요 | Rang true to the end |

### 5-6. 튜토리얼 문구

표시 시점은 현재 레벨 데이터(`levels/*.json` `sections`, `20-balance.md` 7장)의 박 위치 기준입니다. 레벨 구성이 바뀌면 박 위치만 따라 고칩니다.

레벨 1 (120 BPM, 1박 = 0.5 s):

| 키 | 표시 시점 | KR | EN |
|---|---|---|---|
| tut_tap | 0박 (도입, 시작 직후) | 탭하면 뛰어요 | Tap to jump |
| tut_shard | 4박 (8박 첫 결정 앞) | 잡음 결정은 피하세요 | Avoid the Static Shards |
| tut_beat | 18박 (22박 첫 2연속 앞) | 박자에 맞춰 뛰어 봐요 | Jump on the beat |
| tut_low | 22박 (24박 `learn_low` 앞) | 잔잡음은 조금 늦게 뛰어도 넘어요 | Low Hiss is short. You can jump late |
| tut_crate | 37박 (40박 `learn_block` 앞, 숨 고르기 중) | 상자 위로 올라타요. 정면으로 박으면 깨져요 | Hop onto crates. Don't hit them head-on |
| tut_hold | 60박 (64박 드롭 1박 연속 앞, 숨 고르기 중) | 누르고 있으면 착지할 때마다 다시 뛰어요 | Hold to keep jumping |
| tut_restart | 첫 사망 후 1회 | 깨져도 바로 다시 시작해요 | Shatter? You're back in a beat |

다른 레벨의 새 기믹 첫 등장 문구:

| 키 | 레벨 | 표시 시점 | KR | EN |
|---|---|---|---|---|
| tut_drum | 2 | 22박 (24박 `learn_pad` 앞) | 북 발판은 높이 튕겨 줘요 | Drum Pads bounce you high |
| tut_hanging | 2 | 41박 (44박 `learn_ceiling` 앞, 숨 고르기 중) | 위에도 잡음이 있어요. 그땐 뛰지 마세요 | Watch above. Sometimes, don't jump |
| tut_string | 2 | 61박 (64박 `learn_platform` 앞, 숨 고르기 중) | 현 발판은 위에서만 밟을 수 있어요 | String Ledges hold you from above |
| tut_ring | 3 | 22박 (24박 `learn_orb` 앞) | 공중의 울림 고리에 닿으면 탭! | Tap inside an Echo Ring to jump again |
| tut_tempo | 3 | 37박 (40박 첫 템포 문 앞) | 템포 문을 지나면 빠르기가 바뀌어요 | Tempo Gates change your speed |

- `tut_bell`(뒤집힌 종)은 G7과 함께 **2차**로 옮겼습니다. 2차 때 쓸 문구: "뒤집힌 종을 지나면 위아래가 바뀌어요 / Upturned Bells flip your world".

### 5-7. 시스템 메시지

| 키 | KR | EN |
|---|---|---|
| loading | 조율 중… | Tuning… |
| audio_unlock | 화면을 탭하면 소리가 켜져요 | Tap to turn on sound |
| rotate_hint | 가로로 돌리면 더 넓게 보여요 | Turn sideways for a wider view |
| paused_background | 잠깐 멈췄어요. 탭하면 이어서 달려요 | Paused. Tap to keep running |
| load_error | 노래를 불러오지 못했어요. 다시 시도해 주세요 | Couldn't load the song. Please try again |

- `rotate_hint`는 웹 세로 모드 첫 진입 때 1회만 띄우는 권유 문구입니다(`30-art.md` 5절). Android는 가로 고정이라 쓰지 않습니다. 이전 초안의 `rotate_device`(강제 회전 문구)는 지웠습니다.

## 6. 스토어 등록 문구 초안

### 짧은 설명 (80자 이내)

- KR: 탭 하나로 박자에 맞춰 뛰어라. 정적이 삼키기 전에 마지막 노래를 이어 가는 리듬 러너. (47자)
- EN: One tap. One beat. Outrun the silence in a rhythm runner. (58 characters)

### 긴 설명

**KR**

세상을 움직이던 노래가 멈췄습니다. 소리가 사라진 자리에 정적이 번지고, 남은 건 마지막 한 소절의 잔향, 작은 울림돌 핑뿐입니다.

핑은 멈출 수 없습니다. 멈추는 순간 노래도 끝나니까요. 화면을 탭해 박자에 맞춰 뛰고, 잡음 결정을 피해 종탑까지 달려 노래를 다시 울리세요.

- 버튼은 하나. 탭하면 뛰고, 누르고 있으면 계속 뜁니다.
- 음악이 곧 길입니다. 모든 장애물이 박자 위에 놓여 있어요.
- 깨져도 1초 안에 다시 시작. 메뉴도, 기다림도 없습니다.
- 진행도 %와 시도 횟수로 매번 조금씩 더 멀리.
- 연습 모드로 어려운 구간만 반복해서 익히세요.
- 박자 보정 기능으로 기기마다 다른 소리 지연을 맞출 수 있어요.
- 레벨 3개: 새벽 조율장, 줄다리 야시장, 폭풍 종탑.
- 재시작 사이에 광고가 끼어들지 않습니다.

한 번만 더, 한 소절만 더.

**EN**

The song that kept the world moving has stopped. Silence is spreading, and all that remains is the last echo of the final bar: a small ringing stone named Ping.

Ping can't stop. If it does, the song ends for good. Tap to jump on the beat, dodge the Static Shards, and run all the way to the belfry to ring the song back to life.

- One button. Tap to jump, hold to keep jumping.
- The music is the map. Every obstacle sits on the beat.
- Shatter and you're back in under a second. No menus, no waiting.
- Track your progress % and attempt count as you push further each run.
- Practice mode lets you drill the hardest sections.
- Audio offset calibration keeps the beat in sync on any device.
- Three levels: Dawn Tuning Yard, Wirebridge Night Market, Storm Belfry.
- No ads between retries.

One more run. One more bar.

### 스토어 스크린샷 문구 (`30-art.md` 8-2의 5장 순서, 위쪽 20% 문구 띠)

| # | 장면 (아트 기준) | KR | EN |
|---|---|---|---|
| 1 | 새벽 조율장, 첫 상자 위로 점프 | 탭 하나로 박자를 넘는다 | One tap. One beat. |
| 2 | 줄다리 야시장, 북 발판으로 튀어 오름 + 매달린 잡음 | 튕겨 오르고, 때로는 참아라 | Bounce high. Or hold back. |
| 3 | 폭풍 종탑, 몰아침 문 통과 직후 | 폭풍 속에서 템포가 몰아친다 | The tempo storms ahead |
| 4 | 사망 조각 + 진행도 "최고 87%" | 깨져도 1초 만에 다시 | Shatter. Back in a second. |
| 5 | 레벨 선택 (세 팔레트) | 세 소절, 세 개의 노래 | Three bars. Three songs. |

---

## 교차 리뷰 처리 결과 (1-2)

상세 표는 `reviews/cross/lore-writer.md`. 다른 역할에 넘기는 것:

- 밸런스 기획자: `levels/*.json`의 `name`을 맨 위 확정값 표대로 채우기. `theme_id`는 현재 값 유지.
- 아티스트: `30-art.md` 머리말의 "`10-lore.md` 미반영" 문구 갱신, 팔레트 열 제목에 레벨 이름 병기(선택). level3 음악 키워드 "밤 도시의 질주감"은 "폭풍 종탑의 질주감"으로 맞추면 좋음(선택, 사운드는 아트 소유). G7 에셋은 2차.
- 빌더: 5절 키를 문자열 테이블 키로 그대로 사용. 새 키 `tut_low`, `settings_shake`, `settings_trigger_sfx`, `settings_on/off`, `rotate_hint`, 삭제 키 `rotate_device`, 2차 키 `tut_bell`. `{n}`, `{pct}`, `{ms}`는 치환 자리.
