/**
 * src/lib/api.ts
 * Centralized API helper.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * src/lib/api.ts
 * Centralized API helper.
 */

// ... rest of file

const BASE =
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

const TOKEN_KEY = 'vantage_token';
const USER_KEY = 'vantage_user';
const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

export type ArchiveScope = 'active' | 'archived' | 'all';
export type AssignmentScope = 'active' | 'removed' | 'all';

export type ActorContext = {
  id: string | number;
  role?: string;
};

function withScope(path: string, scope: ArchiveScope = 'active') {
  if (scope === 'active') return path;
  const search = new URLSearchParams({ scope });
  return `${path}?${search.toString()}`;
}

function withAssignmentScope(path: string, status: AssignmentScope = 'active') {
  if (status === 'active') return path;
  const search = new URLSearchParams({ status });
  return `${path}?${search.toString()}`;
}

const isAuthPath = (path: string) =>
  path.startsWith('/auth/login') ||
  path.startsWith('/auth/register') ||
  path.startsWith('/auth/forgot-password') ||
  path.startsWith('/auth/reset-password') ||
  path.startsWith('/auth/verify-email') ||
  path.startsWith('/auth/resend-verification');

const handleUnauthorized = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));

  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));

    if (res.status === 401 && !isAuthPath(path)) {
      handleUnauthorized();
    }

    throw new Error(err.error ?? 'Request failed');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }

  return (await res.text()) as T;
}

const createArchivableResource = (resource: string) => ({
  list: (scope: ArchiveScope = 'active') => request<any[]>(withScope(`/${resource}`, scope)),
  create: (data: any) => request<any>(`/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) =>
    request<any>(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archive: (id: string | number, data: any = {}) =>
    request<any>(`/${resource}/${id}/archive`, { method: 'PATCH', body: JSON.stringify(data) }),
  restore: (id: string | number, data: any = {}) =>
    request<any>(`/${resource}/${id}/restore`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string | number) => request<any>(`/${resource}/${id}`, { method: 'DELETE' }),
});

export const api = {
  auth: {
    login: (data: { employeeNumber: string; password: string }) =>
      request<{ success: boolean; token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    register: (data: {
      name: string;
      email: string;
      employeeNumber: string;
      department?: string;
      password: string;
    }) =>
      request<{ success: boolean; user: any; requiresEmailVerification?: boolean; message?: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    forgotPassword: (data: { email?: string; employeeNumber?: string }) =>
      request<{ success: boolean; message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    resetPassword: (data: { token: string; password: string }) =>
      request<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    verifyEmail: (token: string) =>
      request<{ success: boolean; message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),
    resendVerification: (data: { email?: string; employeeNumber?: string }) =>
      request<{ success: boolean; message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  assets: {
    ...createArchivableResource('assets'),
    attachments: (id: string | number) => request<any>(`/assets/${id}/attachments`),
  },

  employees: createArchivableResource('employees'),

  suppliers: createArchivableResource('suppliers'),

  consumables: {
    ...createArchivableResource('consumables'),
    checkout: (id: string | number) =>
      request<any>(`/consumables/${id}/checkout`, { method: 'PATCH' }),
  },

  accessories: {
    ...createArchivableResource('accessories'),
    checkout: (id: string | number) =>
      request<any>(`/accessories/${id}/checkout`, { method: 'PATCH' }),
    assignments: (id: string | number, status: AssignmentScope = 'active') =>
      request<any[]>(withAssignmentScope(`/accessories/${id}/assignments`, status)),
  },

  licenses: {
    ...createArchivableResource('licenses'),
    revealKey: (id: string | number, password: string) =>
      request<{ success: boolean; key: string }>(`/licenses/${id}/reveal-key`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    assignees: (id: string | number, status: 'active' | 'removed' | 'all' = 'active') =>
      request<any[]>(`/licenses/${id}/assignees${status === 'active' ? '' : `?status=${status}`}`),
  },

  maintenance: createArchivableResource('maintenance'),

  requests: {
    list: (scope: ArchiveScope = 'active') => request<any[]>(withScope('/requests', scope)),
    create: (data: any) => request<any>('/requests', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string | number, status: string) =>
      request<any>(`/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    archive: (id: string | number, data: any = {}) =>
      request<any>(`/requests/${id}/archive`, { method: 'PATCH', body: JSON.stringify(data) }),
    restore: (id: string | number, data: any = {}) =>
      request<any>(`/requests/${id}/restore`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string | number) => request<any>(`/requests/${id}`, { method: 'DELETE' }),
  },

  audit: {
    list: () => request<any[]>('/audit'),
    add: (data: { type: string; entity: string; message: string; details?: string; user?: string }) =>
      request<any>('/audit', { method: 'POST', body: JSON.stringify(data) }),
    clear: () => request<any>('/audit', { method: 'DELETE' }),
  },

  components: {
    ...createArchivableResource('components'),
    checkin: (id: number | string) =>
      request<any>(`/components/${id}/checkin`, { method: 'PATCH' }),
    checkout: (id: number | string) =>
      request<any>(`/components/${id}/checkout`, { method: 'PATCH' }),
    assignments: (id: number | string, status: AssignmentScope = 'active') =>
      request<any[]>(withAssignmentScope(`/components/${id}/assignments`, status)),
  },

  transactions: {
    checkout: (data: any) =>
      request<any>('/transactions/checkout', { method: 'POST', body: JSON.stringify(data) }),
    checkin: (data: any) =>
      request<any>('/transactions/checkin', { method: 'POST', body: JSON.stringify(data) }),
  },

  notifications: {
    me: (unreadOnly = false) =>
      request<any[]>(`/notifications/me${unreadOnly ? '?unreadOnly=true' : ''}`),
    markRead: (id: string | number) =>
      request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      request<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' }),
    confirm: (id: string | number) =>
      request<{ success: boolean }>(`/notifications/${id}/confirm`, { method: 'PATCH' }),
    decline: (id: string | number) =>
      request<{ success: boolean }>(`/notifications/${id}/decline`, { method: 'PATCH' }),
    adminAssetConfirmations: () =>
      request<any[]>('/notifications/admin/asset-confirmations'),
  },

  profile: {
    me: (_actor?: ActorContext) =>
      request<{ profile: any; stats: { submittedRequests: number; submittedMaintenance: number } }>(
        '/profile/me',
      ),
    updateMe: (data: any, _actor?: ActorContext) =>
      request<{ success: boolean; profile: any }>(
        '/profile/me',
        { method: 'PUT', body: JSON.stringify(data) },
      ),
    myRequests: (scope: ArchiveScope = 'active', _actor?: ActorContext) =>
      request<any[]>(withScope('/profile/me/requests', scope)),
    myMaintenance: (scope: ArchiveScope = 'active', _actor?: ActorContext) =>
      request<any[]>(withScope('/profile/me/maintenance', scope)),
  },

  reports: {
    licenseCompliance: () =>
      request<{ report: any[]; summary: any }>('/reports/license-compliance'),
    assetValuation: () =>
      request<{ report: any[]; summary: any }>('/reports/asset-valuation'),
    departmentAllocation: () =>
      request<{ report: any[]; summary: any }>('/reports/department-allocation'),
    maintenanceCost: () =>
      request<{ report: any[]; assetsReport: any[]; summary: any }>('/reports/maintenance-cost'),
    employeeAssetHistory: () =>
      request<{ report: any[]; summary: any }>('/reports/employee-asset-history'),
    unconfirmedAssignments: () =>
      request<{ report: any[]; pending: any[]; confirmed: any[]; declined: any[]; summary: any }>('/reports/unconfirmed-assignments'),
  },
};