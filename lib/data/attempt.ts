import { SAVE_FAILED, type SaveOutcome } from '../plan/save';
import { DatabaseUnavailableError } from './db';

/** Runs server-side work and turns a failure into a message that is safe to show, instead of throwing. */
export async function attempt(work: () => Promise<unknown>): Promise<SaveOutcome> {
  try {
    await work();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof DatabaseUnavailableError ? err.message : SAVE_FAILED };
  }
}
