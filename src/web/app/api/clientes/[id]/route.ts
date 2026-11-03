import { NextResponse } from 'next/server';
import {
  ClienteSchema,
  CreateClienteSchema,
  TIPO_PARCEIRO_LABELS,
  type Cliente,
} from '@/core/domain/cliente.schema';
import {
  ApiError,
  getAuditoriaService,
  getServerDb,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';
import { clienteFromFirestore } from '../cliente-firestore';

interface ClienteRouteContext {
  params: Promise<{ id: string }>;
}

/** Campos editáveis do parceiro. Todos opcionais: só o que vier no corpo é alterado. */
const AtualizarClienteSchema = CreateClienteSchema.omit({ id: true }).partial();

/** Campos textuais opcionais que o usuário pode limpar no formulário. */
const CAMPOS_LIMPAVEIS = ['documento', 'contato', 'telefone', 'cidade'] as const;

async function carregarCliente(id: string): Promise<Cliente> {
  const snap = await getServerDb().collection('clients').doc(id).get();
  if (!snap.exists) {
    throw new ApiError(`Parceiro "${id}" não encontrado.`, 404);
  }
  return clienteFromFirestore(snap.id ?? id, snap.data());
}

/**
 * GET /api/clientes/[id]
 * Retorna um cliente/parceiro pelo ID, incluindo cadastros inativos.
 */
export async function GET(request: Request, context: ClienteRouteContext) {
  try {
    await requireIdentity(request);
    const { id } = await context.params;
    return NextResponse.json(await carregarCliente(id), { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PATCH /api/clientes/[id]
 * Atualiza dados cadastrais do parceiro. Também é a forma de inativar
 * (`{ "ativo": false }`) ou reativar (`{ "ativo": true }`) um cadastro.
 * Não há exclusão física: pedidos, notas e materiais de terceiros referenciam o parceiro.
 * Requer permissão 'catalog:manage'.
 */
export async function PATCH(request: Request, context: ClienteRouteContext) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'catalog:manage');

    const { id } = await context.params;
    const existente = await carregarCliente(id);

    const body = await readJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ApiError('Corpo da requisição inválido.', 400);
    }
    const parsed = AtualizarClienteSchema.parse(body);

    // Aplica apenas as chaves enviadas, para que defaults do schema não sobrescrevam dados.
    const enviados = body as Record<string, unknown>;
    const alteracoes: Partial<Cliente> = {};
    for (const chave of Object.keys(parsed) as Array<keyof typeof parsed>) {
      if (chave in enviados) {
        (alteracoes as Record<string, unknown>)[chave] = parsed[chave];
      }
    }
    if (Object.keys(alteracoes).length === 0) {
      throw new ApiError('Nenhum campo informado para atualização.', 400);
    }

    const atualizado = ClienteSchema.parse({
      ...existente,
      ...alteracoes,
      id: existente.id,
      createdAt: existente.createdAt,
      updatedAt: new Date().toISOString(),
    });

    // Grava com merge para preservar campos legados importados das planilhas.
    // Campos limpos pelo usuário são gravados como string vazia (lidos como ausentes).
    const dados: Record<string, unknown> = {
      nome: atualizado.nome,
      tipo: atualizado.tipo,
      ativo: atualizado.ativo,
      updatedAt: atualizado.updatedAt,
      updatedBy: identity.user.id,
    };
    for (const campo of CAMPOS_LIMPAVEIS) {
      dados[campo] = atualizado[campo] ?? '';
    }
    await getServerDb().collection('clients').doc(id).set(dados, { merge: true });

    const mudouStatus = existente.ativo !== atualizado.ativo;
    const acao = mudouStatus
      ? atualizado.ativo
        ? 'REATIVAR_PARCEIRO'
        : 'INATIVAR_PARCEIRO'
      : 'EDITAR_PARCEIRO';
    const verbo = mudouStatus ? (atualizado.ativo ? 'reativado' : 'inativado') : 'atualizado';

    try {
      await getAuditoriaService().registrar({
        quando: atualizado.updatedAt ?? new Date().toISOString(),
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Operador',
        papel: identity.user.role || 'operador',
        acao,
        detalhe: `${TIPO_PARCEIRO_LABELS[atualizado.tipo]} "${atualizado.nome}" ${verbo}`,
        entidade: 'Cliente',
        entidadeId: id,
      });
    } catch (auditErr) {
      console.warn('Falha ao auditar alteração de parceiro:', auditErr);
    }

    return NextResponse.json(atualizado, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
