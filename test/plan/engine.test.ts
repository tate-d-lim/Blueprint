import { buildPlan, type PlanData, type ProjectOverlay } from '@/lib/plan/engine';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import type { Approval, CoverageEntry, Profile } from '@/lib/domain/types';
import { approved, key, makeEntry, makeProfile, makeTool, makeVersion, pair } from '../helpers/factories';

interface ToolSpec {
  id: string;
  entries: CoverageEntry[];
  approval?: Approval;
}

/** Builds a plan from hand-made tools. `picked` defaults to every tool given. */
function planOf(profile: Profile, specs: ToolSpec[], opts: { picked?: string[]; project?: ProjectOverlay } = {}) {
  const tools = specs.map(s => makeTool(s.id, { name: s.id }));
  const versions = specs.map(s => {
    const v = makeVersion(s.id, profile._id, 1, s.entries, s.approval);
    return pair(v, s.approval ? v : undefined);
  });
  const picked = opts.picked ?? specs.map(s => s.id);
  return buildPlan({
    profiles: [profile],
    pickedTools: tools.filter(t => picked.includes(t._id)),
    allTools: tools,
    versions,
    project: opts.project,
  });
}

const item = (plan: ReturnType<typeof planOf>, id: string) => plan.items.find(i => i.id === id)!;
const oneReq = makeProfile('p', [{ id: 'as-1' }]);

test('items carry the profile’s rationale and recommendations for use as fallbacks', () => {
  const profile = makeProfile('p', [{ id: 'as-1', rationale: 'Because.', recommendations: 'Do this.' }]);
  const i = item(planOf(profile, []), 'as-1');
  expect([i.rationale, i.recommendations]).toEqual(['Because.', 'Do this.']);
});

test('Provided beats Shared beats App Builder, and every claim is kept', () => {
  const plan = planOf(oneReq, [
    { id: 'a', entries: [makeEntry('as-1', { value: 'provided' })] },
    { id: 'b', entries: [makeEntry('as-1', { value: 'shared', builderPart: 'part' })] },
    { id: 'c', entries: [makeEntry('as-1', { value: 'app-builder' })] },
  ]);
  const i = item(plan, 'as-1');
  expect([i.heading, i.placement]).toEqual(['platform', 'provided']);
  expect(i.decisive.map(c => c.toolId)).toEqual(['a']);
  expect(i.claims).toHaveLength(3);
  const sharedWins = planOf(oneReq, [
    { id: 'b', entries: [makeEntry('as-1', { value: 'shared' })] },
    { id: 'c', entries: [makeEntry('as-1', { value: 'app-builder' })] },
  ]);
  expect([item(sharedWins, 'as-1').heading, item(sharedWins, 'as-1').placement]).toEqual(['you', 'shared']);
  expect(item(sharedWins, 'as-1').decisive.map(c => c.toolId)).toEqual(['b']);
});

test('Not applicable plus Provided is a conflict, with both statements decisive', () => {
  const plan = planOf(oneReq, [
    { id: 'a', entries: [makeEntry('as-1', { value: 'not-applicable' })] },
    { id: 'b', entries: [makeEntry('as-1', { value: 'provided' })] },
  ]);
  const i = item(plan, 'as-1');
  expect([i.heading, i.placement]).toEqual(['questions', 'conflict']);
  expect(i.decisive.map(c => c.toolId).sort()).toEqual(['a', 'b']);
  expect(i.reason).toBe("Your tools disagree: a says this doesn't apply, but b covers it.");
});

test('Not applicable plus App Builder is also a conflict', () => {
  const plan = planOf(oneReq, [
    { id: 'a', entries: [makeEntry('as-1', { value: 'not-applicable' })] },
    { id: 'b', entries: [makeEntry('as-1', { value: 'app-builder' })] },
  ]);
  expect(item(plan, 'as-1').placement).toBe('conflict');
});

test('Not applicable alone sits under what your platform already does', () => {
  const plan = planOf(oneReq, [{ id: 'a', entries: [makeEntry('as-1', { value: 'not-applicable' })] }]);
  expect([item(plan, 'as-1').heading, item(plan, 'as-1').placement]).toEqual(['platform', 'not-applicable']);
});

