import type ExcelJS from 'exceljs';
import { catalogRowsOf, sspRowsOf } from '../data/load-sources';
import { openWorkbook } from '../data/xlsx';
import type { Level } from '../domain/types';
import { CatalogError, LAYOUT_HELP, type IncomingEntry, type IncomingProfile, type IncomingRelease } from './types';

/** A profile of the database, as far as the parsers need to know it. */
export interface KnownProfile {
  id: string;
  title: string;
}

export const GENAI_PROFILE = 'generative-ai';

export interface XlsxOptions {
  fileName: string;
  /** The profiles of the database. The `catalog` layout names them in its tags. */
  profiles: KnownProfile[];
  /** The profile an `ssp` file is for. That layout holds one profile and does not say which. */
  profileId?: string;
}

const levelOf = (text: string, where: string): Level => {
  const n = Number(text);
  if (n !== 0 && n !== 1 && n !== 2) throw new CatalogError(`${where} has the level "${text}". A level is 0, 1 or 2. Fix the file, then upload it again.`);
  return n;
};

function finish(profileId: string, entries: IncomingEntry[], fileName: string): IncomingProfile {
  const seen = new Set<string>();
  for (const e of entries) {
    if (!e.statement) throw new CatalogError(`The control ${e.id} in ${fileName} has no statement. Fix the file, then upload it again.`);
    if (seen.has(e.id)) throw new CatalogError(`The control ${e.id} is in ${fileName} twice. Fix the file, then upload it again.`);
    seen.add(e.id);
  }
  return { profileId, entries };
}

/** The `ssp` layout: one profile, with a level in column F. */
function parseSsp(sheet: ExcelJS.Worksheet, opts: XlsxOptions): IncomingRelease {
  if (!opts.profileId) {
    throw new CatalogError('This file holds one profile and does not say which. Choose the profile it is for, then upload it again.');
  }
  if (!opts.profiles.some(p => p.id === opts.profileId)) throw new CatalogError('Choose a profile that Blueprint knows, then upload the file again.');
  const entries: IncomingEntry[] = sspRowsOf(sheet).map(r => ({
    id: r.id.toLowerCase(),
    title: r.title,
    level: levelOf(String(r.level), `The control ${r.id}`),
    statement: r.statement,
    recommendations: r.recommendations,
    rationale: r.rationale,
    references: r.references,
  }));
  if (entries.length === 0) throw new CatalogError('The sheet "ssp" has no controls. Check the file, then upload it again.');
  return { source: { kind: 'upload', label: opts.fileName }, profiles: [finish(opts.profileId, entries, opts.fileName)], notes: [] };
}

const tagPattern = (title: string) => new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - Level (\\d)$`);

/** The `catalog` layout: column G tags each control with `{profile} - Level {n}`. One file can carry several profiles. */
function parseCatalog(sheet: ExcelJS.Worksheet, opts: XlsxOptions): IncomingRelease {
  const rows = catalogRowsOf(sheet);
  if (rows.length === 0) throw new CatalogError('The sheet "catalog" has no controls. Check the file, then upload it again.');
  const tagged = rows.flatMap(r => r.levelText.split(';').map(t => t.trim()).filter(Boolean));
  const allGenAi = tagged.length > 0 && tagged.every(t => t.startsWith('Generative AI - Level'));
  const latest = rows.map(r => r.lastModified).filter(Boolean).sort().at(-1);
  const source = { kind: 'upload' as const, label: opts.fileName, ...(latest ? { sourceDate: latest } : {}) };
  const entryOf = (r: (typeof rows)[number], level: Level): IncomingEntry => ({
    id: r.id.toLowerCase(),
    title: r.title,
    level,
    statement: r.statement,
    recommendations: r.recommendations,
    rationale: r.rationale,
    references: r.references,
  });

  if (allGenAi) {
    if (!opts.profiles.some(p => p.id === GENAI_PROFILE)) throw new CatalogError('Blueprint has no Generative AI profile to put this file in.');
    const entries = rows.map(r => entryOf(r, levelOf(/Level (\d)/.exec(r.levelText)?.[1] ?? '0', `The control ${r.id}`)));
    return { source, profiles: [finish(GENAI_PROFILE, entries, opts.fileName)], notes: [] };
  }

  const profiles: IncomingProfile[] = [];
  const notes: string[] = [];
  // Generative AI is never read from the IM8 catalog: its controls come from its own file.
  for (const profile of opts.profiles.filter(p => p.id !== GENAI_PROFILE)) {
    const tag = tagPattern(profile.title);
    const entries: IncomingEntry[] = [];
    for (const r of rows) {
      const level = r.levelText
        .split(';')
        .map(part => tag.exec(part.trim())?.[1])
        .find(Boolean);
      if (level !== undefined) entries.push(entryOf(r, levelOf(level, `The control ${r.id}`)));
    }
    if (entries.length === 0) {
      notes.push(`The file has no controls for ${profile.title}, so that profile does not change.`);
      continue;
    }
    profiles.push(finish(profile.id, entries, opts.fileName));
  }
  if (profiles.length === 0) {
    throw new CatalogError(`The sheet "catalog" has no tag such as "${opts.profiles[0]?.title ?? 'Low-Risk Cloud'} - Level 1" for a profile that Blueprint knows. Check column G.`);
  }
  return { source, profiles, notes };
}

/** Reads an uploaded .xlsx file in either layout. */
export async function parseXlsx(buffer: Buffer, opts: XlsxOptions): Promise<IncomingRelease> {
  let workbook: ExcelJS.Workbook;
  try {
    workbook = await openWorkbook(buffer);
  } catch {
    throw new CatalogError(`${opts.fileName} is not an .xlsx workbook. ${LAYOUT_HELP}`);
  }
  const catalog = workbook.getWorksheet('catalog');
  const ssp = workbook.getWorksheet('ssp');
  if (catalog && !(ssp && opts.profileId)) return parseCatalog(catalog, opts);
  if (ssp) return parseSsp(ssp, opts);
  throw new CatalogError(`${opts.fileName} has no sheet named "ssp" or "catalog". ${LAYOUT_HELP}`);
}
