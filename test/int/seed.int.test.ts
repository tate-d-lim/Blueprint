import { closeDb, DatabaseUnavailableError, getDb, withDb } from '@/lib/data/db';
import { loadPlanData } from '@/lib/data/repos/plan-data';
import { seedDatabase } from '@/lib/data/seed';
import { buildPlan } from '@/lib/plan/engine';
import { selectPlanInput } from '@/lib/plan/select';

beforeAll(async () => {
  await seedDatabase(await getDb());
});
afterAll(closeDb);

test('loadPlanData returns both profiles and pairs each tool’s versions', async () => {
  const data = await loadPlanData(await getDb());
  expect(data.profiles.map(p => p._id).sort()).toEqual(['generative-ai', 'low-risk-cloud']);
  const appcentral = data.versions.find(v => v.current.toolId === 'appcentral')!;
  expect(appcentral.current.version).toBe(1);
  expect(appcentral.lastApproved).toEqual(appcentral.current);
  const dbaas = data.versions.find(v => v.current.toolId === 'dbaas')!;
  expect(dbaas.lastApproved).toBeUndefined();
});

test('the seeded data gives the headline counts: you 11, platform 66, questions 9', async () => {
  const data = await loadPlanData(await getDb());
  const plan = buildPlan(
    selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds: ['appcentral', 'dbaas', 'iga'] }),
  );
  expect(plan.counts).toEqual({ you: 11, platform: 66, questions: 9, 'good-to-have': 32 });
});

test('seeding twice replaces the data instead of duplicating it', async () => {
  const db = await getDb();
  const counts = await seedDatabase(db);
  expect(counts.toolVersions).toBe(5);
  expect(await db.collection('toolVersions').countDocuments()).toBe(5);
});

test('a second version with the same (tool, profile, version) is rejected by the unique index', async () => {
  const db = await getDb();
  const original = await db.collection('toolVersions').findOne({ _id: 'appcentral:low-risk-cloud:v1' as never });
  const { _id, ...rest } = original!;
  await expect(db.collection('toolVersions').insertOne({ ...rest, _id: 'duplicate' as never })).rejects.toMatchObject({
    code: 11000,
  });
});

test('withDb reports an unreachable database in plain words', async () => {
  const saved = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://localhost:1';
  try {
    const attempt = withDb(async db => db.collection('tools').countDocuments());
    await expect(attempt).rejects.toBeInstanceOf(DatabaseUnavailableError);
    await expect(attempt).rejects.toThrow("The database isn't running. Start it with `docker compose up -d`.");
  } finally {
    if (saved === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = saved;
  }
});
