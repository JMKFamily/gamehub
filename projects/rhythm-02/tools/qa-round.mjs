#!/usr/bin/env node
// rhythm-02 QA 라운드 검사 (qa-engineer 전용, 빌드·기획 파일은 읽기만 함)
//
//   PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/rhythm-02/tools/qa-round.mjs --round 1 --part <이름|all> [--channel msedge] [--port 873x]
//   node projects/rhythm-02/tools/qa-round.mjs --round 1 --merge     # parts/*.json → metrics.json
//
// 파트 (결과: reviews/round-N/parts/<파트>.json, 스크린샷: reviews/round-N/shots/)
//   static    빌드 파일 외부 URL·레퍼런스 이름 검색, data 사본 = 기획 원본(바이트), judge.js = tools/sim/judge.mjs
//   bots      ?test=1 빌드에서 σ25/50/70 봇(놓침·헛탭 포함, tools/sim/bots.mjs botTaps 그대로) 시도 → 시도마다 judge.mjs 재판정 불일치 0,
//             σ70 첫 시도 클리어율 p → 연속 중앙값(빌드) vs verify-levels(시뮬레이터 원천) 비교. --n70 N --n N
//   realtime  일반 모드(오디오 켜짐) autoplay(rAF + PointerEvent) L1~L10 + Playwright 실제 마우스(CDP) L1~L10 완벽 입력열, 입력 → 북 반응 프레임(캔버스 픽셀)
//   restart   일반 모드: 재시작 시간(실패 틱 → 다음 시도 첫 프레임, 늦음·일찍, rAF 독립 측정 포함), 실패 → 다음 판정 접촉(L1~L10), 연습 모드 체크포인트·부활 시간
//   perf      6배 CPU 스로틀링 DPR 1·3: 실제 클릭 흐름 레벨 시작 직후·재시작 직후·플레이 중 평균 fps·1% low
//   shots     4해상도 × ko/en × 화면 스크린샷(일반 모드), 버튼 48 px·겹침·화면 밖·넘침·640x360 스크롤 표시, notext 화면·공/카드 공 px, 타이틀→레벨 선택 빈 화면
//   testeq    ?test=1 화면 = 일반 모드(같은 레벨 시각 캔버스 픽셀·DOM 상태 비교)
//   sound     빌드 audio.js 합성을 OfflineAudioContext 로 렌더 → 탭 vs 효과음 최고값, 탭 vs 곡 박 RMS, art sound.json 측정값 대조
//   signal    L1 손가락 보임 구간(빌드 실측, 테스트 4 ms 단위 + 일반 모드 rAF) ∩ 다음 위험 구간
//   features  새로고침 뒤 기록 유지, 백그라운드 멈춤(강제 이벤트 + 실제 탭 전환 시도), 음소거, 보호자 길게 누르기, 멈춤 메뉴
// 콘솔·네트워크 로그는 모든 파트에서 모아 parts/<파트>.json 의 log 에 넣는다. 서버 PID 는 parts/pids.log 에 적고 자기 것만 종료한다.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, appendFileSync, statSync } from 'node:fs';
import { dirname, resolve, join, extname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJ, '../..');
const GAME = join(ROOT, 'games/rhythm-02');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ROUND = opt('--round', '1');
const PART = opt('--part', 'all');
const CHANNEL = opt('--channel', 'msedge');
const RDIR = join(PROJ, 'reviews', `round-${ROUND}`);
const PDIR = join(RDIR, 'parts'), SDIR = join(RDIR, 'shots');
mkdirSync(PDIR, { recursive: true }); mkdirSync(SDIR, { recursive: true });

const J = await import(pathToFileURL(join(PROJ, 'tools/sim/judge.mjs')).href);
const B = await import(pathToFileURL(join(PROJ, 'tools/sim/bots.mjs')).href);
const bal = JSON.parse(readFileSync(join(PROJ, 'balance.json'), 'utf8'));
const Ls = bal.levels.map((p) => J.compileLevel(JSON.parse(readFileSync(join(PROJ, p), 'utf8')), bal));
const NL = Ls.length;

// ---------- merge ----------
if (args.includes('--merge')) {
  const parts = {};
  for (const f of readdirSync(PDIR).filter((f) => f.endsWith('.json') && !f.startsWith('verify'))) {
    try { parts[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(PDIR, f), 'utf8')); } catch {}
  }
  let vj = null; try { vj = JSON.parse(readFileSync(join(PDIR, 'verify-levels.json'), 'utf8')); } catch {}
  const logs = Object.entries(parts).flatMap(([k, v]) => (v.log ? v.log.console.map((x) => `${k}: ${x}`) : []));
  const ext = Object.entries(parts).flatMap(([k, v]) => (v.log ? v.log.external.map((x) => `${k}: ${x}`) : []));
  const failedReq = Object.entries(parts).flatMap(([k, v]) => (v.log ? v.log.failed.map((x) => `${k}: ${x}`) : []));
  const out = {
    project: 'rhythm-02', round: +ROUND, generated: new Date().toISOString(),
    tool: 'projects/rhythm-02/tools/qa-round.mjs',
    verify_levels: vj ? { summary: vj.summary, l10_target: vj.l10_target, sim_child_sd70: Object.fromEntries(Object.entries(vj.bots).sort().map(([k, v]) => [k, { p: v.child_sd70.clear_rate, median_continuous: v.child_sd70.median_continuous, median_sessions: v.child_sd70.median_sessions }])) } : null,
    console_errors_warnings: logs, external_requests: ext, failed_requests: failedReq,
    parts,
  };
  writeFileSync(join(RDIR, 'metrics.json'), JSON.stringify(out, null, 1));
  console.log(`metrics.json ← ${Object.keys(parts).join(', ')} (콘솔 ${logs.length}, 외부 ${ext.length}, 실패 요청 ${failedReq.length})`);
  process.exit(0);
}

// ---------- playwright ----------
let pw = null;
const req = createRequire(import.meta.url);
for (const name of ['playwright', 'playwright-core']) { try { pw = req(name); break; } catch {} }
if (!pw && process.env.PLAYWRIGHT_CORE) { try { pw = createRequire(join(process.env.PLAYWRIGHT_CORE, 'index.js'))(process.env.PLAYWRIGHT_CORE); } catch {} }
const needBrowser = PART !== 'static';
if (needBrowser && !pw) { console.error('playwright 를 찾지 못함: PLAYWRIGHT_CORE=<playwright-core 폴더>'); process.exit(2); }

// ---------- 서버(자기 것만) ----------
let server = null, PORT = 0, browser = null;
async function startServer() {
  const want = opt('--port', null);
  const ports = want ? [+want] : [8739, 8738, 8737, 8736, 8735, 8734, 8733, 8732];
  for (const p of ports) {
    try { await fetch(`http://127.0.0.1:${p}/`); continue; } catch {}
    const ch = spawn(process.execPath, [join(PROJ, 'tools/serve.mjs'), String(p)], { stdio: ['ignore', 'pipe', 'pipe'] });
    const ok = await new Promise((res) => { ch.stdout.once('data', () => res(true)); ch.once('exit', () => res(false)); setTimeout(() => res(false), 4000); });
    if (ok) { server = ch; PORT = p; break; }
  }
  if (!server) throw new Error('8732~8739 에서 서버를 못 띄움');
  appendFileSync(join(PDIR, 'pids.log'), `${new Date().toISOString()} part=${PART} server pid ${server.pid} port ${PORT} (qa-round 자식, 끝에 이 PID 만 종료)\n`);
  console.log(`서버 pid ${server.pid} 포트 ${PORT}`);
}
const cleanup = () => { try { server && server.kill(); } catch {} };
process.on('exit', cleanup);
const BASE = () => `http://127.0.0.1:${PORT}/games/rhythm-02/`;

let LOG = { console: [], external: [], failed: [] };
async function open(w, h, q = '?test=1', { fresh = true, dsf = 1, touch = false, seed = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, hasTouch: touch });
  const p = await ctx.newPage();
  const tag = `${w}x${h}${q}`;
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) LOG.console.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => LOG.console.push(`[${tag}] pageerror: ${e.message}`));
  p.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) LOG.external.push(r.url()); });
  p.on('requestfailed', (r) => LOG.failed.push(`[${tag}] ${r.url()} ${r.failure()?.errorText}`));
  p.on('response', (r) => { if (r.status() >= 400) LOG.failed.push(`[${tag}] ${r.url()} ${r.status()}`); });
  await p.goto(BASE() + q);
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 30000 });
  if (fresh || seed) {
    await p.evaluate((s) => { localStorage.clear(); if (s) localStorage.setItem('rhythm02.v1', JSON.stringify(s)); }, seed);
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 30000 });
  }
  return { ctx, p };
}
const SEED_PROGRESS = { v: 1, levels: { '01': { best: 1, grade: 3, cleared: true, seenCard: true }, '02': { best: 1, grade: 2, cleared: true, seenCard: true }, '03': { best: 1, grade: 1, cleared: true }, '04': { best: 0.64 }, '05': {} }, drift: { on: false, sessions: 0 } };
const ALL_OPEN = { v: 1, levels: Object.fromEntries([...Array(10)].map((_, i) => [String(i + 1).padStart(2, '0'), { best: 1, grade: 3, cleared: true, seenCard: true }])), drift: { on: false, sessions: 0 } };
const save = (name, obj) => { writeFileSync(join(PDIR, `${name}.json`), JSON.stringify({ part: name, at: new Date().toISOString(), ...obj, log: LOG }, null, 1)); LOG = { console: [], external: [], failed: [] }; };
const rel = (f) => relative(RDIR, f).replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function rejudge(li, a, fullTaps = null) {
  const L = Ls[li];
  const carried = L.contacts.slice(0, a.carried).map((c) => c.t);
  const rb = J.judgeAttempt(L, carried.concat(a.taps));
  const same = (r) => r.clear === a.clear && (r.clear || (r.failIndex === a.failIndex && r.reason === a.reason && Math.abs(r.failTimeMs - a.failTimeMs) < 1e-6)) && r.grades.map((g) => g.grade).join() === a.grades.join();
  const okRec = same(rb);
  const okFull = fullTaps ? same(J.judgeAttempt(L, carried.concat(fullTaps))) : true;
  return { okRec, okFull };
}

// ====================================================================
const PARTS = {};

