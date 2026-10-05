import type { NormalizationIssue } from './normalizers';

export type MigrationIssueCategory =
  | 'INVALID_CODE'
  | 'INVALID_REGISTRATION'
  | 'UNKNOWN_SECTOR'
  | 'UNKNOWN_UNIT'
  | 'INVALID_NUMBER'
  | 'INVALID_DESCRIPTION'
  | 'DUPLICATE_NATURAL_KEY'
  | 'MISSING_ROLE'
  | 'OTHER';

export type MigrationIssueAction =
  | 'REVIEW_SOURCE'
  | 'DEFINE_MAPPING'
  | 'MERGE_OR_REASSIGN'
  | 'CORRECT_SOURCE'
  | 'CONFIRM_DEFAULT';

export interface ClassifiedMigrationIssue extends NormalizationIssue {
  category: MigrationIssueCategory;
  action: MigrationIssueAction;
  blocking: boolean;
}

interface Classification {
  category: MigrationIssueCategory;
  action: MigrationIssueAction;
  blocking: boolean;
}

export function classifyMigrationIssue(
  issue: NormalizationIssue
): ClassifiedMigrationIssue {
  const message = issue.message.toLowerCase();
  const field = issue.field
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  let classification: Classification = {
    category: 'OTHER',
    action: 'REVIEW_SOURCE',
    blocking: issue.severity === 'error',
  };

  if (message.includes('código') && message.includes('duplicado')) {
    classification = {
      category: 'DUPLICATE_NATURAL_KEY',
      action: 'MERGE_OR_REASSIGN',
      blocking: true,
    };
  } else if (message.includes('matrícula') && message.includes('duplicada')) {
    classification = {
      category: 'DUPLICATE_NATURAL_KEY',
      action: 'MERGE_OR_REASSIGN',
      blocking: true,
    };
  } else if (field.includes('codigo') || message.includes('código de item')) {
    classification = {
      category: 'INVALID_CODE',
      action: 'CORRECT_SOURCE',
      blocking: true,
    };
  } else if (field.includes('matricula') || message.includes('matrícula')) {
    classification = {
      category: 'INVALID_REGISTRATION',
      action: 'CORRECT_SOURCE',
      blocking: true,
    };
  } else if (issue.field === 'Setor' || message.includes('setor')) {
    classification = {
      category: 'UNKNOWN_SECTOR',
      action: 'DEFINE_MAPPING',
      blocking: false,
    };
  } else if (issue.field === 'Desc.' || message.includes('unidade')) {
    classification = {
      category: 'UNKNOWN_UNIT',
      action: 'DEFINE_MAPPING',
      blocking: true,
    };
  } else if (field.includes('descricao') || message.includes('nome deve')) {
    classification = {
      category: 'INVALID_DESCRIPTION',
      action: 'CORRECT_SOURCE',
      blocking: true,
    };
  } else if (field.includes('funcao') || message.includes('função ausente')) {
    classification = {
      category: 'MISSING_ROLE',
      action: 'CONFIRM_DEFAULT',
      blocking: false,
    };
  } else if (message.includes('número') || message.includes('estoque de segurança')) {
    classification = {
      category: 'INVALID_NUMBER',
      action: 'CORRECT_SOURCE',
      blocking: true,
    };
  }

  return { ...issue, ...classification };
}

export function classifyMigrationIssues(
  issues: NormalizationIssue[]
): ClassifiedMigrationIssue[] {
  return issues.map(classifyMigrationIssue);
}
