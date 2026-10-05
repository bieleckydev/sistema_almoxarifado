import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mapImprodutivosItems } from '../adapters/improdutivos-items.adapter';

test('mapeia itens improdutivos para CreateItemInput e valida o cabeçalho deslocado', () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['TABELA DE ITENS'],
    [],
    ['Código', 'Descrição', null, null, null, null, null, 'Estoque de Segurança', 'Desc.', 'Utilização'],
    ['90 / 001', ' Disco flap ', null, null, null, null, null, '20', 'Unid.', null],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Tabela de ítens');
  const filePath = join(tmpdir(), `improdutivos-${Date.now()}.xlsx`);
  writeFileSync(filePath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));

  const result = mapImprodutivosItems(filePath);

  assert.equal(result.source.headerRow, 3);
  assert.equal(result.summary.valid, 1);
  assert.equal(result.candidates[0].candidate?.codigo, '90-001');
  assert.equal(result.candidates[0].candidate?.unidade, 'UNIDADE');
  assert.equal(result.candidates[0].origin.row, 4);
});

test('rejeita código duplicado e preserva a linha de origem', () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Código', 'Descrição', 'Estoque de Segurança', 'Desc.'],
    ['90-001', 'Disco flap', 2, 'Unid.'],
    ['90-001', 'Outro disco', 3, 'Unid.'],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Tabela de ítens');
  const filePath = join(tmpdir(), `improdutivos-duplicado-${Date.now()}.xlsx`);
  writeFileSync(filePath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));

  const result = mapImprodutivosItems(filePath);

  assert.equal(result.summary.valid, 1);
  assert.equal(result.summary.duplicates, 1);
  assert.equal(result.candidates[1].action, 'REJECT');
  assert.equal(result.candidates[1].origin.row, 3);
});
