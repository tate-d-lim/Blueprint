import type { CatalogRelease, Level, Project, RequirementKey, ToolVersion } from '../domain/types';

/**
 * What applied catalog releases mean for the people who use the catalog. A release never changes a tool's answers or a
 * builder's ticks. These functions only say what a person should look at again, from the release records and the times.
 */

const idOf = (key: string) => key.split(':')[1] ?? key;

/** Releases that changed the catalog (the seed release is the start, not a change), oldest first. */
const changing = (releases: CatalogRelease[]) =>
  releases.filter(r => r.source.kind !== 'seed').sort((a, b) => (a.appliedAt < b.appliedAt ? -1 : a.appliedAt > b.appliedAt ? 1 : 0));

export interface CoverageToCheck {
  /** Controls this version answers whose official wording changed after the version was saved. */
  reworded: RequirementKey[];
  /** Ids of controls that joined the profile after the version was saved. The version says nothing about them. */
  added: string[];
  /** When the newest of those releases was applied. */
  since?: string;
}

/**
 * The rows of one coverage version that its tool owner should read again. A version saved after a release has seen
 * that release's wording, so a new version clears the list.
 */
export function coverageToCheck(version: ToolVersion, releases: CatalogRelease[]): CoverageToCheck {
  const answered = new Map(version.entries.map(e => [idOf(e.key), e.key]));
  const reworded = new Set<RequirementKey>();
  const added = new Set<string>();
  let since: string | undefined;
  for (const release of changing(releases)) {
    if (release.appliedAt <= version.createdAt) continue;
    const changes = release.changes.find(c => c.profileId === version.profileId);
    if (!changes) continue;
    for (const c of changes.reworded) {
      const key = answered.get(c.id);
      if (key) reworded.add(key);
    }
    for (const c of changes.added) if (!answered.has(c.id)) added.add(c.id);
    // A control that came and went again needs no answer.
    for (const c of changes.removed) added.delete(c.id);
    if (changes.reworded.length || changes.added.length) since = release.appliedAt;
  }
  return { reworded: [...reworded], added: [...added], ...(since && (reworded.size || added.size) ? { since } : {}) };
}

export const hasCoverageToCheck = (c: CoverageToCheck) => c.reworded.length + c.added.length > 0;

/** When the wording of one control last changed after `after`, or undefined. For one claim on one control. */
export function rewordedSince(key: string, profileId: string, after: string, releases: CatalogRelease[]): string | undefined {
  const id = idOf(key);
  let at: string | undefined;
  for (const release of changing(releases)) {
    if (release.appliedAt <= after) continue;
    if (release.changes.some(c => c.profileId === profileId && c.reworded.some(r => r.id === id))) at = release.appliedAt;
  }
  return at;
}

export interface ProjectNews {
  /** When the newest release in this notice was applied. The builder's "seen" time moves to it. */
  latestAt: string;
  added: { id: string; title: string }[];
  removed: { id: string; title: string }[];
  reworded: { id: string; title: string }[];
  levelChanged: { id: string; title: string; from: Level; to: Level }[];
}

/**
 * What changed in the catalog for a saved project since its builder last read the notice (or since the project was
 * made). Null when nothing changed for the project's profiles.
 */
export function projectNews(project: Pick<Project, 'createdAt' | 'catalogSeenAt'>, profileIds: string[], releases: CatalogRelease[]): ProjectNews | null {
  const seen = project.catalogSeenAt ?? project.createdAt;
  const wanted = new Set(profileIds);
  const added = new Map<string, { id: string; title: string }>();
  const removed = new Map<string, { id: string; title: string }>();
  const reworded = new Map<string, { id: string; title: string }>();
  const levelChanged = new Map<string, { id: string; title: string; from: Level; to: Level }>();
  let latestAt: string | undefined;
  for (const release of changing(releases)) {
    if (release.appliedAt <= seen) continue;
    for (const changes of release.changes) {
      if (!wanted.has(changes.profileId)) continue;
      const k = (id: string) => `${changes.profileId}:${id}`;
      for (const c of changes.added) {
        // A control that was removed and came back is only "reworded" news at most, not new.
        if (removed.delete(k(c.id))) continue;
        added.set(k(c.id), c);
      }
      for (const c of changes.removed) {
        reworded.delete(k(c.id));
        levelChanged.delete(k(c.id));
        // A control the builder never saw (added and removed between two visits) is no news.
        if (added.delete(k(c.id))) continue;
        removed.set(k(c.id), c);
      }
      for (const c of changes.reworded) if (!added.has(k(c.id))) reworded.set(k(c.id), c);
      for (const c of changes.levelChanged) {
        if (added.has(k(c.id))) continue;
        const first = levelChanged.get(k(c.id));
        const from = first ? first.from : c.from;
        if (from === c.to) levelChanged.delete(k(c.id));
        else levelChanged.set(k(c.id), { ...c, from });
      }
      if (changes.added.length + changes.removed.length + changes.reworded.length + changes.levelChanged.length) latestAt = release.appliedAt;
    }
  }
  if (!latestAt || added.size + removed.size + reworded.size + levelChanged.size === 0) return null;
  return { latestAt, added: [...added.values()], removed: [...removed.values()], reworded: [...reworded.values()], levelChanged: [...levelChanged.values()] };
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One sentence for a notice: "2 new controls, 1 control reworded, 1 control removed." Empty kinds are left out. */
export function newsSentence(news: Pick<ProjectNews, 'added' | 'removed' | 'reworded' | 'levelChanged'>): string {
  const parts = [
    news.added.length && count(news.added.length, 'new control', 'new controls'),
    news.reworded.length && count(news.reworded.length, 'control reworded', 'controls reworded'),
    news.levelChanged.length && count(news.levelChanged.length, 'control with a new level', 'controls with a new level'),
    news.removed.length && count(news.removed.length, 'control removed', 'controls removed'),
  ].filter(Boolean);
  return parts.length ? `${parts.join(', ')}.` : '';
}
