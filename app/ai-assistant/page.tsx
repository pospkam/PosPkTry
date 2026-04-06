import type { Metadata } from 'next';
import AIAssistantClient from './_AIAssistantClient';

export const metadata: Metadata = {
  title: 'AI-ассистент Кузьмич — туры на Камчатку 2026 | TourHab',
  description: 'Бесплатный AI-помощник по турам на Камчатку. Кузьмич подберёт маршрут, рассчитает бюджет и ответит на вопросы о вулканах, рыбалке и медведях.',
};

export default function AIAssistantPage() {
  return <AIAssistantClient />;
}
