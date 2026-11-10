import type { Plan, PlanInput, PlanItem } from '../plan/engine';
import { PARTS, partOf, partState } from '../plan/hotel';
import { STATUS_LABEL } from '../plan/labels';
import { itemVerification, versionVerification, type Verification } from '../plan/verification';

export interface BuildPlanMeta {
  title: string;
  appType: string;
  profileTitle: string;
  tools: { name: string; version: number; verification: Verification }[];
  generatedAt: string;
}

export const AGENT_SNIPPET = [
  '## Security build plan',
  'Read BUILD-PLAN.md before writing code. Treat section 1 as required work, ask me before building',
  'anything in section 2, and never build what section 3 lists; use the named platform instead.',
].join('\n');

/** Collapses whitespace and strips leading # and > so free text can't turn into Markdown structure. */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/^[#>\s]+/, '');
}

/** The picked tools as the build plan header lists them. A tool with no coverage for the profile has version 0. */
export function toolsForMeta(input: PlanInput, profileId: string): BuildPlanMeta['tools'] {
  return input.pickedTools.map(tool => {
    const pair = input.versions.find(v => v.current.toolId === tool._id && v.current.profileId === profileId);
    return {
      name: tool.name,
      version: pair?.current.version ?? 0,
      verification: pair ? versionVerification(pair) : 'not-yet-verified',
    };
  });
}

const VERIFICATION_WORDS: Record<Verification, string> = {
  verified: 'verified',
  'govtech-published': 'published by GovTech',
  'not-yet-verified': 'not yet verified',
};

const titleOf = (item: PlanItem) => oneLine(item.plain?.title ?? item.title);
const flag = (item: PlanItem) => (itemVerification(item) === 'not-yet-verified' ? ' (not yet verified)' : '');

function toolsLine(tools: BuildPlanMeta['tools']): string {
  if (tools.length === 0) return 'Tools: none picked.';
  const parts = tools.map(t => (t.version === 0 ? `${t.name} (no coverage recorded)` : `${t.name} v${t.version} (${VERIFICATION_WORDS[t.verification]})`));
  return `Tools: ${parts.join(', ')}.`;
}

function taskBlock(item: PlanItem): string[] {
  const shared = item.decisive.filter(c => c.value === 'shared');
  const yourPart = item.decisive.map(c => c.builderPart).find(Boolean) ?? item.plain?.task ?? item.recommendations;
  const lines = [`#### ${titleOf(item)} (${item.id})${flag(item)}`];
  lines.push(`Why it matters: ${oneLine(item.plain?.why ?? item.rationale)}`);
  if (yourPart) lines.push(`What to do: ${oneLine(yourPart)}`);
  for (const claim of shared) {
    const label = shared.length === 1 ? "Platform's part" : `Platform's part (${claim.toolName})`;
    lines.push(`${label}: ${oneLine(claim.explanation ?? `Handled by ${claim.toolName}.`)}`);
  }
  const status = item.status && 'status' in item.status ? item.status : { status: 'todo' as const };
  lines.push(`Status: ${STATUS_LABEL[status.status]}`);
  if ('note' in status && status.note) lines.push(`Note: ${oneLine(status.note)}`);
  return lines;
}

function platformSection(items: PlanItem[]): string[] {
  const groups = new Map<string, PlanItem[]>();
  const notApplicable: PlanItem[] = [];
  for (const item of items) {
    if (item.placement === 'not-applicable') {
      notApplicable.push(item);
      continue;
    }
    const tool = item.decisive[0]?.toolName ?? 'Other';
    groups.set(tool, [...(groups.get(tool) ?? []), item]);
  }
  const line = (item: PlanItem) =>
    `- ${titleOf(item)} (${item.id}): ${oneLine(item.decisive.find(c => c.explanation)?.explanation ?? item.reason)}${flag(item)}`;
  const out: string[] = [];
  for (const [tool, list] of groups) out.push(`#### ${oneLine(tool)}`, ...list.map(line), '');
  if (notApplicable.length) out.push("#### Doesn't apply on your platform", ...notApplicable.map(line), '');
  return out;
}

/**
 * Items grouped by hotel part, in hotel order, parts with no items left out. The area name is the same one the plan
 * page uses: the part and the families the plan has in it, for example "CCTV (Logging)".
 */
function byArea(items: PlanItem[], plan: Plan): { area: string; items: PlanItem[] }[] {
  return PARTS.flatMap(part => {
    const list = items.filter(i => partOf(i.family) === part.id);
    return list.length ? [{ area: partState(part, plan, 'tools').areaName, items: list }] : [];
  });
}

export function renderBuildPlan(plan: Plan, meta: BuildPlanMeta): string {
  const level01 = plan.items.filter(i => i.level < 2);
  const you = level01.filter(i => i.heading === 'you');
  const asks = level01.filter(i => i.heading === 'questions' && ['redirect', 'conflict', 'open'].includes(i.placement));
  const platform = level01.filter(i => i.heading === 'platform');
  const skipped = level01.filter(i => i.heading === 'skipped');

  const lines = [
    `# Build plan: ${oneLine(meta.title)}`,
    '',
    `App type: ${meta.appType} (IM8 ${meta.profileTitle}).`,
    toolsLine(meta.tools),
    `Generated ${meta.generatedAt.slice(0, 10)} by the CPFB build plan app. IDs in brackets are IM8 requirement IDs.`,
    '',
    '## How to use this plan',
    '- Section 1 is required work. When you finish an item, mention its ID in the commit or PR description.',
    "- Before building anything section 2 asks about, ask the person you're working with.",
    "- Never build what section 3 lists. Use the platform's feature instead.",
    '',
    `## 1. What you need to do (${you.length})`,
    '',
    ...byArea(you, plan).flatMap(g => [`### ${g.area}`, '', ...g.items.flatMap(item => [...taskBlock(item), ''])]),
    `## 2. Ask a person first (${asks.length})`,
    '',
    ...byArea(asks, plan).flatMap(g => [
      `### ${g.area}`,
      '',
      ...g.items.map(item => {
        const question = item.plain?.question ?? `Does "${titleOf(item)}" apply to your app, and who handles it?`;
        return `- **${oneLine(question)}** (${item.id}). Why we ask: ${oneLine(item.reason)}`;
      }),
      '',
    ]),
    `## 3. Don't build this: your platform already does it (${platform.length})`,
    '',
    ...byArea(platform, plan).flatMap(g => [`### ${g.area}`, '', ...platformSection(g.items)]),
    ...(skipped.length
      ? [
          `## 4. Doesn't apply to this app (${skipped.length})`,
          '',
          "The person's answers about the app rule these out. Don't build them.",
          '',
          ...skipped.map(item => `- ${titleOf(item)} (${item.id}): ${oneLine(item.reason)}`),
        ]
      : []),
  ];
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
