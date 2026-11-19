import apiClient from './api';
import type { AuthTokenResponse, CurrentUserProfile } from '../types';

export const authService = {
  /**
   * Authenticate with username and password against verified Django endpoint
   */
  login: async (username: string, password: string): Promise<AuthTokenResponse> => {
    const response = await apiClient.post<AuthTokenResponse>('/api/auth/token/', {
      username,
      password,
    });
    return response.data;
  },

  /**
   * Retrieve the authenticated user's account and assigned role
   */
  getCurrentUserProfile: async (): Promise<CurrentUserProfile> => {
    const response = await apiClient.get<CurrentUserProfile>('/api/core/me/');
    return response.data;
  },

  /**
   * Invalidate the current session token on the backend
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/api/core/auth/logout/');
    } finally {
      localStorage.removeItem('plateaucare_auth_token');
    }
  },

  /**
   * Request password reset instructions
   */
  forgotPassword: async (email: string): Promise<{ detail: string }> => {
    const response = await apiClient.post<{ detail: string }>(
      '/api/core/auth/forgot-password/',
      { email }
    );
    return response.data;
  },

  /**
   * Complete password reset with verification token
   */
  resetPassword: async (token: string, password: string): Promise<{ detail: string }> => {
    const response = await apiClient.post<{ detail: string }>(
      '/api/core/auth/reset-password/',
      { token, password }
    );
    return response.data;
  },

  /**
   * Change current password
   */
  changePassword: async (old_password: string, new_password: string): Promise<{ detail: string }> => {
    const response = await apiClient.post<{ detail: string }>(
      '/api/core/auth/change-password/',
      { old_password, new_password }
    );
    return response.data;
  },
};

export default authService;
