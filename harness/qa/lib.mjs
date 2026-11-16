// QA 공통 라이브러리 (게임 무관). 브라우저 기동, 콘솔·네트워크 수집, CPU 스로틀링, FPS 측정, 버튼 크기 측정, 글 지우기.
//
// playwright 찾는 순서: 환경변수 PLAYWRIGHT_CORE(경로) → 'playwright' → 'playwright-core'.
// 브라우저: QA_CHANNEL(예: msedge)이 있으면 설치된 브라우저 채널을 씀. playwright install은 하지 않는다.
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

export async function loadPlaywright() {
  const tries = [];
  if (process.env.PLAYWRIGHT_CORE) tries.push(pathToFileURL(process.env.PLAYWRIGHT_CORE.replace(/[\\/]$/, '') + '/index.mjs').href, pathToFileURL(process.env.PLAYWRIGHT_CORE).href);
  tries.push('playwright', 'playwright-core');
  for (const t of tries) {
    try { const m = await import(t); return m.chromium ? m : m.default; } catch {}
  }
  throw new Error('playwright를 찾지 못함 (PLAYWRIGHT_CORE 환경변수로 경로 지정)');
}

export async function launch({ channel = process.env.QA_CHANNEL, headless = true } = {}) {
  const pw = await loadPlaywright();
  return pw.chromium.launch({ channel: channel || undefined, headless });
}

// 정적 서버를 자식 프로세스로 띄움. 반환값의 stop()을 꼭 부를 것.
export async function startServer(cmd, args, url, { timeoutMs = 10000 } = {}) {
  const child = spawn(cmd, args, { stdio: 'ignore' });
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { const r = await fetch(url); if (r.ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  return { child, stop: () => { try { child.kill(); } catch {} } };
}

// 페이지 생성 + 수집기. log: {console:[], pageerrors:[], failed:[], external:[], requests:0}
export async function openPage(browser, url, { width, height, dsf = 1, isMobile = false, hasTouch = false, allowHosts = ['localhost', '127.0.0.1'], log } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, isMobile, hasTouch });
  const page = await ctx.newPage();
  const tag = `${width}x${height}`;
  log ??= newLog();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.console.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => log.pageerrors.push(`[${tag}] ${e.message}`));
  page.on('request', (r) => {
    log.requests++;
    const u = new URL(r.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol) && !allowHosts.includes(u.hostname)) log.external.push(r.url());
  });
  page.on('requestfailed', (r) => log.failed.push(`[${tag}] ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) log.failed.push(`[${tag}] ${r.url()} HTTP ${r.status()}`); });
  await page.goto(url);
  return { ctx, page, log };
}
export const newLog = () => ({ console: [], pageerrors: [], failed: [], external: [], requests: 0 });

export async function throttle(page, rate) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  return cdp;
}

// rAF 간격 수집 시작/종료. stop 결과: {frames, avg_fps, low1_fps, p99_ms, max_ms}
export async function fpsStart(page) {
  await page.evaluate(() => {
    window.__qaFps = { t: [], on: true };
    const f = (ts) => { if (!window.__qaFps.on) return; window.__qaFps.t.push(ts); requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}
export async function fpsStop(page) {
  const t = await page.evaluate(() => { window.__qaFps.on = false; return window.__qaFps.t; });
  return fpsSummary(t);
}
export function fpsSummary(t) {
  const d = [];
  for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
  if (!d.length) return { frames: 0 };
  const total = t[t.length - 1] - t[0];
  const sorted = [...d].sort((a, b) => b - a);
  const n1 = Math.max(1, Math.floor(d.length * 0.01));
  const worst = sorted.slice(0, n1);
  const low1 = 1000 / (worst.reduce((a, b) => a + b, 0) / worst.length);
  return {
    frames: d.length, seconds: +(total / 1000).toFixed(2), avg_fps: +((d.length / total) * 1000).toFixed(1), low1_fps: +low1.toFixed(1),
    p99_ms: +sorted[n1 - 1].toFixed(1), max_ms: +sorted[0].toFixed(1), over_33ms: d.filter((x) => x > 33.4).length,
  };
}

// 보이는 버튼·링크·입력의 크기 (CSS px = dp, deviceScaleFactor 1 기준)
export async function measureTargets(page, selector = 'button, a, input, [role=button]') {
  return page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && e.offsetParent !== null;
  }).map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || null, tag: e.tagName.toLowerCase(), cls: e.className?.baseVal ?? e.className, text: (e.textContent || '').trim().slice(0, 30), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; }), selector);
}

// 글 없이 진행 가능한지 보기 위해 텍스트 노드를 비움 (아이콘·도형은 남김). 되돌리기 없음 → 스크린샷 전용 컨텍스트에서 사용
export async function blankText(page) {
  await page.addStyleTag({ content: '.qa-blank{color:transparent!important;text-shadow:none!important}' });
  await page.evaluate(() => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) if (n.nodeValue.trim() && !/^[←-⇿⌀-⏿■-◿☀-➿×↻⌂←]+$/.test(n.nodeValue.trim())) n.nodeValue = '';
    // 이후 다시 써지는 글(HUD 등)도 지움
    const wipe = (root) => {
      if (root.nodeType === 3) { if (root.nodeValue.trim()) root.nodeValue = ''; return; }
      const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const list = []; while (tw.nextNode()) list.push(tw.currentNode);
      for (const n of list) if (n.nodeValue.trim()) n.nodeValue = '';
    };
    new MutationObserver((ms) => { for (const m of ms) { for (const a of m.addedNodes) wipe(a); if (m.type === 'characterData') wipe(m.target); } }).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
}
