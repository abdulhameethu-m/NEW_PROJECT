import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthStatus = 'INITIALIZING' | 'UNAUTHENTICATED' | 'AUTHENTICATING' | 'AUTHENTICATED' | 'ERROR';

export interface User {
  id: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  avatarUrl?: string | null;
  preferences?: {
    theme?: string;
    notificationPreferences?: {
      orderUpdates?: boolean;
      deliveryAlerts?: boolean;
      paymentAlerts?: boolean;
      promotions?: boolean;
    };
  };
}

interface AuthState {
  status: AuthStatus;
  user: User | null;
  csrfToken: string | null;
  error: string | null;
  isHydrated: boolean;
  
  setStatus: (status: AuthStatus) => void;
  setUser: (user: User | null) => void;
  setCsrfToken: (token: string | null) => void;
  setError: (error: string | null) => void;
  setHydrated: (hydrated: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: 'INITIALIZING',
      user: null,
      csrfToken: null,
      error: null,
      isHydrated: false,
      
      setStatus: (status) => set({ status }),
      setUser: (user) => set({ 
        user, 
        status: user ? 'AUTHENTICATED' : 'UNAUTHENTICATED',
        error: null 
      }),
      setCsrfToken: (token) => set({ csrfToken: token }),
      setError: (error) => set({ error, status: 'ERROR' }),
      setHydrated: (isHydrated) => set({ isHydrated }),
      clearSession: () => set({ 
        user: null, 
        status: 'UNAUTHENTICATED', 
        error: null,
        csrfToken: null,
      }),
    }),
    {
      name: 'uchooz-auth-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        csrfToken: state.csrfToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        if (state?.user) {
          state.setStatus('AUTHENTICATED');
        } else {
          state?.setStatus('UNAUTHENTICATED');
        }
      },
    }
  )
);
