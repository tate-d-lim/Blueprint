import type { Fact } from '@/lib/domain/types';
import { checkRule, factsToAsk, parseFactAnswers, ruleDecides, writeFactAnswers } from '@/lib/plan/facts';
import { makeProfile } from '../helpers/factories';

const reach: Fact = {
  id: 'reach',
  kind: 'choice',
  question: 'Who is your app for?',
  options: [
    { value: 'public', label: 'The public', reason: 'Your app is not for the public.' },
    { value: 'staff', label: 'Government staff only', reason: 'Your app is for government staff only.' },
  ],
};
const sms: Fact = {
  id: 'sms',
  kind: 'tick',
  label: 'It sends SMS text messages',
  noReason: "Your app doesn't send SMS text messages.",
  showIf: { fact: 'reach', is: 'public' },
};
const web: Fact = { id: 'web', kind: 'tick', label: 'People use it in a web browser', noReason: "Your app isn't used in a web browser." };
const facts = [reach, sms, web];

describe('checkRule', () => {
  test('a requirement with no rule always applies', () => {
    expect(checkRule(undefined, facts, {})).toEqual({ state: 'applies', confirmed: false });
  });

  test('a rule holds when the answer matches, and that confirms it', () => {
    expect(checkRule({ fact: 'web', is: 'yes' }, facts, { web: 'yes' })).toEqual({ state: 'applies', confirmed: true });
  });

  test('a rule fails with the reason written for the answer', () => {
    expect(checkRule({ fact: 'web', is: 'yes' }, facts, { web: 'no' })).toEqual({
      state: 'skipped',
      reason: "Your app isn't used in a web browser.",
    });
    expect(checkRule({ fact: 'reach', is: 'public' }, facts, { reach: 'staff' })).toEqual({
      state: 'skipped',
      reason: 'Your app is for government staff only.',
    });
  });

  test('an unanswered fact keeps the requirement, unconfirmed', () => {
    expect(checkRule({ fact: 'web', is: 'yes' }, facts, {})).toEqual({ state: 'applies', confirmed: false });
  });

  test('a fact that is not in the catalogue keeps the requirement', () => {
    expect(checkRule({ fact: 'gone', is: 'yes' }, facts, { gone: 'no' })).toEqual({ state: 'applies', confirmed: false });
  });

  test('"is" can list several answers', () => {
    expect(checkRule({ fact: 'reach', is: ['public', 'staff'] }, facts, { reach: 'staff' })).toEqual({ state: 'applies', confirmed: true });
  });

  test('all: one failing part skips it, and says why', () => {
    const rule = { all: [{ fact: 'web', is: 'yes' }, { fact: 'reach', is: 'public' }] };
    expect(checkRule(rule, facts, { web: 'yes', reach: 'staff' })).toEqual({ state: 'skipped', reason: 'Your app is for government staff only.' });
    expect(checkRule(rule, facts, { web: 'yes', reach: 'public' })).toEqual({ state: 'applies', confirmed: true });
  });

  test('all: an unanswered part does not skip it', () => {
    const rule = { all: [{ fact: 'web', is: 'yes' }, { fact: 'reach', is: 'public' }] };
    expect(checkRule(rule, facts, { web: 'yes' })).toEqual({ state: 'applies', confirmed: false });
  });

  test('any: skipped only when every part fails', () => {
    const rule = { any: [{ fact: 'web', is: 'yes' }, { fact: 'reach', is: 'public' }] };
    expect(checkRule(rule, facts, { web: 'no', reach: 'public' })).toEqual({ state: 'applies', confirmed: true });
    expect(checkRule(rule, facts, { web: 'no', reach: 'staff' })).toEqual({
      state: 'skipped',
      reason: "Your app isn't used in a web browser.",
    });
    expect(checkRule(rule, facts, { web: 'no' })).toEqual({ state: 'applies', confirmed: false });
  });

  test('a fact the person never saw counts as "no", so internal apps drop the SMS requirement', () => {
    expect(checkRule({ fact: 'sms', is: 'yes' }, facts, { reach: 'staff' })).toEqual({
      state: 'skipped',
      reason: "Your app doesn't send SMS text messages.",
    });
    expect(checkRule({ fact: 'sms', is: 'yes' }, facts, { reach: 'public', sms: 'yes' })).toEqual({ state: 'applies', confirmed: true });
  });

  test('a hidden fact stays unknown while the fact that hides it is unanswered', () => {
    expect(checkRule({ fact: 'sms', is: 'yes' }, facts, {})).toEqual({ state: 'applies', confirmed: false });
  });
});

