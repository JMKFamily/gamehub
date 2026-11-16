// Checks games.json: required fields, unique slugs, and that each local game has an index.html.
import { readFileSync, existsSync } from 'node:fs';

const games = JSON.parse(readFileSync('games.json', 'utf8'));
const errors = [];
const seen = new Set();

if (!Array.isArray(games)) errors.push('games.json must be an array');
for (const [i, g] of (Array.isArray(games) ? games : []).entries()) {
  const where = `games[${i}]${g?.slug ? ` (${g.slug})` : ''}`;
  for (const k of ['slug', 'title']) if (!g?.[k]) errors.push(`${where}: missing "${k}"`);
  if (g?.slug && !/^[a-z0-9-]+$/.test(g.slug)) errors.push(`${where}: slug must be lowercase a-z, 0-9, -`);
  if (seen.has(g?.slug)) errors.push(`${where}: duplicate slug`);
  seen.add(g?.slug);
  // Entries with "url" point elsewhere (e.g. a claude.ai artifact); others must exist locally.
  if (!g?.url && g?.slug && !existsSync(`games/${g.slug}/index.html`)) {
    errors.push(`${where}: games/${g.slug}/index.html not found`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`OK: ${games.length} game(s)`);
