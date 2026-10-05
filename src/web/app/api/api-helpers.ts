import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import {
  hasUserPermission,
  type UserPermission,
} from '@/core/domain/user-authorization';
import {
  ItemNaoEncontradoError,
  ItemInativoError,
  ColaboradorNaoEncontradoError,
  ColaboradorInativoError,
  LoteEstoqueInsuficienteError,
  MovimentacaoService,
} from '@/core/services/movimentacao.service';
import { SaldoInsuficienteError } from '@/core/services/estoque-calculator';
import type { IEstoqueRepository } from '@/core/storage/estoque.repository.interface';

// ==========================================
// ERROS & EXCEÇÕES DA API
// ==========================================

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AuthorizationError extends Error {
  readonly statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// ==========================================
// AUTENTICAÇÃO E AUTORIZAÇÃO (RBAC)
// ==========================================

let identityAuthenticatorMock: ((request: Request) => Promise<AuthenticatedIdentity>) | null = null;

/**
 * Permite definir um autenticador customizado para testes unitários.
 */
export function setIdentityAuthenticator(
  fn: ((request: Request) => Promise<AuthenticatedIdentity>) | null
): void {
  identityAuthenticatorMock = fn;
}

/**
 * Valida o token Bearer do cabeçalho Authorization e retorna a identidade do usuário autenticado.
 * Carrega o autenticador sob demanda para compatibilidade com ambientes de teste.
 */
export async function requireIdentity(request: Request): Promise<AuthenticatedIdentity> {
  if (identityAuthenticatorMock) {
    return identityAuthenticatorMock(request);
  }
  const { authenticateIdentity } = await import('@/server/auth/identity');
  return authenticateIdentity(request.headers.get('authorization'));
}

/**
 * Valida se o usuário autenticado possui a permissão de domínio requerida.
 * Lança AuthorizationError (403) caso não possua.
 */
export function requirePermission(
  identity: AuthenticatedIdentity,
  permission: UserPermission
): void {
  if (!hasUserPermission(identity.user, permission)) {
    throw new AuthorizationError(`Permissão insuficiente para: ${permission}.`);
  }
}

// ==========================================
// PARSERS E HELPERS HTTP
// ==========================================

/**
 * Lê e valida o corpo da requisição como JSON.
 * Lança ApiError (400) se o corpo não for um JSON bem formado.
 */
export async function readJson<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError('Corpo JSON inválido ou mal formatado.', 400);
  }
}

/**
 * Converte query searchParams de uma URL em um objeto plano de chave-valor.
 */
export function parseQueryParams(request: Request): Record<string, string> {
  const url = new URL(request.url);
  return Object.fromEntries(url.searchParams.entries());
}

// ==========================================
// TRATAMENTO UNIFICADO DE RESPOSTAS DE ERRO
// ==========================================

/**
 * Mapeia exceções técnicas e de negócio para respostas HTTP semânticas padronizadas.
 */
export function toErrorResponse(error: unknown): NextResponse {
  // Erro customizado da API
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  // Falha de validação Zod (400 Bad Request)
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Dados inválidos.',
        details: error.issues.map((issue) => ({
          campo: issue.path.join('.'),
          mensagem: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  // Entidade não encontrada (404 Not Found)
  if (error instanceof ItemNaoEncontradoError || error instanceof ColaboradorNaoEncontradoError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Lote de retirada com itens insuficientes (422 Unprocessable Entity com detalhes)
  if (error instanceof LoteEstoqueInsuficienteError) {
    return NextResponse.json(
      {
        error: error.message,
        itensComProblema: error.itensComProblema,
      },
      { status: 422 }
    );
  }

  // Erros de regra de negócio de estoque (422 Unprocessable Entity)
  if (
    error instanceof SaldoInsuficienteError ||
    error instanceof ItemInativoError ||
    error instanceof ColaboradorInativoError
  ) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  // Permissão negada / Não autorizado (403 Forbidden)
  if (error instanceof AuthorizationError || (error instanceof Error && (error as any).statusCode === 403)) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }

  // Erro com statusCode explícito (ex: 401 de autenticação)
  if (error instanceof Error && 'statusCode' in error) {
    const statusCode = (error as any).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600) {
      return NextResponse.json({ error: error.message }, { status: statusCode });
    }
  }

  // Erro interno não tratado (500 Internal Server Error)
  console.error('Erro interno na API:', error);
  return NextResponse.json(
    { error: 'Erro interno ao processar a solicitação.' },
    { status: 500 }
  );
}

// ==========================================
// INJEÇÃO DE DEPENDÊNCIA (DI)
// ==========================================

let globalEstoqueRepo: IEstoqueRepository | null = null;

/**
 * Obtém a instância de IEstoqueRepository para uso nas rotas de API.
 * Por padrão instancia o FirestoreEstoqueRepository de forma preguiçosa.
 */
export function getEstoqueRepository(): IEstoqueRepository {
  if (!globalEstoqueRepo) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { FirestoreEstoqueRepository } = require('@/server/storage/firestore-estoque.repository');
    globalEstoqueRepo = new FirestoreEstoqueRepository();
  }
  return globalEstoqueRepo!;
}

/**
 * Substitui o repositório padrão de estoque (útil em testes unitários e de integração).
 */
export function setEstoqueRepository(repo: IEstoqueRepository | null): void {
  globalEstoqueRepo = repo;
}

/**
 * Obtém a instância de MovimentacaoService vinculada ao repositório ativo.
 */
export function getMovimentacaoService(
  repo: IEstoqueRepository = getEstoqueRepository()
): MovimentacaoService {
  return new MovimentacaoService(repo);
}
