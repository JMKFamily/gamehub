#!/usr/bin/env node
// flow-01 SVG 에셋 검사 (art-director): 외부 참조 0, 그림 에셋에 글자 0, viewBox 있음.
//   node assets/check/svg-check.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const A = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let fail = 0, n = 0;
for (const p of walk(A).filter((f) => f.endsWith('.svg'))) {
  n++; const s = readFileSync(p, 'utf8'), rel = relative(A, p).split('\\').join('/');
  const bad = (m) => { fail++; console.log('FAIL', rel, m); };
  if (!/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(s)) bad('svg 머리 없음');
  if (!/viewBox="/.test(s)) bad('viewBox 없음');
  if (/href=|<image|@import|url\(\s*['"]?(https?:|\/\/|data:)/i.test(s)) bad('외부 참조·이미지');
  if (!rel.startsWith('mockups/') && /<text|font-family/.test(s)) bad('그림 에셋에 글자(글 없이 읽혀야 함)');
}
console.log(fail ? `SVG 검사 실패 ${fail}건 (${n}개)` : `SVG 검사 통과 (${n}개, 외부 참조 0, 그림 에셋 글자 0)`);
process.exit(fail ? 1 : 0);
