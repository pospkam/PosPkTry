import { Metadata } from 'next';
import StatsClient from './_StatsClient';
export const metadata: Metadata = { title: 'Статистика агента | Kamchatour', robots: 'noindex, nofollow' };
export default function StatsPage() { return <StatsClient />; }
