import type { Metadata } from 'next';
import { ArtemWorkspaceClient } from './_ArtemWorkspaceClient';

export const metadata: Metadata = {
  title: 'Рабочее место МЧС — KamchatourHub',
};

export default function ArtemWorkspacePage() {
  return <ArtemWorkspaceClient />;
}
