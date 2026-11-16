// 광고 어댑터. 게임 코드는 이 인터페이스만 호출한다.
// 웹: 아무 것도 안 하는 더미. 모바일(Capacitor): window.ReverboundAdsBridge 가 있으면 그쪽으로 넘긴다 (4단계에서 구현).
// 광고 배치(언제 부를지)는 balance-designer 설계 전이라 현재 게임은 init/showBanner/hideBanner만 부른다. 재시작 사이 광고 금지.

const bridge = () => (typeof window !== 'undefined' ? window.ReverboundAdsBridge : null);

export const ads = {
  async init() { return bridge()?.init?.() ?? { ok: true, provider: 'web-dummy' }; },
  async showInterstitial(placement) { return bridge()?.showInterstitial?.(placement) ?? { shown: false }; },
  async showRewarded(placement) { return bridge()?.showRewarded?.(placement) ?? { shown: false, rewarded: false }; },
  async showBanner(placement) { return bridge()?.showBanner?.(placement) ?? { shown: false }; },
  async hideBanner() { return bridge()?.hideBanner?.() ?? { hidden: true }; },
};
