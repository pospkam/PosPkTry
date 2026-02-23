import type { Metadata } from 'next';
import PartnerRegisterPageClient from './_PartnerRegisterPageClient';

export const metadata: Metadata = {
  title: 'Регистрация партнёра | Kamhub',
  description: 'Станьте партнёром Kamhub — размещайте туры и услуги на Камчатке',
};

export default function PartnerRegisterPage() {
  return <PartnerRegisterPageClient />;
}
