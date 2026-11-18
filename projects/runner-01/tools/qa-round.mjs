#!/usr/bin/env node
// Reverbound QA 라운드 검사 (qa-engineer). harness/qa/lib.mjs 사용.
//
//   PLAYWRIGHT_CORE=<playwright-core 경로> QA_CHANNEL=msedge node projects/runner-01/tools/qa-round.mjs --round 2 [--part basic,shots,replay,bots,realtime,perf,features,age,balance]
//
// 레벨 수는 하드코딩하지 않는다: 빌드의 window.__game.levelCount·levelData(i).id로 읽고, games/reverbound/data/balance.json의 levels 목록과 대조한다.
// 옵션
//   --quick                     짧게 돌려 오류 없이 도는지만 확인 (표본·실시간 길이 축소, 결과 폴더 round-N-quick, 판정에 쓰지 않음)
//   --levels 01,07              브라우저 파트를 일부 레벨만 (기본: 전부)
//   --langs ko,en               화면 스크린샷·버튼 측정 언어 (기본 ko,en; ?lang= 로 고정)
//   --n 200                     브라우저 봇 레벨별 시도 수 (quick 20)
//   --bal-n 20000               balance 파트: σ70 클리어율 표본 (레벨별 시도 수, quick 300)
//   --bal-sessions 1000         balance 파트: σ70 첫 클리어 세션 수 (bots.mjs 5번째 인자, quick 20)
//   --bal-skilled-n 100000      balance 파트: σ25 몰림 표본 (balance 보고 기준 100000, quick 300)
//   --jobs <n>                  balance 파트 동시 실행 프로세스 수 (기본 CPU 수 − 1)
//   --out-dir <경로>            결과 폴더 직접 지정
//
// 정적 서버(serve.mjs)는 이 스크립트가 직접 띄우고 끝나면 종료한다 (포트 QA_PORT, 기본 8124). balance 파트만 돌리면 서버·브라우저를 띄우지 않는다.
// 결과: projects/runner-01/reviews/round-N/{shots/, parts/<part>.json}. merge는 --merge 로 metrics.json 생성.
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const lib = await import(pathToFileURL(join(ROOT, 'harness/qa/lib.mjs')).href);
const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const QUICK = args.includes('--quick');
const ROUND = arg('--round', '1');
const OUT = arg('--out-dir', null) ? resolve(arg('--out-dir')) : join(ROOT, `projects/runner-01/reviews/round-${ROUND}${QUICK ? '-quick' : ''}`);
const SHOTS = join(OUT, 'shots');
const PARTS = join(OUT, 'parts');
mkdirSync(SHOTS, { recursive: true }); mkdirSync(PARTS, { recursive: true });
const PORT = +(process.env.QA_PORT || 8124);
const BASE = `http://localhost:${PORT}/games/reverbound/`;
const ALL = ['basic', 'shots', 'replay', 'bots', 'realtime', 'perf', 'features', 'age', 'balance'];
const parts = (arg('--part', ALL.join(','))).split(',');
const LANGS = arg('--langs', 'ko,en').split(',');

if (args.includes('--merge')) { merge(); process.exit(0); }

const NEED_BROWSER = parts.some((p) => p !== 'balance');
const server = NEED_BROWSER ? await lib.startServer(process.execPath, [join(ROOT, 'projects/runner-01/tools/serve.mjs'), String(PORT)], BASE) : { stop() {} };
const browser = NEED_BROWSER ? await lib.launch() : null;
const log = lib.newLog();
const VIEWS = [[360, 640], [412, 915], [640, 360], [1280, 720]];
const save = (name, obj) => writeFileSync(join(PARTS, name + '.json'), JSON.stringify(obj, null, 2));
const shot = async (p, name) => { await p.screenshot({ path: join(SHOTS, name) }); return name; };
async function open(vw, vh, q = '?test=1&lang=ko', o = {}) {
  const r = await lib.openPage(browser, BASE + q, { width: vw, height: vh, log, ...o });
  await r.page.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
  return r;
}

// 레벨 목록: 빌드 훅(levelCount·levelData)이 기준, 빌드 데이터 balance.json의 levels와 대조
const DATA_BAL = JSON.parse(readFileSync(join(ROOT, 'games/reverbound/data/balance.json'), 'utf8'));
const DATA_IDS = DATA_BAL.levels.map((f) => (typeof f === 'string' ? f : f.file).match(/levels\/(\d+)-/)[1]);
let LEVELS = DATA_IDS.map((id, i) => ({ i, id, length_tiles: null, objects: null, bpm: null }));
if (NEED_BROWSER) {
  const { ctx, page } = await open(1280, 720);
  LEVELS = await page.evaluate(() => {
    const g = window.__game;
    return Array.from({ length: g.levelCount }, (_, i) => { const d = g.levelData(i); return { i, id: d.id, length_tiles: d.length_tiles, objects: d.objects.length, bpm: d.bpm, has_test_inputs: !!g.testInputs?.levels?.[d.id]?.taps }; });
  });
  await ctx.close();
}
const ONLY = arg('--levels', null)?.split(',');
const LV = LEVELS.filter((l) => !ONLY || ONLY.includes(l.id));
const IDX = LV.map((l) => l.i);
const levelsInfo = { from_hook: LEVELS, data_balance_ids: DATA_IDS, count_match: LEVELS.length === DATA_IDS.length && LEVELS.every((l, k) => l.id === DATA_IDS[k]), selected: LV.map((l) => l.id), quick: QUICK };
save('levels', levelsInfo);
console.log('levels', LEVELS.length, 'selected', LV.map((l) => l.id).join(','), 'data_match', levelsInfo.count_match, QUICK ? '(quick)' : '');
if (!levelsInfo.count_match) console.log('  경고: 빌드 훅 레벨 목록과 games/reverbound/data/balance.json levels가 다름');

