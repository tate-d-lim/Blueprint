import { plainState, toolsCovering } from '@/lib/catalog/state';
import type { CatalogRelease } from '@/lib/domain/types';
import { pairVersions } from '@/lib/plan/select';
import { loadSeed } from '../helpers/seed';

const release = (appliedAt: string, rewordedId: string): CatalogRelease => ({
  _id: appliedAt,
  appliedAt,
  by: 'Admin',
  source: { kind: 'upload', label: 'f' },
  changes: [{ profileId: 'low-risk-cloud', added: [], removed: [], levelChanged: [], reworded: [{ id: rewordedId, title: 't' }] }],
});

test('the seed has one release with no changes, so the catalog page has a history', async () => {
  const seed = await loadSeed();
  expect(seed.catalogReleases).toHaveLength(1);
  expect(seed.catalogReleases[0]).toMatchObject({ source: { kind: 'seed' }, changes: [], by: 'Seed' });
});

test('plain text from the source files counts as written at the seed release', async () => {
  const seed = await loadSeed();
  const profile = seed.profiles.find(p => p._id === 'low-risk-cloud')!;
  const withText = profile.entries.find(e => e.plain && !e.plain.editedAt)!;
  const releases = [seed.catalogReleases[0]];
  expect(plainState(withText, profile._id, releases)).toBe('written');
  const later = release('2026-12-01T00:00:00.000Z', withText.id);
  expect(plainState(withText, profile._id, [...releases, later])).toBe('recheck');
  // Text saved after the release is current again.
  const saved = { ...withText, plain: { ...withText.plain!, editedAt: '2026-12-02T00:00:00.000Z' } };
  expect(plainState(saved, profile._id, [...releases, later])).toBe('written');
  expect(plainState({ ...withText, plain: undefined }, profile._id, releases)).toBe('missing');
});

test('toolsCovering lists the tools whose newest version says provided or shared', async () => {
  const seed = await loadSeed();
  const profile = seed.profiles.find(p => p._id === 'low-risk-cloud')!;
  const says = toolsCovering(profile.entries.find(e => e.id === 'as-1')!, profile._id, seed.tools, pairVersions(seed.toolVersions));
  expect(says.length).toBeGreaterThan(0);
  expect(says.every(s => s.value === 'provided' || s.value === 'shared')).toBe(true);
});
