import { api } from '@/core/api/client';
import type { Movimentacao } from '@/core/domain/movimentacao.schema';
import type { MovimentacaoParaGiro } from '@/core/services/estoque-calculator';

/** Tamanho máximo de página aceito pela API de movimentações. */
const LOTE_MOVIMENTACOES = 1000;
/** Teto de segurança de páginas por consulta (até 20 mil movimentações). */
const MAX_PAGINAS = 20;

export interface IntervaloMovimentacoes {
  /** Início inclusivo em ISO 8601; ausente lê desde o início do histórico. */
  dataInicio?: string;
  /** Fim inclusivo em ISO 8601; ausente lê até agora. */
  dataFim?: string;
}

export interface MovimentacoesGiro {
  movimentacoes: MovimentacaoParaGiro[];
  total: number;
  /** true quando o intervalo tinha mais movimentações do que o teto de leitura. */
  truncado: boolean;
}

/**
 * Lê todas as movimentações do intervalo seguindo o cursor da API.
 * Mantém apenas os campos necessários para o cálculo de giro.
 */
export async function buscarMovimentacoesGiro({
  dataInicio,
  dataFim,
}: IntervaloMovimentacoes): Promise<MovimentacoesGiro> {
  const movimentacoes: MovimentacaoParaGiro[] = [];
  let cursor: string | undefined;
  let total = 0;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const params: Record<string, string> = { limite: String(LOTE_MOVIMENTACOES) };
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    if (cursor) params.cursor = cursor;

    const res = await api.get<{ movimentacoes: Movimentacao[]; total: number }>('/movimentacoes', {
      params,
    });
    const lote = res.data?.movimentacoes || [];
    total = res.data?.total ?? total;

    for (const m of lote) {
      movimentacoes.push({
        itemId: m.itemId,
        tipo: m.tipo,
        quantidade: m.quantidade,
        dataMovimentacao: m.dataMovimentacao,
        estornado: m.estornado,
        estornoDe: m.estornoDe,
      });
    }

    if (lote.length < LOTE_MOVIMENTACOES || movimentacoes.length >= total) {
      return { movimentacoes, total, truncado: false };
    }
    cursor = lote[lote.length - 1].id;
  }

  return { movimentacoes, total, truncado: movimentacoes.length < total };
}
