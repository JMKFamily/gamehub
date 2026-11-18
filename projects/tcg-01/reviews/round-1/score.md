# 점수 집계 · tcg-01 「썰물 영장」 round 1

- 날짜: 2026-11-18 · 집계: qa-engineer (1-6)
- 근거: 같은 폴더의 `benchmark-analyst.md`, `balance-designer.md`, `art-director.md`, `lore-writer.md`, `qa.md`, `metrics.json`
- 가중치: `harness/criteria.md` "점수 산정"

## 총점
| 영역 | 채점 역할 | 점수 | 가중치 | 가중 점수 | 6.0 하한 | VERDICT |
|---|---|---|---|---|---|---|
| 게임 감각·핵심 루프 | benchmark-analyst | 8.0 | 25 % | 2.00 | ✓ | PASS |
| 밸런스·레벨 | balance-designer | 7.0 | 20 % | 1.40 | ✓ | REVISE |
| 시각·사운드 | art-director | 7.0 | 20 % | 1.40 | ✓ | REVISE |
| 세계관·텍스트 | lore-writer | 6.5 | 10 % | 0.65 | ✓ | REVISE |
| 기술 품질·안정성 | qa-engineer | 6.0 | 25 % | 1.50 | ✓(하한 그대로) | REVISE |
| **합계** | | | 100 % | **6.95** | 5/5 | |

## 게이트 판정
| 조건 | 결과 |
|---|---|
| 가중 총점 ≥ 8.0 | **6.95 ✗** (1.05 부족) |
| 모든 영역 ≥ 6.0 | ✓ (최저 qa 6.0) |
| blocker 0 | ✓ (0개 — 원본 보호 검사 art·lore 모두 0) |
| **판정** | **불통과 → round-2** |

major 합계(중복 합침) 13건: game-developer 9 · balance-designer 2 · (lore 완료 2건은 dev 반영 대기로 dev 쪽에 셈).
총점을 8.0으로 올리려면 qa 6.0 → 8 이상(major 5건), lore 6.5 → 8(영어 카드 글·튜토리얼 반영), art·balance 7 → 8(가로 상자·소리 순서 / 펠 상성·입문 덱)이 필요하다.

## 오케스트레이터 결정 반영 (기록 예정, 이 집계에 적용)
- **O3** 접전 20~40 % 확정. 게이트 주 지표는 막판 접전(30.3 % ✓)·역전(21.6 % ✓). 접전 19.8 %는 major로 세지 않고 minor(재측정)로 둠.
- **O4** 주도권 교체(0.98)는 참고 지표, 게이트 제외.
- **O5** 판 시간 목표 4~8분 유지(balance의 3~7분 제안은 채택 안 함). round-2에서 사람 속도 봇(턴 시작 생각 8~15 s + 행동 사이 2~4 s)으로 3판 이상 재측정.

## 담당 역할별 수정 목록 (중복 합침, 출처 = 리뷰#)

