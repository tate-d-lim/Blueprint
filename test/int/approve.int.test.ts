import { closeDb, getDb } from '@/lib/data/db';
import { loadPlanData } from '@/lib/data/repos/plan-data';
import {
  DecidedVersionError,
  SendBackNoteError,
  StaleVersionError,
  approveCurrentVersion,
  createToolVersion,
  getCurrentVersion,
  listAwaitingApproval,
  listDecisions,
  sendBackCurrentVersion,
} from '@/lib/data/repos/tool-versions';
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
  await expect(approveCurrentVersion(await getDb(), 'appcentral:low-risk-cloud:v1', 'Admin')).rejects.toBeInstanceOf(StaleVersionError);
  await expect(approveCurrentVersion(await getDb(), 'appcentral:low-risk-cloud:v1', 'Admin')).rejects.toThrow('A newer version exists');
  expect(v2.version).toBe(2);
});

test('approving the current version records who and when, and builders see it as last approved', async () => {
  await newAppcentralVersion();
  const approved = await approveCurrentVersion(await getDb(), 'appcentral:low-risk-cloud:v2', 'Admin');
  expect(approved.approval).toMatchObject({ by: 'Admin', kind: 'verifier' });
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
  await expect(approveCurrentVersion(await getDb(), 'nope:p:v9', 'Admin')).rejects.toThrow(/nope:p:v9/);
});

test('sending back records who, when and the note, and the version is no longer awaiting approval', async () => {
  const sent = await sendBackCurrentVersion(await getDb(), 'dbaas:low-risk-cloud:v1', 'Admin', '  Check the backup rows.  ');
  expect(sent.sentBack).toMatchObject({ by: 'Admin', note: 'Check the backup rows.' });
  expect((await listAwaitingApproval(await getDb())).map(w => w.tool._id)).not.toContain('dbaas');
});

test('a version that was sent back is not seen by builders, and cannot be approved or sent back again', async () => {
  const db = await getDb();
  await sendBackCurrentVersion(db, 'dbaas:low-risk-cloud:v1', 'Admin', 'Fix it.');
  expect((await loadPlanData(db)).versions.some(v => v.current.toolId === 'dbaas')).toBe(false);
  await expect(approveCurrentVersion(db, 'dbaas:low-risk-cloud:v1', 'Admin')).rejects.toBeInstanceOf(DecidedVersionError);
  await expect(sendBackCurrentVersion(db, 'dbaas:low-risk-cloud:v1', 'Admin', 'Again.')).rejects.toBeInstanceOf(DecidedVersionError);
});

test('a note is required, and an older version is stale', async () => {
  const db = await getDb();
  await expect(sendBackCurrentVersion(db, 'dbaas:low-risk-cloud:v1', 'Admin', '   ')).rejects.toBeInstanceOf(SendBackNoteError);
  await newAppcentralVersion();
  await expect(sendBackCurrentVersion(db, 'appcentral:low-risk-cloud:v1', 'Admin', 'Too late.')).rejects.toBeInstanceOf(StaleVersionError);
});

test('an approved version cannot be sent back', async () => {
  const db = await getDb();
  await approveCurrentVersion(db, 'dbaas:low-risk-cloud:v1', 'Admin');
  await expect(sendBackCurrentVersion(db, 'dbaas:low-risk-cloud:v1', 'Admin', 'Too late.')).rejects.toBeInstanceOf(DecidedVersionError);
});

test('after a send back, the next version waits, and builders keep the older approved version', async () => {
  const db = await getDb();
  await newAppcentralVersion();
  await sendBackCurrentVersion(db, 'appcentral:low-risk-cloud:v2', 'Admin', 'Fix it.');
  const pair = (await loadPlanData(db)).versions.find(v => v.current.toolId === 'appcentral')!;
  expect(pair.current.version).toBe(1);
  expect((await getCurrentVersion(db, 'appcentral', 'low-risk-cloud'))?.sentBack?.note).toBe('Fix it.');
  const v3 = await newAppcentralVersion();
  expect(v3.version).toBe(3);
  expect((await listAwaitingApproval(db)).find(w => w.tool._id === 'appcentral')?.current.version).toBe(3);
  expect((await listDecisions(db)).map(d => d.version._id)).toContain('appcentral:low-risk-cloud:v2');
});
