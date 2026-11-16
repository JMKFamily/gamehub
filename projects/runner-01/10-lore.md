# 10. 세계관: Reverbound (잔향 질주)

- 입력: `00-benchmark.md` (MVP: 레벨 3개, 약 120 / 128 / 140 BPM, 지면 점프 모드 1개)
- 원본 보호: 레퍼런스 게임의 이름, 캐릭터, 설정, 레벨명, 기믹 이름, UI 문구를 쓰지 않았습니다. 아래 이름과 문구는 모두 새로 만든 것입니다.
- 교차 리뷰 메모: 밸런스 기획자와 아티스트는 이 문서를 보지 않고 동시에 작업 중입니다. 그래서 4절의 레벨마다 **기믹 코드(00-benchmark.md 5절의 G 코드)**, **BPM**, **색·형태 힌트**를 구체적으로 적었습니다. 교차 리뷰 때 이 표를 기준으로 맞추면 됩니다. 수치와 배치는 밸런스 기획자, 실제 모양과 팔레트는 아티스트가 최종 결정하고, 저는 이름과 분위기를 그에 맞춰 고칩니다.

---

## 1. 게임 이름

| 후보 | 한국어 표기 | 뜻 | 검색 충돌 메모 |
|---|---|---|---|
| **Reverbound** (추천) | 잔향 질주 | reverb(잔향) + bound(튀어 오르다, ~로 향하다). "울림이 튀어 오르며 달린다" | 조어라 기존 앱 이름과 겹칠 가능성이 낮음. "Dash", "Run", "Geometry" 같은 흔한 단어를 피함 |
| Hushline | 정적선 | 정적이 밀려오는 경계선 | 단어 자체가 드물지만 메신저·보안 서비스 이름과 겹칠 여지 있음 |
| Kickstep | 킥스텝 | 킥 드럼 한 박 = 한 걸음 | 음악 장비·댄스 앱과 겹칠 가능성 있음 |

- **추천: Reverbound (잔향 질주)**
- **영문 slug 후보: `reverbound`**
- 스토어 표기: `Reverbound: 잔향 질주` (한국어 스토어), `Reverbound` (영어 스토어)

## 2. 세계관과 톤

세상은 원래 하나의 노래로 움직였습니다. 가로등은 박자에 맞춰 깜빡이고, 다리는 화음으로 버티고, 종탑은 정오마다 세상을 다시 조율했습니다. 어느 날 노래가 멈추고, 소리가 사라진 자리에서 **정적(the Hush)**이 번지기 시작했습니다. 정적이 닿은 곳은 색이 빠지고, 움직임이 굳고, 날카로운 **잡음 결정**만 남습니다. 남은 것은 마지막 한 소절의 잔향뿐. 그 잔향이 땅을 박차고 뛸 때마다 발밑의 세상에 잠깐 색과 빛이 돌아옵니다.

**톤 키워드**: 절박하지만 밝다 / 비트에 맞춰 숨 쉬는 세계 / 설명보다 리듬 / 실패는 슬픔이 아니라 "다시 한 소절".
글은 짧게, 명령형과 의성어를 섞어 박자감 있게 씁니다. 사망 문구도 놀리지 않고 등을 떠미는 말투로 씁니다.

## 3. 주인공

