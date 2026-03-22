import { Metadata } from 'next';
import GuidesClient from './_GuidesClient';
export const metadata: Metadata = { title: 'Гиды | Kamchatour', robots: 'noindex, nofollow' };
export default function GuidesPage() { return <GuidesClient />; }
