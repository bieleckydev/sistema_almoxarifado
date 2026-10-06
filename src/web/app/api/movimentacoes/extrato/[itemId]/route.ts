import { NextResponse } from 'next/server';
import { MovimentacaoFiltrosSchema } from '@/core/domain/movimentacao.schema';
import {
  getEstoqueRepository,
  parseQueryParams,
  requireIdentity,
  toErrorResponse,
} from '../../../api-helpers';

interface ExtratoRouteContext {
  params: Promise<{ itemId: string }>;
}

function parseMovimentacaoFiltros(request: Request) {
  const raw = parseQueryParams(request);
  const data: Record<string, unknown> = {};

  if (raw.colaboradorId && raw.colaboradorId.trim()) data.colaboradorId = raw.colaboradorId.trim();
  if (raw.tipo && raw.tipo.trim()) data.tipo = raw.tipo.trim();
  if (raw.dataInicio && raw.dataInicio.trim()) data.dataInicio = raw.dataInicio.trim();
  if (raw.dataFim && raw.dataFim.trim()) data.dataFim = raw.dataFim.trim();
  if (raw.numeroNF && raw.numeroNF.trim()) data.numeroNF = raw.numeroNF.trim();
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
 * GET /api/movimentacoes/extrato/[itemId]
 * Consulta o extrato histórico ordenado das movimentações de um item específico.
 */
export async function GET(request: Request, context: ExtratoRouteContext) {
  try {
    await requireIdentity(request);
    const { itemId } = await context.params;
    const filtros = parseMovimentacaoFiltros(request);

    const repo = getEstoqueRepository();
    const extrato = await repo.consultarExtratoItem(itemId, filtros);

    return NextResponse.json(extrato, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
