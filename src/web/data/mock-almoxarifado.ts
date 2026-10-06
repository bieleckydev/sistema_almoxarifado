import type { Item } from '@/core/domain/item.schema';
import type { TipoItem } from '@/core/domain/types';
import type { Cliente } from '@/core/domain/cliente.schema';
import type { Pedido } from '@/core/domain/pedido.schema';

export type AbaEstoque = 'mp' | 'imp' | 'motos';
export type StatusCriticidade = 'ok' | 'low' | 'crit';

export interface DashboardItem extends Omit<Item, 'embalagem'> {
  aba: AbaEstoque;
  categoria: string;
  capacidadeMaxima: number;
  especificacoes?: Record<string, string>;
  embalagem?: Item['embalagem'];
}

export interface DashboardMovimentacao {
  id: string;
  itemId: string;
  tipo: 'Entrada' | 'Saída';
  quantidade: number;
  dataHora: string;
  responsavel: string;
}

export const METADADOS_ABAS: Record<
  AbaEstoque,
  {
    titulo: string;
    subtitulo: string;
    tipoDominio: TipoItem;
  }
> = {
  mp: {
    titulo: 'Matéria-prima',
    subtitulo: 'Chapas, barras, tubos e insumos produtivos de fabricação.',
    tipoDominio: 'PRODUTIVO_MATERIA_PRIMA',
  },
  imp: {
    titulo: 'Materiais improdutivos',
    subtitulo: 'Itens de consumo e manutenção: EPIs, abrasivos, lubrificantes e ferramentas.',
    tipoDominio: 'IMPRODUTIVO_CONSUMIVEL',
  },
  motos: {
    titulo: 'Peças de motos',
    subtitulo: 'Peças automotivas acabadas para reposição e montagem.',
    tipoDominio: 'ACABADO',
  },
};

/**
 * Mapeamento de unidades de medida para exibição simplificada.
 */
export const UNIDADE_LABELS: Record<string, string> = {
  UNIDADE: 'un',
  KG: 'kg',
  METRO: 'm',
  PACOTE: 'pct',
  PECA: 'pç',
  LITRO: 'L',
};

/**
 * Dicionário de especificações (mantido vazio; obtido dinamicamente dos dados dos itens).
 */
export const ESPECIFICACOES_ITENS: Record<string, Record<string, string>> = {};

/**
 * Coleções de dados mock eliminadas do sistema.
 */
export const MOCK_ITENS: DashboardItem[] = [];
export const MOCK_MOVIMENTACOES: DashboardMovimentacao[] = [];

/**
 * Calcula a classificação de criticidade do item.
 * - 'crit': saldo <= min * 0.5 (situação crítica)
 * - 'low': saldo <= min (abaixo do mínimo de segurança)
 * - 'ok': saldo > min (nível normal)
 */
export function calcularStatusCriticidade(
  estoqueAtual: number,
  estoqueSeguranca: number
): StatusCriticidade {
  if (estoqueAtual <= estoqueSeguranca * 0.5) {
    return 'crit';
  }
  if (estoqueAtual <= estoqueSeguranca) {
    return 'low';
  }
  return 'ok';
}

/**
 * Rótulos legíveis para a situação do estoque.
 */
export const STATUS_LABELS: Record<StatusCriticidade, string> = {
  ok: 'Normal',
  low: 'Abaixo do mínimo',
  crit: 'Crítico',
};

/**
 * Tipos de tela ou aba navegáveis no sistema V2.
 */
export type TelaOuAba = 'inicio' | AbaEstoque | 'vendas' | 'clientes' | 'saida';

export const CLIENTES_INICIAIS: Cliente[] = [];
export const PEDIDOS_INICIAIS: Pedido[] = [];
