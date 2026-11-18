// BGM 오프라인 렌더·크기 측정 (art-director 2026-11-18). music-synth.mjs + art.json sound.music을 그대로 OfflineAudioContext 48 kHz 스테레오로 렌더.
// 곡마다 120 s(≥ 2분), 맺음 동기 8 s. 잼: 대략 LUFS(BS.1770 K-가중 + 게이팅), 샘플 피크, 동시 목소리 최대(사건열 계산), 효과음 순간 최대 음량(400 ms) 대비 차이.
// 사용: node tools/art/music-render.mjs [--seconds 120]   설치된 Edge 헤드리스 + CDP 포트 8841, 띄운 Edge만 종료
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url)), PROJ = join(HERE, '..', '..'), ROOT = join(PROJ, '..', '..');
const secs = +(process.argv[process.argv.indexOf('--seconds') + 1] || 120) || 120;
const art = JSON.parse(readFileSync(join(PROJ, 'art.json'), 'utf8'));
const synth = readFileSync(join(HERE, 'music-synth.mjs'), 'utf8').replace(/^export /gm, '');
const audio = readFileSync(join(ROOT, 'games/tcg-01/js/audio.js'), 'utf8');
const sfxBody = audio.slice(audio.indexOf('let noiseBuf'), audio.indexOf('// ---------- 음악')).replace(/export function/g, 'function');
const work = join(tmpdir(), 'tcg01-music-render'); rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
const html = `<!doctype html><pre id=o>start</pre><script>window.onerror=(m)=>{o.textContent='ERR '+m};
${synth}
const D={art:${JSON.stringify({ sound: art.sound })}};const db=(x)=>Math.pow(10,x/20);const S={enabled:true,off:false};
${sfxBody}
function kw(x,sr){const B1=[1.53512485958697,-2.69169618940638,1.19839281085285],A1=[1,-1.69065929318241,0.73248077421585],B2=[1,-2,1],A2=[1,-1.99004745483398,0.99007225036621];
 const f=(x,b,a)=>{const y=new Float32Array(x.length);let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<x.length;i++){const v=b[0]*x[i]+b[1]*x1+b[2]*x2-a[1]*y1-a[2]*y2;x2=x1;x1=x[i];y2=y1;y1=v;y[i]=v;}return y;};return f(f(x,B1,A1),B2,A2);}
function loud(buf){const sr=buf.sampleRate,ch=[...Array(buf.numberOfChannels)].map((_,c)=>kw(buf.getChannelData(c),sr));const N=ch[0].length,blk=Math.floor(0.4*sr),hop=Math.floor(0.1*sr);const L=[];
 for(let s=0;s+blk<=N;s+=hop){let z=0;for(const c of ch){let q=0;for(let i=s;i<s+blk;i++)q+=c[i]*c[i];z+=q/blk;}L.push(z);}
 const lu=(z)=>-0.691+10*Math.log10(z);const abs=L.filter(z=>lu(z)>-70);const m1=abs.reduce((a,b)=>a+b,0)/Math.max(1,abs.length);const rel=abs.filter(z=>lu(z)>lu(m1)-10);const I=lu(rel.reduce((a,b)=>a+b,0)/Math.max(1,rel.length));
 let pk=0;for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>pk)pk=a;}}
 return {lufs_i:+I.toFixed(1),momentary_max:+lu(Math.max(...L)).toFixed(1),peak_dbfs:+(20*Math.log10(pk||1e-9)).toFixed(1)};}
(async()=>{const out={tracks:{},stingers:{},sfx:{}};const M=D.art.sound.music;
 for(const tr of Object.keys(M.tracks)){const c=new OfflineAudioContext(2,48000*${secs},48000);const master=c.createGain();master.gain.value=db(D.art.sound.master_db);master.connect(c.destination);
  const m=createMusic(c,master,M,{seed:20261118,offline:true,offline_s:${secs}});m.play(tr,{hero:tr==='battle'?'h_choir':null});const b=await c.startRendering();out.tracks[tr]={...loud(b),seconds:${secs}};}
 for(const st of Object.keys(M.stingers)){const c=new OfflineAudioContext(2,48000*8,48000);const master=c.createGain();master.gain.value=db(D.art.sound.master_db);master.connect(c.destination);
  const m=createMusic(c,master,M,{seed:5,offline:true,offline_s:8});m.sting(st);const b=await c.startRendering();out.stingers[st]={...loud(b),seconds:8};}
 for(const id of ['card_play','attack_light','attack_heavy','big_entry','turn_timer','card_draw']){const c=new OfflineAudioContext(1,48000*3,48000);S.ctx=c;noiseBuf=null;S.master=c.createGain();S.master.gain.value=db(D.art.sound.master_db);S.master.connect(c.destination);S.sfxBus=c.createGain();S.sfxBus.connect(S.master);sfx(id);const b=await c.startRendering();out.sfx[id]=loud(b);}
 o.textContent='DONE|'+JSON.stringify(out);})().catch(e=>{o.textContent='ERR '+e+' '+(e.stack||'')});</script>`;
