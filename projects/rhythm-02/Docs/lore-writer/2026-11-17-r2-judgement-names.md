# r2 판정 이름·퍼센트 문구

- 날짜: 2026-11-17
- 역할: lore-writer
- 프로젝트: rhythm-02
- 단계: round-2 (빌드 진행 중 추가 지시)

## 요청 받은 일
오케스트레이터가 요청자 지시(전 프로젝트) "판정 이름과 퍼센트까지 해주세요."를 전달했습니다. balance가 정한 이름 키 3개(`grade_perfect_name`·`grade_good_name`·`grade_pass_name`)의 ko·en 문구를 정하고, 결과 화면 정확도·최고 콤보 대체 글, 판정마다 낭독하지 않는 규칙, 플레이 중 문구 한도를 정하라는 요청입니다. 지금의 등급 표시(구름 1~3칸, 기획 낱말 딱/좋아/통과)와 겹치지 않게 정리하고, 7-9 검사를 새 키까지 넣어 다시 돌립니다. 30-art 8절 "셋 세고"는 art 몫이라 손대지 않았습니다.

## 한 일
1. 판정 이름 3개를 공통 권장안(djmax-judgement 7-3) 그대로 정했습니다: **딱이야 / 좋아 / 됐어**, **Wow! / Nice / OK**. 세 이름 모두 칭찬이고, 3단에는 시험 말투인 "통과" 대신 "됐어"를 씁니다. 한국어 2~3자, 영어 1단어입니다. 원작(DJMAX) 판정·칭호 이름은 쓰지 않았습니다. rhythm-01 빌드 판정 이름과는 글자까지 같은데, 요청자가 허용한 겹침이라 7-9 ⑦에 `judge` 예외로 두었습니다.
2. 결과 화면 대체 글 키 3개를 새로 만들었습니다.
   - `result_accuracy` "표시에 맞춘 정도 / How well you hit the marks": meter, 0~100, valuenow = 정확도, valuetext "87%"
   - `result_combo` "이번에 이어서 잘한 수 / Longest row of good taps": meter, **valuetext = 숫자만**(insights 콤보 줄)
   - `result_new_best` "제일 잘 맞췄어요 / Your closest yet!": 정확도 신기록 표지 img, live 없음. balance `records.new_record` "작은 표지"의 대체 글입니다.
3. 10-lore 고친 곳
   - 확정값 표: 판정 이름 행, 결과 행 추가, 키 수 83 → 89
   - 5절: 판정 등급 줄을 다시 쓰고 "등급 구름 ≠ 판정 이름" 줄 추가
   - 6절 4: 정확도 meter 규칙. 6절 5: 판정 이름·%는 판정마다 읽지 않고 캔버스나 `aria-hidden`으로 둠
   - 6절 8: % 숫자 글 예외. 6절 11: 결과 화면 접근성 트리 목록
   - 7-4(14개)·7-5(7개): 키 행 추가. 키 변화 기록
   - "키를 두지 않은 것": 실패·지붕 참기 이름·%는 두지 않고, 빠름/느림 표시와 플레이 중 평균도 두지 않음
   - 7-10 새로: 이름 표, 두 줄 표기, 바꿔 그림, 낭독 안 함, 구름과 섞지 않기, 결과 화면 표, 읽는 순서
4. 7-9 검사에 ⑨를 더했습니다.
   - 이름 키 = `balance.json judgement_display.names`이고 hold·fail은 null
   - 한국어 2~3자, 영어 2~4자 + `!`, 이름 6개가 서로 다름
   - 이름에 등급 구름 말이 없고 `grade_1~3`에 이름이 없음
   - result 키 3개가 aria로 있음
   - 원작 말(MAX·BREAK·GREAT·COOL·RATE·perfect·fever)이 모든 키에서 0
