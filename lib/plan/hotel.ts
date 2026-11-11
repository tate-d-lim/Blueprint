import type { Plan, PlanItem } from './engine';
import { taskStatusOf } from './progress';
import { itemVerification } from './verification';

export type PartId =
  | 'rules'
  | 'cctv'
  | 'rooms'
  | 'walls'
  | 'keycards'
  | 'assistant'
  | 'inspection'
  | 'entrance'
  | 'deliveries'
  | 'safe'
  | 'generator'
  | 'frame';

export interface HotelPart {
  id: PartId;
  name: string;
  families: string[];
  summary: string;
  pieces: readonly string[];
}

/** The parts of the hotel in order, top floor to basement. The parts list and the labels use the same order. */
export const PARTS = [
  {
    id: 'rules',
    name: 'Hotel rules',
    families: ['pm', 'hr'],
    summary: 'The rules everyone follows, and who is responsible for security.',
    pieces: ['desk', 'chair', 'bookcase', 'rules-board'],
  },
  {
    id: 'cctv',
    name: 'CCTV',
    families: ['lm'],
    summary: 'A record of who did what, and when, so problems can be found and traced.',
    pieces: ['desk', 'chair', 'screen-1', 'screen-2', 'screen-3', 'screen-4', 'screen-5', 'camera'],
  },
  {
    id: 'rooms',
    name: 'Hotel rooms',
    families: ['cs'],
    summary: 'The rooms your app runs in, kept apart so a problem in one stays in one.',
    pieces: ['bed-left', 'table-left', 'lamp-left', 'tv-left', 'bed-right', 'table-right', 'lamp-right', 'tv-right'],
  },
  {
    id: 'walls',
    name: 'Walls, windows and doors',
    families: ['as'],
    summary: 'The app itself: what it lets in, and what it lets out.',
    pieces: [
      'basement-back',
      'basement-left',
      'ground-back',
      'ground-left',
      'first-back',
      'first-left',
      'first-partition',
      'top-back',
      'top-left',
      'top-partition',
    ],
  },
  {
    id: 'keycards',
    name: 'Room keycards',
    families: ['ac'],
    summary: 'Who can get in, and to which rooms.',
    pieces: ['desk-left', 'desk-right', 'screen', 'keycards', 'chair'],
  },
  {
    id: 'assistant',
    name: 'Smart assistant',
    families: ['ga'],
    summary: 'The generative AI in your app, and what it may say and do.',
    pieces: ['stand', 'screen', 'speaker'],
  },
  {
    id: 'inspection',
    name: 'Safety inspection',
    families: ['st'],
    summary: 'Tests that look for weak spots, so they are found and fixed.',
    pieces: ['extinguisher', 'board', 'checklist'],
  },
  {
    id: 'entrance',
    name: 'Entrance security',
    families: ['ns'],
    summary: 'What can reach your app from the network, and what is stopped at the door.',
    pieces: ['doorway', 'scanner-left', 'scanner-right', 'doormat'],
  },
  {
    id: 'deliveries',
    name: 'Building materials and deliveries',
    families: ['sd', 'sc', 'tp'],
    summary: 'Where your code and its parts come from, and how they are checked.',
    pieces: ['platform', 'box-1', 'box-2', 'box-3', 'box-4', 'box-5', 'sign'],
  },
  {
    id: 'safe',
    name: 'Hotel safe',
    families: ['dp', 'ck'],
    summary: 'Your data, and the keys that lock it.',
    pieces: ['vault', 'door', 'wheel'],
  },
  {
    id: 'generator',
    name: 'Standby generator',
    families: ['br', 'rs'],
    summary: 'Backups, and getting the app running again after a failure.',
    pieces: ['body', 'exhaust', 'panel'],
  },
  {
    id: 'frame',
    name: 'Foundation and frame',
    families: ['is', 'dc'],
    summary: 'The servers and cloud set-up your app stands on.',
    pieces: ['footing', 'columns-basement', 'columns-ground', 'columns-first', 'columns-top'],
  },
] as const satisfies readonly HotelPart[];

