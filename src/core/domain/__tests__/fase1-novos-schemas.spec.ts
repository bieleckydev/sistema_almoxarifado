import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ItemPedidoSchema,
  PedidoSchema,
  CreatePedidoSchema,
  calcularTotalPedido,
  isPedidoFaturado,
  isPedidoElegivelFaturamento,
} from '../pedido.schema';
import {
  TipoMovimentacaoTerceiroSchema,
  normalizarTipoMovTerceiro,
  MaterialTerceiroSchema,
  MovimentacaoTerceiroSchema,
  ReceberMaterialTerceiroSchema,
  ConsumirMaterialTerceiroSchema,
  DevolverMaterialTerceiroSchema,
  calcularSaldoTerceiro,
  calcularTotaisTerceiro,
  validarSaldoSuficienteTerceiro,
} from '../material-terceiro.schema';
import {
  TipoNotaFiscalEmitidaSchema,
  normalizarTipoNotaEmitida,
  NotaFiscalEmitidaSchema,
  FaturarPedidoInputSchema,
  RegistrarNotaFiscalEmitidaSchema,
  calcularTotalNotasEmitidas,
  calcularTotalPorTipo,
  formatarNumeroSerieNF,
} from '../nota-fiscal-emitida.schema';

describe('Fase 1 — Domínio: Pedidos com Precificação e Faturamento', () => {
  it('deve aceitar ItemPedido sem precoUnitario atribuindo default 0', () => {
    const item = ItemPedidoSchema.parse({
      itemId: 'item-1',
      quantidade: 10,
    });
    assert.equal(item.itemId, 'item-1');
    assert.equal(item.quantidade, 10);
    assert.equal(item.precoUnitario, 0);
  });

  it('deve aceitar ItemPedido com precoUnitario positivo e validar rejeição de negativo', () => {
    const item = ItemPedidoSchema.parse({
      itemId: 'item-1',
      quantidade: 5,
      precoUnitario: 450.5,
    });
    assert.equal(item.precoUnitario, 450.5);

    assert.throws(
      () =>
        ItemPedidoSchema.parse({
          itemId: 'item-1',
          quantidade: 5,
          precoUnitario: -10,
        }),
      /não pode ser negativo/
    );
  });

  it('deve validar Pedido completo com dados de faturamento', () => {
    const pedido = PedidoSchema.parse({
      id: 'ped-101',
      numeroSequencial: 101,
      clienteId: 'cli-1',
      prazoEntrega: '2026-10-25',
      status: 'SEPARADO',
      itens: [
        { itemId: 'item-1', quantidade: 2, precoUnitario: 100 },
        { itemId: 'item-2', quantidade: 3, precoUnitario: 50 },
      ],
      valorTotal: 350,
      faturamento: {
        numeroNFe: '1520',
        serie: '1',
        dataEmissao: '2026-10-25',
        dataVencimento: '2026-11-25',
        valorTotal: 350,
      },
    });

    assert.equal(pedido.numeroSequencial, 101);
    assert.equal(pedido.faturamento?.numeroNFe, '1520');
    assert.equal(pedido.faturamento?.serie, '1');
    assert.equal(pedido.valorTotal, 350);
  });

  it('deve calcular corretamente o valor total do pedido com calcularTotalPedido', () => {
    const itens = [
      { itemId: 'it-1', quantidade: 10, precoUnitario: 45 },
      { itemId: 'it-2', quantidade: 2, precoUnitario: 120.5 },
      { itemId: 'it-3', quantidade: 5 }, // precoUnitario default 0
    ];
    const total = calcularTotalPedido(itens);
    assert.equal(total, 10 * 45 + 2 * 120.5 + 0);
  });

  it('deve avaliar corretamente elegibilidade de faturamento com isPedidoElegivelFaturamento', () => {
    // Pendente não é elegível
    assert.equal(
      isPedidoElegivelFaturamento({ status: 'PENDENTE' }),
      false
    );

    // Separado sem faturamento é elegível
    assert.equal(
      isPedidoElegivelFaturamento({ status: 'SEPARADO' }),
      true
    );

    // Entregue sem faturamento é elegível
    assert.equal(
      isPedidoElegivelFaturamento({ status: 'ENTREGUE' }),
      true
    );

    // Entregue já faturado NÃO é elegível
    assert.equal(
      isPedidoElegivelFaturamento({
        status: 'ENTREGUE',
        faturamento: { numeroNFe: '999' },
      }),
      false
    );
  });

  it('deve identificar se o pedido já está faturado com isPedidoFaturado', () => {
    assert.equal(isPedidoFaturado({}), false);
    assert.equal(
      isPedidoFaturado({ faturamento: { numeroNFe: '100', serie: '1', dataEmissao: '2026-10-25' } }),
      true
    );
  });
});

