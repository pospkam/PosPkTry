import { Metadata } from 'next';
import { PlannerClient } from './_PlannerClient';

export const metadata: Metadata = {
  title: 'Конструктор маршрута — Камчатка',
  description: 'Постройте идеальный маршрут по Камчатке: выберите активности, получите AI-рекомендацию и настройте каждый день поездки.',
};

export default function PlannerPage() {
  return <PlannerClient />;
}
