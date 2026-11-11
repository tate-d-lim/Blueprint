import type { Profile } from '../domain/types';
import type { Verification } from '../plan/verification';
import type { PlanMeta } from './plan-meta';

export interface AboutInfo {
  generatedAt: string;
  projectName?: string;
  appType: string;
  profile: { title: string; version: string };
  tools: { name: string; version: number; verification: Verification }[];
}

export function buildAboutInfo(meta: PlanMeta, profile: Profile, projectName?: string): AboutInfo {
  const about: AboutInfo = {
    generatedAt: meta.generatedAt,
    appType: meta.appType,
    profile: { title: profile.title, version: profile.version },
    tools: meta.tools,
  };
  if (projectName) about.projectName = projectName;
  return about;
}
