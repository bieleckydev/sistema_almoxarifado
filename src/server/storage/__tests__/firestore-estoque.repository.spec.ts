import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FirestoreEstoqueRepository } from '../firestore-estoque.repository';
import { Item } from '@/core/domain/item.schema';
import { Colaborador } from '@/core/domain/colaborador.schema';
import { Movimentacao } from '@/core/domain/movimentacao.schema';

/**
 * Utilitário de mock em memória que simula a interface do Firebase Admin Firestore.
 */
function createMockFirestore() {
  const store = new Map<string, Map<string, any>>();

  function getCollection(name: string) {
    if (!store.has(name)) {
      store.set(name, new Map());
    }
    return store.get(name)!;
  }

  const mockDb = {
    collection(colName: string) {
      const col = getCollection(colName);

      return {
        doc(docId: string) {
          return {
            async get() {
              const data = col.get(docId);
              return {
                id: docId,
                exists: Boolean(data),
                data: () => data ? JSON.parse(JSON.stringify(data)) : undefined,
              };
            },
            async set(data: any, options?: { merge?: boolean }) {
              if (options?.merge && col.has(docId)) {
                const existing = col.get(docId);
                col.set(docId, { ...existing, ...JSON.parse(JSON.stringify(data)) });
              } else {
                col.set(docId, JSON.parse(JSON.stringify(data)));
              }
            },
            async update(data: any) {
              const existing = col.get(docId) || {};
              col.set(docId, { ...existing, ...JSON.parse(JSON.stringify(data)) });
            },
          };
        },

        where(field: string, op: string, val: any) {
          const filters: Array<{ field: string; op: string; val: any }> = [{ field, op, val }];
          let limitCount: number | undefined;

          const queryObj = {
            where(nextField: string, nextOp: string, nextVal: any) {
              filters.push({ field: nextField, op: nextOp, val: nextVal });
              return queryObj;
            },
            limit(n: number) {
              limitCount = n;
              return queryObj;
            },
            async get() {
              let docs = Array.from(col.entries()).map(([id, d]) => ({
                id,
                data: () => JSON.parse(JSON.stringify(d)),
              }));

              for (const f of filters) {
                if (f.op === '==') {
                  docs = docs.filter((d) => d.data()[f.field] === f.val);
                }
              }

              if (typeof limitCount === 'number') {
                docs = docs.slice(0, limitCount);
              }

              return {
                empty: docs.length === 0,
                docs,
              };
            },
          };

          return queryObj;
        },

        async get() {
          const docs = Array.from(col.entries()).map(([id, d]) => ({
            id,
            data: () => JSON.parse(JSON.stringify(d)),
          }));
          return {
            empty: docs.length === 0,
            docs,
          };
        },
      };
    },
  };

  return mockDb as any;
}

