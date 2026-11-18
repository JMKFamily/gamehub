// 광고 어댑터(더미). 이 게임은 광고·실결제를 쓰지 않는다. 게임 코드는 이 인터페이스만 부른다.
const bridge = () => (typeof window !== 'undefined' ? window.EbbwritAdsBridge : null);
export const ads = {
  async init() { return bridge()?.init?.() ?? { ok: true, provider: 'web-dummy' }; },
  async showInterstitial(p) { return bridge()?.showInterstitial?.(p) ?? { shown: false }; },
  async showRewarded(p) { return bridge()?.showRewarded?.(p) ?? { shown: false, rewarded: false }; },
  async showBanner(p) { return bridge()?.showBanner?.(p) ?? { shown: false }; },
  async hideBanner() { return bridge()?.hideBanner?.() ?? { hidden: true }; },
};
