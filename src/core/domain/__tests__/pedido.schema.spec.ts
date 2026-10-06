import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PedidoSchema,
  CreatePedidoSchema,
  UpdatePedidoSchema,
  PedidoFiltrosSchema,
  ItemPedidoSchema,
  normalizarStatusPedido,
  STATUS_PEDIDO_LABELS,
  isPedidoAtrasado,
  obterItensSemSaldo,
  hasPedidoFaltaEstoque,
  obterProximoStatus,
} from '../pedido.schema';

describe('Pedido de Venda Domain Schemas', () => {
  it('deve normalizar status de pedidos e conter labels em português', () => {
    assert.strictEqual(normalizarStatusPedido('Pendente'), 'PENDENTE');
    assert.strictEqual(normalizarStatusPedido('separado'), 'SEPARADO');
    assert.strictEqual(normalizarStatusPedido('ENTREGUE'), 'ENTREGUE');
    assert.strictEqual(normalizarStatusPedido('cancelado'), 'CANCELADO');
    assert.strictEqual(normalizarStatusPedido('invalido'), 'PENDENTE');

    assert.strictEqual(STATUS_PEDIDO_LABELS.PENDENTE, 'Pendente');
    assert.strictEqual(STATUS_PEDIDO_LABELS.SEPARADO, 'Separado');
    assert.strictEqual(STATUS_PEDIDO_LABELS.ENTREGUE, 'Entregue');
    assert.strictEqual(STATUS_PEDIDO_LABELS.CANCELADO, 'Cancelado');
  });

  it('deve validar item de pedido com quantidade positiva e rejeitar quantidade zero ou negativa', () => {
    const itemValido = ItemPedidoSchema.parse({
      itemId: 'prod-01',
      quantidade: 10,
      observacao: 'Urgente',
    });
    assert.strictEqual(itemValido.quantidade, 10);
    assert.strictEqual(itemValido.observacao, 'Urgente');

    assert.throws(() => {
      ItemPedidoSchema.parse({
        itemId: 'prod-01',
        quantidade: 0,
      });
    });

    assert.throws(() => {
      ItemPedidoSchema.parse({
        itemId: 'prod-01',
        quantidade: -5,
      });
    });
  });

  it('deve validar um pedido completo', () => {
    const raw = {
      id: 'ped-101',
      numeroSequencial: 101,
      clienteId: 'cli-01',
      prazoEntrega: '2026-10-15',
      status: 'Pendente',
      itens: [
        { itemId: 'prod-1', quantidade: 5 },
        { itemId: 'prod-2', quantidade: 20 },
      ],
    };

    const pedido = PedidoSchema.parse(raw);
    assert.strictEqual(pedido.id, 'ped-101');
    assert.strictEqual(pedido.numeroSequencial, 101);
    assert.strictEqual(pedido.status, 'PENDENTE');
    assert.strictEqual(pedido.itens.length, 2);
  });

  it('deve rejeitar pedidos sem itens ou com formato de data inválido', () => {
    assert.throws(() => {
      PedidoSchema.parse({
        id: 'ped-102',
        numeroSequencial: 102,
        clienteId: 'cli-01',
        prazoEntrega: '15/10/2026', // Formato não-ISO
        itens: [{ itemId: 'prod-1', quantidade: 1 }],
      });
    });

    assert.throws(() => {
      PedidoSchema.parse({
        id: 'ped-103',
        numeroSequencial: 103,
        clienteId: 'cli-01',
        prazoEntrega: '2026-10-15',
        itens: [], // Lista vazia de itens
      });
    });
  });

  it('deve validar formulário de criação CreatePedidoSchema', () => {
    const input = {
      clienteId: 'cli-02',
      prazoEntrega: '2026-10-20',
      itens: [{ itemId: 'prod-3', quantidade: 15 }],
    };

    const validado = CreatePedidoSchema.parse(input);
    assert.strictEqual(validado.clienteId, 'cli-02');
    assert.strictEqual(validado.status, 'PENDENTE');
    assert.strictEqual(validado.itens.length, 1);
  });

  it('deve identificar pedidos atrasados corretamente', () => {
    const dataHoje = '2026-10-06';

    // Prazo anterior à data de referência e status pendente -> atrasado
    assert.strictEqual(
      isPedidoAtrasado({ status: 'PENDENTE', prazoEntrega: '2026-10-05' }, dataHoje),
      true
    );

    // Prazo anterior à data de referência mas status SEPARADO -> ainda atrasado
    assert.strictEqual(
      isPedidoAtrasado({ status: 'SEPARADO', prazoEntrega: '2026-10-05' }, dataHoje),
      true
    );

    // Prazo futuro -> não atrasado
    assert.strictEqual(
      isPedidoAtrasado({ status: 'PENDENTE', prazoEntrega: '2026-10-08' }, dataHoje),
      false
    );

    // Prazo de hoje -> não atrasado
    assert.strictEqual(
      isPedidoAtrasado({ status: 'PENDENTE', prazoEntrega: '2026-10-06' }, dataHoje),
      false
    );

    // Prazo vencido porém já ENTREGUE -> não atrasado
    assert.strictEqual(
      isPedidoAtrasado({ status: 'ENTREGUE', prazoEntrega: '2026-10-02' }, dataHoje),
      false
    );

    // Prazo vencido porém CANCELADO -> não atrasado
    assert.strictEqual(
      isPedidoAtrasado({ status: 'CANCELADO', prazoEntrega: '2026-10-02' }, dataHoje),
      false
    );
  });

  it('deve verificar falta de estoque e identificar itens sem saldo disponível', () => {
    const pedido = {
      status: 'PENDENTE' as const,
      itens: [
        { itemId: 'item-aço', quantidade: 50 },
        { itemId: 'item-solda', quantidade: 10 },
      ],
    };

    const mapaEstoque = {
      'item-aço': 30, // faltam 20
      'item-solda': 15, // suficiente
    };

    const faltantes = obterItensSemSaldo(pedido, mapaEstoque);
    assert.strictEqual(faltantes.length, 1);
    assert.strictEqual(faltantes[0].itemId, 'item-aço');
    assert.strictEqual(faltantes[0].quantidadeDesejada, 50);
    assert.strictEqual(faltantes[0].quantidadeDisponivel, 30);
    assert.strictEqual(faltantes[0].deficit, 20);

    assert.strictEqual(hasPedidoFaltaEstoque(pedido, mapaEstoque), true);

    // Com estoque suficiente
    const mapaSuficiente = {
      'item-aço': 60,
      'item-solda': 20,
    };
    assert.strictEqual(obterItensSemSaldo(pedido, mapaSuficiente).length, 0);
    assert.strictEqual(hasPedidoFaltaEstoque(pedido, mapaSuficiente), false);
  });

  it('deve calcular próximo status de transição de fluxo', () => {
    assert.strictEqual(obterProximoStatus('PENDENTE'), 'SEPARADO');
    assert.strictEqual(obterProximoStatus('SEPARADO'), 'ENTREGUE');
    assert.strictEqual(obterProximoStatus('ENTREGUE'), null);
    assert.strictEqual(obterProximoStatus('CANCELADO'), null);
  });
});
