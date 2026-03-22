import type { Metadata } from 'next';
import MessagesClient from './_MessagesClient';

export const metadata: Metadata = {
  title: 'Сообщения — KamchatourHub',
  description: 'Ваши чаты с операторами, гидами и поддержкой',
};

export default function MessagesPage() {
  return <MessagesClient />;
}
