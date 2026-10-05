import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildResolutionDecisions, writeResolutionTemplate } from './resolution-decisions';
import type { DryRunReport } from './dry-run-report';

const input = resolve(
  process.argv.find((value) => value.startsWith('--input='))?.slice('--input='.length)
    ?? 'migration-reports/improdutivos-dry-run.json'
);
const output = resolve(
  process.argv.find((value) => value.startsWith('--output='))?.slice('--output='.length)
    ?? 'migration-reports/improdutivos-resolution-decisions.json'
);

const report = JSON.parse(readFileSync(input, 'utf8')) as DryRunReport;
writeResolutionTemplate(report, output);
console.log(
  `Template de decisões gerado: ${output}\n` +
    `Registros pendentes: ${buildResolutionDecisions(report).length}`
);
