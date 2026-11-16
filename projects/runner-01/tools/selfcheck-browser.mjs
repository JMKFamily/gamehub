#!/usr/bin/env node
// 브라우저 자체 확인 (Playwright). 콘솔 에러, 외부 요청, 360x640·640x360·1280x720 스크린샷, ?test=1 입력열 재생으로 세 레벨 클리어.
//
//   node projects/runner-01/tools/serve.mjs &            # 정적 서버
//   PLAYWRIGHT_CORE=<playwright-core 경로> node projects/runner-01/tools/selfcheck-browser.mjs [--channel msedge]
//
// playwright 또는 playwright-core 가 import 가능해야 한다. 브라우저 다운로드가 막혀 있으면 --channel msedge|chrome 로 설치된 브라우저를 쓴다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'projects/runner-01/reviews/dev-selfcheck');
const args = process.argv.slice(2);
const channel = args.includes('--channel') ? args[args.indexOf('--channel') + 1] : undefined;
const BASE = process.env.BASE_URL || 'http://localhost:8123/games/reverbound/';

let pw;
try { pw = await import(process.env.PLAYWRIGHT_CORE ? pathToFileURL(process.env.PLAYWRIGHT_CORE).href : 'playwright'); }
catch { pw = await import('playwright-core'); }
const chromium = pw.chromium ?? pw.default.chromium;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel, headless: true });
const report = { base: BASE, channel: channel ?? 'bundled', runs: [], console_errors: [], external_requests: [], shots: [] };

async function page(vw, vh, query = '?test=1') {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') report.console_errors.push(`[${vw}x${vh}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => report.console_errors.push(`[${vw}x${vh}] pageerror: ${e.message}`));
  p.on('request', (r) => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol !== 'data:') report.external_requests.push(r.url()); });
  await p.goto(BASE + query);
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 15000 });
  return { ctx, p };
}
const shot = async (p, name) => { const f = join(OUT, name); await p.screenshot({ path: f }); report.shots.push(name); };

// 1) 입력열 재생으로 세 레벨 클리어 (검증기 탭 / 박자대로 친 탭, 60·144 Hz 프레임)
{
  const { ctx, p } = await page(1280, 720);
  for (const i of [0, 1, 2]) {
    for (const [set, holdTicks, frameDt] of [['taps', 1, 1 / 60], ['on_beat_taps', 19, 1 / 144]]) {
      const r = await p.evaluate(([i, set, holdTicks, frameDt]) => {
        const g = window.__game;
        const taps = g.testInputs.levels[['01', '02', '03'][i]][set];
        return g.replay(i, taps, { holdTicks, frameDt });
      }, [i, set, holdTicks, frameDt]);
      report.runs.push({ level: i + 1, set, holdTicks, frame_hz: Math.round(1 / frameDt), ...r });
      console.log(`level ${i + 1} ${set} hold=${holdTicks} ${Math.round(1 / frameDt)}Hz → ${r.state} ${r.progress.toFixed(1)}%`);
    }
  }
  // 클리어 연출 + 클리어 화면
  await p.evaluate(() => { const g = window.__game; g.replay(2); g.step(0.5); });
  await shot(p, '1280x720-level3-clear-fx.png');
  await p.evaluate(() => window.__game.step(1));
  await shot(p, '1280x720-clear-screen.png');
  await ctx.close();
}

