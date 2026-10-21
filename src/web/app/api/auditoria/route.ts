import { NextResponse } from 'next/server';
import {
  getAuditoriaService,
  requireIdentity,
  requireAcaoPermissao,
  toErrorResponse,
} from '../api-helpers';

/**
 * GET /api/auditoria
 * Retorna os eventos de auditoria operacional do sistema.
 * Requer permissão de 'auditar' (Mestre ou Administrador/Gestor).
 */
export async function GET(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requireAcaoPermissao(identity, 'auditar');

    const { searchParams } = new URL(request.url);
    const acao = searchParams.get('acao') || undefined;
    const usuarioId = searchParams.get('usuarioId') || undefined;
    const limite = searchParams.get('limite')
      ? parseInt(searchParams.get('limite')!, 10)
      : 100;

    const service = getAuditoriaService();
    const eventos = await service.listar({
      acao,
      usuarioId,
      limite,
    });

    return NextResponse.json({
      dados: eventos,
      total: eventos.length,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
