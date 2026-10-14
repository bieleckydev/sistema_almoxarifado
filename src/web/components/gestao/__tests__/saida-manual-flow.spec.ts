import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  gerarMovimentacoesCSV,
  formatarDataBR,
  type MovimentacaoParaExportacao,
} from '../saida/exportCsv';
import {
  isNoPeriodo,
  matchMovimentacao,
  formatarRotuloDataHora,
  hoje,
  ontem,
  diaAntes,
  type MovimentacaoEnriquecida,
  type ResumoItemPeriodo,
} from '../../../hooks/useMovimentacoesPeriodo';
import type { DashboardItem } from '../../../data/mock-almoxarifado';

describe('Fase 6 — Módulo de Saída Manual, Relatórios Analíticos e Exportador CSV', () => {
  describe('Utilitário de Exportação CSV (exportCsv)', () => {
    it('deve converter data ISO ou YYYY-MM-DD para formato brasileiro DD/MM/AAAA', () => {
      assert.equal(formatarDataBR('2026-10-14'), '14/10/2026');
      assert.equal(formatarDataBR('2026-10-14T15:30:00.000Z'), '14/10/2026');
      assert.equal(formatarDataBR('14/10/2026'), '14/10/2026');
      assert.equal(formatarDataBR(''), '');
    });

    it('deve gerar CSV estruturado com UTF-8 BOM, delimitador ponto-e-vírgula e colunas corretas', () => {
      const dados: MovimentacaoParaExportacao[] = [
        {
          data: '2026-10-14',
          hora: '09:42',
          tipo: 'Saída',
          codigo: '10-BAR-001',
          item: 'Barra redonda de aço 1020',
          quantidade: 6,
          unidade: 'un',
          responsavel: 'Manutenção',
          nfe: '123456',
          lote: 'L2409-118',
          observacao: 'Uso na fresadora "A"',
        },
        {
          data: '2026-10-14',
          hora: '08:30',
          tipo: 'Entrada',
          codigo: '90-LUV-001',
          item: 'Luva de vaqueta cano curto',
          quantidade: 20,
          unidade: 'par',
          responsavel: 'Recebimento',
          nfe: '118420',
          observacao: '',
        },
      ];

      const csv = gerarMovimentacoesCSV(dados);

      // Valida UTF-8 BOM no início para compatibilidade com Microsoft Excel
      assert.ok(csv.startsWith('\ufeff'));

      const linhas = csv.slice(1).split('\r\n');
      assert.equal(linhas.length, 3); // 1 cabeçalho + 2 linhas de dados

      // Validação do cabeçalho
      assert.equal(
        linhas[0],
        '"Data";"Hora";"Movimento";"Código";"Item";"Quantidade";"Unidade";"Responsável";"NF-e";"Lote";"Observação"'
      );

      // Validação do escape de aspas e formatação de dados
      assert.ok(linhas[1].includes('"14/10/2026"'));
      assert.ok(linhas[1].includes('"09:42"'));
      assert.ok(linhas[1].includes('"Saída"'));
      assert.ok(linhas[1].includes('"10-BAR-001"'));
      assert.ok(linhas[1].includes('"6"'));
      assert.ok(linhas[1].includes('"Manutenção"'));
      assert.ok(linhas[1].includes('"Uso na fresadora ""A"""')); // Aspas escapadas

      // Segunda linha
      assert.ok(linhas[2].includes('"Entrada"'));
      assert.ok(linhas[2].includes('"Luva de vaqueta cano curto"'));
      assert.ok(linhas[2].includes('"20"'));
    });
  });

  describe('Filtros Temporais por Período (isNoPeriodo)', () => {
    it('deve identificar corretamente se a data pertence a Hoje, Ontem, 7 dias ou Tudo', () => {
      const hojeStr = hoje();
      const ontemStr = ontem();
      const tresDiasAtras = diaAntes(3);
      const dezDiasAtras = diaAntes(10);

      // Filtro "Hoje"
      assert.equal(isNoPeriodo(hojeStr, 'Hoje'), true);
      assert.equal(isNoPeriodo(ontemStr, 'Hoje'), false);
      assert.equal(isNoPeriodo(tresDiasAtras, 'Hoje'), false);

      // Filtro "Ontem"
      assert.equal(isNoPeriodo(hojeStr, 'Ontem'), false);
      assert.equal(isNoPeriodo(ontemStr, 'Ontem'), true);
      assert.equal(isNoPeriodo(tresDiasAtras, 'Ontem'), false);

      // Filtro "7 dias"
      assert.equal(isNoPeriodo(hojeStr, '7 dias'), true);
      assert.equal(isNoPeriodo(ontemStr, '7 dias'), true);
      assert.equal(isNoPeriodo(tresDiasAtras, '7 dias'), true);
      assert.equal(isNoPeriodo(dezDiasAtras, '7 dias'), false);

      // Filtro "Tudo"
      assert.equal(isNoPeriodo(hojeStr, 'Tudo'), true);
      assert.equal(isNoPeriodo(dezDiasAtras, 'Tudo'), true);
    });

    it('deve formatar rótulos amigáveis de data e hora (Hoje, Ontem, DD/MM/AAAA)', () => {
      assert.equal(formatarRotuloDataHora(hoje(), '09:42'), 'Hoje, 09:42');
      assert.equal(formatarRotuloDataHora(ontem(), '17:10'), 'Ontem, 17:10');
      assert.equal(formatarRotuloDataHora('2026-10-05', '11:00'), '05/10/2026, 11:00');
    });
  });

  describe('Busca Multifatorial de Movimentações (matchMovimentacao)', () => {
    const itemMock: DashboardItem = {
      id: 'it-1',
      codigo: '10-BAR-001',
      descricao: 'Barra redonda de aço 1020 1" x 6m',
      categoria: 'Barras',
      unidade: 'PECA',
      estoqueAtual: 42,
      estoqueSeguranca: 15,
      capacidadeMaxima: 100,
      aba: 'mp',
      tipo: 'PRODUTIVO_MATERIA_PRIMA',
      ativo: true,
      especificacoes: {
        'NF-e': '123456',
        Lote: 'L2409-118',
        Fornecedor: 'Aços Santa Rita',
      },
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    const movMock: MovimentacaoEnriquecida = {
      id: 'mov-1',
      itemId: 'it-1',
      tipo: 'Saída',
      quantidade: 5,
      data: hoje(),
      hora: '14:20',
      quem: 'Produção Serralheria',
      obs: 'Chassi modelo X',
      info: { 'NF-e': '123456', Lote: 'L2409-118' },
      item: itemMock,
      rotulo: 'Hoje, 14:20',
    };

    it('deve localizar movimentação por nome do item ou código SKU', () => {
      assert.equal(matchMovimentacao(movMock, 'barra redonda'), true);
      assert.equal(matchMovimentacao(movMock, '10-bar-001'), true);
      assert.equal(matchMovimentacao(movMock, 'chapa'), false);
    });

    it('deve localizar movimentação por responsável ou observação', () => {
      assert.equal(matchMovimentacao(movMock, 'serralheria'), true);
      assert.equal(matchMovimentacao(movMock, 'chassi modelo x'), true);
      assert.equal(matchMovimentacao(movMock, 'pintura'), false);
    });

    it('deve localizar movimentação por metadados fiscais (NF-e, Lote)', () => {
      assert.equal(matchMovimentacao(movMock, '123456'), true);
      assert.equal(matchMovimentacao(movMock, 'L2409-118'), true);
      assert.equal(matchMovimentacao(movMock, '999999'), false);
    });
  });

  describe('Cálculo Consolidado do Resumo por Item no Período', () => {
    it('deve totalizar entradas e saídas por item e ordenar alfabeticamente', () => {
      const itemA: DashboardItem = {
        id: 'it-a',
        codigo: '10-A',
        descricao: 'Alumínio em chapa',
        categoria: 'Chapas',
        unidade: 'PECA',
        estoqueAtual: 50,
        estoqueSeguranca: 10,
        capacidadeMaxima: 100,
        aba: 'mp',
        tipo: 'PRODUTIVO_MATERIA_PRIMA',
        ativo: true,
        especificacoes: {},
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      };

      const itemB: DashboardItem = {
        id: 'it-b',
        codigo: '10-B',
        descricao: 'Barra de aço',
        categoria: 'Barras',
        unidade: 'PECA',
        estoqueAtual: 20,
        estoqueSeguranca: 5,
        capacidadeMaxima: 50,
        aba: 'mp',
        tipo: 'PRODUTIVO_MATERIA_PRIMA',
        ativo: true,
        especificacoes: {},
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      };

      const movimentacoes: MovimentacaoEnriquecida[] = [
        {
          id: '1',
          itemId: 'it-b',
          tipo: 'Saída',
          quantidade: 3,
          data: hoje(),
          hora: '09:00',
          quem: 'Fábrica',
          item: itemB,
          rotulo: 'Hoje, 09:00',
        },
        {
          id: '2',
          itemId: 'it-a',
          tipo: 'Entrada',
          quantidade: 15,
          data: hoje(),
          hora: '10:00',
          quem: 'Fornecedor',
          item: itemA,
          rotulo: 'Hoje, 10:00',
        },
        {
          id: '3',
          itemId: 'it-b',
          tipo: 'Entrada',
          quantidade: 10,
          data: hoje(),
          hora: '11:00',
          quem: 'Fornecedor',
          item: itemB,
          rotulo: 'Hoje, 11:00',
        },
        {
          id: '4',
          itemId: 'it-b',
          tipo: 'Saída',
          quantidade: 2,
          data: hoje(),
          hora: '12:00',
          quem: 'Fábrica',
          item: itemB,
          rotulo: 'Hoje, 12:00',
        },
      ];

      // Algoritmo de agregação
      const mapa = new Map<string, { entrou: number; saiu: number; item: DashboardItem }>();
      for (const m of movimentacoes) {
        if (!m.item) continue;
        const reg = mapa.get(m.itemId) || { entrou: 0, saiu: 0, item: m.item };
        if (m.tipo === 'Entrada') reg.entrou += m.quantidade;
        else reg.saiu += m.quantidade;
        mapa.set(m.itemId, reg);
      }

      const resumo: ResumoItemPeriodo[] = Array.from(mapa.values())
        .map(({ item, entrou, saiu }) => ({
          itemId: item.id,
          item,
          totalEntrou: entrou,
          totalSaiu: saiu,
          estoqueAtual: item.estoqueAtual,
        }))
        .sort((a, b) => a.item.descricao.localeCompare(b.item.descricao));

      assert.equal(resumo.length, 2);

      // Item A ("Alumínio em chapa") vem primeiro na ordem alfabética
      assert.equal(resumo[0].item.descricao, 'Alumínio em chapa');
      assert.equal(resumo[0].totalEntrou, 15);
      assert.equal(resumo[0].totalSaiu, 0);
      assert.equal(resumo[0].estoqueAtual, 50);

      // Item B ("Barra de aço") vem em segundo
      assert.equal(resumo[1].item.descricao, 'Barra de aço');
      assert.equal(resumo[1].totalEntrou, 10);
      assert.equal(resumo[1].totalSaiu, 5); // 3 + 2
      assert.equal(resumo[1].estoqueAtual, 20);
    });
  });

  describe('Validações de Lançamento Avulso de Movimentação', () => {
    it('deve impedir saída manual caso a quantidade solicitada exceda o estoque atual', () => {
      const item: DashboardItem = {
        id: 'it-flap',
        codigo: '90-DIS-001',
        descricao: 'Disco flap 4.1/2 grão 60',
        categoria: 'Abrasivos',
        unidade: 'UNIDADE',
        estoqueAtual: 5,
        estoqueSeguranca: 20,
        capacidadeMaxima: 100,
        aba: 'imp',
        tipo: 'IMPRODUTIVO_CONSUMIVEL',
        ativo: true,
        especificacoes: {},
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      };

      const validar = (tipo: 'Saída' | 'Entrada', qtd: number, quem: string) => {
        if (qtd <= 0) return 'Informe uma quantidade maior que zero.';
        if (!quem.trim()) return 'Informe quem retirou ou recebeu o material.';
        if (tipo === 'Saída' && qtd > item.estoqueAtual) {
          return `Estoque insuficiente: há ${item.estoqueAtual} un de ${item.descricao}.`;
        }
        return null;
      };

      // Quantidade inválida
      assert.equal(validar('Saída', 0, 'Produção'), 'Informe uma quantidade maior que zero.');

      // Responsável vazio
      assert.equal(validar('Saída', 2, '   '), 'Informe quem retirou ou recebeu o material.');

      // Saída excedendo estoque atual (5 < 8)
      assert.equal(
        validar('Saída', 8, 'Produção'),
        'Estoque insuficiente: há 5 un de Disco flap 4.1/2 grão 60.'
      );

      // Saída válida
      assert.equal(validar('Saída', 5, 'Produção'), null);

      // Entrada com qualquer quantidade positiva é permitida
      assert.equal(validar('Entrada', 50, 'Fornecedor Abrasivos'), null);
    });
  });
});
