import { NextResponse } from 'next/server';
import { MovimentacaoFiltrosSchema } from '@/core/domain/movimentacao.schema';
import {
  getEstoqueRepository,
  parseQueryParams,
  requireIdentity,
  toErrorResponse,
} from '../api-helpers';

function parseMovimentacaoFiltros(request: Request) {
  const raw = parseQueryParams(request);
  const data: Record<string, unknown> = {};

  if (raw.itemId && raw.itemId.trim()) data.itemId = raw.itemId.trim();
  if (raw.colaboradorId && raw.colaboradorId.trim()) data.colaboradorId = raw.colaboradorId.trim();
  if (raw.tipo && raw.tipo.trim()) data.tipo = raw.tipo.trim();
  if (raw.dataInicio && raw.dataInicio.trim()) data.dataInicio = raw.dataInicio.trim();
  if (raw.dataFim && raw.dataFim.trim()) data.dataFim = raw.dataFim.trim();
  if (raw.numeroNF && raw.numeroNF.trim()) data.numeroNF = raw.numeroNF.trim();
  if (raw.cursor && raw.cursor.trim()) data.cursor = raw.cursor.trim();
  if (raw.pagina && raw.pagina.trim()) {
    const p = parseInt(raw.pagina, 10);
    if (!isNaN(p)) data.pagina = p;
  }
  if (raw.limite && raw.limite.trim()) {
    const l = parseInt(raw.limite, 10);
    if (!isNaN(l)) data.limite = l;
  }

  return MovimentacaoFiltrosSchema.parse(data);
}

/**
 * GET /api/movimentacoes
 * Lista todas as movimentações de estoque com filtros e paginação para auditoria geral.
 */
export async function GET(request: Request) {
  try {
    await requireIdentity(request);
    const filtros = parseMovimentacaoFiltros(request);

    const repo = getEstoqueRepository();
    const resultado = await repo.listarMovimentacoes(filtros);

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
