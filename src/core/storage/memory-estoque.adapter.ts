import { IEstoqueRepository } from './estoque.repository.interface';
import { Item, ItemFiltros } from '../domain/item.schema';
import { Colaborador, ColaboradorFiltros, normalizarMatricula } from '../domain/colaborador.schema';
import { Movimentacao, MovimentacaoFiltros } from '../domain/movimentacao.schema';
import { determinarStatusEstoque } from '../services/estoque-calculator';

/**
 * Adaptador de repositório em memória para IEstoqueRepository.
 * Utilizado para testes unitários, testes de integração sem banco e fallback offline.
 */
export class MemoryEstoqueRepository implements IEstoqueRepository {
  private itens = new Map<string, Item>();
  private colaboradores = new Map<string, Colaborador>();
  private movimentacoes: Movimentacao[] = [];

  constructor(initialData?: {
    itens?: Item[];
    colaboradores?: Colaborador[];
    movimentacoes?: Movimentacao[];
  }) {
    if (initialData?.itens) {
      for (const item of initialData.itens) {
        this.itens.set(item.id, { ...item });
      }
    }
    if (initialData?.colaboradores) {
      for (const colab of initialData.colaboradores) {
        this.colaboradores.set(colab.id, { ...colab });
      }
    }
    if (initialData?.movimentacoes) {
      this.movimentacoes = initialData.movimentacoes.map((m) => ({ ...m }));
    }
  }