// ---------- static ----------
PARTS.static = async () => {
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(p); } };
  walk(GAME);
  const ext = [], refs = [];
  const REF = /geometry\s*dash|rhythm\s*heaven|tickadrum|reverbound|robtop|nintendo/i;
  for (const f of files) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi)) { if (!/w3\.org\/(2000|1999)\/(svg|xlink)/.test(m[0])) ext.push(`${rel(f)}: ${m[0]}`); }
    const r = t.match(REF); if (r) refs.push(`${relative(ROOT, f)}: ${r[0]}`);
  }
  const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
  const same = {
    judge: sha(join(GAME, 'js/judge.js')) === sha(join(PROJ, 'tools/sim/judge.mjs')),
    music: sha(join(GAME, 'js/music.js')) === sha(join(PROJ, 'tools/art/music.mjs')),
    balance: sha(join(GAME, 'data/balance.json')) === sha(join(PROJ, 'balance.json')),
    palette: sha(join(GAME, 'data/palette.json')) === sha(join(PROJ, 'assets/palette.json')),
    layout: sha(join(GAME, 'data/layout.json')) === sha(join(PROJ, 'assets/layout.json')),
    sound: sha(join(GAME, 'data/sound.json')) === sha(join(PROJ, 'assets/sound.json')),
    strings: sha(join(GAME, 'data/strings.json')) === sha(join(PROJ, 'strings.json')),
    levels: readdirSync(join(PROJ, 'levels')).every((f) => existsSync(join(GAME, 'data/levels', f)) && sha(join(GAME, 'data/levels', f)) === sha(join(PROJ, 'levels', f))),
  };
  const size = files.reduce((a, f) => a + statSync(f).size, 0);
  console.log(`파일 ${files.length}개 ${(size / 1024).toFixed(0)} KB, 외부 URL ${ext.length}, 레퍼런스·타 팀 이름 ${refs.length}, 원본 동일 ${JSON.stringify(same)}`);
  save('static', { files: files.length, bytes: size, external_urls: ext, ref_names: refs, same_as_source: same });
};

// ---------- bots ----------
PARTS.bots = async () => {
  const n70 = +opt('--n70', 2000), nOther = +opt('--n', 400);
  const profs = bal.bots.profiles;
  const { ctx, p } = await open(360, 640, '?test=1');
  const res = { levels: {}, rejudge: { attempts: 0, mismatchRecorded: 0, mismatchFull: 0, examples: [] } };
  const t0 = Date.now();
  for (let li = 0; li < NL; li++) {
    const L = Ls[li], id = L.level.id ?? li + 1;
    res.levels[li + 1] = {};
    for (const [pname, prof] of Object.entries(profs)) {
      const N = pname === 'child_sd70' ? n70 : nOther;
      const rng = B.makeRng(1000 * (li + 1) + (pname === 'child_sd70' ? 70 : pname === 'novice_sd50' ? 50 : 25) + 7 * (parseInt(ROUND, 10) || 0));
      const tapsList = [];
      for (let k = 0; k < N; k++) tapsList.push(B.botTaps(L, prof, rng, { extraAfter: bal.bots.extra_tap_after_s }).sort((a, b) => a - b));
      const logs = [];
      for (let s = 0; s < N; s += 250) {
        const chunk = tapsList.slice(s, s + 250);
        const out = await p.evaluate(({ li, chunk }) => {
          const g = window.__game, res = [];
          g.loadLevel(li);
          for (const taps of chunk) {
            if (g.phase !== 'run') g.loadLevel(li);
            const att = g.attempts;
            for (const t of taps) { let k2 = 0; while (g.attempts === att && g.phase === 'run' && t - g.judgeMs() > 20 && k2++ < 5000) g.step(Math.min(1.0, (t - g.judgeMs() - 10) / 1000)); if (g.attempts !== att || g.phase !== 'run') break; g.pressAt(t); } // 탭 사이에 실패·재시작이 끼면 다음 시도로 넘어가지 않게 끊어서 진행
            let k = 0;
            while (g.attempts === att && g.phase === 'run' && k++ < 2000) g.step(0.05);
            const log = g.attemptLog(); const a = log[log.length - 1];
            res.push(a);
            if (g.phase === 'fail') { k = 0; while (g.attempts === att && k++ < 200) g.step(0.05); }
            else g.loadLevel(li);
          }
          return res;
        }, { li, chunk });
        logs.push(...out);
      }
      // 재판정 + 통계
      let clears = 0, prog = 0, early = 0; const failIdx = new Array(L.contacts.length).fill(0);
      const sessions = []; let k = 0;
      for (let n = 0; n < N; n++) {
        const a = logs[n];
        const r = rejudge(li, a, tapsList[n]);
        res.rejudge.attempts++;
        if (!r.okRec) res.rejudge.mismatchRecorded++;
        if (!r.okFull) { res.rejudge.mismatchFull++; if (res.rejudge.examples.length < 5) res.rejudge.examples.push({ level: li + 1, pname, n, build: a, sim: J.judgeAttempt(L, tapsList[n]) }); }
        k++;
        if (a.clear) { clears++; prog += 1; sessions.push(k); k = 0; } else { prog += a.progress; failIdx[a.failIndex]++; if (a.reason === 'early') early++; }
      }
      const pc = clears / N, sorted = [...sessions].sort((a, b) => a - b);
      const top = Math.max(...failIdx), deaths = N - clears;
      res.levels[li + 1][pname] = { N, clear_rate: +pc.toFixed(4), median_continuous: pc > 0 ? +B.contMedian(pc).toFixed(3) : null, ci95_p: [+(pc - 1.96 * Math.sqrt(pc * (1 - pc) / N)).toFixed(4), +(pc + 1.96 * Math.sqrt(pc * (1 - pc) / N)).toFixed(4)], sessions: sessions.length, median_sessions: sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null, mean_progress: +(100 * prog / N).toFixed(1), early_fail_share: deaths ? +(early / deaths).toFixed(3) : 0, top_fail_contact: deaths ? failIdx.indexOf(top) : null, top_fail_contact_share: deaths ? +(top / deaths).toFixed(3) : 0 };
    }
    const c = res.levels[li + 1].child_sd70;
    console.log(`L${li + 1}: σ70 p ${c.clear_rate} 연속 ${c.median_continuous} 정수 ${c.median_sessions} · σ50 p ${res.levels[li + 1].novice_sd50.clear_rate} · σ25 p ${res.levels[li + 1].skilled_sd25.clear_rate} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  await ctx.close();
  // 시뮬레이터 원천 비교
  let vj = null; try { vj = JSON.parse(readFileSync(join(PDIR, 'verify-levels.json'), 'utf8')); } catch {}
  if (vj) {
    res.compare = {};
    for (let li = 0; li < NL; li++) {
      const id = String(li + 1).padStart(2, '0'), s = vj.bots[id].child_sd70, b = res.levels[li + 1].child_sd70;
      const se = Math.sqrt(s.clear_rate * (1 - s.clear_rate) / b.N);
      res.compare[li + 1] = { sim_p: s.clear_rate, build_p: b.clear_rate, z: +((b.clear_rate - s.clear_rate) / se).toFixed(2), sim_cont: s.median_continuous, build_cont: b.median_continuous, sim_int: s.median_sessions, build_int: b.median_sessions };
    }
  }
  console.log(`재판정 ${res.rejudge.attempts}회: 빌드 기록 탭 불일치 ${res.rejudge.mismatchRecorded}, 봇 전체 탭 불일치 ${res.rejudge.mismatchFull}`);
  save('bots', res);
};

// ---------- realtime ----------
PARTS.realtime = async () => {
  const { ctx, p } = await open(1280, 720, '', { seed: ALL_OPEN });
  await p.mouse.click(640, 400); // 타이틀 실제 탭(오디오 잠금 해제)
  await p.waitForFunction(() => window.__game.state === 'levels');
  const audio = await p.evaluate(() => ({ state: window.__game.audioState(), lat: window.__game.drift().autoLat }));
  const auto = [];
  for (let i = 0; i < NL; i++) {
    const r = await p.evaluate(async (i) => { const g = window.__game; g.loadLevel(i); const s = await g.autoplay(0, 0, 1); return { s, judge: g.judgeLog(), log: g.attemptLog(), audio: g.audioState() }; }, i);
    const es = r.judge.map((x) => x.e);
    const rj = r.log.map((a) => rejudge(i, a));
    auto.push({ level: i + 1, clear: r.s.clear, grade: r.s.grade, attempts: r.s.attempts, audio: r.audio, maxAbsErrMs: +Math.max(...es.map(Math.abs)).toFixed(2), rejudgeOk: rj.every((x) => x.okRec) });
    console.log(`autoplay L${i + 1}: clear ${r.s.clear} grade ${r.s.grade} max|e| ${auto[i].maxAbsErrMs}`);
  }
  // 실제 마우스(CDP)
  const mouse = [];
  for (let i = 0; i < NL; i++) {
    await p.evaluate((i) => window.__game.loadLevel(i), i);
    await p.mouse.move(640, 600);
    const tStart = Date.now();
    for (;;) {
      const s = await p.evaluate(() => { const g = window.__game; if (g.state === 'result' || g.phase === 'clear') return { done: true }; const i = g.judgeLog().length, c = g.contacts()[i]; return { done: false, wait: c ? c.t - g.judgeMs() : 1e9, att: g.attempts }; });
      if (s.done || s.att > 1 || Date.now() - tStart > 90000) break;
      if (s.wait > 60) { await sleep(s.wait - 45); continue; }
      const w = await p.evaluate(() => { const g = window.__game, i = g.judgeLog().length, c = g.contacts()[i]; return c ? c.t - g.judgeMs() : 0; });
      if (w > 3) await sleep(w - 3);
      await p.mouse.down(); await sleep(100); await p.mouse.up(); // 누름 100 ms
    }
    const r = await p.evaluate(() => ({ s: window.__game.summary(), j: window.__game.judgeLog(), log: window.__game.attemptLog() }));
    const es = r.j.map((x) => x.e);
    mouse.push({ level: i + 1, clear: r.s.clear || r.s.phase === 'clear', attempts: r.s.attempts, grade: r.s.grade, err_min: +Math.min(...es).toFixed(1), err_max: +Math.max(...es).toFixed(1), err_mean: +(es.reduce((a, b) => a + b, 0) / es.length).toFixed(1), rejudgeOk: r.log.every((a) => rejudge(i, a).okRec) });
    console.log(`mouse L${i + 1}: clear ${mouse[i].clear} attempts ${r.s.attempts} e ${mouse[i].err_min}~${mouse[i].err_max}`);
  }
  // 입력 → 북 반응 프레임: 캔버스 픽셀(북 왼쪽 위 띠)이 바뀐 첫 rAF 프레임 번호
  await p.evaluate(() => window.__game.loadLevel(0));
  await sleep(1500);
  const react = [];
  for (let k = 0; k < 12; k++) {
    await p.evaluate(() => {
      const G = window.__game.layout(), cv = document.getElementById('cv'), c = cv.getContext('2d'), dpr = cv.width / innerWidth;
      const x = Math.round((G.cx - G.dw / 2 + 0.3 * G.d) * dpr), y = Math.round((G.skinY - 0.3 * G.d) * dpr), w = Math.round(0.6 * G.d * dpr), h = Math.round(0.28 * G.d * dpr);
      const sig = () => { const d = c.getImageData(x, y, w, h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s = (s * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0; return s; };
      window.__qaR = { frames: [], ev: null };
      let base = sig(), n = 0;
      const f = (t) => { const s = sig(); window.__qaR.frames.push({ t, s, changed: s !== base }); if (++n < 30) requestAnimationFrame(f); };
      requestAnimationFrame(f);
      document.addEventListener('pointerdown', (e) => { if (!window.__qaR.ev) window.__qaR.ev = { ts: e.timeStamp, nowAt: performance.now() }; }, { once: true, capture: true });
    });
    await sleep(120 + 37 * k % 50);
    await p.mouse.down(); await sleep(60); await p.mouse.up();
    await sleep(500);
    const r = await p.evaluate(() => window.__qaR);
    const after = r.frames.filter((f) => f.t >= r.ev.nowAt - 0.5);
    const idx = after.findIndex((f) => f.changed);
    const before = r.frames.filter((f) => f.t < r.ev.nowAt - 0.5).some((f) => f.changed);
    react.push({ frameIndex: idx >= 0 ? idx + 1 : null, msToFrame: idx >= 0 ? +(after[idx].t - r.ev.ts).toFixed(1) : null, changedBefore: before });
    await p.evaluate(() => { const g = window.__game; if (g.phase !== 'run') g.loadLevel(0); });
    await sleep(300);
  }
  console.log(`입력 → 북 반응 프레임 ${react.map((r) => r.frameIndex).join(',')}`);
  await ctx.close();
  save('realtime', { audio, autoplay: auto, mouse, react });
};

// ---------- restart ----------
PARTS.restart = async () => {
  const { ctx, p } = await open(1280, 720, '', { seed: ALL_OPEN });
  await p.mouse.click(640, 400);
  await p.waitForFunction(() => window.__game.state === 'levels');
  // rAF 독립 측정기: 실패 국면 첫 프레임(rAF t), 새 시도 첫 프레임(rAF t), 레벨 접촉 시각을 지나는 프레임
  await p.evaluate(() => {
    window.__qaM = { ev: [] };
    let lastPh = null, lastAtt = null;
    const f = (t) => { const g = window.__game; const ph = g.phase, at = g.attempts; if (ph !== lastPh || at !== lastAtt) window.__qaM.ev.push({ t, ph, at, lvl: g.levelIndex, jm: g.judgeMs(), lm: g.levelMs() }); lastPh = ph; lastAtt = at; requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  const restarts = [];
  // 늦음: 각 레벨 무입력 → 첫 접촉 늦음 실패 → 다음 시도 첫 프레임 / 다음 시도 첫 접촉 화면 시각
  const nextContact = [];
  for (let i = 0; i < NL; i++) {
    const r = await p.evaluate(async (i) => {
      const g = window.__game; window.__qaM.ev = [];
      g.loadLevel(i);
      const c0 = g.contacts()[0];
      await new Promise((res) => { const iv = setInterval(() => { if (g.attempts >= 2 && g.judgeMs() >= c0.t) { clearInterval(iv); res(); } }, 5); });
      // 다음 시도 첫 접촉 시각(화면): rAF 로 judgeMs ≥ c0.t 인 첫 프레임 시각을 잼
      return { restart: g.restartLog(), log: g.attemptLog(), ev: window.__qaM.ev.slice(), c0: c0.t, comp: 40 };
    }, i);
    const fail = r.log[0];
    const rl = r.restart[0];
    const evFail = r.ev.find((e) => e.ph === 'fail' && e.at === 1), evNew = r.ev.find((e) => e.at === 2);
    // 실패 틱 performance 시각 = failPerf(빌드 기록) / rAF 독립: 실패 국면 첫 프레임
    const failPerf = fail.failPerf;
    restarts.push({ level: i + 1, kind: 'late', build_ms: rl ? +rl.ms.toFixed(1) : null, raf_from_failPerf_ms: evNew ? +(evNew.t - failPerf).toFixed(1) : null, raf_failframe_to_newframe_ms: evFail && evNew ? +(evNew.t - evFail.t).toFixed(1) : null, fail_frame_after_failPerf_ms: evFail ? +(evFail.t - failPerf).toFixed(1) : null });
    nextContact.push({ level: i + 1, fail_to_next_first_contact_s: evNew ? +((evNew.t - failPerf + r.c0 + r.comp - evNew.lm) / 1000).toFixed(3) : null, c0_ms: r.c0 });
    console.log(`L${i + 1} 늦음 재시작 build ${restarts.at(-1).build_ms} rAF ${restarts.at(-1).raf_from_failPerf_ms} · 실패 → 다음 첫 접촉 ${nextContact.at(-1).fail_to_next_first_contact_s} s`);
  }
  // 일찍: L1·L5·L10 첫 접촉 놓침 구역 실제 마우스 탭 2회씩
  for (const i of [0, 4, 9]) {
    await p.evaluate((i) => { window.__qaM.ev = []; window.__game.loadLevel(i); }, i);
    for (let k = 0; k < 2; k++) {
      const att = await p.evaluate(() => window.__game.attempts);
      for (;;) {
        const w = await p.evaluate(() => { const g = window.__game, c = g.contacts()[0]; return g.phase === 'run' ? c.zoneStart + 30 - g.judgeMs() : 1e9; });
        if (w < 1e8 && w <= 4) break;
        await sleep(w > 60 ? w - 40 : Math.max(1, w - 3));
      }
      await p.mouse.down(); await sleep(100); await p.mouse.up();
      await p.waitForFunction((a) => window.__game.attempts > a, att);
      await sleep(150);
    }
    const r = await p.evaluate(() => ({ restart: window.__game.restartLog(), log: window.__game.attemptLog(), ev: window.__qaM.ev.slice() }));
    r.restart.forEach((x, k) => {
      const f = r.log[k], evNew = r.ev.find((e) => e.at === k + 2), evFail = r.ev.find((e) => e.ph === 'fail' && e.at === k + 1);
      restarts.push({ level: i + 1, kind: f.reason, build_ms: +x.ms.toFixed(1), raf_from_failPerf_ms: evNew ? +(evNew.t - f.failPerf).toFixed(1) : null, raf_failframe_to_newframe_ms: evFail && evNew ? +(evNew.t - evFail.t).toFixed(1) : null, fail_frame_after_failPerf_ms: evFail ? +(evFail.t - f.failPerf).toFixed(1) : null });
    });
    console.log(`L${i + 1} 일찍 재시작 ${restarts.filter((x) => x.level === i + 1 && x.kind === 'early').map((x) => x.build_ms).join(',')}`);
  }
  // 연습 모드: 레벨 시작 판에서 깃발 실제 클릭 → 3번째 구절 첫 접촉 무입력 실패 → 체크포인트 부활 시간, 이어서 완벽 입력 클리어
  const practice = [];
  for (const i of [0, 5, 9]) {
    await p.evaluate(() => window.__game.show('levels'));
    await p.click(`#lv${i}`); await p.waitForFunction(() => window.__game.state === 'start');
    await p.click('#stPractice');
    await p.waitForFunction(() => window.__game.state === 'play' || window.__game.state === 'card');
    if (await p.evaluate(() => window.__game.state === 'card')) await p.click('#cdClose');
    await p.waitForFunction(() => window.__game.state === 'play' && window.__game.practice);
    const r = await p.evaluate(async () => {
      const g = window.__game, cs = g.contacts();
      // 마지막 구절 앞까지 완벽 입력(실시간 PointerEvent), 그 뒤 무입력으로 실패시킴
      const cut = Math.floor(cs.length * 0.6);
      const startAtt = g.attempts;
      await new Promise((res) => {
        const iv = setInterval(() => {
          const i = g.judgeLog().length;
          if (g.attempts !== startAtt || i >= cut) { clearInterval(iv); res(); return; }
          const wait = cs[i].t - g.judgeMs();
          if (wait < 6) { const cv = document.getElementById('cv'); cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, button: 0 })); }
        }, 1);
      });
      await new Promise((res) => { const iv = setInterval(() => { if (g.attempts > startAtt && g.phase === 'run') { clearInterval(iv); res(); } }, 10); });
      const log1 = g.attemptLog();
      const s = await g.autoplay(0, 0, 1);
      return { restart: g.restartLog(), log: g.attemptLog(), s, cut };
    });
    const a2 = r.log[1];
    practice.push({ level: i + 1, cut: r.cut, fail1: { failIndex: r.log[0].failIndex, reason: r.log[0].reason }, resume_fromMs: a2?.fromMs, carried: a2?.carried, respawn_ms: r.restart[0] ? +r.restart[0].ms.toFixed(1) : null, cleared_after: r.s.clear, attempts: r.s.attempts, rejudgeOk: r.log.every((a) => rejudge(i, a).okRec) });
    console.log(`연습 L${i + 1}: 실패 접촉 ${r.log[0].failIndex} → 체크포인트 접촉 ${a2?.carried} 부활 ${practice.at(-1).respawn_ms} ms, 이어서 클리어 ${r.s.clear}`);
    await p.waitForTimeout(300);
  }
  await ctx.close();
  save('restart', { range_ms: bal.restart.allowed_range_s.map((x) => x * 1000), restarts, nextContact, practice });
};

