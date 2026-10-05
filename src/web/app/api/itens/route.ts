import { NextResponse } from 'next/server';
import {
  CreateItemSchema,
  ItemFiltrosSchema,
  ItemSchema,
  type Item,
} from '@/core/domain/item.schema';
import {
  ApiError,
  getEstoqueRepository,
  parseQueryParams,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../api-helpers';

/**
 * Converte query params de URL em filtros estruturados e validados pelo Zod.
 */
function parseItemFiltros(request: Request) {
  const raw = parseQueryParams(request);
  const data: Record<string, unknown> = {};

  if (raw.busca !== undefined && raw.busca.trim() !== '') {
    data.busca = raw.busca.trim();
  }
  if (raw.tipo !== undefined && raw.tipo.trim() !== '') {
    data.tipo = raw.tipo.trim();
  }
  if (raw.statusEstoque !== undefined && raw.statusEstoque.trim() !== '') {
    data.statusEstoque = raw.statusEstoque.trim();
  }
  if (raw.clienteDestino !== undefined && raw.clienteDestino.trim() !== '') {
    data.clienteDestino = raw.clienteDestino.trim();
  }
  if (raw.apenasAtivos !== undefined) {
    data.apenasAtivos = raw.apenasAtivos === 'true' || raw.apenasAtivos === '1';
  }
  if (raw.pagina !== undefined && raw.pagina.trim() !== '') {
    const p = parseInt(raw.pagina, 10);
    if (!isNaN(p)) data.pagina = p;
  }
  if (raw.limite !== undefined && raw.limite.trim() !== '') {
    const l = parseInt(raw.limite, 10);
    if (!isNaN(l)) data.limite = l;
  }

  return ItemFiltrosSchema.parse(data);
}

/**
 * GET /api/itens
 * Lista o catálogo de itens com suporte a filtros, paginação e status de estoque.
 */
export async function GET(request: Request) {
  try {
    await requireIdentity(request);
    const filtros = parseItemFiltros(request);
    const repo = getEstoqueRepository();
    const resultado = await repo.listarComFiltros(filtros);

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/itens
 * Cria um novo item no catálogo de materiais.
 * Requer permissão 'catalog:manage'.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'catalog:manage');

    const body = await readJson(request);
    const input = CreateItemSchema.parse(body);
    const repo = getEstoqueRepository();

    // Validação de unicidade de código
    const itemComMesmoCodigo = await repo.buscarPorCodigo(input.codigo);
    if (itemComMesmoCodigo) {
      throw new ApiError(`Já existe um item cadastrado com o código "${input.codigo}".`, 409);
    }

    // Se um ID específico foi fornecido, validar se já não existe
    const id = input.id?.trim() || crypto.randomUUID();
    if (input.id) {
      const itemComMesmoId = await repo.buscarItemPorId(id);
      if (itemComMesmoId) {
        throw new ApiError(`Já existe um item cadastrado com o ID "${id}".`, 409);
      }
    }

    const agora = new Date().toISOString();
    const itemParaSalvar: Item = ItemSchema.parse({
      ...input,
      id,
      estoqueAtual: input.estoqueInicial ?? 0,
      createdAt: agora,
      updatedAt: agora,
    });

    const itemCriado = await repo.salvarItem(itemParaSalvar);
    return NextResponse.json(itemCriado, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
