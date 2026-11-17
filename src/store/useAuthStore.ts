import { create } from 'zustand';
import type { Result, Unsubscribe, AppSession, Profile } from '@/types';
import { services } from '@/services';

interface AuthState {
  session: AppSession | null;
  profile: Profile | null;
  loading: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<Result<AppSession>>;
  signUp: (email: string, password: string, nickname: string) => Promise<Result<AppSession>>;
  signOut: () => Promise<Result<void>>;
  setSession: (session: AppSession | null) => void;
  setProfile: (profile: Profile | null) => void;
}

let authUnsubscribe: Unsubscribe | null = null;

/** 登录态 store：对接 services.auth，页面不直接调用 Supabase。 */
export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  init: async () => {
    authUnsubscribe?.();
    authUnsubscribe = services.auth.onAuthChange((session) => {
      set({ session, profile: session ? get().profile : null });
    });
    const session = await services.auth.getSession();
    const profile = session ? await services.auth.getProfile() : null;
    set({ session, profile, loading: false });
  },

  signIn: async (email, password) => {
    const result = await services.auth.signIn(email, password);
    if (!result.error && result.data) {
      const profile = await services.auth.getProfile();
      set({ session: result.data, profile });
    }
    return result;
  },

  signUp: async (email, password, nickname) => {
    const result = await services.auth.signUp(email, password, nickname);
    if (!result.error && result.data) {
      const profile = await services.auth.getProfile();
      set({ session: result.data, profile });
    }
    return result;
  },

  signOut: async () => {
    const result = await services.auth.signOut();
    if (!result.error) set({ session: null, profile: null });
    return result;
  },

  setSession: (session) => set({ session, profile: session ? get().profile : null }),
  setProfile: (profile) => set({ profile }),
}));
