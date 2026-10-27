import { withDb } from '../data/db';
import { loadPlanData } from '../data/repos/plan-data';
import { buildPlan, type Plan, type PlanData } from '../plan/engine';
import { selectPlanInput } from '../plan/select';
import { parsePlanQuery } from '../plan/url-state';
import { assessRisk, type RiskAnswers } from '../risk/assess';
import { toolsForMeta, type BuildPlanMeta } from './build-plan-md';

export class BadPlanRequestError extends Error {}

export interface PlanRequest {
  plan: Plan;
  data: PlanData;
  answers: RiskAnswers;
  toolIds: string[];
  meta: BuildPlanMeta;
}

/** Turns a download link's query string into the plan it describes. Shared by every export route. */
export async function resolvePlanRequest(sp: URLSearchParams): Promise<PlanRequest> {
  const data = await withDb(loadPlanData);
  const parsed = parsePlanQuery(Object.fromEntries(sp), data.tools.map(t => t._id));
  if (!parsed) throw new BadPlanRequestError('The plan link is missing or has invalid answers.');
  const risk = assessRisk(parsed.answers);
  if (!risk.profileId) throw new BadPlanRequestError('This type of app is not supported yet.');

  const input = selectPlanInput(data, { profileId: risk.profileId, toolIds: parsed.toolIds });
  const profile = data.profiles.find(p => p._id === risk.profileId)!;
  return {
    plan: buildPlan(input),
    data,
    answers: parsed.answers,
    toolIds: parsed.toolIds,
    meta: {
      title: 'Your app',
      appType: risk.appType,
      profileTitle: profile.title,
      tools: toolsForMeta(input, risk.profileId),
      generatedAt: new Date().toISOString(),
    },
  };
}

/** Maps request errors to plain-text responses; rethrows anything unexpected. */
export function errorResponse(err: unknown): Response {
  if (err instanceof BadPlanRequestError) return new Response(err.message, { status: 400 });
  if (err instanceof Error && err.name === 'DatabaseUnavailableError') return new Response(err.message, { status: 503 });
  throw err;
}
