import { NextResponse } from 'next/server';
import {
  ReceberMaterialTerceiroSchema,
  type MaterialTerceiro,
  type MovimentacaoTerceiro,
} from '@/core/domain/material-terceiro.schema';
import {
  getServerDb,
  readJson,
  requireIdentity,
  requirePermission,
  semUndefined,
  toErrorResponse,
} from '../api-helpers';
import { buscarDocsPorIds } from '../firestore-lookup';

export interface MaterialTerceiroEnriquecido extends MaterialTerceiro {
  clienteNome: string;
  totalMovimentacoes: number;
}

export interface TerceirosDashboardResponse {
  materiais: MaterialTerceiroEnriquecido[];
  movimentacoesRecentes: (MovimentacaoTerceiro & { materialDescricao: string; clienteNome: string })[];
  kpis: {
    totalMateriais: number;
    saldoTotalItens: number;
    clientesAtivosCount: number;
    movimentacoesMesCount: number;
  };
}

/**
 * GET /api/terceiros
 * Lista os materiais de clientes sob custódia, com saldo atual e dados enriquecidos.
 */
export async function GET(request: Request) {
  try {
    await requireIdentity(request);

    const { searchParams } = new URL(request.url);
    const clienteIdFiltro = searchParams.get('clienteId');
    const busca = searchParams.get('busca')?.toLowerCase().trim();

    const db = getServerDb();
    const [materiaisSnap, movSnap] = await Promise.all([
      db.collection('third_party_materials').get(),
      db.collection('third_party_movements').get(),
    ]);

    // Clientes lidos apenas pelos IDs dos materiais em custódia.
    const clientesDocs = await buscarDocsPorIds(
      db,
      'clients',
      materiaisSnap.docs.map((d) => d.data().clienteId)
    );
    const clientesMap = new Map<string, string>();
    clientesDocs.forEach((data, id) => {
      clientesMap.set(id, String(data.nome || 'Cliente'));
    });

    const materiais: MaterialTerceiro[] = materiaisSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        clienteId: String(data.clienteId || ''),
        descricao: String(data.descricao || ''),
        codigoSku: data.codigoSku ? String(data.codigoSku) : '',
        unidade: String(data.unidade || 'un'),
        saldoAtual: Number(data.saldoAtual) || 0,
        numeroNFRemessa: data.numeroNFRemessa ? String(data.numeroNFRemessa) : undefined,
        createdAt: data.createdAt ? String(data.createdAt) : undefined,
        updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
      };
    });

    const movimentacoes: MovimentacaoTerceiro[] = movSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        materialTerceiroId: String(data.materialTerceiroId || ''),
        tipo: data.tipo,
        quantidade: Number(data.quantidade) || 0,
        saldoAnterior: Number(data.saldoAnterior) || 0,
        saldoResultante: Number(data.saldoResultante) || 0,
        documento: String(data.documento || ''),
        dataMovimentacao: String(data.dataMovimentacao || ''),
        responsavel: String(data.responsavel || ''),
        valorServico: data.valorServico ? Number(data.valorServico) : undefined,
        observacao: data.observacao ? String(data.observacao) : undefined,
        createdAt: data.createdAt ? String(data.createdAt) : undefined,
      };
    });

    // Mapa de contagem de movimentações por material
    const movContagemMap = new Map<string, number>();
    movimentacoes.forEach((m) => {
      movContagemMap.set(m.materialTerceiroId, (movContagemMap.get(m.materialTerceiroId) || 0) + 1);
    });

    // Mapa de descrição do material para enriquecimento do extrato
    const materialInfoMap = new Map<string, { descricao: string; clienteId: string }>();
    materiais.forEach((m) => {
      materialInfoMap.set(m.id, { descricao: m.descricao, clienteId: m.clienteId });
    });

    // Enriquecimento dos Materiais
    let materiaisEnriquecidos: MaterialTerceiroEnriquecido[] = materiais.map((m) => ({
      ...m,
      clienteNome: clientesMap.get(m.clienteId) || 'Cliente não identificado',
      totalMovimentacoes: movContagemMap.get(m.id) || 0,
    }));

    // Filtros
    if (clienteIdFiltro && clienteIdFiltro !== 'TODOS') {
      materiaisEnriquecidos = materiaisEnriquecidos.filter((m) => m.clienteId === clienteIdFiltro);
    }

    if (busca) {
      materiaisEnriquecidos = materiaisEnriquecidos.filter(
        (m) =>
          m.descricao.toLowerCase().includes(busca) ||
          m.codigoSku?.toLowerCase().includes(busca) ||
          m.clienteNome.toLowerCase().includes(busca) ||
          m.numeroNFRemessa?.toLowerCase().includes(busca)
      );
    }

    // Ordenação alfabética por descrição
    materiaisEnriquecidos.sort((a, b) => a.descricao.localeCompare(b.descricao));

    // KPIs Consolidados
    const clientesSet = new Set(materiais.map((m) => m.clienteId));
    const saldoTotalItens = materiais.reduce((acc, curr) => acc + curr.saldoAtual, 0);

    // Enriquecimento das movimentações recentes (últimas 20 ordenadas por data desc)
    const movimentacoesRecentes = movimentacoes
      .map((m) => {
        const mat = materialInfoMap.get(m.materialTerceiroId);
        const clienteNome = mat ? clientesMap.get(mat.clienteId) || 'Cliente' : 'Cliente';
        return {
          ...m,
          materialDescricao: mat ? mat.descricao : 'Material Desconhecido',
          clienteNome,
        };
      })
      .sort((a, b) => b.dataMovimentacao.localeCompare(a.dataMovimentacao) || (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 20);

    const response: TerceirosDashboardResponse = {
      materiais: materiaisEnriquecidos,
      movimentacoesRecentes,
      kpis: {
        totalMateriais: materiais.length,
        saldoTotalItens,
        clientesAtivosCount: clientesSet.size,
        movimentacoesMesCount: movimentacoes.length,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/terceiros
 * Registra o recebimento de material de terceiro enviado por um cliente (Remessa para Industrialização).
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const input = ReceberMaterialTerceiroSchema.parse(body);

    const now = new Date().toISOString();
    const sufixo = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const materialId = `terc-${sufixo}`;
    const movId = `mov-rem-${sufixo}`;

    // 1. Cria a entidade do Material de Terceiro com saldo inicial
    const novoMaterial: MaterialTerceiro = {
      id: materialId,
      clienteId: input.clienteId,
      descricao: input.descricao,
      codigoSku: input.codigoSku || '',
      unidade: input.unidade || 'un',
      saldoAtual: input.quantidade,
      numeroNFRemessa: input.numeroNFRemessa,
      createdAt: now,
      updatedAt: now,
    };

    // 2. Cria a movimentação de entrada (remessa)
    const novaMovimentacao: MovimentacaoTerceiro = {
      id: movId,
      materialTerceiroId: materialId,
      tipo: 'ENTRADA_REMESSA',
      quantidade: input.quantidade,
      saldoAnterior: 0,
      saldoResultante: input.quantidade,
      documento: `NF-e ${input.numeroNFRemessa}`,
      dataMovimentacao: input.dataRecebimento,
      responsavel: input.responsavel || identity.user.name || 'Recebimento',
      observacao: input.observacao,
      createdAt: now,
    };

    // 3. Material e movimentação gravados juntos
    const db = getServerDb();
    const clienteSnap = await db.collection('clients').doc(input.clienteId).get();
    const clienteNome = clienteSnap.exists
      ? String(clienteSnap.data()?.nome || clienteSnap.data()?.razaoSocial || '')
      : undefined;
    const batch = db.batch();
    batch.create(
      db.collection('third_party_materials').doc(materialId),
      semUndefined({ ...novoMaterial, ...(clienteNome ? { clienteNome } : {}) })
    );
    batch.create(db.collection('third_party_movements').doc(movId), semUndefined(novaMovimentacao));
    await batch.commit();

    return NextResponse.json(
      {
        material: novoMaterial,
        movimentacao: novaMovimentacao,
        mensagem: `Material '${input.descricao}' recebido com sucesso com ${input.quantidade} ${input.unidade}.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
