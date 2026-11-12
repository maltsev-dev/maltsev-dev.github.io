// Minimal static file server for the QA passes. The build is plain files, so
// this needs no dependencies — and avoids pulling an npm package just to serve
// a directory that already exists on disk.
//
// Usage: node _qa_server.mjs <dir> [port]

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const ROOT = process.argv[2] || 'dist';
const PORT = Number(process.argv[3] || 4400);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.md': 'text/markdown; charset=utf-8',
};

createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  // Block traversal outside the served root.
  p = normalize(p).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, p);

  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    // GitHub Pages serves /404.html for anything it cannot resolve.
    const notFound = join(ROOT, '404.html');
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    createReadStream(existsSync(notFound) ? notFound : __filename).pipe(res);
    return;
  }

  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  const stat = statSync(file);
  const headers = { 'content-type': type, 'content-length': stat.size, 'accept-ranges': 'bytes' };

  // Range requests: without them <video> cannot seek or stream on some browsers.
  const range = req.headers.range;
  if (range && /^bytes=/.test(range)) {
    const [s, e] = range.replace('bytes=', '').split('-');
    const start = Number(s) || 0;
    const end = e ? Number(e) : stat.size - 1;
    res.writeHead(206, {
      ...headers,
      'content-range': `bytes ${start}-${end}/${stat.size}`,
      'content-length': end - start + 1,
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));