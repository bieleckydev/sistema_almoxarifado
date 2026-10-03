import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NFeReconciliationService } from '../nfe-reconciliation.service';
import { NotaFiscal, PedidoCompra } from '../../domain/nfe.schema';

describe('4.2 — Algoritmo Puro de Reconciliação (NFeReconciliationService)', () => {
  const service = new NFeReconciliationService();

  const pedidoValido: PedidoCompra = {
    id: 'pc-1',
    numeroPedido: 'PED-2026-001',
    cnpjFornecedor: '12.345.678/0001-90',
    razaoSocialFornecedor: 'Aço & Metais Indústria LTDA',
    dataAutorizacao: '2026-01-10T08:00:00.000Z',
    statusPedido: 'PENDENTE',
    valorTotalPedido: 15000,
    itens: [
      {
        id: 'pci-1',
        numeroItem: 1,
        codigoInternoRhowert: '10-001',
        descricao: 'TUBO INDUSTRIAL REDONDO 2 POL',
        unidade: 'KG',
        quantidadeAutorizada: 1000,
        quantidadeJaEntregue: 0,
        valorUnitarioContratado: 10.0,
        valorTotalContratado: 10000,
        toleranciaPercentual: 5, // aceita até 1050 KG
      },
      {
        id: 'pci-2',
        numeroItem: 2,
        codigoInternoRhowert: '90-0001',
        descricao: 'DISCO DE CORTE FINO 4.1/2',
        unidade: 'UNIDADE',
        quantidadeAutorizada: 500,
        quantidadeJaEntregue: 0,
        valorUnitarioContratado: 10.0,
        valorTotalContratado: 5000,
        toleranciaPercentual: 0, // sem tolerância para unidades
      },
    ],
  };

  it('deve aprovar com APROVADA_TOTAL quando itens e preços batem perfeitamente', () => {
    const notaFiscal: NotaFiscal = {
      id: 'nf-1',
      chaveAcesso: '35260112345678000190550010000012341234567890',
      numero: '1234',
      serie: '1',
      cnpjFornecedor: '12.345.678/0001-90',
      razaoSocialFornecedor: 'Aço & Metais Indústria LTDA',
      dataEmissao: '2026-01-12T10:00:00.000Z',
      dataRecebimento: '2026-01-12T14:00:00.000Z',
      valorTotalNota: 15000,
      status: 'RECEBIDA',
      itens: [
        {
          id: 'nfi-1',
          numeroItem: 1,
          codigoFornecedor: 'FORN-TUBO-01',
          codigoInternoRhowert: '10-001',
          descricao: 'TUBO INDUSTRIAL REDONDO 2 POL',
          unidadeComercial: 'KG',
          quantidadeFaturada: 1000,
          valorUnitario: 10.0,
          valorTotal: 10000,
          statusConciliacao: 'PENDENTE',
        },
        {
          id: 'nfi-2',
          numeroItem: 2,
          codigoFornecedor: 'FORN-DISCO-02',
          codigoInternoRhowert: '90-0001',
          descricao: 'DISCO DE CORTE FINO 4.1/2',
          unidadeComercial: 'UN',
          quantidadeFaturada: 500,
          valorUnitario: 10.0,
          valorTotal: 5000,
          statusConciliacao: 'PENDENTE',
        },
      ],
    };

    const resultado = service.reconciliar(notaFiscal, pedidoValido);

    assert.equal(resultado.statusGeral, 'APROVADA_TOTAL');
    assert.equal(resultado.statusConferenciaSugerido, 'APROVADA');
    assert.equal(resultado.totalItensNota, 2);
    assert.equal(resultado.totalItensConciliados, 2);
    assert.equal(resultado.totalItensDivergentes, 0);
    assert.equal(resultado.totalItensNaoConstantesNoPedido, 0);
    assert.equal(resultado.itens[0].statusConciliacao, 'CONCILIADO');
    assert.equal(resultado.itens[1].statusConciliacao, 'CONCILIADO');
    assert.equal(resultado.notaFiscalAtualizada.status, 'APROVADA');
  });

  it('deve aprovar variação de peso dentro da tolerância contratual (ex: tubos de aço)', () => {
    const notaFiscal: NotaFiscal = {
      id: 'nf-2',
      chaveAcesso: '35260112345678000190550010000012351234567890',
      numero: '1235',
      serie: '1',
      cnpjFornecedor: '12.345.678/0001-90',
      razaoSocialFornecedor: 'Aço & Metais Indústria LTDA',
      dataEmissao: '2026-01-12T10:00:00.000Z',
      dataRecebimento: '2026-01-12T14:00:00.000Z',
      valorTotalNota: 10450,
      status: 'RECEBIDA',
      itens: [
        {
          id: 'nfi-1',
          numeroItem: 1,
          codigoFornecedor: 'FORN-TUBO-01',
          codigoInternoRhowert: '10-001',
          descricao: 'TUBO INDUSTRIAL REDONDO 2 POL',
          unidadeComercial: 'KG',
          quantidadeFaturada: 1045, // 4.5% a mais (dentro dos 5% de tolerância)
          valorUnitario: 10.0,
          valorTotal: 10450,
          statusConciliacao: 'PENDENTE',
        },
      ],
    };

    const resultado = service.reconciliar(notaFiscal, pedidoValido);

    assert.equal(resultado.statusGeral, 'APROVADA_TOTAL');
    assert.equal(resultado.itens[0].statusConciliacao, 'CONCILIADO');
    assert.equal(resultado.itens[0].aprovado, true);
    assert.equal(resultado.itens[0].divergenciaQuantidade, 45); // 45 kg a mais
  });

  it('deve apontar divergência e rejeitar se quantidade exceder a tolerância contratual', () => {
    const notaFiscal: NotaFiscal = {
      id: 'nf-3',
      chaveAcesso: '35260112345678000190550010000012361234567890',
      numero: '1236',
      serie: '1',
      cnpjFornecedor: '12.345.678/0001-90',
      razaoSocialFornecedor: 'Aço & Metais Indústria LTDA',
      dataEmissao: '2026-01-12T10:00:00.000Z',
      dataRecebimento: '2026-01-12T14:00:00.000Z',
      valorTotalNota: 11000,
      status: 'RECEBIDA',
      itens: [
        {
          id: 'nfi-1',
          numeroItem: 1,
          codigoFornecedor: 'FORN-TUBO-01',
          codigoInternoRhowert: '10-001',
          descricao: 'TUBO INDUSTRIAL REDONDO 2 POL',
          unidadeComercial: 'KG',
          quantidadeFaturada: 1100, // 10% a mais (excede os 5% de tolerância contratual)
          valorUnitario: 10.0,
          valorTotal: 11000,
          statusConciliacao: 'PENDENTE',
        },
      ],
    };

    const resultado = service.reconciliar(notaFiscal, pedidoValido, {
      permitirAprovacaoComDivergenciaMenor: false,
    });

    assert.equal(resultado.statusGeral, 'REJEITADA');
    assert.equal(resultado.statusConferenciaSugerido, 'DIVERGENTE');
    assert.equal(resultado.itens[0].statusConciliacao, 'DIVERGENCIA_QUANTIDADE');
    assert.equal(resultado.itens[0].aprovado, false);
    assert.ok(resultado.itens[0].inconsistencias.length > 0);
  });

  it('deve detectar superfaturamento e divergência de preço unitário', () => {
    const notaFiscal: NotaFiscal = {
      id: 'nf-4',
      chaveAcesso: '35260112345678000190550010000012371234567890',
      numero: '1237',
      serie: '1',
      cnpjFornecedor: '12.345.678/0001-90',
      razaoSocialFornecedor: 'Aço & Metais Indústria LTDA',
      dataEmissao: '2026-01-12T10:00:00.000Z',
      dataRecebimento: '2026-01-12T14:00:00.000Z',
      valorTotalNota: 6500,
      status: 'RECEBIDA',
      itens: [
        {
          id: 'nfi-1',
          numeroItem: 1,
          codigoFornecedor: 'FORN-DISCO-02',
          codigoInternoRhowert: '90-0001',
          descricao: 'DISCO DE CORTE FINO 4.1/2',
          unidadeComercial: 'UN',
          quantidadeFaturada: 500,
          valorUnitario: 13.0, // Contratado era R$ 10,00
          valorTotal: 6500,
          statusConciliacao: 'PENDENTE',
        },
      ],
    };

    const resultado = service.reconciliar(notaFiscal, pedidoValido);

    assert.equal(resultado.statusGeral, 'APROVADA_COM_DIVERGENCIA');
    assert.equal(resultado.itens[0].statusConciliacao, 'DIVERGENCIA_VALOR');
    assert.equal(resultado.itens[0].divergenciaPrecoUnitario, 3.0);
    assert.equal(resultado.itens[0].aprovado, false);

    // Se permitida margem de 35% de tolerância de preço, deve aprovar
    const resultadoComTolerancia = service.reconciliar(notaFiscal, pedidoValido, {
      toleranciaPrecoPercentual: 35,
    });
    assert.equal(resultadoComTolerancia.itens[0].statusConciliacao, 'CONCILIADO');
    assert.equal(resultadoComTolerancia.statusGeral, 'APROVADA_TOTAL');
  });

  it('deve identificar e rejeitar se houver item que NÃO CONSTA no pedido de compra', () => {
    const notaFiscal: NotaFiscal = {
      id: 'nf-5',
      chaveAcesso: '35260112345678000190550010000012381234567890',
      numero: '1238',
      serie: '1',
      cnpjFornecedor: '12.345.678/0001-90',
      razaoSocialFornecedor: 'Aço & Metais Indústria LTDA',
      dataEmissao: '2026-01-12T10:00:00.000Z',
      dataRecebimento: '2026-01-12T14:00:00.000Z',
      valorTotalNota: 2000,
      status: 'RECEBIDA',
      itens: [
        {
          id: 'nfi-ext',
          numeroItem: 1,
          codigoFornecedor: 'PROD-DESCONHECIDO',
          descricao: 'GRAXA LUBRIFICANTE INDUSTRIAL',
          unidadeComercial: 'UN',
          quantidadeFaturada: 10,
          valorUnitario: 200,
          valorTotal: 2000,
          statusConciliacao: 'PENDENTE',
        },
      ],
    };

    const resultado = service.reconciliar(notaFiscal, pedidoValido);

    assert.equal(resultado.statusGeral, 'REJEITADA');
    assert.equal(resultado.totalItensNaoConstantesNoPedido, 1);
    assert.equal(resultado.itens[0].statusConciliacao, 'NAO_CONSTA_NO_PEDIDO');
    assert.equal(resultado.statusConferenciaSugerido, 'DIVERGENTE');
  });

  it('deve cruzar itens utilizando dicionário de mapeamento de código de fornecedor', () => {
    const notaFiscal: NotaFiscal = {
      id: 'nf-6',
      chaveAcesso: '35260112345678000190550010000012391234567890',
      numero: '1239',
      serie: '1',
      cnpjFornecedor: '12.345.678/0001-90',
      razaoSocialFornecedor: 'Aço & Metais Indústria LTDA',
      dataEmissao: '2026-01-12T10:00:00.000Z',
      dataRecebimento: '2026-01-12T14:00:00.000Z',
      valorTotalNota: 5000,
      status: 'RECEBIDA',
      itens: [
        {
          id: 'nfi-6',
          numeroItem: 1,
          codigoFornecedor: 'EXT-COD-DISCO-45', // Código próprio do fornecedor sem o código Rhowert na NFe
          descricao: 'DISCO CORTE 4.1/2',
          unidadeComercial: 'UN',
          quantidadeFaturada: 500,
          valorUnitario: 10.0,
          valorTotal: 5000,
          statusConciliacao: 'PENDENTE',
        },
      ],
    };

    const resultado = service.reconciliar(notaFiscal, pedidoValido, {
      mapeamentoFornecedor: {
        'EXT-COD-DISCO-45': '90-0001',
      },
    });

    assert.equal(resultado.statusGeral, 'APROVADA_TOTAL');
    assert.equal(resultado.itens[0].statusConciliacao, 'CONCILIADO');
    assert.equal(resultado.itens[0].itemPedidoCorrespondente?.id, 'pci-2');
    assert.equal(resultado.notaFiscalAtualizada.itens[0].codigoInternoRhowert, '90-0001');
  });

  it('deve apontar inconsistência caso o CNPJ da nota seja diferente do pedido', () => {
    const notaFiscal: NotaFiscal = {
      id: 'nf-7',
      chaveAcesso: '35260199999999000190550010000012401234567890',
      numero: '1240',
      serie: '1',
      cnpjFornecedor: '99.999.999/0001-99', // CNPJ divergente
      razaoSocialFornecedor: 'Outro Fornecedor LTDA',
      dataEmissao: '2026-01-12T10:00:00.000Z',
      dataRecebimento: '2026-01-12T14:00:00.000Z',
      valorTotalNota: 5000,
      status: 'RECEBIDA',
      itens: [
        {
          id: 'nfi-7',
          numeroItem: 1,
          codigoFornecedor: 'FORN-DISCO-02',
          codigoInternoRhowert: '90-0001',
          descricao: 'DISCO DE CORTE FINO 4.1/2',
          unidadeComercial: 'UN',
          quantidadeFaturada: 500,
          valorUnitario: 10.0,
          valorTotal: 5000,
          statusConciliacao: 'PENDENTE',
        },
      ],
    };

    const resultado = service.reconciliar(notaFiscal, pedidoValido);
    assert.ok(resultado.inconsistenciasGerais.some((msg) => msg.includes('CNPJ do emitente')));
  });
});
