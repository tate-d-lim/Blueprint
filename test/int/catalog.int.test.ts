import { applyRelease, NO_CHANGE_MESSAGE } from '@/lib/catalog/apply';
import { closeDb, getDb } from '@/lib/data/db';
import { savePlainText } from '@/lib/data/repos/catalog';
import { seedDatabase } from '@/lib/data/seed';
import type { IncomingEntry, IncomingRelease } from '@/lib/catalog/types';
import type { CatalogRelease, Profile } from '@/lib/domain/types';

beforeEach(async () => {
  await seedDatabase(await getDb());
});
afterAll(closeDb);

const profileOf = async (id = 'low-risk-cloud') => (await (await getDb()).collection('profiles').findOne({ _id: id as never })) as unknown as Profile;

const incomingOf = (p: Profile, edit: (entries: IncomingEntry[]) => void): IncomingRelease => {
  const entries: IncomingEntry[] = p.entries.map(e => ({ id: e.id, title: e.title, level: e.level, statement: e.statement, recommendations: e.recommendations, rationale: e.rationale, references: e.references }));
  edit(entries);
  return { source: { kind: 'upload', label: 'test.xlsx', sourceDate: '2026-12-01' }, profiles: [{ profileId: p._id, entries }], notes: [] };
};

test('a reseed leaves one seed release in the history and nothing pending', async () => {
  const db = await getDb();
  const releases = await db.collection('catalogReleases').find().toArray();
  expect(releases.map(r => r.source.kind)).toEqual(['seed']);
  expect(await db.collection('catalogPending').countDocuments()).toBe(0);
});

test('a release with no change is not applied', async () => {
  const db = await getDb();
  const before = await profileOf();
  const result = await applyRelease(db, incomingOf(before, () => {}), 'Admin');
  expect(result).toEqual({ applied: false, message: NO_CHANGE_MESSAGE });
  expect(await db.collection('catalogReleases').countDocuments()).toBe(1);
});

test('applying adds, removes and rewords, keeps plain text, and records one release', async () => {
  const db = await getDb();
  const before = await profileOf();
  const withPlain = before.entries.find(e => e.plain)!;
  const incoming = incomingOf(before, entries => {
    entries.splice(entries.findIndex(e => e.id === 'as-2'), 1);
    entries.find(e => e.id === withPlain.id)!.statement = 'A new statement.';
    entries.push({ id: 'as-99', title: 'New', level: 1, statement: 'Do it.', recommendations: '', rationale: '', references: '' });
  });
  const result = await applyRelease(db, incoming, 'Admin', '2026-12-01T00:00:00.000Z');
  expect(result.applied).toBe(true);
  const after = await profileOf();
  expect(after.entries.find(e => e.id === 'as-2')).toBeUndefined();
  expect(after.entries.find(e => e.id === withPlain.id)).toMatchObject({ statement: 'A new statement.', plain: withPlain.plain, ifUncovered: withPlain.ifUncovered });
  expect(after.entries.find(e => e.id === 'as-99')).toMatchObject({ key: 'im8-reform:as-99', ifUncovered: 'app-builder' });
  expect(after).toMatchObject({ release: '2026-12-01', sourceFile: 'test.xlsx' });
  const releases = (await db.collection('catalogReleases').find().sort({ appliedAt: -1 }).toArray()) as unknown as CatalogRelease[];
  expect(releases).toHaveLength(2);
  expect(releases[0].changes[0]).toMatchObject({ profileId: 'low-risk-cloud', removed: [{ id: 'as-2' }], added: [{ id: 'as-99' }], reworded: [{ id: withPlain.id }] });
  // The other profiles are untouched.
  expect((await profileOf('medium-risk-cloud')).sourceFile).toBe('im8-lite-catalog.xlsx');
});

test('saving plain text sets editedAt, keeps the rule and adds the profile to checkedFor', async () => {
  const db = await getDb();
  // A Low-Risk Cloud control with a rule, so the test proves that the rule stays.
  const before = await profileOf('low-risk-cloud');
  const entry = before.entries.find(e => e.plain?.appliesWhen)!;
  expect(entry).toBeDefined();
  await savePlainText(db, before._id, entry.id, { title: 'T', task: 'Do it.', why: 'Because.' }, '2026-12-02T00:00:00.000Z');
  const saved = (await profileOf('low-risk-cloud')).entries.find(e => e.id === entry.id)!;
  expect(saved.plain).toMatchObject({ title: 'T', task: 'Do it.', why: 'Because.', editedAt: '2026-12-02T00:00:00.000Z' });
  expect(saved.plain!.appliesWhen).toEqual(entry.plain!.appliesWhen);
  expect(saved.plain!.checkedFor).toContain('low-risk-cloud');
  await expect(savePlainText(db, before._id, entry.id, { title: '', task: 'x', why: 'y' })).rejects.toThrow(/Write a title/);
});