describe('Fase 1 — Domínio: Material de Terceiros (Industrialização por Encomenda)', () => {
  it('deve normalizar tipos de movimentação de terceiros em diferentes formatos', () => {
    assert.equal(normalizarTipoMovTerceiro('entrada'), 'ENTRADA_REMESSA');
    assert.equal(normalizarTipoMovTerceiro('Entrada'), 'ENTRADA_REMESSA');
    assert.equal(normalizarTipoMovTerceiro('ENTRADA_REMESSA'), 'ENTRADA_REMESSA');
    assert.equal(normalizarTipoMovTerceiro('consumo'), 'CONSUMO_PRODUCAO');
    assert.equal(normalizarTipoMovTerceiro('devolucao'), 'DEVOLUCAO_RETORNO');
    assert.equal(normalizarTipoMovTerceiro('Devolução'), 'DEVOLUCAO_RETORNO');
  });

  it('deve instanciar MaterialTerceiro válido com valores padrão', () => {
    const mat = MaterialTerceiroSchema.parse({
      id: 'terc-1',
      clienteId: 'cli-metalurgica',
      descricao: 'Chapa de aço 2 mm (do cliente)',
      codigoSku: 'T-0001',
      saldoAtual: 50,
      numeroNFRemessa: '88123',
    });

    assert.equal(mat.descricao, 'Chapa de aço 2 mm (do cliente)');
    assert.equal(mat.unidade, 'un');
    assert.equal(mat.saldoAtual, 50);
  });

  it('deve validar criação de recebimento de material com ReceberMaterialTerceiroSchema', () => {
    const recebimento = ReceberMaterialTerceiroSchema.parse({
      clienteId: 'cli-1',
      descricao: 'Tubo 50 x 50 (do cliente)',
      codigoSku: 'T-0002',
      quantidade: 25,
      dataRecebimento: '2026-10-20',
      numeroNFRemessa: '90412',
    });

    assert.equal(recebimento.quantidade, 25);
    assert.equal(recebimento.responsavel, 'Recebimento');
    assert.equal(recebimento.unidade, 'un');
  });

  it('deve validar consumo na produção e devolução ao cliente', () => {
    const consumo = ConsumirMaterialTerceiroSchema.parse({
      materialTerceiroId: 'terc-1',
      quantidade: 10,
      dataMovimentacao: '2026-10-21',
      ordemProducaoOuDocumento: 'OF 321',
      responsavel: 'Produção',
    });
    assert.equal(consumo.ordemProducaoOuDocumento, 'OF 321');

    const devolucao = DevolverMaterialTerceiroSchema.parse({
      materialTerceiroId: 'terc-1',
      quantidade: 40,
      dataMovimentacao: '2026-10-22',
      numeroNFRetorno: '99001',
      valorServico: 1500.5,
      responsavel: 'Expedição',
    });
    assert.equal(devolucao.valorServico, 1500.5);
    assert.equal(devolucao.numeroNFRetorno, '99001');
  });

  it('deve calcular saldo e totais acumulados de terceiros corretamente', () => {
    const historico = [
      { tipo: 'ENTRADA_REMESSA' as const, quantidade: 100 },
      { tipo: 'CONSUMO_PRODUCAO' as const, quantidade: 30 },
      { tipo: 'DEVOLUCAO_RETORNO' as const, quantidade: 20 },
    ];

    const saldo = calcularSaldoTerceiro(historico);
    assert.equal(saldo, 50);

    const totais = calcularTotaisTerceiro(historico);
    assert.deepEqual(totais, {
      recebido: 100,
      consumido: 30,
      devolvido: 20,
      sucata: 0,
      saldo: 50,
    });

    // Teste com evento de sucata / perda (requisito 3.0)
    const historicoComSucata = [
      ...historico,
      { tipo: 'SUCATA_PERDA' as const, quantidade: 5 },
    ];
    assert.equal(calcularSaldoTerceiro(historicoComSucata), 45);
    assert.deepEqual(calcularTotaisTerceiro(historicoComSucata), {
      recebido: 100,
      consumido: 30,
      devolvido: 20,
      sucata: 5,
      saldo: 45,
    });

    assert.equal(validarSaldoSuficienteTerceiro(50, 40), true);
    assert.equal(validarSaldoSuficienteTerceiro(50, 60), false);
  });
});

