import type { Fact, FactAnswers, FactOption, Rule } from '../domain/types';

/** What the fact screen needs of a profile: its facts, and the rules that read them. */
export interface FactProfile {
  facts?: Fact[];
  entries: { plain?: { appliesWhen?: Rule } }[];
}

/** `confirmed` means a rule exists and the answers satisfy it, not just that nothing rules the requirement out. */
export type RuleOutcome = { state: 'applies'; confirmed: boolean } | { state: 'skipped'; reason: string };

type Check = { holds: true } | { holds: false; reason: string } | { unknown: true };

const FALLBACK_REASON = 'Your answers show this cannot apply to your app.';

const optionsOf = (fact: Fact): FactOption[] =>
  fact.kind === 'choice'
    ? fact.options
    : [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No', reason: fact.noReason },
      ];

const valuesOf = (is: string | string[]) => (Array.isArray(is) ? is : [is]);

/** The fact ids a rule mentions, at any depth. */
export function factIdsIn(rule: Rule | undefined): string[] {
  if (!rule) return [];
  if ('fact' in rule) return [rule.fact];
  return ('all' in rule ? rule.all : rule.any).flatMap(factIdsIn);
}

/** True when the rule reads the fact. */
export const ruleDecides = (rule: Rule | undefined, factId: string): boolean => factIdsIn(rule).includes(factId);

function check(rule: Rule, facts: Fact[], answers: FactAnswers): Check {
  if ('fact' in rule) {
    const fact = facts.find(f => f.id === rule.fact);
    if (!fact) return { unknown: true };
    let answer = answers[fact.id];
    if (answer === undefined && fact.showIf) {
      // A question nobody was asked counts as "no" for a tick, and stays unknown otherwise.
      const gate = check(fact.showIf, facts, answers);
      if ('holds' in gate && !gate.holds && fact.kind === 'tick') answer = 'no';
    }
    if (answer === undefined) return { unknown: true };
    if (valuesOf(rule.is).includes(answer)) return { holds: true };
    return { holds: false, reason: optionsOf(fact).find(o => o.value === answer)?.reason ?? FALLBACK_REASON };
  }
  const parts = ('all' in rule ? rule.all : rule.any).map(r => check(r, facts, answers));
  const failed = parts.filter((p): p is { holds: false; reason: string } => 'holds' in p && !p.holds);
  if ('all' in rule) {
    if (failed.length) return failed[0];
    return parts.some(p => 'unknown' in p) ? { unknown: true } : { holds: true };
  }
  if (parts.some(p => 'holds' in p && p.holds)) return { holds: true };
  if (parts.some(p => 'unknown' in p)) return { unknown: true };
  return failed[0] ?? { holds: true };
}

/** Does a requirement with this rule apply to an app with these answers? Anything we cannot tell keeps it. */
export function checkRule(rule: Rule | undefined, facts: Fact[], answers: FactAnswers): RuleOutcome {
  if (!rule) return { state: 'applies', confirmed: false };
  const result = check(rule, facts, answers);
  if ('holds' in result && !result.holds) return { state: 'skipped', reason: result.reason };
  return { state: 'applies', confirmed: 'holds' in result };
}

/**
 * The facts to put on the screen: those some rule reads or that are marked always (plus the facts they depend on), in the order of the
 * facts file, minus those the answers so far do not make relevant. Adding a rule to the catalogue adds its fact here.
 */
export function factsToAsk(profile: FactProfile, answers: FactAnswers): Fact[] {
  const facts = profile.facts ?? [];
  const used = new Set([...profile.entries.flatMap(e => factIdsIn(e.plain?.appliesWhen)), ...facts.filter(f => f.always).map(f => f.id)]);
  // A fact that only gates another fact is needed too, however deep the chain.
  for (let grew = true; grew; ) {
    grew = false;
    for (const fact of facts) {
      if (!used.has(fact.id)) continue;
      for (const id of factIdsIn(fact.showIf)) {
        if (used.has(id)) continue;
        used.add(id);
        grew = true;
      }
    }
  }
  return facts.filter(f => {
    if (!used.has(f.id)) return false;
    if (!f.showIf) return true;
    const gate = check(f.showIf, facts, answers);
    return 'holds' in gate && gate.holds;
  });
}

/** `id.value` pairs joined by commas, for a link. Ids and values never contain "." or ",". */
export const writeFactAnswers = (answers: FactAnswers): string =>
  Object.entries(answers)
    .map(([id, value]) => `${id}.${value}`)
    .join(',');

export function parseFactAnswers(text: string): FactAnswers {
  const out: FactAnswers = {};
  for (const part of text.split(',')) {
    const pieces = part.split('.');
    if (pieces.length === 2 && pieces[0] && pieces[1]) out[pieces[0]] = pieces[1];
  }
  return out;
}
