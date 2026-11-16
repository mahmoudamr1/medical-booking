'use client';

import { MapPin, Plus, Trash2 } from 'lucide-react';
import type { Location } from '@/types/api';
import { useCities, useGovernorates } from '@/features/directory';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/form';
import { useFormat, useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const MAX_LOCATIONS = 10;

export interface LocationRow {
  governorate_id: string;
  city_id: string;
}

/** One covered area: governorate + optional city ("all cities"). */
function LocationEditor({
  index,
  value,
  governorates,
  onChange,
  onRemove,
}: {
  index: number;
  value: LocationRow;
  governorates: Location[];
  onChange: (v: LocationRow) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const f = useFormat();
  const cities = useCities(value.governorate_id);
  return (
    <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto] sm:border-0 sm:p-0">
      <NativeSelect
        aria-label={`${t('search.governorate')} ${index + 1}`}
        value={value.governorate_id}
        onChange={(e) => onChange({ governorate_id: e.target.value, city_id: '' })}
      >
        <option value="">{t('search.governorate')}</option>
        {governorates.map((g) => (
          <option key={g.id} value={g.id}>
            {f.l(g)}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label={`${t('search.city')} ${index + 1}`}
        value={value.city_id}
        disabled={!value.governorate_id}
        onChange={(e) => onChange({ ...value, city_id: e.target.value })}
      >
        <option value="">{t('doctorUrgent.volunteer.allCities')}</option>
        {cities.data?.map((c) => (
          <option key={c.id} value={c.id}>
            {f.l(c)}
          </option>
        ))}
      </NativeSelect>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('common.delete')}
        onClick={onRemove}
        className="justify-self-end"
      >
        <Trash2 className="text-destructive" />
      </Button>
    </div>
  );
}

/** Editable list of areas a volunteer covers (1–10). */
export function CoverageAreas({
  locations,
  onChange,
  disabled,
  error,
}: {
  locations: LocationRow[];
  onChange: (rows: LocationRow[]) => void;
  disabled: boolean;
  error?: string;
}) {
  const t = useT();
  const governorates = useGovernorates();
  return (
    <fieldset disabled={disabled} className={cn('space-y-3', disabled && 'opacity-60')}>
      <legend className="sr-only">{t('doctorUrgent.volunteer.locations')}</legend>
      {locations.length === 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden />
          {t('doctorUrgent.volunteer.noLocations')}
        </p>
      )}
      {locations.map((loc, i) => (
        <LocationEditor
          key={i}
          index={i}
          value={loc}
          governorates={governorates.data ?? []}
          onChange={(val) => onChange(locations.map((x, j) => (j === i ? val : x)))}
          onRemove={() => onChange(locations.filter((_, j) => j !== i))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={disabled || locations.length >= MAX_LOCATIONS}
        onClick={() => onChange([...locations, { governorate_id: '', city_id: '' }])}
      >
        <Plus aria-hidden />
        {t('doctorUrgent.volunteer.addLocation')}
      </Button>
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
