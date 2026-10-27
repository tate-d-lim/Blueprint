import { closeDb, getDb } from '@/lib/data/db';
import { createTool } from '@/lib/data/repos/tools';
import { createToolVersion } from '@/lib/data/repos/tool-versions';
import { seedDatabase } from '@/lib/data/seed';
import type { CoverageEntry } from '@/lib/domain/types';

beforeEach(async () => {
  await seedDatabase(await getDb());
});
afterAll(closeDb);

const entries: CoverageEntry[] = [{ key: 'im8-reform:as-4', value: 'provided', explanation: 'Clarified.' }];

test('saving a version for appCentral creates v2, not approved, against the profile version', async () => {
  const db = await getDb();
  const v = await createToolVersion(db, {
    toolId: 'appcentral', profileId: 'low-risk-cloud', source: 'Team note', changeNote: 'clarified TLS', entries, createdByRole: 'admin',
  });
  expect(v.version).toBe(2);
  expect(v._id).toBe('appcentral:low-risk-cloud:v2');
  expect(v.approval).toBeUndefined();
  expect(v.writtenAgainst).toBe('2026-10-22 (local copy)');
  expect(v.changeNote).toBe('clarified TLS');
  const stored = await db.collection('toolVersions').findOne({ _id: v._id as never });
  expect(stored).toMatchObject({ version: 2, createdByRole: 'admin' });
});

test('two saves at once get different version numbers without throwing', async () => {
  const db = await getDb();
  const make = () =>
    createToolVersion(db, { toolId: 'appcentral', profileId: 'low-risk-cloud', source: 's', entries, createdByRole: 'admin' });
  const [a, b] = await Promise.all([make(), make()]);
  expect([a.version, b.version].sort()).toEqual([2, 3]);
});

test('a version for an unknown profile is rejected', async () => {
  const db = await getDb();
  await expect(
    createToolVersion(db, { toolId: 'appcentral', profileId: 'nope', source: 's', entries: [], createdByRole: 'admin' }),
  ).rejects.toThrow(/nope/);
});

test('createTool slugifies the name into the ID and rejects a duplicate name', async () => {
  const db = await getDb();
  const tool = await createTool(db, { name: 'Zod Validator', description: 'Schemas', section: 'code', oscalType: 'software', isSample: true });
  expect(tool._id).toBe('zod-validator');
  await expect(
    createTool(db, { name: 'zod validator', description: '', section: 'code', oscalType: 'software', isSample: true }),
  ).rejects.toThrow(/already exists/);
  await expect(
    createTool(db, { name: 'appCentral', description: '', section: 'cpf', oscalType: 'service', isSample: false }),
  ).rejects.toThrow(/already exists/);
});

test('a name with no letters or digits is rejected', async () => {
  const db = await getDb();
  await expect(
    createTool(db, { name: '!!!', description: '', section: 'cpf', oscalType: 'service', isSample: false }),
  ).rejects.toThrow(/name/i);
});
