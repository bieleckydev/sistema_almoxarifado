import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DryRunIssue, DryRunReport } from './dry-run-report';

export interface DuplicateResolution {
  entity: DryRunIssue['entity'];
  naturalKeyField: string;
  duplicateSourceKey: string;
  firstSourceKey: string;
  duplicateRow: number;
  firstRow: number;
  decision: 'PENDING';
  recommendation: 'COMPARE_AND_MERGE_OR_REASSIGN';
}

export function buildDuplicateResolutionReport(report: DryRunReport): DuplicateResolution[] {
  return report.issues
    .filter((issue) => issue.category === 'DUPLICATE_NATURAL_KEY')
    .map((issue) => {
      const firstRowMatch = issue.message.match(/linha (\d+)/i);
      if (!firstRowMatch) {
        throw new Error(`Duplicidade sem linha da primeira ocorrência: ${issue.sourceKey}`);
      }
      const firstRow = Number(firstRowMatch[1]);
      const entityKey = issue.entity === 'ITEM' ? 'item' : 'colaborador';
      return {
        entity: issue.entity,
        naturalKeyField: issue.field,
        duplicateSourceKey: issue.sourceKey,
        firstSourceKey: `${issue.file}|${issue.sheet}|${firstRow}|${entityKey}`,
        duplicateRow: issue.row,
        firstRow,
        decision: 'PENDING',
        recommendation: 'COMPARE_AND_MERGE_OR_REASSIGN',
      };
    });
}

function argument(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

function main(): void {
  const input = resolve(argument('--input') ?? 'migration-reports/improdutivos-dry-run.json');
  const output = resolve(
    argument('--output') ?? 'migration-reports/improdutivos-duplicate-resolution.json'
  );
  const report = JSON.parse(readFileSync(input, 'utf8')) as DryRunReport;
  const duplicates = buildDuplicateResolutionReport(report);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(duplicates, null, 2)}\n`, 'utf8');
  console.log(`Relatório de duplicidades gerado: ${output}\nDuplicidades: ${duplicates.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