### game-developer — 28건 (major 9 · minor 19)
| # | 심각도 | 내용 | 출처 |
|---|---|---|---|
| D1 | major | 메뉴 전환 긴 프레임: 부두 → 수집 6배 스로틀 2.05~2.08 s, 대전 시작 183~250 ms, 첫 탭 150~207 ms(≤ 100). 수집 격자를 보이는 칸만·초상 지연 로드, 격자 카드는 `hand` 모드 + 이름 한 줄(글 덩어리 제거) | qa1, art8, bench(지지) |
| D2 | major | `ui.js show()`가 같은 id 화면을 지우지 않아 화면 DOM 누적(설정 5번 → 10개) | qa2 |
| D3 | major | 백그라운드: visibilitychange 처리·AudioContext suspend·게임 시계/턴 타이머 정지·복귀 이어하기 화면 | qa3 |
| D4 | major | 640x360 상자 개봉 잘림·버튼 겹침 → 30-art 4-4 가로 규칙(상자 왼쪽 30 %, 덩이·카드 오른쪽 3+2, 안내 글 상자 아래) | qa4, art1 |
| D5 | major | 터치 48 px: 수집·빌더 필터 40 px, 빌더 카드 줄 30 px | qa5 |
| D6 | major | 덩이 소리 희귀도 역순·승리 < 패배: art 수정분(`art.json`, 아이콘 clipPath) sync로 다시 복사, `sfx-render.mjs --build` 4개 OK 확인 | art2, art9 |
| D7 | major | 영어 카드 규칙 글: sync에서 `concept_en` → `text_en`, cardText(en) 사용 | lore1 |
| D8 | major | 튜토리얼(10-lore 8-7, 키 있음) 첫 연습 판 10단계 | lore3 |
| D9 | major | 첫 실행 수집을 balance 입문 영장첩(`decks/starter-*.json`, balance가 작성) 카드만으로 | bal2 |
| D10 | minor | 빠르게 보기 공격 +19 %: art의 `phases_fast_ms`(정지 40)·tier 정지 빠르게 절반 적용 → 300 ±15 % | qa8, art3, bench5 |
| D11 | minor | tempoLog를 단계별로(마지막 일격 1500 → 부서짐 700 → 결과, 숨 고르기와 턴 배너 분리) | qa10, art10 |
| D12 | minor | 예약 처리: 잠금 끝에 건너뜀 대신 사양대로 남은 연출 2배속(또는 art가 사양을 "건너뜀"으로 고치면 그대로) | qa9 |
| D13 | minor | 상자 공개 라벨: 2장째 사본 `crate_second_copy`·`crate_resonance_gain` 키 사용, 다 열면 안내 글 숨김 | qa11, lore12 |
| D14 | minor | 결과 화면: 판 위 승패 배너 숨김, 결과 오버레이를 손패 위로 | qa12, art6 |
| D15 | minor | 640x360 메뉴 스크롤 표시(그림자·화살표) | qa13 |
| D16 | minor | 상자 개봉 연출 `setTimeout` → 게임 시계 | qa14 |
| D17 | minor | 멀리건 동안 손패 부채꼴 숨김 | bench4 |
| D18 | minor | 턴 타이머 앞 35 s 흐린 선(35 %) 표시 | art4 |
| D19 | minor | 360x640 손패 부채꼴 양 끝 비용 판 화면 안(폭 `hand.w − card_w × 1.35`) | art5 |
| D20 | minor | 새김 완료 토스트가 카드 글을 덮지 않게 | art7 |
| D21 | minor | `strings-extra.json` 제거하고 10-lore 8-11 확정 키 사용(`ai_level` en·`recut_rule_note` 값 변경 포함) | lore4 |
| D22 | minor | 친선 새김 슬롯 고르기 화면(`recut_slot_*` 키) + `mode_sparring_desc` 새 글 | lore5, DEV 남은 일 |
| D23 | minor | 영어 표준 영장첩 아키타입 이름 `deck_arch_<덱>` 키로 | lore6 |
| D24 | minor | 호명자 소개 `hero_<id>_bio`, `위기` 대사 줄(D8 자리), 맞대결 첫 대사 | lore7 |
| D25 | minor | 카드 글 `word-break: keep-all`·숫자 앞 줄바꿈 없는 공백, 글 검사기 n ≥ 99 = "모두" | lore8, lore2 |
| D26 | minor | 영어 말풍선 불투명 바탕·위치, 시장 상자 이름 칸 넓힘 | lore9 |
| D27 | minor | `market_no_real_money` 글을 부두 → 시장 화면으로 | lore11 |
| D28 | minor | balance.json 경제 중 빠진 것: 주간 맹약(소금화 150 + 상자 1), 첫 주 매일 상자 1 | bal6 |

