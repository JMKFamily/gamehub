#!/usr/bin/env node
// flow-01 웹 빌드 동기화: 기획 원본 → games/flow-01/ (원본 바이트 그대로 복사, 수치·문구·색을 손으로 넣지 않음)
//
//   node projects/flow-01/tools/sync-build.mjs           복사 + index.html 부트 블록 갱신
//   node projects/flow-01/tools/sync-build.mjs --check   쓰지 않고 빌드 복사본이 원본과 바이트로 같은지만 확인(다르면 exit 1)
//
// 복사(바이트 그대로)
//   tools/core/board.mjs → js/board.js, tools/core/rng.mjs → js/rng.js   (판정 모듈 = 검증기·봇과 같은 파일)
//   balance.json, strings.json, levels/*.json, assets/{palette,layout,sound}.json,
//   assets/icons/*.svg, assets/tutorial/card-{fill,hole}.svg, assets/{finger,logo-mark}.svg → data/
// 생성
//   data/manifest.json  레벨 파일 목록·아이콘 목록·복사본 sha256
//   index.html 부트 블록(<!--boot:start--> ~ <!--boot:end-->): 두 언어 부트 글(title·loading·load_error·load_error_detail·btn_reload),
//     menu 바탕색, ↻ 그림(assets/icons/icon-restart.svg 인라인), 언어 결정 직후 html lang·document.title 변경
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJ, '../..');
const GAME = join(ROOT, 'games/flow-01');
const CHECK = process.argv.includes('--check');
const sha = (b) => createHash('sha256').update(b).digest('hex');

const pairs = []; // [원본 상대경로(PROJ 기준), 빌드 상대경로(GAME 기준)]
pairs.push(['tools/core/board.mjs', 'js/board.js'], ['tools/core/rng.mjs', 'js/rng.js']);
pairs.push(['balance.json', 'data/balance.json'], ['strings.json', 'data/strings.json']);
const levelFiles = readdirSync(join(PROJ, 'levels')).filter((f) => /^\d\d-level\d+\.json$/.test(f)).sort();
for (const f of levelFiles) pairs.push([`levels/${f}`, `data/levels/${f}`]);
for (const f of ['palette.json', 'layout.json', 'sound.json', 'finger.svg', 'logo-mark.svg']) pairs.push([`assets/${f}`, `data/${f}`]);
const icons = readdirSync(join(PROJ, 'assets/icons')).filter((f) => f.endsWith('.svg')).sort();
for (const f of icons) pairs.push([`assets/icons/${f}`, `data/icons/${f}`]);
for (const f of ['card-fill.svg', 'card-hole.svg']) pairs.push([`assets/tutorial/${f}`, `data/tutorial/${f}`]);

let bad = 0;
const manifest = { _source: 'projects/flow-01/tools/sync-build.mjs 생성. 손으로 고치지 않음', levels: levelFiles, icons: icons.map((f) => f.replace(/\.svg$/, '')), files: {} };
for (const [src, dst] of pairs) {
  const b = readFileSync(join(PROJ, src));
  manifest.files[dst] = { from: `projects/flow-01/${src}`, sha256: sha(b) };
  const out = join(GAME, dst);
  if (CHECK) {
    if (!existsSync(out) || sha(readFileSync(out)) !== sha(b)) { bad++; console.log(`DIFF ${dst} ≠ ${src}`); }
    continue;
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, b);
}

