import { coverageStatus, statusLabel } from '@/lib/tool-owner/status';
import { approved, makeEntry, makeVersion } from '../helpers/factories';

const v = (...args: [ReturnType<typeof approved>?]) => makeVersion('t', 'p', 1, [makeEntry('as-1')], args[0]);

test('a tool with no version has no coverage yet', () => expect(statusLabel(coverageStatus(undefined))).toBe('No coverage yet'));

test('a version that an admin approved is verified, with the date', () => {
  const status = coverageStatus(v(approved()));
  expect(status).toEqual({ kind: 'verified', at: '2026-10-27T00:00:00.000Z' });
  expect(statusLabel(status)).toBe('Verified');
});

test('a version GovTech published says so', () => expect(statusLabel(coverageStatus(v(approved('govtech-published'))))).toBe('Published by GovTech'));

test('a version with no decision waits for approval', () => expect(statusLabel(coverageStatus(v()))).toBe('Waiting for approval'));

test('a version that was sent back says so, and not that it waits', () => {
  const sent = { ...v(), sentBack: { at: '2026-11-01T00:00:00.000Z', by: 'Admin', note: 'Fix it.' } };
  expect(coverageStatus(sent)).toEqual({ kind: 'sent-back', at: '2026-11-01T00:00:00.000Z' });
  expect(statusLabel(coverageStatus(sent))).toBe('Sent back');
});

test('rows to check show on an approved version only', () => {
  expect(statusLabel(coverageStatus(v(approved()), { rowsToCheck: 3 }))).toBe('3 rows to check');
  expect(statusLabel(coverageStatus(v(approved()), { rowsToCheck: 1 }))).toBe('1 row to check');
  expect(statusLabel(coverageStatus(v(), { rowsToCheck: 3 }))).toBe('Waiting for approval');
  expect(statusLabel(coverageStatus(v(approved()), { rowsToCheck: 0 }))).toBe('Verified');
});
