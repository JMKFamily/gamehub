# GameHub

게임 제작부터 출시까지 자동화하는 하네스 파이프라인의 배포 저장소입니다. GitHub Pages로 호스팅합니다.

## 구조

```
index.html               게임 목록 허브 (games.json을 읽어 카드로 표시)
games.json               게임 매니페스트
games/<slug>/index.html  각 게임 (단일 HTML, 외부 의존성 없음)
scripts/validate.mjs     매니페스트 검증 (CI에서 실행)
.github/workflows/pages.yml  main에 push하면 검증 후 Pages 배포
```

## 게임 추가하기

1. `games/<slug>/index.html` 작성
2. `games.json`에 항목 추가: `slug`, `title` 필수, `description`, `tags`, `released` 선택
   - 외부 링크(예: claude.ai 아티팩트)는 `url` 필드를 넣으면 로컬 파일 없이 링크만 등록됩니다.
3. `node scripts/validate.mjs`로 확인 후 main에 push

## 최초 설정

저장소 Settings → Pages → Source를 **GitHub Actions**로 지정해야 배포됩니다.