5. 바꾸지 않은 것: 기존 83개 키 문구, 기획·데이터 이름(딱/좋아/통과, perfect/good/pass), 30-art 8절

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/rhythm-02/strings.json` | 키 6개 추가(89개), `_meta` 날짜 문구 |
| `projects/rhythm-02/10-lore.md` | 확정값 표·5·6·7-4·7-5·7-9(⑨, 명령, 결과)·7-10 |
| `projects/rhythm-02/Docs/README.md` | 맨 위 한 줄(CRLF 유지) |

## 검증 결과
`projects/rhythm-02/`에서 10-lore 7-9 명령(node)을 문서에 적힌 그대로 실행했습니다.

```
judge names 딱이야/Wow!/좋아/Nice/됐어/OK =balance | doc 89 json 89 | cards strings=balance=levels 8 OK | same-as r01 35 runner 12 (common만 허용) | card files 16/16 |  PASS
```

- ①~⑨는 모두 PASS이고 대기는 0입니다.
- r01 겹침이 32에서 35로 늘었는데, 늘어난 3개는 판정 이름(rhythm-01 `judge_perfect/good/pass`)뿐입니다. 결과 키 3개는 두 게임과 글자 겹침이 0입니다.
- `strings.json` JSON 파싱은 OK입니다.
- 한도: `result_combo` 한국어 12자, `result_accuracy` 영어 6단어로 둘 다 한도에 딱 맞습니다. 나머지는 한도 안입니다.

## 다른 팀에 줄 인사이트
- 판정 이름 키를 `grade_*_name`처럼 등급 키(`grade_N` = 레벨 등급 구름)와 비슷하게 지으면 문서·빌드에서 섞이기 쉽습니다. 막는 방법은 두 가지입니다.
  - lore 검사에 "판정 이름에 등급 말 없음 + 등급 대체 글에 판정 이름 없음"을 넣습니다.
  - 문서에 "탭 하나 vs 레벨 한 판" 구분 줄을 둡니다.
- 결과 화면 정확도는 실제 퍼센트이므로 valuetext를 "87%"로 둡니다. 개수(최고 콤보)는 숫자만 둡니다.

적용: lore-writer, game-developer, qa-engineer.

## 규칙 준수 확인
- [x] 원본 보호: 원작 판정 이름, "이름 + %" 한 줄 표기, "RATE" 표기를 쓰지 않았고 ⑨로 검사
- [x] 게임 선정·설계 원칙: 5~6세 입말 칭찬, 2~3글자, 글 없이도 크기·튐 선으로 구분, 실패·참기에 이름 없음
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정, git 커밋·푸시 안 함, 서버 안 띄움(node만)

## 문제·남은 일
- **minor / dev**
  - 판정 순간 `pctEvents`의 `name_key`로 `strings.json` 이름을 그립니다(hold는 그리지 않음).
  - 이름과 %는 두 줄로 그리고 캔버스나 `aria-hidden`으로 둡니다.
  - 결과 화면 meter 2개와 img 1개(10-lore 7-10 표), 연습 클리어에는 셋 다 없음
- **minor / art**
  - 이름 글꼴·크기·색·자리(북 옆, 공 세로 줄 비킴, HUD 띠 밖)
  - 결과 화면 정확도 그림 이름표·신기록 표지·최고 콤보 점 줄
  - 30-art 1절 "판정 글자 팝업 금지" 줄을 이번 지시 범위로 풀기
  - 가장 넓은 문구: EN "Nice"·"Wow!", KR "딱이야"
- **minor / qa**
  - 플레이 중 판정 이름·%가 접근성 트리에 없는지 확인
  - 결과 meter valuetext("87%"·숫자만) 확인
  - notext 화면 등급 구분 확인
- 참고: runner-01 판정 이름은 "됐다 / OK!"(프로젝트 문서)라 rhythm-01·02의 "됐어 / OK"와 한 글자 다릅니다. 허브 통일 여부는 오케스트레이터가 판단합니다(요청자가 겹침을 허용했으므로 지금은 그대로 둠).
