import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularJanelaDoHistorico,
  filtrarLinhasPainelEcommerce,
  gerarPainelEcommerceCSV,
  montarLinhasPainelEcommerce,
  ordenarLinhasPainelEcommerce,
  resumirPainelEcommerce,
} from '../ecommerce/painel-ecommerce';
import type { DashboardItem } from '../../../data/mock-almoxarifado';

function item(parcial: Partial<DashboardItem> & Pick<DashboardItem, 'id' | 'codigo' | 'descricao'>): DashboardItem {
  return {
    tipo: 'ACABADO',
    unidade: 'UNIDADE',
    estoqueAtual: 0,
    estoqueSeguranca: 0,
    ativo: true,
    aba: 'motos',
    categoria: 'Peças',
    capacidadeMaxima: 100,
    ...parcial,
  } as DashboardItem;
}

const itens: DashboardItem[] = [
  // 30 vendidos em 30 dias -> 1/dia, cobertura 25 dias: produzir
  item({ id: '1', codigo: 'MOT-001', descricao: 'Corrente 428', estoqueAtual: 25, estoqueSeguranca: 10 }),
  // Parado com 30x o mínimo: vender
  item({ id: '2', codigo: 'MOT-002', descricao: 'Pastilha dianteira', estoqueAtual: 300, estoqueSeguranca: 10, custoUnitario: 12.5 }),
  // Parado, entre o mínimo e 2x: equilibrado
  item({ id: '3', codigo: 'MOT-003', descricao: 'Manete', estoqueAtual: 15, estoqueSeguranca: 10 }),
  // Abaixo do mínimo, sem saída: produzir
  item({ id: '4', codigo: 'MOT-004', descricao: 'Retrovisor', estoqueAtual: 2, estoqueSeguranca: 10 }),
  // Outra categoria e item inativo ficam fora do painel
  item({ id: '5', codigo: 'MP-001', descricao: 'Chapa 2mm', aba: 'mp', tipo: 'PRODUTIVO_MATERIA_PRIMA' }),
  item({ id: '6', codigo: 'MOT-006', descricao: 'Bagageiro', ativo: false, estoqueAtual: 99, estoqueSeguranca: 1 }),
];

const movs = [
  { itemId: '1', tipo: 'SAIDA_EXPEDICAO' as const, quantidade: 30, dataMovimentacao: '2026-11-20T12:00:00.000Z' },
  // Ajuste e par estornado não são demanda
  { itemId: '2', tipo: 'AJUSTE_INVENTARIO_NEGATIVO' as const, quantidade: 50 },
  { itemId: '2', tipo: 'SAIDA_EXPEDICAO' as const, quantidade: 200, estornado: true },
];

describe('Painel E-commerce (Peças de motos)', () => {
  const linhas = montarLinhasPainelEcommerce(itens, movs, 30);
  const porId = (id: string) => linhas.find((l) => l.id === id)!;

  it('considera apenas peças de motos ativas', () => {
    assert.deepEqual(linhas.map((l) => l.id).sort(), ['1', '2', '3', '4']);
  });

  it('classifica cada peça pela regra de balanceamento do core', () => {
    assert.equal(porId('1').recomendacao, 'produzir');
    assert.equal(porId('1').quantidadeProduzir, 15);
    assert.equal(porId('1').totalVendido, 30);
    assert.equal(porId('2').recomendacao, 'vender');
    assert.equal(porId('3').recomendacao, 'equilibrado');
    assert.equal(porId('4').recomendacao, 'produzir');
  });

  it('ignora ajustes e estornos como demanda', () => {
    assert.equal(porId('2').totalSaidas, 0);
    assert.equal(porId('2').quantidadeExcedente, 290);
    assert.equal(porId('2').valorExcedente, 3625);
  });

  it('resume contadores, unidades e valor do excedente', () => {
    const r = resumirPainelEcommerce(linhas);
    assert.deepEqual(r.contagem, { todas: 4, produzir: 2, vender: 1, equilibrado: 1 });
    assert.equal(r.unidadesProduzir, 15 + 8);
    assert.equal(r.unidadesExcedentes, 290);
    assert.equal(r.valorExcedente, 3625);
  });

  it('filtra por recomendação e por código/descrição', () => {
    assert.deepEqual(
      filtrarLinhasPainelEcommerce(linhas, { recomendacao: 'produzir' }).map((l) => l.id).sort(),
      ['1', '4']
    );
    assert.deepEqual(filtrarLinhasPainelEcommerce(linhas, { busca: 'mot-003' }).map((l) => l.id), ['3']);
    assert.deepEqual(filtrarLinhasPainelEcommerce(linhas, { busca: 'pastilha' }).map((l) => l.id), ['2']);
  });

  it('ordena produção por cobertura, depois excedentes, depois equilibrados', () => {
    const ordenadas = ordenarLinhasPainelEcommerce(linhas);
    // Item 1 tem cobertura de 25 dias; item 4 não tem saída (cobertura infinita)
    assert.deepEqual(ordenadas.map((l) => l.id), ['1', '4', '2', '3']);
    assert.deepEqual(linhas.map((l) => l.id), ['1', '2', '3', '4'], 'não deve mutar o array original');
  });

  it('gera CSV com recomendação e quantidades na ordem recebida', () => {
    const csv = gerarPainelEcommerceCSV(ordenarLinhasPainelEcommerce(linhas), '7 dias');
    const linhasCsv = csv.replace(/^﻿/, '').trim().split(/\r?\n/);
    assert.equal(linhasCsv.length, 5);
    assert.ok(linhasCsv[0].includes('Vendido (7 dias)'));
    assert.ok(linhasCsv[1].includes('MOT-001') && linhasCsv[1].includes('Solicitar produção'));
    assert.ok(linhasCsv[3].includes('MOT-002') && linhasCsv[3].includes('Priorizar venda ML'));
    assert.ok(linhasCsv[2].includes('Sem saída'));
  });

  describe('calcularJanelaDoHistorico', () => {
    const base = new Date(2026, 10, 26, 15, 0, 0);

    it('conta da movimentação mais antiga até hoje, inclusive', () => {
      const janela = calcularJanelaDoHistorico(
        [
          { itemId: 'a', tipo: 'SAIDA_EXPEDICAO', quantidade: 1, dataMovimentacao: new Date(2026, 10, 20, 9).toISOString() },
          { itemId: 'a', tipo: 'SAIDA_EXPEDICAO', quantidade: 1, dataMovimentacao: new Date(2026, 10, 17, 18).toISOString() },
        ],
        base
      );
      assert.equal(janela, 10);
    });

    it('retorna 1 sem movimentações datadas', () => {
      assert.equal(calcularJanelaDoHistorico([], base), 1);
      assert.equal(calcularJanelaDoHistorico([{ itemId: 'a', tipo: 'SAIDA_EXPEDICAO', quantidade: 1 }], base), 1);
    });
  });
});
