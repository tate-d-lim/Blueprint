import { closeDb, getDb } from '@/lib/data/db';
import { createTool } from '@/lib/data/repos/tools';
import { carrySources, validateNewVersion, type DraftRow } from '@/lib/admin/new-version';
import { loadPlanData } from '@/lib/data/repos/plan-data';
import { createToolVersion, getCurrentVersion } from '@/lib/data/repos/tool-versions';
import { seedDatabase } from '@/lib/data/seed';
import type { CoverageEntry } from '@/lib/domain/types';
import { buildPlan } from '@/lib/plan/engine';
import { selectPlanInput } from '@/lib/plan/select';

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

test('editing one row and saving with a new source leaves every other row attributed to the old source', async () => {
  const db = await getDb();
  const previous = (await getCurrentVersion(db, 'appcentral', 'low-risk-cloud'))!;
  expect(previous.version).toBe(1);
  const rows: DraftRow[] = previous.entries.map(e => ({
    key: e.key, value: e.value, explanation: e.explanation, builderPart: e.builderPart, source: e.source,
  }));
  rows.find(r => r.key === 'im8-reform:as-4')!.explanation = 'appCentral rate-limits sign-ins at the gateway.';

  const checked = validateNewVersion(carrySources(rows, previous), 'appCentral team note, 2026-10-27');
  if (!checked.ok) throw new Error(checked.errors.map(e => e.message).join());
  await createToolVersion(db, {
    toolId: 'appcentral', profileId: 'low-risk-cloud', source: 'appCentral team note, 2026-10-27', entries: checked.entries, createdByRole: 'admin',
  });

  const data = await loadPlanData(db);
  const plan = buildPlan(selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds: ['appcentral'] }));
  const claim = (id: string) => plan.items.find(i => i.id === id)!.claims[0];
  expect(claim('as-4').source).toBe('appCentral team note, 2026-10-27');
  expect(claim('as-5').source).toBe('AEO TPC slide 12 (28 Oct 2026)');
  expect(claim('is-1').source).toBe('AEO TPC slide 12 (28 Oct 2026)');
  // Unchanged rows stay verified; only the edited one is not yet verified.
  expect(claim('as-5').verification).toBe('verified');
  expect(claim('as-4').verification).toBe('not-yet-verified');
});
