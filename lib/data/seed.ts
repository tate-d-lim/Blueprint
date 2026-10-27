import type { Db } from 'mongodb';
import { buildSeedDocuments } from './seed-documents';

const COLLECTIONS = ['catalogs', 'requirements', 'profiles', 'tools', 'toolVersions', 'projects'] as const;
const NAMESPACE_NOT_FOUND = 26;

/** Drops and reloads every collection from the source files. Returns the document count per collection. */
export async function seedDatabase(db: Db, dataDir = 'data'): Promise<Record<string, number>> {
  const docs = await buildSeedDocuments(dataDir);
  const counts: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    try {
      await db.collection(name).drop();
    } catch (err) {
      if ((err as { code?: number }).code !== NAMESPACE_NOT_FOUND) throw err;
    }
    const documents = docs[name] as unknown as Record<string, unknown>[];
    if (documents.length > 0) await db.collection(name).insertMany(documents);
    counts[name] = documents.length;
  }
  await db.collection('toolVersions').createIndex({ toolId: 1, profileId: 1, version: 1 }, { unique: true });
  return counts;
}
