import { buildPlan, type PlanData, type ProjectOverlay } from '@/lib/plan/engine';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import { AGENT_SNIPPET, oneLine, renderBuildPlan, toolsForMeta, type BuildPlanMeta } from '@/lib/export/build-plan-md';
import { key, makeEntry, makeProfile, makeTool, makeVersion } from '../helpers/factories';
import { loadSeed } from '../helpers/seed';

const GENERATED = '2026-10-27T09:00:00.000Z';

async function demo(toolIds = ['appcentral', 'dbaas', 'iga'], project?: ProjectOverlay): Promise<string> {
  const seed = await loadSeed();
  const data: PlanData = { profiles: seed.profiles, tools: seed.tools, versions: pairVersions(seed.toolVersions) };
  const input = selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds }, project);
  const meta: BuildPlanMeta = {
    title: 'Your app',
    appType: 'Low-risk app on the cloud',
    profileTitle: 'Low-Risk Cloud',
    tools: toolsForMeta(input, 'low-risk-cloud'),
    generatedAt: GENERATED,
  };
  return renderBuildPlan(buildPlan(input), meta);
}

test('the three sections, their counts and the platform groups', async () => {
  const md = await demo();
  expect(md).toContain('## 1. What you need to do (17)');
  expect(md).toContain('## 2. Ask a person first (3)');
  expect(md).toContain("## 3. Don't build this: your platform already does it (66)");
  expect(md).toContain('### appCentral\n');
  expect(md).toContain("### Doesn't apply on your platform\n");
  expect(md).toContain('Tools: appCentral v1 (verified), DBaaS v1 (not yet verified), IGA v1 (not yet verified).');
});

test('claims from tools that are not yet verified say so at the end of the line', async () => {
  const md = await demo();
  for (const id of ['dp-1', 'dp-2', 'dp-3', 'dp-4']) {
    const line = md.split('\n').find(l => l.includes(`(${id})`))!;
    expect(line.endsWith('(not yet verified)')).toBe(true);
  }
  const verified = md.split('\n').find(l => l.includes('(as-4)'))!;
  expect(verified).not.toContain('not yet verified');
});

test('Level 2 requirements are left out', async () => {
  const md = await demo();
  expect(md).not.toContain('(ck-1)');
  expect(md).not.toContain('(lm-19)');
});

test('the whole document for the demo case', async () => {
  expect(await demo()).toMatchSnapshot();
});

test('with the real seed, Zod is named in the plan only when picked', async () => {
  const without = await demo(['appcentral']);
  expect(without).not.toContain('Zod');
  const withZod = await demo(['appcentral', 'zod']);
  expect(withZod).toContain('Define a Zod schema for every input and parse it before use.');
  expect(withZod).toContain("Platform's part: Zod checks data against a schema you define.");
  expect(withZod).toContain('Tools: appCentral v1 (verified), Zod v1 (not yet verified).');
});

test('a library is named only when it was picked', () => {
  const profile = makeProfile('low-risk-cloud', [{ id: 'as-1' }]);
  const zod = makeTool('zod', { name: 'Zod', section: 'code', oscalType: 'software', isSample: true });
  const version = makeVersion('zod', 'low-risk-cloud', 1, [
    makeEntry('as-1', { value: 'shared', builderPart: 'Define a Zod schema for every input.', explanation: 'Zod validates data against a schema.' }),
  ]);
  const data: PlanData = { profiles: [profile], tools: [zod], versions: pairVersions([version]) };
  const render = (toolIds: string[]) => {
    const input = selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds });
    return renderBuildPlan(buildPlan(input), {
      title: 'Your app', appType: 'Low-risk app on the cloud', profileTitle: 'Low-Risk Cloud',
      tools: toolsForMeta(input, 'low-risk-cloud'), generatedAt: GENERATED,
    });
  };
  expect(render([])).not.toContain('Zod');
  const picked = render(['zod']);
  expect(picked).toContain('Define a Zod schema for every input.');
  expect(picked).toContain("Platform's part: Zod validates data against a schema.");
});

test('a note that looks like Markdown cannot make a heading, and the status is shown', async () => {
  const project: ProjectOverlay = {
    taskStatus: { [key('as-1')]: { status: 'done', note: '## Done\nsee PR 12' } },
    questionAnswers: {},
  };
  const md = await demo(['appcentral'], project);
  expect(md.split('\n').some(l => l.startsWith('## Done'))).toBe(false);
  const block = md.slice(md.indexOf('(as-1)'), md.indexOf('(as-2)'));
  expect(block).toContain('Status: Done');
  expect(block).toContain('Note: Done see PR 12');
});

test('oneLine collapses whitespace and strips leading # and > characters', () => {
  expect(oneLine('## Done\n\nsee   PR 12')).toBe('Done see PR 12');
  expect(oneLine('> quoted\ntext')).toBe('quoted text');
  expect(oneLine('  plain  ')).toBe('plain');
});

test('the AGENTS.md snippet matches the design', () => {
  expect(AGENT_SNIPPET).toBe(
    [
      '## Security build plan',
      'Read BUILD-PLAN.md before writing code. Treat section 1 as required work, ask me before building',
      'anything in section 2, and never build what section 3 lists; use the named platform instead.',
    ].join('\n'),
  );
});
