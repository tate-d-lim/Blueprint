import { suggestValue } from '@/lib/import/suggest';

test.each([
  ['Agency', undefined, 'app-builder'],
  ['  agency ', undefined, 'app-builder'],
  ['N/A', undefined, 'not-applicable'],
  ['N.A.', undefined, 'not-applicable'],
  ['Not applicable', undefined, 'not-applicable'],
  ['WebSG team and agency', 'For agencies to independently assess', 'shared'],
  ['Primarily WebSG team, can be both WebSG team and agency if agency were to conduct their own', 'Not applicable', 'provided'],
  ['For gowhere.gov.sg and web.gov.sg domain - WebSG team and agency\nFor custom domain - Agency', 'For agencies to independently assess', 'shared'],
  ['WOGAD or Techpass Team', undefined, 'provided'],
  ['Both Agency and Xtremax', undefined, 'shared'],
  ['Xtremax', undefined, 'provided'],
  ['Isomer team', 'Not Applicable', 'provided'],
  ['FormSG', 'Provided by FormSG', 'provided'],
] as const)('%j with agency inputs %j is suggested as %s', (owner, inputs, expected) => {
  expect(suggestValue(owner, inputs)).toBe(expected);
});

test('a blank owner has no suggestion, so the admin has to choose', () => {
  expect(suggestValue('', undefined)).toBeNull();
  expect(suggestValue('   ', 'Not applicable')).toBeNull();
});
