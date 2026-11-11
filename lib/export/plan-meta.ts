import type { PlanInput } from '../plan/engine';
import { versionVerification, type Verification } from '../plan/verification';

/** What the exports say about the plan: its title, app type, tools and when it was made. */
export interface PlanMeta {
  title: string;
  appType: string;
  profileTitle: string;
  tools: { name: string; version: number; verification: Verification }[];
  generatedAt: string;
}

/** The picked tools for the export header. A tool with no coverage for the profile has version 0. */
export function toolsForMeta(input: PlanInput, profileId: string): PlanMeta['tools'] {
  return input.pickedTools.map(tool => {
    const pair = input.versions.find(v => v.current.toolId === tool._id && v.current.profileId === profileId);
    return {
      name: tool.name,
      version: pair?.current.version ?? 0,
      verification: pair ? versionVerification(pair) : 'not-yet-verified',
    };
  });
}

