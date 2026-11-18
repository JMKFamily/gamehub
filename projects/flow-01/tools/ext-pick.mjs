#!/usr/bin/env node
// 레벨 11~50 고르기(round-2 스테이지 50개). 후보 = ext-pool.mjs 가 만든 자체 생성 판 풀(tools/out/pool-ext-*.json, 원작 판 미참조).
//   목표(20-balance 8-5): 챕터 c 끝 E_c = T·(E5/T)^((c−1)/4) (T = 1챕터 L10 목표, E5 = difficulty.chapters.last_end_target_moves)
//         챕터 c 시작 S_c = start_frac·E_(c−1) (숨 고르기 톱니), 챕터 안 위치 p(1~10): S_c·(E_c/S_c)^((p−1)/9)
//   1차 거르기(풀 값): 못 푼 판 0, p90 ≤ 3·m̃, 몰림 대강 ≤ 한도 + 2 %p, m̃ 목표 ±15 %
//   재측정(sim/jobs pickMeasure): 아이 봇 4000회 + 숙련(또는 중간) 봇 몰림(헛 이동 ≥ 2000회)
//     → 몰림 ≤ 한도 − 2 %p, m̃ 목표 ±10 %, 챕터 안에서 직전 고른 값 + gap 보다 큼, 직전 레벨과 다른 가족이면 가산점
// 사용법: node tools/ext-pick.mjs --chapters=2,3 [--T=18.525]   (결과 tools/levels-ext.json 에 누적, 재측정은 out/pick-cache.json)
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
const T = +arg('T', JSON.parse(readFileSync(join(HERE, 'out', 'verify-report.json'), 'utf8')).T);
const CHAPTERS = arg('chapters', '2,3,4,5').split(',').map(Number);
const RUNS = 4000, NSK = 3000, GAP = +arg('gap', 0.4);
const DRY = process.argv.includes('--dry');

const chapterEnd = (c) => T * (CH.last_end_target_moves / T) ** ((c - 1) / (CH.count - 1));
const target = (c, p) => { const S = CH.start_frac * chapterEnd(c - 1), E = chapterEnd(c); return S * (E / S) ** ((p - 1) / (CH.size - 1)); };
const lim = (pairs) => Math.max(DF.skilled_waste_concentration_max_frac, DF.skilled_concentration_even_share_mult / pairs);

const pool = [];
for (const f of readdirSync(join(HERE, 'out')).filter((x) => /^pool-ext-[A-Z]\.json$/.test(x))) {
  const fid = f[9], cfg = FAMILIES.find((x) => x.id === fid);
  for (const x of JSON.parse(readFileSync(join(HERE, 'out', f), 'utf8'))) if (x.ok && !x.fail && x.sk_conc != null && x.p90 <= 3 * x.cmed && x.sk_conc <= lim(cfg.pairs) + 0.02) pool.push({ ...x, fid, cfg });
}
console.log(`풀 ${pool.length}판 (가족별 ${FAMILIES.map((f) => `${f.id}:${pool.filter((x) => x.fid === f.id).length}`).join(' ')})`);
if (DRY) { for (const c of CHAPTERS) console.log(`챕터 ${c}: ${Array.from({ length: CH.size }, (_, i) => { const t = target(c, i + 1); return `${t.toFixed(1)}(${pool.filter((x) => Math.abs(x.cmed / t - 1) <= 0.15).length})`; }).join(' ')}`); process.exit(0); }

const cacheFile = join(HERE, 'out', 'pick-cache.json');
const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
const extFile = join(HERE, 'levels-ext.json');
const ext = existsSync(extFile) ? JSON.parse(readFileSync(extFile, 'utf8')) : { slots: [] };
ext._note = '레벨 11~50 자리: 판 가족(levels-config FAMILIES)·생성 시드·고른 근거. ext-pick.mjs 가 씀, levels-config.mjs·build-levels.mjs 가 읽음. 목표식 20-balance 8-5';
ext.T = T; ext.last_end_target_moves = CH.last_end_target_moves;
ext.slots = ext.slots.filter((s) => !CHAPTERS.includes(s.chapter));
const used = new Set(ext.slots.map((s) => s.seed));

