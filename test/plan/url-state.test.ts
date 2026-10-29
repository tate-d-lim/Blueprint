import { parsePlanQuery, planQuery } from '@/lib/plan/url-state';
import type { RiskAnswers } from '@/lib/risk/assess';

const demo: RiskAnswers = {
  classification: 'restricted',
  sensitivity: 'sensitive-normal',
  impact: 'slight',
  downstream: 'minimal',
  cii: false,
  sii: false,
};
const known = ['appcentral', 'dbaas', 'iga'];
const parse = (qs: string, tools = known) => parsePlanQuery(Object.fromEntries(new URLSearchParams(qs)), tools);

test('planQuery for the demo answers is the documented link', () => {
  expect(planQuery(demo, ['appcentral', 'dbaas', 'iga'])).toBe('c=restricted&s=sn&i=slight&d=min&k=&t=appcentral,dbaas,iga');
});

test('a round trip returns the same answers and tools', () => {
  const answers: RiskAnswers = { ...demo, classification: 'confidential-cloud-eligible', impact: 'moderate', sii: true, cii: true };
  const parsed = parse(planQuery(answers, ['iga', 'appcentral']));
  expect(parsed).toEqual({ answers, toolIds: ['iga', 'appcentral'], facts: {} });
});

test('an unknown classification code is rejected', () => {
  expect(parse('c=bogus&s=sn&i=slight&d=min&k=&t=appcentral')).toBeNull();
});

test('a missing required answer is rejected', () => {
  expect(parse('c=restricted&s=sn&d=min&k=&t=appcentral')).toBeNull();
});

test('a missing t means no tools picked', () => {
  expect(parse('c=restricted&s=sn&i=slight&d=min&k=')?.toolIds).toEqual([]);
});

test('unknown and repeated tool IDs are dropped', () => {
  const parsed = parse('c=restricted&s=sn&i=slight&d=min&k=&t=appcentral,nope,appcentral', ['appcentral', 'dbaas']);
  expect(parsed?.toolIds).toEqual(['appcentral']);
});

test('an unknown tick-box code is rejected', () => {
  expect(parse('c=restricted&s=sn&i=slight&d=min&k=cii,bogus&t=')).toBeNull();
});

test('a repeated parameter uses its first value', () => {
  const parsed = parsePlanQuery(
    { c: ['restricted', 'confidential'], s: 'sn', i: 'slight', d: 'min', k: '', t: '' },
    known,
  );
  expect(parsed?.answers.classification).toBe('restricted');
});

test('answers about the app travel in the link, and an old link without them still works', () => {
  const facts = { reach: 'public', sms: 'no' };
  expect(planQuery(demo, ['iga'], facts)).toBe('c=restricted&s=sn&i=slight&d=min&k=&t=iga&f=reach.public,sms.no');
  expect(parse(planQuery(demo, ['iga'], facts))?.facts).toEqual(facts);
  expect(planQuery(demo, ['iga'])).not.toContain('&f=');
  expect(parse('c=restricted&s=sn&i=slight&d=min&k=&t=iga')?.facts).toEqual({});
});
