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
  getAuditoriaService,
  getEstoqueRepository,
  readJson,
  requireIdentity,
  requireAcaoPermissao,
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
    const identity = await requireIdentity(request);
    requireAcaoPermissao(identity, 'cadastros');
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ApiError('Corpo da requisição inválido.', 400);
    }
    const parsed = UpdateColaboradorSchema.parse(body);

    // O schema parcial ainda injeta o default de `ativo`; aplica só as chaves enviadas
    // para que editar um colaborador inativo não o reative sem querer.
    const enviados = body as Record<string, unknown>;
    const dadosAtualizacao = Object.fromEntries(
      Object.entries(parsed).filter(([chave]) => chave in enviados)
    ) as typeof parsed;
    if (Object.keys(dadosAtualizacao).length === 0) {
      throw new ApiError('Nenhum campo informado para atualização.', 400);
    }

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

    const mudouStatus = colaboradorExistente.ativo !== salvo.ativo;
    const acao = mudouStatus
      ? salvo.ativo
        ? 'REATIVAR_COLABORADOR'
        : 'INATIVAR_COLABORADOR'
      : 'EDITAR_COLABORADOR';
    const verbo = mudouStatus ? (salvo.ativo ? 'reativado' : 'inativado') : 'atualizado';
    try {
      await getAuditoriaService().registrar({
        quando: salvo.updatedAt ?? new Date().toISOString(),
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Operador',
        papel: identity.user.role || 'operador',
        acao,
        detalhe: `Colaborador ${salvo.matricula} - ${salvo.nome} ${verbo}`,
        entidade: 'Colaborador',
        entidadeId: salvo.id,
      });
    } catch (auditErr) {
      console.warn('Falha ao auditar alteração de colaborador:', auditErr);
    }

    return NextResponse.json(salvo, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
