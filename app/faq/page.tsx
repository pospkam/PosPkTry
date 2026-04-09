import type { Metadata } from 'next';
import { query } from '@/lib/database';
import { Header } from '@/components/layout/Header';
import FaqClient from './_FaqClient';

export const metadata: Metadata = {
  title: 'Вопросы и ответы о турах на Камчатку — TourHab',
  description: 'Ответы на 30+ вопросов о путешествии на Камчатку: когда ехать, вулканы, медведи, горячие источники, безопасность, цены, бронирование туров.',
  keywords: [
    'вопросы о турах на Камчатку',
    'Камчатка для туристов',
    'когда ехать на Камчатку',
    'вулканы Камчатки FAQ',
    'медведи Камчатка безопасность',
    'горячие источники Камчатка',
    'Долина гейзеров как добраться',
    'стоимость туров Камчатка',
  ],
  openGraph: {
    title: 'Вопросы и ответы о турах на Камчатку',
    description: 'Всё, что нужно знать перед поездкой: вулканы, медведи, маршруты, цены, безопасность.',
    url: 'https://tourhab.ru/faq',
    siteName: 'TourHab',
    locale: 'ru_RU',
    type: 'website',
  },
  alternates: { canonical: 'https://tourhab.ru/faq' },
};

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  priority: number;
  helpful: number;
}

async function getFaqs(): Promise<FaqRow[]> {
  try {
    const result = await query<FaqRow>(
      `SELECT id::text, question, answer, category, priority, helpful
       FROM faqs
       ORDER BY priority ASC, helpful DESC, id
       LIMIT 100`,
      []
    );
    return result.rows;
  } catch {
    return [];
  }
}

export default async function FaqPage() {
  const faqs = await getFaqs();

  // FAQPage Schema.org — AI-боты и поисковики читают это как структурированные Q&A
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* SSR-контент для AI-ботов и поисковиков (скрыт визуально, но в HTML) */}
      <div style={{ display: 'none' }} aria-hidden="true" data-ai-content="faq">
        {faqs.map(f => (
          <article key={f.id}>
            <h2>{f.question}</h2>
            <p>{f.answer}</p>
          </article>
        ))}
      </div>
      <Header />
      {/* Интерактивный клиентский компонент */}
      <FaqClient initialItems={faqs} />
    </>
  );
}
