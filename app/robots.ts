import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tourhab.ru';

const DISALLOW = [
  '/api/',
  '/hub/',
  '/auth/',
  '/admin/',
  '/profile/',
  '/_next/',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/routes',
          '/routes/',
          '/map',
          '/operators',
          '/operators/',
          '/safety',
          '/eco',
          '/search',
        ],
        disallow: DISALLOW,
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: DISALLOW,
      },
      {
        userAgent: 'Yandexbot',
        allow: ['/'],
        disallow: DISALLOW,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
