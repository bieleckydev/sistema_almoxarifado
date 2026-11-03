import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setIdentityAuthenticator } from '../api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import { instalarFirestoreDeTeste, desinstalarFirestoreDeTeste } from './firestore-fixture';
import { GET as getRequisicoes } from '../requisicoes/route';

const admin: AuthenticatedIdentity = {
  token: { uid: 'user-admin', role: 'admin' } as any,
  user: {
    id: 'user-admin',
    name: 'Admin',
    email: 'admin@empresa.com',
    role: 'admin',
    ativo: true,
    mustChangePassword: false,
  },
};

function requisicao(id: string, status: string, createdAt: string) {
  return {
    id,
    numero: 1,
    requisitanteId: 'u1',
    requisitanteNome: 'Fulano',
    setor: 'MONTAGEM',
    prioridade: 'NORMAL',
    status,
    itens: [{ itemId: 'item-1', quantidade: 1 }],
    createdAt,
  };
}

describe('GET /api/requisicoes — janela de histórico', () => {
  beforeEach(() => {
    setIdentityAuthenticator(async () => admin);
    const db = instalarFirestoreDeTeste();
    const recente = new Date().toISOString();
    db.seed('requisicoes', [
      requisicao('req-entregue-antiga', 'ENTREGUE', '2024-01-01T10:00:00.000Z'),
      requisicao('req-pendente-antiga', 'PENDENTE', '2024-01-01T10:00:00.000Z'),
      requisicao('req-entregue-recente', 'ENTREGUE', recente),
    ]);
  });

  after(() => desinstalarFirestoreDeTeste());

  it('lista abertas sempre e concluídas só dentro da janela', async () => {
    const data = await (await getRequisicoes(new Request('http://localhost/api/requisicoes'))).json();
    const ids = data.dados.map((r: any) => r.id);
    assert.ok(ids.includes('req-pendente-antiga'));
    assert.ok(ids.includes('req-entregue-recente'));
    assert.ok(!ids.includes('req-entregue-antiga'));
    assert.equal(data.pendentes, 1);
    assert.equal(data.historicoCompleto, false);
  });

  it('historico=completo inclui concluídas antigas', async () => {
    const data = await (
      await getRequisicoes(new Request('http://localhost/api/requisicoes?historico=completo'))
    ).json();
    assert.equal(data.total, 3);
    assert.equal(data.historicoCompleto, true);
  });
});
