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

test('a tool that provides a control outranks a tool that says it does not apply, so the builder is not asked', () => {
  const plan = planOf(oneReq, [
    { id: 'a', entries: [makeEntry('as-1', { value: 'not-applicable' })] },
    { id: 'b', entries: [makeEntry('as-1', { value: 'provided' })] },
  ]);
  const i = item(plan, 'as-1');
  expect([i.heading, i.placement]).toEqual(['platform', 'provided']);
  expect(i.decisive.map(c => c.toolId)).toEqual(['b']);
  expect(i.claims.map(c => c.toolId).sort()).toEqual(['a', 'b']);
  expect(i.reason).toBe('Handled by b.');
});

test('a tool that leaves a part to the builder outranks a tool that says it does not apply', () => {
  for (const value of ['app-builder', 'shared'] as const) {
    const plan = planOf(oneReq, [
      { id: 'a', entries: [makeEntry('as-1', { value: 'not-applicable' })] },
      { id: 'b', entries: [makeEntry('as-1', { value })] },
    ]);
    expect([item(plan, 'as-1').heading, item(plan, 'as-1').placement]).toEqual(['you', value]);
  }
});

test('Not applicable alone sits under what your platform already does', () => {
  const plan = planOf(oneReq, [{ id: 'a', entries: [makeEntry('as-1', { value: 'not-applicable' })] }]);
  expect([item(plan, 'as-1').heading, item(plan, 'as-1').placement]).toEqual(['platform', 'not-applicable']);
});

test('a tool says only what it handles: a picked tool with no row for a requirement leaves it to the default', () => {
  const dp = makeProfile('p', [{ id: 'dp-1' }]);
  const asks = planOf(dp, [
    { id: 'appcentral', entries: [] },
    { id: 'dbaas', entries: [makeEntry('dp-1', { value: 'provided' })] },
  ], { picked: ['appcentral'] });
  expect(item(asks, 'dp-1').placement).toBe('open');
  const builderDefault = makeProfile('p', [{ id: 'dp-1', ifUncovered: 'app-builder' }]);
  const defaults = planOf(builderDefault, [
    { id: 'appcentral', entries: [] },
    { id: 'dbaas', entries: [makeEntry('dp-1', { value: 'provided' })] },
  ], { picked: ['appcentral'] });
  expect(item(defaults, 'dp-1').placement).toBe('default-builder');
  // Picking the tool that does handle it settles it.
  const both = planOf(dp, [
    { id: 'appcentral', entries: [] },
    { id: 'dbaas', entries: [makeEntry('dp-1', { value: 'provided' })] },
  ]);
  expect([item(both, 'dp-1').heading, item(both, 'dp-1').placement]).toEqual(['platform', 'provided']);
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
  expect(plan.counts).toEqual({ you: 0, platform: 1, questions: 0, skipped: 0, 'good-to-have': 1 });
});

test('a project "Applies" answer turns a question into a task with its status', () => {
  const project: ProjectOverlay = {
    taskStatus: { [key('as-1')]: { status: 'done', note: 'finished' } },
    questionAnswers: { [key('as-1')]: { applies: true, reason: '' } },
  };
  const i = item(planOf(oneReq, [], { project }), 'as-1');
  expect([i.heading, i.placement]).toEqual(['you', 'answered-applies']);
  expect(i.status).toEqual({ status: 'done', note: 'finished' });
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
  expect(i.reason).toBe("You said this does not apply: No SMS in this app");
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
    makeTool('gencentral'),
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

  test('adds the GenAI profile when the uses-genai fact is yes, whatever the tools', () => {
    const yes = selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds: [], facts: { 'uses-genai': 'yes' } });
    expect(yes.profiles.map(p => p._id)).toEqual(['low-risk-cloud', 'generative-ai']);
    for (const facts of [{ 'uses-genai': 'no' }, {}, undefined] as (Record<string, string> | undefined)[]) {
      const plain = selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds: ['gencentral'], facts });
      expect(plain.profiles.map(p => p._id)).toEqual(['low-risk-cloud']);
    }
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

describe('answers about the app', () => {
  const web = {
    id: 'web',
    kind: 'tick' as const,
    label: 'People use it in a web browser',
    noReason: "Your app isn't used in a web browser.",
  };
  const rule = { title: 'T', task: 't', why: 'w', checkedFor: ['p'], appliesWhen: { fact: 'web', is: 'yes' } };
  const profile = () => {
    const p = makeProfile('p', [{ id: 'as-3', plain: rule }, { id: 'as-1' }, { id: 'lm-6', plain: rule, level: 2 }]);
    p.facts = [web];
    return p;
  };
  const planWith = (answers: Record<string, string>, specs: ToolSpec[] = []) => {
    const tools = specs.map(s => makeTool(s.id, { name: s.id }));
    const versions = specs.map(s => pair(makeVersion(s.id, 'p', 1, s.entries)));
    return buildPlan({ profiles: [profile()], pickedTools: tools, allTools: tools, versions, factAnswers: answers });
  };

  test('a requirement the answers rule out is set aside with the reason, whatever a tool says', () => {
    const plan = planWith({ web: 'no' }, [{ id: 'a', entries: [makeEntry('as-3', { value: 'provided' })] }]);
    const i = item(plan, 'as-3');
    expect([i.heading, i.placement, i.reason]).toEqual(['skipped', 'not-for-app', "Your app isn't used in a web browser."]);
    expect(plan.counts.skipped).toBe(1);
  });

  test('the same requirement stays when the answer fits, or when nothing was answered', () => {
    expect(item(planWith({ web: 'yes' }), 'as-3').placement).not.toBe('not-for-app');
    expect(item(planWith({}), 'as-3').placement).not.toBe('not-for-app');
  });

  test('a question that the answers confirm becomes a task for the builder', () => {
    const plan = planWith({ web: 'yes' });
    // as-3 has no tool behind it and ifUncovered is "ask": without the answer it is a question.
    expect(item(planWith({}), 'as-3').placement).toBe('open');
    const i = item(plan, 'as-3');
    expect([i.heading, i.placement, i.reason]).toEqual(['you', 'default-builder', 'You said this applies to your app.']);
  });

  test('a requirement without a rule is never set aside', () => {
    expect(item(planWith({ web: 'no' }), 'as-1').heading).not.toBe('skipped');
  });

  test('good-to-have extras stay good-to-have', () => {
    expect(item(planWith({ web: 'no' }), 'lm-6').heading).toBe('good-to-have');
  });

  test('the counts cover every item once', () => {
    const plan = planWith({ web: 'no' });
    expect(Object.values(plan.counts).reduce((a, b) => a + b, 0)).toBe(plan.items.length);
  });
});

test('claims carry the row’s checks', () => {
  const checks = [{ id: 'c', kind: 'code-rule' as const, description: 'd' }];
  const plan = planOf(oneReq, [{ id: 'a', entries: [makeEntry('as-1', { value: 'shared', checks })] }]);
  expect(item(plan, 'as-1').claims[0].checks).toEqual(checks);
});

test('a project saved before "done or not done" may hold in-progress, and it reads as not done', () => {
  const project = {
    taskStatus: { [key('as-1')]: { status: 'in-progress', note: 'half way' } },
    questionAnswers: { [key('as-1')]: { applies: true, reason: '' } },
  } as unknown as ProjectOverlay;
  expect(item(planOf(oneReq, [], { project }), 'as-1').status).toEqual({ status: 'todo', note: 'half way' });
});
