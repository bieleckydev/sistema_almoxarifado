import {
  NotaFiscal,
  ItemNotaFiscal,
  PedidoCompra,
  ItemPedidoCompra,
  StatusItemConciliacao,
} from '../domain/nfe.schema';
import { StatusConferenciaNFe } from '../domain/types';
import { normalizarCodigoItem } from '../utils/formatters';

/**
 * Status global do parecer da reconciliação entre NFe e Pedido de Compra.
 */
export type StatusReconciliacaoGeral =
  | 'APROVADA_TOTAL'
  | 'APROVADA_COM_DIVERGENCIA'
  | 'REJEITADA';

/**
 * Opções configuráveis para a rotina de reconciliação fiscal e física.
 */
export interface ReconciliacaoOptions {
  /**
   * Tolerância percentual padrão para variação de preço unitário (default: 0%).
   */
  toleranciaPrecoPercentual?: number;
  /**
   * Dicionário opcional para resolução de códigos externos do fornecedor
   * para códigos internos Rhowert (ex.: { 'FORN-123': '10-001' }).
   */
  mapeamentoFornecedor?: Record<string, string>;
  /**
   * Se verdadeiro, divergências menores de quantidade (ex.: entregas parciais)
   * classificam o parecer como APROVADA_COM_DIVERGENCIA em vez de REJEITADA.
   * Default: true.
   */
  permitirAprovacaoComDivergenciaMenor?: boolean;
}

/**
 * Detalhe da conferência de um item específico da NFe.
 */
export interface ItemReconciliadoResultado {
  itemNotaFiscal: ItemNotaFiscal;
  itemPedidoCorrespondente?: ItemPedidoCompra;
  statusConciliacao: StatusItemConciliacao;
  divergenciaQuantidade: number;
  divergenciaPrecoUnitario: number;
  divergenciaValorTotal: number;
  inconsistencias: string[];
  aprovado: boolean;
}

/**
 * Relatório completo de apuração e reconciliação entre NFe e Pedido de Compra.
 */
export interface ResultadoReconciliacaoNFe {
  numeroNota: string;
  chaveAcesso: string;
  numeroPedidoCompra: string;
  statusGeral: StatusReconciliacaoGeral;
  statusConferenciaSugerido: StatusConferenciaNFe;
  totalItensNota: number;
  totalItensConciliados: number;
  totalItensDivergentes: number;
  totalItensNaoConstantesNoPedido: number;
  valorTotalNota: number;
  valorTotalPedidoAutorizado: number;
  itens: ItemReconciliadoResultado[];
  inconsistenciasGerais: string[];
  notaFiscalAtualizada: NotaFiscal;
}

/**
 * Serviço puro e agnóstico de Reconciliação Contábil/Fiscal entre
 * Notas Fiscais Eletrônicas recebidas e Pedidos de Compra emitidos.
 */
