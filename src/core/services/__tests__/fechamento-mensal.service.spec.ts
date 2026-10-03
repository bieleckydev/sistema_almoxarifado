import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FechamentoMensalService } from '../fechamento-mensal.service';
import { MemoryEstoqueRepository } from '../../storage/memory-estoque.adapter';
import { MemoryFechamentoMensalRepository } from '../../storage/fechamento-mensal.repository.interface';
import { Item } from '../../domain/item.schema';
import { Movimentacao } from '../../domain/movimentacao.schema';

describe('3.3 — FechamentoMensalService (Consolidação Temporal e Transição de Saldos)', () => {
  let estoqueRepo: MemoryEstoqueRepository;
  let fechamentoRepo: MemoryFechamentoMensalRepository;
  let service: FechamentoMensalService;

  const itemTubo: Item = {
    id: 'item-tubo-1020',
    codigo: '10-3812',
    descricao: 'Tubo de Aço Carbono SAE 1020',
    tipo: 'PRODUTIVO_MATERIA_PRIMA',
    unidade: 'KG',
    estoqueSeguranca: 500,
    estoqueAtual: 1000,
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  beforeEach(async () => {
    estoqueRepo = new MemoryEstoqueRepository();
    fechamentoRepo = new MemoryFechamentoMensalRepository();
    service = new FechamentoMensalService(estoqueRepo, fechamentoRepo);

    await estoqueRepo.salvarItem(itemTubo);
  });

  it('deve consolidar o fechamento do primeiro mês (Janeiro/2026) calculando saldo final', async () => {
    // Movimentações de Janeiro/2026
    const movEntrada: Movimentacao = {
      id: 'mov-jan-1',
      itemId: 'item-tubo-1020',
      tipo: 'ENTRADA_COMPRA',
      quantidade: 500,
      saldoAnterior: 1000,
      saldoResultante: 1500,
      dataMovimentacao: '2026-01-15T10:00:00.000Z',
    };

    const movSaida: Movimentacao = {
      id: 'mov-jan-2',
      itemId: 'item-tubo-1020',
      tipo: 'SAIDA_CONSUMO_INTERNO',
      quantidade: 300,
      saldoAnterior: 1500,
      saldoResultante: 1200,
      dataMovimentacao: '2026-01-20T14:00:00.000Z',
    };

    await estoqueRepo.registrarMovimentacao(movEntrada);
    await estoqueRepo.registrarMovimentacao(movSaida);

    const fechamentoJan = await service.executarFechamento({
      ano: 2026,
      mes: 1,
      responsavelId: 'colab-almoxarife',
      observacoes: 'Fechamento do mês de Janeiro',
    });

    assert.equal(fechamentoJan.ano, 2026);
    assert.equal(fechamentoJan.mes, 1);
    assert.equal(fechamentoJan.status, 'FECHADO');

    const itemJan = fechamentoJan.itens.find((i) => i.itemId === 'item-tubo-1020');
    assert(itemJan !== undefined);
    assert.equal(itemJan?.saldoInicial, 1000);
    assert.equal(itemJan?.totalEntradas, 500);
    assert.equal(itemJan?.totalSaidas, 300);
    assert.equal(itemJan?.saldoFinal, 1200); // 1000 + 500 - 300 = 1200
  });

  it('deve transportar o saldoFinal de Janeiro como saldoInicial de Fevereiro automaticamente', async () => {
    // 1. Movimentações de Janeiro/2026
    await estoqueRepo.registrarMovimentacao({
      id: 'mov-1',
      itemId: 'item-tubo-1020',
      tipo: 'ENTRADA_COMPRA',
      quantidade: 500,
      saldoAnterior: 1000,
      saldoResultante: 1500,
      dataMovimentacao: '2026-01-10T10:00:00.000Z',
    });

    // Fechamento de Janeiro
    await service.executarFechamento({
      ano: 2026,
      mes: 1,
      responsavelId: 'colab-1',
    });

    // 2. Movimentações de Fevereiro/2026
    await estoqueRepo.registrarMovimentacao({
      id: 'mov-2',
      itemId: 'item-tubo-1020',
      tipo: 'SAIDA_CONSUMO_INTERNO',
      quantidade: 200,
      saldoAnterior: 1500,
      saldoResultante: 1300,
      dataMovimentacao: '2026-02-05T10:00:00.000Z',
    });

    await estoqueRepo.registrarMovimentacao({
      id: 'mov-3',
      itemId: 'item-tubo-1020',
      tipo: 'AJUSTE_INVENTARIO_POSITIVO',
      quantidade: 50,
      saldoAnterior: 1300,
      saldoResultante: 1350,
      dataMovimentacao: '2026-02-28T18:00:00.000Z',
    });

    // Fechamento de Fevereiro
    const fechamentoFev = await service.executarFechamento({
      ano: 2026,
      mes: 2,
      responsavelId: 'colab-1',
    });

    const itemFev = fechamentoFev.itens.find((i) => i.itemId === 'item-tubo-1020');
    assert(itemFev !== undefined);

    // O saldoInicial de Fevereiro DEVE ser 1500 (o saldoFinal de Janeiro)!
    assert.equal(itemFev?.saldoInicial, 1500);
    assert.equal(itemFev?.totalEntradas, 0);
    assert.equal(itemFev?.totalSaidas, 200);
    assert.equal(itemFev?.totalAjustes, 50);
    assert.equal(itemFev?.saldoFinal, 1350); // 1500 - 200 + 50 = 1350
  });

  it('deve listar fechamentos ordenados cronologicamente', async () => {
    await service.executarFechamento({ ano: 2026, mes: 2, responsavelId: 'c1' });
    await service.executarFechamento({ ano: 2026, mes: 1, responsavelId: 'c1' });

    const lista = await service.listarFechamentos(2026);
    assert.equal(lista.length, 2);
    assert.equal(lista[0].mes, 1);
    assert.equal(lista[1].mes, 2);
  });
});
