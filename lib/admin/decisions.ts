import type { ToolVersion } from '../domain/types';

export const SEND_BACK_NOTE_MAX = 500;

export interface Decision {
  kind: 'approved' | 'sent-back';
  at: string;
  by: string;
  /** The admin's note, for a version that was sent back. */
  note?: string;
}

/** The decision an admin took on a version, or null while it waits (or when GovTech published it). */
export function decisionOf(version: ToolVersion): Decision | null {
  if (version.sentBack) return { kind: 'sent-back', at: version.sentBack.at, by: version.sentBack.by, note: version.sentBack.note };
  if (version.approval?.kind === 'verifier') return { kind: 'approved', at: version.approval.at, by: version.approval.by };
  return null;
}

/** The last decisions, newest first. */
export function decisionsOf(versions: ToolVersion[], limit = 10): { version: ToolVersion; decision: Decision }[] {
  return versions
    .flatMap(version => {
      const decision = decisionOf(version);
      return decision ? [{ version, decision }] : [];
    })
    .sort((a, b) => b.decision.at.localeCompare(a.decision.at))
    .slice(0, limit);
}
