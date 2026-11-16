import type { Profile, ProfileChanges } from '../domain/types';
import { sameWording } from './comparable';
import { CatalogError, type IncomingProfile, type ProfileDiff } from './types';

/** What a release changes in one profile. Pure: nothing is written. */
export function diffProfile(current: Profile, incoming: IncomingProfile): ProfileDiff {
  if (incoming.entries.length === 0) {
    throw new CatalogError(`The release has no controls for ${current.title}. Blueprint does not apply an empty list.`);
  }
  const have = new Map(current.entries.map(e => [e.id, e]));
  const got = new Map(incoming.entries.map(e => [e.id, e]));
  const changes: ProfileChanges = { profileId: current._id, added: [], removed: [], reworded: [], levelChanged: [] };
  const diff: ProfileDiff = { changes, reworded: [], added: [], retitled: [], ignored: [], changed: false };

  for (const entry of incoming.entries) {
    if (have.has(entry.id)) continue;
    if (incoming.wordingOnly) diff.ignored.push(entry.id);
    else {
      changes.added.push({ id: entry.id, title: entry.title });
      diff.added.push(entry);
    }
  }
  for (const entry of current.entries) {
    const next = got.get(entry.id);
    if (!next) {
      changes.removed.push({ id: entry.id, title: entry.title });
      continue;
    }
    if (!sameWording(entry.statement, next.statement)) {
      changes.reworded.push({ id: entry.id, title: next.title || entry.title });
      diff.reworded.push({ id: entry.id, title: next.title || entry.title, before: entry.statement, after: next.statement });
    } else if (next.title && next.title !== entry.title) {
      diff.retitled.push({ id: entry.id, from: entry.title, to: next.title });
    }
    if (!incoming.wordingOnly && next.level !== undefined && next.level !== entry.level) {
      changes.levelChanged.push({ id: entry.id, title: entry.title, from: entry.level, to: next.level });
    }
  }
  diff.changed = changes.added.length + changes.removed.length + changes.reworded.length + changes.levelChanged.length > 0;
  return diff;
}

export const countChanges = (c: ProfileChanges): number => c.added.length + c.removed.length + c.reworded.length + c.levelChanged.length;
