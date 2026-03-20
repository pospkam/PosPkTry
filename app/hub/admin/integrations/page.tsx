import { Metadata } from 'next';
import IntegrationsClient from './_IntegrationsClient';

export const metadata: Metadata = {
  title: 'Интеграции / OCTO — Admin',
};

export default function IntegrationsPage() {
  return <IntegrationsClient />;
}
