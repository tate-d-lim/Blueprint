import type { Db } from 'mongodb';
import type { CoverageEntry, Profile, Tool, ToolVersion } from '../../domain/types';

export interface NewToolVersion {
  toolId: string;
  profileId: string;
  source: string;
  changeNote?: string;
  entries: CoverageEntry[];
  writtenAgainst?: string;
  createdByRole: 'admin' | 'seed';
  importedFrom?: ToolVersion['importedFrom'];
}

const DUPLICATE_KEY = 11000;
const ATTEMPTS = 3;

/** The newest version of a tool's coverage for a profile, or null if it has none yet. */
export async function getCurrentVersion(db: Db, toolId: string, profileId: string): Promise<ToolVersion | null> {
  return db.collection<ToolVersion>('toolVersions').find({ toolId, profileId }).sort({ version: -1 }).limit(1).next();
}

/** Saves the next version of a tool's coverage. It is never approved: the admin does that. */
export async function createToolVersion(db: Db, input: NewToolVersion): Promise<ToolVersion> {
  const profile = await db.collection<Profile>('profiles').findOne({ _id: input.profileId });
  if (!profile) throw new Error(`Unknown profile ${input.profileId}`);
  const versions = db.collection<ToolVersion>('toolVersions');

  for (let attempt = 1; ; attempt++) {
    const latest = await versions.find({ toolId: input.toolId, profileId: input.profileId }).sort({ version: -1 }).limit(1).next();
    const version = (latest?.version ?? 0) + 1;
    const doc: ToolVersion = {
      _id: `${input.toolId}:${input.profileId}:v${version}`,
      toolId: input.toolId,
      profileId: input.profileId,
      version,
      writtenAgainst: input.writtenAgainst ?? profile.version,
      source: input.source,
      createdAt: new Date().toISOString(),
      createdByRole: input.createdByRole,
      entries: input.entries,
    };
    if (input.changeNote?.trim()) doc.changeNote = input.changeNote.trim();
    if (input.importedFrom) doc.importedFrom = input.importedFrom;
    try {
      await versions.insertOne(doc);
      return doc;
    } catch (err) {
      // Another save took this number first: take the next one.
      if ((err as { code?: number }).code === DUPLICATE_KEY && attempt < ATTEMPTS) continue;
      throw err;
    }
  }
}

export class StaleVersionError extends Error {
  constructor() {
    super('A newer version exists');
    this.name = 'StaleVersionError';
  }
}

/** Approves a version, but only if it is still the newest for its tool and profile. Approving twice keeps the first approval. */
export async function approveCurrentVersion(db: Db, versionId: string, by: string): Promise<ToolVersion> {
  const versions = db.collection<ToolVersion>('toolVersions');
  const version = await versions.findOne({ _id: versionId });
  if (!version) throw new Error(`No such version ${versionId}`);
  const newest = await versions.find({ toolId: version.toolId, profileId: version.profileId }).sort({ version: -1 }).limit(1).next();
  if (newest && newest.version > version.version) throw new StaleVersionError();
  if (version.approval) return version;
  const approval = { at: new Date().toISOString(), by, kind: 'verifier' as const };
  await versions.updateOne({ _id: versionId }, { $set: { approval } });
  return { ...version, approval };
}

/** Tools whose newest version, for any profile, has not been approved yet. */
export async function listAwaitingApproval(db: Db): Promise<{ tool: Tool; current: ToolVersion }[]> {
  const [tools, versions] = await Promise.all([
    db.collection<Tool>('tools').find().toArray(),
    db.collection<ToolVersion>('toolVersions').find().toArray(),
  ]);
  const newest = new Map<string, ToolVersion>();
  for (const v of versions) {
    const k = `${v.toolId}|${v.profileId}`;
    if (!newest.has(k) || newest.get(k)!.version < v.version) newest.set(k, v);
  }
  return [...newest.values()]
    .filter(v => !v.approval)
    .flatMap(current => {
      const tool = tools.find(t => t._id === current.toolId);
      return tool ? [{ tool, current }] : [];
    })
    .sort((a, b) => a.tool.name.localeCompare(b.tool.name));
}
