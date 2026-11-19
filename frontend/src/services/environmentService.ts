import apiClient from './api';
import type { EnvironmentalObservation, EnvironmentalObservationCreatePayload } from '../types';

export const environmentService = {
  /**
   * Retrieve environmental observations
   */
  getObservations: async (params?: {
    lga?: number;
    date?: string;
  }): Promise<EnvironmentalObservation[]> => {
    const response = await apiClient.get<EnvironmentalObservation[]>(
      '/api/environment/observations/',
      { params }
    );
    return response.data;
  },

  /**
   * Submit an environmental observation (Public Health Officers)
   */
  createObservation: async (
    payload: EnvironmentalObservationCreatePayload
  ): Promise<EnvironmentalObservation> => {
    const response = await apiClient.post<EnvironmentalObservation>(
      '/api/environment/observations/',
      payload
    );
    return response.data;
  },
};

export default environmentService;
