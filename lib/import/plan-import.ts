import type { CoverageEntry, CoverageValue, Profile, RequirementKey } from '../domain/types';
import type { ParsedGuide } from './parse-guide';
import { suggestValue } from './suggest';

export interface ImportPreview {
  /** Requirement IDs in the guide that the chosen profile doesn't have. */
  unknownIds: string[];
  /** Profile requirements the guide says nothing about (it predates them). */
  missingKeys: RequirementKey[];
  writtenAgainst: string;
  /** Each distinct owner text (with its agency-inputs text) once, with a suggested value. */
  pairs: { pairKey: string; owner: string; agencyInputs?: string; count: number; suggested: CoverageValue | null }[];
}

const pairKeyOf = (owner: string, agencyInputs?: string) => JSON.stringify([owner.trim(), agencyInputs?.trim() ?? '']);

export function previewImport(guide: ParsedGuide, profile: Profile): ImportPreview {
  const known = new Set(profile.entries.map(e => e.id));
  const inGuide = new Set(guide.rows.map(r => r.id));
  const pairs = new Map<string, ImportPreview['pairs'][number]>();
  for (const row of guide.rows) {
    const pairKey = pairKeyOf(row.owner, row.agencyInputs);
    const existing = pairs.get(pairKey);
    if (existing) existing.count++;
    else {
      const pair: ImportPreview['pairs'][number] = {
        pairKey,
        owner: row.owner.trim(),
        count: 1,
        suggested: suggestValue(row.owner, row.agencyInputs),
      };
      if (row.agencyInputs) pair.agencyInputs = row.agencyInputs.trim();
      pairs.set(pairKey, pair);
    }
  }
  return {
    unknownIds: guide.rows.map(r => r.id).filter(id => !known.has(id)),
    missingKeys: profile.entries.filter(e => !inGuide.has(e.id)).map(e => e.key),
    writtenAgainst: guide.preamble.join(' | ') || 'Unknown',
    pairs: [...pairs.values()],
  };
}

/** The guide as coverage rows, using the admin's choice for each distinct owner text. */
export function buildImportEntries(
  guide: ParsedGuide,
  profile: Profile,
  mapping: Record<string, CoverageValue>,
): CoverageEntry[] {
  const keyOf = new Map(profile.entries.map(e => [e.id, e.key]));
  const unknown = guide.rows.filter(r => !keyOf.has(r.id)).map(r => r.id);
  if (unknown.length) throw new Error(`${unknown.length} requirement IDs aren't in ${profile.title}: ${unknown.slice(0, 5).join(', ')}`);

  return guide.rows.map(row => {
    const value = mapping[pairKeyOf(row.owner, row.agencyInputs)];
    if (!value) throw new Error(`Choose who handles rows owned by "${row.owner.trim() || '(blank)'}".`);
    const entry: CoverageEntry = { key: keyOf.get(row.id)!, value };
    if (row.owner.trim()) entry.originalText = row.owner.trim();
    if (row.explanation) entry[value === 'app-builder' ? 'builderPart' : 'explanation'] = row.explanation;
    return entry;
  });
}
