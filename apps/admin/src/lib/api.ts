import type { AuthSession } from './session';

export const API = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api<T = unknown>(
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(opts.headers || {});
  if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`);
  if (opts.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(', ')
          : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

export function workspacePath(workspaceId: string, suffix = '') {
  return `/admin/workspaces/${workspaceId}${suffix}`;
}

export function requireWorkspace(session: AuthSession | null, workspaceId: string): boolean {
  if (!session) return false;
  if (session.role === 'super_admin') return true;
  return (session.workspaces || []).some((w) => w.id === workspaceId);
}
