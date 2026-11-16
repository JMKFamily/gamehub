# AppLovin MAX 계정 세팅 가이드 (요청자용)

하네스가 광고를 자동으로 연동하려면 요청자가 아래 계정 작업을 한 번 해두어야 합니다.
끝나면 맨 아래 "하네스에 넘길 값"만 GitHub Secrets에 넣으면 됩니다. 키를 채팅이나 레포에 붙여넣지 마세요.

> 대시보드 메뉴 이름은 자주 바뀝니다. 아래 경로가 다르면 AppLovin 문서의 Getting Started를 기준으로 하세요.
> 참고: https://developers.applovin.com/en/getting-started , https://support.applovin.com/en/max/getting-started

## 0. 구성 결정

- **권장**: AppLovin MAX를 미디에이션 플랫폼으로 쓰고, Google AdMob을 MAX 안의 광고 네트워크로 추가합니다. 한 SDK로 두 곳의 광고가 경쟁 입찰해서 수익이 보통 더 높습니다.
- "구글애즈(Google Ads)"는 광고를 **사는** 쪽(광고주) 서비스입니다. 우리 앱에 광고를 **붙여서 돈을 버는** 쪽은 **Google AdMob**입니다. 이 문서의 Google 항목은 AdMob 기준입니다.
- 게임을 홍보하려고 광고를 집행할 때(유저 획득)는 Google Ads나 AppLovin의 광고주 계정을 따로 씁니다. 지금 단계에서는 필요 없습니다.

## 1. 준비물

- [ ] 회사 또는 개인 정보 (정산 받을 이름, 주소)
- [ ] 정산 계좌 또는 PayPal, 세금 양식 정보 (한국 거주자는 W-8BEN 또는 W-8BEN-E)
- [ ] **개발자 웹사이트 도메인** (예: `example.com`). Play 스토어 등록정보의 "웹사이트"와 같은 도메인이어야 하고, 그 루트에 `app-ads.txt`를 올려야 합니다.
  - GitHub Pages를 쓸 경우: `jmkfamily.github.io`처럼 하위 경로(`/gamehub`)가 아닌 **루트**에 파일이 있어야 합니다. 그래서 `JMKFamily/jmkfamily.github.io` 레포를 만들거나, 커스텀 도메인을 연결하는 쪽을 권장합니다.
- [ ] 앱 패키지 이름 확정 (예: `com.jmkfamily.<게임slug>`). 한 번 출시하면 바꿀 수 없습니다.

## 2. AppLovin 계정 만들기

1. https://dash.applovin.com 에서 가입 (Publisher / MAX 용도 선택)
2. 이메일 인증, 회사 정보 입력
3. **Account → Payments**(또는 Payment Info)에서 정산 방법, 세금 양식, **웹사이트 루트 도메인** 입력
   - 도메인 칸에는 `https://` 없이 루트 도메인만 넣습니다.

## 3. SDK 키 확인

- **Account → General → Keys**에서 **SDK Key**를 확인합니다.
- 이 키는 앱 안에 들어가지만 레포에는 넣지 않고 GitHub Secret `APPLOVIN_SDK_KEY`로 등록합니다.

## 4. 앱과 광고 단위 만들기

**MAX → Mediation → Manage → Ad Units → Create Ad Unit**에서 아래를 만듭니다. 플랫폼은 Android, 패키지 이름은 1단계에서 정한 값입니다.

| 광고 단위 이름 | 형식 | 게임 안 용도 (밸런스 기획자가 최종 확정) |
|---|---|---|
| `<slug>_interstitial` | Interstitial | 일정 횟수 사망 후 재시작 사이 |
| `<slug>_rewarded` | Rewarded | 이어하기, 연습 모드 해제 등 보상 |
| `<slug>_banner` | Banner | 메뉴 화면에서만 (플레이 중에는 표시하지 않음) |

각 광고 단위의 **Ad Unit ID**를 메모합니다.

## 5. AdMob 연결 (권장 구성일 때)

