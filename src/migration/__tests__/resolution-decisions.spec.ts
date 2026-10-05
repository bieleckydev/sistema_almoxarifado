import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImprodutivosDryRunReport } from '../dry-run-report';
import {
  buildResolutionDecisions,
  validateDecisionsAgainstReport,
  validateResolutionDecisions,
} from '../resolution-decisions';

test('gera uma decisão pendente por registro bloqueante', () => {
  const report = buildImprodutivosDryRunReport(
    'docs/excel/Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx'
  );
  const decisions = buildResolutionDecisions(report);

  assert.ok(decisions.length > 0);
  assert.equal(new Set(decisions.map((decision) => decision.sourceKey)).size, decisions.length);
  assert.ok(decisions.every((decision) => decision.status === 'PENDING'));
});

test('exige evidência para decisões aprovadas', () => {
  assert.throws(() => validateResolutionDecisions([{
    sourceKey: 'source|row',
    entity: 'ITEM',
    category: 'UNKNOWN_UNIT',
    status: 'APPROVED',
    decision: 'MAP_VALUE',
  }]));
});

test('valida decisões contra o fingerprint e os sourceKeys do relatório', () => {
  const report = {
    sourceFingerprint: { sha256: 'abc' },
    issues: [{ sourceKey: 'source|row', entity: 'ITEM', blocking: true }],
  } as never;

  const result = validateDecisionsAgainstReport([{
    sourceFingerprint: 'abc',
    sourceKey: 'source|row',
    entity: 'ITEM',
    category: 'INVALID_CODE',
    status: 'PENDING',
    decision: 'CORRECT_SOURCE',
  }], report);

  assert.equal(result.pending.length, 1);
});

test('rejeita decisões de outra versão da fonte', () => {
  const report = {
    sourceFingerprint: { sha256: 'abc' },
    issues: [{ sourceKey: 'source|row', entity: 'ITEM', blocking: true }],
  } as never;

  assert.throws(() => validateDecisionsAgainstReport([{
    sourceFingerprint: 'old',
    sourceKey: 'source|row',
    entity: 'ITEM',
    category: 'INVALID_CODE',
    status: 'PENDING',
    decision: 'CORRECT_SOURCE',
  }], report), /Fingerprint incompatível/);
});
