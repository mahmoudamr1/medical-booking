'use client';

import Link from 'next/link';
import {
  Activity,
  Baby,
  Bone,
  Brain,
  Ear,
  Eye,
  Heart,
  HeartPulse,
  Pill,
  Scissors,
  Smile,
  Stethoscope,
  Syringe,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useFormat, useT } from '@/i18n/provider';
import type { Specialty } from '@/types/api';
import { searchHref } from '../searchParams';

/** Icon names stored on specialties (admin-managed) → lucide icons. Unknown names fall back. */
const ICONS: Record<string, LucideIcon> = {
  heart: Heart,
  'heart-pulse': HeartPulse,
  baby: Baby,
  eye: Eye,
  brain: Brain,
  bone: Bone,
  ear: Ear,
  tooth: Smile,
  smile: Smile,
  stethoscope: Stethoscope,
  scissors: Scissors,
  pill: Pill,
  syringe: Syringe,
  activity: Activity,
  users: Users,
};

function SpecialtyIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = ICONS[icon?.toLowerCase() ?? ''] ?? Stethoscope;
  return <Icon className={className} aria-hidden />;
}

/** Link to the doctors of one specialty. */
export function SpecialtyCard({
  specialty,
  showDescription = false,
}: {
  specialty: Specialty;
  showDescription?: boolean;
}) {
  const t = useT();
  const f = useFormat();
  const description = showDescription ? f.l(specialty, 'description') : '';
  return (
    <Link
      href={searchHref({ specialty: specialty.slug })}
      className="group flex h-full items-start gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 sm:p-5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <SpecialtyIcon icon={specialty.icon} className="size-5" />
      </span>
      <span className="min-w-0 space-y-1">
        <span className="block font-medium text-foreground">{f.l(specialty)}</span>
        {description && (
          <span className="line-clamp-2 block text-sm text-muted-foreground">{description}</span>
        )}
        {typeof specialty.doctors_count === 'number' && (
          <span className="block text-xs text-muted-foreground">
            {t('specialties.doctorsCount', { count: f.number(specialty.doctors_count) })}
          </span>
        )}
      </span>
    </Link>
  );
}
