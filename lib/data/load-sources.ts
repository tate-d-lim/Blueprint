import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Catalog, Level, Profile, ProfileEntry, Requirement, RequirementKey } from '../domain/types';
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
    });
  });
  return {
    _id: 'low-risk-cloud',
    title: 'Low-Risk Cloud',
    plainTitle: 'Low-risk app on the cloud',
    version: '2026-10-22 (local copy)',
    sourceFile: SSP_FILE,
    entries,
  };
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
      sourceFile: GENAI_FILE,
      entries,
    },
  };
}
