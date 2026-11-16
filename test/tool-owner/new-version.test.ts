import { validateNewVersion, type DraftRow } from '@/lib/tool-owner/new-version';
import { key } from '../helpers/factories';

const row = (id: string, over: Partial<DraftRow> = {}): DraftRow => ({ key: key(id), value: 'provided', ...over });

test('a blank source is an error on the version', () => {
  expect(validateNewVersion([row('as-1')], '   ')).toEqual({
    ok: false,
    errors: [{ message: 'Add a source for this version.' }],
  });
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

test('every problem is reported, not just the first', () => {
  const result = validateNewVersion([row('dp-1', { value: '' }), row('dp-2', { value: '' })], '', { requireAll: true });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors).toHaveLength(3);
});

test('a version with no rows is allowed (a new tool)', () => {
  expect(validateNewVersion([], 'first draft')).toEqual({ ok: true, entries: [] });
});

test('with requireAll, a blank row is an error on that row', () => {
  expect(validateNewVersion([row('as-1', { value: '' }), row('as-2')], 's', { requireAll: true })).toEqual({
    ok: false,
    errors: [{ key: key('as-1'), message: 'Choose an answer for this control.' }],
  });
});

test('without requireAll, blank rows are still dropped', () => {
  expect(validateNewVersion([row('as-1', { value: '' }), row('as-2')], 's', {})).toEqual({
    ok: true,
    entries: [{ key: key('as-2'), value: 'provided' }],
  });
});

test('validateNewVersion copies a non-empty checks list to the entry', () => {
  const checks = [{ id: 'c', kind: 'pipeline' as const, description: 'd' }];
  const result = validateNewVersion([row('as-1', { checks }), row('as-2', { checks: [] })], 'src');
  expect(result.ok && result.entries[0].checks).toEqual(checks);
  expect(result.ok && 'checks' in result.entries[1]).toBe(false);
});