describe('factsToAsk', () => {
  const profile = makeProfile('p', [
    { id: 'a-1', plain: { title: '', task: '', why: '', checkedFor: [], appliesWhen: { fact: 'web', is: 'yes' } } },
    { id: 'a-2', plain: { title: '', task: '', why: '', checkedFor: [], appliesWhen: { fact: 'web', is: 'yes' } } },
    { id: 'a-3', plain: { title: '', task: '', why: '', checkedFor: [], appliesWhen: { fact: 'sms', is: 'yes' } } },
    { id: 'a-4' },
  ]);
  profile.facts = [reach, sms, web, { id: 'unused', kind: 'tick', label: 'Nobody uses this', noReason: 'x' }];

  test('shows only the facts some rule uses, and the facts those need first', () => {
    expect(factsToAsk(profile, {}).map(f => f.id)).toEqual(['reach', 'web']);
  });

  test('a fact appears once its gate is answered the right way', () => {
    expect(factsToAsk(profile, { reach: 'public' }).map(f => f.id)).toEqual(['reach', 'sms', 'web']);
    expect(factsToAsk(profile, { reach: 'staff' }).map(f => f.id)).toEqual(['reach', 'web']);
  });

  test('a profile with no facts asks nothing', () => {
    expect(factsToAsk(makeProfile('q', [{ id: 'b-1' }]), {})).toEqual([]);
  });
});

test('ruleDecides lists the requirements whose rule uses a fact', () => {
  const profile = makeProfile('p', [
    { id: 'a-1', plain: { title: '', task: '', why: '', checkedFor: [], appliesWhen: { all: [{ fact: 'web', is: 'yes' }, { fact: 'reach', is: 'public' }] } } },
    { id: 'a-2', plain: { title: '', task: '', why: '', checkedFor: [], appliesWhen: { fact: 'sms', is: 'yes' } } },
    { id: 'a-3' },
  ]);
  expect(profile.entries.filter(e => ruleDecides(e.plain?.appliesWhen, 'reach')).map(e => e.id)).toEqual(['a-1']);
});

describe('fact answers in a link', () => {
  test('write then parse gives the same answers', () => {
    const answers = { reach: 'public', sms: 'no', web: 'yes' };
    expect(parseFactAnswers(writeFactAnswers(answers))).toEqual(answers);
  });

  test('nothing to write gives an empty string', () => {
    expect(writeFactAnswers({})).toBe('');
    expect(parseFactAnswers('')).toEqual({});
  });

  test('malformed parts are dropped', () => {
    expect(parseFactAnswers('web.yes,broken,,x.y.z,sms.no')).toEqual({ web: 'yes', sms: 'no' });
  });
});

describe('an always fact', () => {
  const genai: Fact = { id: 'uses-genai', kind: 'choice', always: true, question: 'Does your app use generative AI?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] };

  test('is asked even when no rule reads it', () => {
    const profile = { ...makeProfile('p', [{ id: 'as-1' }]), facts: [genai] };
    expect(factsToAsk(profile, {}).map(f => f.id)).toEqual(['uses-genai']);
  });

  test('a fact with no rule and no "always" is still left out', () => {
    const profile = { ...makeProfile('p', [{ id: 'as-1' }]), facts: [{ ...genai, always: undefined }] };
    expect(factsToAsk(profile, {})).toEqual([]);
  });
});
