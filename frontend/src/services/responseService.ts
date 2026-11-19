import apiClient from './api';
import type { PublicHealthAlert } from '../types';

export const responseService = {
  /**
   * Retrieve public health alerts with optional LGA, status, risk_level, and date filters
   */
  getAlerts: async (params?: {
    lga?: number;
    status?: string;
    risk_level?: string;
    date?: string;
  }): Promise<PublicHealthAlert[]> => {
    const response = await apiClient.get<PublicHealthAlert[]>('/api/response/alerts/', {
      params,
    });
    return response.data;
  },

  /**
   * Retrieve a single alert detail
   */
  getAlertDetail: async (id: number): Promise<PublicHealthAlert> => {
    const response = await apiClient.get<PublicHealthAlert>(`/api/response/alerts/${id}/`);
    return response.data;
  },

  /**
   * Transition OPEN alert to ACKNOWLEDGED
   */
  acknowledgeAlert: async (id: number): Promise<PublicHealthAlert> => {
    const response = await apiClient.post<PublicHealthAlert>(
      `/api/response/alerts/${id}/acknowledge/`
    );
    return response.data;
  },

  /**
   * Transition ACKNOWLEDGED alert to RESOLVED
   */
  resolveAlert: async (id: number): Promise<PublicHealthAlert> => {
    const response = await apiClient.post<PublicHealthAlert>(
      `/api/response/alerts/${id}/resolve/`
    );
    return response.data;
  },

  /**
   * Dismiss an OPEN or ACKNOWLEDGED alert
   */
  dismissAlert: async (id: number): Promise<PublicHealthAlert> => {
    const response = await apiClient.post<PublicHealthAlert>(
      `/api/response/alerts/${id}/dismiss/`
    );
    return response.data;
  },
};

export default responseService;
