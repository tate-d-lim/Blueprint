import { comparable, sameWording } from '@/lib/catalog/comparable';

test('a local statement and the GovTech site compare equal when only the parameters are written differently', () => {
  const local =
    'Where SSO or passwordless is not supported, verify that [as-5_prm_3: default = Agency or Public User] passwords are at least [as-5_prm_1: default = 12] characters in length and [as-5_prm_2: default = include a number or special character].';
  const site = 'Where SSO or passwordless is not supported, verify that [as-5_prm_3] passwords are at least [as-5_prm_1] characters in length and [as-5_prm_2].';
  expect(sameWording(local, site)).toBe(true);
});

test('a session statement with default values equals the site wording', () => {
  const local = 'Require [as-11_prm_2: default = Agency and/or Public User] to re-authenticate after their session exceeds [as-11_prm_1: default = 720] hour(s) or terminate the session.';
  const site = 'Require [as-11_prm_2] to re-authenticate after their session exceeds [as-11_prm_1] hour(s) or terminate the session.';
  expect(comparable(local)).toBe(comparable(site));
});

test('the three ways to write a parameter compare equal', () => {
  const forms = ['use [ insert: param, ac-2_prm_1 ] here', 'use {{ insert: param, ac-2_prm_1 }} here', 'use [ac-2_prm_1: default = privileged] here', 'use [ac-2_prm_1] here'];
  expect(new Set(forms.map(comparable)).size).toBe(1);
});

test('links keep their text and lose the address and the new-tab remark', () => {
  const local = 'such as those described in NIST [SP 800-63b](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63B-4.pdf). The salt should be:';
  const site = 'such as those described in NIST SP 800-63b (opens in new tab). The salt should be:';
  expect(sameWording(local, site)).toBe(true);
});

test('a bullet list and its flattened lines compare equal', () => {
  const local = 'The salt should be:\n- Generated using a secure generator;\n- At least 32 bits long; and\n- Randomly generated for each account.';
  const site = 'The salt should be:\nGenerated using a secure generator;\nAt least 32 bits long; and\nRandomly generated for each account.';
  expect(sameWording(local, site)).toBe(true);
});

test('different words are different wording', () => {
  expect(sameWording('Require MFA for privileged accounts at login.', 'Require MFA for all accounts at login.')).toBe(false);
  expect(sameWording('at least [as-5_prm_1] characters', 'at least [as-5_prm_2] characters')).toBe(false);
});

test('a parameter with its value filled in is not a change of wording', () => {
  expect(sameWording('Require MFA for privileged accounts at login.', 'Require MFA for [ insert: param, ac-2_prm_1 ] accounts at login.')).toBe(true);
  expect(sameWording('Require MFA for [ac-2_prm_1] accounts at login.', 'Require MFA for privileged accounts at login.')).toBe(true);
  // The words around the parameter still count.
  expect(sameWording('Require MFA for privileged accounts at sign-in.', 'Require MFA for [ac-2_prm_1] accounts at login.')).toBe(false);
  expect(sameWording('Log management and audit events.', 'Log user account activities and system audit events to detect anomalous or unauthorised actions.')).toBe(false);
});