// ---------- perf ----------
PARTS.perf = async () => {
  const out = [];
  const RUNS = +opt('--perf-runs', 1);
  for (let run = 1; run <= RUNS; run++) for (const dsf of [1, 3]) {
    if (run > 1 || dsf === 1) { if (browser) await browser.close(); browser = await pw.chromium.launch({ channel: CHANNEL, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] }); appendFileSync(join(PDIR, 'pids.log'), `${new Date().toISOString()} perf run ${run} browser pid ${browser.process?.()?.pid ?? '?'}
`); }
    const { ctx, p } = await open(412, 915, '', { dsf, seed: ALL_OPEN });
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await p.evaluate(() => {
      window.__qaF = { d: [], on: false, last: 0, t0: 0, long: [] };
      const f = (t) => { const F = window.__qaF; if (F.on) { if (F.last) { const dt = t - F.last; F.d.push(dt); if (dt > 25) F.long.push([+(t - F.t0).toFixed(0), +dt.toFixed(1)]); } F.last = t; } requestAnimationFrame(f); };
      requestAnimationFrame(f);
      window.__qaStart = () => { Object.assign(window.__qaF, { d: [], on: true, last: 0, t0: performance.now(), long: [] }); };
      window.__qaStop = () => { const F = window.__qaF; F.on = false; const d = F.d, s = [...d].sort((a, b) => b - a), n = Math.max(1, Math.floor(s.length * 0.01)); const avg = d.reduce((a, b) => a + b, 0) / d.length; return { frames: d.length, avgFps: +(1000 / avg).toFixed(1), low1Fps: +(1000 / (s.slice(0, n).reduce((a, b) => a + b, 0) / n)).toFixed(1), maxMs: +s[0].toFixed(1), long: F.long.slice(0, 8) }; };
    });
    const meas = async (ms) => { await p.evaluate(() => window.__qaStart()); await sleep(ms); return p.evaluate(() => window.__qaStop()); };
    // 1) 타이틀 탭 직후 레벨 선택(실제 흐름, 기다림 없음)
    await p.evaluate(() => window.__qaStart());
    await p.mouse.click(206, 450);
    await sleep(1500);
    const titleToLevels = await p.evaluate(() => window.__qaStop());
    // 2) 레벨 카드 → 시작 판 → ▶ 실제 클릭 직후 3 s (L10, 기다림 없이)
    await p.click('#lv9'); await p.waitForFunction(() => window.__game.state === 'start');
    await p.evaluate(() => window.__qaStart());
    await p.click('#stPlay');
    await sleep(3000);
    const levelStart = await p.evaluate(() => window.__qaStop());
    // 3) 무입력 실패 → 재시작 직후 3 s
    await p.waitForFunction(() => window.__game.phase === 'fail', null, { timeout: 30000 });
    const restart = await meas(3000);
    // 4) 플레이 중(완벽 입력 autoplay) 8 s, 두 공 레벨 L6
    await p.evaluate(() => { window.__game.loadLevel(5); window.__game.autoplay(0, 0, 3); });
    await sleep(1000);
    const play = await meas(8000);
    // 5) 레벨 선택 직접 시작(L1, 첫 진입 카드 없음) 3 s
    await p.evaluate(() => window.__game.show('levels'));
    await sleep(800);
    await p.click('#lv0'); await p.waitForFunction(() => window.__game.state === 'start');
    await p.evaluate(() => window.__qaStart());
    await p.click('#stPlay');
    await sleep(3000);
    const levelStartL1 = await p.evaluate(() => window.__qaStop());
    out.push({ run, dsf, titleToLevels, levelStart, restart, play, levelStartL1 });
    console.log(`run ${run} DPR ${dsf}: 타이틀→선택 ${titleToLevels.avgFps}/${titleToLevels.low1Fps} · 시작 ${levelStart.avgFps}/${levelStart.low1Fps} (max ${levelStart.maxMs}) · 재시작 ${restart.avgFps}/${restart.low1Fps} · 플레이 ${play.avgFps}/${play.low1Fps} · L1 시작 ${levelStartL1.avgFps}/${levelStartL1.low1Fps}`);
    await ctx.close();
  }
  save('perf', { throttle: 6, viewport: '412x915', runs: out });
};

