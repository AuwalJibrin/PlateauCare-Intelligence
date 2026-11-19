import apiClient from './api';
import type { HealthRiskAssessment } from '../types';

export const intelligenceService = {
  /**
   * Retrieve AI Anomaly Health Risk Assessments from trained Isolation Forest model
   */
  getRiskAssessments: async (params?: {
    lga?: number;
    date?: string;
  }): Promise<HealthRiskAssessment[]> => {
    const response = await apiClient.get<HealthRiskAssessment[]>(
      '/api/intelligence/risk-assessments/',
      { params }
    );
    return response.data;
  },
};

export default intelligenceService;
