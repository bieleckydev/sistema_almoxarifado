import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImprodutivosDryRunReport } from '../dry-run-report';
import { buildDuplicateResolutionReport } from '../duplicate-resolution-report';

test('relaciona duplicidades à primeira ocorrência', () => {
  const report = buildImprodutivosDryRunReport(
    'docs/excel/Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx'
  );
  const duplicates = buildDuplicateResolutionReport(report);

  assert.equal(duplicates.length, 4);
  assert.ok(duplicates.every((duplicate) => duplicate.decision === 'PENDING'));
  assert.ok(duplicates.some((duplicate) =>
    duplicate.firstSourceKey.endsWith('|25|item')
    && duplicate.duplicateRow === 71
  ));
});
