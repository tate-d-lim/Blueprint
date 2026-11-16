import type { Level, Profile, RequirementKey } from '../domain/types';
import type { Plan } from './engine';
import { resolveParameters } from './format';
import { PARTS, countsAs, partOf, type PartId } from './hotel';

/** One requirement in a part's detail list on step 4. */
export interface DetailRow {
  key: RequirementKey;
  id: string;
  /** The plain task (or question), or the official wording when there is no plain text. */
  text: string;
  /** The official title. It is the short form of a control that has no plain text. */
  title: string;
  /** The official statement with its parameters filled in. */
  official: string;
  question: boolean;
  /** 0 is a must-have, 1 a should-have. Good-to-have requirements (2) do not count, so they have no row. */
  level: Level;
  /** False when no checked plain text exists for this profile, so `text` is the official wording. */
  plainChecked: boolean;
}

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** The requirements behind each part's count: tasks and open questions only, in requirement order. */
export function needsDetails(plan: Plan, profiles: Profile[]): Record<PartId, DetailRow[]> {
  // Cloud profiles share requirement keys, so only the profiles this plan is built from may speak.
  const active = new Set(plan.items.map(i => i.profileId));
  const statements = new Map(profiles.filter(p => active.has(p._id)).flatMap(p => p.entries.map(e => [e.key, e.statement] as const)));
  const out = Object.fromEntries(PARTS.map(p => [p.id, [] as DetailRow[]])) as Record<PartId, DetailRow[]>;
  for (const item of plan.items) {
    const as = countsAs(item);
    if (as !== 'you' && as !== 'question') continue;
    const official = resolveParameters(statements.get(item.key) ?? item.rationale);
    const question = as === 'question';
    const plain = question ? (item.plain?.question ?? item.plain?.task) : item.plain?.task;
    out[partOf(item.family)].push({ key: item.key, id: item.id, text: plain ?? official, title: item.title, official, question, level: item.level, plainChecked: plain !== undefined });
  }
  for (const rows of Object.values(out)) rows.sort((a, b) => natural(a.id, b.id));
  return out;
}

/** Requirements the builder's answers about the app rule out, each with the sentence the answer wrote. */
export function skippedItems(plan: Plan): { id: string; title: string; reason: string }[] {
  return plan.items
    .filter(i => i.heading === 'skipped')
    .map(i => ({ id: i.id, title: i.plain?.title ?? i.title, reason: i.reason }))
    .sort((a, b) => natural(a.id, b.id));
}
