import {
  calcularTotalPedido,
  normalizarSetorDestino,
  type Pedido,
  type StatusPedido,
} from '@/core/domain/pedido.schema';

/**
 * Converte um documento da coleção `orders` em Pedido, tolerando dados legados.
 */
export function pedidoFromDoc(id: string, data: Record<string, any>): Pedido {
  const itens = Array.isArray(data.itens)
    ? data.itens.map((i: Record<string, unknown>) => ({
        itemId: String(i.itemId || ''),
        quantidade: Number(i.quantidade) || 0,
        precoUnitario: Number(i.precoUnitario) || 0,
        ...(i.observacao ? { observacao: String(i.observacao) } : {}),
      }))
    : [];

  return {
    id,
    numeroSequencial: Number(data.numeroSequencial) || 1,
    clienteId: String(data.clienteId || ''),
    prazoEntrega: String(data.prazoEntrega || ''),
    status: (data.status as StatusPedido) || 'PENDENTE',
    setorDestino:
      typeof data.setorDestino === 'string' && data.setorDestino.trim()
        ? normalizarSetorDestino(data.setorDestino)
        : undefined,
    itens,
    valorTotal: Number(data.valorTotal) || calcularTotalPedido(itens),
    faturamento: data.faturamento || undefined,
    motivoCancelamento: data.motivoCancelamento || undefined,
    observacoes: data.observacoes || undefined,
    createdAt: data.createdAt || undefined,
    updatedAt: data.updatedAt || undefined,
  };
}

/**
 * Transições de status permitidas. ENTREGUE e CANCELADO são finais.
 */
export const TRANSICOES_PEDIDO: Record<StatusPedido, StatusPedido[]> = {
  PENDENTE: ['SEPARADO', 'ENTREGUE', 'CANCELADO'],
  SEPARADO: ['PENDENTE', 'ENTREGUE', 'CANCELADO'],
  ENTREGUE: [],
  CANCELADO: [],
};
