import { NextResponse } from 'next/server';
import { RegistrarSaidaExpedicaoSchema } from '@/core/domain/movimentacao.schema';
import {
  getMovimentacaoService,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';

/**
 * POST /api/movimentacoes/expedicao
 * Registra saída física de produto acabado para expedição a cliente ou filial.
 * Requer permissão 'stock:operate'.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const input = RegistrarSaidaExpedicaoSchema.parse(body);

    const service = getMovimentacaoService();
    const resultado = await service.executarSaidaExpedicao(input);

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