| 항목 | 내용 |
|---|---|
| 이름 | **핑 (Ping)** |
| 정체 | 멈춘 노래의 마지막 잔향이 굳어 생긴 작은 **울림돌**. 몸 안에서 박자가 계속 울림 |
| 왜 멈추지 않는가 | 핑이 멈추면 마지막 소절도 끝나고, 등 뒤의 정적이 세상을 완전히 덮습니다. 달리는 동안만 소리가 이어지고, 박자를 이어 가야 종탑에 닿아 노래를 다시 울릴 수 있습니다 |
| 사망의 의미 | 잡음 결정에 부딪히면 핑은 소리 조각으로 흩어졌다가, 마지막으로 크게 울린 자리(레벨 시작점 또는 연습 모드 체크포인트)에서 다시 모입니다. 그래서 재시작이 즉시입니다 |
| 점프 | 핑이 땅을 차면 "핑" 하고 한 박이 울림. 별도 점프음은 넣지 않고 음악이 그 역할을 한다는 벤치마크 원칙과 맞춤 (설정상 표현일 뿐) |
| 아티스트 힌트 | 1×1 타일 몸체. 레퍼런스의 "얼굴 있는 정사각형"과 겹치지 않게 **얼굴 없이** 속이 비치는 돌·크리스털 느낌, 중심에서 박자마다 맥동하는 빛 코어. 착지할 때 발밑에서 짧은 동심원 파문. 사망 시 원형 파문 조각으로 흩어지는 연출 |

## 4. 레벨 테마 (MVP 3개)

공통 용어 (기믹 이름은 UI·튜토리얼·스토어 문구에서 이 이름으로 씁니다):

| 코드 | 이름 (KR / EN) | 설정 |
|---|---|---|
| G1 고체 블록 | 공명 상자 / Echo Crate | 아직 소리가 남은 상자. 올라탈 수 있지만 정면으로 박으면 핑이 깨짐 |
| G2 바닥 즉사 | 잡음 결정 / Static Shard | 정적이 굳어 생긴 날카로운 결정 |
| G3 낮은 바닥 즉사 | 잔잡음 / Low Hiss | 바닥에 깔린 낮은 결정 |
| G4 천장 즉사 | 매달린 잡음 / Hanging Hiss | 위에서 자라 내려온 결정 |
| G5 발판 자동 점프 | 북 발판 / Drum Pad | 밟으면 "둥" 하고 높이 튕겨 냄 |
| G6 공중 재점프 | 울림 고리 / Echo Ring | 공중에 뜬 고리. 지나가며 탭하면 한 번 더 뜀 |
| G8 속도 변경 | 템포 문 / Tempo Gate | 느림 = 늘임 문(Lento), 보통 = 제박 문(Tempo), 빠름 = 몰아침 문(Presto) |
| G12 얇은 발판 | 현 발판 / String Ledge | 팽팽하게 당긴 줄. 위에서만 밟을 수 있음 |
| G7 중력 반전 (선택) | 뒤집힌 종 / Upturned Bell | 3번 레벨 마지막 구간에 쓸 경우를 대비한 이름 |
| G13 연출 | 박동 / Pulse | 킥·드롭에 맞춰 배경에 색이 돌아오는 연출 |

### 레벨 1. 새벽 조율장 (Dawn Tuning Yard)

| 항목 | 내용 |
|---|---|
| BPM / 속도 | 약 120 BPM / 보통 |
| 장소 | 정적에 가장 먼저 잠긴 외곽의 악기 조율 공방 마당. 녹슨 소리굽쇠 기둥과 쌓인 공명 상자 |
| 이야기 한 줄 | 핑이 처음 깨어나 달리는 법을 배우는 곳 |
| 분위기 키워드 | 새벽, 고요, 첫 박, 서늘함 → 따뜻함 |
| 시각 힌트 (아티스트) | 바탕은 회청색·잿빛(정적에 색이 빠진 상태). 핑이 지나간 자리와 드롭 구간에서만 **새벽 주황·연한 금색**이 번짐. 배경 실루엣: 크기가 다른 소리굽쇠 기둥, 멀리 작은 종탑. 공명 상자는 나뭇결 + 울림 구멍. 잡음 결정은 **차가운 청백색**으로 배경과 분명히 구분 (가독성 우선) |
| 기믹 힌트 (밸런스) | G1 공명 상자, G2 잡음 결정 1~3개, G3 잔잡음. 첫 10초는 실패할 수 없을 만큼 쉬운 튜토리얼 구간 (상자 계단 오르기 → 결정 1개 → 2개). 기믹 도입 3단계(안전한 첫 등장 → 단독 → 조합). 숨 고르기 구간에서는 박동 연출만 |
| 설정상 끝 장면 | 공방 마당 문을 박차고 나가면 멀리 불빛 도는 시장이 보임 |

