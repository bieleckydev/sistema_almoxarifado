import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { extractWorkbookRecords, SourceRecord } from './source-record';

const SUPPORTED_EXTENSIONS = new Set(['.xlsx', '.xls', '.xlsm']);
const DEFAULT_INPUT_DIRECTORY = resolve('docs/excel');
const DEFAULT_OUTPUT_FILE = resolve('migration-reports/source-records.jsonl');

function parseArgument(name: string): string | undefined {
  const argument = process.argv.find((value) => value.startsWith(`${name}=`));
  return argument?.slice(name.length + 1);
}

function main(): void {
  const inputDirectory = resolve(parseArgument('--input') ?? DEFAULT_INPUT_DIRECTORY);
  const outputFile = resolve(parseArgument('--output') ?? DEFAULT_OUTPUT_FILE);

  if (!existsSync(inputDirectory)) {
    throw new Error(`Diretório de entrada não encontrado: ${inputDirectory}`);
  }

  const files = readdirSync(inputDirectory)
    .filter((file) => SUPPORTED_EXTENSIONS.has(extname(file).toLowerCase()))
    .sort()
    .map((file) => join(inputDirectory, file));

  if (files.length === 0) {
    throw new Error(`Nenhuma planilha suportada foi encontrada em: ${inputDirectory}`);
  }

  const records: SourceRecord[] = [];
  let sheets = 0;
  let skippedEmptyRows = 0;

  for (const filePath of files) {
    const results = extractWorkbookRecords(filePath);
    sheets += results.length;
    skippedEmptyRows += results.reduce((total, result) => total + result.skippedEmptyRows, 0);
    records.push(...results.flatMap((result) => result.records));
  }

  mkdirSync(resolve(outputFile, '..'), { recursive: true });
  writeFileSync(outputFile, records.map((record) => JSON.stringify(record)).join('\n') + '\n', 'utf8');

  console.log(
    `Registros de origem extraídos: ${outputFile}\n` +
      `Arquivos: ${files.length} | Abas: ${sheets} | Registros: ${records.length} | ` +
      `Linhas vazias ignoradas: ${skippedEmptyRows}`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
