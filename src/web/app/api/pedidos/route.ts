import { NextResponse } from 'next/server';
import {
  CreatePedidoSchema,
  PedidoFiltrosSchema,
  type Pedido,
  isPedidoAtrasado,
  hasPedidoFaltaEstoque,
} from '@/core/domain/pedido.schema';
import {
  ApiError,
  parseQueryParams,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../api-helpers';
import { db } from '@/core/services/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { CLIENTES_INICIAIS, PEDIDOS_INICIAIS } from '@/web/data/mock-almoxarifado';

export interface PedidoEnriquecidoItem {
  itemId: string;
  quantidade: number;
  observacao?: string;
  nome: string;
  codigo: string;
  unidade: string;
  estoqueAtual: number;
}

export interface PedidoEnriquecido extends Pedido {
  clienteNome: string;
  itensDetalhes: PedidoEnriquecidoItem[];
  atrasado: boolean;
  faltaEstoque: boolean;
}

/**
 * Converte query params de URL em filtros de pedido.
 */
function parsePedidoFiltros(request: Request) {
  const raw = parseQueryParams(request);
  const data: Record<string, unknown> = {};

  if (raw.busca !== undefined && raw.busca.trim() !== '') {
    data.busca = raw.busca.trim();
  }
  if (raw.clienteId !== undefined && raw.clienteId.trim() !== '') {
    data.clienteId = raw.clienteId.trim();
  }
  if (raw.status !== undefined && raw.status.trim() !== '') {
    data.status = raw.status.trim();
  }
  if (raw.apenasAtrasados !== undefined) {
    data.apenasAtrasados = raw.apenasAtrasados === 'true' || raw.apenasAtrasados === '1';
  }

  return PedidoFiltrosSchema.parse(data);
}

/**
 * GET /api/pedidos
 * Lista todos os pedidos enriquecidos com dados de cliente e itens de estoque.
 */
export async function GET(request: Request) {
  try {
    await requireIdentity(request);
    const filtros = parsePedidoFiltros(request);

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

    // 2. Carrega Itens para cálculo de saldo e resolução de nomes
    const itensMap = new Map<
      string,
      { nome: string; codigo: string; unidade: string; estoqueAtual: number }
    >();
    const estoqueDisponivelMap = new Map<string, number>();

    try {
      const itemsSnap = await getDocs(collection(db, 'items'));
      itemsSnap.forEach((d) => {
        const data = d.data();
        const nome = String(data.descricao || data.nome || 'Produto');
        const codigo = String(data.codigo || '');
        const unidade = String(data.unidade || 'UNIDADE');
        const estoqueAtual = Number(data.estoqueAtual) || 0;

        itensMap.set(d.id, { nome, codigo, unidade, estoqueAtual });
        estoqueDisponivelMap.set(d.id, estoqueAtual);
      });
    } catch {
      // Itens default para cálculo em memória
    }

    // 3. Carrega Pedidos
    let pedidos: PedidoEnriquecido[] = [];

    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      ordersSnap.forEach((d) => {
        const data = d.data();
        const pedidoRaw: Pedido = {
          id: d.id,
          numeroSequencial: Number(data.numeroSequencial) || 1,
          clienteId: String(data.clienteId || ''),
          prazoEntrega: String(data.prazoEntrega || ''),
          status: data.status || 'PENDENTE',
          itens: Array.isArray(data.itens) ? data.itens : [],
          observacoes: data.observacoes || undefined,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };

        const clienteNome = clientesMap.get(pedidoRaw.clienteId) || 'Cliente não identificado';

        const itensDetalhes: PedidoEnriquecidoItem[] = pedidoRaw.itens.map((it) => {
          const itemInfo = itensMap.get(it.itemId);
          return {
            itemId: it.itemId,
            quantidade: it.quantidade,
            observacao: it.observacao,
            nome: itemInfo?.nome || it.observacao || 'Item ' + it.itemId,
            codigo: itemInfo?.codigo || '',
            unidade: itemInfo?.unidade || 'un',
            estoqueAtual: itemInfo?.estoqueAtual ?? 0,
          };
        });

        const atrasado = isPedidoAtrasado(pedidoRaw);
        const faltaEstoque = hasPedidoFaltaEstoque(pedidoRaw, estoqueDisponivelMap);

        pedidos.push({
          ...pedidoRaw,
          clienteNome,
          itensDetalhes,
          atrasado,
          faltaEstoque,
        });
      });
    } catch {
      pedidos = [];
    }

    if (pedidos.length === 0) {
      for (const ped of PEDIDOS_INICIAIS) {
        const clienteNome = clientesMap.get(ped.clienteId) || 'Cliente não identificado';
        const itensDetalhes: PedidoEnriquecidoItem[] = ped.itens.map((it) => {
          const itemInfo = itensMap.get(it.itemId);
          return {
            itemId: it.itemId,
            quantidade: it.quantidade,
            observacao: it.observacao,
            nome: itemInfo?.nome || 'Item ' + it.itemId,
            codigo: itemInfo?.codigo || '',
            unidade: itemInfo?.unidade || 'un',
            estoqueAtual: itemInfo?.estoqueAtual ?? 50,
          };
        });

        pedidos.push({
          ...ped,
          clienteNome,
          itensDetalhes,
          atrasado: isPedidoAtrasado(ped),
          faltaEstoque: hasPedidoFaltaEstoque(ped, estoqueDisponivelMap),
        });
      }
    }

    // Filtros
    if (filtros.status && filtros.status !== 'TODOS') {
      pedidos = pedidos.filter((p) => p.status === filtros.status);
    }
    if (filtros.clienteId) {
      pedidos = pedidos.filter((p) => p.clienteId === filtros.clienteId);
    }
    if (filtros.apenasAtrasados) {
      pedidos = pedidos.filter((p) => p.atrasado);
    }
    if (filtros.busca) {
      const termo = filtros.busca.toLowerCase();
      pedidos = pedidos.filter(
        (p) =>
          String(p.numeroSequencial).includes(termo) ||
          p.id.toLowerCase().includes(termo) ||
          p.clienteNome.toLowerCase().includes(termo) ||
          p.itensDetalhes.some((i) => i.nome.toLowerCase().includes(termo) || i.codigo.toLowerCase().includes(termo))
      );
    }

    // Ordenação idêntica ao protótipo: Não-entregues primeiro, depois por prazo mais próximo
    pedidos.sort((a, b) => {
      const aEntregue = a.status === 'ENTREGUE';
      const bEntregue = b.status === 'ENTREGUE';
      if (aEntregue !== bEntregue) {
        return aEntregue ? 1 : -1;
      }
      return a.prazoEntrega.localeCompare(b.prazoEntrega);
    });

    return NextResponse.json(
      {
        dados: pedidos,
        total: pedidos.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/pedidos
 * Cria um novo pedido de venda com itens dinâmicos.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const input = CreatePedidoSchema.parse(body);

    // Calcula o próximo numeroSequencial
    let maxSeq = 100;
    const ordersSnap = await getDocs(collection(db, 'orders'));
    ordersSnap.forEach((d) => {
      const seq = Number(d.data().numeroSequencial);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    });
    const numeroSequencial = input.numeroSequencial || maxSeq + 1;
    const id = input.id || `order-${numeroSequencial}`;

    const now = new Date().toISOString();
    const novoPedido: Pedido = {
      id,
      numeroSequencial,
      clienteId: input.clienteId,
      prazoEntrega: input.prazoEntrega,
      status: input.status || 'PENDENTE',
      itens: input.itens,
      observacoes: input.observacoes || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'orders', id), novoPedido);

    return NextResponse.json(novoPedido, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
