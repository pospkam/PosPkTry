import type { Metadata } from 'next';
import AdminFinanceClient from './_AdminFinanceClient';

export const metadata: Metadata = {
  title: 'Финансы | Панель администратора Kamhub',
  description: 'Управление финансами и выплатами на платформе Kamhub',
};

export default function AdminFinancePage() {
  return <AdminFinanceClient />;
}

