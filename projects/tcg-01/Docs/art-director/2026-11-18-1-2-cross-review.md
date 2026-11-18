# 1-2 교차 리뷰 (lore·balance ↔ art) 와 아트 문서 1회 수정

- 날짜: 2026-11-18
- 역할: art-director
- 프로젝트: tcg-01
- 단계: 1-2

## 요청 받은 일
오케스트레이터가 1-2 교차 리뷰를 맡김. 확정된 balance(커밋 0a1c454: 필드 한쪽 5칸, 손패 10, 턴 50 s, 20-balance 9-4 판 시간 식이 art.json tempo를 씀)와 lore를 읽고 충돌을 지적한 뒤 자기 문서를 1회 수정. 지시 4가지: 확정값으로 배치 재생성·48 px 재확인, 실제 cards.json 수치·lore 이름으로 카드 샘플 재생성(잘림 확인), 연출 표와 판 시간 식 일치·턴 50 s 타이머 연출, 개명 중인 lore 갈래 이름을 쓰지 말고 원작 닮음 재점검.

## 한 일
1. `layout.mjs`가 `balance.json rules.board_limit·hand_limit`를 직접 읽게 바꿈(5·10) → 4해상도 재계산. 겹침 0, 터치 48 px 이상.
2. `build.mjs`가 `cards.json`(수치·kind·keywords·lineage)과 lore(이름·글·visual_hint)를 합쳐 카드 샘플 10장(가장 긴 이름·글 포함)을 다시 만듦. 엔진 키워드 → 우리 키워드 대응표 `ENGINE_KW`, 종류 줄에 혈통 표시, 보드 토큰은 응답자만.
3. 글 상자 자동 맞춤(`fitText`: 13 px·4줄 → 12 px·5줄)과 200장 글·이름 맞춤 검사를 build에 넣음: 실패 0, 축소 0장, 이름 최소 17 px.
4. 연출: `tempo.summary_for_balance`(행동 평균 550, 큰 카드 1800, 마지막 일격 1500, AI 825/1400)를 art.json에 넣고 30-art 5-8a에 balance 값과 대조표. 턴 50 s 타이머 연출(앞 35 s 흐린 선, 15 s부터 타들어 감, 5 s부터 붉은 불꽃, 벌칙 15 s 턴, 첫 물때 30 s)을 spec·30-art에.
5. 원본 보호 재점검: 공격 연출 이름의 레퍼런스 번역어를 "달려들기"로, 호명자 명줄 판을 아래 가운데로, 카드 키워드 아이콘을 왼쪽 정렬로, 가로 화면 숨 고르기를 오른쪽 아래로. 개명 중인 갈래 이름은 art 문서·에셋 파일명에 없음(grep 0). 아이콘 제목의 "마나"도 "심지"로.
6. 리뷰 `reviews/1-2/art-director.md`에 이슈 11건(balance major 2·minor 3, dev 1, lore 2, art 고침 3).

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/tcg-01/reviews/1-2/art-director.md` | 교차 리뷰 (VERDICT: REVISE — balance 템포 값 2개) |
| `projects/tcg-01/30-art.md` | 1-2 수정(머리말 요약, 3-1·3-3·4·5-2·5-6·5-8a·9·10절) |
| `projects/tcg-01/art.json` | 재생성: layout(5칸·손패 10, 출처 balance.json), `tempo.summary_for_balance`, `immersion.turn_timer` 50 s, `text_fit` |
| `projects/tcg-01/assets/*.svg`, `assets/samples/` | 재생성(목업 4해상도·카드 샘플 실제 수치) |
| `projects/tcg-01/tools/art/{layout,build,assets,spec}.mjs` | balance 읽기, 카드 데이터 합치기, 글 맞춤 검사, 키워드·혈통 대응 |

## 검증 결과
- `node tools/art/build.mjs`: 종료 코드 0. 글 맞춤 200장 실패 0, 대비 66쌍 실패 0(최소 4.79:1), 배치 4해상도 OK(보드 숫자 17/19/17/38 px, 손패 10장 펼침 65/76/58/122 px).
- Edge 헤드리스 스크린샷으로 카드 시트·목업 4해상도를 눈으로 확인(의식 카드 토큰 "null" 표시를 찾아 고침).
- `grep` 레퍼런스 번역어(돌진·돌격·도발·은신·하수인·주문 등)를 30-art·tools/art·art.json·assets에서 찾음: 0건(9절 설명용 "보석형 마나" 한 곳 제외).
- 못 한 것: 빌드 연출 실측·효과음 렌더(빌드 전).

## 규칙 준수 확인
- [x] 원본 보호 (9절 재점검, 닮은 배치 3곳 수정, 레퍼런스 번역어 제거)
- [x] 게임 선정·설계 원칙: 5~6세 칸은 예외 적용(18세)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정(30-art.md, art.json, assets/, tools/art/, reviews/1-2/art-director.md, 보고서, README 한 줄), git·서버 안 씀

## 문제·남은 일
- (major, balance-designer) `balance.json tempo`의 `big_card_anim_ms` 2000 → 1800, `lethal_slowmo_ms` 800 → 마지막 일격 전체 1500(키 이름 정리).
- (minor, balance-designer) tier 3 예외를 `animation_budget_per_action_ms` 노트에 적고, 칸 폭 노트 68 → 64 px.
- (minor, lore-writer) UI 키 `coin_first/second` 이름 정리 권장. 키워드 「급류」 이름이 바뀌면 art가 `kw-rapids.svg`와 키워드 id를 함께 바꿈.
- (minor, game-developer) 엔진 키워드 id는 화면에 쓰지 말고 `ENGINE_KW` 대응표로 바꿔 표시.

## 다른 팀에 줄 인사이트
- 두 기획 문서가 같은 시간·수치를 쓰면 원천 파일 하나에 "다른 문서용 요약 키"(예: `tempo.summary_for_balance`)를 두고 상대가 그 키를 직접 읽게 한다. 이번에 큰 카드 2000 vs 1800, "느린 동작 800" vs "마지막 일격 1500"처럼 같은 이름이 다른 뜻으로 갈라졌다. 근거: tcg-01 `reviews/1-2/art-director.md` 이슈 1·2. 적용: balance-designer, art-director.
- 원본 보호 점검은 이름뿐 아니라 **화면 위치**도 본다: 아이콘을 레퍼런스 고유 요소(희귀도 보석·체력 표시·턴 종료 버튼)의 자리에 두면 모양이 달라도 닮아 보인다. 근거: tcg-01 30-art 9절 1-2 수정 3곳. 적용: art-director, qa-engineer(리뷰 때 레퍼런스 스크린샷과 같은 자리 비교).
- 연출·문서 낱말에도 레퍼런스 공식 번역어가 섞인다(공격 연출 이름). grep 금지어 목록을 문서뿐 아니라 tools·json·svg 제목까지 돌린다. 근거: 같은 리뷰 이슈 9. 적용: 모든 역할.
