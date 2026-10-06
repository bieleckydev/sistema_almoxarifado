import { NextResponse } from 'next/server';
import { RegistrarAjusteInventarioSchema } from '@/core/domain/movimentacao.schema';
import {
  getMovimentacaoService,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';

/**
 * POST /api/movimentacoes/ajuste
 * Registra ajuste compensatório de inventário físico (+ ou -).
 * Requer permissão 'stock:operate'.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const input = RegistrarAjusteInventarioSchema.parse(body);

    const service = getMovimentacaoService();
    const resultado = await service.executarAjusteInventario(input);

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
