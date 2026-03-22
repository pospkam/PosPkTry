import { Metadata } from 'next';
import ModerationClient from './_ModerationClient';
export const metadata: Metadata = { title: 'Модерация | Kamchatour Admin', robots: 'noindex, nofollow' };
export default function ModerationPage() { return <ModerationClient />; }
