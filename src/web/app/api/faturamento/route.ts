import { NextResponse } from 'next/server';
import {
  FaturarPedidoInputSchema,
  RegistrarNotaFiscalEmitidaSchema,
  type NotaFiscalEmitida,
  calcularTotalNotasEmitidas,
} from '@/core/domain/nota-fiscal-emitida.schema';
import {
  type FaturamentoPedido,
  calcularTotalPedido,
  isPedidoElegivelFaturamento,
} from '@/core/domain/pedido.schema';
import {
  ApiError,
  getAuditoriaService,
  getServerDb,
  readJson,
  requireIdentity,
  requirePermission,
  semUndefined,
  toErrorResponse,
} from '../api-helpers';
import { buscarDocsPorIds } from '../firestore-lookup';
import { pedidoFromDoc } from '../pedidos/pedido-firestore';

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
  status?: 'EMITIDA' | 'CANCELADA';
  motivoCancelamento?: string;
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
    const db = getServerDb();

    // Só pedidos SEPARADO/ENTREGUE podem ser faturados; os demais nem são lidos.
    const [invoicesSnap, ordersSnap] = await Promise.all([
      db.collection('invoices').get(),
      db.collection('orders').where('status', 'in', ['SEPARADO', 'ENTREGUE']).get(),
    ]);

    const pedidosElegiveis = ordersSnap.docs
      .map((d) => ({ pedido: pedidoFromDoc(d.id, d.data()), clienteNome: d.data().clienteNome }))
      .filter(({ pedido }) => isPedidoElegivelFaturamento(pedido));

    // Clientes e itens são lidos apenas pelos IDs referenciados.
    const temNome = (v: unknown) => typeof v === 'string' && v.trim() !== '';
    const [clientesDocs, itensDocs] = await Promise.all([
      buscarDocsPorIds(db, 'clients', [
        ...invoicesSnap.docs.filter((d) => !temNome(d.data().clienteNome)).map((d) => d.data().clienteId),
        ...pedidosElegiveis.filter((p) => !temNome(p.clienteNome)).map((p) => p.pedido.clienteId),
      ]),
      buscarDocsPorIds(
        db,
        'items',
        pedidosElegiveis.flatMap(({ pedido }) => pedido.itens.map((i) => i.itemId))
      ),
    ]);

    const clientesMap = new Map<string, string>();
    clientesDocs.forEach((data, id) => {
      clientesMap.set(id, String(data.nome || 'Cliente'));
    });

    const itensNomeMap = new Map<string, string>();
    itensDocs.forEach((data, id) => {
      itensNomeMap.set(id, String(data.descricao || data.nome || 'Item'));
    });

    const notasEmitidas: NotaFiscalEmitidaEnriquecida[] = invoicesSnap.docs.map((d) => {
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
      return {
        ...nf,
        clienteNome:
          (typeof data.clienteNome === 'string' && data.clienteNome.trim()) ||
          clientesMap.get(nf.clienteId) ||
          'Cliente não identificado',
        status: data.status === 'CANCELADA' ? 'CANCELADA' : 'EMITIDA',
        motivoCancelamento: data.motivoCancelamento ? String(data.motivoCancelamento) : undefined,
      };
    });

    // Ordena notas da mais recente para a mais antiga
    notasEmitidas.sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao));

    const pedidosAFaturar: PedidoAFaturarItem[] = pedidosElegiveis
      .map(({ pedido: p, clienteNome }) => ({
        id: p.id,
        numeroSequencial: p.numeroSequencial,
        clienteId: p.clienteId,
        clienteNome:
          (temNome(clienteNome) ? String(clienteNome).trim() : '') ||
          clientesMap.get(p.clienteId) ||
          'Cliente não identificado',
        prazoEntrega: p.prazoEntrega,
        status: p.status,
        valorTotal: p.valorTotal || calcularTotalPedido(p.itens),
        itensResumo: p.itens
          .map((i) => `${i.quantidade}x ${itensNomeMap.get(i.itemId) || 'Item ' + i.itemId}`)
          .join(', '),
      }))
      .sort((a, b) => a.prazoEntrega.localeCompare(b.prazoEntrega));

    // KPIs consolidados (notas canceladas não entram no faturado)
    const notasValidas = notasEmitidas.filter((n) => n.status !== 'CANCELADA');
    const valorPedidosAFaturar = pedidosAFaturar.reduce((acc, curr) => acc + curr.valorTotal, 0);

    const response: FaturamentoDashboardResponse = {
      pedidosAFaturar,
      notasEmitidas,
      kpis: {
        totalPedidosAFaturar: pedidosAFaturar.length,
        valorPedidosAFaturar,
        totalNotasEmitidas: notasValidas.length,
        valorTotalFaturado: calcularTotalNotasEmitidas(notasValidas),
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
 *
 * Em uma única transação: relê o pedido, recusa se já faturado ou cancelado, recusa
 * número/série de NF já usado e grava nota + vínculo no pedido juntos.
 */
export async function POST(request: Request) {
  try {
    const identity = await requireIdentity(request);
    requirePermission(identity, 'stock:operate');

    const body = await readJson(request);
    const input = FaturarPedidoInputSchema.parse(body);

    const db = getServerDb();
    const orderRef = db.collection('orders').doc(input.pedidoId);
    const serie = input.serie || '1';
    const idNota = `nf-${input.numeroNF}-${serie}`;
    const notaRef = db.collection('invoices').doc(idNota);
    const now = new Date().toISOString();

    const { novaNota, dadosFaturamentoPedido, numeroPedido } = await db.runTransaction(async (tx) => {
      const [pedidoSnap, notaSnap] = await Promise.all([tx.get(orderRef), tx.get(notaRef)]);

      if (!pedidoSnap.exists) {
        throw new ApiError(404, 'Pedido não encontrado para faturamento.');
      }
      const pedido = pedidoFromDoc(pedidoSnap.id, pedidoSnap.data() || {});

      if (pedido.status === 'PENDENTE') {
        throw new ApiError(
          400,
          'O pedido ainda está Pendente. Realize a Separação física antes de faturar.'
        );
      }
      if (pedido.status === 'CANCELADO') {
        throw new ApiError(400, 'Pedido cancelado não pode ser faturado.');
      }
      if (pedido.faturamento) {
        throw new ApiError(
          400,
          `Este pedido já foi faturado anteriormente sob a NF-e ${pedido.faturamento.numeroNFe}.`
        );
      }
      if (notaSnap.exists) {
        throw new ApiError(409, `A NF-e ${input.numeroNF} série ${serie} já foi registrada.`);
      }

      const valorTotalPedido = pedido.valorTotal || calcularTotalPedido(pedido.itens);
      if (valorTotalPedido <= 0) {
        throw new ApiError(
          400,
          'O pedido possui valor total zerado. Verifique os preços unitários antes de faturar.'
        );
      }

      const nota: NotaFiscalEmitida = {
        id: idNota,
        numeroNF: input.numeroNF,
        serie,
        dataEmissao: input.dataEmissao,
        dataVencimento: input.dataVencimento,
        tipo: 'VENDA',
        clienteId: pedido.clienteId,
        valorTotal: valorTotalPedido,
        referencia: `Pedido #${pedido.numeroSequencial || pedido.id}`,
        pedidoId: pedido.id,
        observacoes: input.observacoes,
        createdAt: now,
        updatedAt: now,
      };

      const faturamento: FaturamentoPedido = {
        numeroNFe: input.numeroNF,
        serie,
        dataEmissao: input.dataEmissao,
        dataVencimento: input.dataVencimento,
        valorTotal: valorTotalPedido,
      };

      const clienteNomeNota =
        typeof pedidoSnap.data()?.clienteNome === 'string' && pedidoSnap.data()?.clienteNome.trim()
          ? String(pedidoSnap.data()?.clienteNome).trim()
          : undefined;
      tx.create(
        notaRef,
        semUndefined({
          ...nota,
          ...(clienteNomeNota ? { clienteNome: clienteNomeNota } : {}),
          status: 'EMITIDA',
        })
      );
      tx.update(orderRef, { faturamento: semUndefined(faturamento), updatedAt: now });

      return {
        novaNota: semUndefined(nota),
        dadosFaturamentoPedido: semUndefined(faturamento),
        numeroPedido: pedido.numeroSequencial || pedido.id,
      };
    });

    try {
      await getAuditoriaService().registrar({
        quando: now,
        usuarioId: identity.user.id,
        usuarioNome: identity.user.name || 'Operador',
        papel: identity.user.role || 'operador',
        acao: 'FATURAMENTO_PEDIDO',
        detalhe: `Pedido #${numeroPedido} faturado na NF-e ${input.numeroNF} série ${serie}`,
        entidade: 'NotaFiscalEmitida',
        entidadeId: idNota,
      });
    } catch (auditErr) {
      console.warn('Falha ao auditar faturamento:', auditErr);
    }

    return NextResponse.json(
      {
        mensagem: `Pedido #${numeroPedido} faturado com sucesso. NF-e ${input.numeroNF}.`,
        notaFiscal: novaNota,
        faturamento: dadosFaturamentoPedido,
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
