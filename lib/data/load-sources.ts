import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Catalog, Level, PlainText, Profile, ProfileEntry, Requirement, RequirementKey } from '../domain/types';
import { cellText, readSheet } from './xlsx';

export class UnknownRequirementError extends Error {
  constructor(id: string, file: string) {
    super(`Unknown requirement ${id} in ${file}`);
    this.name = 'UnknownRequirementError';
  }
}

const IM8_FILE = 'im8-lite-catalog.xlsx';
const SSP_FILE = 'low-risk-cloud-ssp.xlsx';
const GENAI_FILE = 'gen-ai-catalog.xlsx';

interface CatalogRow {
  id: string;
  title: string;
  statement: string;
  recommendations: string;
  rationale: string;
  references: string;
  levelText: string;
  lastModified: string;
}

/** Rows of a catalog-layout sheet: A ID, B Title, C Statement, D Recommendations, E Rationale, F References, G level, H Last Modified. */
async function readCatalogRows(file: string): Promise<CatalogRow[]> {
  const sheet = await readSheet(file, 'catalog');
  const rows: CatalogRow[] = [];
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const id = cellText(row.getCell(1));
    if (!id) return;
    rows.push({
      id,
      title: cellText(row.getCell(2)),
      statement: cellText(row.getCell(3)),
      recommendations: cellText(row.getCell(4)),
      rationale: cellText(row.getCell(5)),
      references: cellText(row.getCell(6)),
      levelText: cellText(row.getCell(7)),
      lastModified: cellText(row.getCell(8)),
    });
  });
  return rows;
}

const familyOf = (id: string) => id.split('-')[0];

/** True when the statement has a placeholder for a value the organisation sets (`[x: default = …]` or `[ insert: … ]`). */
export const hasParameter = (statement: string): boolean => /\[[^\]]*(default\s*=|insert:)[^\]]*\]/.test(statement);

/** A short fingerprint of the official wording, so a change of one word is noticed. Whitespace does not count. */
export const wordingOf = (statement: string): string =>
  createHash('sha256').update(statement.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 16);
const latest = (dates: string[]) => dates.filter(Boolean).sort().at(-1) ?? 'unknown';

function toRequirement(catalogId: string, r: CatalogRow): Requirement {
  return {
    _id: `${catalogId}:${r.id}`,
    catalogId,
    id: r.id,
    family: familyOf(r.id),
    title: r.title,
    statement: r.statement,
    recommendations: r.recommendations,
    rationale: r.rationale,
    references: r.references,
    lastModified: r.lastModified || undefined,
  };
}

export async function loadIm8Catalog(dataDir: string): Promise<{ catalog: Catalog; requirements: Requirement[] }> {
  const rows = await readCatalogRows(path.join(dataDir, 'source', IM8_FILE));
  const json = JSON.parse(await readFile(path.join(dataDir, 'source', 'im8-reform.json'), 'utf8'));
  const familyTitles: Record<string, string> = {};
  for (const group of json.catalog.groups as { id: string; title: string }[]) familyTitles[group.id] = group.title;
  return {
    catalog: {
      _id: 'im8-reform',
      title: 'IM8 Reform',
      version: latest(rows.map(r => r.lastModified)),
      sourceFile: IM8_FILE,
      derived: true,
      familyTitles,
    },
    requirements: rows.map(r => toRequirement('im8-reform', r)),
  };
}

export async function loadLowRiskCloudProfile(
  dataDir: string,
  catalogReqs: Map<RequirementKey, Requirement>,
): Promise<Profile> {
  const sheet = await readSheet(path.join(dataDir, 'source', SSP_FILE), 'ssp');
  const entries: ProfileEntry[] = [];
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const id = cellText(row.getCell(1));
    if (!id) return;
    const key: RequirementKey = `im8-reform:${id}`;
    if (!catalogReqs.has(key)) throw new UnknownRequirementError(id, SSP_FILE);
    entries.push({
      key,
      id,
      family: familyOf(id),
      title: cellText(row.getCell(2)),
      level: Number(cellText(row.getCell(6))) as Level,
      statement: cellText(row.getCell(3)),
      recommendations: cellText(row.getCell(4)),
      rationale: cellText(row.getCell(5)),
      references: cellText(row.getCell(7)),
      ifUncovered: 'ask',
      wording: wordingOf(cellText(row.getCell(3))),
    });
  });
  return {
    _id: 'low-risk-cloud',
    title: 'Low-Risk Cloud',
    plainTitle: 'Low-risk app on the cloud',
    version: '2026-10-22 (local copy)',
    release: '2026-10-22 (local copy)',
    riskLevel: 'low',
    hosting: 'cloud',
    sourceFile: SSP_FILE,
    entries,
  };
}

