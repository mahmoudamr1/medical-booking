'use client';

import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFormat, useI18n } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/translate';
import { cn } from '@/lib/utils';
import type { ClinicMembership } from './ClinicContext';

export function roleKey(role: string): TranslationKey {
  return (
    ['owner', 'manager', 'receptionist'].includes(role)
      ? `clinic.roles.${role}`
      : 'clinic.roles.receptionist'
  ) as TranslationKey;
}

/**
 * Clinic picker at the top of the dashboard sidebar. The selected clinic id is the route segment
 * (/dashboard/clinic/{id}/…); switching keeps the current section and drops filters.
 * `rail` renders an icon-only trigger for the collapsed sidebar.
 */
export function ClinicSwitcher({
  current,
  clinics,
  rail = false,
}: {
  current: ClinicMembership;
  clinics: ClinicMembership[];
  rail?: boolean;
}) {
  const { t, dir } = useI18n();
  const f = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const multiple = clinics.length > 1;
  const name = f.l(current);

  const switchTo = (id: string) => {
    if (id === current.id) return;
    const prefix = `/dashboard/clinic/${current.id}`;
    const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
    // Detail sub-routes don't exist across clinics; keep only the section.
    const section = rest.split('/').filter(Boolean)[0];
    router.push(`/dashboard/clinic/${id}${section ? `/${section}` : ''}`);
  };

  const icon = (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary ring-1 ring-primary/10">
      <Building2 className="size-[18px]" aria-hidden />
    </span>
  );

  const body = (
    <>
      {icon}
      {!rail && (
        <span className="min-w-0 flex-1 text-start">
          <span className="block text-[11px] text-muted-foreground">
            {t('clinic.dash.currentClinic')}
          </span>
          <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t(roleKey(current.role))}
          </span>
        </span>
      )}
      {!rail && multiple && (
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </>
  );

  const boxCls = cn(
    'flex w-full items-center gap-3 rounded-xl border bg-card text-start shadow-xs transition-colors duration-150 outline-none motion-reduce:transition-none',
    rail ? 'justify-center border-transparent bg-transparent p-1 shadow-none' : 'p-2.5',
  );

  if (!multiple) {
    if (!rail) return <div className={boxCls}>{body}</div>;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={boxCls}
            tabIndex={0}
            aria-label={`${t('clinic.dash.currentClinic')}: ${name}`}
          >
            {body}
          </div>
        </TooltipTrigger>
        <TooltipContent side={dir === 'rtl' ? 'left' : 'right'} sideOffset={10}>
          {name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          boxCls,
          'hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-sidebar-accent',
        )}
        aria-label={`${t('clinic.dash.switchClinic')}: ${name}`}
      >
        {body}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={rail ? (dir === 'rtl' ? 'left' : 'right') : 'bottom'}
        className="w-64"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('clinic.dash.switchClinic')}
        </DropdownMenuLabel>
        {clinics.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => switchTo(c.id)} className="min-h-11 gap-2.5">
            <Building2 className="text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{f.l(c)}</span>
              <span className="block text-xs text-muted-foreground">{t(roleKey(c.role))}</span>
            </span>
            {c.id === current.id && <Check className="text-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
