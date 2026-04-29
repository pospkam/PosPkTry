#!/usr/bin/env node
const http = require('http');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.PORT || '3000', 10);
const NEXT_PORT = PORT + 1;

// Instant health check server
const healthApp = http.createServer((req, res) => {
  if (['/api/health', '/api/ready', '/health', '/ready'].includes(req.url)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'kamchatour-hub' }));
    return;
  }
  const p = http.request({ hostname:'127.0.0.1', port:NEXT_PORT, path:req.url, method:req.method, headers:req.headers },
    (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on('error', () => { res.writeHead(503); res.end('starting'); });
  req.pipe(p);
});

healthApp.listen(PORT, '0.0.0.0', () => console.log(`health on :${PORT}`));

const child = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: String(NEXT_PORT), HOSTNAME: '127.0.0.1' },
  stdio: 'inherit', cwd: __dirname,
});

child.on('exit', (c) => { healthApp.close(() => process.exit(c || 0)); });
process.on('SIGTERM', () => { child.kill('SIGTERM'); healthApp.close(() => process.exit(0)); });
