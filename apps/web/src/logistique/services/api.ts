const API_BASE = `${(import.meta as any).env?.VITE_API_URL || '/api'}/logistique`;

function csrfToken() {
  return document.cookie.split('; ').find((value) => value.startsWith('gadimat_csrf='))?.split('=')[1] || '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(!['GET', 'HEAD'].includes(method) ? { 'X-CSRF-Token': decodeURIComponent(csrfToken()) } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expirée.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erreur réseau.' }));
    throw new Error(body.error || `Erreur ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const logisticsApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  download: async (path: string, filename: string) => {
    const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Téléchargement impossible.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  },
};
