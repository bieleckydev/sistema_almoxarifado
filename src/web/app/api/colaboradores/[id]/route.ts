import { NextResponse } from 'next/server';
import {
  ColaboradorSchema,
  normalizarMatricula,
  UpdateColaboradorSchema,
  type Colaborador,
} from '@/core/domain/colaborador.schema';
import { ColaboradorNaoEncontradoError } from '@/core/services/movimentacao.service';
import {
  ApiError,
  getEstoqueRepository,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';

interface ColaboradorRouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/colaboradores/[id]
 * Detalha as informações de um colaborador por ID único.
 */
export async function GET(request: Request, context: ColaboradorRouteContext) {
  try {
    await requireIdentity(request);
    const { id } = await context.params;
    const repo = getEstoqueRepository();

    const colaborador = await repo.buscarColaboradorPorId(id);
    if (!colaborador) {
      throw new ColaboradorNaoEncontradoError(id);
    }

    return NextResponse.json(colaborador, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PATCH /api/colaboradores/[id]
 * Atualiza campos cadastrais de um colaborador existente.
 * Requer permissão 'catalog:manage'.
 */
export async function PATCH(request: Request, context: ColaboradorRouteContext) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'catalog:manage');

    const { id } = await context.params;
    const repo = getEstoqueRepository();

    const colaboradorExistente = await repo.buscarColaboradorPorId(id);
    if (!colaboradorExistente) {
      throw new ColaboradorNaoEncontradoError(id);
    }

    const body = await readJson(request);
    const dadosAtualizacao = UpdateColaboradorSchema.parse(body);

    // Se houver alteração de matrícula, verificar se não colide com outro colaborador
    if (dadosAtualizacao.matricula) {
      const novaMatricula = normalizarMatricula(dadosAtualizacao.matricula);
      if (novaMatricula !== colaboradorExistente.matricula) {
        const duplicado = await repo.buscarColaboradorPorId(novaMatricula);
        if (duplicado && duplicado.id !== id) {
          throw new ApiError(
            `Já existe outro colaborador cadastrado com a matrícula "${novaMatricula}".`,
            409
          );
        }
      }
    }

    const atualizado: Colaborador = ColaboradorSchema.parse({
      ...colaboradorExistente,
      ...dadosAtualizacao,
      id: colaboradorExistente.id,
      updatedAt: new Date().toISOString(),
    });

    const salvo = await repo.salvarColaborador(atualizado);
    return NextResponse.json(salvo, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
