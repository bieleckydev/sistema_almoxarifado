import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImprodutivosDryRunReport } from '../dry-run-report';
import {
  buildResolutionDecisions,
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