### 레벨 2. 줄다리 야시장 (Wirebridge Night Market)

| 항목 | 내용 |
|---|---|
| BPM / 속도 | 약 128 BPM / 보통 |
| 장소 | 협곡 위로 케이블과 현을 엮어 만든 공중 야시장. 노점 천막, 줄에 매달린 등불, 큰 북 |
| 이야기 한 줄 | 시장 사람들은 굳었지만 등불은 아직 박자에 맞춰 깜빡임. 핑이 지나가면 노점이 하나씩 다시 켜짐 |
| 분위기 키워드 | 밤, 축제의 잔해, 흔들림, 네온 |
| 시각 힌트 (아티스트) | 바탕은 짙은 남색·보라 밤하늘. 등불과 천막은 **자홍·청록 네온**, 박자마다 깜빡임. 현 발판은 빛나는 가는 줄(블록보다 확실히 얇게), 북 발판은 위가 둥근 북 가죽. 매달린 잡음은 등불 줄 사이에 고드름처럼 매달린 결정 (위쪽 위험 요소가 한눈에 보이게 실루엣 대비를 강하게) |
| 기믹 힌트 (밸런스) | 1번 기믹 + G4 매달린 잡음, G5 북 발판, G12 현 발판. "뛰지 말아야 할 때"(G4 아래 통과)와 "높이 튕겨 위 경로로"(G5 → G12)가 이 레벨의 주제. 위·아래 경로가 갈리는 구간에 어울림 (수집품은 2차라 MVP는 경로 연출만) |
| 설정상 끝 장면 | 시장 끝 줄다리를 건너면 먹구름 속 종탑이 바로 앞에 나타남 |

### 레벨 3. 폭풍 종탑 (Storm Belfry)

| 항목 | 내용 |
|---|---|
| BPM / 속도 | 약 140 BPM / 보통으로 시작해 후반 빠름 (템포 문으로 느림·보통·빠름 전환) |
| 장소 | 세상을 조율하던 거대한 종탑의 외벽과 내부 계단. 비바람, 멈춘 톱니바퀴, 매달린 종들 |
| 이야기 한 줄 | 종탑 꼭대기의 큰 종에 닿으면 노래가 다시 울림. 정적이 가장 짙고, 그만큼 핑의 박자도 가장 빨라짐 |
| 분위기 키워드 | 폭풍, 상승, 절정, 드롭, 종소리 |
| 시각 힌트 (아티스트) | 바탕은 먹색·짙은 청회색 폭풍. 번개가 드롭 박자에 맞춰 화면을 하얗게 쳐 줌(연출 전용, 판정 없음). 울림 고리는 금빛 링, 공중에 떠서 천천히 맥동. 템포 문은 세로로 선 문/아치로, 느림 = 푸른색, 보통 = 금색, 빠름 = 붉은색처럼 **색으로 속도를 구분**. 클리어 순간 큰 종이 울리며 회색 세계 전체에 색이 돌아오는 장면 |
| 기믹 힌트 (밸런스) | 1·2번 기믹 + G6 울림 고리, G8 템포 문. 드롭 구간에서 몰아침 문(빠름) 진입, 직후 2~4박 숨 고르기. G7 뒤집힌 종은 넣을지 밸런스 기획자 결정. 넣으면 마지막 구간 1회만, 이름과 튜토리얼 문구는 아래 5절에 준비됨 |
| 설정상 끝 장면 | 핑이 큰 종을 울림 → "노래가 돌아왔다" 클리어 화면 |

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
| settings_reset | 기록 초기화 | Reset progress |
| settings_reset_confirm | 모든 기록이 사라져요. 정말 지울까요? | All progress will be erased. Are you sure? |
| confirm_yes | 지우기 | Erase |
| confirm_no | 취소 | Cancel |

