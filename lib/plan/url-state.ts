import { z } from 'zod';
import type { FactAnswers } from '../domain/types';
import type { Classification, Downstream, Impact, RiskAnswers, Sensitivity } from '../risk/assess';
import { parseFactAnswers, writeFactAnswers } from './facts';

const CLASSIFICATION = {
  open: 'official-open',
  closed: 'official-closed',
  restricted: 'restricted',
  'conf-ce': 'confidential-cloud-eligible',
  conf: 'confidential',
  's-class': 's-class',
} as const satisfies Record<string, Classification>;
const SENSITIVITY = { ns: 'non-sensitive', sn: 'sensitive-normal', sh: 'sensitive-high' } as const satisfies Record<string, Sensitivity>;
const IMPACT = {
  none: 'none',
  slight: 'slight',
  moderate: 'moderate',
  significant: 'significant',
  critical: 'critical',
} as const satisfies Record<string, Impact>;
const DOWNSTREAM = { min: 'minimal', sig: 'significant' } as const satisfies Record<string, Downstream>;

const codeFor = <T extends string>(table: Record<string, T>, value: T): string =>
  Object.keys(table).find(code => table[code] === value) ?? '';

/** The query string (without "?") that carries a builder's answers and tool picks. */
export function planQuery(answers: RiskAnswers, toolIds: string[], facts: FactAnswers = {}): string {
  const ticks = [answers.cii ? 'cii' : '', answers.sii ? 'sii' : ''].filter(Boolean).join(',');
  return [
    `c=${codeFor(CLASSIFICATION, answers.classification)}`,
    `s=${codeFor(SENSITIVITY, answers.sensitivity)}`,
    `i=${codeFor(IMPACT, answers.impact)}`,
    `d=${codeFor(DOWNSTREAM, answers.downstream)}`,
    `k=${ticks}`,
    `t=${toolIds.map(encodeURIComponent).join(',')}`,
    ...(Object.keys(facts).length ? [`f=${writeFactAnswers(facts)}`] : []),
  ].join('&');
}

const oneOf = <T extends Record<string, string>>(table: T) => z.enum(Object.keys(table) as [keyof T & string]).transform(code => table[code]);
const list = (s: string) => s.split(',').filter(Boolean);

const schema = z.object({
  c: oneOf(CLASSIFICATION),
  s: oneOf(SENSITIVITY),
  i: oneOf(IMPACT),
  d: oneOf(DOWNSTREAM),
  k: z.string().default('').transform(list).pipe(z.array(z.enum(['cii', 'sii']))),
  t: z.string().default('').transform(list),
  f: z.string().default('').transform(parseFactAnswers),
});

type SearchParams = Record<string, string | string[] | undefined>;

/** Reads a plan link. Returns null when the answers are missing or invalid; unknown or repeated tool IDs are dropped. */
export function parsePlanQuery(
  sp: SearchParams,
  knownToolIds: string[],
): { answers: RiskAnswers; toolIds: string[]; facts: FactAnswers } | null {
  const first = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = schema.safeParse(first);
  if (!parsed.success) return null;
  const { c, s, i, d, k, t, f } = parsed.data;
  const known = new Set(knownToolIds);
  const toolIds = [...new Set(t.map(decodeURIComponentSafe))].filter(id => known.has(id));
  return {
    answers: { classification: c, sensitivity: s, impact: i, downstream: d, cii: k.includes('cii'), sii: k.includes('sii') },
    toolIds,
    facts: f,
  };
}

const PROJECT_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * The query string (without "?") for steps 1–4. It carries the risk answers that are known, the facts, and the saved
 * project being edited. It never carries tools: those are on the project only.
 */
export function startQuery(answers: Partial<RiskAnswers>, facts: FactAnswers = {}, projectId?: string): string {
  const parts: string[] = [];
  const put = (key: string, table: Record<string, string>, value: string | undefined) => {
    if (value !== undefined) parts.push(`${key}=${codeFor(table, value)}`);
  };
  put('c', CLASSIFICATION, answers.classification);
  put('s', SENSITIVITY, answers.sensitivity);
  put('i', IMPACT, answers.impact);
  put('d', DOWNSTREAM, answers.downstream);
  if (answers.cii !== undefined || answers.sii !== undefined) {
    parts.push(`k=${[answers.cii ? 'cii' : '', answers.sii ? 'sii' : ''].filter(Boolean).join(',')}`);
  }
  if (Object.keys(facts).length) parts.push(`f=${writeFactAnswers(facts)}`);
  if (projectId && PROJECT_ID.test(projectId)) parts.push(`project=${projectId}`);
  return parts.join('&');
}

/**
 * Reads a step link. Each key is read on its own, so one bad value is dropped and the rest stay. `complete` is set only
 * when all four choices parse. CII and SII are `false` when `k` is in the link and absent when it is not.
 */
export function parseStartQuery(sp: SearchParams): {
  answers: Partial<RiskAnswers>;
  complete: RiskAnswers | null;
  facts: FactAnswers;
  projectId: string | null;
} {
  const first = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const answers: Partial<RiskAnswers> = {};
  const c = oneOf(CLASSIFICATION).safeParse(first('c'));
  if (c.success) answers.classification = c.data;
  const s = oneOf(SENSITIVITY).safeParse(first('s'));
  if (s.success) answers.sensitivity = s.data;
  const i = oneOf(IMPACT).safeParse(first('i'));
  if (i.success) answers.impact = i.data;
  const d = oneOf(DOWNSTREAM).safeParse(first('d'));
  if (d.success) answers.downstream = d.data;
  const k = first('k');
  if (k !== undefined) {
    const ticks = list(k);
    answers.cii = ticks.includes('cii');
    answers.sii = ticks.includes('sii');
  }
  const complete =
    answers.classification && answers.sensitivity && answers.impact && answers.downstream
      ? ({ ...answers, cii: answers.cii ?? false, sii: answers.sii ?? false } as RiskAnswers)
      : null;
  const project = first('project');
  return {
    answers,
    complete,
    facts: parseFactAnswers(first('f') ?? ''),
    projectId: project && PROJECT_ID.test(project) ? project : null,
  };
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
