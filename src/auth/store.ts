import { create } from 'zustand';

import * as authApi from '@/api/auth';
import {
  clearSession,
  restoreSession,
  saveSession,
  setSessionLostHandler,
  type Coach,
} from '@/auth/session';

type AuthState = {
  coach: Coach | null;
  status: 'loading' | 'signedIn' | 'signedOut';
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  coach: null,
  status: 'loading',

  bootstrap: async () => {
    setSessionLostHandler(() => set({ coach: null, status: 'signedOut' }));

    const { accessToken } = await restoreSession();
    if (!accessToken) {
      set({ coach: null, status: 'signedOut' });
      return;
    }

    try {
      const coach = await authApi.fetchMe();
      set({ coach, status: 'signedIn' });
    } catch {
      await clearSession();
      set({ coach: null, status: 'signedOut' });
    }
  },

  signIn: async (email, password) => {
    const payload = await authApi.login(email, password);
    await saveSession(payload);
    set({ coach: payload.coach, status: 'signedIn' });
  },

  signOut: async () => {
    try {
      await authApi.logout();
    } finally {
      await clearSession();
      set({ coach: null, status: 'signedOut' });
    }
  },
}));
