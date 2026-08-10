const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export type Coach = {
  id: string;
  email: string;
  fullName: string;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  coach: Coach;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;
let pendingRefresh: Promise<string | null> | null = null;
let onSessionLost: (() => void) | null = null;
let memoryOnlySession: string | null = null;

// En Electron el puente siempre está. Abrir el renderer suelto en el navegador es útil para
// debuggear la UI, y ahí la sesión vive en memoria y se pierde al recargar.
function sessionStore() {
  if (typeof window !== 'undefined' && window.stl?.session) {
    return window.stl.session;
  }
  return {
    read: async () => memoryOnlySession,
    write: async (payload: string) => {
      memoryOnlySession = payload;
    },
    clear: async () => {
      memoryOnlySession = null;
    },
  };
}

export function setSessionLostHandler(handler: (() => void) | null) {
  onSessionLost = handler;
}

export async function restoreSession() {
  const stored = await sessionStore().read();
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { accessToken: string; refreshToken: string };
      accessToken = parsed.accessToken;
      refreshToken = parsed.refreshToken;
    } catch {
      await clearSession();
    }
  }
  return { accessToken, refreshToken };
}

export async function saveSession(payload: AuthPayload) {
  accessToken = payload.accessToken;
  refreshToken = payload.refreshToken;
  await sessionStore().write(
    JSON.stringify({ accessToken: payload.accessToken, refreshToken: payload.refreshToken })
  );
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  await sessionStore().clear();
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function refreshAccessToken(): Promise<string | null> {
  if (pendingRefresh) {
    return pendingRefresh;
  }

  pendingRefresh = (async () => {
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await clearSession();
        onSessionLost?.();
        return null;
      }

      const payload = (await response.json()) as AuthPayload;
      await saveSession(payload);
      return payload.accessToken;
    } catch {
      return null;
    } finally {
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}
