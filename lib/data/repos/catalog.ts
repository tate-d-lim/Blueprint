import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { CatalogError, type IncomingRelease, type PendingRelease } from '../../catalog/types';
import type { CatalogRelease, PlainText, Profile, Tool } from '../../domain/types';
import type { VersionPair } from '../../plan/verification';
import { loadPlanData } from './plan-data';

export async function listReleases(db: Db): Promise<CatalogRelease[]> {
  return (await db.collection('catalogReleases').find().sort({ appliedAt: -1 }).toArray()) as unknown as CatalogRelease[];
}

export async function getPending(db: Db, id: string): Promise<PendingRelease | undefined> {
  return (await db.collection<PendingRelease>('catalogPending').findOne({ _id: id })) ?? undefined;
}

/** Keeps a parsed release until the admin applies or discards it. */
export async function createPending(db: Db, incoming: IncomingRelease, by: string, now = new Date().toISOString()): Promise<string> {
  const doc: PendingRelease = { _id: randomUUID(), createdAt: now, by, incoming };
  await db.collection<PendingRelease>('catalogPending').insertOne(doc);
  return doc._id;
}

export async function deletePending(db: Db, id: string): Promise<void> {
  await db.collection<PendingRelease>('catalogPending').deleteOne({ _id: id });
}

/** The newest pending release that came from a check of a source, if the admin has not dealt with it. */
export async function newestFetched(db: Db): Promise<PendingRelease | undefined> {
  return (await db.collection<PendingRelease>('catalogPending').find({ sourceId: { $exists: true } }).sort({ createdAt: -1 }).limit(1).next()) ?? undefined;
}

export interface PlainInput {
  title: string;
  task: string;
  why: string;
}

const LIMITS = { title: 120, task: 1200, why: 1200 } as const;

/** Checks the three fields of a plain text. Returns a plain sentence for the first problem. */
export function plainProblem(input: PlainInput): string | undefined {
  if (!input.title.trim()) return 'Write a title for the plain text.';
  if (!input.task.trim()) return 'Write what to do.';
  if (!input.why.trim()) return 'Write why it matters.';
  if (input.title.length > LIMITS.title) return `The title has ${input.title.length} characters. Shorten it to ${LIMITS.title} or fewer.`;
  if (input.task.length > LIMITS.task) return `"What to do" has ${input.task.length} characters. Shorten it to ${LIMITS.task} or fewer.`;
  if (input.why.length > LIMITS.why) return `"Why it matters" has ${input.why.length} characters. Shorten it to ${LIMITS.why} or fewer.`;
  return undefined;
}

/**
 * Saves the plain text of one control of one profile. The rule (`appliesWhen`) and the question stay as they are, this
 * profile joins `checkedFor`, and `editedAt` says when an admin wrote it.
 */
export async function savePlainText(db: Db, profileId: string, controlId: string, input: PlainInput, now = new Date().toISOString()): Promise<void> {
  const problem = plainProblem(input);
  if (problem) throw new CatalogError(problem);
  const profile = (await db.collection('profiles').findOne({ _id: profileId as never })) as unknown as Profile | null;
  const entry = profile?.entries.find(e => e.id === controlId);
  if (!profile || !entry) throw new CatalogError('Blueprint cannot find this control. Reload the page, then try again.');
  const before = entry.plain;
  const plain: PlainText = {
    ...before,
    title: input.title.trim(),
    task: input.task.trim(),
    why: input.why.trim(),
    checkedFor: [...new Set([...(before?.checkedFor ?? []), profileId])],
    editedAt: now,
  };
  await db.collection('profiles').updateOne({ _id: profileId as never }, { $set: { 'entries.$[e].plain': plain } }, { arrayFilters: [{ 'e.id': controlId }] });
}

export interface CatalogPageData {
  profiles: Profile[];
  releases: CatalogRelease[];
  tools: Tool[];
  versions: VersionPair[];
}

/** Everything the Catalog sheet reads. */
export async function loadCatalogPage(db: Db): Promise<CatalogPageData> {
  const [plan, releases] = await Promise.all([loadPlanData(db), listReleases(db)]);
  return { profiles: plan.profiles, releases, tools: plan.tools, versions: plan.versions };
}
