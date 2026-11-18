// 공용 UI: 토스트·화면 전환
export const UI = { screen: 'loading', screens: {} };
export function toast(text, ms = 1300) {
  const L = document.getElementById('toastLayer');
  if (!L) return;
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = text;
  L.appendChild(el);
  while (L.childNodes.length > 3) L.firstChild.remove();
  setTimeout(() => el.remove(), ms);
}
export function show(id, el) {
  const app = document.getElementById('app');
  for (const c of [...app.children]) if (c.id !== id) c.remove();
  if (el && el.parentNode !== app) app.appendChild(el);
  el.classList.add('show');
  UI.screen = id;
}
