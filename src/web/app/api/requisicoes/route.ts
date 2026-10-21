import { NextResponse } from 'next/server';
import {
  CriarRequisicaoInputSchema,
  type Requisicao,
} from '@/core/domain/requisicao.schema';
import {
  readJson,
  requireIdentity,
  requireAcaoPermissao,
  toErrorResponse,
  getAuditoriaService,
} from '../api-helpers';
import { db } from '@/core/services/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

// Armazenamento em memória caso offline
export let REQUISICOES_MEMORIA: Requisicao[] = [
  {
    id: 'req-001',
    numeroSequencial: 101,
    requisitanteId: 'usr-linha1',
    requisitanteNome: 'Carlos Eduardo (Linha de Montagem)',
    setor: 'Montagem',
    prioridade: 'URGENTE',
    status: 'PENDENTE',
    itens: [
      {
        itemId: 'mp-aco-1020',
        codigo: 'MP-001',
        descricao: 'Chapa de Aço 1020 2mm',
        unidade: 'CHAPA',
        quantidadeSolicitada: 5,
      },
    ],
    observacao: 'Reposição para lote de produção 2026-B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'req-002',
    numeroSequencial: 102,
    requisitanteId: 'usr-manut',
    requisitanteNome: 'Marcos Silva (Manutenção)',
    setor: 'Manutenção',
    prioridade: 'NORMAL',
    status: 'APROVADA',
    itens: [
      {
        itemId: 'imp-graxa',
        codigo: 'IMP-002',
        descricao: 'Graxa Branca de Lítio',
        unidade: 'TUBO',
        quantidadeSolicitada: 2,
      },
    ],
    observacao: 'Manutenção preventiva torno 03',
    aprovadoPor: 'Gestor de Estoque',
    aprovadoEm: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let seqCounter = 103;

/**
 * GET /api/requisicoes
 * Lista todas as requisições de material.
 */
export async function GET(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requireAcaoPermissao(identity, 'requisitar');

    let dados: Requisicao[] = [];

    try {
      const snap = await getDocs(collection(db, 'requisicoes'));
      if (!snap.empty) {
        dados = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      }
    } catch {
      // Fallback memória
    }

    if (dados.length === 0) {
      dados = [...REQUISICOES_MEMORIA];
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    if (status && status !== 'TODOS') {
      dados = dados.filter((r) => r.status === status);
    }

    // Ordenação decrescente por data
    dados.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      dados,
      total: dados.length,
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
    const id = `req-${Date.now()}`;
    const novaReq: Requisicao = {
      id,
      numeroSequencial: seqCounter++,
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

    try {
      await setDoc(doc(db, 'requisicoes', id), novaReq);
    } catch {
      // Ignora falha de rede
    }

    REQUISICOES_MEMORIA.unshift(novaReq);

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
