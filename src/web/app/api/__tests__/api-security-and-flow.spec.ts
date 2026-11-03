import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEstoqueRepository } from '@/core/storage/memory-estoque.adapter';
import {
  setEstoqueRepository,
  setIdentityAuthenticator,
} from '../api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import { POST as postItem, GET as getItemList } from '../itens/route';
import { GET as getItemById } from '../itens/[id]/route';
import { POST as postColaborador } from '../colaboradores/route';
import { POST as postEntrada } from '../movimentacoes/entrada/route';
import { POST as postBaixaInterna } from '../movimentacoes/baixa-interna/route';
import { GET as getExtrato } from '../movimentacoes/extrato/[itemId]/route';
import { GET as getMovimentacoes } from '../movimentacoes/route';
import { POST as postChangePassword } from '../auth/change-password/route';
import { instalarFirestoreDeTeste } from './firestore-fixture';

// Mocks de Identidade RBAC
const adminUser: AuthenticatedIdentity = {
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

const operadorUser: AuthenticatedIdentity = {
  token: { uid: 'user-op', role: 'operador' } as any,
  user: {
    id: 'user-op',
    name: 'Almoxarife de Plantão',
    email: 'almoxarife@empresa.com',
    role: 'operador',
    ativo: true,
    mustChangePassword: false,
  },
};

const requisitanteUser: AuthenticatedIdentity = {
  token: { uid: 'user-req', role: 'requisitante' } as any,
  user: {
    id: 'user-req',
    name: 'Operador de Máquina',
    email: 'operador@empresa.com',
    role: 'requisitante',
    ativo: true,
    mustChangePassword: false,
  },
};

describe('Fase 5 — Validação Global de Segurança e Fluxo Completo de API (E2E)', () => {
  let memoryRepo: MemoryEstoqueRepository;

  beforeEach(() => {
    memoryRepo = new MemoryEstoqueRepository();
    setEstoqueRepository(memoryRepo);
  });

  describe('Segurança e Matriz RBAC', () => {
    it('deve rejeitar requisição sem autenticação ou com erro de identidade (401)', async () => {
      // Simula autenticador rejeitando por ausência de token válido
      setIdentityAuthenticator(async () => {
        const error = new Error('Token de autenticação ausente ou malformado.');
        (error as any).statusCode = 401;
        throw error;
      });

      const reqItens = new Request('http://localhost:3000/api/itens');
      const resItens = await getItemList(reqItens);
      assert.equal(resItens.status, 401);

      const reqMov = new Request('http://localhost:3000/api/movimentacoes');
      const resMov = await getMovimentacoes(reqMov);
      assert.equal(resMov.status, 401);
    });

    it('deve aplicar matriz de permissão: Operador pode movimentar estoque mas não pode gerenciar catálogo', async () => {
      setIdentityAuthenticator(async () => operadorUser);

      // 1. Tenta criar item no catálogo -> Deve ser bloqueado (403)
      const reqCriarItem = new Request('http://localhost:3000/api/itens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: '90-8888',
          descricao: 'Item Teste Operador',
          tipo: 'IMPRODUTIVO_CONSUMIVEL',
          unidade: 'UNIDADE',
        }),
      });
      const resCriarItem = await postItem(reqCriarItem);
      assert.equal(resCriarItem.status, 403);

      // 2. Tenta criar colaborador -> Deve ser bloqueado (403)
      const reqCriarColab = new Request('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: '123',
          nome: 'Novo Operador',
          funcao: 'Soldador',
          setor: 'SOLDA',
        }),
      });
      const resCriarColab = await postColaborador(reqCriarColab);
      assert.equal(resCriarColab.status, 403);
    });

    it('deve aplicar matriz de permissão: Requisitante não pode movimentar estoque', async () => {
      setIdentityAuthenticator(async () => requisitanteUser);

      const reqBaixa = new Request('http://localhost:3000/api/movimentacoes/baixa-interna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'item-1',
          quantidade: 1,
          colaboradorId: 'colab-1',
        }),
      });
      const resBaixa = await postBaixaInterna(reqBaixa);
      assert.equal(resBaixa.status, 403);
    });

    it('deve validar e efetivar a troca obrigatória de senha temporária (mustChangePassword)', async () => {
      const db = instalarFirestoreDeTeste();
      await db.collection('users').doc('user-op').set({
        id: 'user-op',
        name: 'Almoxarife de Plantão',
        email: 'almoxarife@empresa.com',
        role: 'operador',
        ativo: true,
        mustChangePassword: true,
      });

      setIdentityAuthenticator(async () => ({
        ...operadorUser,
        user: { ...operadorUser.user, mustChangePassword: true },
      }));

      // Senha fraca deve ser recusada com 400
      const resFraca = await postChangePassword(
        new Request('http://localhost:3000/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: '123' }),
        })
      );
      assert.equal(resFraca.status, 400);

      // Senha forte deve atualizar mustChangePassword=false e gerar log de auditoria
      const resForte = await postChangePassword(
        new Request('http://localhost:3000/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: 'NovaSenhaForte2026' }),
        })
      );
      assert.equal(resForte.status, 200);
      const body = await resForte.json();
      assert.equal(body.mustChangePassword, false);

      const userSnap = await db.collection('users').doc('user-op').get();
      assert.equal(userSnap.data()?.mustChangePassword, false);
    });
  });

  describe('Fluxo Completo de Negócio (E2E Flow)', () => {
    it('deve executar o ciclo completo: cadastro de item, colaborador, entrada e baixa rápida com auditoria', async () => {
      // 1. Admin cria material no catálogo
      setIdentityAuthenticator(async () => adminUser);

      const resItem = await postItem(
        new Request('http://localhost:3000/api/itens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: '90-5501',
            descricao: 'Eletrodo de Solda E7018 3.25mm',
            tipo: 'IMPRODUTIVO_CONSUMIVEL',
            unidade: 'KG',
            estoqueSeguranca: 20,
            estoqueInicial: 0,
          }),
        })
      );
      assert.equal(resItem.status, 201);
      const itemCriado = await resItem.json();
      assert.equal(itemCriado.codigo, '90-5501');
      assert.equal(itemCriado.estoqueAtual, 0);

      // 2. Admin cadastra o colaborador fabril
      const resColab = await postColaborador(
        new Request('http://localhost:3000/api/colaboradores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matricula: '77', // Normaliza para '077'
            nome: 'Severino da Silva',
            funcao: 'Soldador Montador',
            setor: 'SOLDA',
          }),
        })
      );
      assert.equal(resColab.status, 201);
      const colabCriado = await resColab.json();
      assert.equal(colabCriado.matricula, '077');

      // 3. Operador de Almoxarifado registra entrada por compra (NFe)
      setIdentityAuthenticator(async () => operadorUser);

      const resEntrada = await postEntrada(
        new Request('http://localhost:3000/api/movimentacoes/entrada', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: itemCriado.id,
            tipo: 'ENTRADA_COMPRA',
            quantidade: 50,
            numeroNF: 'NFE-88192',
            fornecedor: 'Belgo Bekaert Arames',
          }),
        })
      );
      assert.equal(resEntrada.status, 201);
      const movEntrada = await resEntrada.json();
      assert.equal(movEntrada.saldoAnterior, 0);
      assert.equal(movEntrada.saldoResultante, 50);

      // 4. Operador executa baixa interna para retirada do soldador
      const resBaixa = await postBaixaInterna(
        new Request('http://localhost:3000/api/movimentacoes/baixa-interna', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: itemCriado.id,
            quantidade: 15,
            colaboradorId: colabCriado.id,
            observacao: 'Turno da Manhã',
          }),
        })
      );
      assert.equal(resBaixa.status, 201);
      const movBaixa = await resBaixa.json();
      assert.equal(movBaixa.saldoAnterior, 50);
      assert.equal(movBaixa.saldoResultante, 35);
      assert.equal(movBaixa.colaboradorMatricula, '077');

      // 5. Consulta extrato histórico do item
      const resExtrato = await getExtrato(
        new Request(`http://localhost:3000/api/movimentacoes/extrato/${itemCriado.id}`),
        { params: Promise.resolve({ itemId: itemCriado.id }) }
      );
      assert.equal(resExtrato.status, 200);
      const extrato = await resExtrato.json();
      assert.equal(extrato.length, 2);
      const tipos = extrato.map((m: any) => m.tipo);
      assert.ok(tipos.includes('ENTRADA_COMPRA'));
      assert.ok(tipos.includes('SAIDA_CONSUMO_INTERNO'));

      // 6. Confere detalhes do item no catálogo: o saldo atual deve ser exatamente 35
      const resDetalhe = await getItemById(
        new Request(`http://localhost:3000/api/itens/${itemCriado.id}`),
        { params: Promise.resolve({ id: itemCriado.id }) }
      );
      assert.equal(resDetalhe.status, 200);
      const itemAtualizado = await resDetalhe.json();
      assert.equal(itemAtualizado.estoqueAtual, 35);
    });
  });
});
