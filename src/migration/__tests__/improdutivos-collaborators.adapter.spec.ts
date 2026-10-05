import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import { mapImprodutivosCollaborators } from '../adapters/improdutivos-collaborators.adapter';

function writeWorkbook(rows: unknown[][]): string {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(rows),
    'Tabela de Colobaradores'
  );
  const filePath = join(tmpdir(), `colaboradores-${Date.now()}-${Math.random()}.xlsx`);
  writeFileSync(filePath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  return filePath;
}

test('mapeia colaborador com cabeçalho deslocado e normaliza matrícula', () => {
  const result = mapImprodutivosCollaborators(
    writeWorkbook([
      ['TABELA DE FUNCIONÁRIOS'],
      [],
      ['Código', 'Colaborador', 'Setor', 'Função'],
      [42, ' João da Silva ', 'Solda', 'Soldador'],
    ])
  );

  assert.equal(result.summary.valid, 1);
  assert.equal(result.candidates[0].candidate?.matricula, '042');
  assert.equal(result.candidates[0].candidate?.setor, 'SOLDA');
  assert.equal(result.candidates[0].origin.row, 4);
});

test('converte setor desconhecido para OUTRO com aviso', () => {
  const result = mapImprodutivosCollaborators(
    writeWorkbook([
      ['Código', 'Colaborador', 'Setor', 'Função'],
      [2050, 'Maria Souza', 'Laser', 'Operadora'],
    ])
  );

  assert.equal(result.summary.valid, 1);
  assert.equal(result.candidates[0].candidate?.setor, 'OUTRO');
  assert.equal(result.summary.warnings, 1);
});

test('rejeita matrícula duplicada', () => {
  const result = mapImprodutivosCollaborators(
    writeWorkbook([
      ['Código', 'Colaborador', 'Setor', 'Função'],
      [42, 'João da Silva', 'Solda', 'Soldador'],
      ['042', 'Maria Souza', 'Solda', 'Soldadora'],
    ])
  );

  assert.equal(result.summary.valid, 1);
  assert.equal(result.summary.duplicates, 1);
  assert.equal(result.candidates[1].action, 'REJECT');
});
