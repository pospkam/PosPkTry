import type { Metadata } from 'next';
import RoutesAnalysisClient from './_RoutesAnalysisClient';

export const metadata: Metadata = {
  title: 'Анализ маршрутов — TourHub Admin',
};

export default function RoutesAnalysisPage() {
  return <RoutesAnalysisClient />;
}
