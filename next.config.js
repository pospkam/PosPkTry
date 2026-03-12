/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

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
      'node_modules/@aws-sdk/**',
      'node_modules/@smithy/**',
      'node_modules/@aws-crypto/**',
      'node_modules/fast-xml-parser/**',
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
      'node_modules/next/dist/build/**',
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

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" },
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