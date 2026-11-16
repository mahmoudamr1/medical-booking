import { describe, expect, it, vi } from 'vitest';
import { ApiError, api, buildUrl, onUnauthenticated, request } from '@/lib/api/client';
import { jsonResponse, mockFetch, ok } from '../helpers';

function headersOf(init: RequestInit): Record<string, string> {
  return init.headers as Record<string, string>;
}

describe('api client', () => {
  it('sends JSON/locale headers with same-origin credentials and unwraps the envelope', async () => {
    document.cookie = 'locale=en; path=/';
    const fetchMock = mockFetch({
      'GET /api/v1/specialties': () => jsonResponse(200, ok([{ id: 's1' }])),
    });

    const data = await api.get<{ id: string }[]>('/specialties');

    expect(data).toEqual([{ id: 's1' }]);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.credentials).toBe('same-origin');
    expect(headersOf(init!)).toMatchObject({ Accept: 'application/json', 'Accept-Language': 'en' });
    expect(headersOf(init!)['X-XSRF-TOKEN']).toBeUndefined();
  });

  it('defaults Accept-Language to Arabic', async () => {
    const fetchMock = mockFetch({ 'GET /api/v1/home': () => jsonResponse(200, ok({})) });
    await api.get('/home');
    expect(headersOf(fetchMock.mock.calls[0][1]!)['Accept-Language']).toBe('ar');
  });

  it('returns pagination meta for paginated collections', async () => {
    const pagination = { current_page: 2, per_page: 12, total: 30, last_page: 3 };
    mockFetch({
      'GET /api/v1/doctors': () => jsonResponse(200, ok([{ id: 'd1' }], { meta: { pagination } })),
    });

    const page = await api.page('/doctors', { page: 2, q: '', specialty: undefined });

    expect(page.items).toEqual([{ id: 'd1' }]);
    expect(page.pagination).toEqual(pagination);
  });

  it('builds query strings without empty values', () => {
    expect(buildUrl('/doctors', { q: 'x y', page: 2, empty: '', none: null, flag: true })).toBe(
      '/api/v1/doctors?q=x+y&page=2&flag=1',
    );
  });

  it('fetches the CSRF cookie before the first mutation and sends the decoded X-XSRF-TOKEN', async () => {
    const fetchMock = mockFetch({
      'GET /sanctum/csrf-cookie': () => {
        document.cookie = 'XSRF-TOKEN=abc%3D123; path=/';
        return new Response(null, { status: 204 });
      },
      'POST /api/v1/auth/login': () =>
        jsonResponse(200, ok({ id: 'u1' }, { message: 'Logged in' })),
    });

    const res = await api.post<{ id: string }>('/auth/login', { email: 'a@b.c', password: 'x' });

    expect(res).toEqual({ data: { id: 'u1' }, message: 'Logged in', pagination: undefined });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/sanctum/csrf-cookie',
      '/api/v1/auth/login',
    ]);
    const init = fetchMock.mock.calls[1][1]!;
    expect(headersOf(init)['X-XSRF-TOKEN']).toBe('abc=123');
    expect(headersOf(init)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.c', password: 'x' });
  });

  it('does not refetch the CSRF cookie when one already exists', async () => {
    document.cookie = 'XSRF-TOKEN=tok; path=/';
    const fetchMock = mockFetch({ 'POST /api/v1/auth/logout': () => jsonResponse(200, ok(null)) });
    await api.post('/auth/logout');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('parses validation errors into an ApiError with field errors', async () => {
    document.cookie = 'XSRF-TOKEN=tok; path=/';
    mockFetch({
      'POST /api/v1/auth/register': () =>
        jsonResponse(422, {
          success: false,
          message: 'Invalid data',
          code: 'validation_failed',
          errors: { email: ['Email taken'] },
        }),
    });

    const error = await api.post('/auth/register', {}).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.isValidation).toBe(true);
    expect(error.code).toBe('validation_failed');
    expect(error.fieldError('email')).toBe('Email taken');
    expect(error.message).toBe('Invalid data');
  });

  it('exposes conflict codes (409 booking_conflict)', async () => {
    document.cookie = 'XSRF-TOKEN=tok; path=/';
    mockFetch({
      'POST /api/v1/appointments': () =>
        jsonResponse(409, { success: false, message: 'Slot taken', code: 'booking_conflict' }),
    });

    const error = await api.post('/appointments', {}).catch((e) => e);

    expect(error).toMatchObject({ status: 409, code: 'booking_conflict', message: 'Slot taken' });
    expect(error.isConflict).toBe(true);
  });

  it('refreshes the CSRF cookie and retries exactly once on 419', async () => {
    document.cookie = 'XSRF-TOKEN=old; path=/';
    let attempts = 0;
    const fetchMock = mockFetch({
      'GET /sanctum/csrf-cookie': () => {
        document.cookie = 'XSRF-TOKEN=fresh; path=/';
        return new Response(null, { status: 204 });
      },
      'POST /api/v1/appointments': () => {
        attempts += 1;
        return attempts === 1
          ? jsonResponse(419, { success: false, message: 'CSRF', code: 'csrf_mismatch' })
          : jsonResponse(201, ok({ id: 'a1' }));
      },
    });

    const res = await api.post<{ id: string }>('/appointments', { x: 1 });

    expect(res.data).toEqual({ id: 'a1' });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/api/v1/appointments',
      '/sanctum/csrf-cookie',
      '/api/v1/appointments',
    ]);
    expect(headersOf(fetchMock.mock.calls[0][1]!)['X-XSRF-TOKEN']).toBe('old');
    expect(headersOf(fetchMock.mock.calls[2][1]!)['X-XSRF-TOKEN']).toBe('fresh');
  });

  it('gives up after the single 419 retry', async () => {
    document.cookie = 'XSRF-TOKEN=old; path=/';
    const fetchMock = mockFetch({
      'GET /sanctum/csrf-cookie': () => new Response(null, { status: 204 }),
      'POST /api/v1/appointments': () =>
        jsonResponse(419, { success: false, message: 'CSRF', code: 'csrf_mismatch' }),
    });

    const error = await api.post('/appointments', {}).catch((e) => e);

    expect(error).toMatchObject({ status: 419, code: 'csrf_mismatch' });
    expect(fetchMock.mock.calls.filter((c) => c[0] === '/api/v1/appointments')).toHaveLength(2);
  });

  it('notifies the auth layer on 401', async () => {
    const listener = vi.fn();
    onUnauthenticated(listener);
    mockFetch({
      'GET /api/v1/auth/me': () =>
        jsonResponse(401, { success: false, message: 'Unauthenticated', code: 'unauthenticated' }),
    });

    await expect(api.get('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);
    onUnauthenticated(null);
  });

  it('maps network failures to status 0 and handles 204 / non-JSON bodies', async () => {
    mockFetch({ 'GET /api/v1/health': () => Promise.reject(new TypeError('Failed to fetch')) });
    await expect(api.get('/health')).rejects.toMatchObject({ status: 0, code: 'network_error' });

    document.cookie = 'XSRF-TOKEN=tok; path=/';
    mockFetch({
      'DELETE /api/v1/doctor/services/s1': () => new Response(null, { status: 204 }),
      'GET /api/v1/broken': () =>
        new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }),
    });
    await expect(request('/doctor/services/s1', { method: 'DELETE' })).resolves.toMatchObject({
      data: null,
    });
    await expect(api.get('/broken')).rejects.toMatchObject({ status: 502, message: 'Bad Gateway' });
  });

  it('sends FormData without forcing a JSON content type', async () => {
    document.cookie = 'XSRF-TOKEN=tok; path=/';
    const fetchMock = mockFetch({
      'POST /api/v1/doctor/documents': () => jsonResponse(201, ok({ id: 'doc' })),
    });
    const form = new FormData();
    form.append('type', 'license');

    await api.post('/doctor/documents', form);

    const init = fetchMock.mock.calls[0][1]!;
    expect(init.body).toBe(form);
    expect(headersOf(init)['Content-Type']).toBeUndefined();
  });
});
