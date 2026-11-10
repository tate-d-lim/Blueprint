import type { Profile, RequirementKey } from '../domain/types';
import type { Plan } from './engine';
import { resolveParameters } from './format';
import { PARTS, countsAs, partOf, type PartId } from './hotel';

/** One requirement in a part's detail list on step 4. */
export interface DetailRow {
  key: RequirementKey;
  id: string;
  /** The plain task (or question), or the official wording when there is no plain text. */
  text: string;
  /** The official statement with its parameters filled in. */
  official: string;
  question: boolean;
  /** False when no checked plain text exists for this profile, so `text` is the official wording. */
  plainChecked: boolean;
}

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** The requirements behind each part's count: tasks and open questions only, in requirement order. */
export function needsDetails(plan: Plan, profiles: Profile[]): Record<PartId, DetailRow[]> {
  const statements = new Map(profiles.flatMap(p => p.entries.map(e => [e.key, e.statement] as const)));
  const out = Object.fromEntries(PARTS.map(p => [p.id, [] as DetailRow[]])) as Record<PartId, DetailRow[]>;
  for (const item of plan.items) {
    const as = countsAs(item);
    if (as !== 'you' && as !== 'question') continue;
    const official = resolveParameters(statements.get(item.key) ?? item.rationale);
    const question = as === 'question';
    const plain = question ? (item.plain?.question ?? item.plain?.task) : item.plain?.task;
    out[partOf(item.family)].push({ key: item.key, id: item.id, text: plain ?? official, official, question, plainChecked: plain !== undefined });
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
