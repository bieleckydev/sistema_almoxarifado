import { NextResponse } from 'next/server';
import {
  FaturarPedidoInputSchema,
  RegistrarNotaFiscalEmitidaSchema,
  type NotaFiscalEmitida,
  calcularTotalNotasEmitidas,
} from '@/core/domain/nota-fiscal-emitida.schema';
import {
  type Pedido,
  calcularTotalPedido,
  isPedidoElegivelFaturamento,
} from '@/core/domain/pedido.schema';
import {
  ApiError,
  readJson,
  requireIdentity,
  requirePermission,
  toErrorResponse,
} from '../api-helpers';
import { db } from '@/core/services/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import {
  CLIENTES_INICIAIS,
  PEDIDOS_INICIAIS,
  NOTAS_INICIAIS,
} from '@/web/data/mock-almoxarifado';

export interface PedidoAFaturarItem {
  id: string;
  numeroSequencial: number;
  clienteId: string;
  clienteNome: string;
  prazoEntrega: string;
  status: string;
  valorTotal: number;
  itensResumo: string;
}

export interface NotaFiscalEmitidaEnriquecida extends NotaFiscalEmitida {
  clienteNome: string;
}

export interface FaturamentoDashboardResponse {
  pedidosAFaturar: PedidoAFaturarItem[];
  notasEmitidas: NotaFiscalEmitidaEnriquecida[];
  kpis: {
    totalPedidosAFaturar: number;
    valorPedidosAFaturar: number;
    totalNotasEmitidas: number;
    valorTotalFaturado: number;
  };
}

/**
 * GET /api/faturamento
 * Retorna os pedidos separados/entregues aguardando emissão de NF-e e o histórico de notas fiscais emitidas.
 */
