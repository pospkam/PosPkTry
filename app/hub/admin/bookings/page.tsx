import { Metadata } from 'next';
import AdminBookingsClient from './_AdminBookingsClient';
export const metadata: Metadata = { title: 'Все бронирования | Kamchatour Admin', robots: 'noindex, nofollow' };
export default function AdminBookingsPage() { return <AdminBookingsClient />; }
