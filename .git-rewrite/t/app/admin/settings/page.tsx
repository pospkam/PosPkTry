import type { Metadata } from 'next';
import SettingsPageClient from './_SettingsPageClient';

export const metadata: Metadata = {
  title: 'Настройки интеграций | Kamhub',
  description: 'Настройка API токенов и интеграций',
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
