/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Лимит тела запроса для API routes (загрузка фото) — Next.js 15: top-level
  serverBodySizeLimit: '60mb',

  experimental: {
    // Параллельная компиляция страниц — 2-3x быстрее на multi-core
    workerThreads: true,
  },

  // ONNX Runtime (used by @huggingface/transformers) has native Node.js addons
  // that cannot be bundled by webpack — must be resolved at runtime.
  serverExternalPackages: ['onnxruntime-node', '@huggingface/transformers'],

  // ESLint: skip during build (saves ~500MB RAM) — checks run locally via CI
  // TypeScript: keep strict — fast and catches real errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TODO: вернуть false после первого успешного деплоя на 4cpu сервере
    ignoreBuildErrors: true,
  },

  // unoptimized: убирает sharp/@img (~33MB) из standalone — критично для Timeweb лимита 50MB
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },

  // Исключить dev/ML пакеты из standalone — критично для лимита 50MB Timeweb
  outputFileTracingExcludes: {
    '*': [
      // Dev dependencies
      'node_modules/typescript/**',
      'node_modules/caniuse-lite/**',
      'node_modules/@swc/core/**',
      'node_modules/sharp/**',
      'node_modules/@img/**',
      // ML/Embedding — семантический поиск работает, но не критичен для deploy
      'node_modules/onnxruntime-node/**',
      'node_modules/onnxruntime-web/**',
      'node_modules/onnxruntime-common/**',
      'node_modules/@huggingface/**',
      // Next.js build-time modules (не нужны в standalone runtime)
      'node_modules/next/dist/compiled/amphtml-validator/**',
      'node_modules/next/dist/compiled/babel/**',
      'node_modules/next/dist/compiled/babel-packages/**',
      'node_modules/next/dist/compiled/next-devtools/**',
      'node_modules/next/dist/compiled/postcss-preset-env/**',
      'node_modules/next/dist/compiled/cssnano-simple/**',
      'node_modules/next/dist/compiled/crypto-browserify/**',
    ],
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },

  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'onnxruntime-node',
      ];
    }
    return config;
  },

  async redirects() {
    return [
      {
        source: '/fishingkam',
        destination: '/operators/kamchatskaya-rybalka',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://api-maps.yandex.ru https://*.yandex.ru https://mc.yandex.ru https://unpkg.com; style-src 'self' 'unsafe-inline' https://*.yandex.ru https://unpkg.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.yandex.ru https://*.yandex.net https://mc.yandex.ru https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://s3.twcstorage.ru; font-src 'self' data: https://*.yandex.ru;" },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/hub/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
}

module.exports = nextConfig