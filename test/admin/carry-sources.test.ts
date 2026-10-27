import { carrySources, type DraftRow } from '@/lib/admin/new-version';
import { key, makeEntry, makeVersion } from '../helpers/factories';

const previous = {
  ...makeVersion('t', 'p', 1, [makeEntry('as-4'), makeEntry('as-5', { source: 'Own source' }), makeEntry('dp-1', { explanation: 'Old text' })]),
  source: 'Slide 12',
};
const row = (id: string, over: Partial<DraftRow> = {}): DraftRow => ({ key: key(id), value: 'provided', ...over });
const sourceOf = (rows: DraftRow[], id: string) => rows.find(r => r.key === key(id))?.source;

test('an untouched row keeps the source it was effectively given before', () => {
  const carried = carrySources([row('as-4'), row('as-5', { source: 'Own source' })], previous);
  expect(sourceOf(carried, 'as-4')).toBe('Slide 12');
  expect(sourceOf(carried, 'as-5')).toBe('Own source');
});

test('a row whose text changed takes the new version’s source, not the old one', () => {
  const carried = carrySources([row('as-4', { explanation: 'New text' }), row('as-5', { source: 'Own source', value: 'shared' })], previous);
  expect(sourceOf(carried, 'as-4')).toBeUndefined();
  expect(sourceOf(carried, 'as-5')).toBeUndefined();
});

test('a source the admin typed on a row is always kept', () => {
  const carried = carrySources([row('as-4', { explanation: 'New text', source: 'Team note' }), row('dp-1', { explanation: 'Old text', source: 'Another note' })], previous);
  expect(sourceOf(carried, 'as-4')).toBe('Team note');
  expect(sourceOf(carried, 'dp-1')).toBe('Another note');
});

test('blank and missing text count as the same, so a trailing space is not a change', () => {
  expect(sourceOf(carrySources([row('dp-1', { explanation: ' Old text ' })], previous), 'dp-1')).toBe('Slide 12');
});

test('new rows and rows with no value are left alone; with nothing before, everything is', () => {
  const rows = [row('as-9'), row('as-4', { value: '' })];
  expect(carrySources(rows, previous)).toEqual(rows);
  expect(carrySources([row('as-4')], undefined)).toEqual([row('as-4')]);
});