/** The area a requirement belongs to, as the task list and the build plan name it: "CCTV (Logging)". */
export function areaOf(family: string): string {
  const part = PARTS.find(p => p.id === partOf(family))!;
  return `${part.name} (${familyName(family)})`;
}

/** One name for each family of requirements on every screen. Every screen calls the items "controls". */
export const FAMILY_NAMES: Record<string, string> = {
  as: 'App security',
  sc: 'Supply chain',
  st: 'Testing',
  ns: 'Network',
  br: 'Backup',
  dp: 'Data',
  lm: 'Logging',
  ac: 'Access',
  cs: 'Containers',
  pm: 'Security programme',
  is: 'Infrastructure',
  sd: 'Secure development',
  dc: 'Datacentre',
  tp: 'Third parties',
  ck: 'Cryptography',
  ga: 'Generative AI',
  hr: 'People',
  rs: 'Resilience',
};

export const familyName = (code: string): string => FAMILY_NAMES[code] ?? code.toUpperCase();

/** The part a family belongs to. A code the table does not know goes to Hotel rules (and a test fails until the table has it). */
export function partOf(family: string): PartId {
  return PARTS.find(p => (p.families as readonly string[]).includes(family))?.id ?? 'rules';
}

export type Counted = 'you' | 'platform' | 'question';

/** What an item counts as in the hotel. Good-to-have, skipped and answered "doesn't apply" items count as nothing. */
export function countsAs(item: PlanItem): Counted | null {
  if (item.level === 2 || item.heading === 'good-to-have' || item.heading === 'skipped') return null;
  if (item.heading === 'you') return 'you';
  if (item.heading === 'platform') return 'platform';
  return item.placement === 'answered-not-applicable' ? null : 'question';
}

export type Look = 'drawing' | 'partly' | 'solid' | 'lit';
/** 'needs': nothing built yet. 'tools': the tools' part is built. 'progress': the tools' part and the builder's finished controls. */
export type HotelMode = 'needs' | 'tools' | 'progress';

export interface PartState {
  id: PartId;
  look: Look;
  share: number;
  solidPieces: number;
  question: boolean;
  nothingForApp: boolean;
  counts: { you: number; platform: number; questions: number; unverified: number; done: number };
  toolNames: string[];
  families: string[];
  line1: string;
  line2: string;
  areaName: string;
}

/** How many of a part's pieces are solid. Partly done always shows at least one solid and one drawn piece. */
export function solidPieces(share: number, pieces: number): number {
  if (share <= 0) return 0;
  if (share >= 1) return pieces;
  return Math.min(pieces - 1, Math.max(1, Math.round(share * pieces)));
}