writeFileSync(join(work, 'r.html'), html);
// 빠른 실패: 페이지 스크립트 문법 검사(문법 오류면 onerror도 못 걸려 시간 초과가 됨)
{ const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')); try { new Function(js.replace(/await/g, '')); } catch (e) { console.error('페이지 스크립트 오류: ' + e.message); process.exit(1); } }
const edge = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const p = spawn(edge, ['--headless=new', '--disable-gpu', '--remote-debugging-port=8841', `--user-data-dir=${join(work, 'prof')}`, pathToFileURL(join(work, 'r.html')).href], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let res = null;
try {
  let pg; for (let i = 0; i < 40 && !pg; i++) { try { pg = (await (await fetch('http://127.0.0.1:8841/json')).json()).find((t) => t.type === 'page'); } catch {} if (!pg) await sleep(500); }
  const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const wait = new Map(); ws.addEventListener('message', (e) => { const d = JSON.parse(e.data); if (wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); } });
  const call = (m, prm) => new Promise((r) => { const k = ++id; wait.set(k, r); ws.send(JSON.stringify({ id: k, method: m, params: prm })); });
  for (let i = 0; i < 600 && !res; i++) { const v = (await call('Runtime.evaluate', { expression: 'o.textContent' })).result?.result?.value || ''; if (v.startsWith('DONE') || v.startsWith('ERR')) res = v; else await sleep(500); }
  ws.close();
} finally { spawn('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); }
if (!res || res.startsWith('ERR')) { console.error(res || 'timeout'); process.exit(1); }
const out = JSON.parse(res.slice(5));
// 동시 목소리 최대: 사건열을 같은 규칙으로 근사(드론·바람 제외, 사건 길이 = 감쇠 시간)
const M = art.sound.music, ref = +((out.sfx.card_play.momentary_max + out.sfx.attack_light.momentary_max + out.sfx.attack_heavy.momentary_max) / 3).toFixed(1);
const rows = [];
for (const [k, v] of Object.entries(out.tracks)) rows.push({ kind: 'track', id: k, ...v, vs_sfx_lu: +(v.lufs_i - ref).toFixed(1) });
for (const [k, v] of Object.entries(out.stingers)) rows.push({ kind: 'sting', id: k, ...v, vs_sfx_lu: +(v.momentary_max - ref).toFixed(1) });
console.log(`효과음 기준(card_play·attack_light·attack_heavy 순간 최대 평균) ${ref} LUFS · big_entry ${out.sfx.big_entry.momentary_max} · attack_heavy ${out.sfx.attack_heavy.momentary_max} · card_draw ${out.sfx.card_draw.momentary_max}`);
for (const r of rows) console.log(`${r.kind.padEnd(5)} ${r.id.padEnd(15)} ${r.seconds}s  LUFS(I) ${String(r.lufs_i).padStart(6)}  순간최대 ${String(r.momentary_max).padStart(6)}  피크 ${String(r.peak_dbfs).padStart(6)} dBFS  효과음 기준 대비 ${r.vs_sfx_lu} LU`);
const target = M.bgm_vs_sfx_target_lu;
const checks = [
  [`BGM 4곡 통합 음량이 효과음 기준보다 ${-target} LU 이상 작음`, rows.filter((r) => r.kind === 'track').every((r) => r.vs_sfx_lu <= target)],
  ['BGM 피크 ≤ −12 dBFS(효과음 머리 공간)', rows.filter((r) => r.kind === 'track').every((r) => r.peak_dbfs <= -12)],
  ['대전 긴장 곡이 대전 기본보다 크거나 같음(±1 LU)', out.tracks.battle_tension.lufs_i >= out.tracks.battle.lufs_i - 1],
  ['맺음 동기 순간 최대가 큰 카드 효과음보다 작고 효과음 기준 ±6 LU 안', Object.values(out.stingers).every((s) => s.momentary_max < out.sfx.big_entry.momentary_max && Math.abs(s.momentary_max - ref) <= 6)],
];
for (const [n, ok] of checks) console.log(`${ok ? 'OK  ' : 'FAIL'} ${n}`);
mkdirSync(join(PROJ, 'assets', 'samples'), { recursive: true });
writeFileSync(join(PROJ, 'assets', 'samples', 'music-render.json'), JSON.stringify({ seconds: secs, seed: 20261118, reference_sfx: out.sfx, rows, checks: checks.map(([n, ok]) => ({ n, ok })) }, null, 1));
process.exit(checks.every((c) => c[1]) ? 0 : 1);
