import { NextResponse } from 'next/server';
import { ItemNaoEncontradoError } from '@/core/services/movimentacao.service';
import {
  getEstoqueRepository,
  requireIdentity,
  toErrorResponse,
} from '../../../api-helpers';

interface CodigoRouteContext {
  params: Promise<{ codigo: string }>;
}

/**
 * GET /api/itens/codigo/[codigo]
 * Busca rápida de um item pelo seu código padronizado (ex: '90-1105' ou '10-3812').
 * Útil para leituras de código de barras, autocomplete e buscas diretas.
 */
export async function GET(request: Request, context: CodigoRouteContext) {
  try {
    await requireIdentity(request);
    const { codigo } = await context.params;
    const codigoDecodificado = decodeURIComponent(codigo).trim();

    const repo = getEstoqueRepository();
    const item = await repo.buscarPorCodigo(codigoDecodificado);

    if (!item) {
      throw new ItemNaoEncontradoError(codigoDecodificado);
    }

    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
