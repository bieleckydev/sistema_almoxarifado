import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  configureApiClient,
  resetApiClient,
  createApiClient,
  ApiError,
} from '../client';
import { ENDPOINTS } from '../endpoints';
import { MemoryStorageAdapter } from '../../storage/memory-storage.adapter';

import { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

describe('5.3 — Interceptadores e Injeção de Dependência (client.ts)', () => {
  beforeEach(() => {
    resetApiClient();
  });

  it('deve validar a integridade e mapeamento das rotas centralizadas em ENDPOINTS', () => {
    assert.equal(ENDPOINTS.AUTH.LOGIN, '/auth/login');
    assert.equal(ENDPOINTS.ITENS.BASE, '/itens');
    assert.equal(ENDPOINTS.ITENS.BUSCA_CODIGO('10-001'), '/itens/codigo/10-001');
    assert.equal(ENDPOINTS.COLABORADORES.BUSCA_MATRICULA('042'), '/colaboradores/matricula/042');
    assert.equal(ENDPOINTS.MOVIMENTACOES.BAIXA_LOTE, '/movimentacoes/baixa-lote');
    assert.equal(ENDPOINTS.NFE.RECONCILIAR, '/nfe/reconciliar');
    assert.equal(ENDPOINTS.INVENTARIO.SESSOES, '/inventario/sessoes');
  });

  it('deve injetar token Bearer nos cabeçalhos quando configurado via IStorageAdapter', async () => {
    const storage = new MemoryStorageAdapter({
      auth_token: 'meu-token-jwt-super-seguro',
    });

    configureApiClient(storage);

    const client = createApiClient({ storageAdapter: storage });

    // Simula a passagem do interceptador de requisição
    // @ts-expect-error - acessando manipulador interno do interceptador para teste unitário sem rede
    const requestInterceptor = client.interceptors.request.handlers[0];

    const configSimulada = {
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig;

    const resultadoConfig = await requestInterceptor.fulfilled(configSimulada);
    assert.equal(resultadoConfig.headers.Authorization, 'Bearer meu-token-jwt-super-seguro');
  });

  it('não deve injetar Authorization se não houver token no storage', async () => {
    const storageVazio = new MemoryStorageAdapter();
    const client = createApiClient({ storageAdapter: storageVazio });

    // @ts-expect-error - manipulador do interceptador
    const requestInterceptor = client.interceptors.request.handlers[0];

    const configSimulada = {
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig;

    const resultadoConfig = await requestInterceptor.fulfilled(configSimulada);
    assert.equal(resultadoConfig.headers.Authorization, undefined);
  });

  it('deve disparar callback onUnauthorized quando resposta retornar 401', async () => {
    let callbackChamado = false;

    const client = createApiClient({
      onUnauthorized: () => {
        callbackChamado = true;
      },
    });

    // @ts-expect-error - manipulador de resposta
    const responseInterceptor = client.interceptors.response.handlers[0];

    const erro401Simulado = {
      response: {
        status: 401,
        data: { message: 'Token expirado ou inválido.' },
      },
      message: 'Request failed with status code 401',
    };

    await assert.rejects(
      async () => responseInterceptor.rejected!(erro401Simulado),
      (err: Error) => {
        assert.ok(err instanceof ApiError);
        assert.equal((err as ApiError).statusCode, 401);
        assert.equal((err as ApiError).message, 'Token expirado ou inválido.');
        return true;
      }
    );

    assert.equal(callbackChamado, true);
  });

  it('deve formatar ApiError adequadamente mesmo sem corpo de resposta', async () => {
    const client = createApiClient();
    // @ts-expect-error - manipulador de resposta
    const responseInterceptor = client.interceptors.response.handlers[0];

    const erroRedeSimulado = {
      message: 'Network Error',
    };

    await assert.rejects(
      async () => responseInterceptor.rejected!(erroRedeSimulado),
      (err: Error) => {
        assert.ok(err instanceof ApiError);
        assert.equal((err as ApiError).message, 'Network Error');
        assert.equal((err as ApiError).statusCode, undefined);
        return true;
      }
    );
  });

  it('deve permitir configurar cliente global api com chave de token customizada', async () => {
    const storage = new MemoryStorageAdapter({
      token_operador: 'token-operador-rhowert',
    });

    configureApiClient({
      storageAdapter: storage,
      tokenKey: 'token_operador',
      baseURL: 'https://api.rhowert.com.br/v1',
    });

    assert.equal(api.defaults.baseURL, 'https://api.rhowert.com.br/v1');

    // @ts-expect-error - manipulador do interceptador
    const requestInterceptor = api.interceptors.request.handlers[0];
    const config = await requestInterceptor.fulfilled({
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig);

    assert.equal(config.headers.Authorization, 'Bearer token-operador-rhowert');
  });
});
