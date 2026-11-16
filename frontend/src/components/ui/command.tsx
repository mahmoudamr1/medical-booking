'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { CheckIcon, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { optionClass } from './control';

/*
 * shadcn Command (cmdk) trimmed to what the app uses: an inline searchable list for the Combobox.
 * The registry's CommandDialog / InputGroup parts are left out until something needs a palette.
 */
function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'flex size-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground',
        className,
      )}
      {...props}
    />
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="flex items-center gap-2 border-b px-3">
      <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'h-11 w-full min-w-0 bg-transparent text-base outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 md:text-sm',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        'max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain p-1 outline-none',
        className,
      )}
      {...props}
    />
  );
}

const messageClass = 'py-6 text-center text-sm text-muted-foreground';

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn(messageClass, className)}
      {...props}
    />
  );
}

function CommandLoading({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Loading> & { className?: string }) {
  return (
    <div data-slot="command-loading" className={cn(messageClass, className)}>
      <CommandPrimitive.Loading {...props} />
    </div>
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'overflow-hidden text-foreground **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

/** `checked` marks the current value (check icon at the inline end), like a Select item. */
function CommandItem({
  className,
  children,
  checked = false,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item> & { checked?: boolean }) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      data-checked={checked}
      className={cn(
        optionClass,
        'data-selected:bg-accent data-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        checked && 'font-medium',
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {checked && <CheckIcon className="absolute end-2.5 text-primary" aria-hidden />}
    </CommandPrimitive.Item>
  );
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  CommandSeparator,
};
