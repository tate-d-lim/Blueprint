import { readFileSync } from 'node:fs';
import { diffProfile } from '@/lib/catalog/diff';
import { parseReleaseFile } from '@/lib/catalog/parse-file';
import { CatalogError } from '@/lib/catalog/types';
import { loadSeed } from '../helpers/seed';

const file = (name: string) => readFileSync(`data/source/${name}`);
const KNOWN = [
  { id: 'low-risk-cloud', title: 'Low-Risk Cloud' },
  { id: 'medium-risk-cloud', title: 'Medium-Risk Cloud' },
  { id: 'high-risk-cloud-cii', title: 'High-Risk Cloud CII' },
  { id: 'generative-ai', title: 'Generative AI' },
];

async function diffsOf(name: string, profileId?: string) {
  const seed = await loadSeed();
  const release = await parseReleaseFile(file(name), name, KNOWN, profileId);
  return {
    release,
    diffs: release.profiles.map(p => ({ id: p.profileId, diff: diffProfile(seed.profiles.find(x => x._id === p.profileId)!, p) })),
  };
}

test('the local IM8 catalog against the seed gives no change in any cloud profile', async () => {
  const { release, diffs } = await diffsOf('im8-lite-catalog.xlsx');
  expect(release.profiles.map(p => p.profileId)).toEqual(['low-risk-cloud', 'medium-risk-cloud', 'high-risk-cloud-cii']);
  expect(diffs.every(d => !d.diff.changed && d.diff.retitled.length === 0)).toBe(true);
});

test('the Generative AI catalog: every row belongs to generative-ai, and nothing changes', async () => {
  const { release, diffs } = await diffsOf('gen-ai-catalog.xlsx');
  expect(release.profiles).toHaveLength(1);
  expect(release.profiles[0].entries.map(e => e.level)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
  expect(diffs[0].diff.changed).toBe(false);
});

test('the ssp file needs a profile, and gives no change for its own profile', async () => {
  await expect(diffsOf('low-risk-cloud-ssp.xlsx')).rejects.toThrow(/one profile and does not say which/);
  const { diffs } = await diffsOf('low-risk-cloud-ssp.xlsx', 'low-risk-cloud');
  expect(diffs[0].diff.changed).toBe(false);
});

test('the OSCAL catalog gives wording only: as-15 and is-15 are removed, and levels never change', async () => {
  const { release, diffs } = await diffsOf('im8-reform.json');
  expect(release.profiles.every(p => p.wordingOnly)).toBe(true);
  expect(release.profiles[0].entries).toHaveLength(137);
  const low = diffs.find(d => d.id === 'low-risk-cloud')!.diff;
  expect(low.changes.removed.map(r => r.id)).toEqual(['as-15', 'is-15']);
  expect(low.changes.added).toEqual([]);
  expect(low.changes.levelChanged).toEqual([]);
  expect(low.ignored.length).toBe(137 - 116);
});

test('a file that is not a release says what Blueprint can read', async () => {
  const bad = (bytes: string, name: string) => parseReleaseFile(Buffer.from(bytes), name, KNOWN);
  await expect(bad('hello', 'notes.txt')).rejects.toThrow(/Blueprint reads an \.xlsx file/);
  await expect(bad('{"a":1}', 'x.json')).rejects.toThrow(/not an OSCAL catalog/);
  await expect(bad('', 'empty.json')).rejects.toBeInstanceOf(CatalogError);
  await expect(bad('PK\u0003\u0004 not really a workbook', 'x.xlsx')).rejects.toThrow(/not an \.xlsx workbook/);
});
