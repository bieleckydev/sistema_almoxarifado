import axios from 'axios';
import { IStorageAdapter } from '../storage/storage.interface';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let storageInstance: IStorageAdapter | null = null;

export const configureApiClient = (storageAdapter: IStorageAdapter): void => {
  storageInstance = storageAdapter;
};

api.interceptors.request.use(async (config) => {
  if (storageInstance) {
    const token = await storageInstance.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
