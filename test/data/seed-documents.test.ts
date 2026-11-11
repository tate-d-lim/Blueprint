import { expandSeedProject, expandSeedVersion, type SeedProjectFile, type SeedVersionFile } from '@/lib/data/seed-documents';
import { buildPlan, type Plan, type PlanData } from '@/lib/plan/engine';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import { sspValues } from '@/lib/export/ssp-values';
import { SEED_NOW, loadSeed } from '../helpers/seed';

/** Only a person can answer these: no tool and no default decides them. */
const TRUE_QUESTION_IDS = ['is-11', 'is-14', 'is-15'];

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
  const count = (value: string) => v.entries.filter(e => e.value === value).length;
  // appCentral says only what it handles: no row points at another tool.
  expect([count('provided'), count('not-applicable'), count('app-builder')]).toEqual([42, 9, 11]);
  expect(v.entries).toHaveLength(62);
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

test('every must-or-should requirement is yours to build by default, except the 3 that only a person can answer', async () => {
  const profile = await lowRiskCloud();
  const asked = profile.entries.filter(e => e.level !== 2 && e.ifUncovered === 'ask').map(e => e.id);
  expect(asked.sort()).toEqual([...TRUE_QUESTION_IDS].sort());
});

test('tools: appCentral, DBaaS, IGA, genCentral, then sample libraries, the SHIP-HATS sample and the GovTech tools', async () => {
  const { tools, profiles, catalogs, requirements } = await loadSeed();
  expect(tools.map(t => t._id)).toEqual(['appcentral', 'dbaas', 'iga', 'gencentral', 'zod', 'prisma', 'ship-hats', 'websg', 'isomer']);
  expect(tools.find(t => t._id === 'gencentral')).toMatchObject({ isSample: true });
  expect(tools.some(t => 'activatesProfiles' in t)).toBe(false);
  expect(profiles.map(p => p._id)).toEqual(['low-risk-cloud', 'medium-risk-cloud', 'high-risk-cloud-cii', 'generative-ai']);
  expect(catalogs.map(c => c._id)).toEqual(['im8-reform', 'genai']);
  expect(requirements).toHaveLength(149 + 8);
});

test('Zod and Prisma are sample code components with one shared row each, not approved', async () => {
  const { tools, toolVersions } = await loadSeed();
  for (const [id, requirement] of [['zod', 'as-1'], ['prisma', 'as-2']] as const) {
    expect(tools.find(t => t._id === id)).toMatchObject({ section: 'code', oscalType: 'software', isSample: true });
    const v = toolVersions.find(v => v._id === `${id}:low-risk-cloud:v1`)!;
    expect(v.approval).toBeUndefined();
    expect(v.source).toBe('Sample, not confirmed by a CPFB team');
    expect(v.entries).toHaveLength(1);
    expect(v.entries[0]).toMatchObject({ key: `im8-reform:${requirement}`, value: 'shared' });
    expect(v.entries[0].builderPart).toBeTruthy();
  }
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

  test('9 of its 17 tasks are done and 8 are not', async () => {
    const { plan } = await samplePlan();
    const tasks = plan.items.filter(i => i.heading === 'you');
    const count = (s: string) => tasks.filter(i => (i.status as { status: string }).status === s).length;
    expect([tasks.length, count('done'), count('todo')]).toEqual([17, 9, 8]);
    expect(statusOf(plan, 'as-9')).toBe('todo');
    expect(statusOf(plan, 'cs-3')).toBe('todo');
  });

  test('exports as Y / Partial / N / N/A on the cells the demo shows', async () => {
    const { plan } = await samplePlan();
    const cell = (id: string) => sspValues(plan.items.find(i => i.id === id)!).implemented;
    expect([cell('as-1'), cell('as-9'), cell('cs-3'), cell('is-14'), cell('pm-3')]).toEqual(['Y', 'N', 'N', 'N/A', 'Y']);
  });

  test('a project that names an unknown requirement fails the seed with the file and ID', async () => {
    const seed = await loadSeed();
    const bad = { ...sampleFile, tasks: { 'zz-9': { status: 'done' as const } } };
    expect(() => expandSeedProject('projects.json', bad, seed.profiles, new Set(['appcentral']), SEED_NOW)).toThrow(/zz-9.*projects\.json/);
  });
});

