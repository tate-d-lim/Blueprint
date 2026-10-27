import { expandSeedProject, expandSeedVersion, type SeedProjectFile, type SeedVersionFile } from '@/lib/data/seed-documents';
import { buildPlan, type Plan, type PlanData } from '@/lib/plan/engine';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import { sspValues } from '@/lib/export/ssp-values';
import { SEED_NOW, loadSeed } from '../helpers/seed';

const DEFAULT_BUILDER_IDS = ['as-1', 'as-2', 'as-3', 'as-7', 'as-9', 'sc-4', 'sc-6', 'st-4', 'st-5', 'cs-3', 'cs-4'];

const sampleFile: SeedProjectFile = {
  _id: 'p',
  name: 'P',
  ownerName: 'O',
  profileId: 'low-risk-cloud',
  riskAnswers: { classification: 'restricted', sensitivity: 'sensitive-normal', impact: 'slight', downstream: 'minimal', cii: false, sii: false },
  toolIds: ['appcentral'],
  tasks: {},
  answers: {},
};

const minimal: SeedVersionFile = {
  toolId: 'appcentral',
  profileId: 'low-risk-cloud',
  version: 1,
  source: 'test',
  writtenAgainst: 'test',
  groups: [],
};

async function lowRiskCloud() {
  const seed = await loadSeed();
  return seed.profiles.find(p => p._id === 'low-risk-cloud')!;
}

test('appCentral v1 follows slide 12', async () => {
  const v = (await loadSeed()).toolVersions.find(v => v._id === 'appcentral:low-risk-cloud:v1')!;
  const count = (value: string, other?: string) =>
    v.entries.filter(e => e.value === value && e.otherToolId === other).length;
  expect([
    count('provided'),
    count('not-applicable'),
    count('app-builder'),
    count('other-tool', 'dbaas'),
    count('other-tool', 'iga'),
  ]).toEqual([42, 9, 11, 4, 11]);
  expect(v.approval?.kind).toBe('verifier');
  expect(v.source).toBe('AEO TPC slide 12 (28 Oct 2026)');
});

test('DBaaS (4) and IGA (11) are seeded, not approved', async () => {
  const { toolVersions } = await loadSeed();
  const dbaas = toolVersions.find(v => v._id === 'dbaas:low-risk-cloud:v1')!;
  const iga = toolVersions.find(v => v._id === 'iga:low-risk-cloud:v1')!;
  expect([dbaas.entries.length, iga.entries.length]).toEqual([4, 11]);
  expect(dbaas.entries.every(e => e.value === 'provided')).toBe(true);
  expect(dbaas.approval).toBeUndefined();
  expect(iga.approval).toBeUndefined();
  // The Mongo driver stores an explicit undefined as null, so the key must be absent.
  expect(Object.hasOwn(dbaas, 'approval')).toBe(false);
});

test('exactly the 11 defaults are app-builder', async () => {
  const profile = await lowRiskCloud();
  const builderIds = profile.entries.filter(e => e.ifUncovered === 'app-builder').map(e => e.id);
  expect(builderIds.sort()).toEqual([...DEFAULT_BUILDER_IDS].sort());
});

test('tools: appCentral, DBaaS, IGA, genCentral (which activates the GenAI profile), then the GovTech tools', async () => {
  const { tools, profiles, catalogs, requirements } = await loadSeed();
  expect(tools.map(t => t._id)).toEqual(['appcentral', 'dbaas', 'iga', 'gencentral', 'websg', 'isomer']);
  expect(tools.find(t => t._id === 'gencentral')).toMatchObject({ isSample: true, activatesProfiles: ['generative-ai'] });
  expect(profiles.map(p => p._id)).toEqual(['low-risk-cloud', 'generative-ai']);
  expect(catalogs.map(c => c._id)).toEqual(['im8-reform', 'genai']);
  expect(requirements).toHaveLength(149 + 8);
});

