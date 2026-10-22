import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ApiError,
  readJson,
  requireIdentity,
  requirePermission,
  getAuditoriaService,
  getServerDb,
  toErrorResponse,
} from '../../../../api-helpers';

interface CancelarNotaContext {
  params: Promise<{ id: string }>;
}

const CancelarNotaSchema = z.object({
  motivo: z.string().min(3, 'O motivo do cancelamento deve conter no mínimo 3 caracteres'),
});

/**
 * POST /api/faturamento/notas/[id]/cancelar
 * Cancela uma nota fiscal emitida e retorna o pedido vinculado ao status "A faturar".
 * Requer permissão 'stock:operate'.
 *
 * Nota e pedido são atualizados na mesma transação; um segundo cancelamento
 * simultâneo encontra a nota já CANCELADA e é recusado.
 */
export async function POST(request: Request, context: CancelarNotaContext) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const { id } = await context.params;
    const body = await readJson(request);
    const { motivo } = CancelarNotaSchema.parse(body);
    const motivoLimpo = motivo.trim();

    const db = getServerDb();
    const invoiceRef = db.collection('invoices').doc(id);
    const now = new Date().toISOString();

    const notaFiscal = await db.runTransaction(async (tx): Promise<Record<string, any> & { id: string }> => {
      const snap = await tx.get(invoiceRef);
      if (!snap.exists) {
        throw new ApiError(404, `Nota fiscal "${id}" não encontrada para cancelamento.`);
      }
      const nota: Record<string, any> & { id: string } = { ...(snap.data() || {}), id: snap.id };

      if (nota.status === 'CANCELADA') {
        throw new ApiError(409, 'Esta nota fiscal já está cancelada.');
      }

      // Leitura do pedido vinculado antes de qualquer escrita (regra das transações).
      const orderRef = nota.pedidoId ? db.collection('orders').doc(String(nota.pedidoId)) : null;
      const orderSnap = orderRef ? await tx.get(orderRef) : null;

      const dadosCancelamento = {
        status: 'CANCELADA',
        motivoCancelamento: motivoLimpo,
        canceladaEm: now,
        canceladaPor: identity.user.name || 'Almoxarife',
        updatedAt: now,
      };
      tx.update(invoiceRef, dadosCancelamento);

      // Desvincula o faturamento só se o pedido ainda aponta para esta nota.
      if (orderRef && orderSnap?.exists) {
        const faturamento = orderSnap.data()?.faturamento;
        if (faturamento && String(faturamento.numeroNFe) === String(nota.numeroNF)) {
          tx.update(orderRef, { faturamento: null, updatedAt: now });
        }
      }

      return { ...nota, ...dadosCancelamento };
    });

    try {
      await getAuditoriaService().registrar({
        quando: now,
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Almoxarife',
        papel: identity.user.role || 'operador',
        acao: 'CANCELAR_NFE',
        detalhe: `Nota fiscal nº ${notaFiscal.numeroNF} cancelada: "${motivoLimpo}". Pedido vinculado: ${notaFiscal.pedidoId || 'Nenhum'}.`,
        entidade: 'NotaFiscalEmitida',
        entidadeId: notaFiscal.id,
      });
    } catch (auditErr) {
      console.warn('Falha ao auditar cancelamento de NF-e:', auditErr);
    }

    return NextResponse.json(
      {
        mensagem: `Nota fiscal nº ${notaFiscal.numeroNF} cancelada com sucesso. Pedido retornado para fila de faturamento.`,
        notaFiscal,
      },
      { status: 200 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
