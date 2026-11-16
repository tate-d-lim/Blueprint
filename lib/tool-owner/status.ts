import type { ToolVersion } from '../domain/types';

/** What one coverage version of a tool shows on the tool owner's list. */
export type CoverageStatus =
  | { kind: 'none' }
  | { kind: 'verified'; at: string }
  | { kind: 'govtech-published'; at: string }
  | { kind: 'waiting' }
  | { kind: 'sent-back'; at: string }
  /** The catalog changed after the last approval and some rows need a second look. */
  | { kind: 'rows-to-check'; count: number };

export const STATUS_TEXT: Record<CoverageStatus['kind'], string> = {
  none: 'No coverage yet',
  verified: 'Verified',
  'govtech-published': 'Published by GovTech',
  waiting: 'Waiting for approval',
  'sent-back': 'Sent back',
  'rows-to-check': 'Rows to check',
};

/** The words of a status, with its count when it has one: "3 rows to check". */
export function statusLabel(status: CoverageStatus): string {
  if (status.kind === 'rows-to-check') return `${status.count} ${status.count === 1 ? 'row' : 'rows'} to check`;
  return STATUS_TEXT[status.kind];
}

/**
 * The one status of a coverage version, from the newest version in any state. `rowsToCheck` is for a catalog
 * change: it only shows on a version that is approved, because a version still in review is checked anyway.
 */
export function coverageStatus(newest: ToolVersion | undefined, opts: { rowsToCheck?: number } = {}): CoverageStatus {
  if (!newest) return { kind: 'none' };
  if (newest.sentBack) return { kind: 'sent-back', at: newest.sentBack.at };
  if (!newest.approval) return { kind: 'waiting' };
  if (opts.rowsToCheck && opts.rowsToCheck > 0) return { kind: 'rows-to-check', count: opts.rowsToCheck };
  return newest.approval.kind === 'govtech-published'
    ? { kind: 'govtech-published', at: newest.approval.at }
    : { kind: 'verified', at: newest.approval.at };
}
