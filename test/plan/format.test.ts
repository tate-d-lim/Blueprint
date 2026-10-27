import { resolveParameters } from '@/lib/plan/format';
import { loadSeed } from '../helpers/seed';

test('a parameter shows its default value', () => {
  expect(resolveParameters('Verify [as-5_prm_3: default = Agency or Public User] passwords are at least [as-5_prm_1: default = 12] characters.')).toBe(
    'Verify Agency or Public User passwords are at least 12 characters.',
  );
});

test('defaults may contain brackets-free punctuation and parentheses', () => {
  expect(resolveParameters('Enforce data residency of [dp-1_prm_2: default = classified (RESTRICTED and above)] data.')).toBe(
    'Enforce data residency of classified (RESTRICTED and above) data.',
  );
});

test('a parameter with no default is shown as a gap to fill', () => {
  expect(resolveParameters('Use approved formats (such as [ insert: param, ga-5_prm_1 ]) for models.')).toBe(
    'Use approved formats (such as (to be set by your organisation)) for models.',
  );
});

test('text with no parameters is unchanged', () => {
  expect(resolveParameters('Encrypt data at rest.')).toBe('Encrypt data at rest.');
});

test('no statement in either profile keeps a raw placeholder', async () => {
  const { profiles } = await loadSeed();
  for (const entry of profiles.flatMap(p => p.entries)) {
    expect(resolveParameters(entry.statement), entry.key).not.toMatch(/_prm_|default =|insert:/);
  }
});
