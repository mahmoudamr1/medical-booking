'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Feature UI that the site header and dashboard top bar show (e.g. the notification bell).
 * Layout components must not import features, so the app root provides these elements.
 */
interface LayoutSlots {
  notifications?: ReactNode;
}

const LayoutSlotsContext = createContext<LayoutSlots>({});

export function LayoutSlotsProvider({ children, ...slots }: LayoutSlots & { children: ReactNode }) {
  return <LayoutSlotsContext.Provider value={slots}>{children}</LayoutSlotsContext.Provider>;
}

export function useLayoutSlots(): LayoutSlots {
  return useContext(LayoutSlotsContext);
}
