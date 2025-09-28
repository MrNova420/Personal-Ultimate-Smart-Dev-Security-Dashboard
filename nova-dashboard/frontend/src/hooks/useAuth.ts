import { useState, useEffect } from 'react';

/**
 * Authentication Hook
 * 
 * Manages user authentication state and provides auth-related functions
 * This is a placeholder implementation for Phase 1, Week 1
 * Full authentication will be implemented in Phase 1, Week 2
 */

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  useEffect(() => {
    // Simulate loading and auto-authentication for development
    const timer = setTimeout(() => {
      // For now, auto-authenticate in development mode
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'dev-user-1',
          username: 'developer',
          email: 'dev@novashield.local',
          role: 'admin',
        },
        error: null,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const login = async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // TODO: Implement actual login API call
      // This is a placeholder for Phase 1, Week 2 implementation
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-1',
          username,
          email: `${username}@novashield.local`,
          role: 'user',
        },
        error: null,
      });
      
      return { success: true };
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Login failed. Please try again.',
      }));
      
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // TODO: Implement actual logout API call
      // This is a placeholder for Phase 1, Week 2 implementation
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
      
      return { success: true };
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Logout failed. Please try again.',
      }));
      
      return { success: false, error: 'Logout failed' };
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    ...authState,
    login,
    logout,
    clearError,
  };
};