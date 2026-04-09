import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Общие правила: всё открыто кроме внутренних хабов и API
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/hub/', '/api/', '/.next/', '/auth/'],
        crawlDelay: 1,
      },

      // Поисковые системы — без ограничений
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },
      // Яндекс — основной бот + все AI-боты (Alice, YandexGPT) содержат подстроку "Yandex"
      {
        userAgent: 'Yandex',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },
      {
        userAgent: 'YandexBot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },
      {
        userAgent: 'YandexImages',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // OpenAI (ChatGPT, GPT-4o browsing, SearchGPT)
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // Anthropic Claude
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },
      {
        userAgent: 'Claude-Web',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // Perplexity AI
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // Microsoft Copilot / Bing
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // Google Gemini
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },
      {
        userAgent: 'Googlebot-News',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // Apple Siri / Apple Intelligence
      {
        userAgent: 'Applebot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },
      {
        userAgent: 'Applebot-Extended',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // Meta AI
      {
        userAgent: 'meta-externalagent',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // You.com
      {
        userAgent: 'YouBot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // Cohere
      {
        userAgent: 'cohere-ai',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // DeepSeek AI
      {
        userAgent: 'DeepSeekBot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // ByteDance / TikTok AI
      {
        userAgent: 'Bytespider',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // Amazon Alexa / Amazonbot
      {
        userAgent: 'Amazonbot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // DuckDuckGo AI (DuckAssist)
      {
        userAgent: 'DuckAssistBot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // AI2 (Allen Institute / OLMo)
      {
        userAgent: 'AI2Bot',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // Mistral AI
      {
        userAgent: 'MistralAI-User',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },

      // xAI Grok
      {
        userAgent: 'Grok',
        allow: '/',
        disallow: ['/hub/', '/api/'],
      },
    ],
    sitemap: 'https://tourhab.ru/sitemap.xml',
    host: 'tourhab.ru',
  };
}