// 2) 화면별 스크린샷
for (const [vw, vh] of [[1280, 720], [640, 360], [360, 640]]) {
  const { ctx, p } = await page(vw, vh);
  const tag = `${vw}x${vh}`;
  await p.evaluate(() => window.__game.show('title'));
  await p.waitForTimeout(100);
  await shot(p, `${tag}-title.png`);
  await p.evaluate(() => window.__game.show('levels'));
  await p.waitForTimeout(100);
  await shot(p, `${tag}-levels.png`);
  for (const i of [0, 1, 2]) {
    // 레벨별 플레이 장면: 입력열대로 일정 시간 진행
    const at = [6.2, 26.5, 25.6][i];
    await p.evaluate(([i, at]) => {
      const g = window.__game;
      const taps = g.testInputs.levels[['01', '02', '03'][i]].taps;
      g.loadLevel(i);
      const hz = 240;
      let k = 0;
      const tapSet = new Set(taps);
      while (g.tick < at * hz && g.state === 'playing') {
        if (tapSet.has(g.tick)) { g.press(); g.step(1 / hz); g.release(); } else g.step(1 / hz);
        if (++k > 100000) break;
      }
    }, [i, at]);
    await p.waitForTimeout(60);
    await shot(p, `${tag}-level${i + 1}-play.png`);
  }
  // 사망 연출 (무입력으로 첫 장애물)
  await p.evaluate(() => { const g = window.__game; g.loadLevel(0); for (let j = 0; j < 2000 && g.state === 'playing'; j++) g.step(1 / 240); g.step(0.15); });
  await shot(p, `${tag}-death.png`);
  // 일시정지, 설정
  await p.evaluate(() => { const g = window.__game; g.step(1); g.pause(); });
  await shot(p, `${tag}-pause.png`);
  await p.evaluate(() => window.__game.show('settings'));
  await shot(p, `${tag}-settings.png`);
  // HUD 잘림 검사: HUD 요소가 뷰포트 안에 있는가
  const hud = await p.evaluate(() => {
    const g = window.__game; g.loadLevel(2, { practice: true }); g.step(0.5);
    const ids = ['att', 'bar', 'pct', 'pauseBtn', 'cpPlace', 'cpRemove'];
    return ids.map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { id, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; });
  });
  const bad = hud.filter((h) => h.l < 0 || h.t < 0 || h.r > vw + 0.5 || h.b > vh + 0.5);
  const small = hud.filter((h) => ['pauseBtn', 'cpPlace', 'cpRemove'].includes(h.id) && (h.w < 48 || h.h < 48));
  const overlap = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const ov = [];
  for (let a = 0; a < hud.length; a++) for (let b = a + 1; b < hud.length; b++) if (!(['bar', 'pct'].includes(hud[a].id) && ['bar', 'pct'].includes(hud[b].id)) && overlap(hud[a], hud[b])) ov.push(`${hud[a].id}/${hud[b].id}`);
  report[`hud_${tag}`] = { outside: bad.map((h) => h.id), under48: small.map((h) => h.id), overlaps: ov };
  console.log(`HUD ${tag}: 밖 ${bad.length}, 48px 미만 ${small.length}, 겹침 ${ov.join(',') || 0}`);
  await shot(p, `${tag}-practice-hud.png`);
  await ctx.close();
}

// 3) 일반 모드(오디오 포함) 기동만: 콘솔 에러 확인
{
  const { ctx, p } = await page(1280, 720, '');
  await p.mouse.click(640, 360);
  await p.waitForTimeout(300);
  await shot(p, '1280x720-title-normal.png');
  await p.click('#btnPlay');
  await p.waitForTimeout(1500);
  await p.mouse.click(640, 400);
  await p.waitForTimeout(800);
  await shot(p, '1280x720-normal-play.png');
  // 실시간 입력: 탭 후 0.1 s 안에 떠올랐는가 (사망 중이면 재시작 대기)
  await p.waitForFunction(() => window.__game.state === 'playing' && window.__game.player.grounded, null, { timeout: 5000 });
  await p.mouse.down({ button: 'left' }); await p.waitForTimeout(100); 
  report.normal_jump_y_after_100ms = await p.evaluate(() => window.__game.player.y);
  await p.mouse.up();
  report.normal_audio = await p.evaluate(() => window.__game.audio);
  report.normal_mode = await p.evaluate(() => ({ state: window.__game.state, progress: window.__game.progress, attempts: window.__game.attempts }));
  await ctx.close();
}

await browser.close();
report.pass = report.console_errors.length === 0 && report.external_requests.length === 0 && report.runs.every((r) => r.state === 'clear');
writeFileSync(join(OUT, 'selfcheck.json'), JSON.stringify(report, null, 2));
console.log(`콘솔 에러/경고 ${report.console_errors.length}, 외부 요청 ${report.external_requests.length}, 스크린샷 ${report.shots.length}`);
for (const e of report.console_errors.slice(0, 20)) console.log('  ' + e);
console.log(report.pass ? '결과: PASS' : '결과: FAIL');
process.exitCode = report.pass ? 0 : 1;
