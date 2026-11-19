import { withDb } from '../data/db';
import { SOURCES, autoCheckEnabled, checkIsDue, mongoStore, runCheck, runExclusive } from './check';

/** How often the server asks whether a check is due. The check itself runs only when the last one is 24 hours old. */
export const SCHEDULE_TICK_MS = 60 * 60 * 1000;

/** The first look waits a little, so the server is ready and the database is up before it runs. */
const FIRST_TICK_MS = 30 * 1000;

const STARTED = Symbol.for('blueprint.catalogSchedule');

/** One tick: for each source, run a check if the last one is older than 24 hours. Never applies a release. */
export async function scheduledTick(): Promise<void> {
  if (!autoCheckEnabled()) return;
  for (const source of SOURCES) {
    try {
      const check = await withDb(async db => {
        const store = mongoStore(db);
        if (!(await checkIsDue(store, source.id))) return undefined;
        return runExclusive(() => runCheck(store, source, 'Blueprint'));
      });
      if (check) console.log(`[catalog] Daily check of ${source.id}: ${check.outcome}${check.error ? ` (${check.error})` : ''}`);
    } catch (err) {
      // A failed tick must not stop the server. The next tick tries again.
      console.error(`[catalog] Daily check of ${source.id} failed:`, err);
    }
  }
}

/**
 * Starts the daily check of GovTech while the server runs. It finds a new release and stores it for the admin to
 * review. The admin still applies it. Off when CATALOG_AUTO_CHECK=off (the e2e tests and the video copy).
 */
export function startDailyCheck(): void {
  if (!autoCheckEnabled()) return;
  const g = globalThis as Record<symbol, unknown>;
  if (g[STARTED]) return; // the dev server can load this file more than once
  g[STARTED] = true;
  setTimeout(() => void scheduledTick(), FIRST_TICK_MS).unref();
  setInterval(() => void scheduledTick(), SCHEDULE_TICK_MS).unref();
}
