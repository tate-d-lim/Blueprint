import type { CoverageEntry, ToolVersion } from '../domain/types';
import { sameCoverage } from '../plan/verification';

export interface VersionDiff {
  added: CoverageEntry[];
  changed: { before: CoverageEntry; after: CoverageEntry }[];
  removed: CoverageEntry[];
}

/** What changed since the last approved version. With nothing approved yet, every row is new. */
export function diffVersions(current: ToolVersion, lastApproved?: ToolVersion): VersionDiff {
  const before = new Map((lastApproved?.entries ?? []).map(e => [e.key, e]));
  const after = new Map(current.entries.map(e => [e.key, e]));
  const diff: VersionDiff = { added: [], changed: [], removed: [] };
  for (const entry of current.entries) {
    const old = before.get(entry.key);
    if (!old) diff.added.push(entry);
    else if (!sameCoverage(old, entry)) diff.changed.push({ before: old, after: entry });
  }
  for (const entry of lastApproved?.entries ?? []) if (!after.has(entry.key)) diff.removed.push(entry);
  return diff;
}

/** The size of a change in one line: "4 added, 1 changed, 0 removed". */
export function diffSummary(diff: VersionDiff): string {
  return `${diff.added.length} added, ${diff.changed.length} changed, ${diff.removed.length} removed`;
}
