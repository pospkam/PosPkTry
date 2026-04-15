import type { Metadata } from 'next';
import IntelligenceSourcesClient from './_IntelligenceSourcesClient';

export const metadata: Metadata = { title: 'Источники разведки' };

export default function IntelligenceSourcesPage() {
  return <IntelligenceSourcesClient />;
}
