import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImprodutivosDryRunReport } from '../dry-run-report';
import { buildDuplicateResolutionReport } from '../duplicate-resolution-report';
import { createSyntheticImprodutivosWorkbook } from './synthetic-improdutivos-workbook';

test('relaciona duplicidades à primeira ocorrência', (t) => {
  const workbook = createSyntheticImprodutivosWorkbook();
  t.after(workbook.cleanup);
  const report = buildImprodutivosDryRunReport(workbook.filePath);
  const duplicates = buildDuplicateResolutionReport(report);

  assert.equal(duplicates.length, 4);
  assert.ok(duplicates.every((duplicate) => duplicate.decision === 'PENDING'));
  assert.ok(duplicates.some((duplicate) =>
    duplicate.firstSourceKey.endsWith('|25|item')
    && duplicate.duplicateRow === 71
  ));
});
