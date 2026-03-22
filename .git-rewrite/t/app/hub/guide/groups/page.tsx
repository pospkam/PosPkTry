import type { Metadata } from 'next';
import GuideGroupsPageClient from './_GuideGroupsPageClient';

export const metadata: Metadata = {
  title: 'Группы | Гид | Kamhub',
  description: 'Управление туристическими группами',
  robots: 'noindex, nofollow',
};

export default function GuideGroupsPage() {
  return <GuideGroupsPageClient />;
}
