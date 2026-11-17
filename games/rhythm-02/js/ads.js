// 광고 어댑터(웹 더미: 아무것도 하지 않음). 모바일 단계에서 네이티브 SDK 브리지로 바꿈. 게임 코드는 이 인터페이스만 부름.
export const ads = {
  init() { return Promise.resolve(false); },
  showInterstitial() { return Promise.resolve(false); },
  showRewarded() { return Promise.resolve(false); },
  showBanner() { return false; },
  hideBanner() { return false; },
};
