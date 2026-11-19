import apiClient from './api';
import type { LocalGovernmentArea, HealthFacility } from '../types';

export const coreService = {
  /**
   * Retrieve all 17 Local Government Areas in Plateau State
   */
  getLGAs: async (): Promise<LocalGovernmentArea[]> => {
    const response = await apiClient.get<LocalGovernmentArea[]>('/api/core/lgas/');
    return response.data;
  },

  /**
   * Retrieve health facilities with optional LGA or status filters
   */
  getHealthFacilities: async (params?: {
    lga?: number;
    verification_status?: string;
  }): Promise<HealthFacility[]> => {
    const response = await apiClient.get<HealthFacility[]>('/api/core/health-facilities/', {
      params,
    });
    return response.data;
  },
};

export default coreService;
