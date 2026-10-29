import type { DraftRow } from '../admin/new-version';
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

/** Agents often hand back the template the way the brief shows it: inside a code fence, sometimes with a BOM. */
function unwrap(raw: string): string {
  const trimmed = raw.replace(/^﻿/, '').trim();
  const fenced = trimmed.match(/^```[a-z]*\n([\s\S]*?)\n?```$/i);
  return fenced ? fenced[1] : trimmed;
}

/**
 * Reads the component definition a coding agent wrote from the coverage brief, as one editor row per
 * requirement in profile order. A missing or empty answer is a blank row, never a refusal: the admin fills it.
 */
export function parseAgentOscal(raw: string, profile: Profile, toolId: string, otherToolIds: string[]): AgentParseResult {
  let doc: unknown;
  try {
    doc = JSON.parse(unwrap(raw));
  } catch {
    return refuse("This file isn't JSON. Upload the file your agent wrote.");
  }
  const definition = (doc as Record<string, unknown> | null)?.['component-definition'] as Record<string, unknown> | undefined;
  if (!definition || typeof definition !== 'object') return refuse('This file has no component definition. Check that the agent followed the brief.');
  const components = Array.isArray(definition.components) ? definition.components : [];
  if (components.length !== 1) return refuse(`This file describes ${components.length} tools. Upload one tool at a time.`);

  const implementations = (components[0] as Record<string, unknown>)['control-implementations'];
  const requirements: Requirement[] = (Array.isArray(implementations) ? implementations : []).flatMap(i =>
    Array.isArray(i?.['implemented-requirements']) ? i['implemented-requirements'] : [],
  );

  const byId = new Map(profile.entries.map(e => [e.id.toLowerCase(), e]));
  const unknown = requirements.map(r => text(r['control-id'])).filter(id => !byId.has(id.toLowerCase()));
  if (unknown.length) return refuse(`${unknown.length} requirement IDs aren't in ${profile.title}: ${unknown.slice(0, 5).join(', ')}`);

  const tools = new Set(otherToolIds.filter(id => id !== toolId));
  const found = new Map<RequirementKey, DraftRow>();
  for (const requirement of requirements) {
    const entry = byId.get(text(requirement['control-id']).toLowerCase())!;
    if (found.has(entry.key)) return refuse(`${entry.id} appears twice.`);

    const props = new Map<string, string>();
    for (const p of (Array.isArray(requirement.props) ? requirement.props : []) as Prop[]) {
      if (text(p?.value)) props.set(text(p?.name), text(p.value));
    }
    const value = (props.get('responsibility') ?? '').toLowerCase();
    if (value && !VALUES.has(value)) return refuse(`${entry.id} has the answer "${props.get('responsibility')}", which isn't one of the five answers in the brief.`);
    const handledBy = props.get('handled-by');
    if (handledBy && !tools.has(handledBy)) return refuse(`${entry.id} says another tool handles it, but "${handledBy}" isn't a tool here.`);

    const row: DraftRow = { key: entry.key, value: value as CoverageValue | '' };
    const description = text(requirement.description);
    const builderPart = props.get('builder-part');
    if (handledBy) row.otherToolId = handledBy;
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
