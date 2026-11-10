import { buildPlan, type PlanData } from '@/lib/plan/engine';
import { PARTS, needsLine, partOf, partState, planTotals, runningLine, solidPieces, visibleParts, type PartId } from '@/lib/plan/hotel';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import { DEMO_FACTS, demoPlan } from '../helpers/demo';
import { makeEntry, makeProfile, makeTool, makeVersion } from '../helpers/factories';

const part = (id: PartId) => PARTS.find(p => p.id === id)!;
const pick = <T extends object, K extends keyof T>(o: T, keys: K[]) => Object.fromEntries(keys.map(k => [k, o[k]]));

test('every family code maps to a part, and an unknown code goes to Hotel rules', () => {
  for (const code of ['as', 'sc', 'st', 'ns', 'br', 'dp', 'lm', 'ac', 'cs', 'pm', 'is', 'sd', 'dc', 'tp', 'ck', 'ga', 'hr', 'rs'])
    expect(PARTS.some(p => (p.families as readonly string[]).includes(code)), code).toBe(true);
  expect(partOf('zz')).toBe('rules');
  expect(partOf('hr')).toBe('rules');
  expect(partOf('rs')).toBe('generator');
});

test('needs mode on the demo: 84 requirements in 11 parts, all Drawing', async () => {
  const plan = await demoPlan([], DEMO_FACTS);
  expect(needsLine(planTotals(plan))).toBe('This is everything your app needs: 84 requirements in 11 parts. Next, you choose the tools that meet part of it.');
  const cctv = partState(part('cctv'), plan, 'needs');
  expect(cctv).toMatchObject({ look: 'drawing', line1: 'CCTV · Logging', line2: '10 requirements' });
  expect(partState(part('deliveries'), plan, 'needs').line2).toBe('12 requirements');
  expect(partState(part('safe'), plan, 'needs').line1).toBe('Hotel safe · Data');
  expect(visibleParts(plan).map(p => partState(p, plan, 'needs').look)).toEqual(Array(11).fill('drawing'));
});

test('appCentral on the demo: looks and words per part', async () => {
  const plan = await demoPlan(['appcentral'], DEMO_FACTS);
  const s = (id: PartId) => partState(part(id), plan, 'tools');
  expect(s('cctv')).toMatchObject({ look: 'lit', line2: 'appCentral does all' });
  expect(s('walls')).toMatchObject({ look: 'partly', line2: '5 yours · appCentral does 6', solidPieces: 5 });
  expect(s('safe')).toMatchObject({ look: 'drawing', line2: '4 questions', question: true });
  expect(s('keycards')).toMatchObject({ look: 'drawing', line2: '11 questions', question: true });
  expect(s('rules')).toMatchObject({ look: 'drawing', line2: '6 yours', solidPieces: 0 });
  expect(s('frame')).toMatchObject({ look: 'partly', line2: '1 yours · appCentral does 9' });
});

test('a part done by tools with one claim not yet verified is Solid, not lit', async () => {
  const plan = await demoPlan(['appcentral', 'dbaas', 'iga'], DEMO_FACTS);
  expect(partState(part('safe'), plan, 'tools')).toMatchObject({ look: 'solid', line2: 'DBaaS does all · 4 not yet verified' });
});

test('the parts add up to the running line', async () => {
  for (const ids of [[], ['appcentral'], ['appcentral', 'dbaas'], ['appcentral', 'dbaas', 'iga']]) {
    const plan = await demoPlan(ids, DEMO_FACTS);
    const states = visibleParts(plan).map(p => partState(p, plan, 'tools'));
    const sum = (k: 'you' | 'platform' | 'questions' | 'unverified') => states.reduce((n, s) => n + s.counts[k], 0);
    expect({ you: sum('you'), platform: sum('platform'), questions: sum('questions'), unverified: sum('unverified') }).toEqual(
      pick(planTotals(plan), ['you', 'platform', 'questions', 'unverified']),
    );
  }
  expect(runningLine(planTotals(await demoPlan(['appcentral', 'dbaas', 'iga'], DEMO_FACTS)))).toBe('18 are yours · 66 your tools do (15 not yet verified) · 0 questions');
});

test('the demo counts match the seed table', async () => {
  const t = async (ids: string[]) => pick(planTotals(await demoPlan(ids, DEMO_FACTS)), ['you', 'platform', 'questions', 'unverified']);
  expect(await t([])).toEqual({ you: 84, platform: 0, questions: 0, unverified: 0 });
  expect(await t(['appcentral'])).toEqual({ you: 18, platform: 51, questions: 15, unverified: 0 });
  expect(await t(['appcentral', 'dbaas'])).toEqual({ you: 18, platform: 55, questions: 11, unverified: 4 });
  expect(await t(['appcentral', 'dbaas', 'iga'])).toEqual({ you: 18, platform: 66, questions: 0, unverified: 15 });
});

test('runningLine leaves the parenthesis out at 0, and says "1 question"', () => {
  expect(runningLine({ you: 3, platform: 2, unverified: 0, questions: 1, parts: 4 })).toBe('3 are yours · 2 your tools do · 1 question');
});

test('solid pieces follow the share, with at least one of each when partly done', () => {
  expect([solidPieces(0, 8), solidPieces(0.01, 8), solidPieces(0.5, 8), solidPieces(0.99, 8), solidPieces(1, 8)]).toEqual([0, 1, 4, 7, 8]);
});

test('the assistant shows only with uses-genai yes', async () => {
  const plan = await demoPlan([], DEMO_FACTS);
  expect(visibleParts(plan).map(p => p.id)).not.toContain('assistant');
  expect(visibleParts(await demoPlan([], { ...DEMO_FACTS, 'uses-genai': 'yes' })).map(p => p.id)).toContain('assistant');
});

test('a done task raises the share in progress mode', async () => {
  const plain = await demoPlan(['appcentral'], DEMO_FACTS);
  const withDone = await demoPlan(['appcentral'], DEMO_FACTS, { taskStatus: { 'im8-reform:pm-1': { status: 'done' } }, questionAnswers: {} });
  expect(partState(part('rules'), withDone, 'progress').share).toBeGreaterThan(partState(part('rules'), plain, 'progress').share);
  expect(partState(part('rules'), withDone, 'tools').share).toBe(partState(part('rules'), plain, 'tools').share);
});

describe('on a small fake profile', () => {
  const profile = makeProfile('p', [{ id: 'as-1' }, { id: 'dc-1', level: 2 }]);
  const data: PlanData = {
    profiles: [profile],
    tools: [makeTool('x')],
    versions: pairVersions([makeVersion('x', 'other', 1, [makeEntry('as-1')])]),
  };
  const planWith = (toolIds: string[]) => buildPlan(selectPlanInput(data, { profileId: 'p', toolIds }));

  test('a part with only good-to-have items stays and says "Nothing for your app"', () => {
    const plan = planWith([]);
    const frame = partState(part('frame'), plan, 'tools');
    expect(frame).toMatchObject({ nothingForApp: true, look: 'drawing', line2: 'Nothing for your app', line1: 'Foundation and frame · Infrastructure' });
    expect(planTotals(plan).parts).toBe(1);
  });

  test('a tool with no coverage for the profile leaves every part Drawing', () => {
    const plan = planWith(['x']);
    expect(visibleParts(plan).map(p => partState(p, plan, 'tools').look)).toEqual(Array(visibleParts(plan).length).fill('drawing'));
  });
});
