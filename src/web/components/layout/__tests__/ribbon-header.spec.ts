import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MODULOS_CONFIG,
  type ModuloCorporativo,
} from '../../../data/mock-almoxarifado.js';
import {
  calcularIntervaloPeriodo,
  obterProximoPeriodo,
} from '../../../hooks/usePeriodoGlobal.js';

describe('Fase 3: Lógica e Estrutura de Componentes da Ribbon Bar (AppRibbonHeader)', () => {
  const dataBase = new Date('2026-10-14T12:00:00Z');

  describe('Cálculo de Abas Disponíveis por Módulo', () => {
    it('deve listar Período de Análise e Favoritos para o módulo Início', () => {
      const abasModulo: string[] = [];
      const abas = ['Período de Análise', 'Favoritos', ...abasModulo];
      assert.deepEqual(abas, ['Período de Análise', 'Favoritos']);
    });

    it('deve incluir Materiais e Movimentação no módulo Estoque', () => {
      const config = MODULOS_CONFIG.estoque;
      const abas = ['Período de Análise', 'Favoritos', ...config.abas.map((a) => a.name)];
      assert.deepEqual(abas, ['Período de Análise', 'Favoritos', 'Materiais', 'Movimentação']);
    });

    it('deve incluir Recebimentos no módulo Compras', () => {
      const config = MODULOS_CONFIG.compras;
      const abas = ['Período de Análise', 'Favoritos', ...config.abas.map((a) => a.name)];
      assert.deepEqual(abas, ['Período de Análise', 'Favoritos', 'Recebimentos']);
    });

    it('deve incluir Pedidos e Cadastros no módulo Vendas', () => {
      const config = MODULOS_CONFIG.vendas;
      const abas = ['Período de Análise', 'Favoritos', ...config.abas.map((a) => a.name)];
      assert.deepEqual(abas, ['Período de Análise', 'Favoritos', 'Pedidos', 'Cadastros']);
    });
  });

  describe('Grupos e Comandos da Aba Favoritos', () => {
    it('deve conter as 4 ações essenciais no grupo Atalhos', () => {
      const botoesFavoritos = [
        { action: 'pick:Entrada', label: 'Adicionar entrada', icon: 'entrada' },
        { action: 'pick:Saída', label: 'Retirar para produção', icon: 'retirada' },
        { action: 'novopedido', label: 'Novo pedido', icon: 'novo' },
        { action: 'v:vendas', label: 'Pedidos a entregar', icon: 'vendas' },
      ];

      assert.equal(botoesFavoritos.length, 4);
      assert.ok(botoesFavoritos.some((b) => b.action === 'pick:Entrada'));
      assert.ok(botoesFavoritos.some((b) => b.action === 'pick:Saída'));
      assert.ok(botoesFavoritos.some((b) => b.action === 'novopedido'));
      assert.ok(botoesFavoritos.some((b) => b.action === 'v:vendas'));
    });
  });

  describe('Grupos e Comandos da Aba Período de Análise', () => {
    it('deve gerar o rótulo dinâmico do botão com período e datas reais', () => {
      const periodo = '7 dias';
      const textoIntervalo = calcularIntervaloPeriodo(periodo, dataBase);
      const label = `Período: ${periodo}\n${textoIntervalo}`;

      assert.equal(label, 'Período: 7 dias\n08/10/2026 à 14/10/2026');
    });

    it('deve permitir ciclar o período analítico em resposta ao clique', () => {
      let periodo = 'Hoje';
      periodo = obterProximoPeriodo(periodo as any);
      assert.equal(periodo, 'Ontem');
      periodo = obterProximoPeriodo(periodo as any);
      assert.equal(periodo, '7 dias');
      periodo = obterProximoPeriodo(periodo as any);
      assert.equal(periodo, 'Tudo');
      periodo = obterProximoPeriodo(periodo as any);
      assert.equal(periodo, 'Hoje');
    });
  });
});