test('WebSG and Isomer are seeded from their published guides, approved as GovTech-published', async () => {
  const { tools, toolVersions } = await loadSeed();
  for (const [id, counts, source, against] of [
    ['websg', [99, 14, 4, 0], 'WebSG Component Guide, Low-Risk Cloud (published 2026-07-28)', '2026-07-28'],
    ['isomer', [99, 15, 3, 0], 'Isomer Component Guide, Low-Risk Cloud (baseline 2025-09-17, file dated 6 Oct 2025)', '2025-09-17'],
  ] as const) {
    expect(tools.find(t => t._id === id)).toMatchObject({ section: 'wog', isSample: false });
    const v = toolVersions.find(v => v._id === `${id}:low-risk-cloud:v1`)!;
    const count = (value: string) => v.entries.filter(e => e.value === value).length;
    expect([count('provided'), count('app-builder'), count('shared'), count('not-applicable')]).toEqual(counts);
    expect(v.source).toBe(source);
    expect(v.writtenAgainst).toContain(against);
    expect(v.approval).toMatchObject({ kind: 'govtech-published', by: 'GovTech (published Component Guide)' });
    expect(v.importedFrom?.missingKeys).toEqual(['im8-reform:is-15']);
  }
});

test('unknown requirement ID fails with file and ID', async () => {
  const profile = await lowRiskCloud();
  const seed: SeedVersionFile = { ...minimal, groups: [{ ids: ['zz-9'], value: 'provided' }] };
  expect(() => expandSeedVersion('bad.json', seed, profile, new Set(['appcentral']), SEED_NOW)).toThrow(/zz-9.*bad\.json/);
});

test('other-tool pointing at an unknown tool fails', async () => {
  const profile = await lowRiskCloud();
  const seed: SeedVersionFile = { ...minimal, groups: [{ ids: ['dp-1'], value: 'other-tool', otherToolId: 'nope' }] };
  expect(() => expandSeedVersion('bad.json', seed, profile, new Set(['appcentral']), SEED_NOW)).toThrow(/nope/);
});

test('a requirement listed twice in one version fails', async () => {
  const profile = await lowRiskCloud();
  const seed: SeedVersionFile = {
    ...minimal,
    groups: [
      { ids: ['as-1'], value: 'provided' },
      { ids: ['as-1'], value: 'app-builder' },
    ],
  };
  expect(() => expandSeedVersion('bad.json', seed, profile, new Set(['appcentral']), SEED_NOW)).toThrow(/as-1.*twice/);
});

describe('the "two weeks in" sample project', () => {
  async function samplePlan() {
    const seed = await loadSeed();
    const project = seed.projects[0];
    const data: PlanData = { profiles: seed.profiles, tools: seed.tools, versions: pairVersions(seed.toolVersions) };
    const plan = buildPlan(selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds: project.toolIds }, project));
    return { project, plan };
  }
  const statusOf = (plan: Plan, id: string) => (plan.items.find(i => i.id === id)!.status as { status: string }).status;

  test('is seeded once, with the demo answers and tools', async () => {
    const { projects } = await loadSeed();
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      _id: 'sample-two-weeks-in',
      name: 'Sample project (two weeks in)',
      ownerName: 'Sample builder',
      toolIds: ['appcentral', 'dbaas', 'iga'],
      riskAnswers: { classification: 'restricted', sensitivity: 'sensitive-normal', impact: 'slight', downstream: 'minimal', cii: false, sii: false },
    });
  });

  test('9 of its 17 tasks are done, 2 are in progress and 6 are to do', async () => {
    const { plan } = await samplePlan();
    const tasks = plan.items.filter(i => i.heading === 'you');
    const count = (s: string) => tasks.filter(i => (i.status as { status: string }).status === s).length;
    expect([tasks.length, count('done'), count('in-progress'), count('todo')]).toEqual([17, 9, 2, 6]);
    expect(statusOf(plan, 'as-9')).toBe('in-progress');
    expect(statusOf(plan, 'cs-3')).toBe('todo');
  });

  test('exports as Y / Partial / N / N/A on the cells the demo shows', async () => {
    const { plan } = await samplePlan();
    const cell = (id: string) => sspValues(plan.items.find(i => i.id === id)!).implemented;
    expect([cell('as-1'), cell('as-9'), cell('cs-3'), cell('is-14'), cell('pm-3')]).toEqual(['Y', 'Partial', 'N', 'N/A', 'Y']);
  });

  test('a project that names an unknown requirement fails the seed with the file and ID', async () => {
    const seed = await loadSeed();
    const bad = { ...sampleFile, tasks: { 'zz-9': { status: 'done' as const } } };
    expect(() => expandSeedProject('projects.json', bad, seed.profiles, new Set(['appcentral']), SEED_NOW)).toThrow(/zz-9.*projects\.json/);
  });
});
