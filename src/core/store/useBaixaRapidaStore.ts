import { create } from 'zustand';
import { Colaborador, SetorFabril } from '../domain/colaborador.schema';
import { Item } from '../domain/item.schema';
import { UnidadeMedida } from '../domain/types';
import { RegistrarBaixaLoteInput } from '../domain/movimentacao.schema';

/**
 * Representação de um item contido no carrinho de retirada rápida do almoxarifado.
 */
export interface ItemCarrinhoBaixa {
  itemId: string;
  codigo: string;
  descricao: string;
  unidade: UnidadeMedida;
  estoqueAtual: number;
  quantidade: number;
  observacao?: string;
}

/**
 * Estado e ações da Store de Baixa Rápida / Carrinho de Retirada.
 */
export interface BaixaRapidaState {
  // Estado
  colaboradorSelecionado: Colaborador | null;
  setorDestino: SetorFabril | null;
  observacaoGeral: string;
  itens: ItemCarrinhoBaixa[];

  // Ações do Colaborador
  selecionarColaborador: (colaborador: Colaborador) => void;
  desmarcarColaborador: () => void;
  definirSetorDestino: (setor: SetorFabril | null) => void;
  definirObservacaoGeral: (observacao: string) => void;

  // Ações do Carrinho
  adicionarItem: (item: Item, quantidade?: number) => void;
  removerItem: (itemId: string) => void;
  atualizarQuantidade: (itemId: string, quantidade: number) => void;
  incrementarItem: (itemId: string, incremento?: number) => void;
  decrementarItem: (itemId: string, decremento?: number) => void;
  definirObservacaoItem: (itemId: string, observacao?: string) => void;
  limparCarrinho: () => void;
  reset: () => void;

  // Getters / Cálculos derivados
  obterTotalItensDiferentes: () => number;
  obterTotalUnidadesFisicas: () => number;
  validarDisponibilidadeGeral: () => {
    valido: boolean;
    itensComEstoqueInsuficiente: Array<{
      itemId: string;
      codigo: string;
      descricao: string;
      quantidadeDesejada: number;
      estoqueAtual: number;
    }>;
  };
  estaProntoParaConfirmar: () => boolean;
  obterPayloadBaixaLote: () => RegistrarBaixaLoteInput | null;
}

export const useBaixaRapidaStore = create<BaixaRapidaState>((set, get) => ({
  colaboradorSelecionado: null,
  setorDestino: null,
  observacaoGeral: '',
  itens: [],

  selecionarColaborador: (colaborador: Colaborador) => {
    set({
      colaboradorSelecionado: colaborador,
      // Automaticamente herda o setor do colaborador se ainda não foi definido outro
      setorDestino: colaborador.setor,
    });
  },

  desmarcarColaborador: () => {
    set({
      colaboradorSelecionado: null,
      setorDestino: null,
    });
  },

  definirSetorDestino: (setor: SetorFabril | null) => {
    set({ setorDestino: setor });
  },

  definirObservacaoGeral: (observacaoGeral: string) => {
    set({ observacaoGeral });
  },

  adicionarItem: (item: Item, quantidade = 1) => {
    const qtdAdicionar = Math.max(1, quantidade);
    set((state) => {
      const itemExistenteIndex = state.itens.findIndex((i) => i.itemId === item.id);

      if (itemExistenteIndex >= 0) {
        const novosItens = [...state.itens];
        const itemAtual = novosItens[itemExistenteIndex];
        novosItens[itemExistenteIndex] = {
          ...itemAtual,
          quantidade: itemAtual.quantidade + qtdAdicionar,
          estoqueAtual: item.estoqueAtual, // Atualiza com o estoque mais recente
        };
        return { itens: novosItens };
      }

      const novoItemCarrinho: ItemCarrinhoBaixa = {
        itemId: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        estoqueAtual: item.estoqueAtual,
        quantidade: qtdAdicionar,
      };

      return { itens: [...state.itens, novoItemCarrinho] };
    });
  },

  removerItem: (itemId: string) => {
    set((state) => ({
      itens: state.itens.filter((i) => i.itemId !== itemId),
    }));
  },

  atualizarQuantidade: (itemId: string, quantidade: number) => {
    if (quantidade <= 0) {
      get().removerItem(itemId);
      return;
    }

    set((state) => ({
      itens: state.itens.map((i) =>
        i.itemId === itemId ? { ...i, quantidade } : i
      ),
    }));
  },

  incrementarItem: (itemId: string, incremento = 1) => {
    const passo = Math.max(1, incremento);
    set((state) => ({
      itens: state.itens.map((i) =>
        i.itemId === itemId ? { ...i, quantidade: i.quantidade + passo } : i
      ),
    }));
  },

  decrementarItem: (itemId: string, decremento = 1) => {
    const passo = Math.max(1, decremento);
    const item = get().itens.find((i) => i.itemId === itemId);
    if (!item) return;

    if (item.quantidade <= passo) {
      get().removerItem(itemId);
      return;
    }

    set((state) => ({
      itens: state.itens.map((i) =>
        i.itemId === itemId ? { ...i, quantidade: i.quantidade - passo } : i
      ),
    }));
  },

  definirObservacaoItem: (itemId: string, observacao?: string) => {
    set((state) => ({
      itens: state.itens.map((i) =>
        i.itemId === itemId ? { ...i, observacao } : i
      ),
    }));
  },

  limparCarrinho: () => {
    set({ itens: [] });
  },

  reset: () => {
    set({
      colaboradorSelecionado: null,
      setorDestino: null,
      observacaoGeral: '',
      itens: [],
    });
  },

  obterTotalItensDiferentes: () => {
    return get().itens.length;
  },

  obterTotalUnidadesFisicas: () => {
    return get().itens.reduce((total, i) => total + i.quantidade, 0);
  },

  validarDisponibilidadeGeral: () => {
    const itens = get().itens;
    const insuficientes = itens
      .filter((i) => i.quantidade > i.estoqueAtual)
      .map((i) => ({
        itemId: i.itemId,
        codigo: i.codigo,
        descricao: i.descricao,
        quantidadeDesejada: i.quantidade,
        estoqueAtual: i.estoqueAtual,
      }));

    return {
      valido: insuficientes.length === 0,
      itensComEstoqueInsuficiente: insuficientes,
    };
  },

  estaProntoParaConfirmar: () => {
    const { colaboradorSelecionado, itens, validarDisponibilidadeGeral } = get();
    if (!colaboradorSelecionado) return false;
    if (itens.length === 0) return false;
    return validarDisponibilidadeGeral().valido;
  },

  obterPayloadBaixaLote: (): RegistrarBaixaLoteInput | null => {
    const { colaboradorSelecionado, setorDestino, observacaoGeral, itens } = get();

    if (!colaboradorSelecionado || itens.length === 0) {
      return null;
    }

    return {
      colaboradorId: colaboradorSelecionado.id,
      setor: setorDestino || colaboradorSelecionado.setor,
      observacaoGeral: observacaoGeral || undefined,
      itens: itens.map((i) => ({
        itemId: i.itemId,
        quantidade: i.quantidade,
        observacao: i.observacao,
      })),
    };
  },
}));
