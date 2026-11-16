'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { initialsOf } from './MediaFallback';

/** Round photo with an initials fallback (dashboard user card, doctor lists). */
export function PersonAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn('size-9', className)}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
        {initialsOf(name) || '?'}
      </AvatarFallback>
    </Avatar>
  );
}