### balance-designer — 7건 (major 2 · minor 5)
| # | 심각도 | 내용 | 출처 |
|---|---|---|---|
| B1 | major | 35~65 % 밖 5칸(펠 4칸)·펠 55.6 %: 수정안 ① 펠 호명술 discover → 부품 1장 ② B042 4/6 → 4/5 ③ B051 +1/+0 ④ B037 체 +3 시험. lore 문구 변경은 lore에 요청 | qa6, bal1 |
| B2 | major | 입문 영장첩 `decks/starter-<영웅>.json` 6개 작성, econ.mjs 입문 수집 전제로 목표 덱 완성 15~30일 재확인 | bal2 |
| B3 | minor | 접전 19.8 %: O3대로 목표 확정, B1 뒤 쌍당 2000판 재측정(주 지표 막판 접전·역전) | qa6 일부, bal3, bench2 |
| B4 | minor | 판 시간 식 사람 상수를 round-2 사람 속도 실측(O5)으로 보정, 목표 4~8분 유지 | qa15, bal5, bench1 |
| B5 | minor | 게이트 판정 표본 쌍당 2000판·시드 2개 평균, 20-balance 9-2 일방 4.2 → 3.9 % 표기 맞춤 | qa7, bal4 |
| B6 | minor | 의뢰 목표 수(1·1·2 / 3·4·5 / 4·6·8)를 `economy.income.daily_commission_goals`로 | bal7 |
| B7 | minor | 주도권 교체를 9-2 표에서 참고 지표로(O4), 히스테리시스 정의 명시 | bench3 |

### art-director — 3건 (minor 3) · 완료 3건(dev 반영 대기: D6·D10)
| # | 심각도 | 내용 | 출처 |
|---|---|---|---|
| A1 | minor | 굵은 영문 "Sister"의 i 글리프가 대문자처럼 보임: 글꼴 대체·자간 확인 | lore10 |
| A2 | minor | 예약 연출 사양 결정(2배속 유지 vs 건너뜀) 30-art 5-1 3항 | qa9 |
| A3 | minor | 수집 격자 카드 표시 형식(`hand` 모드 + 이름 줄) 확정해 dev D1과 맞춤, 영어 말풍선 위치 확인 | art8, lore9 |

### lore-writer — 1건 (minor 1) · 완료 7건(dev 반영 대기: D7·D13·D21~D25)
| # | 심각도 | 내용 | 출처 |
|---|---|---|---|
| L1 | minor | balance B1 ①이 채택되면 펠 호명술 문구("인양" → "부품 1장") 수정 | bal1 |

### qa-engineer — 4건 (round-2 검사 추가)
| # | 내용 | 출처 |
|---|---|---|
| Q1 | 사람 속도 봇(턴 시작 8~15 s + 행동 사이 2~4 s, 교환형 정책) 실제 포인터 3판 이상, 판 시간 중앙값 | O5, bench1 |
| Q2 | 치열함 판정 쌍당 2000판 × 시드 2개(교환 평가형), 경주형 참고 | bal4, O3 |
| Q3 | 전멸(3+ 동시 사망)·심해 카드 순간 FPS를 시드 골라 6배 스로틀 3회로 따로 | qa 6절 |
| Q4 | 화면 DOM 누적·빠르게 보기 정보 손실·소리 순서 새 criteria 줄 검사, major 5건 회귀 | criteria 추가 |

### orchestrator
- O3·O4·O5 결정 기록, criteria 추가 9줄 확인(아래).

## criteria.md 추가 (덧붙이기만, 각 절 끝)
| 절 | 줄 | 제안 |
|---|---|---|
| 기술 품질 | 화면 DOM 누적 0 / 빠르게 보기·건너뛰기 정보 손실 검사 | qa-engineer |
| 게임 감각 | 사람 속도 판 시간 4~8분(3판, O5) / 고르는 화면에 같은 카드 두 번 안 보임 | benchmark-analyst |
| 밸런스 | 치열함 판정 주 지표·주도권 참고·2000판 × 시드 2(O3·O4) / 첫 실행 수집 = new_player | benchmark-analyst, balance-designer |
| 시각·사운드 | 덩이 소리 희귀도 순서 / 연출 ±15 %는 원본 시간표·실시간·빠르게 포함·단계별 | art-director, qa-engineer |
| 세계관·텍스트 | 지원 언어별 카드 규칙 글·글 숫자 = 엔진 | lore-writer |
