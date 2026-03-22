import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tourhab.ru';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/hub/',
          '/admin/',
          '/profile/',
          '/_next/',
          '/auth/callback',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/hub/',
          '/admin/',
          '/profile/',
        ],
      },
      {
        userAgent: 'Yandexbot',
        allow: '/',
        disallow: [
          '/api/',
          '/hub/',
          '/admin/',
          '/profile/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
