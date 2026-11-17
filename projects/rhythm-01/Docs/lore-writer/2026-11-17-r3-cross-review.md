# round-3 1-2 교차 리뷰 "북길" (lore, 1회 수정)

- 날짜: 2026-11-17
- 역할: lore-writer
- 프로젝트: rhythm-01 (가안 똑딱북: Tickadrum)
- 단계: round-3 1-2 교차 리뷰 (balance·art·lore 병렬, 각 1회 수정)

## 요청 받은 일
오케스트레이터 요청: 결정 R23~R25에 맞춰 balance·art 새 코어 결과와 `10-lore.md` R3 절을 맞추는 일입니다. 범위는 다음 넷입니다.
1. R24: L6 `card_run3` 새 문구와 aria. `card_long_row`는 "쓰지 않음"으로 표시. L1 `tut_drum_tap`·`card_drum_tap` 확정.
2. 콤보 문장을 balance 확정안에 맞춰 정리.
3. art 글 자리와 문구 길이를 대조하고, `aria_streak_best`를 쓸지 정하기.
4. 가정 A1~A8 닫기, 키 수는 node로 파싱.

요청자 규칙: 5~6세 단순 규칙, 약한 아트 컨셉, 원본 보호(GD·DJMAX 이름·용어 금지), 결제·광고·계정 금지, git 실행 금지, 산출물 3개 외 수정 금지, 서버 사용 안 함, 이름 가안 유지, 선작업 금지.

## 한 일
1. **L6 새 키 `card_run3`**: KR "붙은 별 셋, 톡톡톡"(11자), EN "Three stars, tap tap tap"(5단어). 레벨 카드 대체 글로만 씁니다(`aria-label` 전용, 화면에 띄우지 않음). L6 첫 새 기믹 덩어리는 `levels/06` 둘째 덩어리 Q(둥두둥, 별 3개)라서, 카드 그림도 붙은 별을 **정확히 3개**로 그리도록 R3-6에 적었습니다. L7 `card_run4`(네 번 연달아 톡)와 별 1개 차이로 이어집니다. EN은 "in a row"를 피해 `aria_streak`("Stars in a row")와 헷갈리지 않게 했습니다.
2. **쓰지 않음 표시 2개**(삭제하지 않음): `card_long_row`는 A2 가정이 틀렸기 때문이고, `aria_streak_best`는 art가 레벨 카드에 최고 콤보 표지를 그리지 않기 때문입니다(A6). R3-7에 "쓰지 않음 키" 표를 새로 두었고, 7-5 `card_two_bar` 줄의 대체 표시도 `card_run3`로 바꿨습니다.
3. **L1 키 확정**: `tut_drum_tap`·`card_drum_tap`. art 16-5 L1 카드 3칸(별이 다가옴 → 판정 선에서 손가락 톡 → 딱 빛살)과 문구 뜻이 맞습니다.
4. **콤보 문장 정리**(R3-0·R3-2·R3-5·R3-7): 딱·좋아·통과 모두 +1, 실패에서만 끊김, 소리 없이 0.3 s 동안 사라짐, 콤보 2부터 보임, 단계 10·20 화음은 다음 빈 박, 5는 소리 없음. 헛탭·카운트인은 세지 않고, 재시작·부활은 0부터, 최고 기록은 일반 모드만 셉니다. 콤보는 클리어·등급에 영향이 없습니다. 아이용 한 줄은 "별을 맞히면 하나 늘고, 놓치면 처음부터"입니다. 콤보 표시 자리는 HUD 띠로 바꿨습니다(art 16-4).
5. **R3-4**: L6 줄(이야기 한 줄·새 규칙·카드)과 2번 문장(능선 ↔ 붙은 별 셋)을 고쳤습니다. 레벨 이름 10개와 나머지 레벨 줄은 그대로입니다(balance 17-4와 대조).
6. **R3-10에 "교차 리뷰에서 닫음" 표 추가**: A1~A8의 결과와 근거, 고친 곳, 상대 역할이 할 일을 적었습니다. R3-11에는 수정 기록을 남겼습니다.

## 글 자리 대조 (art `layout.json`)
| 문구 | 자리 | 결과 |
|---|---|---|
| `tut_drum_tap` KR "별이 북에 오면 톡!" 11자 | `text_slot` 폭 220 px · 높이 40 px(14 px 2줄), 8경우(4해상도 × 안전 영역) 모두 폭 220 | 전각 14 px로 넓게 잡아도 약 154 px라 1줄에 들어갑니다 |
| `tut_drum_tap` EN "Tap when stars reach the drum" 29글자 | 같음 | 1줄은 넘칠 수 있습니다(약 0.6 em로 잡으면 244 px). 띄어쓰기에서 2줄("Tap when stars reach" 약 168 px / "the drum")로 나뉘어 들어갑니다. 12 px로 줄일 필요가 없고 문구도 그대로입니다 |
| `tap_to_start` (타이틀 시작 힌트, 같은 자리) | 같음 | 짧아서 들어갑니다 |
| 카드 키 5개·`aria_streak` | 화면 글 없음(aria 전용) | 해당 없음 |

