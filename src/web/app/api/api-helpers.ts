import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { AuthenticatedIdentity } from '@/server/auth/identity';
import {
  hasUserPermission,
  type UserPermission,
} from '@/core/domain/user-authorization';
import {
  podeExecutar,
  ROTULO_PAPEL,
  type AcaoPermissao,
} from '@/core/domain/permissions';
import {
  ItemNaoEncontradoError,
  ItemInativoError,
  ColaboradorNaoEncontradoError,
  ColaboradorInativoError,
  NotaFiscalDuplicadaError,
  MovimentacaoJaEstornadaError,
  MovimentacaoService,
} from '@/core/services/movimentacao.service';
import { SaldoInsuficienteError } from '@/core/services/estoque-calculator';
import { AuditoriaService } from '@/core/services/auditoria.service';
import type { IEstoqueRepository } from '@/core/storage/estoque.repository.interface';
import { adminDb } from '@/server/firebase-admin';
import { FirestoreEstoqueRepository } from '@/server/storage/firestore-estoque.repository';
import { FirestoreAuditoriaRepository } from '@/server/storage/firestore-auditoria.repository';

// ==========================================
// ERROS & EXCEÇÕES DA API
// ==========================================

export class ApiError extends Error {
  readonly status: number;

  constructor(messageOrStatus: string | number, statusOrMessage: number | string = 400) {
    if (typeof messageOrStatus === 'number') {
      super(String(statusOrMessage));
      this.status = messageOrStatus;
    } else {
      super(messageOrStatus);
      this.status = typeof statusOrMessage === 'number' ? statusOrMessage : 400;
    }
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

/**
 * Valida se o usuário autenticado possui a permissão operacional fina requerida (Protótipo 3.0).
 * Lança AuthorizationError (403) com mensagem semântica se não possuir.
 */
export function requireAcaoPermissao(
  identity: AuthenticatedIdentity,
  acao: AcaoPermissao
): void {
  if (!podeExecutar(identity.user.role, acao)) {
    const papel = ROTULO_PAPEL[identity.user.role] || identity.user.role;
    throw new AuthorizationError(`O perfil ${papel} não permite esta ação.`);
  }
}

/**
 * Helper unificado que valida identidade e permissão de ação na requisição.
 */
export async function exigirPermissao(
  request: Request,
  acao: AcaoPermissao
): Promise<AuthenticatedIdentity> {
  const identity = await requireIdentity(request);
  requireAcaoPermissao(identity, acao);
  return identity;
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
    return NextResponse.json(
      { error: error.message, message: error.message },
      { status: error.status }
    );
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

  if (error instanceof MovimentacaoJaEstornadaError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  // Duplicidade de Nota Fiscal na Entrada (409 Conflict)
  if (error instanceof NotaFiscalDuplicadaError) {
    return NextResponse.json(
      {
        error: error.message,
        message: error.message,
        numeroNF: error.numeroNF,
      },
      { status: 409 }
    );
  }

  // Entidade não encontrada (404 Not Found)
  if (error instanceof ItemNaoEncontradoError || error instanceof ColaboradorNaoEncontradoError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
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

  // Erro com statusCode explícito (ex: 401 de autenticação, 409 de conflito).
  // Essas mensagens são escritas para o usuário; erros 5xx também vão para o log.
  if (error instanceof Error && 'statusCode' in error) {
    const statusCode = (error as any).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600) {
      const erroId = statusCode >= 500 ? registrarErroInterno(error) : undefined;
      return NextResponse.json(
        { error: error.message, message: error.message, ...(erroId ? { erroId } : {}) },
        { status: statusCode }
      );
    }
  }

  // Erro interno não tratado (500 Internal Server Error).
  // A mensagem original pode expor detalhes do Firestore ou do servidor, então
  // fica só no log; o cliente recebe um código para localizar o registro.
  const erroId = registrarErroInterno(error);
  const mensagemErro = `Erro interno ao processar a solicitação. Código: ${erroId}`;

  return NextResponse.json(
    { error: mensagemErro, message: mensagemErro, erroId },
    { status: 500 }
  );
}

/**
 * Registra um erro inesperado como uma linha JSON (formato lido pelos logs da Vercel)
 * e devolve um identificador curto para correlacionar com o relato do usuário.
 */
export function registrarErroInterno(error: unknown): string {
  const erroId = crypto.randomUUID().slice(0, 8);
  const err = error instanceof Error ? error : undefined;
  console.error(
    JSON.stringify({
      nivel: 'erro',
      erroId,
      quando: new Date().toISOString(),
      tipo: err?.name ?? typeof error,
      mensagem: err?.message ?? String(error),
      stack: err?.stack,
      causa: err?.cause instanceof Error ? err.cause.message : undefined,
    })
  );
  return erroId;
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
    globalEstoqueRepo = new FirestoreEstoqueRepository();
  }
  return globalEstoqueRepo;
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

// ------------------------------------------
// FIRESTORE DO SERVIDOR (Admin SDK)
// ------------------------------------------

let globalServerDb: import('firebase-admin/firestore').Firestore | null = null;

/**
 * Firestore do servidor (firebase-admin). As rotas de API devem usar esta instância,
 * nunca o SDK de navegador: no servidor não há usuário autenticado no SDK cliente
 * e as regras do Firestore negariam o acesso.
 */
export function getServerDb(): import('firebase-admin/firestore').Firestore {
  const db = globalServerDb || adminDb;
  if (!db || typeof db.collection !== 'function') {
    throw new ApiError('Instância do Firestore não está disponível no servidor.', 500);
  }
  return db;
}

/**
 * Substitui o Firestore do servidor (testes usam um Firestore em memória).
 */
export function setServerDb(db: unknown): void {
  globalServerDb = db as import('firebase-admin/firestore').Firestore | null;
}

/**
 * Remove campos `undefined` (o Admin SDK recusa esses valores).
 */
export function semUndefined<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

// ------------------------------------------
// AUDITORIA OPERACIONAL
// ------------------------------------------

let globalAuditoriaRepo: import('@/core/storage/auditoria.repository.interface').IAuditoriaRepository | null = null;

export function getAuditoriaRepository(): import('@/core/storage/auditoria.repository.interface').IAuditoriaRepository {
  if (!globalAuditoriaRepo) {
    globalAuditoriaRepo = new FirestoreAuditoriaRepository();
  }
  return globalAuditoriaRepo;
}

export function setAuditoriaRepository(
  repo: import('@/core/storage/auditoria.repository.interface').IAuditoriaRepository | null
): void {
  globalAuditoriaRepo = repo;
}

export function getAuditoriaService(repo = getAuditoriaRepository()): AuditoriaService {
  return new AuditoriaService(repo);
}

