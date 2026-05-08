import type { Metadata } from 'next';
import LeadDetailClient from './_LeadDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Лид | AI Lead Processor',
};

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  return <LeadDetailClient leadId={id} />;
}
