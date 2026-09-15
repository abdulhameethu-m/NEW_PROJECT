import { create } from 'zustand';

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
  
  setStatus: (status: AuthStatus) => void;
  setUser: (user: User | null) => void;
  setCsrfToken: (token: string | null) => void;
  setError: (error: string | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'INITIALIZING',
  user: null,
  csrfToken: null,
  error: null,
  
  setStatus: (status) => set({ status }),
  
  setUser: (user) => set({ 
    user, 
    status: user ? 'AUTHENTICATED' : 'UNAUTHENTICATED',
    error: null 
  }),
  
  setCsrfToken: (token) => set({ csrfToken: token }),
  
  setError: (error) => set({ error, status: 'ERROR' }),
  
  clearSession: () => set({ 
    user: null, 
    status: 'UNAUTHENTICATED', 
    csrfToken: null,
    error: null 
  }),
}));
