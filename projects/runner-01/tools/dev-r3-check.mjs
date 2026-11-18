#!/usr/bin/env node
// 개발 round-3 자체 확인 (game-developer): 콤보 연출 강화 (30-art 5-8, 결정 18~22)
//
//   PLAYWRIGHT_CORE=<playwright-core 폴더> node projects/runner-01/tools/dev-r3-check.mjs [--part judge,shots,grep] [--port 8133] [--channel msedge] [--n 60]
//
// judge  판정 글 생략률 (결정 19: 레벨 전체 ≤ 5 %, 입력 종류별 ≤ 10 %): 4해상도 × 10레벨 × (완벽 입력 + 박자 입력 + σ50 봇 n회) 클리어·실패 시도 전부의 판정.
//        같은 실행에서 클리어 시도 판정 수 = judge_taps 길이, 놓침 없는 클리어 최고 콤보 = 판정 탭 수 (결정 21, criteria runner-01 round-2 줄)
// shots  30-art 5-8-9 #26: 4해상도 × L7·L8·L10 큰 숫자 블록과 오브젝트 겹침 장면(가까움 α), 파티클 4단계 장면(흑백 + 흐림 3 px 포함),
//        판정 글(땅·고리), 움직임 줄이기(prefers-reduced-motion) 장면, 레벨 카드 칩·결과 줄
// grep   games/reverbound/ 원본 보호 grep (레퍼런스 이름 + 공식 한국어 번역어 + 콤보 벤치마크 이름)
// 서버: tools/serve.mjs를 --port(8130~8149, 개발 대역)로 띄우고 그 PID만 종료. 결과: reviews/dev-selfcheck/r3-check.json, r3c-*.png
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const OUT = join(ROOT, 'projects/runner-01/reviews/dev-selfcheck');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PARTS = new Set(opt('--part', 'judge,shots,grep').split(','));
const PORT = +opt('--port', 8133);
if (PORT < 8130 || PORT > 8149) throw new Error('포트는 8130~8149만 (runner-01 개발 대역)');
const N = +opt('--n', 60);
const channel = opt('--channel', 'msedge');
const DATA = join(ROOT, 'games/reverbound/data');
const bal = JSON.parse(readFileSync(join(DATA, 'balance.json'), 'utf8'));
const hz = bal.physics_hz;
mkdirSync(OUT, { recursive: true });
const R = { problems: [], console: [], external: [] };
const RES = [[640, 360], [1280, 720], [360, 640], [412, 915]];

// ------------------------------------------------------------------ grep (브라우저 없음)
if (PARTS.has('grep')) {
  const words = ['Geometry Dash', 'GeometryDash', 'Geometry-Dash', 'RobTop', 'Rob Top', '지오메트리', '로브탑', '롭탑', 'Stereo Madness', 'Back On Track', 'Polargeist', 'Dry Out', 'Base After Base',
    "Can't Let Go", 'Jumper', 'Time Machine', 'Cycles', 'xStep', 'Clutterfunk', 'Theory of Everything', 'Electroman', 'Clubstep', 'Electrodynamix', 'Hexagon Force', 'Blast Processing', 'Geometrical Dominator',
    'Deadlocked', 'Fingerdash', '스테레오 매드니스', '폴라가이스트', '클럽스텝', '헥사곤', '데드락드', '일렉트로맨', 'The Vault', 'Mana orb', 'Secret Coin', 'User Coin', 'Map Pack', '비밀 코인', '유저 코인', '맵 팩',
    'Waterflame', 'DJVI', 'F-777', 'DJMAX', 'DJ MAX', 'DJMax', '디제이맥스', '디맥', 'Neowiz', '네오위즈', 'Pentavision', '펜타비전', 'MAX COMBO'];
  // 화면 글자(strings.json 값·index.html 글)에만: 레퍼런스 화면 글자와 그 음역 (결정 23). 코드 이름·주석의 combo는 대상 아님
  const screenWords = ['COMBO', '콤보', 'PERFECT', 'FEVER', 'BREAK'];
  const S = JSON.parse(readFileSync(join(DATA, 'strings.json'), 'utf8'));
  const vals = [...Object.values(S.strings).flatMap((v) => [v.ko, v.en]), ...S.death_messages.flatMap((v) => [v.ko, v.en]), ...S.clear_subtitles.flatMap((v) => [v.ko, v.en])].join('\n');
  const htmlText = readFileSync(join(ROOT, 'games/reverbound/index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, (m) => (m.match(/\/\*BOOT\*\/([\s\S]*?)\/\*\/BOOT\*\//)?.[1] ?? '')).replace(/<[^>]+>/g, ' ');
  const hits = [];
  for (const w of screenWords) if (new RegExp(w, 'i').test(vals) || new RegExp(w, 'i').test(htmlText)) hits.push(`화면 글자: ${w}`);
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|json|html|css|svg|md|txt)$/.test(f)) { const s = readFileSync(p, 'utf8'); for (const w of words) { const re = new RegExp(/^[A-Za-z]/.test(w) ? `\\b${w.replace(/[-]/g, '\\-')}\\b` : w, /^[A-Z]+$/.test(w) ? '' : 'i'); if (re.test(s)) hits.push(`${relative(ROOT, p)}: ${w}`); } } } };
  walk(join(ROOT, 'games/reverbound'));
  R.grep = { words: words.length, screenWords, hits };
  console.log(`grep: 낱말 ${words.length}개, 히트 ${hits.length}`); for (const h of hits) console.log('  ' + h);
  if (hits.length) R.problems.push(`grep 히트 ${hits.length}`);
}

