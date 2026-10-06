import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEstoqueRepository } from '@/core/storage/memory-estoque.adapter';
import {
  setEstoqueRepository,
  setIdentityAuthenticator,
} from '../api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import { POST as postBaixaLote } from '../movimentacoes/baixa-lote/route';
import { POST as postEntrada } from '../movimentacoes/entrada/route';
import { POST as postBaixaInterna } from '../movimentacoes/baixa-interna/route';
import { POST as postExpedicao } from '../movimentacoes/expedicao/route';
import { POST as postAjuste } from '../movimentacoes/ajuste/route';
import { GET as getExtrato } from '../movimentacoes/extrato/[itemId]/route';
import { GET as getMovimentacoes } from '../movimentacoes/route';

// Mocks de Identidade para RBAC
const mockOperadorIdentity: AuthenticatedIdentity = {
  token: { uid: 'user-op', role: 'operador' } as any,
  user: {
    id: 'user-op',
    name: 'Almoxarife Operador',
    email: 'operador@empresa.com',
    role: 'operador',
    ativo: true,
    mustChangePassword: false,
  },
};

const mockRequisitanteIdentity: AuthenticatedIdentity = {
  token: { uid: 'user-req', role: 'requisitante' } as any,
  user: {
    id: 'user-req',
    name: 'Requisitante',
    email: 'req@empresa.com',
    role: 'requisitante',
    ativo: true,
    mustChangePassword: false,
  },
};

