import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { IStorageAdapter } from '../storage/storage.interface';

/**
 * Erro padronizado retornado pelas chamadas de API do sistema.
 */
export class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode?: number,
    public readonly data?: unknown,
    public readonly originalError?: AxiosError
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Opções de configuração para o cliente HTTP injetável.
 */
export interface ApiClientConfig {
  /**
   * Adaptador de armazenamento persistente para recuperação do token JWT.
   */
  storageAdapter?: IStorageAdapter;
  /**
   * URL base do backend ou BFF (default: '/api' ou process.env.NEXT_PUBLIC_API_URL).
   */
  baseURL?: string;
  /**
   * Nome da chave utilizada para armazenar o token (default: 'auth_token').
   */
  tokenKey?: string;
  /**
   * Callback executado quando o servidor retornar HTTP 401 (Não Autorizado).
   */
  onUnauthorized?: () => void | Promise<void>;
  /**
   * Timeout padrão em milissegundos (default: 15000ms).
   */
  timeout?: number;
}

let activeStorage: IStorageAdapter | null = null;
let activeTokenKey = 'auth_token';
let activeOnUnauthorized: (() => void | Promise<void>) | null = null;

/**
 * Fábrica pura de clientes Axios com interceptadores configurados.
 */
export function createApiClient(config: ApiClientConfig = {}): AxiosInstance {
  const baseURL =
    config.baseURL ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
    '/api';

  const client = axios.create({
    baseURL,
    timeout: config.timeout || 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const explicitStorage = config.storageAdapter;
  const explicitTokenKey = config.tokenKey;
  const explicitOnUnauthorized = config.onUnauthorized;

  // Interceptador de Requisição: Injeta token JWT se presente no storage
  client.interceptors.request.use(async (reqConfig: InternalAxiosRequestConfig) => {
    const currentStorage = explicitStorage || activeStorage;
    const currentTokenKey = explicitTokenKey || activeTokenKey;

    if (currentStorage) {
      try {
        const token = await currentStorage.getItem(currentTokenKey);
        if (token) {
          reqConfig.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        // Em caso de falha na leitura do storage, continua a requisição sem token
        console.warn('Falha ao recuperar token de autenticação do storage:', err);
      }
    }

    return reqConfig;
  });

  // Interceptador de Resposta: Tratamento de erros e callback de 401
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const currentOnUnauthorized = explicitOnUnauthorized || activeOnUnauthorized;
      const status = error.response?.status;

      if (status === 401 && currentOnUnauthorized) {
        try {
          await currentOnUnauthorized();
        } catch (cbErr) {
          console.error('Erro na execução do callback onUnauthorized:', cbErr);
        }
      }

      const mensagemErro =
        (error.response?.data as { message?: string })?.message ||
        error.message ||
        'Ocorreu um erro na comunicação com o servidor.';

      return Promise.reject(
        new ApiError(mensagemErro, status, error.response?.data, error)
      );
    }
  );

  return client;
}

/**
 * Instância singleton padrão do cliente de API.
 */
export const api: AxiosInstance = createApiClient();

/**
 * Configura as dependências globais da instância padrão `api`.
 * Suporta passagem direta de `IStorageAdapter` para retrocompatibilidade
 * ou objeto estruturado `ApiClientConfig`.
 */
export function configureApiClient(configOrStorage: ApiClientConfig | IStorageAdapter): void {
  if ('getItem' in configOrStorage) {
    activeStorage = configOrStorage;
    activeTokenKey = 'auth_token';
    activeOnUnauthorized = null;
  } else {
    activeStorage = configOrStorage.storageAdapter || null;
    activeTokenKey = configOrStorage.tokenKey || 'auth_token';
    activeOnUnauthorized = configOrStorage.onUnauthorized || null;
    if (configOrStorage.baseURL) {
      api.defaults.baseURL = configOrStorage.baseURL;
    }
    if (configOrStorage.timeout) {
      api.defaults.timeout = configOrStorage.timeout;
    }
  }
}

/**
 * Restaura o estado da configuração da API para o padrão inicial (útil para testes).
 */
export function resetApiClient(): void {
  activeStorage = null;
  activeTokenKey = 'auth_token';
  activeOnUnauthorized = null;
  api.defaults.baseURL =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || '/api';
}
