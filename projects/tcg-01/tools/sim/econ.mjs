// 메타 경제 몬테카를로: node projects/tcg-01/tools/sim/econ.mjs [--players 300] [--days 120]
// 인양 상자 확률·천장·공명(돌파)·각인 먹·일일 수입으로 "표준 덱 완성 일수, 수집률, 돌파 분포"를 낸다. 실결제 없음.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng } from './engine.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const cards = JSON.parse(readFileSync(join(root, 'cards.json'), 'utf8')).cards;
const B = JSON.parse(readFileSync(join(root, 'balance.json'), 'utf8'));
const E = B.economy, BT = B.breakthrough;
const decks = readdirSync(join(root, 'decks')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(root, 'decks', f), 'utf8')));
const args = Object.fromEntries(process.argv.slice(2).map((x, i, a) => (x.startsWith('--') ? [x.slice(2), a[i + 1]] : null)).filter(Boolean));
const NP = Number(args.players || 300), DAYS = Number(args.days || 120);
const RAR = ['sand', 'pearl', 'coral', 'abyss'];
const byR = Object.fromEntries(RAR.map((r) => [r, cards.filter((c) => c.rarity === r)]));
const wins = Number(args.wins_per_day || 5), losses = Number(args.losses_per_day || 5);

function pickR(r, probs) { let x = r.next(); for (const k of RAR) { const p = probs[k] || 0; if (x < p) return k; x -= p; } return 'sand'; }
function simPlayer(seed) {
  const r = makeRng(seed);
  const own = {}; const res = {}; let ink = E.craft_ink_cost ? B.economy.new_player.welcome_carving_ink : 0; let marks = B.economy.new_player.tutorial_reward_salt_marks;
  let pityA = 0, pityC = 0, firstA = true, crates = 0;
  const target = decks[r.int(decks.length)]; // 이 유저가 노리는 표준 덱
  const need = {}; for (const id of target.cards) need[id] = (need[id] || 0) + 1;
  const lim = (c) => BT.copies_owned_before_resonance[c.rarity];
  const add = (c) => {
    const have = own[c.id] || 0;
    if (have < lim(c)) { own[c.id] = have + 1; return; }
    const st = res[c.id] || 0; const cap = BT.resonance_cumulative_for_stage[c.rarity][3];
    if (st >= cap) ink += BT.overflow_ink_per_copy_after_max[c.rarity];
    else res[c.id] = st + BT.resonance_per_extra_copy[c.rarity];
  };
  const openCrate = () => {
    crates++; pityA++; pityC++;
    const got = [];
    for (let s = 0; s < 5; s++) {
      let rr = s === 4 ? pickR(r, E.rarity_guarantee_slot_prob) : pickR(r, E.rarity_slot_prob);
      if (pityA >= (firstA ? E.pity.first_abyss_within_crates : E.pity.abyss_within_crates) && s === 4) rr = 'abyss';
      else if (pityC >= E.pity.coral_within_crates && s === 4 && rr !== 'abyss') rr = 'coral';
      got.push(rr);
    }
    for (const rr of got) {
      if (rr === 'abyss') { pityA = 0; firstA = false; }
      if (rr === 'coral' || rr === 'abyss') pityC = 0;
      let pool = byR[rr];
      if (rr === 'abyss') { const un = pool.filter((c) => !own[c.id]); if (un.length) pool = un; }
      add(pool[r.int(pool.length)]);
    }
  };
  for (let i = 0; i < E.crates_welcome || 0; i++) openCrate();
  for (let i = 0; i < B.economy.new_player.welcome_crates; i++) openCrate();
  let deckDay = null, out = {};
  const income = Math.min(E.income.win_salt_marks * wins, E.income.win_salt_marks_daily_cap) + E.income.first_win_bonus_salt_marks + E.income.daily_commission_salt_marks.reduce((a, b) => a + b, 0);
  const tidePerDay = wins * B.economy.tide_calendar.tide_marks_win + losses * B.economy.tide_calendar.tide_marks_loss + E.income.daily_commissions_slots * B.economy.tide_calendar.tide_marks_daily_commission;
  let tide = 0, step = 0;
  for (let d = 1; d <= DAYS; d++) {
    marks += income;
    if (d % 7 === 0) { marks += E.income.weekly_accord.salt_marks; openCrate(); }
    if (d <= 7) openCrate();
    tide += tidePerDay;
    while (tide >= B.economy.tide_calendar.tide_marks_per_step && step < B.economy.tide_calendar.steps) {
      tide -= B.economy.tide_calendar.tide_marks_per_step; step++;
      marks += 50; if (step % 5 === 0) openCrate(); if (step % 10 === 0) ink += 200;
    }
    if (d % B.economy.tide_calendar.season_days === 0) { step = 0; tide = 0; }
    while (marks >= E.crates.bare_sea_crate.price_salt_marks) { marks -= E.crates.bare_sea_crate.price_salt_marks; openCrate(); }
    // 목표 덱 부족분을 각인 먹으로 지정 새김(싼 것부터)
    const missing = [];
    for (const [id, n] of Object.entries(need)) { const c = cards.find((x) => x.id === id); for (let k = own[id] || 0; k < n; k++) missing.push(c); }
    missing.sort((a, b) => E.craft_ink_cost[a.rarity] - E.craft_ink_cost[b.rarity]);
    for (const c of missing) if (ink >= E.craft_ink_cost[c.rarity]) { ink -= E.craft_ink_cost[c.rarity]; own[c.id] = (own[c.id] || 0) + 1; }
    const done = Object.entries(need).every(([id, n]) => (own[id] || 0) >= n);
    if (done && deckDay == null) deckDay = d;
    if ([7, 30, 90, DAYS].includes(d)) {
      const owned = cards.filter((c) => (own[c.id] || 0) >= lim(c)).length;
      const stageOf = (c) => { const v = res[c.id] || 0; const t = BT.resonance_cumulative_for_stage[c.rarity]; return v >= t[3] ? 3 : v >= t[2] ? 2 : v >= t[1] ? 1 : 0; };
      const st = [0, 0, 0, 0]; for (const c of cards) if (own[c.id]) st[stageOf(c)]++;
      const deckStage = target.cards.reduce((s, id) => s + stageOf(cards.find((x) => x.id === id)), 0) / 30;
      out[d] = { crates, playset_ratio: owned / cards.length, stage_hist_owned: st, target_deck_avg_stage: deckStage, ink };
    }
  }
  return { deckDay, out, income, tidePerDay };
}
const all = []; for (let i = 0; i < NP; i++) all.push(simPlayer(1000 + i * 7919));
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const res = { players: NP, days: DAYS, wins_per_day: wins, losses_per_day: losses, salt_marks_per_day: all[0].income, tide_marks_per_day: all[0].tidePerDay,
  target_deck_complete_day_median: med(all.map((p) => p.deckDay)), target_deck_complete_day_p90: (() => { const s = all.map((p) => p.deckDay ?? 999).sort((a, b) => a - b); return s[Math.floor(s.length * 0.9)]; })(),
  by_day: {} };
for (const d of [7, 30, 90, DAYS]) {
  const xs = all.map((p) => p.out[d]).filter(Boolean);
  res.by_day[d] = { crates_median: med(xs.map((x) => x.crates)), playset_ratio_median: +med(xs.map((x) => x.playset_ratio)).toFixed(3), target_deck_avg_stage_median: +med(xs.map((x) => x.target_deck_avg_stage)).toFixed(2),
    owned_stage_hist_median: [0, 1, 2, 3].map((k) => med(xs.map((x) => x.stage_hist_owned[k]))) };
}
mkdirSync(join(here, 'out'), { recursive: true });
writeFileSync(join(here, 'out', 'econ.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
