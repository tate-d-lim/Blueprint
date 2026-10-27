import type { CoverageValue, TaskStatus } from '../domain/types';
import type { Heading, Placement } from './engine';
import type { Verification } from './verification';

export const HEADING_TITLES: Record<Heading, string> = {
  you: 'What you need to do',
  platform: 'What your platform already does',
  questions: 'Questions to answer',
  'good-to-have': 'Good to have',
};

export function VALUE_LABEL(value: CoverageValue, toolName: string, otherToolName?: string): string {
  switch (value) {
    case 'provided':
      return `Provided by ${toolName}`;
    case 'shared':
      return `Shared (${toolName} + App Builder)`;
    case 'app-builder':
      return 'App Builder';
    case 'not-applicable':
      return 'Not applicable';
    case 'other-tool':
      return `Handled by another tool: ${otherToolName ?? 'another tool'}`;
  }
}

export const BADGE_TEXT: Record<Verification, string> = {
  verified: 'Verified',
  'govtech-published': 'Published by GovTech',
  'not-yet-verified': 'Not yet verified',
};

export const SAMPLE_BADGE = 'Sample';

export const LOCALLY_DERIVED = 'Locally derived from GovTech files received 2026-10-22; not an official GovTech release.';
export const SELF_DECLARED_NOTE = 'Statuses are self-declared by the app builder.';

/** Sub-labels under "Good to have". */
export const GOOD_TO_HAVE_LABEL: Record<Placement, string> = {
  provided: 'Handled for you',
  'not-applicable': "Doesn't apply",
  shared: 'Yours if you want it',
  'app-builder': 'Yours if you want it',
  'default-builder': 'Yours if you want it',
  'answered-applies': 'Yours if you want it',
  redirect: 'Worth checking',
  conflict: 'Worth checking',
  open: 'Worth checking',
  'answered-not-applicable': 'Worth checking',
};

export const HINT_TEXT = (from: string, to: string, n: number): string =>
  `${from} expects ${to} for ${n} requirements. Add ${to}?`;

const and = (names: string[]) => names.join(' and ');

/** One plain sentence saying why an item sits where it does. */
export const REASON = {
  provided: (tools: string[]) => `Handled by ${and(tools)}.`,
  'not-applicable': (tools: string[]) => `Doesn't apply because you use ${and(tools)}.`,
  shared: (tools: string[]) => `Shared with ${and(tools)}: you do your part, ${and(tools)} does the rest.`,
  'app-builder': (tools: string[]) => `${and(tools)} says this one is yours.`,
  'default-builder': () => 'No tool you picked covers this.',
  'answered-applies': () => 'You said this applies to your app.',
  redirect: (pairs: { from: string; other: string }[]) =>
    pairs
      .map(p => `${p.from} expects ${p.other} to handle this. Are you using ${p.other}, or handling it yourself?`)
      .join(' '),
  conflict: (naTools: string[], otherTools: string[]) =>
    `Your tools disagree: ${and(naTools)} says this doesn't apply, but ${and(otherTools)} covers it.`,
  open: () => 'Depends on your app, and no tool you picked covers it.',
  'answered-not-applicable': (reason: string) => `You said this doesn't apply: ${reason}`,
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
};