describe('Fase 4 — Rotas de API de Movimentações (/api/movimentacoes)', () => {
  let memoryRepo: MemoryEstoqueRepository;

  beforeEach(async () => {
    memoryRepo = new MemoryEstoqueRepository();
    setEstoqueRepository(memoryRepo);
    setIdentityAuthenticator(async () => mockOperadorIdentity);

    // Itens base
    await memoryRepo.salvarItem({
      id: 'item-flap',
      codigo: '90-1105',
      descricao: 'Disco Flap 4.1/2 Grão 60',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'UNIDADE',
      estoqueSeguranca: 10,
      estoqueAtual: 50,
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await memoryRepo.salvarItem({
      id: 'item-broca',
      codigo: '90-1120',
      descricao: 'Broca HSS 6mm',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'UNIDADE',
      estoqueSeguranca: 5,
      estoqueAtual: 4,
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await memoryRepo.salvarItem({
      id: 'item-peca',
      codigo: '100-0200',
      descricao: 'Estrutura Cadeira Soldada',
      tipo: 'ACABADO',
      unidade: 'PECA',
      estoqueSeguranca: 2,
      estoqueAtual: 10,
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Colaborador
    await memoryRepo.salvarColaborador({
      id: 'colab-1',
      matricula: '042',
      nome: 'Carlos Silva',
      funcao: 'Torneiro Mecânico',
      setor: 'FERRAMENTARIA',
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('POST /api/movimentacoes/baixa-lote', () => {
    it('deve realizar baixa em lote de múltiplos itens com sucesso (201 Created)', async () => {
      const request = new Request('http://localhost:3000/api/movimentacoes/baixa-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId: 'colab-1',
          itens: [
            { itemId: 'item-flap', quantidade: 5, observacao: 'Uso no turno 1' },
            { itemId: 'item-broca', quantidade: 2 },
          ],
        }),
      });

      const response = await postBaixaLote(request);
      assert.equal(response.status, 201);
      const movimentacoes = await response.json();
      assert.equal(movimentacoes.length, 2);

      // Checa novos saldos no banco
      const flap = await memoryRepo.buscarItemPorId('item-flap');
      assert.equal(flap?.estoqueAtual, 45); // 50 - 5

      const broca = await memoryRepo.buscarItemPorId('item-broca');
      assert.equal(broca?.estoqueAtual, 2); // 4 - 2
    });

    it('deve abortar lote INTEIRO e retornar 422 se qualquer item tiver estoque insuficiente', async () => {
      const request = new Request('http://localhost:3000/api/movimentacoes/baixa-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId: 'colab-1',
          itens: [
            { itemId: 'item-flap', quantidade: 5 },
            { itemId: 'item-broca', quantidade: 10 }, // Broca só tem 4 em estoque!
          ],
        }),
      });

      const response = await postBaixaLote(request);
      assert.equal(response.status, 422);
      const data = await response.json();
      assert.ok(data.error.includes('saldo insuficiente'));
      assert.equal(data.itensComProblema.length, 1);
      assert.equal(data.itensComProblema[0].codigo, '90-1120');

      // Nenhum saldo deve ter sido alterado
      const flap = await memoryRepo.buscarItemPorId('item-flap');
      assert.equal(flap?.estoqueAtual, 50);

      const broca = await memoryRepo.buscarItemPorId('item-broca');
      assert.equal(broca?.estoqueAtual, 4);
    });

    it('deve retornar 403 Forbidden se usuário não tiver permissão stock:operate', async () => {
      setIdentityAuthenticator(async () => mockRequisitanteIdentity);

      const request = new Request('http://localhost:3000/api/movimentacoes/baixa-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId: 'colab-1',
          itens: [{ itemId: 'item-flap', quantidade: 1 }],
        }),
      });

      const response = await postBaixaLote(request);
      assert.equal(response.status, 403);
    });
  });

  describe('POST /api/movimentacoes/entrada', () => {
    it('deve registrar entrada de compra e aumentar saldo (201 Created)', async () => {
      const request = new Request('http://localhost:3000/api/movimentacoes/entrada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'item-flap',
          tipo: 'ENTRADA_COMPRA',
          quantidade: 100,
          numeroNF: 'NF-12345',
          fornecedor: 'Abrasivos Brasil Ltda',
        }),
      });

      const response = await postEntrada(request);
      assert.equal(response.status, 201);
      const mov = await response.json();
      assert.equal(mov.saldoAnterior, 50);
      assert.equal(mov.saldoResultante, 150);

      const item = await memoryRepo.buscarItemPorId('item-flap');
      assert.equal(item?.estoqueAtual, 150);
    });
  });

  describe('POST /api/movimentacoes/baixa-interna', () => {
    it('deve registrar baixa avulsa para colaborador (201 Created)', async () => {
      const request = new Request('http://localhost:3000/api/movimentacoes/baixa-interna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'item-flap',
          colaboradorId: 'colab-1',
          quantidade: 3,
          observacao: 'Troca de disco gasta',
        }),
      });

      const response = await postBaixaInterna(request);
      assert.equal(response.status, 201);
      const mov = await response.json();
      assert.equal(mov.saldoAnterior, 50);
      assert.equal(mov.saldoResultante, 47);

      const item = await memoryRepo.buscarItemPorId('item-flap');
      assert.equal(item?.estoqueAtual, 47);
    });
  });

  describe('POST /api/movimentacoes/expedicao', () => {
    it('deve registrar expedição de produto acabado (201 Created)', async () => {
      const request = new Request('http://localhost:3000/api/movimentacoes/expedicao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'item-peca',
          quantidade: 4,
          clienteDestino: 'Cliente Automotivo SP',
          numeroNF: 'NF-9901',
        }),
      });

      const response = await postExpedicao(request);
      assert.equal(response.status, 201);
      const mov = await response.json();
      assert.equal(mov.saldoAnterior, 10);
      assert.equal(mov.saldoResultante, 6);

      const peca = await memoryRepo.buscarItemPorId('item-peca');
      assert.equal(peca?.estoqueAtual, 6);
    });
  });

  describe('POST /api/movimentacoes/ajuste', () => {
    it('deve registrar ajuste de inventário compensatório (201 Created)', async () => {
      const request = new Request('http://localhost:3000/api/movimentacoes/ajuste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'item-broca',
          tipo: 'AJUSTE_INVENTARIO_POSITIVO',
          quantidade: 2,
          motivo: 'Contagem física identificou brocas a mais no fundo da gaveta',
        }),
      });

      const response = await postAjuste(request);
      assert.equal(response.status, 201);
      const mov = await response.json();
      assert.equal(mov.saldoAnterior, 4);
      assert.equal(mov.saldoResultante, 6);

      const item = await memoryRepo.buscarItemPorId('item-broca');
      assert.equal(item?.estoqueAtual, 6);
    });
  });

  describe('GET /api/movimentacoes/extrato/[itemId]', () => {
    it('deve consultar extrato ordenado do item', async () => {
      // Registra uma entrada prévia
      await memoryRepo.registrarMovimentacao({
        id: 'mov-1',
        itemId: 'item-flap',
        tipo: 'ENTRADA_COMPRA',
        quantidade: 20,
        saldoAnterior: 30,
        saldoResultante: 50,
        dataMovimentacao: new Date().toISOString(),
      });

      const request = new Request('http://localhost:3000/api/movimentacoes/extrato/item-flap');
      const response = await getExtrato(request, {
        params: Promise.resolve({ itemId: 'item-flap' }),
      });

      assert.equal(response.status, 200);
      const extrato = await response.json();
      assert.equal(extrato.length, 1);
      assert.equal(extrato[0].itemId, 'item-flap');
    });
  });

  describe('GET /api/movimentacoes', () => {
    it('deve listar movimentações com suporte a filtros e paginação', async () => {
      await memoryRepo.registrarMovimentacao({
        id: 'mov-global',
        itemId: 'item-flap',
        tipo: 'ENTRADA_COMPRA',
        quantidade: 10,
        saldoAnterior: 40,
        saldoResultante: 50,
        dataMovimentacao: new Date().toISOString(),
      });

      const request = new Request('http://localhost:3000/api/movimentacoes?limite=10');
      const response = await getMovimentacoes(request);

      assert.equal(response.status, 200);
      const resultado = await response.json();
      assert.equal(resultado.total, 1);
      assert.equal(resultado.movimentacoes.length, 1);
    });
  });
});
