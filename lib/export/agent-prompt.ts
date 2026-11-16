import type { Plan } from '../plan/engine';
import { countsAs } from '../plan/hotel';
import { taskStatusOf } from '../plan/progress';

/** What the prompt says about one project. */
export interface AgentPromptInput {
  appName: string;
  /** The IM8 profile titles the plan is built from. */
  profiles: string[];
  /** The picked tools, each with the number of controls it does. */
  tools: { name: string; controls: number }[];
  /** Controls in state "planned" that are the builder's. */
  planned: number;
  /** Controls that say "Needs assessment". */
  needsAssessment: number;
}

/** The placements the SSP writes as "planned" or "implemented" for the builder's own part (see `buildSsp`). */
const BUILDER_PLACEMENTS = ['shared', 'app-builder', 'default-builder', 'answered-applies'];

const controls = (n: number) => `${n} ${n === 1 ? 'control' : 'controls'}`;

/**
 * The numbers of the prompt. The planned controls are counted the way the SSP states them. The controls of a tool are
 * counted the way the project page counts "by your tools", so the prompt and the page give the same number.
 */
export function agentPromptInput(input: { appName: string; profiles: string[]; plan: Plan; tools: { id: string; name: string }[] }): AgentPromptInput {
  const { plan } = input;
  const planned = plan.items.filter(i => BUILDER_PLACEMENTS.includes(i.placement) && taskStatusOf(i) === 'todo').length;
  return {
    appName: input.appName,
    profiles: input.profiles,
    tools: input.tools.map(t => ({
      name: t.name,
      controls: plan.items.filter(i => countsAs(i) === 'platform' && i.decisive.some(c => c.toolId === t.id)).length,
    })),
    planned,
    needsAssessment: plan.items.filter(i => i.placement === 'open').length,
  };
}

/**
 * The prompt a builder gives a coding agent, with the security plan (SSP) attached. The SSP is the plan: each control
 * has a state ("planned" or "implemented") and, for the builder's own controls, what to do and why.
 */
export function buildAgentPrompt(input: AgentPromptInput): string {
  const { appName, profiles, tools, planned, needsAssessment } = input;
  const lines = [
    'Read the attached security plan (SSP) before you write any code.',
    `It is the security plan for "${appName}". It lists every security control for the app, and the state of each one.`,
    '',
    `${profiles.length === 1 ? 'IM8 profile' : 'IM8 profiles'}: ${profiles.join(' and ')}.`,
    '',
  ];
  if (tools.length === 0) {
    lines.push('This app uses no tools. All the controls are mine.');
  } else {
    lines.push('Tools this app uses:');
    for (const t of tools) lines.push(`- ${t.name} does ${controls(t.controls)}.`);
  }
  lines.push(
    '',
    planned === 0
      ? 'No control is in state "planned" for me.'
      : `${controls(planned)} ${planned === 1 ? 'is' : 'are'} in state "planned" for me.`,
    '',
    'Rules:',
    `- Do the controls in state "planned". Each one says what to do and why it matters.`,
    '- Leave the controls in state "implemented". A tool or I did them already.',
  );
  if (tools.length > 0) lines.push('- Use each tool for what it does. Do not build that again.');
  if (needsAssessment > 0) lines.push('- Ask me before you start a control that says "Needs assessment".');
  lines.push('', 'When you finish a control, tell me which one, so I can mark it done.');
  return lines.join('\n');
}
