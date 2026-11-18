// 정적 서버(레포 루트). node projects/tcg-01/tools/qa/serve.mjs <port>  — python 없음 대체(DEV_NOTES D10)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', '..');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain' };
const port = +(process.argv[2] || 8820);
createServer(async (req, res) => {
  try {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([\/])+/, '');
    if (p.includes('..')) throw 0;
    const f = join(ROOT, p.endsWith('/') || !p ? p + 'index.html' : p);
    const b = await readFile(f);
    res.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b);
  } catch { res.writeHead(404); res.end('404'); }
}).listen(port, '127.0.0.1', () => console.log('ready ' + port + ' pid ' + process.pid));
