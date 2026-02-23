import type { Metadata } from 'next';
import RegisterPageClient from './_RegisterPageClient';

export const metadata: Metadata = {
  title: 'Регистрация | Kamhub',
  description: 'Создайте аккаунт на платформе Kamhub для туристов и операторов',
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
