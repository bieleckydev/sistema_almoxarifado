import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setIdentityAuthenticator } from '../api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import { instalarFirestoreDeTeste, desinstalarFirestoreDeTeste } from './firestore-fixture';
import { GET as getFaturamento, POST as postFaturamento } from '../faturamento/route';
import { GET as getPedidos, POST as postPedidos } from '../pedidos/route';
import { PATCH as patchPedido } from '../pedidos/[id]/route';

const mockAdminIdentity: AuthenticatedIdentity = {
  token: { uid: 'user-admin', role: 'admin' } as any,
  user: {
    id: 'user-admin',
    name: 'Administrador Chefe',
    email: 'admin@empresa.com',
    role: 'admin',
    ativo: true,
    mustChangePassword: false,
  },
};

const HEADERS_MESTRE = {
  'Content-Type': 'application/json',
};

describe('Fase 2 — API: Precificação de Pedidos e Módulo de Faturamento', () => {
  beforeEach(() => {
    setIdentityAuthenticator(async () => mockAdminIdentity);
    instalarFirestoreDeTeste();
  });

  after(() => {
    setIdentityAuthenticator(null);
    desinstalarFirestoreDeTeste();
  });

  it('GET /api/faturamento deve retornar KPIs consolidados e pedidos elegíveis para faturamento', async () => {
    const req = new Request('http://localhost:3000/api/faturamento', {
      method: 'GET',
    });

    const res = await getFaturamento(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.pedidosAFaturar));
    assert.ok(Array.isArray(body.notasEmitidas));
    assert.ok(body.kpis);
    assert.equal(typeof body.kpis.totalPedidosAFaturar, 'number');
    assert.equal(typeof body.kpis.valorPedidosAFaturar, 'number');
    assert.equal(typeof body.kpis.totalNotasEmitidas, 'number');
    assert.equal(typeof body.kpis.valorTotalFaturado, 'number');
  });

  it('POST /api/pedidos deve criar pedido com itens precificados e calcular valorTotal', async () => {
    const req = new Request('http://localhost:3000/api/pedidos', {
      method: 'POST',
      headers: HEADERS_MESTRE,
      body: JSON.stringify({
        clienteId: 'cli-1',
        prazoEntrega: '2026-10-30',
        itens: [
          { itemId: 'item-1', quantidade: 5, precoUnitario: 100 },
          { itemId: 'item-3', quantidade: 2, precoUnitario: 50 },
        ],
      }),
    });

    const res = await postPedidos(req);
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.ok(body.id);
    assert.equal(body.valorTotal, 5 * 100 + 2 * 50); // 600
  });

  it('POST /api/faturamento deve rejeitar faturamento de pedido com status PENDENTE', async () => {
    // Cria um pedido pendente
    const reqPed = new Request('http://localhost:3000/api/pedidos', {
      method: 'POST',
      headers: HEADERS_MESTRE,
      body: JSON.stringify({
        clienteId: 'cli-1',
        prazoEntrega: '2026-10-30',
        status: 'PENDENTE',
        itens: [{ itemId: 'item-1', quantidade: 1, precoUnitario: 250 }],
      }),
    });
    const resPed = await postPedidos(reqPed);
    const pedidoCriado = await resPed.json();

    // Tenta faturar
    const reqFat = new Request('http://localhost:3000/api/faturamento', {
      method: 'POST',
      headers: HEADERS_MESTRE,
      body: JSON.stringify({
        pedidoId: pedidoCriado.id,
        numeroNF: '9876',
        serie: '1',
        dataEmissao: '2026-10-25',
      }),
    });

    const resFat = await postFaturamento(reqFat);
    assert.equal(resFat.status, 400);

    const bodyFat = await resFat.json();
    assert.match(bodyFat.message, /Pendente/);
  });

  it('POST /api/faturamento deve faturar pedido SEPARADO com sucesso e registrar NF-e', async () => {
    // 1. Cria pedido
    const reqPed = new Request('http://localhost:3000/api/pedidos', {
      method: 'POST',
      headers: HEADERS_MESTRE,
      body: JSON.stringify({
        clienteId: 'cli-1',
        prazoEntrega: '2026-10-30',
        status: 'PENDENTE',
        itens: [{ itemId: 'item-1', quantidade: 2, precoUnitario: 150 }],
      }),
    });
    const resPed = await postPedidos(reqPed);
    const pedidoCriado = await resPed.json();

    // 2. Avança status para SEPARADO
    const reqSeparar = new Request(`http://localhost:3000/api/pedidos/${pedidoCriado.id}`, {
      method: 'PATCH',
      headers: HEADERS_MESTRE,
      body: JSON.stringify({ status: 'SEPARADO' }),
    });
    const resSeparar = await patchPedido(reqSeparar, {
      params: Promise.resolve({ id: pedidoCriado.id }),
    });
    assert.equal(resSeparar.status, 200);

    // 3. Fatura o pedido
    const reqFat = new Request('http://localhost:3000/api/faturamento', {
      method: 'POST',
      headers: HEADERS_MESTRE,
      body: JSON.stringify({
        pedidoId: pedidoCriado.id,
        numeroNF: '5544',
        serie: '1',
        dataEmissao: '2026-10-25',
        dataVencimento: '2026-11-25',
      }),
    });

    const resFat = await postFaturamento(reqFat);
    assert.equal(resFat.status, 201);

    const bodyFat = await resFat.json();
    assert.ok(bodyFat.notaFiscal);
    assert.equal(bodyFat.notaFiscal.numeroNF, '5544');
    assert.equal(bodyFat.notaFiscal.valorTotal, 300);
    assert.equal(bodyFat.faturamento.numeroNFe, '5544');
  });

  it('POST /api/faturamento deve rejeitar faturamento duplicado de pedido já faturado', async () => {
    // 1. Cria pedido
    const reqPed = new Request('http://localhost:3000/api/pedidos', {
      method: 'POST',
      headers: HEADERS_MESTRE,
      body: JSON.stringify({
        clienteId: 'cli-2',
        prazoEntrega: '2026-10-30',
        itens: [{ itemId: 'item-1', quantidade: 1, precoUnitario: 80 }],
      }),
    });
    const resPed = await postPedidos(reqPed);
    const pedido = await resPed.json();

    // 2. Separa
    await patchPedido(
      new Request(`http://localhost:3000/api/pedidos/${pedido.id}`, {
        method: 'PATCH',
        headers: HEADERS_MESTRE,
        body: JSON.stringify({ status: 'SEPARADO' }),
      }),
      { params: Promise.resolve({ id: pedido.id }) }
    );

    // 3. Fatura 1a vez
    const resFat1 = await postFaturamento(
      new Request('http://localhost:3000/api/faturamento', {
        method: 'POST',
        headers: HEADERS_MESTRE,
        body: JSON.stringify({
          pedidoId: pedido.id,
          numeroNF: '7788',
          serie: '1',
          dataEmissao: '2026-10-25',
        }),
      })
    );
    assert.equal(resFat1.status, 201);

    // 4. Fatura 2a vez (deve ser rejeitado)
    const resFat2 = await postFaturamento(
      new Request('http://localhost:3000/api/faturamento', {
        method: 'POST',
        headers: HEADERS_MESTRE,
        body: JSON.stringify({
          pedidoId: pedido.id,
          numeroNF: '7789',
          serie: '1',
          dataEmissao: '2026-10-25',
        }),
      })
    );
    assert.equal(resFat2.status, 400);

    const bodyFat2 = await resFat2.json();
    assert.match(bodyFat2.message, /já foi faturado anteriormente/);
  });
});
