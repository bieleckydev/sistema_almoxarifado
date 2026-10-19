import { NextResponse } from 'next/server';
import {
  StatusPedidoSchema,
  type StatusPedido,
  type Pedido,
} from '@/core/domain/pedido.schema';
import {
  ApiError,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';
import { db } from '@/core/services/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  setDoc,
  runTransaction,
} from 'firebase/firestore';
import { PEDIDOS_INICIAIS } from '@/web/data/mock-almoxarifado';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/pedidos/[id]
 * Atualiza o status do pedido (PENDENTE -> SEPARADO -> ENTREGUE).
 * Se a transição for para 'ENTREGUE', valida o saldo de cada item e debita atomicamente o estoque.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const { id } = await context.params;
    const body = (await readJson(request)) as Record<string, unknown> | null;

    if (!body || typeof body !== 'object' || !body.status) {
      throw new ApiError(400, 'Status do pedido é obrigatório para atualização.');
    }

    const novoStatus: StatusPedido = StatusPedidoSchema.parse(body.status);

    let pedidoData: Pedido | null = null;
    let pedidoRef: ReturnType<typeof doc> | null = null;

    try {
      pedidoRef = doc(db, 'orders', id);
      const pedidoSnap = await getDoc(pedidoRef);
      if (pedidoSnap.exists()) {
        pedidoData = { id: pedidoSnap.id, ...(pedidoSnap.data() as any) };
      }
    } catch {
      // Fallback para memória quando Firestore offline
    }

    if (!pedidoData) {
      pedidoData = PEDIDOS_INICIAIS.find((p) => p.id === id) || null;
    }

    if (!pedidoData) {
      throw new ApiError(404, `Pedido '${id}' não foi encontrado.`);
    }

    const now = new Date().toISOString();

    if (novoStatus === 'ENTREGUE') {
      // Transação atômica para validar disponibilidade e debitar estoque de todos os itens do pedido
      await runTransaction(db, async (transaction) => {
        const itemSnaps = await Promise.all(
          pedidoData.itens.map((it) => transaction.get(doc(db, 'items', it.itemId)))
        );

        // 1. Validação prévia de todos os itens antes de qualquer mutação
        for (let i = 0; i < pedidoData.itens.length; i++) {
          const itemReq = pedidoData.itens[i];
          const snap = itemSnaps[i];

          if (!snap.exists()) {
            throw new ApiError(`Item '${itemReq.itemId}' do pedido não encontrado no estoque.`, 404);
          }

          const itemData = snap.data();
          const estoqueAtual = Number(itemData.estoqueAtual) || 0;
          const nomeItem = String(itemData.descricao || itemData.nome || itemReq.itemId);

          if (estoqueAtual < itemReq.quantidade) {
            throw new ApiError(
              `Estoque insuficiente de ${nomeItem} para o pedido #${pedidoData.numeroSequencial || id}. Disponível: ${estoqueAtual}, Requisitado: ${itemReq.quantidade}.`,
              422
            );
          }
        }

        // 2. Debita o saldo físico de cada item e grava a movimentação de expedição
        for (let i = 0; i < pedidoData.itens.length; i++) {
          const itemReq = pedidoData.itens[i];
          const snap = itemSnaps[i];
          const itemData = snap.data();
          if (!itemData) {
            throw new ApiError(`Dados do item '${itemReq.itemId}' indisponíveis.`, 404);
          }
          const estoqueAtual = Number(itemData.estoqueAtual) || 0;
          const novoSaldo = Math.max(0, estoqueAtual - itemReq.quantidade);

          const itemRef = doc(db, 'items', itemReq.itemId);
          transaction.update(itemRef, {
            estoqueAtual: novoSaldo,
            updatedAt: now,
          });

          const movId = `mov-exp-${id}-${itemReq.itemId}-${Date.now()}`;
          const movRef = doc(db, 'movements', movId);
          transaction.set(movRef, {
            id: movId,
            itemId: itemReq.itemId,
            tipo: 'SAIDA_EXPEDICAO',
            quantidade: itemReq.quantidade,
            saldoAnterior: estoqueAtual,
            saldoNovo: novoSaldo,
            clienteId: pedidoData.clienteId,
            numeroPedido: String(pedidoData.numeroSequencial || id),
            observacoes: `Expedição automática para Pedido #${pedidoData.numeroSequencial || id}`,
            dataMovimentacao: now,
            createdAt: now,
          });
        }

        // 3. Atualiza o status do pedido para ENTREGUE
        if (pedidoRef) {
          transaction.update(pedidoRef, {
            status: 'ENTREGUE',
            updatedAt: now,
          });
        }
      });
      pedidoData.status = 'ENTREGUE';
      pedidoData.updatedAt = now;
    } else {
      // Atualização simples de status (ex: PENDENTE -> SEPARADO)
      if (pedidoRef) {
        try {
          await updateDoc(pedidoRef, {
            status: novoStatus,
            updatedAt: now,
          });
        } catch {
          // Ignora falha do Firestore e atualiza em memória
        }
      }
      pedidoData.status = novoStatus;
      pedidoData.updatedAt = now;
    }

    return NextResponse.json(
      {
        ...pedidoData,
        id,
        status: novoStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
