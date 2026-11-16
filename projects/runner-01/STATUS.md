# runner-01 진행 상태

- 레퍼런스: Geometry Dash (장르·메커닉 벤치마크만, 리소스는 자체 제작)
- 게임 이름: Reverbound (잔향 질주) · slug: reverbound (웹 빌드 경로 games/reverbound/)
- 현재 단계: 1-3 웹 빌드 완료 (games/reverbound/, 개발 자체 확인 통과, DEV_NOTES.md) → 1-4 QA 대기 · 실측 벤치마크는 별도 로컬 세션에서 진행
- 라운드: -
- 미해결 이슈: 벤치마크 수치(점프·중력·히트박스)는 원 출처 미확인 추정치 → 빌드 후 자동 플레이 지표로 재보정 필요
- 교차 리뷰 결과: 3역할 완료 (reviews/cross/). 남은 문서 간 사소한 문구 불일치(tut_tempo, tut_hold, 위험·템포 문 색 힌트, art의 x↔스텝 변환식)는 round-1 리뷰에서 처리. 데이터 파일(balance.json, levels/*.json)과 10-lore.md 확정값이 문서 서술보다 우선.