  async buscarItemPorId(id: string): Promise<Item | null> {
    const item = this.itens.get(id);
    return item ? { ...item } : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Item | null> {
    const codeUpper = codigo.trim().toUpperCase();
    for (const item of this.itens.values()) {
      if (item.codigo.toUpperCase() === codeUpper) {
        return { ...item };
      }
    }
    return null;
  }

  async listarComFiltros(
    filtros?: ItemFiltros
  ): Promise<{ itens: Item[]; total: number }> {
    let lista = Array.from(this.itens.values());

    if (filtros) {
      if (filtros.apenasAtivos !== false) {
        lista = lista.filter((i) => i.ativo);
      }
      if (filtros.tipo) {
        lista = lista.filter((i) => i.tipo === filtros.tipo);
      }
      if (filtros.statusEstoque) {
        lista = lista.filter((i) => {
          const status = determinarStatusEstoque(i.estoqueAtual, i.estoqueSeguranca);
          return status === filtros.statusEstoque;
        });
      }
      if (filtros.clienteDestino) {
        const clienteSearch = filtros.clienteDestino.toLowerCase();
        lista = lista.filter(
          (i) => i.clienteDestino && i.clienteDestino.toLowerCase().includes(clienteSearch)
        );
      }
      if (filtros.busca) {
        const query = filtros.busca.toLowerCase();
        lista = lista.filter(
          (i) =>
            i.codigo.toLowerCase().includes(query) ||
            i.descricao.toLowerCase().includes(query)
        );
      }
    }

    const total = lista.length;
    const pagina = filtros?.pagina || 1;
    const limite = filtros?.limite || 20;
    const inicio = (pagina - 1) * limite;
    const itensPaginados = lista.slice(inicio, inicio + limite).map((i) => ({ ...i }));

    return { itens: itensPaginados, total };
  }

  async salvarItem(item: Item): Promise<Item> {
    this.itens.set(item.id, { ...item });
    return { ...item };
  }

  async atualizarSaldoItem(itemId: string, novoSaldo: number): Promise<void> {
    const item = this.itens.get(itemId);
    if (item) {
      item.estoqueAtual = novoSaldo;
      item.updatedAt = new Date().toISOString();
      this.itens.set(itemId, { ...item });
    }
  }

  async buscarColaboradorPorId(idOrMatricula: string): Promise<Colaborador | null> {
    const colab = this.colaboradores.get(idOrMatricula);
    if (colab) return { ...colab };

    const norm = normalizarMatricula(idOrMatricula);
    for (const c of this.colaboradores.values()) {
      if (c.matricula === idOrMatricula || (norm && c.matricula === norm)) {
        return { ...c };
      }
    }
    return null;
  }

  async listarColaboradores(
    filtros?: ColaboradorFiltros
  ): Promise<{ colaboradores: Colaborador[]; total: number }> {
    let lista = Array.from(this.colaboradores.values());

    if (filtros) {
      if (filtros.apenasAtivos !== false) {
        lista = lista.filter((c) => c.ativo);
      }
      if (filtros.setor) {
        lista = lista.filter((c) => c.setor === filtros.setor);
      }
      if (filtros.busca) {
        const query = filtros.busca.toLowerCase();
        lista = lista.filter(
          (c) =>
            c.nome.toLowerCase().includes(query) ||
            c.matricula.includes(query) ||
            c.funcao.toLowerCase().includes(query)
        );
      }
    }

    const total = lista.length;
    const pagina = filtros?.pagina || 1;
    const limite = filtros?.limite || 20;
    const inicio = (pagina - 1) * limite;
    const paginados = lista.slice(inicio, inicio + limite).map((c) => ({ ...c }));

    return { colaboradores: paginados, total };
  }

  async salvarColaborador(colaborador: Colaborador): Promise<Colaborador> {
    this.colaboradores.set(colaborador.id, { ...colaborador });
    return { ...colaborador };
  }

  async registrarMovimentacao(movimentacao: Movimentacao): Promise<Movimentacao> {
    const copia = { ...movimentacao };
    this.movimentacoes.push(copia);
    return copia;
  }

  async buscarMovimentacaoPorId(id: string): Promise<Movimentacao | null> {
    const mov = this.movimentacoes.find((m) => m.id === id);
    return mov ? { ...mov } : null;
  }

  async consultarExtratoItem(
    itemId: string,
    filtros?: MovimentacaoFiltros
  ): Promise<Movimentacao[]> {
    let list = this.movimentacoes.filter((m) => m.itemId === itemId);

    if (filtros?.tipo) {
      list = list.filter((m) => m.tipo === filtros.tipo);
    }
    if (filtros?.dataInicio) {
      list = list.filter((m) => m.dataMovimentacao >= filtros.dataInicio!);
    }
    if (filtros?.dataFim) {
      list = list.filter((m) => m.dataMovimentacao <= filtros.dataFim!);
    }

    return list.map((m) => ({ ...m }));
  }

  async listarMovimentacoes(
    filtros?: MovimentacaoFiltros
  ): Promise<{ movimentacoes: Movimentacao[]; total: number }> {
    let list = [...this.movimentacoes];

    if (filtros?.itemId) {
      list = list.filter((m) => m.itemId === filtros.itemId);
    }
    if (filtros?.colaboradorId) {
      list = list.filter((m) => m.colaboradorId === filtros.colaboradorId);
    }
    if (filtros?.tipo) {
      list = list.filter((m) => m.tipo === filtros.tipo);
    }
    if (filtros?.dataInicio) {
      list = list.filter((m) => m.dataMovimentacao >= filtros.dataInicio!);
    }
    if (filtros?.dataFim) {
      list = list.filter((m) => m.dataMovimentacao <= filtros.dataFim!);
    }

    const total = list.length;
    const pagina = filtros?.pagina || 1;
    const limite = filtros?.limite || 20;
    const inicio = (pagina - 1) * limite;
    const paginados = list.slice(inicio, inicio + limite).map((m) => ({ ...m }));

    return { movimentacoes: paginados, total };
  }

  async registrarMovimentacaoComSaldo(
    itemId: string,
    novoSaldo: number,
    movimentacao: Movimentacao,
    opcoes: { estornoDe?: string } = {}
  ): Promise<Movimentacao> {
    if (opcoes.estornoDe) {
      const original = this.movimentacoes.find((m) => m.id === opcoes.estornoDe);
      if (!original) {
        throw new Error(`Movimentação com ID "${opcoes.estornoDe}" não foi encontrada para estorno.`);
      }
      if (original.estornado) {
        throw new Error('Esta movimentação já foi estornada anteriormente.');
      }
      original.estornado = true;
      original.estornadoPor = movimentacao.id;
    }
    await this.atualizarSaldoItem(itemId, novoSaldo);
    return this.registrarMovimentacao(movimentacao);
  }

  async registrarBaixaLoteAtomica(
    operacoes: Array<{
      itemId: string;
      novoSaldo: number;
      movimentacao: Movimentacao;
    }>
  ): Promise<Movimentacao[]> {
    const gravadas: Movimentacao[] = [];
    for (const op of operacoes) {
      await this.atualizarSaldoItem(op.itemId, op.novoSaldo);
      const m = await this.registrarMovimentacao(op.movimentacao);
      gravadas.push(m);
    }
    return gravadas;
  }

  /**
   * Limpa todos os dados armazenados em memória (útil em testes).
   */
  clear(): void {
    this.itens.clear();
    this.colaboradores.clear();
    this.movimentacoes = [];
  }
}

/**
 * Alias semântico para MemoryEstoqueRepository
 */
export const MemoryEstoqueAdapter = MemoryEstoqueRepository;
