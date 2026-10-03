import { IStorageAdapter } from './storage.interface';

/**
 * Adaptador de persistência em memória para IStorageAdapter.
 * Utilizado para execução em Node.js (testes unitários e integração),
 * renderização no lado do servidor (SSR/Next.js sem acesso a window)
 * e como fallback offline no chão de fábrica quando o storage local estiver inacessível.
 */
export class MemoryStorageAdapter implements IStorageAdapter {
  private storage = new Map<string, string>();

  constructor(initialData?: Record<string, string>) {
    if (initialData) {
      for (const [key, value] of Object.entries(initialData)) {
        this.storage.set(key, value);
      }
    }
  }

  /**
   * Obtém o valor em formato string associado à chave.
   */
  async getItem(key: string): Promise<string | null> {
    return this.storage.has(key) ? this.storage.get(key)! : null;
  }

  /**
   * Grava um par chave-valor no armazenamento em memória.
   */
  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, String(value));
  }

  /**
   * Remove a chave especificada do armazenamento.
   */
  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * Esvazia completamente o armazenamento em memória.
   */
  async clear(): Promise<void> {
    this.storage.clear();
  }

  /**
   * Retorna a lista de todas as chaves cadastradas no armazenamento.
   */
  async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  /**
   * Utilitário para recuperação com deserialização JSON tipada.
   */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Utilitário para gravação de objeto com serialização JSON automática.
   */
  async setJson<T>(key: string, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  }

  /**
   * Quantidade de itens armazenados em memória.
   */
  get size(): number {
    return this.storage.size;
  }
}
