import { NextResponse } from 'next/server';
import {
  ColaboradorFiltrosSchema,
  ColaboradorSchema,
  CreateColaboradorSchema,
  normalizarMatricula,
  type Colaborador,
} from '@/core/domain/colaborador.schema';
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
function parseColaboradorFiltros(request: Request) {
  const raw = parseQueryParams(request);
  const data: Record<string, unknown> = {};

  if (raw.busca !== undefined && raw.busca.trim() !== '') {
    data.busca = raw.busca.trim();
  }
  if (raw.setor !== undefined && raw.setor.trim() !== '') {
    data.setor = raw.setor.trim();
  }
  if (raw.apenasAtivos !== undefined) {
    data.apenasAtivos = raw.apenasAtivos === 'true' || raw.apenasAtivos === '1';
  }
  if (raw.apenasInativos !== undefined) {
    data.apenasInativos = raw.apenasInativos === 'true' || raw.apenasInativos === '1';
  }
  if (raw.pagina !== undefined && raw.pagina.trim() !== '') {
    const p = parseInt(raw.pagina, 10);
    if (!isNaN(p)) data.pagina = p;
  }
  if (raw.limite !== undefined && raw.limite.trim() !== '') {
    const l = parseInt(raw.limite, 10);
    if (!isNaN(l)) data.limite = l;
  }

  return ColaboradorFiltrosSchema.parse(data);
}

/**
 * GET /api/colaboradores
 * Lista colaboradores com suporte a filtros por setor, status ativo e busca textual.
 */
export async function GET(request: Request) {
  try {
    await requireIdentity(request);
    const filtros = parseColaboradorFiltros(request);
    const repo = getEstoqueRepository();
    const resultado = await repo.listarColaboradores(filtros);

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/colaboradores
 * Cadastra um novo colaborador fabril.
 * Requer permissão 'catalog:manage'.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'catalog:manage');

    const body = await readJson(request);
    const input = CreateColaboradorSchema.parse(body);
    const repo = getEstoqueRepository();

    // Validação de duplicidade de matrícula
    const matriculaNorm = normalizarMatricula(input.matricula);
    const existentePorMatricula = await repo.buscarColaboradorPorId(matriculaNorm);
    if (existentePorMatricula) {
      throw new ApiError(
        `Já existe um colaborador cadastrado com a matrícula "${matriculaNorm}".`,
        409
      );
    }

    // Se ID específico foi fornecido, validar se já não existe
    const id = input.id?.trim() || crypto.randomUUID();
    if (input.id) {
      const existentePorId = await repo.buscarColaboradorPorId(id);
      if (existentePorId) {
        throw new ApiError(`Já existe um colaborador cadastrado com o ID "${id}".`, 409);
      }
    }

    const agora = new Date().toISOString();
    const colaboradorParaSalvar: Colaborador = ColaboradorSchema.parse({
      ...input,
      id,
      matricula: matriculaNorm,
      createdAt: agora,
      updatedAt: agora,
    });

    const salvo = await repo.salvarColaborador(colaboradorParaSalvar);
    return NextResponse.json(salvo, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
