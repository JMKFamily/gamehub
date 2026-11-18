#!/usr/bin/env node
// ext-pick 의 앞에서부터 고르기(탐욕)가 높은 쪽에서 빈자리를 남길 때 쓰는 챕터 단위 배정(round-2).
// 재측정된 판(out/pick-cache.json, 아이 봇 4000회·몰림 헛 이동 ≥ 2000회) 중 조건을 넘는 판만 쓰고,
// 챕터 하나의 10자리를 동적 계획법으로 한꺼번에 고름: 엄격 증가(이웃 차 ≥ gap), 자리마다 목표 ±14 %, 목적 = Σ|m/목표 − 1| + 같은 가족 연속 0.03.
// 먼저 --measure 면 풀에서 아직 안 잰 후보(m̃ 15~26)를 최대 --max 개 재서 cache 에 더함.
// 사용법: node tools/ext-assign.mjs --chapters=4,5 [--measure --max=60] [--gap=0.3]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES } from './levels-config.mjs';
import { generate } from './gen/generate.mjs';
import { runJobs } from './sim/jobs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(HERE, '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const bal = JSON.parse(readFileSync(join(PROJECT, 'balance.json'), 'utf8'));
const DF = bal.difficulty, CH = DF.chapters;
const extFile = join(HERE, 'levels-ext.json');
const ext = JSON.parse(readFileSync(extFile, 'utf8'));
const T = ext.T;
const CHAPTERS = arg('chapters', '4,5').split(',').map(Number);
const GAP = +arg('gap', 0.3), WIN = 0.14;
const chapterEnd = (c) => T * (CH.last_end_target_moves / T) ** ((c - 1) / (CH.count - 1));
const target = (c, p) => { const S = CH.start_frac * chapterEnd(c - 1), E = chapterEnd(c); return S * (E / S) ** ((p - 1) / (CH.size - 1)); };
const lim = (pairs) => Math.max(DF.skilled_waste_concentration_max_frac, DF.skilled_concentration_even_share_mult / pairs);
const cacheFile = join(HERE, 'out', 'pick-cache.json');
const cache = JSON.parse(readFileSync(cacheFile, 'utf8'));

const pool = [];
for (const f of readdirSync(join(HERE, 'out')).filter((x) => /^pool-ext-[A-Z]\.json$/.test(x))) {
  const fid = f[9], cfg = FAMILIES.find((x) => x.id === fid);
  for (const x of JSON.parse(readFileSync(join(HERE, 'out', f), 'utf8'))) if (x.ok && !x.fail && x.sk_conc != null && x.p90 <= 3 * x.cmed && x.sk_conc <= lim(cfg.pairs) + 0.02) pool.push({ ...x, fid, cfg });
}
if (process.argv.includes('--measure')) {
  const todo = pool.filter((x) => !cache[x.seed] && x.cmed >= +arg("lo", 15) && x.cmed <= +arg("hi", 26)).sort((a, b) => a.sk_conc - b.sk_conc).slice(0, +arg('max', 60));
  const res = await runJobs(todo.map((x) => ({ name: 'pickMeasure', arg: { L: generate(x.cfg, x.seed).level, seed: x.seed, runs: 4000, nsk: 3000, minRate: DF.skilled_min_waste_rate, minWaste: DF.concentration_min_waste_events } })));
  todo.forEach((x, i) => { const r = res[i]; cache[x.seed] = { cmedian: r.cmedian, p90: r.p90, fail: r.fail, conc: r.k1.conc, bot: r.k1.bot, tw: r.k1.tw }; });
  writeFileSync(cacheFile, JSON.stringify(cache));
  console.log(`재측정 ${todo.length}판 추가`);
}
const keep = ext.slots.filter((s) => !CHAPTERS.includes(s.chapter));
const used = new Set(keep.map((s) => s.seed));
const valid = pool.filter((x) => { const r = cache[x.seed]; return r && r.fail === 0 && r.p90 <= 3 * r.cmedian && r.conc <= lim(x.cfg.pairs) - 0.02; }).map((x) => ({ ...x, r: cache[x.seed] }));
const out = [...keep];
// 다른 시드가 같은 판을 낼 수 있어(생성기 충돌, round-2 에서 L23·L41 같은 판) 판 모양으로도 거름
const sigOf = (x) => { const L = generate(x.cfg, x.seed).level; return JSON.stringify([L.holes, L.pairs.map((p) => [p.a, p.b])]); };
const usedSig = new Set(keep.map((s) => sigOf({ cfg: FAMILIES.find((f) => f.id === s.family), seed: s.seed })));
for (const c of CHAPTERS) {
  const cand = valid.filter((x) => !used.has(x.seed) && !usedSig.has(sigOf(x))).sort((a, b) => a.r.cmedian - b.r.cmedian);
  const ts = Array.from({ length: CH.size }, (_, i) => target(c, i + 1));
  // dp[p][j] = 자리 p 에 cand[j] 를 둘 때 최소 비용
  const N = cand.length, INF = 1e9;
  const dp = ts.map(() => new Array(N).fill(INF)), from = ts.map(() => new Array(N).fill(-1));
  const cost = (p, j) => { const d = Math.abs(cand[j].r.cmedian / ts[p] - 1); return d <= WIN ? d : INF; };
  for (let j = 0; j < N; j++) dp[0][j] = cost(0, j);
  for (let p = 1; p < CH.size; p++) for (let j = 0; j < N; j++) {
    const cj = cost(p, j); if (cj >= INF) continue;
    for (let i = 0; i < N; i++) {
      if (dp[p - 1][i] >= INF || cand[j].r.cmedian < cand[i].r.cmedian + GAP) continue;
      const v = dp[p - 1][i] + cj + (cand[i].fid === cand[j].fid ? 0.03 : 0);
      if (v < dp[p][j]) { dp[p][j] = v; from[p][j] = i; }
    }
  }
  let best = -1; for (let j = 0; j < N; j++) if (dp[CH.size - 1][j] < INF && (best < 0 || dp[CH.size - 1][j] < dp[CH.size - 1][best])) best = j;
  if (best < 0) { console.log(`챕터 ${c}: 배정 실패(후보 ${N})`); process.exitCode = 1; continue; }
  const seq = []; for (let p = CH.size - 1, j = best; p >= 0; j = from[p][j], p--) seq.unshift(j);
  seq.forEach((j, p) => {
    const x = cand[j]; used.add(x.seed); usedSig.add(sigOf(x));
    out.push({ id: String((c - 1) * CH.size + p + 1).padStart(2, '0'), chapter: c, chapter_pos: p + 1, family: x.fid, width: x.cfg.width, height: x.cfg.height, pairs: x.cfg.pairs, holes: x.cfg.holes, seed: x.seed, target: +ts[p].toFixed(3), pick_cmedian: +x.r.cmedian.toFixed(3), pick_p90: x.r.p90, pick_conc: +x.r.conc.toFixed(3), pick_conc_bot: x.r.bot });
  });
  console.log(`챕터 ${c}: ${seq.map((j, p) => `${cand[j].fid}${cand[j].r.cmedian.toFixed(2)}(${ts[p].toFixed(1)})`).join(' ')}`);
}
out.sort((a, b) => a.id.localeCompare(b.id));
ext.slots = out;
writeFileSync(extFile, JSON.stringify(ext, null, 1) + '\n');
console.log(`자리 ${out.length}개`);
