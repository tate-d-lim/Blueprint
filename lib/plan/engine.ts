import type {
  CoverageValue,
  FactAnswers,
  Level,
  PlainText,
  Profile,
  ProfileEntry,
  Project,
  RequirementKey,
  TaskStatus,
  Tool,
} from '../domain/types';
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
  | 'redirect'
  | 'conflict'
  | 'open'
  | 'answered-not-applicable'
  /** The person's answers about the app rule it out. */
  | 'not-for-app';

export interface Claim {
  toolId: string;
  toolName: string;
  value: CoverageValue;
  otherToolId?: string;
  otherToolName?: string;
  explanation?: string;
  builderPart?: string;
  source: string;
  verification: Verification;
}

export type ItemStatus = { status: TaskStatus; note?: string } | { applies: boolean; reason: string };

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

export interface ToolHint {
  fromToolId: string;
  suggestToolId: string;
  count: number;
}

export interface Plan {
  items: PlanItem[];
  counts: Record<Heading, number>;
  hints: ToolHint[];
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
}

export interface PlanState {
  profileId: string;
  toolIds: string[];
  facts?: FactAnswers;
}

const YOU_PLACEMENTS: Placement[] = ['shared', 'app-builder', 'default-builder', 'answered-applies'];
const QUESTION_PLACEMENTS: Placement[] = ['redirect', 'conflict', 'open'];

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

/** The sorting rules, top to bottom; the first that matches wins. */
function classify(entry: ProfileEntry, claims: Claim[], picked: Set<string>): Verdict {
  const direct = claims.filter(c => c.value !== 'other-tool');
  // A redirect to a picked tool is set aside: that tool's own claim decides.
  const openRedirects = claims.filter(
    c => c.value === 'other-tool' && !(c.otherToolId && picked.has(c.otherToolId)),
  );
  const of = (value: CoverageValue) => direct.filter(c => c.value === value);
  const names = (cs: Claim[]) => cs.map(c => c.toolName);
  const provided = of('provided');
  const notApplicable = of('not-applicable');
  const shared = of('shared');
  const builder = of('app-builder');

  if (notApplicable.length && (provided.length || shared.length || builder.length)) {
    const others = direct.filter(c => c.value !== 'not-applicable');
    return { placement: 'conflict', decisive: direct, reason: REASON.conflict(names(notApplicable), names(others)) };
  }
  if (provided.length) return { placement: 'provided', decisive: provided, reason: REASON.provided(names(provided)) };
  if (notApplicable.length) {
    return { placement: 'not-applicable', decisive: notApplicable, reason: REASON['not-applicable'](names(notApplicable)) };
  }
  if (shared.length) return { placement: 'shared', decisive: shared, reason: REASON.shared(names(shared)) };
  if (builder.length) return { placement: 'app-builder', decisive: builder, reason: REASON['app-builder'](names(builder)) };
  if (openRedirects.length) {
    const pairs = openRedirects.map(c => ({ from: c.toolName, other: c.otherToolName ?? c.otherToolId ?? 'another tool' }));
    return { placement: 'redirect', decisive: openRedirects, reason: REASON.redirect(pairs) };
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
        if (row.otherToolId !== undefined) {
          claim.otherToolId = row.otherToolId;
          claim.otherToolName = toolName(row.otherToolId);
        }
        if (row.explanation !== undefined) claim.explanation = row.explanation;
        if (row.builderPart !== undefined) claim.builderPart = row.builderPart;
        claims.push(claim);
      }

      const rule = checkRule(entry.plain?.appliesWhen, profile.facts ?? [], input.factAnswers ?? {});
      let verdict: Verdict =
        rule.state === 'skipped'
          ? { placement: 'not-for-app', decisive: [], reason: rule.reason }
          : classify(entry, claims, picked);
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
        status = project.taskStatus[entry.key] ?? { status: 'todo' };
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

  const hintCounts = new Map<string, ToolHint>();
  for (const item of items) {
    if (item.placement !== 'redirect') continue;
    for (const claim of item.decisive) {
      if (!claim.otherToolId) continue;
      const k = `${claim.toolId}>${claim.otherToolId}`;
      const hint = hintCounts.get(k) ?? { fromToolId: claim.toolId, suggestToolId: claim.otherToolId, count: 0 };
      hint.count++;
      hintCounts.set(k, hint);
    }
  }
  return { items, counts, hints: [...hintCounts.values()] };
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
