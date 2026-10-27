import { buildSeedDocuments, type SeedDocuments } from '@/lib/data/seed-documents';

export const SEED_NOW = '2026-10-27T00:00:00.000Z';

let cached: Promise<SeedDocuments> | undefined;

/** The real seed, built once per test file. */
export function loadSeed(): Promise<SeedDocuments> {
  cached ??= buildSeedDocuments('data', SEED_NOW);
  return cached;
}
