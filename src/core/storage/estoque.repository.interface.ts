import { Item, ItemFiltros } from '../domain/item.schema';
import { Colaborador, ColaboradorFiltros } from '../domain/colaborador.schema';
import { Movimentacao, MovimentacaoFiltros } from '../domain/movimentacao.schema';

/**
 * Contrato de repositório de dados de estoque (Port da Arquitetura Hexagonal).
 * Desacopla as regras de negócio das fontes de persistência (Firestore, API REST, SQLite ou Memória).
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
   * Lista itens aplicando critérios de busca, filtros de tipo/status e paginação.
   */
  listarComFiltros(filtros?: ItemFiltros): Promise<{ itens: Item[]; total: number }>;

  /**
   * Salva ou atualiza um item no repositório.
   */
  salvarItem(item: Item): Promise<Item>;

  /**
   * Atualiza o saldo físico de um item no armazenamento persistente.
   */
  atualizarSaldoItem(itemId: string, novoSaldo: number): Promise<void>;

  /**
   * Busca um colaborador pela matrícula ou ID único.
   */
  buscarColaboradorPorId(id: string): Promise<Colaborador | null>;

  /**
   * Lista colaboradores com filtros opcionais.
   */
  listarColaboradores(filtros?: ColaboradorFiltros): Promise<{ colaboradores: Colaborador[]; total: number }>;

  /**
   * Salva ou atualiza um colaborador no repositório.
   */
  salvarColaborador(colaborador: Colaborador): Promise<Colaborador>;

  /**
   * Registra uma movimentação física e adiciona à trilha de auditoria.
   */
  registrarMovimentacao(movimentacao: Movimentacao): Promise<Movimentacao>;

  /**
   * Consulta o histórico e extrato de movimentações de um item ou período específico.
   */
  consultarExtratoItem(itemId: string, filtros?: MovimentacaoFiltros): Promise<Movimentacao[]>;

  /**
   * Lista todas as movimentações recentes com suporte a paginação e filtros.
   */
  listarMovimentacoes(filtros?: MovimentacaoFiltros): Promise<{ movimentacoes: Movimentacao[]; total: number }>;

  /**
   * Registra atomicamente uma movimentação física e atualiza o saldo do item em uma única transação.
   * Em bancos relacionais ou Firestore, garante integridade ACID estrita.
   */
  registrarMovimentacaoComSaldo?(
    itemId: string,
    novoSaldo: number,
    movimentacao: Movimentacao
  ): Promise<Movimentacao>;

  /**
   * Registra atomicamente uma baixa em lote de múltiplos itens com seus respectivos saldos e movimentações.
   * Se qualquer item apresentar divergência na transação, toda a operação é cancelada.
   */
  registrarBaixaLoteAtomica?(
    operacoes: Array<{
      itemId: string;
      novoSaldo: number;
      movimentacao: Movimentacao;
    }>
  ): Promise<Movimentacao[]>;
}
