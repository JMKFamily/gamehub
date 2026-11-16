# round-2 문구·시각 힌트 정리

- 날짜: 2026-11-17
- 역할: lore-writer
- 프로젝트: runner-01
- 단계: round-2 (1-7 게이트 실패 후 수정)

## 요청 받은 일
오케스트레이터가 round-1 lore 리뷰 이슈 1·4·5·6과 round-2 결정(`Docs/orchestrator/2026-11-17-1-7-round1-gate-and-round2-decisions.md`)을 `10-lore.md`에 반영하도록 요청했습니다. 요청자 지시는 5~6세용 단순 규칙, 글 없이 진행, 짧고 쉬운 문구, 약한 아트 컨셉, 가중 8.0 이상까지 루프입니다.

## 한 일
1. 5절 UI 문구를 한국어·영어 모두 짧고 쉬운 말로 다시 썼습니다. 플레이 중 문구(5-2, 5-4, 5-6)는 모두 12자 이내(공백 포함), 영어 6단어 이내입니다. 세계관 용어 대신 화면 이름(가시, 상자, 발판, 깃발)을 씁니다.
2. 연습 토글 `pause_practice_toggle`을 "연습 모드 / Practice" 하나로 줄였습니다. `settings_on/off`는 상태를 나타내는 "켜짐/꺼짐"으로 바꿨습니다(이슈 6).
3. 5-6절 튜토리얼을 "레벨당 새 기믹 1개, 카드 1장"으로 다시 짰습니다. 키 목록만 확정하고 박 위치는 "레벨 데이터 `cues`를 따름"으로 적었습니다. 카드마다 그림 힌트 열을 넣었습니다.
   - 레벨 1: `tut_tap`, `tut_shard` / 레벨 2: `tut_crate` / 레벨 3: `tut_drum` / 공통 이벤트: `tut_restart`
