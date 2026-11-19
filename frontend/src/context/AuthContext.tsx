import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CurrentUserProfile, UserRole } from '../types';
import authService from '../services/authService';

interface AuthContextType {
  user: CurrentUserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole;
  isAdmin: boolean;
  isOfficer: boolean;
  isFacilityReporter: boolean;
  isWorkforceReporter: boolean;
  isCommunityReporter: boolean;
  login: (username: string, password: string) => Promise<CurrentUserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'plateaucare_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<CurrentUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (): Promise<CurrentUserProfile | null> => {
    try {
      const profile = await authService.getCurrentUserProfile();
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        await fetchProfile();
      }
      setIsLoading(false);
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
    };

    window.addEventListener('plateaucare:auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('plateaucare:auth:unauthorized', handleUnauthorized);
    };
  }, [fetchProfile]);

  const login = async (username: string, password: string): Promise<CurrentUserProfile> => {
    setIsLoading(true);
    try {
      const authData = await authService.login(username, password);
      localStorage.setItem(TOKEN_KEY, authData.token);
      setToken(authData.token);
      const profile = await authService.getCurrentUserProfile();
      setUser(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      setIsLoading(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    await fetchProfile();
  };

  const role: UserRole = user?.role || 'UNASSIGNED';
  const isAdmin = role === 'SYSTEM_ADMIN';
  const isOfficer = role === 'PUBLIC_HEALTH_OFFICER' || isAdmin;
  const isFacilityReporter = role === 'HEALTH_FACILITY_REPORTER';
  const isWorkforceReporter = role === 'WORKFORCE_REPORTER';
  const isCommunityReporter = role === 'COMMUNITY_REPORTER';

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user),
    role,
    isAdmin,
    isOfficer,
    isFacilityReporter,
    isWorkforceReporter,
    isCommunityReporter,
    login,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
