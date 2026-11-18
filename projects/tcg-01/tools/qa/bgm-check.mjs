// BGM 검사(오디오 켠 실제 경로, test 아님): 곡 전환(메뉴·팩·대전·긴장·맺음), 대전 영웅 동기 = 고른 영웅, 음악 끄기(측정 RMS), 백그라운드 일시정지
//   PLAYWRIGHT_CORE=… node projects/tcg-01/tools/qa/bgm-check.mjs <port> [out.json]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [port = '8851', outFile] = process.argv.slice(2);
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE);
const srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), port], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(700);
const b = await pw.chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const R = { steps: [] };
try {
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/games/tcg-01/index.html?tut=0`); await page.waitForFunction(() => window.__game && window.__game.ready);
  await page.mouse.click(180, 320); await sleep(1500); // 첫 탭 = 오디오 잠금 해제
  await page.evaluate(async () => { const A = (await import(new URL('js/audio.js', location.href).href)).audio; window.__au = A; const an = A.ctx.createAnalyser(); an.fftSize = 2048; A.musBus.connect(an); window.__an = an; window.__rms = () => { const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x; return 20 * Math.log10(Math.sqrt(s / d.length) + 1e-9); }; });
  const rms = async (ms = 2500) => page.evaluate(async (ms) => { let mx = -200; const t0 = performance.now(); while (performance.now() - t0 < ms) { mx = Math.max(mx, window.__rms()); await new Promise((r) => setTimeout(r, 50)); } return Math.round(mx * 10) / 10; }, ms);
  const st = async (label, extra = {}) => { const s = await page.evaluate(() => ({ screen: __game.screen, song: __au.song, songHero: __au.songHero || null, ctx: __au.ctx.state, musGain: __au.musBus.gain.value, music: __au.music })); R.steps.push({ label, ...s, ...extra }); return s; };
  await sleep(1500); await st('menu(부두)', { rms_db: await rms() });
  // 음악 끄기·켜기(설정 화면 버튼)
  await page.evaluate(() => __game.go('settings')); await sleep(400);
  await page.locator('[data-set=music]').last().click(); await sleep(800); await st('음악 끔', { rms_db: await rms() });
  await page.locator('[data-set=music]').last().click(); await sleep(800); await st('음악 켬', { rms_db: await rms() });
  // 팩 개봉
  await page.evaluate(() => { __game.state.crates.bare = Math.max(1, __game.state.crates.bare); __game.go('crates'); }); await sleep(600);
  for (let i = 0; i < 4; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
  await page.locator('[data-open=bare]').last().click(); await sleep(1800); await st('팩 개봉', { rms_db: await rms(1500) });
  // 대전: 호명자 화면에서 두 번째 영웅을 골라 시작 → 동기 영웅 = 고른 영웅
  await page.evaluate(() => __game.go('heroes')); await sleep(600);
  for (let i = 0; i < 4; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
  const chosen = await page.evaluate(() => { const b = document.querySelectorAll('[data-hero]')[2]; b.click(); return b.dataset.hero; }); await sleep(400);
  await page.locator('[data-nav=fight]').last().click(); await sleep(1500);
  for (let i = 0; i < 4; i++) { const n = await page.$('[data-coach-next]'); if (!n) break; await n.click(); await sleep(150); }
  await page.evaluate(() => __game.mulligan([])); await sleep(2000);
  const sb = await st('대전', { chosen, rms_db: await rms() });
  R.hero_sync = { chosen, songHero: sb.songHero, ok: sb.songHero === chosen, my_hero_in_engine: await page.evaluate(() => __game.export().heroes.indexOf(__game.state.lastHero) >= 0 ? __game.state.lastHero : null) };
  // 긴장: 내 체력 ≤ 10 상황을 대신해 tension(1)(대전 코드가 부르는 같은 함수)
  await page.evaluate(async () => (await import(new URL('js/audio.js', location.href).href)).tension(1)); await sleep(1200); await st('긴장(tension 1)');
  await page.evaluate(async () => (await import(new URL('js/audio.js', location.href).href)).tension(0)); await sleep(800);
  // 백그라운드
  const bg = await page.evaluate(async () => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); await new Promise((r) => setTimeout(r, 800)); const hid = __au.ctx.state; delete document.visibilityState; delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); await new Promise((r) => setTimeout(r, 300)); document.querySelector('#pauseOvl button')?.click(); await new Promise((r) => setTimeout(r, 500)); return { hidden: hid, after_resume: __au.ctx.state }; });
  R.background = bg;
  // 맺음: 판을 끝까지(사람 자리 autoplay, 빠르게)
  await page.evaluate(() => { __game.autoplay(true); __game.setAnimScale(0.15); });
  await page.waitForFunction(() => __game.battle && __game.battle.over, null, { timeout: 240000 });
  await sleep(1500); await st('맺음(판 끝)', { stingUntil_set: await page.evaluate(() => !!__au.stingUntil && __au.stingUntil > performance.now()), winner: await page.evaluate(() => __game.battle.winner) });
  R.errors = errs;
} finally { await b.close(); srv.kill(); }
if (outFile) writeFileSync(outFile, JSON.stringify(R, null, 1));
console.log(JSON.stringify(R));
