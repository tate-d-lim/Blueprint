import { z } from 'zod';
import type { Classification, Downstream, Impact, RiskAnswers, Sensitivity } from '../risk/assess';

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
export function planQuery(answers: RiskAnswers, toolIds: string[]): string {
  const ticks = [answers.cii ? 'cii' : '', answers.sii ? 'sii' : ''].filter(Boolean).join(',');
  return [
    `c=${codeFor(CLASSIFICATION, answers.classification)}`,
    `s=${codeFor(SENSITIVITY, answers.sensitivity)}`,
    `i=${codeFor(IMPACT, answers.impact)}`,
    `d=${codeFor(DOWNSTREAM, answers.downstream)}`,
    `k=${ticks}`,
    `t=${toolIds.map(encodeURIComponent).join(',')}`,
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
});

type SearchParams = Record<string, string | string[] | undefined>;

/** Reads a plan link. Returns null when the answers are missing or invalid; unknown or repeated tool IDs are dropped. */
export function parsePlanQuery(
  sp: SearchParams,
  knownToolIds: string[],
): { answers: RiskAnswers; toolIds: string[] } | null {
  const first = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = schema.safeParse(first);
  if (!parsed.success) return null;
  const { c, s, i, d, k, t } = parsed.data;
  const known = new Set(knownToolIds);
  const toolIds = [...new Set(t.map(decodeURIComponentSafe))].filter(id => known.has(id));
  return {
    answers: { classification: c, sensitivity: s, impact: i, downstream: d, cii: k.includes('cii'), sii: k.includes('sii') },
    toolIds,
  };
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
