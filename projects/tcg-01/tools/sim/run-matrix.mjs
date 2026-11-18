// 아키타입 × 아키타입 대전 매트릭스 + 치열함 지표.
// node projects/tcg-01/tools/sim/run-matrix.mjs --ai eval --games 1000 --seed 1 --workers 10 [--decks a,b,..] [--bt3 deck] [--tag name] [--mirror]
//   --games : 아키타입 쌍(순서 없음)당 판 수, 선후공 반반 교대
//   --bt    : breakthrough 측정 모드. 각 덱 "전 카드 돌파 3" vs 같은 덱 "돌파 0" (선후공 교대)
//   --bt-field : 돌파 3 덱 하나 vs 다른 덱(돌파 0) 전체 매트릭스 (덱마다)
// 출력: tools/sim/out/<tag>.json + <tag>.md, 표는 표준 출력에도.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { loadData, playGame, btAll } from './sim.mjs';
import { EVAL_W } from './ai.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

function applySets(obj, sets) {
  for (const kv of sets || []) {
    if (kv.startsWith('ai.')) { const [p, raw] = kv.split('='); EVAL_W[p.slice(3)] = JSON.parse(raw); continue; } const [path, raw] = kv.split('='); const keys = path.split('.'); let o = obj; for (const k of keys.slice(0, -1)) o = o[k]; let v; try { v = JSON.parse(raw); } catch { v = raw; } o[keys[keys.length - 1]] = v; }
  return obj;
}
function readAll(sets) {
  const cardsJson = JSON.parse(readFileSync(join(root, 'cards.json'), 'utf8'));
  const balanceJson = applySets(JSON.parse(readFileSync(join(root, 'balance.json'), 'utf8')), sets);
  const decks = {};
  for (const f of readdirSync(join(root, 'decks'))) if (f.endsWith('.json')) { const d = JSON.parse(readFileSync(join(root, 'decks', f), 'utf8')); decks[d.name] = d; }
  return { data: loadData(cardsJson, balanceJson), decks, balanceJson };
}

