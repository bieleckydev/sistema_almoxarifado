import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setIdentityAuthenticator } from '../api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import type { FakeFirestore } from '@/server/testing/fake-firestore';
import { instalarFirestoreDeTeste, desinstalarFirestoreDeTeste } from './firestore-fixture';
import { POST as postPedidos } from '../pedidos/route';
import { PATCH as patchPedido } from '../pedidos/[id]/route';
import { GET as getFaturamento, POST as postFaturamento } from '../faturamento/route';
import { POST as cancelarNota } from '../faturamento/notas/[id]/cancelar/route';
import { POST as postRequisicao } from '../requisicoes/route';
import { PATCH as patchRequisicao } from '../requisicoes/[id]/route';
import { GET as getMovimentacoesExtrato } from '../movimentacoes/extrato/[itemId]/route';
import { setEstoqueRepository } from '../api-helpers';
import { FirestoreEstoqueRepository } from '@/server/storage/firestore-estoque.repository';

const mestre: AuthenticatedIdentity = {
  token: { uid: 'user-mestre' } as any,
  user: {
    id: 'user-mestre',
    name: 'Mestre',
    email: 'mestre@empresa.com',
    role: 'mestre',
    ativo: true,
    mustChangePassword: false,
  },
};

const json = (method: string, body: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

async function criarPedido(itens: Array<{ itemId: string; quantidade: number; precoUnitario?: number }>) {
  const res = await postPedidos(
    new Request('http://localhost/api/pedidos', json('POST', { clienteId: 'cli-1', prazoEntrega: '2026-12-01', itens }))
  );
  assert.equal(res.status, 201);
  return (await res.json()) as { id: string; numeroSequencial: number };
}

function mudarStatusPedido(id: string, body: Record<string, unknown>) {
  return patchPedido(new Request(`http://localhost/api/pedidos/${id}`, json('PATCH', body)), {
    params: Promise.resolve({ id }),
  });
}

describe('Fluxos transacionais das rotas (pedidos, faturamento, requisições)', () => {
  let db: FakeFirestore;

  beforeEach(() => {
    setIdentityAuthenticator(async () => mestre);
    db = instalarFirestoreDeTeste();
    setEstoqueRepository(new FirestoreEstoqueRepository(db as any));
  });

  after(() => {
    setIdentityAuthenticator(null);
    setEstoqueRepository(null);
    desinstalarFirestoreDeTeste();
  });

  describe('Pedidos', () => {
    it('gera números sequenciais sem repetição em criações simultâneas', async () => {
      const pedidos = await Promise.all([
        criarPedido([{ itemId: 'item-1', quantidade: 1 }]),
        criarPedido([{ itemId: 'item-1', quantidade: 1 }]),
        criarPedido([{ itemId: 'item-1', quantidade: 1 }]),
      ]);
      const numeros = new Set(pedidos.map((p) => p.numeroSequencial));
      assert.equal(numeros.size, 3);
    });

    it('entrega debita o estoque uma única vez e grava movimentação legível no extrato', async () => {
      const pedido = await criarPedido([
        { itemId: 'item-1', quantidade: 10 },
        { itemId: 'item-1', quantidade: 5 },
      ]);

      const res1 = await mudarStatusPedido(pedido.id, { status: 'ENTREGUE' });
      assert.equal(res1.status, 200);
      assert.equal(db.peek('items', 'item-1')?.estoqueAtual, 85);

      const res2 = await mudarStatusPedido(pedido.id, { status: 'ENTREGUE' });
      assert.equal(res2.status, 409);
      assert.equal(db.peek('items', 'item-1')?.estoqueAtual, 85);

      // O extrato do item continua legível (movimentação no formato do schema).
      const extrato = await getMovimentacoesExtrato(new Request('http://localhost/api/movimentacoes/extrato/item-1'), {
        params: Promise.resolve({ itemId: 'item-1' }),
      });
      assert.equal(extrato.status, 200);
      const corpo = await extrato.json();
      const lista = corpo.dados ?? corpo.movimentacoes ?? corpo;
      assert.ok(Array.isArray(lista) && lista.length === 1, 'extrato deve conter a expedição');
      assert.equal(lista[0].saldoResultante, 85);
      assert.equal(lista[0].destinatario, 'Metalúrgica Horizonte');
    });

    it('não entrega pedido cancelado', async () => {
      const pedido = await criarPedido([{ itemId: 'item-1', quantidade: 1 }]);
      const cancel = await mudarStatusPedido(pedido.id, { status: 'CANCELADO', motivoCancelamento: 'Cliente desistiu' });
      assert.equal(cancel.status, 200);

      const entrega = await mudarStatusPedido(pedido.id, { status: 'ENTREGUE' });
      assert.equal(entrega.status, 409);
      assert.equal(db.peek('items', 'item-1')?.estoqueAtual, 100);
    });

    it('recusa entrega com estoque insuficiente sem alterar nada', async () => {
      const pedido = await criarPedido([
        { itemId: 'item-1', quantidade: 1 },
        { itemId: 'item-2', quantidade: 50 },
      ]);
      const res = await mudarStatusPedido(pedido.id, { status: 'ENTREGUE' });
      assert.equal(res.status, 422);
      assert.equal(db.peek('items', 'item-1')?.estoqueAtual, 100);
      assert.equal(db.peek('orders', pedido.id)?.status, 'PENDENTE');
    });
  });

  describe('Faturamento', () => {
    async function pedidoSeparado() {
      const pedido = await criarPedido([{ itemId: 'item-1', quantidade: 2, precoUnitario: 100 }]);
      await mudarStatusPedido(pedido.id, { status: 'SEPARADO' });
      return pedido;
    }

    function faturar(pedidoId: string, numeroNF: string) {
      return postFaturamento(
        new Request('http://localhost/api/faturamento', json('POST', { pedidoId, numeroNF, serie: '1', dataEmissao: '2026-10-25' }))
      );
    }

    it('recusa número de NF já usado em outro pedido', async () => {
      const a = await pedidoSeparado();
      const b = await pedidoSeparado();
      assert.equal((await faturar(a.id, '1001')).status, 201);
      assert.equal((await faturar(b.id, '1001')).status, 409);
      assert.equal(db.peek('invoices', 'nf-1001-1')?.pedidoId, a.id);
    });

    it('cancela NF uma vez, libera o pedido e tira a nota do total faturado', async () => {
      const pedido = await pedidoSeparado();
      await faturar(pedido.id, '2002');

      const cancelar = () =>
        cancelarNota(new Request('http://localhost/x', json('POST', { motivo: 'Erro de digitação' })), {
          params: Promise.resolve({ id: 'nf-2002-1' }),
        });
      assert.equal((await cancelar()).status, 200);
      assert.equal((await cancelar()).status, 409);
      assert.equal(db.peek('orders', pedido.id)?.faturamento, null);

      const painel = await (await getFaturamento(new Request('http://localhost/api/faturamento'))).json();
      const nota = painel.notasEmitidas.find((n: any) => n.id === 'nf-2002-1');
      assert.equal(nota.status, 'CANCELADA');
      assert.ok(painel.pedidosAFaturar.some((p: any) => p.id === pedido.id));
    });
  });

  describe('Requisições', () => {
    async function requisicaoAprovada(quantidade: number) {
      const res = await postRequisicao(
        new Request('http://localhost/api/requisicoes', json('POST', {
          setor: 'Montagem',
          itens: [{ itemId: 'item-3', quantidadeSolicitada: quantidade }],
        }))
      );
      assert.equal(res.status, 201);
      const req = await res.json();
      const aprov = await patchRequisicao(new Request('http://x', json('PATCH', { status: 'APROVADA' })), {
        params: Promise.resolve({ id: req.id }),
      });
      assert.equal(aprov.status, 200);
      return req as { id: string };
    }

    function entregar(id: string) {
      return patchRequisicao(new Request('http://x', json('PATCH', { status: 'ENTREGUE' })), {
        params: Promise.resolve({ id }),
      });
    }

    it('entrega baixa o estoque e não pode ser repetida', async () => {
      const req = await requisicaoAprovada(15);
      assert.equal((await entregar(req.id)).status, 200);
      assert.equal(db.peek('items', 'item-3')?.estoqueAtual, 25);
      assert.equal((await entregar(req.id)).status, 409);
      assert.equal(db.peek('items', 'item-3')?.estoqueAtual, 25);
    });

    it('sem estoque, a requisição não é marcada como entregue', async () => {
      const req = await requisicaoAprovada(999);
      assert.equal((await entregar(req.id)).status, 422);
      assert.equal(db.peek('requisicoes', req.id)?.status, 'APROVADA');
      assert.equal(db.peek('items', 'item-3')?.estoqueAtual, 40);
    });
  });
});