const t0 = Date.now();
for (const c of CHAPTERS) {
  let prevM = -Infinity, prevFam = null;
  for (let p = 1; p <= CH.size; p++) {
    const id = String((c - 1) * CH.size + p).padStart(2, '0'), t = target(c, p);
    let chosen = null;
    for (const [win, acc, gap] of [[0.15, 0.1, GAP], [0.22, 0.14, GAP], [0.22, 0.14, 0.25]]) {
      const cand = pool.filter((x) => !used.has(x.seed) && Math.abs(x.cmed / t - 1) <= win && (p === 1 || x.cmed > prevM + gap - 0.5))
        .map((x) => ({ x, score: Math.abs(x.cmed / t - 1) + (x.fid === prevFam ? 0.03 : 0) + 0.3 * Math.max(0, x.sk_conc - lim(x.cfg.pairs) + 0.05) }))
        .sort((a, b) => a.score - b.score);
      for (let b = 0; b < 6 && !chosen && b * 10 < cand.length; b++) {
        const batch = cand.slice(b * 10, b * 10 + 10);
        const need = batch.filter(({ x }) => !cache[x.seed]);
        const res = await runJobs(need.map(({ x }) => ({ name: 'pickMeasure', arg: { L: generate(x.cfg, x.seed).level, seed: x.seed, runs: RUNS, nsk: NSK, minRate: DF.skilled_min_waste_rate, minWaste: DF.concentration_min_waste_events } })));
        need.forEach(({ x }, i) => { const r = res[i]; cache[x.seed] = { cmedian: r.cmedian, p90: r.p90, fail: r.fail, conc: r.k1.conc, bot: r.k1.bot, tw: r.k1.tw }; });
        writeFileSync(cacheFile, JSON.stringify(cache));
        const ok = batch.map(({ x }) => ({ x, r: cache[x.seed] })).filter(({ x, r }) => r.fail === 0 && r.p90 <= 3 * r.cmedian && r.conc <= lim(x.cfg.pairs) - 0.02 && Math.abs(r.cmedian / t - 1) <= acc && (p === 1 || r.cmedian > prevM + gap));
        ok.sort((a, b) => Math.abs(a.r.cmedian / t - 1) + (a.x.fid === prevFam ? 0.03 : 0) - Math.abs(b.r.cmedian / t - 1) - (b.x.fid === prevFam ? 0.03 : 0));
        if (ok.length) chosen = ok[0];
      }
      if (chosen) break;
    }
    if (!chosen) { console.log(`L${id} 목표 ${t.toFixed(2)}: 후보 없음`); process.exitCode = 1; prevM = t; continue; }
    const { x, r } = chosen;
    used.add(x.seed); prevM = r.cmedian; prevFam = x.fid;
    ext.slots.push({ id, chapter: c, chapter_pos: p, family: x.fid, width: x.cfg.width, height: x.cfg.height, pairs: x.cfg.pairs, holes: x.cfg.holes, seed: x.seed, target: +t.toFixed(3), pick_cmedian: +r.cmedian.toFixed(3), pick_p90: r.p90, pick_conc: +r.conc.toFixed(3), pick_conc_bot: r.bot });
    console.log(`L${id} 챕터${c}-${p} 목표 ${t.toFixed(2)} → ${x.fid} ${x.seed} m̃ ${r.cmedian.toFixed(2)} p90 ${r.p90} 몰림 ${(r.conc * 100).toFixed(1)} %(${r.bot}) [${((Date.now() - t0) / 1000).toFixed(0)} s]`);
  }
}
ext.slots.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(extFile, JSON.stringify(ext, null, 1) + '\n');
