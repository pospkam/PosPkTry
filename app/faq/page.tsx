import type { Metadata } from 'next';
import FaqClient from './_FaqClient';

export const metadata: Metadata = {
  title: 'Часто задаваемые вопросы | Tourhab',
  description: 'Ответы на популярные вопросы о турах по Камчатке, бронировании и безопасности',
};

export default function FaqPage() {
  return <FaqClient />;
}