const PLAIN_TITLES = { low: 'Low-risk app on the cloud', medium: 'Medium-risk app on the cloud', high: 'High-risk app on the cloud' } as const;

/**
 * A cloud profile taken from the lite catalog: the entries whose "SSP-Profile Level" tag (column G) has `{name} - Level {n}`.
 * The wording is the catalog's, with parameters as written there. Low-Risk Cloud keeps its own file with resolved values.
 */
export async function loadLiteProfile(
  dataDir: string,
  name: string,
  id: string,
  riskLevel: 'low' | 'medium' | 'high',
  opts: { requiresCii?: boolean } = {},
): Promise<Profile> {
  const rows = await readCatalogRows(path.join(dataDir, 'source', IM8_FILE));
  const tag = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - Level (\\d)$`);
  const entries: ProfileEntry[] = [];
  for (const r of rows) {
    const level = r.levelText
      .split(';')
      .map(part => tag.exec(part.trim())?.[1])
      .find(Boolean);
    if (level === undefined) continue;
    entries.push({
      key: `im8-reform:${r.id}` as RequirementKey,
      id: r.id,
      family: familyOf(r.id),
      title: r.title,
      level: Number(level) as Level,
      statement: r.statement,
      recommendations: r.recommendations,
      rationale: r.rationale,
      references: r.references,
      ifUncovered: 'ask',
      wording: wordingOf(r.statement),
    });
  }
  const release = latest(rows.map(r => r.lastModified));
  return {
    _id: id,
    title: name,
    plainTitle: PLAIN_TITLES[riskLevel],
    version: `${release} (locally derived)`,
    release,
    riskLevel,
    ...(opts.requiresCii ? { requiresCii: true } : {}),
    hosting: 'cloud',
    sourceFile: IM8_FILE,
    entries,
  };
}

/**
 * Puts plain-language text on the entries of these profiles. A text goes where it was checked (its `checkedFor`, or the
 * home profile when it names none). Anywhere else it goes only when the official statement has no parameter and its wording
 * is the same as in a profile it was checked for, and then without its `appliesWhen` rule: an unknown never removes a requirement.
 */
export function attachPlain(profiles: Profile[], plainById: Record<string, Partial<PlainText>>, homeProfileId: string): void {
  const byId = new Map(profiles.map(p => [p._id, p]));
  for (const profile of profiles) {
    for (const entry of profile.entries) {
      const found = plainById[entry.id];
      if (!found) continue;
      const checkedFor = found.checkedFor ?? [homeProfileId];
      const plain = { ...found, checkedFor } as PlainText;
      if (checkedFor.includes(profile._id)) {
        entry.plain = plain;
        continue;
      }
      if (hasParameter(entry.statement)) continue;
      const sameWording = checkedFor.some(id => byId.get(id)?.entries.find(e => e.id === entry.id)?.wording === entry.wording);
      if (!sameWording) continue;
      const { appliesWhen: _rule, ...withoutRule } = plain;
      void _rule;
      entry.plain = withoutRule;
    }
  }
}

export async function loadGenAi(
  dataDir: string,
): Promise<{ catalog: Catalog; requirements: Requirement[]; profile: Profile }> {
  const rows = await readCatalogRows(path.join(dataDir, 'source', GENAI_FILE));
  const requirements = rows.map(r => toRequirement('genai', r));
  const version = latest(rows.map(r => r.lastModified));
  const entries: ProfileEntry[] = rows.map(r => ({
    key: `genai:${r.id}` as RequirementKey,
    id: r.id,
    family: familyOf(r.id),
    title: r.title,
    level: Number(/Level (\d)/.exec(r.levelText)?.[1] ?? 0) as Level,
    statement: r.statement,
    recommendations: r.recommendations,
    rationale: r.rationale,
    references: r.references,
    ifUncovered: 'ask',
    wording: wordingOf(r.statement),
  }));
  return {
    catalog: {
      _id: 'genai',
      title: 'Generative AI',
      version,
      sourceFile: GENAI_FILE,
      derived: true,
      familyTitles: { ga: 'Generative AI' },
    },
    requirements,
    profile: {
      _id: 'generative-ai',
      title: 'Generative AI',
      plainTitle: 'Apps that use generative AI',
      version,
      release: version,
      sourceFile: GENAI_FILE,
      entries,
    },
  };
}
