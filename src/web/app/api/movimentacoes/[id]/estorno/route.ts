import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getMovimentacaoService,
  getAuditoriaService,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../../api-helpers';

interface EstornoRouteContext {
  params: Promise<{ id: string }>;
}

const EstornoSchema = z.object({
  motivo: z.string().min(3, 'O motivo do estorno deve conter ao menos 3 caracteres'),
});

/**
 * POST /api/movimentacoes/[id]/estorno
 * Estorna uma movimentação física anterior, revertendo seu impacto no saldo
 * e registrando o histórico com auditoria operacional completa.
 * Requer permissão 'stock:operate'.
 */
export async function POST(request: Request, context: EstornoRouteContext) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const { id } = await context.params;
    const body = await readJson(request);
    const { motivo } = EstornoSchema.parse(body);

    const service = getMovimentacaoService();
    const movimentacaoEstorno = await service.executarEstorno(id, motivo, {
      id: identity.user.id,
      nome: identity.user.name || 'Almoxarife',
      papel: identity.user.role || 'operador',
    });

    // Auditoria Operacional (3.0)
    try {
      await getAuditoriaService().registrar({
        quando: new Date().toISOString(),
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Almoxarife',
        papel: identity.user.role || 'operador',
        acao: 'ESTORNO_MOVIMENTACAO',
        detalhe: `Estorno da movimentação ${id}: "${motivo}". Novo saldo: ${movimentacaoEstorno.saldoResultante}`,
        entidade: 'Movimentacao',
        entidadeId: movimentacaoEstorno.id,
      });
    } catch (auditErr) {
      console.warn('Falha ao auditar estorno de movimentação:', auditErr);
    }

    return NextResponse.json(
      {
        mensagem: 'Movimentação estornada com sucesso.',
        movimentacao: movimentacaoEstorno,
      },
      { status: 200 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
