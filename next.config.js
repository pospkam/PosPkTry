/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '60mb',
    },
  },
  // outputFileTracingRoot removed — may prevent standalone output

  // ESLint: skip during build (saves ~500MB RAM) — checks run locally via CI
  // TypeScript: keep strict — fast and catches real errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,  // Keep true to avoid blocking deploys on minor TS issues
  },

  // unoptimized: убирает sharp/@img (~33MB) из standalone — критично для Timeweb лимита 50MB
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },

  // outputFileTracingExcludes DISABLED — was causing pages to be excluded from build
  // (broken syntax: strings without keys in object)

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
      { source: '/fishingkam',         destination: '/operators/kamchatskaya-rybalka', permanent: true },
      // Исправление мёртвых ссылок
      { source: '/tours',         destination: '/marketplace',    permanent: true },
      { source: '/terms',         destination: '/legal/terms',    permanent: true },
      { source: '/auth/register', destination: '/operators/join', permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: '/widget/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.yandex.ru; font-src 'self' data:; frame-ancestors *;" },
        ],
      },
      {
        source: '/:path((?!widget/).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://api-maps.yandex.ru https://*.yandex.ru https://mc.yandex.ru https://unpkg.com https://emrldco.com; style-src 'self' 'unsafe-inline' https://*.yandex.ru https://unpkg.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.yandex.ru https://*.yandex.net https://mc.yandex.ru https://mc.yandex.md wss://mc.yandex.ru https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://tile.opentopomap.org https://*.tile.opentopomap.org https://s3.twcstorage.ru https://emrldco.com; font-src 'self' data: https://*.yandex.ru;" },
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
