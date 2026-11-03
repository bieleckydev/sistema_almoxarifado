import { NextResponse } from 'next/server';
import {
  CriarRequisicaoInputSchema,
  JANELA_REQUISICOES_ENCERRADAS_DIAS,
  STATUS_REQUISICAO_ABERTOS,
  type Requisicao,
} from '@/core/domain/requisicao.schema';
import {
  readJson,
  requireIdentity,
  requireAcaoPermissao,
  toErrorResponse,
  getAuditoriaService,
  getServerDb,
  semUndefined,
} from '../api-helpers';

/**
 * GET /api/requisicoes
 * Lista todas as requisições de material.
 */
export async function GET(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requireAcaoPermissao(identity, 'requisitar');

    const { searchParams } = new URL(request.url);
    const historicoCompleto = searchParams.get('historico') === 'completo';
    const colecao = getServerDb().collection('requisicoes');

    // Sem histórico completo: abertas sempre + concluídas criadas dentro da janela.
    let docs;
    if (historicoCompleto) {
      docs = (await colecao.get()).docs;
    } else {
      const corte = new Date();
      corte.setDate(corte.getDate() - JANELA_REQUISICOES_ENCERRADAS_DIAS);
      const [abertas, recentes] = await Promise.all([
        colecao.where('status', 'in', STATUS_REQUISICAO_ABERTOS).get(),
        colecao.where('createdAt', '>=', corte.toISOString()).get(),
      ]);
      const porId = new Map(abertas.docs.map((d) => [d.id, d]));
      for (const d of recentes.docs) porId.set(d.id, d);
      docs = [...porId.values()];
    }
    let dados: Requisicao[] = docs.map((d) => ({ ...(d.data() as Requisicao), id: d.id }));

    const status = searchParams.get('status');
    if (status && status !== 'TODOS') {
      dados = dados.filter((r) => r.status === status);
    }

    // Ordenação decrescente por data
    dados.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      dados,
      total: dados.length,
      historicoCompleto,
      janelaEncerradasDias: historicoCompleto ? null : JANELA_REQUISICOES_ENCERRADAS_DIAS,
      pendentes: dados.filter((r) => r.status === 'PENDENTE').length,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/requisicoes
 * Cria uma nova requisição de material.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requireAcaoPermissao(identity, 'requisitar');

    const body = await readJson(request);
    const input = CriarRequisicaoInputSchema.parse(body);

    const now = new Date().toISOString();
    const db = getServerDb();
    const contadorRef = db.collection('counters').doc('requisicoes');

    // Número sequencial via contador transacional (sem repetição em criações simultâneas).
    const novaReq = await db.runTransaction(async (tx) => {
      const contadorSnap = await tx.get(contadorRef);
      let ultimo: number;
      if (contadorSnap.exists) {
        ultimo = Number(contadorSnap.data()?.ultimo) || 100;
      } else {
        const existentes = await tx.get(db.collection('requisicoes'));
        ultimo = 100;
        existentes.forEach((d) => {
          const seq = Number(d.data().numeroSequencial);
          if (!Number.isNaN(seq) && seq > ultimo) ultimo = seq;
        });
      }

      const numeroSequencial = ultimo + 1;
      const id = `req-${numeroSequencial}`;
      const req: Requisicao = {
        id,
        numeroSequencial,
        requisitanteId: identity.user.id,
        requisitanteNome: identity.user.name || 'Requisitante',
        setor: input.setor,
        prioridade: input.prioridade,
        status: 'PENDENTE',
        itens: input.itens,
        observacao: input.observacao,
        createdAt: now,
        updatedAt: now,
      };

      tx.set(contadorRef, { ultimo: numeroSequencial, updatedAt: now });
      tx.create(db.collection('requisicoes').doc(id), semUndefined(req));
      return req;
    });
    const id = novaReq.id;

    // Auditoria Operacional
    try {
      await getAuditoriaService().registrar({
        quando: now,
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Requisitante',
        papel: identity.user.role || 'requisitante',
        acao: 'CRIACAO_REQUISICAO',
        detalhe: `Requisição #${novaReq.numeroSequencial} criada para o setor ${novaReq.setor} com ${novaReq.itens.length} item(ns)`,
        entidade: 'Requisicao',
        entidadeId: id,
      });
    } catch (auditErr) {
      console.warn('Falha ao auditar criação de requisição:', auditErr);
    }

    return NextResponse.json(novaReq, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
