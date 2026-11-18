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
  for (const o of document.querySelectorAll('body > .ovl, body > .coach, body > .coachSpot, body > .coachRing, body > .coachDim')) o.remove();
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
      // 어두운 사각형 4장(큰 그림자 대신)
      const pad2 = 8, x0 = r.left - pad2, y0 = r.top - pad2, x1 = r.right + pad2, y1 = r.bottom + pad2, W = innerWidth, H = innerHeight;
      for (const [x, y, w, hh] of [[0, 0, W, y0], [0, y1, W, H - y1], [0, y0, x0, y1 - y0], [x1, y0, W - x1, y1 - y0]]) { const d = document.createElement('div'); d.className = 'coachDim'; Object.assign(d.style, { left: x + 'px', top: y + 'px', width: Math.max(0, w) + 'px', height: Math.max(0, hh) + 'px' }); document.body.appendChild(d); els.push(d); }
      box('coachRing');
    }
    const p = document.createElement('div'); p.className = 'coach'; p.setAttribute('role', 'note'); p.dataset.coach = st.key;
    // 가운데 띠(art ux2.tutorial_band 0.35~0.65): 대상이 위쪽이면 띠 아래쪽, 아래쪽이면 띠 위쪽에 두고 대상과 겹치지 않게
    p.style.visibility = 'hidden';
    const tx = document.createElement('div'); tx.className = 'txt'; tx.textContent = t(st.key);
    const nx = document.createElement('button'); nx.className = 'btn primary'; nx.type = 'button'; nx.textContent = t('tut_next'); nx.dataset.coachNext = '1';
    const sk = document.createElement('button'); sk.className = 'btn'; sk.type = 'button'; sk.textContent = t('tut_skip'); sk.dataset.coachSkip = '1';
    nx.onclick = () => { i++; showOne(); };
    sk.onclick = () => { clear(); i = steps.length; onSkip && onSkip(); };
    if (st.pic) p.append(st.pic);
    p.append(tx, nx, sk); document.body.appendChild(p); els.push(p);
    { const H = innerHeight, ph = p.offsetHeight, b0 = 0.35 * H, b1 = 0.65 * H; let top;
      if (!r) top = (H - ph) / 2;
      else if (r.top + r.height / 2 < H / 2) top = Math.max(b0, r.bottom + 12, b1 - ph); else top = Math.min(b1 - ph, r.top - 12 - ph);
      top = Math.max(b0 - ph / 2, Math.min(top, b1 - ph / 2));
      if (r && top < r.bottom && top + ph > r.top) top = r.top + r.height / 2 < H / 2 ? r.bottom + 8 : r.top - 8 - ph; // 겹치면 띠를 벗어나도 대상 밖
      p.style.top = Math.max(8, Math.min(H - ph - 8, top)) + 'px'; p.style.visibility = ''; }
  };
  showOne();
  return { close: clear };
}
