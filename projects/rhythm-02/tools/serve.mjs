#!/usr/bin/env node
// 레포 루트 정적 서버 (fetch 때문에 file:// 로는 안 열림). 외부 의존 없음. rhythm-02 포트 대역 8730~8739 만 씀.
//   node projects/rhythm-02/tools/serve.mjs [port=8730]   → http://localhost:<port>/games/rhythm-02/
// 시작하면 PID 를 출력한다. 종료는 그 PID 만(다른 팀 서버는 건드리지 않음).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PORT = +(process.argv[2] || process.env.PORT || 8730);
if (!(PORT >= 8730 && PORT <= 8739)) { console.error(`포트 ${PORT}: rhythm-02 대역(8730~8739) 밖`); process.exit(2); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const srv = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = normalize(join(ROOT, p));
    if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if ((await stat(f).catch(() => null))?.isDirectory()) f = join(f, 'index.html');
    const body = await readFile(f);
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
srv.on('error', (e) => { console.error(`serve: ${e.code || e.message}`); process.exit(3); });
srv.listen(PORT, '127.0.0.1', () => console.log(`pid ${process.pid} http://localhost:${PORT}/games/rhythm-02/`));
