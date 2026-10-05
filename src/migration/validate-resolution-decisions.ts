import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  readResolutionDecisions,
  validateDecisionsAgainstReport,
} from './resolution-decisions';
import type { DryRunReport } from './dry-run-report';

function argument(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

const reportPath = resolve(
  argument('--report') ?? 'migration-reports/improdutivos-dry-run.json'
);
const decisionsPath = resolve(
  argument('--decisions') ?? 'migration-reports/improdutivos-resolution-decisions.json'
);

const report = JSON.parse(readFileSync(reportPath, 'utf8')) as DryRunReport;
const decisions = readResolutionDecisions(decisionsPath);
const result = validateDecisionsAgainstReport(decisions, report);

console.log(
  `Decisões válidas para fingerprint ${report.sourceFingerprint.sha256}: ` +
  `${decisions.length} | aprovadas: ${result.approved.length} | ` +
  `pendentes: ${result.pending.length} | rejeitadas: ${result.rejected.length}`
);