/** Every part, except the Smart assistant when the plan has no generative AI requirement. */
export function visibleParts(plan: Plan): HotelPart[] {
  const hasGenAi = plan.items.some(i => i.family === 'ga');
  return PARTS.filter(p => p.id !== 'assistant' || hasGenAi);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function partState(part: HotelPart, plan: Plan, mode: HotelMode): PartState {
  const counting = plan.items
    .filter(i => partOf(i.family) === part.id)
    .flatMap(item => {
      const as = countsAs(item);
      return as ? [{ item, as }] : [];
    });
  const of = (as: Counted) => counting.filter(c => c.as === as).map(c => c.item);
  const you = of('you');
  const platform = of('platform');
  const questions = of('question');
  const unverified = platform.filter(i => itemVerification(i) === 'not-yet-verified').length;
  const done = you.filter(i => taskStatusOf(i) === 'done').length;
  const total = you.length + platform.length + questions.length;
  const nothingForApp = total === 0;

  // What is finished: what the tools do, and in 'progress' mode what the builder has done as well.
  const finished = platform.length + (mode === 'progress' ? done : 0);
  const share = mode === 'needs' || total === 0 ? 0 : finished / total;

  const toolNames: string[] = [];
  for (const item of platform) for (const claim of item.decisive) if (!toolNames.includes(claim.toolName)) toolNames.push(claim.toolName);

  const open = you.length + questions.length;
  const toolsVerified = platform.every(i => i.decisive.every(c => c.verification !== 'not-yet-verified'));
  let look: Look = 'drawing';
  if (mode === 'tools' && platform.length > 0) {
    if (open > 0) look = 'partly';
    else look = toolsVerified ? 'lit' : 'solid';
  }
  if (mode === 'progress' && total > 0 && finished > 0) {
    if (finished < total) look = 'partly';
    // The warm light is for a part the tools did completely, with every claim verified. The builder's own work is self-declared.
    else look = done === 0 && toolsVerified ? 'lit' : 'solid';
  }

  const withItems = part.families.filter(f => counting.some(c => c.item.family === f));
  const familyCodes = withItems.length ? withItems : [part.families[0]];
  const families = familyCodes.map(familyName);

  let line2: string;
  if (nothingForApp) line2 = 'Nothing for your app';
  else if (mode === 'progress') {
    const segments = [`${finished} of ${total} done`];
    if (questions.length) segments.push(plural(questions.length, 'question', 'questions'));
    if (finished === total && unverified > 0) segments.push('not yet verified');
    line2 = segments.join(' · ');
  } else if (mode === 'needs') {
    line2 = plural(open, 'control', 'controls');
    if (questions.length) line2 += ` · ${plural(questions.length, 'question', 'questions')}`;
  } else {
    const segments: string[] = [];
    const tool = toolNames.length === 1 ? toolNames[0] : null;
    if (you.length) segments.push(`${you.length} yours`);
    if (platform.length && open > 0) segments.push(`${tool ?? 'your tools'} ${tool ? 'does' : 'do'} ${platform.length}`);
    if (look === 'solid') segments.push(`${tool ?? 'Your tools'} ${tool ? 'does' : 'do'} all · ${unverified} not yet verified`);
    if (look === 'lit') segments.push(`${tool ?? 'Your tools'} ${tool ? 'does' : 'do'} all`);
    if (questions.length) segments.push(plural(questions.length, 'question', 'questions'));
    line2 = segments.join(' · ');
  }

  return {
    id: part.id,
    look: nothingForApp ? 'drawing' : look,
    share,
    solidPieces: solidPieces(share, part.pieces.length),
    question: questions.length > 0,
    nothingForApp,
    counts: { you: you.length, platform: platform.length, questions: questions.length, unverified, done },
    toolNames,
    families,
    line1: `${part.name} · ${families.join(', ')}`,
    line2,
    areaName: `${part.name} (${families.join(', ')})`,
  };
}

export function planTotals(plan: Plan): {
  you: number;
  platform: number;
  unverified: number;
  questions: number;
  parts: number;
  /** Every control the app needs: the builder's, the tools' and the open questions. */
  total: number;
  /** What is finished: everything the tools do, plus the builder's controls marked done. */
  done: number;
} {
  const states = visibleParts(plan).map(p => partState(p, plan, 'tools'));
  const sum = (k: 'you' | 'platform' | 'questions' | 'unverified' | 'done') => states.reduce((n, s) => n + s.counts[k], 0);
  const you = sum('you');
  const platform = sum('platform');
  const questions = sum('questions');
  return {
    you,
    platform,
    unverified: sum('unverified'),
    questions,
    parts: states.filter(s => !s.nothingForApp).length,
    total: you + platform + questions,
    done: platform + sum('done'),
  };
}

type Totals = ReturnType<typeof planTotals>;

export function runningLine(t: Totals): string {
  const unverified = t.unverified > 0 ? ` (${t.unverified} not yet verified)` : '';
  return `${t.you} are yours · ${t.platform} your tools do${unverified} · ${plural(t.questions, 'question', 'questions')}`;
}

/** The line on the needs screen. A saved project has its tools already, so only a new plan is told to pick them. */
export function needsLine(t: Totals, saved = false): string {
  const base = `Your app needs ${t.you + t.questions} controls, in ${t.parts} parts.`;
  return saved ? base : `${base} After you save, pick the tools that do some of them for you.`;
}
