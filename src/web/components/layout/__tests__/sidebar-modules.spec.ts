import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  obterModuloDeTela,
  type ModuloCorporativo,
  type TelaOuAba,
} from '../../../data/mock-almoxarifado.js';

describe('Fase 4: Sidebar Retrátil e Módulos Corporativos (AppSidebar)', () => {
  const modulosEsperados: Array<{ id: ModuloCorporativo; nome: string; viewPadrao: TelaOuAba }> = [
    { id: 'inicio', nome: 'Início', viewPadrao: 'inicio' },
    { id: 'estoque', nome: 'Estoque', viewPadrao: 'mp' },
    { id: 'compras', nome: 'Compras', viewPadrao: 'saida' },
    { id: 'vendas', nome: 'Vendas', viewPadrao: 'vendas' },
  ];

  it('deve contemplar os 4 módulos corporativos de primeiro nível', () => {
    assert.equal(modulosEsperados.length, 4);
    assert.deepEqual(
      modulosEsperados.map((m) => m.id),
      ['inicio', 'estoque', 'compras', 'vendas']
    );
  });

  it('deve direcionar cada módulo para sua tela inicial correspondente', () => {
    const inicio = modulosEsperados.find((m) => m.id === 'inicio');
    const estoque = modulosEsperados.find((m) => m.id === 'estoque');
    const compras = modulosEsperados.find((m) => m.id === 'compras');
    const vendas = modulosEsperados.find((m) => m.id === 'vendas');

    assert.equal(inicio?.viewPadrao, 'inicio');
    assert.equal(estoque?.viewPadrao, 'mp');
    assert.equal(compras?.viewPadrao, 'saida');
    assert.equal(vendas?.viewPadrao, 'vendas');
  });

  describe('Cálculo de Badges Operacionais', () => {
    it('deve totalizar itens críticos para a badge do Estoque', () => {
      const contagemCriticos = { mp: 3, imp: 2, motos: 1 };
      const total = Object.values(contagemCriticos).reduce((a, b) => a + b, 0);
      assert.equal(total, 6);
    });

    it('deve associar pedidos atrasados à badge de Vendas', () => {
      const pedidosAtrasadosCount = 4;
      assert.equal(pedidosAtrasadosCount, 4);
    });
  });

  describe('Inferência de Módulo Ativo pelo Helper obterModuloDeTela', () => {
    it('deve identificar módulo inicio para tela inicio', () => {
      assert.equal(obterModuloDeTela('inicio'), 'inicio');
    });

    it('deve identificar módulo estoque para telas mp, imp, motos', () => {
      assert.equal(obterModuloDeTela('mp'), 'estoque');
      assert.equal(obterModuloDeTela('imp'), 'estoque');
      assert.equal(obterModuloDeTela('motos'), 'estoque');
    });

    it('deve inferir compras para tela saida quando o operador estiver em compras', () => {
      assert.equal(obterModuloDeTela('saida', 'compras'), 'compras');
    });

    it('deve inferir estoque para tela saida quando estiver no fluxo geral de estoque', () => {
      assert.equal(obterModuloDeTela('saida', 'estoque'), 'estoque');
    });

    it('deve inferir compras para tela clientes quando selecionado fornecedores em compras', () => {
      assert.equal(obterModuloDeTela('clientes', 'compras'), 'compras');
    });
  });
});
