import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: any | null;
  token: string | null;
  organization: any | null;
  setAuth: (user: any, token: string, organization: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      organization: null,
      setAuth: (user, token, organization) => set({ user, token, organization }),
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, organization: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
