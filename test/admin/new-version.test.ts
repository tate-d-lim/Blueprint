import { validateNewVersion, type DraftRow } from '@/lib/admin/new-version';
import { key } from '../helpers/factories';

const row = (id: string, over: Partial<DraftRow> = {}): DraftRow => ({ key: key(id), value: 'provided', ...over });

test('a blank source is an error on the version', () => {
  expect(validateNewVersion([row('as-1')], '   ')).toEqual({
    ok: false,
    errors: [{ message: 'Add a source for this version.' }],
  });
});

test('"Handled by another tool" without a tool is an error on that row', () => {
  const result = validateNewVersion([row('dp-1', { value: 'other-tool' })], 'slide 12');
  expect(result).toEqual({ ok: false, errors: [{ key: key('dp-1'), message: 'Pick which tool handles this.' }] });
});

test('rows with no value are dropped and strings are trimmed', () => {
  const result = validateNewVersion(
    [
      row('as-1', { value: '' }),
      row('as-2', { value: 'shared', explanation: '  Does X.  ', builderPart: ' You do Y. ', source: '  ' }),
    ],
    ' slide 12 ',
  );
  expect(result).toEqual({
    ok: true,
    entries: [{ key: key('as-2'), value: 'shared', explanation: 'Does X.', builderPart: 'You do Y.' }],
  });
});

test('a tool is kept only for "Handled by another tool" rows', () => {
  const result = validateNewVersion(
    [row('dp-1', { value: 'other-tool', otherToolId: 'dbaas' }), row('as-4', { value: 'provided', otherToolId: 'dbaas' })],
    'slide 12',
  );
  expect(result).toEqual({
    ok: true,
    entries: [
      { key: key('dp-1'), value: 'other-tool', otherToolId: 'dbaas' },
      { key: key('as-4'), value: 'provided' },
    ],
  });
});

test('every problem is reported, not just the first', () => {
  const result = validateNewVersion([row('dp-1', { value: 'other-tool' }), row('dp-2', { value: 'other-tool' })], '');
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors).toHaveLength(3);
});

test('a version with no rows is allowed (a new tool)', () => {
  expect(validateNewVersion([], 'first draft')).toEqual({ ok: true, entries: [] });
});
