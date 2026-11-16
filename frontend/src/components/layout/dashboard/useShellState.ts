'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query. Server snapshot is `false` (mobile-first markup). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const STORAGE_KEY = 'dashboard.sidebar.collapsed';
const EVENT = 'dashboard-sidebar-change';
/** In-memory fallback when localStorage is unavailable (private mode, blocked storage). */
let memory: boolean | null = null;

function readCollapsed(): boolean {
  if (memory !== null) return memory;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Desktop sidebar collapsed (icon rail) state, remembered in localStorage across areas and reloads. */
export function useSidebarCollapsed(): [boolean, (next: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const set = useCallback((next: boolean) => {
    memory = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // storage unavailable (private mode): the toggle still works for this page view
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [collapsed, set];
}
