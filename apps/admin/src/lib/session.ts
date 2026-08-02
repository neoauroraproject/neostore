export type ActiveContext =
  | { kind: 'platform' }
  | { kind: 'seller'; workspaceId: string; workspaceName?: string; workspaceSlug?: string }
  | { kind: 'customer' };

export type AuthWorkspace = {
  id: string;
  name?: string;
  slug?: string;
  role?: string;
};

export type AuthSession = {
  token: string;
  role?: string;
  email?: string;
  name?: string;
  workspaces: AuthWorkspace[];
};

const TOKEN_KEY = 'ns_admin_token';
const CONTEXT_KEY = 'ns_active_context';

export function saveSession(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CONTEXT_KEY);
}

export function saveContext(ctx: ActiveContext) {
  localStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
}

export function loadContext(session: AuthSession | null): ActiveContext {
  try {
    const raw = localStorage.getItem(CONTEXT_KEY);
    if (raw) return JSON.parse(raw) as ActiveContext;
  } catch {
    /* ignore */
  }
  if (session?.role === 'super_admin') return { kind: 'platform' };
  if (session?.workspaces?.[0]) {
    const w = session.workspaces[0];
    return { kind: 'seller', workspaceId: w.id, workspaceName: w.name, workspaceSlug: w.slug };
  }
  return { kind: 'customer' };
}

export function contextLabel(ctx: ActiveContext): string {
  if (ctx.kind === 'platform') return 'Super Admin';
  if (ctx.kind === 'seller') return ctx.workspaceName || ctx.workspaceSlug || 'Seller';
  return 'Customer';
}