// ---------- shots ----------
async function checkButtons(p) {
  return p.evaluate(() => {
    const vis = (el) => { let e = el; while (e) { const cs = getComputedStyle(e); if (e.hidden || cs.display === 'none' || cs.visibility === 'hidden') return false; e = e.parentElement; } return true; };
    const els = [...document.querySelectorAll('button')].filter(vis);
    const sc = document.getElementById('gScroll'), more = document.getElementById('gMore');
    const scrolls = sc && vis(sc) && sc.scrollHeight > sc.clientHeight + 1;
    const rects = els.map((b) => { const r = b.getBoundingClientRect(); return { id: b.id || b.getAttribute('aria-label'), x: r.left, y: r.top, w: r.width, h: r.height, inScroll: !!(scrolls && sc.contains(b)) }; }).filter((r) => r.w > 0 && r.h > 0);
    const out = [], W = innerWidth, H = innerHeight;
    if (scrolls && !(more && more.classList.contains('on'))) out.push('scroll without ▼');
    let minSide = 1e9;
    for (const r of rects) {
      minSide = Math.min(minSide, r.w, r.h);
      if (r.w < 47.5 || r.h < 47.5) out.push(`small ${r.id} ${r.w.toFixed(0)}x${r.h.toFixed(0)}`);
      if (!r.inScroll && (r.x < -0.5 || r.y < -0.5 || r.x + r.w > W + 0.5 || r.y + r.h > H + 0.5)) out.push(`offscreen ${r.id}`);
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1 && oy > 1) out.push(`overlap ${a.id} / ${b.id}`);
    }
    // 글 요소 잘림(보이는 .txt 가 화면 밖·넘침)
    for (const t of [...document.querySelectorAll('.txt, .title')].filter(vis)) {
      const r = t.getBoundingClientRect(); if (!r.width) continue;
      const inSc = scrolls && sc.contains(t);
      if (!inSc && (r.left < -0.5 || r.right > W + 0.5 || r.top < -0.5 || r.bottom > H + 0.5)) out.push(`text offscreen ${t.id || t.className}`);
      if (t.scrollWidth > t.clientWidth + 1) out.push(`text overflow ${t.id}`);
    }
    // 화면(.screen.show) 세로 넘침
    for (const s of document.querySelectorAll('.screen.show')) { if (s.scrollHeight > s.clientHeight + 1 && !scrolls) out.push(`screen overflow ${s.id} ${s.scrollHeight}>${s.clientHeight}`); }
    if (document.documentElement.scrollWidth > W + 1) out.push('page overflow-x');
    return { n: rects.length, minSide: +minSide.toFixed(1), issues: out };
  });
}
PARTS.shots = async () => {
  const RES = [[360, 640], [412, 915], [640, 360], [1280, 720]];
  const ui = [], shots = [], blank = [], px = [];
  const shot = async (p, name) => { await p.waitForTimeout(60); const f = join(SDIR, name); await p.screenshot({ path: f }); shots.push(name); return name; };
  for (const [w, h] of RES) {
    for (const lang of ['ko', 'en']) {
      const tag = `${w}x${h}-${lang}`;
      const { ctx, p } = await open(w, h, `?lang=${lang}`, { seed: SEED_PROGRESS });
      const chk = async (scr) => { const r = await checkButtons(p); ui.push({ tag, screen: scr, ...r }); };
      await shot(p, `${tag}-01-title.png`); await chk('title');
      // 타이틀 → 레벨 선택 전환: 프레임마다 카드 그림 준비 상태, 0/100/300/600/1000 ms 스크린샷
      await p.evaluate(() => {
        window.__qaB = { t0: null, fr: [] };
        const f = (t) => { const B = window.__qaB; if (B.t0 != null && t - B.t0 < 2000) { const im = [...document.querySelectorAll('#grid img')]; B.fr.push({ dt: +(t - B.t0).toFixed(0), n: im.length, complete: im.filter((x) => x.complete && x.naturalWidth > 0).length, state: window.__game.state }); } requestAnimationFrame(f); };
        requestAnimationFrame(f);
        document.addEventListener('pointerdown', () => { window.__qaB.t0 = performance.now(); }, { once: true, capture: true });
      });
      await p.mouse.click(w / 2, h / 2);
      if (lang === 'ko') { for (const ms of [30, 150, 400, 800]) { await p.waitForTimeout(ms === 30 ? 30 : ms - [30, 150, 400, 800][[30, 150, 400, 800].indexOf(ms) - 1]); await p.screenshot({ path: join(SDIR, `${tag}-02a-levels-${ms}ms.png`) }); shots.push(`${tag}-02a-levels-${ms}ms.png`); } }
      await p.waitForTimeout(1200);
      const bl = await p.evaluate(() => window.__qaB.fr);
      const firstAll = bl.find((f) => f.n > 0 && f.complete === f.n);
      blank.push({ tag, frames: bl.length, firstAllImagesMs: firstAll ? firstAll.dt : null, first: bl.slice(0, 6) });
      await shot(p, `${tag}-02-levels.png`); await chk('levels');
      await p.click('#lv2'); await p.waitForFunction(() => window.__game.state === 'start');
      await shot(p, `${tag}-03-start.png`); await chk('start');
      await p.click('#stReplay'); await p.waitForFunction(() => window.__game.state === 'card');
      await p.waitForTimeout(200);
      await shot(p, `${tag}-04-card.png`); await chk('card');
      await p.click('#cdClose'); await p.waitForFunction(() => window.__game.state === 'start');
      // 플레이(L3 구름, 일반 모드 실시간) — 3 s 뒤
      await p.click('#stPlay'); await p.waitForFunction(() => ['play', 'card'].includes(window.__game.state));
      if (await p.evaluate(() => window.__game.state === 'card')) { await p.waitForTimeout(300); await p.click('#cdClose'); }
      await p.waitForFunction(() => window.__game.state === 'play' && window.__game.judgeMs() > 1200);
      await shot(p, `${tag}-05-play.png`); await chk('play');
      // 실패(무입력 늦음) 0.3 s 뒤, 첫 실패 ↻
      await p.waitForFunction(() => window.__game.phase === 'fail', null, { timeout: 30000 });
      await p.waitForTimeout(250); await shot(p, `${tag}-06-fail-late.png`);
      await p.waitForTimeout(350); await shot(p, `${tag}-07-fail-retry.png`);
      await p.waitForFunction(() => window.__game.phase === 'run');
      // 멈춤
      await p.waitForTimeout(400);
      await p.click('#hPause'); await p.waitForFunction(() => window.__game.state === 'pause');
      await shot(p, `${tag}-08-pause.png`); await chk('pause');
      await p.click('#pResume'); await p.waitForFunction(() => window.__game.state === 'play');
      // 클리어(L1 autoplay, 실시간) → 클리어 연출·결과
      await p.evaluate(() => { window.__game.loadLevel(0); window.__game.autoplay(0, 0, 1); });
      await p.waitForFunction(() => window.__game.phase === 'clear', null, { timeout: 60000 });
      await p.waitForTimeout(600); await shot(p, `${tag}-09-clear.png`);
      await p.waitForFunction(() => window.__game.state === 'result' && !document.getElementById('rBtns').hidden, null, { timeout: 20000 });
      await p.waitForTimeout(150); await shot(p, `${tag}-10-result.png`); await chk('result');
      // 보호자(실제 길게 누르기)
      await p.click('#rLevels'); await p.waitForFunction(() => window.__game.state === 'levels');
      const gb = await p.locator('#lGate').boundingBox();
      await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await p.mouse.down(); await p.waitForTimeout(700);
      await shot(p, `${tag}-11-gate-hold.png`);
      await p.waitForTimeout(1000); await p.mouse.up();
      await p.waitForFunction(() => window.__game.state === 'guardian');
      await p.waitForTimeout(100);
      await shot(p, `${tag}-12-guardian.png`); await chk('guardian');
      await p.click('#gSync'); await p.waitForFunction(() => window.__game.state === 'sync');
      await shot(p, `${tag}-13-sync.png`); await chk('sync');
      await p.click('#sBack');
      // L1 손가락(일반 모드, 첫 진입 = 카드 → 플레이)
      await p.evaluate(() => { localStorage.setItem('rhythm02.v1', JSON.stringify({ v: 1, levels: {}, drift: { on: false, sessions: 0 } })); });
      await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
      await p.mouse.click(w / 2, h / 2); await p.waitForFunction(() => window.__game.state === 'levels');
      await p.click('#lv0'); await p.waitForFunction(() => window.__game.state === 'start');
      await p.click('#stPlay'); await p.waitForFunction(() => window.__game.state === 'card');
      await p.waitForTimeout(200); await shot(p, `${tag}-14-card-l1-first.png`); await chk('card-first');
      await p.mouse.click(w / 2, h / 2); // 카드 아무 곳 탭으로 닫기
      await p.waitForFunction(() => window.__game.state === 'play');
      await p.waitForFunction(() => window.__game.frameInfo().tut === true, null, { timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(120);
      await shot(p, `${tag}-15-l1-finger.png`); await chk('play-finger');
      await ctx.close();
    }
    // notext: 카드·플레이 공 px, 판정 대상(북) 크기
    {
      const tag = `${w}x${h}-notext`;
      const { ctx, p } = await open(w, h, '?notext=1&lang=ko', { seed: SEED_PROGRESS });
      await shot(p, `${tag}-01-title.png`);
      await p.mouse.click(w / 2, h / 2); await p.waitForFunction(() => window.__game.state === 'levels');
      await p.waitForTimeout(1200); await shot(p, `${tag}-02-levels.png`);
      await p.click('#lv0'); await p.waitForFunction(() => window.__game.state === 'start');
      await shot(p, `${tag}-03-start.png`);
      const ballHex = JSON.parse(readFileSync(join(PROJ, 'assets/palette.json'), 'utf8')).common.ball;
      await ctx.close();
      const { ctx: c2, p: q } = await open(w, h, '?notext=1&lang=ko', { seed: ALL_OPEN });
      await q.mouse.click(w / 2, h / 2); await q.waitForFunction(() => window.__game.state === 'levels');
      for (let li = 0; li < NL; li++) {
        await q.evaluate(() => window.__game.show('levels'));
        await q.click(`#lv${li}`); await q.waitForFunction(() => window.__game.state === 'start');
        const has = await q.evaluate(() => !document.getElementById('stReplay').hidden);
        if (!has) continue;
        await q.click('#stReplay'); await q.waitForFunction(() => window.__game.state === 'card');
        await q.waitForFunction(() => { const im = document.getElementById('cdImg'); return im.complete && im.naturalWidth > 0 && parseFloat(im.style.width) > 0; });
        await q.waitForTimeout(150);
        const name = await shot(q, `${tag}-card-L${li + 1}.png`);
        const m = await q.evaluate(async (ballHex) => {
          const im = document.getElementById('cdImg'), r = im.getBoundingClientRect();
          const c = document.createElement('canvas'); c.width = Math.round(r.width); c.height = Math.round(r.height);
          const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height);
          const d = x.getImageData(0, 0, c.width, c.height).data;
          const br = parseInt(ballHex.slice(1, 3), 16), bg = parseInt(ballHex.slice(3, 5), 16), bb = parseInt(ballHex.slice(5, 7), 16);
          const W = c.width, H = c.height, mask = new Uint8Array(W * H);
          for (let i = 0; i < W * H; i++) { const k = i * 4; if (Math.abs(d[k] - br) + Math.abs(d[k + 1] - bg) + Math.abs(d[k + 2] - bb) < 60 && d[k + 3] > 200) mask[i] = 1; }
          // 연결 요소 bbox
          const seen = new Uint8Array(W * H), blobs = [];
          for (let i = 0; i < W * H; i++) {
            if (!mask[i] || seen[i]) continue;
            const st = [i]; seen[i] = 1; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
            while (st.length) { const j = st.pop(), xx = j % W, yy = (j / W) | 0; n++; x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy);
              for (const q2 of [j - 1, j + 1, j - W, j + W]) if (q2 >= 0 && q2 < W * H && mask[q2] && !seen[q2] && Math.abs((q2 % W) - xx) <= 1) { seen[q2] = 1; st.push(q2); } }
            if (n >= 20) blobs.push({ w: x1 - x0 + 1, h: y1 - y0 + 1, n });
          }
          return { img: [+r.width.toFixed(1), +r.height.toFixed(1)], natural: [im.naturalWidth, im.naturalHeight], src: im.src.split('/').pop(), blobs };
        }, ballHex);
        // 공 지름 = 테두리 포함 안 함(채움 부분). 반쯤 숨은 공·손가락 등과 구분 위해 n 큰 blob 들의 max(w,h)
        const diam = m.blobs.map((b) => Math.max(b.w, b.h)).sort((a, b) => a - b);
        px.push({ tag, level: li + 1, kind: 'card', shot: name, src: m.src, img: m.img, ballBlobsPx: diam, minBallPx: diam.length ? diam[0] : null, maxBallPx: diam.length ? diam.at(-1) : null });
        await q.click('#cdClose');
      }
      // 플레이 공·북(렌더 기하 + 캔버스 픽셀)
      await q.evaluate(() => window.__game.show('levels'));
      await q.click('#lv0'); await q.waitForFunction(() => window.__game.state === 'start');
      await q.click('#stPlay'); await q.waitForFunction(() => window.__game.state === 'play');
      await q.waitForTimeout(900);
      const name = await shot(q, `${tag}-play-L1.png`);
      const g = await q.evaluate((ballHex) => {
        const G = window.__game.layout(), cv = document.getElementById('cv'), c = cv.getContext('2d'), dpr = cv.width / innerWidth;
        const d = c.getImageData(0, 0, cv.width, cv.height).data, W = cv.width;
        const br = parseInt(ballHex.slice(1, 3), 16), bg = parseInt(ballHex.slice(3, 5), 16), bb = parseInt(ballHex.slice(5, 7), 16);
        let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
        for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb) < 60) { const p = i / 4, x = p % W, y = (p / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        return { d: G.d, dw: +G.dw.toFixed(1), dh: +G.dh.toFixed(1), Hp: +G.Hp.toFixed(1), ballFillPx: [(x1 - x0 + 1) / dpr, (y1 - y0 + 1) / dpr] };
      }, ballHex);
      px.push({ tag, kind: 'play', shot: name, ...g });
      await c2.close();
    }
    console.log(`${w}x${h} 끝 (스크린샷 ${shots.length})`);
  }
  // 640x360 스크롤 표시 요약
  const issues = ui.filter((u) => u.issues.length);
  console.log(`버튼·글 검사 ${ui.length}화면, 문제 ${issues.length}: ${issues.slice(0, 6).map((u) => `${u.tag} ${u.screen}: ${u.issues.join(';')}`).join(' | ')}`);
  console.log(`카드 공 최소 px: ${px.filter((x) => x.kind === 'card').map((x) => `${x.tag} L${x.level} ${x.minBallPx}`).join(', ')}`);
  console.log(`플레이 공: ${px.filter((x) => x.kind === 'play').map((x) => `${x.tag} d ${x.d} (채움 ${x.ballFillPx.map((v) => v.toFixed(0)).join('x')})`).join(', ')}`);
  console.log(`타이틀→레벨 선택 카드 그림 다 준비: ${blank.map((b) => `${b.tag} ${b.firstAllImagesMs} ms`).join(', ')}`);
  save('shots', { shots, ui, px, blank });
};

