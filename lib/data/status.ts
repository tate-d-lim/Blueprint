import { DatabaseUnavailableError, withDb } from './db';

export type DbStatus = 'ok' | 'unavailable' | 'empty';

/** Is MongoDB reachable, and has it been seeded? Never throws. */
export async function getDbStatus(): Promise<DbStatus> {
  try {
    const profiles = await withDb(db => db.collection('profiles').countDocuments());
    return profiles > 0 ? 'ok' : 'empty';
  } catch (err) {
    return err instanceof DatabaseUnavailableError ? 'unavailable' : 'ok';
  }
}
