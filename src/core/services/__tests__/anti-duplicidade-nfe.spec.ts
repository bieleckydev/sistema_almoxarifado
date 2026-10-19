import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEstoqueRepository } from '@/core/storage/memory-estoque.adapter';
import {
  MovimentacaoService,
  NotaFiscalDuplicadaError,
} from '../movimentacao.service';
import {
  setEstoqueRepository,
  setIdentityAuthenticator,
} from '@/web/app/api/api-helpers';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import { POST as postEntrada } from '@/web/app/api/movimentacoes/entrada/route';

const mockAdminIdentity: AuthenticatedIdentity = {
  token: { uid: 'user-admin', role: 'admin' } as any,
  user: {
    id: 'user-admin',
    name: 'Operador de Entrada',
    email: 'admin@empresa.com',
    role: 'admin',
    ativo: true,
    mustChangePassword: false,
  },
};

describe('Fase 4 — Validações de Integridade: Anti-Duplicidade de NF-e nas Entradas', () => {
  let memoryRepo: MemoryEstoqueRepository;
  let service: MovimentacaoService;

  beforeEach(async () => {
    memoryRepo = new MemoryEstoqueRepository();
    service = new MovimentacaoService(memoryRepo);
    setEstoqueRepository(memoryRepo);
    setIdentityAuthenticator(async () => mockAdminIdentity);

    // Cadastra 2 itens para o teste
    await memoryRepo.salvarItem({
      id: 'item-disco',
      codigo: '90-1105',
      descricao: 'Disco de Corte 7x1/8',
      tipo: 'IMPRODUTIVO_CONSUMIVEL',
      unidade: 'UNIDADE',
      estoqueAtual: 10,
      estoqueSeguranca: 5,
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await memoryRepo.salvarItem({
      id: 'item-chapa',
      codigo: '10-3812',
      descricao: 'Chapa Fina Frio 1.5mm',
      tipo: 'PRODUTIVO_MATERIA_PRIMA',
      unidade: 'PECA',
      estoqueAtual: 20,
      estoqueSeguranca: 5,
      ativo: true,
      embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('deve registrar entrada de compra com NF-e e atualizar saldo físico', async () => {
    const mov = await service.executarEntrada({
      itemId: 'item-disco',
      tipo: 'ENTRADA_COMPRA',
      quantidade: 15,
      numeroNF: '10488',
      fornecedor: 'Aços Brasil',
    });

    assert.equal(mov.quantidade, 15);
    assert.equal(mov.saldoAnterior, 10);
    assert.equal(mov.saldoResultante, 25);
    assert.equal(mov.numeroNF, '10488');

    const itemAtualizado = await memoryRepo.buscarItemPorId('item-disco');
    assert.equal(itemAtualizado?.estoqueAtual, 25);
  });

  it('deve bloquear e lançar NotaFiscalDuplicadaError ao tentar lançar a mesma NF-e para o mesmo item', async () => {
    // 1ª Entrada: NF 55001
    await service.executarEntrada({
      itemId: 'item-disco',
      tipo: 'ENTRADA_COMPRA',
      quantidade: 5,
      numeroNF: '55001',
      fornecedor: 'Fornecedor A',
    });

    // 2ª Entrada com mesma NF e mesmo item: DEVE lançar erro e NÃO alterar o saldo
    await assert.rejects(
      async () => {
        await service.executarEntrada({
          itemId: 'item-disco',
          tipo: 'ENTRADA_COMPRA',
          quantidade: 5,
          numeroNF: '55001',
          fornecedor: 'Fornecedor A',
        });
      },
      (err: any) => {
        assert.ok(err instanceof NotaFiscalDuplicadaError);
        assert.equal(err.numeroNF, '55001');
        assert.match(err.message, /já foi lançada para este item/);
        return true;
      }
    );

    // O saldo deve permanecer em 15 (10 inicial + 5 da primeira entrada)
    const itemAposTentativa = await memoryRepo.buscarItemPorId('item-disco');
    assert.equal(itemAposTentativa?.estoqueAtual, 15);
  });

  it('deve permitir a mesma NF-e se os itens forem diferentes (múltiplos itens na mesma nota)', async () => {
    // NF 77002 no item-disco
    await service.executarEntrada({
      itemId: 'item-disco',
      tipo: 'ENTRADA_COMPRA',
      quantidade: 8,
      numeroNF: '77002',
    });

    // Mesma NF 77002 no item-chapa (deve aceitar com sucesso)
    const movChapa = await service.executarEntrada({
      itemId: 'item-chapa',
      tipo: 'ENTRADA_COMPRA',
      quantidade: 12,
      numeroNF: '77002',
    });

    assert.equal(movChapa.quantidade, 12);
    assert.equal(movChapa.numeroNF, '77002');

    const chapa = await memoryRepo.buscarItemPorId('item-chapa');
    assert.equal(chapa?.estoqueAtual, 32); // 20 + 12
  });

  it('deve retornar status HTTP 409 Conflict no endpoint /api/movimentacoes/entrada em tentativa de duplicidade', async () => {
    // 1ª Entrada via API
    const req1 = new Request('http://localhost:3000/api/movimentacoes/entrada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 'item-disco',
        tipo: 'ENTRADA_COMPRA',
        quantidade: 4,
        numeroNF: '99882',
      }),
    });
    const res1 = await postEntrada(req1);
    assert.equal(res1.status, 201);

    // 2ª Entrada via API com mesma NF
    const req2 = new Request('http://localhost:3000/api/movimentacoes/entrada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 'item-disco',
        tipo: 'ENTRADA_COMPRA',
        quantidade: 4,
        numeroNF: '99882',
      }),
    });
    const res2 = await postEntrada(req2);
    assert.equal(res2.status, 409);

    const bodyErro = await res2.json();
    assert.match(bodyErro.error, /já foi lançada para este item/);
    assert.equal(bodyErro.numeroNF, '99882');
  });
});
