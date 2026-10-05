import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyMigrationIssue } from '../issue-classification';

test('classifica código inválido como bloqueante e exige correção da fonte', () => {
  const issue = classifyMigrationIssue({
    field: 'Código',
    severity: 'error',
    message: 'Código de item inválido.',
  });

  assert.equal(issue.category, 'INVALID_CODE');
  assert.equal(issue.action, 'CORRECT_SOURCE');
  assert.equal(issue.blocking, true);
});

test('classifica setor desconhecido como mapeamento revisável', () => {
  const issue = classifyMigrationIssue({
    field: 'Setor',
    severity: 'warning',
    message: 'Setor "LASER" não pertence ao catálogo atual.',
  });

  assert.equal(issue.category, 'UNKNOWN_SECTOR');
  assert.equal(issue.action, 'DEFINE_MAPPING');
  assert.equal(issue.blocking, false);
});

test('classifica duplicidade de chave natural como bloqueante', () => {
  const issue = classifyMigrationIssue({
    field: 'Código',
    severity: 'error',
    message: 'Código duplicado; primeira ocorrência na linha 10.',
  });

  assert.equal(issue.category, 'DUPLICATE_NATURAL_KEY');
  assert.equal(issue.action, 'MERGE_OR_REASSIGN');
  assert.equal(issue.blocking, true);
});
