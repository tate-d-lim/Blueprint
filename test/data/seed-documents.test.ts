import { expandSeedVersion, type SeedVersionFile } from '@/lib/data/seed-documents';
import { SEED_NOW, loadSeed } from '../helpers/seed';

const DEFAULT_BUILDER_IDS = ['as-1', 'as-2', 'as-3', 'as-7', 'as-9', 'sc-4', 'sc-6', 'st-4', 'st-5', 'cs-3', 'cs-4'];

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

test('tools: appCentral, DBaaS, IGA and genCentral, which activates the GenAI profile', async () => {
  const { tools, profiles, catalogs, requirements } = await loadSeed();
  expect(tools.map(t => t._id)).toEqual(['appcentral', 'dbaas', 'iga', 'gencentral']);
  expect(tools.find(t => t._id === 'gencentral')).toMatchObject({ isSample: true, activatesProfiles: ['generative-ai'] });
  expect(profiles.map(p => p._id)).toEqual(['low-risk-cloud', 'generative-ai']);
  expect(catalogs.map(c => c._id)).toEqual(['im8-reform', 'genai']);
  expect(requirements).toHaveLength(149 + 8);
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
