import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { z, ZodError } from 'zod';
import {
  ApiError,
  AuthorizationError,
  readJson,
  parseQueryParams,
  toErrorResponse,
  getEstoqueRepository,
  setEstoqueRepository,
  getMovimentacaoService,
  getServerDb,
  setServerDb,
  semUndefined,
} from '../api-helpers';

import {
  ItemNaoEncontradoError,
  MovimentacaoService,
} from '@/core/services/movimentacao.service';
import { SaldoInsuficienteError } from '@/core/services/estoque-calculator';
import { MemoryEstoqueRepository } from '@/core/storage/memory-estoque.adapter';

describe('Fase 1 — Utilitários e Helpers da API (api-helpers)', () => {
  describe('readJson', () => {
    it('deve extrair payload JSON válido', async () => {
      const request = new Request('http://localhost:3000/api/teste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Broca HSS', quantidade: 10 }),
      });

      const body = await readJson<{ nome: string; quantidade: number }>(request);
      assert.equal(body.nome, 'Broca HSS');
      assert.equal(body.quantidade, 10);
    });

    it('deve lançar ApiError com status 400 para JSON inválido', async () => {
      const request = new Request('http://localhost:3000/api/teste', {
        method: 'POST',
        body: 'invalid-json{',
      });

      await assert.rejects(
        () => readJson(request),
        (err: any) => err instanceof ApiError && err.status === 400
      );
    });
  });

  describe('parseQueryParams', () => {
    it('deve converter searchParams em objeto plano', () => {
      const request = new Request('http://localhost:3000/api/itens?tipo=IMPRODUTIVO_CONSUMIVEL&pagina=2&busca=flap');
      const params = parseQueryParams(request);

      assert.equal(params.tipo, 'IMPRODUTIVO_CONSUMIVEL');
      assert.equal(params.pagina, '2');
      assert.equal(params.busca, 'flap');
    });
  });

  describe('toErrorResponse', () => {
    it('deve converter ApiError para resposta HTTP com status customizado', async () => {
      const err = new ApiError('Não autorizado para esta ação', 403);
      const res = toErrorResponse(err);
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.error, 'Não autorizado para esta ação');
    });

    it('deve converter ZodError para status 400 com detalhes dos campos', async () => {
      const schema = z.object({
        codigo: z.string().min(3, 'Código muito curto'),
        quantidade: z.number().positive('Quantidade deve ser positiva'),
      });

      let zodErr: ZodError | undefined;
      try {
        schema.parse({ codigo: '1', quantidade: -5 });
      } catch (e) {
        zodErr = e as ZodError;
      }

      assert(zodErr !== undefined);
      const res = toErrorResponse(zodErr);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error, 'Dados inválidos.');
      assert.equal(json.details.length, 2);
    });

    it('deve converter ItemNaoEncontradoError para 404', async () => {
      const err = new ItemNaoEncontradoError('item-999');
      const res = toErrorResponse(err);
      assert.equal(res.status, 404);
      const json = await res.json();
      assert(json.error.includes('item-999'));
    });

    it('deve converter SaldoInsuficienteError para 422', async () => {
      const err = new SaldoInsuficienteError(10, 20, '10-3812');
      const res = toErrorResponse(err);
      assert.equal(res.status, 422);
    });

    it('deve converter AuthorizationError para 403', async () => {
      const err = new AuthorizationError('Permissão negada');
      const res = toErrorResponse(err);
      assert.equal(res.status, 403);
    });
  });

  describe('Injeção de Dependência (DI)', () => {
    beforeEach(() => {
      setEstoqueRepository(null);
    });

    it('deve permitir injetar e recuperar um repositório customizado', () => {
      const mockRepo = new MemoryEstoqueRepository();
      setEstoqueRepository(mockRepo);

      const obtido = getEstoqueRepository();
      assert.equal(obtido, mockRepo);

      const servico = getMovimentacaoService();
      assert(servico instanceof MovimentacaoService);
    });
  });

  describe('Firestore do Servidor (getServerDb)', () => {
    beforeEach(() => {
      setServerDb(null);
    });

    it('deve retornar instância com método collection definido por padrão', () => {
      const db = getServerDb();
      assert(db !== undefined && db !== null, 'getServerDb não pode retornar undefined');
      assert.equal(typeof db.collection, 'function', 'db.collection deve ser uma função');
    });

    it('deve permitir substituir o Firestore por mock em testes via setServerDb', () => {
      const fakeDb = { collection: () => 'fake-collection' };
      setServerDb(fakeDb);

      const db = getServerDb();
      assert.equal(db, fakeDb as any);
      assert.equal(db.collection('test' as any), 'fake-collection');

      setServerDb(null);
      const restored = getServerDb();
      assert.equal(typeof restored.collection, 'function');
    });

    it('deve remover campos undefined com semUndefined', () => {
      const objetoComUndefined = {
        id: '123',
        nome: 'Teste',
        opcional: undefined,
        detalhe: { campo: undefined, valor: 42 },
      };

      const limpo = semUndefined(objetoComUndefined);
      assert.equal('opcional' in limpo, false);
      assert.equal('campo' in limpo.detalhe, false);
      assert.equal(limpo.detalhe.valor, 42);
    });
  });
});

