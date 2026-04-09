import type { Metadata } from 'next';
import CalendarClient from './_CalendarClient';

export const metadata: Metadata = {
  title: 'Календарь туров — KamchatourHub',
  description: 'Выберите дату и найдите доступные туры на Камчатке: треккинг, рыбалка, вертолётные экскурсии, наблюдение за медведями.',
};

export default function CalendarPage() {
  return <CalendarClient />;
}
