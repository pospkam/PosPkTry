import type { Metadata } from 'next';
import TaaftClient from './_TaaftClient';

export const metadata: Metadata = {
  title: 'AI-инструменты — Volcano OS',
  description: 'Каталог внешних AI-инструментов для Kuzmich и агентов',
};

export default function TaaftPage() {
  return <TaaftClient />;
}