describe('checks in the seed', () => {
  const entryOf = async (toolId: string, id: string) => {
    const seed = await loadSeed();
    const version = seed.toolVersions.find(v => v.toolId === toolId)!;
    return { seed, version, entry: version.entries.find(e => e.key === `im8-reform:${id}`) };
  };

  test('zod and prisma rows carry their sample check', async () => {
    expect((await entryOf('zod', 'as-1')).entry?.checks).toEqual([
      { id: 'zod-schema-on-every-route', kind: 'code-rule', description: 'Every route handler parses its input with a Zod schema before use.' },
    ]);
    expect((await entryOf('prisma', 'as-2')).entry?.checks).toEqual([
      { id: 'no-query-raw-unsafe', kind: 'code-rule', description: 'No call to $queryRawUnsafe or $executeRawUnsafe.' },
    ]);
  });

  test('ship-hats has five shared rows with pipeline checks and no approval', async () => {
    const { seed, version } = await entryOf('ship-hats', 'sc-5');
    expect(version.entries.map(e => e.key.split(':')[1]).sort()).toEqual(['sc-5', 'sc-7', 'sc-8', 'sd-4', 'sd-5']);
    for (const e of version.entries) {
      expect(e.value).toBe('shared');
      expect(e.checks?.length).toBeGreaterThanOrEqual(1);
      expect(e.checks?.every(c => c.kind === 'pipeline')).toBe(true);
      expect(e.explanation).toBeTruthy();
      expect(e.builderPart).toBeTruthy();
    }
    expect(new Set(version.entries.map(e => e.explanation)).size).toBe(5);
    expect(version.approval).toBeUndefined();
    expect(seed.tools.find(t => t._id === 'ship-hats')?.isSample).toBe(true);
  });
});

describe('plain text per profile', () => {
  const seedProfiles = async () => {
    const all = (await loadSeed()).profiles;
    const get = (id: string) => all.find(p => p._id === id)!;
    return { low: get('low-risk-cloud'), medium: get('medium-risk-cloud'), high: get('high-risk-cloud-cii') };
  };

  test('Low keeps its plain text and rules; Medium gets plain text only where the wording has no parameter and matches', async () => {
    const { low, medium } = await seedProfiles();
    expect(low.entries.every(e => e.plain)).toBe(true);
    expect(low.entries.some(e => e.plain?.appliesWhen)).toBe(true);
    const as1 = medium.entries.find(e => e.id === 'as-1')!;
    const as5 = medium.entries.find(e => e.id === 'as-5')!;
    expect(as1.plain?.task).toBeTruthy();
    expect(as5.plain).toBeUndefined();
    expect(medium.entries.filter(e => e.plain).length).toBe(92);
  });

  test('an appliesWhen rule never removes a requirement on a profile outside checkedFor', async () => {
    const { medium, high } = await seedProfiles();
    expect(medium.entries.some(e => e.plain?.appliesWhen)).toBe(false);
    expect(high.entries.some(e => e.plain?.appliesWhen)).toBe(false);
  });

  test('the High-only requirements have no plain text', async () => {
    const { high } = await seedProfiles();
    expect(high.entries.filter(e => ['hr', 'rs'].includes(e.family)).every(e => !e.plain)).toBe(true);
  });

  test('defaults for Low-Risk Cloud apply to every cloud profile that has the requirement', async () => {
    const { low, medium } = await seedProfiles();
    const ids = low.entries.filter(e => e.ifUncovered === 'app-builder').map(e => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(medium.entries.filter(e => e.ifUncovered === 'app-builder').map(e => e.id).sort()).toEqual([...ids].sort());
  });
});
