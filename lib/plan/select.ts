import type { ToolVersion } from '../domain/types';
import type { PlanData, PlanInput, PlanState, ProjectOverlay } from './engine';
import type { VersionPair } from './verification';

/** One pair per (tool, profile): the highest version, and the highest approved one. */
export function pairVersions(toolVersions: ToolVersion[]): VersionPair[] {
  const groups = new Map<string, ToolVersion[]>();
  for (const v of toolVersions) {
    const k = `${v.toolId}|${v.profileId}`;
    groups.set(k, [...(groups.get(k) ?? []), v]);
  }
  return [...groups.values()].map(versions => {
    const byNewest = [...versions].sort((a, b) => b.version - a.version);
    const current = byNewest[0];
    const lastApproved = byNewest.find(v => v.approval);
    return lastApproved ? { current, lastApproved } : { current };
  });
}

/** Turns stored data plus the builder's picks into what buildPlan needs. */
export function selectPlanInput(data: PlanData, state: PlanState, project?: ProjectOverlay): PlanInput {
  const known = new Set(data.tools.map(t => t._id));
  const wanted = new Set(state.toolIds.filter(id => known.has(id)));
  const pickedTools = data.tools.filter(t => wanted.has(t._id));

  const profileIds = new Set([state.profileId]);
  for (const tool of pickedTools) for (const id of tool.activatesProfiles ?? []) profileIds.add(id);
  if (!data.profiles.some(p => p._id === state.profileId)) throw new Error(`Unknown profile ${state.profileId}`);
  const profiles = data.profiles.filter(p => profileIds.has(p._id));
  const active = new Set(profiles.map(p => p._id));

  return {
    profiles,
    pickedTools,
    allTools: data.tools,
    versions: data.versions.filter(v => wanted.has(v.current.toolId) && active.has(v.current.profileId)),
    project,
    factAnswers: state.facts,
  };
}
