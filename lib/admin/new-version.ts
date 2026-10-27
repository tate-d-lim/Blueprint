import type { CoverageEntry, CoverageValue, RequirementKey } from '../domain/types';

/** One row of the coverage editor as the admin left it. A blank value means "this tool says nothing about it". */
export interface DraftRow {
  key: RequirementKey;
  value: CoverageValue | '';
  otherToolId?: string;
  explanation?: string;
  builderPart?: string;
  source?: string;
}

export type NewVersionResult =
  | { ok: true; entries: CoverageEntry[] }
  | { ok: false; errors: { key?: RequirementKey; message: string }[] };

const clean = (s?: string) => s?.trim() || undefined;

export function validateNewVersion(rows: DraftRow[], versionSource: string): NewVersionResult {
  const errors: { key?: RequirementKey; message: string }[] = [];
  if (!versionSource.trim()) errors.push({ message: 'Add a source for this version.' });

  const entries: CoverageEntry[] = [];
  for (const row of rows) {
    if (!row.value) continue;
    const otherToolId = row.value === 'other-tool' ? clean(row.otherToolId) : undefined;
    if (row.value === 'other-tool' && !otherToolId) {
      errors.push({ key: row.key, message: 'Pick which tool handles this.' });
      continue;
    }
    const entry: CoverageEntry = { key: row.key, value: row.value };
    if (otherToolId) entry.otherToolId = otherToolId;
    for (const field of ['explanation', 'builderPart', 'source'] as const) {
      const value = clean(row[field]);
      if (value) entry[field] = value;
    }
    entries.push(entry);
  }
  return errors.length ? { ok: false, errors } : { ok: true, entries };
}
