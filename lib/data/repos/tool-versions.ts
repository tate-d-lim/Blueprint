import type { Db } from 'mongodb';
import type { CoverageEntry, Profile, Tool, ToolVersion } from '../../domain/types';
import { newestVersions } from '../../plan/select';
import { SEND_BACK_NOTE_MAX, decisionsOf, type Decision } from '../../admin/decisions';

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

/** The version was approved or sent back already, so it takes no further decision. */
export class DecidedVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecidedVersionError';
  }
}

export class SendBackNoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SendBackNoteError';
  }
}

/** The note an admin gives when a version goes back: trimmed, not empty, at most 500 characters. */
export function cleanSendBackNote(note: string): string {
  const clean = note.trim();
  if (!clean) throw new SendBackNoteError('Write what the tool owner should correct.');
  if (clean.length > SEND_BACK_NOTE_MAX) throw new SendBackNoteError(`Shorten the note to ${SEND_BACK_NOTE_MAX} characters or fewer.`);
  return clean;
}

/** The rule for a decision: only the newest version of a tool and profile takes one, and only once. */
export function assertCanDecide(version: ToolVersion, newest: ToolVersion | null | undefined): void {
  if (newest && newest.version > version.version) throw new StaleVersionError();
  if (version.approval) throw new DecidedVersionError('This version is already approved.');
  if (version.sentBack) throw new DecidedVersionError('This version was already sent back.');
}

async function newestOf(db: Db, version: ToolVersion): Promise<ToolVersion | null> {
  return db.collection<ToolVersion>('toolVersions').find({ toolId: version.toolId, profileId: version.profileId }).sort({ version: -1 }).limit(1).next();
}

/** Approves a version, but only if it is still the newest for its tool and profile. Approving twice keeps the first approval. */
export async function approveCurrentVersion(db: Db, versionId: string, by: string): Promise<ToolVersion> {
  const versions = db.collection<ToolVersion>('toolVersions');
  const version = await versions.findOne({ _id: versionId });
  if (!version) throw new Error(`No such version ${versionId}`);
  const newest = await newestOf(db, version);
  if (newest && newest.version > version.version) throw new StaleVersionError();
  if (version.sentBack) throw new DecidedVersionError('This version was sent back.');
  if (version.approval) return version;
  const approval = { at: new Date().toISOString(), by, kind: 'verifier' as const };
  await versions.updateOne({ _id: versionId }, { $set: { approval } });
  return { ...version, approval };
}

/**
 * Sends the newest version back to the tool owner with a note. Builders never see a version that was sent back.
 * It fails for a version that is not the newest, and for one that was already decided.
 */
export async function sendBackCurrentVersion(db: Db, versionId: string, by: string, note: string): Promise<ToolVersion> {
  const clean = cleanSendBackNote(note);
  const versions = db.collection<ToolVersion>('toolVersions');
  const version = await versions.findOne({ _id: versionId });
  if (!version) throw new Error(`No such version ${versionId}`);
  assertCanDecide(version, await newestOf(db, version));
  const sentBack = { at: new Date().toISOString(), by, note: clean };
  await versions.updateOne({ _id: versionId }, { $set: { sentBack } });
  return { ...version, sentBack };
}

/** The newest version of every tool and profile in any state. The tool owner pages read these. */
export async function listNewestVersions(db: Db): Promise<ToolVersion[]> {
  return newestVersions(await db.collection<ToolVersion>('toolVersions').find().toArray());
}

/** Tools whose newest version, for any profile, has not been decided yet. A version that was sent back is not in the list. */
export async function listAwaitingApproval(db: Db): Promise<{ tool: Tool; current: ToolVersion }[]> {
  const [tools, versions] = await Promise.all([
    db.collection<Tool>('tools').find().toArray(),
    db.collection<ToolVersion>('toolVersions').find().toArray(),
  ]);
  return newestVersions(versions)
    .filter(v => !v.approval && !v.sentBack)
    .flatMap(current => {
      const tool = tools.find(t => t._id === current.toolId);
      return tool ? [{ tool, current }] : [];
    })
    .sort((a, b) => a.tool.name.localeCompare(b.tool.name));
}

/** The latest decisions of people, newest first. Seeded GovTech approvals are not decisions of an admin. */
export async function listDecisions(db: Db, limit = 10): Promise<{ tool: Tool; version: ToolVersion; decision: Decision }[]> {
  const [tools, versions] = await Promise.all([
    db.collection<Tool>('tools').find().toArray(),
    db.collection<ToolVersion>('toolVersions').find({ $or: [{ sentBack: { $exists: true } }, { 'approval.kind': 'verifier' }] }).toArray(),
  ]);
  return decisionsOf(versions, limit).flatMap(({ version, decision }) => {
    const tool = tools.find(t => t._id === version.toolId);
    return tool ? [{ tool, version, decision }] : [];
  });
}
