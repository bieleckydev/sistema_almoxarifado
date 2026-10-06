import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatarTextoFalta,
  formatarUnidadeMedida,
  pluralizarTermo,
} from '../pluralization';

describe('Utilitários de Pluralização e Concordância Gramatical', () => {
  describe('formatarTextoFalta', () => {
    it('deve usar singular "Falta 1 un para o mínimo" quando déficit for 1', () => {
      const resultado = formatarTextoFalta(1, 'un');
      assert.strictEqual(resultado, 'Falta 1 un para o mínimo');
    });

    it('deve usar plural "Faltam 14 un para o mínimo" quando déficit for maior que 1', () => {
      const resultado = formatarTextoFalta(14, 'un');
      assert.strictEqual(resultado, 'Faltam 14 un para o mínimo');
    });

    it('deve flexionar unidade por extenso no singular ("Falta 1 unidade para o mínimo")', () => {
      const resultado = formatarTextoFalta(1, 'UNIDADE', { porExtenso: true });
      assert.strictEqual(resultado, 'Falta 1 unidade para o mínimo');
    });

    it('deve flexionar unidade por extenso no plural ("Faltam 4 unidades para o mínimo")', () => {
      const resultado = formatarTextoFalta(4, 'UNIDADE', { porExtenso: true });
      assert.strictEqual(resultado, 'Faltam 4 unidades para o mínimo');
    });

    it('deve respeitar ausência de sufixo quando configurado', () => {
      const resultadoSingular = formatarTextoFalta(1, 'un', { sufixo: '' });
      assert.strictEqual(resultadoSingular, 'Falta 1 un');

      const resultadoPlural = formatarTextoFalta(7, 'un', { sufixo: '' });
      assert.strictEqual(resultadoPlural, 'Faltam 7 un');
    });
  });

  describe('formatarUnidadeMedida', () => {
    it('deve retornar abreviação padrão para un, kg, m', () => {
      assert.strictEqual(formatarUnidadeMedida(1, 'UNIDADE'), 'un');
      assert.strictEqual(formatarUnidadeMedida(5, 'KG'), 'kg');
      assert.strictEqual(formatarUnidadeMedida(2, 'METRO'), 'm');
    });

    it('deve flexionar corretamente no plural por extenso', () => {
      assert.strictEqual(formatarUnidadeMedida(1, 'PECA', true), 'peça');
      assert.strictEqual(formatarUnidadeMedida(3, 'PECA', true), 'peças');
      assert.strictEqual(formatarUnidadeMedida(1, 'PACOTE', true), 'pacote');
      assert.strictEqual(formatarUnidadeMedida(2, 'PACOTE', true), 'pacotes');
    });
  });

  describe('pluralizarTermo', () => {
    it('deve concordar singular quando quantidade for 1', () => {
      assert.strictEqual(pluralizarTermo(1, 'item exibido', 'itens exibidos'), '1 item exibido');
      assert.strictEqual(pluralizarTermo(1, 'item cadastrado', 'itens cadastrados'), '1 item cadastrado');
    });

    it('deve concordar plural quando quantidade for diferente de 1', () => {
      assert.strictEqual(pluralizarTermo(6, 'item exibido', 'itens exibidos'), '6 itens exibidos');
      assert.strictEqual(pluralizarTermo(0, 'item exibido', 'itens exibidos'), '0 itens exibidos');
    });
  });
});
