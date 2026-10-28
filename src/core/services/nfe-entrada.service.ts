import { NotaFiscal, ItemNotaFiscal } from '../domain/nfe.schema';
import { Movimentacao } from '../domain/movimentacao.schema';
import { IEstoqueRepository } from '../storage/estoque.repository.interface';
import { calcularNovoSaldo } from './estoque-calculator';
import { calcularCustoMedioPonderado } from './custo-medio';
import { normalizarCodigoItem } from '../utils/formatters';

export class NotaFiscalJaEfetivadaError extends Error {
  constructor(public readonly chaveAcesso: string, public readonly numeroNota: string) {
    super(`A Nota Fiscal nº ${numeroNota} (Chave: ${chaveAcesso}) já foi arquivada/efetivada.`);
    this.name = 'NotaFiscalJaEfetivadaError';
  }
}

export class NenhumItemElegivelParaEntradaError extends Error {
  constructor(public readonly numeroNota: string) {
    super(`A Nota Fiscal nº ${numeroNota} não possui itens conciliados ou aprovados para efetivação.`);
    this.name = 'NenhumItemElegivelParaEntradaError';
  }
}

/**
 * Opções de parametrização para efetivação de entrada por NFe.
 */
export interface EfetivarEntradaNFeOptions {
  /**
   * Se true, autoriza a entrada de itens com divergência menor (ex: entrega parcial).
   * Itens que não constam no pedido NUNCA são creditados automaticamente. Default: false.
   */
  permitirItensComDivergencia?: boolean;
  /**
   * Lista restrita de IDs de itens da nota fiscal a serem efetivados. Se omitido,
   * todos os itens elegíveis serão processados.
   */
  itemIdsParaEfetivar?: string[];
  /**
   * Data/hora personalizada para o lançamento do estoque.
   */
  dataMovimentacao?: string;
  /**
   * Observações adicionais do almoxarife.
   */
  observacoes?: string;
}

/**
 * Detalhe de cada item creditado com sucesso no estoque.
 */
export interface ItemEfetivadoResultado {
  itemNotaId: string;
  itemId: string;
  codigoInterno: string;
  descricao: string;
  quantidadeCreditada: number;
  saldoAnterior: number;
  novoSaldo: number;
  movimentacaoId: string;
}

/**
 * Detalhe de itens que não puderam ser creditados no estoque.
 */
export interface ItemIgnoradoResultado {
  itemNotaId: string;
  codigoFornecedor: string;
  codigoInterno?: string;
  descricao: string;
  motivo: string;
  statusConciliacao: string;
}

/**
 * Resultado consolidado do workflow de efetivação de entrada por NFe.
 */
export interface ResultadoEfetivacaoNFe {
  chaveAcesso: string;
  numeroNota: string;
  fornecedor: string;
  totalItensProcessados: number;
  totalItensEfetivados: number;
  totalItensIgnorados: number;
  movimentacoesCriadas: Movimentacao[];
  itensEfetivados: ItemEfetivadoResultado[];
  itensIgnorados: ItemIgnoradoResultado[];
  notaFiscalAtualizada: NotaFiscal;
}

/**
 * Serviço responsável por orquestrar a conversão direta de itens aprovados
 * de Notas Fiscais Eletrônicas (NFe) em movimentações de estoque ENTRADA_COMPRA.
 */
export class NFeEntradaService {
  constructor(private readonly repository: IEstoqueRepository) {}

