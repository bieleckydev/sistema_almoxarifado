import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { arredondar3, calcularRazaoEstoque, formatarNumeroPtBr } from '../../domain/quantidade';
import { calcularLotesDeItem, escolherLoteDisponivel } from '../lotes';
import { calcularCustoMedioPonderado, calcularValorTotalItem, formatarMoedaBrl } from '../custo-medio';
import { AuditoriaService, MemoryAuditoriaRepository } from '../auditoria.service';

describe('Serviços e Utilitários Fundamentais 3.0', () => {
  describe('arredondar3 e calcularRazaoEstoque', () => {
    it('deve arredondar com precisão de 3 casas decimais', () => {
      assert.equal(arredondar3(10.12345), 10.123);
      assert.equal(arredondar3(0.0006), 0.001);
      assert.equal(arredondar3(48), 48);
    });

    it('deve calcular razão de estoque de forma segura contra divisão por zero', () => {
      assert.equal(calcularRazaoEstoque(10, 20), 0.5);
      assert.equal(calcularRazaoEstoque(0, 0), 0);
      assert.equal(calcularRazaoEstoque(5, 0), 999);
    });

    it('deve formatar número no padrão pt-BR', () => {
      const formatted = formatarNumeroPtBr(1250.5);
      assert.ok(formatted.includes('1.250') || formatted.includes('1250,5'));
    });
  });

  describe('calcularLotesDeItem e escolherLoteDisponivel', () => {
    it('deve calcular os lotes disponíveis e saldo residual do loteBase', () => {
      const item = {
        id: 'item-1',
        saldo: 48,
        loteBase: 'Saldo anterior',
      };

      const movs = [
        { tipo: 'Entrada', quantidade: 20, lote: 'L2409-118' },
        { tipo: 'Saída', quantidade: 5, lote: 'L2409-118' },
        { tipo: 'Entrada', quantidade: 15, lote: 'L2409-120' },
      ];

      const lotes = calcularLotesDeItem(item, movs);
      // L2409-118: 20 - 5 = 15
      // L2409-120: 15
      // Saldo base: 48 - (15 + 15) = 18
      const lote118 = lotes.find((l) => l.lote === 'L2409-118');
      const lote120 = lotes.find((l) => l.lote === 'L2409-120');
      const loteBase = lotes.find((l) => l.lote === 'Saldo anterior');

      assert.equal(lote118?.quantidade, 15);
      assert.equal(lote120?.quantidade, 15);
      assert.equal(loteBase?.quantidade, 18);
    });

    it('deve escolher o primeiro lote com saldo suficiente', () => {
      const lotes = [
        { lote: 'LOTE-A', quantidade: 5 },
        { lote: 'LOTE-B', quantidade: 20 },
      ];

      assert.equal(escolherLoteDisponivel(lotes, 10)?.lote, 'LOTE-B');
      assert.equal(escolherLoteDisponivel(lotes, 30), null);
    });
  });

  describe('calcularCustoMedioPonderado e valor', () => {
    it('deve calcular o custo médio ponderado com precisão de 2 casas', () => {
      // Saldo 10 com custo 100 = 1000
      // Entrada de 10 a 200 = 2000
      // Total 3000 / 20 = 150
      assert.equal(calcularCustoMedioPonderado(10, 100, 10, 200), 150);

      // Saldo 0 com entrada a 50 = 50
      assert.equal(calcularCustoMedioPonderado(0, 0, 10, 50), 50);

      // Entrada com custo 0 não altera custo anterior
      assert.equal(calcularCustoMedioPonderado(10, 100, 5, 0), 100);
    });

    it('deve calcular o valor total em estoque do item', () => {
      assert.equal(calcularValorTotalItem(10, 15.5), 155);
      assert.equal(calcularValorTotalItem(0, 200), 0);
    });
  });

  describe('AuditoriaService', () => {
    it('deve registrar e listar eventos de auditoria', async () => {
      const repo = new MemoryAuditoriaRepository();
      const service = new AuditoriaService(repo);

      await service.registrar({
        quando: '2026-10-21 13:00',
        usuarioId: 'u-1',
        usuarioNome: 'Marina',
        papel: 'Administrador',
        acao: 'Entrada',
        detalhe: 'Chapa de aço 3 mm · 20 un · NF 123456',
        entidade: 'item',
        entidadeId: 'item-1',
      });

      const logs = await service.listar();
      assert.equal(logs.length, 1);
      assert.equal(logs[0].acao, 'Entrada');
      assert.equal(logs[0].usuarioNome, 'Marina');
      assert.ok(logs[0].id);
    });
  });
});