// 레벨 데이터 연결 검사(빌드가 읽는 키가 있는지)
const STR = JSON.parse(readFileSync(join(PROJ, 'strings.json'), 'utf8'));
const PAL = JSON.parse(readFileSync(join(PROJ, 'assets/palette.json'), 'utf8'));
for (const f of levelFiles) {
  const lv = JSON.parse(readFileSync(join(PROJ, 'levels', f), 'utf8'));
  if (!STR[lv.name_key]) { bad++; console.log(`strings ${lv.name_key} 없음 (${f})`); }
  if (!PAL.themes[`level${String(lv.order).padStart(2, '0')}`]) { bad++; console.log(`palette themes.level${lv.order} 없음`); }
  for (const p of lv.pairs) if (!PAL.pairs[p.color_slot]) { bad++; console.log(`palette pairs[${p.color_slot}] 없음 (${f})`); }
  for (const c of [lv.tutorial, lv.fill_card, lv.hole_card]) if (c && c.text_key && !STR[c.text_key]) { bad++; console.log(`strings ${c.text_key} 없음`); }
}

// index.html 부트 블록
const bootKeys = ['title', 'loading', 'load_error', 'load_error_detail', 'btn_reload'];
const T = { ko: {}, en: {} };
for (const k of bootKeys) for (const l of ['ko', 'en']) T[l][k] = STR[k][l];
const menu = PAL.themes.menu, C = PAL.common;
const retry = readFileSync(join(PROJ, 'assets/icons/icon-restart.svg'), 'utf8').trim();
const boot = [
  '<!--boot:start (projects/flow-01/tools/sync-build.mjs 생성)-->',
  `<style id="bootStyle">:root{--bgTop:${menu.top};--bgBot:${menu.bottom};--ink:${C.ink};--inkSoft:${C.inkSoft};--btn:${C.button};--btnEdge:${C.buttonEdge}}</style>`,
  `<script id="bootText" type="application/json">${JSON.stringify(T)}</script>`,
  `<template id="bootRetryIcon">${retry}</template>`,
  '<script>(function(){var T=JSON.parse(document.getElementById("bootText").textContent),q=null,s=null;try{q=new URLSearchParams(location.search).get("lang")}catch(e){}try{s=(JSON.parse(localStorage.getItem("flow01.v1")||"null")||{}).lang}catch(e){}var l=q||s||((navigator.language||"en").toLowerCase().indexOf("ko")===0?"ko":"en");if(!T[l])l="en";var t=T[l];document.documentElement.lang=l;document.title=t.title;window.__bootLang=l;' +
    'window.__bootFail=function(){var m=document.getElementById("bootMsg"),d=document.getElementById("bootErrDetail"),b=document.getElementById("bootRetry"),bt=document.getElementById("boot");if(bt)bt.classList.add("show");if(m)m.textContent=t.load_error;if(d){d.textContent=t.load_error_detail;d.hidden=false}if(b)b.hidden=false};' +
    'document.addEventListener("DOMContentLoaded",function(){var m=document.getElementById("bootMsg"),b=document.getElementById("bootRetry");if(m)m.textContent=t.loading;if(b){b.innerHTML=document.getElementById("bootRetryIcon").innerHTML;b.setAttribute("aria-label",t.btn_reload);b.onclick=function(){location.reload()}}window.__bootTimer=setTimeout(function(){if(!window.__gameBooted)window.__bootFail()},15000)});})();</script>',
  '<!--boot:end-->',
].join('\n');
const idxPath = join(GAME, 'index.html');
const html = readFileSync(idxPath, 'utf8');
const next = html.replace(/<!--boot:start[\s\S]*?<!--boot:end-->/, boot);
if (CHECK) {
  if (next !== html) { bad++; console.log('DIFF index.html 부트 블록이 원본과 다름(sync-build 다시 실행)'); }
  const mPath = join(GAME, 'data/manifest.json');
  if (!existsSync(mPath) || readFileSync(mPath, 'utf8') !== JSON.stringify(manifest, null, 1) + '\n') { bad++; console.log('DIFF data/manifest.json'); }
} else {
  writeFileSync(idxPath, next);
  writeFileSync(join(GAME, 'data/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
}
console.log(`${CHECK ? '확인' : '복사'} ${pairs.length}개 파일, 레벨 ${levelFiles.length}개, 문제 ${bad}개`);
process.exit(bad ? 1 : 0);
