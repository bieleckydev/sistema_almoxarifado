/**
 * Contrato agnóstico de armazenamento chave-valor (Port da Arquitetura Hexagonal).
 * Permite alternar entre LocalStorage (Web), AsyncStorage (React Native),
 * IndexedDB ou MemoryStorageAdapter (Node.js/Testes/Offline) sem alterar o Core.
 */
export interface IStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}