### 5-4. 사망 메시지 (재시작 직전 짧게 표시, 무작위로 돌려 씀)

재시작이 0.8 s 이내라 문구는 한 줄, 8자 안팎으로 짧게 둡니다. 표시는 선택 사항입니다(화면 흐름을 해치면 빌더가 생략 가능).

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

### 5-6. 튜토리얼 문구 (레벨 1 첫 구간, 화면 위에 짧게)

| 키 | 표시 시점 (밸런스·빌더 참고) | KR | EN |
|---|---|---|---|
| tut_tap | 시작 직후 | 탭하면 뛰어요 | Tap to jump |
| tut_crate | 첫 공명 상자 앞 | 상자 위로 올라타요. 정면으로 박으면 깨져요 | Hop onto crates. Don't hit them head-on |
| tut_shard | 첫 잡음 결정 앞 | 잡음 결정은 피하세요 | Avoid the Static Shards |
| tut_beat | 결정 연속 구간 앞 | 박자에 맞춰 뛰어 봐요 | Jump on the beat |
| tut_hold | 연속 점프 구간 앞 | 누르고 있으면 착지할 때마다 다시 뛰어요 | Hold to keep jumping |
| tut_restart | 첫 사망 후 1회 | 깨져도 바로 다시 시작해요 | Shatter? You're back in a beat |

다른 레벨의 새 기믹 첫 등장 문구:

| 키 | 레벨 | KR | EN |
|---|---|---|---|
| tut_hanging | 2 | 위에도 잡음이 있어요. 그땐 뛰지 마세요 | Watch above. Sometimes, don't jump |
| tut_drum | 2 | 북 발판은 높이 튕겨 줘요 | Drum Pads bounce you high |
| tut_string | 2 | 현 발판은 위에서만 밟을 수 있어요 | String Ledges hold you from above |
| tut_ring | 3 | 공중의 울림 고리에 닿으면 탭! | Tap inside an Echo Ring to jump again |
| tut_tempo | 3 | 템포 문을 지나면 빨라져요 | Tempo Gates change your speed |
| tut_bell | 3 (G7 사용 시) | 뒤집힌 종을 지나면 위아래가 바뀌어요 | Upturned Bells flip your world |

### 5-7. 시스템 메시지

| 키 | KR | EN |
|---|---|---|
| loading | 조율 중… | Tuning… |
| audio_unlock | 화면을 탭하면 소리가 켜져요 | Tap to turn on sound |
| rotate_device | 가로로 돌려 주세요 | Please rotate to landscape |
| paused_background | 잠깐 멈췄어요. 탭하면 이어서 달려요 | Paused. Tap to keep running |
| load_error | 노래를 불러오지 못했어요. 다시 시도해 주세요 | Couldn't load the song. Please try again |

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

---

## 교차 리뷰 때 확인할 것 (다른 역할에게)

- 밸런스 기획자: 레벨별 기믹 배분(1: G1·G2·G3 / 2: +G4·G5·G12 / 3: +G6·G8, G7 선택)과 BPM이 이 문서와 같은지. 튜토리얼 문구 표시 시점에 맞는 구간이 있는지. G7을 빼면 `tut_bell`과 뒤집힌 종 항목을 지웁니다.
- 아티스트: 주인공 "얼굴 없는 울림돌 + 맥동 코어", 레벨별 기본 팔레트(1 회청+새벽 주황 / 2 남색+자홍·청록 네온 / 3 먹색 폭풍+번개 백색·금색), 템포 문 색 구분(푸름·금·붉음), 잡음 결정은 레벨 배경과 대비되는 색인지. 아트 문서와 다르면 제 쪽 시각 힌트를 고칩니다.
- 빌더: 5절의 키 이름을 문자열 테이블 키로 그대로 써도 됩니다. `{n}`, `{pct}`, `{ms}`는 치환 자리입니다.
