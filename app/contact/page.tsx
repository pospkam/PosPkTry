import type { Metadata } from 'next';
import ContactClient from './_ContactClient';

export const metadata: Metadata = {
  title: 'Оставить заявку — KamchatourHub',
  description: 'Оставьте заявку на тур по Камчатке. Наши специалисты подберут маршрут под ваши пожелания.',
};

export default function ContactPage() {
  return <ContactClient />;
}