4. `tut_low`·`tut_hold`를 삭제했습니다(결정 6). `tut_beat`(기믹이 아닌 안내)와 MVP에서 빠진 기믹용 `tut_hanging`·`tut_string`·`tut_ring`·`tut_tempo`는 문자열 테이블에서 빼고, 표 밖 목록에 "이후 확장" 예비 문구(12자 이내로 새로 씀)로만 남겼습니다(이슈 4).
5. 사망 토스트를 없애는 결정에 맞춰 5-4절을 "MVP 빌드는 표시하지 않음"으로 바꿨습니다. `sync-data.mjs`가 빈 `death_messages`를 오류로 보기 때문에 짧은 예비 문구 4개("다시 해 보자!" 등)는 남겼습니다. 첫 사망 1회 안내는 `tut_restart`(↻ 그림)가 계속 맡습니다.
6. 4절 기믹 표를 MVP(가시·작은 가시 L1, 상자 L2, 발판 L3)와 이후 확장(위 가시, 얇은 판, 고리, 문, 뒤집힌 종)으로 나눴습니다. 시각 힌트를 `30-art.md` 2절에 맞췄습니다: 세 레벨 모두 어두운 배경(레벨 1 회청 `#222B37`), 가시 산호 주황·발판 민트·핑 노랑은 세 레벨 공통(이슈 5). 레벨 3의 템포 문 서술과 레벨별 BPM·길이 숫자는 빼고 `levels/*.json` 기준으로 적었습니다(밸런스 재설계 중).
7. 2절의 "무광 색종이 판화 포스터" 문단과 종이 감각 용어 규칙을 "단순 도형과 또렷한 색" 한 줄로 줄이고, 세계관 문단도 세 문장으로 줄였습니다. 3절 재시작 "0.7 s" 표기를 `balance.json` 기준으로 바꿨습니다.
8. 확정값 표에 언어 자동 선택(`navigator.language`)과 플레이 중 문구 길이 규칙을 넣었습니다.
9. 6절 스토어 문구: 홀드 홍보 줄을 빼고(튜토리얼과 같은 "탭 하나" 메시지), "1초 안에"를 "바로"로 바꿨습니다(재시작 0.90~1.20 s 결정). 스크린샷 장면 2·3을 MVP 기믹(상자, 발판)에 맞춘 제안으로 바꿨습니다(장면 기준은 `30-art.md` 8-2).

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/runner-01/10-lore.md` | 1~6절 수정, 끝에 "round-2 처리 결과" 절 추가 |
| `projects/runner-01/Docs/lore-writer/2026-11-17-r2-text-fixes.md` | 이 보고서 |
| `projects/runner-01/Docs/README.md` | 목록 맨 위 한 줄 추가 |

### 문자열 키 변화 (`strings.json` 기준, 키 70 → 63)
- 삭제 7: `tut_beat`, `tut_low`, `tut_hold`, `tut_hanging`, `tut_string`, `tut_ring`, `tut_tempo`
- 추가: 없음
- 문구 변경 45, 그대로 18 (`title`, `menu_settings`, `mode_normal`, `mode_practice`, `best_normal`, `best_practice`, `cleared_badge`, `level1~3_name`, `progress`, `new_best`, `pause_restart`, `resume_countdown`, `settings_offset_unit`, `settings_shake`, `confirm_yes`, `confirm_no`)
- 목록: 사망 문구 8 → 4 (표시 안 함), 클리어 부제 4 → 4 (문구 변경)
- 레벨 쓰임 변경: `tut_crate` 레벨 1 → 2, `tut_drum` 레벨 2 → 3

## 검증 결과
- `sync-data.mjs`에는 `--dry-run` 옵션이 없고 실행하면 `games/`에 쓰므로 실행하지 않았습니다. 대신 `sync-data.mjs` 2) strings 단계의 파서 코드를 그대로 옮긴 스크립트(스크래치패드, 읽기만 함)로 새 `10-lore.md`를 파싱했습니다.
  - 결과: 키 63개, 사망 문구 4, 클리어 부제 4. 필수 키 9개(`title` … `rotate_hint`) 모두 있음, 빈 셀 0. **통과**
  - 현재 `games/reverbound/data/strings.json`과 비교해 위 키 변화 목록을 얻었습니다.
  - 플레이 중 문구 15개(튜토리얼 5, HUD 6, 사망 예비 4) 길이 검사: 최대 12자(`tut_drum`, `tut_restart`), 최대 4단어. **전부 통과**
- 영어 화면 잘림은 빌드 스크린샷이 필요해 확인하지 못했습니다(round-2 QA 몫).

## 규칙 준수 확인
- [x] 원본 보호 (레퍼런스 이름·캐릭터·아트·음악·레벨 배치 없음)
- [x] 게임 선정·설계 원칙 (5~6세 단순 규칙, 약한 아트 컨셉)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정, git 커밋·푸시 안 함 (`games/`, `balance.json`, `levels/`, `20-balance.md`, `30-art.md`, `benchmark/`, `tools/` 수정 없음)

## 문제·남은 일
- major · balance-designer: 지금 `levels/*.json` `cues`에는 삭제한 키(`tut_beat`, `tut_hanging`, `tut_string`, `tut_ring`, `tut_tempo`)가 남아 있습니다. 빌드의 `t()`는 없는 키를 **키 이름 그대로** 화면에 띄우므로, 레벨 재설계 때 `cues`를 5-6절 표(레벨 1 `tut_tap`·`tut_shard`, 레벨 2 `tut_crate`, 레벨 3 `tut_drum`)로 맞춰야 합니다. sync-data 실행은 그 뒤에 해야 합니다.
- minor · game-developer: 사망 토스트 제거(`death_messages` 미표시, 첫 사망 `tut_restart`만 유지), 연습 토글 표시 "연습 모드 · 켜짐/꺼짐" 또는 토글 모양, `navigator.language` 자동 선택, `word-break: keep-all`. `cueIcon`의 삭제 키 분기는 남아도 무해합니다.
- minor · art-director: 스토어 스크린샷 장면 2·3(북 발판+매달린 잡음, 몰아침 문)이 MVP 범위 밖이라 `30-art.md` 8-2 갱신이 필요합니다. 10-lore 6절에 제안 장면을 적었습니다.
- minor · qa-engineer: round-2에 `?lang=en` 스크린샷(레벨 선택·튜토리얼 카드·일시정지·설정·클리어) 촬영. `Wirebridge Night Market`(레벨 이름, 메뉴 문구)은 길이 규칙 대상이 아니지만 카드에서 잘리는지 확인 필요.
