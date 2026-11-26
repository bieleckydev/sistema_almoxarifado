import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

export function createSyntheticImprodutivosWorkbook() {
  const directory = mkdtempSync(join(tmpdir(), 'almoxarifado-synthetic-'));
  const filePath = join(directory, 'synthetic-improdutivos.xlsx');
  const itemRows: unknown[][] = Array.from({ length: 71 }, () => []);
  itemRows[0] = ['Código', 'Descrição', 'Estoque de Segurança', 'Desc.'];

  const items = [
    { row: 5, code: '90-001' },
    { row: 6, code: '90-001' },
    { row: 10, code: '90-002' },
    { row: 11, code: '90-002' },
    { row: 15, code: '90-003' },
    { row: 16, code: '90-003' },
    { row: 25, code: '90-004' },
    { row: 71, code: '90-004' },
  ];

  for (const { row, code } of items) {
    itemRows[row - 1] = [code, `Item sintético ${code}`, 2, 'Unid.'];
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(itemRows),
    'Tabela de ítens'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['Código', 'Colaborador', 'Setor', 'Função'],
      ['001', 'Colaborador Sintético', 'SOLDA', 'Operador'],
    ]),
    'Tabela de Colobaradores'
  );
  writeFileSync(filePath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));

  return {
    filePath,
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}
