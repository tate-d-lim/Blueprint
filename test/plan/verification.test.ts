import { itemVerification, rowVerification, sameCoverage, versionVerification } from '@/lib/plan/verification';
import { approved, key, makeEntry, makeVersion, pair } from '../helpers/factories';

const A = key('as-4');

test('an unchanged row is verified', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-4')], approved());
  const v2 = makeVersion('t', 'p', 2, [makeEntry('as-4')]);
  expect(rowVerification(A, pair(v2, v1))).toBe('verified');
});

test('an edited explanation makes only that row not yet verified', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-4'), makeEntry('as-5')], approved());
  const v2 = makeVersion('t', 'p', 2, [makeEntry('as-4', { explanation: 'clarified' }), makeEntry('as-5')]);
  expect(rowVerification(A, pair(v2, v1))).toBe('not-yet-verified');
  expect(rowVerification(key('as-5'), pair(v2, v1))).toBe('verified');
});

test('a row added since approval is not yet verified', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-5')], approved());
  const v2 = makeVersion('t', 'p', 2, [makeEntry('as-5'), makeEntry('as-4')]);
  expect(rowVerification(A, pair(v2, v1))).toBe('not-yet-verified');
});

test('a tool that was never approved is not yet verified', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-4')]);
  expect(rowVerification(A, pair(v1))).toBe('not-yet-verified');
});

test('rows matching a GovTech-published approval are govtech-published', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-4')], approved('govtech-published'));
  expect(rowVerification(A, pair(v1, v1))).toBe('govtech-published');
});

test('when the current version is the approved one, its rows are verified', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-4')], approved());
  expect(rowVerification(A, pair(v1, v1))).toBe('verified');
});

test('an empty explanation equals a missing one', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-4')], approved());
  const v2 = makeVersion('t', 'p', 2, [makeEntry('as-4', { explanation: '', builderPart: '' })]);
  expect(rowVerification(A, pair(v2, v1))).toBe('verified');
  expect(sameCoverage(makeEntry('as-4'), makeEntry('as-4', { explanation: '' }))).toBe(true);
});

test('changing the value or the other tool breaks sameCoverage', () => {
  expect(sameCoverage(makeEntry('as-4'), makeEntry('as-4', { value: 'shared' }))).toBe(false);
  const a = makeEntry('dp-1', { value: 'other-tool', otherToolId: 'dbaas' });
  expect(sameCoverage(a, { ...a, otherToolId: 'iga' })).toBe(false);
  expect(sameCoverage(undefined, makeEntry('as-4'))).toBe(false);
});

test('versionVerification follows the current version’s approval', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-4')], approved());
  const v2 = makeVersion('t', 'p', 2, [makeEntry('as-4', { explanation: 'x' })]);
  expect(versionVerification(pair(v2, v1))).toBe('not-yet-verified');
  expect(versionVerification(pair(v1, v1))).toBe('verified');
  const g = makeVersion('t', 'p', 1, [], approved('govtech-published'));
  expect(versionVerification(pair(g, g))).toBe('govtech-published');
});

describe('itemVerification', () => {
  const claim = (verification: 'verified' | 'govtech-published' | 'not-yet-verified') => ({ verification });

  test('no decisive claims means nothing to badge', () => {
    expect(itemVerification({ decisive: [] })).toBeNull();
  });

  test('any not-yet-verified decisive claim makes the item not yet verified', () => {
    expect(itemVerification({ decisive: [claim('verified'), claim('not-yet-verified')] })).toBe('not-yet-verified');
  });

  test('all verified is verified; a GovTech-published claim alongside verified ones is published', () => {
    expect(itemVerification({ decisive: [claim('verified')] })).toBe('verified');
    expect(itemVerification({ decisive: [claim('verified'), claim('govtech-published')] })).toBe('govtech-published');
  });
});
