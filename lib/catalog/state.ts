import type { CatalogRelease, Level, ProfileEntry, Tool, ToolVersion } from '../domain/types';

export type PlainState = 'written' | 'missing' | 'recheck';

/** The words for a level on every screen. Level 2 controls are the ones an app can leave for later. */
export const LEVEL_LABEL: Record<Level, string> = { 0: 'Essential', 1: 'Recommended', 2: 'Good to have' };

export const PLAIN_LABEL: Record<PlainState, string> = { written: 'Plain text', missing: 'No plain text', recheck: 'Check the plain text' };

/**
 * Whether a control has plain text, and whether a release reworded the control after the text was written. Text from the
 * source files has no `editedAt` and counts as written when the first release (the seed) was applied.
 */
export function plainState(entry: ProfileEntry, profileId: string, releases: CatalogRelease[]): PlainState {
  if (!entry.plain) return 'missing';
  const seedAt = releases.filter(r => r.source.kind === 'seed').map(r => r.appliedAt).sort()[0] ?? '';
  const writtenAt = entry.plain.editedAt ?? seedAt;
  const reworded = releases.some(
    r => r.appliedAt > writtenAt && r.changes.some(c => c.profileId === profileId && c.reworded.some(x => x.id === entry.id)),
  );
  return reworded ? 'recheck' : 'written';
}

export interface ToolSays {
  toolId: string;
  toolName: string;
  value: 'provided' | 'shared';
  explanation?: string;
}

/** Each tool whose newest version of this profile says "provided" or "shared" for the control. */
export function toolsCovering(entry: ProfileEntry, profileId: string, tools: Tool[], versions: { current: ToolVersion }[]): ToolSays[] {
  const says: ToolSays[] = [];
  for (const { current } of versions) {
    if (current.profileId !== profileId) continue;
    const row = current.entries.find(e => e.key === entry.key);
    if (row?.value !== 'provided' && row?.value !== 'shared') continue;
    const tool = tools.find(t => t._id === current.toolId);
    if (tool) says.push({ toolId: tool._id, toolName: tool.name, value: row.value, ...(row.explanation ? { explanation: row.explanation } : {}) });
  }
  return says.sort((a, b) => a.toolName.localeCompare(b.toolName));
}

/** What the admin reads for a release: "3 added, 1 removed" for its profiles, by profile name. */
export function releaseKinds(release: CatalogRelease): { added: number; removed: number; reworded: number; levelChanged: number } {
  return release.changes.reduce(
    (sum, c) => ({
      added: sum.added + c.added.length,
      removed: sum.removed + c.removed.length,
      reworded: sum.reworded + c.reworded.length,
      levelChanged: sum.levelChanged + c.levelChanged.length,
    }),
    { added: 0, removed: 0, reworded: 0, levelChanged: 0 },
  );
}
