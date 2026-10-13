const BASE = (import.meta.env.VITE_API_URL as string) || '/api';

function csrfToken() {
  return document.cookie.split('; ').find((value) => value.startsWith('gadimat_csrf='))?.split('=')[1] || '';
}
function mapPath(path: string) {
  if (path.startsWith('/auth/') || path.startsWith('/administration/')) return path;
  if (path.startsWith('/consumptions')) return path.replace('/consumptions', '/consommations');
  return `/cheques${path}`;
}
async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const method = options.method || 'GET';
  const res = await fetch(`${BASE}${mapPath(path)}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(!['GET', 'HEAD'].includes(method) ? { 'X-CSRF-Token': decodeURIComponent(csrfToken()) } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401 && retry && !['/auth/login', '/auth/refresh', '/auth/csrf'].includes(path)) {
    const token = csrfToken();
    if (token) {
      const refreshed = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': decodeURIComponent(token) } });
      if (refreshed.ok) return request<T>(path, options, false);
    }
    if (path !== '/auth/me') window.location.href = '/login';
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  csrf: () => request<{ csrfToken: string }>('/auth/csrf'),
};
