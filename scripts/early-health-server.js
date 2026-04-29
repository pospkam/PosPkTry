// Early-start proxy server for Timeweb health check
// 1. Instantly responds to /api/health, /api/ready on port 3000
// 2. Starts Next.js standalone server on port 3001
// 3. Proxies all other requests to Next.js

const http = require('http');

const PORT = parseInt(process.env.PORT || '3000', 10);
const NEXT_PORT = PORT + 1;

const HEALTH_PATHS = ['/api/health', '/api/ready', '/health', '/ready'];

// ─── Health check server (starts immediately) ──────────────────────────

const healthServer = http.createServer((req, res) => {
  if (HEALTH_PATHS.includes(req.url)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'kamchatour-hub' }));
    return;
  }
  // All other requests → proxy to Next.js
  const proxyReq = http.request(
    `http://localhost:${NEXT_PORT}${req.url}`,
    { method: req.method, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on('error', () => {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'starting' }));
  });
  req.pipe(proxyReq);
});

healthServer.listen(PORT, () => {
  console.log(`Health proxy listening on port ${PORT}`);

  // ─── Start Next.js standalone server on NEXT_PORT ────────────────────

  const { fork } = require('child_process');
  const child = fork(require.resolve('./server.js'), {
    env: { ...process.env, PORT: String(NEXT_PORT), HOSTNAME: 'localhost' },
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error('Next.js child process error:', err);
    healthServer.close();
    process.exit(1);
  });

  child.on('exit', (code) => {
    console.log(`Next.js exited with code ${code}`);
    healthServer.close();
    process.exit(code || 0);
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    healthServer.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
    healthServer.close(() => process.exit(0));
  });
});
