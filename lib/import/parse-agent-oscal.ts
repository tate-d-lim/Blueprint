import type { DraftRow } from '../tool-owner/new-version';
import type { CoverageValue, Profile, RequirementKey } from '../domain/types';
import { ANSWERS } from '../export/coverage-brief-md';

export type AgentParseResult =
  | { ok: true; rows: DraftRow[]; filled: number; blank: RequirementKey[] }
  | { ok: false; error: string };

type Prop = { name?: unknown; value?: unknown };
type Requirement = { 'control-id'?: unknown; description?: unknown; props?: unknown };

const VALUES = new Set<string>(ANSWERS.map(a => a.value));
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const refuse = (error: string): AgentParseResult => ({ ok: false, error });
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Agents often hand back the template the way the brief shows it: inside a code fence, sometimes with a BOM. */
function unwrap(raw: string): string {
  const trimmed = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n').trim();
  const fenced = trimmed.match(/^```[a-z]*\n([\s\S]*?)\n?```$/i);
  return fenced ? fenced[1] : trimmed;
}

/**
 * Reads the component definition a coding agent wrote from the coverage brief, as one editor row per
 * requirement in profile order. A missing or empty answer is a blank row, never a refusal: the tool owner fills it.
 */
export function parseAgentOscal(raw: string, profile: Profile): AgentParseResult {
  let doc: unknown;
  try {
    doc = JSON.parse(unwrap(raw));
  } catch {
    return refuse("This file is not JSON. Upload the file your agent wrote.");
  }
  const definition = (doc as Record<string, unknown> | null)?.['component-definition'] as Record<string, unknown> | undefined;
  if (!definition || typeof definition !== 'object') return refuse('This file has no component definition. Check that the agent followed the brief.');
  const components = Array.isArray(definition.components) ? definition.components : [];
  if (components.length !== 1) return refuse(`This file describes ${components.length} tools. Upload one tool at a time.`);

  if (!isObject(components[0])) return refuse('This file has no component definition. Check that the agent followed the brief.');
  const implementations = components[0]['control-implementations'];
  const requirements: Requirement[] = (Array.isArray(implementations) ? implementations : [])
    .flatMap(i => (isObject(i) && Array.isArray(i['implemented-requirements']) ? i['implemented-requirements'] : []))
    .filter(isObject);

  const byId = new Map(profile.entries.map(e => [e.id.toLowerCase(), e]));
  const unknown = requirements.map(r => text(r['control-id'])).filter(id => !byId.has(id.toLowerCase()));
  if (unknown.length) return refuse(`${unknown.length} control IDs are not in ${profile.title}: ${unknown.slice(0, 5).join(', ')}`);

  const found = new Map<RequirementKey, DraftRow>();
  for (const requirement of requirements) {
    const entry = byId.get(text(requirement['control-id']).toLowerCase())!;
    if (found.has(entry.key)) return refuse(`${entry.id} appears twice.`);

    const props = new Map<string, string>();
    for (const p of (Array.isArray(requirement.props) ? requirement.props : []).filter(isObject) as Prop[]) {
      if (text(p?.value)) props.set(text(p?.name), text(p.value));
    }
    const value = (props.get('responsibility') ?? '').toLowerCase();
    if (value && !VALUES.has(value)) return refuse(`${entry.id} has the answer "${props.get('responsibility')}", which is not one of the four answers in the brief.`);

    const row: DraftRow = { key: entry.key, value: value as CoverageValue | '' };
    const description = text(requirement.description);
    const builderPart = props.get('builder-part');
    if (value === 'app-builder' && !builderPart) {
      if (description) row.builderPart = description;
    } else {
      if (description) row.explanation = description;
      if (builderPart) row.builderPart = builderPart;
    }
    if (props.get('evidence')) row.source = props.get('evidence');
    found.set(entry.key, row);
  }

  const rows = profile.entries.map(e => found.get(e.key) ?? { key: e.key, value: '' as const });
  return { ok: true, rows, filled: rows.filter(r => r.value).length, blank: rows.filter(r => !r.value).map(r => r.key) };
}
