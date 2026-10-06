import { NextResponse } from 'next/server';
import { RegistrarBaixaLoteSchema } from '@/core/domain/movimentacao.schema';
import {
  getMovimentacaoService,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';

/**
 * POST /api/movimentacoes/baixa-lote
 * Realiza baixa rápida em lote de materiais com integridade atômica (ACID).
 * Se qualquer item apresentar estoque insuficiente ou concorrência, o lote inteiro é abortado.
 * Requer permissão 'stock:operate'.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const input = RegistrarBaixaLoteSchema.parse(body);

    const service = getMovimentacaoService();
    const resultado = await service.executarBaixaLote(input);

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
