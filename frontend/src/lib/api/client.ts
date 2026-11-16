/**
 * Fetch client for the Laravel API (Sanctum SPA cookie auth).
 *
 * - Same-origin relative URLs: next.config.ts rewrites /api/* and /sanctum/* to the API.
 * - Mutating requests carry X-XSRF-TOKEN read from the XSRF-TOKEN cookie (set by /sanctum/csrf-cookie).
 * - A 419 (CSRF mismatch / expired session token) refreshes the cookie and retries once.
 * - Every response is the envelope { success, message, data, meta? } or { success:false, message, errors?, code? }.
 * - No tokens or user data are ever stored in localStorage.
 */
import type { ApiFailure, Pagination } from '@/types/api';

export const API_PREFIX = '/api/v1';
const CSRF_URL = '/sanctum/csrf-cookie';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly errors?: Record<string, string[]>;

  constructor(status: number, message: string, code?: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }

  /** First validation message for a field (dot path as returned by Laravel). */
  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0];
  }

  get isValidation(): boolean {
    return this.status === 422;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

export interface ApiResult<T> {
  data: T;
  message: string;
  pagination?: Pagination;
}

// ---- cookies / locale ----------------------------------------------------------

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function currentLocale(): 'ar' | 'en' {
  return readCookie('locale') === 'en' ? 'en' : 'ar';
}

// ---- CSRF ----------------------------------------------------------------------

let csrfPromise: Promise<void> | null = null;

export function ensureCsrfCookie(force = false): Promise<void> {
  if (!force && readCookie('XSRF-TOKEN')) return Promise.resolve();
  if (!force && csrfPromise) return csrfPromise;
  csrfPromise = fetch(CSRF_URL, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
    .then(() => undefined)
    .finally(() => {
      csrfPromise = null;
    });
  return csrfPromise;
}

// ---- 401 hook -------------------------------------------------------------------

type Listener = () => void;
let unauthenticatedListener: Listener | null = null;

/** The auth provider registers a handler that clears the cached user when the session is gone. */
export function onUnauthenticated(listener: Listener | null): void {
  unauthenticatedListener = listener;
}

// ---- core -----------------------------------------------------------------------

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url =
    path.startsWith('/api/') || path.startsWith('/sanctum/') ? path : `${API_PREFIX}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': currentLocale(),
    'X-Requested-With': 'XMLHttpRequest',
  };
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body; // browser sets the multipart boundary
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (MUTATING.has(method)) {
    await ensureCsrfCookie();
    const token = readCookie('XSRF-TOKEN');
    if (token) headers['X-XSRF-TOKEN'] = token;
  }
  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    body,
    credentials: 'same-origin',
    signal: options.signal,
  });
}

async function parse<T>(response: Response): Promise<ApiResult<T>> {
  if (response.status === 204) return { data: null as T, message: '' };

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const failure = (payload ?? {}) as Partial<ApiFailure>;
    throw new ApiError(
      response.status,
      failure.message || response.statusText || 'Request failed',
      failure.code,
      failure.errors,
    );
  }

  const envelope = (payload ?? {}) as {
    message?: string;
    data?: T;
    meta?: { pagination?: Pagination };
  };
  return {
    data: (envelope.data ?? null) as T,
    message: envelope.message ?? '',
    pagination: envelope.meta?.pagination,
  };
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await send(path, options);
    if (response.status === 419 && MUTATING.has(options.method ?? 'GET')) {
      // CSRF token expired or rotated: refresh the cookie and retry exactly once.
      await ensureCsrfCookie(true);
      response = await send(path, options);
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, 'Network error', 'network_error');
  }

  try {
    return await parse<T>(response);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) unauthenticatedListener?.();
    throw e;
  }
}

export const api = {
  get: async <T>(path: string, query?: Record<string, QueryValue>, signal?: AbortSignal) =>
    (await request<T>(path, { query, signal })).data,
  /** For paginated collections: returns items + pagination meta. */
  page: async <T>(path: string, query?: Record<string, QueryValue>, signal?: AbortSignal) => {
    const res = await request<T[]>(path, { query, signal });
    return {
      items: res.data ?? [],
      pagination: res.pagination ?? {
        current_page: 1,
        per_page: res.data?.length ?? 0,
        total: res.data?.length ?? 0,
        last_page: 1,
      },
    };
  },
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
