import type { FactAnswers } from '@/lib/domain/types';
import { factsToAsk } from '@/lib/plan/facts';
import { buildPlan } from '@/lib/plan/engine';
import { selectPlanInput, unansweredFacts } from '@/lib/plan/select';
import { demoData } from '../helpers/demo';

/** A small repeatable random source, so a failure can be run again. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Answers the way step 3 does: every question that is on screen gets an answer, and the rest are left out. */
function answerLikeStep3(profile: Parameters<typeof factsToAsk>[0], pick: () => number): FactAnswers {
  const answers: FactAnswers = {};
  for (let again = true; again; ) {
    again = false;
    for (const fact of factsToAsk(profile, answers)) {
      if (answers[fact.id] !== undefined) continue;
      const values = fact.kind === 'tick' ? ['yes', 'no'] : fact.options.map(o => o.value);
      answers[fact.id] = values[Math.floor(pick() * values.length)];
      again = true;
    }
  }
  return answers;
}

test('once step 3 is answered, no choice of tools leaves a question about whether a control applies', async () => {
  const data = await demoData();
  const low = data.profiles.find(p => p._id === 'low-risk-cloud')!;
  const genai = data.profiles.find(p => p._id === 'generative-ai')!;
  const screen = { facts: low.facts, entries: [...low.entries, ...genai.entries] };
  const tools = data.tools.map(t => t._id);
  const pick = random(7);

  for (let round = 0; round < 40; round++) {
    const facts = answerLikeStep3(screen, pick);
    // Every tool on its own, all together, and none.
    for (const toolIds of [[], tools, ...tools.map(t => [t])]) {
      const plan = buildPlan(selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds, facts }));
      const open = plan.items.filter(i => i.heading === 'questions').map(i => i.id);
      expect(open, `facts ${JSON.stringify(facts)} with tools ${toolIds}`).toEqual([]);
    }
  }
});

test('the questions that step 3 asks are enough for every requirement that depends on the app', async () => {
  const data = await demoData();
  const low = data.profiles.find(p => p._id === 'low-risk-cloud')!;
  const genai = data.profiles.find(p => p._id === 'generative-ai')!;
  // A requirement that no tool covers, and that needs an answer, must have a rule. Those with a default are the builder's.
  for (const profile of [low, genai]) {
    const askable = profile.entries.filter(e => e.level < 2 && e.ifUncovered !== 'app-builder');
    expect(askable.filter(e => !e.plain?.appliesWhen).map(e => `${profile._id}:${e.id}`)).toEqual([]);
  }
});

test('a project answered before the GenAI questions existed is told which questions it has left', async () => {
  const { profiles } = await demoData();
  const before = { reach: 'public', web: 'yes', signin: 'yes', sms: 'yes', domain: 'no', shortlinks: 'no', 'uses-genai': 'yes' };
  const left = (facts: FactAnswers) => unansweredFacts(profiles, 'low-risk-cloud', facts).map(f => f.id);
  expect(left(before)).toEqual(['genai-api', 'genai-selfhost', 'genai-uploads']);
  // A "yes" brings the questions that hang on it.
  expect(left({ ...before, 'genai-api': 'yes', 'genai-selfhost': 'yes' })).toEqual(['genai-overseas', 'genai-sg', 'genai-openweights', 'genai-uploads']);
  expect(left({ ...before, 'genai-api': 'no', 'genai-selfhost': 'no', 'genai-uploads': 'no' })).toEqual([]);
  // No generative AI, no GenAI questions.
  expect(left({ ...before, 'uses-genai': 'no' })).toEqual([]);
});
