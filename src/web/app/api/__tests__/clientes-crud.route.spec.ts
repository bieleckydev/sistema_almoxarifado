import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setIdentityAuthenticator, getAuditoriaService } from '../api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import type { FakeFirestore } from '@/server/testing/fake-firestore';
import { instalarFirestoreDeTeste, desinstalarFirestoreDeTeste } from './firestore-fixture';
import { GET as getClientes } from '../clientes/route';
import { GET as getCliente, PATCH as patchCliente } from '../clientes/[id]/route';
import { POST as postPedidos } from '../pedidos/route';

function identidade(role: 'admin' | 'operador' | 'requisitante'): AuthenticatedIdentity {
  return {
    token: { uid: `user-${role}`, role } as any,
    user: {
      id: `user-${role}`,
      name: `Usuário ${role}`,
      email: `${role}@empresa.com`,
      role,
      ativo: true,
      mustChangePassword: false,
    },
  };
}

function patch(id: string, body: unknown) {
  return patchCliente(
    new Request(`http://localhost:3000/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  );
}

describe('CRUD de clientes/parceiros (/api/clientes/[id])', () => {
  let db: FakeFirestore;

  beforeEach(() => {
    setIdentityAuthenticator(async () => identidade('admin'));
    db = instalarFirestoreDeTeste();
  });

  after(() => {
    desinstalarFirestoreDeTeste();
  });

  it('GET retorna o parceiro pelo ID', async () => {
    const res = await getCliente(new Request('http://localhost:3000/api/clientes/cli-1'), {
      params: Promise.resolve({ id: 'cli-1' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.id, 'cli-1');
    assert.equal(data.nome, 'Metalúrgica Horizonte');
  });

  it('GET retorna 404 para parceiro inexistente', async () => {
    const res = await getCliente(new Request('http://localhost:3000/api/clientes/nao-existe'), {
      params: Promise.resolve({ id: 'nao-existe' }),
    });
    assert.equal(res.status, 404);
  });

  it('PATCH altera só os campos enviados e registra auditoria', async () => {
    const res = await patch('cli-1', { telefone: '(11) 95555-0000', cidade: 'Osasco' });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.telefone, '(11) 95555-0000');
    assert.equal(data.cidade, 'Osasco');
    assert.equal(data.nome, 'Metalúrgica Horizonte');
    assert.equal(data.documento, '00.000.000/0001-01');
    assert.equal(data.ativo, true);

    const salvo = db.peek('clients', 'cli-1');
    assert.equal(salvo?.cidade, 'Osasco');
    assert.equal(salvo?.updatedBy, 'user-admin');

    const eventos = await getAuditoriaService().listar({});
    assert.ok(eventos.some((e: any) => e.acao === 'EDITAR_PARCEIRO' && e.entidadeId === 'cli-1'));
  });

  it('PATCH permite limpar um campo opcional', async () => {
    const res = await patch('cli-1', { contato: '' });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.contato, undefined);
  });

  it('PATCH preserva campos legados que não fazem parte do formulário', async () => {
    db.seed('clients', [{ id: 'cli-legado', nome: 'Legado Ltda', tipo: 'CLIENTE', email: 'x@y.com' }]);
    const res = await patch('cli-legado', { nome: 'Legado Comércio Ltda' });
    assert.equal(res.status, 200);
    assert.equal(db.peek('clients', 'cli-legado')?.email, 'x@y.com');
  });

  it('PATCH com ativo=false inativa o parceiro e o remove da listagem padrão', async () => {
    const res = await patch('cli-2', { ativo: false });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ativo, false);

    const ativos = await (await getClientes(new Request('http://localhost:3000/api/clientes'))).json();
    assert.ok(!ativos.dados.some((c: any) => c.id === 'cli-2'));

    const todos = await (
      await getClientes(new Request('http://localhost:3000/api/clientes?apenasAtivos=false'))
    ).json();
    assert.ok(todos.dados.some((c: any) => c.id === 'cli-2' && c.ativo === false));

    const eventos = await getAuditoriaService().listar({});
    assert.ok(eventos.some((e: any) => e.acao === 'INATIVAR_PARCEIRO' && e.entidadeId === 'cli-2'));
  });

  it('PATCH com ativo=true reativa o parceiro', async () => {
    await patch('cli-2', { ativo: false });
    const res = await patch('cli-2', { ativo: true });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ativo, true);
  });

  it('PATCH rejeita nome inválido', async () => {
    const res = await patch('cli-1', { nome: 'A' });
    assert.equal(res.status, 400);
  });

  it('PATCH rejeita corpo sem campos', async () => {
    const res = await patch('cli-1', {});
    assert.equal(res.status, 400);
  });

  it('PATCH retorna 404 para parceiro inexistente', async () => {
    const res = await patch('nao-existe', { nome: 'Qualquer Nome' });
    assert.equal(res.status, 404);
  });

  it('PATCH exige permissão de gestão de cadastro', async () => {
    setIdentityAuthenticator(async () => identidade('requisitante'));
    const res = await patch('cli-1', { ativo: false });
    assert.equal(res.status, 403);
    assert.equal(db.peek('clients', 'cli-1')?.ativo, true);
  });

  it('não permite lançar pedido para cliente inativo', async () => {
    await patch('cli-1', { ativo: false });
    const res = await postPedidos(
      new Request('http://localhost:3000/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: 'cli-1',
          prazoEntrega: '2026-12-01',
          itens: [{ itemId: 'item-1', quantidade: 1 }],
        }),
      })
    );
    assert.equal(res.status, 409);
  });
});
