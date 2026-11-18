// qa-out/*.json + 치열함 매트릭스(sim/qa-r1-*.json) → reviews/round-N/metrics.json
//   node projects/tcg-01/tools/qa/make-metrics.mjs --round 1
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const PROJ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = process.argv[process.argv.indexOf('--round') + 1] || '1';
const OUT = join(PROJ, 'reviews', `round-${R}`);
const rj = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const q = (n) => rj(join(OUT, 'qa-out', n + '.json'));
const BAL = rj(join(PROJ, 'balance.json'));
const parts = ['sync', 'shots', 'human', 'tempo', 'info', 'resp', 'perf', 'func', 'tut'];
const P = Object.fromEntries(parts.map((p) => [p, q(p)]));
const humanO5 = existsSync(join(OUT, 'qa-out')) ? readdirSync(join(OUT, 'qa-out')).filter((f) => /^human-o5-[0-9]+[.]json$/.test(f)).map((f) => q(f.replace('.json', ''))) : [];
for (const h of humanO5) if (h.log) for (const k of ['console', 'pageerrors', 'failed', 'external']) (P._extra = P._extra || { console: [], pageerrors: [], failed: [], external: [] })[k].push(...h.log[k]);
const logs = { console: [], pageerrors: [], failed: [], external: [], requests: 0 };
for (const p of parts) if (P[p]?.log) for (const k of Object.keys(logs)) logs[k] = k === 'requests' ? logs[k] + P[p].log[k] : logs[k].concat(P[p].log[k]);
const sim = {};
for (const t of ['eval', 'race', 'greedy']) {
  const j = rj(join(OUT, 'sim', `qa-r${R}-${t}.json`)); if (!j) continue;
  const m = j.metrics;
  sim[t] = { games_per_pair: j.summary.games_per_pair, seed: j.summary.seed, sets: j.summary.sets, arch_wr: Object.fromEntries(Object.entries(j.archetypes).map(([k, v]) => [k, +(v.wr * 100).toFixed(1)])), arch_spread_pp: +m.arch_spread_pp.toFixed(1),
    cells_outside_35_65: m.cells_outside_35_65.length, cell_range: [+(m.cell_min * 100).toFixed(1), +(m.cell_max * 100).toFixed(1)], close_pct: +(m.close_ratio * 100).toFixed(1), late_close_pct: +(m.late_close_ratio * 100).toFixed(1), comeback_pct: +(m.comeback_ratio * 100).toFixed(1), lopsided_pct: +(m.lopsided_ratio * 100).toFixed(1),
    first_minus_second_pp: +m.first_minus_second_pp.toFixed(1), deck_first_second_pp: Object.fromEntries(Object.entries(j.archetypes).map(([k, v]) => [k, +v.first_minus_second_pp.toFixed(1)])), len_median: m.len_median, draw_pct: +(m.draw_ratio * 100).toFixed(2), est_minutes_median: +m.est_minutes_median.toFixed(2), big_moment_pct: +(m.big_moment_game_ratio * 100).toFixed(1), lead_changes: +m.lead_changes_mean.toFixed(2) };
}
const metrics = { round: +R, date: new Date().toISOString().slice(0, 10), basic: { console_errors_warnings: logs.console.length + logs.pageerrors.length, failed_requests: logs.failed.length, external_requests: logs.external.length, requests: logs.requests },
  engine_sync: P.sync && { hash: P.sync.hash_check, data_copy: P.sync.data, games: P.sync.games.length, actions: P.sync.actions_total, mismatches: P.sync.mismatches, human_replay_same: P.human?.replay_same },
  human_game: P.human && { wall_minutes: P.human.minutes, turns: P.human.turns, actions: P.human.actions, response_ms: P.human.response_ms, response_over_100: P.human.response_over_100, pointer_ok: P.human.pointerOk, pointer_miss: P.human.pointerMiss, turns_t: P.human.turns_t, tempo: P.human.tempo },
  tempo_ai_vs_ai: P.tempo && { runs: P.tempo.runs.map((r) => ({ hA: r.hA, hB: r.hB, fast: r.fast, wall_s: r.wall_s, actions: r.actions, half_turn_ms: r.half_turn_ms, half_over_cap: r.half_over_cap, table: r.table })), queue: P.tempo.queue },
  info_loss: P.info && { rows: P.info.rows, nums_equal_all_modes: [...new Set(P.info.rows.map((r) => r.seed))].every((s) => new Set(P.info.rows.filter((r) => r.seed === s).map((r) => r.nums)).size === 1), screen_eq_engine: P.info.rows.every((r) => r.dom_tokens === r.engine_tokens && r.idle_hp_mismatch === 0) },
  first_response_independent: P.resp && P.resp.runs.map((r) => ({ cpu_rate: r.cpu_rate, ms: r.ms, none: r.none })),
  perf: P.perf, layout: P.shots && P.shots.summary, func: P.func && { save_reload: P.func.save_reload, save_after_battle: P.func.save_after_battle, mute: P.func.mute, stale_screens: P.func.stale_screens, background: P.func.background, lang: P.func.lang, builder: P.func.builder, crates: P.func.crates, breakthrough: { rows: P.func.breakthrough.rows.map((r) => ({ r: r.r, ok: r.ok })), minion_rule_violations: P.func.breakthrough.minion_rule_violation_n, minions_checked: P.func.breakthrough.minions_checked }, static: P.func.static },
  fierceness: { targets: BAL.metrics_targets, sim },
  human_speed_o5: humanO5.length ? { games: humanO5.map((h) => ({ heroes: h.heroes, minutes: h.minutes, turns: h.turns, actions: h.actions, winner: h.winner, response_p50: h.response_ms.p50, response_max: h.response_ms.max, ai_turn_max: h.turns_t.ai_turn_ms.max, human_turn_p50: h.turns_t.human_turn_ms.p50, locked_share: h.turns_t.human_locked_share, replay_same: h.replay_same })), minutes_median: [...humanO5.map((h) => h.minutes)].sort((a, b) => a - b)[Math.floor(humanO5.length / 2)], turns: humanO5.map((h) => h.turns) } : null,
  tutorial: P.tut && { runs: P.tut.runs, end_before_play: `${P.tut.end_before_play_n}/${P.tut.runs_n}` } };
if (P._extra) for (const k of Object.keys(P._extra)) metrics.basic[k === 'console' || k === 'pageerrors' ? 'console_errors_warnings' : k === 'failed' ? 'failed_requests' : 'external_requests'] += P._extra[k].length;
writeFileSync(join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 1));
console.log('metrics.json 저장', Object.keys(metrics).join(','));
