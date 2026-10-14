import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MODULOS_CONFIG,
  obterModuloDeTela,
} from '../mock-almoxarifado.js';

describe('Fase 1: Módulos Corporativos e Configuração da Ribbon (V5)', () => {
  it('deve conter as configurações dos 3 módulos corporativos principais (estoque, compras, vendas)', () => {
    assert.ok(MODULOS_CONFIG.estoque);
    assert.ok(MODULOS_CONFIG.compras);
    assert.ok(MODULOS_CONFIG.vendas);

    assert.equal(MODULOS_CONFIG.estoque.nome, 'Estoque');
    assert.equal(MODULOS_CONFIG.compras.nome, 'Compras');
    assert.equal(MODULOS_CONFIG.vendas.nome, 'Vendas');
  });

  it('deve ter as abas corretas configuradas para o módulo Estoque', () => {
    const abasEstoque = MODULOS_CONFIG.estoque.abas;
    assert.deepEqual(abasEstoque.map((a) => a.name), ['Materiais', 'Movimentação']);

    const abaMateriais = abasEstoque.find((a) => a.name === 'Materiais');
    assert.deepEqual(abaMateriais?.groups.map((g) => g.title), ['Consulta', 'Cadastro']);

    const abaMovimentacao = abasEstoque.find((a) => a.name === 'Movimentação');
    assert.deepEqual(abaMovimentacao?.groups.map((g) => g.title), ['Registrar', 'Relatórios']);

    // Verificar se o botão de CSV existe no grupo Relatórios
    const grupoRelatorios = abaMovimentacao?.groups.find((g) => g.title === 'Relatórios');
    const botaoCsv = grupoRelatorios?.buttons.find((b) => b.action === 'csv');
    assert.ok(botaoCsv);
    assert.equal(botaoCsv?.label, 'Baixar CSV');
  });

  it('deve ter os fluxos de Compras configurados corretamente', () => {
    const abasCompras = MODULOS_CONFIG.compras.abas;
    assert.deepEqual(abasCompras.map((a) => a.name), ['Recebimentos']);

    const abaRecebimentos = abasCompras[0];
    const titulosGrupos = abaRecebimentos.groups.map((g) => g.title);
    assert.ok(titulosGrupos.includes('Entregas'));
    assert.ok(titulosGrupos.includes('Relatórios'));

    const grupoEntregas = abaRecebimentos.groups.find((g) => g.title === 'Entregas');
    assert.ok(grupoEntregas?.buttons.some((b) => b.action === 'pick:Entrada'));
    assert.ok(grupoEntregas?.buttons.some((b) => b.action === 'fc:FORNECEDOR'));
    assert.ok(grupoEntregas?.buttons.some((b) => b.action === 'novocad:FORNECEDOR'));
  });

  it('deve ter as abas e comandos corretos para o módulo Vendas', () => {
    const abasVendas = MODULOS_CONFIG.vendas.abas;
    assert.deepEqual(abasVendas.map((a) => a.name), ['Pedidos', 'Cadastros']);

    const abaPedidos = abasVendas.find((a) => a.name === 'Pedidos');
    assert.ok(abaPedidos?.groups[0].buttons.some((b) => b.action === 'novopedido'));

    const abaCadastros = abasVendas.find((a) => a.name === 'Cadastros');
    assert.ok(abaCadastros?.groups[0].buttons.some((b) => b.action === 'fc:CLIENTE'));
  });

  describe('Função helper obterModuloDeTela', () => {
    it('deve mapear "inicio" para o módulo "inicio"', () => {
      assert.equal(obterModuloDeTela('inicio'), 'inicio');
    });

    it('deve mapear abas de estoque ("mp", "imp", "motos") para o módulo "estoque"', () => {
      assert.equal(obterModuloDeTela('mp'), 'estoque');
      assert.equal(obterModuloDeTela('imp'), 'estoque');
      assert.equal(obterModuloDeTela('motos'), 'estoque');
    });

    it('deve mapear "vendas" para o módulo "vendas"', () => {
      assert.equal(obterModuloDeTela('vendas'), 'vendas');
    });

    it('deve resolver o módulo de "saida" dependendo da procedência (compras vs estoque)', () => {
      assert.equal(obterModuloDeTela('saida', 'compras'), 'compras');
      assert.equal(obterModuloDeTela('saida', 'estoque'), 'estoque');
      assert.equal(obterModuloDeTela('saida'), 'estoque');
    });

    it('deve resolver o módulo de "clientes" dependendo da procedência (compras vs vendas)', () => {
      assert.equal(obterModuloDeTela('clientes', 'compras'), 'compras');
      assert.equal(obterModuloDeTela('clientes', 'vendas'), 'vendas');
      assert.equal(obterModuloDeTela('clientes'), 'vendas');
    });
  });
});
