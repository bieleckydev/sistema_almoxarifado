import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularIntervaloPeriodo,
  calcularIntervaloIsoPeriodo,
  obterProximoPeriodo,
  isNoPeriodo,
  usePeriodoStore,
  isoDate,
  diaAntes,
  hoje,
  ontem,
  PERIODOS_DISPONIVEIS,
  type PeriodoFiltro,
} from '../usePeriodoGlobal.js';

describe('Fase 2: Hook e Store de Período Global (V5)', () => {
  // Fixar data base de teste para validações determinísticas: 14/10/2026
  const dataBaseTeste = new Date('2026-10-14T12:00:00Z');

  describe('Funções de cálculo de data e dias relativos', () => {
    it('deve formatar hoje e ontem corretamente a partir da data base', () => {
      const h = hoje(dataBaseTeste);
      const o = ontem(dataBaseTeste);

      assert.equal(h, '2026-10-14');
      assert.equal(o, '2026-10-13');
    });

    it('deve calcular 6 dias antes corretamente para o intervalo de 7 dias', () => {
      const d6 = diaAntes(6, dataBaseTeste);
      assert.equal(d6, '2026-10-08');
    });
  });

  describe('Formatação do Intervalo Textual (calcularIntervaloPeriodo / perTxt)', () => {
    it('deve formatar "Tudo" como "todo o histórico"', () => {
      assert.equal(calcularIntervaloPeriodo('Tudo', dataBaseTeste), 'todo o histórico');
    });

    it('deve formatar "Hoje" com a data em padrão brasileiro DD/MM/AAAA', () => {
      assert.equal(calcularIntervaloPeriodo('Hoje', dataBaseTeste), '14/10/2026');
    });

    it('deve formatar "Ontem" com a data em padrão brasileiro DD/MM/AAAA', () => {
      assert.equal(calcularIntervaloPeriodo('Ontem', dataBaseTeste), '13/10/2026');
    });

    it('deve formatar "7 dias" no formato "DD/MM/AAAA à DD/MM/AAAA"', () => {
      const resultado = calcularIntervaloPeriodo('7 dias', dataBaseTeste);
      assert.equal(resultado, '08/10/2026 à 14/10/2026');
    });
  });

  describe('Alternância Circular de Períodos (obterProximoPeriodo)', () => {
    it('deve avançar na sequência exata: Hoje -> Ontem -> 7 dias -> Tudo -> Hoje', () => {
      assert.equal(obterProximoPeriodo('Hoje'), 'Ontem');
      assert.equal(obterProximoPeriodo('Ontem'), '7 dias');
      assert.equal(obterProximoPeriodo('7 dias'), 'Tudo');
      assert.equal(obterProximoPeriodo('Tudo'), 'Hoje');
    });
  });

  describe('Filtro de pertinência de datas (isNoPeriodo)', () => {
    it('deve incluir qualquer data quando período for "Tudo"', () => {
      assert.equal(isNoPeriodo('2025-01-01', 'Tudo', dataBaseTeste), true);
      assert.equal(isNoPeriodo('2026-10-14', 'Tudo', dataBaseTeste), true);
    });

    it('deve validar "Hoje"', () => {
      assert.equal(isNoPeriodo('2026-10-14', 'Hoje', dataBaseTeste), true);
      assert.equal(isNoPeriodo('2026-10-13', 'Hoje', dataBaseTeste), false);
    });

    it('deve validar "Ontem"', () => {
      assert.equal(isNoPeriodo('2026-10-13', 'Ontem', dataBaseTeste), true);
      assert.equal(isNoPeriodo('2026-10-14', 'Ontem', dataBaseTeste), false);
    });

    it('deve validar "7 dias" abrangendo de 08/10/2026 a 14/10/2026', () => {
      assert.equal(isNoPeriodo('2026-10-14', '7 dias', dataBaseTeste), true);
      assert.equal(isNoPeriodo('2026-10-10', '7 dias', dataBaseTeste), true);
      assert.equal(isNoPeriodo('2026-10-08', '7 dias', dataBaseTeste), true);
      assert.equal(isNoPeriodo('2026-10-07', '7 dias', dataBaseTeste), false);
    });
  });

  describe('Store Global Zustand (usePeriodoStore)', () => {
    it('deve inicializar com período "Hoje" e texto correspondente', () => {
      const state = usePeriodoStore.getState();
      assert.ok(['Hoje', 'Ontem', '7 dias', 'Tudo'].includes(state.periodo));
      assert.ok(state.textoIntervalo);
    });

    it('deve permitir atualizar período via setPeriodo e recalcular textoIntervalo', () => {
      usePeriodoStore.getState().setPeriodo('7 dias');
      const state = usePeriodoStore.getState();
      assert.equal(state.periodo, '7 dias');
      assert.ok(state.textoIntervalo.includes(' à '));
    });

    it('deve avançar ciclicamente via proximoPeriodo', () => {
      usePeriodoStore.getState().setPeriodo('Tudo');
      usePeriodoStore.getState().proximoPeriodo();
      const state = usePeriodoStore.getState();
      assert.equal(state.periodo, 'Hoje');
    });
  });

  describe('calcularIntervaloIsoPeriodo', () => {
    const inicioLocal = (ano: number, mes: number, dia: number) =>
      new Date(ano, mes - 1, dia, 0, 0, 0, 0).toISOString();

    it('Hoje começa à meia-noite local e vai até agora (1 dia)', () => {
      const r = calcularIntervaloIsoPeriodo('Hoje', dataBaseTeste);
      assert.equal(r.dataInicio, inicioLocal(2026, 10, 14));
      assert.equal(r.dataFim, undefined);
      assert.equal(r.janelaDias, 1);
    });

    it('Ontem é um intervalo fechado que termina antes da meia-noite de hoje', () => {
      const r = calcularIntervaloIsoPeriodo('Ontem', dataBaseTeste);
      assert.equal(r.dataInicio, inicioLocal(2026, 10, 13));
      assert.equal(r.dataFim, new Date(new Date(inicioLocal(2026, 10, 14)).getTime() - 1).toISOString());
      assert.equal(r.janelaDias, 1);
    });

    it('7 dias inclui hoje e os 6 dias anteriores', () => {
      const r = calcularIntervaloIsoPeriodo('7 dias', dataBaseTeste);
      assert.equal(r.dataInicio, inicioLocal(2026, 10, 8));
      assert.equal(r.janelaDias, 7);
    });

    it('Tudo não restringe datas e deixa a janela a cargo do histórico', () => {
      assert.deepEqual(calcularIntervaloIsoPeriodo('Tudo', dataBaseTeste), { janelaDias: null });
    });
  });
});
