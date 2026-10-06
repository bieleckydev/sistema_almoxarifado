import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DryRunIssue, DryRunReport } from './dry-run-report';

const DEFAULT_INPUT = resolve('migration-reports/improdutivos-dry-run.json');
const DEFAULT_OUTPUT = resolve('migration-reports/improdutivos-error-resolution.json');

export interface ErrorResolutionGroup {
  category: DryRunIssue['category'];
  entity: DryRunIssue['entity'];
  count: number;
  rows: Array<{
    sourceKey: string;
    file: string;
    sheet: string;
    row: number;
    field: string;
    message: string;
    action: DryRunIssue['action'];
  }>;
}

export interface ErrorResolutionReport {
  generatedAt: string;
  sourceFingerprint: DryRunReport['sourceFingerprint'];
  totalBlockingErrors: number;
  groups: ErrorResolutionGroup[];
}

export function buildErrorResolutionReport(report: DryRunReport): ErrorResolutionReport {
  const blockingIssues = report.issues.filter((issue) => issue.blocking);
  const grouped = new Map<string, ErrorResolutionGroup>();

  for (const issue of blockingIssues) {
    const key = `${issue.category}|${issue.entity}`;
    const group = grouped.get(key) ?? {
      category: issue.category,
      entity: issue.entity,
      count: 0,
      rows: [],
    };
    group.count += 1;
    group.rows.push({
      sourceKey: issue.sourceKey,
      file: issue.file,
      sheet: issue.sheet,
      row: issue.row,
      field: issue.field,
      message: issue.message,
      action: issue.action,
    });
    grouped.set(key, group);
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceFingerprint: report.sourceFingerprint,
    totalBlockingErrors: blockingIssues.length,
    groups: [...grouped.values()].sort((left, right) =>
      `${left.category}|${left.entity}`.localeCompare(`${right.category}|${right.entity}`)
    ),
  };
}

function argument(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

function main(): void {
  const input = resolve(argument('--input') ?? DEFAULT_INPUT);
  const output = resolve(argument('--output') ?? DEFAULT_OUTPUT);
  const report = JSON.parse(readFileSync(input, 'utf8')) as DryRunReport;
  const resolution = buildErrorResolutionReport(report);

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(resolution, null, 2)}\n`, 'utf8');
  console.log(
    `Relatório de resolução gerado: ${output}\n` +
      `Erros bloqueantes: ${resolution.totalBlockingErrors} | ` +
      `Grupos: ${resolution.groups.length}`
  );
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();

if (isMain) {
  main();
}
