import { NextResponse } from 'next/server';
import {
  StatusPedidoSchema,
  type StatusPedido,
  type Pedido,
} from '@/core/domain/pedido.schema';
import type { Movimentacao } from '@/core/domain/movimentacao.schema';
import { calcularNovoSaldo } from '@/core/services/estoque-calculator';
import { ItemInativoError, ItemNaoEncontradoError } from '@/core/services/movimentacao.service';
import { movimentacaoToFirestore } from '@/server/storage/firestore-estoque.mapper';
import {
  ApiError,
  getAuditoriaService,
  getServerDb,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../../api-helpers';
import { pedidoFromDoc, TRANSICOES_PEDIDO } from '../pedido-firestore';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/pedidos/[id]
 * Atualiza o status do pedido (PENDENTE -> SEPARADO -> ENTREGUE, ou CANCELADO).
 *
 * Tudo acontece em uma única transação: o status atual é relido e validado dentro
 * dela, de modo que duas requisições simultâneas não conseguem entregar (e debitar
 * o estoque) duas vezes, nem entregar um pedido já cancelado.
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

    let motivo = '';
    if (novoStatus === 'CANCELADO') {
      motivo = typeof body.motivoCancelamento === 'string' ? body.motivoCancelamento.trim() : '';
      if (motivo.length < 5) {
        throw new ApiError(
          400,
          'Motivo do cancelamento é obrigatório e deve conter no mínimo 5 caracteres.'
        );
      }
    }

    const db = getServerDb();
    const pedidoRef = db.collection('orders').doc(id);
    const now = new Date().toISOString();

    const pedidoAtualizado = await db.runTransaction(async (tx) => {
      const pedidoSnap = await tx.get(pedidoRef);
      if (!pedidoSnap.exists) {
        throw new ApiError(404, `Pedido '${id}' não foi encontrado.`);
      }
      const pedido: Pedido = pedidoFromDoc(pedidoSnap.id, pedidoSnap.data() || {});
      const numero = pedido.numeroSequencial || id;

      if (!TRANSICOES_PEDIDO[pedido.status].includes(novoStatus)) {
        throw new ApiError(
          409,
          `Não é possível mudar o pedido #${numero} de ${pedido.status} para ${novoStatus}.`
        );
      }

      if (novoStatus === 'ENTREGUE') {
        // Soma as quantidades por item (o mesmo item pode aparecer em mais de uma linha).
        const quantidadePorItem = new Map<string, number>();
        for (const it of pedido.itens) {
          quantidadePorItem.set(it.itemId, (quantidadePorItem.get(it.itemId) ?? 0) + it.quantidade);
        }
        const itemIds = [...quantidadePorItem.keys()];
        const itemRefs = itemIds.map((itemId) => db.collection('items').doc(itemId));
        const clientRef = db.collection('clients').doc(pedido.clienteId);
        const [itemSnaps, clientSnap] = await Promise.all([
          Promise.all(itemRefs.map((ref) => tx.get(ref))),
          tx.get(clientRef),
        ]);

        const clientData = (clientSnap.data() || {}) as Record<string, unknown>;
        const clienteNome =
          (typeof clientData.nome === 'string' && clientData.nome.trim()) ||
          (typeof clientData.razaoSocial === 'string' && clientData.razaoSocial.trim()) ||
          (typeof clientData.nomeFantasia === 'string' && clientData.nomeFantasia.trim()) ||
          pedido.clienteId;

        // 1. Valida todos os itens antes de qualquer escrita.
        const operacoes = itemIds.map((itemId, i) => {
          const snap = itemSnaps[i];
          if (!snap.exists) {
            throw new ItemNaoEncontradoError(itemId);
          }
          const itemData = snap.data() || {};
          if (itemData.ativo === false) {
            throw new ItemInativoError(itemId, itemData.codigo || itemId);
          }
          const quantidade = quantidadePorItem.get(itemId)!;
          const saldoAnterior = Number(itemData.estoqueAtual) || 0;
          // Lança SaldoInsuficienteError (422) se faltar estoque.
          const saldoResultante = calcularNovoSaldo(saldoAnterior, 'SAIDA_EXPEDICAO', quantidade, {
            itemId: itemData.codigo || itemId,
          });
          return { itemId, ref: itemRefs[i], quantidade, saldoAnterior, saldoResultante };
        });

        // 2. Debita o saldo e registra a movimentação de expedição de cada item.
        for (const op of operacoes) {
          tx.update(op.ref, { estoqueAtual: op.saldoResultante, updatedAt: now });

          const movimentacao: Movimentacao = {
            id: `mov-exp-${id}-${op.itemId}`,
            itemId: op.itemId,
            tipo: 'SAIDA_EXPEDICAO',
            quantidade: op.quantidade,
            saldoAnterior: op.saldoAnterior,
            saldoResultante: op.saldoResultante,
            dataMovimentacao: now,
            destinatario: clienteNome,
            status: 'ENTREGUE',
            observacao: `Expedição automática para Pedido #${numero} (${clienteNome})`,
            createdAt: now,
          };
          tx.create(db.collection('movements').doc(movimentacao.id), movimentacaoToFirestore(movimentacao));
        }

        tx.update(pedidoRef, { status: 'ENTREGUE', updatedAt: now });
        return { ...pedido, status: 'ENTREGUE' as const, updatedAt: now };
      }

      if (novoStatus === 'CANCELADO') {
        // Regra 3.0: Pedido faturado não pode ser cancelado diretamente
        if (pedido.faturamento) {
          throw new ApiError(
            422,
            'Pedido faturado não pode ser cancelado diretamente. Cancele a nota fiscal primeiro.'
          );
        }
        tx.update(pedidoRef, {
          status: 'CANCELADO',
          motivoCancelamento: motivo,
          canceladoPor: identity.user.name || identity.user.id,
          canceladoEm: now,
          updatedAt: now,
        });
        return { ...pedido, status: 'CANCELADO' as const, motivoCancelamento: motivo, updatedAt: now };
      }

      // Atualização simples de status (ex: PENDENTE -> SEPARADO)
      tx.update(pedidoRef, { status: novoStatus, updatedAt: now });
      return { ...pedido, status: novoStatus, updatedAt: now };
    });

    if (novoStatus === 'CANCELADO' || novoStatus === 'ENTREGUE') {
      try {
        await getAuditoriaService().registrar({
          quando: now,
          usuarioId: identity.user.id,
          usuarioNome: identity.user.name || 'Operador',
          papel: identity.user.role || 'operador',
          acao: novoStatus === 'CANCELADO' ? 'CANCELAMENTO_PEDIDO' : 'ENTREGA_PEDIDO',
          detalhe:
            novoStatus === 'CANCELADO'
              ? `Cancelamento do pedido #${pedidoAtualizado.numeroSequencial || id}: ${motivo}`
              : `Entrega do pedido #${pedidoAtualizado.numeroSequencial || id} com baixa de estoque`,
          entidade: 'Pedido',
          entidadeId: id,
        });
      } catch (auditErr) {
        console.warn('Falha ao registrar auditoria do pedido:', auditErr);
      }
    }

    return NextResponse.json(pedidoAtualizado, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
