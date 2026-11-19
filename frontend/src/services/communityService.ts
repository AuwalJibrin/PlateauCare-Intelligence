import apiClient from './api';
import type { CommunityHealthRecord, CommunityHealthRecordCreatePayload } from '../types';

export const communityService = {
  /**
   * Retrieve community health records
   */
  getRecords: async (params?: {
    lga?: number;
    date?: string;
  }): Promise<CommunityHealthRecord[]> => {
    const response = await apiClient.get<CommunityHealthRecord[]>(
      '/api/community/records/',
      { params }
    );
    return response.data;
  },

  /**
   * Submit community health record (Community Reporters for their assigned LGA)
   */
  createRecord: async (
    payload: CommunityHealthRecordCreatePayload
  ): Promise<CommunityHealthRecord> => {
    const response = await apiClient.post<CommunityHealthRecord>(
      '/api/community/records/',
      payload
    );
    return response.data;
  },
};

export default communityService;
