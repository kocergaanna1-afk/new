import apiClient from './client';
import type { Account } from '../types';

export interface CreateAccountDto {
  code: string;
  name: string;
  description?: string;
  type?: string;
  category?: string;
  parentId?: string;
  requiresAnalytics?: boolean;
  analyticsTypes?: string[];
  isCurrency?: boolean;
  isQuantity?: boolean;
}

export interface UpdateAccountDto {
  name?: string;
  description?: string;
  type?: string;
  isActive?: boolean;
  requiresAnalytics?: boolean;
  analyticsTypes?: string[];
}

export const accountsApi = {
  getAll: async (): Promise<Account[]> => {
    const response = await apiClient.get<Account[]>('/accounts');
    return response.data;
  },

  getByCode: async (code: string): Promise<Account> => {
    const response = await apiClient.get<Account>(`/accounts/${code}`);
    return response.data;
  },

  create: async (data: CreateAccountDto): Promise<Account> => {
    const response = await apiClient.post<Account>('/accounts', data);
    return response.data;
  },

  update: async (id: string, data: UpdateAccountDto): Promise<Account> => {
    const response = await apiClient.put<Account>(`/accounts/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/accounts/${id}`);
  },

  initializeStandard: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/accounts/initialize');
    return response.data;
  },
};
