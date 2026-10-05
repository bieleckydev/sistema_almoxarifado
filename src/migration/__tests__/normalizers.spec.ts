import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCode,
  normalizeDate,
  normalizeNumber,
  normalizeRegistration,
  normalizeSourceRecord,
  normalizeUnit,
} from '../normalizers';

test('normaliza códigos industriais sem perder o valor original', () => {
  const result = normalizeCode(' 90 / 001 ', 'Código');
  assert.equal(result.original, ' 90 / 001 ');
  assert.equal(result.normalized, '90-001');
  assert.equal(result.changed, true);
  assert.equal(result.issues.length, 0);
});

test('normaliza números brasileiros com separador decimal e milhar', () => {
  assert.equal(normalizeNumber('1.234,50', 'Quantidade').normalized, 1234.5);
  assert.equal(normalizeNumber('12,5', 'Quantidade').normalized, 12.5);
});

test('normaliza matrícula, unidade e data', () => {
  assert.equal(normalizeRegistration('42', 'Matrícula').normalized, '042');
  assert.equal(normalizeUnit('quilogramas', 'Unidade').normalized, 'KG');
  assert.equal(normalizeDate('05/10/2026', 'Data').normalized, '2026-10-05T00:00:00.000Z');
});

test('gera erro explícito para unidade e número desconhecidos', () => {
  assert.equal(normalizeUnit('caixa', 'Unidade').issues[0].severity, 'error');
  assert.equal(normalizeNumber('abc', 'Quantidade').issues[0].severity, 'error');
});

test('normaliza um registro mantendo origem, fórmulas e alterações', () => {
  const result = normalizeSourceRecord({
    origin: { file: 'estoque.xlsx', sheet: 'Janeiro', row: 2, sourceKey: 'source-key' },
    headers: { A: 'Código' },
    valuesOriginal: { Código: ' 90/001 ', Quantidade: '1,5' },
    formulas: { Quantidade: 'B2+C2' },
  });

  assert.equal(result.origin.sourceKey, 'source-key');
  assert.equal(result.valuesNormalized.Código, '90-001');
  assert.equal(result.valuesNormalized.Quantidade, 1.5);
  assert.deepEqual(result.formulas, { Quantidade: 'B2+C2' });
  assert.deepEqual(result.changes.sort(), ['Código', 'Quantidade']);
  assert.equal(result.issues.length, 0);
});
