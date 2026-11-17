// 광고 어댑터 (웹 더미). 게임 코드는 이 인터페이스만 부른다. 웹 빌드에는 광고·결제·외부 링크 없음.
export const ads = {
  init() { return Promise.resolve(false); },
  showInterstitial() { return Promise.resolve(false); },
  showRewarded() { return Promise.resolve(false); },
  showBanner() {},
  hideBanner() {},
};
