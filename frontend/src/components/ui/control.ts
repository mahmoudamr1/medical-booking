import { cn } from '@/lib/utils';

/**
 * The box every single-line form control shares (Input and the Select / Combobox / DatePicker
 * triggers), so they always line up: 44px on phones, 40px from `sm`, same radius, border and ring.
 */
export const controlClass =
  'h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 sm:h-10 md:text-sm';

/** A button that opens a picker: the control box plus the icon / value / chevron row. */
export const triggerClass = cn(
  controlClass,
  "flex cursor-pointer items-center gap-2 text-start font-normal hover:border-muted-foreground/50 aria-expanded:border-ring data-placeholder:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
);

/** A row inside a picker list (Select item, Combobox option): 44px on phones, 36px from `sm`. */
export const optionClass =
  "relative flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md py-2 ps-2.5 pe-8 text-base outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 sm:min-h-9 sm:py-1.5 md:text-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";
