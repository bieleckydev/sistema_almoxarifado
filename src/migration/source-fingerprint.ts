import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import * as XLSX from 'xlsx';

export interface SourceFingerprint {
  file: string;
  path: string;
  sha256: string;
  sizeBytes: number;
  modifiedAt: string;
  sheets: string[];
}

export function fingerprintSource(filePath: string): SourceFingerprint {
  const path = resolve(filePath);
  const stats = statSync(path);
  const contents = readFileSync(path);
  const workbook = XLSX.read(contents, {
    bookSheets: true,
    cellDates: false,
    cellFormula: false,
  });

  return {
    file: basename(path),
    path,
    sha256: createHash('sha256').update(contents).digest('hex'),
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    sheets: [...workbook.SheetNames],
  };
}
