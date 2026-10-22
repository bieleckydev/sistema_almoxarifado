import { NextResponse } from 'next/server';
import {
  StatusRequisicaoSchema,
  type StatusRequisicao,
  type Requisicao,
} from '@/core/domain/requisicao.schema';
import type { Movimentacao } from '@/core/domain/movimentacao.schema';
import { calcularNovoSaldo } from '@/core/services/estoque-calculator';
import { ItemInativoError, ItemNaoEncontradoError } from '@/core/services/movimentacao.service';
import { movimentacaoToFirestore } from '@/server/storage/firestore-estoque.mapper';
import {
  readJson,
  requireIdentity,
  requireAcaoPermissao,
  toErrorResponse,
  getAuditoriaService,
  getServerDb,
  ApiError,
} from '../../api-helpers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Transições permitidas. REJEITADA, ENTREGUE e CANCELADA são finais. */
const TRANSICOES: Record<StatusRequisicao, StatusRequisicao[]> = {
  PENDENTE: ['APROVADA', 'REJEITADA', 'CANCELADA'],
  APROVADA: ['ENTREGUE', 'CANCELADA'],
  REJEITADA: [],
  ENTREGUE: [],
  CANCELADA: [],
};

/**
 * PATCH /api/requisicoes/[id]
 * Altera status da requisição: APROVADA, REJEITADA, ENTREGUE ou CANCELADA.
 *
 * O status atual é relido dentro de uma transação. Na entrega, a baixa de todos os
 * itens e a mudança para ENTREGUE acontecem juntas: se faltar estoque de qualquer
 * item, nada é gravado e a requisição continua APROVADA.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const identity = await requireIdentity(request);
    const { id } = await context.params;

    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (!body || !body.status) {
      throw new ApiError(400, 'Status da requisição é obrigatório.');
    }

    const novoStatus: StatusRequisicao = StatusRequisicaoSchema.parse(body.status);

    let motivoRejeicao = '';
    if (novoStatus === 'APROVADA' || novoStatus === 'REJEITADA') {
      requireAcaoPermissao(identity, 'aprovar');
    } else if (novoStatus === 'ENTREGUE') {
      requireAcaoPermissao(identity, 'mover');
    } else if (novoStatus === 'CANCELADA') {
      requireAcaoPermissao(identity, 'requisitar');
    }
    if (novoStatus === 'REJEITADA') {
      motivoRejeicao = typeof body.motivoRejeicao === 'string' ? body.motivoRejeicao.trim() : '';
      if (motivoRejeicao.length < 5) {
        throw new ApiError(400, 'Motivo de rejeição deve ter pelo menos 5 caracteres.');
      }
    }

    const db = getServerDb();
    const reqRef = db.collection('requisicoes').doc(id);
    const now = new Date().toISOString();
    const responsavel = identity.user.name || identity.user.id;

    const reqAtualizada = await db.runTransaction(async (tx) => {
      const snap = await tx.get(reqRef);
      if (!snap.exists) {
        throw new ApiError(404, `Requisição '${id}' não encontrada.`);
      }
      const reqData = { ...(snap.data() as Requisicao), id: snap.id };
      const numero = reqData.numeroSequencial || id;

      if (!TRANSICOES[reqData.status]?.includes(novoStatus)) {
        throw new ApiError(
          409,
          `Não é possível mudar a requisição #${numero} de ${reqData.status} para ${novoStatus}.`
        );
      }

      const updatePayload: Record<string, unknown> = { status: novoStatus, updatedAt: now };

      if (novoStatus === 'APROVADA') {
        updatePayload.aprovadoPor = responsavel;
        updatePayload.aprovadoEm = now;
      } else if (novoStatus === 'REJEITADA') {
        updatePayload.motivoRejeicao = motivoRejeicao;
      } else if (novoStatus === 'ENTREGUE') {
        // Soma as quantidades por item e lê todos os itens antes de escrever.
        const quantidadePorItem = new Map<string, number>();
        for (const item of reqData.itens) {
          quantidadePorItem.set(
            item.itemId,
            (quantidadePorItem.get(item.itemId) ?? 0) + item.quantidadeSolicitada
          );
        }
        const itemIds = [...quantidadePorItem.keys()];
        const itemRefs = itemIds.map((itemId) => db.collection('items').doc(itemId));
        const itemSnaps = await Promise.all(itemRefs.map((ref) => tx.get(ref)));

        const operacoes = itemIds.map((itemId, i) => {
          const itemSnap = itemSnaps[i];
          if (!itemSnap.exists) {
            throw new ItemNaoEncontradoError(itemId);
          }
          const itemData = itemSnap.data() || {};
          if (itemData.ativo === false) {
            throw new ItemInativoError(itemId, itemData.codigo || itemId);
          }
          const quantidade = quantidadePorItem.get(itemId)!;
          const saldoAnterior = Number(itemData.estoqueAtual) || 0;
          // Lança SaldoInsuficienteError (422) se faltar estoque.
          const saldoResultante = calcularNovoSaldo(saldoAnterior, 'SAIDA_CONSUMO_INTERNO', quantidade, {
            itemId: itemData.codigo || itemId,
          });
          return { itemId, ref: itemRefs[i], quantidade, saldoAnterior, saldoResultante };
        });

        for (const op of operacoes) {
          tx.update(op.ref, { estoqueAtual: op.saldoResultante, updatedAt: now });
          const movimentacao: Movimentacao = {
            id: `mov-req-${id}-${op.itemId}`,
            itemId: op.itemId,
            tipo: 'SAIDA_CONSUMO_INTERNO',
            quantidade: op.quantidade,
            saldoAnterior: op.saldoAnterior,
            saldoResultante: op.saldoResultante,
            dataMovimentacao: now,
            colaboradorId: reqData.requisitanteId,
            colaboradorNome: reqData.requisitanteNome,
            observacao: `Atendimento Requisição #${numero} (setor ${reqData.setor}). Entregue por ${responsavel}.`,
            createdAt: now,
          };
          tx.create(db.collection('movements').doc(movimentacao.id), movimentacaoToFirestore(movimentacao));
        }

        updatePayload.entreguePor = responsavel;
        updatePayload.entregueEm = now;
      }

      tx.update(reqRef, updatePayload);
      return { ...reqData, ...updatePayload } as Requisicao;
    });

    try {
      await getAuditoriaService().registrar({
        quando: now,
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Operador',
        papel: identity.user.role || 'operador',
        acao: `STATUS_REQUISICAO_${novoStatus}`,
        detalhe: `Requisição #${reqAtualizada.numeroSequencial || id} alterada para ${novoStatus}`,
        entidade: 'Requisicao',
        entidadeId: id,
      });
    } catch (auditErr) {
      console.warn('Falha ao auditar status da requisição:', auditErr);
    }

    return NextResponse.json(reqAtualizada, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
