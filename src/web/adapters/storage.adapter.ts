import { IStorageAdapter } from '@/core/storage/storage.interface';

export class WebLocalStorageAdapter implements IStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Erro ao salvar chave "${key}" no localStorage:`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Erro ao remover chave "${key}" do localStorage:`, error);
    }
  }
}

export const webStorageAdapter = new WebLocalStorageAdapter();
