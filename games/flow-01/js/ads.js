// 광고 어댑터 자리(에이전트 규칙: 게임 코드는 이 인터페이스만 부름). 웹 빌드는 아무 것도 하지 않는 더미이고,
// 지금 게임 코드는 어떤 함수도 부르지 않음(1단계: 광고·결제 없음). 수익화는 요청자 승인 뒤 4단계에서.
export const ads = { init() {}, showInterstitial() { return Promise.resolve(false); }, showRewarded() { return Promise.resolve(false); }, showBanner() {}, hideBanner() {} };
