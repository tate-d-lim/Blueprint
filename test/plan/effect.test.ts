import type { FactAnswers } from '@/lib/domain/types';
import { effectText, orderTools, tasksAdded, toolEffects } from '@/lib/plan/effect';
import { DEMO_FACTS, demoData, demoPlan } from '../helpers/demo';

async function effects(ticked: string[], facts: FactAnswers = DEMO_FACTS) {
  return toolEffects(await demoData(), { profileId: 'low-risk-cloud', facts }, ticked);
}

test('appCentral from nothing: does 51 controls and adds nothing, net 51', async () => {
  const e = (await effects([]))['appcentral'];
  expect(e).toEqual({ removed: { tasks: 51, questions: 0 }, added: { tasks: 0, questions: 0 }, unverified: 0, net: 51, noCoverage: false });
  expect(effectText(e, 'Low-Risk Cloud')).toBe('Does 51 controls');
});

test('DBaaS with appCentral ticked does 4 controls, all not yet verified', async () => {
  const e = (await effects(['appcentral']))['dbaas'];
  expect(e).toMatchObject({ removed: { tasks: 4, questions: 0 }, added: { tasks: 0, questions: 0 }, unverified: 4, net: 4 });
  expect(effectText(e, 'Low-Risk Cloud')).toBe('Does 4 controls (4 not yet verified)');
});

test('a ticked tool is measured against the plan without it', async () => {
  expect((await effects(['appcentral', 'dbaas']))['dbaas'].removed.tasks).toBe(4);
});

test('IGA after appCentral and DBaaS does 11 controls', async () => {
  expect((await effects(['appcentral', 'dbaas']))['iga']).toMatchObject({ removed: { tasks: 11, questions: 0 }, unverified: 11, net: 11 });
});

test('a tool with no coverage for the profile', async () => {
  const e = (await effects([]))['gencentral'];
  expect(e.noCoverage).toBe(true);
  expect(e.net).toBe(0);
  expect(effectText(e, 'Low-Risk Cloud')).toBe('No Low-Risk Cloud coverage yet');
});

test('genCentral is not net < 0 when the app uses GenAI', async () => {
  expect((await effects([], { ...DEMO_FACTS, 'uses-genai': 'yes' }))['gencentral'].net).toBeGreaterThanOrEqual(0);
});

test('net = removed − added, and the removed count matches the plan difference', async () => {
  const e = (await effects([]))['appcentral'];
  expect(e.removed.tasks + e.removed.questions).toBe((await demoPlan(['appcentral'], DEMO_FACTS)).counts.platform);
  expect(e.net).toBe(e.removed.tasks + e.removed.questions - e.added.tasks - e.added.questions);
});

test('order: more first by net, then verified, then name; tools with no effect are other', async () => {
  const data = await demoData();
  const fx = await effects([]);
  const { more, other } = orderTools(data.tools, fx, data.versions, 'low-risk-cloud');
  const nets = more.map(t => fx[t._id].net);
  expect(nets).toEqual([...nets].sort((a, b) => b - a));
  const ids = more.map(t => t._id);
  expect(ids.indexOf('iga')).toBeLessThan(ids.indexOf('dbaas'));
  expect(other.map(t => t._id)).toEqual(expect.arrayContaining(['gencentral', 'zod', 'prisma', 'ship-hats']));
});

test('tasksAdded counts tasks new in the second plan', async () => {
  expect(tasksAdded(await demoPlan(['appcentral', 'dbaas', 'iga'], DEMO_FACTS), await demoPlan([], DEMO_FACTS))).toBe(66);
});

describe('effectText', () => {
  const base = { added: { tasks: 0, questions: 0 }, unverified: 0, noCoverage: false };
  test('words for controls, questions, singulars and the not-yet-verified part', () => {
    expect(effectText({ ...base, removed: { tasks: 6, questions: 2 }, unverified: 4, net: 8 }, 'X')).toBe('Does 6 controls, answers 2 questions (4 not yet verified)');
    expect(effectText({ ...base, removed: { tasks: 1, questions: 1 }, net: 2 }, 'X')).toBe('Does 1 control, answers 1 question');
  });
  test('nothing to remove or add', () => {
    expect(effectText({ ...base, removed: { tasks: 0, questions: 0 }, net: 0 }, 'X')).toBe('Nothing for your app');
  });
  test('only additions say so (net below 0)', () => {
    expect(effectText({ ...base, removed: { tasks: 0, questions: 0 }, added: { tasks: 0, questions: 3 }, net: -3 }, 'X')).toBe('Adds 3 questions');
  });
});
