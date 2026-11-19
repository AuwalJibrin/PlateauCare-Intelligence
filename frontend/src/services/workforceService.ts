import apiClient from './api';
import type { WorkforceHealthRecord, WorkforceHealthRecordCreatePayload } from '../types';

export const workforceService = {
  /**
   * Retrieve workforce health records
   */
  getRecords: async (params?: {
    lga?: number;
    date?: string;
  }): Promise<WorkforceHealthRecord[]> => {
    const response = await apiClient.get<WorkforceHealthRecord[]>(
      '/api/workforce/records/',
      { params }
    );
    return response.data;
  },

  /**
   * Submit workforce health record (Workforce Reporters for their assigned LGA)
   */
  createRecord: async (
    payload: WorkforceHealthRecordCreatePayload
  ): Promise<WorkforceHealthRecord> => {
    const response = await apiClient.post<WorkforceHealthRecord>(
      '/api/workforce/records/',
      payload
    );
    return response.data;
  },
};

export default workforceService;