const dp = makeProfile('p', [{ id: 'dp-1' }]);
const redirectToDbaas = makeEntry('dp-1', { value: 'other-tool', otherToolId: 'dbaas' });

test('a redirect to a picked tool is decided by that tool', () => {
  const plan = planOf(dp, [
    { id: 'appcentral', entries: [redirectToDbaas] },
    { id: 'dbaas', entries: [makeEntry('dp-1', { value: 'provided' })] },
  ]);
  const i = item(plan, 'dp-1');
  expect([i.heading, i.placement]).toEqual(['platform', 'provided']);
  expect(i.decisive.map(c => c.toolId)).toEqual(['dbaas']);
  expect(i.claims).toHaveLength(2);
});

test('a redirect to an unpicked tool becomes a question and a hint', () => {
  const plan = planOf(
    dp,
    [
      { id: 'appcentral', entries: [redirectToDbaas] },
      { id: 'dbaas', entries: [makeEntry('dp-1', { value: 'provided' })] },
    ],
    { picked: ['appcentral'] },
  );
  const i = item(plan, 'dp-1');
  expect([i.heading, i.placement]).toEqual(['questions', 'redirect']);
  expect(i.reason).toBe('appcentral expects dbaas to handle this. Are you using dbaas, or handling it yourself?');
  expect(plan.hints).toEqual([{ fromToolId: 'appcentral', suggestToolId: 'dbaas', count: 1 }]);
});

test('a redirect to a picked tool that has no row falls through to the default', () => {
  const asks = planOf(dp, [
    { id: 'appcentral', entries: [redirectToDbaas] },
    { id: 'dbaas', entries: [] },
  ]);
  expect(item(asks, 'dp-1').placement).toBe('open');
  const builderDefault = makeProfile('p', [{ id: 'dp-1', ifUncovered: 'app-builder' }]);
  const defaults = planOf(builderDefault, [
    { id: 'appcentral', entries: [redirectToDbaas] },
    { id: 'dbaas', entries: [] },
  ]);
  expect(item(defaults, 'dp-1').placement).toBe('default-builder');
});

test('no claims with an app-builder default is the builder’s job', () => {
  const profile = makeProfile('p', [{ id: 'as-1', ifUncovered: 'app-builder' }]);
  const i = item(planOf(profile, []), 'as-1');
  expect([i.heading, i.placement, i.reason]).toEqual(['you', 'default-builder', 'No tool you picked covers this.']);
});

test('no claims otherwise is a question', () => {
  const i = item(planOf(oneReq, []), 'as-1');
  expect([i.heading, i.placement, i.reason]).toEqual([
    'questions',
    'open',
    'Depends on your app, and no tool you picked covers it.',
  ]);
});

test('a Level 2 item goes under good-to-have and keeps its placement', () => {
  const profile = makeProfile('p', [{ id: 'lm-19', level: 2 }, { id: 'as-1' }]);
  const plan = planOf(profile, [{ id: 'a', entries: [makeEntry('lm-19'), makeEntry('as-1')] }]);
  expect([item(plan, 'lm-19').heading, item(plan, 'lm-19').placement]).toEqual(['good-to-have', 'provided']);
  expect(plan.counts).toEqual({ you: 0, platform: 1, questions: 0, 'good-to-have': 1 });
});

test('a project "Applies" answer turns a question into a task with its status', () => {
  const project: ProjectOverlay = {
    taskStatus: { [key('as-1')]: { status: 'in-progress', note: 'half way' } },
    questionAnswers: { [key('as-1')]: { applies: true, reason: '' } },
  };
  const i = item(planOf(oneReq, [], { project }), 'as-1');
  expect([i.heading, i.placement]).toEqual(['you', 'answered-applies']);
  expect(i.status).toEqual({ status: 'in-progress', note: 'half way' });
  const fresh: ProjectOverlay = { taskStatus: {}, questionAnswers: { [key('as-1')]: { applies: true, reason: '' } } };
  expect(item(planOf(oneReq, [], { project: fresh }), 'as-1').status).toEqual({ status: 'todo' });
});

