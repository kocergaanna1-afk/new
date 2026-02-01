import apiClient from './client';
import type { TrialBalanceResponse, AccountCardResponse } from '../types';

export const reportsApi = {
  getTrialBalance: async (dateFrom: string, dateTo: string): Promise<TrialBalanceResponse> => {
    const response = await apiClient.get<TrialBalanceResponse>(
      `/reports/trial-balance?dateFrom=${dateFrom}&dateTo=${dateTo}`
    );
    return response.data;
  },

  getAccountCard: async (
    accountCode: string,
    dateFrom: string,
    dateTo: string
  ): Promise<AccountCardResponse> => {
    const response = await apiClient.get<AccountCardResponse>(
      `/reports/account-card?accountCode=${accountCode}&dateFrom=${dateFrom}&dateTo=${dateTo}`
    );
    return response.data;
  },
};