1. https://admob.google.com 에서 계정 생성, 정산 정보 입력
2. AdMob에서 앱 추가 (아직 스토어에 없으면 "미등록 앱"으로 추가 후 나중에 연결)
3. AdMob **App ID**(`ca-app-pub-...~...`)를 메모합니다.
4. AppLovin 대시보드 **MAX → Mediation → Manage → Networks**에서 Google bidding and Google AdMob 네트워크를 켜고, AppLovin 안내에 따라 AdMob 쪽에 광고 단위를 만들어 ID를 연결합니다.

## 6. app-ads.txt

- AppLovin 대시보드(Account 또는 MAX 메뉴의 app-ads.txt 항목)에서 우리 계정용 줄 목록을 받습니다. AdMob을 쓰면 AdMob 화면에서도 한 줄을 받습니다.
- 두 내용을 합쳐 `https://<웹사이트 도메인>/app-ads.txt`로 올립니다. 이 파일이 없거나 틀리면 광고 수익이 크게 줄어듭니다.
- 하네스가 파일 배포를 자동화할 수 있습니다. 줄 목록은 비밀값이 아니므로 레포에 커밋해도 됩니다.

## 7. 개인정보·정책

- **동의 관리**: 유럽 사용자 대상 동의 팝업이 필요합니다. MAX의 Terms and Privacy Policy Flow 또는 Google UMP 중 하나를 쓰고, 동의 처리 후 SDK를 초기화합니다. (하네스 개발 담당이 구현)
- **개인정보처리방침 URL**: 스토어와 동의 팝업에 들어갑니다. 웹사이트 도메인에 페이지를 하나 만들어 둡니다. (하네스가 초안 작성 가능)
- **Play Console 데이터 보안 양식**: 광고 SDK가 수집하는 항목(기기 ID, 대략적 위치 등)을 신고해야 합니다. 출시 단계에서 하네스가 작성 초안을 드립니다.
- **타깃 연령**: 13세 미만을 대상에 포함하면 광고 정책이 크게 달라집니다(가족 정책). 이 게임은 **13세 이상**으로 설정하는 것을 권장합니다.

## 8. 테스트

- 개발 중에는 **MAX → Mediation → Manage → Test Mode**에 테스트 기기를 등록해 테스트 광고만 받습니다. 실제 광고를 직접 누르면 계정이 정지될 수 있습니다.
- 테스트 광고는 노출·수익이 집계되지 않습니다.

## 하네스에 넘길 값

레포 **Settings → Secrets and variables → Actions → New repository secret**에 등록하세요.

| Secret 이름 | 값 | 비밀 여부 |
|---|---|---|
| `APPLOVIN_SDK_KEY` | 3단계 SDK Key | 비밀 |
| `APPLOVIN_INTERSTITIAL_ID` | 4단계 Ad Unit ID | 낮음 (Secret으로 통일) |
| `APPLOVIN_REWARDED_ID` | 4단계 Ad Unit ID | 낮음 |
| `APPLOVIN_BANNER_ID` | 4단계 Ad Unit ID | 낮음 |
| `ADMOB_APP_ID` | 5단계 App ID (AdMob 쓸 때) | 낮음 |

그리고 채팅으로는 아래 비밀이 아닌 정보만 알려주세요.
- 확정한 패키지 이름
- 웹사이트 도메인
- AdMob 사용 여부
- 등록을 끝낸 Secret 이름 목록

## 하네스 쪽 연동 방식 (참고)

- Capacitor용 공식 AppLovin 플러그인은 없습니다. 그래서 개발 담당이 AppLovin Android SDK(`com.applovin:applovin-sdk`)를 감싸는 작은 Capacitor 플러그인을 `mobile/<slug>/`에 직접 만듭니다.
- AppLovin Android 연동 문서: https://developers.applovin.com/en/max/android/overview/integration
- AdMob 어댑터를 쓸 경우 Gradle에 해당 미디에이션 어댑터 의존성을 추가합니다. 버전은 연동 시점의 최신으로 맞춥니다.
- 게임 코드는 `ads` 어댑터만 호출하므로 웹 버전에는 광고가 뜨지 않습니다.
