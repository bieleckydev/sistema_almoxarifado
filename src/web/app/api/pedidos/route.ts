import { NextResponse } from 'next/server';
import {
  CreatePedidoSchema,
  PedidoFiltrosSchema,
  type Pedido,
  isPedidoAtrasado,
  hasPedidoFaltaEstoque,
  calcularTotalPedido,
} from '@/core/domain/pedido.schema';
import {
  ApiError,
  getServerDb,
  parseQueryParams,
  readJson,
  requireIdentity,
  requirePermission,
  semUndefined,
  toErrorResponse,
} from '../api-helpers';
import { pedidoFromDoc } from './pedido-firestore';

export interface PedidoEnriquecidoItem {
  itemId: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
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
    const db = getServerDb();

    const [clientsSnap, itemsSnap, ordersSnap] = await Promise.all([
      db.collection('clients').get(),
      db.collection('items').get(),
      db.collection('orders').get(),
    ]);

    const clientesMap = new Map<string, string>();
    clientsSnap.forEach((d) => {
      clientesMap.set(d.id, String(d.data().nome || 'Cliente'));
    });

    const itensMap = new Map<
      string,
      { nome: string; codigo: string; unidade: string; estoqueAtual: number }
    >();
    const estoqueDisponivelMap = new Map<string, number>();
    itemsSnap.forEach((d) => {
      const data = d.data();
      const estoqueAtual = Number(data.estoqueAtual) || 0;
      itensMap.set(d.id, {
        nome: String(data.descricao || data.nome || 'Produto'),
        codigo: String(data.codigo || ''),
        unidade: String(data.unidade || 'UNIDADE'),
        estoqueAtual,
      });
      estoqueDisponivelMap.set(d.id, estoqueAtual);
    });

    let pedidos: PedidoEnriquecido[] = ordersSnap.docs.map((d) => {
      const pedidoRaw = pedidoFromDoc(d.id, d.data());
      const itensDetalhes: PedidoEnriquecidoItem[] = pedidoRaw.itens.map((it) => {
        const itemInfo = itensMap.get(it.itemId);
        const precoUnitario = it.precoUnitario || 0;
        return {
          itemId: it.itemId,
          quantidade: it.quantidade,
          precoUnitario,
          subtotal: it.quantidade * precoUnitario,
          observacao: it.observacao,
          nome: itemInfo?.nome || it.observacao || 'Item ' + it.itemId,
          codigo: itemInfo?.codigo || '',
          unidade: itemInfo?.unidade || 'un',
          estoqueAtual: itemInfo?.estoqueAtual ?? 0,
        };
      });

      return {
        ...pedidoRaw,
        clienteNome: clientesMap.get(pedidoRaw.clienteId) || 'Cliente não identificado',
        itensDetalhes,
        atrasado: isPedidoAtrasado(pedidoRaw),
        faltaEstoque: hasPedidoFaltaEstoque(pedidoRaw, estoqueDisponivelMap),
      };
    });

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
 *
 * O número sequencial vem de um contador transacional (`counters/pedidos`), evitando
 * números repetidos em criações simultâneas. Status, faturamento e valor total não
 * são aceitos do cliente: o pedido nasce PENDENTE ou SEPARADO, sem faturamento, e o
 * total é calculado a partir dos itens.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const input = CreatePedidoSchema.parse(body);

    if (input.status !== 'PENDENTE' && input.status !== 'SEPARADO') {
      throw new ApiError(400, 'Um pedido novo só pode ser criado como Pendente ou Separado.');
    }

    const db = getServerDb();
    const contadorRef = db.collection('counters').doc('pedidos');
    const now = new Date().toISOString();
    const valorTotal = calcularTotalPedido(input.itens);

    const novoPedido = await db.runTransaction(async (tx) => {
      const contadorSnap = await tx.get(contadorRef);
      let ultimo: number;
      if (contadorSnap.exists) {
        ultimo = Number(contadorSnap.data()?.ultimo) || 100;
      } else {
        // Primeira execução: parte do maior número já existente.
        const ordersSnap = await tx.get(db.collection('orders'));
        ultimo = 100;
        ordersSnap.forEach((d) => {
          const seq = Number(d.data().numeroSequencial);
          if (!Number.isNaN(seq) && seq > ultimo) ultimo = seq;
        });
      }

      const numeroSequencial = ultimo + 1;
      const id = `order-${numeroSequencial}`;
      const pedido: Pedido = {
        id,
        numeroSequencial,
        clienteId: input.clienteId,
        prazoEntrega: input.prazoEntrega,
        status: input.status,
        itens: input.itens,
        valorTotal,
        observacoes: input.observacoes || undefined,
        createdAt: now,
        updatedAt: now,
      };

      tx.set(contadorRef, { ultimo: numeroSequencial, updatedAt: now });
      tx.create(db.collection('orders').doc(id), semUndefined(pedido));
      return pedido;
    });

    return NextResponse.json(novoPedido, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