describe('Fase 2 — Consultas e Catálogo no Firestore (FirestoreEstoqueRepository)', () => {
  let mockDb: any;
  let repo: FirestoreEstoqueRepository;

  const itemFlap: Item = {
    id: 'item-flap-1',
    codigo: '90-1105',
    descricao: 'Disco Flap Grão 60',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    estoqueSeguranca: 20,
    estoqueAtual: 50,
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  const itemTubo: Item = {
    id: 'item-tubo-1',
    codigo: '10-3812',
    descricao: 'Tubo de Aço Carbono SAE 1020',
    tipo: 'PRODUTIVO_MATERIA_PRIMA',
    unidade: 'KG',
    estoqueSeguranca: 500,
    estoqueAtual: 200, // ESTOQUE_BAIXO
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  const colab: Colaborador = {
    id: 'colab-1',
    matricula: '042',
    nome: 'Carlos Eduardo',
    setor: 'FERRAMENTARIA',
    funcao: 'Ferramenteiro',
    ativo: true,
  };

  beforeEach(async () => {
    mockDb = createMockFirestore();
    repo = new FirestoreEstoqueRepository(mockDb);

    await repo.salvarItem(itemFlap);
    await repo.salvarItem(itemTubo);
    await repo.salvarColaborador(colab);
  });

  describe('Itens e Catálogo', () => {
    it('deve buscar item por ID existente', async () => {
      const achado = await repo.buscarItemPorId('item-flap-1');
      assert.notEqual(achado, null);
      assert.equal(achado?.codigo, '90-1105');
      assert.equal(achado?.estoqueAtual, 50);
    });

    it('deve retornar null para ID inexistente', async () => {
      const achado = await repo.buscarItemPorId('inexistente');
      assert.equal(achado, null);
    });

    it('deve buscar item por código padronizado (case-insensitivo)', async () => {
      const achado = await repo.buscarPorCodigo('90-1105');
      assert.notEqual(achado, null);
      assert.equal(achado?.id, 'item-flap-1');

      const emMinusculo = await repo.buscarPorCodigo('10-3812');
      assert.notEqual(emMinusculo, null);
      assert.equal(emMinusculo?.id, 'item-tubo-1');
    });

    it('deve listar itens aplicando filtros de tipo e status de estoque', async () => {
      const resultadoProdutivo = await repo.listarComFiltros({
        tipo: 'PRODUTIVO_MATERIA_PRIMA',
        pagina: 1,
        limite: 10,
      });

      assert.equal(resultadoProdutivo.total, 1);
      assert.equal(resultadoProdutivo.itens[0].codigo, '10-3812');

      const resultadoBaixo = await repo.listarComFiltros({
        statusEstoque: 'ESTOQUE_BAIXO',
        pagina: 1,
        limite: 10,
      });

      assert.equal(resultadoBaixo.total, 1);
      assert.equal(resultadoBaixo.itens[0].codigo, '10-3812');
    });

    it('deve filtrar itens por busca textual (código ou descrição)', async () => {
      const busca = await repo.listarComFiltros({
        busca: 'Aço Carbono',
      });

      assert.equal(busca.total, 1);
      assert.equal(busca.itens[0].codigo, '10-3812');
    });

    it('deve atualizar saldo de item diretamente', async () => {
      await repo.atualizarSaldoItem('item-flap-1', 45);
      const atualizado = await repo.buscarItemPorId('item-flap-1');
      assert.equal(atualizado?.estoqueAtual, 45);
    });
  });

  describe('Colaboradores', () => {
    it('deve buscar colaborador por ID', async () => {
      const achado = await repo.buscarColaboradorPorId('colab-1');
      assert.notEqual(achado, null);
      assert.equal(achado?.nome, 'Carlos Eduardo');
    });

    it('deve buscar colaborador por matrícula com normalização (ex: "42" -> "042")', async () => {
      const achado = await repo.buscarColaboradorPorId('42');
      assert.notEqual(achado, null);
      assert.equal(achado?.matricula, '042');
      assert.equal(achado?.id, 'colab-1');
    });

    it('deve listar colaboradores com filtro por setor e busca textual', async () => {
      const listagem = await repo.listarColaboradores({
        setor: 'FERRAMENTARIA',
        busca: 'Carlos',
      });

      assert.equal(listagem.total, 1);
      assert.equal(listagem.colaboradores[0].nome, 'Carlos Eduardo');
    });
  });

  describe('Movimentações e Auditoria', () => {
    it('deve registrar movimentação e recuperar no extrato do item com ordenação decrescente', async () => {
      const mov1: Movimentacao = {
        id: 'mov-1',
        itemId: 'item-flap-1',
        tipo: 'ENTRADA_COMPRA',
        quantidade: 50,
        saldoAnterior: 0,
        saldoResultante: 50,
        dataMovimentacao: '2026-10-01T10:00:00.000Z',
      };

      const mov2: Movimentacao = {
        id: 'mov-2',
        itemId: 'item-flap-1',
        tipo: 'SAIDA_CONSUMO_INTERNO',
        quantidade: 5,
        saldoAnterior: 50,
        saldoResultante: 45,
        dataMovimentacao: '2026-10-02T15:00:00.000Z',
        colaboradorId: 'colab-1',
      };

      await repo.registrarMovimentacao(mov1);
      await repo.registrarMovimentacao(mov2);

      const extrato = await repo.consultarExtratoItem('item-flap-1');
      assert.equal(extrato.length, 2);
      // Mais recente primeiro
      assert.equal(extrato[0].id, 'mov-2');
      assert.equal(extrato[1].id, 'mov-1');
    });

    it('deve listar movimentações com filtros globais', async () => {
      const mov: Movimentacao = {
        id: 'mov-tubo-1',
        itemId: 'item-tubo-1',
        tipo: 'ENTRADA_COMPRA',
        quantidade: 200,
        saldoAnterior: 0,
        saldoResultante: 200,
        dataMovimentacao: '2026-10-03T10:00:00.000Z',
      };

      await repo.registrarMovimentacao(mov);

      const lista = await repo.listarMovimentacoes({
        itemId: 'item-tubo-1',
      });

      assert.equal(lista.total, 1);
      assert.equal(lista.movimentacoes[0].id, 'mov-tubo-1');
    });
  });
});
