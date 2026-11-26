import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularInicioPeriodoFaturamento,
  normalizarPeriodoFaturamento,
  PERIODO_FATURAMENTO_PADRAO,
} from '../nota-fiscal-emitida.schema';

describe('Período do faturamento', () => {
  const hoje = new Date('2026-11-26T15:00:00Z');

  it('calcula o início de cada período a partir de hoje', () => {
    assert.equal(calcularInicioPeriodoFaturamento('30d', hoje), '2026-10-27');
    assert.equal(calcularInicioPeriodoFaturamento('90d', hoje), '2026-08-28');
    assert.equal(calcularInicioPeriodoFaturamento('12m', hoje), '2025-11-26');
  });

  it('não aplica filtro para todo o histórico', () => {
    assert.equal(calcularInicioPeriodoFaturamento('todos', hoje), null);
  });

  it('usa o período padrão quando o valor é ausente ou inválido', () => {
    assert.equal(normalizarPeriodoFaturamento(undefined), PERIODO_FATURAMENTO_PADRAO);
    assert.equal(normalizarPeriodoFaturamento('5anos'), PERIODO_FATURAMENTO_PADRAO);
    assert.equal(normalizarPeriodoFaturamento('90d'), '90d');
  });
});
