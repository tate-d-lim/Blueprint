import type { Fact, Rule } from '@/lib/domain/types';
import { factIdsIn } from '@/lib/plan/facts';
import { loadSeed } from '../helpers/seed';

const BANNED = /\b(IM8|SSP|OSCAL|controls?|agency|agencies)\b/i;

async function lowRiskCloud() {
  return (await loadSeed()).profiles.find(p => p._id === 'low-risk-cloud')!;
}

const valuesOf = (fact: Fact) => (fact.kind === 'tick' ? ['yes', 'no'] : fact.options.map(o => o.value));
const leaves = (rule: Rule): { fact: string; is: string | string[] }[] =>
  'fact' in rule ? [rule] : ('all' in rule ? rule.all : rule.any).flatMap(leaves);

test('the low-risk cloud profile has facts with unique ids', async () => {
  const facts = (await lowRiskCloud()).facts ?? [];
  expect(facts.length).toBeGreaterThan(0);
  expect(new Set(facts.map(f => f.id)).size).toBe(facts.length);
});

test('every rule and every showIf names a fact that exists, and an answer that fact can have', async () => {
  const profile = await lowRiskCloud();
  const facts = new Map((profile.facts ?? []).map(f => [f.id, f]));
  const rules: [string, Rule][] = [
    ...profile.entries.flatMap(e => (e.plain?.appliesWhen ? [[e.id, e.plain.appliesWhen] as [string, Rule]] : [])),
    ...(profile.facts ?? []).flatMap(f => (f.showIf ? [[`fact ${f.id}`, f.showIf] as [string, Rule]] : [])),
  ];
  expect(rules.length).toBeGreaterThan(0);
  for (const [where, rule] of rules) {
    for (const leaf of leaves(rule)) {
      const fact = facts.get(leaf.fact);
      expect(fact, `${where} uses unknown fact ${leaf.fact}`).toBeDefined();
      for (const value of [leaf.is].flat()) expect(valuesOf(fact!), `${where} -> ${leaf.fact}`).toContain(value);
    }
  }
});

test('every fact is used by some rule, so none is asked for nothing', async () => {
  const profile = await lowRiskCloud();
  const used = new Set(profile.entries.flatMap(e => factIdsIn(e.plain?.appliesWhen)));
  for (const fact of profile.facts ?? []) {
    const gates = (profile.facts ?? []).some(f => factIdsIn(f.showIf).includes(fact.id));
    expect(used.has(fact.id) || gates || fact.always, `${fact.id} is never used`).toBe(true);
  }
});

test('every answer that can rule a requirement out has a reason', async () => {
  for (const fact of (await lowRiskCloud()).facts ?? []) {
    if (fact.kind === 'tick') expect(fact.noReason.trim(), fact.id).toBeTruthy();
    // An always fact adds requirements instead of ruling them out, so only its "no" says why.
    else for (const o of fact.options.filter(o => !fact.always || o.value === 'no')) expect(o.reason?.trim(), `${fact.id}.${o.value}`).toBeTruthy();
  }
});

test('the facts use builder language only', async () => {
  for (const fact of (await lowRiskCloud()).facts ?? []) {
    const texts = [fact.hint ?? '', ...(fact.kind === 'tick' ? [fact.label, fact.noReason] : [fact.question, ...fact.options.flatMap(o => [o.label, o.reason ?? ''])])];
    for (const text of texts) expect(text, fact.id).not.toMatch(BANNED);
  }
});

test('rules only sit on requirements that are in the plan, never on good-to-have extras', async () => {
  const profile = await lowRiskCloud();
  for (const e of profile.entries) if (e.plain?.appliesWhen) expect(e.level, e.id).toBeLessThan(2);
});
