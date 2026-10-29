import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEstoqueRepository } from '@/core/storage/memory-estoque.adapter';
import { MemoryAuditoriaRepository } from '@/core/services/auditoria.service';
import {
  setAuditoriaRepository,
  setEstoqueRepository,
  setIdentityAuthenticator,
} from '../api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import { GET as getItens, POST as postItens } from '../itens/route';
import { GET as getItemById, PATCH as patchItemById } from '../itens/[id]/route';
import { GET as getItemByCodigo } from '../itens/codigo/[codigo]/route';

// Mocks de Identidade para RBAC
const mockAdminIdentity: AuthenticatedIdentity = {
  token: { uid: 'user-admin', role: 'admin' } as any,
  user: {
    id: 'user-admin',
    name: 'Administrador Almoxarifado',
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
    name: 'João Requisitante',
    email: 'joao@empresa.com',
    role: 'requisitante',
    ativo: true,
    mustChangePassword: false,
  },
};

describe('Fase 2 — Rotas de API do Catálogo de Itens (/api/itens)', () => {
  let memoryRepo: MemoryEstoqueRepository;

  beforeEach(async () => {
    memoryRepo = new MemoryEstoqueRepository();
    setEstoqueRepository(memoryRepo);
    setAuditoriaRepository(new MemoryAuditoriaRepository());
    setIdentityAuthenticator(async () => mockAdminIdentity);


    // Cadastra itens de teste com os enums oficiais do domínio
    await memoryRepo.salvarItem({
      id: 'item-1',
      codigo: '90-1105',
      descricao: 'Disco Flap 4.1/2 Grão 60',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'UNIDADE',
      estoqueSeguranca: 10,
      estoqueAtual: 25,
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await memoryRepo.salvarItem({
      id: 'item-2',
      codigo: '10-3812',
      descricao: 'Tubo de Aço Carbono 2 Pol',
      tipo: 'PRODUTIVO_MATERIA_PRIMA',
      unidade: 'METRO',
      estoqueSeguranca: 5,
      estoqueAtual: 3, // Estoque Baixo (3 <= 5)
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('GET /api/itens', () => {
    it('deve listar itens cadastrados com sucesso', async () => {
      const request = new Request('http://localhost:3000/api/itens');
      const response = await getItens(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.total, 2);
      assert.equal(data.itens.length, 2);
    });

    it('deve filtrar itens por busca textual e tipo', async () => {
      const request = new Request(
        'http://localhost:3000/api/itens?busca=Flap&tipo=IMPRODUTIVO_CONSUMIVEL'
      );
      const response = await getItens(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.total, 1);
      assert.equal(data.itens[0].codigo, '90-1105');
    });

    it('deve filtrar itens por statusEstoque (ex: ESTOQUE_BAIXO)', async () => {
      const request = new Request('http://localhost:3000/api/itens?statusEstoque=ESTOQUE_BAIXO');
      const response = await getItens(request);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.total, 1);
      assert.equal(data.itens[0].codigo, '10-3812');
    });
  });

  describe('POST /api/itens', () => {
    it('deve criar um novo item com sucesso quando usuário for admin', async () => {
      const request = new Request('http://localhost:3000/api/itens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: '100-0501',
          descricao: 'Eixo Usinado CNC 50mm',
          tipo: 'ACABADO',
          unidade: 'PECA',
          estoqueSeguranca: 5,
          estoqueInicial: 12,
        }),
      });

      const response = await postItens(request);
      assert.equal(response.status, 201);
      const criado = await response.json();

      assert.equal(criado.codigo, '100-0501');
      assert.equal(criado.estoqueAtual, 12);
      assert.ok(criado.id);

      // Verificar persistência no repositório
      const noBanco = await memoryRepo.buscarPorCodigo('100-0501');
      assert.ok(noBanco);
      assert.equal(noBanco.estoqueAtual, 12);

      // Verificar registro da movimentação inaugural de abertura no extrato
      const extrato = await memoryRepo.consultarExtratoItem(noBanco.id);
      assert.equal(extrato.length, 1);
      assert.equal(extrato[0].tipo, 'AJUSTE_INVENTARIO_POSITIVO');
      assert.equal(extrato[0].quantidade, 12);
      assert.equal(extrato[0].saldoResultante, 12);
      assert.ok(extrato[0].observacao?.includes('implantação'));
    });

    it('deve impedir criação de item por usuário requisitante (403 Forbidden)', async () => {
      setIdentityAuthenticator(async () => mockRequisitanteIdentity);

      const request = new Request('http://localhost:3000/api/itens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: '90-2020',
          descricao: 'EPI Óculos de Proteção',
          tipo: 'IMPRODUTIVO_CONSUMIVEL',
          unidade: 'UNIDADE',
        }),
      });

      const response = await postItens(request);
      assert.equal(response.status, 403);
      const data = await response.json();
      assert.ok(data.error.includes('Permissão insuficiente'));
    });

    it('deve rejeitar cadastro com código já existente (409 Conflict)', async () => {
      const request = new Request('http://localhost:3000/api/itens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: '90-1105', // Já existe no repositório
          descricao: 'Outro Disco Flap',
          tipo: 'IMPRODUTIVO_CONSUMIVEL',
          unidade: 'UNIDADE',
        }),
      });

      const response = await postItens(request);
      assert.equal(response.status, 409);
      const data = await response.json();
      assert.ok(data.error.includes('Já existe um item cadastrado com o código'));
    });

    it('deve rejeitar payload inválido (400 Bad Request)', async () => {
      const request = new Request('http://localhost:3000/api/itens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: 'CODIGO-FORA-DO-PADRAO',
          descricao: 'AB', // curto demais
        }),
      });

      const response = await postItens(request);
      assert.equal(response.status, 400);
      const data = await response.json();
      assert.equal(data.error, 'Dados inválidos.');
      assert.ok(data.details.length >= 1);
    });
  });

  describe('GET /api/itens/[id]', () => {
    it('deve retornar detalhes do item por ID', async () => {
      const request = new Request('http://localhost:3000/api/itens/item-1');
      const response = await getItemById(request, {
        params: Promise.resolve({ id: 'item-1' }),
      });

      assert.equal(response.status, 200);
      const item = await response.json();
      assert.equal(item.id, 'item-1');
      assert.equal(item.codigo, '90-1105');
    });

    it('deve retornar 404 quando o item não for encontrado', async () => {
      const request = new Request('http://localhost:3000/api/itens/item-fantasma');
      const response = await getItemById(request, {
        params: Promise.resolve({ id: 'item-fantasma' }),
      });

      assert.equal(response.status, 404);
      const data = await response.json();
      assert.ok(data.error.includes('item-fantasma'));
    });
  });

  describe('PATCH /api/itens/[id]', () => {
    it('deve atualizar campos cadastrais mantendo o saldo original inalterado', async () => {
      const request = new Request('http://localhost:3000/api/itens/item-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: 'Disco Flap 4.1/2 Grão 80 Atualizado',
          localizacaoFisica: 'Prateleira B3',
          estoqueSeguranca: 15,
          estoqueInicial: 999, // Deve ser ignorado, não pode mudar estoqueAtual
        }),
      });

      const response = await patchItemById(request, {
        params: Promise.resolve({ id: 'item-1' }),
      });

      assert.equal(response.status, 200);
      const atualizado = await response.json();
      assert.equal(atualizado.descricao, 'Disco Flap 4.1/2 Grão 80 Atualizado');
      assert.equal(atualizado.localizacaoFisica, 'Prateleira B3');
      assert.equal(atualizado.estoqueSeguranca, 15);
      // O saldo original era 25 e deve continuar 25
      assert.equal(atualizado.estoqueAtual, 25);
    });

    it('deve rejeitar atualização com código duplicado de outro item (409 Conflict)', async () => {
      const request = new Request('http://localhost:3000/api/itens/item-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: '10-3812', // Código que já pertence ao item-2
        }),
      });

      const response = await patchItemById(request, {
        params: Promise.resolve({ id: 'item-1' }),
      });

      assert.equal(response.status, 409);
      const data = await response.json();
      assert.ok(data.error.includes('Já existe outro item'));
    });

    it('deve retornar 403 Forbidden se usuário não tiver permissão catalog:manage', async () => {
      setIdentityAuthenticator(async () => mockRequisitanteIdentity);

      const request = new Request('http://localhost:3000/api/itens/item-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: 'Tentativa Requisitante' }),
      });

      const response = await patchItemById(request, {
        params: Promise.resolve({ id: 'item-1' }),
      });

      assert.equal(response.status, 403);
    });
  });

  describe('GET /api/itens/codigo/[codigo]', () => {
    it('deve buscar item por código formatado', async () => {
      const request = new Request('http://localhost:3000/api/itens/codigo/90-1105');
      const response = await getItemByCodigo(request, {
        params: Promise.resolve({ codigo: '90-1105' }),
      });

      assert.equal(response.status, 200);
      const item = await response.json();
      assert.equal(item.codigo, '90-1105');
      assert.equal(item.id, 'item-1');
    });

    it('deve retornar 404 para código inexistente', async () => {
      const request = new Request('http://localhost:3000/api/itens/codigo/90-9999');
      const response = await getItemByCodigo(request, {
        params: Promise.resolve({ codigo: '90-9999' }),
      });

      assert.equal(response.status, 404);
    });
  });
});
