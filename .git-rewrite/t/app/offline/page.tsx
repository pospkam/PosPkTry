import { Metadata } from 'next';
import OfflineClient from './_OfflineClient';

export const metadata: Metadata = {
  title: 'Нет подключения | Kamchatour',
};

export default function OfflinePage() {
  return <OfflineClient />;
}
