import type { CoverageValue, TaskStatus } from '../domain/types';
import type { Heading, Placement } from './engine';
import type { Verification } from './verification';

export const HEADING_TITLES: Record<Heading, string> = {
  you: 'What you need to do',
  platform: 'What your platform already does',
  questions: 'Questions to answer',
  skipped: "Does not apply to your app",
  'good-to-have': 'Good to have',
};

export function VALUE_LABEL(value: CoverageValue, toolName: string): string {
  switch (value) {
    case 'provided':
      return `Provided by ${toolName}`;
    case 'shared':
      return `Shared (${toolName} + App Builder)`;
    case 'app-builder':
      return 'App Builder';
    case 'not-applicable':
      return 'Not applicable';
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
  'not-applicable': "Does not apply",
  shared: 'Yours if you want it',
  'app-builder': 'Yours if you want it',
  'default-builder': 'Yours if you want it',
  'answered-applies': 'Yours if you want it',
  conflict: 'Worth checking',
  open: 'Worth checking',
  'answered-not-applicable': 'Worth checking',
  'not-for-app': "Does not apply",
};

const and = (names: string[]) => names.join(' and ');

/** One plain sentence saying why an item sits where it does. */
export const REASON = {
  provided: (tools: string[]) => `Handled by ${and(tools)}.`,
  'not-applicable': (tools: string[]) => `Does not apply because you use ${and(tools)}.`,
  shared: (tools: string[]) => `Shared with ${and(tools)}: you do your part, ${and(tools)} does the rest.`,
  'app-builder': (tools: string[]) => `${and(tools)} says this one is yours.`,
  'default-builder': () => 'No tool you picked covers this.',
  'answered-applies': () => 'You said this applies to your app.',
  confirmed: () => 'You said this applies to your app.',
  conflict: (naTools: string[], otherTools: string[]) =>
    `Your tools disagree: ${and(naTools)} says this does not apply, but ${and(otherTools)} covers it.`,
  open: () => 'Depends on your app, and no tool you picked covers it.',
  'answered-not-applicable': (reason: string) => `You said this does not apply: ${reason}`,
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Not done',
  done: 'Done',
};
