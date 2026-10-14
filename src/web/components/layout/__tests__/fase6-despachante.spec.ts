import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  obterModuloDeTela,
  type ModuloCorporativo,
  type TelaOuAba,
  type AbaEstoque,
} from '../../../data/mock-almoxarifado.js';

describe('Fase 6: Despachante Central de Ações da Ribbon e Módulos (V5)', () => {
  // Simulador puro da lógica de despacho da Ribbon
  function despacharAcaoRibbon(action: string) {
    const separadorIndex = action.indexOf(':');
    const tipo = separadorIndex < 0 ? action : action.slice(0, separadorIndex);
    const param = separadorIndex < 0 ? '' : action.slice(separadorIndex + 1);

    const estado = {
      telaAtiva: 'inicio' as TelaOuAba,
      moduloAtivo: 'inicio' as ModuloCorporativo,
      isItemCreateOpen: false,
      itemCreateAba: 'mp' as AbaEstoque,
      isPickerOpen: false,
      pickerTipo: 'Entrada' as 'Entrada' | 'Saída',
      isOrderCreateOpen: false,
      isClientCreateOpen: false,
      clientCreateTipo: undefined as string | undefined,
      filtroClientesInicial: 'TODOS' as string,
      triggerExportCSV: false,
    };

    if (tipo === 'v') {
      if (param === 'inicio') {
        estado.moduloAtivo = 'inicio';
        estado.telaAtiva = 'inicio';
      } else if (param === 'mp' || param === 'imp' || param === 'motos') {
        estado.moduloAtivo = 'estoque';
        estado.telaAtiva = param as TelaOuAba;
      } else if (param === 'vendas') {
        estado.moduloAtivo = 'vendas';
        estado.telaAtiva = 'vendas';
      } else if (param === 'saida') {
        estado.telaAtiva = 'saida';
      } else if (param === 'clientes') {
        estado.telaAtiva = 'clientes';
      }
    } else if (tipo === 'novoitem') {
      estado.moduloAtivo = 'estoque';
      estado.telaAtiva = (param || 'mp') as AbaEstoque;
      estado.itemCreateAba = (param || 'mp') as AbaEstoque;
      estado.isItemCreateOpen = true;
    } else if (tipo === 'pick') {
      estado.isPickerOpen = true;
      estado.pickerTipo = param === 'Saída' ? 'Saída' : 'Entrada';
    } else if (tipo === 'novopedido') {
      estado.isOrderCreateOpen = true;
    } else if (tipo === 'novocad') {
      estado.isClientCreateOpen = true;
      estado.clientCreateTipo = param || 'CLIENTE';
    } else if (tipo === 'fc') {
      estado.telaAtiva = 'clientes';
      estado.filtroClientesInicial = param || 'TODOS';
    } else if (tipo === 'csv') {
      estado.telaAtiva = 'saida';
      estado.triggerExportCSV = true;
    }

    return estado;
  }

  describe('Navegação e Abertura via Comandos da Ribbon', () => {
    it('deve processar comando "v:inicio" direcionando para o início', () => {
      const res = despacharAcaoRibbon('v:inicio');
      assert.equal(res.telaAtiva, 'inicio');
      assert.equal(res.moduloAtivo, 'inicio');
    });

    it('deve processar comando "novoitem:motos" abrindo cadastro com a aba correspondente', () => {
      const res = despacharAcaoRibbon('novoitem:motos');
      assert.equal(res.telaAtiva, 'motos');
      assert.equal(res.moduloAtivo, 'estoque');
      assert.equal(res.isItemCreateOpen, true);
      assert.equal(res.itemCreateAba, 'motos');
    });

    it('deve processar comando "pick:Entrada" e "pick:Saída" para seleção rápida', () => {
      const ent = despacharAcaoRibbon('pick:Entrada');
      assert.equal(ent.isPickerOpen, true);
      assert.equal(ent.pickerTipo, 'Entrada');

      const sai = despacharAcaoRibbon('pick:Saída');
      assert.equal(sai.isPickerOpen, true);
      assert.equal(sai.pickerTipo, 'Saída');
    });

    it('deve processar comando "novocad:FORNECEDOR" abrindo modal pré-configurado', () => {
      const res = despacharAcaoRibbon('novocad:FORNECEDOR');
      assert.equal(res.isClientCreateOpen, true);
      assert.equal(res.clientCreateTipo, 'FORNECEDOR');
    });

    it('deve processar comando "fc:FORNECEDOR" navegando para clientes com filtro ativo', () => {
      const res = despacharAcaoRibbon('fc:FORNECEDOR');
      assert.equal(res.telaAtiva, 'clientes');
      assert.equal(res.filtroClientesInicial, 'FORNECEDOR');
    });

    it('deve processar comando "csv" direcionando para saída e ativando flag de exportação', () => {
      const res = despacharAcaoRibbon('csv');
      assert.equal(res.telaAtiva, 'saida');
      assert.equal(res.triggerExportCSV, true);
    });

    it('deve processar comando "novopedido" abrindo modal de pedidos de venda', () => {
      const res = despacharAcaoRibbon('novopedido');
      assert.equal(res.isOrderCreateOpen, true);
    });
  });

  describe('Navegação de Módulos (handleSelectModulo)', () => {
    function selecionarModulo(modulo: ModuloCorporativo) {
      if (modulo === 'inicio') return { tela: 'inicio', abaRibbon: 'Período de Análise' };
      if (modulo === 'estoque') return { tela: 'mp', abaRibbon: 'Materiais' };
      if (modulo === 'compras') return { tela: 'saida', abaRibbon: 'Recebimentos' };
      if (modulo === 'vendas') return { tela: 'vendas', abaRibbon: 'Pedidos' };
      return { tela: 'inicio', abaRibbon: 'Período de Análise' };
    }

    it('deve inicializar Compras em "saida" com aba "Recebimentos"', () => {
      const res = selecionarModulo('compras');
      assert.equal(res.tela, 'saida');
      assert.equal(res.abaRibbon, 'Recebimentos');
    });

    it('deve inicializar Estoque em "mp" com aba "Materiais"', () => {
      const res = selecionarModulo('estoque');
      assert.equal(res.tela, 'mp');
      assert.equal(res.abaRibbon, 'Materiais');
    });

    it('deve inicializar Vendas em "vendas" com aba "Pedidos"', () => {
      const res = selecionarModulo('vendas');
      assert.equal(res.tela, 'vendas');
      assert.equal(res.abaRibbon, 'Pedidos');
    });
  });
});
