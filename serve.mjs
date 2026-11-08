import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 8080);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.exe': 'application/octet-stream',
  '.zip': 'application/zip',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const safe = path.normalize(url).replace(/^([/\\])+/, '');
    let file = path.join(root, safe);
    try {
      if (statSync(file).isDirectory()) file = path.join(file, 'index.html');
      const stat = statSync(file);
      const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
      const range = req.headers.range;
      if (range) {
        const match = /bytes=(\\d*)-(\\d*)/.exec(range);
        const start = match && match[1] ? Number(match[1]) : 0;
        const end = match && match[2] ? Number(match[2]) : stat.size - 1;
        res.writeHead(206, {
          'Content-Type': type,
          'Content-Length': end - start + 1,
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes'
        });
        createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  })
  .listen(port, '0.0.0.0', () => console.log(`serving ${root} on ${port}`));