// ---------- blank: 타이틀 → 레벨 선택 빈 화면(오케스트레이터 관찰) 재현·원인 ----------
PARTS.blank = async () => {
  const out = [];
  const conds = [{ name: 'base' }, { name: 'cpu6', cpu: 6 }, { name: 'cpu6-test(오디오 없음)', cpu: 6, test: true }, { name: 'net150', lat: 150 }, { name: 'cpu6+net150', cpu: 6, lat: 150 }];
  for (const cd of conds) for (const [w, h] of [[412, 915], [1280, 720]]) {
    const { ctx, p } = await open(w, h, cd.test ? '?test=1&lang=ko' : '?lang=ko', { seed: SEED_PROGRESS });
    const reqs = [];
    p.on('request', (r) => { if (/levelcards|icons|cards/.test(r.url())) reqs.push({ t: Date.now(), u: r.url().split('/').slice(-2).join('/') }); });
    const cdp = await ctx.newCDPSession(p);
    if (cd.cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cd.cpu });
    if (cd.lat) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: cd.lat, downloadThroughput: -1, uploadThroughput: -1 }); }
    await p.evaluate(() => {
      window.__qaB = { t0: null, fr: [] };
      const f = (t) => { const B = window.__qaB; if (B.t0 != null && t - B.t0 < 4000) { const im = [...document.querySelectorAll('#grid img')]; const r = document.getElementById('grid').getBoundingClientRect(); B.fr.push({ dt: +(t - B.t0).toFixed(0), n: im.length, complete: im.filter((x) => x.complete && x.naturalWidth > 0).length, gridH: Math.round(r.height), state: window.__game.state }); } requestAnimationFrame(f); };
      requestAnimationFrame(f);
      document.addEventListener('pointerdown', () => { window.__qaB.t0 = performance.now(); }, { once: true, capture: true });
    });
    reqs.length = 0;
    const tTap = Date.now();
    await p.mouse.click(w / 2, h / 2);
    const tag = `blank-${cd.name}-${w}x${h}`;
    await p.waitForTimeout(250); await p.screenshot({ path: join(SDIR, `${tag}-250ms.png`) });
    await p.waitForTimeout(3500);
    const fr = await p.evaluate(() => window.__qaB.fr);
    const firstAll = fr.find((f) => f.n > 0 && f.complete === f.n);
    const firstAny = fr.find((f) => f.complete > 0);
    // 같은 페이지에서 레벨 선택 두 번째 진입(뒤로 → 타이틀 → 다시)
    await p.click('#lBack'); await p.waitForTimeout(300);
    await p.evaluate(() => { window.__qaB.t0 = null; window.__qaB.fr = []; document.addEventListener('pointerdown', () => { window.__qaB.t0 = performance.now(); }, { once: true, capture: true }); });
    const n0 = reqs.length;
    await p.mouse.click(w / 2, h / 2); await p.waitForTimeout(3000);
    const fr2 = await p.evaluate(() => window.__qaB.fr);
    const second = fr2.find((f) => f.n > 0 && f.complete === f.n);
    const gaps = (a) => { let m = 0, at = null; for (let i = 1; i < a.length; i++) { const g = a[i].dt - a[i - 1].dt; if (g > m) { m = g; at = a[i - 1].dt; } } return { maxGapMs: m, at }; };
    out.push({ cond: cd.name, res: `${w}x${h}`, firstFrameMs: fr[0]?.dt, firstAnyImageMs: firstAny?.dt ?? null, allImagesMs: firstAll?.dt ?? null, imgRequestsAfterTap: n0, secondEntryAllImagesMs: second?.dt ?? null, imgRequestsSecondEntry: reqs.length - n0, firstEntryLongestFrame: gaps(fr), secondEntryLongestFrame: gaps(fr2), shot: `${tag}-250ms.png` });
    console.log(JSON.stringify(out.at(-1)));
    await ctx.close();
  }
  save('blank', { runs: out, note: 'serve.mjs 는 cache-control: no-store. buildGrid 가 showLevels 마다 img 를 새로 만듦' });
};

