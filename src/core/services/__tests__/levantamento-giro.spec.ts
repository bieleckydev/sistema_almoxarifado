import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  agregarSaidasPorItem,
  calcularCoberturaDias,
  classificarGiro,
  isSaidaDeGiro,
  ordenarLevantamento,
  type MovimentacaoParaGiro,
} from '../estoque-calculator';

describe('Levantamento / Queima de Estoque — regras de giro', () => {
  describe('isSaidaDeGiro', () => {
    it('considera venda (expedição) e consumo interno como giro', () => {
      assert.equal(isSaidaDeGiro({ itemId: 'a', tipo: 'SAIDA_EXPEDICAO', quantidade: 1 }), true);
      assert.equal(isSaidaDeGiro({ itemId: 'a', tipo: 'SAIDA_CONSUMO_INTERNO', quantidade: 1 }), true);
    });

    it('ignora entradas e ajustes de inventário', () => {
      assert.equal(isSaidaDeGiro({ itemId: 'a', tipo: 'ENTRADA_COMPRA', quantidade: 1 }), false);
      assert.equal(isSaidaDeGiro({ itemId: 'a', tipo: 'AJUSTE_INVENTARIO_NEGATIVO', quantidade: 1 }), false);
    });

    it('ignora saídas estornadas e os próprios lançamentos de estorno', () => {
      assert.equal(
        isSaidaDeGiro({ itemId: 'a', tipo: 'SAIDA_EXPEDICAO', quantidade: 1, estornado: true }),
        false
      );
      assert.equal(
        isSaidaDeGiro({ itemId: 'a', tipo: 'SAIDA_CONSUMO_INTERNO', quantidade: 1, estornoDe: 'm1' }),
        false
      );
    });
  });

  describe('agregarSaidasPorItem', () => {
    it('separa vendido de consumido, soma o total e guarda a última saída', () => {
      const movs: MovimentacaoParaGiro[] = [
        { itemId: 'a', tipo: 'SAIDA_EXPEDICAO', quantidade: 10, dataMovimentacao: '2026-10-01T10:00:00.000Z' },
        { itemId: 'a', tipo: 'SAIDA_CONSUMO_INTERNO', quantidade: 2.5, dataMovimentacao: '2026-11-03T10:00:00.000Z' },
        { itemId: 'a', tipo: 'ENTRADA_COMPRA', quantidade: 100, dataMovimentacao: '2026-11-20T10:00:00.000Z' },
        { itemId: 'b', tipo: 'SAIDA_EXPEDICAO', quantidade: 4, estornado: true },
      ];

      const mapa = agregarSaidasPorItem(movs);

      assert.deepEqual(mapa.get('a'), {
        totalVendido: 10,
        totalConsumido: 2.5,
        totalSaidas: 12.5,
        quantidadeMovimentos: 2,
        ultimaSaida: '2026-11-03T10:00:00.000Z',
      });
      assert.equal(mapa.has('b'), false);
    });
  });

  describe('calcularCoberturaDias e classificarGiro', () => {
    it('calcula a cobertura pelo ritmo diário de saída da janela', () => {
      // 90 saídas em 90 dias = 1/dia; saldo 45 dura 45 dias
      assert.equal(calcularCoberturaDias(45, 90, 90), 45);
    });

    it('retorna cobertura infinita para item com saldo e sem saída', () => {
      assert.equal(calcularCoberturaDias(10, 0, 90), Number.POSITIVE_INFINITY);
    });

    it('retorna cobertura zero quando não há saldo', () => {
      assert.equal(calcularCoberturaDias(0, 50, 90), 0);
    });

    it('classifica parado, lento, regular e alto giro', () => {
      assert.equal(classificarGiro(500, 0, 90), 'parado');
      assert.equal(classificarGiro(500, 90, 90), 'lento'); // 500 dias
      assert.equal(classificarGiro(60, 90, 90), 'regular'); // 60 dias
      assert.equal(classificarGiro(20, 90, 90), 'alto'); // 20 dias
      assert.equal(classificarGiro(30, 90, 90), 'alto'); // limite inclusivo
      assert.equal(classificarGiro(180, 90, 90), 'regular'); // limite inclusivo
    });
  });

  describe('ordenarLevantamento', () => {
    const linhas = [
      { descricao: 'Bucha', estoqueAtual: 50, totalSaidas: 0, coberturaDias: Number.POSITIVE_INFINITY },
      { descricao: 'Arruela', estoqueAtual: 200, totalSaidas: 30, coberturaDias: 600 },
      { descricao: 'Corrente', estoqueAtual: 5, totalSaidas: 120, coberturaDias: 4 },
      { descricao: 'Disco', estoqueAtual: 80, totalSaidas: 0, coberturaDias: Number.POSITIVE_INFINITY },
    ];
    const nomes = (l: typeof linhas) => l.map((x) => x.descricao);

    it('ordena do maior para o menor saldo', () => {
      assert.deepEqual(nomes(ordenarLevantamento(linhas, 'saldo_desc')), ['Arruela', 'Disco', 'Bucha', 'Corrente']);
    });

    it('ordena do menor para o maior saldo', () => {
      assert.deepEqual(nomes(ordenarLevantamento(linhas, 'saldo_asc')), ['Corrente', 'Bucha', 'Disco', 'Arruela']);
    });

    it('ordena pelos mais vendidos', () => {
      assert.deepEqual(nomes(ordenarLevantamento(linhas, 'saidas_desc')), ['Corrente', 'Arruela', 'Bucha', 'Disco']);
    });

    it('ordena pelos de giro baixo, desempatando pelo maior saldo parado', () => {
      assert.deepEqual(nomes(ordenarLevantamento(linhas, 'saidas_asc')), ['Disco', 'Bucha', 'Arruela', 'Corrente']);
    });

    it('ordena pela maior cobertura, com parados (infinito) no topo', () => {
      assert.deepEqual(nomes(ordenarLevantamento(linhas, 'cobertura_desc')), ['Disco', 'Bucha', 'Arruela', 'Corrente']);
    });

    it('não altera o array original', () => {
      const copia = [...linhas];
      ordenarLevantamento(linhas, 'saldo_desc');
      assert.deepEqual(linhas, copia);
    });
  });
});
