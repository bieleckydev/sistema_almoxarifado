import {
  ExecutarFechamentoMensalSchema,
  ExecutarFechamentoMensalInput,
  FechamentoMensal,
  FechamentoMensalItem,
} from '../domain/inventario.schema';
import { IEstoqueRepository } from '../storage/estoque.repository.interface';
import { IFechamentoMensalRepository } from '../storage/fechamento-mensal.repository.interface';
import { isMovimentacaoEntrada, isMovimentacaoSaida } from './estoque-calculator';

/**
 * Serviço responsável pelo fechamento periódico de saldos de estoque (mensal/anual).
 * Automatiza e consolida o saldo final de cada mês como inventário inicial do mês subsequente,
 * substituindo a transferência manual entre abas da planilha ESTOQUE 2026.xlsx.
 */
export class FechamentoMensalService {
  constructor(
    private readonly estoqueRepo: IEstoqueRepository,
    private readonly fechamentoRepo: IFechamentoMensalRepository
  ) {}

  /**
   * Executa a apuração e fechamento contábil/físico de um mês de competência.
   */
  async executarFechamento(dados: ExecutarFechamentoMensalInput): Promise<FechamentoMensal> {
    const validado = ExecutarFechamentoMensalSchema.parse(dados);
    const { ano, mes, responsavelId, observacoes } = validado;

    // 1. Determinar intervalo temporal do mês de competência em formato ISO
    const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0)).toISOString();
    // Último dia do mês: dia 0 do mês seguinte
    const ultimoDia = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999)).toISOString();

    // 2. Localizar fechamento do mês anterior para obter o saldo inicial consolidado
    const anoAnterior = mes === 1 ? ano - 1 : ano;
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const fechamentoAnterior = await this.fechamentoRepo.buscarFechamento(anoAnterior, mesAnterior);

    const saldosIniciaisPorItem = new Map<string, number>();
    if (fechamentoAnterior) {
      for (const itemFechado of fechamentoAnterior.itens) {
        saldosIniciaisPorItem.set(itemFechado.itemId, itemFechado.saldoFinal);
      }
    }

    // 3. Carregar todos os itens ativos do almoxarifado
    const { itens: catalogoItens } = await this.estoqueRepo.listarComFiltros({
      pagina: 1,
      limite: 10000,
    });

    const itensConsolidados: FechamentoMensalItem[] = [];

    // 4. Para cada item, consolidar movimentações do período
    for (const item of catalogoItens) {
      const extratoMes = await this.estoqueRepo.consultarExtratoItem(item.id, {
        dataInicio: primeiroDia,
        dataFim: ultimoDia,
      });

      let totalEntradas = 0;
      let totalSaidas = 0;
      let totalAjustes = 0;

      for (const mov of extratoMes) {
        if (mov.tipo === 'ENTRADA_COMPRA' || mov.tipo === 'ENTRADA_PRODUCAO') {
          totalEntradas += mov.quantidade;
        } else if (mov.tipo === 'SAIDA_CONSUMO_INTERNO' || mov.tipo === 'SAIDA_EXPEDICAO') {
          totalSaidas += mov.quantidade;
        } else if (mov.tipo === 'AJUSTE_INVENTARIO_POSITIVO') {
          totalAjustes += mov.quantidade;
        } else if (mov.tipo === 'AJUSTE_INVENTARIO_NEGATIVO') {
          totalAjustes -= mov.quantidade;
        }
      }

      // Se havia fechamento anterior, usa o saldo final dele.
      // Se não havia (ex: primeiro mês de uso do sistema), infere o saldo inicial
      // reconstruindo retroativamente ou utilizando o saldo anterior da primeira movimentação
      let saldoInicial = saldosIniciaisPorItem.get(item.id);
      if (saldoInicial === undefined) {
        if (extratoMes.length > 0) {
          saldoInicial = extratoMes[0].saldoAnterior;
        } else {
          saldoInicial = item.estoqueAtual;
        }
      }

      const saldoFinal =
        Math.round((saldoInicial + totalEntradas - totalSaidas + totalAjustes + Number.EPSILON) * 10000) /
        10000;

      itensConsolidados.push({
        itemId: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        saldoInicial,
        totalEntradas: Math.round(totalEntradas * 10000) / 10000,
        totalSaidas: Math.round(totalSaidas * 10000) / 10000,
        totalAjustes: Math.round(totalAjustes * 10000) / 10000,
        saldoFinal,
      });
    }

    const agora = new Date().toISOString();
    const fechamento: FechamentoMensal = {
      id: `fechamento-${ano}-${String(mes).padStart(2, '0')}`,
      ano,
      mes,
      dataFechamento: agora,
      responsavelId,
      status: 'FECHADO',
      itens: itensConsolidados,
      observacoes,
      createdAt: agora,
    };

    return this.fechamentoRepo.salvarFechamento(fechamento);
  }

  /**
   * Consulta o fechamento consolidado de um mês específico.
   */
  async buscarFechamento(ano: number, mes: number): Promise<FechamentoMensal | null> {
    return this.fechamentoRepo.buscarFechamento(ano, mes);
  }

  /**
   * Lista o histórico de fechamentos de um ano (ou todos os anos).
   */
  async listarFechamentos(ano?: number): Promise<FechamentoMensal[]> {
    return this.fechamentoRepo.listarFechamentos(ano);
  }
}
