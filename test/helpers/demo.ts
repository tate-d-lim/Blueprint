import type { FactAnswers } from '@/lib/domain/types';
import { buildPlan, type Plan, type PlanData, type ProjectOverlay } from '@/lib/plan/engine';
import { pairVersions, selectPlanInput } from '@/lib/plan/select';
import type { RiskAnswers } from '@/lib/risk/assess';
import { loadSeed } from './seed';

/** The demo app: Restricted, Sensitive Normal, Slight impact, minimal downstream, no CII, no SII. */
export const DEMO_ANSWERS: RiskAnswers = {
  classification: 'restricted',
  sensitivity: 'sensitive-normal',
  impact: 'slight',
  downstream: 'minimal',
  cii: false,
  sii: false,
};

/** What the demo builder says about the app. */
export const DEMO_FACTS: FactAnswers = { reach: 'public', web: 'yes', signin: 'yes', sms: 'yes', domain: 'no', shortlinks: 'no' };

/** The real seed as plan data. */
export async function demoData(): Promise<PlanData> {
  const seed = await loadSeed();
  return { profiles: seed.profiles, tools: seed.tools, versions: pairVersions(seed.toolVersions) };
}

/** The demo plan on Low-Risk Cloud for these ticked tools and facts. */
export async function demoPlan(toolIds: string[], facts: FactAnswers = DEMO_FACTS, project?: ProjectOverlay): Promise<Plan> {
  return buildPlan(selectPlanInput(await demoData(), { profileId: 'low-risk-cloud', toolIds, facts }, project));
}
