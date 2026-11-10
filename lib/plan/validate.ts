import { z } from 'zod';
import type { FactAnswers } from '../domain/types';
import type { RiskAnswers } from '../risk/assess';

const riskSchema = z.object({
  classification: z.enum(['official-open', 'official-closed', 'restricted', 'confidential-cloud-eligible', 'confidential', 's-class']),
  sensitivity: z.enum(['non-sensitive', 'sensitive-normal', 'sensitive-high']),
  impact: z.enum(['none', 'slight', 'moderate', 'significant', 'critical']),
  downstream: z.enum(['minimal', 'significant']),
  cii: z.boolean(),
  sii: z.boolean(),
});
const factsSchema = z.record(z.string().regex(/^[a-z0-9-]{1,40}$/), z.string().regex(/^[a-z0-9-]{1,40}$/));

export const MAX_NAME = 120;

/** What a server action accepts from the browser: the shapes the app itself writes, nothing else. */
export function parseSaveInput(input: { riskAnswers: unknown; facts?: unknown; name?: unknown }): { riskAnswers: RiskAnswers; facts: FactAnswers; name?: string } {
  const riskAnswers = riskSchema.parse(input.riskAnswers);
  const facts = factsSchema.parse(input.facts ?? {});
  const name = input.name === undefined ? undefined : z.string().max(MAX_NAME).parse(input.name);
  return { riskAnswers, facts, ...(name === undefined ? {} : { name }) };
}

export const parseToolIds = (ids: unknown): string[] => z.array(z.string().regex(/^[a-z0-9-]{1,60}$/)).max(50).parse(ids);
