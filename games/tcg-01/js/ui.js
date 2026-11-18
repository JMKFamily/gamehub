// 공용 UI: 토스트·화면 전환·스크롤 표시
export const UI = { screen: 'loading', screens: {} };
export function toast(text, ms = 1300) {
  const L = document.getElementById('toastLayer');
  if (!L) return;
  // 대전은 가운데 띠 위(30-art 4-3), 메뉴는 화면 아래(카드 글을 가리지 않게, round-2 D20)
  L.classList.toggle('menu', UI.screen !== 'battle');
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = text;
  L.appendChild(el);
  while (L.childNodes.length > 3) L.firstChild.remove();
  setTimeout(() => el.remove(), ms);
}
// 새 화면 하나만 남김(같은 id 옛 화면도 지움, round-2 D2)
export function show(id, el) {
  const app = document.getElementById('app');
  for (const c of [...app.children]) if (c !== el) c.remove();
  for (const o of document.querySelectorAll('body > .ovl')) o.remove();
  if (el.parentNode !== app) app.appendChild(el);
  el.classList.add('show');
  UI.screen = id;
  requestAnimationFrame(() => markScroll(el));
}
// 넘치는 스크롤 영역에 아래 그림자·▼ 표시(round-2 D15)
export function markScroll(root) {
  for (const sc of root.querySelectorAll('.scroll, .deckStrip')) {
    const upd = () => sc.classList.toggle('more', sc.scrollHeight - sc.scrollTop - sc.clientHeight > 4);
    if (!sc._mk) { sc._mk = true; sc.addEventListener('scroll', upd, { passive: true }); new ResizeObserver(upd).observe(sc); }
    upd();
  }
}
