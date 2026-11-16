'use client';

import type { ReactNode } from 'react';
import { NativeSelect } from '@/components/ui/form';
import { useFormat } from '@/i18n/provider';
import type { Bilingual } from '@/types/api';

interface LookupOption extends Bilingual {
  id: string;
  slug: string;
}

/**
 * Select fed by a public lookup (specialties, governorates, cities, areas). The empty value is the
 * "any / choose" entry labelled by `placeholder`; `valueOf` picks what identifies an option (its id
 * unless the caller filters by slug).
 */
export function LookupSelect<T extends LookupOption>({
  options,
  value,
  onChange,
  placeholder,
  valueOf,
  id,
  label,
  icon,
  disabled,
  invalid,
}: {
  options: T[] | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  valueOf?: (option: T) => string;
  id?: string;
  /** Accessible name when no visible <label htmlFor={id}> exists. */
  label?: string;
  icon?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const f = useFormat();
  const getVal =
    typeof valueOf === 'function' && valueOf !== Object.prototype.valueOf
      ? valueOf
      : (option: T) => option.id;

  return (
    <NativeSelect
      id={id}
      aria-label={label}
      aria-invalid={invalid || undefined}
      icon={icon}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options?.map((option) => (
        <option key={option.id} value={getVal(option)}>
          {f.l(option)}
        </option>
      ))}
    </NativeSelect>
  );
}
