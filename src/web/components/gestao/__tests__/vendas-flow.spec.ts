import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreatePedidoSchema,
  isPedidoAtrasado,
  obterItensSemSaldo,
  hasPedidoFaltaEstoque,
  obterProximoStatus,
  normalizarStatusPedido,
  type StatusPedido,
} from '../../../../core/domain/pedido.schema';

describe('Fase 4 — Módulo de Vendas, Workflows e Baixa Automática de Estoque', () => {
  describe('Validações do Schema de Criação de Pedidos (CreatePedidoSchema)', () => {
    it('deve validar um pedido completo com cliente, data no formato ISO e itens válidos', () => {
      const payload = {
        clienteId: 'cli-001',
        prazoEntrega: '2026-10-25',
        status: 'PENDENTE' as const,
        itens: [
          { itemId: 'item-100-0245', quantidade: 10 },
          { itemId: 'item-100-0248', quantidade: 5 },
        ],
        observacoes: 'Pedido urgente para filial',
      };

      const parsed = CreatePedidoSchema.parse(payload);
      assert.equal(parsed.clienteId, 'cli-001');
      assert.equal(parsed.prazoEntrega, '2026-10-25');
      assert.equal(parsed.itens.length, 2);
      assert.equal(parsed.itens[0].quantidade, 10);
      assert.equal(parsed.status, 'PENDENTE');
    });

    it('deve rejeitar pedido sem cliente ou com data em formato incorreto', () => {
      assert.throws(() => {
        CreatePedidoSchema.parse({
          clienteId: '',
          prazoEntrega: '2026-10-25',
          itens: [{ itemId: 'item-1', quantidade: 1 }],
        });
      });

      assert.throws(() => {
        CreatePedidoSchema.parse({
          clienteId: 'cli-001',
          prazoEntrega: '25/10/2026', // Formato BR não é aceito diretamente no schema ISO
          itens: [{ itemId: 'item-1', quantidade: 1 }],
        });
      });
    });

    it('deve rejeitar pedido sem itens ou com quantidade menor ou igual a zero', () => {
      assert.throws(() => {
        CreatePedidoSchema.parse({
          clienteId: 'cli-001',
          prazoEntrega: '2026-10-25',
          itens: [],
        });
      });

      assert.throws(() => {
        CreatePedidoSchema.parse({
          clienteId: 'cli-001',
          prazoEntrega: '2026-10-25',
          itens: [{ itemId: 'item-1', quantidade: 0 }],
        });
      });
    });
  });

  describe('Lógica Operacional de Atrasos (isPedidoAtrasado)', () => {
    const dataHoje = '2026-10-14';

    it('deve identificar pedido em aberto com prazo anterior a hoje como atrasado', () => {
      const pedidoAtrasado = {
        status: 'PENDENTE' as StatusPedido,
        prazoEntrega: '2026-10-10',
      };

      assert.equal(isPedidoAtrasado(pedidoAtrasado, dataHoje), true);
    });

    it('deve identificar pedido separado com prazo anterior a hoje como atrasado', () => {
      const pedidoSeparadoAtrasado = {
        status: 'SEPARADO' as StatusPedido,
        prazoEntrega: '2026-10-12',
      };

      assert.equal(isPedidoAtrasado(pedidoSeparadoAtrasado, dataHoje), true);
    });

    it('não deve marcar como atrasado pedidos com prazo futuro ou hoje', () => {
      const pedidoEmDia = {
        status: 'PENDENTE' as StatusPedido,
        prazoEntrega: '2026-10-20',
      };

      const pedidoHoje = {
        status: 'PENDENTE' as StatusPedido,
        prazoEntrega: '2026-10-14',
      };

      assert.equal(isPedidoAtrasado(pedidoEmDia, dataHoje), false);
      assert.equal(isPedidoAtrasado(pedidoHoje, dataHoje), false);
    });

    it('não deve marcar como atrasado pedidos já entregues, mesmo que o prazo tenha passado', () => {
      const pedidoEntregue = {
        status: 'ENTREGUE' as StatusPedido,
        prazoEntrega: '2026-10-05',
      };

      assert.equal(isPedidoAtrasado(pedidoEntregue, dataHoje), false);
    });
  });

  describe('Validação de Disponibilidade e Falta de Estoque nos Pedidos', () => {
    const mapaEstoque = {
      'item-tubo': 100,
      'item-chassi': 2,
      'item-roda': 0,
    };

    it('deve detectar falta de estoque quando demanda for maior que o saldo disponível', () => {
      const pedido = {
        status: 'PENDENTE' as StatusPedido,
        itens: [
          { itemId: 'item-tubo', quantidade: 50 },
          { itemId: 'item-chassi', quantidade: 5 }, // demanda 5, disponível 2
        ],
      };

      const faltantes = obterItensSemSaldo(pedido, mapaEstoque);
      assert.equal(faltantes.length, 1);
      assert.equal(faltantes[0].itemId, 'item-chassi');
      assert.equal(faltantes[0].quantidadeDesejada, 5);
      assert.equal(faltantes[0].quantidadeDisponivel, 2);
      assert.equal(faltantes[0].deficit, 3);

      assert.equal(hasPedidoFaltaEstoque(pedido, mapaEstoque), true);
    });

    it('deve retornar sem falta quando todos os itens possuem estoque suficiente', () => {
      const pedidoComEstoque = {
        status: 'PENDENTE' as StatusPedido,
        itens: [
          { itemId: 'item-tubo', quantidade: 80 },
          { itemId: 'item-chassi', quantidade: 2 },
        ],
      };

      const faltantes = obterItensSemSaldo(pedidoComEstoque, mapaEstoque);
      assert.equal(faltantes.length, 0);
      assert.equal(hasPedidoFaltaEstoque(pedidoComEstoque, mapaEstoque), false);
    });
  });

  describe('Transição de Status Operacional e Normalização', () => {
    it('deve avançar o status corretamente: PENDENTE -> SEPARADO -> ENTREGUE', () => {
      assert.equal(obterProximoStatus('PENDENTE'), 'SEPARADO');
      assert.equal(obterProximoStatus('SEPARADO'), 'ENTREGUE');
      assert.equal(obterProximoStatus('ENTREGUE'), null);
      assert.equal(obterProximoStatus('CANCELADO'), null);
    });

    it('deve normalizar strings com diferentes caixas para o enum oficial', () => {
      assert.equal(normalizarStatusPedido('pendente'), 'PENDENTE');
      assert.equal(normalizarStatusPedido('Separado'), 'SEPARADO');
      assert.equal(normalizarStatusPedido('ENTREGUE'), 'ENTREGUE');
      assert.equal(normalizarStatusPedido('qualquer-coisa'), 'PENDENTE');
    });
  });
});
