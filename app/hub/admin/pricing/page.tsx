import { Metadata } from 'next';
import PricingClient from './_PricingClient';

export const metadata: Metadata = {
  title: 'Динамические цены — Admin',
};

export default function PricingPage() {
  return <PricingClient />;
}
