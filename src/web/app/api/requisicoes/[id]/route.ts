import { NextResponse } from 'next/server';
import {
  StatusRequisicaoSchema,
  type StatusRequisicao,
  type Requisicao,
} from '@/core/domain/requisicao.schema';
import {
  readJson,
  requireIdentity,
  requireAcaoPermissao,
  toErrorResponse,
  getAuditoriaService,
  getMovimentacaoService,
  ApiError,
} from '../../api-helpers';
import { db } from '@/core/services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { REQUISICOES_MEMORIA } from '../route';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/requisicoes/[id]
 * Altera status da requisição: APROVADA, REJEITADA, ENTREGUE ou CANCELADA.
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

    let reqData: Requisicao | null = null;
    let reqRef: ReturnType<typeof doc> | null = null;

    try {
      reqRef = doc(db, 'requisicoes', id);
      const snap = await getDoc(reqRef);
      if (snap.exists()) {
        reqData = { id: snap.id, ...(snap.data() as any) };
      }
    } catch {
      // Fallback memória
    }

    if (!reqData) {
      reqData = REQUISICOES_MEMORIA.find((r) => r.id === id) || null;
    }

    if (!reqData) {
      throw new ApiError(404, `Requisição '${id}' não encontrada.`);
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status: novoStatus,
      updatedAt: now,
    };

    if (novoStatus === 'APROVADA') {
      requireAcaoPermissao(identity, 'aprovar');
      updatePayload.aprovadoPor = identity.user.name || identity.user.id;
      updatePayload.aprovadoEm = now;
      reqData.aprovadoPor = String(updatePayload.aprovadoPor);
      reqData.aprovadoEm = now;
    } else if (novoStatus === 'REJEITADA') {
      requireAcaoPermissao(identity, 'aprovar');
      const motivo = typeof body.motivoRejeicao === 'string' ? body.motivoRejeicao.trim() : '';
      if (!motivo || motivo.length < 5) {
        throw new ApiError(400, 'Motivo de rejeição deve ter pelo menos 5 caracteres.');
      }
      updatePayload.motivoRejeicao = motivo;
      reqData.motivoRejeicao = motivo;
    } else if (novoStatus === 'ENTREGUE') {
      requireAcaoPermissao(identity, 'mover');
      if (reqData.status !== 'APROVADA') {
        throw new ApiError(422, 'Somente requisições aprovadas podem ser entregues.');
      }

      // Executa baixa física de cada item via MovimentacaoService
      const movService = getMovimentacaoService();
      for (const item of reqData.itens) {
        try {
          await movService.executarBaixaInterna({
            itemId: item.itemId,
            quantidade: item.quantidadeSolicitada,
            colaboradorId: reqData.requisitanteId,
            setor: (reqData.setor as any) || 'PRODUCAO',
            observacao: `Atendimento Requisição #${reqData.numeroSequencial || id}`,
          });
        } catch (movErr) {
          console.warn('Aviso na baixa de item da requisição:', movErr);
        }
      }

      updatePayload.entreguePor = identity.user.name || identity.user.id;
      updatePayload.entregueEm = now;
      reqData.entreguePor = String(updatePayload.entreguePor);
      reqData.entregueEm = now;
    } else if (novoStatus === 'CANCELADA') {
      requireAcaoPermissao(identity, 'requisitar');
    }

    if (reqRef) {
      try {
        await updateDoc(reqRef, updatePayload);
      } catch {
        // Fallback memória
      }
    }

    reqData.status = novoStatus;
    reqData.updatedAt = now;

    // Auditoria
    try {
      await getAuditoriaService().registrar({
        quando: now,
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Operador',
        papel: identity.user.role || 'operador',
        acao: `STATUS_REQUISICAO_${novoStatus}`,
        detalhe: `Requisição #${reqData.numeroSequencial || id} alterada para ${novoStatus}`,
        entidade: 'Requisicao',
        entidadeId: id,
      });
    } catch (auditErr) {
      console.warn('Falha ao auditar status da requisição:', auditErr);
    }

    return NextResponse.json(reqData, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
