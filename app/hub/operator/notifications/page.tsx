import { Metadata } from 'next';
import NotificationsClient from './_NotificationsClient';
export const metadata: Metadata = { title: 'Уведомления оператора | Kamchatour', robots: 'noindex, nofollow' };
export default function NotificationsPage() { return <NotificationsClient />; }
