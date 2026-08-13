import { useAuthStore } from '../authStore';

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('initializes with correct default state', () => {
    const state = useAuthStore.getState();
    expect(state.status).toBe('UNAUTHENTICATED'); // Set by clearSession in beforeEach
    expect(state.user).toBeNull();
    expect(state.csrfToken).toBeNull();
  });

  it('updates state correctly on login success', () => {
    const mockUser = { id: '1', name: 'Test User' };
    useAuthStore.getState().setUser(mockUser);
    
    const state = useAuthStore.getState();
    expect(state.status).toBe('AUTHENTICATED');
    expect(state.user).toEqual(mockUser);
  });

  it('updates state correctly on session cleared (logout)', () => {
    useAuthStore.getState().setUser({ id: '1', name: 'Test User' });
    useAuthStore.getState().clearSession();
    
    const state = useAuthStore.getState();
    expect(state.status).toBe('UNAUTHENTICATED');
    expect(state.user).toBeNull();
  });

  it('handles CSRF token correctly', () => {
    useAuthStore.getState().setCsrfToken('mock-token');
    expect(useAuthStore.getState().csrfToken).toBe('mock-token');
  });
});
