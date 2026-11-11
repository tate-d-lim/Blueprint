import type { CoverageCheck, CoverageEntry, CoverageValue, RequirementKey, ToolVersion } from '../domain/types';
import { sameCoverage } from '../plan/verification';

/** One row of the coverage editor as the admin left it. A blank value means "this tool says nothing about it". */
export interface DraftRow {
  key: RequirementKey;
  value: CoverageValue | '';
  explanation?: string;
  builderPart?: string;
  source?: string;
  checks?: CoverageCheck[];
}

export type NewVersionResult =
  | { ok: true; entries: CoverageEntry[] }
  | { ok: false; errors: { key?: RequirementKey; message: string }[] };

const clean = (s?: string) => s?.trim() || undefined;

/**
 * Rows with no source of their own inherit the version's source. When a new version is saved that would
 * relabel every untouched row with the new source, and credit a changed row to the old one. So: a row the
 * admin did not change keeps the source it effectively had; a row they changed takes the new version's
 * source unless they typed one for it.
 */
export function carrySources(rows: DraftRow[], previous?: ToolVersion): DraftRow[] {
  if (!previous) return rows;
  const before = new Map(previous.entries.map(e => [e.key, e]));
  return rows.map(row => {
    const old = before.get(row.key);
    if (!row.value || !old) return row;
    const typed = clean(row.source);
    if (typed && typed !== clean(old.source)) return row;
    const unchanged = sameCoverage(old, {
      key: row.key,
      value: row.value,
      explanation: clean(row.explanation),
      builderPart: clean(row.builderPart),
    });
    return { ...row, source: unchanged ? (clean(old.source) ?? previous.source) : undefined };
  });
}

/** A row that still has a value keeps the checks it had, unless the draft brings its own. The editor has no input for checks. */
export function carryChecks(rows: DraftRow[], previous?: ToolVersion): DraftRow[] {
  if (!previous) return rows;
  const before = new Map(previous.entries.map(e => [e.key, e]));
  return rows.map(row => {
    const old = before.get(row.key);
    if (!row.value || row.checks?.length || !old?.checks?.length) return row;
    return { ...row, checks: old.checks };
  });
}

/** `requireAll` is for a draft a coding agent filled in: there, a blank row is a gap to fill, not "says nothing". */
export function validateNewVersion(rows: DraftRow[], versionSource: string, opts: { requireAll?: boolean } = {}): NewVersionResult {
  const errors: { key?: RequirementKey; message: string }[] = [];
  if (!versionSource.trim()) errors.push({ message: 'Add a source for this version.' });

  const entries: CoverageEntry[] = [];
  for (const row of rows) {
    if (!row.value) {
      if (opts.requireAll) errors.push({ key: row.key, message: 'Choose an answer for this control.' });
      continue;
    }
    const entry: CoverageEntry = { key: row.key, value: row.value };
    for (const field of ['explanation', 'builderPart', 'source'] as const) {
      const value = clean(row[field]);
      if (value) entry[field] = value;
    }
    if (row.checks?.length) entry.checks = row.checks;
    entries.push(entry);
  }
  return errors.length ? { ok: false, errors } : { ok: true, entries };
}
