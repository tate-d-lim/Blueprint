import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { familyOf, wordingOf } from '../data/load-sources';
import type { CatalogRelease, Profile, ProfileEntry, RequirementKey } from '../domain/types';
import { sameWording } from './comparable';
import { diffProfile } from './diff';
import { CatalogError, type IncomingEntry, type IncomingProfile, type IncomingRelease, type ProfileDiff } from './types';

export interface ReleaseDiff {
  profile: Profile;
  incoming: IncomingProfile;
  diff: ProfileDiff;
}

/** Compares a release with profiles. Writes nothing. */
export function diffAgainst(profiles: Profile[], incoming: IncomingRelease): ReleaseDiff[] {
  return incoming.profiles.map(p => {
    const profile = profiles.find(x => x._id === p.profileId);
    if (!profile) throw new CatalogError(`Blueprint has no profile "${p.profileId}". The release cannot be applied.`);
    return { profile, incoming: p, diff: diffProfile(profile, p) };
  });
}

/** Compares a release with the profiles in the database. Writes nothing. */
export async function diffRelease(db: Db, incoming: IncomingRelease): Promise<ReleaseDiff[]> {
  return diffAgainst((await db.collection('profiles').find().toArray()) as unknown as Profile[], incoming);
}

/** The prefix of the keys of a profile: `im8-reform` for the IM8 profiles, `genai` for Generative AI. */
function keyPrefix(profile: Profile): string {
  const first = profile.entries[0]?.key;
  if (first) return first.split(':')[0];
  return profile._id === 'generative-ai' ? 'genai' : 'im8-reform';
}

const idOrder = (id: string) => {
  const [family, n] = id.split('-');
  return { family, n: Number(n) || 0 };
};

/** The entries of the profile after the release. The profile's own wording stays when the new wording only differs in form. */
export function updatedEntries(profile: Profile, incoming: IncomingProfile): ProfileEntry[] {
  const got = new Map(incoming.entries.map(e => [e.id, e]));
  const kept: ProfileEntry[] = [];
  for (const entry of profile.entries) {
    const next = got.get(entry.id);
    if (!next) continue;
    const statement = sameWording(entry.statement, next.statement) ? entry.statement : next.statement;
    kept.push({
      ...entry,
      title: next.title || entry.title,
      statement,
      recommendations: sameWording(entry.recommendations, next.recommendations) ? entry.recommendations : next.recommendations,
      rationale: sameWording(entry.rationale, next.rationale) ? entry.rationale : next.rationale,
      references: next.references || entry.references,
      level: incoming.wordingOnly ? entry.level : (next.level ?? entry.level),
      wording: wordingOf(statement),
    });
  }
  if (incoming.wordingOnly) return kept;

  const have = new Set(profile.entries.map(e => e.id));
  const prefix = keyPrefix(profile);
  const added: ProfileEntry[] = incoming.entries
    .filter((e: IncomingEntry) => !have.has(e.id))
    .map(e => ({
      key: `${prefix}:${e.id}` as RequirementKey,
      id: e.id,
      family: familyOf(e.id),
      title: e.title,
      level: e.level ?? 1,
      statement: e.statement,
      recommendations: e.recommendations,
      rationale: e.rationale,
      references: e.references,
      ifUncovered: 'app-builder' as const,
      wording: wordingOf(e.statement),
    }));
  if (added.length === 0) return kept;
  // A new control goes after the others of its family, in the order of its number.
  const familyRank = new Map<string, number>();
  for (const e of [...kept, ...added]) if (!familyRank.has(e.family)) familyRank.set(e.family, familyRank.size);
  return [...kept, ...added].sort((a, b) => {
    const x = idOrder(a.id);
    const y = idOrder(b.id);
    return (familyRank.get(a.family)! - familyRank.get(b.family)!) || x.n - y.n;
  });
}

export type ApplyResult =
  | { applied: true; release: CatalogRelease }
  | { applied: false; message: string };

export const NO_CHANGE_MESSAGE = 'This release changes nothing in the catalog, so Blueprint did not apply it.';

const dateOf = (iso: string) => iso.slice(0, 10);

/** Applies a release: updates each profile, and records one CatalogRelease. A release with no change is not applied. */
export async function applyRelease(db: Db, incoming: IncomingRelease, by: string, now = new Date().toISOString()): Promise<ApplyResult> {
  const diffs = (await diffRelease(db, incoming)).filter(d => d.diff.changed);
  if (diffs.length === 0) return { applied: false, message: NO_CHANGE_MESSAGE };

  const release = incoming.source.sourceDate ?? dateOf(now);
  const version = `${release} (${incoming.source.kind === 'fetch' ? 'GovTech site' : incoming.source.label})`;
  for (const { profile, incoming: p } of diffs) {
    await db.collection<Profile>('profiles').updateOne(
      { _id: profile._id },
      { $set: { entries: updatedEntries(profile, p), version, release, sourceFile: incoming.source.label } },
    );
  }
  const doc: CatalogRelease = {
    _id: randomUUID(),
    appliedAt: now,
    by,
    source: incoming.source,
    changes: diffs.map(d => d.diff.changes),
  };
  await db.collection<CatalogRelease>('catalogReleases').insertOne(doc);
  return { applied: true, release: doc };
}
