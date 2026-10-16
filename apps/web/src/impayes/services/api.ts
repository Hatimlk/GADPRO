const API_BASE = `${(import.meta as any).env?.VITE_API_URL || '/api'}/impayes`;

type RefreshResponse = { accessToken: string; refreshToken?: string };

// Une seule rotation de session peut être active dans l'onglet. Toutes les
// requêtes ayant reçu 401 attendent la même promesse puis sont rejouées.
let refreshPromise: Promise<RefreshResponse> | null = null;

function refreshSession(): Promise<RefreshResponse> {
  if (!refreshPromise) {
    const refreshToken = null;
    if (!refreshToken) return Promise.reject(new Error('Aucun refresh token'));

    refreshPromise = fetch(`${API_BASE.replace(/\/impayes$/, '')}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session expirée');
        const data = await response.json() as RefreshResponse;
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };
  const csrf = document.cookie.split('; ').find((value) => value.startsWith('gadimat_csrf='))?.split('=')[1];
  if (csrf && !['GET', 'HEAD'].includes(options.method || 'GET')) headers['X-CSRF-Token'] = decodeURIComponent(csrf);

  const target = url.startsWith('/auth/') ? `${API_BASE.replace(/\/impayes$/, '')}${url}` : `${API_BASE}${url}`;
  const res = await fetch(target, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    // Tentative de refresh
    const refreshToken = null;
    if (refreshToken && !url.includes('/auth/')) {
      try {
        const data = await refreshSession();
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        const retryRes = await fetch(target, { ...options, headers, credentials: 'include' });
        if (!retryRes.ok) {
          const err = await retryRes.json().catch(() => ({ error: 'Erreur serveur' }));
          throw new Error(err.error || `Erreur ${retryRes.status}`);
        }
        return retryRes.json();
      } catch {
        window.location.href = '/login';
        throw new Error('Session expiree');
      }
    }
    window.location.href = '/login';
    throw new Error('Non autorise');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(err.error || `Erreur ${res.status}`);
  }

  // Pour les exports binaires
  const ct = res.headers.get('content-type');
  if (ct && (ct.includes('spreadsheet') || ct.includes('pdf') || ct.includes('octet-stream'))) {
    return res.blob() as T;
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<any>('/auth/me'),
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  // Dossiers
  getDossiers: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/erp/impayes?${qs}`);
  },
  getDossier: (id: string) => request<any>(`/erp/impayes/${id}`),
  getPartenaires: () => request<string[]>('/erp/partenaires'),
  getErpFilters: (params: Record<string, string> = {}) => request<{
    partenaires: string[];
    commerciaux: { id: string; nom: string }[];
    statuts: string[];
    banques: string[];
  }>(`/erp/filters?${new URLSearchParams(params).toString()}`),
  getCalendrier: () => request<any[]>('/erp/calendrier'),
  createDossier: (data: any) => request<any>('/dossiers', { method: 'POST', body: JSON.stringify(data) }),
  updateDossier: (id: string, data: any) =>
    request<any>(`/dossiers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatut: (id: string, statut: string) =>
    request<any>(`/erp/impayes/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ statut }) }),
  reaffecter: (id: string, commercial_id: string) =>
    request<any>(`/erp/impayes/${id}/reaffecter`, { method: 'PATCH', body: JSON.stringify({ commercial_id }) }),
  deleteDossier: (id: string) => request<any>(`/dossiers/${id}`, { method: 'DELETE' }),

  // Actions
  addAction: (dossierId: string, data: { contenu: string; type_action?: string; date_rappel?: string | null }) =>
    request<any>(`/erp/impayes/${dossierId}/actions`, { method: 'POST', body: JSON.stringify(data) }),
  deleteAction: (dossierId: string, actionId: string) =>
    request<any>(`/erp/impayes/${dossierId}/actions/${actionId}`, { method: 'DELETE' }),

  // Stats & Alerts
  getStats: (params: Record<string, string> = {}) => request<any>(`/erp/stats?${new URLSearchParams(params).toString()}`),
  getAlerts: () => request<any>('/erp/alerts'),
  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>('/erp/notifications'),
  markNotificationRead: (id: string) =>
    request<any>(`/erp/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    request<any>('/erp/notifications/read-all', { method: 'PATCH' }),

  // Admin
  getUsers: () => request<any[]>('/admin/users'),
  createUser: (data: any) => request<any>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) =>
    request<any>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleUser: (id: string) => request<any>(`/admin/users/${id}/toggle`, { method: 'PATCH' }),
  resetUserPassword: (id: string) =>
    request<{ password: string }>(`/admin/users/${id}/reset-password`, { method: 'POST' }),

  getBanques: () => request<any[]>('/admin/banques'),
  createBanque: (nom: string) =>
    request<any>('/admin/banques', { method: 'POST', body: JSON.stringify({ nom }) }),
  deleteBanque: (id: number) => request<any>(`/admin/banques/${id}`, { method: 'DELETE' }),

  getPartenairesRef: () => request<any[]>('/admin/partenaires'),
  createPartenaire: (nom: string) => request<any>('/admin/partenaires', { method: 'POST', body: JSON.stringify({ nom }) }),
  updatePartenaire: (id: number, nom: string) => request<any>(`/admin/partenaires/${id}`, { method: 'PUT', body: JSON.stringify({ nom }) }),
  togglePartenaire: (id: number) => request<any>(`/admin/partenaires/${id}/toggle`, { method: 'PATCH' }),

  getStatuts: () => request<any[]>('/admin/statuts'),
  createStatut: (data: any) =>
    request<any>('/admin/statuts', { method: 'POST', body: JSON.stringify(data) }),
  updateStatutRef: (id: number, data: any) =>
    request<any>(`/admin/statuts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStatut: (id: number) => request<any>(`/admin/statuts/${id}`, { method: 'DELETE' }),

  getRelations: () => request<any[]>('/admin/relations'),
  createRelation: (data: any) =>
    request<any>('/admin/relations', { method: 'POST', body: JSON.stringify(data) }),
  deleteRelation: (id: number) => request<any>(`/admin/relations/${id}`, { method: 'DELETE' }),

  getAuditLogs: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/admin/audit-logs?${qs}`);
  },
  deleteAuditLog: (id: string) =>
    request<any>(`/admin/audit-logs/${id}`, { method: 'DELETE' }),
  testSmtp: () => request<{ sent: boolean; to: string }>('/admin/smtp/test', { method: 'POST' }),

  // Import
  importExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/dossiers/import', {
      method: 'POST',
      body: formData,
    });
  },

  // Export
  exportExcel: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<Blob>(`/export/excel?${qs}`);
  },
};

