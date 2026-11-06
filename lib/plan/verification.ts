import type { Approval, CoverageCheck, CoverageEntry, RequirementKey, ToolVersion } from '../domain/types';

export type Verification = 'verified' | 'govtech-published' | 'not-yet-verified';

/** A tool's newest version and its newest approved one (the same object when the newest is approved). */
export interface VersionPair {
  current: ToolVersion;
  lastApproved?: ToolVersion;
}

const blank = (s: string | undefined) => s ?? '';

const checksKey = (checks: CoverageCheck[] | undefined) =>
  [...(checks ?? [])]
    .sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
    .map(c => `${c.id}|${c.kind}|${c.description}`)
    .join('\n');

export function sameCoverage(a?: CoverageEntry, b?: CoverageEntry): boolean {
  if (!a || !b) return false;
  return (
    a.value === b.value &&
    blank(a.otherToolId) === blank(b.otherToolId) &&
    blank(a.explanation) === blank(b.explanation) &&
    blank(a.builderPart) === blank(b.builderPart) &&
    checksKey(a.checks) === checksKey(b.checks)
  );
}

const forApproval = (approval: Approval): Verification =>
  approval.kind === 'govtech-published' ? 'govtech-published' : 'verified';

/** A row is verified only if it is identical to the same row in the last approved version. */
export function rowVerification(key: RequirementKey, pair: VersionPair): Verification {
  const approved = pair.lastApproved;
  if (!approved?.approval) return 'not-yet-verified';
  const now = pair.current.entries.find(e => e.key === key);
  const before = approved.entries.find(e => e.key === key);
  return sameCoverage(now, before) ? forApproval(approved.approval) : 'not-yet-verified';
}

export function versionVerification(pair: VersionPair): Verification {
  return pair.current.approval ? forApproval(pair.current.approval) : 'not-yet-verified';
}

/** One badge for a whole item: the weakest of its decisive claims, or null when no tool decided it. */
export function itemVerification(item: { decisive: { verification: Verification }[] }): Verification | null {
  const states = item.decisive.map(c => c.verification);
  if (states.length === 0) return null;
  if (states.includes('not-yet-verified')) return 'not-yet-verified';
  if (states.includes('govtech-published')) return 'govtech-published';
  return 'verified';
}
