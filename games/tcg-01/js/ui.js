// 공용 UI: 토스트·화면 전환·스크롤 표시
export const UI = { screen: 'loading', screens: {} };
export function toast(text, ms = 1300, pos) {
  const L = document.getElementById('toastLayer');
  if (!L) return;
  // 대전은 가운데 띠 위(30-art 4-3), 메뉴는 화면 아래(카드 글을 가리지 않게, round-2 D20)
  L.classList.toggle('menu', UI.screen !== 'battle' && pos !== 'top'); L.classList.toggle('top', pos === 'top');
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
  for (const o of document.querySelectorAll('body > .ovl, body > .coach, body > .coachSpot, body > .coachRing')) o.remove();
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
// 메뉴 첫 진입 안내·대전 밖 튜토리얼 단계(10-lore 8-7·8-12): 한 번에 하나, 대상 스포트라이트 + 고리, 다음·건너뛰기
// steps: [{ key, el }], t: 글 함수. onSkip: 건너뛰기, onEach(key): 본 단계 저장
export function coach(steps, t, { onSkip, onEach } = {}) {
  let i = 0;
  const els = [];
  const clear = () => { for (const e of els.splice(0)) e.remove(); };
  const showOne = () => {
    clear();
    if (i >= steps.length) return;
    const st = steps[i];
    onEach && onEach(st.key);
    const r = st.el && st.el.isConnected ? st.el.getBoundingClientRect() : null;
    if (r) {
      const pad = 8, box = (cls) => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' }); document.body.appendChild(d); els.push(d); };
      box('coachSpot'); box('coachRing');
    }
    const p = document.createElement('div'); p.className = 'coach'; p.setAttribute('role', 'note'); p.dataset.coach = st.key;
    const low = r && r.top + r.height / 2 > innerHeight / 2;
    p.style[low ? 'top' : 'bottom'] = '8px';
    const tx = document.createElement('div'); tx.className = 'txt'; tx.textContent = t(st.key);
    const nx = document.createElement('button'); nx.className = 'btn primary'; nx.type = 'button'; nx.textContent = t('tut_next'); nx.dataset.coachNext = '1';
    const sk = document.createElement('button'); sk.className = 'btn'; sk.type = 'button'; sk.textContent = t('tut_skip'); sk.dataset.coachSkip = '1';
    nx.onclick = () => { i++; showOne(); };
    sk.onclick = () => { clear(); i = steps.length; onSkip && onSkip(); };
    p.append(tx, nx, sk); document.body.appendChild(p); els.push(p);
  };
  showOne();
  return { close: clear };
}
