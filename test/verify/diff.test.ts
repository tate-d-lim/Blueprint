import { diffVersions } from '@/lib/verify/diff';
import { approved, key, makeEntry, makeVersion } from '../helpers/factories';

test('one added, one changed and one removed row', () => {
  const before = makeVersion('t', 'p', 1, [makeEntry('as-1'), makeEntry('as-2'), makeEntry('as-3')], approved());
  const after = makeVersion('t', 'p', 2, [
    makeEntry('as-1'),
    makeEntry('as-2', { explanation: 'now explained' }),
    makeEntry('as-9', { value: 'app-builder' }),
  ]);
  const diff = diffVersions(after, before);
  expect(diff.added.map(e => e.key)).toEqual([key('as-9')]);
  expect(diff.removed.map(e => e.key)).toEqual([key('as-3')]);
  expect(diff.changed).toHaveLength(1);
  expect(diff.changed[0].before).toEqual(makeEntry('as-2'));
  expect(diff.changed[0].after.explanation).toBe('now explained');
});

test('a tool that was never approved lists every row as added', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-1'), makeEntry('as-2')]);
  const diff = diffVersions(v1);
  expect(diff.added).toHaveLength(2);
  expect(diff.changed).toEqual([]);
  expect(diff.removed).toEqual([]);
});

test('a version compared with itself has no differences', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-1')], approved());
  expect(diffVersions(v1, v1)).toEqual({ added: [], changed: [], removed: [] });
});

test('blank and missing text do not count as a change', () => {
  const before = makeVersion('t', 'p', 1, [makeEntry('as-1')], approved());
  const after = makeVersion('t', 'p', 2, [makeEntry('as-1', { explanation: '' })]);
  expect(diffVersions(after, before).changed).toEqual([]);
});
