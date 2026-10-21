import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ApiError,
  readJson,
  requireIdentity,
  requirePermission,
  getAuditoriaService,
  toErrorResponse,
} from '../../../../api-helpers';
import { db } from '@/core/services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { NOTAS_INICIAIS, PEDIDOS_INICIAIS } from '@/web/data/mock-almoxarifado';

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
 */
export async function POST(request: Request, context: CancelarNotaContext) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const { id } = await context.params;
    const body = await readJson(request);
    const { motivo } = CancelarNotaSchema.parse(body);

    const now = new Date().toISOString();

    // 1. Busca a nota fiscal
    const invoiceDocRef = doc(db, 'invoices', id);
    let notaFiscal: any = null;

    try {
      const snap = await getDoc(invoiceDocRef);
      if (snap.exists()) {
        notaFiscal = { id: snap.id, ...snap.data() };
      }
    } catch {
      // Ignora erro se firestore offline
    }

    if (!notaFiscal) {
      notaFiscal = NOTAS_INICIAIS.find((n) => n.id === id) || null;
    }

    if (!notaFiscal) {
      throw new ApiError(404, `Nota fiscal "${id}" não encontrada para cancelamento.`);
    }

    if (notaFiscal.status === 'CANCELADA') {
      throw new ApiError(400, 'Esta nota fiscal já está cancelada.');
    }

    // 2. Atualiza a nota fiscal para CANCELADA
    const dadosAtualizadosNota = {
      status: 'CANCELADA',
      motivoCancelamento: motivo.trim(),
      canceladaEm: now,
      canceladaPor: identity.user.name || 'Almoxarife',
      updatedAt: now,
    };

    try {
      await updateDoc(invoiceDocRef, dadosAtualizadosNota);
    } catch {
      // Ignora erro offline
    }

    Object.assign(notaFiscal, dadosAtualizadosNota);
    const memNota = NOTAS_INICIAIS.find((n) => n.id === id);
    if (memNota) {
      Object.assign(memNota, dadosAtualizadosNota);
    }

    // 3. Se houver pedido vinculado, desvincula o faturamento para permitir novo faturamento
    if (notaFiscal.pedidoId) {
      const orderDocRef = doc(db, 'orders', notaFiscal.pedidoId);
      try {
        await updateDoc(orderDocRef, {
          faturamento: null,
          updatedAt: now,
        });
      } catch {
        // Ignora erro offline
      }

      const memPed = PEDIDOS_INICIAIS.find((p) => p.id === notaFiscal.pedidoId);
      if (memPed) {
        delete (memPed as any).faturamento;
        memPed.updatedAt = now;
      }
    }

    // 4. Registro de Auditoria Operacional
    try {
      await getAuditoriaService().registrar({
        quando: now,
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Almoxarife',
        papel: identity.user.role || 'operador',
        acao: 'CANCELAR_NFE',
        detalhe: `Nota fiscal nº ${notaFiscal.numeroNF} cancelada: "${motivo}". Pedido vinculado: ${notaFiscal.pedidoId || 'Nenhum'}.`,
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
