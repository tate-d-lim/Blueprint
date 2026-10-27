import { SAVE_FAILED, runSave } from '@/lib/plan/save';

test('a save that succeeds reports no error', async () => {
  expect(await runSave(async () => ({ ok: true }))).toBeNull();
});

test('a save the server refused reports the server’s message', async () => {
  expect(await runSave(async () => ({ ok: false, error: 'The database isn’t running.' }))).toBe('The database isn’t running.');
});

test('a save that throws (network down, action gone after a rebuild) reports a plain failure', async () => {
  expect(await runSave(async () => { throw new Error('Failed to find Server Action'); })).toBe(SAVE_FAILED);
});
