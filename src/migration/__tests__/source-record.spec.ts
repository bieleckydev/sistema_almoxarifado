import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { extractSheetRecords } from '../source-record';

test('preserva a origem e os valores brutos de uma linha', () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Código', 'Descrição', 'Quantidade'],
    ['90-001', ' Disco flap ', 4],
    [null, null, null],
  ]);

  const result = extractSheetRecords('materiais.xlsx', 'Tabela de Itens', sheet);

  assert.equal(result.records.length, 1);
  assert.equal(result.skippedEmptyRows, 1);
  assert.deepEqual(result.records[0].origin, {
    file: 'materiais.xlsx',
    sheet: 'Tabela de Itens',
    row: 2,
    sourceKey: 'materiais.xlsx|Tabela de Itens|2|row',
  });
  assert.deepEqual(result.records[0].valuesOriginal, {
    Código: '90-001',
    Descrição: ' Disco flap ',
    Quantidade: 4,
  });
});

test('mantém chaves distintas para cabeçalhos duplicados e fórmulas', () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Código', 'Código', 'Saldo'],
    ['90-001', '90-001', 10],
  ]);
  sheet.C2 = { t: 'n', v: 10, f: 'A2+B2' };

  const result = extractSheetRecords('materiais.xlsx', 'Estoque', sheet);
  const record = result.records[0];

  assert.deepEqual(record.valuesOriginal, {
    Código: '90-001',
    Código_2: '90-001',
    Saldo: 10,
  });
  assert.deepEqual(record.formulas, { Saldo: 'A2+B2' });
});
