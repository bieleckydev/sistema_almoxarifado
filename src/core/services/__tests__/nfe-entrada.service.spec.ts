import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NFeEntradaService, NotaFiscalJaEfetivadaError, NenhumItemElegivelParaEntradaError } from '../nfe-entrada.service';
import { MovimentacaoService } from '../movimentacao.service';
import { MemoryEstoqueRepository } from '../../storage/memory-estoque.adapter';
import { NotaFiscal } from '../../domain/nfe.schema';
import { Item } from '../../domain/item.schema';

describe('4.3 — Workflow de Efetivação de Entrada por NFe (NFeEntradaService)', () => {
  let repository: MemoryEstoqueRepository;
  let service: NFeEntradaService;
  let movimentacaoService: MovimentacaoService;

  const itemTubo: Item = {
    id: 'item-tubo-1',
    codigo: '10-001',
    descricao: 'TUBO INDUSTRIAL REDONDO 2 POL',
    tipo: 'PRODUTIVO_MATERIA_PRIMA',
    unidade: 'KG',
    estoqueAtual: 100,
    estoqueSeguranca: 50,
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  const itemDisco: Item = {
    id: 'item-disco-1',
    codigo: '90-0001',
    descricao: 'DISCO DE CORTE FINO 4.1/2',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    estoqueAtual: 50,
    estoqueSeguranca: 20,
    ativo: true,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  const itemInativo: Item = {
    id: 'item-inativo-1',
    codigo: '90-9999',
    descricao: 'DISCO OBSOLETO',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    estoqueAtual: 10,
    estoqueSeguranca: 5,
    ativo: false,
    embalagem: { possuiEmbalagem: false, fatorConversao: 1 },
  };

  beforeEach(async () => {
    repository = new MemoryEstoqueRepository();
    await repository.salvarItem(itemTubo);
    await repository.salvarItem(itemDisco);
    await repository.salvarItem(itemInativo);

    service = new NFeEntradaService(repository);
    movimentacaoService = new MovimentacaoService(repository);
  });

  const notaFiscalAprovada: NotaFiscal = {
    id: 'nf-100',
    chaveAcesso: '35260112345678000190550010000012341234567890',
    numero: '1234',
    serie: '1',
    cnpjFornecedor: '12.345.678/0001-90',
    razaoSocialFornecedor: 'Aço & Metais Indústria LTDA',
    dataEmissao: '2026-01-12T10:00:00.000Z',
    dataRecebimento: '2026-01-12T14:00:00.000Z',
    valorTotalNota: 15000,
    status: 'APROVADA',
    numeroPedidoCompra: 'PED-2026-001',
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
        statusConciliacao: 'CONCILIADO',
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
        statusConciliacao: 'CONCILIADO',
      },
    ],
  };

  it('deve efetivar entrada de todos os itens conciliados e atualizar saldos físicos', async () => {
    const resultado = await service.efetivarEntrada(notaFiscalAprovada);

    assert.equal(resultado.totalItensProcessados, 2);
    assert.equal(resultado.totalItensEfetivados, 2);
    assert.equal(resultado.totalItensIgnorados, 0);
    assert.equal(resultado.movimentacoesCriadas.length, 2);

    // Saldo do tubo: 100 anterior + 1000 creditado = 1100
    const tuboAtualizado = await repository.buscarItemPorId(itemTubo.id);
    assert.equal(tuboAtualizado?.estoqueAtual, 1100);

    // Saldo do disco: 50 anterior + 500 creditado = 550
    const discoAtualizado = await repository.buscarItemPorId(itemDisco.id);
    assert.equal(discoAtualizado?.estoqueAtual, 550);

    // Nota fiscal atualizada com status ARQUIVADA
    assert.equal(resultado.notaFiscalAtualizada.status, 'ARQUIVADA');

    // Movimentações no repositório
    const extratoTubo = await repository.consultarExtratoItem(itemTubo.id);
    assert.equal(extratoTubo.length, 1);
    assert.equal(extratoTubo[0].tipo, 'ENTRADA_COMPRA');
    assert.equal(extratoTubo[0].numeroNF, '1234');
    assert.equal(extratoTubo[0].documentoFiscalId, notaFiscalAprovada.chaveAcesso);
  });

  it('deve recalcular o custo unitário médio do produto com base no valor unitário faturado na NF-e', async () => {
    // Tubo inicial: 100 un a R$ 5,00
    await repository.salvarItem({
      ...itemTubo,
      estoqueAtual: 100,
      custoUnitario: 5.0,
    });

    // NF com 1000 un a R$ 10,00
    // Custo médio esperado: ((100 * 5) + (1000 * 10)) / 1100 = 10500 / 1100 = R$ 9,55
    await service.efetivarEntrada(notaFiscalAprovada);

    const tuboAtualizado = await repository.buscarItemPorId(itemTubo.id);
    assert.equal(tuboAtualizado?.estoqueAtual, 1100);
    assert.equal(tuboAtualizado?.custoUnitario, 9.55);
  });

  it('deve impedir efetivação de Nota Fiscal já arquivada', async () => {
    const notaArquivada: NotaFiscal = {
      ...notaFiscalAprovada,
      status: 'ARQUIVADA',
    };

    await assert.rejects(
      async () => service.efetivarEntrada(notaArquivada),
      NotaFiscalJaEfetivadaError
    );
  });

  it('deve ignorar itens que NAO_CONSTA_NO_PEDIDO e deixar status da nota como DIVERGENTE', async () => {
    const notaComItemEstranho: NotaFiscal = {
      ...notaFiscalAprovada,
      itens: [
        notaFiscalAprovada.itens[0],
        {
          id: 'nfi-estranho',
          numeroItem: 2,
          codigoFornecedor: 'FORN-EXTRA',
          descricao: 'PRODUTO NÃO CONTRATADO',
          unidadeComercial: 'UN',
          quantidadeFaturada: 10,
          valorUnitario: 100,
          valorTotal: 1000,
          statusConciliacao: 'NAO_CONSTA_NO_PEDIDO',
        },
      ],
    };

    const resultado = await service.efetivarEntrada(notaComItemEstranho);

    assert.equal(resultado.totalItensEfetivados, 1);
    assert.equal(resultado.totalItensIgnorados, 1);
    assert.equal(resultado.itensIgnorados[0].statusConciliacao, 'NAO_CONSTA_NO_PEDIDO');
    assert.equal(resultado.notaFiscalAtualizada.status, 'DIVERGENTE');

    // Apenas o tubo teve saldo alterado
    const tuboAtualizado = await repository.buscarItemPorId(itemTubo.id);
    assert.equal(tuboAtualizado?.estoqueAtual, 1100);
  });

  it('deve ignorar itens cujo código não esteja cadastrado no catálogo do almoxarifado', async () => {
    const notaComItemNaoCadastrado: NotaFiscal = {
      ...notaFiscalAprovada,
      itens: [
        {
          id: 'nfi-3',
          numeroItem: 1,
          codigoFornecedor: 'NOVO-PROD',
          codigoInternoRhowert: '90-9998', // Inexistente
          descricao: 'BROCA NÃO CADASTRADA',
          unidadeComercial: 'UN',
          quantidadeFaturada: 5,
          valorUnitario: 20,
          valorTotal: 100,
          statusConciliacao: 'CONCILIADO',
        },
      ],
    };

    await assert.rejects(
      async () => service.efetivarEntrada(notaComItemNaoCadastrado),
      NenhumItemElegivelParaEntradaError
    );
  });

  it('deve ignorar item se estiver inativo no catálogo do almoxarifado', async () => {
    const notaComItemInativo: NotaFiscal = {
      ...notaFiscalAprovada,
      itens: [
        notaFiscalAprovada.itens[0],
        {
          id: 'nfi-inativo',
          numeroItem: 2,
          codigoFornecedor: 'FORN-INAT',
          codigoInternoRhowert: '90-9999', // Inativo
          descricao: 'DISCO OBSOLETO',
          unidadeComercial: 'UN',
          quantidadeFaturada: 20,
          valorUnitario: 5,
          valorTotal: 100,
          statusConciliacao: 'CONCILIADO',
        },
      ],
    };

    const resultado = await service.efetivarEntrada(notaComItemInativo);

    assert.equal(resultado.totalItensEfetivados, 1);
    assert.equal(resultado.totalItensIgnorados, 1);
    assert.ok(resultado.itensIgnorados[0].motivo.includes('inativo'));
  });

  it('deve permitir efetivação delegada a partir de MovimentacaoService.efetivarEntradaNFe', async () => {
    const resultado = await movimentacaoService.efetivarEntradaNFe(notaFiscalAprovada);

    assert.equal(resultado.totalItensEfetivados, 2);
    assert.equal(resultado.notaFiscalAtualizada.status, 'ARQUIVADA');

    const tuboAtualizado = await repository.buscarItemPorId(itemTubo.id);
    assert.equal(tuboAtualizado?.estoqueAtual, 1100);
  });
});
