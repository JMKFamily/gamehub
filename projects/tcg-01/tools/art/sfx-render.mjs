// 효과음 크기 오프라인 렌더 (art-director round-1). 빌드 audio.js의 sfx() 원문을 그대로 떼어 OfflineAudioContext 48 kHz로
// 소리마다 렌더하고 최고값(dBFS)·RMS(최고값 −40 dB 위 구간)를 표로 냅니다. 설치된 Edge 헤드리스 + CDP(Node 내장 WebSocket), 포트 8840.
// 사용: node tools/art/sfx-render.mjs [--art projects/tcg-01/art.json | --build]   (기본: 기획 원본 art.json 값, --build: 빌드 data/art.json)
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

const PROJ = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), ROOT = join(PROJ, '..', '..');
const useBuild = process.argv.includes('--build');
const art = JSON.parse(readFileSync(useBuild ? join(ROOT, 'games/tcg-01/data/art.json') : join(PROJ, 'art.json'), 'utf8'));
const src = readFileSync(join(ROOT, 'games/tcg-01/js/audio.js'), 'utf8');
const a = src.indexOf('let noiseBuf'), b = src.indexOf('// ---------- 음악');
const body = src.slice(a, b).replace(/export function/g, 'function');
const work = join(tmpdir(), 'tcg01-sfx-render'); rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
const html = `<!doctype html><pre id=o>start</pre><script>window.onerror=(m)=>{o.textContent='ERR '+m};
const D={art:${JSON.stringify({ sound: art.sound })}};const db=(x)=>Math.pow(10,x/20);const S={enabled:true,off:false};
${body}
(async()=>{const out=[];for(const d of D.art.sound.sfx){const c=new OfflineAudioContext(1,48000*2.5,48000);S.ctx=c;noiseBuf=null;S.master=c.createGain();S.master.gain.value=db(D.art.sound.master_db);S.master.connect(c.destination);S.sfxBus=c.createGain();S.sfxBus.connect(S.master);sfx(d.id);const x=(await c.startRendering()).getChannelData(0);let pk=0,ss=0,n=0;for(const v of x){const q=Math.abs(v);if(q>pk)pk=q;}const th=pk*0.01;for(const v of x)if(Math.abs(v)>th){ss+=v*v;n++;}out.push([d.id,d.gain_db,(20*Math.log10(pk)).toFixed(1),(10*Math.log10(ss/Math.max(1,n))).toFixed(1)].join(','));}o.textContent='DONE|'+out.join('|');})();</script>`;
writeFileSync(join(work, 'r.html'), html);
const edge = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const p = spawn(edge, ['--headless=new', '--disable-gpu', '--remote-debugging-port=8840', `--user-data-dir=${join(work, 'prof')}`, pathToFileURL(join(work, 'r.html')).href], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let res = null;
try {
  let pg; for (let i = 0; i < 40 && !pg; i++) { try { pg = (await (await fetch('http://127.0.0.1:8840/json')).json()).find((t) => t.type === 'page'); } catch {} if (!pg) await sleep(500); }
  const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const call = (m, prm) => new Promise((r) => { const k = ++id; ws.addEventListener('message', (e) => { const d = JSON.parse(e.data); if (d.id === k) r(d); }); ws.send(JSON.stringify({ id: k, method: m, params: prm })); });
  for (let i = 0; i < 120 && !res; i++) { const v = (await call('Runtime.evaluate', { expression: 'o.textContent' })).result?.result?.value || ''; if (v.startsWith('DONE') || v.startsWith('ERR')) res = v; else await sleep(500); }
  ws.close();
} finally { spawn('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); } // 띄운 Edge(자식 포함)만 종료
if (!res || res.startsWith('ERR')) { console.error(res || 'timeout'); process.exit(1); }
const rows = res.split('|').slice(1).map((l) => { const [sid, g, pk, rms] = l.split(','); return { id: sid, gain_db: +g, peak_dbfs: +pk, rms_dbfs: +rms }; }).sort((x, y) => y.peak_dbfs - x.peak_dbfs);
console.log(`원본: ${useBuild ? 'games/tcg-01/data/art.json' : 'projects/tcg-01/art.json'} · 48 kHz · master ${art.sound.master_db} dB`);
for (const r of rows) console.log(`${r.id.padEnd(20)} 목표 ${String(r.gain_db).padStart(4)} dB  최고 ${r.peak_dbfs.toFixed(1).padStart(6)}  RMS ${r.rms_dbfs.toFixed(1).padStart(6)}`);
const P = Object.fromEntries(rows.map((r) => [r.id, r.peak_dbfs]));
const checks = [
  ['상자 덩이 희귀도 순서 모래<진주<산호<심해', P.chunk_break_sand < P.chunk_break_pearl && P.chunk_break_pearl < P.chunk_break_coral && P.chunk_break_coral < P.chunk_break_abyss],
  ['큰 카드가 가장 큼', rows[0].id === 'big_entry'],
  ['타격 강 > 카드 내기 > 잔 행동(뽑기·들기)', P.attack_heavy > P.card_play && P.card_play > P.card_draw && P.card_play > P.card_hover],
  ['승리 > 패배', P.victory > P.defeat],
];
for (const [n, ok] of checks) console.log(`${ok ? 'OK  ' : 'FAIL'} ${n}`);
writeFileSync(join(PROJ, 'assets', 'samples', `sfx-render${useBuild ? '-build' : ''}.json`), JSON.stringify({ source: useBuild ? 'build' : 'art', rows, checks: checks.map(([n, ok]) => ({ n, ok })) }, null, 1));
process.exit(checks.every((c) => c[1]) ? 0 : 1);
