import type { RequirementKey, Tool } from '../domain/types';
import { buildPlan, type Plan, type PlanData, type PlanState, type ProjectOverlay } from './engine';
import { countsAs, type Counted } from './hotel';
import { selectPlanInput } from './select';
import { versionVerification, type VersionPair } from './verification';

export interface ToolEffect {
  removed: { tasks: number; questions: number };
  added: { tasks: number; questions: number };
  unverified: number;
  net: number;
  noCoverage: boolean;
}

/** The items that count against the builder: tasks (`you`) and open questions. Tools' own items count as nothing here. */
const kindsOf = (plan: Plan): Map<RequirementKey, Counted> => {
  const out = new Map<RequirementKey, Counted>();
  for (const item of plan.items) {
    const as = countsAs(item);
    if (as === 'you' || as === 'question') out.set(item.key, as);
  }
  return out;
};

const bump = (side: { tasks: number; questions: number }, kind: Counted) => {
  if (kind === 'you') side.tasks++;
  else side.questions++;
};

/**
 * What one tool does for this app, from two plans: without the tool and with it. A tick changes the plan only through
 * the tool's coverage, so the numbers stay right when tools or coverage change. Each requirement counts as one.
 */
export function toolEffects(data: PlanData, state: Omit<PlanState, 'toolIds'>, ticked: string[], project?: ProjectOverlay): Record<string, ToolEffect> {
  const build = (toolIds: string[]) => {
    const input = selectPlanInput(data, { ...state, toolIds }, project);
    return { plan: buildPlan(input), versions: input.versions };
  };
  const base = build(ticked);
  const result: Record<string, ToolEffect> = {};

  for (const tool of data.tools) {
    const isTicked = ticked.includes(tool._id);
    const other = build(isTicked ? ticked.filter(id => id !== tool._id) : [...ticked, tool._id]);
    const without = isTicked ? other : base;
    const withTool = isTicked ? base : other;
    const covered = withTool.versions.some(v => v.current.toolId === tool._id);

    const before = kindsOf(without.plan);
    const after = kindsOf(withTool.plan);
    const withItems = new Map(withTool.plan.items.map(i => [i.key, i]));
    const effect: ToolEffect = { removed: { tasks: 0, questions: 0 }, added: { tasks: 0, questions: 0 }, unverified: 0, net: 0, noCoverage: !covered };

    for (const [key, kind] of before) {
      const now = after.get(key);
      if (!now) {
        bump(effect.removed, kind);
        const decisive = withItems.get(key)?.decisive ?? [];
        if (decisive.some(c => c.toolId === tool._id && c.verification === 'not-yet-verified')) effect.unverified++;
      } else if (kind === 'you' && now === 'question') {
        effect.added.questions++;
      }
    }
    for (const [key, kind] of after) if (!before.has(key)) bump(effect.added, kind);

    effect.net = effect.removed.tasks + effect.removed.questions - effect.added.tasks - effect.added.questions;
    result[tool._id] = effect;
  }
  return result;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One line that states both sides, for example "Removes 6 tasks, answers 2 questions (4 not yet verified)". */
export function effectText(e: ToolEffect, profileTitle: string): string {
  if (e.noCoverage) return `No ${profileTitle} coverage yet`;
  const addedTotal = e.added.tasks + e.added.questions;
  const removedTotal = e.removed.tasks + e.removed.questions;
  if (e.net <= 0 && addedTotal === 0) return 'Nothing for your app';

  const removed: string[] = [];
  if (e.removed.tasks) removed.push(`removes ${count(e.removed.tasks, 'task', 'tasks')}`);
  if (e.removed.questions) removed.push(`answers ${count(e.removed.questions, 'question', 'questions')}`);
  let text = removed.join(', ');
  if (text && e.unverified > 0) text += ` (${e.unverified} not yet verified)`;

  if (addedTotal) {
    const added: string[] = [];
    if (e.added.tasks) added.push(count(e.added.tasks, 'task', 'tasks'));
    if (e.added.questions) added.push(count(e.added.questions, 'question', 'questions'));
    text += `${removedTotal ? ' · ' : ''}adds ${added.join(', ')}`;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The order of the tool list, set when the step opens: tools that take more off the builder first (by net, then
 * verified before not yet verified, then name), then the rest by name.
 */
export function orderTools(tools: Tool[], effects: Record<string, ToolEffect>, versions: VersionPair[], profileId: string): { more: Tool[]; other: Tool[] } {
  const verified = (tool: Tool) => {
    const pair = versions.find(v => v.current.toolId === tool._id && v.current.profileId === profileId);
    return pair ? versionVerification(pair) !== 'not-yet-verified' : false;
  };
  const net = (tool: Tool) => effects[tool._id]?.net ?? 0;
  const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name);
  const more = tools.filter(t => net(t) >= 1).sort((a, b) => net(b) - net(a) || Number(verified(b)) - Number(verified(a)) || byName(a, b));
  const other = tools.filter(t => net(t) < 1).sort(byName);
  return { more, other };
}

/** Tasks that are new in `after`: they count as `you` there and not in `before`. */
export function tasksAdded(before: Plan, after: Plan): number {
  const was = new Set(before.items.filter(i => countsAs(i) === 'you').map(i => i.key));
  return after.items.filter(i => countsAs(i) === 'you' && !was.has(i.key)).length;
}
