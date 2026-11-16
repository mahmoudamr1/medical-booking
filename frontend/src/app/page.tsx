'use client';

import { HomeScreen } from '@/features/directory';
import { UrgentBanner } from '@/features/urgent';

export default function HomePage() {
  return <HomeScreen urgentBanner={<UrgentBanner />} />;
}
