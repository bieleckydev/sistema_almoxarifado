import { Item, ItemFiltros } from '../domain/item.schema';
import { Colaborador } from '../domain/colaborador.schema';
import { Movimentacao, MovimentacaoFiltros } from '../domain/movimentacao.schema';

/**
 * Contrato agnóstico de repositório de dados de estoque.
 * Pode ser implementado via Firestore, REST API, banco relacional ou memória (testes).
 */
export interface IEstoqueRepository {
  /**
   * Busca um item pelo seu ID único.
   */
  buscarItemPorId(id: string): Promise<Item | null>;

  /**
   * Busca um item pelo seu código padronizado (ex: '10-3812', '90-1105', '100-089').
   */
  buscarPorCodigo(codigo: string): Promise<Item | null>;

  /**
   * Lista itens aplicando critérios de busca e paginação.
   */
  listarComFiltros(filtros: ItemFiltros): Promise<{ itens: Item[]; total: number }>;

  /**
   * Busca um colaborador pela matrícula ou ID único.
   */
  buscarColaboradorPorId(id: string): Promise<Colaborador | null>;

  /**
   * Atualiza o saldo físico de um item no armazenamento persistente.
   */
  atualizarSaldoItem(itemId: string, novoSaldo: number): Promise<void>;

  /**
   * Registra uma movimentação física e adiciona à trilha de auditoria.
   */
  registrarMovimentacao(movimentacao: Movimentacao): Promise<Movimentacao>;

  /**
   * Consulta o histórico e extrato de movimentações de um item específico.
   */
  consultarExtratoItem(itemId: string, filtros?: MovimentacaoFiltros): Promise<Movimentacao[]>;
}
