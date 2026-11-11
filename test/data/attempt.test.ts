import { attempt } from '@/lib/data/attempt';
import { DatabaseUnavailableError } from '@/lib/data/db';
import { SAVE_FAILED } from '@/lib/plan/save';

test('work that succeeds is ok', async () => {
  expect(await attempt(async () => 'saved')).toEqual({ ok: true });
});

test('a database that is down is reported in plain words', async () => {
  const outcome = await attempt(async () => { throw new DatabaseUnavailableError(); });
  expect(outcome).toEqual({ ok: false, error: "The database is not running. Start it with `docker compose up -d`." });
});

test('any other failure is reported generically, without leaking internals', async () => {
  const outcome = await attempt(async () => { throw new Error('E11000 duplicate key { _id: "secret" }'); });
  expect(outcome).toEqual({ ok: false, error: SAVE_FAILED });
});
