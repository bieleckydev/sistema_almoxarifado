import { NextResponse } from 'next/server';
import { RegistrarBaixaInternaSchema } from '@/core/domain/movimentacao.schema';
import {
  getMovimentacaoService,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';

/**
 * POST /api/movimentacoes/baixa-interna
 * Registra a baixa física de material para consumo interno de um colaborador.
 * Requer permissão 'stock:operate'.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const input = RegistrarBaixaInternaSchema.parse(body);

    const service = getMovimentacaoService();
    const resultado = await service.executarBaixaInterna(input);

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
