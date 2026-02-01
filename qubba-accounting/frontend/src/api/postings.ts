import apiClient from './client';
import type { Posting, CreatePostingDto, PaginatedResponse } from '../types';

export interface PostingFilter {
  dateFrom?: string;
  dateTo?: string;
  accountCode?: string;
  counterpartyId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const postingsApi = {
  getAll: async (filter: PostingFilter = {}): Promise<PaginatedResponse<Posting>> => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await apiClient.get<PaginatedResponse<Posting>>(`/postings?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Posting> => {
    const response = await apiClient.get<Posting>(`/postings/${id}`);
    return response.data;
  },

  create: async (data: CreatePostingDto): Promise<Posting> => {
    const response = await apiClient.post<Posting>('/postings', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreatePostingDto>): Promise<Posting> => {
    const response = await apiClient.put<Posting>(`/postings/${id}`, data);
    return response.data;
  },

  cancel: async (id: string): Promise<Posting> => {
    const response = await apiClient.post<Posting>(`/postings/${id}/cancel`);
    return response.data;
  },
};
