import { hasParameter, loadIm8Catalog, loadLiteProfile, loadLowRiskCloudProfile, loadGenAi, UnknownRequirementError } from '@/lib/data/load-sources';
import type { Profile } from '@/lib/domain/types';
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

async function profiles() {
  const low = await loadLowRiskCloudProfile(DATA, await im8Map());
  const medium = await loadLiteProfile(DATA, 'Medium-Risk Cloud', 'medium-risk-cloud', 'medium');
  const high = await loadLiteProfile(DATA, 'High-Risk Cloud CII', 'high-risk-cloud-cii', 'high', { requiresCii: true });
  return { low, medium, high };
}
/** The shared requirements whose level differs from Low-Risk Cloud, in the other profile's order. */
const levelChanges = (low: Profile, other: Profile) =>
  other.entries.filter(e => {
    const shared = low.entries.find(l => l.id === e.id);
    return shared && shared.level !== e.level;
  }).map(e => e.id);

test('Medium-Risk Cloud: 118 entries, 9 level changes', async () => {
  const { low, medium } = await profiles();
  expect(medium.entries).toHaveLength(118);
  expect(levelChanges(low, medium)).toEqual(['br-2', 'lm-5', 'lm-19', 'cs-8', 'is-12', 'is-13', 'sd-3', 'ck-1', 'ck-2']);
  expect(medium).toMatchObject({
    _id: 'medium-risk-cloud', title: 'Medium-Risk Cloud', plainTitle: 'Medium-risk app on the cloud', riskLevel: 'medium', hosting: 'cloud',
  });
  expect(medium.version).toBe(`${medium.release} (locally derived)`);
});

test('High-Risk Cloud CII: 138 entries, 19 level changes, with hr and rs', async () => {
  const { low, high } = await profiles();
  expect(high.entries).toHaveLength(138);
  expect(levelChanges(low, high)).toHaveLength(19);
  expect(high.entries.some(e => e.family === 'hr') && high.entries.some(e => e.family === 'rs')).toBe(true);
  expect(high).toMatchObject({ _id: 'high-risk-cloud-cii', riskLevel: 'high', requiresCii: true, hosting: 'cloud', plainTitle: 'High-risk app on the cloud' });
});

test('the levels of a lite profile match the catalog tags', async () => {
  const { medium } = await profiles();
  const sheet = await readSheet(`${DATA}/source/im8-lite-catalog.xlsx`, 'catalog');
  const tags = new Map<string, number>();
  sheet.eachRow((row, n) => {
    const m = /(?:^|;)\s*Medium-Risk Cloud - Level (\d)/.exec(cellText(row.getCell(7)));
    if (n > 1 && m) tags.set(cellText(row.getCell(1)), Number(m[1]));
  });
  expect(medium.entries.map(e => [e.id, e.level])).toEqual([...tags]);
});

test('every entry has a wording fingerprint: 16 hex characters that ignore whitespace', async () => {
  const { low } = await profiles();
  expect(low.entries.every(e => /^[0-9a-f]{16}$/.test(e.wording))).toBe(true);
  expect(new Set(low.entries.map(e => e.wording)).size).toBeGreaterThan(100);
});

test('hasParameter spots default and insert placeholders only', () => {
  expect(hasParameter('Verify [as-5_prm_1: default = 12] characters.')).toBe(true);
  expect(hasParameter('Use formats (such as [ insert: param, ga-5_prm_1 ]).')).toBe(true);
  expect(hasParameter('Verify passwords are at least 12 characters [see note].')).toBe(false);
});
