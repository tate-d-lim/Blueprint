import { CatalogError, type IncomingEntry, type IncomingRelease } from './types';
import { GENAI_PROFILE, type KnownProfile } from './parse-xlsx';

interface OscalPart { name?: string; prose?: string }
interface OscalControl {
  id: string;
  title?: string;
  parts?: OscalPart[];
  props?: { name: string; value: string }[];
  links?: { text?: string }[];
}
interface OscalCatalog {
  catalog?: {
    metadata?: { 'last-modified'?: string; version?: string };
    groups?: { controls?: OscalControl[] }[];
    'back-matter'?: { resources?: { uuid: string; rlinks?: { href: string }[] }[] };
  };
}

/** True when the parsed JSON looks like an OSCAL catalog. */
export const isOscalCatalog = (json: unknown): json is OscalCatalog => !!json && typeof json === 'object' && 'catalog' in json;

/**
 * Reads an OSCAL catalog. It has wording and no levels, and it cannot say which controls a profile holds, so every
 * profile of the database (except Generative AI) gets the same list, marked `wordingOnly`.
 */
export function parseOscal(json: OscalCatalog, fileName: string, profiles: KnownProfile[]): IncomingRelease {
  const groups = json.catalog?.groups;
  if (!Array.isArray(groups)) throw new CatalogError(`${fileName} has no control groups. Blueprint reads an OSCAL catalog with "groups" and "controls".`);
  const urls = new Map<string, string>();
  for (const r of json.catalog?.['back-matter']?.resources ?? []) if (r.rlinks?.[0]?.href) urls.set(r.uuid, r.rlinks[0].href);

  // Statements keep the form the IM8 catalog file uses for parameters, `[ insert: param, x ]`, and real addresses in links.
  const prose = (text: string) =>
    text
      .replace(/\{\{\s*insert:\s*param,\s*([\w-]+)\s*\}\}/g, '[ insert: param, $1 ]')
      .replace(/\[([^\]]*)\]\(#([^)]*)\)/g, (_all, label: string, uuid: string) => (urls.has(uuid) ? `[${label}](${urls.get(uuid)})` : label));

  const entries: IncomingEntry[] = [];
  for (const group of groups) {
    for (const control of group.controls ?? []) {
      const part = (name: string) => control.parts?.find(p => p.name === name)?.prose ?? '';
      const statement = prose(part('statement'));
      if (!control.id || !statement) throw new CatalogError(`The control ${control.id ?? '(no id)'} in ${fileName} has no statement. Check the file.`);
      entries.push({
        id: control.id.toLowerCase(),
        title: control.title ?? '',
        statement,
        recommendations: prose(part('guidance')),
        rationale: control.props?.find(p => p.name === 'risk-statement')?.value ?? '',
        references: (control.links ?? []).map(l => l.text ?? '').filter(Boolean).join(';'),
      });
    }
  }
  if (entries.length === 0) throw new CatalogError(`${fileName} has no controls. Check the file.`);
  const modified = json.catalog?.metadata?.['last-modified']?.slice(0, 10);
  const targets = profiles.filter(p => p.id !== GENAI_PROFILE);
  return {
    source: { kind: 'upload', label: fileName, ...(modified ? { sourceDate: modified } : {}) },
    profiles: targets.map(p => ({ profileId: p.id, entries, wordingOnly: true as const })),
    notes: ['This file has wording only. It has no levels, so no level changes.'],
  };
}
