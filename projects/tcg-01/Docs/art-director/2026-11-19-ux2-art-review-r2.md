# UX2 빌드 r2 아트 재리뷰 + 촛불 자산 다시 그림·월드맵 노드 상징 그림

- 날짜: 2026-11-19
- 역할: art-director
- 프로젝트: tcg-01
- 단계: UX2 리뷰 r2

## 요청 받은 일
오케스트레이터가 dev r2 빌드(884ec30)의 재리뷰를 맡김. 볼 것: 촛불 크기·시즌 트랙·월드맵·난이도·모두 열기·재질·전체 만족도. dev가 남긴 "노드를 지역 상징 그림으로"가 art 몫이면 지금 만들 것.

## 한 일
1. dev 스크린샷을 r1 지적과 대조함. major 2건(퀘스트·월드맵)과 minor 대부분이 해결됨.
2. 촛불을 5배로 확대해 재 보니, 칸은 사양대로인데 그려진 촛불은 8×14 px였음. 원인은 art 자산 비율(몸통이 viewBox를 덜 채움, 불꽃 작음)과 빈 자리 점선.
   - `candleBody`를 다시 그림: 몸통 14/20 폭·28/48 높이, 불꽃 12/48, 빈 자리는 옅은 윤곽만.
3. 월드맵 노드 상징 그림을 만듦: 지역 8 × 상태 4 = `assets/node-*.svg` 32개(`nodeSVG`). 지도 목업에도 반영함.
4. 재리뷰 작성: `reviews/ux2/art-review-r2.md`, 7.6점, REVISE(촛불 자산 재복사 뒤 PASS).

## 산출물
| 파일 | 내용 |
|---|---|
| `projects/tcg-01/reviews/ux2/art-review-r2.md` | 재리뷰 + dev 목록 |
| `projects/tcg-01/assets/candle-*.svg` | 촛불 5상태 다시 그림 |
| `projects/tcg-01/assets/node-*.svg` ×32 | 월드맵 노드 상징 그림 |
| `projects/tcg-01/tools/art/{assets,ux2,build}.mjs` | candleBody·nodeSVG·지도 노드 반영 |

## 검증 결과
- `node tools/art/build.mjs`: 종료 코드 0.
- 지도 전체 목업을 눈으로 확인: 지역 상징으로 노드가 구분되고, 지남 ✓·잠김 자물쇠·지금 고리가 보임.

## 규칙 준수 확인
- [x] 원본 보호: 자체 SVG
- [x] 게임 선정·설계 원칙: 5~6세 칸은 예외 적용(18세)
- [x] 결제·광고 클릭·계정 변경 없음
- [x] 내 담당 파일만 수정. 빌드는 읽기만 함. git 안 씀

## 문제·남은 일
- (major, game-developer) 새 촛불 자산 복사 + 그려진 크기 확인(≥ 28 px·불꽃 ≥ 8 px).
- (minor, game-developer) 월드맵 노드를 `node-*.svg`로.

## 다른 팀에 줄 인사이트
- 아이콘 "칸 크기"가 맞아도 SVG 안에서 그림이 viewBox를 얼마나 채우는지에 따라 실제 크기는 절반이 될 수 있다. 크기 기준은 칸이 아니라 그려진 그림의 px로 재고(확대 스크린샷), 자산은 viewBox를 70 % 이상 채우게 그린다. 근거: tcg-01 UX2 r2 촛불(칸 14×34, 그림 8×14). 적용: art-director, qa-engineer.
