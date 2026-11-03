import { NextResponse } from 'next/server';
import {
  CreatePedidoSchema,
  PedidoFiltrosSchema,
  type Pedido,
  isPedidoAtrasado,
  hasPedidoFaltaEstoque,
  calcularTotalPedido,
  JANELA_PEDIDOS_ENCERRADOS_DIAS,
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
import { buscarDocsPorIds } from '../firestore-lookup';

const STATUS_ABERTOS = ['PENDENTE', 'SEPARADO'];

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
 * Lê os documentos de pedidos necessários para a listagem.
 * Com histórico completo (ou busca textual), lê todos. Caso contrário, lê os pedidos
 * em aberto e os encerrados com prazo de entrega dentro da janela recente.
 */
async function carregarDocsPedidos(
  db: ReturnType<typeof getServerDb>,
  historicoCompleto: boolean
): Promise<Array<{ id: string; data: Record<string, any> }>> {
  if (historicoCompleto) {
    const snap = await db.collection('orders').get();
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  }

  const corte = new Date();
  corte.setDate(corte.getDate() - JANELA_PEDIDOS_ENCERRADOS_DIAS);
  const corteISO = corte.toISOString().slice(0, 10);

  const [abertosSnap, recentesSnap] = await Promise.all([
    db.collection('orders').where('status', 'in', STATUS_ABERTOS).get(),
    db.collection('orders').where('prazoEntrega', '>=', corteISO).get(),
  ]);

  const porId = new Map<string, Record<string, any>>();
  for (const d of [...abertosSnap.docs, ...recentesSnap.docs]) {
    porId.set(d.id, d.data());
  }
  return [...porId.entries()].map(([id, data]) => ({ id, data }));
}

/**
 * GET /api/pedidos
 * Lista pedidos enriquecidos com dados de cliente e itens de estoque.
 *
 * Por padrão retorna todos os pedidos em aberto e os encerrados (entregues/cancelados)
 * com prazo nos últimos JANELA_PEDIDOS_ENCERRADOS_DIAS dias. Use `historico=completo`
 * para todos; a busca textual sempre considera o histórico completo.
 * Clientes e itens são lidos apenas pelos IDs referenciados nos pedidos retornados.
 */
export async function GET(request: Request) {
  try {
    await requireIdentity(request);
    const filtros = parsePedidoFiltros(request);
    const db = getServerDb();
    const { searchParams } = new URL(request.url);
    const historicoCompleto = searchParams.get('historico') === 'completo' || Boolean(filtros.busca);

    const docsPedidos = await carregarDocsPedidos(db, historicoCompleto);
    const pedidosBase = docsPedidos.map((d) => ({ doc: d, pedido: pedidoFromDoc(d.id, d.data) }));

    const [clientesDocs, itensDocs] = await Promise.all([
      buscarDocsPorIds(
        db,
        'clients',
        pedidosBase
          .filter(({ doc }) => !(typeof doc.data.clienteNome === 'string' && doc.data.clienteNome.trim()))
          .map(({ pedido }) => pedido.clienteId)
      ),
      buscarDocsPorIds(
        db,
        'items',
        pedidosBase.flatMap(({ pedido }) => pedido.itens.map((i) => i.itemId))
      ),
    ]);

    const clientesMap = new Map<string, string>();
    clientesDocs.forEach((data, id) => {
      clientesMap.set(id, String(data.nome || 'Cliente'));
    });

    const itensMap = new Map<
      string,
      { nome: string; codigo: string; unidade: string; estoqueAtual: number }
    >();
    const estoqueDisponivelMap = new Map<string, number>();
    itensDocs.forEach((data, id) => {
      const estoqueAtual = Number(data.estoqueAtual) || 0;
      itensMap.set(id, {
        nome: String(data.descricao || data.nome || 'Produto'),
        codigo: String(data.codigo || ''),
        unidade: String(data.unidade || 'UNIDADE'),
        estoqueAtual,
      });
      estoqueDisponivelMap.set(id, estoqueAtual);
    });

    let pedidos: PedidoEnriquecido[] = pedidosBase.map(({ doc, pedido: pedidoRaw }) => {
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
        clienteNome:
          (typeof doc.data.clienteNome === 'string' && doc.data.clienteNome.trim()) ||
          clientesMap.get(pedidoRaw.clienteId) ||
          'Cliente não identificado',
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
        historicoCompleto,
        janelaEncerradosDias: historicoCompleto ? null : JANELA_PEDIDOS_ENCERRADOS_DIAS,
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
    const clienteRef = db.collection('clients').doc(input.clienteId);
    const now = new Date().toISOString();
    const valorTotal = calcularTotalPedido(input.itens);

    const novoPedido = await db.runTransaction(async (tx) => {
      const [contadorSnap, clienteSnap] = await Promise.all([
        tx.get(contadorRef),
        tx.get(clienteRef),
      ]);
      if (clienteSnap.exists && clienteSnap.data()?.ativo === false) {
        throw new ApiError(
          'Este cliente está inativo. Reative o cadastro antes de lançar novos pedidos.',
          409
        );
      }
      const clienteNome = clienteSnap.exists
        ? String(clienteSnap.data()?.nome || clienteSnap.data()?.razaoSocial || '')
        : undefined;
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
      tx.create(
        db.collection('orders').doc(id),
        semUndefined({ ...pedido, ...(clienteNome ? { clienteNome } : {}) })
      );
      return pedido;
    });

    return NextResponse.json(novoPedido, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
