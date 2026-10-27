import type { Db } from 'mongodb';
import type { CoverageEntry, Profile, ToolVersion } from '../../domain/types';

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

/** Saves the next version of a tool's coverage. It is never approved: the verifier does that. */
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
