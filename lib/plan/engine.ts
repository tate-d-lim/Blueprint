import type { CatalogRelease, CoverageCheck, CoverageValue, FactAnswers, Level, PlainText, Profile, ProfileEntry, Project, RequirementKey, TaskState, Tool } from '../domain/types';
import { checkRule } from './facts';
import { REASON } from './labels';
import { rowVerification, type Verification, type VersionPair } from './verification';

export type Heading = 'you' | 'platform' | 'questions' | 'skipped' | 'good-to-have';
export type Placement =
  | 'provided'
  | 'not-applicable'
  | 'shared'
  | 'app-builder'
  | 'default-builder'
  | 'answered-applies'
  | 'open'
  | 'answered-not-applicable'
  /** The person's answers about the app rule it out. */
  | 'not-for-app';

export interface Claim {
  toolId: string;
  toolName: string;
  value: CoverageValue;
  explanation?: string;
  builderPart?: string;
  checks?: CoverageCheck[];
  source: string;
  verification: Verification;
}

export type ItemStatus = TaskState | { applies: boolean; reason: string };

export interface PlanItem {
  key: RequirementKey;
  profileId: string;
  id: string;
  family: string;
  title: string;
  plain?: PlainText;
  /** Official wording, used where the plain-language text is missing. */
  rationale: string;
  recommendations: string;
  level: Level;
  heading: Heading;
  placement: Placement;
  /** Every picked tool's row for this requirement, kept even when outranked. */
  claims: Claim[];
  /** The claims that set the placement. */
  decisive: Claim[];
  reason: string;
  status?: ItemStatus;
}

export interface Plan {
  items: PlanItem[];
  counts: Record<Heading, number>;
}

export type ProjectOverlay = Pick<Project, 'taskStatus' | 'questionAnswers'>;

export interface PlanInput {
  profiles: Profile[];
  pickedTools: Tool[];
  allTools: Tool[];
  versions: VersionPair[];
  project?: ProjectOverlay;
  /** What the person said about the app; with no answers every requirement applies. */
  factAnswers?: FactAnswers;
}

export interface PlanData {
  profiles: Profile[];
  tools: Tool[];
  versions: VersionPair[];
  /** The applied catalog releases. The plan does not read them; the notices about a catalog change do. */
  releases?: CatalogRelease[];
}

export interface PlanState {
  profileId: string;
  toolIds: string[];
  facts?: FactAnswers;
}

const YOU_PLACEMENTS: Placement[] = ['shared', 'app-builder', 'default-builder', 'answered-applies'];
const QUESTION_PLACEMENTS: Placement[] = ['open'];

function headingOf(placement: Placement, level: Level): Heading {
  if (level === 2) return 'good-to-have';
  if (placement === 'not-for-app') return 'skipped';
  if (placement === 'provided' || placement === 'not-applicable') return 'platform';
  if (YOU_PLACEMENTS.includes(placement)) return 'you';
  return 'questions';
}

interface Verdict {
  placement: Placement;
  decisive: Claim[];
  reason: string;
}

/**
 * The sorting rules, top to bottom; the first that matches wins. "Does not apply" counts only when every picked tool that
 * speaks of the requirement says so: a tool that does the work, or leaves a part to the builder, outranks one that says it
 * does not apply to it. The builder is never left to settle a disagreement between tools.
 */
function classify(entry: ProfileEntry, claims: Claim[]): Verdict {
  const of = (value: CoverageValue) => claims.filter(c => c.value === value);
  const names = (cs: Claim[]) => cs.map(c => c.toolName);
  const provided = of('provided');
  const notApplicable = of('not-applicable');
  const shared = of('shared');
  const builder = of('app-builder');

  if (provided.length) return { placement: 'provided', decisive: provided, reason: REASON.provided(names(provided)) };
  if (shared.length) return { placement: 'shared', decisive: shared, reason: REASON.shared(names(shared)) };
  if (builder.length) return { placement: 'app-builder', decisive: builder, reason: REASON['app-builder'](names(builder)) };
  if (notApplicable.length) {
    return { placement: 'not-applicable', decisive: notApplicable, reason: REASON['not-applicable'](names(notApplicable)) };
  }
  if (entry.ifUncovered === 'app-builder') return { placement: 'default-builder', decisive: [], reason: REASON['default-builder']() };
  return { placement: 'open', decisive: [], reason: REASON.open() };
}