describe('Fase 1 — Domínio: Notas Fiscais Emitidas (Faturamento)', () => {
  it('deve normalizar tipos de notas fiscais emitidas', () => {
    assert.equal(normalizarTipoNotaEmitida('venda'), 'VENDA');
    assert.equal(normalizarTipoNotaEmitida('RETORNO'), 'RETORNO_INDUSTRIALIZACAO');
    assert.equal(normalizarTipoNotaEmitida('retorno de industrialização'), 'RETORNO_INDUSTRIALIZACAO');
  });

  it('deve validar NotaFiscalEmitida de Venda com campos obrigatórios', () => {
    const nota = NotaFiscalEmitidaSchema.parse({
      id: 'nf-1520',
      numeroNF: '1520',
      serie: '1',
      dataEmissao: '2026-10-25',
      dataVencimento: '2026-11-25',
      tipo: 'VENDA',
      clienteId: 'cli-metalurgica',
      valorTotal: 280,
      referencia: 'Pedido #104',
      pedidoId: 'ped-104',
    });

    assert.equal(nota.numeroNF, '1520');
    assert.equal(nota.tipo, 'VENDA');
    assert.equal(nota.valorTotal, 280);
  });

  it('deve validar NotaFiscalEmitida de Retorno de Industrialização com referência ao material', () => {
    const nota = NotaFiscalEmitidaSchema.parse({
      id: 'nf-ret-9901',
      numeroNF: '9901',
      serie: '1',
      dataEmissao: '2026-10-25',
      tipo: 'RETORNO_INDUSTRIALIZACAO',
      clienteId: 'cli-1',
      valorTotal: 450,
      referencia: 'Chapa de aço 2 mm (do cliente)',
      materialTerceiroId: 'terc-1',
    });

    assert.equal(nota.tipo, 'RETORNO_INDUSTRIALIZACAO');
    assert.equal(nota.valorTotal, 450);
  });

  it('deve validar formulário de faturamento com FaturarPedidoInputSchema', () => {
    const input = FaturarPedidoInputSchema.parse({
      pedidoId: 'ped-101',
      numeroNF: '1521',
      serie: '1',
      dataEmissao: '2026-10-25',
      dataVencimento: '2026-11-25',
    });

    assert.equal(input.pedidoId, 'ped-101');
    assert.equal(input.numeroNF, '1521');
  });

  it('deve calcular totais gerais e por tipo com helpers puros', () => {
    const notas = [
      { tipo: 'VENDA' as const, valorTotal: 1000 },
      { tipo: 'VENDA' as const, valorTotal: 500 },
      { tipo: 'RETORNO_INDUSTRIALIZACAO' as const, valorTotal: 300 },
    ];

    assert.equal(calcularTotalNotasEmitidas(notas), 1800);
    assert.equal(calcularTotalPorTipo(notas, 'VENDA'), 1500);
    assert.equal(calcularTotalPorTipo(notas, 'RETORNO_INDUSTRIALIZACAO'), 300);
    assert.equal(formatarNumeroSerieNF('1520', '1'), 'NF 1520 / 1');
  });
});
