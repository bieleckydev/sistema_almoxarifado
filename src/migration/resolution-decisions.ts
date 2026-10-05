import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DryRunIssue, DryRunReport } from './dry-run-report';

export type ResolutionDecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ResolutionDecision {
  sourceKey: string;
  entity: DryRunIssue['entity'];
  category: DryRunIssue['category'];
  status: ResolutionDecisionStatus;
  decision: 'CORRECT_SOURCE' | 'MAP_VALUE' | 'MERGE' | 'REASSIGN' | 'REJECT';
  correctedValue?: string | number | null;
  mapping?: string;
  mergeIntoSourceKey?: string;
  justification?: string;
}

export function buildResolutionDecisions(report: DryRunReport): ResolutionDecision[] {
  const seen = new Set<string>();
  return report.issues
    .filter((issue) => issue.blocking)
    .filter((issue) => {
      if (seen.has(issue.sourceKey)) return false;
      seen.add(issue.sourceKey);
      return true;
    })
    .map((issue) => ({
      sourceKey: issue.sourceKey,
      entity: issue.entity,
      category: issue.category,
      status: 'PENDING',
      decision: issue.action === 'MERGE_OR_REASSIGN'
        ? 'MERGE'
        : issue.action === 'DEFINE_MAPPING'
          ? 'MAP_VALUE'
          : 'CORRECT_SOURCE',
      justification: '',
    }));
}

export function validateResolutionDecisions(
  decisions: ResolutionDecision[]
): void {
  const sourceKeys = new Set<string>();
  for (const decision of decisions) {
    if (sourceKeys.has(decision.sourceKey)) {
      throw new Error(`Decisão duplicada para sourceKey: ${decision.sourceKey}`);
    }
    sourceKeys.add(decision.sourceKey);

    if (decision.status !== 'APPROVED') continue;
    if (!decision.justification?.trim()) {
      throw new Error(`Decisão aprovada sem justificativa: ${decision.sourceKey}`);
    }
    if (decision.decision === 'MAP_VALUE' && !decision.mapping?.trim()) {
      throw new Error(`Mapeamento ausente para: ${decision.sourceKey}`);
    }
    if (decision.decision === 'MERGE' && !decision.mergeIntoSourceKey?.trim()) {
      throw new Error(`Destino da mesclagem ausente para: ${decision.sourceKey}`);
    }
    if (
      decision.decision === 'CORRECT_SOURCE'
      && decision.correctedValue === undefined
    ) {
      throw new Error(`Valor corrigido ausente para: ${decision.sourceKey}`);
    }
  }
}

export function readResolutionDecisions(path: string): ResolutionDecision[] {
  const decisions = JSON.parse(readFileSync(resolve(path), 'utf8')) as ResolutionDecision[];
  validateResolutionDecisions(decisions);
  return decisions;
}

export function writeResolutionTemplate(
  report: DryRunReport,
  outputPath: string
): void {
  const decisions = buildResolutionDecisions(report);
  mkdirSync(dirname(resolve(outputPath)), { recursive: true });
  writeFileSync(resolve(outputPath), `${JSON.stringify(decisions, null, 2)}\n`, 'utf8');
}
