import { loadIm8Catalog, loadLowRiskCloudProfile, loadGenAi, UnknownRequirementError } from '@/lib/data/load-sources';
import { cellText, readSheet } from '@/lib/data/xlsx';
import type { Requirement, RequirementKey } from '@/lib/domain/types';

const DATA = 'data';

async function im8Map(): Promise<Map<RequirementKey, Requirement>> {
  const { requirements } = await loadIm8Catalog(DATA);
  return new Map(requirements.map(r => [r._id, r]));
}

test('IM8 catalog: 149 requirements, keys and family titles from the JSON', async () => {
  const { catalog, requirements } = await loadIm8Catalog(DATA);
  expect(requirements).toHaveLength(149);
  expect(requirements.find(r => r.id === 'as-1')?._id).toBe('im8-reform:as-1');
  expect(catalog.familyTitles.as).toBe('Application Security');
  expect(catalog.familyTitles.ck).toBe('Cryptography, Encryption and Key Management');
});

test('Low-Risk Cloud: 118 entries, levels 13/73/32, version label, all default to ask', async () => {
  const profile = await loadLowRiskCloudProfile(DATA, await im8Map());
  expect(profile.entries).toHaveLength(118);
  const byLevel = (n: number) => profile.entries.filter(e => e.level === n).length;
  expect([byLevel(0), byLevel(1), byLevel(2)]).toEqual([13, 73, 32]);
  expect(profile.version).toBe('2026-10-22 (local copy)');
  expect(profile._id).toBe('low-risk-cloud');
  expect(profile.plainTitle).toBe('Low-risk app on the cloud');
  expect(profile.entries.every(e => e.ifUncovered === 'ask')).toBe(true);
});

test('profile wording wins over catalog wording', async () => {
  const map = await im8Map();
  const profile = await loadLowRiskCloudProfile(DATA, map);
  const sheet = await readSheet(`${DATA}/source/low-risk-cloud-ssp.xlsx`, 'ssp');
  let sspStatement = '';
  sheet.eachRow(row => {
    if (cellText(row.getCell(1)) === 'as-5') sspStatement = cellText(row.getCell(3));
  });
  const entry = profile.entries.find(e => e.key === 'im8-reform:as-5')!;
  expect(entry.statement).toBe(sspStatement);
  expect(entry.statement).not.toBe(map.get('im8-reform:as-5')!.statement);
});

test('an SSP row missing from the catalog throws with the ID and file', async () => {
  const map = await im8Map();
  map.delete('im8-reform:as-1');
  const attempt = loadLowRiskCloudProfile(DATA, map);
  await expect(attempt).rejects.toBeInstanceOf(UnknownRequirementError);
  await expect(attempt).rejects.toThrow(/as-1.*low-risk-cloud-ssp\.xlsx/);
});

test('GenAI: 8 requirements, ga-1..4 level 0, ga-5..8 level 1, key genai:ga-1', async () => {
  const { catalog, requirements, profile } = await loadGenAi(DATA);
  expect(catalog._id).toBe('genai');
  expect(requirements).toHaveLength(8);
  expect(requirements[0]._id).toBe('genai:ga-1');
  expect(profile._id).toBe('generative-ai');
  expect(profile.entries.map(e => e.level)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
});