// ---------- firstrun: 빈 저장소 → 실제 UI 첫 실행 → 보호자 소리 맞추기 → L1 (자동 지연 변화·이중 보정, criteria 기술 품질 rhythm-01 round-2) ----------
// 들리는 박 = 소리 노드 예약 시각(when)을 예약 순간의 currentTime↔performance 표본으로 화면 시각으로 바꾼 값 + 들리는 순간의 실제 autoNow(outputLatency+baseLatency).
// 게임 내부 값(SY.t0·저장된 자동 지연)은 쓰지 않음(자기 일관 측정 금지). getOutputTimestamp 매핑도 함께 기록(대조).
const QA_AUDIO_INIT = `(() => {
  window.__qaA = { starts: [], lat: [] };
  const wrap = (C) => { const o = C.prototype.start; C.prototype.start = function (when, ...r) { try { const c = this.context; if (!(c instanceof OfflineAudioContext)) window.__qaCtx = c; const ots = c.getOutputTimestamp ? c.getOutputTimestamp() : null; window.__qaA.starts.push({ when: when || 0, ct: c.currentTime, pn: performance.now(), lat: ((c.outputLatency || 0) + (c.baseLatency || 0)) * 1000, ots: ots ? [ots.contextTime, ots.performanceTime] : null, off: c instanceof OfflineAudioContext, gain0: false }); } catch (e) {} return o.call(this, when, ...r); }; };
  wrap(OscillatorNode); wrap(AudioBufferSourceNode);
  const tick = () => { const c = window.__qaCtx; if (c) { const v = ((c.outputLatency || 0) + (c.baseLatency || 0)) * 1000; const L = window.__qaA.lat; if (!L.length || Math.abs(L[L.length - 1][1] - v) > 0.5) L.push([+performance.now().toFixed(1), +v.toFixed(1), c.state]); } setTimeout(tick, 5); };
  tick();
})();`;
const latOf = `(() => { const c = window.__qaCtx; return c ? ((c.outputLatency || 0) + (c.baseLatency || 0)) * 1000 : null; })()`;
PARTS.firstrun = async () => {
  const res = { scenarios: [] };
  const comp = bal.judge_clock.visual_comp_ms, C = bal.sound_sync;
  const med = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const ruleOffset = (diffs) => { let o = med(diffs) - comp; if (Math.abs(o) <= C.apply_only_if_abs_over_ms) o = 0; return Math.max(C.offset_clamp_ms[0], Math.min(C.offset_clamp_ms[1], o)); };
  const newPage = async () => {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await ctx.addInitScript(QA_AUDIO_INIT);
    const p = await ctx.newPage();
    p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) LOG.console.push(`[firstrun] ${m.type()}: ${m.text()}`); });
    p.on('pageerror', (e) => LOG.console.push(`[firstrun] pageerror: ${e.message}`));
    p.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) LOG.external.push(r.url()); });
    await p.goto(BASE() + '?lang=ko'); await p.waitForFunction(() => window.__game?.ready === true);
    await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
    await p.evaluate(() => { window.__qaT = []; document.addEventListener('pointerdown', (e) => { const c = window.__qaCtx; window.__qaT.push({ ts: e.timeStamp, lat: c ? ((c.outputLatency || 0) + (c.baseLatency || 0)) * 1000 : null }); }, { capture: true }); });
    return { ctx, p };
  };
  // 예약된 소리(지금 이후에 들릴 것)를 화면 시각으로: 같은 박 층은 100 ms 안이면 하나로
  const upcoming = (p, since) => p.evaluate((since) => {
    const c = window.__qaCtx, lat = c ? ((c.outputLatency || 0) + (c.baseLatency || 0)) * 1000 : 0;
    const xs = window.__qaA.starts.filter((x) => !x.off && x.pn >= since && x.when - x.ct > 0.02)
      .map((x) => ({ sched: x.pn + (x.when - x.ct) * 1000, latSched: x.lat, otsSched: x.ots ? x.ots[1] + (x.when - x.ots[0]) * 1000 : null })).sort((a, b) => a.sched - b.sched);
    const u = []; for (const x of xs) if (!u.length || x.sched - u[u.length - 1].sched > 100) u.push(x);
    return { now: performance.now(), lat, list: u };
  }, since);
  for (const sc of [{ X: 0, fast: true }, { X: -40, fast: true }, { X: 60, fast: true }, { X: 0, fast: false }, { X: 120, fast: false }]) {
    const { ctx, p } = await newPage();
    await p.mouse.click(206, 450); // 타이틀 실제 탭 = 오디오 잠금 해제
    const tUnlock = await p.evaluate(() => performance.now());
    await p.waitForFunction(() => window.__game.state === 'levels');
    if (!sc.fast) await sleep(3000);
    const gb = await p.locator('#lGate').boundingBox();
    await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await p.mouse.down(); await sleep(1600); await p.mouse.up();
    await p.waitForFunction(() => window.__game.state === 'guardian');
    await p.click('#gSync'); await p.waitForFunction(() => window.__game.state === 'sync');
    const tSync = await p.evaluate(() => performance.now());
    await p.mouse.move(206, 330);
    const taps = []; let guard = 0;
    while (taps.length < 40 && guard++ < 400) {
      const fin = await p.evaluate(() => window.__game.state !== 'sync' || !document.getElementById('sRedo').hidden);
      if (fin) break;
      const u = await upcoming(p, tSync);
      const nb = u.list.find((x) => x.sched + u.lat + sc.X > u.now + 20);
      if (!nb) { await sleep(50); continue; }
      const target = nb.sched + u.lat + sc.X; // 들리는 박(예약 + 지금 autoNow) + X
      if (target - u.now > 10) await sleep(target - u.now - 8);
      await p.evaluate((target) => new Promise((r) => { const f = () => (performance.now() >= target - 1 ? r() : setTimeout(f, 0)); f(); }), target);
      await p.mouse.down(); await sleep(60); await p.mouse.up();
      const ev = await p.evaluate(() => window.__qaT[window.__qaT.length - 1]);
      const heard = nb.sched + ev.lat; // 탭 순간 autoNow 로 다시 계산
      taps.push({ sched: +nb.sched.toFixed(1), latSched: +nb.latSched.toFixed(1), latAtTap: +ev.lat.toFixed(1), heard: +heard.toFixed(1), ts: +ev.ts.toFixed(1), tapMinusHeard: +(ev.ts - heard).toFixed(1), heardMinusScreenBeat: +(heard - (nb.sched + nb.latSched)).toFixed(1), otsMinusSched: nb.otsSched != null ? +(nb.otsSched - nb.sched).toFixed(1) : null });
      await sleep(150);
    }
    const sync = await p.evaluate(() => ({ buildResult: (window.__game.syncTap(0) || {}).result, offset: window.__game.offset, msg: document.getElementById('sMsg').textContent, drift: window.__game.drift(), save: { syncDone: window.__game.save().syncDone, latRef: window.__game.save().latRef } }));
    // 규칙 기대 오프셋: 사람이 들은 박 기준으로 친 탭 − 화면 박. 화면 박 = 게임이 의도한 박(예약 + 예약 당시 자동 지연; 소리 맞추기 박은 오프셋 없이 예약됨)
    const n = C.taps_per_round, uf = C.use_from_tap - 1;
    const used = [...taps.slice(0, n).slice(uf), ...taps.slice(n, 2 * n).slice(uf)];
    const expected = used.length ? ruleOffset(used.map((t) => t.ts - (t.heard - t.heardMinusScreenBeat))) : null;
    // L1: 보호자 → 레벨 선택 → L1 카드 닫기 → 곡 음 들림 vs 화면 박
    await p.click('#sBack'); await p.waitForFunction(() => window.__game.state === 'guardian');
    await p.click('#gBack'); await p.waitForFunction(() => window.__game.state === 'levels');
    await p.click('#lv0'); await p.waitForFunction(() => window.__game.state === 'start');
    await p.click('#stPlay'); await p.waitForFunction(() => window.__game.state === 'card');
    await sleep(300); await p.mouse.click(206, 330);
    await p.waitForFunction(() => window.__game.state === 'play');
    const tPlay = await p.evaluate(() => performance.now());
    await p.waitForFunction(() => window.__game.levelMs() > 2600);
    const Pstart = await p.evaluate(() => performance.now() - window.__game.levelMs());
    const u = await upcoming(p, tPlay);
    const beatMs = Ls[0].beatMs;
    const all = (await p.evaluate((tPlay) => window.__qaA.starts.filter((x) => !x.off && x.pn >= tPlay && x.when - x.ct > 0.02).map((x) => x.pn + (x.when - x.ct) * 1000), tPlay)).sort((a, b) => a - b);
    const uniq = []; for (const h of all) if (!uniq.length || h - uniq[uniq.length - 1] > 100) uniq.push(h);
    const audVsScreen = uniq.slice(0, 8).map((sched) => { const heard = sched + u.lat; const b = Math.round((heard - Pstart) / beatMs); return +(heard - (Pstart + b * beatMs)).toFixed(1); });
    const mAud = med(audVsScreen);
    const eEar = +(mAud + sc.X - comp).toFixed(1); // 들리는 박 + X 에 친 아이의 판정 오차
    const lat = await p.evaluate(() => window.__qaA.lat);
    const r = { scenario: sc, unlockToSyncMs: +(tSync - tUnlock).toFixed(0), latTimelineFromUnlock: lat.map((x) => [+(x[0] - tUnlock).toFixed(0), x[1], x[2]]), taps: taps.length, tapMinusHeard: taps.map((t) => t.tapMinusHeard), heardMinusScreenBeat: taps.map((t) => t.heardMinusScreenBeat), otsMinusSched: taps.map((t) => t.otsMinusSched), syncOffset: sync.offset, buildRaw: sync.buildResult ? +(+sync.buildResult.raw).toFixed(1) : null, expectedRaw: used.length ? +(med(used.map((t) => t.ts - (t.heard - t.heardMinusScreenBeat))) - comp).toFixed(1) : null, syncMsg: sync.msg, latRef: sync.save.latRef, driftOn: sync.drift.on, expectedOffset: expected, offsetErr: sync.offset != null && expected != null ? +(sync.offset - expected).toFixed(1) : null, play: { latNow: +u.lat.toFixed(1), audioVsScreenMs: audVsScreen, medianAudioVsScreen: mAud, eEarMs: eEar, ideal: +(sc.X - comp - (sync.offset ? -sync.offset : 0) + (sync.offset ? 0 : 0)).toFixed(1) } };
    res.scenarios.push(r);
    console.log(`firstrun X=${sc.X} ${sc.fast ? '빠름' : '느림(3 s)'}: 탭 ${taps.length}, 잠금→맞추기 ${r.unlockToSyncMs} ms, 지연 ${JSON.stringify(r.latTimelineFromUnlock.slice(0, 3))}, 오프셋 ${sync.offset} raw ${r.buildRaw} (QA raw ${r.expectedRaw}, 기대 ${expected}, 차 ${r.offsetErr}), 탭−들림 중앙 ${med(r.tapMinusHeard)}, L1 들림−화면 ${mAud} ms, 귀로 친 아이 e ${eEar} ms, 밀림 ${sync.drift.on}`);
    await ctx.close();
  }
  // 빠른 아이: 빈 저장소 → 타이틀 탭 → 곧바로 L1 ▶ (자동 지연이 바뀌기 전 시작) → latRef·밀림 표지·곡 들림
  {
    const { ctx, p } = await newPage();
    await p.mouse.click(206, 450);
    const t0 = await p.evaluate(() => performance.now());
    await p.waitForFunction(() => window.__game.state === 'levels');
    await p.click('#lv0'); await p.click('#stPlay');
    await p.waitForFunction(() => window.__game.state === 'card'); await p.mouse.click(206, 330);
    await p.waitForFunction(() => window.__game.state === 'play');
    const tPlay = await p.evaluate(() => performance.now());
    await p.waitForFunction(() => window.__game.levelMs() > 2600);
    const Pstart = await p.evaluate(() => performance.now() - window.__game.levelMs());
    const u = await upcoming(p, tPlay - 2000);
    const beatMs = Ls[0].beatMs;
    const audVsScreen = u.list.slice(0, 8).map((x) => { const heard = x.sched + u.lat; const b = Math.round((heard - Pstart) / beatMs); return +(heard - (Pstart + b * beatMs)).toFixed(1); });
    const first = await p.evaluate((t0) => ({ latRef: window.__game.save().latRef, driftOn: window.__game.save().drift.on, lat: window.__qaA.lat.map((x) => [+(x[0] - t0).toFixed(0), x[1]]) }), t0);
    await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
    await p.mouse.click(206, 450); await p.waitForFunction(() => window.__game.state === 'levels');
    await sleep(1000);
    await p.click('#lv0'); await p.click('#stPlay'); await p.waitForFunction(() => window.__game.state === 'play');
    await sleep(300);
    const second = await p.evaluate(() => ({ latRef: window.__game.save().latRef, driftOn: window.__game.save().drift.on, autoLat: window.__game.drift().autoLat }));
    res.fastChild = { startDelayMs: +(tPlay - t0).toFixed(0), first, audioVsScreenMs: audVsScreen, secondLoad: second };
    console.log(`빠른 첫 시작(탭→플레이 ${res.fastChild.startDelayMs} ms): latRef ${first.latRef}, 밀림 ${first.driftOn}, 곡 들림−화면 ${JSON.stringify(audVsScreen)} · 다음 로드 latRef ${second.latRef} 밀림 ${second.driftOn} autoLat ${second.autoLat}`);
    await ctx.close();
  }
  save('firstrun', res);
};

