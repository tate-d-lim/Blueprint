import type { ToolVersion } from '@/lib/domain/types';
import { newestVersions, pairVersions } from '@/lib/plan/select';
import { approved, makeEntry, makeVersion } from '../helpers/factories';

const sentBack = (v: ToolVersion): ToolVersion => ({ ...v, sentBack: { at: '2026-11-01T00:00:00.000Z', by: 'Admin', note: 'Fix row 1.' } });

test('without any sent back version, the pair is the newest and the newest approved', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-1')], approved());
  const v2 = makeVersion('t', 'p', 2, [makeEntry('as-1')]);
  const [pair] = pairVersions([v1, v2]);
  expect(pair.current.version).toBe(2);
  expect(pair.lastApproved?.version).toBe(1);
});

test('a newest version that was sent back is not seen: builders keep the older approved one', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-1')], approved());
  const v2 = sentBack(makeVersion('t', 'p', 2, [makeEntry('as-1', { explanation: 'x' })]));
  const [pair] = pairVersions([v2, v1]);
  expect(pair.current.version).toBe(1);
  expect(pair.lastApproved?.version).toBe(1);
});

test('an older version that is not approved stands in when the newest was sent back', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-1')]);
  const v2 = sentBack(makeVersion('t', 'p', 2, [makeEntry('as-1')]));
  const [pair] = pairVersions([v1, v2]);
  expect(pair.current.version).toBe(1);
  expect(pair.lastApproved).toBeUndefined();
});

test('a tool whose only version was sent back has no pair', () => {
  const v1 = sentBack(makeVersion('t', 'p', 1, [makeEntry('as-1')]));
  expect(pairVersions([v1])).toEqual([]);
});

test('a version saved after one was sent back is the one builders see, and the sent back one is skipped', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-1')], approved());
  const v2 = sentBack(makeVersion('t', 'p', 2, [makeEntry('as-1')]));
  const v3 = makeVersion('t', 'p', 3, [makeEntry('as-1')]);
  const [pair] = pairVersions([v1, v2, v3]);
  expect(pair.current.version).toBe(3);
  expect(pair.lastApproved?.version).toBe(1);
});

test('each tool and profile has its own pair', () => {
  const a = makeVersion('t', 'p', 1, [makeEntry('as-1')]);
  const b = sentBack(makeVersion('u', 'p', 1, [makeEntry('as-1')]));
  const c = makeVersion('t', 'q', 1, [makeEntry('as-1')]);
  expect(pairVersions([a, b, c]).map(p => `${p.current.toolId}|${p.current.profileId}`).sort()).toEqual(['t|p', 't|q']);
});

test('the newest version in any state is still there for the tool owner', () => {
  const v1 = makeVersion('t', 'p', 1, [makeEntry('as-1')], approved());
  const v2 = sentBack(makeVersion('t', 'p', 2, [makeEntry('as-1')]));
  const only = newestVersions([v1, v2]);
  expect(only).toHaveLength(1);
  expect(only[0].version).toBe(2);
  expect(only[0].sentBack?.note).toBe('Fix row 1.');
});