try {
  // ------------------------------------------------------------ 1. 기본
  if (parts.includes('basic')) {
    const res = {};
    for (const q of ['?test=1', '', '?lang=en']) {
      const before = { c: log.console.length, e: log.pageerrors.length, f: log.failed.length, x: log.external.length };
      const { ctx, page } = await open(1280, 720, q);
      await page.waitForTimeout(1500);
      // 일반 모드는 첫 탭·메뉴·레벨 시작까지 해 본다 (오디오 포함)
      if (q !== '?test=1') {
        await page.mouse.click(640, 360); await page.waitForTimeout(300);
        await page.click('#btnPlay'); await page.waitForTimeout(3000);
      }
      res[q || '(normal)'] = { console: log.console.length - before.c, pageerrors: log.pageerrors.length - before.e, failed: log.failed.length - before.f, external: log.external.length - before.x };
      await ctx.close();
    }
    // 언어 자동 선택 (?lang 없음): 브라우저 locale ko-KR → ko, en-US → en 이어야 함 (10-lore, round-1 S32)
    res.lang_auto = {};
    for (const locale of ['ko-KR', 'en-US']) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => log.pageerrors.push(`[lang ${locale}] ${e.message}`));
      await page.goto(BASE + '?test=1');
      await page.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
      res.lang_auto[locale] = await page.evaluate(() => ({ lang: window.__game.lang, html_lang: document.documentElement.lang }));
      await ctx.close();
    }
    res.lang_auto.pass = res.lang_auto['ko-KR'].lang === 'ko' && res.lang_auto['en-US'].lang === 'en';
    res.log = { ...log };
    save('basic', res);
    console.log('basic', JSON.stringify(res));
  }

  // ------------------------------------------------------------ 2. 화면별 스크린샷 (타이틀·플레이·사망·클리어 + 레벨 선택·일시정지·설정)
  if (parts.includes('shots')) {
    // 언어마다(기본 ko,en) 같은 화면 세트를 찍는다. 파일 이름 앞에 언어: ko-360x640-..., en-360x640-...
    // 레벨별 플레이 장면은 seek(i, x)로 레벨 길이의 35 % 지점까지 완벽 입력열로 진행해 찍는다.
    const res = { langs: LANGS, shots: [], overflow: {}, outside: {}, lang_seen: {} };
    for (const lang of LANGS) for (const [vw, vh] of VIEWS) {
      const tag = `${lang}-${vw}x${vh}`;
      // 일반 모드 타이틀 (첫 탭 전, 세로면 회전 안내)
      {
        const { ctx, page } = await open(vw, vh, `?lang=${lang}`);
        await page.waitForTimeout(400);
        res.shots.push(await shot(page, `${tag}-title-normal-first.png`));
        await page.mouse.click(Math.round(vw / 2), Math.round(vh / 2)); await page.waitForTimeout(300);
        res.shots.push(await shot(page, `${tag}-title-normal-menu.png`));
        await ctx.close();
      }
      const { ctx, page } = await open(vw, vh, `?test=1&lang=${lang}`);
      res.lang_seen[tag] = await page.evaluate(() => window.__game.lang);
      await page.evaluate(() => window.__game.show('title')); await page.waitForTimeout(150);
      res.shots.push(await shot(page, `${tag}-01-title.png`));
      await page.evaluate(() => window.__game.show('levels')); await page.waitForTimeout(150);
      res.shots.push(await shot(page, `${tag}-02-levels.png`));
      for (const l of LV) {
        await page.evaluate(([i, x]) => window.__game.seek(i, x), [l.i, l.length_tiles * 0.35]); await page.waitForTimeout(80);
        res.shots.push(await shot(page, `${tag}-03-play-level${l.id}.png`));
      }
      // HUD·텍스트 잘림 (플레이 중)
      res.outside[tag] = await page.evaluate(([vw, vh]) => [...document.querySelectorAll('#hud *, #cue, #toast')].filter((e) => e.offsetParent).map((e) => ({ id: e.id || e.className, r: e.getBoundingClientRect() }))
        .filter(({ r }) => r.width && (r.left < -0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.bottom > vh + 0.5)).map((o) => o.id), [vw, vh]);
      await page.evaluate(() => { const g = window.__game; g.loadLevel(0); for (let j = 0; j < 3000 && g.state === 'playing'; j++) g.step(1 / 240); g.step(0.2); });
      res.shots.push(await shot(page, `${tag}-04-death.png`));
      await page.evaluate(() => { const g = window.__game; g.replay(0); g.step(0.4); });
      res.shots.push(await shot(page, `${tag}-05-clear-fx.png`));
      await page.evaluate(() => window.__game.step(1));
      res.shots.push(await shot(page, `${tag}-06-clear-screen.png`));
      await page.evaluate((last) => { const g = window.__game; g.replay(last); g.step(1.3); }, LEVELS.length - 1); await page.waitForTimeout(80);
      res.shots.push(await shot(page, `${tag}-06b-clear-screen-last-level.png`));
      await page.evaluate(() => { const g = window.__game; g.loadLevel(2); g.step(2); g.pause(); }); await page.waitForTimeout(80);
      res.shots.push(await shot(page, `${tag}-07-pause.png`));
      await page.evaluate(() => window.__game.show('settings')); await page.waitForTimeout(80);
      res.shots.push(await shot(page, `${tag}-08-settings.png`));
      // 화면마다 글 넘침 검사 (scrollWidth > clientWidth 또는 뷰포트 밖)
      const ov = {};
      for (const scr of ['title', 'levels', 'settings', 'pause', 'clearS']) {
        await page.evaluate((s) => { const g = window.__game; if (s === 'pause') { g.loadLevel(0); g.step(1); g.pause(); } else if (s === 'clearS') { g.replay(0); g.step(1.3); } else g.show(s); }, scr);
        await page.waitForTimeout(60);
        ov[scr] = await page.evaluate(([vw, vh]) => [...document.querySelectorAll('.screen.show *')].filter((e) => e.offsetParent && e.children.length === 0 && e.textContent.trim()).filter((e) => {
          const r = e.getBoundingClientRect();
          return e.scrollWidth > e.clientWidth + 1 || r.left < -0.5 || r.right > vw + 0.5 || r.top < -0.5 || r.bottom > vh + 0.5;
        }).map((e) => `${e.id || e.tagName}:${e.textContent.trim().slice(0, 20)}`), [vw, vh]);
      }
      res.overflow[tag] = ov;
      await ctx.close();
    }
    save('shots', res);
    console.log('shots', res.shots.length, JSON.stringify({ overflow: res.overflow, outside: res.outside }));
  }

  // ------------------------------------------------------------ 3a. 완벽 입력열 재생 (빌드 = 시뮬레이터 확인)
  if (parts.includes('replay')) {
    const { ctx, page } = await open(1280, 720);
    const frameSet = QUICK ? [['60Hz', 1 / 60], ['10Hz(상한 24틱)', 1 / 10]] : null;
    const runs = await page.evaluate(([IDX, frameSet]) => {
      const g = window.__game, out = [], id = (i) => g.levelData(i).id;
      const frames = frameSet || [['60Hz', 1 / 60], ['144Hz', 1 / 144], ['30Hz', 1 / 30], ['20Hz', 1 / 20], ['10Hz(상한 24틱)', 1 / 10]];
      for (const i of IDX) for (const set of ['taps', 'on_beat_taps']) for (const hold of [1, 24]) for (const [fn, fd] of frames) {
        const taps = g.testInputs.levels[id(i)][set];
        if (!taps) { out.push({ level: id(i), set, state: 'missing_inputs' }); continue; }
        const r = g.replay(i, taps, { holdTicks: hold, frameDt: fd });
        out.push({ level: id(i), set, hold_ticks: hold, frame: fn, state: r.state, progress: +r.progress.toFixed(2), death: r.death });
      }
      // 음성 대조: 무입력·홀드만은 클리어되면 안 됨
      for (const i of IDX) {
        const r0 = g.replay(i, []); out.push({ level: id(i), set: 'none', state: r0.state, progress: +r0.progress.toFixed(2) });
        const rh = g.replay(i, [0], { holdTicks: 1e9 }); out.push({ level: id(i), set: 'hold_all', state: rh.state, progress: +rh.progress.toFixed(2) });
      }
      return out;
    }, [IDX, frameSet]);
    // 경계 감도: 가장 빡빡한 탭을 ±k틱 밀었을 때 (검증기 창과 비교)
    const sens = await page.evaluate((IDX) => {
      const g = window.__game, res = {};
      for (const i of IDX) {
        const id = g.levelData(i).id, taps = g.testInputs.levels[id].taps;
        let lo = 0, hi = 0;
        // 전체 탭을 같이 밀었을 때 몇 틱까지 클리어되는지 (빌드 기준 전역 오프셋 허용치)
        for (let d = 1; d < 80; d++) { if (g.replay(i, taps.map((k) => k - d)).state !== 'clear') break; lo = d; }
        for (let d = 1; d < 80; d++) { if (g.replay(i, taps.map((k) => k + d)).state !== 'clear') break; hi = d; }
        res[id] = { global_shift_ok_ms: [-(lo / 240) * 1000, (hi / 240) * 1000].map((v) => +v.toFixed(1)) };
      }
      return res;
    }, IDX);
    save('replay', { levels: LV.map((l) => l.id), quick: QUICK, runs, sensitivity: sens });
    const bad = runs.filter((r) => ['taps', 'on_beat_taps'].includes(r.set) ? r.state !== 'clear' : r.state === 'clear');
    console.log('replay', runs.length, 'bad', bad.length, JSON.stringify(sens));
    await ctx.close();
  }

  // ------------------------------------------------------------ 3b. 봇 (초보 = 완벽 입력열 + 사람 타이밍 오차, 랜덤 = 무작위 탭)
  if (parts.includes('bots')) {
    const { ctx, page } = await open(1280, 720);
    const N = +(arg('--n', QUICK ? '20' : '200')), SESS1 = QUICK ? 10 : 60;
    const res = await page.evaluate(([N, IDX, SESS1]) => {
      const g = window.__game;
      let seed = 12345;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
      const id = (i) => g.levelData(i).id;
      const profiles = {
        'skilled_sd25': { sd: 25, miss: 0.0, extra: 0.0 },
        'novice_sd50': { sd: 50, miss: 0.01, extra: 0.01 },
        'child_sd70': { sd: 70, miss: 0.03, extra: 0.02 },   // 5~6세 대리 모델 (가정: 탭 타이밍 표준편차 70 ms, 탭 놓침 3%, 엉뚱한 탭 2%/탭)
        'child_sd90': { sd: 90, miss: 0.05, extra: 0.03 },
      };
      const out = {};
      const attempt = (i, p) => {
        const base = g.testInputs.levels[id(i)].taps;
        const taps = [];
        for (const k of base) {
          if (rnd() < p.miss) continue;
          taps.push(Math.max(0, Math.round(k + (gauss() * p.sd / 1000) * 240)));
          if (rnd() < p.extra) taps.push(Math.round(k + (0.15 + rnd() * 0.3) * 240));
        }
        taps.sort((a, b) => a - b);
        const r = g.replay(i, taps, { holdTicks: 24, frameDt: 1 / 60 });
        return r;
      };
      for (const [pn, p] of Object.entries(profiles)) {
        out[pn] = {};
        for (const i of IDX) {
          const prog = [], deathsX = [];
          let clears = 0;
          for (let n = 0; n < N; n++) {
            const r = attempt(i, p);
            prog.push(r.progress);
            if (r.state === 'clear') clears++; else deathsX.push(+r.death.x.toFixed(1));
          }
          prog.sort((a, b) => a - b);
          const bins = Array(20).fill(0);
          for (const v of prog) if (v < 100) bins[Math.min(19, Math.floor(v / 5))]++;
          const hot = {};
          for (const x of deathsX) { const k = Math.round(x); hot[k] = (hot[k] || 0) + 1; }
          const top = Object.entries(hot).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([x, c]) => ({ x: +x, share: +(c / Math.max(1, deathsX.length)).toFixed(3) }));
          out[pn][id(i)] = {
            n: N, clear_rate: +(clears / N).toFixed(3), mean_progress: +(prog.reduce((a, b) => a + b, 0) / N).toFixed(1),
            median_progress: +prog[Math.floor(N / 2)].toFixed(1), death_hist_5pct: bins, top_death_x: top,
            expected_attempts_to_clear: clears ? +(N / clears).toFixed(1) : null,
          };
        }
      }
      // 레벨 1 첫 클리어까지 시도 횟수 (세션 시뮬레이션, 상한 200)
      const sessions = {};
      for (const pn of ['novice_sd50', 'child_sd70', 'child_sd90']) {
        const a = [];
        for (let s = 0; s < SESS1; s++) { let n = 1; while (n <= 200 && attempt(0, profiles[pn]).state !== 'clear') n++; a.push(n); }
        a.sort((x, y) => x - y);
        const q = (f) => a[Math.floor(SESS1 * f)];
        sessions[pn] = { sessions: SESS1, median: q(0.5), p25: q(0.25), p75: q(0.75), p90: q(0.9), over_200: a.filter((v) => v > 200).length };
      }
      // 랜덤 봇: 평균 0.5 s 간격 포아송 탭, 100 ms 누름
      const random = {};
      for (const i of IDX) {
        const prog = [];
        for (let n = 0; n < N; n++) {
          const taps = []; let t = 0;
          while (t < 120) { t += -Math.log(1 - rnd()) * 0.5; taps.push(Math.round(t * 240)); }
          prog.push(g.replay(i, taps, { holdTicks: 24 }).progress);
        }
        prog.sort((a, b) => a - b);
        random[id(i)] = { n: N, mean_progress: +(prog.reduce((a, b) => a + b, 0) / N).toFixed(1), median_progress: +prog[Math.floor(N / 2)].toFixed(1), max_progress: +prog[N - 1].toFixed(1) };
      }
      return { n: N, quick: SESS1 < 60, profiles, by_profile: out, level1_attempts_to_first_clear: sessions, random_bot: random };
    }, [N, IDX, SESS1]);
    save('bots', res);
    console.log('bots', JSON.stringify(Object.fromEntries(Object.entries(res.by_profile).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([l, s]) => [l, [s.clear_rate, s.mean_progress]]))]))), JSON.stringify(res.level1_attempts_to_first_clear));
    await ctx.close();
  }

  // ------------------------------------------------------------ 3c / 4. 실시간 (일반 모드, rAF 루프 + 키 이벤트 경로)
  // 페이지 안 스케줄러: 검증기 탭 틱 → 예상 perf 시각에 keydown/keyup(80 ms) 발생. rAF마다 (ts, tick)로 시계 추정.
  const RT_PLAY = async (page, i, { maxS = 90 } = {}) => page.evaluate(([i, maxS]) => new Promise((done) => {
    const g = window.__game, hz = 240;
    const taps = g.testInputs?.levels?.[g.levelData(i).id]?.taps || window.__qaTaps[i];
    g.loadLevel(i);
    const att0 = g.attempts;
    const est = [];
    let ti = 0, sent = [], t0 = performance.now(), result = null, lastTick = -1;
    const fire = (type) => window.dispatchEvent(new KeyboardEvent(type, { code: 'Space', key: ' ', bubbles: true }));
    const onFrame = (ts) => {
      if (result) return;
      const k = g.tick;
      if (k > 0 && g.state === 'playing' && k !== lastTick) { est.push(ts / 1000 - (k + 0.5) / hz); if (est.length > 40) est.shift(); }
      lastTick = k;
      if (g.state === 'clear' || g.state === 'dead' || g.attempts !== att0 || performance.now() - t0 > maxS * 1000) {
        result = { state: g.state === 'playing' && g.attempts !== att0 ? 'dead(restarted)' : g.state, progress: g.progress, taps_sent: sent.length, taps_total: taps.length,
          send_err_ms: sent.length ? { mean: +(sent.reduce((a, b) => a + b, 0) / sent.length).toFixed(2), max: +Math.max(...sent.map(Math.abs)).toFixed(2) } : null };
        done(result); return;
      }
      requestAnimationFrame(onFrame);
    };
    requestAnimationFrame(onFrame);
    const sched = () => {
      if (result) return;
      if (est.length >= 3 || (g.tick === 0)) {
        const off = est.length ? [...est].sort((a, b) => a - b)[est.length >> 1] : null;
        if (off != null) {
          while (ti < taps.length) {
            const target = ((taps[ti] + 0.5) / hz + off) * 1000;
            const now = performance.now();
            if (now >= target - 0.5) { fire('keydown'); sent.push(now - target); setTimeout(() => fire('keyup'), 80); ti++; } else break;
          }
        }
      }
      setTimeout(sched, 1);
    };
    sched();
  }), [i, maxS]);

  async function normalPage(vw, vh, o = {}) {
    const r = await open(vw, vh, '?lang=ko', o);
    const taps = JSON.parse(readFileSync(join(ROOT, 'games/reverbound/data/test-inputs.json'), 'utf8'));
    await r.page.evaluate((t) => { window.__qaTaps = Array.from({ length: window.__game.levelCount }, (_, i) => t.levels[window.__game.levelData(i).id]?.taps); }, taps);
    await r.page.keyboard.press('Space'); await r.page.waitForTimeout(400); // 첫 탭 → 메뉴 (오디오 켜짐)
    return r;
  }

  if (parts.includes('realtime')) {
    const res = { runs: [] };
    const { ctx, page } = await normalPage(1280, 720);
    res.audio = await page.evaluate(() => window.__game.audio);
    // quick: 레벨마다 6 s만 (오류 없이 도는지만), 전체: 끝까지 (상한 120 s)
    res.quick = QUICK;
    for (const l of LV) {
      const r = await RT_PLAY(page, l.i, { maxS: QUICK ? 6 : 120 });
      res.runs.push({ level: l.id, throttle: 1, ...r });
      console.log('realtime', l.id, JSON.stringify(r));
    }
    await ctx.close();
    save('realtime', res);
  }

  if (parts.includes('perf')) {
    // 오브젝트가 가장 많은 레벨을 빌드 데이터에서 골라 30 s 측정 (round-1은 레벨 3, round-2 10레벨에서는 레벨 7 = 235개)
    const heavy = [...LEVELS].sort((a, b) => b.objects - a.objects)[0];
    const T1 = QUICK ? 8 : 90, TH = QUICK ? 8 : 30;
    const res = { quick: QUICK, heavy_level: { id: heavy.id, objects: heavy.objects } };
    for (const [vw, vh, dsf] of [[1280, 720, 1], [640, 360, 3]]) {
      const tag = `${vw}x${vh}@${dsf}x`;
      const { ctx, page } = await normalPage(vw, vh, { dsf });
      const cdp = await lib.throttle(page, 6);
      await page.waitForTimeout(500);
      // (a) 레벨 1 실시간 완주 중 FPS
      await lib.fpsStart(page);
      const run = await RT_PLAY(page, 0, { maxS: T1 });
      const fps = await lib.fpsStop(page);
      // (b) 오브젝트 최다 레벨 FPS: 테스트 입력열로 진행 상태 유지. 30 s만 (quick 8 s)
      await lib.fpsStart(page);
      const run3 = await RT_PLAY(page, heavy.i, { maxS: TH });
      const fps3 = await lib.fpsStop(page);
      // (c) 입력 → 점프 반응 프레임: 레벨 1 시작 후 장애물 전(4 s) 구간에서 접지 상태일 때 keydown, 이후 rAF마다 y 확인
      const react = await page.evaluate(() => new Promise((done) => {
        const g = window.__game, out = [];
        let attempt = 0;
        const run = () => {
          g.loadLevel(0);
          let phase = 'wait', frames = 0, waitUntil = performance.now() + 900;
          const f = () => {
            if (out.length >= 20 || attempt > 8) { done(out); return; }
            if (g.state !== 'playing') { requestAnimationFrame(f); return; }
            const p = g.player;
            if (phase === 'wait') {
              if (g.tick > 0 && p.grounded && p.y === 0 && performance.now() > waitUntil && g.tick < 3.3 * 240) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
                setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true })), 60);
                phase = 'measure'; frames = 0;
              } else if (g.tick >= 3.3 * 240) { attempt++; run(); return; }
            } else {
              frames++;
              if (p.y > 0 || frames > 10) { out.push(frames); phase = 'wait'; waitUntil = performance.now() + 500; }
            }
            requestAnimationFrame(f);
          };
          requestAnimationFrame(f);
        };
        run();
      }));
      // (d) 사망 → 재시작 시간: 무입력으로 첫 장애물에 사망, rAF마다 상태 확인
      const restart = await page.evaluate(() => new Promise((done) => {
        const g = window.__game, out = [];
        const one = () => {
          g.loadLevel(0);
          const a0 = g.attempts; let tDead = null, tPlay = null;
          const f = (ts) => {
            const now = performance.now();
            if (g.state === 'dead' && tDead == null) tDead = now;
            if (tDead != null && tPlay == null && g.attempts !== a0) tPlay = now;
            if (tPlay != null && g.tick > 0) { out.push({ dead_to_new_attempt_ms: +(tPlay - tDead).toFixed(0), dead_to_moving_ms: +(now - tDead).toFixed(0) }); if (out.length >= 5) { done(out); return; } one(); return; }
            requestAnimationFrame(f);
          };
          requestAnimationFrame(f);
        };
        one();
      }));
      res[tag] = { throttle: 6, level1_run: run, fps_level1: fps, heavy_level_run: run3, fps_heavy_level: fps3, input_to_jump_frames: react, restart };
      console.log('perf', tag, JSON.stringify({ fps, fps3, react, restart, run: run.state, run3: run3.state }));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      // 비교: 스로틀 없이 반응 프레임·재시작 시간 (같은 측정)
      await ctx.close();
    }
    {
      const { ctx, page } = await normalPage(1280, 720);
      await lib.fpsStart(page);
      const run = await RT_PLAY(page, 0, { maxS: QUICK ? 5 : 20 });
      res['1280x720@1x_nothrottle'] = { fps_level1_20s: await lib.fpsStop(page), run };
      await ctx.close();
    }
    save('perf', res);
  }

  // ------------------------------------------------------------ 5. 기능 체크리스트
  if (parts.includes('features')) {
    const res = {};
    // 연습 모드: 체크포인트 재시작 위치, 클리어로 인정 안 함, 연습 최고 % 따로 저장
    {
      const { ctx, page } = await open(1280, 720);
      res.practice = await page.evaluate((waitS) => {
        const g = window.__game, hz = 240;
        g.loadLevel(1, { practice: true });
        const taps = new Set(g.testInputs.levels[g.levelData(1).id].taps);
        let k = 0;
        while (g.tick < 20 * hz && g.state === 'playing' && k++ < 1e6) { if (taps.has(g.tick)) { g.press(); g.step(1 / hz); g.release(); } else g.step(1 / hz); }
        const placed = g.placeCheckpoint();
        const cpTick = g.tick, cpX = g.player.x;
        // 입력 멈춤 → 사망 → 재시작
        let guard = 0; while (g.state === 'playing' && guard++ < 1e5) g.step(1 / hz);
        const deadAt = g.player.x;
        g.step(waitS); // 재시작 지연(balance restart_delay_s) + 여유 0.05 s (round-1 값 0.6 s 고정이던 것을 데이터에서 읽음)
        const after = { state: g.state, tick: g.tick, x: g.player.x, attempts: g.attempts };
        // 끝까지 클리어 (연습)
        guard = 0;
        while (g.state === 'playing' && guard++ < 1e6) { if (taps.has(g.tick)) { g.press(); g.step(1 / hz); g.release(); } else g.step(1 / hz); }
        const st = g.state;
        const sv = g.save.levels[g.levelData(1).id] || {};
        return { placed, cp_tick: cpTick, cp_x: cpX, dead_x: deadAt, after_restart: after, restart_at_checkpoint: after.attempts > 1 && after.tick >= cpTick && after.tick - cpTick <= Math.ceil(0.05 * hz) + 1, practice_end_state: st, save_02: sv, counts_as_clear: !!sv.cleared, wait_s: waitS };
      }, (DATA_BAL.restart_delay_s ?? 1.08) + 0.05);
      // 저장: 레벨 1 사망 후 최고 기록, 레벨 1 클리어 → 새로고침 후 유지
      res.save = await page.evaluate(() => {
        const g = window.__game;
        g.loadLevel(0); let j = 0; while (g.state === 'playing' && j++ < 1e5) g.step(1 / 240);
        const best = g.save.levels[g.levelData(0).id]?.best;
        g.replay(0);
        return { best_after_death: best, after_clear: g.save.levels[g.levelData(0).id] };
      });
      await page.reload();
      await page.waitForFunction(() => window.__game?.ready === true);
      res.save.after_reload = await page.evaluate(() => window.__game.save.levels);
      res.save.persisted = !!res.save.after_reload[LEVELS[0].id]?.cleared && res.save.after_reload[LEVELS[0].id].best === 100;
      await ctx.close();
    }
    // 잠금: 새 컨텍스트(빈 저장) 일반 모드 레벨 선택 카드
    {
      const { ctx, page } = await normalPage(1280, 720);
      await page.click('#btnLevels'); await page.waitForTimeout(200);
      res.locks_fresh = await page.evaluate(() => [...document.querySelectorAll('#cards > *')].map((c) => ({ cls: c.className, text: c.textContent.trim().slice(0, 40), disabled: c.disabled ?? null })));
      res.level_cards = { cards: res.locks_fresh.length, level_count: LEVELS.length, match: res.locks_fresh.length === LEVELS.length };
      await shot(page, '1280x720-10-levels-fresh-save.png');
      // 일시정지 버튼을 눌러도 점프하지 않아야 함
      await page.keyboard.press('Escape'); await page.waitForTimeout(100);
      await page.click('#btnPlay'); await page.waitForTimeout(1200);
      const box = await page.locator('#pauseBtn').boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(50);
      res.pause_button = await page.evaluate(() => ({ state: window.__game.state, player: window.__game.player }));
      await shot(page, '1280x720-11-pause-normal.png');
      // 계속 → 카운트다운 시간
      const t0 = Date.now();
      await page.click('#pResume');
      await page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 5000 });
      res.resume_countdown_ms = Date.now() - t0;
      // 백그라운드(visibilitychange) → 자동 일시정지, 틱 정지, 오디오 suspend
      await page.waitForTimeout(500);
      const bg = await page.evaluate(async () => {
        const g = window.__game;
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
        const t1 = g.tick;
        await new Promise((r) => setTimeout(r, 1000));
        const out = { state: g.state, tick_advanced: g.tick - t1, audio: g.audio, bgText: !document.getElementById('pauseBg').classList.contains('hidden') };
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
        await new Promise((r) => setTimeout(r, 300));
        out.after_visible = { state: g.state, audio: g.audio };
        return out;
      });
      res.background = bg;
      await shot(page, '1280x720-12-background-paused.png');
      await page.click('#pResume');
      await page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 5000 });
      res.blur = await page.evaluate(async () => { window.dispatchEvent(new Event('blur')); await new Promise((r) => setTimeout(r, 200)); return window.__game.state; });
      // 사망 중 백그라운드 → 복귀 시 자동 재시작이 진행되지 않는지
      await page.click('#pQuit');
      await page.waitForTimeout(200);
      await ctx.close();
    }
    // 음소거: GainNode 값을 가로채 확인 + 새로고침 후 유지
    {
      const r = await lib.openPage(browser, BASE, { width: 1280, height: 720, log });
      const page = r.page;
      await page.waitForFunction(() => window.__game?.ready === true);
      await page.evaluate(() => {
        window.__qaGains = [];
        const orig = BaseAudioContext.prototype.createGain;
        BaseAudioContext.prototype.createGain = function () { const g = orig.call(this); window.__qaGains.push(g); return g; };
      });
      await page.keyboard.press('Space'); await page.waitForTimeout(300);
      await page.click('#btnSettings'); await page.waitForTimeout(100);
      const before = await page.evaluate(() => window.__qaGains.slice(0, 8).map((g) => +g.gain.value.toFixed(3)));
      await page.click('#bMute'); await page.waitForTimeout(100);
      const after = await page.evaluate(() => window.__qaGains.slice(0, 8).map((g) => +g.gain.value.toFixed(3)));
      await shot(page, '1280x720-13-settings-muted.png');
      await page.reload(); await page.waitForFunction(() => window.__game?.ready === true);
      const persisted = await page.evaluate(() => window.__game.save.settings);
      res.mute = { gains_before: before, gains_after: after, settings_after_reload: persisted };
      await r.ctx.close();
    }
    save('features', res);
    console.log('features', JSON.stringify(res, null, 1).slice(0, 3000));
  }

  // ------------------------------------------------------------ 7. 대상 연령: 버튼 크기, 글 없는 화면
  if (parts.includes('age')) {
    // 버튼 크기는 언어마다 (영어 문구가 길어 버튼이 달라질 수 있음). 글 지운 화면은 언어와 무관하므로 첫 언어에서만.
    const res = { langs: LANGS, targets: {}, small: {} };
    for (const lang of LANGS) for (const [vw, vh] of VIEWS) {
      const tag = `${lang}-${vw}x${vh}`, vtag = `${vw}x${vh}`;
      const { ctx, page } = await open(vw, vh, `?test=1&lang=${lang}`);
      const all = {};
      const go = {
        title: () => window.__game.show('title'),
        levels: () => window.__game.show('levels'),
        settings: () => window.__game.show('settings'),
        play_practice: () => { const g = window.__game; g.loadLevel(0, { practice: true }); g.step(0.5); },
        pause: () => { const g = window.__game; g.loadLevel(0); g.step(1); g.pause(); },
        clear: () => { const g = window.__game; g.replay(0); g.step(1.3); },
      };
      for (const [name, fn] of Object.entries(go)) {
        await page.evaluate(fn); await page.waitForTimeout(60);
        all[name] = await lib.measureTargets(page, '.screen.show button, .screen.show a, .screen.show input, .screen.show .card, #hud:not(.hidden) button');
      }
      res.targets[tag] = all;
      res.small[tag] = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.filter((t) => t.w < 48 || t.h < 48).map((t) => `${t.id || t.tag + '.' + t.cls}(${t.w}x${t.h})`)]).filter(([, v]) => v.length));
      await ctx.close();
      // 글을 지운 화면 (글 없이 진행 가능한지 보는 용도)
      if ((vw === 360 || vw === 640) && lang === LANGS[0]) {
        const { ctx: c2, page: p2 } = await open(vw, vh);
        await lib.blankText(p2);
        for (const [name, fn] of [['title', go.title], ['levels', go.levels], ['pause', go.pause], ['clear', go.clear]]) {
          await p2.evaluate(fn); await p2.waitForTimeout(80);
          await shot(p2, `${vtag}-notext-${name}.png`);
        }
        // 튜토리얼 카드·손가락 시연은 이 페이지에서 레벨 1을 이미 클리어해(go.clear) 표시되지 않으므로 아래 일반 모드(rt) 샷으로 확인
        // 첫 사망 안내 (tut_restart)
        await p2.evaluate(() => { const g = window.__game; g.loadLevel(0); let j = 0; while (g.state === 'playing' && j++ < 1e5) g.step(1 / 240); g.step(0.1); });
        await shot(p2, `${vtag}-notext-first-death.png`);
        await c2.close();
      }
    }
    // ?test=1에서는 첫 cue(x=0)가 hook.step 경로로 보이지 않아(qa.md 이슈) 일반 모드 실시간으로 다시 찍는다
    for (const [vw, vh] of [[360, 640], [640, 360]]) {
      const tag = `${vw}x${vh}`;
      for (const blank of [false, true]) {
        const { ctx, page } = await normalPage(vw, vh);
        if (blank) await lib.blankText(page);
        await page.evaluate(() => window.__game.loadLevel(0));
        const sfx = blank ? 'notext-rt' : 'rt';
        await page.waitForTimeout(1200); await shot(page, `${tag}-${sfx}-level1-1.2s-cue.png`);
        await page.waitForFunction(() => window.__game.tick >= 3.75 * 240, null, { timeout: 8000 });
        await shot(page, `${tag}-${sfx}-level1-3.75s-finger.png`);
        await page.waitForFunction(() => window.__game.tick >= 3.98 * 240, null, { timeout: 8000 });
        await shot(page, `${tag}-${sfx}-level1-4.0s-finger-press.png`);
        await ctx.close();
      }
    }
    save('age', res);
    console.log('age small', JSON.stringify(res.small));
  }

  // ------------------------------------------------------------ 8. 밸런스 자동 측정 (node, tools/sim/bots.mjs = verify-levels 입력열 + physics.js, 브라우저 불필요)
  // criteria 밸런스 절:
  //   B30  모든 레벨 σ70 첫 클리어 시도 중앙값 30회 이하, 레벨 간 증가가 직전 레벨의 2배 이하
  //   B10  레벨 10 = 레벨 1~3 σ70 첫 클리어 중앙값의 기하 평균 배율로 외삽한 "레벨 6" ±20 %, 레벨 3~10 엄격 단조
  //   SK   숙련 봇 σ25 사망이 한 지점(±3 t = 6 t 창)에 30 % 넘게 몰리지 않음 (σ25 사망 < 20회인 레벨은 σ50으로 다시 봄)
  // 중앙값 정의 (criteria R3 준용): 판정 = 연속 중앙값 ln 0.5 / ln(1 − p), p = 시뮬레이터 σ70 첫 시도 클리어율. 정수·세션 중앙값은 참고.
  // bots.mjs는 프로세스마다 같은 시드(12345)로 시작한다. 레벨별로 프로세스를 따로 띄워 병렬로 돌리고, 한 레벨을 쪼개 돌리지 않는다 (같은 난수열 반복 방지).
  if (parts.includes('balance')) {
    const BAL_N = +arg('--bal-n', QUICK ? '300' : '20000');
    const BAL_SESS = +arg('--bal-sessions', QUICK ? '20' : '1000');
    const SK_N = +arg('--bal-skilled-n', QUICK ? '300' : '100000');
    const JOBS = Math.max(1, +arg('--jobs', String(Math.max(1, cpus().length - 1))));
    const BOTS = join(ROOT, 'projects/runner-01/tools/sim/bots.mjs');
    const ids = LV.map((l) => l.id);
    const runBots = (argv) => new Promise((ok, fail) => {
      const c = spawn(process.execPath, [BOTS, ...argv.map(String)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', err = '';
      c.stdout.on('data', (d) => (out += d)); c.stderr.on('data', (d) => (err += d));
      c.on('close', (code) => {
        if (code) return fail(new Error(`bots.mjs ${argv.join(' ')} 종료 코드 ${code}: ${err.slice(0, 500)}`));
        try { ok(JSON.parse(out)); } catch { fail(new Error('bots.mjs 출력이 JSON이 아님: ' + out.slice(0, 200))); }
      });
    });
    const pool = async (jobs) => {
      const res = new Array(jobs.length); let next = 0;
      await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, async () => { while (next < jobs.length) { const k = next++; res[k] = await jobs[k](); } }));
      return res;
    };
    const t0 = Date.now();
    // 오래 걸리는 σ25 큰 표본을 먼저 띄운다
    const jobs = [];
    for (const id of ids) jobs.push(() => runBots([SK_N, 'skilled_sd25', id, 0]).then((o) => ['skilled', id, o[id]]));
    for (const id of ids) jobs.push(() => runBots([BAL_N, 'child_sd70', id, BAL_SESS]).then((o) => ['child', id, o[id]]));
    // (round-2 1-4 추가) 결정 14: 12세 프로젝트 대표 봇 novice_sd50 — σ70과 같은 표본(BAL_N + BAL_SESS 세션)
    for (const id of ids) jobs.push(() => runBots([BAL_N, 'novice_sd50', id, BAL_SESS]).then((o) => ['novice', id, o[id]]));
    let child = {}, skilled = {}, fallback = {}, novice = {};
    // --bal-reuse: 같은 폴더의 parts/balance.json raw(봇 출력)를 다시 읽어 판정만 다시 계산 (표본·시드 같음, 재실행 안 함)
    const REUSE = args.includes('--bal-reuse') && existsSync(join(PARTS, 'balance.json'));
    if (REUSE) ({ child, skilled, fallback, novice } = JSON.parse(readFileSync(join(PARTS, 'balance.json'), 'utf8')).raw);
    else for (const [k, id, o] of await pool(jobs)) ({ child, skilled, novice })[k][id] = o;
    const thin = ids.filter((id) => (skilled[id]?.skilled_sd25?.deaths ?? 0) < 20);
    if (thin.length && !REUSE) for (const [, id, o] of await pool(thin.map((id) => () => runBots([SK_N, 'novice_sd50', id, 0]).then((o) => ['n50', id, o[id]])))) fallback[id] = o;

    const pEx = (o, n) => (o && Number.isFinite(o.deaths) ? 1 - o.deaths / n : o?.clear_rate); // (round-2 1-4) clear_rate 3자리 반올림 대신 사망 수로
    const contMed = (p) => (p >= 1 ? 1 : p > 0 ? Math.log(0.5) / Math.log(1 - p) : Infinity);
    const r3 = (v) => (Number.isFinite(v) ? +v.toFixed(3) : null);
    const per = ids.map((id) => {
      const c = child[id].child_sd70, s = skilled[id].skilled_sd25, f = fallback[id]?.novice_sd50;
      const cluster = f ? { profile: 'novice_sd50', share: f.top_death_cluster_share, x: f.top_death_x, deaths: f.deaths, sd25_deaths: s.deaths }
        : { profile: 'skilled_sd25', share: s.top_death_cluster_share, x: s.top_death_x, deaths: s.deaths };
      return { id, taps: child[id].taps, min_window_ms: child[id].min_window_ms, child_clear_rate: c.clear_rate, child_p_exact: +pEx(c, BAL_N).toFixed(5), child_cont_median: r3(contMed(pEx(c, BAL_N))),
        child_int_median: c.median_first_clear, child_session: c.session_first_clear, skilled_clear_rate: s.clear_rate, cluster, cluster_pass: cluster.share <= 0.30 };
    });
    const by = Object.fromEntries(per.map((r) => [r.id, r]));
    const cm = (id) => by[id]?.child_cont_median ?? null;
    const sm = (id) => by[id]?.child_session?.median ?? null;

    // B30: 30회 이하, 직전 레벨의 2배 이하
    const b30 = per.map((r, k) => {
      const prev = per[k - 1], v = r.child_cont_median, pv = prev?.child_cont_median;
      return { id: r.id, cont_median: v, session_median: r.child_session?.median ?? null, le30: v != null && v <= 30,
        ratio_to_prev: prev && v != null && pv ? +(v / pv).toFixed(3) : null, le2x: !prev || (v != null && pv != null && v <= 2 * pv) };
    });

    // B10: 레벨 1·3·10이 모두 선택돼 있어야 계산
    let b10 = null;
    const id1 = LEVELS[0]?.id, id3 = LEVELS[2]?.id, idL = LEVELS[LEVELS.length - 1]?.id;
    const extrap = (m1, m3) => { const g = Math.sqrt(m3 / m1); return { growth_per_level: +g.toFixed(4), extrapolated_level6: +(m3 * g ** 3).toFixed(3) }; };
    if (by[id1] && by[id3] && by[idL] && LEVELS.length >= 4) {
      const t = extrap(cm(id1), cm(id3)), v10 = cm(idL), ratio = v10 / t.extrapolated_level6;
      const from3 = per.filter((r) => +r.id >= +id3).map((r) => r.child_cont_median);
      const ts = sm(id1) && sm(id3) ? extrap(sm(id1), sm(id3)) : null;
      b10 = { definition: '연속 중앙값 ln0.5/ln(1-p), σ70 시뮬레이터 한 원천', m1: cm(id1), m3: cm(id3), ...t, level10: v10, ratio: r3(ratio),
        band: [+(t.extrapolated_level6 * 0.8).toFixed(3), +(t.extrapolated_level6 * 1.2).toFixed(3)], within_20pct: Math.abs(ratio - 1) <= 0.2,
        strict_monotonic_L3_to_last: from3.length === LEVELS.length - 2 && from3.every((v, k) => k === 0 || (v != null && from3[k - 1] != null && v > from3[k - 1])),
        reference_session_median: ts && { m1: sm(id1), m3: sm(id3), ...ts, level10: sm(idL), ratio: r3(sm(idL) / ts.extrapolated_level6) } };
    }
    // (round-2 1-4 추가) 프로필별 같은 곡선 판정 (B30·B10): σ50 대표 봇(결정 14), σ70 참고, σ25 참고
    const curve = (src, pk, n) => {
      const rows = ids.map((id) => { const o = src[id]?.[pk]; return o ? { id, p: +pEx(o, n).toFixed(5), cont_median: r3(contMed(pEx(o, n))), int_median: o.median_first_clear, session_median: o.session_first_clear?.median ?? null, session_p75: o.session_first_clear?.p75 ?? null, over_cap: o.session_first_clear?.over_cap ?? null, mean_progress: o.mean_progress } : { id, p: null, cont_median: null }; });
      const lv = rows.map((r, k) => ({ ...r, le30: r.cont_median != null && r.cont_median <= 30, ratio_to_prev: k && r.cont_median != null && rows[k - 1].cont_median ? +(r.cont_median / rows[k - 1].cont_median).toFixed(3) : null, le2x: !k || (r.cont_median != null && rows[k - 1].cont_median != null && r.cont_median <= 2 * rows[k - 1].cont_median) }));
      const m = Object.fromEntries(lv.map((r) => [r.id, r.cont_median]));
      let b10x = null;
      if (m[id1] != null && m[id3] != null && m[idL] != null && LEVELS.length >= 4) {
        const t = extrap(m[id1], m[id3]), ratio = m[idL] / t.extrapolated_level6;
        const from3 = lv.filter((r) => +r.id >= +id3).map((r) => r.cont_median);
        b10x = { m1: m[id1], m3: m[id3], ...t, level10: m[idL], ratio: r3(ratio), band: [+(t.extrapolated_level6 * 0.8).toFixed(3), +(t.extrapolated_level6 * 1.2).toFixed(3)], within_20pct: Math.abs(ratio - 1) <= 0.2,
          strict_monotonic_L3_to_last: from3.length === LEVELS.length - 2 && from3.every((v, k) => k === 0 || (v != null && from3[k - 1] != null && v > from3[k - 1])),
          monotonic_breaks: lv.filter((r, k) => k && +r.id > +id3 - 0 && r.cont_median != null && lv[k - 1].cont_median != null && r.cont_median <= lv[k - 1].cont_median).map((r) => r.id) };
      }
      return { profile: pk, levels: lv, B30: { pass: lv.every((r) => r.le30 && r.le2x), le30_fail: lv.filter((r) => !r.le30).map((r) => r.id), le2x_fail: lv.filter((r) => !r.le2x).map((r) => r.id) }, B10: b10x };
    };
    const profilesCurve = { novice_sd50: curve(novice, 'novice_sd50', BAL_N), child_sd70: curve(child, 'child_sd70', BAL_N), skilled_sd25: curve(skilled, 'skilled_sd25', SK_N) };
    const res = { quick: QUICK, note: QUICK ? 'quick 표본: 도구 동작 확인용, 판정에 쓰지 않음' : null,
      representative_bot: 'novice_sd50 (criteria 대상 연령 절 결정 14, 12세). 아래 B30·B10은 기존 σ70 기준(빌드가 맞춰진 기준), profiles_curve.novice_sd50이 결정 14 기준',
      profiles_curve: profilesCurve,
      samples: { child_sd70_attempts_per_level: BAL_N, child_sd70_sessions_per_level: BAL_SESS, novice_sd50_attempts_per_level: BAL_N, novice_sd50_sessions_per_level: BAL_SESS, session_cap: 300, skilled_sd25_attempts_per_level: SK_N, sd50_fallback_levels: thin },
      jobs: JOBS, seconds: +((Date.now() - t0) / 1000).toFixed(1),
      per_level: per, B30: { pass: b30.every((r) => r.le30 && r.le2x), levels: b30 }, B10: b10,
      SK: { pass: per.every((r) => r.cluster_pass), threshold: 0.30, window_t: 6 }, raw: { child, skilled, fallback, novice } };
    save('balance', res);
    console.log('balance', JSON.stringify({ seconds: res.seconds, samples: res.samples, B30: res.B30.pass, B10: b10 && { target: b10.extrapolated_level6, level10: b10.level10, ratio: b10.ratio, within: b10.within_20pct, strict: b10.strict_monotonic_L3_to_last }, SK: res.SK.pass }));
    for (const [pk, cv] of Object.entries(profilesCurve)) console.log(`  [${pk}] B30 ${cv.B30.pass} (30회 초과 ${cv.B30.le30_fail.join(',') || '-'}, 2배 초과 ${cv.B30.le2x_fail.join(',') || '-'}) B10 ${cv.B10 && JSON.stringify({ target: cv.B10.extrapolated_level6, l10: cv.B10.level10, ratio: cv.B10.ratio, within: cv.B10.within_20pct, strict: cv.B10.strict_monotonic_L3_to_last })} | ${cv.levels.map((r) => `${r.id}:${r.cont_median}`).join(' ')}`);
    for (const r of per) console.log(`  ${r.id} σ70 p=${r.child_clear_rate} 연속중앙 ${r.child_cont_median} 세션중앙 ${r.child_session?.median} | 몰림 ${r.cluster.profile} ${r.cluster.share} (사망 ${r.cluster.deaths})`);
  }
} finally {
  await browser?.close().catch(() => {});
  server.stop();
}
save('log-' + parts.join('_'), log);
console.log('log', JSON.stringify({ console: log.console.length, pageerrors: log.pageerrors.length, failed: log.failed.length, external: log.external.length, requests: log.requests }));
for (const e of [...log.console, ...log.pageerrors, ...log.failed].slice(0, 20)) console.log('  ' + e);

function merge() {
  const m = { game: 'reverbound', round: +ROUND, generated: new Date().toISOString(), tool: 'projects/runner-01/tools/qa-round.mjs', browser: 'Microsoft Edge (playwright-core, channel msedge, headless)' };
  for (const f of readdirSync(PARTS)) if (f.endsWith('.json')) m[f.replace('.json', '')] = JSON.parse(readFileSync(join(PARTS, f), 'utf8'));
  writeFileSync(join(OUT, 'metrics.json'), JSON.stringify(m, null, 2));
  console.log('metrics.json written');
}