// ---------- testeq ----------
PARTS.testeq = async () => {
  const W = 412, H = 915, cases = [{ li: 0, lms: [1500, 2700, 2950, 3100, 5200] }, { li: 5, lms: [3000, 9000] }];
  const res = [];
  const { ctx, p } = await open(W, H, '', { seed: ALL_OPEN });
  const { ctx: c2, p: q } = await open(W, H, '?test=1', { seed: ALL_OPEN });
  await p.mouse.click(200, 400); await p.waitForFunction(() => window.__game.state === 'levels');
  const grab = `(() => { const cv = document.getElementById('cv'); const c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height).data; return d; })()`;
  for (const cs of cases) {
    for (const lm of cs.lms) {
      // 일반 모드: 완벽 입력 실시간, 레벨 시각 lm 을 지나는 첫 rAF 에서 캔버스 픽셀 + DOM 상태
      const A = await p.evaluate(async ({ li, lm }) => {
        const g = window.__game; g.loadLevel(li); g.autoplay(0, 0, 1);
        return await new Promise((res) => { const f = () => { const t = g.levelMs(); if (t >= lm) { const cv = document.getElementById('cv'), c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height).data; res({ lm: t, px: Array.from(d.filter((_, i) => i % 4 !== 3 && (i >> 2) % 7 === 0)), tut: !document.getElementById('hTut').hidden, hud: !document.getElementById('hud').hidden, pause: !document.getElementById('hPause').hidden, phase: g.phase, hits: g.hits() }); } else requestAnimationFrame(f); }; requestAnimationFrame(f); });
      }, { li: cs.li, lm });
      // 테스트 모드: 같은 레벨 시각(일반 모드가 잡힌 실제 lm)까지 같은 탭으로
      const Bq = await q.evaluate(({ li, lm, hits }) => {
        const g = window.__game; g.loadLevel(li);
        const cs = g.contacts();
        for (let k = 0; k < cs.length; k++) { const h = hits[k]; if (h == null) break; if (h + 40 > lm) break; g.pressAt(h); }
        g.step((lm - g.levelMs()) / 1000);
        const cv = document.getElementById('cv'), c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height).data;
        return { lm: g.levelMs(), px: Array.from(d.filter((_, i) => i % 4 !== 3 && (i >> 2) % 7 === 0)), tut: !document.getElementById('hTut').hidden, hud: !document.getElementById('hud').hidden, pause: !document.getElementById('hPause').hidden, phase: g.phase };
      }, { li: cs.li, lm: A.lm, hits: A.hits });
      let diff = 0, big = 0;
      for (let i = 0; i < A.px.length; i++) { const e = Math.abs(A.px[i] - Bq.px[i]); diff += e; if (e > 40) big++; }
      const r = { level: cs.li + 1, lm_normal: +A.lm.toFixed(1), lm_test: +Bq.lm.toFixed(1), meanAbsDiff: +(diff / A.px.length).toFixed(3), bigDiffShare: +(big / A.px.length).toFixed(4), dom_same: A.tut === Bq.tut && A.hud === Bq.hud && A.pause === Bq.pause && A.phase === Bq.phase, dom_normal: { tut: A.tut, hud: A.hud, pause: A.pause, phase: A.phase }, dom_test: { tut: Bq.tut, hud: Bq.hud, pause: Bq.pause, phase: Bq.phase } };
      res.push(r);
      console.log(`L${r.level} ${lm} ms: 픽셀 평균 차 ${r.meanAbsDiff}, 큰 차 ${r.bigDiffShare}, DOM 같음 ${r.dom_same} ${JSON.stringify(r.dom_normal)} vs ${JSON.stringify(r.dom_test)}`);
      await p.evaluate(() => window.__game.show('levels'));
    }
  }
  // 같은 장면 스크린샷 쌍(L1 손가락)
  await p.evaluate(async () => { const g = window.__game; g.loadLevel(0); await new Promise((r) => { const f = () => (g.levelMs() >= 2900 ? r() : requestAnimationFrame(f)); f(); }); g.show('pause'); });
  await q.evaluate(() => { const g = window.__game; g.loadLevel(0); g.step((2900 - g.levelMs()) / 1000); });
  await q.screenshot({ path: join(SDIR, 'testeq-412x915-test-L1-2900ms.png') });
  await ctx.close(); await c2.close();
  save('testeq', { viewport: `${W}x${H}`, cases: res, note: '일반 모드는 rAF 시각이 목표를 지난 첫 프레임, 테스트 모드는 그 시각까지 가상 시계로 진행. 픽셀은 7픽셀마다 RGB 표본' });
};

// ---------- sound ----------
PARTS.sound = async () => {
  const { ctx, p } = await open(640, 360, '?test=1');
  const S = JSON.parse(readFileSync(join(GAME, 'data/sound.json'), 'utf8'));
  const levels = bal.levels.map((pp) => JSON.parse(readFileSync(join(PROJ, pp), 'utf8')));
  const r = await p.evaluate(async ({ S, levels }) => {
    const { AudioOut, noteOf } = await import('./js/audio.js');
    const { musicOnsets } = await import('./js/music.js');
    const SR = S.sample_rate || 48000;
    const mk = (len) => { const A = new AudioOut(S); A.ctx = new OfflineAudioContext(1, Math.round(len * SR), SR); A._graph(); return A; };
    const meas = (buf, t0) => { let pk = 0; for (const v of buf) pk = Math.max(pk, Math.abs(v)); const s0 = Math.round(t0 * SR), n = Math.round(0.1 * SR); let ss = 0; for (let i = 0; i < n; i++) ss += (buf[s0 + i] || 0) ** 2; return { peak: 20 * Math.log10(Math.max(pk, 1e-12)), rms: 10 * Math.log10(Math.max(ss / n, 1e-24)) }; };
    const one = {};
    for (const name of Object.keys(S.sounds)) {
      const def = S.sounds[name], pitched = def.layers.some((L) => L.note);
      const fs = [];
      if (!pitched) fs.push(null);
      else for (const lv of levels) { const id = String(lv.id).padStart(2, '0'); const ons = musicOnsets(lv, S).filter((o) => o.sound === name); for (const o of ons.slice(0, 40)) fs.push(noteOf(S, id, o)); }
      let worst = null;
      for (const f of [...new Set(fs)]) {
        const A = mk(1.6); A.play(name, 0.05, f);
        const buf = (await A.ctx.startRendering()).getChannelData(0);
        const fd = Math.min(...def.layers.map((L) => L.delayMs || 0)) / 1000;
        const m = meas(buf, 0.05 + fd);
        if (!worst || m.peak > worst.peak) worst = { ...m, f, rmsMin: Math.min(m.rms, worst?.rmsMin ?? 0) }; else worst.rmsMin = Math.min(worst.rmsMin, m.rms);
      }
      one[name] = worst;
    }
    // 곡 박: 레벨 곡 전체를 빌드 경로(musicOnsets → noteOf → play)로 렌더하고, 음이 시작하는 박마다 100 ms RMS·최고값
    const song = {};
    for (const lv of levels) {
      const id = String(lv.id).padStart(2, '0'), beatMs = 60000 / lv.bpm, ons = musicOnsets(lv, S);
      const len = (lv.length_beats * beatMs) / 1000 + 1.5;
      const A = mk(len);
      for (const o of ons) A.play(o.sound, 0.05 + o.beat * beatMs / 1000, noteOf(S, id, o));
      const buf = (await A.ctx.startRendering()).getChannelData(0);
      let best = { rms: -999, peak: -999, beat: null };
      for (const b of [...new Set(ons.map((o) => o.beat))]) { const m = meas(buf.subarray(Math.round((0.05 + b * beatMs / 1000) * SR), Math.round((0.05 + b * beatMs / 1000 + 0.5) * SR)), 0); if (m.rms > best.rms) best = { ...best, rms: m.rms, beat: b }; if (m.peak > best.peak) best.peak = m.peak; }
      song[id] = { rms: +best.rms.toFixed(2), peak: +best.peak.toFixed(2), beat: best.beat };
    }
    return { one, song };
  }, { S, levels });
  const taps = S.verify.loudness_rule.child_tap;
  const tapPeakMin = Math.min(...taps.map((k) => r.one[k].peak)), tapRmsMin = Math.min(...taps.map((k) => r.one[k].rmsMin));
  let sfxMax = -999, sfxName = '';
  for (const [k, v] of Object.entries(r.one)) if (S.sounds[k].bus === 'sfx' && !taps.includes(k) && v.peak > sfxMax) { sfxMax = v.peak; sfxName = k; }
  const beatRms = Math.max(...Object.values(r.song).map((x) => x.rms)), beatPeak = Math.max(...Object.values(r.song).map((x) => x.peak));
  const cmp = Object.fromEntries(Object.entries(r.one).map(([k, v]) => [k, { build_peak: +v.peak.toFixed(2), art_peak: S.sounds[k].peak_db, d_peak: +(v.peak - S.sounds[k].peak_db).toFixed(2), build_rms: +v.rmsMin.toFixed(2), art_rms: S.sounds[k].rms_db }]));
  const out = { per_sound: cmp, song_beats: r.song, tap_peak_min: +tapPeakMin.toFixed(2), sfx_peak_max: +sfxMax.toFixed(2), sfx_peak_max_sound: sfxName, tap_over_sfx_db: +(tapPeakMin - sfxMax).toFixed(2), tap_rms_min: +tapRmsMin.toFixed(2), beat_rms_max: +beatRms.toFixed(2), tap_over_beat_rms_db: +(tapRmsMin - beatRms).toFixed(2), beat_peak_max: +beatPeak.toFixed(2), tap_over_beat_peak_db: +(tapPeakMin - beatPeak).toFixed(2), art_measured: S.verify.measured };
  console.log(`탭 최고 ${out.tap_peak_min} − 효과음 최고 ${out.sfx_peak_max}(${sfxName}) = ${out.tap_over_sfx_db} dB (≥1) · 탭 RMS ${out.tap_rms_min} − 곡 박 RMS ${out.beat_rms_max} = ${out.tap_over_beat_rms_db} dB (≥6) · 최대 |Δpeak| vs art ${Math.max(...Object.values(cmp).map((c) => Math.abs(c.d_peak))).toFixed(2)} dB`);
  await ctx.close();
  save('sound', out);
};

