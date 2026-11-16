import type { Profile, ToolVersion } from '../domain/types';
import { factsToAsk, type FactProfile } from './facts';
import type { PlanData, PlanInput, PlanState, ProjectOverlay } from './engine';
import type { VersionPair } from './verification';

export const GENAI_FACT = 'uses-genai';
export const GENAI_PROFILE_ID = 'generative-ai';

/**
 * What step 3 reads to decide which questions to ask: the profile's facts, and the rules of its requirements and of the
 * GenAI requirements (those questions show once the person says generative AI is part of the app).
 */
export function factScreen(profiles: Profile[], profileId: string): FactProfile | undefined {
  const main = profiles.find(p => p._id === profileId);
  if (!main) return undefined;
  const genai = profiles.find(p => p._id === GENAI_PROFILE_ID);
  return { facts: main.facts, entries: [...main.entries, ...(genai?.entries ?? [])] };
}

/** The questions of step 3 that the answers so far leave open, for a saved project that was answered before they existed. */
export const unansweredFacts = (profiles: Profile[], profileId: string, answers: Record<string, string>) => {
  const screen = factScreen(profiles, profileId);
  return screen ? factsToAsk(screen, answers).filter(f => answers[f.id] === undefined) : [];
};

const groupKey = (v: ToolVersion) => `${v.toolId}|${v.profileId}`;

function groupVersions(toolVersions: ToolVersion[]): ToolVersion[][] {
  const groups = new Map<string, ToolVersion[]>();
  for (const v of toolVersions) groups.set(groupKey(v), [...(groups.get(groupKey(v)) ?? []), v]);
  return [...groups.values()].map(versions => [...versions].sort((a, b) => b.version - a.version));
}

/**
 * One pair per (tool, profile) for builders: the newest version that was not sent back, and the newest approved
 * one. A version that an admin sent back is never seen here. A group whose versions were all sent back has no pair.
 */
export function pairVersions(toolVersions: ToolVersion[]): VersionPair[] {
  return groupVersions(toolVersions).flatMap(byNewest => {
    const current = byNewest.find(v => !v.sentBack);
    if (!current) return [];
    const lastApproved = byNewest.find(v => v.approval);
    return [lastApproved ? { current, lastApproved } : { current }];
  });
}

/** The newest version of each (tool, profile) in any state, sent back or not. The tool owner edits from it. */
export function newestVersions(toolVersions: ToolVersion[]): ToolVersion[] {
  return groupVersions(toolVersions).map(byNewest => byNewest[0]);
}

/** Turns stored data plus the builder's picks into what buildPlan needs. */
export function selectPlanInput(data: PlanData, state: PlanState, project?: ProjectOverlay): PlanInput {
  const known = new Set(data.tools.map(t => t._id));
  const wanted = new Set(state.toolIds.filter(id => known.has(id)));
  const pickedTools = data.tools.filter(t => wanted.has(t._id));

  // Generative AI is added by what the builder says about the app, never by a tool.
  const profileIds = new Set([state.profileId]);
  if (state.facts?.[GENAI_FACT] === 'yes') profileIds.add(GENAI_PROFILE_ID);
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
