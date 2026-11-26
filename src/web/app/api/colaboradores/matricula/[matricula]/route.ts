import { NextResponse } from 'next/server';
import { normalizarMatricula } from '@/core/domain/colaborador.schema';
import { ColaboradorNaoEncontradoError } from '@/core/services/movimentacao.service';
import {
  getEstoqueRepository,
  requireAcaoPermissao,
  requireIdentity,
  toErrorResponse,
} from '../../../api-helpers';

interface MatriculaRouteContext {
  params: Promise<{ matricula: string }>;
}

/**
 * GET /api/colaboradores/matricula/[matricula]
 * Busca rápida de colaborador pela matrícula normalizada (ex: '042', '42' -> '042').
 * Útil para leituras de crachás por código de barras, cartões RFID e validação em baixa rápida.
 */
export async function GET(request: Request, context: MatriculaRouteContext) {
  try {
    const identity = await requireIdentity(request);
    requireAcaoPermissao(identity, 'cadastros');
    const { matricula } = await context.params;
    const matriculaDecodificada = decodeURIComponent(matricula).trim();
    const matriculaNorm = normalizarMatricula(matriculaDecodificada);

    const repo = getEstoqueRepository();
    const colaborador = await repo.buscarColaboradorPorId(matriculaNorm || matriculaDecodificada);

    if (!colaborador) {
      throw new ColaboradorNaoEncontradoError(matriculaDecodificada);
    }

    return NextResponse.json(colaborador, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
