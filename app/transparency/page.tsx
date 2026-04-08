import type { Metadata } from 'next';
import TransparencyClient from './_TransparencyClient';

export const metadata: Metadata = {
  title: 'Прозрачность управления — AI-совет TourHab',
  description:
    'Публичный отчёт о том, как 13 AI-директоров управляют платформой TourHab: решения совета, инициативы, исполнение. Autonomously operated. Responsibly governed.',
  openGraph: {
    title: 'Как AI-директора управляют TourHab',
    description:
      '13 специализированных AI-агентов управляют платформой туризма Камчатки в реальном времени. Все решения публичны.',
    type: 'website',
  },
};

export default function TransparencyPage() {
  return <TransparencyClient />;
}