export function buildPlan(input: PlanInput): Plan {
  const nameOf = new Map(input.allTools.map(t => [t._id, t.name]));
  const toolName = (id: string) => nameOf.get(id) ?? id;
  const picked = new Set(input.pickedTools.map(t => t._id));
  const items: PlanItem[] = [];

  for (const profile of input.profiles) {
    const pairs = input.versions.filter(p => p.current.profileId === profile._id && picked.has(p.current.toolId));
    for (const entry of profile.entries) {
      const claims: Claim[] = [];
      for (const pair of pairs) {
        const row = pair.current.entries.find(e => e.key === entry.key);
        if (!row) continue;
        const claim: Claim = {
          toolId: pair.current.toolId,
          toolName: toolName(pair.current.toolId),
          value: row.value,
          source: row.source ?? pair.current.source,
          verification: rowVerification(entry.key, pair),
        };
        if (row.explanation !== undefined) claim.explanation = row.explanation;
        if (row.builderPart !== undefined) claim.builderPart = row.builderPart;
        if (row.checks?.length) claim.checks = row.checks;
        claims.push(claim);
      }

      const rule = checkRule(entry.plain?.appliesWhen, profile.facts ?? [], input.factAnswers ?? {});
      let verdict: Verdict =
        rule.state === 'skipped'
          ? { placement: 'not-for-app', decisive: [], reason: rule.reason }
          : classify(entry, claims);
      // An answer that confirms the requirement applies settles a question nothing else could.
      if (rule.state === 'applies' && rule.confirmed && verdict.placement === 'open') {
        verdict = { placement: 'default-builder', decisive: [], reason: REASON.confirmed() };
      }
      let status: ItemStatus | undefined;
      const project = input.project;
      if (project && entry.level < 2 && QUESTION_PLACEMENTS.includes(verdict.placement)) {
        const answer = project.questionAnswers[entry.key];
        if (answer?.applies) {
          verdict = { placement: 'answered-applies', decisive: [], reason: REASON['answered-applies']() };
        } else if (answer && !answer.applies) {
          verdict = { placement: 'answered-not-applicable', decisive: [], reason: REASON['answered-not-applicable'](answer.reason) };
          status = { applies: false, reason: answer.reason };
        }
      }
      if (project && YOU_PLACEMENTS.includes(verdict.placement)) {
        const saved = project.taskStatus[entry.key];
        // Projects saved before "done or not done" may hold 'in-progress'. That reads as not done.
        status = saved ? { ...saved, status: saved.status === 'done' ? 'done' : 'todo' } : { status: 'todo' };
      }

      const item: PlanItem = {
        key: entry.key,
        profileId: profile._id,
        id: entry.id,
        family: entry.family,
        title: entry.title,
        rationale: entry.rationale,
        recommendations: entry.recommendations,
        level: entry.level,
        heading: headingOf(verdict.placement, entry.level),
        placement: verdict.placement,
        claims,
        decisive: verdict.decisive,
        reason: verdict.reason,
      };
      if (entry.plain) item.plain = entry.plain;
      if (status) item.status = status;
      items.push(item);
    }
  }

  assertEachOnce(items);

  const counts: Record<Heading, number> = { you: 0, platform: 0, questions: 0, skipped: 0, 'good-to-have': 0 };
  for (const item of items) counts[item.heading]++;

  return { items, counts };
}

/** Every active requirement must appear exactly once. */
function assertEachOnce(items: PlanItem[]): void {
  if (process.env.NODE_ENV === 'production') return;
  const seen = new Set<string>();
  for (const item of items) {
    const id = `${item.profileId}|${item.key}`;
    if (seen.has(id)) throw new Error(`Requirement ${item.id} (${item.key}) appears more than once in the plan`);
    seen.add(id);
  }
}
