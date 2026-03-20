import type { Metadata } from 'next';
import OperatorHelpClient from './_OperatorHelpClient';

export const metadata: Metadata = {
  title: 'Справка — Кабинет оператора',
};

export default function OperatorHelpPage() {
  return <OperatorHelpClient />;
}
