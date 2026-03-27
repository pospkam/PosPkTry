import type { Metadata } from 'next';
import BoardMeetingClient from './_BoardMeetingClient';

export const metadata: Metadata = {
  title: 'Команда AI — TourHub Admin',
};

export default function BoardMeetingPage() {
  return <BoardMeetingClient />;
}