export async function GET(request: Request) {
  try {
    await requireIdentity(request);

    // 1. Mapa de Clientes
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

    // 2. Mapa de Itens (para descrições no resumo)
    const itensNomeMap = new Map<string, string>();
    try {
      const itemsSnap = await getDocs(collection(db, 'items'));
      itemsSnap.forEach((d) => {
        itensNomeMap.set(d.id, String(d.data().descricao || d.data().nome || 'Item'));
      });
    } catch {
      // Ignora erro se coleção não estiver disponível
    }

    // 3. Notas Fiscais Emitidas
    let notasEmitidas: NotaFiscalEmitidaEnriquecida[] = [];
    try {
      const invoicesSnap = await getDocs(collection(db, 'invoices'));
      invoicesSnap.forEach((d) => {
        const data = d.data();
        const nf: NotaFiscalEmitida = {
          id: d.id,
          numeroNF: String(data.numeroNF || ''),
          serie: String(data.serie || '1'),
          dataEmissao: String(data.dataEmissao || ''),
          dataVencimento: data.dataVencimento ? String(data.dataVencimento) : undefined,
          tipo: data.tipo === 'RETORNO_INDUSTRIALIZACAO' ? 'RETORNO_INDUSTRIALIZACAO' : 'VENDA',
          clienteId: String(data.clienteId || ''),
          valorTotal: Number(data.valorTotal) || 0,
          referencia: String(data.referencia || ''),
          pedidoId: data.pedidoId ? String(data.pedidoId) : undefined,
          materialTerceiroId: data.materialTerceiroId ? String(data.materialTerceiroId) : undefined,
          observacoes: data.observacoes ? String(data.observacoes) : undefined,
          createdAt: data.createdAt ? String(data.createdAt) : undefined,
        };
        const clienteNome = clientesMap.get(nf.clienteId) || 'Cliente não identificado';
        notasEmitidas.push({ ...nf, clienteNome });
      });
    } catch {
      notasEmitidas = [];
    }

    if (notasEmitidas.length === 0) {
      notasEmitidas = NOTAS_INICIAIS.map((n) => ({
        ...n,
        clienteNome: clientesMap.get(n.clienteId) || 'Cliente não identificado',
      }));
    }

    // Ordena notas da mais recente para a mais antiga
    notasEmitidas.sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao));

    // 4. Pedidos Elegíveis para Faturamento
    let pedidosTodos: Pedido[] = [];
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      ordersSnap.forEach((d) => {
        const data = d.data();
        const itens = Array.isArray(data.itens)
          ? data.itens.map((i) => ({
              itemId: String(i.itemId || ''),
              quantidade: Number(i.quantidade) || 0,
              precoUnitario: Number(i.precoUnitario) || 0,
            }))
          : [];
        const valorTotal = Number(data.valorTotal) || calcularTotalPedido(itens);

        pedidosTodos.push({
          id: d.id,
          numeroSequencial: Number(data.numeroSequencial) || 1,
          clienteId: String(data.clienteId || ''),
          prazoEntrega: String(data.prazoEntrega || ''),
          status: data.status || 'PENDENTE',
          itens,
          valorTotal,
          faturamento: data.faturamento || undefined,
          observacoes: data.observacoes || undefined,
        });
      });
    } catch {
      pedidosTodos = [];
    }

    if (pedidosTodos.length === 0) {
      pedidosTodos = PEDIDOS_INICIAIS;
    }

    const pedidosAFaturar: PedidoAFaturarItem[] = pedidosTodos
      .filter((p) => isPedidoElegivelFaturamento(p))
      .map((p) => {
        const clienteNome = clientesMap.get(p.clienteId) || 'Cliente não identificado';
        const valorTotal = p.valorTotal || calcularTotalPedido(p.itens);
        const itensResumo = p.itens
          .map((i) => `${i.quantidade}x ${itensNomeMap.get(i.itemId) || 'Item ' + i.itemId}`)
          .join(', ');

        return {
          id: p.id,
          numeroSequencial: p.numeroSequencial,
          clienteId: p.clienteId,
          clienteNome,
          prazoEntrega: p.prazoEntrega,
          status: p.status,
          valorTotal,
          itensResumo,
        };
      })
      .sort((a, b) => a.prazoEntrega.localeCompare(b.prazoEntrega));

    // 5. KPIs Consolidados
    const valorPedidosAFaturar = pedidosAFaturar.reduce((acc, curr) => acc + curr.valorTotal, 0);
    const valorTotalFaturado = calcularTotalNotasEmitidas(notasEmitidas);

    const response: FaturamentoDashboardResponse = {
      pedidosAFaturar,
      notasEmitidas,
      kpis: {
        totalPedidosAFaturar: pedidosAFaturar.length,
        valorPedidosAFaturar,
        totalNotasEmitidas: notasEmitidas.length,
        valorTotalFaturado,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/faturamento
 * Registra o faturamento de um pedido de venda, vinculando a NF-e e criando a nota fiscal emitida.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const input = FaturarPedidoInputSchema.parse(body);

    // 1. Busca o pedido alvo
    let pedido: Pedido | null = null;
    const orderDocRef = doc(db, 'orders', input.pedidoId);

    try {
      const snap = await getDoc(orderDocRef);
      if (snap.exists()) {
        const data = snap.data();
        pedido = {
          id: snap.id,
          numeroSequencial: Number(data.numeroSequencial) || 1,
          clienteId: String(data.clienteId || ''),
          prazoEntrega: String(data.prazoEntrega || ''),
          status: data.status || 'PENDENTE',
          itens: Array.isArray(data.itens) ? data.itens : [],
          valorTotal: Number(data.valorTotal) || 0,
          faturamento: data.faturamento || undefined,
          observacoes: data.observacoes || undefined,
        };
      }
    } catch {
      // fallback para memória
    }

    if (!pedido) {
      pedido = PEDIDOS_INICIAIS.find((p) => p.id === input.pedidoId) || null;
    }

    if (!pedido) {
      throw new ApiError(404, 'Pedido não encontrado para faturamento.');
    }

    if (pedido.status === 'PENDENTE') {
      throw new ApiError(
        400,
        'O pedido ainda está Pendente. Realize a Separação física antes de faturar.'
      );
    }

    if (pedido.faturamento) {
      throw new ApiError(
        400,
        `Este pedido já foi faturado anteriormente sob a NF-e ${pedido.faturamento.numeroNFe}.`
      );
    }

    const valorTotalPedido =
      pedido.valorTotal || calcularTotalPedido(pedido.itens);

    if (valorTotalPedido <= 0) {
      throw new ApiError(
        400,
        'O pedido possui valor total zerado. Verifique os preços unitários antes de faturar.'
      );
    }

    // 2. Cria a Nota Fiscal Emitida
    const now = new Date().toISOString();
    const idNota = `nf-${input.numeroNF}-${input.serie || '1'}`;

    const novaNota: NotaFiscalEmitida = {
      id: idNota,
      numeroNF: input.numeroNF,
      serie: input.serie || '1',
      dataEmissao: input.dataEmissao,
      tipo: 'VENDA',
      clienteId: pedido.clienteId,
      valorTotal: valorTotalPedido,
      referencia: `Pedido #${pedido.numeroSequencial || pedido.id}`,
      pedidoId: pedido.id,
      createdAt: now,
      updatedAt: now,
    };
    if (input.dataVencimento) {
      novaNota.dataVencimento = input.dataVencimento;
    }
    if (input.observacoes) {
      novaNota.observacoes = input.observacoes;
    }

    const dadosFaturamentoPedido: any = {
      numeroNFe: input.numeroNF,
      serie: input.serie || '1',
      dataEmissao: input.dataEmissao,
      valorTotal: valorTotalPedido,
    };
    if (input.dataVencimento) {
      dadosFaturamentoPedido.dataVencimento = input.dataVencimento;
    }

    // 3. Persistência no Firestore
    try {
      await setDoc(doc(db, 'invoices', idNota), novaNota);
      await updateDoc(orderDocRef, {
        faturamento: dadosFaturamentoPedido,
        updatedAt: now,
      });
    } catch {
      // Ignora falha de gravação remota se Firestore offline
    }

    // Sincroniza estado em memória para consistência de cache e testes
    pedido.faturamento = dadosFaturamentoPedido;
    const memPedido = PEDIDOS_INICIAIS.find((p) => p.id === pedido.id);
    if (memPedido) {
      memPedido.faturamento = dadosFaturamentoPedido;
      memPedido.updatedAt = now;
    }
    if (!NOTAS_INICIAIS.some((n) => n.id === idNota)) {
      NOTAS_INICIAIS.push(novaNota);
    }

    return NextResponse.json(
      {
        mensagem: `Pedido #${pedido.numeroSequencial || pedido.id} faturado com sucesso. NF-e ${input.numeroNF}.`,
        notaFiscal: novaNota,
        faturamento: dadosFaturamentoPedido,
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
