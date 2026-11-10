import { withDb } from '../data/db';
import { loadPlanData } from '../data/repos/plan-data';
import { getProject } from '../data/repos/projects';
import type { FactAnswers, Project } from '../domain/types';
import { buildPlan, type Plan, type PlanData } from '../plan/engine';
import { selectPlanInput } from '../plan/select';
import { parsePlanQuery } from '../plan/url-state';
import { assessRisk, profileFor, type RiskAnswers } from '../risk/assess';
import { toolsForMeta, type BuildPlanMeta } from './build-plan-md';

export class BadPlanRequestError extends Error {}

export interface PlanRequest {
  plan: Plan;
  data: PlanData;
  answers: RiskAnswers;
  toolIds: string[];
  /** The base profile the plan is for (the one the answers lead to). */
  profileId: string;
  project?: Project;
  meta: BuildPlanMeta;
}

/** Turns a download link's query string into the plan it describes. Shared by every export route. */
export async function resolvePlanRequest(sp: URLSearchParams): Promise<PlanRequest> {
  const { data, project } = await withDb(async db => {
    const projectId = sp.get('project');
    const found = projectId ? await getProject(db, projectId) : null;
    if (projectId && !found) throw new BadPlanRequestError('That saved project no longer exists.');
    return { data: await loadPlanData(db), project: found ?? undefined };
  });

  let answers: RiskAnswers;
  let toolIds: string[];
  let facts: FactAnswers;
  if (project) {
    const known = new Set(data.tools.map(t => t._id));
    answers = project.riskAnswers;
    toolIds = project.toolIds.filter(id => known.has(id));
    facts = project.facts ?? {};
  } else {
    const parsed = parsePlanQuery(Object.fromEntries(sp), data.tools.map(t => t._id));
    if (!parsed) throw new BadPlanRequestError('The plan link is missing or has invalid answers.');
    ({ answers, toolIds, facts } = parsed);
  }
  const risk = assessRisk(answers);
  const profileId = profileFor(answers, data.profiles);
  if (!profileId) throw new BadPlanRequestError('This type of app is not supported yet.');

  const input = selectPlanInput(data, { profileId, toolIds, facts }, project);
  const profile = data.profiles.find(p => p._id === profileId)!;
  return {
    plan: buildPlan(input),
    data,
    answers,
    toolIds,
    profileId,
    project,
    meta: {
      title: project?.name ?? 'Your app',
      appType: risk.appType,
      profileTitle: profile.title,
      tools: toolsForMeta(input, profileId),
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
