import type { ComponentProps } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Search box with a leading magnifier at the inline start. `className` styles the wrapper. */
export function SearchInput({ className, ...props }: Omit<ComponentProps<typeof Input>, 'type'>) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input type="search" className="ps-9" {...props} />
    </div>
  );
}
