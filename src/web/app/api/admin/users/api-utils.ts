import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  authenticateIdentity,
  type AuthenticatedIdentity,
} from '@/server/auth/identity';

export async function requireIdentity(request: Request): Promise<AuthenticatedIdentity> {
  return authenticateIdentity(request.headers.get('authorization'));
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError('Corpo JSON inválido.', 400);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: 'Dados inválidos.',
      details: error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    }, { status: 400 });
  }
  if (error instanceof Error && 'statusCode' in error) {
    const statusCode = error.statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600) {
      return NextResponse.json({ error: error.message }, { status: statusCode });
    }
  }
  console.error('Erro não tratado na API administrativa.', error);
  return NextResponse.json({ error: 'Erro interno ao processar a solicitação.' }, { status: 500 });
}
