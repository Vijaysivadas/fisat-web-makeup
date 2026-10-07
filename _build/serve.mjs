// =========================================================
// Zero-dependency static server for local preview.
//   npm run serve                 -> http://127.0.0.1:5173
//   npm run serve -- --port 8080
// =========================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flag = process.argv.indexOf('--port');
const PORT = Number(flag > -1 ? process.argv[flag + 1] : process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
};

const notFound = (res) => res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      return res.writeHead(400).end('Bad request');
    }
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    // never serve dotfiles such as .git
    if (urlPath.split('/').some((seg) => seg.startsWith('.'))) return notFound(res);

    const file = path.join(ROOT, path.normalize(urlPath));
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return res.writeHead(403).end('Forbidden');

    fs.stat(file, (err, stat) => {
      if (err) return notFound(res);
      if (stat.isDirectory()) return res.writeHead(301, { Location: urlPath + '/' }).end();
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(file).pipe(res);
    });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`FISAT site running at http://127.0.0.1:${PORT}  (Ctrl+C to stop)`));
