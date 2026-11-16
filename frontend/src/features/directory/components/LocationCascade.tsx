'use client';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/form';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { useAreas, useCities, useGovernorates } from '../hooks/useLookups';
import { LookupSelect } from './LookupSelect';

export interface LocationValue {
  governorate: string;
  city: string;
  area: string;
}

interface LocationLabels {
  governorate: string;
  city: string;
  area?: string;
  /** Text of the empty ("any / choose") option of each select. */
  anyGovernorate: string;
  anyCity: string;
  anyArea?: string;
}

/**
 * Governorate → city → (area) selects backed by /locations/*. Changing a parent clears its children.
 * Controlled: the parent owns the value (URL params, react-hook-form, or local state).
 */
export function LocationCascade({
  value,
  onChange,
  labels,
  idPrefix,
  showArea = false,
  required,
  errors,
  className,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  labels: LocationLabels;
  idPrefix: string;
  showArea?: boolean;
  required?: { governorate?: boolean; city?: boolean };
  errors?: Partial<Record<keyof LocationValue, string>>;
  className?: string;
}) {
  const t = useT();
  const governorates = useGovernorates();
  const cities = useCities(value.governorate);
  const areas = useAreas(value.city, showArea);
  const failed = [governorates, cities, areas].find((lookup) => lookup.isError);

  return (
    <div className={cn('grid gap-4', showArea ? 'sm:grid-cols-3' : 'sm:grid-cols-2', className)}>
      <Field
        label={labels.governorate}
        htmlFor={`${idPrefix}-gov`}
        required={required?.governorate}
        error={errors?.governorate}
      >
        <LookupSelect
          id={`${idPrefix}-gov`}
          options={governorates.data}
          value={value.governorate}
          placeholder={labels.anyGovernorate}
          invalid={!!errors?.governorate}
          disabled={governorates.isPending}
          onChange={(governorate) => onChange({ governorate, city: '', area: '' })}
        />
      </Field>
      <Field
        label={labels.city}
        htmlFor={`${idPrefix}-city`}
        required={required?.city}
        error={errors?.city}
      >
        <LookupSelect
          id={`${idPrefix}-city`}
          options={cities.data}
          value={value.city}
          placeholder={labels.anyCity}
          invalid={!!errors?.city}
          disabled={!value.governorate || cities.isPending}
          onChange={(city) => onChange({ ...value, city, area: '' })}
        />
      </Field>
      {showArea && labels.area && (
        <Field label={labels.area} htmlFor={`${idPrefix}-area`} error={errors?.area}>
          <LookupSelect
            id={`${idPrefix}-area`}
            options={areas.data}
            value={value.area}
            placeholder={labels.anyArea ?? ''}
            invalid={!!errors?.area}
            disabled={!value.city || areas.isPending || !areas.data?.length}
            onChange={(area) => onChange({ ...value, area })}
          />
        </Field>
      )}
      {failed && (
        <p role="alert" className="col-span-full flex flex-wrap items-center gap-x-2 text-sm">
          <span className="text-destructive">{t('errors.loadFailed')}</span>
          <Button type="button" variant="link" size="sm" onClick={() => failed.refetch()}>
            {t('common.retry')}
          </Button>
        </p>
      )}
    </div>
  );
}
