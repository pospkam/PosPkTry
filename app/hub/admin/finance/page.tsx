import type { Metadata } from 'next';
import AdminFinanceClient from './_AdminFinanceClient';

export const metadata: Metadata = {
  title: 'Финансы | Панель администратора Tourhab',
  description: 'Управление финансами и выплатами на платформе Tourhab',
};

export default function AdminFinancePage() {
  return <AdminFinanceClient />;
}