function btLimit(deck, stage, k, minCost, cards) { const all = btAll(deck, stage); if (!k) return all; const ids = [...new Set(deck.cards)].filter((id) => !minCost || cards[id].cost >= minCost).slice(0, k); const o = {}; for (const id of ids) o[id] = stage; return o; }
if (!isMainThread) {
  const { data, decks } = readAll(workerData.sets);
  const out = [];
  for (const job of workerData.jobs) {
    const A = decks[job.a], B = decks[job.b];
    for (let g = 0; g < job.n; g++) {
      const seed = (job.seed + g * 7919) >>> 0;
      const aFirst = (g % 2) === 0;
      const sa = { deck: A, ai: job.ai, bt: job.btA ? btLimit(A, job.btA, job.btK, job.btMin, data.cards) : {} };
      const sb = { deck: B, ai: job.ai2 || job.ai, bt: job.btB ? btAll(B, job.btB) : {} };
      const r = aFirst ? playGame(data, sa, sb, seed) : playGame(data, sb, sa, seed);
      const aWin = r.winner == null ? null : (aFirst ? r.winner === 0 : r.winner === 1);
      out.push({ k: job.key, a: job.a, b: job.b, aFirst, aWin, firstWin: r.winner == null ? null : r.winner === 0, len: r.len, wHp: r.winnerHp, minW: r.minForWinner, late: r.lateMin, ch: r.changes, mu: aFirst ? r.manaUse : [r.manaUse[1], r.manaUse[0]], reason: r.reason, apt: r.actsPerTurn, big: r.big, acts: r.actions, half: r.half, pa: aFirst ? r.played[0] : r.played[1], pb: aFirst ? r.played[1] : r.played[0] });
    }
  }
  parentPort.postMessage(out);
} else {
  const args = Object.fromEntries(process.argv.slice(2).map((x, i, a) => (x.startsWith('--') ? [x.slice(2), a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : true] : null)).filter(Boolean));
  const ai = args.ai || 'eval';
  const games = Number(args.games || 200);
  const seed = Number(args.seed || 1);
  const W = Number(args.workers || 10);
  const sets = process.argv.slice(2).map((x, i, a) => (x === '--set' ? a[i + 1] : null)).filter(Boolean);
  const { decks, balanceJson } = readAll(sets);
  const T = balanceJson.metrics_targets;
  const names = (args.decks ? String(args.decks).split(',') : Object.keys(decks)).sort();
  const mode = args.bt ? 'bt' : args['bt-field'] ? 'btfield' : 'matrix';
  const tag = args.tag || `${mode}-${ai}-g${games}-s${seed}`;
  const jobs = [];
  let ji = 0;
  if (mode === 'matrix') {
    for (let i = 0; i < names.length; i++) for (let j = i + (args.mirror ? 0 : 1); j < names.length; j++) jobs.push({ key: `${names[i]}|${names[j]}`, a: names[i], b: names[j], n: games, ai, seed: seed * 100003 + (ji++) * 1000003 });
  } else if (mode === 'bt') {
    for (const n of names) jobs.push({ key: `${n}|bt`, a: n, b: n, n: games, ai, btA: Number(args['bt-stage'] || 3), btK: Number(args['bt-cards'] || 0), btMin: Number(args['bt-mincost'] || 0), btB: 0, seed: seed * 100003 + (ji++) * 1000003 });
  } else {
    for (const n of names) for (const m of names) if (n !== m) jobs.push({ key: `${n}|${m}`, a: n, b: m, n: games, ai, btA: 3, btB: 0, seed: seed * 100003 + (ji++) * 1000003 });
  }
  // 작업을 판 단위로 쪼개 일꾼에 나눔(시드는 작업마다 다름)
  const chunks = Array.from({ length: W }, () => []);
  let c = 0;
  for (const j of jobs) {
    const per = Math.ceil(j.n / W);
    for (let s = 0, k = 0; s < j.n; s += per, k++) { const n = Math.min(per, j.n - s); chunks[c++ % W].push({ ...j, n, seed: j.seed + s * 7919 + k }); }
  }
  const t0 = Date.now();
  const results = (await Promise.all(chunks.filter((x) => x.length).map((jobs) => new Promise((res, rej) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs, sets } });
    w.on('message', res); w.on('error', rej);
  })))).flat();
  const secs = (Date.now() - t0) / 1000;

  // ---------- 집계 ----------
  const pct = (x) => (x * 100).toFixed(1);
  const ci = (p, n) => 1.96 * Math.sqrt(p * (1 - p) / Math.max(1, n));
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
  const decided = results.filter((r) => r.aWin != null);
  const summary = { tag, sets, mode, ai, games_per_pair: games, seed, workers: W, total_games: results.length, seconds: +secs.toFixed(1), ms_per_game: +(secs * 1000 / results.length).toFixed(2) };
  const cells = {};
  for (const r of results) { (cells[r.k] = cells[r.k] || []).push(r); }
  const cellStat = {};
  for (const [k, rs] of Object.entries(cells)) {
    const d = rs.filter((r) => r.aWin != null);
    const p = d.length ? d.filter((r) => r.aWin).length / d.length : null;
    const aF = rs.filter((r) => r.aFirst && r.aWin != null), aS = rs.filter((r) => !r.aFirst && r.aWin != null);
    cellStat[k] = { a: rs[0].a, b: rs[0].b, n: rs.length, a_wr: p, ci95: p == null ? null : ci(p, d.length), draws: rs.length - d.length,
      a_wr_first: aF.length ? aF.filter((r) => r.aWin).length / aF.length : null, a_wr_second: aS.length ? aS.filter((r) => r.aWin).length / aS.length : null,
      len_median: median(rs.map((r) => r.len)) };
  }
  // 전체 지표
  const n = results.length;
  const close = decided.filter((r) => r.wHp <= T.close_game_winner_hp_lte).length / Math.max(1, decided.length);
  const lopsided = decided.filter((r) => r.wHp >= 20 && r.len <= 6).length / Math.max(1, decided.length);
  const lateClose = decided.filter((r) => r.late != null && r.late <= 0).length / Math.max(1, decided.length);
  const comeback = decided.filter((r) => r.minW <= T.comeback_deficit).length / Math.max(1, decided.length);
  const changes = results.reduce((s, r) => s + r.ch, 0) / n;
  const firstWr = decided.filter((r) => r.firstWin).length / Math.max(1, decided.length);
  const lens = results.map((r) => r.len);
  const lenHist = {}; for (const l of lens) lenHist[l] = (lenHist[l] || 0) + 1;
  const draws = (n - decided.length) / n;
  const metrics = {
    close_ratio: close, late_close_ratio: lateClose, lopsided_ratio: lopsided, comeback_ratio: comeback, lead_changes_mean: changes,
    first_player_wr: firstWr, first_minus_second_pp: (firstWr - (1 - firstWr)) * 100,
    len_median: median(lens), len_mean: lens.reduce((a, b) => a + b, 0) / n, len_p10: [...lens].sort((a, b) => a - b)[Math.floor(n * 0.1)], len_p90: [...lens].sort((a, b) => a - b)[Math.floor(n * 0.9)],
    len_hist: lenHist, draw_ratio: draws, turn_limit_ratio: results.filter((r) => r.reason === 'turn_limit').length / n,
  };
  // 템포: 한 턴 행동 수 분포, 예상 시간(분), 큰 순간
  const TP = balanceJson.tempo;
  const apt = results.flatMap((r) => r.apt);
  const aptHist = {}; for (const a of apt) { const k = a >= 8 ? '8+' : String(a); aptHist[k] = (aptHist[k] || 0) + 1; }
  const minutes = results.map((r) => (r.acts * TP.action_anim_ms + r.half * TP.turn_transition_ms + (r.half / 2) * (TP.human_think_ms_per_turn + TP.ai_think_ms_per_turn) + (r.acts / 2) * (TP.human_think_ms_per_action + TP.ai_ms_per_action) + r.big.bigcard * (TP.big_card_anim_ms - TP.action_anim_ms) + TP.lethal_blow_ms + TP.result_screen_ms) / 60000);
  const bigAny = results.filter((r) => r.big.burst10 + r.big.wipe3 + r.big.bigcard + r.big.lethal_from_15 > 0 || r.minW <= T.comeback_deficit).length / n;
  Object.assign(metrics, {
    acts_per_turn_mean: apt.reduce((a, b) => a + b, 0) / apt.length, acts_per_turn_p90: [...apt].sort((a, b) => a - b)[Math.floor(apt.length * 0.9)],
    acts_per_turn_hist: aptHist, acts_per_turn_ge8_ratio: apt.filter((a) => a >= 8).length / apt.length,
    est_minutes_median: median(minutes), est_minutes_p90: [...minutes].sort((a, b) => a - b)[Math.floor(n * 0.9)],
    big_moment_game_ratio: bigAny,
    big_per_game: { burst10: results.reduce((s, r) => s + r.big.burst10, 0) / n, wipe3: results.reduce((s, r) => s + r.big.wipe3, 0) / n, bigcard: results.reduce((s, r) => s + r.big.bigcard, 0) / n, lethal_from_15: results.reduce((s, r) => s + r.big.lethal_from_15, 0) / n },
  });
  // 아키타입별
  const arch = {};
  if (mode !== 'bt') {
    for (const nm of names) {
      const mine = results.filter((r) => (r.a === nm || r.b === nm) && r.a !== r.b && r.aWin != null);
      const wins = mine.filter((r) => (r.a === nm ? r.aWin : !r.aWin)).length;
      const asFirst = mine.filter((r) => (r.a === nm) === r.aFirst);
      const asSecond = mine.filter((r) => (r.a === nm) !== r.aFirst);
      const wf = asFirst.filter((r) => (r.a === nm ? r.aWin : !r.aWin)).length / Math.max(1, asFirst.length);
      const ws = asSecond.filter((r) => (r.a === nm ? r.aWin : !r.aWin)).length / Math.max(1, asSecond.length);
      const mu = results.filter((r) => r.a === nm || r.b === nm).map((r) => (r.a === nm ? r.mu[0] : r.mu[1]));
      const lensA = results.filter((r) => r.a === nm || r.b === nm).map((r) => r.len);
      arch[nm] = { wr: wins / Math.max(1, mine.length), n: mine.length, ci95: ci(wins / Math.max(1, mine.length), mine.length), first_wr: wf, second_wr: ws, first_minus_second_pp: (wf - ws) * 100, mana_use_t1_6: mu.reduce((a, b) => a + b, 0) / Math.max(1, mu.length), len_median: median(lensA) };
    }
    const wrs = Object.values(arch).map((x) => x.wr);
    metrics.arch_wr_min = Math.min(...wrs); metrics.arch_wr_max = Math.max(...wrs); metrics.arch_spread_pp = (metrics.arch_wr_max - metrics.arch_wr_min) * 100;
    const cellWr = Object.values(cellStat).filter((c) => c.a !== c.b).map((c) => c.a_wr);
    metrics.cell_min = Math.min(...cellWr.map((p) => Math.min(p, 1 - p))); metrics.cell_max = Math.max(...cellWr.map((p) => Math.max(p, 1 - p)));
    metrics.cells_outside_35_65 = Object.values(cellStat).filter((c) => c.a !== c.b && (c.a_wr < T.matchup_cell_min || c.a_wr > T.matchup_cell_max)).map((c) => `${c.a} vs ${c.b} ${pct(c.a_wr)}`);
    // 상성 고리(3개 이상 덱의 순환 a>b>c>a, 각 칸 52 % 이상)
    const beats = (x, y) => { const k1 = `${x}|${y}`, k2 = `${y}|${x}`; if (cellStat[k1]) return cellStat[k1].a_wr > 0.52; if (cellStat[k2]) return cellStat[k2].a_wr < 0.48; return false; };
    const cycles = [];
    for (const x of names) for (const y of names) for (const z of names) if (x < y && x < z && y !== z && beats(x, y) && beats(y, z) && beats(z, x)) cycles.push(`${x} > ${y} > ${z} > ${x}`);
    metrics.cycles = cycles;
  } else {
    for (const [k, c] of Object.entries(cellStat)) arch[c.a] = { bt3_vs_bt0_wr: c.a_wr, ci95: c.ci95, n: c.n };
    const v = Object.values(arch).map((x) => x.bt3_vs_bt0_wr);
    metrics.bt_wr_max = Math.max(...v); metrics.bt_wr_mean = v.reduce((a, b) => a + b, 0) / v.length;
  }
  // 카드별 "낸 판 승률" (덱 기준)
  const cardStat = {};
  for (const r of decided) {
    for (const [side, list, win] of [[r.a, r.pa, r.aWin], [r.b, r.pb, !r.aWin]]) for (const cid of list || []) { const k = side + "|" + cid; const o = cardStat[k] || (cardStat[k] = { n: 0, w: 0 }); o.n++; if (win) o.w++; }
  }
  const cardRows = Object.entries(cardStat).map(([k, o]) => ({ k, n: o.n, wr: o.w / o.n, base: arch[k.split("|")[0]] ? arch[k.split("|")[0]].wr : 0.5 })).filter((x) => x.n >= 50).map((x) => ({ ...x, d: x.wr - x.base })).sort((p, q) => q.d - p.d);
  metrics.card_played_top = cardRows.slice(0, 12).map((x) => x.k + " " + (x.wr * 100).toFixed(0) + "% (" + (x.d * 100 >= 0 ? "+" : "") + (x.d * 100).toFixed(0) + ", n" + x.n + ")");
  metrics.card_played_bottom = cardRows.slice(-12).map((x) => x.k + " " + (x.wr * 100).toFixed(0) + "% (" + (x.d * 100).toFixed(0) + ", n" + x.n + ")");
  const result = { summary, metrics, archetypes: arch, cells: cellStat, card_played: cardRows };
  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'out', `${tag}.json`), JSON.stringify(result, null, 1));

  // ---------- 표 ----------
  const lines = [`# ${tag}`, '', `AI ${ai}, 쌍당 ${games}판(선후공 교대), 시드 ${seed}, 총 ${n}판, ${secs.toFixed(1)} s (${summary.ms_per_game} ms/판, 일꾼 ${W})`, ''];
  if (mode === 'matrix' || mode === 'btfield') {
    lines.push('| 행 승률 % (95 % CI ±) | ' + names.map((x) => x.split('-')[0]).join(' | ') + ' | 전체 |', '|---|' + names.map(() => '---').join('|') + '|---|');
    for (const x of names) {
      const row = names.map((y) => {
        if (x === y) { const c = cellStat[`${x}|${y}`]; return c ? `(${pct(c.a_wr)})` : '—'; }
        const c1 = cellStat[`${x}|${y}`], c2 = cellStat[`${y}|${x}`];
        if (c1) return `${pct(c1.a_wr)} ±${pct(c1.ci95)}`;
        if (c2) return `${pct(1 - c2.a_wr)} ±${pct(c2.ci95)}`;
        return '—';
      });
      lines.push(`| ${x} | ${row.join(' | ')} | ${arch[x] ? pct(arch[x].wr) : '-'} |`);
    }
    lines.push('', '| 아키타입 | 전체 승률 % | 선공 % | 후공 % | 선−후 %p | 마나 사용 1~6턴 % | 길이 중앙값 |', '|---|---|---|---|---|---|---|');
    for (const x of names) { const a = arch[x]; if (a) lines.push(`| ${x} | ${pct(a.wr)} ±${pct(a.ci95)} | ${pct(a.first_wr)} | ${pct(a.second_wr)} | ${a.first_minus_second_pp.toFixed(1)} | ${pct(a.mana_use_t1_6)} | ${a.len_median} |`); }
  } else {
    lines.push('| 덱 | 돌파3 vs 돌파0 승률 % | 95 % CI ± |', '|---|---|---|');
    for (const [x, a] of Object.entries(arch)) lines.push(`| ${x} | ${pct(a.bt3_vs_bt0_wr)} | ${pct(a.ci95)} |`);
  }
  const m = metrics;
  lines.push('', '| 지표 | 값 |', '|---|---|',
    `| 접전 비율(승자 명줄+껍질 ≤ ${T.close_game_winner_hp_lte}) | ${pct(m.close_ratio)} % |`,
    `| 막판 접전(끝 3턴 안에 승자 형세 ≤ 0) | ${pct(m.late_close_ratio)} % |`,
    `| 일방 비율(승자 ≥ 20, 길이 ≤ 6) | ${pct(m.lopsided_ratio)} % |`,
    `| 역전 비율(승자가 형세 ≤ ${T.comeback_deficit}에서 이김) | ${pct(m.comeback_ratio)} % |`,
    `| 주도권 교체 평균(±${T.lead_band} 띠) | ${m.lead_changes_mean.toFixed(2)} |`,
    `| 선공 승률 / 선−후 | ${pct(m.first_player_wr)} % / ${m.first_minus_second_pp.toFixed(1)} %p |`,
    `| 길이 중앙값 (p10–p90) | ${m.len_median} (${m.len_p10}–${m.len_p90}) |`,
    `| 무승부 / 턴 제한 도달 | ${pct(m.draw_ratio)} % / ${pct(m.turn_limit_ratio)} % |`,
    `| 한 턴 행동 수 평균 / p90 / 8개 이상 비율 | ${m.acts_per_turn_mean.toFixed(2)} / ${m.acts_per_turn_p90} / ${pct(m.acts_per_turn_ge8_ratio)} % |`,
    `| 예상 판 시간(사람 대 AI) 중앙값 / p90 | ${m.est_minutes_median.toFixed(1)} / ${m.est_minutes_p90.toFixed(1)} 분 |`,
    `| 큰 순간이 1번 이상인 판 | ${pct(m.big_moment_game_ratio)} % (판당: 한 턴 10+ 피해 ${m.big_per_game.burst10.toFixed(2)}, 3+ 동시 전멸 ${m.big_per_game.wipe3.toFixed(2)}, 큰 카드 ${m.big_per_game.bigcard.toFixed(2)}, 15+에서 한 턴 마무리 ${m.big_per_game.lethal_from_15.toFixed(2)}) |`);
  if (m.arch_spread_pp != null) lines.push(`| 아키타입 승률 폭 | ${pct(m.arch_wr_min)}–${pct(m.arch_wr_max)} % (${m.arch_spread_pp.toFixed(1)} %p) |`, `| 매치업 칸 범위 | ${pct(m.cell_min)}–${pct(m.cell_max)} % |`, `| 35~65 % 밖 칸 | ${m.cells_outside_35_65.length ? m.cells_outside_35_65.join(', ') : '없음'} |`, `| 상성 고리 | ${m.cycles.length ? m.cycles.slice(0, 4).join(' / ') + (m.cycles.length > 4 ? ` 외 ${m.cycles.length - 4}` : '') : '없음'} |`);
  if (m.bt_wr_max != null) lines.push(`| 돌파3 vs 0 최대 / 평균 | ${pct(m.bt_wr_max)} % / ${pct(m.bt_wr_mean)} % |`);
  lines.push('', `길이 분포: ${Object.entries(m.len_hist).map(([k, v]) => `${k}:${v}`).join(' ')}`);
  writeFileSync(join(here, 'out', `${tag}.md`), lines.join('\n'));
  console.log(lines.join('\n'));
}
