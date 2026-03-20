import { Metadata } from 'next';
import OnboardingClient from './_OnboardingClient';

export const metadata: Metadata = {
  title: 'Настройка профиля — TourHub',
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
