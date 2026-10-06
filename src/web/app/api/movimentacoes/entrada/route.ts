import { NextResponse } from 'next/server';
import { RegistrarEntradaSchema } from '@/core/domain/movimentacao.schema';
import {
  getMovimentacaoService,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';

/**
 * POST /api/movimentacoes/entrada
 * Registra a entrada física de mercadorias no estoque por compra (NFe) ou produção interna.
 * Requer permissão 'stock:operate'.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const input = RegistrarEntradaSchema.parse(body);

    const service = getMovimentacaoService();
    const resultado = await service.executarEntrada(input);

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
