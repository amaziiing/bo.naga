// Minimal static file server for local preview of this static BO frontend.
// Temporary dev helper - not part of the app. Run:
//   node .pi-local-server.js [port]
// Then open http://127.0.0.1:5500/
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const PORT = Number(process.argv[2] || 5500);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({ 'Cache-Control': 'no-store' }, headers || {}));
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    return send(res, 400, 'Bad request');
  }

  let filePath = path.join(ROOT, urlPath);
  // Block path traversal outside ROOT.
  if (!path.resolve(filePath).startsWith(ROOT)) {
    return send(res, 403, 'Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        return send(res, 404, 'Not found: ' + urlPath, {
          'Content-Type': 'text/plain; charset=utf-8',
        });
      }
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, data, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('BO local preview: http://127.0.0.1:' + PORT + '/  (root: ' + ROOT + ')');
});
