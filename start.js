#!/usr/bin/env node
const http = require('http');
const { spawn } = require('child_process');
const PORT = parseInt(process.env.PORT || '3000', 10);
const proxy = http.createServer((req, res) => {
  if (['/api/health','/api/ready','/health','/ready'].includes(req.url)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  // Preserve the real public host so Next.js builds correct absolute URLs in redirects.
  // Without these headers Next.js falls back to 127.0.0.1:3001 (internal bind address).
  const forwardedHeaders = {
    ...req.headers,
    'x-forwarded-host':  req.headers['x-forwarded-host']  || req.headers['host'] || '',
    'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'https',
    'x-forwarded-for':   req.headers['x-forwarded-for']   || req.socket.remoteAddress || '127.0.0.1',
  };
  const p = http.request({ hostname:'127.0.0.1', port:3001, path:req.url, method:req.method, headers:forwardedHeaders },
    r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on('error', () => { res.writeHead(503); res.end('starting'); });
  req.pipe(p);
});
proxy.listen(PORT, '0.0.0.0', () => console.log('[proxy] listening'));
spawn('node', ['server.js'], { env: { ...process.env, PORT: '3001', HOSTNAME: '127.0.0.1' }, stdio: 'inherit', cwd: __dirname });
