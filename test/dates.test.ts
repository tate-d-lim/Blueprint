import { dayOf, stampOf } from '@/lib/dates';

test('a time in the database shows as a Singapore date', () => {
  expect(dayOf('2026-11-16T03:12:00.000Z')).toBe('2026-11-16');
  // 17:05 UTC is 01:05 the next day in Singapore.
  expect(dayOf('2026-11-16T17:05:00.000Z')).toBe('2026-11-17');
  expect(stampOf('2026-11-16T17:05:00.000Z')).toBe('2026-11-17 01:05 SGT');
});

test('a date with no time stays the same day, and text that is not a date stays as it is', () => {
  expect(dayOf('2026-11-10')).toBe('2026-11-10');
  expect(stampOf('x')).toBe('x');
});
