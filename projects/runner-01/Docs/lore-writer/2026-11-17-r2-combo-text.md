# round-2 콤보 대체 글과 문구 정리 (연습 깃발 키 삭제, level_locked)

- 날짜: 2026-11-17
- 역할: lore-writer
- 프로젝트: runner-01 (Reverbound, 잔향 질주)
- 단계: round-2 (콤보 차수)

## 요청 받은 일
오케스트레이터 요청. 요청자 지시(2026-11-17, 전 프로젝트) "디제이맥스의 노트 터치 검사를 벤치마크해서 콤보시스템을 만드세요"에 따라 콤보 대체 글(화면 낭독) 키 `combo_aria`·`combo_best_aria`·(선택) `combo_mark_aria`를 KR/EN으로 정하고, 앞서 남은 정리(안 쓰는 `practice_*` 문구, `level_locked` 쓰임 확인)를 함. 게임 코드는 읽기만 함.

## 한 일
1. 10-lore 5-8절 "대체 글 (화면 낭독, 콤보)"을 새로 만듦. 키 3개와 붙는 곳·읽는 때·KR·EN.
   - `combo_aria`: 이어서 잘 뛴 수 / Good jumps in a row (HUD 점 줄 이름)
   - `combo_best_aria`: 이어서 잘 뛴 최고 기록 / Most jumps in a row (레벨 카드 최고 콤보 표지 이름)
   - `combo_mark_aria`(선택): 이어서 잘 뛰어요! / Great jumps, keep going! (10·20 단계에 `aria-live` polite 한 번)
   - "콤보"는 5~6세에게 낯선 말이라 "이어서 잘 뛴"으로 풀었고, 원작 판정 이름·용어는 쓰지 않음.
   - 숫자는 이름에 넣지 않고 값 속성(`role="meter"`, `aria-valuenow`, 퍼센트로 읽히지 않게 `aria-valuetext` = 숫자만)으로만 주게 함. 점·표지 개수를 따로 읽지 않고 콤보 수 하나만, 등급은 판정마다 읽지 않음, 끊김(사망) 때는 아무것도 읽지 않음.
2. 연습 깃발 키 4개 삭제: `practice_checkpoint_placed`·`practice_checkpoint_removed`·`practice_place_btn`·`practice_remove_btn`. `games/reverbound/js/` 전체에서 사용 0곳(grep), `DEV_NOTES.md` "버튼" 줄도 "화면에 쓰지 않음". 예전 문구는 되살릴 때를 위해 5-2절 아래 메모로 남김(표 밖이라 `sync-data`가 읽지 않음). 남은 `placeCheckpoint`·`removeCheckpoint`는 QA 훅이라 문구와 무관.
3. `level_locked` 확인: **토스트로만 나오지 않음**. `main.js` 350행 잠긴 카드 버튼 `aria-label` "번호. 이름 (`level_locked`)"과 353행 자물쇠 그림 + `<small>` 토스트(1.2 s) 두 곳. 두 곳 모두에 맞는 상태 문장으로 두고, 영어를 "Beat the last level first" → "Finish the level before it"로 바꿈("last level"이 레벨 10으로도 읽힘). 한국어는 12자 그대로.
4. 스토어 긴 설명의 "연습 모드에서 깃발을 꽂고"(수동 깃발)를 자동 체크포인트에 맞게 고치고, 콤보 점 한 줄을 KR/EN에 추가.
5. 10-lore 끝에 "콤보 대체 글·문구 정리 처리 결과" 인계 절 추가.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/runner-01/10-lore.md` | 5-1 `level_locked` EN·메모, 5-2 practice 키 4개 삭제·메모, 5-8 대체 글 절 신설, 6절 스토어 문구, 인계 절 |
| `projects/runner-01/Docs/lore-writer/2026-11-17-r2-combo-text.md` | 이 보고서 |
| `projects/runner-01/Docs/README.md` | 목록 맨 위 한 줄 |

## dev가 반영할 키 목록 (`sync-data` 후 `strings.json`)
| 변경 | 키 |
|---|---|
| 추가 | `combo_aria`, `combo_best_aria`, `combo_mark_aria`(선택 사용) |
| 삭제 | `practice_checkpoint_placed`, `practice_checkpoint_removed`, `practice_place_btn`, `practice_remove_btn` |
| 문구 변경 | `level_locked` (EN만) |

- 키 수 90 → 89. 구현 방식은 10-lore 5-8절(이름은 키, 값은 속성, 콤보 0~1이면 숨김, `aria-live`는 단계 알림에만).

## 검증 결과
- `sync-data.mjs`의 5절 파싱 규칙을 스크래치 스크립트로 똑같이 돌려 봄(게임 파일은 쓰지 않음): 키 89개, 사망 문구 4, 클리어 부제 4. 새 키 3개 KR/EN이 바르게 읽히고 `practice_*` 0개. 필수 키(`need`) 그대로 있음.
- 글자 수(공백·문장부호 포함): `combo_aria` 9자/5단어, `combo_mark_aria` 10자/4단어(플레이 중 한도 12자·6단어 안), `combo_best_aria` 13자/5단어(레벨 선택 화면 전용, 플레이 중 한도 대상 아님), `level_locked` 12자/5단어.
- 접근성 트리 확인(ariaSnapshot)은 빌드에 콤보가 아직 없어 못 함 → qa 몫.

## 규칙 준수 확인
- [x] 원본 보호 (원작 판정 이름·콤보 용어·문구 없음, "콤보"도 화면 문구에 안 씀)
- [x] 게임 선정·설계 원칙 (5~6세 쉬운 말, 화면 글 추가 없음)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정(10-lore.md, 보고서, README 한 줄), 게임 코드 수정·git 작업·서버 실행 없음

## 문제·남은 일
- major(예상), game-developer: 레벨 카드는 `<button>`에 `aria-label`을 직접 붙여, 버튼 안에 최고 콤보 표지를 넣으면 낭독기에 읽히지 않음. 버튼 밖 형제 요소로 두거나 `aria-labelledby`/`aria-describedby`로 연결 필요(10-lore 5-8).
- minor, game-developer: `index.html`의 `aria-label`("pause", "hub", "back", "close", "game")이 영어 고정이고 10-lore 키가 없음. 이번 범위 밖이라 키는 만들지 않음. 필요하면 다음 차수에 lore가 키를 정함.
- minor, qa-engineer: 콤보 구현 뒤 접근성 트리에서 이름·값·숨김 확인.

## 다른 팀에 줄 인사이트
- 낭독기는 `role="meter"`·`progressbar` 값을 퍼센트로 읽기도 하므로, 숫자만 쓴 `aria-valuetext`를 함께 둔다. 또 `<button>`에 `aria-label`을 붙이면 버튼 안 자식(기록 표지 등)의 대체 글은 읽히지 않으니, 카드 안 보조 정보는 버튼 밖에 두거나 `aria-describedby`로 잇는다. 적용: lore-writer·game-developer(rhythm-01·rhythm-02 콤보 대체 글도 같음).
