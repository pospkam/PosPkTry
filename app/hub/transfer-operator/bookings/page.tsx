import { Metadata } from 'next';
import TransferBookingsClient from './_TransferBookingsClient';
export const metadata: Metadata = { title: 'Бронирования трансферов | Kamchatour', robots: 'noindex, nofollow' };
export default function TransferBookingsPage() { return <TransferBookingsClient />; }
