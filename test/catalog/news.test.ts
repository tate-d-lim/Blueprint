import { coverageToCheck, hasCoverageToCheck, newsSentence, projectNews, rewordedSince } from '@/lib/catalog/news';
import type { CatalogRelease, ProfileChanges } from '@/lib/domain/types';
import { key, makeEntry, makeVersion } from '../helpers/factories';

const t = (id: string) => ({ id, title: `Title ${id}` });

function release(appliedAt: string, changes: Partial<ProfileChanges>, kind: CatalogRelease['source']['kind'] = 'upload', profileId = 'p'): CatalogRelease {
  return {
    _id: `r-${appliedAt}`,
    appliedAt,
    by: 'Admin',
    source: { kind, label: 'file.xlsx' },
    changes: [{ profileId, added: [], removed: [], reworded: [], levelChanged: [], ...changes }],
  };
}

// makeVersion saves at 2026-10-27.
const BEFORE = '2026-10-01T00:00:00.000Z';
const AFTER = '2026-11-01T00:00:00.000Z';
const LATER = '2026-11-10T00:00:00.000Z';

describe('coverageToCheck', () => {
  const version = makeVersion('t', 'p', 1, [makeEntry('as-1'), makeEntry('as-2')]);

  test('a reworded control that the version answers is a row to check', () => {
    const result = coverageToCheck(version, [release(AFTER, { reworded: [t('as-1'), t('as-9')] })]);
    expect(result.reworded).toEqual([key('as-1')]);
    expect(result.since).toBe(AFTER);
    expect(hasCoverageToCheck(result)).toBe(true);
  });

  test('a release applied before the version was saved is already seen', () => {
    const result = coverageToCheck(version, [release(BEFORE, { reworded: [t('as-1')], added: [t('as-7')] })]);
    expect(result).toEqual({ reworded: [], added: [] });
    expect(hasCoverageToCheck(result)).toBe(false);
  });

  test('a new control with no answer is listed, and one that was removed again is not', () => {
    const result = coverageToCheck(version, [release(AFTER, { added: [t('as-7'), t('as-8')] }), release(LATER, { removed: [t('as-8')] })]);
    expect(result.added).toEqual(['as-7']);
  });

  test('the seed release and other profiles change nothing', () => {
    const seed = release(AFTER, { reworded: [t('as-1')] }, 'seed');
    const other = release(AFTER, { reworded: [t('as-1')] }, 'upload', 'q');
    expect(hasCoverageToCheck(coverageToCheck(version, [seed, other]))).toBe(false);
  });
});

test('rewordedSince gives the time of the newest rewording after a claim was made', () => {
  const releases = [release(AFTER, { reworded: [t('as-1')] }), release(LATER, { reworded: [t('as-1')] })];
  expect(rewordedSince(key('as-1'), 'p', BEFORE, releases)).toBe(LATER);
  expect(rewordedSince(key('as-1'), 'p', LATER, releases)).toBeUndefined();
  expect(rewordedSince(key('as-2'), 'p', BEFORE, releases)).toBeUndefined();
});

describe('projectNews', () => {
  const project = { createdAt: '2026-10-27T00:00:00.000Z' };

  test('nothing after the project was made is no news', () => {
    expect(projectNews(project, ['p'], [release(BEFORE, { added: [t('as-7')] })])).toBeNull();
    expect(projectNews(project, ['p'], [])).toBeNull();
  });

  test('changes of the project profiles are gathered across releases', () => {
    const news = projectNews(project, ['p'], [
      release(AFTER, { added: [t('as-7')], reworded: [t('as-1')] }),
      release(LATER, { removed: [t('as-2')], levelChanged: [{ ...t('as-3'), from: 1, to: 0 }] }),
      release(LATER, { added: [t('zz-1')] }, 'upload', 'other-profile'),
    ]);
    expect(news).toEqual({
      latestAt: LATER,
      added: [t('as-7')],
      reworded: [t('as-1')],
      removed: [t('as-2')],
      levelChanged: [{ ...t('as-3'), from: 1, to: 0 }],
    });
  });

  test('the notice goes away when the builder has seen the newest release', () => {
    const releases = [release(AFTER, { added: [t('as-7')] })];
    expect(projectNews({ ...project, catalogSeenAt: AFTER }, ['p'], releases)).toBeNull();
  });

  test('a control that was added and removed between two visits is no news', () => {
    expect(projectNews(project, ['p'], [release(AFTER, { added: [t('as-7')] }), release(LATER, { removed: [t('as-7')] })])).toBeNull();
  });

  test('a level that goes back to where it was is no news', () => {
    const there = release(AFTER, { levelChanged: [{ ...t('as-3'), from: 1, to: 2 }] });
    const back = release(LATER, { levelChanged: [{ ...t('as-3'), from: 2, to: 1 }] });
    expect(projectNews(project, ['p'], [there, back])).toBeNull();
  });
});

test('newsSentence gives each count its noun and leaves out empty kinds', () => {
  expect(newsSentence({ added: [t('a-1'), t('a-2')], reworded: [t('a-3')], levelChanged: [], removed: [t('a-4')] })).toBe(
    '2 new controls, 1 control reworded, 1 control removed.',
  );
  expect(newsSentence({ added: [], reworded: [], levelChanged: [], removed: [] })).toBe('');
});
