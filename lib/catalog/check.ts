import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { diffAgainst } from './apply';
import { SiteLayoutError } from './govtech/parse-page';
import { govtechSite } from './govtech/site';
import { SourceUnreachableError, type CatalogSource } from './govtech/source';
import type { Profile } from '../domain/types';
import type { CatalogBaseline, CatalogCheck, PendingRelease } from './types';
import { CatalogError } from './types';

/** Every source Blueprint can check. A second source joins this list. */
export const SOURCES: CatalogSource[] = [govtechSite()];

/** The check runs by itself when the last one is older than this. */
export const AUTO_CHECK_AFTER_MS = 24 * 60 * 60 * 1000;

export const autoCheckEnabled = (): boolean => process.env.CATALOG_AUTO_CHECK !== 'off';

export const LAYOUT_MESSAGE = 'The GovTech page has a new layout. Upload a file as a replacement.';
export const UNREACHABLE_MESSAGE = 'Could not reach GovTech.';

/** Where a check reads and writes. The database in the app; a plain object in a test. */
export interface CheckStore {
  profiles(): Promise<Profile[]>;
  baseline(sourceId: string): Promise<CatalogBaseline | undefined>;
  setBaseline(sourceId: string, pages: Record<string, string>, at: string, sourceDate?: string): Promise<void>;
  /** Stores the release as the only pending one of its source. */
  replacePending(doc: PendingRelease): Promise<void>;
  addCheck(doc: CatalogCheck): Promise<void>;
  lastCheck(sourceId: string): Promise<CatalogCheck | undefined>;
}

export function mongoStore(db: Db): CheckStore {
  const checks = db.collection<CatalogCheck>('catalogChecks');
  const baselines = db.collection<CatalogBaseline>('catalogBaselines');
  const pending = db.collection<PendingRelease>('catalogPending');
  return {
    profiles: async () => (await db.collection('profiles').find().toArray()) as unknown as Profile[],
    baseline: async id => (await baselines.findOne({ _id: id })) ?? undefined,
    setBaseline: async (sourceId, pages, at, sourceDate) => {
      await baselines.replaceOne({ _id: sourceId }, { at, pages, ...(sourceDate ? { sourceDate } : {}) }, { upsert: true });
    },
    replacePending: async doc => {
      // One pending release for each source: a newer one replaces an older one.
      await pending.deleteMany({ sourceId: doc.sourceId });
      await pending.insertOne(doc);
    },
    addCheck: async doc => {
      await checks.insertOne(doc);
    },
    lastCheck: async id => (await checks.find({ sourceId: id }).sort({ at: -1 }).limit(1).next()) ?? undefined,
  };
}

/** True when no check was made in the last 24 hours. */
export async function checkIsDue(store: CheckStore, sourceId: string, now = new Date()): Promise<boolean> {
  const last = await store.lastCheck(sourceId);
  return !last || now.getTime() - new Date(last.at).getTime() > AUTO_CHECK_AFTER_MS;
}

/**
 * Asks the source what changed. With no change, stores the baseline and says so. With a change, stores the release as a
 * pending release to review. Never applies anything. The result is stored, so the page can show it.
 */
export async function runCheck(
  store: CheckStore,
  source: CatalogSource,
  by = 'Blueprint',
  now = new Date().toISOString(),
  /** `full` reads the pages again even when the source shows no newer date. The admin's own check does this. */
  { full = false }: { full?: boolean } = {},
): Promise<CatalogCheck> {
  const record = async (partial: Omit<CatalogCheck, '_id' | 'at' | 'sourceId'>): Promise<CatalogCheck> => {
    const doc: CatalogCheck = { _id: randomUUID(), at: now, sourceId: source.id, ...partial };
    await store.addCheck(doc);
    return doc;
  };
  try {
    const stamp = await source.check();
    const baseline = await store.baseline(source.id);
    const unchanged = !full && baseline && Object.entries(stamp.pages).every(([page, at]) => baseline.pages[page] !== undefined && at <= baseline.pages[page]);
    if (unchanged) return await record({ outcome: 'no-change', ...(baseline.sourceDate ? { sourceDate: baseline.sourceDate } : {}) });

    const incoming = await source.fetchRelease(stamp);
    const diffs = diffAgainst(await store.profiles(), incoming);
    const sourceDate = incoming.source.sourceDate;
    if (!diffs.some(d => d.diff.changed)) {
      await store.setBaseline(source.id, stamp.pages, now, sourceDate);
      return await record({ outcome: 'no-change', ...(sourceDate ? { sourceDate } : {}) });
    }
    const waiting: PendingRelease = { _id: randomUUID(), createdAt: now, by, incoming, sourceId: source.id, stamp };
    await store.replacePending(waiting);
    return await record({ outcome: 'changed', ...(sourceDate ? { sourceDate } : {}), pendingId: waiting._id });
  } catch (err) {
    if (err instanceof SourceUnreachableError) return record({ outcome: 'unreachable', error: UNREACHABLE_MESSAGE });
    if (err instanceof SiteLayoutError) return record({ outcome: 'error', error: LAYOUT_MESSAGE });
    if (err instanceof CatalogError) return record({ outcome: 'error', error: err.message });
    throw err;
  }
}

/**
 * Stores the baseline of a fetched release that the admin applied or discarded, so the next automatic check starts from
 * it. A discarded release does not come back until the source changes its pages, or the admin runs a full check.
 */
export async function storeBaseline(store: CheckStore, waiting: PendingRelease, now = new Date().toISOString()): Promise<void> {
  if (!waiting.sourceId || !waiting.stamp) return;
  await store.setBaseline(waiting.sourceId, waiting.stamp.pages, now, waiting.incoming.source.sourceDate);
}

/** The latest check, and the latest one that reached the source. */
export async function lastChecks(db: Db, sourceId: string): Promise<{ last?: CatalogCheck; lastGood?: CatalogCheck }> {
  const checks = db.collection<CatalogCheck>('catalogChecks');
  const last = (await checks.find({ sourceId }).sort({ at: -1 }).limit(1).next()) ?? undefined;
  const lastGood = (await checks.find({ sourceId, outcome: { $in: ['no-change', 'changed'] } }).sort({ at: -1 }).limit(1).next()) ?? undefined;
  return { last, lastGood };
}

let running: Promise<CatalogCheck> | undefined;

/** Runs one check at a time: a second call while one runs gets the same result. */
export function runExclusive(start: () => Promise<CatalogCheck>): Promise<CatalogCheck> {
  running ??= start().finally(() => {
    running = undefined;
  });
  return running;
}
