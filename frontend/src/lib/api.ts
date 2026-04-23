import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

export function getApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || 'Request failed.';
  }

  return 'Something went wrong.';
}
