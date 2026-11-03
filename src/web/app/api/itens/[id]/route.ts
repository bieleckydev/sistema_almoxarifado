import { NextResponse } from 'next/server';
import {
  ItemSchema,
  UpdateItemSchema,
  type Item,
} from '@/core/domain/item.schema';
import { ItemNaoEncontradoError } from '@/core/services/movimentacao.service';
import {
  ApiError,
  getEstoqueRepository,
  getAuditoriaService,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';

interface ItemRouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/itens/[id]
 * Detalha as informações de um item por ID único.
 */
export async function GET(request: Request, context: ItemRouteContext) {
  try {
    await requireIdentity(request);
    const { id } = await context.params;
    const repo = getEstoqueRepository();

    const item = await repo.buscarItemPorId(id);
    if (!item) {
      throw new ItemNaoEncontradoError(id);
    }

    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PATCH /api/itens/[id]
 * Atualiza campos cadastrais de um item existente.
 * O saldo físico (estoqueAtual) é preservado e não pode ser manipulado por este endpoint.
 * Requer permissão 'catalog:manage'.
 */
export async function PATCH(request: Request, context: ItemRouteContext) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'catalog:manage');

    const { id } = await context.params;
    const repo = getEstoqueRepository();

    const itemExistente = await repo.buscarItemPorId(id);
    if (!itemExistente) {
      throw new ItemNaoEncontradoError(id);
    }

    const body = await readJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ApiError('Corpo da requisição inválido.', 400);
    }
    const parsed = UpdateItemSchema.parse(body);

    // O schema parcial ainda injeta defaults (ativo, estoqueSeguranca, embalagem).
    // Mantém só as chaves enviadas para não sobrescrever dados que não vieram no corpo.
    const enviados = body as Record<string, unknown>;
    const dadosAtualizacao = Object.fromEntries(
      Object.entries(parsed).filter(([chave]) => chave in enviados)
    ) as typeof parsed;

    if (Object.keys(dadosAtualizacao).length === 0) {
      throw new ApiError('Nenhum campo informado para atualização.', 400);
    }

    if (dadosAtualizacao.ativo === false && itemExistente.ativo !== false && itemExistente.estoqueAtual > 0) {
      throw new ApiError(
        `O item "${itemExistente.codigo}" ainda tem ${itemExistente.estoqueAtual} em estoque. ` +
          'Zere o saldo com uma saída ou ajuste de inventário antes de inativar.',
        409
      );
    }

    // Se o código for modificado, garantir unicidade
    if (dadosAtualizacao.codigo && dadosAtualizacao.codigo.toUpperCase() !== itemExistente.codigo) {
      const duplicado = await repo.buscarPorCodigo(dadosAtualizacao.codigo);
      if (duplicado && duplicado.id !== id) {
        throw new ApiError(
          `Já existe outro item cadastrado com o código "${dadosAtualizacao.codigo}".`,
          409
        );
      }
    }

    // Remove estoqueInicial se fornecido, pois não pode afetar estoque físico
    const { estoqueInicial: _, ...dadosParaAtualizar } = dadosAtualizacao;

    // Mesclar mantendo o saldo original inalterado
    const itemAtualizado: Item = ItemSchema.parse({
      ...itemExistente,
      ...dadosParaAtualizar,
      id: itemExistente.id,
      estoqueAtual: itemExistente.estoqueAtual,
      updatedAt: new Date().toISOString(),
    });

    const itemSalvo = await repo.salvarItem(itemAtualizado);

    const mudouStatus = (itemExistente.ativo !== false) !== (itemSalvo.ativo !== false);
    const acao = mudouStatus ? (itemSalvo.ativo ? 'REATIVAR_ITEM' : 'INATIVAR_ITEM') : 'EDITAR_ITEM';
    const verbo = mudouStatus ? (itemSalvo.ativo ? 'reativado' : 'inativado') : 'atualizado';

    // Registro na Auditoria Operacional (3.0)
    try {
      await getAuditoriaService().registrar({
        quando: new Date().toISOString(),
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Almoxarife',
        papel: identity.user.role || 'operador',
        acao,
        detalhe: `Item "${itemSalvo.codigo} - ${itemSalvo.descricao}" ${verbo} no catálogo`,
        entidade: 'Item',
        entidadeId: itemSalvo.id,
      });
    } catch (auditErr) {
      console.warn('Falha ao auditar edição de item:', auditErr);
    }

    return NextResponse.json(itemSalvo, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const PUT = PATCH;
