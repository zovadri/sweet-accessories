const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = 3000;
const DIR = __dirname;
const HOST = '0.0.0.0';

let DASHBOARD_KEY = 'sweet2026';
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(DIR, 'dashboard', 'config.json'), 'utf8'));
  if (cfg.dashboardKey) DASHBOARD_KEY = cfg.dashboardKey;
} catch (e) {}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.xml': 'text/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

const CACHE_MAX = 60 * 60 * 24 * 30;
const CACHE_SHORT = 60 * 60;

function isDashboard(url) {
  return url === '/dashboard' || url.startsWith('/dashboard/');
}

function sendData(res, status, headers, data) {
  headers['Content-Length'] = Buffer.byteLength(data);
  res.writeHead(status, headers);
  res.end(data);
}

function send404(res, notFoundPath) {
  const fp = notFoundPath || path.join(DIR, '404.html');
  fs.readFile(fp, (e, d) => {
    sendData(res, 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }, d || '<h1>404</h1>');
  });
}

function serveFile(res, filePath, ext, acceptEncoding) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return send404(res);
      return sendData(res, 500, { 'Content-Type': 'text/plain' }, Buffer.from('500'));
    }

    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    if (ext === '.html') {
      headers['Cache-Control'] = 'no-cache';
    } else if (['.css', '.js', '.svg', '.png', '.jpg', '.ico', '.webp', '.json'].includes(ext)) {
      headers['Cache-Control'] = `public, max-age=${CACHE_MAX}, immutable`;
    } else {
      headers['Cache-Control'] = `public, max-age=${CACHE_SHORT}`;
    }

    const useGzip = acceptEncoding && acceptEncoding.includes('gzip') && data.length > 1400 && ext !== '.jpg' && ext !== '.png';
    if (useGzip) {
      zlib.gzip(data, (e, compressed) => {
        if (e) { sendData(res, 200, headers, data); return; }
        headers['Content-Encoding'] = 'gzip';
        sendData(res, 200, headers, compressed);
      });
    } else {
      sendData(res, 200, headers, data);
    }
  });
}

const server = http.createServer((req, res) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  let url = req.url.split('?')[0];
  const query = req.url.split('?')[1] || '';
  const params = new URLSearchParams(query);

  if (isDashboard(url)) {
    const key = params.get('key') || '';
    const cookieMatch = (req.headers.cookie || '').match(/dash_key=([^;]+)/);
    const validKey = cookieMatch ? cookieMatch[1] : key;
    if (validKey !== DASHBOARD_KEY) return send404(res);

    const setCookie = !cookieMatch && key;
    if (setCookie) {
      res.setHeader('Set-Cookie', `dash_key=${DASHBOARD_KEY}; Path=/dashboard; Max-Age=86400; HttpOnly; SameSite=Lax`);
    }

    if (url === '/dashboard') url = '/dashboard/';
    if (url === '/dashboard/') url = '/dashboard/index.html';
  }

  if (url === '/') url = '/index.html';

  const filePath = path.normalize(path.join(DIR, url));
  if (!filePath.startsWith(DIR)) return send404(res);

  const ext = path.extname(filePath).toLowerCase();
  serveFile(res, filePath, ext, acceptEncoding);
});

server.listen(PORT, HOST, () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   Sweet Accessories - Production     ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log('  ✅  Server running');
  console.log('  🌐  http://localhost:' + PORT);
  ips.forEach(ip => console.log('  🌐  http://' + ip + ':' + PORT));
  console.log('');
  console.log('  🔐  Dashboard: /dashboard/?key=' + DASHBOARD_KEY);
  console.log('  🛑  Ctrl+C to stop');
  console.log('');
});
