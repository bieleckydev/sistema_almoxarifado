import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DryRunIssue, DryRunReport } from './dry-run-report';

export type ResolutionDecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ResolutionDecision {
  sourceFingerprint?: string;
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

export interface ResolutionValidationResult {
  approved: ResolutionDecision[];
  pending: ResolutionDecision[];
  rejected: ResolutionDecision[];
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

export function validateDecisionsAgainstReport(
  decisions: ResolutionDecision[],
  report: DryRunReport
): ResolutionValidationResult {
  validateResolutionDecisions(decisions);

  const issuesBySourceKey = new Map<string, DryRunIssue[]>();
  for (const issue of report.issues) {
    const issues = issuesBySourceKey.get(issue.sourceKey) ?? [];
    issues.push(issue);
    issuesBySourceKey.set(issue.sourceKey, issues);
  }
  const decisionsBySourceKey = new Map(
    decisions.map((decision) => [decision.sourceKey, decision])
  );

  for (const decision of decisions) {
    if (!decision.sourceFingerprint) {
      throw new Error(`Fingerprint ausente para ${decision.sourceKey}`);
    }
    if (decision.sourceFingerprint !== report.sourceFingerprint.sha256) {
      throw new Error(
        `Fingerprint incompatível para ${decision.sourceKey}: ` +
        `esperado ${report.sourceFingerprint.sha256}, recebido ${decision.sourceFingerprint}`
      );
    }

    const issues = issuesBySourceKey.get(decision.sourceKey);
    const issue = issues?.find((candidate) => candidate.blocking);
    if (!issue) {
      throw new Error(`Decisão sem issue correspondente: ${decision.sourceKey}`);
    }

    if (decision.decision !== 'MERGE' || decision.status !== 'APPROVED') continue;
    const targetKey = decision.mergeIntoSourceKey;
    if (!targetKey) {
      throw new Error(`Destino da mesclagem ausente para: ${decision.sourceKey}`);
    }
    const targetEntity = targetKey.split('|').at(-1);
    const sourceEntity = decision.entity === 'ITEM' ? 'item' : 'colaborador';
    if (targetEntity !== sourceEntity) {
      throw new Error(`Mesclagem entre entidades diferentes: ${decision.sourceKey}`);
    }
    if (targetKey === decision.sourceKey) {
      throw new Error(`Uma decisão não pode mesclar o próprio registro: ${decision.sourceKey}`);
    }
    if (decisionsBySourceKey.get(targetKey)?.decision === 'REJECT') {
      throw new Error(`Destino da mesclagem foi rejeitado: ${targetKey}`);
    }
  }

  return {
    approved: decisions.filter((decision) => decision.status === 'APPROVED'),
    pending: decisions.filter((decision) => decision.status === 'PENDING'),
    rejected: decisions.filter((decision) => decision.status === 'REJECTED'),
  };
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
  const decisions = buildResolutionDecisions(report).map((decision) => ({
    sourceFingerprint: report.sourceFingerprint.sha256,
    ...decision,
  }));
  mkdirSync(dirname(resolve(outputPath)), { recursive: true });
  writeFileSync(resolve(outputPath), `${JSON.stringify(decisions, null, 2)}\n`, 'utf8');
}
