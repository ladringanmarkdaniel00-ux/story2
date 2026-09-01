export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  totalPages: number;
}
