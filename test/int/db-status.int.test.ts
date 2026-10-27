import { closeDb, getDb } from '@/lib/data/db';
import { seedDatabase } from '@/lib/data/seed';
import { getDbStatus } from '@/lib/data/status';

afterAll(closeDb);

test('a seeded database is ok', async () => {
  await seedDatabase(await getDb());
  expect(await getDbStatus()).toBe('ok');
});

test('a running but empty database says so', async () => {
  const db = await getDb();
  await seedDatabase(db);
  await db.collection('profiles').drop();
  expect(await getDbStatus()).toBe('empty');
  await seedDatabase(db);
});

test('a database that is not running says so', async () => {
  const saved = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://localhost:1';
  try {
    expect(await getDbStatus()).toBe('unavailable');
  } finally {
    if (saved === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = saved;
  }
});
