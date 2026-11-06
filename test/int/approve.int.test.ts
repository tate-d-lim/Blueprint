import { closeDb, getDb } from '@/lib/data/db';
import { loadPlanData } from '@/lib/data/repos/plan-data';
import { StaleVersionError, approveCurrentVersion, createToolVersion, listAwaitingApproval } from '@/lib/data/repos/tool-versions';
import { seedDatabase } from '@/lib/data/seed';

beforeEach(async () => {
  await seedDatabase(await getDb());
});
afterAll(closeDb);

const newAppcentralVersion = async () =>
  createToolVersion(await getDb(), {
    toolId: 'appcentral', profileId: 'low-risk-cloud', source: 'Team note',
    entries: [{ key: 'im8-reform:as-4', value: 'provided', explanation: 'Clarified.' }], createdByRole: 'admin',
  });

test('after seeding, DBaaS, IGA and the sample libraries await approval; appCentral and the GovTech guides do not', async () => {
  const waiting = await listAwaitingApproval(await getDb());
  expect(waiting.map(w => w.tool._id).sort()).toEqual(['dbaas', 'iga', 'prisma', 'ship-hats', 'zod']);
});

test('a new appCentral version joins the list, and approving the old one is refused', async () => {
  const v2 = await newAppcentralVersion();
  const waiting = await listAwaitingApproval(await getDb());
  expect(waiting.find(w => w.tool._id === 'appcentral')?.current.version).toBe(2);
  await expect(approveCurrentVersion(await getDb(), 'appcentral:low-risk-cloud:v1', 'Verifier')).rejects.toBeInstanceOf(StaleVersionError);
  await expect(approveCurrentVersion(await getDb(), 'appcentral:low-risk-cloud:v1', 'Verifier')).rejects.toThrow('A newer version exists');
  expect(v2.version).toBe(2);
});

test('approving the current version records who and when, and builders see it as last approved', async () => {
  await newAppcentralVersion();
  const approved = await approveCurrentVersion(await getDb(), 'appcentral:low-risk-cloud:v2', 'Verifier');
  expect(approved.approval).toMatchObject({ by: 'Verifier', kind: 'verifier' });
  const pair = (await loadPlanData(await getDb())).versions.find(v => v.current.toolId === 'appcentral')!;
  expect(pair.lastApproved?.version).toBe(2);
  expect((await listAwaitingApproval(await getDb())).map(w => w.tool._id)).not.toContain('appcentral');
});

test('approving twice keeps the first approval', async () => {
  const first = await approveCurrentVersion(await getDb(), 'dbaas:low-risk-cloud:v1', 'First');
  const second = await approveCurrentVersion(await getDb(), 'dbaas:low-risk-cloud:v1', 'Second');
  expect(second.approval).toEqual(first.approval);
});

test('approving a version that does not exist is an error', async () => {
  await expect(approveCurrentVersion(await getDb(), 'nope:p:v9', 'Verifier')).rejects.toThrow(/nope:p:v9/);
});
