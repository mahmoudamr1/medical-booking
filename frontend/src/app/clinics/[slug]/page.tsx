'use client';

import { use } from 'react';
import { ClinicProfileScreen } from '@/features/clinic';

export default function ClinicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <ClinicProfileScreen slug={slug} />;
}