test('a project "Doesn’t apply" answer keeps the item under questions, answered', () => {
  const project: ProjectOverlay = {
    taskStatus: {},
    questionAnswers: { [key('as-1')]: { applies: false, reason: 'No SMS in this app' } },
  };
  const i = item(planOf(oneReq, [], { project }), 'as-1');
  expect([i.heading, i.placement]).toEqual(['questions', 'answered-not-applicable']);
  expect(i.status).toEqual({ applies: false, reason: 'No SMS in this app' });
  expect(i.reason).toBe("You said this doesn't apply: No SMS in this app");
});

test('a status on a platform item is not attached', () => {
  const project: ProjectOverlay = { taskStatus: { [key('as-1')]: { status: 'done' } }, questionAnswers: {} };
  const i = item(planOf(oneReq, [{ id: 'a', entries: [makeEntry('as-1')] }], { project }), 'as-1');
  expect(i.status).toBeUndefined();
});

test('a picked tool with no version for the profile adds no claims and does not throw', () => {
  const tools = [makeTool('gencentral')];
  const plan = buildPlan({ profiles: [oneReq], pickedTools: tools, allTools: tools, versions: [] });
  expect(item(plan as ReturnType<typeof planOf>, 'as-1').claims).toEqual([]);
});

test('project statuses and answers for requirements outside the active profiles are ignored', () => {
  const project: ProjectOverlay = {
    taskStatus: { [key('zz-1')]: { status: 'done' } },
    questionAnswers: { [key('zz-2')]: { applies: false, reason: 'x' } },
  };
  const plan = planOf(oneReq, [], { project });
  expect(plan.items.map(i => i.id)).toEqual(['as-1']);
  expect(item(plan, 'as-1').placement).toBe('open');
});

test('every active requirement appears exactly once; duplicated profile entries are caught', () => {
  const profile = makeProfile('p', [{ id: 'as-1' }, { id: 'as-2' }, { id: 'lm-19', level: 2 }]);
  expect(planOf(profile, []).items.map(i => i.id)).toEqual(['as-1', 'as-2', 'lm-19']);
  const broken = makeProfile('p', [{ id: 'as-1' }, { id: 'as-1' }]);
  expect(() => planOf(broken, [])).toThrow(/as-1.*more than once/);
});

describe('selectPlanInput', () => {
  const lrc = makeProfile('low-risk-cloud', [{ id: 'as-1' }]);
  const genai = makeProfile('generative-ai', [{ id: 'ga-1' }], 'genai');
  const tools = [
    makeTool('appcentral'),
    makeTool('dbaas'),
    makeTool('gencentral', { activatesProfiles: ['generative-ai'] }),
  ];
  const versions = pairVersions([
    makeVersion('appcentral', 'low-risk-cloud', 1, [makeEntry('as-1')]),
    makeVersion('dbaas', 'low-risk-cloud', 1, []),
  ]);
  const data: PlanData = { profiles: [lrc, genai], tools, versions };

  test('drops unknown and duplicate tool IDs, in data order', () => {
    const input = selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds: ['dbaas', 'nope', 'appcentral', 'dbaas'] });
    expect(input.pickedTools.map(t => t._id)).toEqual(['appcentral', 'dbaas']);
    expect(input.versions.map(v => v.current.toolId).sort()).toEqual(['appcentral', 'dbaas']);
  });

  test('adds the GenAI profile when genCentral is picked', () => {
    const input = selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds: ['gencentral'] });
    expect(input.profiles.map(p => p._id)).toEqual(['low-risk-cloud', 'generative-ai']);
    const plain = selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds: ['appcentral'] });
    expect(plain.profiles.map(p => p._id)).toEqual(['low-risk-cloud']);
  });

  test('an unknown profile is an error', () => {
    expect(() => selectPlanInput(data, { profileId: 'nope', toolIds: [] })).toThrow(/nope/);
  });

  test('pairVersions: current is the highest version, lastApproved the highest approved', () => {
    const v1 = makeVersion('t', 'p', 1, [], approved());
    const v2 = makeVersion('t', 'p', 2, []);
    const [p1] = pairVersions([v2, v1]);
    expect([p1.current.version, p1.lastApproved?.version]).toEqual([2, 1]);
    const [p2] = pairVersions([v1]);
    expect(p2.lastApproved).toBe(p2.current);
  });
});
