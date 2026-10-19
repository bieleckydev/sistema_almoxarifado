import { NextResponse } from 'next/server';
import {
  ReceberMaterialTerceiroSchema,
  type MaterialTerceiro,
  type MovimentacaoTerceiro,
} from '@/core/domain/material-terceiro.schema';
import {
  ApiError,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../api-helpers';
import { db } from '@/core/services/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import {
  CLIENTES_INICIAIS,
  MATERIAIS_TERCEIROS_INICIAIS,
  MOVIMENTACOES_TERCEIROS_INICIAIS,
} from '@/web/data/mock-almoxarifado';

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

    // 1. Carrega Clientes para resolução de nomes
    const clientesMap = new Map<string, string>();
    try {
      const clientsSnap = await getDocs(collection(db, 'clients'));
      clientsSnap.forEach((d) => {
        clientesMap.set(d.id, String(d.data().nome || 'Cliente'));
      });
    } catch {
      CLIENTES_INICIAIS.forEach((c) => {
        clientesMap.set(c.id, c.nome);
      });
    }

    // 2. Carrega Materiais de Terceiros
    let materiais: MaterialTerceiro[] = [];
    try {
      const snap = await getDocs(collection(db, 'third_party_materials'));
      snap.forEach((d) => {
        const data = d.data();
        materiais.push({
          id: d.id,
          clienteId: String(data.clienteId || ''),
          descricao: String(data.descricao || ''),
          codigoSku: data.codigoSku ? String(data.codigoSku) : '',
          unidade: String(data.unidade || 'un'),
          saldoAtual: Number(data.saldoAtual) || 0,
          numeroNFRemessa: data.numeroNFRemessa ? String(data.numeroNFRemessa) : undefined,
          createdAt: data.createdAt ? String(data.createdAt) : undefined,
          updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
        });
      });
    } catch {
      materiais = [];
    }

    if (materiais.length === 0) {
      materiais = [...MATERIAIS_TERCEIROS_INICIAIS];
    }

    // 3. Carrega Movimentações de Terceiros
    let movimentacoes: MovimentacaoTerceiro[] = [];
    try {
      const movSnap = await getDocs(collection(db, 'third_party_movements'));
      movSnap.forEach((d) => {
        const data = d.data();
        movimentacoes.push({
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
        });
      });
    } catch {
      movimentacoes = [];
    }

    if (movimentacoes.length === 0) {
      movimentacoes = [...MOVIMENTACOES_TERCEIROS_INICIAIS];
    }

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
    const materialId = `terc-${Date.now()}`;
    const movId = `mov-rem-${Date.now()}`;

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

    // 3. Persistência no Firestore
    try {
      await setDoc(doc(db, 'third_party_materials', materialId), novoMaterial);
      await setDoc(doc(db, 'third_party_movements', movId), novaMovimentacao);
    } catch {
      // Ignora falha de gravação remota se Firestore offline
    }

    // Sincroniza em memória
    MATERIAIS_TERCEIROS_INICIAIS.unshift(novoMaterial);
    MOVIMENTACOES_TERCEIROS_INICIAIS.unshift(novaMovimentacao);

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
