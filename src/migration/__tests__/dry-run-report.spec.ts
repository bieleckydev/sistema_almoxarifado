import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImprodutivosDryRunReport } from '../dry-run-report';

test('consolida itens e colaboradores em relatório dry-run', () => {
  const report = buildImprodutivosDryRunReport(
    'docs/excel/Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx'
  );

  assert.equal(report.mode, 'DRY_RUN');
  assert.match(report.sourceFingerprint.sha256, /^[a-f0-9]{64}$/);
  assert.equal(report.sourceFingerprint.file, 'Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx');
  assert.ok(report.sourceFingerprint.sizeBytes > 0);
  assert.ok(report.sourceFingerprint.sheets.includes('Tabela de ítens'));
  assert.equal(report.sources.length, 2);
  assert.equal(
    report.summary.rowsRead,
    report.entities.items.rowsRead + report.entities.collaborators.rowsRead
  );
  assert.equal(
    report.summary.errors,
    report.entities.items.errors + report.entities.collaborators.errors
  );
  assert.ok(report.issues.length > 0);
  assert.ok(report.issues.every((issue) => issue.sourceKey && issue.row > 0));
  assert.ok(Object.keys(report.issueCategories).length > 0);
  assert.ok(report.issues.every((issue) => issue.category && issue.action));
});
