import type { CatalogRelease, ProfileChanges } from '../domain/types';
import type { CatalogCheck } from './types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-11-10" gives "10 November 2026". Anything else stays as it is. */
export function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

/** "2026-11-16T09:05:00.000Z" gives "2026-11-16 09:05 UTC". */
export function stampOf(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The result of the last check, in plain words. */
export function describeCheck(check: CatalogCheck | undefined, lastGood?: CatalogCheck): string {
  if (!check) return 'Not checked yet.';
  switch (check.outcome) {
    case 'no-change':
      return check.sourceDate ? `No change. GovTech last updated on ${longDate(check.sourceDate)}.` : 'No change.';
    case 'changed':
      return 'GovTech has changes to review.';
    case 'unreachable':
      return `${check.error ?? 'Could not reach GovTech.'}${lastGood ? ` The last good check was ${stampOf(lastGood.at)}.` : ' No check has reached it yet.'}`;
    case 'error':
      return check.error ?? 'The check failed.';
  }
}

/** "2 added, 1 removed" for one profile. */
export function changeCounts(c: ProfileChanges): string {
  const parts = [
    c.added.length && `${c.added.length} added`,
    c.removed.length && `${c.removed.length} removed`,
    c.reworded.length && `${c.reworded.length} reworded`,
    c.levelChanged.length && `${c.levelChanged.length} with a new level`,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No change';
}

/** What a source is called on the history table. */
export function sourceName(release: CatalogRelease): string {
  switch (release.source.kind) {
    case 'seed':
      return 'Source files';
    case 'fetch':
      return 'GovTech site';
    case 'upload':
      return release.source.label;
  }
}