export class NFeReconciliationService {
  /**
   * Cruza todos os itens de uma NFe contra os itens contratados em um Pedido de Compra.
   *
   * @param notaFiscal Objeto da Nota Fiscal importada
   * @param pedidoCompra Pedido de Compra emitido pela fábrica
   * @param options Configurações de tolerâncias e mapeamentos
   * @returns Relatório analítico e a Nota Fiscal enriquecida com os novos status
   */
  public reconciliar(
    notaFiscal: NotaFiscal,
    pedidoCompra: PedidoCompra,
    options: ReconciliacaoOptions = {}
  ): ResultadoReconciliacaoNFe {
    const toleranciaPrecoPerc = options.toleranciaPrecoPercentual ?? 0;
    const permitirDivergenciaMenor = options.permitirAprovacaoComDivergenciaMenor ?? true;
    const mapeamentoFornecedor = options.mapeamentoFornecedor ?? {};

    const inconsistenciasGerais: string[] = [];

    // Validação de correspondência de fornecedor (CNPJ)
    const cnpjNotaLimpo = notaFiscal.cnpjFornecedor.replace(/\D/g, '');
    const cnpjPedidoLimpo = pedidoCompra.cnpjFornecedor.replace(/\D/g, '');
    if (cnpjNotaLimpo && cnpjPedidoLimpo && cnpjNotaLimpo !== cnpjPedidoLimpo) {
      inconsistenciasGerais.push(
        `CNPJ do emitente da nota (${notaFiscal.cnpjFornecedor}) diverge do fornecedor do pedido (${pedidoCompra.cnpjFornecedor}).`
      );
    }

    const itensReconciliados: ItemReconciliadoResultado[] = [];
    const novosItensNota: ItemNotaFiscal[] = [];

    let totalConciliados = 0;
    let totalDivergentes = 0;
    let totalNaoConstantes = 0;

    for (const itemNota of notaFiscal.itens) {
      const inconsistenciasItem: string[] = [];
      let itemPedido: ItemPedidoCompra | undefined;

      // 1. Tentar encontrar item do pedido pelo ID direto (se pré-associado)
      if (itemNota.pedidoCompraItemId) {
        itemPedido = pedidoCompra.itens.find((p) => p.id === itemNota.pedidoCompraItemId);
      }

      // 2. Tentar encontrar pelo código interno Rhowert
      if (!itemPedido) {
        let codigoInterno = itemNota.codigoInternoRhowert;

        // Se não tiver código interno na nota, verificar no dicionário de mapeamento do fornecedor
        if (!codigoInterno && itemNota.codigoFornecedor && mapeamentoFornecedor[itemNota.codigoFornecedor]) {
          codigoInterno = mapeamentoFornecedor[itemNota.codigoFornecedor];
        }

        if (codigoInterno) {
          const codNormalizado = normalizarCodigoItem(codigoInterno);
          itemPedido = pedidoCompra.itens.find(
            (p) => normalizarCodigoItem(p.codigoInternoRhowert) === codNormalizado
          );
        }
      }

      // Se o item não existe no pedido de compra:
      if (!itemPedido) {
        totalNaoConstantes++;
        inconsistenciasItem.push(
          `Item "${itemNota.descricao}" (Cód. Fornec: ${itemNota.codigoFornecedor}) não consta no pedido de compra.`
        );

        const itemReconciliado: ItemReconciliadoResultado = {
          itemNotaFiscal: itemNota,
          statusConciliacao: 'NAO_CONSTA_NO_PEDIDO',
          divergenciaQuantidade: itemNota.quantidadeFaturada,
          divergenciaPrecoUnitario: itemNota.valorUnitario,
          divergenciaValorTotal: itemNota.valorTotal,
          inconsistencias: inconsistenciasItem,
          aprovado: false,
        };

        itensReconciliados.push(itemReconciliado);
        novosItensNota.push({
          ...itemNota,
          statusConciliacao: 'NAO_CONSTA_NO_PEDIDO',
        });
        continue;
      }

      // Se o item existe no pedido de compra:
      let statusItem: StatusItemConciliacao = 'CONCILIADO';
      let aprovado = true;

      // Cálculo de tolerância e divergência de quantidade
      const saldoAutorizadoPendente = Math.max(
        0,
        itemPedido.quantidadeAutorizada - (itemPedido.quantidadeJaEntregue ?? 0)
      );

      const toleranciaQtdPercentual = itemPedido.toleranciaPercentual ?? 0;
      const margemQtdPermitida = saldoAutorizadoPendente * (1 + toleranciaQtdPercentual / 100);

      // Quantidade faturada vs autorizada
      const diferencaQuantidade = itemNota.quantidadeFaturada - saldoAutorizadoPendente;
      let temDivergenciaQtd = false;

      if (itemNota.quantidadeFaturada > margemQtdPermitida) {
        // Excedeu o pedido acima da tolerância permitida
        temDivergenciaQtd = true;
        inconsistenciasItem.push(
          `Quantidade faturada (${itemNota.quantidadeFaturada}) excede o saldo autorizado (${saldoAutorizadoPendente}) ` +
            `além da tolerância contratual de ${toleranciaQtdPercentual}%.`
        );
      }

      // Cálculo de tolerância e divergência de preço unitário
      const valorUnitarioEsperado = itemPedido.valorUnitarioContratado;
      const margemPrecoPermitida = valorUnitarioEsperado * (1 + toleranciaPrecoPerc / 100);
      const diferencaPrecoUnitario = itemNota.valorUnitario - valorUnitarioEsperado;
      let temDivergenciaPreco = false;

      if (itemNota.valorUnitario > margemPrecoPermitida) {
        temDivergenciaPreco = true;
        inconsistenciasItem.push(
          `Preço unitário faturado (R$ ${itemNota.valorUnitario.toFixed(2)}) é superior ao valor contratado ` +
            `(R$ ${valorUnitarioEsperado.toFixed(2)}).`
        );
      }

      const diferencaValorTotal = itemNota.valorTotal - saldoAutorizadoPendente * valorUnitarioEsperado;

      // Determinação do status do item
      if (temDivergenciaQtd && temDivergenciaPreco) {
        statusItem = 'DIVERGENCIA_QUANTIDADE';
        aprovado = false;
        totalDivergentes++;
      } else if (temDivergenciaQtd) {
        statusItem = 'DIVERGENCIA_QUANTIDADE';
        aprovado = false;
        totalDivergentes++;
      } else if (temDivergenciaPreco) {
        statusItem = 'DIVERGENCIA_VALOR';
        aprovado = false;
        totalDivergentes++;
      } else {
        statusItem = 'CONCILIADO';
        aprovado = true;
        totalConciliados++;
      }

      const itemReconciliado: ItemReconciliadoResultado = {
        itemNotaFiscal: itemNota,
        itemPedidoCorrespondente: itemPedido,
        statusConciliacao: statusItem,
        divergenciaQuantidade: diferencaQuantidade,
        divergenciaPrecoUnitario: diferencaPrecoUnitario,
        divergenciaValorTotal: diferencaValorTotal,
        inconsistencias: inconsistenciasItem,
        aprovado,
      };

      itensReconciliados.push(itemReconciliado);
      novosItensNota.push({
        ...itemNota,
        codigoInternoRhowert: itemNota.codigoInternoRhowert || itemPedido.codigoInternoRhowert,
        pedidoCompraItemId: itemPedido.id,
        statusConciliacao: statusItem,
      });
    }

    // Determinação do status global da reconciliação
    let statusGeral: StatusReconciliacaoGeral;
    let statusConferenciaSugerido: StatusConferenciaNFe;

    if (totalNaoConstantes > 0) {
      // Itens não contratados geram rejeição imediata da conciliação
      statusGeral = 'REJEITADA';
      statusConferenciaSugerido = 'DIVERGENTE';
      inconsistenciasGerais.push(
        `A nota fiscal possui ${totalNaoConstantes} item(ns) que não constam no pedido de compra.`
      );
    } else if (totalDivergentes > 0) {
      if (permitirDivergenciaMenor) {
        statusGeral = 'APROVADA_COM_DIVERGENCIA';
        statusConferenciaSugerido = 'DIVERGENTE';
      } else {
        statusGeral = 'REJEITADA';
        statusConferenciaSugerido = 'DIVERGENTE';
      }
      inconsistenciasGerais.push(
        `A nota fiscal possui ${totalDivergentes} item(ns) com divergência de quantidade ou preço.`
      );
    } else {
      statusGeral = 'APROVADA_TOTAL';
      statusConferenciaSugerido = 'APROVADA';
    }

    const notaFiscalAtualizada: NotaFiscal = {
      ...notaFiscal,
      status: statusConferenciaSugerido,
      numeroPedidoCompra: pedidoCompra.numeroPedido,
      itens: novosItensNota,
      updatedAt: new Date().toISOString(),
    };

    return {
      numeroNota: notaFiscal.numero,
      chaveAcesso: notaFiscal.chaveAcesso,
      numeroPedidoCompra: pedidoCompra.numeroPedido,
      statusGeral,
      statusConferenciaSugerido,
      totalItensNota: notaFiscal.itens.length,
      totalItensConciliados: totalConciliados,
      totalItensDivergentes: totalDivergentes,
      totalItensNaoConstantesNoPedido: totalNaoConstantes,
      valorTotalNota: notaFiscal.valorTotalNota,
      valorTotalPedidoAutorizado: pedidoCompra.valorTotalPedido,
      itens: itensReconciliados,
      inconsistenciasGerais,
      notaFiscalAtualizada,
    };
  }
}