// ---------- signal ----------
PARTS.signal = async () => {
  const out = { test: [], realtime: null };
  const L = Ls[0], c1 = L.contacts[1];
  const danger = [c1.zoneStart, c1.passEnd];
  for (const [w, h] of [[360, 640], [412, 915], [640, 360], [1280, 720]]) {
    const { ctx, p } = await open(w, h, '?test=1');
    const r = await p.evaluate(() => {
      const g = window.__game; g.loadLevel(0);
      const vis = [];
      for (let k = 0; k < 2000; k++) { g.step(0.004); if (g.attempts > 1) break; const fi = g.frameInfo(); vis.push([+fi.levelMs.toFixed(1), fi.tut]); }
      return { vis, finger: g.finger(), contacts: g.contacts().slice(0, 3) };
    });
    const on = r.vis.filter((v) => v[1]);
    out.test.push({ res: `${w}x${h}`, tut_from: on.length ? on[0][0] : null, tut_to: on.length ? on.at(-1)[0] : null, finger: r.finger });
    await ctx.close();
  }
  // 일반 모드 rAF: L1 첫 진입(카드 닫음) 뒤 손가락 보이는 프레임
  {
    const { ctx, p } = await open(412, 915, '');
    await p.mouse.click(200, 400); await p.waitForFunction(() => window.__game.state === 'levels');
    await p.evaluate(() => {
      window.__qaS = [];
      const f = () => { const g = window.__game, fi = g.frameInfo(); if (g.state === 'play') window.__qaS.push([+fi.levelMs.toFixed(1), fi.tut]); requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    await p.click('#lv0'); await p.waitForFunction(() => window.__game.state === 'start');
    await p.click('#stPlay'); await p.waitForFunction(() => window.__game.state === 'card');
    await p.waitForTimeout(300); await p.mouse.click(200, 400);
    await p.waitForFunction(() => window.__game.state === 'play');
    await p.waitForFunction(() => window.__game.attempts >= 2 || window.__game.levelMs() > 3400, null, { timeout: 30000 });
    const s = await p.evaluate(() => window.__qaS);
    const on = s.filter((v) => v[1]);
    out.realtime = { tut_from: on.length ? on[0][0] : null, tut_to: on.length ? on.at(-1)[0] : null, frames_on: on.length };
    await ctx.close();
  }
  const comp = bal.judge_clock.visual_comp_ms;
  // 손가락은 화면 레벨 시각(lt) 기준, 위험 구간은 판정 시각 → 화면 시각 = 판정 + visual_comp
  const dangerScreen = [danger[0] + comp, danger[1] + comp];
  const ov = (a, b) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
  out.danger_next_contact_judge_ms = danger; out.danger_next_contact_screen_ms = dangerScreen;
  for (const t of out.test) { t.overlap_judge_ms = ov([t.tut_from, t.tut_to], danger); t.overlap_screen_ms = ov([t.tut_from, t.tut_to], dangerScreen); t.gap_to_danger_screen_ms = +(dangerScreen[0] - t.tut_to).toFixed(1); }
  if (out.realtime.tut_from != null) { out.realtime.overlap_judge_ms = ov([out.realtime.tut_from, out.realtime.tut_to], danger); out.realtime.overlap_screen_ms = ov([out.realtime.tut_from, out.realtime.tut_to], dangerScreen); }
  out.first_contact = { t: L.contacts[0].t, passStart: L.contacts[0].passStart, passEnd: L.contacts[0].passEnd, zoneStart: L.contacts[0].zoneStart };
  console.log(JSON.stringify(out));
  save('signal', out);
};

// ---------- features ----------
PARTS.features = async () => {
  const res = {};
  const { ctx, p } = await open(412, 915, '');
  await p.mouse.click(200, 400); await p.waitForFunction(() => window.__game.state === 'levels');
  // L1 실시간 클리어 + L2 부분 진행(최고 기록) → 새로고침 뒤 유지
  await p.evaluate(async () => { const g = window.__game; g.loadLevel(0); await g.autoplay(0, 0, 1); });
  await p.waitForFunction(() => window.__game.state === 'result' || window.__game.phase === 'clear', null, { timeout: 20000 });
  await p.evaluate(async () => { const g = window.__game; g.loadLevel(1); const cs = g.contacts(); const half = Math.floor(cs.length / 2); await new Promise((res) => { const iv = setInterval(() => { const i = g.judgeLog().length; if (i >= half || g.phase !== 'run') { clearInterval(iv); res(); return; } if (cs[i].t - g.judgeMs() < 5) document.getElementById('cv').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true, button: 0 })); }, 1); }); });
  await p.waitForFunction(() => window.__game.phase === 'fail', null, { timeout: 20000 });
  const before = await p.evaluate(() => window.__game.save());
  await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
  const after = await p.evaluate(() => window.__game.save());
  await p.mouse.click(200, 400); await p.waitForFunction(() => window.__game.state === 'levels');
  const lv = await p.evaluate(() => ({ l2: document.getElementById('lv1').getAttribute('aria-label'), l2bar: document.querySelector('#lv1 [role=progressbar]')?.getAttribute('aria-valuenow'), l3open: document.getElementById('lv2').getAttribute('aria-disabled') !== 'true' }));
  await p.screenshot({ path: join(SDIR, 'features-412x915-levels-after-reload.png') });
  res.persist = { before: before.levels, after: after.levels, same: JSON.stringify(before.levels) === JSON.stringify(after.levels), levelSelect: lv };
  console.log(`저장 유지 ${res.persist.same} ${JSON.stringify(lv)}`);
  // 백그라운드: 강제 visibilitychange
  res.background = await p.evaluate(async () => {
    const g = window.__game; g.loadLevel(2);
    await new Promise((r) => setTimeout(r, 1500));
    const a0 = g.audioState();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    const st = g.state, lt0 = g.levelMs();
    await new Promise((r) => setTimeout(r, 1000));
    const lt1 = g.levelMs(), a1 = g.audioState();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 200));
    const stAfterVisible = g.state;
    document.getElementById('pResume').click();
    await new Promise((r) => setTimeout(r, 100));
    return { audioBefore: a0, stateOnHidden: st, levelMsFrozen: +(lt1 - lt0).toFixed(1), audioWhileHidden: a1, stateAfterVisible: stAfterVisible, stateAfterResume: g.state, pTitle: document.getElementById('pTitle').textContent };
  });
  console.log(`백그라운드(강제) ${JSON.stringify(res.background)}`);
  // 실제 탭 전환 시도: 다른 페이지를 앞으로
  {
    await p.evaluate(() => { window.__game.loadLevel(2); });
    await sleep(1200);
    const other = await ctx.newPage(); await other.goto('about:blank'); await other.bringToFront();
    await sleep(600);
    const st = await p.evaluate(() => ({ state: window.__game.state, vis: document.visibilityState }));
    await p.bringToFront(); await sleep(300);
    res.background_real_tab = st;
    await other.close();
    console.log(`실제 탭 전환(헤드리스) ${JSON.stringify(st)}`);
  }
  // 음소거: 멈춤 메뉴 소리 버튼 실제 클릭
  await p.evaluate(() => { const g = window.__game; if (g.state !== 'play') g.loadLevel(2); });
  await sleep(500);
  await p.click('#hPause'); await p.waitForFunction(() => window.__game.state === 'pause');
  const s0 = await p.evaluate(() => ({ sound: window.__game.save().sound, aria: document.getElementById('pSound').getAttribute('aria-label') }));
  await p.click('#pSound'); await sleep(100);
  const s1 = await p.evaluate(() => ({ sound: window.__game.save().sound, aria: document.getElementById('pSound').getAttribute('aria-label') }));
  await p.click('#pResume'); await sleep(200);
  // 음소거 중 실제로 마스터 뒤 출력이 0인지: 오디오 그래프 mute 게인 값 확인은 내부라 소리 분석기로 측정
  const level = await p.evaluate(async () => {
    // 출력 탭: destination 앞에 분석기를 둘 수 없으니, 음소거 게인 노드가 0인지 AudioParam 값으로 확인
    return null;
  });
  void level;
  await p.reload(); await p.waitForFunction(() => window.__game?.ready === true);
  const s2 = await p.evaluate(() => window.__game.save().sound);
  res.mute = { before: s0, afterClick: s1, afterReload: s2 };
  console.log(`음소거 ${JSON.stringify(res.mute)}`);
  // 보호자 문: 짧게(0.3 s) = 보조 글, 1.0 s 놓기 = 열리지 않음, 1.6 s = 보호자 화면, 길게 누른 채 손가락 밖으로
  await p.mouse.click(200, 400); await p.waitForFunction(() => window.__game.state === 'levels');
  const gb = await p.locator('#lGate').boundingBox();
  const cx = gb.x + gb.width / 2, cy = gb.y + gb.height / 2;
  await p.mouse.move(cx, cy); await p.mouse.down(); await sleep(300); await p.mouse.up(); await sleep(100);
  const g1 = await p.evaluate(() => ({ state: window.__game.state, hint: !document.getElementById('lHint').hidden, hintText: document.getElementById('lHint').textContent }));
  await p.mouse.down(); await sleep(1000); await p.mouse.up(); await sleep(100);
  const g2 = await p.evaluate(() => window.__game.state);
  await p.mouse.down(); await sleep(800); await p.mouse.move(cx, cy + 200); await sleep(900); await p.mouse.up(); await sleep(100);
  const g3 = await p.evaluate(() => window.__game.state);
  await p.mouse.move(cx, cy); await p.mouse.down(); await sleep(1650); await p.mouse.up(); await sleep(100);
  const g4 = await p.evaluate(() => window.__game.state);
  res.gate = { short300: g1, release1000: g2, slideOut: g3, hold1650: g4 };
  console.log(`보호자 문 ${JSON.stringify(res.gate)}`);
  // 멈춤 메뉴: 다시·레벨 고르기
  await p.evaluate(() => window.__game.loadLevel(0)); await sleep(800);
  await p.click('#hPause'); await p.waitForFunction(() => window.__game.state === 'pause');
  await p.click('#pRetry'); await sleep(200);
  const r1 = await p.evaluate(() => ({ state: window.__game.state, lm: window.__game.levelMs() }));
  await p.click('#hPause'); await p.click('#pLevels'); await sleep(200);
  const r2 = await p.evaluate(() => window.__game.state);
  res.pauseMenu = { retry: r1, levels: r2 };
  // Esc 키 멈춤
  await p.evaluate(() => window.__game.loadLevel(0)); await sleep(500); await p.keyboard.press('Escape'); await sleep(100);
  res.pauseMenu.esc = await p.evaluate(() => window.__game.state);
  console.log(`멈춤 메뉴 ${JSON.stringify(res.pauseMenu)}`);
  await ctx.close();
  save('features', res);
};

// ====================================================================
const list = PART === 'all' ? ['static', 'signal', 'sound', 'testeq', 'realtime', 'restart', 'features', 'shots', 'perf', 'bots'] : PART.split(',');
if (list.some((x) => x !== 'static')) {
  await startServer();
  browser = await pw.chromium.launch({ channel: CHANNEL, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  appendFileSync(join(PDIR, 'pids.log'), `${new Date().toISOString()} part=${PART} browser pid ${browser.process?.()?.pid ?? '?'} (playwright launch, browser.close 로 종료)\n`);
}
for (const name of list) {
  console.log(`== ${name} ==`);
  const t = Date.now();
  try { await PARTS[name](); } catch (e) { console.log(`ERROR ${name}: ${e.stack || e}`); save(name + '-error', { error: String(e.stack || e) }); }
  console.log(`(${name} ${((Date.now() - t) / 1000).toFixed(0)} s)`);
}
if (browser) await browser.close();
cleanup();
console.log(`끝 (서버 pid ${server ? server.pid : '-'} 종료)`);
