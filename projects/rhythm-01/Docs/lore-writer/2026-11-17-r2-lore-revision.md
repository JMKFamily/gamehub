# round-2 세계관·텍스트 기획 수정 (R1 북채 퇴장 문장, R8 텍스트·aria 사용 규칙)

- 날짜: 2026-11-17
- 역할: lore-writer
- 프로젝트: rhythm-01
- 단계: 1-7 → round-2 기획 수정

## 요청 받은 일
오케스트레이터가 round-1 게이트 미통과(세계관·텍스트 7.0)에 따라 요청: ① R1에 맞게 10-lore 4절 북채·손가락 문장 수정(숫자 없이 balance 참조), ② R8에 필요한 텍스트 사용 규칙을 7절에 명확히(새 키는 꼭 필요할 때만, 기존 키 삭제·문구 변경 금지), ③ 기록 지우기 확인 창 아이콘 변경과 버튼 aria가 맞는지 확인. 요청자 최신 지시: 5~6세 단순 규칙, 보이는 모양 이름, 원본 보호, 스토어 문구 선작업 금지, git 금지, 수정 범위는 10-lore·본인 보고서·README 한 줄.

## 한 일
1. **R1 (리뷰 이슈 1, lore 문서 모순 해소)**: 4절 둥둥이·차례 신호 문장을 "북채는 그 보여 주기(두 마디 무늬는 묶음)의 마지막 타격 직후, 마디가 끝나기 전에 작아지며 사라짐, 점선 궤도·점선 북도 함께. 아이가 쳐야 하는 별이 다가오기 전에 북채는 이미 없음"으로, 손가락 문장을 "북채가 다 걷힌 뒤에만 첫 꽉 찬 별 앞에 나타남. 북채와 손가락은 한 화면에 같이 보이지 않음(카드 ①→③ 순서)"으로 고침. 같은 뜻으로 4절 북채 줄, 확정값 차례 신호 줄, 7-1 `tut_tap` 그림 힌트 칸, 9절 Q5 결과 칸을 맞춤. 숫자 없음, balance 6-4(`teacher`)·10-6(`cues`) 참조. "보여 주기 마디 시작 1박 전" 표현도 "바로 앞"으로 숫자를 뺌.
2. **R8 (리뷰 이슈 5~8)**: 7-10 "빌드에서 키를 쓰는 규칙" 신설(키 0개, 사용 규칙 표 11줄).
   - 시도 점 `aria_attempts`·진행도 `aria_progress`·보정 점 `calib_progress`: 값은 `aria-valuenow`만, 글에 숫자 잇지 않음, `aria-valuetext` 안 만듦.
   - 결과 등급 줄: `grade_1~3` / `practice_clear`, 줄 전체를 `role="img"` 하나로.
   - 설정 버튼: 이름 `btn_settings`, 설명(`aria-describedby`) `guardian_hold`.
   - `aria_checkpoint`: 연습 플레이 진행도 막대 위 깃발 표시(알림 없음).
   - 불러오기: 도는 공 그림 = `loading`, 실패 ↻ 버튼 = 이름 `btn_retry` + 설명 `load_error`. 빌드 스크립트가 세 키 ko/en을 `index.html`에 넣음(코드에 문구 직접 쓰지 않음).
   - 레벨 10 결과: → 그림에 레벨 고르기 동작·`btn_levels`를 붙이지 않음. 권장 버튼 2개(다시·레벨 고르기, 키 `btn_retry`·`btn_levels`). 6-3에 "버튼 3개는 다음 레벨이 있을 때" 보강.
   - 플레이 중 새 `aria-live` 금지(기존 `aria_new_best`·`calib_kept`만).
3. **확인 창 (이슈 4, R6)**: 취소 = 왼쪽 화살표·기본 강조 → 이름 `confirm_no`("취소/Cancel", `btn_back` 아님), 지우기 = 네모 안 ×(`icon-reset`, 설정 줄 `settings_reset`과 같은 그림)·테두리만 → `confirm_yes`("지우기/Erase"). 뜻이 맞음. 창 이름 `confirm_reset`, 첫 초점 취소. 문구 변경 없음.
4. 10-lore 끝에 "round-2 수정 기록" 절 추가.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-01/10-lore.md` | 확정값 차례 신호 줄, 4절(표 북채 줄·차례 신호 2문장), 6-3 결과 버튼 보강, 7-1 `tut_tap` 힌트, 7-10 신설, 합계 줄 메모, Q5, round-2 수정 기록 |
| `projects/rhythm-01/Docs/lore-writer/2026-11-17-r2-lore-revision.md` | 이 보고서 |
| `projects/rhythm-01/Docs/README.md` | 표 맨 위 한 줄 |

## 검증 결과
- `build-web-data.mjs`와 같은 파싱 규칙(7절 표 → 키)으로 스크래치 스크립트(읽기 전용) 실행, 현재 `games/rhythm-01/data/strings.json`과 대조: **키 64개, ko/en 불일치 0, 빠진 키 0** → 7-10 표가 키로 잘못 읽히지 않고, 빌드 스크립트의 64개 검사도 통과할 상태.
- 7-10 표 첫 칸은 키 형식이 아니고 칸 안에 `|` 없음(파서 오인 방지).
- `data/strings.json` 재생성은 하지 않음(문구 변경 0이라 불필요, 빌드는 game-developer 담당).

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 이름·캐릭터·아트·음악·레벨 배치 없음)
- [x] 게임 선정·설계 원칙 (5~6세 단순 규칙, 약한 아트 컨셉) — 차례 신호 하나 유지, 화면 글 늘리지 않음, 보이는 모양 이름만
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정, git 명령 사용 안 함. 스토어 문구 손대지 않음

## 문제·남은 일
- (minor, game-developer) 7-10 R8-1~R8-7 구현: `#attAria` 숫자 이어 붙이기 제거, 결과 등급 aria, `#bGate` 이름 `btn_settings` + describedby `guardian_hold`, 체크포인트 깃발 aria, `index.html`에 `loading`·`load_error`·`btn_retry` ko/en 주입(`build-web-data.mjs`), ↻ 버튼 `data-a` 변경, L10 결과 버튼, 확인 창 아이콘 버튼 이름·첫 초점.
- (minor, art-director) L10 결과 버튼 배치(2개 권장) 확정. 북채 작아지는 모습.
- (확인, balance-designer) 4절 문장은 R1 키(`mallet_hide_at: last_show_star` 등)를 숫자 없이 옮김. 현재 `balance.json`은 아직 `show_bar_end`(동시 작업 중으로 보임)라 balance 반영 뒤 뜻이 같은지 1-5에서 다시 봄.