- 실제 폰트 렌더 폭은 빌드가 있어야 잴 수 있어서 QA 스크린샷 확인으로 넘깁니다(art 16-10 qa 1과 같습니다).
- 레벨 카드 최고 콤보 표지는 art 16-4에서 "이번에 넣지 않음"으로 정해졌습니다. 그래서 `aria_streak_best`는 **쓰지 않음**으로 확정했습니다.

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-01/10-lore.md` | R3-0·R3-2·R3-3·R3-4·R3-5·R3-6·R3-7·R3-9·R3-10·R3-11, 맨 위 확정값 키 수 줄, 7-5 `card_two_bar` 대체 표시 수정. 669 → 693줄, CRLF 유지, 삭제 0 |
| `projects/rhythm-01/Docs/lore-writer/2026-11-17-r3-cross-review.md` | 이 보고서 |
| `projects/rhythm-01/Docs/README.md` | 표 맨 위 한 줄 |

## 검증 결과
- node 파싱(스크래치 `count-keys.mjs`, 첫 칸이 "키"인 표의 키 추출, 같은 키는 하나로 셈): **표 키 70개, 폐기 3**(`tut_tap`·`card_star_tap`·`card_two_bar`), **쓰지 않음 2**(`card_long_row`·`aria_streak_best`), **사용 65**.
- 글자 수(node `[...s].length`, 단어는 공백으로 나눔): `tut_drum_tap` 11자/6단어, `card_drum_tap` 9자/6단어, `card_run3` 11자/5단어, `aria_streak` 7자/4단어. 모두 12자·6단어 이내입니다.
- 줄바꿈: 693줄 모두 CRLF입니다.
- 빌드·접근성 트리 확인은 하지 않았습니다(구현 전, 서버 사용 안 함).

## 상대 역할이 고칠 것 (R24, lore는 손대지 않음)
| 담당 | 지금 값 (교차 리뷰 시점에 읽은 것) | R24대로 |
|---|---|---|
| balance | `balance.json cards.keys["01"]` = `card_star_tap` | `card_drum_tap` (`"06": "card_run3"`은 이미 맞음) |
| balance | `tutorial_cue.key` = `tut_tap`, `levels/01-level1.json cues[0].key` = `tut_tap` | `tut_drum_tap` |
| balance | 20-balance 17-4 표 L1 카드 칸 `card_star_tap`, 17-12 위험 5 | `card_drum_tap`, 위험 5 닫음 |
| art | `cards-r3/card_star_tap*.svg`, `cards-r3/card_two_bar*.svg`(가정 "마디 표를 넘는 덩어리") | `card_drum_tap*.svg`, `card_run3*.svg`(붙은 별 **3개**, ① 다가옴 → ② 첫 별 톡 → ③ 셋째 별 톡) |
| art | `layout.json text_slots` 키 `tut_tap`, 30-art 16-5 표·16-10 lore 2의 키 이름 | `tut_drum_tap`, 표 키 이름 갱신 |
| game-developer (구현 때) | - | `strings`에 사용 키 65개. 폐기 3개와 쓰지 않음 2개는 DEV_NOTES에 "10-lore R3-7 폐기/쓰지 않음"으로 적기(criteria R8 줄) |

## 규칙 준수 확인
- [x] 원본 보호: 새 문구는 일반어입니다("붙은 별 셋, 톡톡톡 / Three stars, tap tap tap"). GD·DJMAX의 이름·용어(콤보·MAX 등)는 쓰지 않았습니다.
- [x] 게임 선정·설계 원칙: 콤보 규칙은 한 줄("맞히면 늘고 놓치면 처음부터")이고 끊김 신호가 따로 없습니다. 카드는 글 없이 그림이 주입니다.
- [x] 결제·광고 클릭·계정 변경 없음.
- [x] 산출물 3개만 수정했습니다. balance·levels·30-art·assets·빌드·harness·games.json·다른 프로젝트는 읽기만 했습니다. git은 `--version`을 포함해 한 번도 실행하지 않았고, 서버도 쓰지 않았습니다. 이름은 가안을 유지했습니다. 스크래치 밖에 python 확인용 빈 임시 파일 1개를 만들었다가 지웠습니다(레포 밖 시스템 Temp).

## 문제·남은 일
- **minor · balance·art**: 위 표의 키·파일 이름이 R24와 아직 어긋납니다. 각자 교차 리뷰에서 바꾸면 3역할 이름이 같아집니다. 바뀌지 않으면 빌드에서 카드·튜토리얼 대체 글이 비게 됩니다.
- **minor · qa**: `tut_drum_tap` EN 2줄이 실제 폰트로 220 px 안에 들어가는지 4해상도 스크린샷으로 확인해야 합니다. 접근성 트리에 `aria_streak` 이름·값이 있고 `aria_streak_best`는 없어야 합니다.
- **정보 · 오케스트레이터**: 최고 콤보를 화면에 보여 줄지(레벨 카드 표지)는 art가 이번에 넣지 않았습니다. 나중에 넣으면 `aria_streak_best` 문구와 R3-b 규칙을 그대로 되살리면 됩니다.

## 다른 팀에 줄 인사이트
- 병렬 기획에서 키 이름을 가정으로 정해 두면, 교차 리뷰 때 틀린 가정 키를 지우지 말고 "쓰지 않음" 표로 따로 모으는 것이 좋습니다(폐기와 구분, 이유·대신 키를 함께 적음). 그러면 키 수(표/사용/폐기/쓰지 않음)를 node로 다시 세어 DEV_NOTES 사유와 바로 맞출 수 있습니다. 근거: 이 보고서, 10-lore R3-7. 적용: lore-writer, game-developer.
- 기믹이 "붙은 별 N개"처럼 수로 이어지면(L6 셋 → L7 넷) 카드 대체 글도 같은 틀로 쓰고, EN에서 콤보 대체 글과 같은 표현("in a row")은 피합니다. 화면 낭독기 사용자가 카드와 콤보 표시를 헷갈리지 않습니다. 적용: lore-writer.