  /**
   * Gera um ID único de movimentação para persistência agnóstica.
   */
  private gerarIdMovimentacao(): string {
    return `mov-nfe-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Efetiva a entrada de mercadorias no estoque a partir de uma Nota Fiscal conferida.
   *
   * @param notaFiscal Objeto da NFe
   * @param options Opções de efetivação e filtros de itens
   * @returns Resultado completo das movimentações e saldos atualizados
   */
  async efetivarEntrada(
    notaFiscal: NotaFiscal,
    options: EfetivarEntradaNFeOptions = {}
  ): Promise<ResultadoEfetivacaoNFe> {
    if (notaFiscal.status === 'ARQUIVADA') {
      throw new NotaFiscalJaEfetivadaError(notaFiscal.chaveAcesso, notaFiscal.numero);
    }

    const permitirDivergencia = options.permitirItensComDivergencia ?? false;
    const dataHora = options.dataMovimentacao || new Date().toISOString();

    const movimentacoesCriadas: Movimentacao[] = [];
    const itensEfetivados: ItemEfetivadoResultado[] = [];
    const itensIgnorados: ItemIgnoradoResultado[] = [];

    const novosItensNota: ItemNotaFiscal[] = [];

    for (const itemNota of notaFiscal.itens) {
      // Se foi passada uma lista de IDs específicos, ignora itens fora da lista
      if (options.itemIdsParaEfetivar && !options.itemIdsParaEfetivar.includes(itemNota.id)) {
        novosItensNota.push(itemNota);
        continue;
      }

      // 1. Verificação de status de conciliação do item
      if (itemNota.statusConciliacao === 'NAO_CONSTA_NO_PEDIDO') {
        itensIgnorados.push({
          itemNotaId: itemNota.id,
          codigoFornecedor: itemNota.codigoFornecedor,
          codigoInterno: itemNota.codigoInternoRhowert,
          descricao: itemNota.descricao,
          motivo: 'Item não consta no Pedido de Compra e não possui autorização para entrada de estoque.',
          statusConciliacao: itemNota.statusConciliacao,
        });
        novosItensNota.push(itemNota);
        continue;
      }

      if (itemNota.statusConciliacao !== 'CONCILIADO' && !permitirDivergencia) {
        itensIgnorados.push({
          itemNotaId: itemNota.id,
          codigoFornecedor: itemNota.codigoFornecedor,
          codigoInterno: itemNota.codigoInternoRhowert,
          descricao: itemNota.descricao,
          motivo: `Item com pendência de conciliação (${itemNota.statusConciliacao}) não autorizado para entrada.`,
          statusConciliacao: itemNota.statusConciliacao,
        });
        novosItensNota.push(itemNota);
        continue;
      }

      // 2. Localização do produto no catálogo do almoxarifado
      let itemEstoque = null;
      if (itemNota.codigoInternoRhowert) {
        const codNormalizado = normalizarCodigoItem(itemNota.codigoInternoRhowert);
        itemEstoque = await this.repository.buscarPorCodigo(codNormalizado);
      }

      if (!itemEstoque) {
        itensIgnorados.push({
          itemNotaId: itemNota.id,
          codigoFornecedor: itemNota.codigoFornecedor,
          codigoInterno: itemNota.codigoInternoRhowert,
          descricao: itemNota.descricao,
          motivo: `Código de item "${itemNota.codigoInternoRhowert || itemNota.codigoFornecedor}" não cadastrado no almoxarifado.`,
          statusConciliacao: itemNota.statusConciliacao,
        });
        novosItensNota.push(itemNota);
        continue;
      }

      // 3. Validação de item ativo
      if (!itemEstoque.ativo) {
        itensIgnorados.push({
          itemNotaId: itemNota.id,
          codigoFornecedor: itemNota.codigoFornecedor,
          codigoInterno: itemNota.codigoInternoRhowert,
          descricao: itemNota.descricao,
          motivo: `Item "${itemEstoque.codigo}" (${itemEstoque.descricao}) está inativo no cadastro.`,
          statusConciliacao: itemNota.statusConciliacao,
        });
        novosItensNota.push(itemNota);
        continue;
      }

      // 4. Cálculo de novo saldo e criação da movimentação
      const quantidadeEntrada = itemNota.quantidadeRecebidaFisica ?? itemNota.quantidadeFaturada;
      const saldoAnterior = itemEstoque.estoqueAtual;
      const novoSaldo = calcularNovoSaldo(saldoAnterior, 'ENTRADA_COMPRA', quantidadeEntrada);

      const obsItem = options.observacoes
        ? `${options.observacoes} - Ref NFe ${notaFiscal.numero}`
        : `Entrada automática via NFe ${notaFiscal.numero} (Fornecedor: ${notaFiscal.razaoSocialFornecedor})`;

      const movimentacao: Movimentacao = {
        id: this.gerarIdMovimentacao(),
        itemId: itemEstoque.id,
        tipo: 'ENTRADA_COMPRA',
        quantidade: quantidadeEntrada,
        saldoAnterior,
        saldoResultante: novoSaldo,
        dataMovimentacao: dataHora,
        numeroNF: notaFiscal.numero,
        documentoFiscalId: notaFiscal.chaveAcesso,
        fornecedor: notaFiscal.razaoSocialFornecedor,
        numeroPedidoRhowert: notaFiscal.numeroPedidoCompra,
        observacao: obsItem,
        createdAt: dataHora,
      };

      // Atualiza saldo e custo médio ponderado do produto e persiste movimentação na auditoria
      if (itemNota.valorUnitario && itemNota.valorUnitario > 0) {
        const novoCusto = calcularCustoMedioPonderado(
          saldoAnterior,
          itemEstoque.custoUnitario || 0,
          quantidadeEntrada,
          itemNota.valorUnitario
        );
        await this.repository.atualizarSaldoECustoItem(itemEstoque.id, novoSaldo, novoCusto);
      } else {
        await this.repository.atualizarSaldoItem(itemEstoque.id, novoSaldo);
      }
      const movPersistida = await this.repository.registrarMovimentacao(movimentacao);

      movimentacoesCriadas.push(movPersistida);
      itensEfetivados.push({
        itemNotaId: itemNota.id,
        itemId: itemEstoque.id,
        codigoInterno: itemEstoque.codigo,
        descricao: itemEstoque.descricao,
        quantidadeCreditada: quantidadeEntrada,
        saldoAnterior,
        novoSaldo,
        movimentacaoId: movPersistida.id,
      });

      novosItensNota.push({
        ...itemNota,
        statusConciliacao: 'CONCILIADO',
      });
    }

    if (itensEfetivados.length === 0) {
      throw new NenhumItemElegivelParaEntradaError(notaFiscal.numero);
    }

    // Se todos os itens da nota foram efetivados com sucesso, a nota é arquivada
    const notaTotalmenteEfetivada = itensIgnorados.length === 0;
    const novoStatusNota = notaTotalmenteEfetivada ? 'ARQUIVADA' : 'DIVERGENTE';

    const notaFiscalAtualizada: NotaFiscal = {
      ...notaFiscal,
      status: novoStatusNota,
      itens: novosItensNota,
      updatedAt: new Date().toISOString(),
    };

    return {
      chaveAcesso: notaFiscal.chaveAcesso,
      numeroNota: notaFiscal.numero,
      fornecedor: notaFiscal.razaoSocialFornecedor,
      totalItensProcessados: notaFiscal.itens.length,
      totalItensEfetivados: itensEfetivados.length,
      totalItensIgnorados: itensIgnorados.length,
      movimentacoesCriadas,
      itensEfetivados,
      itensIgnorados,
      notaFiscalAtualizada,
    };
  }
}
