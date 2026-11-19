import apiClient from './api';
import type { Disease, DiseaseReport, DiseaseReportCreatePayload } from '../types';

export const surveillanceService = {
  /**
   * Retrieve active disease catalogue
   */
  getDiseases: async (): Promise<Disease[]> => {
    const response = await apiClient.get<Disease[]>('/api/surveillance/diseases/');
    return response.data;
  },

  /**
   * Retrieve disease reports with optional query filters
   */
  getReports: async (params?: {
    lga?: number;
    disease?: number;
    date?: string;
    status?: string;
  }): Promise<DiseaseReport[]> => {
    const response = await apiClient.get<DiseaseReport[]>('/api/surveillance/reports/', {
      params,
    });
    return response.data;
  },

  /**
   * Submit a new disease report (health facility reporters)
   */
  createReport: async (payload: DiseaseReportCreatePayload): Promise<DiseaseReport> => {
    const response = await apiClient.post<DiseaseReport>(
      '/api/surveillance/reports/',
      payload
    );
    return response.data;
  },
};

export default surveillanceService;
