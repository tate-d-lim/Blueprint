import { parsePlanQuery, parseStartQuery, planQuery, startQuery } from '@/lib/plan/url-state';
import { DEMO_ANSWERS, DEMO_FACTS } from '../helpers/demo';
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

describe('step links (steps 1–4)', () => {
  const fromQuery = (q: string) => parseStartQuery(Object.fromEntries(new URLSearchParams(q)));

  test('round trip with facts and project', () => {
    const q = startQuery(DEMO_ANSWERS, DEMO_FACTS, 'abc-123');
    expect(fromQuery(q)).toEqual({ answers: DEMO_ANSWERS, complete: DEMO_ANSWERS, facts: DEMO_FACTS, projectId: 'abc-123' });
  });

  test('a bad value is dropped and the rest stay', () => {
    const r = parseStartQuery({ c: 'bad', s: 'sn', i: 'slight', d: 'min', k: '' });
    expect(r.complete).toBeNull();
    expect(r.answers).toEqual({ sensitivity: 'sensitive-normal', impact: 'slight', downstream: 'minimal', cii: false, sii: false });
  });

  test('no query gives empty answers', () => expect(parseStartQuery({})).toEqual({ answers: {}, complete: null, facts: {}, projectId: null }));

  test('a project id with odd characters is ignored', () => expect(parseStartQuery({ project: '../x' }).projectId).toBeNull());

  test('startQuery carries no tools', () => expect(startQuery(DEMO_ANSWERS)).not.toMatch(/(^|&)t=/));

  test('partial answers write only what is known, and read back the same', () => {
    const q = startQuery({ classification: 'restricted', impact: 'slight' });
    expect(q).toBe('c=restricted&i=slight');
    expect(fromQuery(q).answers).toEqual({ classification: 'restricted', impact: 'slight' });
  });

  test('CII and SII ticks round trip', () => {
    const answers = { ...DEMO_ANSWERS, cii: true, sii: true };
    expect(fromQuery(startQuery(answers)).answers).toEqual(answers);
  });

  test('a repeated key takes the first value', () => {
    expect(parseStartQuery({ c: ['conf-ce', 'conf'] }).answers).toEqual({ classification: 'confidential-cloud-eligible' });
  });
});
