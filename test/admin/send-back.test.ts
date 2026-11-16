import { decisionOf, decisionsOf } from '@/lib/admin/decisions';
import { diffSummary, diffVersions } from '@/lib/admin/diff';
import { SendBackNoteError, StaleVersionError, assertCanDecide, cleanSendBackNote, DecidedVersionError } from '@/lib/data/repos/tool-versions';
import type { ToolVersion } from '@/lib/domain/types';
import { approved, makeEntry, makeVersion } from '../helpers/factories';

const back = (v: ToolVersion, at = '2026-11-01T00:00:00.000Z'): ToolVersion => ({ ...v, sentBack: { at, by: 'Admin', note: 'Fix it.' } });
const at = (v: ToolVersion, when: string): ToolVersion => (v.approval ? { ...v, approval: { ...v.approval, at: when } } : v);

describe('the note of a send back', () => {
  test('is trimmed', () => expect(cleanSendBackNote('  Fix row as-4.  ')).toBe('Fix row as-4.'));
  test('cannot be empty', () => {
    expect(() => cleanSendBackNote('   ')).toThrow(SendBackNoteError);
    expect(() => cleanSendBackNote('')).toThrow('Write what the tool owner should correct.');
  });
  test('can have 500 characters, and not 501', () => {
    expect(cleanSendBackNote('a'.repeat(500))).toHaveLength(500);
    expect(() => cleanSendBackNote('a'.repeat(501))).toThrow(SendBackNoteError);
  });
  test('counts the characters after the trim', () => expect(cleanSendBackNote(` ${'a'.repeat(500)} `)).toHaveLength(500));
});

describe('who can be decided', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-1')]);
  const v2 = makeVersion('t', 'p', 2, [makeEntry('as-1')]);

  test('the newest version that has no decision', () => expect(() => assertCanDecide(v2, v2)).not.toThrow());
  test('an older version is stale', () => expect(() => assertCanDecide(v1, v2)).toThrow(StaleVersionError));
  test('an approved version is refused', () => {
    expect(() => assertCanDecide({ ...v2, approval: approved() }, v2)).toThrow(DecidedVersionError);
    expect(() => assertCanDecide({ ...v2, approval: approved() }, v2)).toThrow('already approved');
  });
  test('a version that was sent back is refused', () => expect(() => assertCanDecide(back(v2), v2)).toThrow('already sent back'));
});

describe('the list of decisions', () => {
  const a = at(makeVersion('a', 'p', 1, [makeEntry('as-1')], approved()), '2026-11-02T00:00:00.000Z');
  const b = back(makeVersion('b', 'p', 1, [makeEntry('as-1')]), '2026-11-05T00:00:00.000Z');
  const c = makeVersion('c', 'p', 1, [makeEntry('as-1')]);
  const gov = makeVersion('g', 'p', 1, [makeEntry('as-1')], approved('govtech-published'));

  test('a decision is an approval or a send back, and not a GovTech publication', () => {
    expect(decisionOf(a)?.kind).toBe('approved');
    expect(decisionOf(b)).toMatchObject({ kind: 'sent-back', note: 'Fix it.' });
    expect(decisionOf(c)).toBeNull();
    expect(decisionOf(gov)).toBeNull();
  });
  test('newest first', () => expect(decisionsOf([a, b, c, gov]).map(d => d.version.toolId)).toEqual(['b', 'a']));
  test('only the last few', () => expect(decisionsOf([a, b], 1)).toHaveLength(1));
});

test('the size of a change reads in one line', () => {
  const before = makeVersion('t', 'p', 1, [makeEntry('as-1'), makeEntry('as-2'), makeEntry('as-3')], approved());
  const after = makeVersion('t', 'p', 2, [makeEntry('as-1'), makeEntry('as-2', { explanation: 'x' }), makeEntry('as-9'), makeEntry('as-8')]);
  expect(diffSummary(diffVersions(after, before))).toBe('2 added, 1 changed, 1 removed');
});
