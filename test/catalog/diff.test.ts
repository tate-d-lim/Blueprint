import { diffProfile } from '@/lib/catalog/diff';
import type { IncomingEntry, IncomingProfile } from '@/lib/catalog/types';
import { updatedEntries } from '@/lib/catalog/apply';
import { loadSeed } from '../helpers/seed';

async function low() {
  return structuredClone((await loadSeed()).profiles.find(p => p._id === 'low-risk-cloud')!);
}
const asIncoming = (p: Awaited<ReturnType<typeof low>>): IncomingEntry[] =>
  p.entries.map(e => ({ id: e.id, title: e.title, level: e.level, statement: e.statement, recommendations: e.recommendations, rationale: e.rationale, references: e.references }));

test('the same entries give no change', async () => {
  const p = await low();
  const d = diffProfile(p, { profileId: p._id, entries: asIncoming(p) });
  expect(d.changed).toBe(false);
});

test('added, removed, reworded and level changes are told apart; a new title alone is silent', async () => {
  const p = await low();
  const entries = asIncoming(p).filter(e => e.id !== 'as-2');
  entries.find(e => e.id === 'as-1')!.statement = 'Validate every input.';
  entries.find(e => e.id === 'as-3')!.level = 2;
  entries.find(e => e.id === 'as-4')!.title = 'Rate limiting';
  entries.push({ id: 'as-99', title: 'New one', level: 1, statement: 'Do the new thing.', recommendations: 'r', rationale: 'y', references: '' });
  const d = diffProfile(p, { profileId: p._id, entries });
  expect(d.changes.added).toEqual([{ id: 'as-99', title: 'New one' }]);
  expect(d.added[0].statement).toBe('Do the new thing.');
  expect(d.changes.removed.map(x => x.id)).toEqual(['as-2']);
  expect(d.changes.reworded.map(x => x.id)).toEqual(['as-1']);
  expect(d.reworded[0].before).not.toBe(d.reworded[0].after);
  expect(d.changes.levelChanged).toEqual([{ id: 'as-3', title: 'Output Sanitisation', from: 1, to: 2 }]);
  expect(d.retitled).toEqual([{ id: 'as-4', from: 'Authentication Mechanism Rate-Limiting', to: 'Rate limiting' }]);
});

test('a title change alone is not a change of the release', async () => {
  const p = await low();
  const entries = asIncoming(p);
  entries[0].title = 'Another title';
  expect(diffProfile(p, { profileId: p._id, entries }).changed).toBe(false);
});

test('a wording-only file ignores controls the profile does not hold and never changes a level', async () => {
  const p = await low();
  const entries: IncomingEntry[] = asIncoming(p).map(e => ({ ...e, level: undefined }));
  entries.push({ id: 'zz-1', title: 'Not here', statement: 'Other.', recommendations: '', rationale: '', references: '' });
  const incoming: IncomingProfile = { profileId: p._id, entries, wordingOnly: true };
  const d = diffProfile(p, incoming);
  expect(d.ignored).toEqual(['zz-1']);
  expect(d.changes.added).toEqual([]);
  expect(d.changed).toBe(false);
  expect(updatedEntries(p, incoming)).toHaveLength(p.entries.length);
});

test('an empty list is refused', async () => {
  const p = await low();
  expect(() => diffProfile(p, { profileId: p._id, entries: [] })).toThrow(/does not apply an empty list/);
});

test('applying keeps the local statement when only the form differs, and keeps plain text and defaults', async () => {
  const p = await low();
  const as5 = p.entries.find(e => e.id === 'as-5')!;
  as5.plain = { title: 't', task: 'k', why: 'w', checkedFor: [p._id] };
  as5.ifUncovered = 'app-builder';
  const entries = asIncoming(p);
  entries.find(e => e.id === 'as-5')!.statement = as5.statement.replace(/: default = [^\]]*/g, '');
  entries.find(e => e.id === 'as-1')!.statement = 'Validate every input.';
  entries.push({ id: 'as-99', title: 'New one', level: 1, statement: 'Do it.', recommendations: '', rationale: '', references: '' });
  const next = updatedEntries(p, { profileId: p._id, entries });
  const n5 = next.find(e => e.id === 'as-5')!;
  expect(n5.statement).toBe(as5.statement);
  expect(n5.plain).toEqual(as5.plain);
  expect(n5.ifUncovered).toBe('app-builder');
  expect(next.find(e => e.id === 'as-1')!.statement).toBe('Validate every input.');
  const added = next.find(e => e.id === 'as-99')!;
  expect(added).toMatchObject({ key: 'im8-reform:as-99', family: 'as', ifUncovered: 'app-builder' });
  expect(added.plain).toBeUndefined();
  expect(next.findIndex(e => e.id === 'as-99')).toBe(next.findLastIndex(e => e.family === 'as'));
});
