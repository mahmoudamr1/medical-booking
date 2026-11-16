'use client';

import { IntKey, BOUNDS } from './settingsSchema';
import { type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export function IntField<V extends Record<IntKey, unknown>>({
  name,
  label,
  hint,
  register,
  errors,
}: {
  name: IntKey;
  label: string;
  hint: string;
  register: UseFormRegister<V>;
  errors: FieldErrors<V>;
}) {
  const [min, max] = BOUNDS[name];
  const error = (errors as FieldErrors<Record<IntKey, unknown>>)[name]?.message;
  return (
    <Field
      label={label}
      htmlFor={`set-${name}`}
      error={typeof error === 'string' ? error : undefined}
      hint={hint}
      required
    >
      <Input
        id={`set-${name}`}
        type="number"
        inputMode="numeric"
        dir="ltr"
        min={min}
        max={max}
        step={1}
        aria-invalid={!!error}
        {...register(name as Parameters<UseFormRegister<V>>[0])}
      />
    </Field>
  );
}
