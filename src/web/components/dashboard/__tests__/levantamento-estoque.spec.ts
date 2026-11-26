import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  montarLinhasLevantamento,
  filtrarLinhasLevantamento,
  gerarLevantamentoCSV,
  formatarCobertura,
} from '../levantamento/levantamento';
import { ordenarLevantamento } from '../../../../core/services/estoque-calculator';
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
  item({ id: '1', codigo: 'MOT-001', descricao: 'Corrente 428', estoqueAtual: 10, estoqueSeguranca: 5, custoUnitario: 20 }),
  item({ id: '2', codigo: 'MOT-002', descricao: 'Pastilha "premium"', estoqueAtual: 300, estoqueSeguranca: 10, custoUnitario: 12.5 }),
  item({ id: '3', codigo: 'MP-001', descricao: 'Chapa 2mm', aba: 'mp', tipo: 'PRODUTIVO_MATERIA_PRIMA', unidade: 'KG', estoqueAtual: 0, estoqueSeguranca: 50 }),
];

const movs = [
  { itemId: '1', tipo: 'SAIDA_EXPEDICAO' as const, quantidade: 80, dataMovimentacao: '2026-11-20T12:00:00.000Z' },
  { itemId: '1', tipo: 'SAIDA_CONSUMO_INTERNO' as const, quantidade: 10, dataMovimentacao: '2026-11-10T12:00:00.000Z' },
  { itemId: '2', tipo: 'AJUSTE_INVENTARIO_NEGATIVO' as const, quantidade: 5 },
];

describe('Levantamento / Queima de Estoque — visão analítica', () => {
  const linhas = montarLinhasLevantamento(itens, movs, 90);

  it('inclui todos os itens, inclusive os sem saída', () => {
    assert.equal(linhas.length, 3);
    const pastilha = linhas.find((l) => l.id === '2')!;
    assert.equal(pastilha.totalSaidas, 0);
    assert.equal(pastilha.giro, 'parado');
    assert.equal(pastilha.coberturaDias, Number.POSITIVE_INFINITY);
    assert.equal(pastilha.valorEstoque, 3750);
  });

  it('separa vendido e consumido e calcula cobertura e giro', () => {
    const corrente = linhas.find((l) => l.id === '1')!;
    assert.equal(corrente.totalVendido, 80);
    assert.equal(corrente.totalConsumido, 10);
    assert.equal(corrente.totalSaidas, 90);
    assert.equal(corrente.coberturaDias, 10);
    assert.equal(corrente.giro, 'alto');
    assert.equal(corrente.ultimaSaida, '2026-11-20T12:00:00.000Z');
  });

  it('filtra por categoria, giro, saldo e busca por código ou descrição', () => {
    assert.deepEqual(filtrarLinhasLevantamento(linhas, { categoria: 'mp' }).map((l) => l.id), ['3']);
    assert.deepEqual(filtrarLinhasLevantamento(linhas, { giro: 'parado' }).map((l) => l.id), ['2', '3']);
    assert.deepEqual(filtrarLinhasLevantamento(linhas, { somenteComSaldo: true }).map((l) => l.id), ['1', '2']);
    assert.deepEqual(filtrarLinhasLevantamento(linhas, { busca: 'mot-002' }).map((l) => l.id), ['2']);
    assert.deepEqual(filtrarLinhasLevantamento(linhas, { busca: 'chapa' }).map((l) => l.id), ['3']);
  });

  it('formata cobertura legível', () => {
    assert.equal(formatarCobertura(Number.POSITIVE_INFINITY), 'Sem saída');
    assert.equal(formatarCobertura(1200), '1.200 dias');
  });

  describe('gerarLevantamentoCSV', () => {
    const ordenadas = ordenarLevantamento(linhas, 'saldo_desc');
    const csv = gerarLevantamentoCSV(ordenadas, 90);
    const linhasCsv = csv.replace('﻿', '').split('\r\n');

    it('usa BOM UTF-8, separador ";" e cabeçalho com a janela', () => {
      assert.ok(csv.startsWith('﻿'));
      assert.ok(linhasCsv[0].includes('"Vendido (90d)"'));
      assert.equal(linhasCsv[0].split(';').length, 13);
    });

    it('respeita a ordem aplicada na tela', () => {
      const codigos = linhasCsv.slice(1).map((l) => l.split(';')[0]);
      assert.deepEqual(codigos, ['"MOT-002"', '"MOT-001"', '"MP-001"']);
    });

    it('formata números com vírgula decimal, datas pt-BR e escapa aspas', () => {
      assert.equal(
        linhasCsv[1],
        '"MOT-002";"Pastilha ""premium""";"Peças de Motos";"un";"300";"10";"0";"0";"0";"Sem saída";"Parado";"";"3750"'
      );
      assert.equal(
        linhasCsv[2],
        '"MOT-001";"Corrente 428";"Peças de Motos";"un";"10";"5";"80";"10";"90";"10";"Giro alto";"20/11/2026";"200"'
      );
    });
  });
});
