import { NextResponse } from 'next/server';
import {
  ClienteFiltrosSchema,
  ClienteSchema,
  CreateClienteSchema,
  type Cliente,
} from '@/core/domain/cliente.schema';
import {
  getServerDb,
  parseQueryParams,
  readJson,
  requireIdentity,
  requirePermission,
  semUndefined,
  toErrorResponse,
} from '../api-helpers';
import { clienteFromFirestore } from './cliente-firestore';

/**
 * Converte query params de URL em filtros estruturados e validados pelo Zod.
 */
function parseClienteFiltros(request: Request) {
  const raw = parseQueryParams(request);
  const data: Record<string, unknown> = {};

  if (raw.busca !== undefined && raw.busca.trim() !== '') {
    data.busca = raw.busca.trim();
  }
  if (raw.tipo !== undefined && raw.tipo.trim() !== '') {
    data.tipo = raw.tipo.trim();
  }
  if (raw.apenasAtivos !== undefined) {
    data.apenasAtivos = raw.apenasAtivos === 'true' || raw.apenasAtivos === '1';
  }

  return ClienteFiltrosSchema.parse(data);
}

/**
 * GET /api/clientes
 * Lista clientes e parceiros cadastrados com suporte a busca e filtros por tipo.
 */
export async function GET(request: Request) {
  try {
    await requireIdentity(request);
    const filtros = parseClienteFiltros(request);

    const snapshot = await getServerDb().collection('clients').get();
    let clientes: Cliente[] = snapshot.docs.map((snapDoc) =>
      clienteFromFirestore(snapDoc.id, snapDoc.data())
    );

    // Filtros em memória
    if (filtros.tipo && filtros.tipo !== 'TODOS') {
      clientes = clientes.filter((c) => c.tipo === filtros.tipo);
    }
    if (filtros.apenasAtivos) {
      clientes = clientes.filter((c) => c.ativo !== false);
    }
    if (filtros.busca) {
      const termo = filtros.busca.toLowerCase();
      clientes = clientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          (c.documento && c.documento.toLowerCase().includes(termo)) ||
          (c.cidade && c.cidade.toLowerCase().includes(termo)) ||
          (c.contato && c.contato.toLowerCase().includes(termo))
      );
    }

    // Ordenação alfabética por nome
    clientes.sort((a, b) => a.nome.localeCompare(b.nome));

    return NextResponse.json(
      {
        dados: clientes,
        total: clientes.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/clientes
 * Cadastra um novo cliente, fornecedor ou transportadora.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'catalog:manage');

    const body = await readJson(request);
    const input = CreateClienteSchema.parse(body);

    const id = 'cli-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const now = new Date().toISOString();
    const novoCliente: Cliente = {
      ...input,
      id,
      ativo: input.ativo ?? true,
      createdAt: now,
      updatedAt: now,
    };

    // Valida o schema consolidado
    const validado = ClienteSchema.parse(novoCliente);

    await getServerDb().collection('clients').doc(id).create(semUndefined(validado));

    return NextResponse.json(validado, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
