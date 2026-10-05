import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mapImprodutivosItems } from './adapters/improdutivos-items.adapter';

const DEFAULT_INPUT = resolve(
  'docs/excel/Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx'
);
const DEFAULT_OUTPUT = resolve('migration-reports/improdutivos-items-preview.json');

function argument(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

function main(): void {
  const input = resolve(argument('--input') ?? DEFAULT_INPUT);
  const output = resolve(argument('--output') ?? DEFAULT_OUTPUT);
  const preview = mapImprodutivosItems(input);

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(preview, null, 2)}\n`, 'utf8');
  console.log(
    `Prévia de itens gerada: ${output}\n` +
      `Linhas: ${preview.summary.rowsRead} | Válidos: ${preview.summary.valid} | ` +
      `Rejeitados: ${preview.summary.rejected} | Duplicados: ${preview.summary.duplicates} | ` +
      `Avisos: ${preview.summary.warnings} | Erros: ${preview.summary.errors}`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
