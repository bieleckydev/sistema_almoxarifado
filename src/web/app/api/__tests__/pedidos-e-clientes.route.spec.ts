import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  setIdentityAuthenticator,
} from '../api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import { instalarFirestoreDeTeste, desinstalarFirestoreDeTeste } from './firestore-fixture';
import { GET as getPedidos, POST as postPedidos } from '../pedidos/route';
import { PATCH as patchPedido } from '../pedidos/[id]/route';
import { GET as getClientes, POST as postClientes } from '../clientes/route';

// Mocks de Identidade RBAC
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

const mockRequisitanteIdentity: AuthenticatedIdentity = {
  token: { uid: 'user-req', role: 'requisitante' } as any,
  user: {
    id: 'user-req',
    name: 'Requisitante Sem Permissao',
    email: 'req@empresa.com',
    role: 'requisitante',
    ativo: true,
    mustChangePassword: false,
  },
};

describe('Fase 7 — Rotas BFF e Integração (/api/pedidos e /api/clientes)', () => {
  beforeEach(() => {
    setIdentityAuthenticator(async () => mockAdminIdentity);
    instalarFirestoreDeTeste();
  });

  describe('GET /api/pedidos', () => {
    it('deve listar pedidos enriquecidos com metadados de cliente, atraso e itens', async () => {
      const request = new Request('http://localhost:3000/api/pedidos');
      const response = await getPedidos(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(Array.isArray(data.dados));
      assert.ok(data.dados.length > 0);

      const primeiro = data.dados[0];
      assert.ok(primeiro.id);
      assert.ok(primeiro.clienteId);
      assert.ok(typeof primeiro.atrasado === 'boolean');
      assert.ok(typeof primeiro.faltaEstoque === 'boolean');
      assert.ok(Array.isArray(primeiro.itens));
    });

    it('deve filtrar pedidos por status', async () => {
      const request = new Request('http://localhost:3000/api/pedidos?status=ENTREGUE');
      const response = await getPedidos(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(data.dados.every((p: any) => p.status === 'ENTREGUE'));
    });

    it('deve omitir pedidos encerrados antigos por padrão e incluí-los com historico=completo', async () => {
      const db = instalarFirestoreDeTeste();
      db.seed('orders', [
        {
          id: 'ped-antigo',
          numeroSequencial: 7,
          clienteId: 'cli-1',
          prazoEntrega: '2024-01-10',
          status: 'ENTREGUE',
          itens: [{ itemId: 'item-1', quantidade: 1, precoUnitario: 10 }],
        },
        {
          id: 'ped-aberto-antigo',
          numeroSequencial: 8,
          clienteId: 'cli-1',
          prazoEntrega: '2024-01-10',
          status: 'PENDENTE',
          itens: [{ itemId: 'item-1', quantidade: 1, precoUnitario: 10 }],
        },
      ]);

      const padrao = await (await getPedidos(new Request('http://localhost:3000/api/pedidos'))).json();
      const idsPadrao = padrao.dados.map((p: any) => p.id);
      assert.ok(!idsPadrao.includes('ped-antigo'), 'encerrado antigo não deve aparecer');
      assert.ok(idsPadrao.includes('ped-aberto-antigo'), 'pedido em aberto sempre aparece');
      assert.equal(padrao.historicoCompleto, false);

      const completo = await (
        await getPedidos(new Request('http://localhost:3000/api/pedidos?historico=completo'))
      ).json();
      assert.ok(completo.dados.some((p: any) => p.id === 'ped-antigo'));
      assert.equal(completo.historicoCompleto, true);

      const busca = await (await getPedidos(new Request('http://localhost:3000/api/pedidos?busca=7'))).json();
      assert.ok(busca.dados.some((p: any) => p.id === 'ped-antigo'), 'busca considera todo o histórico');
    });

    it('deve enriquecer o pedido com nome do cliente e dados do item', async () => {
      const res = await getPedidos(new Request('http://localhost:3000/api/pedidos?historico=completo'));
      const data = await res.json();
      const comItem = data.dados.find((p: any) => p.itensDetalhes.some((i: any) => i.codigo));
      assert.ok(comItem, 'ao menos um pedido referencia item cadastrado');
      assert.notEqual(comItem.clienteNome, 'Cliente não identificado');
    });

    it('deve filtrar pedidos por busca textual', async () => {
      const request = new Request('http://localhost:3000/api/pedidos?busca=Metalurgica');
      const response = await getPedidos(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(Array.isArray(data.dados));
    });
  });

  describe('POST /api/pedidos', () => {
    it('deve validar e rejeitar pedido sem itens ou sem clienteId', async () => {
      const requestInvalido = new Request('http://localhost:3000/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: '',
          prazoEntrega: '2026-10-30',
          itens: [],
        }),
      });

      const response = await postPedidos(requestInvalido);
      assert.equal(response.status, 400);
      const erro = await response.json();
      assert.equal(erro.error, 'Dados inválidos.');
      assert.ok(Array.isArray(erro.details));
    });

    it('deve rejeitar criação de pedido por usuário sem permissão operacional', async () => {
      setIdentityAuthenticator(async () => mockRequisitanteIdentity);

      const request = new Request('http://localhost:3000/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: 'cli-1',
          prazoEntrega: '2026-10-30',
          itens: [{ itemId: 'item-1', quantidade: 2 }],
        }),
      });

      const response = await postPedidos(request);
      assert.equal(response.status, 403);
    });
  });

  describe('PATCH /api/pedidos/[id]', () => {
    it('deve rejeitar atualização sem status informado', async () => {
      const request = new Request('http://localhost:3000/api/pedidos/ped-101', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await patchPedido(request, {
        params: Promise.resolve({ id: 'ped-101' }),
      });

      assert.equal(response.status, 400);
    });

    it('deve rejeitar status desconhecido no enum', async () => {
      const request = new Request('http://localhost:3000/api/pedidos/ped-101', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'STATUS_INEXISTENTE' }),
      });

      const response = await patchPedido(request, {
        params: Promise.resolve({ id: 'ped-101' }),
      });

      assert.equal(response.status, 400);
    });
  });

  describe('GET /api/clientes', () => {
    it('deve listar catálogo de parceiros com tipos e contatos', async () => {
      const request = new Request('http://localhost:3000/api/clientes');
      const response = await getClientes(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(Array.isArray(data.dados));
      assert.ok(data.dados.length >= 6);

      const primeiro = data.dados[0];
      assert.ok(primeiro.id);
      assert.ok(primeiro.nome);
      assert.ok(primeiro.tipo);
    });

    it('deve filtrar clientes por tipo (FORNECEDOR)', async () => {
      const request = new Request('http://localhost:3000/api/clientes?tipo=FORNECEDOR');
      const response = await getClientes(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(data.dados.length > 0);
      assert.ok(data.dados.every((c: any) => c.tipo === 'FORNECEDOR'));
    });

    it('deve filtrar clientes por busca textual no nome', async () => {
      const request = new Request('http://localhost:3000/api/clientes?busca=Horizonte');
      const response = await getClientes(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.dados.length, 1);
      assert.equal(data.dados[0].nome, 'Metalúrgica Horizonte');
    });
  });

  describe('POST /api/clientes', () => {
    it('deve validar e rejeitar criação de parceiro com nome muito curto', async () => {
      const request = new Request('http://localhost:3000/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: 'A',
          tipo: 'CLIENTE',
        }),
      });

      const response = await postClientes(request);
      assert.equal(response.status, 400);
    });

    it('deve rejeitar criação por usuário sem permissão operacional', async () => {
      setIdentityAuthenticator(async () => mockRequisitanteIdentity);

      const request = new Request('http://localhost:3000/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: 'Novo Fornecedor Valido',
          tipo: 'FORNECEDOR',
        }),
      });

      const response = await postClientes(request);
      assert.equal(response.status, 403);
    });
  });

  after(() => {
    desinstalarFirestoreDeTeste();
  });
});