const NEED = ['judge', 'shots'].some((p) => PARTS.has(p));
let srv = null, browser = null;
if (NEED) {
  srv = spawn(process.execPath, [join(HERE, 'serve.mjs'), String(PORT)], { stdio: 'ignore' });
  console.log('server pid', srv.pid, 'port', PORT);
  await new Promise((r) => setTimeout(r, 700));
  const pw = await import(process.env.PLAYWRIGHT_CORE ? pathToFileURL(join(process.env.PLAYWRIGHT_CORE, 'index.mjs')).href : 'playwright-core');
  browser = await (pw.chromium ?? pw.default.chromium).launch({ channel, headless: true });
}
const BASE = `http://localhost:${PORT}/games/reverbound/`;
async function open(w, h, q = '?test=1', extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...extra });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) R.console.push(`[${w}x${h}${q}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => R.console.push(`[${w}x${h}${q}] pageerror: ${e.message}`));
  p.on('request', (r) => { const u = new URL(r.url()); if (['http:', 'https:'].includes(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) R.external.push(r.url()); });
  await p.goto(BASE + q);
  await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 20000 });
  return { ctx, p };
}
const shot = async (p, name) => p.screenshot({ path: join(OUT, `r3c-${name}.png`) });

try {
  // ---------------------------------------------------------------- judge
  if (PARTS.has('judge')) {
    R.judge = {};
    for (const [w, h] of RES) {
      const tag = `${w}x${h}`;
      const { ctx, p } = await open(w, h);
      const res = await p.evaluate(({ N, hz }) => {
        const G = window.__game;
        // σ50 봇 (combo-build-check와 같은 생성식, 시드 고정): 박자 입력열 + 정규 오차 σ 50 ms, 놓침 2 %
        let a = 12345; const rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        const bot = (base) => { const o = []; for (const k of base) { if (rnd() < 0.02) continue; const g = Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd()); o.push(Math.max(0, Math.round(k + (g * 50 * hz) / 1000))); } o.sort((x, y) => x - y); const kept = []; for (const k of o) if (!kept.length || k >= kept[kept.length - 1] + 24) kept.push(k); return kept; };
        const out = [];
        for (let i = 0; i < G.levelCount; i++) {
          const id = String(i + 1).padStart(2, '0'), src = G.testInputs.levels[id], nTaps = G.levelData(i).judge_taps.length;
          G.resetJudgeStats();
          const lv = { level: i + 1, taps: nTaps, runs: 0, clears: 0, clearJudgeMismatch: 0, noMissClears: 0, noMissComboMismatch: 0 };
          const sets = [[src.taps, 1], [src.on_beat_taps, 19]];
          for (let r = 0; r < N; r++) sets.push([bot(src.on_beat_taps), 24]);
          for (const [taps, hold] of sets) {
            const res = G.replay(i, taps, { holdTicks: hold, frameDt: 1 / 60 });
            lv.runs++;
            if (res.state === 'clear') {
              lv.clears++;
              const n = G.grades.length;
              if (n !== nTaps) lv.clearJudgeMismatch++;
              // 놓침 없는 클리어 = 판정 수 = 탭 수 → 최고 콤보(끝까지 이어진 콤보) = 탭 수
              if (n === nTaps) { lv.noMissClears++; if (G.combo !== nTaps) lv.noMissComboMismatch++; }
            }
          }
          lv.stats = G.judgeStats;
          out.push(lv);
        }
        return out;
      }, { N, hz });
      let tot = { n: 0, skip: 0 }, byKind = { ground: { n: 0, skip: 0 }, orb: { n: 0, skip: 0 } };
      for (const lv of res) {
        const s = lv.stats; const n = s.ground.n + s.orb.n, sk = s.ground.skip + s.orb.skip;
        lv.skip_rate = n ? +(100 * sk / n).toFixed(2) : 0;
        lv.skip_ground = s.ground.n ? +(100 * s.ground.skip / s.ground.n).toFixed(2) : 0;
        lv.skip_orb = s.orb.n ? +(100 * s.orb.skip / s.orb.n).toFixed(2) : null;
        tot.n += n; tot.skip += sk; for (const k of ['ground', 'orb']) { byKind[k].n += s[k].n; byKind[k].skip += s[k].skip; }
        if (lv.skip_rate > 5) R.problems.push(`judge ${tag} L${lv.level} 생략률 ${lv.skip_rate} % > 5 %`);
        if (lv.skip_ground > 10 || (lv.skip_orb ?? 0) > 10) R.problems.push(`judge ${tag} L${lv.level} 입력 종류별 생략률 땅 ${lv.skip_ground} / 고리 ${lv.skip_orb} % > 10 %`);
        if (lv.clearJudgeMismatch) R.problems.push(`judge ${tag} L${lv.level} 클리어 판정 수 ≠ judge_taps ${lv.clearJudgeMismatch}회`);
        if (lv.noMissComboMismatch) R.problems.push(`judge ${tag} L${lv.level} 놓침 없는 클리어 최고 콤보 ≠ 탭 수 ${lv.noMissComboMismatch}회`);
      }
      R.judge[tag] = { levels: res, total: { ...tot, rate: +(100 * tot.skip / tot.n).toFixed(2) }, byKind: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, { ...v, rate: v.n ? +(100 * v.skip / v.n).toFixed(2) : null }])) };
      console.log(`judge ${tag}: 판정 ${tot.n}, 생략 ${tot.skip} (${R.judge[tag].total.rate} %), 땅 ${R.judge[tag].byKind.ground.rate} %, 고리 ${R.judge[tag].byKind.orb.rate} % | 레벨 최대 ${Math.max(...res.map((l) => l.skip_rate))} % | 클리어 ${res.reduce((a, l) => a + l.clears, 0)}/${res.reduce((a, l) => a + l.runs, 0)}, 판정 수 불일치 ${res.reduce((a, l) => a + l.clearJudgeMismatch, 0)}, 놓침 없는 클리어 ${res.reduce((a, l) => a + l.noMissClears, 0)} 중 콤보 불일치 ${res.reduce((a, l) => a + l.noMissComboMismatch, 0)}`);
      await ctx.close();
    }
  }

  // ---------------------------------------------------------------- shots
  if (PARTS.has('shots')) {
    R.shots = {};
    // 장면: 레벨 i의 x 지점까지 완벽 입력으로 진행 → 그 프레임. 큰 숫자 블록과 오브젝트가 겹치는 지점은 블록 alpha가 0.04인지 기록
    const scene = (p, i, x, extra = 0) => p.evaluate(async ([i, x, extra]) => {
      const G = window.__game; G.seek(i, x); for (let k = 0; k < extra; k++) G.step(1 / 60);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { combo: G.combo, fx: G.comboFx, judge: G.judgeShown };
    }, [i, x, extra]);
    for (const [w, h] of RES) {
      const tag = `${w}x${h}`;
      const { ctx, p } = await open(w, h);
      const out = {};
      // L7·L8·L10: 블록 높이에 물체가 오는 지점(위 가시 줄 등)을 찾아 그 프레임 (가까움 → α 0.04)
      for (const i of [6, 7, 9]) {
        // 화면을 그려야(rAF) 블록 alpha가 갱신되므로 0.5타일씩 진행하며 프레임을 기다림. 콤보 2 이상 구간에서 α ≤ 0.05가 되는 첫 지점
        const found = await p.evaluate(async (i) => {
          const G = window.__game, L = G.levelData(i);
          const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          G.seek(i, 4);
          let free = null;
          for (let x = 5; x < L.length_tiles - 10 && G.state === 'playing'; x += 0.5) {
            while (G.state === 'playing' && G.player.x < x) G.step(1 / 240);
            await raf();
            const f = G.comboFx;
            if (f.visible && f.alpha >= 0.29 && !free) free = { x: G.player.x, fx: f };
            if (f.visible && f.alpha <= 0.05) return { near: { x: G.player.x, fx: f }, free };
          }
          return { near: null, free };
        }, i);
        out[`L${i + 1}-near`] = found.near; out[`L${i + 1}-free`] = found.free;
        if (found.free) { await scene(p, i, found.free.x); await shot(p, `${tag}-L${i + 1}-free`); }
        if (found.near) { await scene(p, i, found.near.x); await p.evaluate(async () => { for (let k = 0; k < 3; k++) await new Promise((r) => requestAnimationFrame(r)); }); await shot(p, `${tag}-L${i + 1}-near`); }
        else R.problems.push(`shots ${tag} L${i + 1}: 블록과 물체가 가까운 장면 없음(α 0.04 안 됨)`);
      }
      // 파티클 4단계 (L10, 콤보 20 이상) + 흑백·흐림 3 px
      const st4 = await p.evaluate(async () => { const G = window.__game; G.seek(9, 0); let g = 0; while (G.combo < 21 && G.state === 'playing' && g++ < 60000) G.step(1 / 240); G.step(0.3); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return { combo: G.combo, fx: G.comboFx }; });
      out.stage4 = st4;
      await shot(p, `${tag}-L10-stage4`);
      await p.evaluate(() => { document.getElementById('cv').style.filter = 'grayscale(1) blur(3px)'; });
      await shot(p, `${tag}-L10-stage4-gray-blur`);
      await p.evaluate(() => { document.getElementById('cv').style.filter = ''; });
      if (!(st4.fx.stage === 4 && st4.fx.particles === 32)) R.problems.push(`shots ${tag} 4단계 파티클 ${JSON.stringify(st4.fx)}`);
      // 판정 글: 땅 탭(L1), 고리 탭(L6 첫 고리)
      const jg = await p.evaluate(async () => { const G = window.__game; G.seek(0, 40); const n0 = G.grades.length; let g = 0; while (G.grades.length === n0 && g++ < 5000) G.step(1 / 240); G.step(0.03); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return G.judgeShown; });
      await shot(p, `${tag}-judge-ground`);
      const jo = await p.evaluate(async () => { const G = window.__game, L = G.levelData(5); const orb = L.objects.find((o) => o.type === 'orb'); G.seek(5, orb.x - 4); let g = 0; while (G.state === 'playing' && g++ < 5000) { G.step(1 / 240); const j = G.judgeShown; if (j && j.kind === 'orb') break; } G.step(0.03); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return G.judgeShown; });
      await shot(p, `${tag}-judge-orb`);
      out.judge = { ground: jg, orb: jo };
      if (!jg?.drawn || jg.skip) R.problems.push(`shots ${tag} 땅 판정 글 ${JSON.stringify(jg)}`);
      if (!jo?.drawn || jo.skip || jo.kind !== 'orb') R.problems.push(`shots ${tag} 고리 판정 글 ${JSON.stringify(jo)}`);
      // 판정 글 상자 ≤ 플레이어 박스 왼쪽 (R3-1)
      const pl = await p.evaluate(() => innerWidth * (innerHeight > innerWidth ? 0.25 : 0.3));
      for (const [k, j] of Object.entries(out.judge)) if (j?.box && j.box.r > pl + 0.5) R.problems.push(`shots ${tag} ${k} 판정 글 오른쪽 끝 ${j.box.r} > 플레이어 왼쪽 ${pl}`);
      // 큰 숫자 블록 왼쪽 ≥ 플레이어 오른쪽 + 0.5타일 (가로)
      // 클리어 0.2 s 뒤: 숫자·파티클·판정 글 사라짐
      const cl = await p.evaluate(async () => { const G = window.__game; G.replay(3); G.step(0.25); await new Promise((r) => requestAnimationFrame(r)); return { fx: G.comboFx, judge: G.judgeShown }; });
      out.clear = cl;
      if (cl.fx.visible || cl.judge) R.problems.push(`shots ${tag} 클리어 0.25 s 뒤 콤보 연출 남음 ${JSON.stringify(cl)}`);
      await shot(p, `${tag}-L4-clear-0.25s`);
      // 사망 0.3 s 뒤: 조용히 사라짐
      const de = await p.evaluate(async () => { const G = window.__game; const id = '04', taps = G.testInputs.levels[id].taps; G.seek(3, 1e9, { taps: taps.slice(0, 14) }); G.step(0.32); return { state: G.state, fx: G.comboFx }; });
      out.death = de;
      if (de.fx.visible || de.fx.particles) R.problems.push(`shots ${tag} 사망 0.32 s 뒤 콤보 연출 남음 ${JSON.stringify(de)}`);
      R.shots[tag] = out;
      console.log(`shots ${tag}: near ${['L7', 'L8', 'L10'].map((k) => (out[k + '-near'] ? 'α' + out[k + '-near'].fx.alpha : '-')).join(' ')}, 4단계 파티클 ${st4.fx.particles}, 판정 글 땅 ${jg?.drawn}/${jg?.skip} 고리 ${jo?.drawn}/${jo?.kind}`);
      await ctx.close();
    }
    // 움직임 줄이기: 파티클 0, 튐 없음
    for (const [w, h] of [[640, 360], [1280, 720]]) {
      const { ctx, p } = await open(w, h, '?test=1', { reducedMotion: 'reduce' });
      const r = await p.evaluate(async () => { const G = window.__game; G.seek(9, 0); let g = 0; while (G.combo < 21 && G.state === 'playing' && g++ < 60000) G.step(1 / 240); G.step(0.05); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return G.comboFx; });
      R.shots[`reduced ${w}x${h}`] = r;
      if (!r.reduced || r.particles !== 0 || !r.visible) R.problems.push(`reduced ${w}x${h}: ${JSON.stringify(r)}`);
      await shot(p, `${w}x${h}-reduced-motion-L10`);
      console.log(`reduced ${w}x${h}: particles ${r.particles}, visible ${r.visible}, stage ${r.stage}`);
      await ctx.close();
    }
    // 레벨 카드 칩·결과 줄 (ko·en)
    for (const lang of ['ko', 'en']) {
      const { ctx, p } = await open(640, 360, `?test=1&lang=${lang}`);
      await p.evaluate(() => { const G = window.__game; G.replay(9); for (let j = 0; j < 90; j++) G.step(1 / 60); });
      await shot(p, `${lang}-640x360-clear-L10`);
      await p.evaluate(() => window.__game.show('levels')); await p.waitForTimeout(120);
      await shot(p, `${lang}-640x360-levels-chip`);
      await ctx.close();
    }
  }
} finally {
  if (browser) await browser.close();
  if (srv) srv.kill();
}
if (R.console.length) R.problems.push(`콘솔 에러·경고 ${R.console.length}`);
if (R.external.length) R.problems.push(`외부 요청 ${R.external.length}`);
writeFileSync(join(OUT, 'r3-check.json'), JSON.stringify(R, null, 1) + '\n');
console.log(`콘솔 ${R.console.length}, 외부 요청 ${R.external.length}`);
for (const c of R.console.slice(0, 10)) console.log('  ' + c);
for (const pr of R.problems) console.log('  문제: ' + pr);
console.log(R.problems.length ? `결과: FAIL (${R.problems.length})` : '결과: ALL OK');
process.exit(R.problems.length ? 1 : 0);
